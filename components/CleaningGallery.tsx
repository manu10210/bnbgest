'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useBNB, Property, Booking } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, CheckCircle, Circle, Clock, Home, Eye, X, Plus, 
  ChevronLeft, ChevronRight, Image as ImageIcon, AlertTriangle,
  User, Calendar, MapPin, Star, Award, TrendingUp, Filter,
  Search, Edit, Trash2, Download, Share2, Printer, Grid,
  List, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCw,
  Upload, FolderOpen, Tag, MessageSquare, ThumbsUp, ThumbsDown,
  Copy, Archive, CheckSquare, XSquare, Layers, SlidersHorizontal,
  BarChart3, PieChart, Activity, Package, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface CleaningPhoto {
  id: string;
  url: string;
  type: 'before' | 'after';
  room: string;
  timestamp: string;
  notes?: string;
  tags?: string[];
  rating?: number; // 1-5
  size?: number;
  width?: number;
  height?: number;
  uploadedBy?: string;
}

interface CleaningSession {
  id: string;
  propertyId: number;
  bookingId?: number;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'validated' | 'rejected';
  completedBy: string;
  validatedBy?: string;
  validatedAt?: string;
  rejectedReason?: string;
  rooms: string[];
  photos: CleaningPhoto[];
  notes: string;
  duration?: number; // minutes
  createdAt: string;
  overallRating?: number;
  quality?: 'excellent' | 'good' | 'average' | 'poor';
  issues?: { description: string; severity: 'low' | 'medium' | 'high'; photo?: string }[];
  beforeCount?: number;
  afterCount?: number;
}

interface ComparisonPair {
  before: CleaningPhoto;
  after: CleaningPhoto;
  room: string;
}

// ==================== CONSTANTES ====================

const ROOMS = [
  'bedroom', 'bathroom', 'kitchen', 'livingRoom', 'terrace', 
  'entrance', 'office', 'laundry', 'garage', 'garden'
] as const;

const ROOM_ICONS: Record<string, string> = {
  bedroom: '🛏️', bathroom: '🚿', kitchen: '🍳',
  livingRoom: '🛋️', terrace: '🌿', entrance: '🚪',
  office: '💼', laundry: '🧺', garage: '🚗', garden: '🌻',
};

const ROOM_LABELS: Record<string, string> = {
  bedroom: 'Chambre', bathroom: 'Salle de bain', kitchen: 'Cuisine',
  livingRoom: 'Salon', terrace: 'Terrasse', entrance: 'Entrée',
  office: 'Bureau', laundry: 'Buanderie', garage: 'Garage', garden: 'Jardin',
};

const STORAGE_KEY = 'bnbgest_cleaning_gallery';
const APP_STATE_KEY = 'cleaning_gallery_sessions';

// ==================== HELPERS ====================

function loadSessions(): CleaningSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { 
    return []; 
  }
}

function saveSessions(sessions: CleaningSession[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }
}

