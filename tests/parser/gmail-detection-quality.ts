/**
 * QA — Détection et tri des emails Gmail/Airbnb
 *
 * Trois sections :
 *   A. DÉTECTION — un email → le bon genre.
 *      Chaque cas marqué « ⚠️ ancien moteur » est une erreur réelle de la
 *      version précédente, conservée ici pour qu'elle ne revienne pas.
 *   B. TRI       — un lot d'emails → les bons groupes, dans les bons bacs.
 *   C. DÉJÀ TRAITÉ — une réservation en base ne doit pas être reproposée,
 *      sauf si l'email porte un changement d'état non encore appliqué.
 *
 * Lancer : npm run test:gmail-detection
 */

import { analyzeAirbnbEmail } from '../../lib/gmail-parser';
import { triage, type TriageItem } from '../../lib/gmail/triage';
import { isAlreadyHandled, type KnownBooking } from '../../lib/gmail/already-handled';
import type { EmailKind } from '../../lib/gmail/taxonomy';

const AUTO = 'Airbnb <automated@airbnb.com>';

/** Fabrique un lien Airbnb portant le slug canonique encodé, comme en vrai. */
const slugLink = (slug: string) =>
  `https://www.airbnb.fr/r/go?c=.pi80.pk${Buffer.from(slug).toString('base64')}&eu=x`;

// ════════════════════════════════════════════════════════════════════════════
// A. DÉTECTION
// ════════════════════════════════════════════════════════════════════════════

interface DetectionCase {
  name: string;
  subject: string;
  body: string;
  from?: string;
  receivedAt?: string;
  expect: EmailKind;
  /** Vrai bug de l'ancien moteur que ce cas verrouille. */
  regression?: string;
}

const RECAP = [
  'Code de confirmation : HM12AB34CD',
  'Logement entier',
  'Arrivée',
  'Départ',
  'ven. 10 avril 2026',
  'lun. 13 avril 2026',
  'Frais de service Airbnb : 18,50 €',
  'Frais de ménage : 40,00 €',
].join('\n');

