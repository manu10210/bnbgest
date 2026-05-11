'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellRing, Calendar, CheckCircle, AlertTriangle, Package, Star,
  Mail, Trash2, X, Clock, User, Info, RefreshCw, Search, Pin, PinOff,
  AlarmClock, ChevronDown, ChevronUp, Building2, TrendingDown, Zap,
  Euro, Eye, EyeOff, MoreHorizontal, CheckSquare, Square, Filter,
  ArrowRight, BedDouble, Wrench, ShoppingCart
} from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'booking_confirmed' | 'checkin_reminder' | 'checkout_reminder' | 'review_request'
      | 'low_stock' | 'overdue_task' | 'payment_received' | 'cancellation'
      | 'gap_alert' | 'revenue_alert' | 'price_suggestion' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  pinned?: boolean;
  snoozedUntil?: string;
  propertyId?: number;
  bookingId?: number;
  priority: 'low' | 'medium' | 'high';
  emailSent?: boolean;
  emailTo?: string;
  actionLabel?: string;
  actionData?: string;
}

function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try { const s = localStorage.getItem('bnbgest_notifications'); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveNotifications(n: AppNotification[]) {
  if (typeof window !== 'undefined') localStorage.setItem('bnbgest_notifications', JSON.stringify(n));
}
const APP_STATE_KEY = 'notification_center_items';

async function loadNotificationsFromDb(): Promise<AppNotification[] | null> {
  try {
    const res = await fetch(`/api/app-state?key=${encodeURIComponent(APP_STATE_KEY)}`, { credentials: 'include' });
    if (!res.ok) return null;
    const payload = await res.json();
    return Array.isArray(payload?.value) ? (payload.value as AppNotification[]) : null;
  } catch { return null; }
}
async function saveNotificationsToDb(notifications: AppNotification[]) {
  try {
    await fetch('/api/app-state', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: APP_STATE_KEY, value: notifications }) });
  } catch { /* silent */ }
}

interface NotificationCenterProps { onRequestSettings?: () => void; }

