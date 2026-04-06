'use client';

import { useState, useMemo } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/Button';
import {
  TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, Building2, Target, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

type Horizon = '3' | '6' | '12';
type Scenario = 'optimistic' | 'realistic' | 'pessimistic';

const MONTHS_FR = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Seasonal multipliers (index 0 = Jan)
const SEASONALITY = [0.6, 0.65, 0.8, 0.9, 1.0, 1.2, 1.4, 1.4, 1.1, 0.85, 0.7, 0.75];

export default function RevenueForecasting() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();
  const { t, lang } = useLanguage();

  const [horizon, setHorizon] = useState<Horizon>('6');
  const [scenario, setScenario] = useState<Scenario>('realistic');
  const [selectedProperty, setSelectedProperty] = useState<number | ''>('');

  const monthNames = lang === 'en' ? MONTHS_EN : MONTHS_FR;

  // ─── Compute historical data ───
  const historicalData = useMemo(() => {
    const now = new Date();
    const months: { month: string; monthIndex: number; year: number; revenue: number; bookingsCount: number; occupiedDays: number; totalDays: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();

      const relevantBookings = bookings.filter(b => {
        if (selectedProperty && b.propertyId !== selectedProperty) return false;
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return checkIn <= monthEnd && checkOut >= monthStart &&
               (b.status === 'confirmed' || b.status === 'completed');
      });

      const revenue = relevantBookings.reduce((sum, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const overlapStart = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
        const overlapEnd = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
        const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
        const totalDays = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + (b.totalPrice * overlapDays / totalDays);
      }, 0);

      const occupiedDays = relevantBookings.reduce((sum, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const overlapStart = new Date(Math.max(checkIn.getTime(), monthStart.getTime()));
        const overlapEnd = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
        return sum + Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);

      const propCount = selectedProperty ? 1 : Math.max(1, properties.length);

      months.push({
        month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        monthIndex: d.getMonth(),
        year: d.getFullYear(),
        revenue: Math.round(revenue),
        bookingsCount: relevantBookings.length,
        occupiedDays,
        totalDays: daysInMonth * propCount,
      });
    }
    return months;
  }, [bookings, properties, selectedProperty, monthNames]);

  // ─── Compute forecasting ───
  const forecastData = useMemo(() => {
    const now = new Date();
    const horizonMonths = Number(horizon);

    // Average historical revenue per month (if data exists)
    const avgMonthlyRevenue = historicalData.length > 0
      ? historicalData.reduce((s, m) => s + m.revenue, 0) / historicalData.filter(m => m.revenue > 0).length || 0
      : 0;

    const avgOccupancy = historicalData.length > 0
      ? historicalData.reduce((s, m) => s + (m.totalDays > 0 ? m.occupiedDays / m.totalDays : 0), 0) / historicalData.length
      : 0.5;

    const scenarioMultipliers: Record<Scenario, number> = {
      optimistic: 1.2,
      realistic: 1.0,
      pessimistic: 0.75,
    };

    const mult = scenarioMultipliers[scenario];

    const forecasts: { month: string; monthIndex: number; projected: number; confirmedRevenue: number; occupancy: number }[] = [];

    for (let i = 1; i <= horizonMonths; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthEnd = new Date(futureDate.getFullYear(), futureDate.getMonth() + 1, 0);
      const daysInMonth = monthEnd.getDate();
      const monthIdx = futureDate.getMonth();
      const seasonMult = SEASONALITY[monthIdx];

      // Already confirmed bookings for this future month
      const confirmedBookings = bookings.filter(b => {
        if (selectedProperty && b.propertyId !== selectedProperty) return false;
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return checkIn <= monthEnd && checkOut >= futureDate &&
               (b.status === 'confirmed' || b.status === 'pending');
      });

      const confirmedRevenue = confirmedBookings.reduce((sum, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const overlapStart = new Date(Math.max(checkIn.getTime(), futureDate.getTime()));
        const overlapEnd = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
        const overlapDays = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
        const totalDays = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + (b.totalPrice * overlapDays / totalDays);
      }, 0);

      // Projected = max(confirmed, historical estimate * season * scenario)
      const projected = Math.max(
        confirmedRevenue,
        Math.round(avgMonthlyRevenue * seasonMult * mult)
      );

      const propCount = selectedProperty ? 1 : Math.max(1, properties.length);
      const confirmedDays = confirmedBookings.reduce((sum, b) => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        const overlapStart = new Date(Math.max(checkIn.getTime(), futureDate.getTime()));
        const overlapEnd = new Date(Math.min(checkOut.getTime(), monthEnd.getTime()));
        return sum + Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);

      const occupancy = Math.min(1, Math.max(
        confirmedDays / (daysInMonth * propCount),
        avgOccupancy * seasonMult * mult
      ));

      forecasts.push({
        month: `${monthNames[monthIdx]} ${futureDate.getFullYear().toString().slice(-2)}`,
        monthIndex: monthIdx,
        projected: Math.round(projected),
        confirmedRevenue: Math.round(confirmedRevenue),
        occupancy: Math.round(occupancy * 100),
      });
    }

    return forecasts;
  }, [bookings, properties, selectedProperty, horizon, scenario, historicalData, monthNames]);

  // ─── Combined chart data ───
  const chartData = useMemo(() => {
    const hist = historicalData.slice(-6).map(m => ({
      name: m.month,
      reel: m.revenue,
      projete: null as number | null,
      confirme: null as number | null,
    }));
    const fore = forecastData.map(m => ({
      name: m.month,
      reel: null as number | null,
      projete: m.projected,
      confirme: m.confirmedRevenue,
    }));
    return [...hist, ...fore];
  }, [historicalData, forecastData]);

  // ─── KPIs ───
  const totalProjected = forecastData.reduce((s, m) => s + m.projected, 0);
  const totalConfirmed = forecastData.reduce((s, m) => s + m.confirmedRevenue, 0);
  const avgOccupancyForecast = forecastData.length > 0
    ? Math.round(forecastData.reduce((s, m) => s + m.occupancy, 0) / forecastData.length)
    : 0;
  const totalHistorical = historicalData.reduce((s, m) => s + m.revenue, 0);
  const avgHistorical = historicalData.length > 0
    ? Math.round(totalHistorical / historicalData.filter(m => m.revenue > 0).length || 0)
    : 0;
  const growth = avgHistorical > 0 && forecastData.length > 0
    ? Math.round(((forecastData[0].projected / avgHistorical) - 1) * 100)
    : 0;

  // ─── Per-property breakdown ───
  const propertyBreakdown = useMemo(() => {
    if (selectedProperty) return [];
    return properties.map(p => {
      const propBookings = bookings.filter(b => b.propertyId === p.id && (b.status === 'confirmed' || b.status === 'completed'));
      const totalRev = propBookings.reduce((s, b) => s + b.totalPrice, 0);
      const futureBookings = bookings.filter(b =>
        b.propertyId === p.id &&
        new Date(b.checkIn) > new Date() &&
        (b.status === 'confirmed' || b.status === 'pending')
      );
      const futureRev = futureBookings.reduce((s, b) => s + b.totalPrice, 0);
      return {
        id: p.id,
        name: p.name,
        historicalRevenue: totalRev,
        futureConfirmed: futureRev,
        futureBookingsCount: futureBookings.length,
      };
    }).sort((a, b) => b.historicalRevenue - a.historicalRevenue);
  }, [properties, bookings, selectedProperty]);

  const cardClass = `border rounded-xl p-6 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-[#ebebeb] shadow-sm'}`;
  const inputClass = `border rounded-lg px-3 py-1.5 text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`;

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            {t('forecast.title')}
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
            Projection basee sur {historicalData.filter(m => m.revenue > 0).length} mois de donnees
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Property filter */}
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value ? Number(e.target.value) : '')}
            className={inputClass}
          >
            <option value="">{t('nav.allProperties')}</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Horizon */}
          <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-[#dddddd]'}`}>
            {(['3', '6', '12'] as Horizon[]).map(h => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  horizon === h
                    ? 'bg-[#FF385C] text-white'
                    : isDark ? 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]' : 'bg-white text-[#717171] hover:bg-[#f7f7f7]'
                }`}
              >
                {t(`forecast.${h}months`)}
              </button>
            ))}
          </div>

          {/* Scenario */}
          <div className={`flex rounded-lg border overflow-hidden ${isDark ? 'border-white/[0.08]' : 'border-[#dddddd]'}`}>
            {(['pessimistic', 'realistic', 'optimistic'] as Scenario[]).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  scenario === s
                    ? s === 'optimistic' ? 'bg-emerald-500 text-white' : s === 'pessimistic' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                    : isDark ? 'bg-white/[0.02] text-gray-400 hover:bg-white/[0.04]' : 'bg-white text-[#717171] hover:bg-[#f7f7f7]'
                }`}
              >
                {t(`forecast.scenario.${s}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#FF385C]" />
            <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{t('forecast.projected')}</span>
          </div>
          <p className="text-xl font-bold text-[#FF385C]">{totalProjected.toLocaleString('fr-FR')}&euro;</p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>
            {Number(horizon)} prochains mois
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{t('forecast.confirmedBookings')}</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{totalConfirmed.toLocaleString('fr-FR')}&euro;</p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>
            Deja reserve
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{t('forecast.occupancy')}</span>
          </div>
          <p className="text-xl font-bold text-blue-400">{avgOccupancyForecast}%</p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>
            Moy. prevue
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
          <div className="flex items-center gap-2 mb-2">
            {growth >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
            <span className={`text-xs font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{t('forecast.growth')}</span>
          </div>
          <p className={`text-xl font-bold ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {growth >= 0 ? '+' : ''}{growth}%
          </p>
          <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>
            vs historique
          </p>
        </div>
      </div>

      {/* ── Forecast Insights Strip ── */}
      {forecastData.length > 0 && (() => {
        const bestMonth = [...forecastData].sort((a, b) => b.projected - a.projected)[0];
        const totalCoverage = totalProjected > 0 ? Math.round((totalConfirmed / totalProjected) * 100) : 0;
        const highOccMonths = forecastData.filter(m => m.occupancy >= 70).length;
        const trend = forecastData.length >= 2
          ? forecastData[forecastData.length - 1].projected > forecastData[0].projected ? '↑' : '↓'
          : '→';
        return (
          <div className={`rounded-xl border p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                <span className="text-lg">🏆</span>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Meilleur mois</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#222]'}`}>{bestMonth.month}</p>
                <p className="text-xs text-[#FF385C] font-semibold">{bestMonth.projected.toLocaleString('fr-FR')} €</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <span className="text-lg">📊</span>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Couverture confirmée</p>
                <p className={`text-sm font-bold ${totalCoverage >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{totalCoverage}%</p>
                <div className={`mt-1 h-1.5 rounded-full overflow-hidden w-20 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className={`h-full rounded-full transition-all ${totalCoverage >= 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, totalCoverage)}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <span className="text-lg">📅</span>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Mois haute saison</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#222]'}`}>{highOccMonths} / {forecastData.length}</p>
                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>{'(taux ≥ 70%)'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                <span className="text-lg">{trend === '↑' ? '📈' : trend === '↓' ? '📉' : '➡️'}</span>
              </div>
              <div>
                <p className={`text-[10px] font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Tendance horizon</p>
                <p className={`text-2xl font-bold leading-none ${trend === '↑' ? 'text-emerald-400' : trend === '↓' ? 'text-red-400' : 'text-gray-400'}`}>{trend}</p>
                <p className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>{forecastData[0]?.month} → {forecastData[forecastData.length - 1]?.month}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Revenue Chart */}
      <div className={`rounded-xl p-4 border mb-6 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
          {t('forecast.actual')} vs {t('forecast.projected')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorReel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProjecte" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF385C" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#FF385C" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorConfirme" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : '#ebebeb'} />
            <XAxis dataKey="name" tick={{ fill: isDark ? '#717171' : '#717171', fontSize: 11 }} />
            <YAxis tick={{ fill: isDark ? '#717171' : '#717171', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#222244' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#ebebeb'}`,
                borderRadius: '0.75rem',
                color: isDark ? '#fff' : '#222',
                fontSize: 12,
              }}
              formatter={(value: unknown) => value != null ? `${Number(value).toLocaleString('fr-FR')} EUR` : '-'}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="reel" name={t('forecast.actual')} stroke="#10b981" fill="url(#colorReel)" strokeWidth={2} connectNulls={false} />
            <Area type="monotone" dataKey="projete" name={t('forecast.projected')} stroke="#FF385C" fill="url(#colorProjecte)" strokeWidth={2} strokeDasharray="5 5" connectNulls={false} />
            <Area type="monotone" dataKey="confirme" name={t('forecast.confirmedBookings')} stroke="#3b82f6" fill="url(#colorConfirme)" strokeWidth={2} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly breakdown */}
      <div className={`rounded-xl p-4 border mb-6 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
          {t('forecast.monthly')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={isDark ? 'text-gray-500' : 'text-[#717171]'}>
                <th className="text-left py-2 px-3 font-medium">Mois</th>
                <th className="text-right py-2 px-3 font-medium">{t('forecast.projected')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('forecast.confirmedBookings')}</th>
                <th className="text-right py-2 px-3 font-medium">{t('forecast.occupancy')}</th>
                <th className="text-right py-2 px-3 font-medium">Couverture</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map((m, i) => {
                const coverage = m.projected > 0 ? Math.round((m.confirmedRevenue / m.projected) * 100) : 0;
                return (
                  <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-[#ebebeb]'}`}>
                    <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{m.month}</td>
                    <td className="py-2.5 px-3 text-right text-[#FF385C] font-semibold">{m.projected.toLocaleString('fr-FR')}&euro;</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{m.confirmedRevenue.toLocaleString('fr-FR')}&euro;</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        m.occupancy >= 70 ? 'bg-emerald-500/20 text-emerald-400' :
                        m.occupancy >= 40 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {m.occupancy}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`}>
                          <div className="h-full rounded-full bg-[#FF385C]" style={{ width: `${Math.min(100, coverage)}%` }} />
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{coverage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-property breakdown */}
      {!selectedProperty && propertyBreakdown.length > 0 && (
        <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
          <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            {t('forecast.byProperty')}
          </h3>
          <div className="space-y-3">
            {propertyBreakdown.map(p => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isDark ? 'bg-white/[0.02]' : 'bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={`w-5 h-5 ${isDark ? 'text-[#FF385C]' : 'text-[#FF385C]'}`} />
                  <div>
                    <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-[#222222]'}`}>{p.name}</p>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
                      {p.futureBookingsCount} reservation{p.futureBookingsCount > 1 ? 's' : ''} a venir
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-400">{p.futureConfirmed.toLocaleString('fr-FR')}&euro;</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
                    Historique: {p.historicalRevenue.toLocaleString('fr-FR')}&euro;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {historicalData.every(m => m.revenue === 0) && (
        <div className={`text-center py-8 rounded-xl mt-4 ${isDark ? 'bg-white/[0.02]' : 'bg-amber-50'}`}>
          <Zap className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            Ajoutez des réservations pour des prévisions plus précises
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-amber-500'}`}>
            Les prévisions utilisent la saisonnalité et les réservations confirmées
          </p>
        </div>
      )}
    </div>
  );
}

