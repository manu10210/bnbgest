export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';
import {
  computeGuestIdentityCandidates,
  computeGuestIdentityKey,
  normalizeGuestEmail,
  normalizeGuestName,
} from '@/lib/guest-identity';

type GuestStatus = 'active' | 'inactive' | 'blocked';

type GuestPayload = {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  language?: string;
  nationality?: string;
  status?: GuestStatus;
  totalBookings?: number;
  totalSpent?: number;
  rating?: number;
  createdAt?: string;
  lastBooking?: string;
  preferences?: Prisma.JsonValue;
};

type PreviousIdentity = {
  name?: string;
  email?: string;
  phone?: string;
};

type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

type UpsertPayload = {
  guest?: GuestPayload;
  previousIdentity?: PreviousIdentity;
};

function toGuestStatus(status?: string | null): GuestStatus {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'blocked') return 'blocked';
  if (normalized === 'inactive') return 'inactive';
  return 'active';
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildIdentityWhere(identity: PreviousIdentity | GuestPayload): Prisma.BookingWhereInput {
  const normalizedEmail = normalizeGuestEmail(identity.email);
  const name = identity.name?.trim();
  const phone = identity.phone?.trim();

  const orFilters: Prisma.BookingWhereInput[] = [];
  if (normalizedEmail) {
    orFilters.push({ guestEmail: { equals: normalizedEmail, mode: Prisma.QueryMode.insensitive } });
  }
  if (name) {
    orFilters.push({ guestName: { equals: name, mode: Prisma.QueryMode.insensitive } });
  }
  if (phone) {
    orFilters.push({ guestPhone: phone });
  }

  return orFilters.length > 0 ? { OR: orFilters } : {};
}

function isSyntheticTravelerName(name?: string | null): boolean {
  const normalized = normalizeGuestName(name);
  if (!normalized) return true;

  const folded = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    folded === 'voyageur airbnb'
    || folded === 'airbnb guest'
    || folded === 'guest'
    || folded === 'inconnu'
    || folded === 'airbnb payout'
    || folded.startsWith('reglement du sejour')
  );
}

