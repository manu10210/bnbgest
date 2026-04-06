'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, isSameDay, isWithinInterval, parseISO, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, addDays, addMonths, subMonths, differenceInDays,
  isBefore, isAfter, isToday, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB, Booking, MaintenanceTask } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, Lock,
  X, Home, Euro, Moon, Bell, Layers, BarChart2, Download,
  Search, List, TrendingUp, TrendingDown, Minus, ArrowRight,
  Zap, MapPin
} from 'lucide-react';

type ViewMode = 'month' | 'week' | 'agenda';
type EventType = 'booking' | 'maintenance' | 'blocked';

interface CalendarEvent {
  id: string | number;
  type: EventType;
  startDate: Date;
  endDate: Date;
  title: string;
  color: string;
  data: Booking | MaintenanceTask | Record<string, unknown>;
}

const PROPERTY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function generateICS(events: CalendarEvent[], monthLabel: string): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BNBGest//Calendar//FR',
    `X-WR-CALNAME:BNBGest - ${monthLabel}`, 'CALSCALE:GREGORIAN',
  ];
  events.forEach(ev => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@bnbgest`);
    lines.push(`DTSTART:${format(ev.startDate, "yyyyMMdd'T'HHmmss")}`);
    lines.push(`DTEND:${format(ev.endDate, "yyyyMMdd'T'HHmmss")}`);
    lines.push(`SUMMARY:${ev.title}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `bnbgest-${monthLabel}.ics`; a.click();
  URL.revokeObjectURL(url);
}

