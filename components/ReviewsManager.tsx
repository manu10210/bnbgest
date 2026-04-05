'use client';

import { useState, useMemo } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Star, StarHalf, MessageSquare, ThumbsUp, ThumbsDown, 
  TrendingUp, Filter, Search, Calendar, User, Home,
  Award, AlertCircle, Check, X, Eye, Reply, Flag,
  BarChart3, PieChart, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== TYPES ====================

interface Review {
  id: number;
  guestId: number;
  guestName: string;
  guestAvatar?: string;
  propertyId: number;
  propertyName: string;
  bookingId: number;
  rating: number;
  cleanliness: number;
  communication: number;
  checkIn: number;
  accuracy: number;
  location: number;
  value: number;
  comment: string;
  pros: string[];
  cons: string[];
  photos?: string[];
  helpful: number;
  notHelpful: number;
  response?: {
    text: string;
    date: string;
    author: string;
  };
  status: 'pending' | 'published' | 'hidden' | 'reported';
  isVerifiedBooking: boolean;
  createdAt: string;
  publishedAt?: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  categoryAverages: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
  responseRate: number;
  verifiedPercentage: number;
}

// ==================== COMPONENT ====================

export default function ReviewsManager() {
  const { properties, guests, bookings } = useBNB();
  const { isDark } = useTheme();

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 1,
      guestId: 1,
      guestName: 'Marie Dupont',
      propertyId: 1,
      propertyName: 'Appartement Marais',
      bookingId: 1,
      rating: 4.5,
      cleanliness: 5,
      communication: 5,
      checkIn: 4,
      accuracy: 4,
      location: 5,
      value: 4,
      comment: 'Excellent séjour dans ce magnifique appartement ! La localisation est idéale, à deux pas du métro et des commerces. L\'appartement est exactement conforme aux photos, très bien équipé et décoré avec goût.',
      pros: ['Emplacement parfait', 'Très propre', 'Bien équipé'],
      cons: ['Bruit de la rue le matin'],
      helpful: 12,
      notHelpful: 1,
      response: {
        text: 'Merci beaucoup Marie pour votre retour détaillé ! Nous sommes ravis que vous ayez apprécié votre séjour. Concernant le bruit, nous allons installer des rideaux occultants et phoniques.',
        date: '2026-03-15',
        author: 'Équipe BNBGest'
      },
      status: 'published',
      isVerifiedBooking: true,
      createdAt: '2026-03-10',
      publishedAt: '2026-03-10'
    },
    {
      id: 2,
      guestId: 2,
      guestName: 'Jean Martin',
      propertyId: 2,
      propertyName: 'Studio Montmartre',
      bookingId: 2,
      rating: 5,
      cleanliness: 5,
      communication: 5,
      checkIn: 5,
      accuracy: 5,
      location: 5,
      value: 5,
      comment: 'Parfait de A à Z ! Hôte très réactif, appartement impeccable, quartier vivant et authentique. Je recommande à 100% et reviendrai sans hésiter.',
      pros: ['Hôte au top', 'Quartier animé', 'Excellent rapport qualité-prix'],
      cons: [],
      helpful: 8,
      notHelpful: 0,
      status: 'published',
      isVerifiedBooking: true,
      createdAt: '2026-03-05',
      publishedAt: '2026-03-05'
    },
    {
      id: 3,
      guestId: 3,
      guestName: 'Sophie Bernard',
      propertyId: 1,
      propertyName: 'Appartement Marais',
      bookingId: 3,
      rating: 3,
      cleanliness: 3,
      communication: 4,
      checkIn: 3,
      accuracy: 3,
      location: 4,
      value: 3,
      comment: 'Séjour correct mais quelques points à améliorer. L\'appartement est bien situé mais mériterait un rafraîchissement. Bon accueil de la part de l\'hôte.',
      pros: ['Bonne localisation', 'Hôte sympathique'],
      cons: ['Équipements vieillissants', 'Literie à changer'],
      helpful: 5,
      notHelpful: 2,
      status: 'pending',
      isVerifiedBooking: true,
      createdAt: '2026-03-20'
    }
  ]);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'published' | 'hidden' | 'reported'>('all');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterProperty, setFilterProperty] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');

  // ==================== STATS ====================

  const stats: ReviewStats = useMemo(() => {
    const totalReviews = reviews.length;
    const publishedReviews = reviews.filter(r => r.status === 'published');
    
    const averageRating = publishedReviews.length > 0
      ? publishedReviews.reduce((sum, r) => sum + r.rating, 0) / publishedReviews.length
      : 0;

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    publishedReviews.forEach(r => {
      const rating = Math.floor(r.rating);
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    const categoryAverages = {
      cleanliness: 0,
      communication: 0,
      checkIn: 0,
      accuracy: 0,
      location: 0,
      value: 0
    };

    if (publishedReviews.length > 0) {
      publishedReviews.forEach(r => {
        categoryAverages.cleanliness += r.cleanliness;
        categoryAverages.communication += r.communication;
        categoryAverages.checkIn += r.checkIn;
        categoryAverages.accuracy += r.accuracy;
        categoryAverages.location += r.location;
        categoryAverages.value += r.value;
      });

      Object.keys(categoryAverages).forEach(key => {
        categoryAverages[key as keyof typeof categoryAverages] /= publishedReviews.length;
      });
    }

    const reviewsWithResponse = reviews.filter(r => r.response).length;
    const responseRate = totalReviews > 0 ? (reviewsWithResponse / totalReviews) * 100 : 0;

    const verifiedReviews = reviews.filter(r => r.isVerifiedBooking).length;
    const verifiedPercentage = totalReviews > 0 ? (verifiedReviews / totalReviews) * 100 : 0;

    return {
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
      categoryAverages,
      responseRate,
      verifiedPercentage
    };
  }, [reviews]);

  // ==================== FILTERED & SORTED ====================

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    // Filter by rating
    if (filterRating !== null) {
      filtered = filtered.filter(r => Math.floor(r.rating) === filterRating);
    }

    // Filter by property
    if (filterProperty !== null) {
      filtered = filtered.filter(r => r.propertyId === filterProperty);
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.guestName.toLowerCase().includes(query) ||
        r.propertyName.toLowerCase().includes(query) ||
        r.comment.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else {
        return (b.helpful - b.notHelpful) - (a.helpful - a.notHelpful);
      }
    });

    return filtered;
  }, [reviews, filterStatus, filterRating, filterProperty, searchQuery, sortBy]);

  // ==================== ACTIONS ====================

  const handlePublishReview = (id: number) => {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'published', publishedAt: new Date().toISOString() } : r
    ));
  };

  const handleHideReview = (id: number) => {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'hidden' } : r
    ));
  };

  const handleReportReview = (id: number) => {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'reported' } : r
    ));
  };

  const handleAddResponse = () => {
    if (!selectedReview || !responseText.trim()) return;

    setReviews(prev => prev.map(r =>
      r.id === selectedReview.id
        ? {
            ...r,
            response: {
              text: responseText,
              date: new Date().toISOString().split('T')[0],
              author: 'Équipe BNBGest'
            }
          }
        : r
    ));

    setResponseText('');
    setShowResponseModal(false);
    setSelectedReview(null);
  };

  const handleMarkHelpful = (id: number) => {
    setReviews(prev => prev.map(r =>
      r.id === id ? { ...r, helpful: r.helpful + 1 } : r
    ));
  };

  // ==================== RENDER ====================

  const renderStars = (rating: number, size = 16) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={size} className="fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf size={size} className="fill-yellow-400 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={size} className="text-gray-300" />
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className={`rounded-2xl p-8 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-3`}>
                <MessageSquare className="w-8 h-8 text-blue-600" />
                Gestion des Avis
              </h1>
              <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Suivez et répondez aux avis de vos voyageurs
              </p>
            </div>
            <div className={`px-4 py-2 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-600" />
                <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.averageRating.toFixed(1)}
                </span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>/5</span>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalReviews}
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-yellow-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Moyenne</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.averageRating.toFixed(1)} ⭐
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Reply className="w-4 h-4 text-green-600" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Taux réponse</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.responseRate.toFixed(0)}%
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-purple-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-purple-600" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vérifiés</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.verifiedPercentage.toFixed(0)}%
              </p>
            </div>

            <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>En attente</span>
              </div>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {reviews.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Distribution des notes
            </h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map(rating => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-3">
                    <span className={`text-sm w-12 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {rating} ⭐
                    </span>
                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: rating * 0.1 }}
                        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
                      />
                    </div>
                    <span className={`text-sm w-16 text-right ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Averages — Sentiment Strip */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Analyse par catégorie
            </h3>
            <div className="space-y-3">
              {[
                { key: 'cleanliness', label: '🧹 Propreté', color: 'from-cyan-400 to-cyan-500' },
                { key: 'communication', label: '💬 Communication', color: 'from-blue-400 to-blue-500' },
                { key: 'checkIn', label: '🔑 Check-in', color: 'from-violet-400 to-violet-500' },
                { key: 'accuracy', label: '📋 Exactitude', color: 'from-indigo-400 to-indigo-500' },
                { key: 'location', label: '📍 Emplacement', color: 'from-pink-400 to-pink-500' },
                { key: 'value', label: '💰 Rapport Q/P', color: 'from-emerald-400 to-emerald-500' },
              ].map(({ key, label, color }) => {
                const val = stats.categoryAverages[key as keyof typeof stats.categoryAverages];
                const pct = (val / 5) * 100;
                const sentiment = val >= 4.5 ? '😊 Excellent' : val >= 3.5 ? '🙂 Bien' : val >= 2.5 ? '😐 Neutre' : '😞 À améliorer';
                const sentimentColor = val >= 4.5 ? 'text-emerald-500' : val >= 3.5 ? 'text-blue-500' : val >= 2.5 ? 'text-amber-500' : 'text-red-500';
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold ${sentimentColor}`}>{sentiment}</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{val.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full bg-gradient-to-r ${color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher un avis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className={`px-4 py-2 rounded-xl border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="published">Publiés</option>
              <option value="hidden">Masqués</option>
              <option value="reported">Signalés</option>
            </select>

            {/* Rating Filter */}
            <select
              value={filterRating ?? 'all'}
              onChange={(e) => setFilterRating(e.target.value === 'all' ? null : Number(e.target.value))}
              className={`px-4 py-2 rounded-xl border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">Toutes les notes</option>
              <option value="5">5 étoiles</option>
              <option value="4">4 étoiles</option>
              <option value="3">3 étoiles</option>
              <option value="2">2 étoiles</option>
              <option value="1">1 étoile</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-4 py-2 rounded-xl border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-blue-500`}
            >
              <option value="recent">Plus récents</option>
              <option value="rating">Note (haute-basse)</option>
              <option value="helpful">Plus utiles</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredAndSortedReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {review.guestName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {review.guestName}
                        </h3>
                        {review.isVerifiedBooking && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30">
                            <Check className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600">Vérifié</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Home className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {review.propertyName}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>•</span>
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(review.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Sentiment Badge */}
                    <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      review.rating >= 4.5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      review.rating >= 3.5 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      review.rating >= 2.5 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {review.rating >= 4.5 ? '😊 Excellent' : review.rating >= 3.5 ? '🙂 Bien' : review.rating >= 2.5 ? '😐 Neutre' : '😞 Décevant'}
                    </div>

                    {/* Status Badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      review.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      review.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      review.status === 'hidden' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {review.status === 'published' ? 'Publié' :
                       review.status === 'pending' ? 'En attente' :
                       review.status === 'hidden' ? 'Masqué' : 'Signalé'}
                    </div>

                    {/* Rating */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-xl ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-50'}`}>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comment */}
                <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {review.comment}
                </p>

                {/* Pros & Cons */}
                {(review.pros.length > 0 || review.cons.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {review.pros.length > 0 && (
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-4 h-4 text-green-600" />
                          <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                            Points positifs
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {review.pros.map((pro, idx) => (
                            <li key={idx} className={`text-sm flex items-start gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              <span className="text-green-600">•</span>
                              {pro}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.cons.length > 0 && (
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsDown className="w-4 h-4 text-red-600" />
                          <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>
                            Points à améliorer
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {review.cons.map((con, idx) => (
                            <li key={idx} className={`text-sm flex items-start gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              <span className="text-red-600">•</span>
                              {con}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Response */}
                {review.response && (
                  <div className={`p-4 rounded-xl border-l-4 border-blue-500 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'} mb-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Reply className="w-4 h-4 text-blue-600" />
                      <span className={`text-sm font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        Réponse de {review.response.author}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        • {new Date(review.response.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {review.response.text}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleMarkHelpful(review.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                        isDark
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm">{review.helpful}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDetails(true);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                        isDark
                          ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                          : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">Détails</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.status === 'pending' && (
                      <button
                        onClick={() => handlePublishReview(review.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Publier
                      </button>
                    )}
                    {!review.response && (
                      <button
                        onClick={() => {
                          setSelectedReview(review);
                          setShowResponseModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <Reply className="w-4 h-4" />
                        Répondre
                      </button>
                    )}
                    {review.status === 'published' && (
                      <button
                        onClick={() => handleHideReview(review.id)}
                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                          isDark
                            ? 'bg-gray-700 text-white hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Masquer
                      </button>
                    )}
                    <button
                      onClick={() => handleReportReview(review.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAndSortedReviews.length === 0 && (
            <div className={`text-center py-12 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Aucun avis trouvé
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-2xl rounded-2xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Répondre à l'avis
              </h2>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                }}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className={isDark ? 'text-gray-400' : 'text-gray-600'} />
              </button>
            </div>

            <div className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedReview.comment}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {renderStars(selectedReview.rating)}
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  par {selectedReview.guestName}
                </span>
              </div>
            </div>

            {/* Response Templates */}
            <div className="mb-4">
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                ✨ Modèles rapides
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '😊 Positif', text: `Merci infiniment pour votre superbe avis, ${selectedReview.guestName} ! Votre satisfaction est notre plus belle récompense. Nous espérons vous accueillir à nouveau très bientôt !` },
                  { label: '😐 Neutre', text: `Merci pour votre retour ${selectedReview.guestName}. Nous prenons note de vos commentaires et travaillons à améliorer continuellement votre expérience. N'hésitez pas à nous recontacter pour tout futur séjour.` },
                  { label: '😞 À améliorer', text: `Merci pour votre honnêteté ${selectedReview.guestName}. Nous sommes sincèrement désolés que votre séjour n'ait pas répondu à vos attentes. Vos remarques nous permettent de progresser et nous espérons pouvoir vous offrir une expérience améliorée lors d'un prochain séjour.` },
                ].map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => setResponseText(tpl.text)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border hover:scale-105 ${
                      isDark ? 'bg-white/10 border-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Écrivez votre réponse..."
              rows={6}
              className={`w-full px-4 py-3 rounded-xl border ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleAddResponse}
                disabled={!responseText.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Publier la réponse
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
