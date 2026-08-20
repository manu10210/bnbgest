/**
 * 🗂️ Tri — regrouper, fusionner, ranger
 *
 * ════════════════════════════════════════════════════════════════════════════
 * CE QUI CHANGE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * AVANT — le tri vivait dans `GmailImporter.tsx`, mêlé au rendu :
 *   • regroupement uniquement sur le code `HM…` ; sans code, chaque email
 *     devenait une ligne isolée → la même réservation apparaissait 4 fois ;
 *   • `evaluateBookingQuality` rejetait en bloc, sans distinguer « douteux »
 *     de « inexploitable » ;
 *   • aucune trace de la raison d'un classement.
 *
 * APRÈS — module pur, testable, sans React :
 *   • identité de réservation en cascade (code → annonce+dates → voyageur+dates) ;
 *   • trois facettes séparées (séjour / finance / réputation) car elles suivent
 *     des chemins d'import différents ;
 *   • quatre bacs explicites, chacun motivé.
 */

import { KIND_META, isActionableKind, MERGE_PRIORITY, type EmailKind } from './taxonomy';
import type { Classification } from './classify';

// ─── Entrée du tri ───────────────────────────────────────────────────────────

/**
 * Vue minimale dont le tri a besoin. Volontairement découplée de
 * `ParsedBooking` : le tri n'a pas à connaître les 40 champs du parser.
 */
export interface TriageItem {
  messageId: string;
  receivedAt: string;
  subject: string;
  kind: EmailKind;
  classification: Classification;

  confirmationCode?: string;
  airbnbListingId?: string;
  guestName?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;

  /** Problèmes de qualité relevés à l'extraction. */
  issues?: string[];
  /** Charge utile opaque, restituée telle quelle au consommateur. */
  payload?: unknown;
}

// ─── Bacs ────────────────────────────────────────────────────────────────────

export type TriageBucket =
  /** Actionnable, décision nette, données suffisantes → importable. */
  | 'to_import'
  /** Actionnable mais la décision ou les données méritent un œil humain. */
  | 'needs_review'
  /** Genre informatif : on l'affiche et on l'archive, on ne l'importe jamais. */
  | 'informational'
  /** Hors périmètre : autre expéditeur, email illisible. */
  | 'discarded';

export const BUCKET_LABELS: Record<TriageBucket, string> = {
  to_import: 'À importer',
  needs_review: 'À vérifier',
  informational: 'Informatif',
  discarded: 'Hors périmètre',
};

// ─── Identité de réservation ─────────────────────────────────────────────────

/**
 * Les emails d'une même réservation ne portent pas tous le code `HM…`
 * (les rappels et les départs l'omettent souvent). D'où une cascade :
 * du plus fiable au plus permissif, on s'arrête au premier qui donne
 * une identité utilisable.
 */
export function reservationIdentity(item: TriageItem): { key: string; basis: string } {
  const code = item.confirmationCode?.trim().toUpperCase();
  if (code && /^HM[A-Z0-9]{6,12}$/.test(code)) {
    return { key: `code:${code}`, basis: 'code de confirmation' };
  }

  const guest = normalizeGuestKey(item.guestName, item.guestEmail);

  if (item.airbnbListingId && item.checkIn) {
    return {
      key: `listing:${item.airbnbListingId}:${item.checkIn}${guest ? `:${guest}` : ''}`,
      basis: 'annonce + date d’arrivée',
    };
  }

  if (guest && item.checkIn && item.checkOut) {
    return { key: `guest:${guest}:${item.checkIn}:${item.checkOut}`, basis: 'voyageur + dates' };
  }

  // Rien d'identifiant : l'email reste seul dans son groupe.
  return { key: `msg:${item.messageId}`, basis: 'email isolé' };
}

function normalizeGuestKey(name?: string, email?: string): string | undefined {
  const mail = email?.trim().toLowerCase();
  if (mail && mail.includes('@')) return mail;

  const clean = name?.trim().toLowerCase();
  if (!clean) return undefined;
  // Placeholders : ne jamais s'en servir comme identité, ils regrouperaient
  // des réservations sans aucun rapport.
  if (/^(?:voyageur airbnb|guest|un voyageur|airbnb)$/.test(clean)) return undefined;
  return clean.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
}

/**
 * Séjour, argent et réputation suivent des chemins d'import distincts.
 * Les mélanger dans un même groupe forcerait le consommateur à les redémêler.
 */
function facetOf(kind: EmailKind): 'stay' | 'finance' | 'reputation' {
  const family = KIND_META[kind].family;
  if (family === 'finance') return 'finance';
  if (family === 'reputation') return 'reputation';
  return 'stay';
}

