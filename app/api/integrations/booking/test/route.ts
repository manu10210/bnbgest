export const dynamic = 'force-dynamic';

/**
 * 🧪 Booking.com Connection Test
 * ✅ Protected: Auth required, Rate limited (normal: 30/10s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BookingClient } from '@/lib/booking-client';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'normal');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

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
