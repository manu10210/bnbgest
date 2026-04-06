'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, Bell, BellOff, Check, CheckCheck, Trash2,
  RefreshCw, X, Send, Plus, Smartphone, Mail, MessageSquare,
  Calendar, Wrench, Star, Home, Shield, Info, AlertTriangle,
  Settings, Filter, Clock, Zap, BellRing
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotifLog {
  id: string;
  userId?: string;
  type: string;
  channel: string;
  subject?: string;
  message: string;
  sentAt: string;
  status: string;
  error?: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  new_booking:         { icon: Calendar,      color: 'bg-green-500/15 text-green-400',   label: 'Nouvelle réservation' },
  booking_cancelled:   { icon: X,             color: 'bg-red-500/15 text-red-400',       label: 'Annulation' },
  booking_modified:    { icon: Calendar,      color: 'bg-amber-500/15 text-amber-400',   label: 'Modification réservation' },
  checkin_reminder:    { icon: Home,          color: 'bg-blue-500/15 text-blue-400',     label: 'Rappel check-in' },
  checkout_reminder:   { icon: Home,          color: 'bg-indigo-500/15 text-indigo-400', label: 'Rappel check-out' },
  maintenance_urgent:  { icon: Wrench,        color: 'bg-red-500/15 text-red-400',       label: 'Maintenance urgente' },
  maintenance_due:     { icon: Wrench,        color: 'bg-amber-500/15 text-amber-400',   label: 'Maintenance à prévoir' },
  cleaning_needed:     { icon: Zap,           color: 'bg-purple-500/15 text-purple-400', label: 'Ménage à faire' },
  new_review:          { icon: Star,          color: 'bg-yellow-500/15 text-yellow-400', label: 'Nouvel avis' },
  message_received:    { icon: MessageSquare, color: 'bg-teal-500/15 text-teal-400',     label: 'Nouveau message' },
  security_alert:      { icon: Shield,        color: 'bg-red-500/15 text-red-400',       label: 'Alerte sécurité' },
  system:              { icon: Info,          color: 'bg-gray-500/15 text-gray-400',     label: 'Système' },
};

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  push:  { icon: Smartphone,     label: 'Push',   color: 'bg-blue-500/15 text-blue-400'   },
  email: { icon: Mail,           label: 'Email',  color: 'bg-green-500/15 text-green-400' },
  sms:   { icon: MessageSquare,  label: 'SMS',    color: 'bg-amber-500/15 text-amber-400' },
};

const NOTIFICATION_TYPES = Object.entries(TYPE_CONFIG).map(([value, c]) => ({ value, label: c.label }));

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "À l'instant";
  if (m < 60)  return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Push subscription hook ──────────────────────────────────────────────────

