export interface CancelledMatchedBookingLike {
  id: number;
  status: string;
  specialRequests?: string;
}

export type CancelledResolutionPlan =
  | {
      kind: 'cancel';
      bookingId: number;
      cancelReason: string;
      preservedSpecialRequests: string;
    }
  | {
      kind: 'skip';
      reason: 'no_matching_booking';
    };

export function resolveCancellationPlan(params: {
  match?: CancelledMatchedBookingLike;
  notes: string;
}): CancelledResolutionPlan {
  const { match, notes } = params;

  if (!match || match.status === 'cancelled') {
    return {
      kind: 'skip',
      reason: 'no_matching_booking',
    };
  }

  return {
    kind: 'cancel',
    bookingId: match.id,
    cancelReason: `Annulé via Gmail — ${notes}`,
    preservedSpecialRequests: match.specialRequests || '',
  };
}
