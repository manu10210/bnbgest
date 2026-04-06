'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useBNB, Guest } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Mail, Phone, MapPin, Globe, Calendar, DollarSign,
  Star, TrendingUp, Award, Shield, AlertCircle, CheckCircle,
  XCircle, Search, Filter, Plus, Edit, Trash2, Eye, Download,
  Send, MessageSquare, Ban, UserCheck, UserX, Heart, Flag,
  CreditCard, Package, Clock, BarChart3, PieChart, RefreshCw,
  Upload, ChevronDown, ChevronUp, X, Copy, Printer, Share2,
  FileText, Image, Settings, Zap, Target, Activity, Briefcase
} from 'lucide-react';

interface GuestManagerProps {
  compact?: boolean;
  showFilters?: boolean;
}

type ViewMode = 'table' | 'grid' | 'cards';
type GuestStatus = 'active' | 'inactive' | 'blocked';
type SortBy = 'name' | 'bookings' | 'spent' | 'rating' | 'recent';

interface ExtendedGuest extends Guest {
  lastBookingDate?: string;
  nextBookingDate?: string;
  averageStay?: number;
  favoriteProperty?: string;
  totalNights?: number;
  cancellationRate?: number;
  responseTime?: number;
  verificationLevel?: 'none' | 'email' | 'phone' | 'verified' | 'superhost';
  tags?: string[];
  notes?: string[];
  documents?: {
    id: string;
    type: 'passport' | 'id' | 'license' | 'other';
    verified: boolean;
    expiryDate?: string;
  }[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  loyaltyPoints?: number;
  vipStatus?: boolean;
  blacklisted?: boolean;
  blacklistReason?: string;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    language: string;
  };
  customFields?: { [key: string]: string };
}

const NATIONALITY_FLAGS: { [key: string]: string } = {
  'FR': '🇫🇷', 'GB': '🇬🇧', 'US': '🇺🇸', 'DE': '🇩🇪', 'ES': '🇪🇸',
  'IT': '🇮🇹', 'PT': '🇵🇹', 'BE': '🇧🇪', 'NL': '🇳🇱', 'CH': '🇨🇭',
  'CA': '🇨🇦', 'AU': '🇦🇺', 'BR': '🇧🇷', 'JP': '🇯🇵', 'CN': '🇨🇳',
};

const LANGUAGE_FLAGS: { [key: string]: string } = {
  'fr': '🇫🇷 Français',
  'en': '🇬🇧 English',
  'es': '🇪🇸 Español',
  'de': '🇩🇪 Deutsch',
  'it': '🇮🇹 Italiano',
  'pt': '🇵🇹 Português',
};

