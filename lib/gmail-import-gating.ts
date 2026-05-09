export interface ImportGatingBookingLike {
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  receivedAt: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  confirmationCode?: string;
}

export interface ImportGatingExistingBookingLike {
  checkOut: string;
  propertyId: number;
}

export interface ImportGatingPropertyLike {
  id: number;
}

export function resolveReviewFallbackProperty<TProperty extends ImportGatingPropertyLike, TExistingBooking extends ImportGatingExistingBookingLike>(params: {
  booking: ImportGatingBookingLike;
  property?: TProperty;
  localBookings: TExistingBooking[];
  runtimeProperties: TProperty[];
  defaultProperty?: TProperty;
  computeGuestIdentity: (payload: { name?: string; email?: string; phone?: string }) => string | undefined;
  bookingMatchesGuestIdentity: (booking: TExistingBooking, guestIdentity?: string) => boolean;
  bookingHasConfirmationCode: (booking: TExistingBooking, rawCode?: string) => boolean;
}): TProperty | undefined {
  const {
    booking,
    property,
    localBookings,
    runtimeProperties,
    defaultProperty,
    computeGuestIdentity,
    bookingMatchesGuestIdentity,
    bookingHasConfirmationCode,
  } = params;

  if (property || booking.bookingType !== 'review') {
    return property;
  }

  const reviewDate = new Date(booking.receivedAt);
  const reviewIdentity = computeGuestIdentity({
    name: booking.guestName,
    email: booking.guestEmail,
    phone: booking.guestPhone,
  });

  const recentBooking = localBookings
    .filter((existingBooking) => {
      const checkOut = new Date(existingBooking.checkOut);
      const daysDiff = (reviewDate.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff >= 0 && daysDiff <= 30
        && (
          bookingMatchesGuestIdentity(existingBooking, reviewIdentity)
          || bookingHasConfirmationCode(existingBooking, booking.confirmationCode)
        );
    })
    .sort((a, z) => new Date(z.checkOut).getTime() - new Date(a.checkOut).getTime())[0];

  if (recentBooking) {
    return runtimeProperties.find((runtimeProperty) => runtimeProperty.id === recentBooking.propertyId) ?? defaultProperty;
  }

  return defaultProperty;
}

export function shouldSkipImportForMissingProperty(bookingType: ImportGatingBookingLike['bookingType'], property?: ImportGatingPropertyLike): boolean {
  if (property) return false;
  return bookingType !== 'cancelled' && bookingType !== 'payout' && bookingType !== 'review';
}
