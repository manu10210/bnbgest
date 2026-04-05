'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, BellRing, Loader2, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useTheme } from '../contexts/ThemeContext';

interface PushNotificationButtonProps {
  compact?: boolean; // mode icône seule
}

export default function PushNotificationButton({ compact = false }: PushNotificationButtonProps) {
  const { isDark } = useTheme();
  const { state, isSubscribed, error, subscribe, unsubscribe, sendTestPush } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggle = async () => {
    if (state === 'unsupported') return;
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
        showToast('Notifications désactivées', 'info');
      } else {
        await subscribe();
        if (Notification.permission === 'granted') {
          showToast('Notifications activées ! 🔔', 'success');
        } else if (Notification.permission === 'denied') {
          showToast('Permission refusée. Modifiez les paramètres du navigateur.', 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    const ok = await sendTestPush();
    showToast(ok ? '✅ Notification test envoyée !' : '❌ Échec — vérifiez les permissions', ok ? 'success' : 'error');
    setLoading(false);
  };

  if (state === 'unsupported') return null;

  const isDenied = state === 'denied';

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={handleToggle}
          disabled={loading || isDenied}
          title={isSubscribed ? 'Désactiver les notifications' : 'Activer les notifications push'}
          className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isSubscribed
              ? isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'
              : isDark ? 'bg-white/[0.06] text-white/40 hover:bg-white/10 hover:text-white/70' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          } disabled:opacity-40 disabled:cursor-not-allowed`}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            <BellRing className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {isSubscribed && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className={`absolute bottom-full mb-2 left-0 right-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg z-50 ${
              toast.type === 'success' ? 'bg-emerald-500 text-white'
              : toast.type === 'error' ? 'bg-red-500 text-white'
              : isDark ? 'bg-[#2a2a40] text-white border border-white/10' : 'bg-white text-gray-800 border border-gray-200'
            }`}>
            {toast.type === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`rounded-2xl p-4 border ${isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isSubscribed
                ? isDark ? 'bg-violet-500/20' : 'bg-violet-100'
                : isDark ? 'bg-white/[0.06]' : 'bg-gray-100'
            }`}>
              {isSubscribed
                ? <BellRing className="w-5 h-5 text-violet-500" />
                : isDenied
                  ? <BellOff className={`w-5 h-5 ${isDark ? 'text-white/30' : 'text-gray-400'}`} />
                  : <Bell className={`w-5 h-5 ${isDark ? 'text-white/50' : 'text-gray-500'}`} />
              }
            </div>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications push
              </p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {isSubscribed
                  ? 'Activées — réservations, paiements, alertes'
                  : isDenied
                    ? 'Bloquées dans les paramètres du navigateur'
                    : 'Recevez les alertes en temps réel'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isSubscribed && (
              <button
                onClick={handleTest}
                disabled={loading}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isDark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                Tester
              </button>
            )}
            <button
              onClick={handleToggle}
              disabled={loading || isDenied}
              className={`relative px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                isSubscribed
                  ? isDark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : isDenied
                    ? 'opacity-40 cursor-not-allowed bg-gray-200 text-gray-500'
                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-violet-500/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSubscribed ? (
                <><X className="w-3.5 h-3.5" /> Désactiver</>
              ) : (
                <><Bell className="w-3.5 h-3.5" /> Activer</>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
