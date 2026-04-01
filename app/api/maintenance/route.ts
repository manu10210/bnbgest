import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/maintenance - Liste des tâches de maintenance avec filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Construction des filtres Prisma
    const where: Prisma.MaintenanceTaskWhereInput = {};

    if (propertyId) {
      where.propertyId = parseInt(propertyId);
    }

    if (status) {
      where.status = status as any;
    }

    if (priority) {
      where.priority = priority as any;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Récupération des tâches
    const tasks = await prisma.maintenanceTask.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // Calcul des statistiques
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'PENDING').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      cancelled: tasks.filter(t => t.status === 'CANCELLED').length,
      byPriority: {
        low: tasks.filter(t => t.priority === 'LOW').length,
        medium: tasks.filter(t => t.priority === 'MEDIUM').length,
        high: tasks.filter(t => t.priority === 'HIGH').length,
        urgent: tasks.filter(t => t.priority === 'URGENT').length
      },
      totalCost: tasks
        .filter(t => t.cost)
        .reduce((sum, t) => sum + (t.cost || 0), 0),
      overdue: tasks.filter(t => 
        t.status !== 'COMPLETED' && 
        t.dueDate && 
        new Date(t.dueDate) < new Date()
      ).length
    };

    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
      stats
    });
  } catch (error) {
    console.error('Error fetching maintenance tasks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch maintenance tasks'
      },
      { status: 500 }
    );
  }
}

// POST /api/maintenance - Créer une nouvelle tâche de maintenance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des champs requis
    const { propertyId, title, priority } = body;

    if (!propertyId || !title || !priority) {
      return NextResponse.json(
        {
          success: false,
          error: 'propertyId, title, and priority are required'
        },
        { status: 400 }
      );
    }

    // Vérifier que la propriété existe
    const property = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) }
    });

    if (!property) {
      return NextResponse.json(
        {
          success: false,
          error: 'Property not found'
        },
        { status: 404 }
      );
    }

    // Validation de la priorité
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        {
          success: false,
          error: `priority must be one of: ${validPriorities.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Créer la tâche
    const task = await prisma.maintenanceTask.create({
      data: {
        propertyId: parseInt(propertyId),
        title,
        description: body.description,
        priority,
        status: body.status || 'PENDING',
        assignedTo: body.assignedTo || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        cost: body.cost ? parseFloat(body.cost) : null,
        notes: body.notes
      },
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

    return NextResponse.json(
      {
        success: true,
        task
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create maintenance task'
      },
      { status: 500 }
    );
  }
}
