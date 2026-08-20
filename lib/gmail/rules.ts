/**
 * 📏 Règles de classification — déclaratives et pondérées
 *
 * ════════════════════════════════════════════════════════════════════════════
 * CE QUI CHANGE PAR RAPPORT À L'ANCIEN MOTEUR
 * ════════════════════════════════════════════════════════════════════════════
 *
 * AVANT — premier match gagne, dans un ordre de type figé :
 *   new > cancelled > modified > checkout > reminder > review > payout
 *   Conséquence : une seule règle trop large dans un groupe prioritaire
 *   capturait tout. `/check.?out/i` attrapait n'importe quel sujet contenant
 *   « checkout ». `/dans \d+ jours?/i` attrapait « Versement dans 3 jours ».
 *   `/cancelled/i` attrapait « Politique d'annulation mise à jour ».
 *
 * APRÈS — chaque règle vote avec un poids, on prend le meilleur score et on
 *   mesure l'écart avec le second. Une règle faible ne peut plus, à elle
 *   seule, l'emporter sur un faisceau de signaux forts. Et quand deux genres
 *   sont au coude-à-coude, l'email part en « à vérifier » au lieu d'être
 *   rangé au hasard.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * ÉCRITURE DES MOTIFS
 * ════════════════════════════════════════════════════════════════════════════
 * Les motifs `subject` et `body` sont testés contre le texte REPLIÉ :
 * minuscules, sans accents (voir `text.fold`). On écrit donc `reservation`,
 * jamais `r[eé]servation`. Fini les classes de caractères illisibles.
 */

import type { EmailKind } from './taxonomy';

export type RuleScope = 'slug' | 'subject' | 'body';

export interface ClassificationRule {
  /** Identifiant stable, affiché dans l'UI pour expliquer la décision. */
  id: string;
  kind: EmailKind;
  scope: RuleScope;
  re: RegExp;
  weight: number;
  /** Explication lisible, montrée à l'utilisateur dans le détail du tri. */
  why: string;
}

// ─── Barème d'autorité ───────────────────────────────────────────────────────
// Un slug canonique Airbnb est une preuve ; une formule marketing est un indice.

export const W = {
  /** Slug canonique décodé — vérité terrain Airbnb. */
  SLUG: 100,
  /** Formule de sujet sans ambiguïté possible. */
  SUBJECT_STRONG: 55,
  /** Formule de sujet caractéristique mais réutilisée ailleurs. */
  SUBJECT_MEDIUM: 32,
  /** Mot-clé isolé dans le sujet — indice, jamais preuve. */
  SUBJECT_WEAK: 14,
  /** Formule de corps caractéristique. */
  BODY_STRONG: 30,
  BODY_MEDIUM: 17,
  BODY_WEAK: 8,
  /**
   * Slug de « chrome » : pied de page, menu, préférences. Présent dans TOUS
   * les emails Airbnb, y compris transactionnels — donc jamais décisif.
   */
  SLUG_CHROME: 42,
} as const;

// ════════════════════════════════════════════════════════════════════════════
// 1. RÈGLES SLUG — la vérité terrain
// ════════════════════════════════════════════════════════════════════════════
// Testées contre la concaténation des slugs décodés, ex :
//   "home_reviews/empathetic_host_review_received"

