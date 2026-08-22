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
  // Ménage détecté : porte ouverte dans les 48 h après un départ (fenêtre ménage ControlBnB).
  // On clôt le ménage planifié le plus proche (±2 jours) ; sinon on en enregistre un, terminé.
  if (body?.event === 'cleaning.detected' && Number.isInteger(body?.data?.propertyId)) {
    const at = new Date(body.data.at || body.timestamp || Date.now());
    if (Number.isNaN(at.getTime())) return NextResponse.json({ error: 'date invalide' }, { status: 400 });
    const fenetre = 2 * 24 * 3600 * 1000;
    const planifie = await prisma.cleaning.findFirst({
      where: { propertyId: body.data.propertyId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, scheduledDate: { gte: new Date(at.getTime() - fenetre), lte: new Date(at.getTime() + fenetre) } },
      orderBy: { scheduledDate: 'asc' },
    });
    const mention = `Confirmé par ControlBnB : porte ouverte le ${at.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`;
    if (planifie) {
      await prisma.cleaning.update({ where: { id: planifie.id }, data: { status: 'COMPLETED', completedDate: at, notes: [planifie.notes, mention].filter(Boolean).join('\n') } });
      return NextResponse.json({ ok: true, cleaningId: planifie.id, matched: true });
    }
    const deja = await prisma.cleaning.findFirst({ where: { propertyId: body.data.propertyId, status: 'COMPLETED', completedDate: { gte: new Date(at.getTime() - 12 * 3600 * 1000) } } });
    if (deja) return NextResponse.json({ ok: true, cleaningId: deja.id, matched: true, duplicate: true });
    const cree = await prisma.cleaning.create({ data: { propertyId: body.data.propertyId, scheduledDate: at, completedDate: at, status: 'COMPLETED', assignedTo: 'détecté', notes: mention } });
    return NextResponse.json({ ok: true, cleaningId: cree.id, matched: false });
  }
  console.log('[iot] événement non traité', body?.event);
  return NextResponse.json({ ok: true, ignored: true });
}
