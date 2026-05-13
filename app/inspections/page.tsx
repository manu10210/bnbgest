'use client';

import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, Plus, Search, Filter, RefreshCw,
  ClipboardCheck, CheckCircle, AlertTriangle, XCircle,
  Home, Calendar, User, ChevronDown, ChevronUp,
  Pen, Save, Trash2, X, Star, FileText, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

interface Property { id: number; name: string; city: string }
interface Booking  { id: number; propertyId: number; guestName: string; checkIn: string; checkOut: string }

interface RoomItem  { label: string; status: 'OK' | 'ISSUE' | 'MISSING'; notes?: string }
interface Room      { name: string; items: RoomItem[] }

interface Inspection {
  id: number; propertyId: number; bookingId?: number | null;
  type: 'CHECKIN' | 'CHECKOUT' | 'PERIODIC';
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED';
  date: string; inspector?: string | null;
  guestName?: string | null; guestEmail?: string | null;
  notes?: string | null; signature?: string | null; signedAt?: string | null;
  rooms?: Room[] | null; globalScore?: number | null;
  property?: { name: string; city: string };
}

const DEFAULT_ROOMS: Room[] = [
  { name: 'Salon', items: [
    { label: 'Canapé', status: 'OK' }, { label: 'Table basse', status: 'OK' },
    { label: 'TV', status: 'OK' }, { label: 'Sol', status: 'OK' }
  ]},
  { name: 'Cuisine', items: [
    { label: 'Plans de travail', status: 'OK' }, { label: 'Plaques', status: 'OK' },
    { label: 'Four/Micro-ondes', status: 'OK' }, { label: 'Réfrigérateur', status: 'OK' },
    { label: 'Vaisselle', status: 'OK' }
  ]},
  { name: 'Chambre 1', items: [
    { label: 'Lit/Matelas', status: 'OK' }, { label: 'Literie', status: 'OK' },
    { label: 'Armoire', status: 'OK' }, { label: 'Sol', status: 'OK' }
  ]},
  { name: 'Salle de bain', items: [
    { label: 'Douche/Baignoire', status: 'OK' }, { label: 'Lavabo', status: 'OK' },
    { label: 'WC', status: 'OK' }, { label: 'Serviettes', status: 'OK' }
  ]},
  { name: 'Entrée', items: [
    { label: 'Porte d\'entrée', status: 'OK' }, { label: 'Clés', status: 'OK' },
    { label: 'Sol', status: 'OK' }
  ]},
];

const TYPE_LABELS: Record<string, string> = { CHECKIN: 'État des lieux entrée', CHECKOUT: 'État des lieux sortie', PERIODIC: 'Contrôle périodique' };
const TYPE_COLORS: Record<string, string> = { CHECKIN: 'bg-green-500/15 text-green-400', CHECKOUT: 'bg-blue-500/15 text-blue-400', PERIODIC: 'bg-purple-500/15 text-purple-400' };
const STATUS_LABELS: Record<string, string> = { DRAFT: 'Brouillon', IN_PROGRESS: 'En cours', COMPLETED: 'Terminé', SIGNED: 'Signé' };
const STATUS_COLORS: Record<string, string> = { DRAFT: 'bg-gray-500/15 text-gray-400', IN_PROGRESS: 'bg-amber-500/15 text-amber-400', COMPLETED: 'bg-green-500/15 text-green-400', SIGNED: 'bg-blue-500/15 text-blue-400' };
const ITEM_STATUS_COLORS: Record<string, string> = { OK: 'bg-green-500/20 text-green-400 border-green-500/30', ISSUE: 'bg-amber-500/20 text-amber-400 border-amber-500/30', MISSING: 'bg-red-500/20 text-red-400 border-red-500/30' };
const ITEM_STATUS_ICONS: Record<string, React.ReactElement> = {
  OK:      <CheckCircle size={13} />,
  ISSUE:   <AlertTriangle size={13} />,
  MISSING: <XCircle size={13} />
};

