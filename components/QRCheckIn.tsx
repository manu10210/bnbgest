'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Download, Copy, Check, MapPin, Wifi, Key, Clock, Phone,
  Users, Calendar, Home, Printer, Share2, Eye, EyeOff, Smartphone,
  Plus, Trash2, Mail, MessageSquare, CheckCircle, AlertCircle,
  Settings, RefreshCw, History, Lock, Globe, FileText,
  Car, Shield, Zap, Save, X
} from 'lucide-react';

interface CheckInData {
  bookingId: number;
  propertyName: string;
  address: string;
  city: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  guestName: string;
  guests: number;
  wifiName?: string;
  wifiPassword?: string;
  accessCode?: string;
  parkingCode?: string;
  ownerPhone?: string;
  emergencyPhone?: string;
  specialInstructions?: string;
  houseRules?: string[];
  nearbyPlaces?: NearbyPlace[];
  checklistItems?: string[];
  language?: string;
}

interface NearbyPlace { name: string; type: string; distance: string; }
interface QRTemplate { id: string; name: string; color: string; icon: string; }
interface SavedQR { id: string; guestName: string; propertyName: string; createdAt: string; checkIn: string; checkOut: string; data: CheckInData; }

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ru', label: 'Russe' },
];

const QR_TEMPLATES: QRTemplate[] = [
  { id: 'classic', name: 'Classique', color: '#4338ca', icon: '🏠' },
  { id: 'airbnb', name: 'Airbnb', color: '#FF385C', icon: '🌟' },
  { id: 'luxury', name: 'Luxe', color: '#B8860B', icon: '✨' },
  { id: 'nature', name: 'Nature', color: '#059669', icon: '🌿' },
  { id: 'ocean', name: 'Océan', color: '#0284c7', icon: '🌊' },
];

const DEFAULT_CHECKLIST = [
  'Trouver la clé / Digicode',
  'Vérifier l\'état du logement',
  'Tester le WiFi',
  'Repérer les sorties de secours',
  'Lire les consignes de sécurité',
  'Contacter l\'hôte si besoin',
];

const NEARBY_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'supermarket', label: 'Supermarché' },
  { value: 'transport', label: 'Transport' },
  { value: 'pharmacy', label: 'Pharmacie' },
  { value: 'parking', label: 'Parking' },
  { value: 'beach', label: 'Plage' },
  { value: 'other', label: 'Autre' },
];

