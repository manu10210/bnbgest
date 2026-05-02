'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  Bell,
  BellRing,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Package,
  Star,
  Mail,
  Trash2,
  Check,
  X,
  Clock,
  User,
  Home,
  Info,
  Filter,
  RefreshCw,
  Search,
  MoreVertical,
  ArrowRight
} from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'booking_confirmed' | 'checkin_reminder' | 'checkout_reminder' | 'review_request' | 'low_stock' | 'overdue_task' | 'payment_received' | 'cancellation' | 'info';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  propertyId?: number;
  bookingId?: number;
  priority: 'low' | 'medium' | 'high';
  emailSent?: boolean;
  emailTo?: string;
}

function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('bnbgest_notifications');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveNotifications(notifications: AppNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bnbgest_notifications', JSON.stringify(notifications));
}

const APP_STATE_KEY = 'notification_center_items';

async function loadNotificationsFromDb(): Promise<AppNotification[] | null> {
  try {
    const res = await fetch(`/api/app-state?key=${encodeURIComponent(APP_STATE_KEY)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return Array.isArray(payload?.value) ? (payload.value as AppNotification[]) : null;
  } catch {
    return null;
  }
}

async function saveNotificationsToDb(notifications: AppNotification[]) {
  try {
    await fetch('/api/app-state', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: APP_STATE_KEY, value: notifications }),
    });
  } catch {
    // silent fallback to local only
  }
}

interface NotificationCenterProps {
  onRequestSettings?: () => void;
}

export default function NotificationCenter({ onRequestSettings }: NotificationCenterProps) {
  const { bookings, properties, maintenanceTasks, inventory, getProperty } = useBNB();
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadNotifications());
  const notificationsHydratedRef = useRef(false);
  const [filterType, setFilterType] = useState('all');
  const [showEmailLog, setShowEmailLog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hydrateNotifications = async () => {
      const remote = await loadNotificationsFromDb();
      if (!cancelled && remote && remote.length > 0) {
        setNotifications(remote);
      }
      if (!cancelled) {
        notificationsHydratedRef.current = true;
      }
    };

    void hydrateNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save on change
  useEffect(() => {
    saveNotifications(notifications);
    if (!notificationsHydratedRef.current) return;

    const t = setTimeout(() => {
      void saveNotificationsToDb(notifications);
    }, 400);

    return () => clearTimeout(t);
  }, [notifications]);

  const createTestNotification = () => {
    const types: AppNotification['type'][] = ['booking_confirmed', 'checkin_reminder', 'checkout_reminder', 'review_request', 'low_stock', 'overdue_task', 'payment_received', 'cancellation', 'info'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = `test_${Date.now()}`;
    const titles = {
        booking_confirmed: 'Nouvelle Réservation',
        checkin_reminder: 'Rappel Check-in',
        checkout_reminder: 'Rappel Check-out',
        review_request: 'Demande d\'Avis',
        low_stock: 'Stock Faible',
        overdue_task: 'Tâche en Retard',
        payment_received: 'Paiement Reçu',
        cancellation: 'Annulation',
        info: 'Information Système'
    };
    
    const messages = {
        booking_confirmed: 'Alice Dupont a réservé la Villa des Roses pour 3 nuits.',
        checkin_reminder: 'Arrivée prévue demain à 15h00 pour la suite 101.',
        checkout_reminder: 'Départ prévu aujourd\'hui avant 11h00.',
        review_request: 'Le séjour de Marc est terminé, demandez un avis !',
        low_stock: 'Il ne reste que 2 rouleaux de papier toilette.',
        overdue_task: 'La réparation de la climatisation est en retard.',
        payment_received: 'Paiement de 450€ reçu pour la réservation #1234.',
        cancellation: 'La réservation de Jean a été annulée.',
        info: 'Mise à jour du système effectuée avec succès.'
    };

    const newNotif: AppNotification = {
      id,
      type,
      title: titles[type],
      message: messages[type],
      createdAt: new Date().toISOString(),
      read: false,
      priority: Math.random() > 0.7 ? 'high' : 'medium',
      emailTo: 'client@example.com', // Toujours définir un email pour pouvoir tester l'envoi
      emailSent: false
    };

    setNotifications(prev => [newNotif, ...prev]);
  };

  // Auto-generate notifications based on data changes
  const generateAutoNotifications = useCallback(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const newNotifs: AppNotification[] = [];
    const existingIds = new Set(notifications.map(n => n.id));

    // Check-in reminders (J-1)
    bookings
      .filter(b => b.status === 'confirmed' && b.checkIn === tomorrow)
      .forEach(b => {
        const id = `checkin_${b.id}_${tomorrow}`;
        if (!existingIds.has(id)) {
          const prop = getProperty(b.propertyId);
          newNotifs.push({
            id,
            type: 'checkin_reminder',
            title: 'Arrivée Demain',
            message: `${b.guestInfo.name} arrive demain à ${prop?.name || 'propriété #' + b.propertyId}.`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: b.propertyId,
            bookingId: b.id,
            priority: 'high',
            emailSent: true,
            emailTo: b.guestInfo.email,
          });
        }
      });

    // Check-out reminders (today)
    bookings
      .filter(b => (b.status === 'confirmed' || b.status === 'completed') && b.checkOut === today)
      .forEach(b => {
        const id = `checkout_${b.id}_${today}`;
        if (!existingIds.has(id)) {
          const prop = getProperty(b.propertyId);
          newNotifs.push({
            id,
            type: 'checkout_reminder',
            title: 'Départ Aujourd\'hui',
            message: `${b.guestInfo.name} doit quitter les lieux aujourd'hui avant ${prop?.checkOutTime || '11:00'}.`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: b.propertyId,
            bookingId: b.id,
            priority: 'medium',
            emailSent: true,
            emailTo: b.guestInfo.email,
          });
        }
      });

    // New booking notifications
    bookings
      .filter(b => {
        const createdAt = new Date(b.createdAt);
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        return b.status === 'confirmed' && createdAt > hourAgo;
      })
      .forEach(b => {
        const id = `booking_${b.id}`;
        if (!existingIds.has(id)) {
          const prop = getProperty(b.propertyId);
          newNotifs.push({
            id,
            type: 'booking_confirmed',
            title: 'Nouvelle Réservation !',
            message: `${b.guestInfo.name} a réservé pour ${b.totalPrice}€ (${new Date(b.checkIn).toLocaleDateString()} - ${new Date(b.checkOut).toLocaleDateString()}).`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: b.propertyId,
            bookingId: b.id,
            priority: 'high',
            emailSent: true,
            emailTo: b.guestInfo.email,
          });
        }
      });

    // Review request (3 days after checkout)
    bookings
      .filter(b => {
        if (b.status !== 'completed') return false;
        const checkoutDate = new Date(b.checkOut);
        const threeDaysAfter = new Date(checkoutDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        return now >= threeDaysAfter && now < new Date(threeDaysAfter.getTime() + 24 * 60 * 60 * 1000);
      })
      .forEach(b => {
        const id = `review_${b.id}`;
        if (!existingIds.has(id)) {
          newNotifs.push({
            id,
            type: 'review_request',
            title: 'Demande d\'avis',
            message: `Le séjour de ${b.guestInfo.name} est terminé. C'est le moment de demander un avis 5 étoiles !`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: b.propertyId,
            bookingId: b.id,
            priority: 'low',
            emailSent: false,
            emailTo: b.guestInfo.email,
          });
        }
      });

    // Overdue tasks
    maintenanceTasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.scheduledDate) < now)
      .forEach(t => {
        const id = `overdue_${t.id}_${today}`;
        if (!existingIds.has(id)) {
          const prop = getProperty(t.propertyId);
          newNotifs.push({
            id,
            type: 'overdue_task',
            title: 'Tâche en Retard',
            message: `"${t.title}" aurait dû être terminée le ${new Date(t.scheduledDate).toLocaleDateString()}.`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: t.propertyId,
            priority: t.priority === 'urgent' ? 'high' : 'medium',
          });
        }
      });

    // Low stock items
    inventory
      .filter(i => i.quantity <= i.minimumQuantity)
      .forEach(item => {
        const id = `lowstock_${item.id}_${today}`;
        if (!existingIds.has(id)) {
          const prop = getProperty(item.propertyId);
          newNotifs.push({
            id,
            type: 'low_stock',
            title: 'Stock Critique',
            message: `Il ne reste que ${item.quantity} ${item.unit} de "${item.name}" à ${prop?.name}.`,
            createdAt: now.toISOString(),
            read: false,
            propertyId: item.propertyId,
            priority: item.quantity === 0 ? 'high' : 'medium',
          });
        }
      });

    if (newNotifs.length > 0) {
      setNotifications(prev => [...newNotifs, ...prev]);
    }
  }, [bookings, maintenanceTasks, inventory, notifications, getProperty]);

  // Run auto-generation on mount and every 5 minutes
  useEffect(() => {
    generateAutoNotifications();
    const interval = setInterval(generateAutoNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) && !n.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const simulateEmail = (notif: AppNotification) => {
    // Show toast or something
    setNotifications(prev =>
      prev.map(n => n.id === notif.id ? { ...n, emailSent: true } : n)
    );
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed': return <Calendar className="w-5 h-5" />;
      case 'checkin_reminder': return <User className="w-5 h-5" />;
      case 'checkout_reminder': return <Clock className="w-5 h-5" />;
      case 'review_request': return <Star className="w-5 h-5" />;
      case 'low_stock': return <Package className="w-5 h-5" />;
      case 'overdue_task': return <AlertTriangle className="w-5 h-5" />;
      case 'payment_received': return <CheckCircle className="w-5 h-5" />;
      case 'cancellation': return <X className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getNotifStyles = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'booking_confirmed': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
        case 'checkin_reminder': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
        case 'checkout_reminder': return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
        case 'review_request': return 'bg-purple-500/15 text-purple-400 border-purple-500/20';
        case 'low_stock':
        case 'overdue_task': return 'bg-red-500/15 text-red-400 border-red-500/20';
        default: return 'bg-white/10 text-gray-400 border-white/10';
      }
    }
    switch (type) {
      case 'booking_confirmed': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'checkin_reminder': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'checkout_reminder': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'review_request': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'low_stock':
      case 'overdue_task': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `Il y a ${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  // Group notifications by priority for display
  const groupedNotifications = (() => {
    const filtered = filteredNotifications;
    const high = filtered.filter(n => n.priority === 'high');
    const medium = filtered.filter(n => n.priority === 'medium');
    const low = filtered.filter(n => n.priority === 'low');
    return { high, medium, low };
  })();

  const emailLog = notifications.filter(n => n.emailSent);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* ─── Header Stats ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: notifications.length, icon: Bell,    color: 'bg-indigo-500', gradient: 'from-indigo-500 to-indigo-600' },
          { label: 'Non lues', value: unreadCount,          icon: BellRing, color: 'bg-[#FF385C]', gradient: 'from-[#FF385C] to-rose-600' },
          { label: 'Urgentes', value: notifications.filter(n => n.priority === 'high' && !n.read).length, icon: AlertTriangle, color: 'bg-amber-500', gradient: 'from-amber-500 to-orange-600' },
          { label: 'Emails envoyés', value: notifications.filter(n => n.emailSent).length, icon: Mail, color: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-600' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden rounded-2xl p-6 shadow-sm border group hover:shadow-md transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}
          >
            <div className={`absolute right-4 top-4 p-3 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${stat.gradient}`}>
              <stat.icon className={`w-6 h-6 ${isDark ? 'text-white' : 'text-black'}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</p>
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${stat.gradient} w-full`} />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* ─── Sidebar Filters ─── */}
        <div className="w-full lg:w-64 space-y-4 shrink-0">
          <div className={`rounded-2xl shadow-sm border p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
            <h3 className={`font-bold mb-4 px-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Filtres</h3>
            <div className="space-y-1">
              {[
                { type: 'filter', id: 'all', label: 'Toutes les notifications', icon: Bell },
                { type: 'filter', id: 'unread', label: 'Non lues uniquement', icon: BellRing },
                { type: 'divider', id: 'div1', label: '', icon: null },
                { type: 'filter', id: 'booking_confirmed', label: 'Réservations', icon: Calendar },
                { type: 'filter', id: 'checkin_reminder', label: 'Arrivées / Départs', icon: User },
                { type: 'filter', id: 'review_request', label: 'Avis & Notes', icon: Star },
                { type: 'filter', id: 'overdue_task', label: 'Maintenance & Tâches', icon: AlertTriangle },
                { type: 'filter', id: 'low_stock', label: 'Inventaire', icon: Package },
              ].map((filter, i) => {
                if (filter.type === 'divider') {
                  return <div key={i} className={`h-px my-2 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`} />;
                }
                const Icon = filter.icon as React.ElementType;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setFilterType(filter.id!)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      filterType === filter.id
                        ? 'bg-[#FF385C]/10 text-[#FF385C]'
                        : isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       {Icon && <Icon className={`w-4 h-4 ${filterType === filter.id ? 'stroke-[2.5px]' : ''}`} />}
                      {filter.label}
                    </div>
                    {filter.id === 'unread' && unreadCount > 0 && (
                      <span className="bg-[#FF385C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
            <h4 className={`font-bold text-sm mb-2 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Besoin d'aide ?</h4>
            <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
              Configurez vos préférences d'alerte dans les paramètres pour choisir quels événements vous souhaitez recevoir.
            </p>
            <Button 
              onClick={onRequestSettings}
              variant="outline" 
              className="w-full bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs h-8"
            >
              Configurer les alertes
            </Button>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className={`flex-1 rounded-2xl shadow-sm border flex flex-col overflow-hidden h-[600px] ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
          {/* Toolbar */}
          <div className={`p-4 border-b flex items-center justify-between gap-4 sticky top-0 z-10 ${isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
              <input 
                type="text" 
                placeholder="Rechercher une notification..." 
                className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all ${isDark ? 'bg-white/10 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowEmailLog(!showEmailLog)} variant="ghost" size="sm" className={showEmailLog ? 'bg-indigo-50 text-indigo-600' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500'}>
                <Mail className="w-4 h-4 mr-2" />
                Journal Email
              </Button>
              <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
              <Button onClick={createTestNotification} variant="ghost" className={`p-2 text-indigo-600 hover:bg-indigo-50`} title="Simuler (Test)">
                <span className="font-bold text-lg leading-none">+</span>
              </Button>
              <Button onClick={() => generateAutoNotifications()} variant="ghost" className="p-2" title="Actualiser les données">
                <RefreshCw className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </Button>
              <Button onClick={markAllRead} variant="ghost" className="p-2">
                <CheckCircle className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </Button>
              <Button onClick={clearAll} variant="ghost" className="p-2 hover:text-red-500">
                <Trash2 className={`w-4 h-4 ${isDark ? 'text-gray-400' : ''}`} />
              </Button>
            </div>
          </div>

          {/* List */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50'}`}>
            <AnimatePresence mode="popLayout">
              {showEmailLog ? (
                // Email Log View
                emailLog.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <Mail className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                    </div>
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Aucun email envoyé</h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Le journal des emails sortants est vide.</p>
                  </motion.div>
                ) : (
                  emailLog.map((log) => (
                    <motion.div
                      key={log.id + '_log'}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}
                    >
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{log.title}</h4>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{relativeTime(log.createdAt)}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Envoyé à: <span className="font-mono">{log.emailTo}</span></p>
                      </div>
                      <div className="text-green-500 text-xs font-bold px-2 py-1 bg-green-50 rounded-md">ENVOYÉ</div>
                    </motion.div>
                  ))
                )
              ) : (
                // Standard Notifications View — Priority Grouped
                filteredNotifications.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <Bell className={`w-10 h-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    </div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Tout est calme</h3>
                    <p className={`text-sm mt-2 max-w-xs mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Vous n'avez aucune notification pour le moment. Profitez-en pour vous détendre !
                    </p>
                    <Button onClick={createTestNotification} variant="outline" className={`mt-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 ${isDark ? 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' : ''}`}>
                      Simuler une notification
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    {/* 🔴 Urgentes */}
                    {groupedNotifications.high.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-red-400' : 'text-red-600'}`}>Urgentes ({groupedNotifications.high.length})</span>
                        </div>
                        {groupedNotifications.high.map((notif) => renderNotifCard(notif))}
                      </div>
                    )}
                    {/* 🟡 Moyennes */}
                    {groupedNotifications.medium.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1 mt-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Moyennes ({groupedNotifications.medium.length})</span>
                        </div>
                        {groupedNotifications.medium.map((notif) => renderNotifCard(notif))}
                      </div>
                    )}
                    {/* 🟢 Faibles */}
                    {groupedNotifications.low.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1 mt-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-green-400' : 'text-green-600'}`}>Faibles ({groupedNotifications.low.length})</span>
                        </div>
                        {groupedNotifications.low.map((notif) => renderNotifCard(notif))}
                      </div>
                    )}
                  </>
                )
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );

  function renderNotifCard(notif: AppNotification) {
    const styles = getNotifStyles(notif.type);
    return (
      <motion.div
        layout
        key={notif.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.01 }}
        className={`group relative rounded-xl p-4 shadow-sm border transition-all cursor-pointer ${
          notif.read
            ? isDark ? 'bg-white/[0.03] border-white/5 opacity-60' : 'border-gray-100 opacity-60 bg-white'
            : isDark ? 'bg-white/8 border-indigo-500/30 shadow-md ring-1 ring-indigo-500/10' : 'border-indigo-100 shadow-md ring-1 ring-indigo-50 bg-white'
        }`}
        onClick={() => markAsRead(notif.id)}
      >
        {!notif.read && (
          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#FF385C] ring-4 ring-[#FF385C]/10 animate-pulse" />
        )}
        
        <div className="flex gap-4">
          {/* Icon Box */}
          <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border ${styles}`}>
            {getNotifIcon(notif.type)}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            {/* Header */}
            <div className="flex justify-between items-start mb-1 pr-6">
              <h4 className={`font-semibold text-sm ${notif.read ? isDark ? 'text-gray-500' : 'text-gray-600' : isDark ? 'text-white' : 'text-gray-900'}`}>
                {notif.title}
              </h4>
              <span className={`text-xs whitespace-nowrap ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {relativeTime(notif.createdAt)}
              </span>
            </div>

            {/* Message */}
            <p className={`text-sm leading-relaxed line-clamp-2 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {notif.message}
            </p>

            {/* Actions Footer */}
            <div className={`flex items-center gap-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
              {notif.emailTo && !notif.emailSent && (
                <button
                  onClick={(e) => { e.stopPropagation(); simulateEmail(notif); }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Mail className="w-3 h-3" /> Envoyer Email
                </button>
              )}
              
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                className={`text-xs font-medium flex items-center gap-1 ml-auto ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
              >
                <Trash2 className="w-3 h-3" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
}

