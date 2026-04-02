/**
 * Composant - Formulaire de paiement Stripe
 * Utilise PaymentElement pour accepter les paiements
 */

'use client';

import { useState, FormEvent } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { motion } from 'framer-motion';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { AnimatedButton } from '@/components/animations';

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  bookingId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripePaymentForm({
  amount,
  currency = 'EUR',
  bookingId,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/client?payment=success&bookingId=${bookingId}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Une erreur est survenue');
        onError?.(error.message || 'Erreur de paiement');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setIsSuccess(true);
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue');
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Paiement réussi !
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Votre réservation a été confirmée
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-[#FF385C]/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#FF385C]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">
              Paiement sécurisé
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Propulsé par Stripe
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {amount.toFixed(2)} {currency}
          </p>
        </div>
      </div>

      {/* Payment Element */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
        <PaymentElement />
      </div>

      {/* Error Message */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Erreur de paiement
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errorMessage}
            </p>
          </div>
        </motion.div>
      )}

      {/* Security Info */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Lock className="w-4 h-4" />
        <span>Vos informations de paiement sont sécurisées et cryptées</span>
      </div>

      {/* Submit Button */}
      <AnimatedButton
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
          isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:shadow-lg hover:shadow-[#FF385C]/30'
        }`}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Traitement en cours...</span>
          </div>
        ) : (
          <span>Payer {amount.toFixed(2)} {currency}</span>
        )}
      </AnimatedButton>

      {/* Terms */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        En confirmant ce paiement, vous acceptez nos{' '}
        <a href="/terms" className="text-[#FF385C] hover:underline">
          conditions générales
        </a>
      </p>
    </form>
  );
}
