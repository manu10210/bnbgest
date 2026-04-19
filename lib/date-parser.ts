export const MOIS_FR: Record<string, string> = {
  janvier: '01', fevrier: '02', mars: '03', avril: '04',
  mai: '05', juin: '06', juillet: '07', aout: '08',
  septembre: '09', octobre: '10', novembre: '11', decembre: '12',
  janv: '01', jan: '01', fevr: '02', fev: '02', feb: '02',
  avr: '04', juil: '07', sept: '09', oct: '10', nov: '11', dec: '12'
};

export const MOIS_EN: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

export const ALL_MONTHS_RE = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|juillet|ao[uû]t|sept?\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)`;

export function cleanString(s: string) {
  return s.toLowerCase()
    .replace(/\./g, '')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c')
    .replace(/[\xa0\t]+/g, ' ').replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Normalise une date textuelle vers le format ISO YYYY-MM-DD
 */
export function normalizeDate(raw: string, referenceDate: Date = new Date()): string | undefined {
  let s = raw.replace(/[\xa0\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  const ymd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  s = cleanString(s);
  
  const frMatch = s.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (frMatch && MOIS_FR[frMatch[2]]) {
    return resolveYear(frMatch[1], MOIS_FR[frMatch[2]], frMatch[3], referenceDate);
  }

  const enMatch = s.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (enMatch && MOIS_EN[enMatch[1]]) {
    return resolveYear(enMatch[2], MOIS_EN[enMatch[1]], enMatch[3], referenceDate);
  }

  return undefined;
}

function resolveYear(day: string, month: string, yearStr: string | undefined, refDate: Date): string {
  const d = day.padStart(2, '0');
  let y = refDate.getFullYear();
  if (yearStr) {
    y = parseInt(yearStr, 10);
    if (y < 100) y += 2000;
    return `${y}-${month}-${d}`;
  }
  
  const candidate = `${y}-${month}-${d}`;
  const diffDays = (new Date(candidate).getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Si la date est loin dans le passé, on suppose que c'est l'année prochaine
  if (diffDays < -200) y += 1;
  
  return `${y}-${month}-${d}`;
}

/**
 * Extrait les dates d'arrivée et de départ depuis un email Airbnb
 */
export function extractBookingDates(text: string, subject: string): { checkIn?: string, checkOut?: string } {
  const combined = (subject + ' \n ' + text);
  let checkIn: string | undefined;
  let checkOut: string | undefined;
  
  // Plage compacte FR/EN: "10-13 avril 2026"
  let m = combined.match(new RegExp(`(\\d{1,2})\\s*[\\-–]\\s*(\\d{1,2})\\s+(${ALL_MONTHS_RE})(?:,?\\s+(\\d{4}))?`, 'i'));
  if (m) {
    checkIn = normalizeDate(`${m[1]} ${m[3]} ${m[4] || ''}`);
    checkOut = normalizeDate(`${m[2]} ${m[3]} ${m[4] || ''}`);
  }

  // Plage double mois: "10 mars - 13 avril 2026" ou "du 10 mars au 13 avril 2026"
  if (!checkIn || !checkOut) {
      m = combined.match(new RegExp(`(?:du\\s+|from\\s+)?(\\d{1,2}\\s+${ALL_MONTHS_RE}(?:\\s+\\d{4})?)\\s*[\\-–a]\\s*(?:u\\s+)?(?:to\\s+)?(\\d{1,2}\\s+${ALL_MONTHS_RE}(?:\\s+\\d{4})?)`, 'i'));
      if (m) {
        checkIn = normalizeDate(m[1]);
        checkOut = normalizeDate(m[2]);
      }
  }

  // Check statique "Arrivée: ... Départ: ..."
  if (!checkIn) {
      m = combined.match(new RegExp(`(?:arriv[eé]e|check[-\\s]?in|entr[eé]e|from)\\s*[:\\-–]?\\s*(?:(?:lun|mar|mer|jeu|ven|sam|dim)(?:edi|anche)?\\s+)?(\\d{1,2}\\s+${ALL_MONTHS_RE}(?:\\s+\\d{4})?)`, 'i'));
      if (m) checkIn = normalizeDate(m[1]);
  }
  if (!checkOut) {
      m = combined.match(new RegExp(`(?:d[eé]part|check[-\\s]?out|sortie|to)\\s*[:\\-–]?\\s*(?:(?:lun|mar|mer|jeu|ven|sam|dim)(?:edi|anche)?\\s+)?(\\d{1,2}\\s+${ALL_MONTHS_RE}(?:\\s+\\d{4})?)`, 'i'));
      if (m) checkOut = normalizeDate(m[1]);
  }

  return { checkIn, checkOut };
}

export function normalizeTime(raw: string): string {
  // "15h00" → "15:00" / "3 PM" → "15:00" / "15:0" → "15:00" / "15h" → "15:00"
  let s = raw.trim().replace(/\s+/g, '');
  s = s.replace(/partir/ig, '').replace(/de/ig, '').replace(/avant/ig, '');
  // Format "15h00" ou "15h"
  const hm = s.match(/^(\d{1,2})h(\d{0,2})$/i);
  if (hm) return `${hm[1].padStart(2, '0')}:${(hm[2] || '00').padStart(2, '0')}`;
  // Format "15:00" ou "15:0"
  const colon = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2].padStart(2, '0')}`;
  // Format "3 PM" / "11AM"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?([AaPp][Mm])$/);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const min = ampm[2] || '00';
    const period = ampm[3].toLowerCase();
    if (period === 'pm' && h < 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  return raw;
}

export function extractCheckInTime(text: string): string | undefined {
  const patterns = [
    /heure(?:\s+d[''e])?\s*arriv[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s+time\s*[:\-–]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /arriv[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c))/i,
    /[àa]\s+partir\s+de\s+(\d{1,2}[h:]\d{0,2})/i,
    /after\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    /heure(?:\s+d[''e])?\s*entr[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}

export function extractCheckOutTime(text: string): string | undefined {
  const patterns = [
    /heure(?:\s+de)?\s*d[eé]part\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s+time\s*[:\-–]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /d[eé]part\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c))/i,
    /avant\s+(\d{1,2}[h:]\d{2})/i,
    /before\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    /heure(?:\s+de)?\s*sortie\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}
