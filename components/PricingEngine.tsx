'use client';

import { useState, useMemo } from 'react';
import { useBNB, Property } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import {
  DollarSign, Calendar, Tag, Percent, Sun, Snowflake, Plus, Trash2,
  Calculator, Save, Check, X, TrendingUp, TrendingDown, Activity,
  Brain, Target, Building2, ArrowUpRight, ArrowDownRight,
  Zap, Euro, BarChart2
} from 'lucide-react';

interface SeasonRule {
  id: string; name: string; startMonth: number; startDay: number;
  endMonth: number; endDay: number; multiplier: number; type: 'high' | 'low' | 'medium';
}
interface PromoCode {
  id: string; code: string; discount: number; discountType: 'percent' | 'fixed';
  validFrom: string; validTo: string; maxUses: number; usedCount: number; minNights: number; active: boolean;
}
interface PricingConfig {
  weekendSurcharge: number; weekendDays: number[];
  longStayDiscount: { nights: number; discount: number }[];
  seasons: SeasonRule[]; promoCodes: PromoCode[];
}
interface PriceBreakdown {
  basePrice: number; nightlyPrices: { date: string; price: number; label: string }[];
  subtotal: number; weekendSurcharge: number; seasonAdjustment: number;
  longStayDiscount: number; promoDiscount: number; cleaningFee: number;
  totalBeforeFees: number; total: number;
}

const DEFAULT_SEASONS: SeasonRule[] = [
  { id: '1', name: 'Haute saison ete', startMonth: 7, startDay: 1, endMonth: 8, endDay: 31, multiplier: 1.4, type: 'high' },
  { id: '2', name: 'Noel / Nouvel An', startMonth: 12, startDay: 20, endMonth: 1, endDay: 5, multiplier: 1.5, type: 'high' },
  { id: '3', name: 'Basse saison hiver', startMonth: 1, startDay: 6, endMonth: 3, endDay: 15, multiplier: 0.8, type: 'low' },
  { id: '4', name: 'Printemps', startMonth: 3, startDay: 16, endMonth: 6, endDay: 30, multiplier: 1.1, type: 'medium' },
  { id: '5', name: 'Automne', startMonth: 9, startDay: 1, endMonth: 11, endDay: 30, multiplier: 0.9, type: 'low' },
];
const DEFAULT_CONFIG: PricingConfig = {
  weekendSurcharge: 15, weekendDays: [5, 6],
  longStayDiscount: [{ nights: 7, discount: 10 }, { nights: 14, discount: 15 }, { nights: 30, discount: 25 }],
  seasons: DEFAULT_SEASONS,
  promoCodes: [
    { id: '1', code: 'BIENVENUE10', discount: 10, discountType: 'percent', validFrom: '2025-01-01', validTo: '2025-12-31', maxUses: 100, usedCount: 12, minNights: 2, active: true },
    { id: '2', code: 'ETE2025', discount: 50, discountType: 'fixed', validFrom: '2025-06-01', validTo: '2025-09-30', maxUses: 50, usedCount: 3, minNights: 3, active: true },
  ],
};
const MF = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];

function calculatePrice(property: Property, checkIn: string, checkOut: string, config: PricingConfig, promoCode?: string): PriceBreakdown {
  const start = new Date(checkIn); const end = new Date(checkOut);
  const nights = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  if (nights <= 0) return { basePrice: 0, nightlyPrices: [], subtotal: 0, weekendSurcharge: 0, seasonAdjustment: 0, longStayDiscount: 0, promoDiscount: 0, cleaningFee: 0, totalBeforeFees: 0, total: 0 };
  const basePrice = property.price;
  const nightlyPrices: PriceBreakdown['nightlyPrices'] = [];
  let weekendExtra = 0; let seasonExtra = 0;
  for (let i = 0; i < nights; i++) {
    const date = new Date(start); date.setDate(date.getDate() + i);
    const dow = date.getDay(); const month = date.getMonth() + 1; const day = date.getDate();
    let nightPrice = basePrice; let label = 'Standard';
    const season = config.seasons.find(s => {
      if (s.startMonth <= s.endMonth) return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) && (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
      else return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) || (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
    });
    if (season) { seasonExtra += nightPrice * (season.multiplier - 1); nightPrice *= season.multiplier; label = season.name; }
    if (config.weekendDays.includes(dow)) { const s = nightPrice * (config.weekendSurcharge / 100); weekendExtra += s; nightPrice += s; label += label !== 'Standard' ? ' + Weekend' : 'Weekend'; }
    nightlyPrices.push({ date: date.toISOString().split('T')[0], price: Math.round(nightPrice * 100) / 100, label });
  }
  const subtotal = nightlyPrices.reduce((s, n) => s + n.price, 0);
  let longStayDiscount = 0;
  const ad = [...config.longStayDiscount].sort((a, b) => b.nights - a.nights).find(d => nights >= d.nights);
  if (ad) longStayDiscount = subtotal * (ad.discount / 100);
  let promoDiscount = 0;
  if (promoCode) {
    const promo = config.promoCodes.find(p => p.code.toUpperCase() === promoCode.toUpperCase() && p.active && p.usedCount < p.maxUses && nights >= p.minNights);
    if (promo) {
      const now = new Date().toISOString().split('T')[0];
      if (now >= promo.validFrom && now <= promo.validTo) promoDiscount = promo.discountType === 'percent' ? (subtotal - longStayDiscount) * (promo.discount / 100) : promo.discount;
    }
  }
  const cleaningFee = property.cleaningFee || 0;
  const totalBeforeFees = subtotal - longStayDiscount - promoDiscount;
  const total = Math.max(0, totalBeforeFees + cleaningFee);
  return { basePrice, nightlyPrices, subtotal: Math.round(subtotal * 100) / 100, weekendSurcharge: Math.round(weekendExtra * 100) / 100, seasonAdjustment: Math.round(seasonExtra * 100) / 100, longStayDiscount: Math.round(longStayDiscount * 100) / 100, promoDiscount: Math.round(promoDiscount * 100) / 100, cleaningFee, totalBeforeFees: Math.round(totalBeforeFees * 100) / 100, total: Math.round(total * 100) / 100 };
}