export default function NotificationCenter({ onRequestSettings }: NotificationCenterProps) {
  const { bookings, maintenanceTasks, inventory, getProperty, properties, reviews } = useBNB();
  const { isDark } = useTheme();
  const now = useMemo(() => new Date(), []);
  const today = now.toISOString().split('T')[0];
  const tomorrow = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }, [now]);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadNotifications());
  const hydratedRef = useRef(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'feed' | 'agenda' | 'email'>('agenda');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const remote = await loadNotificationsFromDb();
      if (!cancelled && remote && remote.length > 0) setNotifications(remote);
      if (!cancelled) hydratedRef.current = true;
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    saveNotifications(notifications);
    if (!hydratedRef.current) return;
    const t = setTimeout(() => void saveNotificationsToDb(notifications), 400);
    return () => clearTimeout(t);
  }, [notifications]);

  /* ── AGENDA (live from real data) ── */
  const agenda = useMemo(() => {
    const checkinToday = bookings.filter(b => b.checkIn === today && (b.status === 'confirmed' || b.status === 'pending'));
    const checkoutToday = bookings.filter(b => b.checkOut === today && (b.status === 'confirmed' || b.status === 'completed'));
    const checkinTomorrow = bookings.filter(b => b.checkIn === tomorrow && b.status === 'confirmed');
    const overdueTasks = maintenanceTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.scheduledDate) < now);
    const urgentStock = inventory.filter(i => i.quantity <= i.minimumQuantity);
    const gaps: { propertyId: number; name: string; from: string; to: string; nights: number }[] = [];
    properties.forEach(p => {
      const pb = bookings.filter(b => b.propertyId === p.id && (b.status === 'confirmed' || b.status === 'completed')).sort((a, b) => a.checkOut.localeCompare(b.checkOut));
      for (let i = 0; i < pb.length - 1; i++) {
        const endA = new Date(pb[i].checkOut); const startB = new Date(pb[i + 1].checkIn);
        const nights = Math.round((startB.getTime() - endA.getTime()) / 86400000);
        if (nights >= 2 && nights <= 5 && pb[i].checkOut >= today) {
          gaps.push({ propertyId: p.id, name: p.name, from: pb[i].checkOut, to: pb[i + 1].checkIn, nights });
        }
      }
    });
    return { checkinToday, checkoutToday, checkinTomorrow, overdueTasks, urgentStock, gaps };
  }, [bookings, maintenanceTasks, inventory, properties, today, tomorrow, now]);

  /* ── AUTO-GENERATE NOTIFICATIONS ── */
  const generateAutoNotifications = useCallback(() => {
    const n = new Date();
    const td = n.toISOString().split('T')[0];
    const tm = new Date(n.getTime() + 86400000).toISOString().split('T')[0];
    const newNotifs: AppNotification[] = [];
    const existingIds = new Set(notifications.map(x => x.id));

    bookings.filter(b => b.status === 'confirmed' && b.checkIn === tm).forEach(b => {
      const id = `checkin_${b.id}_${tm}`;
      if (!existingIds.has(id)) {
        const prop = getProperty(b.propertyId);
        newNotifs.push({ id, type: 'checkin_reminder', title: 'Arrivee Demain', message: `${b.guestInfo.name} arrive demain a ${prop?.name || '#' + b.propertyId}.`, createdAt: n.toISOString(), read: false, propertyId: b.propertyId, bookingId: b.id, priority: 'high', emailSent: true, emailTo: b.guestInfo.email });
      }
    });
    bookings.filter(b => (b.status === 'confirmed' || b.status === 'completed') && b.checkOut === td).forEach(b => {
      const id = `checkout_${b.id}_${td}`;
      if (!existingIds.has(id)) {
        const prop = getProperty(b.propertyId);
        newNotifs.push({ id, type: 'checkout_reminder', title: 'Depart Aujourd hui', message: `${b.guestInfo.name} quitte ${prop?.name} avant ${prop?.checkOutTime || '11:00'}.`, createdAt: n.toISOString(), read: false, propertyId: b.propertyId, bookingId: b.id, priority: 'medium', emailSent: true, emailTo: b.guestInfo.email });
      }
    });
    bookings.filter(b => { const ca = new Date(b.createdAt); return b.status === 'confirmed' && ca > new Date(n.getTime() - 3600000); }).forEach(b => {
      const id = `booking_${b.id}`;
      if (!existingIds.has(id)) newNotifs.push({ id, type: 'booking_confirmed', title: 'Nouvelle Reservation', message: `${b.guestInfo.name} a reserve pour ${b.totalPrice}EUR (${new Date(b.checkIn).toLocaleDateString('fr-FR')} - ${new Date(b.checkOut).toLocaleDateString('fr-FR')}).`, createdAt: n.toISOString(), read: false, propertyId: b.propertyId, bookingId: b.id, priority: 'high', emailSent: true, emailTo: b.guestInfo.email });
    });
    bookings.filter(b => { if (b.status !== 'completed') return false; const t3 = new Date(b.checkOut); t3.setDate(t3.getDate() + 3); const t4 = new Date(t3.getTime() + 86400000); return n >= t3 && n < t4; }).forEach(b => {
      const id = `review_${b.id}`;
      if (!existingIds.has(id)) newNotifs.push({ id, type: 'review_request', title: 'Demande d avis', message: `Le sejour de ${b.guestInfo.name} est termine. Demandez un avis 5 etoiles !`, createdAt: n.toISOString(), read: false, propertyId: b.propertyId, bookingId: b.id, priority: 'low', emailSent: false, emailTo: b.guestInfo.email });
    });
    maintenanceTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.scheduledDate) < n).forEach(t => {
      const id = `overdue_${t.id}_${td}`;
      if (!existingIds.has(id)) newNotifs.push({ id, type: 'overdue_task', title: 'Tache en Retard', message: `"${t.title}" aurait du etre terminee le ${new Date(t.scheduledDate).toLocaleDateString('fr-FR')}.`, createdAt: n.toISOString(), read: false, propertyId: t.propertyId, priority: t.priority === 'urgent' ? 'high' : 'medium' });
    });
    inventory.filter(i => i.quantity <= i.minimumQuantity).forEach(item => {
      const id = `lowstock_${item.id}_${td}`;
      if (!existingIds.has(id)) { const prop = getProperty(item.propertyId); newNotifs.push({ id, type: 'low_stock', title: 'Stock Critique', message: `Il ne reste que ${item.quantity} ${item.unit} de "${item.name}" a ${prop?.name}.`, createdAt: n.toISOString(), read: false, propertyId: item.propertyId, priority: item.quantity === 0 ? 'high' : 'medium' }); }
    });
    // Gap alerts
    properties.forEach(p => {
      const pb = bookings.filter(b => b.propertyId === p.id && (b.status === 'confirmed' || b.status === 'completed')).sort((a, b) => a.checkOut.localeCompare(b.checkOut));
      for (let i = 0; i < pb.length - 1; i++) {
        const nights = Math.round((new Date(pb[i + 1].checkIn).getTime() - new Date(pb[i].checkOut).getTime()) / 86400000);
        if (nights >= 2 && nights <= 4 && pb[i].checkOut >= td) {
          const id = `gap_${p.id}_${pb[i].checkOut}`;
          if (!existingIds.has(id)) newNotifs.push({ id, type: 'gap_alert', title: 'Creux detecte', message: `${p.name}: ${nights} nuits libres entre le ${new Date(pb[i].checkOut).toLocaleDateString('fr-FR')} et le ${new Date(pb[i + 1].checkIn).toLocaleDateString('fr-FR')}. Considerez une promo flash.`, createdAt: n.toISOString(), read: false, propertyId: p.id, priority: 'medium', actionLabel: 'Voir les tarifs' });
        }
      }
    });
    if (newNotifs.length > 0) setNotifications(prev => [...newNotifs, ...prev]);
  }, [bookings, maintenanceTasks, inventory, properties, notifications, getProperty]);

  useEffect(() => {
    generateAutoNotifications();
    const interval = setInterval(generateAutoNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── COMPUTED ── */
  const activeNotifications = useMemo(() => {
    const now2 = new Date().toISOString();
    return notifications.filter(n => !n.snoozedUntil || n.snoozedUntil < now2);
  }, [notifications]);

  const unreadCount = useMemo(() => activeNotifications.filter(n => !n.read).length, [activeNotifications]);

  const filteredNotifications = useMemo(() => {
    let list = activeNotifications;
    if (searchQuery) list = list.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === 'unread') list = list.filter(n => !n.read);
    else if (filterType !== 'all') list = list.filter(n => n.type === filterType);
    // Pinned first, then by date
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeNotifications, filterType, searchQuery]);

  const yesterday = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; }, [now]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { label: string; items: AppNotification[] }[] = [];
    const pinned = filteredNotifications.filter(n => n.pinned);
    const rest = filteredNotifications.filter(n => !n.pinned);
    if (pinned.length) groups.push({ label: 'Epinglees', items: pinned });
    const todayItems = rest.filter(n => n.createdAt.startsWith(today));
    const yesterdayItems = rest.filter(n => n.createdAt.startsWith(yesterday));
    const weekItems = rest.filter(n => { const d = n.createdAt.split('T')[0]; return d < yesterday && d >= new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]; });
    const olderItems = rest.filter(n => n.createdAt.split('T')[0] < new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0]);
    if (todayItems.length) groups.push({ label: "Aujourd hui (" + todayItems.length + ")", items: todayItems });
    if (yesterdayItems.length) groups.push({ label: "Hier", items: yesterdayItems });
    if (weekItems.length) groups.push({ label: "Cette semaine", items: weekItems });
    if (olderItems.length) groups.push({ label: "Plus ancien", items: olderItems });
    return groups;
  }, [filteredNotifications, today, yesterday, now]);

  /* ── ACTIONS ── */
  const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));
  const clearRead = () => setNotifications(prev => prev.filter(n => !n.read));
  const togglePin = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n));
  const snooze = (id: string, hours: number) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, snoozedUntil: until } : n));
  };
  const simulateEmail = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, emailSent: true } : n));
  const deleteSelected = () => { setNotifications(prev => prev.filter(n => !selected.has(n.id))); setSelected(new Set()); setSelectMode(false); };
  const markSelectedRead = () => { setNotifications(prev => prev.map(n => selected.has(n.id) ? { ...n, read: true } : n)); setSelected(new Set()); setSelectMode(false); };
  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleCollapse = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const createTestNotification = () => {
    const types: AppNotification['type'][] = ['booking_confirmed', 'checkin_reminder', 'checkout_reminder', 'review_request', 'low_stock', 'overdue_task', 'payment_received', 'cancellation', 'gap_alert', 'info'];
    const type = types[Math.floor(Math.random() * types.length)];
    const titles: Record<string, string> = { booking_confirmed: 'Nouvelle Reservation', checkin_reminder: 'Rappel Check-in', checkout_reminder: 'Rappel Check-out', review_request: "Demande d avis", low_stock: 'Stock Faible', overdue_task: 'Tache en Retard', payment_received: 'Paiement Recu', cancellation: 'Annulation', gap_alert: 'Creux detecte', info: 'Info Systeme' };
    setNotifications(prev => [{ id: 'test_' + Date.now(), type, title: titles[type] || 'Notification', message: 'Ceci est une notification de test generee manuellement.', createdAt: new Date().toISOString(), read: false, priority: Math.random() > 0.6 ? 'high' : 'medium', emailTo: 'test@example.com', emailSent: false }, ...prev]);
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `Il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  const getIcon = (type: string) => {
    const cls = "w-4 h-4";
    switch (type) {
      case 'booking_confirmed': return <Calendar className={cls} />;
      case 'checkin_reminder': return <User className={cls} />;
      case 'checkout_reminder': return <ArrowRight className={cls} />;
      case 'review_request': return <Star className={cls} />;
      case 'low_stock': return <Package className={cls} />;
      case 'overdue_task': return <Wrench className={cls} />;
      case 'payment_received': return <Euro className={cls} />;
      case 'cancellation': return <X className={cls} />;
      case 'gap_alert': return <TrendingDown className={cls} />;
      case 'revenue_alert': return <Zap className={cls} />;
      case 'price_suggestion': return <Euro className={cls} />;
      default: return <Info className={cls} />;
    }
  };

  const typeColor = (type: string) => {
    const d = isDark;
    switch (type) {
      case 'booking_confirmed': return d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'checkin_reminder': return d ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'checkout_reminder': return d ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-amber-50 text-amber-600 border-amber-200';
      case 'review_request': return d ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-purple-50 text-purple-600 border-purple-200';
      case 'low_stock': return d ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-red-50 text-red-600 border-red-200';
      case 'overdue_task': return d ? 'bg-orange-500/15 text-orange-400 border-orange-500/25' : 'bg-orange-50 text-orange-600 border-orange-200';
      case 'gap_alert': return d ? 'bg-violet-500/15 text-violet-400 border-violet-500/25' : 'bg-violet-50 text-violet-600 border-violet-200';
      case 'payment_received': return d ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      default: return d ? 'bg-white/[0.06] text-white/50 border-white/10' : 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  const C = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const M = isDark ? 'text-white/50' : 'text-gray-400';
  const S = isDark ? 'text-white/70' : 'text-gray-600';

  const emailLog = notifications.filter(n => n.emailSent);
  const snoozedCount = notifications.filter(n => n.snoozedUntil && n.snoozedUntil > new Date().toISOString()).length;

  const typeCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    activeNotifications.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return counts;
  }, [activeNotifications]);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={`${C} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF385C]/15 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-[#FF385C]" />
              {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF385C] flex items-center justify-center"><span className="text-white text-[9px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span></div>}
            </div>
            <div>
              <h1 className={`${T} text-xl font-bold`}>Centre de Notifications</h1>
              <p className={`${M} text-sm`}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''} · {notifications.length} total{snoozedCount > 0 ? ` · ${snoozedCount} reportee${snoozedCount > 1 ? 's' : ''}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => generateAutoNotifications()} className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`} title="Actualiser"><RefreshCw className={`w-4 h-4 ${M}`} /></button>
            <button onClick={markAllRead} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/60' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition-colors`}><CheckCircle className="w-3.5 h-3.5 inline mr-1" />Tout lire</button>
            <button onClick={clearRead} className={`px-3 py-1.5 rounded-xl text-xs font-medium ${isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-600'} transition-colors`}><Trash2 className="w-3.5 h-3.5 inline mr-1" />Effacer lues</button>
          </div>
        </div>

        {/* KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Non lues', value: unreadCount, icon: <BellRing className="w-5 h-5" />, color: '#FF385C' },
            { label: 'Urgentes', value: activeNotifications.filter(n => n.priority === 'high' && !n.read).length, icon: <AlertTriangle className="w-5 h-5" />, color: '#f59e0b' },
            { label: 'Emails envoyes', value: emailLog.length, icon: <Mail className="w-5 h-5" />, color: '#22c55e' },
            { label: 'Epinglees', value: notifications.filter(n => n.pinned).length, icon: <Pin className="w-5 h-5" />, color: '#8b5cf6' },
          ].map((k, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className={`${SC} p-3 flex items-center gap-3`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.color + '18', color: k.color }}>{k.icon}</div>
              <div><p className={`${M} text-xs`}>{k.label}</p><p className={`${T} font-bold`}>{k.value}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`flex flex-wrap gap-1 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} w-fit`}>
          {([{ id: 'agenda', label: 'Agenda du jour' }, { id: 'feed', label: 'Fil de notifications' }, { id: 'email', label: 'Journal email' }] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t.id ? 'bg-[#FF385C] text-white shadow-md' : S}`}>
              {t.id === 'agenda' ? '📅 ' : t.id === 'feed' ? '🔔 ' : '📧 '}{t.label}
              {t.id === 'feed' && unreadCount > 0 && <span className="ml-1.5 bg-white/30 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* AGENDA TAB */}
        {tab === 'agenda' && (
          <motion.div key="agenda" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            {/* Check-ins today */}
            <div className={`${C} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center"><User className="w-4 h-4 text-emerald-400" /></div>
                <div><h3 className={`${T} font-semibold text-sm`}>Arrivees aujourd hui</h3><p className={`${M} text-xs`}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${agenda.checkinToday.length > 0 ? 'bg-emerald-500/15 text-emerald-400' : isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>{agenda.checkinToday.length}</span>
              </div>
              {agenda.checkinToday.length === 0 ? <p className={`${M} text-sm text-center py-4`}>Aucune arrivee aujourd hui</p> : (
                <div className="space-y-2">
                  {agenda.checkinToday.map(b => {
                    const prop = getProperty(b.propertyId);
                    return (
                      <div key={b.id} className={`${SC} p-3 flex items-center gap-3`}>
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-emerald-400" /></div>
                        <div className="flex-1 min-w-0">
                          <p className={`${T} text-sm font-semibold truncate`}>{b.guestInfo.name}</p>
                          <p className={`${M} text-xs`}>{prop?.name} · {b.totalPrice}EUR</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-emerald-400 text-xs font-bold">Aujourd hui</p>
                          <p className={`${M} text-xs`}>{Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)} nuits</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Check-outs today */}
            <div className={`${C} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center"><ArrowRight className="w-4 h-4 text-amber-400" /></div>
                <div><h3 className={`${T} font-semibold text-sm`}>Departs aujourd hui</h3><p className={`${M} text-xs`}>Liberent le logement avant 11h</p></div>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${agenda.checkoutToday.length > 0 ? 'bg-amber-500/15 text-amber-400' : isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>{agenda.checkoutToday.length}</span>
              </div>
              {agenda.checkoutToday.length === 0 ? <p className={`${M} text-sm text-center py-4`}>Aucun depart aujourd hui</p> : (
                <div className="space-y-2">
                  {agenda.checkoutToday.map(b => {
                    const prop = getProperty(b.propertyId);
                    return (
                      <div key={b.id} className={`${SC} p-3 flex items-center gap-3`}>
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-4 h-4 text-amber-400" /></div>
                        <div className="flex-1 min-w-0">
                          <p className={`${T} text-sm font-semibold truncate`}>{b.guestInfo.name}</p>
                          <p className={`${M} text-xs`}>{prop?.name} · {b.totalPrice}EUR</p>
                        </div>
                        <p className="text-amber-400 text-xs font-bold flex-shrink-0">Avant 11h</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Arrivees demain */}
            {agenda.checkinTomorrow.length > 0 && (
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center"><Calendar className="w-4 h-4 text-blue-400" /></div>
                  <h3 className={`${T} font-semibold text-sm`}>Arrivees demain ({agenda.checkinTomorrow.length})</h3>
                </div>
                <div className="space-y-2">
                  {agenda.checkinTomorrow.map(b => {
                    const prop = getProperty(b.propertyId);
                    return (
                      <div key={b.id} className={`${SC} p-3 flex items-center gap-3`}>
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-blue-400" /></div>
                        <div className="flex-1 min-w-0"><p className={`${T} text-sm font-semibold truncate`}>{b.guestInfo.name}</p><p className={`${M} text-xs`}>{prop?.name}</p></div>
                        <p className="text-blue-400 text-xs font-bold flex-shrink-0">Demain</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Taches en retard */}
              {agenda.overdueTasks.length > 0 && (
                <div className={`${C} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center"><Wrench className="w-4 h-4 text-red-400" /></div>
                    <h3 className={`${T} font-semibold text-sm`}>Taches en retard ({agenda.overdueTasks.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {agenda.overdueTasks.slice(0, 4).map(t => {
                      const prop = getProperty(t.propertyId);
                      return (
                        <div key={t.id} className={`${SC} p-3 flex items-center gap-3`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-400'}`} />
                          <div className="flex-1 min-w-0"><p className={`${T} text-xs font-semibold truncate`}>{t.title}</p><p className={`${M} text-xs`}>{prop?.name}</p></div>
                          <p className={`text-xs flex-shrink-0 ${t.priority === 'urgent' ? 'text-red-400' : 'text-orange-400'}`}>{t.priority}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Creux calendrier */}
              {agenda.gaps.length > 0 && (
                <div className={`${C} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-violet-400" /></div>
                    <h3 className={`${T} font-semibold text-sm`}>Creux detectes ({agenda.gaps.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {agenda.gaps.slice(0, 4).map((g, i) => (
                      <div key={i} className={`${SC} p-3`}>
                        <div className="flex items-center justify-between">
                          <p className={`${T} text-xs font-semibold truncate`}>{g.name}</p>
                          <span className="text-violet-400 text-xs font-bold">{g.nights}n libres</span>
                        </div>
                        <p className={`${M} text-xs mt-0.5`}>{new Date(g.from).toLocaleDateString('fr-FR')} au {new Date(g.to).toLocaleDateString('fr-FR')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Stock critique */}
              {agenda.urgentStock.length > 0 && (
                <div className={`${C} p-5`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-red-400" /></div>
                    <h3 className={`${T} font-semibold text-sm`}>Stock critique ({agenda.urgentStock.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {agenda.urgentStock.slice(0, 5).map(item => {
                      const prop = getProperty(item.propertyId);
                      return (
                        <div key={item.id} className={`${SC} p-3 flex items-center gap-3`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.quantity === 0 ? 'bg-red-500' : 'bg-orange-400'}`} />
                          <div className="flex-1 min-w-0"><p className={`${T} text-xs font-semibold truncate`}>{item.name}</p><p className={`${M} text-xs`}>{prop?.name}</p></div>
                          <span className={`text-xs font-bold flex-shrink-0 ${item.quantity === 0 ? 'text-red-400' : 'text-orange-400'}`}>{item.quantity} {item.unit}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {agenda.checkinToday.length === 0 && agenda.checkoutToday.length === 0 && agenda.overdueTasks.length === 0 && agenda.gaps.length === 0 && agenda.urgentStock.length === 0 && (
              <div className={`${C} p-10 flex flex-col items-center gap-3`}>
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className={`${T} font-semibold`}>Tout est calme aujourd hui !</p>
                <p className={M}>Aucune action urgente requise.</p>
              </div>
            )}
          </motion.div>
        )}

        {/* FEED TAB */}
        {tab === 'feed' && (
          <motion.div key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Sidebar */}
              <div className="w-full lg:w-56 shrink-0 space-y-3">
                <div className={`${C} p-4`}>
                  <p className={`${M} text-xs font-semibold uppercase tracking-wider mb-3`}>Filtres</p>
                  <div className="space-y-0.5">
                    {[
                      { id: 'all', label: 'Toutes', icon: <Bell className="w-3.5 h-3.5" /> },
                      { id: 'unread', label: 'Non lues', icon: <BellRing className="w-3.5 h-3.5" />, badge: unreadCount },
                      { id: 'booking_confirmed', label: 'Reservations', icon: <Calendar className="w-3.5 h-3.5" />, badge: typeCounts.booking_confirmed },
                      { id: 'checkin_reminder', label: 'Arrivees', icon: <User className="w-3.5 h-3.5" />, badge: typeCounts.checkin_reminder },
                      { id: 'review_request', label: 'Avis', icon: <Star className="w-3.5 h-3.5" />, badge: typeCounts.review_request },
                      { id: 'overdue_task', label: 'Maintenance', icon: <Wrench className="w-3.5 h-3.5" />, badge: typeCounts.overdue_task },
                      { id: 'low_stock', label: 'Inventaire', icon: <Package className="w-3.5 h-3.5" />, badge: typeCounts.low_stock },
                      { id: 'gap_alert', label: 'Creux', icon: <TrendingDown className="w-3.5 h-3.5" />, badge: typeCounts.gap_alert },
                    ].map(f => (
                      <button key={f.id} onClick={() => setFilterType(f.id)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${filterType === f.id ? 'bg-[#FF385C]/15 text-[#FF385C]' : isDark ? 'text-white/50 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}>
                        <span className="flex-shrink-0">{f.icon}</span>
                        <span className="flex-1 text-left">{f.label}</span>
                        {f.badge != null && f.badge > 0 && <span className={`text-[9px] font-bold px-1.5 rounded-full ${filterType === f.id ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/10 text-white/60' : 'bg-gray-200 text-gray-600'}`}>{f.badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Select mode */}
                <div className={`${C} p-4`}>
                  <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${selectMode ? 'bg-[#FF385C]/15 text-[#FF385C]' : isDark ? 'text-white/50 hover:bg-white/[0.06]' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {selectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    Mode selection
                  </button>
                  {selectMode && selected.size > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <button onClick={markSelectedRead} className="w-full text-xs py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium"><CheckCircle className="w-3 h-3 inline mr-1" />{selected.size} lue{selected.size > 1 ? 's' : ''}</button>
                      <button onClick={deleteSelected} className="w-full text-xs py-1.5 rounded-lg bg-red-500/15 text-red-400 font-medium"><Trash2 className="w-3 h-3 inline mr-1" />Supprimer ({selected.size})</button>
                    </div>
                  )}
                </div>
                {onRequestSettings && (
                  <button onClick={onRequestSettings} className={`w-full text-xs py-2.5 px-3 rounded-xl font-medium border ${isDark ? 'border-white/10 text-white/50 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'} transition-colors`}><Filter className="w-3 h-3 inline mr-1.5" />Configurer les alertes</button>
                )}
              </div>

              {/* Main feed */}
              <div className={`flex-1 ${C} overflow-hidden`}>
                {/* Search + toolbar */}
                <div className={`p-4 border-b flex items-center gap-3 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${M}`} />
                    <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-white placeholder-white/30' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                  </div>
                  <button onClick={createTestNotification} className={`px-3 py-2 rounded-xl text-xs font-medium ${isDark ? 'bg-white/[0.06] text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-colors`} title="Ajouter test">+ Test</button>
                </div>
                <div className="overflow-y-auto max-h-[600px] p-4 space-y-4">
                  <AnimatePresence>
                    {filteredNotifications.length === 0 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16 gap-3">
                        <Bell className={`w-12 h-12 ${M} opacity-30`} />
                        <p className={`${T} font-semibold`}>Aucune notification</p>
                        <p className={`${M} text-sm`}>{filterType !== 'all' ? 'Changez le filtre ou generez un test.' : 'Tout est calme !'}</p>
                      </motion.div>
                    ) : (
                      grouped.map(group => (
                        <div key={group.label}>
                          <button onClick={() => toggleCollapse(group.label)} className="flex items-center gap-2 mb-2 w-full group">
                            <div className={`w-2 h-2 rounded-full ${group.label === 'Epinglees' ? 'bg-violet-500' : group.label.startsWith("Aujourd") ? 'bg-[#FF385C]' : isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${group.label === 'Epinglees' ? 'text-violet-400' : group.label.startsWith("Aujourd") ? 'text-[#FF385C]' : M}`}>{group.label}</span>
                            <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`} />
                            {collapsed[group.label] ? <ChevronDown className={`w-3 h-3 ${M}`} /> : <ChevronUp className={`w-3 h-3 ${M}`} />}
                          </button>
                          <AnimatePresence>
                            {!collapsed[group.label] && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                                {group.items.map(notif => (
                                  <motion.div key={notif.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} whileHover={{ scale: 1.005 }}
                                    className={`group relative rounded-xl border transition-all ${notif.read ? isDark ? 'bg-white/[0.02] border-white/[0.05] opacity-55' : 'bg-white border-gray-100 opacity-55' : isDark ? 'bg-white/[0.06] border-white/10 shadow-sm' : 'bg-white border-gray-200 shadow-sm'} ${selectMode && selected.has(notif.id) ? isDark ? 'ring-2 ring-[#FF385C]/50' : 'ring-2 ring-[#FF385C]/30' : ''} ${notif.pinned ? isDark ? 'border-violet-500/30' : 'border-violet-200' : ''}`}
                                    onClick={() => { if (selectMode) { toggleSelect(notif.id); } else { markAsRead(notif.id); } }}>
                                    {!notif.read && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#FF385C] animate-pulse" />}
                                    <div className="p-4 flex gap-3">
                                      {selectMode && (
                                        <div className="flex-shrink-0 mt-0.5">{selected.has(notif.id) ? <CheckSquare className="w-4 h-4 text-[#FF385C]" /> : <Square className={`w-4 h-4 ${M}`} />}</div>
                                      )}
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${typeColor(notif.type)}`}>{getIcon(notif.type)}</div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-0.5">
                                          <p className={`text-sm font-semibold ${notif.read ? M : T}`}>{notif.title}</p>
                                          <span className={`text-xs ${M} flex-shrink-0 ml-2`}>{relativeTime(notif.createdAt)}</span>
                                        </div>
                                        <p className={`text-xs leading-relaxed mb-2 ${S}`}>{notif.message}</p>
                                        {/* Action row */}
                                        <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap`}>
                                          {notif.emailTo && !notif.emailSent && (
                                            <button onClick={e => { e.stopPropagation(); simulateEmail(notif.id); }} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Mail className="w-3 h-3" />Envoyer</button>
                                          )}
                                          {notif.emailSent && <span className="text-xs text-emerald-400 flex items-center gap-1"><Mail className="w-3 h-3" />Email envoye</span>}
                                          <button onClick={e => { e.stopPropagation(); snooze(notif.id, 1); }} className={`text-xs flex items-center gap-1 ${M} hover:text-amber-400`}><AlarmClock className="w-3 h-3" />1h</button>
                                          <button onClick={e => { e.stopPropagation(); snooze(notif.id, 24); }} className={`text-xs flex items-center gap-1 ${M} hover:text-amber-400`}><AlarmClock className="w-3 h-3" />Demain</button>
                                          <button onClick={e => { e.stopPropagation(); togglePin(notif.id); }} className={`text-xs flex items-center gap-1 ${notif.pinned ? 'text-violet-400' : M + ' hover:text-violet-400'}`}>{notif.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}{notif.pinned ? 'Desepingler' : 'Epingler'}</button>
                                          <button onClick={e => { e.stopPropagation(); deleteNotification(notif.id); }} className={`text-xs flex items-center gap-1 ml-auto ${M} hover:text-red-400`}><Trash2 className="w-3 h-3" /></button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* EMAIL LOG TAB */}
        {tab === 'email' && (
          <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`${C} p-5`}>
              <div className="flex items-center gap-2 mb-4"><Mail className="w-4 h-4 text-blue-400" /><h3 className={`${T} font-semibold text-sm`}>Journal des emails envoyes ({emailLog.length})</h3></div>
              {emailLog.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-3"><Mail className={`w-12 h-12 ${M} opacity-30`} /><p className={`${T} font-semibold`}>Aucun email envoye</p></div>
              ) : (
                <div className="space-y-2">
                  {emailLog.map(log => (
                    <motion.div key={log.id} whileHover={{ scale: 1.005 }} className={`${SC} p-4 flex items-center gap-4`}>
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-blue-400" /></div>
                      <div className="flex-1 min-w-0">
                        <p className={`${T} text-sm font-semibold`}>{log.title}</p>
                        <p className={`${M} text-xs font-mono`}>{log.emailTo}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">ENVOYE</span>
                        <p className={`${M} text-xs mt-1`}>{relativeTime(log.createdAt)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}