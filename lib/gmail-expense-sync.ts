export interface AirbnbExpenseSyncBooking {
  bookingType: string;
  totalPrice: number;
  hostPayout?: number;
  serviceFee?: number;
  taxAmount?: number;
  guestName: string;
  currency?: string;
  payoutDate?: string;
  checkIn: string;
  confirmationCode?: string;
}

export interface AirbnbExpenseSyncParams {
  booking: AirbnbExpenseSyncBooking;
  propertyId?: number;
}

function postExpense(payload: Record<string, unknown>) {
  fetch('/api/expenses', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(console.error);
}

export function syncAirbnbExpensesFromImport(params: AirbnbExpenseSyncParams): number {
  const { booking, propertyId } = params;

  const isSupportedType = booking.bookingType === 'new' || booking.bookingType === 'payout';
  const hasFinancialSignal = booking.totalPrice > 0 || !!(booking.hostPayout && booking.hostPayout > 0);

  if (!isSupportedType || !hasFinancialSignal) {
    return 0;
  }

  let createdCount = 0;
  const expenseDate = booking.bookingType === 'payout' && booking.payoutDate ? booking.payoutDate : booking.checkIn;
  const currency = booking.currency || 'EUR';
  const notes = booking.confirmationCode ? `Réservation: ${booking.confirmationCode}` : '';

  // Frais de service (Mise en gestion/frais Airbnb)
  if (booking.serviceFee && booking.serviceFee > 0) {
    postExpense({
      title: `Frais de service Airbnb (${booking.guestName})`,
      description: 'Frais de plateforme prélevés par Airbnb',
      amount: booking.serviceFee,
      currency,
      category: 'MANAGEMENT',
      date: expenseDate,
      propertyId,
      vendor: 'Airbnb',
      notes,
    });
    createdCount++;
  }

  // Taxes de séjour retenues
  if (booking.taxAmount && booking.taxAmount > 0) {
    postExpense({
      title: `Taxes de séjour Airbnb (${booking.guestName})`,
      description: 'Taxes retenues et reversées par Airbnb',
      amount: booking.taxAmount,
      currency,
      category: 'TAX',
      date: expenseDate,
      propertyId,
      vendor: 'Airbnb',
      notes,
    });
    createdCount++;
  }

  return createdCount;
}
