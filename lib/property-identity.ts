/**
 * Identité STABLE des propriétés — côté serveur.
 *
 * Problème : les réservations sont reconstruites depuis les mails Gmail, et le
 * rattachement à une propriété se faisait uniquement par ressemblance du NOM de
 * l'annonce. Quand une annonce Airbnb change de nom, BNBGest créait un doublon
 * et les réservations suivantes tombaient dessus (ControlBnB chauffait alors le
 * mauvais appartement).
 *
 * Deux ancres, rangées dans `Property.metadata` (Json, déjà en base) :
 *   - `airbnbListingIds: string[]` : l'identifiant d'annonce Airbnb (/rooms/123…),
 *     présent dans la plupart des mails, qui NE CHANGE PAS quand l'annonce est renommée ;
 *   - `aliases: string[]` : anciens noms / variantes, normalisés.
 *
 * Ce module est pur (pas d'accès base) sauf les deux helpers marqués `prisma`.
 */
import type { Prisma, PrismaClient } from '@prisma/client';

export interface PropertyIdentityMeta {
  airbnbListingIds: string[];
  aliases: string[];
}

/** Minuscules, sans accents, sans ponctuation, espaces simples. */
export function normalizeLabel(raw: string | null | undefined): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function readIdentity(metadata: unknown): PropertyIdentityMeta {
  const m = metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : {};
  const ids = Array.isArray(m.airbnbListingIds) ? m.airbnbListingIds : [];
  const aliases = Array.isArray(m.aliases) ? m.aliases : [];
  return {
    airbnbListingIds: Array.from(new Set(ids.map((x) => String(x).trim()).filter((x) => /^\d{5,20}$/.test(x)))),
    aliases: Array.from(new Set(aliases.map((x) => normalizeLabel(String(x))).filter(Boolean))),
  };
}

/** Fusionne une identité dans un metadata existant sans écraser le reste. */
export function mergeIdentity(metadata: unknown, patch: Partial<PropertyIdentityMeta>): Prisma.InputJsonObject {
  const base = metadata && typeof metadata === 'object' ? { ...(metadata as Record<string, unknown>) } : {};
  const current = readIdentity(base);
  const next = readIdentity({
    airbnbListingIds: [...current.airbnbListingIds, ...(patch.airbnbListingIds ?? [])],
    aliases: [...current.aliases, ...(patch.aliases ?? [])],
  });
  return { ...base, airbnbListingIds: next.airbnbListingIds, aliases: next.aliases } as Prisma.InputJsonObject;
}

export interface PropertyLike {
  id: number;
  name: string;
  status?: string | null;
  metadata?: unknown;
}

/** La propriété qui porte cet identifiant d'annonce, s'il est connu. */
export function findByListingId<T extends PropertyLike>(properties: T[], listingId: string | null | undefined): T | undefined {
  const id = String(listingId ?? '').trim();
  if (!/^\d{5,20}$/.test(id)) return undefined;
  return properties.find((p) => readIdentity(p.metadata).airbnbListingIds.includes(id));
}

/**
 * Une propriété dont le nom (ou un alias) est le même, à la normalisation près.
 * Sert à REFUSER la création d'un doublon. Les INACTIVE comptent aussi : un
 * ancien nom fusionné ne doit pas renaître.
 */
export function findByNameOrAlias<T extends PropertyLike>(properties: T[], name: string | null | undefined): T | undefined {
  const n = normalizeLabel(name);
  if (!n) return undefined;
  const exact = properties.find((p) => normalizeLabel(p.name) === n || readIdentity(p.metadata).aliases.includes(n));
  if (exact) return exact;
  // Contenance stricte (≥ 12 caractères) : « maisonnette t2 » ⊂ « maisonnette t2 quartier calme »
  if (n.length >= 12) {
    return properties.find((p) => {
      const pn = normalizeLabel(p.name);
      return pn.length >= 12 && (pn.includes(n) || n.includes(pn));
    });
  }
  return undefined;
}

// ---- Accès base -------------------------------------------------------------
type Db = PrismaClient | Prisma.TransactionClient;

/** Toutes les propriétés d'un utilisateur avec leur identité (léger). */
export async function loadIdentities(prisma: Db, userId: string) {
  return prisma.property.findMany({
    where: { userId },
    select: { id: true, name: true, status: true, metadata: true },
    orderBy: { id: 'asc' },
  });
}

/**
 * Apprend un identifiant d'annonce sur une propriété. Refuse si un AUTRE
 * logement le porte déjà (conflit = on ne touche à rien, on signale).
 */
export async function learnListingId(prisma: Db, userId: string, propertyId: number, listingId: string | null | undefined) {
  const id = String(listingId ?? '').trim();
  if (!/^\d{5,20}$/.test(id)) return { learned: false as const, reason: 'invalid' as const };
  const all = await loadIdentities(prisma, userId);
  const owner = findByListingId(all, id);
  if (owner && owner.id !== propertyId) return { learned: false as const, reason: 'conflict' as const, ownerId: owner.id };
  if (owner) return { learned: false as const, reason: 'known' as const };
  const target = all.find((p) => p.id === propertyId);
  if (!target) return { learned: false as const, reason: 'missing' as const };
  await prisma.property.update({ where: { id: propertyId }, data: { metadata: mergeIdentity(target.metadata, { airbnbListingIds: [id] }) } });
  return { learned: true as const };
}

/** Ajoute des alias (anciens noms) à une propriété. */
export async function addAliases(prisma: Db, propertyId: number, aliases: string[]) {
  const target = await prisma.property.findUnique({ where: { id: propertyId }, select: { metadata: true } });
  if (!target) return;
  await prisma.property.update({ where: { id: propertyId }, data: { metadata: mergeIdentity(target.metadata, { aliases }) } });
}

/** Code de confirmation Airbnb trouvé dans un texte libre (notes, demandes spéciales). */
export function extractConfirmationCode(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    const m = /\b(HM[A-Z0-9]{6,12})\b/i.exec(String(t ?? ''));
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Nettoie un nom de voyageur pollué par un sujet de mail (« Règlement du séjour Kevin Ansel »). */
export function cleanGuestName(raw: string | null | undefined): string {
  let s = String(raw ?? '').trim();
  s = s.replace(/^(r[èe]glement|versement|paiement)\s+(du|de|pour)\s+(s[ée]jour|la\s+r[ée]servation)\s*(de\s+)?/i, '');
  s = s.replace(/^(rappel|r[ée]servation|demande)\s*:\s*/i, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s || 'Voyageur Airbnb';
}
