'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useBNB, Booking } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar, Users, Clock, DollarSign, Mail, Phone, MapPin, FileText,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Download, Send,
  Filter, Search, Plus, Edit, Trash2, Eye, RefreshCw, Copy,
  CreditCard, Home, Star, MessageSquare, Bell, Printer,
  ChevronDown, ChevronUp, BarChart3, PieChart, Package,
  Wifi, Car, Coffee, Tv, Wind, Utensils, X
} from 'lucide-react';

interface BookingManagerProps {
  propertyId?: number;
  showFilters?: boolean;
}

type ViewMode = 'table' | 'grid' | 'calendar' | 'timeline';
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';

interface ExtendedBooking extends Booking {
  checkInTime?: string;
  checkOutTime?: string;
  roomType?: string;
  adults?: number;
  children?: number;
  pets?: boolean;
  smokingAllowed?: boolean;
  source?: 'direct' | 'airbnb' | 'booking' | 'vrbo' | 'other';
  commission?: number;
  deposit?: number;
  depositStatus?: 'pending' | 'received' | 'refunded';
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  discount?: number;
  totalNights?: number;
  pricePerNight?: number;
  guestNotes?: string;
  internalNotes?: string;
  cancellationDate?: string;
  cancellationReason?: string;
  rating?: number;
  review?: string;
  amenities?: string[];
  assignedStaff?: string[];
  checkInCompleted?: boolean;
  checkOutCompleted?: boolean;
  keyHandover?: boolean;
  depositReturned?: boolean;
  documentsVerified?: boolean;
  parkingSpot?: string;
  accessCode?: string;
  wifiPassword?: string;
}

const AMENITIES_ICONS: { [key: string]: any } = {
  wifi: Wifi,
  parking: Car,
  breakfast: Coffee,
  tv: Tv,
  ac: Wind,
  kitchen: Utensils,
};

