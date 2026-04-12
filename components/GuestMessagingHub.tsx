'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  MessageCircle, Send, Sparkles, Check, CheckCheck, Clock,
  Search, Filter, ChevronDown, Star, Phone, Mail, Home,
  AlertCircle, ThumbsUp, Copy, Smile, Paperclip,
  ArrowLeft, Users, Calendar, Euro, Zap, X
} from 'lucide-react';

const QUICK_REPLIES = [
  { label: 'Bienvenue', icon: '👋', text: 'Bonjour ! Bienvenue sur BNBGest. Je suis ravi(e) de vous accueillir. N\'hésitez pas si vous avez des questions avant votre arrivée.' },
  { label: 'Confirmation', icon: '✅', text: 'Parfait ! Votre réservation est bien confirmée. Je vous enverrai tous les détails d\'accès 24h avant votre arrivée.' },
  { label: 'Codes accès', icon: '🔑', text: 'Voici les informations d\'accès : le code de la porte est disponible dans votre espace client. Votre chambre sera prête dès 15h.' },
  { label: 'Check-out', icon: '🚪', text: 'Bonjour ! Rappel : le check-out est prévu avant 11h. Merci de laisser les clés sur la table et de fermer la porte à double tour.' },
  { label: 'Problème résolu', icon: '🔧', text: 'Le problème a bien été pris en compte et sera résolu dans les plus brefs délais. Merci pour votre patience !' },
  { label: 'Avis 5⭐', icon: '⭐', text: 'Nous espérons que votre séjour s\'est très bien passé ! Si vous avez apprécié votre expérience, un avis positif nous aiderait beaucoup. Merci !' },
  { label: 'Wifi', icon: '📶', text: 'Le réseau WiFi est : **BNBGest_Home** et le mot de passe est inscrit sur le cadre au-dessus du bureau. Bonne connexion !' },
  { label: 'Urgence', icon: '🚨', text: 'Je prends votre message en compte immédiatement. Je vous rappelle dans les 15 minutes. En cas d\'urgence absolue, voici mon numéro direct.' },
];

interface Message {
  id: string;
  from: 'host' | 'guest';
  text: string;
  time: Date;
  read: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  guestId: number;
  guestName: string;
  guestEmail: string;
  propertyName: string;
  bookingId?: number;
  checkIn?: string;
  checkOut?: string;
  messages: Message[];
  unread: number;
  status: 'active' | 'pending' | 'archived';
  lastMessage: Date;
}

const AI_SUGGESTIONS = [
  "Bonjour {name} ! Tout est prêt pour votre arrivée à {property}.",
  "Avez-vous besoin d'informations sur les transports depuis l'aéroport ?",
  "N'oubliez pas : check-out avant 11h demain. Bon retour !",
  "Merci pour votre séjour ! Votre avis nous aiderait beaucoup.",
  "Un souci ? Je suis disponible 7j/7 pour vous aider.",
];

