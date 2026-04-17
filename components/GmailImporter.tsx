'use client';

/**
 * 📧 GmailImporter — Importation automatique des réservations Airbnb depuis Gmail
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Mail, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, Search, Calendar,
  Users, DollarSign, Home, Zap, Filter, Info, Sparkles, DownloadCloud, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
  guestAdults?: number;
  guestChildren?: number;
  guestInfants?: number;
  guestPets?: number;
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
  payoutDate?: string;
  payoutMethod?: string;
  propertyName?: string;
  confirmationCode?: string;
  bookingType: 'new' | 'cancelled' | 'modified' | 'reminder' | 'checkout' | 'review' | 'payout';
  confidence: number;
  warnings?: string[];
  reviewRating?: number;
  reviewComment?: string;
  airbnbListingId?: string;
  relatedMessageIds?: string[];
  timelineEvents?: Array<{
    messageId: string;
    bookingType: ParsedBooking['bookingType'];
    receivedAt: string;
    confidence: number;
  }>;
  parserPatternVersion?: string;
  classificationSource?: 'subject' | 'body_fallback' | 'unknown';
  classificationRuleId?: string;
  classificationRegex?: string;
}

type SyncStatus = 'idle' | 'checking' | 'syncing' | 'importing' | 'done' | 'error';
type FilterType = 'all' | 'new' | 'cancelled' | 'modified' | 'review' | 'payout';

interface RejectedBooking {
  booking: ParsedBooking;
  reasons: string[];
}

interface QualityReport {
  scanned: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  reasonBreakdown: Record<string, number>;
}

interface ImportTraceEntry {
  messageId: string;
  bookingType: ParsedBooking['bookingType'];
  guestName: string;
  status: 'success' | 'skipped' | 'error';
  action: string;
  reason?: string;
  receivedAt: string;
}

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

const ANALYSIS_START_2026 = new Date('2026-01-01T00:00:00.000Z');

const FRENCH_MONTH_MAP: Record<string, number> = {
  jan: 0, janv: 0, janvier: 0,
  fev: 1, fév: 1, fevr: 1, févr: 1, fevrier: 1, février: 1,
  mar: 2, mars: 2,
  avr: 3, avril: 3,
  mai: 4,
  jun: 5, juin: 5,
  jul: 6, juil: 6, juillet: 6,
  aou: 7, août: 7, aout: 7,
  sep: 8, sept: 8, septembre: 8,
  oct: 9, octobre: 9,
  nov: 10, novembre: 10,
  dec: 11, déc: 11, decembre: 11, décembre: 11,
};

function isIsoDate(value?: string): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidDateRange(checkIn?: string, checkOut?: string): boolean {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return false;
  const safeCheckIn = checkIn as string;
  const safeCheckOut = checkOut as string;
  const inTs = new Date(safeCheckIn).getTime();
  const outTs = new Date(safeCheckOut).getTime();
  if (Number.isNaN(inTs) || Number.isNaN(outTs)) return false;
  const diffDays = Math.round((outTs - inTs) / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= 365;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseIsoDateFromFrenchParts(dayInput?: string, monthInput?: string, yearInput?: string, fallbackYear?: number): string | undefined {
  const day = Number.parseInt(dayInput || '', 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return undefined;

  if (!monthInput) return undefined;
  const monthToken = monthInput
    .replace(/\./g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const monthIndex = FRENCH_MONTH_MAP[monthToken];
  if (monthIndex === undefined) return undefined;

  const inferredYear = yearInput
    ? Number.parseInt(yearInput, 10)
    : (fallbackYear ?? new Date().getFullYear());
  if (!Number.isFinite(inferredYear) || inferredYear < 2020 || inferredYear > 2100) return undefined;

  const candidate = new Date(Date.UTC(inferredYear, monthIndex, day));
  if (Number.isNaN(candidate.getTime())) return undefined;
  if (candidate.getUTCDate() !== day || candidate.getUTCMonth() !== monthIndex || candidate.getUTCFullYear() !== inferredYear) {
    return undefined;
  }

  return formatIsoDate(candidate);
}

function parseDateRangeFromSubject(subject?: string, receivedAt?: string): { checkIn: string; checkOut: string; nights: number } | undefined {
  if (!subject) return undefined;

  const normalized = stripInvisibleUnicode(subject)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();
  const fallbackYear = receivedAt ? new Date(receivedAt).getFullYear() : new Date().getFullYear();

  // Ex: "du 12 mars au 15 mars", "du 28 déc 2026 au 2 janv 2027"
  const frRange = normalized.match(/\bdu\s+(\d{1,2})\s+([a-zéû\.]+)(?:\s+(\d{4}))?\s+au\s+(\d{1,2})\s+([a-zéû\.]+)?(?:\s+(\d{4}))?/i);
  if (frRange) {
    const checkIn = parseIsoDateFromFrenchParts(frRange[1], frRange[2], frRange[3], fallbackYear);
    const outMonth = frRange[5] || frRange[2];
    let checkOut = parseIsoDateFromFrenchParts(frRange[4], outMonth, frRange[6], fallbackYear);

    if (checkIn && checkOut && !frRange[6] && new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
      // Passage d'année implicite (ex: fin déc → début janv)
      const nextYear = (new Date(checkIn).getUTCFullYear() + 1).toString();
      checkOut = parseIsoDateFromFrenchParts(frRange[4], outMonth, nextYear, fallbackYear);
    }

    if (isValidDateRange(checkIn, checkOut)) {
      const nights = Math.max(1, Math.round((new Date(checkOut as string).getTime() - new Date(checkIn as string).getTime()) / (1000 * 60 * 60 * 24)));
      return { checkIn: checkIn as string, checkOut: checkOut as string, nights };
    }
  }

  // Ex: "du 12/03/2026 au 15/03/2026" (année optionnelle)
  const numericRange = normalized.match(/\bdu\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+au\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (numericRange) {
    const parseYear = (raw?: string) => {
      if (!raw) return fallbackYear;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) return fallbackYear;
      return n < 100 ? 2000 + n : n;
    };

    const inDay = Number.parseInt(numericRange[1], 10);
    const inMonth = Number.parseInt(numericRange[2], 10) - 1;
    const inYear = parseYear(numericRange[3]);
    const outDay = Number.parseInt(numericRange[4], 10);
    const outMonth = Number.parseInt(numericRange[5], 10) - 1;
    let outYear = parseYear(numericRange[6]);

  const inDate = new Date(Date.UTC(inYear, inMonth, inDay));
    let outDate = new Date(Date.UTC(outYear, outMonth, outDay));
    if (!numericRange[6] && outDate.getTime() <= inDate.getTime()) {
      outYear += 1;
      outDate = new Date(Date.UTC(outYear, outMonth, outDay));
    }

    if (!Number.isNaN(inDate.getTime()) && !Number.isNaN(outDate.getTime())) {
      const checkIn = formatIsoDate(inDate);
      const checkOut = formatIsoDate(outDate);
      if (isValidDateRange(checkIn, checkOut)) {
        const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
        return { checkIn, checkOut, nights };
      }
    }
  }

  return undefined;
}

function parseArrivalDateFromSubject(subject?: string, receivedAt?: string): string | undefined {
  if (!subject) return undefined;
  const normalized = stripInvisibleUnicode(subject)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();

  const m = normalized.match(/\barrive\s+(?:le\s+)?(\d{1,2})\s+([a-zéû\.]+)(?:\s+(\d{4}))?/i);
  if (!m) return undefined;
  const fallbackYear = receivedAt ? new Date(receivedAt).getFullYear() : new Date().getFullYear();
  return parseIsoDateFromFrenchParts(m[1], m[2], m[3], fallbackYear);
}

function enrichBookingDateRange(booking: ParsedBooking): ParsedBooking {
  // Les emails d'avis/versement ne contiennent pas forcément un vrai séjour.
  // Évite d'inférer des dates artificielles depuis le sujet.
  if (booking.bookingType === 'review' || booking.bookingType === 'payout') {
    return booking;
  }

  if (isValidDateRange(booking.checkIn, booking.checkOut)) return booking;

  // 1) Inférence précise si le sujet contient explicitement une plage "du ... au ..."
  const inferredRange = parseDateRangeFromSubject(booking.subject, booking.receivedAt);
  if (inferredRange) {
    return {
      ...booking,
      checkIn: inferredRange.checkIn,
      checkOut: inferredRange.checkOut,
      nights: inferredRange.nights,
      warnings: Array.from(new Set([
        ...(booking.warnings || []),
        'date_range_inferred_precisely_from_subject',
      ])),
    };
  }

  const inferredCheckIn = isIsoDate(booking.checkIn)
    ? booking.checkIn
    : parseArrivalDateFromSubject(booking.subject, booking.receivedAt);
  if (!inferredCheckIn) return booking;

  const nights = Number.isFinite(booking.nights) && booking.nights > 0 ? booking.nights : 1;
  const checkInDate = new Date(`${inferredCheckIn}T00:00:00.000Z`);
  if (Number.isNaN(checkInDate.getTime())) return booking;

  const inferredCheckOutDate = new Date(checkInDate);
  inferredCheckOutDate.setUTCDate(inferredCheckOutDate.getUTCDate() + nights);
  const inferredCheckOut = formatIsoDate(inferredCheckOutDate);

  if (!isValidDateRange(inferredCheckIn, inferredCheckOut)) return booking;

  return {
    ...booking,
    checkIn: inferredCheckIn,
    checkOut: inferredCheckOut,
    nights,
    warnings: Array.from(new Set([
      ...(booking.warnings || []),
      'date_range_inferred_from_subject',
      'checkout_inferred_from_nights',
    ])),
  };
}

function enrichReviewFromContext(
  booking: ParsedBooking,
  existingBookings: Array<{
    propertyId: number;
    checkIn: string;
    checkOut: string;
    specialRequests?: string;
    guestInfo?: { name?: string };
    status?: string;
  }>,
  properties: Array<{ id: number; name: string }>,
): ParsedBooking {
  if (booking.bookingType !== 'review') return booking;

  const hasGuest = !!booking.guestName && !isPlaceholderGuestName(booking.guestName);
  const hasProperty = !!booking.propertyName?.trim();
  const hasDates = isValidDateRange(booking.checkIn, booking.checkOut);
  if (hasGuest && hasProperty && hasDates) return booking;

  const receivedTs = new Date(booking.receivedAt).getTime();
  if (Number.isNaN(receivedTs)) return booking;

  const candidateByCode = booking.confirmationCode
    ? existingBookings.find(b => b.specialRequests?.includes(booking.confirmationCode!))
    : undefined;

  const candidates = candidateByCode
    ? [candidateByCode]
    : existingBookings
        .filter(b => {
          if (b.status === 'cancelled') return false;
          if (!isIsoDate(b.checkOut)) return false;
          const outTs = new Date(`${b.checkOut}T00:00:00.000Z`).getTime();
          if (Number.isNaN(outTs)) return false;
          const diffDays = (receivedTs - outTs) / (1000 * 60 * 60 * 24);
          // Un email d'avis arrive généralement peu après le départ.
          return diffDays >= 0 && diffDays <= 45;
        })
        .sort((a, z) => {
          const aDiff = Math.abs(receivedTs - new Date(`${a.checkOut}T00:00:00.000Z`).getTime());
          const zDiff = Math.abs(receivedTs - new Date(`${z.checkOut}T00:00:00.000Z`).getTime());
          return aDiff - zDiff;
        });

  const match = candidates[0];
  if (!match) return booking;

  const matchedProperty = properties.find(p => p.id === match.propertyId);
  const inferredNights =
    isIsoDate(match.checkIn) && isIsoDate(match.checkOut)
      ? Math.max(1, Math.round((new Date(match.checkOut).getTime() - new Date(match.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : booking.nights;

  return {
    ...booking,
    guestName: hasGuest ? booking.guestName : (match.guestInfo?.name || booking.guestName),
    propertyName: hasProperty ? booking.propertyName : (matchedProperty?.name || booking.propertyName),
    checkIn: hasDates ? booking.checkIn : (isIsoDate(match.checkIn) ? match.checkIn : booking.checkIn),
    checkOut: hasDates ? booking.checkOut : (isIsoDate(match.checkOut) ? match.checkOut : booking.checkOut),
    nights: hasDates ? booking.nights : (inferredNights || booking.nights),
    warnings: Array.from(new Set([...(booking.warnings || []), 'review_context_inferred'])),
  };
}

function enrichBookingPropertyFromContext(
  booking: ParsedBooking,
  existingBookings: Array<{
    propertyId: number;
    checkIn: string;
    checkOut: string;
    specialRequests?: string;
    guestInfo?: { name?: string };
  }>,
  properties: Array<{ id: number; name: string; city?: string; address?: string }>,
): ParsedBooking {
  const cleanPropertyWarnings = (warnings: string[] = []) => warnings.filter((w) => {
    const normalized = w.toLowerCase();
    return !(
      normalized.includes('logement introuvable') ||
      normalized.includes('property_not_found') ||
      normalized.includes('missing_property')
    );
  });

  const hasProperty = !!booking.propertyName?.trim();
  if (hasProperty) return booking;

  const contextProperty = inferPropertyFromContext(booking, properties, existingBookings);
  if (contextProperty) {
    return {
      ...booking,
      propertyName: contextProperty.name,
      warnings: Array.from(new Set([
        ...cleanPropertyWarnings(booking.warnings || []),
        'property_inferred_from_context',
      ])),
    };
  }

  const subjectProperty = findMatchingProperty(booking.subject, properties);
  if (subjectProperty) {
    return {
      ...booking,
      propertyName: subjectProperty.name,
      warnings: Array.from(new Set([
        ...cleanPropertyWarnings(booking.warnings || []),
        'property_inferred_from_subject',
      ])),
    };
  }

  // Cas fréquent en exploitation réelle : 1 seul logement configuré.
  if (properties.length === 1) {
    return {
      ...booking,
      propertyName: properties[0].name,
      warnings: Array.from(new Set([
        ...cleanPropertyWarnings(booking.warnings || []),
        'property_inferred_single_property_fallback',
      ])),
    };
  }

  return booking;
}

function inferPropertyFromContext<T extends { id: number; name: string; city?: string; address?: string }>(
  booking: ParsedBooking,
  properties: T[],
  existingBookings: Array<{
    propertyId: number;
    checkIn: string;
    checkOut: string;
    specialRequests?: string;
    guestInfo?: { name?: string };
  }>,
): T | undefined {
  if (!booking) return undefined;

  if (booking.confirmationCode) {
    const byCode = existingBookings.find(b => b.specialRequests?.includes(booking.confirmationCode!));
    if (byCode) return properties.find(p => p.id === byCode.propertyId);
  }

  const guest = booking.guestName?.trim().toLowerCase();
  if (guest) {
    const targetCheckInTs = isIsoDate(booking.checkIn) ? new Date(booking.checkIn as string).getTime() : Number.NaN;
    const byGuest = existingBookings
      .filter(b => (b.guestInfo?.name || '').trim().toLowerCase() === guest)
      .sort((a, z) => {
        const aScore = Number.isNaN(targetCheckInTs)
          ? 0
          : Math.abs(new Date(a.checkIn).getTime() - targetCheckInTs);
        const zScore = Number.isNaN(targetCheckInTs)
          ? 0
          : Math.abs(new Date(z.checkIn).getTime() - targetCheckInTs);
        return aScore - zScore;
      })[0];

    if (byGuest) {
      return properties.find(p => p.id === byGuest.propertyId);
    }
  }

  // Cas fréquent en mono-logement : fallback sûr.
  if (properties.length === 1) return properties[0];
  return undefined;
}

function isPlaceholderGuestName(name?: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return n === '' || n === 'voyageur airbnb' || n === 'airbnb guest' || n === 'guest';
}

function stripInvisibleUnicode(value: string): string {
  return value
    // BiDi isolations / marks / soft formatting chars frequently found in Gmail subjects
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanGuestName(candidate?: string): string | undefined {
  if (!candidate) return undefined;
  const cleaned = stripInvisibleUnicode(candidate)
    .replace(/^[\s\-–—:;,.!?()\[\]{}"'“”‘’]+/g, '')
    .replace(/[\s\-–—:;,.!?()\[\]{}"'“”‘’]+$/g, '')
    .replace(/[|•·]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Au moins prénom + nom, et pas une phrase système
  if (!cleaned || cleaned.length < 3) return undefined;
  if (/^(r[ée]servation|booking|airbnb|arrive|check)/i.test(cleaned)) return undefined;
  if (!/^[A-Za-zÀ-ÿ'’\-\s]+$/.test(cleaned)) return undefined;

  return cleaned;
}

function inferGuestNameFromSubject(subject?: string): string | undefined {
  if (!subject) return undefined;
  const normalizedSubject = stripInvisibleUnicode(subject)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const patterns = [
    /r[ée]servation\s+confirm[ée]e?\s*[:\-]\s*(.+?)\s+arrive(?:\s+le|\s+demain|\b)/i,
    /r[ée]servation\s+confirm[ée]e?\s+pour\s+(.+?)\s+arrive(?:\s+le|\s+demain|\b)/i,
    /booking\s+confirmed\s*:\s*([^:|\-]+?)\s+arrives?\b/i,
    /:\s*([A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){1,4})\s+arrive(?:\s+le|\s+demain|\b)/i,
    /^\s*(?:\[[^\]]+\]\s*)?([A-Za-zÀ-ÿ'’\-]+(?:\s+[A-Za-zÀ-ÿ'’\-]+){1,3})\s+(?:arrive|a\s+r[ée]serv[ée]|a\s+annul[ée]|part)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedSubject.match(pattern);
    const maybeName = cleanGuestName(match?.[1]);
    if (maybeName) return maybeName;
  }
  return undefined;
}

function enrichBookingGuestName(booking: ParsedBooking): ParsedBooking {
  if (!isPlaceholderGuestName(booking.guestName)) return booking;
  const inferred = inferGuestNameFromSubject(booking.subject);
  if (!inferred) return booking;
  return {
    ...booking,
    guestName: inferred,
    warnings: Array.from(new Set([...(booking.warnings || []), 'guest_name_inferred_from_subject'])),
  };
}

function evaluateBookingQuality(b: ParsedBooking): { accepted: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!b.messageId) reasons.push('missing_message_id');
  if (!b.subject?.trim()) reasons.push('missing_subject');
  if (!b.receivedAt || Number.isNaN(new Date(b.receivedAt).getTime())) reasons.push('invalid_received_at');
  if (b.receivedAt && !Number.isNaN(new Date(b.receivedAt).getTime()) && new Date(b.receivedAt) < ANALYSIS_START_2026) {
    reasons.push('outside_2026_window');
  }
  if (b.confidence < 40) reasons.push('low_confidence');
  if (b.confirmationCode && !/^HM[A-Z0-9]{6,12}$/i.test(b.confirmationCode)) reasons.push('invalid_confirmation_code');

  const effectiveGuestName = isPlaceholderGuestName(b.guestName)
    ? inferGuestNameFromSubject(b.subject)
    : b.guestName;
  const hasGuestName = !!cleanGuestName(effectiveGuestName) && !isPlaceholderGuestName(effectiveGuestName);
  const hasRealGuestName = hasGuestName;

  switch (b.bookingType) {
    case 'new':
      if (!hasRealGuestName) reasons.push('missing_real_guest_name');
      if (!isValidDateRange(b.checkIn, b.checkOut)) reasons.push('invalid_date_range');
      if (!(b.totalPrice > 0 || !!b.confirmationCode)) reasons.push('missing_price_or_confirmation_code');
      break;
    case 'modified':
      if (!hasRealGuestName) reasons.push('missing_real_guest_name');
      if (!isValidDateRange(b.checkIn, b.checkOut)) reasons.push('invalid_date_range');
      break;
    case 'cancelled':
      if (!hasGuestName) reasons.push('missing_guest_name');
      if (!isValidDateRange(b.checkIn, b.checkOut)) reasons.push('invalid_date_range');
      break;
    case 'checkout':
    case 'reminder':
      if (!hasGuestName) reasons.push('missing_guest_name');
      if (!isValidDateRange(b.checkIn, b.checkOut)) reasons.push('invalid_date_range');
      break;
    case 'review':
      if (!((typeof b.reviewRating === 'number' && b.reviewRating >= 1 && b.reviewRating <= 5) ||
        (b.reviewComment?.trim().length ?? 0) >= 10)) {
        reasons.push('review_without_rating_or_comment');
      }
      break;
    case 'payout':
      if (!((b.hostPayout ?? 0) > 0)) reasons.push('payout_without_amount');
      break;
    default:
      reasons.push('unsupported_booking_type');
      break;
  }

  return {
    accepted: reasons.length === 0,
    reasons,
  };
}

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

const PROPERTY_STOP_WORDS = new Set([
  'les', 'des', 'une', 'pour', 'avec', 'sur', 'sous', 'dans', 'par', 'qui', 'que', 'aux',
  'son', 'ses', 'nos', 'vos', 'leur', 'leurs', 'cette', 'cela', 'plus', 'mais', 'car',
  'voir', 'chez', 'vers', 'ici', 'la', 'le', 'du', 'au', 'de', 'et', 'ou', 'tout', 'tous',
]);

const PROPERTY_NOISE_PATTERNS: RegExp[] = [
  /\bairbnb\b/g,
  /\breservation\b/g,
  /\bbooking\b/g,
  /\bconfirm(?:ee|e|ed)?\b/g,
  /\barriv(?:e|es|er|ee)s?\b/g,
  /\bdepart\b/g,
  /\bannul(?:e|ee|ation)?\b/g,
  /\bmodifi(?:e|ee|cation)?\b/g,
  /\brappel\b/g,
  /\breminder\b/g,
  /\bcheck\s*in\b/g,
  /\bcheck\s*out\b/g,
  /\bversement\b/g,
  /\bpayout\b/g,
  /\bvoyageur\b/g,
  /\bguest\b/g,
];

function sanitizePropertyLabel(input: string): string {
  let value = normalizeForMatch(input);
  for (const pattern of PROPERTY_NOISE_PATTERNS) {
    value = value.replace(pattern, ' ');
  }
  return value.replace(/\s{2,}/g, ' ').trim();
}

function tokenizePropertyLabel(input: string): string[] {
  const cleaned = sanitizePropertyLabel(input) || normalizeForMatch(input);
  return cleaned
    .split(/\s+/)
    .filter(token => token.length >= 2 && !PROPERTY_STOP_WORDS.has(token));
}

function bigrams(input: string): string[] {
  const compact = normalizeForMatch(input).replace(/\s+/g, '');
  if (compact.length < 2) return compact ? [compact] : [];
  const grams: string[] = [];
  for (let i = 0; i < compact.length - 1; i++) {
    grams.push(compact.slice(i, i + 2));
  }
  return grams;
}

function diceCoefficient(a: string, b: string): number {
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  if (aGrams.length === 0 || bGrams.length === 0) return 0;
  const bCounts = new Map<string, number>();
  for (const gram of bGrams) {
    bCounts.set(gram, (bCounts.get(gram) || 0) + 1);
  }
  let common = 0;
  for (const gram of aGrams) {
    const count = bCounts.get(gram) || 0;
    if (count > 0) {
      common++;
      bCounts.set(gram, count - 1);
    }
  }
  return (2 * common) / (aGrams.length + bGrams.length);
}

function tokenOverlapScore(inputA: string, inputB: string): number {
  const aTokens = tokenizePropertyLabel(inputA);
  const bTokens = tokenizePropertyLabel(inputB);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  let weightedCommon = 0;
  const used = new Set<number>();

  for (const tokenA of aTokens) {
    let matchedIndex = -1;
    let matchedWeight = 0;
    for (let i = 0; i < bTokens.length; i++) {
      if (used.has(i)) continue;
      const tokenB = bTokens[i];
      if (tokenA === tokenB) {
        matchedIndex = i;
        matchedWeight = Math.max(1, Math.min(tokenA.length, 6));
        break;
      }
      if ((tokenA.length >= 4 && tokenB.includes(tokenA)) || (tokenB.length >= 4 && tokenA.includes(tokenB))) {
        matchedIndex = i;
        matchedWeight = 2;
      }
    }
    if (matchedIndex >= 0) {
      used.add(matchedIndex);
      weightedCommon += matchedWeight;
    }
  }

  const totalWeight = aTokens.reduce((acc, token) => acc + Math.max(1, Math.min(token.length, 6)), 0);
  if (totalWeight === 0) return 0;
  return Math.round((weightedCommon / totalWeight) * 100);
}

function propertyMatchScore(emailName: string, propName: string, hints: string[] = []): number {
  const e = sanitizePropertyLabel(emailName) || normalizeForMatch(emailName);
  const p = sanitizePropertyLabel(propName) || normalizeForMatch(propName);
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

  const tokenScore = tokenOverlapScore(e, p);
  if (tokenScore >= 85) return tokenScore;

  const diceScore = Math.round(diceCoefficient(e, p) * 100);

  const hintScore = hints
    .filter(Boolean)
    .reduce((best, hint) => Math.max(best, tokenOverlapScore(e, hint)), 0);

  const compactE = e.replace(/\s+/g, '');
  const compactP = p.replace(/\s+/g, '');
  const compactContains = compactE.length >= 5 && compactP.length >= 5 && (compactE.includes(compactP) || compactP.includes(compactE))
    ? 78
    : 0;

  const blended = Math.max(
    Math.round(tokenScore * 0.7 + diceScore * 0.3),
    hintScore > 0 ? Math.round(tokenScore * 0.6 + hintScore * 0.4) : 0,
    compactContains,
  );
  if (blended > 0) return blended;

  // Mots significatifs en commun (3+ chars, hors mots vides)
  const eWords = e.split(/\s+/).filter(w => w.length >= 3 && !PROPERTY_STOP_WORDS.has(w));
  const pWords = p.split(/\s+/).filter(w => w.length >= 3 && !PROPERTY_STOP_WORDS.has(w));
  const common = eWords.filter(w => pWords.some(pw => pw.includes(w) || w.includes(pw)));
  if (common.length === 0) return 0;
  // Score proportionnel au nombre de mots communs / total de mots
  const score = (common.length * 2) / (eWords.length + pWords.length) * 100;
  return Math.round(score);
}

// Trouve la meilleure propriété correspondante (score ≥ 40)
function findMatchingProperty<T extends { name: string; city?: string; address?: string }>(
  emailPropertyName: string | undefined,
  properties: T[],
  fallback?: T
): T | undefined {
  if (!emailPropertyName?.trim()) return fallback;
  let best: T | undefined;
  let bestScore = 0;
  let secondBest = 0;
  for (const p of properties) {
    const score = propertyMatchScore(emailPropertyName, p.name, [p.city || '', p.address || '']);
    if (score > bestScore) {
      secondBest = bestScore;
      best = p;
      bestScore = score;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  // Forte confiance, ou faible ambiguïté
  if (bestScore >= 52) return best;
  if (bestScore >= 40 && bestScore - secondBest >= 8) return best;

  // Évite les mauvais rattachements automatiques quand le nom détecté est ambigu.
  return undefined;
}

function findBestPropertyCandidate<T extends { name: string; city?: string; address?: string }>(
  emailPropertyName: string | undefined,
  properties: T[],
): { property?: T; score: number; ambiguous: boolean; secondScore: number } {
  if (!emailPropertyName?.trim() || properties.length === 0) {
    return { property: undefined, score: 0, ambiguous: false, secondScore: 0 };
  }

  let best: T | undefined;
  let bestScore = 0;
  let secondBest = 0;

  for (const p of properties) {
    const score = propertyMatchScore(emailPropertyName, p.name, [p.city || '', p.address || '']);
    if (score > bestScore) {
      secondBest = bestScore;
      best = p;
      bestScore = score;
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  const ambiguous = secondBest > 0 && bestScore - secondBest < 8;
  return { property: best, score: bestScore, ambiguous, secondScore: secondBest };
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

function normalizeEventTimeline(events: ParsedBooking['timelineEvents'] = []): ParsedBooking['timelineEvents'] {
  const seen = new Set<string>();
  const deduped = events.filter(e => {
    if (seen.has(e.messageId)) return false;
    seen.add(e.messageId);
    return true;
  });
  return deduped.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
}

function mergeBookingsTimeline(root: ParsedBooking, incoming: ParsedBooking, typePriority: Record<ParsedBooking['bookingType'], number>) {
  // Historique des emails liés
  root.relatedMessageIds = Array.from(new Set([...(root.relatedMessageIds || [root.messageId]), incoming.messageId]));
  root.timelineEvents = normalizeEventTimeline([
    ...(root.timelineEvents || [{ messageId: root.messageId, bookingType: root.bookingType, receivedAt: root.receivedAt, confidence: root.confidence }]),
    { messageId: incoming.messageId, bookingType: incoming.bookingType, receivedAt: incoming.receivedAt, confidence: incoming.confidence },
  ]);

  // Warnings cumulés (utile debug import)
  if (incoming.warnings?.length) {
    root.warnings = Array.from(new Set([...(root.warnings || []), ...incoming.warnings]));
  }

  // Email le plus récent pour le contexte principal
  if (new Date(incoming.receivedAt) > new Date(root.receivedAt)) {
    root.receivedAt = incoming.receivedAt;
    root.subject = incoming.subject || root.subject;
    root.messageId = incoming.messageId;
  }

  // Promotion du type (new > modified > cancelled > checkout > reminder > review > payout)
  const incomingTypePriority = typePriority[incoming.bookingType] ?? 0;
  const rootTypePriority = typePriority[root.bookingType] ?? 0;
  if (incomingTypePriority > rootTypePriority) {
    root.bookingType = incoming.bookingType;
  }

  // Données voyageur / propriété
  if ((!root.guestName || root.guestName === 'Voyageur Airbnb') && incoming.guestName && incoming.guestName !== 'Voyageur Airbnb') {
    root.guestName = incoming.guestName;
  }
  if (!root.guestEmail && incoming.guestEmail) root.guestEmail = incoming.guestEmail;
  if (!root.guestPhone && incoming.guestPhone) root.guestPhone = incoming.guestPhone;
  if (!root.guestLanguage && incoming.guestLanguage) root.guestLanguage = incoming.guestLanguage;
  if (!root.guestCountry && incoming.guestCountry) root.guestCountry = incoming.guestCountry;
  if (!root.propertyName && incoming.propertyName) root.propertyName = incoming.propertyName;
  if (!root.airbnbListingId && incoming.airbnbListingId) root.airbnbListingId = incoming.airbnbListingId;

  // Dates : priorité au type modified si présent, sinon garder la première date fiable
  const incomingHasDates = !!incoming.checkIn && !!incoming.checkOut;
  if (incoming.bookingType === 'modified' && incomingHasDates) {
    root.checkIn = incoming.checkIn;
    root.checkOut = incoming.checkOut;
    root.nights = incoming.nights;
  } else if ((!root.checkIn || !root.checkOut) && incomingHasDates) {
    root.checkIn = incoming.checkIn;
    root.checkOut = incoming.checkOut;
    root.nights = incoming.nights;
  }

  // Horaires
  if (!root.checkInTime && incoming.checkInTime) root.checkInTime = incoming.checkInTime;
  if (!root.checkOutTime && incoming.checkOutTime) root.checkOutTime = incoming.checkOutTime;

  // Composition voyageurs
  if ((!root.guests || root.guests <= 0) && incoming.guests > 0) root.guests = incoming.guests;
  if (!root.guestAdults && incoming.guestAdults) root.guestAdults = incoming.guestAdults;
  if (!root.guestChildren && incoming.guestChildren) root.guestChildren = incoming.guestChildren;
  if (!root.guestInfants && incoming.guestInfants) root.guestInfants = incoming.guestInfants;
  if (!root.guestPets && incoming.guestPets) root.guestPets = incoming.guestPets;

  // Finance : privilégier les valeurs non nulles + plus complètes
  if ((!root.totalPrice || root.totalPrice === 0) && incoming.totalPrice && incoming.totalPrice > 0) root.totalPrice = incoming.totalPrice;
  if (!root.nightlyRate && incoming.nightlyRate) root.nightlyRate = incoming.nightlyRate;
  if (!root.cleaningFee && incoming.cleaningFee) root.cleaningFee = incoming.cleaningFee;
  if (!root.serviceFee && incoming.serviceFee) root.serviceFee = incoming.serviceFee;
  if (!root.taxAmount && incoming.taxAmount) root.taxAmount = incoming.taxAmount;
  if ((!root.hostPayout || root.hostPayout === 0) && incoming.hostPayout && incoming.hostPayout > 0) root.hostPayout = incoming.hostPayout;
  if (!root.payoutDate && incoming.payoutDate) root.payoutDate = incoming.payoutDate;
  if (!root.payoutMethod && incoming.payoutMethod) root.payoutMethod = incoming.payoutMethod;
  if (!root.currency && incoming.currency) root.currency = incoming.currency;

  // Classification debug metadata (si dispo côté parser)
  if (!root.parserPatternVersion && incoming.parserPatternVersion) root.parserPatternVersion = incoming.parserPatternVersion;
  if (!root.classificationSource && incoming.classificationSource) root.classificationSource = incoming.classificationSource;
  if (!root.classificationRuleId && incoming.classificationRuleId) root.classificationRuleId = incoming.classificationRuleId;
  if (!root.classificationRegex && incoming.classificationRegex) root.classificationRegex = incoming.classificationRegex;

  // Confiance : garder la meilleure confiance observée dans la timeline
  if ((incoming.confidence ?? 0) > (root.confidence ?? 0)) {
    root.confidence = incoming.confidence;
  }
}

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
  const [importSummary, setImportSummary] = useState<{ created: number; cancelled: number; guestsCreated: number; guestsUpdated: number; skipped: number; skippedDuplicate: number; skippedNoProperty: number; tasksCreated: number; reviewsImported: number ; payoutsSaved: number; expensesCreated: number} | null>(null);
  const [isExportingRejected, setIsExportingRejected] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ bookings: number; guests: number } | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [rejectedBookings, setRejectedBookings] = useState<RejectedBooking[]>([]);
  const [activeRejectReason, setActiveRejectReason] = useState<string>('all');
  const [importTrace, setImportTrace] = useState<ImportTraceEntry[]>([]);
  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, number>>({});
  const scanInFlightRef = useRef(false);

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
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;
    setStatus('syncing');
    setError(null);
    setStats(null);
    setBookings([]);
    setSelected(new Set());
    setQualityReport(null);
    setRejectedBookings([]);
    setActiveRejectReason('all');
    setImportTrace([]);
  setPropertyOverrides({});
      
    setImported([]);
    setImportSummary(null);
    try {
      const queries = [
        // ① Tous les emails de automated@airbnb.com (notifications hôte principales)
        'from:automated@airbnb.com after:2026/01/01',
        // ② Réservations + versements depuis les autres domaines Airbnb
        'from:express@airbnb.com after:2026/01/01',
        // ③ Rappels, départs, et confirmations depuis no-reply@airbnb.com
        'from:no-reply@airbnb.com after:2026/01/01',
        // ④ Emails avec sujet versement depuis n'importe quel @airbnb.com
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
            if (!seen.has(b.messageId)) {
              seen.add(b.messageId);
              const normalized = enrichBookingPropertyFromContext(
                enrichBookingDateRange(enrichBookingGuestName(b as ParsedBooking)),
                existingBookings,
                properties,
              );
              allBookings.push(normalized);
            }
          }
          if (data.stats) setStats(s => s
            ? { found: s.found + data.stats.found, parsed: s.parsed + data.stats.parsed, errors: s.errors + data.stats.errors }
            : data.stats
          );
        }
      }

      const qualityEvaluations = allBookings.map((booking) => {
        const quality = evaluateBookingQuality(booking);
        return {
          booking,
          accepted: quality.accepted,
          reasons: quality.reasons,
        };
      });

      const qualityBookings = qualityEvaluations.filter(r => r.accepted).map(r => r.booking);
      const rejected = qualityEvaluations
        .filter(r => !r.accepted)
        .map(r => ({ booking: r.booking, reasons: r.reasons }));
      const rejectedCount = rejected.length;

      const reasonBreakdown = rejected.reduce<Record<string, number>>((acc, item) => {
        for (const reason of item.reasons) {
          acc[reason] = (acc[reason] || 0) + 1;
        }
        return acc;
      }, {});

      setRejectedBookings(rejected);
      setQualityReport({
        scanned: allBookings.length,
        accepted: qualityBookings.length,
        rejected: rejectedCount,
        acceptanceRate: allBookings.length > 0 ? Math.round((qualityBookings.length / allBookings.length) * 100) : 0,
        reasonBreakdown,
      });

      if (rejectedCount > 0) {
        console.info(`[GmailImporter] ${rejectedCount} email(s) ignoré(s) (qualité insuffisante)`);
      }

      qualityBookings.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

      // Regroupement des emails concernant la même réservation (par confirmationCode)
      // RÈGLE : on groupe uniquement les emails avec un vrai code Airbnb "HM…"
      // Les payout avec code HM sont gardés SÉPARÉS (type différent, traitement différent)
      // Priorité de type : new > modified > cancelled > checkout > reminder > review > payout
      const TYPE_PRIORITY: Record<ParsedBooking['bookingType'], number> = {
        new: 7, modified: 6, cancelled: 5, checkout: 4, reminder: 3, review: 2, payout: 1,
      };
      const groupedMap = new Map<string, ParsedBooking>();
      const finalBookings: ParsedBooking[] = [];

      for (const b of qualityBookings) {
        // Sécuriser le regroupement : uniquement si le code commence par "HM" (vrai code Airbnb)
        const isValidCode = b.confirmationCode && /^HM[A-Z0-9]{6,12}$/i.test(b.confirmationCode);
        
        if (!isValidCode) {
          // Pas de code HM valide → entrée indépendante
          finalBookings.push(b);
        } else {
          const code = b.confirmationCode!.toUpperCase();
          // Clé unique : code + type pour garder payout séparé
          const groupKey = b.bookingType === 'payout' ? `${code}_payout` : code;

          if (!groupedMap.has(groupKey)) {
            const base: ParsedBooking = {
              ...b,
              relatedMessageIds: [b.messageId],
              timelineEvents: [{
                messageId: b.messageId,
                bookingType: b.bookingType,
                receivedAt: b.receivedAt,
                confidence: b.confidence,
              }],
            };
            groupedMap.set(groupKey, base);
            finalBookings.push(groupedMap.get(groupKey)!);
          } else {
            const root = groupedMap.get(groupKey)!;
            mergeBookingsTimeline(root, b, TYPE_PRIORITY);
          }
        }
      }

  const enrichedFinalBookings = finalBookings.map(b => enrichReviewFromContext(b, existingBookings, properties));

  setBookings(enrichedFinalBookings);
      // Auto-sélectionner uniquement :
      // - nouvelles réservations avec confiance ≥ 70%
      // - annulations et modifications (toujours — impactent les réservations existantes)
      // - avis (enrichissement de données)
      // NE PAS auto-sélectionner reminder/checkout — ces types ne créent pas de nouvelle réservation
      setSelected(new Set(enrichedFinalBookings.filter(b =>
        (b.bookingType === 'new' && b.confidence >= 70) ||
        b.bookingType === 'cancelled' ||
        b.bookingType === 'modified' ||
        b.bookingType === 'review'
      ).map(b => b.messageId)));
      setStatus('done');
    } catch (e) {
      setError(String(e));
      setStatus('error');
    } finally {
      scanInFlightRef.current = false;
    }
  }, [existingBookings, properties]);

  const exportRejectedAsCsv = useCallback(async () => {
    if (rejectedBookings.length === 0) return;
    setIsExportingRejected(true);
    try {
      const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
      const header = [
        'messageId', 'receivedAt', 'bookingType', 'confidence', 'confirmationCode',
        'guestName', 'propertyName', 'subject', 'reasons', 'classificationSource', 'classificationRuleId', 'parserPatternVersion',
      ];
      const rows = rejectedBookings.map(({ booking, reasons }) => ([
        booking.messageId || '',
        booking.receivedAt || '',
        booking.bookingType || '',
        String(booking.confidence ?? ''),
        booking.confirmationCode || '',
        booking.guestName || '',
        booking.propertyName || '',
        booking.subject || '',
        reasons.join('|'),
        booking.classificationSource || '',
        booking.classificationRuleId || '',
        booking.parserPatternVersion || '',
      ].map(v => escapeCsv(v)).join(',')));

      const csv = [header.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateTag = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `gmail-quality-rejected-${dateTag}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Export des rejets généré (${rejectedBookings.length} email(s)).`);
    } catch {
      toast.error('Échec de l’export des rejets CSV.');
    } finally {
      setIsExportingRejected(false);
    }
  }, [rejectedBookings]);

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

  const importSelected = useCallback(async () => {
  setStatus('importing');
    const toImport = bookings.filter(b => selected.has(b.messageId));
    const defaultProperty = properties[0];
    const summary = { created: 0, cancelled: 0, guestsCreated: 0, guestsUpdated: 0, skipped: 0, skippedDuplicate: 0, skippedNoProperty: 0, tasksCreated: 0, reviewsImported: 0, payoutsSaved: 0, expensesCreated: 0 };
    const localGuests = [...guests];
    const localBookings = [...existingBookings];
    const trace: ImportTraceEntry[] = [];

    const pushTrace = (entry: Omit<ImportTraceEntry, 'receivedAt'> & { receivedAt?: string }) => {
      trace.push({
        ...entry,
        receivedAt: entry.receivedAt || new Date().toISOString(),
      });
    };

    const touchLocalBooking = (id: number, updates: Record<string, unknown>) => {
      const idx = localBookings.findIndex(b => b.id === id);
      if (idx === -1) return;
      localBookings[idx] = {
        ...localBookings[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    };

    const pushLocalBooking = (payload: Parameters<typeof addBooking>[0]) => {
      const nowIso = new Date().toISOString();
      const nextId = Math.max(...localBookings.map(bk => bk.id), 0) + 1;
      localBookings.push({
        ...payload,
        id: nextId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      return nextId;
    };

    for (const b of toImport) {
      await new Promise(r => setTimeout(r, 200)); // Animation de transfert visible

      // ── 1. Trouver le logement ────────────────────────────────────────────
      //   Matching robuste sur nom détecté. Fallback par défaut seulement
      //   si aucun nom de logement n'a été extrait.
      //   Pour payout/review : logique spécifique ensuite.
      const useFallback = b.bookingType !== 'payout' && b.bookingType !== 'review';
      const hasDetectedPropertyName = !!b.propertyName?.trim();
      const overridePropertyId = propertyOverrides[b.messageId];
      let property = overridePropertyId
        ? properties.find((p) => p.id === overridePropertyId)
        : findMatchingProperty(b.propertyName, properties);

      if (overridePropertyId && property) {
        pushTrace({
          messageId: b.messageId,
          bookingType: b.bookingType,
          guestName: b.guestName || '—',
          status: 'success',
          action: 'property_override_applied',
          reason: `property_id:${overridePropertyId}`,
          receivedAt: b.receivedAt,
        });
      }

      if (!property) {
        const inferred = inferPropertyFromContext(b, properties, localBookings);
        if (inferred) {
          property = inferred;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'property_inferred_from_context',
            reason: hasDetectedPropertyName ? 'property_name_unmatched_context_used' : 'property_missing_context_used',
            receivedAt: b.receivedAt,
          });
        }
      }

      if (!property && !hasDetectedPropertyName && useFallback) {
        property = defaultProperty;
      }

      // ── 1b. Pour les avis (review) : retrouver le logement par recoupement ──
      // L'email d'avis Airbnb ne contient pas le nom du logement.
      // Stratégie : chercher la réservation la plus récente du voyageur dans les 30j
      // avant la réception de l'email, puis utiliser son propertyId.
      if (!property && b.bookingType === 'review') {
        const reviewDate = new Date(b.receivedAt);
        // Chercher une réservation récente du même voyageur (checkout dans les 30j précédents)
        const recentBooking = localBookings
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

      if (!property && b.bookingType !== 'cancelled' && b.bookingType !== 'payout' && b.bookingType !== 'review') {
        summary.skipped++;
        summary.skippedNoProperty++;
        pushTrace({
          messageId: b.messageId,
          bookingType: b.bookingType,
          guestName: b.guestName || '—',
          status: 'skipped',
          action: 'skip_no_property',
          reason: 'no_matching_property',
          receivedAt: b.receivedAt,
        });
        continue;
      }

      // ── 2. Trouver ou créer le voyageur (Guest) ──────────────────────────
      let guestId = 0;
      if (b.guestName && b.guestName !== 'Voyageur Airbnb') {
        const existing = localGuests.find(g =>
          g.name.toLowerCase() === b.guestName.toLowerCase() ||
          (b.guestEmail && g.email && g.email.toLowerCase() === b.guestEmail.toLowerCase())
        );

        if (existing) {
          const updates: Partial<typeof existing> = {};
          if (b.guestEmail && !existing.email) updates.email = b.guestEmail;
          if (b.guestPhone && !existing.phone) updates.phone = b.guestPhone;
          if (b.totalPrice > 0) updates.totalSpent = (existing.totalSpent || 0) + b.totalPrice;
          if (Object.keys(updates).length) {
            updateGuest(existing.id, updates);
            Object.assign(existing, updates);
          }
          guestId = existing.id;
          summary.guestsUpdated++;
        } else if (b.bookingType === 'new') {
          const nextGuestId = Math.max(...localGuests.map(g => g.id), 0) + 1;
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
          localGuests.push({
            id: nextGuestId,
            name: b.guestName,
            email: b.guestEmail || '',
            phone: b.guestPhone || '',
            language: 'fr',
            status: 'active',
            nationality: undefined,
            lastBooking: b.checkIn,
            preferences: { smoking: false, pets: false, parties: false, preferredAmenities: [] },
            createdAt: new Date().toISOString(),
            totalBookings: 0,
            totalSpent: 0,
            rating: 0,
          });
          guestId = nextGuestId;
          summary.guestsCreated++;
        }
      }

      // ── 3. Vérifier doublon ───────────────────────────────────────────────
      // a) Par code de confirmation (fiable)
      if (b.confirmationCode) {
        const alreadyExists = localBookings.some(eb =>
          eb.specialRequests?.includes(b.confirmationCode!)
        );
        if (alreadyExists) {
          summary.skipped++;
          summary.skippedDuplicate++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'skipped',
            action: 'skip_duplicate',
            reason: 'duplicate_confirmation_code',
            receivedAt: b.receivedAt,
          });
          continue;
        }
      }
      // b) Par dates + voyageur + logement (pour emails sans confirmationCode)
      if (!b.confirmationCode && property && b.bookingType === 'new') {
        const alreadyExists = localBookings.some(eb =>
          eb.propertyId === property!.id &&
          eb.checkIn === b.checkIn &&
          eb.checkOut === b.checkOut &&
          eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
        );
        if (alreadyExists) {
          summary.skipped++;
          summary.skippedDuplicate++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'skipped',
            action: 'skip_duplicate',
            reason: 'duplicate_dates_guest_property',
            receivedAt: b.receivedAt,
          });
          continue;
        }
      }

      const notes = [
        b.confirmationCode ? `Code Airbnb: ${b.confirmationCode}` : '',
        `Importé depuis Gmail (${fmt(b.receivedAt)})`,
        b.propertyName ? `Logement: ${b.propertyName}` : '',
        b.guestPhone ? `Tél: ${b.guestPhone}` : '',
        b.airbnbListingId ? `Annonce Airbnb ID: ${b.airbnbListingId}` : '',
        b.guestLanguage ? `Langue: ${b.guestLanguage}` : '',
        b.guestCountry ? `Pays: ${b.guestCountry}` : '',
        (b.guestAdults || b.guestChildren || b.guestInfants || b.guestPets)
          ? `Composition: ${[
              b.guestAdults ? `${b.guestAdults} adulte${b.guestAdults > 1 ? 's' : ''}` : '',
              b.guestChildren ? `${b.guestChildren} enfant${b.guestChildren > 1 ? 's' : ''}` : '',
              b.guestInfants ? `${b.guestInfants} bébé${b.guestInfants > 1 ? 's' : ''}` : '',
              b.guestPets ? `${b.guestPets} animal${b.guestPets > 1 ? 'aux' : ''}` : '',
            ].filter(Boolean).join(', ')}`
          : '',
      ].filter(Boolean).join(' | ');

      // ── 4a. Nouvelle réservation ──────────────────────────────────────────
      if (b.bookingType === 'new' && property) {
  const bookingPayload: Parameters<typeof addBooking>[0] = {
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
        };
        addBooking(bookingPayload);
        pushLocalBooking(bookingPayload);
        summary.created++;
        pushTrace({
          messageId: b.messageId,
          bookingType: b.bookingType,
          guestName: b.guestName || '—',
          status: 'success',
          action: 'booking_created',
          receivedAt: b.receivedAt,
        });

        // Incrémenter le compteur de réservations du voyageur
        if (guestId) {
          const g = localGuests.find(gg => gg.id === guestId);
          if (g) {
            const guestUpdates = {
              totalBookings: (g.totalBookings || 0) + 1,
              totalSpent: (g.totalSpent || 0) + (b.totalPrice || 0),
              lastBooking: b.checkIn,
            };
            updateGuest(guestId, guestUpdates);
            Object.assign(g, guestUpdates);
          }
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
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : undefined;

        // Sinon par dates + voyageur
        if (!match && property) {
          match = localBookings.find(eb =>
            eb.propertyId === property.id &&
            eb.checkIn === b.checkIn &&
            eb.checkOut === b.checkOut &&
            eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
          );
        }

        if (match && match.status !== 'cancelled') {
          cancelBooking(match.id, `Annulé via Gmail — ${notes}`);
          touchLocalBooking(match.id, { status: 'cancelled' });
          summary.cancelled++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_cancelled',
            receivedAt: b.receivedAt,
          });
        } else {
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'skipped',
            action: 'cancel_not_found',
            reason: 'no_matching_booking',
            receivedAt: b.receivedAt,
          });
        }
      }

      // ── 4c. Modification → mettre à jour la réservation existante ─────────
      if (b.bookingType === 'modified' && property) {
        const match = b.confirmationCode
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : localBookings.find(eb =>
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
          touchLocalBooking(match.id, {
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice || match.totalPrice,
            specialRequests: `[MODIFIÉ] ${notes}`,
          });
          summary.created++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_updated',
            receivedAt: b.receivedAt,
          });
        } else {
          const bookingPayload: Parameters<typeof addBooking>[0] = {
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
          };
          addBooking(bookingPayload);
          pushLocalBooking(bookingPayload);
          summary.created++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_created_from_modified',
            receivedAt: b.receivedAt,
          });
        }
      }

      // ── 4d. Départ (checkout) → marquer réservation "completed" + créer tâche ménage ──
      if (b.bookingType === 'checkout' && property) {
        // Retrouver la réservation correspondante
        const match = b.confirmationCode
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : localBookings.find(eb =>
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
          touchLocalBooking(match.id, {
            status: 'completed',
            paymentStatus: 'paid',
            totalPrice: b.hostPayout || b.totalPrice || match.totalPrice,
            specialRequests: `${match.specialRequests || ''} | [TERMINÉ] Départ confirmé Gmail`,
          });
          summary.created++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_completed_checkout',
            receivedAt: b.receivedAt,
          });
        } else {
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'skipped',
            action: 'checkout_not_found',
            reason: 'no_matching_booking',
            receivedAt: b.receivedAt,
          });
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
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : localBookings.find(eb =>
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
            touchLocalBooking(matchedReminder.id, updates);
          }
          summary.created++; // compté comme une action (enrichissement)
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_enriched_from_reminder',
            receivedAt: b.receivedAt,
          });
        } else {
          // Aucune réservation trouvée → en créer une depuis le rappel
          // (l'email de confirmation n'a peut-être pas encore été importé)
          const bookingPayload: Parameters<typeof addBooking>[0] = {
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
          };
          addBooking(bookingPayload);
          pushLocalBooking(bookingPayload);
          summary.created++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'booking_created_from_reminder',
            receivedAt: b.receivedAt,
          });
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
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : localBookings.find(eb =>
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
          touchLocalBooking(matchedBooking.id, { status: 'completed' });
        }

        summary.reviewsImported++;
        pushTrace({
          messageId: b.messageId,
          bookingType: b.bookingType,
          guestName: b.guestName || '—',
          status: 'success',
          action: 'review_imported',
          receivedAt: b.receivedAt,
        });
      }

      // ── 4g. Versement (payout) → enrichir la réservation avec données financières ──
      if (b.bookingType === 'payout') {
        // Retrouver la réservation liée (par code de confirmation ou voyageur)
        const payoutBooking = b.confirmationCode
          ? localBookings.find(eb => eb.specialRequests?.includes(b.confirmationCode!))
          : property
            ? localBookings.find(eb =>
                eb.propertyId === property.id &&
                eb.guestInfo?.name?.toLowerCase() === b.guestName.toLowerCase()
              )
            : undefined;

  const payoutAmount = b.hostPayout || b.totalPrice || 0;
  const payoutDateStr = b.payoutDate || b.receivedAt?.split('T')[0] || new Date().toISOString().split('T')[0];

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
          touchLocalBooking(payoutBooking.id, {
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
          summary.payoutsSaved++;
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'success',
            action: 'payout_attached_to_booking',
            receivedAt: b.receivedAt,
          });
        } else if (payoutAmount > 0) {
          // Aucune réservation trouvée → créer une réservation "fantôme" financière
          // pour tracer le versement dans les données
          const pid = property?.id ?? (properties[0]?.id ?? 0);
          if (pid) {
            const bookingPayload: Parameters<typeof addBooking>[0] = {
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
            };
            addBooking(bookingPayload);
            pushLocalBooking(bookingPayload);
            summary.created++;
            pushTrace({
              messageId: b.messageId,
              bookingType: b.bookingType,
              guestName: b.guestName || '—',
              status: 'success',
              action: 'payout_created_as_financial_booking',
              receivedAt: b.receivedAt,
            });
          }
        } else {
          pushTrace({
            messageId: b.messageId,
            bookingType: b.bookingType,
            guestName: b.guestName || '—',
            status: 'skipped',
            action: 'payout_skipped',
            reason: 'missing_payout_amount',
            receivedAt: b.receivedAt,
          });
        }
      }

      // ── 4.h. Créer les dépenses (Expenses) pour les frais Airbnb retenus ──
    if ((b.bookingType === 'new' || b.bookingType === 'payout') && ((b.totalPrice > 0) || (b.hostPayout && b.hostPayout > 0))) {
          const pid = property?.id || defaultProperty?.id;

          // Frais de service (Mise en gestion/frais Airbnb)
          if (b.serviceFee && b.serviceFee > 0) {
            fetch('/api/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Frais de service Airbnb (${b.guestName})`,
                description: 'Frais de plateforme prélevés par Airbnb',
                amount: b.serviceFee,
                currency: b.currency || 'EUR',
                category: 'MANAGEMENT',
                date: (b.bookingType === 'payout' && b.payoutDate) ? b.payoutDate : b.checkIn,
                propertyId: pid,
                vendor: 'Airbnb',
                notes: b.confirmationCode ? `Réservation: ${b.confirmationCode}` : '',
              }),
            }).catch(console.error); // silencieux
            summary.expensesCreated++;
          }

          // Taxes de séjour retenues
          if (b.taxAmount && b.taxAmount > 0) {
            fetch('/api/expenses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Taxes de séjour Airbnb (${b.guestName})`,
                description: 'Taxes retenues et reversées par Airbnb',
                amount: b.taxAmount,
                currency: b.currency || 'EUR',
                category: 'TAX',
                date: (b.bookingType === 'payout' && b.payoutDate) ? b.payoutDate : b.checkIn,
                propertyId: pid,
                vendor: 'Airbnb',
                notes: b.confirmationCode ? `Réservation: ${b.confirmationCode}` : '',
              }),
            }).catch(console.error);
            summary.expensesCreated++;
          }
        }
      }

      setImported(toImport.map(b => b.messageId));   
      setImportSummary(summary);
      setImportTrace(trace.slice(-200));
      setSelected(new Set());

      // ── 5. Détecter les nouveaux logements inconnus ───────────────────────
      // Tous les emails (importés ou non) avec un propertyName qui ne correspond
      // à aucun logement existant → proposer le wizard de création.
      const isKnownProperty = (name: string) =>
        findMatchingProperty(name, properties) !== undefined;

      // On prend TOUS les bookings importés (toImport) avec
      // un propertyName détecté mais inconnu — pour ne rater aucun nouveau logement
      const allCandidates = toImport
        .filter(b => b.propertyName?.trim() && !isKnownProperty(b.propertyName) && b.bookingType !== 'review' && b.bookingType !== 'payout');

      const allNamesForWizard = allCandidates.map(b => b.propertyName!.trim());

      // Cas aucun logement configuré : si aucun nom extrait mais des emails sans logement,
      // proposer le wizard avec les noms uniques trouvés dans les sujets des emails
      if (allNamesForWizard.length === 0 && summary.skippedNoProperty > 0) {
        // Extraire les noms uniques depuis les sujets des emails skippés
        const fallbackNames = Array.from(new Set(
          toImport
            .filter(b => !b.propertyName?.trim())
            .map(b => {
              // Si le sujet ressemble à "Prénom arrive le...", "arrive le", "arrive demain"
              // ou tout autre sujet de rappel/voyageur, ce n'est PAS un nom de logement
              const isPersonSubject =
                /^(?:\[[^\]]+\]\s*)?[A-ZÀÂÄÉÈÊËÎÏÔÙÛܟŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\s+[A-Za-zÀ-ÿ\-]+){0,3}\s+(a\s+r[eé]serv|annul|modifi|laiss|part\s|arrive|r[eé]dig|souhait|veut|aimer)/i.test(b.subject || '')
                || /\barrive\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(b.subject || '')
                || /^rappel\s*[:\-–]/i.test(b.subject || '')
                || /\bpart\s+(aujourd|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(b.subject || '')
                || /\bcheck[\s-]?(in|out)\b/i.test(b.subject || '');
              if (isPersonSubject) return '';

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
            .filter(n => n.length >= 5 && !/[?=&%]|https?:/.test(n) && !(n.length > 50 && !n.includes(' ')))
        ));
        if (fallbackNames.length > 0) {
          const queue = fallbackNames.map(n => analyzeAirbnbTitle(n));
          setPropertyQueue(queue.slice(1));
          setCurrentWizard(queue[0]);
          setStatus('done');
          setTimeout(() => setStatus('idle'), 2500);
          return;
        }
        // Dernier recours : ouvrir le wizard avec un nom vide pour que l'utilisateur saisisse
        setCurrentWizard(analyzeAirbnbTitle('Mon logement'));
        setStatus('done');
        setTimeout(() => setStatus('idle'), 2500);
        return;
      }

      const newNames = findNewPropertyNames(allNamesForWizard, properties);
      if (newNames.length > 0) {
        const queue = newNames.map(n => analyzeAirbnbTitle(n));
        setPropertyQueue(queue.slice(1));
        setCurrentWizard(queue[0]);
      }

      setTimeout(() => setStatus('idle'), 2500);
      setStatus('done');
  }, [bookings, selected, properties, existingBookings, guests, addBooking, updateBooking, cancelBooking, addGuest, updateGuest, addMaintenanceTask, addReview, notifyEmail, inventory, updateInventoryItem, getLowStockItems, propertyOverrides]);

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
    setQualityReport(null);
    setRejectedBookings([]);
    setActiveRejectReason('all');
    setImportTrace([]);
    setPropertyOverrides({});
  }, [purgeGmailImports]);

  const rejectReasonEntries = useMemo(() => {
    return Object.entries(qualityReport?.reasonBreakdown ?? {})
      .sort((a, b) => b[1] - a[1]);
  }, [qualityReport]);

  const filteredRejected = useMemo(() => {
    if (activeRejectReason === 'all') return rejectedBookings;
    return rejectedBookings.filter(r => r.reasons.includes(activeRejectReason));
  }, [rejectedBookings, activeRejectReason]);

  // ─── Avancer dans la file de nouveaux logements ───────────────────────────

  const advanceQueue = useCallback(() => {
    setPropertyQueue(prev => {
      const next = prev.slice(1);
      setCurrentWizard(next[0] ?? null);
      return next;
    });
  }, []);

  // ─── UI Helpers ───────────────────────────────────────────────────────────

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const selectAll = () => {
    const visible = filtered.map(b => b.messageId);
    const allSel = visible.every(id => selected.has(id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSel) visible.forEach(id => n.delete(id));
      else visible.forEach(id => n.add(id));
      return n;
    });
  };

  const filtered = bookings.filter(b => filter === 'all' ? true : b.bookingType === filter);
  const newCount = bookings.filter(b => b.bookingType === 'new').length;
  // Sélectionnable : tout type
  const selectedNew = bookings.filter(b => selected.has(b.messageId)).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  const card = isDark ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300';
  const cardSelected = isDark ? 'border-violet-500 bg-violet-900/30' : 'border-violet-400 bg-violet-50';
  const cardImported = isDark ? 'border-green-700 bg-green-900/20 opacity-70' : 'border-green-300 bg-green-50 opacity-70';

  return (
    <>
      <AnimatePresence>
        {(status === 'importing' || status === 'syncing') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`relative w-full max-w-sm rounded-[1.5rem] p-8 text-center shadow-2xl flex flex-col items-center gap-6 overflow-hidden ${isDark ? 'bg-gray-800 border-[0.5px] border-white/10' : 'bg-white border-[0.5px] border-black/5'}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none ${status === 'importing' ? 'from-violet-500/10' : 'from-pink-500/10'}`} />
              
              <div className={`relative w-16 h-16 flex items-center justify-center z-10 ${status === 'importing' ? 'text-violet-500' : 'text-pink-500'}`}>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className={`absolute inset-0 rounded-full border-4 border-t-[currentColor] w-16 h-16 ${status === 'importing' ? 'border-violet-500/20' : 'border-pink-500/20'}`}
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {status === 'importing' ? <DownloadCloud className="w-6 h-6" /> : <Search className="w-6 h-6" />}
                </motion.div>
              </div>
              
              <div className="relative z-10 space-y-2">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {status === 'importing' ? 'Transfert en cours' : 'Analyse de votre Gmail'}
                </h3>
                <p className={`text-sm font-medium ${isDark ? (status === 'importing' ? 'text-violet-400' : 'text-pink-400') : (status === 'importing' ? 'text-violet-600' : 'text-pink-600')}`}>
                  {status === 'importing' ? 'Extraction & classification...' : 'Recherche de réservations & financières...'}
                </p>
              </div>
              
              <div className="w-full bg-gray-100 dark:bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden relative z-10">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: status === 'syncing' ? 4 : 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`h-full ${status === 'importing' ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]' : 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]'}`}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <div>{stats.found} emails analysés · depuis 2026</div>
          </div>
        )}
      </div>

      {qualityReport && (
        <div className={`border rounded-xl p-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                📊 Qualité du scan Gmail (Session 30)
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {qualityReport.scanned} analysés · {qualityReport.accepted} acceptés · {qualityReport.rejected} rejetés · {qualityReport.acceptanceRate}% d&apos;acceptation
              </div>
            </div>

            {qualityReport.rejected > 0 && (
              <button
                onClick={exportRejectedAsCsv}
                disabled={isExportingRejected}
                title={isExportingRejected ? 'Export en cours…' : 'Exporter les emails rejetés en CSV'}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isDark
                    ? 'border-amber-700 text-amber-300 hover:bg-amber-900/30 disabled:opacity-60 disabled:cursor-not-allowed'
                    : 'border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {isExportingRejected ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {isExportingRejected ? 'Export…' : 'Export rejets CSV'}
              </button>
            )}
          </div>

          {rejectReasonEntries.length > 0 && (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveRejectReason('all')}
                  className={`text-[11px] px-2 py-1 rounded-full font-medium border transition-colors ${
                    activeRejectReason === 'all'
                      ? (isDark ? 'bg-violet-900/40 text-violet-300 border-violet-700' : 'bg-violet-100 text-violet-700 border-violet-300')
                      : (isDark ? 'bg-gray-700/70 text-gray-300 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100')
                  }`}
                >
                  all · {qualityReport.rejected}
                </button>
                {rejectReasonEntries.slice(0, 8).map(([reason, count]) => {
                  const selected = activeRejectReason === reason;
                  return (
                    <button
                      key={reason}
                      onClick={() => setActiveRejectReason(reason)}
                      className={`text-[11px] px-2 py-1 rounded-full font-medium border transition-colors ${
                        selected
                          ? (isDark ? 'bg-amber-900/50 text-amber-200 border-amber-700' : 'bg-amber-100 text-amber-800 border-amber-300')
                          : (isDark ? 'bg-amber-900/20 text-amber-300 border-amber-800/40 hover:bg-amber-900/30' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100')
                      }`}
                      title={reason}
                    >
                      {reason} · {count}
                    </button>
                  );
                })}
              </div>

              {qualityReport.rejected > 0 && (
                <div className={`mt-3 rounded-lg border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-3 py-2 text-[11px] font-semibold ${isDark ? 'bg-gray-900/40 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    Rejets filtrés ({filteredRejected.length}) — {activeRejectReason === 'all' ? 'toutes raisons' : activeRejectReason}
                  </div>
                  <div className={`max-h-52 overflow-auto text-[11px] ${isDark ? 'bg-gray-800/40' : 'bg-white'}`}>
                    {filteredRejected.length === 0 ? (
                      <div className={`px-3 py-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Aucun email rejeté pour ce filtre.
                      </div>
                    ) : (
                      filteredRejected.slice(0, 30).map(({ booking, reasons }) => (
                        <div key={booking.messageId} className={`px-3 py-2 border-t first:border-t-0 ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700'}`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{fmt(booking.receivedAt)}</span>
                            <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{booking.bookingType}</span>
                            <span className="font-medium">{booking.guestName || '—'}</span>
                            <span className={`ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{booking.confidence}%</span>
                          </div>
                          <div className={`mt-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`} title={booking.subject}>
                            {booking.subject}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {reasons.map((reason) => (
                              <span key={`${booking.messageId}-${reason}`} className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

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
              disabled={status === 'syncing' || status === 'checking' || status === 'importing'}
              title={status === 'syncing' ? 'Scan Gmail en cours…' : 'Scanner les emails Airbnb'}
              aria-busy={status === 'syncing'}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 font-semibold text-sm disabled:opacity-50 shadow-sm"
            >
              {status === 'syncing' ? <><RefreshCw className="w-4 h-4 animate-spin" /> Scan Gmail en cours…</> : <><Search className="w-4 h-4" /> Scanner les emails Airbnb</>}
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
  {importSummary.payoutsSaved > 0 && (
    <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-700'}`}>
      💸 {importSummary.payoutsSaved} versement{importSummary.payoutsSaved > 1 ? 's' : ''} classé{importSummary.payoutsSaved > 1 ? 's' : ''}
    </span>
  )}
  {importSummary.expensesCreated > 0 && (
    <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-rose-800 text-rose-200' : 'bg-rose-100 text-rose-700'}`}>
      📉 {importSummary.expensesCreated} dépense{importSummary.expensesCreated > 1 ? 's' : ''} classée{importSummary.expensesCreated > 1 ? 's' : ''}
    </span>
  )}
</div>
</div>
          )}          {/* ── Nouveaux logements en attente de configuration ── */}

          {importTrace.length > 0 && (
            <div className={`border rounded-xl ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
              <div className={`px-4 py-2 border-b text-xs font-semibold ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                🧾 Trace d&apos;import ({importTrace.length})
              </div>
              <div className="max-h-56 overflow-auto text-[11px]">
                {importTrace.slice().reverse().map((row, idx) => (
                  <div key={`${row.messageId}-${idx}`} className={`px-4 py-2 border-b last:border-b-0 ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded ${row.status === 'success'
                        ? (isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700')
                        : row.status === 'skipped'
                        ? (isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700')
                        : (isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700')
                      }`}>{row.status}</span>
                      <span className="font-medium">{row.action}</span>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{row.bookingType}</span>
                      <span>{row.guestName}</span>
                      <span className={`ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fmt(row.receivedAt)}</span>
                    </div>
                    {row.reason && (
                      <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        raison: {row.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  {(['all', 'new', 'cancelled', 'modified', 'payout', 'review'] as FilterType[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filter === f ? 'bg-violet-600 text-white'
                        : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? `Tous (${bookings.length})` : f === 'new' ? `Nouvelles (${newCount})` : f === 'cancelled' ? 'Annulées' : f === 'payout' ? 'Versements' : f === 'review' ? 'Avis' : 'Modifications'}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={selectAll} 
                  className={`flex items-center text-xs h-8 px-3 rounded-lg border font-medium transition-colors ${
                    isDark 
                      ? 'border-violet-500/30 text-violet-400 hover:bg-violet-500/20 bg-gray-800' 
                      : 'border-violet-200 text-violet-600 hover:bg-violet-50 bg-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {filtered.length > 0 && filtered.every(b => selected.has(b.messageId)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>

              {/* ── Récapitulatif global du parse ── */}
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
                        <div className={isDark ? 'text-gray-400' : 'text-gray-500'}>Logements lus rattachés</div>
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
                  const matchedProperty = booking.propertyName
                    ? findMatchingProperty(booking.propertyName, properties)
                    : undefined;
                  const bestCandidate = !matchedProperty && booking.propertyName
                    ? findBestPropertyCandidate(booking.propertyName, properties)
                    : { property: undefined, score: 0, ambiguous: false, secondScore: 0 };
                  const overridePropertyId = propertyOverrides[booking.messageId];
                  const overrideProperty = overridePropertyId
                    ? properties.find((p) => p.id === overridePropertyId)
                    : undefined;
                  const showUnmatchedPropertyWarning =
                    booking.bookingType !== 'cancelled' &&
                    booking.bookingType !== 'payout' &&
                    properties.length > 0 &&
                    !!booking.propertyName &&
                    !matchedProperty;
                  return (
                    <div key={booking.messageId} className={`rounded-xl border-2 transition-all ${isImp ? cardImported : isSel ? cardSelected : card}`}>
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {!isImp ? (
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
                                                            {booking.warnings && booking.warnings.length > 0 && (
                                <div className={`w-full mt-3 p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${isDark ? 'border-amber-700/30 bg-amber-900/10 text-amber-300' : 'border-amber-200/60 bg-amber-50 text-amber-700'}`}>
                                  {booking.warnings.map((w, idx) => (
                                    <div key={idx} className="flex flex-row items-start gap-1.5 leading-snug">
                                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-[1.5px] opacity-80" />
                                      <span className="font-medium mt-[1px]">{w}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
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
                            {showUnmatchedPropertyWarning && (
                              <div className={`mt-1 text-xs rounded-lg border px-2.5 py-2 flex flex-col gap-2 ${
                                isDark ? 'text-orange-300 border-orange-800/50 bg-orange-900/20' : 'text-orange-700 border-orange-200 bg-orange-50'
                              }`}>
                                <div className="flex items-start gap-1.5">
                                  <span>⚠️</span>
                                  <span>
                                    Logement détecté &quot;{booking.propertyName?.slice(0, 40)}&quot; non rattaché automatiquement.
                                    {bestCandidate.property && bestCandidate.score >= 28 && (
                                      <>
                                        {' '}Suggestion: <strong>{bestCandidate.property.name}</strong> ({bestCandidate.score}%
                                        {bestCandidate.ambiguous ? ', ambigu' : ''}).
                                      </>
                                    )}
                                    {!bestCandidate.property || bestCandidate.score < 28 ? ' Aucune correspondance exploitable trouvée.' : ''}
                                  </span>
                                </div>

                                {bestCandidate.property && bestCandidate.score >= 28 && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {overrideProperty ? (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                        isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                      }`}>
                                        ✅ Rattachement choisi: {overrideProperty.name}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setPropertyOverrides((prev) => ({ ...prev, [booking.messageId]: bestCandidate.property!.id }))}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                          isDark
                                            ? 'border-violet-600 text-violet-300 hover:bg-violet-900/40'
                                            : 'border-violet-300 text-violet-700 hover:bg-violet-100'
                                        }`}
                                      >
                                        Utiliser cette suggestion
                                      </button>
                                    )}

                                    {overrideProperty && (
                                      <button
                                        type="button"
                                        onClick={() => setPropertyOverrides((prev) => {
                                          const next = { ...prev };
                                          delete next[booking.messageId];
                                          return next;
                                        })}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                          isDark
                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700/70'
                                            : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        Annuler
                                      </button>
                                    )}
                                  </div>
                                )}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                              {/* ── Section: Identification ── */}
                              <div className="space-y-1">
                                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>Général</h4>
                                <ParseField label="Type" value={booking.bookingType} badge={bookingTypeLabel[booking.bookingType]} isDark={isDark} />
                                <ParseField label="Confiance" value={`${booking.confidence}%`} isDark={isDark} highlight={booking.confidence >= 80 ? 'green' : booking.confidence >= 60 ? 'amber' : 'red'} />
                                <ParseField label="Code réservation" value={booking.confirmationCode} isDark={isDark} mono />
                                <ParseField label="Emails fusionnés" value={booking.relatedMessageIds ? String(booking.relatedMessageIds.length) : undefined} isDark={isDark} />
                                <ParseField label="Message ID" value={booking.messageId.slice(0, 22) + '…'} isDark={isDark} mono />
                                <ParseField label="Pattern parser" value={booking.parserPatternVersion} isDark={isDark} mono />
                                <ParseField label="Source classif" value={booking.classificationSource} isDark={isDark} />
                                <ParseField label="Règle classif" value={booking.classificationRuleId} isDark={isDark} mono />
                              </div>
                              {/* ── Section: Voyageur ── */}
                              <div className="space-y-1">
                                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>Voyageur</h4>
                                <ParseField label="Voyageur" value={booking.guestName} isDark={isDark} />
                                <ParseField label="Voyageurs" value={booking.guests > 0 ? `${booking.guests} personne${booking.guests > 1 ? 's' : ''}` : undefined} isDark={isDark} />
                                <ParseField label="Email voyageur" value={booking.guestEmail} isDark={isDark} />
                                <ParseField label="Téléphone" value={booking.guestPhone} isDark={isDark} />
                                <ParseField label="Pays" value={booking.guestCountry} isDark={isDark} />
                                <ParseField label="Langue" value={booking.guestLanguage} isDark={isDark} />
                              </div>
                              {/* ── Section: Séjour ── */}
                              <div className="space-y-1">
                                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>Séjour</h4>
                                <ParseField label="Logement" value={booking.propertyName} isDark={isDark} highlight={booking.propertyName ? 'blue' : undefined} />
                                <ParseField label="Arrivée" value={booking.checkIn ? fmt(booking.checkIn) : undefined} isDark={isDark} />
                                <ParseField label="Départ" value={booking.checkOut ? fmt(booking.checkOut) : undefined} isDark={isDark} />
                                <ParseField label="Nuits" value={booking.nights > 0 ? `${booking.nights} nuit${booking.nights > 1 ? 's' : ''}` : undefined} isDark={isDark} />
                                <ParseField label="Heure arrivée" value={booking.checkInTime} isDark={isDark} />
                                <ParseField label="Heure départ" value={booking.checkOutTime} isDark={isDark} />
                              </div>
                              {/* ── Section: Finance ── */}
                              <div className="space-y-1">
                                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 border-b pb-1 ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>Finances</h4>
                                <ParseField label="Prix total" value={booking.totalPrice > 0 ? `${booking.totalPrice} ${booking.currency}` : undefined} isDark={isDark} highlight="green" />
                                <ParseField label="Prix / nuit" value={booking.nightlyRate ? `${booking.nightlyRate} ${booking.currency}` : undefined} isDark={isDark} />
                                <ParseField label="Frais ménage" value={booking.cleaningFee ? `${booking.cleaningFee} ${booking.currency}` : undefined} isDark={isDark} />
                                <ParseField label="Frais service" value={booking.serviceFee ? `${booking.serviceFee} ${booking.currency}` : undefined} isDark={isDark} />
                                <ParseField label="Taxes" value={booking.taxAmount ? `${booking.taxAmount} ${booking.currency}` : undefined} isDark={isDark} />
                                <ParseField label="Versement hôte" value={booking.hostPayout ? `${booking.hostPayout} ${booking.currency}` : undefined} isDark={isDark} highlight="green" />
                                <ParseField label="Devise" value={booking.currency} isDark={isDark} />
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              {booking.timelineEvents && booking.timelineEvents.length > 1 && (
                                <div className={`mb-3 p-2 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                                  <div className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Timeline consolidation ({booking.timelineEvents.length} emails)
                                  </div>
                                  <div className="space-y-1">
                                    {booking.timelineEvents.slice(0, 4).map((ev, idx) => (
                                      <div key={`${ev.messageId}-${idx}`} className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {fmt(ev.receivedAt)} · {ev.bookingType} · confiance {ev.confidence}%
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Avis */}
                              {booking.bookingType === 'review' && (
                                <div className="space-y-1">
                                  <ParseField label="Note" value={booking.reviewRating ? `${'★'.repeat(booking.reviewRating)}${'☆'.repeat(5 - booking.reviewRating)} (${booking.reviewRating}/5)` : undefined} isDark={isDark} highlight="amber" />
                                  {booking.reviewComment && (
                                    <div className="col-span-2">
                                      <ParseField label="Commentaire" value={booking.reviewComment.slice(0, 200)} isDark={isDark} />
                                    </div>
                                  )}
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
    </>
  );
}