export default function QRCheckIn() {
  const { properties, bookings } = useBNB();
  const { isDark } = useTheme();
  const qrRef = useRef<HTMLDivElement>(null);

  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [parkingCode, setParkingCode] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('airbnb');
  const [selectedLanguage, setSelectedLanguage] = useState('fr');
  const [houseRules, setHouseRules] = useState<string[]>(['Pas de fête', 'Non fumeur', 'Animaux non admis']);
  const [newRule, setNewRule] = useState('');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [newPlace, setNewPlace] = useState<NearbyPlace>({ name: '', type: 'restaurant', distance: '' });
  const [checklistItems, setChecklistItems] = useState<string[]>(DEFAULT_CHECKLIST);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [savedQRs, setSavedQRs] = useState<SavedQR[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'access' | 'rules' | 'nearby' | 'checklist' | 'history'>('config');
  const [qrSize, setQrSize] = useState(220);
  const [includeWifi, setIncludeWifi] = useState(true);
  const [includeRules, setIncludeRules] = useState(true);
  const [includeNearby, setIncludeNearby] = useState(true);
  const [includeChecklist, setIncludeChecklist] = useState(true);

  const selectedProperty = selectedPropertyId ? properties.find(p => p.id === selectedPropertyId) : null;
  const propertyBookings = useMemo(() =>
    selectedPropertyId ? bookings.filter(b => b.propertyId === selectedPropertyId && (b.status === 'confirmed' || b.status === 'pending')) : [],
    [selectedPropertyId, bookings]
  );
  const selectedBooking = selectedBookingId ? bookings.find(b => b.id === selectedBookingId) : null;
  const currentTemplate = QR_TEMPLATES.find(t => t.id === selectedTemplate) || QR_TEMPLATES[0];

  const generateCheckInData = useCallback((): CheckInData | null => {
    if (!selectedProperty || !selectedBooking) return null;
    return {
      bookingId: selectedBooking.id,
      propertyName: selectedProperty.name,
      address: selectedProperty.address,
      city: selectedProperty.city + ', ' + selectedProperty.country,
      checkIn: selectedBooking.checkIn,
      checkOut: selectedBooking.checkOut,
      checkInTime: selectedProperty.checkInTime,
      checkOutTime: selectedProperty.checkOutTime,
      guestName: selectedBooking.guestInfo.name,
      guests: selectedBooking.guests,
      wifiName: includeWifi ? (wifiName || undefined) : undefined,
      wifiPassword: includeWifi ? (wifiPassword || undefined) : undefined,
      accessCode: accessCode || undefined,
      parkingCode: parkingCode || undefined,
      ownerPhone: ownerPhone || undefined,
      emergencyPhone: emergencyPhone || undefined,
      specialInstructions: specialInstructions || undefined,
      houseRules: includeRules ? houseRules : undefined,
      nearbyPlaces: includeNearby ? nearbyPlaces : undefined,
      checklistItems: includeChecklist ? checklistItems : undefined,
      language: selectedLanguage,
    };
  }, [selectedProperty, selectedBooking, wifiName, wifiPassword, accessCode, parkingCode, ownerPhone, emergencyPhone, specialInstructions, houseRules, nearbyPlaces, checklistItems, selectedLanguage, includeWifi, includeRules, includeNearby, includeChecklist]);

  const getQRValue = useCallback((): string => {
    const data = generateCheckInData();
    if (!data) return 'https://bnbgest.app';
    return 'https://bnbgest.app/checkin?data=' + encodeURIComponent(JSON.stringify(data));
  }, [generateCheckInData]);

  const handleGenerate = () => { if (selectedProperty && selectedBooking) setShowCode(true); };

  const handleCopyLink = async () => {
    const data = generateCheckInData();
    if (!data) return;
    const lines = [
      data.propertyName,
      data.address + ', ' + data.city,
      'Arrivee: ' + new Date(data.checkIn).toLocaleDateString('fr-FR') + ' a ' + data.checkInTime,
      'Depart: ' + new Date(data.checkOut).toLocaleDateString('fr-FR') + ' a ' + data.checkOutTime,
      data.wifiName ? 'WiFi: ' + data.wifiName : '',
      data.wifiPassword ? 'Mot de passe WiFi: ' + data.wifiPassword : '',
      data.accessCode ? 'Code acces: ' + data.accessCode : '',
      data.parkingCode ? 'Code parking: ' + data.parkingCode : '',
      data.ownerPhone ? 'Contact: ' + data.ownerPhone : '',
      data.emergencyPhone ? 'Urgences: ' + data.emergencyPhone : '',
      data.specialInstructions ? 'Notes: ' + data.specialInstructions : '',
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(lines); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { console.error('Erreur copie'); }
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const size = qrSize + 40;
    img.onload = () => {
      canvas.width = size; canvas.height = size;
      if (ctx) {
        ctx.fillStyle = 'white'; ctx.fillRect(0, 0, size, size); ctx.drawImage(img, 0, 0, size, size);
        const link = document.createElement('a');
        link.download = 'qr-checkin-' + (selectedBooking?.guestInfo.name.replace(/\s+/g, '-') || 'guest') + '.png';
        link.href = canvas.toDataURL('image/png'); link.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownloadSVG = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'qr-checkin-' + (selectedBooking?.guestInfo.name.replace(/\s+/g, '-') || 'guest') + '.svg';
    link.href = url; link.click(); URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const data = generateCheckInData();
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const svgHTML = qrRef.current?.querySelector('svg')?.outerHTML || '';
    const c = currentTemplate.color;
    win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Check-in</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b}.page{max-width:680px;margin:30px auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)}.header{background:linear-gradient(135deg,' + c + ',' + c + 'cc);color:white;padding:32px;text-align:center}.header h1{font-size:26px;font-weight:800;margin-bottom:6px}.hero{display:flex;gap:32px;align-items:center;padding:32px;border-bottom:1px solid #f1f5f9}.qr-box{background:white;padding:16px;border:2px solid ' + c + '40;border-radius:16px}.section{padding:24px 32px;border-bottom:1px solid #f1f5f9}.section h3{font-size:14px;font-weight:700;color:' + c + ';text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.info-item{background:#f8fafc;padding:12px 16px;border-radius:12px;border-left:3px solid ' + c + '}.info-label{font-size:11px;color:#64748b;text-transform:uppercase;margin-bottom:4px}.info-value{font-size:15px;font-weight:600}.tag{display:inline-flex;background:' + c + '15;color:' + c + ';padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;margin:4px}.rules-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px}.rules-list li{background:#fef9ec;padding:8px 12px;border-radius:8px;font-size:13px;color:#92400e}.checklist{list-style:none}.checklist li{padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}.checklist li::before{content:"- "}.footer{text-align:center;padding:20px;background:#f8fafc;font-size:12px;color:#94a3b8}@media print{body{background:white}.page{box-shadow:none}}</style></head><body><div class="page"><div class="header"><h1>' + data.propertyName + '</h1><p>Check-in pour ' + data.guestName + '</p></div><div class="hero"><div class="qr-box">' + svgHTML + '</div><div><h2 style="font-size:20px;font-weight:700;margin-bottom:12px">Bienvenue !</h2><span class="tag">Arrivee: ' + new Date(data.checkIn).toLocaleDateString('fr-FR') + '</span><span class="tag">Depart: ' + new Date(data.checkOut).toLocaleDateString('fr-FR') + '</span><span class="tag">' + data.guests + ' voyageur(s)</span><div style="margin-top:12px;font-size:13px;color:#64748b"><div>Check-in: ' + data.checkInTime + ' | Check-out: ' + data.checkOutTime + '</div><div>' + data.address + '</div></div></div></div><div class="section"><h3>Acces</h3><div class="info-grid">' + (data.accessCode ? '<div class="info-item"><div class="info-label">Code acces</div><div class="info-value">' + data.accessCode + '</div></div>' : '') + (data.parkingCode ? '<div class="info-item"><div class="info-label">Code parking</div><div class="info-value">' + data.parkingCode + '</div></div>' : '') + (data.wifiName ? '<div class="info-item"><div class="info-label">Reseau WiFi</div><div class="info-value">' + data.wifiName + '</div></div>' : '') + (data.wifiPassword ? '<div class="info-item"><div class="info-label">Mot de passe WiFi</div><div class="info-value">' + data.wifiPassword + '</div></div>' : '') + (data.ownerPhone ? '<div class="info-item"><div class="info-label">Hote</div><div class="info-value">' + data.ownerPhone + '</div></div>' : '') + (data.emergencyPhone ? '<div class="info-item"><div class="info-label">Urgences</div><div class="info-value">' + data.emergencyPhone + '</div></div>' : '') + '</div></div>' + (data.specialInstructions ? '<div class="section"><h3>Instructions</h3><p style="font-size:14px;color:#475569;line-height:1.6">' + data.specialInstructions + '</p></div>' : '') + (data.houseRules && data.houseRules.length > 0 ? '<div class="section"><h3>Regles</h3><ul class="rules-list">' + data.houseRules.map(r => '<li>' + r + '</li>').join('') + '</ul></div>' : '') + (data.nearbyPlaces && data.nearbyPlaces.length > 0 ? '<div class="section"><h3>A proximite</h3>' + data.nearbyPlaces.map(p => '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9"><span>' + p.name + '</span><span style="color:#94a3b8">' + p.distance + '</span></div>').join('') + '</div>' : '') + (data.checklistItems && data.checklistItems.length > 0 ? '<div class="section"><h3>Checklist</h3><ul class="checklist">' + data.checklistItems.map(item => '<li>' + item + '</li>').join('') + '</ul></div>' : '') + '<div class="footer">Genere par BNBGest - ' + new Date().toLocaleDateString('fr-FR') + ' - Bon sejour !</div></div><script>window.print();<\/script></body></html>');
    win.document.close();
  };

  const handleSendEmail = () => {
    const data = generateCheckInData();
    if (!data || !selectedBooking) return;
    const subject = encodeURIComponent('Informations de check-in - ' + data.propertyName);
    const body = encodeURIComponent(
      'Bonjour ' + data.guestName + ',\n\nVoici vos informations de check-in :\n\n' +
      'Adresse : ' + data.address + ', ' + data.city + '\n' +
      'Arrivee : ' + new Date(data.checkIn).toLocaleDateString('fr-FR') + ' a ' + data.checkInTime + '\n' +
      'Depart : ' + new Date(data.checkOut).toLocaleDateString('fr-FR') + ' a ' + data.checkOutTime + '\n\n' +
      (data.accessCode ? 'Code acces : ' + data.accessCode + '\n' : '') +
      (data.wifiPassword ? 'WiFi : ' + (data.wifiName || 'WiFi') + ' - ' + data.wifiPassword + '\n' : '') +
      (data.ownerPhone ? 'Contact : ' + data.ownerPhone + '\n' : '') +
      '\nBon sejour !\nBNBGest'
    );
    window.open('mailto:' + selectedBooking.guestInfo.email + '?subject=' + subject + '&body=' + body);
  };

  const handleShare = async () => {
    const data = generateCheckInData();
    if (!data) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Check-in - ' + data.propertyName, text: 'Informations de check-in pour ' + data.guestName, url: getQRValue() }); }
      catch { /* cancelled */ }
    } else { handleCopyLink(); }
  };

  const handleSaveQR = () => {
    const data = generateCheckInData();
    if (!data || !selectedBooking || !selectedProperty) return;
    setSavedQRs(prev => [{ id: Date.now().toString(), guestName: selectedBooking.guestInfo.name, propertyName: selectedProperty.name, createdAt: new Date().toISOString(), checkIn: selectedBooking.checkIn, checkOut: selectedBooking.checkOut, data }, ...prev]);
  };

  const handleLoadSaved = (saved: SavedQR) => {
    const prop = properties.find(p => p.name === saved.propertyName);
    if (prop) { setSelectedPropertyId(prop.id); const b = bookings.find(b => b.id === saved.data.bookingId); if (b) setSelectedBookingId(b.id); }
    setWifiName(saved.data.wifiName || ''); setWifiPassword(saved.data.wifiPassword || ''); setAccessCode(saved.data.accessCode || ''); setParkingCode(saved.data.parkingCode || '');
    setOwnerPhone(saved.data.ownerPhone || ''); setEmergencyPhone(saved.data.emergencyPhone || ''); setSpecialInstructions(saved.data.specialInstructions || '');
    if (saved.data.houseRules) setHouseRules(saved.data.houseRules);
    if (saved.data.nearbyPlaces) setNearbyPlaces(saved.data.nearbyPlaces);
    if (saved.data.checklistItems) setChecklistItems(saved.data.checklistItems);
    setSelectedLanguage(saved.data.language || 'fr'); setShowCode(true); setActiveTab('config');
  };

  const card = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-gray-200 shadow-sm';
  const lbl = isDark ? 'text-gray-300' : 'text-gray-700';
  const inp = isDark ? 'bg-white/5 border-white/[0.08] text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C]/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF385C]/20 focus:border-[#FF385C]/50';
  const txt = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-gray-400' : 'text-gray-500';
  const tabCls = (t: string) => 'px-3 py-2 text-xs font-medium rounded-xl transition-all ' + (activeTab === t ? 'bg-[#FF385C] text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.06]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className={'text-2xl font-bold flex items-center gap-2 ' + txt}><QrCode className="h-6 w-6 text-[#FF385C]" /> QR Code Check-in</h2>
          <p className={'text-sm mt-1 ' + sub}>Generez, personnalisez et partagez vos informations d&apos;arrivee</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Proprietes', value: properties.length, icon: Home, color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
          { label: 'Reservations', value: propertyBookings.length, icon: Calendar, color: 'text-green-500', bg: isDark ? 'bg-green-500/10' : 'bg-green-50' },
          { label: 'QR sauvegardes', value: savedQRs.length, icon: QrCode, color: 'text-[#FF385C]', bg: isDark ? 'bg-[#FF385C]/10' : 'bg-red-50' },
          { label: 'Lieux proches', value: nearbyPlaces.length, icon: MapPin, color: 'text-purple-500', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className={'border rounded-xl p-3 flex items-center gap-3 ' + card}>
            <div className={'p-2 rounded-lg ' + s.bg}><s.icon className={'h-4 w-4 ' + s.color} /></div>
            <div><p className={'text-xl font-bold ' + txt}>{s.value}</p><p className={'text-xs ' + sub}>{s.label}</p></div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">

          <div className={'flex flex-wrap gap-1.5 p-1.5 rounded-2xl ' + (isDark ? 'bg-white/[0.03]' : 'bg-gray-100')}>
            {([
              { key: 'config', label: 'Réservation', icon: Home },
              { key: 'access', label: 'Accès', icon: Key },
              { key: 'rules', label: 'Règles', icon: Shield },
              { key: 'nearby', label: 'Proximité', icon: MapPin },
              { key: 'checklist', label: 'Checklist', icon: CheckCircle },
              { key: 'history', label: 'Historique', icon: History },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={tabCls(tab.key)}>
                <tab.icon className="h-3.5 w-3.5 inline mr-1" />{tab.label}
                {tab.key === 'history' && savedQRs.length > 0 && <span className="ml-1 bg-white/30 text-xs px-1.5 py-0.5 rounded-full">{savedQRs.length}</span>}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'config' && (
              <motion.div key="config" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><Home className="h-4 w-4 text-[#FF385C]" />Sélection propriété et réservation</h3>
                <div>
                  <label className={'block text-sm font-medium mb-1.5 ' + lbl}>Propriété</label>
                  <select value={selectedPropertyId || ''} onChange={(e) => { setSelectedPropertyId(Number(e.target.value)); setSelectedBookingId(null); setShowCode(false); }} className={'w-full border rounded-xl px-3 py-2.5 ' + inp}>
                    <option value="">Sélectionner une propriété</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name} - {p.city}</option>)}
                  </select>
                </div>
                <div>
                  <label className={'block text-sm font-medium mb-1.5 ' + lbl}>Reservation</label>
                  <select value={selectedBookingId || ''} onChange={(e) => { setSelectedBookingId(Number(e.target.value)); setShowCode(false); }} disabled={!selectedPropertyId} className={'w-full border rounded-xl px-3 py-2.5 disabled:opacity-50 ' + inp}>
                    <option value="">Sélectionner une réservation</option>
                    {propertyBookings.map(b => <option key={b.id} value={b.id}>{b.guestInfo.name} - {new Date(b.checkIn).toLocaleDateString('fr-FR')} au {new Date(b.checkOut).toLocaleDateString('fr-FR')}</option>)}
                  </select>
                  {selectedPropertyId && propertyBookings.length === 0 && <p className={'text-xs mt-1.5 flex items-center gap-1 ' + (isDark ? 'text-amber-400' : 'text-amber-600')}><AlertCircle className="h-3.5 w-3.5" />Aucune réservation confirmée.</p>}
                </div>
                {selectedBooking && selectedProperty && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={'rounded-xl p-4 space-y-2 border ' + (isDark ? 'bg-[#FF385C]/5 border-[#FF385C]/20' : 'bg-red-50 border-red-100')}>
                    <p className={'text-xs font-semibold uppercase tracking-wide ' + (isDark ? 'text-[#FF385C]' : 'text-red-500')}>Réservation sélectionnée</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className={sub}>Voyageur</span><p className={'font-medium ' + txt}>{selectedBooking.guestInfo.name}</p></div>
                      <div><span className={sub}>Personnes</span><p className={'font-medium ' + txt}>{selectedBooking.guests}</p></div>
                      <div><span className={sub}>Arrivée</span><p className={'font-medium ' + txt}>{new Date(selectedBooking.checkIn).toLocaleDateString('fr-FR')} a {selectedProperty.checkInTime}</p></div>
                      <div><span className={sub}>Départ</span><p className={'font-medium ' + txt}>{new Date(selectedBooking.checkOut).toLocaleDateString('fr-FR')} a {selectedProperty.checkOutTime}</p></div>
                      <div className="col-span-2"><span className={sub}>Email</span><p className={'font-medium text-xs truncate ' + txt}>{selectedBooking.guestInfo.email}</p></div>
                    </div>
                  </motion.div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={'block text-sm font-medium mb-1.5 ' + lbl}><Settings className="inline h-3.5 w-3.5 mr-1" />Theme QR</label>
                    <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className={'w-full border rounded-xl px-3 py-2.5 text-sm ' + inp}>
                      {QR_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={'block text-sm font-medium mb-1.5 ' + lbl}><Globe className="inline h-3.5 w-3.5 mr-1" />Langue</label>
                    <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={'w-full border rounded-xl px-3 py-2.5 text-sm ' + inp}>
                      {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={'flex justify-between text-sm font-medium mb-1.5 ' + lbl}><span><Zap className="inline h-3.5 w-3.5 mr-1" />Taille QR</span><span className="text-[#FF385C] font-bold">{qrSize}px</span></label>
                  <input type="range" min={150} max={350} step={10} value={qrSize} onChange={(e) => setQrSize(Number(e.target.value))} className="w-full accent-[#FF385C]" />
                </div>
                <div className={'rounded-xl p-3 space-y-2.5 ' + (isDark ? 'bg-white/[0.03]' : 'bg-gray-50')}>
                  <p className={'text-xs font-semibold uppercase tracking-wide ' + sub}>Inclure dans le QR</p>
                  {[
                    { label: 'WiFi', state: includeWifi, set: setIncludeWifi, icon: Wifi },
                    { label: 'Règles', state: includeRules, set: setIncludeRules, icon: Shield },
                    { label: 'Lieux proches', state: includeNearby, set: setIncludeNearby, icon: MapPin },
                    { label: 'Checklist', state: includeChecklist, set: setIncludeChecklist, icon: CheckCircle },
                  ].map((t, i) => (
                    <label key={i} className="flex items-center justify-between cursor-pointer">
                      <span className={'flex items-center gap-2 text-sm ' + lbl}><t.icon className="h-3.5 w-3.5" />{t.label}</span>
                      <div onClick={() => t.set(!t.state)} className={'relative w-10 h-5 rounded-full transition-colors cursor-pointer ' + (t.state ? 'bg-[#FF385C]' : isDark ? 'bg-white/20' : 'bg-gray-300')}>
                        <div className={'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ' + (t.state ? 'translate-x-5' : 'translate-x-0.5')} />
                      </div>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'access' && (
              <motion.div key="access" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><Key className="h-4 w-4 text-amber-500" />Informations d&apos;acces</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className={'block text-sm font-medium mb-1.5 ' + lbl}><Wifi className="inline h-3.5 w-3.5 mr-1" />Nom WiFi</label><input type="text" value={wifiName} onChange={(e) => setWifiName(e.target.value)} placeholder="Nom_reseau" className={'w-full border rounded-xl px-3 py-2.5 ' + inp} /></div>
                  <div>
                    <label className={'block text-sm font-medium mb-1.5 ' + lbl}><Lock className="inline h-3.5 w-3.5 mr-1" />Mot de passe WiFi</label>
                    <div className="relative"><input type={showWifiPassword ? 'text' : 'password'} value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="motdepasse" className={'w-full border rounded-xl px-3 py-2.5 pr-10 ' + inp} /><button onClick={() => setShowWifiPassword(!showWifiPassword)} className={'absolute right-3 top-1/2 -translate-y-1/2 ' + sub}>{showWifiPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  <div>
                    <label className={'block text-sm font-medium mb-1.5 ' + lbl}><Key className="inline h-3.5 w-3.5 mr-1" />Code accès / digicode</label>
                    <div className="relative"><input type={showAccessCode ? 'text' : 'password'} value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="1234" className={'w-full border rounded-xl px-3 py-2.5 pr-10 ' + inp} /><button onClick={() => setShowAccessCode(!showAccessCode)} className={'absolute right-3 top-1/2 -translate-y-1/2 ' + sub}>{showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  <div><label className={'block text-sm font-medium mb-1.5 ' + lbl}><Car className="inline h-3.5 w-3.5 mr-1" />Code parking</label><input type="text" value={parkingCode} onChange={(e) => setParkingCode(e.target.value)} placeholder="P-5678" className={'w-full border rounded-xl px-3 py-2.5 ' + inp} /></div>
                  <div><label className={'block text-sm font-medium mb-1.5 ' + lbl}><Phone className="inline h-3.5 w-3.5 mr-1" />Tél. hôte</label><input type="tel" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className={'w-full border rounded-xl px-3 py-2.5 ' + inp} /></div>
                  <div><label className={'block text-sm font-medium mb-1.5 ' + lbl}><AlertCircle className="inline h-3.5 w-3.5 mr-1 text-red-500" />Tél. urgences</label><input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+33 1 23 45 67 89" className={'w-full border rounded-xl px-3 py-2.5 ' + inp} /></div>
                </div>
                <div><label className={'block text-sm font-medium mb-1.5 ' + lbl}><MessageSquare className="inline h-3.5 w-3.5 mr-1" />Instructions spéciales</label><textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder="La clé est dans la boîte aux lettres..." rows={4} className={'w-full border rounded-xl px-3 py-2.5 resize-none ' + inp} /></div>
              </motion.div>
            )}

            {activeTab === 'rules' && (
              <motion.div key="rules" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><Shield className="h-4 w-4 text-orange-500" />Règles de la maison</h3>
                <div className="flex gap-2">
                  <input type="text" value={newRule} onChange={(e) => setNewRule(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newRule.trim()) { setHouseRules(prev => [...prev, newRule.trim()]); setNewRule(''); } }} placeholder="Ajouter une règle..." className={'flex-1 border rounded-xl px-3 py-2.5 ' + inp} />
                  <button onClick={() => { if (newRule.trim()) { setHouseRules(prev => [...prev, newRule.trim()]); setNewRule(''); } }} className="px-4 py-2.5 bg-[#FF385C] text-white rounded-xl hover:bg-[#E31C5F] transition-colors"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {houseRules.map((rule, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={'flex items-center justify-between p-3 rounded-xl border ' + (isDark ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-100')}>
                        <span className={'text-sm flex items-center gap-2 ' + (isDark ? 'text-orange-300' : 'text-orange-700')}><Shield className="h-3.5 w-3.5" />{rule}</span>
                        <button onClick={() => setHouseRules(prev => prev.filter((_, idx) => idx !== i))} className={'p-1 rounded-lg transition-colors ' + (isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500')}><X className="h-3.5 w-3.5" /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {houseRules.length === 0 && <p className={'text-sm text-center py-4 ' + sub}>Aucune règle ajoutée</p>}
                </div>
                <div>
                  <p className={'text-xs font-medium mb-2 ' + sub}>Règles rapides :</p>
                  <div className="flex flex-wrap gap-2">
                    {['Pas de fête', 'Non fumeur', 'Animaux non admis', 'Animaux admis', 'Pas de bruit après 22h', 'Pas de visiteurs'].map(r => (
                      <button key={r} onClick={() => !houseRules.includes(r) && setHouseRules(prev => [...prev, r])} disabled={houseRules.includes(r)} className={'px-3 py-1.5 text-xs rounded-xl border transition-all ' + (houseRules.includes(r) ? 'opacity-40 cursor-not-allowed' : isDark ? 'border-white/10 text-gray-300 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>+ {r}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'nearby' && (
              <motion.div key="nearby" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><MapPin className="h-4 w-4 text-purple-500" />Lieux à proximité</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" value={newPlace.name} onChange={(e) => setNewPlace(p => ({ ...p, name: e.target.value }))} placeholder="Nom du lieu" className={'border rounded-xl px-3 py-2.5 text-sm ' + inp} />
                  <select value={newPlace.type} onChange={(e) => setNewPlace(p => ({ ...p, type: e.target.value }))} className={'border rounded-xl px-3 py-2.5 text-sm ' + inp}>{NEARBY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                  <div className="flex gap-2">
                    <input type="text" value={newPlace.distance} onChange={(e) => setNewPlace(p => ({ ...p, distance: e.target.value }))} placeholder="200m / 5min" className={'flex-1 border rounded-xl px-3 py-2.5 text-sm ' + inp} />
                    <button onClick={() => { if (newPlace.name.trim()) { setNearbyPlaces(prev => [...prev, newPlace]); setNewPlace({ name: '', type: 'restaurant', distance: '' }); } }} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {nearbyPlaces.map((place, i) => {
                      const typeInfo = NEARBY_TYPES.find(t => t.value === place.type);
                      return (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={'flex items-center justify-between p-3 rounded-xl border ' + (isDark ? 'bg-purple-500/5 border-purple-500/10' : 'bg-purple-50 border-purple-100')}>
                          <div className="flex items-center gap-3">
                            <span>{typeInfo?.label.split(' ')[0] || '📍'}</span>
                            <div><p className={'text-sm font-medium ' + txt}>{place.name}</p><p className={'text-xs ' + sub}>{place.distance}</p></div>
                          </div>
                          <button onClick={() => setNearbyPlaces(prev => prev.filter((_, idx) => idx !== i))} className={'p-1 rounded-lg transition-colors ' + (isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500')}><X className="h-3.5 w-3.5" /></button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {nearbyPlaces.length === 0 && <p className={'text-sm text-center py-4 ' + sub}>Aucun lieu ajouté</p>}
                </div>
              </motion.div>
            )}

            {activeTab === 'checklist' && (
              <motion.div key="checklist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><CheckCircle className="h-4 w-4 text-green-500" />Checklist d&apos;arrivee</h3>
                <div className="flex gap-2">
                  <input type="text" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newChecklistItem.trim()) { setChecklistItems(prev => [...prev, newChecklistItem.trim()]); setNewChecklistItem(''); } }} placeholder="Ajouter une étape..." className={'flex-1 border rounded-xl px-3 py-2.5 ' + inp} />
                  <button onClick={() => { if (newChecklistItem.trim()) { setChecklistItems(prev => [...prev, newChecklistItem.trim()]); setNewChecklistItem(''); } }} className="px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {checklistItems.map((item, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={'flex items-center gap-3 p-3 rounded-xl border ' + (isDark ? 'bg-green-500/5 border-green-500/10' : 'bg-green-50 border-green-100')}>
                        <CheckCircle className={'h-4 w-4 flex-shrink-0 ' + (isDark ? 'text-green-400' : 'text-green-500')} />
                        <span className={'flex-1 text-sm ' + (isDark ? 'text-green-300' : 'text-green-700')}>{item}</span>
                        <button onClick={() => setChecklistItems(prev => prev.filter((_, idx) => idx !== i))} className={'p-1 rounded-lg transition-colors ' + (isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-red-500')}><X className="h-3.5 w-3.5" /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {checklistItems.length === 0 && <p className={'text-sm text-center py-4 ' + sub}>Aucune étape ajoutée</p>}
                </div>
                <button onClick={() => setChecklistItems(DEFAULT_CHECKLIST)} className={'text-sm flex items-center gap-1.5 transition-colors ' + (isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700')}><RefreshCw className="h-3.5 w-3.5" />Réinitialiser</button>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={'border rounded-2xl p-5 space-y-4 ' + card}>
                <h3 className={'font-semibold flex items-center gap-2 ' + txt}><History className="h-4 w-4 text-blue-500" />QR Codes sauvegardés</h3>
                {savedQRs.length === 0 ? (
                  <div className={'text-center py-10 rounded-xl border-2 border-dashed ' + (isDark ? 'border-white/10' : 'border-gray-200')}>
                    <History className={'h-10 w-10 mx-auto mb-3 ' + (isDark ? 'text-gray-600' : 'text-gray-300')} />
                    <p className={'text-sm ' + sub}>Aucun QR sauvegardé</p>
                    <p className={'text-xs mt-1 ' + (isDark ? 'text-gray-600' : 'text-gray-400')}>Sauvegardez depuis le panneau de droite</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedQRs.map((saved) => (
                      <div key={saved.id} className={'p-4 rounded-xl border flex items-center justify-between gap-4 ' + (isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100')}>
                        <div className="min-w-0">
                          <p className={'font-medium text-sm truncate ' + txt}>{saved.guestName}</p>
                          <p className={'text-xs ' + sub}>{saved.propertyName}</p>
                          <p className={'text-xs ' + sub}>{new Date(saved.checkIn).toLocaleDateString('fr-FR')} - {new Date(saved.checkOut).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleLoadSaved(saved)} className="px-3 py-1.5 bg-[#FF385C] text-white rounded-lg text-xs hover:bg-[#E31C5F] transition-colors">Charger</button>
                          <button onClick={() => setSavedQRs(prev => prev.filter(s => s.id !== saved.id))} className={'p-1.5 rounded-lg transition-colors ' + (isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500')}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={handleGenerate} disabled={!selectedProperty || !selectedBooking} className="w-full py-3.5 px-6 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white font-semibold rounded-2xl hover:from-[#E31C5F] hover:to-[#C8184F] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />Generer le QR Code
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className={'border rounded-2xl overflow-hidden ' + card}>
            <div className={'px-6 py-4 border-b flex items-center justify-between ' + (isDark ? 'border-white/[0.06]' : 'border-gray-100')}>
              <h3 className={'font-semibold flex items-center gap-2 ' + txt}><Smartphone className="h-4 w-4 text-[#FF385C]" />Apercu QR Code</h3>
              {showCode && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /><span className={'text-xs ' + (isDark ? 'text-green-400' : 'text-green-600')}>Prêt</span></div>}
            </div>
            <div className="p-6">
              {showCode && selectedBooking && selectedProperty ? (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-5">
                  <div className="flex flex-col items-center">
                    <div className={'w-full rounded-2xl p-5 text-center ' + (isDark ? 'bg-gradient-to-br from-white/5 to-white/[0.02]' : 'bg-gradient-to-br from-gray-50 to-white')} style={{ border: '1px solid ' + currentTemplate.color + '30' }}>
                      <div className="flex items-center justify-center gap-2 mb-4"><span className="text-xl">{currentTemplate.icon}</span><span className={'font-bold text-sm ' + txt}>{selectedProperty.name}</span></div>
                      <div ref={qrRef} className="inline-flex p-4 bg-white rounded-2xl shadow-md mb-3" style={{ border: '2px solid ' + currentTemplate.color + '30' }}>
                        <QRCodeSVG value={getQRValue()} size={qrSize} level="M" includeMargin={false} fgColor={currentTemplate.color} bgColor="#ffffff" />
                      </div>
                      <p className={'text-xs ' + sub}>Scannez pour accéder aux infos de check-in</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Users, text: selectedBooking.guests + ' voyageur(s)' },
                      { icon: Calendar, text: new Date(selectedBooking.checkIn).toLocaleDateString('fr-FR') + ' → ' + new Date(selectedBooking.checkOut).toLocaleDateString('fr-FR') },
                      { icon: Clock, text: selectedProperty.checkInTime + ' / ' + selectedProperty.checkOutTime },
                    ].map((pill, i) => <span key={i} className={'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl ' + (isDark ? 'bg-white/[0.06] text-gray-300' : 'bg-gray-100 text-gray-600')}><pill.icon className="h-3 w-3" />{pill.text}</span>)}
                  </div>
                  <div className={'rounded-xl p-4 space-y-2 ' + (isDark ? 'bg-white/[0.04]' : 'bg-gray-50')}>
                    <p className={'text-xs font-semibold uppercase tracking-wide mb-3 ' + sub}>Informations incluses</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: MapPin, label: selectedProperty.address, active: true },
                        { icon: Wifi, label: wifiPassword ? 'WiFi configuré' : 'WiFi non défini', active: !!wifiPassword },
                        { icon: Key, label: accessCode ? 'Code accès' : 'Code non défini', active: !!accessCode },
                        { icon: Car, label: parkingCode ? 'Parking configuré' : 'Parking non défini', active: !!parkingCode },
                        { icon: Shield, label: houseRules.length + ' règle(s)', active: houseRules.length > 0 && includeRules },
                        { icon: CheckCircle, label: checklistItems.length + ' étape(s)', active: checklistItems.length > 0 && includeChecklist },
                      ].map((item, i) => <div key={i} className={'flex items-center gap-2 text-xs ' + (item.active ? (isDark ? 'text-green-400' : 'text-green-600') : sub)}><item.icon className="h-3 w-3 flex-shrink-0" /><span className="truncate">{item.label}</span></div>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'PNG', icon: Download, action: handleDownloadQR },
                      { label: 'SVG', icon: FileText, action: handleDownloadSVG },
                      { label: copied ? 'Copie !' : 'Copier', icon: copied ? Check : Copy, action: handleCopyLink },
                      { label: 'Imprimer', icon: Printer, action: handlePrint },
                      { label: 'Email', icon: Mail, action: handleSendEmail },
                      { label: 'Partager', icon: Share2, action: handleShare },
                    ].map((btn, i) => (
                      <button key={i} onClick={btn.action} className={'flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ' + (isDark ? 'border-white/10 text-gray-300 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-700 hover:bg-gray-50')}>
                        <btn.icon className="h-4 w-4" />{btn.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleSaveQR} className={'w-full py-2.5 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ' + (isDark ? 'border-white/10 text-gray-300 hover:bg-white/[0.06]' : 'border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600')}>
                    <Save className="h-4 w-4" />Sauvegarder ce QR Code
                  </button>
                </motion.div>
              ) : (
                <div className={'text-center py-20 rounded-2xl border-2 border-dashed ' + (isDark ? 'border-white/10' : 'border-gray-200')}>
                  <QrCode className={'h-20 w-20 mx-auto mb-6 ' + (isDark ? 'text-[#FF385C]/20' : 'text-gray-200')} />
                  <p className={'text-base font-medium ' + sub}>Prêt à générer votre QR Code</p>
                  <p className={'text-sm mt-2 max-w-52 mx-auto ' + (isDark ? 'text-gray-600' : 'text-gray-400')}>Sélectionnez une propriété et une réservation dans l&apos;onglet Réservation</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-5">
                    {['Propriété', 'Dates', 'Accès', 'WiFi', 'Checklist'].map((step, i) => <span key={i} className={'text-xs px-3 py-1.5 rounded-xl ' + (isDark ? 'bg-white/[0.04] text-gray-500' : 'bg-gray-100 text-gray-500')}>{step}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
