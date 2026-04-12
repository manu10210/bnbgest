import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { PropertySchema, validateRequest } from '@/lib/validations';

// Enable ISR with 60 seconds revalidation
export const revalidate = 60;

/**
 * GET /api/properties
 * Récupère toutes les propriétés avec leurs relations
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 * ✅ Cached: 60s revalidation
 */
export async function GET(request: Request) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');

    const properties = await prisma.property.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(ownerId && { userId: ownerId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            status: true,
            totalPrice: true,
          },
          take: 5,
          orderBy: {
            checkIn: 'desc',
          },
        },
        photos: {
          select: {
            id: true,
            url: true,
            caption: true,
          },
          take: 10,
        },
        _count: {
          select: {
            bookings: true,
            reviews: true,
            cleanings: true,
            maintenance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(
      {
        success: true,
        count: properties.length,
        properties,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/properties error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch properties' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/properties
 * Crée une nouvelle propriété
 * ✅ Protected: Auth + OWNER role required, Rate limited (strict: 10/10s), Validated
 */
export async function POST(request: Request) {
  // 1. Rate limiting (strict for write operations)
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication + Role check (only OWNER/ADMIN can create properties)
  const authResult = await requireRole(request, 'OWNER');
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation with Zod schema
    const validatedData = await validateRequest(PropertySchema, request);

    const property = await prisma.property.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        address: validatedData.address,
        city: validatedData.city,
        country: validatedData.country,
        bedrooms: validatedData.bedrooms,
        bathrooms: validatedData.bathrooms,
        capacity: validatedData.capacity,
        price: validatedData.price,
        currency: validatedData.currency,
        userId: validatedData.userId,
        // TODO: Add after schema migration: zipCode, pricePerNight, cleaningFee
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

    return NextResponse.json(
      {
        success: true,
        property,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/properties error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create property' 
      },
      { status: 500 }
    );
  }
}
