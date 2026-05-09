export type GmailImportBookingType = 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';

export function buildSkippedTraceEntry(params: {
  messageId: string;
  bookingType: GmailImportBookingType;
  guestName?: string;
  receivedAt: string;
  action: 'skip_no_property' | 'skip_duplicate' | 'cancel_not_found' | 'checkout_not_found' | 'payout_skipped';
  reason: string;
}) {
  return {
    messageId: params.messageId,
    bookingType: params.bookingType,
    guestName: params.guestName || '—',
    status: 'skipped' as const,
    action: params.action,
    reason: params.reason,
    receivedAt: params.receivedAt,
  };
}
