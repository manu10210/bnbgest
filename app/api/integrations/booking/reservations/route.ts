import { NextResponse } from 'next/server';
import { BookingClient } from '@/lib/booking-client';

export async function POST(request: Request) {
  try {
    const { credentials } = await request.json();

    if (!credentials?.hotelId) {
      return NextResponse.json(
        { error: 'Booking credentials required' },
        { status: 400 }
      );
    }

    const client = new BookingClient(credentials);
    const reservations = await client.getReservations();

    return NextResponse.json({
      success: true,
      reservations,
      count: reservations.length
    });
  } catch (error) {
    console.error('Booking reservations error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Booking reservations', details: (error as Error).message },
      { status: 500 }
    );
  }
}