export const SLUG_RULES: ClassificationRule[] = [
  // ── Avis ──────────────────────────────────────────────────────────────────
  { id: 'slug.review_received', kind: 'review_received', scope: 'slug', weight: W.SLUG,
    re: /review_received|host_review_received|review_left|guest_left_review|review_published/,
    why: 'Slug Airbnb : avis reçu' },
  { id: 'slug.review_request', kind: 'review_request', scope: 'slug', weight: W.SLUG,
    re: /review_reminder|write_review|review_request|request_review|prompt_review|review_nudge/,
    why: "Slug Airbnb : demande d'évaluation adressée à l'hôte" },

  // ── Réservation ───────────────────────────────────────────────────────────
  { id: 'slug.booking_new', kind: 'booking_new', scope: 'slug', weight: W.SLUG,
    re: /booking_confirm|reservation_confirm|new_reservation|new_booking|booking_accepted|reservation_accepted|instant_book(?:ing)?_confirm/,
    why: 'Slug Airbnb : réservation confirmée' },
  { id: 'slug.booking_inquiry', kind: 'booking_inquiry', scope: 'slug', weight: W.SLUG,
    re: /inquiry|pre_?approval|request_to_book|booking_request(?!_accepted)/,
    why: 'Slug Airbnb : demande de réservation' },
  { id: 'slug.booking_modified', kind: 'booking_modified', scope: 'slug', weight: W.SLUG,
    re: /alteration|reservation_change|booking_change|change_request|reservation_modif/,
    why: 'Slug Airbnb : modification de réservation' },
  { id: 'slug.booking_cancelled', kind: 'booking_cancelled', scope: 'slug', weight: W.SLUG,
    re: /cancell?ation(?!_polic)|cancell?ed|reservation_cancel|booking_cancel/,
    why: 'Slug Airbnb : annulation' },
  { id: 'slug.booking_checkout', kind: 'booking_checkout', scope: 'slug', weight: W.SLUG,
    re: /check_?out|checkout_|departure|trip_complet|stay_complet/,
    why: 'Slug Airbnb : départ / fin de séjour' },
  { id: 'slug.booking_reminder', kind: 'booking_reminder', scope: 'slug', weight: W.SLUG,
    re: /check_?in_reminder|upcoming_(?:trip|reservation|arrival)|pre_?check_?in|arrival_reminder|guest_arriving/,
    why: "Slug Airbnb : rappel d'arrivée" },

  // ── Finance ───────────────────────────────────────────────────────────────
  { id: 'slug.payout_sent', kind: 'payout_sent', scope: 'slug', weight: W.SLUG,
    re: /payout|host_remittance|payment_sent_to_host|disbursement/,
    why: 'Slug Airbnb : versement hôte' },
  { id: 'slug.guest_payment', kind: 'guest_payment', scope: 'slug', weight: W.SLUG,
    re: /guest_payment|payment_received|payment_confirm|charge_success/,
    why: 'Slug Airbnb : paiement voyageur' },
  { id: 'slug.dispute', kind: 'dispute_claim', scope: 'slug', weight: W.SLUG,
    re: /resolution_cent|aircover|damage_claim|reimbursement|dispute|claim_/,
    why: 'Slug Airbnb : litige / réclamation' },

  // ── Bruit ─────────────────────────────────────────────────────────────────
  { id: 'slug.message', kind: 'guest_message', scope: 'slug', weight: W.SLUG_CHROME,
    re: /new_message|message_received|thread_message|messaging\//,
    why: 'Slug Airbnb : message voyageur' },
  { id: 'slug.listing_action', kind: 'listing_action', scope: 'slug', weight: W.SLUG_CHROME,
    re: /listing_(?:action|attention|update|issue)|attention_required/,
    why: 'Slug Airbnb : action requise sur une annonce' },
  { id: 'slug.account', kind: 'account_security', scope: 'slug', weight: W.SLUG_CHROME,
    re: /account_|password|login_|security_|verification/,
    why: 'Slug Airbnb : compte / sécurité' },
  { id: 'slug.policy', kind: 'policy_update', scope: 'slug', weight: W.SLUG_CHROME,
    re: /terms_|policy_update|tos_update/,
    why: 'Slug Airbnb : mise à jour des conditions' },
  { id: 'slug.marketing', kind: 'marketing', scope: 'slug', weight: W.SLUG_CHROME,
    re: /marketing|newsletter|promo|host_tips|superhost|engagement_/,
    why: 'Slug Airbnb : marketing' },
];

// ════════════════════════════════════════════════════════════════════════════
// 2. RÈGLES SUJET
// ════════════════════════════════════════════════════════════════════════════