const DETECTION_CASES: DetectionCase[] = [
  // ── Réservations ──────────────────────────────────────────────────────────
  {
    name: 'Nouvelle réservation FR',
    subject: 'Félicitations ! Marie a réservé votre logement.',
    body: RECAP,
    expect: 'booking_new',
  },
  {
    name: 'Nouvelle réservation EN',
    subject: 'Marie has booked your place',
    body: RECAP,
    expect: 'booking_new',
  },
  {
    name: 'Réservation avec bloc « versement de l’hôte »',
    subject: 'Réservation confirmée',
    body: RECAP + '\nVersement de l’hôte : 154,00 €\nVotre versement de 154,00 €',
    expect: 'booking_new',
    regression: 'le bloc versement du récapitulatif faisait basculer l’email en payout',
  },
  {
    name: 'Demande de réservation non acceptée',
    subject: 'Kevin a demandé à réserver votre logement',
    body: 'Vous avez 24 heures pour accepter ou refuser cette demande.',
    expect: 'booking_inquiry',
    regression: 'classée « nouvelle réservation » → créait une réservation fantôme',
  },
  {
    name: 'Modification demandée',
    subject: 'Kevin souhaite changer sa réservation',
    body: 'Nouvelles dates : 12 mai 2026 - 15 mai 2026\nAccepter la modification',
    expect: 'booking_modified',
  },
  {
    name: 'Annulation voyageur',
    subject: 'Marie a annulé sa réservation',
    body: RECAP,
    expect: 'booking_cancelled',
  },
  {
    name: 'Rappel d’arrivée',
    subject: 'Rappel : Marie arrive dans 2 jours',
    body: RECAP + '\nPréparez le logement.',
    expect: 'booking_reminder',
  },
  {
    name: 'Départ du jour',
    subject: 'Le séjour de Marie se termine aujourd’hui',
    body: RECAP,
    expect: 'booking_checkout',
  },

  // ── Avis ──────────────────────────────────────────────────────────────────
  {
    name: 'Avis reçu — sujet remplacé par l’URL de tracking',
    subject: '661?c=.pi80.pkaG9tZV9yZXZpZXdzL2VtcGF0aGV0aWNfaG9zdF9yZXZpZXdfcmVjZWl2ZWQ%3D&eu',
    body: `Marie a laissé une évaluation 5 étoiles. ${slugLink('home_reviews/empathetic_host_review_received')}`,
    expect: 'review_received',
    regression: 'sujet jugé « corrompu » → email jeté, alors que le slug donnait la réponse exacte',
  },
  {
    name: 'Avis reçu anonymisé',
    subject: 'Un voyageur a récemment laissé une évaluation 1 étoile',
    body: 'Voici son commentaire : appartement correct.',
    expect: 'review_received',
  },
  {
    name: 'Rappel « évaluez votre voyageur » — pas un avis reçu',
    subject: '4 voyageurs attendent votre commentaire',
    body: 'Il vous reste 3 jours pour évaluer vos voyageurs. Rédiger une évaluation.',
    expect: 'review_request',
    regression: 'classé « avis reçu » → créait de faux avis en base',
  },
  {
    name: 'Rappel « n’oubliez pas de noter »',
    subject: 'N’oubliez pas de noter Marie',
    body: 'Écrire une évaluation',
    expect: 'review_request',
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    name: 'Versement hôte',
    subject: 'Nous avons envoyé un versement de 63,62 €',
    body: 'Votre versement a été envoyé et arrivera sur votre compte sous 3 jours ouvrés.',
    expect: 'payout_sent',
  },
  {
    name: 'Paiement voyageur — pas un versement hôte',
    subject: 'Paiement effectué pour la réservation',
    body: 'Le paiement du voyageur de 240,00 € a été traité.',
    expect: 'guest_payment',
    regression: 'mot « paiement » + montant → classé payout, gonflait les revenus',
  },
  {
    name: 'Litige / montant proposé',
    subject: 'Vous avez proposé un montant différent à Marie',
    body: 'Votre demande via le centre de résolution a été transmise. 120,00 €',
    expect: 'dispute_claim',
  },
  {
    name: 'Demande d’argent',
    subject: 'Vous avez demandé de l’argent à Marie',
    body: 'Votre demande de 80,00 € a été envoyée.',
    expect: 'dispute_claim',
  },

  // ── Bruit ─────────────────────────────────────────────────────────────────
  {
    name: 'Politique d’annulation mise à jour — pas une annulation',
    subject: 'Mise à jour des conditions générales et de la politique d’annulation',
    body: 'Nos conditions de service évoluent au 1er juin.',
    expect: 'policy_update',
    regression: '/cancelled|annul/ attrapait ce sujet → annulait de vraies réservations',
  },
  {
    name: 'Annonce nécessitant une action',
    subject: 'Plusieurs annonces nécessitent votre attention',
    body: 'Mettez à jour vos annonces pour rester visible.',
    expect: 'listing_action',
  },
  {
    name: 'Message voyageur',
    subject: 'Vous avez un nouveau message de Marie',
    body: `Répondre au message ${slugLink('messaging/new_message')}`,
    expect: 'guest_message',
  },
  {
    name: 'Sécurité du compte',
    subject: 'Réinitialisez votre mot de passe',
    body: 'Cliquez ici pour choisir un nouveau mot de passe.',
    expect: 'account_security',
  },
  {
    name: 'Marketing hôte',
    subject: 'Conseils pour les hôtes : optimisez vos tarifs',
    from: 'Airbnb <news@airbnb.com>',
    body: 'Augmentez vos revenus cet été.',
    expect: 'marketing',
  },
  {
    name: 'Expéditeur hors Airbnb',
    subject: 'Votre réservation est confirmée',
    from: 'Booking <noreply@booking.com>',
    body: 'Merci pour votre réservation.',
    expect: 'not_airbnb',
  },
];

// ════════════════════════════════════════════════════════════════════════════
// B. TRI
// ════════════════════════════════════════════════════════════════════════════

interface TriageCase {
  name: string;
  emails: Array<{ id: string; subject: string; body: string; receivedAt: string }>;
  /** Nombre de groupes attendus après fusion. */
  expectGroups: number;
  /** Genre attendu pour le groupe principal. */
  expectPrimaryKind?: EmailKind;
  expectBucketCounts?: Partial<Record<string, number>>;
}

const CODE = 'HM55XY66ZW';
const stay = (extra = '') =>
  [
    `Code de confirmation : ${CODE}`,
    'Logement entier',
    'Arrivée',
    'Départ',
    'ven. 10 avril 2026',
    'lun. 13 avril 2026',
    'Frais de service Airbnb : 18,50 €',
    extra,
  ].join('\n');

