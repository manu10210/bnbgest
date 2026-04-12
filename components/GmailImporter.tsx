'use client';

/**
 * 📧 GmailImporter — Importation automatique des réservations Airbnb depuis Gmail
 *
 * Flux :
 * 1. Vérifie si l'utilisateur est connecté avec Google (token Gmail dispo)
 * 2. Scanne la boîte Gmail pour les emails Airbnb
 * 3. Affiche la liste des réservations trouvées avec prévisualisation
 * 4. Permet de sélectionner et importer les réservations en 1 clic
 */

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useBNB } from '../contexts/BNBContext';
import {
  Mail, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, Search, Calendar,
  Users, DollarSign, Home, Zap, Filter, Info,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedBooking {
  source: 'gmail';
  messageId: string;
  subject: string;
  receivedAt: string;
  guestName: string;
  guestEmail?: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  currency: string;
  propertyName?: string;
  confirmationCode?: string;
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder';
  confidence: number;
}

type SyncStatus = 'idle' | 'checking' | 'syncing' | 'done' | 'error';
type FilterType = 'all' | 'new' | 'cancelled';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const confidenceColor = (c: number) =>
  c >= 80 ? 'text-green-600' : c >= 60 ? 'text-amber-500' : 'text-orange-500';

const bookingTypeLabel: Record<ParsedBooking['bookingType'], { label: string; color: string }> = {
  new:      { label: 'Nouvelle',   color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',  color: 'bg-red-100 text-red-700' },
  modified:  { label: 'Modifiée', color: 'bg-blue-100 text-blue-700' },
  reminder:  { label: 'Rappel',   color: 'bg-gray-100 text-gray-600' },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GmailImporter() {
  const { data: session } = useSession();
  const { addBooking, properties } = useBNB();

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

  const isGoogleUser = (session as { user?: { provider?: string } })?.user?.provider === 'google';

  // ─── Vérifier la connexion Gmail ──────────────────────────────────────────

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

  // ─── Scanner les emails Airbnb ─────────────────────────────────────────────

  const syncGmail = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    setBookings([]);
    setSelected(new Set());
    setImported([]);
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
          if (err.action === 'reconnect') {
            setError('reconnect');
            setStatus('error');
            return;
          }
          continue;
        }
        const data = await res.json();
        if (data.bookings) {
          for (const b of data.bookings) {
            if (!seen.has(b.messageId)) {
              seen.add(b.messageId);
              allBookings.push(b);
            }
          }
          if (data.stats) setStats(s => s
            ? { found: s.found + data.stats.found, parsed: s.parsed + data.stats.parsed, errors: s.errors + data.stats.errors }
            : data.stats
          );
        }
      }

      allBookings.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
      setBookings(allBookings);
      // Présélectionner les réservations "new" à haute confiance
      const preSelected = new Set(
        allBookings.filter(b => b.bookingType === 'new' && b.confidence >= 70).map(b => b.messageId)
      );
      setSelected(preSelected);
      setStatus('done');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    }
  }, []);

  // ─── Importer les réservations sélectionnées ───────────────────────────────

  const importSelected = useCallback(() => {
    const toImport = bookings.filter(b => selected.has(b.messageId) && b.bookingType === 'new');
    const defaultProperty = properties[0];

    for (const b of toImport) {
      // Trouver la propriété correspondante par nom (si disponible)
      const property = b.propertyName
        ? properties.find((p: { id: number; name: string }) => p.name.toLowerCase().includes(b.propertyName!.toLowerCase().slice(0, 6))) ?? defaultProperty
        : defaultProperty;

      if (!property) continue;

      const notes = [
        b.confirmationCode ? `Code Airbnb: ${b.confirmationCode}` : '',
        `Importé depuis Gmail (${fmt(b.receivedAt)})`,
        b.propertyName ? `Logement: ${b.propertyName}` : '',
      ].filter(Boolean).join(' | ');

      addBooking({
        propertyId: property.id,
        guestId: 0,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        guests: b.guests,
        totalPrice: b.totalPrice || 0,
        status: 'confirmed',
        paymentStatus: 'pending',
        specialRequests: notes,
        guestInfo: {
          name: b.guestName,
          email: b.guestEmail || '',
          phone: '',
        },
      });
    }

    setImported(toImport.map(b => b.messageId));
    setSelected(new Set());
  }, [bookings, selected, properties, addBooking]);

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visible = filtered.map(b => b.messageId);
    const allSelected = visible.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); visible.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...visible]));
    }
  };

  const filtered = bookings.filter(b =>
    filter === 'all' ? true :
    filter === 'new' ? b.bookingType === 'new' :
    b.bookingType === 'cancelled'
  );

  const newCount = bookings.filter(b => b.bookingType === 'new').length;
  const selectedNew = bookings.filter(b => selected.has(b.messageId) && b.bookingType === 'new').length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-red-500" />
            Import Gmail Airbnb
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Extraire automatiquement vos réservations depuis votre boîte Gmail
          </p>
        </div>
        {status === 'done' && stats && (
          <div className="text-right text-sm text-gray-500">
            <div className="font-semibold text-gray-700">{stats.parsed} réservations trouvées</div>
            <div>{stats.found} emails analysés</div>
          </div>
        )}
      </div>

      {/* État connexion */}
      {!isGoogleUser ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-amber-800">Connexion Google requise</div>
            <p className="text-amber-700 text-sm mt-1">
              Vous êtes connecté avec email/mot de passe. Pour accéder à Gmail, déconnectez-vous puis reconnectez-vous avec votre compte Google (<strong>claustre.emmanuel@gmail.com</strong>).
            </p>
          </div>
        </div>
      ) : error === 'reconnect' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-red-800">Autorisation Gmail expirée</div>
            <p className="text-red-700 text-sm mt-1">
              Déconnectez-vous et reconnectez-vous avec Google pour renouveler l'autorisation Gmail.
            </p>
            <div className="mt-3 p-3 bg-red-100 rounded-lg text-xs text-red-800 font-mono">
              ⚠️ Assurez-vous également que l'API Gmail est activée dans{' '}
              <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer" className="underline">
                Google Cloud Console
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Boutons d'action */}
          <div className="flex flex-wrap gap-3">
            {gmailConnected === null && (
              <button
                onClick={checkGmailConnection}
                disabled={status === 'checking'}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {status === 'checking' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                Vérifier la connexion Gmail
              </button>
            )}

            {gmailConnected === true && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Connecté : <strong>{gmailEmail}</strong>
              </div>
            )}

            {gmailConnected === false && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <XCircle className="w-4 h-4" />
                Gmail non accessible — vérifiez Google Cloud Console
              </div>
            )}

            <button
              onClick={syncGmail}
              disabled={status === 'syncing' || status === 'checking'}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all font-semibold text-sm disabled:opacity-50 shadow-sm"
            >
              {status === 'syncing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scanner les emails Airbnb
                </>
              )}
            </button>

            {selectedNew > 0 && (
              <button
                onClick={importSelected}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-semibold text-sm shadow-sm"
              >
                <Download className="w-4 h-4" />
                Importer {selectedNew} réservation{selectedNew > 1 ? 's' : ''}
              </button>
            )}
          </div>

          {/* Confirmation import */}
          {imported.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                ✅ {imported.length} réservation{imported.length > 1 ? 's importées' : ' importée'} avec succès !
              </span>
            </div>
          )}

          {/* Info Gmail API */}
          {status === 'idle' && bookings.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-800 mb-2">Comment ça marche ?</div>
                  <ol className="text-blue-700 text-sm space-y-1.5 list-decimal list-inside">
                    <li>BNBGest scanne vos emails Airbnb (<code className="bg-blue-100 px-1 rounded">automated@airbnb.com</code>)</li>
                    <li>Les réservations confirmées sont extraites automatiquement</li>
                    <li>Vous sélectionnez celles à importer et cliquez "Importer"</li>
                    <li>Les réservations apparaissent dans votre planning</li>
                  </ol>
                  <div className="mt-3 p-3 bg-blue-100 rounded-lg text-xs text-blue-700">
                    <strong>Prérequis :</strong> Activez l'API Gmail dans{' '}
                    <a href="https://console.cloud.google.com/apis/library/gmail.googleapis.com" target="_blank" rel="noreferrer" className="underline font-medium">
                      Google Cloud Console
                    </a>{' '}
                    et ajoutez le scope <code>gmail.readonly</code> à votre application OAuth.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Résultats */}
          {bookings.length > 0 && (
            <div className="space-y-4">
              {/* Filtres */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  {(['all', 'new', 'cancelled'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === f
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? `Tous (${bookings.length})` :
                       f === 'new' ? `Nouvelles (${newCount})` : 'Annulées'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={selectAll}
                  className="text-xs text-violet-600 hover:underline font-medium"
                >
                  {filtered.every(b => selected.has(b.messageId)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {/* Liste des réservations */}
              <div className="space-y-3">
                {filtered.map(booking => {
                  const isSelected = selected.has(booking.messageId);
                  const isExpanded = expanded.has(booking.messageId);
                  const isImported = imported.includes(booking.messageId);
                  const typeInfo = bookingTypeLabel[booking.bookingType];

                  return (
                    <div
                      key={booking.messageId}
                      className={`rounded-xl border-2 transition-all ${
                        isImported
                          ? 'border-green-300 bg-green-50 opacity-70'
                          : isSelected
                          ? 'border-violet-400 bg-violet-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          {!isImported && booking.bookingType === 'new' ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(booking.messageId)}
                              className="mt-1 w-4 h-4 rounded text-violet-600 cursor-pointer flex-shrink-0"
                            />
                          ) : (
                            <div className="w-4 h-4 mt-1 flex-shrink-0">
                              {isImported && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>
                          )}

                          {/* Infos principales */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{booking.guestName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              {booking.confirmationCode && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                                  #{booking.confirmationCode}
                                </span>
                              )}
                              <span className={`text-xs font-medium ml-auto ${confidenceColor(booking.confidence)}`}>
                                {booking.confidence}% confiance
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {fmt(booking.checkIn)} → {fmt(booking.checkOut)}
                                <span className="text-gray-400">({booking.nights}n)</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {booking.guests} voyageur{booking.guests > 1 ? 's' : ''}
                              </span>
                              {booking.totalPrice > 0 && (
                                <span className="flex items-center gap-1 font-medium text-green-700">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {booking.totalPrice.toFixed(0)} {booking.currency}
                                </span>
                              )}
                              {booking.propertyName && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Home className="w-3.5 h-3.5" />
                                  {booking.propertyName.slice(0, 30)}
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-gray-400">
                              Email reçu le {fmt(booking.receivedAt)} • {booking.subject.slice(0, 80)}
                            </div>
                          </div>

                          {/* Expand */}
                          <button
                            onClick={() => toggleExpand(booking.messageId)}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Détails étendus */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-600">
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

              {/* Bouton import bas de page */}
              {selectedNew > 0 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={importSelected}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-bold shadow-md"
                  >
                    <Zap className="w-5 h-5" />
                    Importer {selectedNew} réservation{selectedNew > 1 ? 's' : ''} dans BNBGest
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Aucun résultat */}
          {status === 'done' && bookings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <div className="font-medium">Aucun email Airbnb trouvé</div>
              <p className="text-sm mt-1">
                Vérifiez que vous avez des emails de <code className="bg-gray-100 px-1 rounded">automated@airbnb.com</code> dans votre boîte.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
