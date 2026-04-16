'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Users,
  FileText,
  Wrench,
  Sparkles,
  ClipboardList,
  QrCode,
  Video,
  Star,
  BookOpen,
  Share2,
  BarChart3,
  TrendingUp,
  Tags,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Package,
  Home,
  Receipt,
  Brain,
  Zap,
  TrendingDown,
  CalendarDays,
  ClipboardCheck,
  KeyRound,
  Inbox,
  ExternalLink,
  LineChart,
  MessageCircle,
  Target,
  Mail,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useBNB } from '../contexts/BNBContext';
import { useState, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { TabType } from './AdminDashboard';

// Routes that open dedicated pages instead of in-dashboard tabs
// NOTE: Seulement les pages qui ont vraiment besoin d'une route dédiée
const EXTERNAL_ROUTES: Record<string, { href: string; color: string }> = {
  planning:       { href: '/planning',       color: 'text-blue-400 group-hover:text-blue-300' },
  settings:       { href: '/settings',       color: 'text-gray-400 group-hover:text-white' },
  expenses:       { href: '/expenses',       color: 'text-rose-400 group-hover:text-rose-300' },
  notifications:  { href: '/notifications',  color: 'text-amber-400 group-hover:text-amber-300' },
  // Les éléments suivants sont désormais des onglets internes au dashboard
  // inspections, access-codes, messages, rentabilite, rapports-fiscaux
};

interface AdminSidebarProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
}

