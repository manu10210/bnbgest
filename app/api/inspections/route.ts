export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  return { session };
}

// GET /api/inspections?propertyId=&type=&status=&bookingId=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (searchParams.get('propertyId')) where.propertyId = parseInt(searchParams.get('propertyId')!);
  if (searchParams.get('bookingId'))  where.bookingId  = parseInt(searchParams.get('bookingId')!);
  if (searchParams.get('type'))       where.type       = searchParams.get('type');
  if (searchParams.get('status'))     where.status     = searchParams.get('status');

  try {
    const inspections = await prisma.propertyInspection.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(searchParams.get('limit') || '100'),
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ inspections });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/inspections
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { propertyId, bookingId, type, date, inspector, guestName, guestEmail, notes, rooms } = body;
    if (!propertyId || !type || !date) {
      return NextResponse.json({ error: 'propertyId, type et date sont obligatoires' }, { status: 400 });
    }
    const inspection = await prisma.propertyInspection.create({
      data: {
        propertyId: parseInt(propertyId),
        bookingId:  bookingId ? parseInt(bookingId) : null,
        type,
        date:       new Date(date),
        inspector,
        guestName,
        guestEmail,
        notes,
        rooms:      rooms || [],
        status:     'DRAFT',
      },
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json(inspection, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
