'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminSidebar from '../../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { toast } from 'sonner';
import {
  TrendingUp, TrendingDown, Building2, Euro, BarChart3,
  RefreshCw, ChevronDown, ArrowUpRight, ArrowDownRight,
  Percent, Bed, Star, Download
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PropStats {
  property: {
    id: number; name: string; city: string; currency: string;
    pricePerNight: number | null; bedrooms: number | null;
  };
  bookingsCount: number;
  bookedNights: number;
  occupancyRate: number;
  grossRevenue: number;
  netRevenue: number;
  totalExpenses: number;
  netProfit: number;
  roi: number;
  revPAR: number;
  adr: number;
  bySource: { DIRECT: number; AIRBNB: number; BOOKING_COM: number; OTHER: number };
  expByCategory: Record<string, number>;
}

interface Monthly {
  month: string; label: string;
  revenue: number; expenses: number; profit: number;
  bookings: number; occupancy: number;
}

interface Summary {
  totalRevenue: number; totalExpenses: number; totalProfit: number;
  avgOccupancy: number; avgRevPAR: number; avgADR: number;
  totalBookings: number; roi: number;
}

interface RentabiliteData {
  year: number; months: number;
  properties: PropStats[];
  monthly: Monthly[];
  summary: Summary;
}

function buildEmptyRentabiliteData(year: number): RentabiliteData {
  return {
    year,
    months: 12,
    properties: [],
    monthly: [],
    summary: {
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      avgOccupancy: 0,
      avgRevPAR: 0,
      avgADR: 0,
      totalBookings: 0,
      roi: 0,
    },
  };
}

// ─── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data, isDark }: { data: Monthly[]; isDark: boolean }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1);
  const W = 600; const H = 200; const PAD = 30;
  const barW = Math.floor((W - PAD * 2) / data.length);
  const scale = (v: number) => H - PAD - (v / maxVal) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Revenus vs Dépenses">
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(r => (
        <line key={r}
          x1={PAD} y1={H - PAD - r * (H - PAD * 2)}
          x2={W - PAD} y2={H - PAD - r * (H - PAD * 2)}
          stroke={isDark ? '#374151' : '#e5e7eb'} strokeWidth="1"
        />
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const bW = barW * 0.38;
        const x = PAD + i * barW + barW * 0.1;
        const revH = ((d.revenue) / maxVal) * (H - PAD * 2);
        const expH = ((d.expenses) / maxVal) * (H - PAD * 2);
        return (
          <g key={d.month}>
            {/* Revenue bar */}
            <rect x={x} y={scale(d.revenue)} width={bW} height={revH}
              fill="#3b82f6" rx="2" opacity="0.85" />
            {/* Expense bar */}
            <rect x={x + bW + 2} y={scale(d.expenses)} width={bW} height={expH}
              fill="#f59e0b" rx="2" opacity="0.85" />
            {/* Label */}
            <text x={x + bW} y={H - 4} textAnchor="middle" fontSize="9"
              fill={isDark ? '#9ca3af' : '#6b7280'}>
              {d.label}
            </text>
          </g>
        );
      })}
      {/* Legend */}
      <rect x={W - 120} y={8} width={10} height={10} fill="#3b82f6" rx="2" />
      <text x={W - 106} y={17} fontSize="9" fill={isDark ? '#d1d5db' : '#374151'}>Revenus</text>
      <rect x={W - 60} y={8} width={10} height={10} fill="#f59e0b" rx="2" />
      <text x={W - 46} y={17} fontSize="9" fill={isDark ? '#d1d5db' : '#374151'}>Dépenses</text>
    </svg>
  );
}

// ─── Occupancy Line Chart ─────────────────────────────────────────────────────

