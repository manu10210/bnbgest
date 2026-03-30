'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, LogIn, Eye, EyeOff, Mail, Lock, Home, Sparkles, Shield, Zap } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const success = await login(email, password);
      if (success) {
        router.push('/admin');
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (_err) {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !mounted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1a1a2e]' : 'bg-white'}`}>
        <div className="w-12 h-12 rounded-xl aurora-bg flex items-center justify-center animate-pulseGlow">
          <Home className="w-6 h-6 text-white animate-breathe" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 transition-colors duration-300 relative overflow-hidden ${isDark ? 'bg-[#1a1a2e]' : 'bg-[#f7f7f7]'}`}>
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] morph-blob bg-[#FF385C]/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] morph-blob bg-violet-500/8 blur-3xl" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-3xl animate-breathe" />
        {/* Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: isDark ? 'rgba(255,56,92,' + (Math.random() * 0.3 + 0.05) + ')' : 'rgba(255,56,92,' + (Math.random() * 0.2 + 0.05) + ')',
              animationDuration: Math.random() * 4 + 3 + 's',
              animationDelay: Math.random() * 3 + 's',
            }}
          />
        ))}
      </div>

      <div className="relative max-w-md w-full space-y-8 animate-fadeInUp">
        {/* Back + Theme Toggle */}
        <div className="flex items-center justify-between animate-slideInDown">
          <button onClick={() => router.push('/')} className={`flex items-center gap-2 transition-all text-sm hover:-translate-x-1 ${isDark ? 'text-gray-400 hover:text-white' : 'text-[#717171] hover:text-[#222222]'}`}>
            <ArrowLeft size={16} /> Retour
          </button>
          <ThemeToggle size="sm" />
        </div>

        {/* Header with aurora logo */}
        <div className="text-center animate-fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="w-20 h-20 rounded-2xl aurora-bg flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#FF385C]/25 animate-pulseGlow pulse-ring">
            <span className="text-white font-black text-2xl">BG</span>
          </div>
          <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            Bon retour <span className="gradient-text">!</span>
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>Accédez à votre espace administrateur</p>
        </div>

        {/* Form Card */}
        <div className={`glass-pro rounded-2xl p-8 animate-fadeInUp border-gradient ${isDark ? '' : 'bg-white/80'}`} style={{ animationDelay: '200ms' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-scaleIn flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Email</label>
              <div className={`relative group rounded-xl transition-all duration-300 ${focused === 'email' ? 'ring-2 ring-[#FF385C]/30' : ''}`}>
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'email' ? 'bg-[#FF385C]/10' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                  <Mail size={15} className={`transition-colors ${focused === 'email' ? 'text-[#FF385C]' : isDark ? 'text-gray-500' : 'text-[#b0b0b0]'}`} />
                </div>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                  className={`w-full pl-14 pr-4 py-3.5 border rounded-xl transition-all text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 focus:border-[#FF385C]/50' : 'bg-white border-[#dddddd] text-[#222222] placeholder-[#b0b0b0] focus:border-[#FF385C]/50'}`}
                  placeholder="votre@email.com" disabled={isSubmitting} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Mot de passe</label>
              <div className={`relative group rounded-xl transition-all duration-300 ${focused === 'password' ? 'ring-2 ring-[#FF385C]/30' : ''}`}>
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'password' ? 'bg-[#FF385C]/10' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                  <Lock size={15} className={`transition-colors ${focused === 'password' ? 'text-[#FF385C]' : isDark ? 'text-gray-500' : 'text-[#b0b0b0]'}`} />
                </div>
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  className={`w-full pl-14 pr-12 py-3.5 border rounded-xl transition-all text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 focus:border-[#FF385C]/50' : 'bg-white border-[#dddddd] text-[#222222] placeholder-[#b0b0b0] focus:border-[#FF385C]/50'}`}
                  placeholder="Votre mot de passe" disabled={isSubmitting} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#717171] hover:bg-gray-100'}`}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:shadow-xl hover:shadow-[#FF385C]/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Test accounts */}
          <div className={`mt-6 p-4 rounded-xl card-shine ${isDark ? 'bg-[#FF385C]/[0.06] border border-[#FF385C]/15' : 'bg-rose-50 border border-rose-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-[#FF385C]" />
              <h4 className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Comptes de test</h4>
            </div>
            <div className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isDark ? 'bg-[#FF385C]/20 text-[#FF385C]' : 'bg-[#FF385C]/10 text-[#FF385C]'}`}>A</div>
                <span><strong className={`${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>claustre.emmanuel@gmail.com</strong> / admin123</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>E</div>
                <span><strong className={`${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>employee@bnbgest.com</strong> / emp123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className={`flex items-center justify-center gap-6 animate-fadeInUp ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`} style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-1.5 text-xs">
            <Shield size={12} className="text-emerald-500" />
            <span>Sécurisé</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Zap size={12} className="text-amber-500" />
            <span>Rapide</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Sparkles size={12} className="text-[#FF385C]" />
            <span>Premium</span>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-xs ${isDark ? 'text-gray-700' : 'text-[#b0b0b0]'}`}>&copy; 2026 BNBGest &middot; Gestion locative professionnelle</p>
      </div>
    </div>
  );
}