function usePushNotifications() {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [subscription, setSubscription]       = useState<PushSubscription | null>(null);
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    setIsPushSupported('serviceWorker' in navigator && 'PushManager' in window);
    // Check existing subscription
    navigator.serviceWorker?.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscription(sub));
    }).catch(() => {});
  }, []);

  const subscribe = async () => {
    setLoading(true);
    try {
      const keyRes = await fetch('/api/push/vapid-key');
      if (!keyRes.ok) { toast.error('Push non configuré sur le serveur'); return; }
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      setSubscription(sub);

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      toast.success('🔔 Notifications push activées !');
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\'activer les notifications push');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      setSubscription(null);
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      toast.success('Notifications push désactivées');
    } catch {
      toast.error('Erreur lors de la désinscription');
    } finally {
      setLoading(false);
    }
  };

  const testPush = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: {
            title: '🔔 Test BNBGest',
            body: 'Les notifications push fonctionnent correctement !',
            url: '/notifications',
            tag: 'test',
          },
        }),
      });
      const d = await res.json();
      if (d.sent > 0) toast.success('🔔 Notification push envoyée !');
      else toast.error('Aucun appareil abonné');
    } catch {
      toast.error('Erreur lors du test');
    } finally {
      setLoading(false);
    }
  };

  return { isPushSupported, subscription, loading, subscribe, unsubscribe, testPush };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router  = useRouter();
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState<NotifLog[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [filterType, setFilterType]       = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [showSend, setShowSend]           = useState(false);
  const [sending, setSending]             = useState(false);
  const [sendForm, setSendForm]           = useState({ type: 'checkin_reminder', channel: 'push', subject: '', message: '' });

  const push = usePushNotifications();

  const bg    = isDark ? 'bg-gray-950'                : 'bg-gray-50';
  const card  = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text  = isDark ? 'text-white'                 : 'text-gray-900';
  const muted = isDark ? 'text-gray-400'              : 'text-gray-500';
  const inp   = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF385C]/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C]/50';

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterType    !== 'all') params.set('type',    filterType);
      if (filterChannel !== 'all') params.set('channel', filterChannel);
      if (filterStatus  !== 'all') params.set('status',  filterStatus);

      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally   { setLoading(false); }
  }, [filterType, filterChannel, filterStatus]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      setNotifications(prev => prev.map(n => ({ ...n, status: 'sent' })));
      setUnreadCount(0);
      toast.success('Tout marqué comme lu');
    } catch { toast.error('Erreur'); }
  };

  const sendNotification = async () => {
    if (!sendForm.message.trim()) { toast.error('Le message est obligatoire'); return; }
    setSending(true);
    try {
      // Log in DB
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendForm),
      });

      // If push channel, actually send push
      if (sendForm.channel === 'push' && res.ok) {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payload: {
              title: sendForm.subject || TYPE_CONFIG[sendForm.type]?.label || 'BNBGest',
              body: sendForm.message,
              url: '/notifications',
              tag: sendForm.type,
            },
          }),
        });
      }

      if (res.ok) {
        toast.success('Notification envoyée ✅');
        setShowSend(false);
        setSendForm({ type: 'checkin_reminder', channel: 'push', subject: '', message: '' });
        fetchNotifs();
      }
    } catch { toast.error('Erreur réseau'); }
    finally   { setSending(false); }
  };

  // Quick action templates
  const QUICK_ALERTS = [
    {
      label: 'Rappel check-in demain',
      icon: '🏠',
      payload: { type: 'checkin_reminder', channel: 'push', subject: 'Check-in demain', message: 'Rappel : vous avez un check-in prévu demain. Préparez les accès et vérifiez la propriété.' },
    },
    {
      label: 'Ménage à planifier',
      icon: '🧹',
      payload: { type: 'cleaning_needed', channel: 'push', subject: 'Ménage requis', message: 'Un ménage est à planifier suite à un départ. Contactez votre équipe de nettoyage.' },
    },
    {
      label: 'Maintenance urgente',
      icon: '🔧',
      payload: { type: 'maintenance_urgent', channel: 'push', subject: 'Maintenance urgente', message: 'Une tâche de maintenance urgente requiert votre attention immédiate.' },
    },
    {
      label: 'Nouvel avis voyageur',
      icon: '⭐',
      payload: { type: 'new_review', channel: 'push', subject: 'Nouvel avis', message: 'Un voyageur a laissé un avis sur votre propriété. Consultez-le et répondez-y.' },
    },
  ];

  const sendQuick = async (p: typeof QUICK_ALERTS[0]) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p.payload),
      });
      if (push.subscription) {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: { title: p.payload.subject, body: p.payload.message, url: '/notifications', tag: p.payload.type } }),
        });
      }
      toast.success(`${p.icon} Alerte envoyée`);
      fetchNotifs();
    } catch { toast.error('Erreur'); }
  };

  const channelCounts = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.channel] = (acc[n.channel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${bg}`}>

      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <ArrowLeft size={20} className={muted} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
              <Bell size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>Notifications</h1>
              <p className={`text-xs ${muted}`}>
                {unreadCount > 0
                  ? <span className="text-[#FF385C] font-semibold">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
                  : 'Tout lu'} · {notifications.length} entrées
              </p>
            </div>
          </div>
          <ThemeToggle />
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`} title="Tout marquer comme lu">
                <CheckCheck size={18} className="text-green-400" />
              </button>
            )}
            <button onClick={() => setShowSend(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow">
              <Plus size={16} />Envoyer
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* ── Push subscription banner ────────────────────── */}
        <div className={`${card} border rounded-2xl p-4`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${push.subscription ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                {push.subscription ? <BellRing size={18} className="text-green-400" /> : <BellOff size={18} className="text-amber-400" />}
              </div>
              <div>
                <p className={`font-semibold text-sm ${text}`}>Notifications push</p>
                <p className={`text-xs ${muted}`}>
                  {!push.isPushSupported
                    ? 'Non supporté par ce navigateur'
                    : push.subscription
                      ? '✅ Abonné — vous recevez les alertes en temps réel'
                      : '⚠️ Non abonné — activez pour recevoir les alertes'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {push.isPushSupported && (
                push.subscription ? (
                  <>
                    <button onClick={push.testPush} disabled={push.loading} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${isDark ? 'bg-white/5 text-gray-300 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      Tester
                    </button>
                    <button onClick={push.unsubscribe} disabled={push.loading} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition">
                      Désactiver
                    </button>
                  </>
                ) : (
                  <button onClick={push.subscribe} disabled={push.loading} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#FF385C] text-white hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                    {push.loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '🔔 Activer les notifications'}
                  </button>
                )
              )}
              <button onClick={() => router.push('/settings/notifications')} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition`} title="Paramètres notifications">
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(channelCounts).slice(0, 3).map(([ch, count]) => {
            const cfg = CHANNEL_CONFIG[ch] || { icon: Bell, label: ch, color: 'bg-gray-500/15 text-gray-400' };
            const ChIcon = cfg.icon;
            return (
              <div key={ch} className={`${card} border rounded-2xl p-4`}>
                <div className={`w-8 h-8 rounded-xl ${cfg.color} flex items-center justify-center mb-2`}><ChIcon size={15} /></div>
                <p className={`text-2xl font-bold ${text}`}>{count}</p>
                <p className={`text-xs ${muted}`}>{cfg.label}</p>
              </div>
            );
          })}
          {Object.keys(channelCounts).length === 0 && (
            [
              { icon: Smartphone, label: 'Push',  color: 'bg-blue-500/15 text-blue-400' },
              { icon: Mail,       label: 'Email', color: 'bg-green-500/15 text-green-400' },
              { icon: MessageSquare, label: 'SMS', color: 'bg-amber-500/15 text-amber-400' },
            ].map((s, i) => (
              <div key={i} className={`${card} border rounded-2xl p-4`}>
                <div className={`w-8 h-8 rounded-xl ${s.color} flex items-center justify-center mb-2`}><s.icon size={15} /></div>
                <p className={`text-2xl font-bold ${text}`}>0</p>
                <p className={`text-xs ${muted}`}>{s.label}</p>
              </div>
            ))
          )}
        </div>

        {/* ── Quick alerts ────────────────────────────────── */}
        <div className={`${card} border rounded-2xl p-4`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${muted} mb-3`}>Alertes rapides</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_ALERTS.map((qa, i) => (
              <button key={i} onClick={() => sendQuick(qa)} className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center transition ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>
                <span className="text-2xl">{qa.icon}</span>
                <span className={`text-xs font-medium ${text}`}>{qa.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Tous types</option>
            {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Tous canaux</option>
            <option value="push">Push</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Tous statuts</option>
            <option value="sent">Envoyé</option>
            <option value="pending">En attente</option>
            <option value="failed">Échec</option>
          </select>
          <button onClick={fetchNotifs} className={`p-2.5 rounded-xl border ${card} ${muted} hover:text-[#FF385C] transition`}>
            <RefreshCw size={15} />
          </button>
        </div>

        {/* ── Notification list ────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className={`${card} border rounded-2xl p-12 text-center`}>
            <Bell size={40} className="mx-auto mb-3 text-gray-400" />
            <p className={`font-semibold ${text}`}>Aucune notification</p>
            <p className={`text-sm ${muted} mt-1 mb-4`}>Envoyez votre première alerte pour la voir apparaître ici.</p>
            <button onClick={() => setShowSend(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition">
              <Plus size={16} />Envoyer une notification
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const tCfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              const chCfg = CHANNEL_CONFIG[n.channel] || CHANNEL_CONFIG.push;
              const TIcon = tCfg.icon;
              const ChIcon = chCfg.icon;
              const isPending = n.status === 'pending';

              return (
                <div key={n.id} className={`${card} border rounded-2xl px-4 py-3.5 ${isPending ? isDark ? 'border-[#FF385C]/20' : 'border-[#FF385C]/30' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tCfg.color}`}>
                      <TIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {n.subject && <span className={`font-semibold text-sm ${text}`}>{n.subject}</span>}
                        {!n.subject && <span className={`font-semibold text-sm ${text}`}>{tCfg.label}</span>}
                        {isPending && <span className="px-1.5 py-0.5 rounded-md bg-[#FF385C]/15 text-[#FF385C] text-[10px] font-medium">Nouveau</span>}
                        {n.status === 'failed' && <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[10px] font-medium flex items-center gap-1"><AlertTriangle size={9} />Échec</span>}
                      </div>
                      <p className={`text-xs mt-0.5 ${muted}`}>{n.message}</p>
                      <div className={`flex items-center gap-2 mt-1.5 text-[10px] ${muted}`}>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${chCfg.color}`}>
                          <ChIcon size={9} />{chCfg.label}
                        </span>
                        <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(n.sentAt)}</span>
                        {n.error && <span className="text-red-400 truncate">{n.error}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Send Modal ───────────────────────────────────── */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSend(false)} />
          <div className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[85vh] ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
              <h2 className={`font-bold text-lg ${text}`}>Envoyer une notification</h2>
              <button onClick={() => setShowSend(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}><X size={18} className={muted} /></button>
            </div>
            <div className="px-5 pb-6 pt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Type</label>
                <select value={sendForm.type} onChange={e => setSendForm(f => ({ ...f, type: e.target.value }))} className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`}>
                  {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Canal</label>
                <div className="flex gap-2">
                  {['push','email','sms'].map(ch => {
                    const cfg = CHANNEL_CONFIG[ch];
                    const CIcon = cfg.icon;
                    return (
                      <button key={ch} onClick={() => setSendForm(f => ({ ...f, channel: ch }))} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition ${sendForm.channel === ch ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        <CIcon size={13} />{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Titre</label>
                <input value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Titre de la notification" className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
              </div>
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Message *</label>
                <textarea value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Contenu de la notification..." rows={3}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`} />
              </div>
              {sendForm.channel === 'push' && !push.subscription && (
                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} border`}>
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    Vous n'êtes pas abonné aux notifications push sur cet appareil. La notification sera enregistrée mais pas envoyée.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={sendNotification} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                  {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                  Envoyer
                </button>
                <button onClick={() => setShowSend(false)} className={`px-5 py-3 rounded-xl text-sm font-medium ${isDark ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition`}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
