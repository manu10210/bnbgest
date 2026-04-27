export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeName(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d+]/g, '');
  return digits.length > 0 ? digits : null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function toDateIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function buildBookingIdentityWhere(identity: { email?: string | null; name?: string | null; phone?: string | null }): Prisma.BookingWhereInput {
  const email = normalizeEmail(identity.email);
  const name = identity.name?.trim();
  const phone = identity.phone?.trim();

  const orFilters: Prisma.BookingWhereInput[] = [];
  if (email) {
    orFilters.push({ guestEmail: { equals: email, mode: Prisma.QueryMode.insensitive } });
  }
  if (name) {
    orFilters.push({ guestName: { equals: name, mode: Prisma.QueryMode.insensitive } });
  }
  if (phone) {
    orFilters.push({ guestPhone: phone });
  }

  return orFilters.length > 0 ? { OR: orFilters } : {};
}

function buildThreadIdentityWhere(identity: { email?: string | null; name?: string | null }): Prisma.MessageThreadWhereInput {
  const email = normalizeEmail(identity.email);
  const name = identity.name?.trim();

  const orFilters: Prisma.MessageThreadWhereInput[] = [];
  if (email) {
    orFilters.push({ guestEmail: { equals: email, mode: Prisma.QueryMode.insensitive } });
  }
  if (name) {
    orFilters.push({ guestName: { equals: name, mode: Prisma.QueryMode.insensitive } });
  }

  return orFilters.length > 0 ? { OR: orFilters } : {};
}

function buildReviewIdentityWhere(identity: { name?: string | null }): Prisma.ReviewWhereInput {
  const name = identity.name?.trim();
  if (!name) return {};
  return { guestName: { equals: name, mode: Prisma.QueryMode.insensitive } };
}

