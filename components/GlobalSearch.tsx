'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Command, TrendingUp, Clock, Star, Home, Users, Calendar,
  FileText, Package, Wrench, MessageSquare, DollarSign, Settings,
  ChevronRight, Filter, Zap, Hash, MapPin, Mail, Phone, User, Building
} from 'lucide-react';

// ==================== TYPES ====================

interface SearchResult {
  id: string;
  type: 'property' | 'guest' | 'booking' | 'review' | 'inventory' | 'maintenance' | 'contract';
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  color: string;
  score: number;
  metadata?: Record<string, any>;
  url?: string;
}

interface SearchCategory {
  key: string;
  label: string;
  icon: any;
  count: number;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

// ==================== FUZZY SEARCH ====================

function fuzzyMatch(query: string, text: string): number {
  query = query.toLowerCase();
  text = text.toLowerCase();
  
  // Exact match = score 100
  if (text.includes(query)) return 100;
  
  // Fuzzy matching
  let score = 0;
  let queryIndex = 0;
  let textIndex = 0;
  
  while (queryIndex < query.length && textIndex < text.length) {
    if (query[queryIndex] === text[textIndex]) {
      score += 10;
      queryIndex++;
    }
    textIndex++;
  }
  
  // Bonus if all query chars found
  if (queryIndex === query.length) {
    score += 50;
  }
  
  // Penalize distance
  score -= (textIndex - queryIndex);
  
  return Math.max(0, score);
}

// ==================== COMPONENT ====================

export default function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const { properties, guests, bookings, reviews, inventory, maintenanceTasks } = useBNB();
  const { isDark } = useTheme();
  
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ========== LOAD RECENT SEARCHES ==========
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bnbgest_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // ========== SAVE RECENT SEARCH ==========
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    try {
      localStorage.setItem('bnbgest_recent_searches', JSON.stringify(updated));
    } catch { /* ignore */ }
  }, [recentSearches]);

  // ========== SEARCH RESULTS ==========
  const allResults = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];

    // Search Properties
    properties.forEach(prop => {
      const titleScore = fuzzyMatch(query, prop.name);
      const addressScore = fuzzyMatch(query, prop.address);
      const score = Math.max(titleScore, addressScore);
      
      if (score > 30) {
        results.push({
          id: `property-${prop.id}`,
          type: 'property',
          title: prop.name,
          subtitle: prop.address,
          description: `${prop.bedrooms} chambres • ${prop.bathrooms} SDB • ${prop.maxGuests} voyageurs`,
          icon: Home,
          color: 'blue',
          score,
          metadata: { propertyId: prop.id },
          url: `/admin?tab=properties&property=${prop.id}`
        });
      }
    });

    // Search Guests
    guests.forEach(guest => {
      const nameScore = fuzzyMatch(query, guest.name);
      const emailScore = fuzzyMatch(query, guest.email);
      const phoneScore = fuzzyMatch(query, guest.phone || '');
      const score = Math.max(nameScore, emailScore, phoneScore);
      
      if (score > 30) {
        results.push({
          id: `guest-${guest.id}`,
          type: 'guest',
          title: guest.name,
          subtitle: guest.email,
          description: `${guest.totalBookings} réservations • Note: ${guest.rating}/5`,
          icon: Users,
          color: 'green',
          score,
          metadata: { guestId: guest.id },
          url: `/admin?tab=guests&guest=${guest.id}`
        });
      }
    });

    // Search Bookings
    bookings.forEach(booking => {
      const guestScore = fuzzyMatch(query, booking.guestInfo.name);
      const property = properties.find(p => p.id === booking.propertyId);
      const propertyScore = fuzzyMatch(query, property?.name || '');
      const idScore = fuzzyMatch(query, booking.id.toString());
      const score = Math.max(guestScore, propertyScore, idScore);
      
      if (score > 30) {
        results.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          title: `Réservation #${booking.id}`,
          subtitle: `${booking.guestInfo.name} • ${property?.name || 'Propriété'}`,
          description: `${booking.checkIn} → ${booking.checkOut} • ${booking.totalPrice}€`,
          icon: Calendar,
          color: 'purple',
          score,
          metadata: { bookingId: booking.id },
          url: `/admin?tab=bookings&booking=${booking.id}`
        });
      }
    });

    // Search Reviews
    reviews.forEach(review => {
      const guest = guests.find(g => g.id === review.guestId);
      const property = properties.find(p => p.id === review.propertyId);
      const guestScore = fuzzyMatch(query, guest?.name || '');
      const commentScore = fuzzyMatch(query, review.comment);
      const score = Math.max(guestScore, commentScore);
      
      if (score > 30) {
        results.push({
          id: `review-${review.id}`,
          type: 'review',
          title: `Avis de ${guest?.name || 'Voyageur'}`,
          subtitle: `${property?.name || 'Propriété'} • ${review.rating}/5 ⭐`,
          description: review.comment.substring(0, 100) + '...',
          icon: Star,
          color: 'amber',
          score,
          metadata: { reviewId: review.id },
          url: `/admin?tab=reviewsmanager&review=${review.id}`
        });
      }
    });

    // Search Inventory
    inventory.forEach(item => {
      const nameScore = fuzzyMatch(query, item.name);
      const categoryScore = fuzzyMatch(query, item.category);
      const score = Math.max(nameScore, categoryScore);
      
      if (score > 30) {
        results.push({
          id: `inventory-${item.id}`,
          type: 'inventory',
          title: item.name,
          subtitle: `${item.category} • ${item.location}`,
          description: `Stock: ${item.quantity}/${item.minimumQuantity} ${item.unit}`,
          icon: Package,
          color: 'orange',
          score,
          metadata: { inventoryId: item.id },
          url: `/admin?tab=inventory&item=${item.id}`
        });
      }
    });

    // Search Maintenance
    maintenanceTasks.forEach(record => {
      const titleScore = fuzzyMatch(query, record.title);
      const descScore = fuzzyMatch(query, record.description);
      const score = Math.max(titleScore, descScore);
      
      if (score > 30) {
        const property = properties.find(p => p.id === record.propertyId);
        results.push({
          id: `maintenance-${record.id}`,
          type: 'maintenance',
          title: record.title,
          subtitle: `${property?.name || 'Propriété'} • ${record.category}`,
          description: `${record.status} • ${record.priority} • ${record.estimatedCost}€`,
          icon: Wrench,
          color: 'red',
          score,
          metadata: { maintenanceId: record.id },
          url: `/admin?tab=maintenance&record=${record.id}`
        });
      }
    });

    // Sort by score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }, [query, properties, guests, bookings, reviews, inventory, maintenanceTasks]);

  // ========== FILTERED RESULTS ==========
  const filteredResults = useMemo(() => {
    if (selectedCategory === 'all') return allResults;
    return allResults.filter(r => r.type === selectedCategory);
  }, [allResults, selectedCategory]);

  // ========== CATEGORIES WITH COUNTS ==========
  const categories = useMemo<SearchCategory[]>(() => {
    const counts: Record<string, number> = {};
    allResults.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });

    return [
      { key: 'all', label: 'Tout', icon: Zap, count: allResults.length },
      { key: 'property', label: 'Propriétés', icon: Home, count: counts.property || 0 },
      { key: 'guest', label: 'Voyageurs', icon: Users, count: counts.guest || 0 },
      { key: 'booking', label: 'Réservations', icon: Calendar, count: counts.booking || 0 },
      { key: 'review', label: 'Avis', icon: Star, count: counts.review || 0 },
      { key: 'inventory', label: 'Inventaire', icon: Package, count: counts.inventory || 0 },
      { key: 'maintenance', label: 'Maintenance', icon: Wrench, count: counts.maintenance || 0 },
    ];
  }, [allResults]);

  // ========== KEYBOARD NAVIGATION ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        handleSelectResult(filteredResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex, onClose]);

  // ========== AUTO-FOCUS INPUT ==========
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ========== SCROLL SELECTED INTO VIEW ==========
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // ========== HANDLE SELECT RESULT ==========
  const handleSelectResult = useCallback((result: SearchResult) => {
    saveRecentSearch(query);
    if (result.url && onNavigate) {
      onNavigate(result.url);
    }
    onClose();
    setQuery('');
  }, [query, saveRecentSearch, onNavigate, onClose]);

  // ========== CLEAR SEARCH ==========
  const handleClear = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className={`absolute inset-0 ${isDark ? 'bg-black/80' : 'bg-black/50'} backdrop-blur-sm`} />

        {/* Search Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0a0a0a] border border-white/10' : 'bg-white border border-gray-200'
          }`}
        >
          {/* Header with Search Input */}
          <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <Search className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Rechercher propriétés, voyageurs, réservations..."
                className={`flex-1 bg-transparent outline-none text-lg ${
                  isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'
                }`}
              />
              {query && (
                <button
                  onClick={handleClear}
                  className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                <span className="hidden sm:inline">ESC</span>
              </button>
            </div>

            {/* Categories */}
            {query && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setSelectedIndex(0);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.key
                        ? isDark
                          ? 'bg-white text-black'
                          : 'bg-indigo-600 text-white'
                        : isDark
                        ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                    {cat.count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        selectedCategory === cat.key
                          ? isDark ? 'bg-black/20' : 'bg-white/20'
                          : isDark ? 'bg-white/10' : 'bg-gray-200'
                      }`}>
                        {cat.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          <div
            ref={resultsRef}
            className={`max-h-[60vh] overflow-y-auto ${
              isDark ? 'scrollbar-dark' : 'scrollbar-light'
            }`}
          >
            {!query ? (
              /* Recent Searches */
              <div className="p-4">
                {recentSearches.length > 0 ? (
                  <>
                    <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Recherches récentes</span>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuery(search)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                          }`}
                        >
                          <Clock className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{search}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Commencez à taper pour rechercher...</p>
                  </div>
                )}
              </div>
            ) : filteredResults.length > 0 ? (
              /* Search Results */
              <div className="p-2">
                {filteredResults.map((result, idx) => {
                  const Icon = result.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <motion.button
                      key={result.id}
                      data-index={idx}
                      onClick={() => handleSelectResult(result)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-white/10 ring-2 ring-white/20'
                            : 'bg-indigo-50 ring-2 ring-indigo-200'
                          : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        result.color === 'blue' ? 'bg-blue-500/10' :
                        result.color === 'green' ? 'bg-green-500/10' :
                        result.color === 'purple' ? 'bg-purple-500/10' :
                        result.color === 'amber' ? 'bg-amber-500/10' :
                        result.color === 'orange' ? 'bg-orange-500/10' :
                        result.color === 'red' ? 'bg-red-500/10' : 'bg-gray-500/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          result.color === 'blue' ? 'text-blue-500' :
                          result.color === 'green' ? 'text-green-500' :
                          result.color === 'purple' ? 'text-purple-500' :
                          result.color === 'amber' ? 'text-amber-500' :
                          result.color === 'orange' ? 'text-orange-500' :
                          result.color === 'red' ? 'text-red-500' : 'text-gray-500'
                        }`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {result.title}
                        </div>
                        <div className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {result.subtitle}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                          {result.description}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className={`w-5 h-5 flex-shrink-0 ${
                        isSelected
                          ? isDark ? 'text-white' : 'text-indigo-600'
                          : isDark ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              /* No Results */
              <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">Aucun résultat trouvé</p>
                <p className="text-xs mt-1">Essayez avec d'autres mots-clés</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-between px-4 py-3 border-t ${
            isDark ? 'border-white/10 bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-4 text-xs">
              <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                <kbd className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-white'}`}>↑</kbd>
                <kbd className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-white'}`}>↓</kbd>
                <span>Naviguer</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                <kbd className={`px-2 py-1 rounded ${isDark ? 'bg-white/10' : 'bg-white'}`}>↵</kbd>
                <span>Sélectionner</span>
              </div>
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              {filteredResults.length} résultat{filteredResults.length > 1 ? 's' : ''}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

