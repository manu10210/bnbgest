'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from '@/components/AdminSidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Plus, Search, Key, KeyRound, Wifi, Lock, Shield, Car,
  Copy, Check, Trash2, Edit2, X, Eye, EyeOff, RefreshCw,
  Calendar, Home, ChevronDown, Mail, Power, PowerOff, AlertCircle,
  Clock, Zap, Tag,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const CODE_TYPES = [
  { value: 'DOOR_CODE',   label: 'Code porte',    icon: <Lock size={16} />,    bg: 'bg-blue-500/15',   text: 'text-blue-400',    border: 'border-blue-500/30' },
  { value: 'KEY_BOX',     label: 'Boite à clés',  icon: <Key size={16} />,     bg: 'bg-amber-500/15',  text: 'text-amber-400',   border: 'border-amber-500/30' },
  { value: 'SMART_LOCK',  label: 'Serrure smart', icon: <Shield size={16} />,  bg: 'bg-purple-500/15', text: 'text-purple-400',  border: 'border-purple-500/30' },
  { value: 'WIFI',        label: 'WiFi',           icon: <Wifi size={16} />,    bg: 'bg-green-500/15',  text: 'text-green-400',   border: 'border-green-500/30' },
  { value: 'PARKING',     label: 'Parking',        icon: <Car size={16} />,     bg: 'bg-orange-500/15', text: 'text-orange-400',  border: 'border-orange-500/30' },
  { value: 'GATE',        label: 'Portail',        icon: <Zap size={16} />,     bg: 'bg-teal-500/15',   text: 'text-teal-400',    border: 'border-teal-500/30' },
  { value: 'OTHER',       label: 'Autre',          icon: <Tag size={16} />,     bg: 'bg-gray-500/15',   text: 'text-gray-400',    border: 'border-gray-500/30' },
];
const typeMap = Object.fromEntries(CODE_TYPES.map(t => [t.value, t]));

interface AccessCode {
  id: number;
  propertyId: number;
  bookingId?: number;
  label: string;
  code: string;
  type: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
  sentByEmail: boolean;
  sentAt?: string;
  notes?: string;
  property?: { id: number; name: string };
}

const EMPTY_FORM = {
  propertyId: '', bookingId: '', label: '', code: '',
  type: 'DOOR_CODE', validFrom: '', validUntil: '', isActive: true, notes: '',
};