function OccupancyChart({ data, isDark }: { data: Monthly[]; isDark: boolean }) {
  if (!data.length) return null;
  const W = 600; const H = 120; const PAD = 30;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (d.occupancy / 100) * (H - PAD * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 25, 50, 75, 100].map(v => {
        const y = H - PAD - (v / 100) * (H - PAD * 2);
        return (
          <g key={v}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y}
              stroke={isDark ? '#374151' : '#e5e7eb'} strokeWidth="1" />
            <text x={PAD - 4} y={y + 3} textAnchor="end" fontSize="8"
              fill={isDark ? '#6b7280' : '#9ca3af'}>{v}%</text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="2.5" />
      {data.map((d, i) => {
        const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
        const y = H - PAD - (d.occupancy / 100) * (H - PAD * 2);
        return (
          <g key={d.month}>
            <circle cx={x} cy={y} r="3.5" fill="#10b981" />
            <text x={x} y={H - 4} textAnchor="middle" fontSize="9"
              fill={isDark ? '#9ca3af' : '#6b7280'}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source, count }: { source: string; count: number }) {
  if (!count) return null;
  const config: Record<string, { label: string; color: string }> = {
    AIRBNB:      { label: 'Airbnb',   color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
    BOOKING_COM: { label: 'Booking',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    DIRECT:      { label: 'Direct',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    OTHER:       { label: 'Autres',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
  };
  const c = config[source] || config.OTHER;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.label} <span className="opacity-70">×{count}</span>
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, trend, isDark
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<{ className?: string }>; color: string;
  trend?: number; isDark: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 shadow-sm border ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${
            isDark ? 'text-gray-400' : 'text-gray-500'
          }`}>{label}</p>
          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${
          trend >= 0 ? 'text-emerald-500' : 'text-red-500'
        }`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}% vs mois précédent
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RentabilitePage() {
  const { isDark } = useTheme();
  const [data, setData]         = useState<RentabiliteData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [year, setYear]         = useState(new Date().getFullYear());
  const [propFilter]            = useState('');
  const [sortBy, setSortBy]     = useState<'revenue' | 'roi' | 'occupancy'>('revenue');
  const [showDetails, setShow]  = useState<number | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ year: String(year) });
      if (propFilter) qs.set('propertyId', propFilter);
      const res = await fetch(`/api/rentabilite?${qs}`);
      if (res.status === 401) {
        window.location.href = '/login?callbackUrl=/rentabilite';
        return;
      }
      if (!res.ok) throw new Error(`Erreur API (${res.status})`);
      const raw = await res.json();
      setData({
        year: Number(raw?.year) || year,
        months: Number(raw?.months) || 12,
        properties: Array.isArray(raw?.properties) ? raw.properties : [],
        monthly: Array.isArray(raw?.monthly) ? raw.monthly : [],
        summary: {
          totalRevenue: Number(raw?.summary?.totalRevenue) || 0,
          totalExpenses: Number(raw?.summary?.totalExpenses) || 0,
          totalProfit: Number(raw?.summary?.totalProfit) || 0,
          avgOccupancy: Number(raw?.summary?.avgOccupancy) || 0,
          avgRevPAR: Number(raw?.summary?.avgRevPAR) || 0,
          avgADR: Number(raw?.summary?.avgADR) || 0,
          totalBookings: Number(raw?.summary?.totalBookings) || 0,
          roi: Number(raw?.summary?.roi) || 0,
        },
      });
    } catch {
      setLoadError('Impossible de charger les données API (session expirée ou serveur indisponible).');
      setData((prev) => prev ?? buildEmptyRentabiliteData(year));
      toast.error('Impossible de charger les données de rentabilité');
    } finally {
      setLoading(false);
    }
  }, [year, propFilter]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Propriété', 'Ville', 'Réservations', 'Nuits', 'Taux occ.', 'Revenu brut', 'Dépenses', 'Profit net', 'ROI', 'RevPAR', 'ADR'],
    ];
    for (const p of data.properties) {
      rows.push([
        p.property.name, p.property.city,
        String(p.bookingsCount), String(p.bookedNights),
        `${p.occupancyRate.toFixed(1)}%`,
        p.grossRevenue.toFixed(2), p.totalExpenses.toFixed(2), p.netProfit.toFixed(2),
        `${p.roi.toFixed(1)}%`, p.revPAR.toFixed(2), p.adr.toFixed(2),
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `rentabilite_${data.year}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const fmt = (n: number, currency = 'EUR') =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  const sorted = data?.properties.slice().sort((a, b) => {
    if (sortBy === 'roi')       return b.roi - a.roi;
    if (sortBy === 'occupancy') return b.occupancyRate - a.occupancyRate;
    return b.grossRevenue - a.grossRevenue;
  }) ?? [];

  const s = data?.summary;

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <TrendingUp className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Tableau de bord rentabilité
              </h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                RevPAR · Taux d&apos;occupation · ROI · ADR par propriété
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Year picker */}
            <div className="relative">
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className={`pl-3 pr-8 py-2 text-sm rounded-lg border appearance-none cursor-pointer ${
                  isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 pointer-events-none text-gray-400" />
            </div>
            <button onClick={load} className={`p-2 rounded-lg transition-colors ${
              isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} disabled={!data} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
              <Download className="w-4 h-4" /> CSV
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {loadError && (
            <div className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
              isDark ? 'bg-red-900/20 border-red-800/50 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p className="text-sm">{loadError}</p>
              <button
                type="button"
                onClick={load}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? 'bg-red-800/50 hover:bg-red-800 text-red-100' : 'bg-red-100 hover:bg-red-200 text-red-700'
                }`}
              >
                Réessayer
              </button>
            </div>
          )}

          {loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className={`w-8 h-8 animate-spin ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
          ) : (
            <>
              {/* ── KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="RevPAR moyen" value={fmt(s?.avgRevPAR ?? 0)}
                  sub="Revenue per Available Night"
                  icon={TrendingUp} color="bg-emerald-500" isDark={isDark}
                />
                <KpiCard
                  label="Taux d'occupation" value={`${s?.avgOccupancy?.toFixed(1) ?? 0}%`}
                  sub={`${s?.totalBookings ?? 0} réservations`}
                  icon={Percent} color="bg-blue-500" isDark={isDark}
                />
                <KpiCard
                  label="Revenu net total" value={fmt(s?.totalProfit ?? 0)}
                  sub={`Brut: ${fmt(s?.totalRevenue ?? 0)}`}
                  icon={Euro} color="bg-violet-500" isDark={isDark}
                />
                <KpiCard
                  label="ROI moyen" value={fmtPct(s?.roi ?? 0)}
                  sub={`Dépenses: ${fmt(s?.totalExpenses ?? 0)}`}
                  icon={BarChart3} color={s && s.roi >= 0 ? "bg-amber-500" : "bg-red-500"} isDark={isDark}
                />
              </div>

              {/* ── Revenue / Expenses Chart */}
              <div className={`rounded-xl p-5 border shadow-sm ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Revenus vs Dépenses mensuels — {year}
                </h2>
                <BarChart data={data?.monthly ?? []} isDark={isDark} />
              </div>

              {/* ── Occupancy Chart */}
              <div className={`rounded-xl p-5 border shadow-sm ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>
                  <Bed className="w-4 h-4 text-emerald-500" />
                  Taux d&apos;occupation mensuel (%)
                </h2>
                <OccupancyChart data={data?.monthly ?? []} isDark={isDark} />
              </div>

              {/* ── Per-Property Table */}
              <div className={`rounded-xl border shadow-sm overflow-hidden ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`flex items-center justify-between px-5 py-4 border-b ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <h2 className={`text-sm font-semibold flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-gray-800'
                  }`}>
                    <Building2 className="w-4 h-4 text-violet-500" />
                    Performance par propriété
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trier par</span>
                    {(['revenue', 'roi', 'occupancy'] as const).map(k => (
                      <button key={k}
                        onClick={() => setSortBy(k)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          sortBy === k
                            ? 'bg-emerald-500 text-white'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {k === 'revenue' ? 'Revenu' : k === 'roi' ? 'ROI' : 'Occupation'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                        {['Propriété', 'Revenu brut', 'Dépenses', 'Bénéfice net', 'Occupation', 'RevPAR', 'ADR', 'ROI', 'Sources', ''].map(h => (
                          <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {sorted.length === 0 ? (
                        <tr>
                          <td colSpan={10} className={`px-4 py-12 text-center text-sm ${
                            isDark ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            Aucune donnée pour {year}. Ajoutez des réservations pour voir les statistiques.
                          </td>
                        </tr>
                      ) : sorted.map(p => (
                        <Fragment key={p.property.id}>
                          <tr key={p.property.id}
                            className={`transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setShow(showDetails === p.property.id ? null : p.property.id)}>
                            <td className="px-4 py-3">
                              <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {p.property.name}
                              </div>
                              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {p.property.city}
                              </div>
                            </td>
                            <td className={`px-4 py-3 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              {fmt(p.grossRevenue)}
                            </td>
                            <td className={`px-4 py-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              {fmt(p.totalExpenses)}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${
                              p.netProfit >= 0
                                ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                                : 'text-red-500'
                            }`}>
                              {fmt(p.netProfit)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 w-16">
                                  <div
                                    className="h-1.5 rounded-full bg-blue-500"
                                    style={{ width: `${Math.min(p.occupancyRate, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {p.occupancyRate.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                              {fmt(p.revPAR)}
                            </td>
                            <td className={`px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {fmt(p.adr)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                p.roi >= 20
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                  : p.roi >= 0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {p.roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {p.roi.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(p.bySource).map(([src, cnt]) => (
                                  <SourceBadge key={src} source={src} count={cnt} />
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <ChevronDown className={`w-4 h-4 transition-transform ${
                                showDetails === p.property.id ? 'rotate-180' : ''
                              } ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                            </td>
                          </tr>

                          {/* Expanded row — expense breakdown */}
                          {showDetails === p.property.id && (
                            <tr key={`${p.property.id}-detail`}>
                              <td colSpan={10} className={`px-6 py-4 ${
                                isDark ? 'bg-gray-750 border-t border-gray-700' : 'bg-gray-50 border-t border-gray-100'
                              }`}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                  <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                                      isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>Détail dépenses</p>
                                    {Object.entries(p.expByCategory).length === 0 ? (
                                      <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Aucune dépense</p>
                                    ) : Object.entries(p.expByCategory).map(([cat, amt]) => (
                                      <div key={cat} className="flex justify-between text-xs mb-1">
                                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                          {cat.charAt(0) + cat.slice(1).toLowerCase()}
                                        </span>
                                        <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                                          {fmt(amt)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="col-span-2 grid grid-cols-3 gap-3">
                                    {[
                                      { label: 'Nuits réservées', value: `${p.bookedNights} nuits` },
                                      { label: 'Réservations',    value: `${p.bookingsCount}` },
                                      { label: 'Chambre(s)',       value: p.property.bedrooms ? `${p.property.bedrooms} ch.` : '—' },
                                    ].map(item => (
                                      <div key={item.label} className={`rounded-lg p-3 text-center ${
                                        isDark ? 'bg-gray-800' : 'bg-white'
                                      }`}>
                                        <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.label}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Monthly summary footer */}
                {data?.monthly && data.monthly.length > 0 && (
                  <div className={`px-5 py-3 border-t grid grid-cols-6 gap-2 text-xs ${
                    isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                  }`}>
                    {data.monthly.map(m => (
                      <div key={m.month} className="text-center">
                        <div className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{m.label}</div>
                        <div className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>{fmt(m.revenue)}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {m.occupancy.toFixed(0)}% occ.
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── ADR insight */}
              {s && s.avgADR > 0 && (
                <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                  isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'
                }`}>
                  <Star className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                      Tarif journalier moyen (ADR) : <strong>{fmt(s.avgADR)}/nuit</strong>
                    </p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                      Basé sur {s.totalBookings} réservation{s.totalBookings > 1 ? 's' : ''} confirmée{s.totalBookings > 1 ? 's' : ''} sur {year}
                    </p>
                  </div>
                </div>
              )}

              {/* ── No data state */}
              {data?.properties.length === 0 && !loading && (
                <div className={`rounded-xl p-10 text-center border-2 border-dashed ${
                  isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
                }`}>
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">Aucune propriété trouvée</p>
                  <p className="text-sm mt-1">Ajoutez des propriétés et des réservations pour voir votre rentabilité.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
