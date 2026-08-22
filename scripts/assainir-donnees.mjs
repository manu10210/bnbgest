// ============================================================
//  Assainissement des données BNBGest (idempotent, réversible)
//
//  Constat du 2026-08-22 (5 apparts, réservations reconstruites depuis Gmail) :
//   - 34 réservations sans confirmationCode alors que le code est dans les notes
//   - 25 noms de voyageurs pollués ("Règlement du séjour Kevin Ansel")
//   - doublons par code de confirmation (parfois sur la MAUVAISE propriété)
//   - 6 réservations fantômes (0 €, prénom seul) sur « les cigognes » (#6),
//     chacune doublant une vraie réservation d'un autre appart
//   - propriété #1 « MAISON DE VILLE… » = ancien nom de #2 « Maisonnette T2 »
//     (cf. PROPERTY_ALIASES dans GmailImporter), 0 réservation
//
//  Par défaut : SIMULATION (rien n'est écrit). Ajouter --appliquer pour agir.
//  Rien n'est supprimé : les doublons/fantômes passent en CANCELLED avec une
//  raison explicite ; les propriétés doublons passent en INACTIVE.
//
//    node --env-file=.env.local scripts/assainir-donnees.mjs
//    node --env-file=.env.local scripts/assainir-donnees.mjs --appliquer
// ============================================================
import { PrismaClient } from '@prisma/client';

const APPLIQUER = process.argv.includes('--appliquer');
const TAG = `assainissement ${new Date().toISOString().slice(0, 10)}`;
const p = new PrismaClient();
const actions = [];
const note = (quoi, fn) => actions.push({ quoi, fn });

const normalize = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s{2,}/g, ' ').trim();
const codeDans = (...t) => { for (const x of t) { const m = /\b(HM[A-Z0-9]{6,12})\b/i.exec(String(x ?? '')); if (m) return m[1].toUpperCase(); } return null; };
const nettoyerNom = (raw) => String(raw ?? '').replace(/^(r[èe]glement|versement|paiement)\s+(du|de|pour)\s+(s[ée]jour|la\s+r[ée]servation)\s+(de\s+)?/i, '').replace(/\s{2,}/g, ' ').trim() || 'Voyageur Airbnb';
const mergeMeta = (meta, patch) => {
  const m = meta && typeof meta === 'object' ? { ...meta } : {};
  const set = (k) => Array.from(new Set([...(Array.isArray(m[k]) ? m[k] : []), ...(patch[k] || [])].map(String).filter(Boolean)));
  return { ...m, aliases: set('aliases'), airbnbListingIds: set('airbnbListingIds') };
};

const props = await p.property.findMany({ orderBy: { id: 'asc' }, include: { _count: { select: { bookings: true } } } });
const bookings = await p.booking.findMany({ orderBy: { id: 'asc' } });
console.log(`${props.length} propriétés, ${bookings.length} réservations — mode ${APPLIQUER ? 'APPLICATION' : 'SIMULATION'}\n`);

// ---- 1. Codes de confirmation récupérés dans les notes ---------------------
// (planifié ici, écrit après le dédoublonnage : contrainte d'unicité (propriété, code))
const codesAEcrire = new Map();
for (const b of bookings) {
  if (b.confirmationCode) continue;
  const code = codeDans(b.specialRequests, b.notes);
  if (code) { b.confirmationCode = code; codesAEcrire.set(b.id, code); }
}

// ---- 2. Noms de voyageurs nettoyés -----------------------------------------
for (const b of bookings) {
  const propre = nettoyerNom(b.guestName);
  if (propre !== b.guestName) { b.guestName = propre; note(`b${b.id} nom "${b.guestName}" (était pollué)`, () => p.booking.update({ where: { id: b.id }, data: { guestName: propre } })); }
}

