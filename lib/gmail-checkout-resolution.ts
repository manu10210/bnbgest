export interface CheckoutBookingLike {
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  hostPayout?: number;
  totalPrice: number;
  cleaningFee?: number;
  currency?: string;
  confirmationCode?: string;
}

export interface CheckoutMatchedBookingLike {
  id: number;
  status: string;
  totalPrice: number;
  specialRequests?: string;
}

export type CheckoutResolution =
  | {
      kind: 'complete';
      checkoutSpecialRequests: string;
      checkoutTotalPrice: number;
    }
  | {
      kind: 'skip';
      reason: 'no_matching_booking' | 'already_completed_or_cancelled';
    };

export function resolveCheckoutCompletion(
  booking: CheckoutBookingLike,
  matchedBooking?: CheckoutMatchedBookingLike,
): CheckoutResolution {
  if (!matchedBooking) {
    return { kind: 'skip', reason: 'no_matching_booking' };
  }

  if (matchedBooking.status === 'completed' || matchedBooking.status === 'cancelled') {
    return { kind: 'skip', reason: 'already_completed_or_cancelled' };
  }

  const checkoutSpecialRequests = `${matchedBooking.specialRequests || ''} | [TERMINÉ] Départ confirmé Gmail`;
  const checkoutTotalPrice = booking.hostPayout || booking.totalPrice || matchedBooking.totalPrice;

  return {
    kind: 'complete',
    checkoutSpecialRequests,
    checkoutTotalPrice,
  };
}

export function buildCheckoutCleaningTask(params: {
  booking: CheckoutBookingLike;
  propertyId: number;
  notes: string;
  formatDateLabel: (isoLikeDate: string) => string;
}) {
  const { booking, propertyId, notes, formatDateLabel } = params;

  return {
    propertyId,
    title: `🧹 Ménage post-départ — ${booking.guestName}`,
    description: [
      `Nettoyage complet après séjour du ${formatDateLabel(booking.checkIn)} au ${formatDateLabel(booking.checkOut)}.`,
      booking.guests > 1 ? `${booking.guests} voyageurs.` : '',
      booking.cleaningFee ? `Frais ménage prévus : ${booking.cleaningFee}${booking.currency === 'EUR' ? '€' : booking.currency}.` : '',
      notes,
    ].filter(Boolean).join(' '),
    priority: 'high' as const,
    status: 'pending' as const,
    category: 'cleaning' as const,
    estimatedCost: booking.cleaningFee || 0,
    scheduledDate: booking.checkOut,
  };
}

export interface CheckoutInventoryItemLike {
  id: number;
  propertyId: number;
  category: string;
  quantity: number;
  minimumQuantity: number;
}

export interface CheckoutInventoryUpdatePlan {
  itemId: number;
  quantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export function deriveCheckoutInventoryUpdatePlan(
  inventoryItems: CheckoutInventoryItemLike[],
  propertyId: number,
): CheckoutInventoryUpdatePlan[] {
  return inventoryItems
    .filter((item) => (
      item.propertyId === propertyId
      && (['cleaning', 'bedding', 'towels'] as string[]).includes(item.category)
      && item.quantity > 0
    ))
    .map((item) => {
      const newQty = Math.max(0, item.quantity - 1);
      return {
        itemId: item.id,
        quantity: newQty,
        status: newQty === 0 ? 'out_of_stock' : newQty <= item.minimumQuantity ? 'low_stock' : 'in_stock',
      };
    });
}
