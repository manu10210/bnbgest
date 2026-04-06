/**
 * API Route - Créer un Payment Intent
 * POST /api/stripe/create-payment-intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent, isStripeConfigured } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Vérifier la configuration Stripe
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { 
          error: 'Stripe non configuré', 
          message: 'Configurez STRIPE_SECRET_KEY dans les variables d\'environnement' 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { bookingId, amount, currency = 'eur' } = body;

    // Validation
    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId requis' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Montant invalide' },
        { status: 400 }
      );
    }

    // Récupérer la réservation
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        property: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Réservation non trouvée' },
        { status: 404 }
      );
    }

    // Créer le Payment Intent
    const paymentIntent = await createPaymentIntent(amount, currency, {
      bookingId: booking.id.toString(),
      propertyId: booking.propertyId.toString(),
      propertyName: booking.property.name,
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
    });

    if (!paymentIntent) {
      return NextResponse.json(
        { error: 'Erreur création Payment Intent' },
        { status: 500 }
      );
    }

    console.log(`✅ Payment Intent créé: ${paymentIntent.id} pour ${amount}€`);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('❌ Erreur création Payment Intent:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Erreur serveur', message },
      { status: 500 }
    );
  }
}
