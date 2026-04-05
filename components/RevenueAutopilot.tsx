'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Euro, Calendar, Building2, Target, Bell, BellOff,
  Play, Pause, RefreshCw, ChevronRight, Info,
  Flame, Snowflake, Minus, ArrowUpRight, ArrowDownRight,
  BarChart2, Activity, Clock, Sparkles, Settings2,
  ToggleLeft, ToggleRight, Eye, EyeOff
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell, ReferenceLine
} from 'recharts';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';

/* ═══════════ TYPES ═══════════ */
type AlertLevel = 'critical' | 'warning' | 'info' | 'success';
type PromoType = 'last_minute' | 'early_bird' | 'week_fill' | 'extension' | 'off_peak';

interface AutoAlert {
  id: string;
  propertyId: number;
  propertyName: string;
  level: AlertLevel;
  title: string;
  message: string;
  action: string;
  impact: number;
  promoType?: PromoType;
  suggestedDiscount?: number;
  suggestedPrice?: number;
  triggeredAt: Date;
  dismissed: boolean;
  applied: boolean;
}

interface PropStat {
  id: number;
  name: string;
  price: number;
  occ30: number;
  occ7: number;
  revMonth: number;
  revPrev: number;
  vacDays30: number;
  vacDays7: number;
  nextBooking: string | null;
  gapBeforeNext: number;
  trend: 'up' | 'down' | 'stable';
  health: 'excellent' | 'good' | 'warning' | 'critical';
  autopilotEnabled: boolean;
}

interface AutopilotRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerPct: number;   // occupation threshold %
  discountPct: number;  // suggested discount
  icon: string;
}

