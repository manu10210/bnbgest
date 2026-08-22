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
    const fmt = (b: typeof current) => b && { bookingId: b.id, guestName: b.guestName, checkIn: b.checkIn.toISOString(), checkOut: b.checkOut.toISOString(), guests: b.guests };
    result.push({ propertyId: p.id, name: p.name, current: fmt(current), next: fmt(next) });
  }

  return NextResponse.json({ generatedAt: now.toISOString(), properties: result });
}
