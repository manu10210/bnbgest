import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { requireAuth } from '@/lib/auth-middleware';
import ical from 'node-ical';

export const dynamic = 'force-dynamic';

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
        const events = await ical.async.fromURL(icalUrl);
        const newBookings = [];

        for (const ev of Object.values(events)) {
          const event = ev as any;
          if (event.type === 'VEVENT') {
            const checkIn = new Date(event.start);
            const checkOut = new Date(event.end);
            const uid = event.uid || Math.random().toString();
            let summary = event.summary || 'Réservation externe';

            const desc = event.description || '';
            const matchCode = desc.match(/([A-Z0-9]{8,})/);
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
                paymentStatus: 'PENDING',
                confirmationCode,
                specialRequests: `Source: iCal (UID: ${uid})`
              });
            }
          }
        }

        if (newBookings.length > 0) {
          const sessionUser = authResult.user as any;
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
