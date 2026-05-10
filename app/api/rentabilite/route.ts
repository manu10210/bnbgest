export const dynamic = 'force-dynamic';

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

// GET /api/rentabilite?year=2025&propertyId=&months=12
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const year       = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
  const propertyId = searchParams.get('propertyId');
  const months     = parseInt(searchParams.get('months') || '12');
  const startMonth = parseInt(searchParams.get('startMonth') || '1');

  const safeMonths = Number.isFinite(months) ? Math.min(Math.max(months, 1), 12) : 12;
  const safeStartMonth = Number.isFinite(startMonth) ? Math.min(Math.max(startMonth, 1), 12) : 1;

  const startDate = new Date(year, safeStartMonth - 1, 1);
  const endDate   = new Date(year, safeStartMonth - 1 + safeMonths, 0, 23, 59, 59); // fin du dernier mois

  try {
    // ── Propriétés
    const propWhere = propertyId ? { id: parseInt(propertyId) } : {};
    const properties = await prisma.property.findMany({
      where: propWhere,
      select: {
        id: true, name: true, city: true, price: true,
        pricePerNight: true, cleaningFee: true, currency: true,
        status: true, capacity: true, bedrooms: true,
      },
    });

    if (properties.length === 0) {
      return NextResponse.json({
        year,
        months: safeMonths,
        startMonth: safeStartMonth,
        properties: [],
        monthly: [],
        summary: {
          totalRevenue: 0,
          totalExpenses: 0,
          totalProfit: 0,
          avgOccupancy: 0,
          avgRevPAR: 0,
          avgADR: 0,
          totalBookings: 0,
          roi: 0,
        },
      });
    }

    const propIds = properties.map(p => p.id);

    // ── Réservations de la période
    const bookings = await prisma.booking.findMany({
      where: {
        propertyId: { in: propIds },
        status: { not: 'CANCELLED' },
        checkIn: { gte: startDate, lte: endDate },
      },
      select: {
        id: true, propertyId: true, checkIn: true, checkOut: true,
        totalPrice: true, status: true, source: true, guests: true,
      },
    });

    type ExpenseRow = { id: number; propertyId: number | null; amount: number; category: string; date: Date };

    // ── Dépenses de la période
    const expenses: ExpenseRow[] = await prisma.expense.findMany({
      where: {
        propertyId: { in: propIds },
        date: { gte: startDate, lte: endDate },
      },
      select: {
        id: true, propertyId: true, amount: true, category: true, date: true,
      },
    });

    // ── Helper : nombre de nuits entre 2 dates
    const nights = (a: Date, b: Date) =>
      Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

    // ── Stats par propriété
    const byProperty = properties.map(prop => {
      const pBookings = bookings.filter(b => b.propertyId === prop.id);
      const pExpenses = expenses.filter(e => e.propertyId === prop.id);

  const totalNights   = safeMonths * 30; // approx jours disponibles
      const bookedNights  = pBookings.reduce((s, b) => s + nights(b.checkIn, b.checkOut), 0);
      const occupancyRate = totalNights > 0 ? (bookedNights / totalNights) * 100 : 0;

      const grossRevenue  = pBookings.reduce((s, b) => s + b.totalPrice, 0);
      const netRevenue    = grossRevenue; // cleaningFee is on property, not booking

      const totalExpenses = pExpenses.reduce((s, e) => s + e.amount, 0);
      const netProfit     = netRevenue - totalExpenses;
      const roi           = totalExpenses > 0 ? (netProfit / totalExpenses) * 100 : 0;

      // RevPAR = Revenu net / jours disponibles (nuits)
      const revPAR = totalNights > 0 ? netRevenue / totalNights : 0;
      // ADR = Revenu moyen par nuit réservée
      const adr    = bookedNights > 0 ? netRevenue / bookedNights : 0;

      const bySource = {
        DIRECT:      pBookings.filter(b => b.source === 'DIRECT').length,
        AIRBNB:      pBookings.filter(b => b.source === 'AIRBNB').length,
        BOOKING_COM: pBookings.filter(b => b.source === 'BOOKING_COM').length,
        OTHER:       pBookings.filter(b => b.source === 'OTHER').length,
      };

      const expByCategory = pExpenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {});

      return {
        property: prop,
        bookingsCount: pBookings.length,
        bookedNights,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        grossRevenue: Math.round(grossRevenue),
        netRevenue:    Math.round(netRevenue),
        totalExpenses: Math.round(totalExpenses),
        netProfit:     Math.round(netProfit),
        roi:           Math.round(roi * 10) / 10,
        revPAR:        Math.round(revPAR * 100) / 100,
        adr:           Math.round(adr * 100) / 100,
        bySource,
        expByCategory,
      };
    });

    // ── Stats mensuelles (pour graphiques)
    const monthly: Array<{
      month: string; label: string;
      revenue: number; expenses: number; profit: number;
      bookings: number; occupancy: number;
    }> = [];

    for (let m = 0; m < safeMonths; m++) {
      const monthOffset = safeStartMonth - 1 + m;
      const mStart = new Date(year, monthOffset, 1);
      const mEnd   = new Date(year, monthOffset + 1, 0, 23, 59, 59);
      const label  = mStart.toLocaleDateString('fr-FR', { month: 'short' });
      const daysInMonth = new Date(year, monthOffset + 1, 0).getDate();

      const mBookings = bookings.filter(b => {
        const ci = new Date(b.checkIn);
        return ci >= mStart && ci <= mEnd;
      });
      const mExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        return d >= mStart && d <= mEnd;
      });

      const mRevenue  = mBookings.reduce((s, b) => s + b.totalPrice, 0);
      const mExp      = mExpenses.reduce((s, e) => s + e.amount, 0);
      const mNights   = mBookings.reduce((s, b) => s + nights(b.checkIn, b.checkOut), 0);
      const mOccupancy = properties.length > 0 ? (mNights / (daysInMonth * properties.length)) * 100 : 0;

      monthly.push({
  month: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`,
        label,
        revenue:   Math.round(mRevenue),
        expenses:  Math.round(mExp),
        profit:    Math.round(mRevenue - mExp),
        bookings:  mBookings.length,
        occupancy: Math.round(mOccupancy * 10) / 10,
      });
    }

    // ── Résumé global
    const totalRevenue  = byProperty.reduce((s, p) => s + p.grossRevenue, 0);
    const totalExpenses = byProperty.reduce((s, p) => s + p.totalExpenses, 0);
    const totalProfit   = byProperty.reduce((s, p) => s + p.netProfit, 0);
    const avgOccupancy  = byProperty.length > 0
      ? byProperty.reduce((s, p) => s + p.occupancyRate, 0) / byProperty.length : 0;
    const avgRevPAR = byProperty.length > 0
      ? byProperty.reduce((s, p) => s + p.revPAR, 0) / byProperty.length : 0;
    const avgADR    = byProperty.length > 0
      ? byProperty.reduce((s, p) => s + p.adr, 0) / byProperty.length : 0;

    return NextResponse.json({
  year,
  months: safeMonths,
  startMonth: safeStartMonth,
      properties:  byProperty,
      monthly,
      summary: {
        totalRevenue:   Math.round(totalRevenue),
        totalExpenses:  Math.round(totalExpenses),
        totalProfit:    Math.round(totalProfit),
        avgOccupancy:   Math.round(avgOccupancy * 10) / 10,
        avgRevPAR:      Math.round(avgRevPAR * 100) / 100,
        avgADR:         Math.round(avgADR * 100) / 100,
        totalBookings:  byProperty.reduce((s, p) => s + p.bookingsCount, 0),
        roi:            totalExpenses > 0 ? Math.round((totalProfit / totalExpenses) * 1000) / 10 : 0,
      },
    });
  } catch (err) {
    console.error('GET /api/rentabilite error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
