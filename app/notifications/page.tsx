'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { useBNB } from '../../contexts/BNBContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, Bell, BellOff, Check, CheckCheck, Trash2,
  RefreshCw, X, Send, Plus, Smartphone, Mail, MessageSquare,
  Calendar, Wrench, Star, Home, Shield, Info, AlertTriangle,
  Settings, Filter, Clock, Zap, BellRing, Search, TrendingUp,
  Package, User, ChevronRight, ArrowRight, Layers, Activity,
  CheckCircle, BarChart2, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';
import { motion, AnimatePresence } from 'framer-motion';

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

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; bg: string }> = {
  new_booking:        { icon: Calendar,      color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Nouvelle réservation' },
  booking_cancelled:  { icon: X,             color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Annulation' },
  booking_modified:   { icon: Calendar,      color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Modification réservation' },
  checkin_reminder:   { icon: Home,          color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Rappel check-in' },
  checkout_reminder:  { icon: ArrowRight,    color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  label: 'Rappel check-out' },
  maintenance_urgent: { icon: Wrench,        color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Maintenance urgente' },
  maintenance_due:    { icon: Wrench,        color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Maintenance à prévoir' },
  cleaning_needed:    { icon: Zap,           color: 'text-purple-400',  bg: 'bg-purple-500/15',  label: 'Ménage à faire' },
  new_review:         { icon: Star,          color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  label: 'Nouvel avis' },
  message_received:   { icon: MessageSquare, color: 'text-teal-400',    bg: 'bg-teal-500/15',    label: 'Nouveau message' },
  security_alert:     { icon: Shield,        color: 'text-red-400',     bg: 'bg-red-500/15',     label: 'Alerte sécurité' },
  system:             { icon: Info,          color: 'text-gray-400',    bg: 'bg-gray-500/15',    label: 'Système' },
};

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  push:  { icon: Smartphone,    label: 'Push',  color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
  email: { icon: Mail,          label: 'Email', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  sms:   { icon: MessageSquare, label: 'SMS',   color: 'text-amber-400',   bg: 'bg-amber-500/15'  },
};

const NOTIFICATION_TYPES = Object.entries(TYPE_CONFIG).map(([value, c]) => ({ value, label: c.label }));

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function usePushNotifications() {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [subscription, setSubscription]       = useState<PushSubscription | null>(null);
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    setIsPushSupported('serviceWorker' in navigator && 'PushManager' in window);
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
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      setSubscription(sub);
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      toast.success('🔔 Notifications push activées !');
    } catch { toast.error("Impossible d'activer les notifications push"); }
    finally { setLoading(false); }
  };

  const unsubscribe = async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      setSubscription(null);
      await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint }) });
      toast.success('Notifications push désactivées');
    } catch { toast.error('Erreur lors de la désinscription'); }
    finally { setLoading(false); }
  };

  const testPush = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { title: '🔔 Test BNBGest', body: 'Les notifications push fonctionnent correctement !', url: '/notifications', tag: 'test' } }) });
      const d = await res.json();
      if (d.sent > 0) toast.success('🔔 Notification push envoyée !');
      else toast.error('Aucun appareil abonné');
    } catch { toast.error('Erreur lors du test'); }
    finally { setLoading(false); }
  };

  return { isPushSupported, subscription, loading, subscribe, unsubscribe, testPush };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { bookings, maintenanceTasks, inventory, getProperty } = useBNB();

  const [notifications, setNotifications] = useState<NotifLog[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [filterType, setFilterType]       = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [showSend, setShowSend]           = useState(false);
  const [sending, setSending]             = useState(false);
  const [sendForm, setSendForm]           = useState({ type: 'checkin_reminder', channel: 'push', subject: '', message: '' });
  const [expanded, setExpanded]           = useState<string | null>(null);
  const [showStats, setShowStats]         = useState(true);

  const push = usePushNotifications();

  // Live digest from BNBContext
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }, []);

  const digest = useMemo(() => {
    const checkinToday  = bookings.filter(b => b.checkIn  === today    && (b.status === 'confirmed' || b.status === 'pending'));
    const checkoutToday = bookings.filter(b => b.checkOut === today    && (b.status === 'confirmed' || b.status === 'completed'));
    const checkinTomorrow = bookings.filter(b => b.checkIn === tomorrow && b.status === 'confirmed');
    const urgentTasks   = maintenanceTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.scheduledDate) < new Date());
    const criticalStock = inventory.filter(i => i.quantity <= i.minimumQuantity);
    return { checkinToday, checkoutToday, checkinTomorrow, urgentTasks, criticalStock };
  }, [bookings, maintenanceTasks, inventory, today, tomorrow]);

  // styles
  const C  = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T  = isDark ? 'text-white' : 'text-gray-900';
  const M  = isDark ? 'text-white/50' : 'text-gray-400';
  const S  = isDark ? 'text-white/70' : 'text-gray-600';
  const inp = isDark
    ? 'bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#FF385C]/50'
    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C]/50';

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterType    !== 'all') params.set('type',    filterType);
      if (filterChannel !== 'all') params.set('channel', filterChannel);
      if (filterStatus  !== 'all') params.set('status',  filterStatus);
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) { const d = await res.json(); setNotifications(d.notifications || []); setUnreadCount(d.unreadCount || 0); }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
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
      const res = await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sendForm) });
      if (sendForm.channel === 'push' && res.ok) {
        await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { title: sendForm.subject || TYPE_CONFIG[sendForm.type]?.label || 'BNBGest', body: sendForm.message, url: '/notifications', tag: sendForm.type } }) });
      }
      if (res.ok) { toast.success('Notification envoyée ✅'); setShowSend(false); setSendForm({ type: 'checkin_reminder', channel: 'push', subject: '', message: '' }); fetchNotifs(); }
    } catch { toast.error('Erreur réseau'); }
    finally { setSending(false); }
  };

  const QUICK_ALERTS = [
    { label: 'Check-in demain',   icon: '🏠', emoji: true, payload: { type: 'checkin_reminder',  channel: 'push', subject: 'Check-in demain',    message: 'Rappel : check-in prévu demain. Préparez les accès et vérifiez la propriété.' } },
    { label: 'Ménage requis',     icon: '🧹', emoji: true, payload: { type: 'cleaning_needed',    channel: 'push', subject: 'Ménage requis',       message: 'Un ménage est à planifier suite à un départ.' } },
    { label: 'Maintenance',       icon: '🔧', emoji: true, payload: { type: 'maintenance_urgent', channel: 'push', subject: 'Maintenance urgente', message: 'Une tâche de maintenance urgente requiert votre attention.' } },
    { label: 'Nouvel avis',       icon: '⭐', emoji: true, payload: { type: 'new_review',         channel: 'push', subject: 'Nouvel avis',         message: 'Un voyageur a laissé un avis. Consultez-le et répondez.' } },
  ];

  const sendQuick = async (p: typeof QUICK_ALERTS[0]) => {
    try {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.payload) });
      if (push.subscription) await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: { title: p.payload.subject, body: p.payload.message, url: '/notifications', tag: p.payload.type } }) });
      toast.success(`${p.icon} Alerte envoyée`);
      fetchNotifs();
    } catch { toast.error('Erreur'); }
  };

  const channelCounts = useMemo(() => notifications.reduce<Record<string, number>>((acc, n) => { acc[n.channel] = (acc[n.channel] || 0) + 1; return acc; }, {}), [notifications]);
  const typeCounts    = useMemo(() => notifications.reduce<Record<string, number>>((acc, n) => { acc[n.type]    = (acc[n.type]    || 0) + 1; return acc; }, {}), [notifications]);
  const failedCount   = useMemo(() => notifications.filter(n => n.status === 'failed').length, [notifications]);

  const filtered = useMemo(() => {
    let list = notifications;
    if (searchQuery) list = list.filter(n => (n.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()) || n.type.toLowerCase().includes(searchQuery.toLowerCase()));
    return list;
  }, [notifications, searchQuery]);

  // Last 7 days activity chart (simple bars)
  const last7 = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = notifications.filter(n => n.sentAt.startsWith(key)).length;
      days.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'short' }), count });
    }
    return days;
  }, [notifications]);
  const maxDay = Math.max(...last7.map(d => d.count), 1);

  return (
    <div className={`flex h-screen ${isDark ? 'bg-[#0d0d1a]' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Sticky Header ── */}
        <header className={`sticky top-0 z-40 backdrop-blur-md border-b ${isDark ? 'bg-[#0d0d1a]/90 border-white/[0.07]' : 'bg-white/90 border-gray-200'}`}>
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-gray-100'}`}>
              <ArrowLeft size={20} className={M} />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center shadow-lg shadow-[#FF385C]/25">
                <Bell size={17} className="text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-base ${T}`}>Notifications</h1>
                <p className={`text-xs ${M}`}>
                  {unreadCount > 0 ? <span className="text-[#FF385C] font-semibold">{unreadCount} non lu{unreadCount > 1 ? 's' : ''} · </span> : ''}{notifications.length} entrées
                </p>
              </div>
            </div>
            <ThemeToggle />
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Tout marquer comme lu" className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-gray-100'}`}>
                  <CheckCheck size={18} className="text-emerald-400" />
                </button>
              )}
              <button onClick={() => setShowSend(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow-lg shadow-[#FF385C]/25">
                <Plus size={15} />Envoyer
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

            {/* ── Live Digest Banner ── */}
            {(digest.checkinToday.length > 0 || digest.checkoutToday.length > 0 || digest.urgentTasks.length > 0 || digest.criticalStock.length > 0) && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`${C} p-4 border-l-4 border-[#FF385C]`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF385C]/15 flex items-center justify-center flex-shrink-0"><Activity className="w-4 h-4 text-[#FF385C]" /></div>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${T} mb-2`}>Résumé du jour — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <div className="flex flex-wrap gap-2">
                      {digest.checkinToday.length > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium">🏠 {digest.checkinToday.length} arrivée{digest.checkinToday.length > 1 ? 's' : ''}</span>}
                      {digest.checkoutToday.length > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 font-medium">🚪 {digest.checkoutToday.length} départ{digest.checkoutToday.length > 1 ? 's' : ''}</span>}
                      {digest.checkinTomorrow.length > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/15 text-blue-400 font-medium">📅 {digest.checkinTomorrow.length} arrivée{digest.checkinTomorrow.length > 1 ? 's' : ''} demain</span>}
                      {digest.urgentTasks.length > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-red-500/15 text-red-400 font-medium">🔧 {digest.urgentTasks.length} tâche{digest.urgentTasks.length > 1 ? 's' : ''} urgente{digest.urgentTasks.length > 1 ? 's' : ''}</span>}
                      {digest.criticalStock.length > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-orange-500/15 text-orange-400 font-medium">📦 {digest.criticalStock.length} stock{digest.criticalStock.length > 1 ? 's' : ''} critique{digest.criticalStock.length > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Push Banner ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }} className={`${C} p-4`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${push.subscription ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
                    {push.subscription ? <BellRing size={18} className="text-emerald-400" /> : <BellOff size={18} className="text-amber-400" />}
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${T}`}>Notifications push</p>
                    <p className={`text-xs ${M}`}>{!push.isPushSupported ? 'Non supporté par ce navigateur' : push.subscription ? '✅ Abonné — alertes en temps réel actives' : '⚠️ Non abonné — activez pour recevoir les alertes'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {push.isPushSupported && (push.subscription ? (
                    <>
                      <button onClick={push.testPush} disabled={push.loading} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${SC}`}>Tester</button>
                      <button onClick={push.unsubscribe} disabled={push.loading} className="px-3 py-1.5 rounded-xl text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 transition">Désactiver</button>
                    </>
                  ) : (
                    <button onClick={push.subscribe} disabled={push.loading} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#FF385C] text-white hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                      {push.loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '�� Activer'}
                    </button>
                  ))}
                  <button onClick={() => router.push('/settings/notifications')} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/[0.07] text-white/40' : 'hover:bg-gray-100 text-gray-400'}`} title="Paramètres">
                    <Settings size={15} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Stats Grid ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}>
              <button onClick={() => setShowStats(s => !s)} className={`flex items-center gap-2 mb-3 ${M} text-xs font-bold uppercase tracking-wider`}>
                <BarChart2 size={13} />{showStats ? 'Masquer' : 'Afficher'} les statistiques {showStats ? <ChevronRight size={13} className="rotate-90" /> : <ChevronRight size={13} />}
              </button>
              <AnimatePresence>
                {showStats && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Total envoyées', value: notifications.length, icon: <Bell size={16} />, color: '#FF385C' },
                        { label: 'Non lues', value: unreadCount, icon: <BellRing size={16} />, color: '#f59e0b' },
                        { label: 'Échecs', value: failedCount, icon: <AlertTriangle size={16} />, color: '#ef4444' },
                        { label: 'Push actif', value: push.subscription ? 'OUI' : 'NON', icon: <Smartphone size={16} />, color: push.subscription ? '#22c55e' : '#6b7280' },
                      ].map((stat, i) => (
                        <motion.div key={i} whileHover={{ scale: 1.03 }} className={`${C} p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + '20', color: stat.color }}>{stat.icon}</div>
                          </div>
                          <p className={`text-2xl font-bold ${T}`}>{stat.value}</p>
                          <p className={`text-xs ${M} mt-0.5`}>{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Activity chart last 7 days */}
                    <div className={`${C} p-4`}>
                      <p className={`text-xs font-bold uppercase tracking-wider ${M} mb-4`}>Activité — 7 derniers jours</p>
                      <div className="flex items-end gap-2 h-16">
                        {last7.map((day, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className={`text-[9px] font-bold ${M}`}>{day.count > 0 ? day.count : ''}</span>
                            <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(4, (day.count / maxDay) * 48)}px`, backgroundColor: i === 6 ? '#FF385C' : isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb' }} />
                            <span className={`text-[9px] ${M} capitalize`}>{day.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Channel breakdown */}
                    <div className={`${C} p-4`}>
                      <p className={`text-xs font-bold uppercase tracking-wider ${M} mb-3`}>Répartition par canal</p>
                      <div className="grid grid-cols-3 gap-3">
                        {['push', 'email', 'sms'].map(ch => {
                          const cfg = CHANNEL_CONFIG[ch];
                          const ChIcon = cfg.icon;
                          const count = channelCounts[ch] || 0;
                          const pct = notifications.length > 0 ? Math.round((count / notifications.length) * 100) : 0;
                          return (
                            <div key={ch} className={`${SC} p-3`}>
                              <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center mb-2`}><ChIcon size={13} className={cfg.color} /></div>
                              <p className={`text-xl font-bold ${T}`}>{count}</p>
                              <p className={`text-xs ${M}`}>{cfg.label}</p>
                              <div className={`mt-2 h-1 rounded-full ${isDark ? 'bg-white/[0.07]' : 'bg-gray-100'}`}>
                                <div className="h-full rounded-full bg-[#FF385C] transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Quick Alerts ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }} className={`${C} p-4`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${M} mb-3`}>Alertes rapides</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_ALERTS.map((qa, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={() => sendQuick(qa)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl text-center transition ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06]' : 'bg-gray-50 hover:bg-gray-100 border border-gray-100'}`}>
                    <span className="text-2xl">{qa.icon}</span>
                    <span className={`text-xs font-medium ${S}`}>{qa.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* ── Filters + Search ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }} className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${M}`} />
                <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 ${inp}`} />
              </div>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${inp}`}>
                <option value="all">Tous types</option>
                {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${inp}`}>
                <option value="all">Tous canaux</option>
                <option value="push">Push</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`px-3 py-2.5 rounded-xl text-sm border focus:outline-none ${inp}`}>
                <option value="all">Tous statuts</option>
                <option value="sent">Envoyé</option>
                <option value="pending">En attente</option>
                <option value="failed">Échec</option>
              </select>
              <button onClick={fetchNotifs} className={`p-2.5 rounded-xl border transition ${isDark ? 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/40' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-400'}`}>
                <RefreshCw size={15} />
              </button>
            </motion.div>

            {/* ── Notification List ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}>
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className={`${C} p-12 text-center`}>
                  <Bell size={40} className={`mx-auto mb-3 ${M} opacity-30`} />
                  <p className={`font-semibold ${T}`}>{searchQuery ? 'Aucun résultat' : 'Aucune notification'}</p>
                  <p className={`text-sm ${M} mt-1 mb-4`}>{searchQuery ? 'Modifiez votre recherche.' : 'Envoyez votre première alerte pour la voir apparaître ici.'}</p>
                  {!searchQuery && (
                    <button onClick={() => setShowSend(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition">
                      <Plus size={15} />Envoyer une notification
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className={`text-xs ${M} mb-1`}>{filtered.length} notification{filtered.length > 1 ? 's' : ''}</p>
                  <AnimatePresence>
                    {filtered.map((n, idx) => {
                      const tCfg  = TYPE_CONFIG[n.type]  || TYPE_CONFIG.system;
                      const chCfg = CHANNEL_CONFIG[n.channel] || CHANNEL_CONFIG.push;
                      const TIcon  = tCfg.icon;
                      const ChIcon = chCfg.icon;
                      const isPending = n.status === 'pending';
                      const isFailed  = n.status === 'failed';
                      const isExp = expanded === n.id;

                      return (
                        <motion.div key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.015 } }} whileHover={{ scale: 1.003 }}
                          className={`${C} overflow-hidden cursor-pointer transition-all ${isPending ? isDark ? 'border-l-2 border-l-[#FF385C]' : 'border-l-2 border-l-[#FF385C]' : ''} ${isFailed ? isDark ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-red-400' : ''}`}
                          onClick={() => setExpanded(isExp ? null : n.id)}>
                          <div className="px-4 py-3.5 flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tCfg.bg}`}>
                              <TIcon size={15} className={tCfg.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className={`font-semibold text-sm ${T}`}>{n.subject || tCfg.label}</span>
                                {isPending && <span className="px-1.5 py-0.5 rounded-md bg-[#FF385C]/15 text-[#FF385C] text-[9px] font-bold">NOUVEAU</span>}
                                {isFailed  && <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[9px] font-bold flex items-center gap-0.5"><AlertTriangle size={8} />ÉCHEC</span>}
                              </div>
                              <p className={`text-xs leading-relaxed ${S}`}>{n.message}</p>
                              <div className={`flex items-center gap-2 mt-1.5 text-[10px] ${M}`}>
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${chCfg.bg} ${chCfg.color} font-medium`}><ChIcon size={8} />{chCfg.label}</span>
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${tCfg.bg} ${tCfg.color} font-medium`}>{tCfg.label}</span>
                                <span className="flex items-center gap-0.5 ml-auto"><Clock size={9} />{timeAgo(n.sentAt)}</span>
                              </div>
                            </div>
                            <ChevronRight size={14} className={`flex-shrink-0 transition-transform ${isExp ? 'rotate-90' : ''} ${M}`} />
                          </div>
                          <AnimatePresence>
                            {isExp && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                className={`overflow-hidden border-t px-4 py-3 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                                <p className={`text-xs ${S} font-mono`}>{new Date(n.sentAt).toLocaleString('fr-FR')}</p>
                                {n.error && <p className="text-xs text-red-400 mt-1">{n.error}</p>}
                                {n.userId && <p className={`text-xs ${M} mt-1`}>User: {n.userId}</p>}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Send Modal ── */}
        <AnimatePresence>
          {showSend && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSend(false)} />
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[85vh] ${isDark ? 'bg-[#1a1a2e] border border-white/[0.08]' : 'bg-white border border-gray-200'}`}>
                <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/[0.07]' : 'border-gray-100'}`}>
                  <h2 className={`font-bold text-lg ${T}`}>Envoyer une notification</h2>
                  <button onClick={() => setShowSend(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-gray-100'}`}><X size={18} className={M} /></button>
                </div>
                <div className="px-5 pb-6 pt-4 space-y-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wide ${M} mb-1.5`}>Type</label>
                    <select value={sendForm.type} onChange={e => setSendForm(f => ({ ...f, type: e.target.value }))} className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`}>
                      {NOTIFICATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wide ${M} mb-1.5`}>Canal</label>
                    <div className="flex gap-2">
                      {['push','email','sms'].map(ch => {
                        const cfg = CHANNEL_CONFIG[ch]; const CIcon = cfg.icon;
                        return <button key={ch} onClick={() => setSendForm(f => ({ ...f, channel: ch }))} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition ${sendForm.channel === ch ? 'bg-[#FF385C] text-white shadow' : isDark ? 'bg-white/[0.06] text-white/50' : 'bg-gray-100 text-gray-600'}`}><CIcon size={12} />{cfg.label}</button>;
                      })}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wide ${M} mb-1.5`}>Titre</label>
                    <input value={sendForm.subject} onChange={e => setSendForm(f => ({ ...f, subject: e.target.value }))} placeholder="Titre de la notification" className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#FF385C]/20 ${inp}`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wide ${M} mb-1.5`}>Message *</label>
                    <textarea value={sendForm.message} onChange={e => setSendForm(f => ({ ...f, message: e.target.value }))} placeholder="Contenu de la notification..." rows={3} className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-[#FF385C]/20 ${inp}`} />
                  </div>
                  {sendForm.channel === 'push' && !push.subscription && (
                    <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                      <AlertTriangle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Vous n'êtes pas abonné aux push sur cet appareil. La notification sera enregistrée uniquement.</p>
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button onClick={sendNotification} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                      {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}Envoyer
                    </button>
                    <button onClick={() => setShowSend(false)} className={`px-5 py-3 rounded-xl text-sm font-medium transition ${isDark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Annuler</button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}