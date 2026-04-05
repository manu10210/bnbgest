'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, LogIn, Eye, EyeOff, Mail, Lock, Home, Sparkles, Shield, Zap, User, UserPlus } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const { isDark } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Email invalide');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulation d'inscription (en production, appeler votre API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess('✅ Inscription réussie ! Redirection...');
      setTimeout(() => {
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setName('');
        setSuccess('');
      }, 2000);
    } catch (_err) {
      setError('Une erreur est survenue lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/admin'
      });

      if (result?.error) {
         setError('Email ou mot de passe incorrect');
      } else if (result?.ok) {
         window.location.href = '/admin';
      }
    } catch (_err) {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signIn('google', { 
        callbackUrl: '/admin',
        redirect: true 
      });
    } catch (_err) {
      setError('Erreur lors de la connexion Google');
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
            {isSignUp ? (
              <>Créer un compte <span className="gradient-text">!</span></>
            ) : (
              <>Bon retour <span className="gradient-text">!</span></>
            )}
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
            {isSignUp ? 'Rejoignez BNBGest dès maintenant' : 'Accédez à votre espace administrateur'}
          </p>
        </div>

        {/* Toggle Connexion/Inscription */}
        <div className={`flex gap-2 p-1.5 rounded-xl animate-fadeInUp ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`} style={{ animationDelay: '150ms' }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              !isSignUp 
                ? 'bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white shadow-lg shadow-[#FF385C]/25' 
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LogIn size={16} />
              Connexion
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              isSignUp 
                ? 'bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white shadow-lg shadow-[#FF385C]/25' 
                : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <UserPlus size={16} />
              Inscription
            </div>
          </button>
        </div>

        {/* Form Card */}
        <div className={`glass-pro rounded-2xl p-8 animate-fadeInUp border-gradient ${isDark ? '' : 'bg-white/80'}`} style={{ animationDelay: '200ms' }}>
          <form onSubmit={isSignUp ? handleSignUp : handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-scaleIn flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">!</span>
                </div>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm animate-scaleIn flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">✓</span>
                </div>
                {success}
              </div>
            )}

            {/* Champ Nom (uniquement pour inscription) */}
            {isSignUp && (
              <div className="space-y-1.5 animate-fadeInUp">
                <label htmlFor="name" className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Nom complet</label>
                <div className={`relative group rounded-xl transition-all duration-300 ${focused === 'name' ? 'ring-2 ring-[#FF385C]/30' : ''}`}>
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'name' ? 'bg-[#FF385C]/10' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                    <User size={15} className={`transition-colors ${focused === 'name' ? 'text-[#FF385C]' : isDark ? 'text-gray-500' : 'text-[#b0b0b0]'}`} />
                  </div>
                  <input id="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    className={`w-full pl-14 pr-4 py-3.5 border rounded-xl transition-all text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 focus:border-[#FF385C]/50' : 'bg-white border-[#dddddd] text-[#222222] placeholder-[#b0b0b0] focus:border-[#FF385C]/50'}`}
                    placeholder="Votre nom complet" disabled={isSubmitting} />
                </div>
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
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                  className={`w-full pl-14 pr-12 py-3.5 border rounded-xl transition-all text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 focus:border-[#FF385C]/50' : 'bg-white border-[#dddddd] text-[#222222] placeholder-[#b0b0b0] focus:border-[#FF385C]/50'}`}
                  placeholder={isSignUp ? 'Minimum 6 caractères' : 'Votre mot de passe'} disabled={isSubmitting} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#717171] hover:bg-gray-100'}`}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Champ Confirmer mot de passe (uniquement pour inscription) */}
            {isSignUp && (
              <div className="space-y-1.5 animate-fadeInUp">
                <label htmlFor="confirmPassword" className={`block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Confirmer le mot de passe</label>
                <div className={`relative group rounded-xl transition-all duration-300 ${focused === 'confirmPassword' ? 'ring-2 ring-[#FF385C]/30' : ''}`}>
                  <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'confirmPassword' ? 'bg-[#FF385C]/10' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                    <Lock size={15} className={`transition-colors ${focused === 'confirmPassword' ? 'text-[#FF385C]' : isDark ? 'text-gray-500' : 'text-[#b0b0b0]'}`} />
                  </div>
                  <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused(null)}
                    className={`w-full pl-14 pr-12 py-3.5 border rounded-xl transition-all text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600 focus:border-[#FF385C]/50' : 'bg-white border-[#dddddd] text-[#222222] placeholder-[#b0b0b0] focus:border-[#FF385C]/50'}`}
                    placeholder="Confirmez votre mot de passe" disabled={isSubmitting} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]' : 'text-[#b0b0b0] hover:text-[#717171] hover:bg-gray-100'}`}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Mot de passe oublié - uniquement en mode connexion */}
            {!isSignUp && (
              <div className="flex justify-end -mt-1">
                <Link href="/forgot-password" className={`text-xs font-medium hover:underline transition-colors ${isDark ? 'text-[#FF385C]/80 hover:text-[#FF385C]' : 'text-[#FF385C]/70 hover:text-[#FF385C]'}`}>
                  Mot de passe oublié ?
                </Link>
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:shadow-xl hover:shadow-[#FF385C]/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {isSignUp ? 'Inscription...' : 'Connexion...'}
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus size={16} /> : <LogIn size={16} />}
                  {isSignUp ? 'S\'inscrire' : 'Se connecter'}
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className={`absolute inset-0 flex items-center ${isDark ? '' : ''}`}>
                <div className={`w-full border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-3 ${isDark ? 'bg-[#0f172a] text-gray-500' : 'bg-white text-gray-500'}`}>OU</span>
              </div>
            </div>

            {/* Google Sign In */}
            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className={`w-full flex justify-center items-center gap-3 py-3.5 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark 
                  ? 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50' 
                  : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isSubmitting ? (isSignUp ? 'Inscription...' : 'Connexion...') : (isSignUp ? 'S\'inscrire avec Google' : 'Continuer avec Google')}
            </button>
          </form>

          {/* Test accounts - Uniquement en mode connexion */}
          {!isSignUp && (
            <div className={`mt-6 p-4 rounded-xl card-shine ${isDark ? 'bg-[#FF385C]/[0.06] border border-[#FF385C]/15' : 'bg-rose-50 border border-rose-100'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} className="text-[#FF385C]" />
                <h4 className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>Comptes de test</h4>
              </div>
              <div className={`text-xs space-y-1.5 ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isDark ? 'bg-[#FF385C]/20 text-[#FF385C]' : 'bg-[#FF385C]/10 text-[#FF385C]'}`}>A</div>
                  <span><strong className={`${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>claustre.emmanuel@gmail.com</strong> &mdash; Admin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>E</div>
                <span><strong className={`${isDark ? 'text-gray-300' : 'text-[#222222]'}`}>employee@bnbgest.com</strong> &mdash; Employé</span>
              </div>
            </div>
            </div>
          )}
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
