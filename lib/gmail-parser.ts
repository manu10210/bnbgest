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
  isInstantBook?: boolean;  // true si réservation instantanée (sans approbation)
  cancellationPolicy?: string; // Politique d'annulation (ex: "Flexible", "Modérée", "Stricte")
  // Modification — nouvelles dates proposées
  modifiedCheckIn?: string;   // Nouvelle date d'arrivée (modified uniquement)
  modifiedCheckOut?: string;  // Nouvelle date de départ (modified uniquement)
  // Champs spécifiques aux avis
  reviewRating?: number;    // 1-5 étoiles
  reviewComment?: string;   // Commentaire du voyageur
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

  // Format textuel anglais SANS année : "Apr 10" / "April 10" / "Apr. 10"
  // → même logique d'inférence d'année que le français
  const textEnNoYear = s.match(/([a-z]+)\.?\s+(\d{1,2})$/i);
  if (textEnNoYear && monthsEn[textEnNoYear[1].toLowerCase()]) {
    const monthNum = monthsEn[textEnNoYear[1].toLowerCase()];
    const now = new Date();
    const year = now.getFullYear();
    const candidate = `${year}-${monthNum}-${textEnNoYear[2].padStart(2, '0')}`;
    const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -180) return `${year + 1}-${monthNum}-${textEnNoYear[2].padStart(2, '0')}`;
    return candidate;
  }
  // "10 Apr" / "10 April" (jour avant mois EN, sans année)
  const textEnNoYearRev = s.match(/(\d{1,2})\s+([a-z]+)\.?$/i);
  if (textEnNoYearRev && monthsEn[textEnNoYearRev[2].toLowerCase()]) {
    const monthNum = monthsEn[textEnNoYearRev[2].toLowerCase()];
    const now = new Date();
    const year = now.getFullYear();
    const candidate = `${year}-${monthNum}-${textEnNoYearRev[1].padStart(2, '0')}`;
    const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < -180) return `${year + 1}-${monthNum}-${textEnNoYearRev[1].padStart(2, '0')}`;
    return candidate;
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
    // Supporte "178,34" / "178.34" / "1 234,56" / "1 234.56" / espaces insécables \xa0
    const clean = s.replace(/[€$£]/g, '').replace(/[\s\xa0\u202f]+/g, ' ').trim();
    // Format FR : "1 234,56" → supprimer espaces inter-chiffres, puis remplacer virgule
    const normalized = clean.replace(/(\d)\s+(\d)/g, '$1$2').replace(',', '.');
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
    // 🔚 Dernier recours : premier montant en euros trouvé dans le texte (limité à 10 chiffres)
    /([€$£]\s*[\d\s\xa0]{1,10}[,.]?\d{0,2})(?!\d)/,
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

// ─── Nouveaux extracteurs spécialisés ──────────────────────────────────────

