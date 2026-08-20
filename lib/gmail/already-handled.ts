/**
 * ♻️ Détection des réservations déjà traitées
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LE PROBLÈME
 * ════════════════════════════════════════════════════════════════════════════
 * Un import enregistre `externalId = messageId de l'email représentatif`.
 * Le scan suivant écarte donc CET email — mais pas les 3 autres du même
 * groupe, qui n'ont jamais été persistés individuellement.
 *
 * Résultat : les emails orphelins reforment un groupe, un nouveau
 * représentant est élu (souvent la confirmation), et la réservation
 * ressort comme « Nouvelle » à chaque scan. Le dédoublonnage aval finit par
 * la refuser, mais l'utilisateur la voit réapparaître indéfiniment.
 *
 * La consolidation ayant élargi les regroupements (identité en cascade, plus
 * seulement le code `HM…`), ce bruit ne peut qu'augmenter.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LA RÈGLE
 * ════════════════════════════════════════════════════════════════════════════
 * On dédoublonne sur l'identité de la RÉSERVATION, pas sur celle de l'email.
 * Mais uniquement quand l'état visé est déjà atteint : une annulation portant
 * sur une réservation encore confirmée doit passer.
 */

import type { EmailKind } from './taxonomy';

/** Vue minimale d'une réservation déjà connue de l'application. */
export interface KnownBooking {
  status?: string | null;
  /** Code Airbnb, où qu'il soit stocké côté application. */
  confirmationCode?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface AlreadyHandledInput {
  kind: EmailKind;
  confirmationCode?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface AlreadyHandledResult {
  handled: boolean;
  reason?: string;
}

function normalizeCode(value?: string | null): string | undefined {
  const code = value?.trim().toUpperCase();
  return code && /^HM[A-Z0-9]{6,12}$/.test(code) ? code : undefined;
}

function isCancelled(status?: string | null): boolean {
  return (status ?? '').toLowerCase() === 'cancelled';
}

/**
 * @param known Réservations déjà présentes dans l'application.
 * @param matchesCode Comparateur fourni par l'appelant : le code peut être
 *   stocké dans `paymentInfo.transactionId` ou recopié dans les notes.
 */
export function isAlreadyHandled<TBooking extends KnownBooking>(
  input: AlreadyHandledInput,
  known: TBooking[],
  matchesCode: (booking: TBooking, code: string) => boolean,
): AlreadyHandledResult {
  const code = normalizeCode(input.confirmationCode);
  if (!code) return { handled: false };

  const existing = known.find((b) => matchesCode(b, code));
  if (!existing) return { handled: false };

  switch (input.kind) {
    case 'booking_new':
      // Déjà en base : rien à créer. Les dates peuvent avoir bougé depuis —
      // dans ce cas c'est une modification, traitée par son propre genre.
      return { handled: true, reason: 'Réservation déjà importée' };

    case 'booking_cancelled':
      // L'annulation ne doit être rejouée que si elle a déjà été appliquée.
      return isCancelled(existing.status)
        ? { handled: true, reason: 'Annulation déjà appliquée' }
        : { handled: false };

    case 'booking_reminder':
    case 'booking_checkout':
      // Purement opérationnels : une fois la réservation en base, ils
      // n'apportent plus rien.
      return { handled: true, reason: 'Réservation déjà importée' };

    case 'booking_modified':
      // Une modification change les dates : on la laisse passer tant que les
      // dates en base ne correspondent pas à celles proposées.
      if (input.checkIn && input.checkOut
        && existing.checkIn?.slice(0, 10) === input.checkIn
        && existing.checkOut?.slice(0, 10) === input.checkOut) {
        return { handled: true, reason: 'Modification déjà appliquée' };
      }
      return { handled: false };

    default:
      // Avis et versements s'attachent à une réservation existante :
      // les écarter ferait perdre l'information.
      return { handled: false };
  }
}
