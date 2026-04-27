export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

type PatchBody = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalPrice?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  specialRequests?: string;
  notes?: string;
  cancellationReason?: string;
  paymentStatus?: 'pending' | 'paid' | 'partial' | 'refunded';
  paymentAmount?: number;
  paymentTransactionId?: string;
};

function mapPaymentStatus(status?: PatchBody['paymentStatus']): 'PENDING' | 'COMPLETED' | 'REFUNDED' | 'FAILED' | undefined {
  if (!status) return undefined;
  switch (status) {
    case 'paid':
    case 'partial':
      return 'COMPLETED';
    case 'refunded':
      return 'REFUNDED';
    case 'pending':
      return 'PENDING';
    default:
      return undefined;
  }
}

/**
 * PATCH /api/bookings/[id]
 * Met à jour une réservation existante
 * ✅ Protected: Auth required, Rate limited (strict)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: paramId } = await params;
    const id = Number.parseInt(paramId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as PatchBody;

    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(body.checkIn && { checkIn: new Date(body.checkIn) }),
        ...(body.checkOut && { checkOut: new Date(body.checkOut) }),
        ...(body.guests !== undefined && { guests: body.guests }),
        ...(body.totalPrice !== undefined && { totalPrice: body.totalPrice }),
        ...(body.status && { status: body.status }),
        ...(body.specialRequests !== undefined && { specialRequests: body.specialRequests }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.cancellationReason !== undefined && { cancellationReason: body.cancellationReason }),
      },
      include: {
        payments: true,
      },
    });

    const mappedPaymentStatus = mapPaymentStatus(body.paymentStatus);
    if (mappedPaymentStatus) {
      const latestPayment = await prisma.payment.findFirst({
        where: { bookingId: id },
        orderBy: { createdAt: 'desc' },
      });

      if (latestPayment) {
        await prisma.payment.update({
          where: { id: latestPayment.id },
          data: {
            status: mappedPaymentStatus,
            ...(body.paymentAmount !== undefined && { amount: body.paymentAmount }),
            ...(body.paymentTransactionId && { transactionId: body.paymentTransactionId }),
            ...(mappedPaymentStatus === 'COMPLETED' && { paidAt: new Date() }),
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            bookingId: id,
            amount: body.paymentAmount ?? body.totalPrice ?? existing.totalPrice,
            currency: 'EUR',
            status: mappedPaymentStatus,
            method: 'BANK_TRANSFER',
            transactionId: body.paymentTransactionId ?? null,
            ...(mappedPaymentStatus === 'COMPLETED' && { paidAt: new Date() }),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('PATCH /api/bookings/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update booking',
      },
      { status: 500 }
    );
  }
}