function extractCheckInTime(text: string): string | undefined {
  // Formats Airbnb observés :
  //   "Heure d'arrivée : 15:00" / "Heure d'arrivée : à partir de 15h"
  //   "Arrivée après 15h00" / "Check-in : 15h00" / "à partir de 15:00"
  //   "Check-in time: 3:00 PM" / "After 3 PM"
  const patterns = [
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
    /heure(?:\s+de)?\s*d[eé]part\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s*[:\-–]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s+time\s*[:\-–]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    // "Départ : HH:MM" — uniquement si suivi d'une heure (pas d'une date)
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
  const s = raw.trim().replace(/\s+/g, '');
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
  //   "$89 per night" / "89 € x 3 nuits"
  const parseAmt = (s: string) => {
    const n = parseFloat(s.replace(/[€$£\s\xa0\u202f]/g, '').replace(',', '.'));
    return !isNaN(n) && n > 0 && n < 10000 ? n : 0;
  };
  const patterns = [
    // "89 € par nuit" ou "89,00€ par nuit" — ancre sur le nombre JUSTE avant le symbole/mot
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]\s*(?:par\s+nuit|\/nuit)/i,
    // "€ 89 par nuit" — symbole AVANT le nombre
    /[€$£]\s*([\d\s\xa0\u202f]*[,.]?\d+)\s*(?:par\s+nuit|\/nuit)/i,
    /prix\s+(?:de\s+la\s+)?nuit[eé]e?\s*[:\-–]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    /tarif\s+(?:de\s+la\s+)?nuit[eé]e?\s*[:\-–]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    // "89 € x 3 nuits" — nombre avant le "x N nuits"
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]?\s*[×x]\s*\d+\s*nuits?/i,
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
    const n = parseFloat(s.replace(/[€$£\s\xa0]/g, '').replace(',', '.'));
    return !isNaN(n) && n > 0 ? n : 0;
  };
  const patterns = [
    /taxe(?:s)?\s+de\s+s[eé]jour\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s*(?:et\s+frais)?\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tva\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tourist\s+tax\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s+and\s+fees?\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /occupancy\s+tax\s*[:\-–]\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
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
  const labelFR = text.match(/politique\s+d[''e]annulation\s*[:\-–]\s*(flexible|mod[eé]r[eé]e?|stricte?|super\s+strict|non\s+remboursable|remboursable)/i);
  if (labelFR) return normalizePoliceName(labelFR[1]);

  const labelEN = text.match(/cancellation\s+policy\s*[:\-–]\s*(flexible|moderate|strict|super\s+strict|non.refundable|refundable)/i);
  if (labelEN) return normalizePoliceName(labelEN[1]);

  // ── 2. Sections dédiées annulation (contexte fort) ────────────────────────
  // "annulation flexible" / "politique flexible" / "flexible cancellation"
  const sectionFR = text.match(/(?:politique|conditions?|type)\s+(?:d[''e]\s*)?(?:annulation|remboursement)\s*[:\-–]?\s*(flexible|mod[eé]r[eé]e?|stricte?)/i);
  if (sectionFR) return normalizePoliceName(sectionFR[1]);

  const sectionEN = text.match(/(?:cancellation|refund)\s+(?:policy|type|conditions?)\s*[:\-–]?\s*(flexible|moderate|strict)/i);
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
  }
  return undefined;
}

function normalizePoliceName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (/flex/i.test(s)) return 'Flexible';
  if (/mod/i.test(s)) return 'Modérée';
  if (/strict|super/i.test(s)) return 'Stricte';
  if (/no.refund|non.refund/i.test(s)) return 'Non remboursable';
  return raw.trim();
}

function extractGuestCountry(text: string): string | undefined {
  // Formats : "Pays : France" / "Country: Germany" / "Nationalité : Française"
  // Aussi : drapeaux ou mentions de pays dans le texte
  const patterns = [
    /pays\s*[:\-–]\s*([^\n\r<,]{2,40})/i,
    /country\s*[:\-–]\s*([^\n\r<,]{2,40})/i,
    /nationalit[eé]\s*[:\-–]\s*([^\n\r<,]{2,40})/i,
    /from\s+([A-Z][a-z]{2,20})/,
    /lieu\s+de\s+r[eé]sidence\s*[:\-–]\s*([^\n\r<,]{2,40})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const country = m[1].trim().replace(/<[^>]*>/g, '').slice(0, 40);
      if (country.length >= 2 && !/airbnb|r[eé]servation|logement/i.test(country)) return country;
    }
  }
  return undefined;
}