async function loadSessionsFromDb(): Promise<CleaningSession[] | null> {
  try {
    const res = await fetch(`/api/app-state?key=${encodeURIComponent(APP_STATE_KEY)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return Array.isArray(payload?.value) ? (payload.value as CleaningSession[]) : null;
  } catch {
    return null;
  }
}

async function saveSessionsToDb(sessions: CleaningSession[]) {
  try {
    await fetch('/api/app-state', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: APP_STATE_KEY, value: sessions }),
    });
  } catch {
    // silent fallback to local only
  }
}

// ==================== COMPONENT ====================

export default function CleaningGallery() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();

  // États principaux
  const [sessions, setSessions] = useState<CleaningSession[]>(() => loadSessions());
  const [selectedSession, setSelectedSession] = useState<CleaningSession | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<CleaningPhoto | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'comparison'>('grid');
  const [showNewSession, setShowNewSession] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const sessionsHydratedRef = useRef(false);

  // Filtres et recherche
  const [filterProperty, setFilterProperty] = useState<number | ''>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRoom, setFilterRoom] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'property' | 'status' | 'rating'>('date');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Vue photo
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoRotation, setPhotoRotation] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [slideShowActive, setSlideShowActive] = useState(false);

  // Nouveau formulaire session
  const [newSession, setNewSession] = useState({
    propertyId: '',
    bookingId: '',
    completedBy: '',
    rooms: [] as string[],
    notes: '',
  });

  // Sauvegarde automatique
  useEffect(() => { 
    saveSessions(sessions); 
    if (!sessionsHydratedRef.current) return;

    const t = setTimeout(() => {
      void saveSessionsToDb(sessions);
    }, 500);

    return () => clearTimeout(t);
  }, [sessions]);

  useEffect(() => {
    let cancelled = false;

    const hydrateSessions = async () => {
      const remote = await loadSessionsFromDb();
      if (!cancelled && remote && remote.length > 0) {
        setSessions(remote);
      }
      if (!cancelled) {
        sessionsHydratedRef.current = true;
      }
    };

    void hydrateSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Slideshow
  useEffect(() => {
    if (!slideShowActive || !selectedSession) return;
    const timer = setInterval(() => {
      setCurrentPhotoIndex(prev => (prev + 1) % selectedSession.photos.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [slideShowActive, selectedSession]);

  // Statistiques
  const stats = useMemo(() => {
    const total = sessions.length;
    const validated = sessions.filter(s => s.status === 'validated').length;
    const pending = sessions.filter(s => s.status === 'pending').length;
    const inProgress = sessions.filter(s => s.status === 'in_progress').length;
    const totalPhotos = sessions.reduce((sum, s) => sum + s.photos.length, 0);
    const avgPhotosPerSession = total > 0 ? (totalPhotos / total).toFixed(1) : '0';
    const avgRating = sessions
      .filter(s => s.overallRating)
      .reduce((sum, s) => sum + (s.overallRating || 0), 0) / (sessions.filter(s => s.overallRating).length || 1);

    return {
      total,
      validated,
      pending,
      inProgress,
      totalPhotos,
      avgPhotosPerSession,
      avgRating: avgRating.toFixed(1),
      validationRate: total > 0 ? ((validated / total) * 100).toFixed(0) : '0',
    };
  }, [sessions]);

  // Sessions filtrées
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    if (filterProperty) {
      filtered = filtered.filter(s => s.propertyId === filterProperty);
    }

    if (filterStatus) {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    if (filterRoom) {
      filtered = filtered.filter(s => s.rooms.includes(filterRoom));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const property = properties.find(p => p.id === s.propertyId);
        return (
          property?.name.toLowerCase().includes(query) ||
          s.completedBy.toLowerCase().includes(query) ||
          s.notes.toLowerCase().includes(query)
        );
      });
    }

    if (dateRange.start) {
      filtered = filtered.filter(s => new Date(s.date) >= new Date(dateRange.start));
    }

    if (dateRange.end) {
      filtered = filtered.filter(s => new Date(s.date) <= new Date(dateRange.end));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'property':
          const propA = properties.find(p => p.id === a.propertyId)?.name || '';
          const propB = properties.find(p => p.id === b.propertyId)?.name || '';
          return propA.localeCompare(propB);
        case 'status':
          return a.status.localeCompare(b.status);
        case 'rating':
          return (b.overallRating || 0) - (a.overallRating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, filterProperty, filterStatus, filterRoom, searchQuery, sortBy, dateRange, properties]);

  // Paires de comparaison
  const comparisonPairs = useMemo(() => {
    if (!selectedSession) return [];

    const pairs: ComparisonPair[] = [];
    selectedSession.rooms.forEach(room => {
      const beforePhotos = selectedSession.photos.filter(p => p.room === room && p.type === 'before');
      const afterPhotos = selectedSession.photos.filter(p => p.room === room && p.type === 'after');

      const maxLength = Math.max(beforePhotos.length, afterPhotos.length);
      for (let i = 0; i < maxLength; i++) {
        if (beforePhotos[i] || afterPhotos[i]) {
          pairs.push({
            before: beforePhotos[i],
            after: afterPhotos[i],
            room,
          });
        }
      }
    });

    return pairs;
  }, [selectedSession]);

  // Fonctions utilitaires
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
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      validated: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }, []);

  const getStatusLabel = useCallback((status: string) => {
    const labels = {
      pending: 'En attente',
      in_progress: 'En cours',
      completed: 'Terminée',
      validated: 'Validée',
      rejected: 'Rejetée',
    };
    return labels[status as keyof typeof labels] || status;
  }, []);

  // Actions CRUD
  const createSession = useCallback(() => {
    if (!newSession.propertyId || !newSession.completedBy || newSession.rooms.length === 0) {
      toast.error('Formulaire incomplet', {
        description: 'Veuillez remplir tous les champs obligatoires',
        duration: 4000
      });
      return;
    }

    const booking = newSession.bookingId ? bookings.find(b => b.id === parseInt(newSession.bookingId)) : null;

    const session: CleaningSession = {
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      propertyId: parseInt(newSession.propertyId),
      bookingId: newSession.bookingId ? parseInt(newSession.bookingId) : undefined,
      date: new Date().toISOString(),
      status: 'in_progress',
      completedBy: newSession.completedBy,
      rooms: newSession.rooms,
      photos: [],
      notes: newSession.notes,
      createdAt: new Date().toISOString(),
      beforeCount: 0,
      afterCount: 0,
    };

    setSessions(prev => [session, ...prev]);
    setShowNewSession(false);
    setSelectedSession(session);
    setNewSession({ propertyId: '', bookingId: '', completedBy: '', rooms: [], notes: '' });
  }, [newSession, bookings]);

  const handleAddPhoto = useCallback((sessionId: string, room: string, type: 'before' | 'after') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const photo: CleaningPhoto = {
              id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              url: ev.target?.result as string,
              type,
              room,
              timestamp: new Date().toISOString(),
              size: file.size,
              width: img.width,
              height: img.height,
              uploadedBy: sessions.find(s => s.id === sessionId)?.completedBy,
            };

            setSessions(prev => prev.map(s => {
              if (s.id === sessionId) {
                const newPhotos = [...s.photos, photo];
                return {
                  ...s,
                  photos: newPhotos,
                  beforeCount: newPhotos.filter(p => p.type === 'before').length,
                  afterCount: newPhotos.filter(p => p.type === 'after').length,
                };
              }
              return s;
            }));
          };
          img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  }, [sessions]);

  const deletePhoto = useCallback((sessionId: string, photoId: string) => {
    if (!confirm('Supprimer cette photo ?')) return;

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const newPhotos = s.photos.filter(p => p.id !== photoId);
        return {
          ...s,
          photos: newPhotos,
          beforeCount: newPhotos.filter(p => p.type === 'before').length,
          afterCount: newPhotos.filter(p => p.type === 'after').length,
        };
      }
      return s;
    }));

    if (viewingPhoto?.id === photoId) {
      setViewingPhoto(null);
    }
  }, [viewingPhoto]);

  const completeSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, status: 'completed' as const } : s
    ));
  }, []);

  const validateSession = useCallback((sessionId: string, rating?: number) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? {
        ...s,
        status: 'validated' as const,
        validatedBy: 'Admin',
        validatedAt: new Date().toISOString(),
        overallRating: rating,
      } : s
    ));
  }, []);

  const rejectSession = useCallback((sessionId: string, reason: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? {
        ...s,
        status: 'rejected' as const,
        rejectedReason: reason,
      } : s
    ));
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    if (!confirm('Supprimer cette session de ménage ?')) return;
    
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
    }
  }, [selectedSession]);

  const duplicateSession = useCallback((sessionId: string) => {
    const original = sessions.find(s => s.id === sessionId);
    if (!original) return;

    const duplicate: CleaningSession = {
      ...original,
      id: `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      photos: [],
      validatedBy: undefined,
      validatedAt: undefined,
      overallRating: undefined,
      beforeCount: 0,
      afterCount: 0,
    };

    setSessions(prev => [duplicate, ...prev]);
    setSelectedSession(duplicate);
  }, [sessions]);

  const toggleRoom = useCallback((room: string) => {
    setNewSession(prev => ({
      ...prev,
      rooms: prev.rooms.includes(room) 
        ? prev.rooms.filter(r => r !== room) 
        : [...prev.rooms, room],
    }));
  }, []);

  const exportSession = useCallback((session: CleaningSession) => {
    const property = properties.find(p => p.id === session.propertyId);
    const data = {
      session,
      property,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleaning-session-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [properties]);

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
              <Camera className="w-8 h-8 text-indigo-600" />
              Galerie Avant/Après Ménage
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                {stats.totalPhotos} photo(s)
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {stats.validated} validée(s)
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                Note moyenne: {stats.avgRating}/5
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewSession(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
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
              <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Validées</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.validated}</p>
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
            className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl p-4 border border-green-200 dark:border-green-700"
          >
            <div className="flex items-center gap-3 mb-2">
              <ImageIcon className="w-6 h-6 text-green-600 dark:text-green-300" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Photos</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalPhotos}</p>
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
              <TrendingUp className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Taux</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.validationRate}%</p>
          </motion.div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Toutes les propriétés</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminée</option>
            <option value="validated">Validée</option>
            <option value="rejected">Rejetée</option>
          </select>

          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Toutes les pièces</option>
            {ROOMS.map(room => (
              <option key={room} value={room}>
                {ROOM_ICONS[room]} {ROOM_LABELS[room]}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'property' | 'status' | 'rating')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="date">Date</option>
            <option value="property">Propriété</option>
            <option value="status">Statut</option>
            <option value="rating">Note</option>
          </select>
        </div>

        {/* Modes de vue */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Grid className="w-4 h-4" />
            Grille
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
            Liste
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'comparison'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Comparaison
          </button>
        </div>
      </motion.div>

      {/* Vue Grille */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredSessions.map((session, index) => {
              const property = properties.find(p => p.id === session.propertyId);
              const beforePhotos = session.photos.filter(p => p.type === 'before');
              const afterPhotos = session.photos.filter(p => p.type === 'after');

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  {/* Aperçu photo */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    {session.photos.length > 0 ? (
                      <div className="grid grid-cols-2 h-full">
                        <div className="relative overflow-hidden">
                          {beforePhotos[0] ? (
                            <img
                              src={beforePhotos[0].url}
                              alt="Avant"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700">
                              <span className="text-xs text-gray-400">Avant</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-red-500/90 text-white text-[10px] px-2 py-1 rounded font-medium">
                            AVANT
                          </span>
                        </div>
                        <div className="relative overflow-hidden border-l border-gray-300 dark:border-gray-600">
                          {afterPhotos[0] ? (
                            <img
                              src={afterPhotos[0].url}
                              alt="Après"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700">
                              <span className="text-xs text-gray-400">Après</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 bg-emerald-500/90 text-white text-[10px] px-2 py-1 rounded font-medium">
                            APRÈS
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-4 h-4 text-indigo-600" />
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {property?.name || `Propriété #${session.propertyId}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {session.completedBy}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {session.rooms.map(room => (
                        <span
                          key={room}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          {ROOM_ICONS[room]} {ROOM_LABELS[room]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-600 dark:text-gray-400">
                      <span>📷 {beforePhotos.length} avant</span>
                      <span>📸 {afterPhotos.length} après</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Vue Liste */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredSessions.map((session, index) => {
              const property = properties.find(p => p.id === session.propertyId);
              
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {property?.name || `Propriété #${session.propertyId}`}
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusLabel(session.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.date)}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {session.completedBy}
                        </div>
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          {session.photos.length} photos
                        </div>
                        {session.overallRating && (
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {session.overallRating}/5
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateSession(session.id);
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Dupliquer"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
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
      )}

      {/* Aucun résultat */}
      {filteredSessions.length === 0 && (
        <div className="text-center py-16">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 text-lg dark:text-gray-400">Aucune session trouvée</div>
        </div>
      )}

      {/* Modal Nouvelle session */}
      <AnimatePresence>
        {showNewSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewSession(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouvelle session de ménage
                </h3>
                <button
                  onClick={() => setShowNewSession(false)}
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
                    value={newSession.propertyId}
                    onChange={(e) => setNewSession({ ...newSession, propertyId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                    value={newSession.bookingId}
                    onChange={(e) => setNewSession({ ...newSession, bookingId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={!newSession.propertyId}
                  >
                    <option value="">Aucune réservation</option>
                    {newSession.propertyId && bookings
                      .filter(b => b.propertyId === parseInt(newSession.propertyId))
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          Réservation #{b.id} - {new Date(b.checkIn).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Effectué par *
                  </label>
                  <input
                    type="text"
                    value={newSession.completedBy}
                    onChange={(e) => setNewSession({ ...newSession, completedBy: e.target.value })}
                    placeholder="Nom de la personne"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pièces à nettoyer *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {ROOMS.map(room => (
                      <button
                        key={room}
                        onClick={() => toggleRoom(room)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                          newSession.rooms.includes(room)
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {ROOM_ICONS[room]} {ROOM_LABELS[room]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newSession.notes}
                    onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                    placeholder="Remarques, instructions spéciales..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowNewSession(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={createSession}
                    disabled={!newSession.propertyId || !newSession.completedBy || newSession.rooms.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Créer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Détails session */}
      <AnimatePresence>
        {selectedSession && !viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Session de ménage
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {properties.find(p => p.id === selectedSession.propertyId)?.name} - {formatDate(selectedSession.date)}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedSession.status)}`}>
                    {getStatusLabel(selectedSession.status)}
                  </span>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Informations */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Effectué par</div>
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedSession.completedBy}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Photos</div>
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      {selectedSession.photos.length}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pièces</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedSession.rooms.length}
                    </div>
                  </div>
                  {selectedSession.overallRating && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Note</div>
                      <div className="font-semibold text-yellow-600 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        {selectedSession.overallRating}/5
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2">
                  {selectedSession.status === 'completed' && (
                    <>
                      <button
                        onClick={() => {
                          const rating = prompt('Note de 1 à 5 :');
                          if (rating && !isNaN(parseInt(rating))) {
                            validateSession(selectedSession.id, parseInt(rating));
                          }
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Valider
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Raison du rejet :');
                          if (reason) {
                            rejectSession(selectedSession.id, reason);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <XSquare className="w-4 h-4" />
                        Rejeter
                      </button>
                    </>
                  )}
                  {selectedSession.status === 'in_progress' && (
                    <button
                      onClick={() => completeSession(selectedSession.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marquer terminée
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowComparison(true);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Mode comparaison
                  </button>
                  <button
                    onClick={() => exportSession(selectedSession)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                  <button
                    onClick={() => duplicateSession(selectedSession.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Dupliquer
                  </button>
                </div>

                {/* Notes */}
                {selectedSession.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-4 h-4 text-yellow-600" />
                      <span className="font-semibold text-yellow-900 dark:text-yellow-200">Notes</span>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{selectedSession.notes}</p>
                  </div>
                )}

                {/* Photos par pièce */}
                {showComparison ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Comparaison Avant/Après
                    </h4>
                    {comparisonPairs.map((pair, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-2xl">{ROOM_ICONS[pair.room]}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {ROOM_LABELS[pair.room]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            {pair.before ? (
                              <div
                                onClick={() => setViewingPhoto(pair.before)}
                                className="cursor-pointer group relative rounded-lg overflow-hidden"
                              >
                                <img
                                  src={pair.before.url}
                                  alt="Avant"
                                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                  <span className="text-white font-medium">AVANT</span>
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <button
                                  onClick={() => handleAddPhoto(selectedSession.id, pair.room, 'before')}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Plus className="w-8 h-8" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            {pair.after ? (
                              <div
                                onClick={() => setViewingPhoto(pair.after)}
                                className="cursor-pointer group relative rounded-lg overflow-hidden"
                              >
                                <img
                                  src={pair.after.url}
                                  alt="Après"
                                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                  <span className="text-white font-medium">APRÈS</span>
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <button
                                  onClick={() => handleAddPhoto(selectedSession.id, pair.room, 'after')}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Plus className="w-8 h-8" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedSession.rooms.map(room => {
                      const beforePhotos = selectedSession.photos.filter(p => p.room === room && p.type === 'before');
                      const afterPhotos = selectedSession.photos.filter(p => p.room === room && p.type === 'after');

                      return (
                        <div key={room} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{ROOM_ICONS[room]}</span>
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {ROOM_LABELS[room]}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddPhoto(selectedSession.id, room, 'before')}
                                className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                              >
                                <Camera className="w-3 h-3" />
                                Avant
                              </button>
                              <button
                                onClick={() => handleAddPhoto(selectedSession.id, room, 'after')}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                <Camera className="w-3 h-3" />
                                Après
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                AVANT ({beforePhotos.length})
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {beforePhotos.map(photo => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setViewingPhoto(photo)}
                                    className="cursor-pointer group relative rounded-lg overflow-hidden aspect-square"
                                  >
                                    <img
                                      src={photo.url}
                                      alt="Avant"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                      <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deletePhoto(selectedSession.id, photo.id);
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                APRÈS ({afterPhotos.length})
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {afterPhotos.map(photo => (
                                  <div
                                    key={photo.id}
                                    onClick={() => setViewingPhoto(photo)}
                                    className="cursor-pointer group relative rounded-lg overflow-hidden aspect-square"
                                  >
                                    <img
                                      src={photo.url}
                                      alt="Après"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                      <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deletePhoto(selectedSession.id, photo.id);
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Visualisation photo */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50"
            onClick={() => setViewingPhoto(null)}
          >
            <button
              onClick={() => setViewingPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-50"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Contrôles */}
            <div className="absolute top-4 left-4 flex gap-2 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoZoom(prev => Math.min(prev + 25, 300));
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoZoom(prev => Math.max(prev - 25, 50));
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoRotation(prev => (prev + 90) % 360);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPhotoZoom(100);
                  setPhotoRotation(0);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Infos photo */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white p-4 rounded-lg z-50 max-w-md">
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    viewingPhoto.type === 'before' ? 'bg-red-500' : 'bg-green-500'
                  }`}>
                    {viewingPhoto.type === 'before' ? 'AVANT' : 'APRÈS'}
                  </span>
                  <span>{ROOM_ICONS[viewingPhoto.room]} {ROOM_LABELS[viewingPhoto.room]}</span>
                </div>
                <div className="text-xs text-gray-300">
                  {new Date(viewingPhoto.timestamp).toLocaleString('fr-FR')}
                </div>
                {viewingPhoto.width && viewingPhoto.height && (
                  <div className="text-xs text-gray-300">
                    {viewingPhoto.width} × {viewingPhoto.height} px
                  </div>
                )}
                {viewingPhoto.uploadedBy && (
                  <div className="text-xs text-gray-300">
                    Par {viewingPhoto.uploadedBy}
                  </div>
                )}
              </div>
            </div>

            {/* Image */}
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={viewingPhoto.url}
              alt={`${viewingPhoto.type} - ${viewingPhoto.room}`}
              className="max-w-[90vw] max-h-[90vh] object-contain"
              style={{
                transform: `scale(${photoZoom / 100}) rotate(${photoRotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
