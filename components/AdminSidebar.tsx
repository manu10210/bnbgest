'use client';

import { motion } from 'framer-motion';
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
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquare
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import type { TabType } from './AdminDashboard';

interface AdminSidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    {
      title: 'Tableau de bord',
      items: [
        { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Gestion',
      items: [
        { id: 'bookings', label: 'Réservations', icon: Calendar },
        { id: 'properties', label: 'Propriétés', icon: Building2 },
        { id: 'guests', label: 'Voyageurs', icon: Users },
        { id: 'contract', label: 'Contrats', icon: FileText },
      ]
    },
    {
      title: 'Opérations',
      items: [
        { id: 'maintenance', label: 'Maintenance', icon: Wrench },
        { id: 'cleaning', label: 'Ménage', icon: Sparkles },
        { id: 'cleaningGallery', label: 'Galerie Ménage', icon: Sparkles },
        { id: 'inventory', label: 'Inventaire', icon: ClipboardList },
        { id: 'qrcheckin', label: 'QR Check-in', icon: QrCode },
        { id: 'videoguides', label: 'Guides Vidéo', icon: Video },
      ]
    },
    {
      title: 'Marketing & Client',
      items: [
        { id: 'reviews', label: 'Avis & Notes', icon: Star },
        { id: 'reviewsmanager', label: 'Gestion Avis', icon: MessageSquare },
        { id: 'welcome', label: 'Livret d\'accueil', icon: BookOpen },
        { id: 'shareLinks', label: 'Liens de partage', icon: Share2 },
      ]
    },
    {
      title: 'Finance',
      items: [
        { id: 'financial', label: 'Rapports', icon: BarChart3 },
        { id: 'forecasting', label: 'Prévisionnel', icon: TrendingUp },
        { id: 'pricing', label: 'Moteur de prix', icon: Tags },
      ]
    },
    {
      title: 'Configuration',
      items: [
        { id: 'settings', label: 'Paramètres', icon: Settings },
        { id: 'notifications', label: 'Notifications', icon: Bell },
      ]
    }
  ];

  return (
    <motion.aside
      initial={{ width: isCollapsed ? 80 : 280 }}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`relative hidden lg:flex flex-col h-screen sticky top-0 border-r z-40 ${
        isDark ? 'bg-[#1a1a1a]/80 border-white/[0.06] glass-pro' : 'bg-white/80 border-gray-200 glass-pro'
      }`}
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <span className="text-white font-black text-lg">B</span>
        </div>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            BNBGest<span className="text-indigo-500">.</span>
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-hide">
        {menuItems.map((group, idx) => (
          <div key={idx}>
            {!isCollapsed && (
              <h3 className={`px-4 mb-2 text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {group.title}
              </h3>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
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
                    <Icon className={`w-5 h-5 shrink-0 relative z-10 ${
                      isActive ? 'text-indigo-500' : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                    }`} />
                    {!isCollapsed && (
                      <span className={`text-sm font-medium relative z-10 ${
                        isActive ? 'font-bold' : ''
                      }`}>
                        {item.label}
                      </span>
                    )}
                    {isActive && !isCollapsed && (
                      <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / User Profile */}
      <div className={`p-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
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
  );
}