export default function AdminSidebar({ activeTab = 'overview', setActiveTab }: AdminSidebarProps) {
  const safeSetActiveTab = (tab: TabType) => setActiveTab?.(tab);
  const { isDark } = useTheme();
  const { bookings, maintenanceTasks, reviews } = useBNB();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>(['Tableau de bord', 'Gestion']);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const pathname = usePathname();

  const toggleCategory = (title: string) => {
    setOpenCategories(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  // Live clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute live badges
  const badges = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const urgentMaintenance = maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'high').length;
    const pendingMaintenance = maintenanceTasks.filter(t => t.status !== 'completed').length;
    const checkinsToday = bookings.filter(b => b.checkIn?.toString().split('T')[0] === todayStr).length;
    const pendingReviews = reviews.filter(r => !r.response).length;
    const notifCount = pendingBookings + urgentMaintenance;
    return { pendingBookings, urgentMaintenance, pendingMaintenance, checkinsToday, pendingReviews, notifCount };
  }, [bookings, maintenanceTasks, reviews]);

  const menuItems = [
    {
      title: 'Tableau de bord',
      items: [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, badge: 0 },
      ]
    },
    {
      title: 'Gestion',
      items: [
        { id: 'bookings', label: 'Réservations', icon: Calendar, badge: badges.pendingBookings },
        { id: 'planning', label: 'Planning', icon: CalendarDays, badge: 0 },
        { id: 'properties', label: 'Propriétés', icon: Building2, badge: 0 },
        { id: 'guests', label: 'Voyageurs', icon: Users, badge: badges.checkinsToday },
        { id: 'contract', label: 'Contrats', icon: FileText, badge: 0 },
        { id: 'gmail-import', label: '📧 Import Gmail', icon: Mail, badge: 0 },
        { id: 'occupancy', label: '🎯 Optimiseur Occupation', icon: Target, badge: 0 },
      ]
    },
    {
      title: 'Opérations',
      items: [
        { id: 'maintenance', label: 'Maintenance', icon: Wrench, badge: badges.urgentMaintenance },
        { id: 'cleaning', label: 'Ménage & Inspections', icon: Sparkles, badge: 0 },
        { id: 'cleaningGallery', label: 'Galerie Ménage', icon: Sparkles, badge: 0 },
        { id: 'inventory', label: 'Inventaire', icon: ClipboardList, badge: 0 },
        { id: 'qrcheckin', label: 'QR Check-in', icon: QrCode, badge: 0 },
        { id: 'videoguides', label: 'Guides Vidéo', icon: Video, badge: 0 },
        { id: 'inspections', label: 'États des lieux', icon: ClipboardCheck, badge: 0 },
        { id: 'access-codes', label: 'Codes d\'accès', icon: KeyRound, badge: 0 },
      ]
    },
    {
      title: 'Marketing & Client',
      items: [
        { id: 'reviewsmanager', label: 'Avis Voyageurs', icon: MessageSquare, badge: badges.pendingReviews },
        { id: 'messages', label: 'Messagerie', icon: Inbox, badge: 0 },
        { id: 'messaging', label: '💬 Messagerie Hub', icon: MessageCircle, badge: 0 },
        { id: 'welcome', label: 'Livret d\'accueil', icon: BookOpen, badge: 0 },
        { id: 'shareLinks', label: 'Liens de partage', icon: Share2, badge: 0 },
      ]
    },
    {
      title: 'Finance & IA',
      items: [
        { id: 'financial',       label: 'Rapports & Revenus', icon: BarChart3, badge: 0 },
        { id: 'revenue-live',    label: '📊 Revenus Live', icon: LineChart, badge: 0 },
        { id: 'rentabilite',     label: 'Rentabilité', icon: TrendingUp, badge: 0 },
        { id: 'rapports-fiscaux',label: 'Rapports fiscaux',icon: FileText, badge: 0 },
        { id: 'forecasting',     label: 'Prévisionnel', icon: TrendingUp, badge: 0 },
        { id: 'pricing',         label: 'Moteur de prix', icon: Tags, badge: 0 },
        { id: 'invoice',         label: 'Factures', icon: Receipt, badge: 0 },
        { id: 'expenses',        label: 'Dépenses', icon: TrendingDown, badge: 0 },
        { id: 'intelligence',    label: '🧠 IA Propriétés',icon: Brain, badge: 0 },
        { id: 'assistant',       label: '💬 Assistant IA', icon: MessageSquare, badge: 0 },
        { id: 'autopilot',       label: '🤖 Autopilot', icon: Zap, badge: 0 },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'settings', label: 'Paramètres', icon: Settings, badge: 0 },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: badges.notifCount },
      ]
    }
  ];

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-lg border transition-colors ${
          isDark ? 'bg-[#1a1a2e] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-700'
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — desktop: sticky | mobile: slide-over */}
      <AnimatePresence>
      <motion.aside
        data-testid="admin-sidebar"
        initial={{ width: isCollapsed ? 80 : 280, x: 0 }}
        animate={{
          width: isCollapsed ? 80 : 280,
          x: 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          relative flex flex-col h-screen sticky top-0 border-r z-40
          hidden lg:flex
          ${isDark ? 'bg-[#1a1a1a]/80 border-white/[0.06] glass-pro' : 'bg-white/80 border-gray-200 glass-pro'}
        `}
      >
      {/* Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Home className="w-4 h-4 text-white" />
        </div>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
            <span className={`font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              BNBGest<span className="text-indigo-500">.</span>
            </span>
          </motion.div>
        )}
      </div>

      {/* Today's Summary Banner */}
      {!isCollapsed && (badges.checkinsToday > 0 || badges.pendingBookings > 0 || badges.urgentMaintenance > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mx-4 mb-2 px-3 py-2.5 rounded-xl border text-xs ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}
        >
          <div className="font-bold mb-1">⚡ Aujourd&apos;hui</div>
          <div className="space-y-0.5 text-[11px] opacity-80">
            {badges.checkinsToday > 0 && <div>🏠 {badges.checkinsToday} check-in{badges.checkinsToday > 1 ? 's' : ''}</div>}
            {badges.pendingBookings > 0 && <div>📋 {badges.pendingBookings} réservation{badges.pendingBookings > 1 ? 's' : ''} en attente</div>}
            {badges.urgentMaintenance > 0 && <div>🔧 {badges.urgentMaintenance} tâche{badges.urgentMaintenance > 1 ? 's' : ''} urgente{badges.urgentMaintenance > 1 ? 's' : ''}</div>}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            {!isCollapsed && (
              <button 
                onClick={() => toggleCategory(group.title)}
                className={`w-full flex items-center justify-between px-4 mb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{group.title}</span>
                <motion.div animate={{ rotate: openCategories.includes(group.title) ? 90 : 0 }}>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </motion.div>
              </button>
            )}
            <AnimatePresence initial={false}>
              {(openCategories.includes(group.title) || isCollapsed) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 overflow-hidden"
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const ext = EXTERNAL_ROUTES[item.id];

                    // External page link
                    if (ext) {
                      const isExtActive = pathname === ext.href;
                      return (
                        <a
                          key={item.id}
                          href={ext.href}
                          title={isCollapsed ? item.label : undefined}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                            isExtActive
                              ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10'
                              : isDark
                                ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className={`w-5 h-5 shrink-0 relative z-10 transition-colors ${
                            isExtActive ? 'text-indigo-400' : ext.color
                          }`} />
                          {!isCollapsed && (
                            <>
                              <span className={`text-sm font-medium relative z-10 flex-1 ${isExtActive ? 'font-bold text-indigo-400' : ''}`}>
                                {item.label}
                              </span>
                              {item.badge > 0 && (
                                <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">
                                  {item.badge > 9 ? '9+' : item.badge}
                                </span>
                              )}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 relative z-10" />
                            </>
                          )}
                          {isCollapsed && item.badge > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </a>
                      );
                    }

                    // Internal dashboard tab
                    return (
                      <button
                        key={item.id}
                        data-testid={`${item.id}-tab`}
                        onClick={() => safeSetActiveTab(item.id as TabType)}
                        title={isCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-500'
                            : isDark
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                        <div className="relative shrink-0">
                          <Icon className={`w-5 h-5 relative z-10 ${
                            isActive ? 'text-indigo-500' : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                          }`} />
                          {item.badge > 0 && (
                            <AnimatePresence>
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none shadow-sm"
                              >
                                {item.badge > 9 ? '9+' : item.badge}
                              </motion.span>
                            </AnimatePresence>
                          )}
                        </div>
                        {!isCollapsed && (
                          <span className={`text-sm font-medium relative z-10 flex-1 text-left ${
                            isActive ? 'font-bold' : ''
                          }`}>
                            {item.label}
                          </span>
                        )}
                        {!isCollapsed && item.badge > 0 && (
                          <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">
                            {item.badge}
                          </span>
                        )}
                        {isActive && !isCollapsed && item.badge === 0 && (
                          <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer / User Profile */}
        <div className={`p-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
          {!isCollapsed && currentTime && (
            <div className={`mb-3 px-3 py-2 rounded-xl text-center ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
              <div className={`text-lg font-bold tabular-nums tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {currentTime}
              </div>
              <div className={`text-[11px] capitalize ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {currentDate}
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full flex items-center justify-center p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-white/[0.04] text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
    </motion.aside>
    </AnimatePresence>

    {/* Mobile slide-over */}
    <AnimatePresence>
      {mobileOpen && (
        <motion.aside
          initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          className={`lg:hidden fixed left-0 top-0 h-screen w-72 z-50 flex flex-col border-r ${
            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-200'
          }`}
        >
          {/* Mobile header */}
          <div className="p-5 flex items-center justify-between border-b border-inherit">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className={`font-bold text-lg tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                BNBGest<span className="text-indigo-500">.</span>
              </span>
            </div>
            <button onClick={() => setMobileOpen(false)} className={`p-1.5 rounded-lg ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Mobile nav — same groups */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-hide">
            {menuItems.map((group, idx) => (
              <div key={idx}>
                <button 
                  onClick={() => toggleCategory(group.title)}
                  className={`w-full flex items-center justify-between px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                  <span>{group.title}</span>
                  <motion.div animate={{ rotate: openCategories.includes(group.title) ? 90 : 0 }}>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openCategories.includes(group.title) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {group.items.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        const ext = EXTERNAL_ROUTES[item.id];

                        if (ext) {
                          return (
                            <a key={item.id} href={ext.href}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                                pathname === ext.href
                                  ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-400 font-bold'
                                  : isDark ? 'text-gray-400 hover:bg-white/[0.04] hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              }`}>
                              <Icon className={`w-5 h-5 shrink-0 ${ext.color}`} />
                              <span className="text-sm flex-1">{item.label}</span>
                              {item.badge > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">{item.badge > 9 ? '9+' : item.badge}</span>
                              )}
                              <ExternalLink className="w-3 h-3 opacity-30" />
                            </a>
                          );
                        }

                        return (
                          <button key={item.id} onClick={() => { safeSetActiveTab(item.id as TabType); setMobileOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                              isActive
                                ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-500 font-bold'
                                : isDark ? 'text-gray-400 hover:bg-white/[0.04] hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}>
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-500' : ''}`} />
                            <span className="text-sm flex-1">{item.label}</span>
                            {item.badge > 0 && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">{item.badge > 9 ? '9+' : item.badge}</span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
    </>
  );
}
