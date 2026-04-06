/**
 * Composant - Bouton Checkout Stripe
 * Redirige vers Stripe Checkout pour paiement
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, AlertCircle } from 'lucide-react';
import { AnimatedButton } from '@/components/animations';
import { toast } from 'sonner';

interface StripeCheckoutButtonProps {
  bookingId: string | number;
  amount: number;
  currency?: string;
  propertyName: string;
  disabled?: boolean;
  className?: string;
}

export function StripeCheckoutButton({
  bookingId,
  amount,
  currency = 'EUR',
  propertyName,
  disabled = false,
  className = '',
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingId.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session');
      }

      if (data.url) {
        // Rediriger vers Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non disponible');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('Erreur checkout:', error);
      setError(message);
      toast.error('Erreur de paiement', {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <AnimatedButton
        onClick={handleCheckout}
        disabled={disabled || isLoading}
        className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
          disabled || isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:shadow-lg hover:shadow-[#FF385C]/30'
        } ${className}`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Redirection...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <CreditCard className="w-5 h-5" />
            <span>Payer {amount.toFixed(2)} {currency}</span>
            <ExternalLink className="w-4 h-4" />
          </div>
        )}
      </AnimatedButton>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-[#635BFF] flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">S</span>
          </div>
          <span>Powered by Stripe</span>
        </div>
        <span>•</span>
        <span>Paiement sécurisé</span>
      </div>
    </div>
  );
}