export default function BookingManager({ propertyId, showFilters = true }: BookingManagerProps) {
  const { bookings, properties, updateBooking, cancelBooking, getBookingsByProperty, getProperty } = useBNB();
  const { isDark } = useTheme();

  // États principaux
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [propertyFilter, setPropertyFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<ExtendedBooking | null>(null);
  const [showModal, setShowModal] = useState<
    'details' | 'edit' | 'new' | 'checkin' | 'checkout' | 'payment' | 'communicate' | 'qr' | 'invoice' | null
  >(null);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'guest' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);

  // États pour le formulaire d'édition
  const [editForm, setEditForm] = useState<Partial<ExtendedBooking>>({});
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // États pour les statistiques
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
  });

  // Charger les réservations avec données étendues
  const extendedBookings: ExtendedBooking[] = useMemo(() => {
    // Stable seeded pseudo-random using booking ID to prevent flickering
    const seededInt = (id: number, mod: number, offset: number = 0) => ((id * 2654435761 + offset) >>> 0) % mod;
    const seededStr = (id: number, len: number) => {
      let s = '';
      for (let i = 0; i < len; i++) s += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[seededInt(id, 32, i * 1000)];
      return s;
    };
    return bookings.map(booking => ({
      ...booking,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      adults: Math.floor(booking.guests * 0.7),
      children: Math.floor(booking.guests * 0.3),
      source: (['direct', 'airbnb', 'booking', 'vrbo'] as const)[seededInt(booking.id, 4)],
      commission: booking.totalPrice * 0.15,
      deposit: booking.totalPrice * 0.3,
      depositStatus: 'received' as const,
      cleaningFee: 50,
      serviceFee: booking.totalPrice * 0.1,
      taxes: booking.totalPrice * 0.2,
      totalNights: Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
      pricePerNight: booking.totalPrice / Math.max(1, Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24))),
      amenities: ['wifi', 'parking', 'tv'],
      assignedStaff: [],
      checkInCompleted: booking.status === 'completed' || booking.status === 'confirmed',
      documentsVerified: booking.status === 'confirmed',
      accessCode: seededStr(booking.id, 6),
      wifiPassword: 'Welcome' + (1000 + seededInt(booking.id, 9000, 500)),
    }));
  }, [bookings]);

  // Filtrage et tri
  const filteredBookings = useMemo(() => {
    let filtered = propertyId ? extendedBookings.filter(b => b.propertyId === propertyId) : extendedBookings;

    if (propertyFilter !== 'all') filtered = filtered.filter(b => b.propertyId === propertyFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(b => b.status === statusFilter);
    if (paymentFilter !== 'all') filtered = filtered.filter(b => b.paymentStatus === paymentFilter);
    if (sourceFilter !== 'all') filtered = filtered.filter(b => b.source === sourceFilter);

    const now = new Date();
    if (dateFilter === 'today') {
      filtered = filtered.filter(b => {
        const checkIn = new Date(b.checkIn);
        return checkIn.toDateString() === now.toDateString();
      });
    } else if (dateFilter === 'week') {
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(b => new Date(b.checkIn) >= now && new Date(b.checkIn) <= weekFromNow);
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(b => {
        const checkIn = new Date(b.checkIn);
        return checkIn.getMonth() === now.getMonth() && checkIn.getFullYear() === now.getFullYear();
      });
    } else if (dateFilter === 'upcoming') {
      filtered = filtered.filter(b => new Date(b.checkIn) > now);
    } else if (dateFilter === 'current') {
      filtered = filtered.filter(b => new Date(b.checkIn) <= now && new Date(b.checkOut) >= now);
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(b => new Date(b.checkOut) < now);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.guestInfo.name.toLowerCase().includes(query) ||
        b.guestInfo.email.toLowerCase().includes(query) ||
        b.guestInfo.phone?.toLowerCase().includes(query) ||
        b.id.toString().includes(query) ||
        getProperty(b.propertyId)?.name.toLowerCase().includes(query)
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') comparison = new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
      else if (sortBy === 'price') comparison = a.totalPrice - b.totalPrice;
      else if (sortBy === 'guest') comparison = a.guestInfo.name.localeCompare(b.guestInfo.name);
      else if (sortBy === 'status') comparison = a.status.localeCompare(b.status);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [extendedBookings, propertyId, propertyFilter, statusFilter, paymentFilter, sourceFilter, dateFilter, searchQuery, sortBy, sortOrder, getProperty]);

  // Statistiques
  const stats = useMemo(() => {
    const total = filteredBookings.length;
    const confirmed = filteredBookings.filter(b => b.status === 'confirmed').length;
    const pending = filteredBookings.filter(b => b.status === 'pending').length;
    const noShow = filteredBookings.filter(b => b.status === 'no_show').length;
    const completed = filteredBookings.filter(b => b.status === 'completed').length;
    const cancelled = filteredBookings.filter(b => b.status === 'cancelled').length;
    
    const totalRevenue = filteredBookings
      .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const pendingPayments = filteredBookings
      .filter(b => b.paymentStatus === 'pending' || b.paymentStatus === 'partial')
      .reduce((sum, b) => sum + b.totalPrice, 0);
    
    const totalNights = filteredBookings.reduce((sum, b) => sum + (b.totalNights || 0), 0);
    const avgBookingValue = total > 0 ? totalRevenue / total : 0;
    const avgNights = total > 0 ? totalNights / total : 0;
    const occupancyRate = properties.length > 0 ? (totalNights / (properties.length * 365)) * 100 : 0;

    return {
      total, confirmed, pending, noShow, completed, cancelled,
      totalRevenue, pendingPayments, totalNights, avgBookingValue, avgNights, occupancyRate
    };
  }, [filteredBookings, properties]);

  // Fonctions utilitaires
  const formatDate = (dateString: string, includeTime = false) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getSourceColor = (source: string) => {
    const colors = {
      direct: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      airbnb: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      booking: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      vrbo: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[source as keyof typeof colors] || colors.other;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      completed: CheckCircle,
      cancelled: XCircle,
      no_show: AlertCircle,
    };
    return icons[status as keyof typeof icons] || Clock;
  };

  // Fonctions d'action
  const handleStatusChange = useCallback((bookingId: number, newStatus: BookingStatus) => {
    if (newStatus === 'cancelled') {
      if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
        cancelBooking(bookingId, 'Annulé par l\'administrateur');
      }
    } else {
      updateBooking(bookingId, { status: newStatus });
    }
  }, [cancelBooking, updateBooking]);

  const handleCheckIn = useCallback((booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setShowModal('checkin');
  }, []);

  const handleCheckOut = useCallback((booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setShowModal('checkout');
  }, []);

  const handlePayment = useCallback((booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setShowModal('payment');
  }, []);

  const toggleRowExpansion = useCallback((bookingId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) newSet.delete(bookingId);
      else newSet.add(bookingId);
      return newSet;
    });
  }, []);

  const toggleBookingSelection = useCallback((bookingId: number) => {
    setSelectedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) newSet.delete(bookingId);
      else newSet.add(bookingId);
      return newSet;
    });
  }, []);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedBookings.size === 0) {
      alert('Veuillez sélectionner au moins une réservation');
      return;
    }
    
    if (action === 'export') {
      // Export CSV
      const csv = filteredBookings
        .filter(b => selectedBookings.has(b.id))
        .map(b => `${b.id},${b.guestInfo.name},${b.guestInfo.email},${b.checkIn},${b.checkOut},${b.totalPrice},${b.status}`)
        .join('\n');
      const blob = new Blob(['ID,Guest,Email,Check-in,Check-out,Price,Status\n' + csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (action === 'email') {
      alert(`Envoi d'emails à ${selectedBookings.size} clients...`);
    } else if (action === 'confirm') {
      if (confirm(`Confirmer ${selectedBookings.size} réservations ?`)) {
        selectedBookings.forEach(id => updateBooking(id, { status: 'confirmed' }));
        setSelectedBookings(new Set());
      }
    }
  }, [selectedBookings, filteredBookings, updateBooking]);

  const downloadQRCode = useCallback((booking: ExtendedBooking) => {
    const canvas = document.createElement('canvas');
    const qrElement = document.getElementById(`qr-${booking.id}`);
    if (!qrElement) return;

    const svg = qrElement.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = 600;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 50, 100, 500, 500);
      
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Réservation #${booking.id}`, 300, 50);
      ctx.font = '18px Arial';
      ctx.fillText(booking.guestInfo.name, 300, 630);
      ctx.fillText(`${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`, 300, 660);

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-reservation-${booking.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, []);

  const printInvoice = useCallback((booking: ExtendedBooking) => {
    const property = getProperty(booking.propertyId);
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facture ${booking.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 40px; }
          .section { margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin: 10px 0; }
          .total { font-size: 20px; font-weight: bold; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FACTURE</h1>
          <p>Réservation #${booking.id}</p>
          <p>${formatDate(new Date().toISOString())}</p>
        </div>
        <div class="section">
          <h3>Informations client</h3>
          <p><strong>${booking.guestInfo.name}</strong></p>
          <p>${booking.guestInfo.email}</p>
          <p>${booking.guestInfo.phone || ''}</p>
        </div>
        <div class="section">
          <h3>Détails de la réservation</h3>
          <p>Propriété: ${property?.name}</p>
          <p>Arrivée: ${formatDate(booking.checkIn)} à ${booking.checkInTime || '15:00'}</p>
          <p>Départ: ${formatDate(booking.checkOut)} à ${booking.checkOutTime || '11:00'}</p>
          <p>Nombre de nuits: ${booking.totalNights}</p>
          <p>Nombre de personnes: ${booking.guests}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hébergement (${booking.totalNights} nuits × ${formatCurrency(booking.pricePerNight || 0)})</td>
              <td>${formatCurrency((booking.pricePerNight || 0) * (booking.totalNights || 0))}</td>
            </tr>
            ${booking.cleaningFee ? `<tr><td>Frais de nettoyage</td><td>${formatCurrency(booking.cleaningFee)}</td></tr>` : ''}
            ${booking.serviceFee ? `<tr><td>Frais de service</td><td>${formatCurrency(booking.serviceFee)}</td></tr>` : ''}
            ${booking.taxes ? `<tr><td>Taxes</td><td>${formatCurrency(booking.taxes)}</td></tr>` : ''}
            ${booking.discount ? `<tr><td>Réduction</td><td>-${formatCurrency(booking.discount)}</td></tr>` : ''}
            <tr class="total">
              <td><strong>TOTAL</strong></td>
              <td><strong>${formatCurrency(booking.totalPrice)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="section">
          <p>Statut du paiement: <strong>${booking.paymentStatus}</strong></p>
          ${booking.deposit ? `<p>Caution: ${formatCurrency(booking.deposit)}</p>` : ''}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }, [getProperty]);

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
              <Calendar className="w-8 h-8 text-indigo-600" />
              Gestion des Réservations
              {propertyId && getProperty(propertyId) && (
                <span className="text-xl font-normal text-gray-600 dark:text-gray-400">
                  - {getProperty(propertyId)?.name}
                </span>
              )}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {stats.total} réservation(s)
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Revenus: {formatCurrency(stats.totalRevenue)}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Taux d'occupation: {stats.occupancyRate.toFixed(1)}%
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditForm({});
                setShowModal('new');
              }}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nouvelle réservation
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-xl p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">En attente</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pending}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl p-4 border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">Confirmées</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.confirmed}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-300" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">No-show</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.noShow}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-300" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Terminées</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.completed}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900 dark:to-indigo-800 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Paiements</span>
            </div>
            <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{formatCurrency(stats.pendingPayments)}</p>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-xl p-4 border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-3 mb-2">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-300" />
              <span className="text-sm font-medium text-red-900 dark:text-red-100">Annulées</span>
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.cancelled}</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Barre d'outils et filtres */}
      {showFilters && (
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
              {showFiltersPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          <AnimatePresence>
            {showFiltersPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-4"
              >
                {/* Barre de recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, email, téléphone, ID, propriété..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {!propertyId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Propriété
                      </label>
                      <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="all">Toutes</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

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
                      <option value="pending">En attente</option>
                      <option value="confirmed">Confirmée</option>
                      <option value="completed">Terminée</option>
                      <option value="cancelled">Annulée</option>
                      <option value="no_show">No-show</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Paiement
                    </label>
                    <select
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">Tous</option>
                      <option value="pending">En attente</option>
                      <option value="partial">Partiel</option>
                      <option value="paid">Payé</option>
                      <option value="refunded">Remboursé</option>
                      <option value="failed">Échoué</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Période
                    </label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">Toutes</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="upcoming">À venir</option>
                      <option value="current">En cours</option>
                      <option value="past">Passées</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source
                    </label>
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">Toutes</option>
                      <option value="direct">Direct</option>
                      <option value="airbnb">Airbnb</option>
                      <option value="booking">Booking.com</option>
                      <option value="vrbo">VRBO</option>
                      <option value="other">Autre</option>
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

                {/* Boutons d'action */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setPaymentFilter('all');
                        setDateFilter('all');
                        setSourceFilter('all');
                        setPropertyFilter('all');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Réinitialiser
                    </button>
                  </div>

                  {selectedBookings.size > 0 && (
                    <div className="flex gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        {selectedBookings.size} sélectionnée(s)
                      </span>
                      <button
                        onClick={() => handleBulkAction('confirm')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Confirmer
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
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Liste des réservations */}
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
                          setSelectedBookings(new Set(filteredBookings.map(b => b.id)));
                        } else {
                          setSelectedBookings(new Set());
                        }
                      }}
                      checked={selectedBookings.size === filteredBookings.length && filteredBookings.length > 0}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else setSortBy('date');
                    }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      Réservation
                      {sortBy === 'date' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'guest') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else setSortBy('guest');
                    }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      Client
                      {sortBy === 'guest' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else setSortBy('status');
                    }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      Statut
                      {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Paiement
                  </th>
                  <th
                    onClick={() => {
                      if (sortBy === 'price') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else setSortBy('price');
                    }}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      Montant
                      {sortBy === 'price' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <AnimatePresence>
                  {filteredBookings.map((booking, index) => {
                    const property = getProperty(booking.propertyId);
                    const StatusIcon = getStatusIcon(booking.status);
                    const isExpanded = expandedRows.has(booking.id);
                    const isSelected = selectedBookings.has(booking.id);

                    return (
                      <React.Fragment key={booking.id}>
                        <motion.tr
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.02 }}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBookingSelection(booking.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                #{booking.id}
                                <StatusIcon className="w-4 h-4" />
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {property?.name}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {booking.guestInfo.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {booking.guestInfo.email}
                              </div>
                              {booking.guestInfo.phone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {booking.guestInfo.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(booking.checkIn)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                au {formatDate(booking.checkOut)}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {booking.totalNights} nuit(s) • {booking.guests} pers.
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSourceColor(booking.source || 'other')}`}>
                              {booking.source?.toUpperCase() || 'AUTRE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={booking.status}
                              onChange={(e) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
                              className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)} border-0 cursor-pointer`}
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmée</option>
                              <option value="completed">Terminée</option>
                              <option value="cancelled">Annulée</option>
                              <option value="no_show">No-show</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                                {booking.paymentStatus === 'paid' ? 'Payé' :
                                 booking.paymentStatus === 'pending' ? 'En attente' :
                                 booking.paymentStatus === 'refunded' ? 'Remboursé' :
                                 booking.paymentStatus === 'partial' ? 'Partiel' :
                                 booking.paymentStatus === 'failed' ? 'Échoué' : booking.paymentStatus}
                              </span>
                              {booking.deposit && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Caution: {formatCurrency(booking.deposit)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(booking.totalPrice)}
                              </div>
                              {booking.pricePerNight && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(booking.pricePerNight)}/nuit
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowModal('payment');
                                }}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1"
                                title="Paiement"
                              >
                                <CreditCard className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setEditForm(booking);
                                  setShowModal('edit');
                                }}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"
                                title="Modifier"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => printInvoice(booking)}
                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                                title="Imprimer facture"
                              >
                                <Printer className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleRowExpansion(booking.id)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </td>
                        </motion.tr>

                        {/* Ligne de détails étendue */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <td colSpan={10} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">Détails financiers</h4>
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Hébergement:</span>
                                        <span className="font-medium">{formatCurrency((booking.pricePerNight || 0) * (booking.totalNights || 0))}</span>
                                      </div>
                                      {booking.cleaningFee && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Nettoyage:</span>
                                          <span className="font-medium">{formatCurrency(booking.cleaningFee)}</span>
                                        </div>
                                      )}
                                      {booking.serviceFee && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Service:</span>
                                          <span className="font-medium">{formatCurrency(booking.serviceFee)}</span>
                                        </div>
                                      )}
                                      {booking.taxes && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Taxes:</span>
                                          <span className="font-medium">{formatCurrency(booking.taxes)}</span>
                                        </div>
                                      )}
                                      {booking.commission && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Commission:</span>
                                          <span className="font-medium text-red-600">-{formatCurrency(booking.commission)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">Informations d'accès</h4>
                                    <div className="text-sm space-y-1">
                                      {booking.accessCode && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Code d'accès:</span>
                                          <span className="font-mono font-bold text-indigo-600">{booking.accessCode}</span>
                                        </div>
                                      )}
                                      {booking.wifiPassword && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">WiFi:</span>
                                          <span className="font-mono font-medium">{booking.wifiPassword}</span>
                                        </div>
                                      )}
                                      {booking.parkingSpot && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-gray-600 dark:text-gray-400">Parking:</span>
                                          <span className="font-medium">{booking.parkingSpot}</span>
                                        </div>
                                      )}
                                      <div className="pt-2 space-y-1">
                                        {booking.checkInCompleted && (
                                          <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-xs">Check-in effectué</span>
                                          </div>
                                        )}
                                        {booking.documentsVerified && (
                                          <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-xs">Documents vérifiés</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">Actions rapides</h4>
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowModal('qr');
                                        }}
                                        className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors text-sm flex items-center gap-2"
                                      >
                                        <Package className="w-4 h-4" />
                                        Voir QR Code
                                      </button>
                                      <button
                                        onClick={() => printInvoice(booking)}
                                        className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors text-sm flex items-center gap-2"
                                      >
                                        <Printer className="w-4 h-4" />
                                        Facture
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedBooking(booking);
                                          setShowModal('communicate');
                                        }}
                                        className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm flex items-center gap-2"
                                      >
                                        <Send className="w-4 h-4" />
                                        Contacter
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {booking.specialRequests && (
                                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                      <div>
                                        <div className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm">Demandes spéciales</div>
                                        <div className="text-sm text-yellow-800 dark:text-yellow-200">{booking.specialRequests}</div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            <AnimatePresence>
              {filteredBookings.map((booking, index) => {
                const property = getProperty(booking.propertyId);
                const StatusIcon = getStatusIcon(booking.status);

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">#{booking.id}</h3>
                          <StatusIcon className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{property?.name}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSourceColor(booking.source || 'other')}`}>
                        {booking.source?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900 dark:text-white">{booking.guestInfo.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{booking.totalNights} nuits • {booking.guests} personnes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(booking.totalPrice)}</span>
                      </div>
                      {booking.pricePerNight && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
                          {formatCurrency(booking.pricePerNight)}/nuit
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowModal('details');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Détails
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setEditForm(booking);
                          setShowModal('edit');
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
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

        {filteredBookings.length === 0 && (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 text-lg dark:text-gray-400">Aucune réservation trouvée</div>
            <div className="text-gray-400 text-sm mt-2 dark:text-gray-500">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Aucune réservation pour le moment'
              }
            </div>
          </div>
        )}
      </div>

      {/* Modal QR Code */}
      <AnimatePresence>
        {showModal === 'qr' && selectedBooking && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">QR Code Réservation</h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div id={`qr-${selectedBooking.id}`} className="bg-white p-6 rounded-xl mb-6">
                <QRCodeSVG
                  value={JSON.stringify({
                    id: selectedBooking.id,
                    guest: selectedBooking.guestInfo.name,
                    checkIn: selectedBooking.checkIn,
                    checkOut: selectedBooking.checkOut,
                    property: getProperty(selectedBooking.propertyId)?.name,
                    accessCode: selectedBooking.accessCode,
                    wifi: selectedBooking.wifiPassword,
                  })}
                  size={300}
                  level="H"
                  includeMargin
                  className="mx-auto"
                />
              </div>

              <div className="space-y-3 text-center mb-6">
                <p className="font-semibold text-gray-900 dark:text-white">Réservation #{selectedBooking.id}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedBooking.guestInfo.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(selectedBooking.checkIn)} - {formatDate(selectedBooking.checkOut)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => downloadQRCode(selectedBooking)}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify({
                      id: selectedBooking.id,
                      accessCode: selectedBooking.accessCode,
                      wifi: selectedBooking.wifiPassword,
                    }));
                    alert('Informations copiées !');
                  }}
                  className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Copy className="w-5 h-5" />
                  Copier
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Détails (Simplifié pour économiser de l'espace) */}
      <AnimatePresence>
        {showModal === 'details' && selectedBooking && (
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
                  Réservation #{selectedBooking.id}
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Contenu du modal détails - simplifié */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Informations client</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Nom:</span> {selectedBooking.guestInfo.name}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Email:</span> {selectedBooking.guestInfo.email}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Téléphone:</span> {selectedBooking.guestInfo.phone}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Détails séjour</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-400">Propriété:</span> {getProperty(selectedBooking.propertyId)?.name}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Check-in:</span> {formatDate(selectedBooking.checkIn)}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Check-out:</span> {formatDate(selectedBooking.checkOut)}</p>
                      <p><span className="text-gray-600 dark:text-gray-400">Total:</span> {formatCurrency(selectedBooking.totalPrice)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => printInvoice(selectedBooking)}
                    className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-5 h-5" />
                    Facture
                  </button>
                  <button
                    onClick={() => {
                      setShowModal('qr');
                    }}
                    className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Package className="w-5 h-5" />
                    QR Code
                  </button>
                  <button
                    onClick={() => {
                      setEditForm(selectedBooking);
                      setShowModal('edit');
                    }}
                    className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier
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