export { calculatePrice, type PricingConfig, type PriceBreakdown, type SeasonRule, type PromoCode };

export default function PricingEngine() {
  const { properties, bookings, reviews, getOccupancyRate, getRevenueByProperty } = useBNB();
  const { isDark } = useTheme();
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const [config, setConfig] = useState<PricingConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try { const s = localStorage.getItem('bnbgest_pricing_config'); return s ? JSON.parse(s) : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
  });
  const [simPropertyId, setSimPropertyId] = useState<number>(properties[0]?.id || 0);
  const [simCheckIn, setSimCheckIn] = useState('');
  const [simCheckOut, setSimCheckOut] = useState('');
  const [simPromoCode, setSimPromoCode] = useState('');
  const [activeSection, setActiveSection] = useState<'intelligence' | 'simulator' | 'seasons' | 'promos' | 'settings'>('intelligence');
  const [newSeason, setNewSeason] = useState<Partial<SeasonRule>>({ name: '', startMonth: 1, startDay: 1, endMonth: 1, endDay: 31, multiplier: 1.0, type: 'medium' });
  const [newPromo, setNewPromo] = useState<Partial<PromoCode>>({ code: '', discount: 10, discountType: 'percent', validFrom: '', validTo: '', maxUses: 50, minNights: 1, active: true });

  const selectedProperty = properties.find(p => p.id === simPropertyId);

  /* -- REAL KPIs -- */
  const realKpis = useMemo(() => {
    const d30s = new Date(now); d30s.setDate(d30s.getDate() - 30); const d30 = d30s.toISOString().split('T')[0];
    const ytdStart = `${now.getFullYear()}-01-01`;
    const cb = bookings.filter(b => b.status === 'completed' && b.totalPrice);
    const adr = cb.length > 0 ? Math.round(cb.reduce((s, b) => { const n = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)); return s + (b.totalPrice || 0) / n; }, 0) / cb.length) : 0;
    const rev30 = Math.round(properties.reduce((s, p) => s + getRevenueByProperty(p.id, d30, today), 0));
    const occ30 = properties.length > 0 ? Math.round(properties.reduce((s, p) => s + getOccupancyRate(p.id, d30, today), 0) / properties.length) : 0;
    const revYtd = Math.round(properties.reduce((s, p) => s + getRevenueByProperty(p.id, ytdStart, today), 0));
    const revpar = Math.round(adr * occ30 / 100);
    const avgRating = reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 10) / 10 : 0;
    return { adr, rev30, occ30, revYtd, revpar, avgRating };
  }, [properties, bookings, reviews, getOccupancyRate, getRevenueByProperty, today, now]);

  /* -- OCCUPANCY INTELLIGENCE -- */
  const occIntel = useMemo(() => {
    const f30s = new Date(now); f30s.setDate(f30s.getDate() + 30); const f30 = f30s.toISOString().split('T')[0];
    const f60s = new Date(now); f60s.setDate(f60s.getDate() + 60); const f60 = f60s.toISOString().split('T')[0];
    const d30s = new Date(now); d30s.setDate(d30s.getDate() - 30); const d30 = d30s.toISOString().split('T')[0];
    return properties.map(p => {
      const occ30 = Math.round(getOccupancyRate(p.id, today, f30));
      const occ60 = Math.round(getOccupancyRate(p.id, today, f60));
      const occPast30 = Math.round(getOccupancyRate(p.id, d30, today));
      const d7s = new Date(now); d7s.setDate(d7s.getDate() - 7); const d7 = d7s.toISOString().split('T')[0];
      const velocity = bookings.filter(b => b.propertyId === p.id && b.createdAt && b.createdAt >= d7).length;
      const bookedNights = new Set<string>();
      bookings.filter(b => b.propertyId === p.id && (b.status === 'confirmed' || b.status === 'completed')).forEach(b => {
        const s = new Date(b.checkIn); const e = new Date(b.checkOut);
        for (const d = new Date(s); d < e; d.setDate(d.getDate() + 1)) { const ds = d.toISOString().split('T')[0]; if (ds >= today && ds <= f30) bookedNights.add(ds); }
      });
      let gapNights = 0;
      for (let i = 0; i < 30; i++) { const d = new Date(now); d.setDate(d.getDate() + i); if (!bookedNights.has(d.toISOString().split('T')[0])) gapNights++; }
      let sugMultiplier = 1.0; let reason = 'Prix optimal';
      if (occ30 > 85) { sugMultiplier = 1.15; reason = 'Occupation forte (' + occ30 + '%) - +15% recommande'; }
      else if (occ30 > 70) { sugMultiplier = 1.08; reason = 'Bonne occupation (' + occ30 + '%) - +8% possible'; }
      else if (occ30 < 30) { sugMultiplier = 0.85; reason = 'Faible occupation (' + occ30 + '%) - -15% pour remplir'; }
      else if (occ30 < 50) { sugMultiplier = 0.92; reason = 'Occupation moderee (' + occ30 + '%) - -8% conseille'; }
      if (velocity >= 3) { sugMultiplier = Math.min(sugMultiplier * 1.05, 1.3); reason += ' - demande forte'; }
      const sugPrice = Math.round(p.price * sugMultiplier);
      const delta = sugPrice - p.price;
      const pb = bookings.filter(b => b.propertyId === p.id && b.status === 'completed' && b.totalPrice);
      const propAdr = pb.length > 0 ? Math.round(pb.reduce((s, b) => { const n = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000)); return s + (b.totalPrice || 0) / n; }, 0) / pb.length) : p.price;
      return { property: p, occ30, occ60, occPast30, velocity, gapNights, sugPrice, delta, sugMultiplier, reason, propAdr };
    });
  }, [properties, bookings, getOccupancyRate, today, now]);

  /* -- MONTHLY TREND -- */
  const monthlyTrend = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const ms = new Date(now.getFullYear(), i, 1).toISOString().split('T')[0];
    const me = new Date(now.getFullYear(), i + 1, 0).toISOString().split('T')[0];
    const rev = Math.round(properties.reduce((s, p) => s + getRevenueByProperty(p.id, ms, me), 0));
    const occ = properties.length > 0 ? Math.round(properties.reduce((s, p) => s + getOccupancyRate(p.id, ms, me), 0) / properties.length) : 0;
    return { month: MF[i], rev, occ };
  }), [properties, getRevenueByProperty, getOccupancyRate, now]);

  /* -- PRICE CALENDAR (42 days) -- */
  const priceCalendar = useMemo(() => {
    const prop = properties.find(p => p.id === simPropertyId);
    if (!prop) return [];
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      const next = new Date(d.getTime() + 86400000).toISOString().split('T')[0];
      const bd = calculatePrice(prop, ds, next, config);
      const isBooked = bookings.some(b => b.propertyId === prop.id && (b.status === 'confirmed' || b.status === 'completed') && b.checkIn <= ds && b.checkOut > ds);
      return { date: ds, price: bd.nightlyPrices[0]?.price ?? prop.price, label: bd.nightlyPrices[0]?.label ?? 'Standard', dow: d.getDay(), day: d.getDate(), isBooked };
    });
  }, [simPropertyId, properties, config, bookings, now]);

  /* -- TODAY BADGES -- */
  const todayPriceBadges = useMemo(() => {
    const month = now.getMonth() + 1; const day = now.getDate(); const dow = now.getDay();
    return properties.map(p => {
      let multiplier = 1; let seasonName = 'Tarif standard';
      const season = config.seasons.find(s => {
        if (s.startMonth <= s.endMonth) return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) && (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
        else return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) || (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
      });
      if (season) { multiplier = season.multiplier; seasonName = season.name; }
      let nightPrice = p.price * multiplier; let isWeekend = false;
      if (config.weekendDays.includes(dow)) { nightPrice *= (1 + config.weekendSurcharge / 100); isWeekend = true; }
      return { propertyId: p.id, name: p.name, basePrice: p.price, todayPrice: Math.round(nightPrice), multiplier, seasonName, isWeekend };
    });
  }, [properties, config, now]);

  const priceBreakdown = useMemo(() => {
    if (!selectedProperty || !simCheckIn || !simCheckOut) return null;
    return calculatePrice(selectedProperty, simCheckIn, simCheckOut, config, simPromoCode || undefined);
  }, [selectedProperty, simCheckIn, simCheckOut, config, simPromoCode]);

  const saveConfig = () => localStorage.setItem('bnbgest_pricing_config', JSON.stringify(config));
  const addSeason = () => {
    if (!newSeason.name) return;
    setConfig({ ...config, seasons: [...config.seasons, { id: Date.now().toString(), name: newSeason.name || '', startMonth: newSeason.startMonth || 1, startDay: newSeason.startDay || 1, endMonth: newSeason.endMonth || 1, endDay: newSeason.endDay || 31, multiplier: newSeason.multiplier || 1.0, type: (newSeason.type as SeasonRule['type']) || 'medium' }] });
    setNewSeason({ name: '', startMonth: 1, startDay: 1, endMonth: 1, endDay: 31, multiplier: 1.0, type: 'medium' });
  };
  const removeSeason = (id: string) => setConfig({ ...config, seasons: config.seasons.filter(s => s.id !== id) });
  const addPromo = () => {
    if (!newPromo.code) return;
    setConfig({ ...config, promoCodes: [...config.promoCodes, { id: Date.now().toString(), code: (newPromo.code || '').toUpperCase(), discount: newPromo.discount || 10, discountType: (newPromo.discountType as PromoCode['discountType']) || 'percent', validFrom: newPromo.validFrom || '', validTo: newPromo.validTo || '', maxUses: newPromo.maxUses || 50, usedCount: 0, minNights: newPromo.minNights || 1, active: true }] });
    setNewPromo({ code: '', discount: 10, discountType: 'percent', validFrom: '', validTo: '', maxUses: 50, minNights: 1, active: true });
  };
  const removePromo = (id: string) => setConfig({ ...config, promoCodes: config.promoCodes.filter(p => p.id !== id) });
  const togglePromo = (id: string) => setConfig({ ...config, promoCodes: config.promoCodes.map(p => p.id === id ? { ...p, active: !p.active } : p) });
  const getSeasonIcon = (type: string) => {
    if (type === 'high') return <Sun className="w-4 h-4 text-orange-500" />;
    if (type === 'low') return <Snowflake className="w-4 h-4 text-blue-400" />;
    return <Calendar className="w-4 h-4 text-green-500" />;
  };

  const C = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const M = isDark ? 'text-white/50' : 'text-gray-400';
  const S = isDark ? 'text-white/70' : 'text-gray-600';
  const IF = `${isDark ? 'bg-white/[0.06] border-white/10 text-white placeholder-white/30' : 'bg-white border-gray-200 text-gray-900'} border rounded-xl p-3 w-full`;
  const TC = { contentStyle: { background: isDark ? '#1a1a2e' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 8, color: isDark ? '#fff' : '#111' } };

  if (!properties.length) return (
    <div className={`${C} p-10 flex flex-col items-center gap-4`}>
      <DollarSign className="w-16 h-16 text-[#FF385C] opacity-40" />
      <p className={`${T} text-xl font-semibold`}>Moteur de Prix</p>
      <p className={M}>Ajoutez des proprietes pour activer la tarification.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={`${C} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF385C]/20 flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#FF385C]" /></div>
            <div>
              <h1 className={`${T} text-xl font-bold`}>Moteur de Prix</h1>
              <p className={`${M} text-sm`}>{properties.length} bien{properties.length > 1 ? 's' : ''} - {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className={`text-xs ${M}`}>Tarification temps reel</span></div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'ADR Reel', value: realKpis.adr > 0 ? realKpis.adr + 'EUR' : '---', sub: 'prix/nuit moyen', icon: <Euro className="w-5 h-5" />, color: '#8b5cf6' },
            { label: 'RevPAR', value: realKpis.revpar > 0 ? realKpis.revpar + 'EUR' : '---', sub: 'rev. par nuit dispo', icon: <Activity className="w-5 h-5" />, color: '#f59e0b' },
            { label: 'Occupation 30j', value: realKpis.occ30 + '%', sub: 'taux moyen passe', icon: <Target className="w-5 h-5" />, color: realKpis.occ30 > 70 ? '#22c55e' : realKpis.occ30 > 40 ? '#f59e0b' : '#ef4444' },
            { label: 'Revenus 30j', value: realKpis.rev30 >= 1000 ? (realKpis.rev30 / 1000).toFixed(1) + 'kEUR' : realKpis.rev30 + 'EUR', sub: 'tous biens', icon: <TrendingUp className="w-5 h-5" />, color: '#22c55e' },
          ].map((k, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className={`${SC} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: k.color + '18', color: k.color }}>{k.icon}</div>
              <div className="min-w-0"><p className={`${M} text-xs`}>{k.label}</p><p className={`${T} font-bold text-sm`}>{k.value}</p><p className="text-xs" style={{ color: k.color }}>{k.sub}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Prix ce soir */}
        {todayPriceBadges.length > 0 && (
          <div>
            <p className={`${M} text-xs font-semibold uppercase tracking-wider mb-2`}>Prix suggere ce soir</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayPriceBadges.map(badge => (
                <motion.div key={badge.propertyId} whileHover={{ scale: 1.02 }} className={`${SC} flex items-center justify-between p-3`}>
                  <div className="min-w-0">
                    <p className={`${T} text-sm font-semibold truncate`}>{badge.name}</p>
                    <p className={`${M} text-xs mt-0.5`}>{badge.seasonName}{badge.isWeekend ? ' - Weekend' : ''}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-lg font-black text-emerald-500">{badge.todayPrice}EUR</p>
                    <p className={`text-xs ${badge.multiplier > 1 ? 'text-orange-500' : badge.multiplier < 1 ? 'text-blue-400' : M}`}>
                      {badge.multiplier !== 1 ? (badge.multiplier > 1 ? '+' : '') + Math.round((badge.multiplier - 1) * 100) + '% vs base' : 'Prix standard'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex flex-wrap gap-1 mt-5 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} w-fit`}>
          {([
            { id: 'intelligence', label: 'Intelligence' },
            { id: 'simulator', label: 'Simulateur' },
            { id: 'seasons', label: 'Saisons' },
            { id: 'promos', label: 'Promos' },
            { id: 'settings', label: 'Parametres' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveSection(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeSection === t.id ? 'bg-[#FF385C] text-white shadow-md' : S}`}>
              {t.id === 'intelligence' ? '?? ' + t.label : t.id === 'simulator' ? '?? ' + t.label : t.id === 'seasons' ? '?? ' + t.label : t.id === 'promos' ? '??? ' + t.label : '?? ' + t.label}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* INTELLIGENCE */}
        {activeSection === 'intelligence' && (
          <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className={`${C} p-4 flex items-center gap-3`}>
              <Brain className="w-5 h-5 text-[#FF385C] flex-shrink-0" />
              <p className={`${S} text-sm`}><strong className={T}>Recommandations tarifaires</strong> — basees sur l occupation reelle, la velocite de reservation et l historique des revenus.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {occIntel.map((intel, i) => (
                <motion.div key={intel.property.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileHover={{ scale: 1.01 }} className={`${C} p-5`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#FF385C]/15 flex items-center justify-center"><Building2 className="w-4 h-4 text-[#FF385C]" /></div>
                      <div>
                        <p className={`${T} font-semibold text-sm`}>{intel.property.name}</p>
                        <p className={`${M} text-xs`}>Base: {intel.property.price}EUR/nuit - ADR reel: {intel.propAdr}EUR</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${intel.delta > 0 ? 'text-emerald-400' : intel.delta < 0 ? 'text-amber-400' : T}`}>{intel.sugPrice}EUR</p>
                      <div className={`flex items-center justify-end gap-1 text-xs ${intel.delta > 0 ? 'text-emerald-400' : intel.delta < 0 ? 'text-amber-400' : M}`}>
                        {intel.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : intel.delta < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                        <span>{intel.delta > 0 ? '+' : ''}{intel.delta}EUR</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    {[
                      { label: 'Occ. 30j futur', value: intel.occ30, color: intel.occ30 > 70 ? '#22c55e' : intel.occ30 > 40 ? '#f59e0b' : '#ef4444' },
                      { label: 'Occ. 60j futur', value: intel.occ60, color: '#8b5cf6' },
                      { label: 'Occ. 30j passe', value: intel.occPast30, color: '#6b7280' },
                    ].map(bar => (
                      <div key={bar.label} className="flex items-center gap-2">
                        <span className={`${M} text-xs w-28`}>{bar.label}</span>
                        <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                          <motion.div initial={{ width: 0 }} animate={{ width: bar.value + '%' }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: bar.color }} />
                        </div>
                        <span className="text-xs font-medium w-8 text-right" style={{ color: bar.color }}>{bar.value}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'} ${M}`}>Velocite: {intel.velocity} res./7j</span>
                    <span className={`text-xs px-2 py-1 rounded-lg ${intel.gapNights > 10 ? 'bg-red-500/15 text-red-400' : intel.gapNights > 5 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{intel.gapNights} nuits libres/30j</span>
                    {intel.propAdr > 0 && <span className="text-xs px-2 py-1 rounded-lg bg-violet-500/15 text-violet-400">ADR {intel.propAdr}EUR</span>}
                  </div>
                  <div className={`${SC} px-3 py-2 flex items-start gap-2`}>
                    <Zap className="w-3.5 h-3.5 text-[#FF385C] flex-shrink-0 mt-0.5" />
                    <p className={`text-xs ${S} flex-1`}>{intel.reason}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Revenue trend */}
            <div className={`${C} p-5`}>
              <div className="flex items-center gap-2 mb-4"><BarChart2 className="w-4 h-4 text-[#FF385C]" /><h3 className={`${T} font-semibold text-sm`}>Revenus et Occupation — {now.getFullYear()}</h3></div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF385C" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF385C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'} />
                    <XAxis dataKey="month" tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip {...TC} formatter={(v: unknown, n: unknown) => [n === 'rev' ? v + 'EUR' : v + '%', n === 'rev' ? 'Revenus' : 'Occupation']} />
                    <Area yAxisId="l" type="monotone" dataKey="rev" stroke="#FF385C" fill="url(#revGrad)" strokeWidth={2} />
                    <Area yAxisId="r" type="monotone" dataKey="occ" stroke="#8b5cf6" fill="url(#occGrad)" strokeWidth={2} strokeDasharray="5 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#FF385C] rounded" /><span className={`${M} text-xs`}>Revenus (EUR)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-violet-500 rounded" style={{ borderStyle: 'dashed' }} /><span className={`${M} text-xs`}>Occupation (%)</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* SIMULATOR */}
        {activeSection === 'simulator' && (
          <motion.div key="sim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`${C} p-5 space-y-4`}>
                <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-[#FF385C]" /><h3 className={`${T} text-lg font-bold`}>Simulateur de prix</h3></div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${M}`}>Propriete</label>
                  <select value={simPropertyId} onChange={(e) => setSimPropertyId(Number(e.target.value))} className={IF}>
                    {properties.map(p => <option key={p.id} value={p.id} className="text-gray-900">{p.name} — {p.price}EUR/nuit</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={`block text-xs font-medium mb-1.5 ${M}`}>Arrivee</label><input type="date" value={simCheckIn} onChange={(e) => setSimCheckIn(e.target.value)} className={IF} /></div>
                  <div><label className={`block text-xs font-medium mb-1.5 ${M}`}>Depart</label><input type="date" value={simCheckOut} onChange={(e) => setSimCheckOut(e.target.value)} className={IF} /></div>
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${M}`}>Code promo (optionnel)</label>
                  <input type="text" value={simPromoCode} onChange={(e) => setSimPromoCode(e.target.value.toUpperCase())} placeholder="Ex: BIENVENUE10" className={IF} />
                </div>
                {selectedProperty && (() => {
                  const intel = occIntel.find(o => o.property.id === selectedProperty.id);
                  if (!intel) return null;
                  const nights = simCheckIn && simCheckOut ? Math.ceil((new Date(simCheckOut).getTime() - new Date(simCheckIn).getTime()) / 86400000) : 0;
                  return (
                    <div className={`${SC} p-3 space-y-2`}>
                      <p className={`${M} text-xs font-semibold uppercase tracking-wider`}>Contexte marche</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div><p className={`${M} text-xs`}>Prix base</p><p className={`${T} font-bold`}>{selectedProperty.price}EUR</p></div>
                        <div><p className={`${M} text-xs`}>ADR reel</p><p className="text-violet-400 font-bold">{intel.propAdr > 0 ? intel.propAdr + 'EUR' : '---'}</p></div>
                        <div><p className={`${M} text-xs`}>Suggere</p><p className={`font-bold ${intel.delta > 0 ? 'text-emerald-400' : intel.delta < 0 ? 'text-amber-400' : T}`}>{intel.sugPrice}EUR</p></div>
                      </div>
                      {nights > 0 && <p className={`${M} text-xs text-center`}>{nights} nuit{nights > 1 ? 's' : ''} - occ. future 30j: {intel.occ30}%</p>}
                    </div>
                  );
                })()}
              </div>
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4"><DollarSign className="w-5 h-5 text-emerald-500" /><h3 className={`${T} text-lg font-bold`}>Detail du prix</h3></div>
                {priceBreakdown ? (
                  <div className="space-y-3">
                    <div className={`flex justify-between text-sm ${S}`}><span>Prix de base ({priceBreakdown.nightlyPrices.length} nuits x {priceBreakdown.basePrice}EUR)</span><span>{(priceBreakdown.basePrice * priceBreakdown.nightlyPrices.length).toFixed(2)}EUR</span></div>
                    {priceBreakdown.seasonAdjustment !== 0 && <div className={`flex justify-between text-sm ${priceBreakdown.seasonAdjustment > 0 ? 'text-orange-400' : 'text-blue-400'}`}><span>Ajustement saisonnier</span><span>{priceBreakdown.seasonAdjustment > 0 ? '+' : ''}{priceBreakdown.seasonAdjustment.toFixed(2)}EUR</span></div>}
                    {priceBreakdown.weekendSurcharge > 0 && <div className="flex justify-between text-sm text-orange-400"><span>Supplement weekend (+{config.weekendSurcharge}%)</span><span>+{priceBreakdown.weekendSurcharge.toFixed(2)}EUR</span></div>}
                    <div className={`border-t pt-2 flex justify-between font-medium ${isDark ? 'border-white/10 text-gray-200' : 'border-gray-200 text-gray-800'}`}><span>Sous-total</span><span>{priceBreakdown.subtotal.toFixed(2)}EUR</span></div>
                    {priceBreakdown.longStayDiscount > 0 && <div className="flex justify-between text-sm text-emerald-400"><span>Remise long sejour</span><span>-{priceBreakdown.longStayDiscount.toFixed(2)}EUR</span></div>}
                    {priceBreakdown.promoDiscount > 0 && <div className="flex justify-between text-sm text-emerald-400"><span>Code promo ({simPromoCode})</span><span>-{priceBreakdown.promoDiscount.toFixed(2)}EUR</span></div>}
                    {priceBreakdown.cleaningFee > 0 && <div className={`flex justify-between text-sm ${S}`}><span>Frais de menage</span><span>+{priceBreakdown.cleaningFee.toFixed(2)}EUR</span></div>}
                    <div className={`border-t-2 pt-3 flex justify-between text-xl font-bold ${isDark ? 'border-[#FF385C]/40' : 'border-[#FF385C]/20'}`}><span className={T}>Total</span><span className="text-emerald-500">{priceBreakdown.total.toFixed(2)}EUR</span></div>
                    <details className={`mt-2 ${M}`}>
                      <summary className="cursor-pointer text-sm font-medium hover:text-[#FF385C]">Detail par nuit</summary>
                      <div className="mt-2 space-y-1 max-h-44 overflow-y-auto pr-1">
                        {priceBreakdown.nightlyPrices.map((n, i) => (
                          <div key={i} className={`flex justify-between text-xs py-1 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                            <span>{new Date(n.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span className={M}>{n.label}</span>
                            <span className="font-medium">{n.price.toFixed(2)}EUR</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : (
                  <p className={`text-center py-12 ${M}`}>Selectionnez une propriete et des dates pour voir le calcul</p>
                )}
              </div>
            </div>
            {/* Price Calendar */}
            {priceCalendar.length > 0 && (
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-[#FF385C]" />
                  <h3 className={`${T} font-semibold text-sm`}>Calendrier des prix — {properties.find(p => p.id === simPropertyId)?.name} (42 jours)</h3>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
                    <div key={d} className={`text-xs font-semibold pb-1 ${M}`}>{d}</div>
                  ))}
                  {Array.from({ length: priceCalendar[0] ? (priceCalendar[0].dow === 0 ? 6 : priceCalendar[0].dow - 1) : 0 }).map((_, i) => <div key={'e' + i} />)}
                  {priceCalendar.map((day, i) => {
                    const isWE = day.dow === 0 || day.dow === 6;
                    const basePx = properties.find(p => p.id === simPropertyId)?.price ?? 100;
                    const isHigh = day.price > basePx * 1.2;
                    const bg = day.isBooked
                      ? isDark ? 'bg-red-900/40 border-red-500/30' : 'bg-red-50 border-red-200'
                      : isHigh ? isDark ? 'bg-orange-900/30 border-orange-500/30' : 'bg-orange-50 border-orange-200'
                      : isWE ? isDark ? 'bg-violet-900/30 border-violet-500/30' : 'bg-violet-50 border-violet-200'
                      : isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100';
                    return (
                      <div key={i} className={`border rounded-lg p-1.5 text-center ${bg}`}>
                        <p className={`text-xs ${M}`}>{day.day}</p>
                        <p className={`text-xs font-bold ${day.isBooked ? 'text-red-400' : T}`}>{day.isBooked ? 'X' : day.price + 'E'}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {[
                    { color: isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100', label: 'Standard' },
                    { color: isDark ? 'bg-violet-900/30 border-violet-500/30' : 'bg-violet-50 border-violet-200', label: 'Weekend' },
                    { color: isDark ? 'bg-orange-900/30 border-orange-500/30' : 'bg-orange-50 border-orange-200', label: 'Haute saison' },
                    { color: isDark ? 'bg-red-900/40 border-red-500/30' : 'bg-red-50 border-red-200', label: 'Reserve' },
                  ].map(leg => <div key={leg.label} className="flex items-center gap-1.5"><div className={`w-4 h-4 rounded border ${leg.color}`} /><span className={`${M} text-xs`}>{leg.label}</span></div>)}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* SEASONS */}
        {activeSection === 'seasons' && (
          <motion.div key="seas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.seasons.map(season => (
                <motion.div key={season.id} whileHover={{ scale: 1.02 }} className={`${C} p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">{getSeasonIcon(season.type)}<h4 className={`${T} font-semibold text-sm`}>{season.name}</h4></div>
                    <button onClick={() => removeSeason(season.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <p className={`text-sm ${M}`}>{season.startDay} {MF[season.startMonth - 1]} au {season.endDay} {MF[season.endMonth - 1]}</p>
                  <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${season.multiplier > 1 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : season.multiplier < 1 ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : isDark ? 'bg-white/[0.06] text-white/60 border-white/10' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    <Percent className="w-3 h-3" />{season.multiplier > 1 ? '+' : ''}{Math.round((season.multiplier - 1) * 100)}%
                  </div>
                </motion.div>
              ))}
            </div>
            <div className={`${C} p-5`}>
              <h4 className={`${T} font-semibold mb-4 flex items-center gap-2`}><Plus className="w-4 h-4" />Ajouter une saison</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="text" placeholder="Nom de la saison" value={newSeason.name || ''} onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })} className={`col-span-2 ${IF}`} />
                <select value={newSeason.type || 'medium'} onChange={(e) => setNewSeason({ ...newSeason, type: e.target.value as SeasonRule['type'] })} className={IF}>
                  <option value="high" className="text-gray-900">Haute</option>
                  <option value="medium" className="text-gray-900">Moyenne</option>
                  <option value="low" className="text-gray-900">Basse</option>
                </select>
                <div className="flex items-center gap-2"><label className={`text-sm ${M}`}>x</label><input type="number" step="0.1" min="0.1" max="3" value={newSeason.multiplier || 1} onChange={(e) => setNewSeason({ ...newSeason, multiplier: parseFloat(e.target.value) })} className={IF} /></div>
                <div className="flex items-center gap-1">
                  <input type="number" min="1" max="12" value={newSeason.startMonth || 1} onChange={(e) => setNewSeason({ ...newSeason, startMonth: parseInt(e.target.value) })} className={`w-14 ${IF}`} />
                  <span className={M}>/</span>
                  <input type="number" min="1" max="31" value={newSeason.startDay || 1} onChange={(e) => setNewSeason({ ...newSeason, startDay: parseInt(e.target.value) })} className={`w-14 ${IF}`} />
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min="1" max="12" value={newSeason.endMonth || 1} onChange={(e) => setNewSeason({ ...newSeason, endMonth: parseInt(e.target.value) })} className={`w-14 ${IF}`} />
                  <span className={M}>/</span>
                  <input type="number" min="1" max="31" value={newSeason.endDay || 31} onChange={(e) => setNewSeason({ ...newSeason, endDay: parseInt(e.target.value) })} className={`w-14 ${IF}`} />
                </div>
                <button onClick={addSeason} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF385C] hover:bg-[#E31C5F] text-white rounded-xl font-medium text-sm transition-colors col-span-2 md:col-span-1"><Plus className="w-4 h-4" />Ajouter</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* PROMOS */}
        {activeSection === 'promos' && (
          <motion.div key="promo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.promoCodes.map(promo => (
                <motion.div key={promo.id} whileHover={{ scale: 1.02 }} className={`${C} p-4`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className={`w-4 h-4 ${promo.active ? 'text-emerald-400' : 'text-gray-400'}`} />
                      <code className="font-mono font-bold text-[#FF385C]">{promo.code}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePromo(promo.id)} className={promo.active ? 'text-emerald-500' : 'text-gray-400'}>{promo.active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}</button>
                      <button onClick={() => removePromo(promo.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className={`${T} text-lg font-bold`}>{promo.discountType === 'percent' ? '-' + promo.discount + '%' : '-' + promo.discount + 'EUR'}</p>
                  <div className={`text-xs space-y-1 mt-2 ${M}`}>
                    <p>Valide: {promo.validFrom} au {promo.validTo}</p>
                    <p>Min. {promo.minNights} nuits - {promo.usedCount}/{promo.maxUses} utilisations</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${promo.active ? 'bg-emerald-500/15 text-emerald-400' : isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'}`}>{promo.active ? 'Actif' : 'Inactif'}</span>
                  </div>
                  <div className="mt-3">
                    <div className={`h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <div className="h-full rounded-full bg-[#FF385C]" style={{ width: Math.min((promo.usedCount / promo.maxUses) * 100, 100) + '%' }} />
                    </div>
                    <p className={`${M} text-xs mt-1`}>{Math.round((promo.usedCount / promo.maxUses) * 100)}% utilise</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className={`${C} p-5`}>
              <h4 className={`${T} font-semibold mb-4 flex items-center gap-2`}><Plus className="w-4 h-4" />Nouveau code promo</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input type="text" placeholder="CODE" value={newPromo.code || ''} onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })} className={`font-mono ${IF}`} />
                <div className="flex gap-2">
                  <input type="number" min="1" value={newPromo.discount || 10} onChange={(e) => setNewPromo({ ...newPromo, discount: parseInt(e.target.value) })} className={`w-20 ${IF}`} />
                  <select value={newPromo.discountType || 'percent'} onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as 'percent' | 'fixed' })} className={IF}>
                    <option value="percent" className="text-gray-900">%</option>
                    <option value="fixed" className="text-gray-900">EUR</option>
                  </select>
                </div>
                <input type="date" value={newPromo.validFrom || ''} onChange={(e) => setNewPromo({ ...newPromo, validFrom: e.target.value })} className={IF} />
                <input type="date" value={newPromo.validTo || ''} onChange={(e) => setNewPromo({ ...newPromo, validTo: e.target.value })} className={IF} />
                <input type="number" min="1" placeholder="Max utilisations" value={newPromo.maxUses || 50} onChange={(e) => setNewPromo({ ...newPromo, maxUses: parseInt(e.target.value) })} className={IF} />
                <input type="number" min="1" placeholder="Min nuits" value={newPromo.minNights || 1} onChange={(e) => setNewPromo({ ...newPromo, minNights: parseInt(e.target.value) })} className={IF} />
                <button onClick={addPromo} className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF385C] hover:bg-[#E31C5F] text-white rounded-xl font-medium text-sm transition-colors"><Plus className="w-4 h-4" />Ajouter le code</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* SETTINGS */}
        {activeSection === 'settings' && (
          <motion.div key="sett" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className={`${C} p-6 space-y-6`}>
              <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#FF385C]" /><h3 className={`${T} text-lg font-bold`}>Parametres de tarification</h3></div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${S}`}>Supplement weekend (%)</label>
                <input type="number" min="0" max="100" value={config.weekendSurcharge} onChange={(e) => setConfig({ ...config, weekendSurcharge: parseInt(e.target.value) || 0 })} className={`w-32 ${IF}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${S}`}>Jours weekend</label>
                <div className="flex gap-2">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, i) => (
                    <button key={i} onClick={() => { const days = config.weekendDays.includes(i) ? config.weekendDays.filter(d => d !== i) : [...config.weekendDays, i]; setConfig({ ...config, weekendDays: days }); }}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${config.weekendDays.includes(i) ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/[0.06] text-white/60' : 'bg-gray-100 text-gray-600'}`}>{day}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${S}`}>Remises long sejour</label>
                <div className="space-y-2">
                  {config.longStayDiscount.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-sm ${M}`}>&gt;=</span>
                      <input type="number" value={d.nights} onChange={(e) => { const nd = [...config.longStayDiscount]; nd[i] = { ...d, nights: parseInt(e.target.value) || 0 }; setConfig({ ...config, longStayDiscount: nd }); }} className={`w-20 ${IF}`} />
                      <span className={`text-sm ${M}`}>nuits</span>
                      <input type="number" value={d.discount} onChange={(e) => { const nd = [...config.longStayDiscount]; nd[i] = { ...d, discount: parseInt(e.target.value) || 0 }; setConfig({ ...config, longStayDiscount: nd }); }} className={`w-20 ${IF}`} />
                      <span className={`text-sm ${M}`}>%</span>
                      <button onClick={() => setConfig({ ...config, longStayDiscount: config.longStayDiscount.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => setConfig({ ...config, longStayDiscount: [...config.longStayDiscount, { nights: 7, discount: 5 }] })} className={`flex items-center gap-2 text-sm ${M} hover:text-[#FF385C] transition-colors`}><Plus className="w-4 h-4" />Ajouter un palier</button>
                </div>
              </div>
              <button onClick={saveConfig} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium text-sm transition-colors"><Save className="w-4 h-4" />Sauvegarder les parametres</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
