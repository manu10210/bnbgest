'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { ArrowLeft, Mail, Send, CheckCircle, AlertCircle, Shield, Home } from 'lucide-react';
import Link from 'next/link';

type Step = 'form' | 'sent' | 'error';

export default function ForgotPasswordPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Veuillez saisir une adresse email valide.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      // Toujours afficher "envoyé" pour ne pas exposer si l'email existe
      setStep('sent');
    } catch {
      setStep('sent'); // Même en cas d'erreur réseau, ne pas exposer l'info
    } finally {
      setIsLoading(false);
    }
  };

  const bg = isDark ? 'bg-[#0d0d1a]' : 'bg-[#f7f7f7]';
  const card = isDark
    ? 'bg-[#1a1a2e] border border-white/[0.08]'
    : 'bg-white border border-gray-100 shadow-lg';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const S = isDark ? 'text-white/50' : 'text-gray-500';
  const INP = isDark
    ? 'bg-white/[0.04] border-white/[0.1] text-white placeholder-white/30 focus:border-violet-500/60 focus:ring-violet-500/20'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-400 focus:ring-violet-200';

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-12 transition-colors ${bg} relative overflow-hidden`}>
      {/* Background blobs */}
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/25">
            <Home className="w-8 h-8 text-white" />
          </div>
          <p className={`text-xs font-semibold tracking-widest uppercase mb-1 ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>BNBGest</p>
        </motion.div>

        {/* Card */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`rounded-2xl p-8 ${card}`}>

          <AnimatePresence mode="wait">

            {/* STEP — Formulaire */}
            {step === 'form' && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-6">
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${isDark ? 'bg-violet-500/15' : 'bg-violet-50'}`}>
                    <Shield className="w-6 h-6 text-violet-500" />
                  </div>
                  <h1 className={`text-2xl font-bold mb-1 ${T}`}>Mot de passe oublié ?</h1>
                  <p className={`text-sm ${S}`}>
                    Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                    </motion.div>
                  )}

                  <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${S}`}>
                      Adresse email
                    </label>
                    <div className={`relative rounded-xl transition-all ${focused ? 'ring-2 ring-violet-500/30' : ''}`}>
                      <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${focused ? isDark ? 'bg-violet-500/15' : 'bg-violet-50' : isDark ? 'bg-white/[0.04]' : 'bg-gray-100'}`}>
                        <Mail className={`w-4 h-4 transition-colors ${focused ? 'text-violet-500' : isDark ? 'text-white/30' : 'text-gray-400'}`} />
                      </div>
                      <input
                        type="email"
                        autoFocus
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="votre@email.com"
                        disabled={isLoading}
                        className={`w-full pl-14 pr-4 py-3.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${INP}`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all shadow-lg shadow-violet-500/20">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer le lien de réinitialisation
                      </>
                    )}
                  </button>
                </form>

                <p className={`text-center text-xs mt-5 ${S}`}>
                  Vous vous souvenez de votre mot de passe ?{' '}
                  <Link href="/login" className="text-violet-500 hover:text-violet-400 font-semibold transition-colors">
                    Se connecter
                  </Link>
                </p>
              </motion.div>
            )}

            {/* STEP — Email envoyé */}
            {step === 'sent' && (
              <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </motion.div>
                <h2 className={`text-xl font-bold mb-2 ${T}`}>Email envoyé !</h2>
                <p className={`text-sm mb-1 ${S}`}>
                  Si un compte existe pour{' '}
                  <span className={`font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{email}</span>,
                  vous recevrez un lien de réinitialisation.
                </p>
                <p className={`text-xs mt-3 mb-6 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  Vérifiez aussi vos spams. Le lien expire dans <strong>30 minutes</strong>.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => { setStep('form'); setEmail(''); }}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/10 text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                    Utiliser un autre email
                  </button>
                  <Link href="/login"
                    className="block w-full py-3 rounded-xl text-sm font-bold text-white text-center bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 transition-opacity">
                    Retour à la connexion
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <p className={`text-center text-xs ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
          &copy; 2026 BNBGest &middot; Gestion locative professionnelle
        </p>
      </div>
    </div>
  );
}
