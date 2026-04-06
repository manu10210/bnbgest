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
  Reply, Bot, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

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
    <div className={`h-screen flex flex-col ${bg}`}>

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
        <div className={`w-full sm:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r ${isDark ? 'border-white/10' : 'border-gray-200'} ${selected ? 'hidden sm:flex' : 'flex'}`}>

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
        </div>

        {/* ── Conversation panel (right) ────────────────────── */}
        {selected ? (
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
  );
}
