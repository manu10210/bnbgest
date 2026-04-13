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

// ─── Expéditeurs connus Airbnb ──────────────────────────────────────────────
// Airbnb utilise plusieurs domaines : automated@, express@, no-reply@, reply@
// Les notifications hôtes viennent principalement de automated@airbnb.com
const AIRBNB_SENDERS = [
  'automated@airbnb.com',
  'express@airbnb.com',
  'no-reply@airbnb.com',
  'reply@airbnb.com',
  'support@airbnb.com',
  'airbnb.com',  // domaine générique pour capturer toute adresse @airbnb.com
];

// ─── Patterns de sujets ─────────────────────────────────────────────────────
// ORDRE CRITIQUE : new > cancelled > modified > checkout > reminder > review > payout
// Basés sur les vrais sujets Airbnb observés 2024-2026 (FR + EN)

// ─── Emails à IGNORER (informatifs, maintenance, marketing) ─────────────────
// Ces emails ne correspondent à aucune réservation — retourner null immédiatement
const IGNORED_PATTERNS = [
  // Maintenance / Actions requises sur les annonces
  /plusieurs\s+annonces?\s+n[eé]cessitent?\s+votre\s+attention/i,
  /annonces?\s+n[eé]cessitent?\s+votre\s+attention/i,
  /votre\s+attention\s+est\s+requise/i,
  /action\s+requise\s+sur\s+votre\s+annonce/i,
  /action\s+n[eé]cessaire\s+sur\s+votre\s+annonce/i,
  /mise\s+[àa]\s+jour\s+de\s+votre\s+annonce/i,
  /mettez?\s+[àa]\s+jour\s+votre\s+annonce/i,
  /action\s+required.*listing/i,
  /listing.*requires?\s+your\s+attention/i,
  /update\s+your\s+listing/i,
  // Newsletters / Conseils / Opportunités
  /conseils?\s+pour\s+les\s+h[oô]tes?/i,
  /ressources?\s+pour\s+les\s+h[oô]tes?/i,
  /bonnes?\s+pratiques?\s+airbnb/i,
  /am[eé]liorez?\s+votre\s+annonce/i,
  /augmentez?\s+vos\s+revenus/i,
  /optimisez?\s+vos\s+tarifs/i,
  /host\s+tips?/i,
  /host\s+resources?/i,
  /superh[oô]te/i,
  /superhost/i,
  // Notifications de politique / Conditions
  /politique\s+de\s+r[eé]mun[eé]ration/i,
  /mise\s+[àa]\s+jour\s+des\s+conditions/i,
  /modification\s+des\s+conditions\s+d[''']utilisation/i,
  /nouvelles?\s+conditions\s+g[eé]n[eé]rales/i,
  /terms\s+of\s+service/i,
  /policy\s+update/i,
  // Sécurité / Compte
  /connexion\s+[àa]\s+votre\s+compte/i,
  /votre\s+compte\s+airbnb/i,
  /v[eé]rifiez?\s+votre\s+adresse/i,
  /r[eé]initialisez?\s+votre\s+mot\s+de\s+passe/i,
  /sign.?in\s+to\s+your\s+account/i,
  /verify\s+your\s+email/i,
  /reset\s+your\s+password/i,
  // Messagerie sans réservation
  /a\s+r[eé]pondu\s+[àa]\s+votre\s+message/i,
  /vous\s+a\s+envoy[eé]\s+un\s+message/i,
  /vous\s+avez\s+un\s+nouveau\s+message/i,
  /new\s+message\s+from/i,
  /replied\s+to\s+your\s+message/i,
  /sent\s+you\s+a\s+message/i,
  // Sinistres / Remboursements / AirCover / Réclamations financières
  /vous\s+avez\s+demand[eé]\s+de\s+l[''']argent/i,
  /a\s+demand[eé]\s+de\s+l[''']argent/i,
  /demande\s+de\s+remboursement/i,
  /remboursement\s+demand[eé]/i,
  /r[eé]clamation\s+(?:soumise|envoy[eé]e?|en\s+cours)/i,
  /sinistre\s+(?:signal[eé]|ouvert|soumis)/i,
  /aircover/i,
  /protection\s+h[oô]te/i,
  /dommage[s]?\s+signal[eé][s]?/i,
  /signaler\s+(?:un\s+)?(?:dommage|probl[eè]me|sinistre)/i,
  /you\s+requested\s+money\s+from/i,
  /money\s+request/i,
  /reimbursement\s+request/i,
  /damage\s+claim/i,
  /resolution\s+center/i,
  /centre\s+de\s+r[eé]solution/i,
  // Sujets corrompus / URLs de tracking Airbnb encodées (base64, paramètres URL)
  // Ex: "661?c=.pi80.pkaG9tZV9yZXZpZXdzL2VtcGF0aGV0aWNfaG9zdF9yZXZpZXdfcmVjZWl2ZWQ%3D&eu"
  /^[\w\d]+\?c=/,           // sujet qui commence par un identifiant puis "?c="
  /[A-Za-z0-9+/]{20,}={0,2}/, // longue chaîne base64 dans le sujet
  /\?(?:c|eu|t|s|ref)=[A-Za-z0-9%_+/.-]{10,}/, // paramètre URL encodé
];
//
// 🔵 NOUVELLE RÉSERVATION
//   FR: "Prénom a réservé votre logement"
//       "Nouvelle réservation de Prénom"
//       "Demande de réservation de Prénom acceptée"
//       "Réservation confirmée – NomLogement, 10–13 avr."
//       "Félicitations ! Prénom a réservé votre logement."
//   EN: "Prénom has booked your place"
//       "Reservation confirmed"
//       "New reservation from Prénom"
//
// 🔴 ANNULATION
//   FR: "Prénom a annulé sa réservation"
//       "Réservation annulée"
//   EN: "Booking cancelled"
//
// 🟡 MODIFICATION
//   FR: "Prénom a modifié sa réservation"
//       "Demande de modification"
//
// 🟤 DÉPART / CHECKOUT
//   FR: "Le séjour de Prénom se termine aujourd'hui"
//       "Prénom part aujourd'hui"
//   EN: "Your guest is checking out today"
//
// 🔔 RAPPEL
//   FR: "Rappel : Prénom arrive dans 2 jours"
//       "Prénom arrive demain !"
//       "Avez-vous tout préparé pour l'arrivée de Prénom ?"
//       "4 voyageurs attendent votre commentaire"
//       "N'oubliez pas de noter Prénom"
//   EN: "Reminder: Prénom arrives in 2 days"
//
// ⭐ AVIS REÇU
//   FR: "Prénom a laissé un avis"
//       "Vous avez un nouvel avis"
//       "Prénom vous a noté"
//
// 💶 VERSEMENT
//   FR: "Nous avons envoyé un versement de 63,62 €"
//       "Votre versement de X €"
//   EN: "Your payout of $X has been sent"
const SUBJECT_PATTERNS = {
  new_fr: [
    // Format principal Airbnb hôte: "Prénom a réservé votre logement"
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+a\s+r[eé]serv[eé]\s+votre\s+logement/,
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+a\s+r[eé]serv[eé]/,
    /nouvelle\s+r[eé]servation/i,
    /confirmation\s+de\s+r[eé]servation/i,
    /r[eé]servation\s+confirm[eé]e?/i,
    /vous\s+avez\s+une\s+nouvelle\s+r[eé]servation/i,
    /votre\s+r[eé]servation\s+est\s+confirm[eé]e?/i,
    /r[eé]servation\s+accept[eé]e?/i,
    /demande\s+de\s+r[eé]servation\s+accept[eé]e?/i,
    /f[eé]licitations[^a-z]*r[eé]servation/i,
    // "Réservation pour NomLogement, X–Y avr." (confirmation)
    /r[eé]servation\s+pour\s+.{5,60},?\s+\d{1,2}[–\-]/i,
  ],
  new_en: [
    /[A-Z][a-z]+\s+has\s+booked\s+your\s+place/,
    /[A-Z][a-z]+\s+has\s+booked/,
    /reservation\s+confirmed/i,
    /new\s+reservation/i,
    /booking\s+confirmation/i,
    /you\s+have\s+a\s+new\s+reservation/i,
    /booking\s+confirmed/i,
    /reservation\s+request\s+accepted/i,
    /congratulations.*reservation/i,
    /[A-Z][a-z]+\s+has\s+reserved\s+your\s+place/,
  ],
  cancelled: [
    /a\s+annul[eé]\s+(?:sa\s+)?r[eé]servation/i,
    /r[eé]servation\s+annul[eé]e?/i,
    /annulation\s+de\s+r[eé]servation/i,
    /annul[eé]e?\s*:/i,
    /cancelled/i, /cancellation/i,
    /booking\s+cancelled/i,
  ],
  modified: [
    /a\s+modifi[eé]\s+(?:sa\s+)?r[eé]servation/i,
    /demande\s+de\s+modification/i,
    /modification\s+de\s+r[eé]servation/i,
    /modifi[eé]e?\s*:/i,
    /modified/i, /updated/i, /mis\s+[àa]\s+jour/i,
    /alteration\s+request/i,
  ],
  checkout: [
    // "Le séjour de Prénom se termine aujourd'hui"
    /s[eé]jour\s+de\s+.+\s+se\s+termine/i,
    // "Prénom part aujourd'hui"
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+part\s+aujourd[''']hui/,
    /d[eé]part\s+de/i,
    /voyage\s+termin[eé]/i, /s[eé]jour\s+termin[eé]/i,
    /check.?out/i, /checkout/i,
    /trip\s+completed/i, /stay\s+completed/i,
    /your\s+guest\s+is\s+checking\s+out/i,
    /checking\s+out\s+today/i,
  ],
  reminder: [
    // Rappels d'arrivée imminente
    /rappel\s*[:\–-]/i,
    /dans\s+\d+\s+jours?/i,
    /in\s+\d+\s+days?/i,
    /arrive\s+(?:demain|aujourd[''']hui|dans)/i,
    /pr[eé]par[eé]z.{0,20}arriv[eé]e?/i,
    /avez.{0,20}pr[eé]par[eé].{0,20}arriv[eé]e?/i,
    /prochaine?\s+arriv[eé]e?/i,
    /prochaine?\s+s[eé]jour/i,
    /reminder\s*:/i,
    /arriving\s+(?:tomorrow|today|in\s+\d)/i,
    // Rappels d'évaluation HÔTE (demande à l'hôte de noter son voyageur)
    /attendent?\s+votre\s+(?:commentaire|[eé]valuation|avis)/i,
    /\d+\s+voyageurs?\s+attendent/i,
    /voyageurs?\s+attendent?\s+votre/i,
    /n['']oubliez\s+pas\s+de\s+noter/i,
    /[eé]valuez\s+(?:votre\s+)?voyageur/i,
    /notez\s+(?:votre\s+)?voyageur/i,
    /rate\s+your\s+guest/i,
    /don[''']t\s+forget\s+to\s+review/i,
    /leave\s+a\s+review\s+for\s+your\s+guest/i,
  ],
  review: [
    // Avis REÇU d'un voyageur (pas rappel hôte)
    // Formats réels Airbnb FR observés :
    // "Mélody a laissé une évaluation 4 étoiles"
    // "Mélody a laissé un avis"
    // "Mélody a évalué votre logement"
    /a\s+laiss[eé]\s+une?\s+[eé]valuation/i,
    /a\s+[eé]valu[eé]\s+votre\s+(?:logement|s[eé]jour|annonce)/i,
    /a\s+not[eé]\s+votre\s+(?:logement|s[eé]jour|annonce)/i,
    /a\s+laiss[eé]\s+(?:un\s+)?avis/i,
    /vous\s+a\s+(?:laiss[eé]\s+un\s+avis|not[eé])/i,
    /nouvel?\s+avis/i,
    /nouvelle?\s+[eé]valuation/i,
    /new\s+review/i,
    /left\s+you\s+a\s+review/i,
    /left\s+(?:an?\s+)?evaluation/i,
    /avis\s+re[cç]u/i,
    /review\s+received/i,
    /rated\s+you/i,
    /rated?\s+your\s+(?:place|listing|home)/i,
    /vous\s+a\s+not[eé]/i,
    /a\s+[eé]valu[eé]\s+votre\s+s[eé]jour/i,
    /reviewed\s+their\s+stay/i,
    // Note explicite dans le sujet : "... 4 étoiles", "... 5 stars"
    /\d\s*[eé]toiles?\s*$/i,
    /\d\s*stars?\s*$/i,
  ],
  payout: [
    // Format exact Airbnb: "Nous avons envoyé un versement de 63,62 €"
    /nous\s+avons\s+envoy[eé]\s+un\s+versement/i,
    /votre\s+versement\s+de/i,
    /versement\s+de\s+[\d,.\s]+\s*[€$£]/i,
    // Formats alternatifs
    /virement\s+(?:effectu[eé]|envoy[eé])/i,
    /paiement\s+envoy[eé]/i,
    /r[eè]glement\s+effectu[eé]/i,
    /your\s+payout\s+of/i,
    /payout\s+(?:sent|of)\s+/i,
    /payment\s+sent/i,
    // Mots-clés seuls (moins précis, en dernier)
    /versement/i, /virement\b/i, /\bpayout\b/i,
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
  // Nettoyer les espaces insécables (\xa0), tabs, espaces multiples
  const s = raw.replace(/[\xa0\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Format ISO déjà OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Format DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const dmy = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

  // Format YYYY/MM/DD ou YYYY-MM-DD
  const ymd = s.match(/(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;

  // Helper normalisation : enlève accents et ponctuation pour le lookup
  const norm = (x: string) => x.toLowerCase()
    .replace(/\./g, '')
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/ç/g, 'c')
    .trim();

  const monthsFr: Record<string, string> = {
    // Noms complets
    janvier:'01', fevrier:'02', mars:'03', avril:'04',
    mai:'05', juin:'06', juillet:'07', aout:'08',
    septembre:'09', octobre:'10', novembre:'11', decembre:'12',
    // Abréviations Airbnb (avec ou sans point)
    janv:'01', jan:'01',
    fevr:'02', fev:'02', feb:'02',
    // mars = mars
    avr:'04',
    // mai = mai
    // juin = juin
    juil:'07', jul:'07',
    aou:'08',
    sept:'09', sep:'09',
    oct:'10',
    nov:'11',
    dec:'12',
  };

  // Format textuel FR avec année : "12 avril 2026", "sam. 12 avr. 2026", "lundi 14 avril 2026"
  // Capture: (jour_semaine optionnel) jour mois année
  const withYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wéèûîàâ]+\.?)\s+(\d{4})/i);
  if (withYear) {
    const key = norm(withYear[2]);
    if (monthsFr[key]) {
      return `${withYear[3]}-${monthsFr[key]}-${withYear[1].padStart(2, '0')}`;
    }
  }

  // Format textuel FR SANS année : "10 avr." / "10 avr" / "10 avril" / "sam. 10 avr."
  // → déduire l'année courante (ou N+1 si date passée de > 180j)
  const noYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wéèûîàâ]+\.?)$/i);
  if (noYear) {
    const key = norm(noYear[2]);
    const monthNum = monthsFr[key];
    if (monthNum) {
      const now = new Date();
      const year = now.getFullYear();
      const candidate = `${year}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (diff < -180) return `${year + 1}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      return candidate;
    }
  }

  // Format textuel anglais avec année : "April 12, 2026" / "Apr 12, 2026"
  const monthsEn: Record<string, string> = {
    january:'01', jan:'01', february:'02', feb:'02', march:'03', mar:'03',
    april:'04', apr:'04', may:'05', june:'06', jun:'06', july:'07', jul:'07',
    august:'08', aug:'08', september:'09', sep:'09', october:'10', oct:'10',
    november:'11', nov:'11', december:'12', dec:'12',
  };
  const textEn = s.match(/([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/i);
  if (textEn && monthsEn[textEn[1].toLowerCase()]) {
    return `${textEn[3]}-${monthsEn[textEn[1].toLowerCase()]}-${textEn[2].padStart(2, '0')}`;
  }
  // "12 April 2026" (jour avant mois EN)
  const textEnRev = s.match(/(\d{1,2})\s+([a-z]+)\.?\s+(\d{4})/i);
  if (textEnRev && monthsEn[textEnRev[2].toLowerCase()]) {
    return `${textEnRev[3]}-${monthsEn[textEnRev[2].toLowerCase()]}-${textEnRev[1].padStart(2, '0')}`;
  }

  return s; // retourner tel quel si aucun format reconnu
}

function extractPrice(text: string): number {
  // Vrais formats Airbnb hôte observés :
  //   "Revenus : 178 €"              (email nouvelle réservation hôte)
  //   "Vos revenus pour ce séjour : 154,00 €"
  //   "Votre revenu estimé : 154 €"
  //   "Votre revenu : 154 €"
  //   "Total : 210,00 €"             (récapitulatif voyageur)
  //   "Montant total : 210 €"
  //   "Prix total : 210 €"
  //   "Vous gagnez 178 €"
  //   "178 €" (montant seul sur une ligne)
  //
  // IMPORTANT : on cherche le montant le plus pertinent dans cet ordre de priorité.
  // Un helper pour extraire un nombre depuis une chaîne capturée
  const parseAmount = (s: string): number => {
    // Supporte "178,34" / "178.34" / "1 234,56" / "1 234.56"
    const clean = s.replace(/[€$£\s]/g, '').replace(/\s/g, '');
    // Format FR : "1 234,56" → supprimer espaces puis remplacer virgule
    const normalized = clean.replace(/(\d)\s(\d)/g, '$1$2').replace(',', '.');
    const val = parseFloat(normalized);
    return (!isNaN(val) && val > 0 && val < 100000) ? val : 0;
  };

  const patterns: RegExp[] = [
    // 🥇 Revenus hôte (priorité maximale — c'est ce que l'hôte reçoit)
    /vos\s+revenus\s+pour\s+ce\s+s[eé]jour\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+revenu\s+estim[eé]\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+revenu\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /revenus?\s+de\s+l[''`]h[oô]te\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /revenus?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /host\s+earnings?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /vous\s+gagnez\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /you\s+earn\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /earnings?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // 🥈 Total général
    /montant\s+total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /total\s+amount\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /prix\s+total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // 🥉 Montant générique
    /montant\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /payout\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /prix\s+(?:de\s+la\s+)?nuit[eé]e?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // 🔚 Dernier recours : premier montant en euros trouvé dans le texte
    /([€$£]\s*[\d\s\xa0.,]+)/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseAmount(m[1]);
      if (val > 0) return val;
    }
  }
  return 0;
}

function extractCleaningFee(text: string): number | undefined {
  const patterns = [
    /frais\s+(?:de\s+)?m[eé]nage\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /nettoyage\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /cleaning\s+fee\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s\xa0]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return undefined;
}

function extractServiceFee(text: string): number | undefined {
  const patterns = [
    /frais\s+de\s+service\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /commission\s+(?:airbnb|de\s+service)\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /service\s+fee\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s\xa0]/g, '').replace(',', '.');
      const val = parseFloat(clean);
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return undefined;
}

function extractHostPayout(text: string): number | undefined {
  // Vrais formats Airbnb versement :
  //   "Nous avons envoyé un versement de 178,34 €"
  //   "Montant versé : 178,34 €"
  //   "Vous recevrez : 178,34 €"
  //   "Votre versement : 178,34 €"
  const patterns = [
    // Format exact sujet/corps versement Airbnb
    /nous\s+avons\s+envoy[eé]\s+un\s+versement\s+de\s+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /versement\s+de\s+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+versement\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /montant\s+vers[eé]\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /vous\s+recevrez?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /host\s+payout\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /r[eé]mun[eé]ration\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /payout\s+(?:amount|total)\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const clean = m[1].replace(/[€$£\s\xa0]/g, '').replace(',', '.');
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

function extractReviewRating(text: string, subject?: string): number | undefined {
  // Chercher la note dans le sujet EN PREMIER (très fiable : "Mélody a laissé une évaluation 4 étoiles")
  if (subject) {
    const subjectMatch = subject.match(/(\d)\s*[eé]toiles?/i) || subject.match(/(\d)\s*stars?/i);
    if (subjectMatch) {
      const rating = parseInt(subjectMatch[1]);
      if (rating >= 1 && rating <= 5) return rating;
    }
  }
  // Puis chercher dans le corps de l'email
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
    /(\d)\s*[eé]toiles?/i,
    /(\d)\s*stars?/i,
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
  // Regex de prénom/nom : commence par majuscule, peut avoir un nom de famille
  // Supporte les prénoms composés (Jean-Pierre), les accents, les tirets
  const NAME = `[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+(?:\\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+)?`;
  const NAME_RE = new RegExp(NAME);

  // ── 1. Depuis le SUJET (source la plus fiable) ────────────────────────────
  if (subject) {
    const subjectPatterns = [
      // 🔵 NOUVELLE RÉSERVATION — format principal Airbnb hôte
      // "Prénom a réservé votre logement"
      // "Marie a réservé votre logement"
      new RegExp(`^(${NAME})\\s+a\\s+r[eé]serv[eé](?:\\s+votre\\s+logement)?`, 'u'),
      // "Prénom souhaite réserver votre logement" (demande)
      new RegExp(`^(${NAME})\\s+souhaite\\s+r[eé]server`, 'u'),
      // "Nouvelle réservation de Prénom"
      new RegExp(`nouvelle\\s+r[eé]servation\\s+de\\s+(${NAME})`, 'iu'),
      // EN: "Prénom has booked your place"
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+has\s+(?:booked|reserved)/,
      // EN: "New reservation from Prénom"
      /new\s+reservation\s+from\s+([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)/i,
      // 🔴 ANNULATION — "Prénom a annulé sa réservation"
      new RegExp(`^(${NAME})\\s+a\\s+annul[eé]`, 'u'),
      // 🟤 DÉPART — "Le séjour de Prénom se termine"
      new RegExp(`s[eé]jour\\s+de\\s+(${NAME})\\s+se\\s+termine`, 'iu'),
      // "Prénom part aujourd'hui"
      new RegExp(`^(${NAME})\\s+part\\s+aujourd`, 'u'),
      // 🔔 RAPPEL — "Rappel : Prénom arrive demain"
      new RegExp(`rappel\\s*[:\\-–]\\s*(${NAME})\\s+arrive`, 'iu'),
      new RegExp(`(${NAME})\\s+arrive\\s+(?:demain|aujourd|dans)`, 'iu'),
      // ⭐ AVIS — "Prénom a laissé un avis"
      new RegExp(`^(${NAME})\\s+a\\s+laiss[eé]\\s+(?:un\\s+)?avis`, 'u'),
      new RegExp(`^(${NAME})\\s+vous\\s+a\\s+not[eé]`, 'u'),
      new RegExp(`^(${NAME})\\s+a\\s+[eé]valu[eé]`, 'u'),
      // EN: "Prénom left you a review"
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+left\s+you\s+a\s+review/,
      // 💶 VERSEMENT — "versement pour le séjour de Prénom"
      new RegExp(`s[eé]jour\\s+de\\s+(${NAME})`, 'iu'),
      // Modification : "Prénom a modifié sa réservation"
      new RegExp(`^(${NAME})\\s+a\\s+modifi[eé]`, 'u'),
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const name = m[1].trim().slice(0, 60);
        if (name.length >= 2 && !/airbnb/i.test(name) && NAME_RE.test(name)) return name;
      }
    }
  }

  // ── 2. Depuis le CORPS de l'email ─────────────────────────────────────────
  // Basé sur les vrais formats observés dans les emails Airbnb hôte
  const bodyPatterns = [
    // "Prénom a réservé votre logement" dans le corps
    new RegExp(`([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+(?:\\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+)?)\\s+a\\s+r[eé]serv[eé](?:\\s+votre\\s+logement)?`),
    // "Prénom souhaite réserver"
    new RegExp(`([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+(?:\\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\\-]+)?)\\s+souhaite\\s+r[eé]server`),
    // "Bonjour [Hôte], Prénom a réservé" → après "Bonjour"
    /Bonjour\s+\S+,?\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)\s+a\s+r[eé]serv[eé]/u,
    // Labels explicites dans le corps
    /voyageur[s]?\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /nom\s+du\s+voyageur\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /nouveau\s+voyageur\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /invit[eé]\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /guest\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /name\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    // "réservation de Prénom"
    /r[eé]servation\s+de\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)/i,
    // "séjour de Prénom" (dans corps payout ou checkout)
    /s[eé]jour\s+de\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)/i,
    // "Prénom a laissé un avis"
    /([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+(?:\s+[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ\-]+)?)\s+a\s+laiss[eé]\s+(?:un\s+)?avis/i,
    // EN
    /([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+has\s+(?:booked|reserved)/,
    /([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+wants\s+to\s+book/,
    /new\s+guest\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+left\s+you\s+a\s+review/i,
  ];
  for (const p of bodyPatterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1].trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 60);
      // Filtres anti-pollution: rejeter si ressemble à un payout, une phrase ou du bruit
      if (name.length >= 2
        && name.length <= 50
        && !/airbnb/i.test(name)
        && !/versement|payout|s[eé]jour|r[eé]servation|logement|annonce/i.test(name)
        && NAME_RE.test(name)
      ) return name;
    }
  }
  return 'Voyageur Airbnb';
}

function extractConfirmationCode(text: string): string | undefined {
  // Codes Airbnb : format HMXXXXX (HM + chiffres) ou ABCDEF123 (lettres+chiffres)
  // Vrais formats observés: HM1234567890, HMABCD123, etc.
  const patterns = [
    /code\s+de\s+confirmation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /confirmation\s+code\s*[:\s]+([A-Z0-9]{6,12})/i,
    /r[eé]f[eé]rence\s+(?:de\s+)?r[eé]servation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /r[eé]f[eé]rence\s*[:\s]+([A-Z0-9]{6,12})/i,
    /n[°o]\.?\s*(?:de\s+)?r[eé]servation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /booking\s+(?:reference|id|code|#)\s*[:\s]*([A-Z0-9]{6,12})/i,
    // Code Airbnb natif: "HM" suivi de chiffres (ex: HM1234567890)
    /\b(HM[A-Z0-9]{6,10})\b/,
    // Code type HMXXXXX
    /\b([A-Z]{2,3}[0-9]{5,9})\b/,
    // Générique: séquence mixte lettres+chiffres en majuscules
    /\b([A-Z]{2,4}[0-9]{4,8})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const code = m[1].toUpperCase();
      // Filtrer les faux positifs courants
      if (!/^(EUR|USD|GBP|JPY|CHF|CAD|AUD)$/.test(code)) return code;
    }
  }
  return undefined;
}

function extractPropertyName(text: string, subject?: string): string | undefined {
  // ── GUARD : emails de versement → jamais de nom de logement ──────────────
  // "Nous avons envoyé un versement de X €" → return undefined immédiatement
  const PAYOUT_RE = /nous\s+avons\s+envoy[eé]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout|versement\s+de\s+[\d,.\s]+\s*[€$£]|your\s+payout\s+of/i;
  const isPayoutEmail = PAYOUT_RE.test(text.slice(0, 600)) || (subject ? PAYOUT_RE.test(subject) : false);
  if (isPayoutEmail) return undefined;

  // Helper: nettoie un candidat de nom de logement
  const cleanCandidate = (raw: string): string =>
    stripDateSuffix(raw.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' '))
      .replace(/\s*\|.*$/, '')
      .replace(/\s*[-–]\s*Airbnb.*$/i, '')
      .replace(/\.$/, '')
      .replace(/\s*\(airbnb\)/i, '')
      .trim()
      .slice(0, 80);

  // ── 1. CORPS du mail — patterns structurés (les plus fiables) ─────────────
  // Vrais formats Airbnb observés dans les emails hôte 2024-2026 :
  //   "Réservation pour NomLogement, 10–13 avr."   → dans le corps
  //   "Annonce : NomLogement"
  //   "Votre logement : NomLogement"
  //   "Logement : NomLogement"
  //   "Your listing: NomLogement"
  const bodyPatterns: RegExp[] = [
    // Format Airbnb hôte : "Réservation pour NomLogement, 10–13 avr."
    // Le nom est entre "pour " et la virgule+date ou fin de ligne
    /r[eé]servation\s+pour\s+([^,\n\r<]{5,70})(?:,|\n|\r|$)/i,
    // "Logement : NomLogement" / "Votre logement : NomLogement"
    /(?:votre\s+)?logement\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Annonce : NomLogement" / "Votre annonce : NomLogement"
    /(?:votre\s+)?annonce\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Titre de l'annonce : NomLogement"
    /titre\s+de\s+l['']annonce\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Propriété : NomLogement"
    /propri[eé]t[eé]\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Your listing: NomLogement"
    /your\s+listing\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Listing: NomLogement"
    /listing\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Property: NomLogement"
    /property\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Vous restez à : NomLogement"
    /vous\s+restez\s+[àa]\s*[:\-]?\s*([^\n\r<]{5,80})/i,
    // "Staying at: NomLogement"
    /staying\s+at\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Your place: NomLogement"
    /your\s+place\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Confirmed at: NomLogement"
    /confirmed\s+at\s+([^\n\r<,\.]{5,60})/i,
    // "Reservation at NomLogement"
    /reservation\s+at\s+([^\n\r<,\.]{5,60})/i,
    // "Trip to NomLogement"
    /trip\s+to\s+([^\n\r<,\.]{5,60})/i,
    // "Voyage à NomLogement"
    /voyage\s+[àa]\s+([^\n\r<,\.]{5,60})/i,
  ];
  for (const p of bodyPatterns) {
    const m = text.match(p);
    if (m) {
      const c = cleanCandidate(m[1]);
      // Rejeter si contient des mots-clés de versement ou de bruit
      if (c.length >= 5 && !/versement|payout|virement|envoy[eé]|r[eé]gl[eé]|€\s*\d|^\d+[,.]?\d*\s*[€$]/i.test(c)) return c;
    }
  }

  // ── 2. SUJET de l'email ───────────────────────────────────────────────────
  // Vrais sujets Airbnb observés :
  //   "Réservation pour NomLogement, 10–13 avr."
  //   "Réservation confirmée – NomLogement"
  //   "NomLogement – Rappel check-in"   ← nom EN PREMIER
  //   "Check-in – NomLogement"
  //   "Votre séjour à NomLogement"
  //   "Rappel : NomLogement"
  if (subject) {
    const subjectPatterns: RegExp[] = [
      // 🏆 PRIORITÉ 1 : "Réservation pour NomLogement, ..." — format exact Airbnb hôte
      /r[eé]servation\s+pour\s+([^,\n\r]{5,60})(?:,|$)/i,
      // "Réservation confirmée – NomLogement" ou "Booking confirmed – NomLogement"
      /(?:r[eé]servation\s+(?:confirm[eé]e?|accept[eé]e?)|booking\s+confirmed?)\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Séjour confirmé – NomLogement"
      /s[eé]jour\s+confirm[eé]\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Votre séjour à NomLogement"
      /votre\s+s[eé]jour\s+(?:[àa]|chez|dans)\s+([^,\n\r]{5,60})/i,
      // "Votre voyage à NomLogement"
      /votre\s+voyage\s+(?:[àa]|chez|dans)\s+([^,\n\r]{5,60})/i,
      // "Check-in – NomLogement" ou "Départ – NomLogement"
      /check.?(?:in|out)\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      /d[eé]part\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Rappel : NomLogement" (rappels hôte)
      /rappel\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Demande de réservation – NomLogement"
      /demande\s+de\s+r[eé]servation\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Votre annonce NomLogement a reçu…"
      /votre\s+annonce\s+([^,\n\r\s]{5,60}(?:\s+\S+){0,4})\s+a\s+re[cç]u/i,
      // "[Airbnb] NomLogement"
      /\[airbnb\]\s+([^–\-\n\r]{5,60})(?:\s*[–\-]|$)/i,
      // "Airbnb – NomLogement"
      /\bairbnb\s*[–\-]\s*([^,\n\r]{5,60})/i,
      // Format "NomLogement – Rappel" (nom en tête)
      /^([^–\-\n\r]{5,60}?)\s*[–\-]\s*(?:rappel|check|s[eé]jour|d[eé]part|arriv|confirm)/i,
      // Concernant un logement
      /concernant\s+(?:votre\s+logement\s+)?([^,\n\r]{5,60})/i,
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const c = cleanCandidate(m[1]);
        if (c.length >= 5 && !/versement|payout|virement|envoy[eé]|r[eé]gl[eé]|^\d+[,.]?\d*\s*[€$]/i.test(c)) return c;
      }
    }

    // ── 3. DERNIER RECOURS : nettoyer le sujet entier ────────────────────────
    // Uniquement si le sujet ne ressemble PAS à un payout ou un nom de voyageur
    const isPersonSubject = /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-z]+\s+[a-z]+\s+(r[eé]serv|annul|modifi|laiss|part\s)/i.test(subject);
    if (!isPersonSubject) {
      const cleaned = subject
        .replace(/airbnb/gi, '')
        .replace(/r[eé]servation\s+(confirm[eé]e?|accept[eé]e?|re[cç]ue?)/gi, '')
        .replace(/nouvelle?\s+r[eé]servation/gi, '')
        .replace(/booking\s+(confirmed?|received?)/gi, '')
        .replace(/rappel\s+(?:d['e]?\s*)?arriv[eé]e?/gi, '')
        .replace(/rappel\s+check.?in/gi, '')
        .replace(/check.?(?:in|out)/gi, '')
        .replace(/confirmation\s+de\s+s[eé]jour/gi, '')
        .replace(/votre\s+(?:voyage|s[eé]jour)\s+[àa]/gi, '')
        .replace(/\[|\]/g, '')
        .replace(/[–\-:,]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const fc = cleanCandidate(cleaned);
      if (fc.length >= 5 && !/versement|payout|virement|envoy[eé]|^\d+[,.]?\d*\s*[€$]/i.test(fc)) {
        return fc.slice(0, 80);
      }
    }
  }

  return undefined;
}

// Supprime le suffixe de dates collé au nom du logement
// ex: "Maisonnette T2 quartier calme, 10–13 avr." → "Maisonnette T2 quartier calme"
// ex: "Maison de ville avec petite Terrasse couverte, 11–15 avr." → "Maison de ville avec petite Terrasse couverte"
function stripDateSuffix(s: string): string {
  return s
    // "NomLogement, 10–13 avr." ou "NomLogement, 10-13 avr"
    .replace(/,\s*\d{1,2}\s*[–\-]\s*\d{1,2}\s+\w{2,10}\.?\s*\d{0,4}\s*$/, '')
    // "NomLogement, 10 avr." ou "NomLogement, 10 avril 2026"
    .replace(/,\s*\d{1,2}\s+\w{3,10}\.?\s*\d{0,4}\s*$/, '')
    // "NomLogement, du 10 au 13 avr."
    .replace(/,\s*du\s+\d{1,2}\s+au\s+\d{1,2}\s+\w{2,10}\.?\s*$/, '')
    .trim();
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

  // 1b. Ignorer les emails informatifs/maintenance/marketing — pas de réservation à importer
  if (IGNORED_PATTERNS.some(p => p.test(subject))) return null;

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
  else {
    // ─── Fallback : déduire le type depuis le corps / URLs de tracking ───────
    // Les emails Airbnb contiennent parfois des slugs dans les URLs de tracking
    // Ex: "home_reviews/empathetic_host_review_received" → review
    //     "reservation_confirmation" → new
    //     "host_payout" → payout
    const bodySnippet = body.slice(0, 2000).toLowerCase();
    if (/home_reviews|review_received|guest.*review|avis.*re[cç]u/i.test(bodySnippet)) {
      bookingType = 'review';
    } else if (/reservation_confirmation|booking_confirmation|new_reservation/i.test(bodySnippet)) {
      bookingType = 'new';
    } else if (/cancellation|booking_cancelled|reservation_cancelled/i.test(bodySnippet)) {
      bookingType = 'cancelled';
    } else if (/host_payout|payout_sent|versement/i.test(bodySnippet)) {
      bookingType = 'payout';
    } else if (/checkout|check_out|séjour.*termin/i.test(bodySnippet)) {
      bookingType = 'checkout';
    } else if (/reminder|rappel.*arriv/i.test(bodySnippet)) {
      bookingType = 'reminder';
    }
    // Si toujours aucun type détecté depuis le corps → email non reconnu, ignorer
    else {
      return null;
    }
  }

  // 3. Nettoyer le HTML si présent
  const text = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ');

  // 4. Extraire les dates — PAS pour les versements (dates bancaires ≠ dates séjour)
  let checkIn: string | null = null;
  let checkOut: string | null = null;

  if (bookingType !== 'payout') {
    // Vrais formats de dates dans les emails Airbnb hôte (FR) :
    //   "Arrivée : sam. 10 avr." / "Arrivée : 10 avr. 2026"
    //   "Arrivée : 10 avril 2026"
    //   "Départ : mar. 13 avr."
    //   "10 avr. – 13 avr." (dans le corps ou le sujet)
    //   "du 10 au 13 avril 2026"
    //   "10/04/2026" / "10-04-2026"
    //   "April 10, 2026" / "Apr 10, 2026"
    //   "samedi 10 avril 2026"
    //   "sam. 10 avr." (jour abrégé + date sans année)
    const MOIS_RE = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|juillet|ao[uû]t|sept?\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?)`;
    const JOUR_RE = `(?:lun\\.?|mar\\.?|mer\\.?|jeu\\.?|ven\\.?|sam\\.?|dim\\.?|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)`;

    const checkInPatterns = [
      // "Arrivée : sam. 10 avr." / "Arrivée : 10 avr." / "Arrivée : 10 avr. 2026"
      new RegExp(`arriv[eé]e?\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-in : sam. 10 avr."
      new RegExp(`check.?in\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Entrée : 10 avr."
      new RegExp(`entr[eé]e?\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec année : "du 10/04/2026" ou "10/04/2026"
      /(?:du\s+|from\s+)?(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})/i,
      /from\s+([\w\s,]+\d{4})/i,
      // Plage "10 avr. – 13 avr." → prendre la PREMIÈRE date
      new RegExp(`(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*[–\\-]`, 'i'),
    ];
    const checkOutPatterns = [
      // "Départ : mar. 13 avr." / "Départ : 13 avr."
      new RegExp(`d[eé]part\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-out : 13 avr."
      new RegExp(`check.?out\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Sortie : 13 avr."
      new RegExp(`sortie\\s*[:\\-–]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec année : "au 13/04/2026"
      /(?:au\s+|to\s+)(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})/i,
      /to\s+([\w\s,]+\d{4})/i,
      // Plage "10 avr. – 13 avr." → prendre la DEUXIÈME date (après le tiret)
      new RegExp(`[–\\-]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    ];

    checkIn = extractDate(text, checkInPatterns);
    checkOut = extractDate(text, checkOutPatterns);

    // Fallback : chercher deux dates proches dans le texte (avec ou sans année)
    if (!checkIn || !checkOut) {
      const allDates = [...text.matchAll(/\b(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})\b/gi)]
        .map(m => normalizeDate(m[1]))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (allDates.length >= 2) {
        checkIn  = checkIn  || allDates[0];
        checkOut = checkOut || allDates[1];
      }
    }
  }

  // Pas de dates = email non parsable (sauf payout/reminder/review qui n'ont pas de dates séjour)
  if (!checkIn || !checkOut) {
    if (bookingType !== 'payout' && bookingType !== 'reminder' && bookingType !== 'review') return null;
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
  if (confirmationCode) {
    confidence += 5;
    // Code HM au format Airbnb (HMXXXXXXXX) = très fiable
    if (/^HM[A-Z0-9]{8,}$/i.test(confirmationCode)) confidence += 5;
  }
  // Nom d'hôte trouvé (pas le placeholder générique)
  const guestNameExtracted = extractGuestName(text, subject);
  if (guestNameExtracted && guestNameExtracted !== 'Voyageur Airbnb') confidence += 5;
  // Logement identifié dans le texte
  const propertyNameExtracted = extractPropertyName(text, subject);
  if (propertyNameExtracted) confidence += 5;
  // Versement : confidence de base 80 (pas de dates = normal)
  if (bookingType === 'payout') confidence = Math.max(confidence, 80);

  return {
    source: 'gmail',
    messageId,
    subject: subject.slice(0, 200),
    receivedAt,
    guestName: guestNameExtracted,
    guestEmail: extractGuestEmail(text),
    guestPhone: extractGuestPhone(text),
    guests: extractGuests(text),
    checkIn: checkIn ?? receivedAt.split('T')[0],
    checkOut: checkOut ?? receivedAt.split('T')[0],
    nights: (bookingType === 'payout' && !checkIn) ? 0 : nights,
    totalPrice: price,
    currency: text.includes('€') ? 'EUR' : text.includes('£') ? 'GBP' : 'USD',
    cleaningFee: extractCleaningFee(text),
    serviceFee: extractServiceFee(text),
    hostPayout: extractHostPayout(text),
    propertyName: propertyNameExtracted,
    confirmationCode,
    bookingType,
    confidence: Math.min(100, confidence),
    reviewRating: bookingType === 'review' ? extractReviewRating(text, subject) : undefined,
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