const TRIAGE_CASES: TriageCase[] = [
  {
    name: 'Un même séjour suivi sur 4 emails → 1 seul groupe',
    emails: [
      { id: 'm1', subject: 'Félicitations ! Marie a réservé votre logement.', body: stay(), receivedAt: '2026-03-01T09:00:00.000Z' },
      { id: 'm2', subject: 'Rappel : Marie arrive dans 2 jours', body: stay('Préparez le logement.'), receivedAt: '2026-04-08T09:00:00.000Z' },
      { id: 'm3', subject: 'Le séjour de Marie se termine aujourd’hui', body: stay(), receivedAt: '2026-04-13T09:00:00.000Z' },
      { id: 'm4', subject: 'Marie a annulé sa réservation', body: stay(), receivedAt: '2026-04-14T09:00:00.000Z' },
    ],
    expectGroups: 1,
    // L'annulation prime sur le rappel et le départ, quel que soit l'ordre d'arrivée.
    expectPrimaryKind: 'booking_cancelled',
  },
  {
    name: 'Séjour + versement → 2 groupes (facettes distinctes)',
    emails: [
      { id: 'p1', subject: 'Félicitations ! Marie a réservé votre logement.', body: stay(), receivedAt: '2026-03-01T09:00:00.000Z' },
      { id: 'p2', subject: 'Nous avons envoyé un versement de 154,00 €', body: `Votre versement a été envoyé. Réservation ${CODE}`, receivedAt: '2026-04-15T09:00:00.000Z' },
    ],
    expectGroups: 2,
  },
  {
    name: 'Les emails informatifs partent en bac « informatif », pas à la poubelle',
    emails: [
      { id: 'i1', subject: 'Conseils pour les hôtes : optimisez vos tarifs', body: 'Augmentez vos revenus.', receivedAt: '2026-04-01T09:00:00.000Z' },
      { id: 'i2', subject: '4 voyageurs attendent votre commentaire', body: 'Rédiger une évaluation', receivedAt: '2026-04-02T09:00:00.000Z' },
      { id: 'i3', subject: 'Vous avez un nouveau message de Marie', body: 'Répondre au message', receivedAt: '2026-04-03T09:00:00.000Z' },
    ],
    expectGroups: 3,
    expectBucketCounts: { informational: 3, to_import: 0 },
  },
  {
    name: 'Doublon Gmail (même messageId vu par 2 requêtes) → dédupliqué',
    emails: [
      { id: 'd1', subject: 'Félicitations ! Marie a réservé votre logement.', body: stay(), receivedAt: '2026-03-01T09:00:00.000Z' },
      { id: 'd1', subject: 'Félicitations ! Marie a réservé votre logement.', body: stay(), receivedAt: '2026-03-01T09:00:00.000Z' },
    ],
    expectGroups: 1,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// Exécution
// ════════════════════════════════════════════════════════════════════════════

let failed = 0;
let passed = 0;

function fail(msg: string) {
  failed++;
  console.log(`❌ ${msg}`);
}
function ok(msg: string) {
  passed++;
  console.log(`✅ ${msg}`);
}

console.log('\n═══ A. DÉTECTION ═══\n');
for (const c of DETECTION_CASES) {
  const res = analyzeAirbnbEmail(
    `id_${c.name}`,
    c.subject,
    c.from ?? AUTO,
    c.body,
    c.receivedAt ?? '2026-04-01T10:00:00.000Z',
  );
  const line = `${c.name} → ${res.kind} (${res.classification.confidence}%, ${res.classification.verdict})`;
  if (res.kind === c.expect) {
    ok(line);
  } else {
    fail(`${line} — ATTENDU ${c.expect}`);
    console.log(`     scores: ${JSON.stringify(res.classification.scores)}`);
    if (c.regression) console.log(`     régression re-ouverte : ${c.regression}`);
  }
}

console.log('\n═══ B. TRI ═══\n');
for (const c of TRIAGE_CASES) {
  const items: TriageItem[] = c.emails.map((e) =>
    analyzeAirbnbEmail(e.id, e.subject, AUTO, e.body, e.receivedAt).triageItem,
  );
  const result = triage(items);

  if (result.groups.length !== c.expectGroups) {
    fail(`${c.name} — ${result.groups.length} groupe(s), attendu ${c.expectGroups}`);
    for (const g of result.groups) {
      console.log(`     ${g.key} [${g.bucket}] ${g.kind} ×${g.items.length} (${g.identityBasis})`);
    }
    continue;
  }

  if (c.expectPrimaryKind) {
    const main = result.groups.find((g) => g.items.length > 1) ?? result.groups[0];
    if (main.kind !== c.expectPrimaryKind) {
      fail(`${c.name} — genre principal ${main.kind}, attendu ${c.expectPrimaryKind}`);
      continue;
    }
  }

  if (c.expectBucketCounts) {
    const mismatch = Object.entries(c.expectBucketCounts).find(
      ([bucket, n]) => result.stats.byBucket[bucket as keyof typeof result.stats.byBucket] !== n,
    );
    if (mismatch) {
      fail(`${c.name} — bac ${mismatch[0]} : ${JSON.stringify(result.stats.byBucket)}`);
      continue;
    }
  }

  ok(`${c.name} — ${result.groups.length} groupe(s), ${result.stats.merged} email(s) fusionné(s)`);
}

console.log('\n=== C. RESERVATIONS DEJA TRAITEES ===\n');

// L'import n'enregistre qu'un `externalId` par groupe. Les autres emails du
// groupe reviennent au scan suivant et reproposent la meme reservation.
// Ce garde-fou dedoublonne sur l'identite de la RESERVATION, pas de l'email.
type KnownCase = {
  name: string;
  kind: EmailKind;
  code?: string;
  checkIn?: string;
  checkOut?: string;
  known: KnownBooking[];
  expectHandled: boolean;
};

const CODE_KNOWN = 'HM11AA22BB';
const confirmed: KnownBooking[] = [
  { status: 'confirmed', confirmationCode: CODE_KNOWN, checkIn: '2026-04-10', checkOut: '2026-04-13' },
];
const cancelledInDb: KnownBooking[] = [
  { status: 'cancelled', confirmationCode: CODE_KNOWN, checkIn: '2026-04-10', checkOut: '2026-04-13' },
];

const KNOWN_CASES: KnownCase[] = [
  { name: 'Confirmation deja en base -> ecartee', kind: 'booking_new', code: CODE_KNOWN, known: confirmed, expectHandled: true },
  { name: 'Rappel d une reservation deja en base -> ecarte', kind: 'booking_reminder', code: CODE_KNOWN, known: confirmed, expectHandled: true },
  { name: 'Depart d une reservation deja en base -> ecarte', kind: 'booking_checkout', code: CODE_KNOWN, known: confirmed, expectHandled: true },
  { name: 'Annulation d une reservation ENCORE confirmee -> doit passer', kind: 'booking_cancelled', code: CODE_KNOWN, known: confirmed, expectHandled: false },
  { name: 'Annulation deja appliquee -> ecartee', kind: 'booking_cancelled', code: CODE_KNOWN, known: cancelledInDb, expectHandled: true },
  {
    name: 'Modification vers de nouvelles dates -> doit passer',
    kind: 'booking_modified', code: CODE_KNOWN, checkIn: '2026-05-01', checkOut: '2026-05-04',
    known: confirmed, expectHandled: false,
  },
  {
    name: 'Modification deja appliquee -> ecartee',
    kind: 'booking_modified', code: CODE_KNOWN, checkIn: '2026-04-10', checkOut: '2026-04-13',
    known: confirmed, expectHandled: true,
  },
  { name: 'Avis rattache a une reservation connue -> doit passer', kind: 'review_received', code: CODE_KNOWN, known: confirmed, expectHandled: false },
  { name: 'Versement rattache a une reservation connue -> doit passer', kind: 'payout_sent', code: CODE_KNOWN, known: confirmed, expectHandled: false },
  { name: 'Reservation inconnue -> doit passer', kind: 'booking_new', code: 'HM99ZZ88YY', known: confirmed, expectHandled: false },
  { name: 'Sans code de confirmation -> jamais ecartee', kind: 'booking_new', known: confirmed, expectHandled: false },
];

for (const c of KNOWN_CASES) {
  const res = isAlreadyHandled(
    { kind: c.kind, confirmationCode: c.code, checkIn: c.checkIn, checkOut: c.checkOut },
    c.known,
    (b, code) => (b.confirmationCode ?? '').toUpperCase() === code,
  );
  if (res.handled === c.expectHandled) {
    ok(`${c.name}${res.reason ? ` - ${res.reason}` : ''}`);
  } else {
    fail(`${c.name} - handled=${res.handled}, attendu ${c.expectHandled}`);
  }
}

console.log('\n═══ RÉSULTAT ═══');
console.log(`Réussis : ${passed}`);
console.log(`Échoués : ${failed}`);
const regressionsLocked = DETECTION_CASES.filter((c) => c.regression).length;
console.log(`Régressions verrouillées : ${regressionsLocked}`);

if (failed > 0) process.exit(1);
console.log('\n🎉 Détection et tri conformes.');