export default function GuestMessagingHub() {
  const { guests, bookings, properties } = useBNB();
  const { isDark } = useTheme();

  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'active' | 'pending'>('all');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Génère des conversations à partir des réservations + voyageurs
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const convMap = new Map<number, Conversation>();
    guests.forEach(guest => {
      const guestBookings = bookings.filter(b => b.guestId === guest.id);
      const lastBooking = guestBookings[guestBookings.length - 1];
      const prop = lastBooking ? properties.find(p => p.id === lastBooking.propertyId) : undefined;

      // Génère quelques messages initiaux de démo
      const demoMessages: Message[] = [
        {
          id: `${guest.id}-1`,
          from: 'guest',
          text: `Bonjour, j'aimerais savoir si je peux arriver un peu plus tôt que prévu ?`,
          time: new Date(Date.now() - 1000 * 60 * 60 * 3),
          read: Math.random() > 0.5,
          status: 'read',
        },
        {
          id: `${guest.id}-2`,
          from: 'host',
          text: `Bonjour ${guest.name} ! Bien sûr, l'appartement sera disponible dès 13h. À très bientôt !`,
          time: new Date(Date.now() - 1000 * 60 * 60 * 2),
          read: true,
          status: 'read',
        },
      ];

      convMap.set(guest.id, {
        guestId: guest.id,
        guestName: guest.name,
        guestEmail: guest.email,
        propertyName: prop?.name ?? 'Propriété',
        bookingId: lastBooking?.id,
        checkIn: lastBooking?.checkIn,
        checkOut: lastBooking?.checkOut,
        messages: demoMessages,
        unread: demoMessages.filter(m => m.from === 'guest' && !m.read).length,
        status: lastBooking?.status === 'confirmed' ? 'active' : 'pending',
        lastMessage: demoMessages[demoMessages.length - 1]?.time ?? new Date(),
      });
    });
    return Array.from(convMap.values()).sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime());
  });

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const matchSearch = !searchQuery ||
        conv.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filter === 'all' ? true :
        filter === 'unread' ? conv.unread > 0 :
        conv.status === filter;
      return matchSearch && matchFilter;
    });
  }, [conversations, searchQuery, filter]);

  const activeConversation = useMemo(() =>
    conversations.find(c => c.guestId.toString() === selectedConv),
    [conversations, selectedConv]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const sendMessage = () => {
    if (!messageText.trim() || !selectedConv) return;
    setConversations(prev => prev.map(conv => {
      if (conv.guestId.toString() !== selectedConv) return conv;
      const newMsg: Message = {
        id: Date.now().toString(),
        from: 'host',
        text: messageText.trim(),
        time: new Date(),
        read: true,
        status: 'sent',
      };
      return { ...conv, messages: [...conv.messages, newMsg], lastMessage: new Date() };
    }));
    setMessageText('');
    setShowQuickReplies(false);
    // Simuler réponse rapide
    setTimeout(() => {
      setConversations(prev => prev.map(conv => {
        if (conv.guestId.toString() !== selectedConv) return conv;
        return {
          ...conv,
          messages: conv.messages.map(m =>
            m.status === 'sent' ? { ...m, status: 'delivered' as const } : m
          ),
        };
      }));
    }, 1500);
  };

  const markAsRead = (guestId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.guestId.toString() !== guestId) return conv;
      return {
        ...conv,
        unread: 0,
        messages: conv.messages.map(m => ({ ...m, read: true })),
      };
    }));
  };

  const getAISuggestion = () => {
    if (!activeConversation) return;
    const template = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)];
    const suggestion = template
      .replace('{name}', activeConversation.guestName.split(' ')[0])
      .replace('{property}', activeConversation.propertyName);
    setAiSuggestion(suggestion);
    setShowAISuggestion(true);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const c = isDark
    ? { bg: 'bg-[#0f0f1a]', card: 'bg-white/[0.04] border-white/[0.07]', text: 'text-white', sub: 'text-gray-400', input: 'bg-white/[0.06] border-white/[0.08] text-white placeholder:text-gray-600', muted: 'text-gray-500', hover: 'hover:bg-white/[0.06]', selected: 'bg-white/[0.08]', msg: 'bg-white/[0.06]' }
    : { bg: 'bg-gray-50', card: 'bg-white border-gray-100', text: 'text-gray-900', sub: 'text-gray-500', input: 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400', muted: 'text-gray-400', hover: 'hover:bg-gray-50', selected: 'bg-indigo-50', msg: 'bg-gray-100' };

  return (
    <div className={`rounded-2xl border overflow-hidden ${c.card}`} style={{ height: '75vh', minHeight: 500 }}>
      <div className="flex h-full">
        {/* Colonne gauche — liste conversations */}
        <div className={`w-80 flex flex-col border-r ${isDark ? 'border-white/[0.06]' : 'border-gray-100'} shrink-0 ${selectedConv ? 'hidden md:flex' : 'flex w-full md:w-80'}`}>
          {/* Header liste */}
          <div className={`p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className={`font-black ${c.text}`}>Messages</span>
                {totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black">{totalUnread}</span>
                )}
              </div>
            </div>
            {/* Recherche */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${c.muted}`} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un voyageur..."
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 ${c.input}`}
              />
            </div>
            {/* Filtres */}
            <div className="flex gap-1 mt-2">
              {(['all', 'unread', 'active', 'pending'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filter === f
                    ? 'bg-teal-500 text-white'
                    : `${c.sub} ${c.hover}`
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'unread' ? 'Non lus' : f === 'active' ? 'Actifs' : 'Attente'}
                </button>
              ))}
            </div>
          </div>

          {/* Liste des conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <MessageCircle className={`w-6 h-6 ${c.muted}`} />
                </div>
                <p className={`text-sm font-medium text-center ${c.muted}`}>Aucune conversation</p>
                <p className={`text-xs text-center ${c.muted}`}>Les messages de vos voyageurs apparaîtront ici</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.guestId}
                  onClick={() => { setSelectedConv(conv.guestId.toString()); markAsRead(conv.guestId.toString()); }}
                  className={`w-full flex items-start gap-3 p-4 border-b text-left transition-all ${isDark ? 'border-white/[0.04]' : 'border-gray-50'} ${
                    selectedConv === conv.guestId.toString() ? c.selected : c.hover
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-base">
                      {conv.guestName.charAt(0)}
                    </div>
                    {conv.status === 'active' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-bold truncate ${c.text}`}>{conv.guestName}</span>
                      <span className={`text-[10px] shrink-0 ml-2 ${c.muted}`}>{formatTime(conv.lastMessage)}</span>
                    </div>
                    <p className={`text-xs truncate ${c.muted}`}>{conv.propertyName}</p>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? `font-semibold ${c.text}` : c.muted}`}>
                      {conv.messages[conv.messages.length - 1]?.text ?? ''}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Colonne droite — conversation */}
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <MessageCircle className={`w-10 h-10 ${c.muted}`} />
            </div>
            <div className="text-center">
              <p className={`text-lg font-black ${c.text}`}>Centre de messagerie</p>
              <p className={`text-sm mt-1 ${c.muted}`}>Sélectionnez une conversation pour commencer</p>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <Zap className="w-4 h-4 text-teal-400" />
              <span className={`text-xs ${c.sub}`}>{conversations.length} conversations · {totalUnread} non lus</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header conversation */}
            <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
              <button onClick={() => setSelectedConv(null)} className={`md:hidden p-1.5 rounded-lg ${c.hover}`}>
                <ArrowLeft className={`w-4 h-4 ${c.sub}`} />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                {activeConversation?.guestName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold ${c.text}`}>{activeConversation?.guestName}</p>
                <div className="flex items-center gap-3">
                  {activeConversation?.checkIn && (
                    <span className={`flex items-center gap-1 text-xs ${c.muted}`}>
                      <Calendar className="w-3 h-3" />
                      {new Date(activeConversation.checkIn).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs ${c.muted}`}>
                    <Home className="w-3 h-3" />
                    {activeConversation?.propertyName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`tel:${guests.find(g => g.id.toString() === selectedConv)?.phone}`} className={`p-2 rounded-xl transition-all ${c.hover}`} title="Appeler">
                  <Phone className={`w-4 h-4 ${c.sub}`} />
                </a>
                <a href={`mailto:${activeConversation?.guestEmail}`} className={`p-2 rounded-xl transition-all ${c.hover}`} title="Email">
                  <Mail className={`w-4 h-4 ${c.sub}`} />
                </a>
              </div>
            </div>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence initial={false}>
                {activeConversation?.messages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.from === 'host' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[75%] ${msg.from === 'host' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.from === 'host'
                        ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-tr-sm'
                        : `${c.msg} ${c.text} rounded-tl-sm`
                      }`}>
                        {msg.text}
                      </div>
                      <div className={`flex items-center gap-1 text-[10px] ${c.muted}`}>
                        {formatTime(msg.time)}
                        {msg.from === 'host' && (
                          msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-teal-400" /> :
                          msg.status === 'delivered' ? <CheckCheck className="w-3 h-3" /> :
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion IA */}
            <AnimatePresence>
              {showAISuggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mx-4 mb-2 p-3 rounded-xl border ${isDark ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-200'}`}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                    <p className={`text-xs flex-1 ${c.sub}`}>{aiSuggestion}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setMessageText(aiSuggestion); setShowAISuggestion(false); }} className="p-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 transition-all" title="Utiliser">
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button onClick={() => setShowAISuggestion(false)} className={`p-1 rounded-lg ${c.hover} transition-all`} title="Ignorer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Réponses rapides */}
            <AnimatePresence>
              {showQuickReplies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-4 pb-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}
                >
                  <p className={`text-xs font-bold mt-2 mb-2 ${c.muted}`}>Réponses rapides</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((qr, i) => (
                      <button
                        key={i}
                        onClick={() => { setMessageText(qr.text); setShowQuickReplies(false); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'}`}
                      >
                        <span>{qr.icon}</span>
                        {qr.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone de saisie */}
            <div className={`p-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
              <div className="flex items-end gap-2">
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    title="Réponses rapides"
                    className={`p-2.5 rounded-xl transition-all ${showQuickReplies ? 'bg-teal-500/20 text-teal-400' : `${c.hover} ${c.sub}`}`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    onClick={getAISuggestion}
                    title="Suggestion IA"
                    className={`p-2.5 rounded-xl transition-all ${showAISuggestion ? 'bg-violet-500/20 text-violet-400' : `${c.hover} ${c.sub}`}`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                  placeholder="Écrire un message... (Entrée pour envoyer)"
                  rows={1}
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/20 resize-none ${c.input}`}
                  style={{ maxHeight: 120 }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageText.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white transition-all hover:shadow-lg hover:shadow-teal-500/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
