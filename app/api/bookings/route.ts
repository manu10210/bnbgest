import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/bookings
 * Récupère toutes les réservations avec filtres
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const bookings = await prisma.booking.findMany({
      where: {
        ...(propertyId && { propertyId: parseInt(propertyId) }),
        ...(status && { status: status as any }),
        ...(source && { source: source as any }),
        ...(startDate && endDate && {
          checkIn: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
        payments: true,
        reviews: true,
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    // Calculer les statistiques
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      pending: bookings.filter(b => b.status === 'PENDING').length,
      checkedIn: bookings.filter(b => b.status === 'CHECKED_IN').length,
      checkedOut: bookings.filter(b => b.status === 'CHECKED_OUT').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      totalRevenue: bookings
        .filter(b => b.status === 'CHECKED_OUT')
        .reduce((sum, b) => sum + b.totalPrice, 0),
    };

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings,
      stats,
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Crée une nouvelle réservation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validation
    if (!body.propertyId || !body.checkIn || !body.checkOut || !body.guestName || !body.guestEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Vérifier disponibilité
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: body.propertyId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'],
        },
        OR: [
          {
            checkIn: {
              lte: new Date(body.checkOut),
            },
            checkOut: {
              gte: new Date(body.checkIn),
            },
          },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Property not available for selected dates' },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        propertyId: body.propertyId,
        guestName: body.guestName,
        guestEmail: body.guestEmail,
        guestPhone: body.guestPhone || null,
        checkIn: new Date(body.checkIn),
        checkOut: new Date(body.checkOut),
        guests: body.guests || 1,
        totalPrice: body.totalPrice || 0,
        status: body.status || 'PENDING',
        source: body.source || 'DIRECT',
        externalId: body.externalId || null,
        notes: body.notes || null,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            price: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create booking' 
      },
      { status: 500 }
    );
  }
}
