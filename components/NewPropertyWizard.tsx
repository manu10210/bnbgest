'use client';

/**
 * 🏠 NewPropertyWizard — Mini configurateur déclenché par GmailImporter
 * quand un nouveau logement est détecté dans les emails Airbnb.
 * Wizard 4 étapes : Info → Capacité/Prix → Photos → Description
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import type { Property } from '../contexts/BNBContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, Upload,
  Trash2, Bed, Bath, Users, DollarSign, Clock,
  Sparkles, Image as ImageIcon, AlertTriangle, MapPin, WandSparkles,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedPropertyInfo {
  rawName: string;
  guessedType: Property['type'];
  guessedBedrooms: number;
  guessedMaxGuests: number;
  guessedPricePerNight: number;
}

export interface WizardPropertyPayload {
  name: string;
  address: string;
  city: string;
  country: string;
  type: Property['type'];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  price: number;
  description: string;
  images: string[];
  checkInTime: string;
  checkOutTime: string;
  cleaningFee: number;
  minimumStay: number;
}

interface Props {
  detected: DetectedPropertyInfo;
  onClose: () => void;
  /**
   * Appelé lors de la validation du configurateur.
   * Retourner false pour empêcher la fermeture (ex: erreur DB).
   */
  onCreated: (propertyName: string, payload: WizardPropertyPayload) => Promise<boolean | void> | boolean | void;
}

// ─── Analyse automatique du titre Airbnb ─────────────────────────────────────

export function analyzeAirbnbTitle(title: string): DetectedPropertyInfo {
  const t = title.toLowerCase();

  // ── Type de logement ──────────────────────────────────────────────────────
  let guessedType: Property['type'] = 'apartment';
  if (/villa/.test(t)) guessedType = 'villa';
  else if (/maison|house|pavillon|maisonnette|chalet|gîte|gite|fermette|longère|bastide/.test(t)) guessedType = 'house';
  else if (/studio|studette/.test(t)) guessedType = 'studio';
  else if (/chambre|room/.test(t)) guessedType = 'room';
  // Indicateurs d'appartement atypique (mansarde, combles, etc.) → apartment
  else if (/toits?|combles?|mansarde|duplex|loft|cocon|nid|pied.?[àa].?terre/.test(t)) guessedType = 'apartment';

  // ── Nombre de chambres ────────────────────────────────────────────────────
  let guessedBedrooms = 1;
  // T2, F3, 2 chambres, 3 bedrooms, 3 pièces
  const mType = t.match(/[tf](\d)\b|(\d)\s*(?:chambre|bedroom|pi[eè]ce)/);
  if (mType) {
    const n = parseInt(mType[1] || mType[2]);
    if (n >= 1 && n <= 8) guessedBedrooms = n;
  }

  // ── Capacité estimée ──────────────────────────────────────────────────────
  let guessedMaxGuests = Math.min(guessedBedrooms * 2, 10);
  // "4 personnes", "jusqu'à 6 voyageurs"
  const mGuests = t.match(/(\d+)\s*(?:personne|voyageur|guest)/);
  if (mGuests) guessedMaxGuests = Math.min(parseInt(mGuests[1]), 16);

  return {
    rawName: title,
    guessedType,
    guessedBedrooms,
    guessedMaxGuests,
    guessedPricePerNight: 0,
  };
}

// ─── Détection de nouvelles propriétés ───────────────────────────────────────

export function findNewPropertyNames(
  propertyNamesFromBookings: string[],
  existingProperties: { name: string }[]
): string[] {
  const existingKeys = existingProperties.map(p =>
    p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)
  );

  const seen = new Set<string>();
  const results: string[] = [];

  for (const name of propertyNamesFromBookings) {
    if (!name?.trim()) continue;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    if (!seen.has(key) && !existingKeys.some(e => e.includes(key.slice(0, 10)) || key.includes(e.slice(0, 10)))) {
      seen.add(key);
      results.push(name.trim());
    }
  }
  return results;
}

// ─── Options ─────────────────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: Property['type']; label: string; emoji: string }[] = [
  { value: 'apartment', label: 'Appartement', emoji: '🏢' },
  { value: 'house',     label: 'Maison',       emoji: '🏡' },
  { value: 'studio',    label: 'Studio',       emoji: '🛏️' },
  { value: 'villa',     label: 'Villa',        emoji: '🏖️' },
  { value: 'room',      label: 'Chambre',      emoji: '🚪' },
];

