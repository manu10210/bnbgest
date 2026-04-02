/**
 * API Route - Checkout Session Stripe
 * POST /api/stripe/create-checkout-session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, isStripeConfigured } from '@/lib/stripe';
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
    const { bookingId } = body;

    // Validation
    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId requis' },
        { status: 400 }
      );
    }

    // Récupérer la réservation
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
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

    // URLs de retour
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/client?payment=success&bookingId=${bookingId}`;
    const cancelUrl = `${baseUrl}/client?payment=cancelled&bookingId=${bookingId}`;

    // Créer la session Checkout
    const session = await createCheckoutSession({
      bookingId: booking.id.toString(),
      amount: booking.totalPrice,
      currency: 'eur',
      customerEmail: booking.guestEmail,
      propertyName: booking.property.name,
      successUrl,
      cancelUrl,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Erreur création Checkout Session' },
        { status: 500 }
      );
    }

    console.log(`✅ Checkout Session créée: ${session.id} pour ${booking.totalPrice}€`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('❌ Erreur création Checkout Session:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', message: error.message },
      { status: 500 }
    );
  }
}
