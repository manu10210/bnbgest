import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/cleanings/[id] - Récupérer un nettoyage spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleaningId = parseInt(id);

    if (isNaN(cleaningId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cleaning ID'
        },
        { status: 400 }
      );
    }

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
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleaningId = parseInt(id);

    if (isNaN(cleaningId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cleaning ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();

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

    if (body.scheduledDate !== undefined) {
      updateData.scheduledDate = new Date(body.scheduledDate);
    }

    if (body.status !== undefined) {
      const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `status must be one of: ${validStatuses.join(', ')}`
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // Si le nettoyage est complété, enregistrer la date
      if (body.status === 'COMPLETED' && !existingCleaning.completedDate) {
        updateData.completedDate = new Date();
      }

      // Si en cours et pas encore commencé, enregistrer l'heure de début
      if (body.status === 'IN_PROGRESS' && !existingCleaning.completedDate) {
        // On pourrait ajouter un champ startedAt dans le schema
      }
    }

    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo ? parseInt(body.assignedTo) : null;
    }

    if (body.cost !== undefined) {
      updateData.cost = body.cost ? parseFloat(body.cost) : null;
    }

    if (body.duration !== undefined) {
      updateData.duration = body.duration ? parseInt(body.duration) : null;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.checklistCompleted !== undefined) {
      updateData.checklistCompleted = body.checklistCompleted;
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleaningId = parseInt(id);

    if (isNaN(cleaningId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid cleaning ID'
        },
        { status: 400 }
      );
    }

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
