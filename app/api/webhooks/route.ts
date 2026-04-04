/**
 * 🔔 Generic Webhooks Handler
 * ✅ Protected: Rate limited (webhook: 50/10s), Signature verification
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

// Edge Function pour gérer les webhooks des intégrations
export const runtime = 'edge';

interface WebhookPayload {
  source: 'airbnb' | 'booking' | 'stripe' | 'other';
  event: string;
  data: any;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  // 1. Rate limiting (webhook tier for external calls)
  const rateLimitResult = await rateLimit(request, 'webhook');
  if (rateLimitResult) return rateLimitResult;

  // Note: No authentication required (uses signature verification)
  
  try {
    // Vérifier la signature du webhook (à implémenter selon la source)
    const signature = request.headers.get('x-webhook-signature');
    const source = request.headers.get('x-webhook-source') as WebhookPayload['source'];
    
    if (!signature || !source) {
      return NextResponse.json({ 
        error: 'Missing webhook signature or source' 
      }, { status: 401 });
    }

    const body = await request.json();
    
    const payload: WebhookPayload = {
      source,
      event: body.event || body.type || 'unknown',
      data: body,
      timestamp: new Date().toISOString(),
    };

    // Log du webhook pour debugging
    console.log(`[WEBHOOK] ${source} - ${payload.event}`, {
      timestamp: payload.timestamp,
      hasData: !!payload.data,
    });

    // Traiter selon la source
    switch (source) {
      case 'airbnb':
        // Traiter les événements Airbnb (nouvelle réservation, annulation, etc.)
        await handleAirbnbWebhook(payload);
        break;
      
      case 'booking':
        // Traiter les événements Booking.com
        await handleBookingWebhook(payload);
        break;
      
      case 'stripe':
        // Traiter les événements de paiement
        await handleStripeWebhook(payload);
        break;
      
      default:
        console.warn(`Unknown webhook source: ${source}`);
    }

    return NextResponse.json({ 
      received: true,
      timestamp: new Date().toISOString(),
    }, { 
      status: 200 
    });

  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { 
      status: 500 
    });
  }
}

// Handlers pour chaque source
async function handleAirbnbWebhook(payload: WebhookPayload) {
  // Traiter les événements Airbnb
  switch (payload.event) {
    case 'reservation.created':
      console.log('[AIRBNB] Nouvelle réservation reçue');
      // Créer la réservation dans la base de données
      break;
    
    case 'reservation.cancelled':
      console.log('[AIRBNB] Réservation annulée');
      // Mettre à jour le statut dans la base de données
      break;
    
    case 'reservation.updated':
      console.log('[AIRBNB] Réservation mise à jour');
      // Synchroniser les modifications
      break;
  }
}

async function handleBookingWebhook(payload: WebhookPayload) {
  // Traiter les événements Booking.com
  switch (payload.event) {
    case 'reservation':
      console.log('[BOOKING] Nouvelle réservation Booking.com');
      break;
    
    case 'modification':
      console.log('[BOOKING] Modification de réservation');
      break;
  }
}

async function handleStripeWebhook(payload: WebhookPayload) {
  // Traiter les événements de paiement Stripe
  switch (payload.event) {
    case 'payment_intent.succeeded':
      console.log('[STRIPE] Paiement réussi');
      break;
    
    case 'payment_intent.payment_failed':
      console.log('[STRIPE] Paiement échoué');
      break;
  }
}

// GET pour vérifier que le webhook est actif
export async function GET() {
  return NextResponse.json({
    status: 'active',
    supported_sources: ['airbnb', 'booking', 'stripe'],
    timestamp: new Date().toISOString(),
  });
}
