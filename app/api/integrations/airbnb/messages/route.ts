/**
 * 💬 Airbnb Messages
 * Gérer les messages avec les invités
 * ✅ Protected: Auth required, Rate limited (relaxed: 100/10s for GET, strict: 10/10s for POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient } from '@/lib/airbnb-api';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // 1. Rate limiting (relaxed for read operations)
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const threadId = searchParams.get('threadId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Récupérer les tokens
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb not connected'
      }, { status: 401 });
    }

    // Créer le client
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Airbnb client'
      }, { status: 500 });
    }

    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'messages:read',
    });

    if (threadId) {
      // Récupérer les messages d'un thread
      const messages = await client.getMessages(threadId);
      return NextResponse.json({
        success: true,
        messages,
        count: messages.length
      });
    } else {
      // Récupérer les threads
      const threads = await client.getMessageThreads({ unreadOnly });
      return NextResponse.json({
        success: true,
        threads,
        count: threads.length
      });
    }

  } catch (error) {
    console.error('Airbnb messages error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages',
      details: (error as Error).message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // 1. Rate limiting (strict for write operations)
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { threadId, content, messageId, action } = body;

    if (!threadId && !messageId) {
      return NextResponse.json({
        success: false,
        error: 'threadId or messageId required'
      }, { status: 400 });
    }

    // Récupérer les tokens
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb not connected'
      }, { status: 401 });
    }

    // Créer le client
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Airbnb client'
      }, { status: 500 });
    }

    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'messages:write',
    });

    if (action === 'mark_read' && messageId) {
      // Marquer comme lu
      await client.markMessageAsRead(messageId);
      return NextResponse.json({
        success: true,
        message: 'Message marked as read'
      });
    } else if (threadId && content) {
      // Envoyer un message
      const message = await client.sendMessage(threadId, content);
      return NextResponse.json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Airbnb message action error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action',
      details: (error as Error).message
    }, { status: 500 });
  }
}
