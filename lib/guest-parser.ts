/**
 * Guest Parser - Extraction des informations invites depuis les emails Airbnb
 */

// Supprime les caractères Unicode invisibles fréquents dans les sujets Gmail
function stripInvisible(s: string): string {
  return s
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD]/g, '')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Capture un prénom+nom : accepte minuscule, Majuscule, MAJUSCULE, accents, tiret, apostrophe
// Exemples : "Fakri", "Fakri Ouchene", "JEAN-PIERRE Martin", "Élodie DUPONT", "O'Brien"
const NAME_TOKEN = "[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\\-'\u2019]{1,30}";
const NAME_RE    = `${NAME_TOKEN}(?:\\s+${NAME_TOKEN}){0,3}`;

// Mots à exclure comme premier token d'un nom capturé
const FALSE_POS = /^(Airbnb|Nouvelle|Votre|Check|Logement|Rappel|Booking|Confirm|Reservation|Annulation|Modification|Voyageur|Guest|Demande|Bienvenue|Bonjour|Hello|France|Europe|Identit)/i;

// ============================================================
// GUEST NAME
// ============================================================

export function extractGuestName(subject: string, body: string): string | undefined {
  const cleanSubject = stripInvisible(subject);
  const cleanBody   = stripInvisible(body);
  const text = cleanSubject + '\n' + cleanBody;

  // ── 1. Champ explicite dans le corps (le plus fiable) ──────────────────
  // Airbnb corpo: "Voyageur\nFakri Ouchene\nFrance"
  // ou "Voyageur : Fakri Ouchene"
  const explicitPatterns = [
    // ── Format Airbnb hôte réel (2024-2026) ──────────────────────────────
    // "Kamel Freytag\nIdentité vérifiée · 1 commentaire"  ← NOM AVANT le label
    /([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)\s*\n\s*Identit[eé]\s+v[eé]rifi[eé]e/i,
    // "Envoyez à Kamel Freytag un message" ← bouton CTA dans le corps
    /Envoyez\s+[àa]\s+([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)\s+un\s+message/i,
    // "Voyageur\nFakri Ouchene"  (saut de ligne entre label et valeur)
    /Voyageur\s*\n\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|$)/,
  // "Voyageur principal : Léa O'Connor"
  /Voyageur\s+principal\s*[:\-]\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|,|$)/i,
    // "Voyageur : Fakri Ouchene" ou "Guest : Fakri Ouchene"
    /(?:Voyageur|Guest)\s*[:\-]\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|,|$)/i,
    // "Nom complet : Fakri Ouchene"
    /Nom\s+(?:complet|du\s+voyageur)\s*[:\-]\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|,|$)/i,
    // "Full name : Fakri Ouchene"
    /Full\s+name\s*[:\-]\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|,|$)/i,
    // "Identité vérifiée\n\nFakri Ouchene\n"  ← format ancien (nom APRÈS)
    /Identit[eé]\s+v[eé]rifi[eé]e?\s*\n+([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\-' \u2019]{2,50}?)(?:\n|$)/i,
  ];

  for (const p of explicitPatterns) {
    const m = cleanBody.match(p);
    if (m?.[1]) {
      const name = m[1].trim();
      if (name.length >= 2 && !FALSE_POS.test(name)) return name;
    }
  }

  // ── 2. Patterns dans le sujet ──────────────────────────────────────────
  const subjectPatterns = [
    // "Nouvelle réservation confirmée! Fakri Ouchene arrive le 17 avr."
    new RegExp(`(?:Nouvelle\\s+r[eé]servation\\s+confirm[eé]e[^a-z]{0,3})(${NAME_RE})\\s+arrive`, 'i'),
    // "Fakri Ouchene a réservé votre logement"
    new RegExp(`(${NAME_RE})\\s+a\\s+r[eé]serv[eé]`, 'i'),
    // "Fakri Ouchene a annulé"
    new RegExp(`(${NAME_RE})\\s+a\\s+annul[eé]`, 'i'),
    // "Fakri Ouchene a modifié"
    new RegExp(`(${NAME_RE})\\s+a\\s+modifi[eé]`, 'i'),
    // "Fakri Ouchene souhaite changer"
    new RegExp(`(${NAME_RE})\\s+souhaite`, 'i'),
    // "Le séjour de Fakri Ouchene se termine"
    new RegExp(`s[eé]jour\\s+de\\s+(${NAME_RE})\\s+(?:se\\s+)?termin`, 'i'),
    // "Fakri Ouchene part aujourd'hui"
    new RegExp(`(${NAME_RE})\\s+part\\s+aujourd`, 'i'),
    // "Fakri Ouchene arrive" (EN ou FR générique)
    new RegExp(`(${NAME_RE})\\s+arrives?\\b`, 'i'),
    // "Fakri Ouchene has booked"
    new RegExp(`(${NAME_RE})\\s+has\\s+booked`, 'i'),
    // "Fakri Ouchene a demandé à réserver"
    new RegExp(`(${NAME_RE})\\s+a\\s+demand[eé]`, 'i'),
  ];

  for (const p of subjectPatterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const name = m[1].trim();
      if (name.length >= 2 && name.length <= 60 && !FALSE_POS.test(name)) {
        return name;
      }
    }
  }

  return undefined;
}



