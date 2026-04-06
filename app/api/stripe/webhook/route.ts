/**
 * API Route - Webhook Stripe
 * POST /api/stripe/webhook
 * Gère les événements Stripe (paiement réussi, remboursement, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 400 }
      );
    }

    // Vérifier la signature du webhook
    const event = verifyWebhookSignature(body, signature);

    if (!event) {
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 400 }
      );
    }

    console.log(`📨 Webhook Stripe reçu: ${event.type}`);

    // Traiter les différents types d'événements
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleRefund(event.data.object as Stripe.Charge);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`⚠️ Événement non géré: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Erreur webhook Stripe:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Erreur serveur', message },
      { status: 500 }
    );
  }
}

/**
 * Paiement réussi
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;

    if (!bookingId) {
      console.error('❌ bookingId manquant dans metadata');
      return;
    }

    // Mettre à jour la réservation
    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        status: 'CONFIRMED',
      },
    });

    // Créer une entrée de paiement
    await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        method: 'STRIPE',
        status: 'COMPLETED',
        transactionId: paymentIntent.id,
        paidAt: new Date(),
      },
    });

    console.log(`✅ Paiement réussi pour réservation ${bookingId}: ${paymentIntent.amount / 100}€`);
  } catch (error) {
    console.error('❌ Erreur traitement paiement réussi:', error);
  }
}

/**
 * Paiement échoué
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const bookingId = paymentIntent.metadata.bookingId;

    if (!bookingId) {
      console.error('❌ bookingId manquant dans metadata');
      return;
    }

    // Mettre à jour le statut
    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        status: 'PENDING',
      },
    });

    console.log(`❌ Paiement échoué pour réservation ${bookingId}`);
  } catch (error) {
    console.error('❌ Erreur traitement paiement échoué:', error);
  }
}

/**
 * Remboursement
 */
async function handleRefund(charge: Stripe.Charge) {
  try {
    // Trouver le paiement via transaction ID
    const payment = await prisma.payment.findFirst({
      where: {
        transactionId: charge.payment_intent as string,
      },
    });

    if (!payment) {
      console.error('❌ Paiement non trouvé pour remboursement');
      return;
    }

    // Mettre à jour le paiement
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'REFUNDED',
      },
    });

    // Mettre à jour la réservation
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`✅ Remboursement traité pour réservation ${payment.bookingId}`);
  } catch (error) {
    console.error('❌ Erreur traitement remboursement:', error);
  }
}

/**
 * Checkout Session complété
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error('❌ bookingId manquant dans metadata');
      return;
    }

    // Mettre à jour la réservation
    await prisma.booking.update({
      where: { id: parseInt(bookingId) },
      data: {
        status: 'CONFIRMED',
      },
    });

    // Créer une entrée de paiement
    await prisma.payment.create({
      data: {
        bookingId: parseInt(bookingId),
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'EUR',
        method: 'STRIPE',
        status: 'COMPLETED',
        transactionId: session.payment_intent as string,
        paidAt: new Date(),
      },
    });

    console.log(`✅ Checkout complété pour réservation ${bookingId}`);
  } catch (error) {
    console.error('❌ Erreur traitement checkout complété:', error);
  }
}
