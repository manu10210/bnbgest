import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth, requireOwnership } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

/**
 * GET /api/properties/[id]
 * Récupère une propriété spécifique avec toutes ses relations
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id: paramId } = await params;
    const id = parseInt(paramId);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid property ID' },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookings: {
          include: {
            payments: true,
            reviews: true,
          },
          orderBy: {
            checkIn: 'desc',
          },
        },
        photos: true,
        videos: true,
        reviews: {
          include: {
            booking: {
              select: {
                id: true,
                guestName: true,
                guestEmail: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        cleanings: {
          orderBy: {
            scheduledDate: 'desc',
          },
          take: 10,
        },
        maintenance: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        inventory: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            cleanings: true,
            maintenance: true,
            photos: true,
            videos: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Calculer les statistiques
    const completedBookings = property.bookings.filter(b => b.status === 'CHECKED_OUT');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const averageRating = property.reviews.length > 0
      ? property.reviews.reduce((sum, r) => sum + r.rating, 0) / property.reviews.length
      : 0;

    return NextResponse.json({
      success: true,
      property,
      stats: {
        totalBookings: property.bookings.length,
        completedBookings: completedBookings.length,
        totalRevenue,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewCount: property.reviews.length,
        maintenanceCount: property.maintenance.length,
        cleaningCount: property.cleanings.length,
      },
    });
  } catch (error) {
    console.error('GET /api/properties/[id] error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch property' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/properties/[id]
 * Met à jour une propriété
 * ✅ Protected: Ownership required, Rate limited (strict: 10/10s)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params;
  const id = parseInt(paramId);

  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid property ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Ownership check (user must own the property OR be ADMIN)
  const authResult = await requireOwnership(request, id, 'property');
  if (authResult instanceof NextResponse) return authResult;

  try {

    const body = await request.json();

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.zipCode !== undefined && { zipCode: body.zipCode }),
        ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
        ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
        ...(body.maxGuests !== undefined && { maxGuests: body.maxGuests }),
        ...(body.pricePerNight !== undefined && { pricePerNight: body.pricePerNight }),
        ...(body.status && { status: body.status }),
        ...(body.amenities !== undefined && { amenities: body.amenities }),
        ...(body.houseRules !== undefined && { houseRules: body.houseRules }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error) {
    console.error('PATCH /api/properties/[id] error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update property' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/properties/[id]
 * Supprime une propriété (soft delete en changeant le status)
 * ✅ Protected: Ownership required, Rate limited (strict: 10/10s)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params;
  const id = parseInt(paramId);

  if (isNaN(id)) {
    return NextResponse.json(
      { success: false, error: 'Invalid property ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Ownership check (user must own the property OR be ADMIN)
  const authResult = await requireOwnership(request, id, 'property');
  if (authResult instanceof NextResponse) return authResult;

  try {

    // Soft delete : change status to INACTIVE
    const property = await prisma.property.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({
      success: true,
      message: 'Property deactivated successfully',
      property,
    });
  } catch (error) {
    console.error('DELETE /api/properties/[id] error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete property' 
      },
      { status: 500 }
    );
  }
}
