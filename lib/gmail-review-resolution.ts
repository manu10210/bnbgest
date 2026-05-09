export interface ReviewBookingLike {
  guestName: string;
  reviewRating?: number;
  reviewComment?: string;
  receivedAt: string;
}

export interface ReviewMatchedBookingLike {
  id: number;
  status: string;
}

export interface ReviewPlan {
  rating: number;
  title: string;
  comment: string;
}

export type ReviewCompletionPlan =
  | {
      kind: 'complete';
      bookingId: number;
    }
  | {
      kind: 'skip';
      reason: 'no_matching_booking' | 'already_completed_or_cancelled';
    };

export function buildReviewPlan(params: {
  booking: ReviewBookingLike;
  formatDateLabel: (isoLikeDate: string) => string;
}): ReviewPlan {
  const { booking, formatDateLabel } = params;
  const rating = booking.reviewRating ?? 5;

  return {
    rating,
    title: `Avis ${rating}★ — ${booking.guestName}`,
    comment: booking.reviewComment || `Avis importé automatiquement depuis Gmail (${formatDateLabel(booking.receivedAt)}).`,
  };
}

export function resolveReviewCompletionPlan(
  matchedBooking?: ReviewMatchedBookingLike,
): ReviewCompletionPlan {
  if (!matchedBooking) {
    return { kind: 'skip', reason: 'no_matching_booking' };
  }

  if (matchedBooking.status === 'completed' || matchedBooking.status === 'cancelled') {
    return { kind: 'skip', reason: 'already_completed_or_cancelled' };
  }

  return {
    kind: 'complete',
    bookingId: matchedBooking.id,
  };
}