export async function GET(request: Request) {
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const sessionUser = authResult.user as SessionUser;
  const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
  let owner = sessionUser.id ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } }) : null;
  if (!owner && normalizedEmail) {
    owner = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail, name: sessionUser.name || normalizedEmail.split('@')[0], role: 'USER' }
    });
  }
  if (!owner) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const sessionUserId = owner.id;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase() || '';

    const [profiles, bookings, threads, reviews] = await Promise.all([
      prisma.guestProfile.findMany({
        where: {
          userId: sessionUserId,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.booking.findMany({
        where: {
          OR: [{ userId: sessionUserId }, { property: { userId: sessionUserId } }],
        },
        select: {
          guestName: true,
          guestEmail: true,
          guestPhone: true,
          checkOut: true,
          totalPrice: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.messageThread.findMany({
        where: {
          property: { userId: sessionUserId },
        },
        select: {
          guestName: true,
          guestEmail: true,
          lastMessageAt: true,
        },
      }),
      prisma.review.findMany({
        where: {
          property: { userId: sessionUserId },
        },
        select: {
          guestName: true,
          rating: true,
        },
      }),
    ]);

    const guestMap = new Map<string, {
      id?: number;
      identityKey: string;
      name: string;
      email: string;
      phone: string;
      language: string;
      nationality?: string;
      status: GuestStatus;
      totalBookings: number;
      totalSpent: number;
      rating: number;
      ratingCount: number;
      createdAt: Date;
      lastBooking?: Date;
      preferences?: Prisma.JsonValue | null;
    }>();

    const upsertGuest = (identityKey: string, seed: Partial<{
      id: number;
      name: string;
      email: string;
      phone: string;
      language: string;
      nationality: string;
      status: GuestStatus;
      createdAt: Date;
      lastBooking: Date;
      preferences: Prisma.JsonValue | null;
    }>) => {
      const existing = guestMap.get(identityKey);
      if (existing) {
        guestMap.set(identityKey, {
          ...existing,
          ...seed,
          identityKey,
          name: seed.name || existing.name,
          email: seed.email ?? existing.email,
          phone: seed.phone ?? existing.phone,
          language: seed.language || existing.language,
          status: seed.status || existing.status,
          createdAt: seed.createdAt || existing.createdAt,
          lastBooking: seed.lastBooking || existing.lastBooking,
        });
        return;
      }

      guestMap.set(identityKey, {
        id: seed.id,
        identityKey,
        name: seed.name || 'Voyageur',
        email: seed.email || '',
        phone: seed.phone || '',
        language: seed.language || 'fr',
        nationality: seed.nationality,
        status: seed.status || 'active',
        totalBookings: 0,
        totalSpent: 0,
        rating: 0,
        ratingCount: 0,
        createdAt: seed.createdAt || new Date(),
        lastBooking: seed.lastBooking,
        preferences: seed.preferences,
      });
    };

    for (const profile of profiles) {
      if (isSyntheticTravelerName(profile.name)) continue;

      upsertGuest(profile.identityKey, {
        id: profile.id,
        name: profile.name,
        email: profile.email || '',
        phone: profile.phone || '',
        language: profile.language || 'fr',
        nationality: profile.nationality || undefined,
        status: toGuestStatus(profile.status),
        createdAt: profile.createdAt,
        lastBooking: profile.lastBooking || undefined,
        preferences: profile.preferences,
      });
    }

    for (const booking of bookings) {
      if (isSyntheticTravelerName(booking.guestName)) continue;

      const identityKey = computeGuestIdentityKey({
        name: booking.guestName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
      });
      if (!identityKey) continue;

      upsertGuest(identityKey, {
        name: booking.guestName,
        email: booking.guestEmail,
        phone: booking.guestPhone || '',
        createdAt: booking.createdAt,
      });

      const current = guestMap.get(identityKey);
      if (!current) continue;

      if (booking.status !== 'CANCELLED') {
        current.totalBookings += 1;
        current.totalSpent += Number(booking.totalPrice || 0);
      }

      if (!current.lastBooking || booking.checkOut > current.lastBooking) {
        current.lastBooking = booking.checkOut;
      }

      guestMap.set(identityKey, current);
    }

    const reviewByName = new Map<string, { sum: number; count: number }>();
    for (const review of reviews) {
      if (isSyntheticTravelerName(review.guestName)) continue;

      const normalizedName = normalizeGuestName(review.guestName);
      if (!normalizedName) continue;
      const existing = reviewByName.get(normalizedName) || { sum: 0, count: 0 };
      existing.sum += review.rating;
      existing.count += 1;
      reviewByName.set(normalizedName, existing);
    }

    for (const thread of threads) {
      if (isSyntheticTravelerName(thread.guestName)) continue;

      const identityKey = computeGuestIdentityKey({
        name: thread.guestName,
        email: thread.guestEmail,
      });
      if (!identityKey) continue;
      upsertGuest(identityKey, {
        name: thread.guestName,
        email: thread.guestEmail || '',
      });
    }

    const guests = Array.from(guestMap.values())
      .map((guest) => {
        const reviewStats = reviewByName.get(normalizeGuestName(guest.name) || '');
        const rating = reviewStats && reviewStats.count > 0
          ? Number((reviewStats.sum / reviewStats.count).toFixed(2))
          : guest.rating;

        return {
          id: guest.id ?? 1000000000 + (hashString(guest.identityKey) % 800000000),
          identityKey: guest.identityKey,
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          language: guest.language || 'fr',
          nationality: guest.nationality,
          status: guest.status,
          totalBookings: guest.totalBookings,
          totalSpent: Number(guest.totalSpent.toFixed(2)),
          rating,
          createdAt: guest.createdAt.toISOString(),
          lastBooking: guest.lastBooking?.toISOString(),
          preferences: guest.preferences,
        };
      })
      .filter((guest) => {
        if (!search) return true;
        return (
          guest.name.toLowerCase().includes(search) ||
          guest.email.toLowerCase().includes(search) ||
          guest.phone.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const aDate = a.lastBooking ? new Date(a.lastBooking).getTime() : 0;
        const bDate = b.lastBooking ? new Date(b.lastBooking).getTime() : 0;
        return bDate - aDate;
      });

    return NextResponse.json({
      success: true,
      count: guests.length,
      guests,
    });
  } catch (error) {
    console.error('GET /api/guests error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch guests',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const sessionUser = authResult.user as SessionUser;
  const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();
  let owner = sessionUser.id ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } }) : null;
  if (!owner && normalizedEmail) {
    owner = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {},
      create: { email: normalizedEmail, name: sessionUser.name || normalizedEmail.split('@')[0], role: 'USER' }
    });
  }
  if (!owner) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const sessionUserId = owner.id;
    const body = (await request.json()) as UpsertPayload;

    if (!body.guest?.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'guest.name is required' },
        { status: 400 },
      );
    }

    const guest = body.guest;
    const previousIdentity = body.previousIdentity;
    const nextIdentityKey = computeGuestIdentityKey(guest);

    if (!nextIdentityKey) {
      return NextResponse.json(
        { success: false, error: 'Unable to compute traveler identity (name/email/phone missing)' },
        { status: 400 },
      );
    }

    const candidateIdentityKeys = computeGuestIdentityCandidates(guest);
    const previousIdentityKeys = previousIdentity ? computeGuestIdentityCandidates(previousIdentity) : [];

    const persisted = await prisma.$transaction(async (tx) => {
      const existingProfile = await tx.guestProfile.findFirst({
        where: {
          userId: sessionUserId,
          OR: Array.from(new Set([...candidateIdentityKeys, ...previousIdentityKeys])).map((identityKey) => ({
            identityKey,
          })),
        },
      });

      const profile = existingProfile
        ? await tx.guestProfile.update({
            where: { id: existingProfile.id },
            data: {
              identityKey: nextIdentityKey,
              emailNormalized: normalizeGuestEmail(guest.email),
              name: guest.name.trim(),
              email: guest.email?.trim() || null,
              phone: guest.phone?.trim() || null,
              language: guest.language || 'fr',
              nationality: guest.nationality || null,
              status: toGuestStatus(guest.status),
              totalBookings: Math.max(0, Math.round(guest.totalBookings ?? 0)),
              totalSpent: Math.max(0, Number(guest.totalSpent ?? 0)),
              rating: Math.max(0, Math.min(5, Number(guest.rating ?? 0))),
              lastBooking: guest.lastBooking ? new Date(guest.lastBooking) : null,
              preferences: guest.preferences ?? Prisma.JsonNull,
              userId: sessionUserId,
            },
          })
        : await tx.guestProfile.create({
            data: {
              identityKey: nextIdentityKey,
              emailNormalized: normalizeGuestEmail(guest.email),
              name: guest.name.trim(),
              email: guest.email?.trim() || null,
              phone: guest.phone?.trim() || null,
              language: guest.language || 'fr',
              nationality: guest.nationality || null,
              status: toGuestStatus(guest.status),
              totalBookings: Math.max(0, Math.round(guest.totalBookings ?? 0)),
              totalSpent: Math.max(0, Number(guest.totalSpent ?? 0)),
              rating: Math.max(0, Math.min(5, Number(guest.rating ?? 0))),
              lastBooking: guest.lastBooking ? new Date(guest.lastBooking) : null,
              preferences: guest.preferences ?? Prisma.JsonNull,
              userId: sessionUserId,
            },
          });

      const sourceIdentity: PreviousIdentity = {
        name: previousIdentity?.name || guest.name,
        email: previousIdentity?.email || guest.email,
        phone: previousIdentity?.phone || guest.phone,
      };

      const bookingWhere: Prisma.BookingWhereInput = {
        AND: [
          {
            OR: [{ userId: sessionUserId }, { property: { userId: sessionUserId } }],
          },
          buildIdentityWhere(sourceIdentity),
        ],
      };

      const threadWhere: Prisma.MessageThreadWhereInput = {
        AND: [
          { property: { userId: sessionUserId } },
          {
            OR: [
              ...(sourceIdentity.email
                ? [{ guestEmail: { equals: sourceIdentity.email, mode: Prisma.QueryMode.insensitive } }]
                : []),
              ...(sourceIdentity.name
                ? [{ guestName: { equals: sourceIdentity.name, mode: Prisma.QueryMode.insensitive } }]
                : []),
            ],
          },
        ],
      };

      const reviewWhere: Prisma.ReviewWhereInput = {
        AND: [
          { property: { userId: sessionUserId } },
          ...(sourceIdentity.name
            ? [{ guestName: { equals: sourceIdentity.name, mode: Prisma.QueryMode.insensitive } }]
            : []),
        ],
      };

      await Promise.all([
        tx.booking.updateMany({
          where: bookingWhere,
          data: {
            guestName: guest.name.trim(),
            guestEmail: guest.email?.trim() || '',
            guestPhone: guest.phone?.trim() || null,
          },
        }),
        tx.messageThread.updateMany({
          where: threadWhere,
          data: {
            guestName: guest.name.trim(),
            guestEmail: guest.email?.trim() || null,
          },
        }),
        tx.review.updateMany({
          where: reviewWhere,
          data: {
            guestName: guest.name.trim(),
          },
        }),
      ]);

      return profile;
    });

    return NextResponse.json({
      success: true,
      guest: {
        id: persisted.id,
        identityKey: persisted.identityKey,
        name: persisted.name,
        email: persisted.email || '',
        phone: persisted.phone || '',
        language: persisted.language || 'fr',
        nationality: persisted.nationality,
        status: toGuestStatus(persisted.status),
        totalBookings: persisted.totalBookings,
        totalSpent: persisted.totalSpent,
        rating: persisted.rating,
        createdAt: persisted.createdAt.toISOString(),
        lastBooking: persisted.lastBooking?.toISOString(),
        preferences: persisted.preferences,
      },
    });
  } catch (error) {
    console.error('POST /api/guests error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upsert traveler',
      },
      { status: 500 },
    );
  }
}
