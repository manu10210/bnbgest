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
  hostPayout?: number;     // Ce que l'hôte reçoit réellement
  // Propriété
  propertyName?: string;
  confirmationCode?: string;
  // Statut
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  confidence: number;      // 0-100%
  // Champs spécifiques aux avis
  reviewRating?: number;   // 1-5 étoiles
  reviewComment?: string;  // Commentaire du voyageur
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
    /votre r[eé]servation est confirm[eé]e/i,
    /r[eé]servation accept[eé]e/i,
    /demande de r[eé]servation accept[eé]e/i,
    /f[eé]licitations.*r[eé]servation/i,
  ],
  new_en: [
    /reservation confirmed/i,
    /new reservation/i,
    /booking confirmation/i,
    /you have a new reservation/i,
    /booking confirmed/i,
    /reservation request accepted/i,
    /congratulations.*reservation/i,
  ],
  cancelled: [
    /annul[eé]/i, /cancelled/i, /cancellation/i,
  ],
  modified: [
    /modifi[eé]/i, /modified/i, /updated/i, /mis à jour/i,
  ],
  checkout: [
    /d[eé]part/i, /checkout/i, /check-out/i, /voyage termin[eé]/i, /s[eé]jour termin[eé]/i,
    /trip completed/i, /stay completed/i,
  ],
  reminder: [
    /rappel/i, /reminder/i, /dans\s+\d+\s+jour/i, /in\s+\d+\s+day/i,
    /pr[eé]par[e]z/i, /proch[ae]in[e]?\s+(arr[iî]v[eé]e?|s[eé]jour)/i,
    // Rappels d'évaluation hôte (hôte doit noter le voyageur, pas avis reçu)
    /attendent?\s+votre\s+commentaire/i,
    /attendent?\s+votre\s+[eé]valuation/i,
    /\d+\s+voyageurs?\s+attendent/i,
    /voyageurs?\s+attend(?:ent)?\s+votre/i,
    /laissez\s+(?:un\s+)?(?:avis|commentaire|[eé]valuation)\s+(?:sur|pour|[àa])\s+(?:votre\s+)?voyageur/i,
    /[eé]valuez\s+(?:votre\s+)?voyageur/i,
    /notez\s+(?:votre\s+)?voyageur/i,
    /rate\s+your\s+guest/i,
  ],
  review: [
    /nouvel?\s+avis/i, /new\s+review/i, /a\s+laiss[eé]\s+un\s+avis/i,
    /left\s+you\s+a\s+review/i, /[eé]valuation/i, /avis\s+re[cç]u/i,
    /review\s+received/i, /[eé]toile[s]?/i, /rated\s+you/i, /vous\s+a\s+not[eé]/i,
    // Avis reçu d'un voyageur (pas rappel hôte)
    /laissez\s+(?:un\s+)?(?:avis|commentaire)\s*$/i,
    /donnez\s+votre\s+avis/i,
    /write\s+a\s+review/i,
    /leave\s+a\s+review/i,
  ],
  payout: [
    /versement/i, /virement/i, /payout/i, /nous\s+vous\s+avons\s+envoy[eé]/i,
    /nous\s+avons\s+envoy[eé]\s+un\s+versement/i, /payment\s+sent/i,
    /votre\s+paiement/i, /your\s+payout/i, /r[eè]glement\s+effectu[eé]/i,
    /vir[eé]\s+sur\s+votre\s+compte/i, /transfer[eé]\s+vers/i,
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
  // (normalisation: accents retirés, points retirés avant lookup)
  const monthsFr: Record<string, string> = {
    janvier:'01', fevrier:'02', mars:'03', avril:'04',
    mai:'05', juin:'06', juillet:'07', aout:'08',
    septembre:'09', octobre:'10', novembre:'11', decembre:'12',
    // Abréviations
    janv:'01', fevr:'02', avr:'04', juil:'07', sept:'09', oct:'10', nov:'11', dec:'12',
  };
  const normStr = (s: string) => s.toLowerCase().replace(/\./g, '')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c');
  const textFr = raw.match(/(\d{1,2})\s+([\wéèûîà]+\.?)\s+(\d{4})/i);
  if (textFr && monthsFr[normStr(textFr[2])]) {
    return `${textFr[3]}-${monthsFr[normStr(textFr[2])]}-${textFr[1].padStart(2, '0')}`;
  }

  // Format Airbnb SANS année : "10 avr." / "10 avr" / "13 avril"
  // → on déduit l'année courante (ou prochaine si la date est déjà passée de > 6 mois)
  const monthsFrShort: Record<string, string> = {
    jan:'01', janv:'01',
    fev:'02', fevr:'02',
    mars:'03',
    avr:'04', avril:'04',
    mai:'05',
    juin:'06',
    juil:'07', juillet:'07',
    aout:'08',
    sept:'09', septembre:'09',
    oct:'10', octobre:'10',
    nov:'11', novembre:'11',
    dec:'12', decembre:'12',
  };
  const textNoYear = raw.match(/^(\d{1,2})\s+([\wéèûîàâ]+\.?)$/i);
  if (textNoYear) {
    // Normaliser: enlever points, déaccenter (é→e, û→u, etc.)
    const normalize = (s: string) => s.toLowerCase().replace(/\./g, '')
      .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
      .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c');
    const key = normalize(textNoYear[2]);
    const monthNum = monthsFrShort[key];
    if (monthNum) {
      const now = new Date();
      const year = now.getFullYear();
      const candidate = `${year}-${monthNum}-${textNoYear[1].padStart(2, '0')}`;
      // Si la date candidate est déjà passée de plus de 6 mois, utiliser année+1
      const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < -180) return `${year + 1}-${monthNum}-${textNoYear[1].padStart(2, '0')}`;
      return candidate;
    }
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
    // Revenus hôte Airbnb (format notification de réservation)
    /vos\s+revenus\s+pour\s+ce\s+s[eé]jour\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /votre\s+revenu\s+estim[eé]\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /votre\s+revenu\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /revenu\s+de\s+l[''`]h[oô]te\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /revenus?\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /host\s+earnings?\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /earnings?\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /montant\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /prix\s+total\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /prix\s+de\s+la\s+nuit[eé]e?\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
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

function extractCleaningFee(text: string): number | undefined {
  const patterns = [
    /frais\s+(?:de\s+)?m[eé]nage\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /cleaning\s+fee\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /frais\s+nettoyage\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return undefined;
}

function extractServiceFee(text: string): number | undefined {
  const patterns = [
    /frais\s+de\s+service\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /service\s+fee\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /commission\s+airbnb\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return undefined;
}

function extractHostPayout(text: string): number | undefined {
  const patterns = [
    /versement\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /vous\s+recevrez?\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /host\s+payout\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
    /r[eé]mun[eé]ration\s*[:\s]+([€$£]?\s*[\d\s.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return undefined;
}

function extractGuestPhone(text: string): string | undefined {
  const patterns = [
    /t[eé]l[eé]phone?\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /phone\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /mobile\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /\b(\+?[0-9]{1,3}[\s\-]?(?:\([0-9]{1,4}\)[\s\-]?)?[0-9]{6,10})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const phone = m[1].trim().replace(/\s+/g, ' ').slice(0, 20);
      if (phone.replace(/\D/g, '').length >= 8) return phone;
    }
  }
  return undefined;
}

function extractGuestEmail(text: string): string | undefined {
  // Chercher une adresse email de voyageur (pas airbnb)
  const patterns = [
    /e-?mail\s+voyageur\s*[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /guest\s+e-?mail\s*[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /contact\s*[:\s]+([a-zA-Z0-9._%+\-]+@(?!airbnb)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /(?:^|\s)([a-zA-Z0-9._%+\-]+@(?!airbnb)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})(?:\s|$)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const email = m[1].trim().toLowerCase();
      if (!email.includes('airbnb') && !email.includes('noreply') && !email.includes('automated')) {
        return email;
      }
    }
  }
  return undefined;
}

function extractReviewRating(text: string): number | undefined {
  // Chercher une note 1-5 étoiles dans le corps de l'email
  const patterns = [
    /(\d)\s*[\/\sur]\s*5\s*[eé]toile/i,
    /(\d)\s*star[s]?\s*out\s*of\s*5/i,
    /note\s*(?:globale)?\s*[:\-]\s*(\d)/i,
    /overall\s+rating\s*[:\-]\s*(\d)/i,
    /[eé]toile[s]?\s*[:\-]\s*(\d)/i,
    /rated?\s*(\d)\s*[eé]toile/i,
    /rated?\s*(\d)\s*star/i,
    /(\d)\s*[★⭐]/,
    /[★⭐]\s*(\d)/,
    /(\d)\s*\/\s*5/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const rating = parseInt(m[1]);
      if (rating >= 1 && rating <= 5) return rating;
    }
  }
  return undefined;
}

function extractReviewComment(text: string): string | undefined {
  // Extraire le commentaire laissé par le voyageur
  const patterns = [
    /(?:commentaire|comment|avis|review)\s*[:\-]\s*"([^"]{10,500})"/i,
    /(?:ils?\s+ont?\s+(?:dit|[eé]crit)|they\s+(?:said|wrote))\s*[:\-]?\s*"([^"]{10,500})"/i,
    /(?:a\s+(?:laiss[eé]|[eé]crit)|wrote)\s*:\s*"([^"]{10,500})"/i,
    /"([^"]{20,400})"/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      return m[1].trim().slice(0, 500);
    }
  }
  return undefined;
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

function extractGuestName(text: string, subject?: string): string {
  // ── Depuis le sujet (emails hôte Airbnb: "Prénom a réservé votre logement") ──
  if (subject) {
    const subjectPatterns = [
      /^([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)\s+a\s+r[eé]serv[eé]/,
      /^([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)\s+souhaite\s+r[eé]server/,
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+has\s+(?:booked|reserved)/,
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+wants\s+to\s+book/,
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const name = m[1].trim().slice(0, 60);
        if (name.length >= 2 && !/airbnb/i.test(name)) return name;
      }
    }
  }

  // ── Depuis le corps du mail ────────────────────────────────────────────────
  const patterns = [
    // FR — format hôte Airbnb
    /([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+){0,2})\s+a\s+r[eé]serv[eé]/,
    /([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+){0,2})\s+souhaite\s+r[eé]server/,
    /nouveau\s+voyageur\s*:\s*([^\n\r<]{2,60})/i,
    /r[eé]servation\s+de\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+){0,2})/i,
    /voyageur[s]?\s*:\s*([^\n\r<]+)/i,
    /nom\s+du\s+voyageur\s*:\s*([^\n\r<]+)/i,
    /nom\s*:\s*([^\n\r<]+)/i,
    // EN — format hôte Airbnb
    /([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+){0,2})\s+has\s+(?:booked|reserved)/,
    /([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+){0,2})\s+wants\s+to\s+book/,
    /new\s+guest\s*:\s*([^\n\r<]{2,60})/i,
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

function extractPropertyName(text: string, subject?: string): string | undefined {
  // ── Patterns dans le corps du mail ────────────────────────────────────────
  const bodyPatterns = [
    /logement\s*:\s*([^\n\r<]{5,80})/i,
    /propriété\s*:\s*([^\n\r<]{5,80})/i,
    /listing\s*:\s*([^\n\r<]{5,80})/i,
    /property\s*:\s*([^\n\r<]{5,80})/i,
    /vous\s+restez\s+à\s*:\s*([^\n\r<]{5,80})/i,
    /staying\s+at\s*:\s*([^\n\r<]{5,80})/i,
    // Patterns réels emails Airbnb (hôte/voyageur)
    /votre\s+logement\s+:\s*([^\n\r<]{5,80})/i,
    /votre\s+annonce\s+:\s*([^\n\r<]{5,80})/i,
    /annonce\s*:\s*([^\n\r<]{5,80})/i,
    /titre\s+de\s+l['']annonce\s*:\s*([^\n\r<]{5,80})/i,
    /r[eé]servation\s+(?:pour|de|à)\s+([^\n\r<,\.]{5,60})\s+(?:du|pour)/i,
    /a\s+r[eé]serv[eé]\s+(?:votre\s+logement\s+)?([^\n\r<,\.]{5,60})\s+(?:du|pour)/i,
    /your\s+listing\s*:\s*([^\n\r<]{5,80})/i,
    /your\s+place\s*:\s*([^\n\r<]{5,80})/i,
    /reservation\s+at\s+([^\n\r<,\.]{5,60})/i,
    /confirmed\s+at\s+([^\n\r<,\.]{5,60})/i,
    /trip\s+to\s+([^\n\r<,\.]{5,60})/i,
    /voyage\s+[àa]\s+([^\n\r<,\.]{5,60})/i,
  ];
  for (const p of bodyPatterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/<[^>]*>/g, '').slice(0, 80);
  }

  // ── Extraction depuis le sujet de l'email ─────────────────────────────────
  if (subject) {
    const subjectPatterns = [
      // "Réservation confirmée – NomLogement"  /  "Booking confirmed – NomLogement"
      /(?:r[eé]servation\s+(?:confirm[eé]e?|accept[eé]e?)|booking\s+confirmed?)\s*[–\-:]\s*(.{5,60})/i,
      // "Rappel : NomLogement"
      /rappel\s*[–\-:]\s*(.{5,60})/i,
      // "Votre voyage à/chez NomLogement"
      /voyage\s+(?:[àa]|chez|pour)\s+(.{5,60})/i,
      // "Votre séjour à NomLogement"
      /s[eé]jour\s+(?:[àa]|chez)\s+(.{5,60})/i,
      // "Nouveau message de NomVoyageur concernant NomLogement"
      /concernant\s+(.{5,60})/i,
      // "Check-in – NomLogement"
      /check.?(?:in|out)\s*[–\-:]\s*(.{5,60})/i,
      // "Demande de réservation – NomLogement"
      /demande\s+de\s+r[eé]servation\s*[–\-:]\s*(.{5,60})/i,
      // "[Airbnb] NomLogement – …"  ou  "Airbnb – NomLogement"
      /\[airbnb\]\s*(.{5,60}?)(?:\s*[–\-]|$)/i,
      /airbnb\s*[–\-]\s*(.{5,60})/i,
      // "NomVoyageur arrive chez NomLogement"
      /(?:arrive|s['']installe)\s+(?:chez|[àa])\s+(.{5,60})/i,
      // "Votre annonce NomLogement a reçu…"
      /(?:votre\s+annonce|your\s+listing)\s+(.{5,60?})\s+(?:a\s+re[cç]u|has)/i,
      // "Réservation pour NomLogement"
      /r[eé]servation\s+pour\s+(.{5,60})/i,
      // "NomLogement – confirmation de séjour" (nom en début de sujet avant tiret)
      /^(.{5,60}?)\s*[–\-]\s*(?:r[eé]servation|confirm|rappel|check|s[eé]jour|arriv)/i,
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const candidate = m[1].trim()
          .replace(/\s*\|.*$/, '')
          .replace(/\s*-\s*Airbnb.*$/i, '')
          .replace(/\s*–\s*Airbnb.*$/i, '')
          .replace(/\.$/, '')
          .trim()
          .slice(0, 80);
        if (candidate.length >= 5) return candidate;
      }
    }

    // ── Dernier recours : sujet entier nettoyé comme nom candidat ────────────
    // Supprime les mots génériques Airbnb pour isoler le nom du logement
    const cleaned = subject
      .replace(/airbnb/gi, '')
      .replace(/r[eé]servation\s+(confirm[eé]e?|accept[eé]e?|re[cç]ue?)/gi, '')
      .replace(/booking\s+(confirmed?|received?)/gi, '')
      .replace(/nouvelle?\s+r[eé]servation/gi, '')
      .replace(/rappel\s+d[e']?\s*arriv[eé]e?/gi, '')
      .replace(/rappel\s+check.?in/gi, '')
      .replace(/check.?(?:in|out)/gi, '')
      .replace(/confirmation\s+de\s+s[eé]jour/gi, '')
      .replace(/\[|\]/g, '')
      .replace(/[–\-:]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleaned.length >= 5) return cleaned.slice(0, 80);
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
  // Priorité : new > cancelled > modified > checkout > reminder > review > payout
  // On teste new_fr/new_en EN PREMIER pour éviter qu'un email de confirmation
  // soit mal classé (ex: sujet contenant "annulé" dans une autre langue)
  if (
    SUBJECT_PATTERNS.new_fr.some(p => p.test(subject)) ||
    SUBJECT_PATTERNS.new_en.some(p => p.test(subject))
  ) bookingType = 'new';
  else if (SUBJECT_PATTERNS.cancelled.some(p => p.test(subject))) bookingType = 'cancelled';
  else if (SUBJECT_PATTERNS.modified.some(p => p.test(subject))) bookingType = 'modified';
  else if (SUBJECT_PATTERNS.checkout.some(p => p.test(subject))) bookingType = 'checkout';
  else if (SUBJECT_PATTERNS.reminder.some(p => p.test(subject))) bookingType = 'reminder';  // reminder AVANT review (rappels hôte d'évaluer classés reminder)
  else if (SUBJECT_PATTERNS.review.some(p => p.test(subject))) bookingType = 'review';
  else if (
    SUBJECT_PATTERNS.payout.some(p => p.test(subject)) ||
    SUBJECT_PATTERNS.payout.some(p => p.test(body.slice(0, 500)))
  ) bookingType = 'payout';

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
    // Airbnb sans année: "Arrivée : 10 avr." / "10 avr. – 13 avr."
    /(?:arriv[eé]e?|check.?in|entr[eé]e?)\s*[:\-–]\s*(\d{1,2}\s+[a-zà-ÿ]{3,10}\.?)\b/i,
    /\b(\d{1,2}\s+(?:janv?|févr?|mars|avr\.?|mai|juin|juil\.?|août|sept?|oct\.?|nov\.?|déc\.?)\b)\s*[–\-]/i,
  ];
  const checkOutPatterns = [
    /(?:d[eé]part|check.?out|sortie)\s*[:\-–]\s*([\d\w\/\.\s,àáâãäåèéêëìíîïòóôõöùúûü]+(?:\d{4}))/i,
    /au\s+([\d]{1,2}[\s\/\-\.]([\d]{1,2}|[\wéèûî]+)[\s\/\-\.][\d]{4})/i,
    /to\s+([\w\s,]+\d{4})/i,
    // Airbnb sans année: "Départ : 13 avr." / "10 avr. – 13 avr."
    /(?:d[eé]part|check.?out|sortie)\s*[:\-–]\s*(\d{1,2}\s+[a-zà-ÿ]{3,10}\.?)\b/i,
    /[–\-]\s*(\d{1,2}\s+(?:janv?|févr?|mars|avr\.?|mai|juin|juil\.?|août|sept?|oct\.?|nov\.?|déc\.?)\b)/i,
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

  // Les emails de versement n'ont pas forcément de dates de séjour → on les accepte quand même
  if (!checkIn || !checkOut) {
    if (bookingType !== 'payout') return null;  // Pas de dates = email non parsable (sauf payout)
  }

  // 5. Calculer les nuits
  const nights = (checkIn && checkOut) ? Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )) : 0;

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
    guestName: extractGuestName(text, subject),
    guestEmail: extractGuestEmail(text),
    guestPhone: extractGuestPhone(text),
    guests: extractGuests(text),
    checkIn: checkIn ?? receivedAt.split('T')[0],
    checkOut: checkOut ?? receivedAt.split('T')[0],
    nights,
    totalPrice: price,
    currency: text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : 'USD',
    cleaningFee: extractCleaningFee(text),
    serviceFee: extractServiceFee(text),
    hostPayout: extractHostPayout(text),
    propertyName: extractPropertyName(text, subject),
    confirmationCode,
    bookingType,
    confidence: Math.min(100, confidence),
    reviewRating: bookingType === 'review' ? extractReviewRating(text) : undefined,
    reviewComment: bookingType === 'review' ? extractReviewComment(text) : undefined,
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
