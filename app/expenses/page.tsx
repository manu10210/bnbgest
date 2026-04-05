'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, Plus, Search, Filter, Euro, TrendingDown, TrendingUp,
  Calendar, Home, Tag, Trash2, Edit2, X, Check, ChevronDown,
  ReceiptText, Repeat, CreditCard, Building2, Wrench, Zap,
  ShieldCheck, Landmark, Sofa, Package, Megaphone, Settings,
  HardHat, RefreshCw, AlertCircle, Download
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'CLEANING',     label: 'Ménage',        icon: <Home size={14} />,         color: 'bg-blue-500/15 text-blue-400' },
  { value: 'MAINTENANCE',  label: 'Maintenance',   icon: <Wrench size={14} />,       color: 'bg-orange-500/15 text-orange-400' },
  { value: 'UTILITIES',    label: 'Charges',       icon: <Zap size={14} />,          color: 'bg-yellow-500/15 text-yellow-400' },
  { value: 'INSURANCE',    label: 'Assurance',     icon: <ShieldCheck size={14} />,  color: 'bg-teal-500/15 text-teal-400' },
  { value: 'TAX',          label: 'Taxes',         icon: <Landmark size={14} />,     color: 'bg-red-500/15 text-red-400' },
  { value: 'MORTGAGE',     label: 'Crédit immo',   icon: <Building2 size={14} />,    color: 'bg-purple-500/15 text-purple-400' },
  { value: 'FURNITURE',    label: 'Mobilier',      icon: <Sofa size={14} />,         color: 'bg-pink-500/15 text-pink-400' },
  { value: 'SUPPLIES',     label: 'Fournitures',   icon: <Package size={14} />,      color: 'bg-indigo-500/15 text-indigo-400' },
  { value: 'MARKETING',    label: 'Marketing',     icon: <Megaphone size={14} />,    color: 'bg-rose-500/15 text-rose-400' },
  { value: 'MANAGEMENT',   label: 'Gestion',       icon: <Settings size={14} />,     color: 'bg-slate-500/15 text-slate-400' },
  { value: 'RENOVATION',   label: 'Travaux',       icon: <HardHat size={14} />,      color: 'bg-amber-500/15 text-amber-400' },
  { value: 'SUBSCRIPTION', label: 'Abonnements',   icon: <RefreshCw size={14} />,    color: 'bg-cyan-500/15 text-cyan-400' },
  { value: 'OTHER',        label: 'Autres',        icon: <Tag size={14} />,          color: 'bg-gray-500/15 text-gray-400' },
];

const PAYMENT_METHODS = ['Carte bancaire', 'Espèces', 'Virement', 'Chèque', 'Prélèvement', 'PayPal', 'Autre'];

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

const eurFmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);

interface Property { id: number; name: string }
interface Expense {
  id: number;
  title: string;
  description?: string | null;
  amount: number;
  currency: string;
  category: string;
  date: string;
  propertyId?: number | null;
  property?: Property | null;
  vendor?: string | null;
  receiptUrl?: string | null;
  paymentMethod?: string | null;
  isRecurring: boolean;
  recurrence?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

const EMPTY_FORM = {
  title: '', description: '', amount: '', currency: 'EUR',
  category: 'OTHER', date: new Date().toISOString().split('T')[0],
  propertyId: '', vendor: '', paymentMethod: '', isRecurring: false,
  recurrence: '', notes: '',
};

export default function ExpensesPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [properties, setProperties]   = useState<Property[]>([]);
  const [loading, setLoading]         = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [byCategory, setByCategory]   = useState<Record<string, number>>({});

