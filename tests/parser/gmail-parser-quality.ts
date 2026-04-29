import { parseAirbnbEmail } from '../../lib/gmail-parser';

type Expected = {
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  minConfidence?: number;
  hasConfirmationCode?: boolean;
  hasProperty?: boolean;
  minTotalPrice?: number;
  minHostPayout?: number;
  minGuests?: number;
  requiresDates?: boolean;
  expectedCheckIn?: string;
  expectedCheckOut?: string;
  expectedNights?: number;
  expectedGuestNameIncludes?: string[];
};

type Case = {
  name: string;
  messageId: string;
  subject: string;
  from: string;
  body: string;
  receivedAt: string;
  expected: Expected;
};

const CASES: Case[] = [
  {
    name: 'NEW_FR_complete',
    messageId: 'msg_new_001',
    subject: 'Félicitations ! Marie a réservé votre logement.',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-04-10T08:12:00.000Z',
    body: [
      'Code de confirmation : HM12AB34CD',
      'Réservation pour Maison de ville avec petite terrasse couverte, 10–13 avr.',
      'Arrivée : 10 avril 2026',
      'Départ : 13 avril 2026',
      '2 adultes, 1 enfant, 1 bébé',
      'Vos revenus pour ce séjour : 154,00 €',
      'Frais de service Airbnb : 18,50 €',
      'Taxes : 4,00 €',
      'Prix par nuit : 65,00 €',
      'Heure d\'arrivée : 15:00',
      'Heure de départ : 11:00',
      'https://www.airbnb.fr/rooms/12345678',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 75,
      hasConfirmationCode: true,
      hasProperty: true,
      minTotalPrice: 100,
      minGuests: 2,
      requiresDates: true,
    },
  },
  {
    name: 'NEW_FR_subject_invisible_unicode_guest_name',
    messageId: 'msg_new_unicode_001',
    subject: 'Réservation confirmée : ⁨Marie-⁩ Bordes arrive le 3 avr.',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-04-03T08:12:00.000Z',
    body: [
      'Code de confirmation : HM9KLMN45PQ',
      'Arrivée : 3 avril 2026',
      'Départ : 7 avril 2026',
      '2 adultes',
      'Vos revenus pour ce séjour : 320,00 €',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 70,
      hasConfirmationCode: true,
      minTotalPrice: 250,
      minGuests: 2,
      requiresDates: true,
      expectedGuestNameIncludes: ['Marie', 'Bordes'],
    },
  },
  {
    name: 'NEW_FR_subject_arrivee_depart_explicit_range',
    messageId: 'msg_new_subject_arrivee_depart_001',
    subject: 'Réservation confirmée — Arrivée mer. 20 mai 2026 · Départ ven. 22 mai 2026',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-05-01T08:12:00.000Z',
    body: [
      'Code de confirmation : HMAD22ZX99',
      'Voyageur principal : Clara Martin',
      '2 voyageurs',
      'Vos revenus pour ce séjour : 180,00 €',
      'Heure d\'arrivée : 15:00',
      'Heure de départ : 11:00',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 70,
      hasConfirmationCode: true,
      minTotalPrice: 100,
      minGuests: 2,
      requiresDates: true,
      expectedCheckIn: '2026-05-20',
      expectedCheckOut: '2026-05-22',
      expectedNights: 2,
      expectedGuestNameIncludes: ['Clara', 'Martin'],
    },
  },
  {
    name: 'NEW_FR_maisonette_t2_guest_label',
    messageId: 'msg_new_maisonette_001',
    subject: 'Réservation pour maisonette t2 quartier calme, 15–18 avr.',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-04-14T09:30:00.000Z',
    body: [
      'Code de confirmation : HM55RT98ZX',
      'Voyageur principal : Léa O\'Connor',
      'Arrivée : 15 avril 2026',
      'Départ : 18 avril 2026',
      '2 voyageurs',
      'Vos revenus pour ce séjour : 210,00 €',
      'Frais de service Airbnb : 24,00 €',
      'Taxes : 6,00 €',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 70,
      hasConfirmationCode: true,
      hasProperty: true,
      minTotalPrice: 180,
      minGuests: 2,
      requiresDates: true,
      expectedGuestNameIncludes: ['Léa', 'Connor'],
    },
  },
  {
    name: 'NEW_FR_appartement_bleu_relax',
    messageId: 'msg_new_bleu_001',
    subject: 'Réservation pour Appartement Bleu Relax, 20–23 avr.',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-04-18T08:40:00.000Z',
    body: [
      'Code de confirmation : HM77BL88UX',
      'Voyageur principal : Pierre Martin',
      'Arrivée : 20 avril 2026',
      'Départ : 23 avril 2026',
      '2 voyageurs',
      'Vos revenus pour ce séjour : 240,00 €',
      'Frais de service Airbnb : 22,00 €',
      'Taxes : 8,00 €',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 70,
      hasConfirmationCode: true,
      hasProperty: true,
      minTotalPrice: 200,
      minGuests: 2,
      requiresDates: true,
      expectedGuestNameIncludes: ['Pierre', 'Martin'],
    },
  },
  {
    name: 'NEW_FR_appartement_les_cigognes',
    messageId: 'msg_new_cigognes_001',
    subject: 'Réservation pour Appartement les cigognes, 24–27 avr.',
    from: 'Automated Airbnb <automated@airbnb.com>',
    receivedAt: '2026-04-19T09:10:00.000Z',
    body: [
      'Code de confirmation : HM99CG55NE',
      'Voyageur principal : Sarah Dupont',
      'Arrivée : 24 avril 2026',
      'Départ : 27 avril 2026',
      '3 voyageurs',
      'Vos revenus pour ce séjour : 330,00 €',
      'Frais de service Airbnb : 30,00 €',
      'Taxes : 9,50 €',
    ].join('\n'),
    expected: {
      bookingType: 'new',
      minConfidence: 70,
      hasConfirmationCode: true,
      hasProperty: true,
      minTotalPrice: 280,
      minGuests: 3,
      requiresDates: true,
      expectedGuestNameIncludes: ['Sarah', 'Dupont'],
    },
  },
  {
    name: 'CANCELLED_FR',
    messageId: 'msg_cancel_001',
    subject: 'Marie a annulé sa réservation',
    from: 'automated@airbnb.com',
    receivedAt: '2026-04-12T09:00:00.000Z',
    body: [
      'Code de confirmation : HM12AB34CD',
      'Arrivée : 10 avril 2026',
      'Départ : 13 avril 2026',
      'Réservation annulée',
    ].join('\n'),
    expected: {
      bookingType: 'cancelled',
      minConfidence: 60,
      hasConfirmationCode: true,
      requiresDates: true,
    },
  },
  {
    name: 'MODIFIED_EN',
    messageId: 'msg_mod_001',
    subject: 'Marie wants to change their booking',
    from: 'no-reply@airbnb.com',
    receivedAt: '2026-04-15T11:30:00.000Z',
    body: [
      'Booking code: HMZXCV123456',
      'Current stay: 10 Apr 2026 – 13 Apr 2026',
      'New dates: 11 Apr 2026 – 14 Apr 2026',
      'Nightly rate: $120.00',
      'Total amount: $400.00',
    ].join('\n'),
    expected: {
      bookingType: 'modified',
      minConfidence: 60,
      hasConfirmationCode: true,
      minTotalPrice: 300,
      requiresDates: true,
    },
  },
  {
    name: 'REVIEW_FR_anonymized',
    messageId: 'msg_review_001',
    subject: 'Un voyageur a récemment laissé une évaluation 5 étoiles',
    from: 'automated@airbnb.com',
    receivedAt: '2026-04-16T07:45:00.000Z',
    body: [
      'A guest has recently left a review',
      'Commentaire: "Super séjour, logement impeccable et hôte très réactif."',
      'https://www.airbnb.com/rooms/87654321/reviews',
    ].join('\n'),
    expected: {
      bookingType: 'review',
      minConfidence: 60,
    },
  },
  {
    name: 'PAYOUT_FR',
    messageId: 'msg_payout_001',
    subject: 'Nous avons envoyé un versement de 63,62 €',
    from: 'express@airbnb.com',
    receivedAt: '2026-04-17T06:00:00.000Z',
    body: [
      'Votre versement : 63,62 €',
      'Date de versement : 17/04/2026',
      'Virement bancaire',
      'Code de confirmation : HM12AB34CD',
    ].join('\n'),
    expected: {
      bookingType: 'payout',
      minConfidence: 75,
      minHostPayout: 60,
      hasConfirmationCode: true,
    },
  },
];

