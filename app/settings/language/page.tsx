'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { loadClientSetting, saveClientSetting } from '@/lib/client-settings';
import {
  ArrowLeft,
  Globe,
  Languages,
  Calendar,
  DollarSign,
  Clock,
  Check,
  Save
} from 'lucide-react';

export default function LanguageSettingsPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  
  const [saving, setSaving] = useState(false);
  const defaultSettings = {
    language: 'fr',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    numberFormat: 'space',
    firstDayOfWeek: '1'
  };
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const loaded = loadClientSetting('language', defaultSettings);
    setSettings(loaded);
  }, []);

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];

  const timezones = [
    { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)', offset: '+1:00' },
    { value: 'Europe/London', label: 'Europe/London (GMT)', offset: '±0:00' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (GMT+1)', offset: '+1:00' },
    { value: 'America/New_York', label: 'America/New_York (GMT-5)', offset: '-5:00' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)', offset: '-8:00' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)', offset: '+9:00' }
  ];

  const currencies = [
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr.' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: '31/12/2024', example: '31/12/2024' },
    { value: 'MM/DD/YYYY', label: '12/31/2024', example: '12/31/2024' },
    { value: 'YYYY-MM-DD', label: '2024-12-31', example: '2024-12-31' },
    { value: 'DD.MM.YYYY', label: '31.12.2024', example: '31.12.2024' }
  ];

  const timeFormats = [
    { value: '24h', label: '24 heures', example: '14:30' },
    { value: '12h', label: '12 heures (AM/PM)', example: '2:30 PM' }
  ];

  const numberFormats = [
    { value: 'space', label: 'Espace', example: '1 234 567.89' },
    { value: 'comma', label: 'Virgule', example: '1,234,567.89' },
    { value: 'dot', label: 'Point', example: '1.234.567,89' }
  ];

  const daysOfWeek = [
    { value: '0', label: 'Dimanche' },
    { value: '1', label: 'Lundi' },
    { value: '6', label: 'Samedi' }
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      saveClientSetting('language', settings);
      toast.success('Paramètres régionaux sauvegardés');
    }, 1000);
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
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500">
                <Globe size={40} className="text-white" />
              </div>
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Langue & Région
                </h1>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Personnalisez votre expérience régionale
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 transition-colors disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Language Selection */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Languages size={24} className="text-indigo-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Langue de l&apos;interface
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSettings({ ...settings, language: lang.code })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  settings.language === lang.code
                    ? isDark
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-indigo-500 bg-indigo-50'
                    : isDark
                    ? 'border-white/10 bg-white/5 hover:border-white/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{lang.flag}</span>
                    <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {lang.name}
                    </span>
                  </div>
                  {settings.language === lang.code && (
                    <Check size={20} className="text-indigo-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Clock size={24} className="text-blue-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Fuseau horaire
            </h2>
          </div>

          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className={`w-full px-4 py-3 rounded-lg ${
              isDark 
                ? 'bg-white/5 border border-white/10 text-white' 
                : 'bg-white border border-gray-200 text-gray-900'
            }`}
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>

          <div className={`mt-4 p-4 rounded-lg ${
            isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
              🕐 Heure locale actuelle : {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Currency */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <DollarSign size={24} className="text-green-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Devise
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencies.map((curr) => (
              <button
                key={curr.code}
                onClick={() => setSettings({ ...settings, currency: curr.code })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  settings.currency === curr.code
                    ? isDark
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-green-500 bg-green-50'
                    : isDark
                    ? 'border-white/10 bg-white/5 hover:border-white/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {curr.code} {curr.symbol}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {curr.name}
                    </div>
                  </div>
                  {settings.currency === curr.code && (
                    <Check size={20} className="text-green-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time Format */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={24} className="text-purple-500" />
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Format de date et heure
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Format de date
              </label>
              <div className="space-y-2">
                {dateFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setSettings({ ...settings, dateFormat: format.value })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      settings.dateFormat === format.value
                        ? isDark
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-purple-500 bg-purple-50'
                        : isDark
                        ? 'border-white/10 bg-white/5 hover:border-white/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {format.example}
                      </span>
                      {settings.dateFormat === format.value && (
                        <Check size={16} className="text-purple-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Format d&apos;heure
              </label>
              <div className="space-y-2">
                {timeFormats.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setSettings({ ...settings, timeFormat: format.value })}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      settings.timeFormat === format.value
                        ? isDark
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-purple-500 bg-purple-50'
                        : isDark
                        ? 'border-white/10 bg-white/5 hover:border-white/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {format.label}
                        </div>
                        <div className={`text-sm font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {format.example}
                        </div>
                      </div>
                      {settings.timeFormat === format.value && (
                        <Check size={16} className="text-purple-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Number Format */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🔢</span>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Format des nombres
            </h2>
          </div>

          <div className="space-y-2">
            {numberFormats.map((format) => (
              <button
                key={format.value}
                onClick={() => setSettings({ ...settings, numberFormat: format.value })}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  settings.numberFormat === format.value
                    ? isDark
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-indigo-500 bg-indigo-50'
                    : isDark
                    ? 'border-white/10 bg-white/5 hover:border-white/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {format.label}
                    </div>
                    <div className={`font-mono text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {format.example}
                    </div>
                  </div>
                  {settings.numberFormat === format.value && (
                    <Check size={20} className="text-indigo-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* First Day of Week */}
        <div className={`mb-6 p-6 rounded-2xl ${
          isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📅</span>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Premier jour de la semaine
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {daysOfWeek.map((day) => (
              <button
                key={day.value}
                onClick={() => setSettings({ ...settings, firstDayOfWeek: day.value })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.firstDayOfWeek === day.value
                    ? isDark
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-indigo-500 bg-indigo-50'
                    : isDark
                    ? 'border-white/10 bg-white/5 hover:border-white/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {day.label}
                  </span>
                  {settings.firstDayOfWeek === day.value && (
                    <Check size={20} className="text-indigo-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className={`p-6 rounded-2xl ${
          isDark ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
              <Globe size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>
                🌍 Paramètres régionaux
              </h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                Ces paramètres affectent l&apos;affichage des dates, heures, nombres et devises dans toute l&apos;application.
                Les changements prennent effet immédiatement après l&apos;enregistrement.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}