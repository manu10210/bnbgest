/**
 * 🔎 Extraction de signaux — ce que l'email nous dit AVANT toute interprétation
 *
 * ════════════════════════════════════════════════════════════════════════════
 * LE SIGNAL QUE L'ANCIEN MOTEUR JETAIT
 * ════════════════════════════════════════════════════════════════════════════
 * Chaque lien Airbnb porte un paramètre de tracking `?c=.pi<N>.pk<base64>`.
 * Ce base64 contient le NOM CANONIQUE de la notification côté Airbnb :
 *
 *   aG9tZV9yZXZpZXdzL2VtcGF0aGV0aWNfaG9zdF9yZXZpZXdfcmVjZWl2ZWQ=
 *     → "home_reviews/empathetic_host_review_received"
 *
 * C'est la vérité terrain : ni traduite, ni reformulée, ni ambiguë.
 * L'ancien parser la traitait comme un « sujet corrompu » et jetait l'email
 * (`IGNORED_PATTERNS` → `/[A-Za-z0-9+/]{20,}={0,2}/`). On lisait donc les
 * intitulés marketing traduits en devinant, tout en ayant l'étiquette exacte
 * sous la main.
 *
 * Ici on la décode et on en fait le signal de plus haute autorité.
 */

import { fold, type NormalizedEmailText } from './text';

// ─── Expéditeurs ─────────────────────────────────────────────────────────────

/** Sous-domaines et adresses d'envoi Airbnb légitimes. */
const AIRBNB_SENDER_RE = /@(?:[a-z0-9-]+\.)*airbnb\.(?:com|fr|co\.uk|ca|com\.au|de|es|it)\b/i;

/** Expéditeurs transactionnels (notifications hôte) vs marketing. */
const AIRBNB_TRANSACTIONAL_LOCALPARTS = /^(?:automated|express|no-?reply|noreply|reply|reservations?|hosting)@/i;

// ─── Slugs de tracking ───────────────────────────────────────────────────────

/**
 * Repère les charges base64 des liens Airbnb.
 * Deux formes observées :
 *   • `?c=.pi80.pk<base64>`      (paramètre de campagne)
 *   • `...&eu=<base64>` / `&s=`  (variantes)
 * On accepte le base64 URL-safe et l'encodage pourcent (`%3D` → `=`).
 */
const TRACKING_PAYLOAD_RE = /[?&](?:c|eu|s|t)=(?:\.[a-z0-9]+\.)*(?:pk)?([A-Za-z0-9+/_-]{16,}(?:%3D|=){0,2})/gi;

/** Un slug plausible ressemble à `famille/evenement_precis`. */
const PLAUSIBLE_SLUG_RE = /^[a-z0-9]+(?:[_/][a-z0-9]+){1,6}$/;

/** Un slug Airbnb est de l ASCII imprimable ; tout le reste est du binaire. */
function isPrintableAscii(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) return false;
  }
  return true;
}

function decodeBase64Loose(value: string): string | null {
  const cleaned = decodeURIComponent(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
  try {
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    // Rejeter le binaire : un slug est de l'ASCII imprimable.
    if (!decoded || !isPrintableAscii(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Décode tous les slugs de notification trouvés dans le corps (et le sujet,
 * qu'Airbnb corrompt parfois avec l'URL de tracking brute).
 */
export function extractTrackingSlugs(raw: string): string[] {
  const found = new Set<string>();
  TRACKING_PAYLOAD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TRACKING_PAYLOAD_RE.exec(raw)) !== null) {
    const decoded = decodeBase64Loose(m[1]);
    if (!decoded) continue;
    const slug = decoded.trim().toLowerCase();
    if (PLAUSIBLE_SLUG_RE.test(slug)) found.add(slug);
  }
  return [...found];
}

// ─── Identifiants ────────────────────────────────────────────────────────────

/** Code de réservation Airbnb : toujours `HM` + 6 à 12 alphanumériques. */
const CONFIRMATION_CODE_RE = /\bHM[A-Z0-9]{6,12}\b/gi;

/** `/rooms/12345678` — identifiant d'annonce, stable même sans nom de logement. */
const LISTING_ID_RE = /\/rooms\/(?:plus\/)?(\d{5,20})\b/g;

/** `/hosting/reservations/details/HMXXXX` — lien de gestion côté hôte. */
const HOSTING_RESERVATION_RE = /\/(?:hosting|reservation)s?\/[a-z/]*?\b(HM[A-Z0-9]{6,12})\b/gi;

/** Identifiant de fil de messagerie — présent seulement sur les emails message. */
const THREAD_ID_RE = /\/(?:messaging|threads?)\/[a-z_]*\/?(\d{6,})\b/i;

function collectMatches(text: string, re: RegExp, group = 1): string[] {
  const out = new Set<string>();
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const v = m[group];
    if (v) out.add(v.toUpperCase());
    if (!re.global) break;
  }
  return [...out];
}

// ─── JSON-LD ─────────────────────────────────────────────────────────────────

export interface JsonLdReservation {
  checkinTime?: string;
  checkoutTime?: string;
  totalPrice?: string | number;
  reservationNumber?: string;
  reservationStatus?: string;
  lodgingUnit?: { name?: string; address?: unknown };
  underName?: { name?: string; email?: string };
}

/**
 * Airbnb embarque un `LodgingReservation` Schema.org dans certains emails.
 * Quand il est là, c'est structuré et fiable — bien plus qu'une regex.
 */
export function extractJsonLd(raw: string): JsonLdReservation | null {
  const blocks = raw.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    const payload = block[1]?.trim();
    if (!payload) continue;
    try {
      const parsed: unknown = JSON.parse(payload);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidates) {
        if (!item || typeof item !== 'object') continue;
        const type = (item as { '@type'?: unknown })['@type'];
        if (type === 'LodgingReservation' || type === 'Reservation' || type === 'EventReservation') {
          return item as JsonLdReservation;
        }
      }
      // Pas de @type reconnu mais un seul objet : le tenter quand même.
      if (candidates.length === 1 && candidates[0] && typeof candidates[0] === 'object') {
        return candidates[0] as JsonLdReservation;
      }
    } catch {
      // JSON-LD illisible → on retombe sur les regex, ce n'est pas bloquant.
    }
  }
  return null;
}