export default function InspectionsPage() {
  const router = useRouter();
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties]   = useState<Property[]>([]);
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editInspection, setEditInspection] = useState<Inspection | null>(null);

  // Form state
  const [form, setForm] = useState({
    propertyId: '', bookingId: '', type: 'CHECKIN', status: 'DRAFT',
    date: new Date().toISOString().split('T')[0], inspector: '',
    guestName: '', guestEmail: '', notes: '', globalScore: 0,
  });
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [expandedRooms, setExpandedRooms] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Styles
  const bg    = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const card  = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text  = isDark ? 'text-white' : 'text-gray-900';
  const muted = isDark ? 'text-gray-400' : 'text-gray-500';
  const input = isDark ? 'bg-white/8 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes, bRes] = await Promise.all([
        fetch('/api/inspections?limit=100'),
        fetch('/api/properties?limit=100'),
        fetch('/api/bookings?limit=200'),
      ]);
      if (iRes.ok) { const d = await iRes.json(); setInspections(d.inspections || []); }
      if (pRes.ok) { const d = await pRes.json(); setProperties(d.properties || d || []); }
      if (bRes.ok) { const d = await bRes.json(); setBookings(d.bookings || d || []); }
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditInspection(null);
    setForm({ propertyId: '', bookingId: '', type: 'CHECKIN', status: 'DRAFT', date: new Date().toISOString().split('T')[0], inspector: '', guestName: '', guestEmail: '', notes: '', globalScore: 0 });
    setRooms(DEFAULT_ROOMS);
    setSignatureData(null);
    setShowForm(true);
  };

  const openEdit = (insp: Inspection) => {
    setEditInspection(insp);
    setForm({
      propertyId: String(insp.propertyId), bookingId: String(insp.bookingId || ''),
      type: insp.type, status: insp.status,
      date: insp.date.split('T')[0], inspector: insp.inspector || '',
      guestName: insp.guestName || '', guestEmail: insp.guestEmail || '',
      notes: insp.notes || '', globalScore: insp.globalScore || 0,
    });
    setRooms(insp.rooms || DEFAULT_ROOMS);
    setSignatureData(insp.signature || null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.propertyId) { toast.error('Sélectionnez une propriété'); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        propertyId: parseInt(form.propertyId),
        bookingId: form.bookingId ? parseInt(form.bookingId) : null,
        globalScore: form.globalScore || null,
        rooms,
        signature: signatureData,
        signedAt: signatureData && !editInspection?.signedAt ? new Date().toISOString() : editInspection?.signedAt,
      };
      const url = editInspection ? `/api/inspections/${editInspection.id}` : '/api/inspections';
      const method = editInspection ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      toast.success(editInspection ? 'État des lieux mis à jour' : 'État des lieux créé');
      setShowForm(false);
      fetchData();
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet état des lieux ?')) return;
    const res = await fetch(`/api/inspections/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Supprimé'); fetchData(); }
    else toast.error('Erreur');
  };

  const updateItemStatus = (rIdx: number, iIdx: number, status: RoomItem['status']) => {
    setRooms(prev => {
      const r = prev.map((room, ri) => ri !== rIdx ? room : {
        ...room, items: room.items.map((item, ii) => ii !== iIdx ? item : { ...item, status })
      });
      return r;
    });
  };

  const updateItemNote = (rIdx: number, iIdx: number, notes: string) => {
    setRooms(prev => prev.map((room, ri) => ri !== rIdx ? room : {
      ...room, items: room.items.map((item, ii) => ii !== iIdx ? item : { ...item, notes })
    }));
  };

  // Signature canvas
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.strokeStyle = '#FF385C';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };
  const endDraw = () => {
    isDrawing.current = false;
    setSignatureData(canvasRef.current?.toDataURL('image/png') || null);
  };
  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const filtered = inspections.filter(i => {
    if (filterType   && i.type   !== filterType)   return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(i.guestName?.toLowerCase().includes(q) || i.property?.name.toLowerCase().includes(q) || i.inspector?.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const stats = {
    total:     inspections.length,
    signed:    inspections.filter(i => i.status === 'SIGNED').length,
    inProgress:inspections.filter(i => i.status === 'IN_PROGRESS').length,
    issues:    inspections.reduce((n, i) => n + (i.rooms?.flatMap(r => r.items).filter(it => it.status !== 'OK').length || 0), 0),
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${bg} mobile-nav-pb`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <ArrowLeft size={20} className={muted} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <ClipboardCheck size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>États des lieux</h1>
              <p className={`text-xs ${muted}`}>{stats.total} inspection{stats.total > 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={fetchData} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
              <RefreshCw size={16} className={muted} />
            </button>
            <ThemeToggle />
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-[#FF385C] hover:bg-[#E31C5F] text-white text-sm font-semibold rounded-xl transition">
              <Plus size={16} />Nouveau
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: stats.total,      color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: <FileText size={16} className="text-indigo-400" /> },
            { label: 'Signés',     value: stats.signed,     color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: <Pen size={16} className="text-blue-400" /> },
            { label: 'En cours',   value: stats.inProgress, color: 'text-amber-400',  bg: 'bg-amber-500/10',  icon: <Clock size={16} className="text-amber-400" /> },
            { label: 'Anomalies',  value: stats.issues,     color: 'text-red-400',    bg: 'bg-red-500/10',    icon: <AlertTriangle size={16} className="text-red-400" /> },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-3 p-3 rounded-2xl border ${card}`}>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className={`text-xs ${muted}`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className={`flex flex-wrap gap-2 p-3 rounded-2xl border ${card}`}>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} flex-1 min-w-[180px]`}>
            <Search size={14} className={muted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className={`bg-transparent outline-none text-sm flex-1 ${text}`} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm ${card} ${text} outline-none`}>
            <option value="">Tous types</option>
            {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`px-3 py-2 rounded-xl border text-sm ${card} ${text} outline-none`}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-10 h-10 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${card}`}>
            <ClipboardCheck size={40} className={`mx-auto ${muted} mb-3`} />
            <p className={`font-medium ${text}`}>Aucun état des lieux</p>
            <p className={`text-sm ${muted} mt-1`}>Créez le premier état des lieux</p>
            <button onClick={openNew} className="mt-4 px-4 py-2 bg-[#FF385C] text-white rounded-xl text-sm font-semibold hover:bg-[#E31C5F] transition">
              <Plus size={14} className="inline mr-1" />Nouveau
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(insp => {
              const issues = insp.rooms?.flatMap(r => r.items).filter(it => it.status !== 'OK').length || 0;
              return (
                <div key={insp.id} className={`p-4 rounded-2xl border ${card} hover:shadow-md transition`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck size={18} className="text-teal-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${TYPE_COLORS[insp.type]}`}>{TYPE_LABELS[insp.type]}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLORS[insp.status]}`}>{STATUS_LABELS[insp.status]}</span>
                          {issues > 0 && <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400">{issues} anomalie{issues > 1 ? 's' : ''}</span>}
                        </div>
                        <p className={`font-semibold ${text} truncate`}>{insp.property?.name || `Propriété #${insp.propertyId}`}</p>
                        <div className={`flex flex-wrap gap-3 text-xs ${muted} mt-1`}>
                          <span className="flex items-center gap-1"><Calendar size={11} />{new Date(insp.date).toLocaleDateString('fr-FR')}</span>
                          {insp.guestName && <span className="flex items-center gap-1"><User size={11} />{insp.guestName}</span>}
                          {insp.inspector  && <span className="flex items-center gap-1"><Home size={11} />{insp.inspector}</span>}
                          {insp.globalScore && <span className="flex items-center gap-1">{Array.from({length: insp.globalScore}, (_,i) => <Star key={i} size={10} className="fill-amber-400 text-amber-400" />)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(insp)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`} title="Modifier">
                        <Pen size={14} className={muted} />
                      </button>
                      <button onClick={() => handleDelete(insp.id)} className="p-2 rounded-xl hover:bg-red-500/10 transition" title="Supprimer">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className={`relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'} flex flex-col max-h-[95vh]`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} flex-shrink-0`}>
              <h2 className={`font-bold text-lg ${text}`}>{editInspection ? 'Modifier l\'état des lieux' : 'Nouvel état des lieux'}</h2>
              <button onClick={() => setShowForm(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={18} className={muted} /></button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Propriété *</label>
                  <select value={form.propertyId} onChange={e => setForm(f => ({...f, propertyId: e.target.value}))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`}>
                    <option value="">Sélectionner</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`}>
                    {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Statut</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`}>
                    {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Inspecteur</label>
                  <input value={form.inspector} onChange={e => setForm(f => ({...f, inspector: e.target.value}))} placeholder="Nom de l'inspecteur" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Nom du locataire</label>
                  <input value={form.guestName} onChange={e => setForm(f => ({...f, guestName: e.target.value}))} placeholder="Prénom Nom" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Email du locataire</label>
                  <input type="email" value={form.guestEmail} onChange={e => setForm(f => ({...f, guestEmail: e.target.value}))} placeholder="email@exemple.com" className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none`} />
                </div>
              </div>

              {/* Rooms checklist */}
              <div>
                <h3 className={`text-sm font-bold ${text} mb-3 flex items-center gap-2`}>
                  <ClipboardCheck size={15} />Pièces & éléments
                </h3>
                <div className="space-y-2">
                  {rooms.map((room, rIdx) => {
                    const roomIssues = room.items.filter(it => it.status !== 'OK').length;
                    const isOpen = expandedRooms[rIdx] !== false; // default open
                    return (
                      <div key={rIdx} className={`rounded-xl border ${isDark ? 'border-white/10 bg-white/3' : 'border-gray-200 bg-gray-50/50'}`}>
                        <button onClick={() => setExpandedRooms(prev => ({...prev, [rIdx]: !isOpen}))}
                          className={`w-full flex items-center justify-between px-4 py-3 ${text}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{room.name}</span>
                            {roomIssues > 0 && <span className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[10px] font-medium">{roomIssues}</span>}
                          </div>
                          {isOpen ? <ChevronUp size={15} className={muted} /> : <ChevronDown size={15} className={muted} />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 space-y-2">
                            {room.items.map((item, iIdx) => (
                              <div key={iIdx} className={`flex flex-wrap items-start gap-2 p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'} border ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                                <span className={`flex-1 text-sm ${text} min-w-[120px]`}>{item.label}</span>
                                <div className="flex gap-1">
                                  {(['OK','ISSUE','MISSING'] as const).map(s => (
                                    <button key={s} onClick={() => updateItemStatus(rIdx, iIdx, s)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition ${item.status === s ? ITEM_STATUS_COLORS[s] : isDark ? 'border-white/10 text-gray-500 hover:border-white/20' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                      {ITEM_STATUS_ICONS[s]}{s === 'OK' ? 'OK' : s === 'ISSUE' ? 'Prob.' : 'Man.'}
                                    </button>
                                  ))}
                                </div>
                                {item.status !== 'OK' && (
                                  <input value={item.notes || ''} onChange={e => updateItemNote(rIdx, iIdx, e.target.value)} placeholder="Note..." className={`w-full px-2 py-1.5 rounded-lg border text-xs ${input} outline-none mt-1`} />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Score */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-2`}>Note globale (1-5)</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setForm(f => ({...f, globalScore: n}))}
                      className={`w-9 h-9 rounded-xl border transition flex items-center justify-center ${form.globalScore >= n ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : isDark ? 'border-white/10 text-gray-600 hover:border-white/20' : 'border-gray-200 text-gray-300 hover:border-gray-300'}`}>
                      <Star size={16} className={form.globalScore >= n ? 'fill-amber-400' : ''} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5`}>Notes générales</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3} placeholder="Observations, remarques..." className={`w-full px-3 py-2.5 rounded-xl border text-sm ${input} outline-none resize-none`} />
              </div>

              {/* Signature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-xs font-semibold ${muted}`}>Signature</label>
                  <button onClick={() => setShowSignature(s => !s)} className={`text-xs ${isDark ? 'text-[#FF385C]' : 'text-[#FF385C]'} font-medium`}>
                    {showSignature ? 'Masquer' : 'Afficher le pad'}
                  </button>
                </div>
                {signatureData && !showSignature && (
                  <div className={`p-2 rounded-xl border ${card} flex items-center gap-2`}>
                    <CheckCircle size={14} className="text-green-400" />
                    <span className={`text-xs ${muted}`}>Signature enregistrée</span>
                    <button onClick={() => setSignatureData(null)} className="ml-auto text-xs text-red-400 hover:text-red-300">Effacer</button>
                  </div>
                )}
                {showSignature && (
                  <div>
                    <canvas ref={canvasRef} width={500} height={150}
                      className={`w-full rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'} cursor-crosshair touch-none`}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                    <button onClick={clearSignature} className={`mt-1 text-xs ${muted} hover:text-red-400 transition`}>Effacer la signature</button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={`flex gap-2 px-5 pb-5 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-100'} flex-shrink-0`}>
              <button onClick={() => setShowForm(false)} className={`flex-1 py-3 rounded-xl font-semibold text-sm ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} transition`}>Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl font-semibold text-sm bg-[#FF385C] hover:bg-[#E31C5F] text-white transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
