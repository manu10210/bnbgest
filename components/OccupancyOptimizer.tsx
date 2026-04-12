'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Target, TrendingUp, TrendingDown, Calendar, Zap,
  AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight,
  Euro, Clock, Building2, Lightbulb, RefreshCw, ChevronRight,
  Star, Users, BarChart3, Moon, Sun, Tag, Sparkles, Info
} from 'lucide-react';

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface Suggestion {
  id: string;
  type: 'price_increase' | 'price_decrease' | 'block' | 'promo' | 'gap_fill';
  priority: 'high' | 'medium' | 'low';
  propertyId: number;
  propertyName: string;
  title: string;
  description: string;
  impact: string;
  action: string;
  gain?: number;
}

export default function OccupancyOptimizer() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();
  const [selectedProperty, setSelectedProperty] = useState<number | 'all'>('all');
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(activeYear, activeMonth, 1);
    const monthEnd = new Date(activeYear, activeMonth + 1, 0);
    const daysInMonth = monthEnd.getDate();

    // Construit le calendrier du mois avec statut de chaque jour
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const day = new Date(activeYear, activeMonth, i + 1);
      const dayStr = day.toISOString().split('T')[0];

      const bookingsOnDay = bookings.filter(b => {
        const matchProp = selectedProperty === 'all' || b.propertyId === Number(selectedProperty);
        const checkin = new Date(b.checkIn);
        const checkout = new Date(b.checkOut);
        return matchProp && day >= checkin && day < checkout && b.status !== 'cancelled';
      });

      const isBooked = bookingsOnDay.length > 0;
      const isPast = day < now;
      const isToday = day.toDateString() === now.toDateString();
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;

      return { day, date: i + 1, dayName: DAYS_FR[day.getDay()], isBooked, isPast, isToday, isWeekend, bookingsOnDay };
    });

    // Calcul taux d'occupation
    const futureCalendar = calendar.filter(d => !d.isPast);
    const bookedFuture = futureCalendar.filter(d => d.isBooked).length;
    const occupancyFuture = futureCalendar.length > 0 ? (bookedFuture / futureCalendar.length) * 100 : 0;

    const pastCalendar = calendar.filter(d => d.isPast || d.isToday);
    const bookedPast = pastCalendar.filter(d => d.isBooked).length;
    const occupancyPast = pastCalendar.length > 0 ? (bookedPast / pastCalendar.length) * 100 : 0;

    // Jours vacants consécutifs (opportunités)
    const gapAnalysis: { start: number; end: number; length: number }[] = [];
    let gapStart = -1;
    calendar.forEach((d, i) => {
      if (!d.isBooked && !d.isPast) {
        if (gapStart === -1) gapStart = i;
      } else {
        if (gapStart !== -1) {
          gapAnalysis.push({ start: gapStart, end: i - 1, length: i - gapStart });
          gapStart = -1;
        }
      }
    });
    if (gapStart !== -1) gapAnalysis.push({ start: gapStart, end: calendar.length - 1, length: calendar.length - gapStart });

    // Revenus du mois
    const monthRevenue = bookings
      .filter(b => {
        const matchProp = selectedProperty === 'all' || b.propertyId === Number(selectedProperty);
        const checkin = new Date(b.checkIn);
        return matchProp && checkin.getMonth() === activeMonth && checkin.getFullYear() === activeYear && b.status !== 'cancelled';
      })
      .reduce((sum, b) => sum + b.totalPrice, 0);

    // Suggestions intelligentes
    const suggestions: Suggestion[] = [];
    const propsToAnalyze = selectedProperty === 'all' ? properties : properties.filter(p => p.id === Number(selectedProperty));

    propsToAnalyze.forEach(prop => {
      // Weekend vide = suggestion de prix réduit
      const emptyWeekends = calendar.filter(d => d.isWeekend && !d.isBooked && !d.isPast);
      if (emptyWeekends.length >= 4) {
        suggestions.push({
          id: `promo-${prop.id}`,
          type: 'promo',
          priority: 'high',
          propertyId: prop.id,
          propertyName: prop.name,
          title: '🎯 Promotion weekend',
          description: `${emptyWeekends.length} weekend${emptyWeekends.length > 1 ? 's' : ''} encore disponibles ce mois-ci. Une réduction de 15% pourrait générer des réservations rapides.`,
          impact: `+${Math.round(emptyWeekends.length / 2 * prop.price * 2 * 0.85).toLocaleString('fr-FR')} € potentiels`,
          action: 'Appliquer -15% sur les weekends',
          gain: Math.round(emptyWeekends.length / 2 * prop.price * 2 * 0.85),
        });
      }

      // Gaps courts (1-2 jours) entre réservations
      const shortGaps = gapAnalysis.filter(g => g.length === 1 || g.length === 2);
      if (shortGaps.length > 0) {
        suggestions.push({
          id: `gap-${prop.id}`,
          type: 'gap_fill',
          priority: 'medium',
          propertyId: prop.id,
          propertyName: prop.name,
          title: '🔧 Combler les gaps courts',
          description: `${shortGaps.length} jour${shortGaps.length > 1 ? 's' : ''} isolé${shortGaps.length > 1 ? 's' : ''} non réservé${shortGaps.length > 1 ? 's' : ''} entre deux séjours. Réduisez le séjour minimum ou proposez un tarif attractif.`,
          impact: `Jusqu\'à +${(shortGaps.reduce((s, g) => s + g.length, 0) * prop.price * 0.8).toLocaleString('fr-FR')} € récupérables`,
          action: 'Réduire séjour min. à 1 nuit',
          gain: shortGaps.reduce((s, g) => s + g.length, 0) * prop.price * 0.8,
        });
      }

      // Taux d'occupation > 85% = augmenter les prix
      if (occupancyFuture > 85) {
        suggestions.push({
          id: `price-up-${prop.id}`,
          type: 'price_increase',
          priority: 'high',
          propertyId: prop.id,
          propertyName: prop.name,
          title: '💰 Augmentez vos tarifs !',
          description: `Votre taux d\'occupation est de ${occupancyFuture.toFixed(0)}% ! Vous êtes en forte demande. Augmenter vos prix de 20% maximiserait vos revenus.`,
          impact: `+${Math.round(prop.price * 0.2 * bookedFuture).toLocaleString('fr-FR')} € de revenus supplémentaires`,
          action: 'Augmenter le prix de 20%',
          gain: prop.price * 0.2 * bookedFuture,
        });
      }

      // Taux d'occupation < 30% = baisser les prix
      if (occupancyFuture < 30 && futureCalendar.length > 7) {
        suggestions.push({
          id: `price-down-${prop.id}`,
          type: 'price_decrease',
          priority: 'high',
          propertyId: prop.id,
          propertyName: prop.name,
          title: '📉 Taux d\'occupation faible',
          description: `Seulement ${occupancyFuture.toFixed(0)}% d\'occupation ce mois. Une réduction de prix de 15% pourrait attirer 2× plus de réservations.`,
          impact: `Potentiel: +${Math.round(futureCalendar.length * 0.5 * prop.price).toLocaleString('fr-FR')} €`,
          action: 'Réduire le prix de 15%',
          gain: futureCalendar.length * 0.3 * prop.price,
        });
      }
    });

    // Trier suggestions par priorité et gain
    suggestions.sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return pOrder[a.priority] - pOrder[b.priority] || (b.gain ?? 0) - (a.gain ?? 0);
    });

    // Heatmap données (occupancy par jour de semaine)
    const dayOccupancy = Array(7).fill(0).map((_, dayOfWeek) => {
      const dayBookings = bookings.filter(b => {
        const matchProp = selectedProperty === 'all' || b.propertyId === Number(selectedProperty);
        return matchProp && new Date(b.checkIn).getDay() === dayOfWeek && b.status !== 'cancelled';
      });
      const total = bookings.filter(b => {
        const matchProp = selectedProperty === 'all' || b.propertyId === Number(selectedProperty);
        return matchProp && b.status !== 'cancelled';
      }).length;
      return { day: DAYS_FR[dayOfWeek], count: dayBookings.length, pct: total > 0 ? (dayBookings.length / total) * 100 : 0 };
    });

    return { calendar, occupancyFuture, occupancyPast, monthRevenue, suggestions, gapAnalysis, bookedFuture, futureCalendar, dayOccupancy };
  }, [bookings, properties, activeMonth, activeYear, selectedProperty]);

  const visibleSuggestions = stats.suggestions.filter(s => !dismissedSuggestions.has(s.id));

  const navigateMonth = (dir: 1 | -1) => {
    let m = activeMonth + dir;
    let y = activeYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setActiveMonth(m);
    setActiveYear(y);
  };

  const c = isDark
    ? { bg: 'bg-[#0f0f1a]', card: 'bg-white/[0.04] border-white/[0.07]', text: 'text-white', sub: 'text-gray-400', input: 'bg-white/[0.04] border-white/[0.08] text-white', muted: 'text-gray-500' }
    : { bg: 'bg-gray-50', card: 'bg-white border-gray-100', text: 'text-gray-900', sub: 'text-gray-500', input: 'bg-gray-50 border-gray-200 text-gray-900', muted: 'text-gray-400' };

  const priorityConfig = {
    high: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', badge: 'bg-rose-500/20 text-rose-400', label: 'Urgent' },
    medium: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', badge: 'bg-amber-500/20 text-amber-400', label: 'Important' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400', label: 'Info' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={`text-2xl font-black ${c.text}`}>Optimiseur d'Occupation</h1>
            <p className={`text-sm ${c.sub}`}>Suggestions intelligentes pour maximiser vos revenus</p>
          </div>
        </div>
        <select
          value={selectedProperty}
          onChange={e => setSelectedProperty(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className={`border rounded-xl px-3 py-2 text-sm outline-none ${c.input}`}
        >
          <option value="all">Toutes les propriétés</option>
          {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Occupation (à venir)', value: `${stats.occupancyFuture.toFixed(1)}%`, icon: Target, gradient: 'from-violet-500 to-purple-600', good: stats.occupancyFuture >= 60 },
          { label: 'Occupation (réalisée)', value: `${stats.occupancyPast.toFixed(1)}%`, icon: BarChart3, gradient: 'from-blue-500 to-indigo-600', good: stats.occupancyPast >= 60 },
          { label: 'Revenus du mois', value: `${stats.monthRevenue.toLocaleString('fr-FR')} €`, icon: Euro, gradient: 'from-emerald-500 to-teal-600', good: true },
          { label: 'Suggestions actives', value: visibleSuggestions.length.toString(), icon: Lightbulb, gradient: 'from-amber-500 to-orange-500', good: visibleSuggestions.length === 0 },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`relative rounded-2xl border p-5 overflow-hidden ${c.card}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-[0.05]`} />
            <div className="relative flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shrink-0`}>
                <kpi.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className={`text-2xl font-black ${c.text}`}>{kpi.value}</div>
                <div className={`text-xs mt-0.5 ${c.muted}`}>{kpi.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Calendrier occupancy */}
        <div className={`lg:col-span-3 rounded-2xl border p-6 ${c.card}`}>
          {/* Navigation mois */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => navigateMonth(-1)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}>
              <ChevronRight className={`w-4 h-4 rotate-180 ${c.sub}`} />
            </button>
            <h2 className={`font-bold ${c.text}`}>
              {MONTHS_FR[activeMonth]} {activeYear}
            </h2>
            <button onClick={() => navigateMonth(1)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}>
              <ChevronRight className={`w-4 h-4 ${c.sub}`} />
            </button>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {[
              { color: 'bg-violet-500', label: 'Réservé' },
              { color: isDark ? 'bg-white/10' : 'bg-gray-100', label: 'Disponible' },
              { color: 'bg-amber-500/60', label: 'Weekend' },
              { color: isDark ? 'bg-white/5' : 'bg-gray-50', label: 'Passé', border: true },
            ].map((l, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${l.color} ${l.border ? `border ${isDark ? 'border-white/10' : 'border-gray-200'}` : ''}`} />
                <span className={`text-xs ${c.muted}`}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Entêtes jours */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_FR.map(d => (
              <div key={d} className={`text-center text-[10px] font-bold py-1 ${c.muted}`}>{d}</div>
            ))}
          </div>

          {/* Grille calendrier */}
          <div className="grid grid-cols-7 gap-1">
            {/* Espaces vides pour aligner le premier jour */}
            {Array.from({ length: new Date(activeYear, activeMonth, 1).getDay() }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {stats.calendar.map((d, i) => {
              const gapInfo = stats.gapAnalysis.find(g => i >= g.start && i <= g.end);
              const isGapShort = gapInfo && gapInfo.length <= 2;

              return (
                <motion.div
                  key={d.date}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all cursor-default ${
                    d.isToday
                      ? 'ring-2 ring-violet-500 ring-offset-1 ' + (isDark ? 'ring-offset-[#0f0f1a]' : 'ring-offset-white')
                      : ''
                  } ${
                    d.isBooked
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-sm'
                      : d.isPast
                        ? isDark ? 'bg-white/[0.03] text-gray-700' : 'bg-gray-50 text-gray-300'
                        : d.isWeekend
                          ? isDark ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          : isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/10' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {d.date}
                  {d.isBooked && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                  {isGapShort && !d.isBooked && !d.isPast && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Barre de résumé */}
          <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'} flex items-center justify-between`}>
            <span className={`text-xs ${c.muted}`}>
              {stats.bookedFuture} / {stats.futureCalendar.length} jours réservés
            </span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-32 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all"
                  style={{ width: `${Math.min(stats.occupancyFuture, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${stats.occupancyFuture >= 60 ? 'text-violet-400' : stats.occupancyFuture >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                {stats.occupancyFuture.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Colonne droite : heatmap + suggestions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Heatmap jours de la semaine */}
          <div className={`rounded-2xl border p-5 ${c.card}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h3 className={`font-bold text-sm ${c.text}`}>Popularité par jour</h3>
            </div>
            <div className="space-y-2">
              {stats.dayOccupancy.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-xs w-8 ${c.muted}`}>{d.day}</span>
                  <div className={`flex-1 h-5 rounded-full ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ delay: i * 0.08 }}
                      className={`h-full rounded-full bg-gradient-to-r ${
                        d.day === 'Sam' || d.day === 'Dim' ? 'from-amber-400 to-orange-500' : 'from-blue-500 to-indigo-500'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right ${c.sub}`}>{d.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className={`rounded-2xl border p-5 ${c.card}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <h3 className={`font-bold text-sm ${c.text}`}>Suggestions IA</h3>
              {visibleSuggestions.length > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                  {visibleSuggestions.length}
                </span>
              )}
            </div>

            <AnimatePresence>
              {visibleSuggestions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex flex-col items-center justify-center py-6 gap-2`}
                >
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <p className={`text-sm font-bold ${c.text}`}>Tout est optimisé ! 🎉</p>
                  <p className={`text-xs text-center ${c.muted}`}>Aucune action requise pour ce mois.</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {visibleSuggestions.slice(0, 4).map(sug => {
                    const pc = priorityConfig[sug.priority];
                    const isApplied = appliedSuggestions.has(sug.id);
                    return (
                      <motion.div
                        key={sug.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`p-3 rounded-xl border ${isApplied ? 'bg-emerald-500/10 border-emerald-500/20' : pc.bg}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className={`text-xs font-bold ${isApplied ? 'text-emerald-400' : c.text}`}>{sug.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isApplied ? 'bg-emerald-500/20 text-emerald-400' : pc.badge}`}>
                            {isApplied ? '✓ Appliqué' : pc.label}
                          </span>
                        </div>
                        <p className={`text-[11px] mb-2 ${c.muted}`}>{sug.description}</p>
                        <p className={`text-xs font-bold mb-2 ${isApplied ? 'text-emerald-400' : 'text-emerald-400'}`}>
                          {sug.impact}
                        </p>
                        {!isApplied && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAppliedSuggestions(prev => new Set([...prev, sug.id]))}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-white transition-all hover:shadow-sm`}
                            >
                              ✓ {sug.action}
                            </button>
                            <button
                              onClick={() => setDismissedSuggestions(prev => new Set([...prev, sug.id]))}
                              className={`px-2 py-1.5 rounded-lg text-[11px] ${isDark ? 'bg-white/5 text-gray-500 hover:bg-white/10' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'} transition-all`}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
