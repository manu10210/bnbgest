/**
 * 🔌 Pont fiche ↔ tri
 *
 * Le composant d'import enrichit les fiches après l'analyse serveur
 * (rapprochement logement, réparation de dates, alias). Le tri doit donc
 * repartir des fiches ENRICHIES, pas de celles renvoyées par l'API.
 *
 * Ce module reconstruit une entrée de tri à partir d'une fiche, en réutilisant
 * les métadonnées de classification que le parser y a déposées.
 */

import type { ParsedBooking } from '../gmail-parser';
import { fromLegacyBookingType, type EmailKind } from './taxonomy';
import type { Classification } from './classify';
import type { TriageItem } from './triage';
import { consolidateBooking } from './consolidate-booking';

function rebuildClassification(b: ParsedBooking): Classification {
  const kind: EmailKind = b.kind ?? fromLegacyBookingType(b.bookingType);
  return {
    kind,
    score: b.confidence ?? 0,
    margin: b.classificationMargin ?? 0,
    confidence: b.confidence ?? 0,
    verdict: b.classificationVerdict ?? 'probable',
    runnerUp: b.classificationRunnerUp
      ? { kind: b.classificationRunnerUp as EmailKind, score: 0 }
      : undefined,
    evidence: (b.classificationEvidence ?? []).map((e) => ({
      ruleId: e.ruleId,
      kind,
      scope: 'subject' as const,
      weight: e.weight,
      why: e.why,
    })),
    scores: { [kind]: b.confidence ?? 0 },
  };
}

export function bookingToTriageItem(b: ParsedBooking): TriageItem {
  return {
    messageId: b.messageId,
    receivedAt: b.receivedAt,
    subject: b.subject,
    kind: b.kind ?? fromLegacyBookingType(b.bookingType),
    classification: rebuildClassification(b),
    confirmationCode: b.confirmationCode,
    airbnbListingId: b.airbnbListingId,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    checkIn: b.checkIn || undefined,
    checkOut: b.checkOut || undefined,
    // Les avertissements du parser sont déjà des motifs lisibles ; on écarte
    // celui sur la confiance, que le tri recalcule lui-même.
    issues: (b.warnings ?? []).filter((w) => !/^Parser incertain/i.test(w)),
    payload: b,
  };
}

/** Fusionne les charges utiles d'un groupe. À passer à `triage()`. */
export function mergeBookingPayloads(itemsByAuthority: TriageItem[]): ParsedBooking | undefined {
  const bookings = itemsByAuthority
    .map((i) => i.payload)
    .filter((p): p is ParsedBooking => Boolean(p) && typeof p === 'object');
  if (bookings.length === 0) return undefined;
  return consolidateBooking(bookings);
}
