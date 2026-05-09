import type { GmailImportBookingType } from './gmail-import-types';

export interface PersistFailureTraceParams {
  messageId: string;
  bookingType: GmailImportBookingType;
  guestName?: string;
  receivedAt: string;
  dbError?: string;
  fallbackReason: string;
}

export function buildPersistFailureTraceEntry(params: PersistFailureTraceParams) {
  return {
    messageId: params.messageId,
    bookingType: params.bookingType,
    guestName: params.guestName || '—',
    status: 'error' as const,
    action: 'booking_persist_failed',
    reason: params.dbError || params.fallbackReason,
    receivedAt: params.receivedAt,
  };
}
