'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  TrendingUp, TrendingDown, Euro, Calendar, BarChart3,
  ArrowUpRight, ArrowDownRight, Target, Zap, Trophy,
  ChevronDown, Building2, Users, Star, Clock,
  RefreshCw, Download, Filter, Sparkles
} from 'lucide-react';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function LiveRevenueTracker() {
  const { properties, bookings, reviews, guests } = useBNB();
  const { isDark } = useTheme();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');
  const [selectedProperty, setSelectedProperty] = useState<number | 'all'>('all');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const now = new Date();

  const stats = useMemo(() => {
    const getPeriodStart = () => {
      const d = new Date();
      if (period === '7d') d.setDate(d.getDate() - 7);
      else if (period === '30d') d.setDate(d.getDate() - 30);
      else if (period === '90d') d.setDate(d.getDate() - 90);
      else d.setFullYear(d.getFullYear() - 1);
      return d;
    };

    const prevPeriodStart = () => {
      const d = getPeriodStart();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
      d.setDate(d.getDate() - days);
      return d;
    };

    const start = getPeriodStart();
    const prevStart = prevPeriodStart();
    const prevEnd = getPeriodStart();

    const filteredBookings = bookings.filter(b => {
      const checkin = new Date(b.checkIn);
      const matchProp = selectedProperty === 'all' || b.propertyId === selectedProperty;
      return matchProp && checkin >= start && b.status !== 'cancelled';
    });

    const prevBookings = bookings.filter(b => {
      const checkin = new Date(b.checkIn);
      const matchProp = selectedProperty === 'all' || b.propertyId === selectedProperty;
      return matchProp && checkin >= prevStart && checkin < prevEnd && b.status !== 'cancelled';
    });

    const revenue = filteredBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const prevRevenue = prevBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 100;

    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
    const avgPerBooking = confirmedBookings.length > 0 ? revenue / confirmedBookings.length : 0;

    // Nights occupied
    const totalNights = filteredBookings.reduce((sum, b) => {
      const nights = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      return sum + nights;
    }, 0);

    // Taux occupation
    const propsCount = selectedProperty === 'all' ? properties.length : 1;
    const totalAvailableNights = propsCount * (period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365);
    const occupancyRate = totalAvailableNights > 0 ? (totalNights / totalAvailableNights) * 100 : 0;

    // Revenue par propriété
    const revenueByProp = properties.map(p => {
      const propBookings = filteredBookings.filter(b => b.propertyId === p.id);
      const propRevenue = propBookings.reduce((sum, b) => sum + b.totalPrice, 0);
      const propNights = propBookings.reduce((sum, b) => {
        return sum + Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      return { prop: p, revenue: propRevenue, bookings: propBookings.length, nights: propNights };
    }).sort((a, b) => b.revenue - a.revenue);

    // Revenus mensuels (12 derniers mois)
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthBookings = bookings.filter(b => {
        const checkin = new Date(b.checkIn);
        return checkin >= d && checkin < end && b.status !== 'cancelled' &&
          (selectedProperty === 'all' || b.propertyId === selectedProperty);
      });
      return {
        month: MONTHS_FR[d.getMonth()],
        revenue: monthBookings.reduce((sum, b) => sum + b.totalPrice, 0),
        bookings: monthBookings.length,
      };
    });

    const maxMonthlyRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

    // Top voyageurs
    const guestRevenue = guests.map(g => ({
      guest: g,
      revenue: bookings.filter(b => b.guestId === g.id && b.status !== 'cancelled').reduce((s, b) => s + b.totalPrice, 0),
      bookingsCount: bookings.filter(b => b.guestId === g.id).length,
    })).filter(g => g.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Check-ins à venir (7 jours)
    const upcoming = bookings.filter(b => {
      const checkin = new Date(b.checkIn);
      const inWeek = new Date(); inWeek.setDate(inWeek.getDate() + 7);
      return checkin >= now && checkin <= inWeek && b.status === 'confirmed';
    }).sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

    const pendingRevenue = bookings.filter(b => b.status === 'pending').reduce((s, b) => s + b.totalPrice, 0);
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    return {
      revenue, prevRevenue, revenueGrowth,
      bookingsCount: filteredBookings.length,
      avgPerBooking,
      occupancyRate,
      totalNights,
      revenueByProp,
      monthlyRevenue,
      maxMonthlyRevenue,
      guestRevenue,
      upcoming,
      pendingRevenue,
      avgRating,
    };
  }, [bookings, properties, guests, reviews, period, selectedProperty, now]);

  const c = isDark
    ? { bg: 'bg-[#0f0f1a]', card: 'bg-white/[0.04] border-white/[0.07]', text: 'text-white', sub: 'text-gray-400', input: 'bg-white/[0.04] border-white/[0.08] text-white', muted: 'text-gray-500' }
    : { bg: 'bg-gray-50', card: 'bg-white border-gray-100', text: 'text-gray-900', sub: 'text-gray-500', input: 'bg-gray-50 border-gray-200 text-gray-900', muted: 'text-gray-400' };

  const PERIODS = [
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: '90d', label: '3 mois' },
    { key: '12m', label: '12 mois' },
  ] as const;

  return (
    <div className={`min-h-full space-y-6 ${c.bg}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black ${c.text}`}>Revenus Live</h1>
            <p className={`text-sm ${c.sub}`}>Suivi financier en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sélecteur propriété */}
          <select
            value={selectedProperty}
            onChange={e => setSelectedProperty(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className={`border rounded-xl px-3 py-2 text-sm outline-none ${c.input}`}
          >
            <option value="all">Toutes les propriétés</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {/* Sélecteur période */}
          <div className={`flex gap-1 p-1 rounded-xl border ${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                  : `${c.sub} hover:${c.text}`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Revenus totaux',
            value: `${stats.revenue.toLocaleString('fr-FR')} €`,
            sub: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}% vs période préc.`,
            icon: Euro,
            up: stats.revenueGrowth >= 0,
            gradient: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/20',
          },
          {
            label: 'Réservations',
            value: stats.bookingsCount.toString(),
            sub: `Moy. ${stats.avgPerBooking.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €/réserv.`,
            icon: Calendar,
            up: true,
            gradient: 'from-blue-500 to-indigo-600',
            glow: 'shadow-blue-500/20',
          },
          {
            label: "Taux d'occupation",
            value: `${Math.min(stats.occupancyRate, 100).toFixed(1)}%`,
            sub: `${stats.totalNights} nuits vendues`,
            icon: Target,
            up: stats.occupancyRate >= 60,
            gradient: 'from-violet-500 to-purple-600',
            glow: 'shadow-violet-500/20',
          },
          {
            label: 'Note moyenne',
            value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—',
            sub: `${reviews.length} avis total`,
            icon: Star,
            up: stats.avgRating >= 4,
            gradient: 'from-amber-500 to-orange-500',
            glow: 'shadow-amber-500/20',
          },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`relative rounded-2xl border p-5 overflow-hidden shadow-lg ${kpi.glow} ${c.card}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.05]`} />
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-md`}>
                  <kpi.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${kpi.up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </span>
              </div>
              <div className={`text-2xl font-black mb-1 ${c.text}`}>{kpi.value}</div>
              <div className={`text-xs ${c.muted}`}>{kpi.label}</div>
              <div className={`text-xs mt-1 font-medium ${kpi.up ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Graphique mensuel */}
      <div className={`rounded-2xl border p-6 ${c.card}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className={`font-bold ${c.text}`}>Revenus mensuels</h2>
              <p className={`text-xs ${c.muted}`}>12 derniers mois</p>
            </div>
          </div>
          {stats.pendingRevenue > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{stats.pendingRevenue.toLocaleString('fr-FR')} € en attente</span>
            </div>
          )}
        </div>
        <div className="flex items-end gap-2 h-40">
          {stats.monthlyRevenue.map((m, i) => {
            const height = stats.maxMonthlyRevenue > 0 ? (m.revenue / stats.maxMonthlyRevenue) * 100 : 0;
            const isCurrentMonth = i === 11;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none px-2 py-1 rounded-lg text-xs font-bold ${isDark ? 'bg-white/10 text-white border border-white/10' : 'bg-gray-800 text-white'}`}>
                  {m.revenue.toLocaleString('fr-FR')} €<br />
                  <span className="text-[10px] opacity-70">{m.bookings} rés.</span>
                </div>
                <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, m.revenue > 0 ? 4 : 0)}%` }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                    className={`w-full rounded-t-lg transition-all group-hover:brightness-110 ${isCurrentMonth
                      ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                      : isDark ? 'bg-white/10 group-hover:bg-white/20' : 'bg-gray-200 group-hover:bg-gray-300'
                    }`}
                  />
                </div>
                <span className={`text-[10px] ${isCurrentMonth ? 'font-bold text-emerald-400' : c.muted}`}>{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top propriétés */}
        <div className={`rounded-2xl border p-6 ${c.card}`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h2 className={`font-bold ${c.text}`}>Performance par propriété</h2>
          </div>
          <div className="space-y-3">
            {stats.revenueByProp.length === 0 ? (
              <p className={`text-sm ${c.muted} text-center py-6`}>Aucune donnée</p>
            ) : stats.revenueByProp.map((item, i) => {
              const maxRev = stats.revenueByProp[0].revenue || 1;
              const pct = (item.revenue / maxRev) * 100;
              return (
                <div key={item.prop.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {i === 0 && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                      <span className={`text-sm font-medium truncate max-w-[160px] ${c.text}`}>{item.prop.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${c.muted}`}>{item.bookings} rés.</span>
                      <span className={`text-sm font-bold ${c.text}`}>{item.revenue.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.1, type: 'spring' }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        i === 0 ? 'from-amber-400 to-orange-500' :
                        i === 1 ? 'from-violet-500 to-purple-500' :
                        'from-blue-500 to-indigo-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prochains check-ins + top guests */}
        <div className="space-y-4">
          {/* Prochains check-ins */}
          <div className={`rounded-2xl border p-5 ${c.card}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h2 className={`font-bold ${c.text}`}>Arrivées cette semaine</h2>
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${stats.upcoming.length > 0 ? 'bg-rose-500/15 text-rose-400' : `${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}`}>
                {stats.upcoming.length}
              </span>
            </div>
            {stats.upcoming.length === 0 ? (
              <p className={`text-sm ${c.muted} text-center py-3`}>Aucune arrivée cette semaine</p>
            ) : (
              <div className="space-y-2">
                {stats.upcoming.slice(0, 4).map(b => {
                  const prop = properties.find(p => p.id === b.propertyId);
                  const checkin = new Date(b.checkIn);
                  const today = new Date(); today.setHours(0,0,0,0);
                  const diff = Math.ceil((checkin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={b.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {b.guestInfo?.name?.charAt(0) ?? 'G'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${c.text}`}>{b.guestInfo?.name ?? 'Invité'}</p>
                        <p className={`text-xs truncate ${c.muted}`}>{prop?.name ?? 'Propriété'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${diff === 0 ? 'bg-rose-500/20 text-rose-400' : diff === 1 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                          {diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : `J-${diff}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top clients */}
          <div className={`rounded-2xl border p-5 ${c.card}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h2 className={`font-bold ${c.text}`}>Top clients</h2>
            </div>
            {stats.guestRevenue.length === 0 ? (
              <p className={`text-sm ${c.muted} text-center py-3`}>Aucun client enregistré</p>
            ) : (
              <div className="space-y-2">
                {stats.guestRevenue.map((item, i) => (
                  <div key={item.guest.id} className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-amber-400' : c.muted}`}>#{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {item.guest.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${c.text}`}>{item.guest.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${c.text}`}>{item.revenue.toLocaleString('fr-FR')} €</p>
                      <p className={`text-[10px] ${c.muted}`}>{item.bookingsCount} séj.</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert revenus en attente */}
      <AnimatePresence>
        {stats.pendingRevenue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-400">Revenus en attente de confirmation</p>
              <p className={`text-sm ${c.muted}`}>
                {stats.pendingRevenue.toLocaleString('fr-FR')} € de réservations en attente — confirmez-les pour sécuriser vos revenus
              </p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-amber-400 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
