export interface ModifiedBookingLike {
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface ModifiedMatchedBookingLike {
  id: number;
  totalPrice: number;
}

export interface ModifiedCreateBookingPayload {
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
}

export type ModifiedResolutionPlan =
  | {
      kind: 'update';
      bookingId: number;
      mergedTotalPrice: number;
      patchedSpecialRequests: string;
    }
  | {
      kind: 'create';
      bookingPayload: ModifiedCreateBookingPayload;
    };

export function buildModifiedSpecialRequests(notes: string): string {
  return `[MODIFIÉ] ${notes}`;
}

export function resolveModifiedPlan(params: {
  booking: ModifiedBookingLike;
  match?: ModifiedMatchedBookingLike;
  propertyId: number;
  guestId: number;
  notes: string;
}): ModifiedResolutionPlan {
  const { booking, match, propertyId, guestId, notes } = params;
  const patchedSpecialRequests = buildModifiedSpecialRequests(notes);

  if (match) {
    return {
      kind: 'update',
      bookingId: match.id,
      mergedTotalPrice: booking.totalPrice || match.totalPrice,
      patchedSpecialRequests,
    };
  }

  return {
    kind: 'create',
    bookingPayload: {
      propertyId,
      guestId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      totalPrice: booking.totalPrice || 0,
      status: 'confirmed',
      paymentStatus: booking.totalPrice > 0 ? 'paid' : 'pending',
      specialRequests: patchedSpecialRequests,
      guestInfo: {
        name: booking.guestName,
        email: booking.guestEmail || '',
        phone: booking.guestPhone || '',
      },
    },
  };
}
