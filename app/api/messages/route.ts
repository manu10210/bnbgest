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

// GET /api/messages?platform=&propertyId=&bookingId=&isRead=&limit=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const platform   = searchParams.get('platform');    // airbnb | booking | manual
  const propertyId = searchParams.get('propertyId');
  const bookingId  = searchParams.get('bookingId');
  const isRead     = searchParams.get('isRead');
  const limit      = parseInt(searchParams.get('limit') || '200');
  const search     = searchParams.get('search');

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (platform)   where.platform   = platform;
    if (propertyId) where.propertyId = parseInt(propertyId);
    if (bookingId)  where.bookingId  = parseInt(bookingId);
    if (isRead !== null && isRead !== '') where.isRead = isRead === 'true';
    if (search) {
      where.OR = [
        { guestName:   { contains: search, mode: 'insensitive' } },
        { subject:     { contains: search, mode: 'insensitive' } },
        { lastMessage: { contains: search, mode: 'insensitive' } },
        { guestEmail:  { contains: search, mode: 'insensitive' } },
      ];
    }

    const threads = await prisma.messageThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        property: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const unreadCount = await prisma.messageThread.count({
      where: { ...where, isRead: false },
    });

    return NextResponse.json({ threads, unreadCount });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST /api/messages — créer un thread ou un message
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create_thread') {
      const { platform, propertyId, bookingId, guestName, guestEmail, subject, firstMessage } = body;
      if (!platform || !guestName || !firstMessage) {
        return NextResponse.json({ error: 'platform, guestName et firstMessage requis' }, { status: 400 });
      }

      const thread = await prisma.messageThread.create({
        data: {
          platform,
          propertyId: propertyId ? parseInt(propertyId) : null,
          bookingId:  bookingId  ? parseInt(bookingId)  : null,
          guestName,
          guestEmail: guestEmail || null,
          subject:    subject || `Message de ${guestName}`,
          lastMessage:    firstMessage,
          lastMessageAt:  new Date(),
          isRead:         false,
          messages: {
            create: {
              content:    firstMessage,
              senderType: 'guest',
              senderName: guestName,
              createdAt:  new Date(),
            },
          },
        },
        include: { property: { select: { id: true, name: true } } },
      });
      return NextResponse.json({ thread }, { status: 201 });
    }

    if (action === 'reply') {
      const { threadId, content, isAI = false } = body;
      if (!threadId || !content) {
        return NextResponse.json({ error: 'threadId et content requis' }, { status: 400 });
      }

      // Create message + update thread
      const [message] = await prisma.$transaction([
        prisma.message.create({
          data: {
            threadId: parseInt(threadId),
            content,
            senderType: 'host',
            senderName: isAI ? 'IA BNBGest' : 'Hôte',
            isAI,
            createdAt: new Date(),
          },
        }),
        prisma.messageThread.update({
          where: { id: parseInt(threadId) },
          data: {
            lastMessage:   content,
            lastMessageAt: new Date(),
            isRead:        true,
          },
        }),
      ]);

      return NextResponse.json({ message }, { status: 201 });
    }

    if (action === 'mark_read') {
      const { threadId } = body;
      await prisma.messageThread.update({
        where: { id: parseInt(threadId) },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'action invalide' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
