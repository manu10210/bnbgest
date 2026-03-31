import { NextResponse } from 'next/server';
import { AirbnbClient } from '@/lib/airbnb-client';

export async function POST(request: Request) {
  try {
    const { icalUrl } = await request.json();

    if (!icalUrl) {
      return NextResponse.json(
        { error: 'iCal URL required' },
        { status: 400 }
      );
    }

    const client = new AirbnbClient(icalUrl);
    const reservations = await client.getReservations();

    return NextResponse.json({
      success: true,
      reservations,
      count: reservations.length
    });
  } catch (error) {
    console.error('Airbnb calendar sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Airbnb calendar', details: (error as Error).message },
      { status: 500 }
    );
  }
}
