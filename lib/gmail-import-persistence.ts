export type PersistBookingType = 'new' | 'cancelled' | 'modified';

export interface PersistBookingPayload {
  propertyId: number;
  sourceMessageId?: string;
  guestInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  checkIn: string;
  checkOut: string;
  guests?: number;
  totalPrice?: number;
  status?: string;
  specialRequests?: string | null;
  paymentInfo?: {
    transactionId?: string | null;
  } | null;
  /** Identifiant d'annonce Airbnb : le serveur s'en sert comme ancre stable. */
  airbnbListingId?: string | null;
}

export interface PersistBookingUpdatePayload {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  totalPrice?: number;
  status?: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  specialRequests?: string;
  notes?: string;
  cancellationReason?: string;
  paymentStatus?: 'pending' | 'paid' | 'partial' | 'refunded';
  paymentAmount?: number;
  paymentTransactionId?: string;
}

export interface PersistBookingResult {
  id?: number;
  error?: string;
}

const RETRYABLE_HTTP_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function recoverExistingBookingId(params: {
  propertyId: number;
  sourceMessageId?: string;
  confirmationCode?: string | null;
}): Promise<number | null> {
  const { propertyId, sourceMessageId, confirmationCode } = params;

  const tryLookup = async (query: string): Promise<number | null> => {
    const res = await fetch(`/api/bookings?${query}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;
    const payload = await res.json().catch(() => ({} as { bookings?: Array<{ id?: number }> }));
    const id = Number(payload?.bookings?.[0]?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  if (typeof sourceMessageId === 'string' && sourceMessageId.trim().length > 0) {
    const existingByExternalId = await tryLookup(
      `propertyId=${propertyId}&source=AIRBNB&externalId=${encodeURIComponent(sourceMessageId.trim())}`,
    );
    if (existingByExternalId) return existingByExternalId;
  }

  if (typeof confirmationCode === 'string' && confirmationCode.trim().length > 0) {
    const existingByCode = await tryLookup(
      `propertyId=${propertyId}&confirmationCode=${encodeURIComponent(confirmationCode.trim())}`,
    );
    if (existingByCode) return existingByCode;
  }

  return null;
}

export function toApiDateTime(value?: string, fallbackHour = 12): string | undefined {
  if (!value) return undefined;

  // API attend un datetime ISO (z.string().datetime())
  // Les imports Gmail sont souvent en YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T${String(fallbackHour).padStart(2, '0')}:00:00.000Z`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export async function persistBookingToDb(
  payload: PersistBookingPayload,
  bookingType: PersistBookingType,
): Promise<PersistBookingResult> {
  const specialReqs = payload.specialRequests ?? null;
  const apiCheckIn = toApiDateTime(payload.checkIn, 15);
  let apiCheckOut = toApiDateTime(payload.checkOut, 11);

  if (!apiCheckIn || !apiCheckOut) {
    console.warn('[persistToDb] Dates invalides, persistance annulée', payload.checkIn, payload.checkOut);
    return { error: 'invalid_dates' };
  }

  // Corriger l'inversion d'heure si les jours sont identiques (ex: payout importé)
  if (payload.checkIn === payload.checkOut) {
    apiCheckOut = toApiDateTime(payload.checkOut, 17); // Forcer 17h, donc après 15h
  }

  const body: Record<string, unknown> = {
    propertyId: payload.propertyId,
    externalId: payload.sourceMessageId || null,
    guestName: (payload.guestInfo?.name ?? 'Voyageur').slice(0, 100),
    guestEmail: payload.guestInfo?.email || undefined,
    guestPhone: payload.guestInfo?.phone || null,
    checkIn: apiCheckIn,
    checkOut: apiCheckOut,
    guests: payload.guests ?? 1,
    totalPrice: payload.totalPrice ?? 0,
    status:
      bookingType === 'cancelled'
        ? 'CANCELLED'
        : payload.status === 'confirmed'
          ? 'CONFIRMED'
          : payload.status === 'completed'
            ? 'CHECKED_OUT'
            : 'CONFIRMED',
    source: 'AIRBNB',
    specialRequests: specialReqs ? specialReqs.slice(0, 4900) : null,
    confirmationCode: payload.paymentInfo?.transactionId ?? null,
    notes: null,
    airbnbListingId: payload.airbnbListingId && /^\d{5,20}$/.test(payload.airbnbListingId) ? payload.airbnbListingId : undefined,
  };

  const confirmationCode = payload.paymentInfo?.transactionId ?? null;
  const maxAttempts = 2;
  let lastError = 'unknown_error';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const apiError =
          typeof err?.error === 'string'
            ? err.error
            : typeof err?.message === 'string'
              ? err.message
              : 'unknown_error';
        const reason = `http_${res.status}:${apiError}`;
        lastError = reason;
        console.warn(`[persistToDb] HTTP ${res.status}:`, apiError);

        if (res.status === 409) {
          const recoveredBookingId = await recoverExistingBookingId({
            propertyId: payload.propertyId,
            sourceMessageId: payload.sourceMessageId,
            confirmationCode,
          });
          if (recoveredBookingId) {
            return { id: recoveredBookingId };
          }
        }

        if (RETRYABLE_HTTP_STATUS.has(res.status) && attempt < maxAttempts) {
          await sleep(250 * attempt);
          continue;
        }

        return { error: reason };
      }

      const data = await res.json().catch(() => ({}));
      const dbId = Number((data as { booking?: { id?: number } })?.booking?.id);
      if (Number.isFinite(dbId) && dbId > 0) {
        return { id: dbId };
      }

      lastError = 'missing_booking_id_in_response';
      if (attempt < maxAttempts) {
        await sleep(200 * attempt);
        continue;
      }
      return { error: lastError };
    } catch (error) {
      console.warn('[persistToDb] Erreur réseau (non bloquant):', error);
      lastError = 'network_error';
      if (attempt < maxAttempts) {
        await sleep(250 * attempt);
        continue;
      }
      return { error: lastError };
    }
  }

  return { error: lastError };
}

export async function persistBookingUpdateToDb(
  bookingId: number,
  updates: PersistBookingUpdatePayload,
): Promise<void> {
  try {
    const normalizedUpdates: Record<string, unknown> = { ...updates };

    if (typeof updates.checkIn === 'string') {
      normalizedUpdates.checkIn = toApiDateTime(updates.checkIn, 15);
    }
    if (typeof updates.checkOut === 'string') {
      normalizedUpdates.checkOut = toApiDateTime(updates.checkOut, 11);
    }

    const res = await fetch(`/api/bookings/${bookingId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedUpdates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`[persistUpdateToDb] HTTP ${res.status}:`, err?.error ?? err);
    }
  } catch (error) {
    console.warn('[persistUpdateToDb] Erreur réseau (non bloquant):', error);
  }
}
