import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/maintenance/[id] - Récupérer une tâche de maintenance spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task ID'
        },
        { status: 400 }
      );
    }

    const task = await prisma.maintenanceTask.findUnique({
      where: { id: taskId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            ownerId: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maintenance task not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error fetching maintenance task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch maintenance task'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/maintenance/[id] - Mettre à jour une tâche de maintenance
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Vérifier que la tâche existe
    const existingTask = await prisma.maintenanceTask.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maintenance task not found'
        },
        { status: 404 }
      );
    }

    // Construction de l'objet de mise à jour
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) {
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          {
            success: false,
            error: `priority must be one of: ${validPriorities.join(', ')}`
          },
          { status: 400 }
        );
      }
      updateData.priority = body.priority;
    }
    if (body.status !== undefined) {
      const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
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
      
      // Si la tâche est complétée, enregistrer la date
      if (body.status === 'COMPLETED' && !existingTask.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (body.assignedTo !== undefined) {
      updateData.assignedTo = body.assignedTo ? parseInt(body.assignedTo) : null;
    }
    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.estimatedCost !== undefined) {
      updateData.estimatedCost = body.estimatedCost ? parseFloat(body.estimatedCost) : null;
    }
    if (body.actualCost !== undefined) {
      updateData.actualCost = body.actualCost ? parseFloat(body.actualCost) : null;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Mettre à jour la tâche
    const task = await prisma.maintenanceTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Maintenance task updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating maintenance task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update maintenance task'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/maintenance/[id] - Supprimer une tâche de maintenance
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id);

    if (isNaN(taskId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid task ID'
        },
        { status: 400 }
      );
    }

    // Vérifier que la tâche existe
    const existingTask = await prisma.maintenanceTask.findUnique({
      where: { id: taskId }
    });

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maintenance task not found'
        },
        { status: 404 }
      );
    }

    // Supprimer la tâche
    await prisma.maintenanceTask.delete({
      where: { id: taskId }
    });

    return NextResponse.json({
      success: true,
      message: 'Maintenance task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting maintenance task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete maintenance task'
      },
      { status: 500 }
    );
  }
}