function buildGuestScore(input: {
  totalBookings: number;
  cancellationRate: number;
  averageRating: number;
  totalSpent: number;
  upcomingBookings: number;
}): number {
  const reliability = clamp(100 - input.cancellationRate * 1.35);
  const satisfaction = input.averageRating > 0 ? clamp(input.averageRating * 20) : 65;
  const valueScore = clamp((input.totalSpent / Math.max(1, input.totalBookings)) / 2.5);
  const engagement = clamp((input.totalBookings * 8) + (input.upcomingBookings * 6));

  return Math.round((reliability * 0.4) + (satisfaction * 0.3) + (valueScore * 0.15) + (engagement * 0.15));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sessionUserId = authResult.user.id;
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    const url = new URL(request.url);
    const queryEmail = url.searchParams.get('email');
    const queryName = url.searchParams.get('name');
    const queryPhone = url.searchParams.get('phone');

    const guestProfile = Number.isFinite(numericId) && numericId > 0
      ? await prisma.guestProfile.findFirst({
          where: {
            id: numericId,
            userId: sessionUserId,
          },
        })
      : null;

    const identity = {
      email: guestProfile?.email || queryEmail,
      name: guestProfile?.name || queryName,
      phone: guestProfile?.phone || queryPhone,
    };

    const hasIdentity = !!normalizeEmail(identity.email) || !!normalizeName(identity.name) || !!normalizePhone(identity.phone);
    if (!hasIdentity) {
      return NextResponse.json(
        { success: false, error: 'Guest identity is required to build insights' },
        { status: 400 },
      );
    }

    const now = new Date();

    const [bookings, threads, reviews] = await Promise.all([
      prisma.booking.findMany({
        where: {
          AND: [
            {
              OR: [{ userId: sessionUserId }, { property: { userId: sessionUserId } }],
            },
            buildBookingIdentityWhere(identity),
          ],
        },
        select: {
          id: true,
          status: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          confirmationCode: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { checkIn: 'desc' },
      }),
      prisma.messageThread.findMany({
        where: {
          AND: [
            { property: { userId: sessionUserId } },
            buildThreadIdentityWhere(identity),
          ],
        },
        select: {
          id: true,
          platform: true,
          subject: true,
          lastMessage: true,
          lastMessageAt: true,
          isRead: true,
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 20,
      }),
      prisma.review.findMany({
        where: {
          AND: [
            { property: { userId: sessionUserId } },
            buildReviewIdentityWhere(identity),
          ],
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const nonCancelledBookings = bookings.filter((booking) => booking.status !== 'CANCELLED');
    const completedBookings = bookings.filter((booking) => booking.status === 'CHECKED_OUT');
    const cancelledBookings = bookings.filter((booking) => booking.status === 'CANCELLED');
    const upcomingBookings = bookings.filter((booking) => booking.status !== 'CANCELLED' && booking.checkIn > now);

    const totalSpent = nonCancelledBookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0);
    const totalNights = completedBookings.reduce((sum, booking) => {
      const diffMs = booking.checkOut.getTime() - booking.checkIn.getTime();
      const nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return sum + nights;
    }, 0);

    const averageStay = completedBookings.length > 0
      ? Number((totalNights / completedBookings.length).toFixed(1))
      : 0;

    const cancellationRate = bookings.length > 0
      ? Number(((cancelledBookings.length / bookings.length) * 100).toFixed(1))
      : 0;

    const averageRating = reviews.length > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(2))
      : Number(guestProfile?.rating || 0);

    const score = buildGuestScore({
      totalBookings: nonCancelledBookings.length,
      cancellationRate,
      averageRating,
      totalSpent,
      upcomingBookings: upcomingBookings.length,
    });

    const timeline = [
      ...bookings.map((booking) => ({
        type: 'booking' as const,
        date: booking.checkIn.toISOString(),
        title: `${booking.status === 'CANCELLED' ? 'Réservation annulée' : 'Réservation'} · ${booking.property?.name || 'Logement'}`,
        description: `${booking.checkIn.toISOString().slice(0, 10)} → ${booking.checkOut.toISOString().slice(0, 10)} · ${Math.round(booking.totalPrice)}€`,
        metadata: {
          bookingId: booking.id,
          status: booking.status,
          confirmationCode: booking.confirmationCode,
        },
      })),
      ...threads.map((thread) => ({
        type: 'message' as const,
        date: thread.lastMessageAt.toISOString(),
        title: `Message ${thread.platform} · ${thread.property?.name || 'Sans logement'}`,
        description: thread.subject || thread.lastMessage || 'Conversation voyageur',
        metadata: {
          threadId: thread.id,
          isRead: thread.isRead,
        },
      })),
      ...reviews.map((review) => ({
        type: 'review' as const,
        date: review.createdAt.toISOString(),
        title: `Avis ${review.rating}/5 · ${review.property?.name || 'Logement'}`,
        description: review.comment || 'Avis sans commentaire',
        metadata: {
          reviewId: review.id,
          rating: review.rating,
        },
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    return NextResponse.json({
      success: true,
      guest: {
        id: guestProfile?.id ?? numericId,
        name: guestProfile?.name || queryName || 'Voyageur',
        email: guestProfile?.email || queryEmail || '',
        phone: guestProfile?.phone || queryPhone || '',
        language: guestProfile?.language || 'fr',
        nationality: guestProfile?.nationality || null,
        status: guestProfile?.status || 'active',
        createdAt: toDateIso(guestProfile?.createdAt) || toDateIso(bookings.at(-1)?.createdAt) || new Date().toISOString(),
        lastBooking: toDateIso(guestProfile?.lastBooking) || toDateIso(bookings[0]?.checkOut),
      },
      insights: {
        score,
        scoreLabel: score >= 85 ? 'excellent' : score >= 70 ? 'bon' : score >= 55 ? 'à surveiller' : 'risqué',
        metrics: {
          totalBookings: nonCancelledBookings.length,
          cancelledBookings: cancelledBookings.length,
          upcomingBookings: upcomingBookings.length,
          totalSpent: Number(totalSpent.toFixed(2)),
          averageStay,
          cancellationRate,
          averageRating,
          messageThreads: threads.length,
          reviews: reviews.length,
        },
        timeline,
      },
    });
  } catch (error) {
    console.error('GET /api/guests/[id] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guest insights',
      },
      { status: 500 },
    );
  }
}