const AMENITIES = [
  'WiFi', 'Climatisation', 'Chauffage', 'Cuisine équipée',
  'Lave-linge', 'TV', 'Parking', 'Terrasse', 'Jardin',
  'Piscine', 'Barbecue', 'Cheminée', 'Vue dégagée',
];

const STEPS = ['Informations', 'Capacité & Prix', 'Photos', 'Description'];

function inferCityFromDetectedLabel(input: string): string {
  if (!input) return '';

  const parts = input
    .split(/[-–|,]/g)
    .map((part) => part.trim())
    .filter(Boolean);

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const candidate = parts[i];
    const hasLettersOnly = /^[A-Za-zÀ-ÿ'\s]{2,30}$/.test(candidate);
    if (hasLettersOnly) return candidate;
  }

  return '';
}

function normalizeCountryLabel(input: string): string {
  const v = input.trim().toLowerCase();
  if (['fr', 'france'].includes(v)) return 'France';
  if (['be', 'belgique', 'belgium'].includes(v)) return 'Belgique';
  if (['es', 'espagne', 'spain'].includes(v)) return 'Espagne';
  if (['it', 'italie', 'italy'].includes(v)) return 'Italie';
  if (['pt', 'portugal'].includes(v)) return 'Portugal';
  if (['de', 'allemagne', 'germany'].includes(v)) return 'Allemagne';
  return input.trim();
}

function buildSmartDescription(input: {
  name: string;
  city: string;
  type: Property['type'];
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
}): string {
  const typeLabelMap: Record<Property['type'], string> = {
    apartment: 'appartement',
    house: 'maison',
    studio: 'studio',
    villa: 'villa',
    room: 'chambre',
  };
  const typeLabel = typeLabelMap[input.type] || 'logement';
  const topAmenities = input.amenities.slice(0, 4).join(', ');

  const locationLine = input.city
    ? `Situé à ${input.city}, ce ${typeLabel} offre un cadre confortable et pratique pour votre séjour.`
    : `Ce ${typeLabel} offre un cadre confortable et pratique pour votre séjour.`;

  const capacityLine = `Idéal pour ${input.maxGuests} voyageur${input.maxGuests > 1 ? 's' : ''}, avec ${input.bedrooms} chambre${input.bedrooms > 1 ? 's' : ''} et ${input.bathrooms} salle${input.bathrooms > 1 ? 's' : ''} de bain.`;

  const amenityLine = topAmenities
    ? `Vous profiterez de : ${topAmenities}.`
    : `Le logement est pensé pour un séjour simple, agréable et autonome.`;

  return `${locationLine} ${capacityLine} ${amenityLine} Parfait pour une escapade en solo, en couple, en famille ou entre amis.`;
}

function normalizeDraftKeyPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NewPropertyWizard({ detected, onClose, onCreated }: Props) {
  const { isDark } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const inferredCity = useMemo(() => inferCityFromDetectedLabel(detected.rawName), [detected.rawName]);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPhotoIndex, setDragPhotoIndex] = useState<number | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Champs
  const [name, setName] = useState(detected.rawName);
  const [city, setCity] = useState(inferredCity);
  const [country, setCountry] = useState('France');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<Property['type']>(detected.guessedType);
  const [bedrooms, setBedrooms] = useState(detected.guessedBedrooms);
  const [bathrooms, setBathrooms] = useState(1);
  const [maxGuests, setMaxGuests] = useState(detected.guessedMaxGuests);
  const [price, setPrice] = useState(detected.guessedPricePerNight || 80);
  const [cleaningFee, setCleaningFee] = useState(30);
  const [checkIn, setCheckIn] = useState('15:00');
  const [checkOut, setCheckOut] = useState('11:00');
  const [minStay, setMinStay] = useState(1);
  const [amenities, setAmenities] = useState<string[]>(['WiFi', 'Chauffage']);
  const [images, setImages] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [description, setDescription] = useState('');

  const draftStorageKey = useMemo(
    () => `bnbgest:wizard:draft:${normalizeDraftKeyPart(detected.rawName || 'default')}`,
    [detected.rawName],
  );

  // Styles
  const bg = isDark ? 'bg-[#1a1a2e]' : 'bg-white';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const sub = isDark ? 'text-gray-400' : 'text-gray-500';
  const card = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
  const inp = `w-full px-3 py-2 rounded-xl border text-sm outline-none transition-colors ${
    isDark
      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-violet-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500'
  }`;

  const progress = ((step + 1) / STEPS.length) * 100;

  const pricePresets = useMemo(() => {
    const base = Math.max(40, detected.guessedPricePerNight || price || 80);
    const weighted = type === 'villa' ? Math.round(base * 1.4)
      : type === 'house' ? Math.round(base * 1.2)
      : type === 'room' ? Math.round(base * 0.7)
      : base;
    return [
      Math.max(35, Math.round(weighted * 0.85)),
      Math.max(40, Math.round(weighted)),
      Math.max(50, Math.round(weighted * 1.2)),
    ];
  }, [detected.guessedPricePerNight, price, type]);

  const recommendedPrice = pricePresets[1] || price;
  const priceRatio = recommendedPrice > 0 ? price / recommendedPrice : 1;
  const pricePosition = priceRatio < 0.9
    ? { label: 'Bas', cls: isDark ? 'text-amber-300 bg-amber-900/30 border-amber-700/40' : 'text-amber-700 bg-amber-50 border-amber-200' }
    : priceRatio > 1.15
      ? { label: 'Élevé', cls: isDark ? 'text-rose-300 bg-rose-900/30 border-rose-700/40' : 'text-rose-700 bg-rose-50 border-rose-200' }
      : { label: 'Optimisé', cls: isDark ? 'text-emerald-300 bg-emerald-900/30 border-emerald-700/40' : 'text-emerald-700 bg-emerald-50 border-emerald-200' };

  const suggestedDescription = useMemo(() => buildSmartDescription({
    name,
    city,
    type,
    maxGuests,
    bedrooms,
    bathrooms,
    amenities,
  }), [name, city, type, maxGuests, bedrooms, bathrooms, amenities]);

  const validation = useMemo(() => {
    const errors = {
      name: name.trim().length < 3,
      city: city.trim().length < 2,
      country: country.trim().length < 2,
      bedrooms: bedrooms < 0,
      bathrooms: bathrooms < 1,
      maxGuests: maxGuests < 1,
      price: price <= 0,
      minStay: minStay < 1,
      checkTimes: checkIn === checkOut,
    };

    const stepValid = [
      !errors.name && !errors.city && !errors.country,
      !errors.bedrooms && !errors.bathrooms && !errors.maxGuests && !errors.price && !errors.minStay && !errors.checkTimes,
      true,
      true,
    ];

    return { errors, stepValid };
  }, [name, city, country, bedrooms, bathrooms, maxGuests, price, minStay, checkIn, checkOut]);

  const canNext = validation.stepValid[step];

  const goNext = () => {
    if (!canNext) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<WizardPropertyPayload> & {
        checkInTime?: string;
        checkOutTime?: string;
      };

      if (parsed.name) setName(parsed.name);
      if (parsed.city) setCity(parsed.city);
      if (parsed.country) setCountry(parsed.country);
      if (parsed.address) setAddress(parsed.address);
      if (parsed.type) setType(parsed.type);
      if (typeof parsed.bedrooms === 'number') setBedrooms(parsed.bedrooms);
      if (typeof parsed.bathrooms === 'number') setBathrooms(parsed.bathrooms);
      if (typeof parsed.maxGuests === 'number') setMaxGuests(parsed.maxGuests);
      if (typeof parsed.price === 'number') setPrice(parsed.price);
      if (typeof parsed.cleaningFee === 'number') setCleaningFee(parsed.cleaningFee);
      if (typeof parsed.minimumStay === 'number') setMinStay(parsed.minimumStay);
      if (Array.isArray(parsed.amenities)) setAmenities(parsed.amenities.filter((x): x is string => typeof x === 'string'));
      if (Array.isArray(parsed.images)) setImages(parsed.images.filter((x): x is string => typeof x === 'string').slice(0, 12));
      if (parsed.description) setDescription(parsed.description);
      if (parsed.checkInTime) setCheckIn(parsed.checkInTime);
      if (parsed.checkOutTime) setCheckOut(parsed.checkOutTime);

      setDraftRestored(true);
    } catch {
      // Ignore invalid local draft payload
    }
  }, [draftStorageKey]);

  useEffect(() => {
    try {
      const payload = {
        name,
        city,
        country,
        address,
        type,
        bedrooms,
        bathrooms,
        maxGuests,
        amenities,
        price,
        description,
        images,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        cleaningFee,
        minimumStay: minStay,
      };
      window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage issues
    }
  }, [
    draftStorageKey,
    name,
    city,
    country,
    address,
    type,
    bedrooms,
    bathrooms,
    maxGuests,
    amenities,
    price,
    description,
    images,
    checkIn,
    checkOut,
    cleaningFee,
    minStay,
  ]);

  // Photos
  const appendFiles = (files: File[]) => {
    files.forEach((f) => {
      if (!f.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = (ev) => {
        if (ev.target?.result) setImages((p) => [...p, ev.target!.result as string].slice(0, 12));
      };
      r.readAsDataURL(f);
    });
  };

  const addUrl = () => {
    const u = urlInput.trim();
    const valid = /^https?:\/\//i.test(u) || /^data:image\//i.test(u);
    if (u && valid && !images.includes(u)) {
      setImages(p => [...p, u].slice(0, 12));
      setUrlInput('');
    }
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    appendFiles(Array.from(e.target.files || []));
  };

  const onDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    appendFiles(files);
  };

  const onDragOverFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeaveFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const movePhoto = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setImages((prev) => {
      if (from >= prev.length || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  // Sauvegarde
  const save = async () => {
    if (!validation.stepValid[0] || !validation.stepValid[1]) {
      setShowValidation(true);
      return;
    }

    setSaving(true);
    const payload: WizardPropertyPayload = {
      name: name.trim(),
      address: address.trim() || `${city.trim()}, ${country}`,
      city: city.trim(),
      country: normalizeCountryLabel(country),
      type,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities,
      price,
      description: description.trim() || `Logement importé depuis Airbnb : ${name.trim()}`,
      images,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      cleaningFee,
      minimumStay: minStay,
    };

    try {
      const result = await onCreated(name.trim(), payload);
      if (result === false) {
        setSaving(false);
        return;
      }
    } catch {
      setSaving(false);
      return;
    }

    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch {
      // Ignore storage issues
    }

    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}
      >

        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b ${border}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className={`font-bold ${text}`}>Nouveau logement détecté !</h2>
              <p className={`text-xs ${sub}`}>Configurez l&apos;annonce en {STEPS.length} étapes</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={onClose} className={`p-1.5 rounded-lg hover:bg-gray-100/10 ${sub}`}><X className="w-5 h-5" /></motion.button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-5 pt-4 pb-1 gap-1">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 flex-shrink-0`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? 'bg-green-500 text-white' : i === step ? 'bg-violet-600 text-white' : isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-400'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-violet-500' : i < step ? 'text-green-500' : sub}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${i < step ? 'bg-green-400' : isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className={`mx-5 mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Bandeau logement détecté */}
        <div className={`mx-5 mt-3 p-3 rounded-xl border flex items-start gap-2 text-xs ${isDark ? 'bg-violet-900/30 border-violet-700 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Logement extrait de vos emails : <strong>&ldquo;{detected.rawName}&rdquo;</strong></span>
        </div>

        {draftRestored && (
          <div className={`mx-5 mt-2 p-2.5 rounded-xl border text-[11px] ${isDark ? 'border-cyan-700/50 bg-cyan-900/20 text-cyan-200' : 'border-cyan-200 bg-cyan-50 text-cyan-700'}`}>
            Brouillon restauré automatiquement pour ce logement détecté.
          </div>
        )}

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <AnimatePresence mode="wait" initial={false}>

          {/* ÉTAPE 0 — Infos de base */}
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className={`rounded-xl border px-3 py-2 text-xs flex flex-wrap gap-2 ${isDark ? 'border-violet-700/50 bg-violet-900/20 text-violet-200' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>
                <span>Type suggéré: <strong>{PROPERTY_TYPES.find((pt) => pt.value === detected.guessedType)?.label || 'Appartement'}</strong></span>
                <span>•</span>
                <span>{detected.guessedBedrooms} ch.</span>
                <span>•</span>
                <span>{detected.guessedMaxGuests} voyageurs</span>
                {inferredCity && (
                  <>
                    <span>•</span>
                    <span>Ville détectée: <strong>{inferredCity}</strong></span>
                  </>
                )}
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Nom de l&apos;annonce *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Maison de ville avec terrasse" className={inp} />
                {showValidation && validation.errors.name && (
                  <p className="text-[11px] text-red-500 mt-1">Le nom doit contenir au moins 3 caractères.</p>
                )}
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Type de logement</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {PROPERTY_TYPES.map(pt => (
                    <button key={pt.value} onClick={() => setType(pt.value)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs transition-all ${
                        type === pt.value
                          ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : `${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'} hover:border-gray-400`
                      }`}>
                      <span className="text-lg">{pt.emoji}</span>
                      <span className="leading-tight text-center">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><MapPin className="w-3 h-3" /> Ville *</label>
                  <input value={city} onChange={e => setCity(e.target.value)} placeholder="Ex : Montpellier" className={inp} />
                  {showValidation && validation.errors.city && (
                    <p className="text-[11px] text-red-500 mt-1">La ville est requise.</p>
                  )}
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub}`}>Pays</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} className={inp} />
                  {showValidation && validation.errors.country && (
                    <p className="text-[11px] text-red-500 mt-1">Le pays est requis.</p>
                  )}
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Adresse (optionnel)</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex : 12 rue de la Paix" className={inp} />
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 1 — Capacité & Prix */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div className={`rounded-xl border p-3 ${card}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className={`text-xs font-semibold ${sub}`}>Tarifs rapides conseillés</p>
                  <div className="flex items-center gap-2">
                    {pricePresets.map((p) => (
                      <motion.button
                        key={p}
                        type="button"
                        onClick={() => setPrice(p)}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${price === p ? 'bg-violet-600 text-white' : isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                      >
                        {p}€
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><Bed className="w-3 h-3" /> Chambres</label>
                  <input type="number" min={0} max={10} value={bedrooms} onChange={e => setBedrooms(+e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><Bath className="w-3 h-3" /> Salles de bain</label>
                  <input type="number" min={1} max={10} value={bathrooms} onChange={e => setBathrooms(+e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><Users className="w-3 h-3" /> Voyageurs max</label>
                  <input type="number" min={1} max={20} value={maxGuests} onChange={e => setMaxGuests(+e.target.value)} className={inp} />
                  {showValidation && validation.errors.maxGuests && (
                    <p className="text-[11px] text-red-500 mt-1">Minimum 1 voyageur.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><DollarSign className="w-3 h-3" /> Prix / nuit (€) *</label>
                  <input type="number" min={1} value={price} onChange={e => setPrice(+e.target.value)} className={inp} />
                  {showValidation && validation.errors.price && (
                    <p className="text-[11px] text-red-500 mt-1">Le prix doit être supérieur à 0.</p>
                  )}
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub}`}>Frais ménage (€)</label>
                  <input type="number" min={0} value={cleaningFee} onChange={e => setCleaningFee(+e.target.value)} className={inp} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><Clock className="w-3 h-3" /> Check-in</label>
                  <input type="time" value={checkIn} onChange={e => setCheckIn(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><Clock className="w-3 h-3" /> Check-out</label>
                  <input type="time" value={checkOut} onChange={e => setCheckOut(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub}`}>Séjour min (n)</label>
                  <input type="number" min={1} max={30} value={minStay} onChange={e => setMinStay(+e.target.value)} className={inp} />
                </div>
              </div>

              {showValidation && validation.errors.checkTimes && (
                <p className="text-[11px] text-red-500">Les horaires d&apos;arrivée et de départ doivent être différents.</p>
              )}

              <div className={`rounded-xl border px-3 py-2 text-xs ${isDark ? 'border-emerald-700/40 bg-emerald-900/20 text-emerald-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                Projection rapide (65% d&apos;occupation): <strong>{Math.round(price * 0.65 * 30).toLocaleString('fr-FR')}€ / mois</strong>
              </div>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${pricePosition.cls}`}>
                Prix conseillé: {recommendedPrice}€ · Position: {pricePosition.label}
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-2 ${sub}`}>Équipements</label>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES.map(a => (
                    <motion.button key={a} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        amenities.includes(a) ? 'bg-violet-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {a}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ÉTAPE 2 — Photos */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <p className={`text-sm ${sub}`}>Ajoutez des photos (vous pourrez en ajouter d&apos;autres plus tard depuis la gestion des propriétés).</p>

              <div
                onClick={() => fileRef.current?.click()}
                onDrop={onDropFiles}
                onDragOver={onDragOverFiles}
                onDragLeave={onDragLeaveFiles}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  isDragging
                    ? (isDark ? 'border-violet-400 bg-violet-900/20 text-violet-200' : 'border-violet-500 bg-violet-50 text-violet-700')
                    : isDark ? 'border-gray-600 hover:border-violet-500 text-gray-400' : 'border-gray-300 hover:border-violet-400 text-gray-400'
                }`}>
                <Upload className="w-7 h-7" />
                <span className="text-sm font-medium">Cliquer ou glisser-déposer des images</span>
                <span className="text-xs">JPG, PNG, WebP</span>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={onFile} />

              <div className="flex gap-2">
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUrl()}
                  placeholder="Ou coller une URL d'image…" className={`${inp} flex-1`} />
                <button onClick={addUrl} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700">
                  Ajouter
                </button>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <motion.div
                      key={i}
                      layout
                      draggable
                      onDragStart={() => setDragPhotoIndex(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragPhotoIndex === null) return;
                        movePhoto(dragPhotoIndex, i);
                        setDragPhotoIndex(null);
                      }}
                      whileHover={{ scale: 1.02 }}
                      className={`relative group aspect-square rounded-xl overflow-hidden border ${dragPhotoIndex === i ? 'border-violet-500' : 'border-gray-300/20'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">Principale</span>}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 ${sub}`}>
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
                  <p className="text-xs">Aucune photo — vous pouvez continuer sans</p>
                </div>
              )}
              <p className={`text-[11px] ${sub}`}>Photos: {images.length}/12</p>
              {images.length > 1 && (
                <p className={`text-[11px] ${sub}`}>Astuce: glissez-déposez une photo pour réorganiser l&apos;ordre.</p>
              )}
            </motion.div>
          )}

          {/* ÉTAPE 3 — Description + Récap */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className={`block text-xs font-semibold ${sub}`}>Description de l&apos;annonce</label>
                  <motion.button
                    type="button"
                    onClick={() => setDescription(suggestedDescription)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${isDark ? 'border-violet-700 text-violet-200 hover:bg-violet-900/30' : 'border-violet-200 text-violet-700 hover:bg-violet-50'}`}
                  >
                    <WandSparkles className="w-3 h-3" />
                    Générer une suggestion
                  </motion.button>
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder={`Décrivez votre logement : ambiance, équipements, quartier, points forts…`}
                  className={`${inp} resize-none`}
                />
                <p className={`text-xs mt-1 ${sub}`}>{description.length} caractères</p>
                {!description.trim() && (
                  <div className={`mt-2 p-3 rounded-xl border text-xs leading-relaxed ${isDark ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <span className="font-semibold">Suggestion :</span> {suggestedDescription}
                  </div>
                )}
              </div>

              {/* Récapitulatif */}
              <div className={`rounded-xl border p-4 ${card}`}>
                <h3 className={`font-semibold text-sm mb-2 ${text}`}>📋 Récapitulatif</h3>
                <div className={`grid grid-cols-2 gap-x-4 gap-y-1 text-xs ${sub}`}>
                  <span><strong>Nom :</strong> {name}</span>
                  <span><strong>Ville :</strong> {city}</span>
                  <span><strong>Type :</strong> {PROPERTY_TYPES.find(p => p.value === type)?.label}</span>
                  <span><strong>Capacité :</strong> {maxGuests} voyageurs</span>
                  <span><strong>Chambres :</strong> {bedrooms} · Sdb : {bathrooms}</span>
                  <span><strong>Prix/nuit :</strong> {price}€ (+{cleaningFee}€ ménage)</span>
                  <span><strong>Photos :</strong> {images.length}</span>
                  <span><strong>Équipements :</strong> {amenities.length}</span>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t ${border}`}>
          <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.98 }} onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Annuler' : 'Retour'}
          </motion.button>

          <span className={`text-xs ${sub}`}>{step + 1} / {STEPS.length}</span>

          {step < STEPS.length - 1 ? (
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={goNext} disabled={!canNext && showValidation}
              className="flex items-center gap-1 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 transition-all">
              Suivant <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 shadow">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création…</>
                : <><CheckCircle2 className="w-4 h-4" /> Créer l&apos;annonce</>
              }
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
