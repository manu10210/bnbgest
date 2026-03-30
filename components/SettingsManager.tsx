'use client';

import { useState, useEffect } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, CreditCard, Bell, Shield, Globe, Smartphone, 
  Mail, Building, Save, RefreshCw, Download, Upload,
  Users, Zap, Lock, Palette, Database, HelpCircle,
  Check, X, AlertTriangle, Plus, Trash2, Moon, Clock,
  Calendar, Star, Wrench, Megaphone, FileText, MessageCircle, Settings, Copy
} from 'lucide-react';

// ═══ Types ════════════════════════════════════════════════════════════
interface AppSettings {
  profile: {
    name: string;
    email: string;
    phone: string;
    company: string;
    siret: string;
    avatar?: string;
    bio?: string;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    primaryColor: string;
    density: 'comfortable' | 'compact';
    language: string;
    currency: string;
    dateFormat: string;
    timezone: string;
    fontSize?: 'small' | 'medium' | 'large';
    borderRadius?: 'small' | 'medium' | 'large';
    animations?: boolean;
  };
  notifications: {
    channels: {
      email: boolean;
      push: boolean;
      sms: boolean;
      whatsapp: boolean;
    };
    alerts: {
      bookings: { email: boolean; push: boolean; sms: boolean };
      reviews: { email: boolean; push: boolean; sms: boolean };
      finance: { email: boolean; push: boolean; sms: boolean };
      system: { email: boolean; push: boolean; sms: boolean };
      marketing: { email: boolean; push: boolean; sms: boolean };
      maintenance: { email: boolean; push: boolean; sms: boolean };
    };
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      weekendMode: boolean;
    };
  };
  integrations: {
    stripe: { enabled: boolean; publicKey: string; secretKey: string };
    paypal: { enabled: boolean; clientId: string };
    airbnb: { enabled: boolean; syncFrequency: '1h' | '6h' | '24h' };
    booking: { enabled: boolean; syncFrequency: '1h' | '6h' | '24h' };
    googleCalendar: { enabled: boolean; calendarId: string };
  };
  automation: {
    autoReply: boolean;
    autoReview: boolean;
    autoTaskCreation: boolean;
    welcomeEmailDelay: number; // minutes
    checkoutEmailDelay: number; // hours
  };
  team: {
    members: Array<{
      id: string;
      name: string;
      role: 'admin' | 'manager' | 'cleaner' | 'maintenance';
      email: string;
      active: boolean;
    }>;
  };
  pricing: {
    vatRate: number;
    cleaningFeeDefault: number;
    platformCommission: number;
    touristTax: number;
    securityDeposit: number;
    weekendMultiplier: number; // 1.2 = +20%
  };
}

const defaultSettings: AppSettings = {
  profile: {
    name: 'Administrateur',
    email: 'admin@bnbgest.com',
    phone: '',
    company: '',
    siret: '',
  },
  appearance: {
    theme: 'light',
    primaryColor: '#FF385C',
    density: 'comfortable',
    language: 'fr',
    currency: '€',
    dateFormat: 'dd/MM/yyyy',
    timezone: 'Europe/Paris',
    fontSize: 'medium',
    borderRadius: 'medium',
    animations: true,
  },
  notifications: {
    channels: {
      email: true,
      push: true,
      sms: true,
      whatsapp: true,
    },
    alerts: {
      bookings: { email: true, push: true, sms: true },
      reviews: { email: true, push: true, sms: true },
      finance: { email: true, push: true, sms: true },
      system: { email: true, push: true, sms: true },
      marketing: { email: true, push: true, sms: true },
      maintenance: { email: true, push: true, sms: true },
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
      weekendMode: true,
    },
  },
  integrations: {
    stripe: { enabled: false, publicKey: '', secretKey: '' },
    paypal: { enabled: false, clientId: '' },
    airbnb: { enabled: false, syncFrequency: '1h' },
    booking: { enabled: false, syncFrequency: '6h' },
    googleCalendar: { enabled: false, calendarId: '' },
  },
  automation: {
    autoReply: false,
    autoReview: false,
    autoTaskCreation: true,
    welcomeEmailDelay: 0,
    checkoutEmailDelay: 24,
  },
  team: {
    members: [
      { id: '1', name: 'Admin Principal', role: 'admin', email: 'admin@bnbgest.com', active: true }
    ],
  },
  pricing: {
    vatRate: 20,
    cleaningFeeDefault: 50,
    platformCommission: 15,
    touristTax: 1.5,
    securityDeposit: 500,
    weekendMultiplier: 1.2,
  },
};

// ═══ Components UI ═════════════════════════════════════════════════════

