import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { prisma } from '../../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { session };
}

// PATCH /api/expenses/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const expenseId = parseInt(id);
  if (isNaN(expenseId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  try {
    const body = await req.json();
    const { title, description, amount, currency, category, date, propertyId,
            vendor, receiptUrl, paymentMethod, isRecurring, recurrence, notes } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (title !== undefined)         data.title         = title;
    if (description !== undefined)   data.description   = description;
    if (amount !== undefined)        data.amount        = parseFloat(amount);
    if (currency !== undefined)      data.currency      = currency;
    if (category !== undefined)      data.category      = category;
    if (date !== undefined)          data.date          = new Date(date);
    if (propertyId !== undefined)    data.propertyId    = propertyId ? parseInt(propertyId) : null;
    if (vendor !== undefined)        data.vendor        = vendor;
    if (receiptUrl !== undefined)    data.receiptUrl    = receiptUrl;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (isRecurring !== undefined)   data.isRecurring   = isRecurring;
    if (recurrence !== undefined)    data.recurrence    = recurrence;
    if (notes !== undefined)         data.notes         = notes;

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data,
      include: { property: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH /api/expenses/[id] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const expenseId = parseInt(id);
  if (isNaN(expenseId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  try {
    await prisma.expense.delete({ where: { id: expenseId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/expenses/[id] error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
