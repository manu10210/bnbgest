export interface NewBookingLike {
  confirmationCode?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  receivedAt: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
}

export interface ExistingBookingLike {
  id: number;
  propertyId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  specialRequests?: string;
}

export type DuplicateResolutionResult<TExistingBooking extends ExistingBookingLike> =
  | {
      kind: 'none';
    }
  | {
      kind: 'skip';
      reason: 'duplicate_confirmation_code' | 'duplicate_dates_guest_property';
    }
  | {
      kind: 'resync';
      duplicateBooking: TExistingBooking;
      patchedSpecialRequests: string;
      mergedGuests: number;
      mergedTotalPrice: number;
    };

export interface ResolveNewBookingDuplicateParams<TExistingBooking extends ExistingBookingLike> {
  booking: NewBookingLike;
  propertyId?: number;
  localBookings: TExistingBooking[];
  normalizeConfirmationCode: (value?: string) => string | undefined;
  bookingHasConfirmationCode: (booking: TExistingBooking, rawCode?: string) => boolean;
  bookingMatchesGuestIdentity: (booking: TExistingBooking, identity?: string) => boolean;
  computeGuestIdentity: (payload: { name?: string; email?: string; phone?: string }) => string | undefined;
  isIsoDate: (value?: string) => boolean;
  formatDateLabel: (isoLikeDate: string) => string;
}

export function resolveNewBookingDuplicate<TExistingBooking extends ExistingBookingLike>(
  params: ResolveNewBookingDuplicateParams<TExistingBooking>,
): DuplicateResolutionResult<TExistingBooking> {
  const {
    booking,
    propertyId,
    localBookings,
    normalizeConfirmationCode,
    bookingHasConfirmationCode,
    bookingMatchesGuestIdentity,
    computeGuestIdentity,
    isIsoDate,
    formatDateLabel,
  } = params;

  // a) Dédoublonnage par code de confirmation (fiable)
  if (normalizeConfirmationCode(booking.confirmationCode)) {
    const duplicateByCode = localBookings.find((existing) => bookingHasConfirmationCode(existing, booking.confirmationCode));

    if (duplicateByCode) {
      const canResyncDates =
        isIsoDate(booking.checkIn)
        && isIsoDate(booking.checkOut)
        && isIsoDate(duplicateByCode.checkIn)
        && isIsoDate(duplicateByCode.checkOut)
        && (duplicateByCode.checkIn !== booking.checkIn || duplicateByCode.checkOut !== booking.checkOut);

      if (canResyncDates) {
        const patchedSpecialRequests = [
          duplicateByCode.specialRequests || '',
          `[RESYNC DATES Gmail ${formatDateLabel(booking.receivedAt)}] ${booking.checkIn} → ${booking.checkOut}`,
        ]
          .filter(Boolean)
          .join(' | ');

        const mergedGuests = booking.guests > 0 ? booking.guests : duplicateByCode.guests;
        const mergedTotalPrice = booking.totalPrice > 0 ? booking.totalPrice : duplicateByCode.totalPrice;

        return {
          kind: 'resync',
          duplicateBooking: duplicateByCode,
          patchedSpecialRequests,
          mergedGuests,
          mergedTotalPrice,
        };
      }

      return {
        kind: 'skip',
        reason: 'duplicate_confirmation_code',
      };
    }
  }

  // b) Dédoublonnage par dates + voyageur + logement (si pas de code confirmation)
  if (!normalizeConfirmationCode(booking.confirmationCode) && propertyId) {
    const incomingGuestIdentity = computeGuestIdentity({
      name: booking.guestName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
    });

    const alreadyExists = localBookings.some((existing) => (
      existing.propertyId === propertyId
      && existing.checkIn === booking.checkIn
      && existing.checkOut === booking.checkOut
      && bookingMatchesGuestIdentity(existing, incomingGuestIdentity)
    ));

    if (alreadyExists) {
      return {
        kind: 'skip',
        reason: 'duplicate_dates_guest_property',
      };
    }
  }

  return { kind: 'none' };
}
