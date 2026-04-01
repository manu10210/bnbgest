import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/reviews - Liste des avis avec filtres
export async function GET(request: NextRequest) {
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
      },
      withResponse: reviews.filter(r => r.response).length
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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des champs requis
    const { bookingId, rating, comment } = body;

    if (!bookingId || !rating) {
      return NextResponse.json(
        {
          success: false,
          error: 'bookingId and rating are required'
        },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'rating must be between 1 and 5'
        },
        { status: 400 }
      );
    }

    // Vérifier que la réservation existe et est terminée
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
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
    const existingReview = await prisma.review.findUnique({
      where: { bookingId: parseInt(bookingId) }
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
        bookingId: parseInt(bookingId),
        rating: parseInt(rating),
        comment,
        guestName: booking.guestName
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