// ─── Signaux structurels ─────────────────────────────────────────────────────

/**
 * Marqueurs structurels : ils ne disent pas QUEL type d'email c'est, mais
 * ils disent s'il PARLE d'un séjour réel. C'est ce qui permet de distinguer
 * un récapitulatif de réservation d'un email de versement qui mentionne
 * incidemment un montant.
 */
export interface StructuralSignals {
  /** Un bloc arrivée/départ apparaît dans le corps. */
  hasStayBlock: boolean;
  /** Un tableau à deux colonnes arrivée|départ (mise en page HTML Airbnb). */
  hasTwoColumnDateTable: boolean;
  /** Mention « logement entier », « chambre privée »… */
  hasListingTypeBlock: boolean;
  /** Un récapitulatif financier détaillé (frais de service, ménage, taxes). */
  hasFeeBreakdown: boolean;
  /** Un montant monétaire quelconque. */
  hasMoney: boolean;
  /** Une note en étoiles dans le sujet ou le corps. */
  hasStarRating: boolean;
  /** Un bouton/lien d'action « Écrire une évaluation », « Répondre »… */
  hasReviewCta: boolean;
  hasMessageCta: boolean;
}

const MONEY_RE = /(?:[€$£]\s?\d|(?:\d[\d  ]*[.,]\d{2})\s?(?:[€$£]|eur|usd|gbp))/i;

function detectStructural(n: NormalizedEmailText): StructuralSignals {
  const f = n.folded;
  return {
    hasStayBlock:
      /arrivee[\s\S]{0,200}depart/.test(f) ||
      /check.?in[\s\S]{0,200}check.?out/.test(f),
    hasTwoColumnDateTable: /arrivee\s*\n\s*depart/.test(f) || /check.?in\s*\n\s*check.?out/.test(f),
    hasListingTypeBlock: /logement entier|chambre privee|entire (?:home|place|rental)|private room/.test(f),
    hasFeeBreakdown:
      /frais de service|frais de menage|frais de nettoyage|taxe de sejour|service fee|cleaning fee/.test(f),
    hasMoney: MONEY_RE.test(n.text) || MONEY_RE.test(n.subject),
    hasStarRating: /\d\s*(?:etoiles?|stars?)\b/.test(`${f} ${n.foldedSubject}`),
    hasReviewCta: /ecrire une evaluation|rediger un avis|write a review|leave a review|voir l.evaluation/.test(f),
    hasMessageCta: /repondre au message|repondre a|reply to|voir le message|open message/.test(f),
  };
}

// ─── Agrégat ─────────────────────────────────────────────────────────────────

export interface EmailSignals {
  /** Texte normalisé sous toutes ses formes. */
  text: NormalizedEmailText;
  /** Expéditeur brut. */
  from: string;
  /** Date de réception ISO. */
  receivedAt: string;

  isAirbnbSender: boolean;
  isTransactionalSender: boolean;

  /** Slugs canoniques décodés — signal de plus haute autorité. */
  slugs: string[];
  /** Concaténation des slugs, pratique pour le matching. */
  slugBlob: string;

  confirmationCodes: string[];
  listingIds: string[];
  threadId?: string;

  jsonLd: JsonLdReservation | null;
  structural: StructuralSignals;
}

export function extractSignals(
  from: string,
  receivedAt: string,
  normalized: NormalizedEmailText,
): EmailSignals {
  const senderAddress = (from.match(/<([^>]+)>/)?.[1] ?? from).trim();
  const localPart = senderAddress.replace(/^.*?([^\s<]+@)/, '$1');

  // Les slugs vivent dans les URLs : chercher dans le brut ET dans le sujet,
  // qu'Airbnb corrompt parfois avec l'URL de tracking elle-même.
  const slugs = [
    ...new Set([
      ...extractTrackingSlugs(normalized.raw),
      ...extractTrackingSlugs(normalized.subject),
    ]),
  ];

  const codeSources = `${normalized.text}\n${normalized.subject}\n${normalized.raw}`;
  const confirmationCodes = [
    ...new Set([
      ...collectMatches(codeSources, HOSTING_RESERVATION_RE),
      ...collectMatches(codeSources, CONFIRMATION_CODE_RE, 0),
    ]),
  ];

  return {
    text: normalized,
    from,
    receivedAt,
    isAirbnbSender: AIRBNB_SENDER_RE.test(senderAddress),
    isTransactionalSender: AIRBNB_TRANSACTIONAL_LOCALPARTS.test(localPart),
    slugs,
    slugBlob: slugs.join(' '),
    confirmationCodes,
    listingIds: collectMatches(normalized.raw, LISTING_ID_RE),
    threadId: normalized.raw.match(THREAD_ID_RE)?.[1],
    jsonLd: extractJsonLd(normalized.raw),
    structural: detectStructural(normalized),
  };
}

/** Point d'entrée pratique quand on n'a pas encore normalisé. */
export { fold };
