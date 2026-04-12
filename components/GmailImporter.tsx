'use client';

/**
 * 📧 GmailImporter — Importation automatique des réservations Airbnb depuis Gmail
 */

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  currency: string;
  cleaningFee?: number;
  serviceFee?: number;
  hostPayout?: number;
  propertyName?: string;
  confirmationCode?: string;
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review';
  confidence: number;
  reviewRating?: number;
  reviewComment?: string;
}

type SyncStatus = 'idle' | 'checking' | 'syncing' | 'done' | 'error';
type FilterType = 'all' | 'new' | 'cancelled';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const confidenceColor = (c: number) =>
  c >= 80 ? 'text-green-500' : c >= 60 ? 'text-amber-400' : 'text-orange-400';

const bookingTypeLabel: Record<ParsedBooking['bookingType'], { label: string; color: string }> = {
  new:       { label: 'Nouvelle',  color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   color: 'bg-red-100 text-red-700' },
  modified:  { label: 'Modifiée',  color: 'bg-blue-100 text-blue-700' },
  reminder:  { label: 'Rappel',    color: 'bg-gray-200 text-gray-700' },
  checkout:  { label: 'Départ',    color: 'bg-amber-100 text-amber-700' },
  review:    { label: 'Avis ⭐',   color: 'bg-purple-100 text-purple-700' },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GmailImporter() {
  const { data: session } = useSession();
  const {
    addBooking, updateBooking, cancelBooking,
    addGuest, updateGuest, guests,
    addMaintenanceTask,
    addReview,
    properties,
    bookings: existingBookings,
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

  // ── Détection nouveaux logements ──────────────────────────────────────────
  const [propertyQueue, setPropertyQueue] = useState<DetectedPropertyInfo[]>([]);
  const [currentWizard, setCurrentWizard] = useState<DetectedPropertyInfo | null>(null);

  const isGoogleUser = (session as { user?: { provider?: string } })?.user?.provider === 'google';

  // ─── Vérifier la connexion Gmail ─────────────────────────────────────────

  const checkGmailConnection = useCallback(async () => {
    setStatus('checking');
    setError(null);
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();
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
        'from:automated@airbnb.com',
        'from:express@airbnb.com subject:réservation',
        'from:airbnb.com subject:reservation',
      ];
      const allBookings: ParsedBooking[] = [];
      const seen = new Set<string>();

      for (const q of queries) {
        const res = await fetch(`/api/gmail/sync?q=${encodeURIComponent(q)}&max=20`);
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

  // ─── Importer les réservations sélectionnées ──────────────────────────────

  const importSelected = useCallback(() => {
    const toImport = bookings.filter(b => selected.has(b.messageId));
    const defaultProperty = properties[0];
    const summary = { created: 0, cancelled: 0, guestsCreated: 0, guestsUpdated: 0, skipped: 0, skippedDuplicate: 0, skippedNoProperty: 0, tasksCreated: 0, reviewsImported: 0 };

    for (const b of toImport) {

      // ── 1. Trouver le logement ────────────────────────────────────────────
      //   Matching sur le nom (6 premiers caractères) ou fallback sur le 1er logement.
      //   Si aucune propriété → on marque "skipped" seulement pour 'new' (pas cancel/review)
      let property = b.propertyName
        ? properties.find(p => {
            const pn = p.name.toLowerCase();
            const bn = b.propertyName!.toLowerCase();
            // Correspondance sur 6 chars, ou sur mots communs (3+ chars)
            if (pn.includes(bn.slice(0, 6)) || bn.includes(pn.slice(0, 6))) return true;
            const pWords = pn.split(/\s+/).filter(w => w.length >= 3);
            const bWords = bn.split(/\s+/).filter(w => w.length >= 3);
            return pWords.some(w => bWords.includes(w));
          }) ?? defaultProperty
        : defaultProperty;

      if (!property && b.bookingType !== 'cancelled') {
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
        }
      }

      // ── 4e. Rappel (reminder) → créer tâche de préparation J-1 ──────────
      if (b.bookingType === 'reminder' && property) {
        // Créer une tâche d'inspection/préparation J-1
        const prepDate = new Date(b.checkIn);
        prepDate.setDate(prepDate.getDate() - 1);
        const prepDateStr = prepDate.toISOString().split('T')[0];

        addMaintenanceTask({
          propertyId: property.id,
          title: `🔍 Préparation J-1 — ${b.guestName}`,
          description: [
            `Vérification avant arrivée le ${fmt(b.checkIn)} (${b.nights} nuit${b.nights > 1 ? 's' : ''}).`,
            `Voyageurs : ${b.guests}.`,
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
    }

    setImported(toImport.map(b => b.messageId));
    setImportSummary(summary);
    setSelected(new Set());

    // ── 5. Détecter les nouveaux logements inconnus ───────────────────────
    // On inclut aussi les emails skippés pour "sans logement" avec un propertyName
    const newBookingsOnly = toImport.filter(b => b.bookingType === 'new');
    const skippedWithName = toImport.filter(b =>
      b.bookingType !== 'cancelled' &&
      b.propertyName &&
      !properties.find(p => {
        const pn = p.name.toLowerCase();
        const bn = b.propertyName!.toLowerCase();
        if (pn.includes(bn.slice(0, 6)) || bn.includes(pn.slice(0, 6))) return true;
        const pWords = pn.split(/\s+/).filter(w => w.length >= 3);
        const bWords = bn.split(/\s+/).filter(w => w.length >= 3);
        return pWords.some(w => bWords.includes(w));
      })
    );
    const allNamesForWizard = [
      ...newBookingsOnly.map(b => b.propertyName ?? ''),
      ...skippedWithName.map(b => b.propertyName ?? ''),
    ];
    const newNames = findNewPropertyNames(allNamesForWizard, properties);
    if (newNames.length > 0) {
      const queue = newNames.map(n => analyzeAirbnbTitle(n));
      setPropertyQueue(queue.slice(1));
      setCurrentWizard(queue[0]);
    }
  }, [bookings, selected, properties, existingBookings, guests, addBooking, updateBooking, cancelBooking, addGuest, updateGuest, addMaintenanceTask, addReview]);

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
  // Tout type sélectionnable (new, cancelled, modified) sauf reminder
  const selectedNew = bookings.filter(b => selected.has(b.messageId) && b.bookingType !== 'reminder').length;

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
            <div>{stats.found} emails analysés</div>
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
      ) : error === 'reconnect' ? (
        <div className={`border rounded-xl p-5 flex items-start gap-3 ${isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'}`}>
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Autorisation Gmail expirée</div>
            <p className={`text-sm mt-1 ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              Déconnectez-vous et reconnectez-vous avec Google pour renouveler l&apos;autorisation.
            </p>
          </div>
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
          </div>

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
                          {!isImp && booking.bookingType === 'new' ? (
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
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {fmt(booking.checkIn)} → {fmt(booking.checkOut)}
                                <span className={`ml-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>({booking.nights}n)</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {booking.guests} voyageur{booking.guests > 1 ? 's' : ''}
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
                            {/* ── Avertissement : aucun logement correspondant ── */}
                            {booking.bookingType !== 'cancelled' && properties.length > 0 && booking.propertyName && !properties.find(p => {
                              const pn = p.name.toLowerCase(); const bn = booking.propertyName!.toLowerCase();
                              if (pn.includes(bn.slice(0, 6)) || bn.includes(pn.slice(0, 6))) return true;
                              return pn.split(/\s+/).filter(w => w.length >= 3).some(w => bn.split(/\s+/).filter(w2 => w2.length >= 3).includes(w));
                            }) && (
                              <div className={`mt-1 text-xs flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                <span>⚠️</span>
                                <span>Logement &quot;{booking.propertyName.slice(0, 40)}&quot; non trouvé — sera associé à <strong>{properties[0]?.name ?? '—'}</strong> (premier par défaut)</span>
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
                          <div className={`mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
                            <div><span className="font-medium">Message ID :</span> {booking.messageId.slice(0, 20)}…</div>
                            {booking.guestEmail && <div><span className="font-medium">Email :</span> {booking.guestEmail}</div>}
                            <div><span className="font-medium">Devise :</span> {booking.currency}</div>
                            <div><span className="font-medium">Confiance :</span> {booking.confidence}%</div>
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
