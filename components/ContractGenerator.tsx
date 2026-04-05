'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useBNB, Booking, Property } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Eye, Calendar, Users, Euro, Home, 
  CheckCircle, AlertTriangle, Edit, Send, Copy, Archive, Clock,
  MapPin, Phone, Mail, Building, CreditCard, Shield, Info,
  BookOpen, FileCheck, FilePlus, Trash2, Save, X,
  Settings, Star, Award, TrendingUp, BarChart3, Filter, Search,
  Globe, Check, AlertCircle, FileSignature, Briefcase, Key,
  Zap, ChevronDown, ChevronUp, Plus, Minus
} from 'lucide-react';

// ==================== INTERFACES ====================

interface ContractConfig {
  ownerName: string;
  ownerAddress: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerSiret?: string;
  ownerLicense?: string;
  ownerTVA?: string;
  depositMethod: string;
  paymentTerms: string;
  cancellationPolicy: string;
  arrivalInstructions: string;
  departureInstructions: string;
  houseRulesCustom: string[];
  additionalClauses: string[];
  insuranceInfo?: string;
  emergencyContact?: string;
  wifiDetails?: string;
  parkingDetails?: string;
  language: 'fr' | 'en';
  includeInventory: boolean;
  includePhotos: boolean;
  includeMap: boolean;
}

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  config: Partial<ContractConfig>;
  createdAt: string;
}

interface ContractHistory {
  id: string;
  bookingId: number;
  propertyId: number;
  guestName: string;
  generatedAt: string;
  downloadCount: number;
  sentToGuest: boolean;
}

// ==================== CONSTANTES ====================

const STORAGE_KEY_CONFIG = 'bnbgest_contract_config';
const STORAGE_KEY_TEMPLATES = 'bnbgest_contract_templates';
const STORAGE_KEY_HISTORY = 'bnbgest_contract_history';

const DEFAULT_CONFIG: ContractConfig = {
  ownerName: '',
  ownerAddress: '',
  ownerPhone: '',
  ownerEmail: '',
  ownerSiret: '',
  ownerLicense: '',
  ownerTVA: '',
  depositMethod: 'Virement bancaire',
  paymentTerms: 'Acompte de 30% à la réservation, solde 30 jours avant l\'arrivée.',
  cancellationPolicy: 'Annulation gratuite jusqu\'à 30 jours avant l\'arrivée. 50% du montant facturé entre 30 et 14 jours. 100% facturé en deçà de 14 jours.',
  arrivalInstructions: '',
  departureInstructions: '',
  houseRulesCustom: [],
  additionalClauses: [],
  insuranceInfo: '',
  emergencyContact: '',
  wifiDetails: '',
  parkingDetails: '',
  language: 'fr',
  includeInventory: true,
  includePhotos: false,
  includeMap: false,
};

const DEPOSIT_METHODS = [
  'Virement bancaire',
  'Carte bancaire',
  'Chèque',
  'Espèces',
  'Empreinte bancaire',
  'Caution en ligne (Swikly, etc.)',
];

// ==================== HELPERS ====================

function loadContractConfig(): ContractConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveContractConfig(config: ContractConfig) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }
}

function loadTemplates(): ContractTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: ContractTemplate[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }
}

function loadHistory(): ContractHistory[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ContractHistory[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }
}

// ==================== COMPONENT ====================

