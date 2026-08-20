/**
 * 🧬 Consolidation d'une réservation à partir de plusieurs emails
 *
 * Une réservation génère 3 à 6 emails (confirmation, rappel, départ,
 * modification, annulation…). Chacun ne porte qu'une partie de la vérité :
 * la confirmation a le prix et la composition, le rappel a les horaires,
 * l'annulation n'a souvent que le code.
 *
 * Ce module fusionne ces vues en une fiche unique.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * DIFFÉRENCE AVEC L'ANCIEN `mergeBookingsTimeline`
 * ════════════════════════════════════════════════════════════════════════════
 * L'ancienne fusion vivait dans le composant React, mutait son argument
 * (`root`) et rejouait à chaque champ la question « qui gagne ? » avec des
 * règles ad hoc, parfois contradictoires (les dates avaient trois branches
 * dont deux équivalentes).
 *
 * Ici l'ordre d'autorité est décidé UNE fois par le tri, en amont. La fusion
 * se contente de lire chaque champ chez le premier email qui le porte —
 * sauf pour les champs où « le plus récent » ou « le plus élevé » est la
 * bonne réponse, listés explicitement plus bas.
 *
 * Aucune mutation : on construit une nouvelle fiche.
 */

import type { ParsedBooking } from '../gmail-parser';

/** Un nom générique ne doit jamais chasser un vrai nom. */
const PLACEHOLDER_GUEST = /^(?:voyageur airbnb|guest|un voyageur|airbnb)$/i;

