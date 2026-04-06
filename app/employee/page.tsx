// REWRITTEN: Employee dashboard now uses real DB data via session + API calls
// Original static data replaced with live cleanings + maintenance APIs
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  User, Home, ClipboardList, Clock, CheckCircle,
  Wrench, Calendar, AlertTriangle, Play,
  XCircle, Bell, MapPin, Flame,
  Star, RefreshCw, Search, LogOut
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'today' | 'cleanings' | 'maintenance';

interface Cleaning {
  id: number;
  propertyId: number;
  propertyName?: string;
  scheduledDate: string;
  completedDate?: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string | null;
  notes?: string | null;
  estimatedTime?: number | null;
  actualTime?: number | null;
}

interface Maintenance {
  id: number;
  propertyId: number;
  propertyName?: string;
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  category?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  cost?: number | null;
  notes?: string | null;
}

const priorityLabel: Record<string, { label: string; color: string }> = {
  LOW:    { label: 'Basse',   color: 'bg-blue-500/20 text-blue-400' },
  MEDIUM: { label: 'Normale', color: 'bg-gray-500/20 text-gray-400' },
  HIGH:   { label: 'Haute',   color: 'bg-orange-500/20 text-orange-400' },
  URGENT: { label: 'Urgente', color: 'bg-red-500/20 text-red-400' },
};

const statusLabel: Record<string, { label: string; color: string }> = {
  SCHEDULED:   { label: 'Planifié',    color: 'bg-blue-500/20 text-blue-400' },
  IN_PROGRESS: { label: 'En cours',   color: 'bg-amber-500/20 text-amber-400' },
  COMPLETED:   { label: 'Terminé',    color: 'bg-green-500/20 text-green-400' },
  CANCELLED:   { label: 'Annulé',     color: 'bg-gray-500/20 text-gray-400' },
  PENDING:     { label: 'En attente', color: 'bg-blue-500/20 text-blue-400' },
};

