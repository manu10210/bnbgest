'use client';

import { useState, useEffect, useCallback } from 'react';

type PushState = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading';

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    const perm = Notification.permission;
    setState(perm as PushState);

    // Vérifier si déjà abonné
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    setError(null);
    try {
      // 1. Enregistrer le service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 2. Récupérer la clé VAPID publique
      const keyRes = await fetch('/api/push/vapid-key');
      if (!keyRes.ok) throw new Error('Clé VAPID non disponible');
      const { publicKey } = await keyRes.json();

      // 3. Demander la permission
      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== 'granted') return;

      // 4. Créer l'abonnement push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Envoyer l'abonnement au serveur
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      setIsSubscribed(true);

      // 6. Notification de confirmation
      reg.showNotification('BNBGest', {
        body: '🔔 Notifications activées ! Vous recevrez les alertes importantes.',
        icon: '/icon-192.png',
        badge: '/favicon.ico',
        tag: 'welcome',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      console.error('Erreur subscribe push:', err);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Erreur unsubscribe:', err);
    }
  }, []);

  const sendTestPush = useCallback(async () => {
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            title: '🧪 Test BNBGest',
            body: 'Les notifications push fonctionnent !',
            url: '/',
            tag: 'test',
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  return { state, isSubscribed, error, subscribe, unsubscribe, sendTestPush };
}

// Convertit une clé base64url en Uint8Array pour applicationServerKey
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer.buffer;
}
