export interface ReminderBookingLike {
  guestName: string;
  confirmationCode?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalPrice: number;
  checkInTime?: string;
  checkOutTime?: string;
  nightlyRate?: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxAmount?: number;
}

export interface ReminderMatchedBookingLike {
  checkInTime?: string;
  checkOutTime?: string;
  guests?: number;
  totalPrice?: number;
  nightlyRate?: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxAmount?: number;
}

export interface ReminderEmailPayload {
  type: 'checkin_reminder';
  guestName: string;
  guestEmail: string;
  checkIn: string;
  property: {
    name: string;
  };
}

export function deriveReminderEnrichmentUpdates(
  reminder: ReminderBookingLike,
  matchedBooking: ReminderMatchedBookingLike,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  if (reminder.checkInTime && !matchedBooking.checkInTime) updates.checkInTime = reminder.checkInTime;
  if (reminder.checkOutTime && !matchedBooking.checkOutTime) updates.checkOutTime = reminder.checkOutTime;
  if (reminder.guests > 0 && !matchedBooking.guests) updates.guests = reminder.guests;
  if (reminder.totalPrice > 0 && !matchedBooking.totalPrice) updates.totalPrice = reminder.totalPrice;
  if (reminder.nightlyRate && !matchedBooking.nightlyRate) updates.nightlyRate = reminder.nightlyRate;
  if (reminder.cleaningFee && !matchedBooking.cleaningFee) updates.cleaningFee = reminder.cleaningFee;
  if (reminder.serviceFee && !matchedBooking.serviceFee) updates.serviceFee = reminder.serviceFee;
  if (reminder.taxAmount && !matchedBooking.taxAmount) updates.taxAmount = reminder.taxAmount;

  return updates;
}

export function buildReminderPersistPatch(updates: Record<string, unknown>): {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalPrice?: number;
  status: 'CONFIRMED';
} {
  return {
    ...(typeof updates.checkIn === 'string' ? { checkIn: updates.checkIn } : {}),
    ...(typeof updates.checkOut === 'string' ? { checkOut: updates.checkOut } : {}),
    ...(typeof updates.guests === 'number' ? { guests: updates.guests } : {}),
    ...(typeof updates.totalPrice === 'number' ? { totalPrice: updates.totalPrice } : {}),
    status: 'CONFIRMED',
  };
}

export function buildReminderPrepTask(params: {
  reminder: ReminderBookingLike;
  propertyId: number;
  formatDateLabel: (isoLikeDate: string) => string;
}) {
  const { reminder, propertyId, formatDateLabel } = params;

  const prepDate = new Date(reminder.checkIn);
  prepDate.setDate(prepDate.getDate() - 1);
  const prepDateStr = prepDate.toISOString().split('T')[0];

  return {
    propertyId,
    title: `🔍 Préparation J-1 — ${reminder.guestName}`,
    description: [
      `Vérification avant arrivée le ${formatDateLabel(reminder.checkIn)} (${reminder.nights} nuit${reminder.nights > 1 ? 's' : ''}).`,
      reminder.guests > 1 ? `${reminder.guests} voyageurs.` : '1 voyageur.',
      reminder.checkInTime ? `Heure d'arrivée prévue : ${reminder.checkInTime}.` : '',
      reminder.checkOutTime ? `Heure de départ prévue : ${reminder.checkOutTime}.` : '',
      reminder.confirmationCode ? `Réservation : ${reminder.confirmationCode}.` : '',
      "Vérifier : linge propre, ménage, équipements, codes d'accès.",
    ].filter(Boolean).join(' '),
    priority: 'medium' as const,
    status: 'pending' as const,
    category: 'inspection' as const,
    estimatedCost: 0,
    scheduledDate: prepDateStr,
  };
}

export function buildCheckInReminderEmailPayload(params: {
  reminder: Pick<ReminderBookingLike, 'guestName' | 'checkIn'> & { guestEmail?: string };
  propertyName: string;
}): ReminderEmailPayload | undefined {
  const { reminder, propertyName } = params;
  if (!reminder.guestEmail) return undefined;

  return {
    type: 'checkin_reminder',
    guestName: reminder.guestName,
    guestEmail: reminder.guestEmail,
    checkIn: reminder.checkIn,
    property: { name: propertyName },
  };
}
