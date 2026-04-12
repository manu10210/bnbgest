/**
 * 📧 API Route — Gmail Sync pour extraction des réservations Airbnb
 *
 * GET  /api/gmail/sync        → Analyse les emails et retourne les réservations trouvées
 * POST /api/gmail/sync        → Importe une ou plusieurs réservations sélectionnées
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
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

// ─── GET : Analyser les emails Airbnb ────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Authentification
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // 2. Récupérer le token d'accès Google
  const accessToken = (session as { accessToken?: string }).accessToken;
  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'Token Gmail non disponible',
        action: 'reconnect',
        message: 'Veuillez vous déconnecter et vous reconnecter pour autoriser l\'accès Gmail',
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const maxPerPage = Math.min(parseInt(searchParams.get('max') ?? String(MAX_RESULTS)), MAX_RESULTS);
  const query = searchParams.get('q') ?? 'from:automated@airbnb.com';

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
        stats: { found: 0, parsed: 0, errors: 0 },
      });
    }

    // 4. Récupérer les détails de chaque email (en parallèle, max 10 à la fois)
    const bookings: ParsedBooking[] = [];
    const errors: string[] = [];
    const batchSize = 10;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
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
        } catch (e) {
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
        found: messages.length,
        parsed: bookings.length,
        errors: errors.length,
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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const accessToken = (session as { accessToken?: string }).accessToken;
  if (!accessToken) {
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
