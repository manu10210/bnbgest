export type GmailImportBookingType = 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';

export function registerLocalDbBookingLink<TPayload>(params: {
  bookingPayload: TPayload;
  dbBookingId: number;
  pushLocalBooking: (payload: TPayload) => number;
  localToDbBookingId: Map<number, number>;
}): number {
  const { bookingPayload, dbBookingId, pushLocalBooking, localToDbBookingId } = params;
  const localBookingId = pushLocalBooking(bookingPayload);
  localToDbBookingId.set(localBookingId, dbBookingId);
  return localBookingId;
}

export function buildBookingCreatedTraceEntry(params: {
  messageId: string;
  bookingType: GmailImportBookingType;
  guestName?: string;
  receivedAt: string;
  action: 'booking_created' | 'booking_created_from_modified' | 'booking_created_from_reminder' | 'payout_created_as_financial_booking';
}) {
  return {
    messageId: params.messageId,
    bookingType: params.bookingType,
    guestName: params.guestName || '—',
    status: 'success' as const,
    action: params.action,
    receivedAt: params.receivedAt,
  };
}
