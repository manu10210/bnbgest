import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { addSubscription, removeSubscription, type PushSubscriptionJSON } from '../../../../lib/push-subscriptions';

export const runtime = 'nodejs';

// POST /api/push/subscribe — enregistre un abonnement push
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscription } = body as { subscription: PushSubscriptionJSON };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
    }

    addSubscription(session.user.id, subscription);
    console.log(`✅ Push subscription ajoutée pour user ${session.user.id}`);

    return NextResponse.json({ success: true, message: 'Abonnement enregistré' });
  } catch (error) {
    console.error('Erreur subscribe push:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/push/subscribe — supprime un abonnement
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();
    removeSubscription(session.user.id, endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
