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
      {/* More drawer backdrop */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More drawer — slides up from bottom */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl shadow-2xl pb-safe ${
              isDark ? 'bg-[#1a1a2e]' : 'bg-white'
            }`}
            style={{ maxHeight: '78vh', overflowY: 'auto' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
            </div>
            {/* Close button */}
            <div className="flex items-center justify-between px-5 py-2">
              <span className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Menu
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Groups */}
            <div className="px-4 pb-8 space-y-5">
              {MORE_GROUPS.map(group => (
                <div key={group.title}>
                  <p className={`px-2 mb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {group.title}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.id, (item as { external?: string }).external);
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.id, (item as { external?: string }).external)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl min-h-[72px] justify-center transition-all active:scale-95 ${
                            active
                              ? isDark
                                ? 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-indigo-50 text-indigo-600'
                              : isDark
                                ? 'bg-white/[0.04] text-gray-400 active:bg-white/10'
                                : 'bg-gray-50 text-gray-600 active:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                          {(item as { external?: string }).external && (
                            <ExternalLink className="w-2.5 h-2.5 opacity-40" />
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

      {/* Bottom navigation bar */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
          isDark
            ? 'bg-[#1a1a2e]/95 backdrop-blur-xl border-white/[0.08]'
            : 'bg-white/95 backdrop-blur-xl border-gray-200'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around px-1 pt-1 pb-2">
          {PRIMARY_TABS.map(tab => {
            const Icon = tab.icon;
            const active = isActive(tab.id, (tab as { external?: string }).external);
            const badge = tab.id === 'bookings' ? badges.bookings : tab.id === 'cleaning' ? badges.cleaning : 0;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.id, (tab as { external?: string }).external)}
                className={`flex flex-col items-center gap-0.5 px-2 min-w-[52px] min-h-[48px] justify-center rounded-xl transition-all active:scale-90 relative ${
                  active
                    ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                    : isDark ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="bottomNavActive"
                    className={`absolute inset-0 rounded-xl ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5 relative z-10" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none z-10">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium relative z-10 ${active ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-2 min-w-[52px] min-h-[48px] justify-center rounded-xl transition-all active:scale-90 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
