/**
 * 📧 API Route — Gmail Sync pour extraction des réservations Airbnb
 *
 * GET  /api/gmail/sync        → Analyse les emails et retourne les réservations trouvées
 * POST /api/gmail/sync        → Importe une ou plusieurs réservations sélectionnées
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import {
  parseAirbnbEmail,
  extractBodyFromPayload,
  ParsedBooking,
  GmailPayload,
} from '@/lib/gmail-parser';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const MAX_RESULTS = 500;       // max autorisé par Gmail API par page
const MAX_PAGES   = 10;        // max 10 pages = 5 000 messages par requête

// ─── Types Gmail API ─────────────────────────────────────────────────────────

interface GmailMessage {
  id: string;
  threadId: string;
}

interface GmailMessageDetail {
  id: string;
  payload: GmailPayload & {
    headers: { name: string; value: string }[];
  };
  internalDate: string;
  snippet: string;
}

type SessionUser = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function gmailFetch(
  endpoint: string,
  accessToken: string
): Promise<Response> {
  return fetch(`${GMAIL_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

async function resolveDbOwner(sessionUser: SessionUser): Promise<{ id: string } | null> {
  const normalizedEmail = (sessionUser.email || '').trim().toLowerCase();

  let owner = sessionUser.id
    ? await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { id: true } })
    : null;

  if (!owner && normalizedEmail) {
    const dbRole = String(sessionUser.role || 'USER').toUpperCase();
    const validRole = dbRole === 'ADMIN' || dbRole === 'EMPLOYEE' || dbRole === 'USER' ? dbRole : 'USER';
    owner = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        ...(sessionUser.name ? { name: sessionUser.name } : {}),
      },
      create: {
        email: normalizedEmail,
        name: sessionUser.name || normalizedEmail.split('@')[0],
        role: validRole as Role,
      },
      select: { id: true },
    });
  }

  return owner;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ─── GET : Analyser les emails Airbnb ────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentification
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Récupérer le token d'accès Google
  const accessToken = (session as { accessToken?: string }).accessToken;
  const tokenError  = (session as { tokenError?: string }).tokenError;

  if (!accessToken || tokenError === 'RefreshAccessTokenError') {
    return NextResponse.json(
      {
        error: 'Autorisation Gmail expirée',
        action: 'reconnect',
        message: 'Votre autorisation Gmail a expiré. Reconnectez-vous avec Google pour la renouveler.',
      },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const maxPerPage = Math.min(parseInt(searchParams.get('max') ?? String(MAX_RESULTS)), MAX_RESULTS);
  const query = searchParams.get('q') ?? 'from:automated@airbnb.com';
  const excludePersisted = searchParams.get('excludePersisted') !== '0';

  try {
    // 3. Lister TOUS les emails Airbnb (avec pagination)
    const messages: GmailMessage[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
      const listRes = await gmailFetch(
        `/messages?q=${encodeURIComponent(query)}&maxResults=${maxPerPage}${pageParam}`,
        accessToken
      );

      if (!listRes.ok) {
        const error = await listRes.json().catch(() => ({}));
        if (listRes.status === 401) {
          return NextResponse.json(
            { error: 'Token expiré', action: 'reconnect' },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: 'Erreur Gmail API', details: error },
          { status: listRes.status }
        );
      }

      const listData = await listRes.json();
      if (listData.messages) messages.push(...listData.messages);
      pageToken = listData.nextPageToken;
      pages++;
    } while (pageToken && pages < MAX_PAGES);

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
        stats: { found: 0, parsed: 0, errors: 0, skippedPersisted: 0 },
      });
    }

    let messagesToProcess = messages;
    let skippedPersisted = 0;

    if (excludePersisted) {
      try {
        const owner = await resolveDbOwner(session.user as SessionUser);
        if (owner) {
          const candidateIds = Array.from(new Set(messages.map((msg) => msg.id).filter(Boolean)));
          const persistedIds = new Set<string>();

          for (const idChunk of chunkArray(candidateIds, 400)) {
            const existing = await prisma.booking.findMany({
              where: {
                userId: owner.id,
                source: 'AIRBNB',
                externalId: { in: idChunk },
              },
              select: {
                externalId: true,
              },
            });

            for (const row of existing) {
              if (row.externalId) persistedIds.add(row.externalId);
            }
          }

          if (persistedIds.size > 0) {
            messagesToProcess = messages.filter((msg) => !persistedIds.has(msg.id));
            skippedPersisted = messages.length - messagesToProcess.length;
          }
        }
      } catch (dbFilterError) {
        console.warn('Gmail sync persisted filter failed (non-blocking):', dbFilterError);
      }
    }

    if (messagesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        bookings: [],
        stats: {
          found: 0,
          parsed: 0,
          errors: 0,
          skippedPersisted,
        },
      });
    }

    // 4. Récupérer les détails de chaque email (en parallèle, max 10 à la fois)
    const bookings: ParsedBooking[] = [];
    const errors: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < messagesToProcess.length; i += batchSize) {
      const batch = messagesToProcess.slice(i, i + batchSize);
      const details = await Promise.all(
        batch.map(async (msg) => {
          const res = await gmailFetch(
            `/messages/${msg.id}?format=full`,
            accessToken
          );
          if (!res.ok) {
            errors.push(msg.id);
            return null;
          }
          return res.json() as Promise<GmailMessageDetail>;
        })
      );

      for (const detail of details) {
        if (!detail) continue;
        try {
          const headers = detail.payload.headers;
          const subject = getHeader(headers, 'subject');
          const from = getHeader(headers, 'from');
          const receivedAt = new Date(parseInt(detail.internalDate)).toISOString();

          const body = extractBodyFromPayload(detail.payload);
          const parsed = parseAirbnbEmail(detail.id, subject, from, body, receivedAt);

          if (parsed && parsed.confidence >= 40) {
            bookings.push(parsed);
          }
        } catch (_e) {
          errors.push(detail.id);
        }
      }
    }

    // 5. Trier par date de réception (plus récent en premier)
    bookings.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    return NextResponse.json({
      success: true,
      bookings,
      stats: {
        found: messagesToProcess.length,
        parsed: bookings.length,
        errors: errors.length,
        skippedPersisted,
      },
    });

  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Erreur interne', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POST : Tester la connexion Gmail ────────────────────────────────────────

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const accessToken = (session as { accessToken?: string }).accessToken;
  const tokenError  = (session as { tokenError?: string }).tokenError;

  if (!accessToken || tokenError === 'RefreshAccessTokenError') {
    return NextResponse.json({ connected: false, action: 'reconnect' });
  }

  // Tester avec un simple appel profil Gmail
  try {
    const res = await gmailFetch('/profile', accessToken);
    if (!res.ok) {
      return NextResponse.json({ connected: false, status: res.status });
    }
    const profile = await res.json();
    return NextResponse.json({
      connected: true,
      email: profile.emailAddress,
      messagesTotal: profile.messagesTotal,
    });
  } catch (e) {
    return NextResponse.json({ connected: false, error: String(e) });
  }
}
