'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import AdminSidebar from '../../components/AdminSidebar';
import ThemeToggle from '../../components/ThemeToggle';
import { toast } from 'sonner';
import {
  FileText, Download, AlertTriangle, Info, ChevronDown,
  Euro, Building2, RefreshCw, CheckCircle2, Calculator
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Regime = 'micro-bic' | 'lmnp-reel' | 'revenus-fonciers';

interface FiscalProperty {
  property: { id: number; name: string; city: string };
  grossRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  bookingsCount: number;
  regime?: {
    imposable: number;
    abattement?: number;
    warning?: string;
    label: string;
  };
}

interface FiscalData {
  year: number;
  properties: FiscalProperty[];
  bookings: BookingRow[];
  expenses: ExpenseRow[];
  totals: { grossRevenue: number; totalExpenses: number; netRevenue: number };
}

interface BookingRow {
  id: number;
  propertyName: string;
  propertyId: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  source: string;
  status: string;
}

interface ExpenseRow {
  id: number;
  propertyName: string | null;
  propertyId: number | null;
  title: string;
  category: string;
  amount: number;
  date: string;
  vendor: string | null;
  isRecurring: boolean;
}

// ─── Fiscal computations ─────────────────────────────────────────────────────

const MICRO_BIC_PLAFOND = 77700;
const MICRO_BIC_ABATTEMENT = 0.5;
const MICRO_FONCIER_PLAFOND = 15000;
const MICRO_FONCIER_ABATTEMENT = 0.3;

function computeRegime(p: FiscalProperty, regime: Regime) {
  const rev = p.grossRevenue;
  const exp = p.totalExpenses;
  switch (regime) {
    case 'micro-bic': {
      const abattement = rev * MICRO_BIC_ABATTEMENT;
      const imposable  = rev - abattement;
      return {
        label: 'Micro-BIC (50% abattement)',
        imposable,
        abattement,
        warning: rev > MICRO_BIC_PLAFOND
          ? `Dépassement plafond Micro-BIC (${MICRO_BIC_PLAFOND.toLocaleString('fr-FR')} €) — passage au régime réel obligatoire`
          : undefined,
      };
    }
    case 'lmnp-reel': {
      const imposable = Math.max(0, rev - exp);
      return {
        label: 'LMNP Régime réel',
        imposable,
        warning: exp === 0 ? 'Aucune charge enregistrée — ajoutez vos dépenses pour optimiser' : undefined,
      };
    }
    case 'revenus-fonciers': {
      if (rev <= MICRO_FONCIER_PLAFOND) {
        const abattement = rev * MICRO_FONCIER_ABATTEMENT;
        const imposable  = rev - abattement;
        return {
          label: 'Micro-foncier (30% abattement)',
          imposable,
          abattement,
          warning: undefined,
        };
      } else {
        const imposable = Math.max(0, rev - exp);
        return {
          label: `Revenus fonciers réel (> ${MICRO_FONCIER_PLAFOND.toLocaleString('fr-FR')} €)`,
          imposable,
          warning: undefined,
        };
      }
    }
  }
}

// ─── Regime info card ─────────────────────────────────────────────────────────

function RegimeCard({ regime, isDark }: { regime: Regime; isDark: boolean }) {
  const info: Record<Regime, { title: string; desc: string; rules: string[]; cerfa: string; color: string }> = {
    'micro-bic': {
      title: 'Micro-BIC',
      desc: 'Pour la location meublée. Abattement forfaitaire de 50% sur les recettes brutes.',
      rules: [
        'Plafond de recettes : 77 700 € (2024)',
        'Abattement automatique de 50%',
        'Aucune charge réelle déductible',
        'Montant imposable = Recettes × 50%',
        'Cotisations sociales : 17,2% (PFU) ou barème IR',
      ],
      cerfa: '2042-C-PRO — Cadre « Revenus industriels et commerciaux professionnels »',
      color: 'blue',
    },
    'lmnp-reel': {
      title: 'LMNP Régime réel simplifié',
      desc: 'Location Meublée Non Professionnelle au régime réel. Déduction des charges réelles et amortissements.',
      rules: [
        'Toutes les charges réelles sont déductibles',
        'Amortissement du mobilier et de l\'immeuble',
        'Imprimé fiscal 2031 à déposer',
        'Résultat possible : bénéfice ou déficit',
        'Déficit imputable sur les BIC de même nature (10 ans)',
      ],
      cerfa: '2031 + annexes 2033 — Bénéfices industriels et commerciaux',
      color: 'violet',
    },
    'revenus-fonciers': {
      title: 'Revenus fonciers (location nue)',
      desc: 'Pour la location non meublée. Micro-foncier si recettes ≤ 15 000 €, régime réel au-delà.',
      rules: [
        'Micro-foncier (≤ 15 000 €) : abattement 30%',
        'Régime réel : charges réelles déductibles',
        'Intérêts d\'emprunt déductibles',
        'Déficit foncier imputable sur revenu global (10 700 €/an)',
        'Excédent reportable sur revenus fonciers (10 ans)',
      ],
      cerfa: '2044 (régime réel) ou 2042 ligne 4BE (micro-foncier)',
      color: 'emerald',
    },
  };

  const r = info[regime];
  const colorMap: Record<string, string> = {
    blue:   isDark ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200',
    violet: isDark ? 'bg-violet-900/30 border-violet-700/50' : 'bg-violet-50 border-violet-200',
    emerald: isDark ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200',
  };
  const textMap: Record<string, string> = {
    blue:   isDark ? 'text-blue-300' : 'text-blue-800',
    violet: isDark ? 'text-violet-300' : 'text-violet-800',
    emerald: isDark ? 'text-emerald-300' : 'text-emerald-800',
  };

  return (
    <div className={`rounded-xl p-5 border ${colorMap[r.color]}`}>
      <div className="flex items-start gap-3">
        <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${textMap[r.color]}`} />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-sm ${textMap[r.color]}`}>{r.title}</h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{r.desc}</p>
          <ul className="mt-3 space-y-1">
            {r.rules.map(rule => (
              <li key={rule} className="flex items-start gap-2 text-xs">
                <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${textMap[r.color]}`} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{rule}</span>
              </li>
            ))}
          </ul>
          <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
            isDark ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700'
          }`}>
            📋 À reporter sur : {r.cerfa}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function downloadCSV(rows: string[][], filename: string) {
  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const csv = bom + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RapportsFiscauxPage() {
  const { isDark } = useTheme();
  const [data, setData]       = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear]       = useState(new Date().getFullYear());
  const [regime, setRegime]   = useState<Regime>('micro-bic');
  const [tmiFactor, setTmi]   = useState(0.3); // Taux Marginal d'Imposition

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rentabilite?year=${year}&months=12`);
      if (!res.ok) throw new Error('Erreur API');
      const raw = await res.json();

      // ── Fetch bookings for CSV export
      const bRes = await fetch(`/api/stats?startDate=${year}-01-01&endDate=${year}-12-31`);
      const bRaw = bRes.ok ? await bRes.json() : {};

      // ── Build fiscal data from rentabilite API
      const properties: FiscalProperty[] = (raw.properties || []).map((p: {
        property: { id: number; name: string; city: string };
        grossRevenue: number;
        totalExpenses: number;
        netRevenue: number;
        bookingsCount: number;
      }) => ({
        property: p.property,
        grossRevenue:   p.grossRevenue,
        totalExpenses:  p.totalExpenses,
        netRevenue:     p.netRevenue,
        bookingsCount:  p.bookingsCount,
      }));

      const totals = raw.summary || { grossRevenue: 0, totalExpenses: 0, netRevenue: 0 };

      setData({
        year,
        properties,
        bookings:  bRaw.bookings || [],
        expenses:  bRaw.expenses || [],
        totals: {
          grossRevenue:  totals.totalRevenue  || 0,
          totalExpenses: totals.totalExpenses || 0,
          netRevenue:    totals.totalProfit   || 0,
        },
      });
    } catch {
      toast.error('Impossible de charger les données fiscales');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const exportBookingsCSV = async () => {
    try {
      const res = await fetch(`/api/bookings?year=${year}&limit=1000`);
      if (!res.ok) {
        // Fallback: use data already loaded
        const rows: string[][] = [
          ['Date entrée', 'Date sortie', 'Nuits', 'Propriété', 'Voyageur', 'Montant TTC', 'Source', 'Statut'],
          ...(data?.bookings || []).map(b => [
            b.checkIn, b.checkOut, String(b.nights), b.propertyName,
            b.guestName, String(b.totalPrice), b.source, b.status,
          ]),
        ];
        downloadCSV(rows, `revenus-locatifs-${year}.csv`);
      } else {
        const json = await res.json();
        const bookings = json.bookings || json || [];
        const rows: string[][] = [
          ['Date entrée', 'Date sortie', 'Nuits', 'Propriété', 'Voyageur', 'Email', 'Montant TTC', 'Source', 'Statut'],
          ...bookings.map((b: {
            checkIn: string; checkOut: string; propertyId: number;
            property?: { name: string }; guestName: string; guestEmail?: string;
            totalPrice: number; source: string; status: string;
          }) => {
            const nights = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
            return [
              new Date(b.checkIn).toLocaleDateString('fr-FR'),
              new Date(b.checkOut).toLocaleDateString('fr-FR'),
              String(nights),
              b.property?.name || String(b.propertyId),
              b.guestName, b.guestEmail || '',
              String(b.totalPrice), b.source, b.status,
            ];
          }),
        ];
        downloadCSV(rows, `revenus-locatifs-${year}.csv`);
      }
      toast.success('Export CSV revenus téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export');
    }
  };

  const exportExpensesCSV = async () => {
    try {
      const res = await fetch(`/api/expenses?startDate=${year}-01-01&endDate=${year}-12-31&limit=1000`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const expenses = json.expenses || json || [];
      const rows: string[][] = [
        ['Date', 'Propriété', 'Catégorie', 'Libellé', 'Montant', 'Fournisseur', 'Récurrent', 'Notes'],
        ...expenses.map((e: {
          date: string; property?: { name: string } | null;
          category: string; title: string; amount: number;
          vendor?: string | null; isRecurring?: boolean; notes?: string | null;
        }) => [
          new Date(e.date).toLocaleDateString('fr-FR'),
          e.property?.name || 'Global',
          e.category.toLowerCase(),
          e.title,
          String(e.amount),
          e.vendor || '',
          e.isRecurring ? 'Oui' : 'Non',
          e.notes || '',
        ]),
      ];
      downloadCSV(rows, `charges-${year}.csv`);
      toast.success('Export CSV charges téléchargé');
    } catch {
      toast.error('Erreur lors de l\'export charges');
    }
  };

  const totalGross = data?.totals.grossRevenue ?? 0;
  const totalExp   = data?.totals.totalExpenses ?? 0;
  const regimeCalc = data?.properties.map(p => ({ ...p, regime: computeRegime(p, regime) })) ?? [];
  const totalImposable = regimeCalc.reduce((s, p) => s + (p.regime?.imposable ?? 0), 0);
  const estimatedTax   = totalImposable * tmiFactor;

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Header */}
        <header className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <FileText className={`w-6 h-6 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Rapports fiscaux
              </h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Micro-BIC · LMNP réel · Revenus fonciers · Export CSV déclaration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className={`w-8 h-8 animate-spin ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
            </div>
          ) : (
            <>
              {/* ── Regime Selector */}
              <div className={`rounded-xl p-5 border shadow-sm ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Régime fiscal pour {year}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {([
                    { id: 'micro-bic' as Regime,         label: 'Micro-BIC',           sub: 'Abattement 50% — location meublée' },
                    { id: 'lmnp-reel' as Regime,         label: 'LMNP Régime réel',    sub: 'Charges réelles + amortissements' },
                    { id: 'revenus-fonciers' as Regime,  label: 'Revenus fonciers',     sub: 'Location nue — micro/réel' },
                  ] as const).map(r => (
                    <button key={r.id}
                      onClick={() => setRegime(r.id)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        regime === r.id
                          ? isDark
                            ? 'border-violet-500 bg-violet-900/30 text-violet-300'
                            : 'border-violet-500 bg-violet-50 text-violet-800'
                          : isDark
                            ? 'border-gray-700 hover:border-gray-500 text-gray-300'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}>
                      <div className="font-semibold text-sm">{r.label}</div>
                      <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Regime Info */}
              <RegimeCard regime={regime} isDark={isDark} />

              {/* ── Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Recettes brutes',      value: fmt(totalGross),       icon: Euro,        color: 'bg-emerald-500' },
                  { label: 'Charges déductibles',   value: fmt(totalExp),         icon: Building2,   color: 'bg-amber-500'   },
                  { label: 'Montant imposable',     value: fmt(totalImposable),   icon: Calculator,  color: 'bg-violet-500'  },
                  { label: 'Impôt estimé',          value: fmt(estimatedTax),     icon: FileText,    color: 'bg-red-500'     },
                ].map(kpi => (
                  <div key={kpi.label} className={`rounded-xl p-5 shadow-sm border ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                          isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>{kpi.label}</p>
                        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{kpi.value}</p>
                      </div>
                      <div className={`p-2.5 rounded-lg ${kpi.color}`}>
                        <kpi.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── TMI slider */}
              <div className={`rounded-xl p-5 border shadow-sm ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Taux Marginal d&apos;Imposition (TMI)
                  </h3>
                  <span className={`text-lg font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>
                    {(tmiFactor * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range" min="0" max="0.45" step="0.01" value={tmiFactor}
                  onChange={e => setTmi(parseFloat(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-xs mt-1">
                  {[0, 11, 30, 41, 45].map(v => (
                    <button key={v}
                      onClick={() => setTmi(v / 100)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        Math.round(tmiFactor * 100) === v
                          ? 'bg-violet-500 text-white'
                          : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}>
                      {v}%
                    </button>
                  ))}
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  * Estimation indicative. L&apos;impôt réel dépend de votre situation fiscale globale (foyer, revenus, déductions).
                </p>
              </div>

              {/* ── Per-Property fiscal table */}
              <div className={`rounded-xl border shadow-sm overflow-hidden ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`px-5 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Détail par propriété — {year} ({regime === 'micro-bic' ? 'Micro-BIC' : regime === 'lmnp-reel' ? 'LMNP réel' : 'Revenus fonciers'})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={isDark ? 'bg-gray-750' : 'bg-gray-50'}>
                        {['Propriété', 'Recettes brutes', 'Charges', regime !== 'revenus-fonciers' ? 'Abattement' : 'Déductible réel', 'Montant imposable', 'Impôt estimé', 'Régime', ''].map(h => (
                          <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {regimeCalc.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={`px-4 py-12 text-center text-sm ${
                            isDark ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            Aucune donnée pour {year}
                          </td>
                        </tr>
                      ) : regimeCalc.map(p => {
                        const r = p.regime!;
                        const tax = r.imposable * tmiFactor;
                        return (
                          <tr key={p.property.id} className={isDark ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3">
                              <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{p.property.name}</div>
                              <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.property.city}</div>
                            </td>
                            <td className={`px-4 py-3 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              {fmt(p.grossRevenue)}
                            </td>
                            <td className={`px-4 py-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              {fmt(p.totalExpenses)}
                            </td>
                            <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {r.abattement !== undefined ? fmt(r.abattement) : fmt(p.totalExpenses)}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>
                              {fmt(r.imposable)}
                            </td>
                            <td className={`px-4 py-3 font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                              {fmt(tax)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isDark ? 'bg-violet-900/40 text-violet-300' : 'bg-violet-100 text-violet-700'
                              }`}>{r.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              {r.warning && (
                                <span title={r.warning}>
                                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {regimeCalc.length > 0 && (
                      <tfoot>
                        <tr className={`font-bold border-t-2 ${
                          isDark ? 'border-gray-600 bg-gray-750' : 'border-gray-300 bg-gray-100'
                        }`}>
                          <td className={`px-4 py-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>TOTAL {year}</td>
                          <td className={`px-4 py-3 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{fmt(totalGross)}</td>
                          <td className={`px-4 py-3 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{fmt(totalExp)}</td>
                          <td className="px-4 py-3">—</td>
                          <td className={`px-4 py-3 ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>{fmt(totalImposable)}</td>
                          <td className={`px-4 py-3 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{fmt(estimatedTax)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ── Warnings */}
              {regimeCalc.some(p => p.regime?.warning) && (
                <div className={`rounded-xl p-4 border ${
                  isDark ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <div className="space-y-1">
                      {regimeCalc.filter(p => p.regime?.warning).map(p => (
                        <p key={p.property.id} className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                          <strong>{p.property.name}</strong> : {p.regime?.warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Export Buttons */}
              <div className={`rounded-xl p-5 border shadow-sm ${
                isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                  Export pour déclaration fiscale {year}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Revenus */}
                  <button
                    onClick={exportBookingsCSV}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all group ${
                      isDark
                        ? 'border-emerald-700 hover:border-emerald-500 hover:bg-emerald-900/20'
                        : 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}>
                    <div className="p-2.5 rounded-lg bg-emerald-500 group-hover:bg-emerald-600 transition-colors">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Export Revenus CSV
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Toutes les réservations {year} (date, montant, source)
                      </div>
                    </div>
                  </button>

                  {/* Charges */}
                  <button
                    onClick={exportExpensesCSV}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all group ${
                      isDark
                        ? 'border-amber-700 hover:border-amber-500 hover:bg-amber-900/20'
                        : 'border-amber-300 hover:border-amber-500 hover:bg-amber-50'
                    }`}>
                    <div className="p-2.5 rounded-lg bg-amber-500 group-hover:bg-amber-600 transition-colors">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                        Export Charges CSV
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Toutes les dépenses {year} par catégorie
                      </div>
                    </div>
                  </button>
                </div>

                <p className={`mt-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  💡 Les fichiers CSV sont encodés UTF-8 avec BOM pour une compatibilité optimale avec Excel et les logiciels comptables français.
                  Pour la déclaration LMNP, un expert-comptable peut importer ces fichiers directement.
                </p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
