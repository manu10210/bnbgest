/**
 * 📈 Stats API - Global metrics and analytics
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 * ✅ Cached: 120s revalidation (stats change less frequently)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

// Enable ISR with 2 minutes revalidation (stats don't need real-time updates)
export const revalidate = 120;

// GET /api/stats - Statistiques et métriques globales du dashboard
export async function GET(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Dates par défaut: dernier mois
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Filtres de base
    const propertyFilter = propertyId ? { propertyId: parseInt(propertyId) } : {};
    const dateFilter = {
      createdAt: {
        gte: start,
        lte: end
      }
    };

    // === BOOKINGS ANALYTICS ===
    const bookings = await prisma.booking.findMany({
      where: {
        ...propertyFilter,
        checkIn: {
          gte: start,
          lte: end
        }
      },
      include: {
        payments: true,
        property: {
          select: {
            id: true,
            name: true,
            price: true
          }
        }
      }
    });

    const bookingsStats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      pending: bookings.filter(b => b.status === 'PENDING').length,
      checkedIn: bookings.filter(b => b.status === 'CHECKED_IN').length,
      checkedOut: bookings.filter(b => b.status === 'CHECKED_OUT').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      totalRevenue: bookings
        .filter(b => b.status !== 'CANCELLED')
        .reduce((sum, b) => sum + b.totalPrice, 0),
      averageBookingValue: bookings.length > 0
        ? bookings
            .filter(b => b.status !== 'CANCELLED')
            .reduce((sum, b) => sum + b.totalPrice, 0) / bookings.length
        : 0,
      bySource: {
        direct: bookings.filter(b => b.source === 'DIRECT').length,
        airbnb: bookings.filter(b => b.source === 'AIRBNB').length,
        bookingCom: bookings.filter(b => b.source === 'BOOKING_COM').length,
        other: bookings.filter(b => b.source === 'OTHER').length
      }
    };

    // === PROPERTIES ANALYTICS ===
    const properties = await prisma.property.findMany({
      where: propertyFilter.propertyId ? { id: propertyFilter.propertyId } : {},
      include: {
        bookings: {
          where: {
            checkIn: {
              gte: start,
              lte: end
            }
          }
        },
        reviews: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
            photos: true,
            videos: true
          }
        }
      }
    });

    const propertiesStats = {
      total: properties.length,
      active: properties.filter(p => p.status === 'ACTIVE').length,
      inactive: properties.filter(p => p.status === 'INACTIVE').length,
      maintenance: properties.filter(p => p.status === 'MAINTENANCE').length,
      averageRating: properties.length > 0
        ? properties.reduce((sum, p) => {
            const avg = p.reviews.length > 0
              ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
              : 0;
            return sum + avg;
          }, 0) / properties.length
        : 0,
      totalBookings: properties.reduce((sum, p) => sum + p.bookings.length, 0)
    };

    // === REVIEWS ANALYTICS ===
    const reviews = await prisma.review.findMany({
      where: {
        ...dateFilter,
        booking: propertyFilter.propertyId
          ? { propertyId: propertyFilter.propertyId }
          : {}
      }
    });

    const reviewsStats = {
      total: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0,
      distribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length
      }
    };

    // === MAINTENANCE ANALYTICS ===
    const maintenance = await prisma.maintenanceTask.findMany({
      where: {
        ...propertyFilter,
        ...dateFilter
      }
    });

    const maintenanceStats = {
      total: maintenance.length,
      pending: maintenance.filter(m => m.status === 'PENDING').length,
      inProgress: maintenance.filter(m => m.status === 'IN_PROGRESS').length,
      completed: maintenance.filter(m => m.status === 'COMPLETED').length,
      cancelled: maintenance.filter(m => m.status === 'CANCELLED').length,
      totalCost: maintenance
        .filter(m => m.cost)
        .reduce((sum, m) => sum + (m.cost || 0), 0),
      byPriority: {
        urgent: maintenance.filter(m => m.priority === 'URGENT').length,
        high: maintenance.filter(m => m.priority === 'HIGH').length,
        medium: maintenance.filter(m => m.priority === 'MEDIUM').length,
        low: maintenance.filter(m => m.priority === 'LOW').length
      }
    };

    // === CLEANINGS ANALYTICS ===
    const cleanings = await prisma.cleaning.findMany({
      where: {
        ...propertyFilter,
        scheduledDate: {
          gte: start,
          lte: end
        }
      }
    });

    const cleaningsStats = {
      total: cleanings.length,
      scheduled: cleanings.filter(c => c.status === 'SCHEDULED').length,
      inProgress: cleanings.filter(c => c.status === 'IN_PROGRESS').length,
      completed: cleanings.filter(c => c.status === 'COMPLETED').length,
      cancelled: cleanings.filter(c => c.status === 'CANCELLED').length,
      averageDuration: cleanings.filter(c => c.actualTime).length > 0
        ? cleanings
            .filter(c => c.actualTime)
            .reduce((sum, c) => sum + (c.actualTime || 0), 0) /
          cleanings.filter(c => c.actualTime).length
        : 0
    };

    // === OCCUPANCY RATE ===
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const bookedNights = bookings
      .filter(b => b.status !== 'CANCELLED')
      .reduce((sum, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        return sum + nights;
      }, 0);

    const occupancyRate = properties.length > 0 && totalDays > 0
      ? (bookedNights / (totalDays * properties.length)) * 100
      : 0;

    // === REVENUE TRENDS (par semaine) ===
    const weeklyRevenue: { week: string; revenue: number }[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekBookings = bookings.filter(b => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= weekStart && checkIn < weekEnd && b.status !== 'CANCELLED';
      });

      const weekRevenue = weekBookings.reduce((sum, b) => sum + b.totalPrice, 0);

      weeklyRevenue.push({
        week: weekStart.toISOString().split('T')[0],
        revenue: weekRevenue
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }

    // === RESPONSE ===
    return NextResponse.json(
      {
        success: true,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          days: totalDays
        },
        bookings: bookingsStats,
        properties: propertiesStats,
        reviews: reviewsStats,
        maintenance: maintenanceStats,
        cleanings: cleaningsStats,
        occupancy: {
          rate: Math.round(occupancyRate * 100) / 100,
          bookedNights,
          availableNights: totalDays * properties.length,
          properties: properties.length
        },
        trends: {
          weeklyRevenue
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      },
      { status: 500 }
    );
  }
}
