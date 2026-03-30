'use client';

import { useState, useEffect } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link, Copy, Check, X, Plus, ExternalLink, Eye, Trash2,
  Calendar, Home, User, Wifi, Key, Phone, FileText, Clock,
  Shield, Share2, QrCode, Mail
} from 'lucide-react';

interface ShareLink {
  id: string;
  bookingId: number;
  propertyId: number;
  token: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  viewCount: number;
  lastViewed?: string;
  includes: {
    instructions: boolean;
    qrCode: boolean;
    guide: boolean;
    wifiInfo: boolean;
    houseRules: boolean;
    checkInDetails: boolean;
    emergencyContacts: boolean;
  };
  guestName: string;
  customMessage?: string;
}

function loadLinks(): ShareLink[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('bnbgest_share_links');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveLinks(links: ShareLink[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bnbgest_share_links', JSON.stringify(links));
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default function ClientShareLink() {
  const { properties, bookings, guests } = useBNB();
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const [links, setLinks] = useState<ShareLink[]>(() => loadLinks());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreview, setShowPreview] = useState<ShareLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { saveLinks(links); }, [links]);

  // Create form
  const [newLink, setNewLink] = useState({
    bookingId: '',
    expiresIn: '7', // days
    customMessage: '',
    includes: {
      instructions: true,
      qrCode: true,
      guide: true,
      wifiInfo: true,
      houseRules: true,
      checkInDetails: true,
      emergencyContacts: true,
    }
  });

  const handleCreateLink = () => {
    if (!newLink.bookingId) return;
    const booking = bookings.find(b => b.id === Number(newLink.bookingId));
    if (!booking) return;

    const token = generateToken();
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://bnbgest.app';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(newLink.expiresIn));

    const link: ShareLink = {
      id: `sl_${Date.now()}`,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      token,
      url: `${baseUrl}/client/share/${token}`,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      viewCount: 0,
      includes: newLink.includes,
      guestName: booking.guestInfo?.name || 'Client',
      customMessage: newLink.customMessage || undefined,
    };

    setLinks([link, ...links]);
    setShowCreateModal(false);
    setNewLink({
      bookingId: '', expiresIn: '7', customMessage: '',
      includes: { instructions: true, qrCode: true, guide: true, wifiInfo: true, houseRules: true, checkInDetails: true, emergencyContacts: true }
    });
  };

  const handleCopyLink = async (link: ShareLink) => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link.url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleActive = (linkId: string) => {
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, isActive: !l.isActive } : l));
  };

  const handleDeleteLink = (linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
  };

  const isExpired = (link: ShareLink) => new Date(link.expiresAt) < new Date();

  const toggleInclude = (key: keyof typeof newLink.includes) => {
    setNewLink(prev => ({
      ...prev,
      includes: { ...prev.includes, [key]: !prev.includes[key] }
    }));
  };

  const cardClass = `border rounded-xl p-6 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-white border-[#ebebeb] shadow-sm'}`;
  const inputClass = `w-full border rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-600 [&>option]:bg-[#222244]' : 'bg-[#f7f7f7] border-[#dddddd] text-[#222222] placeholder:text-[#b0b0b0] [&>option]:bg-white'}`;
  const labelClass = `block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#222222]'}`;

  const includeOptions = [
    { key: 'instructions' as const, label: t('shareLink.instructions'), icon: <FileText className="w-4 h-4" /> },
    { key: 'qrCode' as const, label: t('shareLink.qrCode'), icon: <QrCode className="w-4 h-4" /> },
    { key: 'guide' as const, label: t('shareLink.guide'), icon: <FileText className="w-4 h-4" /> },
    { key: 'wifiInfo' as const, label: t('shareLink.wifiInfo'), icon: <Wifi className="w-4 h-4" /> },
    { key: 'houseRules' as const, label: t('shareLink.houseRules'), icon: <Shield className="w-4 h-4" /> },
    { key: 'checkInDetails' as const, label: t('shareLink.checkInDetails'), icon: <Key className="w-4 h-4" /> },
    { key: 'emergencyContacts' as const, label: t('shareLink.emergencyContacts'), icon: <Phone className="w-4 h-4" /> },
  ];

  return (
    <div className={cardClass}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
            {t('shareLink.title')}
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
            {links.length} liens - {links.filter(l => l.isActive && !isExpired(l)).length} actifs
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('shareLink.generate')}
        </Button>
      </div>

      {/* Links List */}
      {links.length === 0 ? (
        <div className={`text-center py-16 rounded-xl ${isDark ? 'bg-white/[0.02]' : 'bg-[#f7f7f7]'}`}>
          <Share2 className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`text-lg font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{t('common.noData')}</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-600' : 'text-[#b0b0b0]'}`}>Generez un lien de partage pour vos clients</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => {
            const booking = bookings.find(b => b.id === link.bookingId);
            const prop = properties.find(p => p.id === link.propertyId);
            const expired = isExpired(link);
            const active = link.isActive && !expired;

            return (
              <div
                key={link.id}
                className={`border rounded-xl p-4 transition-all ${
                  isDark
                    ? `bg-white/[0.02] border-white/[0.06] ${active ? 'hover:bg-white/[0.04]' : 'opacity-60'}`
                    : `bg-[#f7f7f7] border-[#ebebeb] ${active ? 'hover:shadow-sm' : 'opacity-60'}`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                        {link.guestName}
                      </span>
                      {active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                          {t('shareLink.active')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
                          {expired ? t('shareLink.expired') : 'Desactive'}
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
                      <span className="flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        {prop?.name || `#${link.propertyId}`}
                      </span>
                      {booking && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(booking.checkIn).toLocaleDateString('fr-FR')} - {new Date(booking.checkOut).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {link.viewCount} vues
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expire {new Date(link.expiresAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    {/* URL */}
                    <div className={`mt-2 flex items-center gap-2 p-2 rounded-lg text-xs font-mono truncate ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                      <Link className="w-3 h-3 shrink-0 text-[#FF385C]" />
                      <span className={`truncate ${isDark ? 'text-gray-400' : 'text-[#717171]'}`}>{link.url}</span>
                    </div>

                    {/* Included content tags */}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {Object.entries(link.includes).filter(([, v]) => v).map(([key]) => (
                        <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-white/[0.06] text-gray-400' : 'bg-[#f7f7f7] text-[#717171] border border-[#ebebeb]'}`}>
                          {t(`shareLink.${key}`)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => handleCopyLink(link)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-100 text-[#717171]'}`}
                      title={t('shareLink.copy')}
                    >
                      {copiedId === link.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setShowPreview(link)}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-100 text-[#717171]'}`}
                      title="Apercu"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(link.id)}
                      className={`p-2 rounded-lg transition-colors ${active ? 'text-emerald-400 hover:text-red-400' : 'text-red-400 hover:text-emerald-400'} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className={`p-2 rounded-lg transition-colors text-red-400 hover:text-red-300 ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-gray-100'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <Modal isOpen={true} onClose={() => setShowCreateModal(false)}>
          <div className={`backdrop-blur-xl border rounded-xl p-6 w-full max-w-lg ${isDark ? 'bg-[#222244] border-white/[0.06]' : 'bg-white border-[#ebebeb] shadow-[0_2px_16px_rgba(0,0,0,0.12)]'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.generate')}</h3>
              <button onClick={() => setShowCreateModal(false)} className={isDark ? 'text-[#717171] hover:text-white' : 'text-[#b0b0b0] hover:text-[#222222]'}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>{t('tab.bookings')}</label>
                <select value={newLink.bookingId} onChange={(e) => setNewLink({...newLink, bookingId: e.target.value})} className={inputClass}>
                  <option value="">Selectionner une reservation</option>
                  {bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').map(b => {
                    const prop = properties.find(p => p.id === b.propertyId);
                    return (
                      <option key={b.id} value={b.id}>
                        {b.guestInfo?.name || 'Client'} - {prop?.name || ''} ({new Date(b.checkIn).toLocaleDateString('fr-FR')})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className={labelClass}>Validite (jours)</label>
                <select value={newLink.expiresIn} onChange={(e) => setNewLink({...newLink, expiresIn: e.target.value})} className={inputClass}>
                  <option value="3">3 jours</option>
                  <option value="7">7 jours</option>
                  <option value="14">14 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('shareLink.includes')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {includeOptions.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => toggleInclude(opt.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all ${
                        newLink.includes[opt.key]
                          ? 'bg-[#FF385C]/10 border-[#FF385C]/30 text-[#FF385C]'
                          : isDark ? 'bg-white/[0.02] border-white/[0.08] text-gray-400' : 'bg-[#f7f7f7] border-[#ebebeb] text-[#717171]'
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                      {newLink.includes[opt.key] && <Check className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Message personnalise (optionnel)</label>
                <textarea
                  value={newLink.customMessage}
                  onChange={(e) => setNewLink({...newLink, customMessage: e.target.value})}
                  className={inputClass + ' h-20 resize-none'}
                  placeholder="Bienvenue ! Voici les informations pour votre sejour..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>{t('action.cancel')}</Button>
              <Button onClick={handleCreateLink} className="flex items-center gap-2">
                <Link className="w-4 h-4" /> {t('action.generate')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <Modal isOpen={true} onClose={() => setShowPreview(null)}>
          <div className={`backdrop-blur-xl border rounded-xl p-6 w-full max-w-lg ${isDark ? 'bg-[#222244] border-white/[0.06]' : 'bg-white border-[#ebebeb] shadow-[0_2px_16px_rgba(0,0,0,0.12)]'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>Apercu du lien</h3>
              <button onClick={() => setShowPreview(null)} className={isDark ? 'text-[#717171] hover:text-white' : 'text-[#b0b0b0] hover:text-[#222222]'}><X className="w-5 h-5" /></button>
            </div>

            {/* Simulated client view */}
            <div className={`rounded-xl border p-5 ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-[#f7f7f7] border-[#ebebeb]'}`}>
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#FF385C] flex items-center justify-center mx-auto mb-2">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#222222]'}`}>
                  {properties.find(p => p.id === showPreview.propertyId)?.name || 'Propriete'}
                </h4>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>
                  Bienvenue, {showPreview.guestName} !
                </p>
              </div>

              {showPreview.customMessage && (
                <div className={`text-sm p-3 rounded-lg mb-4 ${isDark ? 'bg-white/[0.04] text-gray-300' : 'bg-white text-[#222222]'}`}>
                  {showPreview.customMessage}
                </div>
              )}

              {/* Content sections */}
              <div className="space-y-2">
                {showPreview.includes.checkInDetails && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                    <Key className="w-5 h-5 text-[#FF385C]" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.checkInDetails')}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Instructions, codes, horaires</p>
                    </div>
                  </div>
                )}
                {showPreview.includes.wifiInfo && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                    <Wifi className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.wifiInfo')}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Reseau et mot de passe</p>
                    </div>
                  </div>
                )}
                {showPreview.includes.houseRules && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.houseRules')}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Regles de la maison</p>
                    </div>
                  </div>
                )}
                {showPreview.includes.guide && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                    <FileText className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.guide')}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Guide complet du logement</p>
                    </div>
                  </div>
                )}
                {showPreview.includes.emergencyContacts && (
                  <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-white'}`}>
                    <Phone className="w-5 h-5 text-red-400" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-[#222222]'}`}>{t('shareLink.emergencyContacts')}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-[#717171]'}`}>Numeros utiles</p>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code */}
              {showPreview.includes.qrCode && (
                <div className="flex justify-center mt-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white' : 'bg-white border border-[#ebebeb]'}`}>
                    <QRCodeSVG value={showPreview.url} size={120} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowPreview(null)}>{t('action.close')}</Button>
              <Button onClick={() => handleCopyLink(showPreview)} className="flex items-center gap-2">
                {copiedId === showPreview.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedId === showPreview.id ? t('shareLink.copied') : t('shareLink.copy')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