export default function EmployeeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isDark } = useTheme();

  const [tab, setTab] = useState<Tab>('today');
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Auth guard
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const employeeName = session?.user?.name || session?.user?.email || 'EmployÃ©';
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';
  const today = new Date().toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, mRes] = await Promise.all([
        fetch('/api/cleanings?limit=100'),
        fetch('/api/maintenance?limit=100'),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setCleanings(cData.cleanings || cData || []);
      }
      if (mRes.ok) {
        const mData = await mRes.json();
        setMaintenance(mData.tasks || mData || []);
      }
    } catch {
      toast.error('Erreur lors du chargement des tÃ¢ches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const updateCleaningStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/cleanings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'COMPLETED' ? { completedDate: new Date().toISOString() } : {}) }),
      });
      if (res.ok) {
        setCleanings(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as Cleaning['status'] } : c));
        toast.success(newStatus === 'COMPLETED' ? 'âœ… MÃ©nage terminÃ© !' : 'â–¶ï¸ MÃ©nage dÃ©marrÃ©');
      } else {
        toast.error('Erreur lors de la mise Ã  jour');
      }
    } catch {
      toast.error('Erreur rÃ©seau');
    }
  };

  const updateMaintenanceStatus = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...(newStatus === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}) }),
      });
      if (res.ok) {
        setMaintenance(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as Maintenance['status'] } : m));
        toast.success(newStatus === 'COMPLETED' ? 'âœ… TÃ¢che terminÃ©e !' : 'â–¶ï¸ TÃ¢che dÃ©marrÃ©e');
      } else {
        toast.error('Erreur lors de la mise Ã  jour');
      }
    } catch {
      toast.error('Erreur rÃ©seau');
    }
  };

  // Derived data
  const todayCleanings = cleanings.filter(c => c.scheduledDate?.startsWith(today) && c.status !== 'CANCELLED');
  const todayMaintenance = maintenance.filter(m => m.dueDate?.startsWith(today) && m.status !== 'CANCELLED');
  const urgentItems = maintenance.filter(m => m.priority === 'URGENT' && m.status !== 'COMPLETED' && m.status !== 'CANCELLED');

  const filteredCleanings = cleanings.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !search || c.propertyName?.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || c.status === filterStatus;
    return matchQ && matchS;
  });

  const filteredMaintenance = maintenance.filter(m => {
    const q = search.toLowerCase();
    const matchQ = !search || m.title.toLowerCase().includes(q) || m.propertyName?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || m.status === filterStatus;
    return matchQ && matchS;
  });

  const completedToday = [
    ...todayCleanings.filter(c => c.status === 'COMPLETED'),
    ...todayMaintenance.filter(m => m.status === 'COMPLETED'),
  ].length;
  const totalToday = todayCleanings.length + todayMaintenance.length;

  if (status === 'loading' || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Chargement...</p>
        </div>
      </div>
    );
  }

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const card = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'} backdrop-blur-md`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-lg ${text}`}>Bonjour, {employeeName.split(' ')[0]} ðŸ‘‹</h1>
              <p className={`text-xs ${muted}`}>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {urgentItems.length > 0 && (
              <div className="relative">
                <Bell size={20} className="text-red-400" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                  {urgentItems.length}
                </span>
              </div>
            )}
            <ThemeToggle />
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}
              >
                Admin
              </button>
            )}
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="p-2 rounded-lg text-gray-400 hover:text-red-400 transition">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Stats rapides */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Calendar size={18} />, label: "Aujourd'hui", value: totalToday, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: <CheckCircle size={18} />, label: 'TerminÃ©es', value: completedToday, color: 'text-green-400', bg: 'bg-green-500/10' },
            { icon: <Flame size={18} />, label: 'Urgentes', value: urgentItems.length, color: 'text-red-400', bg: 'bg-red-500/10' },
            { icon: <Star size={18} />, label: 'Progression', value: `${totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((s, i) => (
            <div key={i} className={`${card} rounded-2xl p-4`}>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${text}`}>{s.value}</p>
              <p className={`text-xs ${muted} mt-0.5`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Alerte urgente */}
        {urgentItems.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">
                {urgentItems.length} tÃ¢che{urgentItems.length > 1 ? 's urgentes' : ' urgente'} en attente
              </p>
              <p className="text-red-400/70 text-xs mt-0.5">{urgentItems.map(u => u.title).join(' Â· ')}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
          {([
            { id: 'today', label: "Aujourd'hui", icon: <Calendar size={15} /> },
            { id: 'cleanings', label: 'MÃ©nages', icon: <Home size={15} /> },
            { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={15} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSearch(''); setFilterStatus('all'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#FF385C] text-white shadow'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Refresh + count */}
        <div className="flex items-center justify-between">
          <p className={`text-sm ${muted}`}>
            {tab === 'today' ? `${totalToday} tÃ¢che${totalToday !== 1 ? 's' : ''} aujourd'hui` :
             tab === 'cleanings' ? `${filteredCleanings.length} mÃ©nage${filteredCleanings.length !== 1 ? 's' : ''}` :
             `${filteredMaintenance.length} tÃ¢che${filteredMaintenance.length !== 1 ? 's' : ''}`}
          </p>
          <button onClick={fetchData} className={`flex items-center gap-1.5 text-xs ${muted} hover:text-[#FF385C] transition`}>
            <RefreshCw size={13} />Actualiser
          </button>
        </div>

        {/* Search + Filter (cleanings/maintenance tabs only) */}
        {tab !== 'today' && (
          <div className="flex gap-2">
            <div className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl ${card}`}>
              <Search size={15} className={muted} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className={`flex-1 bg-transparent text-sm outline-none ${text}`}
              />
              {search && (
                <button onClick={() => setSearch('')}><XCircle size={14} className="text-gray-400" /></button>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-sm ${card} ${text} outline-none`}
            >
              <option value="all">Tous</option>
              {tab === 'cleanings'
                ? ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                    <option key={s} value={s}>{statusLabel[s]?.label}</option>
                  ))
                : ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                    <option key={s} value={s}>{statusLabel[s]?.label}</option>
                  ))
              }
            </select>
          </div>
        )}

        {/* TODAY TAB */}
        {tab === 'today' && (
          <div className="space-y-4">
            {todayCleanings.length > 0 && (
              <section>
                <h2 className={`font-semibold ${text} mb-3 flex items-center gap-2`}>
                  <Home size={16} className="text-blue-400" />MÃ©nages du jour
                </h2>
                <div className="space-y-3">
                  {todayCleanings.map(c => (
                    <CleaningCard key={c.id} cleaning={c} isDark={isDark} onUpdate={updateCleaningStatus} />
                  ))}
                </div>
              </section>
            )}
            {todayMaintenance.length > 0 && (
              <section>
                <h2 className={`font-semibold ${text} mb-3 flex items-center gap-2`}>
                  <Wrench size={16} className="text-orange-400" />Maintenance du jour
                </h2>
                <div className="space-y-3">
                  {todayMaintenance.map(m => (
                    <MaintenanceCard key={m.id} task={m} isDark={isDark} onUpdate={updateMaintenanceStatus} />
                  ))}
                </div>
              </section>
            )}
            {totalToday === 0 && (
              <div className={`${card} rounded-2xl p-10 text-center`}>
                <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                <p className={`font-semibold ${text}`}>Rien Ã  faire aujourd'hui !</p>
                <p className={`text-sm ${muted} mt-1`}>Toutes les tÃ¢ches du jour sont terminÃ©es.</p>
              </div>
            )}
          </div>
        )}

        {/* CLEANINGS TAB */}
        {tab === 'cleanings' && (
          <div className="space-y-3">
            {filteredCleanings.length === 0
              ? <EmptyState text="Aucun mÃ©nage trouvÃ©" isDark={isDark} />
              : filteredCleanings.map(c => (
                  <CleaningCard key={c.id} cleaning={c} isDark={isDark} onUpdate={updateCleaningStatus} />
                ))
            }
          </div>
        )}

        {/* MAINTENANCE TAB */}
        {tab === 'maintenance' && (
          <div className="space-y-3">
            {filteredMaintenance.length === 0
              ? <EmptyState text="Aucune tÃ¢che trouvÃ©e" isDark={isDark} />
              : filteredMaintenance.map(m => (
                  <MaintenanceCard key={m.id} task={m} isDark={isDark} onUpdate={updateMaintenanceStatus} />
                ))
            }
          </div>
        )}

      </div>
    </div>
  );
}

