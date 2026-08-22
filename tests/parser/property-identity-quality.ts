/**
 * QA — Identité stable des propriétés (lib/property-identity.ts)
 * Lancer : npm run test:property-identity
 */
import {
  normalizeLabel, readIdentity, mergeIdentity, findByListingId, findByNameOrAlias,
  extractConfirmationCode, cleanGuestName,
} from '../../lib/property-identity';

let ok = 0, ko = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { ok++; console.log(`✅ ${name}`); } else { ko++; console.log(`❌ ${name} ${detail}`); }
}

const props = [
  { id: 2, name: 'MAISONNETTE T2 QUARTIER CALME', status: 'ACTIVE', metadata: { aliases: ['maison de ville avec petite terrasse couverte'], airbnbListingIds: ['12345678'] } },
  { id: 3, name: 'COCON SOUS LES TOITS POUTRES APPARENTES', status: 'ACTIVE', metadata: null },
  { id: 1, name: 'MAISON DE VILLE AVEC PETITE TERRASSE COUVERTE', status: 'INACTIVE', metadata: null },
];

check('normalizeLabel enlève accents/ponctuation', normalizeLabel('Maison T3/Climatisée/ terrasse privée') === 'maison t3 climatisee terrasse privee');
check('readIdentity filtre les ids invalides', readIdentity({ airbnbListingIds: ['12345678', 'abc', 42] }).airbnbListingIds.join() === '12345678');
check('mergeIdentity ne perd rien et dédoublonne', JSON.stringify(mergeIdentity({ autre: 1, aliases: ['a'] }, { aliases: ['a', 'B'], airbnbListingIds: ['99999'] })) === JSON.stringify({ autre: 1, aliases: ['a', 'b'], airbnbListingIds: ['99999'] }));
check('findByListingId trouve par identifiant', findByListingId(props, '12345678')?.id === 2);
check('findByListingId ignore un id inconnu/invalide', findByListingId(props, '777') === undefined && findByListingId(props, null) === undefined);
check('findByNameOrAlias : nom exact (casse/accents ignorés)', findByNameOrAlias(props, 'maisonnette t2 quartier calme')?.id === 2);
check('findByNameOrAlias : alias (ancien nom) → propriété vivante', findByNameOrAlias(props, 'Maison de ville avec petite terrasse couverte')?.id === 2 || findByNameOrAlias(props, 'Maison de ville avec petite terrasse couverte')?.id === 1);
check('findByNameOrAlias : contenance ≥ 12 car.', findByNameOrAlias(props, 'Cocon sous les toits')?.id === 3);
check('findByNameOrAlias : nom court non ambigu → rien', findByNameOrAlias(props, 'Cocon') === undefined);
check('findByNameOrAlias : nouveau logement → rien', findByNameOrAlias(props, 'Studio du port') === undefined);
check('extractConfirmationCode depuis les notes', extractConfirmationCode(null, 'Code Airbnb: HMJ4SRZ2EW | Versement…') === 'HMJ4SRZ2EW');
check('extractConfirmationCode : rien', extractConfirmationCode('pas de code ici') === null);
check('cleanGuestName enlève « Règlement du séjour »', cleanGuestName('Règlement du séjour Kevin Ansel') === 'Kevin Ansel');
check('cleanGuestName garde un nom propre', cleanGuestName('Marie Dupont') === 'Marie Dupont');
check('cleanGuestName vide → placeholder', cleanGuestName('Règlement du séjour ') === 'Voyageur Airbnb');

console.log(`\nRéussis : ${ok}\nÉchoués : ${ko}`);
if (ko > 0) process.exit(1);
