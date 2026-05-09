export interface NewResolutionBookingLike {
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  confirmationCode?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface NewResolutionPlan {
  bookingPayload: {
    propertyId: number;
    guestId: number;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number;
    status: 'confirmed';
    paymentStatus: 'paid' | 'pending';
    specialRequests: string;
    guestInfo: {
      name: string;
      email: string;
      phone: string;
    };
    paymentInfo?: {
      method: 'airbnb';
      transactionId: string;
      amount: number;
    };
  };
}

export interface ExistingGuestBookingStatsLike {
  totalBookings?: number;
  totalSpent?: number;
}

export function resolveNewBookingPlan(params: {
  booking: NewResolutionBookingLike;
  propertyId: number;
  guestId: number;
  notes: string;
}): NewResolutionPlan {
  const { booking, propertyId, guestId, notes } = params;

  return {
    bookingPayload: {
      propertyId,
      guestId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalPrice: booking.totalPrice || 0,
      status: 'confirmed',
      paymentStatus: booking.totalPrice > 0 ? 'paid' : 'pending',
      specialRequests: notes,
      guestInfo: {
        name: booking.guestName,
        email: booking.guestEmail || '',
        phone: booking.guestPhone || '',
      },
      ...(booking.totalPrice > 0 && booking.confirmationCode
        ? {
            paymentInfo: {
              method: 'airbnb' as const,
              transactionId: booking.confirmationCode,
              amount: booking.totalPrice,
            },
          }
        : {}),
    },
  };
}

export function deriveGuestPostNewBookingUpdates(params: {
  existingGuest: ExistingGuestBookingStatsLike;
  bookingTotalPrice: number;
  bookingCheckIn: string;
}) {
  const { existingGuest, bookingTotalPrice, bookingCheckIn } = params;

  return {
    totalBookings: (existingGuest.totalBookings || 0) + 1,
    totalSpent: (existingGuest.totalSpent || 0) + (bookingTotalPrice || 0),
    lastBooking: bookingCheckIn,
  };
}
