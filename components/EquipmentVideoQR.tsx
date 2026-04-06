'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '../contexts/ThemeContext';
import { useBNB } from '../contexts/BNBContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Video, Plus, Trash2, Download, Eye, Copy, Check, Search, Globe,
  Tv, Coffee, WashingMachine, Play,
  AirVent, Lock, Flame, Droplets, Refrigerator, Printer, Upload,
  QrCode, ExternalLink, Edit, Save, X, Star, Clock,
  Smartphone, Share2, Mail, Grid,
  List, TrendingUp, BookOpen, AlertCircle, Info,
  Settings, Home, Package, Sun, Lightbulb,
  Speaker, Camera, PlayCircle, CheckCircle
} from 'lucide-react';

interface EquipmentGuide {
  id: string;
  propertyId: number;
  equipmentName: string;
  category: EquipmentCategory;
  videoUrl: string;
  description: string;
  brand?: string;
  model?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  maintenanceNotes?: string;
  quickTips?: string[];
  languages?: string[];
  thumbnailUrl?: string;
  duration?: string;
  difficulty?: 'facile' | 'moyen' | 'difficile';
  views?: number;
  rating?: number;
  ratingCount?: number;
  tags?: string[];
  lastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

type EquipmentCategory =
  | 'chauffage' | 'climatisation' | 'electromenager' | 'multimedia'
  | 'securite' | 'salle_de_bain' | 'cuisine' | 'buanderie'
  | 'exterieur' | 'eclairage' | 'audio' | 'autre';

interface UploadedVideo {
  id: string;
  title: string;
  originalName: string;
  filePath: string;
  category: string;
  size: number;
  timestamp: string;
  uploadedFrom?: string;
  propertyId?: number;
  duration?: number;
  [key: string]: unknown;
}

const CATEGORY_CONFIG: Record<EquipmentCategory, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  chauffage: { label: 'Chauffage', icon: Flame, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  climatisation: { label: 'Climatisation', icon: AirVent, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
  electromenager: { label: 'Électroménager', icon: Refrigerator, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
  multimedia: { label: 'Multimédia / TV', icon: Tv, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
  securite: { label: 'Sécurité / Accès', icon: Lock, color: 'text-red-400', bgColor: 'bg-red-400/10' },
  salle_de_bain: { label: 'Salle de bain', icon: Droplets, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
  cuisine: { label: 'Cuisine', icon: Coffee, color: 'text-amber-400', bgColor: 'bg-amber-400/10' },
  buanderie: { label: 'Buanderie', icon: WashingMachine, color: 'text-indigo-400', bgColor: 'bg-indigo-400/10' },
  exterieur: { label: 'Extérieur', icon: Sun, color: 'text-green-400', bgColor: 'bg-green-400/10' },
  eclairage: { label: 'Éclairage', icon: Lightbulb, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
  audio: { label: 'Audio / Enceintes', icon: Speaker, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
  autre: { label: 'Autre', icon: Package, color: 'text-gray-400', bgColor: 'bg-gray-400/10' },
};

const PRESET_EQUIPMENTS = [
  'Téléviseur', 'Climatiseur', 'Chauffage', 'Machine à laver', 'Sèche-linge',
  'Lave-vaisselle', 'Four', 'Micro-ondes', 'Plaque de cuisson', 'Cafetière',
  'Bouilloire', 'Grille-pain', 'Robot aspirateur', 'Alarme', 'Digicode',
  'Serrure connectée', 'Box internet / Wifi', 'Enceinte Bluetooth',
  'Jacuzzi / Spa', 'Barbecue', 'Volets roulants', 'Store banne',
  'Cheminée', 'Poêle à bois', 'Chauffe-eau', 'VMC', 'Interphone',
  'Thermostat connecté', 'Caméra de surveillance', 'Détecteur de fumée',
  'Ampoules connectées', 'Radiateur électrique', 'Ventilateur', 'Purificateur d\'air'
];

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

const COMMON_TAGS = [
  'Installation', 'Dépannage', 'Entretien', 'Nettoyage', 'Configuration',
  'Wifi', 'Bluetooth', 'Télécommande', 'Programmation', 'Urgence',
  'Économie énergie', 'Sécurité', 'Confort', 'Smart home', 'Éco-responsable'
];

type ViewMode = 'grid' | 'list';
type SortBy = 'recent' | 'name' | 'views' | 'rating' | 'category';

async function loadGuidesFromAPI(): Promise<EquipmentGuide[]> {
  try {
    const response = await fetch('/api/guides');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error loading guides from API:', error);
  }
  return [];
}

async function saveGuidesToAPI(guides: EquipmentGuide[]): Promise<boolean> {
  try {
    const response = await fetch('/api/guides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guides),
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving guides to API:', error);
    return false;
  }
}

function loadGuides(): EquipmentGuide[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('bnbgest_equipment_guides_v2');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveGuides(guides: EquipmentGuide[]): void {
  if (typeof window === 'undefined') return;
  try { 
    localStorage.setItem('bnbgest_equipment_guides_v2', JSON.stringify(guides));
    // Synchroniser avec l'API
    saveGuidesToAPI(guides);
  } catch {}
}

export default function EquipmentVideoQR() {
  const { isDark } = useTheme();
  const { properties } = useBNB();
  const [guides, setGuides] = useState<EquipmentGuide[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EquipmentCategory | 'all'>('all');
  const [previewGuide, setPreviewGuide] = useState<EquipmentGuide | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [activeTab, setActiveTab] = useState<'all' | 'starred' | 'recent'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'facile' | 'moyen' | 'difficile'>('all');
  const [quickTipInput, setQuickTipInput] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['fr']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUploadQR, setShowUploadQR] = useState(false);
  const [networkUrl, setNetworkUrl] = useState('');
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [showUploadedVideos, setShowUploadedVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const [form, setForm] = useState({
    propertyId: properties[0]?.id || 0,
    equipmentName: '',
    category: 'autre' as EquipmentCategory,
    videoUrl: '',
    description: '',
    brand: '',
    model: '',
    purchaseDate: '',
    warrantyUntil: '',
    maintenanceNotes: '',
    quickTips: [] as string[],
    languages: ['fr'] as string[],
    duration: '',
    difficulty: 'moyen' as 'facile' | 'moyen' | 'difficile',
    tags: [] as string[],
  });

  useEffect(() => {
    setMounted(true);
    // Charger depuis l'API en priorité, sinon depuis localStorage
    async function init() {
      const apiGuides = await loadGuidesFromAPI();
      if (apiGuides.length > 0) {
        setGuides(apiGuides);
        // Mettre à jour localStorage avec les données de l'API
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('bnbgest_equipment_guides_v2', JSON.stringify(apiGuides));
          } catch {}
        }
      } else {
        // Fallback sur localStorage
        const localGuides = loadGuides();
        setGuides(localGuides);
        // Si localStorage a des données, les synchroniser avec l'API
        if (localGuides.length > 0) {
          saveGuidesToAPI(localGuides);
        }
      }
    }
    init();
  }, []);

  useEffect(() => { if (mounted) saveGuides(guides); }, [guides, mounted]);

  const resetForm = useCallback(() => {
    setForm({
      propertyId: properties[0]?.id || 0,
      equipmentName: '',
      category: 'autre',
      videoUrl: '',
      description: '',
      brand: '',
      model: '',
      purchaseDate: '',
      warrantyUntil: '',
      maintenanceNotes: '',
      quickTips: [],
      languages: ['fr'],
      duration: '',
      difficulty: 'moyen',
      tags: [],
    });
    setEditingId(null);
    setShowForm(false);
    setQuickTipInput('');
    setSelectedLanguages(['fr']);
    setSelectedTags([]);
    setShowAdvanced(false);
  }, [properties]);

  // Récupérer l'URL réseau pour le QR Code mobile
  useEffect(() => {
    const fetchNetworkUrl = async () => {
      try {
        const response = await fetch('/api/network-ip');
        const data = await response.json();
        if (data.success) {
          setNetworkUrl(`${data.url}/upload-video`);
        } else {
          setNetworkUrl(`${window.location.origin}/upload-video`);
        }
      } catch (error) {
        console.error('Error fetching network IP:', error);
        setNetworkUrl(`${window.location.origin}/upload-video`);
      }
    };
    
    if (typeof window !== 'undefined') {
      fetchNetworkUrl();
    }
  }, []);

  // Charger les vidéos uploadées
  const loadUploadedVideos = useCallback(async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch('/api/list-videos');
      const data = await response.json();
      if (data.success) {
        setUploadedVideos(data.videos);
      }
    } catch (error) {
      console.error('Error loading uploaded videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  }, []);

  useEffect(() => {
    if (showUploadedVideos) {
      loadUploadedVideos();
    }
  }, [showUploadedVideos, loadUploadedVideos]);

  // Supprimer une vidéo uploadée
  const deleteUploadedVideo = async (videoId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette vidéo ?')) return;
    
    try {
      const response = await fetch(`/api/delete-video?id=${videoId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Vidéo supprimée avec succès ! 🗑️');
        loadUploadedVideos(); // Recharger la liste
        setSelectedVideo(null);
      } else {
        toast.error(data.error || 'Erreur lors de la suppression de la vidéo');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression de la vidéo';
      toast.error(message);
    }
  };

  // Créer un guide à partir d'une vidéo uploadée  
  const createGuideFromVideo = (video: UploadedVideo) => {   
    setForm({
      ...form,
      equipmentName: video.title || '',
      category: (video.category as EquipmentCategory) || 'autre',
      videoUrl: video.filePath || '',
      description: `Vidéo uploadée le ${new Date(video.timestamp).toLocaleDateString()}`,
    });
    setShowForm(true);
    setShowUploadedVideos(false);
  };

  const handleSave = useCallback(() => {
    if (!form.equipmentName.trim() || !form.videoUrl.trim()) return;
    const now = new Date().toISOString();

    if (editingId) {
      setGuides(prev => prev.map(g =>
        g.id === editingId
          ? { ...g, ...form, updatedAt: now, lastUpdated: now }
          : g
      ));
    } else {
      const newGuide: EquipmentGuide = {
        id: `guide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...form,
        views: 0,
        rating: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
        lastUpdated: now,
      };
      setGuides(prev => [...prev, newGuide]);
    }
    resetForm();
  }, [form, editingId, resetForm]);

  const handleEdit = useCallback((guide: EquipmentGuide) => {
    setForm({
      propertyId: guide.propertyId,
      equipmentName: guide.equipmentName,
      category: guide.category,
      videoUrl: guide.videoUrl,
      description: guide.description,
      brand: guide.brand || '',
      model: guide.model || '',
      purchaseDate: guide.purchaseDate || '',
      warrantyUntil: guide.warrantyUntil || '',
      maintenanceNotes: guide.maintenanceNotes || '',
      quickTips: guide.quickTips || [],
      languages: guide.languages || ['fr'],
      duration: guide.duration || '',
      difficulty: guide.difficulty || 'moyen',
      tags: guide.tags || [],
    });
    setSelectedLanguages(guide.languages || ['fr']);
    setSelectedTags(guide.tags || []);
    setEditingId(guide.id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Supprimer ce guide vidéo ?')) {
      setGuides(prev => prev.filter(g => g.id !== id));
    }
  }, []);

  const incrementViews = useCallback((id: string) => {
    setGuides(prev => prev.map(g => g.id === id ? { ...g, views: (g.views || 0) + 1 } : g));
  }, []);

  const handleRating = useCallback((id: string, rating: number) => {
    setGuides(prev => prev.map(g => {
      if (g.id !== id) return g;
      const newRatingCount = (g.ratingCount || 0) + 1;
      const newRating = ((g.rating || 0) * (g.ratingCount || 0) + rating) / newRatingCount;
      return { ...g, rating: newRating, ratingCount: newRatingCount };
    }));
  }, []);

  const getPublicUrl = useCallback((guideId: string) => {
    if (typeof window === 'undefined') return '';
    // Utiliser l'IP réseau si disponible, sinon localhost
    const baseUrl = networkUrl ? networkUrl.replace('/upload-video', '') : window.location.origin;
    return `${baseUrl}/guide/${guideId}`;
  }, [networkUrl]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  }, []);

  const downloadQR = useCallback((guideId: string, equipmentName: string) => {
    const svg = document.getElementById(`qr-${guideId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 580;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 500, 580);
      ctx.drawImage(img, 50, 40, 400, 400);
      ctx.fillStyle = '#222222';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(equipmentName, 250, 480);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText('Scannez pour voir le tutoriel vidéo', 250, 510);
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = '#FF385C';
      ctx.fillText('BNBGest - Guide Équipement', 250, 550);
      const a = document.createElement('a');
      a.download = `qr-${equipmentName.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const handlePrintQR = useCallback((guide: EquipmentGuide) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const publicUrl = getPublicUrl(guide.id);
    const cat = CATEGORY_CONFIG[guide.category];
    const IconComp = cat.icon;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>QR Code - ${guide.equipmentName}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}.container{max-width:600px;padding:40px;text-align:center;border:2px solid #222;border-radius:20px}.header{margin-bottom:30px}.header h1{font-size:28px;color:#222;margin-bottom:8px}.header .category{display:inline-flex;align-items:center;gap:8px;background:#f0f0f0;padding:8px 16px;border-radius:20px;font-size:14px;color:#666;margin-top:10px}.qr-box{background:#fafafa;border:3px solid #FF385C;border-radius:16px;padding:30px;margin:20px 0}.info{margin-top:30px;text-align:left;background:#f7f7f7;padding:20px;border-radius:12px}.info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e0e0e0}.info-row:last-child{border:none}.label{font-size:13px;color:#666;font-weight:600}.value{font-size:13px;color:#222}.footer{margin-top:30px;padding-top:20px;border-top:2px solid #e0e0e0;font-size:12px;color:#999}@media print{body{background:#fff}.container{border:none;max-width:100%}}</style></head><body><div class="container"><div class="header"><h1>${guide.equipmentName}</h1><div class="category"><span style="color:${cat.color}">📱</span> ${cat.label}</div></div><div class="qr-box"><div id="qr-container"></div><p style="margin-top:15px;color:#666;font-size:14px">Scannez ce code pour voir le tutoriel vidéo</p></div>${guide.description ? `<p style="margin:20px 0;color:#666;font-size:14px;line-height:1.6">${guide.description}</p>` : ''}<div class="info">${guide.brand ? `<div class="info-row"><span class="label">Marque</span><span class="value">${guide.brand}</span></div>` : ''}${guide.model ? `<div class="info-row"><span class="label">Modèle</span><span class="value">${guide.model}</span></div>` : ''}${guide.duration ? `<div class="info-row"><span class="label">Durée vidéo</span><span class="value">${guide.duration}</span></div>` : ''}<div class="info-row"><span class="label">Lien vidéo</span><span class="value" style="word-break:break-all;font-size:11px">${guide.videoUrl}</span></div></div><div class="footer">Guide généré par BNBGest • ${new Date().toLocaleDateString('fr-FR')}</div></div><script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"><\/script><script>QRCode.toCanvas('${publicUrl}',{width:300,margin:2,color:{dark:'#222222',light:'#ffffff'}},function(err,canvas){if(err) return;document.getElementById('qr-container').appendChild(canvas);setTimeout(function(){window.print();},500);});<\/script></body></html>`);
    win.document.close();
  }, [getPublicUrl]);

  const handleShare = useCallback(async (guide: EquipmentGuide) => {
    const url = getPublicUrl(guide.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Guide: ${guide.equipmentName}`,
          text: `Tutoriel vidéo pour ${guide.equipmentName}`,
          url: url,
        });
      } catch {}
    } else {
      copyToClipboard(url, guide.id);
    }
  }, [getPublicUrl, copyToClipboard]);

  const handleEmailGuide = useCallback((guide: EquipmentGuide) => {
    const url = getPublicUrl(guide.id);
    const subject = encodeURIComponent(`Guide video: ${guide.equipmentName}`);
    const body = encodeURIComponent(`Bonjour,\n\nVoici le guide vidéo pour ${guide.equipmentName}:\n\n${guide.description || ''}\n\nLien direct: ${url}\nVidéo: ${guide.videoUrl}\n\nScannez le QR code pour un accès rapide.\n\nCordialement,\nBNBGest`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }, [getPublicUrl]);

  const addQuickTip = useCallback(() => {
    if (quickTipInput.trim()) {
      setForm(prev => ({ ...prev, quickTips: [...prev.quickTips, quickTipInput.trim()] }));
      setQuickTipInput('');
    }
  }, [quickTipInput]);

  const removeQuickTip = useCallback((index: number) => {
    setForm(prev => ({ ...prev, quickTips: prev.quickTips.filter((_, i) => i !== index) }));
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    setSelectedLanguages(prev => {
      const updated = prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code];
      setForm(f => ({ ...f, languages: updated }));
      return updated;
    });
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const updated = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      setForm(f => ({ ...f, tags: updated }));
      return updated;
    });
  }, []);

  const addCustomTag = useCallback(() => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      toggleTag(newTag.trim());
      setNewTag('');
    }
  }, [newTag, selectedTags, toggleTag]);

  const filteredAndSorted = useMemo(() => {        
    const result = guides.filter(g => {
      if (selectedProperty !== 'all' && g.propertyId !== selectedProperty) return false;
      if (selectedCategory !== 'all' && g.category !== selectedCategory) return false;
      if (selectedDifficulty !== 'all' && g.difficulty !== selectedDifficulty) return false;
      if (searchQuery && !g.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !g.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(g.brand || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    switch (sortBy) {
      case 'name': result.sort((a, b) => a.equipmentName.localeCompare(b.equipmentName)); break;
      case 'views': result.sort((a, b) => (b.views || 0) - (a.views || 0)); break;
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'category': result.sort((a, b) => a.category.localeCompare(b.category)); break;
      default: result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [guides, selectedProperty, selectedCategory, selectedDifficulty, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const total = guides.length;
    const totalViews = guides.reduce((sum, g) => sum + (g.views || 0), 0);
    const ratedGuides = guides.filter(g => g.ratingCount);
    const avgRating = ratedGuides.length
      ? ratedGuides.reduce((sum, g) => sum + (g.rating || 0), 0) / ratedGuides.length
      : 0;
    // Most popular category
    const catCounts = guides.reduce<Record<string, number>>((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {});
    const topCatKey = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topCat = topCatKey ? CATEGORY_CONFIG[topCatKey as EquipmentCategory] : null;
    // Most viewed guide
    const mostViewed = guides.length ? [...guides].sort((a, b) => (b.views || 0) - (a.views || 0))[0] : null;
    return {
      total,
      properties: new Set(guides.map(g => g.propertyId)).size,
      categories: new Set(guides.map(g => g.category)).size,
      totalViews,
      avgRating,
      topCatKey,
      topCat,
      catCounts,
      mostViewed,
    };
  }, [guides]);

  const getPropertyName = useCallback((id: number) => properties.find(p => p.id === id)?.name || `Propriété #${id}`, [properties]);

  if (!mounted) return null;

  const cardCls = isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-gray-200';
  const inputCls = isDark
    ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500 focus:border-[#FF385C]/50 focus:ring-[#FF385C]/20'
    : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-[#FF385C] focus:ring-[#FF385C]/20';
  const txtCls = isDark ? 'text-white' : 'text-gray-900';
  const subCls = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${txtCls}`}>
            <PlayCircle className="w-6 h-6 text-[#FF385C]" />
            Guides Vidéo Équipements
          </h2>
          <p className={`text-sm mt-1 ${subCls}`}>
            QR codes liés à des vidéos tutoriels pour chaque équipement
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowUploadedVideos(!showUploadedVideos)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm font-semibold ${
              showUploadedVideos
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : isDark
                ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.12]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Video className="w-4 h-4" />
            Vidéos Uploadées
            {uploadedVideos.length > 0 && (
              <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {uploadedVideos.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowUploadQR(!showUploadQR)}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-5 py-2.5 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm font-semibold"
          >
            <Smartphone className="w-4 h-4" /> Upload Mobile
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-5 py-2.5 rounded-xl hover:from-[#E31C5F] hover:to-[#C8184F] transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Ajouter un guide
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total guides', value: stats.total, icon: BookOpen, color: 'text-[#FF385C]', bg: isDark ? 'bg-[#FF385C]/10' : 'bg-red-50' },
          { label: 'Propriétés', value: stats.properties, icon: Home, color: 'text-blue-500', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
          { label: 'Catégories', value: stats.categories, icon: Grid, color: 'text-amber-500', bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50' },
          { label: 'Vues totales', value: stats.totalViews, icon: TrendingUp, color: 'text-green-500', bg: isDark ? 'bg-green-500/10' : 'bg-green-50' },
          { label: 'Note moyenne', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-yellow-500', bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50' },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-3 flex items-center gap-3 ${cardCls}`}>
            <div className={`p-2 rounded-lg ${s.bg}`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <div><p className={`text-xl font-bold ${txtCls}`}>{s.value}</p><p className={`text-xs ${subCls}`}>{s.label}</p></div>
          </div>
        ))}
      </motion.div>

      {/* ── Insights strip ── */}
      {guides.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`rounded-2xl border p-4 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-6">
            {/* Top category */}
            {stats.topCat && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">📦</span>
                <div>
                  <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Catégorie #1</p>
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.topCat.label}</p>
                </div>
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-white/10 text-gray-300' : 'bg-white text-gray-600 shadow-sm'}`}>
                  {stats.catCounts[stats.topCatKey!]} guides
                </span>
              </div>
            )}

            {/* Divider */}
            <div className={`hidden sm:block w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

            {/* Most viewed */}
            {stats.mostViewed && (stats.mostViewed.views || 0) > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">👁️</span>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Guide le + vu</p>
                  <p className={`text-sm font-bold truncate max-w-36 ${isDark ? 'text-white' : 'text-gray-800'}`}>{stats.mostViewed.equipmentName}</p>
                </div>
                <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-semibold text-blue-500 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  {stats.mostViewed.views} vues
                </span>
              </div>
            )}

            {/* Divider */}
            <div className={`hidden sm:block w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

            {/* Category mini-bars */}
            <div className="flex-1 min-w-48">
              <p className={`text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Répartition par catégorie</p>
              <div className="flex gap-0.5 h-4 rounded-full overflow-hidden">
                {Object.entries(stats.catCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([cat, count]) => {
                    const cfg = CATEGORY_CONFIG[cat as EquipmentCategory];
                    const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <div
                        key={cat}
                        title={`${cfg?.label ?? cat}: ${count}`}
                        style={{ width: `${pct}%`, backgroundColor: cfg?.color ?? '#888' }}
                        className="transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                      />
                    );
                  })}
              </div>
            </div>

            {/* Avg rating */}
            {stats.avgRating > 0 && (
              <>
                <div className={`hidden sm:block w-px h-8 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <div>
                    <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Note moy.</p>
                    <p className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.avgRating.toFixed(1)}/5</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Galerie des vidéos uploadées */}
      <AnimatePresence>
        {showUploadedVideos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`border rounded-2xl overflow-hidden ${cardCls}`}
          >
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${txtCls}`}>
                  <Video className="w-5 h-5 text-green-500" />
                  Vidéos Uploadées depuis Mobile
                </h3>
                <p className={`text-xs mt-1 ${subCls}`}>
                  {uploadedVideos.length} vidéo{uploadedVideos.length > 1 ? 's' : ''} uploadée{uploadedVideos.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => loadUploadedVideos()}
                disabled={loadingVideos}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isDark ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.12]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${loadingVideos ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className={`w-4 h-4 ${loadingVideos ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>

            <div className="p-6">
              {loadingVideos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className={`text-sm ${subCls}`}>Chargement des vidéos...</p>
                  </div>
                </div>
              ) : uploadedVideos.length === 0 ? (
                <div className="text-center py-12">
                  <Video className={`w-16 h-16 mx-auto mb-4 ${subCls}`} />
                  <p className={`text-lg font-semibold mb-2 ${txtCls}`}>Aucune vidéo uploadée</p>
                  <p className={`text-sm ${subCls} mb-6`}>
                    Scannez le QR code avec votre téléphone pour uploader une vidéo
                  </p>
                  <button
                    onClick={() => setShowUploadQR(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl text-sm font-semibold"
                  >
                    <QrCode className="w-4 h-4" />
                    Afficher le QR Code
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedVideos.map((video) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
                        selectedVideo?.id === video.id
                          ? 'ring-2 ring-green-500'
                          : cardCls
                      }`}
                    >
                      {/* Thumbnail/Aperçu vidéo */}
                      <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                        <video
                          src={video.filePath}
                          className="w-full h-full object-cover"
                          onClick={() => setSelectedVideo(video)}
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setSelectedVideo(video)}
                        >
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                        
                        {/* Badge catégorie */}
                        {video.category && CATEGORY_CONFIG[video.category as EquipmentCategory] && (
                          <div className="absolute top-2 left-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${CATEGORY_CONFIG[video.category as EquipmentCategory].bgColor} ${CATEGORY_CONFIG[video.category as EquipmentCategory].color}`}>
                              {React.createElement(CATEGORY_CONFIG[video.category as EquipmentCategory].icon, { className: 'w-3 h-3' })}
                              {CATEGORY_CONFIG[video.category as EquipmentCategory].label}
                            </span>
                          </div>
                        )}

                        {/* Taille fichier */}
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-black/50 backdrop-blur-sm text-white">
                            {(video.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      </div>

                      {/* Informations */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h4 className={`font-semibold truncate ${txtCls}`}>
                            {video.title || video.originalName}
                          </h4>
                          <p className={`text-xs mt-1 ${subCls}`}>
                            Uploadé le {new Date(video.timestamp).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {/* Source */}
                        {video.uploadedFrom === 'mobile' && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-purple-500" />
                            <span className={`text-xs ${subCls}`}>Uploadé depuis mobile</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => setSelectedVideo(video)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
                              isDark ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.12]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Voir
                          </button>
                          <button
                            onClick={() => createGuideFromVideo(video)}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg text-xs font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Créer un guide
                          </button>
                          <button
                            onClick={() => deleteUploadedVideo(video.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de preview vidéo */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl ${cardCls}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                <div>
                  <h3 className={`text-lg font-bold ${txtCls}`}>
                    {selectedVideo.title || selectedVideo.originalName}
                  </h3>
                  <p className={`text-xs mt-1 ${subCls}`}>
                    {(selectedVideo.size / (1024 * 1024)).toFixed(2)} MB • Uploadé le {new Date(selectedVideo.timestamp).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-gray-100'}`}
                >
                  <X className={`w-5 h-5 ${txtCls}`} />
                </button>
              </div>

              <div className="p-6">
                <video
                  src={selectedVideo.filePath}
                  controls
                  autoPlay
                  className="w-full rounded-xl shadow-lg"
                  style={{ maxHeight: '70vh' }}
                />
              </div>

              <div className={`px-6 py-4 border-t flex gap-3 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  onClick={() => createGuideFromVideo(selectedVideo)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg text-sm font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Créer un guide avec cette vidéo
                </button>
                <button
                  onClick={() => deleteUploadedVideo(selectedVideo.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-sm font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border rounded-2xl p-5 space-y-4 ${cardCls}`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${subCls}`} />
            <input
              type="text"
              placeholder="Rechercher équipement, marque, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${inputCls}`}
            />
          </div>
          <select value={selectedProperty === 'all' ? '' : selectedProperty} onChange={(e) => setSelectedProperty(e.target.value ? Number(e.target.value) : 'all')} className={`border rounded-xl px-4 py-2.5 text-sm ${inputCls}`}>
            <option value="">Toutes propriétés</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as typeof selectedCategory)} className={`border rounded-xl px-4 py-2.5 text-sm ${inputCls}`}>
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value as typeof selectedDifficulty)} className={`border rounded-xl px-4 py-2.5 text-sm ${inputCls}`}>
            <option value="all">Toutes difficultés</option>
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="difficile">Difficile</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-100 text-gray-600'}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#FF385C] text-white' : isDark ? 'bg-white/[0.04] text-gray-400' : 'bg-gray-100 text-gray-600'}`}><List className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${subCls}`}>Trier par:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className={`border rounded-lg px-3 py-1.5 text-xs ${inputCls}`}>
              <option value="recent">Plus récent</option>
              <option value="name">Nom A-Z</option>
              <option value="views">Plus vus</option>
              <option value="rating">Mieux notés</option>
              <option value="category">Catégorie</option>
            </select>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div key="form" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`border rounded-2xl overflow-hidden ${cardCls}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className={`font-bold ${txtCls}`}>{editingId ? 'Modifier le guide' : 'Nouveau guide vidéo'}</h3>
              <button onClick={resetForm} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Propriété *</label>
                  <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: Number(e.target.value) })} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`}>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Catégorie *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as EquipmentCategory })} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`}>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Nom équipement *</label>
                  <input type="text" value={form.equipmentName} onChange={(e) => setForm({ ...form, equipmentName: e.target.value })} placeholder="Ex: Téléviseur Samsung 55 pouces" list="equipment-presets" className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                  <datalist id="equipment-presets">{PRESET_EQUIPMENTS.map(e => <option key={e} value={e} />)}</datalist>
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>URL vidéo *</label>
                  <input type="url" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Marque</label>
                  <input type="text" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Samsung, LG, Bosch..." className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Modèle</label>
                  <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="UE55TU7125" className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Durée vidéo</label>
                  <input type="text" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="5:30" className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                </div>
                <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Difficulté</label>
                  <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`}>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                  </select>
                </div>
              </div>
              <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du guide..." rows={3} className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none ${inputCls}`} />
              </div>
              <div><label className={`block text-xs font-medium mb-2 ${subCls}`}>Langues disponibles</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => toggleLanguage(lang.code)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-all ${selectedLanguages.includes(lang.code) ? 'bg-[#FF385C] text-white border-[#FF385C]' : isDark ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      <span>{lang.flag}</span>{lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className={`block text-xs font-medium mb-2 ${subCls}`}>Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_TAGS.map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${selectedTags.includes(tag) ? 'bg-[#FF385C] text-white border-[#FF385C]' : isDark ? 'border-white/[0.08] text-gray-400 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomTag()} placeholder="Tag personnalisé..." className={`flex-1 border rounded-xl px-3 py-2 text-sm ${inputCls}`} />
                  <button onClick={addCustomTag} className="px-4 py-2 bg-[#FF385C] text-white rounded-xl hover:bg-[#E31C5F] transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div><label className={`block text-xs font-medium mb-2 ${subCls}`}>Conseils rapides</label>
                <AnimatePresence>
                  {form.quickTips.map((tip, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className={`flex items-start gap-2 mb-2 p-3 rounded-xl border ${isDark ? 'bg-green-500/5 border-green-500/10' : 'bg-green-50 border-green-100'}`}>
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span className={`flex-1 text-sm ${txtCls}`}>{tip}</span>
                      <button onClick={() => removeQuickTip(i)} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}><X className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="flex gap-2">
                  <input type="text" value={quickTipInput} onChange={(e) => setQuickTipInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuickTip()} placeholder="Ex: Appuyer sur le bouton rouge..." className={`flex-1 border rounded-xl px-3 py-2 text-sm ${inputCls}`} />
                  <button onClick={addQuickTip} className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                  <Settings className="w-4 h-4" /> Options avancées {showAdvanced ? '▲' : '▼'}
                </button>
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Date d&apos;achat</label>
                        <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                      </div>
                      <div><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Garantie jusqu&apos;au</label>
                        <input type="date" value={form.warrantyUntil} onChange={(e) => setForm({ ...form, warrantyUntil: e.target.value })} className={`w-full border rounded-xl px-3 py-2.5 text-sm ${inputCls}`} />
                      </div>
                      <div className="md:col-span-2"><label className={`block text-xs font-medium mb-1.5 ${subCls}`}>Notes de maintenance</label>
                        <textarea value={form.maintenanceNotes} onChange={(e) => setForm({ ...form, maintenanceNotes: e.target.value })} placeholder="Historique réparations, entretien..." rows={3} className={`w-full border rounded-xl px-3 py-2.5 text-sm resize-none ${inputCls}`} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
              <button onClick={resetForm} className={`px-5 py-2.5 rounded-xl text-sm border transition-colors ${isDark ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>Annuler</button>
              <button onClick={handleSave} disabled={!form.equipmentName.trim() || !form.videoUrl.trim()} className="flex items-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white px-6 py-2.5 rounded-xl hover:from-[#E31C5F] hover:to-[#C8184F] transition-all text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
                <Save className="w-4 h-4" /> {editingId ? 'Enregistrer' : 'Créer le guide'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredAndSorted.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border-2 border-dashed rounded-2xl p-16 text-center ${isDark ? 'border-white/[0.08]' : 'border-gray-300'}`}>
          <QrCode className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`font-medium mb-2 ${txtCls}`}>{guides.length === 0 ? 'Aucun guide vidéo' : 'Aucun résultat'}</p>
          <p className={`text-sm ${subCls}`}>{guides.length === 0 ? 'Créez votre premier guide pour générer un QR code' : 'Modifiez vos filtres de recherche'}</p>
        </motion.div>
      ) : (
        <motion.div layout className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
          <AnimatePresence>
            {filteredAndSorted.map(guide => {
              const cat = CATEGORY_CONFIG[guide.category];
              const IconComp = cat.icon;
              const publicUrl = getPublicUrl(guide.id);
              return viewMode === 'grid' ? (
                <motion.div key={guide.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`border rounded-2xl overflow-hidden transition-all hover:shadow-xl ${cardCls}`}>
                  <div className={`p-6 flex flex-col items-center border-b ${isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="relative">
                      <QRCodeSVG id={`qr-${guide.id}`} value={publicUrl} size={180} level="H" includeMargin={true} bgColor="#ffffff" fgColor="#000000" />
                      <div className={`absolute -top-2 -right-2 ${cat.bgColor} p-2 rounded-xl border-2 ${isDark ? 'border-[#1a1a2e]' : 'border-white'}`}>
                        <IconComp className={`w-4 h-4 ${cat.color}`} />
                      </div>
                    </div>
                    <p className={`text-xs mt-3 font-mono ${subCls}`}>Flashez pour le tutoriel</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className={`font-bold text-sm mb-1 ${txtCls}`}>{guide.equipmentName}</h4>
                      <p className={`text-xs ${subCls}`}>{getPropertyName(guide.propertyId)}</p>
                      {guide.brand && <p className={`text-xs mt-1 ${subCls}`}>{guide.brand} {guide.model && `• ${guide.model}`}</p>}
                    </div>
                    {guide.description && <p className={`text-xs line-clamp-2 ${subCls}`}>{guide.description}</p>}
                    <div className="flex flex-wrap gap-2">
                      {guide.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded-lg ${guide.difficulty === 'facile' ? 'bg-green-500/10 text-green-500' : guide.difficulty === 'moyen' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                          {guide.difficulty}
                        </span>
                      )}
                      {guide.duration && <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} ${subCls}`}><Clock className="w-3 h-3 inline mr-1" />{guide.duration}</span>}
                      {(guide.views || 0) > 0 && <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-white/[0.04]' : 'bg-gray-100'} ${subCls}`}><Eye className="w-3 h-3 inline mr-1" />{guide.views}</span>}
                    </div>
                    {guide.tags && guide.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {guide.tags.slice(0, 3).map(tag => <span key={tag} className={`text-xs px-2 py-0.5 rounded-lg ${isDark ? 'bg-[#FF385C]/10 text-[#FF385C]' : 'bg-red-50 text-red-600'}`}>{tag}</span>)}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-1.5 pt-2">
                      <button onClick={() => { setPreviewGuide(guide); incrementViews(guide.id); }} className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Eye className="w-3.5 h-3.5" />Voir</button>
                      <button onClick={() => copyToClipboard(publicUrl, guide.id)} className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{copiedId === guide.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => downloadQR(guide.id, guide.equipmentName)} className={`flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Download className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-1.5 pt-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}">
                      <button onClick={() => handleShare(guide)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}><Share2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handlePrintQR(guide)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}><Printer className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEmailGuide(guide)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/[0.04]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}><Mail className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleEdit(guide)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-white hover:bg-white/[0.06]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(guide.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={guide.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={`border rounded-xl p-4 flex items-center gap-4 ${cardCls}`}>
                  <QRCodeSVG id={`qr-${guide.id}`} value={publicUrl} size={100} level="H" bgColor="#ffffff" fgColor="#000000" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComp className={`w-4 h-4 ${cat.color}`} />
                      <h4 className={`font-bold ${txtCls}`}>{guide.equipmentName}</h4>
                      {guide.difficulty && <span className={`text-xs px-2 py-0.5 rounded ${guide.difficulty === 'facile' ? 'bg-green-500/10 text-green-500' : guide.difficulty === 'moyen' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{guide.difficulty}</span>}
                    </div>
                    <p className={`text-xs ${subCls} mb-1`}>{getPropertyName(guide.propertyId)} {guide.brand && `• ${guide.brand}`}</p>
                    {guide.description && <p className={`text-xs ${subCls} line-clamp-1`}>{guide.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setPreviewGuide(guide); incrementViews(guide.id); }} className="p-2 rounded-lg bg-[#FF385C] text-white hover:bg-[#E31C5F] transition-colors"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => downloadQR(guide.id, guide.equipmentName)} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(guide)} className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(guide.id)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {previewGuide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setPreviewGuide(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className={`w-full max-w-2xl rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {React.createElement(CATEGORY_CONFIG[previewGuide.category].icon, { className: `w-5 h-5 ${CATEGORY_CONFIG[previewGuide.category].color}` })}
                  <h3 className={`font-bold text-lg ${txtCls}`}>{previewGuide.equipmentName}</h3>
                </div>
                <button onClick={() => setPreviewGuide(null)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.06] text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex gap-6">
                  <div className={`flex flex-col items-center p-5 rounded-2xl ${isDark ? 'bg-white/[0.05]' : 'bg-gradient-to-br from-purple-50 to-indigo-50'} border-2 border-dashed ${isDark ? 'border-white/[0.1]' : 'border-purple-300'}`}>
                    <QRCodeSVG
                      value={getPublicUrl(previewGuide.id)}
                      size={240}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      imageSettings={{
                        src: '/favicon.ico',
                        height: 40,
                        width: 40,
                        excavate: true,
                      }}
                    />
                    <p className={`text-sm mt-3 font-medium ${txtCls}`}>Scannez pour voir le tutoriel</p>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div><p className={`text-xs font-medium ${subCls}`}>Propriété</p><p className={`text-sm ${txtCls}`}>{getPropertyName(previewGuide.propertyId)}</p></div>
                    {previewGuide.brand && <div><p className={`text-xs font-medium ${subCls}`}>Marque &amp; Modèle</p><p className={`text-sm ${txtCls}`}>{previewGuide.brand} {previewGuide.model}</p></div>}
                    {previewGuide.description && <div><p className={`text-xs font-medium ${subCls}`}>Description</p><p className={`text-sm ${txtCls}`}>{previewGuide.description}</p></div>}
                    <div className="flex flex-wrap gap-2">
                      {previewGuide.difficulty && <span className={`text-xs px-3 py-1.5 rounded-xl ${previewGuide.difficulty === 'facile' ? 'bg-green-500/10 text-green-500' : previewGuide.difficulty === 'moyen' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{previewGuide.difficulty}</span>}
                      {previewGuide.duration && <span className={`text-xs px-3 py-1.5 rounded-xl ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'} ${txtCls}`}><Clock className="w-3 h-3 inline mr-1" />{previewGuide.duration}</span>}
                      {(previewGuide.views || 0) > 0 && <span className={`text-xs px-3 py-1.5 rounded-xl ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'} ${txtCls}`}><Eye className="w-3 h-3 inline mr-1" />{previewGuide.views} vues</span>}
                    </div>
                    {previewGuide.quickTips && previewGuide.quickTips.length > 0 && (
                      <div><p className={`text-xs font-medium mb-2 ${subCls}`}>Conseils rapides</p>
                        {previewGuide.quickTips.map((tip, i) => (
                          <div key={i} className={`flex items-start gap-2 mb-1.5 text-xs ${subCls}`}>
                            <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div><p className={`text-xs font-medium ${subCls}`}>Lien vidéo</p>
                      <a href={previewGuide.videoUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#FF385C] hover:underline flex items-center gap-1 mt-1">
                        <Play className="w-4 h-4" /> Ouvrir la vidéo <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
                {previewGuide.tags && previewGuide.tags.length > 0 && (
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium mb-2 ${subCls}`}>Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewGuide.tags.map(tag => <span key={tag} className={`text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-[#FF385C]/10 text-[#FF385C]' : 'bg-red-50 text-red-600'}`}>{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>
              <div className={`px-6 py-4 border-t flex gap-2 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => copyToClipboard(getPublicUrl(previewGuide.id), previewGuide.id)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                  {copiedId === previewGuide.id ? <><Check className="w-4 h-4 text-green-400" />Copie!</> : <><Copy className="w-4 h-4" />Copier lien</>}
                </button>
                <button onClick={() => handleShare(previewGuide)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                  <Share2 className="w-4 h-4" />Partager
                </button>
                <button onClick={() => handlePrintQR(previewGuide)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border transition-all ${isDark ? 'border-white/[0.08] text-gray-300 hover:bg-white/[0.04]' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
                  <Printer className="w-4 h-4" />Imprimer
                </button>
                <button onClick={() => downloadQR(previewGuide.id, previewGuide.equipmentName)} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white py-3 rounded-xl text-sm font-semibold hover:from-[#E31C5F] hover:to-[#C8184F] transition-all shadow-lg">
                  <Download className="w-4 h-4" />Télécharger QR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}