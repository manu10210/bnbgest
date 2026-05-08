export type ImportTraceStatus = 'success' | 'skipped' | 'error';

export interface ImportTraceLike {
  messageId: string;
  bookingType: string;
  guestName: string;
  status: ImportTraceStatus;
  action: string;
  reason?: string;
}

export function formatImportTraceActionLabel(action: string): string {
  const map: Record<string, string> = {
    property_override_applied: 'Logement forcé appliqué',
    property_alias_autofix: 'Logement rattaché via alias',
    property_inferred_from_context: 'Logement déduit du contexte',
    property_aggressive_autofix: 'Logement rattaché en mode expert',
    property_single_property_force: 'Rattachement forcé (mono-logement)',
    booking_created: 'Réservation créée',
    booking_cancelled: 'Réservation annulée',
    booking_updated: 'Réservation mise à jour',
    booking_created_from_modified: 'Réservation créée depuis une modification',
    booking_completed_checkout: 'Séjour marqué terminé (checkout)',
    booking_enriched_from_reminder: 'Réservation enrichie depuis un rappel',
    booking_created_from_reminder: 'Réservation créée depuis un rappel',
    review_imported: 'Avis importé',
    payout_attached_to_booking: 'Versement rattaché à une réservation',
    payout_created_as_financial_booking: 'Versement créé en écriture financière',
    skip_no_property: 'Import ignoré (logement introuvable)',
    skip_duplicate: 'Import ignoré (doublon)',
    cancel_not_found: 'Annulation ignorée (réservation introuvable)',
    checkout_not_found: 'Checkout ignoré (réservation introuvable)',
    payout_skipped: 'Versement ignoré',
  };
  return map[action] || action;
}

export function formatImportTraceReasonLabel(reason: string): string {
  if (reason.startsWith('alias_match:')) {
    const payload = reason.slice('alias_match:'.length);
    const [fromRaw, toRaw] = payload.split('=>');
    const from = (fromRaw || '').trim();
    const to = (toRaw || '').trim();
    if (from && to) return `Alias appliqué : "${from}" → "${to}"`;
    return 'Alias logement appliqué automatiquement';
  }
  if (reason.startsWith('property_id:')) {
    return `ID logement appliqué (${reason.split(':')[1] || 'inconnu'})`;
  }
  if (reason.startsWith('property_name_unmatched_context_used:')) {
    const name = reason.split(':').slice(1).join(':').trim();
    return `Nom logement initial non reconnu, contexte utilisé${name ? ` (${name})` : ''}`;
  }
  if (reason.startsWith('property_missing_context_used:')) {
    const name = reason.split(':').slice(1).join(':').trim();
    return `Logement manquant, déduit via contexte${name ? ` (${name})` : ''}`;
  }
  if (reason.startsWith('aggressive_match_score:')) {
    const score = reason.split(':')[1] || '0';
    return `Matching expert appliqué (score ${score}%)`;
  }
  if (reason.startsWith('single_property_forced:')) {
    const name = reason.split(':').slice(1).join(':').trim();
    return `Affectation forcée (mode mono-logement)${name ? ` (${name})` : ''}`;
  }

  const map: Record<string, string> = {
    no_matching_property: 'Aucun logement correspondant',
    duplicate_confirmation_code: 'Doublon détecté via code de confirmation',
    duplicate_dates_guest_property: 'Doublon détecté via dates + voyageur + logement',
    no_matching_booking: 'Aucune réservation correspondante',
    missing_payout_amount: 'Montant de versement absent',
  };
  return map[reason] || reason;
}

export function formatImportTraceStatusLabel(status: ImportTraceStatus): string {
  const map: Record<ImportTraceStatus, string> = {
    success: 'Succès',
    skipped: 'Ignoré',
    error: 'Erreur',
  };
  return map[status] || status;
}

export function computeImportTraceStats(entries: ImportTraceLike[]): Record<ImportTraceStatus, number> {
  return entries.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { success: 0, skipped: 0, error: 0 } as Record<ImportTraceStatus, number>,
  );
}

export function computeImportTraceTopErrorReasons(
  entries: ImportTraceLike[],
  limit = 3,
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of entries) {
    if (row.status !== 'error') continue;
    const key = row.reason || 'unknown_error';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function normalizeTraceSearchInput(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterImportTrace(
  entries: ImportTraceLike[],
  options: {
    statusFilter: 'all' | ImportTraceStatus;
    query: string;
  },
): ImportTraceLike[] {
  const normalizedQuery = normalizeTraceSearchInput(options.query);

  return entries.filter((row) => {
    if (options.statusFilter !== 'all' && row.status !== options.statusFilter) return false;
    if (!normalizedQuery) return true;

    const haystack = normalizeTraceSearchInput(
      `${row.messageId} ${row.guestName} ${row.action} ${row.reason || ''} ${row.bookingType}`,
    );
    return haystack.includes(normalizedQuery);
  });
}
