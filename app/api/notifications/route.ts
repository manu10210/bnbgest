export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { prisma } from '../../../lib/prisma';

export const runtime = 'nodejs';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) };
  }
  return { session };
}

// GET /api/notifications?type=&channel=&status=&limit=&unreadOnly=
export async function GET(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const type       = searchParams.get('type');
  const channel    = searchParams.get('channel');
  const status     = searchParams.get('status');
  const limit      = parseInt(searchParams.get('limit') || '100');
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    // Filter to current user's notifications OR global (no userId)
    where.OR = [{ userId: session!.user!.id }, { userId: null }];
    if (type)    where.type    = type;
    if (channel) where.channel = channel;
    if (status)  where.status  = status;
    if (unreadOnly) where.status = 'pending';

    const notifications = await prisma.notificationLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: limit,
    });

    const unreadCount = await prisma.notificationLog.count({
      where: { ...where, status: 'pending' },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error('GET /api/notifications error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/notifications — créer une notification manuelle
export async function POST(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { type, channel = 'push', subject, message, userId } = body;

    if (!type || !message) {
      return NextResponse.json({ error: 'type et message requis' }, { status: 400 });
    }

    const notification = await prisma.notificationLog.create({
      data: {
        userId: userId || session!.user!.id || null,
        type,
        channel,
        subject: subject || null,
        message,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    console.error('POST /api/notifications error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH /api/notifications — marquer tout comme lu
export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAuth();
  if (error) return error;

  try {
    const { ids } = await req.json() as { ids?: string[] };

    const where = ids?.length
      ? { id: { in: ids } }
      : { OR: [{ userId: session!.user!.id }, { userId: null }], status: 'pending' };

    await prisma.notificationLog.updateMany({
      where,
      data: { status: 'sent' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
