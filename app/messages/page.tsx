'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ArrowLeft, MessageSquare, Send, Plus, Search, X,
  RefreshCw, Archive, Check, CheckCheck, Inbox,
  Sparkles, Building2, Calendar, Mail, MoreVertical,
  Airplay, Globe, Edit3, User, Clock, Filter, Trash2,
  Reply, Bot, ChevronDown, FileText, Zap, Tag,
  AlertCircle, CheckCircle2, Euro, Home, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import AdminSidebar from '../../components/AdminSidebar';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Property { id: number; name: string }

interface Message {
  id: number;
  content: string;
  senderType: 'guest' | 'host';
  senderName?: string;
  isAI: boolean;
  createdAt: string;
}

interface Thread {
  id: number;
  platform: string;
  externalId?: string;
  propertyId?: number;
  guestName: string;
  guestEmail?: string;
  subject?: string;
  lastMessage?: string;
  lastMessageAt: string;
  isRead: boolean;
  isArchived: boolean;
  autoReplied: boolean;
  property?: { id: number; name: string } | null;
  messages?: Message[];
}

// ─── IA Templates ───────────────────────────────────────────────────────────

const AI_TEMPLATES = [
  {
    id: 'welcome',
    label: 'Bienvenue',
    icon: '👋',
    text: (name: string) =>
      `Bonjour ${name} ! Bienvenue et merci pour votre réservation. Je suis ravi(e) de vous accueillir. N'hésitez pas si vous avez des questions avant votre arrivée. À très bientôt !`,
  },
  {
    id: 'checkin',
    label: 'Instructions check-in',
    icon: '🏠',
    text: (name: string) =>
      `Bonjour ${name}, je vous envoie les informations d'arrivée. Le check-in est possible à partir de 15h. Vous trouverez les codes d'accès dans votre confirmation. Bonne route !`,
  },
  {
    id: 'checkout',
    label: 'Rappel check-out',
    icon: '🧳',
    text: (name: string) =>
      `Bonjour ${name}, je vous rappelle que le check-out est à 11h. Merci de laisser les clés sur la table et de vous assurer que toutes les fenêtres sont fermées. Bonne continuation !`,
  },
  {
    id: 'review',
    label: 'Demande d\'avis',
    icon: '⭐',
    text: (name: string) =>
      `Bonjour ${name}, j'espère que votre séjour s'est bien passé ! Si vous avez un moment, un avis de votre part serait vraiment précieux. Merci et à bientôt peut-être !`,
  },
  {
    id: 'issue',
    label: 'Signalement problème',
    icon: '🔧',
    text: (name: string) =>
      `Bonjour ${name}, merci de m'avoir signalé ce problème. Je m'en occupe immédiatement et vous tiens informé(e) de l'avancement. Je suis désolé(e) pour ce désagrément.`,
  },
];

