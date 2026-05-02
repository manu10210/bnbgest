export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { InventoryItemSchema } from '@/lib/validations';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const itemId = Number.parseInt(id, 10);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid inventory item ID' }, { status: 400 });
  }

  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const validated = InventoryItemSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validated.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
    }

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(validated.data.propertyId !== undefined && { propertyId: validated.data.propertyId }),
        ...(validated.data.name !== undefined && { name: validated.data.name }),
        ...(validated.data.category !== undefined && { category: validated.data.category }),
        ...(validated.data.quantity !== undefined && { quantity: validated.data.quantity }),
        ...(validated.data.minQuantity !== undefined && { minQuantity: validated.data.minQuantity }),
        ...(validated.data.unit !== undefined && { unit: validated.data.unit }),
        ...(validated.data.location !== undefined && { location: validated.data.location }),
        ...(validated.data.notes !== undefined && { notes: validated.data.notes }),
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

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('PATCH /api/inventory/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update inventory item' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const itemId = Number.parseInt(id, 10);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid inventory item ID' }, { status: 400 });
  }

  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Inventory item not found' }, { status: 404 });
    }

    await prisma.inventoryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete inventory item' },
      { status: 500 },
    );
  }
}
