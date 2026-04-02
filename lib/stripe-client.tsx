/**
 * Configuration Stripe côté client
 * Provider pour React Stripe.js
 */

'use client';

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { ReactNode, useMemo } from 'react';

// Charger Stripe avec la clé publique
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise || Promise.resolve(null);
}

/**
 * Provider Stripe Elements
 */
interface StripeElementsProviderProps {
  children: ReactNode;
  clientSecret?: string;
  amount?: number;
  currency?: string;
}

export function StripeElementsProvider({
  children,
  clientSecret,
  amount,
  currency = 'eur',
}: StripeElementsProviderProps) {
  const stripePromise = useMemo(() => getStripePromise(), []);

  const options = useMemo(() => {
    const baseOptions: any = {
      locale: 'fr',
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#FF385C',
          colorBackground: '#ffffff',
          colorText: '#222222',
          colorDanger: '#df1b41',
          fontFamily: 'system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '8px',
        },
      },
    };

    if (clientSecret) {
      baseOptions.clientSecret = clientSecret;
    }

    if (amount) {
      baseOptions.amount = Math.round(amount * 100);
      baseOptions.currency = currency;
    }

    return baseOptions;
  }, [clientSecret, amount, currency]);

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}

/**
 * Thème dark pour Stripe Elements
 */
export const darkTheme = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#FF385C',
    colorBackground: '#1a1a2e',
    colorText: '#ffffff',
    colorDanger: '#ff6b6b',
    fontFamily: 'system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
};

/**
 * Configuration des options de paiement
 */
export const paymentElementOptions = {
  layout: {
    type: 'tabs' as const,
    defaultCollapsed: false,
  },
  business: {
    name: 'BNBGest',
  },
};
