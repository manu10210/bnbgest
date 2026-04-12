'use client';

/**
 * 🏠 NewPropertyWizard — Mini configurateur déclenché par GmailImporter
 * quand un nouveau logement est détecté dans les emails Airbnb.
 * Wizard 4 étapes : Info → Capacité/Prix → Photos → Description
 */

import React, { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useBNB } from '../contexts/BNBContext';
import type { Property } from '../contexts/BNBContext';
import {
  X, ChevronRight, ChevronLeft, CheckCircle2, Upload,
  Trash2, Bed, Bath, Users, DollarSign, Clock,
  Sparkles, Image as ImageIcon, AlertTriangle, MapPin,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedPropertyInfo {
  rawName: string;
  guessedType: Property['type'];
  guessedBedrooms: number;
  guessedMaxGuests: number;
  guessedPricePerNight: number;
}

interface Props {
  detected: DetectedPropertyInfo;
  onClose: () => void;
  /** Appelé avec le nom du logement créé */
  onCreated: (propertyName: string) => void;
}

// ─── Analyse automatique du titre Airbnb ─────────────────────────────────────

export function analyzeAirbnbTitle(title: string): DetectedPropertyInfo {
  const t = title.toLowerCase();

  let guessedType: Property['type'] = 'apartment';
  if (/maison|house|pavillon|villa/.test(t)) guessedType = 'house';
  else if (/studio|studette/.test(t)) guessedType = 'studio';
  else if (/chambre|room/.test(t)) guessedType = 'room';
  else if (/villa/.test(t)) guessedType = 'villa';

  let guessedBedrooms = 1;
  const m = t.match(/t(\d)|(\d)\s*(chambre|bedroom|pi[eè]ce)/);
  if (m) {
    const n = parseInt(m[1] || m[2]);
    if (n >= 1 && n <= 8) guessedBedrooms = n;
  }

  return {
    rawName: title,
    guessedType,
    guessedBedrooms,
    guessedMaxGuests: Math.min(guessedBedrooms * 2, 10),
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

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NewPropertyWizard({ detected, onClose, onCreated }: Props) {
  const { isDark } = useTheme();
  const { addProperty } = useBNB();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Champs
  const [name, setName] = useState(detected.rawName);
  const [city, setCity] = useState('');
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

  // Validation
  const canNext = step === 0 ? name.trim().length > 1 && city.trim().length > 1
                : step === 1 ? price > 0 && maxGuests > 0
                : true;

  // Photos
  const addUrl = () => {
    const u = urlInput.trim();
    if (u && !images.includes(u)) { setImages(p => [...p, u]); setUrlInput(''); }
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(f => {
      const r = new FileReader();
      r.onload = ev => { if (ev.target?.result) setImages(p => [...p, ev.target!.result as string]); };
      r.readAsDataURL(f);
    });
  };

  // Sauvegarde
  const save = () => {
    setSaving(true);
    addProperty({
      name: name.trim(),
      address: address.trim() || `${city.trim()}, ${country}`,
      city: city.trim(),
      country,
      type,
      bedrooms,
      bathrooms,
      maxGuests,
      amenities,
      price,
      description: description.trim() || `Logement importé depuis Airbnb : ${name.trim()}`,
      images,
      status: 'active',
      ownerId: 1,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      cleaningFee,
      securityDeposit: 0,
      minimumStay: minStay,
      availabilityCalendar: [],
    });
    setTimeout(() => { setSaving(false); onCreated(name.trim()); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={`relative w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${bg}`}>

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
          <button onClick={onClose} className={`p-1.5 rounded-lg hover:bg-gray-100/10 ${sub}`}><X className="w-5 h-5" /></button>
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

        {/* Bandeau logement détecté */}
        <div className={`mx-5 mt-3 p-3 rounded-xl border flex items-start gap-2 text-xs ${isDark ? 'bg-violet-900/30 border-violet-700 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Logement extrait de vos emails : <strong>&ldquo;{detected.rawName}&rdquo;</strong></span>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ÉTAPE 0 — Infos de base */}
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Nom de l&apos;annonce *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex : Maison de ville avec terrasse" className={inp} />
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
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub}`}>Pays</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Adresse (optionnel)</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Ex : 12 rue de la Paix" className={inp} />
              </div>
            </div>
          )}

          {/* ÉTAPE 1 — Capacité & Prix */}
          {step === 1 && (
            <div className="space-y-3">
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${sub} flex items-center gap-1`}><DollarSign className="w-3 h-3" /> Prix / nuit (€) *</label>
                  <input type="number" min={1} value={price} onChange={e => setPrice(+e.target.value)} className={inp} />
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

              <div>
                <label className={`block text-xs font-semibold mb-2 ${sub}`}>Équipements</label>
                <div className="flex flex-wrap gap-1.5">
                  {AMENITIES.map(a => (
                    <button key={a} onClick={() => setAmenities(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a])}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        amenities.includes(a) ? 'bg-violet-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Photos */}
          {step === 2 && (
            <div className="space-y-3">
              <p className={`text-sm ${sub}`}>Ajoutez des photos (vous pourrez en ajouter d'autres plus tard depuis la gestion des propriétés).</p>

              <div
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                  isDark ? 'border-gray-600 hover:border-violet-500 text-gray-400' : 'border-gray-300 hover:border-violet-400 text-gray-400'
                }`}>
                <Upload className="w-7 h-7" />
                <span className="text-sm font-medium">Cliquer ou glisser pour uploader</span>
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
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-300/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded">Principale</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 ${sub}`}>
                  <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-30" />
                  <p className="text-xs">Aucune photo — vous pouvez continuer sans</p>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 — Description + Récap */}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${sub}`}>Description de l&apos;annonce</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder={`Décrivez votre logement : ambiance, équipements, quartier, points forts…`}
                  className={`${inp} resize-none`}
                />
                <p className={`text-xs mt-1 ${sub}`}>{description.length} caractères</p>
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between p-4 border-t ${border}`}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? 'Annuler' : 'Retour'}
          </button>

          <span className={`text-xs ${sub}`}>{step + 1} / {STEPS.length}</span>

          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              className="flex items-center gap-1 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 transition-all">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 shadow">
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Création…</>
                : <><CheckCircle2 className="w-4 h-4" /> Créer l&apos;annonce</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
