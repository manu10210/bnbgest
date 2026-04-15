/**
 * ðŸ“§ Gmail Parser â€” Extraction automatique des rÃ©servations Airbnb
 *
 * DÃ©tecte et parse les emails de confirmation Airbnb depuis Gmail API.
 * Supporte : Emails hÃ´te Airbnb en franÃ§ais et en anglais (2024-2026)
 *
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * ARCHITECTURE DU PARSER
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 *  parseAirbnbEmail()
 *   â”œâ”€ 1. VÃ©rifier expÃ©diteur @airbnb.com
 *   â”œâ”€ 2. IGNORED_PATTERNS â†’ null  (maintenance, litige, paiement voyageurâ€¦)
 *   â”œâ”€ 3. DÃ©tecter bookingType via SUBJECT_PATTERNS (sujet)
 *   â”‚      ou fallback via slugs URL dans le corps
 *   â”œâ”€ 4. Extraire dates checkIn / checkOut  (sauf payout)
 *   â”œâ”€ 5. Extraire prix, frais, versement hÃ´te
 *   â”œâ”€ 6. Extraire nom voyageur, logement, code confirmation
 *   â””â”€ 7. Calculer score de confiance (0-100)
 *
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * TYPES D'EMAILS AIRBNB RECONNUS (bookingType)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * ðŸ”µ 'new'       â€” Nouvelle rÃ©servation confirmÃ©e
 *   Sujets FR :  "Marie a rÃ©servÃ© votre logement"
 *                "FÃ©licitations ! Marie a rÃ©servÃ© votre logement."
 *                "Nouvelle rÃ©servation de Marie"
 *                "Confirmation de rÃ©servation"
 *                "RÃ©servation confirmÃ©e"
 *                "Demande de rÃ©servation de Marie acceptÃ©e"
 *                "RÃ©servation pour Mon Logement, 10â€“13 avr."
 *   Sujets EN :  "Marie has booked your place"
 *                "Reservation confirmed" / "Booking confirmation"
 *                "New reservation from Marie"
 *
 * ðŸ”´ 'cancelled' â€” Annulation de rÃ©servation
 *   Sujets FR :  "Marie a annulÃ© sa rÃ©servation"
 *                "RÃ©servation annulÃ©e" / "Annulation de rÃ©servation"
 *   Sujets EN :  "Booking cancelled" / "Cancellation"
 *
 * ðŸŸ¡ 'modified'  â€” Modification / changement de rÃ©servation
 *   Sujets FR :  "Marie a modifiÃ© sa rÃ©servation"
 *                "Marie souhaite changer sa rÃ©servation"  â† observÃ© rÃ©el
 *                "Marie souhaite modifier sa rÃ©servation"
 *                "Marie a changÃ© sa rÃ©servation"
 *                "Demande de modification" / "Changement de rÃ©servation"
 *   Sujets EN :  "Marie wants to change their booking"
 *                "Alteration request"
 *
 * ðŸŸ¤ 'checkout'  â€” Fin de sÃ©jour / dÃ©part du voyageur
 *   Sujets FR :  "Le sÃ©jour de Marie se termine aujourd'hui"
 *                "Marie part aujourd'hui"
 *                "DÃ©part de Marie"
 *   Sujets EN :  "Your guest is checking out today"
 *                "Checking out today"
 *
 * ðŸ”” 'reminder'  â€” Rappel d'arrivÃ©e imminente (â‰  rappel Ã©valuation hÃ´te)
 *   Sujets FR :  "Rappel : Marie arrive dans 2 jours"
 *                "Marie arrive demain !"
 *                "Avez-vous tout prÃ©parÃ© pour l'arrivÃ©e de Marie ?"
 *                "Prochaine arrivÃ©e"
 *   Sujets EN :  "Reminder: Marie arrives in 2 days"
 *                "Marie arriving tomorrow"
 *   âš ï¸  Les rappels "notez votre voyageur" / "X attend votre commentaire"
 *       sont dans IGNORED_PATTERNS (pas de rÃ©servation Ã  crÃ©er)
 *
 * â­ 'review'    â€” Avis reÃ§u d'un voyageur
 *   Sujets FR :  "Marie a laissÃ© une Ã©valuation 4 Ã©toiles"  â† observÃ© rÃ©el
 *                "vous a laissÃ© une Ã©valuation 5 Ã©toiles !" â† observÃ© rÃ©el (prÃ©nom masquÃ©)
 *                "Un voyageur a rÃ©cemment laissÃ© une Ã©valuation 1 Ã©toile" â† observÃ© rÃ©el (anonymisÃ©)
 *                "Un voyageur a rÃ©cemment laissÃ© un avis"   â† variante anonymisÃ©e
 *                "Marie a laissÃ© un avis"
 *                "Marie a Ã©valuÃ© votre logement"
 *                "Marie a notÃ© votre logement"
 *                "Nouvel avis" / "Nouvelle Ã©valuation"
 *   Sujets EN :  "Marie left you a review" / "New review"
 *                "Marie rated your place"
 *                "A guest has recently left a review"       â† EN anonymisÃ©
 *   Note : la note (1-5 Ã©toiles) est extraite depuis le sujet en prioritÃ©
 *
 * ðŸ’¶ 'payout'   â€” Versement hÃ´te (Airbnb envoie de l'argent Ã  l'hÃ´te)
 *   Sujets FR :  "Nous avons envoyÃ© un versement de 63,62 €"  â† format exact observÃ©
 *                "Votre versement de X €"
 *   Sujets EN :  "Your payout of $X has been sent"
 *   Note : pas de dates de sÃ©jour dans ces emails â†’ checkIn/checkOut non extraits
 *          confidence minimum = 80 mÃªme sans dates
 *
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * CHAMPS EXTRAITS PAR TYPE D'EMAIL
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * ðŸ”µ 'new'       â†’ guestName, guests, checkIn, checkOut, nights, checkInTime,
 *                  checkOutTime, totalPrice, nightlyRate, cleaningFee, serviceFee,
 *                  taxAmount, confirmationCode, propertyName,
 *                  guestEmail, guestPhone, guestCountry, guestLanguage,
 *                  cancellationPolicy, isInstantBook, currency
 *
 * ðŸ”´ 'cancelled' â†’ guestName, checkIn, checkOut, confirmationCode, propertyName,
 *                  cancellationPolicy, totalPrice, nightlyRate, cleaningFee,
 *                  serviceFee, taxAmount, guestLanguage, guestCountry
 *
 * ðŸŸ¡ 'modified'  â†’ guestName, checkIn, checkOut (dates ACTUELLES),
 *                  modifiedCheckIn, modifiedCheckOut (NOUVELLES dates proposÃ©es),
 *                  checkInTime, checkOutTime, nightlyRate, cleaningFee, serviceFee,
 *                  taxAmount, totalPrice, confirmationCode, propertyName,
 *                  guestLanguage, cancellationPolicy
 *
 * ðŸ”” 'reminder'  â†’ guestName, checkIn, checkOut, checkInTime, checkOutTime,
 *                  confirmationCode, propertyName, guests, guestCountry, guestLanguage
 *
 * ðŸŸ¤ 'checkout'  â†’ guestName, checkIn, checkOut, totalPrice, confirmationCode,
 *                  propertyName, checkOutTime, guestLanguage, guestCountry
 *
 * â­ 'review'    â†’ guestName (ou "Voyageur Airbnb" si anonymisÃ©), reviewRating (1-5),
 *                  reviewComment
 *                  âš ï¸  Airbnb peut masquer le prÃ©nom â†’ "Un voyageur a rÃ©cemment laissÃ©â€¦"
 *                  âš ï¸  totalPrice = 0 pour les avis (pas de prix sÃ©jour dans ces emails)
 *
 * ðŸ’¶ 'payout'   â†’ hostPayout, payoutDate, payoutMethod, currency,
 *                  confirmationCode (si sÃ©jour liÃ© mentionnÃ©), guestName (si mentionnÃ©)
 *                  âš ï¸  checkIn/checkOut non extraits â€” dates bancaires â‰  dates sÃ©jour
 *                  âš ï¸  totalPrice = 0 pour les paiements hÃ´te (utilisez hostPayout)
 *
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 * EMAILS IGNORÃ‰S â€” IGNORED_PATTERNS (retourne null)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * ðŸ”§ Maintenance annonces    "Plusieurs annonces nÃ©cessitent votre attention"
 *                            "Action requise sur votre annonce"
 * ðŸ“£ Marketing / Conseils    "Conseils pour les hÃ´tes" / "Superhost"
 * ðŸ“‹ Politique / CGU         "Mise Ã  jour des conditions" / "Terms of service"
 * ðŸ” SÃ©curitÃ© / Compte       "Connexion Ã  votre compte" / "RÃ©initialisez votre MDP"
 * ðŸ’¬ Messagerie seule        "Vous avez un nouveau message" / "a rÃ©pondu Ã  votre message"
 * âš–ï¸  Litiges / Sinistres    "Vous avez proposÃ© un montant diffÃ©rent Ã  X"  â† observÃ© rÃ©el
 *                            "Vous avez demandÃ© de l'argent Ã  X"           â† observÃ© rÃ©el
 *                            "AirCover" / "Dommages signalÃ©s"
 *                            "Centre de rÃ©solution" / "Damage claim"
 * ðŸ’³ Paiement voyageur       "Paiement effectuÃ© pour la rÃ©servation"       â† observÃ© rÃ©el
 *                            (â‰  versement hÃ´te qui est un 'payout')
 * âœï¸  Rappels Ã©valuation hÃ´te "X attend votre commentaire"                  â† observÃ© rÃ©el
 *                            "Notez votre voyageur" / "N'oubliez pas de noter"
 *                            "4 voyageurs attendent votre commentaire"
 * ðŸ”— Sujets corrompus/URL    "661?c=.pi80.pkaG9tZV9yZXZp..."               â† observÃ© rÃ©el
 *                            (URL de tracking Airbnb encodÃ©e base64 dans le sujet)
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
  guestLanguage?: string;   // Langue dÃ©tectÃ©e (ex: "fr", "en", "de")
  // SÃ©jour
  checkIn: string;          // ISO date YYYY-MM-DD
  checkOut: string;         // ISO date YYYY-MM-DD
  nights: number;
  checkInTime?: string;     // Heure d'arrivÃ©e (ex: "15:00")
  checkOutTime?: string;    // Heure de dÃ©part (ex: "11:00")
  // Finance
  totalPrice: number;
  currency: string;
  nightlyRate?: number;     // Prix par nuit (ex: 89.0)
  cleaningFee?: number;
  serviceFee?: number;
  hostPayout?: number;      // Ce que l'hÃ´te reÃ§oit rÃ©ellement
  taxAmount?: number;       // Taxes (TVA, taxe de sÃ©jourâ€¦)
  // Versement
  payoutDate?: string;      // Date du versement bancaire (ISO YYYY-MM-DD) â€” payout uniquement
  payoutMethod?: string;    // MÃ©thode (ex: "Virement bancaire", "PayPal")
  // PropriÃ©tÃ©
  propertyName?: string;
  confirmationCode?: string;
  // Statut
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  confidence: number;       // 0-100%
  isInstantBook?: boolean;  // true si rÃ©servation instantanÃ©e (sans approbation)
  cancellationPolicy?: string; // Politique d'annulation (ex: "Flexible", "ModÃ©rÃ©e", "Stricte")
  // Modification â€” nouvelles dates proposÃ©es
  modifiedCheckIn?: string;   // Nouvelle date d'arrivÃ©e (modified uniquement)
  modifiedCheckOut?: string;
    warnings?: string[];
  // Champs spÃ©cifiques aux avis
  reviewRating?: number;    // 1-5 Ã©toiles
  reviewComment?: string;   // Commentaire du voyageur
  // Identifiant Airbnb de l'annonce (extrait des URLs /rooms/XXXXXXXX dans le corps)
  // Utile pour retrouver le logement mÃªme quand le nom n'est pas dans l'email (ex: avis)
  airbnbListingId?: string;
}

// â”€â”€â”€ ExpÃ©diteurs connus Airbnb â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// automated@airbnb.com = notifications hÃ´tes principales
// express@, no-reply@, reply@, support@ = autres domaines Airbnb
const AIRBNB_SENDERS = [
  'automated@airbnb.com',
  'express@airbnb.com',
  'no-reply@airbnb.com',
  'reply@airbnb.com',
  'support@airbnb.com',
  'airbnb.com',  // domaine gÃ©nÃ©rique â†’ capture toute adresse @*.airbnb.com
];

// â”€â”€â”€ Emails Ã  IGNORER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Retourne null immÃ©diatement â€” pas de rÃ©servation Ã  importer.
// Voir JSDoc en tÃªte de fichier pour la liste complÃ¨te par catÃ©gorie.
const IGNORED_PATTERNS = [
  // Maintenance / Actions requises sur les annonces
  /plusieurs\s+annonces?\s+n[eÃ©]cessitent?\s+votre\s+attention/i,
  /annonces?\s+n[eÃ©]cessitent?\s+votre\s+attention/i,
  /votre\s+attention\s+est\s+requise/i,
  /action\s+requise\s+sur\s+votre\s+annonce/i,
  /action\s+n[eÃ©]cessaire\s+sur\s+votre\s+annonce/i,
  /mise\s+[Ã a]\s+jour\s+de\s+votre\s+annonce/i,
  /mettez?\s+[Ã a]\s+jour\s+votre\s+annonce/i,
  /action\s+required.*listing/i,
  /listing.*requires?\s+your\s+attention/i,
  /update\s+your\s+listing/i,
  // Newsletters / Conseils / OpportunitÃ©s
  /conseils?\s+pour\s+les\s+h[oÃ´]tes?/i,
  /ressources?\s+pour\s+les\s+h[oÃ´]tes?/i,
  /bonnes?\s+pratiques?\s+airbnb/i,
  /am[eÃ©]liorez?\s+votre\s+annonce/i,
  /augmentez?\s+vos\s+revenus/i,
  /optimisez?\s+vos\s+tarifs/i,
  /host\s+tips?/i,
  /host\s+resources?/i,
  /superh[oÃ´]te/i,
  /superhost/i,
  // Notifications de politique / Conditions
  /politique\s+de\s+r[eÃ©]mun[eÃ©]ration/i,
  /mise\s+[Ã a]\s+jour\s+des\s+conditions/i,
  /modification\s+des\s+conditions\s+d[''']utilisation/i,
  /nouvelles?\s+conditions\s+g[eÃ©]n[eÃ©]rales/i,
  /terms\s+of\s+service/i,
  /policy\s+update/i,
  // SÃ©curitÃ© / Compte
  /connexion\s+[Ã a]\s+votre\s+compte/i,
  /votre\s+compte\s+airbnb/i,
  /v[eÃ©]rifiez?\s+votre\s+adresse/i,
  /r[eÃ©]initialisez?\s+votre\s+mot\s+de\s+passe/i,
  /sign.?in\s+to\s+your\s+account/i,
  /verify\s+your\s+email/i,
  /reset\s+your\s+password/i,
  // Messagerie sans rÃ©servation
  /a\s+r[eÃ©]pondu\s+[Ã a]\s+votre\s+message/i,
  /vous\s+a\s+envoy[eÃ©]\s+un\s+message/i,
  /vous\s+avez\s+un\s+nouveau\s+message/i,
  /new\s+message\s+from/i,
  /replied\s+to\s+your\s+message/i,
  /sent\s+you\s+a\s+message/i,
  // Sinistres / Remboursements / AirCover / RÃ©clamations financiÃ¨res
  /vous\s+avez\s+demand[eÃ©]\s+de\s+l[''']argent/i,
  /a\s+demand[eÃ©]\s+de\s+l[''']argent/i,
  /demande\s+de\s+remboursement/i,
  /remboursement\s+demand[eÃ©]/i,
  /r[eÃ©]clamation\s+(?:soumise|envoy[eÃ©]e?|en\s+cours)/i,
  /sinistre\s+(?:signal[eÃ©]|ouvert|soumis)/i,
  /aircover/i,
  /protection\s+h[oÃ´]te/i,
  /dommage[s]?\s+signal[eÃ©][s]?/i,
  /signaler\s+(?:un\s+)?(?:dommage|probl[eÃ¨]me|sinistre)/i,
  /you\s+requested\s+money\s+from/i,
  /money\s+request/i,
  /reimbursement\s+request/i,
  /damage\s+claim/i,
  /resolution\s+center/i,
  /centre\s+de\s+r[eÃ©]solution/i,
  // Litiges / Offres de remboursement / NÃ©gociation montant
  /vous\s+avez\s+propos[eÃ©]\s+un\s+montant\s+diff[eÃ©]rent/i,
  /a\s+propos[eÃ©]\s+un\s+montant\s+diff[eÃ©]rent/i,
  /offre\s+de\s+remboursement/i,
  /proposition\s+de\s+remboursement/i,
  /litige\s+(?:ouvert|en\s+cours|soumis)/i,
  /contestation\s+de\s+(?:r[eÃ©]servation|paiement)/i,
  /vous\s+avez\s+contest[eÃ©]/i,
  /a\s+contest[eÃ©]\s+(?:le\s+)?remboursement/i,
  /offered\s+a\s+different\s+amount/i,
  /submitted\s+a\s+reimbursement/i,
  /dispute\s+(?:opened|submitted|filed)/i,
  // Notifications de paiement voyageur (pas un versement hÃ´te, pas une rÃ©servation Ã  importer)
  /paiement\s+effectu[eÃ©]\s+(?:pour|de)\s+(?:la\s+)?r[eÃ©]servation/i,
  /paiement\s+re[cÃ§]u\s+(?:pour|de)\s+(?:la\s+)?r[eÃ©]servation/i,
  /confirmation\s+de\s+paiement/i,
  /votre\s+paiement\s+(?:a\s+[eÃ©]t[eÃ©]\s+)?(?:effectu[eÃ©]|re[cÃ§]u|valid[eÃ©])/i,
  /paiement\s+valid[eÃ©]/i,
  /payment\s+(?:received|confirmed|processed)\s+for/i,
  /your\s+payment\s+(?:has\s+been\s+)?(?:received|confirmed|processed)/i,
  // Rappels d'Ã©valuation HÃ”TE (Airbnb demande Ã  l'hÃ´te de noter son voyageur)
  // Ces emails n'ont pas de rÃ©servation Ã  importer
  /attendent?\s+votre\s+(?:commentaire|[eÃ©]valuation|avis)/i,
  /\d+\s+voyageurs?\s+attendent/i,
  /voyageurs?\s+attendent?\s+votre/i,
  /n[''']oubliez\s+pas\s+de\s+(?:noter|[eÃ©]valuer)/i,
  /[eÃ©]valuez\s+(?:votre\s+)?voyageur/i,
  /notez\s+(?:votre\s+)?voyageur/i,
  /laissez\s+(?:un\s+)?commentaire\s+(?:pour|[Ã a])/i,
  /donnez\s+votre\s+avis\s+(?:sur|pour)/i,
  /rate\s+your\s+guest/i,
  /don[''']t\s+forget\s+to\s+review/i,
  /leave\s+a\s+review\s+for\s+your\s+guest/i,
  /write\s+a\s+review/i,
  // Sujets corrompus / URLs de tracking Airbnb encodÃ©es (base64, paramÃ¨tres URL)
  // Ex: "661?c=.pi80.pkaG9tZV9yZXZpZXdzL2VtcGF0aGV0aWNfaG9zdF9yZXZpZXdfcmVjZWl2ZWQ%3D&eu"
  /^[\w\d]+\?c=/,           // sujet qui commence par un identifiant puis "?c="
  /[A-Za-z0-9+/]{20,}={0,2}/, // longue chaÃ®ne base64 dans le sujet
  /\?(?:c|eu|t|s|ref)=[A-Za-z0-9%_+/.-]{10,}/, // paramÃ¨tre URL encodÃ©
];

// â”€â”€â”€ Patterns de classification par type d'email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ORDRE DE PRIORITÃ‰ : new > cancelled > modified > checkout > reminder > review > payout
// (voir JSDoc en tÃªte de fichier pour la liste complÃ¨te des sujets observÃ©s)
const SUBJECT_PATTERNS = {
  new_fr: [
    // "Marie a rÃ©servÃ© votre logement" / "Marie a rÃ©servÃ©"
    /[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã¤Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]+\s+a\s+r[eÃ©]serv[eÃ©]\s+votre\s+logement/,
    /[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã¤Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]+\s+a\s+r[eÃ©]serv[eÃ©]/,
    // "Marie a demandÃ© Ã  rÃ©server" (rÃ©servation instantanÃ©e ou demande)
    /[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã¤Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]+\s+a\s+demand[eÃ©]\s+[Ã a]\s+r[eÃ©]server/,
    // "RÃ©servation instantanÃ©e"
    /r[eÃ©]servation\s+instantan[eÃ©]e?/i,
    // "Nouvelle rÃ©servation" / "Confirmation de rÃ©servation" / "RÃ©servation confirmÃ©e"
    /nouvelle\s+r[eÃ©]servation/i,
    /confirmation\s+de\s+r[eÃ©]servation/i,
    /r[eÃ©]servation\s+confirm[eÃ©]e?/i,
    /vous\s+avez\s+une\s+nouvelle\s+r[eÃ©]servation/i,
    /votre\s+r[eÃ©]servation\s+est\s+confirm[eÃ©]e?/i,
    /r[eÃ©]servation\s+accept[eÃ©]e?/i,
    // "Demande de rÃ©servation de Marie acceptÃ©e"
    /demande\s+de\s+r[eÃ©]servation\s+accept[eÃ©]e?/i,
    // "FÃ©licitations ! Marie a rÃ©servÃ© votre logement."
    /f[eÃ©]licitations[^a-z]*r[eÃ©]servation/i,
    // "RÃ©servation pour Mon Logement, 10â€“13 avr."
    /r[eÃ©]servation\s+pour\s+.{5,60},?\s+\d{1,2}[â€“\-]/i,
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
    // "Marie a annulÃ© sa rÃ©servation"
    /a\s+annul[eÃ©]\s+(?:sa\s+)?r[eÃ©]servation/i,
    /r[eÃ©]servation\s+annul[eÃ©]e?/i,
    /annulation\s+de\s+r[eÃ©]servation/i,
    /annul[eÃ©]e?\s*:/i,
    /cancelled/i, /cancellation/i,
    /booking\s+cancelled/i,
  ],
  modified: [
    // "Marie a modifiÃ© sa rÃ©servation"
    /a\s+modifi[eÃ©]\s+(?:sa\s+)?r[eÃ©]servation/i,
    // "Marie souhaite changer/modifier sa rÃ©servation"  â† observÃ© rÃ©el
    /souhaite\s+changer\s+(?:sa\s+)?r[eÃ©]servation/i,
    /souhaite\s+modifier\s+(?:sa\s+)?r[eÃ©]servation/i,
    /a\s+chang[eÃ©]\s+(?:sa\s+)?r[eÃ©]servation/i,
    /veut\s+(?:changer|modifier)\s+(?:sa\s+)?r[eÃ©]servation/i,
    /demande\s+de\s+(?:modification|changement)/i,
    /modification\s+de\s+r[eÃ©]servation/i,
    /changement\s+de\s+r[eÃ©]servation/i,
    /modifi[eÃ©]e?\s*:/i,
    // "modified" ou "updated" uniquement si contexte rÃ©servation dans le sujet
    /r[eÃ©]servation\s+(?:modifi[eÃ©]e?|updated?)/i,
    /booking\s+(?:modified|updated)/i,
    /mis\s+[Ã a]\s+jour\s+[:\-â€“]/i,
    /alteration\s+request/i,
    // "Marie wants to change their booking"
    /wants?\s+to\s+change\s+(?:their\s+)?(?:reservation|booking)/i,
  ],
  checkout: [
    // "Le sÃ©jour de Marie se termine aujourd'hui"
    /s[eÃ©]jour\s+de\s+.+\s+se\s+termine/i,
    // "Marie part aujourd'hui"
    /[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã¤Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]+\s+part\s+aujourd[''']hui/,
    /d[eÃ©]part\s+de/i,
    /voyage\s+termin[eÃ©]/i, /s[eÃ©]jour\s+termin[eÃ©]/i,
    /check.?out/i, /checkout/i,
    /trip\s+completed/i, /stay\s+completed/i,
    /your\s+guest\s+is\s+checking\s+out/i,
    /checking\s+out\s+today/i,
  ],
  reminder: [
    // Rappels d'arrivÃ©e imminente UNIQUEMENT (liÃ©s Ã  une rÃ©servation existante)
    // Les rappels d'Ã©valuation hÃ´te sont dans IGNORED_PATTERNS
    // "Rappel : Marie arrive dans 2 jours" â€” exclure "Rappel : annulation" etc.
    /rappel\s*[:\â€“-]\s*(?!annul|cancel|modif|politique)[^\n]{0,40}(?:arriv|s[eÃ©]jour|check|voyage)/i,
    /dans\s+\d+\s+jours?/i,
    /in\s+\d+\s+days?/i,
    // "Marie arrive demain !"
    /arrive\s+(?:demain|aujourd[''']hui|dans)/i,
    /pr[eÃ©]par[eÃ©]z.{0,20}arriv[eÃ©]e?/i,
    /avez.{0,20}pr[eÃ©]par[eÃ©].{0,20}arriv[eÃ©]e?/i,
    /prochaine?\s+arriv[eÃ©]e?/i,
    /prochaine?\s+s[eÃ©]jour/i,
    /reminder\s*:/i,
    /arriving\s+(?:tomorrow|today|in\s+\d)/i,
  ],
  review: [
    // Avis REÃ‡U d'un voyageur (â‰  rappel hÃ´te d'Ã©valuer â†’ voir IGNORED_PATTERNS)
    // "Marie a laissÃ© une Ã©valuation 4 Ã©toiles"  â† observÃ© rÃ©el
    /a\s+laiss[eÃ©]\s+une?\s+[eÃ©]valuation/i,
    // "Un voyageur a rÃ©cemment laissÃ© une Ã©valuation 1 Ã©toile"  â† observÃ© rÃ©el (prÃ©nom masquÃ©)
    /un(?:e)?\s+(?:de\s+vos\s+)?voyageurs?\s+a\s+(?:r[eÃ©]cemment\s+)?laiss[eÃ©]/i,
    // "Un voyageur a rÃ©cemment laissÃ© un avis"  â† variante
    /un(?:e)?\s+(?:de\s+vos\s+)?voyageurs?\s+a\s+(?:r[eÃ©]cemment\s+)?[eÃ©]valu[eÃ©]/i,
    // "A guest has recently left a review"  â† EN anonymisÃ©
    /a\s+guest\s+(?:has\s+)?(?:recently\s+)?left\s+(?:a\s+)?(?:review|rating)/i,
    // "Marie a Ã©valuÃ© / notÃ© votre logement"
    /a\s+[eÃ©]valu[eÃ©]\s+votre\s+(?:logement|s[eÃ©]jour|annonce)/i,
    /a\s+not[eÃ©]\s+votre\s+(?:logement|s[eÃ©]jour|annonce)/i,
    // "Marie a laissÃ© un avis"
    /a\s+laiss[eÃ©]\s+(?:un\s+)?avis/i,
    // "vous a laissÃ© une Ã©valuation 5 Ã©toiles !"  â† observÃ© rÃ©el (prÃ©nom masquÃ© par Airbnb)
    /vous\s+a\s+(?:laiss[eÃ©]\s+un[e]?\s+(?:avis|[eÃ©]valuation)|not[eÃ©])/i,
    /vous\s+a\s+[eÃ©]valu[eÃ©]/i,
    /nouvel?\s+avis/i,
    /nouvelle?\s+[eÃ©]valuation/i,
    /new\s+review/i,
    /left\s+you\s+a\s+review/i,
    /left\s+(?:an?\s+)?evaluation/i,
    /avis\s+re[cÃ§]u/i,
    /review\s+received/i,
    /rated\s+you/i,
    /rated?\s+your\s+(?:place|listing|home)/i,
    /vous\s+a\s+not[eÃ©]/i,
    /a\s+[eÃ©]valu[eÃ©]\s+votre\s+s[eÃ©]jour/i,
    /reviewed\s+their\s+stay/i,
    // Note explicite dans le sujet : "... 4 Ã©toiles", "... 5 stars" / "1 Ã©toile"
    /\d\s*[eÃ©]toiles?\s*[!.]?\s*$/i,
      /\d\s*[eÃ©]toiles?\s*$/i,
      /[eÃ©]valuation\s+\d\s*[eÃ©]toiles?/i,
      /avis\s+\d\s*[eÃ©]toiles?/i,
      /[eÃ©]valuation\s+de\s+/i,
      /avis\s+de\s+/i,
    /\d\s*stars?\s*[!.]?\s*$/i,
  ],
  payout: [
    // Versement hÃ´te â€” Airbnb envoie de l'argent Ã  l'hÃ´te
    // "Nous avons envoyÃ© un versement de 63,62 €"  â† format exact Airbnb observÃ©
    /nous\s+avons\s+envoy[eÃ©]\s+un\s+versement/i,
    /votre\s+versement\s+de/i,
    /versement\s+de\s+[\d,.\s]+\s*[€$£]/i,
    /virement\s+(?:effectu[eÃ©]|envoy[eÃ©])/i,
    /r[eÃ¨]glement\s+effectu[eÃ©]/i,
    // "Your payout of $X has been sent"
    /your\s+payout\s+of/i,
    /payout\s+(?:sent|of)\s+/i,
    // Mots-clÃ©s seuls (moins prÃ©cis, en dernier recours) â€” avec contexte montant pour Ã©viter faux positifs
    /\bversement\s+(?:de|du|pour|pr[eÃ©]vu)\b/i,
    /\bvirement\s+(?:de|du|bancaire|effectu[eÃ©]|envoy[eÃ©])\b/i,
    /\bpayout\b/i,
  ],
};

// â”€â”€â”€ Extracteurs de donnÃ©es â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  // Nettoyer les espaces insÃ©cables (\xa0), tabs, espaces multiples
  const s = raw.replace(/[\xa0\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // Format ISO dÃ©jÃ  OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Format DD/MM/YY (annÃ©e Ã  2 chiffres) â†’ interprÃ©tÃ© comme 20YY
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

  // Helper normalisation : enlÃ¨ve accents et ponctuation pour le lookup
  const norm = (x: string) => x.toLowerCase()
    .replace(/\./g, '')
    .replace(/[Ã©Ã¨ÃªÃ«]/g, 'e').replace(/[Ã Ã¢Ã¤]/g, 'a').replace(/[Ã¹Ã»Ã¼]/g, 'u')
    .replace(/[Ã®Ã¯]/g, 'i').replace(/[Ã´Ã¶]/g, 'o').replace(/Ã§/g, 'c')
    .trim();

  const monthsFr: Record<string, string> = {
    // Noms complets
    janvier:'01', fevrier:'02', mars:'03', avril:'04',
    mai:'05', juin:'06', juillet:'07', aout:'08',
    septembre:'09', octobre:'10', novembre:'11', decembre:'12',
    // AbrÃ©viations Airbnb (avec ou sans point)
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

  // Format textuel FR avec annÃ©e : "12 avril 2026", "sam. 12 avr. 2026", "lundi 14 avril 2026"
  // Capture: (jour_semaine optionnel) jour mois annÃ©e
  // Accepte aussi le mois avec point final collÃ© ("avr." avant l'annÃ©e)
  const withYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wÃ©Ã¨Ã»Ã®Ã Ã¢]+\.?)\s+(\d{4})/i);
  if (withYear) {
    const key = norm(withYear[2]);
    if (monthsFr[key]) {
      return `${withYear[3]}-${monthsFr[key]}-${withYear[1].padStart(2, '0')}`;
    }
  }

  // Format textuel FR SANS annÃ©e : "10 avr." / "10 avr" / "10 avril" / "sam. 10 avr."
  // â†’ dÃ©duire l'annÃ©e depuis receivedAt si disponible, sinon annÃ©e courante
  // IMPORTANT : on prÃ©fÃ¨re NE PAS infÃ©rer d'annÃ©e plutÃ´t que d'en mettre une fausse.
  // Cette branche est un DERNIER RECOURS â€” les patterns avec annÃ©e sont prioritaires.
  const noYear = s.match(/(?:(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\.?\s+)?(\d{1,2})\s+([\wÃ©Ã¨Ã»Ã®Ã Ã¢]+\.?)$/i);
  if (noYear) {
    const key = norm(noYear[2]);
    const monthNum = monthsFr[key];
    if (monthNum) {
      const now = new Date();
      const year = now.getFullYear();
      const candidate = `${year}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      const diff = (new Date(candidate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      // Si la date semble dans le passÃ© lointain (> 180j), tenter annÃ©e prÃ©cÃ©dente aussi
      if (diff < -180) return `${year + 1}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      if (diff < -400) return `${year - 1}-${monthNum}-${noYear[1].padStart(2, '0')}`;
      return candidate;
    }
  }

  // Format textuel anglais avec annÃ©e : "April 12, 2026" / "Apr 12, 2026"
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

  // Format textuel anglais SANS annÃ©e : "Apr 10" / "April 10" / "Apr. 10"
  // â†’ mÃªme logique d'infÃ©rence d'annÃ©e que le franÃ§ais
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
  // "10 Apr" / "10 April" (jour avant mois EN, sans annÃ©e)
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
  // Vrais formats Airbnb hÃ´te observÃ©s :
  //   "Revenus : 178 €"              (email nouvelle rÃ©servation hÃ´te)
  //   "Vos revenus pour ce sÃ©jour : 154,00 €"
  //   "Votre revenu estimÃ© : 154 €"
  //   "Votre revenu : 154 €"
  //   "Total : 210,00 €"             (rÃ©capitulatif voyageur)
  //   "Montant total : 210 €"
  //   "Prix total : 210 €"
  //   "Vous gagnez 178 €"
  //   "178 €" (montant seul sur une ligne)
  //
  // IMPORTANT : on cherche le montant le plus pertinent dans cet ordre de prioritÃ©.
  // Un helper pour extraire un nombre depuis une chaÃ®ne capturÃ©e
  const parseAmount = (s: string): number => {
    // Supporte "178,34" / "178.34" / "1 234,56" / "1 234.56" / espaces insÃ©cables \xa0
    const clean = s.replace(/[\u20AC\u00A3$€£]/g, '').replace(/[\s\xa0\u202f]+/g, ' ').trim();
    // Format FR : "1 234,56" â†’ supprimer espaces inter-chiffres, puis remplacer virgule
    // Strip thousand-separator spaces ('1 234,56' -> '1234,56'), then normalize FR comma
    const normalized = clean.replace(/(?<=\d)\s+(?=\d)/g, '').replace(',', '.');
    const val = parseFloat(normalized);
    return (!isNaN(val) && val > 0 && val < 100000) ? val : 0;
  };

  const patterns: RegExp[] = [
    // ðŸ¥‡ Revenus hÃ´te (prioritÃ© maximale â€” c'est ce que l'hÃ´te reÃ§oit)
    /vos\s+revenus\s+pour\s+ce\s+s[eÃ©]jour\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+revenu\s+estim[eÃ©]\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+revenu\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /revenus?\s+de\s+l[''`]h[oÃ´]te\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /revenus?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /host\s+earnings?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /vous\s+gagnez\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /you\s+earn\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /earnings?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // ðŸ¥ˆ Total gÃ©nÃ©ral
    /montant\s+total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /total\s+amount\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /prix\s+total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /total\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // ðŸ¥‰ Montant gÃ©nÃ©rique
    /montant\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /payout\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /prix\s+(?:de\s+la\s+)?nuit[eÃ©]e?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    // ðŸ”š Dernier recours : premier montant en euros trouvÃ© dans le texte
    // Guard renforcÃ© : min 1 chiffre, max 8 chiffres avant virgule, pas suivi d'autres chiffres
    // Ã‰vite les faux positifs sur numÃ©ros de tÃ©lÃ©phone (ex: "0612345678")
    /(?<![0-9])([€$£]\s*[\d\s\xa0]{1,8}[,.]?\d{0,2})(?![0-9])/,
    /(?<![0-9])([\d][\d\s\xa0]{0,8}[,.]?\d{0,2})\s*[€$£](?![\d])/,
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
    /frais\s+(?:de\s+)?m[eÃ©]nage\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /nettoyage\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /cleaning\s+fee\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
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
    /frais\s+de\s+service(?:\s+airbnb)?\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /commission\s+(?:airbnb|de\s+service)\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /service\s+fee\s*[:\s]*([€$£]?\s*[\d\s\xa0.,]+)/i,
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
  //   "Nous avons envoyÃ© un versement de 178,34 €"
  //   "Montant versÃ© : 178,34 €"
  //   "Vous recevrez : 178,34 €"
  //   "Votre versement : 178,34 €"
  const patterns = [
    // Format exact sujet/corps versement Airbnb
    /nous\s+avons\s+envoy[eÃ©]\s+un\s+versement\s+de\s+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /versement\s+de\s+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /votre\s+versement\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /montant\s+vers[eÃ©]\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /vous\s+recevrez?\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /host\s+payout\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
    /r[eÃ©]mun[eÃ©]ration\s*[:\s]+([€$£]?\s*[\d\s\xa0.,]+)/i,
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

// â”€â”€â”€ Nouveaux extracteurs spÃ©cialisÃ©s â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractCheckInTime(text: string): string | undefined {
  // Formats Airbnb observÃ©s :
  //   "Heure d'arrivÃ©e : 15:00" / "Heure d'arrivÃ©e : Ã  partir de 15h"
  //   "ArrivÃ©e aprÃ¨s 15h00" / "Check-in : 15h00" / "Ã  partir de 15:00"
  //   "Check-in time: 3:00 PM" / "After 3 PM"
  const patterns = [
    // Patterns avec label "heure d'arrivÃ©e" ou "check-in" â†’ trÃ¨s spÃ©cifiques â†’ extraire l'heure
    /heure(?:\s+d[''e])?\s*arriv[eÃ©]e?\s*[:\-â€“]\s*(?:[Ã a]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s*[:\-â€“]\s*(?:[Ã a]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?in\s+time\s*[:\-â€“]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    // "ArrivÃ©e : HH:MM" â€” uniquement si suivi directement d'une heure (pas d'une date "10 avr.")
    // Le lookahead interdit que le chiffre soit suivi d'un espace + mois (= date)
    /arriv[eÃ©]e?\s*[:\-â€“]\s*(?:[Ã a]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eÃ©]vr|mars|avr|mai|juin|juil|ao[uÃ»]t|sept|oct|nov|d[eÃ©]c))/i,
    /[Ã a]\s+partir\s+de\s+(\d{1,2}[h:]\d{0,2})/i,
    /after\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    // "Heure d'entrÃ©e : 15h" / "EntrÃ©e Ã  partir de 15h"
    /heure(?:\s+d[''e])?\s*entr[eÃ©]e?\s*[:\-â€“]\s*(?:[Ã a]\s+partir\s+de\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}

function extractCheckOutTime(text: string): string | undefined {
  // Formats Airbnb observÃ©s :
  //   "Heure de dÃ©part : 11:00" / "DÃ©part avant 11h"
  //   "Check-out : 11h00" / "before 11 AM"
  const patterns = [
    /heure(?:\s+de)?\s*d[eÃ©]part\s*[:\-â€“]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s*[:\-â€“]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    /check.?out\s+time\s*[:\-â€“]\s*(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
    // "DÃ©part : HH:MM" â€” uniquement si suivi directement d'une heure (pas d'une date)
    /d[eÃ©]part\s*[:\-â€“]\s*(?:avant\s+)?(\d{1,2}[h:]\d{2})(?!\s+(?:janv|f[eÃ©]vr|mars|avr|mai|juin|juil|ao[uÃ»]t|sept|oct|nov|d[eÃ©]c))/i,
    /avant\s+(\d{1,2}[h:]\d{2})/i,
    /before\s+(\d{1,2}(?::\d{2})?\s*[aApP][mM])/i,
    // "Sortie Ã  11h" / "Heure de sortie : 11h"
    /heure(?:\s+de)?\s*sortie\s*[:\-â€“]\s*(?:avant\s+)?(\d{1,2}[h:]\d{0,2}(?:\s*[aApP][mM])?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return normalizeTime(m[1]);
  }
  return undefined;
}

function normalizeTime(raw: string): string {
  // "15h00" â†’ "15:00" / "3 PM" â†’ "15:00" / "15:0" â†’ "15:00" / "15h" â†’ "15:00"
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
  // Formats Airbnb observÃ©s :
  //   "89 € par nuit" / "Prix par nuit : 89 €"
  //   "Tarif nuitÃ©e : 89,00 €" / "89 €/nuit"
  //   "$89 per night" / "89 € x 3 nuits" / "89 € Ã— 3 nuits"
  const parseAmt = (s: string) => {
    const n = parseFloat(s.replace(/[€$£\s\xa0\u202f]/g, '').replace(',', '.'));
    return !isNaN(n) && n > 0 && n < 10000 ? n : 0;
  };
  const patterns = [
    // "89 € par nuit" ou "89,00€ par nuit" â€” ancre sur le nombre JUSTE avant le symbole/mot
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]\s*(?:par\s+nuit|\/nuit)/i,
    // "€ 89 par nuit" â€” symbole AVANT le nombre
    /[€$£]\s*([\d\s\xa0\u202f]*[,.]?\d+)\s*(?:par\s+nuit|\/nuit)/i,
    /prix\s+(?:de\s+la\s+)?nuit[eÃ©]e?\s*[:\-â€“]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    /tarif\s+(?:de\s+la\s+)?nuit[eÃ©]e?\s*[:\-â€“]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
    // "89 € x 3 nuits" ou "89 € Ã— 3 nuits" (Ã— Unicode U+00D7 ou Ã— en entitÃ© HTML)
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]?\s*[Ã—xÃ—]\s*\d+\s*nuits?/i,
    // "89 € / nuit Ã— 3 nuits" â€” format rÃ©capitulatif Airbnb
    /(\d[\d\s\xa0\u202f]*[,.]?\d*)\s*[€$£]\s*\/\s*nuit/i,
    // "$89 per night"
    /[€$£]\s*([\d\s\xa0\u202f]*[,.]?\d+)\s*per\s+night/i,
    /([\d\s\xa0\u202f]*[,.]?\d+)\s*[€$£]?\s*per\s+night/i,
    /nightly\s+rate\s*[:\-â€“]\s*[€$£]?\s*([\d\s\xa0\u202f]*[,.]?\d+)/i,
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
  // Formats : "Taxes : 12,00 €" / "Taxe de sÃ©jour : 4 €" / "TVA : 5,00 €"
  //            "Taxes and fees: $12" / "Tourist tax: 4 €"
  const parseAmt = (s: string) => {
    const n = parseFloat(s.replace(/[€$£\s\xa0]/g, '').replace(',', '.'));
    return !isNaN(n) && n > 0 ? n : 0;
  };
  const patterns = [
    /taxe(?:s)?\s+de\s+s[eÃ©]jour(?:\s+collect[eÃ©]e?(?:s)?|s)?\s*[:\-â€“]*\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s*(?:et\s+frais)?\s*[:\-â€“]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tva\s*[:\-â€“]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /tourist\s+tax\s*[:\-â€“]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /taxes?\s+and\s+fees?\s*[:\-â€“]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
    /occupancy\s+tax\s*[:\-â€“]?\s*([€$£]?\s*[\d\s\xa0.,]+)/i,
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
  //   "PrÃ©vu le 14 avril 2026" / "Date de versement : 14/04/2026"
  //   "EnvoyÃ© le 13 avr. 2026" / "Estimated arrival: Apr 14, 2026"
  //   "Expected by April 14, 2026"
  const MOIS_RE = `(?:janv?\\.?|f[eÃ©]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uÃ»]t|sept?\\.?|oct\\.?|octobre?|nov\\.?|d[eÃ©]c\\.?|d[eÃ©]cembre?|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)`;
  const patterns = [
    new RegExp(`pr[eÃ©]vu\\s+le\\s+(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`date\\s+(?:de\\s+)?versement\\s*[:\\-â€“]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`envoy[eÃ©]\\s+le\\s+(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
    new RegExp(`estimated\\s+arrival\\s*[:\\-â€“]\\s*(${MOIS_RE}\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
    new RegExp(`expected\\s+by\\s+(${MOIS_RE}\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
    /date\s+de\s+versement\s*[:\-â€“]\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /payout\s+date\s*[:\-â€“]\s*([^\n\r<,]{5,30})/i,
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
  if (/carte\s+(?:de\s+cr[eÃ©]dit|bancaire)|credit\s+card/i.test(text)) return 'Carte bancaire';
  return undefined;
}

function extractCancellationPolicy(text: string): string | undefined {
  // "Politique d'annulation : Flexible" / "Annulation flexible" / "Politique stricte"
  // "Cancellation policy: Flexible" / "Moderate" / "Strict"
  // â”€â”€ 1. Avec label explicite (le plus fiable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const labelFR = text.match(/politique\s+d[''e]annulation\s*[:\-â€“]?\s*(flexible|mod[eÃ©]r[eÃ©]e?|stricte?|ferme|super\s+strict|non\s+remboursable|remboursable|24\s+heures?)/i);
  if (labelFR) return normalizePoliceName(labelFR[1]);

  const labelEN = text.match(/cancellation\s+policy\s*[:\-â€“]?\s*(flexible|moderate|strict|firm|super\s+strict|non.refundable|refundable|24.hour)/i);
  if (labelEN) return normalizePoliceName(labelEN[1]);

  // â”€â”€ 2. Sections dÃ©diÃ©es annulation (contexte fort) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // "annulation flexible" / "politique flexible" / "flexible cancellation"
  const sectionFR = text.match(/(?:politique|conditions?|type)\s+(?:d[''e]\s*)?(?:annulation|remboursement)\s*[:\-â€“]?\s*(flexible|mod[eÃ©]r[eÃ©]e?|stricte?|ferme|24\s+heures?)/i);
  if (sectionFR) return normalizePoliceName(sectionFR[1]);

  const sectionEN = text.match(/(?:cancellation|refund)\s+(?:policy|type|conditions?)\s*[:\-â€“]?\s*(flexible|moderate|strict|firm|24.hour)/i);
  if (sectionEN) return normalizePoliceName(sectionEN[1]);

  // â”€â”€ 3. Mots-clÃ©s UNIQUEMENT si contexte annulation prÃ©sent dans la mÃªme phrase â”€â”€
  // Ã‰vite de retourner "Flexible" sur un texte quelconque contenant ce mot
  const ctxRe = /annulation|cancellation|remboursement|refund/i;
  const lines = text.split(/[\n\r]/);
  for (const line of lines) {
    if (!ctxRe.test(line)) continue;
    if (/\bflexible\b/i.test(line)) return 'Flexible';
    if (/mod[eÃ©]r[eÃ©]e?\b/i.test(line)) return 'ModÃ©rÃ©e';
    if (/\bstricte?\b/i.test(line)) return 'Stricte';
    if (/24\s*h(?:eures?)?/i.test(line)) return 'Flexible (24h)';
  }
  return undefined;
}

function normalizePoliceName(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (/flex/i.test(s)) return 'Flexible';
  if (/24.?h/i.test(s)) return 'Flexible (24h)';
  if (/mod/i.test(s)) return 'ModÃ©rÃ©e';
  if (/ferm|firm/i.test(s)) return 'Ferme';
  if (/strict|super/i.test(s)) return 'Stricte';
  if (/no.refund|non.refund/i.test(s)) return 'Non remboursable';
  return raw.trim();
}

function extractGuestCountry(text: string): string | undefined {
  // Formats : "Pays : France" / "Country: Germany" / "NationalitÃ© : FranÃ§aise"
  // Aussi : drapeaux ou mentions de pays dans le texte
  const patterns = [
    /pays\s*[:\-â€“]\s*([^\n\r<,]{2,40})/i,
    /country\s*[:\-â€“]\s*([^\n\r<,]{2,40})/i,
    /nationalit[eÃ©]\s*[:\-â€“]\s*([^\n\r<,]{2,40})/i,
    /lieu\s+de\s+r[eÃ©]sidence\s*[:\-â€“]\s*([^\n\r<,]{2,40})/i,
    // "Localisation : Paris, France" â†’ extraire "France" aprÃ¨s la virgule
    /localisation\s*[:\-â€“]\s*[^,\n\r]+,\s*([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]{3,30})/i,
    // "Lives in France" / "from France"
    /\blives?\s+in\s+([A-Z][a-z]{2,30})\b/,
    /\bfrom\s+([A-Z][a-z]{2,30})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const country = m[1].trim().replace(/<[^>]*>/g, '').slice(0, 40);
      if (country.length >= 2 && !/airbnb|r[eÃ©]servation|logement/i.test(country)) return country;
    }
  }
  return undefined;
}

function detectGuestLanguage(text: string, subject: string): string | undefined {
  // DÃ©tecte la langue de l'email pour infÃ©rer la langue du voyageur
  // Un email Airbnb est envoyÃ© dans la langue du voyageur
  // Analyser 3000 chars pour couvrir le corps complet (au lieu de 500)
  const combined = (subject + ' ' + text.slice(0, 3000)).toLowerCase();
  // Indices franÃ§ais â€” mots DISTINCTIFS (pas de faux positifs EN)
  const frScore = (combined.match(/\b(votre|vous|r[eÃ©]servation|voyageur|bienvenue|merci|arriv[eÃ©]e?|d[eÃ©]part|nuit[eÃ©]e?|logement|h[oÃ´]te|s[eÃ©]jour|annonce|lundi|mardi|vendredi|dimanche|pr[eÃ©]nom)\b/g) || []).length;
  // Indices anglais â€” mots DISTINCTIFS (Ã©viter "night", "booking", "host" qui apparaissent dans des emails FR)
  const enScore = (combined.match(/\b(your|you(?:'re|r)?|guest|welcome|thank\s+you|arrival|departure|listing|check.?in|check.?out|stay|monday|tuesday|friday|sunday|tonight|tomorrow)\b/g) || []).length;
  // Indices allemand
  const deScore = (combined.match(/\b(ihre|sie|buchung|gast|willkommen|danke|ankunft|abreise|nacht|unterkunft|gastgeber|aufenthalt|montag|dienstag)\b/g) || []).length;
  // Indices espagnol
  const esScore = (combined.match(/\b(su|usted|reserva|hu[eÃ©]sped|bienvenido|gracias|llegada|salida|noche|alojamiento|anfitri[oÃ³]n|estancia|lunes|martes)\b/g) || []).length;
  // Indices italien
  const itScore = (combined.match(/\b(tuo|voi|prenotazione|ospite|benvenuto|grazie|arrivo|partenza|notte|annuncio|host|soggiorno|luned[iÃ¬]|marted[iÃ¬])\b/g) || []).length;

  const scores: Record<string, number> = { fr: frScore, en: enScore, de: deScore, es: esScore, it: itScore };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // Seuil minimum de 2 occurrences pour Ã©viter les faux positifs
  if (best[1] >= 2) return best[0];
  return undefined;
}

function extractGuestPhone(text: string): string | undefined {
  const patterns = [
    /t[eÃ©]l[eÃ©]phone?\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /phone\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /mobile\s*[:\s]+([+\d\s\-\(\)]{8,20})/i,
    /(?:^|\s|\()(\+?[0-9]{1,3}[\s\-]?(?:\([0-9]{1,4}\)[\s\-]?)?[0-9]{6,10})\b/
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
  // Support guest proxy emails from Airbnb (e.g. xxxx@guest.airbnb.com)
  const patterns = [
    /e-?mail\s+voyageur\s*[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /guest\s+e-?mail\s*[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /contact\s*[:\s]+([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
    /(?:^|\s)([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})(?:\s|$)/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const email = m[1].trim().toLowerCase();
      // Allow guest.airbnb.com, but block standard automated airbnb addresses
      if (
        (!email.includes('airbnb.com') || email.includes('guest.airbnb.com')) &&
        !email.includes('noreply') && 
        !email.includes('automated')
      ) {
        return email;
      }
    }
  }
  return undefined;
}

function extractReviewRating(text: string, subject?: string): number | undefined {
  // Chercher la note dans le sujet EN PREMIER (trÃ¨s fiable : "MÃ©lody a laissÃ© une Ã©valuation 4 Ã©toiles")
  if (subject) {
    const subjectMatch = subject.match(/(\d)\s*[eÃ©]toiles?/i) || subject.match(/(\d)\s*stars?/i);
    if (subjectMatch) {
      const rating = parseInt(subjectMatch[1]);
      if (rating >= 1 && rating <= 5) return rating;
    }
  }
  // Puis chercher dans le corps de l'email
  const patterns = [
    /(\d)\s*[\/\sur]\s*5\s*[eÃ©]toile/i,
    /(\d)\s*star[s]?\s*out\s*of\s*5/i,
    /note\s*(?:globale)?\s*[:\-]\s*(\d)/i,
    /overall\s+rating\s*[:\-]\s*(\d)/i,
    /[eÃ©]toile[s]?\s*[:\-]\s*(\d)/i,
    /rated?\s*(\d)\s*[eÃ©]toile/i,
    /rated?\s*(\d)\s*star/i,
    /(\d)\s*[â˜…â­]/,
    /[â˜…â­]\s*(\d)/,
    /(\d)\s*\/\s*5/,
    /(\d)\s*[eÃ©]toiles?/i,
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
  // Extraire le commentaire laissÃ© par le voyageur
  const patterns = [
    /(?:commentaire|comment|avis|review)\s*[:\-]\s*"([^"]{10,500})"/i,
    /(?:ils?\s+ont?\s+(?:dit|[eÃ©]crit)|they\s+(?:said|wrote))\s*[:\-]?\s*"([^"]{10,500})"/i,
    /(?:a\s+(?:laiss[eÃ©]|[eÃ©]crit)|wrote)\s*:\s*"([^"]{10,500})"/i,
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

function extractAirbnbListingId(rawBody: string): string | undefined {
  // Airbnb encode l'ID de l'annonce dans les URLs du corps de l'email.
  // Formats observÃ©s :
  //   https://www.airbnb.com/rooms/12345678
  //   https://www.airbnb.fr/rooms/12345678?...
  //   /rooms/12345678
  //   airbnb.com/rooms/12345678/reviews
  // On cherche dans le corps HTML BRUT (avant le strip HTML) pour avoir toutes les URLs.
  const patterns = [
    /airbnb\.[a-z]{2,3}\/rooms\/(\d{6,12})/i,
    /\/rooms\/(\d{6,12})/i,
    // URL encodÃ©e base64 (tracking Airbnb) â†’ on ne tente pas de dÃ©coder, trop complexe
  ];
  for (const p of patterns) {
    const m = rawBody.match(p);
    if (m) return m[1];
  }
  return undefined;
}

function extractGuests(text: string, subject?: string): number {
  // Cherche le nombre total de voyageurs â€” additionne adultes+enfants+bÃ©bÃ©s si prÃ©sents,
  // sinon prend le premier chiffre voyageur/guest/personne trouvÃ©.
  // Chercher dans le corps ET dans le sujet
  const combined = text + (subject ? ' ' + subject : '');
  
  // Format Airbnb rÃ©cent: "1 adulte, 1 enfant" ou "2 adultes, 1 bÃ©bÃ©"
  const adultsM = combined.match(/(\d+)\s*adultes?/i);
  const childM  = combined.match(/(\d+)\s*(?:enfants?|child(?:ren)?)/i);
  const babyM   = combined.match(/(\d+)\s*(?:b[eÃ©]b[eÃ©]s?|infants?|nourrissons?)/i);
  const petM    = combined.match(/(\d+)\s*(?:animaux(?:|x)|anim(?:al|aux)|pet?s)/i);

  if (adultsM || childM || babyM || petM) {
    const adults   = adultsM ? parseInt(adultsM[1]) : 0;
    // Parfois sans adultes mentionnÃ©s, il peut y avoir juste voyageurs
    const children = childM  ? parseInt(childM[1])  : 0;
    const babies   = babyM   ? parseInt(babyM[1])   : 0;
    const pets     = petM    ? parseInt(petM[1])    : 0;
    const total = adults + children + babies; // Les animaux ne comptent generalement pas dans la jauge humaine stricte, mais on les ignore pour count.
    if (total >= 1 && total <= 50) return total;
  }

  const patterns: Array<[RegExp, number]> = [
    [/(\d+)\s*voyageur(?:s)?/i, 1],
    [/(\d+)\s*guest(?:s)?/i, 1],
    [/(\d+)\s*personne(?:s)?/i, 1],
    [/(\d+)\s*person(?:s)?/i, 1],
    [/nombre\s+de\s+voyageurs?\s*[:\-\u2013\u2014]\s*(\d+)/i, 1],
    [/number\s+of\s+guests?\s*[:\-\u2013\u2014]\s*(\d+)/i, 1],
    [/pour\s+(\d+)\s*(?:voyageur(?:s)?|personne(?:s)?|guest(?:s)?)/i, 1],
  ];
  for (const [p, idx] of patterns) {
    const m = combined.match(p);
    if (m) {
      const v = parseInt(m[idx]);
      if (v >= 1 && v <= 50) return v;
    }
  }
  return 1;
}

function extractGuestName(text: string, subject?: string): string {
  // Regex de prÃ©nom/nom : commence par majuscule, peut avoir un nom de famille
  // Supporte les prÃ©noms composÃ©s (Jean-Pierre), les accents, les tirets
  const NAME = `[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+(?:\\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+)?`;
  const NAME_RE = new RegExp(NAME);

  // â”€â”€ 1. Depuis le SUJET (source la plus fiable) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (subject) {
    const subjectPatterns = [
      // ðŸ”µ NOUVELLE RÃ‰SERVATION â€” format principal Airbnb hÃ´te
      // "PrÃ©nom a rÃ©servÃ© votre logement"
      // "Marie a rÃ©servÃ© votre logement"
      new RegExp(`^(${NAME})\\s+a\\s+r[eÃ©]serv[eÃ©](?:\\s+votre\\s+logement)?`, 'u'),
      // "Marie a demandÃ© Ã  rÃ©server"
      new RegExp(`^(${NAME})\\s+a\\s+demand[eÃ©]\\s+[Ã a]\\s+r[eÃ©]server`, 'u'),
      // "PrÃ©nom souhaite rÃ©server votre logement" (demande)
      new RegExp(`^(${NAME})\\s+souhaite\\s+r[eÃ©]server`, 'u'),
      // "Nouvelle rÃ©servation de PrÃ©nom"
      new RegExp(`nouvelle\\s+r[eÃ©]servation\\s+de\\s+(${NAME})`, 'iu'),
      // EN: "PrÃ©nom has booked your place"
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+has\s+(?:booked|reserved)/,
      // EN: "New reservation from PrÃ©nom"
      /new\s+reservation\s+from\s+([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)/i,
      // ðŸ”´ ANNULATION â€” "PrÃ©nom a annulÃ© sa rÃ©servation"
      new RegExp(`^(${NAME})\\s+a\\s+annul[eÃ©]`, 'u'),
      // ðŸŸ¡ MODIFICATION â€” "PrÃ©nom a modifiÃ© / souhaite changer / souhaite modifier"
      new RegExp(`^(${NAME})\\s+a\\s+modifi[eÃ©]`, 'u'),
      new RegExp(`^(${NAME})\\s+souhaite\\s+(?:changer|modifier)`, 'u'),
      // ðŸŸ¤ DÃ‰PART â€” "Le sÃ©jour de PrÃ©nom se termine"
      new RegExp(`s[eÃ©]jour\\s+de\\s+(${NAME})\\s+se\\s+termine`, 'iu'),
      // "PrÃ©nom part aujourd'hui"
      new RegExp(`^(${NAME})\\s+part\\s+aujourd`, 'u'),
      // ðŸ”” RAPPEL â€” "Rappel : PrÃ©nom arrive demain"
      new RegExp(`rappel\\s*[:\\-â€“]\\s*(${NAME})\\s+arrive`, 'iu'),
      new RegExp(`(${NAME})\\s+arrive\\s+(?:demain|aujourd|dans)`, 'iu'),
      // â­ AVIS â€” "PrÃ©nom a laissÃ© un avis"
      new RegExp(`^(${NAME})\\s+a\\s+laiss[eÃ©]\\s+(?:un\\s+)?avis`, 'u'),
      new RegExp(`^(${NAME})\\s+vous\\s+a\\s+not[eÃ©]`, 'u'),
      new RegExp(`^(${NAME})\\s+a\\s+[eÃ©]valu[eÃ©]`, 'u'),
      // EN: "PrÃ©nom left you a review"
      /^([A-Z][a-z\-]+(?:\s+[A-Z][a-z\-]+)?)\s+left\s+you\s+a\s+review/,
      // ðŸ’¶ VERSEMENT â€” "versement pour le sÃ©jour de PrÃ©nom"
      new RegExp(`s[eÃ©]jour\\s+de\\s+(${NAME})`, 'iu'),
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const name = m[1].trim().slice(0, 60);
        if (name.length >= 2 && !/airbnb/i.test(name) && NAME_RE.test(name)) return name;
      }
    }
  }

  // â”€â”€ 2. Depuis le CORPS de l'email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // BasÃ© sur les vrais formats observÃ©s dans les emails Airbnb hÃ´te
  const bodyPatterns = [
    // "PrÃ©nom a rÃ©servÃ© votre logement" dans le corps
    new RegExp(`([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+(?:\\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+)?)\\s+a\\s+r[eÃ©]serv[eÃ©](?:\\s+votre\\s+logement)?`),
    // "PrÃ©nom souhaite rÃ©server"
    new RegExp(`([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+(?:\\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\\-]+)?)\\s+souhaite\\s+r[eÃ©]server`),
    // "Bonjour [HÃ´te], PrÃ©nom a rÃ©servÃ©" â†’ aprÃ¨s "Bonjour"
    /Bonjour\s+\S+,?\s+([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+(?:\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+)?)\s+a\s+r[eÃ©]serv[eÃ©]/u,
    // Labels explicites dans le corps
    /voyageur[s]?\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /nom\s+du\s+voyageur\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /nouveau\s+voyageur\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /invit[eÃ©]\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /guest\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    /name\s*[:\-]\s*([^\n\r<,]{2,60})/i,
    // "rÃ©servation de PrÃ©nom"
    /r[eÃ©]servation\s+de\s+([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+(?:\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+)?)/i,
    // "sÃ©jour de PrÃ©nom" (dans corps payout ou checkout)
    /s[eÃ©]jour\s+de\s+([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+(?:\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+)?)/i,
    // "PrÃ©nom a laissÃ© un avis"
    /([A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+(?:\s+[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦\-]+)?)\s+a\s+laiss[eÃ©]\s+(?:un\s+)?avis/i,
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
      // Filtres anti-pollution: rejeter si ressemble Ã  un payout, une phrase ou du bruit
      if (name.length >= 2
        && name.length <= 50
        && !/airbnb/i.test(name)
        && !/versement|payout|s[eÃ©]jour|r[eÃ©]servation|logement|annonce/i.test(name)
        && NAME_RE.test(name)
      ) return name;
    }
  }
  return 'Voyageur Airbnb';
}

function extractConfirmationCode(text: string): string | undefined {
  // Codes Airbnb : format HMxxxxxxxxxx (HM + 6-10 alphanum)
  // Vrais formats observÃ©s: HM1234567890, HMABCD123456, etc.
  // RÃˆGLE DE SÃ‰CURITÃ‰ : on n'accepte QUE les codes avec label explicite OU le format natif HM
  const patterns = [
    // â‘  Label explicite â€” le plus fiable (indÃ©pendant du format du code)
    /code\s+de\s+confirmation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /confirmation\s+code\s*[:\s]+([A-Z0-9]{6,12})/i,
    /r[eÃ©]f[eÃ©]rence\s+(?:de\s+)?r[eÃ©]servation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /n[Â°o]\.?\s*(?:de\s+)?r[eÃ©]servation\s*[:\s]+([A-Z0-9]{6,12})/i,
    /booking\s+(?:reference|id|code|#)\s*[:\s]+([A-Z0-9]{6,12})/i,
    // â‘¡ Format natif Airbnb "HM" â€” UNIQUEMENT ce format sans label (trÃ¨s spÃ©cifique, pas de faux positifs)
    /\b(HM[A-Z0-9]{6,10})\b/i,
    // â‘¢ NE PAS utiliser le pattern gÃ©nÃ©rique [A-Z]{2,3}[0-9]{5,9} â€” trop de faux positifs
    // (IBAN partiels, codes postaux Ã©trangers, montantsâ€¦)
  ];

  // Mots Ã  blacklister (faux positifs frÃ©quents)
  const BLACKLIST = /^(EUR|USD|GBP|JPY|CHF|CAD|AUD|TTC|TVA|HT|PDF|URL|API|HTML|SMS|WWW|HTTP|HTTPS|AIRBNB|IATA|ISBN|IBAN|BIC|SWIFT|VAT|REF|NO|NR|FR|EN|DE|ES|IT|PT|NL|PL|RU|ZH|JA|KO|AR|TR|ID|TH|HT|PM|AM|OK)$/;

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const code = m[1].toUpperCase();
      if (!BLACKLIST.test(code) && code.length >= 6) return code;
    }
  }
  return undefined;
}

function extractPropertyName(text: string, subject?: string): string | undefined {
  // â”€â”€ GUARD : emails de type "arrive le" / "part" â†’ jamais de nom de logement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (subject && (
    /\barrive\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject) ||
    /\bpart\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject) ||
    /^(?:\[[^\]]+\]\s*)?[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+\s+(a\s+r[eé]serv|annul|modifi|laiss|r[eé]dig|souhait)/i.test(subject) ||
    /\bcheck[\s-]?(in|out)\b/i.test(subject)
  )) {
    return undefined;
  }

  // â”€â”€ GUARD : emails de versement â†’ jamais de nom de logement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // "Nous avons envoyÃ© un versement de X €" â†’ return undefined immÃ©diatement
  const PAYOUT_RE = /nous\s+avons\s+envoy[eÃ©]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout|versement\s+de\s+[\d,.\s]+\s*[€$£]|your\s+payout\s+of/i;
  const isPayoutEmail = PAYOUT_RE.test(text.slice(0, 600)) || (subject ? PAYOUT_RE.test(subject) : false);
  if (isPayoutEmail) return undefined;

  // Helper: nettoie un candidat de nom de logement
  const cleanCandidate = (raw: string): string => {
    const c = stripDateSuffix(raw.trim().replace(/<[^>]*>/g, '').replace(/\s+/g, ' '))
      .replace(/\s*\|.*$/, '')
      .replace(/\s*[-â€“]\s*Airbnb.*$/i, '')
      .replace(/\.$/, '')
      .replace(/\s*\(airbnb\)/i, '')
      .trim()
      .slice(0, 80);
    if (c && (/[?=&%]|https?:/.test(c) || (c.length > 50 && !c.includes(' ')))) return '';
    return c;
  };

  // â”€â”€ 1. CORPS du mail â€” patterns structurÃ©s (les plus fiables) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Vrais formats Airbnb observÃ©s dans les emails hÃ´te 2024-2026 :
  //   "RÃ©servation pour NomLogement, 10â€“13 avr."   â†’ dans le corps
  //   "Annonce : NomLogement"
  //   "Votre logement : NomLogement"
  //   "Logement : NomLogement"
  //   "Your listing: NomLogement"
  const bodyPatterns: RegExp[] = [
    // Format Airbnb hÃ´te : "RÃ©servation pour NomLogement, 10â€“13 avr."
    // Le nom est entre "pour " et la virgule+date ou fin de ligne
    /r[eÃ©]servation\s+pour\s+([^,\n\r<]{5,70})(?:,|\n|\r|$)/i,
    // "Logement : NomLogement" / "Votre logement : NomLogement"
    /(?:votre\s+)?logement\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Annonce : NomLogement" / "Votre annonce : NomLogement"
    /(?:votre\s+)?annonce\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Titre de l'annonce : NomLogement"
    /titre\s+de\s+l['']annonce\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "PropriÃ©tÃ© : NomLogement"
    /propri[eÃ©]t[eÃ©]\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Your listing: NomLogement"
    /your\s+listing\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Listing: NomLogement"
    /listing\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Property: NomLogement"
    /property\s*[:\-]\s*([^\n\r<]{5,80})/i,
    // "Vous restez Ã  : NomLogement"
    /vous\s+restez\s+[Ã a]\s*[:\-]?\s*([^\n\r<]{5,80})/i,
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
    // "Voyage Ã  NomLogement"
    /voyage\s+[Ã a]\s+([^\n\r<,\.]{5,60})/i,
  ];
  for (const p of bodyPatterns) {
    const m = text.match(p);
    if (m) {
      const c = cleanCandidate(m[1]);
      // Rejeter si contient des mots-clÃ©s de versement ou de bruit
      if (c.length >= 5 && !/versement|payout|virement|envoy[eÃ©]|r[eÃ©]gl[eÃ©]|€\s*\d|^\d+[,.]?\d*\s*[€$]/i.test(c)) return c;
    }
  }

  // â”€â”€ 2. SUJET de l'email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Vrais sujets Airbnb observÃ©s :
  //   "RÃ©servation pour NomLogement, 10â€“13 avr."
  //   "RÃ©servation confirmÃ©e â€“ NomLogement"
  //   "NomLogement â€“ Rappel check-in"   â† nom EN PREMIER
  //   "Check-in â€“ NomLogement"
  //   "Votre sÃ©jour Ã  NomLogement"
  //   "Rappel : NomLogement"
  if (subject) {
    const subjectPatterns: RegExp[] = [
      // ðŸ† PRIORITÃ‰ 1 : "RÃ©servation pour NomLogement, ..." â€” format exact Airbnb hÃ´te
      /r[eÃ©]servation\s+pour\s+([^,\n\r]{5,60})(?:,|$)/i,
      // "RÃ©servation confirmÃ©e â€“ NomLogement" ou "Booking confirmed â€“ NomLogement"
      /(?:r[eÃ©]servation\s+(?:confirm[eÃ©]e?|accept[eÃ©]e?)|booking\s+confirmed?)\s*[â€“\-:]\s*([^,\n\r]{5,60})/i,
      // "SÃ©jour confirmÃ© â€“ NomLogement"
      /s[eÃ©]jour\s+confirm[eÃ©]\s*[â€“\-:]\s*([^,\n\r]{5,60})/i,
      // "Votre sÃ©jour Ã  NomLogement"
      /votre\s+s[eÃ©]jour\s+(?:[Ã a]|chez|dans)\s+([^,\n\r]{5,60})/i,
      // "Votre voyage Ã  NomLogement"
      /votre\s+voyage\s+(?:[Ã a]|chez|dans)\s+([^,\n\r]{5,60})/i,
      // "Check-in â€“ NomLogement" ou "DÃ©part â€“ NomLogement"
      /check.?(?:in|out)\s*[â€“\-:]\s*([^,\n\r]{5,60})/i,
      /d[eÃ©]part\s*[â€“\-:]\s*([^,\n\r]{5,60})/i,
      // "Rappel : NomLogement" (rappels hÃ´te) â€” SEULEMENT si ce qui suit n'est pas un prÃ©nom+verbe
      // Exclure "Rappel : Marie arrive demain" â†’ "Marie arrive demain" n'est pas un logement
      // Le nom du logement ne commence pas par un prÃ©nom suivi d'un verbe
      /rappel\s*[â€“\-:]\s*(?![A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-z]+\s+(?:arrive|part|s[eÃ©]jour|est|a\s))([^,\n\r]{5,60})/i,
      // "Demande de rÃ©servation â€“ NomLogement"
      /demande\s+de\s+r[eÃ©]servation\s*[â€“\-:]\s*([^,\n\r]{5,60})/i,
      // "Votre annonce NomLogement a reÃ§uâ€¦"
      /votre\s+annonce\s+([^,\n\r\s]{5,60}(?:\s+\S+){0,4})\s+a\s+re[cÃ§]u/i,
      // "[Airbnb] NomLogement"
      /\[airbnb\]\s+([^â€“\-\n\r]{5,60})(?:\s*[â€“\-]|$)/i,
      // "Airbnb â€“ NomLogement"
      /\bairbnb\s*[â€“\-]\s*([^,\n\r]{5,60})/i,
      // Format "NomLogement â€“ Rappel/RÃ©servation/Check-in/â€¦" (nom en tÃªte)
      // Exclure si la partie gauche ressemble Ã  un prÃ©nom+verbe ("Marie arrive â€“ ...")
      // Ajout : r[eÃ©]servation|annul|modifi|avis pour couvrir tous les sujets courants
      /^((?!.*\b(?:arrive|part|est\s+l[Ã a]|demain|aujourd)\b)[^â€“\-\n\r]{5,60}?)\s*[â€“\-]\s*(?:rappel|check|s[eÃ©]jour|d[eÃ©]part|arriv|confirm|r[eÃ©]servation|annul|modifi|avis|review|paiement|payment|message)/i,
      // Concernant un logement
      /concernant\s+(?:votre\s+logement\s+)?([^,\n\r]{5,60})/i,
    ];
    for (const p of subjectPatterns) {
      const m = subject.match(p);
      if (m) {
        const c = cleanCandidate(m[1]);
        if (c.length >= 5 && !/versement|payout|virement|envoy[eÃ©]|r[eÃ©]gl[eÃ©]|^\d+[,.]?\d*\s*[€$]/i.test(c)) return c;
      }
    }

    // â”€â”€ 3. DERNIER RECOURS : nettoyer le sujet entier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Uniquement si le sujet ne ressemble PAS Ã  un payout ou un nom de voyageur
    const isPersonSubject = /^(?:\[[^\]]+\]\s*)?[A-Z\u00C0-\u024F][a-z\u00C0-\u024F]+(?:\s+[A-Za-z\u00C0-\u024F\-]+){0,3}\s+(a\s+r[eé]serv|annul|modifi|laiss|part\s|arrive|r[eé]dig|souhait|veut|aimer)/i.test(subject)
      || /\barrive\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(subject)
      || /^rappel\s*[:\-â€“]/i.test(subject)
      || /\bpart\s+(aujourd|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(subject)
      || /\bcheck[\s-]?(in|out)\b/i.test(subject);
    if (!isPersonSubject) {
      const cleaned = subject
        .replace(/airbnb/gi, '')
        .replace(/r[eÃ©]servation\s+(confirm[eÃ©]e?|accept[eÃ©]e?|re[cÃ§]ue?)/gi, '')
        .replace(/nouvelle?\s+r[eÃ©]servation/gi, '')
        .replace(/booking\s+(confirmed?|received?)/gi, '')
        .replace(/rappel\s+(?:d['e]?\s*)?arriv[eÃ©]e?/gi, '')
        .replace(/rappel\s+check.?in/gi, '')
        .replace(/rappel\s*[:\-â€“]/gi, '')
        .replace(/check.?(?:in|out)/gi, '')
        .replace(/confirmation\s+de\s+s[eÃ©]jour/gi, '')
        .replace(/votre\s+(?:voyage|s[eÃ©]jour)\s+[Ã a]/gi, '')
        // Supprimer les fragments "arrive le/demain/aujourd'hui/dans N jours"
        .replace(/arrive\s+(?:le|demain|aujourd['']hui|dans\s+\d)/gi, '')
        // Supprimer "part aujourd'hui" / "part demain"
        .replace(/part\s+(aujourd['']hui|demain)/gi, '')
        // Supprimer "dans N jours" / "dans N nuits"
        .replace(/dans\s+\d+\s+(?:jours?|nuits?)/gi, '')
        // Supprimer les prÃ©noms isolÃ©s (PrÃ©nom + verbe de rappel)
        .replace(/[A-ZÃ€Ã‚Ã„Ã‰ÃˆÃŠÃ‹ÃŽÃÃ”Ã™Ã›ÃœÅ¸Å’Ã†][a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼Ã¿Å“Ã¦]+\s+(?:arrive|part|est\s+l[Ã a]|a\s+laiss[eÃ©])/gi, '')
        .replace(/\[|\]/g, '')
        .replace(/[â€“\-:,!?]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const fc = cleanCandidate(cleaned);
      // Rejeter si le rÃ©sultat est trop court, un verbe seul, ou du bruit pur
      if (fc.length >= 5
        && !/versement|payout|virement|envoy[eÃ©]|^\d+[,.]?\d*\s*[€$]/i.test(fc)
        && !/^(demain|aujourd|hier|arrive|part|s[eÃ©]jour|rappel|check|confirmat)$/i.test(fc.split(' ')[0])
      ) {
        return fc.slice(0, 80);
      }
    }
  }

  return undefined;
}

// Supprime le suffixe de dates collÃ© au nom du logement
// ex: "Maisonnette T2 quartier calme, 10â€“13 avr." â†’ "Maisonnette T2 quartier calme"
// ex: "Maison de ville avec petite Terrasse couverte, 11â€“15 avr." â†’ "Maison de ville avec petite Terrasse couverte"
function stripDateSuffix(s: string): string {
  return s
    // "NomLogement, 10â€“13 avr." ou "NomLogement, 10-13 avr"
    .replace(/,\s*\d{1,2}\s*[â€“\-]\s*\d{1,2}\s+\w{2,10}\.?\s*\d{0,4}\s*$/, '')
    // "NomLogement, 10 avr." ou "NomLogement, 10 avril 2026"
    .replace(/,\s*\d{1,2}\s+\w{3,10}\.?\s*\d{0,4}\s*$/, '')
    // "NomLogement, du 10 au 13 avr."
    .replace(/,\s*du\s+\d{1,2}\s+au\s+\d{1,2}\s+\w{2,10}\.?\s*$/, '')
    .trim();
}

// â”€â”€â”€ Parser principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  let jsonLdParsed: any = null;
  if (jsonLdMatch && jsonLdMatch[1]) {
    try {
      jsonLdParsed = JSON.parse(jsonLdMatch[1]);
      // Parfois c'est un tableau de schemas
      if (Array.isArray(jsonLdParsed)) {
        jsonLdParsed = jsonLdParsed.find((item: any) => item['@type'] === 'LodgingReservation' || item['@type'] === 'Reservation') || jsonLdParsed[0];
      }
    } catch (e) {
      console.warn("Ã‰chec du parsing JSON-LD Airbnb:", e);
      warnings.push("DonnÃ©es structurÃ©es (JSON-LD) illisibles.");
    }
  }

  // 1. VÃ©rifier que c'est bien un email Airbnb
  const isAirbnbSender = AIRBNB_SENDERS.some(s => from.toLowerCase().includes(s));
  const isAirbnbSubject = /airbnb/i.test(subject) || /r[eÃ©]servation/i.test(subject);
  if (!isAirbnbSender && !isAirbnbSubject) return null;

  // 1b. Ignorer les emails informatifs/maintenance/marketing â€” pas de rÃ©servation Ã  importer
  if (IGNORED_PATTERNS.some(p => p.test(subject))) return null;

  // 2. DÃ©terminer le type de mail
  let bookingType: ParsedBooking['bookingType'] = 'new';
  // PrioritÃ© : new > cancelled > modified > checkout > reminder > review > payout
  // On teste new_fr/new_en EN PREMIER pour Ã©viter qu'un email de confirmation
  // soit mal classÃ© (ex: sujet contenant "annulÃ©" dans une autre langue)
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
    // Versement standalone dans le corps (ex: "Nous avons envoyÃ© un versement")
    /nous\s+avons\s+envoy[eÃ©]\s+un\s+versement|we\s+sent\s+you\s+a\s+payout/i.test(body.slice(0, 600))
  ) bookingType = 'payout';
  else {
    // â”€â”€â”€ Fallback : dÃ©duire le type depuis les slugs URL du corps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Airbnb encode le type d'email dans les URLs de tracking (base64 ou slug).
    // ObservÃ© rÃ©el : sujet corrompu "661?c=.pi80.pkaG9tZV9yZXZpZXdzL..."
    //   â†’ dÃ©codÃ© : "home_reviews/empathetic_host_review_received" â†’ 'review'
    // Autres slugs connus :
    //   reservation_confirmation â†’ 'new'
    //   booking_cancelled        â†’ 'cancelled'
    //   host_payout / payout_sent â†’ 'payout'
    //   checkout / check_out     â†’ 'checkout'
    //   reminder / rappel_arriv  â†’ 'reminder'
    const bodySnippet = body.slice(0, 2000).toLowerCase();
      if (/home_reviews|review_received|guest.*review|avis.*re[cÃ§]u|[eÃ©]valuation.*[eÃ©]toiles|avis.*[eÃ©]toiles|has left you a review/i.test(bodySnippet)) {
      bookingType = 'review';
    } else if (/reservation_confirmation|booking_confirmation|new_reservation/i.test(bodySnippet)) {
      bookingType = 'new';
    } else if (/cancellation|booking_cancelled|reservation_cancelled/i.test(bodySnippet)) {
      bookingType = 'cancelled';
    } else if (/host_payout|payout_sent|versement/i.test(bodySnippet)) {
      bookingType = 'payout';
    } else if (/checkout|check_out|s[eÃ©]jour.*termin/i.test(bodySnippet)) {
      bookingType = 'checkout';
    } else if (/reminder|rappel.*arriv/i.test(bodySnippet)) {
      bookingType = 'reminder';
    } else {
      // Aucun type dÃ©tectÃ© ni depuis le sujet ni depuis le corps â†’ ignorer
      return null;
    }
  }

  // 3. Nettoyer le HTML si prÃ©sent
  const text = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ');

  // 4. Extraire les dates â€” PAS pour les versements (dates bancaires â‰  dates sÃ©jour)
  let checkIn: string | null = null;
  let checkOut: string | null = null;

  if (bookingType !== 'payout') {
    // Vrais formats de dates dans les emails Airbnb hÃ´te (FR) :
    //   "ArrivÃ©e : sam. 10 avr." / "ArrivÃ©e : 10 avr. 2026"
    //   "ArrivÃ©e : 10 avril 2026"
    //   "DÃ©part : mar. 13 avr."
    //   "10 avr. â€“ 13 avr." (dans le corps ou le sujet)
    //   "du 10 au 13 avril 2026"
    //   "10/04/2026" / "10-04-2026"
    //   "April 10, 2026" / "Apr 10, 2026"
    //   "samedi 10 avril 2026"
    //   "sam. 10 avr." (jour abrÃ©gÃ© + date sans annÃ©e)
    const MOIS_RE = `(?:janv?\\.?|f[eÃ©]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|juillet|ao[uÃ»]t|sept?\\.?|octobre?|nov\\.?|d[eÃ©]c\\.?|d[eÃ©]cembre?)`;
    const JOUR_RE = `(?:lun|mar|mer|jeu|ven|sam|dim|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)`;

    const checkInPatterns = [
      // "ArrivÃ©e : sam. 10 avr." / "ArrivÃ©e : 10 avr." / "ArrivÃ©e : 10 avr. 2026"
      new RegExp(`arriv[eÃ©]e?\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-in : sam. 10 avr."
      new RegExp(`check.?in\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "EntrÃ©e : 10 avr."
      new RegExp(`entr[eÃ©]e?\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec annÃ©e : "du 10/04/2026" ou "10/04/2026"
      /(?:du\s+|from\s+)?(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼]+)[\s\/\-]\d{4})/i,
      // EN "from April 10, 2026" / "from Apr 10 2026"
      /from\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /from\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage FR "10 avr. â€“ 13 avr." â†’ prendre la PREMIÃˆRE date
      new RegExp(`(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)\\s*[â€“\\-]`, 'i'),
      // Plage FR compacte "10â€“13 avr. 2026" â†’ premier nombre (checkIn)
      new RegExp(`(\\d{1,2})\\s*[â€“\\-]\\s*\\d{1,2}\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?`, 'i'),
      // Plage EN "April 10â€“13, 2026" ou "Apr 10 â€“ Apr 13, 2026" â†’ premiÃ¨re partie
      /([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /([A-Za-z]+\.?\s+\d{1,2})(?:\s*[â€“\-]\s*(?:\d{1,2}|[A-Za-z]+\.?\s+\d{1,2}),?\s+\d{4})/i,
    ];
    const checkOutPatterns = [
      // "DÃ©part : mar. 13 avr." / "DÃ©part : 13 avr."
      new RegExp(`d[eÃ©]part\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Check-out : 13 avr."
      new RegExp(`check.?out\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // "Sortie : 13 avr."
      new RegExp(`sortie\\s*[:\\-â€“]\\s*(?:${JOUR_RE}\\s+)?(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Dates avec annÃ©e : "au 13/04/2026"
      /(?:au\s+|to\s+)(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼]+)[\s\/\-]\d{4})/i,
      // EN "to April 13, 2026" / "to Apr 13 2026"
      /to\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})/i,
      /to\s+(\d{1,2}\s+[A-Za-z]+\.?\s+\d{4})/i,
      // Plage "10 avr. â€“ 13 avr." â†’ prendre la DEUXIÃˆME date (aprÃ¨s le tiret)
      new RegExp(`[â€“\\-]\\s*(\\d{1,2}\\s+${MOIS_RE}(?:\\s+\\d{4})?)`, 'i'),
      // Plage FR compacte "10â€“13 avr. 2026" â†’ second nombre + mois + annÃ©e
      new RegExp(`\\d{1,2}\\s*[â€“\\-]\\s*(\\d{1,2})\\s+(${MOIS_RE})(?:\\s+(\\d{4}))?`, 'i'),
    ];

    // Chercher d'abord dans le corps, puis dans le sujet comme fallback
    checkIn = extractDate(text, checkInPatterns) || extractDate(subject, checkInPatterns);
    checkOut = extractDate(text, checkOutPatterns) || extractDate(subject, checkOutPatterns);

    // â”€â”€ Post-traitement : plage FR compacte "10â€“13 avr. 2026" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Les patterns avec 3 groupes capturÃ©s (jour1, mois, annÃ©e) ne sont pas gÃ©rÃ©s
    // par extractDate (qui lit seulement match[1]). On les traite ici.
    if (!checkIn || !checkOut) {
      const combinedSrc = text + ' ' + subject;
      // "10â€“13 avr. 2026" / "10-13 avr. 2026" / "10 â€“ 13 avril 2026"
      const MOIS_BOTH2 = `(?:janv?\\.?|f[eÃ©]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uÃ»]t|sept?\\.?|octobre?|nov\\.?|d[eÃ©]c\\.?|d[eÃ©]cembre?)`;
      const frCompact = new RegExp(`(\\d{1,2})\\s*[â€“\\-]\\s*(\\d{1,2})\\s+(${MOIS_BOTH2}(?:\\.?))(?:\\s+(\\d{4}))?`, 'i');
      const fcm = combinedSrc.match(frCompact);
      if (fcm) {
        const day1 = fcm[1]; const day2 = fcm[2]; const mon = fcm[3]; const yr = fcm[4] || '';
        const d1 = normalizeDate(`${day1} ${mon}${yr ? ' ' + yr : ''}`);
        const d2 = normalizeDate(`${day2} ${mon}${yr ? ' ' + yr : ''}`);
        if (/^\d{4}-\d{2}-\d{2}$/.test(d1)) checkIn  = checkIn  || d1;
        if (/^\d{4}-\d{2}-\d{2}$/.test(d2)) checkOut = checkOut || d2;
      }
    }

    // Fallback : chercher dates avec ou sans annÃ©e dans texte + sujet combinÃ©s
    if (!checkIn || !checkOut) {
      const combinedText = text + ' ' + subject;
      // Dates AVEC annÃ©e
      const datesWithYear = [...combinedText.matchAll(/\b(\d{1,2}[\s\/\-](?:\d{1,2}|[a-zÃ Ã¢Ã©Ã¨ÃªÃ«Ã®Ã¯Ã´Ã¹Ã»Ã¼]+)[\s\/\-]\d{4})\b/gi)]
        .map(m => normalizeDate(m[1]))
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (datesWithYear.length >= 2) {
        checkIn  = checkIn  || datesWithYear[0];
        checkOut = checkOut || datesWithYear[1];
      }
      // Dates SANS annÃ©e : textuelles FR/EN (ex: "10 avr.", "Apr 10")
      if (!checkIn || !checkOut) {
        const MOIS_BOTH = `(?:janv?|f[eÃ©]vr?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uÃ»]t|sept?|oct|nov|dec)`;
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
      // EN compact range "April 10â€“13, 2026" / "Apr 10-13 2026"
      if (!checkOut && checkIn) {
        const compactRe = /([A-Za-z]+)\.?\s+(\d{1,2})\s*[â€“\-]\s*(\d{1,2}),?\s+(\d{4})/;
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

  // Pas de dates = email non parsable (sauf types qui n'ont pas forcÃ©ment de dates)
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
  let price               = extractPrice(text) || extractPrice(subject);
  const confirmationCode    = extractConfirmationCode(text) || extractConfirmationCode(subject);
  let guestNameExtracted  = extractGuestName(text, subject);
  let propertyNameExtracted = extractPropertyName(text, subject);
  const guestCountry        = extractGuestCountry(text);
  const guestLanguage       = detectGuestLanguage(text, subject);
  // Extraire l'ID Airbnb de l'annonce depuis le corps HTML brut (avant stripping)
  // Utile pour les emails d'avis qui ne contiennent pas le nom du logement
  const airbnbListingId     = extractAirbnbListingId(body);

  // â”€â”€ Champs financiers : selon le type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // new/modified/cancelled/reminder â†’ dÃ©tail complet des frais
  // checkout                        â†’ totalPrice uniquement (pas de dÃ©tail frais)
  // review                          â†’ aucun champ financier
  // payout                          â†’ seulement hostPayout + payoutDate/Method
  // Les emails de rappel Airbnb contiennent souvent le rÃ©capitulatif complet du sÃ©jour
  // â†’ on extrait nightlyRate/cleaningFee/serviceFee/taxAmount pour enrichir la fiche
  const isFinanceType = bookingType === 'new' || bookingType === 'modified' || bookingType === 'cancelled' || bookingType === 'reminder';
  const nightlyRate  = isFinanceType ? extractNightlyRate(text) : undefined;
  const cleaningFee  = isFinanceType ? extractCleaningFee(text) : undefined;
  const serviceFee   = isFinanceType ? extractServiceFee(text) : undefined;
  const taxAmount    = isFinanceType ? extractTaxAmount(text) : undefined;
  const hostPayout   = bookingType === 'payout' ? (extractHostPayout(text) || extractHostPayout(subject)) : undefined;

  // â”€â”€ Horaires check-in/check-out : seulement pour new/modified/reminder/checkout â”€
  const needsTimes = bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'checkout';
  const checkInTime  = (bookingType !== 'checkout') && needsTimes ? extractCheckInTime(text) : undefined;
  const checkOutTime = needsTimes ? extractCheckOutTime(text) : undefined;

  // â”€â”€ Politique annulation : new + cancelled + modified â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const cancellationPolicy  = (bookingType === 'new' || bookingType === 'cancelled' || bookingType === 'modified')
                                ? extractCancellationPolicy(text) : undefined;
  // â”€â”€ RÃ©servation instantanÃ©e : new uniquement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isInstantBook       = bookingType === 'new'
                                ? /r[eÃ©]servation\s+instantan[eÃ©]e?|instant\s+book/i.test(subject + ' ' + text.slice(0, 300))
                                : undefined;
  // â”€â”€ Versement : payout uniquement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const payoutDate          = bookingType === 'payout' ? extractPayoutDate(text) : undefined;
  const payoutMethod        = bookingType === 'payout' ? extractPayoutMethod(text) : undefined;
  // Modification : nouvelles dates proposÃ©es
  // On cherche un deuxiÃ¨me couple de dates diffÃ©rent de checkIn/checkOut courant
  let modifiedCheckIn: string | undefined;
  let modifiedCheckOut: string | undefined;
  if (bookingType === 'modified') {
    const MOIS_RE2 = `(?:janv?\\.?|f[eÃ©]vr?\\.?|mars|avr\\.?|avril|mai|juin|juil\\.?|ao[uÃ»]t|sept?\\.?|octobre?|nov\\.?|d[eÃ©]c\\.?|d[eÃ©]cembre?)`;
    const DATE_RANGE_RE = new RegExp(
      `(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)\\s*[â€“\\-]\\s*(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)`,
      'ig'
    );

    // â”€â”€ 1. Bloc "Nouvelles dates / Dates modifiÃ©es / New dates" â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const modDateBlock = text.match(
      /(?:nouvelle[s]?\s+dates?|dates?\s+modifi[eÃ©]e?s?|new\s+dates?|dates?\s+propos[eÃ©]e?s?|proposed\s+dates?)\s*[:\-â€“]\s*([^\n\r<]{5,80})/i
    );
    if (modDateBlock) {
      const block = modDateBlock[1];
      const rangeM = block.match(DATE_RANGE_RE);
      if (rangeM) {
        // RÃ©-exÃ©cuter pour capturer les groupes
        DATE_RANGE_RE.lastIndex = 0;
        const gm = DATE_RANGE_RE.exec(block);
        if (gm) {
          modifiedCheckIn  = normalizeDate(gm[1]);
          modifiedCheckOut = normalizeDate(gm[2]);
        }
      }
    }

    // â”€â”€ 2. Pattern "De X Ã  Y" / "Du X au Y" dans un contexte modification â”€â”€â”€
    if (!modifiedCheckIn) {
      const fromToRe = new RegExp(
        `(?:de|du|from)\\s+(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)\\s+(?:[Ã a]u?|to|jusqu'au)\\s+(\\d{1,2}\\s+${MOIS_RE2}(?:\\s+\\d{4})?)`,
        'i'
      );
      const ftM = text.match(fromToRe);
      if (ftM) {
        const d1 = normalizeDate(ftM[1]);
        const d2 = normalizeDate(ftM[2]);
        // Ne pas rÃ©utiliser les mÃªmes dates que checkIn/checkOut
        if (d1 !== checkIn || d2 !== checkOut) {
          modifiedCheckIn  = d1;
          modifiedCheckOut = d2;
        }
      }
    }

    // â”€â”€ 3. Toutes les plages de dates dans le texte â†’ prendre la 2e si diffÃ©rente â”€â”€
    if (!modifiedCheckIn) {
      DATE_RANGE_RE.lastIndex = 0;
      const allRanges: Array<[string, string]> = [];
      let rm: RegExpExecArray | null;
      while ((rm = DATE_RANGE_RE.exec(text)) !== null) {
        allRanges.push([normalizeDate(rm[1]), normalizeDate(rm[2])]);
      }
      // La 1Ã¨re plage = dates actuelles (checkIn/checkOut), la 2e = nouvelles dates
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
    // Code HM au format Airbnb (HMXXXXXXXX) = trÃ¨s fiable
    if (/^HM[A-Z0-9]{8,}$/i.test(confirmationCode)) confidence += 5;
  }
  // Nom de voyageur rÃ©el trouvÃ© (pas le placeholder gÃ©nÃ©rique)
  if (guestNameExtracted && guestNameExtracted !== 'Voyageur Airbnb') confidence += 5;
  // Logement identifiÃ© dans le texte
  if (propertyNameExtracted) confidence += 5;
  // Versement : confidence de base 80 (pas de dates = normal)
  if (bookingType === 'payout') {
    confidence = Math.max(confidence, isAirbnbSender ? 85 : 70);
    // +5 si montant versement trouvÃ©
    if (hostPayout && hostPayout > 0) confidence = Math.min(100, confidence + 5);
  }
  // Revue sans dates : confidence de base 60 si expÃ©diteur OK, 70 si note trouvÃ©e
  if (bookingType === 'review') {
    confidence = Math.max(confidence, isAirbnbSender ? 65 : 55);
    const rating = extractReviewRating(text, subject);
    if (rating) confidence = Math.min(100, confidence + 10);
    // Note trouvÃ©e dans le sujet = trÃ¨s fiable
    if (rating && subject.match(/\d\s*[eÃ©]toiles?|\d\s*stars?/i)) confidence = Math.min(100, confidence + 5);
  }
  // Annulation : confiance lÃ©gÃ¨rement rÃ©duite si pas de code confirmation
  if (bookingType === 'cancelled' && !confirmationCode) confidence = Math.max(50, confidence - 5);
  // Modification : confiance rÃ©duite si pas de nouvelles dates trouvÃ©es
  if (bookingType === 'modified' && !modifiedCheckIn) confidence = Math.max(50, confidence - 5);
  if (bookingType === 'modified' && modifiedCheckIn) confidence = Math.min(100, confidence + 5);
  // Rappel/checkout : confiance modÃ©rÃ©e si pas de dates
  if ((bookingType === 'reminder' || bookingType === 'checkout') && (!checkIn || !checkOut)) {
    confidence = Math.min(confidence, 65);
  }

  
    if (!propertyNameExtracted && bookingType !== 'payout' && bookingType !== 'review') warnings.push('Logement introuvable');
    if (!checkIn && bookingType !== 'payout' && bookingType !== 'review') warnings.push('Dates de sï¿½jour');
    if (price === 0 && (bookingType === 'new' || bookingType === 'modified')) warnings.push('Montant suspect (0ï¿½)');
    if (confidence < 75) warnings.push('Parser incertain (confiance < 75%)');

  // --- NOUVEAU: Surcharge depuis le JSON-LD Schema.org ---
  if (jsonLdParsed) {
    if (jsonLdParsed.checkinTime && !checkIn) {
      checkIn = jsonLdParsed.checkinTime.split('T')[0];
    }
    if (jsonLdParsed.checkoutTime && !checkOut) {
      checkOut = jsonLdParsed.checkoutTime.split('T')[0];
    }
    if (jsonLdParsed.totalPrice) {
      price = parseFloat(jsonLdParsed.totalPrice);
    }
    if (jsonLdParsed.lodgingUnit && jsonLdParsed.lodgingUnit.name) {
      propertyNameExtracted = jsonLdParsed.lodgingUnit.name;
    }
    if (jsonLdParsed.underName && jsonLdParsed.underName.name) {
      guestNameExtracted = jsonLdParsed.underName.name;
    }
  }

      return {
        warnings,
        source: 'gmail',
    messageId,
    subject: subject.slice(0, 200),
    receivedAt,

    // â”€â”€ Voyageur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Pour payout : le nom voyageur n'est pas toujours dans le corps â†’ garder undefined si gÃ©nÃ©rique
    guestName: (bookingType === 'payout' && guestNameExtracted === 'Voyageur Airbnb')
                 ? 'Voyageur Airbnb'  // on garde le placeholder pour les payout sans nom
                 : guestNameExtracted,
    // Email/tÃ©lÃ©phone : uniquement si l'email est explicitement dans le corps
    // (pas extrait pour payout oÃ¹ le corps ne contient pas les infos voyageur)
    guestEmail: bookingType !== 'payout' ? extractGuestEmail(text) : undefined,
    guestPhone: bookingType !== 'payout' ? extractGuestPhone(text) : undefined,
    guests:     bookingType !== 'payout' ? extractGuests(text, subject) : 0,
    // Pays/langue : utile pour new, modified, reminder, cancelled, checkout
    guestCountry:  (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled' || bookingType === 'checkout')
                     ? guestCountry : undefined,
    guestLanguage: (bookingType === 'new' || bookingType === 'modified' || bookingType === 'reminder' || bookingType === 'cancelled' || bookingType === 'checkout')
                     ? guestLanguage : undefined,

    // â”€â”€ SÃ©jour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    checkIn:  checkIn  ?? (bookingType === 'payout' || bookingType === 'review' ? receivedAt.split('T')[0] : (checkIn || receivedAt.split('T')[0])),
    checkOut: checkOut ?? (bookingType === 'payout' || bookingType === 'review' ? receivedAt.split('T')[0] : (checkOut || receivedAt.split('T')[0])),
    // Nuits : calculer mÃªme pour checkout/reminder si les dates sont disponibles
    nights:   (bookingType === 'payout' && !checkIn) ? 0 : nights,
    checkInTime,
    checkOutTime,

    // â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // totalPrice : pertinent pour new/modified/cancelled/checkout/reminder
    // Pour review/payout, mettre 0 (pas de prix sÃ©jour dans ces emails â€” utiliser hostPayout pour payout)
    totalPrice: (bookingType === 'review' || bookingType === 'payout') ? 0 : price,
    // Devise : chercher dans le corps HTML-strippÃ© + sujet, prioritÃ© EUR > GBP > CHF > USD
    currency:  /CHF|Fr\./i.test(text + subject) ? 'CHF'
               : (text + subject).includes('£') ? 'GBP'
               : (text + subject).includes('€') || /EUR/i.test(text + subject) ? 'EUR'
               : 'USD',
    nightlyRate,
    cleaningFee,
    serviceFee,
    taxAmount,
    // hostPayout : payout uniquement
    hostPayout,

    // â”€â”€ Versement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    payoutDate,
    payoutMethod,

    // â”€â”€ PropriÃ©tÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    propertyName:     propertyNameExtracted,
    confirmationCode,

    // â”€â”€ Statut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bookingType,
    confidence: Math.min(100, confidence),
    isInstantBook,
    cancellationPolicy,

    // â”€â”€ Modification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    modifiedCheckIn,
    modifiedCheckOut,

    // â”€â”€ Avis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    reviewRating:  bookingType === 'review' ? extractReviewRating(text, subject) : undefined,
    reviewComment: bookingType === 'review' ? extractReviewComment(text) : undefined,

    // â”€â”€ ID annonce Airbnb (depuis URL /rooms/XXXXXXXX dans le corps HTML brut) â”€
    // Permet de retrouver le logement pour les avis qui ne contiennent pas le nom
    airbnbListingId,
  };
}

// â”€â”€â”€ DÃ©codeur base64 Gmail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    // Pour multipart/alternative : prÃ©fÃ©rer text/plain (plus fiable pour le parsing)
    // puis text/html, puis rÃ©curse dans les sous-parties (ex: multipart/mixed â†’ multipart/alternative)
    const plain = payload.parts.find(p => p.mimeType === 'text/plain');
    if (plain?.body?.data) return decodeGmailBody(plain.body.data);
    const html = payload.parts.find(p => p.mimeType === 'text/html');
    if (html?.body?.data) return decodeGmailBody(html.body.data);
    // RÃ©cursif pour multipart imbriquÃ©s (multipart/mixed, multipart/related, etc.)
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

