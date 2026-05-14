'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Sparkles,
  Menu,
  Bell,
  Building2,
  Users,
  Wrench,
  Receipt,
  Settings,
  Star,
  Package,
  KeyRound,
  Mail,
  TrendingUp,
  X,
  Home,
  FileText,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useBNB } from '../contexts/BNBContext';
import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { TabType } from './AdminDashboard';

const EXTERNAL_ROUTES: Record<string, string> = {
  planning: '/planning',
  settings: '/settings',
  expenses: '/expenses',
  notifications: '/notifications',
  inspections: '/inspections',
  'access-codes': '/access-codes',
  messages: '/messages',
  rentabilite: '/rentabilite',
  'rapports-fiscaux': '/rapports-fiscaux',
};

// Bottom nav — 4 primary + "More"
const PRIMARY_TABS = [
  { id: 'overview',   label: 'Accueil',      icon: LayoutDashboard },
  { id: 'bookings',   label: 'Réservations', icon: Calendar },
  { id: 'planning',   label: 'Planning',     icon: CalendarDays,  external: '/planning' },
  { id: 'cleaning',   label: 'Ménage',       icon: Sparkles },
] as const;

// Full menu items for the "More" drawer
const MORE_GROUPS = [
  {
    title: 'Propriétés',
    items: [
      { id: 'properties',  label: 'Propriétés',       icon: Building2 },
      { id: 'maintenance', label: 'Maintenance',       icon: Wrench },
      { id: 'inventory',   label: 'Inventaire',        icon: Package },
      { id: 'access-codes',label: 'Codes d\'accès',   icon: KeyRound,  external: '/access-codes' },
    ],
  },
  {
    title: 'Voyageurs',
    items: [
      { id: 'guests',   label: 'Voyageurs',    icon: Users },
      { id: 'reviews',  label: 'Avis',         icon: Star },
      { id: 'messages', label: 'Messages',     icon: Mail,   external: '/messages' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { id: 'expenses',        label: 'Dépenses',       icon: Receipt,    external: '/expenses' },
      { id: 'rentabilite',     label: 'Rentabilité',    icon: TrendingUp, external: '/rentabilite' },
      { id: 'rapports-fiscaux',label: 'Fiscalité',      icon: FileText,   external: '/rapports-fiscaux' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell,     external: '/notifications' },
      { id: 'settings',      label: 'Paramètres',    icon: Settings, external: '/settings' },
    ],
  },
];

interface MobileBottomNavProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
}

export default function MobileBottomNav({ activeTab = 'overview', setActiveTab }: MobileBottomNavProps) {
  const { isDark } = useTheme();
  const { bookings, maintenanceTasks } = useBNB();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const badges = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      bookings: bookings.filter(b => b.status === 'pending').length,
      cleaning: bookings.filter(b => b.checkOut?.toString().split('T')[0] === today).length,
    };
  }, [bookings]);

  const navigate = (id: string, external?: string) => {
    setMoreOpen(false);
    if (external) {
      router.push(external);
    } else if (setActiveTab) {
      setActiveTab(id as TabType);
    } else {
      router.push(`/admin?tab=${id}`);
    }
  };

  const isActive = (id: string, external?: string) => {
    if (external) return pathname === external;
    return activeTab === id;
  };

  return (
    <>
      {/* Backdrop — z-[45] sits above nav bar (z-40) but below drawer (z-50) */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[45] bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More drawer — iOS-style bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] shadow-2xl scroll-ios ${
              isDark ? 'bg-[#1c1c2e]' : 'bg-white'
            }`}
            style={{
              maxHeight: 'min(85dvh, 85vh)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              paddingBottom: 'env(safe-area-inset-bottom, 12px)',
            }}
          >
            {/* Grab handle — larger tap zone */}
            <div className="sticky top-0 flex flex-col items-center pt-2.5 pb-1 z-10"
              style={{ background: isDark ? '#1c1c2e' : 'white' }}>
              <div className={`w-9 h-[5px] rounded-full mb-2 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
              {/* Header row */}
              <div className="flex items-center justify-between w-full px-5 pb-2">
                <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Menu
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    isDark ? 'bg-white/10 text-gray-300 active:bg-white/20' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Separator */}
              <div className={`w-full h-px ${isDark ? 'bg-white/[0.07]' : 'bg-gray-100'}`} />
            </div>

            {/* Groups */}
            <div className="px-4 pt-4 pb-6 space-y-6">
              {MORE_GROUPS.map(group => (
                <div key={group.title}>
                  <p className={`px-1 mb-2.5 text-[11px] font-bold uppercase tracking-widest ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {group.title}
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.id, (item as { external?: string }).external);
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.id, (item as { external?: string }).external)}
                          className={`relative flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl min-h-[76px] justify-center transition-all active:scale-[0.93] ${
                            active
                              ? isDark
                                ? 'bg-indigo-500/25 text-indigo-400'
                                : 'bg-indigo-50 text-indigo-600'
                              : isDark
                                ? 'bg-white/[0.05] text-gray-400'
                                : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {active && (
                            <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                              isDark ? 'bg-indigo-400' : 'bg-indigo-500'
                            }`} />
                          )}
                          <Icon className="w-[22px] h-[22px]" />
                          <span className="text-[12px] font-medium text-center leading-tight w-full px-0.5 break-words">
                            {item.label}
                          </span>
                          {(item as { external?: string }).external && !active && (
                            <ExternalLink className="w-2.5 h-2.5 opacity-30 absolute bottom-2 right-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom navigation bar ── */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
          isDark
            ? 'bg-[#1a1a2e]/96 backdrop-blur-xl border-white/[0.08]'
            : 'bg-white/96 backdrop-blur-xl border-gray-200/80'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Use grid for perfectly equal columns */}
        <div className="grid grid-cols-5 pt-1 pb-1.5">
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.id, (tab as { external?: string }).external);
            const badge = tab.id === 'bookings' ? badges.bookings : tab.id === 'cleaning' ? badges.cleaning : 0;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id, (tab as { external?: string }).external)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[50px] w-full relative transition-colors active:opacity-60 ${
                  active
                    ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                    : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {/* Pill indicator */}
                {active && (
                  <motion.div
                    layoutId="bottomNavPill"
                    className={`absolute top-1 left-1/2 -translate-x-1/2 w-10 h-[34px] rounded-xl ${
                      isDark ? 'bg-indigo-500/18' : 'bg-indigo-50'
                    }`}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon className={`w-[22px] h-[22px] transition-transform ${active ? 'scale-110' : 'scale-100'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] leading-none relative z-10 transition-all ${
                  active ? 'font-semibold' : 'font-normal'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button — highlights when drawer is open */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[50px] w-full relative transition-colors active:opacity-60 ${
              moreOpen
                ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                : isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {moreOpen && (
              <motion.div
                layoutId="bottomNavPill"
                className={`absolute top-1 left-1/2 -translate-x-1/2 w-10 h-[34px] rounded-xl ${
                  isDark ? 'bg-indigo-500/18' : 'bg-indigo-50'
                }`}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              />
            )}
            <motion.div
              animate={{ rotate: moreOpen ? 90 : 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative z-10"
            >
              <Menu className="w-[22px] h-[22px]" />
            </motion.div>
            <span className={`text-[11px] leading-none relative z-10 ${
              moreOpen ? 'font-semibold' : 'font-normal'
            }`}>
              Plus
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
