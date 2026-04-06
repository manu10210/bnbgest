'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, Plus, Search, Key, KeyRound, Wifi,
  Lock, Shield, Car, Grid3X3, Tag, Copy, Check,
  Trash2, Edit2, X, Eye, EyeOff, RefreshCw,
  Calendar, Home, ChevronDown, Mail, Power, PowerOff,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

const CODE_TYPES = [
  { value: 'DOOR_CODE',  label: 'Digicode porte',      icon: <Grid3X3 size={14} />,  color: 'bg-blue-500/15 text-blue-400' },
  { value: 'KEY_BOX',    label: 'Boîte à clés',         icon: <Key size={14} />,       color: 'bg-amber-500/15 text-amber-400' },
  { value: 'SMART_LOCK', label: 'Serrure connectée',    icon: <Lock size={14} />,      color: 'bg-purple-500/15 text-purple-400' },
  { value: 'WIFI',       label: 'Code WiFi',             icon: <Wifi size={14} />,      color: 'bg-green-500/15 text-green-400' },
  { value: 'PARKING',    label: 'Accès parking',         icon: <Car size={14} />,       color: 'bg-orange-500/15 text-orange-400' },
  { value: 'GATE',       label: 'Portail / Grille',      icon: <Shield size={14} />,    color: 'bg-teal-500/15 text-teal-400' },
  { value: 'OTHER',      label: 'Autre',                 icon: <Tag size={14} />,       color: 'bg-gray-500/15 text-gray-400' },
];
const typeMap = Object.fromEntries(CODE_TYPES.map(t => [t.value, t]));

interface Property { id: number; name: string; city?: string }
interface AccessCode {
  id: number;
  propertyId: number;
  bookingId?: number | null;
  label: string;
  code: string;
  type: string;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  sentByEmail: boolean;
  sentAt?: string | null;
  notes?: string | null;
  property?: { id: number; name: string } | null;
}

const EMPTY_FORM = {
  propertyId: '', bookingId: '', label: '',
  code: '', type: 'DOOR_CODE',
  validFrom: '', validUntil: '',
  isActive: true, notes: '',
};

