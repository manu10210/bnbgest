'use client';

import { useState, useMemo } from 'react';
import { useBNB, MaintenanceTask } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import {
  Wrench,
  AlertTriangle,
  Calendar,
  Home,
  Play,
  CheckCircle
} from 'lucide-react';

interface MaintenanceManagerProps {
  propertyId?: number;
  showFilters?: boolean;
}

const PRIORITY_CFG = {
  urgent: { label: 'Urgente', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500',    bar: 'bg-red-500' },
  high:   { label: 'Haute',   bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500', bar: 'bg-orange-400' },
  medium: { label: 'Moyenne', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500', bar: 'bg-yellow-400' },
  low:    { label: 'Basse',   bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500',  bar: 'bg-green-400' },
} as const;

const STATUS_CFG = {
  pending:     { label: 'En attente', bg: 'bg-slate-100', text: 'text-slate-600', icon: '⏳' },
  in_progress: { label: 'En cours',   bg: 'bg-blue-100',  text: 'text-blue-700',  icon: '🔄' },
  completed:   { label: 'Terminee',   bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
  cancelled:   { label: 'Annulee',    bg: 'bg-red-100',   text: 'text-red-600',   icon: '✕'  },
} as const;

const CAT_CFG = {
  cleaning:   { label: 'Nettoyage',   icon: '🧹', color: 'bg-[#FF385C]/10 text-[#FF385C]' },
  repair:     { label: 'Reparation',  icon: '🔧', color: 'bg-blue-100 text-blue-700' },
  inspection: { label: 'Inspection',  icon: '🔍', color: 'bg-[#FF385C]/10 text-[#FF385C]' },
  supplies:   { label: 'Fournitures', icon: '📦', color: 'bg-amber-100 text-amber-700' },
  other:      { label: 'Autre',       icon: '⚙️', color: 'bg-gray-100 text-gray-700' },
} as const;

const fmt = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const isOverdue = (t: MaintenanceTask) =>
  t.status !== 'completed' && t.status !== 'cancelled' && !!t.scheduledDate && new Date(t.scheduledDate) < new Date();

const daysUntil = (d: string) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
};

export default function MaintenanceManager({ propertyId, showFilters = true }: MaintenanceManagerProps) {
  const { isDark } = useTheme();
  const { properties, maintenanceTasks, addMaintenanceTask, updateMaintenanceTask, completeMaintenanceTask, getOverdueTasks, getProperty } = useBNB();

  const [statusFilter,   setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search,         setSearch]         = useState('');
  const [viewMode,       setViewMode]       = useState<'cards' | 'table' | 'kanban'>('cards');
  const [sortBy,         setSortBy]         = useState<'priority' | 'date' | 'cost'>('priority');
  const [showAddTask,    setShowAddTask]    = useState(false);
  const [taskToEdit,     setTaskToEdit]    = useState<MaintenanceTask | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);
  const [actualCostInput, setActualCostInput] = useState('0');
  const [expandedTask,   setExpandedTask]  = useState<number | null>(null);

  const defaultNew = { propertyId: propertyId || 0, title: '', description: '', priority: 'medium' as MaintenanceTask['priority'], category: 'repair' as MaintenanceTask['category'], estimatedCost: 0, scheduledDate: '', notes: '' };
  const [newTask, setNewTask] = useState({ ...defaultNew });

  type EditForm = { title: string; description: string; priority: MaintenanceTask['priority']; category: MaintenanceTask['category']; status: MaintenanceTask['status']; estimatedCost: number; scheduledDate: string; notes: string };
  const [editForm, setEditForm] = useState<EditForm>({ title: '', description: '', priority: 'medium', category: 'other', status: 'pending', estimatedCost: 0, scheduledDate: '', notes: '' });

  const scopeTasks   = propertyId ? maintenanceTasks.filter(t => t.propertyId === propertyId) : maintenanceTasks;
  const overdueList  = getOverdueTasks().filter(t => !propertyId || t.propertyId === propertyId);
  const statPending    = scopeTasks.filter(t => t.status === 'pending').length;
  const statInProgress = scopeTasks.filter(t => t.status === 'in_progress').length;
  const statCompleted  = scopeTasks.filter(t => t.status === 'completed').length;
  const statOverdue    = overdueList.length;
  const totalEstimated = scopeTasks.filter(t => t.status !== 'cancelled').reduce((s, t) => s + t.estimatedCost, 0);
  const totalActual    = scopeTasks.filter(t => t.actualCost !== undefined).reduce((s, t) => s + (t.actualCost ?? 0), 0);

  const filteredTasks = useMemo(() => {
    let tasks = [...scopeTasks];
    if (statusFilter   !== 'all') tasks = tasks.filter(t => t.status   === statusFilter);
    if (priorityFilter !== 'all') tasks = tasks.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== 'all') tasks = tasks.filter(t => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q));
    }
    const po: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return tasks.sort((a, b) => {
      if (sortBy === 'priority') { const d = po[a.priority] - po[b.priority]; return d !== 0 ? d : new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(); }
      if (sortBy === 'date') return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      return b.estimatedCost - a.estimatedCost;
    });
  }, [scopeTasks, statusFilter, priorityFilter, categoryFilter, search, sortBy]);

  const urgentActive = filteredTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled');

  const handleAdd = () => {
    if (!newTask.title.trim() || !newTask.scheduledDate || !newTask.propertyId) return;
    addMaintenanceTask({ ...newTask, status: 'pending' });
    setNewTask({ ...defaultNew });
    setShowAddTask(false);
  };

  const openEdit = (task: MaintenanceTask) => {
    setTaskToEdit(task);
    setEditForm({ title: task.title, description: task.description, priority: task.priority, category: task.category, status: task.status, estimatedCost: task.estimatedCost, scheduledDate: task.scheduledDate, notes: task.notes || '' });
  };

  const handleSaveEdit = () => {
    if (!taskToEdit) return;
    if (editForm.status === 'completed' && taskToEdit.status !== 'completed') {
      completeMaintenanceTask(taskToEdit.id, editForm.estimatedCost || undefined);
    } else {
      updateMaintenanceTask(taskToEdit.id, { title: editForm.title, description: editForm.description, priority: editForm.priority, category: editForm.category, status: editForm.status, estimatedCost: editForm.estimatedCost, scheduledDate: editForm.scheduledDate, notes: editForm.notes });
    }
    setTaskToEdit(null);
  };

  const openComplete  = (task: MaintenanceTask) => { setCompletingTask(task); setActualCostInput(String(task.estimatedCost)); setShowCompleteModal(true); };
  const handleComplete = () => { if (!completingTask) return; completeMaintenanceTask(completingTask.id, parseFloat(actualCostInput) || undefined); setShowCompleteModal(false); setCompletingTask(null); };
  const handleStart   = (task: MaintenanceTask) => updateMaintenanceTask(task.id, { status: 'in_progress' });
  const handleCancel  = (task: MaintenanceTask) => { if (confirm('Annuler cette tache ?')) updateMaintenanceTask(task.id, { status: 'cancelled' }); };

  const kpiItems: { label: string; value: string | number; icon: string; color: string; filter?: () => void; active?: boolean }[] = [
    { label: 'En attente',   value: statPending,    icon: '⏳', color: 'from-slate-400 to-slate-500',    filter: () => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'), active: statusFilter === 'pending' },
    { label: 'En cours',     value: statInProgress, icon: '🔄', color: 'from-blue-400 to-blue-500',      filter: () => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress'), active: statusFilter === 'in_progress' },
    { label: 'Terminees',    value: statCompleted,  icon: '✅', color: 'from-green-400 to-green-500',    filter: () => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed'), active: statusFilter === 'completed' },
    { label: 'En retard',    value: statOverdue,    icon: '⚠️', color: 'from-red-400 to-red-500' },
    { label: 'Cout estimé',  value: `${totalEstimated.toLocaleString('fr-FR')}€`, icon: '💶', color: 'from-[#FF385C] to-[#E31C5F]' },
    { label: 'Cout reel',    value: `${totalActual.toLocaleString('fr-FR')}€`,    icon: '💰', color: 'from-emerald-400 to-emerald-500' },
  ];

  const kanbanGroups = [
    { key: 'pending'     as MaintenanceTask['status'], label: 'En attente', icon: '⏳', color: 'bg-slate-50 border-slate-200' },
    { key: 'in_progress' as MaintenanceTask['status'], label: 'En cours',   icon: '🔄', color: 'bg-blue-50 border-blue-200' },
    { key: 'completed'   as MaintenanceTask['status'], label: 'Terminees',  icon: '✅', color: 'bg-green-50 border-green-200' },
  ];

  const TaskCard = ({ task }: { task: MaintenanceTask }) => {
    const prop  = getProperty(task.propertyId);
    const over  = isOverdue(task);
    const pc    = PRIORITY_CFG[task.priority];
    const sc    = STATUS_CFG[task.status];
    const cc    = CAT_CFG[task.category];
    const days  = daysUntil(task.scheduledDate);
    const isExp = expandedTask === task.id;
    const costDiff = task.actualCost !== undefined ? task.actualCost - task.estimatedCost : null;

    return (
      <div className={`group relative rounded-3xl transition-all duration-300 border hover:-translate-y-1 ${
        isDark 
          ? 'bg-[#1e1e2d] border-white/[0.06] hover:border-indigo-500/30' 
          : 'bg-white border-gray-100 hover:border-indigo-200 shadow-xl shadow-gray-200/50'
      } ${over ? 'ring-1 ring-red-500/50' : ''}`}>
        
        <div className="flex">
          <div className={`w-1.5 flex-shrink-0 ${pc.bar} rounded-l-3xl`} />
          <div className="flex-1 p-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-xl ${
                isDark ? 'bg-white/5 text-gray-300' : `${cc.color.replace('text-', 'bg-opacity-20 text-').replace('bg-', 'bg-')}`
              } ${cc.color}`}>
                {cc.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</h3>
                  {over && (
                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border border-red-500/20">
                      En retard
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${sc.bg} ${sc.text} bg-opacity-50`}>
                    {sc.icon} {sc.label}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${pc.bg} ${pc.text} ${pc.border} bg-opacity-50`}>
                    <span className={`w-2 h-2 rounded-full ${pc.dot}`} />
                    {pc.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cc.color} bg-opacity-20`}>
                    {cc.label}
                  </span>
                </div>

                <div className={`flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {prop && <span className="flex items-center gap-1">🏠 <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>{prop.name}</strong></span>}
                  <span className={`flex items-center gap-1 ${
                    over ? 'text-red-500 font-bold' : (days !== null && days <= 3 && days >= 0) ? 'text-orange-500 font-bold' : ''
                  }`}>
                    📅 {fmt(task.scheduledDate)}
                    {days !== null && task.status !== 'completed' && task.status !== 'cancelled' && (
                      <span className="ml-1 opacity-70">({over ? `${Math.abs(days)}j retard` : days === 0 ? "auj." : `J-${days}`})</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    💶 <strong className={isDark ? 'text-gray-200' : 'text-gray-900'}>{task.estimatedCost.toLocaleString('fr-FR')}€</strong>
                    {task.actualCost !== undefined && (
                      <span className={costDiff !== null && costDiff > 0 ? 'text-red-500 ml-1 font-bold' : 'text-emerald-500 ml-1 font-bold'}>
                         → {task.actualCost.toLocaleString('fr-FR')}€
                      </span>
                    )}
                  </span>
                  {task.completedDate && <span className="text-emerald-500 font-bold">✅ {fmt(task.completedDate)}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                {task.status === 'pending' && <button onClick={() => handleStart(task)} className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-lg hover:shadow-blue-500/30" title="Démarrer"><Play className="w-4 h-4 fill-current" /></button>}
                {task.status === 'in_progress' && <button onClick={() => openComplete(task)} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30" title="Terminer"><CheckCircle className="w-4 h-4" /></button>}
                {task.status !== 'completed' && task.status !== 'cancelled' && <button onClick={() => openEdit(task)} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} title="Modifier">✏️</button>}
                {(task.status === 'completed' || task.status === 'cancelled') && <button onClick={() => openEdit(task)} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'}`} title="Voir">👁</button>}
                <button onClick={() => setExpandedTask(isExp ? null : task.id)} className={`p-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                  {isExp ? '▲' : '▼'}
                </button>
              </div>
            </div>

            {isExp && (
              <div className={`mt-4 pt-4 border-t space-y-3 animate-fadeIn ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                {task.description && (
                  <div className={`text-sm p-4 rounded-xl ${isDark ? 'bg-black/20 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    {task.description}
                  </div>
                )}
                {task.notes && (
                  <div className={`text-xs italic p-3 rounded-xl border ${
                    isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-100 text-amber-700'
                  }`}>
                    📝 {task.notes}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Créée le</p>
                    <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(task.createdAt)}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Mise à jour</p>
                    <p className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(task.updatedAt)}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                    <p className={`mb-1 ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>Estimé</p>
                    <p className={`font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{task.estimatedCost.toLocaleString('fr-FR')}€</p>
                  </div>
                  {task.actualCost !== undefined && (
                    <div className={`p-3 rounded-xl ${costDiff !== null && costDiff > 0 ? (isDark ? 'bg-red-500/10' : 'bg-red-50') : (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}`}>
                      <p className={`mb-1 ${costDiff !== null && costDiff > 0 ? 'text-red-400' : 'text-emerald-500'}`}>Réel</p>
                      <p className={`font-bold ${costDiff !== null && costDiff > 0 ? 'text-red-400' : 'text-emerald-600'}`}>
                        {task.actualCost.toLocaleString('fr-FR')}€
                        {costDiff !== null && costDiff !== 0 && <span> ({costDiff > 0 ? '+' : ''}{costDiff.toLocaleString('fr-FR')}€)</span>}
                      </p>
                    </div>
                  )}
                </div>
                {task.status !== 'completed' && task.status !== 'cancelled' && (
                  <button onClick={() => handleCancel(task)} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1">
                    ✕ Annuler cette tâche
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🔧 Maintenance
            {propertyId && getProperty(propertyId) && (
              <span className={`text-lg font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>— {getProperty(propertyId)?.name}</span>
            )}
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {scopeTasks.length} tache{scopeTasks.length !== 1 ? 's' : ''}
            {statOverdue > 0 && <span className="text-red-500 font-medium"> · {statOverdue} en retard</span>}
            {statInProgress > 0 && <span className="text-blue-500 font-medium"> · {statInProgress} en cours</span>}
          </p>
        </div>
        <button onClick={() => setShowAddTask(true)} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-5 py-2.5 rounded-xl font-medium shadow hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Nouvelle tache
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpiItems.map(s => (
          <div key={s.label} onClick={s.filter} className={`rounded-2xl shadow-sm border p-4 flex items-center gap-3 transition-all ${s.filter ? 'cursor-pointer hover:shadow-md' : ''} ${s.active ? 'ring-2 ring-blue-400 border-blue-200' : ''} ${isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-white border-gray-100'}`}>
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-base flex-shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <p className={`text-lg font-bold leading-none truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{s.value}</p>
              <p className={`text-xs mt-0.5 leading-tight ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {showFilters && (
        <div className={`rounded-2xl border shadow-sm p-4 space-y-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none ${isDark ? 'bg-white/10 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'}`} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="all">Tous statuts</option>
              <option value="pending">⏳ En attente</option>
              <option value="in_progress">🔄 En cours</option>
              <option value="completed">✅ Terminee</option>
              <option value="cancelled">✕ Annulee</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="all">Toutes priorites</option>
              <option value="urgent">🔴 Urgente</option>
              <option value="high">🟠 Haute</option>
              <option value="medium">🟡 Moyenne</option>
              <option value="low">🟢 Basse</option>
            </select>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="all">Toutes categories</option>
              <option value="cleaning">🧹 Nettoyage</option>
              <option value="repair">🔧 Reparation</option>
              <option value="inspection">🔍 Inspection</option>
              <option value="supplies">📦 Fournitures</option>
              <option value="other">⚙️ Autre</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as 'priority' | 'date' | 'cost')} className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
              <option value="priority">Tri : Priorite</option>
              <option value="date">Tri : Date</option>
              <option value="cost">Tri : Cout</option>
            </select>
            <div className={`flex border rounded-xl overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              {(['cards', 'table', 'kanban'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-2 text-xs transition-colors ${viewMode === m ? 'bg-blue-500 text-white' : isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-50'}`}>
                  {m === 'cards' ? '🃏' : m === 'table' ? '☰' : '⊞'}
                </button>
              ))}
            </div>
            {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || search) && (
              <Button
                onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all'); setSearch(''); }}
                variant="outline"
                size="sm"
                className="hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                Reset
              </Button>
            )}
          </div>
          {filteredTasks.length !== scopeTasks.length && (
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{filteredTasks.length} sur {scopeTasks.length} taches</p>
          )}
        </div>
      )}

      {urgentActive.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">{urgentActive.length} tache(s) urgente(s)</p>
            <p className="text-xs text-red-500 mt-0.5">{urgentActive.map(t => t.title).join(' · ')}</p>
          </div>
        </div>
      )}

      {viewMode === 'cards' && (
        filteredTasks.length === 0 ? (
          <div className={`rounded-2xl border shadow-sm p-16 text-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="text-5xl mb-4">🔧</div>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>Aucune tache</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>{search || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' ? 'Aucune tache ne correspond.' : 'Creez votre premiere tache.'}</p>
            <button onClick={() => setShowAddTask(true)} className="bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">+ Nouvelle tache</button>
          </div>
        ) : (
          <div className="space-y-3">{filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}</div>
        )
      )}

      {viewMode === 'table' && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#1e1e2d] border-white/10' : 'bg-white border-gray-100'}`}>
          <table className="w-full text-sm">
            <thead className={`border-b ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
              <tr>
                <th className={`text-left px-4 py-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Tache</th>
                <th className={`text-left px-4 py-3 font-semibold hidden sm:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Propriete</th>
                <th className={`text-left px-4 py-3 font-semibold hidden md:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Categorie</th>
                <th className={`text-left px-4 py-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Priorite</th>
                <th className={`text-left px-4 py-3 font-semibold hidden lg:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Echeance</th>
                <th className={`text-left px-4 py-3 font-semibold hidden lg:table-cell ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cout</th>
                <th className={`text-left px-4 py-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
              {filteredTasks.map(task => {
                const prop = getProperty(task.propertyId);
                const over = isOverdue(task);
                const pc   = PRIORITY_CFG[task.priority];
                const sc   = STATUS_CFG[task.status];
                const cc   = CAT_CFG[task.category];
                return (
                  <tr key={task.id} className={`transition-colors ${over ? (isDark ? 'bg-red-500/10' : 'bg-red-50/30') : ''} ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}{over && <span className="ml-1.5 text-red-500 text-xs">⚠</span>}</div>
                      {task.description && <p className="text-xs text-gray-400 truncate max-w-48">{task.description}</p>}
                    </td>
                    <td className={`px-4 py-3 text-xs hidden sm:table-cell ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{prop?.name ?? '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cc.color}`}>{cc.icon} {cc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${pc.bg} ${pc.text} ${pc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} /> {pc.label}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs hidden lg:table-cell ${over ? 'text-red-600 font-medium' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>{fmt(task.scheduledDate)}</td>
                    <td className={`px-4 py-3 text-xs hidden lg:table-cell ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {task.estimatedCost.toLocaleString('fr-FR')}€
                      {task.actualCost !== undefined && <span className="text-green-500 ml-1">({task.actualCost.toLocaleString('fr-FR')}€)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.icon} {sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {task.status === 'pending'     && <button onClick={() => handleStart(task)}   className="p-1.5 bg-blue-100  text-blue-600  rounded-lg hover:bg-blue-200  transition-colors text-xs" title="Demarrer">▶</button>}
                        {task.status === 'in_progress' && <button onClick={() => openComplete(task)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors text-xs" title="Terminer">✓</button>}
                        <button onClick={() => openEdit(task)} className={`p-1.5 rounded-lg transition-colors text-xs ${isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Modifier">✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTasks.length === 0 && <div className={`text-center py-12 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucune tache</div>}
        </div>
      )}

      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kanbanGroups.map(group => {
            const groupTasks = filteredTasks.filter(t => t.status === group.key);
            return (
              <div key={group.key} className={`rounded-2xl border p-4 ${isDark ? 'bg-white/5 border-white/10' : group.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{group.icon} {group.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-sm ${isDark ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600'}`}>{groupTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {groupTasks.length === 0 ? (
                    <div className={`text-center py-6 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Aucune tache</div>
                  ) : groupTasks.map(task => {
                    const over = isOverdue(task);
                    const pc   = PRIORITY_CFG[task.priority];
                    const cc   = CAT_CFG[task.category];
                    const prop = getProperty(task.propertyId);
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          className={`p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 ${over ? 'border-l-red-500' : 'border-l-blue-500'}`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${cc.color}`}>
                              <Wrench className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-semibold text-sm leading-tight flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                                {over && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                              </div>
                              <div className="flex flex-wrap gap-1 mb-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${pc.bg} ${pc.text} ${pc.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                                  {pc.label}
                                </span>
                              </div>
                              <div className={`text-xs flex justify-between items-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                <span className="flex items-center gap-1">
                                  <Home className="w-3 h-3" />
                                  {prop?.name ?? `#${task.propertyId}`}
                                </span>
                                <span className={`flex items-center gap-1 ${over ? 'text-red-500 font-medium' : ''}`}>
                                  <Calendar className="w-3 h-3" />
                                  {fmt(task.scheduledDate)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {task.status === 'pending' && (
                            <Button
                              onClick={() => handleStart(task)}
                              className="w-full mt-2"
                              size="sm"
                              icon={Play}
                            >
                              Démarrer
                            </Button>
                          )}
                          {task.status === 'in_progress' && (
                            <Button
                              onClick={() => openComplete(task)}
                              className="w-full mt-2"
                              size="sm"
                              variant="outline"
                              icon={CheckCircle}
                            >
                              Terminer
                            </Button>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddTask && (
        <div className="fixed inset-0 z-50 flex flex-col">
          {/* Overlay cliquable en haut */}
          <div className="h-16 bg-black/40 backdrop-blur-sm flex-shrink-0" onClick={() => setShowAddTask(false)} />
          {/* Panel pleine largeur */}
          <div className="flex-1 bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🔧</div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-none">Nouvelle tâche</h3>
                  <p className="text-blue-200 text-xs mt-0.5">Maintenance &amp; entretien</p>
                </div>
              </div>
              <button onClick={() => setShowAddTask(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white text-lg leading-none">×</button>
            </div>

            {/* Body scrollable — 2 colonnes sur grand écran */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">

                {/* COL GAUCHE */}
                <div className="space-y-5">

                  {/* Propriété */}
                  {!propertyId && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Propriété <span className="text-red-400">*</span></label>
                      <select value={newTask.propertyId} onChange={e => setNewTask({ ...newTask, propertyId: parseInt(e.target.value) })} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all">
                        <option value={0}>— Sélectionner —</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  {propertyId && getProperty(propertyId) && (
                    <div className="bg-blue-50 border border-[#FF385C]/10 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
                      <span>🏠</span> <strong>{getProperty(propertyId)?.name}</strong>
                    </div>
                  )}

                  {/* Titre */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Titre <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={newTask.title}
                      onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Ex : Réparer la chaudière..."
                      autoFocus
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                    <textarea
                      value={newTask.description}
                      onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                      rows={4}
                      placeholder="Détails de l'intervention..."
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
                    <textarea value={newTask.notes} onChange={e => setNewTask({ ...newTask, notes: e.target.value })} rows={3}
                      placeholder="Instructions, contact prestataire..."
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all resize-none" />
                  </div>
                </div>

                {/* COL DROITE */}
                <div className="space-y-5">

                  {/* Priorité — boutons visuels */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Priorité</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(PRIORITY_CFG) as MaintenanceTask['priority'][]).map(p => {
                        const cfg = PRIORITY_CFG[p];
                        const sel = newTask.priority === p;
                        return (
                          <button key={p} type="button" onClick={() => setNewTask({ ...newTask, priority: p })}
                            className={`py-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${sel ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Catégorie — boutons visuels */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Catégorie</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(CAT_CFG) as MaintenanceTask['category'][]).map(c => {
                        const cfg = CAT_CFG[c];
                        const sel = newTask.category === c;
                        return (
                          <button key={c} type="button" onClick={() => setNewTask({ ...newTask, category: c })}
                            className={`py-3 px-1 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${sel ? `${cfg.color} border-current shadow-sm` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className="text-xl">{cfg.icon}</span>
                            <span className="leading-tight text-center">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coût + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Coût estimé (€)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">€</span>
                        <input type="number" value={newTask.estimatedCost} min={0} step={0.01}
                          onChange={e => setNewTask({ ...newTask, estimatedCost: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Échéance <span className="text-red-400">*</span></label>
                      <input type="date" value={newTask.scheduledDate}
                        onChange={e => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                        className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
                    </div>
                  </div>

                  {/* Alerte urgente */}
                  {newTask.priority === 'urgent' && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-xs text-red-700 flex items-center gap-2 font-medium">
                      🚨 Tâche urgente — apparaîtra en tête de liste
                    </div>
                  )}

                  {/* Résumé */}
                  {newTask.title && newTask.scheduledDate && (
                    <div className="bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 border border-[#FF385C]/10 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Aperçu</p>
                      <p className="font-semibold text-blue-900">{newTask.title}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-blue-600">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${CAT_CFG[newTask.category].color}`}>{CAT_CFG[newTask.category].icon} {CAT_CFG[newTask.category].label}</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium border ${PRIORITY_CFG[newTask.priority].bg} ${PRIORITY_CFG[newTask.priority].text} ${PRIORITY_CFG[newTask.priority].border}`}>{PRIORITY_CFG[newTask.priority].label}</span>
                        {newTask.estimatedCost > 0 && <span className="px-2 py-0.5 rounded-full bg-[#FF385C]/5 text-[#FF385C] font-medium">€ {newTask.estimatedCost.toLocaleString('fr-FR')}</span>}
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">📅 {fmt(newTask.scheduledDate)}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer fixe */}
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="max-w-5xl mx-auto flex gap-3">
                <button onClick={() => { setShowAddTask(false); setNewTask({ ...defaultNew }); }} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button onClick={handleAdd} disabled={!newTask.title.trim() || !newTask.scheduledDate || !newTask.propertyId}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2">
                  <span>✓</span> Créer la tâche
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {taskToEdit && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="h-16 bg-black/40 backdrop-blur-sm flex-shrink-0" onClick={() => setTaskToEdit(null)} />
          <div className="flex-1 bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-[#FF385C] px-6 py-5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✏️</div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-none">Modifier la tâche</h3>
                  <p className="text-white/70 text-xs mt-0.5 truncate max-w-xs">{taskToEdit.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 hidden sm:flex items-center gap-2">
                  <span>🏠</span>
                  <strong>{getProperty(taskToEdit.propertyId)?.name ?? `#${taskToEdit.propertyId}`}</strong>
                  <span className="text-white/60">· Créée le {fmt(taskToEdit.createdAt)}</span>
                </div>
                <button onClick={() => setTaskToEdit(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white text-lg leading-none">×</button>
              </div>
            </div>

            {/* Body 2 colonnes */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">

                {/* COL GAUCHE */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Titre <span className="text-red-400">*</span></label>
                    <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                    <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notes</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all resize-none" />
                  </div>
                </div>

                {/* COL DROITE */}
                <div className="space-y-5">
                  {/* Statut */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Statut</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(STATUS_CFG) as MaintenanceTask['status'][]).map(key => {
                        const cfg = STATUS_CFG[key];
                        return (
                          <button key={key} onClick={() => setEditForm({ ...editForm, status: key })}
                            className={`py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${editForm.status === key ? `${cfg.bg} ${cfg.text} border-current shadow-sm` : 'border-gray-100 hover:border-gray-200 text-gray-400'}`}>
                            <span className="text-base">{cfg.icon}</span> {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priorité */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Priorité</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(PRIORITY_CFG) as MaintenanceTask['priority'][]).map(p => {
                        const cfg = PRIORITY_CFG[p];
                        const sel = editForm.priority === p;
                        return (
                          <button key={p} type="button" onClick={() => setEditForm({ ...editForm, priority: p })}
                            className={`py-3 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${sel ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Catégorie */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Catégorie</label>
                    <div className="grid grid-cols-5 gap-2">
                      {(Object.keys(CAT_CFG) as MaintenanceTask['category'][]).map(c => {
                        const cfg = CAT_CFG[c];
                        const sel = editForm.category === c;
                        return (
                          <button key={c} type="button" onClick={() => setEditForm({ ...editForm, category: c })}
                            className={`py-3 px-1 rounded-xl border-2 text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${sel ? `${cfg.color} border-current shadow-sm` : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                            <span className="text-xl">{cfg.icon}</span>
                            <span className="leading-tight text-center">{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coût + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Coût estimé (€)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 text-sm">€</span>
                        <input type="number" value={editForm.estimatedCost} min={0} step={0.01} onChange={e => setEditForm({ ...editForm, estimatedCost: parseFloat(e.target.value) || 0 })} className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Échéance</label>
                      <input type="date" value={editForm.scheduledDate} onChange={e => setEditForm({ ...editForm, scheduledDate: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#FF385C] focus:bg-white transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="max-w-5xl mx-auto flex justify-between items-center">
                <button onClick={() => handleCancel(taskToEdit)} disabled={taskToEdit.status === 'completed' || taskToEdit.status === 'cancelled'}
                  className="text-sm text-red-400 hover:text-red-600 transition-colors disabled:opacity-30 flex items-center gap-1.5">
                  ✕ Annuler la tâche
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setTaskToEdit(null)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Fermer</button>
                  <button onClick={handleSaveEdit} disabled={!editForm.title.trim()}
                    className="px-6 py-3 bg-[#FF385C] text-white rounded-xl text-sm font-bold hover:bg-[#E31C5F] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md flex items-center gap-2">
                    💾 Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && completingTask && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)} />
          <div className="bg-white shadow-2xl flex flex-col overflow-hidden flex-shrink-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">✅</div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-none">Terminer la tâche</h3>
                  <p className="text-green-100 text-xs mt-0.5">Saisir le coût réel de l&apos;intervention</p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white text-lg leading-none">×</button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 items-start">

                {/* Infos tâche */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tâche à terminer</p>
                    <p className="text-lg font-bold text-gray-900">{completingTask.title}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-gray-600 font-medium">🏠 {getProperty(completingTask.propertyId)?.name}</span>
                      <span className={`px-2.5 py-1 rounded-lg font-medium border ${PRIORITY_CFG[completingTask.priority].bg} ${PRIORITY_CFG[completingTask.priority].text} ${PRIORITY_CFG[completingTask.priority].border}`}>
                        {PRIORITY_CFG[completingTask.priority].label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg font-medium ${CAT_CFG[completingTask.category].color}`}>
                        {CAT_CFG[completingTask.category].icon} {CAT_CFG[completingTask.category].label}
                      </span>
                    </div>
                    {completingTask.description && (
                      <p className="text-sm text-gray-500 leading-relaxed">{completingTask.description}</p>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-[#FF385C]/10 rounded-xl px-4 py-3 text-sm text-blue-700">
                    <span className="font-semibold">Coût estimé initial :</span> {completingTask.estimatedCost.toLocaleString('fr-FR')} €
                  </div>
                </div>

                {/* Saisie coût réel */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Coût réel (€)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-gray-400 text-lg font-bold">€</span>
                      <input
                        type="number"
                        value={actualCostInput}
                        onChange={e => setActualCostInput(e.target.value)}
                        min={0}
                        step={0.01}
                        autoFocus
                        className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-100 rounded-xl text-xl font-bold bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Delta coût */}
                  {actualCostInput && parseFloat(actualCostInput) !== completingTask.estimatedCost && (
                    <div className={`rounded-xl p-4 border-2 ${parseFloat(actualCostInput) > completingTask.estimatedCost ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className={`text-sm font-bold ${parseFloat(actualCostInput) > completingTask.estimatedCost ? 'text-red-700' : 'text-green-700'}`}>
                        {parseFloat(actualCostInput) > completingTask.estimatedCost
                          ? `⬆ Dépassement de ${(parseFloat(actualCostInput) - completingTask.estimatedCost).toLocaleString('fr-FR')} €`
                          : `⬇ Économie de ${(completingTask.estimatedCost - parseFloat(actualCostInput)).toLocaleString('fr-FR')} €`}
                      </p>
                      <p className={`text-xs mt-0.5 ${parseFloat(actualCostInput) > completingTask.estimatedCost ? 'text-red-500' : 'text-green-500'}`}>
                        par rapport à l&apos;estimation initiale de {completingTask.estimatedCost.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                  )}

                  {actualCostInput && parseFloat(actualCostInput) === completingTask.estimatedCost && (
                    <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
                      <p className="text-sm font-bold text-blue-700">✓ Coût conforme à l&apos;estimation</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 border-t border-gray-100 bg-white flex-shrink-0">
              <div className="max-w-5xl mx-auto flex gap-3">
                <button onClick={() => setShowCompleteModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">Annuler</button>
                <button onClick={handleComplete}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md flex items-center justify-center gap-2">
                  ✓ Confirmer la clôture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

