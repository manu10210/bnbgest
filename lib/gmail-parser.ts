/**
 * 📧 Gmail Parser — Extraction automatique des réservations Airbnb
 *
 * Détecte et parse les emails de confirmation Airbnb depuis Gmail API.
 * Supporte : French + English Airbnb emails
 */

export interface ParsedBooking {
  source: 'gmail';
  messageId: string;
  subject: string;
  receivedAt: string;
  // Voyageur
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guests: number;
  // Séjour
  checkIn: string;         // ISO date YYYY-MM-DD
  checkOut: string;        // ISO date YYYY-MM-DD
  nights: number;
  // Finance
  totalPrice: number;
  currency: string;
  cleaningFee?: number;
  serviceFee?: number;
  // Propriété
  propertyName?: string;
  confirmationCode?: string;
  // Statut
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder';
  confidence: number;      // 0-100%
}

// ─── Patterns de détection des emails Airbnb ───────────────────────────────

const AIRBNB_SENDERS = [
  'automated@airbnb.com',
  'express@airbnb.com',
  'no-reply@airbnb.com',
  'reply@airbnb.com',
  'support@airbnb.com',
];

const SUBJECT_PATTERNS = {
  new_fr: [
    /confirmation de r[eé]servation/i,
    /nouvelle r[eé]servation/i,
    /r[eé]servation confirm[eé]e/i,
    /vous avez une nouvelle r[eé]servation/i,
  ],
  new_en: [
    /reservation confirmed/i,
    /new reservation/i,
    /booking confirmation/i,
    /you have a new reservation/i,
  ],
  cancelled: [
    /annul[eé]/i, /cancelled/i, /cancellation/i,
  ],
  modified: [
    /modifi[eé]/i, /modified/i, /updated/i, /mis à jour/i,
  ],
};

// ─── Extracteurs de données ─────────────────────────────────────────────────

function extractDate(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1] || match[0];
      return normalizeDate(raw);
    }
  }
  return null;
}

function normalizeDate(raw: string): string {
  // Format ISO déjà OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Format DD/MM/YYYY ou DD-MM-YYYY
  const dmy = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  // Format YYYY/MM/DD
  const ymd = raw.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  // Format textuel français: "12 avril 2025", "lundi 14 avril"
  const monthsFr: Record<string, string> = {
    janvier:'01', février:'02', fevrier:'02', mars:'03', avril:'04',
    mai:'05', juin:'06', juillet:'07', août:'08', aout:'08',
    septembre:'09', octobre:'10', novembre:'11', décembre:'12', decembre:'12',
  };
  const textFr = raw.match(/(\d{1,2})\s+([\wéèûî]+)\s+(\d{4})/i);
  if (textFr && monthsFr[textFr[2].toLowerCase()]) {
    return `${textFr[3]}-${monthsFr[textFr[2].toLowerCase()]}-${textFr[1].padStart(2, '0')}`;
  }

  // Format textuel anglais: "April 12, 2025" ou "Apr 12, 2025"
  const monthsEn: Record<string, string> = {
    january:'01', jan:'01', february:'02', feb:'02', march:'03', mar:'03',
    april:'04', apr:'04', may:'05', june:'06', jun:'06', july:'07', jul:'07',
    august:'08', aug:'08', september:'09', sep:'09', october:'10', oct:'10',
    november:'11', nov:'11', december:'12', dec:'12',
  };
  const textEn = raw.match(/([\w]+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (textEn && monthsEn[textEn[1].toLowerCase()]) {
    return `${textEn[3]}-${monthsEn[textEn[1].toLowerCase()]}-${textEn[2].padStart(2, '0')}`;
  }

  return raw;
}

function extractPrice(text: string): number {
  // Cherche montant total — ordre de priorité
  const patterns = [
    /total\s*[:\s]\s*([€$£]?\s*[\d\s.,]+)/i,
    /montant total\s*[:\s]\s*([€$£]?\s*[\d\s.,]+)/i,
    /total amount\s*[:\s]\s*([€$£]?\s*[\d\s.,]+)/i,
    /vous gagnez\s*([€$£]?\s*[\d\s.,]+)/i,
    /you earn\s*([€$£]?\s*[\d\s.,]+)/i,
    /payout\s*[:\s]\s*([€$£]?\s*[\d\s.,]+)/i,
    /([€$£]\s*[\d\s.,]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return 0;
}

function extractGuests(text: string): number {
  const patterns = [
    /(\d+)\s*voyageur[s]?/i,
    /(\d+)\s*guest[s]?/i,
    /(\d+)\s*personne[s]?/i,
    /(\d+)\s*person[s]?/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const v = parseInt(m[1]);
      if (v >= 1 && v <= 20) return v;
    }
  }
  return 1;
}

function extractGuestName(text: string): string {
  const patterns = [
    // FR
    /([A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-zàâéèêëîïôùûü]+(?:\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-zàâéèêëîïôùûü]+){0,2})\s+a\s+r[eé]serv[eé]/,
    /r[eé]servation\s+de\s+([A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-zàâéèêëîïôùûü]+(?:\s+[A-ZÀÂÉÈÊËÎÏÔÙÛÜ][a-zàâéèêëîïôùûü]+){0,2})/i,
    /voyageur[s]?\s*:\s*([^\n\r<]+)/i,
    /nom\s*:\s*([^\n\r<]+)/i,
    // EN
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+has\s+booked/,
    /guest\s*:\s*([^\n\r<]+)/i,
    /name\s*:\s*([^\n\r<]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/<[^>]*>/g, '').slice(0, 60);
      if (name.length >= 2 && !/airbnb/i.test(name)) return name;
    }
  }
  return 'Voyageur Airbnb';
}

function extractConfirmationCode(text: string): string | undefined {
  const patterns = [
    /code\s+de\s+confirmation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /confirmation\s+code\s*[:\s]+([A-Z0-9]{6,12})/i,
    /r[eé]f[eé]rence\s*[:\s]+([A-Z0-9]{6,12})/i,
    /n[°o]\s*r[eé]servation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /booking\s*#\s*([A-Z0-9]{6,12})/i,
    /\b([A-Z]{2,4}[0-9]{4,8})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].toUpperCase();
  }
  return undefined;
}

