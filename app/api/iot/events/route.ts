export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

// POST /api/iot/events
// Remontées de ControlBnB : { source:'controlbnb', event:'stay.water', data:{bookingId, propertyId, liters}, timestamp }
// Aujourd'hui : stocke l'eau consommée dans Booking.metadata.water_liters. Extensible.
export async function POST(request: Request) {
  const key = process.env.IOT_API_KEY?.trim();
  if (!key || request.headers.get('authorization') !== `Bearer ${key}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  if (body?.event === 'stay.water' && Number.isInteger(body?.data?.bookingId)) {
    const booking = await prisma.booking.findUnique({ where: { id: body.data.bookingId }, select: { metadata: true } });
    if (!booking) return NextResponse.json({ error: 'booking introuvable' }, { status: 404 });
    const metadata = { ...((booking.metadata as object) || {}), water_liters: Number(body.data.liters) || 0, water_updated_at: body.timestamp };
    await prisma.booking.update({ where: { id: body.data.bookingId }, data: { metadata } });
    return NextResponse.json({ ok: true });
  }
  if (body?.event === 'stay.arrived' && Number.isInteger(body?.data?.bookingId)) {
    const booking = await prisma.booking.findUnique({ where: { id: body.data.bookingId }, select: { metadata: true, status: true } });
    if (!booking) return NextResponse.json({ error: 'booking introuvable' }, { status: 404 });
    const metadata = { ...((booking.metadata as object) || {}), arrived_at: body.data.at || body.timestamp };
    await prisma.booking.update({
      where: { id: body.data.bookingId },
      data: { metadata, ...(booking.status === 'CONFIRMED' ? { status: 'CHECKED_IN' } : {}) },
    });
    return NextResponse.json({ ok: true });
  }
  console.log('[iot] événement non traité', body?.event);
  return NextResponse.json({ ok: true, ignored: true });
}
