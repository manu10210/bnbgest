'use client';

import { useState, useMemo } from 'react';
import { useBNB, Property } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  DollarSign,
  Calendar,
  Tag,
  Percent,
  Sun,
  Snowflake,
  Plus,
  Trash2,
  Calculator,
  Save,
  Edit,
  Check,
  X
} from 'lucide-react';

// Types
interface SeasonRule {
  id: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  multiplier: number; // 1.0 = normal, 1.3 = +30%, 0.8 = -20%
  type: 'high' | 'low' | 'medium';
}

interface PromoCode {
  id: string;
  code: string;
  discount: number; // percentage or fixed
  discountType: 'percent' | 'fixed';
  validFrom: string;
  validTo: string;
  maxUses: number;
  usedCount: number;
  minNights: number;
  active: boolean;
}

interface PricingConfig {
  weekendSurcharge: number; // percentage (e.g., 15 = +15%)
  weekendDays: number[]; // 0=Sun, 5=Fri, 6=Sat
  longStayDiscount: { nights: number; discount: number }[];
  seasons: SeasonRule[];
  promoCodes: PromoCode[];
}

interface PriceBreakdown {
  basePrice: number;
  nightlyPrices: { date: string; price: number; label: string }[];
  subtotal: number;
  weekendSurcharge: number;
  seasonAdjustment: number;
  longStayDiscount: number;
  promoDiscount: number;
  cleaningFee: number;
  totalBeforeFees: number;
  total: number;
}

const DEFAULT_SEASONS: SeasonRule[] = [
  { id: '1', name: 'Haute saison ete', startMonth: 7, startDay: 1, endMonth: 8, endDay: 31, multiplier: 1.4, type: 'high' },
  { id: '2', name: 'Noel / Nouvel An', startMonth: 12, startDay: 20, endMonth: 1, endDay: 5, multiplier: 1.5, type: 'high' },
  { id: '3', name: 'Basse saison hiver', startMonth: 1, startDay: 6, endMonth: 3, endDay: 15, multiplier: 0.8, type: 'low' },
  { id: '4', name: 'Printemps', startMonth: 3, startDay: 16, endMonth: 6, endDay: 30, multiplier: 1.1, type: 'medium' },
  { id: '5', name: 'Automne', startMonth: 9, startDay: 1, endMonth: 11, endDay: 30, multiplier: 0.9, type: 'low' },
];

const DEFAULT_CONFIG: PricingConfig = {
  weekendSurcharge: 15,
  weekendDays: [5, 6], // Friday + Saturday
  longStayDiscount: [
    { nights: 7, discount: 10 },
    { nights: 14, discount: 15 },
    { nights: 30, discount: 25 },
  ],
  seasons: DEFAULT_SEASONS,
  promoCodes: [
    { id: '1', code: 'BIENVENUE10', discount: 10, discountType: 'percent', validFrom: '2025-01-01', validTo: '2025-12-31', maxUses: 100, usedCount: 12, minNights: 2, active: true },
    { id: '2', code: 'ETE2025', discount: 50, discountType: 'fixed', validFrom: '2025-06-01', validTo: '2025-09-30', maxUses: 50, usedCount: 3, minNights: 3, active: true },
  ],
};

