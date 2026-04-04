/**
 * 🔧 Database Test Endpoint
 * ✅ Protected: ADMIN role required, Rate limited (strict: 10/10s)
 */

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Test endpoint pour vérifier la connexion à la base de données Vercel Postgres
 * GET /api/db-test
 */
export async function GET(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authorization (ADMIN only)
  const authResult = await requireRole(request, 'ADMIN');
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Test de connexion basique
    const userCount = await prisma.user.count();
    const propertyCount = await prisma.property.count();
    const bookingCount = await prisma.booking.count();

    return NextResponse.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        properties: propertyCount,
        bookings: bookingCount,
      },
      prismaVersion: '7.6.0',
      provider: 'postgresql',
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return NextResponse.json(
      {
        success: false,
        database: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
