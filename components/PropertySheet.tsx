'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useBNB, Property } from '../contexts/BNBContext';

// ── Moteur de génération de descriptions ──────────────────────────────────────

type DescriptionStyle = 'airbnb' | 'booking' | 'luxe' | 'concis' | 'seo';
type DescriptionLang = 'fr' | 'en' | 'de' | 'es';

const TYPE_LABELS: Record<string, Record<DescriptionLang, string>> = {
  apartment: { fr: 'appartement', en: 'apartment', de: 'Wohnung', es: 'apartamento' },
  house:     { fr: 'maison',      en: 'house',     de: 'Haus',    es: 'casa' },
  studio:    { fr: 'studio',      en: 'studio',    de: 'Studio',  es: 'estudio' },
  villa:     { fr: 'villa',       en: 'villa',     de: 'Villa',   es: 'villa' },
  room:      { fr: 'chambre',     en: 'room',      de: 'Zimmer',  es: 'habitación' },
};

function amenityLine(amenities: string[], lang: DescriptionLang): string {
  if (!amenities.length) return '';
  const list = amenities.slice(0, 7).join(', ') + (amenities.length > 7 ? (lang === 'fr' ? ` et ${amenities.length - 7} autres` : lang === 'en' ? ` and ${amenities.length - 7} more` : lang === 'de' ? ` und ${amenities.length - 7} weitere` : ` y ${amenities.length - 7} más`) : '');
  if (lang === 'fr') return `Équipements : ${list}.`;
  if (lang === 'en') return `Amenities include: ${list}.`;
  if (lang === 'de') return `Ausstattung: ${list}.`;
  return `Servicios: ${list}.`;
}