// ─── Groupes ─────────────────────────────────────────────────────────────────

/**
 * Champs consolidés à l'échelle du groupe.
 *
 * L'email représentatif n'est pas forcément le plus complet : une annulation
 * ne rappelle ni le prix ni la composition, alors que la confirmation qui la
 * précède les contient. On lit donc chaque champ chez le premier email qui
 * le porte, en parcourant le groupe par autorité décroissante.
 */
export interface ConsolidatedFields {
  confirmationCode?: string;
  airbnbListingId?: string;
  guestName?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  /** Pour chaque champ, l'email qui l'a fourni — utile pour justifier l'affichage. */
  sources: Partial<Record<keyof Omit<ConsolidatedFields, 'sources'>, string>>;
}

const PLACEHOLDER_GUEST = /^(?:voyageur airbnb|guest|un voyageur|airbnb)$/i;

function consolidate(ordered: TriageItem[]): ConsolidatedFields {
  const out: ConsolidatedFields = { sources: {} };
  const take = <K extends 'confirmationCode' | 'airbnbListingId' | 'guestName' | 'guestEmail' | 'checkIn' | 'checkOut'>(
    field: K,
    accept: (value: string) => boolean = () => true,
  ) => {
    for (const item of ordered) {
      const value = item[field];
      if (typeof value === 'string' && value.trim() && accept(value)) {
        out[field] = value;
        out.sources[field] = item.messageId;
        return;
      }
    }
  };

  take('confirmationCode', (v) => /^HM[A-Z0-9]{6,12}$/i.test(v.trim()));
  take('airbnbListingId');
  // Un placeholder n'est retenu que si aucun vrai nom n'existe dans le groupe.
  take('guestName', (v) => !PLACEHOLDER_GUEST.test(v.trim()));
  if (!out.guestName) take('guestName');
  take('guestEmail', (v) => v.includes('@'));
  take('checkIn');
  take('checkOut');

  return out;
}

export interface TriageGroup {
  /** Clé stable du groupe. */
  key: string;
  /** Comment l'identité a été établie — affiché pour justifier le regroupement. */
  identityBasis: string;
  facet: 'stay' | 'finance' | 'reputation';
  /** Genre retenu pour le groupe (le plus prioritaire de la timeline). */
  kind: EmailKind;
  /** L'email qui représente le groupe (genre prioritaire, puis le plus récent). */
  primary: TriageItem;
  /** Tous les emails du groupe, du plus récent au plus ancien. */
  items: TriageItem[];
  /** Emails triés par autorité décroissante — ordre de lecture des champs. */
  byAuthority: TriageItem[];
  /** Meilleure valeur connue de chaque champ, toutes sources confondues. */
  consolidated: ConsolidatedFields;
  /** Résultat de `options.mergePayloads`, si fourni. */
  payload?: unknown;
  bucket: TriageBucket;
  /** Pourquoi ce bac. */
  bucketReasons: string[];
  /** Meilleure confiance de classification observée. */
  confidence: number;
}

