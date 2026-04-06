'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Home,
  Wrench, Sparkles, Calendar, Users, RefreshCw,
  CheckCircle, Clock, AlertTriangle, Plus, X,
  ArrowLeftRight
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

interface Property { id: number; name: string; city: string }
interface Booking {
  id: number; propertyId: number; guestName: string;
  checkIn: string; checkOut: string; status: string; guests: number;
}
interface Cleaning {
  id: number; propertyId: number; scheduledDate: string;
  status: string; assignedTo?: string | null; estimatedTime?: number | null;
}
interface MaintenanceTask {
  id: number; propertyId: number; title: string;
  dueDate?: string | null; status: string; priority: string;
}

type ViewMode = 'week' | 'month';

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

  // Styles
  const bg   = isDark ? 'bg-gray-950' : 'bg-gray-50';
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

  // Events per day per property
  const getBookingsForDayProp = (day: Date, propId: number) =>
    bookings.filter(b => {
      if (b.propertyId !== propId) return false;
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      ci.setHours(0,0,0,0); co.setHours(0,0,0,0);
      return day >= ci && day < co;
    });

  const getCheckinsForDay = (day: Date, propId: number) =>
    bookings.filter(b => b.propertyId === propId && sameDay(new Date(b.checkIn), day));
  const getCheckoutsForDay = (day: Date, propId: number) =>
    bookings.filter(b => b.propertyId === propId && sameDay(new Date(b.checkOut), day));
  const getCleaningsForDay = (day: Date, propId: number) =>
    cleanings.filter(c => c.propertyId === propId && sameDay(new Date(c.scheduledDate), day));
  const getMaintenanceForDay = (day: Date, propId: number) =>
    maintenance.filter(m => m.propertyId === propId && m.dueDate && sameDay(new Date(m.dueDate), day));

  const { days } = dateRange();
  const today = new Date(); today.setHours(0,0,0,0);

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
          <ThemeToggle />
        </div>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 pt-3 pb-1 text-xs">
        {[
          { color: 'bg-blue-500',   label: 'Réservation' },
          { color: 'bg-green-400',  label: 'Check-in' },
          { color: 'bg-gray-400',   label: 'Check-out' },
          { color: 'bg-purple-500', label: 'Ménage' },
          { color: 'bg-orange-500', label: 'Maintenance' },
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
                    </td>
                    {days.map((day, i) => {
                      const occupied  = getBookingsForDayProp(day, prop.id);
                      const checkins  = getCheckinsForDay(day, prop.id);
                      const checkouts = getCheckoutsForDay(day, prop.id);
                      const clean     = getCleaningsForDay(day, prop.id);
                      const maint     = getMaintenanceForDay(day, prop.id);
                      const isToday   = sameDay(day, today);
                      const hasEvents = occupied.length + checkins.length + checkouts.length + clean.length + maint.length > 0;

                      return (
                        <td key={i}
                          onClick={() => hasEvents && setDayDetail({ date: day, propId: prop.id })}
                          className={`align-top p-1.5 rounded-xl border transition-all min-h-[70px] ${
                            isToday
                              ? isDark ? 'border-[#FF385C]/30 bg-[#FF385C]/5' : 'border-[#FF385C]/20 bg-[#FF385C]/3'
                              : isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/5' : 'border-gray-100 bg-white hover:bg-gray-50'
                          } ${hasEvents ? 'cursor-pointer' : ''}`}
                        >
                          {/* Occupied bar */}
                          {occupied.length > 0 && (
                            <div className="h-1.5 rounded-full bg-blue-500/70 mb-1" title={occupied[0].guestName} />
                          )}
                          <div className="flex flex-wrap gap-0.5">
                            {checkins.map(b => (
                              <span key={`ci-${b.id}`} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-medium leading-none">
                                <ArrowLeftRight size={8} />IN
                              </span>
                            ))}
                            {checkouts.map(b => (
                              <span key={`co-${b.id}`} className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[9px] font-medium leading-none">
                                <ArrowLeftRight size={8} />OUT
                              </span>
                            ))}
                            {clean.map(c => (
                              <span key={`cl-${c.id}`} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none ${
                                c.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                <Sparkles size={8} />
                                {c.status === 'COMPLETED' ? '✓' : 'M'}
                              </span>
                            ))}
                            {maint.map(m => (
                              <span key={`mt-${m.id}`} className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium leading-none ${
                                m.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                              }`}>
                                <Wrench size={8} />
                                {m.priority === 'URGENT' ? '!' : 'T'}
                              </span>
                            ))}
                          </div>
                          {occupied.length > 0 && (
                            <p className={`text-[9px] ${muted} mt-0.5 truncate`}>{occupied[0].guestName}</p>
                          )}
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
                      onClick={() => total > 0 && displayedProperties.length === 1 && setDayDetail({ date: day, propId: displayedProperties[0].id })}
                      className={`min-h-[80px] p-1.5 rounded-xl border transition-all ${
                        !isCurrentMonth ? 'opacity-30' : ''
                      } ${
                        isToday
                          ? isDark ? 'border-[#FF385C]/40 bg-[#FF385C]/8' : 'border-[#FF385C]/30 bg-[#FF385C]/5'
                          : isDark ? 'border-white/5 bg-white/[0.02] hover:bg-white/5' : 'border-gray-100 bg-white hover:bg-gray-50'
                      } ${total > 0 && displayedProperties.length === 1 ? 'cursor-pointer' : ''}`}
                    >
                      <p className={`text-xs font-bold mb-1 ${isToday ? 'text-[#FF385C]' : text}`}>{day.getDate()}</p>
                      {allBookings.length > 0 && <div className="h-1 rounded-full bg-blue-500/60 mb-0.5" />}
                      <div className="flex flex-wrap gap-0.5">
                        {allCheckins.length  > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-400" title="Check-in" />}
                        {allCheckouts.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" title="Check-out" />}
                        {allClean.length     > 0 && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Ménage" />}
                        {allMaint.length     > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" title="Maintenance" />}
                      </div>
                      {total > 0 && <p className={`text-[9px] ${muted} mt-0.5`}>{total} évt</p>}
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
                <p className={`text-sm ${muted}`}>{detailProp?.name}</p>
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
                    <EventRow key={b.id} title={b.guestName} sub={`${b.guests} voyageur(s)`} badge="Check-in" badgeColor="bg-green-500/15 text-green-400" isDark={isDark} />
                  ))}
                </Section>
              )}
              {/* Check-outs */}
              {detailCheckouts.length > 0 && (
                <Section title="Check-out" icon={<ArrowLeftRight size={14} className="text-gray-400" />} isDark={isDark}>
                  {detailCheckouts.map(b => (
                    <EventRow key={b.id} title={b.guestName} sub={`${b.guests} voyageur(s)`} badge="Check-out" badgeColor="bg-gray-500/15 text-gray-400" isDark={isDark} />
                  ))}
                </Section>
              )}
              {/* Occupied */}
              {detailBookings.filter(b => !detailCheckins.find(c => c.id === b.id) && !detailCheckouts.find(c => c.id === b.id)).length > 0 && (
                <Section title="Occupation" icon={<Users size={14} className="text-blue-400" />} isDark={isDark}>
                  {detailBookings.filter(b => !detailCheckins.find(c => c.id === b.id) && !detailCheckouts.find(c => c.id === b.id)).map(b => (
                    <EventRow key={b.id} title={b.guestName}
                      sub={`jusqu'au ${new Date(b.checkOut).toLocaleDateString('fr-FR')}`}
                      badge={b.status} badgeColor={`${BOOKING_STATUS_COLOR[b.status] || 'bg-gray-500'}/20 text-white`} isDark={isDark} />
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