function detectGuestLanguage(text: string, subject: string): string | undefined {
  // Détecte la langue de l'email pour inférer la langue du voyageur
  // Un email Airbnb est envoyé dans la langue du voyageur
  // Analyser 3000 chars pour couvrir le corps complet (au lieu de 500)
  const combined = (subject + ' ' + text.slice(0, 3000)).toLowerCase();
  // Indices français — mots DISTINCTIFS (pas de faux positifs EN)
  const frScore = (combined.match(/\b(votre|vous|r[eé]servation|voyageur|bienvenue|merci|arriv[eé]e?|d[eé]part|nuit[eé]e?|logement|h[oô]te|s[eé]jour|annonce|lundi|mardi|vendredi|dimanche|pr[eé]nom)\b/g) || []).length;
  // Indices anglais — mots DISTINCTIFS (éviter "night", "booking", "host" qui apparaissent dans des emails FR)
  const enScore = (combined.match(/\b(your|you(?:'re|r)?|guest|welcome|thank\s+you|arrival|departure|listing|check.?in|check.?out|stay|monday|tuesday|friday|sunday|tonight|tomorrow)\b/g) || []).length;
  // Indices allemand
  const deScore = (combined.match(/\b(ihre|sie|buchung|gast|willkommen|danke|ankunft|abreise|nacht|unterkunft|gastgeber|aufenthalt|montag|dienstag)\b/g) || []).length;
  // Indices espagnol
  const esScore = (combined.match(/\b(su|usted|reserva|hu[eé]sped|bienvenido|gracias|llegada|salida|noche|alojamiento|anfitri[oó]n|estancia|lunes|martes)\b/g) || []).length;
  // Indices italien
  const itScore = (combined.match(/\b(tuo|voi|prenotazione|ospite|benvenuto|grazie|arrivo|partenza|notte|annuncio|host|soggiorno|luned[iì]|marted[iì])\b/g) || []).length;

  const scores: Record<string, number> = { fr: frScore, en: enScore, de: deScore, es: esScore, it: itScore };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // Seuil minimum de 2 occurrences pour éviter les faux positifs
  if (best[1] >= 2) return best[0];
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
  // Cherche le nombre total de voyageurs — additionne adultes+enfants si présents,
  // sinon prend le premier chiffre voyageur/guest/personne trouvé.
  const adultsM = text.match(/(\d+)\s*adultes?/i);
  const childM  = text.match(/(\d+)\s*(?:enfants?|enfant[s]?|child(?:ren)?)/i);
  if (adultsM) {
    const adults = parseInt(adultsM[1]);
    const children = childM ? parseInt(childM[1]) : 0;
    const total = adults + children;
    if (total >= 1 && total <= 20) return total;
  }
  const patterns: Array<[RegExp, number]> = [
    [/(\d+)\s*voyageur[s]?/i, 1],
    [/(\d+)\s*guest[s]?/i, 1],
    [/(\d+)\s*personne[s]?/i, 1],
    [/(\d+)\s*person[s]?/i, 1],
    [/nombre\s+de\s+voyageurs?\s*[:\-]\s*(\d+)/i, 2],
    [/number\s+of\s+guests?\s*[:\-]\s*(\d+)/i, 2],
  ];
  for (const [p, idx] of patterns) {
    const m = text.match(p);
    if (m) {
      const v = parseInt(m[idx]);
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
      // "Marie a demandé à réserver"
      new RegExp(`^(${NAME})\\s+a\\s+demand[eé]\\s+[àa]\\s+r[eé]server`, 'u'),
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
      // 🟡 MODIFICATION — "Prénom a modifié / souhaite changer / souhaite modifier"
      new RegExp(`^(${NAME})\\s+a\\s+modifi[eé]`, 'u'),
      new RegExp(`^(${NAME})\\s+souhaite\\s+(?:changer|modifier)`, 'u'),
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
    // Code type HMXXXXX — 2-3 lettres + 5-9 chiffres (ex: AB12345)
    /\b([A-Z]{2,3}[0-9]{5,9})\b/,
    // Générique: séquence mixte lettres+chiffres UNIQUEMENT si précédée d'un contexte clair
    /(?:code|ref(?:[eé]rence)?|n[°o])\s*[:\s#]+([A-Z]{2,4}[0-9]{4,8})\b/i,
  ];

  // Mots à blacklister (faux positifs fréquents)
  const BLACKLIST = /^(EUR|USD|GBP|JPY|CHF|CAD|AUD|TTC|TVA|HT|PDF|URL|API|HTML|SMS|WWW|HTTP|HTTPS|AIRBNB|IATA|ISBN|IBAN|BIC|SWIFT|VAT|REF|NO|NR|FR|EN|DE|ES|IT|PT|NL|PL|RU|ZH|JA|KO|AR|TR|ID|TH)$/;

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const code = m[1].toUpperCase();
      if (!BLACKLIST.test(code)) return code;
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
  else if (SUBJECT_PATTERNS.reminder.some(p => p.test(subject))) bookingType = 'reminder';
  else if (SUBJECT_PATTERNS.review.some(p => p.test(subject))) bookingType = 'review';
  else if (
    SUBJECT_PATTERNS.payout.some(p => p.test(subject)) ||
    SUBJECT_PATTERNS.payout.some(p => p.test(body.slice(0, 500))) ||
    // Versement standalone dans le corps (ex: "Nous avons envoyé un versement")
    /nous\s+avons\s+envoy[eé]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout/i.test(body.slice(0, 600))
  ) bookingType = 'payout';
  else {
    // ─── Fallback : déduire le type depuis les slugs URL du corps ────────────
    // Airbnb encode le type d'email dans les URLs de tracking (base64 ou slug).
    // Observé réel : sujet corrompu "661?c=.pi80.pkaG9tZV9yZXZpZXdzL..."
    //   → décodé : "home_reviews/empathetic_host_review_received" → 'review'
    // Autres slugs connus :
    //   reservation_confirmation → 'new'
    //   booking_cancelled        → 'cancelled'
    //   host_payout / payout_sent → 'payout'
    //   checkout / check_out     → 'checkout'
    //   reminder / rappel_arriv  → 'reminder'
    const bodySnippet = body.slice(0, 2000).toLowerCase();
    if (/home_reviews|review_received|guest.*review|avis.*re[cç]u/i.test(bodySnippet)) {
      bookingType = 'review';
    } else if (/reservation_confirmation|booking_confirmation|new_reservation/i.test(bodySnippet)) {
      bookingType = 'new';
    } else if (/cancellation|booking_cancelled|reservation_cancelled/i.test(bodySnippet)) {
      bookingType = 'cancelled';
    } else if (/host_payout|payout_sent|versement/i.test(bodySnippet)) {
      bookingType = 'payout';
    } else if (/checkout|check_out|s[eé]jour.*termin/i.test(bodySnippet)) {
      bookingType = 'checkout';
    } else if (/reminder|rappel.*arriv/i.test(bodySnippet)) {
      bookingType = 'reminder';
    } else {
      // Aucun type détecté ni depuis le sujet ni depuis le corps → ignorer
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
      // EN "from April 10, 2026" / "from Apr 10 2026"
      /from\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /from\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage "10 avr. – 13 avr." → prendre la PREMIÈRE date
      new RegExp(`(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*[–\\-]`, 'i'),
      // Plage EN "Apr 10 – Apr 13, 2026" ou "April 10–13, 2026" → première partie
      /([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /([A-Za-z]+\.?\s+\d{1,2})(?:\s*[–\-]\s*(?:\d{1,2}|[A-Za-z]+\.?\s+\d{1,2}),?\s+\d{4})/i,
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
      // EN "to April 13, 2026" / "to Apr 13 2026"
      /to\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /to\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage "10 avr. – 13 avr." → prendre la DEUXIÈME date (après le tiret)
      new RegExp(`[–\\-]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Plage EN "April 10–13, 2026" → second number with reconstructed month+year from context
      // Handled via the noYear fallback below
    ];

    // Chercher d'abord dans le corps, puis dans le sujet comme fallback
    checkIn = extractDate(text, checkInPatterns) || extractDate(subject, checkInPatterns);
    checkOut = extractDate(text, checkOutPatterns) || extractDate(subject, checkOutPatterns);

    // Fallback : chercher dates avec ou sans année dans texte + sujet combinés
    if (!checkIn || !checkOut) {
      const combinedText = text + ' ' + subject;
      // Dates AVEC année
      const datesWithYear = [...combinedText.matchAll(/\b(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zàâéèêëîïôùûü]+)[\s\/\-]\d{4})\b/gi)]
        .map(m => normalizeDate(m[1]))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (datesWithYear.length >= 2) {
        checkIn  = checkIn  || datesWithYear[0];
        checkOut = checkOut || datesWithYear[1];
      }
      // Dates SANS année — textuelles FR/EN (ex: "10 avr.", "Apr 10")
      if (!checkIn || !checkOut) {
        const MOIS_BOTH = `(?:janv?|f[eé]vr?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?|oct\\.?|nov\\.?|d[eé]c\\.?|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|dec)`;
        const noYearRe = new RegExp(`\\b(\\d{1,2}\\s+${MOIS_BOTH}|${MOIS_BOTH}\\s+\\d{1,2})\\b`, 'gi');
        const datesNoYear = [...combinedText.matchAll(noYearRe)]
          .map(m => normalizeDate(m[1]))
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

  // 5. Calculer les nuits
  const nights = (checkIn && checkOut) ? Math.max(1, Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )) : 0;

  // 6. Extraire tous les champs enrichis selon le type d'email
  const price               = extractPrice(text) || extractPrice(subject);
  const confirmationCode    = extractConfirmationCode(text) || extractConfirmationCode(subject);
  const guestNameExtracted  = extractGuestName(text, subject);
  const propertyNameExtracted = extractPropertyName(text, subject);
  const guestCountry        = extractGuestCountry(text);
  const guestLanguage       = detectGuestLanguage(text, subject);

  // ── Champs financiers : selon le type ────────────────────────────────────
  // new/modified/cancelled → détail complet des frais
  // checkout/reminder      → totalPrice uniquement (pas de détail frais)
  // review                 → aucun champ financier
  // payout                 → seulement hostPayout + payoutDate/Method
  const isFinanceType = bookingType === 'new' || bookingType === 'modified' || bookingType === 'cancelled';
  const nightlyRate  = isFinanceType ? extractNightlyRate(text) : undefined;
  const cleaningFee  = isFinanceType ? extractCleaningFee(text) : undefined;
  const serviceFee   = isFinanceType ? extractServiceFee(text) : undefined;
  const taxAmount    = isFinanceType ? extractTaxAmount(text) : undefined;
  const hostPayout   = bookingType === 'payout' ? (extractHostPayout(text) || extractHostPayout(subject)) : undefined;

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
    const MOIS_RE2 = `(?:janv?\\.?|f[eé]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uû]t|sept?\\.?|oct\\.?|octobre?|nov\\.?|d[eé]c\\.?|d[eé]cembre?)`;
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
          modifiedCheckIn  = normalizeDate(gm[1]);
          modifiedCheckOut = normalizeDate(gm[2]);
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
        const d1 = normalizeDate(ftM[1]);
        const d2 = normalizeDate(ftM[2]);
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
        allRanges.push([normalizeDate(rm[1]), normalizeDate(rm[2])]);
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
    if (rating) confidence = Math.min(100, confidence + 5);
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

  return {
    source: 'gmail',
    messageId,
    subject: subject.slice(0, 200),
    receivedAt,

    // ── Voyageur ────────────────────────────────────────────────────────────
    // Pour payout : le nom voyageur n'est pas toujours dans le corps → garder undefined si générique
    guestName: (bookingType === 'payout' && guestNameExtracted === 'Voyageur Airbnb')
                 ? 'Voyageur Airbnb'  // on garde le placeholder pour les payout sans nom
                 : guestNameExtracted,
    // Email/téléphone : uniquement si l'email est explicitement dans le corps
    // (pas extrait pour payout où le corps ne contient pas les infos voyageur)
    guestEmail: bookingType !== 'payout' ? extractGuestEmail(text) : undefined,
    guestPhone: bookingType !== 'payout' ? extractGuestPhone(text) : undefined,
    guests:     bookingType !== 'payout' ? extractGuests(text) : 0,
    // Pays/langue : utile pour new, modified, reminder, cancelled
    guestCountry:  (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled')
                     ? guestCountry : undefined,
    guestLanguage: (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled')
                     ? guestLanguage : undefined,

    // ── Séjour ──────────────────────────────────────────────────────────────
    checkIn:  checkIn  ?? receivedAt.split('T')[0],
    checkOut: checkOut ?? receivedAt.split('T')[0],
    nights:   (bookingType === 'payout' && !checkIn) ? 0 : nights,
    checkInTime,
    checkOutTime,

    // ── Finance ─────────────────────────────────────────────────────────────
    // totalPrice : pertinent pour new/modified/cancelled/checkout/reminder
    // Pour review/payout, mettre 0 (pas de prix séjour dans ces emails — utiliser hostPayout pour payout)
    totalPrice: (bookingType === 'review' || bookingType === 'payout') ? 0 : price,
    currency:   (text + subject).includes('€') ? 'EUR' : (text + subject).includes('£') ? 'GBP' : 'USD',
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
    isInstantBook,
    cancellationPolicy,

    // ── Modification ────────────────────────────────────────────────────────
    modifiedCheckIn,
    modifiedCheckOut,

    // ── Avis ────────────────────────────────────────────────────────────────
    reviewRating:  bookingType === 'review' ? extractReviewRating(text, subject) : undefined,
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
