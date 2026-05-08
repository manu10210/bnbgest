export interface GuestResolutionBookingLike {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  totalPrice: number;
  bookingType: string;
  checkIn: string;
}

export interface GuestResolutionLocalGuest {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  language?: string;
  status?: string;
  nationality?: string;
  lastBooking?: string;
  preferences?: {
    smoking: boolean;
    pets: boolean;
    parties: boolean;
    preferredAmenities: string[];
  };
  createdAt?: string;
  totalBookings?: number;
  totalSpent?: number;
  rating?: number;
}

export interface ResolveGuestForImportParams {
  booking: GuestResolutionBookingLike;
  localGuests: GuestResolutionLocalGuest[];
  computeGuestIdentity: (payload: { name?: string; email?: string; phone?: string }) => string | undefined;
  addGuest: (payload: {
    name: string;
    email: string;
    phone: string;
    language: string;
    status: 'active' | 'inactive' | 'blocked';
    nationality?: string;
    lastBooking: string;
    preferences: {
      smoking: boolean;
      pets: boolean;
      parties: boolean;
      preferredAmenities: string[];
    };
  }) => void;
  updateGuest: (id: number, updates: Record<string, unknown>) => void;
}

export interface ResolveGuestForImportResult {
  guestId: number;
  guestsCreatedDelta: number;
  guestsUpdatedDelta: number;
}

export function resolveGuestForImport(params: ResolveGuestForImportParams): ResolveGuestForImportResult {
  const { booking, localGuests, computeGuestIdentity, addGuest, updateGuest } = params;

  if (!booking.guestName || booking.guestName === 'Voyageur Airbnb') {
    return { guestId: 0, guestsCreatedDelta: 0, guestsUpdatedDelta: 0 };
  }

  const incomingGuestIdentity = computeGuestIdentity({
    name: booking.guestName,
    email: booking.guestEmail,
    phone: booking.guestPhone,
  });

  const existing = localGuests.find((guest) => {
    const identity = computeGuestIdentity({ name: guest.name, email: guest.email, phone: guest.phone });
    return !!incomingGuestIdentity && !!identity && identity === incomingGuestIdentity;
  });

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (booking.guestEmail && !existing.email) updates.email = booking.guestEmail;
    if (booking.guestPhone && !existing.phone) updates.phone = booking.guestPhone;
    if (booking.totalPrice > 0) updates.totalSpent = (existing.totalSpent || 0) + booking.totalPrice;

    if (Object.keys(updates).length > 0) {
      updateGuest(existing.id, updates);
      Object.assign(existing, updates);
    }

    return {
      guestId: existing.id,
      guestsCreatedDelta: 0,
      guestsUpdatedDelta: 1,
    };
  }

  if (booking.bookingType === 'new') {
    const nextGuestId = Math.max(...localGuests.map((guest) => guest.id), 0) + 1;

    addGuest({
      name: booking.guestName,
      email: booking.guestEmail || '',
      phone: booking.guestPhone || '',
      language: 'fr',
      status: 'active',
      nationality: undefined,
      lastBooking: booking.checkIn,
      preferences: { smoking: false, pets: false, parties: false, preferredAmenities: [] },
    });

    localGuests.push({
      id: nextGuestId,
      name: booking.guestName,
      email: booking.guestEmail || '',
      phone: booking.guestPhone || '',
      language: 'fr',
      status: 'active',
      nationality: undefined,
      lastBooking: booking.checkIn,
      preferences: { smoking: false, pets: false, parties: false, preferredAmenities: [] },
      createdAt: new Date().toISOString(),
      totalBookings: 0,
      totalSpent: 0,
      rating: 0,
    });

    return {
      guestId: nextGuestId,
      guestsCreatedDelta: 1,
      guestsUpdatedDelta: 0,
    };
  }

  return { guestId: 0, guestsCreatedDelta: 0, guestsUpdatedDelta: 0 };
}
