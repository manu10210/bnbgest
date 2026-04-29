export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/inventory - Liste des items d'inventaire (DB réelle)
// ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const where = propertyId ? { propertyId: parseInt(propertyId, 10) } : undefined;

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: Number.isNaN(limit) ? 500 : limit,
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
