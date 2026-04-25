export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { ReviewSchema, validateRequest } from '@/lib/validations';

// GET /api/reviews - Liste des avis avec filtres
// ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
export async function GET(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const bookingId = searchParams.get('bookingId');
    const minRating = searchParams.get('minRating');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Construction des filtres Prisma
    const where: Prisma.ReviewWhereInput = {};

    if (propertyId) {
      where.booking = {
        propertyId: parseInt(propertyId)
      };
    }

    if (bookingId) {
      where.bookingId = parseInt(bookingId);
    }

    if (minRating) {
      where.rating = {
        gte: parseInt(minRating)
      };
    }

    // Récupération des avis
    const reviews = await prisma.review.findMany({
      where,
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Calcul des statistiques
    const stats = {
      total: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length
      }
    };

    return NextResponse.json({
      success: true,
      count: reviews.length,
      reviews,
      stats
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reviews'
      },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Créer un nouvel avis
// POST /api/reviews - Créer un nouvel avis
// ✅ Protected: Auth required, Rate limited (strict: 10/10s), Validated
export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation
    const validatedData = await validateRequest(ReviewSchema, request);

    // Vérifier que la réservation existe et est terminée
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: 'Booking not found'
        },
        { status: 404 }
      );
    }

    if (booking.status !== 'CHECKED_OUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Can only review completed bookings'
        },
        { status: 400 }
      );
    }

    // Vérifier qu'un avis n'existe pas déjà pour cette réservation
    const existingReview = await prisma.review.findFirst({
      where: { bookingId: validatedData.bookingId }
    });

    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review already exists for this booking'
        },
        { status: 409 }
      );
    }

    // Créer l'avis
    const review = await prisma.review.create({
      data: {
        propertyId: booking.propertyId,
        bookingId: validatedData.bookingId,
        rating: validatedData.rating,
        comment: validatedData.comment,
        guestName: booking.guestName,
      },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(
      {
        success: true,
        review
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create review'
      },
      { status: 500 }
    );
  }
}