export default function ContractGenerator() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();

  const [config, setConfig] = useState<ContractConfig>(() => loadContractConfig());
  const [templates, setTemplates] = useState<ContractTemplate[]>(() => loadTemplates());
  const [history, setHistory] = useState<ContractHistory[]>(() => loadHistory());
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'history' | 'settings'>('generate');
  
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  
  const [newClause, setNewClause] = useState('');
  const [newHouseRule, setNewHouseRule] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProperty, setFilterProperty] = useState<number | ''>('');
  
  const [expandedSections, setExpandedSections] = useState({
    owner: true,
    financial: false,
    rules: false,
    instructions: false,
    advanced: false,
  });

  React.useEffect(() => {
    saveContractConfig(config);
  }, [config]);

  React.useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  React.useEffect(() => {
    saveHistory(history);
  }, [history]);

  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;
  const propertyBookings = selectedPropertyId
    ? bookings.filter(b => b.propertyId === selectedPropertyId)
    : [];
  const selectedBooking = selectedBookingId ? bookings.find(b => b.id === selectedBookingId) : null;

  const getNights = useCallback((b: Booking): number => {
    const d1 = new Date(b.checkIn);
    const d2 = new Date(b.checkOut);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  const calculateTotals = useMemo(() => {
    if (!selectedBooking || !selectedProperty) return null;
    
    const nights = getNights(selectedBooking);
    const nightlyRate = selectedProperty.price;
    const cleaningFee = selectedProperty.cleaningFee || 0;
    const serviceFee = (nightlyRate * nights) * 0.03;
    const subtotal = nightlyRate * nights;
    const tax = subtotal * 0.055;
    const total = subtotal + cleaningFee + serviceFee + tax;
    const deposit = selectedProperty.securityDeposit || 0;

    return { nights, nightlyRate, cleaningFee, serviceFee, subtotal, tax, total, deposit };
  }, [selectedBooking, selectedProperty, getNights]);

  const stats = useMemo(() => {
    return {
      totalContracts: history.length,
      totalDownloads: history.reduce((sum, h) => sum + h.downloadCount, 0),
      sentToGuests: history.filter(h => h.sentToGuest).length,
      templatesCount: templates.length,
    };
  }, [history, templates]);

  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h =>
        h.guestName.toLowerCase().includes(query) ||
        properties.find(p => p.id === h.propertyId)?.name.toLowerCase().includes(query)
      );
    }

    if (filterProperty) {
      filtered = filtered.filter(h => h.propertyId === filterProperty);
    }

    return filtered.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [history, searchQuery, filterProperty, properties]);

  const addClause = useCallback(() => {
    if (newClause.trim()) {
      setConfig(prev => ({
        ...prev,
        additionalClauses: [...prev.additionalClauses, newClause.trim()],
      }));
      setNewClause('');
    }
  }, [newClause]);

  const removeClause = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      additionalClauses: prev.additionalClauses.filter((_, i) => i !== index),
    }));
  }, []);

  const addHouseRule = useCallback(() => {
    if (newHouseRule.trim()) {
      setConfig(prev => ({
        ...prev,
        houseRulesCustom: [...prev.houseRulesCustom, newHouseRule.trim()],
      }));
      setNewHouseRule('');
    }
  }, [newHouseRule]);

  const removeHouseRule = useCallback((index: number) => {
    setConfig(prev => ({
      ...prev,
      houseRulesCustom: prev.houseRulesCustom.filter((_, i) => i !== index),
    }));
  }, []);

  const saveAsTemplate = useCallback(() => {
    if (!newTemplateName.trim()) {
      alert('Veuillez entrer un nom pour le modèle');
      return;
    }

    const template: ContractTemplate = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: newTemplateName.trim(),
      description: newTemplateDesc.trim(),
      config: { ...config },
      createdAt: new Date().toISOString(),
    };

    setTemplates(prev => [template, ...prev]);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setShowTemplateModal(false);
  }, [newTemplateName, newTemplateDesc, config]);

  const loadTemplate = useCallback((template: ContractTemplate) => {
    setConfig(prev => ({ ...prev, ...template.config }));
    setActiveTab('generate');
  }, []);

  const deleteTemplate = useCallback((templateId: string) => {
    if (!confirm('Supprimer ce modèle ?')) return;
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  }, []);

  const addToHistory = useCallback((bookingId: number, propertyId: number, guestName: string) => {
    const entry: ContractHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bookingId,
      propertyId,
      guestName,
      generatedAt: new Date().toISOString(),
      downloadCount: 1,
      sentToGuest: false,
    };

    setHistory(prev => [entry, ...prev]);
  }, []);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const generatePDF = useCallback(async () => {
    if (!selectedBooking || !selectedProperty || !calculateTotals) {
      alert('Veuillez sélectionner une propriété et une réservation');
      return;
    }

    if (!config.ownerName || !config.ownerAddress || !config.ownerPhone || !config.ownerEmail) {
      alert('Veuillez remplir toutes les informations du propriétaire');
      return;
    }

    setGenerating(true);

    try {
      // Simuler génération PDF (remplacer par vraie implémentation jsPDF)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      addToHistory(selectedBooking.id, selectedProperty.id, selectedBooking.guestInfo.name);
      
      alert(`Contrat généré avec succès!\n\nLocataire: ${selectedBooking.guestInfo.name}\nPropriété: ${selectedProperty.name}\nTotal: ${calculateTotals.total.toFixed(2)} €`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  }, [selectedBooking, selectedProperty, calculateTotals, config, addToHistory]);

  const cardClass = isDark ? 'bg-white/[0.06] border-white/10' : 'bg-white border-gray-200 shadow-sm';
  const labelClass = isDark ? 'text-gray-300' : 'text-gray-700';
  const inputClass = isDark ? 'bg-white/5 border-white/[0.08] text-white placeholder:text-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400';
  const textClass = isDark ? 'text-white' : 'text-gray-900';
  const subtextClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const tabActiveClass = isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white';
  const tabInactiveClass = isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
        <div>
          <h2 className={`text-3xl font-bold flex items-center gap-3 ${textClass}`}>
            <FileText className="w-8 h-8 text-indigo-600" />
            Générateur de Contrats
          </h2>
          <p className={`${subtextClass} mt-2`}>Créez des contrats de location professionnels en PDF</p>
        </div>
        
        <div className="grid grid-cols-4 gap-3">
          <motion.div whileHover={{ scale: 1.05 }} className={`${cardClass} border rounded-xl p-3 text-center`}>
            <FileText className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <div className={`text-xl font-bold ${textClass}`}>{stats.totalContracts}</div>
            <div className={`text-xs ${subtextClass}`}>Contrats</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className={`${cardClass} border rounded-xl p-3 text-center`}>
            <Download className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <div className={`text-xl font-bold ${textClass}`}>{stats.totalDownloads}</div>
            <div className={`text-xs ${subtextClass}`}>Téléchargements</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className={`${cardClass} border rounded-xl p-3 text-center`}>
            <Send className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <div className={`text-xl font-bold ${textClass}`}>{stats.sentToGuests}</div>
            <div className={`text-xs ${subtextClass}`}>Envoyés</div>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className={`${cardClass} border rounded-xl p-3 text-center`}>
            <Archive className="w-5 h-5 text-orange-500 mx-auto mb-1" />
            <div className={`text-xl font-bold ${textClass}`}>{stats.templatesCount}</div>
            <div className={`text-xs ${subtextClass}`}>Modèles</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Navigation par onglets */}
      <div className="flex gap-2">
        {['generate', 'templates', 'history', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === tab ? tabActiveClass : tabInactiveClass
            }`}
          >
            {tab === 'generate' && <><FilePlus className="w-4 h-4" />Générer</>}
            {tab === 'templates' && <><Archive className="w-4 h-4" />Modèles ({templates.length})</>}
            {tab === 'history' && <><Clock className="w-4 h-4" />Historique ({history.length})</>}
            {tab === 'settings' && <><Settings className="w-4 h-4" />Paramètres</>}
          </button>
        ))}
      </div>

      {/* ONGLET GÉNÉRER */}
      {activeTab === 'generate' && (
        <div className="space-y-6">

          {/* ── Profil propriétaire — barre de complétion ── */}
          {(() => {
            const fields = [
              { key: 'ownerName',    label: 'Nom' },
              { key: 'ownerAddress', label: 'Adresse' },
              { key: 'ownerPhone',   label: 'Téléphone' },
              { key: 'ownerEmail',   label: 'Email' },
              { key: 'ownerSiret',   label: 'SIRET' },
              { key: 'ownerLicense', label: 'Licence' },
            ] as const;
            const cfg = config as unknown as Record<string, string>;
            const filled  = fields.filter(f => !!cfg[f.key]).length;
            const pct     = Math.round((filled / fields.length) * 100);
            const missing = fields.filter(f => !cfg[f.key]);
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
            const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
            return (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    📋 Profil propriétaire
                  </span>
                  <span className={`text-sm font-bold ${textColor}`}>{filled}/{fields.length} champs remplis</span>
                </div>
                <div className={`h-2 rounded-full mb-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                  <motion.div
                    className={`h-full rounded-full ${barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                {missing.length > 0 ? (
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Manquant&nbsp;: {missing.map(f => f.label).join(', ')} —{' '}
                    <button onClick={() => setActiveTab('settings')}
                      className="text-indigo-500 hover:underline font-medium">
                      Compléter dans Paramètres →
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-emerald-500 font-medium">✅ Profil complet — prêt à générer</p>
                )}
              </motion.div>
            );
          })()}

          {/* Sélection propriété/réservation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardClass} border rounded-2xl p-6`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textClass}`}>
              <Home className="w-5 h-5 text-indigo-600" />
              1. Sélection de la réservation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Propriété *</label>
                <select
                  value={selectedPropertyId || ''}
                  onChange={(e) => {
                    setSelectedPropertyId(Number(e.target.value) || null);
                    setSelectedBookingId(null);
                    setShowPreview(false);
                  }}
                  className={`w-full border rounded-xl px-4 py-3 ${inputClass} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  <option value="">Sélectionner une propriété...</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Réservation *</label>
                <select
                  value={selectedBookingId || ''}
                  onChange={(e) => {
                    setSelectedBookingId(Number(e.target.value) || null);
                    setShowPreview(false);
                  }}
                  disabled={!selectedPropertyId}
                  className={`w-full border rounded-xl px-4 py-3 ${inputClass} disabled:opacity-50`}
                >
                  <option value="">Sélectionner...</option>
                  {propertyBookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.guestInfo.name} — {new Date(b.checkIn).toLocaleDateString('fr-FR')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Récapitulatif réservation */}
            {selectedBooking && selectedProperty && calculateTotals && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-6 rounded-xl p-6 border ${isDark ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className={`text-xs font-medium ${subtextClass} mb-2`}>LOCATAIRE</div>
                    <div className={`text-lg font-bold ${textClass}`}>{selectedBooking.guestInfo.name}</div>
                    <div className={`text-sm ${subtextClass} flex items-center gap-1 mt-1`}>
                      <Mail className="w-3 h-3" />{selectedBooking.guestInfo.email}
                    </div>
                  </div>

                  <div>
                    <div className={`text-xs font-medium ${subtextClass} mb-2`}>SÉJOUR</div>
                    <div className={`text-sm ${textClass}`}>
                      {new Date(selectedBooking.checkIn).toLocaleDateString('fr-FR')} → {new Date(selectedBooking.checkOut).toLocaleDateString('fr-FR')}
                    </div>
                    <div className={`text-sm ${textClass}`}>{calculateTotals.nights} nuits · {selectedBooking.guests} pers.</div>
                  </div>

                  <div>
                    <div className={`text-xs font-medium ${subtextClass} mb-2`}>TOTAL</div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {calculateTotals.total.toFixed(2)} €
                    </div>
                    <div className={`text-xs ${subtextClass}`}>+ Caution: {calculateTotals.deposit.toFixed(2)} €</div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Configuration propriétaire */}
          {selectedBooking && selectedProperty && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${cardClass} border rounded-2xl p-6`}>
                <button
                  onClick={() => toggleSection('owner')}
                  className={`w-full flex items-center justify-between text-lg font-bold mb-4 ${textClass}`}
                >
                  <span className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    2. Informations propriétaire
                  </span>
                  {expandedSections.owner ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {expandedSections.owner && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Nom complet *</label>
                      <input
                        type="text"
                        value={config.ownerName}
                        onChange={(e) => setConfig({ ...config, ownerName: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="Jean Dupont"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Email *</label>
                      <input
                        type="email"
                        value={config.ownerEmail}
                        onChange={(e) => setConfig({ ...config, ownerEmail: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="contact@exemple.fr"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Téléphone *</label>
                      <input
                        type="tel"
                        value={config.ownerPhone}
                        onChange={(e) => setConfig({ ...config, ownerPhone: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="+33 6 XX XX XX XX"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Adresse *</label>
                      <input
                        type="text"
                        value={config.ownerAddress}
                        onChange={(e) => setConfig({ ...config, ownerAddress: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="123 Rue de la Paix, 75001 Paris"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>SIRET</label>
                      <input
                        type="text"
                        value={config.ownerSiret || ''}
                        onChange={(e) => setConfig({ ...config, ownerSiret: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="123 456 789 00012"
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Licence touristique</label>
                      <input
                        type="text"
                        value={config.ownerLicense || ''}
                        onChange={(e) => setConfig({ ...config, ownerLicense: e.target.value })}
                        className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
                        placeholder="75101234567890"
                      />
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
                    showPreview 
                      ? 'bg-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  {showPreview ? 'Masquer l\'aperçu' : 'Aperçu du contrat'}
                </button>

                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="px-6 py-3 rounded-xl font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Sauvegarder comme modèle
                </button>

                <button
                  onClick={generatePDF}
                  disabled={generating || !config.ownerName}
                  className="px-8 py-3 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {generating ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Génération...</>
                  ) : (
                    <><Download className="w-5 h-5" />Télécharger PDF</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ONGLET MODÈLES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`${cardClass} border rounded-xl p-4`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className={`font-bold ${textClass}`}>{template.name}</h4>
                    <p className={`text-sm ${subtextClass}`}>{template.description}</p>
                    <p className={`text-xs ${subtextClass} mt-1`}>
                      {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => loadTemplate(template)}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Utiliser ce modèle
                </button>
              </motion.div>
            ))}
          </div>
          {templates.length === 0 && (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className={subtextClass}>Aucun modèle enregistré</p>
            </div>
          )}
        </div>
      )}

      {/* ONGLET HISTORIQUE */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Recherche et filtres */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un contrat..."
                className={`w-full border rounded-xl pl-10 pr-4 py-3 ${inputClass}`}
              />
            </div>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value ? Number(e.target.value) : '')}
              className={`w-full border rounded-xl px-4 py-3 ${inputClass}`}
            >
              <option value="">Toutes les propriétés</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Liste */}
          {filteredHistory.map(entry => {
            const prop = properties.find(p => p.id === entry.propertyId);
            return (
              <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${cardClass} border rounded-xl p-4`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className={`font-bold ${textClass}`}>{entry.guestName}</div>
                    <div className={`text-sm ${subtextClass}`}>{prop?.name}</div>
                    <div className={`text-xs ${subtextClass}`}>{new Date(entry.generatedAt).toLocaleString('fr-FR')}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-sm ${subtextClass}`}>{entry.downloadCount} téléchargement(s)</div>
                      {entry.sentToGuest && (
                        <div className="flex items-center gap-1 text-green-500 text-sm">
                          <Check className="w-4 h-4" />Envoyé
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filteredHistory.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className={subtextClass}>Aucun historique</p>
            </div>
          )}
        </div>
      )}

      {/* ONGLET PARAMÈTRES */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${cardClass} border rounded-2xl p-6`}>
            <h3 className={`text-lg font-bold mb-4 ${textClass}`}>Langue par défaut</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setConfig({ ...config, language: 'fr' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  config.language === 'fr' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                🇫🇷 Français
              </button>
              <button
                onClick={() => setConfig({ ...config, language: 'en' })}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  config.language === 'en' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${cardClass} border rounded-2xl p-6`}>
            <h3 className={`text-lg font-bold mb-4 ${textClass}`}>Options d'inclusion</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeInventory}
                  onChange={(e) => setConfig({ ...config, includeInventory: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <span className={textClass}>Inclure l'inventaire</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includePhotos}
                  onChange={(e) => setConfig({ ...config, includePhotos: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <span className={textClass}>Inclure des photos</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeMap}
                  onChange={(e) => setConfig({ ...config, includeMap: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded"
                />
                <span className={textClass}>Inclure une carte</span>
              </label>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Sauvegarder modèle */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTemplateModal(false)} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className={`${cardClass} border rounded-2xl p-6 max-w-md w-full`}>
              <h3 className={`text-xl font-bold mb-4 ${textClass}`}>Sauvegarder comme modèle</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Nom du modèle</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Ex: Contrat Standard"
                    className={`w-full border rounded-lg px-3 py-2 ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${labelClass}`}>Description</label>
                  <textarea
                    value={newTemplateDesc}
                    onChange={(e) => setNewTemplateDesc(e.target.value)}
                    placeholder="Brève description..."
                    rows={3}
                    className={`w-full border rounded-lg px-3 py-2 resize-none ${inputClass}`}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Annuler</button>
                  <button onClick={saveAsTemplate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Sauvegarder</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
