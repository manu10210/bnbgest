/**
 * 🔔 Airbnb Webhooks Handler
 * Recevoir et traiter les événements Airbnb en temps réel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient, convertAirbnbReservationToBNBGest } from '@/lib/airbnb-api';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('X-Airbnb-Signature') || '';
    
    // Récupérer le secret du webhook
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.config) {
      return NextResponse.json({
        success: false,
        error: 'Webhook not configured'
      }, { status: 400 });
    }

    const webhookSecret = (settings.config as any).webhookSecret;
    if (!webhookSecret) {
      return NextResponse.json({
        success: false,
        error: 'Webhook secret not configured'
      }, { status: 400 });
    }

    // Vérifier la signature
    const client = createAirbnbClient();
    if (!client || !client.verifyWebhookSignature(body, signature, webhookSecret)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 401 });
    }

    // Parser le body
    const event = JSON.parse(body);

    console.log(`📨 Airbnb webhook received: ${event.type}`);

    // Traiter l'événement
    switch (event.type) {
      case 'reservation.created':
      case 'reservation.updated':
        await handleReservationEvent(event.data);
        break;

      case 'reservation.cancelled':
        await handleReservationCancellation(event.data);
        break;

      case 'listing.updated':
        await handleListingUpdate(event.data);
        break;

      case 'message.created':
        await handleNewMessage(event.data);
        break;

      case 'review.created':
        await handleNewReview(event.data);
        break;

      default:
        console.log(`Unknown event type: ${event.type}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Airbnb webhook error:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      details: (error as Error).message
    }, { status: 500 });
  }
}

// ==========================================================================
// Event Handlers
// ==========================================================================

async function handleReservationEvent(reservation: any) {
  try {
    // Trouver la propriété
    const property = await prisma.property.findFirst({
      where: { externalId: reservation.listing_id }
    });

    if (!property) {
      console.warn(`Property not found for listing ${reservation.listing_id}`);
      return;
    }

    // Convertir la réservation
    const bookingData = convertAirbnbReservationToBNBGest(reservation);

    // Chercher la réservation existante
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
      console.log(`✅ Reservation ${reservation.id} updated`);
    } else {
      // Créer
      await prisma.booking.create({
        data: {
          ...bookingData,
          propertyId: property.id,
        }
      });
      console.log(`✅ Reservation ${reservation.id} created`);
    }

  } catch (error) {
    console.error('Error handling reservation event:', error);
  }
}

async function handleReservationCancellation(reservation: any) {
  try {
    await prisma.booking.updateMany({
      where: { externalId: reservation.id },
      data: {
        status: 'CANCELLED',
        metadata: {
          ...(reservation.metadata || {}),
          cancelledAt: new Date().toISOString(),
          cancellationReason: reservation.cancellation_reason,
        }
      }
    });

    console.log(`✅ Reservation ${reservation.id} cancelled`);
  } catch (error) {
    console.error('Error handling cancellation:', error);
  }
}

async function handleListingUpdate(listing: any) {
  try {
    const propertyData = {
      name: listing.name,
      description: listing.description,
      pricePerNight: listing.price,
      status: listing.status === 'active' ? 'ACTIVE' as const : 'INACTIVE' as const,
    };

    await prisma.property.updateMany({
      where: { externalId: listing.id },
      data: propertyData
    });

    console.log(`✅ Listing ${listing.id} updated`);
  } catch (error) {
    console.error('Error handling listing update:', error);
  }
}

async function handleNewMessage(message: any) {
  console.log(`📩 New message from ${message.sender_name}: ${message.content}`);
  // TODO: Implémenter la gestion des messages
  // - Sauvegarder en base
  // - Envoyer notification email
  // - Créer alerte dans l'app
}

async function handleNewReview(review: any) {
  console.log(`⭐ New review: ${review.rating}/5 - ${review.comment}`);
  // TODO: Implémenter la gestion des avis
  // - Sauvegarder en base
  // - Envoyer notification
  // - Mettre à jour statistiques
}
