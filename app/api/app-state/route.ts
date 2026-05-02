export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

function resolveStorageKey(userId: string, key: string): string {
  return `APP_STATE:${userId}:${key}`;
}

// GET /api/app-state?key=...
export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'relaxed');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const key = new URL(request.url).searchParams.get('key');
  if (!key) {
    return NextResponse.json({ success: false, error: 'Missing key query param' }, { status: 400 });
  }

  try {
    const storageKey = resolveStorageKey(authResult.user.id, key);
    const setting = await prisma.integrationSetting.findUnique({
      where: { platform: storageKey },
      select: { config: true, updatedAt: true },
    });

    const configValue = setting?.config as { value?: unknown } | null;

    return NextResponse.json({
      success: true,
      key,
      value: configValue?.value ?? null,
      updatedAt: setting?.updatedAt ?? null,
    });
  } catch (error) {
    console.error('GET /api/app-state error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load app state' },
      { status: 500 },
    );
  }
}

// PUT /api/app-state { key: string, value: unknown }
export async function PUT(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json()) as { key?: string; value?: unknown };
    if (!body?.key) {
      return NextResponse.json({ success: false, error: 'key is required' }, { status: 400 });
    }

    const storageKey = resolveStorageKey(authResult.user.id, body.key);

    await prisma.integrationSetting.upsert({
      where: { platform: storageKey },
      create: {
        platform: storageKey,
        enabled: true,
        config: {
          value: body.value ?? null,
          userId: authResult.user.id,
          source: 'app-state',
        } as Prisma.InputJsonValue,
      },
      update: {
        enabled: true,
        config: {
          value: body.value ?? null,
          userId: authResult.user.id,
          source: 'app-state',
        } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, key: body.key });
  } catch (error) {
    console.error('PUT /api/app-state error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save app state' },
      { status: 500 },
    );
  }
}
