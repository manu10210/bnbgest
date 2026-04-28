'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { loadClientSetting, saveClientSetting } from '@/lib/client-settings';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Globe,
  Camera,
  Save,
  Edit,
  Check,
  X
} from 'lucide-react';

export default function ProfileSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const defaultProfile = {
    name: 'Emmanuel Claustre',
    email: 'claustre.emmanuel@gmail.com',
    phone: '+33 6 12 34 56 78',
    company: 'BNBGEST',
    address: '123 Rue de la Paix',
    city: 'Paris',
    postalCode: '75001',
    country: 'France',
    website: 'https://bnbgest.vercel.app',
    bio: 'Gestionnaire de propriétés Airbnb depuis 2020. Passionné par l\'hospitalité et l\'expérience client.',
    timezone: 'Europe/Paris',
    language: 'fr',
    currency: 'EUR'
  };

  const [profile, setProfile] = useState(defaultProfile);
  const [savedProfile, setSavedProfile] = useState(defaultProfile);

  useEffect(() => {
    const loaded = loadClientSetting('profile', defaultProfile);
    setProfile(loaded);
    setSavedProfile(loaded);
  }, []);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setEditing(false);
      setSavedProfile(profile);
      saveClientSetting('profile', profile);
      toast.success('Profil sauvegardé avec succès');
    }, 1000);
  };

  const handleCancel = () => {
    setProfile(savedProfile);
    setEditing(false);
  };

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500">
                <User size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Profil & Compte
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Gérez vos informations personnelles
                </p>
              </div>
            </div>

            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-colors disabled:opacity-50"
                >
                  <Check size={20} />
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={handleCancel}
                  className={`px-6 py-3 rounded-lg ${
                    isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  } transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-colors"
              >
                <Edit size={20} />
                Modifier
              </button>
            )}
          </div>
        </div>

        {/* Profile Picture */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Photo de profil
          </h2>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-4xl font-bold">
                EC
              </div>
              {editing && (
                <button className="absolute bottom-0 right-0 p-2 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors">
                  <Camera size={20} />
                </button>
              )}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {profile.name}
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {profile.email}
              </p>
              {editing && (
                <button className="mt-2 text-sm text-green-500 hover:text-green-600">
                  Changer la photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Informations personnelles
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Nom complet
              </label>
              <div className="flex items-center gap-3">
                <User size={20} className="text-green-500" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={!editing}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-blue-500" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  disabled={!editing}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Téléphone
              </label>
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-orange-500" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  disabled={!editing}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Entreprise
              </label>
              <div className="flex items-center gap-3">
                <Building size={20} className="text-purple-500" />
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  disabled={!editing}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Bio
            </label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              disabled={!editing}
              rows={4}
              className={`w-full px-4 py-3 rounded-lg ${
                isDark 
                  ? 'bg-white/5 border border-white/10 text-white' 
                  : 'bg-white border border-gray-200 text-gray-900'
              } disabled:opacity-50`}
            />
          </div>
        </div>

        {/* Address */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Adresse
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Adresse
              </label>
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-red-500" />
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  disabled={!editing}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    isDark 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-white border border-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Ville
              </label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Code postal
              </label>
              <input
                type="text"
                value={profile.postalCode}
                onChange={(e) => setProfile({ ...profile, postalCode: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              />
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Pays
              </label>
              <select
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              >
                <option value="France">France</option>
                <option value="Belgium">Belgique</option>
                <option value="Switzerland">Suisse</option>
                <option value="Canada">Canada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Préférences
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Langue
              </label>
              <select
                value={profile.language}
                onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Fuseau horaire
              </label>
              <select
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              >
                <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New_York (GMT-5)</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Devise
              </label>
              <select
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                disabled={!editing}
                className={`w-full px-4 py-3 rounded-lg ${
                  isDark 
                    ? 'bg-white/5 border border-white/10 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900'
                } disabled:opacity-50`}
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CHF">CHF (Fr.)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <User size={24} className={isDark ? 'text-green-400' : 'text-green-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-green-400' : 'text-green-900'}`}>
                👤 Protection de vos données
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Vos informations personnelles sont sécurisées et ne seront jamais partagées avec des tiers.
                Vous pouvez modifier ou supprimer vos données à tout moment. Pour supprimer votre compte,
                contactez le support à support@bnbgest.com.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}