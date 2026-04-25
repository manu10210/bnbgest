export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireOwnership } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { CleaningUpdateSchema, validateRequest } from '@/lib/validations';

// GET /api/cleanings/[id] - Récupérer un nettoyage spécifique
// ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleaningId = parseInt(id);

  if (isNaN(cleaningId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid cleaning ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {

    const cleaning = await prisma.cleaning.findUnique({
      where: { id: cleaningId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true
          }
        }
      }
    });

    if (!cleaning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cleaning not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      cleaning
    });
  } catch (error) {
    console.error('Error fetching cleaning:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cleaning'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/cleanings/[id] - Mettre à jour un nettoyage
// ✅ Protected: Ownership required, Rate limited (strict: 10/10s), Validated
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleaningId = parseInt(id);

  if (isNaN(cleaningId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid cleaning ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Ownership check
  const authResult = await requireOwnership(request, cleaningId, 'cleaning');
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation
    const validatedData = await validateRequest(CleaningUpdateSchema, request);

    // Vérifier que le nettoyage existe
    const existingCleaning = await prisma.cleaning.findUnique({
      where: { id: cleaningId }
    });

    if (!existingCleaning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cleaning not found'
        },
        { status: 404 }
      );
    }

    // Construction de l'objet de mise à jour
    const updateData: any = {};

    if (validatedData.scheduledDate !== undefined) {
      updateData.scheduledDate = new Date(validatedData.scheduledDate);
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status;

      // Si le nettoyage est complété, enregistrer la date
      if (validatedData.status === 'COMPLETED' && !existingCleaning.completedDate) {
        updateData.completedDate = new Date();
      }
    }

    if (validatedData.assignedTo !== undefined) {
      updateData.assignedTo = validatedData.assignedTo;
    }

    if (validatedData.actualTime !== undefined) {
      updateData.actualTime = validatedData.actualTime;
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    if (validatedData.completedDate !== undefined) {
      updateData.completedDate = new Date(validatedData.completedDate);
    }

    // Mettre à jour le nettoyage
    const cleaning = await prisma.cleaning.update({
      where: { id: cleaningId },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cleaning updated successfully',
      cleaning
    });
  } catch (error) {
    console.error('Error updating cleaning:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update cleaning'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/cleanings/[id] - Supprimer un nettoyage
// ✅ Protected: Ownership required, Rate limited (strict: 10/10s)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleaningId = parseInt(id);

  if (isNaN(cleaningId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid cleaning ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Ownership check
  const authResult = await requireOwnership(request, cleaningId, 'cleaning');
  if (authResult instanceof NextResponse) return authResult;

  try {

    // Vérifier que le nettoyage existe
    const existingCleaning = await prisma.cleaning.findUnique({
      where: { id: cleaningId }
    });

    if (!existingCleaning) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cleaning not found'
        },
        { status: 404 }
      );
    }

    // Option: Soft delete (changer status à CANCELLED)
    // ou Hard delete (supprimer complètement)
    
    // Hard delete:
    await prisma.cleaning.delete({
      where: { id: cleaningId }
    });

    // Soft delete alternative:
    // await prisma.cleaning.update({
    //   where: { id: cleaningId },
    //   data: { status: 'CANCELLED' }
    // });

    return NextResponse.json({
      success: true,
      message: 'Cleaning deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting cleaning:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete cleaning'
      },
      { status: 500 }
    );
  }
}