export default function InteractiveCalendar() {
  const { properties, bookings, maintenanceTasks, updateProperty } = useBNB();
  const { isDark } = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterProperty, setFilterProperty] = useState<number | 'all'>('all');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockPropertyId, setBlockPropertyId] = useState<number>(
    properties.length > 0 ? properties[0].id : 0
  );
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);
  const isDragging = useRef(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [tooltip, setTooltip] = useState<{ event: CalendarEvent; x: number; y: number } | null>(null);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const propColors = useMemo(() => {
    const map: Record<number, string> = {};
    properties.forEach((p, i) => { map[p.id] = PROPERTY_COLORS[i % PROPERTY_COLORS.length]; });
    return map;
  }, [properties]);

  const events = useMemo(() => {
    const all: CalendarEvent[] = [];
    bookings
      .filter(b => b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty))
      .forEach(b => {
        const color = b.status === 'confirmed' ? (propColors[b.propertyId] ?? '#6366f1')
          : b.status === 'completed' ? '#10b981' : '#f59e0b';
        all.push({ id: b.id, type: 'booking', startDate: parseISO(b.checkIn), endDate: parseISO(b.checkOut), title: b.guestInfo.name, color, data: b });
      });
    maintenanceTasks
      .filter(t => filterProperty === 'all' || t.propertyId === filterProperty)
      .forEach(t => {
        all.push({ id: t.id, type: 'maintenance', startDate: parseISO(t.scheduledDate), endDate: parseISO(t.scheduledDate), title: t.title, color: t.priority === 'urgent' ? '#ef4444' : t.status === 'completed' ? '#10b981' : '#8b5cf6', data: t });
      });
    properties.filter(p => filterProperty === 'all' || p.id === filterProperty).forEach(p => {
      (p.availabilityCalendar ?? []).filter(slot => slot.status === 'blocked').forEach((slot, idx) => {
        all.push({ id: `blocked-${p.id}-${idx}`, type: 'blocked', startDate: parseISO(slot.startDate), endDate: parseISO(slot.endDate), title: slot.notes ? `${slot.notes}` : 'Bloque', color: '#ef4444', data: { ...slot } as Record<string, unknown> });
      });
    });
    return all;
  }, [bookings, maintenanceTasks, properties, filterProperty, propColors]);

  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(ev =>
      isSameDay(ev.startDate, date) || isSameDay(ev.endDate, date) ||
      isWithinInterval(date, { start: ev.startDate, end: ev.endDate })
    );
  }, [events]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (!isAfter(d, end)) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const stats = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const monthBookings = bookings.filter(b => {
      const ci = parseISO(b.checkIn);
      return b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty) && ci >= monthStart && ci <= monthEnd;
    });
    const occupiedDays = new Set<string>();
    bookings.filter(b => b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty)).forEach(b => {
      let d = parseISO(b.checkIn); const end = parseISO(b.checkOut);
      while (d < end) { if (d >= monthStart && d <= monthEnd) occupiedDays.add(format(d, 'yyyy-MM-dd')); d = addDays(d, 1); }
    });
    const occupancyRate = Math.round((occupiedDays.size / daysInMonth) * 100);
    const now = new Date();
    const nextCheckIn = bookings.filter(b => b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty)).map(b => parseISO(b.checkIn)).filter(d => d > now).sort((a, z) => a.getTime() - z.getTime())[0];

    // Stats mois précédent
    const prevMonthStart = startOfMonth(subMonths(currentDate, 1));
    const prevMonthEnd = endOfMonth(subMonths(currentDate, 1));
    const prevBookings = bookings.filter(b => {
      const ci = parseISO(b.checkIn);
      return b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty) && ci >= prevMonthStart && ci <= prevMonthEnd;
    });
    const prevRevenue = prevBookings.reduce((s, b) => s + b.totalPrice, 0);
    const prevCount = prevBookings.length;

    const currentRevenue = monthBookings.reduce((s, b) => s + b.totalPrice, 0);
    const revenueDelta = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : null;
    const countDelta = prevCount > 0 ? monthBookings.length - prevCount : null;

    return {
      bookingCount: monthBookings.length, revenue: currentRevenue,
      occupancyRate, daysInMonth, occupiedDays: occupiedDays.size,
      nextCheckIn, daysUntilNext: nextCheckIn ? differenceInDays(nextCheckIn, now) : null,
      revenueDelta, countDelta,
    };
  }, [currentDate, bookings, filterProperty]);

  const handleBlockDates = () => {
    if (!blockStart || !blockEnd) return;
    const prop = properties.find(p => p.id === blockPropertyId);
    if (!prop) return;
    const updated = [...(prop.availabilityCalendar ?? []), { id: Date.now(), propertyId: blockPropertyId, startDate: blockStart, endDate: blockEnd, status: 'blocked' as const, notes: blockReason }];
    updateProperty(blockPropertyId, { ...prop, availabilityCalendar: updated });
    setShowBlockModal(false); setBlockStart(''); setBlockEnd(''); setBlockReason('');
  };

  const handleMouseDown = (date: Date) => { isDragging.current = true; setDragStart(date); setDragEnd(date); };
  const handleMouseEnter = (date: Date) => { if (isDragging.current) setDragEnd(date); };
  const handleMouseUp = () => {
    isDragging.current = false;
    if (dragStart && dragEnd) {
      const s = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
      const e = isBefore(dragStart, dragEnd) ? dragEnd : dragStart;
      setBlockStart(format(s, 'yyyy-MM-dd')); setBlockEnd(format(e, 'yyyy-MM-dd'));
      setShowBlockModal(true);
    }
    setDragStart(null); setDragEnd(null);
  };

  const isDragSelected = (date: Date) => {
    if (!dragStart || !dragEnd) return false;
    const s = isBefore(dragStart, dragEnd) ? dragStart : dragEnd;
    const e = isBefore(dragStart, dragEnd) ? dragEnd : dragStart;
    try { return isWithinInterval(date, { start: s, end: e }); } catch { return false; }
  };

  // Agenda : 60 prochains jours avec au moins 1 event
  const agendaDays = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const result: { date: Date; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, i);
      const evs = getEventsForDate(d);
      if (evs.length > 0) result.push({ date: d, events: evs });
    }
    return result;
  }, [getEventsForDate]);

  // Recherche filtrée
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return events.filter(ev =>
      ev.title.toLowerCase().includes(q) ||
      (ev.type === 'booking' && (ev.data as Booking).guestInfo.email.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [events, search]);

  // Revenu par jour (vue semaine)
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.filter(b => b.status !== 'cancelled' && (filterProperty === 'all' || b.propertyId === filterProperty)).forEach(b => {
      const nights = Math.max(1, differenceInDays(parseISO(b.checkOut), parseISO(b.checkIn)));
      const perNight = b.totalPrice / nights;
      let d = parseISO(b.checkIn);
      const end = parseISO(b.checkOut);
      while (d < end) {
        const key = format(d, 'yyyy-MM-dd');
        map[key] = (map[key] ?? 0) + perNight;
        d = addDays(d, 1);
      }
    });
    return map;
  }, [bookings, filterProperty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') setCurrentDate(d => viewMode === 'month' ? subMonths(d, 1) : addDays(d, -7));
      if (e.key === 'ArrowRight') setCurrentDate(d => viewMode === 'month' ? addMonths(d, 1) : addDays(d, 7));
      if (e.key === 't' || e.key === 'T') setCurrentDate(new Date());
      if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey) setViewMode('month');
      if ((e.key === 'w' || e.key === 'W') && !e.ctrlKey) setViewMode('week');
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey) setViewMode('agenda');
      if (e.key === 'Escape') { setDetailEvent(null); setShowSearch(false); setSearch(''); }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey) { setShowSearch(s => !s); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode]);

  const card = `rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-gray-100 shadow-sm'}`;
  const text = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-gray-400' : 'text-gray-500';
  const inputCls = `w-full px-3 py-2 rounded-xl border outline-none text-sm transition-colors ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600 focus:border-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-indigo-400'}`;
  const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0f0f1a]' : 'bg-gray-50'}`} onMouseUp={handleMouseUp} style={{ userSelect: 'none' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-black tracking-tight ${text}`}>Calendrier</h1>
            <p className={`text-sm mt-0.5 ${sub}`}>{format(currentDate, 'MMMM yyyy', { locale: fr })} &bull; {events.length} evenement{events.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className="relative">
              <button onClick={() => { setShowSearch(s => !s); if (showSearch) setSearch(''); }}
                className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.09]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                title="Rechercher (F)">
                <Search className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showSearch && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className={`absolute right-0 top-11 w-72 rounded-2xl shadow-2xl border z-50 overflow-hidden ${isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className="p-3">
                      <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Nom, email, bien…"
                        className={`w-full px-3 py-2 rounded-xl border outline-none text-sm ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="pb-2 max-h-64 overflow-y-auto">
                        {searchResults.map((ev, i) => (
                          <button key={i} onClick={() => { setDetailEvent(ev); setShowSearch(false); setSearch(''); }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-50'}`}>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${text}`}>{ev.title}</p>
                              <p className={`text-[10px] ${sub}`}>{format(ev.startDate, 'dd MMM yyyy', { locale: fr })}</p>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${ev.color}20`, color: ev.color }}>
                              {ev.type === 'booking' ? 'Rés.' : ev.type === 'maintenance' ? 'Maint.' : 'Bloqué'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    {search.trim() && searchResults.length === 0 && (
                      <p className={`text-xs text-center py-4 ${sub}`}>Aucun résultat</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <select value={filterProperty} onChange={e => setFilterProperty(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className={`text-sm px-3 py-2 rounded-xl border outline-none ${isDark ? 'bg-white/[0.05] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="all">Tous les biens</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className={`flex rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {(['month', 'week', 'agenda'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === v ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.07]' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {v === 'month' ? 'Mois' : v === 'week' ? 'Semaine' : 'Agenda'}
                </button>
              ))}
            </div>
            <div className={`flex items-center rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <button onClick={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : addDays(currentDate, -7))}
                className={`p-2 transition-colors ${isDark ? 'bg-white/[0.03] text-gray-300 hover:bg-white/[0.07]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())}
                className={`px-3 py-2 text-xs font-bold transition-colors ${isDark ? 'bg-white/[0.03] text-gray-300 hover:bg-white/[0.07]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                Aujourd&apos;hui
              </button>
              <button onClick={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addDays(currentDate, 7))}
                className={`p-2 transition-colors ${isDark ? 'bg-white/[0.03] text-gray-300 hover:bg-white/[0.07]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowBlockModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors">
              <Lock className="w-3.5 h-3.5" /> Bloquer
            </button>
            <button onClick={() => generateICS(events, format(currentDate, 'MMMM-yyyy', { locale: fr }))} title="Exporter ICS"
              className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-white/[0.05] text-gray-400 hover:bg-white/[0.09]' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Raccourcis clavier hint */}
        <div className={`hidden md:flex items-center gap-3 text-[10px] ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          {[['←/→','Naviguer'], ['T','Aujourd\'hui'], ['M','Mois'], ['W','Semaine'], ['A','Agenda'], ['F','Recherche'], ['Esc','Fermer']].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isDark ? 'bg-white/[0.06] text-gray-500' : 'bg-gray-100 text-gray-500'}`}>{k}</kbd>
              {v}
            </span>
          ))}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Réservations */}
          <div className={`${card} p-4 flex items-center gap-3`}>
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}><Users className="w-5 h-5 text-blue-400" /></div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${sub}`}>Réservations</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={`text-xl font-black ${text}`}>{stats.bookingCount}</p>
                {stats.countDelta !== null && (
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${stats.countDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.countDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.countDelta >= 0 ? '+' : ''}{stats.countDelta} vs mois préc.
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Revenus */}
          <div className={`${card} p-4 flex items-center gap-3`}>
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}><Euro className="w-5 h-5 text-emerald-400" /></div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs ${sub}`}>Revenus</p>
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className={`text-xl font-black ${text}`}>{fmt(stats.revenue)} €</p>
                {stats.revenueDelta !== null && (
                  <span className={`text-[10px] font-bold flex items-center gap-0.5 ${stats.revenueDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {stats.revenueDelta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.revenueDelta >= 0 ? '+' : ''}{stats.revenueDelta}%
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Taux occ. */}
          <div className={`${card} p-4 flex items-center gap-3`}>
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}><BarChart2 className="w-5 h-5 text-violet-400" /></div>
            <div>
              <p className={`text-xs ${sub}`}>Taux d&apos;occ.</p>
              <p className={`text-xl font-black ${text}`}>{stats.occupancyRate}%</p>
            </div>
          </div>
          {/* Prochain check-in */}
          <div className={`${card} p-4 flex items-center gap-3`}>
            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}><Bell className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className={`text-xs ${sub}`}>{stats.nextCheckIn ? `Check-in dans ${stats.daysUntilNext}j` : 'Prochain'}</p>
              <p className={`text-xl font-black ${text}`}>{stats.nextCheckIn ? format(stats.nextCheckIn, 'dd MMM', { locale: fr }) : '-'}</p>
            </div>
          </div>
        </div>

        {/* Occupation bar */}
        <div className={`${card} px-5 py-3 flex items-center gap-4`}>
          <span className={`text-xs font-bold ${sub} whitespace-nowrap`}>Occupation ce mois</span>
          <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
            <motion.div className={`h-full rounded-full ${stats.occupancyRate >= 80 ? 'bg-emerald-500' : stats.occupancyRate >= 40 ? 'bg-amber-500' : 'bg-rose-400'}`}
              initial={{ width: 0 }} animate={{ width: `${stats.occupancyRate}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
          </div>
          <span className={`text-sm font-black ${stats.occupancyRate >= 80 ? 'text-emerald-400' : stats.occupancyRate >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>{stats.occupancyRate}%</span>
          <span className={`text-xs ${sub}`}>{stats.occupiedDays}/{stats.daysInMonth} j</span>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

          {/* Calendar */}
          <div className={`xl:col-span-3 ${card} p-4 md:p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-black capitalize ${text}`}>
                {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMMM yyyy', { locale: fr })}
              </h2>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {properties.slice(0, 4).map((p, i) => (
                  <span key={p.id} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }}>
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }} />
                    {p.name.split(' ')[0]}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className={`text-center text-[11px] font-bold uppercase tracking-wider py-2 ${sub}`}>{d}</div>
              ))}
            </div>

            {/* Month view */}
            {viewMode === 'month' && (
              <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#e5e7eb' }}>
                {monthDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isDragSel = isDragSelected(day);
                  return (
                    <div key={idx}
                      className={`min-h-[80px] md:min-h-[90px] p-1.5 cursor-pointer transition-all select-none ${isDark ? 'bg-[#0f0f1a]' : 'bg-white'} ${!isCurrentMonth ? 'opacity-40' : ''} ${isTodayDate ? isDark ? '!bg-indigo-950/80' : '!bg-indigo-50/60' : ''} ${isSelected ? isDark ? '!bg-indigo-900/40' : '!bg-indigo-50' : ''} ${isDragSel ? isDark ? '!bg-rose-900/30' : '!bg-rose-50' : ''}`}
                      onClick={() => setSelectedDate(day)}
                      onMouseDown={() => handleMouseDown(day)}
                      onMouseEnter={() => handleMouseEnter(day)}>
                      <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-indigo-500 text-white' : isSelected ? 'text-indigo-400' : sub}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev, i) => (
                          <div key={`${ev.id}-${i}`}
                            onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                            onMouseEnter={e => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                              tooltipTimeout.current = setTimeout(() => setTooltip({ event: ev, x: rect.left, y: rect.top }), 300);
                            }}
                            onMouseLeave={() => { if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current); setTooltip(null); }}
                            className="w-full truncate text-[10px] font-semibold px-1 py-0.5 rounded cursor-pointer hover:opacity-80"
                            style={{ background: `${ev.color}25`, color: ev.color, borderLeft: `2px solid ${ev.color}` }}>
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div className={`text-[10px] font-bold text-center ${sub}`}>+{dayEvents.length - 3}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Week view */}
            {viewMode === 'week' && (
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, idx) => {
                  const dayEvents = getEventsForDate(day);
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const dayRevenue = revenueByDay[format(day, 'yyyy-MM-dd')];
                  return (
                    <div key={idx} onClick={() => setSelectedDate(day)}
                      className={`min-h-[260px] rounded-xl p-2 cursor-pointer transition-colors border flex flex-col ${isTodayDate ? isDark ? 'border-indigo-500/50 bg-indigo-950/40' : 'border-indigo-300 bg-indigo-50/50' : isDark ? 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-white hover:bg-gray-50'} ${isSelected && !isTodayDate ? isDark ? '!border-indigo-400/60' : '!border-indigo-400' : ''}`}>
                      <div className={`text-xs font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isTodayDate ? 'bg-indigo-500 text-white' : sub}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1 flex-1">
                        {dayEvents.map((ev, i) => (
                          <div key={`${ev.id}-${i}`} onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                            className="w-full rounded-lg px-1.5 py-1 text-[11px] font-semibold cursor-pointer truncate hover:opacity-80"
                            style={{ background: `${ev.color}20`, color: ev.color, borderLeft: `3px solid ${ev.color}` }}>
                            {ev.title}
                          </div>
                        ))}
                      </div>
                      {dayRevenue > 0 && (
                        <div className={`mt-2 pt-1.5 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                          <span className="text-[10px] font-black text-emerald-400">{fmt(dayRevenue)} €</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Agenda view */}
            {viewMode === 'agenda' && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {agendaDays.length === 0 ? (
                  <div className="text-center py-16">
                    <CalendarIcon className={`w-12 h-12 mx-auto mb-3 opacity-20 ${isDark ? 'text-white' : 'text-gray-400'}`} />
                    <p className={`text-sm ${sub}`}>Aucun événement dans les 60 prochains jours</p>
                  </div>
                ) : agendaDays.map(({ date, events: dayEvs }) => (
                  <div key={format(date, 'yyyy-MM-dd')}>
                    <div className="flex items-center gap-3 mb-1.5 mt-3 first:mt-0">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-black flex-shrink-0 ${isToday(date) ? 'bg-indigo-500 text-white' : isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                        <span className="text-sm leading-none">{format(date, 'd')}</span>
                        <span className="text-[9px] font-bold uppercase leading-none mt-0.5">{format(date, 'MMM', { locale: fr })}</span>
                      </div>
                      <div>
                        <p className={`text-xs font-bold capitalize ${text}`}>{format(date, 'EEEE', { locale: fr })}</p>
                        {isToday(date) && <span className="text-[10px] font-bold text-indigo-400">Aujourd&apos;hui</span>}
                      </div>
                    </div>
                    <div className="ml-13 space-y-1 pl-2">
                      {dayEvs.map((ev, i) => (
                        <div key={`${ev.id}-${i}`} onClick={() => setDetailEvent(ev)}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.005] ${isDark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-gray-50 hover:bg-gray-100'}`}
                          style={{ borderLeft: `3px solid ${ev.color}` }}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${text}`}>{ev.title}</p>
                            <p className={`text-xs ${sub}`}>
                              {ev.type === 'booking' ? `${format(ev.startDate, 'dd/MM')} → ${format(ev.endDate, 'dd/MM')}` : ev.type === 'maintenance' ? 'Maintenance' : 'Bloqué'}
                            </p>
                          </div>
                          {ev.type === 'booking' && (
                            <span className="text-sm font-black text-emerald-400 flex-shrink-0">
                              {fmt((ev.data as Booking).totalPrice)} €
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${ev.color}20`, color: ev.color }}>
                            {ev.type === 'booking' ? 'Rés.' : ev.type === 'maintenance' ? 'Maint.' : 'Bloqué'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className={`mt-5 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'} flex flex-wrap gap-4 items-center`}>
              <span className={`text-xs font-bold ${sub}`}>Legende :</span>
              {[
                { color: '#6366f1', label: 'Réservation confirmée' },
                { color: '#10b981', label: 'Terminee' },
                { color: '#f59e0b', label: 'En attente' },
                { color: '#8b5cf6', label: 'Maintenance' },
                { color: '#ef4444', label: 'Bloque' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className={`text-xs ${sub}`}>{label}</span>
                </div>
              ))}
              <span className={`ml-auto text-xs italic ${sub} hidden md:block`}>Cliquer-glisser pour bloquer</span>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Day events */}
            <div className={`${card} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-black text-sm ${text}`}>
                  {selectedDate ? format(selectedDate, 'EEE d MMM', { locale: fr }) : format(new Date(), 'EEE d MMM', { locale: fr })}
                </h3>
                <CalendarIcon className={`w-4 h-4 ${sub}`} />
              </div>
              {(() => {
                const dayEvs = getEventsForDate(selectedDate ?? new Date());
                if (dayEvs.length === 0) return (
                  <div className="text-center py-6">
                    <CalendarIcon className={`w-10 h-10 mx-auto mb-2 opacity-20 ${isDark ? 'text-white' : 'text-gray-400'}`} />
                    <p className={`text-xs ${sub}`}>Aucun evenement</p>
                  </div>
                );
                return (
                  <div className="space-y-2">
                    {dayEvs.map((ev, i) => (
                      <motion.div key={`${ev.id}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        onClick={() => setDetailEvent(ev)}
                        className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                          <p className={`text-xs font-bold truncate ${text}`}>{ev.title}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-1 ml-4">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${ev.color}20`, color: ev.color }}>
                            {ev.type === 'booking' ? 'Reservation' : ev.type === 'maintenance' ? 'Maintenance' : 'Bloque'}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Next check-in */}
            {stats.nextCheckIn && (
              <div className={`${card} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className={`text-xs font-bold ${text}`}>Prochain check-in</span>
                </div>
                <p className="text-2xl font-black text-amber-400">
                  {stats.daysUntilNext === 0 ? "Auj.!" : stats.daysUntilNext === 1 ? 'Demain' : `Dans ${stats.daysUntilNext}j`}
                </p>
                <p className={`text-xs mt-1 ${sub}`}>{format(stats.nextCheckIn, 'EEE d MMM yyyy', { locale: fr })}</p>
              </div>
            )}

            {/* Per property */}
            <div className={`${card} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className={`text-xs font-bold ${text}`}>Activite par bien</span>
              </div>
              <div className="space-y-2.5">
                {properties.map((p, i) => {
                  const mBks = bookings.filter(b => b.propertyId === p.id && b.status !== 'cancelled' && parseISO(b.checkIn).getMonth() === currentDate.getMonth() && parseISO(b.checkIn).getFullYear() === currentDate.getFullYear());
                  const color = PROPERTY_COLORS[i % PROPERTY_COLORS.length];
                  return (
                    <div key={p.id}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className={`text-xs font-semibold truncate max-w-[110px] ${text}`}>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] ${sub}`}>{mBks.length} res.</span>
                          <span className="text-[10px] font-bold text-emerald-400">{fmt(mBks.reduce((s, b) => s + b.totalPrice, 0))} EUR</span>
                        </div>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-gray-100'}`}>
                        <motion.div className="h-full rounded-full" style={{ background: color }}
                          initial={{ width: 0 }} animate={{ width: mBks.length > 0 ? `${Math.min(100, mBks.length * 20)}%` : '4%' }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setShowBlockModal(true)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-colors ${isDark ? 'border-white/10 text-gray-500 hover:border-indigo-500/40 hover:text-indigo-400' : 'border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500'}`}>
              <Lock className="w-4 h-4" /> Bloquer des dates
            </button>
          </div>
        </div>

        {/* Detail modal */}
        <AnimatePresence>
          {detailEvent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setDetailEvent(null)}>
              <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 16 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white'}`}>
                <div className="h-1.5" style={{ background: detailEvent.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${detailEvent.color}25`, color: detailEvent.color }}>
                        {detailEvent.type === 'booking' ? 'Reservation' : detailEvent.type === 'maintenance' ? 'Maintenance' : 'Bloque'}
                      </span>
                      <h3 className={`text-xl font-black mt-2 ${text}`}>{detailEvent.title}</h3>
                    </div>
                    <button onClick={() => setDetailEvent(null)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {detailEvent.type === 'booking' && (() => {
                    const b = detailEvent.data as Booking;
                    const nights = differenceInDays(parseISO(b.checkOut), parseISO(b.checkIn));
                    const prop = properties.find(p => p.id === b.propertyId);
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Check-in</p>
                            <p className={`text-sm font-bold mt-0.5 ${text}`}>{format(parseISO(b.checkIn), 'dd MMM yyyy', { locale: fr })}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Check-out</p>
                            <p className={`text-sm font-bold mt-0.5 ${text}`}>{format(parseISO(b.checkOut), 'dd MMM yyyy', { locale: fr })}</p>
                          </div>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                          <div className="flex items-center gap-2"><Moon className="w-4 h-4 text-indigo-400" /><span className={`text-sm ${sub}`}>{nights} nuit{nights > 1 ? 's' : ''}</span></div>
                          <div className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /><span className={`text-sm ${sub}`}>{(b.guestInfo as { guests?: number }).guests ?? 1} voy.</span></div>
                          <div className="flex items-center gap-2"><Euro className="w-4 h-4 text-emerald-400" /><span className="text-sm font-bold text-emerald-400">{fmt(b.totalPrice)} EUR</span></div>
                        </div>
                        {b.guestInfo.email && (
                          <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${sub}`}>Contact</p>
                            <p className={`text-sm ${text}`}>{b.guestInfo.email}</p>
                            {b.guestInfo.phone && <p className={`text-xs mt-0.5 ${sub}`}>{b.guestInfo.phone}</p>}
                          </div>
                        )}
                        {prop && (
                          <div className={`flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                            <Home className="w-4 h-4 text-gray-400" /><span className={`text-sm ${sub}`}>{prop.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {detailEvent.type === 'maintenance' && (() => {
                    const t = detailEvent.data as MaintenanceTask;
                    return (
                      <div className="space-y-3">
                        <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Date</p>
                          <p className={`text-sm font-bold mt-0.5 ${text}`}>{format(parseISO(t.scheduledDate), 'EEEE d MMMM yyyy', { locale: fr })}</p>
                        </div>
                        {t.description && <p className={`text-sm ${sub}`}>{t.description}</p>}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : 'bg-violet-500/20 text-violet-400'}`}>{t.priority === 'urgent' ? 'Urgent' : 'Normal'}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.status === 'completed' ? 'Termine' : 'En cours'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {detailEvent.type === 'blocked' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Du</p>
                        <p className={`text-sm font-bold mt-0.5 ${text}`}>{format(detailEvent.startDate, 'dd MMM yyyy', { locale: fr })}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-gray-50'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>Au</p>
                        <p className={`text-sm font-bold mt-0.5 ${text}`}>{format(detailEvent.endDate, 'dd MMM yyyy', { locale: fr })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Block modal */}
        <AnimatePresence>
          {showBlockModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowBlockModal(false)}>
              <motion.div initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white'}`}>
                <div className="p-5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#e5e7eb' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-rose-500/10"><Lock className="w-4 h-4 text-rose-400" /></div>
                      <h3 className={`font-black ${text}`}>Bloquer des dates</h3>
                    </div>
                    <button onClick={() => setShowBlockModal(false)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${sub}`}>Bien concerne</label>
                    <select value={blockPropertyId} onChange={e => setBlockPropertyId(Number(e.target.value))} className={inputCls}>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${sub}`}>Du</label>
                      <input type="date" value={blockStart} onChange={e => setBlockStart(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1.5 ${sub}`}>Au</label>
                      <input type="date" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${sub}`}>Raison (optionnel)</label>
                    <textarea value={blockReason} onChange={e => setBlockReason(e.target.value)} rows={2} placeholder="Ex: Travaux, sejour personnel..." className={`${inputCls} resize-none`} />
                  </div>
                </div>
                <div className="p-5 pt-0 flex justify-end gap-3">
                  <button onClick={() => setShowBlockModal(false)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-white/[0.05] text-gray-300 hover:bg-white/[0.09]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Annuler</button>
                  <button onClick={handleBlockDates} disabled={!blockStart || !blockEnd} className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" /> Bloquer
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip hover */}
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 4 }}
              transition={{ duration: 0.12 }}
              className={`fixed z-[300] pointer-events-none px-3 py-2.5 rounded-xl shadow-2xl border max-w-[220px] ${isDark ? 'bg-[#1a1a2e] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              style={{ left: Math.min(tooltip.x + 10, window.innerWidth - 240), top: Math.max(tooltip.y - 70, 8) }}>
              <p className="text-xs font-black">{tooltip.event.title}</p>
              <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {format(tooltip.event.startDate, 'dd MMM', { locale: fr })} → {format(tooltip.event.endDate, 'dd MMM yyyy', { locale: fr })}
              </p>
              {tooltip.event.type === 'booking' && (
                <p className="text-[11px] font-black text-emerald-400 mt-1">{fmt((tooltip.event.data as Booking).totalPrice)} €</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: tooltip.event.color }} />
                <span className="text-[10px]" style={{ color: tooltip.event.color }}>
                  {tooltip.event.type === 'booking' ? 'Réservation' : tooltip.event.type === 'maintenance' ? 'Maintenance' : 'Bloqué'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

