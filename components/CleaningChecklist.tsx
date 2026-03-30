'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useBNB, Property, Booking } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle, Circle, Clock, Home, Camera, MessageSquare,
  ChevronDown, ChevronUp, RotateCcw, Download, Play, Pause, Save,
  Trash2, AlertTriangle, User, Calendar, MapPin, Star, Award,
  TrendingUp, Filter, Search, Eye, Edit, Copy, Share2, Printer,
  FileText, BarChart3, Users, Package, Zap, Target, Activity,
  Briefcase, ShoppingCart, ClipboardCheck, RefreshCw, Upload,
  Image, Video, Mic, Hash, Percent, DollarSign, Euro, X, Plus
} from 'lucide-react';

// ==================== TYPES ====================

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime?: number; // en minutes
  note?: string;
  photos?: string[];
  completedAt?: string;
  completedBy?: string;
  issues?: string[];
  rating?: number; // 1-5
}

interface RoomChecklist {
  room: string;
  icon: string;
  color: string;
  items: ChecklistItem[];
  completedCount?: number;
  totalCount?: number;
  estimatedDuration?: number;
}

interface CleaningSession {
  id: string;
  propertyId: number;
  bookingId?: number;
  assignedTo: string;
  team?: string[];
  startedAt?: string;
  completedAt?: string;
  pausedDuration?: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'verified' | 'cancelled';
  rooms: RoomChecklist[];
  notes: string;
  createdAt: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  overallRating?: number;
  quality?: 'excellent' | 'good' | 'average' | 'poor';
  cost?: number;
  supplies?: { item: string; quantity: number; cost: number }[];
  issues?: { description: string; severity: 'low' | 'medium' | 'high'; resolved: boolean }[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  verifiedBy?: string;
  verifiedAt?: string;
}

interface CleaningTemplate {
  id: string;
  name: string;
  description: string;
  rooms: RoomChecklist[];
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// ==================== TEMPLATES ====================

const DEFAULT_ROOMS: RoomChecklist[] = [
  {
    room: 'Entrée / Salon',
    icon: '🏠',
    color: 'from-blue-500 to-cyan-500',
    estimatedDuration: 20,
    items: [
      { id: 'e1', label: 'Aspirer / balayer le sol', done: false, priority: 'high', estimatedTime: 5 },
      { id: 'e2', label: 'Laver le sol', done: false, priority: 'high', estimatedTime: 5 },
      { id: 'e3', label: 'Dépoussiérer les meubles', done: false, priority: 'medium', estimatedTime: 3 },
      { id: 'e4', label: 'Nettoyer les vitres et miroirs', done: false, priority: 'medium', estimatedTime: 4 },
      { id: 'e5', label: 'Vider les poubelles', done: false, priority: 'high', estimatedTime: 1 },
      { id: 'e6', label: 'Vérifier éclairages', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'e7', label: 'Remettre les coussins en place', done: false, priority: 'low', estimatedTime: 1 },
      { id: 'e8', label: 'Vérifier télécommandes (piles)', done: false, priority: 'medium', estimatedTime: 1 },
      { id: 'e9', label: 'Aérer la pièce', done: false, priority: 'high', estimatedTime: 1 },
      { id: 'e10', label: 'Ranger magazines / livres', done: false, priority: 'low', estimatedTime: 2 },
    ],
  },
  {
    room: 'Chambre(s)',
    icon: '🛏️',
    color: 'from-purple-500 to-pink-500',
    estimatedDuration: 25,
    items: [
      { id: 'c1', label: 'Changer les draps', done: false, priority: 'critical', estimatedTime: 5 },
      { id: 'c2', label: 'Changer les taies d\'oreiller', done: false, priority: 'critical', estimatedTime: 2 },
      { id: 'c3', label: 'Refaire le lit (pliage hôtelier)', done: false, priority: 'high', estimatedTime: 5 },
      { id: 'c4', label: 'Aspirer / balayer le sol', done: false, priority: 'high', estimatedTime: 4 },
      { id: 'c5', label: 'Dépoussiérer tables de nuit', done: false, priority: 'medium', estimatedTime: 2 },
      { id: 'c6', label: 'Nettoyer miroir / vitres', done: false, priority: 'medium', estimatedTime: 3 },
      { id: 'c7', label: 'Vérifier penderie (cintres)', done: false, priority: 'medium', estimatedTime: 1 },
      { id: 'c8', label: 'Vérifier prises et éclairages', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'c9', label: 'Placer serviettes supplémentaires', done: false, priority: 'low', estimatedTime: 1 },
      { id: 'c10', label: 'Vérifier climatisation / chauffage', done: false, priority: 'high', estimatedTime: 1 },
    ],
  },
  {
    room: 'Salle de bain',
    icon: '🚿',
    color: 'from-teal-500 to-emerald-500',
    estimatedDuration: 30,
    items: [
      { id: 'b1', label: 'Nettoyer la douche / baignoire', done: false, priority: 'critical', estimatedTime: 8 },
      { id: 'b2', label: 'Nettoyer les toilettes (intérieur + extérieur)', done: false, priority: 'critical', estimatedTime: 5 },
      { id: 'b3', label: 'Nettoyer le lavabo et robinetterie', done: false, priority: 'high', estimatedTime: 4 },
      { id: 'b4', label: 'Nettoyer le miroir', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'b5', label: 'Remplacer les serviettes propres', done: false, priority: 'critical', estimatedTime: 3 },
      { id: 'b6', label: 'Vérifier savon / shampoing / gel douche', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'b7', label: 'Vérifier papier toilette (+ rouleau de rechange)', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'b8', label: 'Laver le sol', done: false, priority: 'high', estimatedTime: 3 },
      { id: 'b9', label: 'Vider la poubelle', done: false, priority: 'high', estimatedTime: 1 },
      { id: 'b10', label: 'Désinfecter toutes les surfaces', done: false, priority: 'critical', estimatedTime: 5 },
    ],
  },
  {
    room: 'Cuisine',
    icon: '🍳',
    color: 'from-orange-500 to-red-500',
    estimatedDuration: 35,
    items: [
      { id: 'k1', label: 'Nettoyer le plan de travail', done: false, priority: 'high', estimatedTime: 3 },
      { id: 'k2', label: 'Nettoyer la cuisinière / plaques', done: false, priority: 'high', estimatedTime: 5 },
      { id: 'k3', label: 'Nettoyer le four (intérieur)', done: false, priority: 'medium', estimatedTime: 8 },
      { id: 'k4', label: 'Nettoyer le micro-ondes', done: false, priority: 'high', estimatedTime: 4 },
      { id: 'k5', label: 'Nettoyer le réfrigérateur (vider + essuyer)', done: false, priority: 'critical', estimatedTime: 6 },
      { id: 'k6', label: 'Lancer / vider le lave-vaisselle', done: false, priority: 'medium', estimatedTime: 2 },
      { id: 'k7', label: 'Vérifier vaisselle complète et rangée', done: false, priority: 'high', estimatedTime: 3 },
      { id: 'k8', label: 'Remplacer éponge et produit vaisselle', done: false, priority: 'medium', estimatedTime: 1 },
      { id: 'k9', label: 'Vider les poubelles (tri sélectif)', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'k10', label: 'Laver le sol', done: false, priority: 'high', estimatedTime: 4 },
      { id: 'k11', label: 'Nettoyer évier et robinetterie', done: false, priority: 'high', estimatedTime: 3 },
      { id: 'k12', label: 'Vérifier machine à café / bouilloire', done: false, priority: 'medium', estimatedTime: 2 },
    ],
  },
  {
    room: 'Extérieur / Communs',
    icon: '🌳',
    color: 'from-green-500 to-lime-500',
    estimatedDuration: 15,
    items: [
      { id: 'x1', label: 'Vérifier boîte aux lettres', done: false, priority: 'low', estimatedTime: 1 },
      { id: 'x2', label: 'Nettoyer le paillasson', done: false, priority: 'medium', estimatedTime: 2 },
      { id: 'x3', label: 'Vérifier la porte d\'entrée (serrure)', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'x4', label: 'Arroser les plantes si nécessaire', done: false, priority: 'low', estimatedTime: 3 },
      { id: 'x5', label: 'Vérifier le thermostat / chauffage', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'x6', label: 'Laisser les clés / boîtier à clé', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'x7', label: 'Vérifier éclairages extérieurs', done: false, priority: 'medium', estimatedTime: 2 },
      { id: 'x8', label: 'Nettoyer balcon / terrasse', done: false, priority: 'medium', estimatedTime: 5 },
    ],
  },
  {
    room: 'Contrôle final',
    icon: '✅',
    color: 'from-indigo-500 to-violet-500',
    estimatedDuration: 10,
    items: [
      { id: 'f1', label: 'Vérification globale de la propreté', done: false, priority: 'critical', estimatedTime: 3 },
      { id: 'f2', label: 'Prendre photos "après"', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'f3', label: 'Vérifier WiFi et codes d\'accès', done: false, priority: 'critical', estimatedTime: 1 },
      { id: 'f4', label: 'Documenter problèmes éventuels', done: false, priority: 'high', estimatedTime: 2 },
      { id: 'f5', label: 'Signer et valider la checklist', done: false, priority: 'critical', estimatedTime: 1 },
    ],
  },
];

const STORAGE_KEY = 'bnbgest_cleaning_sessions';

// ==================== COMPONENT ====================

export default function CleaningChecklist() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();

