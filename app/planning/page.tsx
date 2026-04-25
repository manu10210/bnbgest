'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Home,
  Wrench, Sparkles, Calendar, Users, RefreshCw,
  CheckCircle, Clock, Plus, X, Download, AlertTriangle,
  ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

interface Property { id: number; name: string; city: string }
interface Booking {
  id: number; propertyId: number; guestName: string;
  checkIn: string; checkOut: string; status: string; guests: number;
  totalPrice?: number;
  nights?: number;
  confirmationCode?: string;
  guestPhone?: string;
  checkInTime?: string;
  checkOutTime?: string;
  specialRequests?: string;
  paymentStatus?: string;
}
interface Cleaning {
  id: number; propertyId: number; scheduledDate: string;
  status: string; assignedTo?: string | null; estimatedTime?: number | null;
}
interface MaintenanceTask {
  id: number; propertyId: number; title: string;
  dueDate?: string | null; status: string; priority: string;
}

interface BookingConflict {
  propertyId: number;
  propertyName: string;
  bookingA: Booking;
  bookingB: Booking;
}

type ViewMode = 'week' | 'month';
type ExportFormat = 'csv' | 'ics';

const BOOKING_STATUS_COLOR: Record<string, string> = {
  CONFIRMED:   'bg-blue-500',
  CHECKED_IN:  'bg-green-500',
  CHECKED_OUT: 'bg-gray-500',
  PENDING:     'bg-amber-500',
  CANCELLED:   'bg-red-400',
};

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isoDay(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function PlanningPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [view, setView]               = useState<ViewMode>('week');
  const [anchor, setAnchor]           = useState(new Date());
  const [properties, setProperties]   = useState<Property[]>([]);
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [cleanings, setCleanings]     = useState<Cleaning[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedProp, setSelectedProp] = useState<number | 'all'>('all');
  const [dayDetail, setDayDetail]     = useState<{ date: Date; propId: number } | null>(null);
  const [exporting, setExporting]     = useState<ExportFormat | null>(null);

  // Styles
  const card = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-white/8' : 'border-gray-200';

  // Build date range for current view
  const dateRange = useCallback((): { start: Date; end: Date; days: Date[] } => {
    if (view === 'week') {
      const start = startOfWeek(anchor);
      const days  = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      return { start, end: days[6], days };
    } else {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const end   = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      // Full grid: pad to Monday start
      const gridStart = startOfWeek(start);
      const gridEnd   = addDays(startOfWeek(end), 6);
      const days: Date[] = [];
      let d = new Date(gridStart);
      while (d <= gridEnd) { days.push(new Date(d)); d = addDays(d, 1); }
      return { start: gridStart, end: gridEnd, days };
    }
  }, [view, anchor]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = dateRange();
      const s = isoDay(addDays(start, -1));
      const e = isoDay(addDays(end, 1));

      const [propRes, bookRes, cleanRes, maintRes] = await Promise.all([
        fetch('/api/properties?limit=100'),
        fetch(`/api/bookings?startDate=${s}&endDate=${e}&limit=200`),
        fetch(`/api/cleanings?startDate=${s}&endDate=${e}&limit=200`),
        fetch(`/api/maintenance?limit=200`),
      ]);

      if (propRes.ok)  { const d = await propRes.json();  setProperties(d.properties || d || []); }
      if (bookRes.ok)  { const d = await bookRes.json();  setBookings(d.bookings || d || []); }
      if (cleanRes.ok) { const d = await cleanRes.json(); setCleanings(d.cleanings || d || []); }
      if (maintRes.ok) { const d = await maintRes.json(); setMaintenance(d.tasks || d || []); }
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const navigate = (dir: number) => {
    const d = new Date(anchor);
    if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  const goToday = () => setAnchor(new Date());

  const displayedProperties = selectedProp === 'all'
    ? properties
    : properties.filter(p => p.id === selectedProp);

  const selectedPropertyIds = useMemo(() => new Set(displayedProperties.map(p => p.id)), [displayedProperties]);
  const { days, start, end } = dateRange();

  const bookingInRange = useCallback((booking: Booking) => {
    if (!selectedPropertyIds.has(booking.propertyId)) return false;
    const ci = new Date(booking.checkIn).getTime();
    const co = new Date(booking.checkOut).getTime();
    const startTs = new Date(start).getTime();
    const endTs = new Date(end).getTime();
    return !Number.isNaN(ci) && !Number.isNaN(co) && co > startTs && ci <= endTs;
  }, [selectedPropertyIds, start, end]);

  const visibleBookings = useMemo(() => {
    return bookings.filter(bookingInRange);
  }, [bookings, bookingInRange]);

  const conflicts = useMemo<BookingConflict[]>(() => {
    const list: BookingConflict[] = [];
    for (const prop of displayedProperties) {
      const propBookings = visibleBookings
        .filter(b => b.propertyId === prop.id && (b.status || '').toLowerCase() !== 'cancelled')
        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());

      for (let i = 0; i < propBookings.length; i++) {
        for (let j = i + 1; j < propBookings.length; j++) {
          const a = propBookings[i];
          const b = propBookings[j];
          const aIn = new Date(a.checkIn).getTime();
          const aOut = new Date(a.checkOut).getTime();
          const bIn = new Date(b.checkIn).getTime();
          const bOut = new Date(b.checkOut).getTime();
          if (bIn >= aOut) break;
          if (aIn < bOut && bIn < aOut) {
            list.push({ propertyId: prop.id, propertyName: prop.name, bookingA: a, bookingB: b });
          }
        }
      }
    }
    return list;
  }, [displayedProperties, visibleBookings]);

  const downloadTextFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (visibleBookings.length === 0) {
      toast.info('Aucune réservation à exporter sur la période affichée.');
      return;
    }

    setExporting('csv');
    try {
      const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const headers = ['id', 'property', 'guest', 'checkIn', 'checkOut', 'guests', 'status'];
      const rows = visibleBookings.map((b) => {
        const property = properties.find(p => p.id === b.propertyId)?.name || `Propriété #${b.propertyId}`;
        return [b.id, property, b.guestName, b.checkIn, b.checkOut, b.guests, b.status].map(escape).join(',');
      });

      const periodTag = `${isoDay(start)}_${isoDay(end)}`;
      const filename = `planning_${periodTag}.csv`;
      downloadTextFile(
        filename,
        [headers.join(','), ...rows].join('\n'),
        'text/csv;charset=utf-8;'
      );
      toast.success(`Export CSV généré (${visibleBookings.length} réservation(s)).`);
    } catch {
      toast.error('Échec de l’export CSV.');
    } finally {
      setExporting(null);
    }
  };

  const exportIcs = () => {
    if (visibleBookings.length === 0) {
      toast.info('Aucune réservation à exporter sur la période affichée.');
      return;
    }

    setExporting('ics');
    try {
      const toIcsDate = (iso: string) => {
        const d = new Date(`${iso}T00:00:00.000Z`);
        return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
      };

      const sanitize = (s: string) => s
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');

      const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const events = visibleBookings.map((b) => {
        const property = properties.find(p => p.id === b.propertyId)?.name || `Propriété #${b.propertyId}`;
        const summary = sanitize(`${b.guestName} — ${property}`);
        const description = sanitize(`Statut: ${b.status} | Voyageurs: ${b.guests}`);
        return [
          'BEGIN:VEVENT',
          `UID:booking-${b.id}@bnbgest`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART;VALUE=DATE:${toIcsDate(b.checkIn)}`,
          `DTEND;VALUE=DATE:${toIcsDate(b.checkOut)}`,
          `SUMMARY:${summary}`,
          `DESCRIPTION:${description}`,
          'END:VEVENT',
        ].join('\r\n');
      });

      const content = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BNBGest//Planning//FR',
        'CALSCALE:GREGORIAN',
        ...events,
        'END:VCALENDAR',
        '',
      ].join('\r\n');

      const periodTag = `${isoDay(start)}_${isoDay(end)}`;
      const filename = `planning_${periodTag}.ics`;
      downloadTextFile(filename, content, 'text/calendar;charset=utf-8;');
      toast.success(`Export iCal généré (${visibleBookings.length} réservation(s)).`);
    } catch {
      toast.error('Échec de l’export iCal.');
    } finally {
      setExporting(null);
    }
  };

  // Events per day per property (propId=-1 = all properties)
  const getBookingsForDayProp = (day: Date, propId: number) =>
    bookings.filter(b => {
      if (propId !== -1 && b.propertyId !== propId) return false;
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      ci.setHours(0,0,0,0); co.setHours(0,0,0,0);
      return day >= ci && day < co;
    });

  const getCheckinsForDay = (day: Date, propId: number) =>
    bookings.filter(b => (propId === -1 || b.propertyId === propId) && sameDay(new Date(b.checkIn), day));
  const getCheckoutsForDay = (day: Date, propId: number) =>
    bookings.filter(b => (propId === -1 || b.propertyId === propId) && sameDay(new Date(b.checkOut), day));
  const getCleaningsForDay = (day: Date, propId: number) =>
    cleanings.filter(c => (propId === -1 || c.propertyId === propId) && sameDay(new Date(c.scheduledDate), day));
  const getMaintenanceForDay = (day: Date, propId: number) =>
    maintenance.filter(m => (propId === -1 || m.propertyId === propId) && m.dueDate && sameDay(new Date(m.dueDate), day));

  const today = new Date(); today.setHours(0,0,0,0);

  const planningMetrics = (() => {
    const startTs = new Date(start); startTs.setHours(0, 0, 0, 0);
    const endTs = new Date(end); endTs.setHours(23, 59, 59, 999);

    const activeBookings = bookings.filter(b => {
      if (!selectedPropertyIds.has(b.propertyId)) return false;
      if ((b.status || '').toLowerCase() === 'cancelled') return false;
      const ci = new Date(b.checkIn).getTime();
      const co = new Date(b.checkOut).getTime();
      return !Number.isNaN(ci) && !Number.isNaN(co) && co > startTs.getTime() && ci <= endTs.getTime();
    });

    const checkins = bookings.filter(b => {
      if (!selectedPropertyIds.has(b.propertyId)) return false;
      const ts = new Date(b.checkIn).getTime();
      return !Number.isNaN(ts) && ts >= startTs.getTime() && ts <= endTs.getTime();
    }).length;

    const checkouts = bookings.filter(b => {
      if (!selectedPropertyIds.has(b.propertyId)) return false;
      const ts = new Date(b.checkOut).getTime();
      return !Number.isNaN(ts) && ts >= startTs.getTime() && ts <= endTs.getTime();
    }).length;

    const pendingCleanings = cleanings.filter(c => {
      if (!selectedPropertyIds.has(c.propertyId)) return false;
      if ((c.status || '').toUpperCase() === 'COMPLETED') return false;
      const ts = new Date(c.scheduledDate).getTime();
      return !Number.isNaN(ts) && ts >= startTs.getTime() && ts <= endTs.getTime();
    }).length;

    const urgentMaintenance = maintenance.filter(m => {
      if (!selectedPropertyIds.has(m.propertyId)) return false;
      const priority = (m.priority || '').toUpperCase();
      if (priority !== 'URGENT' && priority !== 'HIGH') return false;
      const ts = m.dueDate ? new Date(m.dueDate).getTime() : Number.NaN;
      return Number.isNaN(ts) || (ts >= startTs.getTime() && ts <= endTs.getTime());
    }).length;

    const totalSlots = displayedProperties.length * days.length;
    const occupiedSlots = displayedProperties.reduce((sum, prop) => {
      const occDays = days.filter(day => getBookingsForDayProp(day, prop.id).length > 0).length;
      return sum + occDays;
    }, 0);
    const occupancyRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

    return {
      activeBookings: activeBookings.length,
      checkins,
      checkouts,
      pendingCleanings,
      urgentMaintenance,
      occupancyRate,
      conflicts: conflicts.length,
    };
  })();

  const title = view === 'week'
    ? `Semaine du ${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : `${MONTHS_FR[anchor.getMonth()]} ${anchor.getFullYear()}`;

  // Detail panel data
  const detailBookings   = dayDetail ? getBookingsForDayProp(dayDetail.date, dayDetail.propId) : [];
  const detailCheckins   = dayDetail ? getCheckinsForDay(dayDetail.date, dayDetail.propId) : [];
  const detailCheckouts  = dayDetail ? getCheckoutsForDay(dayDetail.date, dayDetail.propId) : [];
  const detailCleanings  = dayDetail ? getCleaningsForDay(dayDetail.date, dayDetail.propId) : [];
  const detailMaint      = dayDetail ? getMaintenanceForDay(dayDetail.date, dayDetail.propId) : [];
  const detailProp       = dayDetail ? properties.find(p => p.id === dayDetail.propId) : null;
  const csvDisabled = loading || exporting !== null || visibleBookings.length === 0;
  const icsDisabled = loading || exporting !== null || visibleBookings.length === 0;

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="max-w-full px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <ArrowLeft size={20} className={muted} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Calendar size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>Planning</h1>
              <p className={`text-xs ${muted}`}>{title}</p>
              <div className={`mt-0.5 flex items-center gap-1 text-[11px] ${muted}`}>
                <button
                  onClick={() => router.push('/admin')}
                  className="inline-flex items-center gap-1 hover:text-[#FF385C] transition-colors"
                >
                  <Home size={12} />
                  Accueil
                </button>
                <span>/</span>
                <span className={text}>Planning</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => navigate(-1)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
              <ChevronLeft size={18} className={muted} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-xl bg-[#FF385C] text-white text-xs font-semibold hover:bg-[#E31C5F] transition">
              Aujourd&apos;hui
            </button>
            <button onClick={() => navigate(1)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
              <ChevronRight size={18} className={muted} />
            </button>
          </div>

          {/* View toggle */}
          <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            {(['week','month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${view === v ? 'bg-[#FF385C] text-white shadow' : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                {v === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>

          {/* Property filter */}
          <select value={selectedProp} onChange={e => setSelectedProp(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className={`px-3 py-2 rounded-xl text-sm ${card} border ${text} outline-none`}>
            <option value="all">Toutes propriétés</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <button onClick={fetchAll} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <RefreshCw size={16} className={muted} />
          </button>
          <button
            onClick={exportCsv}
            disabled={csvDisabled}
            title={visibleBookings.length === 0 ? 'Aucune réservation visible à exporter' : 'Exporter en CSV'}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {exporting === 'csv' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />} {exporting === 'csv' ? 'CSV…' : 'CSV'}
          </button>
          <button
            onClick={exportIcs}
            disabled={icsDisabled}
            title={visibleBookings.length === 0 ? 'Aucune réservation visible à exporter' : 'Exporter en iCal (.ics)'}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1.5 border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            {exporting === 'ics' ? <RefreshCw size={14} className="animate-spin" /> : <Calendar size={14} />} {exporting === 'ics' ? 'iCal…' : 'iCal'}
          </button>
          <button
            onClick={() => toast.info('Création rapide d\'événement bientôt disponible')}
            className="px-3 py-2 rounded-xl bg-[#FF385C] text-white text-xs font-semibold hover:bg-[#E31C5F] transition inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Ajouter
          </button>
          <ThemeToggle />
        </div>
      </header>

      {/* KPI band */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <KpiCard label="Occupation" value={`${planningMetrics.occupancyRate}%`} tone="blue" isDark={isDark} />
          <KpiCard label="Réservations" value={String(planningMetrics.activeBookings)} tone="indigo" isDark={isDark} />
          <KpiCard label="Check-in" value={String(planningMetrics.checkins)} tone="green" isDark={isDark} />
          <KpiCard label="Check-out" value={String(planningMetrics.checkouts)} tone="gray" isDark={isDark} />
          <KpiCard label="Ménages à faire" value={String(planningMetrics.pendingCleanings)} tone="purple" isDark={isDark} />
          <KpiCard label="Maintenance urgente" value={String(planningMetrics.urgentMaintenance)} tone="orange" isDark={isDark} />
          <KpiCard label="Conflits" value={String(planningMetrics.conflicts)} tone="red" isDark={isDark} />
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="px-4 pt-2">
          <div className={`rounded-xl border px-3 py-2 text-xs flex items-start gap-2 ${isDark ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <AlertTriangle size={14} className="mt-0.5" />
            <div>
              <p className="font-semibold">{conflicts.length} conflit(s) détecté(s) sur la période affichée</p>
              <p className={`${isDark ? 'text-red-200/90' : 'text-red-600'} mt-0.5`}>
                Exemple : {conflicts[0].propertyName} — {conflicts[0].bookingA.guestName} chevauche {conflicts[0].bookingB.guestName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 pt-3 pb-1 text-xs items-center">
        {[
          { color: 'bg-blue-500',   label: 'Réservation' },
          { color: 'bg-green-400',  label: 'Check-in' },
          { color: 'bg-gray-400',   label: 'Check-out' },
          { color: 'bg-purple-500', label: 'Ménage' },
          { color: 'bg-orange-500', label: 'Maintenance' },
          { color: 'bg-amber-400', label: 'Turnover IN/OUT' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
            <span className={muted}>{l.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto px-2 pb-8">
          {/* ── WEEK VIEW ── */}
          {view === 'week' && (
            <table className="min-w-full border-separate" style={{ borderSpacing: '4px' }}>
              <thead>
                <tr>
                  <th className={`text-left text-xs font-semibold ${muted} px-3 py-2 w-40 sticky left-0 z-10 ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
                    Propriété
                  </th>
                  {days.map((d, i) => {
                    const isToday = sameDay(d, today);
                    return (
                      <th key={i} className={`text-center min-w-[110px] px-1 py-2 rounded-xl ${isToday ? 'bg-[#FF385C]/10' : ''}`}>
                        <p className={`text-xs font-semibold ${isToday ? 'text-[#FF385C]' : muted}`}>{DAYS_FR[i]}</p>
                        <p className={`text-base font-bold ${isToday ? 'text-[#FF385C]' : text}`}>{d.getDate()}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayedProperties.map(prop => (
                  <tr key={prop.id}>
                    <td className={`sticky left-0 z-10 px-3 py-2 text-sm font-semibold ${text} ${isDark ? 'bg-gray-950' : 'bg-gray-50'} border-r ${border}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#FF385C]" />
                        <span className="truncate max-w-[130px]">{prop.name}</span>
                      </div>
                      <p className={`text-[10px] ${muted} pl-4`}>{prop.city}</p>
                      <p className={`text-[10px] pl-4 mt-0.5 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                        {Math.round((days.filter(d => getBookingsForDayProp(d, prop.id).length > 0).length / Math.max(1, days.length)) * 100)}% occupé
                      </p>
                    </td>
                    {days.map((day, i) => {
                      const occupied  = getBookingsForDayProp(day, prop.id);
                      const checkins  = getCheckinsForDay(day, prop.id);
                      const checkouts = getCheckoutsForDay(day, prop.id);
                      const clean     = getCleaningsForDay(day, prop.id);
                      const maint     = getMaintenanceForDay(day, prop.id);
                      const isToday   = sameDay(day, today);
                      const isTurnover = checkins.length > 0 && checkouts.length > 0;
                      const hasEvents = occupied.length + checkins.length + checkouts.length + clean.length + maint.length > 0;

                      return (
                        <td key={i}
                          onClick={() => hasEvents && setDayDetail({ date: day, propId: prop.id })}
                          className={`align-top p-1.5 rounded-xl border transition-all min-h-[80px] ${
                            isToday
                              ? isDark ? 'border-[#FF385C]/30 bg-[#FF385C]/5' : 'border-[#FF385C]/20 bg-[#FF385C]/3'
                              : isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/5' : 'border-gray-100 bg-white hover:bg-gray-50'
                          } ${hasEvents ? 'cursor-pointer' : ''}`}
                        >
                          {/* Booking pills — one per overlapping booking */}
                          {occupied.map((b, bi) => {
                            const isCI  = sameDay(new Date(b.checkIn),  day);
                            const isCO  = sameDay(new Date(b.checkOut), day);
                            const nights = b.nights ?? Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
                            const pill = isCI && isCO ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                       : isCI         ? 'bg-green-500/20 border-green-500/40 text-green-300'
                                       : isCO         ? 'bg-gray-500/20 border-gray-500/40 text-gray-300'
                                       :                 'bg-blue-500/15 border-blue-500/30 text-blue-200';
                            return (
                              <div key={`occ-${b.id}-${bi}`} className={`mb-1 px-1.5 py-1 rounded-lg border text-[10px] leading-tight ${pill}`}>
                                <p className="font-semibold truncate max-w-[95px]">{b.guestName}</p>
                                <p className="opacity-70 flex items-center gap-1 mt-0.5">
                                  <span>{b.guests}👤</span>
                                  {nights > 0 && <span>{nights}🌙</span>}
                                  {b.totalPrice ? <span className="font-medium">{Math.round(b.totalPrice)}€</span> : null}
                                </p>
                                {(isCI || isCO) && (
                                  <p className="opacity-60 mt-0.5">
                                    {isCI && isCO ? '🔄 IN+OUT' : isCI ? `▶ ${b.checkInTime ?? ''}` : `■ ${b.checkOutTime ?? ''}`}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                          {/* Standalone check-ins not yet in occupied (future) */}
                          {checkins.filter(b => !occupied.find(o => o.id === b.id)).map(b => (
                            <div key={`ci-only-${b.id}`} className="mb-1 px-1.5 py-1 rounded-lg border text-[10px] leading-tight bg-green-500/20 border-green-500/40 text-green-300">
                              <p className="font-semibold truncate max-w-[95px]">{b.guestName}</p>
                              <p className="opacity-70">▶ Arrivée {b.checkInTime ?? ''}</p>
                            </div>
                          ))}
                          {/* Standalone check-outs */}
                          {checkouts.filter(b => !occupied.find(o => o.id === b.id)).map(b => (
                            <div key={`co-only-${b.id}`} className="mb-1 px-1.5 py-1 rounded-lg border text-[10px] leading-tight bg-gray-500/20 border-gray-500/40 text-gray-300">
                              <p className="font-semibold truncate max-w-[95px]">{b.guestName}</p>
                              <p className="opacity-70">■ Départ {b.checkOutTime ?? ''}</p>
                            </div>
                          ))}
                          {/* Cleaning / maintenance badges */}
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {clean.map(c => (
                              <span key={`cl-${c.id}`} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none ${
                                c.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                <Sparkles size={8} />{c.status === 'COMPLETED' ? '✓Ménage' : '🧹Ménage'}
                              </span>
                            ))}
                            {maint.map(m => (
                              <span key={`mt-${m.id}`} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none ${
                                m.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                <Wrench size={8} />{m.priority === 'URGENT' ? '⚠' : '🔧'}
                              </span>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── MONTH VIEW ── */}
          {view === 'month' && (
            <div className="max-w-full">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1 px-1">
                {DAYS_FR.map(d => (
                  <div key={d} className={`text-center text-xs font-semibold ${muted} py-2`}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 px-1">
                {days.map((day, i) => {
                  const isCurrentMonth = day.getMonth() === anchor.getMonth();
                  const isToday = sameDay(day, today);
                  // All events across all displayed properties
                  const allBookings  = displayedProperties.flatMap(p => getBookingsForDayProp(day, p.id));
                  const allCheckins  = displayedProperties.flatMap(p => getCheckinsForDay(day, p.id));
                  const allCheckouts = displayedProperties.flatMap(p => getCheckoutsForDay(day, p.id));
                  const allClean     = displayedProperties.flatMap(p => getCleaningsForDay(day, p.id));
                  const allMaint     = displayedProperties.flatMap(p => getMaintenanceForDay(day, p.id));
                  const total = allBookings.length + allCheckins.length + allClean.length + allMaint.length;

                  return (
                    <div key={i}
                      onClick={() => total > 0 && setDayDetail({ date: day, propId: displayedProperties.length === 1 ? displayedProperties[0].id : -1 })}
                      className={`min-h-[90px] p-1.5 rounded-xl border transition-all ${
                        !isCurrentMonth ? 'opacity-30' : ''
                      } ${
                        isToday
                          ? isDark ? 'border-[#FF385C]/40 bg-[#FF385C]/8' : 'border-[#FF385C]/30 bg-[#FF385C]/5'
                          : isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/5' : 'border-gray-100 bg-white hover:bg-gray-50'
                      } ${total > 0 ? 'cursor-pointer' : ''}`}
                    >
                      <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#FF385C]' : text}`}>{day.getDate()}</p>
                      {/* Booking pills in month view */}
                      {allBookings.slice(0, 2).map((b, bi) => {
                        const isCI = sameDay(new Date(b.checkIn),  day);
                        const isCO = sameDay(new Date(b.checkOut), day);
                        const color = isCI && isCO ? 'bg-amber-500/25 text-amber-300'
                                    : isCI         ? 'bg-green-500/20 text-green-300'
                                    : isCO         ? 'bg-gray-500/20 text-gray-300'
                                    :                'bg-blue-500/15 text-blue-200';
                        return (
                          <div key={`mb-${b.id}-${bi}`} className={`mb-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate leading-snug ${color}`}>
                            {isCI ? '▶' : isCO ? '■' : '—'} {b.guestName}
                            {b.guests > 1 ? ` ×${b.guests}` : ''}
                          </div>
                        );
                      })}
                      {allBookings.length > 2 && (
                        <p className={`text-[9px] ${muted} mt-0.5`}>+{allBookings.length - 2} résa.</p>
                      )}
                      {/* Service dots */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {allClean.length  > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Ménage" />}
                        {allMaint.length  > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Maintenance" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Day Detail Panel ─────────────────────────────── */}
      {dayDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDayDetail(null)} />
          <div className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'} overflow-y-auto max-h-[80vh]`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
              <div>
                <h2 className={`font-bold text-lg ${text}`}>
                  {dayDetail.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <p className={`text-sm ${muted}`}>
                  {dayDetail.propId === -1
                    ? `${displayedProperties.length} logement(s)`
                    : detailProp?.name}
                </p>
              </div>
              <button onClick={() => setDayDetail(null)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                <X size={18} className={muted} />
              </button>
            </div>
            <div className="px-5 pb-6 pt-4 space-y-4">
              {/* Check-ins */}
              {detailCheckins.length > 0 && (
                <Section title="Check-in" icon={<ArrowLeftRight size={14} className="text-green-400" />} isDark={isDark}>
                  {detailCheckins.map(b => (
                    <BookingCard key={b.id} booking={b} badge="Check-in" badgeColor="bg-green-500/15 text-green-400" isDark={isDark}
                      propName={dayDetail.propId === -1 ? properties.find(p => p.id === b.propertyId)?.name : undefined} />
                  ))}
                </Section>
              )}
              {/* Check-outs */}
              {detailCheckouts.length > 0 && (
                <Section title="Check-out" icon={<ArrowLeftRight size={14} className="text-gray-400" />} isDark={isDark}>
                  {detailCheckouts.map(b => (
                    <BookingCard key={b.id} booking={b} badge="Check-out" badgeColor="bg-gray-500/15 text-gray-400" isDark={isDark}
                      propName={dayDetail.propId === -1 ? properties.find(p => p.id === b.propertyId)?.name : undefined} />
                  ))}
                </Section>
              )}
              {/* Occupied */}
              {detailBookings.filter(b => !detailCheckins.find(c => c.id === b.id) && !detailCheckouts.find(c => c.id === b.id)).length > 0 && (
                <Section title="Occupation" icon={<Users size={14} className="text-blue-400" />} isDark={isDark}>
                  {detailBookings.filter(b => !detailCheckins.find(c => c.id === b.id) && !detailCheckouts.find(c => c.id === b.id)).map(b => (
                    <BookingCard key={b.id} booking={b} badge={b.status} badgeColor={`${BOOKING_STATUS_COLOR[b.status] || 'bg-gray-500'}/20 text-white`} isDark={isDark}
                      propName={dayDetail.propId === -1 ? properties.find(p => p.id === b.propertyId)?.name : undefined} />
                  ))}
                </Section>
              )}
              {/* Cleanings */}
              {detailCleanings.length > 0 && (
                <Section title="Ménages" icon={<Sparkles size={14} className="text-purple-400" />} isDark={isDark}>
                  {detailCleanings.map(c => (
                    <EventRow key={c.id} title={c.assignedTo || 'Non assigné'}
                      sub={c.estimatedTime ? `~${Math.floor(c.estimatedTime/60)}h${String(c.estimatedTime%60).padStart(2,'0')}` : ''}
                      badge={c.status} badgeColor={c.status === 'COMPLETED' ? 'bg-green-500/15 text-green-400' : 'bg-purple-500/15 text-purple-400'} isDark={isDark} />
                  ))}
                </Section>
              )}
              {/* Maintenance */}
              {detailMaint.length > 0 && (
                <Section title="Maintenance" icon={<Wrench size={14} className="text-orange-400" />} isDark={isDark}>
                  {detailMaint.map(m => (
                    <EventRow key={m.id} title={m.title} sub={m.status}
                      badge={m.priority} badgeColor={m.priority === 'URGENT' ? 'bg-red-500/15 text-red-400' : 'bg-orange-500/15 text-orange-400'} isDark={isDark} />
                  ))}
                </Section>
              )}
              {detailCheckins.length + detailCheckouts.length + detailBookings.length + detailCleanings.length + detailMaint.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className={`${muted} text-sm`}>Aucun événement ce jour</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
  isDark,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'indigo' | 'green' | 'gray' | 'purple' | 'orange' | 'red';
  isDark: boolean;
}) {
  const toneMap: Record<typeof tone, string> = {
    blue: 'from-blue-500/20 to-cyan-500/10 text-blue-300 border-blue-500/20',
    indigo: 'from-indigo-500/20 to-violet-500/10 text-indigo-300 border-indigo-500/20',
    green: 'from-emerald-500/20 to-green-500/10 text-emerald-300 border-emerald-500/20',
    gray: 'from-slate-500/20 to-gray-500/10 text-slate-300 border-slate-500/20',
    purple: 'from-purple-500/20 to-fuchsia-500/10 text-purple-300 border-purple-500/20',
    orange: 'from-orange-500/20 to-amber-500/10 text-orange-300 border-orange-500/20',
    red: 'from-red-500/20 to-rose-500/10 text-red-300 border-red-500/20',
  };

  return (
    <div className={`rounded-xl border px-3 py-2 bg-gradient-to-br ${toneMap[tone]} ${isDark ? 'backdrop-blur-sm' : 'bg-white'}`}>
      <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-lg font-extrabold leading-5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function Section({ title, icon, children, isDark }: { title: string; icon: React.ReactNode; children: React.ReactNode; isDark: boolean }) {
  const text = isDark ? 'text-white' : 'text-gray-900';
  return (
    <div>
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${text} mb-2`}>{icon}{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function EventRow({ title, sub, badge, badgeColor, isDark }: {
  title: string; sub?: string; badge: string; badgeColor: string; isDark: boolean
}) {
  const card  = isDark ? 'bg-white/5' : 'bg-gray-50';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${card}`}>
      <div>
        <p className={`text-sm font-medium ${text}`}>{title}</p>
        {sub && <p className={`text-xs ${muted}`}>{sub}</p>}
      </div>
      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${badgeColor}`}>{badge}</span>
    </div>
  );
}

function BookingCard({ booking: b, badge, badgeColor, isDark, propName }: {
  booking: { id: number; guestName: string; guests: number; checkIn: string; checkOut: string; status: string;
             totalPrice?: number; nights?: number; confirmationCode?: string; guestPhone?: string;
             checkInTime?: string; checkOutTime?: string; specialRequests?: string; paymentStatus?: string; };
  badge: string; badgeColor: string; isDark: boolean; propName?: string;
}) {
  const card  = isDark ? 'bg-white/5' : 'bg-gray-50';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const sep   = isDark ? 'border-white/5' : 'border-gray-100';

  const nights = b.nights ?? Math.max(1, Math.round(
    (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000));

  return (
    <div className={`rounded-xl ${card} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div>
          <p className={`text-sm font-semibold ${text}`}>{b.guestName}</p>
          {propName && <p className={`text-[10px] ${muted}`}>📍 {propName}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${badgeColor}`}>{badge}</span>
      </div>
      <div className={`grid grid-cols-2 gap-x-3 gap-y-0.5 px-3 pb-2.5 border-t ${sep} pt-1.5`}>
        <span className={`text-[11px] ${muted}`}>👤 {b.guests} voyageur{b.guests > 1 ? 's' : ''}</span>
        <span className={`text-[11px] ${muted}`}>🌙 {nights} nuit{nights > 1 ? 's' : ''}</span>
        {b.totalPrice != null && (
          <span className={`text-[11px] font-semibold text-emerald-400`}>💶 {b.totalPrice.toLocaleString('fr-FR')} €</span>
        )}
        {b.paymentStatus && (
          <span className={`text-[11px] ${muted}`}>💳 {b.paymentStatus}</span>
        )}
        {b.checkInTime && (
          <span className={`text-[11px] ${muted}`}>🕐 Arrivée {b.checkInTime}</span>
        )}
        {b.checkOutTime && (
          <span className={`text-[11px] ${muted}`}>🕐 Départ {b.checkOutTime}</span>
        )}
        {b.guestPhone && (
          <span className={`text-[11px] ${muted} col-span-2`}>📞 {b.guestPhone}</span>
        )}
        {b.confirmationCode && (
          <span className={`text-[11px] ${muted} col-span-2`}>🔑 {b.confirmationCode}</span>
        )}
        {b.specialRequests && (
          <span className={`text-[11px] ${muted} col-span-2 italic`}>💬 {b.specialRequests}</span>
        )}
        <span className={`text-[11px] ${muted}`}>
          📅 {new Date(b.checkIn).toLocaleDateString('fr-FR', {day:'numeric',month:'short'})} → {new Date(b.checkOut).toLocaleDateString('fr-FR', {day:'numeric',month:'short'})}
        </span>
      </div>
    </div>
  );
}
