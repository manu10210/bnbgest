import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const bk = await p.booking.findMany({ where: { status: { not: 'CANCELLED' } }, orderBy: { checkIn: 'asc' }, select: { id: true, propertyId: true, guestName: true, checkIn: true, checkOut: true, specialRequests: true, notes: true, totalPrice: true } });
const listing = (b) => { const m = /Annonce Airbnb ID\s*:\s*(\d{5,20})|rooms\/(\d{5,20})/.exec((b.specialRequests || '') + (b.notes || '')); return m ? (m[1] || m[2]) : '?'; };
const label = (b) => { const m = /Logement\s*:\s*([^|\n]+)/i.exec((b.specialRequests || '') + '\n' + (b.notes || '')); return m ? m[1].trim().slice(0, 40) : '?'; };

console.log('=== CROISEMENT listing id × libellé « Logement » × propriété (réservations vivantes) ===');
const cross = new Map();
for (const b of bk) { const k = `${listing(b)} | #${b.propertyId} | ${label(b)}`; cross.set(k, (cross.get(k) || 0) + 1); }
for (const [k, n] of [...cross].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${k}`);

console.log('\n=== CHEVAUCHEMENTS de dates dans une même propriété (preuve de 2 logements) ===');
const byProp = new Map();
for (const b of bk) byProp.set(b.propertyId, [...(byProp.get(b.propertyId) || []), b]);
for (const [pid, list] of byProp) {
  let n = 0;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], c = list[j];
    if (c.checkIn < a.checkOut && a.checkIn < c.checkOut && Math.min(a.checkOut, c.checkOut) - Math.max(a.checkIn, c.checkIn) > 36e5 * 20) {
      n++;
      if (n <= 8) console.log(`  #${pid}: b${a.id} ${a.guestName} ${a.checkIn.toISOString().slice(0, 10)}→${a.checkOut.toISOString().slice(0, 10)} [${listing(a)}]  ⟂  b${c.id} ${c.guestName} ${c.checkIn.toISOString().slice(0, 10)}→${c.checkOut.toISOString().slice(0, 10)} [${listing(c)}]`);
    }
  }
  console.log(`  #${pid} : ${n} chevauchement(s) sur ${list.length} réservations`);
}
await p.$disconnect();
