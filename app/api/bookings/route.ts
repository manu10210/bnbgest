import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendBookingConfirmationEmail } from '@/lib/email-notifications';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { BookingSchema, validateRequest } from '@/lib/validations';

/**
 * GET /api/bookings
 * Récupère toutes les réservations avec filtres
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
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
          AND: [
            { checkIn:  { lt: new Date(endDate)   } },
            { checkOut: { gt: new Date(startDate) } },
          ],
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
 * ✅ Protected: Auth required, Rate limited (strict: 10/10s), Validated
 */
export async function POST(request: Request) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation with Zod
    const validatedData = await validateRequest(BookingSchema, request);

    // Vérifier disponibilité
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        propertyId: validatedData.propertyId,
        status: {
          in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'],
        },
        OR: [
          {
            checkIn: {
              lte: new Date(validatedData.checkOut),
            },
            checkOut: {
              gte: new Date(validatedData.checkIn),
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
        propertyId: validatedData.propertyId,
        guestName: validatedData.guestName,
        guestEmail: validatedData.guestEmail,
        guestPhone: validatedData.guestPhone,
        checkIn: new Date(validatedData.checkIn),
        checkOut: new Date(validatedData.checkOut),
        guests: validatedData.guests,
        totalPrice: validatedData.totalPrice,
        notes: validatedData.notes,
        status: 'PENDING',
        source: 'DIRECT',
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            price: true,
          },
        },
      },
    });

    // Envoyer email de confirmation si status CONFIRMED
    if (booking.status === 'CONFIRMED') {
      try {
        await sendBookingConfirmationEmail({
          id: booking.id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests,
          totalPrice: booking.totalPrice,
          property: {
            name: booking.property.name,
            address: booking.property.address,
            city: booking.property.city,
          },
        });
        console.log('✅ Email de confirmation envoyé');
      } catch (emailError) {
        console.error('⚠️ Erreur envoi email (non bloquant):', emailError);
        // Ne pas bloquer la création si l'email échoue
      }
    }

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
