export interface PayoutApplicationBookingLike {
  confirmationCode?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName?: string;
  guestEmail?: string;
  cleaningFee?: number;
  serviceFee?: number;
}

export function buildPayoutAttachBookingPatch(params: {
  payoutAmount: number;
  payoutDateStr: string;
  payoutSpecialRequests: string;
  booking: Pick<PayoutApplicationBookingLike, 'cleaningFee' | 'serviceFee'>;
}) {
  const { payoutAmount, payoutDateStr, payoutSpecialRequests, booking } = params;

  return {
    paymentStatus: 'paid' as const,
    hostPayout: payoutAmount,
    ...(booking.cleaningFee ? { cleaningFee: booking.cleaningFee } : {}),
    ...(booking.serviceFee ? { serviceFee: booking.serviceFee } : {}),
    payoutDate: payoutDateStr,
    payoutConfirmed: true,
    specialRequests: payoutSpecialRequests,
  };
}

export function buildPayoutAttachPersistPatch(params: {
  payoutAmount: number;
  payoutSpecialRequests: string;
  confirmationCode?: string;
}) {
  const { payoutAmount, payoutSpecialRequests, confirmationCode } = params;

  return {
    totalPrice: payoutAmount,
    specialRequests: payoutSpecialRequests.slice(0, 4900),
    paymentStatus: 'paid' as const,
    paymentAmount: payoutAmount,
    paymentTransactionId: confirmationCode,
  };
}

export function buildPayoutCreateBookingPayload(params: {
  targetPropertyId: number;
  payoutAmount: number;
  payoutDateStr: string;
  financialSpecialRequests: string;
  guestId: number;
  booking: PayoutApplicationBookingLike;
}) {
  const {
    targetPropertyId,
    payoutAmount,
    payoutDateStr,
    financialSpecialRequests,
    guestId,
    booking,
  } = params;

  return {
    propertyId: targetPropertyId,
    guestId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests || 1,
    totalPrice: payoutAmount,
    status: 'completed' as const,
    paymentStatus: 'paid' as const,
    hostPayout: payoutAmount,
    ...(booking.cleaningFee ? { cleaningFee: booking.cleaningFee } : {}),
    ...(booking.serviceFee ? { serviceFee: booking.serviceFee } : {}),
    payoutDate: payoutDateStr,
    payoutConfirmed: true,
    specialRequests: financialSpecialRequests,
    guestInfo: {
      name: booking.guestName || 'Airbnb Payout',
      email: booking.guestEmail || '',
      phone: '',
    },
  };
}