// â”€â”€ Cleaning Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CleaningCard({ cleaning: c, isDark, onUpdate }: {
  cleaning: Cleaning;
  isDark: boolean;
  onUpdate: (id: number, status: string) => void;
}) {
  const card = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const date = new Date(c.scheduledDate);
  const isToday = c.scheduledDate?.startsWith(new Date().toISOString().split('T')[0]);

  return (
    <div className={`${card} rounded-2xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Home size={14} className="text-blue-400 flex-shrink-0" />
            <span className={`font-semibold ${text} truncate`}>{c.propertyName || `PropriÃ©tÃ© #${c.propertyId}`}</span>
            {isToday && <span className="px-2 py-0.5 rounded-full bg-[#FF385C]/20 text-[#FF385C] text-xs font-medium">Aujourd'hui</span>}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className={`text-xs ${muted} flex items-center gap-1`}>
              <Calendar size={11} />
              {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} Ã  {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {c.estimatedTime && (
              <span className={`text-xs ${muted} flex items-center gap-1`}>
                <Clock size={11} />{Math.floor(c.estimatedTime / 60)}h{String(c.estimatedTime % 60).padStart(2, '0')}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabel[c.status]?.color}`}>
              {statusLabel[c.status]?.label}
            </span>
          </div>
          {c.notes && <p className={`text-xs ${muted} mt-1.5 line-clamp-2`}>{c.notes}</p>}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {c.status === 'SCHEDULED' && (
            <button
              onClick={() => onUpdate(c.id, 'IN_PROGRESS')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs font-medium"
            >
              <Play size={12} />DÃ©marrer
            </button>
          )}
          {c.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onUpdate(c.id, 'COMPLETED')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-xs font-medium"
            >
              <CheckCircle size={12} />Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Maintenance Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MaintenanceCard({ task: m, isDark, onUpdate }: {
  task: Maintenance;
  isDark: boolean;
  onUpdate: (id: number, status: string) => void;
}) {
  const card = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const isOverdue = m.dueDate && new Date(m.dueDate) < new Date() && m.status !== 'COMPLETED' && m.status !== 'CANCELLED';

  return (
    <div className={`${card} rounded-2xl p-4 ${isOverdue ? 'border-red-500/30' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Wrench size={14} className="text-orange-400 flex-shrink-0" />
            <span className={`font-semibold ${text} truncate`}>{m.title}</span>
            {isOverdue && <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">En retard</span>}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs ${muted} flex items-center gap-1`}>
              <MapPin size={11} />{m.propertyName || `PropriÃ©tÃ© #${m.propertyId}`}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityLabel[m.priority]?.color}`}>
              {priorityLabel[m.priority]?.label}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabel[m.status]?.color}`}>
              {statusLabel[m.status]?.label}
            </span>
            {m.category && <span className={`text-xs ${muted}`}>{m.category}</span>}
          </div>
          {m.description && <p className={`text-xs ${muted} mt-1.5 line-clamp-2`}>{m.description}</p>}
          {m.dueDate && (
            <p className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : muted} flex items-center gap-1`}>
              <Calendar size={11} />Ã‰chÃ©ance : {new Date(m.dueDate).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {m.status === 'PENDING' && (
            <button
              onClick={() => onUpdate(m.id, 'IN_PROGRESS')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition text-xs font-medium"
            >
              <Play size={12} />DÃ©marrer
            </button>
          )}
          {m.status === 'IN_PROGRESS' && (
            <button
              onClick={() => onUpdate(m.id, 'COMPLETED')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition text-xs font-medium"
            >
              <CheckCircle size={12} />Terminer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EmptyState({ text, isDark }: { text: string; isDark: boolean }) {
  const card = isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200';
  return (
    <div className={`${card} rounded-2xl p-10 text-center`}>
      <ClipboardList size={36} className="mx-auto mb-3 text-gray-400" />
      <p className={isDark ? 'text-gray-300 font-medium' : 'text-gray-600 font-medium'}>{text}</p>
    </div>
  );
}
