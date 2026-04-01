import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Test endpoint pour vérifier la connexion à la base de données Vercel Postgres
 * GET /api/db-test
 */
export async function GET() {
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