function fail(msg: string): never {
  throw new Error(msg);
}

function assertCase(c: Case) {
  const parsed = parseAirbnbEmail(c.messageId, c.subject, c.from, c.body, c.receivedAt);
  if (!parsed) fail(`[${c.name}] Parser returned null`);

  if (parsed.bookingType !== c.expected.bookingType) {
    fail(`[${c.name}] bookingType expected=${c.expected.bookingType} got=${parsed.bookingType}`);
  }

  if (typeof c.expected.minConfidence === 'number' && parsed.confidence < c.expected.minConfidence) {
    fail(`[${c.name}] confidence expected>=${c.expected.minConfidence} got=${parsed.confidence}`);
  }

  if (c.expected.hasConfirmationCode && !parsed.confirmationCode) {
    fail(`[${c.name}] expected confirmationCode`);
  }

  if (c.expected.hasProperty && !parsed.propertyName) {
    fail(`[${c.name}] expected propertyName`);
  }

  if (typeof c.expected.minTotalPrice === 'number' && parsed.totalPrice < c.expected.minTotalPrice) {
    fail(`[${c.name}] totalPrice expected>=${c.expected.minTotalPrice} got=${parsed.totalPrice}`);
  }

  if (typeof c.expected.minHostPayout === 'number' && (parsed.hostPayout ?? 0) < c.expected.minHostPayout) {
    fail(`[${c.name}] hostPayout expected>=${c.expected.minHostPayout} got=${parsed.hostPayout ?? 0}`);
  }

  if (typeof c.expected.minGuests === 'number' && parsed.guests < c.expected.minGuests) {
    fail(`[${c.name}] guests expected>=${c.expected.minGuests} got=${parsed.guests}`);
  }

  if (c.expected.requiresDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.checkOut)) {
      fail(`[${c.name}] expected ISO checkIn/checkOut got=${parsed.checkIn} / ${parsed.checkOut}`);
    }
  }

  if (c.expected.expectedCheckIn && parsed.checkIn !== c.expected.expectedCheckIn) {
    fail(`[${c.name}] checkIn expected=${c.expected.expectedCheckIn} got=${parsed.checkIn}`);
  }

  if (c.expected.expectedCheckOut && parsed.checkOut !== c.expected.expectedCheckOut) {
    fail(`[${c.name}] checkOut expected=${c.expected.expectedCheckOut} got=${parsed.checkOut}`);
  }

  if (typeof c.expected.expectedNights === 'number' && parsed.nights !== c.expected.expectedNights) {
    fail(`[${c.name}] nights expected=${c.expected.expectedNights} got=${parsed.nights}`);
  }

  if (c.expected.expectedGuestNameIncludes?.length) {
    const lowerGuestName = (parsed.guestName || '').toLowerCase();
    for (const token of c.expected.expectedGuestNameIncludes) {
      if (!lowerGuestName.includes(token.toLowerCase())) {
        fail(`[${c.name}] guestName expected to include "${token}" got=${parsed.guestName}`);
      }
    }
  }

  // Session 26/28 signals should stay available when possible
  if (!parsed.parserPatternVersion) {
    fail(`[${c.name}] parserPatternVersion missing`);
  }
  if (!parsed.classificationSource) {
    fail(`[${c.name}] classificationSource missing`);
  }

  return parsed;
}

function main() {
  const failures: string[] = [];
  const byType: Record<string, number> = {};
  let confidenceSum = 0;

  for (const c of CASES) {
    try {
      const parsed = assertCase(c);
      byType[parsed.bookingType] = (byType[parsed.bookingType] || 0) + 1;
      confidenceSum += parsed.confidence;
      console.log(`✅ ${c.name} -> ${parsed.bookingType} (${parsed.confidence}%)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(msg);
      console.error(`❌ ${msg}`);
    }
  }

  const passed = CASES.length - failures.length;
  const avgConfidence = passed > 0 ? Math.round(confidenceSum / passed) : 0;

  console.log('\n=== Gmail Parser QA Metrics (Session 29) ===');
  console.log(`Total cases: ${CASES.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  console.log(`Average confidence: ${avgConfidence}%`);
  console.log(`Distribution by type: ${JSON.stringify(byType)}`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    failures.forEach(f => console.error(` - ${f}`));
    process.exit(1);
  }

  console.log('\n🎉 Session 29 QA passed.');
}

main();