function generateDescription(p: Property, style: DescriptionStyle, lang: DescriptionLang, avgRating: number, reviewCount: number, occupancy: number): string {
  const type = TYPE_LABELS[p.type]?.[lang] ?? p.type;
  const am   = amenityLine(p.amenities, lang);
  const rat  = avgRating > 0 ? avgRating.toFixed(1) : '';

  // ── AIRBNB ──────────────────────────────────────────────────────────────────
  if (style === 'airbnb') {
    if (lang === 'fr') return [
      `✨ Bienvenue dans ${p.name} — ${type} idéal${p.type === 'villa' || p.type === 'house' ? 'e' : ''} situé${p.type === 'villa' || p.type === 'house' ? 'e' : ''} à ${p.city}.`, '',
      `ðŸ  L'ESPACE`,
      `Ce ${type} lumineux accueille jusqu'à ${p.maxGuests} voyageur${p.maxGuests > 1 ? 's' : ''} dans ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''} et ${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bain.${p.description ? ' ' + p.description : ''}`, '',
      `🎯 CE QUI VOUS ATTEND`,
      am, '',
      `📋 INFOS PRATIQUES`,
      `• Check-in : ${p.checkInTime} | Check-out : ${p.checkOutTime}`,
      `• Séjour min. : ${p.minimumStay} nuit${p.minimumStay > 1 ? 's' : ''}${p.maximumStay ? ` | max. : ${p.maximumStay} nuits` : ''}`,
      `• Frais de ménage : ${p.cleaningFee}€ | Caution : ${p.securityDeposit}€`,
      rat ? `• ⭐ Noté ${rat}/5 par ${reviewCount} voyageur${reviewCount > 1 ? 's' : ''}` : '',
      '', `ðŸ“ ${p.address}, ${p.city}, ${p.country}`,
    ].filter(Boolean).join('\n');

    if (lang === 'en') return [
      `✨ Welcome to ${p.name} — a charming ${type} in ${p.city}.`, '',
      `ðŸ  THE SPACE`,
      `This bright ${type} sleeps up to ${p.maxGuests} guest${p.maxGuests > 1 ? 's' : ''} across ${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''} and ${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}.${p.description ? ' ' + p.description : ''}`, '',
      `🎯 WHAT'S INCLUDED`, am, '',
      `📋 PRACTICAL INFO`,
      `• Check-in: ${p.checkInTime} | Check-out: ${p.checkOutTime}`,
      `• Min. stay: ${p.minimumStay} night${p.minimumStay > 1 ? 's' : ''}${p.maximumStay ? ` | Max: ${p.maximumStay}` : ''}`,
      `• Cleaning fee: €${p.cleaningFee} | Security deposit: €${p.securityDeposit}`,
      rat ? `• ⭐ Rated ${rat}/5 by ${reviewCount} guest${reviewCount > 1 ? 's' : ''}` : '',
      '', `ðŸ“ ${p.address}, ${p.city}, ${p.country}`,
    ].filter(Boolean).join('\n');

    if (lang === 'de') return [
      `✨ Willkommen in ${p.name} — ein charmantes ${type} in ${p.city}.`, '',
      `ðŸ  DER RAUM`,
      `Dieses ${type} bietet Platz für bis zu ${p.maxGuests} Gast${p.maxGuests > 1 ? 'e' : ''} mit ${p.bedrooms} Schlafzimmer${p.bedrooms > 1 ? 'n' : ''} und ${p.bathrooms} Badezimmer${p.bathrooms > 1 ? 'n' : ''}.${p.description ? ' ' + p.description : ''}`, '',
      `🎯 AUSSTATTUNG`, am, '',
      `📋 PRAKTISCHE INFOS`,
      `• Check-in: ${p.checkInTime} | Check-out: ${p.checkOutTime}`,
      `• Mindestaufenthalt: ${p.minimumStay} Nacht${p.minimumStay > 1 ? 'nächte' : ''}`,
      `• Reinigungsgebühr: ${p.cleaningFee}€ | Kaution: ${p.securityDeposit}€`,
      rat ? `• ⭐ Bewertet mit ${rat}/5 von ${reviewCount} Gästen` : '',
    ].filter(Boolean).join('\n');

    return [
      `✨ Bienvenido a ${p.name} — un ${type} encantador en ${p.city}.`, '',
      `ðŸ  EL ESPACIO`,
      `Este ${type} aloja hasta ${p.maxGuests} huésped${p.maxGuests > 1 ? 'es' : ''} con ${p.bedrooms} habitación${p.bedrooms > 1 ? 'es' : ''} y ${p.bathrooms} baño${p.bathrooms > 1 ? 's' : ''}.${p.description ? ' ' + p.description : ''}`, '',
      `🎯 LO QUE ENCONTRARÁS`, am, '',
      `📋 INFORMACIÓN PRÁCTICA`,
      `• Check-in: ${p.checkInTime} | Check-out: ${p.checkOutTime}`,
      `• Estancia mínima: ${p.minimumStay} noche${p.minimumStay > 1 ? 's' : ''}`,
      `• Limpieza: ${p.cleaningFee}€ | Depósito: ${p.securityDeposit}€`,
      rat ? `• ⭐ Valorado ${rat}/5 por ${reviewCount} huéspedes` : '',
    ].filter(Boolean).join('\n');
  }

  // ── BOOKING ─────────────────────────────────────────────────────────────────
  if (style === 'booking') {
    const intro: Record<DescriptionLang, string> = {
      fr: `${p.name} est un${p.type === 'villa' || p.type === 'house' || p.type === 'room' ? 'e' : ''} ${type} situé${p.type === 'villa' || p.type === 'house' ? 'e' : ''} à ${p.city}, ${p.country}. L'hébergement accueille jusqu'à ${p.maxGuests} personne${p.maxGuests > 1 ? 's' : ''} avec ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''} et ${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bain.`,
      en: `${p.name} is a ${type} located in ${p.city}, ${p.country}. It accommodates up to ${p.maxGuests} guest${p.maxGuests > 1 ? 's' : ''} with ${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''} and ${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}.`,
      de: `${p.name} ist ein ${type} in ${p.city}, ${p.country}. Es bietet Platz für bis zu ${p.maxGuests} Gast${p.maxGuests > 1 ? 'e' : ''} mit ${p.bedrooms} Schlafzimmer${p.bedrooms > 1 ? 'n' : ''} und ${p.bathrooms} Bad${p.bathrooms > 1 ? 'ezimmern' : 'ezimmer'}.`,
      es: `${p.name} es un ${type} situado en ${p.city}, ${p.country}. Tiene capacidad para ${p.maxGuests} huésped${p.maxGuests > 1 ? 'es' : ''} con ${p.bedrooms} habitación${p.bedrooms > 1 ? 'es' : ''} y ${p.bathrooms} baño${p.bathrooms > 1 ? 's' : ''}.`,
    };
    const arrival: Record<DescriptionLang, string> = {
      fr: `Arrivée à partir de ${p.checkInTime}, départ avant ${p.checkOutTime}. Séjour minimum : ${p.minimumStay} nuit${p.minimumStay > 1 ? 's' : ''}. Frais de ménage : ${p.cleaningFee}€. Caution : ${p.securityDeposit}€.`,
      en: `Check-in from ${p.checkInTime}, check-out by ${p.checkOutTime}. Minimum stay: ${p.minimumStay} night${p.minimumStay > 1 ? 's' : ''}. Cleaning fee: €${p.cleaningFee}. Security deposit: €${p.securityDeposit}.`,
      de: `Check-in ab ${p.checkInTime}, Check-out bis ${p.checkOutTime}. Mindestaufenthalt: ${p.minimumStay} Nacht${p.minimumStay > 1 ? 'nächte' : ''}. Reinigungsgebühr: ${p.cleaningFee}€. Kaution: ${p.securityDeposit}€.`,
      es: `Llegada a partir de las ${p.checkInTime}, salida antes de las ${p.checkOutTime}. Estancia mínima: ${p.minimumStay} noche${p.minimumStay > 1 ? 's' : ''}. Limpieza: ${p.cleaningFee}€. Depósito: ${p.securityDeposit}€.`,
    };
    const ratLine: Record<DescriptionLang, string> = {
      fr: rat ? `Note globale : ${rat}/5 sur ${reviewCount} commentaire${reviewCount > 1 ? 's' : ''} vérifiés. Taux d'occupation : ${Math.round(occupancy)}%.` : '',
      en: rat ? `Overall rating: ${rat}/5 based on ${reviewCount} verified review${reviewCount > 1 ? 's' : ''}. Occupancy rate: ${Math.round(occupancy)}%.` : '',
      de: rat ? `Gesamtbewertung: ${rat}/5 aus ${reviewCount} verifizierten Bewertungen. Belegungsrate: ${Math.round(occupancy)}%.` : '',
      es: rat ? `Valoración: ${rat}/5 basada en ${reviewCount} reseña${reviewCount > 1 ? 's' : ''} verificada${reviewCount > 1 ? 's' : ''}. Tasa de ocupación: ${Math.round(occupancy)}%.` : '',
    };
    return [intro[lang], '', p.description || '', '', am, '', arrival[lang], ratLine[lang]].filter(Boolean).join('\n');
  }

  // ── LUXE ────────────────────────────────────────────────────────────────────
  if (style === 'luxe') {
    if (lang === 'fr') return [
      `― ${p.name} ―`, '',
      `Niché${p.type === 'villa' || p.type === 'house' ? 'e' : ''} au cœur de ${p.city}, ${p.name} est une invitation à l'art de vivre. Ce ${type} d'exception réunit élégance et confort pour ${p.maxGuests} voyageur${p.maxGuests > 1 ? 's' : ''} exigeant${p.maxGuests > 1 ? 's' : ''}.`, '',
      `Ses ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''} et ${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bain ont été pensées avec soin pour offrir une expérience inoubliable.`, '',
      p.description || '',
      p.amenities.length > 0 ? `Les équipements haut de gamme incluent : ${p.amenities.join(', ')}.` : '', '',
      `Tarif : ${p.price}€ / nuit  ·  Ménage : ${p.cleaningFee}€  ·  Caution : ${p.securityDeposit}€`,
      `Accueil dès ${p.checkInTime}  ·  Départ avant ${p.checkOutTime}`,
      rat ? `\n⭐ Excellence reconnue : ${rat}/5 — ${reviewCount} avis de voyageurs satisfaits` : '',
    ].filter(Boolean).join('\n');
    return [
      `― ${p.name} ―`, '',
      `Nestled in ${p.city}, ${p.name} is more than an accommodation — it is an invitation to the art of living. This exceptional ${type} blends elegance and comfort for ${p.maxGuests} discerning guest${p.maxGuests > 1 ? 's' : ''}.`, '',
      `Featuring ${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''} and ${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}, every detail has been thoughtfully curated.`, '',
      p.description || '',
      p.amenities.length > 0 ? `Premium amenities: ${p.amenities.join(', ')}.` : '', '',
      `Rate: €${p.price}/night  ·  Cleaning: €${p.cleaningFee}  ·  Deposit: €${p.securityDeposit}`,
      rat ? `\n⭐ Rated ${rat}/5 — ${reviewCount} exceptional review${reviewCount > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join('\n');
  }

  // ── CONCIS ──────────────────────────────────────────────────────────────────
  if (style === 'concis') {
    const labels: Record<DescriptionLang, [string, string, string, string, string]> = {
      fr: ['ch.', 'SdB', 'pers.', 'nuit', 'avis'],
      en: ['bed', 'bath', 'guests', 'night', 'reviews'],
      de: ['Zi.', 'Bad', 'Gäste', 'Nacht', 'Bewert.'],
      es: ['hab.', 'baño', 'huésp.', 'noche', 'reseñas'],
    };
    const [lb, lba, lg, ln, lrev] = labels[lang];
    return [
      `${p.name} — ${type} · ${p.city}`,
      `${p.bedrooms} ${lb} · ${p.bathrooms} ${lba} · ${p.maxGuests} ${lg} · ${p.price}€/${ln}`,
      p.amenities.length > 0 ? p.amenities.slice(0, 8).join(' · ') : '',
      `Check-in ${p.checkInTime} / Check-out ${p.checkOutTime} · Min. ${p.minimumStay} ${ln}${p.minimumStay > 1 ? 's' : ''}`,
      rat ? `⭐ ${rat}/5 (${reviewCount} ${lrev})` : '',
    ].filter(Boolean).join('\n');
  }

  // ── SEO ─────────────────────────────────────────────────────────────────────
  if (lang === 'fr') return [
    `${p.name} | Location ${type} ${p.city} — ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''} · ${p.maxGuests} personnes`, '',
    `Réservez ${p.name}, un${p.type === 'villa' || p.type === 'house' || p.type === 'room' ? 'e' : ''} ${type} à ${p.city} (${p.country}) pour ${p.maxGuests} voyageur${p.maxGuests > 1 ? 's' : ''}. ${p.bedrooms} chambre${p.bedrooms > 1 ? 's' : ''}, ${p.bathrooms} salle${p.bathrooms > 1 ? 's' : ''} de bain, à partir de ${p.price}€/nuit.`, '',
    p.description || '', '',
    p.amenities.length > 0 ? `Équipements : ${p.amenities.join(', ')}.` : '', '',
    `Mots-clés : location vacances ${p.city} · ${type} ${p.city} · hébergement ${p.city} ${p.country}`,
    `${p.bedrooms} chambres · ${p.bathrooms} SdB · ${p.maxGuests} personnes · ${p.price}€/nuit`,
    rat ? `Note : ${rat}/5 — ${reviewCount} avis vérifiés` : '',
  ].filter(Boolean).join('\n');
  return [
    `${p.name} | ${type} rental ${p.city} — ${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''} · ${p.maxGuests} guests`, '',
    `Book ${p.name}, a ${type} in ${p.city}, ${p.country} for ${p.maxGuests} guest${p.maxGuests > 1 ? 's' : ''}. ${p.bedrooms} bedroom${p.bedrooms > 1 ? 's' : ''}, ${p.bathrooms} bathroom${p.bathrooms > 1 ? 's' : ''}, from €${p.price}/night.`, '',
    p.description || '', '',
    p.amenities.length > 0 ? `Amenities: ${p.amenities.join(', ')}.` : '', '',
    `Keywords: vacation rental ${p.city} · ${type} ${p.city} · accommodation ${p.city} ${p.country}`,
    rat ? `Rating: ${rat}/5 — ${reviewCount} verified review${reviewCount > 1 ? 's' : ''}` : '',
  ].filter(Boolean).join('\n');
}

interface PropertySheetProps {
  propertyId: number;
  onClose: () => void;
  onEdit: () => void;
}

export default function PropertySheet({ propertyId, onClose, onEdit }: PropertySheetProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ── Générateur de descriptions ──────────────────────────────────────────
  const [genStyle, setGenStyle] = useState<DescriptionStyle>('airbnb');
  const [genLang, setGenLang]   = useState<DescriptionLang>('fr');
  const [genText, setGenText]   = useState('');
  const [genOpen, setGenOpen]   = useState(false);
  const [copied, setCopied]     = useState(false);

  // ── Paramètres pratiques éditables ──────────────────────────────────────
  const [editingParams, setEditingParams] = useState(false);
  const [paramsSaved, setParamsSaved]     = useState(false);
  const [syncingIcal, setSyncingIcal]     = useState(false);
  const [syncMessage, setSyncMessage]     = useState<string | null>(null);

  const {
    getProperty,
    getBookingsByProperty,
    getMaintenanceTasksByProperty,
    getInventoryByProperty,
    getReviewsByProperty,
    getAverageRating,
    getOccupancyRate,
    getRevenueByProperty,
    updateProperty,
    guests,
  } = useBNB();

  const property = getProperty(propertyId);

  // ── État local des paramètres pratiques ──────────────────────────────────
  // Tous les hooks AVANT tout return anticipé (Rules of Hooks)
  const [params, setParams] = useState({
    checkInTime:     property?.checkInTime     ?? '14:00',
    checkOutTime:    property?.checkOutTime    ?? '11:00',
    cleaningFee:     property?.cleaningFee     ?? 0,
    securityDeposit: property?.securityDeposit ?? 0,
    minimumStay:     property?.minimumStay     ?? 1,
    maximumStay:     (property?.maximumStay    ?? '') as number | '',
    price:           property?.price           ?? 0,
    icalUrl:         property?.icalUrl         ?? '',
  });

  const handleSaveParams = useCallback(() => {
    updateProperty(propertyId, {
      checkInTime:     params.checkInTime,
      checkOutTime:    params.checkOutTime,
      cleaningFee:     Number(params.cleaningFee),
      securityDeposit: Number(params.securityDeposit),
      minimumStay:     Number(params.minimumStay),
      maximumStay:     params.maximumStay !== '' ? Number(params.maximumStay) : undefined,
      price:           Number(params.price),
      icalUrl:         params.icalUrl.trim(),
    });
    setEditingParams(false);
    setParamsSaved(true);
    setTimeout(() => setParamsSaved(false), 2500);
  }, [updateProperty, propertyId, params]);

  const handleSyncIcal = useCallback(async () => {
    const trimmedIcalUrl = params.icalUrl.trim();
    if (!trimmedIcalUrl) {
      setSyncMessage('Veuillez renseigner une URL iCal avant de synchroniser.');
      setTimeout(() => setSyncMessage(null), 3500);
      return;
    }

    setSyncingIcal(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync/ical', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, icalUrl: trimmedIcalUrl }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        setSyncMessage(payload?.error || 'Échec de la synchronisation iCal.');
        return;
      }

      updateProperty(propertyId, { icalUrl: trimmedIcalUrl });
      const syncedCount = Number(payload?.syncedBookings || 0);
      setSyncMessage(`Synchronisation terminée : ${syncedCount} réservation(s) importée(s).`);
    } catch {
      setSyncMessage('Impossible de synchroniser pour le moment. Réessayez dans un instant.');
    } finally {
      setSyncingIcal(false);
      setTimeout(() => setSyncMessage(null), 4500);
    }
  }, [params.icalUrl, propertyId, updateProperty]);

  const handleGenerate = useCallback(() => {
    if (!property) return;
    const text = generateDescription(property, genStyle, genLang, avgRating, propertyReviews.length, occupancy);
    setGenText(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property, genStyle, genLang]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(genText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [genText]);

  // ── Return anticipé si propriété introuvable (après tous les hooks) ──────
  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="text-5xl mb-4">ðŸ </span>
        <p className="text-lg font-medium">Propriété introuvable</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors">
          â† Retour
        </button>
      </div>
    );
  }

  // Dates pour les calculs (12 derniers mois)
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const fromDate = yearAgo.toISOString().split('T')[0];
  const toDate = now.toISOString().split('T')[0];

  const propertyBookings = getBookingsByProperty(propertyId);
  const maintenanceTasks = getMaintenanceTasksByProperty(propertyId);
  const inventoryItems = getInventoryByProperty(propertyId);
  const propertyReviews = getReviewsByProperty(propertyId);
  const avgRating = getAverageRating(propertyId);
  const revenue12m = getRevenueByProperty(propertyId, fromDate, toDate);
  const occupancy = getOccupancyRate(propertyId, fromDate, toDate);

  const pendingTasks = maintenanceTasks.filter(t => t.status === 'pending');
  const inProgressTasks = maintenanceTasks.filter(t => t.status === 'in_progress');
  const completedTasks = maintenanceTasks.filter(t => t.status === 'completed');
  const lowStockItems = inventoryItems.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');

  const activeBookings = propertyBookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const recentBookings = [...propertyBookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const statusBadge = {
    active: { label: 'Actif', classes: 'bg-green-100 text-green-800' },
    inactive: { label: 'Inactif', classes: 'bg-gray-100 text-gray-600' },
    maintenance: { label: 'En maintenance', classes: 'bg-yellow-100 text-yellow-800' },
    blocked: { label: 'Bloqué', classes: 'bg-red-100 text-red-800' },
  }[property.status];

  const typeLabel: Record<string, string> = {
    apartment: 'Appartement',
    house: 'Maison',
    studio: 'Studio',
    villa: 'Villa',
    room: 'Chambre',
  };

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const categoryLabels: Record<string, string> = {
    cleaning: '🧹 Nettoyage',
    repair: '🔧 Réparation',
    inspection: 'ðŸ” Inspection',
    supplies: '📦 Fournitures',
    other: '📋 Autre',
  };

  const inventoryCategoryLabels: Record<string, string> = {
    bedding: '🛏️ Literie',
    towels: '🧺 Serviettes',
    kitchen: '🍳 Cuisine',
    bathroom: '🚿 Salle de bain',
    cleaning: '🧹 Nettoyage',
    electronics: '🔌 Électronique',
    furniture: '🪑 Mobilier',
    other: '📦 Autre',
  };

  return (
    <div className="space-y-8">
      {/* ── En-tête de la fiche ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] rounded-xl flex items-center justify-center text-white text-2xl shadow-lg">
            ðŸ 
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.name}</h2>
            <p className="text-gray-500">{property.address}, {property.city}, {property.country}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.classes}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs text-gray-400">{typeLabel[property.type] || property.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow text-sm font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Modifier</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Fermer la fiche</span>
          </button>
        </div>
      </div>

      {/* ── Galerie photos ────────────────────────────────────────────────── */}
      {property.images && property.images.length > 0 && (
        <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span>📷</span>
              <span>Photos ({property.images.length})</span>
            </span>
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {property.images.map((src, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <Image
                  src={src}
                  alt={`${property.name} — photo ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
                  className="object-cover group-hover:brightness-90 transition-all duration-200"
                  unoptimized={src.startsWith('blob:')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxIndex !== null && property.images && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Fermer */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Précédent */}
          {property.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + property.images.length) % property.images.length); }}
              className="absolute left-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {/* Image */}
          <div
            className="relative w-full max-w-4xl max-h-[85vh] aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={property.images[lightboxIndex]}
              alt={`${property.name} — photo ${lightboxIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain rounded-xl"
              unoptimized={property.images[lightboxIndex].startsWith('blob:')}
            />
          </div>
          {/* Suivant */}
          {property.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % property.images.length); }}
              className="absolute right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {/* Compteur */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm bg-black/40 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {property.images.length}
          </div>
          {/* Miniatures bas */}
          {property.images.length > 1 && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex space-x-2 max-w-[90vw] overflow-x-auto pb-1">
              {property.images.map((src, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === lightboxIndex ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'}`}
                >
                  <Image
                    src={src}
                    alt={`miniature ${i + 1}`}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                    unoptimized={src.startsWith('blob:')}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KPIs ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Revenus 12 mois */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">💶</span>
            <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Revenus 12 mois</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{revenue12m.toLocaleString('fr-FR')}€</p>
        </div>
        {/* Réservations */}
        <div className="bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 border border-[#FF385C]/10 rounded-xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">📅</span>
            <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Réservations</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{propertyBookings.length}</p>
          <p className="text-xs text-blue-600 mt-1">{activeBookings.length} en cours</p>
        </div>
        {/* Taux d'occupation */}
        <div className="bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 border border-[#FF385C]/10 rounded-xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">📊</span>
            <span className="text-xs font-medium text-violet-700 uppercase tracking-wide">Occupation</span>
          </div>
          <p className="text-2xl font-bold text-violet-800">{Math.round(occupancy)}%</p>
          <p className="text-xs text-violet-600 mt-1">sur 12 mois</p>
        </div>
        {/* Note moyenne */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 rounded-xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">⭐</span>
            <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Note moyenne</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">
            {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            {avgRating > 0 && <span className="text-base font-normal text-amber-600">/5</span>}
          </p>
          <p className="text-xs text-amber-600 mt-1">{propertyReviews.length} avis</p>
        </div>
        {/* Maintenance */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 rounded-xl p-5">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">🔧</span>
            <span className="text-xs font-medium text-rose-700 uppercase tracking-wide">Maintenance</span>
          </div>
          <p className="text-2xl font-bold text-rose-800">{pendingTasks.length + inProgressTasks.length}</p>
          <p className="text-xs text-rose-600 mt-1">
            {lowStockItems.length > 0 ? `⚠ï¸ ${lowStockItems.length} stock bas` : 'stock OK'}
          </p>
        </div>
      </div>

      {/* ── Informations propriété ─────────────────────────────────────────── */}
      <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <span>ðŸ </span><span>Informations</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-800">{property.bedrooms}</p>
            <p className="text-xs text-gray-500 mt-1">Chambre{property.bedrooms > 1 ? 's' : ''}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-800">{property.bathrooms}</p>
            <p className="text-xs text-gray-500 mt-1">Salle{property.bathrooms > 1 ? 's' : ''} de bain</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-800">{property.maxGuests}</p>
            <p className="text-xs text-gray-500 mt-1">Voyageurs max</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-600">{property.price}€</p>
            <p className="text-xs text-gray-500 mt-1">/ nuit</p>
          </div>
        </div>

        {/* ── Paramètres pratiques ── */}
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-700">📋 Infos pratiques</span>
              {paramsSaved && (
                <span className="flex items-center space-x-1 text-xs text-green-600 font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Enregistré</span>
                </span>
              )}
            </div>
            {!editingParams ? (
              <button
                onClick={() => setEditingParams(true)}
                className="flex items-center space-x-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15H9v-2z" /></svg>
                <span>Modifier</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setEditingParams(false); setParams({ checkInTime: property.checkInTime, checkOutTime: property.checkOutTime, cleaningFee: property.cleaningFee, securityDeposit: property.securityDeposit, minimumStay: property.minimumStay, maximumStay: property.maximumStay ?? '', price: property.price, icalUrl: property.icalUrl ?? '' }); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveParams}
                  className="flex items-center space-x-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span>Enregistrer</span>
                </button>
              </div>
            )}
          </div>

          {/* Contenu */}
          {!editingParams ? (
            /* Mode lecture */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-gray-100">
              {[
                { icon: '🕐', label: 'Check-in',       value: params.checkInTime },
                { icon: '🕐', label: 'Check-out',      value: params.checkOutTime },
                { icon: '📅', label: 'Séjour min.',    value: `${params.minimumStay} nuit${Number(params.minimumStay) > 1 ? 's' : ''}` },
                { icon: '💶', label: 'Prix / nuit',    value: `${params.price}€` },
                { icon: '🧹', label: 'Frais ménage',   value: `${params.cleaningFee}€` },
                { icon: '🔒', label: 'Caution',        value: `${params.securityDeposit}€` },
                { icon: '🔗', label: 'Flux iCal',      value: params.icalUrl || 'Non configuré' },
                ...(params.maximumStay !== '' ? [{ icon: '📆', label: 'Séjour max.', value: `${params.maximumStay} nuits` }] : []),
              ].map((row, i) => (
                <div key={i} className="flex items-center space-x-3 px-4 py-3">
                  <span className="text-base flex-shrink-0">{row.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{row.label}</p>
                    <p className="text-sm font-semibold text-gray-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Mode édition */
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Check-in */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">🕐 Check-in</label>
                <input
                  type="time"
                  value={params.checkInTime}
                  onChange={e => setParams(p => ({ ...p, checkInTime: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Check-out */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">🕐š Check-out</label>
                <input
                  type="time"
                  value={params.checkOutTime}
                  onChange={e => setParams(p => ({ ...p, checkOutTime: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Prix / nuit */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">💶 Prix / nuit (€)</label>
                <input
                  type="number"
                  min={0}
                  value={params.price}
                  onChange={e => setParams(p => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Frais ménage */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">🧹 Frais de ménage (€)</label>
                <input
                  type="number"
                  min={0}
                  value={params.cleaningFee}
                  onChange={e => setParams(p => ({ ...p, cleaningFee: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Caution */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">🔒 Caution (€)</label>
                <input
                  type="number"
                  min={0}
                  value={params.securityDeposit}
                  onChange={e => setParams(p => ({ ...p, securityDeposit: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Séjour min */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">📅 Séjour minimum (nuits)</label>
                <input
                  type="number"
                  min={1}
                  value={params.minimumStay}
                  onChange={e => setParams(p => ({ ...p, minimumStay: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* Séjour max (optionnel) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">📆 Séjour maximum (nuits, optionnel)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="Illimité"
                  value={params.maximumStay}
                  onChange={e => setParams(p => ({ ...p, maximumStay: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
              {/* URL iCal */}
              <div className="col-span-2 md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">🔗 URL iCal (Airbnb / Booking)</label>
                <input
                  type="url"
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  value={params.icalUrl}
                  onChange={e => setParams(p => ({ ...p, icalUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>
          )}

          <div className="px-4 pb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncIcal}
              disabled={syncingIcal || !params.icalUrl.trim()}
              className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncingIcal ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </button>
            {syncMessage && (
              <span className="text-xs text-gray-600">{syncMessage}</span>
            )}
          </div>
        </div>

        {property.amenities.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Équipements</p>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
        {property.description && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed">{property.description}</p>
          </div>
        )}
      </div>

      {/* ── Réservations ──────────────────────────────────────────────────── */}
      <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>📅</span><span>Réservations ({propertyBookings.length})</span>
          </span>
          {propertyBookings.length > 8 && (
            <span className="text-xs text-gray-400 font-normal">8 dernières affichées</span>
          )}
        </h3>
        {recentBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-sm">Aucune réservation pour cette propriété</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentBookings.map(booking => {
              const guest = guests.find(g => g.id === booking.guestId);
              const nights = Math.max(1, Math.round((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={booking.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#FF385C] to-[#E31C5F] rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {booking.guestInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{booking.guestInfo.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(booking.checkIn).toLocaleDateString('fr-FR')} → {new Date(booking.checkOut).toLocaleDateString('fr-FR')} · {nights} nuit{nights > 1 ? 's' : ''}
                        {guest && <span className="ml-1 text-gray-400">· {guest.email}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <span className="font-semibold text-emerald-600 text-sm">{booking.totalPrice.toLocaleString('fr-FR')}€</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {booking.status === 'confirmed' ? 'Confirmée' :
                       booking.status === 'pending' ? 'En attente' :
                       booking.status === 'cancelled' ? 'Annulée' :
                       booking.status === 'completed' ? 'Terminée' : 'No show'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Maintenance ───────────────────────────────────────────────────── */}
      <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <span>🔧</span>
          <span>Maintenance ({maintenanceTasks.length})</span>
          <span className="flex items-center space-x-1 ml-auto">
            {pendingTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                {pendingTasks.length} en attente
              </span>
            )}
            {inProgressTasks.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                {inProgressTasks.length} en cours
              </span>
            )}
          </span>
        </h3>
        {maintenanceTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">✅</span>
            <p className="text-sm">Aucune tâche de maintenance</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* En cours / En attente en premier */}
            {[...pendingTasks, ...inProgressTasks, ...completedTasks.slice(0, 3)].map(task => (
              <div key={task.id} className={`rounded-xl p-4 border ${
                task.status === 'in_progress' ? 'bg-blue-50 border-blue-100' :
                task.status === 'pending' ? 'bg-yellow-50 border-yellow-100' :
                'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs">{categoryLabels[task.category]}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                        {task.priority === 'urgent' ? '🔴 Urgent' :
                         task.priority === 'high' ? 'ðŸŸ  Haute' :
                         task.priority === 'medium' ? '🟡 Moyenne' : '🟢 Faible'}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Prévu: {new Date(task.scheduledDate).toLocaleDateString('fr-FR')}
                      {task.estimatedCost > 0 && ` · Estimé: ${task.estimatedCost}€`}
                      {task.actualCost !== undefined && ` · Réel: ${task.actualCost}€`}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {task.status === 'completed' ? '✓ Terminé' :
                     task.status === 'in_progress' ? '▶ En cours' :
                     task.status === 'pending' ? '⏳ En attente' : '✗ Annulé'}
                  </span>
                </div>
              </div>
            ))}
            {completedTasks.length > 3 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                + {completedTasks.length - 3} tâche{completedTasks.length - 3 > 1 ? 's' : ''} terminée{completedTasks.length - 3 > 1 ? 's' : ''} non affichée{completedTasks.length - 3 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Inventaire ────────────────────────────────────────────────────── */}
      <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>📦</span>
            <span>Inventaire ({inventoryItems.length})</span>
          </span>
          {lowStockItems.length > 0 && (
            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
              ⚠ï¸ {lowStockItems.length} en stock bas
            </span>
          )}
        </h3>
        {inventoryItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-sm">Aucun article en inventaire</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventoryItems.map(item => (
              <div key={item.id} className={`rounded-xl p-4 border ${
                item.status === 'out_of_stock' ? 'bg-red-50 border-red-200' :
                item.status === 'low_stock' ? 'bg-orange-50 border-orange-200' :
                item.status === 'expired' ? 'bg-rose-50 border-rose-200' :
                'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">{inventoryCategoryLabels[item.category] || item.category}</p>
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.location}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-lg font-bold ${
                      item.status === 'out_of_stock' ? 'text-red-600' :
                      item.status === 'low_stock' ? 'text-orange-600' :
                      'text-gray-800'
                    }`}>
                      {item.quantity}
                    </p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'in_stock' ? 'bg-green-100 text-green-800' :
                    item.status === 'low_stock' ? 'bg-orange-100 text-orange-800' :
                    item.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {item.status === 'in_stock' ? '✓ En stock' :
                     item.status === 'low_stock' ? '⚠ Stock bas' :
                     item.status === 'out_of_stock' ? '✗ Rupture' : '⏰ Expiré'}
                  </span>
                  <span className="text-xs text-gray-400">min. {item.minimumQuantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Avis clients ──────────────────────────────────────────────────── */}
      <div className="bg-white/80 rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <span>⭐</span>
            <span>Avis clients ({propertyReviews.length})</span>
          </span>
          {avgRating > 0 && (
            <span className="flex items-center space-x-1 text-amber-600 font-semibold">
              <span>{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</span>
              <span className="text-sm">{avgRating.toFixed(1)}/5</span>
            </span>
          )}
        </h3>
        {propertyReviews.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-3xl block mb-2">💬</span>
            <p className="text-sm">Aucun avis pour cette propriété</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...propertyReviews]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(review => {
                const reviewer = guests.find(g => g.id === review.guestId);
                return (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {reviewer ? reviewer.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{reviewer?.name ?? `Client #${review.guestId}`}</p>
                          <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-amber-400 text-sm">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        <span className="text-xs text-gray-500 font-medium">{review.rating}/5</span>
                      </div>
                    </div>
                    {review.title && <p className="font-medium text-gray-800 text-sm mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                    {review.response && (
                      <div className="mt-3 pl-3 border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg py-2 pr-2">
                        <p className="text-xs font-medium text-blue-700 mb-1">Réponse du propriétaire</p>
                        <p className="text-xs text-gray-600">{review.response.message}</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ── Générateur de description ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#FF385C]/5 to-[#FF385C]/10 rounded-xl border border-[#FF385C]/10 shadow-sm overflow-hidden">
        {/* Titre cliquable pour ouvrir/fermer */}
        <button
          onClick={() => setGenOpen(v => !v)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-violet-100/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">âœï¸</span>
            <div>
              <h3 className="text-lg font-bold text-violet-900">Générateur de description</h3>
              <p className="text-xs text-violet-600 mt-0.5">Crée une annonce à partir des informations de la fiche</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-violet-500 transition-transform duration-200 ${genOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {genOpen && (
          <div className="px-6 pb-6 space-y-5 border-t border-[#FF385C]/10">
            {/* Paramètres */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              {/* Style */}
              <div>
                <label className="block text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Style</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {([
                    { id: 'airbnb',  label: '🏠 Airbnb',       desc: 'Sections structurées avec emojis' },
                    { id: 'booking', label: '🌐 Booking.com',  desc: 'Neutre et factuel' },
                    { id: 'luxe',    label: '✨ Prestige',      desc: 'Ton élégant et haut de gamme' },
                    { id: 'concis',  label: '⚡ Concis',        desc: 'Résumé en 4 lignes' },
                    { id: 'seo',     label: '🔍 SEO',           desc: 'Optimisé moteurs de recherche' },
                  ] as { id: DescriptionStyle; label: string; desc: string }[]).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setGenStyle(s.id)}
                      className={`flex items-start px-3 py-2 rounded-lg border text-left transition-all ${genStyle === s.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 hover:border-violet-300 text-gray-700'}`}
                    >
                      <span className={`text-sm font-semibold whitespace-nowrap ${genStyle === s.id ? 'text-white' : 'text-gray-800'}`}>{s.label}</span>
                      <span className={`text-xs ml-2 mt-0.5 ${genStyle === s.id ? 'text-violet-200' : 'text-gray-400'}`}>{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Langue */}
              <div>
                <label className="block text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Langue</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {([
                    { id: 'fr', label: '🇫🇷 Français' },
                    { id: 'en', label: '🇬🇧 English' },
                    { id: 'de', label: '🇩🇪 Deutsch' },
                    { id: 'es', label: '🇪🇸 Español' },
                  ] as { id: DescriptionLang; label: string }[]).map(l => (
                    <button
                      key={l.id}
                      onClick={() => setGenLang(l.id)}
                      className={`px-3 py-2 rounded-lg border text-left text-sm font-medium transition-all ${genLang === l.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-gray-200 hover:border-violet-300 text-gray-700'}`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                {/* Récap des données utilisées */}
                <div className="mt-4 p-3 bg-white/70 rounded-xl border border-[#FF385C]/10 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600 mb-1.5">Données intégrées :</p>
                  <p>🏠 {property.name} · {TYPE_LABELS[property.type]?.fr ?? property.type}</p>
                  <p>🛏️ {property.bedrooms} ch. · 🚿 {property.bathrooms} SdB · 👥 {property.maxGuests} pers.</p>
                  <p>💶 {property.price}€/nuit · 🧹 {property.cleaningFee}€ ménage</p>
                  {property.amenities.length > 0 && <p>✅ {property.amenities.length} équipement{property.amenities.length > 1 ? 's' : ''}</p>}
                  {avgRating > 0 && <p>⭐ {avgRating.toFixed(1)}/5 · {propertyReviews.length} avis</p>}
                  {occupancy > 0 && <p>📊 {Math.round(occupancy)}% d&apos;occupation</p>}
                </div>
              </div>
            </div>

            {/* Bouton générer */}
            <button
              onClick={handleGenerate}
              className="w-full py-3 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] text-white rounded-xl font-semibold hover:bg-[#E31C5F] transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Générer la description</span>
            </button>

            {/* Zone résultat */}
            {genText && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Description générée</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{genText.length} caractères</span>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'}`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          <span>Copié !</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          <span>Copier</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  value={genText}
                  onChange={e => setGenText(e.target.value)}
                  rows={18}
                  className="w-full px-4 py-3 bg-white border border-violet-200 rounded-xl text-sm text-gray-700 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-400 resize-y shadow-sm"
                  placeholder="La description apparaîtra ici..."
                />
                <p className="text-xs text-gray-400">💡 Vous pouvez modifier le texte directement avant de le copier.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

