export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { InventoryItemSchema, validateRequest } from '@/lib/validations';

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

// POST /api/inventory - Créer un item d'inventaire
// ✅ Protected: Auth required, Rate limited (strict: 10/10s), Validated
export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const validatedData = await validateRequest(InventoryItemSchema, request);

    const property = await prisma.property.findUnique({
      where: { id: validatedData.propertyId },
      select: { id: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 },
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        propertyId: validatedData.propertyId,
        name: validatedData.name,
        category: validatedData.category,
        quantity: validatedData.quantity,
        minQuantity: validatedData.minQuantity,
        unit: validatedData.unit,
        location: validatedData.location,
        notes: validatedData.notes,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        item,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create inventory item' },
      { status: 500 },
    );
  }
}
