import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/properties
 * Récupère toutes les propriétés avec leurs relations
 */
export async function GET(request: Request) {
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

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
    });
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
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation basique
    if (!body.name || !body.userId) {
      return NextResponse.json(
        { success: false, error: 'Name and userId are required' },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        name: body.name,
        description: body.description || '',
        address: body.address || '',
        city: body.city || '',
        country: body.country || '',
        bedrooms: body.bedrooms || 1,
        bathrooms: body.bathrooms || 1,
        capacity: body.capacity || body.maxGuests || 2,
        price: body.price || body.pricePerNight || 0,
        currency: body.currency || 'EUR',
        userId: body.userId,
        status: body.status || 'ACTIVE',
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