function extractPropertyName(text: string): string | undefined {
  const patterns = [
    /logement\s*:\s*([^\n\r<]{5,80})/i,
    /propriété\s*:\s*([^\n\r<]{5,80})/i,
    /listing\s*:\s*([^\n\r<]{5,80})/i,
    /property\s*:\s*([^\n\r<]{5,80})/i,
    /vous\s+restez\s+à\s*:\s*([^\n\r<]{5,80})/i,
    /staying\s+at\s*:\s*([^\n\r<]{5,80})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/<[^>]*>/g, '').slice(0, 80);
  }
  return undefined;
}

// ─── Parser principal ───────────────────────────────────────────────────────

export function parseAirbnbEmail(
  messageId: string,
  subject: string,
  from: string,
  body: string,    // texte brut décodé
  receivedAt: string,
): ParsedBooking | null {
  // 1. Vérifier que c'est bien un email Airbnb
  const isAirbnbSender = AIRBNB_SENDERS.some(s => from.toLowerCase().includes(s));
  const isAirbnbSubject = /airbnb/i.test(subject) || /r[eé]servation/i.test(subject);
  if (!isAirbnbSender && !isAirbnbSubject) return null;

  // 2. Déterminer le type de mail
  let bookingType: ParsedBooking['bookingType'] = 'new';
  if (SUBJECT_PATTERNS.cancelled.some(p => p.test(subject))) bookingType = 'cancelled';
  else if (SUBJECT_PATTERNS.modified.some(p => p.test(subject))) bookingType = 'modified';

  // 3. Nettoyer le HTML si présent
  const text = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ');

  // 4. Extraire les dates
  const checkInPatterns = [
    /(?:arriv[eé]e?|check.?in|entr[eé]e?)\s*[:\-–]\s*([\d\w\/\.\s,àáâãäåèéêëìíîïòóôõöùúûü]+(?:\d{4}))/i,
    /du\s+([\d]{1,2}[\s\/\-\.]([\d]{1,2}|[\wéèûî]+)[\s\/\-\.][\d]{4})/i,
    /from\s+([\w\s,]+\d{4})/i,
  ];
  const checkOutPatterns = [
    /(?:d[eé]part|check.?out|sortie)\s*[:\-–]\s*([\d\w\/\.\s,àáâãäåèéêëìíîïòóôõöùúûü]+(?:\d{4}))/i,
    /au\s+([\d]{1,2}[\s\/\-\.]([\d]{1,2}|[\wéèûî]+)[\s\/\-\.][\d]{4})/i,
    /to\s+([\w\s,]+\d{4})/i,
  ];

  let checkIn = extractDate(text, checkInPatterns);
  let checkOut = extractDate(text, checkOutPatterns);

  // Fallback : chercher deux dates proches dans le texte
  if (!checkIn || !checkOut) {
    const allDates = [...text.matchAll(/\b(\d{1,2}[\s\/\-\.](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-\.]\d{4})\b/gi)].map(m => normalizeDate(m[1])).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (allDates.length >= 2) {
      checkIn = checkIn || allDates[0];
      checkOut = checkOut || allDates[1];
    }
  }

  if (!checkIn || !checkOut) return null;  // Pas de dates = email non parsable

  // 5. Calculer les nuits
  const nights = Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  ));

  // 6. Calculer la confiance
  let confidence = 50;
  if (isAirbnbSender) confidence += 20;
  if (checkIn && checkOut) confidence += 15;
  const price = extractPrice(text);
  if (price > 0) confidence += 10;
  const confirmationCode = extractConfirmationCode(text);
  if (confirmationCode) confidence += 5;

  return {
    source: 'gmail',
    messageId,
    subject: subject.slice(0, 200),
    receivedAt,
    guestName: extractGuestName(text),
    guests: extractGuests(text),
    checkIn,
    checkOut,
    nights,
    totalPrice: price,
    currency: text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : 'USD',
    propertyName: extractPropertyName(text),
    confirmationCode,
    bookingType,
    confidence: Math.min(100, confidence),
  };
}

// ─── Décodeur base64 Gmail ──────────────────────────────────────────────────

export function decodeGmailBody(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    return decodeURIComponent(
      binary.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
  } catch {
    return '';
  }
}

export function extractBodyFromPayload(payload: GmailPayload): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  if (payload.parts) {
    // Préférer text/plain, sinon text/html
    const plain = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeGmailBody(plain.body.data);
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) return decodeGmailBody(html.body.data);
    // Récursif pour multipart
    for (const part of payload.parts) {
      const text = extractBodyFromPayload(part);
      if (text) return text;
    }
  }
  return '';
}

export interface GmailPayload {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPayload[];
}
