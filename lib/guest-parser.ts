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

// ============================================================
// GUEST NAME
// ============================================================

export function extractGuestName(subject: string, body: string): string | undefined {
  // Concatène corps + sujet (les deux passés dans n'importe quel ordre côté appelant)
  const text = stripInvisible(subject) + '\n' + stripInvisible(body);

  const patterns = [
    // "Nouvelle réservation confirmée! Fakri arrive le 17 avr." ← sujet Airbnb hôte FR
    /(?:Nouvelle\s+r[eé]servation\s+confirm[eé]e[^a-z]{0,3})([A-Za-z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+arrive/i,
    // "Fakri a réservé votre logement" ← sujet Airbnb hôte FR
    /([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+a\s+r[eé]serv[eé]/i,
    // "Fakri a demandé à réserver"
    /([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+a\s+demand[eé]\s+[àa]\s+r[eé]server/i,
    // "Le séjour de Fakri se termine"
    /[Ll]e\s+s[eé]jour\s+de\s+([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+se\s+termine/i,
    // "Fakri part aujourd'hui"
    /([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+part\s+aujourd/i,
    // "Fakri has booked your place" ← EN
    /([A-Z][a-z\u00C0-\u024F]+(?:\s+[A-Z][a-z\u00C0-\u024F]+)?)\s+has\s+booked/i,
    // Champ explicite
    /(?:Voyageur|Guest|Nom\s+complet|Full\s+name)\s*[:\-]\s*([A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F\s\-']{2,50})/i,
    // "Fakri arrives" ← EN
    /([A-Z][a-z\u00C0-\u024F]+(?:\s+[A-Z][a-z\u00C0-\u024F]+)?)\s+arrives?\s/i,
    // "Fakri a annulé sa réservation"
    /([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+a\s+annul[eé]/i,
    // "Fakri souhaite changer"
    /([A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+)?)\s+souhaite/i,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const name = m[1].trim();
      // Exclure les faux positifs évidents
      if (name.length >= 2 && name.length <= 60 &&
          !/^(Airbnb|Nouvelle|Votre|Check|Logement|Rappel|Booking|Confirm)/i.test(name)) {
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