// ============================================================
// GUEST COMPOSITION
// ============================================================

export interface GuestComposition {
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  total?: number;
}

export function extractGuestComposition(body: string, subject?: string): GuestComposition {
  const result: GuestComposition = {};

  const adultPatterns = [/(\d+)\s+adulte[s]?/i, /(\d+)\s+adult[s]?/i];
  for (const p of adultPatterns) {
    const m = body.match(p);
    if (m) { result.adults = parseInt(m[1], 10); break; }
  }

  const childPatterns = [/(\d+)\s+enfant[s]?/i, /(\d+)\s+child(?:ren)?/i];
  for (const p of childPatterns) {
    const m = body.match(p);
    if (m) { result.children = parseInt(m[1], 10); break; }
  }

  const infantPatterns = [/(\d+)\s+b[eé]b[eé][s]?/i, /(\d+)\s+infant[s]?/i, /(\d+)\s+nourrisson[s]?/i];
  for (const p of infantPatterns) {
    const m = body.match(p);
    if (m) { result.infants = parseInt(m[1], 10); break; }
  }

  const petPatterns = [/(\d+)\s+animal(?:ux)?/i, /(\d+)\s+pet[s]?/i];
  for (const p of petPatterns) {
    const m = body.match(p);
    if (m) { result.pets = parseInt(m[1], 10); break; }
  }

  const totalPatterns = [/(\d+)\s+voyageur[s]?/i, /(\d+)\s+guest[s]?/i, /(\d+)\s+personne[s]?/i];
  for (const p of totalPatterns) {
    const m = body.match(p);
    if (m) { result.total = parseInt(m[1], 10); break; }
  }

  if (!result.total && (result.adults || result.children)) {
    result.total = (result.adults || 0) + (result.children || 0);
  }

  return result;
}

// ============================================================
// GUEST COUNTRY
// ============================================================

export function extractGuestCountry(body: string): string | undefined {
  const patterns = [
    /Pays\s*[:\-]\s*([A-Za-z][A-Za-z\s]+)/i,
    /Country\s*[:\-]\s*([A-Za-z][A-Za-z\s]+)/i,
    /Provenance\s*[:\-]\s*([A-Za-z][A-Za-z\s]+)/i,
    /Location\s*[:\-]\s*([A-Za-z][A-Za-z\s,]+)/i,
  ];

  for (const p of patterns) {
    const m = body.match(p);
    if (m && m[1]) {
      return m[1].trim().split('\n')[0].trim();
    }
  }

  return undefined;
}

// ============================================================
// GUEST PHONE
// ============================================================

export function extractGuestPhone(body: string): string | undefined {
  const patterns = [
    /T[eé]l[eé]phone?\s*[:\-]\s*([\+\d][\d\s\.\-\(\)]{6,20})/i,
    /Phone\s*[:\-]\s*([\+\d][\d\s\.\-\(\)]{6,20})/i,
    /Mobile\s*[:\-]\s*([\+\d][\d\s\.\-\(\)]{6,20})/i,
    /Portable\s*[:\-]\s*([\+\d][\d\s\.\-\(\)]{6,20})/i,
  ];

  for (const p of patterns) {
    const m = body.match(p);
    if (m && m[1]) {
      const phone = m[1].trim();
      if (phone.replace(/\D/g, '').length >= 7) {
        return phone;
      }
    }
  }

  return undefined;
}

// ============================================================
// GUEST EMAIL
// ============================================================

export function extractGuestEmail(body: string): string | undefined {
  const m = body.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  if (m && m[1]) {
    const email = m[1].trim();
    if (!email.includes('airbnb.com') && !email.includes('noreply')) {
      return email;
    }
  }
  return undefined;
}

// ============================================================
// DETECT GUEST LANGUAGE
// ============================================================

export function detectGuestLanguage(body: string, subject?: string): string {
  const frWords = ['bonjour', 'merci', 'voyageur', 'reservation', 'arrivee', 'depart', 'nuit', 'logement'];
  const enWords = ['hello', 'thank', 'guest', 'booking', 'reservation', 'check-in', 'checkout', 'night', 'property'];

  const lowerBody = body.toLowerCase();
  let frScore = 0;
  let enScore = 0;

  for (const w of frWords) { if (lowerBody.includes(w)) frScore++; }
  for (const w of enWords) { if (lowerBody.includes(w)) enScore++; }

  if (frScore > enScore) return 'fr';
  if (enScore > frScore) return 'en';
  return 'fr';
}