const Toggle = ({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
  <div className="flex items-center justify-between py-4">
    <div className="flex-1 pr-4">
      <h4 className="text-sm font-medium text-gray-900">{label}</h4>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:ring-offset-2 ${
        value ? 'bg-[#FF385C]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

const SectionHeader = ({ title, description }: { title: string; description?: string }) => (
  <div className="mb-6">
    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
    {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
  </div>
);

const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {children}
  </div>
);

// ═══ Main Component ═══════════════════════════════════════════════════

export default function SettingsManager({ initialTab = 'profile' }: { initialTab?: string }) {
  const { properties, bookings, guests } = useBNB();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bnbgest-settings-v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          
          // Migration: Check if notifications structure is outdated (missing 'channels')
          if (parsed.notifications && !parsed.notifications.channels) {
            // Reset notifications to new structure while keeping other settings
            parsed.notifications = defaultSettings.notifications;
          }
          
          return { ...defaultSettings, ...parsed };
        }
        return defaultSettings;
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Intégrations', icon: Globe },
    { id: 'automation', label: 'Automatisation', icon: Zap },
    { id: 'team', label: 'Équipe', icon: Users },
    { id: 'pricing', label: 'Tarification', icon: CreditCard },
    { id: 'data', label: 'Données', icon: Database },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    localStorage.setItem('bnbgest-settings-v2', JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('bnbgest-settings-updated', { detail: settings }));
    setIsSaving(false);
  };

  const updateSection = <K extends keyof AppSettings>(section: K, data: Partial<AppSettings[K]>) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-500">Gérez vos préférences et la configuration de l'application</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 bg-[#FF385C] text-white rounded-xl font-medium shadow-sm hover:bg-[#d93250] transition-all ${
            isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-md active:scale-95'
          }`}
        >
          {isSaving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#FF385C]/10 text-[#FF385C]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : ''}`} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ─── PROFILE ─── */}
                {activeTab === 'profile' && (
                  <div className="space-y-8">
                    <SectionHeader title="Profil & Organisation" description="Informations visibles sur vos documents et factures." />
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 flex items-center gap-6 pb-6 border-b border-gray-100">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                          {settings.profile.avatar ? '🖼️' : '👤'}
                        </div>
                        <div>
                          <button className="text-[#FF385C] font-medium text-sm hover:underline">Changer la photo</button>
                          <p className="text-xs text-gray-500 mt-1">JPG, GIF ou PNG. Max 1MB.</p>
                        </div>
                      </div>

                      <InputGroup label="Nom complet">
                        <input type="text" value={settings.profile.name} onChange={e => updateSection('profile', { name: e.target.value })} className="input-field" />
                      </InputGroup>
                      
                      <InputGroup label="Email professionnel">
                        <input type="email" value={settings.profile.email} onChange={e => updateSection('profile', { email: e.target.value })} className="input-field" />
                      </InputGroup>

                      <InputGroup label="Entreprise">
                        <input type="text" value={settings.profile.company} onChange={e => updateSection('profile', { company: e.target.value })} className="input-field" />
                      </InputGroup>

                      <InputGroup label="Numéro SIRET">
                        <input type="text" value={settings.profile.siret} onChange={e => updateSection('profile', { siret: e.target.value })} className="input-field" />
                      </InputGroup>

                      <div className="md:col-span-2">
                        <InputGroup label="Bio / Description">
                          <textarea 
                            rows={3}
                            value={settings.profile.bio || ''} 
                            onChange={e => updateSection('profile', { bio: e.target.value })} 
                            className="input-field"
                            placeholder="Une brève description de votre activité..."
                          />
                        </InputGroup>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── APPEARANCE ─── */}
                {activeTab === 'appearance' && (
                  <div className="space-y-8 animate-fadeIn">
                    <SectionHeader title="Personnalisation" description="Adaptez l'apparence de l'application à votre marque." />

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid md:grid-cols-2 gap-8">
                      {/* Theme Selection */}
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-sm font-semibold text-gray-900 block mb-2">Thème de l'interface</label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'light', label: 'Clair', icon:  Users /* Using valid icon temporarily */ },
                            { id: 'dark', label: 'Sombre', icon: Moon },
                            { id: 'system', label: 'Système', icon: Smartphone }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => updateSection('appearance', { theme: opt.id as any })}
                              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                                settings.appearance.theme === opt.id
                                  ? 'border-[#FF385C] bg-[#FF385C]/5 text-[#FF385C]'
                                  : 'border-gray-100 hover:border-gray-200 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              <opt.icon className="w-6 h-6 mb-2" />
                              <span className="text-sm font-medium">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Primary Color */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-900 block">Couleur Principale</label>
                        <div className="flex flex-wrap gap-3">
                          {['#FF385C', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                            <button
                              key={color}
                              onClick={() => updateSection('appearance', { primaryColor: color })}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                                settings.appearance.primaryColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110 shadow-sm' : ''
                              }`}
                              style={{ backgroundColor: color }}
                            >
                              {settings.appearance.primaryColor === color && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Density */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-900 block">Densité d'affichage</label>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          {[
                            { id: 'comfortable', label: 'Confortable' },
                            { id: 'compact', label: 'Compact' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => updateSection('appearance', { density: opt.id as any })}
                              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                settings.appearance.density === opt.id
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 md:col-span-2 my-2" />

                      {/* Regional Settings */}
                      <InputGroup label="Langue de l'interface">
                        <select 
                          value={settings.appearance.language}
                          onChange={e => updateSection('appearance', { language: e.target.value })}
                          className="input-field"
                        >
                          <option value="fr">Français (France)</option>
                          <option value="en">English (US)</option>
                          <option value="es">Español</option>
                          <option value="de">Deutsch</option>
                          <option value="it">Italiano</option>
                        </select>
                      </InputGroup>

                      <InputGroup label="Devise">
                        <select 
                          value={settings.appearance.currency}
                          onChange={e => updateSection('appearance', { currency: e.target.value })}
                          className="input-field"
                        >
                          <option value="€">Euro (€)</option>
                          <option value="$">US Dollar ($)</option>
                          <option value="£">Pound Sterling (£)</option>
                          <option value="CHF">Swiss Franc (CHF)</option>
                          <option value="CAD">Canadian Dollar (CAD)</option>
                        </select>
                      </InputGroup>

                      {/* New: Font Size */}
                      <InputGroup label="Taille de police">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                          {[
                            { id: 'small', label: 'Petite' },
                            { id: 'medium', label: 'Moyenne' },
                            { id: 'large', label: 'Grande' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => updateSection('appearance', { fontSize: opt.id as any })}
                              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                                settings.appearance.fontSize === opt.id
                                  ? 'bg-white text-gray-900 shadow-sm'
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </InputGroup>

                      {/* New: Border Radius */}
                      <InputGroup label="Arrondi des boutons">
                        <div className="flex space-x-4 pt-2">
                           {[
                            { id: 'small', label: 'Carré', class: 'rounded-sm' },
                            { id: 'medium', label: 'Standard', class: 'rounded-lg' },
                            { id: 'large', label: 'Rond', class: 'rounded-2xl' }
                          ].map(opt => (
                             <button
                              key={opt.id}
                              onClick={() => updateSection('appearance', { borderRadius: opt.id as any })}
                              className={`flex-1 h-10 border-2 flex items-center justify-center text-xs font-medium transition-all ${opt.class} ${
                                settings.appearance.borderRadius === opt.id
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </InputGroup>
                      
                       <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div>
                          <h4 className="font-medium text-gray-900">Animations de l'interface</h4>
                          <p className="text-xs text-gray-500">Désactivez pour améliorer les performances sur les appareils plus lents.</p>
                        </div>
                         <Toggle 
                            value={settings.appearance.animations !== false} 
                            onChange={v => updateSection('appearance', { animations: v })} 
                            label="" 
                          />
                      </div>

                    </div>
                  </div>
                )}

                {/* ─── INTEGRATIONS ─── */}
                {activeTab === 'integrations' && (
                  <div className="space-y-8">
                    <SectionHeader title="Intégrations & API" description="Connectez vos outils favoris pour synchroniser vos données." />
                    
                    <div className="space-y-6">
                      {/* Stripe */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#635BFF]/10 text-[#635BFF] rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">Intégration Stripe</h4>
                              <p className="text-sm text-gray-500">Paiements sécurisés en ligne</p>
                            </div>
                          </div>
                          <Toggle 
                            value={settings.integrations.stripe.enabled} 
                            onChange={v => updateSection('integrations', { stripe: { ...settings.integrations.stripe, enabled: v } })} 
                            label="" 
                          />
                        </div>
                        
                        {settings.integrations.stripe.enabled && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="grid gap-4 pl-12 border-t border-gray-100 pt-4"
                          >
                            <InputGroup label="Clé Publique (Publishable Key)">

                              <input 
                                type="text" 
                                value={settings.integrations.stripe.publicKey}
                                onChange={e => updateSection('integrations', { stripe: { ...settings.integrations.stripe, publicKey: e.target.value } })}
                                className="input-field font-mono text-sm" 
                                placeholder="pk_test_..."
                              />
                            </InputGroup>
                            <InputGroup label="Clé Secrète (Secret Key)">
                              <input 
                                type="password" 
                                value={settings.integrations.stripe.secretKey}
                                onChange={e => updateSection('integrations', { stripe: { ...settings.integrations.stripe, secretKey: e.target.value } })}
                                className="input-field font-mono text-sm" 
                                placeholder="sk_test_..."
                              />
                            </InputGroup>
                          </motion.div>
                        )}
                      </div>

                      {/* Airbnb & Booking.com */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Airbnb */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#FF5A5F]/10 text-[#FF5A5F] rounded-lg flex items-center justify-center">
                                <Globe className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">Airbnb</h4>
                                <p className="text-xs text-gray-500">Sync iCal</p>
                              </div>
                            </div>
                            <Toggle 
                              value={settings.integrations.airbnb.enabled} 
                              onChange={v => updateSection('integrations', { airbnb: { ...settings.integrations.airbnb, enabled: v } })} 
                              label="" 
                            />
                          </div>
                          {settings.integrations.airbnb.enabled && (
                            <div className="pt-4 border-t border-gray-100 animate-fadeIn">
                               <InputGroup label="Fréquence Sync">
                                <select 
                                  value={settings.integrations.airbnb.syncFrequency}
                                  onChange={e => updateSection('integrations', { airbnb: { ...settings.integrations.airbnb, syncFrequency: e.target.value as any } })}
                                  className="input-field text-sm"
                                >
                                  <option value="1h">1 heure</option>
                                  <option value="6h">6 heures</option>
                                  <option value="24h">24 heures</option>
                                </select>
                              </InputGroup>
                            </div>
                          )}
                        </div>

                        {/* Booking.com */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#003580]/10 text-[#003580] rounded-lg flex items-center justify-center">
                                <Building className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">Booking.com</h4>
                                <p className="text-xs text-gray-500">Channel Manager</p>
                              </div>
                            </div>
                            <Toggle 
                              value={settings.integrations.booking.enabled} 
                              onChange={v => updateSection('integrations', { booking: { ...settings.integrations.booking, enabled: v } })} 
                              label="" 
                            />
                          </div>
                          {settings.integrations.booking.enabled && (
                            <div className="pt-4 border-t border-gray-100 animate-fadeIn">
                               <InputGroup label="Fréquence Sync">
                                <select 
                                  value={settings.integrations.booking.syncFrequency}
                                  onChange={e => updateSection('integrations', { booking: { ...settings.integrations.booking, syncFrequency: e.target.value as any } })}
                                  className="input-field text-sm"
                                >
                                  <option value="1h">1 heure (Recommandé)</option>
                                  <option value="6h">6 heures</option>
                                  <option value="24h">24 heures</option>
                                </select>
                              </InputGroup>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Google Calendar */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">Google Calendar</h4>
                              <p className="text-sm text-gray-500">Synchronisation des événements et disponibilités.</p>
                            </div>
                          </div>
                          <Toggle 
                            value={settings.integrations.googleCalendar.enabled} 
                            onChange={v => updateSection('integrations', { googleCalendar: { ...settings.integrations.googleCalendar, enabled: v } })} 
                            label="" 
                          />
                        </div>
                        {settings.integrations.googleCalendar.enabled && (
                          <div className="pl-12 pt-2 animate-fadeIn">
                             <InputGroup label="ID de l'agenda (Calendar ID)">
                               <input 
                                  type="text" 
                                  value={settings.integrations.googleCalendar.calendarId}
                                  onChange={e => updateSection('integrations', { googleCalendar: { ...settings.integrations.googleCalendar, calendarId: e.target.value } })}
                                  className="input-field font-mono text-sm"
                                  placeholder="exemple@group.calendar.google.com"
                                />
                             </InputGroup>
                          </div>
                        )}
                      </div>

                      {/* PayPal */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0070BA]/10 text-[#0070BA] rounded-lg flex items-center justify-center">
                              <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900">PayPal</h4>
                              <p className="text-sm text-gray-500">Acceptez les paiements via PayPal.</p>
                            </div>
                          </div>
                          <Toggle 
                            value={settings.integrations.paypal.enabled} 
                            onChange={v => updateSection('integrations', { paypal: { ...settings.integrations.paypal, enabled: v } })} 
                            label="" 
                          />
                        </div>
                        {settings.integrations.paypal.enabled && (
                          <div className="pl-12 pt-2 animate-fadeIn">
                             <InputGroup label="Client ID (REST API)">
                               <input 
                                  type="text" 
                                  value={settings.integrations.paypal.clientId}
                                  onChange={e => updateSection('integrations', { paypal: { ...settings.integrations.paypal, clientId: e.target.value } })}
                                  className="input-field font-mono text-sm"
                                  placeholder="Ac_..."
                                />
                             </InputGroup>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}


                {/* ─── AUTOMATION ─── */}
                {activeTab === 'automation' && (
                  <div className="space-y-8 animate-fadeIn">
                    <SectionHeader title="Règles d'Automatisation" description="Configurez les actions automatiques pour gagner du temps." />

                    {/* Communication */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                         <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                           <MessageCircle className="w-5 h-5" />
                         </div>
                         <h4 className="font-bold text-gray-900 text-lg">Communication Voyageurs</h4>
                       </div>
                       
                       <div className="divide-y divide-gray-100">
                          {/* Auto Reply */}
                          <div className="p-6 space-y-4">
                            <Toggle 
                              value={settings.automation.autoReply} 
                              onChange={v => updateSection('automation', { autoReply: v })}
                              label="Réponse automatique immédiate" 
                              description="Envoyer un message de confirmation dès réception d'une demande de réservation."
                            />
                            
                            {settings.automation.autoReply && (
                              <div className="pl-12">
                                <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Message envoyé</label>
                                <textarea 
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                  rows={3}
                                  placeholder="Bonjour, merci pour votre demande ! Je reviens vers vous..."
                                  defaultValue="Bonjour ! Merci pour votre demande de réservation. J'ai bien reçu votre message et je vous répondrai dans les plus brefs délais."
                                />
                              </div>
                            )}
                          </div>

                          {/* Welcome Guide Email */}
                          <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                               <div>
                                 <h4 className="text-sm font-medium text-gray-900">Envoi du livret d'accueil</h4>
                                 <p className="text-sm text-gray-500 mt-1">Envoyer automatiquement le guide de bienvenue avant l'arrivée.</p>
                               </div>
                               <div className="flex items-center gap-3">
                                  <select 
                                    value={settings.automation.welcomeEmailDelay}
                                    onChange={e => updateSection('automation', { welcomeEmailDelay: parseInt(e.target.value) })}
                                    className="input-field py-1 h-9 text-xs w-32"
                                  >
                                    <option value={0}>Dès réservation</option>
                                    <option value={24}>24h avant</option>
                                    <option value={48}>48h avant</option>
                                    <option value={72}>72h avant</option>
                                  </select>
                               </div>
                             </div>
                          </div>

                          {/* Checkout Email */}
                          <div className="p-6 space-y-4">
                             <div className="flex justify-between items-center">
                               <div>
                                 <h4 className="text-sm font-medium text-gray-900">Message de départ & Avis</h4>
                                 <p className="text-sm text-gray-500 mt-1">Inviter le voyageur à laisser un avis après son séjour.</p>
                               </div>
                               <div className="flex items-center gap-3">
                                  <select 
                                    value={settings.automation.checkoutEmailDelay}
                                    onChange={e => updateSection('automation', { checkoutEmailDelay: parseInt(e.target.value) })}
                                    className="input-field py-1 h-9 text-xs w-32"
                                  >
                                    <option value={2}>2h après départ</option>
                                    <option value={24}>24h après</option>
                                    <option value={48}>48h après</option>
                                  </select>
                               </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Operations */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                       <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                         <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                           <Settings className="w-5 h-5" />
                         </div>
                         <h4 className="font-bold text-gray-900 text-lg">Opérations & Logistique</h4>
                       </div>
                       
                       <div className="divide-y divide-gray-100">
                          <div className="p-6">
                            <Toggle 
                              value={settings.automation.autoTaskCreation} 
                              onChange={v => updateSection('automation', { autoTaskCreation: v })}
                              label="Génération tâches ménage" 
                              description="Créer automatiquement une mission de nettoyage pour l'équipe après chaque check-out."
                            />
                          </div>

                          <div className="p-6">
                            <Toggle 
                              value={settings.automation.autoReview} 
                              onChange={v => updateSection('automation', { autoReview: v })}
                              label="Avis voyageurs automatiques" 
                              description="Publier automatiquement un avis 5 étoiles si aucun incident n'est ouvert 7 jours après le départ."
                            />
                            {settings.automation.autoReview && (
                              <div className="mt-4 pl-12 bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 text-sm text-amber-800">
                                <Star className="w-5 h-5 shrink-0" />
                                <p>Cette option ne s'activera que si vous n'avez signalé aucun dégat ou problème avec le voyageur via l'application.</p>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}



                {/* ─── TEAM ─── */}
                {activeTab === 'team' && (
                  <div className="space-y-8 animate-fadeIn">
                    <SectionHeader title="Gestion de l'équipe" description="Gérez les accès et les rôles de vos collaborateurs." />

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Team Members List */}
                        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">Membres Actifs</h4>
                                <p className="text-sm text-gray-500">Collaborateurs ayant accès à la plateforme.</p>
                            </div>
                            <button 
                                onClick={() => {
                                    const name = prompt('Nom du membre :');
                                    if(name) {
                                        const newMember = {
                                            id: Date.now().toString(),
                                            name,
                                            email: name.toLowerCase().replace(/\s/g, '.') + '@bnbgest.com',
                                            role: 'manager' as const,
                                            active: true
                                        };
                                        updateSection('team', { members: [...settings.team.members, newMember] });
                                    }
                                }}
                                className="btn-primary text-sm py-2 px-4 shadow-md shadow-indigo-100"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Inviter
                            </button>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {settings.team.members.map(member => (
                              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                                    {member.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {member.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {member.role}
                                  </span>
                                  <button 
                                    onClick={() => updateSection('team', { members: settings.team.members.filter(m => m.id !== member.id) })}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {settings.team.members.length === 0 && (
                                <div className="p-8 text-center text-gray-400 italic">Aucun membre dans l'équipe.</div>
                            )}
                          </div>
                        </div>

                        {/* Invite Link Card */}
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <h4 className="font-bold text-lg mb-2">Inviter l'équipe</h4>
                                <p className="text-indigo-100 text-sm mb-6">Partagez ce lien unique pour permettre à vos collaborateurs de rejoindre l'espace de travail.</p>
                                <div className="bg-white/10 p-1 rounded-lg flex items-center justify-between pl-3 pr-1 backdrop-blur-md border border-white/10">
                                    <code className="text-xs text-indigo-100 truncate flex-1">bnbgest.com/join/k8s9...</code>
                                    <button className="p-2 hover:bg-white/20 rounded-md transition-colors" title="Copier">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                <h4 className="font-bold text-gray-900 mb-4 text-sm">Rôles disponibles</h4>
                                <div className="space-y-3">
                                    <div className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 shrink-0" />
                                        <div>
                                            <span className="font-semibold block text-gray-700">Admin</span>
                                            <span className="text-gray-500 text-xs">Accès complet à tous les paramètres et données financières.</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-gray-400 shrink-0" />
                                        <div>
                                            <span className="font-semibold block text-gray-700">Staff</span>
                                            <span className="text-gray-500 text-xs">Gestion opérationnelle (ménage, check-in) uniquement.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}


                {/* ─── PRICING ─── */}
                {activeTab === 'pricing' && (
                  <div className="space-y-8">
                    <SectionHeader title="Tarification par défaut" description="Ces valeurs seront appliquées par défaut aux nouvelles propriétés." />

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid md:grid-cols-2 gap-6">
                      <InputGroup label="Taux de TVA">
                        <div className="relative">
                          <input 
                            type="number" 
                            value={settings.pricing.vatRate} 
                            onChange={e => updateSection('pricing', { vatRate: parseFloat(e.target.value) })}
                            className="input-field pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">%</span>
                        </div>
                      </InputGroup>

                      <InputGroup label="Commission Plateforme">
                         <div className="relative">
                          <input 
                            type="number" 
                            value={settings.pricing.platformCommission} 
                            onChange={e => updateSection('pricing', { platformCommission: parseFloat(e.target.value) })}
                            className="input-field pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">%</span>
                        </div>
                      </InputGroup>

                      <InputGroup label="Taxe de séjour (par pers/nuit)">
                        <div className="relative">
                          <input 
                            type="number" 
                            value={settings.pricing.touristTax} 
                            onChange={e => updateSection('pricing', { touristTax: parseFloat(e.target.value) })}
                            className="input-field pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">€</span>
                        </div>
                      </InputGroup>

                      <InputGroup label="Caution (dépôt de garantie)">
                        <div className="relative">
                          <input 
                            type="number" 
                            value={settings.pricing.securityDeposit} 
                            onChange={e => updateSection('pricing', { securityDeposit: parseFloat(e.target.value) })}
                            className="input-field pr-8"
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">€</span>
                        </div>
                      </InputGroup>
                    </div>
                  </div>
                )}
                

                {/* ─── DATA & BACKUP ─── */}
                {activeTab === 'data' && (
                  <div className="space-y-8 animate-fadeIn">
                    <SectionHeader title="Données & Confidentialité" description="Gérez l'export de vos données et la maintenance du compte." />
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Export options */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-all group">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Download className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Exporter les données</h4>
                        <p className="text-sm text-gray-500 mb-6">Téléchargez une copie complète de vos configurations, réservations et données clients.</p>
                        <div className="flex gap-3">
                          <button className="flex-1 btn-secondary text-xs py-2">
                            <FileText className="w-4 h-4 mr-2" />
                            Format JSON
                          </button>
                          <button className="flex-1 btn-secondary text-xs py-2">
                            <FileText className="w-4 h-4 mr-2" />
                            Format CSV
                          </button>
                        </div>
                      </div>

                      {/* Import options */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-all group">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-2">Importer une sauvegarde</h4>
                        <p className="text-sm text-gray-500 mb-6">Restaurez une configuration précédente à partir d'un fichier de sauvegarde.</p>
                        <button className="w-full btn-secondary text-xs py-2 border-dashed border-2">
                            <Upload className="w-4 h-4 mr-2" />
                            Sélectionner un fichier
                        </button>
                      </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-red-900 mb-1">Zone de Danger</h4>
                                <p className="text-sm text-red-700 mb-4">Ces actions sont irréversibles. Soyez prudent.</p>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-red-100">
                                        <div>
                                            <p className="font-semibold text-gray-900">Réinitialiser les paramètres</p>
                                            <p className="text-xs text-gray-500">Retour aux valeurs par défaut</p>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            if(confirm('Êtes-vous sûr de vouloir tout réinitialiser ?')) {
                                              setSettings(defaultSettings);
                                            }
                                          }}
                                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                        >
                                            Réinitialiser
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-red-100">
                                        <div>
                                            <p className="font-semibold text-gray-900">Supprimer toutes les données</p>
                                            <p className="text-xs text-gray-500">Effacer propriétés, clients et réservations</p>
                                        </div>
                                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-md shadow-red-200">
                                            Tout supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
                
                {/* ─── NOTIFICATIONS ─── */}
                {activeTab === 'notifications' && (
                  <div className="space-y-8">
                    <SectionHeader title="Préférences de Notification" description="Gérez finement vos alertes et vos périodes de silence." />
                    
                    {/* Global Channels */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        Canaux de communication
                      </h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {(Object.entries(settings.notifications.channels) as [keyof typeof settings.notifications.channels, boolean][]).map(([channel, enabled]) => (
                           <button 
                                key={channel} 
                                onClick={() => updateSection('notifications', { channels: { ...settings.notifications.channels, [channel]: !enabled } })}
                                className={`group relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                  enabled 
                                    ? 'border-[#FF385C] bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 shadow-md' 
                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                                }`}
                           >
                             <div className="flex items-center justify-between mb-3">
                               <div className={`p-2 rounded-lg transition-colors ${enabled ? 'bg-[#FF385C] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                  {channel === 'email' && <Mail className="w-5 h-5" />}
                                  {channel === 'push' && <Bell className="w-5 h-5" />}
                                  {channel === 'sms' && <Smartphone className="w-5 h-5" />}
                                  {channel === 'whatsapp' && <MessageCircle className="w-5 h-5" />}
                               </div>
                               <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${enabled ? 'bg-[#FF385C]' : 'bg-gray-200'}`}>
                                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                               </div>
                             </div>
                             <span className="block capitalize font-bold text-gray-900 mb-1">
                               {channel === 'whatsapp' ? 'WhatsApp' : channel}
                             </span>
                             <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                               {channel === 'email' && 'Pour les récapitulatifs et documents importants.'}
                               {channel === 'push' && 'Pour les activités en temps réel.'}
                               {channel === 'sms' && 'Pour les urgences critiques uniquement.'}
                               {channel === 'whatsapp' && 'Pour une communication fluide et rapide.'}
                             </p>
                           </button>
                        ))}
                      </div>
                    </div>

                    {/* Quiet Hours Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transform transition-all hover:shadow-md">
                      <div className="p-6 border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white flex md:flex-row flex-col gap-4 justify-between items-center">
                         <div className="flex items-center gap-4">
                           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100">
                             <Moon className="w-6 h-6" />
                           </div>
                           <div>
                             <h4 className="font-bold text-gray-900 text-lg">Mode "Ne pas déranger"</h4>
                             <p className="text-sm text-gray-500 mt-1">Mettre en pause les notifications non-urgentes pendant vos heures de repos.</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                           <span className={`text-sm font-medium ${settings.notifications.quietHours.enabled ? 'text-indigo-600' : 'text-gray-400'}`}>
                             {settings.notifications.quietHours.enabled ? 'Activé' : 'Désactivé'}
                           </span>
                           <Toggle 
                             value={settings.notifications.quietHours.enabled} 
                             onChange={v => updateSection('notifications', { 
                               quietHours: { ...settings.notifications.quietHours, enabled: v } 
                             })} 
                             label="" 
                           />
                         </div>
                      </div>
                      
                      {settings.notifications.quietHours.enabled && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-8 bg-white border-t border-gray-100"
                        >
                           <div className="grid md:grid-cols-3 gap-8 items-end">
                             <InputGroup label="De (Soir)">
                               <div className="relative group">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF385C]">
                                   <Moon className="w-5 h-5" />
                                 </div>
                                 <input 
                                   type="time" 
                                   value={settings.notifications.quietHours.start}
                                   onChange={e => updateSection('notifications', { quietHours: { ...settings.notifications.quietHours, start: e.target.value } })}
                                   className="input-field pl-10 h-11"
                                 />
                               </div>
                             </InputGroup>

                             <InputGroup label="À (Matin)">
                               <div className="relative group">
                                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#FF385C]">
                                   <Clock className="w-5 h-5" />
                                 </div>
                                 <input 
                                   type="time" 
                                   value={settings.notifications.quietHours.end}
                                   onChange={e => updateSection('notifications', { quietHours: { ...settings.notifications.quietHours, end: e.target.value } })}
                                   className="input-field pl-10 h-11"
                                 />
                               </div>
                             </InputGroup>

                             <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                               <div>
                                 <span className="block font-medium text-gray-900 text-sm">Mode Week-end</span>
                                 <span className="text-xs text-gray-500">Appliquer aussi le Sam/Dim</span>
                               </div>
                               <Toggle 
                                 value={settings.notifications.quietHours.weekendMode} 
                                 onChange={v => updateSection('notifications', { quietHours: { ...settings.notifications.quietHours, weekendMode: v } })}
                                 label=""
                               />
                             </div>
                           </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Granular Alerts Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                       <div className="p-6 flex items-center gap-3 border-b border-gray-100">
                         <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                           <Bell className="w-5 h-5" />
                         </div>
                         <h4 className="font-bold text-gray-900 text-lg">Alertes par catégorie</h4>
                       </div>
                       
                       <div className="overflow-x-auto">
                         <table className="w-full">
                           <thead>
                             <tr className="bg-gray-50 border-b border-gray-100">
                               <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">Type d'événement</th>
                               <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Email</th>
                               <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Push</th>
                               <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">SMS</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                             {(Object.entries(settings.notifications.alerts) as [keyof typeof settings.notifications.alerts, any][]).map(([key, config]) => (
                               <tr key={key} className="hover:bg-gray-50/50 transition-colors group">
                                 <td className="px-6 py-5">
                                   <div className="flex items-start gap-4">
                                     <div className={`p-2 rounded-lg shrink-0 ${
                                       key === 'bookings' ? 'bg-blue-50 text-blue-600' :
                                       key === 'reviews' ? 'bg-yellow-50 text-yellow-600' :
                                       key === 'maintenance' ? 'bg-red-50 text-red-600' :
                                       key === 'finance' ? 'bg-green-50 text-green-600' :
                                       key === 'marketing' ? 'bg-purple-50 text-purple-600' :
                                       'bg-gray-100 text-gray-600'
                                     }`}>
                                       {key === 'bookings' && <Calendar className="w-5 h-5" />}
                                       {key === 'reviews' && <Star className="w-5 h-5" />}
                                       {key === 'maintenance' && <Wrench className="w-5 h-5" />}
                                       {key === 'finance' && <CreditCard className="w-5 h-5" />}
                                       {key === 'marketing' && <Megaphone className="w-5 h-5" />}
                                       {key === 'system' && <Shield className="w-5 h-5" />}
                                     </div>
                                     <div>
                                       <p className="font-bold text-gray-900 capitalize text-sm mb-1">
                                         {key === 'finance' ? 'Finance & Factures' : 
                                          key === 'bookings' ? 'Réservations' :
                                          key === 'reviews' ? 'Avis & Commentaires' :
                                          key === 'marketing' ? 'Offres & Marketing' :
                                          key === 'system' ? 'Système & Sécurité' : key}
                                       </p>
                                       <p className="text-xs text-gray-500 hidden sm:block">
                                           {key === 'bookings' && 'Nouvelles réservations, annulations, modifications'}
                                           {key === 'reviews' && 'Nouveaux commentaires clients (étoiles, texte)'}
                                           {key === 'maintenance' && 'Signalements d\'incidents et suivi des travaux'}
                                           {key === 'finance' && 'Factures émises, paiements, rapports mensuels'}
                                           {key === 'marketing' && 'Nouveautés produits, offres spéciales et actus'}
                                           {key === 'system' && 'Sécurité du compte, mises à jour importantes'}
                                       </p>
                                     </div>
                                   </div>
                                 </td>
                                 {(['email', 'push', 'sms'] as const).map(channel => (
                                   <td key={channel} className="px-4 py-4 text-center">
                                     <button 
                                       onClick={() => updateSection('notifications', { 
                                         alerts: { 
                                           ...settings.notifications.alerts, 
                                           [key]: { ...config, [channel]: !config[channel] } 
                                         } 
                                       })}
                                       className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF385C] focus:ring-offset-2 ${
                                         config[channel] ? 'bg-[#FF385C]' : 'bg-gray-200'
                                       }`}
                                     >
                                       <span
                                         className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                           config[channel] ? 'translate-x-5' : 'translate-x-0'
                                         }`}
                                       />
                                     </button>
                                   </td>
                                 ))}
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <style jsx global>{`
        .input-field {
          @apply w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C] transition-all text-sm text-gray-900 placeholder-gray-400;
        }
      `}</style>
    </div>
  );
}
