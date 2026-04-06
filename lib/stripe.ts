/**
 * Configuration Stripe pour BNBGest
 * Gestion des paiements côté serveur
 */

import Stripe from 'stripe';

// Initialisation de Stripe (côté serveur uniquement)
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
      typescript: true,
    })
  : null;

/**
 * Vérifie si Stripe est configuré
 */
export function isStripeConfigured(): boolean {
  return !!stripe && !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Crée un Payment Intent pour une réservation
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'eur',
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error('❌ Stripe non configuré - STRIPE_SECRET_KEY manquante');
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata,
    });

    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur création Payment Intent:', error.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur création Payment Intent:', message);
    throw new Error(message);
  }
}

/**
 * Récupère un Payment Intent
 */
export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error('❌ Stripe non configuré');
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur récupération Payment Intent:', error.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur récupération Payment Intent:', message);
    throw new Error(message);
  }
}

/**
 * Annule un Payment Intent
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  if (!stripe) {
    console.error('❌ Stripe non configuré');
    return null;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur annulation Payment Intent:', error.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur annulation Payment Intent:', message);
    throw new Error(message);
  }
}

/**
 * Crée un Checkout Session pour paiement complet
 */
export async function createCheckoutSession(params: {
  bookingId: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  propertyName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('❌ Stripe non configuré');
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: params.currency || 'eur',
            product_data: {
              name: `Réservation - ${params.propertyName}`,
              description: `ID Réservation: ${params.bookingId}`,
            },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        bookingId: params.bookingId,
      },
    });

    return session;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur création Checkout Session:', error.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur création Checkout Session:', message);
    throw new Error(message);
  }
}

/**
 * Crée un remboursement
 */
export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
): Promise<Stripe.Refund | null> {
  if (!stripe) {
    console.error('❌ Stripe non configuré');
    return null;
  }

  try {
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await stripe.refunds.create(refundParams);
    return refund;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur création remboursement:', error.message);
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur création remboursement:', message);
    throw new Error(message);
  }
}

/**
 * Liste les paiements d'un client
 */
export async function listCustomerPayments(
  customerEmail: string,
  limit: number = 10
): Promise<Stripe.PaymentIntent[]> {
  if (!stripe) {
    console.error('❌ Stripe non configuré');
    return [];
  }

  try {
    const paymentIntents = await stripe.paymentIntents.list({
      limit,
    });

    // Filtrer par email dans les métadonnées si nécessaire
    return paymentIntents.data;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur liste paiements:', error.message);
      return [];
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur liste paiements:', message);
    return [];
  }
}

/**
 * Vérifie la signature du webhook Stripe
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Stripe webhook non configuré');
    return null;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('❌ Erreur vérification webhook:', error.message);
      return null;
    }
    const message = error instanceof Error ? error.message : 'Stripe error';
    console.error('❌ Erreur vérification webhook:', message);
    return null;
  }
}