  // États principaux
  const [sessions, setSessions] = useState<CleaningSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'history' | 'stats'>('active');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [expandedRooms, setExpandedRooms] = useState<string[]>(['Entrée / Salon']);
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Timer
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);

  // Filtres et recherche
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'property' | 'duration' | 'rating'>('date');

  // Modals
  const [showModal, setShowModal] = useState<'new' | 'details' | 'photos' | 'issues' | 'supplies' | null>(null);
  const [selectedSession, setSelectedSession] = useState<CleaningSession | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSessions(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timerStart) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - timerStart - totalPausedTime) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerStart, totalPausedTime]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Statistiques
  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === 'completed' || s.status === 'verified').length;
    const inProgress = sessions.filter(s => s.status === 'in_progress').length;
    const pending = sessions.filter(s => s.status === 'pending').length;
    
    const avgDuration = sessions
      .filter(s => s.startedAt && s.completedAt)
      .reduce((acc, s) => {
        const duration = new Date(s.completedAt!).getTime() - new Date(s.startedAt!).getTime();
        return acc + duration;
      }, 0) / (completed || 1);

    const avgRating = sessions
      .filter(s => s.overallRating)
      .reduce((acc, s) => acc + (s.overallRating || 0), 0) / (sessions.filter(s => s.overallRating).length || 1);

    const totalCost = sessions.reduce((acc, s) => acc + (s.cost || 0), 0);

    return {
      total,
      completed,
      inProgress,
      pending,
      avgDuration: Math.floor(avgDuration / 1000 / 60), // en minutes
      avgRating: avgRating.toFixed(1),
      totalCost,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(0) : '0',
    };
  }, [sessions]);

  // Sessions filtrées
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const property = properties.find(p => p.id === s.propertyId);
        return (
          property?.name.toLowerCase().includes(query) ||
          s.assignedTo.toLowerCase().includes(query) ||
          s.notes.toLowerCase().includes(query)
        );
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'property':
          const propA = properties.find(p => p.id === a.propertyId)?.name || '';
          const propB = properties.find(p => p.id === b.propertyId)?.name || '';
          return propA.localeCompare(propB);
        case 'duration':
          const durationA = a.completedAt && a.startedAt 
            ? new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime()
            : 0;
          const durationB = b.completedAt && b.startedAt 
            ? new Date(b.completedAt).getTime() - new Date(b.startedAt).getTime()
            : 0;
          return durationB - durationA;
        case 'rating':
          return (b.overallRating || 0) - (a.overallRating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, statusFilter, searchQuery, sortBy, properties]);

  // Fonctions utilitaires
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      verified: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-600 dark:bg-gray-700',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900',
      critical: 'bg-red-100 text-red-700 dark:bg-red-900',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  }, []);

  // Actions CRUD
  const createSession = useCallback(() => {
    if (!selectedPropertyId) {
      alert('Veuillez sélectionner une propriété');
      return;
    }

    const booking = selectedBookingId ? bookings.find(b => b.id === selectedBookingId) : null;

    const session: CleaningSession = {
      id: `clean_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      propertyId: selectedPropertyId,
      bookingId: selectedBookingId || undefined,
      assignedTo: assignedTo || 'Non assigné',
      team: teamMembers.length > 0 ? teamMembers : undefined,
      status: 'pending',
      rooms: DEFAULT_ROOMS.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, done: false })),
        completedCount: 0,
        totalCount: r.items.length,
      })),
      notes: '',
      createdAt: new Date().toISOString(),
      checkInDate: booking?.checkIn,
      checkOutDate: booking?.checkOut,
      guestCount: booking?.guests,
      issues: [],
      supplies: [],
      beforePhotos: [],
      afterPhotos: [],
    };

    setSessions(prev => [session, ...prev]);
    setActiveSessionId(session.id);
    setViewMode('active');
    setShowModal(null);
  }, [selectedPropertyId, selectedBookingId, assignedTo, teamMembers, bookings]);

  const startSession = useCallback(() => {
    if (!activeSession) return;

    setSessions(prev => prev.map(s =>
      s.id === activeSession.id
        ? {
            ...s,
            status: 'in_progress' as const,
            startedAt: s.startedAt || new Date().toISOString(),
          }
        : s
    ));

    setTimerStart(Date.now());
    setTimerRunning(true);
    setTotalPausedTime(0);
  }, [activeSession]);

  const pauseSession = useCallback(() => {
    if (!activeSession) return;

    setSessions(prev => prev.map(s =>
      s.id === activeSession.id
        ? { ...s, status: 'paused' as const }
        : s
    ));

    setTimerRunning(false);
    setPausedAt(Date.now());
  }, [activeSession]);

  const resumeSession = useCallback(() => {
    if (!activeSession || !pausedAt) return;

    setSessions(prev => prev.map(s =>
      s.id === activeSession.id
        ? { ...s, status: 'in_progress' as const }
        : s
    ));

    const pauseDuration = Date.now() - pausedAt;
    setTotalPausedTime(prev => prev + pauseDuration);
    setTimerRunning(true);
    setPausedAt(null);
  }, [activeSession, pausedAt]);

  const completeSession = useCallback(() => {
    if (!activeSession) return;

    const completedRooms = activeSession.rooms.filter(room =>
      room.items.every(item => item.done)
    ).length;

    const totalRooms = activeSession.rooms.length;
    const completionRate = (completedRooms / totalRooms) * 100;

    if (completionRate < 100) {
      if (!confirm(`Seulement ${completionRate.toFixed(0)}% des tâches sont complétées. Terminer quand même ?`)) {
        return;
      }
    }

    setSessions(prev => prev.map(s =>
      s.id === activeSession.id
        ? {
            ...s,
            status: 'completed' as const,
            completedAt: new Date().toISOString(),
            notes: sessionNotes,
          }
        : s
    ));

    setTimerRunning(false);
    setActiveSessionId(null);
    setViewMode('history');
  }, [activeSession, sessionNotes]);

  const toggleItem = useCallback((roomIndex: number, itemId: string) => {
    if (!activeSession) return;

    setSessions(prev => prev.map(s => {
      if (s.id !== activeSession.id) return s;

      const newRooms = [...s.rooms];
      const room = { ...newRooms[roomIndex] };
      const items = [...room.items];
      const itemIndex = items.findIndex(i => i.id === itemId);

      if (itemIndex !== -1) {
        items[itemIndex] = {
          ...items[itemIndex],
          done: !items[itemIndex].done,
          completedAt: !items[itemIndex].done ? new Date().toISOString() : undefined,
          completedBy: !items[itemIndex].done ? assignedTo : undefined,
        };
      }

      room.items = items;
      room.completedCount = items.filter(i => i.done).length;
      newRooms[roomIndex] = room;

      return { ...s, rooms: newRooms };
    }));
  }, [activeSession, assignedTo]);

  const toggleRoom = useCallback((roomName: string) => {
    setExpandedRooms(prev =>
      prev.includes(roomName)
        ? prev.filter(r => r !== roomName)
        : [...prev, roomName]
    );
  }, []);

  const resetSession = useCallback(() => {
    if (!activeSession) return;
    if (!confirm('Réinitialiser toutes les tâches ?')) return;

    setSessions(prev => prev.map(s => {
      if (s.id !== activeSession.id) return s;

      return {
        ...s,
        rooms: s.rooms.map(room => ({
          ...room,
          items: room.items.map(item => ({
            ...item,
            done: false,
            completedAt: undefined,
            completedBy: undefined,
          })),
          completedCount: 0,
        })),
      };
    }));
  }, [activeSession]);

  const exportToPDF = useCallback(() => {
    if (!activeSession) return;
    alert('Export PDF (à implémenter avec jsPDF ou similaire)');
  }, [activeSession]);

  const duplicateSession = useCallback((sessionId: string) => {
    const original = sessions.find(s => s.id === sessionId);
    if (!original) return;

    const duplicate: CleaningSession = {
      ...original,
      id: `clean_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      startedAt: undefined,
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      rooms: original.rooms.map(r => ({
        ...r,
        items: r.items.map(i => ({ ...i, done: false, completedAt: undefined })),
        completedCount: 0,
      })),
    };

    setSessions(prev => [duplicate, ...prev]);
    setActiveSessionId(duplicate.id);
    setViewMode('active');
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    if (!confirm('Supprimer cette session ?')) return;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  }, [activeSessionId]);

  // Calcul de la progression
  const sessionProgress = useMemo(() => {
    if (!activeSession) return 0;

    const totalItems = activeSession.rooms.reduce((sum, room) => sum + room.items.length, 0);
    const completedItems = activeSession.rooms.reduce(
      (sum, room) => sum + room.items.filter(i => i.done).length,
      0
    );

    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  }, [activeSession]);

  return (
    <div className={`space-y-6 ${isDark ? 'dark' : ''}`}>
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-pink-600" />
              Checklist Ménage
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ClipboardCheck className="w-4 h-4" />
                {stats.total} session(s)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {stats.completed} complétée(s)
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                Note moyenne: {stats.avgRating}/5
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowModal('new');
                setSelectedPropertyId(null);
                setSelectedBookingId(null);
                setAssignedTo('');
                setTeamMembers([]);
              }}
              className="bg-pink-600 text-white px-6 py-3 rounded-xl hover:bg-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nouvelle session
            </button>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <ClipboardCheck className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl p-4 border border-green-200 dark:border-green-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Complétées</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.completed}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-xl p-4 border border-orange-200 dark:border-orange-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-orange-600 dark:text-orange-300" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">En cours</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.inProgress}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Durée moy.</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.avgDuration}m</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Note</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.avgRating}/5</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Taux</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.completionRate}%</p>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setViewMode('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'active'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Session active
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'history'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Historique
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'stats'
                ? 'bg-pink-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Statistiques
          </button>
        </div>
      </motion.div>

      {/* Vue Session Active */}
      {viewMode === 'active' && activeSession && (
        <div className="space-y-6">
          {/* Informations session */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {properties.find(p => p.id === activeSession.propertyId)?.name || 'Propriété inconnue'}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {activeSession.assignedTo}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(activeSession.status)}`}>
                    {activeSession.status === 'pending' ? 'En attente' :
                     activeSession.status === 'in_progress' ? 'En cours' :
                     activeSession.status === 'paused' ? 'En pause' :
                     activeSession.status === 'completed' ? 'Terminée' : 'Vérifiée'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSession.status === 'pending' && (
                  <button
                    onClick={startSession}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Démarrer
                  </button>
                )}
                {activeSession.status === 'in_progress' && (
                  <>
                    <button
                      onClick={pauseSession}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                    <button
                      onClick={completeSession}
                      className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terminer
                    </button>
                  </>
                )}
                {activeSession.status === 'paused' && (
                  <button
                    onClick={resumeSession}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Reprendre
                  </button>
                )}
                <button
                  onClick={resetSession}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  title="Réinitialiser"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timer et progression */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Clock className="w-4 h-4" />
                  Temps écoulé
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(elapsedTime)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <Target className="w-4 h-4" />
                  Progression
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessionProgress.toFixed(0)}%
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${sessionProgress}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Tâches
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeSession.rooms.reduce((sum, r) => sum + (r.completedCount || 0), 0)} / {activeSession.rooms.reduce((sum, r) => sum + r.items.length, 0)}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Checklist par pièce */}
          <div className="space-y-4">
            {activeSession.rooms.map((room, roomIndex) => {
              const isExpanded = expandedRooms.includes(room.room);
              const completionRate = room.totalCount ? ((room.completedCount || 0) / room.totalCount) * 100 : 0;

              return (
                <motion.div
                  key={room.room}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: roomIndex * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <button
                    onClick={() => toggleRoom(room.room)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${room.color} flex items-center justify-center text-2xl shadow-lg`}>
                        {room.icon}
                      </div>
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {room.room}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {room.completedCount} / {room.totalCount} tâches
                          </span>
                          <span className="text-sm font-medium text-pink-600">
                            {completionRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`bg-gradient-to-r ${room.color} h-2 rounded-full transition-all`}
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-200 dark:border-gray-700"
                      >
                        <div className="p-6 space-y-3">
                          {room.items.map((item) => (
                            <motion.div
                              key={item.id}
                              whileHover={{ scale: 1.01 }}
                              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                                item.done
                                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-700'
                              }`}
                            >
                              <button
                                onClick={() => toggleItem(roomIndex, item.id)}
                                className="mt-1"
                              >
                                {item.done ? (
                                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Circle className="w-6 h-6 text-gray-400" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className={`font-medium ${
                                    item.done
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {item.label}
                                  </span>
                                  {item.priority && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                                      {item.priority === 'critical' ? 'Critique' :
                                       item.priority === 'high' ? 'Haute' :
                                       item.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                    </span>
                                  )}
                                  {item.estimatedTime && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {item.estimatedTime}m
                                    </span>
                                  )}
                                </div>
                                {item.completedBy && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Terminé par {item.completedBy} à {formatDate(item.completedAt!)}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Notes de session */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Notes de session
            </h4>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Ajoutez des remarques, observations ou problèmes rencontrés..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white resize-none"
              rows={4}
            />
          </motion.div>
        </div>
      )}

      {/* Vue Historique */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          {/* Filtres */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="completed">Complétées</option>
                <option value="in_progress">En cours</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulées</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="date">Date</option>
                <option value="property">Propriété</option>
                <option value="duration">Durée</option>
                <option value="rating">Note</option>
              </select>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSortBy('date');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réinitialiser
              </button>
            </div>
          </motion.div>

          {/* Liste des sessions */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredSessions.map((session, index) => {
                const property = properties.find(p => p.id === session.propertyId);
                const duration = session.startedAt && session.completedAt
                  ? Math.floor((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
                  : 0;
                const completionRate = session.rooms.reduce((sum, r) => sum + (r.completedCount || 0), 0) / 
                                      session.rooms.reduce((sum, r) => sum + r.items.length, 0) * 100;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                            {property?.name || 'Propriété inconnue'}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {session.status === 'completed' ? 'Terminée' : session.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {session.assignedTo}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(session.createdAt)}
                          </div>
                          {duration > 0 && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {formatDuration(duration)}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            {completionRate.toFixed(0)}% complété
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setActiveSessionId(session.id);
                            setViewMode('active');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => duplicateSession(session.id)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Dupliquer"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-16">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 text-lg dark:text-gray-400">Aucune session trouvée</div>
            </div>
          )}
        </div>
      )}

      {/* Vue Statistiques */}
      {viewMode === 'stats' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Statistiques détaillées (à venir)
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Graphiques, tendances, et analyses approfondies seront disponibles ici.
          </p>
        </div>
      )}

      {/* Modal Nouvelle session */}
      <AnimatePresence>
        {showModal === 'new' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouvelle session de ménage
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Propriété *
                  </label>
                  <select
                    value={selectedPropertyId || ''}
                    onChange={(e) => setSelectedPropertyId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Sélectionner une propriété</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Réservation (optionnel)
                  </label>
                  <select
                    value={selectedBookingId || ''}
                    onChange={(e) => setSelectedBookingId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                    disabled={!selectedPropertyId}
                  >
                    <option value="">Aucune réservation</option>
                    {selectedPropertyId && bookings
                      .filter(b => b.propertyId === selectedPropertyId)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          Réservation #{b.id} - {new Date(b.checkIn).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Assigné à
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Nom de la personne"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowModal(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createSession}
                    disabled={!selectedPropertyId}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