function isUsableString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUsableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidRange(checkIn?: string, checkOut?: string): boolean {
  if (!checkIn || !checkOut) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return false;
  return checkOut > checkIn;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(`${checkOut}T00:00:00.000Z`) - Date.parse(`${checkIn}T00:00:00.000Z`);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Fusionne des fiches décrivant la même réservation.
 *
 * @param byAuthority Fiches triées par autorité DÉCROISSANTE — la première
 *   porte le genre retenu pour le groupe (voir `taxonomy.mergePriority`).
 */
export function consolidateBooking(byAuthority: ParsedBooking[]): ParsedBooking {
  if (byAuthority.length === 0) throw new Error('consolidateBooking: aucune fiche');
  if (byAuthority.length === 1) return { ...byAuthority[0] };

  const head = byAuthority[0];
  const out: ParsedBooking = { ...head };

  /** Premier non vide en descendant l'autorité. */
  const firstString = (pick: (b: ParsedBooking) => unknown, accept?: (v: string) => boolean) => {
    for (const b of byAuthority) {
      const v = pick(b);
      if (isUsableString(v) && (!accept || accept(v))) return v;
    }
    return undefined;
  };
  const firstNumber = (pick: (b: ParsedBooking) => unknown) => {
    for (const b of byAuthority) {
      const v = pick(b);
      if (isUsableNumber(v)) return v;
    }
    return undefined;
  };

  // ── Identifiants ──────────────────────────────────────────────────────────
  out.confirmationCode = firstString((b) => b.confirmationCode, (v) => /^HM[A-Z0-9]{6,12}$/i.test(v.trim()))
    ?? firstString((b) => b.confirmationCode);
  out.airbnbListingId = firstString((b) => b.airbnbListingId);

  // ── Voyageur — un placeholder ne chasse jamais un vrai nom ────────────────
  out.guestName = firstString((b) => b.guestName, (v) => !PLACEHOLDER_GUEST.test(v.trim()))
    ?? firstString((b) => b.guestName)
    ?? 'Voyageur Airbnb';
  out.guestEmail = firstString((b) => b.guestEmail, (v) => v.includes('@'));
  out.guestPhone = firstString((b) => b.guestPhone);
  out.guestCountry = firstString((b) => b.guestCountry);
  out.guestLanguage = firstString((b) => b.guestLanguage);

  // Composition : la valeur la plus détaillée l'emporte sur un simple total.
  const withComposition = byAuthority.find(
    (b) => isUsableNumber(b.guests) && (b.guestAdults || b.guestChildren || b.guestInfants),
  ) ?? byAuthority.find((b) => isUsableNumber(b.guests));
  if (withComposition) {
    out.guests = withComposition.guests;
    out.guestAdults = withComposition.guestAdults;
    out.guestChildren = withComposition.guestChildren;
    out.guestInfants = withComposition.guestInfants;
    out.guestPets = withComposition.guestPets;
  }

  // ── Dates ─────────────────────────────────────────────────────────────────
  // Une modification acceptée redéfinit le séjour : elle passe avant, même si
  // un email plus ancien portait des dates valides.
  const modified = byAuthority.find(
    (b) => b.bookingType === 'modified' && isValidRange(b.modifiedCheckIn, b.modifiedCheckOut),
  );
  const anyValidRange = byAuthority.find((b) => isValidRange(b.checkIn, b.checkOut));

  if (modified) {
    out.checkIn = modified.modifiedCheckIn!;
    out.checkOut = modified.modifiedCheckOut!;
    out.modifiedCheckIn = modified.modifiedCheckIn;
    out.modifiedCheckOut = modified.modifiedCheckOut;
  } else if (anyValidRange) {
    out.checkIn = anyValidRange.checkIn;
    out.checkOut = anyValidRange.checkOut;
  }
  out.nights = isValidRange(out.checkIn, out.checkOut)
    ? nightsBetween(out.checkIn, out.checkOut)
    : (firstNumber((b) => b.nights) ?? 0);

  out.checkInTime = firstString((b) => b.checkInTime);
  out.checkOutTime = firstString((b) => b.checkOutTime);

  // ── Finance ───────────────────────────────────────────────────────────────
  out.totalPrice = firstNumber((b) => b.totalPrice) ?? 0;
  out.nightlyRate = firstNumber((b) => b.nightlyRate);
  out.cleaningFee = firstNumber((b) => b.cleaningFee);
  out.serviceFee = firstNumber((b) => b.serviceFee);
  out.taxAmount = firstNumber((b) => b.taxAmount);
  out.hostPayout = firstNumber((b) => b.hostPayout);
  out.payoutDate = firstString((b) => b.payoutDate);
  out.payoutMethod = firstString((b) => b.payoutMethod);
  out.currency = firstString((b) => b.currency) ?? head.currency;

  // ── Logement ──────────────────────────────────────────────────────────────
  out.propertyName = firstString((b) => b.propertyName);
  out.cancellationPolicy = firstString((b) => b.cancellationPolicy);
  if (out.isInstantBook === undefined) {
    out.isInstantBook = byAuthority.find((b) => b.isInstantBook !== undefined)?.isInstantBook;
  }

  // ── Avis ──────────────────────────────────────────────────────────────────
  out.reviewRating = firstNumber((b) => b.reviewRating);
  out.reviewComment = firstString((b) => b.reviewComment);

  // ── Métadonnées de consolidation ──────────────────────────────────────────
  // Le sujet et la date affichés restent ceux de l'email le plus récent :
  // c'est ce que l'utilisateur reconnaît dans sa boîte mail.
  const mostRecent = byAuthority
    .slice()
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
  out.receivedAt = mostRecent.receivedAt;
  out.subject = mostRecent.subject;

  out.relatedMessageIds = [...new Set(byAuthority.map((b) => b.messageId))];
  out.timelineEvents = byAuthority
    .map((b) => ({
      messageId: b.messageId,
      bookingType: b.bookingType,
      receivedAt: b.receivedAt,
      confidence: b.confidence,
    }))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));

  out.confidence = Math.max(...byAuthority.map((b) => b.confidence ?? 0));
  out.warnings = [...new Set(byAuthority.flatMap((b) => b.warnings ?? []))];

  return out;
}
