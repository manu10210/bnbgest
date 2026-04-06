'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, Wrench, Calendar, Camera, LayoutDashboard, ArrowRight, LogOut, Home, Star, Search, Globe, Sparkles, TrendingUp, Euro, Package, Shield, Zap, BarChart3, Clock, Heart, MapPin, CheckCircle, Play, ChevronRight, Award, Rocket, Target, Coffee, FileText, Inbox, Bell, Percent } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useBNB } from '../contexts/BNBContext';
import { fadeInUp, gridContainer, gridItem, buttonHover, buttonTap } from '@/lib/animations';

/* ===== Animated counter hook ===== */
function useAnimatedCounter(end: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    if (!ref.current || started.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return { count, ref };
}

/* ===== Floating Particles ===== */
function FloatingParticles({ count = 20, isDark }: { count?: number; isDark: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: Math.random() * 6 + 2 + 'px',
            height: Math.random() * 6 + 2 + 'px',
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
            background: isDark
              ? `rgba(255, 56, 92, ${Math.random() * 0.3 + 0.05})`
              : `rgba(255, 56, 92, ${Math.random() * 0.2 + 0.05})`,
            animationDuration: Math.random() * 4 + 3 + 's',
            animationDelay: Math.random() * 3 + 's',
          }}
        />
      ))}
    </div>
  );
}

const NAV_ITEMS = [
  { path: '/client', Icon: Users, label: 'Espace client', desc: 'Réservations et portail client', gradient: 'from-rose-500 to-pink-600', emoji: '👥', stat: '24/7' },
  { path: '/employee', Icon: Wrench, label: 'Employés', desc: 'Tâches et suivi du personnel', gradient: 'from-amber-500 to-orange-600', emoji: '🔧', stat: 'Pro' },
  { path: '/calendar', Icon: Calendar, label: 'Calendrier', desc: 'Disponibilités et planification', gradient: 'from-teal-500 to-emerald-600', emoji: '📅', stat: '365j' },
  { path: '/photos', Icon: Camera, label: 'Photos', desc: 'Galeries et médias des biens', gradient: 'from-violet-500 to-purple-600', emoji: '📷', stat: 'HD' },
  { path: '/messages', Icon: Inbox, label: 'Messagerie', desc: 'Messages et communications voyageurs', gradient: 'from-teal-500 to-cyan-600', emoji: '💬', stat: 'Live' },
  { path: '/inspections', Icon: Shield, label: 'États des lieux', desc: 'Inspections et rapports entrée/sortie', gradient: 'from-orange-500 to-amber-600', emoji: '🔍', stat: 'PDF' },
  { path: '/access-codes', Icon: Zap, label: 'Codes d\'accès', desc: 'Codes d\'entrée et accès voyageurs', gradient: 'from-pink-500 to-fuchsia-600', emoji: '🔑', stat: 'QR' },
  { path: '/planning', Icon: Calendar, label: 'Planning', desc: 'Organisation et calendrier opérationnel', gradient: 'from-blue-500 to-indigo-600', emoji: '📋', stat: 'Live' },
];

const FINANCE_ITEMS = [
  { path: '/rentabilite',    Icon: TrendingUp, label: 'Rentabilité',      desc: 'RevPAR · ROI · Taux d\'occupation',    gradient: 'from-emerald-500 to-teal-600',  badge: 'NOUVEAU' },
  { path: '/rapports-fiscaux', Icon: FileText, label: 'Rapports fiscaux', desc: 'Micro-BIC · LMNP · Export CSV',          gradient: 'from-violet-500 to-purple-600', badge: 'NOUVEAU' },
  { path: '/expenses',       Icon: Euro,       label: 'Dépenses',         desc: 'Suivi des charges par catégorie',        gradient: 'from-amber-500 to-orange-600',  badge: '' },
  { path: '/planning',       Icon: Calendar,   label: 'Planning',         desc: 'Calendrier opérationnel',                gradient: 'from-blue-500 to-indigo-600',   badge: '' },
];

