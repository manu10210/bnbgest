'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FinancialReport } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Euro,
  Target,
  Home,
  Activity,
  AlertTriangle,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Trophy
} from 'lucide-react';

interface FinancialReportsProps {
  propertyId?: number;
}

interface RentabilitePropertyRow {
  property: { id: number; name: string };
  bookingsCount: number;
  occupancyRate: number;
  grossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revPAR: number;
  adr: number;
  expByCategory: Record<string, number>;
}

interface RentabiliteMonthlyRow {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
  bookings: number;
  occupancy: number;
}

interface RentabiliteResponse {
  properties: RentabilitePropertyRow[];
  monthly: RentabiliteMonthlyRow[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgOccupancy: number;
    avgADR: number;
    totalBookings: number;
  };
}

export default function FinancialReports({ propertyId }: FinancialReportsProps) {
  const { isDark } = useTheme();

  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [previousReport, setPreviousReport] = useState<FinancialReport | null>(null);
  const [occupancyData, setOccupancyData] = useState<Array<{ name: string; occupancy: number; revenue: number }>>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<Array<{ month: string; revenue: number; bookings: number }>>([]);
  const [loading, setLoading] = useState(false);

  const buildReportFromApi = (payload: RentabiliteResponse, periodStart: string, periodEnd: string): FinancialReport => {
    const categoryTotals = payload.properties.reduce<Record<string, number>>((acc, row) => {
      Object.entries(row.expByCategory || {}).forEach(([category, amount]) => {
        const key = category.toLowerCase();
        acc[key] = (acc[key] || 0) + Number(amount || 0);
      });
      return acc;
    }, {});

    const cleaning = (categoryTotals.cleaning || 0) + (categoryTotals.nettoyage || 0);
    const maintenance =
      (categoryTotals.maintenance || 0) +
      (categoryTotals.repair || 0) +
      (categoryTotals.reparation || 0);
    const supplies =
      (categoryTotals.supplies || 0) +
      (categoryTotals.stock || 0) +
      (categoryTotals.inventory || 0) +
      (categoryTotals.fournitures || 0);

    const categorizedExpenses = cleaning + maintenance + supplies;
    const other = Math.max(0, payload.summary.totalExpenses - categorizedExpenses);

    return {
      period: `${periodStart} to ${periodEnd}`,
      revenue: payload.summary.totalRevenue,
      expenses: payload.summary.totalExpenses,
      profit: payload.summary.totalProfit,
      occupancyRate: payload.summary.avgOccupancy,
      averageDailyRate: payload.summary.avgADR,
      bookingsCount: payload.summary.totalBookings,
      breakdown: {
        accommodation: payload.summary.totalRevenue,
        cleaning,
        maintenance,
        supplies,
        other,
      },
    };
  };

  const fetchRentabilite = useCallback(async (year: number, months: number, startMonth: number): Promise<RentabiliteResponse> => {
    const qs = new URLSearchParams({
      year: String(year),
      months: String(months),
      startMonth: String(startMonth),
    });

    if (propertyId) {
      qs.set('propertyId', String(propertyId));
    }

    const res = await fetch(`/api/rentabilite?${qs.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Impossible de récupérer la rentabilité');
    }

    return await res.json();
  }, [propertyId]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;
      let prevStartDate: string;
      let prevEndDate: string;

      if (selectedPeriod === 'month') {
        startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
        const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
        const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
        endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
        // previous month
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
        prevStartDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`;
        prevEndDate = startDate;
      } else if (selectedPeriod === 'quarter') {
        const quarter = Math.floor((selectedMonth - 1) / 3) + 1;
        const quarterStartMonth = (quarter - 1) * 3 + 1;
        startDate = `${selectedYear}-${quarterStartMonth.toString().padStart(2, '0')}-01`;
        const quarterEndMonth = quarter * 3;
        const nextYear = quarterEndMonth === 12 ? selectedYear + 1 : selectedYear;
        const nextMonth = quarterEndMonth === 12 ? 1 : quarterEndMonth + 1;
        endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
        // previous quarter
        const prevQuarterStartMonth = quarter === 1 ? 10 : (quarter - 2) * 3 + 1;
        const prevQuarterYear = quarter === 1 ? selectedYear - 1 : selectedYear;
        prevStartDate = `${prevQuarterYear}-${prevQuarterStartMonth.toString().padStart(2, '0')}-01`;
        prevEndDate = startDate;
      } else { // year
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear + 1}-01-01`;
        prevStartDate = `${selectedYear - 1}-01-01`;
        prevEndDate = startDate;
      }

      const currentMonths =
        selectedPeriod === 'month' ? 1 :
        selectedPeriod === 'quarter' ? 3 : 12;

      const currentStartMonth =
        selectedPeriod === 'month' ? selectedMonth :
        selectedPeriod === 'quarter' ? Math.floor((selectedMonth - 1) / 3) * 3 + 1 :
        1;

      const prevStartDateObj = new Date(prevStartDate);
      const previousStartMonth = prevStartDateObj.getMonth() + 1;
      const previousYear = prevStartDateObj.getFullYear();

      const [currentPayload, previousPayload, yearlyPayload] = await Promise.all([
        fetchRentabilite(selectedYear, currentMonths, currentStartMonth),
        fetchRentabilite(previousYear, currentMonths, previousStartMonth),
        fetchRentabilite(selectedYear, 12, 1),
      ]);

      setReport(buildReportFromApi(currentPayload, startDate, endDate));
      setPreviousReport(buildReportFromApi(previousPayload, prevStartDate, prevEndDate));
      setOccupancyData(
        currentPayload.properties
          .map((row) => ({
            name: row.property.name,
            occupancy: row.occupancyRate,
            revenue: row.grossRevenue,
          }))
          .sort((a, b) => b.revenue - a.revenue)
      );
      setMonthlyTrend(
        yearlyPayload.monthly.map((row) => ({
          month: row.label,
          revenue: row.revenue,
          bookings: row.bookings,
        }))
      );
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      setReport(null);
      setPreviousReport(null);
      setOccupancyData([]);
      setMonthlyTrend([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedYear, selectedMonth, fetchRentabilite]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Compute delta % between current and previous value
  const getDelta = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const DeltaBadge = ({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) => {
    const delta = getDelta(current, previous);
    if (delta === null) return null;
    const positive = inverse ? delta < 0 : delta > 0;
    const neutral = Math.abs(delta) < 0.5;
    if (neutral) return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <Minus className="w-2.5 h-2.5" /> 0%
      </span>
    );
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
        positive
          ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700')
          : (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
      }`}>
        {positive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
        {Math.abs(delta).toFixed(1)}%
      </span>
    );
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'month') {
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
    } else if (selectedPeriod === 'quarter') {
      const quarter = Math.floor((selectedMonth - 1) / 3) + 1;
      return `T${quarter} ${selectedYear}`;
    } else {
      return selectedYear.toString();
    }
  };

  const getMonthlyTrend = useMemo(() => monthlyTrend, [monthlyTrend]);

  const pieData = useMemo(() => {
    if (!report) return [];
    return [
      { name: 'Hébergement', value: report.breakdown.accommodation, color: '#6366f1' },
      { name: 'Nettoyage', value: report.breakdown.cleaning, color: '#10b981' },
      { name: 'Maintenance', value: report.breakdown.maintenance, color: '#f59e0b' },
      { name: 'Autres', value: report.breakdown.other, color: '#8b5cf6' },
    ].filter(d => d.value > 0);
  }, [report]);

  const exportPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();

      // Header
      doc.setFillColor(67, 56, 202);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RAPPORT FINANCIER �?" BNBGest', 105, 18, { align: 'center' });

      doc.setTextColor(30, 30, 30);
      let y = 40;
      doc.setFontSize(12);
      doc.text(`Période: ${getPeriodLabel()}`, 15, y); y += 10;

      // Summary table
      autoTable(doc, {
        startY: y,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Revenus totaux', formatCurrency(report.revenue)],
          ['Dépenses', formatCurrency(report.expenses)],
          ['Bénéfice net', formatCurrency(report.profit)],
          ['Taux d\'occupation', formatPercentage(report.occupancyRate)],
          ['Réservations', report.bookingsCount.toString()],
          ['Prix moyen / nuit', formatCurrency(report.averageDailyRate)],
        ],
        headStyles: { fillColor: [67, 56, 202] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        margin: { left: 15, right: 15 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // Revenue breakdown
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text('Répartition des revenus', 15, y); y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Catégorie', 'Montant']],
        body: [
          ['Hébergement', formatCurrency(report.breakdown.accommodation)],
          ['Nettoyage', formatCurrency(report.breakdown.cleaning)],
          ['Maintenance', formatCurrency(report.breakdown.maintenance)],
          ['Autres', formatCurrency(report.breakdown.other)],
        ],
        headStyles: { fillColor: [67, 56, 202] },
        margin: { left: 15, right: 15 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // Monthly trend
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text('�?volution mensuelle', 15, y); y += 6;
      autoTable(doc, {
        startY: y,
        head: [['Mois', 'Revenus', 'Réservations']],
        body: getMonthlyTrend.filter(r => r.revenue > 0 || r.bookings > 0).map(r => [
          r.month, formatCurrency(r.revenue), r.bookings.toString(),
        ]),
        headStyles: { fillColor: [67, 56, 202] },
        alternateRowStyles: { fillColor: [245, 243, 255] },
        margin: { left: 15, right: 15 },
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`BNBGest �?" Rapport financier �?" ${getPeriodLabel()} �?" Page ${i}/${pages}`, 105, 290, { align: 'center' });
      }

      doc.save(`rapport-financier-${getPeriodLabel().replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
      console.error('Erreur export PDF:', error);
    }
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Revenus', report.revenue.toString()],
      ['Dépenses', report.expenses.toString()],
      ['Bénéfice', report.profit.toString()],
      ['Taux occupation', report.occupancyRate.toString()],
      ['Réservations', report.bookingsCount.toString()],
      ['Prix moyen/nuit', report.averageDailyRate.toString()],
      [''],
      ['Mois', 'Revenus', 'Réservations'],
      ...getMonthlyTrend.map(r => [r.month, r.revenue.toString(), r.bookings.toString()]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-financier-${getPeriodLabel().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Computed: margin percentage
  const marginPct = report && report.revenue > 0 ? (report.profit / report.revenue) * 100 : 0;

  // Computed: total annual revenue
  const totalAnnualRevenue = useMemo(() => {
    return getMonthlyTrend.reduce((sum, m) => sum + m.revenue, 0);
  }, [getMonthlyTrend]);

  const totalAnnualBookings = useMemo(() => {
    return getMonthlyTrend.reduce((sum, m) => sum + m.bookings, 0);
  }, [getMonthlyTrend]);

  // Best month
  const bestMonth = useMemo(() => {
    if (getMonthlyTrend.length === 0) {
      return { month: '-', revenue: 0, bookings: 0 };
    }
    return getMonthlyTrend.reduce((best, m) => m.revenue > best.revenue ? m : best, getMonthlyTrend[0]);
  }, [getMonthlyTrend]);

  const selectClass = `w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white focus:ring-[#FF385C]/40 [&>option]:bg-[#222244]' : 'bg-white border-[#ebebeb] text-[#222222] focus:ring-[#FF385C]/30'}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF385C] mx-auto mb-4"></div>
          <p className={isDark ? 'text-gray-400' : 'text-[#717171]'}>Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* ═══ TOP BAR ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-10 px-6 py-4 border-b backdrop-blur-md ${isDark ? 'bg-[#1a1a2e]/90 border-white/[0.06]' : 'bg-white/90 border-[#ebebeb]'}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title + Period Label */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#FF385C]/20' : 'bg-[#FF385C]/10'}`}>
              <Euro className="h-5 w-5 text-[#FF385C]" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                Rapports Financiers
              </h2>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                {getPeriodLabel()} {propertyId ? ' — Propriété spécifique' : ''}
              </p>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selectors inline */}
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')} className={selectClass} style={{ minWidth: 110 }}>
              <option value="month">Mensuel</option>
              <option value="quarter">Trimestriel</option>
              <option value="year">Annuel</option>
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className={selectClass} style={{ minWidth: 90 }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            {(selectedPeriod === 'month' || selectedPeriod === 'quarter') && (
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className={selectClass} style={{ minWidth: 130 }}>
                {selectedPeriod === 'month' ? (
                  Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' })}
                    </option>
                  ))
                ) : (
                  [1, 2, 3, 4].map(quarter => (
                    <option key={quarter} value={(quarter - 1) * 3 + 1}>T{quarter}</option>
                  ))
                )}
              </select>
            )}
            <Button onClick={generateReport} disabled={loading} icon={BarChart3}
              className="bg-[#FF385C] hover:bg-[#E31C5F] text-white shadow-md hover:shadow-lg transition-all text-sm px-4 py-2 rounded-xl">
              Actualiser
            </Button>

            <div className={`h-6 w-px ${isDark ? 'bg-white/10' : 'bg-[#ebebeb]'}`} />

            <button onClick={exportPDF} title="Export PDF"
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-[#717171] hover:text-[#222222]'}`}>
              <FileText className="h-4 w-4" />
            </button>
            <button onClick={exportCSV} title="Export CSV"
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-[#717171] hover:text-[#222222]'}`}>
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {report ? (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* ═══ KPI STRIP ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-6 gap-4"
          >
            {/* Revenue */}
            <div className={`col-span-1 rounded-2xl p-4 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-emerald-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>Revenus</span>
                </div>
                {previousReport && <DeltaBadge current={report.revenue} previous={previousReport.revenue} />}
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(report.revenue)}</p>
              {previousReport && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-emerald-400/40' : 'text-emerald-600/40'}`}>vs {formatCurrency(previousReport.revenue)}</p>}
            </div>

            {/* Expenses */}
            <div className={`col-span-1 rounded-2xl p-4 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-red-400/70' : 'text-red-600/70'}`}>Depenses</span>
                </div>
                {previousReport && <DeltaBadge current={report.expenses} previous={previousReport.expenses} inverse />}
              </div>
              <p className="text-xl font-bold text-red-500">{formatCurrency(report.expenses)}</p>
              {previousReport && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-red-400/40' : 'text-red-600/40'}`}>vs {formatCurrency(previousReport.expenses)}</p>}
            </div>

            {/* Profit */}
            <div className={`col-span-1 rounded-2xl p-4 border-2 ${report.profit >= 0
              ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200')
              : (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {report.profit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  <span className={`text-xs font-medium ${report.profit >= 0 ? (isDark ? 'text-emerald-400/70' : 'text-emerald-600/70') : (isDark ? 'text-red-400/70' : 'text-red-600/70')}`}>Benefice</span>
                </div>
                {previousReport && <DeltaBadge current={report.profit} previous={previousReport.profit} />}
              </div>
              <p className={`text-xl font-bold ${report.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(report.profit)}</p>
              {previousReport && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-white/20' : 'text-black/20'}`}>vs {formatCurrency(previousReport.profit)}</p>}
            </div>

            {/* Margin */}
            <div className={`col-span-1 rounded-2xl p-4 ${isDark ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-violet-400/70' : 'text-violet-600/70'}`}>Marge</span>
                </div>
                {previousReport && previousReport.revenue > 0 && (
                  <DeltaBadge current={marginPct} previous={previousReport.revenue > 0 ? (previousReport.profit / previousReport.revenue) * 100 : 0} />
                )}
              </div>
              <p className="text-xl font-bold text-violet-600">{formatPercentage(marginPct)}</p>
              {previousReport && previousReport.revenue > 0 && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-violet-400/40' : 'text-violet-600/40'}`}>vs {formatPercentage((previousReport.profit / previousReport.revenue) * 100)}</p>}
            </div>

            {/* Occupancy */}
            <div className={`col-span-1 rounded-2xl p-4 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-blue-400/70' : 'text-blue-600/70'}`}>Occupation</span>
                </div>
                {previousReport && <DeltaBadge current={report.occupancyRate} previous={previousReport.occupancyRate} />}
              </div>
              <p className="text-xl font-bold text-blue-600">{formatPercentage(report.occupancyRate)}</p>
              {previousReport && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-blue-400/40' : 'text-blue-600/40'}`}>vs {formatPercentage(previousReport.occupancyRate)}</p>}
            </div>

            {/* Bookings */}
            <div className={`col-span-1 rounded-2xl p-4 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <span className={`text-xs font-medium ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>Reservations</span>
                </div>
                {previousReport && <DeltaBadge current={report.bookingsCount} previous={previousReport.bookingsCount} />}
              </div>
              <p className="text-xl font-bold text-amber-600">{report.bookingsCount}</p>
              {previousReport && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-amber-400/40' : 'text-amber-600/40'}`}>vs {previousReport.bookingsCount}</p>}
            </div>
          </motion.div>

          {/* ═══ MAIN CHART — FULL WIDTH ═══ */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card hover={false}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base font-semibold flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <BarChart3 className="h-4 w-4 mr-2 text-[#FF385C]" />
                    Evolution mensuelle {selectedYear}
                  </h3>
                  <div className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-white/[0.06] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>
                    Total: {formatCurrency(totalAnnualRevenue)} | {totalAnnualBookings} reservations
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={getMonthlyTrend}>
                    <defs>
                      <linearGradient id="colorRevenueFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF385C" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FF385C" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} />
                    <XAxis dataKey="month" tick={{ fill: isDark ? '#94a3b8' : '#717171', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#717171', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: isDark ? '#222244' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #ebebeb', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                      labelStyle={{ color: isDark ? '#e2e8f0' : '#222222', fontWeight: 600 }}
                      formatter={(value, name) => [String(name) === 'revenue' ? formatCurrency(Number(value)) : String(value), String(name) === 'revenue' ? 'Revenus' : 'Reservations']}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stroke="#FF385C" fill="url(#colorRevenueFull)" name="Revenus" strokeWidth={2.5} dot={{ r: 3, fill: '#FF385C' }} activeDot={{ r: 6, strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="bookings" stroke="#6366f1" fill="url(#colorBookings)" name="Reservations" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          {/* ═══ 3-COLUMN GRID: PIE + BAR + SIDE INFO ═══ */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Revenue Breakdown Pie */}
            <Card hover={false}>
              <div className="p-6">
                <h3 className={`text-base font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                  <PieChart className="h-4 w-4 mr-2 text-[#FF385C]" />
                  Repartition des revenus
                </h3>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPie>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} innerRadius={52} paddingAngle={3} dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {pieData.map((d, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{d.name}</span>
                          </div>
                          <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{formatCurrency(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`flex items-center justify-center h-48 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucune donnee</div>
                )}
              </div>
            </Card>

            {/* Property Bar Chart */}
            <Card hover={false}>
              <div className="p-6">
                <h3 className={`text-base font-semibold mb-4 flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                  <Home className="h-4 w-4 mr-2 text-[#FF385C]" />
                  Performance par propriété
                </h3>
                {occupancyData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={occupancyData} layout="vertical" margin={{ left: 0, right: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'} horizontal={false} />
                        <XAxis type="number" tick={{ fill: isDark ? '#94a3b8' : '#717171', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fill: isDark ? '#94a3b8' : '#717171', fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: isDark ? '#222244' : '#fff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #ebebeb', borderRadius: '12px' }}
                          formatter={(value) => [formatCurrency(Number(value)), 'Revenus']}
                        />
                        <Bar dataKey="revenue" fill="#FF385C" radius={[0, 6, 6, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="space-y-3 mt-3">
                      {occupancyData.map((property, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{property.name}</span>
                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{formatPercentage(property.occupancy)}</span>
                          </div>
                          <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                            <div className="bg-[#FF385C] h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(property.occupancy, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`flex items-center justify-center h-48 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucune propriété</div>
                )}
              </div>
            </Card>

            {/* Side Info Panel */}
            <div className="space-y-6">
              {/* Key metrics */}
              <Card hover={false}>
                <div className="p-5">
                  <h4 className={`text-sm font-semibold mb-3 flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <Activity className="h-4 w-4 mr-2 text-[#FF385C]" />
                    Métriques clés
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Rev / réservation</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                        {report.bookingsCount > 0 ? formatCurrency(report.revenue / report.bookingsCount) : formatCurrency(0)}
                      </span>
                    </div>
                    <div className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-[#f0f0f0]'}`} />
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Prix moyen/nuit</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                        {formatCurrency(report.averageDailyRate)}
                      </span>
                    </div>
                    <div className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-[#f0f0f0]'}`} />
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Meilleur mois</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                        {bestMonth.month} ({formatCurrency(bestMonth.revenue)})
                      </span>
                    </div>
                    <div className={`border-b ${isDark ? 'border-white/[0.06]' : 'border-[#f0f0f0]'}`} />
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Total annuel</span>
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                        {formatCurrency(totalAnnualRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recommendations */}
              <Card hover={false}>
                <div className="p-5">
                  <h4 className={`text-sm font-semibold mb-3 flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <Target className="h-4 w-4 mr-2 text-[#FF385C]" />
                    Recommandations
                  </h4>
                  <div className="space-y-2.5">
                    {report.occupancyRate < 70 && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-yellow-300/80' : 'text-yellow-700'}`}>
                          Occupation faible. Réduisez les prix ou lancez des promotions.
                        </span>
                      </div>
                    )}
                    {report.profit < 0 && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-red-300/80' : 'text-red-700'}`}>
                          Pertes enregistrées. Révisez les coûts.
                        </span>
                      </div>
                    )}
                    {report.occupancyRate > 90 && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-emerald-300/80' : 'text-emerald-700'}`}>
                          Excellente performance ! Augmentez les prix.
                        </span>
                      </div>
                    )}
                    {report.breakdown.maintenance > report.revenue * 0.3 && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                        <Activity className="h-3.5 w-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-orange-300/80' : 'text-orange-700'}`}>
                          Maintenance élevée ({formatPercentage((report.breakdown.maintenance / report.revenue) * 100)} du CA).
                        </span>
                      </div>
                    )}
                    {report.occupancyRate >= 70 && report.occupancyRate <= 90 && report.profit >= 0 && (
                      <div className={`flex items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className={`text-xs leading-relaxed ${isDark ? 'text-blue-300/80' : 'text-blue-700'}`}>
                          Bonne performance. Maintenez le cap !
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Quick Export */}
              <Card hover={false}>
                <div className="p-5">
                  <h4 className={`text-sm font-semibold mb-3 flex items-center ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <Save className="h-4 w-4 mr-2 text-[#FF385C]" />
                    Export rapide
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={exportPDF}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.08]' : 'bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#222222] border border-[#ebebeb]'}`}>
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                    <button onClick={exportCSV}
                      className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/[0.08]' : 'bg-[#f7f7f7] hover:bg-[#ebebeb] text-[#222222] border border-[#ebebeb]'}`}>
                      <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>
          {/* ═══ TOP PROPERTIES PODIUM ═══ */}
          {occupancyData.length >= 2 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card hover={false}>
                <div className="p-6">
                  <h3 className={`text-base font-semibold mb-5 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Classement des propriétés
                    <span className={`ml-auto text-xs font-normal px-2 py-1 rounded-full ${isDark ? 'bg-white/[0.06] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>{getPeriodLabel()}</span>
                  </h3>
                  <div className="flex items-end justify-center gap-4">
                    {occupancyData.slice(0, 3).map((prop, i) => {
                      const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd visual layout
                      const displayIdx = podiumOrder.indexOf(i);
                      const heights = ['h-24', 'h-32', 'h-16'];
                      const medals = ['🥇', '🥈', '🥉'];
                      const colors = [
                        isDark ? 'bg-amber-500/20 border-amber-500/40' : 'bg-amber-50 border-amber-200',
                        isDark ? 'bg-slate-500/20 border-slate-500/40' : 'bg-slate-50 border-slate-200',
                        isDark ? 'bg-orange-500/20 border-orange-500/40' : 'bg-orange-50 border-orange-200',
                      ];
                      const actualIdx = podiumOrder[displayIdx];
                      const actualProp = occupancyData[actualIdx];
                      if (!actualProp) return null;
                      return (
                        <div key={actualIdx} className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                          <span className="text-2xl">{medals[actualIdx]}</span>
                          <div className={`text-center p-3 rounded-xl border w-full ${colors[actualIdx]}`}>
                            <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-[#222222]'}`}>{actualProp.name}</p>
                            <p className="text-sm font-bold text-[#FF385C] mt-1">{formatCurrency(actualProp.revenue)}</p>
                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{formatPercentage(actualProp.occupancy)} occ.</p>
                          </div>
                          <div className={`w-full rounded-t-xl border border-b-0 ${colors[actualIdx]} ${heights[actualIdx]}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ═══ MONTHLY COMPARISON TABLE ═══ */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card hover={false}>
              <div className="p-6">
                <h3 className={`text-base font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                  <Zap className="h-4 w-4 text-[#FF385C]" />
                  Détail mensuel {selectedYear}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${isDark ? 'border-white/[0.06]' : 'border-[#f0f0f0]'} border-b`}>
                        <th className={`text-left pb-3 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Mois</th>
                        <th className={`text-right pb-3 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Revenus</th>
                        <th className={`text-right pb-3 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Rés.</th>
                        <th className={`text-right pb-3 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Tendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMonthlyTrend.map((row, i) => {
                        const prev = i > 0 ? getMonthlyTrend[i - 1] : null;
                        const delta = prev && prev.revenue > 0 ? ((row.revenue - prev.revenue) / prev.revenue) * 100 : null;
                        const maxRev = Math.max(...getMonthlyTrend.map(r => r.revenue), 1);
                        return (
                          <tr key={i} className={`${isDark ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-[#f7f7f7] hover:bg-[#fafafa]'} border-b transition-colors`}>
                            <td className={`py-2.5 text-sm ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>{row.month}</td>
                            <td className={`py-2.5 text-right font-semibold text-sm ${row.revenue > 0 ? (isDark ? 'text-white' : 'text-[#222222]') : (isDark ? 'text-gray-600' : 'text-gray-300')}`}>
                              {row.revenue > 0 ? formatCurrency(row.revenue) : '—'}
                            </td>
                            <td className={`py-2.5 text-right text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{row.bookings > 0 ? row.bookings : '—'}</td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {row.revenue > 0 && (
                                  <div className={`h-1.5 rounded-full ${isDark ? 'bg-[#FF385C]/60' : 'bg-[#FF385C]/50'}`} style={{ width: `${Math.round((row.revenue / maxRev) * 60)}px` }} />
                                )}
                                {delta !== null && Math.abs(delta) >= 0.5 && (
                                  <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {delta >= 0 ? '↑' : '↓'}{Math.abs(delta).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </motion.div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Euro className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-white/10' : 'text-gray-200'}`} />
            <p className={`text-lg font-medium ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Aucun rapport disponible</p>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sélectionnez une période et cliquez sur Actualiser</p>
          </div>
        </div>
      )}
    </div>
  );
}


