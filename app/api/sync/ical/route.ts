import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ParsedIcalEvent = {
  uid: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
};

function parseIcalDate(rawValue: string): Date | null {
  const value = rawValue.trim();

  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(9, 11));
    const minute = Number(value.slice(11, 13));
    const second = Number(value.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(9, 11));
    const minute = Number(value.slice(11, 13));
    const second = Number(value.slice(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseIcalEvents(icsRaw: string): ParsedIcalEvent[] {
  const unfolded = icsRaw
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '');

  const lines = unfolded.split('\n');
  const events: ParsedIcalEvent[] = [];

  let inEvent = false;
  let uid = '';
  let summary = '';
  let description = '';
  let start: Date | null = null;
  let end: Date | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      uid = '';
      summary = '';
      description = '';
      start = null;
      end = null;
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && start && end) {
        events.push({
          uid: uid || `uid-${start.getTime()}-${end.getTime()}`,
          summary: summary || 'Réservation externe',
          description,
          start,
          end,
        });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    const separatorIdx = line.indexOf(':');
    if (separatorIdx === -1) continue;

    const keyPart = line.slice(0, separatorIdx).toUpperCase();
    const value = line.slice(separatorIdx + 1).trim();
    const key = keyPart.split(';')[0];

    if (key === 'UID') uid = value;
    if (key === 'SUMMARY') summary = value;
    if (key === 'DESCRIPTION') description = value.replace(/\\n/g, '\n');
    if (key === 'DTSTART') start = parseIcalDate(value);
    if (key === 'DTEND') end = parseIcalDate(value);
  }

  return events;
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { propertyId, icalUrl } = await request.json();

    if (!propertyId || !icalUrl) {
      return NextResponse.json({ success: false, error: 'propertyId et icalUrl sont requis' }, { status: 400 });
    }

    // Vérification de la propriété
    const property = await prisma.property.findUnique({
      where: { id: parseInt(propertyId, 10) }
    });

    if (!property) {
      return NextResponse.json({ success: false, error: 'Propriété non trouvée' }, { status: 404 });
    }

    // Sauvegarde de l'URL iCal pour la propriété
    const updatedProperty = await prisma.property.update({
      where: { id: parseInt(propertyId, 10) },
      data: {
        icalUrl: icalUrl
      }
    });

    let syncedBookings = 0;
    if (icalUrl) {
      try {
        const icsResponse = await fetch(icalUrl);
        if (!icsResponse.ok) {
          throw new Error(`Unable to download iCal feed (status ${icsResponse.status})`);
        }

        const icsText = await icsResponse.text();
        const events = parseIcalEvents(icsText);
        const newBookings = [];

        for (const event of events) {
          const checkIn = new Date(event.start);
          const checkOut = new Date(event.end);
          const uid = event.uid || Math.random().toString();
          const summary = event.summary || 'Réservation externe';

          const matchCode = event.description.match(/([A-Z0-9]{8,})/);
          const confirmationCode = matchCode ? matchCode[1] : uid.slice(0, 10);

          const existingParam = await prisma.booking.findFirst({
            where: {
              propertyId: parseInt(propertyId, 10),
              OR: [
                { confirmationCode },
                { specialRequests: { contains: uid } }
              ]
            }
          });

          if (!existingParam) {
            newBookings.push({
              propertyId: parseInt(propertyId, 10),
              userId: '',
              guestName: summary,
              guestEmail: '',
              guestPhone: '',
              checkIn,
              checkOut,
              guests: 1,
              totalPrice: 0,
              status: 'CONFIRMED' as const,
              paymentStatus: 'PENDING' as const,
              confirmationCode,
              specialRequests: `Source: iCal (UID: ${uid})`
            });
          }
        }

        if (newBookings.length > 0) {
          const sessionUser = authResult.user as {
            id?: string | null;
            email?: string | null;
            name?: string | null;
          };
          const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
          
          let owner = sessionUser.id ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } }) : null;
          if (!owner && normalizedEmail) {
             owner = await prisma.user.upsert({
               where: { email: normalizedEmail },
               update: {},
               create: { email: normalizedEmail, name: sessionUser.name || normalizedEmail.split('@')[0], role: 'USER' }
             });
          }
          if (owner) {
             const mappedBookings = newBookings.map(b => ({...b, userId: owner.id}));
             await prisma.booking.createMany({
               data: mappedBookings
             });
             syncedBookings = mappedBookings.length;
          }
        }
      } catch (err) {
        console.error('Error fetching/parsing iCal url:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `iCal URL configurée. ${syncedBookings} nouvelle(s) réservation(s) synchronisée(s).`,
      property: updatedProperty,
      syncedBookings
    });
  } catch (error) {
    console.error('iCal sync config error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
