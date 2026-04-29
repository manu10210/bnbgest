'use client';

import { useState, useEffect } from 'react';
import BookingsManager from './BookingsManager';
import { useSearchParams } from 'next/navigation';
import NextLink from 'next/link';
import dynamic from 'next/dynamic';

const BookingManager = dynamic(() => import('./BookingManager'), { ssr: false });
const GuestManager = dynamic(() => import('./GuestManager'), { ssr: false });
const MaintenanceManagerAdvanced = dynamic(() => import('./MaintenanceManagerAdvanced'), { ssr: false });
const InventoryManager = dynamic(() => import('./InventoryManager'), { ssr: false });
const FinancialReports = dynamic(() => import('./FinancialReports'), { ssr: false });
const WelcomeGuideGenerator = dynamic(() => import('./WelcomeGuideGenerator'), { ssr: false });
const PropertyConfigurator = dynamic(() => import('./PropertyConfigurator'), { ssr: false });
const PropertySheet = dynamic(() => import('./PropertySheet'), { ssr: false });
const SettingsManager = dynamic(() => import('./SettingsManager'), { ssr: false });
const QRCheckIn = dynamic(() => import('./QRCheckIn'), { ssr: false });
const ContractGenerator = dynamic(() => import('./ContractGenerator'), { ssr: false });
const CleaningChecklist = dynamic(() => import('./CleaningChecklist'), { ssr: false });
const PricingEngine = dynamic(() => import('./PricingEngine'), { ssr: false });
const NotificationCenter = dynamic(() => import('./NotificationCenter'), { ssr: false });
const CleaningGallery = dynamic(() => import('./CleaningGallery'), { ssr: false });
const ClientShareLink = dynamic(() => import('./ClientShareLink'), { ssr: false });
const RevenueForecasting = dynamic(() => import('./RevenueForecasting'), { ssr: false });
const EquipmentVideoQR = dynamic(() => import('./EquipmentVideoQR'), { ssr: false });
const ReviewsManager = dynamic(() => import('./ReviewsManager'), { ssr: false });
const InvoiceEditor = dynamic(() => import('./InvoiceEditor'), { ssr: false });
const SmartPropertyIntelligence = dynamic(() => import('./SmartPropertyIntelligence'), { ssr: false });
const SmartChatAssistant = dynamic(() => import('./SmartChatAssistant'), { ssr: false });
const RevenueAutopilot = dynamic(() => import('./RevenueAutopilot'), { ssr: false });
const GlobalSearch = dynamic(() => import('./GlobalSearch'), { ssr: false });
const DataExportImportAdvanced = dynamic(() => import('./DataExportImportAdvanced'), { ssr: false });
const AdminSidebar = dynamic(() => import('./AdminSidebar'), { ssr: false });
const DashboardOverview = dynamic(() => import('./DashboardOverview'), { ssr: false });
const LiveRevenueTracker = dynamic(() => import('./LiveRevenueTracker'), { ssr: false });
const GuestMessagingHub = dynamic(() => import('./GuestMessagingHub'), { ssr: false });
const OccupancyOptimizer = dynamic(() => import('./OccupancyOptimizer'), { ssr: false });
const GmailImporter = dynamic(() => import('./GmailImporter'), { ssr: false });
import LanguageSelector from './LanguageSelector';
import { useBNB, Booking, Guest, Review } from '../contexts/BNBContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { motion } from 'framer-motion';
import {
  Calendar,
  Wrench,
  Package,
  DollarSign,
  FileText,
  Users,
  Star,
  Settings,
  Plus,
  Building2,
  UserPlus,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Euro,
  TrendingUp,
  UserCheck,
  MapPin,
  MessageCircle,
  Home,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  X,
  Send,
  Eye,
  QrCode,
  Sparkles,
  FileSignature,
  Bell,
  Tag,
  Camera,
  Link,
  TrendingUp as TrendingUpIcon,
  Video,
  Quote,
  ArrowUpRight,
  Mail,
  Search
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

export type TabType = 'overview' | 'bookings' | 'maintenance' | 'inventory' | 'financial' | 'guests' | 'reviews' | 'welcome' | 'properties' | 'settings' | 'qrcheckin' | 'contract' | 'cleaning' | 'pricing' | 'notifications' | 'cleaningGallery' | 'shareLinks' | 'forecasting' | 'videoguides' | 'reviewsmanager' | 'invoice' | 'intelligence' | 'assistant' | 'autopilot' | 'revenue-live' | 'messaging' | 'occupancy' | 'gmail-import';

export default function AdminDashboard() {
  const {
    properties, deleteProperty, addProperty, updateProperty,
    bookings, addBooking, updateBooking,
    guests, addGuest, updateGuest,
    maintenanceTasks, addMaintenanceTask,
    addInventoryItem,
    reviews, respondToReview,
    getRevenueByProperty,
  } = useBNB();

  const { isDark } = useTheme();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Allow deep-linking from other pages via ?tab=<id>
    const raw = searchParams?.get('tab');
    // Alias map pour liens raccourcis
    const aliases: Record<string, TabType> = { gmail: 'gmail-import' };
    return (aliases[raw ?? ''] ?? raw as TabType) || 'overview';
  });
  const [settingsTab, setSettingsTab] = useState<string>('profile');
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | undefined>(undefined);
  const [propertyToDelete, setPropertyToDelete] = useState<number | null>(null);
  const [propertyToEdit, setPropertyToEdit] = useState<typeof properties[0] | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);

  // Modal states
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showNewMaintenanceModal, setShowNewMaintenanceModal] = useState(false);
  const [showNewInventoryModal, setShowNewInventoryModal] = useState(false);
  const [showFinancialReportModal, setShowFinancialReportModal] = useState(false);
  const [showPropertyConfigurator, setShowPropertyConfigurator] = useState(false);
  const [showNewGuestModal, setShowNewGuestModal] = useState(false);

  // Global Search Keyboard Shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Edit states
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [reviewToReply, setReviewToReply] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  // Quick actions
  const [quickActionsCollapsed, setQuickActionsCollapsed] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');
  const [propertySort, setPropertySort] = useState<'revenue-desc' | 'bookings-desc' | 'name-asc' | 'price-desc'>('revenue-desc');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<'all' | 'active' | 'maintenance' | 'inactive'>('all');

  // New booking form
  const [newBooking, setNewBooking] = useState({
    propertyId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    totalAmount: 0,
    specialRequests: '',
  });

  // Helper to find guestId by name (or create 0 as placeholder)
  const findGuestId = (name: string) => {
    const found = guests.find(g => g.name.toLowerCase() === name.toLowerCase());
    return found?.id ?? 0;
  };

  // New guest form
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
    language: 'fr',
    status: 'active' as 'active' | 'inactive' | 'blocked',
  });

  // New maintenance form
  const [newMaintenanceTask, setNewMaintenanceTask] = useState({
    propertyId: '',
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: 'repair' as 'cleaning' | 'repair' | 'inspection' | 'supplies' | 'other',
    estimatedCost: 0,
    scheduledDate: '',
  });

  // New inventory form
  const [newInventoryItem, setNewInventoryItem] = useState({
    propertyId: '',
    name: '',
    category: 'kitchen' as 'bedding' | 'towels' | 'kitchen' | 'bathroom' | 'cleaning' | 'electronics' | 'furniture' | 'other',
    quantity: 1,
    minimumQuantity: 1,
    unit: 'piece',
    location: '',
  });

  // Financial report form
  const [financialPeriod, setFinancialPeriod] = useState('month');

  // Handlers
  const handleNewBooking = () => { setShowNewBookingModal(true); };
  const handleNewMaintenanceTask = () => { setShowNewMaintenanceModal(true); };
  const handleNewInventoryItem = () => { setShowNewInventoryModal(true); };
  const handleNewGuest = () => { setShowNewGuestModal(true); };

  const handleSubmitBooking = () => {
    if (!newBooking.propertyId || !newBooking.guestName || !newBooking.checkIn || !newBooking.checkOut) return;
    addBooking({
      propertyId: Number(newBooking.propertyId),
      guestId: findGuestId(newBooking.guestName),
      checkIn: newBooking.checkIn,
      checkOut: newBooking.checkOut,
      guests: newBooking.guests,
      totalPrice: newBooking.totalAmount,
      specialRequests: newBooking.specialRequests,
      status: 'confirmed',
      paymentStatus: 'pending',
      guestInfo: {
        name: newBooking.guestName,
        email: newBooking.guestEmail,
        phone: newBooking.guestPhone,
      },
    });
    setShowNewBookingModal(false);
    setNewBooking({ propertyId: '', guestName: '', guestEmail: '', guestPhone: '', checkIn: '', checkOut: '', guests: 1, totalAmount: 0, specialRequests: '' });
  };

  const handleSubmitGuest = () => {
    if (!newGuest.name || !newGuest.email) return;
    addGuest({
      name: newGuest.name,
      email: newGuest.email,
      phone: newGuest.phone,
      nationality: newGuest.nationality,
      language: newGuest.language,
      status: newGuest.status,
    });
    setShowNewGuestModal(false);
    setNewGuest({ name: '', email: '', phone: '', nationality: '', language: 'fr', status: 'active' });
  };

  const handleUpdateBooking = () => {
    if (!bookingToEdit) return;
    updateBooking(bookingToEdit.id, bookingToEdit);
    setBookingToEdit(null);
  };

  const handleUpdateGuest = () => {
    if (!guestToEdit) return;
    updateGuest(guestToEdit.id, guestToEdit);
    setGuestToEdit(null);
  };

  const handleSubmitMaintenanceTask = () => {
    if (!newMaintenanceTask.propertyId || !newMaintenanceTask.title) return;
    addMaintenanceTask({
      propertyId: Number(newMaintenanceTask.propertyId),
      title: newMaintenanceTask.title,
      description: newMaintenanceTask.description,
      priority: newMaintenanceTask.priority,
      category: newMaintenanceTask.category,
      estimatedCost: newMaintenanceTask.estimatedCost,
      scheduledDate: newMaintenanceTask.scheduledDate,
      status: 'pending',
    });
    setShowNewMaintenanceModal(false);
    setNewMaintenanceTask({ propertyId: '', title: '', description: '', priority: 'medium', category: 'repair', estimatedCost: 0, scheduledDate: '' });
  };

  const handleSubmitInventoryItem = () => {
    if (!newInventoryItem.propertyId || !newInventoryItem.name) return;
    addInventoryItem({
      propertyId: Number(newInventoryItem.propertyId),
      name: newInventoryItem.name,
      category: newInventoryItem.category,
      quantity: newInventoryItem.quantity,
      minimumQuantity: newInventoryItem.minimumQuantity,
      unit: newInventoryItem.unit || 'piece',
      status: newInventoryItem.quantity > newInventoryItem.minimumQuantity ? 'in_stock' : newInventoryItem.quantity > 0 ? 'low_stock' : 'out_of_stock',
      lastRestocked: new Date().toISOString(),
      location: newInventoryItem.location || 'Principal',
    });
    setShowNewInventoryModal(false);
    setNewInventoryItem({ propertyId: '', name: '', category: 'kitchen', quantity: 1, minimumQuantity: 1, unit: 'piece', location: '' });
  };

  const handleReplyToReview = () => {
    if (!reviewToReply || !replyText) return;
    respondToReview(reviewToReply.id, replyText, 1);
    setReviewToReply(null);
    setReplyText('');
  };

  const filteredBookings = selectedPropertyId ? bookings.filter(b => b.propertyId === selectedPropertyId) : bookings;
  const filteredTasks = selectedPropertyId ? maintenanceTasks.filter(t => t.propertyId === selectedPropertyId) : maintenanceTasks;
  const filteredReviews = selectedPropertyId ? reviews.filter(r => r.propertyId === selectedPropertyId) : reviews;
  const filteredGuests = guests;

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const now = new Date();
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInCurrentMonth = monthEndDate.getDate();
  const totalRevenue = properties.reduce((sum, p) => sum + getRevenueByProperty(p.id, yearStart, yearEnd), 0);
  const avgNightlyPrice = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length)
    : 0;
  const propertyStatusCounts = properties.reduce(
    (acc, property) => {
      const status = property.status === 'blocked' ? 'inactive' : property.status;
      if (status === 'active') acc.active += 1;
      if (status === 'maintenance') acc.maintenance += 1;
      if (status === 'inactive') acc.inactive += 1;
      return acc;
    },
    { active: 0, maintenance: 0, inactive: 0 }
  );

  const getPropertyBookedNightsThisMonth = (propertyId: number) => {
    return bookings
      .filter(b => b.propertyId === propertyId && !['cancelled', 'no_show'].includes(b.status))
      .reduce((sum, booking) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const overlapStart = checkIn > monthStartDate ? checkIn : monthStartDate;
        const overlapEnd = checkOut < monthEndDate ? checkOut : monthEndDate;
        if (overlapEnd <= overlapStart) return sum;
        const nights = Math.max(0, Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 86400000));
        return sum + nights;
      }, 0);
  };

  const propertiesFiltered = properties
    .filter((property) => {
      if (propertyStatusFilter !== 'all') {
        const normalizedStatus = property.status === 'blocked' ? 'inactive' : property.status;
        if (normalizedStatus !== propertyStatusFilter) return false;
      }
      if (!propertySearch.trim()) return true;
      const q = propertySearch.toLowerCase().trim();
      return (
        property.name.toLowerCase().includes(q) ||
        (property.address || '').toLowerCase().includes(q) ||
        (property.city || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (propertySort === 'name-asc') return a.name.localeCompare(b.name, 'fr');
      if (propertySort === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (propertySort === 'bookings-desc') {
        return bookings.filter(x => x.propertyId === b.id).length - bookings.filter(x => x.propertyId === a.id).length;
      }
      // revenue-desc (default)
      return getRevenueByProperty(b.id, yearStart, yearEnd) - getRevenueByProperty(a.id, yearStart, yearEnd);
    });
  const averageRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0';

  const propertyToEditForConfigurator = propertyToEdit
    ? {
        id: propertyToEdit.id,
        name: propertyToEdit.name,
        address: propertyToEdit.address,
        type: (['apartment', 'house', 'studio', 'villa', 'room'].includes(String(propertyToEdit.type))
          ? String(propertyToEdit.type)
          : 'apartment') as 'apartment' | 'house' | 'studio' | 'villa' | 'room',
        bedrooms: propertyToEdit.bedrooms,
        bathrooms: propertyToEdit.bathrooms,
        maxGuests: propertyToEdit.maxGuests,
        amenities: propertyToEdit.amenities,
        price: propertyToEdit.price,
        description: propertyToEdit.description,
        images: propertyToEdit.images,
        status: (propertyToEdit.status === 'blocked' ? 'inactive' : propertyToEdit.status) as 'active' | 'inactive' | 'maintenance',
        createdAt: propertyToEdit.createdAt,
      }
    : undefined;
  const pendingTasks = maintenanceTasks.filter(t => t.status === 'pending').length;

  const tabs: { id: TabType; name: string; icon: React.ReactNode }[] = [
    { id: 'bookings', name: t('tab.bookings'), icon: <Calendar className="w-4 h-4" /> },
    { id: 'properties', name: t('tab.properties'), icon: <Building2 className="w-4 h-4" /> },
    { id: 'guests', name: t('tab.guests'), icon: <Users className="w-4 h-4" /> },
    { id: 'maintenance', name: t('tab.maintenance'), icon: <Wrench className="w-4 h-4" /> },
    { id: 'cleaning', name: t('tab.cleaning'), icon: <Sparkles className="w-4 h-4" /> },
    { id: 'inventory', name: t('tab.inventory'), icon: <Package className="w-4 h-4" /> },
    { id: 'financial', name: t('tab.financial'), icon: <DollarSign className="w-4 h-4" /> },
    { id: 'qrcheckin', name: t('tab.qrcheckin'), icon: <QrCode className="w-4 h-4" /> },
    { id: 'contract', name: t('tab.contract'), icon: <FileSignature className="w-4 h-4" /> },
    { id: 'reviews', name: t('tab.reviews'), icon: <Star className="w-4 h-4" /> },
    { id: 'welcome', name: t('tab.welcome'), icon: <FileText className="w-4 h-4" /> },
    { id: 'pricing', name: t('tab.pricing'), icon: <Tag className="w-4 h-4" /> },
    { id: 'notifications', name: t('tab.notifications'), icon: <Bell className="w-4 h-4" /> },
    { id: 'cleaningGallery', name: t('tab.cleaningGallery'), icon: <Camera className="w-4 h-4" /> },
    { id: 'shareLinks', name: t('tab.shareLinks'), icon: <Link className="w-4 h-4" /> },
    { id: 'forecasting', name: t('tab.forecasting'), icon: <TrendingUpIcon className="w-4 h-4" /> },
    { id: 'videoguides', name: t('tab.videoguides'), icon: <Video className="w-4 h-4" /> },
    { id: 'settings', name: t('tab.settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e] text-white' : 'bg-[#f7f7f7] text-[#222222]'}`}>
      { /* Sidebar Navigation */ }
      <AdminSidebar activeTab={activeTab} setActiveTab={(tab: TabType) => setActiveTab(tab)} />
      
      <main id="main-content" role="main" className="flex-1 h-screen overflow-y-auto relative scrollbar-hide">
        {/* Top Header */}
        <header role="banner" className={`sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e]/90 border-white/5' : 'bg-white/90 border-gray-200'}`}>
          <div className="flex items-center gap-4">
             <div>
               <h1 className={`text-xl font-bold tracking-tight leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                 {({
                   overview:       'Tableau de bord',
                   bookings:       'Réservations',
                   properties:     'Mes Propriétés',
                   guests:         'Voyageurs',
                   financial:      'Rapports Financiers',
                   maintenance:    'Maintenance',
                   contract:       'Générateur de Contrats',
                   cleaning:       'Check-lists Ménage',
                   cleaningGallery:'Galerie Ménage',
                   inventory:      'Inventaire',
                   qrcheckin:      'QR Check-in',
                   videoguides:    'Guides Vidéo',
                   reviews:        'Avis & Notes',
                   reviewsmanager: 'Gestion des Avis',
                   invoice:        'Éditeur de Factures',
                   welcome:        "Livret d'accueil",
                   shareLinks:     'Liens de Partage',
                   forecasting:    'Prévisionnel',
                   pricing:        'Moteur de Prix',
                   notifications:  'Notifications',
                   settings:       'Paramètres',
                   intelligence:   '🧠 IA Propriétés',
                   assistant:      '💬 Assistant IA',
                   autopilot:      '🤖 Autopilot',
                   'revenue-live': '📊 Revenus Live',
                   messaging:      '💬 Messagerie Hub',
                   occupancy:      "🎯 Optimiseur d'Occupation",
                   'gmail-import': '📧 Import Gmail',
                 } as Record<string, string>)[activeTab] ?? activeTab}
               </h1>
               <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               </p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Global Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Rechercher...</span>
              <kbd className={`ml-2 px-1.5 py-0.5 text-xs rounded ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                ⌘K
              </kbd>
            </button>

            {/* Export/Import Button */}
            <button
              onClick={() => setShowExportImport(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
              title="Export/Import de données"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">Export/Import</span>
            </button>

            {/* Notification Bell with live badge */}
            <a
              href="/notifications"
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all border ${
                isDark
                  ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-amber-500/30 hover:text-amber-400'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {(bookings.filter(b => b.status === 'pending').length + maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'high').length) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm animate-pulse">
                  {Math.min(bookings.filter(b => b.status === 'pending').length + maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'high').length, 9)}
                  {(bookings.filter(b => b.status === 'pending').length + maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'high').length) > 9 && '+'}
                </span>
              )}
            </a>
            
            <select
              value={selectedPropertyId ?? ''}
              onChange={(e) => setSelectedPropertyId(e.target.value ? Number(e.target.value) : undefined)}
              className={`border rounded-xl px-3 py-2 text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500/20 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              <option value="">Toutes les propriétés</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <div className={`h-8 w-[1px] ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
            <LanguageSelector size="sm" />
            <ThemeToggle size="sm" />
            <NextLink href="/" className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <Home className="w-4 h-4" />
            </NextLink>
          </div>
        </header>

        {/* Breadcrumbs Navigation (Accessibilité WCAG 2.1 AA) */}
        <nav aria-label="Fil d'Ariane" className={`px-6 py-3 border-b ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <NextLink 
                href="/admin" 
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Accueil
              </NextLink>
            </li>
            <li className={isDark ? 'text-gray-600' : 'text-gray-400'}>/</li>
            <li aria-current="page" className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {({
                overview:       'Tableau de bord',
                bookings:       'Réservations',
                properties:     'Mes Propriétés',
                guests:         'Voyageurs',
                financial:      'Rapports Financiers',
                maintenance:    'Maintenance',
                contract:       'Générateur de Contrats',
                cleaning:       'Check-lists Ménage',
                cleaningGallery:'Galerie Ménage',
                inventory:      'Inventaire',
                qrcheckin:      'QR Check-in',
                videoguides:    'Guides Vidéo',
                reviews:        'Avis & Notes',
                reviewsmanager: 'Gestion des Avis',
                invoice:        'Éditeur de Factures',
                welcome:        "Livret d'accueil",
                shareLinks:     'Liens de Partage',
                forecasting:    'Prévisionnel',
                pricing:        'Moteur de Prix',
                notifications:  'Notifications',
                settings:       'Paramètres',
                intelligence:   '🧠 IA Propriétés',
                assistant:      '💬 Assistant IA',
                autopilot:      '🤖 Autopilot',
                'revenue-live': '📊 Revenus Live',
                messaging:      '💬 Messagerie Hub',
                occupancy:      '🎯 Optimiseur d\'Occupation',
                'gmail-import': '📧 Import Gmail',
              } as Record<string, string>)[activeTab] ?? activeTab}
            </li>
          </ol>
        </nav>

        <div className="p-6 pb-32 space-y-6 max-w-[1600px] mx-auto">
           {/* Overview Tab */}
           {activeTab === 'overview' && (
             <DashboardOverview onNavigate={(tab) => setActiveTab(tab)} />
           )}

           {/* Content Area */}
           <div className="animate-fadeIn">
            {/* Bookings Tab */}
             {activeTab === 'bookings' && (
                <BookingsManager
                  filteredBookings={filteredBookings}
                  onEditBooking={setBookingToEdit}
                  onNewBooking={handleNewBooking}
                />
              )}

              {/* Properties Tab */}
              {activeTab === 'properties' && (
                <div className={`glass-pro rounded-2xl p-6 border-gradient animate-fadeInUp`}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Gestion des Propriétés</h2>
                      <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
                        Gérez vos <span className="font-bold text-[#FF385C]">{properties.length}</span> propriété{properties.length > 1 ? 's' : ''}
                        {properties.length > 0 && (
                          <span className="ml-2">• <span className="font-semibold">{propertiesFiltered.length}</span> affichée{propertiesFiltered.length > 1 ? 's' : ''}</span>
                        )}
                      </p>
                    </div>
                    <Button onClick={() => setShowPropertyConfigurator(true)} className="flex items-center gap-2 hover-lift">
                      <Plus className="w-4 h-4" /> Ajouter une Propriété
                    </Button>
                  </div>

                  {properties.length > 0 && (
                    <div className="mb-5 grid md:grid-cols-3 gap-3">
                      <div className={`flex items-center gap-2 rounded-xl px-3 py-2 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-gray-200'}`}>
                        <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <input
                          value={propertySearch}
                          onChange={(e) => setPropertySearch(e.target.value)}
                          placeholder="Rechercher (nom, ville, adresse)"
                          className={`w-full bg-transparent text-sm outline-none ${isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-400'}`}
                        />
                      </div>
                      <select
                        value={propertyStatusFilter}
                        onChange={(e) => setPropertyStatusFilter(e.target.value as 'all' | 'active' | 'maintenance' | 'inactive')}
                        className={`rounded-xl px-3 py-2 text-sm border outline-none ${isDark ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                      >
                        <option value="all">Statut: Tous</option>
                        <option value="active">Actives ({propertyStatusCounts.active})</option>
                        <option value="maintenance">Maintenance ({propertyStatusCounts.maintenance})</option>
                        <option value="inactive">Inactives ({propertyStatusCounts.inactive})</option>
                      </select>
                      <select
                        value={propertySort}
                        onChange={(e) => setPropertySort(e.target.value as 'revenue-desc' | 'bookings-desc' | 'name-asc' | 'price-desc')}
                        className={`rounded-xl px-3 py-2 text-sm border outline-none ${isDark ? 'bg-white/[0.03] border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'}`}
                      >
                        <option value="revenue-desc">Trier: Revenus décroissants</option>
                        <option value="bookings-desc">Trier: Réservations décroissantes</option>
                        <option value="price-desc">Trier: Prix/nuit décroissant</option>
                        <option value="name-asc">Trier: Nom A → Z</option>
                      </select>
                    </div>
                  )}

                  {properties.length > 0 && (
                    <div className="mb-5 grid md:grid-cols-3 gap-3">
                      <div className={`rounded-xl px-3 py-2 text-sm border flex items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <span>Revenus annuels (vue)</span>
                        <span className="font-bold text-emerald-500">
                          {propertiesFiltered.reduce((sum, p) => sum + getRevenueByProperty(p.id, yearStart, yearEnd), 0).toLocaleString('fr-FR')}€
                        </span>
                      </div>
                      <div className={`rounded-xl px-3 py-2 text-sm border flex items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <span>Prix moyen / nuit</span>
                        <span className="font-bold text-indigo-500">{avgNightlyPrice.toLocaleString('fr-FR')}€</span>
                      </div>
                      <div className={`rounded-xl px-3 py-2 text-sm border flex items-center justify-between ${isDark ? 'bg-white/[0.03] border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                        <span>CA total portefeuille</span>
                        <span className="font-bold text-emerald-500">{totalRevenue.toLocaleString('fr-FR')}€</span>
                      </div>
                    </div>
                  )}

                  {properties.length === 0 ? (
                    <div className={`text-center py-16 rounded-2xl border-gradient ${isDark ? 'bg-white/[0.02]' : 'bg-[#f7f7f7]'}`}>
                      <div className="w-20 h-20 rounded-2xl aurora-bg flex items-center justify-center mx-auto mb-4 animate-float pulse-ring">
                        <Building2 className="w-9 h-9 text-white" />
                      </div>
                      <p className={`text-lg font-black ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Aucune propriété</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>Ajoutez votre première propriété</p>
                    </div>
                  ) : propertiesFiltered.length === 0 ? (
                    <div className={`text-center py-12 rounded-2xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      <p className={`text-lg font-black ${isDark ? 'text-white/70' : 'text-gray-700'}`}>Aucun résultat</p>
                      <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        Essayez un autre mot-clé ou réinitialisez votre recherche.
                      </p>
                      <button
                        onClick={() => setPropertySearch('')}
                        className={`mt-4 px-3 py-1.5 rounded-lg text-sm font-semibold ${isDark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4 stagger-children">
                      {propertiesFiltered.map(property => {
                        const revenue = getRevenueByProperty(property.id, yearStart, yearEnd);
                        const propBookings = bookings.filter(b => b.propertyId === property.id);
                        const bookedNightsMonth = getPropertyBookedNightsThisMonth(property.id);
                        const occupancyMonth = Math.min(100, Math.round((bookedNightsMonth / Math.max(1, daysInCurrentMonth)) * 100));
                        const statusLabel = property.status === 'blocked' ? 'inactive' : property.status;
                        
                        // Trouver la prochaine réservation (ou en cours)
                        const nextBooking = propBookings
                          .filter(b => ['confirmed', 'pending'].includes(b.status))
                          .filter(b => new Date(b.checkOut).getTime() >= new Date().setHours(0,0,0,0))
                          .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())[0];
                          
                        const nights = nextBooking ? Math.max(1, Math.round((new Date(nextBooking.checkOut).getTime() - new Date(nextBooking.checkIn).getTime()) / 86400000)) : 0;

                        return (
                          <div key={property.id} className={`group relative rounded-3xl p-6 transition-all duration-300 border hover:-translate-y-1 ${
                            isDark
                              ? 'bg-[#1e1e2d] border-white/[0.06] hover:border-indigo-500/30' 
                              : 'bg-white border-gray-100 hover:border-indigo-200 shadow-xl shadow-gray-200/50'
                          }`}>
                            {/* Background Glow Effect on Hover */}
                            <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                              isDark ? 'bg-indigo-500/[0.03]' : 'bg-gradient-to-br from-indigo-50 to-transparent'
                            }`} />
                            
                            <div className="relative z-10">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                                    isDark ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white' : 'bg-gradient-to-br from-white to-indigo-50 text-indigo-600 border border-indigo-100'
                                  }`}>
                                    <Building2 className="w-7 h-7" />
                                  </div>
                                  <div>
                                    <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{property.name}</h3>
                                    <div className={`flex items-center gap-1.5 mt-1 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                      {property.address}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                                        statusLabel === 'active'
                                          ? 'bg-emerald-500/15 text-emerald-500'
                                          : statusLabel === 'maintenance'
                                            ? 'bg-amber-500/15 text-amber-500'
                                            : 'bg-gray-500/15 text-gray-500'
                                      }`}>
                                        {statusLabel}
                                      </span>
                                      <span className={`text-[11px] font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                        Occupation mois: {occupancyMonth}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-x-0 md:translate-x-2 md:group-hover:translate-x-0">
                                  <button onClick={() => setPropertyToEdit(property)} className={`p-2.5 rounded-xl transition-all hover:scale-110 ${
                                    isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-50 hover:bg-white text-gray-600 shadow-sm border border-gray-100'
                                  }`}>
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setPropertyToDelete(property.id)} className={`p-2.5 rounded-xl transition-all hover:scale-110 ${
                                    isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-50 hover:bg-red-100 text-red-500'
                                  }`}>
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3 mb-6">
                                <div className={`rounded-2xl p-3 text-center transition-colors ${
                                  isDark ? 'bg-white/[0.03] group-hover:bg-white/[0.06]' : 'bg-gray-50 group-hover:bg-gray-100'
                                }`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>Réservations</p>
                                  <p className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{propBookings.length}</p>
                                </div>
                                <div className={`rounded-2xl p-3 text-center transition-colors ${
                                  isDark ? 'bg-white/[0.03] group-hover:bg-white/[0.06]' : 'bg-gray-50 group-hover:bg-gray-100'
                                }`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>Revenus</p>
                                  <p className="font-black text-lg text-emerald-500">{revenue.toLocaleString('fr-FR')}&euro;</p>
                                </div>
                                <div className={`rounded-2xl p-3 text-center transition-colors ${
                                  isDark ? 'bg-white/[0.03] group-hover:bg-white/[0.06]' : 'bg-gray-50 group-hover:bg-gray-100'
                                }`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>Capacité</p>
                                  <p className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{property.maxGuests}</p>
                                </div>
                              </div>

                              <div className={`mb-6 rounded-2xl p-3 border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Nuits réservées ce mois
                                  </span>
                                  <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {bookedNightsMonth}/{daysInCurrentMonth}
                                  </span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                                    style={{ width: `${occupancyMonth}%` }}
                                  />
                                </div>
                              </div>

                              {/* Affichage de la prochaine réservation inline */}
                              {nextBooking ? (
                                <div className={`mb-6 p-4 rounded-2xl border ${isDark ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                    <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                      En cours / À venir
                                    </span>
                                  </div>
                                  <div className={`flex flex-col gap-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold">{nextBooking.guestInfo.name}</span>
                                      <span className="font-bold text-emerald-500">{nextBooking.totalPrice.toLocaleString('fr-FR')} €</span>
                                    </div>
                                    <div className="flex justify-between items-center opacity-80">
                                      <span>
                                        {new Date(nextBooking.checkIn).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} &rarr; {new Date(nextBooking.checkOut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ({nights}n)
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {nextBooking.guests}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className={`mb-6 p-4 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                                  <span className="text-xl mb-1 block">🏖️</span>
                                  <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Aucune prochaine réservation</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-500/20">
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                                  isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {property.price}€ <span className="opacity-60 text-xs font-normal">/ nuit</span>
                              </div>
                              <button
                                onClick={() => { setSelectedPropertyId(property.id); setActiveTab('bookings'); }}
                                className="group/btn flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                              >
                                Voir le détail
                                <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Guests Tab */}
            {activeTab === 'guests' && (
              <div className="animate-fadeInUp">
                <GuestManager />
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className={`glass-pro rounded-2xl p-6 border-gradient animate-fadeInUp`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Avis Clients</h2>
                    <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}><span className="font-bold text-[#FF385C]">{reviews.length}</span> avis au total</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm stagger-children">
                    <div className={`glass-card rounded-xl px-4 py-2.5 hover-lift card-shine`}>
                      <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Positifs : </span>
                      <span className="font-black text-emerald-400">{reviews.filter(r => r.rating >= 4).length}</span>
                    </div>
                    <div className={`glass-card rounded-xl px-4 py-2.5 hover-lift card-shine`}>
                      <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Note : </span>
                      <span className="font-black text-amber-400">{averageRating}/5</span>
                    </div>
                  </div>
                </div>
                {filteredReviews.length === 0 ? (
                  <div className={`text-center py-16 rounded-2xl ${isDark ? 'bg-white/[0.02]' : 'bg-[#f7f7f7]'}`}>
                    <div className="w-20 h-20 rounded-2xl aurora-bg flex items-center justify-center mx-auto mb-4 animate-float pulse-ring">
                      <Star className="w-9 h-9 text-white" />
                    </div>
                    <h3 className={`text-lg font-black ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Avis récents</h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>Les avis de vos clients apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="space-y-4 stagger-children">
                    {filteredReviews.map(review => {
                      const prop = properties.find(p => p.id === review.propertyId);
                      return (
                        <div key={review.id} className={`group relative rounded-3xl p-6 transition-all duration-300 border ${
                          isDark 
                            ? 'bg-[#1e1e2d] border-white/[0.06] hover:border-indigo-500/30' 
                            : 'bg-white border-gray-100 hover:border-indigo-200 shadow-xl shadow-gray-200/50'
                        }`}>
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg font-black text-lg ${
                              review.rating >= 4 
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/20' 
                                : review.rating >= 3 
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/20' 
                                  : 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-red-500/20'
                            }`}>
                              {review.rating}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {prop?.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      par <span className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {guests.find(g => g.id === review.guestId)?.name ?? 'Client'}
                                      </span>
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                      {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => { setReviewToReply(review); setReplyText(review.response?.message || ''); }}
                                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 ${
                                    review.response?.message 
                                      ? isDark 
                                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500'
                                  }`}
                                >
                                  {review.response?.message ? 'Modifier' : 'Répondre'}
                                </button>
                              </div>

                              <div className="flex items-center gap-1 mb-3">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star 
                                    key={i} 
                                    className={`w-4 h-4 ${
                                      i < review.rating 
                                        ? 'text-amber-400 fill-amber-400' 
                                        : isDark ? 'text-gray-700' : 'text-gray-200'
                                    }`} 
                                  />
                                ))}
                              </div>

                              <div className={`p-4 rounded-2xl relative ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                                <Quote className={`w-8 h-8 absolute -top-4 -left-2 opacity-10 ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                <p className={`text-sm leading-relaxed relative z-10 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {review.comment}
                                </p>
                              </div>

                              {review.response?.message && (
                                <div className={`mt-3 ml-8 p-4 rounded-2xl border-l-4 ${
                                  isDark 
                                    ? 'border-indigo-500 bg-indigo-500/5' 
                                    : 'border-indigo-500 bg-indigo-50'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      isDark ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'
                                    }`}>
                                      V
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wide ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                      Votre réponse
                                    </span>
                                  </div>
                                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {review.response.message}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Maintenance Tab */}
            {activeTab === 'maintenance' && <MaintenanceManagerAdvanced />}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && <InventoryManager />}

            {/* Financial Tab */}
            {activeTab === 'financial' && <FinancialReports propertyId={selectedPropertyId} />}

            {/* QR Check-in Tab */}
            {activeTab === 'qrcheckin' && <QRCheckIn />}

            {/* Contract Tab */}
            {activeTab === 'contract' && <ContractGenerator />}

            {/* Cleaning Tab */}
            {activeTab === 'cleaning' && <CleaningChecklist />}

            {/* Welcome Tab */}
            {activeTab === 'welcome' && (
              <div>
                {selectedPropertyId ? (
                  <PropertySheet propertyId={selectedPropertyId} onClose={() => setSelectedPropertyId(undefined)} onEdit={() => { const prop = properties.find(p => p.id === selectedPropertyId); if (prop) setPropertyToEdit(prop); }} />
                ) : (
                  <WelcomeGuideGenerator />
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && <SettingsManager />}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && <PricingEngine />}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && <NotificationCenter onRequestSettings={() => { setSettingsTab('notifications'); setActiveTab('settings'); }} />}

            {/* Cleaning Gallery Tab */}
            {activeTab === 'cleaningGallery' && <CleaningGallery />}

            {/* Share Links Tab */}
            {activeTab === 'shareLinks' && <ClientShareLink />}

            {/* Revenue Forecasting Tab */}
            {activeTab === 'forecasting' && <RevenueForecasting />}

            {/* Equipment Video QR Tab */}
            {activeTab === 'videoguides' && <EquipmentVideoQR />}

            {/* Reviews Manager Tab */}
            {activeTab === 'reviewsmanager' && <ReviewsManager />}
            {activeTab === 'invoice' && <InvoiceEditor />}
            {activeTab === 'intelligence' && <SmartPropertyIntelligence />}
            {activeTab === 'assistant' && <SmartChatAssistant />}
            {activeTab === 'autopilot' && <RevenueAutopilot />}

            {/* ===== NOUVELLES FONCTIONS ===== */}
            {activeTab === 'revenue-live' && <LiveRevenueTracker />}
            {activeTab === 'messaging' && <GuestMessagingHub />}
            {activeTab === 'occupancy' && <OccupancyOptimizer />}
            {activeTab === 'gmail-import' && <GmailImporter />}
          </div>

          </div>
      </main>


      {/* ========== MODALS ========== */}

      {/* New Booking Modal */}
      {showNewBookingModal && (
        <Modal isOpen={true} onClose={() => setShowNewBookingModal(false)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl aurora-bg flex items-center justify-center"><Calendar className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Nouvelle Réservation</h3>
              </div>
              <button onClick={() => setShowNewBookingModal(false)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Propriété</label>
                <select value={newBooking.propertyId} onChange={(e) => setNewBooking({...newBooking, propertyId: e.target.value})} className={`w-full border rounded-lg px-3 py-2 focus:ring-[#FF385C]/40 focus:border-[#FF385C]/50 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="">Sélectionner une propriété</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom du client</label>
                <input type="text" value={newBooking.guestName} onChange={(e) => setNewBooking({...newBooking, guestName: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Nom complet" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Email</label>
                  <input type="email" value={newBooking.guestEmail} onChange={(e) => setNewBooking({...newBooking, guestEmail: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="email@example.com" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Téléphone</label>
                  <input type="tel" value={newBooking.guestPhone} onChange={(e) => setNewBooking({...newBooking, guestPhone: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="+33..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Arrivée</label>
                  <input type="date" value={newBooking.checkIn} onChange={(e) => setNewBooking({...newBooking, checkIn: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Départ</label>
                  <input type="date" value={newBooking.checkOut} onChange={(e) => setNewBooking({...newBooking, checkOut: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Voyageurs</label>
                  <input type="number" min="1" value={newBooking.guests} onChange={(e) => setNewBooking({...newBooking, guests: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Montant total (&euro;)</label>
                  <input type="number" min="0" value={newBooking.totalAmount} onChange={(e) => setNewBooking({...newBooking, totalAmount: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Demandes spéciales</label>
                <textarea value={newBooking.specialRequests} onChange={(e) => setNewBooking({...newBooking, specialRequests: e.target.value})} className={`w-full border rounded-lg px-3 py-2 h-20 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Notes particulières..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowNewBookingModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitBooking}>Créer la réservation</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Booking Modal */}
      {bookingToEdit && (
        <Modal isOpen={true} onClose={() => setBookingToEdit(null)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><Edit className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Modifier la Réservation</h3>
              </div>
              <button onClick={() => setBookingToEdit(null)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom du client</label>
                <input type="text" value={bookingToEdit.guestInfo?.name ?? ''} onChange={(e) => setBookingToEdit({...bookingToEdit, guestInfo: { ...bookingToEdit.guestInfo, name: e.target.value }})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Arrivée</label>
                  <input type="date" value={bookingToEdit.checkIn} onChange={(e) => setBookingToEdit({...bookingToEdit, checkIn: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Départ</label>
                  <input type="date" value={bookingToEdit.checkOut} onChange={(e) => setBookingToEdit({...bookingToEdit, checkOut: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Statut</label>
                  <select value={bookingToEdit.status} onChange={(e) => setBookingToEdit({...bookingToEdit, status: e.target.value as Booking['status']})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                    <option value="confirmed">Confirmé</option>
                    <option value="pending">En attente</option>
                    <option value="cancelled">Annulé</option>
                    <option value="completed">Terminé</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Paiement</label>
                  <select value={bookingToEdit.paymentStatus} onChange={(e) => setBookingToEdit({...bookingToEdit, paymentStatus: e.target.value as Booking['paymentStatus']})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                    <option value="pending">En attente</option>
                    <option value="paid">Payé</option>
                    <option value="refunded">Remboursé</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Montant total (&euro;)</label>
                <input type="number" min="0" value={bookingToEdit.totalPrice} onChange={(e) => setBookingToEdit({...bookingToEdit, totalPrice: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Demandes spéciales</label>
                <textarea value={bookingToEdit.specialRequests ?? ''} onChange={(e) => setBookingToEdit({...bookingToEdit, specialRequests: e.target.value})} className={`w-full border rounded-lg px-3 py-2 h-20 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setBookingToEdit(null)}>Annuler</Button>
              <Button onClick={handleUpdateBooking}>Sauvegarder</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Guest Modal */}
      {showNewGuestModal && (
        <Modal isOpen={true} onClose={() => setShowNewGuestModal(false)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF385C] to-rose-500 flex items-center justify-center"><UserPlus className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Nouveau Client</h3>
              </div>
              <button onClick={() => setShowNewGuestModal(false)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom complet</label>
                <input type="text" value={newGuest.name} onChange={(e) => setNewGuest({...newGuest, name: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Nom et prénom" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Email</label>
                  <input type="email" value={newGuest.email} onChange={(e) => setNewGuest({...newGuest, email: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="email@example.com" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Téléphone</label>
                  <input type="tel" value={newGuest.phone} onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="+33..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nationalité</label>
                  <input type="text" value={newGuest.nationality} onChange={(e) => setNewGuest({...newGuest, nationality: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Nationalité" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Langue</label>
                  <select value={newGuest.language} onChange={(e) => setNewGuest({...newGuest, language: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowNewGuestModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitGuest}>Créer le voyageur</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Guest Modal */}
      {guestToEdit && (
        <Modal isOpen={true} onClose={() => setGuestToEdit(null)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center"><Edit className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Modifier le Client</h3>
              </div>
              <button onClick={() => setGuestToEdit(null)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom complet</label>
                <input type="text" value={guestToEdit.name} onChange={(e) => setGuestToEdit(guestToEdit ? {...guestToEdit, name: e.target.value} : null)} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Email</label>
                  <input type="email" value={guestToEdit.email} onChange={(e) => setGuestToEdit(guestToEdit ? {...guestToEdit, email: e.target.value} : null)} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Téléphone</label>
                  <input type="tel" value={guestToEdit.phone} onChange={(e) => setGuestToEdit(guestToEdit ? {...guestToEdit, phone: e.target.value} : null)} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Statut</label>
                <select value={guestToEdit.status} onChange={(e) => setGuestToEdit(guestToEdit ? {...guestToEdit, status: e.target.value as Guest['status']} : null)} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="blocked">Bloqué</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setGuestToEdit(null)}>Annuler</Button>
              <Button onClick={handleUpdateGuest}>Sauvegarder</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Maintenance Modal */}
      {showNewMaintenanceModal && (
        <Modal isOpen={true} onClose={() => setShowNewMaintenanceModal(false)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"><Wrench className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Nouvelle Tâche de Maintenance</h3>
              </div>
              <button onClick={() => setShowNewMaintenanceModal(false)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Propriété</label>
                <select value={newMaintenanceTask.propertyId} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, propertyId: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="">Sélectionner une propriété</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Titre</label>
                <input type="text" value={newMaintenanceTask.title} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, title: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Titre de la tache" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Description</label>
                <textarea value={newMaintenanceTask.description} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, description: e.target.value})} className={`w-full border rounded-lg px-3 py-2 h-20 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Description détaillée..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Catégorie</label>
                  <select value={newMaintenanceTask.category} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, category: e.target.value as typeof newMaintenanceTask.category})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                    <option value="repair">Réparation</option>
                    <option value="cleaning">Nettoyage</option>
                    <option value="inspection">Inspection</option>
                    <option value="supplies">Fournitures</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Priorité</label>
                  <select value={newMaintenanceTask.priority} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, priority: e.target.value as typeof newMaintenanceTask.priority})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Date prévue</label>
                  <input type="date" value={newMaintenanceTask.scheduledDate} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, scheduledDate: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Coût estimé (&euro;)</label>
                  <input type="number" min="0" value={newMaintenanceTask.estimatedCost} onChange={(e) => setNewMaintenanceTask({...newMaintenanceTask, estimatedCost: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowNewMaintenanceModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitMaintenanceTask}>Créer la tâche</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Inventory Modal */}
      {showNewInventoryModal && (
        <Modal isOpen={true} onClose={() => setShowNewInventoryModal(false)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Package className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Ajouter un Article</h3>
              </div>
              <button onClick={() => setShowNewInventoryModal(false)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Propriété</label>
                <select value={newInventoryItem.propertyId} onChange={(e) => setNewInventoryItem({...newInventoryItem, propertyId: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="">Sélectionner une propriété</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom de l&apos;article</label>
                <input type="text" value={newInventoryItem.name} onChange={(e) => setNewInventoryItem({...newInventoryItem, name: e.target.value})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Nom de l'article" />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Catégorie</label>
                <select value={newInventoryItem.category} onChange={(e) => setNewInventoryItem({...newInventoryItem, category: e.target.value as typeof newInventoryItem.category})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="bedding">Literie</option>
                  <option value="towels">Serviettes</option>
                  <option value="kitchen">Cuisine</option>
                  <option value="bathroom">Salle de bain</option>
                  <option value="cleaning">Nettoyage</option>
                  <option value="electronics">Électronique</option>
                  <option value="furniture">Mobilier</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Quantité</label>
                  <input type="number" min="0" value={newInventoryItem.quantity} onChange={(e) => setNewInventoryItem({...newInventoryItem, quantity: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Quantité minimale</label>
                  <input type="number" min="0" value={newInventoryItem.minimumQuantity} onChange={(e) => setNewInventoryItem({...newInventoryItem, minimumQuantity: Number(e.target.value)})} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222]'}`} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowNewInventoryModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitInventoryItem}>Ajouter l&apos;article</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Financial Report Modal */}
      {showFinancialReportModal && (
        <Modal isOpen={true} onClose={() => setShowFinancialReportModal(false)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center"><DollarSign className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Générer un Rapport Financier</h3>
              </div>
              <button onClick={() => setShowFinancialReportModal(false)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Période</label>
                <select value={financialPeriod} onChange={(e) => setFinancialPeriod(e.target.value)} className={`w-full border rounded-lg px-3 py-2 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] [&>option]:bg-white'}`}>
                  <option value="month">Ce mois</option>
                  <option value="quarter">Ce trimestre</option>
                  <option value="year">Cette année</option>
                </select>
              </div>
              <div className={`glass-card rounded-2xl p-4 space-y-3 border-gradient`}>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Revenus totaux : <span className="font-black text-emerald-400 text-lg">{totalRevenue.toLocaleString('fr-FR')}&euro;</span></p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Réservations : <span className={`font-black text-lg ${isDark ? 'text-white' : 'text-[#222222]'}`}>{bookings.length}</span></p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Note moyenne : <span className="font-black text-amber-400 text-lg">{averageRating}/5</span></p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>Tâches en cours : <span className="font-black text-orange-400 text-lg">{pendingTasks}</span></p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowFinancialReportModal(false)}>Fermer</Button>
              <Button onClick={() => setShowFinancialReportModal(false)}>Exporter</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reply to Review Modal */}
      {reviewToReply && (
        <Modal isOpen={true} onClose={() => setReviewToReply(null)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-lg border-gradient animate-scaleIn`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center"><Star className="w-5 h-5 text-white" /></div>
                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Répondre à l&apos;avis</h3>
              </div>
              <button onClick={() => setReviewToReply(null)} className={`p-2 rounded-xl transition-all hover:scale-110 ${isDark ? 'text-[#717171] hover:text-white hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#222222] hover:bg-gray-100'}`}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className={`glass-card rounded-2xl p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{guests.find(g => g.id === reviewToReply.guestId)?.name ?? 'Client'}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < reviewToReply.rating ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.5)]' : isDark ? 'text-white/20' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{reviewToReply.comment}</p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Votre réponse</label>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className={`w-full border rounded-lg px-3 py-2 h-24 resize-none ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0]'}`} placeholder="Écrivez votre réponse..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setReviewToReply(null)}>Annuler</Button>
              <Button onClick={handleReplyToReview} className="flex items-center gap-2"><Send className="w-4 h-4" /> Envoyer</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Property Confirmation */}
      {propertyToDelete && (
        <Modal isOpen={true} onClose={() => setPropertyToDelete(null)}>
          <div className={`glass-pro border rounded-2xl p-6 w-full max-w-md border-gradient animate-scaleIn`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center"><Trash2 className="w-5 h-5 text-white" /></div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>Supprimer la Propriété</h3>
            </div>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cette action est irréversible. Toutes les données associées seront perdues.</p>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setPropertyToDelete(null)}>Annuler</Button>
              <Button variant="danger" onClick={() => { deleteProperty(propertyToDelete); setPropertyToDelete(null); }}>Supprimer</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Property Configurator Modal */}
      {showPropertyConfigurator && (
        <Modal isOpen={true} onClose={() => setShowPropertyConfigurator(false)}>
          <PropertyConfigurator onPropertyCreated={() => setShowPropertyConfigurator(false)} onCancel={() => setShowPropertyConfigurator(false)} />
        </Modal>
      )}

      {/* Property Edit via Configurator */}
      {propertyToEdit && (
        <Modal isOpen={true} onClose={() => setPropertyToEdit(null)}>
          <PropertyConfigurator initialProperty={propertyToEditForConfigurator} mode="edit" onPropertyCreated={() => setPropertyToEdit(null)} onCancel={() => setPropertyToEdit(null)} />
        </Modal>
      )}

      {/* Global Search Modal */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(url) => {
          // Parse URL params to navigate
          const params = new URLSearchParams(url.split('?')[1]);
          const tab = params.get('tab') as TabType;
          if (tab) setActiveTab(tab);
          setIsSearchOpen(false);
        }}
      />

      {/* Export/Import Modal */}
      {showExportImport && (
        <Modal isOpen={true} onClose={() => setShowExportImport(false)} size="xl">
          <DataExportImportAdvanced onClose={() => setShowExportImport(false)} />
        </Modal>
      )}
    </div>
  );
}