const PLATFORM_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  airbnb:  { label: 'Airbnb',      color: 'bg-[#FF385C]/15 text-[#FF385C]', icon: Airplay },
  booking: { label: 'Booking.com', color: 'bg-blue-500/15 text-blue-400',    icon: Globe },
  manual:  { label: 'Manuel',      color: 'bg-gray-500/15 text-gray-400',    icon: Edit3 },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "À l'instant";
  if (m < 60) return `Il y a ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `Il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router  = useRouter();
  const { isDark } = useTheme();

  const [threads, setThreads]             = useState<Thread[]>([]);
  const [selected, setSelected]           = useState<Thread | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [properties, setProperties]       = useState<Property[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [replyText, setReplyText]         = useState('');
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterRead, setFilterRead]       = useState('all');
  const [showNewThread, setShowNewThread] = useState(false);
  const [showAIPanel, setShowAIPanel]     = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Email parser
  const [showEmailParser, setShowEmailParser] = useState(false);
  const [emailSubject, setEmailSubject]       = useState('');
  const [emailBody, setEmailBody]             = useState('');
  const [emailParsing, setEmailParsing]       = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [emailResult, setEmailResult]         = useState<any>(null);
  const [emailError, setEmailError]           = useState('');
  const [emailImporting, setEmailImporting]   = useState(false);

  const parseEmail = async () => {
    if (!emailSubject.trim()) { toast.error('Collez d\'abord le sujet de l\'email'); return; }
    setEmailParsing(true);
    setEmailResult(null);
    setEmailError('');
    try {
      const res = await fetch('/api/messages/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject.trim(), body: emailBody.trim() }),
      });
      const d = await res.json();
      if (!res.ok) { setEmailError(d.error || 'Erreur'); return; }
      setEmailResult(d.parsed);
    } catch (e) { setEmailError(String(e)); }
    finally { setEmailParsing(false); }
  };

  const importEmailBooking = async () => {
    if (!emailResult) return;
    const p = emailResult;
    if (!p.guestName || !p.checkIn || !p.checkOut) {
      toast.error('Données incomplètes — nom, check-in et check-out requis');
      return;
    }
    setEmailImporting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: p.guestName,
          checkIn: p.checkIn,
          checkOut: p.checkOut,
          totalPrice: p.totalPrice || 0,
          platform: 'airbnb',
          confirmationCode: p.confirmationCode || null,
          status: 'confirmed',
          notes: `Importé depuis email Airbnb\nSujet: ${emailSubject}`,
        }),
      });
      if (res.ok) {
        toast.success('Réservation créée ✅');
        setEmailResult(null);
        setEmailSubject('');
        setEmailBody('');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Erreur import');
      }
    } catch (e) { toast.error(String(e)); }
    finally { setEmailImporting(false); }
  };

  const [newForm, setNewForm] = useState({
    platform: 'manual', propertyId: '', guestName: '',
    guestEmail: '', subject: '', firstMessage: '',
  });

  const bg    = isDark ? 'bg-gray-950'                : 'bg-gray-50';
  const card  = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200';
  const text  = isDark ? 'text-white'                 : 'text-gray-900';
  const muted = isDark ? 'text-gray-400'              : 'text-gray-500';
  const inp   = isDark
    ? 'bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#FF385C]/50'
    : 'bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C]/50';

  // ── Fetch threads
  const fetchThreads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (filterPlatform !== 'all') params.set('platform', filterPlatform);
      if (filterRead === 'unread')  params.set('isRead', 'false');
      if (filterRead === 'read')    params.set('isRead', 'true');
      if (search) params.set('search', search);

      const res = await fetch(`/api/messages?${params}`);
      if (res.ok) {
        const d = await res.json();
        setThreads(d.threads || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally   { setLoading(false); }
  }, [filterPlatform, filterRead, search]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  useEffect(() => {
    fetch('/api/properties?limit=100')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProperties(d.properties || d || []); });
  }, []);

  // ── Load messages for a thread
  const selectThread = async (t: Thread) => {
    setSelected(t);
    setShowAIPanel(false);
    setReplyText('');
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/messages/${t.id}/messages`);
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
      } else {
        setMessages(t.messages || []);
      }
    } catch {
      setMessages(t.messages || []);
    } finally {
      setLoadingMsgs(false);
      // Mark as read
      if (!t.isRead) {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', threadId: t.id }),
        });
        setThreads(prev => prev.map(x => x.id === t.id ? { ...x, isRead: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Reply
  const sendReply = async (content: string, isAI = false) => {
    if (!selected || !content.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply', threadId: selected.id, content, isAI }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages(prev => [...prev, d.message]);
        setThreads(prev => prev.map(x =>
          x.id === selected.id ? { ...x, lastMessage: content, lastMessageAt: new Date().toISOString() } : x
        ));
        setReplyText('');
        setShowTemplates(false);
        toast.success(isAI ? '🤖 Réponse IA envoyée' : 'Message envoyé ✅');
      }
    } catch { toast.error('Erreur réseau'); }
    finally   { setSending(false); }
  };

  // ── New thread
  const createThread = async () => {
    if (!newForm.guestName || !newForm.firstMessage) {
      toast.error('Nom du voyageur et message requis');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_thread', ...newForm }),
      });
      if (res.ok) {
        toast.success('Conversation créée ✅');
        setShowNewThread(false);
        setNewForm({ platform: 'manual', propertyId: '', guestName: '', guestEmail: '', subject: '', firstMessage: '' });
        fetchThreads();
      }
    } catch { toast.error('Erreur réseau'); }
    finally   { setSending(false); }
  };

  const applyTemplate = (tpl: typeof AI_TEMPLATES[0]) => {
    const name = selected?.guestName?.split(' ')[0] || 'voyageur';
    setReplyText(tpl.text(name));
    setShowTemplates(false);
  };

  const generateAIReply = () => {
    if (!selected) return;
    const name = selected.guestName.split(' ')[0];
    const lastMsg = messages[messages.length - 1];
    let reply = `Bonjour ${name}, merci pour votre message. `;
    if (lastMsg?.content?.toLowerCase().includes('check-in') || lastMsg?.content?.toLowerCase().includes('arrivée')) {
      reply += `Le check-in est possible à partir de 15h. Vous recevrez tous les détails d'accès par message. N'hésitez pas si vous avez d'autres questions !`;
    } else if (lastMsg?.content?.toLowerCase().includes('wifi')) {
      reply += `Le code WiFi est disponible dans le livret d'accueil. Je peux vous l'envoyer directement si vous préférez.`;
    } else if (lastMsg?.content?.toLowerCase().includes('merci') || lastMsg?.content?.toLowerCase().includes('super')) {
      reply += `C'est un vrai plaisir de vous accueillir ! J'espère que tout se passe bien pour vous.`;
    } else {
      reply += `Je prends note de votre demande et reviens vers vous dans les plus brefs délais. Bonne journée !`;
    }
    setReplyText(reply);
    setShowAIPanel(false);
    toast.success('💡 Réponse IA générée');
  };

  // ── Filtered threads
  const filteredThreads = threads.filter(t => !t.isArchived);

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${bg} mobile-nav-pb`}>

      {/* Header */}
      <header className={`flex-shrink-0 z-40 backdrop-blur-md ${isDark ? 'bg-gray-950/90 border-b border-white/10' : 'bg-white/90 border-b border-gray-200'}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
            <ArrowLeft size={20} className={muted} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-base ${text}`}>Messagerie</h1>
              <p className={`text-xs ${muted}`}>
                {unreadCount > 0 ? <span className="text-[#FF385C] font-semibold">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span> : 'Tous lus'} · {threads.length} conversations
              </p>
            </div>
          </div>
          <ThemeToggle />
          <button onClick={() => setShowNewThread(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF385C] text-white text-sm font-semibold hover:bg-[#E31C5F] transition shadow">
            <Plus size={16} />Nouveau
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Thread List (left panel) ─────────────────────── */}
        <div className={`w-full sm:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r ${isDark ? 'border-white/10' : 'border-gray-200'} ${selected && !showEmailParser ? 'hidden sm:flex' : 'flex'}`}>

          {/* Tab switcher */}
          <div className={`flex border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <button
              onClick={() => setShowEmailParser(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition ${!showEmailParser ? 'text-[#FF385C] border-b-2 border-[#FF385C]' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MessageSquare size={13} />Conversations
            </button>
            <button
              onClick={() => { setShowEmailParser(true); setSelected(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition ${showEmailParser ? 'text-amber-500 border-b-2 border-amber-500' : isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <FileText size={13} />Analyser Email
            </button>
          </div>

          {showEmailParser ? (
            /* ── Email Parser Panel ── */
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${muted}`}>
                  Sujet de l&apos;email Airbnb *
                </label>
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Ex: Réservation confirmée · Jean Dupont · 10–13 avr."
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`}
                  onKeyDown={e => { if (e.key === 'Enter') parseEmail(); }}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${muted}`}>
                  Corps de l&apos;email <span className="normal-case font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  placeholder="Collez le corps de l'email ici pour une meilleure précision…"
                  rows={6}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`}
                />
              </div>
              <button
                onClick={parseEmail}
                disabled={emailParsing || !emailSubject.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {emailParsing
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyse…</>
                  : <><Zap size={16} />Analyser</>}
              </button>

              {emailError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{emailError}</p>
                </div>
              )}

              {emailResult && (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  {/* Result header */}
                  <div className={`px-4 py-3 flex items-center gap-2 ${isDark ? 'bg-amber-500/10 border-b border-white/10' : 'bg-amber-50 border-b border-amber-100'}`}>
                    <CheckCircle2 size={16} className="text-amber-500" />
                    <span className={`text-sm font-bold ${text}`}>
                      {emailResult.bookingType === 'new' ? '🆕 Nouvelle réservation'
                        : emailResult.bookingType === 'cancelled' ? '❌ Annulation'
                        : emailResult.bookingType === 'modified' ? '✏️ Modification'
                        : emailResult.bookingType === 'reminder' ? '🔔 Rappel'
                        : '📧 Email Airbnb'}
                    </span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-lg font-medium ${
                      emailResult.confidence >= 80 ? 'bg-green-500/15 text-green-400'
                      : emailResult.confidence >= 50 ? 'bg-yellow-500/15 text-yellow-400'
                      : 'bg-red-500/15 text-red-400'
                    }`}>
                      {emailResult.confidence ?? '?'}% confiance
                    </span>
                  </div>

                  {/* Fields */}
                  <div className="px-4 py-3 space-y-2.5">
                    {[
                      { icon: <User size={13} />,     label: 'Voyageur',       value: emailResult.guestName },
                      { icon: <Hash size={13} />,     label: 'Code',           value: emailResult.confirmationCode },
                      { icon: <Calendar size={13} />, label: 'Arrivée',        value: emailResult.checkIn },
                      { icon: <Calendar size={13} />, label: 'Départ',         value: emailResult.checkOut },
                      { icon: <Euro size={13} />,     label: 'Montant',        value: emailResult.totalPrice ? `${emailResult.totalPrice} €` : null },
                      { icon: <Home size={13} />,     label: 'Logement',       value: emailResult.propertyName },
                      { icon: <Tag size={13} />,      label: 'Nuits',          value: emailResult.nights ? `${emailResult.nights} nuits` : null },
                    ].filter(r => r.value).map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`shrink-0 ${muted}`}>{r.icon}</span>
                        <span className={`text-xs ${muted} w-20 shrink-0`}>{r.label}</span>
                        <span className={`text-xs font-medium ${text} truncate`}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Warnings */}
                  {emailResult.warnings?.length > 0 && (
                    <div className={`px-4 pb-3 space-y-1`}>
                      {emailResult.warnings.map((w: string, i: number) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <AlertCircle size={11} className="text-yellow-400 shrink-0" />
                          <span className="text-[10px] text-yellow-400">{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className={`px-4 py-3 border-t flex gap-2 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    {emailResult.checkIn && emailResult.checkOut && emailResult.guestName && (
                      <button
                        onClick={importEmailBooking}
                        disabled={emailImporting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FF385C] text-white text-xs font-semibold hover:bg-[#E31C5F] disabled:opacity-50 transition"
                      >
                        {emailImporting
                          ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Plus size={13} />}
                        Importer réservation
                      </button>
                    )}
                    <button
                      onClick={() => { setEmailResult(null); setEmailSubject(''); setEmailBody(''); }}
                      className={`px-4 py-2 rounded-xl text-xs font-medium ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition`}
                    >
                      Effacer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <>
          {/* Search + filters */}
          <div className={`p-3 border-b ${isDark ? 'border-white/10' : 'border-gray-100'} space-y-2`}>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${card}`}>
              <Search size={14} className={muted} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className={`flex-1 bg-transparent text-sm outline-none ${text}`} />
              {search && <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>}
            </div>
            <div className="flex gap-1.5">
              {['all','airbnb','booking','manual'].map(p => (
                <button key={p} onClick={() => setFilterPlatform(p)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterPlatform === p ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p === 'all' ? 'Tous' : PLATFORM_CONFIG[p]?.label || p}
                </button>
              ))}
              <button onClick={() => setFilterRead(filterRead === 'unread' ? 'all' : 'unread')} className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterRead === 'unread' ? 'bg-blue-500/20 text-blue-400' : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                Non lus
              </button>
              <button onClick={fetchThreads} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition`}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Thread items */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox size={32} className="mx-auto mb-2 text-gray-400" />
                <p className={`text-sm font-medium ${text}`}>Aucune conversation</p>
                <p className={`text-xs ${muted} mt-1`}>Commencez par créer une nouvelle conversation</p>
              </div>
            ) : (
              filteredThreads.map(t => {
                const plt = PLATFORM_CONFIG[t.platform] || PLATFORM_CONFIG.manual;
                const PltIcon = plt.icon;
                const isActive = selected?.id === t.id;
                return (
                  <button key={t.id} onClick={() => selectThread(t)} className={`w-full text-left px-4 py-3 border-b transition ${isDark ? 'border-white/5' : 'border-gray-100'} ${
                    isActive
                      ? isDark ? 'bg-white/8' : 'bg-[#FF385C]/5'
                      : isDark ? 'hover:bg-white/4' : 'hover:bg-gray-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${isDark ? 'bg-white/10 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
                        {t.guestName[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`font-semibold text-sm truncate ${text}`}>{t.guestName}</span>
                          <span className={`text-[10px] flex-shrink-0 ${muted}`}>{timeAgo(t.lastMessageAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${plt.color}`}>
                            <PltIcon size={9} />{plt.label}
                          </span>
                          {t.property && <span className={`text-[10px] ${muted} truncate`}>{t.property.name}</span>}
                        </div>
                        <p className={`text-xs mt-1 truncate ${t.isRead ? muted : text} ${!t.isRead ? 'font-medium' : ''}`}>
                          {t.lastMessage || 'Aucun message'}
                        </p>
                      </div>
                      {!t.isRead && <div className="w-2 h-2 rounded-full bg-[#FF385C] flex-shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          </>
          )}
        </div>

        {/* ── Conversation panel (right) ────────────────────── */}
        {showEmailParser ? (
          /* Email parser right panel — instructions/empty */
          <div className="flex-1 hidden sm:flex flex-col items-center justify-center gap-4 p-8">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
              <FileText size={40} className="text-amber-500" />
            </div>
            <div className="text-center max-w-sm">
              <p className={`text-lg font-black ${text}`}>Analyseur d&apos;emails Airbnb</p>
              <p className={`text-sm mt-2 ${muted}`}>
                Collez le <strong>sujet</strong> d&apos;un email Airbnb dans le panneau de gauche.<br/>
                Ajoutez le corps pour une meilleure précision.<br/>
                BNBGest extrait automatiquement : voyageur, dates, montant, code de confirmation.
              </p>
              <div className={`mt-4 p-3 rounded-xl text-left text-xs space-y-1.5 ${isDark ? 'bg-white/5' : 'bg-gray-100'} ${muted}`}>
                <p className="font-semibold text-amber-500 mb-2">Exemples de sujets supportés :</p>
                <p>• Réservation confirmée · Jean Dupont · 10–13 avr.</p>
                <p>• Demande de réservation de Sophie M.</p>
                <p>• Jean souhaite changer sa réservation</p>
                <p>• Réservation annulée par Kevin D.</p>
              </div>
            </div>
          </div>
        ) : selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Conversation header */}
            <div className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} ${isDark ? 'bg-gray-950/50' : 'bg-white'}`}>
              <button onClick={() => setSelected(null)} className={`sm:hidden p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}>
                <ArrowLeft size={18} className={muted} />
              </button>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${isDark ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {selected.guestName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${text}`}>{selected.guestName}</p>
                <p className={`text-xs ${muted}`}>
                  {selected.guestEmail && <span>{selected.guestEmail} · </span>}
                  {PLATFORM_CONFIG[selected.platform]?.label || selected.platform}
                  {selected.property && <span> · {selected.property.name}</span>}
                </p>
              </div>
              <button onClick={() => setShowAIPanel(!showAIPanel)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition ${showAIPanel ? 'bg-purple-500/20 text-purple-400' : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <Bot size={13} />IA
              </button>
            </div>

            {/* AI panel */}
            {showAIPanel && (
              <div className={`flex-shrink-0 border-b px-4 py-3 ${isDark ? 'bg-purple-950/30 border-purple-500/20' : 'bg-purple-50 border-purple-100'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                  <Sparkles size={12} className="inline mr-1" />Assistant IA — générer une réponse
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)} className={`px-2.5 py-1 rounded-lg text-xs transition ${isDark ? 'bg-white/5 hover:bg-purple-500/20 text-gray-300' : 'bg-white hover:bg-purple-100 text-gray-700'} border ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      {tpl.icon} {tpl.label}
                    </button>
                  ))}
                  <button onClick={generateAIReply} className="px-2.5 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition border border-purple-500/30 font-medium">
                    ✨ Générer selon contexte
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-[#FF385C] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={28} className="mx-auto mb-2 text-gray-400" />
                  <p className={`text-sm ${muted}`}>Début de la conversation</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isHost = msg.senderType === 'host';
                  return (
                    <div key={msg.id} className={`flex ${isHost ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%]`}>
                        {!isHost && (
                          <p className={`text-[10px] ${muted} mb-1 ml-1`}>{msg.senderName || selected.guestName}</p>
                        )}
                        {isHost && (
                          <p className={`text-[10px] ${muted} mb-1 mr-1 text-right`}>
                            {msg.isAI ? '🤖 IA BNBGest' : 'Vous'}
                          </p>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                          isHost
                            ? msg.isAI
                              ? 'bg-purple-500/20 text-purple-200 rounded-br-md'
                              : 'bg-[#FF385C] text-white rounded-br-md'
                            : isDark
                              ? 'bg-white/10 text-gray-100 rounded-bl-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                        <p className={`text-[10px] ${muted} mt-1 ${isHost ? 'text-right mr-1' : 'ml-1'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className={`flex-shrink-0 border-t ${isDark ? 'border-white/10 bg-gray-950/80' : 'border-gray-200 bg-white'} p-4`}>
              {/* Templates button */}
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setShowTemplates(!showTemplates)} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition ${isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  <Reply size={12} />Modèles <ChevronDown size={10} className={showTemplates ? 'rotate-180' : ''} />
                </button>
              </div>
              {showTemplates && (
                <div className={`mb-2 p-2 rounded-xl border ${card} flex flex-wrap gap-1.5`}>
                  {AI_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)} className={`px-2.5 py-1 rounded-lg text-xs transition ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}>
                      {tpl.icon} {tpl.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(replyText); } }}
                  placeholder="Écrire un message… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                  rows={2}
                  className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none ${inp}`}
                />
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => sendReply(replyText)} disabled={sending || !replyText.trim()} className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF385C] text-white hover:bg-[#E31C5F] disabled:opacity-40 transition">
                    {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                  </button>
                  <button onClick={() => { sendReply(replyText, true); }} disabled={sending || !replyText.trim()} title="Envoyer en tant que IA" className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-40 transition">
                    <Bot size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 hidden sm:flex flex-col items-center justify-center">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <p className={`font-semibold text-lg ${text}`}>Sélectionnez une conversation</p>
            <p className={`text-sm ${muted} mt-1 mb-4`}>ou créez-en une nouvelle</p>
            <button onClick={() => setShowNewThread(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] transition">
              <Plus size={16} />Nouvelle conversation
            </button>
          </div>
        )}
      </div>

      {/* ── New Thread Modal ────────────────────────────────── */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNewThread(false)} />
          <div className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[85vh] ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
            <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
              <h2 className={`font-bold text-lg ${text}`}>Nouvelle conversation</h2>
              <button onClick={() => setShowNewThread(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition`}><X size={18} className={muted} /></button>
            </div>
            <div className="px-5 pb-6 pt-4 space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Plateforme</label>
                <div className="flex gap-2">
                  {['airbnb','booking','manual'].map(p => (
                    <button key={p} onClick={() => setNewForm(f => ({ ...f, platform: p }))} className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${newForm.platform === p ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                      {PLATFORM_CONFIG[p]?.label}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key: 'guestName',    label: 'Nom du voyageur *', placeholder: 'Jean Dupont' },
                { key: 'guestEmail',   label: 'Email',              placeholder: 'jean@example.com' },
                { key: 'subject',      label: 'Sujet',              placeholder: 'Question sur l\'arrivée' },
              ].map(f => (
                <div key={f.key}>
                  <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>{f.label}</label>
                  <input value={(newForm as Record<string,string>)[f.key]} onChange={e => setNewForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${inp}`} />
                </div>
              ))}
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Propriété</label>
                <div className="relative">
                  <select value={newForm.propertyId} onChange={e => setNewForm(f => ({ ...f, propertyId: e.target.value }))} className={`w-full px-3 py-2.5 pr-8 rounded-xl text-sm outline-none appearance-none ${inp}`}>
                    <option value="">Toutes les propriétés</option>
                    {properties.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                  </select>
                  <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted} pointer-events-none`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold ${muted} mb-1.5 uppercase tracking-wide`}>Premier message *</label>
                <textarea value={newForm.firstMessage} onChange={e => setNewForm(f => ({ ...f, firstMessage: e.target.value }))}
                  placeholder="Contenu du message..." rows={3}
                  className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none ${inp}`} />
              </div>
              <div className="flex gap-3">
                <button onClick={createThread} disabled={sending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF385C] text-white font-semibold text-sm hover:bg-[#E31C5F] disabled:opacity-50 transition">
                  {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                  Créer la conversation
                </button>
                <button onClick={() => setShowNewThread(false)} className={`px-5 py-3 rounded-xl text-sm font-medium ${isDark ? 'bg-white/8 text-gray-300 hover:bg-white/12' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition`}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
