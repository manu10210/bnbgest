'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Home, ShieldCheck, XCircle } from 'lucide-react';
import Link from 'next/link';

type Step = 'loading' | 'form' | 'success' | 'invalid';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8 caractères minimum', ok: password.length >= 8 },
    { label: 'Une majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Un chiffre', ok: /[0-9]/.test(password) },
    { label: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
  const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-gray-200 dark:bg-white/10'}`} />
        ))}
        <span className={`text-xs font-semibold ml-2 ${score >= 3 ? 'text-emerald-500' : score >= 2 ? 'text-amber-500' : 'text-red-400'}`}>
          {labels[score]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-emerald-500' : 'text-gray-400'}`}>
            {c.ok ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current opacity-40" />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const { isDark } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [step, setStep] = useState<Step>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string>('');
  const [emailFromToken, setEmailFromToken] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // S'assurer que le composant est monté côté client avant de lire les searchParams
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return; // Attendre le montage client
    if (!token) {
      setStep('invalid');
      setInvalidReason('missing');
      return;
    }
    // Vérifier la validité du token côté serveur
    fetch('/api/auth/reset-password/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          if (data.email) setEmailFromToken(data.email);
          setStep('form');
        } else {
          setInvalidReason(data.reason || 'invalid');
          setStep('invalid');
        }
      })
      .catch(() => setStep('invalid'));
  }, [token, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMsg('Le mot de passe doit contenir au moins une majuscule.');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMsg('Le mot de passe doit contenir au moins un chiffre.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        setStep('success');
      } else {
        setErrorMsg(data.error || 'Une erreur est survenue. Veuillez recommencer.');
      }
    } catch {
      setErrorMsg('Erreur réseau. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const bg = isDark ? 'bg-[#0d0d1a]' : 'bg-[#f7f7f7]';
  const card = isDark ? 'bg-[#1a1a2e] border border-white/[0.08]' : 'bg-white border border-gray-100 shadow-lg';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const S = isDark ? 'text-white/50' : 'text-gray-500';
  const INP = isDark
    ? 'bg-white/[0.04] border-white/[0.1] text-white placeholder-white/30 focus:border-violet-500/60 focus:ring-violet-500/20'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:ring-violet-200';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors ${bg} relative overflow-hidden`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-6">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/login"
            className={`flex items-center gap-2 text-sm transition-all hover:-translate-x-0.5 ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
          <ThemeToggle size="sm" />
        </div>

        {/* Logo */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
            <Home className="w-8 h-8 text-white" />
          </div>
          <p className={`text-xs font-semibold tracking-widest uppercase ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>BNBGest</p>
        </div>

        {/* Card */}
        <motion.div className={`rounded-2xl p-8 ${card}`}>
          <AnimatePresence mode="wait">

            {/* LOADING */}
            {step === 'loading' && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center py-8 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                <p className={`text-sm ${S}`}>Vérification du lien...</p>
              </motion.div>
            )}

            {/* INVALID TOKEN */}
            {step === 'invalid' && (
              <motion.div key="invalid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className={`text-xl font-bold mb-2 ${T}`}>
                  {invalidReason === 'expired' ? 'Lien expiré' : 'Lien invalide'}
                </h2>
                <p className={`text-sm mb-6 ${S}`}>
                  {invalidReason === 'expired'
                    ? 'Ce lien a expiré (validité : 2 heures). Cliquez ci-dessous pour en recevoir un nouveau.'
                    : invalidReason === 'already_used'
                    ? 'Ce lien a déjà été utilisé. Faites une nouvelle demande si nécessaire.'
                    : 'Ce lien de réinitialisation est invalide. Veuillez faire une nouvelle demande.'}
                </p>
                <div className="space-y-3">
                  <Link href="/forgot-password"
                    className="block w-full py-3 rounded-xl text-sm font-bold text-white text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity">
                    Nouvelle demande de réinitialisation
                  </Link>
                  <Link href="/login"
                    className={`block w-full py-3 rounded-xl text-sm font-medium text-center transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    Retour à la connexion
                  </Link>
                </div>
              </motion.div>
            )}

            {/* FORM */}
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                    <ShieldCheck className="w-6 h-6 text-violet-500" />
                  </div>
                  <h1 className={`text-2xl font-bold mb-1 ${T}`}>Nouveau mot de passe</h1>
                  {(emailFromToken || emailParam) && (
                    <p className={`text-sm ${S}`}>
                      Pour le compte{' '}
                      <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{emailFromToken || emailParam}</span>
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </motion.div>
                  )}

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${S}`}>
                      Nouveau mot de passe
                    </label>
                    <div className={`relative rounded-xl transition-all ${focused === 'pw' ? 'ring-2 ring-violet-500/30' : ''}`}>
                      <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'pw' ? isDark ? 'bg-violet-500/15' : 'bg-violet-50' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        <Lock className={`w-4 h-4 transition-colors ${focused === 'pw' ? 'text-violet-500' : isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoFocus
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={() => setFocused('pw')}
                        onBlur={() => setFocused(null)}
                        placeholder="Minimum 8 caractères"
                        disabled={isLoading}
                        className={`w-full pl-14 pr-12 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${INP}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>

                  {/* Confirmation */}
                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${S}`}>
                      Confirmer le mot de passe
                    </label>
                    <div className={`relative rounded-xl transition-all ${focused === 'conf' ? 'ring-2 ring-violet-500/30' : ''}`}>
                      <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused === 'conf' ? isDark ? 'bg-violet-500/15' : 'bg-violet-50' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        <Lock className={`w-4 h-4 transition-colors ${focused === 'conf' ? 'text-violet-500' : isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        onFocus={() => setFocused('conf')}
                        onBlur={() => setFocused(null)}
                        placeholder="Répétez le mot de passe"
                        disabled={isLoading}
                        className={`w-full pl-14 pr-12 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
                          confirmPassword && confirmPassword !== password
                            ? isDark ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-red-300'
                            : INP
                        }`}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Les mots de passe ne correspondent pas
                      </p>
                    )}
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Les mots de passe correspondent
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !password || !confirmPassword}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all shadow-lg shadow-violet-500/20 mt-2">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Réinitialisation...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Réinitialiser le mot de passe
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* SUCCESS */}
            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}>
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                </motion.div>
                <h2 className={`text-xl font-bold mb-2 ${T}`}>Mot de passe réinitialisé !</h2>
                <p className={`text-sm mb-6 ${S}`}>
                  Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.
                </p>
                <Link href="/login"
                  className="block w-full py-3.5 rounded-xl text-sm font-bold text-white text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
                  Se connecter maintenant
                </Link>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        <p className={`text-center text-xs ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
          &copy; 2026 BNBGest &middot; Gestion locative professionnelle
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