/* ═══════════ HELPERS ═══════════ */
const SEASON: Record<number, number> = { 0:.75,1:.80,2:.90,3:1.00,4:1.05,5:1.15,6:1.30,7:1.35,8:1.20,9:1.05,10:.85,11:.80 };
const MFR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
function uid() { return Math.random().toString(36).slice(2, 9); }
function ddays(a: string, b: string) { return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function euro(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }
function healthColor(h: PropStat['health']) { return h === 'excellent' ? '#22c55e' : h === 'good' ? '#3b82f6' : h === 'warning' ? '#f59e0b' : '#ef4444'; }
function levelColor(l: AlertLevel) { return l === 'critical' ? '#ef4444' : l === 'warning' ? '#f59e0b' : l === 'info' ? '#3b82f6' : '#22c55e'; }
function levelBg(l: AlertLevel, dark: boolean) {
  if (dark) return l === 'critical' ? 'bg-red-500/10 border-red-500/30' : l === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : l === 'info' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-emerald-500/10 border-emerald-500/30';
  return l === 'critical' ? 'bg-red-50 border-red-200' : l === 'warning' ? 'bg-amber-50 border-amber-200' : l === 'info' ? 'bg-blue-50 border-blue-200' : 'bg-emerald-50 border-emerald-200';
}

const DEFAULT_RULES: AutopilotRule[] = [
  { id: 'lm', name: 'Last-Minute', description: 'Créneau vide dans les 3 prochains jours', enabled: true, triggerPct: 0, discountPct: 15, icon: '⚡' },
  { id: 'wf', name: 'Remplissage Semaine', description: 'Moins de 40% d\'occupation sur 7 jours', enabled: true, triggerPct: 40, discountPct: 10, icon: '📅' },
  { id: 'op', name: 'Basse Saison', description: 'Coefficient saisonnier < 0.9', enabled: true, triggerPct: 0, discountPct: 12, icon: '❄️' },
  { id: 'eb', name: 'Early Bird', description: 'Réservation >30j à l\'avance → bonus fidélité', enabled: false, triggerPct: 0, discountPct: 8, icon: '🐦' },
  { id: 'ext', name: 'Extension Séjour', description: 'Voyageur déjà présent, nuits suivantes vides', enabled: true, triggerPct: 0, discountPct: 20, icon: '🔄' },
];

/* ═══════════ COMPONENT ═══════════ */
export default function RevenueAutopilot() {
  const { properties, bookings, getOccupancyRate, getRevenueByProperty } = useBNB();
  const { isDark } = useTheme();

  const [globalAutopilot, setGlobalAutopilot] = useState(true);
  const [alerts, setAlerts] = useState<AutoAlert[]>([]);
  const [rules, setRules] = useState<AutopilotRule[]>(DEFAULT_RULES);
  const [propEnabled, setPropEnabled] = useState<Record<number, boolean>>({});
  const [tab, setTab] = useState<'dashboard' | 'alerts' | 'rules' | 'heatmap'>('dashboard');
  const [lastScan, setLastScan] = useState(new Date());
  const [scanning, setScanning] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const scanInterval = useRef<NodeJS.Timeout | null>(null);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const mo = now.getMonth();
  const yr = now.getFullYear();

  /* ── PROPERTY STATS ── */
  const propStats: PropStat[] = useMemo(() => {
    return properties.map(p => {
      const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
      const d7 = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const d7f = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
      const d30f = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
      const mStart = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
      const mEnd = `${yr}-${String(mo + 1).padStart(2, '0')}-${new Date(yr, mo + 1, 0).getDate()}`;
      const pmStart = mo === 0 ? `${yr - 1}-12-01` : `${yr}-${String(mo).padStart(2, '0')}-01`;
      const pmEnd = mo === 0 ? `${yr - 1}-12-31` : `${yr}-${String(mo).padStart(2, '0')}-${new Date(yr, mo, 0).getDate()}`;

      const occ30 = Math.round(getOccupancyRate(p.id, d30, today));
      const occ7 = Math.round(getOccupancyRate(p.id, d7, today));
      const revMonth = getRevenueByProperty(p.id, mStart, mEnd);
      const revPrev = getRevenueByProperty(p.id, pmStart, pmEnd);

      const upcoming = bookings.filter(b => b.propertyId === p.id && b.checkIn >= today && b.checkIn <= d30f && (b.status === 'confirmed' || b.status === 'completed'));
      const upcoming7b = bookings.filter(b => b.propertyId === p.id && b.checkIn >= today && b.checkIn <= d7f && (b.status === 'confirmed' || b.status === 'completed'));
      const coveredDays30 = upcoming.reduce((s, b) => s + ddays(b.checkIn, b.checkOut), 0);
      const coveredDays7 = upcoming7b.reduce((s, b) => s + ddays(b.checkIn, b.checkOut), 0);
      const vacDays30 = Math.max(0, 30 - coveredDays30);
      const vacDays7 = Math.max(0, 7 - coveredDays7);

      const nextB = upcoming.sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
      const nextBooking = nextB?.checkIn ?? null;
      const gapBeforeNext = nextBooking ? ddays(today, nextBooking) : 30;

      const trend: PropStat['trend'] = revMonth > revPrev * 1.05 ? 'up' : revMonth < revPrev * 0.95 ? 'down' : 'stable';
      const health: PropStat['health'] = occ30 >= 75 ? 'excellent' : occ30 >= 55 ? 'good' : occ30 >= 35 ? 'warning' : 'critical';

      return {
        id: p.id, name: p.name, price: p.price,
        occ30, occ7, revMonth, revPrev,
        vacDays30, vacDays7, nextBooking, gapBeforeNext,
        trend, health,
        autopilotEnabled: propEnabled[p.id] !== false,
      };
    });
  }, [properties, bookings, getOccupancyRate, getRevenueByProperty, propEnabled, today, mo, yr, now]);

  /* ── ALERT ENGINE ── */
  const generateAlerts = useMemo(() => {
    const newAlerts: AutoAlert[] = [];
    const sf = SEASON[mo];
    const d3f = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0];
    const d7f = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const d30f = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

    propStats.forEach(ps => {
      if (!ps.autopilotEnabled || !globalAutopilot) return;
      const prop = properties.find(p => p.id === ps.id);
      if (!prop) return;

      // 1. CRÉNEAU VIDE IMMÉDIAT (< 3j)
      if (ps.gapBeforeNext >= 1 && ps.gapBeforeNext <= 3 && rules.find(r => r.id === 'lm')?.enabled) {
        const disc = rules.find(r => r.id === 'lm')!.discountPct;
        const suggestedPrice = Math.round(prop.price * (1 - disc / 100) / 5) * 5;
        newAlerts.push({
          id: uid(), propertyId: ps.id, propertyName: ps.name,
          level: 'critical', promoType: 'last_minute',
          title: '⚡ Créneau last-minute détecté',
          message: `${ps.gapBeforeNext} jour${ps.gapBeforeNext > 1 ? 's' : ''} vide${ps.gapBeforeNext > 1 ? 's' : ''} avant la prochaine réservation. Promotion -${disc}% recommandée.`,
          action: `Passer à ${suggestedPrice}€/nuit (-${disc}%)`,
          impact: Math.round(ps.gapBeforeNext * suggestedPrice),
          suggestedDiscount: disc, suggestedPrice,
          triggeredAt: new Date(), dismissed: false, applied: false,
        });
      }

      // 2. FAIBLE OCCUPATION 7J
      if (ps.occ7 < 40 && ps.vacDays7 >= 3 && rules.find(r => r.id === 'wf')?.enabled) {
        const disc = rules.find(r => r.id === 'wf')!.discountPct;
        const suggestedPrice = Math.round(prop.price * (1 - disc / 100) / 5) * 5;
        newAlerts.push({
          id: uid(), propertyId: ps.id, propertyName: ps.name,
          level: 'warning', promoType: 'week_fill',
          title: '📅 Semaine sous-remplie',
          message: `Seulement ${7 - ps.vacDays7} jours réservés sur 7. Taux : ${ps.occ7}%. Promotion pour stimuler.`,
          action: `Offre spéciale ${suggestedPrice}€/nuit cette semaine`,
          impact: Math.round(ps.vacDays7 * suggestedPrice),
          suggestedDiscount: disc, suggestedPrice,
          triggeredAt: new Date(), dismissed: false, applied: false,
        });
      }

      // 3. BASSE SAISON
      if (sf < 0.9 && ps.occ30 < 50 && rules.find(r => r.id === 'op')?.enabled) {
        const disc = rules.find(r => r.id === 'op')!.discountPct;
        const suggestedPrice = Math.round(prop.price * sf * (1 - disc / 100) / 5) * 5;
        newAlerts.push({
          id: uid(), propertyId: ps.id, propertyName: ps.name,
          level: 'info', promoType: 'off_peak',
          title: '❄️ Basse saison détectée',
          message: `Coefficient saisonnier ×${sf.toFixed(2)}. Occupation 30j : ${ps.occ30}%. Ajustement tarifaire recommandé.`,
          action: `Tarif basse saison : ${suggestedPrice}€/nuit`,
          impact: Math.round(ps.vacDays30 * suggestedPrice * 0.4),
          suggestedDiscount: disc, suggestedPrice,
          triggeredAt: new Date(), dismissed: false, applied: false,
        });
      }

      // 4. VOYAGEUR EN COURS — EXTENSION
      const activeNow = bookings.filter(b =>
        b.propertyId === ps.id && b.status === 'confirmed' &&
        b.checkIn <= today && b.checkOut >= today
      );
      if (activeNow.length > 0 && rules.find(r => r.id === 'ext')?.enabled) {
        activeNow.forEach(ab => {
          const nextAfter = bookings.filter(b =>
            b.propertyId === ps.id && b.checkIn > ab.checkOut &&
            (b.status === 'confirmed' || b.status === 'completed')
          ).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
          const gap = nextAfter ? ddays(ab.checkOut, nextAfter.checkIn) : 14;
          if (gap >= 2) {
            const disc = rules.find(r => r.id === 'ext')!.discountPct;
            const suggestedPrice = Math.round(prop.price * (1 - disc / 100) / 5) * 5;
            newAlerts.push({
              id: uid(), propertyId: ps.id, propertyName: ps.name,
              level: 'info', promoType: 'extension',
              title: '🔄 Proposition d\'extension',
              message: `Voyageur actuel check-out le ${new Date(ab.checkOut).toLocaleDateString('fr-FR')}. ${gap} nuits vides ensuite. Proposez une extension.`,
              action: `Extension à ${suggestedPrice}€/nuit (-${disc}%)`,
              impact: Math.round(gap * suggestedPrice * 0.5),
              suggestedDiscount: disc, suggestedPrice,
              triggeredAt: new Date(), dismissed: false, applied: false,
            });
          }
        });
      }

      // 5. OPPORTUNITÉ HAUSSE (haute saison + fort taux)
      if (sf >= 1.15 && ps.occ30 >= 80) {
        const suggestedPrice = Math.round(prop.price * sf * 1.1 / 5) * 5;
        if (suggestedPrice > prop.price) {
          newAlerts.push({
            id: uid(), propertyId: ps.id, propertyName: ps.name,
            level: 'success', promoType: undefined,
            title: '🔥 Opportunité hausse tarifaire',
            message: `Haute saison + occupation ${ps.occ30}%. Vous pouvez augmenter votre tarif de ${Math.round((suggestedPrice / prop.price - 1) * 100)}%.`,
            action: `Monter à ${suggestedPrice}€/nuit`,
            impact: Math.round(ps.vacDays30 * (suggestedPrice - prop.price)),
            suggestedPrice,
            triggeredAt: new Date(), dismissed: false, applied: false,
          });
        }
      }

      // 6. REVENUS EN CHUTE
      if (ps.trend === 'down' && ps.revPrev > 0 && ps.revMonth < ps.revPrev * 0.7) {
        newAlerts.push({
          id: uid(), propertyId: ps.id, propertyName: ps.name,
          level: 'warning',
          title: '📉 Chute de revenus détectée',
          message: `Revenus en baisse de ${Math.round((1 - ps.revMonth / ps.revPrev) * 100)}% vs mois précédent. Action recommandée.`,
          action: 'Analyser et ajuster la stratégie',
          impact: Math.round(ps.revPrev - ps.revMonth),
          triggeredAt: new Date(), dismissed: false, applied: false,
        });
      }
    });

    return newAlerts;
  }, [propStats, properties, bookings, rules, globalAutopilot, mo, today, now]);

  // Init alerts on mount + on scan
  useEffect(() => {
    setAlerts(generateAlerts);
  }, []);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => {
      setAlerts(generateAlerts.map(a => ({ ...a, id: uid() })));
      setLastScan(new Date());
      setScanning(false);
    }, 1200);
  };

  // Auto-scan every 60s
  useEffect(() => {
    if (globalAutopilot) {
      scanInterval.current = setInterval(runScan, 60000);
    }
    return () => { if (scanInterval.current) clearInterval(scanInterval.current); };
  }, [globalAutopilot, generateAlerts]);

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const criticalCount = activeAlerts.filter(a => a.level === 'critical').length;
  const totalImpact = activeAlerts.filter(a => !a.applied).reduce((s, a) => s + a.impact, 0);

  /* ── HEATMAP DATA (30j) ── */
  const heatmapData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getTime() + i * 86400000);
      const ds = d.toISOString().split('T')[0];
      const booked = bookings.filter(b =>
        b.checkIn <= ds && b.checkOut > ds && (b.status === 'confirmed' || b.status === 'completed')
      ).length;
      const total = properties.filter(p => p.status === 'active').length;
      const occ = total > 0 ? Math.round((booked / total) * 100) : 0;
      const rev = booked * (properties.reduce((s, p) => s + p.price, 0) / Math.max(properties.length, 1));
      return {
        day: i + 1,
        date: ds,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        occ, booked, total, rev: Math.round(rev),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [properties, bookings, now]);

  /* ── 12-MONTH TREND ── */
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const s = `${yr}-${String(i + 1).padStart(2, '0')}-01`;
      const e = `${yr}-${String(i + 1).padStart(2, '0')}-${new Date(yr, i + 1, 0).getDate()}`;
      const rev = properties.reduce((sum, p) => sum + getRevenueByProperty(p.id, s, e), 0);
      const occ = properties.length > 0 ? properties.reduce((sum, p) => sum + getOccupancyRate(p.id, s, e), 0) / properties.length : 0;
      const target = rev * (SEASON[i] * 1.2);
      return { month: MFR[i], rev: Math.round(rev), occ: Math.round(occ), target: Math.round(target), current: i === mo };
    });
  }, [properties, getRevenueByProperty, getOccupancyRate, yr, mo]);

  /* ── STYLES ── */
  const card = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const sub = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const M = isDark ? 'text-white/50' : 'text-gray-400';
  const S = isDark ? 'text-white/70' : 'text-gray-600';
  const TC = { contentStyle: { background: isDark ? '#1a1a2e' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 8, color: isDark ? '#fff' : '#111' } };

  if (!properties.length) return (
    <div className={`${card} p-10 flex flex-col items-center gap-4`}>
      <Zap className="w-16 h-16 text-amber-400 opacity-60" />
      <p className={`${T} text-xl font-semibold`}>Autopilot Revenus</p>
      <p className={M}>Ajoutez des propriétés pour activer le pilote automatique.</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={`${card} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${globalAutopilot ? 'bg-amber-500/20' : isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
              <Zap className={`w-5 h-5 ${globalAutopilot ? 'text-amber-400' : M}`} />
            </div>
            <div>
              <h1 className={`${T} text-xl font-bold`}>🤖 Autopilot Revenus</h1>
              <p className={`${M} text-sm`}>
                {globalAutopilot
                  ? `Actif · Dernier scan ${lastScan.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'En pause · Surveillance désactivée'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Global toggle */}
            <button onClick={() => setGlobalAutopilot(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all ${globalAutopilot
                ? isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                : isDark ? 'bg-white/[0.06] border-white/[0.1] text-white/50' : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
              {globalAutopilot ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {globalAutopilot ? 'Autopilot ON' : 'Autopilot OFF'}
            </button>
            <button onClick={runScan}
              className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              <RefreshCw className={`w-4 h-4 ${M} ${scanning ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Alertes actives', value: `${activeAlerts.length}`, sub: `${criticalCount} critiques`, icon: <Bell className="w-5 h-5" />, color: criticalCount > 0 ? '#ef4444' : '#f59e0b' },
            { label: 'Impact potentiel', value: euro(totalImpact), sub: 'si toutes actions prises', icon: <Euro className="w-5 h-5" />, color: '#22c55e' },
            { label: 'Biens surveillés', value: `${propStats.filter(p => p.autopilotEnabled).length}/${properties.length}`, sub: 'avec autopilot actif', icon: <Building2 className="w-5 h-5" />, color: '#8b5cf6' },
            { label: 'Santé portfolio', value: `${Math.round(propStats.reduce((s, p) => s + p.occ30, 0) / Math.max(propStats.length, 1))}%`, sub: 'occupation 30j moyenne', icon: <Activity className="w-5 h-5" />, color: '#3b82f6' },
          ].map((k, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className={`${sub} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}18`, color: k.color }}>{k.icon}</div>
              <div className="min-w-0">
                <p className={`${M} text-xs`}>{k.label}</p>
                <p className={`font-bold text-sm`} style={{ color: k.color }}>{k.value}</p>
                <p className={`${M} text-xs`}>{k.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`flex flex-wrap gap-1 mt-5 p-1 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} w-fit`}>
          {(['dashboard', 'alerts', 'rules', 'heatmap'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tab === t ? 'bg-amber-500 text-white shadow-md' : S}`}>
              {t === 'dashboard' ? '📊 Dashboard' : t === 'alerts' ? `🔔 Alertes ${activeAlerts.length > 0 ? `(${activeAlerts.length})` : ''}` : t === 'rules' ? '⚙️ Règles' : '🗓️ Heatmap'}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            {/* Property cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {propStats.map(ps => (
                <motion.div key={ps.id} whileHover={{ scale: 1.01 }} className={`${card} p-5`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${healthColor(ps.health)}20` }}>
                        <Building2 className="w-4 h-4" style={{ color: healthColor(ps.health) }} />
                      </div>
                      <div>
                        <p className={`${T} font-semibold text-sm`}>{ps.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium`} style={{ backgroundColor: `${healthColor(ps.health)}20`, color: healthColor(ps.health) }}>
                            {ps.health === 'excellent' ? '✅ Excellent' : ps.health === 'good' ? '🔵 Bon' : ps.health === 'warning' ? '⚠️ Attention' : '🔴 Critique'}
                          </span>
                          {ps.trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
                          {ps.trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                          {ps.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </div>
                    </div>
                    {/* Autopilot toggle per property */}
                    <button onClick={() => setPropEnabled(prev => ({ ...prev, [ps.id]: !ps.autopilotEnabled }))}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${ps.autopilotEnabled
                        ? isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                        : isDark ? 'bg-white/[0.06] border-white/[0.1] text-white/40' : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}>
                      {ps.autopilotEnabled ? <Zap className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                      {ps.autopilotEnabled ? 'Auto ON' : 'Auto OFF'}
                    </button>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { l: 'Occ. 30j', v: `${ps.occ30}%`, c: ps.occ30 >= 70 ? '#22c55e' : ps.occ30 >= 45 ? '#f59e0b' : '#ef4444' },
                      { l: 'Revenus mois', v: euro(ps.revMonth), c: ps.revMonth >= ps.revPrev ? '#22c55e' : '#ef4444' },
                      { l: 'Jours vides 30j', v: `${ps.vacDays30}j`, c: ps.vacDays30 <= 5 ? '#22c55e' : ps.vacDays30 <= 12 ? '#f59e0b' : '#ef4444' },
                    ].map((m, i) => (
                      <div key={i} className={`${sub} p-2.5 text-center`}>
                        <p className={`${M} text-[10px]`}>{m.l}</p>
                        <p className="font-bold text-sm mt-0.5" style={{ color: m.c }}>{m.v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Occupation bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${M}`}>Occupation</span>
                      <span className="text-xs font-medium" style={{ color: healthColor(ps.health) }}>{ps.occ30}%</span>
                    </div>
                    <div className={`h-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${ps.occ30}%` }} transition={{ duration: 0.8 }}
                        className="h-full rounded-full" style={{ backgroundColor: healthColor(ps.health) }} />
                    </div>
                  </div>

                  {/* Active alerts for this prop */}
                  {(() => {
                    const pa = activeAlerts.filter(a => a.propertyId === ps.id).slice(0, 2);
                    if (!pa.length) return <div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /><span>Aucune alerte active</span></div>;
                    return (
                      <div className="mt-3 space-y-1.5">
                        {pa.map(a => (
                          <div key={a.id} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${levelBg(a.level, isDark)}`}>
                            <span style={{ color: levelColor(a.level) }}>{a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : a.level === 'info' ? '🔵' : '🟢'}</span>
                            <span className="flex-1 truncate" style={{ color: levelColor(a.level) }}>{a.title}</span>
                            <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: levelColor(a.level) }} />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </motion.div>
              ))}
            </div>

            {/* Monthly Revenue vs Target */}
            <div className={`${card} p-5`}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <h3 className={`${T} font-semibold text-sm`}>Revenus réels vs objectif saisonnier {yr}</h3>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'} />
                    <XAxis dataKey="month" tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TC} formatter={(v: unknown, n: unknown) => [`${v}€`, n === 'rev' ? 'Revenus réels' : 'Objectif']} />
                    <Bar dataKey="rev" radius={[4, 4, 0, 0]}>
                      {monthlyTrend.map((m, i) => (
                        <Cell key={i} fill={m.current ? '#f59e0b' : m.rev >= m.target * 0.8 ? '#22c55e' : m.rev > 0 ? '#8b5cf6' : isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-500" /><span className={`${M} text-xs`}>Mois en cours</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-500" /><span className={`${M} text-xs`}>Objectif atteint</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-violet-500" /><span className={`${M} text-xs`}>En dessous objectif</span></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── ALERTS ── */}
        {tab === 'alerts' && (
          <motion.div key="al" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className={`${card} p-4 flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className={`${S} text-sm`}><strong className={T}>{activeAlerts.length} alerte{activeAlerts.length > 1 ? 's' : ''}</strong> actives — impact total potentiel : <strong className="text-emerald-400">{euro(totalImpact)}</strong></p>
              </div>
              <button onClick={() => setShowDismissed(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${isDark ? 'border-white/[0.1] text-white/50 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {showDismissed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showDismissed ? 'Masquer résolues' : 'Voir toutes'}
              </button>
            </div>

            {activeAlerts.length === 0 && !showDismissed ? (
              <div className={`${card} p-10 flex flex-col items-center gap-3`}>
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className={`${T} font-semibold`}>Aucune alerte active</p>
                <p className={M}>L&apos;autopilot surveille vos biens en continu.</p>
                <button onClick={runScan} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} /> Relancer le scan
                </button>
              </div>
            ) : (
              (showDismissed ? alerts : activeAlerts).map((alert, i) => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className={`${card} p-4 border ${levelBg(alert.level, isDark)} ${alert.dismissed || alert.applied ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${levelColor(alert.level)}20` }}>
                      <AlertTriangle className="w-4 h-4" style={{ color: levelColor(alert.level) }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`${T} font-semibold text-sm`}>{alert.title}</span>
                        {alert.applied && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">✅ Appliqué</span>}
                        {alert.dismissed && !alert.applied && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/40' : 'bg-gray-100 text-gray-400'}`}>Ignoré</span>}
                      </div>
                      <p className={`${S} text-xs mb-2`}>{alert.message}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Building2 className={`w-3 h-3 ${M}`} />
                          <span className={`${M} text-xs`}>{alert.propertyName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className={`w-3 h-3 ${M}`} />
                          <span className={`${M} text-xs`}>{alert.triggeredAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* Action block */}
                      {!alert.dismissed && !alert.applied && (
                        <div className={`${sub} px-3 py-2.5 mt-3 flex items-center justify-between gap-3 flex-wrap`}>
                          <div className="flex items-center gap-2">
                            <Target className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <p className={`text-xs ${S} flex-1`}>{alert.action}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-400">+{euro(alert.impact)}</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Buttons */}
                    {!alert.dismissed && !alert.applied && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, applied: true } : a))}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium transition-colors whitespace-nowrap">
                          ✓ Appliquer
                        </button>
                        <button onClick={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, dismissed: true } : a))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/40' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}>
                          Ignorer
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* ── RULES ── */}
        {tab === 'rules' && (
          <motion.div key="rl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className={`${card} p-4 flex items-center gap-3`}>
              <Settings2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className={`${S} text-sm`}>Configurez les règles de déclenchement de l&apos;autopilot. Chaque règle génère une alerte et une suggestion d&apos;action.</p>
            </div>
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <motion.div key={rule.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`${card} p-5`}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${rule.enabled ? isDark ? 'bg-amber-500/15' : 'bg-amber-50' : isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                      {rule.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className={`${T} font-semibold text-sm`}>{rule.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${rule.enabled ? isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600' : isDark ? 'bg-white/[0.06] border-white/[0.1] text-white/30' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                          {rule.enabled ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className={`${M} text-xs mb-3`}>{rule.description}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className={`${sub} px-3 py-1.5 flex items-center gap-2`}>
                          <Euro className={`w-3.5 h-3.5 ${M}`} />
                          <span className={`text-xs ${S}`}>Remise suggérée :</span>
                          <span className="text-xs font-bold text-amber-400">-{rule.discountPct}%</span>
                        </div>
                        {rule.triggerPct > 0 && (
                          <div className={`${sub} px-3 py-1.5 flex items-center gap-2`}>
                            <Target className={`w-3.5 h-3.5 ${M}`} />
                            <span className={`text-xs ${S}`}>Seuil :</span>
                            <span className="text-xs font-bold text-violet-400">&lt;{rule.triggerPct}% occupation</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Rule controls */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button onClick={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${rule.enabled
                          ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                          : isDark ? 'bg-white/[0.06] text-white/40 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {rule.enabled ? 'Désactiver' : 'Activer'}
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, discountPct: Math.max(5, r.discountPct - 5) } : r))}
                          className={`w-6 h-6 rounded-lg text-xs font-bold ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'} transition-colors`}>-</button>
                        <span className={`text-xs font-bold text-center w-8 ${S}`}>{rule.discountPct}%</span>
                        <button onClick={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, discountPct: Math.min(40, r.discountPct + 5) } : r))}
                          className={`w-6 h-6 rounded-lg text-xs font-bold ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'} transition-colors`}>+</button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── HEATMAP ── */}
        {tab === 'heatmap' && (
          <motion.div key="hm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
            <div className={`${card} p-4 flex items-center gap-3`}>
              <Calendar className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <p className={`${S} text-sm`}>Calendrier de disponibilité — 30 prochains jours. Les cases sombres = jours libres = opportunités.</p>
            </div>

            {/* Heatmap grid */}
            <div className={`${card} p-5`}>
              <h3 className={`${T} font-semibold text-sm mb-4`}>🗓️ Densité d&apos;occupation — {properties.filter(p => p.status === 'active').length} bien{properties.filter(p => p.status === 'active').length > 1 ? 's' : ''} actif{properties.filter(p => p.status === 'active').length > 1 ? 's' : ''}</h3>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                {heatmapData.map((d, i) => {
                  const pct = d.occ;
                  const bg = pct === 0
                    ? isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'
                    : pct < 40 ? '#fbbf24' + '40'
                    : pct < 70 ? '#f59e0b' + '80'
                    : '#22c55e' + 'cc';
                  const textColor = pct >= 70 ? '#fff' : pct >= 40 ? isDark ? '#fff' : '#92400e' : isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af';
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.15, zIndex: 10 }}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center cursor-default group ${d.isWeekend ? 'ring-1 ring-violet-500/30' : ''}`}
                      style={{ backgroundColor: bg }}>
                      <span className="text-[11px] font-bold" style={{ color: textColor }}>{d.day}</span>
                      <span className="text-[9px]" style={{ color: textColor, opacity: .8 }}>{pct > 0 ? `${pct}%` : '—'}</span>
                      {/* Tooltip */}
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none ${isDark ? 'bg-[#0d0d1a] border border-white/10 text-white' : 'bg-gray-900 text-white'}`}>
                        <p className="font-semibold">{d.label}</p>
                        <p>{d.booked}/{d.total} biens · {pct}%</p>
                        {d.rev > 0 && <p className="text-emerald-400">{euro(d.rev)}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <span className={`text-xs ${M}`}>Occupation :</span>
                {[
                  { label: '0%', color: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' },
                  { label: '1-39%', color: '#fbbf2440' },
                  { label: '40-69%', color: '#f59e0b80' },
                  { label: '70-100%', color: '#22c55ecc' },
                ].map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: l.color, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }} />
                    <span className={`text-xs ${M}`}>{l.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded ring-1 ring-violet-500/50" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6' }} />
                  <span className={`text-xs ${M}`}>Week-end</span>
                </div>
              </div>
            </div>

            {/* Occupation curve */}
            <div className={`${card} p-5`}>
              <h3 className={`${T} font-semibold text-sm mb-4`}>📈 Courbe d&apos;occupation — 30 prochains jours</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={heatmapData}>
                    <defs>
                      <linearGradient id="occg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0'} />
                    <XAxis dataKey="label" tick={{ fill: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af', fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                    <YAxis domain={[0, 100]} tick={{ fill: isDark ? 'rgba(255,255,255,0.3)' : '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip {...TC} formatter={(v: unknown) => [`${v}%`, 'Occupation']} />
                    <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Objectif 75%', fill: '#22c55e', fontSize: 10 }} />
                    <Area type="monotone" dataKey="occ" stroke="#f59e0b" fill="url(#occg)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gaps list */}
            {(() => {
              const gaps = heatmapData.filter(d => d.occ === 0);
              if (!gaps.length) return null;
              const groups: { start: number; end: number; days: typeof heatmapData }[] = [];
              let cur: typeof heatmapData = [];
              gaps.forEach((d, i) => {
                if (i === 0 || d.day !== gaps[i - 1].day + 1) { if (cur.length) groups.push({ start: cur[0].day, end: cur[cur.length - 1].day, days: cur }); cur = [d]; }
                else cur.push(d);
              });
              if (cur.length) groups.push({ start: cur[0].day, end: cur[cur.length - 1].day, days: cur });
              return (
                <div className={`${card} p-5`}>
                  <h3 className={`${T} font-semibold text-sm mb-3`}>⚠️ {gaps.length} jour{gaps.length > 1 ? 's' : ''} entièrement libre{gaps.length > 1 ? 's' : ''} détecté{gaps.length > 1 ? 's' : ''}</h3>
                  <div className="space-y-2">
                    {groups.map((g, i) => {
                      const len = g.end - g.start + 1;
                      const avgPrice = properties.reduce((s, p) => s + p.price, 0) / Math.max(properties.length, 1);
                      const potential = Math.round(len * avgPrice * 0.75);
                      return (
                        <div key={i} className={`${sub} px-4 py-3 flex items-center justify-between gap-3`}>
                          <div className="flex items-center gap-3">
                            <Snowflake className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <div>
                              <p className={`${T} text-sm font-medium`}>{len === 1 ? `Jour ${g.start}` : `Jours ${g.start}–${g.end}`} ({len} nuit{len > 1 ? 's' : ''})</p>
                              <p className={`${M} text-xs`}>Aucun bien réservé</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-amber-400">~{euro(potential)}</p>
                            <p className={`${M} text-xs`}>potentiel</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
