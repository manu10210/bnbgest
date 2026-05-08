import {
  buildPayoutAttachmentSpecialRequests,
  buildPayoutFinancialBookingSpecialRequests,
} from './gmail-booking-notes';

export interface PayoutResolutionBookingLike {
  hostPayout?: number;
  totalPrice: number;
  payoutDate?: string;
  receivedAt: string;
  confirmationCode?: string;
  propertyName?: string;
}

export interface PayoutResolutionMatchedBookingLike {
  id: number;
  specialRequests?: string;
}

export type PayoutResolutionPlan =
  | {
      kind: 'attach';
      bookingId: number;
      payoutAmount: number;
      payoutDateStr: string;
      payoutSpecialRequests: string;
    }
  | {
      kind: 'create';
      targetPropertyId: number;
      payoutAmount: number;
      payoutDateStr: string;
      financialSpecialRequests: string;
    }
  | {
      kind: 'skip';
      reason: 'missing_payout_amount';
    }
  | {
      kind: 'none';
    };

export interface ResolvePayoutPlanParams<TMatchedBooking extends PayoutResolutionMatchedBookingLike> {
  booking: PayoutResolutionBookingLike;
  matchedBooking?: TMatchedBooking;
  fallbackPropertyId?: number;
  formatDateLabel: (isoLikeDate: string) => string;
}

export function resolvePayoutPlan<TMatchedBooking extends PayoutResolutionMatchedBookingLike>(
  params: ResolvePayoutPlanParams<TMatchedBooking>,
): PayoutResolutionPlan {
  const { booking, matchedBooking, fallbackPropertyId, formatDateLabel } = params;

  const payoutAmount = booking.hostPayout || booking.totalPrice || 0;
  const payoutDateStr = booking.payoutDate || booking.receivedAt?.split('T')[0] || new Date().toISOString().split('T')[0];

  if (matchedBooking) {
    return {
      kind: 'attach',
      bookingId: matchedBooking.id,
      payoutAmount,
      payoutDateStr,
      payoutSpecialRequests: buildPayoutAttachmentSpecialRequests(
        matchedBooking.specialRequests,
        payoutAmount,
        payoutDateStr,
      ),
    };
  }

  if (payoutAmount > 0) {
    if (!fallbackPropertyId) {
      return { kind: 'none' };
    }

    return {
      kind: 'create',
      targetPropertyId: fallbackPropertyId,
      payoutAmount,
      payoutDateStr,
      financialSpecialRequests: buildPayoutFinancialBookingSpecialRequests(
        {
          confirmationCode: booking.confirmationCode,
          receivedAt: booking.receivedAt,
          propertyName: booking.propertyName,
        },
        payoutAmount,
        formatDateLabel,
      ),
    };
  }

  return {
    kind: 'skip',
    reason: 'missing_payout_amount',
  };
}
