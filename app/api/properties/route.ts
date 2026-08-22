export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { PropertyStatus } from '@prisma/client';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { PropertySchema } from '@/lib/validations';
import { findByNameOrAlias } from '@/lib/property-identity';

// Enable ISR with 60 seconds revalidation
export const revalidate = 60;

function isPropertyStatus(value: string): value is PropertyStatus {
  return value === 'ACTIVE' || value === 'INACTIVE' || value === 'MAINTENANCE';
}

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
    const statusRaw = (searchParams.get('status') || '').toUpperCase();
    const status = isPropertyStatus(statusRaw) ? statusRaw : undefined;
    const ownerId = searchParams.get('ownerId');

    const properties = await prisma.property.findMany({
      where: {
        ...(status && { status }),
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
 * ✅ Protected: Auth required, Rate limited (strict: 10/10s), Validated
 */
export async function POST(request: Request) {
  // 1. Rate limiting (strict for write operations)
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const sessionUser = authResult.user as {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      role?: string | null;
    };

    const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
    const normalizedRole = String(sessionUser.role || 'USER').toUpperCase();
    const dbRole = normalizedRole === 'ADMIN' || normalizedRole === 'EMPLOYEE' || normalizedRole === 'USER'
      ? normalizedRole
      : 'USER';

    // 3. Resolve the effective DB owner user (id from session can be external provider id)
    let owner = sessionUser.id
      ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
      : null;

    if (!owner && normalizedEmail) {
      owner = await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
          ...(sessionUser.name ? { name: sessionUser.name } : {}),
        },
        create: {
          email: normalizedEmail,
          name: sessionUser.name || normalizedEmail.split('@')[0],
          role: dbRole,
        },
        select: { id: true },
      });
    }

    if (!owner) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - unable to resolve authenticated DB user',
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validated = PropertySchema.safeParse({
      ...body,
      userId: owner.id,
    });

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validated.error.issues,
        },
        { status: 400 },
      );
    }

    const validatedData = validated.data;

    // Pas de doublon : même nom (ou ancien nom fusionné) → on rend l'existante.
    // Une annonce Airbnb renommée ne doit pas faire naître une 2e propriété.
    const existing = await prisma.property.findMany({
      where: { userId: owner.id },
      select: { id: true, name: true, status: true, metadata: true },
    });
    const duplicate = findByNameOrAlias(existing, validatedData.name);
    if (duplicate) {
      const full = await prisma.property.findUnique({
        where: { id: duplicate.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json(
        { success: true, duplicate: true, dedupeReason: 'name_or_alias', property: full },
        { status: 200 },
      );
    }

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