export const SUBJECT_RULES: ClassificationRule[] = [
  // ── Nouvelle réservation ──────────────────────────────────────────────────
  { id: 'subj.new.reserve_votre_logement', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba reserve (?:votre|le) logement\b|\ba reserve chez vous\b/,
    why: '« a réservé votre logement »' },
  { id: 'subj.new.has_booked', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bhas booked your (?:place|home|listing)\b|\bhas reserved your\b/,
    why: '« has booked your place »' },
  { id: 'subj.new.reservation_confirmee', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\breservation confirmee\b|\breservation confirmed\b|\bbooking confirmed\b/,
    why: '« réservation confirmée »' },
  { id: 'subj.new.confirmation_de_reservation', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bconfirmation de reservation\b|\bbooking confirmation\b/,
    why: '« confirmation de réservation »' },
  { id: 'subj.new.demande_acceptee', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bdemande de reservation acceptee\b|\breservation request accepted\b|\breservation acceptee\b/,
    why: 'Demande de réservation acceptée' },
  { id: 'subj.new.nouvelle_reservation', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bnouvelle reservation\b|\bnew reservation\b|\bnew booking\b/,
    why: '« nouvelle réservation »' },
  { id: 'subj.new.instantanee', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\breservation instantanee\b|\binstant book(?:ing)?\b/,
    why: 'Réservation instantanée' },
  { id: 'subj.new.felicitations', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bfelicitations\b[\s\S]{0,40}\breserv/,
    why: '« Félicitations … réservé »' },
  { id: 'subj.new.reservation_pour_dates', kind: 'booking_new', scope: 'subject', weight: W.SUBJECT_WEAK,
    re: /\breservation pour .{3,60},?\s*\d{1,2}\s*[-–]/,
    why: '« Réservation pour <logement>, <dates> »' },

  // ── Demande de réservation (PAS une réservation) ──────────────────────────
  // L'ancien moteur rangeait « a demandé à réserver » dans `new`. C'est faux :
  // rien n'est confirmé, importer créerait une réservation fantôme.
  { id: 'subj.inquiry.demande_a_reserver', kind: 'booking_inquiry', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba demande a reserver\b|\bsouhaite reserver\b|\bwants to book\b|\brequest to book\b/,
    why: 'Demande de réservation non confirmée' },
  { id: 'subj.inquiry.demande_info', kind: 'booking_inquiry', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bdemande d.informations?\b|\bnouvelle demande\b|\binquiry\b/,
    why: 'Demande de renseignements' },

  // ── Annulation ────────────────────────────────────────────────────────────
  { id: 'subj.cancel.a_annule', kind: 'booking_cancelled', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba annule (?:sa |la |cette )?reservation\b|\ba annule son sejour\b/,
    why: '« a annulé sa réservation »' },
  { id: 'subj.cancel.reservation_annulee', kind: 'booking_cancelled', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\breservation annulee\b|\bannulation de (?:la )?reservation\b|\bbooking cancell?ed\b|\breservation cancell?ed\b/,
    why: '« réservation annulée »' },
  // « annulation » seul est faible : « politique d'annulation » n'est pas une annulation.
  { id: 'subj.cancel.mot_seul', kind: 'booking_cancelled', scope: 'subject', weight: W.SUBJECT_WEAK,
    re: /\bannulee?\b|\bcancell?ed\b|\bcancellation\b/,
    why: 'Mot « annulation » dans le sujet' },

  // ── Modification ──────────────────────────────────────────────────────────
  { id: 'subj.mod.a_modifie', kind: 'booking_modified', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba (?:modifie|change) (?:sa |la )?reservation\b/,
    why: '« a modifié sa réservation »' },
  { id: 'subj.mod.souhaite_changer', kind: 'booking_modified', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\b(?:souhaite|veut|aimerait) (?:changer|modifier) (?:sa |la )?reservation\b|\bwants to change (?:their )?(?:reservation|booking)\b/,
    why: '« souhaite changer sa réservation »' },
  { id: 'subj.mod.demande_modification', kind: 'booking_modified', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bdemande de (?:modification|changement)\b|\balteration request\b|\bmodification de reservation\b|\bchangement de reservation\b/,
    why: 'Demande de modification' },
  { id: 'subj.mod.reservation_modifiee', kind: 'booking_modified', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\breservation (?:modifiee|mise a jour)\b|\bbooking (?:modified|updated)\b/,
    why: '« réservation modifiée »' },

  // ── Départ ────────────────────────────────────────────────────────────────
  { id: 'subj.out.sejour_se_termine', kind: 'booking_checkout', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bsejour de .{1,40} se termine\b|\bsejour se termine\b/,
    why: '« le séjour de X se termine »' },
  { id: 'subj.out.part_aujourdhui', kind: 'booking_checkout', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bpart aujourd'hui\b|\bs'en va aujourd'hui\b|\bis checking out (?:today)?\b|\bchecking out today\b/,
    why: '« part aujourd’hui »' },
  { id: 'subj.out.depart_de', kind: 'booking_checkout', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bdepart de [a-z]/,
    why: '« départ de X »' },
  { id: 'subj.out.sejour_termine', kind: 'booking_checkout', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bsejour termine\b|\bvoyage termine\b|\btrip completed\b|\bstay completed\b/,
    why: 'Séjour terminé' },
  // `checkout` isolé est un mot fourre-tout : poids minimal.
  { id: 'subj.out.mot_seul', kind: 'booking_checkout', scope: 'subject', weight: W.SUBJECT_WEAK,
    re: /\bcheck-?out\b/,
    why: 'Mot « checkout » dans le sujet' },

  // ── Rappel d'arrivée ──────────────────────────────────────────────────────
  { id: 'subj.rem.arrive_bientot', kind: 'booking_reminder', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\barrive (?:demain|aujourd'hui|dans \d+ jours?|bientot)\b|\barriv(?:es|ing) (?:tomorrow|today|in \d+ days?)\b/,
    why: '« arrive demain / dans N jours »' },
  { id: 'subj.rem.preparez_arrivee', kind: 'booking_reminder', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\b(?:avez-vous |etes-vous )?(?:tout )?prepare.{0,20}(?:pour )?l'arrivee\b|\bpreparez.{0,20}arrivee\b|\bget ready for\b/,
    why: '« avez-vous tout préparé pour l’arrivée »' },
  { id: 'subj.rem.prochaine_arrivee', kind: 'booking_reminder', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bprochaine? arrivee\b|\bprochain sejour\b|\bupcoming (?:stay|arrival|reservation)\b/,
    why: 'Prochaine arrivée' },
  // « Rappel : » doit être suivi d'un contexte séjour, sinon c'est n'importe quoi.
  { id: 'subj.rem.rappel_sejour', kind: 'booking_reminder', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\brappel\s*[:\-][^\n]{0,50}\b(?:arriv|sejour|check|voyage|reservation)/,
    why: '« Rappel : … arrivée/séjour »' },

  // ── Avis reçu ─────────────────────────────────────────────────────────────
  { id: 'subj.rev.a_laisse_evaluation', kind: 'review_received', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba (?:recemment )?laisse (?:une?|son) (?:evaluation|avis|commentaire)\b|\bvous a laisse une? (?:evaluation|avis)\b/,
    why: '« a laissé une évaluation »' },
  { id: 'subj.rev.left_review', kind: 'review_received', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bleft (?:you )?an? (?:review|rating|evaluation)\b|\bhas reviewed\b|\breviewed their stay\b/,
    why: '« left you a review »' },
  { id: 'subj.rev.a_evalue', kind: 'review_received', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\ba (?:evalue|note) (?:votre|le) (?:logement|sejour|annonce)\b|\brated your (?:place|listing|home)\b/,
    why: '« a évalué votre logement »' },
  { id: 'subj.rev.etoiles', kind: 'review_received', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\b\d\s*(?:etoiles?|stars?)\b/,
    why: 'Note en étoiles dans le sujet' },
  { id: 'subj.rev.nouvel_avis', kind: 'review_received', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bnouvel? (?:avis|evaluation)\b|\bnew review\b|\bavis recu\b|\breview received\b/,
    why: 'Nouvel avis' },

  // ── Demande d'évaluation adressée à l'hôte (≠ avis reçu) ──────────────────
  // Le piège le plus coûteux de l'ancien moteur : ces emails contiennent
  // « évaluation » et « voyageur », donc ils tombaient dans `review`.
  { id: 'subj.revreq.attend_commentaire', kind: 'review_request', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\battend(?:ent)? votre (?:commentaire|evaluation|avis)\b|\bvoyageurs? attend/,
    why: '« X attend votre commentaire » — c’est à VOUS d’évaluer' },
  { id: 'subj.revreq.notez_voyageur', kind: 'review_request', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\b(?:notez|evaluez) (?:votre )?voyageur\b|\brate your guest\b|\breview your guest\b/,
    why: '« notez votre voyageur »' },
  { id: 'subj.revreq.noubliez_pas', kind: 'review_request', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bn'oubliez pas de (?:noter|evaluer|laisser)\b|\bdon't forget to review\b|\bwrite a review\b|\blaissez un commentaire\b/,
    why: 'Rappel : rédiger une évaluation' },

  // ── Versement hôte ────────────────────────────────────────────────────────
  { id: 'subj.pay.versement_envoye', kind: 'payout_sent', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bnous avons envoye un versement\b|\bvotre versement de\b|\bwe sent you a payout\b|\byour payout of\b/,
    why: '« nous avons envoyé un versement »' },
  { id: 'subj.pay.versement_montant', kind: 'payout_sent', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bversement de [\d ,.]+\s*(?:eur|usd|gbp|[€$£])/,
    why: 'Versement avec montant' },
  { id: 'subj.pay.virement', kind: 'payout_sent', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bvirement (?:effectue|envoye|bancaire)\b|\breglement effectue\b|\bpayout sent\b/,
    why: 'Virement effectué' },
  { id: 'subj.pay.mot_seul', kind: 'payout_sent', scope: 'subject', weight: W.SUBJECT_WEAK,
    re: /\bversement\b|\bpayout\b/,
    why: 'Mot « versement » dans le sujet' },

  // ── Paiement voyageur (≠ versement hôte) ──────────────────────────────────
  { id: 'subj.guestpay.effectue', kind: 'guest_payment', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bpaiement (?:effectue|recu|valide) (?:pour|de) (?:la )?reservation\b|\bpayment (?:received|confirmed|processed) for\b/,
    why: '« paiement effectué pour la réservation » — côté voyageur' },
  { id: 'subj.guestpay.confirmation', kind: 'guest_payment', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bconfirmation de paiement\b|\bvotre paiement a ete\b|\bpayment confirmation\b/,
    why: 'Confirmation de paiement' },

  // ── Litiges ───────────────────────────────────────────────────────────────
  { id: 'subj.disp.montant_different', kind: 'dispute_claim', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bpropose un montant different\b|\boffered a different amount\b/,
    why: 'Négociation de montant' },
  { id: 'subj.disp.demande_argent', kind: 'dispute_claim', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bdemande de l'argent a\b|\bavez demande de l'argent\b|\brequested money from\b/,
    why: "Demande d'argent" },
  { id: 'subj.disp.remboursement', kind: 'dispute_claim', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bdemande de remboursement\b|\bremboursement demande\b|\breimbursement request\b|\brefund request\b/,
    why: 'Demande de remboursement' },
  { id: 'subj.disp.sinistre', kind: 'dispute_claim', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\baircover\b|\bdommages? signales?\b|\bdamage claim\b|\bcentre de resolution\b|\bresolution center\b|\bsinistre\b|\blitige\b/,
    why: 'Sinistre / litige / AirCover' },

  // ── Messagerie ────────────────────────────────────────────────────────────
  { id: 'subj.msg.nouveau_message', kind: 'guest_message', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bnouveau message\b|\bvous a envoye un message\b|\ba repondu a votre message\b|\bnew message from\b|\bsent you a message\b|\breplied to your message\b/,
    why: 'Message voyageur' },

  // ── Annonces / compte / conditions / marketing ────────────────────────────
  { id: 'subj.listing.attention', kind: 'listing_action', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bannonces? necessitent? votre attention\b|\baction requise sur votre annonce\b|\bvotre attention est requise\b|\blisting requires your attention\b|\baction required\b/,
    why: 'Action requise sur une annonce' },
  { id: 'subj.listing.mise_a_jour', kind: 'listing_action', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bmettez a jour votre annonce\b|\bmise a jour de votre annonce\b|\bupdate your listing\b/,
    why: 'Mise à jour d’annonce demandée' },
  { id: 'subj.account.securite', kind: 'account_security', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bconnexion a votre compte\b|\breinitialisez votre mot de passe\b|\bverifiez votre adresse\b|\breset your password\b|\bverify your email\b|\bsign ?in to your account\b/,
    why: 'Compte / sécurité' },
  { id: 'subj.policy.conditions', kind: 'policy_update', scope: 'subject', weight: W.SUBJECT_STRONG,
    re: /\bmise a jour des conditions\b|\bconditions d'utilisation\b|\bconditions generales\b|\bterms of service\b|\bpolicy update\b|\bpolitique de remuneration\b/,
    why: 'Conditions / politique' },
  { id: 'subj.mkt.conseils', kind: 'marketing', scope: 'subject', weight: W.SUBJECT_MEDIUM,
    re: /\bconseils? pour les hotes?\b|\bressources? pour les hotes?\b|\bhost tips?\b|\bsuperhote?\b|\bsuperhost\b|\bameliorez votre annonce\b|\baugmentez vos revenus\b|\boptimisez vos tarifs\b/,
    why: 'Marketing / conseils hôtes' },
];

// ════════════════════════════════════════════════════════════════════════════
// 3. RÈGLES CORPS
// ════════════════════════════════════════════════════════════════════════════
// Filet de sécurité quand le sujet est vide, tronqué ou corrompu par une URL.

export const BODY_RULES: ClassificationRule[] = [
  // Un code de confirmation dit « cet email parle d une reservation », pas
  // « c est une nouvelle reservation » : annulations, rappels et departs en
  // portent un aussi. Poids modere, sinon il ecrase les autres genres.
  { id: 'body.new.recap_complet', kind: 'booking_new', scope: 'body', weight: W.BODY_MEDIUM,
    re: /code de confirmation\s*:?\s*hm[a-z0-9]{6,12}/,
    why: 'Code de confirmation dans un récapitulatif' },
  { id: 'body.new.revenus_sejour', kind: 'booking_new', scope: 'body', weight: W.BODY_MEDIUM,
    re: /vos revenus pour ce sejour|you earn|votre versement pour ce sejour/,
    why: '« vos revenus pour ce séjour »' },
  { id: 'body.cancel.rembourse', kind: 'booking_cancelled', scope: 'body', weight: W.BODY_MEDIUM,
    re: /cette reservation (?:a ete|est) annulee|reservation has been cancell?ed|le voyageur a annule/,
    why: 'Corps : réservation annulée' },
  { id: 'body.mod.nouvelles_dates', kind: 'booking_modified', scope: 'body', weight: W.BODY_STRONG,
    re: /nouvelles? dates?\s*:|dates? modifiees?\s*:|proposed (?:new )?dates?\s*:|accepter la modification/,
    why: 'Bloc « nouvelles dates »' },
  { id: 'body.rev.commentaire', kind: 'review_received', scope: 'body', weight: W.BODY_MEDIUM,
    re: /a ecrit\s*:|voici (?:son|le) commentaire|son evaluation|wrote\s*:/,
    why: 'Corps : commentaire d’évaluation' },
  { id: 'body.revreq.rediger', kind: 'review_request', scope: 'body', weight: W.BODY_MEDIUM,
    re: /rediger (?:une|votre) evaluation|ecrire une evaluation|il vous reste \d+ jours pour evaluer/,
    why: 'Corps : rédigez votre évaluation' },
  { id: 'body.pay.versement_envoye', kind: 'payout_sent', scope: 'body', weight: W.BODY_STRONG,
    re: /nous avons envoye un versement|we sent you a payout|votre versement a ete envoye|arrivera sur votre compte/,
    why: 'Corps : versement envoyé' },
  { id: 'body.out.espere_sejour', kind: 'booking_checkout', scope: 'body', weight: W.BODY_MEDIUM,
    re: /le sejour de .{1,40} se termine|est parti aujourd'hui|a quitte votre logement/,
    why: 'Corps : fin de séjour' },
  { id: 'body.rem.preparer', kind: 'booking_reminder', scope: 'body', weight: W.BODY_MEDIUM,
    re: /arrive dans \d+ jours?|prepare[rz]? (?:le |votre )?logement|arrivee prevue/,
    why: 'Corps : arrivée imminente' },
  { id: 'body.msg.repondre', kind: 'guest_message', scope: 'body', weight: W.BODY_MEDIUM,
    re: /repondre au message|repondez a .{1,30} dans les/,
    why: 'Corps : répondre au message' },
];

export const ALL_RULES: ClassificationRule[] = [...SLUG_RULES, ...SUBJECT_RULES, ...BODY_RULES];
