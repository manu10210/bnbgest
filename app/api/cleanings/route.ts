import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/cleanings - Liste des nettoyages avec filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const bookingId = searchParams.get('bookingId');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Construction des filtres Prisma
    const where: Prisma.CleaningWhereInput = {};

    if (propertyId) {
      where.propertyId = parseInt(propertyId);
    }

    if (status) {
      where.status = status as any;
    }

    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate);
      }
    }

    // Récupération des nettoyages
    const cleanings = await prisma.cleaning.findMany({
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
        { scheduledDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    // Calcul des statistiques
    const stats = {
      total: cleanings.length,
      scheduled: cleanings.filter(c => c.status === 'SCHEDULED').length,
      inProgress: cleanings.filter(c => c.status === 'IN_PROGRESS').length,
      completed: cleanings.filter(c => c.status === 'COMPLETED').length,
      cancelled: cleanings.filter(c => c.status === 'CANCELLED').length,
      upcoming: cleanings.filter(c => 
        c.status === 'SCHEDULED' && 
        new Date(c.scheduledDate) > new Date()
      ).length,
      overdue: cleanings.filter(c => 
        c.status === 'SCHEDULED' && 
        new Date(c.scheduledDate) < new Date()
      ).length
    };

    return NextResponse.json({
      success: true,
      count: cleanings.length,
      cleanings,
      stats
    });
  } catch (error) {
    console.error('Error fetching cleanings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cleanings'
      },
      { status: 500 }
    );
  }
}

// POST /api/cleanings - Créer un nouveau nettoyage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des champs requis
    const { propertyId, scheduledDate } = body;

    if (!propertyId || !scheduledDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'propertyId and scheduledDate are required'
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

    // Si bookingId est fourni, vérifier qu'il existe
    if (body.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: parseInt(body.bookingId) }
      });

      if (!booking) {
        return NextResponse.json(
          {
            success: false,
            error: 'Booking not found'
          },
          { status: 404 }
        );
      }

      if (booking.propertyId !== parseInt(propertyId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Booking does not belong to this property'
          },
          { status: 400 }
        );
      }
    }

    // Vérifier les conflits de planning (même propriété, même date, même heure)
    const scheduledDateTime = new Date(scheduledDate);
    const conflictCheck = await prisma.cleaning.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        },
        scheduledDate: {
          gte: new Date(scheduledDateTime.getTime() - 2 * 60 * 60 * 1000), // -2h
          lte: new Date(scheduledDateTime.getTime() + 2 * 60 * 60 * 1000)  // +2h
        }
      }
    });

    if (conflictCheck) {
      return NextResponse.json(
        {
          success: false,
          error: 'Another cleaning is already scheduled at this time',
          conflict: conflictCheck
        },
        { status: 409 }
      );
    }

    // Créer le nettoyage
    const cleaning = await prisma.cleaning.create({
      data: {
        propertyId: parseInt(propertyId),
        scheduledDate: new Date(scheduledDate),
        assignedTo: body.assignedTo || null,
        status: body.status || 'SCHEDULED',
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
        cleaning
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating cleaning:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create cleaning'
      },
      { status: 500 }
    );
  }
}