function sortByRecencyDesc(a: TriageItem, b: TriageItem): number {
  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

/**
 * Le représentant du groupe est l'email du genre le plus prioritaire ;
 * à genre égal, le plus récent. Une annulation prime sur le rappel d'arrivée
 * qui l'a précédée, même si le rappel est arrivé après.
 */
function rankByAuthority(items: TriageItem[]): TriageItem[] {
  return items.slice().sort((a, b) => {
    const byPriority = (MERGE_PRIORITY[b.kind] ?? 0) - (MERGE_PRIORITY[a.kind] ?? 0);
    if (byPriority !== 0) return byPriority;
    return sortByRecencyDesc(a, b);
  });
}

// ─── Attribution des bacs ────────────────────────────────────────────────────

/** Sous ce seuil, on ne propose pas l'import sans relecture. */
const IMPORT_CONFIDENCE_FLOOR = 65;

function assignBucket(
  kind: EmailKind,
  primary: TriageItem,
  items: TriageItem[],
  consolidated: ConsolidatedFields,
): { bucket: TriageBucket; reasons: string[] } {
  const reasons: string[] = [];

  if (kind === 'not_airbnb') {
    return { bucket: 'discarded', reasons: ['Expéditeur hors Airbnb'] };
  }

  if (!isActionableKind(kind)) {
    return {
      bucket: 'informational',
      reasons: [`${KIND_META[kind].label} — aucun import à faire`],
    };
  }

  const best = Math.max(...items.map((i) => i.classification.confidence));
  if (primary.classification.verdict === 'ambigu') {
    const alt = primary.classification.runnerUp;
    reasons.push(
      alt
        ? `Classement incertain : ${KIND_META[kind].label} ou ${KIND_META[alt.kind].label}`
        : 'Classement incertain',
    );
  }
  if (best < IMPORT_CONFIDENCE_FLOOR) {
    reasons.push(`Confiance ${best}% sous le seuil d’import (${IMPORT_CONFIDENCE_FLOOR}%)`);
  }

  const meta = KIND_META[kind];
  // Les dates sont cherchées dans TOUT le groupe : une annulation seule n'en
  // porte pas, mais la confirmation fusionnée avec elle, si.
  const hasDates = Boolean(consolidated.checkIn && consolidated.checkOut);
  if (meta.expectsStayDates && !hasDates) {
    reasons.push('Dates de séjour introuvables');
  }

  for (const issue of primary.issues ?? []) reasons.push(issue);

  return { bucket: reasons.length === 0 ? 'to_import' : 'needs_review', reasons };
}

// ─── Entrée principale ───────────────────────────────────────────────────────

export interface TriageResult {
  groups: TriageGroup[];
  byBucket: Record<TriageBucket, TriageGroup[]>;
  stats: {
    emails: number;
    groups: number;
    merged: number;
    byBucket: Record<TriageBucket, number>;
    byKind: Partial<Record<EmailKind, number>>;
  };
}

const EMPTY_BUCKETS = (): Record<TriageBucket, TriageGroup[]> => ({
  to_import: [],
  needs_review: [],
  informational: [],
  discarded: [],
});

export interface TriageOptions {
  /**
   * Fusion de la charge utile métier (ex : consolider plusieurs `ParsedBooking`
   * en une fiche). Reçoit les emails du groupe par autorité décroissante.
   * Le tri reste ainsi indépendant du modèle de données de l'appelant.
   */
  mergePayloads?: (itemsByAuthority: TriageItem[]) => unknown;
}

export function triage(items: TriageItem[], options?: TriageOptions): TriageResult {
  // Déduplication stricte sur messageId : les requêtes Gmail se recouvrent.
  const unique = new Map<string, TriageItem>();
  for (const item of items) {
    if (!unique.has(item.messageId)) unique.set(item.messageId, item);
  }

  const grouped = new Map<string, { basis: string; items: TriageItem[] }>();
  for (const item of unique.values()) {
    const { key, basis } = reservationIdentity(item);
    const groupKey = `${key}#${facetOf(item.kind)}`;
    const entry = grouped.get(groupKey);
    if (entry) entry.items.push(item);
    else grouped.set(groupKey, { basis, items: [item] });
  }

  const groups: TriageGroup[] = [];
  for (const [key, { basis, items: groupItems }] of grouped) {
    const ordered = groupItems.slice().sort(sortByRecencyDesc);
    const byAuthority = rankByAuthority(ordered);
    const primary = byAuthority[0];
    const kind = primary.kind;
    const consolidated = consolidate(byAuthority);
    const { bucket, reasons } = assignBucket(kind, primary, ordered, consolidated);

    groups.push({
      key,
      identityBasis: basis,
      facet: facetOf(kind),
      kind,
      primary,
      items: ordered,
      byAuthority,
      consolidated,
      payload: options?.mergePayloads?.(byAuthority),
      bucket,
      bucketReasons: reasons,
      confidence: Math.max(...ordered.map((i) => i.classification.confidence)),
    });
  }

  // Le plus récent d'abord, mais les groupes à traiter remontent en tête.
  const bucketOrder: Record<TriageBucket, number> = {
    to_import: 0, needs_review: 1, informational: 2, discarded: 3,
  };
  groups.sort((a, b) => {
    const byBucket = bucketOrder[a.bucket] - bucketOrder[b.bucket];
    if (byBucket !== 0) return byBucket;
    return sortByRecencyDesc(a.primary, b.primary);
  });

  const byBucket = EMPTY_BUCKETS();
  const byKind: Partial<Record<EmailKind, number>> = {};
  for (const g of groups) {
    byBucket[g.bucket].push(g);
    byKind[g.kind] = (byKind[g.kind] ?? 0) + 1;
  }

  return {
    groups,
    byBucket,
    stats: {
      emails: unique.size,
      groups: groups.length,
      merged: unique.size - groups.length,
      byBucket: {
        to_import: byBucket.to_import.length,
        needs_review: byBucket.needs_review.length,
        informational: byBucket.informational.length,
        discarded: byBucket.discarded.length,
      },
      byKind,
    },
  };
}
