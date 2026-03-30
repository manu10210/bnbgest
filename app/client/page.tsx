'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBNB } from '../../contexts/BNBContext';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Home,
  Calendar,
  Star,
  Search,
  MapPin,
  Euro,
  CheckCircle,
  XCircle,
  User,
  Navigation,
  FileText,
  QrCode,
  BookOpen,
  Clock,
  Phone,
  Mail,
  ArrowRight,
  Building2,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';

type ClientTab = 'reservations' | 'properties' | 'documents' | 'reviews';

export default function ClientPage() {
  const { properties, bookings, reviews, guests, getProperty, getBookingsByProperty, getReviewsByProperty, getAverageRating } = useBNB();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ClientTab>('reservations');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  // Client-side: show all bookings (in a real app, filtered by logged-in user)
  const now = new Date();

  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.guestInfo.name.toLowerCase().includes(q) ||
        (getProperty(b.propertyId)?.name || '').toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
  }, [bookings, statusFilter, searchTerm, getProperty]);

  const selectedBooking = selectedBookingId ? bookings.find(b => b.id === selectedBookingId) : null;
  const selectedBookingProperty = selectedBooking ? getProperty(selectedBooking.propertyId) : null;

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.checkIn) > now);
  const currentBookings = bookings.filter(b => b.status === 'confirmed' && new Date(b.checkIn) <= now && new Date(b.checkOut) >= now);
  const totalSpent = bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalPrice, 0);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < Math.round(rating) ? 'text-yellow-400' : isDark ? 'text-[#717171]' : 'text-gray-400'}>â˜…</span>
    ));
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-[#f7f7f7] text-gray-800',
    };
    return map[status] || 'bg-[#f7f7f7] text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      confirmed: 'Confirmee',
      completed: 'Terminee',
      pending: 'En attente',
      cancelled: 'Annulee',
      no_show: 'No-show',
    };
    return map[status] || status;
  };

  const getDaysUntil = (date: string) => {
    const d = Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (d < 0) return 'Passee';
    if (d === 0) return 'Aujourd\'hui';
    if (d === 1) return 'Demain';
    return `Dans ${d} jours`;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e] text-white' : 'bg-gradient-to-br from-green-50 to-emerald-50 text-[#222222]'}`}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDark ? 'bg-[#1a1a2e]/95 border-white/[0.06]' : 'bg-white/95 border-[#ebebeb]'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-xl">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>Portail Client</h1>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Vos reservations et proprietes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle size="sm" />
              <nav className="hidden md:flex space-x-3">
                <Link href="/" className={`flex items-center text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-[#717171] hover:text-green-600 hover:bg-green-50'}`}>
                  <Home className="w-4 h-4 mr-1" /> Accueil
                </Link>
                <Link href="/admin" className={`flex items-center text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-[#717171] hover:text-green-600 hover:bg-green-50'}`}>
                  <Navigation className="w-4 h-4 mr-1" /> Admin
                </Link>
                <Link href="/calendar" className={`flex items-center text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-[#717171] hover:text-green-600 hover:bg-green-50'}`}>
                  <Calendar className="w-4 h-4 mr-1" /> Calendrier
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Reservations totales</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-200" />
            </div>
          </Card>
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">En cours / A venir</p>
                <p className="text-2xl font-bold">{currentBookings.length + upcomingBookings.length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </Card>
          <Card className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Proprietes</p>
                <p className="text-2xl font-bold">{properties.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-white/60" />
            </div>
          </Card>
          <Card className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Total depense</p>
                <p className="text-2xl font-bold">{totalSpent}â‚¬</p>
              </div>
              <Euro className="w-8 h-8 text-amber-200" />
            </div>
          </Card>
        </div>

        {/* Current stay banner */}
        {currentBookings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500 p-2 rounded-full">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className={`font-bold ${isDark ? 'text-green-300' : 'text-green-800'}`}>Sejour en cours</p>
                    <p className={`text-sm ${isDark ? 'text-green-400/70' : 'text-green-700'}`}>
                      {getProperty(currentBookings[0].propertyId)?.name} â€” Check-out: {new Date(currentBookings[0].checkOut).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/admin">
                    <Button size="sm" icon={QrCode} className="bg-green-600 hover:bg-green-700">QR Check-in</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Card>
          <div className="p-4">
            <div className="flex space-x-1 overflow-x-auto">
              {[
                { id: 'reservations' as const, label: 'Mes Reservations', icon: Calendar },
                { id: 'properties' as const, label: 'Proprietes', icon: Building2 },
                { id: 'documents' as const, label: 'Documents', icon: FileText },
                { id: 'reviews' as const, label: 'Avis', icon: Star },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white shadow-sm'
                      : isDark ? 'bg-white/[0.04] text-gray-400 hover:bg-white/20' : 'bg-[#f7f7f7] text-[#717171] hover:bg-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* === RESERVATIONS TAB === */}
        {activeTab === 'reservations' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou propriete..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 p-2.5 rounded-lg border ${isDark ? 'bg-white/[0.04] border-white/20 text-white placeholder-gray-500' : 'bg-white border-[#dddddd] text-[#222222]'}`}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`p-2.5 rounded-lg border ${isDark ? 'bg-white/[0.04] border-white/20 text-white' : 'bg-white border-[#dddddd] text-[#222222]'}`}
              >
                <option value="all" className="text-[#222222]">Tous les statuts</option>
                <option value="confirmed" className="text-[#222222]">Confirmees</option>
                <option value="pending" className="text-[#222222]">En attente</option>
                <option value="completed" className="text-[#222222]">Terminees</option>
                <option value="cancelled" className="text-[#222222]">Annulees</option>
              </select>
            </div>

            {/* Bookings list */}
            {filteredBookings.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <Calendar className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                  <p className={isDark ? 'text-[#717171]' : 'text-gray-400'}>Aucune reservation trouvee</p>
                </div>
              </Card>
            ) : (
              filteredBookings.map(booking => {
                const prop = getProperty(booking.propertyId);
                const isUpcoming = new Date(booking.checkIn) > now;
                const isCurrent = new Date(booking.checkIn) <= now && new Date(booking.checkOut) >= now;

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className={`cursor-pointer transition-all hover:shadow-sm ${isCurrent ? (isDark ? 'ring-1 ring-green-500/50' : 'ring-1 ring-green-300') : ''}`}>
                      <div className="p-5" onClick={() => setSelectedBookingId(booking.id)}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                              {prop?.name || `Propriete #${booking.propertyId}`}
                            </h3>
                            {prop && (
                              <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                                <MapPin className="w-3 h-3" /> {prop.city}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="px-2 py-0.5 rounded-full text-xs bg-green-500 text-white font-medium">En cours</span>}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Check-in</p>
                            <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              {new Date(booking.checkIn).toLocaleDateString('fr-FR')}
                            </p>
                            {isUpcoming && <p className="text-xs text-green-500 font-medium">{getDaysUntil(booking.checkIn)}</p>}
                          </div>
                          <div>
                            <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Check-out</p>
                            <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              {new Date(booking.checkOut).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div>
                            <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Voyageurs</p>
                            <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{booking.guests} pers.</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Total</p>
                            <p className="font-bold text-green-500 text-lg">{booking.totalPrice}â‚¬</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* === PROPERTIES TAB === */}
        {activeTab === 'properties' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {properties.length === 0 ? (
              <Card className="col-span-full">
                <div className="p-8 text-center">
                  <Building2 className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                  <p className={isDark ? 'text-[#717171]' : 'text-gray-400'}>Aucune propriete</p>
                </div>
              </Card>
            ) : (
              properties.map(prop => {
                const avg = getAverageRating(prop.id);
                const propBookings = getBookingsByProperty(prop.id);
                const propReviews = getReviewsByProperty(prop.id);

                return (
                  <Card key={prop.id} className="hover:shadow-xl transition-shadow">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{prop.name}</h3>
                          <p className={`text-sm flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                            <MapPin className="w-3 h-3" /> {prop.address}, {prop.city}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prop.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-[#f7f7f7] text-gray-800'
                        }`}>{prop.status === 'active' ? 'Active' : prop.status}</span>
                      </div>

                      <div className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                        {prop.type} Â· {prop.bedrooms} ch. Â· {prop.bathrooms} sdb Â· Max {prop.maxGuests} pers.
                      </div>

                      {prop.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {prop.amenities.slice(0, 4).map((a, i) => (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>{a}</span>
                          ))}
                          {prop.amenities.length > 4 && <span className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>+{prop.amenities.length - 4}</span>}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          {renderStars(avg)}
                          <span className={`text-sm ml-1 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>({propReviews.length} avis)</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-500">{prop.price}â‚¬<span className={`text-sm font-normal ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>/nuit</span></p>
                        </div>
                      </div>

                      <div className={`mt-3 pt-3 border-t flex justify-between text-sm ${isDark ? 'border-white/[0.06] text-gray-400' : 'border-[#ebebeb] text-[#717171]'}`}>
                        <span>{propBookings.length} reservation(s)</span>
                        <span>Check-in: {prop.checkInTime} | Check-out: {prop.checkOutTime}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* === DOCUMENTS TAB === */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <Card>
              <div className="p-6">
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                  <FileText className="w-5 h-5 text-green-500" />
                  Documents disponibles
                </h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                  Acces rapide a vos contrats, QR codes et guides d&apos;accueil depuis l&apos;administration.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/admin">
                    <Card className={`cursor-pointer transition-all hover:shadow-sm ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f7f7f7]'}`}>
                      <div className="p-5 text-center">
                        <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#222222]'}`}>Contrats</h4>
                        <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Generer vos contrats de location PDF</p>
                        <ArrowRight className={`w-4 h-4 mx-auto mt-2 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                      </div>
                    </Card>
                  </Link>

                  <Link href="/admin">
                    <Card className={`cursor-pointer transition-all hover:shadow-sm ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f7f7f7]'}`}>
                      <div className="p-5 text-center">
                        <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <QrCode className="w-6 h-6 text-white" />
                        </div>
                        <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#222222]'}`}>QR Check-in</h4>
                        <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Acces QR code pour le check-in rapide</p>
                        <ArrowRight className={`w-4 h-4 mx-auto mt-2 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                      </div>
                    </Card>
                  </Link>

                  <Link href="/admin">
                    <Card className={`cursor-pointer transition-all hover:shadow-sm ${isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f7f7f7]'}`}>
                      <div className="p-5 text-center">
                        <div className="bg-gradient-to-r from-[#FF385C] to-[#E31C5F] w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-[#222222]'}`}>Guide d&apos;accueil</h4>
                        <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Guide multilingue pour vos hotes</p>
                        <ArrowRight className={`w-4 h-4 mx-auto mt-2 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                      </div>
                    </Card>
                  </Link>
                </div>
              </div>
            </Card>

            {/* Recent bookings for quick document access */}
            {bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                    <Calendar className="w-5 h-5 text-[#FF385C]" />
                    Documents par reservation
                  </h3>
                  <div className="space-y-2">
                    {bookings
                      .filter(b => b.status === 'confirmed' || b.status === 'completed')
                      .slice(0, 5)
                      .map(b => {
                        const prop = getProperty(b.propertyId);
                        return (
                          <div key={b.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'border-white/[0.06]' : 'border-[#ebebeb]'}`}>
                            <div>
                              <p className={`font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{prop?.name} â€” {b.guestInfo.name}</p>
                              <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>
                                {new Date(b.checkIn).toLocaleDateString('fr-FR')} â†’ {new Date(b.checkOut).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>Contrat</span>
                              <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>QR</span>
                              <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-[#f7f7f7] text-[#717171]'}`}>Guide</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* === REVIEWS TAB === */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <Star className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`} />
                  <p className={isDark ? 'text-[#717171]' : 'text-gray-400'}>Aucun avis pour le moment</p>
                </div>
              </Card>
            ) : (
              reviews.map(review => {
                const prop = getProperty(review.propertyId);
                return (
                  <Card key={review.id}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className={`font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{review.title}</h4>
                          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                            {prop?.name} Â· {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className={`ml-1 font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{review.rating}/5</span>
                        </div>
                      </div>

                      <p className={`mb-3 ${isDark ? 'text-gray-400' : 'text-[#222222]'}`}>{review.comment}</p>

                      {review.response && (
                        <div className={`p-3 rounded-lg border-l-4 ${isDark ? 'bg-[#FF385C]/10 border-[#FF385C] text-[#FF385C]' : 'bg-[#FF385C]/5 border-[#FF385C] text-[#FF385C]'}`}>
                          <p className="text-sm font-medium mb-1">Reponse du proprietaire :</p>
                          <p className="text-sm">{review.response.message}</p>
                        </div>
                      )}

                      {review.verified && (
                        <div className="mt-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-500">Sejour verifie</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                      {selectedBookingProperty?.name || `Propriete #${selectedBooking.propertyId}`}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(selectedBooking.status)}`}>
                      {getStatusLabel(selectedBooking.status)}
                    </span>
                  </div>
                  <button onClick={() => setSelectedBookingId(null)} className={isDark ? 'text-gray-400' : 'text-[#717171]'}>
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className={`space-y-4 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Check-in</p>
                      <p className="font-medium">{new Date(selectedBooking.checkIn).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs">{selectedBookingProperty?.checkInTime || '15:00'}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Check-out</p>
                      <p className="font-medium">{new Date(selectedBooking.checkOut).toLocaleDateString('fr-FR')}</p>
                      <p className="text-xs">{selectedBookingProperty?.checkOutTime || '11:00'}</p>
                    </div>
                  </div>

                  <div className={`border-t pt-4 ${isDark ? 'border-white/[0.06]' : 'border-[#ebebeb]'}`}>
                    <p className={`text-xs mb-2 ${isDark ? 'text-[#717171]' : 'text-gray-400'}`}>Informations client</p>
                    <div className="space-y-1">
                      <p className="flex items-center gap-2"><User className="w-4 h-4" /> {selectedBooking.guestInfo.name}</p>
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {selectedBooking.guestInfo.email}</p>
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {selectedBooking.guestInfo.phone}</p>
                    </div>
                  </div>

                  <div className={`border-t pt-4 ${isDark ? 'border-white/[0.06]' : 'border-[#ebebeb]'}`}>
                    <div className="flex justify-between items-center">
                      <span>Voyageurs</span>
                      <span className="font-medium">{selectedBooking.guests} personne(s)</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>Paiement</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedBooking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedBooking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-[#f7f7f7] text-gray-800'
                      }`}>{selectedBooking.paymentStatus}</span>
                    </div>
                    <div className={`flex justify-between items-center mt-4 pt-4 border-t text-lg font-bold ${isDark ? 'border-white/[0.06] text-white' : 'border-[#ebebeb] text-[#222222]'}`}>
                      <span>Total</span>
                      <span className="text-green-500">{selectedBooking.totalPrice}â‚¬</span>
                    </div>
                  </div>

                  {selectedBooking.specialRequests && (
                    <div className={`p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-[#f7f7f7]'}`}>
                      <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Demandes speciales</p>
                      <p className="text-sm">{selectedBooking.specialRequests}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button onClick={() => setSelectedBookingId(null)} variant="outline" className="flex-1">Fermer</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}

