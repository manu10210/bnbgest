'use client';

import React, { useState, useMemo } from 'react';
import { useBNB, Booking } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { Edit, Plus, Search, Calendar, Filter, CheckCircle, Clock, XCircle, Home, MapPin, DollarSign, Users } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookingsManagerProps {
  onEditBooking: (booking: Booking) => void;
  onNewBooking: () => void;
  filteredBookings: Booking[];
}

type TabType = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled';

export default function BookingsManager({ onEditBooking, onNewBooking, filteredBookings }: BookingsManagerProps) {
  const { isDark } = useTheme();
  const { properties } = useBNB();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedBookings = useMemo(() => {
    return filteredBookings.filter(b => {
      const matchTab = activeTab === 'all' || b.status === activeTab;
      const q = searchQuery.toLowerCase();
      const prop = properties.find(p => p.id === b.propertyId);
      const matchSearch = 
        !searchQuery || 
        b.guestInfo?.name.toLowerCase().includes(q) || 
        prop?.name.toLowerCase().includes(q) ||
        b.id.toString().includes(q);
        
      return matchTab && matchSearch;
    }).sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [filteredBookings, activeTab, searchQuery, properties]);

  const stats = useMemo(() => {
    return {
      total: filteredBookings.length,
      confirmed: filteredBookings.filter(b => b.status === 'confirmed').length,
      pending: filteredBookings.filter(b => b.status === 'pending').length,
      cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
      revenue: filteredBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').reduce((s, b) => s + b.totalPrice, 0)
    };
  }, [filteredBookings]);

  const groupedBookings = useMemo(() => {
    return displayedBookings.reduce((acc, booking) => {
      const monthYear = format(new Date(booking.checkIn), 'MMMM yyyy', { locale: fr });
      const capitalized = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
      if (!acc[capitalized]) acc[capitalized] = [];
      acc[capitalized].push(booking);
      return acc;
    }, {} as Record<string, Booking[]>);
  }, [displayedBookings]);

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'confirmed': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-500`}><CheckCircle className="w-3 h-3 inline mr-1"/>Confirmé</span>;
      case 'pending': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500`}><Clock className="w-3 h-3 inline mr-1"/>En attente</span>;
      case 'cancelled': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-500`}><XCircle className="w-3 h-3 inline mr-1"/>Annulé</span>;
      case 'completed': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500`}><CheckCircle className="w-3 h-3 inline mr-1"/>Terminé</span>;
      default: return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-500`}>{status}</span>;
    }
  };

  const getPaymentBadge = (status: Booking['paymentStatus']) => {
    switch (status) {
      case 'paid': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-500`}>Payé</span>;
      case 'pending': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-500`}>Attente</span>;
      case 'partial': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500`}>Partiel</span>;
      case 'refunded': return <span className={`px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-500`}>Remboursé</span>;
      default: return null;
    }
  };

  return (
    <div className={`glass-pro rounded-2xl p-6 border-gradient`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Réservations</h2>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Gérez et suivez toutes vos Réservations</p>
        </div>
        <Button onClick={onNewBooking} className="flex items-center gap-2 hover-lift shrink-0">
          <Plus className="w-4 h-4" /> Nouvelle Réservation
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Confirmées</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{stats.confirmed}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>En attente</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{stats.pending}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>Annulées</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>{stats.cancelled}</p>
        </div>
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Revenus</p>
          <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{stats.revenue.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex bg-gray-100 dark:bg-[#1e1e2d] p-1 rounded-xl w-full md:w-auto overflow-x-auto scrollbar-hide">
          {(['all', 'confirmed', 'pending', 'completed', 'cancelled'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-white dark:bg-[#2d2d44] text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab === 'all' ? 'Toutes' : tab === 'confirmed' ? 'Confirmées' : tab === 'pending' ? 'En attente' : tab === 'completed' ? 'Terminées' : 'Annulées'}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 shrink-0">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Rechercher voyageur, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${
              isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* List */}
      {displayedBookings.length === 0 ? (
        <div className={`text-center py-16 rounded-2xl border-2 border-dashed ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <Calendar className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Aucune Réservation trouvée</h3>
          <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>Modifiez vos filtres ou créez une nouvelle Réservation.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 animate-fadeIn">
          {Object.entries(groupedBookings).map(([monthYear, monthBookings]) => (
            <div key={monthYear} className="space-y-4">
              <div className={`flex items-center gap-3 sticky top-0 py-3 z-10 backdrop-blur-xl ${isDark ? 'bg-[#1e1e2d]/80 border-b border-white/5' : 'bg-white/80 border-b border-gray-100'}`}>
                <Calendar className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <h3 className={`text-lg font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  {monthYear}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {monthBookings.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 stagger-children">
                {monthBookings.map(booking => {
                  const prop = properties.find(p => p.id === booking.propertyId);
                  const nights = Math.max(1, differenceInDays(new Date(booking.checkOut), new Date(booking.checkIn)));
            
            return (
              <div key={booking.id} className={`border rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover-lift ${
                isDark ? 'bg-[#1e1e2d] border-white/5 hover:border-white/10' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
              }`}>
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-4 w-full">
                  <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold text-lg ${
                    isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {booking.guestInfo.name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className={`font-bold truncate max-w-[200px] ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {booking.guestInfo.name}
                      </h4>
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className={`flex items-center gap-4 text-sm flex-wrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Home className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[150px]">{prop?.name || 'Inconnu'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(booking.checkIn), 'dd/MM')} &rarr; {format(new Date(booking.checkOut), 'dd/MM')} ({nights}n)</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        <span>{booking.guests}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {booking.totalPrice.toLocaleString('fr-FR')} €
                    </p>
                    <div className="mt-1 flex justify-end">
                      {getPaymentBadge(booking.paymentStatus)}
                    </div>
                  </div>
                  <button 
                    onClick={() => onEditBooking(booking)} 
                    className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                      isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

