'use client';

/**
 * 📧 GmailImporter — Importation automatique des réservations Airbnb depuis Gmail
 */

import React, { useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Mail, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, Search, Calendar,
  Users, DollarSign, Home, Zap, Filter, Info, Sparkles,
} from 'lucide-react';
import NewPropertyWizard, {
  analyzeAirbnbTitle,
  findNewPropertyNames,
  type DetectedPropertyInfo,
} from './NewPropertyWizard';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedBooking {
  source: 'gmail';
  messageId: string;
  subject: string;
  receivedAt: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guests: number;
  guestCountry?: string;
  guestLanguage?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  checkInTime?: string;    // Heure d'arrivée (ex: "15:00")
  checkOutTime?: string;   // Heure de départ (ex: "11:00")
  totalPrice: number;
  currency: string;
  nightlyRate?: number;    // Prix par nuit
  cleaningFee?: number;
  serviceFee?: number;
  taxAmount?: number;      // Taxes
  hostPayout?: number;
  propertyName?: string;
  confirmationCode?: string;
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  confidence: number;
  reviewRating?: number;
  reviewComment?: string;
}

type SyncStatus = 'idle' | 'checking' | 'syncing' | 'done' | 'error';
type FilterType = 'all' | 'new' | 'cancelled';

// ─── Composant ParseField — affiche un champ extrait par le parser ────────────
// Affiche uniquement si value est défini et non vide.
// highlight : couleur du badge de valeur (green, amber, red, blue)
// mono      : police monospace (pour codes, IDs)
// badge     : pour les types (bookingType)
function ParseField({ label, value, isDark, highlight, mono, badge }: {
  label: string;
  value: string | undefined | null;
  isDark: boolean;
  highlight?: 'green' | 'amber' | 'red' | 'blue';
  mono?: boolean;
  badge?: { label: string; color: string };
}) {
  if (value === undefined || value === null || value === '') return null;
  const labelCls = isDark ? 'text-gray-500' : 'text-gray-400';
  const valueCls = mono
    ? (isDark ? 'text-gray-300 font-mono' : 'text-gray-700 font-mono')
    : highlight === 'green'  ? 'text-green-500 font-semibold'
    : highlight === 'amber'  ? (isDark ? 'text-amber-300 font-semibold' : 'text-amber-600 font-semibold')
    : highlight === 'red'    ? 'text-red-500 font-semibold'
    : highlight === 'blue'   ? (isDark ? 'text-blue-300 font-semibold' : 'text-blue-600 font-semibold')
    : (isDark ? 'text-gray-200' : 'text-gray-700');
  return (
    <div className="flex items-baseline gap-1.5 min-w-0 py-0.5 border-b border-dashed border-gray-100/20">
      <span className={`shrink-0 ${labelCls}`}>{label} :</span>
      {badge ? (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}>{badge.label}</span>
      ) : (
        <span className={`truncate ${valueCls}`}>{value}</span>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const confidenceColor = (c: number) =>
  c >= 80 ? 'text-green-500' : c >= 60 ? 'text-amber-400' : 'text-orange-400';

// ─── Matching logement robuste ────────────────────────────────────────────────
// Retourne le score de similarité entre un nom d'email et un nom de propriété (0-100)

// Table d'aliases : noms extraits des emails Airbnb → nom réel de la propriété
// Clés en minuscules sans accents (normalizeForMatch est appliqué avant lookup).
// Valeurs = nom exact tel qu'il apparaît dans BNBGest (accents conservés).
const PROPERTY_ALIASES: Record<string, string> = {
  // ── APPARTEMENT BLEU RELAX ────────────────────────────────────────────────
  'appartement bleu relax':                        'APPARTEMENT BLEU RELAX',
  'appart bleu relax':                             'APPARTEMENT BLEU RELAX',
  'appartement bleu':                              'APPARTEMENT BLEU RELAX',
  'bleu relax':                                    'APPARTEMENT BLEU RELAX',
  // ── APPARTEMENT LES CIGOGNES ──────────────────────────────────────────────
  'appartement les cigognes':                      'APPARTEMENT LES CIGOGNES',
  'appart les cigognes':                           'APPARTEMENT LES CIGOGNES',
  'les cigognes':                                  'APPARTEMENT LES CIGOGNES',
  'cigognes':                                      'APPARTEMENT LES CIGOGNES',
  // ── Maisonnette T2 quartier calme ─────────────────────────────────────────
  'maison de ville avec petite terrasse couverte': 'Maisonnette T2 quartier calme',
  'maison de ville':                               'Maisonnette T2 quartier calme',
  'maison de ville avec terrasse':                 'Maisonnette T2 quartier calme',
  'petite terrasse couverte':                      'Maisonnette T2 quartier calme',
  'maisonnette t2 quartier calme':                 'Maisonnette T2 quartier calme',
  // ── Maison T3/Climatisée/ terrasse privée ─────────────────────────────────
  'maison t3 climatisee terrasse privee':          'Maison T3/Climatisée/ terrasse privée',
  'maison t3':                                     'Maison T3/Climatisée/ terrasse privée',
  'maison climatisee terrasse privee':             'Maison T3/Climatisée/ terrasse privée',
  'maison avec terrasse privee':                   'Maison T3/Climatisée/ terrasse privée',
  't3 climatise terrasse privee':                  'Maison T3/Climatisée/ terrasse privée',
};

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // désaccentuer
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function propertyMatchScore(emailName: string, propName: string): number {
  const e = normalizeForMatch(emailName);
  const p = normalizeForMatch(propName);
  if (!e || !p) return 0;

  // ── Vérifier les aliases en priorité ─────────────────────────────────────
  const aliasTarget = PROPERTY_ALIASES[e] ?? PROPERTY_ALIASES[emailName.toLowerCase().trim()];
  if (aliasTarget && normalizeForMatch(aliasTarget) === p) return 95;

  // Correspondance exacte
  if (e === p) return 100;

  // L'un contient l'autre entièrement
  if (p.includes(e) || e.includes(p)) return 90;

  // Préfixes (6 premiers chars)
  const ePrefix = e.replace(/[^a-z0-9]/g, '').slice(0, 8);
  const pPrefix = p.replace(/[^a-z0-9]/g, '').slice(0, 8);
  if (ePrefix.length >= 4 && pPrefix.includes(ePrefix)) return 80;
  if (pPrefix.length >= 4 && ePrefix.includes(pPrefix)) return 80;

  // Mots significatifs en commun (3+ chars, hors mots vides)
  const stopWords = new Set(['les','des','une','pour','avec','sur','sous','dans','par','qui','que','aux','son','ses','nos','vos','leur','leurs','cette','cela','plus','mais','car','voir','chez','vers','ici','là','tres','bien','tout','tous']);
  const eWords = e.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  const pWords = p.split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
  const common = eWords.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw)));
  if (common.length === 0) return 0;
  // Score proportionnel au nombre de mots communs / total de mots
  const score = (common.length * 2) / (eWords.length + pWords.length) * 100;
  return Math.round(score);
}

