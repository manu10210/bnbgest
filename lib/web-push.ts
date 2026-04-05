// Service Web Push — envoie des notifications push via VAPID
import webpush from 'web-push';
import type { PushSubscriptionJSON } from './push-subscriptions';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY?.trim() || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY?.trim() || '';
const VAPID_SUBJECT = `mailto:${process.env.ADMIN_EMAIL || 'claustre.emmanuel@gmail.com'}`;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

/**
 * Envoyer une notification push à un abonnement
 */
export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️ VAPID keys non configurées — push désactivé');
    return { success: false, error: 'VAPID not configured' };
  }

  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    // 410 = abonnement expiré/révoqué
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, error: 'subscription_expired' };
    }
    console.error('❌ Erreur push:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Envoyer à plusieurs abonnements, nettoyer les expirés
 */
export async function sendPushToMany(
  subscriptions: PushSubscriptionJSON[],
  payload: PushPayload
): Promise<{ sent: number; failed: number; expired: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendPushNotification(sub, payload))
  );

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        sent++;
      } else {
        if (result.value.error === 'subscription_expired') {
          expired.push(subscriptions[i].endpoint);
        }
        failed++;
      }
    } else {
      failed++;
    }
  });

  return { sent, failed, expired };
}

export { VAPID_PUBLIC_KEY };