export default function AccessCodesPage() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [codes, setCodes]           = useState<AccessCode[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterProp, setFilterProp] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Set<number>>(new Set());
  const [copied, setCopied]         = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState<number | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  const bg   = isDark ? 'bg-gray-950'                : 'bg-gray-50';
  const card = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white'                 : 'text-gray-900';
  const muted = isDark ? 'text-gray-400'             : 'text-gray-500';
  const inp  = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF385C]/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C]/50';

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (filterProp !== 'all') params.set('propertyId', filterProp);
      if (filterActive === 'active')   params.set('isActive', 'true');
      if (filterActive === 'inactive') params.set('isActive', 'false');

      const res = await fetch(`/api/access-codes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
      }
    } catch {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [filterProp, filterActive]);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  useEffect(() => {
    fetch('/api/properties?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProperties(d.properties || d || []); });
  }, []);

  useEffect(() => {
    if (showModal) setTimeout(() => firstRef.current?.focus(), 100);
  }, [showModal]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (c: AccessCode) => {
    setEditingId(c.id);
    setForm({
      propertyId: String(c.propertyId),
      bookingId:  c.bookingId ? String(c.bookingId) : '',
      label:      c.label,
      code:       c.code,
      type:       c.type,
      validFrom:  c.validFrom ? c.validFrom.split('T')[0] : '',
      validUntil: c.validUntil ? c.validUntil.split('T')[0] : '',
      isActive:   c.isActive,
      notes:      c.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.propertyId) { toast.error('Sélectionnez une propriété'); return; }
    if (!form.label.trim()) { toast.error('Le libellé est obligatoire'); return; }
    if (!form.code.trim())  { toast.error('Le code est obligatoire'); return; }

    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url    = editingId ? `/api/access-codes/${editingId}` : '/api/access-codes';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success(editingId ? 'Code mis à jour ✅' : 'Code ajouté ✅');
        setShowModal(false);
        fetchCodes();
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/access-codes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Code supprimé');
        setDeleteId(null);
        fetchCodes();
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const toggleActive = async (c: AccessCode) => {
    try {
      const res = await fetch(`/api/access-codes/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (res.ok) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x));
        toast.success(c.isActive ? 'Code désactivé' : 'Code activé');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    toast.success('Code copié !');
    setTimeout(() => setCopied(null), 2000);
  };

  const sendEmail = async (c: AccessCode) => {
    setSendingEmail(c.id);
    try {
      const res = await fetch(`/api/access-codes/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentByEmail: true, sentAt: new Date().toISOString() }),
      });
      if (res.ok) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, sentByEmail: true, sentAt: new Date().toISOString() } : x));
        toast.success('Marqué comme envoyé par email');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setSendingEmail(null);
    }
  };

  const toggleVisible = (id: number) => {
    setVisibleCodes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generateCode = () => {
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    setForm(f => ({ ...f, code: digits }));
  };

  // Check expiry
  const isExpired = (c: AccessCode) =>
    c.validUntil ? new Date(c.validUntil) < new Date() : false;

  const filtered = codes.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !search || c.label.toLowerCase().includes(q) || c.code.includes(q) || c.property?.name.toLowerCase().includes(q);
    const matchT = filterType === 'all' || c.type === filterType;
    return matchQ && matchT;
  });

  const activeCount   = codes.filter(c => c.isActive && !isExpired(c)).length;
  const expiredCount  = codes.filter(c => isExpired(c)).length;
  const wifiCount     = codes.filter(c => c.type === 'WIFI').length;

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
              <KeyRound size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>Codes d'accès</h1>
              <p className={`text-xs ${muted}`}>{activeCount} actif{activeCount !== 1 ? 's' : ''} · {codes.length} total</p>
            </div>
          </div>
          <ThemeToggle />
          <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow">
            <Plus size={16} />Ajouter
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <KeyRound size={16} />, label: 'Codes actifs',  value: activeCount,  color: 'text-green-400',  bg: 'bg-green-500/10' },
            { icon: <Wifi size={16} />,     label: 'Codes WiFi',    value: wifiCount,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
            { icon: <AlertCircle size={16} />, label: 'Expirés',    value: expiredCount, color: 'text-red-400',    bg: 'bg-red-500/10' },
          ].map((s, i) => (
            <div key={i} className={`${card} border rounded-2xl p-4`}>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center ${s.color} mb-2`}>{s.icon}</div>
              <p className={`text-2xl font-bold ${text}`}>{s.value}</p>
              <p className={`text-xs ${muted}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} flex-1 min-w-[160px]`}>
            <Search size={14} className={muted} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher code, propriété..." className={`flex-1 bg-transparent text-sm outline-none ${text}`} />
            {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
          </div>
          <select value={filterProp} onChange={e => setFilterProp(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Toutes propriétés</option>
            {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Tous types</option>
            {CODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <button onClick={fetchCodes} className={`p-2.5 rounded-xl border ${card} ${muted} hover:text-[#FF385C] transition`}>
            <RefreshCw size={15} />
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${card} border rounded-2xl p-12 text-center`}>
            <KeyRound size={40} className="mx-auto mb-3 text-gray-400" />
            <p className={`font-semibold ${text}`}>Aucun code trouvé</p>
            <p className={`text-sm ${muted} mt-1 mb-4`}>Ajoutez vos codes d'accès pour les gérer ici.</p>
            <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition">
              <Plus size={16} />Ajouter un code
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => {
              const t       = typeMap[c.type];
              const expired = isExpired(c);
              const visible = visibleCodes.has(c.id);
              const masked  = visible ? c.code : '•'.repeat(Math.min(c.code.length, 6));

              return (
                <div key={c.id} className={`${card} border rounded-2xl px-4 py-3.5 ${expired ? 'border-red-500/20' : !c.isActive ? 'opacity-60' : ''} group`}>
                  <div className="flex items-center gap-3">
                    {/* Type icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t?.color || 'bg-gray-500/15 text-gray-400'}`}>
                      {t?.icon || <Key size={16} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${text}`}>{c.label}</span>
                        {expired && <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[10px] font-medium">Expiré</span>}
                        {!c.isActive && !expired && <span className="px-1.5 py-0.5 rounded-md bg-gray-500/15 text-gray-400 text-[10px] font-medium">Inactif</span>}
                        {c.sentByEmail && <span className="px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-400 text-[10px] font-medium flex items-center gap-1"><Mail size={9} />Envoyé</span>}
                      </div>
                      <div className={`flex items-center gap-3 mt-0.5 text-xs ${muted} flex-wrap`}>
                        {c.property && <span className="flex items-center gap-1"><Home size={11} />{c.property.name}</span>}
                        <span className={t?.color?.split(' ')[1] || ''}>{t?.label}</span>
                        {c.validFrom && <span className="flex items-center gap-1"><Calendar size={11} />Du {new Date(c.validFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
                        {c.validUntil && <span className={expired ? 'text-red-400' : ''}>au {new Date(c.validUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>

                    {/* Code display */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-bold text-sm ${isDark ? 'bg-white/8 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {masked}
                        <button onClick={() => toggleVisible(c.id)} className="text-gray-400 hover:text-gray-300 transition">
                          {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <button onClick={() => copyCode(c.id, c.code)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                        {copied === c.id ? <Check size={15} className="text-green-400" /> : <Copy size={15} className={muted} />}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                      <button onClick={() => sendEmail(c)} disabled={sendingEmail === c.id} title="Marquer envoyé" className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                        {sendingEmail === c.id ? <RefreshCw size={14} className="animate-spin text-gray-400" /> : <Mail size={14} className={c.sentByEmail ? 'text-green-400' : muted} />}
                      </button>
                      <button onClick={() => toggleActive(c)} title={c.isActive ? 'Désactiver' : 'Activer'} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                        {c.isActive ? <Power size={14} className="text-green-400" /> : <PowerOff size={14} className="text-gray-400" />}
                      </button>
                      <button onClick={() => openEdit(c)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                        <Edit2 size={14} className={muted} />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 transition">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                  {c.notes && <p className={`mt-2 text-xs ${muted} pl-13`}>{c.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className={`relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'} overflow-y-auto max-h-[90vh]`}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
              <h2 className={`font-bold text-lg ${text}`}>{editingId ? 'Modifier le code' : 'Nouveau code d\'accès'}</h2>
              <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                <X size={18} className={muted} />
              </button>
            </div>
            <div className="px-5 pb-6 pt-4 space-y-4">
              {/* Property */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Propriété *</label>
                <div className="relative">
                  <select value={form.propertyId} onChange={e => setForm(f => ({ ...f, propertyId: e.target.value }))}
                    className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                    <option value="">Sélectionner...</option>
                    {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                </div>
              </div>
              {/* Label + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Libellé *</label>
                  <input ref={firstRef} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Ex: Porte principale" className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Type *</label>
                  <div className="relative">
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                      {CODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                  </div>
                </div>
              </div>
              {/* Code */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Code *</label>
                <div className="flex gap-2">
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    placeholder="Ex: 4821 ou MonWiFi2026!" className={`flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono ${inp}`} />
                  <button type="button" onClick={generateCode} className={`px-3 py-2.5 rounded-xl text-xs font-medium border ${card} ${muted} hover:text-[#FF385C] transition`}>
                    Générer
                  </button>
                </div>
              </div>
              {/* Valid from / until */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Valide du</label>
                  <input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Valide jusqu'au</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
              </div>
              {/* Active toggle */}
              <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition ${
                  form.isActive
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : isDark ? 'border-white/10 bg-white/5 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                }`}>
                {form.isActive ? <Power size={14} /> : <PowerOff size={14} />}
                {form.isActive ? 'Code actif' : 'Code inactif'}
                {form.isActive && <Check size={13} className="ml-auto" />}
              </button>
              {/* Notes */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Instructions d'accès..." rows={2}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`} />
              </div>
              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                  {editingId ? 'Enregistrer' : 'Ajouter le code'}
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

      {/* ── Confirm Delete ─────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <div>
                <p className={`font-bold ${text}`}>Supprimer ce code ?</p>
                <p className={`text-sm ${muted}`}>Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition">Supprimer</button>
              <button onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
