'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB } from '../../contexts/BNBContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  Home, Calendar, Star, Search, MapPin, Euro,
  CheckCircle, XCircle, User, Navigation, FileText,
  QrCode, BookOpen, Clock, Phone, Mail, ArrowRight,
  Building2, ChevronRight, Wifi, Car, Waves, Tv,
  Filter, Bed, Bath, Users, Grid3X3, List
} from 'lucide-react';

type ClientTab = 'reservations' | 'properties' | 'documents' | 'reviews';

function euroFmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  'WiFi': <Wifi className="w-3 h-3" />,
  'Parking': <Car className="w-3 h-3" />,
  'Piscine': <Waves className="w-3 h-3" />,
  'TV': <Tv className="w-3 h-3" />,
};

export default function ClientPage() {
  const { properties, bookings, reviews, getProperty, getBookingsByProperty, getReviewsByProperty, getAverageRating } = useBNB();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ClientTab>('reservations');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const filteredBookings = useMemo(() => {
    let f = [...bookings];
    if (statusFilter !== 'all') f = f.filter(b => b.status === statusFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(b =>
        b.guestInfo.name.toLowerCase().includes(q) ||
        (getProperty(b.propertyId)?.name || '').toLowerCase().includes(q)
      );
    }
    return f.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [bookings, statusFilter, searchTerm, getProperty]);

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && b.checkIn > today);
  const currentBookings = bookings.filter(b => b.status === 'confirmed' && b.checkIn <= today && b.checkOut >= today);
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalSpent = bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalPrice, 0);

  const selectedBooking = selectedBookingId ? bookings.find(b => b.id === selectedBookingId) : null;
  const selectedProp = selectedBooking ? getProperty(selectedBooking.propertyId) : null;

  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    confirmed: { label: 'Confirm\u00e9e',  bg: isDark ? 'bg-blue-500/15'    : 'bg-blue-50',    text: isDark ? 'text-blue-400'    : 'text-blue-700',    dot: 'bg-blue-400'    },
    completed: { label: 'Termin\u00e9e',   bg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-50', text: isDark ? 'text-emerald-400' : 'text-emerald-700', dot: 'bg-emerald-400' },
    pending:   { label: 'En attente',      bg: isDark ? 'bg-amber-500/15'   : 'bg-amber-50',   text: isDark ? 'text-amber-400'   : 'text-amber-700',   dot: 'bg-amber-400'   },
    cancelled: { label: 'Annul\u00e9e',    bg: isDark ? 'bg-red-500/15'     : 'bg-red-50',     text: isDark ? 'text-red-400'     : 'text-red-700',     dot: 'bg-red-400'     },
    no_show:   { label: 'No-show',         bg: isDark ? 'bg-white/[0.06]'   : 'bg-gray-100',   text: isDark ? 'text-white/40'    : 'text-gray-500',    dot: 'bg-gray-400'    },
  };

  function StatusBadge({ status }: { status: string }) {
    const cfg = statusConfig[status] || statusConfig.no_show;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  }

  function getDaysUntil(date: string) {
    const d = Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000);
    if (d <= 0) return null;
    if (d === 1) return 'Demain';
    return `Dans ${d}j`;
  }

  function Stars({ rating }: { rating: number }) {
    return (
      <span>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < Math.round(rating) ? 'text-amber-400' : isDark ? 'text-white/15' : 'text-gray-200'}>&#9733;</span>
        ))}
      </span>
    );
  }

  const C  = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T  = isDark ? 'text-white' : 'text-gray-900';
  const M  = isDark ? 'text-white/40' : 'text-gray-400';
  const S  = isDark ? 'text-white/60' : 'text-gray-500';
  const INP = isDark
    ? 'bg-white/[0.04] border border-white/[0.1] text-white placeholder-white/30 rounded-xl'
    : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0d0d1a]' : 'bg-gray-50'}`}>

      {/* HEADER */}
      <motion.header
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'bg-[#0d0d1a]/90 border-white/[0.06]' : 'bg-white/90 border-gray-100'}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className={`font-bold text-sm leading-none ${T}`}>BNBGest</p>
              <p className={`text-[11px] ${M}`}>Portail Client</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {([
              { href: '/', label: 'Accueil', icon: Home },
              { href: '/admin', label: 'Admin', icon: Navigation },
              { href: '/calendar', label: 'Calendrier', icon: Calendar },
            ] as const).map(n => (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                <n.icon className="w-3.5 h-3.5" />{n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* WELCOME BANNER */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${C} p-6 overflow-hidden relative`}>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold ${T}`}>Bienvenue sur votre portail &#128075;</h1>
              <p className={`${S} text-sm mt-1`}>G&eacute;rez vos r&eacute;servations, consultez vos propri&eacute;t&eacute;s et documents.</p>
            </div>
            {upcomingBookings.length > 0 && (
              <div className={`${isDark ? 'bg-violet-500/15 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'} rounded-xl px-4 py-3 flex-shrink-0`}>
                <p className={`text-xs font-medium ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>Prochain s&eacute;jour</p>
                <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-violet-900'}`}>{getProperty(upcomingBookings[0].propertyId)?.name}</p>
                <p className={`text-xs ${isDark ? 'text-violet-400/70' : 'text-violet-700'}`}>
                  {new Date(upcomingBookings[0].checkIn).toLocaleDateString('fr-FR')} {'->'} {new Date(upcomingBookings[0].checkOut).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* CURRENT STAY */}
        {currentBookings.length > 0 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className={`font-semibold text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>S&eacute;jour en cours</p>
                <p className={`text-xs ${isDark ? 'text-emerald-400/70' : 'text-emerald-700'}`}>
                  {getProperty(currentBookings[0].propertyId)?.name} &middot; Check-out {new Date(currentBookings[0].checkOut).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <Link href="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white transition-colors flex-shrink-0">
              <QrCode className="w-3.5 h-3.5" /> QR Check-in
            </Link>
          </motion.div>
        )}

        {/* KPI STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'R\u00e9servations',      value: String(bookings.length),                                          sub: 'au total',                         icon: <Calendar  className="w-5 h-5" />, color: '#8b5cf6' },
            { label: 'Actives / \u00c0 venir', value: String(currentBookings.length + upcomingBookings.length),         sub: `${completedBookings.length} termin\u00e9es`, icon: <Clock className="w-5 h-5" />, color: '#3b82f6' },
            { label: 'Propri\u00e9t\u00e9s',   value: String(properties.length),                                        sub: `${properties.filter(p => p.status === 'active').length} actives`, icon: <Building2 className="w-5 h-5" />, color: '#10b981' },
            { label: 'Total d\u00e9pens\u00e9', value: euroFmt(totalSpent),                                             sub: 'paiements confirm\u00e9s',          icon: <Euro      className="w-5 h-5" />, color: '#f59e0b' },
          ].map((k, i) => (
            <motion.div key={i} whileHover={{ scale: 1.02 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${C} p-4 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}18`, color: k.color }}>
                {k.icon}
              </div>
              <div className="min-w-0">
                <p className={`${M} text-xs`}>{k.label}</p>
                <p className="font-bold text-base" style={{ color: k.color }}>{k.value}</p>
                <p className={`${M} text-[11px]`}>{k.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* TABS */}
        <div className={`${C} p-1.5 flex gap-1 flex-wrap`}>
          {([
            { id: 'reservations' as ClientTab, label: 'R\u00e9servations', icon: Calendar,  badge: filteredBookings.length },
            { id: 'properties'   as ClientTab, label: 'Propri\u00e9t\u00e9s',   icon: Building2, badge: properties.length },
            { id: 'documents'    as ClientTab, label: 'Documents',     icon: FileText,  badge: null },
            { id: 'reviews'      as ClientTab, label: 'Avis',          icon: Star,      badge: reviews.length },
          ]).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-w-0 ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                  : isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              <t.icon className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.badge !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                  activeTab === t.id ? 'bg-white/20 text-white' : isDark ? 'bg-white/10 text-white/50' : 'bg-gray-200 text-gray-500'
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* RESERVATIONS */}
          {activeTab === 'reservations' && (
            <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${M}`} />
                  <input type="text" placeholder="Rechercher par nom ou propri\u00e9t\u00e9..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${INP}`} />
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${M}`} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                      className={`pl-9 pr-8 py-2.5 text-sm focus:outline-none appearance-none ${INP}`}>
                      <option value="all">Tous</option>
                      <option value="confirmed">Confirm&eacute;es</option>
                      <option value="pending">En attente</option>
                      <option value="completed">Termin&eacute;es</option>
                      <option value="cancelled">Annul&eacute;es</option>
                    </select>
                  </div>
                  <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/[0.1]' : 'border-gray-200'}`}>
                    {([['list', List], ['grid', Grid3X3]] as const).map(([v, Icon]) => (
                      <button key={v} onClick={() => setViewMode(v)}
                        className={`px-3 py-2.5 transition-colors ${viewMode === v ? 'bg-violet-600 text-white' : isDark ? 'bg-white/[0.04] text-white/40 hover:bg-white/10' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                        <Icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredBookings.length === 0 ? (
                <div className={`${C} p-10 flex flex-col items-center gap-3`}>
                  <Calendar className={`w-12 h-12 ${M} opacity-40`} />
                  <p className={`${T} font-medium`}>Aucune r&eacute;servation trouv&eacute;e</p>
                  <p className={M}>Modifiez vos filtres ou ajoutez une r&eacute;servation.</p>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-3'}>
                  {filteredBookings.map((booking, i) => {
                    const prop = getProperty(booking.propertyId);
                    const isUpcoming = booking.checkIn > today;
                    const isCurrent  = booking.checkIn <= today && booking.checkOut >= today;
                    const daysUntil  = isUpcoming ? getDaysUntil(booking.checkIn) : null;
                    const nights     = Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000);
                    return (
                      <motion.div key={booking.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedBookingId(booking.id)}
                        className={`${C} p-5 cursor-pointer hover:shadow-lg transition-all group ${isCurrent ? isDark ? 'ring-1 ring-emerald-500/40' : 'ring-1 ring-emerald-300' : ''}`}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                              <Building2 className="w-5 h-5 text-violet-500" />
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${T}`}>{prop?.name || `Propri\u00e9t\u00e9 #${booking.propertyId}`}</p>
                              {prop && <p className={`text-xs flex items-center gap-1 ${M}`}><MapPin className="w-3 h-3" />{prop.city}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                            {isCurrent && (
                              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />En cours
                              </span>
                            )}
                            <StatusBadge status={booking.status} />
                          </div>
                        </div>
                        <div className={`grid grid-cols-4 gap-2 py-3 border-t border-b mb-3 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                          <div>
                            <p className={`text-[10px] uppercase tracking-wide ${M}`}>Check-in</p>
                            <p className={`text-sm font-medium ${T}`}>{new Date(booking.checkIn).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                            {daysUntil && <p className="text-[11px] font-semibold text-violet-400">{daysUntil}</p>}
                          </div>
                          <div>
                            <p className={`text-[10px] uppercase tracking-wide ${M}`}>Check-out</p>
                            <p className={`text-sm font-medium ${T}`}>{new Date(booking.checkOut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                          </div>
                          <div>
                            <p className={`text-[10px] uppercase tracking-wide ${M}`}>Nuits</p>
                            <p className={`text-sm font-medium ${T}`}>{nights}n</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-[10px] uppercase tracking-wide ${M}`}>Total</p>
                            <p className="text-sm font-bold text-emerald-500">{euroFmt(booking.totalPrice)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <span className={`text-xs ${S}`}>{booking.guestInfo.name}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${M} group-hover:text-violet-400 transition-colors`} />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* PROPERTIES */}
          {activeTab === 'properties' && (
            <motion.div key="prop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {properties.length === 0 ? (
                <div className={`${C} p-10 flex flex-col items-center gap-3`}>
                  <Building2 className={`w-12 h-12 ${M} opacity-40`} />
                  <p className={`${T} font-medium`}>Aucune propri&eacute;t&eacute;</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {properties.map((prop, i) => {
                    const avg = getAverageRating(prop.id);
                    const propBookings = getBookingsByProperty(prop.id);
                    const propReviews  = getReviewsByProperty(prop.id);
                    return (
                      <motion.div key={prop.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.01 }} className={`${C} overflow-hidden`}>
                        <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500" />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-violet-500" />
                              </div>
                              <div>
                                <p className={`font-semibold ${T}`}>{prop.name}</p>
                                <p className={`text-xs flex items-center gap-1 ${M}`}><MapPin className="w-3 h-3" />{prop.address}, {prop.city}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                              prop.status === 'active'
                                ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                : isDark ? 'bg-white/[0.06] text-white/40' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {prop.status === 'active' ? '\u25cf Actif' : prop.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            {[
                              { icon: <Bed   className="w-3.5 h-3.5" />, val: `${prop.bedrooms} ch.` },
                              { icon: <Bath  className="w-3.5 h-3.5" />, val: `${prop.bathrooms} sdb` },
                              { icon: <Users className="w-3.5 h-3.5" />, val: `Max ${prop.maxGuests}` },
                            ].map((ss, j) => (
                              <div key={j} className={`flex items-center gap-1 text-xs ${S}`}>{ss.icon}{ss.val}</div>
                            ))}
                          </div>
                          {prop.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {prop.amenities.slice(0, 5).map((a, j) => (
                                <span key={j} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${isDark ? 'bg-white/[0.06] text-white/50' : 'bg-gray-100 text-gray-600'}`}>
                                  {AMENITY_ICONS[a] ?? null}{a}
                                </span>
                              ))}
                              {prop.amenities.length > 5 && <span className={`text-xs ${M}`}>+{prop.amenities.length - 5}</span>}
                            </div>
                          )}
                          <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                              <div>
                                <Stars rating={avg} />
                                <p className={`text-[11px] ${M}`}>{propReviews.length} avis</p>
                              </div>
                              <div className={`${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'} rounded-lg px-2.5 py-1.5`}>
                                <p className={`text-[11px] ${M}`}>{propBookings.length} r&eacute;s.</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-500">{euroFmt(prop.price)}</p>
                              <p className={`text-[11px] ${M}`}>/nuit</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <motion.div key="docs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: FileText, label: 'Contrats PDF',        desc: 'G\u00e9n\u00e9rez et t\u00e9l\u00e9chargez vos contrats de location', color: '#8b5cf6', href: '/admin' },
                  { icon: QrCode,   label: 'QR Check-in',          desc: 'Code QR pour un check-in sans contact',                               color: '#3b82f6', href: '/admin' },
                  { icon: BookOpen, label: "Guide d'accueil",       desc: 'Guide multilingue pour vos voyageurs',                                color: '#10b981', href: '/admin' },
                ].map((doc, i) => (
                  <Link href={doc.href} key={i}>
                    <motion.div whileHover={{ scale: 1.03 }} className={`${C} p-5 cursor-pointer group`}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${doc.color}18` }}>
                        <doc.icon className="w-6 h-6" style={{ color: doc.color }} />
                      </div>
                      <h4 className={`font-semibold mb-1 ${T}`}>{doc.label}</h4>
                      <p className={`text-xs ${M} mb-3`}>{doc.desc}</p>
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: doc.color }}>
                        Acc&eacute;der <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
              {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length > 0 && (
                <div className={`${C} p-5`}>
                  <h3 className={`font-semibold mb-4 flex items-center gap-2 ${T}`}>
                    <Calendar className="w-4 h-4 text-violet-500" />Documents par r&eacute;servation
                  </h3>
                  <div className="space-y-2">
                    {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').slice(0, 6).map(b => {
                      const prop = getProperty(b.propertyId);
                      return (
                        <div key={b.id} className={`${SC} px-4 py-3 flex items-center justify-between gap-3 flex-wrap`}>
                          <div>
                            <p className={`text-sm font-medium ${T}`}>{prop?.name} &middot; {b.guestInfo.name}</p>
                            <p className={`text-xs ${M}`}>{new Date(b.checkIn).toLocaleDateString('fr-FR')} {'->'} {new Date(b.checkOut).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {['Contrat', 'QR', 'Guide'].map(lbl => (
                              <button key={lbl} className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${isDark ? 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'}`}>{lbl}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <motion.div key="rev" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {reviews.length === 0 ? (
                <div className={`${C} p-10 flex flex-col items-center gap-3`}>
                  <Star className={`w-12 h-12 ${M} opacity-40`} />
                  <p className={`${T} font-medium`}>Aucun avis pour le moment</p>
                </div>
              ) : (
                <>
                  <div className={`${C} p-5 flex items-center gap-5`}>
                    <div className="text-center">
                      <p className="text-4xl font-black text-amber-400">
                        {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
                      </p>
                      <Stars rating={reviews.reduce((s, r) => s + r.rating, 0) / reviews.length} />
                      <p className={`text-xs mt-1 ${M}`}>{reviews.length} avis</p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = reviews.filter(r => Math.round(r.rating) === star).length;
                        const pct = Math.round((count / reviews.length) * 100);
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className={`text-xs w-4 text-right ${M}`}>{star}</span>
                            <span className="text-amber-400 text-xs">&#9733;</span>
                            <div className={`flex-1 h-1.5 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: star * 0.05 }}
                                className="h-full rounded-full bg-amber-400" />
                            </div>
                            <span className={`text-xs w-4 ${M}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {reviews.map((review, i) => {
                    const prop = getProperty(review.propertyId);
                    return (
                      <motion.div key={review.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className={`${C} p-5`}>
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Star className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${T}`}>{review.title}</p>
                              <p className={`text-xs ${M}`}>{prop?.name} &middot; {new Date(review.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <Stars rating={review.rating} />
                            <span className="font-bold text-sm text-amber-400">{review.rating}/5</span>
                          </div>
                        </div>
                        <p className={`text-sm leading-relaxed mb-3 ${S}`}>{review.comment}</p>
                        {review.response && (
                          <div className={`px-4 py-3 rounded-xl border-l-4 border-violet-500 ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                            <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-violet-400' : 'text-violet-700'}`}>R&eacute;ponse du propri&eacute;taire</p>
                            <p className={`text-xs ${isDark ? 'text-violet-300/80' : 'text-violet-800'}`}>{review.response.message}</p>
                          </div>
                        )}
                        {review.verified && (
                          <div className="mt-3 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">S&eacute;jour v&eacute;rifi&eacute;</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* BOOKING DETAIL MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedBookingId(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className={`w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${isDark ? 'bg-[#1a1a2e] border border-white/[0.1]' : 'bg-white'}`}>
              <div className="h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-t-2xl" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/15 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${T}`}>{selectedProp?.name || `Propri\u00e9t\u00e9 #${selectedBooking.propertyId}`}</h3>
                      <StatusBadge status={selectedBooking.status} />
                    </div>
                  </div>
                  <button onClick={() => setSelectedBookingId(null)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06] text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}>
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'Check-in',  date: selectedBooking.checkIn,  time: selectedProp?.checkInTime  || '15:00', icon: '\uD83D\uDEEC' },
                    { label: 'Check-out', date: selectedBooking.checkOut, time: selectedProp?.checkOutTime || '11:00', icon: '\uD83D\uDEEB' },
                  ].map(d => (
                    <div key={d.label} className={`${SC} p-3`}>
                      <p className={`text-xs ${M} mb-1`}>{d.icon} {d.label}</p>
                      <p className={`font-bold text-sm ${T}`}>{new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                      <p className={`text-xs ${M}`}>{d.time}</p>
                    </div>
                  ))}
                </div>
                <div className={`${SC} p-4 mb-4 space-y-2`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${M} mb-2`}>Informations client</p>
                  {[
                    { icon: User,  val: selectedBooking.guestInfo.name },
                    { icon: Mail,  val: selectedBooking.guestInfo.email },
                    { icon: Phone, val: selectedBooking.guestInfo.phone },
                  ].map((row, i) => (
                    <div key={i} className={`flex items-center gap-2.5 text-sm ${S}`}>
                      <row.icon className={`w-4 h-4 ${M} flex-shrink-0`} />{row.val}
                    </div>
                  ))}
                </div>
                <div className={`${SC} p-4 space-y-2`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${M} mb-2`}>R&eacute;capitulatif</p>
                  {[
                    { label: 'Voyageurs', val: `${selectedBooking.guests} personne(s)` },
                    { label: 'Paiement',  val: selectedBooking.paymentStatus },
                  ].map((r, i) => (
                    <div key={i} className={`flex justify-between text-sm ${S}`}>
                      <span>{r.label}</span>
                      <span className={`font-medium ${T}`}>{r.val}</span>
                    </div>
                  ))}
                  <div className={`flex justify-between items-center pt-3 mt-1 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-100'}`}>
                    <span className={`font-semibold ${T}`}>Total</span>
                    <span className="text-xl font-black text-emerald-500">{euroFmt(selectedBooking.totalPrice)}</span>
                  </div>
                </div>
                {selectedBooking.specialRequests && (
                  <div className={`mt-3 ${SC} p-3`}>
                    <p className={`text-xs font-semibold ${M} mb-1`}>Demandes sp&eacute;ciales</p>
                    <p className={`text-sm ${S}`}>{selectedBooking.specialRequests}</p>
                  </div>
                )}
                <button onClick={() => setSelectedBookingId(null)}
                  className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
