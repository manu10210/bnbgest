/**
 * 🧵 Normalisation de texte — couche unique
 *
 * Avant : le nettoyage HTML était réécrit dans `gmail-parser.ts`, dans
 * `GmailImporter.tsx` et dans deux helpers, avec des variantes légèrement
 * différentes. Résultat : un email passait ou échouait selon le chemin pris.
 *
 * Ici tout le monde appelle les mêmes fonctions, dans le même ordre.
 *
 * Les classes Unicode sont écrites en `\uXXXX` volontairement : ces caractères
 * sont invisibles, un copier-coller les perdrait silencieusement.
 */

/** Espaces exotiques : insécable, fine, demi-cadratin… → espace simple. */
const EXOTIC_SPACES = /[   -   　]/g;

/**
 * Caractères invisibles insérés par Airbnb autour des prénoms
 * (isolats bidi U+2066..U+2069, ZWSP, ZWNJ, BOM…).
 * Ce sont eux qui produisaient les « Marie-<U+2069> Bordes » cassés.
 */
const INVISIBLE = /[​-‏؜⁠-⁤⁦-⁯﻿]/g;

/** Apostrophes et guillemets typographiques → ASCII. */
const SMART_QUOTES: Array<[RegExp, string]> = [
  [/[‘’‚‛′]/g, "'"],
  [/[“”„‟″]/g, '"'],
];

/** Tirets typographiques (cadratin, demi-cadratin, minus) → '-'. */
const DASHES = /[‐-―−]/g;

/** Diacritiques combinants, retirés par `fold()`. */
const COMBINING_MARKS = /[̀-ͯ]/g;

const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à',
  ccedil: 'ç', ugrave: 'ù', ocirc: 'ô', icirc: 'î', euro: '€',
  hellip: '…', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: '-', mdash: '-', middot: '·', bull: '•', deg: '°',
};

/** `=E9` / `=\n` — les emails Airbnb arrivent souvent en quoted-printable. */
export function decodeQuotedPrintable(input: string): string {
  if (!/=[0-9A-F]{2}|=\r?\n/i.test(input)) return input;

  const unfolded = input.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < unfolded.length; i++) {
    const ch = unfolded[i];
    if (ch === '=' && /^[0-9A-F]{2}$/i.test(unfolded.slice(i + 1, i + 3))) {
      bytes.push(parseInt(unfolded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      const code = ch.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        // Caractère déjà décodé : le réencoder en UTF-8 pour rester cohérent.
        for (const b of Buffer.from(ch, 'utf8')) bytes.push(b);
      }
    }
  }
  try {
    return Buffer.from(bytes).toString('utf8');
  } catch {
    return unfolded;
  }
}

export function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name: string) => HTML_ENTITIES[name.toLowerCase()] ?? m);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

/**
 * HTML → texte en préservant la structure ligne par ligne.
 *
 * Le point critique : les emails Airbnb mettent « Arrivée » et « Départ » dans
 * deux `<td>` adjacents. Il FAUT une coupure de ligne à la fermeture des
 * balises de bloc, sinon les dates se collent et deviennent illisibles.
 */
export function htmlToText(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(?:tr|td|th|div|p|h[1-6]|li|section|article|header|footer|table|tbody|blockquote)\s*>/gi, '\n')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (m) => decodeHtmlEntities(m));
}

/** Nettoyage transverse : invisibles, espaces exotiques, apostrophes, tirets. */
export function cleanUnicode(input: string): string {
  let out = input.replace(INVISIBLE, '').replace(EXOTIC_SPACES, ' ').replace(DASHES, '-');
  for (const [re, to] of SMART_QUOTES) out = out.replace(re, to);
  return out;
}

/** Compacte les blancs sans écraser la structure en lignes. */
export function collapseWhitespace(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Repli accents + minuscules — pour la MISE EN CORRESPONDANCE uniquement.
 * Ne jamais stocker le résultat comme donnée affichée.
 */
export function fold(input: string): string {
  return cleanUnicode(input)
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase();
}

export interface NormalizedEmailText {
  /** Corps original tel que reçu (utile pour les URLs et le JSON-LD). */
  raw: string;
  /** Texte lisible, structure en lignes préservée. */
  text: string;
  /** `text` replié (sans accents, minuscules) pour le matching. */
  folded: string;
  /** Sujet nettoyé, affichable. */
  subject: string;
  /** Sujet replié pour le matching. */
  foldedSubject: string;
  /** true si le corps était du HTML. */
  wasHtml: boolean;
}

export function normalizeEmail(subject: string, body: string): NormalizedEmailText {
  const decodedBody = decodeQuotedPrintable(body ?? '');
  const wasHtml = /<(?:html|body|table|div|td|br|p|a)\b/i.test(decodedBody);

  const asText = wasHtml ? htmlToText(decodedBody) : decodedBody;
  const text = collapseWhitespace(cleanUnicode(decodeHtmlEntities(asText)));
  const cleanSubject = collapseWhitespace(
    cleanUnicode(decodeHtmlEntities(decodeQuotedPrintable(subject ?? ''))),
  );

  return {
    raw: decodedBody,
    text,
    folded: fold(text),
    subject: cleanSubject,
    foldedSubject: fold(cleanSubject),
    wasHtml,
  };
}