// Pricing calculation utility
function calculatePrice(
  property: Property,
  checkIn: string,
  checkOut: string,
  config: PricingConfig,
  promoCode?: string
): PriceBreakdown {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (nights <= 0) {
    return { basePrice: 0, nightlyPrices: [], subtotal: 0, weekendSurcharge: 0, seasonAdjustment: 0, longStayDiscount: 0, promoDiscount: 0, cleaningFee: 0, totalBeforeFees: 0, total: 0 };
  }

  const basePrice = property.price;
  const nightlyPrices: PriceBreakdown['nightlyPrices'] = [];
  let weekendExtra = 0;
  let seasonExtra = 0;

  for (let i = 0; i < nights; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let nightPrice = basePrice;
    let label = 'Standard';

    // Apply season multiplier
    const season = config.seasons.find(s => {
      if (s.startMonth <= s.endMonth) {
        return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) &&
               (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
      } else {
        // Wraps around year (e.g., Dec 20 - Jan 5)
        return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) ||
               (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
      }
    });

    if (season) {
      const seasonDiff = nightPrice * (season.multiplier - 1);
      seasonExtra += seasonDiff;
      nightPrice *= season.multiplier;
      label = season.name;
    }

    // Apply weekend surcharge
    if (config.weekendDays.includes(dayOfWeek)) {
      const surcharge = nightPrice * (config.weekendSurcharge / 100);
      weekendExtra += surcharge;
      nightPrice += surcharge;
      label += ' + Weekend';
    }

    nightlyPrices.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(nightPrice * 100) / 100,
      label,
    });
  }

  const subtotal = nightlyPrices.reduce((sum, n) => sum + n.price, 0);

  // Long stay discount
  let longStayDiscount = 0;
  const applicableDiscount = [...config.longStayDiscount]
    .sort((a, b) => b.nights - a.nights)
    .find(d => nights >= d.nights);
  if (applicableDiscount) {
    longStayDiscount = subtotal * (applicableDiscount.discount / 100);
  }

  // Promo code
  let promoDiscount = 0;
  if (promoCode) {
    const promo = config.promoCodes.find(
      p => p.code.toUpperCase() === promoCode.toUpperCase() && p.active && p.usedCount < p.maxUses && nights >= p.minNights
    );
    if (promo) {
      const now = new Date().toISOString().split('T')[0];
      if (now >= promo.validFrom && now <= promo.validTo) {
        promoDiscount = promo.discountType === 'percent'
          ? (subtotal - longStayDiscount) * (promo.discount / 100)
          : promo.discount;
      }
    }
  }

  const totalBeforeFees = subtotal - longStayDiscount - promoDiscount;
  const cleaningFee = property.cleaningFee || 0;
  const total = Math.max(0, totalBeforeFees + cleaningFee);

  return {
    basePrice,
    nightlyPrices,
    subtotal: Math.round(subtotal * 100) / 100,
    weekendSurcharge: Math.round(weekendExtra * 100) / 100,
    seasonAdjustment: Math.round(seasonExtra * 100) / 100,
    longStayDiscount: Math.round(longStayDiscount * 100) / 100,
    promoDiscount: Math.round(promoDiscount * 100) / 100,
    cleaningFee,
    totalBeforeFees: Math.round(totalBeforeFees * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Export for use in other components
export { calculatePrice, type PricingConfig, type PriceBreakdown, type SeasonRule, type PromoCode };

export default function PricingEngine() {
  const { properties } = useBNB();
  const { isDark } = useTheme();

  const [config, setConfig] = useState<PricingConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const saved = localStorage.getItem('bnbgest_pricing_config');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  });

  // Simulator state
  const [simPropertyId, setSimPropertyId] = useState<number>(properties[0]?.id || 0);
  const [simCheckIn, setSimCheckIn] = useState('');
  const [simCheckOut, setSimCheckOut] = useState('');
  const [simPromoCode, setSimPromoCode] = useState('');
  const [activeSection, setActiveSection] = useState<'simulator' | 'seasons' | 'promos' | 'settings'>('simulator');

  // New season form
  const [newSeason, setNewSeason] = useState<Partial<SeasonRule>>({ name: '', startMonth: 1, startDay: 1, endMonth: 1, endDay: 31, multiplier: 1.0, type: 'medium' });
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);

  // New promo form
  const [newPromo, setNewPromo] = useState<Partial<PromoCode>>({ code: '', discount: 10, discountType: 'percent', validFrom: '', validTo: '', maxUses: 50, minNights: 1, active: true });

  const selectedProperty = properties.find(p => p.id === simPropertyId);

  // Today's price badge — compute live season multiplier for today
  const todayPriceBadges = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dayOfWeek = today.getDay();

    return properties.map(p => {
      let multiplier = 1;
      let seasonName = 'Tarif standard';
      const season = config.seasons.find(s => {
        if (s.startMonth <= s.endMonth) {
          return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) &&
                 (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
        } else {
          return (month > s.startMonth || (month === s.startMonth && day >= s.startDay)) ||
                 (month < s.endMonth || (month === s.endMonth && day <= s.endDay));
        }
      });
      if (season) { multiplier = season.multiplier; seasonName = season.name; }
      let nightPrice = p.price * multiplier;
      let isWeekend = false;
      if (config.weekendDays.includes(dayOfWeek)) {
        nightPrice *= (1 + config.weekendSurcharge / 100);
        isWeekend = true;
      }
      return {
        propertyId: p.id,
        name: p.name,
        basePrice: p.price,
        todayPrice: Math.round(nightPrice),
        multiplier,
        seasonName,
        isWeekend,
      };
    });
  }, [properties, config]);

  const priceBreakdown = useMemo(() => {
    if (!selectedProperty || !simCheckIn || !simCheckOut) return null;
    return calculatePrice(selectedProperty, simCheckIn, simCheckOut, config, simPromoCode || undefined);
  }, [selectedProperty, simCheckIn, simCheckOut, config, simPromoCode]);

  const saveConfig = () => {
    localStorage.setItem('bnbgest_pricing_config', JSON.stringify(config));
  };

  const addSeason = () => {
    if (!newSeason.name) return;
    const season: SeasonRule = {
      id: Date.now().toString(),
      name: newSeason.name || '',
      startMonth: newSeason.startMonth || 1,
      startDay: newSeason.startDay || 1,
      endMonth: newSeason.endMonth || 1,
      endDay: newSeason.endDay || 31,
      multiplier: newSeason.multiplier || 1.0,
      type: (newSeason.type as SeasonRule['type']) || 'medium',
    };
    setConfig({ ...config, seasons: [...config.seasons, season] });
    setNewSeason({ name: '', startMonth: 1, startDay: 1, endMonth: 1, endDay: 31, multiplier: 1.0, type: 'medium' });
  };

  const removeSeason = (id: string) => {
    setConfig({ ...config, seasons: config.seasons.filter(s => s.id !== id) });
  };

  const addPromo = () => {
    if (!newPromo.code) return;
    const promo: PromoCode = {
      id: Date.now().toString(),
      code: (newPromo.code || '').toUpperCase(),
      discount: newPromo.discount || 10,
      discountType: (newPromo.discountType as PromoCode['discountType']) || 'percent',
      validFrom: newPromo.validFrom || '',
      validTo: newPromo.validTo || '',
      maxUses: newPromo.maxUses || 50,
      usedCount: 0,
      minNights: newPromo.minNights || 1,
      active: true,
    };
    setConfig({ ...config, promoCodes: [...config.promoCodes, promo] });
    setNewPromo({ code: '', discount: 10, discountType: 'percent', validFrom: '', validTo: '', maxUses: 50, minNights: 1, active: true });
  };

  const removePromo = (id: string) => {
    setConfig({ ...config, promoCodes: config.promoCodes.filter(p => p.id !== id) });
  };

  const togglePromo = (id: string) => {
    setConfig({
      ...config,
      promoCodes: config.promoCodes.map(p => p.id === id ? { ...p, active: !p.active } : p),
    });
  };

  const getSeasonIcon = (type: string) => {
    switch (type) {
      case 'high': return <Sun className="w-4 h-4 text-orange-500" />;
      case 'low': return <Snowflake className="w-4 h-4 text-blue-400" />;
      default: return <Calendar className="w-4 h-4 text-green-500" />;
    }
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-6">
      {/* ── Prix Aujourd'hui ── */}
      {todayPriceBadges.length > 0 && (
        <div className={`rounded-2xl p-5 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Prix suggéré ce soir
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayPriceBadges.map((badge) => (
              <motion.div
                key={badge.propertyId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center justify-between p-4 rounded-xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {badge.name}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {badge.seasonName}{badge.isWeekend ? ' · Weekend' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-lg font-black text-emerald-500">{badge.todayPrice}€</p>
                  <p className={`text-xs ${
                    badge.multiplier > 1 ? 'text-orange-500' : badge.multiplier < 1 ? 'text-blue-500' : isDark ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {badge.multiplier !== 1 ? `${badge.multiplier > 1 ? '+' : ''}${Math.round((badge.multiplier - 1) * 100)}% vs base` : 'Prix standard'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'simulator' as const, label: 'Simulateur', icon: Calculator },
          { id: 'seasons' as const, label: 'Saisons', icon: Sun },
          { id: 'promos' as const, label: 'Codes promo', icon: Tag },
          { id: 'settings' as const, label: 'Parametres', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeSection === tab.id
                ? 'bg-[#FF385C] text-white shadow-lg'
                : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === SIMULATOR === */}
      {activeSection === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-6 space-y-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Calculator className="w-5 h-5 text-[#FF385C]" />
                Simulateur de prix
              </h3>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Propriété</label>
                <select
                  value={simPropertyId}
                  onChange={(e) => setSimPropertyId(Number(e.target.value))}
                  className={`w-full p-3 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id} className="text-gray-900">{p.name} â€” {p.price}â‚¬/nuit</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Arrivee</label>
                  <input
                    type="date"
                    value={simCheckIn}
                    onChange={(e) => setSimCheckIn(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Depart</label>
                  <input
                    type="date"
                    value={simCheckOut}
                    onChange={(e) => setSimCheckOut(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Code promo (optionnel)</label>
                <input
                  type="text"
                  value={simPromoCode}
                  onChange={(e) => setSimPromoCode(e.target.value.toUpperCase())}
                  placeholder="Ex: BIENVENUE10"
                  className={`w-full p-3 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>
          </Card>

          {/* Price breakdown */}
          <Card>
            <div className="p-6">
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <DollarSign className="w-5 h-5 text-green-500" />
                Detail du prix
              </h3>

              {priceBreakdown ? (
                <div className="space-y-3">
                  <div className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <span>Prix de base ({priceBreakdown.nightlyPrices.length} nuits x {priceBreakdown.basePrice}â‚¬)</span>
                    <span>{(priceBreakdown.basePrice * priceBreakdown.nightlyPrices.length).toFixed(2)}â‚¬</span>
                  </div>

                  {priceBreakdown.seasonAdjustment !== 0 && (
                    <div className={`flex justify-between text-sm ${priceBreakdown.seasonAdjustment > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                      <span>Ajustement saisonnier</span>
                      <span>{priceBreakdown.seasonAdjustment > 0 ? '+' : ''}{priceBreakdown.seasonAdjustment.toFixed(2)}â‚¬</span>
                    </div>
                  )}

                  {priceBreakdown.weekendSurcharge > 0 && (
                    <div className="flex justify-between text-sm text-orange-500">
                      <span>Supplement weekend (+{config.weekendSurcharge}%)</span>
                      <span>+{priceBreakdown.weekendSurcharge.toFixed(2)}â‚¬</span>
                    </div>
                  )}

                  <div className={`border-t pt-2 flex justify-between font-medium ${isDark ? 'border-white/10 text-gray-200' : 'border-gray-200 text-gray-800'}`}>
                    <span>Sous-total</span>
                    <span>{priceBreakdown.subtotal.toFixed(2)}â‚¬</span>
                  </div>

                  {priceBreakdown.longStayDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Remise long sejour</span>
                      <span>-{priceBreakdown.longStayDiscount.toFixed(2)}â‚¬</span>
                    </div>
                  )}

                  {priceBreakdown.promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-500">
                      <span>Code promo ({simPromoCode})</span>
                      <span>-{priceBreakdown.promoDiscount.toFixed(2)}â‚¬</span>
                    </div>
                  )}

                  {priceBreakdown.cleaningFee > 0 && (
                    <div className={`flex justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span>Frais de menage</span>
                      <span>+{priceBreakdown.cleaningFee.toFixed(2)}â‚¬</span>
                    </div>
                  )}

                  <div className={`border-t-2 pt-3 flex justify-between text-xl font-bold ${isDark ? 'border-[#FF385C] text-white' : 'border-[#FF385C]/30 text-gray-900'}`}>
                    <span>Total</span>
                    <span className="text-green-500">{priceBreakdown.total.toFixed(2)}â‚¬</span>
                  </div>

                  {/* Nightly detail */}
                  <details className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <summary className="cursor-pointer text-sm font-medium hover:text-[#FF385C]">Detail par nuit</summary>
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                      {priceBreakdown.nightlyPrices.map((n, i) => (
                        <div key={i} className={`flex justify-between text-xs py-1 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                          <span>{new Date(n.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{n.label}</span>
                          <span className="font-medium">{n.price.toFixed(2)}â‚¬</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ) : (
                <p className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Sélectionnez une propriété et des dates pour voir le calcul
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* === SEASONS === */}
      {activeSection === 'seasons' && (
        <div className="space-y-4">
          {/* Existing seasons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.seasons.map(season => (
              <Card key={season.id}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {getSeasonIcon(season.type)}
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{season.name}</h4>
                    </div>
                    <button onClick={() => removeSeason(season.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {season.startDay} {monthNames[season.startMonth - 1]} â†' {season.endDay} {monthNames[season.endMonth - 1]}
                  </p>
                  <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    season.multiplier > 1
                      ? 'bg-orange-100 text-orange-800'
                      : season.multiplier < 1
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <Percent className="w-3 h-3" />
                    {season.multiplier > 1 ? '+' : ''}{Math.round((season.multiplier - 1) * 100)}%
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Add season */}
          <Card>
            <div className="p-6">
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Plus className="w-4 h-4" /> Ajouter une saison
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Nom de la saison"
                  value={newSeason.name || ''}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  className={`col-span-2 p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                />
                <select
                  value={newSeason.type || 'medium'}
                  onChange={(e) => setNewSeason({ ...newSeason, type: e.target.value as SeasonRule['type'] })}
                  className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="high" className="text-gray-900">Haute</option>
                  <option value="medium" className="text-gray-900">Moyenne</option>
                  <option value="low" className="text-gray-900">Basse</option>
                </select>
                <div className="flex items-center gap-2">
                  <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>x</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="3"
                    value={newSeason.multiplier || 1}
                    onChange={(e) => setNewSeason({ ...newSeason, multiplier: parseFloat(e.target.value) })}
                    className={`w-full p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min="1" max="12" value={newSeason.startMonth || 1} onChange={(e) => setNewSeason({ ...newSeason, startMonth: parseInt(e.target.value) })} className={`w-12 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/</span>
                  <input type="number" min="1" max="31" value={newSeason.startDay || 1} onChange={(e) => setNewSeason({ ...newSeason, startDay: parseInt(e.target.value) })} className={`w-12 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                </div>
                <div className="flex items-center gap-1">
                  <input type="number" min="1" max="12" value={newSeason.endMonth || 1} onChange={(e) => setNewSeason({ ...newSeason, endMonth: parseInt(e.target.value) })} className={`w-12 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/</span>
                  <input type="number" min="1" max="31" value={newSeason.endDay || 31} onChange={(e) => setNewSeason({ ...newSeason, endDay: parseInt(e.target.value) })} className={`w-12 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                </div>
                <Button onClick={addSeason} icon={Plus} className="bg-[#FF385C] hover:bg-[#E31C5F]">
                  Ajouter
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* === PROMO CODES === */}
      {activeSection === 'promos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.promoCodes.map(promo => (
              <Card key={promo.id}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Tag className={`w-4 h-4 ${promo.active ? 'text-green-500' : 'text-gray-400'}`} />
                      <code className={`font-mono font-bold ${isDark ? 'text-[#FF385C]' : 'text-[#FF385C]'}`}>{promo.code}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePromo(promo.id)} className={promo.active ? 'text-green-500' : 'text-gray-400'}>
                        {promo.active ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                      <button onClick={() => removePromo(promo.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {promo.discountType === 'percent' ? `-${promo.discount}%` : `-${promo.discount}â‚¬`}
                  </p>
                  <div className={`text-xs space-y-1 mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p>Valide: {promo.validFrom} â†' {promo.validTo}</p>
                    <p>Min. {promo.minNights} nuits | {promo.usedCount}/{promo.maxUses} utilisations</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${promo.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {promo.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Add promo */}
          <Card>
            <div className="p-6">
              <h4 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Plus className="w-4 h-4" /> Nouveau code promo
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="CODE"
                  value={newPromo.code || ''}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  className={`p-2 rounded-lg border font-mono ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={newPromo.discount || 10}
                    onChange={(e) => setNewPromo({ ...newPromo, discount: parseInt(e.target.value) })}
                    className={`w-20 p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <select
                    value={newPromo.discountType || 'percent'}
                    onChange={(e) => setNewPromo({ ...newPromo, discountType: e.target.value as 'percent' | 'fixed' })}
                    className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="percent" className="text-gray-900">%</option>
                    <option value="fixed" className="text-gray-900">â‚¬</option>
                  </select>
                </div>
                <input type="date" value={newPromo.validFrom || ''} onChange={(e) => setNewPromo({ ...newPromo, validFrom: e.target.value })} className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                <input type="date" value={newPromo.validTo || ''} onChange={(e) => setNewPromo({ ...newPromo, validTo: e.target.value })} className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                <input type="number" min="1" placeholder="Max uses" value={newPromo.maxUses || 50} onChange={(e) => setNewPromo({ ...newPromo, maxUses: parseInt(e.target.value) })} className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                <input type="number" min="1" placeholder="Min nuits" value={newPromo.minNights || 1} onChange={(e) => setNewPromo({ ...newPromo, minNights: parseInt(e.target.value) })} className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`} />
                <Button onClick={addPromo} icon={Plus} className="col-span-2 bg-[#FF385C] hover:bg-[#E31C5F]">
                  Ajouter le code
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* === SETTINGS === */}
      {activeSection === 'settings' && (
        <Card>
          <div className="p-6 space-y-6">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <DollarSign className="w-5 h-5 text-[#FF385C]" />
              Parametres de tarification
            </h3>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Supplement weekend (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.weekendSurcharge}
                onChange={(e) => setConfig({ ...config, weekendSurcharge: parseInt(e.target.value) || 0 })}
                className={`w-32 p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Jours weekend
              </label>
              <div className="flex gap-2">
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const days = config.weekendDays.includes(i)
                        ? config.weekendDays.filter(d => d !== i)
                        : [...config.weekendDays, i];
                      setConfig({ ...config, weekendDays: days });
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      config.weekendDays.includes(i)
                        ? 'bg-[#FF385C] text-white'
                        : isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Remises long sejour
              </label>
              <div className="space-y-2">
                {config.longStayDiscount.map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>â‰¥</span>
                    <input
                      type="number"
                      value={d.nights}
                      onChange={(e) => {
                        const newDiscounts = [...config.longStayDiscount];
                        newDiscounts[i] = { ...d, nights: parseInt(e.target.value) || 0 };
                        setConfig({ ...config, longStayDiscount: newDiscounts });
                      }}
                      className={`w-20 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>nuits â†'</span>
                    <input
                      type="number"
                      value={d.discount}
                      onChange={(e) => {
                        const newDiscounts = [...config.longStayDiscount];
                        newDiscounts[i] = { ...d, discount: parseInt(e.target.value) || 0 };
                        setConfig({ ...config, longStayDiscount: newDiscounts });
                      }}
                      className={`w-20 p-2 rounded-lg border text-center ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-gray-300'}`}
                    />
                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                    <button
                      onClick={() => {
                        setConfig({ ...config, longStayDiscount: config.longStayDiscount.filter((_, idx) => idx !== i) });
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={saveConfig} icon={Save} className="bg-green-500 hover:bg-green-600">
              Sauvegarder les parametres
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}


