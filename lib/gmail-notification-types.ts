export interface GmailNotificationProperty {
  name: string;
  address?: string;
  city?: string;
}

export interface BookingConfirmationNotificationPayload {
  type: 'booking_confirmation';
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  property: GmailNotificationProperty;
}

export interface CheckInReminderNotificationPayload {
  type: 'checkin_reminder';
  guestName: string;
  guestEmail: string;
  checkIn: string;
  property: GmailNotificationProperty;
}

export type GmailNotificationPayload = BookingConfirmationNotificationPayload | CheckInReminderNotificationPayload;