const FEATURES = [
  { icon: Calendar, label: 'Réservations', color: '#FF385C', bg: 'rgba(255,56,92,0.1)', desc: 'Gestion complète' },
  { icon: TrendingUp, label: 'Tarification', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', desc: 'Prix dynamiques' },
  { icon: Wrench, label: 'Maintenance', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Suivi en temps réel' },
  { icon: Package, label: 'Inventaire', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', desc: 'Stock automatisé' },
  { icon: Euro, label: 'Finances', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'Rapports détaillés' },
  { icon: Globe, label: 'Guide accueil', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', desc: 'Multi-langues' },
  { icon: Star, label: 'Avis clients', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Réputation' },
  { icon: Shield, label: 'Contrats', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', desc: 'Génération auto' },
];

const TRUST_ITEMS = [
  { icon: Shield, text: 'Données sécurisées', color: '#10b981' },
  { icon: Zap, text: 'Ultra rapide', color: '#f59e0b' },
  { icon: Heart, text: 'Design premium', color: '#FF385C' },
  { icon: Award, text: '30+ outils intégrés', color: '#8b5cf6' },
  { icon: Rocket, text: 'Mis à jour en continu', color: '#3b82f6' },
];

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { isDark } = useTheme();
  const { properties, bookings, reviews } = useBNB();

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('bnbgest_user');
      if (saved) {
        setIsAuthenticated(true);
        const parsed = JSON.parse(saved);
        setUserName(parsed.name || parsed.email || 'Utilisateur');
      }
    } catch { /* ignore */ }
  }, []);

  const handleNavigation = (path: string) => {
    setIsLoading(true);
    setTimeout(() => router.push(path), 150);
  };

  const handleLogout = () => {
    localStorage.removeItem('bnbgest_user');
    setIsAuthenticated(false);
    setUserName('');
  };

  if (!mounted) return null;

  const totalRevenue = bookings.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalPrice, 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#1a1a2e]' : 'bg-white'}`}>

      {/* ===== HEADER ===== */}
      <header className={`sticky top-0 z-40 border-b transition-all duration-300 ${isDark ? 'bg-[#1a1a2e]/80 border-white/[0.06] backdrop-blur-xl' : 'bg-white/80 border-[#ebebeb] backdrop-blur-xl'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-[72px]">
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => router.push('/')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center shadow-lg shadow-[#FF385C]/20 group-hover:shadow-[#FF385C]/40 transition-all pulse-ring animate-pulseGlow">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className={`text-xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-[#222222]'}`}>bnb<span className="text-[#FF385C]">gest</span></span>
              </div>
            </div>

            {isAuthenticated && (
              <div className={`hidden md:flex items-center gap-4 border rounded-full px-5 py-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md hover-glow ${isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-[#dddddd] bg-white'}`}>
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{properties.length} propriété{properties.length > 1 ? 's' : ''}</span>
                <span className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-[#dddddd]'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{confirmedBookings} active{confirmedBookings > 1 ? 's' : ''}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF385C] to-[#E31C5F] flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <ThemeToggle size="sm" />
              {isAuthenticated ? (
                <>
                  <button onClick={() => handleNavigation('/admin')} className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#FF385C]/25 transition-all text-sm font-semibold hover:-translate-y-0.5">
                    <LayoutDashboard size={15} />
                    Administration
                  </button>
                  <div className={`flex items-center gap-2 border rounded-full px-3 py-1.5 ml-1 ${isDark ? 'border-white/[0.08] bg-white/[0.04]' : 'border-[#dddddd]'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF385C] to-[#C850C0] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className={`text-sm hidden md:inline font-medium ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>{userName?.split(' ')[0]}</span>
                    <button onClick={handleLogout} className={`p-1 transition-colors ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-[#b0b0b0] hover:text-[#FF385C]'}`} title="Déconnexion">
                      <LogOut size={14} />
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => handleNavigation('/login')} className="flex items-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#FF385C]/25 transition-all text-sm font-semibold hover:-translate-y-0.5">
                  Connexion
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ===== MAIN ===== */}
      <main className="flex-1">
        {isAuthenticated ? (
          <AuthenticatedDashboard
            isDark={isDark}
            userName={userName}
            properties={properties}
            confirmedBookings={confirmedBookings}
            totalRevenue={totalRevenue}
            avgRating={avgRating}
            reviews={reviews}
            handleNavigation={handleNavigation}
          />
        ) : (
          <LandingPage isDark={isDark} handleNavigation={handleNavigation} />
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className={`border-t py-6 ${isDark ? 'border-white/[0.06]' : 'border-[#ebebeb]'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#FF385C] flex items-center justify-center">
              <Home className="w-3 h-3 text-white" />
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>&copy; 2026 BNBGest</span>
            <span className={`text-xs ${isDark ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>&middot;</span>
            <span className={`text-sm ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>Gestion locative professionnelle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe size={14} className={`${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`} />
            <span className={`text-sm ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>Français (FR)</span>
          </div>
        </div>
      </footer>

      {/* ===== LOADING ===== */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 dark:bg-black/50 backdrop-blur-md flex items-center justify-center z-50">
          <div className="glass-pro px-8 py-5 rounded-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl aurora-bg flex items-center justify-center">
                <Home className="w-5 h-5 text-white animate-breathe" />
              </div>
              <div>
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#222222]'}`}>Chargement...</span>
                <div className="w-24 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full aurora-bg animate-shimmer" style={{ width: '70%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== AUTHENTICATED DASHBOARD ===== */
function AuthenticatedDashboard({ isDark, userName, properties, confirmedBookings, totalRevenue, avgRating, reviews, handleNavigation }: {
  isDark: boolean; userName: string; properties: any[]; confirmedBookings: number; totalRevenue: number; avgRating: string; reviews: any[]; handleNavigation: (p: string) => void;
}) {
  const propCounter = useAnimatedCounter(properties.length);
  const bookCounter = useAnimatedCounter(confirmedBookings);
  const revCounter = useAnimatedCounter(totalRevenue, 1800);
  const ratingCounter = useAnimatedCounter(Number(avgRating) * 10, 1500);

  return (
    <div className={`relative ${isDark ? 'gradient-mesh-dark' : 'gradient-mesh-light'}`}>
      <FloatingParticles count={15} isDark={isDark} />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-10">

        {/* Greeting */}
        <div className="mb-10 animate-fadeInUp">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl animate-wiggle" style={{ animationIterationCount: '1' }}>👋</div>
            <h2 className={`text-[32px] font-extrabold leading-tight animate-textGlow ${isDark ? 'text-white' : 'text-[#222222]'}`}>
              Bonjour{userName ? `, ${userName.split(' ')[0]}` : ''}
            </h2>
          </div>
          <p className={`text-[15px] ml-[52px] ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
            Voici un aperçu de votre activité
          </p>
        </div>

        {/* Stats with animated counters */}
        <motion.div 
          variants={gridContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {[
            { label: 'Propriétés', counter: propCounter, suffix: '', icon: Home, color: '#FF385C', bg: isDark ? 'rgba(255,56,92,0.12)' : '#fff0f3' },
            { label: 'Réservations', counter: bookCounter, suffix: '', icon: Calendar, color: '#14b8a6', bg: isDark ? 'rgba(20,184,166,0.12)' : '#f0fdfa' },
            { label: 'Revenus', counter: revCounter, suffix: '€', icon: Euro, color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5' },
            { label: 'Note moyenne', counter: ratingCounter, suffix: '/5', icon: Star, color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb' },
          ].map(({ label, counter, suffix, icon: Icon, color, bg }, i) => (
            <motion.div 
              ref={counter.ref} 
              key={label} 
              variants={gridItem}
              whileHover={{ scale: 1.05, y: -8 }}
              className="glass-card rounded-2xl p-5 hover-lift card-shine cursor-default border-gradient"
            >
              <div className="flex items-center justify-between mb-4">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform" 
                  style={{ background: bg }}
                >
                  <Icon className="w-5.5 h-5.5" style={{ color }} />
                </motion.div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  <TrendingUp className="w-3 h-3" />
                  <span>+12%</span>
                </div>
              </div>
              <p className={`text-[28px] font-black stat-underline animate-counterUp ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                {label === 'Revenus' ? counter.count.toLocaleString('fr-FR') : label === 'Note moyenne' ? (counter.count / 10).toFixed(1) : counter.count}{suffix}
              </p>
              <p className={`text-sm mt-2 font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Access */}
        <motion.div 
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#FF385C]/10 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-[#FF385C]" />
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>Accès rapide</h3>
          </div>
          <motion.div 
            variants={gridContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4"
          >
            {NAV_ITEMS.map(({ path, Icon, label, desc, gradient, emoji, stat }) => (
              <motion.button 
                key={path} 
                variants={gridItem}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleNavigation(path)} 
                className="group text-left rounded-2xl p-4 transition-all duration-300 tilt-card card-shine glass-card"
              >
                <div className="flex items-start justify-between mb-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}
                  >
                    <Icon size={22} className="text-white" />
                  </motion.div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${isDark ? 'bg-white/[0.06] text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                    <span>{stat}</span>
                  </div>
                </div>
                <h4 className={`font-bold text-[13px] mb-1 leading-tight ${isDark ? 'text-white' : 'text-[#222222]'}`}>{label}</h4>
                <p className={`text-[11px] leading-snug mb-3 ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{desc}</p>
                <div className="flex items-center gap-1 text-[12px] font-semibold text-[#FF385C] transition-all group-hover:gap-2">
                  Explorer <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Admin CTA - Glass + Aurora */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <div className={`rounded-3xl overflow-hidden relative spotlight ${isDark ? 'bg-gradient-to-r from-[#FF385C]/10 to-[#7B61FF]/10 border border-[#FF385C]/20' : 'bg-gradient-to-r from-rose-50 via-pink-50 to-violet-50 border border-rose-200/50'}`}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 morph-blob bg-[#FF385C]/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 morph-blob bg-[#7B61FF]/10 blur-3xl" style={{ animationDelay: '4s' }} />
            </div>
            <div className="relative p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-3 badge-shine ${isDark ? 'bg-[#FF385C]/20 text-[#FF385C]' : 'bg-[#FF385C]/10 text-[#FF385C]'}`}>
                  <Sparkles size={12} className="animate-wiggle" /> 30+ outils disponibles
                </div>
                <h3 className={`font-black text-xl mb-1 ${isDark ? 'text-white' : 'text-[#222222]'}`}>Tableau de bord complet</h3>
                <p className={`text-sm max-w-md ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Réservations, tarifs, maintenance, inventaire, finances, contrats, QR codes, IA et bien plus</p>
              </div>
              <motion.button 
                onClick={() => handleNavigation('/admin')} 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-[#FF385C]/30 transition-all font-bold text-sm whitespace-nowrap"
              >
                <LayoutDashboard size={16} />
                Ouvrir l&apos;admin
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Reviews preview */}
        {reviews.length > 0 && (
          <div className="mt-10 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="w-4.5 h-4.5 text-amber-500" />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>Derniers avis</h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
              {reviews.slice(-3).reverse().map((r: any) => (
                <div key={r.id} className="min-w-[280px] glass-card rounded-2xl p-5 card-shine flex-shrink-0">
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className={`text-sm leading-relaxed line-clamp-2 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>{r.comment || 'Excellent séjour !'}</p>
                  <p className={`text-xs mt-3 font-medium ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{r.guestName || 'Client'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Finance & Outils rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>Finance & Outils</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FINANCE_ITEMS.map(({ path, Icon, label, desc, gradient, badge }) => (
              <motion.button
                key={path}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleNavigation(path)}
                className="group text-left rounded-2xl p-4 transition-all duration-300 glass-card relative overflow-hidden"
              >
                {badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF385C] text-white">
                    {badge}
                  </span>
                )}
                <div className={`w-10 h-10 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className={`font-bold text-[13px] mb-0.5 ${isDark ? 'text-white' : 'text-[#222222]'}`}>{label}</p>
                <p className={`text-[11px] leading-snug ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{desc}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Messagerie + Notifications rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <button
            onClick={() => handleNavigation('/messages')}
            className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] glass-card group`}
          >
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
              <Inbox className="w-6 h-6 text-teal-500" />
            </div>
            <div>
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Messagerie</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Gérer les messages voyageurs</p>
            </div>
            <ArrowRight className={`w-4 h-4 ml-auto transition-transform group-hover:translate-x-1 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          </button>
          <button
            onClick={() => handleNavigation('/notifications')}
            className={`flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] glass-card group`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Bell className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Alertes push &amp; SMS</p>
            </div>
            <ArrowRight className={`w-4 h-4 ml-auto transition-transform group-hover:translate-x-1 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ===== LANDING PAGE ===== */
function LandingPage({ isDark, handleNavigation }: { isDark: boolean; handleNavigation: (p: string) => void }) {
  return (
    <div>
      {/* Hero */}
      <div className={`relative overflow-hidden ${isDark ? 'gradient-mesh-dark' : 'gradient-mesh-light'}`}>
        <FloatingParticles count={25} isDark={isDark} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] morph-blob bg-[#FF385C]/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] morph-blob bg-violet-500/10 blur-3xl" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-3xl animate-breathe" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-2xl animate-fadeInUp">
            <div className={`inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-8 badge-shine border-gradient ${isDark ? 'bg-[#FF385C]/15 text-[#FF385C]' : 'bg-[#FF385C]/10 text-[#FF385C]'}`}>
              <Sparkles size={13} className="animate-wiggle" />
              Plateforme de gestion locative tout-en-un
            </div>

            <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-8 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
              Gérez votre location
              <br />
              <span className="bg-gradient-to-r from-[#FF385C] via-[#C850C0] to-[#7B61FF] bg-clip-text text-transparent bg-[length:300%_auto] animate-[gradientShift_4s_ease_infinite]">comme un hôte pro</span>
            </h1>

            <p className={`text-lg sm:text-xl leading-relaxed mb-10 max-w-lg ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
              Réservations, calendrier, tarification dynamique, contrats et bien plus. Tout dans un seul outil élégant.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => handleNavigation('/login')} className="group inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-[#FF385C]/30 transition-all font-bold text-base hover:-translate-y-1 hover:scale-105">
                <Rocket size={18} />
                Commencer gratuitement <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => handleNavigation('/login')} className={`inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-base border-2 transition-all hover:-translate-y-0.5 ${isDark ? 'border-white/15 text-white hover:bg-white/[0.06] hover:border-white/25' : 'border-[#222222]/15 text-[#222222] hover:border-[#222222]/30 hover:bg-[#f7f7f7]'}`}>
                <Play size={16} /> Découvrir la plateforme
              </button>
            </div>
          </div>

          {/* Floating badges with 3D tilt */}
          <div className="hidden lg:block absolute right-12 top-28 animate-float" style={{ animationDelay: '0.5s' }}>
            <div className="glass-pro rounded-2xl px-5 py-4 shadow-xl tilt-card border-gradient">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className={`text-base font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>+23%</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>de revenus</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:block absolute right-8 top-56 animate-float" style={{ animationDelay: '1.5s' }}>
            <div className="glass-pro rounded-2xl px-5 py-4 shadow-xl tilt-card border-gradient">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className={`text-base font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>4.9/5</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>satisfaction</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:block absolute right-40 bottom-28 animate-float" style={{ animationDelay: '2.5s' }}>
            <div className="glass-pro rounded-2xl px-5 py-4 shadow-xl tilt-card border-gradient">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className={`text-base font-black ${isDark ? 'text-white' : 'text-[#222222]'}`}>5min</p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>mise en place</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className={`py-20 relative ${isDark ? '' : 'bg-[#fafafa]'}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14 animate-fadeInUp">
            <div className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5 ${isDark ? 'bg-[#7B61FF]/10 text-[#7B61FF]' : 'bg-violet-100 text-violet-600'}`}>
              <Target size={12} /> Fonctionnalités
            </div>
            <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-[#222222]'}`}>Tout ce dont vous avez besoin</h2>
            <p className={`text-base max-w-md mx-auto ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Une suite complète d&apos;outils pour gérer votre activité comme un professionnel</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
            {FEATURES.map(({ icon: FeatureIcon, label, color, bg, desc }) => (
              <div key={label} className="animate-fadeInUp glass-card rounded-2xl p-6 text-center tilt-card card-shine cursor-default">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform hover:scale-110 hover:rotate-3" style={{ background: bg }}>
                  <FeatureIcon className="w-7 h-7" style={{ color }} />
                </div>
                <p className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-[#222222]'}`}>{label}</p>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Trust bar */}
          <div className={`mt-16 glass-card rounded-2xl p-6 ${isDark ? '' : ''}`}>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {TRUST_ITEMS.map(({ icon: TrustIcon, text, color }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: color + '15' }}>
                    <TrustIcon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className={`font-medium ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA section */}
      <div className={`relative overflow-hidden py-20 ${isDark ? '' : ''}`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] morph-blob bg-[#FF385C]/5 blur-3xl" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center px-6 animate-fadeInUp">
          <div className="w-16 h-16 rounded-2xl aurora-bg flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#FF385C]/20 animate-pulseGlow">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className={`text-3xl sm:text-4xl font-black mb-4 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            Prêt à transformer votre activité ?
          </h2>
          <p className={`text-base mb-8 max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
            Rejoignez les hôtes qui utilisent BNBGest pour simplifier leur gestion au quotidien.
          </p>
          <button onClick={() => handleNavigation('/login')} className="group inline-flex items-center justify-center gap-2.5 aurora-bg text-white px-10 py-4 rounded-xl hover:shadow-2xl hover:shadow-[#FF385C]/30 transition-all font-bold text-base hover:-translate-y-1 hover:scale-105">
            Démarrer maintenant <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
