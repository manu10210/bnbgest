'use client';

/**
 * 📧 GmailImporter — Importation automatique des réservations Airbnb depuis Gmail
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useBNB, type Property } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Mail, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, Search, Calendar,
  Users, DollarSign, Home, Zap, Filter, Info, Sparkles, DownloadCloud, Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { GmailNotificationPayload } from '../lib/gmail-notification-types';
import {
  computeImportTraceStats,
  computeImportTraceTopErrorReasons,
  filterImportTrace,
  formatImportTraceActionLabel,
  formatImportTraceReasonLabel,
  formatImportTraceStatusLabel,
  type ImportTraceStatus,
} from '../lib/gmail-import-trace';
import { buildPersistFailureTraceEntry } from '../lib/gmail-import-failures';
import {
  buildBookingCreatedTraceEntry,
  buildBookingProgressTraceEntry,
  buildSuccessTraceEntry,
  registerLocalDbBookingLink,
} from '../lib/gmail-import-success';
import { buildSkippedTraceEntry } from '../lib/gmail-import-skips';
import {
  persistBookingToDb,
  persistBookingUpdateToDb,
  type PersistBookingUpdatePayload,
} from '../lib/gmail-import-persistence';
import {
  buildBookingImportNotes,
  buildReminderImportNotes,
} from '../lib/gmail-booking-notes';
import { syncAirbnbExpensesFromImport } from '../lib/gmail-expense-sync';
import {
  buildCheckoutCleaningTask,
  deriveCheckoutInventoryUpdatePlan,
  resolveCheckoutCompletion,
} from '../lib/gmail-checkout-resolution';
import { resolveCancellationPlan } from '../lib/gmail-cancelled-resolution';
import { resolveModifiedPlan } from '../lib/gmail-modified-resolution';
import { resolvePayoutPlan } from '../lib/gmail-payout-resolution';
import {
  buildPayoutAttachBookingPatch,
  buildPayoutAttachPersistPatch,
  buildPayoutCreateBookingPayload,
} from '../lib/gmail-payout-application';
import {
  buildReviewPlan,
  resolveReviewCompletionPlan,
} from '../lib/gmail-review-resolution';
import {
  buildNewBookingConfirmationEmailPayload,
  deriveGuestPostNewBookingUpdates,
  resolveNewBookingPlan,
} from '../lib/gmail-new-resolution';
import {
  buildCheckInReminderEmailPayload,
  buildReminderPersistPatch,
  buildReminderPrepTask,
  deriveReminderEnrichmentUpdates,
} from '../lib/gmail-reminder-resolution';
import {
  resolveReviewFallbackProperty,
  shouldSkipImportForMissingProperty,
} from '../lib/gmail-import-gating';
import { deriveWizardPropertySuggestions } from '../lib/gmail-property-wizard';
import { resolveNewBookingDuplicate } from '../lib/gmail-duplicate-resolution';
import { resolveGuestForImport } from '../lib/gmail-guest-resolution';
import { resolvePropertyAssignment } from '../lib/gmail-property-resolution';
import NewPropertyWizard, {
  analyzeAirbnbTitle,
  findNewPropertyNames,
  type DetectedPropertyInfo,
  type WizardPropertyPayload,
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

type RuntimeProgressPhase = 'connect' | 'detect' | 'normalize' | 'prepare' | 'finalize';

interface RuntimeProgressState {
  phase: RuntimeProgressPhase;
  processed: number;
  total: number;
  currentLabel?: string;
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

interface GmailPropertyDecisionsPayload {
  aliases: Record<string, string>;
  rejectedLabels: string[];
  updatedAt?: string;
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
  january: 0,
  feb: 1,
  fev: 1, fév: 1, fevr: 1, févr: 1, fevrier: 1, février: 1, fevirer: 1,
  february: 1,
  mar: 2, mars: 2,
  march: 2,
  apr: 3,
  avr: 3, avril: 3,
  april: 3,
  mai: 4,
  may: 4,
  jun: 5, juin: 5,
  june: 5,
  jul: 6, juil: 6, juillet: 6,
  july: 6,
  aug: 7,
  aou: 7, août: 7, aout: 7,
  august: 7,
  sep: 8, sept: 8, septembre: 8,
  september: 8,
  oct: 9, octobre: 9,
  october: 9,
  nov: 10, novembre: 10,
  november: 10,
  dec: 11, déc: 11, decembre: 11, décembre: 11,
  december: 11,
};

const OPTIONAL_WEEKDAY_TEXT = '(?:[a-zà-ÿ]{2,16}\\.?\\s*)?';
const MONTH_TOKEN = '[a-zà-ÿ\\.\\-]+[,]?';

function normalizeMonthToken(raw?: string): string {
  return (raw || '')
    .replace(/\./g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .trim();
}

function inferMonthIndexFromPrefix(token: string): number | undefined {
  if (!token) return undefined;
  if (/^jan/.test(token)) return 0;
  if (/^(fev|feb|fevr|fevir|fevrie)/.test(token)) return 1;
  if (/^mar/.test(token)) return 2;
  if (/^(avr|apr)/.test(token)) return 3;
  if (/^mai|^may/.test(token)) return 4;
  if (/^(juin|jun)/.test(token)) return 5;
  if (/^(juil|jul)/.test(token)) return 6;
  if (/^(aou|aout|aou?t|aug)/.test(token)) return 7;
  if (/^(sep|sept)/.test(token)) return 8;
  if (/^oct/.test(token)) return 9;
  if (/^nov/.test(token)) return 10;
  if (/^(dec|decem|decemb|decembre)/.test(token)) return 11;
  return undefined;
}

function isIsoDate(value?: string): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function toUtcTimestampFromIso(value?: string): number | undefined {
  if (!isIsoDate(value)) return undefined;
  const [year, month, day] = (value as string).split('-').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  const ts = Date.UTC(year, month - 1, day);
  return Number.isNaN(ts) ? undefined : ts;
}

function isValidDateRange(checkIn?: string, checkOut?: string): boolean {
  const inTs = toUtcTimestampFromIso(checkIn);
  const outTs = toUtcTimestampFromIso(checkOut);
  if (inTs === undefined || outTs === undefined) return false;
  if (!Number.isFinite(inTs) || !Number.isFinite(outTs)) return false;
  const diffDays = Math.round((outTs - inTs) / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= 365;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function deriveNightsFromIsoRange(checkIn?: string, checkOut?: string): number | undefined {
  const inUtc = toUtcTimestampFromIso(checkIn);
  const outUtc = toUtcTimestampFromIso(checkOut);
  if (inUtc === undefined || outUtc === undefined) return undefined;
  if (!Number.isFinite(inUtc) || !Number.isFinite(outUtc)) return undefined;
  const diffDays = Math.round((outUtc - inUtc) / (1000 * 60 * 60 * 24));

  if (!Number.isFinite(diffDays) || diffDays < 1 || diffDays > 365) return undefined;
  return diffDays;
}

function ensureBookingNightsConsistency(booking: ParsedBooking): ParsedBooking {
  const derivedNights = deriveNightsFromIsoRange(booking.checkIn, booking.checkOut);
  if (!derivedNights) return booking;
  if (booking.nights === derivedNights) return booking;
  return {
    ...booking,
    nights: derivedNights,
    warnings: Array.from(new Set([
      ...(booking.warnings || []),
      'nights_recomputed_from_dates',
    ])),
  };
}

function repairSingleDateRangeForBooking(booking: ParsedBooking): ParsedBooking {
  // Cas réel remonté: sujets "... arrive le 18 sept." avec une seule date exploitable.
  // Pour éviter un rejet qualité injustifié, on pose un checkout par défaut basé
  // sur le nombre de nuits extrait (sinon J+1).
  if (booking.bookingType !== 'new') return booking;
  if (!isIsoDate(booking.checkIn)) return booking;
  if (isValidDateRange(booking.checkIn, booking.checkOut)) return booking;

  const checkInDate = new Date(`${booking.checkIn}T00:00:00.000Z`);
  if (Number.isNaN(checkInDate.getTime())) return booking;

  const fallbackNights = Number.isFinite(booking.nights) && booking.nights > 0
    ? Math.min(booking.nights, 30)
    : 1;

  const checkoutDate = new Date(checkInDate);
  checkoutDate.setUTCDate(checkoutDate.getUTCDate() + fallbackNights);
  const inferredCheckOut = formatIsoDate(checkoutDate);

  return {
    ...booking,
    checkOut: inferredCheckOut,
    nights: fallbackNights,
    warnings: Array.from(new Set([
      ...(booking.warnings || []),
      fallbackNights > 1
        ? 'checkout_defaulted_from_extracted_nights'
        : 'checkout_defaulted_to_plus_one_day',
    ])),
  };
}

function parseIsoDateFromFrenchParts(dayInput?: string, monthInput?: string, yearInput?: string, fallbackYear?: number): string | undefined {
  const day = Number.parseInt(dayInput || '', 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return undefined;

  if (!monthInput) return undefined;
  const monthToken = normalizeMonthToken(monthInput);
  const monthIndex = FRENCH_MONTH_MAP[monthToken] ?? inferMonthIndexFromPrefix(monthToken);
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
  const frRange = normalized.match(new RegExp(
    `\\bdu\\s+(\\d{1,2})\\s+(${MONTH_TOKEN})(?:\\s+(\\d{4}))?\\s+au\\s+(\\d{1,2})\\s+(${MONTH_TOKEN})?(?:\\s+(\\d{4}))?`,
    'i',
  ));
  if (frRange) {
    const checkIn = parseIsoDateFromFrenchParts(frRange[1], frRange[2], frRange[3], fallbackYear);
    const outMonth = frRange[5] || frRange[2];
    let checkOut = parseIsoDateFromFrenchParts(frRange[4], outMonth, frRange[6], fallbackYear);

    if (checkIn && checkOut && !frRange[6]) {
      const inTs = toUtcTimestampFromIso(checkIn);
      const outTs = toUtcTimestampFromIso(checkOut);
      if (inTs !== undefined && outTs !== undefined && Number.isFinite(inTs) && Number.isFinite(outTs) && outTs <= inTs) {
      // Passage d'année implicite (ex: fin déc → début janv)
      const nextYear = (new Date(checkIn).getUTCFullYear() + 1).toString();
      checkOut = parseIsoDateFromFrenchParts(frRange[4], outMonth, nextYear, fallbackYear);
      }
    }

    if (isValidDateRange(checkIn, checkOut)) {
      const nights = deriveNightsFromIsoRange(checkIn as string, checkOut as string) || 1;
      return { checkIn: checkIn as string, checkOut: checkOut as string, nights };
    }
  }

  // Ex: "du 12/03/2026 au 15/03/2026" (année optionnelle)
  const numericRange = normalized.match(/\bdu\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+au\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (numericRange) {
    const parseYear = (raw?: string) => {
      if (!raw) return fallbackYear;
      const n = Number.parseInt(raw, 10);
      if (!Number.isNaN(n)) return n < 100 ? 2000 + n : n;
      return fallbackYear;
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
        const nights = deriveNightsFromIsoRange(checkIn, checkOut) || 1;
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

  const fallbackYear = receivedAt ? new Date(receivedAt).getFullYear() : new Date().getFullYear();
  const frenchPattern = normalized.match(new RegExp(
    `\\b(?:arrivee|arrive|arrivée|check[\\s-]?in)\\b\\s*(?:[:\\-–—]\\s*)?(?:le\\s+)?(?:${OPTIONAL_WEEKDAY_TEXT}(?:[,\\-–—]\\s*)?)?(\\d{1,2})(?:er)?\\s+(${MONTH_TOKEN})(?:\\s+(\\d{4}))?`,
    'i',
  ));
  if (frenchPattern) {
    const parsed = parseIsoDateFromFrenchParts(frenchPattern[1], frenchPattern[2], frenchPattern[3], fallbackYear);
    if (parsed) return parsed;
  }

  const numericPattern = normalized.match(new RegExp(
    `\\b(?:arrivee|arrive|arrivée|check[\\s-]?in)\\b\\s*(?:[:\\-–—]\\s*)?(?:le\\s+)?(?:${OPTIONAL_WEEKDAY_TEXT}(?:[,\\-–—]\\s*)?)?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?`,
    'i',
  ));
  if (!numericPattern) return undefined;

  const parseYear = (raw?: string) => {
    if (!raw) return fallbackYear;
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n)) return n < 100 ? 2000 + n : n;
    return fallbackYear;
  };

  const day = Number.parseInt(numericPattern[1], 10);
  const month = Number.parseInt(numericPattern[2], 10) - 1;
  const year = parseYear(numericPattern[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month || date.getUTCFullYear() !== year) return undefined;

  return formatIsoDate(date);
}

function parseDepartureDateFromSubject(subject?: string, receivedAt?: string): string | undefined {
  if (!subject) return undefined;
  const normalized = stripInvisibleUnicode(subject)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();

  const fallbackYear = receivedAt ? new Date(receivedAt).getFullYear() : new Date().getFullYear();
  const frenchPattern = normalized.match(new RegExp(
    `\\b(?:depart|départ|check[\\s-]?out)\\b\\s*(?:[:\\-–—]\\s*)?(?:le\\s+)?(?:${OPTIONAL_WEEKDAY_TEXT}(?:[,\\-–—]\\s*)?)?(\\d{1,2})(?:er)?\\s+(${MONTH_TOKEN})(?:\\s+(\\d{4}))?`,
    'i',
  ));
  if (frenchPattern) {
    const parsed = parseIsoDateFromFrenchParts(frenchPattern[1], frenchPattern[2], frenchPattern[3], fallbackYear);
    if (parsed) return parsed;
  }

  const numericPattern = normalized.match(new RegExp(
    `\\b(?:depart|départ|check[\\s-]?out)\\b\\s*(?:[:\\-–—]\\s*)?(?:le\\s+)?(?:${OPTIONAL_WEEKDAY_TEXT}(?:[,\\-–—]\\s*)?)?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?`,
    'i',
  ));
  if (!numericPattern) return undefined;

  const parseYear = (raw?: string) => {
    if (!raw) return fallbackYear;
    const n = Number.parseInt(raw, 10);
    if (!Number.isNaN(n)) return n < 100 ? 2000 + n : n;
    return fallbackYear;
  };

  const day = Number.parseInt(numericPattern[1], 10);
  const month = Number.parseInt(numericPattern[2], 10) - 1;
  const year = parseYear(numericPattern[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return undefined;
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month || date.getUTCFullYear() !== year) return undefined;

  return formatIsoDate(date);
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
  const inferredCheckOutFromSubject = isIsoDate(booking.checkOut)
    ? booking.checkOut
    : parseDepartureDateFromSubject(booking.subject, booking.receivedAt);

  if (inferredCheckIn && inferredCheckOutFromSubject) {
    if (isValidDateRange(inferredCheckIn, inferredCheckOutFromSubject)) {
      const inferredNights = deriveNightsFromIsoRange(inferredCheckIn, inferredCheckOutFromSubject) || booking.nights || 1;
      return {
        ...booking,
        checkIn: inferredCheckIn,
        checkOut: inferredCheckOutFromSubject,
        nights: inferredNights,
        warnings: Array.from(new Set([
          ...(booking.warnings || []),
          'date_range_inferred_from_arrival_departure_subject',
        ])),
      };
    }
  }

  if (!inferredCheckIn) return booking;

  const nights = Number.isFinite(booking.nights) && booking.nights > 0 ? booking.nights : undefined;
  if (!nights) return booking;
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

function enrichPayoutFromContext(
    booking: ParsedBooking,
    existingBookings: Array<{
      propertyId: number;
      specialRequests?: string;
      paymentInfo?: { transactionId?: string };
      guestInfo?: { name?: string };
    }>,
    properties: Array<{ id: number; name: string }>,
    dbBookingsByCode?: Map<string, { guestName?: string; propertyId?: number }>,
    batchBookings: ParsedBooking[] = [],
  ): ParsedBooking {
    if (booking.bookingType !== 'payout') return booking;

    // S'il y a déjà un nom de voyageur fiable (pas Voyageur Airbnb), on le garde avec le préfixe
    const hasGuest = !!booking.guestName && !isPlaceholderGuestName(booking.guestName);

    const candidateByCode = booking.confirmationCode
      ? existingBookings.find(b => bookingHasConfirmationCodeInContext(b, booking.confirmationCode))
      : undefined;

    // Lookup DB (pré-fetché depuis l'API)
    const dbMatch = booking.confirmationCode
      ? dbBookingsByCode?.get(booking.confirmationCode.toUpperCase())
      : undefined;

    // Lookup In-Batch (dans le même scan d'email)
    const batchMatch = booking.confirmationCode
      ? batchBookings.find(b => b.confirmationCode?.toUpperCase() === booking.confirmationCode?.toUpperCase() && !!b.guestName && !isPlaceholderGuestName(b.guestName))
      : undefined;

    let guestNameBase = 'Voyageur inconnu';
  if (hasGuest) {
    guestNameBase = booking.guestName!;
  } else if (batchMatch?.guestName) {
    // Priorité 1 : Le batch actuel (l'email "Nouvelle réservation" qu'on est en train d'importer en même temps)
    guestNameBase = batchMatch.guestName;
  } else if (dbMatch?.guestName) {
    // Priorité 2 : La DB (données réelles PostgreSQL)
    guestNameBase = dbMatch.guestName;
  } else if (candidateByCode?.guestInfo?.name) {
    guestNameBase = candidateByCode.guestInfo.name;
  }

  // S'il n'y a pas de nom trouvé, on ne veut peut-être pas prefixer "Règlement du séjour inconnu"
  // mais la consigne est forte: "titre comme Reglement du sejour $nom et $prenom"
  const newGuestName = `Règlement du séjour ${guestNameBase}`;

  return {
    ...booking,
    guestName: newGuestName,
    propertyName: booking.propertyName
      || (batchMatch?.propertyName ? properties.find(p => p.name === batchMatch.propertyName)?.name : undefined)
      || (dbMatch?.propertyId ? properties.find(p => p.id === dbMatch.propertyId)?.name : undefined)
      || (candidateByCode ? properties.find(p => p.id === candidateByCode.propertyId)?.name : undefined),
    warnings: Array.from(new Set([...(booking.warnings || []), 'payout_context_inferred'])),
  };
}

function enrichReviewFromContext(
    booking: ParsedBooking,
    existingBookings: Array<{
      propertyId: number;
      checkIn: string;
      checkOut: string;
      specialRequests?: string;
      paymentInfo?: { transactionId?: string };
      guestInfo?: { name?: string };
      status?: string;
    }>,
    properties: Array<{ id: number; name: string }>,
  ): ParsedBooking {
    if (booking.bookingType !== 'review') return booking;

    const hasGuest = !!booking.guestName && !isPlaceholderGuestName(booking.guestName);
    const hasProperty = !!normalizePropertyLabelForWizard(booking.propertyName || '');
    const hasDates = isValidDateRange(booking.checkIn, booking.checkOut);
    if (hasGuest && hasProperty && hasDates) return booking;

    const receivedTs = new Date(booking.receivedAt).getTime();
    if (Number.isNaN(receivedTs)) return booking;

    const candidateByCode = booking.confirmationCode
      ? existingBookings.find(b => bookingHasConfirmationCodeInContext(b, booking.confirmationCode))
      : undefined;  const candidates = candidateByCode
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
      ? (deriveNightsFromIsoRange(match.checkIn, match.checkOut) || booking.nights)
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
    paymentInfo?: { transactionId?: string };
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

  const hasProperty = !!normalizePropertyLabelForWizard(booking.propertyName || '');
  if (hasProperty) return booking;

  const contextProperty = inferPropertyFromContext(booking, properties, existingBookings);
  if (contextProperty) {
    return {
      ...booking,
      propertyName: contextProperty.name,
      warnings: Array.from(new Set([
        ...cleanPropertyWarnings(booking.warnings || []),
        `property_inferred_from_context:${contextProperty.name}`,
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
    paymentInfo?: { transactionId?: string };
    guestInfo?: { name?: string };
    status?: string;
  }>,
): T | undefined {
  if (!booking) return undefined;

  if (booking.confirmationCode) {
    const byCode = existingBookings.find(b => bookingHasConfirmationCodeInContext(b, booking.confirmationCode));
    if (byCode) return properties.find(p => p.id === byCode.propertyId);
  }

  const guest = booking.guestName?.trim().toLowerCase();
  if (guest) {
    const targetCheckInTs = isIsoDate(booking.checkIn) ? new Date(booking.checkIn as string).getTime() : Number.NaN;
    const targetCheckOutTs = isIsoDate(booking.checkOut) ? new Date(booking.checkOut as string).getTime() : Number.NaN;

    const byGuest = existingBookings
      .filter(b => (b.guestInfo?.name || '').trim().toLowerCase() === guest)
      .filter(b => b.status !== 'cancelled')
      .map((b) => {
        const property = properties.find(p => p.id === b.propertyId);
        if (!property) return null;

        let score = 0;

        if (!Number.isNaN(targetCheckInTs) && isIsoDate(b.checkIn)) {
          const diffDays = Math.abs(new Date(b.checkIn).getTime() - targetCheckInTs) / (1000 * 60 * 60 * 24);
          if (diffDays <= 2) score += 48;
          else if (diffDays <= 7) score += 32;
          else if (diffDays <= 21) score += 16;
        }

        if (!Number.isNaN(targetCheckOutTs) && isIsoDate(b.checkOut)) {
          const diffDays = Math.abs(new Date(b.checkOut).getTime() - targetCheckOutTs) / (1000 * 60 * 60 * 24);
          if (diffDays <= 2) score += 24;
          else if (diffDays <= 7) score += 14;
        }

        if (booking.propertyName?.trim()) {
          const nameScore = propertyMatchScore(booking.propertyName, property.name, [property.city || '', property.address || '']);
          score += Math.round(nameScore * 0.7);
        }

        if (booking.subject?.trim()) {
          const subjectScore = propertyMatchScore(booking.subject, property.name, [property.city || '', property.address || '']);
          score += Math.round(subjectScore * 0.35);
        }

        return { property, score };
      })
      .filter((entry): entry is { property: T; score: number } => !!entry)
      .sort((a, z) => z.score - a.score);

    const best = byGuest[0];
    const second = byGuest[1];
    if (best) {
      const secondScore = second?.score ?? 0;
      const hasClearLead = best.score - secondScore >= 10;
      if (best.score >= 55 || (best.score >= 40 && hasClearLead)) {
        return best.property;
      }
    }
  }

  // Cas fréquent en mono-logement : fallback sûr.
  if (properties.length === 1) return properties[0];
  return undefined;
}

function isPlaceholderGuestName(name?: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return n === '' || n === 'voyageur airbnb' || n === 'airbnb guest' || n === 'guest' || n === 'inconnu';
}

function isClearlyInvalidGuestName(name?: string): boolean {
  if (!name) return true;
  const normalized = normalizeForMatch(name);
  return normalized === 'les lieux ou pour'
    || normalized === 'les lieux'
    || normalized === 'lieux ou pour'
    || normalized === 'logement inconnu';
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
    .replace(/^[\s\-–—:;,.!?()\[\]{}"'“”'']+/g, '')
    .replace(/[\s\-–—:;,.!?()\[\]{}"'“”'']+$/g, '')
    .replace(/[|•·]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Au moins prénom + nom, et pas une phrase système
  if (!cleaned || cleaned.length < 3) return undefined;
  if (/^(r[ée]servation|booking|airbnb|arrive|check)/i.test(cleaned)) return undefined;
  if (!/^[A-Za-zÀ-ÿ''\-\s]+$/.test(cleaned)) return undefined;

  return cleaned;
}

function normalizeGuestEmail(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function normalizeGuestPhone(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/[\s().-]/g, '').replace(/^00/, '+').trim();
  return normalized ? normalized : undefined;
}

function normalizeGuestName(value?: string): string | undefined {
  const cleaned = cleanGuestName(value);
  return cleaned?.toLowerCase().replace(/\s+/g, ' ').trim();
}

function computeGuestIdentity(input: { name?: string; email?: string; phone?: string }): string | undefined {
  const email = normalizeGuestEmail(input.email);
  if (email) return `email:${email}`;

  const phone = normalizeGuestPhone(input.phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeGuestName(input.name);
  if (name) return `name:${name}`;

  return undefined;
}

function normalizeConfirmationCode(value?: string): string | undefined {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) return undefined;
  if (!/^HM[A-Z0-9]{6,12}$/i.test(normalized)) return undefined;
  return normalized;
}

function bookingHasConfirmationCodeInContext(
  booking: {
    specialRequests?: string;
    paymentInfo?: { transactionId?: string };
  },
  rawCode?: string,
): boolean {
  const code = normalizeConfirmationCode(rawCode);
  if (!code) return false;

  const txCode = normalizeConfirmationCode(booking.paymentInfo?.transactionId);
  if (txCode && txCode === code) return true;

  const notes = booking.specialRequests || '';
  if (!notes) return false;
  return new RegExp(`\\b${escapeRegExp(code)}\\b`, 'i').test(notes);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferGuestNameFromSubject(subject?: string): string | undefined {
  if (!subject) return undefined;
  const normalizedSubject = stripInvisibleUnicode(subject)
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const patterns = [
    // "Nouvelle réservation confirmée! Fakri arrive le 17 avr." <- format Airbnb hôte FR
    /nouvelle?\s+r[ée]servation\s+confirm[ée]e[^a-z]{0,3}([A-Za-z\u00C0-\u024F''\-]+(?:\s+[A-Za-z\u00C0-\u024F''\-]+){0,3})\s+arrive/i,
    // "Réservation confirmée : Fakri arrive"
    /r[ée]servation\s+confirm[ée]e?\s*[:\-]\s*(.+?)\s+arrive(?:\s+le|\s+demain|\b)/i,
    // "Réservation confirmée pour Fakri arrive"
    /r[ée]servation\s+confirm[ée]e?\s+pour\s+(.+?)\s+arrive(?:\s+le|\s+demain|\b)/i,
    // "Booking confirmed: Fakri arrives"
    /booking\s+confirmed\s*:\s*([^:|\-]+?)\s+arrives?\b/i,
    // ": Fakri arrive"
    /:\s*([A-Za-z\u00C0-\u024F''\-]+(?:\s+[A-Za-z\u00C0-\u024F''\-]+){1,4})\s+arrive(?:\s+le|\s+demain|\b)/i,
    // "Fakri a réservé" / "Fakri a annulé" / "Fakri arrive" / "Fakri part" (nom en début)
    /^\s*(?:\[[^\]]+\]\s*)?([A-Za-z\u00C0-\u024F''\-]+(?:\s+[A-Za-z\u00C0-\u024F''\-]+){0,3})\s+(?:arrive|a\s+r[ée]serv[ée]|a\s+annul[ée]|a\s+modifi[ée]|souhaite|part)\b/i,
    // "Le séjour de Fakri se termine"
    /s[ée]jour\s+de\s+([A-Za-z\u00C0-\u024F''\-]+(?:\s+[A-Za-z\u00C0-\u024F''\-]+){0,3})\s+(?:se\s+termine|est\s+termin)/i,
  ];

  for (const pattern of patterns) {
    const match = normalizedSubject.match(pattern);
    const maybeName = cleanGuestName(match?.[1]);
    if (maybeName) return maybeName;
  }
  return undefined;
}
function enrichBookingGuestName(booking: ParsedBooking): ParsedBooking {
  const shouldInferGuestName = isPlaceholderGuestName(booking.guestName) || isClearlyInvalidGuestName(booking.guestName);
  if (!shouldInferGuestName) return booking;

  const inferred = inferGuestNameFromSubject(booking.subject);
  if (!inferred) return booking;

  const warningCode = isClearlyInvalidGuestName(booking.guestName)
    ? 'guest_name_replaced_from_subject'
    : 'guest_name_inferred_from_subject';

  return {
    ...booking,
    guestName: inferred,
    warnings: Array.from(new Set([...(booking.warnings || []), warningCode])),
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
  if (b.bookingType !== 'review' && b.confirmationCode && !/^HM[A-Z0-9]{6,12}$/i.test(b.confirmationCode)) reasons.push('invalid_confirmation_code');

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
  'appartementbleurelax':                          'APPARTEMENT BLEU RELAX',
  'appartbleurelax':                               'APPARTEMENT BLEU RELAX',
  'bleurelax':                                     'APPARTEMENT BLEU RELAX',
  'appartement bleu relaax':                       'APPARTEMENT BLEU RELAX',
  'appartement bleu rlx':                          'APPARTEMENT BLEU RELAX',
  // ── APPARTEMENT LES CIGOGNES ──────────────────────────────────────────────
  'appartement les cigognes':                      'APPARTEMENT LES CIGOGNES',
  'appart les cigognes':                           'APPARTEMENT LES CIGOGNES',
  'les cigognes':                                  'APPARTEMENT LES CIGOGNES',
  'cigognes':                                      'APPARTEMENT LES CIGOGNES',
  'appartementlescigognes':                        'APPARTEMENT LES CIGOGNES',
  'appartlescigognes':                             'APPARTEMENT LES CIGOGNES',
  'lescigognes':                                   'APPARTEMENT LES CIGOGNES',
  'cigogne':                                       'APPARTEMENT LES CIGOGNES',
  'appartement les cigogne':                       'APPARTEMENT LES CIGOGNES',
  // ── Maisonnette T2 quartier calme ─────────────────────────────────────────
  'maison de ville avec petite terrasse couverte': 'Maisonnette T2 quartier calme',
  'maison de ville':                               'Maisonnette T2 quartier calme',
  'maison de ville avec terrasse':                 'Maisonnette T2 quartier calme',
  'petite terrasse couverte':                      'Maisonnette T2 quartier calme',
  'maisonette t2 quartier calme':                  'Maisonnette T2 quartier calme',
  'maisonnette t2 quartier calme':                 'Maisonnette T2 quartier calme',
  'maisonette t2':                                 'Maisonnette T2 quartier calme',
  'maisonnette t2':                                'Maisonnette T2 quartier calme',
  'maisonette quartier calme':                     'Maisonnette T2 quartier calme',
  'maisonnette quartier calme':                    'Maisonnette T2 quartier calme',
  'maisonettet2quartiercalme':                     'Maisonnette T2 quartier calme',
  'maisonnettet2quartiercalme':                    'Maisonnette T2 quartier calme',
  // ── Maison T3/Climatisée/ terrasse privée ─────────────────────────────────
  'maison t3 climatisee terrasse privee':          'Maison T3/Climatisée/ terrasse privée',
  'maison t3':                                     'Maison T3/Climatisée/ terrasse privée',
  'la maison t3':                                  'Maison T3/Climatisée/ terrasse privée',
  'maison climatisee terrasse privee':             'Maison T3/Climatisée/ terrasse privée',
  'maison avec terrasse privee':                   'Maison T3/Climatisée/ terrasse privée',
  't3 climatise terrasse privee':                  'Maison T3/Climatisée/ terrasse privée',
  'maison t3 climatisée terrasse privée':          'Maison T3/Climatisée/ terrasse privée',
  'maison t3 terrasse privee':                     'Maison T3/Climatisée/ terrasse privée',
  'maison t3 climatisee terrasse':                 'Maison T3/Climatisée/ terrasse privée',
  'maison t3 climatisée terrasse':                 'Maison T3/Climatisée/ terrasse privée',
  'maison t3 terrasse':                            'Maison T3/Climatisée/ terrasse privée',
  'maisont3climatiseeterrasseprivee':              'Maison T3/Climatisée/ terrasse privée',
  'maisont3terrasseprivee':                        'Maison T3/Climatisée/ terrasse privée',
  't3 terrasse privee':                            'Maison T3/Climatisée/ terrasse privée',
};

const PROPERTY_ALIAS_STORAGE_KEY = 'bnbgest.gmail.property-aliases.v1';
const PROPERTY_REJECTED_STORAGE_KEY = 'bnbgest.gmail.property-rejected-labels.v1';
const EXPERT_MODE_STORAGE_KEY = 'bnbgest.gmail.expert-mode.v1';
const PROPERTY_DECISIONS_API = '/api/gmail/property-decisions';
const DEFAULT_REJECTED_PROPERTY_LABELS = [
  'CÉLINE Saint-Julien-les-Villas Maison',
  'BTISSAM Saint-Julien-les-Villas Maisonnette T2 quartier calme DATES INITIALES',
];
const CANONICAL_T3_PROPERTY_NAME = 'Maison T3/Climatisée/ terrasse privée';
let RUNTIME_PROPERTY_ALIASES: Record<string, string> = {};

function setRuntimePropertyAliases(nextAliases: Record<string, string>) {
  RUNTIME_PROPERTY_ALIASES = { ...nextAliases };
}

function getMergedPropertyAliases(): Record<string, string> {
  return {
    ...PROPERTY_ALIASES,
    ...RUNTIME_PROPERTY_ALIASES,
  };
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // désaccentuer
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isT3PropertyLabel(value?: string): boolean {
  if (!value?.trim()) return false;
  const normalized = normalizeForMatch(value);
  if (!normalized) return false;

  if (
    normalized === 't3'
    || normalized.includes('maison t3')
    || normalized.includes('t3 terrasse privee')
    || normalized.includes('t3 climatisee')
    || normalized.includes('climatisee terrasse privee')
  ) {
    return true;
  }

  return /(^|\s)t3(\s|$)/.test(normalized)
    && (normalized.includes('maison') || normalized.includes('terrasse') || normalized.includes('climat'));
}

function normalizeRejectedPropertyLabels(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => normalizeForMatch(entry))
        .filter(Boolean)
    )
  );
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
  /\bdates?\s+initiales?\b/g,
  /\bdates?\s+finales?\b/g,
];

function sanitizePropertyLabel(input: string): string {
  let value = normalizeForMatch(input);
  for (const pattern of PROPERTY_NOISE_PATTERNS) {
    value = value.replace(pattern, ' ');
  }
  return value.replace(/\s{2,}/g, ' ').trim();
}

function normalizePropertyLabelForWizard(raw: string): string {
  if (!raw?.trim()) return '';

  const value = sanitizePropertyLabel(raw)
    // Cas observé: "BTISSAM Saint-Julien-les-Villas ... DATES INITIALES"
    .replace(/\bsaint[-\s]?julien[-\s]?les[-\s]?villas\b/gi, ' ')
    // Prénom/Nom en préfixe (souvent voyageur) avant le vrai libellé logement
    .replace(/^[a-zà-ÿ'’-]{2,20}\s+/, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Garde-fou: si trop court ou purement bruité, ignorer
  if (!value || value.length < 4) return '';
  if (/^(dates?|initiales?|finales?)$/i.test(value)) return '';

  const significantTokens = value
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 3 && !PROPERTY_STOP_WORDS.has(token));

  // Ex: "les lieux ou pour" -> vide de sens
  if (significantTokens.length === 0) return '';
  if (significantTokens.length === 1 && /^(?:lieu|lieux|logement|maison|appartement|home|place)$/.test(significantTokens[0])) {
    return '';
  }

  return value;
}

function isLikelyGuestActivitySubject(subject?: string): boolean {
  const safeSubject = subject || '';
  return /^(?:\[[^\]]+\]\s*)?[A-ZÀÂÄÉÈÊËÎÏÔÙÛܟŒÆ][a-zàâäéèêëîïôùûüÿœæ]+(?:\s+[A-Za-zÀ-ÿ\-]+){0,3}\s+(a\s+r[eé]serv|annul|modifi|laiss|part\s|arrive|r[eé]dig|souhait|veut|aimer)/i.test(safeSubject)
    || /\barrive\s+(le|demain|aujourd|dans\s+\d|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(safeSubject)
    || /^rappel\s*[:\-–]/i.test(safeSubject)
    || /\bpart\s+(aujourd|demain|ce|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(safeSubject)
    || /\bcheck[\s-]?(in|out)\b/i.test(safeSubject);
}

function normalizeSubjectLabelForWizard(subject?: string): string {
  if (!subject?.trim()) return '';
  if (isLikelyGuestActivitySubject(subject)) return '';

  const cleanedSubject = subject
    .replace(/airbnb/gi, '')
    .replace(/r[eé]servation\s+(confirm[eé]e?|accept[eé]e?)/gi, '')
    .replace(/booking\s+confirmed?/gi, '')
    .replace(/rappel|reminder/gi, '')
    .replace(/[–\-:|]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 80);

  return normalizePropertyLabelForWizard(cleanedSubject);
}

function getWizardPropertyCandidate(booking: ParsedBooking): string {
  const fromProperty = normalizePropertyLabelForWizard(booking.propertyName || '');
  if (fromProperty) return fromProperty;
  return normalizeSubjectLabelForWizard(booking.subject);
}

function resolvePropertyAliasTarget(rawLabel: string): string | undefined {
  const aliases = getMergedPropertyAliases();
  const normalized = normalizeForMatch(rawLabel);
  const sanitized = sanitizePropertyLabel(rawLabel);
  const compactNormalized = normalized.replace(/\s+/g, '');
  const compactSanitized = sanitized.replace(/\s+/g, '');
  const candidates = Array.from(new Set([
    rawLabel.toLowerCase().trim(),
    normalized,
    sanitized,
    compactNormalized,
    compactSanitized,
  ].filter(Boolean)));

  for (const candidate of candidates) {
    const target = aliases[candidate];
    if (target) return target;
  }

  if (!sanitized || sanitized.length < 5) return undefined;
  const ranked = Object.entries(aliases)
    .map(([alias, target]) => ({
      target,
      score: tokenOverlapScore(sanitized, sanitizePropertyLabel(alias) || alias),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1];
  if (!best) return undefined;
  if (best.score >= 90) return best.target;
  if (best.score >= 80 && best.score - (second?.score ?? 0) >= 12) return best.target;

  return undefined;
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
  const aliasTarget = resolvePropertyAliasTarget(emailName);
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

  const aliasTarget = resolvePropertyAliasTarget(emailPropertyName);
  if (aliasTarget) {
    const aliasMatchedProperty = properties.find((p) => normalizeForMatch(p.name) === normalizeForMatch(aliasTarget));
    if (aliasMatchedProperty) return aliasMatchedProperty;
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

  const aliasTarget = resolvePropertyAliasTarget(emailPropertyName);
  if (aliasTarget) {
    const aliasMatchedProperty = properties.find((p) => normalizeForMatch(p.name) === normalizeForMatch(aliasTarget));
    if (aliasMatchedProperty) {
      return { property: aliasMatchedProperty, score: 98, ambiguous: false, secondScore: 0 };
    }
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
  const hasHeuristicDateWarning = (booking: ParsedBooking): boolean =>
    (booking.warnings || []).some((w) => /date_range_inferred|checkout_defaulted|nights_recomputed_from_dates/i.test(w));

  const rootHasReliableDates = isValidDateRange(root.checkIn, root.checkOut) && !hasHeuristicDateWarning(root);
  const incomingHasReliableDates = isValidDateRange(incoming.checkIn, incoming.checkOut) && !hasHeuristicDateWarning(incoming);

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
  const incomingHasValidDates = isValidDateRange(incoming.checkIn, incoming.checkOut);
  const rootHasValidDates = isValidDateRange(root.checkIn, root.checkOut);

  const shouldReplaceDatesFromIncoming = (() => {
    if (!incomingHasValidDates) return false;
    if (incoming.bookingType === 'modified') return true;
    if (!rootHasValidDates) return true;
    if (incomingHasReliableDates && !rootHasReliableDates) return true;
    // Si les deux sont valides, privilégier l'email le plus récent pour refléter l'état courant.
    return new Date(incoming.receivedAt).getTime() > new Date(root.receivedAt).getTime();
  })();

  if (shouldReplaceDatesFromIncoming) {
    root.checkIn = incoming.checkIn;
    root.checkOut = incoming.checkOut;
    root.nights = deriveNightsFromIsoRange(incoming.checkIn, incoming.checkOut) || incoming.nights;
  } else if (!rootHasValidDates && incomingHasValidDates) {
    // Filet de sécurité: root incomplet/invalide, incoming valide.
    root.checkIn = incoming.checkIn;
    root.checkOut = incoming.checkOut;
    root.nights = deriveNightsFromIsoRange(incoming.checkIn, incoming.checkOut) || incoming.nights;
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
  const [importSummary, setImportSummary] = useState<{ created: number; cancelled: number; guestsCreated: number; guestsUpdated: number; skipped: number; skippedDuplicate: number; skippedNoProperty: number; tasksCreated: number; reviewsImported: number ; payoutsSaved: number; expensesCreated: number; rescuedAggressive: number; rescuedSingleProperty: number } | null>(null);
  const [isExportingRejected, setIsExportingRejected] = useState(false);
  const [isPreparingRejectBrief, setIsPreparingRejectBrief] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{ bookings: number; guests: number } | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [rejectedBookings, setRejectedBookings] = useState<RejectedBooking[]>([]);
  const [activeRejectReason, setActiveRejectReason] = useState<string>('all');
  const [importTrace, setImportTrace] = useState<ImportTraceEntry[]>([]);
  const [runtimeProgress, setRuntimeProgress] = useState<RuntimeProgressState | null>(null);
  const [traceStatusFilter, setTraceStatusFilter] = useState<'all' | ImportTraceStatus>('all');
  const [traceSearch, setTraceSearch] = useState('');
  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, number>>({});
  const [learnedPropertyAliases, setLearnedPropertyAliases] = useState<Record<string, string>>({});
  const [rejectedPropertyLabels, setRejectedPropertyLabels] = useState<string[]>([]);
  const [manualPropertySelection, setManualPropertySelection] = useState<Record<string, number>>({});
  const [showAliasManager, setShowAliasManager] = useState(false);
  const [expertModeAggressive, setExpertModeAggressive] = useState(true);
  const scanInFlightRef = useRef(false);
  const progressStartedAtRef = useRef<number | null>(null);
  const propertyDecisionsHydratedRef = useRef(false);
  const aliasImportInputRef = useRef<HTMLInputElement | null>(null);

  const rejectedPropertySet = useMemo(
    () => new Set(rejectedPropertyLabels.map((label) => normalizeForMatch(label)).filter(Boolean)),
    [rejectedPropertyLabels]
  );

  useEffect(() => {
    if (status === 'syncing' || status === 'importing') return;
    progressStartedAtRef.current = null;
    setRuntimeProgress(null);
  }, [status]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPERT_MODE_STORAGE_KEY);
      if (!raw) return;
      setExpertModeAggressive(raw === '1');
    } catch {
      // Ignore localStorage issues
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(EXPERT_MODE_STORAGE_KEY, expertModeAggressive ? '1' : '0');
    } catch {
      // Ignore localStorage issues
    }
  }, [expertModeAggressive]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROPERTY_ALIAS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return;
      const source = parsed && typeof parsed === 'object' && 'aliases' in parsed
        ? (parsed as { aliases?: unknown }).aliases
        : parsed;
      if (!source || typeof source !== 'object') return;

      const safeAliases = Object.entries(source as Record<string, unknown>).reduce<Record<string, string>>((acc, [k, v]) => {
        if (typeof k !== 'string' || typeof v !== 'string') return acc;
        const key = normalizeForMatch(k);
        const value = v.trim();
        if (!key || !value) return acc;
        acc[key] = value;
        return acc;
      }, {});
      setLearnedPropertyAliases(safeAliases);
    } catch {
      // Ignore silently invalid local storage payload
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PROPERTY_REJECTED_STORAGE_KEY);
      const defaults = normalizeRejectedPropertyLabels(DEFAULT_REJECTED_PROPERTY_LABELS);
      if (!raw) {
        if (defaults.length > 0) {
          setRejectedPropertyLabels(defaults);
        }
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      const normalized = normalizeRejectedPropertyLabels(parsed);
      setRejectedPropertyLabels(Array.from(new Set([...defaults, ...normalized])));
    } catch {
      // Ignore silently invalid local storage payload
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        const res = await fetch(PROPERTY_DECISIONS_API, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) return;

        const payload = (await res.json()) as { decisions?: Partial<GmailPropertyDecisionsPayload> };
        const decisions = payload.decisions;
        if (!decisions || isCancelled) return;

        const dbAliases = Object.entries(decisions.aliases || {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (typeof k !== 'string' || typeof v !== 'string') return acc;
          const key = normalizeForMatch(k);
          const value = v.trim();
          if (!key || !value) return acc;
          acc[key] = value;
          return acc;
        }, {});

        const dbRejected = normalizeRejectedPropertyLabels(decisions.rejectedLabels || []);

        setLearnedPropertyAliases((prev) => ({
          ...prev,
          ...dbAliases,
        }));
        setRejectedPropertyLabels((prev) =>
          Array.from(new Set([...prev, ...dbRejected]))
        );
      } catch {
        // Ne bloque pas l'import Gmail si la persistance distante échoue.
      } finally {
        if (!isCancelled) {
          propertyDecisionsHydratedRef.current = true;
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    setRuntimePropertyAliases(learnedPropertyAliases);
    return () => setRuntimePropertyAliases({});
  }, [learnedPropertyAliases]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROPERTY_ALIAS_STORAGE_KEY, JSON.stringify(learnedPropertyAliases));
    } catch {
      // Storage full/private mode: non bloquant
    }
  }, [learnedPropertyAliases]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROPERTY_REJECTED_STORAGE_KEY, JSON.stringify(rejectedPropertyLabels));
    } catch {
      // Storage full/private mode: non bloquant
    }
  }, [rejectedPropertyLabels]);

  useEffect(() => {
    if (!propertyDecisionsHydratedRef.current) return;

    const timer = window.setTimeout(() => {
      fetch(PROPERTY_DECISIONS_API, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aliases: learnedPropertyAliases,
          rejectedLabels: rejectedPropertyLabels,
        } satisfies GmailPropertyDecisionsPayload),
      }).catch(() => {
        // non bloquant
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [learnedPropertyAliases, rejectedPropertyLabels]);

  // ── Détection nouveaux logements ──────────────────────────────────────────
  const [propertyQueue, setPropertyQueue] = useState<DetectedPropertyInfo[]>([]);
  const [currentWizard, setCurrentWizard] = useState<DetectedPropertyInfo | null>(null);
  const [hasAutoRelaunchedWizardAfterFirstCreate, setHasAutoRelaunchedWizardAfterFirstCreate] = useState(false);
  const [dbPropertyCatalog, setDbPropertyCatalog] = useState<Property[]>([]);

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
    progressStartedAtRef.current = Date.now();
    setStatus('syncing');
    setRuntimeProgress({
      phase: 'connect',
      processed: 0,
      total: 1,
      currentLabel: 'Connexion à Gmail…',
    });
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

      for (const [queryIndex, q] of queries.entries()) {
        setRuntimeProgress({
          phase: 'detect',
          processed: queryIndex,
          total: queries.length,
          currentLabel: `Détection Gmail ${queryIndex + 1}/${queries.length}`,
        });
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
              const normalized = repairSingleDateRangeForBooking(ensureBookingNightsConsistency(enrichBookingPropertyFromContext(
                enrichBookingDateRange(enrichBookingGuestName(b as ParsedBooking)),
                existingBookings,
                properties,
              )));
              allBookings.push(normalized);
            }
          }
          if (data.stats) setStats(s => s
            ? { found: s.found + data.stats.found, parsed: s.parsed + data.stats.parsed, errors: s.errors + data.stats.errors }
            : data.stats
          );
        }

        setRuntimeProgress({
          phase: 'normalize',
          processed: queryIndex + 1,
          total: queries.length,
          currentLabel: `${seen.size} email(s) détecté(s)`,
        });
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

  // Pré-fetch des noms depuis la DB pour les payouts avec confirmationCode
  // (BNBContext = localStorage vide en production → on interroge l'API réelle)
  const payoutCodes = finalBookings
    .filter(b => b.bookingType === 'payout' && b.confirmationCode && /^HM[A-Z0-9]{6,12}$/i.test(b.confirmationCode))
    .map(b => b.confirmationCode!.toUpperCase());

  const dbBookingsByCode = new Map<string, { guestName?: string; propertyId?: number }>();
  await Promise.allSettled(
    [...new Set(payoutCodes)].map(async (code) => {
      try {
        const res = await fetch(`/api/bookings?confirmationCode=${encodeURIComponent(code)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const found = data.bookings?.[0];
          if (found?.guestName) {
            dbBookingsByCode.set(code, { guestName: found.guestName, propertyId: found.propertyId });
          }
        }
      } catch {
        // silencieux — on utilisera le fallback
      }
    })
  );

  const enrichedFinalBookings = finalBookings.map((b) =>
    repairSingleDateRangeForBooking(ensureBookingNightsConsistency(enrichPayoutFromContext(enrichReviewFromContext(b, existingBookings, properties), existingBookings, properties, dbBookingsByCode, finalBookings)))
  );

  setRuntimeProgress({
    phase: 'finalize',
    processed: queries.length,
    total: queries.length,
    currentLabel: `${enrichedFinalBookings.length} réservation(s) consolidée(s)`,
  });

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
      toast.error("Échec de l'export des rejets CSV.");
    } finally {
      setIsExportingRejected(false);
    }
  }, [rejectedBookings]);

  // ─── Notification email (fire-and-forget, côté serveur) ─────────────────
  const notifyEmail = useCallback((payload: GmailNotificationPayload) => {
    if (!payload.guestEmail || payload.guestEmail.includes('@example') || payload.guestEmail === '') return;
    fetch('/api/gmail-import/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => { /* silencieux — non bloquant */ });
  }, []);

  const normalizeCountryCode = useCallback((value?: string): string => {
    const v = (value || '').trim().toUpperCase();
    if (v === 'FR' || v === 'FRANCE') return 'FR';
    if (v === 'BE' || v === 'BELGIUM' || v === 'BELGIQUE') return 'BE';
    if (v === 'ES' || v === 'SPAIN' || v === 'ESPAGNE') return 'ES';
    if (v === 'PT' || v === 'PORTUGAL') return 'PT';
    if (v === 'IT' || v === 'ITALY' || v === 'ITALIE') return 'IT';
    if (v === 'DE' || v === 'GERMANY' || v === 'ALLEMAGNE') return 'DE';
    return /^[A-Z]{2}$/.test(v) ? v : 'FR';
  }, []);

  const toContextPropertyFromApi = useCallback((raw: {
    id: number;
    name: string;
    address: string;
    city: string;
    country: string;
    type?: string | null;
    bedrooms: number;
    bathrooms: number;
    capacity: number;
    maxGuests?: number | null;
    amenities?: string[] | null;
    price: number;
    pricePerNight?: number | null;
    description?: string | null;
    images?: string[] | null;
    status?: string;
    cleaningFee?: number | null;
    createdAt?: string;
    updatedAt?: string;
  }): Property => {
    const type = ['apartment', 'house', 'studio', 'villa', 'room'].includes(String(raw.type || '').toLowerCase())
      ? String(raw.type).toLowerCase()
      : 'apartment';
    const rawStatus = String(raw.status || 'ACTIVE').toUpperCase();
    const status: Property['status'] = rawStatus === 'MAINTENANCE'
      ? 'maintenance'
      : rawStatus === 'INACTIVE'
        ? 'inactive'
        : 'active';

    return {
      id: raw.id,
      name: raw.name,
      address: raw.address,
      city: raw.city,
      country: normalizeCountryCode(raw.country),
      type: type as Property['type'],
      bedrooms: raw.bedrooms,
      bathrooms: raw.bathrooms,
      maxGuests: raw.maxGuests ?? raw.capacity,
      amenities: Array.isArray(raw.amenities) ? raw.amenities : [],
      price: raw.pricePerNight ?? raw.price,
      description: raw.description || '',
      images: Array.isArray(raw.images) ? raw.images : [],
      status,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      ownerId: 1,
      checkInTime: '15:00',
      checkOutTime: '11:00',
      cleaningFee: raw.cleaningFee ?? 0,
      securityDeposit: 0,
      minimumStay: 1,
      availabilityCalendar: [],
      rules: [],
    };
  }, [normalizeCountryCode]);

  const fetchDbProperties = useCallback(async (): Promise<Property[]> => {
    const res = await fetch('/api/properties?limit=300', { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Impossible de charger les propriétés DB (${res.status})`);
    }
    const json = await res.json();
    return (json.properties || []).map(toContextPropertyFromApi);
  }, [toContextPropertyFromApi]);

  const availableProperties = useMemo(() => {
    const byId = new Map<number, Property>();

    for (const property of properties) {
      if (typeof property.id === 'number') {
        byId.set(property.id, property);
      }
    }

    for (const property of dbPropertyCatalog) {
      if (typeof property.id === 'number') {
        byId.set(property.id, property);
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  }, [properties, dbPropertyCatalog]);

  useEffect(() => {
    let isCancelled = false;

    fetchDbProperties()
      .then((rows) => {
        if (!isCancelled) setDbPropertyCatalog(rows);
      })
      .catch(() => {
        if (!isCancelled) setDbPropertyCatalog([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [fetchDbProperties]);

  const createPropertyInDb = useCallback(async (payload: {
    name: string;
    description?: string;
    address: string;
    city: string;
    country?: string;
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    price: number;
  }): Promise<Property | undefined> => {
    const sessionUserId = String((session as { user?: { id?: string | number } })?.user?.id || '').trim();
    if (!sessionUserId) {
      toast.error('Session invalide : reconnecte-toi pour persister les propriétés en DB.');
      return undefined;
    }

    const res = await fetch('/api/properties', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        description: payload.description || '',
        address: payload.address,
        city: payload.city,
        country: normalizeCountryCode(payload.country),
        bedrooms: payload.bedrooms,
        bathrooms: payload.bathrooms,
        capacity: payload.maxGuests,
        price: payload.price,
        currency: 'EUR',
        userId: sessionUserId,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[createPropertyInDb] erreur:', err);
      if (res.status === 403) {
        const currentRole = typeof err?.currentRole === 'string' ? err.currentRole : 'inconnu';
        toast.error(`Échec création propriété DB (403) : rôle actuel ${currentRole} non autorisé.`);
      } else {
        const apiMessage = typeof err?.error === 'string' ? err.error : undefined;
        toast.error(`Échec création propriété DB (${res.status})${apiMessage ? ` : ${apiMessage}` : ''}.`);
      }
      return undefined;
    }

    const data = await res.json();
    if (!data?.property?.id) return undefined;
    return toContextPropertyFromApi(data.property);
  }, [session, normalizeCountryCode, toContextPropertyFromApi]);

  const ensureDefaultProperty = useCallback(async (): Promise<Property | undefined> => {
    const existingDbProperties = await fetchDbProperties().catch(() => [] as Property[]);
    if (existingDbProperties.length > 0) return existingDbProperties[0];

    const created = await createPropertyInDb({
      name: 'Mon logement principal',
      description: 'Logement créé automatiquement depuis GmailImporter.',
      address: 'Adresse à compléter',
      city: 'Ville à compléter',
      country: 'FR',
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      price: 90,
    });

    if (created) {
      toast.success('Aucun logement DB détecté : propriété par défaut créée en base.');
    }

    return created;
  }, [createPropertyInDb, fetchDbProperties]);

  const ensureCanonicalT3Property = useCallback(async (
    parsedBookings: ParsedBooking[],
    runtimeProps: Property[],
  ): Promise<Property[]> => {
    const hasT3Mentions = parsedBookings.some((booking) => (
      isT3PropertyLabel(booking.propertyName)
      || isT3PropertyLabel(booking.subject)
    ));
    if (!hasT3Mentions) return runtimeProps;

    const existingT3 = runtimeProps.find((property) => (
      normalizeForMatch(property.name) === normalizeForMatch(CANONICAL_T3_PROPERTY_NAME)
      || isT3PropertyLabel(property.name)
    ));

    if (existingT3) return runtimeProps;

    const t3Property = await createPropertyInDb({
      name: CANONICAL_T3_PROPERTY_NAME,
      description: 'Logement T3 intégré automatiquement depuis les emails Gmail Airbnb.',
      address: 'Adresse T3 à compléter',
      city: runtimeProps[0]?.city || 'Ville à compléter',
      country: runtimeProps[0]?.country || 'FR',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 6,
      price: runtimeProps[0]?.price || 120,
    });

    if (!t3Property) {
      return runtimeProps;
    }

    setLearnedPropertyAliases((prev) => ({
      ...prev,
      'maison t3': CANONICAL_T3_PROPERTY_NAME,
      't3': CANONICAL_T3_PROPERTY_NAME,
      'maison t3 climatisee terrasse privee': CANONICAL_T3_PROPERTY_NAME,
      't3 terrasse privee': CANONICAL_T3_PROPERTY_NAME,
    }));

    toast.success('Propriété T3 détectée et intégrée automatiquement dans vos logements.');

    return [...runtimeProps, t3Property];
  }, [createPropertyInDb]);

  // ─── Importer les réservations sélectionnées ──────────────────────────────

  const importSelected = useCallback(async () => {
  progressStartedAtRef.current = Date.now();
  setStatus('importing');
    const toImport = bookings.filter(b => selected.has(b.messageId));
  setRuntimeProgress({
    phase: 'detect',
    processed: 0,
    total: Math.max(toImport.length, 1),
    currentLabel: toImport.length > 0 ? 'Préparation des éléments à importer…' : 'Aucun email sélectionné',
  });
  let runtimeProperties = await fetchDbProperties().catch(() => [] as Property[]);
  let defaultProperty = runtimeProperties[0];

    if (!defaultProperty) {
      const createdDefaultProperty = await ensureDefaultProperty();
      if (createdDefaultProperty) {
        runtimeProperties = [createdDefaultProperty];
        defaultProperty = createdDefaultProperty;
      }
    }

    if (!defaultProperty) {
      toast.error('Import arrêté: aucune propriété persistée en DB disponible.');
      setRuntimeProgress(null);
      setStatus('error');
      return;
    }

    runtimeProperties = await ensureCanonicalT3Property(toImport, runtimeProperties);
    if (!defaultProperty && runtimeProperties.length > 0) {
      defaultProperty = runtimeProperties[0];
    }

  const summary = { created: 0, cancelled: 0, guestsCreated: 0, guestsUpdated: 0, skipped: 0, skippedDuplicate: 0, skippedNoProperty: 0, dbFailed: 0, datesResynced: 0, tasksCreated: 0, reviewsImported: 0, payoutsSaved: 0, expensesCreated: 0, rescuedAggressive: 0, rescuedSingleProperty: 0 };
    let dbAuthFailed = 0;
    const localGuests = [...guests];
    const localBookings = [...existingBookings];
    const localToDbBookingId = new Map<number, number>();
    const trace: ImportTraceEntry[] = [];

    const bookingHasConfirmationCode = (booking: typeof localBookings[number], rawCode?: string): boolean => {
      const code = normalizeConfirmationCode(rawCode);
      if (!code) return false;

      const txCode = normalizeConfirmationCode(booking.paymentInfo?.transactionId);
      if (txCode && txCode === code) return true;

      const notes = booking.specialRequests || '';
      if (!notes) return false;
      return new RegExp(`\\b${escapeRegExp(code)}\\b`, 'i').test(notes);
    };

    const bookingMatchesGuestIdentity = (booking: typeof localBookings[number], identity?: string): boolean => {
      if (!identity) return false;
      const candidateIdentity = computeGuestIdentity({
        name: booking.guestInfo?.name,
        email: booking.guestInfo?.email,
        phone: booking.guestInfo?.phone,
      });
      return !!candidateIdentity && candidateIdentity === identity;
    };

    const findBookingMatch = (
      incoming: ParsedBooking,
      options?: {
        propertyId?: number;
        requireCheckIn?: boolean;
        requireCheckOut?: boolean;
        maxCheckInDiffDays?: number;
      },
    ) => {
      const normalizedCode = normalizeConfirmationCode(incoming.confirmationCode);
      const identity = computeGuestIdentity({
        name: incoming.guestName,
        email: incoming.guestEmail,
        phone: incoming.guestPhone,
      });

      return localBookings.find((candidate) => {
        if (options?.propertyId && candidate.propertyId !== options.propertyId) return false;

        if (normalizedCode && bookingHasConfirmationCode(candidate, normalizedCode)) {
          return true;
        }

        if (!bookingMatchesGuestIdentity(candidate, identity)) return false;

        if (options?.requireCheckOut && isIsoDate(incoming.checkOut) && isIsoDate(candidate.checkOut)) {
          if (incoming.checkOut !== candidate.checkOut) return false;
        }

        if (options?.requireCheckIn && isIsoDate(incoming.checkIn) && isIsoDate(candidate.checkIn)) {
          const maxDiff = options.maxCheckInDiffDays ?? 0;
          const diffDays = Math.abs(
            (new Date(candidate.checkIn).getTime() - new Date(incoming.checkIn).getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays > maxDiff) return false;
        }

        return true;
      });
    };

    const pushTrace = (entry: Omit<ImportTraceEntry, 'receivedAt'> & { receivedAt?: string }) => {
      trace.push({
        ...entry,
        receivedAt: entry.receivedAt || new Date().toISOString(),
      });
    };

    const trackDbFailure = (reason?: string) => {
      summary.dbFailed++;
      if (typeof reason === 'string' && /^http_(401|403)/.test(reason)) {
        dbAuthFailed++;
      }
    };

    const handlePersistFailure = (params: {
      booking: ParsedBooking;
      dbError?: string;
      fallbackReason: string;
    }) => {
      summary.skipped++;
      trackDbFailure(params.dbError);
      pushTrace(buildPersistFailureTraceEntry({
        messageId: params.booking.messageId,
        bookingType: params.booking.bookingType,
        guestName: params.booking.guestName,
        receivedAt: params.booking.receivedAt,
        dbError: params.dbError,
        fallbackReason: params.fallbackReason,
      }));
    };

    const handlePersistCreateSuccess = (params: {
      booking: ParsedBooking;
      bookingPayload: Parameters<typeof addBooking>[0];
      dbBookingId: number;
      action: 'booking_created' | 'booking_created_from_modified' | 'booking_created_from_reminder' | 'payout_created_as_financial_booking';
    }) => {
      addBooking(params.bookingPayload);
      registerLocalDbBookingLink({
        bookingPayload: params.bookingPayload,
        dbBookingId: params.dbBookingId,
        pushLocalBooking,
        localToDbBookingId,
      });
      summary.created++;
      pushTrace(buildBookingCreatedTraceEntry({
        messageId: params.booking.messageId,
        bookingType: params.booking.bookingType,
        guestName: params.booking.guestName,
        action: params.action,
        receivedAt: params.booking.receivedAt,
      }));
    };

    const handleBookingProgress = (params: {
      booking: ParsedBooking;
      action: Parameters<typeof buildBookingProgressTraceEntry>[0]['action'];
      incrementCreated?: boolean;
    }) => {
      if (params.incrementCreated) {
        summary.created++;
      }
      pushTrace(buildBookingProgressTraceEntry({
        messageId: params.booking.messageId,
        bookingType: params.booking.bookingType,
        guestName: params.booking.guestName,
        action: params.action,
        receivedAt: params.booking.receivedAt,
      }));
    };

    const handleSuccess = (params: {
      booking: ParsedBooking;
      action: Parameters<typeof buildSuccessTraceEntry>[0]['action'];
      reason?: Parameters<typeof buildSuccessTraceEntry>[0]['reason'];
    }) => {
      pushTrace(buildSuccessTraceEntry({
        messageId: params.booking.messageId,
        bookingType: params.booking.bookingType,
        guestName: params.booking.guestName,
        action: params.action,
        reason: params.reason,
        receivedAt: params.booking.receivedAt,
      }));
    };

    const handleSkipped = (params: {
      booking: ParsedBooking;
      action: Parameters<typeof buildSkippedTraceEntry>[0]['action'];
      reason: Parameters<typeof buildSkippedTraceEntry>[0]['reason'];
    }) => {
      pushTrace(buildSkippedTraceEntry({
        messageId: params.booking.messageId,
        bookingType: params.booking.bookingType,
        guestName: params.booking.guestName,
        action: params.action,
        reason: params.reason,
        receivedAt: params.booking.receivedAt,
      }));
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

    // ── Persistance en base PostgreSQL (module dédié) ──────────────────────
    const persistToDb = async (
      payload: Parameters<typeof addBooking>[0],
      bookingType: 'new' | 'cancelled' | 'modified',
    ): Promise<{ id?: number; error?: string }> => {
      return persistBookingToDb(payload, bookingType);
    };

    const persistUpdateToDb = async (
      bookingId: number,
      updates: PersistBookingUpdatePayload,
    ) => {
      const dbBookingId = localToDbBookingId.get(bookingId) ?? bookingId;
      await persistBookingUpdateToDb(dbBookingId, updates);
    };

    const applyPersistedBookingUpdate = async (params: {
      bookingId: number;
      bookingPatch?: Parameters<typeof updateBooking>[1];
      localPatch: Record<string, unknown>;
      persistPatch: PersistBookingUpdatePayload;
    }) => {
      const { bookingId, bookingPatch, localPatch, persistPatch } = params;
      if (bookingPatch) {
        updateBooking(bookingId, bookingPatch);
      }
      touchLocalBooking(bookingId, localPatch);
      await persistUpdateToDb(bookingId, persistPatch);
    };

    for (const [importIndex, b] of toImport.entries()) {
      const ratio = toImport.length > 0 ? (importIndex + 1) / toImport.length : 0;
      const phase: RuntimeProgressPhase = ratio < 0.35
        ? 'detect'
        : ratio < 0.75
          ? 'normalize'
          : 'prepare';

      setRuntimeProgress({
        phase,
        processed: importIndex + 1,
        total: Math.max(toImport.length, 1),
        currentLabel: `${b.guestName || 'Voyageur'} · ${b.bookingType}`,
      });

      await new Promise(r => setTimeout(r, 200)); // Animation de transfert visible

      // ── 1. Trouver le logement ────────────────────────────────────────────
      //   Matching robuste sur nom détecté. Fallback par défaut seulement
      //   si aucun nom de logement n'a été extrait.
      //   Pour payout/review : logique spécifique ensuite.
      const useFallback = b.bookingType !== 'payout' && b.bookingType !== 'review';
      const overridePropertyId = propertyOverrides[b.messageId];
      const resolvedProperty = resolvePropertyAssignment({
        booking: b,
        runtimeProperties,
        localBookings,
        defaultProperty,
        overridePropertyId,
        expertModeAggressive,
        useFallback,
        normalizeForMatch,
        resolvePropertyAliasTarget,
        findMatchingProperty,
        inferPropertyFromContext,
        findBestPropertyCandidate,
      });

      let property = resolvedProperty.property;
      summary.rescuedAggressive += resolvedProperty.rescuedAggressive;
      summary.rescuedSingleProperty += resolvedProperty.rescuedSingleProperty;
      for (const event of resolvedProperty.events) {
        handleSuccess({
          booking: b,
          action: event.action,
          reason: event.reason,
        });
      }

      // ── 1b. Pour les avis (review) : retrouver le logement par recoupement ──
      // L'email d'avis Airbnb ne contient pas le nom du logement.
      // Stratégie : chercher la réservation la plus récente du voyageur dans les 30j
      // avant la réception de l'email, puis utiliser son propertyId.
      property = resolveReviewFallbackProperty({
        booking: {
          bookingType: b.bookingType,
          receivedAt: b.receivedAt,
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          confirmationCode: b.confirmationCode,
        },
        property,
        localBookings,
        runtimeProperties,
        defaultProperty,
        computeGuestIdentity,
        bookingMatchesGuestIdentity,
        bookingHasConfirmationCode,
      });

      if (shouldSkipImportForMissingProperty(b.bookingType, property)) {
        summary.skipped++;
        summary.skippedNoProperty++;
        handleSkipped({
          booking: b,
          action: 'skip_no_property',
          reason: 'no_matching_property',
        });
        continue;
      }

      // ── 2. Trouver ou créer le voyageur (Guest) ──────────────────────────
      const guestResolution = resolveGuestForImport({
        booking: {
          guestName: b.guestName,
          guestEmail: b.guestEmail,
          guestPhone: b.guestPhone,
          totalPrice: b.totalPrice,
          bookingType: b.bookingType,
          checkIn: b.checkIn,
        },
        localGuests,
        computeGuestIdentity,
        addGuest,
        updateGuest,
      });
      const guestId = guestResolution.guestId;
      summary.guestsCreated += guestResolution.guestsCreatedDelta;
      summary.guestsUpdated += guestResolution.guestsUpdatedDelta;

      // ── 3. Vérifier doublon ───────────────────────────────────────────────
      // a) Par code de confirmation (fiable)
      // b) Sans code: par dates + voyageur + logement
      // IMPORTANT: déduplication stricte uniquement pour les "new".
      if (b.bookingType === 'new') {
        const duplicateResolution = resolveNewBookingDuplicate({
          booking: {
            confirmationCode: b.confirmationCode,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice,
            receivedAt: b.receivedAt,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            guestPhone: b.guestPhone,
          },
          propertyId: property?.id,
          localBookings,
          normalizeConfirmationCode,
          bookingHasConfirmationCode,
          bookingMatchesGuestIdentity,
          computeGuestIdentity,
          isIsoDate,
          formatDateLabel: fmt,
        });

        if (duplicateResolution.kind === 'resync') {
          const { duplicateBooking, patchedSpecialRequests, mergedGuests, mergedTotalPrice } = duplicateResolution;

          await applyPersistedBookingUpdate({
            bookingId: duplicateBooking.id,
            bookingPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: mergedGuests,
              totalPrice: mergedTotalPrice,
              specialRequests: patchedSpecialRequests,
            },
            localPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: mergedGuests,
              totalPrice: mergedTotalPrice,
              specialRequests: patchedSpecialRequests,
            },
            persistPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: mergedGuests,
              totalPrice: mergedTotalPrice,
              status: 'CONFIRMED',
              specialRequests: patchedSpecialRequests.slice(0, 4900),
            },
          });

          summary.created++;
          summary.datesResynced++;
          handleSuccess({
            booking: b,
            action: 'booking_dates_resynced',
            reason: 'duplicate_confirmation_code_with_wrong_dates',
          });
          continue;
        }

        if (duplicateResolution.kind === 'skip') {
          summary.skipped++;
          summary.skippedDuplicate++;
          handleSkipped({
            booking: b,
            action: 'skip_duplicate',
            reason: duplicateResolution.reason,
          });
          continue;
        }
      }

      const notes = buildBookingImportNotes({
        confirmationCode: b.confirmationCode,
        receivedAt: b.receivedAt,
        propertyName: b.propertyName,
        guestPhone: b.guestPhone,
        airbnbListingId: b.airbnbListingId,
        guestLanguage: b.guestLanguage,
        guestCountry: b.guestCountry,
        guestAdults: b.guestAdults,
        guestChildren: b.guestChildren,
        guestInfants: b.guestInfants,
        guestPets: b.guestPets,
      }, fmt);

      // ── 4a. Nouvelle réservation ──────────────────────────────────────────
      if (b.bookingType === 'new' && property) {
        const newBookingPlan = resolveNewBookingPlan({
          booking: {
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice,
            confirmationCode: b.confirmationCode,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            guestPhone: b.guestPhone,
          },
          propertyId: property.id,
          guestId,
          notes,
        });

        const bookingPayload: Parameters<typeof addBooking>[0] = newBookingPlan.bookingPayload;
        const dbPersistResult = await persistToDb(bookingPayload, 'new');
        if (!dbPersistResult.id) {
          handlePersistFailure({
            booking: b,
            dbError: dbPersistResult.error,
            fallbackReason: 'db_create_failed',
          });
          continue;
        }

        handlePersistCreateSuccess({
          booking: b,
          bookingPayload,
          dbBookingId: dbPersistResult.id,
          action: 'booking_created',
        });

        // Incrémenter le compteur de réservations du voyageur
        if (guestId) {
          const g = localGuests.find(gg => gg.id === guestId);
          if (g) {
            const guestUpdates = deriveGuestPostNewBookingUpdates({
              existingGuest: g,
              bookingTotalPrice: b.totalPrice,
              bookingCheckIn: b.checkIn,
            });
            updateGuest(guestId, guestUpdates);
            Object.assign(g, guestUpdates);
          }
        }

        // Email de confirmation au voyageur (fire-and-forget)
        const bookingConfirmationEmailPayload = buildNewBookingConfirmationEmailPayload({
          booking: {
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice,
            confirmationCode: b.confirmationCode,
            guestPhone: b.guestPhone,
          },
          propertyName: property.name,
        });
        if (bookingConfirmationEmailPayload) {
          notifyEmail(bookingConfirmationEmailPayload);
        }
      }

      // ── 4b. Annulation → retrouver et annuler la réservation existante ────
      if (b.bookingType === 'cancelled') {
        // Chercher par code de confirmation d'abord
        let match = findBookingMatch(b, {
          propertyId: property?.id,
          requireCheckIn: true,
          requireCheckOut: true,
        });

        // Sinon par dates + voyageur
        if (!match && property) {
          match = findBookingMatch(b, {
            propertyId: property.id,
            requireCheckIn: true,
            requireCheckOut: true,
          });
        }

        const cancellationPlan = resolveCancellationPlan({ match, notes });

        if (cancellationPlan.kind === 'cancel') {
          const { bookingId, cancelReason, preservedSpecialRequests } = cancellationPlan;
          cancelBooking(bookingId, cancelReason);
          await applyPersistedBookingUpdate({
            bookingId,
            localPatch: { status: 'cancelled' },
            persistPatch: {
              status: 'CANCELLED',
              specialRequests: preservedSpecialRequests.slice(0, 4900),
              cancellationReason: cancelReason.slice(0, 1900),
            },
          });
          summary.cancelled++;
          handleSuccess({
            booking: b,
            action: 'booking_cancelled',
          });
        } else {
          handleSkipped({
            booking: b,
            action: 'cancel_not_found',
            reason: 'no_matching_booking',
          });
        }
      }

      // ── 4c. Modification → mettre à jour la réservation existante ─────────
      if (b.bookingType === 'modified' && property) {
        const match = findBookingMatch(b, {
          propertyId: property.id,
          requireCheckIn: true,
          maxCheckInDiffDays: 7,
        });

        const modifiedPlan = resolveModifiedPlan({
          booking: {
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            guests: b.guests,
            totalPrice: b.totalPrice,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            guestPhone: b.guestPhone,
          },
          match,
          propertyId: property.id,
          guestId,
          notes,
        });

        if (modifiedPlan.kind === 'update') {
          const { bookingId, mergedTotalPrice, patchedSpecialRequests } = modifiedPlan;
          await applyPersistedBookingUpdate({
            bookingId,
            bookingPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: b.guests,
              totalPrice: mergedTotalPrice,
              specialRequests: patchedSpecialRequests,
            },
            localPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: b.guests,
              totalPrice: mergedTotalPrice,
              specialRequests: patchedSpecialRequests,
            },
            persistPatch: {
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: b.guests,
              totalPrice: mergedTotalPrice,
              status: 'CONFIRMED',
              specialRequests: patchedSpecialRequests.slice(0, 4900),
            },
          });
          handleBookingProgress({
            booking: b,
            action: 'booking_updated',
            incrementCreated: true,
          });
        } else {
          const bookingPayload: Parameters<typeof addBooking>[0] = modifiedPlan.bookingPayload;
          const dbPersistResult = await persistToDb(bookingPayload, 'modified');
          if (!dbPersistResult.id) {
            handlePersistFailure({
              booking: b,
              dbError: dbPersistResult.error,
              fallbackReason: 'db_create_failed_from_modified',
            });
            continue;
          }

          handlePersistCreateSuccess({
            booking: b,
            bookingPayload,
            dbBookingId: dbPersistResult.id,
            action: 'booking_created_from_modified',
          });
        }
      }

      // ── 4d. Départ (checkout) → marquer réservation "completed" + créer tâche ménage ──
      if (b.bookingType === 'checkout' && property) {
        // Retrouver la réservation correspondante
        const match = findBookingMatch(b, {
          propertyId: property.id,
          requireCheckOut: true,
        });

        const checkoutResolution = resolveCheckoutCompletion({
          guestName: b.guestName,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          guests: b.guests,
          hostPayout: b.hostPayout,
          totalPrice: b.totalPrice,
          cleaningFee: b.cleaningFee,
          currency: b.currency,
          confirmationCode: b.confirmationCode,
        }, match);

        if (checkoutResolution.kind === 'complete' && match) {
          const { checkoutSpecialRequests, checkoutTotalPrice } = checkoutResolution;
          // Marquer comme terminée + montant réel reçu (hostPayout si dispo)
          await applyPersistedBookingUpdate({
            bookingId: match.id,
            bookingPatch: {
              status: 'completed',
              paymentStatus: 'paid',
              totalPrice: checkoutTotalPrice,
              specialRequests: checkoutSpecialRequests,
            },
            localPatch: {
              status: 'completed',
              paymentStatus: 'paid',
              totalPrice: checkoutTotalPrice,
              specialRequests: checkoutSpecialRequests,
            },
            persistPatch: {
              status: 'CHECKED_OUT',
              totalPrice: checkoutTotalPrice,
              specialRequests: checkoutSpecialRequests.slice(0, 4900),
              paymentStatus: 'paid',
              paymentAmount: checkoutTotalPrice,
              paymentTransactionId: b.confirmationCode,
            },
          });
          handleBookingProgress({
            booking: b,
            action: 'booking_completed_checkout',
            incrementCreated: true,
          });
        } else {
          handleSkipped({
            booking: b,
            action: 'checkout_not_found',
            reason: 'no_matching_booking',
          });
        }

        // Créer automatiquement une tâche de ménage post-départ
        const alreadyHasCleaning = false; // simplifié — on crée toujours
        if (!alreadyHasCleaning) {
          addMaintenanceTask(buildCheckoutCleaningTask({
            booking: {
              guestName: b.guestName,
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              guests: b.guests,
              hostPayout: b.hostPayout,
              totalPrice: b.totalPrice,
              cleaningFee: b.cleaningFee,
              currency: b.currency,
              confirmationCode: b.confirmationCode,
            },
            propertyId: property.id,
            notes,
            formatDateLabel: fmt,
          }));
          summary.tasksCreated++;

          // Décrémenter l'inventaire consommables (ménage/literie/linge) du logement
          const inventoryUpdatePlan = deriveCheckoutInventoryUpdatePlan(inventory, property.id);
          for (const update of inventoryUpdatePlan) {
            updateInventoryItem(update.itemId, {
              quantity: update.quantity,
              status: update.status,
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
        const matchedReminder = findBookingMatch(b, {
          propertyId: property.id,
          requireCheckIn: true,
        });

        if (matchedReminder) {
          // Enrichir la réservation existante avec les infos complémentaires du rappel
          const updates = deriveReminderEnrichmentUpdates(
            {
              guestName: b.guestName,
              confirmationCode: b.confirmationCode,
              checkIn: b.checkIn,
              checkOut: b.checkOut,
              nights: b.nights,
              guests: b.guests,
              totalPrice: b.totalPrice,
              checkInTime: b.checkInTime,
              checkOutTime: b.checkOutTime,
              nightlyRate: b.nightlyRate,
              cleaningFee: b.cleaningFee,
              serviceFee: b.serviceFee,
              taxAmount: b.taxAmount,
            },
            matchedReminder,
          );
          if (Object.keys(updates).length > 0) {
            await applyPersistedBookingUpdate({
              bookingId: matchedReminder.id,
              bookingPatch: updates as Parameters<typeof updateBooking>[1],
              localPatch: updates,
              persistPatch: buildReminderPersistPatch(updates),
            });
          }
          handleBookingProgress({
            booking: b,
            action: 'booking_enriched_from_reminder',
            incrementCreated: true,
          }); // compté comme une action (enrichissement)
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
            specialRequests: buildReminderImportNotes({
              confirmationCode: b.confirmationCode,
              receivedAt: b.receivedAt,
              propertyName: b.propertyName,
              guestPhone: b.guestPhone,
            }, fmt),
            guestInfo: { name: b.guestName, email: b.guestEmail || '', phone: b.guestPhone || '' },
          };
          const dbPersistResult = await persistToDb(bookingPayload, 'new');
          if (!dbPersistResult.id) {
            handlePersistFailure({
              booking: b,
              dbError: dbPersistResult.error,
              fallbackReason: 'db_create_failed_from_reminder',
            });
            continue;
          }

          handlePersistCreateSuccess({
            booking: b,
            bookingPayload,
            dbBookingId: dbPersistResult.id,
            action: 'booking_created_from_reminder',
          });
        }

        // ── Créer une tâche de préparation J-1 ────────────────────────────
        addMaintenanceTask(buildReminderPrepTask({
          reminder: {
            guestName: b.guestName,
            confirmationCode: b.confirmationCode,
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            nights: b.nights,
            guests: b.guests,
            totalPrice: b.totalPrice,
            checkInTime: b.checkInTime,
            checkOutTime: b.checkOutTime,
            nightlyRate: b.nightlyRate,
            cleaningFee: b.cleaningFee,
            serviceFee: b.serviceFee,
            taxAmount: b.taxAmount,
          },
          propertyId: property.id,
          formatDateLabel: fmt,
        }));
        summary.tasksCreated++;

        // Email de rappel check-in au voyageur (fire-and-forget)
        const checkInReminderEmailPayload = buildCheckInReminderEmailPayload({
          reminder: {
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            checkIn: b.checkIn,
          },
          propertyName: property.name,
        });
        if (checkInReminderEmailPayload) {
          notifyEmail(checkInReminderEmailPayload);
        }
      }

      // ── 4f. Avis (review) → créer un avis dans BNBContext ────────────────
      if (b.bookingType === 'review' && property) {
        // Retrouver la réservation et l'ID du voyageur correspondants
        const matchedBooking = findBookingMatch(b, {
          propertyId: property.id,
          requireCheckOut: true,
        });

        const reviewPlan = buildReviewPlan({
          booking: {
            guestName: b.guestName,
            reviewRating: b.reviewRating,
            reviewComment: b.reviewComment,
            receivedAt: b.receivedAt,
          },
          formatDateLabel: fmt,
        });

        addReview({
          propertyId: property.id,
          bookingId: matchedBooking?.id ?? 0,
          guestId: guestId,
          rating: reviewPlan.rating,
          title: reviewPlan.title,
          comment: reviewPlan.comment,
        });

        // Si la réservation correspondante n'est pas déjà "completed", la marquer
        const reviewCompletionPlan = resolveReviewCompletionPlan(matchedBooking);
        if (reviewCompletionPlan.kind === 'complete') {
          const { bookingId } = reviewCompletionPlan;
          await applyPersistedBookingUpdate({
            bookingId,
            bookingPatch: { status: 'completed' },
            localPatch: { status: 'completed' },
            persistPatch: {
              status: 'CHECKED_OUT',
            },
          });
        }

        summary.reviewsImported++;
        handleBookingProgress({
          booking: b,
          action: 'review_imported',
        });
      }

      // ── 4g. Versement (payout) → enrichir la réservation avec données financières ──
      if (b.bookingType === 'payout') {
        // Retrouver la réservation liée (par code de confirmation ou voyageur)
        const payoutBooking = findBookingMatch(b, {
          propertyId: property?.id,
        });

        const payoutPlan = resolvePayoutPlan({
          booking: {
            hostPayout: b.hostPayout,
            totalPrice: b.totalPrice,
            payoutDate: b.payoutDate,
            receivedAt: b.receivedAt,
            confirmationCode: b.confirmationCode,
            propertyName: b.propertyName,
          },
          matchedBooking: payoutBooking,
          fallbackPropertyId: property?.id ?? (runtimeProperties[0]?.id ?? 0),
          formatDateLabel: fmt,
        });

        if (payoutPlan.kind === 'attach') {
          const { bookingId, payoutAmount, payoutDateStr, payoutSpecialRequests } = payoutPlan;
          const payoutAttachPatch = buildPayoutAttachBookingPatch({
            payoutAmount,
            payoutDateStr,
            payoutSpecialRequests,
            booking: {
              cleaningFee: b.cleaningFee,
              serviceFee: b.serviceFee,
            },
          });

          // Mettre à jour la réservation existante avec les infos financières
          await applyPersistedBookingUpdate({
            bookingId,
            bookingPatch: payoutAttachPatch,
            localPatch: payoutAttachPatch,
            persistPatch: buildPayoutAttachPersistPatch({
              payoutAmount,
              payoutSpecialRequests,
              confirmationCode: b.confirmationCode,
            }),
          });
          summary.payoutsSaved++;
          handleBookingProgress({
            booking: b,
            action: 'payout_attached_to_booking',
          });
        } else if (payoutPlan.kind === 'create') {
          const { targetPropertyId, payoutAmount, payoutDateStr, financialSpecialRequests } = payoutPlan;
          // Aucune réservation trouvée → créer une réservation "fantôme" financière
          // pour tracer le versement dans les données
            const bookingPayload: Parameters<typeof addBooking>[0] = buildPayoutCreateBookingPayload({
              targetPropertyId,
              payoutAmount,
              payoutDateStr,
              financialSpecialRequests,
              guestId: guestId || 0,
              booking: {
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                guests: b.guests,
                guestName: b.guestName,
                guestEmail: b.guestEmail,
                cleaningFee: b.cleaningFee,
                serviceFee: b.serviceFee,
              },
            });
            const dbPersistResult = await persistToDb(bookingPayload, 'new');
            if (!dbPersistResult.id) {
              handlePersistFailure({
                booking: b,
                dbError: dbPersistResult.error,
                fallbackReason: 'db_create_failed_from_payout',
              });
              continue;
            }

            handlePersistCreateSuccess({
              booking: b,
              bookingPayload,
              dbBookingId: dbPersistResult.id,
              action: 'payout_created_as_financial_booking',
            });
        } else if (payoutPlan.kind === 'skip') {
          handleSkipped({
            booking: b,
            action: 'payout_skipped',
            reason: payoutPlan.reason,
          });
        }
      }

      // ── 4.h. Créer les dépenses (Expenses) pour les frais Airbnb retenus ──
      const pid = property?.id || defaultProperty?.id;
      summary.expensesCreated += syncAirbnbExpensesFromImport({
        booking: {
          bookingType: b.bookingType,
          totalPrice: b.totalPrice,
          hostPayout: b.hostPayout,
          serviceFee: b.serviceFee,
          taxAmount: b.taxAmount,
          guestName: b.guestName,
          currency: b.currency,
          payoutDate: b.payoutDate,
          checkIn: b.checkIn,
          confirmationCode: b.confirmationCode,
        },
        propertyId: pid,
      });
      }

      const importedMessageIds = Array.from(new Set(
        trace
          .filter((entry) => entry.status === 'success' || entry.status === 'skipped')
          .map((entry) => entry.messageId),
      ));

      setRuntimeProgress({
        phase: 'finalize',
        processed: toImport.length,
        total: Math.max(toImport.length, 1),
        currentLabel: `Finalisation de ${toImport.length} import(s)…`,
      });

      setImported(importedMessageIds);
      setImportSummary(summary);
      setImportTrace(trace.slice(-200));
      setSelected(new Set());

      if (summary.dbFailed > 0) {
        if (dbAuthFailed > 0) {
          toast.error(`⚠️ ${summary.dbFailed} réservation(s) non persistée(s) en base (dont ${dbAuthFailed} erreur(s) d'authentification). Reconnectez-vous puis relancez l'import.`);
        } else {
          toast.error(`⚠️ ${summary.dbFailed} réservation(s) non persistée(s) en base.`);
        }
      }

      if (summary.datesResynced > 0) {
        toast.success(`✅ ${summary.datesResynced} réservation(s) existante(s) resynchronisée(s) avec les bonnes dates.`);
      }

      // ── 5. Détecter les nouveaux logements inconnus ───────────────────────
      const wizardSuggestions = deriveWizardPropertySuggestions({
        bookings: toImport,
        runtimeProperties,
        skippedNoPropertyCount: summary.skippedNoProperty,
        rejectedPropertySet,
        getWizardPropertyCandidate,
        normalizeForMatch,
        normalizePropertyLabelForWizard,
        normalizeSubjectLabelForWizard,
        findMatchingProperty,
      });

      if (wizardSuggestions.candidateNames.length === 0 && summary.skippedNoProperty > 0) {
        if (wizardSuggestions.fallbackNames.length > 0) {
          const queue = wizardSuggestions.fallbackNames.map((name) => analyzeAirbnbTitle(name));
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

      const newNames = findNewPropertyNames(wizardSuggestions.candidateNames, runtimeProperties);
      if (newNames.length > 0) {
        const queue = newNames.map(n => analyzeAirbnbTitle(n));
        setPropertyQueue(queue.slice(1));
        setCurrentWizard(queue[0]);
      }

      setTimeout(() => setStatus('idle'), 2500);
      setStatus('done');
  }, [bookings, selected, existingBookings, guests, addBooking, updateBooking, cancelBooking, addGuest, updateGuest, addMaintenanceTask, addReview, notifyEmail, inventory, updateInventoryItem, getLowStockItems, propertyOverrides, expertModeAggressive, ensureDefaultProperty, ensureCanonicalT3Property, rejectedPropertySet, fetchDbProperties]);

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

  const learnPropertyAlias = useCallback((rawPropertyLabel?: string, canonicalPropertyName?: string) => {
    if (!rawPropertyLabel?.trim() || !canonicalPropertyName?.trim()) return;

    const normalized = normalizeForMatch(rawPropertyLabel);
    const sanitized = sanitizePropertyLabel(rawPropertyLabel);
    const compactNormalized = normalized.replace(/\s+/g, '');
    const compactSanitized = sanitized.replace(/\s+/g, '');
    const keys = Array.from(new Set([
      normalized,
      sanitized,
      compactNormalized.length >= 6 ? compactNormalized : '',
      compactSanitized.length >= 6 ? compactSanitized : '',
    ].filter(Boolean)));

    if (keys.length === 0) return;

    setLearnedPropertyAliases((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of keys) {
        if (next[key] === canonicalPropertyName) continue;
        next[key] = canonicalPropertyName;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const learnedAliasEntries = useMemo(() => {
    return Object.entries(learnedPropertyAliases)
      .sort((a, b) => {
        const targetCompare = a[1].localeCompare(b[1], 'fr', { sensitivity: 'base' });
        if (targetCompare !== 0) return targetCompare;
        return a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' });
      });
  }, [learnedPropertyAliases]);

  const removeLearnedPropertyAlias = useCallback((aliasKey: string) => {
    setLearnedPropertyAliases((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, aliasKey)) return prev;
      const next = { ...prev };
      delete next[aliasKey];
      return next;
    });
  }, []);

  const clearLearnedPropertyAliases = useCallback(() => {
    if (learnedAliasEntries.length === 0) return;
    setLearnedPropertyAliases({});
    toast.success('Alias Gmail appris réinitialisés.');
  }, [learnedAliasEntries.length]);

  const exportLearnedPropertyAliases = useCallback(() => {
    if (learnedAliasEntries.length === 0) {
      toast.error('Aucun alias à exporter.');
      return;
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      aliases: learnedPropertyAliases,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gmail-property-aliases-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Export JSON généré (${learnedAliasEntries.length} alias).`);
  }, [learnedAliasEntries.length, learnedPropertyAliases]);

  const importLearnedPropertyAliases = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as unknown;
      const source = parsed && typeof parsed === 'object' && 'aliases' in parsed
        ? (parsed as { aliases?: unknown }).aliases
        : parsed;

      if (!source || typeof source !== 'object') {
        throw new Error('invalid_alias_format');
      }

      const normalizedEntries = Object.entries(source as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string' && !!value.trim())
        .map(([key, value]) => ({
          key: normalizeForMatch(key),
          value: (value as string).trim(),
        }))
        .filter((entry) => !!entry.key && !!entry.value);

      if (normalizedEntries.length === 0) {
        throw new Error('empty_alias_payload');
      }

      setLearnedPropertyAliases((prev) => {
        const next = { ...prev };
        for (const entry of normalizedEntries) {
          next[entry.key] = entry.value;
        }
        return next;
      });

      toast.success(`${normalizedEntries.length} alias importé(s).`);
    } catch {
      toast.error('Import JSON invalide pour les alias Gmail.');
    } finally {
      input.value = '';
    }
  }, []);

  const rejectDetectedPropertyLabel = useCallback((rawLabel?: string) => {
    const normalized = normalizeForMatch(rawLabel || '');
    if (!normalized) return;

    setRejectedPropertyLabels((prev) => {
      if (prev.includes(normalized)) return prev;
      return [...prev, normalized];
    });

    setPropertyOverrides((prev) => {
      if (!rawLabel?.trim()) return prev;
      const next = { ...prev };
      for (const booking of bookings) {
        if (normalizeForMatch(booking.propertyName || '') !== normalized) continue;
        delete next[booking.messageId];
      }
      return next;
    });

    toast.success(`Libellé ignoré: "${rawLabel || normalized}"`);
  }, [bookings]);

  const restoreRejectedPropertyLabel = useCallback((rawLabel?: string) => {
    const normalized = normalizeForMatch(rawLabel || '');
    if (!normalized) return;
    setRejectedPropertyLabels((prev) => prev.filter((entry) => entry !== normalized));
    toast.success(`Libellé réactivé: "${rawLabel || normalized}"`);
  }, []);

  const unresolvedPropertyDetections = useMemo(() => {
    const byLabel = new Map<string, { label: string; count: number }>();

    for (const booking of bookings) {
      if (booking.bookingType === 'cancelled' || booking.bookingType === 'payout' || booking.bookingType === 'review') continue;
      if (!booking.propertyName?.trim()) continue;
  if (findMatchingProperty(booking.propertyName, availableProperties)) continue;

      const normalized = normalizeForMatch(booking.propertyName);
      if (!normalized) continue;

      const existing = byLabel.get(normalized);
      if (existing) {
        existing.count += 1;
      } else {
        byLabel.set(normalized, {
          label: booking.propertyName.trim(),
          count: 1,
        });
      }
    }

    return Array.from(byLabel.entries())
      .map(([normalized, payload]) => {
  const bestCandidate = findBestPropertyCandidate(payload.label, availableProperties);
        return {
          normalized,
          label: payload.label,
          count: payload.count,
          bestCandidate,
          isRejected: rejectedPropertySet.has(normalized),
        };
      })
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));
  }, [bookings, availableProperties, rejectedPropertySet]);

  const unmatchedLabelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const booking of bookings) {
      if (booking.bookingType === 'cancelled' || booking.bookingType === 'payout') continue;
      if (!booking.propertyName?.trim()) continue;
  if (findMatchingProperty(booking.propertyName, availableProperties)) continue;
      const key = normalizeForMatch(booking.propertyName);
      if (!key) continue;
      if (rejectedPropertySet.has(key)) continue;
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [bookings, availableProperties, rejectedPropertySet]);

  const validateDetectedPropertyLabel = useCallback((normalizedLabel: string, fallbackPropertyId?: number) => {
    const selectedPropertyId = manualPropertySelection[normalizedLabel] ?? fallbackPropertyId;
    if (!selectedPropertyId) {
      toast.error('Choisis un logement avant de valider.');
      return;
    }

  const selectedProperty = availableProperties.find((property) => property.id === selectedPropertyId);
    if (!selectedProperty) {
      toast.error('Logement sélectionné introuvable.');
      return;
    }

    const relatedBookings = bookings.filter((booking) => normalizeForMatch(booking.propertyName || '') === normalizedLabel);
    if (relatedBookings.length === 0) {
      toast.error('Aucun email correspondant à ce libellé.');
      return;
    }

    for (const booking of relatedBookings) {
      learnPropertyAlias(booking.propertyName, selectedProperty.name);
    }

    setPropertyOverrides((prev) => {
      const next = { ...prev };
      for (const booking of relatedBookings) {
        next[booking.messageId] = selectedProperty.id;
      }
      return next;
    });

    setRejectedPropertyLabels((prev) => prev.filter((entry) => entry !== normalizedLabel));
    toast.success(`Rattachement validé: ${selectedProperty.name} (${relatedBookings.length} email(s)).`);
  }, [bookings, learnPropertyAlias, manualPropertySelection, availableProperties]);

  const applySuggestionToSimilarBookings = useCallback((booking: ParsedBooking, suggestedPropertyId: number) => {
    const targetLabel = normalizeForMatch(booking.propertyName || '');
    if (!targetLabel) return;
    const suggestedProperty = availableProperties.find((p) => p.id === suggestedPropertyId);
    if (!suggestedProperty) return;

    const similarBookings = bookings
      .filter((candidate) => {
        if (candidate.bookingType === 'cancelled' || candidate.bookingType === 'payout') return false;
        if (!candidate.propertyName?.trim()) return false;
        if (findMatchingProperty(candidate.propertyName, availableProperties)) return false;
        return normalizeForMatch(candidate.propertyName) === targetLabel;
      });

    const similarMessageIds = similarBookings.map((candidate) => candidate.messageId);

    if (similarMessageIds.length === 0) return;

    for (const candidate of similarBookings) {
      learnPropertyAlias(candidate.propertyName, suggestedProperty.name);
    }

    setRejectedPropertyLabels((prev) => prev.filter((entry) => entry !== targetLabel));

    setPropertyOverrides((prev) => {
      const next = { ...prev };
      for (const messageId of similarMessageIds) {
        next[messageId] = suggestedPropertyId;
      }
      return next;
    });

    if (similarMessageIds.length > 1) {
      toast.success(`Suggestion appliquée à ${similarMessageIds.length} emails similaires.`);
    }
  }, [bookings, availableProperties, learnPropertyAlias]);

  const getContextInferenceConfidence = (booking: ParsedBooking): { label: 'élevée' | 'moyenne' | 'faible'; level: 'high' | 'medium' | 'low' } => {
    const hasConfirmationCode = !!booking.confirmationCode;
    const hasReliableDates = isValidDateRange(booking.checkIn, booking.checkOut);
    const hasNamedGuest = !!booking.guestName && !isPlaceholderGuestName(booking.guestName);

    let score = 0;
    if (hasConfirmationCode) score += 2;
    if (hasReliableDates) score += 1;
    if (hasNamedGuest) score += 1;

    if (score >= 3) return { label: 'élevée', level: 'high' };
    if (score >= 2) return { label: 'moyenne', level: 'medium' };
    return { label: 'faible', level: 'low' };
  };

  const formatWarningLabel = (warning: string): string => {
    if (warning.startsWith('property_inferred_from_context:')) {
      const inferredName = warning.split(':').slice(1).join(':').trim();
      return `Logement déduit du contexte${inferredName ? `: ${inferredName}` : ''}`;
    }

    const map: Record<string, string> = {
      date_range_inferred_precisely_from_subject: 'Dates de séjour déduites précisément du sujet',
      date_range_inferred_from_arrival_departure_subject: "Dates de séjour déduites depuis les blocs d'arrivée/départ",
      date_range_inferred_from_subject: 'Dates de séjour déduites du sujet',
  checkout_defaulted_from_extracted_nights: 'Date de départ recalculée depuis le nombre de nuits extrait',
      checkout_inferred_from_nights: 'Date de départ calculée à partir du nombre de nuits',
      nights_recomputed_from_dates: 'Nombre de nuitées recalculé depuis les dates de séjour',
      property_inferred_from_subject: 'Logement déduit depuis le sujet',
      property_inferred_single_property_fallback: 'Logement affecté automatiquement (mode mono-logement)',
      guest_name_inferred_from_subject: 'Nom du voyageur déduit du sujet',
  guest_name_replaced_from_subject: 'Nom du voyageur corrigé depuis le sujet',
      review_context_inferred: "Informations d'avis enrichies depuis le contexte",
      payout_context_inferred: "Informations de versement enrichies depuis le contexte",
      logement_introuvable: 'Logement introuvable',
      property_not_found: 'Logement introuvable',
      missing_property: 'Logement manquant',
    };

    return map[warning] || warning;
  };

  const formatRejectReasonLabel = (reason: string): string => {
    const map: Record<string, string> = {
      missing_message_id: 'Message Gmail invalide (ID manquant)',
      missing_subject: 'Sujet email manquant',
      invalid_received_at: 'Date de réception invalide',
      outside_2026_window: 'Hors période analysée (2026+)',
      low_confidence: 'Confiance parser trop faible',
      invalid_confirmation_code: 'Code de confirmation invalide',
      missing_real_guest_name: 'Nom voyageur non fiable',
      missing_guest_name: 'Nom voyageur manquant',
      invalid_date_range: 'Dates de séjour invalides',
      missing_price_or_confirmation_code: 'Prix ou code de réservation manquant',
      review_without_rating_or_comment: 'Avis sans note ni commentaire exploitable',
      payout_without_amount: 'Versement sans montant',
      unsupported_booking_type: "Type d'email non supporté",
    };

    return map[reason] || reason;
  };

  const rejectReasonActionHints: Record<string, string> = {
    missing_message_id: 'Vérifier la réponse API Gmail et ignorer explicitement les messages incomplets.',
    missing_subject: 'Ajouter un fallback parser sur le body pour classer les emails sans sujet exploitable.',
    invalid_received_at: 'Sécuriser le parsing de date Gmail (fallback RFC2822/ISO + timezone).',
    outside_2026_window: 'Ajuster la fenêtre de scan si vous souhaitez reprendre des historiques antérieurs.',
    low_confidence: 'Prioriser l’enrichissement des règles parser pour les sujets les plus fréquents ci-dessous.',
    invalid_confirmation_code: 'Tolérer les formats intermédiaires puis normaliser vers HM* lorsque possible.',
    missing_real_guest_name: 'Renforcer l’extraction nom depuis le sujet et les segments “pour/arrive/part”.',
    missing_guest_name: 'Ajouter une extraction secondaire depuis le corps de mail.',
    invalid_date_range: 'Améliorer les règles de déduction check-in/check-out dans les sujets incomplets.',
    missing_price_or_confirmation_code: 'Conserver ces cas en “pending_review” plutôt que rejet pur.',
    review_without_rating_or_comment: 'Fallback sur contexte réservation si avis court mais lié à un séjour connu.',
    payout_without_amount: 'Parser les variantes de devise/montant Airbnb avant classification finale payout.',
    unsupported_booking_type: 'Étendre la table de classification aux nouveaux templates Airbnb détectés.',
  };

  const filteredRejectInsights = useMemo(() => {
    if (filteredRejected.length === 0) return null;

    const reasonCounts = new Map<string, number>();
    const bookingTypeCounts = new Map<ParsedBooking['bookingType'], number>();
    const classificationSourceCounts = new Map<string, number>();
    let confidenceSum = 0;

    for (const entry of filteredRejected) {
      const { booking, reasons } = entry;
      confidenceSum += booking.confidence || 0;
      bookingTypeCounts.set(booking.bookingType, (bookingTypeCounts.get(booking.bookingType) || 0) + 1);
      const source = booking.classificationSource || 'unknown';
      classificationSourceCounts.set(source, (classificationSourceCounts.get(source) || 0) + 1);

      for (const reason of reasons) {
        reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      }
    }

    const total = filteredRejected.length;
    const topReasons = Array.from(reasonCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([reason, count]) => ({
        reason,
        count,
        share: Math.round((count / total) * 100),
      }));

    const topBookingTypes = Array.from(bookingTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bookingType, count]) => ({
        bookingType,
        count,
        share: Math.round((count / total) * 100),
      }));

    const topClassificationSources = Array.from(classificationSourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([source, count]) => ({
        source,
        count,
      }));

    const averageConfidence = Math.round(confidenceSum / total);
    const examples = filteredRejected.slice(0, 3).map(({ booking, reasons }) => ({
      messageId: booking.messageId,
      receivedAt: booking.receivedAt,
      subject: booking.subject,
      bookingType: booking.bookingType,
      confidence: booking.confidence,
      primaryReason: reasons[0] || 'unknown',
    }));

    return {
      total,
      averageConfidence,
      topReasons,
      topBookingTypes,
      topClassificationSources,
      examples,
    };
  }, [filteredRejected]);

  const buildRejectInsightsBrief = async () => {
    if (!filteredRejectInsights || !qualityReport) {
      toast.error('Aucun insight rejet à exporter pour le moment.');
      return;
    }

    setIsPreparingRejectBrief(true);
    try {
      const scopeLabel = activeRejectReason === 'all'
        ? 'toutes raisons'
        : formatRejectReasonLabel(activeRejectReason);

      const lines: string[] = [
        `# Brief parser — rejets Gmail Airbnb`,
        '',
        `- Date: ${new Date().toLocaleString('fr-FR')}`,
        `- Portée: ${scopeLabel}`,
        `- Rejets filtrés: ${filteredRejectInsights.total}/${qualityReport.rejected}`,
        `- Confiance moyenne: ${filteredRejectInsights.averageConfidence}%`,
        '',
        '## Top causes',
      ];

      for (const reason of filteredRejectInsights.topReasons) {
        lines.push(`- ${formatRejectReasonLabel(reason.reason)}: ${reason.count} (${reason.share}%)`);
        lines.push(`  - Action recommandée: ${rejectReasonActionHints[reason.reason] || 'Ajouter une règle parser dédiée pour ce motif de rejet.'}`);
      }

      lines.push('', '## Types les plus impactés');
      for (const type of filteredRejectInsights.topBookingTypes) {
        lines.push(`- ${type.bookingType}: ${type.count} (${type.share}%)`);
      }

      lines.push('', '## Exemples concrets');
      for (const example of filteredRejectInsights.examples) {
        lines.push(`- ${fmt(example.receivedAt)} · ${example.bookingType} · ${example.confidence}% · ${formatRejectReasonLabel(example.primaryReason)}`);
        lines.push(`  Sujet: ${example.subject || 'Sujet vide'}`);
      }

      const brief = lines.join('\n');

      try {
        await navigator.clipboard.writeText(brief);
        toast.success('Brief parser copié dans le presse-papiers.');
      } catch {
        const blob = new Blob([brief], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const dateTag = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `gmail-rejects-parser-brief-${dateTag}.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success('Brief parser téléchargé (.md).');
      }
    } finally {
      setIsPreparingRejectBrief(false);
    }
  };

  const importTraceStats = useMemo(() => {
    return computeImportTraceStats(importTrace);
  }, [importTrace]);

  const importTraceTopErrorReasons = useMemo(() => {
    return computeImportTraceTopErrorReasons(importTrace, 3);
  }, [importTrace]);

  const filteredImportTrace = useMemo(() => {
    return filterImportTrace(importTrace, {
      statusFilter: traceStatusFilter,
      query: traceSearch,
    }) as ImportTraceEntry[];
  }, [importTrace, traceSearch, traceStatusFilter]);

  // ─── Avancer dans la file de nouveaux logements ───────────────────────────

  const advanceQueue = useCallback(() => {
    setPropertyQueue(prev => {
      setCurrentWizard(prev[0] ?? null);
      return prev.slice(1);
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

  const importPerformance = useMemo(() => {
    if (!importSummary || imported.length === 0) return null;

    const processed = imported.length;
    const rescuedTotal = importSummary.rescuedAggressive + importSummary.rescuedSingleProperty;
    const noPropertySkips = importSummary.skippedNoProperty;
    const successCount = Math.max(0, processed - noPropertySkips);
    const successRate = processed > 0 ? Math.round((successCount / processed) * 100) : 0;
    const rescueRate = processed > 0 ? Math.round((rescuedTotal / processed) * 100) : 0;

    return {
      processed,
      successCount,
      successRate,
      rescuedTotal,
      rescueRate,
      aggressive: importSummary.rescuedAggressive,
      single: importSummary.rescuedSingleProperty,
      noPropertySkips,
      successLevel: successRate >= 95 ? 'excellent' : successRate >= 80 ? 'warning' : 'critical',
      rescueLevel: rescueRate <= 10 ? 'low' : rescueRate <= 25 ? 'medium' : 'high',
    };
  }, [importSummary, imported.length]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const card = isDark ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-gray-200 bg-white hover:border-gray-300';
  const cardSelected = isDark ? 'border-violet-500 bg-violet-900/30' : 'border-violet-400 bg-violet-50';
  const cardImported = isDark ? 'border-green-700 bg-green-900/20 opacity-70' : 'border-green-300 bg-green-50 opacity-70';

  const overlaySteps = status === 'importing'
    ? [
      { phase: 'detect' as RuntimeProgressPhase, label: 'Détection des emails Airbnb', icon: Search },
      { phase: 'normalize' as RuntimeProgressPhase, label: 'Normalisation des données', icon: Database },
      { phase: 'prepare' as RuntimeProgressPhase, label: 'Préparation de l\'import', icon: DownloadCloud },
      { phase: 'finalize' as RuntimeProgressPhase, label: 'Finalisation import', icon: CheckCircle2 },
    ]
    : [
      { phase: 'connect' as RuntimeProgressPhase, label: 'Connexion Gmail', icon: Mail },
      { phase: 'detect' as RuntimeProgressPhase, label: 'Détection des emails Airbnb', icon: Search },
      { phase: 'normalize' as RuntimeProgressPhase, label: 'Classification et normalisation', icon: Database },
      { phase: 'finalize' as RuntimeProgressPhase, label: 'Consolidation des réservations', icon: CheckCircle2 },
    ];

  const activeOverlayStepIndex = Math.max(
    0,
    overlaySteps.findIndex((step) => step.phase === (runtimeProgress?.phase ?? (status === 'importing' ? 'detect' : 'connect'))),
  );

  const overlayTotal = Math.max(runtimeProgress?.total ?? 1, 1);
  const overlayProcessed = Math.max(0, Math.min(runtimeProgress?.processed ?? 0, overlayTotal));
  const overlayPercentRaw = Math.round((overlayProcessed / overlayTotal) * 100);
  const overlayPercent = status === 'importing' ? Math.max(5, overlayPercentRaw) : Math.max(10, overlayPercentRaw);
  const overlayHeaderStep = overlaySteps[activeOverlayStepIndex]?.label ?? (status === 'importing' ? 'Import en cours' : 'Scan Gmail');
  const overlayDetail = runtimeProgress?.currentLabel
    ?? (status === 'importing' ? 'Extraction, classification et préparation des écritures…' : 'Recherche de réservations et données financières…');
  const overlayCounterLabel = status === 'importing'
    ? `${overlayProcessed}/${overlayTotal} email${overlayTotal > 1 ? 's' : ''} traité${overlayProcessed > 1 ? 's' : ''}`
    : `Étape ${Math.min(activeOverlayStepIndex + 1, overlaySteps.length)}/${overlaySteps.length}`;
  const overlayEtaLabel = (() => {
    const startedAt = progressStartedAtRef.current;
    if (!startedAt || overlayProcessed <= 0 || overlayProcessed >= overlayTotal) return null;

    const elapsedSec = Math.max(1, (Date.now() - startedAt) / 1000);
    const throughput = overlayProcessed / elapsedSec;
    if (!Number.isFinite(throughput) || throughput <= 0) return null;

    const remainingSec = Math.round((overlayTotal - overlayProcessed) / throughput);
    if (!Number.isFinite(remainingSec) || remainingSec <= 0) return null;

    if (remainingSec < 60) return `~${remainingSec}s restantes`;
    if (remainingSec < 3600) return `~${Math.ceil(remainingSec / 60)} min restantes`;
    const hours = Math.floor(remainingSec / 3600);
    const minutes = Math.ceil((remainingSec % 3600) / 60);
    return `~${hours}h${minutes.toString().padStart(2, '0')} restantes`;
  })();

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
              className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-hidden ${isDark ? 'bg-gray-900 border border-white/10' : 'bg-white border border-black/5'}`}
            >
              <div className={`absolute inset-0 pointer-events-none ${status === 'importing' ? 'bg-violet-500/5' : 'bg-pink-500/5'}`} />

              <div className="relative z-10 flex items-start gap-4">
                <div className={`relative w-12 h-12 flex items-center justify-center rounded-xl ${status === 'importing' ? 'bg-violet-500/15 text-violet-400' : 'bg-pink-500/15 text-pink-400'}`}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                    className={`absolute inset-0 rounded-xl border ${status === 'importing' ? 'border-violet-500/30' : 'border-pink-500/30'}`}
                  />
                  {status === 'importing' ? <DownloadCloud className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                </div>

                <div className="flex-1">
                  <h3 className={`text-base font-semibold leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {status === 'importing' ? 'Import en cours' : 'Analyse de votre Gmail'}
                  </h3>
                  <p className={`mt-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {overlayDetail}
                  </p>
                </div>
              </div>

              <div className={`relative z-10 mt-4 rounded-xl border p-3 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Étapes</span>
                  <span className={`font-medium ${status === 'importing' ? (isDark ? 'text-violet-300' : 'text-violet-700') : (isDark ? 'text-pink-300' : 'text-pink-700')}`}>
                    {overlayHeaderStep}
                  </span>
                </div>

                <div className="mt-2">
                  <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>{overlayCounterLabel}</span>
                    <span>{overlayPercent}%</span>
                  </div>
                  {overlayEtaLabel && (
                    <div className={`mt-1 text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {overlayEtaLabel}
                    </div>
                  )}
                  <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <motion.div
                      animate={{ width: `${overlayPercent}%` }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className={`h-full rounded-full ${status === 'importing' ? 'bg-violet-400' : 'bg-pink-400'}`}
                    />
                  </div>
                </div>

                <div className="mt-2 grid gap-1.5 text-sm">
                  {overlaySteps.map((step, index) => {
                    const Icon = step.icon;
                    const isDone = index < activeOverlayStepIndex;
                    const isActive = index === activeOverlayStepIndex;

                    return (
                      <div
                        key={step.phase}
                        className={`flex items-center gap-2 transition-all ${
                          isDone
                            ? (isDark ? 'text-green-300' : 'text-green-700')
                            : isActive
                              ? (status === 'importing'
                                ? (isDark ? 'text-violet-200' : 'text-violet-700')
                                : (isDark ? 'text-pink-200' : 'text-pink-700'))
                              : (isDark ? 'text-gray-300' : 'text-gray-700')
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isActive ? (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </motion.div>
                        ) : (
                          <Icon className="w-3.5 h-3.5 opacity-80" />
                        )}
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`relative z-10 mt-4 flex items-center gap-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className={`w-2 h-2 rounded-full ${status === 'importing' ? 'bg-violet-400' : 'bg-pink-400'}`}
                />
                {overlayDetail}
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
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={buildRejectInsightsBrief}
                  disabled={isPreparingRejectBrief}
                  title={isPreparingRejectBrief ? 'Préparation du brief…' : 'Générer un brief parser à partir des rejets filtrés'}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isDark
                      ? 'border-fuchsia-700 text-fuchsia-300 hover:bg-fuchsia-900/30 disabled:opacity-60 disabled:cursor-not-allowed'
                      : 'border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-60 disabled:cursor-not-allowed'
                  }`}
                >
                  {isPreparingRejectBrief ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isPreparingRejectBrief ? 'Brief…' : 'Brief parser'}
                </button>

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
              </div>
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
                      {formatRejectReasonLabel(reason)} · {count}
                    </button>
                  );
                })}
              </div>

              {qualityReport.rejected > 0 && (
                <div className={`mt-3 rounded-lg border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-3 py-2 text-[11px] font-semibold ${isDark ? 'bg-gray-900/40 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    Rejets filtrés ({filteredRejected.length}) — {activeRejectReason === 'all' ? 'toutes raisons' : formatRejectReasonLabel(activeRejectReason)}
                  </div>
                  {filteredRejectInsights && (
                    <div className={`px-3 py-2 border-t text-[11px] space-y-2 ${isDark ? 'border-gray-700 bg-gray-900/30 text-gray-300' : 'border-gray-200 bg-gray-50/80 text-gray-700'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-semibold ${isDark ? 'text-fuchsia-300' : 'text-fuchsia-700'}`}>Insights utiles :</span>
                        <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-700 border border-gray-200'}`}>
                          confiance moyenne {filteredRejectInsights.averageConfidence}%
                        </span>
                        {filteredRejectInsights.topClassificationSources.map((source) => (
                          <span key={`source-${source.source}`} className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/40 text-blue-200' : 'bg-blue-50 text-blue-700'}`}>
                            source {source.source} · {source.count}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {filteredRejectInsights.topReasons.map((reason) => (
                          <div key={`insight-${reason.reason}`} className="flex items-start gap-2">
                            <span className={`mt-0.5 px-1.5 py-0.5 rounded whitespace-nowrap ${isDark ? 'bg-amber-900/40 text-amber-200' : 'bg-amber-100 text-amber-800'}`}>
                              {formatRejectReasonLabel(reason.reason)} · {reason.count} ({reason.share}%)
                            </span>
                            <span className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rejectReasonActionHints[reason.reason] || 'Ajouter une règle parser dédiée pour ce motif de rejet.'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {filteredRejectInsights.topBookingTypes.map((type) => (
                          <span key={`type-${type.bookingType}`} className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-violet-900/40 text-violet-200' : 'bg-violet-100 text-violet-700'}`}>
                            {type.bookingType} · {type.count} ({type.share}%)
                          </span>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {filteredRejectInsights.examples.map((example) => (
                          <div key={`example-${example.messageId}`} className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            • {fmt(example.receivedAt)} · {example.bookingType} · {example.confidence}% · {formatRejectReasonLabel(example.primaryReason)} — <span className="italic">{example.subject || 'Sujet vide'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                                {formatRejectReasonLabel(reason)}
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

            <button
              type="button"
              onClick={() => setExpertModeAggressive((prev) => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border transition-colors ${
                expertModeAggressive
                  ? (isDark
                    ? 'border-fuchsia-600 text-fuchsia-300 bg-fuchsia-900/20 hover:bg-fuchsia-900/35'
                    : 'border-fuchsia-300 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100')
                  : (isDark
                    ? 'border-gray-600 text-gray-300 bg-gray-800 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50')
              }`}
              title="Active/désactive les rattachements logement agressifs"
            >
              <Zap className="w-4 h-4" />
              Mode expert {expertModeAggressive ? 'ON' : 'OFF'}
            </button>

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

          {(
            <div className={`border rounded-xl p-3 ${isDark ? 'bg-violet-900/15 border-violet-700/60' : 'bg-violet-50 border-violet-200'}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className={`text-sm font-semibold ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
                    🧠 Alias Gmail appris ({learnedAliasEntries.length})
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-violet-300/80' : 'text-violet-700/80'}`}>
                    Mode expert agressif : <strong>{expertModeAggressive ? 'activé' : 'désactivé'}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={aliasImportInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={importLearnedPropertyAliases}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => aliasImportInputRef.current?.click()}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                      isDark
                        ? 'border-blue-600 text-blue-300 hover:bg-blue-900/30'
                        : 'border-blue-300 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Importer JSON
                  </button>
                  <button
                    type="button"
                    onClick={exportLearnedPropertyAliases}
                    disabled={learnedAliasEntries.length === 0}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'border-emerald-600 text-emerald-300 hover:bg-emerald-900/30'
                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    Exporter JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAliasManager((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                      isDark
                        ? 'border-violet-600 text-violet-300 hover:bg-violet-900/30'
                        : 'border-violet-300 text-violet-700 hover:bg-violet-100'
                    }`}
                  >
                    {showAliasManager ? 'Masquer' : 'Gérer'}
                  </button>
                  <button
                    type="button"
                    onClick={clearLearnedPropertyAliases}
                    disabled={learnedAliasEntries.length === 0}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isDark
                        ? 'border-red-700 text-red-300 hover:bg-red-900/30'
                        : 'border-red-300 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>

              {showAliasManager && (
                <div className={`mt-3 rounded-lg border overflow-hidden ${isDark ? 'border-violet-800/60 bg-gray-900/30' : 'border-violet-200 bg-white'}`}>
                  <div className="max-h-48 overflow-auto text-[11px]">
                    {learnedAliasEntries.map(([aliasKey, canonicalName]) => (
                      <div
                        key={`${aliasKey}-${canonicalName}`}
                        className={`px-3 py-2 border-t first:border-t-0 flex items-center gap-2 ${isDark ? 'border-gray-700 text-gray-200' : 'border-gray-100 text-gray-700'}`}
                      >
                        <span className={`font-mono ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{aliasKey}</span>
                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
                        <span className="font-medium">{canonicalName}</span>
                        <button
                          type="button"
                          onClick={() => removeLearnedPropertyAlias(aliasKey)}
                          className={`ml-auto px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                            isDark
                              ? 'border-gray-600 text-gray-300 hover:bg-gray-700/70'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                          title="Supprimer cet alias"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {unresolvedPropertyDetections.length > 0 && (
            <div className={`border rounded-xl p-3 ${isDark ? 'bg-amber-900/15 border-amber-700/60' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className={`text-sm font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                    🏷️ Logements détectés à valider ({unresolvedPropertyDetections.length})
                  </div>
                  <div className={`text-[11px] mt-0.5 ${isDark ? 'text-amber-300/80' : 'text-amber-700/80'}`}>
                    Valide un rattachement vers un logement existant, ou refuse ce libellé pour ne plus proposer de création.
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {unresolvedPropertyDetections.map((detection) => {
                  const suggestedId = detection.bestCandidate.property?.id;
                  const selectedId = manualPropertySelection[detection.normalized] ?? suggestedId ?? 0;
                  const hasStrongSuggestion = !!detection.bestCandidate.property && detection.bestCandidate.score >= 28;

                  return (
                    <div
                      key={detection.normalized}
                      className={`rounded-lg border px-3 py-2 ${isDark ? 'border-amber-800/70 bg-gray-900/20' : 'border-amber-200 bg-white'}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                          {detection.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {detection.count} email{detection.count > 1 ? 's' : ''}
                        </span>
                        {detection.isRejected && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-rose-900/40 text-rose-300 border border-rose-700/60' : 'bg-rose-100 text-rose-700 border border-rose-300'}`}>
                            refusé manuellement
                          </span>
                        )}
                        {hasStrongSuggestion && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-violet-900/35 text-violet-300 border border-violet-700/60' : 'bg-violet-100 text-violet-700 border border-violet-300'}`}>
                            suggestion: {detection.bestCandidate.property?.name} ({detection.bestCandidate.score}%)
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedId}
                          onChange={(event) => {
                            const value = Number.parseInt(event.target.value, 10);
                            setManualPropertySelection((prev) => ({
                              ...prev,
                              [detection.normalized]: Number.isFinite(value) ? value : 0,
                            }));
                          }}
                          className={`min-w-[220px] text-xs rounded-md border px-2 py-1.5 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}
                        >
                          <option value={0}>Choisir un logement…</option>
                          {availableProperties.map((property) => (
                            <option key={property.id} value={property.id}>{property.name}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={selectedId <= 0}
                          onClick={() => validateDetectedPropertyLabel(detection.normalized, suggestedId)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDark
                              ? 'border-emerald-600 text-emerald-300 hover:bg-emerald-900/35'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          ✅ Valider ce rattachement
                        </button>

                        {detection.isRejected ? (
                          <button
                            type="button"
                            onClick={() => restoreRejectedPropertyLabel(detection.label)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                              isDark
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700/70'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            ↩️ Réactiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => rejectDetectedPropertyLabel(detection.label)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                              isDark
                                ? 'border-rose-700 text-rose-300 hover:bg-rose-900/35'
                                : 'border-rose-300 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            ⛔ Refuser ce libellé
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const queue = [analyzeAirbnbTitle(detection.label)];
                            setPropertyQueue(queue.slice(1));
                            setCurrentWizard(queue[0]);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                            isDark
                              ? 'border-violet-600 text-violet-300 hover:bg-violet-900/35'
                              : 'border-violet-300 text-violet-700 hover:bg-violet-100'
                          }`}
                        >
                          🏠 Créer nouvelle propriété
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              {(() => {
                const actionableCount =
                  importSummary.created +
                  importSummary.cancelled +
                  importSummary.reviewsImported +
                  importSummary.payoutsSaved;
                const successCount = Math.max(0, imported.length - importSummary.skipped);
                const successRate = imported.length > 0
                  ? Math.round((successCount / imported.length) * 100)
                  : 0;

                return (
                  <div className={`text-xs rounded-lg px-3 py-2 border ${isDark ? 'bg-green-900/40 border-green-800 text-green-200' : 'bg-white/70 border-green-200 text-green-800'}`}>
                    <span className="font-semibold">✨ Synthèse rapide :</span>{' '}
                    {successCount}/{imported.length} email{imported.length > 1 ? 's' : ''} exploité{successCount > 1 ? 's' : ''} ({successRate}%) · {actionableCount} action{actionableCount > 1 ? 's' : ''} appliquée{actionableCount > 1 ? 's' : ''} · {importSummary.skipped} ignoré{importSummary.skipped > 1 ? 's' : ''}
                  </div>
                );
              })()}
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
                {importSummary.rescuedAggressive > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-fuchsia-900/60 text-fuchsia-200' : 'bg-fuchsia-100 text-fuchsia-700'}`}>
                    🧠 {importSummary.rescuedAggressive} rattachement{importSummary.rescuedAggressive > 1 ? 's' : ''} expert sauvé{importSummary.rescuedAggressive > 1 ? 's' : ''}
                  </span>
                )}
                {importSummary.rescuedSingleProperty > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-900/60 text-orange-200' : 'bg-orange-100 text-orange-700'}`}>
                    🏡 {importSummary.rescuedSingleProperty} rattachement{importSummary.rescuedSingleProperty > 1 ? 's' : ''} forcé{importSummary.rescuedSingleProperty > 1 ? 's' : ''} (mono-logement)
                  </span>
                )}
</div>
</div>
          )}          {/* ── Nouveaux logements en attente de configuration ── */}

          {importPerformance && (
            <div className={`border rounded-xl p-4 ${isDark ? 'bg-fuchsia-900/15 border-fuchsia-700/60' : 'bg-fuchsia-50 border-fuchsia-200'}`}>
              {(() => {
                const successTone = importPerformance.successLevel === 'excellent'
                  ? (isDark ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-700')
                  : importPerformance.successLevel === 'warning'
                    ? (isDark ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-700')
                    : (isDark ? 'bg-red-900/70 text-red-200' : 'bg-red-100 text-red-700');
                const successStatusLabel = importPerformance.successLevel === 'excellent'
                  ? '🟢 Excellent'
                  : importPerformance.successLevel === 'warning'
                    ? '🟠 À surveiller'
                    : '🔴 Critique';

                const rescueTone = importPerformance.rescueLevel === 'low'
                  ? (isDark ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-700')
                  : importPerformance.rescueLevel === 'medium'
                    ? (isDark ? 'bg-fuchsia-800 text-fuchsia-200' : 'bg-fuchsia-100 text-fuchsia-700')
                    : (isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-100 text-orange-700');

                return (
                  <>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className={`text-sm font-semibold ${isDark ? 'text-fuchsia-200' : 'text-fuchsia-800'}`}>
                    📈 Performance import (session)
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-fuchsia-300/90' : 'text-fuchsia-700/90'}`}>
                    {importPerformance.successCount}/{importPerformance.processed} résolu{importPerformance.successCount > 1 ? 's' : ''} · {importPerformance.successRate}% de réussite
                  </div>
                </div>
                <div className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                  expertModeAggressive
                    ? (isDark ? 'bg-fuchsia-800/60 text-fuchsia-100' : 'bg-fuchsia-100 text-fuchsia-700')
                    : (isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600')
                }`}>
                  Mode expert {expertModeAggressive ? 'ON' : 'OFF'}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-medium ${successTone}`}>
                  ✅ Taux de réussite: {importPerformance.successRate}%
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${successTone}`}>
                  {successStatusLabel}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${rescueTone}`}>
                  🧠 Sauvetage expert: {importPerformance.rescueRate}% ({importPerformance.rescuedTotal})
                </span>
                {importPerformance.aggressive > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-purple-800 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                    ⚙️ Match agressif: {importPerformance.aggressive}
                  </span>
                )}
                {importPerformance.single > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-orange-800 text-orange-200' : 'bg-orange-100 text-orange-700'}`}>
                    🏡 Force mono-logement: {importPerformance.single}
                  </span>
                )}
                {importPerformance.noPropertySkips > 0 && (
                  <span className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-900/70 text-red-200' : 'bg-red-100 text-red-700'}`}>
                    ⛔ Non résolus (logement): {importPerformance.noPropertySkips}
                  </span>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          )}

          {importTrace.length > 0 && (
            <div className={`border rounded-xl ${isDark ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}>
              <div className={`px-4 py-3 border-b space-y-2 ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">🧾 Trace d&apos;import ({importTrace.length})</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'}`}>
                    ✅ {importTraceStats.success}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                    ⏭️ {importTraceStats.skipped}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700'}`}>
                    ❌ {importTraceStats.error}
                  </span>
                </div>

                {importTraceTopErrorReasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {importTraceTopErrorReasons.map(([reason, count]) => (
                      <span
                        key={reason}
                        className={`px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-red-900/30 text-red-200' : 'bg-red-50 text-red-700 border border-red-100'}`}
                      >
                        {formatImportTraceReasonLabel(reason)} · {count}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={traceStatusFilter}
                    onChange={(event) => setTraceStatusFilter(event.target.value as 'all' | ImportTraceStatus)}
                    className={`text-[11px] rounded-md border px-2 py-1 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="success">Succès</option>
                    <option value="skipped">Ignorés</option>
                    <option value="error">Erreurs</option>
                  </select>

                  <input
                    type="text"
                    value={traceSearch}
                    onChange={(event) => setTraceSearch(event.target.value)}
                    placeholder="Rechercher (message, action, raison, voyageur...)"
                    className={`min-w-[260px] flex-1 text-[11px] rounded-md border px-2 py-1 ${isDark ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder:text-gray-500' : 'bg-white border-gray-300 text-gray-700 placeholder:text-gray-400'}`}
                  />

                  {(traceStatusFilter !== 'all' || traceSearch.trim() !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setTraceStatusFilter('all');
                        setTraceSearch('');
                      }}
                      className={`text-[11px] px-2 py-1 rounded-md border font-medium ${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-56 overflow-auto text-[11px]">
                {filteredImportTrace.length === 0 && (
                  <div className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Aucun élément ne correspond aux filtres actuels.
                  </div>
                )}
                {filteredImportTrace.slice().reverse().map((row, idx) => (
                  <div key={`${row.messageId}-${idx}`} className={`px-4 py-2 border-b last:border-b-0 ${isDark ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-700'}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded ${row.status === 'success'
                        ? (isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700')
                        : row.status === 'skipped'
                        ? (isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700')
                        : (isDark ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-700')
                      }`}>{formatImportTraceStatusLabel(row.status)}</span>
                      <span className="font-medium">{formatImportTraceActionLabel(row.action)}</span>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{bookingTypeLabel[row.bookingType]?.label || row.bookingType}</span>
                      <span>{row.guestName}</span>
                      <span className={`ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{fmt(row.receivedAt)}</span>
                    </div>
                    {row.reason && (
                      <div className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        raison: {formatImportTraceReasonLabel(row.reason)}
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
                    ? findMatchingProperty(booking.propertyName, availableProperties)
                    : undefined;
                  const bestCandidate = !matchedProperty && booking.propertyName
                    ? findBestPropertyCandidate(booking.propertyName, availableProperties)
                    : { property: undefined, score: 0, ambiguous: false, secondScore: 0 };
                  const overridePropertyId = propertyOverrides[booking.messageId];
                  const overrideProperty = overridePropertyId
                    ? availableProperties.find((p) => p.id === overridePropertyId)
                    : undefined;
                  const unmatchedLabelCount = booking.propertyName
                    ? (unmatchedLabelCounts[normalizeForMatch(booking.propertyName)] || 0)
                    : 0;
                  const isRejectedPropertyLabel = booking.propertyName
                    ? rejectedPropertySet.has(normalizeForMatch(booking.propertyName))
                    : false;
                  const showUnmatchedPropertyWarning =
                    booking.bookingType !== 'cancelled' &&
                    booking.bookingType !== 'payout' &&
                    availableProperties.length > 0 &&
                    !!booking.propertyName &&
                    !matchedProperty &&
                    !isRejectedPropertyLabel;
                  const propertyWarningPattern = /logement introuvable|property_not_found|missing_property/i;
                  const rawWarnings = booking.warnings || [];
                  const hasNightsRecomputed = rawWarnings.includes('nights_recomputed_from_dates');
                  const hasDateRangeInference = rawWarnings.includes('date_range_inferred_precisely_from_subject') || rawWarnings.includes('date_range_inferred_from_subject');
                  const displayWarnings = rawWarnings
                    .filter((warning) => {
                    if (!propertyWarningPattern.test(warning)) return true;
                    return !showUnmatchedPropertyWarning;
                    })
                    // Quand une plage de dates complète est déduite, le warning "checkout inferé depuis nights"
                    // devient redondant visuellement pour l'utilisateur.
                    .filter((warning) => !(warning === 'checkout_inferred_from_nights' && hasDateRangeInference))
                    // Déduplication sur le libellé formaté pour éviter les répétitions de tags techniques.
                    .filter((warning, index, list) => {
                      const label = formatWarningLabel(warning);
                      return list.findIndex((candidate) => formatWarningLabel(candidate) === label) === index;
                    });
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
                              {hasNightsRecomputed && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(booking.messageId)}
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${isDark ? 'bg-cyan-900/50 text-cyan-200 border border-cyan-700/60 hover:bg-cyan-900/70' : 'bg-cyan-100 text-cyan-700 border border-cyan-300 hover:bg-cyan-200'}`}
                                  title={isExp ? 'Masquer les détails' : 'Voir les détails'}
                                >
                                  🛠 Durée corrigée
                                </button>
                              )}
                              <span className={`text-xs font-medium ml-auto ${confidenceColor(booking.confidence)}`}>
                                {booking.confidence}% confiance
                              </span>
                            </div>

                            <div className={`flex flex-wrap gap-4 mt-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                              {/* Dates — masquées pour les versements (pas de dates séjour) */}
                                                            {displayWarnings.length > 0 && (
                                <div className={`w-full mt-3 p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${isDark ? 'border-amber-700/30 bg-amber-900/10 text-amber-300' : 'border-amber-200/60 bg-amber-50 text-amber-700'}`}>
                                  {displayWarnings.map((w, idx) => (
                                    (() => {
                                      const isContextInferredWarning = w.startsWith('property_inferred_from_context:');
                                      const confidence = isContextInferredWarning ? getContextInferenceConfidence(booking) : undefined;
                                      const warningLabel = formatWarningLabel(w);

                                      const confidenceClass = confidence?.level === 'high'
                                        ? (isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60' : 'bg-emerald-100 text-emerald-700 border border-emerald-300')
                                        : confidence?.level === 'medium'
                                        ? (isDark ? 'bg-amber-900/40 text-amber-300 border border-amber-700/60' : 'bg-amber-100 text-amber-700 border border-amber-300')
                                        : (isDark ? 'bg-rose-900/40 text-rose-300 border border-rose-700/60' : 'bg-rose-100 text-rose-700 border border-rose-300');

                                      return (
                                        <div key={idx} className="flex flex-row items-start gap-1.5 leading-snug">
                                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-[1.5px] opacity-80" />
                                          <div className="flex items-center gap-1.5 flex-wrap mt-[1px]">
                                            <span className="font-medium">{warningLabel}</span>
                                            {confidence && (
                                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${confidenceClass}`}>
                                                confiance {confidence.label}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })()
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
                              {booking.subject?.trim() && (
                                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  <Home className="w-3.5 h-3.5" />
                                  {booking.subject.trim().slice(0, 40)}
                                </span>
                              )}
                            </div>

                            <div className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              Email reçu le {fmt(booking.receivedAt)} • {booking.subject.slice(0, 80)}
                            </div>
                            {isRejectedPropertyLabel && (
                              <div className={`mt-1 text-xs rounded-lg border px-2.5 py-2 flex items-center gap-1.5 ${
                                isDark ? 'text-rose-300 border-rose-800/50 bg-rose-900/20' : 'text-rose-700 border-rose-200 bg-rose-50'
                              }`}>
                                <span>⛔</span>
                                <span>
                                  Libellé logement ignoré manuellement (non proposé comme nouvelle propriété).
                                </span>
                              </div>
                            )}
                            {/* ── Avertissement : aucun logement correspondant (pas pour versements) ── */}
                            {showUnmatchedPropertyWarning && (
                              <div className={`mt-1 text-xs rounded-lg border px-2.5 py-2 flex flex-col gap-2 ${
                                isDark ? 'text-orange-300 border-orange-800/50 bg-orange-900/20' : 'text-orange-700 border-orange-200 bg-orange-50'
                              }`}>
                                <div className="flex items-start gap-1.5">
                                  <span>⚠️</span>
                                  <span>
                                    Logement détecté &quot;{(booking.subject || '').trim().slice(0, 40)}&quot; non rattaché automatiquement.
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
                                        onClick={() => {
                                          setPropertyOverrides((prev) => ({ ...prev, [booking.messageId]: bestCandidate.property!.id }));
                                          learnPropertyAlias(booking.propertyName, bestCandidate.property!.name);
                                        }}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                          isDark
                                            ? 'border-violet-600 text-violet-300 hover:bg-violet-900/40'
                                            : 'border-violet-300 text-violet-700 hover:bg-violet-100'
                                        }`}
                                      >
                                        Utiliser cette suggestion
                                      </button>
                                    )}

                                    {unmatchedLabelCount > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => applySuggestionToSimilarBookings(booking, bestCandidate.property!.id)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                          isDark
                                            ? 'border-indigo-600 text-indigo-300 hover:bg-indigo-900/40'
                                            : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                      >
                                        Appliquer aux {unmatchedLabelCount} similaires
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
                            {booking.bookingType !== 'cancelled' && booking.bookingType !== 'payout' && booking.bookingType !== 'review' && availableProperties.length === 0 && (
                              <div className={`mt-1 text-xs flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                                <span>⚠️</span>
                                <span>Aucun logement configuré pour l’instant — un logement par défaut sera créé à l’import</span>
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
          key={`${currentWizard.rawName}-${propertyQueue.length}`}
          detected={currentWizard}
          onClose={advanceQueue}
          onCreated={async (name, payload: WizardPropertyPayload) => {
            const created = await createPropertyInDb({
              name: payload.name,
              description: payload.description,
              address: payload.address,
              city: payload.city,
              country: payload.country,
              bedrooms: payload.bedrooms,
              bathrooms: payload.bathrooms,
              maxGuests: payload.maxGuests,
              price: payload.price,
            });

            if (!created) {
              toast.error('Le logement détecté n’a pas pu être créé en DB. Corrige les champs puis réessaie.');
              return false;
            }

            setImported(prev => [...prev, `__property__${created.name || name}`]);
            toast.success(`Logement "${created.name || name}" ajouté en base.`);
            advanceQueue();

            // Demande UX: après la 1ère annonce créée, relancer le wizard
            // même si la file est vide, pour enchaîner rapidement une 2e création.
            if (!hasAutoRelaunchedWizardAfterFirstCreate && propertyQueue.length === 0) {
              setHasAutoRelaunchedWizardAfterFirstCreate(true);
              setCurrentWizard(analyzeAirbnbTitle('Mon logement'));
            }

            return true;
          }}
        />
      )}
    </div>
    </>
  );
}
