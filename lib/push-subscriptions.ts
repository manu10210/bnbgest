// Store in-memory pour les abonnements push (par userId)
// En production avec DB: stocker dans une table PushSubscription
export const pushSubscriptions = new Map<string, PushSubscriptionJSON[]>();

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function addSubscription(userId: string, sub: PushSubscriptionJSON) {
  const existing = pushSubscriptions.get(userId) || [];
  // Éviter les doublons par endpoint
  const filtered = existing.filter(s => s.endpoint !== sub.endpoint);
  pushSubscriptions.set(userId, [...filtered, sub]);
}

export function removeSubscription(userId: string, endpoint: string) {
  const existing = pushSubscriptions.get(userId) || [];
  pushSubscriptions.set(userId, existing.filter(s => s.endpoint !== endpoint));
}

export function getSubscriptions(userId: string): PushSubscriptionJSON[] {
  return pushSubscriptions.get(userId) || [];
}

export function getAllSubscriptions(): Array<{ userId: string; sub: PushSubscriptionJSON }> {
  const result: Array<{ userId: string; sub: PushSubscriptionJSON }> = [];
  for (const [userId, subs] of pushSubscriptions.entries()) {
    for (const sub of subs) {
      result.push({ userId, sub });
    }
  }
  return result;
}
