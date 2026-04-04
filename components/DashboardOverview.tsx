'use client';

import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';
import {
  TrendingUp, Users, Calendar, Wallet, ArrowUpRight, Clock,
  CheckCircle2, AlertCircle, Wrench, Star, Activity,
  LogIn, LogOut, Plus, ClipboardList, QrCode, MessageSquare, Zap, Home,
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, XAxis } from 'recharts';
import { motion } from 'framer-motion';
import type { TabType } from './AdminDashboard';

interface DashboardOverviewProps {
  onNavigate?: (tab: TabType) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const { bookings, properties, maintenanceTasks, reviews, guests } = useBNB();
  const { isDark } = useTheme();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Stats
  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  const activeBookings = bookings.filter(b => {
    const start = new Date(b.checkIn);
    const end   = new Date(b.checkOut);
    return start <= today && end >= today && b.status === 'confirmed';
  }).length;

  const pendingMaintenance   = maintenanceTasks.filter(t => t.status !== 'completed').length;
  const urgentMaintenance    = maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'high').length;
  const occupancyRate        = properties.length > 0 ? Math.min((activeBookings / properties.length) * 100, 100) : 0;
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  const totalGuests          = guests.length;
  const totalGuestNights     = bookings.reduce((s, b) => s + (b.guests || 0), 0);

  // Today events
  const checkinsToday  = bookings.filter(b => b.checkIn?.toString().split('T')[0]  === todayStr);
  const checkoutsToday = bookings.filter(b => b.checkOut?.toString().split('T')[0] === todayStr);

  // Rating
  const avgRatingNum     = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const avgRating        = avgRatingNum > 0 ? avgRatingNum.toFixed(1) : '\u2014';
  const pendingResponses = reviews.filter(r => !r.response).length;

  // Weekly revenue chart — stabilised with useMemo to avoid re-randomisation
  const revenueData = useMemo(() => ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((name, i) => {
    const v = bookings
      .filter(b => b.status === 'confirmed' && new Date(b.checkIn).getDay() === (i + 1) % 7)
      .reduce((s, b) => s + b.totalPrice, 0);
    // seed-based fallback so it stays stable
    const seed = (i * 1234 + 567) % 2500;
    return { name, value: v || (800 + seed) };
  }), [bookings]);

  // Monthly mini-bars (last 6 months) — stabilised with useMemo
  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
    const v = bookings
      .filter(b => {
        const bd = new Date(b.checkIn);
        return b.status === 'confirmed' &&
          bd.getMonth() === d.getMonth() &&
          bd.getFullYear() === d.getFullYear();
      })
      .reduce((s, b) => s + b.totalPrice, 0);
    const seed = (i * 891 + 432) % 4000;
    return { name: d.toLocaleDateString('fr-FR', { month: 'short' }), value: v || (1200 + seed) };
  }), [bookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = `rounded-[2rem] border relative overflow-hidden ${
    isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-xl'
  }`;
  const nav = (tab: TabType) => onNavigate?.(tab);

  const statusBadge = (status: string) =>
    status === 'confirmed' ? { label: 'Confirm\u00e9',  cls: 'text-emerald-500 bg-emerald-500/10' }
    : status === 'pending' ? { label: 'En attente', cls: 'text-amber-500 bg-amber-500/10' }
    : { label: 'Annul\u00e9', cls: 'text-rose-500 bg-rose-500/10' };

  const quickActions: { label: string; icon: React.ElementType; tab: TabType; color: string }[] = [
    { label: 'Nouvelle r\u00e9servation', icon: Plus,          tab: 'bookings',    color: 'from-indigo-500 to-purple-500'   },
    { label: 'Check-in voyageur',         icon: LogIn,         tab: 'qrcheckin',   color: 'from-blue-500 to-cyan-500'       },
    { label: 'Ajouter maintenance',       icon: Wrench,        tab: 'maintenance', color: 'from-rose-500 to-orange-500'     },
    { label: 'Voir inventaire',           icon: ClipboardList, tab: 'inventory',   color: 'from-emerald-500 to-teal-500'    },
    { label: 'QR Check-in',               icon: QrCode,        tab: 'qrcheckin',   color: 'from-violet-500 to-fuchsia-500'  },
    { label: 'R\u00e9pondre aux avis',    icon: MessageSquare, tab: 'reviews',     color: 'from-amber-500 to-yellow-500'    },
  ];

  return (
    <div className="space-y-8 p-2">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 pb-1">
            Vue d&apos;ensemble
          </h2>
          <p className={`mt-1 text-base font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Votre cockpit de pilotage en temps r&eacute;el
          </p>
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border backdrop-blur-xl ${
          isDark ? 'bg-white/[0.03] border-white/[0.08] text-white' : 'bg-white/80 border-gray-100 text-gray-700 shadow-lg'
        }`}>
          <Clock className="w-4 h-4 text-indigo-500" />
          {today.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Today Schedule Banner */}
      {(checkinsToday.length > 0 || checkoutsToday.length > 0 || urgentMaintenance > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-4 border ${
            isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Programme du jour</span>
            <span className={`ml-auto text-[11px] font-medium ${isDark ? 'text-amber-400/60' : 'text-amber-600/60'}`}>
              {today.toLocaleDateString('fr-FR', { weekday: 'long' })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {checkinsToday.map((b, i) => (
              <button key={i} onClick={() => nav('bookings')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold hover:scale-105 transition-transform ${
                  isDark ? 'bg-green-500/15 text-green-300' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                <LogIn className="w-3.5 h-3.5" />
                Arriv&eacute;e &mdash; {b.guestInfo?.name || 'Invit\u00e9'}
              </button>
            ))}
            {checkoutsToday.map((b, i) => (
              <button key={i} onClick={() => nav('bookings')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold hover:scale-105 transition-transform ${
                  isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                <LogOut className="w-3.5 h-3.5" />
                D&eacute;part &mdash; {b.guestInfo?.name || 'Invit\u00e9'}
              </button>
            ))}
            {urgentMaintenance > 0 && (
              <button onClick={() => nav('maintenance')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold hover:scale-105 transition-transform ${
                  isDark ? 'bg-red-500/15 text-red-300' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <Wrench className="w-3.5 h-3.5" />
                {urgentMaintenance} t&acirc;che{urgentMaintenance > 1 ? 's' : ''} urgente{urgentMaintenance > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Actions rapides
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => nav(action.tab)}
                className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                    : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-indigo-100/60'
                }`}
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${action.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className={`text-[11px] font-semibold leading-tight text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Revenue Card (large) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className={`col-span-1 md:col-span-2 row-span-2 p-7 ${card} group cursor-pointer`}
          onClick={() => nav('financial')}
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-all duration-700" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px] group-hover:bg-purple-500/30 transition-all duration-700" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.05]' : 'bg-gray-50'}`}>
                    <Wallet className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Revenu Total</h3>
                </div>
                <div className={`text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {totalRevenue.toLocaleString('fr-FR')}
                  <span className="text-xl font-bold text-gray-400 ml-1">&euro;</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                  isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" /> +24%
                </div>
                <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>vs mois dernier</span>
              </div>
            </div>

            {/* Monthly mini-bars */}
            <div className="flex items-end gap-1 h-12 mb-5">
              {monthlyData.map((m, i) => {
                const maxVal = Math.max(...monthlyData.map(d => d.value));
                const h = Math.max(4, Math.round((m.value / maxVal) * 44));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <div className={`w-full rounded transition-all ${
                      i === monthlyData.length - 1 ? 'bg-indigo-500' : isDark ? 'bg-white/[0.07]' : 'bg-gray-100'
                    }`} style={{ height: `${h}px` }} />
                    <span className={`text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{m.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Area chart */}
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: isDark ? '#4b5563' : '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e1e3a' : '#fff',
                      borderRadius: '14px',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      boxShadow: '0 16px 32px rgba(0,0,0,0.12)',
                      padding: '10px 14px', fontSize: 13,
                    }}
                    labelStyle={{ color: '#6366f1', fontWeight: 700 }}
                    itemStyle={{ color: isDark ? '#e5e7eb' : '#111', fontWeight: 600 }}
                    formatter={(value: unknown) =>
                      [`${(value as number).toLocaleString('fr-FR')} \u20ac`, 'Revenus'] as [string, string]
                    }
                  />
                  <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5}
                    fillOpacity={1} fill="url(#gradRevenue)" dot={false}
                    activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Active Bookings */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className={`p-6 ${card} group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
          onClick={() => nav('bookings')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>R&eacute;servations actives</span>
          </div>
          <div className={`text-4xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{activeBookings}</div>
          <div className="flex items-center gap-2 text-sm font-bold text-blue-500">
            <Activity className="w-4 h-4" /> En cours
          </div>
          {pendingBookingsCount > 0 && (
            <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl w-fit ${
              isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
            }`}>
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingBookingsCount} en attente
            </div>
          )}
        </motion.div>

        {/* Occupancy */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className={`p-6 ${card} group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
          onClick={() => nav('properties')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
              <Home className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Taux d&apos;occupation</span>
          </div>
          <div className={`text-4xl font-black mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.round(occupancyRate)}%</div>
          <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${occupancyRate}%` }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
              className={`h-2.5 rounded-full bg-gradient-to-r ${
                occupancyRate > 75 ? 'from-emerald-400 to-emerald-600' :
                occupancyRate > 40 ? 'from-orange-400 to-orange-600' :
                'from-rose-400 to-rose-600'
              }`}
            />
          </div>
          <div className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {activeBookings} / {properties.length} propri&eacute;t&eacute;{properties.length > 1 ? 's' : ''} occup&eacute;e{activeBookings > 1 ? 's' : ''}
          </div>
        </motion.div>

        {/* Maintenance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className={`p-6 ${card} group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
          onClick={() => nav('maintenance')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
              <Zap className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Maintenance</span>
          </div>
          <div className={`text-4xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingMaintenance}</div>
          <div className={`flex items-center gap-2 text-sm font-bold ${urgentMaintenance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {urgentMaintenance > 0
              ? <><AlertCircle className="w-4 h-4" />{urgentMaintenance} urgente{urgentMaintenance > 1 ? 's' : ''}</>
              : <><CheckCircle2 className="w-4 h-4" />Aucune urgence</>
            }
          </div>
          {urgentMaintenance > 0 && (
            <div className={`mt-3 px-2.5 py-1 rounded-xl text-[11px] font-bold inline-block ${
              isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
            }`}>
              &#9889; Intervention requise
            </div>
          )}
        </motion.div>

        {/* Rating */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}
          className={`p-6 ${card} group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
          onClick={() => nav('reviews')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
              <Star className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Note moyenne</span>
          </div>
          <div className={`text-4xl font-black mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{avgRating}</div>
          <div className="flex items-center gap-0.5 mb-1">
            {[1,2,3,4,5].map(n => (
              <Star key={n} className={`w-3.5 h-3.5 ${
                n <= Math.round(avgRatingNum)
                  ? 'text-yellow-400 fill-yellow-400'
                  : isDark ? 'text-gray-700 fill-gray-700' : 'text-gray-200 fill-gray-200'
              }`} />
            ))}
            <span className={`ml-1.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({reviews.length})</span>
          </div>
          {pendingResponses > 0 && (
            <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              <MessageSquare className="w-3.5 h-3.5" />
              {pendingResponses} r&eacute;ponse{pendingResponses > 1 ? 's' : ''} en attente
            </div>
          )}
        </motion.div>

        {/* Guests summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.38 }}
          className={`p-6 ${card} group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
          onClick={() => nav('guests')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px] -mr-10 -mt-10" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Voyageurs</span>
          </div>
          <div className={`text-4xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalGuests}</div>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>voyageurs enregistr&eacute;s</div>
          <div className={`mt-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {totalGuestNights} nuit{totalGuestNights > 1 ? 's' : ''} cumul&eacute;es &bull; {properties.length} propri&eacute;t&eacute;{properties.length > 1 ? 's' : ''}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className={`col-span-1 md:col-span-2 p-6 ${card}`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Activit&eacute; R&eacute;cente</h3>
            <button
              onClick={() => nav('bookings')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ${
                isDark ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className={`text-sm text-center py-10 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Aucune r&eacute;servation pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.slice(0, 5).map((booking, i) => {
                const badge = statusBadge(booking.status);
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.06 }}
                    onClick={() => nav('bookings')}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all hover:scale-[1.01] text-left ${
                      isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-md shrink-0 ${
                        ['bg-gradient-to-br from-indigo-500 to-blue-500 text-white',
                         'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
                         'bg-gradient-to-br from-emerald-500 to-teal-500 text-white',
                         'bg-gradient-to-br from-orange-500 to-red-500 text-white',
                         'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'][i % 5]
                      }`}>
                        {booking.guestInfo?.name?.charAt(0)?.toUpperCase() || 'G'}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {booking.guestInfo?.name || 'Invit\u00e9'}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {booking.totalPrice.toLocaleString('fr-FR')}&nbsp;&euro; &bull; {booking.guests} pers.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl ${
                        isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {new Date(booking.checkIn).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
