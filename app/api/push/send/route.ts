import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { getAllSubscriptions, getSubscriptions, removeSubscription } from '../../../../lib/push-subscriptions';
import { sendPushToMany, type PushPayload } from '../../../../lib/web-push';

export const runtime = 'nodejs';

// POST /api/push/send — envoie une notification push
// Body: { payload, userId? } — si pas de userId, envoie à tous
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  // Seul un admin peut envoyer à tous — sinon uniquement à soi-même
  const isAdmin = session.user.role === 'ADMIN';

  try {
    const { payload, userId } = await request.json() as {
      payload: PushPayload;
      userId?: string;
    };

    if (!payload?.title || !payload?.body) {
      return NextResponse.json({ error: 'title et body requis' }, { status: 400 });
    }

    let subscriptions;
    if (userId && isAdmin) {
      subscriptions = getSubscriptions(userId).map(sub => ({ userId, sub }));
    } else if (!userId && isAdmin) {
      subscriptions = getAllSubscriptions();
    } else {
      // Non-admin : envoie uniquement à ses propres abonnements
      subscriptions = getSubscriptions(session.user.id!).map(sub => ({ userId: session.user.id!, sub }));
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Aucun abonnement actif' });
    }

    const subs = subscriptions.map(s => s.sub);
    const result = await sendPushToMany(subs, payload);

    // Nettoyer les abonnements expirés
    for (const endpoint of result.expired) {
      for (const { userId: uid } of subscriptions) {
        removeSubscription(uid, endpoint);
      }
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      expiredCleaned: result.expired.length,
    });
  } catch (error) {
    console.error('Erreur send push:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
