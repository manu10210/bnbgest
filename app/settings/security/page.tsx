'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Lock,
  Key,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react';

interface Session {
  id: string;
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
}

export default function SecuritySettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      device: 'Windows PC - Chrome',
      location: 'Paris, France',
      ip: '192.168.1.100',
      lastActive: 'À l\'instant',
      current: true
    },
    {
      id: '2',
      device: 'iPhone 13 - Safari',
      location: 'Paris, France',
      ip: '192.168.1.101',
      lastActive: 'Il y a 2 heures',
      current: false
    },
    {
      id: '3',
      device: 'MacBook Pro - Chrome',
      location: 'Lyon, France',
      ip: '192.168.1.102',
      lastActive: 'Il y a 1 jour',
      current: false
    }
  ]);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'API Production',
      key: 'bnb_prod_xxxxxxxxxxxx',
      created: '2024-01-15',
      lastUsed: '2024-01-20'
    },
    {
      id: '2',
      name: 'API Development',
      key: 'bnb_dev_xxxxxxxxxxxx',
      created: '2024-01-10',
      lastUsed: '2024-01-19'
    }
  ]);

  const handlePasswordChange = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      alert('Mot de passe modifié avec succès');
    }, 1000);
  };

  const handleToggleTwoFactor = () => {
    if (!twoFactorEnabled) {
      // Simuler l'activation 2FA
      alert('Code QR affiché. Scannez avec votre app d\'authentification.');
    }
    setTwoFactorEnabled(!twoFactorEnabled);
  };

  const handleRevokeSession = (sessionId: string) => {
    if (confirm('Voulez-vous vraiment révoquer cette session ?')) {
      setSessions(sessions.filter(s => s.id !== sessionId));
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('Clé API copiée dans le presse-papiers');
  };

  const handleRevokeKey = (keyId: string) => {
    if (confirm('Voulez-vous vraiment révoquer cette clé API ?')) {
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
    }
  };

  const handleGenerateKey = () => {
    const name = prompt('Nom de la nouvelle clé API :');
    if (name) {
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name,
        key: `bnb_${Math.random().toString(36).substring(2, 15)}`,
        created: new Date().toISOString().split('T')[0],
        lastUsed: 'Jamais'
      };
      setApiKeys([...apiKeys, newKey]);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-lg ${
              isDark 
                ? 'bg-white/5 hover:bg-white/10 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-900'
            } transition-colors`}
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500">
              <Shield size={40} className="text-white" />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Sécurité
              </h1>
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Protégez votre compte et vos données
              </p>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Lock size={24} className="text-red-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Changer le mot de passe
            </h2>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className={`w-full px-4 py-3 pr-12 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className={`p-4 rounded-lg mb-4 ${
            isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
              ⚠️ Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.
            </p>
          </div>

          <button
            onClick={handlePasswordChange}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transition-colors disabled:opacity-50"
          >
            <Lock size={20} />
            {saving ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </div>

        {/* Two-Factor Authentication */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Smartphone size={24} className="text-green-500" />
              <div>
                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Authentification à deux facteurs
                </h2>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Renforcez la sécurité de votre compte
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleTwoFactor}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                twoFactorEnabled ? 'bg-green-500' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {twoFactorEnabled && (
            <div className={`p-4 rounded-lg ${
              isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-center gap-2">
                <Check size={20} className="text-green-500" />
                <p className={`text-sm font-semibold ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                  Authentification à deux facteurs activée
                </p>
              </div>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Votre compte est maintenant protégé par un code de vérification à usage unique.
              </p>
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Monitor size={24} className="text-blue-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Sessions actives
            </h2>
          </div>

          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Monitor size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                      <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {session.device}
                      </h3>
                      {session.current && (
                        <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
                          Session actuelle
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          {session.location} • {session.ip}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                          {session.lastActive}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className={`px-4 py-2 rounded-lg ${
                        isDark 
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      } transition-colors`}
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Key size={24} className="text-purple-500" />
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Clés API
              </h2>
            </div>
            <button
              onClick={handleGenerateKey}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-colors"
            >
              <RefreshCw size={20} />
              Générer une clé
            </button>
          </div>

          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className={`p-4 rounded-lg ${
                  isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {apiKey.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <code className={`px-3 py-1 rounded ${
                        isDark ? 'bg-black/30 text-purple-400' : 'bg-white text-purple-600'
                      } font-mono text-sm`}>
                        {apiKey.key}
                      </code>
                      <button
                        onClick={() => handleCopyKey(apiKey.key)}
                        className={`p-2 rounded-lg ${
                          isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <Copy size={16} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                      </button>
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Créée le {apiKey.created} • Dernière utilisation : {apiKey.lastUsed}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(apiKey.id)}
                    className={`px-4 py-2 rounded-lg ${
                      isDark 
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                        : 'bg-red-50 text-red-600 hover:bg-red-100'
                    } transition-colors`}
                  >
                    Révoquer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Alerts */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-900'}`}>
                🔒 Conseils de sécurité
              </h3>
              <ul className={`text-sm space-y-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <li>• Utilisez un mot de passe unique et complexe</li>
                <li>• Activez l'authentification à deux facteurs</li>
                <li>• Ne partagez jamais vos clés API publiquement</li>
                <li>• Révoquez les sessions inconnues immédiatement</li>
                <li>• Changez votre mot de passe régulièrement</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