export default function GuestManager({ compact = false, showFilters = true }: GuestManagerProps) {
  const { guests, bookings, properties, addGuest, updateGuest } = useBNB();
  const { isDark } = useTheme();

  // États principaux
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('bookings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGuest, setSelectedGuest] = useState<ExtendedGuest | null>(null);
  const [showModal, setShowModal] = useState<
    'details' | 'edit' | 'new' | 'bookings' | 'communication' | 'documents' | null
  >(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());
  const [showFiltersPanel, setShowFiltersPanel] = useState(showFilters);

  // États pour le formulaire
  const [editForm, setEditForm] = useState<Partial<ExtendedGuest>>({});
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Enrichir les données guests
  const extendedGuests: ExtendedGuest[] = useMemo(() => {
    return guests.map(guest => {
      const guestBookings = bookings.filter(b => b.guestId === guest.id);
      const completedBookings = guestBookings.filter(b => b.status === 'completed');
      const cancelledBookings = guestBookings.filter(b => b.status === 'cancelled');
      
      const lastBooking = guestBookings.sort((a, b) => 
        new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime()
      )[0];
      
      const nextBooking = guestBookings
        .filter(b => new Date(b.checkIn) > new Date())
        .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())[0];

      const totalNights = completedBookings.reduce((sum, b) => {
        const nights = Math.ceil(
          (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + nights;
      }, 0);

      const averageStay = completedBookings.length > 0 ? totalNights / completedBookings.length : 0;
      const cancellationRate = guestBookings.length > 0 
        ? (cancelledBookings.length / guestBookings.length) * 100 
        : 0;

      // Trouver la propriété favorite
      const propertyBookings = completedBookings.reduce((acc, booking) => {
        acc[booking.propertyId] = (acc[booking.propertyId] || 0) + 1;
        return acc;
      }, {} as { [key: number]: number });
      
      const favoritePropertyId = Object.entries(propertyBookings).sort((a, b) => b[1] - a[1])[0]?.[0];
      const favoriteProperty = favoritePropertyId 
        ? properties.find(p => p.id === parseInt(favoritePropertyId))?.name 
        : undefined;

      return {
        ...guest,
        lastBookingDate: lastBooking?.checkOut,
        nextBookingDate: nextBooking?.checkIn,
        averageStay,
        favoriteProperty,
        totalNights,
        cancellationRate,
        responseTime: 1 + ((guest.id * 1013 + 7) % 23), // Stable seeded, no Math.random
        verificationLevel: guest.status === 'active' 
          ? (['email', 'phone', 'verified', 'superhost'] as const)[((guest.id * 2654435761) >>> 0) % 4]
          : 'none' as const,
        tags: ['Régulier', 'Recommandé'].filter((_, i) => ((guest.id * (i + 1) * 31337) >>> 0) % 2 === 0),
        loyaltyPoints: guest.totalBookings * 100,
        vipStatus: guest.totalBookings >= 5,
        blacklisted: guest.status === 'blocked',
        communicationPreferences: {
          email: true,
          sms: ((guest.id * 997) >>> 0) % 2 === 0,
          whatsapp: ((guest.id * 1009) >>> 0) % 3 !== 0,
          language: guest.language,
        },
      };
    });
  }, [guests, bookings, properties]);

  // Filtrage et tri
  const filteredGuests = useMemo(() => {
    let filtered = [...extendedGuests];

    // Filtre de statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(g => g.status === statusFilter);
    }

    // Filtre de vérification
    if (verificationFilter !== 'all') {
      filtered = filtered.filter(g => g.verificationLevel === verificationFilter);
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.name.toLowerCase().includes(query) ||
        g.email.toLowerCase().includes(query) ||
        g.phone?.toLowerCase().includes(query) ||
        g.nationality?.toLowerCase().includes(query)
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'bookings':
          comparison = a.totalBookings - b.totalBookings;
          break;
        case 'spent':
          comparison = a.totalSpent - b.totalSpent;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'recent':
          comparison = new Date(b.lastBookingDate || 0).getTime() - new Date(a.lastBookingDate || 0).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [extendedGuests, statusFilter, verificationFilter, searchQuery, sortBy, sortOrder]);

  // Statistiques
  const stats = useMemo(() => {
    const total = filteredGuests.length;
    const active = filteredGuests.filter(g => g.status === 'active').length;
    const inactive = filteredGuests.filter(g => g.status === 'inactive').length;
    const blocked = filteredGuests.filter(g => g.status === 'blocked').length;
    const vip = filteredGuests.filter(g => g.vipStatus).length;
    const verified = filteredGuests.filter(g => g.verificationLevel === 'verified' || g.verificationLevel === 'superhost').length;
    
    const totalRevenue = filteredGuests.reduce((sum, g) => sum + g.totalSpent, 0);
    const totalBookings = filteredGuests.reduce((sum, g) => sum + g.totalBookings, 0);
    const avgRating = total > 0 
      ? filteredGuests.reduce((sum, g) => sum + g.rating, 0) / total 
      : 0;
    const avgSpent = total > 0 ? totalRevenue / total : 0;
    const avgBookings = total > 0 ? totalBookings / total : 0;

    return {
      total, active, inactive, blocked, vip, verified,
      totalRevenue, totalBookings, avgRating, avgSpent, avgBookings
    };
  }, [filteredGuests]);

  // Fonctions utilitaires
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status as keyof typeof colors] || colors.inactive;
  };

  const getVerificationBadge = (level: string) => {
    const badges = {
      none: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-700', icon: XCircle, label: 'Non vérifié' },
      email: { color: 'bg-blue-100 text-blue-600 dark:bg-blue-900', icon: Mail, label: 'Email vérifié' },
      phone: { color: 'bg-purple-100 text-purple-600 dark:bg-purple-900', icon: Phone, label: 'Téléphone vérifié' },
      verified: { color: 'bg-green-100 text-green-600 dark:bg-green-900', icon: CheckCircle, label: 'Vérifié' },
      superhost: { color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900', icon: Star, label: 'Superhost' },
    };
    return badges[level as keyof typeof badges] || badges.none;
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  // Actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedGuests.size === 0) {
      toast.error('Veuillez sélectionner au moins un voyageur');
      return;
    }

    switch (action) {
      case 'export':
        const csv = filteredGuests
          .filter(g => selectedGuests.has(g.id))
          .map(g => `${g.id},${g.name},${g.email},${g.phone},${g.totalBookings},${g.totalSpent},${g.rating},${g.status}`)
          .join('\n');
        const blob = new Blob(['ID,Name,Email,Phone,Bookings,Spent,Rating,Status\n' + csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voyageurs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        break;
      
      case 'email':
        toast.info(`Envoi d'emails à ${selectedGuests.size} voyageurs...`);
        break;
      
      case 'activate':
        if (confirm(`Activer ${selectedGuests.size} voyageurs ?`)) {
          selectedGuests.forEach(id => {
            const guest = guests.find(g => g.id === id);
            if (guest) updateGuest(id, { status: 'active' });
          });
          setSelectedGuests(new Set());
        }
        break;
      
      case 'deactivate':
        if (confirm(`Désactiver ${selectedGuests.size} voyageurs ?`)) {
          selectedGuests.forEach(id => {
            const guest = guests.find(g => g.id === id);
            if (guest) updateGuest(id, { status: 'inactive' });
          });
          setSelectedGuests(new Set());
        }
        break;
    }
  }, [selectedGuests, filteredGuests, guests, updateGuest]);

  const toggleGuestSelection = useCallback((guestId: number) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) newSet.delete(guestId);
      else newSet.add(guestId);
      return newSet;
    });
  }, []);

  const handleSaveGuest = useCallback(() => {
    // Validation
    const errors: { [key: string]: string } = {};
    if (!editForm.name?.trim()) errors.name = 'Le nom est requis';
    if (!editForm.email?.trim()) errors.email = 'L\'email est requis';
    if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Email invalide';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (selectedGuest && selectedGuest.id) {
      // Mise à jour
      updateGuest(selectedGuest.id, editForm);
    } else {
      // Création
      const newGuest: Guest = {
        id: Math.max(0, ...guests.map(g => g.id)) + 1,
        name: editForm.name!,
        email: editForm.email!,
        phone: editForm.phone || '',
        language: editForm.language || 'fr',
        nationality: editForm.nationality,
        totalBookings: 0,
        totalSpent: 0,
        rating: 5,
        status: 'active',
        createdAt: new Date().toISOString(),
        preferences: editForm.preferences || {
          smoking: false,
          pets: false,
          parties: false,
          preferredAmenities: [],
        },
      };
      addGuest(newGuest);
    }

    setShowModal(null);
    setEditForm({});
    setFormErrors({});
  }, [editForm, selectedGuest, guests, addGuest, updateGuest]);

  return (
    <div className={`space-y-6 ${isDark ? 'dark' : ''}`}>
      {/* En-tête avec statistiques */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              Gestion des Voyageurs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {stats.total} voyageur(s)
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Revenus: {formatCurrency(stats.totalRevenue)}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                Note moyenne: {stats.avgRating.toFixed(1)}/5
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditForm({});
                setSelectedGuest(null);
                setShowModal('new');
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nouveau voyageur
            </button>
            <button
              onClick={() => handleBulkAction('export')}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Exporter
            </button>
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl p-4 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Actifs</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.active}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Inactifs</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.inactive}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-xl p-4 border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-3 mb-2">
              <Ban className="w-6 h-6 text-red-600 dark:text-red-300" />
              <span className="text-sm font-medium text-red-900 dark:text-red-100">Bloqués</span>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.blocked}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">VIP</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.vip}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Vérifiés</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.verified}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Réservations</span>
            </div>
            <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.totalBookings}</p>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ TOP GUESTS PODIUM ═══ */}
      {extendedGuests.length >= 3 && (() => {
        const topBySpend = [...extendedGuests].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);
        const getLoyaltyTier = (spent: number) => {
          if (spent >= 5000) return { label: 'Platine', color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: '💎' };
          if (spent >= 2000) return { label: 'Or', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: '🥇' };
          if (spent >= 500) return { label: 'Argent', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '🥈' };
          return { label: 'Bronze', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: '🥉' };
        };
        const podiumOrder = [1, 0, 2];
        const podiumHeights = ['h-20', 'h-28', 'h-14'];
        const medals = ['🥇', '🥈', '🥉'];
        return (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-amber-500" />
              Top Voyageurs — Fidélité
            </h3>
            <div className="flex items-end justify-center gap-4 mb-4">
              {podiumOrder.map((displayIdx) => {
                const guest = topBySpend[displayIdx];
                if (!guest) return null;
                const tier = getLoyaltyTier(guest.totalSpent);
                return (
                  <div key={guest.id} className="flex flex-col items-center gap-2 flex-1 max-w-[160px]">
                    <span className="text-2xl">{medals[displayIdx]}</span>
                    <div className={`w-full text-center p-3 rounded-xl border cursor-pointer hover:scale-105 transition-transform ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50'}`}
                      onClick={() => { setSelectedGuest(guest); setShowModal('details'); }}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mx-auto mb-1.5">
                        {guest.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{guest.name}</p>
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">{formatCurrency(guest.totalSpent)}</p>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${tier.bg} ${tier.color}`}>
                        {tier.icon} {tier.label}
                      </span>
                    </div>
                    <div className={`w-full rounded-t-xl ${isDark ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-indigo-100 border border-indigo-200'} ${podiumHeights[displayIdx]}`} />
                  </div>
                );
              })}
            </div>
            <p className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Classement par dépenses totales • {extendedGuests.filter(g => g.vipStatus).length} VIP au total
            </p>
          </motion.div>
        );
      })()}

      {/* Filtres */}
      {showFiltersPanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres et recherche
            </h3>
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Barre de recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone, nationalité..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Tous</option>
                  <option value="active">Actifs</option>
                  <option value="inactive">Inactifs</option>
                  <option value="blocked">Bloqués</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vérification
                </label>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Tous</option>
                  <option value="none">Non vérifiés</option>
                  <option value="email">Email vérifié</option>
                  <option value="phone">Téléphone vérifié</option>
                  <option value="verified">Vérifiés</option>
                  <option value="superhost">Superhosts</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trier par
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="name">Nom</option>
                  <option value="bookings">Réservations</option>
                  <option value="spent">Dépenses</option>
                  <option value="rating">Note</option>
                  <option value="recent">Récent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Affichage
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'table'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Liste
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Grille
                  </button>
                </div>
              </div>
            </div>

            {/* Actions groupées */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setVerificationFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Réinitialiser
                </button>
              </div>

              {selectedGuests.size > 0 && (
                <div className="flex gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                    {selectedGuests.size} sélectionné(s)
                  </span>
                  <button
                    onClick={() => handleBulkAction('activate')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Activer
                  </button>
                  <button
                    onClick={() => handleBulkAction('deactivate')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Désactiver
                  </button>
                  <button
                    onClick={() => handleBulkAction('email')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer email
                  </button>
                  <button
                    onClick={() => handleBulkAction('export')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Liste des voyageurs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
                        } else {
                          setSelectedGuests(new Set());
                        }
                      }}
                      checked={selectedGuests.size === filteredGuests.length && filteredGuests.length > 0}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Voyageur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Réservations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Dépenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Note
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredGuests.map((guest, index) => {
                    const isSelected = selectedGuests.has(guest.id);
                    const verificationBadge = getVerificationBadge(guest.verificationLevel || 'none');
                    const VerificationIcon = verificationBadge.icon;

                    return (
                      <motion.tr
                        key={guest.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleGuestSelection(guest.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                              {guest.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {guest.name}
                                </span>
                                {guest.vipStatus && (
                                  <span title="VIP">
                                    <Award className="w-4 h-4 text-yellow-500" />
                                  </span>
                                )}
                                {guest.totalSpent >= 5000 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600">💎 Platine</span>
                                ) : guest.totalSpent >= 2000 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">🥇 Or</span>
                                ) : guest.totalSpent >= 500 ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500">🥈 Argent</span>
                                ) : null}
                                {guest.nationality && (
                                  <span title={guest.nationality}>
                                    {NATIONALITY_FLAGS[guest.nationality] || '🌍'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <VerificationIcon className="w-3 h-3" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {verificationBadge.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                              <Mail className="w-3 h-3" />
                              {guest.email}
                            </div>
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mt-1">
                              <Phone className="w-3 h-3" />
                              {guest.phone || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(guest.status)}`}>
                            {guest.status === 'active' ? 'Actif' :
                             guest.status === 'inactive' ? 'Inactif' :
                             'Bloqué'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {guest.totalBookings} réservation(s)
                            </div>
                            {guest.totalNights && (
                              <div className="text-gray-500 dark:text-gray-400 text-xs">
                                {guest.totalNights} nuits
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {formatCurrency(guest.totalSpent)}
                          </div>
                          {guest.averageStay && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Moy. {guest.averageStay.toFixed(1)} nuits
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {getRatingStars(guest.rating)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {guest.rating.toFixed(1)}/5
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedGuest(guest);
                                setShowModal('details');
                              }}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"
                              title="Détails"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGuest(guest);
                                setEditForm(guest);
                                setShowModal('edit');
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                              title="Modifier"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGuest(guest);
                                setShowModal('communication');
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                              title="Contacter"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                            {guest.status !== 'blocked' ? (
                              <button
                                onClick={() => {
                                  if (confirm(`Bloquer ${guest.name} ?`)) {
                                    updateGuest(guest.id, { status: 'blocked' });
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"
                                title="Bloquer"
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => updateGuest(guest.id, { status: 'active' })}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                                title="Débloquer"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            <AnimatePresence>
              {filteredGuests.map((guest, index) => {
                const verificationBadge = getVerificationBadge(guest.verificationLevel || 'none');
                const VerificationIcon = verificationBadge.icon;

                return (
                  <motion.div
                    key={guest.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {guest.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {guest.name}
                            </h3>
                            {guest.vipStatus && (
                              <Award className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <VerificationIcon className="w-3 h-3" />
                            {verificationBadge.label}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(guest.status)}`}>
                        {guest.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4" />
                        {guest.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4" />
                        {guest.phone || '-'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {guest.totalBookings} réservations • {guest.totalNights || 0} nuits
                      </div>
                      <div className="flex items-center gap-1">
                        {getRatingStars(guest.rating)}
                        <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                          {guest.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total dépensé</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(guest.totalSpent)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedGuest(guest);
                          setShowModal('details');
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Détails
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGuest(guest);
                          setEditForm(guest);
                          setShowModal('edit');
                        }}
                        className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {filteredGuests.length === 0 && (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 text-lg dark:text-gray-400">Aucun voyageur trouvé</div>
            <div className="text-gray-400 text-sm mt-2 dark:text-gray-500">
              {searchQuery || statusFilter !== 'all' || verificationFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Aucun voyageur enregistré pour le moment'
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal Détails */}
      <AnimatePresence>
        {showModal === 'details' && selectedGuest && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Profil de {selectedGuest.name}
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Informations personnelles
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Email:</span> {selectedGuest.email}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Téléphone:</span> {selectedGuest.phone}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Langue:</span> {LANGUAGE_FLAGS[selectedGuest.language] || selectedGuest.language}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Nationalité:</span> {selectedGuest.nationality ? `${NATIONALITY_FLAGS[selectedGuest.nationality]} ${selectedGuest.nationality}` : '-'}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Membre depuis:</span> {formatDate(selectedGuest.createdAt)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Statistiques
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Réservations:</span> {selectedGuest.totalBookings}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Nuits totales:</span> {selectedGuest.totalNights || 0}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Dépenses totales:</span> {formatCurrency(selectedGuest.totalSpent)}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Note moyenne:</span> {selectedGuest.rating}/5 ⭐</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Dernière réservation:</span> {formatDate(selectedGuest.lastBookingDate)}</p>
                      {selectedGuest.favoriteProperty && (
                        <p><span className="text-gray-600 dark:text-gray-400">Propriété favorite:</span> {selectedGuest.favoriteProperty}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setShowModal('edit');
                    }}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setShowModal('communication');
                    }}
                    className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Contacter
                  </button>
                  <button
                    onClick={() => {
                      setShowModal('bookings');
                    }}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-5 h-5" />
                    Réservations
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Édition/Nouveau */}
      <AnimatePresence>
        {(showModal === 'edit' || showModal === 'new') && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {showModal === 'new' ? 'Nouveau voyageur' : `Modifier ${selectedGuest?.name}`}
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={`w-full px-3 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className={`w-full px-3 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white`}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Langue
                    </label>
                    <select
                      value={editForm.language || 'fr'}
                      onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      {Object.entries(LANGUAGE_FLAGS).map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nationalité
                    </label>
                    <select
                      value={editForm.nationality || ''}
                      onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Sélectionner...</option>
                      {Object.entries(NATIONALITY_FLAGS).map(([code, flag]) => (
                        <option key={code} value={code}>{flag} {code}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Statut
                    </label>
                    <select
                      value={editForm.status || 'active'}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as GuestStatus })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="blocked">Bloqué</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowModal(null)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveGuest}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {showModal === 'new' ? 'Créer' : 'Enregistrer'}
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
