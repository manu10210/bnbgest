import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reviews/[id] - Récupérer un avis spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = parseInt(params.id);

    if (isNaN(reviewId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid review ID'
        },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
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

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/reviews/[id] - Répondre à un avis (propriétaire)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = parseInt(params.id);

    if (isNaN(reviewId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid review ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { response } = body;

    if (!response || typeof response !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'response is required and must be a string'
        },
        { status: 400 }
      );
    }

    // Vérifier que l'avis existe
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review not found'
        },
        { status: 404 }
      );
    }

    // Mettre à jour avec la réponse
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date()
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

    return NextResponse.json({
      success: true,
      message: 'Response added successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update review'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Supprimer un avis (soft delete possible si besoin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = parseInt(params.id);

    if (isNaN(reviewId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid review ID'
        },
        { status: 400 }
      );
    }

    // Vérifier que l'avis existe
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: 'Review not found'
        },
        { status: 404 }
      );
    }

    // Supprimer l'avis
    await prisma.review.delete({
      where: { id: reviewId }
    });

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete review'
      },
      { status: 500 }
    );
  }
}
