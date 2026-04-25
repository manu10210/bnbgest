export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  return { session };
}

// PATCH /api/access-codes/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  try {
    const body = await req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    const fields = ['label','code','type','validFrom','validUntil','isActive','sentByEmail','sentAt','notes'];
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (f === 'validFrom' || f === 'validUntil' || f === 'sentAt') data[f] = body[f] ? new Date(body[f]) : null;
        else data[f] = body[f];
      }
    }
    const updated = await prisma.accessCode.update({
      where: { id: parseInt(id) },
      data,
      include: { property: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/access-codes/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;
  try {
    await prisma.accessCode.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
