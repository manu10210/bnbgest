/**
 * 📅 Airbnb Reservations Sync
 * Synchroniser les réservations Airbnb
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient, convertAirbnbReservationToBNBGest } from '@/lib/airbnb-api';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // 1. Rate limiting
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Récupérer les tokens depuis la DB
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb not connected. Please connect first.'
      }, { status: 401 });
    }

    // Créer le client et définir les tokens
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Airbnb client'
      }, { status: 500 });
    }

    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'reservations:read',
    });

    // Récupérer les réservations des 6 derniers mois
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12);

    const { reservations, total } = await client.getReservations({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Synchroniser chaque réservation
    for (const reservation of reservations) {
      try {
        // Trouver la propriété correspondante
        const property = await prisma.property.findFirst({
          where: { externalId: reservation.listingId }
        });

        if (!property) {
          console.warn(`Property not found for listing ${reservation.listingId}`);
          continue;
        }

        // Convertir la réservation
        const bookingData = convertAirbnbReservationToBNBGest(reservation);

        // Chercher si la réservation existe déjà
        const existingBooking = await prisma.booking.findFirst({
          where: { externalId: reservation.id }
        });

        if (existingBooking) {
          // Mettre à jour
          await prisma.booking.update({
            where: { id: existingBooking.id },
            data: {
              ...bookingData,
              propertyId: property.id,
            }
          });
          updatedCount++;
        } else {
          // Créer
          await prisma.booking.create({
            data: {
              ...bookingData,
              propertyId: property.id,
            }
          });
          createdCount++;
        }

        syncedCount++;
      } catch (err) {
        console.error(`Error syncing reservation ${reservation.id}:`, err);
      }
    }

    // Mettre à jour les paramètres d'intégration
    await prisma.integrationSetting.update({
      where: { platform: 'airbnb' },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'success',
      }
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} reservations from Airbnb`,
      stats: {
        total,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount,
      }
    });

  } catch (error) {
    console.error('Airbnb reservations sync error:', error);
    
    // Mettre à jour le statut d'erreur
    await prisma.integrationSetting.update({
      where: { platform: 'airbnb' },
      data: {
        syncStatus: 'error',
        lastSyncAt: new Date(),
      }
    }).catch(console.error);

    return NextResponse.json({
      success: false,
      error: 'Failed to sync reservations',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId, action, data } = body;

    if (!reservationId || !action) {
      return NextResponse.json({
        success: false,
        error: 'reservationId and action are required'
      }, { status: 400 });
    }

    // Récupérer les tokens
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb not connected'
      }, { status: 401 });
    }

    // Créer le client
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Airbnb client'
      }, { status: 500 });
    }

    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'reservations:write',
    });

    // Exécuter l'action
    let result;
    switch (action) {
      case 'accept':
        result = await client.acceptReservation(reservationId, data?.message);
        break;
      case 'decline':
        result = await client.declineReservation(reservationId, data?.reason, data?.message);
        break;
      case 'cancel':
        result = await client.cancelReservation(reservationId, data?.reason);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

    // Mettre à jour la réservation en DB
    const bookingData = convertAirbnbReservationToBNBGest(result);
    await prisma.booking.updateMany({
      where: { externalId: reservationId },
      data: bookingData
    });

    return NextResponse.json({
      success: true,
      message: `Reservation ${action}ed successfully`,
      reservation: result
    });

  } catch (error) {
    console.error('Airbnb reservation action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action',
      details: (error as Error).message
    }, { status: 500 });
  }
}