// ---- 3. Doublons par code de confirmation (toutes propriétés) ---------------
const parCode = new Map();
for (const b of bookings) if (b.confirmationCode && b.status !== 'CANCELLED') { const k = b.confirmationCode.toUpperCase(); parCode.set(k, [...(parCode.get(k) || []), b]); }
const annulees = new Set();
for (const [code, liste] of parCode) {
  if (liste.length < 2) continue;
  // On garde : prix > 0, puis nom le plus complet, puis la plus ancienne (id)
  const score = (b) => (b.totalPrice > 0 ? 2 : 0) + (/\s/.test(b.guestName) ? 1 : 0) + (b.guestName.includes('inconnu') ? -2 : 0);
  const garde = [...liste].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
  for (const b of liste) if (b !== garde) {
    annulees.add(b.id);
    note(`b${b.id} (#${b.propertyId}) DOUBLON de b${garde.id} (#${garde.propertyId}) code ${code} → CANCELLED`,
      () => p.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED', cancellationReason: `Doublon de la réservation #${garde.id} (${TAG})` } }));
  }
}

// 3b. Codes : uniquement sur les réservations conservées
for (const [id, code] of codesAEcrire) {
  if (annulees.has(id)) continue;
  note(`b${id} code ← ${code}`, () => p.booking.update({ where: { id }, data: { confirmationCode: code } }));
}

// ---- 4. Fantômes : 0 €, sans code, prénom seul, doublant un séjour ailleurs --
for (const b of bookings) {
  if (annulees.has(b.id) || b.status === 'CANCELLED' || b.confirmationCode || b.totalPrice > 0 || /\s/.test(b.guestName.trim())) continue;
  const jumeau = bookings.find((o) => o.id !== b.id && o.propertyId !== b.propertyId && !annulees.has(o.id) && o.status !== 'CANCELLED'
    && Math.abs(o.checkIn - b.checkIn) < 36e5 * 12 && Math.abs(o.checkOut - b.checkOut) < 36e5 * 12);
  if (!jumeau) continue;
  annulees.add(b.id);
  note(`b${b.id} (#${b.propertyId}) FANTÔME "${b.guestName}" ${b.checkIn.toISOString().slice(0, 10)} double b${jumeau.id} (#${jumeau.propertyId} ${jumeau.guestName}) → CANCELLED`,
    () => p.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED', cancellationReason: `Fantôme : doublon de la réservation #${jumeau.id} sur un autre logement (${TAG})` } }));
}

// ---- 5. Propriétés doublons ------------------------------------------------
const byNorm = (n) => props.find((x) => normalize(x.name) === normalize(n));
const maisonDeVille = byNorm('MAISON DE VILLE AVEC PETITE TERRASSE COUVERTE');
const maisonnette = byNorm('MAISONNETTE T2 QUARTIER CALME');
if (maisonDeVille && maisonnette && maisonDeVille.status === 'ACTIVE') {
  note(`#${maisonDeVille.id} « ${maisonDeVille.name} » = ancien nom de #${maisonnette.id} → INACTIVE + alias sur #${maisonnette.id}`, async () => {
    await p.booking.updateMany({ where: { propertyId: maisonDeVille.id }, data: { propertyId: maisonnette.id } });
    await p.property.update({ where: { id: maisonDeVille.id }, data: { status: 'INACTIVE' } });
    await p.property.update({ where: { id: maisonnette.id }, data: { metadata: mergeMeta(maisonnette.metadata, { aliases: [normalize(maisonDeVille.name), 'maison de ville', 'petite terrasse couverte'] }) } });
  });
}
for (const nom of ['les cigognes', 't2 climatis']) {
  const pr = byNorm(nom);
  if (!pr || pr.status !== 'ACTIVE') continue;
  const vivantes = bookings.filter((b) => b.propertyId === pr.id && b.status !== 'CANCELLED' && !annulees.has(b.id)).length;
  if (vivantes > 0) { console.log(`! #${pr.id} « ${pr.name} » garde ${vivantes} réservation(s) vivante(s) : laissée ACTIVE, à trancher à la main`); continue; }
  note(`#${pr.id} « ${pr.name} » sans réservation réelle → INACTIVE`, () => p.property.update({ where: { id: pr.id }, data: { status: 'INACTIVE' } }));
}

// ---- 6. Décisions Gmail : « les cigognes » n'est pas un logement → label rejeté
const users = await p.user.findMany({ select: { id: true, email: true } });
for (const u of users) {
  const platform = `gmail_property_decisions:${u.id}`;
  const row = await p.integrationSetting.findUnique({ where: { platform } });
  const cfg = row?.config && typeof row.config === 'object' ? row.config : {};
  const rejected = new Set(Array.isArray(cfg.rejectedLabels) ? cfg.rejectedLabels : []);
  const aliases = { ...(cfg.aliases || {}) };
  let change = false;
  for (const l of ['les cigognes', 'appartement les cigognes', 'cigognes']) if (!rejected.has(l)) { rejected.add(l); change = true; }
  if (maisonnette) for (const l of ['maison de ville avec petite terrasse couverte', 'maison de ville', 'petite terrasse couverte']) if (aliases[l] !== maisonnette.name) { aliases[l] = maisonnette.name; change = true; }
  if (!change) continue;
  note(`décisions Gmail de ${u.email} : +labels rejetés (cigognes), +alias maison de ville → ${maisonnette?.name}`, () =>
    p.integrationSetting.upsert({ where: { platform }, update: { config: { ...cfg, aliases, rejectedLabels: [...rejected], updatedAt: new Date().toISOString() } },
      create: { platform, enabled: true, syncStatus: 'manual', lastSyncAt: new Date(), config: { aliases, rejectedLabels: [...rejected], updatedAt: new Date().toISOString() } } }));
}

// ---- Exécution ------------------------------------------------------------------
console.log(`${actions.length} action(s) :`);
for (const a of actions) console.log('  -', a.quoi);
if (APPLIQUER) {
  for (const a of actions) await a.fn();
  console.log('\n✔ appliqué');
} else {
  console.log('\n(simulation — relancer avec --appliquer)');
}
await p.$disconnect();
