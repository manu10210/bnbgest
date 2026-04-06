import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  return { session };
}

// GET /api/access-codes?propertyId=&bookingId=&isActive=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (searchParams.get('propertyId')) where.propertyId = parseInt(searchParams.get('propertyId')!);
  if (searchParams.get('bookingId'))  where.bookingId  = parseInt(searchParams.get('bookingId')!);
  if (searchParams.get('isActive') === 'true')  where.isActive = true;
  if (searchParams.get('isActive') === 'false') where.isActive = false;

  try {
    const codes = await prisma.accessCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(searchParams.get('limit') || '200'),
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ codes });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/access-codes
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { propertyId, bookingId, label, code, type, validFrom, validUntil, isActive, notes } = body;
    if (!propertyId || !label || !code) {
      return NextResponse.json({ error: 'propertyId, label et code sont obligatoires' }, { status: 400 });
    }
    const accessCode = await prisma.accessCode.create({
      data: {
        propertyId: parseInt(propertyId),
        bookingId:  bookingId ? parseInt(bookingId) : null,
        label,
        code,
        type:       type || 'DOOR_CODE',
        validFrom:  validFrom  ? new Date(validFrom)  : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive:   isActive !== false,
        notes,
      },
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json(accessCode, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