export default function AccessCodesPage() {
  const router   = useRouter();
  const { isDark } = useTheme();
  const firstRef = useRef<HTMLInputElement>(null);

  const [codes,        setCodes]        = useState<AccessCode[]>([]);
  const [properties,   setProperties]   = useState<{id:number;name:string}[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterProp,   setFilterProp]   = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [groupByProp,  setGroupByProp]  = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [editingId,    setEditingId]    = useState<number|null>(null);
  const [form,         setForm]         = useState({ ...EMPTY_FORM });
  const [saving,       setSaving]       = useState(false);
  const [deleteId,     setDeleteId]     = useState<number|null>(null);
  const [visibleCodes, setVisibleCodes] = useState<Set<number>>(new Set());
  const [copied,       setCopied]       = useState<number|null>(null);
  const [sendingEmail, setSendingEmail] = useState<number|null>(null);

  const bg   = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const card = isDark ? 'bg-gray-900 border-white/8' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const inp  = isDark ? 'bg-white/6 border border-white/10 text-white placeholder:text-gray-500' : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400';

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '500' });
      if (filterProp !== 'all') params.set('propertyId', filterProp);
      if (filterActive === 'active')   params.set('isActive', 'true');
      if (filterActive === 'inactive') params.set('isActive', 'false');
      const res = await fetch(`/api/access-codes?${params}`);
      if (res.ok) { const data = await res.json(); setCodes(data.codes || []); }
    } catch { toast.error('Erreur de chargement'); }
    finally  { setLoading(false); }
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

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowModal(true); };
  const openEdit = (c: AccessCode) => {
    setEditingId(c.id);
    setForm({
      propertyId: String(c.propertyId), bookingId: c.bookingId ? String(c.bookingId) : '',
      label: c.label, code: c.code, type: c.type,
      validFrom: c.validFrom ? c.validFrom.split('T')[0] : '',
      validUntil: c.validUntil ? c.validUntil.split('T')[0] : '',
      isActive: c.isActive, notes: c.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.propertyId)     { toast.error('Sélectionnez une propriété'); return; }
    if (!form.label.trim())   { toast.error('Le libellé est obligatoire'); return; }
    if (!form.code.trim())    { toast.error('Le code est obligatoire'); return; }
    setSaving(true);
    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url    = editingId ? `/api/access-codes/${editingId}` : '/api/access-codes';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success(editingId ? 'Code mis à jour ✅' : 'Code ajouté ✅');
        setShowModal(false); fetchCodes();
      } else { const d = await res.json(); toast.error(d.error || 'Erreur'); }
    } catch { toast.error('Erreur réseau'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/access-codes/${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Code supprimé'); setDeleteId(null); fetchCodes(); }
    } catch { toast.error('Erreur réseau'); }
  };

  const toggleActive = async (c: AccessCode) => {
    try {
      const res = await fetch(`/api/access-codes/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      if (res.ok) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, isActive: !c.isActive } : x));
        toast.success(c.isActive ? 'Code désactivé' : 'Code activé ✅');
      }
    } catch { toast.error('Erreur réseau'); }
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id); toast.success('Code copié !');
    setTimeout(() => setCopied(null), 2000);
  };

  const sendEmail = async (c: AccessCode) => {
    setSendingEmail(c.id);
    try {
      const res = await fetch(`/api/access-codes/${c.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentByEmail: true, sentAt: new Date().toISOString() }),
      });
      if (res.ok) {
        setCodes(prev => prev.map(x => x.id === c.id ? { ...x, sentByEmail: true, sentAt: new Date().toISOString() } : x));
        toast.success('Marqué comme envoyé par email ✅');
      }
    } catch { toast.error('Erreur'); }
    finally { setSendingEmail(null); }
  };

  const toggleVisible = (id: number) => {
    setVisibleCodes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const generateCode = () => {
    const digits = Math.floor(1000 + Math.random() * 9000).toString();
    setForm(f => ({ ...f, code: digits }));
  };

  const isExpired = (c: AccessCode) => c.validUntil ? new Date(c.validUntil) < new Date() : false;

  const daysUntilExpiry = (c: AccessCode): number | null => {
    if (!c.validUntil) return null;
    const diff = new Date(c.validUntil).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  const filtered = codes.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !search || c.label.toLowerCase().includes(q) || c.code.includes(q) || c.property?.name.toLowerCase().includes(q);
    const matchT = filterType === 'all' || c.type === filterType;
    return matchQ && matchT;
  });

  const activeCount  = codes.filter(c => c.isActive && !isExpired(c)).length;
  const expiredCount = codes.filter(c => isExpired(c)).length;
  const wifiCount    = codes.filter(c => c.type === 'WIFI').length;
  const soonCount    = codes.filter(c => { const d = daysUntilExpiry(c); return d !== null && d > 0 && d <= 3; }).length;

  // Group by property
  const grouped: Record<string, AccessCode[]> = {};
  if (groupByProp) {
    filtered.forEach(c => {
      const key = c.property?.name || 'Sans propriété';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
  }

  const CodeCard = ({ c }: { c: AccessCode }) => {
    const t       = typeMap[c.type];
    const expired = isExpired(c);
    const days    = daysUntilExpiry(c);
    const visible = visibleCodes.has(c.id);
    const masked  = visible ? c.code : '•'.repeat(Math.min(c.code.length, 6));

    return (
      <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className={`${card} border rounded-2xl overflow-hidden ${expired ? 'border-red-500/25' : !c.isActive ? 'opacity-55' : ''}`}>
        {/* Color accent bar */}
        <div className={`h-1 ${t?.bg?.replace('/15','').replace('bg-','bg-').replace('-500','-400') || 'bg-gray-400'}`} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${t?.bg} ${t?.text}`}>
              {t?.icon || <Key size={18} />}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={`font-bold text-sm leading-tight ${text}`}>{c.label}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-xs font-medium ${t?.text}`}>{t?.label}</span>
                    {c.property && <><span className={`text-xs ${muted}`}>·</span><span className={`text-xs ${muted} flex items-center gap-1`}><Home size={10} />{c.property.name}</span></>}
                  </div>
                </div>
                {/* Status badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {expired && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold flex items-center gap-1">
                      <AlertCircle size={9} />Expiré
                    </span>
                  )}
                  {!expired && days !== null && days <= 3 && days > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-bold flex items-center gap-1">
                      <Clock size={9} />J-{days}
                    </span>
                  )}
                  {!c.isActive && !expired && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 text-[10px] font-bold">Inactif</span>
                  )}
                  {c.isActive && !expired && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Actif
                    </span>
                  )}
                </div>
              </div>

              {/* Code display */}
              <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                <span className={`font-mono font-bold text-base tracking-widest flex-1 ${text}`}>{masked}</span>
                <button onClick={() => toggleVisible(c.id)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} transition`}>
                  {visible ? <EyeOff size={14} className={muted} /> : <Eye size={14} className={muted} />}
                </button>
                <button onClick={() => copyCode(c.id, c.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    copied === c.id
                      ? 'bg-green-500/20 text-green-400'
                      : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/15' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}>
                  {copied === c.id ? <><Check size={12} />Copié</> : <><Copy size={12} />Copier</>}
                </button>
              </div>

              {/* Validity + metadata */}
              {(c.validFrom || c.validUntil || c.notes) && (
                <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs ${muted}`}>
                  {c.validFrom && <span className="flex items-center gap-1"><Calendar size={10} />Du {new Date(c.validFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>}
                  {c.validUntil && <span className={`flex items-center gap-1 ${expired ? 'text-red-400' : days !== null && days <= 3 ? 'text-orange-400' : ''}`}>
                    au {new Date(c.validUntil).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {!expired && days !== null && days > 0 && ` (${days}j)`}
                  </span>}
                  {!c.validFrom && !c.validUntil && <span className="flex items-center gap-1"><Calendar size={10} />Permanent</span>}
                </div>
              )}
              {c.notes && <p className={`mt-1.5 text-xs ${muted} italic leading-relaxed`}>{c.notes}</p>}

              {/* Action row */}
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <button onClick={() => toggleActive(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    c.isActive
                      ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      : isDark ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                  }`}>
                  {c.isActive ? <><Power size={11} />{' '}Actif</> : <><PowerOff size={11} />{' '}Inactif</>}
                </button>

                <button onClick={() => sendEmail(c)} disabled={sendingEmail === c.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    c.sentByEmail
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                      : isDark ? 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-100'
                  }`}>
                  {sendingEmail === c.id
                    ? <><RefreshCw size={11} className="animate-spin" />Envoi...</>
                    : <><Mail size={11} />{c.sentByEmail ? 'Envoyé' : 'Email'}</>}
                </button>

                <div className="flex-1" />
                <button onClick={() => openEdit(c)}
                  className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'}`}>
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${bg}`}>

        {/* Header */}
        <header className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
              <ArrowLeft size={20} className={muted} />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center shadow">
                <KeyRound size={18} className="text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-base ${text}`}>Codes d&apos;accès</h1>
                <p className={`text-xs ${muted}`}>{activeCount} actif{activeCount !== 1 ? 's' : ''} · {codes.length} total</p>
              </div>
            </div>
            <ThemeToggle />
            <button onClick={openNew} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow">
              <Plus size={16} />Ajouter
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Power size={16} />,       label: 'Actifs',      value: activeCount,  color: 'text-green-400',  bg: 'bg-green-500/10' },
                { icon: <Wifi size={16} />,         label: 'WiFi',        value: wifiCount,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
                { icon: <Clock size={16} />,        label: 'Expirent bientôt', value: soonCount, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { icon: <AlertCircle size={16} />,  label: 'Expirés',     value: expiredCount, color: 'text-red-400',    bg: 'bg-red-500/10' },
              ].map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className={`${card} border rounded-2xl p-4`}>
                  <div className={`w-8 h-8 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-2`}>{s.icon}</div>
                  <p className={`text-2xl font-bold ${text}`}>{s.value}</p>
                  <p className={`text-xs ${muted} mt-0.5`}>{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card} flex-1 min-w-[180px]`}>
                <Search size={14} className={muted} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..." className={`flex-1 bg-transparent text-sm outline-none ${text}`} />
                {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
              </div>
              <select value={filterProp} onChange={e => setFilterProp(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
                <option value="all">Toutes propriétés</option>
                {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
                <option value="all">Tous types</option>
                {CODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
                className={`px-3 py-2 rounded-xl text-sm border ${card} ${text} outline-none`}>
                <option value="all">Tous statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
              <button onClick={() => setGroupByProp(v => !v)}
                className={`px-3 py-2 rounded-xl text-sm border transition ${
                  groupByProp ? 'border-[#FF385C]/40 bg-[#FF385C]/10 text-[#FF385C]' : `${card} ${muted}`
                }`}>
                <Home size={14} />
              </button>
              <button onClick={fetchCodes} className={`p-2.5 rounded-xl border ${card} ${muted} hover:text-[#FF385C] transition`}>
                <RefreshCw size={15} />
              </button>
            </div>

            {/* Results count */}
            {!loading && filtered.length > 0 && (
              <p className={`text-xs ${muted}`}>
                {filtered.length} code{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
                {groupByProp && ` · Groupé par propriété`}
              </p>
            )}

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
                <p className={`text-sm ${muted}`}>Chargement des codes...</p>
              </div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`${card} border rounded-2xl p-12 text-center`}>
                <div className="w-16 h-16 rounded-2xl bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={28} className="text-gray-400" />
                </div>
                <p className={`font-bold text-base ${text}`}>Aucun code trouvé</p>
                <p className={`text-sm ${muted} mt-1 mb-5`}>Ajoutez vos codes d&apos;accès pour les gérer ici.</p>
                <button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition shadow">
                  <Plus size={16} />Ajouter un code
                </button>
              </motion.div>
            ) : groupByProp ? (
              <div className="space-y-6">
                {Object.entries(grouped).map(([propName, propCodes]) => (
                  <div key={propName}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-lg ${isDark ? 'bg-white/8' : 'bg-gray-100'} flex items-center justify-center`}>
                        <Home size={13} className={muted} />
                      </div>
                      <h2 className={`font-bold text-sm ${text}`}>{propName}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-white/8 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{propCodes.length}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <AnimatePresence mode="popLayout">
                        {propCodes.map(c => <CodeCard key={c.id} c={c} />)}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map(c => <CodeCard key={c.id} c={c} />)}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Add/Edit Modal ────────────────────────────────── */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
              <motion.div
                initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                className={`relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'} overflow-y-auto max-h-[90vh]`}>
                <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/8' : 'border-gray-100'}`}>
                  <h2 className={`font-bold text-lg ${text}`}>{editingId ? 'Modifier le code' : 'Nouveau code d\'accès'}</h2>
                  <button onClick={() => setShowModal(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                    <X size={18} className={muted} />
                  </button>
                </div>
                <div className="px-5 pb-6 pt-4 space-y-4">

                  {/* Type selector — visual pills */}
                  <div>
                    <label className={`block text-xs font-semibold ${muted} mb-2 uppercase tracking-wide`}>Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CODE_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition text-center ${
                            form.type === t.value
                              ? `${t.border} ${t.bg} ${t.text}`
                              : isDark ? 'border-white/8 hover:border-white/20 text-gray-400' : 'border-gray-200 hover:border-gray-300 text-gray-500'
                          }`}>
                          <span className={form.type === t.value ? t.text : ''}>{t.icon}</span>
                          <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

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

                  {/* Label */}
                  <div>
                    <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Libellé *</label>
                    <input ref={firstRef} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                      placeholder="Ex: Porte principale, WiFi Salon..." className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                  </div>

                  {/* Code + Generate */}
                  <div>
                    <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Code *</label>
                    <div className="flex gap-2">
                      <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                        placeholder={form.type === 'WIFI' ? 'MotDePasseWiFi' : '4821'} className={`flex-1 px-3 py-2.5 rounded-xl text-sm outline-none font-mono ${inp}`} />
                      <button type="button" onClick={generateCode} className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition ${isDark ? 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}>
                        Générer
                      </button>
                    </div>
                  </div>

                  {/* Validity dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Valide du</label>
                      <input type="date" value={form.validFrom} onChange={e => setForm(f => ({ ...f, validFrom: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Jusqu&apos;au</label>
                      <input type="date" value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))}
                        className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                    </div>
                  </div>

                  {/* Active toggle */}
                  <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border-2 transition ${
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
                      placeholder="Instructions d'accès, remarques..." rows={2}
                      className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`} />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition shadow">
                      {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                      {editingId ? 'Enregistrer' : 'Ajouter le code'}
                    </button>
                    <button onClick={() => setShowModal(false)}
                      className={`px-5 py-3 rounded-xl text-sm font-medium transition ${isDark ? 'bg-white/8 hover:bg-white/12 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                      Annuler
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Confirm Delete ─────────────────────────────────── */}
        <AnimatePresence>
          {deleteId !== null && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className={`relative w-full max-w-sm rounded-2xl p-6 shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                    <Trash2 size={20} className="text-red-400" />
                  </div>
                  <div>
                    <p className={`font-bold ${text}`}>Supprimer ce code ?</p>
                    <p className={`text-sm ${muted}`}>Cette action est irréversible.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition">Supprimer</button>
                  <button onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Annuler</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}