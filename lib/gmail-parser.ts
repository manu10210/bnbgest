import { extractGuestCountry, detectGuestLanguage, extractGuestPhone, extractGuestEmail, extractGuestComposition, extractGuestName } from './guest-parser';
/**
 * 📧 Gmail Parser — Extraction automatique des réservations Airbnb
 *
 * Détecte et parse les emails de confirmation Airbnb depuis Gmail API.
 * Supporte : Emails hôte Airbnb en français et en anglais (2024-2026)
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE DU PARSER
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  parseAirbnbEmail()
 *   ├─ 1. Vérifier expéditeur @airbnb.com
 *   ├─ 2. IGNORED_PATTERNS → null  (maintenance, litige, paiement voyageur…)
 *   ├─ 3. Détecter bookingType via SUBJECT_PATTERNS (sujet)
 *   │      ou fallback via slugs URL dans le corps
 *   ├─ 4. Extraire dates checkIn / checkOut  (sauf payout)
 *   ├─ 5. Extraire prix, frais, versement hôte
 *   ├─ 6. Extraire nom voyageur, logement, code confirmation
 *   └─ 7. Calculer score de confiance (0-100)
 *
 * ════════════════════════════════════════════════════════════════════════════
 * TYPES D'EMAILS AIRBNB RECONNUS (bookingType)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 🔵 'new'       — Nouvelle réservation confirmée
 *   Sujets FR :  "Marie a réservé votre logement"
 *                "Félicitations ! Marie a réservé votre logement."
 *                "Nouvelle réservation de Marie"
 *                "Confirmation de réservation"
 *                "Réservation confirmée"
 *                "Demande de réservation de Marie acceptée"
 *                "Réservation pour Mon Logement, 10–13 avr."
 *   Sujets EN :  "Marie has booked your place"
 *                "Reservation confirmed" / "Booking confirmation"
 *                "New reservation from Marie"
 *
 * 🔴 'cancelled' — Annulation de réservation
 *   Sujets FR :  "Marie a annulé sa réservation"
 *                "Réservation annulée" / "Annulation de réservation"
 *   Sujets EN :  "Booking cancelled" / "Cancellation"
 *
 * 🟡 'modified'  — Modification / changement de réservation
 *   Sujets FR :  "Marie a modifié sa réservation"
 *                "Marie souhaite changer sa réservation"  ← observé réel
 *                "Marie souhaite modifier sa réservation"
 *                "Marie a changé sa réservation"
 *                "Demande de modification" / "Changement de réservation"
 *   Sujets EN :  "Marie wants to change their booking"
 *                "Alteration request"
 *
 * 🟤 'checkout'  — Fin de séjour / départ du voyageur
 *   Sujets FR :  "Le séjour de Marie se termine aujourd'hui"
 *                "Marie part aujourd'hui"
 *                "Départ de Marie"
 *   Sujets EN :  "Your guest is checking out today"
 *                "Checking out today"
 *
 * 🔔 'reminder'  — Rappel d'arrivée imminente (≠ rappel évaluation hôte)
 *   Sujets FR :  "Rappel : Marie arrive dans 2 jours"
 *                "Marie arrive demain !"
 *                "Avez-vous tout préparé pour l'arrivée de Marie ?"
 *                "Prochaine arrivée"
 *   Sujets EN :  "Reminder: Marie arrives in 2 days"
 *                "Marie arriving tomorrow"
 *   ⚠️  Les rappels "notez votre voyageur" / "X attend votre commentaire"
 *       sont dans IGNORED_PATTERNS (pas de réservation à créer)
 *
 * ⭐ 'review'    — Avis reçu d'un voyageur
 *   Sujets FR :  "Marie a laissé une évaluation 4 étoiles"  ← observé réel
 *                "vous a laissé une évaluation 5 étoiles !" ← observé réel (prénom masqué)
 *                "Un voyageur a récemment laissé une évaluation 1 étoile" ← observé réel (anonymisé)
 *                "Un voyageur a récemment laissé un avis"   ← variante anonymisée
 *                "Marie a laissé un avis"
 *                "Marie a évalué votre logement"
 *                "Marie a noté votre logement"
 *                "Nouvel avis" / "Nouvelle évaluation"
 *   Sujets EN :  "Marie left you a review" / "New review"
 *                "Marie rated your place"
 *                "A guest has recently left a review"       ← EN anonymisé
 *   Note : la note (1-5 étoiles) est extraite depuis le sujet en priorité
 *
 * 💶 'payout'   — Versement hôte (Airbnb envoie de l'argent à l'hôte)
 *   Sujets FR :  "Nous avons envoyé un versement de 63,62 €"  ← format exact observé
 *                "Votre versement de X €"
 *   Sujets EN :  "Your payout of $X has been sent"
 *   Note : pas de dates de séjour dans ces emails → checkIn/checkOut non extraits
 *          confidence minimum = 80 même sans dates
 *
 * ════════════════════════════════════════════════════════════════════════════
 * CHAMPS EXTRAITS PAR TYPE D'EMAIL
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 🔵 'new'       → guestName, guests, checkIn, checkOut, nights, checkInTime,
 *                  checkOutTime, totalPrice, nightlyRate, cleaningFee, serviceFee,
 *                  taxAmount, confirmationCode, propertyName,
 *                  guestEmail, guestPhone, guestCountry, guestLanguage,
 *                  cancellationPolicy, isInstantBook, currency
 *
 * 🔴 'cancelled' → guestName, checkIn, checkOut, confirmationCode, propertyName,
 *                  cancellationPolicy, totalPrice, nightlyRate, cleaningFee,
 *                  serviceFee, taxAmount, guestLanguage, guestCountry
 *
 * 🟡 'modified'  → guestName, checkIn, checkOut (dates ACTUELLES),
 *                  modifiedCheckIn, modifiedCheckOut (NOUVELLES dates proposées),
 *                  checkInTime, checkOutTime, nightlyRate, cleaningFee, serviceFee,
 *                  taxAmount, totalPrice, confirmationCode, propertyName,
 *                  guestLanguage, cancellationPolicy
 *
 * 🔔 'reminder'  → guestName, checkIn, checkOut, checkInTime, checkOutTime,
 *                  confirmationCode, propertyName, guests, guestCountry, guestLanguage
 *
 * 🟤 'checkout'  → guestName, checkIn, checkOut, totalPrice, confirmationCode,
 *                  propertyName, checkOutTime, guestLanguage, guestCountry
 *
 * ⭐ 'review'    → guestName (ou "Voyageur Airbnb" si anonymisé), reviewRating (1-5),
 *                  reviewComment
 *                  ⚠️  Airbnb peut masquer le prénom → "Un voyageur a récemment laissé…"
 *                  ⚠️  totalPrice = 0 pour les avis (pas de prix séjour dans ces emails)
 *
 * 💶 'payout'   → hostPayout, payoutDate, payoutMethod, currency,
 *                  confirmationCode (si séjour lié mentionné), guestName (si mentionné)
 *                  ⚠️  checkIn/checkOut non extraits — dates bancaires ≠ dates séjour
 *                  ⚠️  totalPrice = 0 pour les paiements hôte (utilisez hostPayout)
 *
 * ════════════════════════════════════════════════════════════════════════════
 * EMAILS IGNORÉS — IGNORED_PATTERNS (retourne null)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 🔧 Maintenance annonces    "Plusieurs annonces nécessitent votre attention"
 *                            "Action requise sur votre annonce"
 * 📣 Marketing / Conseils    "Conseils pour les hôtes" / "Superhost"
 * 📋 Politique / CGU         "Mise à jour des conditions" / "Terms of service"
 * 🔐 Sécurité / Compte       "Connexion à votre compte" / "Réinitialisez votre MDP"
 * 💬 Messagerie seule        "Vous avez un nouveau message" / "a répondu à votre message"
 * ⚖️  Litiges / Sinistres    "Vous avez proposé un montant différent à X"  ← observé réel
 *                            "Vous avez demandé de l'argent à X"           ← observé réel
 *                            "AirCover" / "Dommages signalés"
 *                            "Centre de résolution" / "Damage claim"
 * 💳 Paiement voyageur       "Paiement effectué pour la réservation"       ← observé réel
 *                            (≠ versement hôte qui est un 'payout')
 * ✍️  Rappels évaluation hôte "X attend votre commentaire"                  ← observé réel
 *                            "Notez votre voyageur" / "N'oubliez pas de noter"
 *                            "4 voyageurs attendent votre commentaire"
 * 🔗 Sujets corrompus/URL    "661?c=.pi80.pkaG9tZV9yZXZp..."               ← observé réel
 *                            (URL de tracking Airbnb encodée base64 dans le sujet)
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
  guestAdults?: number;
  guestChildren?: number;
  guestInfants?: number;
  guestPets?: number;
  guestCountry?: string;    // Pays du voyageur (ex: "France", "Germany")
  guestLanguage?: string;   // Langue détectée (ex: "fr", "en", "de")
  // Séjour
  checkIn: string;          // ISO date YYYY-MM-DD
  checkOut: string;         // ISO date YYYY-MM-DD
  nights: number;
  checkInTime?: string;     // Heure d'arrivée (ex: "15:00")
  checkOutTime?: string;    // Heure de départ (ex: "11:00")
  // Finance
  totalPrice: number;
  currency: string;
  nightlyRate?: number;     // Prix par nuit (ex: 89.0)
  cleaningFee?: number;
  serviceFee?: number;
  hostPayout?: number;      // Ce que l'hôte reçoit réellement
  taxAmount?: number;       // Taxes (TVA, taxe de séjour…)
  // Versement
  payoutDate?: string;      // Date du versement bancaire (ISO YYYY-MM-DD) — payout uniquement
  payoutMethod?: string;    // Méthode (ex: "Virement bancaire", "PayPal")
  // Propriété
  propertyName?: string;
  confirmationCode?: string;
  // Statut
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  confidence: number;       // 0-100%
  parserPatternVersion?: string; // version du moteur de classification
  classificationSource?: 'subject' | 'body-fallback';
  classificationRuleId?: string;
  classificationRegex?: string;
  isInstantBook?: boolean;  // true si réservation instantanée (sans approbation)
  cancellationPolicy?: string; // Politique d'annulation (ex: "Flexible", "Modérée", "Stricte")
  // Modification — nouvelles dates proposées
  modifiedCheckIn?: string;   // Nouvelle date d'arrivée (modified uniquement)
  modifiedCheckOut?: string;
    warnings?: string[];
  // Champs spécifiques aux avis
  reviewRating?: number;    // 1-5 étoiles
  reviewComment?: string;   // Commentaire du voyageur
  // Identifiant Airbnb de l'annonce (extrait des URLs /rooms/XXXXXXXX dans le corps)
  // Utile pour retrouver le logement même quand le nom n'est pas dans l'email (ex: avis)
  airbnbListingId?: string;
}

// ─── Expéditeurs connus Airbnb ──────────────────────────────────────────────
// automated@airbnb.com = notifications hôtes principales
// express@, no-reply@, reply@, support@ = autres domaines Airbnb
const AIRBNB_SENDERS = [
  'automated@airbnb.com',
  'express@airbnb.com',
  'no-reply@airbnb.com',
  'reply@airbnb.com',
  'support@airbnb.com',
  'airbnb.com',  // domaine générique → capture toute adresse @*.airbnb.com
];

// ─── Emails à IGNORER ───────────────────────────────────────────────────────
// Retourne null immédiatement — pas de réservation à importer.
// Voir JSDoc en tête de fichier pour la liste complète par catégorie.
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
  // Litiges / Offres de remboursement / Négociation montant
  /vous\s+avez\s+propos[eé]\s+un\s+montant\s+diff[eé]rent/i,
  /a\s+propos[eé]\s+un\s+montant\s+diff[eé]rent/i,
  /offre\s+de\s+remboursement/i,
  /proposition\s+de\s+remboursement/i,
  /litige\s+(?:ouvert|en\s+cours|soumis)/i,
  /contestation\s+de\s+(?:r[eé]servation|paiement)/i,
  /vous\s+avez\s+contest[eé]/i,
  /a\s+contest[eé]\s+(?:le\s+)?remboursement/i,
  /offered\s+a\s+different\s+amount/i,
  /submitted\s+a\s+reimbursement/i,
  /dispute\s+(?:opened|submitted|filed)/i,
  // Notifications de paiement voyageur (pas un versement hôte, pas une réservation à importer)
  /paiement\s+effectu[eé]\s+(?:pour|de)\s+(?:la\s+)?r[eé]servation/i,
  /paiement\s+re[cç]u\s+(?:pour|de)\s+(?:la\s+)?r[eé]servation/i,
  /confirmation\s+de\s+paiement/i,
  /votre\s+paiement\s+(?:a\s+[eé]t[eé]\s+)?(?:effectu[eé]|re[cç]u|valid[eé])/i,
  /paiement\s+valid[eé]/i,
  /payment\s+(?:received|confirmed|processed)\s+for/i,
  /your\s+payment\s+(?:has\s+been\s+)?(?:received|confirmed|processed)/i,
  // Rappels d'évaluation HÔTE (Airbnb demande à l'hôte de noter son voyageur)
  // Ces emails n'ont pas de réservation à importer
  /attendent?\s+votre\s+(?:commentaire|[eé]valuation|avis)/i,
  /\d+\s+voyageurs?\s+attendent/i,
  /voyageurs?\s+attendent?\s+votre/i,
  /n[''']oubliez\s+pas\s+de\s+(?:noter|[eé]valuer)/i,
  /[eé]valuez\s+(?:votre\s+)?voyageur/i,
  /notez\s+(?:votre\s+)?voyageur/i,
  /laissez\s+(?:un\s+)?commentaire\s+(?:pour|[àa])/i,
  /donnez\s+votre\s+avis\s+(?:sur|pour)/i,
  /rate\s+your\s+guest/i,
  /don[''']t\s+forget\s+to\s+review/i,
  /leave\s+a\s+review\s+for\s+your\s+guest/i,
  /write\s+a\s+review/i,
  // Sujets corrompus / URLs de tracking Airbnb encodées (base64, paramètres URL)
  // Ex: "661?c=.pi80.pkaG9tZV9yZXZpZXdzL2VtcGF0aGV0aWNfaG9zdF9yZXZpZXdfcmVjZWl2ZWQ%3D&eu"
  /^[\w\d]+\?c=/,           // sujet qui commence par un identifiant puis "?c="
  /[A-Za-z0-9+/]{20,}={0,2}/, // longue chaîne base64 dans le sujet
  /\?(?:c|eu|t|s|ref)=[A-Za-z0-9%_+/.-]{10,}/, // paramètre URL encodé
];

// ─── Patterns de classification par type d'email ────────────────────────────
// ORDRE DE PRIORITÉ : new > cancelled > modified > checkout > reminder > review > payout
// (voir JSDoc en tête de fichier pour la liste complète des sujets observés)
const SUBJECT_PATTERNS = {
  new_fr: [
    // "Marie a réservé votre logement" / "Marie a réservé"
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+a\s+r[eé]serv[eé]\s+votre\s+logement/,
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+a\s+r[eé]serv[eé]/,
    // "Marie a demandé à réserver" (réservation instantanée ou demande)
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+a\s+demand[eé]\s+[àa]\s+r[eé]server/,
    // "Réservation instantanée"
    /r[eé]servation\s+instantan[eé]e?/i,
    // "Nouvelle réservation" / "Confirmation de réservation" / "Réservation confirmée"
    /nouvelle\s+r[eé]servation/i,
    /confirmation\s+de\s+r[eé]servation/i,
    /r[eé]servation\s+confirm[eé]e?/i,
    /vous\s+avez\s+une\s+nouvelle\s+r[eé]servation/i,
    /votre\s+r[eé]servation\s+est\s+confirm[eé]e?/i,
    /r[eé]servation\s+accept[eé]e?/i,
    // "Demande de réservation de Marie acceptée"
    /demande\s+de\s+r[eé]servation\s+accept[eé]e?/i,
    // "Félicitations ! Marie a réservé votre logement."
    /f[eé]licitations[^a-z]*r[eé]servation/i,
    // "Réservation pour Mon Logement, 10–13 avr."
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
    // "Marie a annulé sa réservation"
    /a\s+annul[eé]\s+(?:sa\s+)?r[eé]servation/i,
    /r[eé]servation\s+annul[eé]e?/i,
    /annulation\s+de\s+r[eé]servation/i,
    /annul[eé]e?\s*:/i,
    /cancelled/i, /cancellation/i,
    /booking\s+cancelled/i,
  ],
  modified: [
    // "Marie a modifié sa réservation"
    /a\s+modifi[eé]\s+(?:sa\s+)?r[eé]servation/i,
    // "Marie souhaite changer/modifier sa réservation"  ← observé réel
    /souhaite\s+changer\s+(?:sa\s+)?r[eé]servation/i,
    /souhaite\s+modifier\s+(?:sa\s+)?r[eé]servation/i,
    /a\s+chang[eé]\s+(?:sa\s+)?r[eé]servation/i,
    /veut\s+(?:changer|modifier)\s+(?:sa\s+)?r[eé]servation/i,
    /demande\s+de\s+(?:modification|changement)/i,
    /modification\s+de\s+r[eé]servation/i,
    /changement\s+de\s+r[eé]servation/i,
    /modifi[eé]e?\s*:/i,
    // "modified" ou "updated" uniquement si contexte réservation dans le sujet
    /r[eé]servation\s+(?:modifi[eé]e?|updated?)/i,
    /booking\s+(?:modified|updated)/i,
    /mis\s+[àa]\s+jour\s+[:\-–]/i,
    /alteration\s+request/i,
    // "Marie wants to change their booking"
    /wants?\s+to\s+change\s+(?:their\s+)?(?:reservation|booking)/i,
  ],
  checkout: [
    // "Le séjour de Marie se termine aujourd'hui"
    /s[eé]jour\s+de\s+.+\s+se\s+termine/i,
    // "Marie part aujourd'hui"
    /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâäéèêëîïôùûüÿœæ]+\s+part\s+aujourd[''']hui/,
    /d[eé]part\s+de/i,
    /voyage\s+termin[eé]/i, /s[eé]jour\s+termin[eé]/i,
    /check.?out/i, /checkout/i,
    /trip\s+completed/i, /stay\s+completed/i,
    /your\s+guest\s+is\s+checking\s+out/i,
    /checking\s+out\s+today/i,
  ],
  reminder: [
    // Rappels d'arrivée imminente UNIQUEMENT (liés à une réservation existante)
    // Les rappels d'évaluation hôte sont dans IGNORED_PATTERNS
    // "Rappel : Marie arrive dans 2 jours" — exclure "Rappel : annulation" etc.
    /rappel\s*[:\–-]\s*(?!annul|cancel|modif|politique)[^\n]{0,40}(?:arriv|s[eé]jour|check|voyage)/i,
    /dans\s+\d+\s+jours?/i,
    /in\s+\d+\s+days?/i,
    // "Marie arrive demain !"
    /arrive\s+(?:demain|aujourd[''']hui|dans)/i,
    /pr[eé]par[eé]z.{0,20}arriv[eé]e?/i,
    /avez.{0,20}pr[eé]par[eé].{0,20}arriv[eé]e?/i,
    /prochaine?\s+arriv[eé]e?/i,
    /prochaine?\s+s[eé]jour/i,
    /reminder\s*:/i,
    /arriving\s+(?:tomorrow|today|in\s+\d)/i,
  ],
  review: [
    // Avis REÇU d'un voyageur (≠ rappel hôte d'évaluer → voir IGNORED_PATTERNS)
    // "Marie a laissé une évaluation 4 étoiles"  ← observé réel
    /a\s+laiss[eé]\s+une?\s+[eé]valuation/i,
    // "Un voyageur a récemment laissé une évaluation 1 étoile"  ← observé réel (prénom masqué)
    /un(?:e)?\s+(?:de\s+vos\s+)?voyageurs?\s+a\s+(?:r[eé]cemment\s+)?laiss[eé]/i,
    // "Un voyageur a récemment laissé un avis"  ← variante
    /un(?:e)?\s+(?:de\s+vos\s+)?voyageurs?\s+a\s+(?:r[eé]cemment\s+)?[eé]valu[eé]/i,
    // "A guest has recently left a review"  ← EN anonymisé
    /a\s+guest\s+(?:has\s+)?(?:recently\s+)?left\s+(?:a\s+)?(?:review|rating)/i,
    // "Marie a évalué / noté votre logement"
    /a\s+[eé]valu[eé]\s+votre\s+(?:logement|s[eé]jour|annonce)/i,
    /a\s+not[eé]\s+votre\s+(?:logement|s[eé]jour|annonce)/i,
    // "Marie a laissé un avis"
    /a\s+laiss[eé]\s+(?:un\s+)?avis/i,
    // "vous a laissé une évaluation 5 étoiles !"  ← observé réel (prénom masqué par Airbnb)
    /vous\s+a\s+(?:laiss[eé]\s+un[e]?\s+(?:avis|[eé]valuation)|not[eé])/i,
    /vous\s+a\s+[eé]valu[eé]/i,
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
    // Note explicite dans le sujet : "... 4 étoiles", "... 5 stars" / "1 étoile"
    /\d\s*[eé]toiles?\s*[!.]?\s*$/i,
      /\d\s*[eé]toiles?\s*$/i,
      /[eé]valuation\s+\d\s*[eé]toiles?/i,
      /avis\s+\d\s*[eé]toiles?/i,
      /[eé]valuation\s+de\s+/i,
      /avis\s+de\s+/i,
    /\d\s*stars?\s*[!.]?\s*$/i,
  ],
  payout: [
    // Versement hôte — Airbnb envoie de l'argent à l'hôte
    // "Nous avons envoyé un versement de 63,62 €"  ← format exact Airbnb observé
    /nous\s+avons\s+envoy[eé]\s+un\s+versement/i,
    /votre\s+versement\s+de/i,
    /versement\s+de\s+[\d,.\s]+\s*[€$£]/i,
    /virement\s+(?:effectu[eé]|envoy[eé])/i,
    /r[eè]glement\s+effectu[eé]/i,
    // "Your payout of $X has been sent"
    /your\s+payout\s+of/i,
    /payout\s+(?:sent|of)\s+/i,
    // Mots-clés seuls (moins précis, en dernier recours) — avec contexte montant pour éviter faux positifs
    /\bversement\s+(?:de|du|pour|pr[eé]vu)\b/i,
    /\bvirement\s+(?:de|du|bancaire|effectu[eé]|envoy[eé])\b/i,
    /\bpayout\b/i,
  ],
};

const PARSER_PATTERN_VERSION = '2026.2';

type BookingType = ParsedBooking['bookingType'];
type SubjectPatternGroup = keyof typeof SUBJECT_PATTERNS;

const SUBJECT_CLASSIFICATION_PRIORITY: Array<{ type: BookingType; groups: SubjectPatternGroup[] }> = [
  { type: 'new', groups: ['new_fr', 'new_en'] },
  { type: 'cancelled', groups: ['cancelled'] },
  { type: 'modified', groups: ['modified'] },
  { type: 'checkout', groups: ['checkout'] },
  { type: 'reminder', groups: ['reminder'] },
  { type: 'review', groups: ['review'] },
  { type: 'payout', groups: ['payout'] },
];

const BODY_FALLBACK_RULES: Array<{ id: string; type: BookingType; regex: RegExp }> = [
  { id: 'body.review.1', type: 'review', regex: /home_reviews|review_received|guest.*review|avis.*re[cç]u|[eé]valuation.*[eé]toiles|avis.*[eé]toiles|has left you a review/i },
  { id: 'body.new.0', type: 'new', regex: /code\s+de\s+confirmation\s*[:\-]?\s*HM[A-Z0-9]{6,12}/i },
  { id: 'body.new.0b', type: 'new', regex: /arriv[eé]e[\s\S]{0,120}d[eé]part/i },
  { id: 'body.new.0c', type: 'new', regex: /logement\s+entier[\s\S]{0,140}code\s+de\s+confirmation/i },
  { id: 'body.new.1', type: 'new', regex: /reservation_confirmation|booking_confirmation|new_reservation/i },
  { id: 'body.cancelled.1', type: 'cancelled', regex: /cancellation|booking_cancelled|reservation_cancelled/i },
  { id: 'body.payout.1', type: 'payout', regex: /host_payout|payout_sent|your\s+payout\s+of|nous\s+avons\s+envoy[eé]\s+un\s+versement/i },
  { id: 'body.payout.2', type: 'payout', regex: /nous\s+avons\s+envoy[eé]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout/i },
  { id: 'body.checkout.1', type: 'checkout', regex: /checkout|check_out|s[eé]jour.*termin/i },
  { id: 'body.reminder.1', type: 'reminder', regex: /reminder|rappel.*arriv/i },
];

function matchSubjectClassification(subject: string): { type: BookingType; ruleId: string; regex: string } | null {
  const normalizedSubject = normalizeForMatching(subject);
  for (const rule of SUBJECT_CLASSIFICATION_PRIORITY) {
    for (const group of rule.groups) {
      const patterns = SUBJECT_PATTERNS[group];
      for (let i = 0; i < patterns.length; i++) {
        const re = patterns[i];
        if (re.test(subject) || re.test(normalizedSubject)) {
          return {
            type: rule.type,
            ruleId: `subject.${group}.${i + 1}`,
            regex: re.source,
          };
        }
      }
    }
  }
  return null;
}

function matchBodyFallbackClassification(body: string): { type: BookingType; ruleId: string; regex: string } | null {
  const snippet = body.slice(0, 2000).toLowerCase();
  const normalizedSnippet = normalizeForMatching(snippet).toLowerCase();
  for (const rule of BODY_FALLBACK_RULES) {
    if (rule.regex.test(snippet) || rule.regex.test(normalizedSnippet)) {
      return {
        type: rule.type,
        ruleId: rule.id,
        regex: rule.regex.source,
      };
    }
  }
  return null;
}

function normalizeForMatching(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"');
}

// ─── Extracteurs de données ─────────────────────────────────────────────────

function extractDate(text: string, patterns: RegExp[], referenceDate?: string | Date): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1] || match[0];
      const normalized = normalizeDate(raw, referenceDate);
      // Only return if normalizeDate produced a real ISO date — otherwise try next pattern.
      // This prevents partial captures like "22" (day-only from compact range) from
      // blocking the fallback patterns that capture the full "22 mai 2026".
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    }
  }
  return null;
}

function normalizeDate(raw: string, referenceDate?: string | Date): string {
  // Nettoyer les espaces insécables (\xa0), tabs, espaces multiples
  const s = raw.replace(/[\xa0\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Format ISO déjà OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Format DD/MM/YY (année à 2 chiffres) → interprété comme 20YY
  const dmy2 = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (dmy2) {
    const year = 2000 + parseInt(dmy2[3]);
    return `${year}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
  }

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
  // Accepte aussi le mois avec point final collé ("avr." avant l'année)
  const withYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wéèûîàâ]+\.?)\s+(\d{4})/i);
  if (withYear) {
    const key = norm(withYear[2]);
    if (monthsFr[key]) {
      return `${withYear[3]}-${monthsFr[key]}-${withYear[1].padStart(2, '0')}`;
    }
  }

  // Format textuel FR SANS année : "10 avr." / "10 avr" / "10 avril" / "sam. 10 avr."
  // → déduire l'année depuis receivedAt si disponible, sinon année courante
  // IMPORTANT : on préfère NE PAS inférer d'année plutôt que d'en mettre une fausse.
  // Cette branche est un DERNIER RECOURS — les patterns avec année sont prioritaires.
  const noYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wéèûîàâ]+\.?)$/i);
  if (noYear) {
    const key = norm(noYear[2]);
    const monthNum = monthsFr[key];
    if (monthNum) {
      const baseDate = referenceDate ? new Date(referenceDate) : new Date();
      const now = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
      const year = now.getUTCFullYear();
      const candidate = `${year}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      // Si la date est dans le passé lointain (> 180j), c'est probablement une réservation future
      // de l'année prochaine (ex: email reçu en novembre avec "10 avr." = avril prochain)
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

  // Format textuel anglais SANS année : "Apr 10" / "April 10" / "Apr. 10"
  // → même logique d'inférence d'année que le français
  const textEnNoYear = s.match(/([a-z]+)\.?\s+(\d{1,2})$/i);
  if (textEnNoYear && monthsEn[textEnNoYear[1].toLowerCase()]) {
    const monthNum = monthsEn[textEnNoYear[1].toLowerCase()];
    const baseDate = referenceDate ? new Date(referenceDate) : new Date();
    const now = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const year = now.getUTCFullYear();
    const candidate = `${year}-${monthNum}-${textEnNoYear[2].padStart(2, '0')}`;
    const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -180) return `${year + 1}-${monthNum}-${textEnNoYear[2].padStart(2, '0')}`;
    return candidate;
  }
  // "10 Apr" / "10 April" (jour avant mois EN, sans année)
  const textEnNoYearRev = s.match(/(\d{1,2})\s+([a-z]+)\.?$/i);
  if (textEnNoYearRev && monthsEn[textEnNoYearRev[2].toLowerCase()]) {
    const monthNum = monthsEn[textEnNoYearRev[2].toLowerCase()];
    const baseDate = referenceDate ? new Date(referenceDate) : new Date();
    const now = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
    const year = now.getUTCFullYear();
    const candidate = `${year}-${monthNum}-${textEnNoYearRev[1].padStart(2, '0')}`;
    const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -180) return `${year + 1}-${monthNum}-${textEnNoYearRev[1].padStart(2, '0')}`;
    return candidate;
  }

  return s; // retourner tel quel si aucun format reconnu
}

function parseMoneyAmount(raw: string): number {
  // Gère :
  // - 1 234,56  | 1.234,56 | 1,234.56
  // - symboles avant/après
  // - espaces insécables
  const clean = raw
    .replace(/[€$£¥₣₹₽]|EUR|USD|GBP|CHF|CAD|AUD/gi, '')
    .replace(/[\u00A0\u202F\s]+/g, '')
    .trim();

  if (!clean) return 0;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');
  let normalized = clean;

  if (hasComma && hasDot) {
    // Le dernier séparateur rencontré est le séparateur décimal
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // 1.234,56 -> 1234.56
      normalized = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56 -> 1234.56
      normalized = clean.replace(/,/g, '');
    }
  } else if (hasComma) {
    // 1234,56 ou 1,234 (thousands)
    normalized = /,\d{1,2}$/.test(clean)
      ? clean.replace(',', '.')
      : clean.replace(/,/g, '');
  } else if (hasDot) {
    // 1234.56 ou 1.234 (thousands)
    normalized = /\.\d{1,2}$/.test(clean)
      ? clean
      : clean.replace(/\./g, '');
  }

  const val = parseFloat(normalized);
  return (!isNaN(val) && isFinite(val) && val > 0 && val < 1000000) ? val : 0;
}

function extractConfirmationCode(text: string): string | undefined {
  const patterns = [
    /\bCode\s+de\s+confirmation\s*[:\-]\s*([A-Z0-9]{8,12})\b/i,
    /\bConfirmation\s+code\s*[:\-]\s*([A-Z0-9]{8,12})\b/i,
    /\bCode\s+de\s+r[eé]servation\s*[:\-]\s*([A-Z0-9]{8,12})\b/i,
    /\b(HM[A-Z0-9]{8,10})\b/,
    /\b([A-Z]{2}[A-Z0-9]{8,10})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) return m[1].toUpperCase();
  }
  return undefined;
}

function extractAirbnbListingId(body: string): string | undefined {
  const m = body.match(/(?:rooms|listings)\/(\d{5,12})/i);
  return m ? m[1] : undefined;
}

function extractReviewRating(text: string, subject: string): number | undefined {
  const combined = text + ' ' + subject;
  const m = combined.match(/(\d(?:[.,]\d)?)\s*\/\s*5|(\d)\s+[eé]toile[s]?|(\d)\s+star[s]?/i);
  if (m) {
    const val = parseFloat((m[1] || m[2] || m[3]).replace(',', '.'));
    if (val >= 1 && val <= 5) return val;
  }
  return undefined;
}

function extractReviewComment(text: string): string | undefined {
  const m = text.match(/(?:Commentaire|Comment|Avis|Review)\s*[:\-]\s*(.{10,500})/i);
  return m ? m[1].trim() : undefined;
}

function extractCurrency(text: string, subject: string): string {
  const combined = `${text} ${subject}`;
  // ⚠️  Ne pas tester \bFr\.?\b — correspond à "fr" dans "airbnb.fr" (domaine FR)
  //     ce qui fait passer TOUS les emails français en CHF par erreur.
  if (/\bCHF\b/.test(combined)) return 'CHF';
  if (/\bGBP\b|£/.test(combined)) return 'GBP';
  if (/\bCAD\b|C\$/.test(combined)) return 'CAD';
  if (/\bAUD\b|A\$/.test(combined)) return 'AUD';
  if (/\bEUR\b|€/.test(combined)) return 'EUR';
  if (/\bUSD\b|\$/.test(combined)) return 'USD';
  return 'EUR'; // Défaut : EUR (utilisateur en zone euro)
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
    // Guard renforcé : min 1 chiffre, max 8 chiffres avant virgule, pas suivi d'autres chiffres
    // Évite les faux positifs sur numéros de téléphone (ex: "0612345678")
    /(?<![0-9])([€$£]\s*[\d\s\xa0]{1,8}[,.]?\d{0,2})(?![0-9])/,
    /(?<![0-9])([\d][\d\s\xa0]{0,8}[,.]?\d{0,2})\s*[€$£](?![\d])/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseMoneyAmount(m[1]);
      if (val > 0) return val;
    }
  }
  return 0;
}

function extractCleaningFee(text: string): number | undefined {
  const patterns = [
    /frais\s+(?:de\s+)?m[eé]nage\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /nettoyage\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /cleaning\s+fee\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseMoneyAmount(m[1]);
      if (!isNaN(val) && val >= 0) return val;
    }
  }
  return undefined;
}

function extractServiceFee(text: string): number | undefined {
  const patterns = [
    /frais\s+de\s+service(?:\s+airbnb)?\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /commission\s+(?:airbnb|de\s+service)\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /service\s+fee\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseMoneyAmount(m[1]);
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
  //   "Vous gagnez\n79,05 €" (dans les emails de nouvelle réservation)
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
    /vous\s+gagnez\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /you\s+earn\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseMoneyAmount(m[1]);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return undefined;
}

// ─── Nouveaux extracteurs spécialisés ──────────────────────────────────────

function extractCheckInTime(text: string): string | undefined {
  // Formats Airbnb observés :
  //   "Heure d'arrivée : 15:00" / "Heure d'arrivée : à partir de 15h"
  //   "Arrivée après 15h00" / "Check-in : 15h00" / "à partir de 15:00"
  //   "Check-in time: 3:00 PM" / "After 3 PM"
  const patterns = [
    // Format bloc : "Arrivée\n(dim. 19 avr.)\n17:00"
    /arriv[eé]e?\s*(?:\n\s*(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+\d{1,2}\s+[A-Za-zÀ-ÿ.]+)?\s*\n\s*(\d{1,2}[h:]\d{2})/i,
    // Patterns avec label "heure d'arrivée" ou "check-in" → très spécifiques → extraire l'heure
    /heure(?:\s+d[''e])?\s*arriv[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s+time\s*[:\-–]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    // "Arrivée : HH:MM" — uniquement si suivi directement d'une heure (pas d'une date "10 avr.")
    // Le lookahead interdit que le chiffre soit suivi d'un espace + mois (= date)
    /arriv[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c))/i,
    /[àa]\s+partir\s+de\s+(\d{1,2}[h:]\d{0,2})/i,
    /after\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    // "Heure d'entrée : 15h" / "Entrée à partir de 15h"
    /heure(?:\s+d[''e])?\s*entr[eé]e?\s*[:\-–]\s*(?:[àa]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}

function extractCheckOutTime(text: string): string | undefined {
  // Formats Airbnb observés :
  //   "Heure de départ : 11:00" / "Départ avant 11h"
  //   "Check-out : 11h00" / "before 11 AM"
  const patterns = [
    // Format bloc : "Départ\n(ven. 24 avr.)\n10:00"
    /d[eé]part\s*(?:\n\s*(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+\d{1,2}\s+[A-Za-zÀ-ÿ.]+)?\s*\n\s*(\d{1,2}[h:]\d{2})/i,
    /heure(?:\s+de)?\s*d[eé]part\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s+time\s*[:\-–]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    // "Départ : HH:MM" — uniquement si suivi directement d'une heure (pas d'une date)
    /d[eé]part\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eé]vr|mars|avr|mai|juin|juil|ao[uû]t|sept|oct|nov|d[eé]c))/i,
    /avant\s+(\d{1,2}[h:]\d{2})/i,
    /before\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    // "Sortie à 11h" / "Heure de sortie : 11h"
    /heure(?:\s+de)?\s*sortie\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}

function normalizeTime(raw: string): string {
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

function extractNightlyRate(text: string): number | undefined {
  // Formats Airbnb observés :
  //   "89 € par nuit" / "Prix par nuit : 89 €"
  //   "Tarif nuitée : 89,00 €" / "89 €/nuit"
  //   "$89 per night" / "89 € x 3 nuits" / "89 € × 3 nuits"
  const parseAmt = (s: string) => {
    const n = parseMoneyAmount(s);
    return !isNaN(n) && n > 0 && n < 10000 ? n : 0;
  };
  const patterns = [
    // "89 € par nuit" ou "89,00€ par nuit" — ancre sur le nombre JUSTE avant le symbole/mot
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]\s*(?:par\s+nuit|\/nuit)/i,
    // "€ 89 par nuit" — symbole AVANT le nombre
    /[€$£]\s*([\d\s\xa0\u202f]*[,.]?\d+)\s*(?:par\s+nuit|\/nuit)/i,
    /prix\s+(?:de\s+la\s+)?nuit[eé]e?\s*[:\-–]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    /tarif\s+(?:de\s+la\s+)?nuit[eé]e?\s*[:\-–]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    // "89 € x 3 nuits" ou "89 € × 3 nuits" (× Unicode U+00D7 ou × en entité HTML)
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]?\s*[×x×]\s*\d+\s*nuits?/i,
    // "89 € / nuit × 3 nuits" — format récapitulatif Airbnb
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]\s*\/\s*nuit/i,
    // "$89 per night"
    /[€$£]\s*([\d\s\xa0\u202f]*[,.]?\d+)\s*per\s+night/i,
    /([\d\s\xa0\u202f]*[,.]?\d+)\s*[€$£]?\s*per\s+night/i,
    /nightly\s+rate\s*[:\-–]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseAmt(m[1]);
      if (val > 0) return val;
    }
  }
  return undefined;
}

function extractTaxAmount(text: string): number | undefined {
  // Formats : "Taxes : 12,00 €" / "Taxe de séjour : 4 €" / "TVA : 5,00 €"
  //            "Taxes and fees: $12" / "Tourist tax: 4 €"
  const parseAmt = (s: string) => {
    const n = parseMoneyAmount(s);
    return !isNaN(n) && n > 0 ? n : 0;
  };
  const patterns = [
    /taxe(?:s)?\s+de\s+s[eé]jour(?:\s+collect[eé]e?(?:s)?|s)?\s*[:\-–]*\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s*(?:et\s+frais)?\s*[:\-–]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tva\s*[:\-–]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tourist\s+tax\s*[:\-–]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s+and\s+fees?\s*[:\-–]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /occupancy\s+tax\s*[:\-–]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseAmt(m[1]);
      if (val > 0) return val;
    }
  }
  return undefined;
}

function extractPayoutDate(text: string): string | undefined {
  // Formats Airbnb versement :
  //   "Prévu le 14 avril 2026" / "Date de versement : 14/04/2026"
  //   "Envoyé le 13 avr. 2026" / "Estimated arrival: Apr 14, 2026"
  //   "Expected by April 14, 2026"
  const MOIS_RE = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?\\.?|oct\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)`;
  const patterns = [
    new RegExp(`pr[eé]vu\\s+le\\s+(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`date\\s+(?:de\\s+)?versement\\s*[:\\-–]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`envoy[eé]\\s+le\\s+(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`estimated\\s+arrival\\s*[:\\-–]\\s*(${MOIS_RE}\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
    new RegExp(`expected\\s+by\\s+(${MOIS_RE}\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
    /date\s+de\s+versement\s*[:\-–]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /payout\s+date\s*[:\-–]\s*([^\n\r<,]{5,30})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const d = normalizeDate(m[1].trim());
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    }
  }
  return undefined;
}

function extractPayoutMethod(text: string): string | undefined {
  // "Virement bancaire" / "PayPal" / "Bank transfer" / "Payoneer"
  if (/virement\s+bancaire|bank\s+transfer|direct\s+deposit/i.test(text)) return 'Virement bancaire';
  if (/paypal/i.test(text)) return 'PayPal';
  if (/payoneer/i.test(text)) return 'Payoneer';
  if (/wise|transferwise/i.test(text)) return 'Wise';
  if (/western\s+union/i.test(text)) return 'Western Union';
  if (/carte\s+(?:de\s+cr[eé]dit|bancaire)|credit\s+card/i.test(text)) return 'Carte bancaire';
  return undefined;
}

function extractCancellationPolicy(text: string): string | undefined {
  // "Politique d'annulation : Flexible" / "Annulation flexible" / "Politique stricte"
  // "Cancellation policy: Flexible" / "Moderate" / "Strict"
  // ── 1. Avec label explicite (le plus fiable) ──────────────────────────────
  const labelFR = text.match(/politique\s+d[''e]annulation\s*[:\-–]?\s*(flexible|mod[eé]r[eé]e?|stricte?|ferme|super\s+strict|non\s+remboursable|remboursable|24\s+heures?)/i);
  if (labelFR) return normalizePoliceName(labelFR[1]);

  const labelEN = text.match(/cancellation\s+policy\s*[:\-–]?\s*(flexible|moderate|strict|firm|super\s+strict|non.refundable|refundable|24.hour)/i);
  if (labelEN) return normalizePoliceName(labelEN[1]);

  // ── 2. Sections dédiées annulation (contexte fort) ────────────────────────
  // "annulation flexible" / "politique flexible" / "flexible cancellation"
  const sectionFR = text.match(/(?:politique|conditions?|type)\s+(?:d[''e]\s*)?(?:annulation|remboursement)\s*[:\-–]?\s*(flexible|mod[eé]r[eé]e?|stricte?|ferme|24\s+heures?)/i);
  if (sectionFR) return normalizePoliceName(sectionFR[1]);

  const sectionEN = text.match(/(?:cancellation|refund)\s+(?:policy|type|conditions?)\s*[:\-–]?\s*(flexible|moderate|strict|firm|24.hour)/i);
  if (sectionEN) return normalizePoliceName(sectionEN[1]);

  // ── 3. Mots-clés UNIQUEMENT si contexte annulation présent dans la même phrase ──
  // Évite de retourner "Flexible" sur un texte quelconque contenant ce mot
  const ctxRe = /annulation|cancellation|remboursement|refund/i;
  const lines = text.split(/[\n\r]/);
  for (const line of lines) {
    if (!ctxRe.test(line)) continue;
    if (/\bflexible\b/i.test(line)) return 'Flexible';
    if (/mod[eé]r[eé]e?\b/i.test(line)) return 'Modérée';
    if (/\bstricte?\b/i.test(line)) return 'Stricte';
    if (/24\s*h(?:eures?)?/i.test(line)) return 'Flexible (24h)';
  }
  return undefined;
}

function normalizePoliceName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (/flex/i.test(s)) return 'Flexible';
  if (/24.?h/i.test(s)) return 'Flexible (24h)';
  if (/mod/i.test(s)) return 'Modérée';
  if (/ferm|firm/i.test(s)) return 'Ferme';
  if (/strict|super/i.test(s)) return 'Stricte';
  if (/no.refund|non.refund/i.test(s)) return 'Non remboursable';
  return raw.trim();
}

function isLikelyGarbagePropertyLabel(value?: string): boolean {
  if (!value?.trim()) return true;

  const normalized = normalizeForMatching(value)
    .toLowerCase()
    .replace(/[–—-]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!normalized || normalized.length < 4) return true;
  if (/^(?:logement|maison|appartement|lieu|lieux|home|place)$/.test(normalized)) return true;
  if (/\bles\s+lieux\s+ou\s+pour\b/.test(normalized)) return true;

  const stopWords = new Set([
    'les', 'des', 'une', 'pour', 'avec', 'sur', 'sous', 'dans', 'par', 'qui', 'que',
    'la', 'le', 'du', 'au', 'de', 'et', 'ou', 'tout', 'tous', 'aux', 'son', 'ses',
  ]);
  const significantTokens = normalized
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  return significantTokens.length === 0;
}

function extractPropertyName(text: string, subject?: string): string | undefined {
  // ── GUARD : emails de versement → jamais de nom de logement ──────────────
  // "Nous avons envoyé un versement de X €" → return undefined immédiatement
  const PAYOUT_RE = /nous\s+avons\s+envoy[eé]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout|versement\s+de\s+[\d,.\s]+\s*[€$£]|your\s+payout\s+of/i;
  const isPayoutEmail = PAYOUT_RE.test(text.slice(0, 600)) || (subject ? PAYOUT_RE.test(subject) : false);
  if (isPayoutEmail) return undefined;

  // Helper: nettoie un candidat de nom de logement
  const cleanCandidate = (raw: string): string => {
    const c = stripDateSuffix(raw.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' '))
      .replace(/\s*\|.*$/, '')
      .replace(/\s*[-–]\s*Airbnb.*$/i, '')
      .replace(/\.$/, '')
      .replace(/\s*\(airbnb\)/i, '')
      .trim()
      .slice(0, 80);
    if (c && (/[?=&%]|https?:/.test(c) || (c.length > 50 && !c.includes(' ')))) return '';
    return c;
  };

  // ── 1. CORPS du mail — patterns structurés (les plus fiables) ─────────────
  // Vrais formats Airbnb observés dans les emails hôte 2024-2026 :
  //   "Réservation pour NomLogement, 10–13 avr."   → dans le corps
  //   "Annonce : NomLogement"
  //   "Votre logement : NomLogement"
  //   "Logement : NomLogement"
  //   "Your listing: NomLogement"
  const bodyPatterns: RegExp[] = [
    // ── Format Airbnb hôte 2024-2026 RÉEL : NomLogement AVANT "Logement entier" ──
    // "Maisonnette T2 quartier calme\nLogement entier"
    /([^\r\n<]{5,80})\r?\n\s*Logement\s+entier/i,
    // "Appartement Bleu Relax\nLogement entier · X chambres"
    /([^\r\n<]{5,80})\r?\n\s*Logement\s+entier\s*[·•]/i,
    // ── Format Airbnb hôte 2024-2026 : label seul sur une ligne, valeur sur la suivante ──
    // "Annonce\nAppartement Bleu Relax"  (sans deux-points)
    /(?:^|\r?\n)Annonce\s*\r?\n([^\r\n<]{5,80})/i,
    // "Logement\nAppartement Bleu Relax"
    /(?:^|\r?\n)Logement\s*\r?\n([^\r\n<]{5,80})/i,
    // "Listing\nAppartement Bleu Relax"
    /(?:^|\r?\n)Listing\s*\r?\n([^\r\n<]{5,80})/i,
    // "Your listing\nAppartement Bleu Relax"
    /(?:^|\r?\n)Your\s+listing\s*\r?\n([^\r\n<]{5,80})/i,
    // "Annonce :\nAppartement Bleu Relax"  (colon + newline)
    /(?:^|\r?\n)(?:votre\s+)?annonce\s*[:\-]\s*\r?\n([^\r\n<]{5,80})/i,
    // "Logement :\nAppartement Bleu Relax"
    /(?:^|\r?\n)(?:votre\s+)?logement\s*[:\-]\s*\r?\n([^\r\n<]{5,80})/i,
    // Format Airbnb hôte : "Identité vérifiée\n\nLogement\nLogement entier"
    /(?:Identit[eé]\s+v[eé]rifi[eé]e.*?(?:\r?\n)+)([^\r\n]+)(?:\r?\n)+Logement\s+entier/i,
    // Format Airbnb hôte : "Réservation pour NomLogement, 10–13 avr."
    // Le nom est entre "pour " et la virgule+date ou fin de ligne
    /r[eé]servation\s+pour\s+([^,\n\r<]{5,70})(?:,|\n|\r|$)/i,
    // Formats d'états : "souhaite changer sa réservation" / "a réservé" etc. avec capture jusqu'à la date
    /(?:souhaite\s+changer\s+sa\s+r[eé]servation|a\s+r[eé]serv[eé]s?|a\s+annul[eé]s?|a\s+modifi[eé]\s+sa\s+r[eé]servation)\s+([\s\S]{15,150}?)\s+(?:du |de |pour |arriv[eé]e |check[-\s]?in|voyage |\d{1,2}\s+(?:janv?|f[eé]vr?|mars|avril|avr|mai|juin|juil|ao[uû]t|sept?|oct|nov|d[eé]c))/i,
    // "Logement : NomLogement" / "Votre logement : NomLogement"  (inline avec deux-points)
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
      if (c.length >= 5 && !/versement|payout|virement|envoy[eé]|r[eé]gl[eé]|€\s*\d|^\d+[,.]?\d*\s*[€$]/i.test(c)) {
        // Rejeter si le candidat ressemble à un nom de personne (2 mots, première lettre majuscule, pas de chiffre)
        // "Kamel Freytag" → faux positif si juste avant "Logement entier"
        // Un nom de logement a généralement un chiffre (T2, T3) ou plus de 2 mots ou des mots communs (Appartement, Maison, etc.)
        const isPersonName = /^[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+\s+[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+$/.test(c)
          && !/\b(?:appartement|maison|maisonn?ette|villa|studio|chambre|logement|loft|t[1-9]|f[1-9]|duplex|terrasse|jardin|centre|quartier|calme|cozy|relax|cigogne|bleu)\b/i.test(c);
        if (!isPersonName && !isLikelyGarbagePropertyLabel(c)) return c;
      }
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
      // "Rappel : NomLogement" (rappels hôte) — SEULEMENT si ce qui suit n'est pas un prénom+verbe
      // Exclure "Rappel : Marie arrive demain" → "Marie arrive demain" n'est pas un logement
      // Le nom du logement ne commence pas par un prénom suivi d'un verbe
      /rappel\s*[–\-:]\s*(?![A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-z]+\s+(?:arrive|part|s[eé]jour|est|a\s))([^,\n\r]{5,60})/i,
      // "Demande de réservation – NomLogement"
      /demande\s+de\s+r[eé]servation\s*[–\-:]\s*([^,\n\r]{5,60})/i,
      // "Votre annonce NomLogement a reçu…"
      /votre\s+annonce\s+([^,\n\r\s]{5,60}(?:\s+\S+){0,4})\s+a\s+re[cç]u/i,
      // "[Airbnb] NomLogement"
      /\[airbnb\]\s+([^–\-\n\r]{5,60})(?:\s*[–\-]|$)/i,
      // "Airbnb – NomLogement"
      /\bairbnb\s*[–\-]\s*([^,\n\r]{5,60})/i,
      // Format "NomLogement – Rappel/Réservation/Check-in/…" (nom en tête)
      // Exclure si la partie gauche ressemble à un prénom+verbe ("Marie arrive – ...")
      // Ajout : r[eé]servation|annul|modifi|avis pour couvrir tous les sujets courants
      /^((?!.*\b(?:arrive|part|est\s+l[àa]|demain|aujourd)\b)[^–\-\n\r]{5,60}?)\s*[–\-]\s*(?:rappel|check|s[eé]jour|d[eé]part|arriv|confirm|r[eé]servation|annul|modifi|avis|review|paiement|payment|message)/i,
      // Concernant un logement
      /concernant\s+(?:votre\s+logement\s+)?([^,\n\r]{5,60})/i,
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const c = cleanCandidate(m[1]);
        if (c.length >= 5 && !/versement|payout|virement|envoy[eé]|r[eé]gl[eé]|^\d+[,.]?\d*\s*[€$]/i.test(c) && !isLikelyGarbagePropertyLabel(c)) return c;
      }
    }

    // ── 3. DERNIER RECOURS : nettoyer le sujet entier ────────────
    // Uniquement si le sujet ne ressemble PAS à un payout ou un nom de voyageur
    const isPersonSubject = /^(?:\[[^\]]+\]\s*)?[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F\-]+){0,3}\s+(a\s+r[eé]serv|annul|modifi|laiss|part\s|arrive|r[eé]dig|souhait|veut|aimer)/i.test(subject)
      || /\barrive\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject)
      || /^rappel\s*[:\-–]/i.test(subject)
      || /\bpart\s+(aujourd|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(subject)
      || /\bcheck[\s-]?(in|out)\b/i.test(subject);
    if (!isPersonSubject) {
      const cleaned = subject
        .replace(/airbnb/gi, '')
        .replace(/r[eé]servation\s+(confirm[eé]e?|accept[eé]e?|re[cç]ue?)/gi, '')
        .replace(/nouvelle?\s+r[eé]servation/gi, '')
        .replace(/booking\s+(confirmed?|received?)/gi, '')
        .replace(/rappel\s+(?:d['e]?\s*)?arriv[eé]e?/gi, '')
        .replace(/rappel\s+check.?in/gi, '')
        .replace(/rappel\s*[:\-–]/gi, '')
        .replace(/check.?(?:in|out)/gi, '')
        .replace(/confirmation\s+de\s+s[eé]jour/gi, '')
        .replace(/votre\s+(?:voyage|s[eé]jour)\s+[àa]/gi, '')
        // Supprimer les fragments "arrive le/demain/aujourd'hui/dans N jours"
        .replace(/arrive\s+(?:le|demain|aujourd['']hui|dans\s+\d)/gi, '')
        // Supprimer "part aujourd'hui" / "part demain"
        .replace(/part\s+(aujourd['']hui|demain)/gi, '')
        // Supprimer "dans N jours" / "dans N nuits"
        .replace(/dans\s+\d+\s+(?:jours?|nuits?)/gi, '')
        // Supprimer les prénoms isolés (Prénom + verbe de rappel)
        .replace(/[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŸŒÆ][a-zàâéèêëîïôùûüÿœæ]+\s+(?:arrive|part|est\s+l[àa]|a\s+laiss[eé])/gi, '')
        .replace(/\[|\]/g, '')
        .replace(/[–\-:,!?]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const fc = cleanCandidate(cleaned);
      // Rejeter si le résultat est trop court, un verbe seul, ou du bruit pur
      if (fc.length >= 5
        && !/versement|payout|virement|envoy[eé]|^\d+[,.]?\d*\s*[€$]/i.test(fc)
        && !/^(demain|aujourd|hier|arrive|part|s[eé]jour|rappel|check|confirmat)$/i.test(fc.split(' ')[0])
      && !isLikelyGarbagePropertyLabel(fc)
      ) {
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
  body: string,
  receivedAt: string,
): ParsedBooking | null {
  const warnings: string[] = [];

  // --- NOUVEAU: Extraction pro du JSON-LD Schema.org ---
  const jsonLdMatch = body.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  let jsonLdParsed: unknown = null;
  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      jsonLdParsed = JSON.parse(jsonLdMatch[1]);
      // Parfois c'est un tableau de schemas
      if (Array.isArray(jsonLdParsed)) {
        const schemaItem = jsonLdParsed.find((item: unknown) => {
          if (!item || typeof item !== 'object') return false;
          const typeValue = (item as { '@type'?: unknown })['@type'];
          return typeValue === 'LodgingReservation' || typeValue === 'Reservation';
        });
        jsonLdParsed = schemaItem || jsonLdParsed[0];
      }
    } catch (e) {
      console.warn("Échec du parsing JSON-LD Airbnb:", e);
      warnings.push("Données structurées (JSON-LD) illisibles.");
    }
  }

  // 1. Vérifier que c'est bien un email Airbnb
  const isAirbnbSender = AIRBNB_SENDERS.some(s => from.toLowerCase().includes(s));
  const isAirbnbSubject = /airbnb/i.test(subject) || /r[eé]servation/i.test(subject);
  if (!isAirbnbSender && !isAirbnbSubject) return null;

  // 1b. Ignorer les emails informatifs/maintenance/marketing — pas de réservation à importer
  const normalizedSubjectForIgnore = normalizeForMatching(subject);
  const isLikelyPayoutSubject = SUBJECT_PATTERNS.payout.some((p) => p.test(subject) || p.test(normalizedSubjectForIgnore))
    || /\b(?:versement|payout|virement)\b/i.test(normalizedSubjectForIgnore);
  if (!isLikelyPayoutSubject && IGNORED_PATTERNS.some(p => p.test(subject))) return null;

  // 2. Déterminer le type de mail (moteur versionné + traces)
  // Hiérarchie explicite :
  //   1) subject patterns (priorité stricte)
  //   2) body fallback (slugs/tracking/texte)
  let bookingType: ParsedBooking['bookingType'] = 'new';
  let classificationSource: 'subject' | 'body-fallback' = 'subject';
  let classificationRuleId = '';
  let classificationRegex = '';

  const subjectMatch = matchSubjectClassification(subject);
  if (subjectMatch) {
    bookingType = subjectMatch.type;
    classificationSource = 'subject';
    classificationRuleId = subjectMatch.ruleId;
    classificationRegex = subjectMatch.regex;
  } else {
    const bodyFallbackMatch = matchBodyFallbackClassification(body);
    if (bodyFallbackMatch) {
      bookingType = bodyFallbackMatch.type;
      classificationSource = 'body-fallback';
      classificationRuleId = bodyFallbackMatch.ruleId;
      classificationRegex = bodyFallbackMatch.regex;
    } else {
      // Hard fallback payout : certains sujets Airbnb payout ont des variations Unicode
      // ou de ponctuation qui peuvent rater les regex de classification standard.
      const payoutSignalText = `${normalizeForMatching(subject)} ${normalizeForMatching(body.slice(0, 1200))}`;
      const hasPayoutKeyword = /\b(?:versement|payout|virement|r[eé]mun[eé]ration)\b/i.test(payoutSignalText);
      const hasMoneySignal = /(?:[€$£]|\b\d{1,4}[\s\u00a0\u202f]?[,.]\d{2}\b)/i.test(payoutSignalText);

      if (hasPayoutKeyword && hasMoneySignal) {
        bookingType = 'payout';
        classificationSource = 'body-fallback';
        classificationRuleId = 'fallback.payout_hard_signal';
        classificationRegex = '(versement|payout|virement)+(money)';
      } else {
        // Aucun type détecté ni depuis le sujet ni depuis le corps → ignorer
        return null;
      }
    }
  }

  // 2b. Garde anti faux-positif "payout" : un email de réservation peut inclure
  // un bloc "Versement de l'hôte" dans son récap financier.
  const hasConfirmationCodeSignal = /code\s+de\s+confirmation\s*[:\-]?\s*HM[A-Z0-9]{6,12}/i.test(body);
  const hasStaySignalsInBody = /arriv[eé]e[\s\S]{0,180}d[eé]part/i.test(body)
    || /logement\s+entier/i.test(body)
    || /r[eé]servation\s+pour/i.test(body)
    || /check.?in[\s\S]{0,120}check.?out/i.test(body);
  const hasReservationSignalsInBody = hasStaySignalsInBody
    || (hasConfirmationCodeSignal && /(?:arriv[eé]e|d[eé]part|check.?in|check.?out|s[eé]jour)/i.test(body));
  if (bookingType === 'payout' && hasReservationSignalsInBody) {
    bookingType = 'new';
    classificationSource = 'body-fallback';
    classificationRuleId = 'override.payout_contains_reservation_signals';
    classificationRegex = 'code_confirmation|arrivee_depart|logement_entier';
  }

  // 3. Nettoyer le HTML si présent
  const text = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Balises de bloc → saut de ligne pour préserver la structure ligne par ligne
    .replace(/<\/(?:tr|td|th|div|p|br|h[1-6]|li|section|article|header|footer|table|span)[^>]*>/gi, '\n')
    .replace(/<(?:br|hr)[^>]*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

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
    const JOUR_RE = `(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)`;

    const checkInPatterns = [
      // "Arrivée ven. 18 sept." / "Arrivée (ven. 18 sept.)" (inline, sans ':' ni saut dédié)
  new RegExp(`arriv[eé]e?\\s+\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // Format relâché multi-lignes/HTML : capture la date proche du bloc Arrivée
  new RegExp(`arriv[eé]e?[\\s\\S]{0,80}?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // ── Format Airbnb hôte 2024-2026 : label seul + date sur la ligne suivante ──
      // "Arrivée\n(mer. 20 mai)" / "Arrivée\n(20 mai 2026)"
      new RegExp(`arriv[eé]e?\\s*\\n\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Arrivée\ndim. 19 avr." / "Arrivée\n19 avr. 2026"
      new RegExp(`arriv[eé]e?\\s*\\n\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-in\n(mer. 20 mai)"
      new RegExp(`check.?in\\s*\\n\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Check-in\ndim. 19 avr."
      new RegExp(`check.?in\\s*\\n\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Arrivée : (sam. 10 avr.)"
      new RegExp(`arriv[eé]e?\\s*[:\\-–]\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Arrivée : sam. 10 avr." / "Arrivée : 10 avr." / "Arrivée : 10 avr. 2026"
      new RegExp(`arriv[eé]e?\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-in : (sam. 10 avr.)"
      new RegExp(`check.?in\\s*[:\\-–]\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Check-in : sam. 10 avr."
      new RegExp(`check.?in\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Entrée : 10 avr."
      new RegExp(`entr[eé]e?\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec année : "du 10/04/2026" ou "10/04/2026"
      /(?:du\s+|from\s+)?(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})/i,
      // EN "from April 10, 2026" / "from Apr 10 2026"
      /from\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /from\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage FR "10 avr. – 13 avr." → prendre la PREMIÈRE date
      new RegExp(`(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*[–\\-]`, 'i'),
      // Plage FR compacte "10–13 avr. 2026" → premier nombre (checkIn)
      new RegExp(`(\\d{1,2})\\s*[–\\-]\\s*\\d{1,2}\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?`, 'i'),
      // Plage EN "April 10–13, 2026" ou "Apr 10 – Apr 13, 2026" → première partie
      /([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /([A-Za-z]+\.?\s+\d{1,2})(?:\s*[–\-]\s*(?:\d{1,2}|[A-Za-z]+\.?\s+\d{1,2}),?\s+\d{4})/i,
    ];
    const checkOutPatterns = [
      // "Départ dim. 20 sept." / "Départ (dim. 20 sept.)" (inline, sans ':' ni saut dédié)
  new RegExp(`d[eé]part\\s+\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // Format relâché multi-lignes/HTML : capture la date proche du bloc Départ
  new RegExp(`d[eé]part[\\s\\S]{0,80}?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // ── Format Airbnb hôte 2024-2026 : label seul + date sur la ligne suivante ──
      // "Départ\n(ven. 24 avr.)" / "Départ\n(24 avr. 2026)"
      new RegExp(`d[eé]part\\s*\\n\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Départ\nven. 24 avr." / "Départ\n24 avr. 2026"
      new RegExp(`d[eé]part\\s*\\n\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-out\n(ven. 24 avr.)"
      new RegExp(`check.?out\\s*\\n\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Check-out\nven. 24 avr."
      new RegExp(`check.?out\\s*\\n\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Départ : (mar. 13 avr.)"
      new RegExp(`d[eé]part\\s*[:\\-–]\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Départ : mar. 13 avr." / "Départ : 13 avr."
      new RegExp(`d[eé]part\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-out : (13 avr.)"
      new RegExp(`check.?out\\s*[:\\-–]\\s*\\(?\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*\\)?`, 'i'),
      // "Check-out : 13 avr."
      new RegExp(`check.?out\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Sortie : 13 avr."
      new RegExp(`sortie\\s*[:\\-–]\\s*(?:${JOUR_RE}\\.?\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec année : "au 13/04/2026"
      /(?:au\s+|to\s+)(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})/i,
      // EN "to April 13, 2026" / "to Apr 13 2026"
      /to\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /to\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage "10 avr. – 13 avr." → prendre la DEUXIÈME date (après le tiret)
      new RegExp(`[–\\-]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Plage FR compacte "10–13 avr. 2026" → second nombre + mois + année
      new RegExp(`\\d{1,2}\\s*[–\\-]\\s*(\\d{1,2})\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?`, 'i'),
    ];

    // Chercher d'abord dans le corps, puis dans le sujet comme fallback
  checkIn = extractDate(text, checkInPatterns, receivedAt) || extractDate(subject, checkInPatterns, receivedAt);
  checkOut = extractDate(text, checkOutPatterns, receivedAt) || extractDate(subject, checkOutPatterns, receivedAt);

    // ── Post-traitement : plage FR compacte "10–13 avr. 2026" ────────────────
    // Les patterns avec 3 groupes capturés (jour1, mois, année) ne sont pas gérés
    // par extractDate (qui lit seulement match[1]). On les traite ici.
    if (!checkIn || !checkOut) {
      const combinedSrc = text + ' ' + subject;
      // "10–13 avr. 2026" / "10-13 avr. 2026" / "10 – 13 avril 2026"
      const MOIS_BOTH2 = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?)`;
      const frCompact = new RegExp(`(\\d{1,2})\\s*[–\\-]\\s*(\\d{1,2})\\s+(${MOIS_BOTH2}(?:\\.?))(?:\\s+(\\d{4}))?`, 'i');
      const fcm = combinedSrc.match(frCompact);
      if (fcm) {
        const day1 = fcm[1]; const day2 = fcm[2]; const mon = fcm[3]; const yr = fcm[4] || '';
  const d1 = normalizeDate(`${day1} ${mon}${yr ? ' ' + yr : ''}`, receivedAt);
  const d2 = normalizeDate(`${day2} ${mon}${yr ? ' ' + yr : ''}`, receivedAt);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d1)) checkIn  = checkIn  || d1;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d2)) checkOut = checkOut || d2;
      }
    }

    // Fallback : chercher dates avec ou sans année dans texte + sujet combinés
    if (!checkIn || !checkOut) {
      const combinedText = text + ' ' + subject;
      // Dates AVEC année
      const datesWithYear = [...combinedText.matchAll(/\b(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})\b/gi)]
        .map(m => normalizeDate(m[1], receivedAt))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (datesWithYear.length >= 2) {
        checkIn  = checkIn  || datesWithYear[0];
        checkOut = checkOut || datesWithYear[1];
      }
      // Dates SANS année : textuelles FR/EN (ex: "10 avr.", "Apr 10")
      if (!checkIn || !checkOut) {
        const MOIS_BOTH = `(?:janv?|f[eé]vr?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?|oct|nov|dec)`;
        const noYearRe = new RegExp(`\\b(\\d{1,2}\\s+${MOIS_BOTH}|${MOIS_BOTH}\\s+\\d{1,2})\\b`, 'gi');
        const datesNoYear = [...combinedText.matchAll(noYearRe)]
          .map(m => normalizeDate(m[1], receivedAt))
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
        if (datesNoYear.length >= 2) {
          checkIn  = checkIn  || datesNoYear[0];
          checkOut = checkOut || datesNoYear[1];
        } else if (datesNoYear.length === 1 && !checkIn) {
          checkIn = datesNoYear[0];
        }
      }
      // EN compact range "April 10–13, 2026" / "Apr 10-13 2026"
      if (!checkOut && checkIn) {
        const compactRe = /([A-Za-z]+)\.?\s+(\d{1,2})\s*[–\-]\s*(\d{1,2}),?\s+(\d{4})/;
        const cr = combinedText.match(compactRe);
        if (cr) {
          const monthsEn: Record<string, string> = {
            january:'01', jan:'01', february:'02', feb:'02', march:'03', mar:'03',
            april:'04', apr:'04', may:'05', june:'06', jun:'06', july:'07', jul:'07',
            august:'08', aug:'08', september:'09', sep:'09', october:'10', oct:'10',
            november:'11', nov:'11', december:'12', dec:'12',
          };
          const mo = monthsEn[cr[1].toLowerCase()];
          if (mo) {
            checkIn  = checkIn  || `${cr[4]}-${mo}-${cr[2].padStart(2, '0')}`;
            checkOut = checkOut || `${cr[4]}-${mo}-${cr[3].padStart(2, '0')}`;
          }
        }
      }
    }
  }

  // Pas de dates = email non parsable (sauf types qui n'ont pas forcément de dates)
  if (!checkIn || !checkOut) {
    if (bookingType !== 'payout' && bookingType !== 'reminder' && bookingType !== 'review'
        && bookingType !== 'modified' && bookingType !== 'cancelled'
        && bookingType !== 'checkout') return null;
  }

  // 5. Calculer les nuits (robuste aux dates invalides)
  const nights = (() => {
    if (!checkIn || !checkOut) return 0;
    const inTs = new Date(`${checkIn}T00:00:00.000Z`).getTime();
    const outTs = new Date(`${checkOut}T00:00:00.000Z`).getTime();
    if (Number.isNaN(inTs) || Number.isNaN(outTs)) return 0;
    const diff = Math.round((outTs - inTs) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(diff) || diff <= 0) return 0;
    return Math.min(365, Math.max(1, diff));
  })();

  // 6. Extraire tous les champs enrichis selon le type d'email
  let price               = extractPrice(text) || extractPrice(subject);
  const confirmationCode    = extractConfirmationCode(text) || extractConfirmationCode(subject);
  let guestNameExtracted  = extractGuestName(subject, text);
  let propertyNameExtracted = extractPropertyName(text, subject);
  const guestCountry        = extractGuestCountry(text);
  const guestLanguage       = detectGuestLanguage(text, subject);
  // Extraire l'ID Airbnb de l'annonce depuis le corps HTML brut (avant stripping)
  // Utile pour les emails d'avis qui ne contiennent pas le nom du logement
  const airbnbListingId     = extractAirbnbListingId(body);
  const guestComposition    = bookingType !== 'payout'
    ? extractGuestComposition(text, subject)
    : { total: 0 };

  // ── Champs financiers : selon le type ────────────────────────────────────
  // new/modified/cancelled/reminder → détail complet des frais
  // checkout                        → totalPrice uniquement (pas de détail frais)
  // review                          → aucun champ financier
  // payout                          → seulement hostPayout + payoutDate/Method
  // Les emails de rappel Airbnb contiennent souvent le récapitulatif complet du séjour
  // → on extrait nightlyRate/cleaningFee/serviceFee/taxAmount pour enrichir la fiche
  const isFinanceType = bookingType === 'new' || bookingType === 'modified' || bookingType === 'cancelled' || bookingType === 'reminder';
  const nightlyRate  = isFinanceType ? extractNightlyRate(text) : undefined;
  const cleaningFee  = isFinanceType ? extractCleaningFee(text) : undefined;
  const serviceFee   = isFinanceType ? extractServiceFee(text) : undefined;
  const taxAmount    = isFinanceType ? extractTaxAmount(text) : undefined;
  const hostPayout   = extractHostPayout(text) || extractHostPayout(subject);
  let financeConfidencePenalty = 0;

  // ── Réconciliation financière ───────────────────────────────────────────
  // 1) Si total absent mais détail présent, on reconstitue un total estimé.
  if (bookingType !== 'payout' && price <= 0 && nightlyRate && nights > 0) {
    const estimatedTotal = (nightlyRate * nights) + (cleaningFee || 0) + (serviceFee || 0) + (taxAmount || 0);
    if (estimatedTotal > 0) {
      price = Math.round(estimatedTotal * 100) / 100;
      warnings.push('Montant total reconstruit depuis le détail financier');
    }
  }

  // 2) Détection d'anomalies sur les montants détaillés.
  if (bookingType !== 'payout' && price > 0) {
    const knownFees = (cleaningFee || 0) + (serviceFee || 0) + (taxAmount || 0);
    if (knownFees > 0 && knownFees > price * 0.9) {
      warnings.push('Frais/taxes anormalement élevés vs montant total');
      financeConfidencePenalty += 5;
    }
  }

  // 3) Versement : écart fort entre total détecté et hostPayout.
  if (bookingType === 'payout' && hostPayout && price > 0) {
    const gap = Math.abs(price - hostPayout);
    if (gap > Math.max(3, hostPayout * 0.1)) {
      warnings.push(`Écart entre montant détecté (${price}) et versement hôte (${hostPayout})`);
      financeConfidencePenalty += 5;
    }
  }

  // ── Horaires check-in/check-out : seulement pour new/modified/reminder/checkout ─
  const needsTimes = bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'checkout';
  const checkInTime  = (bookingType !== 'checkout') && needsTimes ? extractCheckInTime(text) : undefined;
  const checkOutTime = needsTimes ? extractCheckOutTime(text) : undefined;

  // ── Politique annulation : new + cancelled + modified ───────────────────
  const cancellationPolicy  = (bookingType === 'new' || bookingType === 'cancelled' || bookingType === 'modified')
                                ? extractCancellationPolicy(text) : undefined;
  // ── Réservation instantanée : new uniquement ─────────────────────────────
  const isInstantBook       = bookingType === 'new'
                                ? /r[eé]servation\s+instantan[eé]e?|instant\s+book/i.test(subject + ' ' + text.slice(0, 300))
                                : undefined;
  // ── Versement : payout uniquement ────────────────────────────────────────
  const payoutDate          = bookingType === 'payout' ? extractPayoutDate(text) : undefined;
  const payoutMethod        = bookingType === 'payout' ? extractPayoutMethod(text) : undefined;
  // Modification : nouvelles dates proposées
  // On cherche un deuxième couple de dates différent de checkIn/checkOut courant
  let modifiedCheckIn: string | undefined;
  let modifiedCheckOut: string | undefined;
  if (bookingType === 'modified') {
    const MOIS_RE2 = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?)`;
    const DATE_RANGE_RE = new RegExp(
      `(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)\\s*[–\\-]\\s*(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)`,
      'ig'
    );

    // ── 1. Bloc "Nouvelles dates / Dates modifiées / New dates" ──────────────
    const modDateBlock = text.match(
      /(?:nouvelle[s]?\s+dates?|dates?\s+modifi[eé]e?s?|new\s+dates?|dates?\s+propos[eé]e?s?|proposed\s+dates?)\s*[:\-–]\s*([^\n\r<]{5,80})/i
    );
    if (modDateBlock) {
      const block = modDateBlock[1];
      const rangeM = block.match(DATE_RANGE_RE);
      if (rangeM) {
        // Ré-exécuter pour capturer les groupes
        DATE_RANGE_RE.lastIndex = 0;
        const gm = DATE_RANGE_RE.exec(block);
        if (gm) {
          modifiedCheckIn  = normalizeDate(gm[1], receivedAt);
          modifiedCheckOut = normalizeDate(gm[2], receivedAt);
        }
      }
    }

    // ── 2. Pattern "De X à Y" / "Du X au Y" dans un contexte modification ───
    if (!modifiedCheckIn) {
      const fromToRe = new RegExp(
        `(?:de|du|from)\\s+(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)\\s+(?:[àa]u?|to|jusqu'au)\\s+(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)`,
        'i'
      );
      const ftM = text.match(fromToRe);
      if (ftM) {
  const d1 = normalizeDate(ftM[1], receivedAt);
  const d2 = normalizeDate(ftM[2], receivedAt);
        // Ne pas réutiliser les mêmes dates que checkIn/checkOut
        if (d1 !== checkIn || d2 !== checkOut) {
          modifiedCheckIn  = d1;
          modifiedCheckOut = d2;
        }
      }
    }

    // ── 3. Toutes les plages de dates dans le texte → prendre la 2e si différente ──
    if (!modifiedCheckIn) {
      DATE_RANGE_RE.lastIndex = 0;
      const allRanges: Array<[string, string]> = [];
      let rm: RegExpExecArray | null;
      while ((rm = DATE_RANGE_RE.exec(text)) !== null) {
        allRanges.push([normalizeDate(rm[1], receivedAt), normalizeDate(rm[2], receivedAt)]);
      }
      // La 1ère plage = dates actuelles (checkIn/checkOut), la 2e = nouvelles dates
      for (const [d1, d2] of allRanges) {
        if (d1 !== checkIn || d2 !== checkOut) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(d1) && /^\d{4}-\d{2}-\d{2}$/.test(d2)) {
            modifiedCheckIn  = d1;
            modifiedCheckOut = d2;
            break;
          }
        }
      }
    }
  }

  // 7. Calculer la confiance
  let confidence = 50;
  if (isAirbnbSender) confidence += 20;
  if (checkIn && checkOut) confidence += 15;
  if (price > 0) confidence += 10;
  if (confirmationCode) {
    confidence += 5;
    // Code HM au format Airbnb (HMXXXXXXXX) = très fiable
    if (/^HM[A-Z0-9]{8,}$/i.test(confirmationCode)) confidence += 5;
  }
  // Nom de voyageur réel trouvé (pas le placeholder générique)
  if (guestNameExtracted && guestNameExtracted !== 'Voyageur Airbnb') confidence += 5;
  // Logement identifié dans le texte
  if (propertyNameExtracted) confidence += 5;
  // Versement : confidence de base 80 (pas de dates = normal)
  if (bookingType === 'payout') {
    confidence = Math.max(confidence, isAirbnbSender ? 85 : 70);
    // +5 si montant versement trouvé
    if (hostPayout && hostPayout > 0) confidence = Math.min(100, confidence + 5);
  }
  // Revue sans dates : confidence de base 60 si expéditeur OK, 70 si note trouvée
  if (bookingType === 'review') {
    confidence = Math.max(confidence, isAirbnbSender ? 65 : 55);
    const rating = extractReviewRating(text, subject);
    if (rating) confidence = Math.min(100, confidence + 10);
    // Note trouvée dans le sujet = très fiable
    if (rating && subject.match(/\d\s*[eé]toiles?|\d\s*stars?/i)) confidence = Math.min(100, confidence + 5);
  }
  // Annulation : confiance légèrement réduite si pas de code confirmation
  if (bookingType === 'cancelled' && !confirmationCode) confidence = Math.max(50, confidence - 5);
  // Modification : confiance réduite si pas de nouvelles dates trouvées
  if (bookingType === 'modified' && !modifiedCheckIn) confidence = Math.max(50, confidence - 5);
  if (bookingType === 'modified' && modifiedCheckIn) confidence = Math.min(100, confidence + 5);
  // Rappel/checkout : confiance modérée si pas de dates
  if ((bookingType === 'reminder' || bookingType === 'checkout') && (!checkIn || !checkOut)) {
    confidence = Math.min(confidence, 65);
  }
  if (financeConfidencePenalty > 0) {
    const floor = bookingType === 'payout' ? 60 : 50;
    confidence = Math.max(floor, confidence - financeConfidencePenalty);
  }

  
    if (!propertyNameExtracted && bookingType !== 'payout' && bookingType !== 'review') warnings.push('Logement introuvable');
    if (!checkIn && bookingType !== 'payout' && bookingType !== 'review') warnings.push('Dates de séjour introuvables');
    if (price === 0 && (bookingType === 'new' || bookingType === 'modified')) warnings.push('Montant suspect (0\u20AC)');
    if (confidence < 75) warnings.push('Parser incertain (confiance < 75%)');

  // --- NOUVEAU: Surcharge depuis le JSON-LD Schema.org ---
  type JsonLdReservation = {
    checkinTime?: string;
    checkoutTime?: string;
    totalPrice?: string | number;
    lodgingUnit?: { name?: string };
    underName?: { name?: string };
  };

  const jsonLdReservation: JsonLdReservation | undefined =
    jsonLdParsed && typeof jsonLdParsed === 'object'
      ? (jsonLdParsed as JsonLdReservation)
      : undefined;

  if (jsonLdReservation) {
    if (jsonLdReservation.checkinTime && !checkIn) {
      checkIn = jsonLdReservation.checkinTime.split('T')[0];
    }
    if (jsonLdReservation.checkoutTime && !checkOut) {
      checkOut = jsonLdReservation.checkoutTime.split('T')[0];
    }
    if (jsonLdReservation.totalPrice !== undefined) {
      price = parseFloat(String(jsonLdReservation.totalPrice));
    }
    if (jsonLdReservation.lodgingUnit?.name) {
      propertyNameExtracted = jsonLdReservation.lodgingUnit.name;
    }
    if (jsonLdReservation.underName?.name) {
      guestNameExtracted = jsonLdReservation.underName.name;
    }
  }

      return {
        warnings,
        source: 'gmail',
    messageId,
    subject: subject.slice(0, 200),
    receivedAt,

    // ── Voyageur ────────────────────────────────────────────────────────────
    // Pour payout : le nom voyageur n'est pas toujours dans le corps → garder undefined si générique
    guestName: (bookingType === 'payout' && guestNameExtracted === 'Voyageur Airbnb')
                 ? 'Voyageur Airbnb'  // on garde le placeholder pour les payout sans nom
                 : (guestNameExtracted ?? 'Voyageur Airbnb'),
    // Email/téléphone : uniquement si l'email est explicitement dans le corps
    // (pas extrait pour payout où le corps ne contient pas les infos voyageur)
    guestEmail: bookingType !== 'payout' ? extractGuestEmail(text) : undefined,
    guestPhone: bookingType !== 'payout' ? extractGuestPhone(text) : undefined,
  guests:     guestComposition.total ?? 0,
  guestAdults: guestComposition.adults ?? 0,
  guestChildren: guestComposition.children ?? 0,
  guestInfants: guestComposition.infants ?? 0,
  guestPets: guestComposition.pets ?? 0,
    // Pays/langue : utile pour new, modified, reminder, cancelled, checkout
    guestCountry:  (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled' || bookingType === 'checkout')
                     ? guestCountry : undefined,
    guestLanguage: (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled' || bookingType === 'checkout')
                     ? guestLanguage : undefined,

    // ── Séjour ──────────────────────────────────────────────────────────────
    checkIn:  checkIn  ?? (bookingType === 'payout' || bookingType === 'review' ? receivedAt.split('T')[0] : (checkIn || receivedAt.split('T')[0])),
    checkOut: checkOut ?? (bookingType === 'payout' || bookingType === 'review' ? receivedAt.split('T')[0] : (checkOut || receivedAt.split('T')[0])),
    // Nuits : calculer même pour checkout/reminder si les dates sont disponibles
    nights:   (bookingType === 'payout' && !checkIn) ? 0 : nights,
    checkInTime,
    checkOutTime,

    // ── Finance ─────────────────────────────────────────────────────────────
    // totalPrice : pertinent pour new/modified/cancelled/checkout/reminder
    // Pour review/payout, mettre 0 (pas de prix séjour dans ces emails — utiliser hostPayout pour payout)
    totalPrice: (bookingType === 'review' || bookingType === 'payout') ? 0 : price,
  // Devise : détection robuste depuis corps + sujet
  currency: extractCurrency(text, subject),
    nightlyRate,
    cleaningFee,
    serviceFee,
    taxAmount,
    // hostPayout : payout uniquement
    hostPayout,

    // ── Versement ───────────────────────────────────────────────────────────
    payoutDate,
    payoutMethod,

    // ── Propriété ───────────────────────────────────────────────────────────
    propertyName:     propertyNameExtracted,
    confirmationCode,

    // ── Statut ──────────────────────────────────────────────────────────────
    bookingType,
    confidence: Math.min(100, confidence),
  parserPatternVersion: PARSER_PATTERN_VERSION,
  classificationSource,
  classificationRuleId,
  classificationRegex,
    isInstantBook,
    cancellationPolicy,

    // ── Modification ────────────────────────────────────────────────────────
    modifiedCheckIn,
    modifiedCheckOut,

    // ── Avis ────────────────────────────────────────────────────────────────
    reviewRating:  bookingType === 'review' ? extractReviewRating(text, subject) : undefined,
    reviewComment: bookingType === 'review' ? extractReviewComment(text) : undefined,

    // ── ID annonce Airbnb (depuis URL /rooms/XXXXXXXX dans le corps HTML brut) ─
    // Permet de retrouver le logement pour les avis qui ne contiennent pas le nom
    airbnbListingId,
  };
}

// ─── Décodeur base64 Gmail ──────────────────────────────────────────────────

export function decodeGmailBody(data: string): string {
  const decodeQuotedPrintableLoose = (input: string): string => {
    if (!input) return input;
    // soft line-breaks: "=\n" or "=\r\n"
    const source = input.replace(/=\r?\n/g, '');
    const bytes: number[] = [];

    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '=' && i + 2 < source.length) {
        const hex = source.slice(i + 1, i + 3);
        if (/^[A-Fa-f0-9]{2}$/.test(hex)) {
          bytes.push(Number.parseInt(hex, 16));
          i += 2;
          continue;
        }
      }

      const code = source.charCodeAt(i);
      // conserve l'octet bas pour rester stable sur des corps déjà décodés partiellement
      bytes.push(code & 0xff);
    }

    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
    } catch {
      return source;
    }
  };

  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const utf8 = decodeURIComponent(
      binary.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return decodeQuotedPrintableLoose(utf8);
  } catch {
    try {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      // Fallback robuste Node.js (Vercel runtime)
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      return decodeQuotedPrintableLoose(decoded);
    } catch {
      return '';
    }
  }
}

export function extractBodyFromPayload(payload: GmailPayload): string {
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeGmailBody(payload.body.data);
  }
  if (payload.parts && payload.parts.length > 0) {
    // Pour multipart/alternative : préférer text/plain (plus fiable pour le parsing)
    // puis text/html, puis récurse dans les sous-parties (ex: multipart/mixed → multipart/alternative)
    const plain = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeGmailBody(plain.body.data);
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) return decodeGmailBody(html.body.data);
    // Récursif pour multipart imbriqués (multipart/mixed, multipart/related, etc.)
    for (const part of payload.parts) {
      const result = extractBodyFromPayload(part);
      if (result && result.trim().length > 10) return result;
    }
  }
  return '';
}

export interface GmailPayload {
  mimeType: string;
  body?: { data?: string };
  parts?: GmailPayload[];
}