  // Filters
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('all');
  const [filterProp, setFilterProp] = useState('all');
  const [year, setYear]             = useState(new Date().getFullYear().toString());
  const [month, setMonth]           = useState('');

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);

  const firstInputRef = useRef<HTMLInputElement>(null);

  // Styles
  const bg   = isDark ? 'bg-gray-950'               : 'bg-gray-50';
  const card = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white'                 : 'text-gray-900';
  const muted = isDark ? 'text-gray-400'             : 'text-gray-500';
  const inp  = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF385C]/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C]/50';

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (year)       params.set('year',       year);
      if (month)      params.set('month',      month);
      if (filterCat !== 'all') params.set('category', filterCat);
      if (filterProp !== 'all') params.set('propertyId', filterProp);

      const res = await fetch(`/api/expenses?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setTotalAmount(data.totalAmount || 0);
        setByCategory(data.byCategory || {});
      }
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [year, month, filterCat, filterProp]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  useEffect(() => {
    fetch('/api/properties?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProperties(d.properties || d || []); });
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [showModal]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditingId(e.id);
    setForm({
      title:         e.title,
      description:   e.description || '',
      amount:        String(e.amount),
      currency:      e.currency,
      category:      e.category,
      date:          e.date.split('T')[0],
      propertyId:    e.propertyId ? String(e.propertyId) : '',
      vendor:        e.vendor || '',
      paymentMethod: e.paymentMethod || '',
      isRecurring:   e.isRecurring,
      recurrence:    e.recurrence || '',
      notes:         e.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Le titre est obligatoire'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error('Montant invalide'); return; }
    if (!form.date) { toast.error('La date est obligatoire'); return; }

    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url    = editingId ? `/api/expenses/${editingId}` : '/api/expenses';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editingId ? 'Dépense mise à jour' : 'Dépense ajoutée ✅');
        setShowModal(false);
        fetchExpenses();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dépense supprimée');
        setDeleteId(null);
        setExpenses(prev => prev.filter(e => e.id !== id));
        fetchExpenses();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  // Export CSV
  const exportCSV = () => {
    const header = 'Date,Titre,Catégorie,Montant,Propriété,Fournisseur,Moyen de paiement\n';
    const rows = filtered.map(e =>
      [
        e.date.split('T')[0],
        `"${e.title}"`,
        catMap[e.category]?.label || e.category,
        e.amount,
        `"${e.property?.name || ''}"`,
        `"${e.vendor || ''}"`,
        `"${e.paymentMethod || ''}"`,
      ].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `depenses_${year}${month ? '_' + month.padStart(2,'0') : ''}.csv`;
    link.click();
  };

  // Client-side search filter
  const filtered = expenses.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.vendor?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.property?.name.toLowerCase().includes(q)
    );
  });

  // Top 3 categories for bar chart
  const topCats = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxCat = topCats[0]?.[1] || 1;

  const months = [
    { v: '', l: 'Toute l\'année' },
    { v: '1', l: 'Janvier' }, { v: '2', l: 'Février' }, { v: '3', l: 'Mars' },
    { v: '4', l: 'Avril' },   { v: '5', l: 'Mai' },     { v: '6', l: 'Juin' },
    { v: '7', l: 'Juillet' }, { v: '8', l: 'Août' },    { v: '9', l: 'Septembre' },
    { v: '10', l: 'Octobre' },{ v: '11', l: 'Novembre' },{ v: '12', l: 'Décembre' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <ArrowLeft size={20} className={muted} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
              <TrendingDown size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>Suivi des dépenses</h1>
              <p className={`text-xs ${muted}`}>{filtered.length} dépense{filtered.length !== 1 ? 's' : ''} · {eurFmt(totalAmount)}</p>
            </div>
          </div>
          <ThemeToggle />
          <button onClick={exportCSV} className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}>
            <Download size={13} />Export CSV
          </button>
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow">
            <Plus size={16} />Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`col-span-2 ${card} border rounded-2xl p-5`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${muted} mb-1`}>Total dépenses</p>
            <p className={`text-3xl font-bold ${text}`}>{eurFmt(totalAmount)}</p>
            <p className={`text-xs ${muted} mt-1`}>
              {year}{month ? ` · ${months.find(m => m.v === month)?.l}` : ''}
            </p>
          </div>
          {topCats.slice(0, 2).map(([cat, amt]) => (
            <div key={cat} className={`${card} border rounded-2xl p-4`}>
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium mb-2 ${catMap[cat]?.color || 'bg-gray-500/15 text-gray-400'}`}>
                {catMap[cat]?.icon}
                {catMap[cat]?.label || cat}
              </div>
              <p className={`text-xl font-bold ${text}`}>{eurFmt(amt)}</p>
              <p className={`text-xs ${muted}`}>{totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0}% du total</p>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {topCats.length > 0 && (
          <div className={`${card} border rounded-2xl p-5`}>
            <h2 className={`font-semibold ${text} mb-4 flex items-center gap-2`}>
              <Tag size={16} className="text-[#FF385C]" />Répartition par catégorie
            </h2>
            <div className="space-y-3">
              {topCats.map(([cat, amt]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${catMap[cat]?.color?.split(' ')[1] || 'text-gray-400'}`}>
                      {catMap[cat]?.icon}{catMap[cat]?.label || cat}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs ${muted}`}>{totalAmount > 0 ? Math.round((amt / totalAmount) * 100) : 0}%</span>
                      <span className={`text-sm font-bold ${text}`}>{eurFmt(amt)}</span>
                    </div>
                  </div>
                  <div className={`h-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#FF385C] to-[#E31C5F] transition-all duration-500"
                      style={{ width: `${(amt / maxCat) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} flex-1 min-w-[180px]`}>
            <Search size={14} className={muted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className={`flex-1 bg-transparent text-sm outline-none ${text}`} />
            {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
          </div>
          {/* Year */}
          <select value={year} onChange={e => setYear(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {/* Month */}
          <select value={month} onChange={e => setMonth(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          {/* Category */}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {/* Property */}
          {properties.length > 0 && (
            <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
              <option value="all">Toutes propriétés</option>
              {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          )}
        </div>

        {/* Expense list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${card} border rounded-2xl p-12 text-center`}>
            <ReceiptText size={40} className="mx-auto mb-3 text-gray-400" />
            <p className={`font-semibold ${text}`}>Aucune dépense trouvée</p>
            <p className={`text-sm ${muted} mt-1 mb-4`}>Ajoutez votre première dépense pour commencer le suivi.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition">
              <Plus size={16} />Ajouter une dépense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => {
              const cat = catMap[e.category];
              const d = new Date(e.date);
              return (
                <div key={e.id} className={`${card} border rounded-2xl px-4 py-3.5 flex items-center gap-3 group`}>
                  {/* Category icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.color || 'bg-gray-500/15 text-gray-400'}`}>
                    {cat?.icon || <Tag size={16} />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${text} truncate`}>{e.title}</span>
                      {e.isRecurring && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 text-[10px] font-medium">
                          <Repeat size={10} />Récurrent
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center gap-3 mt-0.5 flex-wrap text-xs ${muted}`}>
                      <span className="flex items-center gap-1"><Calendar size={11} />{d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {e.property && <span className="flex items-center gap-1"><Home size={11} />{e.property.name}</span>}
                      {e.vendor && <span>{e.vendor}</span>}
                      {e.paymentMethod && <span className="flex items-center gap-1"><CreditCard size={11} />{e.paymentMethod}</span>}
                    </div>
                  </div>
                  {/* Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-base ${text}`}>{eurFmt(e.amount)}</p>
                    <p className={`text-xs ${cat?.color?.split(' ')[1] || muted} font-medium`}>{cat?.label}</p>
                  </div>
                  {/* Actions (visible on hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                    <button onClick={() => openEdit(e)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                      <Edit2 size={14} className={muted} />
                    </button>
                    <button onClick={() => setDeleteId(e.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 transition">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className={`relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'} overflow-y-auto max-h-[90vh]`}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
              <h2 className={`font-bold text-lg ${text}`}>{editingId ? 'Modifier la dépense' : 'Nouvelle dépense'}</h2>
              <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                <X size={18} className={muted} />
              </button>
            </div>

            <div className="px-5 pb-6 pt-4 space-y-4">
              {/* Title + Amount */}
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-3">
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Titre *</label>
                  <input ref={firstInputRef} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Ex : Ménage Villa Azur" className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
                <div className="col-span-2">
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Montant (€) *</label>
                  <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
              </div>

              {/* Category + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Catégorie *</label>
                  <div className="relative">
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
              </div>

              {/* Property + Vendor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Propriété</label>
                  <div className="relative">
                    <select value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
                      className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                      <option value="">Aucune</option>
                      {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Fournisseur</label>
                  <input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                    placeholder="Ex : EDF, Artisan..." className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
              </div>

              {/* Payment method + Recurring */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Moyen de paiement</label>
                  <div className="relative">
                    <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                      className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                      <option value="">Non précisé</option>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Récurrence</label>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isRecurring: !f.isRecurring }))}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition ${
                      form.isRecurring
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                        : isDark ? 'border-white/10 bg-white/5 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                  >
                    <Repeat size={14} />
                    {form.isRecurring ? 'Récurrent' : 'Ponctuel'}
                    {form.isRecurring && <Check size={13} className="ml-auto" />}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Description / Notes</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Détails supplémentaires..." rows={2}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`} />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Check size={16} />}
                  {editingId ? 'Enregistrer' : 'Ajouter la dépense'}
                </button>
                <button onClick={() => setShowModal(false)}
                  className={`px-5 py-3 rounded-xl text-sm font-medium ${isDark ? 'bg-white/8 hover:bg-white/12 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} transition`}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ───────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className={`font-bold ${text}`}>Supprimer la dépense ?</p>
                <p className={`text-sm ${muted}`}>Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition">
                Supprimer
              </button>
              <button onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
