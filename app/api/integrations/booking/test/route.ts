import { NextResponse } from 'next/server';
import { BookingClient } from '@/lib/booking-client';

export async function POST(request: Request) {
  try {
    const { credentials } = await request.json();

    if (!credentials?.hotelId) {
      return NextResponse.json(
        { success: false, error: 'Hotel ID required' },
        { status: 400 }
      );
    }

    const client = new BookingClient(credentials);
    await client.getReservations();

    return NextResponse.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Connection failed',
      details: (error as Error).message 
    });
  }
}