// Trouve la meilleure propriété correspondante (score ≥ 40)
function findMatchingProperty<T extends { name: string }>(
  emailPropertyName: string | undefined,
  properties: T[],
  fallback?: T
): T | undefined {
  if (!emailPropertyName?.trim()) return fallback;
  let best: T | undefined;
  let bestScore = 0;
  for (const p of properties) {
    const score = propertyMatchScore(emailPropertyName, p.name);
    if (score > bestScore) { best = p; bestScore = score; }
  }
  return bestScore >= 40 ? best : fallback;
}

const bookingTypeLabel: Record<ParsedBooking['bookingType'], { label: string; color: string }> = {
  new:       { label: 'Nouvelle',    color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',     color: 'bg-red-100 text-red-700' },
  modified:  { label: 'Modifiée',    color: 'bg-blue-100 text-blue-700' },
  reminder:  { label: 'Rappel',      color: 'bg-gray-200 text-gray-700' },
  checkout:  { label: 'Départ',      color: 'bg-amber-100 text-amber-700' },
  review:    { label: 'Avis ⭐',     color: 'bg-purple-100 text-purple-700' },
  payout:    { label: 'Versement 💶', color: 'bg-emerald-100 text-emerald-700' },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GmailImporter() {
  const { data: session } = useSession();
  const {
    addBooking, updateBooking, cancelBooking,
    addGuest, updateGuest, guests,
    addMaintenanceTask,
    addReview,
    inventory, updateInventoryItem, getLowStockItems,
    properties,
    bookings: existingBookings,
    purgeGmailImports,
  } = useBNB();
  const { isDark } = useTheme();

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [bookings, setBookings] = useState<ParsedBooking[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterType>('all');
  const [stats, setStats] = useState<{ found: number; parsed: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string>('');
  const [importSummary, setImportSummary] = useState<{ created: number; cancelled: number; guestsCreated: number; guestsUpdated: number; skipped: number; skippedDuplicate: number; skippedNoProperty: number; tasksCreated: number; reviewsImported: number } | null>(null);
  const [purgeResult, setPurgeResult] = useState<{ bookings: number; guests: number } | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // ── Détection nouveaux logements ──────────────────────────────────────────
  const [propertyQueue, setPropertyQueue] = useState<DetectedPropertyInfo[]>([]);
  const [currentWizard, setCurrentWizard] = useState<DetectedPropertyInfo | null>(null);

  const isGoogleUser = (session as { user?: { provider?: string } })?.user?.provider === 'google';
  const tokenError   = (session as { tokenError?: string })?.tokenError;
  const needsReconnect = tokenError === 'RefreshAccessTokenError' || error === 'reconnect';

  // ─── Reconnexion Google automatique ──────────────────────────────────────
  const handleReconnect = useCallback(() => {
    signIn('google', {
      callbackUrl: window.location.href,
      // Forcer le consentement pour obtenir un nouveau refresh_token
    });
  }, []);

  // ─── Vérifier la connexion Gmail ─────────────────────────────────────────

  const checkGmailConnection = useCallback(async () => {
    setStatus('checking');
    setError(null);
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();
      if (data.action === 'reconnect') { setError('reconnect'); setStatus('idle'); return; }
      setGmailConnected(data.connected);
      if (data.email) setGmailEmail(data.email);
      setStatus('idle');
    } catch {
      setGmailConnected(false);
      setStatus('idle');
    }
  }, []);

  // ─── Scanner les emails Airbnb ────────────────────────────────────────────

  const syncGmail = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    setBookings([]);
    setSelected(new Set());
    setImported([]);
    setImportSummary(null);
    try {
      const queries = [
        'from:automated@airbnb.com after:2026/01/01',
        'from:express@airbnb.com subject:réservation after:2026/01/01',
        'from:airbnb.com subject:reservation after:2026/01/01',
        'from:airbnb.com subject:versement after:2026/01/01',
        'from:airbnb.com subject:payout after:2026/01/01',
      ];
      const allBookings: ParsedBooking[] = [];
      const seen = new Set<string>();

      for (const q of queries) {
        const res = await fetch(`/api/gmail/sync?q=${encodeURIComponent(q)}&max=500`);
        if (!res.ok) {
          const err = await res.json();
          if (err.action === 'reconnect') { setError('reconnect'); setStatus('error'); return; }
          continue;
        }
        const data = await res.json();
        if (data.bookings) {
          for (const b of data.bookings) {
            if (!seen.has(b.messageId)) { seen.add(b.messageId); allBookings.push(b); }
          }
          if (data.stats) setStats(s => s
            ? { found: s.found + data.stats.found, parsed: s.parsed + data.stats.parsed, errors: s.errors + data.stats.errors }
            : data.stats
          );
        }
      }

      allBookings.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      setBookings(allBookings);
      // Auto-sélectionner : nouvelles (confiance ≥70%) + annulations/modifications/avis/départs (toujours)
      setSelected(new Set(allBookings.filter(b =>
        (b.bookingType === 'new' && b.confidence >= 70) ||
        b.bookingType === 'cancelled' ||
        b.bookingType === 'modified' ||
        b.bookingType === 'checkout' ||
        b.bookingType === 'review'
      ).map(b => b.messageId)));
      setStatus('done');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, []);

  // ─── Notification email (fire-and-forget, côté serveur) ─────────────────
  const notifyEmail = useCallback((payload: {
    type: 'booking_confirmation' | 'checkin_reminder';
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut?: string;
    guests?: number;
    totalPrice?: number;
    bookingId?: number;
    property: { name: string; address?: string; city?: string };
  }) => {
    if (!payload.guestEmail || payload.guestEmail.includes('@example') || payload.guestEmail === '') return;
    fetch('/api/gmail-import/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* silencieux — non bloquant */ });
  }, []);

  // ─── Importer les réservations sélectionnées ──────────────────────────────

  const importSelected = useCallback(() => {
    const toImport = bookings.filter(b => selected.has(b.messageId));
    const defaultProperty = properties[0];
    const summary = { created: 0, cancelled: 0, guestsCreated: 0, guestsUpdated: 0, skipped: 0, skippedDuplicate: 0, skippedNoProperty: 0, tasksCreated: 0, reviewsImported: 0 };

    for (const b of toImport) {

      // ── 1. Trouver le logement ────────────────────────────────────────────
      //   Matching robuste (score ≥ 40) ou fallback sur le 1er logement.
      //   Pour les versements (payout) : pas de fallback — pas de propertyName attendu.
      //   Si aucune propriété → on marque "skipped" sauf pour cancel/payout
      const useFallback = b.bookingType !== 'payout';
      let property = findMatchingProperty(b.propertyName, properties, useFallback ? defaultProperty : undefined);

      // ── 1b. Pour les avis (review) : retrouver le logement par recoupement ──
      // L'email d'avis Airbnb ne contient pas le nom du logement.
      // Stratégie : chercher la réservation la plus récente du voyageur dans les 30j
      // avant la réception de l'email, puis utiliser son propertyId.
      if (!property && b.bookingType === 'review') {
        const reviewDate = new Date(b.receivedAt);
        // Chercher une réservation récente du même voyageur (checkout dans les 30j précédents)
        const recentBooking = existingBookings
          .filter(eb => {
            const checkOut = new Date(eb.checkOut);
            const daysDiff = (reviewDate.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff >= 0 && daysDiff <= 30
              && (eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
                  || (b.confirmationCode && eb.specialRequests?.includes(b.confirmationCode)));
          })
          .sort((a, z) => new Date(z.checkOut).getTime() - new Date(a.checkOut).getTime())[0];

        if (recentBooking) {
          property = properties.find(p => p.id === recentBooking.propertyId) ?? defaultProperty;
        } else {
          // Dernier recours : utiliser le logement par défaut (hôte gère 1 logement)
          property = defaultProperty;
        }
      }

      if (!property && b.bookingType !== 'cancelled' && b.bookingType !== 'payout') {
        summary.skipped++;
        summary.skippedNoProperty++;
        continue;
      }

      // ── 2. Trouver ou créer le voyageur (Guest) ──────────────────────────
      let guestId = 0;
      if (b.guestName && b.guestName !== 'Voyageur Airbnb') {
        const existing = guests.find(g =>
          g.name.toLowerCase() === b.guestName.toLowerCase() ||
          (b.guestEmail && g.email && g.email.toLowerCase() === b.guestEmail.toLowerCase())
        );

        if (existing) {
          const updates: Partial<typeof existing> = {};
          if (b.guestEmail && !existing.email) updates.email = b.guestEmail;
          if (b.guestPhone && !existing.phone) updates.phone = b.guestPhone;
          if (b.totalPrice > 0) updates.totalSpent = (existing.totalSpent || 0) + b.totalPrice;
          if (Object.keys(updates).length) updateGuest(existing.id, updates);
          guestId = existing.id;
          summary.guestsUpdated++;
        } else if (b.bookingType === 'new') {
          addGuest({
            name: b.guestName,
            email: b.guestEmail || '',
            phone: b.guestPhone || '',
            language: 'fr',
            status: 'active',
            nationality: undefined,
            lastBooking: b.checkIn,
            preferences: { smoking: false, pets: false, parties: false, preferredAmenities: [] },
          });
          const created = guests[guests.length - 1];
          guestId = created?.id ?? 0;
          summary.guestsCreated++;
        }
      }

      // ── 3. Vérifier doublon ───────────────────────────────────────────────
      // a) Par code de confirmation (fiable)
      if (b.confirmationCode) {
        const alreadyExists = existingBookings.some(eb =>
          eb.specialRequests?.includes(b.confirmationCode!)
        );
        if (alreadyExists) { summary.skipped++; summary.skippedDuplicate++; continue; }
      }
      // b) Par dates + voyageur + logement (pour emails sans confirmationCode)
      if (!b.confirmationCode && property && b.bookingType === 'new') {
        const alreadyExists = existingBookings.some(eb =>
          eb.propertyId === property!.id &&
          eb.checkIn === b.checkIn &&
          eb.checkOut === b.checkOut &&
          eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
        );
        if (alreadyExists) { summary.skipped++; summary.skippedDuplicate++; continue; }
      }

      const notes = [
        b.confirmationCode ? `Code Airbnb: ${b.confirmationCode}` : '',
        `Importé depuis Gmail (${fmt(b.receivedAt)})`,
        b.propertyName ? `Logement: ${b.propertyName}` : '',
        b.guestPhone ? `Tél: ${b.guestPhone}` : '',
      ].filter(Boolean).join(' | ');

      // ── 4a. Nouvelle réservation ──────────────────────────────────────────
      if (b.bookingType === 'new' && property) {
        addBooking({
          propertyId: property.id,
          guestId,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guests: b.guests,
          totalPrice: b.totalPrice || 0,
          status: 'confirmed',
          paymentStatus: b.totalPrice > 0 ? 'paid' : 'pending',
          specialRequests: notes,
          guestInfo: { name: b.guestName, email: b.guestEmail || '', phone: b.guestPhone || '' },
          ...(b.totalPrice > 0 && b.confirmationCode ? {
            paymentInfo: {
              method: 'airbnb',
              transactionId: b.confirmationCode,
              amount: b.totalPrice,
            },
          } : {}),
        });
        summary.created++;

        // Incrémenter le compteur de réservations du voyageur
        if (guestId) {
          const g = guests.find(gg => gg.id === guestId);
          if (g) updateGuest(guestId, {
            totalBookings: (g.totalBookings || 0) + 1,
            totalSpent: (g.totalSpent || 0) + (b.totalPrice || 0),
            lastBooking: b.checkIn,
          });
        }

        // Email de confirmation au voyageur (fire-and-forget)
        if (b.guestEmail && property) {
          notifyEmail({
            type: 'booking_confirmation',
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice,
            property: { name: property.name },
          });
        }
      }

      // ── 4b. Annulation → retrouver et annuler la réservation existante ────
      if (b.bookingType === 'cancelled') {
        // Chercher par code de confirmation d'abord
        let match = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : undefined;

        // Sinon par dates + voyageur
        if (!match && property) {
          match = existingBookings.find(eb =>
            eb.propertyId === property.id &&
            eb.checkIn === b.checkIn &&
            eb.checkOut === b.checkOut &&
            eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
          );
        }

        if (match && match.status !== 'cancelled') {
          cancelBooking(match.id, `Annulé via Gmail — ${notes}`);
          summary.cancelled++;
        }
      }

      // ── 4c. Modification → mettre à jour la réservation existante ─────────
      if (b.bookingType === 'modified' && property) {
        const match = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : existingBookings.find(eb =>
              eb.propertyId === property.id &&
              eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase() &&
              Math.abs(new Date(eb.checkIn).getTime() - new Date(b.checkIn).getTime()) < 7 * 86400000
            );

        if (match) {
          updateBooking(match.id, {
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice || match.totalPrice,
            specialRequests: `[MODIFIÉ] ${notes}`,
          });
          summary.created++;
        } else {
          addBooking({
            propertyId: property.id,
            guestId,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice || 0,
            status: 'confirmed',
            paymentStatus: b.totalPrice > 0 ? 'paid' : 'pending',
            specialRequests: `[MODIFIÉ] ${notes}`,
            guestInfo: { name: b.guestName, email: b.guestEmail || '', phone: b.guestPhone || '' },
          });
          summary.created++;
        }
      }

      // ── 4d. Départ (checkout) → marquer réservation "completed" + créer tâche ménage ──
      if (b.bookingType === 'checkout' && property) {
        // Retrouver la réservation correspondante
        const match = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : existingBookings.find(eb =>
              eb.propertyId === property.id &&
              eb.checkOut === b.checkOut &&
              (eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase() ||
               eb.guestId === guestId)
            );

        if (match && match.status !== 'completed' && match.status !== 'cancelled') {
          // Marquer comme terminée + montant réel reçu (hostPayout si dispo)
          updateBooking(match.id, {
            status: 'completed',
            paymentStatus: 'paid',
            totalPrice: b.hostPayout || b.totalPrice || match.totalPrice,
            specialRequests: `${match.specialRequests || ''} | [TERMINÉ] Départ confirmé Gmail`,
          });
          summary.created++;
        }

        // Créer automatiquement une tâche de ménage post-départ
        const cleaningDate = b.checkOut; // jour du départ
        const alreadyHasCleaning = false; // simplifié — on crée toujours
        if (!alreadyHasCleaning) {
          addMaintenanceTask({
            propertyId: property.id,
            title: `🧹 Ménage post-départ — ${b.guestName}`,
            description: [
              `Nettoyage complet après séjour du ${fmt(b.checkIn)} au ${fmt(b.checkOut)}.`,
              b.guests > 1 ? `${b.guests} voyageurs.` : '',
              b.cleaningFee ? `Frais ménage prévus : ${b.cleaningFee}${b.currency === 'EUR' ? '€' : b.currency}.` : '',
              notes,
            ].filter(Boolean).join(' '),
            priority: 'high',
            status: 'pending',
            category: 'cleaning',
            estimatedCost: b.cleaningFee || 0,
            scheduledDate: cleaningDate,
          });
          summary.tasksCreated++;

          // Décrémenter l'inventaire consommables (ménage/literie/linge) du logement
          const consumables = inventory.filter(i =>
            i.propertyId === property.id &&
            (['cleaning', 'bedding', 'towels'] as string[]).includes(i.category) &&
            i.quantity > 0
          );
          for (const item of consumables) {
            const newQty = Math.max(0, item.quantity - 1);
            updateInventoryItem(item.id, {
              quantity: newQty,
              status: newQty === 0 ? 'out_of_stock' : newQty <= item.minimumQuantity ? 'low_stock' : 'in_stock',
            });
          }
          // getLowStockItems() → NotificationCenter auto-génère les alertes stock bas
          const lowStock = getLowStockItems().filter(i => i.propertyId === property.id);
          if (lowStock.length > 0) {
            summary.tasksCreated++; // comptabilise l'alerte stock bas comme action
          }
        }
      }

      // ── 4e. Rappel (reminder) → enrichir la réservation + créer tâche préparation J-1 ──
      if (b.bookingType === 'reminder' && property) {
        // ── Retrouver la réservation existante correspondante ──────────────
        const matchedReminder = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : existingBookings.find(eb =>
              eb.propertyId === property.id &&
              eb.checkIn === b.checkIn &&
              (eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase() || eb.guestId === guestId)
            );

        if (matchedReminder) {
          // Enrichir la réservation existante avec les infos complémentaires du rappel
          const updates: Record<string, unknown> = {};
          if (b.checkInTime  && !matchedReminder.checkInTime)  updates.checkInTime  = b.checkInTime;
          if (b.checkOutTime && !matchedReminder.checkOutTime) updates.checkOutTime = b.checkOutTime;
          if (b.guests > 0   && !matchedReminder.guests)       updates.guests       = b.guests;
          if (b.totalPrice > 0 && !matchedReminder.totalPrice) updates.totalPrice   = b.totalPrice;
          if (b.nightlyRate  && !matchedReminder.nightlyRate)   updates.nightlyRate  = b.nightlyRate;
          if (b.cleaningFee  && !matchedReminder.cleaningFee)   updates.cleaningFee  = b.cleaningFee;
          if (b.serviceFee   && !matchedReminder.serviceFee)    updates.serviceFee   = b.serviceFee;
          if (b.taxAmount    && !matchedReminder.taxAmount)     updates.taxAmount    = b.taxAmount;
          if (Object.keys(updates).length > 0) {
            updateBooking(matchedReminder.id, updates as Parameters<typeof updateBooking>[1]);
          }
          summary.created++; // compté comme une action (enrichissement)
        } else {
          // Aucune réservation trouvée → en créer une depuis le rappel
          // (l'email de confirmation n'a peut-être pas encore été importé)
          addBooking({
            propertyId: property.id,
            guestId,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests || 1,
            totalPrice: b.totalPrice || 0,
            status: 'confirmed',
            paymentStatus: b.totalPrice > 0 ? 'paid' : 'pending',
            checkInTime:  b.checkInTime,
            checkOutTime: b.checkOutTime,
            nightlyRate:  b.nightlyRate,
            cleaningFee:  b.cleaningFee,
            serviceFee:   b.serviceFee,
            taxAmount:    b.taxAmount,
            specialRequests: [
              b.confirmationCode ? `Code Airbnb: ${b.confirmationCode}` : '',
              `Importé depuis rappel Gmail (${fmt(b.receivedAt)})`,
              b.propertyName ? `Logement: ${b.propertyName}` : '',
              b.guestPhone   ? `Tél: ${b.guestPhone}`        : '',
            ].filter(Boolean).join(' | '),
            guestInfo: { name: b.guestName, email: b.guestEmail || '', phone: b.guestPhone || '' },
          });
          summary.created++;
        }

        // ── Créer une tâche de préparation J-1 ────────────────────────────
        const prepDate = new Date(b.checkIn);
        prepDate.setDate(prepDate.getDate() - 1);
        const prepDateStr = prepDate.toISOString().split('T')[0];

        addMaintenanceTask({
          propertyId: property.id,
          title: `🔍 Préparation J-1 — ${b.guestName}`,
          description: [
            `Vérification avant arrivée le ${fmt(b.checkIn)} (${b.nights} nuit${b.nights > 1 ? 's' : ''}).`,
            b.guests > 1 ? `${b.guests} voyageurs.` : '1 voyageur.',
            b.checkInTime  ? `Heure d'arrivée prévue : ${b.checkInTime}.`  : '',
            b.checkOutTime ? `Heure de départ prévue : ${b.checkOutTime}.` : '',
            b.confirmationCode ? `Réservation : ${b.confirmationCode}.` : '',
            'Vérifier : linge propre, ménage, équipements, codes d\'accès.',
          ].filter(Boolean).join(' '),
          priority: 'medium',
          status: 'pending',
          category: 'inspection',
          estimatedCost: 0,
          scheduledDate: prepDateStr,
        });
        summary.tasksCreated++;

        // Email de rappel check-in au voyageur (fire-and-forget)
        if (b.guestEmail) {
          notifyEmail({
            type: 'checkin_reminder',
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            checkIn: b.checkIn,
            property: { name: property.name },
          });
        }
      }

      // ── 4f. Avis (review) → créer un avis dans BNBContext ────────────────
      if (b.bookingType === 'review' && property) {
        // Retrouver la réservation et l'ID du voyageur correspondants
        const matchedBooking = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : existingBookings.find(eb =>
              eb.propertyId === property.id &&
              (eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase() ||
               eb.checkOut === b.checkOut)
            );

        const rating = b.reviewRating ?? 5; // défaut 5 étoiles si non extrait
        addReview({
          propertyId: property.id,
          bookingId: matchedBooking?.id ?? 0,
          guestId: guestId,
          rating,
          title: `Avis ${rating}★ — ${b.guestName}`,
          comment: b.reviewComment || `Avis importé automatiquement depuis Gmail (${fmt(b.receivedAt)}).`,
        });

        // Si la réservation correspondante n'est pas déjà "completed", la marquer
        if (matchedBooking && matchedBooking.status !== 'completed' && matchedBooking.status !== 'cancelled') {
          updateBooking(matchedBooking.id, { status: 'completed' });
        }

        summary.reviewsImported++;
      }

      // ── 4g. Versement (payout) → enrichir la réservation avec données financières ──
      if (b.bookingType === 'payout') {
        // Retrouver la réservation liée (par code de confirmation ou voyageur)
        const payoutBooking = b.confirmationCode
          ? existingBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : property
            ? existingBookings.find(eb =>
                eb.propertyId === property.id &&
                eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
              )
            : undefined;

        const payoutAmount = b.hostPayout || b.totalPrice || 0;
        const payoutDateStr = b.receivedAt?.split('T')[0] ?? new Date().toISOString().split('T')[0];

        if (payoutBooking) {
          // Mettre à jour la réservation existante avec les infos financières
          updateBooking(payoutBooking.id, {
            paymentStatus: 'paid',
            hostPayout: payoutAmount,
            ...(b.cleaningFee ? { cleaningFee: b.cleaningFee } : {}),
            ...(b.serviceFee  ? { serviceFee:  b.serviceFee  } : {}),
            payoutDate: payoutDateStr,
            payoutConfirmed: true,
            specialRequests: [
              payoutBooking.specialRequests || '',
              `[VERSEMENT ${payoutAmount}€ le ${payoutDateStr}]`,
            ].filter(Boolean).join(' | '),
          });
          summary.created++; // compté comme une action réalisée
        } else if (payoutAmount > 0) {
          // Aucune réservation trouvée → créer une réservation "fantôme" financière
          // pour tracer le versement dans les données
          const pid = property?.id ?? (properties[0]?.id ?? 0);
          if (pid) {
            addBooking({
              propertyId: pid,
              guestId: guestId || 0,
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: b.guests || 1,
              totalPrice: payoutAmount,
              status: 'completed',
              paymentStatus: 'paid',
              hostPayout: payoutAmount,
              ...(b.cleaningFee ? { cleaningFee: b.cleaningFee } : {}),
              ...(b.serviceFee  ? { serviceFee:  b.serviceFee  } : {}),
              payoutDate: payoutDateStr,
              payoutConfirmed: true,
              specialRequests: [
                b.confirmationCode ? `Code Airbnb: ${b.confirmationCode}` : '',
                `Versement Airbnb ${payoutAmount}€ — importé Gmail (${fmt(b.receivedAt)})`,
                b.propertyName ? `Logement: ${b.propertyName}` : '',
              ].filter(Boolean).join(' | '),
              guestInfo: { name: b.guestName || 'Airbnb Payout', email: b.guestEmail || '', phone: '' },
            });
            summary.created++;
          }
        }
      }
    } // fin boucle for

    setImported(toImport.map(b => b.messageId));
    setImportSummary(summary);
    setSelected(new Set());

    // ── 5. Détecter les nouveaux logements inconnus ───────────────────────
    // Tous les emails (importés ou non) avec un propertyName qui ne correspond
    // à aucun logement existant → proposer le wizard de création.
    const isKnownProperty = (name: string) =>
      findMatchingProperty(name, properties) !== undefined;

    // On prend TOUS les bookings importés (toImport) avec
    // un propertyName détecté mais inconnu — pour ne rater aucun nouveau logement
    const allCandidates = toImport
      .filter(b => b.propertyName?.trim() && !isKnownProperty(b.propertyName));

    const allNamesForWizard = allCandidates.map(b => b.propertyName!.trim());

    // Cas aucun logement configuré : si aucun nom extrait mais des emails sans logement,
    // proposer le wizard avec les noms uniques trouvés dans les sujets des emails
    if (allNamesForWizard.length === 0 && summary.skippedNoProperty > 0) {
      // Extraire les noms uniques depuis les sujets des emails skippés
      const fallbackNames = Array.from(new Set(
        toImport
          .filter(b => !b.propertyName?.trim())
          .map(b => {
            // Nettoyer le sujet pour en faire un nom de logement candidat
            return b.subject
              ?.replace(/airbnb/gi, '')
              .replace(/r[eé]servation\s+(confirm[eé]e?|accept[eé]e?)/gi, '')
              .replace(/booking\s+confirmed?/gi, '')
              .replace(/rappel|reminder/gi, '')
              .replace(/[–\-:|]/g, ' ')
              .replace(/\s{2,}/g, ' ')
              .trim()
              .slice(0, 60) || '';
          })
          .filter(n => n.length >= 5)
      ));
      if (fallbackNames.length > 0) {
        const queue = fallbackNames.map(n => analyzeAirbnbTitle(n));
        setPropertyQueue(queue.slice(1));
        setCurrentWizard(queue[0]);
        return;
      }
      // Dernier recours : ouvrir le wizard avec un nom vide pour que l'utilisateur saisisse
      setCurrentWizard(analyzeAirbnbTitle('Mon logement'));
      return;
    }

    const newNames = findNewPropertyNames(allNamesForWizard, properties);
    if (newNames.length > 0) {
      const queue = newNames.map(n => analyzeAirbnbTitle(n));
      setPropertyQueue(queue.slice(1));
      setCurrentWizard(queue[0]);
    }
  }, [bookings, selected, properties, existingBookings, guests, addBooking, updateBooking, cancelBooking, addGuest, updateGuest, addMaintenanceTask, addReview, notifyEmail, inventory, updateInventoryItem, getLowStockItems]);

  // ─── Purge des données importées depuis Gmail ─────────────────────────────
  // Supprime TOUTES les réservations créées via l'import Gmail.
  // Utile pendant le développement du parser pour repartir de zéro.
  const handlePurge = useCallback(() => {
    const result = purgeGmailImports();
    setPurgeResult(result);
    setShowPurgeConfirm(false);
    // Réinitialiser aussi les états locaux de l'importer
    setImported([]);
    setImportSummary(null);
    setBookings([]);
    setSelected(new Set());
    setStats(null);
  }, [purgeGmailImports]);

  // ─── Avancer dans la file de nouveaux logements ───────────────────────────

  const advanceQueue = useCallback(() => {
    setPropertyQueue(prev => {
      const next = prev.slice(1);
      setCurrentWizard(next[0] ?? null);
      return next;
    });
  }, []);

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => {
    const visible = filtered.map(b => b.messageId);
    const allSel = visible.every(id => selected.has(id));
    setSelected(prev => { const n = new Set(prev); allSel ? visible.forEach(id => n.delete(id)) : visible.forEach(id => n.add(id)); return n; });
  };

  const filtered = bookings.filter(b => filter === 'all' ? true : filter === 'new' ? b.bookingType === 'new' : b.bookingType === 'cancelled');
  const newCount = bookings.filter(b => b.bookingType === 'new').length;
  // Sélectionnable : tout type sauf review et payout (pas d'action réservation possible)
  const selectedNew = bookings.filter(b => selected.has(b.messageId) && b.bookingType !== 'review' && b.bookingType !== 'payout').length;

  // ─── Render ───────────────────────────────────────────────────────────────

  const card = isDark ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300';
  const cardSelected = isDark ? 'border-violet-500 bg-violet-900/30' : 'border-violet-400 bg-violet-50';
  const cardImported = isDark ? 'border-green-700 bg-green-900/20 opacity-70' : 'border-green-300 bg-green-50 opacity-70';

  return (
    <div className={`space-y-6 p-4 sm:p-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Mail className="w-7 h-7 text-red-500" />
            Import Gmail Airbnb
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Extraire automatiquement vos réservations depuis votre boîte Gmail
          </p>
        </div>
        {status === 'done' && stats && (
          <div className={`text-right text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{stats.parsed} réservations trouvées</div>
            <div>{stats.found} emails analysés · 2026 complet</div>
          </div>
        )}
      </div>

      {/* ── Alerte connexion ── */}
      {!isGoogleUser ? (
        <div className={`border rounded-xl p-5 flex items-start gap-3 ${isDark ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Connexion Google requise</div>
            <p className={`text-sm mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Connectez-vous avec votre compte Google (<strong>claustre.emmanuel@gmail.com</strong>) pour accéder à Gmail.
            </p>
          </div>
        </div>
      ) : needsReconnect ? (
        <div className={`border rounded-xl p-5 flex items-start gap-3 ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-300'}`}>
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>🔐 Autorisation Gmail expirée</div>
            <p className={`text-sm mt-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Votre accès Gmail a expiré. Cliquez sur le bouton ci-dessous pour renouveler l&apos;autorisation automatiquement.
            </p>
          </div>
          <button
            onClick={handleReconnect}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Se reconnecter
          </button>
        </div>
      ) : (
        <>
          {/* ── Actions ── */}
          <div className="flex flex-wrap gap-3">
            {gmailConnected === null && (
              <button
                onClick={checkGmailConnection}
                disabled={status === 'checking'}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-medium text-sm disabled:opacity-50 transition-colors ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                {status === 'checking' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                Vérifier la connexion Gmail
              </button>
            )}
            {gmailConnected === true && (
              <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm ${isDark ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <CheckCircle2 className="w-4 h-4" /> Connecté : <strong>{gmailEmail}</strong>
              </div>
            )}
            {gmailConnected === false && (
              <div className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm ${isDark ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <XCircle className="w-4 h-4" /> Gmail non accessible
              </div>
            )}
            <button
              onClick={syncGmail}
              disabled={status === 'syncing' || status === 'checking'}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 font-semibold text-sm disabled:opacity-50 shadow-sm"
            >
              {status === 'syncing' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyse…</> : <><Search className="w-4 h-4" /> Scanner les emails Airbnb</>}
            </button>
            {selectedNew > 0 && (
              <button
                onClick={importSelected}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 font-semibold text-sm shadow-sm"
              >
                <Download className="w-4 h-4" /> Traiter {selectedNew} email{selectedNew > 1 ? 's' : ''}
              </button>
            )}

            {/* ── Bouton PURGE (dev) ── */}
            {existingBookings.some(b => b.specialRequests?.includes('Importé depuis Gmail')) && (
              !showPurgeConfirm ? (
                <button
                  onClick={() => { setShowPurgeConfirm(true); setPurgeResult(null); }}
                  title="Supprimer toutes les réservations importées depuis Gmail (remise à zéro pour tests)"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                    isDark
                      ? 'border-red-700 text-red-400 hover:bg-red-900/40 bg-transparent'
                      : 'border-red-300 text-red-600 hover:bg-red-50 bg-transparent'
                  }`}
                >
                  🗑️ Purger les imports Gmail
                </button>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${isDark ? 'border-red-700 bg-red-900/30' : 'border-red-300 bg-red-50'}`}>
                  <span className={isDark ? 'text-red-300' : 'text-red-700'}>⚠️ Confirmer la suppression ?</span>
                  <button
                    onClick={handlePurge}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs"
                  >
                    Oui, tout supprimer
                  </button>
                  <button
                    onClick={() => setShowPurgeConfirm(false)}
                    className={`px-3 py-1 rounded-lg font-semibold text-xs ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Annuler
                  </button>
                </div>
              )
            )}
          </div>

          {/* ── Résultat purge ── */}
          {purgeResult && (
            <div className={`border rounded-xl p-3 flex items-center gap-3 text-sm ${isDark ? 'bg-orange-900/30 border-orange-700 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
              <span className="text-lg">🗑️</span>
              <span>
                Purge terminée — <strong>{purgeResult.bookings}</strong> réservation{purgeResult.bookings > 1 ? 's' : ''} supprimée{purgeResult.bookings > 1 ? 's' : ''}
                {purgeResult.guests > 0 && <>, <strong>{purgeResult.guests}</strong> voyageur{purgeResult.guests > 1 ? 's' : ''} orphelin{purgeResult.guests > 1 ? 's' : ''} supprimé{purgeResult.guests > 1 ? 's' : ''}</>}
              </span>
              <button onClick={() => setPurgeResult(null)} className="ml-auto text-lg leading-none opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {/* ── Avertissement : aucun logement configuré ── */}
          {properties.length === 0 && bookings.length > 0 && (
            <div className={`border rounded-xl p-3 flex items-start gap-3 ${isDark ? 'bg-orange-900/30 border-orange-700' : 'bg-orange-50 border-orange-300'}`}>
              <span className="text-xl">🏠</span>
              <div>
                <p className={`font-semibold text-sm ${isDark ? 'text-orange-300' : 'text-orange-800'}`}>
                  Aucun logement configuré
                </p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                  Les emails détectés ne peuvent pas être associés à un logement.
                  Créez au moins un logement dans <strong>Propriétés</strong> avant d&apos;importer — ou laissez le wizard automatique créer les logements depuis les noms détectés dans vos emails.
                </p>
              </div>
            </div>
          )}

          {/* ── Succès import ── */}
          {imported.length > 0 && importSummary && (
            <div className={`border rounded-xl p-4 space-y-2 ${isDark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className={`font-semibold ${isDark ? 'text-green-300' : 'text-green-800'}`}>
                  Import terminé — {imported.length} email{imported.length > 1 ? 's' : ''} traité{imported.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs pl-7">
                {importSummary.created > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700'}`}>
                    ✅ {importSummary.created} réservation{importSummary.created > 1 ? 's' : ''} créée{importSummary.created > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.cancelled > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`}>
                    ❌ {importSummary.cancelled} annulation{importSummary.cancelled > 1 ? 's' : ''} appliquée{importSummary.cancelled > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.guestsCreated > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-blue-800 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                    👤 {importSummary.guestsCreated} voyageur{importSummary.guestsCreated > 1 ? 's' : ''} créé{importSummary.guestsCreated > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.guestsUpdated > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-indigo-800 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
                    🔄 {importSummary.guestsUpdated} voyageur{importSummary.guestsUpdated > 1 ? 's' : ''} mis à jour
                  </span>
                )}
                {importSummary.skippedDuplicate > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    ⏭️ {importSummary.skippedDuplicate} doublon{importSummary.skippedDuplicate > 1 ? 's' : ''} ignoré{importSummary.skippedDuplicate > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.skippedNoProperty > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-100 text-orange-700'}`}>
                    🏠 {importSummary.skippedNoProperty} sans logement — <span className="underline cursor-pointer">créez vos logements d&apos;abord</span>
                  </span>
                )}
                {importSummary.tasksCreated > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                    🧹 {importSummary.tasksCreated} tâche{importSummary.tasksCreated > 1 ? 's' : ''} créée{importSummary.tasksCreated > 1 ? 's' : ''} (ménage/préparation)
                  </span>
                )}
                {importSummary.reviewsImported > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-purple-800 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                    ⭐ {importSummary.reviewsImported} avis importé{importSummary.reviewsImported > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Nouveaux logements en attente de configuration ── */}
          {propertyQueue.length > 0 && !currentWizard && (
            <div className={`border-2 rounded-xl p-4 flex items-center justify-between gap-3 ${isDark ? 'bg-violet-900/30 border-violet-600' : 'bg-violet-50 border-violet-300'}`}>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0" />
                <span className={`font-semibold text-sm ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>
                  🏠 {propertyQueue.length} logement{propertyQueue.length > 1 ? 's' : ''} à configurer
                </span>
              </div>
              <button
                onClick={() => { setCurrentWizard(propertyQueue[0]); setPropertyQueue(p => p.slice(1)); }}
                className="px-4 py-1.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700"
              >
                Configurer →
              </button>
            </div>
          )}

          {/* ── Info ── */}
          {status === 'idle' && bookings.length === 0 && (
            <div className={`border rounded-xl p-5 ${isDark ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className={`font-semibold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>Comment ça marche ?</div>
                  <ol className={`text-sm space-y-1 list-decimal list-inside ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    <li>BNBGest scanne vos emails <code className={`px-1 rounded text-xs ${isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100'}`}>automated@airbnb.com</code></li>
                    <li>Les réservations confirmées sont extraites</li>
                    <li>Sélectionnez et importez en 1 clic</li>
                    <li>Elles apparaissent dans votre planning</li>
                  </ol>
                  <div className={`mt-3 p-3 rounded-lg text-xs ${isDark ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    <strong>Prérequis :</strong> Activez l&apos;API Gmail dans{' '}
                    <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer" className="underline font-medium">
                      Google Cloud Console
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Liste des réservations ── */}
          {bookings.length > 0 && (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Filter className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  {(['all', 'new', 'cancelled'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === f ? 'bg-violet-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? `Tous (${bookings.length})` : f === 'new' ? `Nouvelles (${newCount})` : 'Annulées'}
                    </button>
                  ))}
                </div>
                <button onClick={selectAll} className="text-xs text-violet-500 hover:underline font-medium">
                  {filtered.every(b => selected.has(b.messageId)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {/* ── Récapitulatif global du parse ─────────────────────────── */}
              {(() => {
                const byType = bookings.reduce((acc, b) => {
                  acc[b.bookingType] = (acc[b.bookingType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const withProperty    = bookings.filter(b => b.propertyName).length;
                const withCode        = bookings.filter(b => b.confirmationCode).length;
                const withPrice       = bookings.filter(b => b.totalPrice > 0).length;
                const withDates       = bookings.filter(b => b.checkIn && b.checkIn !== b.receivedAt?.split('T')[0]).length;
                const withGuests      = bookings.filter(b => b.guests > 0).length;
                const highConf        = bookings.filter(b => b.confidence >= 80).length;
                const lowConf         = bookings.filter(b => b.confidence < 60).length;
                const unknownProp     = bookings.filter(b => b.propertyName && !findMatchingProperty(b.propertyName, properties)).length;
                return (
                  <div className={`rounded-xl border p-4 text-xs space-y-3 ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                      🔍 Récapitulatif parse — {bookings.length} email{bookings.length > 1 ? 's' : ''} analysé{bookings.length > 1 ? 's' : ''}
                    </div>
                    {/* Répartition par type */}
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
                        <span key={type} className={`px-2 py-1 rounded-lg font-medium flex items-center gap-1 ${bookingTypeLabel[type as keyof typeof bookingTypeLabel]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {bookingTypeLabel[type as keyof typeof bookingTypeLabel]?.label ?? type}
                          <span className="font-bold">{count}</span>
                        </span>
                      ))}
                    </div>
                    {/* Qualité du parse */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${highConf === bookings.length ? 'text-green-500' : 'text-amber-500'}`}>{highConf}/{bookings.length}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Confiance ≥ 80%</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${withDates === bookings.filter(b=>b.bookingType!=='payout'&&b.bookingType!=='review').length ? 'text-green-500' : 'text-amber-500'}`}>{withDates}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Dates extraites</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${withProperty > 0 ? 'text-blue-500' : 'text-gray-400'}`}>{withProperty}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Logement détecté</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${withCode > 0 ? 'text-violet-500' : 'text-gray-400'}`}>{withCode}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Code réservation</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${withPrice > 0 ? 'text-green-500' : 'text-gray-400'}`}>{withPrice}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Prix extrait</div>
                      </div>
                      <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`text-lg font-bold ${withGuests > 0 ? 'text-blue-500' : 'text-gray-400'}`}>{withGuests}</div>
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Voyageurs extraits</div>
                      </div>
                      {lowConf > 0 && (
                        <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                          <div className="text-lg font-bold text-red-500">{lowConf}</div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Confiance {'<'} 60%</div>
                        </div>
                      )}
                      {unknownProp > 0 && (
                        <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
                          <div className="text-lg font-bold text-orange-500">{unknownProp}</div>
                          <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Logement inconnu</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                {filtered.map(booking => {
                  const isSel = selected.has(booking.messageId);
                  const isExp = expanded.has(booking.messageId);
                  const isImp = imported.includes(booking.messageId);
                  const typeInfo = bookingTypeLabel[booking.bookingType];
                  return (
                    <div key={booking.messageId} className={`rounded-xl border-2 transition-all ${isImp ? cardImported : isSel ? cardSelected : card}`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {!isImp && booking.bookingType !== 'review' && booking.bookingType !== 'payout' ? (
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(booking.messageId)}
                              className="mt-1 w-4 h-4 rounded text-violet-600 cursor-pointer flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 mt-1 flex-shrink-0">
                              {isImp && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{booking.guestName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                              {booking.confirmationCode && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                  #{booking.confirmationCode}
                                </span>
                              )}
                              <span className={`text-xs font-medium ml-auto ${confidenceColor(booking.confidence)}`}>
                                {booking.confidence}% confiance
                              </span>
                            </div>

                            <div className={`flex flex-wrap gap-4 mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {/* Dates — masquées pour les versements (pas de dates séjour) */}
                              {booking.bookingType !== 'payout' && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {fmt(booking.checkIn)} → {fmt(booking.checkOut)}
                                  <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({booking.nights}n)</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {/* Nom du voyageur si disponible, sinon nb voyageurs */}
                                {booking.guestName && booking.guestName !== 'Voyageur Airbnb'
                                  ? <span className="font-medium">{booking.guestName}</span>
                                  : <>{booking.guests} voyageur{booking.guests > 1 ? 's' : ''}</>
                                }
                              </span>
                              {booking.totalPrice > 0 && (
                                <span className="flex items-center gap-1 font-medium text-green-500">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {booking.totalPrice.toFixed(0)} {booking.currency}
                                </span>
                              )}
                              {booking.propertyName && (
                                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <Home className="w-3.5 h-3.5" />
                                  {booking.propertyName.slice(0, 30)}
                                </span>
                              )}
                            </div>

                            <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              Email reçu le {fmt(booking.receivedAt)} • {booking.subject.slice(0, 80)}
                            </div>
                            {/* ── Avertissement : aucun logement correspondant (pas pour versements) ── */}
                            {booking.bookingType !== 'cancelled' && booking.bookingType !== 'payout' && properties.length > 0 && booking.propertyName && !findMatchingProperty(booking.propertyName, properties) && (
                              <div className={`mt-1 text-xs flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                <span>⚠️</span>
                                <span>Logement &quot;{booking.propertyName.slice(0, 40)}&quot; non reconnu — sera associé à <strong>{properties[0]?.name ?? '—'}</strong> (premier par défaut)</span>
                              </div>
                            )}
                            {booking.bookingType !== 'cancelled' && properties.length === 0 && (
                              <div className={`mt-1 text-xs flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                <span>⚠️</span>
                                <span>Aucun logement configuré — cet email sera ignoré</span>
                              </div>
                            )}
                          </div>

                          <button onClick={() => toggleExpand(booking.messageId)}
                            className={`flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                            {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {isExp && (
                          <div className={`mt-3 pt-3 border-t text-xs ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            {/* ── Récapitulatif parse brut ──────────────────── */}
                            <div className={`font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              🔍 Résultat du parse
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                              {/* Identification */}
                              <ParseField label="Type" value={booking.bookingType} badge={bookingTypeLabel[booking.bookingType]} isDark={isDark} />
                              <ParseField label="Confiance" value={`${booking.confidence}%`} isDark={isDark} highlight={booking.confidence >= 80 ? 'green' : booking.confidence >= 60 ? 'amber' : 'red'} />
                              <ParseField label="Code réservation" value={booking.confirmationCode} isDark={isDark} mono />
                              <ParseField label="Message ID" value={booking.messageId.slice(0, 22) + '…'} isDark={isDark} mono />
                              {/* Voyageur */}
                              <ParseField label="Voyageur" value={booking.guestName} isDark={isDark} />
                              <ParseField label="Voyageurs" value={booking.guests > 0 ? `${booking.guests} personne${booking.guests > 1 ? 's' : ''}` : undefined} isDark={isDark} />
                              <ParseField label="Email voyageur" value={booking.guestEmail} isDark={isDark} />
                              <ParseField label="Téléphone" value={booking.guestPhone} isDark={isDark} />
                              <ParseField label="Pays" value={booking.guestCountry} isDark={isDark} />
                              <ParseField label="Langue" value={booking.guestLanguage} isDark={isDark} />
                              {/* Séjour */}
                              <ParseField label="Arrivée" value={booking.checkIn ? fmt(booking.checkIn) : undefined} isDark={isDark} />
                              <ParseField label="Départ" value={booking.checkOut ? fmt(booking.checkOut) : undefined} isDark={isDark} />
                              <ParseField label="Nuits" value={booking.nights > 0 ? `${booking.nights} nuit${booking.nights > 1 ? 's' : ''}` : undefined} isDark={isDark} />
                              <ParseField label="Heure arrivée" value={booking.checkInTime} isDark={isDark} />
                              <ParseField label="Heure départ" value={booking.checkOutTime} isDark={isDark} />
                              {/* Logement */}
                              <ParseField label="Logement détecté" value={booking.propertyName} isDark={isDark} highlight={booking.propertyName ? 'blue' : undefined} />
                              {/* Finance */}
                              <ParseField label="Prix total" value={booking.totalPrice > 0 ? `${booking.totalPrice} ${booking.currency}` : undefined} isDark={isDark} highlight="green" />
                              <ParseField label="Prix / nuit" value={booking.nightlyRate ? `${booking.nightlyRate} ${booking.currency}` : undefined} isDark={isDark} />
                              <ParseField label="Frais ménage" value={booking.cleaningFee ? `${booking.cleaningFee} ${booking.currency}` : undefined} isDark={isDark} />
                              <ParseField label="Frais service" value={booking.serviceFee ? `${booking.serviceFee} ${booking.currency}` : undefined} isDark={isDark} />
                              <ParseField label="Taxes" value={booking.taxAmount ? `${booking.taxAmount} ${booking.currency}` : undefined} isDark={isDark} />
                              <ParseField label="Versement hôte" value={booking.hostPayout ? `${booking.hostPayout} ${booking.currency}` : undefined} isDark={isDark} highlight="green" />
                              <ParseField label="Devise" value={booking.currency} isDark={isDark} />
                              {/* Avis */}
                              {booking.bookingType === 'review' && (
                                <ParseField label="Note" value={booking.reviewRating ? `${'★'.repeat(booking.reviewRating)}${'☆'.repeat(5 - booking.reviewRating)} (${booking.reviewRating}/5)` : undefined} isDark={isDark} highlight="amber" />
                              )}
                              {booking.bookingType === 'review' && booking.reviewComment && (
                                <div className="col-span-2">
                                  <ParseField label="Commentaire" value={booking.reviewComment.slice(0, 200)} isDark={isDark} />
                                </div>
                              )}
                              {/* Sujet */}
                              <div className="col-span-2">
                                <ParseField label="Sujet email" value={booking.subject} isDark={isDark} mono />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedNew > 0 && (
                <div className="flex justify-center pt-2">
                  <button onClick={importSelected}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 font-bold shadow-md">
                    <Zap className="w-5 h-5" />
                    Traiter {selectedNew} email{selectedNew > 1 ? 's' : ''} sélectionné{selectedNew > 1 ? 's' : ''}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Aucun résultat ── */}
          {status === 'done' && bookings.length === 0 && (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <Mail className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <div className="font-medium">Aucun email Airbnb trouvé</div>
              <p className="text-sm mt-1">
                Vérifiez que vous avez des emails de{' '}
                <code className={`px-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}>automated@airbnb.com</code>
              </p>
            </div>
          )}
        </>
      )}

      {/* ── 🏠 Wizard nouveau logement ── */}
      {currentWizard && (
        <NewPropertyWizard
          detected={currentWizard}
          onClose={advanceQueue}
          onCreated={(name) => {
            advanceQueue();
            setImported(prev => [...prev, `__property__${name}`]);
          }}
        />
      )}
    </div>
  );
}
