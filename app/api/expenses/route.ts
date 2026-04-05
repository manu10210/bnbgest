import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { session };
}

// GET /api/expenses
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get('propertyId');
  const category   = searchParams.get('category');
  const startDate  = searchParams.get('startDate');
  const endDate    = searchParams.get('endDate');
  const limit      = parseInt(searchParams.get('limit') || '200');
  const year       = searchParams.get('year');
  const month      = searchParams.get('month');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (propertyId) where.propertyId = parseInt(propertyId);
    if (category)   where.category   = category;

    // Date filters
    if (year || month || startDate || endDate) {
      where.date = {};
      if (year && month) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        where.date.gte = new Date(y, m, 1);
        where.date.lt  = new Date(y, m + 1, 1);
      } else if (year) {
        where.date.gte = new Date(parseInt(year), 0, 1);
        where.date.lt  = new Date(parseInt(year) + 1, 0, 1);
      } else {
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate)   where.date.lte = new Date(endDate);
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: { property: { select: { id: true, name: true } } },
    });

    // Aggregate totals by category
    const allForPeriod = await prisma.expense.findMany({
      where,
      select: { amount: true, category: true },
    });

    const totalAmount = allForPeriod.reduce((s: number, e: { amount: number; category: string }) => s + e.amount, 0);
    const byCategory = allForPeriod.reduce<Record<string, number>>((acc: Record<string, number>, e: { amount: number; category: string }) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    return NextResponse.json({ expenses, totalAmount, byCategory });
  } catch (err) {
    console.error('GET /api/expenses error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { title, description, amount, currency, category, date, propertyId,
            vendor, receiptUrl, paymentMethod, isRecurring, recurrence, notes } = body;

    if (!title || !amount || !category || !date) {
      return NextResponse.json({ error: 'Champs obligatoires manquants (title, amount, category, date)' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        description,
        amount:        parseFloat(amount),
        currency:      currency || 'EUR',
        category,
        date:          new Date(date),
        propertyId:    propertyId ? parseInt(propertyId) : null,
        vendor,
        receiptUrl,
        paymentMethod,
        isRecurring:   isRecurring || false,
        recurrence,
        notes,
        createdBy:     session!.user!.email,
      },
      include: { property: { select: { id: true, name: true } } },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error('POST /api/expenses error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
