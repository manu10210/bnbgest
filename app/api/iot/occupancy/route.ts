export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// GET /api/iot/occupancy
// Lu par ControlBnB (serveur domotique des appartements) toutes les N minutes.
// Auth machine-à-machine : Authorization: Bearer ${IOT_API_KEY}
// Réponse : pour chaque propriété, le séjour en cours et la prochaine arrivée.
function autorise(request: Request): boolean {
  const key = process.env.IOT_API_KEY?.trim();
  if (!key) return false; // pas de clé configurée = route fermée
  return request.headers.get('authorization') === `Bearer ${key}`;
}

export async function GET(request: Request) {
  if (!autorise(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const actifs = ['CONFIRMED', 'CHECKED_IN'] as const;

  const properties = await prisma.property.findMany({
    where: { status: { not: 'INACTIVE' } },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  });

  const result = [];
  for (const p of properties) {
    const current = await prisma.booking.findFirst({
      where: { propertyId: p.id, status: { in: [...actifs] }, checkIn: { lte: now }, checkOut: { gt: now } },
      orderBy: { checkIn: 'desc' },
      select: { id: true, guestName: true, checkIn: true, checkOut: true, guests: true },
    });
    const next = await prisma.booking.findFirst({
      where: { propertyId: p.id, status: { in: [...actifs] }, checkIn: { gt: now } },
      orderBy: { checkIn: 'asc' },
      select: { id: true, guestName: true, checkIn: true, checkOut: true, guests: true },
    });
    // Dernier séjour terminé : ControlBnB en déduit la fenêtre « ménage »
    // (porte ouverte dans les 48 h après un départ = passage, pas intrusion).
    const previous = await prisma.booking.findFirst({
      where: { propertyId: p.id, status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] }, checkOut: { lte: now } },
      orderBy: { checkOut: 'desc' },
      select: { id: true, guestName: true, checkIn: true, checkOut: true, guests: true },
    });
    // Codes d'accès utiles maintenant : généraux (sans réservation) ou liés au
    // séjour en cours / prochain, actifs et dans leur fenêtre de validité.
    const codes = await prisma.accessCode.findMany({
      where: {
        propertyId: p.id, isActive: true,
        OR: [{ bookingId: null }, ...[current?.id, next?.id].filter((x): x is number => typeof x === 'number').map((id) => ({ bookingId: id }))],
        AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: new Date(now.getTime() + 7 * 86400000) } }] }, { OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
      },
      orderBy: [{ bookingId: 'asc' }, { type: 'asc' }],
      select: { id: true, label: true, code: true, type: true, bookingId: true, validFrom: true, validUntil: true },
    });
    const fmt = (b: typeof current) => b && { bookingId: b.id, guestName: b.guestName, checkIn: b.checkIn.toISOString(), checkOut: b.checkOut.toISOString(), guests: b.guests };
    result.push({
      propertyId: p.id, name: p.name, current: fmt(current), next: fmt(next), previous: fmt(previous),
      accessCodes: codes.map((c) => ({ id: c.id, label: c.label, code: c.code, type: c.type, bookingId: c.bookingId, validFrom: c.validFrom?.toISOString() ?? null, validUntil: c.validUntil?.toISOString() ?? null })),
    });
  }

  return NextResponse.json({ generatedAt: now.toISOString(), properties: result });
}
