import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireOwnership } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import { MaintenanceUpdateSchema, validateRequest } from '@/lib/validations';

// GET /api/maintenance/[id] - Récupérer une tâche de maintenance spécifique
// ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id);

  if (isNaN(taskId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid task ID' },
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

    const task = await prisma.maintenanceTask.findUnique({
      where: { id: taskId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            userId: true
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
// ✅ Protected: Ownership required, Rate limited (strict: 10/10s), Validated
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = parseInt(id);

  if (isNaN(taskId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid task ID' },
      { status: 400 }
    );
  }

  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Ownership check
  const authResult = await requireOwnership(request, taskId, 'maintenance');
  if (authResult instanceof NextResponse) return authResult;

  try {
    // 3. Validation
    const validatedData = await validateRequest(MaintenanceUpdateSchema, request);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id);

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
