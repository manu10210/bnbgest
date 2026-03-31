import { NextResponse } from 'next/server';
import { AirbnbClient } from '@/lib/airbnb-client';

export async function POST(request: Request) {
  try {
    const { credentials } = await request.json();

    if (!credentials?.icalUrl) {
      return NextResponse.json(
        { success: false, error: 'iCal URL required' },
        { status: 400 }
      );
    }

    const client = new AirbnbClient(credentials.icalUrl);
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
