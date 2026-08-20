/**
 * 📚 Taxonomie des notifications Airbnb
 *
 * Source unique de vérité pour « quel genre d'email est-ce ? ».
 *
 * ════════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE COUCHE
 * ════════════════════════════════════════════════════════════════════════════
 * L'ancien moteur ne connaissait que 7 types (`bookingType`) et jetait
 * silencieusement tout le reste via IGNORED_PATTERNS → `return null`.
 * Conséquences :
 *   • impossible de savoir POURQUOI un email avait disparu ;
 *   • un pattern « ignoré » trop large tuait de vraies réservations ;
 *   • aucun moyen de trier/auditer les emails non importables.
 *
 * Ici, TOUT email reçoit un `kind`. Rien n'est jeté en silence.
 * Le tri (`triage.ts`) décide ensuite quoi importer, quoi afficher, quoi ranger.
 */

// ─── Genres d'emails ─────────────────────────────────────────────────────────

/**
 * Genres actionnables : produisent une fiche réservation importable.
 * Correspondance 1:1 avec l'ancien `ParsedBooking['bookingType']`.
 */
export const ACTIONABLE_KINDS = [
  'booking_new',
  'booking_modified',
  'booking_cancelled',
  'booking_reminder',
  'booking_checkout',
  'review_received',
  'payout_sent',
] as const;

/**
 * Genres informatifs : affichés et triés, jamais importés.
 * Chacun remplace une entrée de l'ancien IGNORED_PATTERNS — mais avec un nom,
 * donc traçable dans l'UI au lieu de disparaître.
 */
export const INFORMATIONAL_KINDS = [
  'booking_inquiry',      // demande de réservation pas encore acceptée
  'guest_message',        // messagerie voyageur ↔ hôte
  'review_request',       // Airbnb demande à l'HÔTE d'évaluer son voyageur
  'guest_payment',        // paiement effectué par le voyageur (≠ versement hôte)
  'dispute_claim',        // litige, AirCover, sinistre, demande d'argent
  'listing_action',       // « votre annonce nécessite votre attention »
  'account_security',     // connexion, mot de passe, vérification
  'policy_update',        // CGU, conditions, politique de rémunération
  'marketing',            // conseils hôtes, Superhost, newsletters
  'other_airbnb',         // email Airbnb reconnu mais non catégorisé
  'not_airbnb',           // expéditeur hors Airbnb
] as const;

export type ActionableKind = (typeof ACTIONABLE_KINDS)[number];
export type InformationalKind = (typeof INFORMATIONAL_KINDS)[number];
export type EmailKind = ActionableKind | InformationalKind;

const ACTIONABLE_SET = new Set<string>(ACTIONABLE_KINDS);

export function isActionableKind(kind: EmailKind): kind is ActionableKind {
  return ACTIONABLE_SET.has(kind);
}

// ─── Pont vers l'ancien modèle `bookingType` ─────────────────────────────────
// Conservé pour ne rien casser en aval (persistance, résolutions, UI existante).

export type LegacyBookingType =
  | 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';

const KIND_TO_LEGACY: Record<ActionableKind, LegacyBookingType> = {
  booking_new: 'new',
  booking_modified: 'modified',
  booking_cancelled: 'cancelled',
  booking_reminder: 'reminder',
  booking_checkout: 'checkout',
  review_received: 'review',
  payout_sent: 'payout',
};

const LEGACY_TO_KIND: Record<LegacyBookingType, ActionableKind> = {
  new: 'booking_new',
  modified: 'booking_modified',
  cancelled: 'booking_cancelled',
  reminder: 'booking_reminder',
  checkout: 'booking_checkout',
  review: 'review_received',
  payout: 'payout_sent',
};

export function toLegacyBookingType(kind: EmailKind): LegacyBookingType | null {
  return isActionableKind(kind) ? KIND_TO_LEGACY[kind] : null;
}

export function fromLegacyBookingType(type: LegacyBookingType): ActionableKind {
  return LEGACY_TO_KIND[type];
}

// ─── Métadonnées d'affichage & de tri ────────────────────────────────────────

export interface KindMeta {
  /** Libellé court affiché sur le badge. */
  label: string;
  /** Famille utilisée pour les onglets de tri. */
  family: 'reservation' | 'finance' | 'reputation' | 'operation' | 'noise';
  /**
   * Autorité sur l'ÉTAT de la réservation quand plusieurs emails la décrivent.
   * Plus haut gagne.
   *
   * ⚠️ L'ancien barème (hérité de `TYPE_PRIORITY`) plaçait `new` au-dessus de
   * `cancelled` : une réservation annulée puis re-fusionnée ressortait comme
   * « nouvelle » et se faisait importer au lieu d'être annulée. L'ordre correct
   * suit la terminalité de l'événement, pas son ancienneté :
   *   annulée > modifiée > confirmée > départ > rappel.
   */
  mergePriority: number;
  /** Un séjour (dates d'arrivée/départ) est-il attendu dans cet email ? */
  expectsStayDates: boolean;
  /** Un montant est-il attendu ? */
  expectsMoney: boolean;
}

export const KIND_META: Record<EmailKind, KindMeta> = {
  // ── Actionnables ──────────────────────────────────────────────────────────
  booking_new:       { label: 'Nouvelle',      family: 'reservation', mergePriority: 70, expectsStayDates: true,  expectsMoney: true  },
  booking_modified:  { label: 'Modifiée',      family: 'reservation', mergePriority: 80, expectsStayDates: true,  expectsMoney: false },
  booking_cancelled: { label: 'Annulée',       family: 'reservation', mergePriority: 90, expectsStayDates: true,  expectsMoney: false },
  booking_checkout:  { label: 'Départ',        family: 'operation',   mergePriority: 40, expectsStayDates: true,  expectsMoney: false },
  booking_reminder:  { label: 'Rappel',        family: 'operation',   mergePriority: 30, expectsStayDates: true,  expectsMoney: false },
  review_received:   { label: 'Avis',          family: 'reputation',  mergePriority: 20, expectsStayDates: false, expectsMoney: false },
  payout_sent:       { label: 'Versement',     family: 'finance',     mergePriority: 10, expectsStayDates: false, expectsMoney: true  },

  // ── Informatifs ───────────────────────────────────────────────────────────
  booking_inquiry:   { label: 'Demande',       family: 'reservation', mergePriority: 5,  expectsStayDates: true,  expectsMoney: false },
  guest_message:     { label: 'Message',       family: 'operation',   mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  review_request:    { label: 'À évaluer',     family: 'reputation',  mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  guest_payment:     { label: 'Paiement voy.', family: 'finance',     mergePriority: 0,  expectsStayDates: false, expectsMoney: true  },
  dispute_claim:     { label: 'Litige',        family: 'finance',     mergePriority: 0,  expectsStayDates: false, expectsMoney: true  },
  listing_action:    { label: 'Annonce',       family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  account_security:  { label: 'Compte',        family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  policy_update:     { label: 'Conditions',    family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  marketing:         { label: 'Marketing',     family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  other_airbnb:      { label: 'Airbnb',        family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
  not_airbnb:        { label: 'Hors Airbnb',   family: 'noise',       mergePriority: 0,  expectsStayDates: false, expectsMoney: false },
};

export const MERGE_PRIORITY: Record<EmailKind, number> = Object.fromEntries(
  (Object.keys(KIND_META) as EmailKind[]).map((k) => [k, KIND_META[k].mergePriority]),
) as Record<EmailKind, number>;
