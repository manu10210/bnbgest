import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { prisma } from '../../../../../lib/prisma';

export const runtime = 'nodejs';

// GET /api/messages/[id]/messages — récupère tous les messages d'un thread
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { id } = await params;
  const threadId = parseInt(id);
  if (isNaN(threadId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    const messages = await prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('GET /api/messages/[id]/messages error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
