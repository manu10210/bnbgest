'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Download, Eye, Send, Copy, Printer,
  FileText, Building2, User, Calendar, Euro, Hash,
  CheckCircle, Clock, XCircle, AlertCircle, Search,
  ChevronDown, ChevronUp, Edit3, Save, Sparkles, X,
  ArrowLeft, Package, SortAsc, SortDesc, Upload,
  Zap, Moon, Sun, Star, Coffee, Waves, Car, Wifi,
  TrendingUp, BarChart2, Mail, Tag, Percent, Receipt,
  History, ListChecks, FileDown, PenLine, Bell,
  Users, Layout, Layers, RefreshCw, DollarSign,
  BookTemplate, Repeat, CreditCard, Target, ChevronRight,
  SplitSquareHorizontal, Bookmark, BadgePercent,
  PieChart, TrendingDown, CalendarClock, Link2,
  ArrowUpRight, ArrowDownRight, Filter, RotateCcw,
  Hash as HashIcon, FolderOpen, Flame, Lock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type InvoiceDocType = 'invoice' | 'quote';

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // %
  discount: number; // %
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  documentType: InvoiceDocType; // 'invoice' = Facture | 'quote' = Devis
  // Emetteur
  issuerName: string;
  issuerAddress: string;
  issuerCity: string;
  issuerZip: string;
  issuerCountry: string;
  issuerEmail: string;
  issuerPhone: string;
  issuerSiret?: string;
  issuerVat?: string;
  issuerLogo?: string;
  // Client
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientZip: string;
  clientCountry: string;
  clientEmail: string;
  clientPhone?: string;
  clientRef?: string;
  // Liens optionnels
  propertyId?: number;
  bookingId?: number;
  // Dates
  issueDate: string;
  dueDate: string;
  // Lignes
  lines: InvoiceLine[];
  // Remise globale (%)
  globalDiscount: number;
  // Notes
  notes: string;
  internalNotes?: string;   // ← mémo interne (non visible sur PDF)
  paymentTerms: string;
  // Couleur accent
  accentColor: string;
  // Mise en page PDF
  layout: 'classic' | 'modern' | 'minimal';
  // Signature électronique
  signatureName?: string;
  signatureDate?: string;
  // Paiement partiel
  partialPayments: { amount: number; date: string; note?: string }[];
  // Récurrence
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  // Tags libres
  tags?: string[];
  // Historique des statuts
  statusHistory: { status: InvoiceStatus; date: string; note?: string }[];
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY        = 'bnbgest_invoices';
const ISSUER_PROFILE_KEY = 'bnbgest_issuer_profile';
const TEMPLATES_KEY      = 'bnbgest_invoice_templates';
const APP_STATE_KEY_INVOICES = 'invoice_editor_invoices';
const APP_STATE_KEY_TEMPLATES = 'invoice_editor_templates';
const APP_STATE_KEY_ISSUER_PROFILE = 'invoice_editor_issuer_profile';

function loadInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveInvoices(invoices: Invoice[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

type IssuerProfile = Pick<Invoice,
  'issuerName'|'issuerAddress'|'issuerCity'|'issuerZip'|'issuerCountry'|
  'issuerEmail'|'issuerPhone'|'issuerSiret'|'issuerVat'|'issuerLogo'>;

function loadIssuerProfile(): Partial<IssuerProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const s = localStorage.getItem(ISSUER_PROFILE_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

function saveIssuerProfile(inv: Invoice) {
  if (typeof window === 'undefined') return;
  const profile: IssuerProfile = {
    issuerName: inv.issuerName, issuerAddress: inv.issuerAddress,
    issuerCity: inv.issuerCity, issuerZip: inv.issuerZip,
    issuerCountry: inv.issuerCountry, issuerEmail: inv.issuerEmail,
    issuerPhone: inv.issuerPhone, issuerSiret: inv.issuerSiret,
    issuerVat: inv.issuerVat, issuerLogo: inv.issuerLogo,
  };
  localStorage.setItem(ISSUER_PROFILE_KEY, JSON.stringify(profile));
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  lines: InvoiceLine[];
  paymentTerms: string;
  notes: string;
  accentColor: string;
  layout: 'classic' | 'modern' | 'minimal';
  globalDiscount: number;
}

function loadTemplates(): InvoiceTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem(TEMPLATES_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveTemplates(templates: InvoiceTemplate[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

async function loadStateFromDb<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/app-state?key=${encodeURIComponent(key)}`, {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return (payload?.value ?? null) as T | null;
  } catch {
    return null;
  }
}

async function saveStateToDb<T>(key: string, value: T) {
  try {
    await fetch('/api/app-state', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch {
    // silent fallback to local only
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Retourne le libellé du document en majuscules : "FACTURE" ou "DEVIS" */
function docLabel(inv: { documentType?: InvoiceDocType }): string {
  return (inv.documentType ?? 'invoice') === 'quote' ? 'DEVIS' : 'FACTURE';
}
/** Libellé capitalisé : "Facture" ou "Devis" */
function docLabelCap(inv: { documentType?: InvoiceDocType }): string {
  return (inv.documentType ?? 'invoice') === 'quote' ? 'Devis' : 'Facture';
}

function newLine(): InvoiceLine {
  return { id: `line_${Date.now()}_${Math.random()}`, description: '', quantity: 1, unitPrice: 0, vatRate: 20, discount: 0 };
}

function nextInvoiceNumber(invoices: Invoice[], docType: InvoiceDocType = 'invoice'): string {
  const year = new Date().getFullYear();
  const prefix = docType === 'quote' ? 'DEV' : 'FA';
  const max = invoices
    .map(i => parseInt(i.number.replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

function emptyInvoice(invoices: Invoice[]): Invoice {
  const profile = loadIssuerProfile();
  return {
    id: `inv_${Date.now()}`,
    number: nextInvoiceNumber(invoices),
    status: 'draft',
    documentType: 'invoice',
    issuerName:    profile.issuerName    ?? 'BNBGest',
    issuerAddress: profile.issuerAddress ?? '',
    issuerCity:    profile.issuerCity    ?? '',
    issuerZip:     profile.issuerZip     ?? '',
    issuerCountry: profile.issuerCountry ?? 'France',
    issuerEmail:   profile.issuerEmail   ?? '',
    issuerPhone:   profile.issuerPhone   ?? '',
    issuerSiret:   profile.issuerSiret   ?? '',
    issuerVat:     profile.issuerVat     ?? '',
    issuerLogo:    profile.issuerLogo    ?? '',
    clientName: '',
    clientAddress: '',
    clientCity: '',
    clientZip: '',
    clientCountry: 'France',
    clientEmail: '',
    clientPhone: '',
    clientRef: '',
    propertyId: undefined,
    bookingId: undefined,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    lines: [newLine()],
    globalDiscount: 0,
    notes: '',
    paymentTerms: 'Paiement à 30 jours',
    accentColor: '#6366f1',
    layout: 'classic' as const,
    signatureName: '',
    signatureDate: '',
    partialPayments: [],
    isRecurring: false,
    recurringFrequency: undefined,
    tags: [],
    statusHistory: [{ status: 'draft', date: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function calcLine(line: InvoiceLine) {
  const base = line.quantity * line.unitPrice * (1 - line.discount / 100);
  const vat  = base * (line.vatRate / 100);
  return { ht: base, vat, ttc: base + vat };
}

function calcTotals(lines: InvoiceLine[]) {
  return lines.reduce(
    (acc, l) => {
      const c = calcLine(l);
      return { ht: acc.ht + c.ht, vat: acc.vat + c.vat, ttc: acc.ttc + c.ttc };
    },
    { ht: 0, vat: 0, ttc: 0 }
  );
}

function calcVatBreakdown(lines: InvoiceLine[]): { rate: number; base: number; vat: number }[] {
  const map: Record<number, { base: number; vat: number }> = {};
  lines.forEach(l => {
    const { ht, vat } = calcLine(l);
    if (!map[l.vatRate]) map[l.vatRate] = { base: 0, vat: 0 };
    map[l.vatRate].base += ht;
    map[l.vatRate].vat  += vat;
  });
  return Object.entries(map)
    .map(([rate, v]) => ({ rate: Number(rate), ...v }))
    .sort((a, b) => a.rate - b.rate);
}

function calcTotalsWithDiscount(lines: InvoiceLine[], globalDiscount = 0) {
  const raw = calcTotals(lines);
  const factor = 1 - Math.min(Math.max(globalDiscount, 0), 100) / 100;
  return {
    ht:       raw.ht  * factor,
    vat:      raw.vat * factor,
    ttc:      raw.ttc * factor,
    discount: raw.ttc * (1 - factor),
    raw,
  };
}

// Completion score (0-100) — how "filled" the invoice is
function calcCompletion(inv: Invoice): number {
  const checks = [
    !!inv.issuerName, !!inv.issuerEmail, !!inv.issuerAddress,
    !!inv.clientName, !!inv.clientEmail,
    inv.lines.length > 0 && inv.lines.some(l => !!l.description && l.unitPrice > 0),
    !!inv.dueDate, !!inv.paymentTerms,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// Reminders — sent for >7 days without payment
function needsReminder(inv: Invoice): boolean {
  if (inv.status !== 'sent') return false;
  const lastSent = inv.statusHistory?.filter(h => h.status === 'sent').pop();
  if (!lastSent) return false;
  const daysSince = Math.round((Date.now() - new Date(lastSent.date).getTime()) / 86400000);
  return daysSince >= 7;
}

// Balance per client across all invoices
function calcClientBalance(invoices: Invoice[]): { name: string; email: string; due: number; paid: number }[] {
  const map: Record<string, { name: string; email: string; due: number; paid: number }> = {};
  invoices.forEach(inv => {
    const key = inv.clientEmail || inv.clientName || 'unknown';
    if (!map[key]) map[key] = { name: inv.clientName, email: inv.clientEmail, due: 0, paid: 0 };
    const t = calcTotalsWithDiscount(inv.lines, inv.globalDiscount);
    if (inv.status === 'paid') map[key].paid += t.ttc;
    else if (['sent','overdue'].includes(inv.status)) map[key].due += t.ttc;
  });
  return Object.values(map).filter(c => c.due > 0 || c.paid > 0).sort((a, b) => b.due - a.due);
}

// Partial payment helpers
function calcAmountPaid(inv: Invoice): number {
  return (inv.partialPayments ?? []).reduce((s, p) => s + p.amount, 0);
}

function calcAmountDue(inv: Invoice): number {
  const total = calcTotalsWithDiscount(inv.lines, inv.globalDiscount).ttc;
  return Math.max(0, total - calcAmountPaid(inv));
}

// Conversion rate: drafts that became paid / all drafts (ever)
function calcConversionRate(invoices: Invoice[]): number {
  const total = invoices.length;
  if (total === 0) return 0;
  const paid = invoices.filter(i => i.status === 'paid').length;
  return Math.round((paid / total) * 100);
}

// Unique client suggestions from invoices
function getClientSuggestions(invoices: Invoice[]): { name: string; email: string; address: string; city: string; zip: string; country: string; phone: string }[] {
  const seen = new Set<string>();
  return invoices
    .filter(i => i.clientName && !seen.has(i.clientEmail || i.clientName) && seen.add(i.clientEmail || i.clientName))
    .map(i => ({
      name: i.clientName, email: i.clientEmail,
      address: i.clientAddress, city: i.clientCity,
      zip: i.clientZip, country: i.clientCountry,
      phone: i.clientPhone ?? '',
    }));
}

// Monthly revenue trend: compare current month vs last month
function calcMonthlyTrend(invoices: Invoice[]): { current: number; previous: number; percent: number } {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear  = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastYear  = thisMonth === 0 ? thisYear - 1 : thisYear;

  const current  = invoices.filter(i => i.status === 'paid').reduce((s, i) => {
    const d = new Date(i.issueDate);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear ? s + calcTotals(i.lines).ttc : s;
  }, 0);
  const previous = invoices.filter(i => i.status === 'paid').reduce((s, i) => {
    const d = new Date(i.issueDate);
    return d.getMonth() === lastMonth && d.getFullYear() === lastYear ? s + calcTotals(i.lines).ttc : s;
  }, 0);
  const percent = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);
  return { current, previous, percent };
}

// Status distribution for pie-like chart
function calcStatusDistribution(invoices: Invoice[]): { status: InvoiceStatus; count: number; amount: number }[] {
  const map: Partial<Record<InvoiceStatus, { count: number; amount: number }>> = {};
  invoices.forEach(i => {
    if (!map[i.status]) map[i.status] = { count: 0, amount: 0 };
    map[i.status]!.count++;
    map[i.status]!.amount += calcTotalsWithDiscount(i.lines, i.globalDiscount).ttc;
  });
  return (Object.entries(map) as [InvoiceStatus, { count: number; amount: number }][])
    .map(([status, v]) => ({ status, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

// Top 5 clients by revenue
function calcTopClients(invoices: Invoice[]): { name: string; email: string; revenue: number; count: number }[] {
  const map: Record<string, { name: string; email: string; revenue: number; count: number }> = {};
  invoices.filter(i => i.status === 'paid').forEach(i => {
    const key = i.clientEmail || i.clientName || 'unknown';
    if (!map[key]) map[key] = { name: i.clientName || '—', email: i.clientEmail, revenue: 0, count: 0 };
    map[key].revenue += calcTotalsWithDiscount(i.lines, i.globalDiscount).ttc;
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

// Period filter helper
type PeriodFilter = 'all' | 'month' | 'quarter' | 'year';
function filterByPeriod(invoices: Invoice[], period: PeriodFilter): Invoice[] {
  if (period === 'all') return invoices;
  const now = new Date();
  return invoices.filter(i => {
    const d = new Date(i.issueDate);
    if (period === 'month')   return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
    }
    if (period === 'year')    return d.getFullYear() === now.getFullYear();
    return true;
  });
}

const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_META: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Brouillon', color: 'text-gray-400 bg-gray-400/10',    icon: Edit3       },
  sent:      { label: 'Envoy\u00e9e', color: 'text-blue-400 bg-blue-400/10', icon: Send        },
  paid:      { label: 'Pay\u00e9e',   color: 'text-emerald-400 bg-emerald-400/10', icon: CheckCircle },
  overdue:   { label: 'En retard', color: 'text-rose-400 bg-rose-400/10',    icon: AlertCircle },
  cancelled: { label: 'Annul\u00e9e', color: 'text-gray-500 bg-gray-500/10', icon: XCircle     },
};

const ACCENT_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#06b6d4'];

// ─── Preset line templates ────────────────────────────────────────────────────

const LINE_PRESETS: { label: string; icon: React.ElementType; line: Partial<InvoiceLine> }[] = [
  { label: 'Nuit(s)',         icon: Moon,   line: { description: 'Location — nuit(s)', quantity: 1, unitPrice: 80,  vatRate: 0,  discount: 0 } },
  { label: 'Ménage',          icon: Sparkles,line: { description: 'Forfait ménage',      quantity: 1, unitPrice: 50,  vatRate: 20, discount: 0 } },
  { label: 'Taxe séjour',     icon: Euro,   line: { description: 'Taxe de séjour',      quantity: 1, unitPrice: 2.5, vatRate: 0,  discount: 0 } },
  { label: 'Caution',         icon: Star,   line: { description: 'Dépôt de garantie',   quantity: 1, unitPrice: 300, vatRate: 0,  discount: 0 } },
  { label: 'Petit-déjeuner',  icon: Coffee, line: { description: 'Petit-déjeuner',      quantity: 1, unitPrice: 12,  vatRate: 10, discount: 0 } },
  { label: 'Piscine/Spa',     icon: Waves,  line: { description: 'Accès piscine / spa', quantity: 1, unitPrice: 25,  vatRate: 20, discount: 0 } },
  { label: 'Parking',         icon: Car,    line: { description: 'Parking',             quantity: 1, unitPrice: 10,  vatRate: 20, discount: 0 } },
  { label: 'Wi-Fi premium',   icon: Wifi,   line: { description: 'Wi-Fi haut débit',    quantity: 1, unitPrice: 5,   vatRate: 20, discount: 0 } },
];

// ─── Due-date helpers ─────────────────────────────────────────────────────────

function dueDaysLeft(dueDate: string): number {
  const due  = new Date(dueDate).setHours(0,0,0,0);
  const now  = new Date().setHours(0,0,0,0);
  return Math.round((due - now) / 86400000);
}

function DueBadge({ inv }: { inv: Invoice }) {
  if (inv.status === 'paid' || inv.status === 'cancelled') return null;
  const days = dueDaysLeft(inv.dueDate);
  if (days > 7)  return null;
  if (days < 0)  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">{Math.abs(days)}j de retard</span>;
  if (days === 0) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Échéance aujourd'hui</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Éch. dans {days}j</span>;
}

// ─── Sort types ───────────────────────────────────────────────────────────────
type SortField = 'date' | 'amount' | 'status' | 'client';
type SortDir   = 'asc' | 'desc';

// ─── PreviewModal ─────────────────────────────────────────────────────────────

function PreviewModal({ invoice, onClose, properties, bookings }: {
  invoice: Invoice;
  onClose: () => void;
  properties: { id: number; name: string }[];
  bookings: { id: number; checkIn: string; checkOut: string }[];
}) {
  const totals      = calcTotalsWithDiscount(invoice.lines, invoice.globalDiscount);
  const vatBreakdown = calcVatBreakdown(invoice.lines);
  const prop        = properties.find(p => p.id === invoice.propertyId);
  const booking     = bookings.find(b => b.id === invoice.bookingId);
  const multiVat    = vatBreakdown.length > 1;
  const layout      = invoice.layout ?? 'classic';
  const isCancelled = invoice.status === 'cancelled';
  const isDuplicate = false; // future: detect re-sent

  const handlePrint = () => {
    const invoiceNode = document.getElementById('invoice-print');
    if (!invoiceNode) {
      console.error('[InvoiceEditor] PDF print aborted: #invoice-print not found.');
      return;
    }

    const styleAndLinks = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join('\n');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      console.error('[InvoiceEditor] PDF print aborted: iframe document unavailable.');
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${docLabel(invoice)} ${invoice.number} - BNBGest</title>
          ${styleAndLinks}
          <style>
            @page { size: A4; margin: 12mm; }
            html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #invoice-print { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
          </style>
        </head>
        <body>
          ${invoiceNode.outerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    const cleanup = () => {
      window.setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 250);
    };

    iframe.onload = () => {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        console.error('[InvoiceEditor] PDF print aborted: iframe window unavailable.');
        return;
      }

      const afterPrintHandler = () => {
        frameWindow.removeEventListener('afterprint', afterPrintHandler);
        cleanup();
      };

      frameWindow.addEventListener('afterprint', afterPrintHandler);

      window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
        window.setTimeout(cleanup, 3000);
      }, 120);
    };
  };

  // Layout-specific styles
  const layoutStyles = {
    classic: { headerBg: 'white', stripeHeight: 'h-2', accentBorder: true },
    modern:  { headerBg: invoice.accentColor, stripeHeight: 'h-24', accentBorder: false },
    minimal: { headerBg: 'white', stripeHeight: 'h-0', accentBorder: false },
  }[layout];

  return (
    <>
      {/* Print-only CSS (removed because iframe handles isolation) */}
      <div id="invoice-print-root" className="fixed inset-0 z-[500] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 py-8">
        <div className="w-full max-w-3xl">
        {/* Toolbar */}
        <div className="no-print flex justify-between items-center mb-4">
          <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors">
            <X className="w-4 h-4" /> Fermer
          </button>
          <div />
        </div>

        {/* A4 sheet */}
        <div id="invoice-print" className="bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden relative">

          {/* Watermark for cancelled */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 rotate-[-35deg]">
              <span className="text-[80px] font-black text-rose-500/10 tracking-widest select-none">ANNULÉE</span>
            </div>
          )}

          {/* Layout: Modern — colored header block */}
          {layout === 'modern' && (
            <div className="p-10 pb-8" style={{ background: invoice.accentColor }}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  {invoice.issuerLogo
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={invoice.issuerLogo} alt="logo" loading="lazy" className="h-12 w-auto object-contain rounded-lg bg-white/20 p-1" />
                    : <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black text-white">
                        {invoice.issuerName.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div className="text-white">
                  <div className="text-2xl font-black">{ docLabel(invoice) } {invoice.number}</div>
                    <div className="text-white/70 text-sm mt-1">{invoice.issuerName}</div>
                  </div>
                </div>
                <div className="text-right text-white">
                  <div className="text-white/80 text-sm">Date : <span className="font-bold text-white">{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</span></div>
                  <div className="text-white/80 text-sm">Éch. : <span className="font-bold text-white">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span></div>
                  <div className={`mt-2 inline-flex px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold ${invoice.status === 'draft' ? 'print:hidden' : ''}`}>
                    {STATUS_META[invoice.status].label}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Layout: Classic/Minimal — top stripe */}
          {layout !== 'modern' && <div className={`${layoutStyles.stripeHeight} w-full`} style={{ background: invoice.accentColor }} />}

          <div className="p-10">
            {/* Classic header */}
            {layout === 'classic' && (
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-start gap-5">
                  {invoice.issuerLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={invoice.issuerLogo} alt="logo" loading="lazy" className="h-14 w-auto object-contain rounded-lg" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black text-white"
                      style={{ background: invoice.accentColor }}>
                      {invoice.issuerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-3xl font-black" style={{ color: invoice.accentColor }}>{docLabel(invoice)}</div>
                    <div className="text-xl font-bold text-gray-800 mt-1">{invoice.number}</div>
                    {prop && <div className="text-sm text-gray-500 mt-1">Bien : {prop.name}</div>}
                    {booking && <div className="text-sm text-gray-500">
                      Séjour : {new Date(booking.checkIn).toLocaleDateString('fr-FR')} → {new Date(booking.checkOut).toLocaleDateString('fr-FR')}
                    </div>}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3 ${invoice.status === 'draft' ? 'print:hidden' : ''}`}
                    style={{ background: `${invoice.accentColor}18`, color: invoice.accentColor }}>
                    {STATUS_META[invoice.status].label}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Date : <span className="font-semibold text-gray-800">{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</span></div>
                    <div>Éch. : <span className="font-semibold text-gray-800">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Minimal header */}
            {layout === 'minimal' && (
              <div className="mb-10 border-b pb-6" style={{ borderColor: `${invoice.accentColor}40` }}>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: invoice.accentColor }}>{docLabelCap(invoice)}</div>
                    <div className="text-2xl font-black text-gray-900">{invoice.number}</div>
                    <div className="text-sm text-gray-500 mt-1">{invoice.issuerName}</div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{new Date(invoice.issueDate).toLocaleDateString('fr-FR')} → {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</div>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-bold ${invoice.status === 'draft' ? 'print:hidden' : ''}`} style={{ background: `${invoice.accentColor}15`, color: invoice.accentColor }}>
                      {STATUS_META[invoice.status].label}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modern/Minimal: show issuer/client after header */}
            {layout === 'modern' && (
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Émetteur</div>
                  <div className="font-bold text-gray-900">{invoice.issuerName}</div>
                  {invoice.issuerAddress && <div className="text-sm text-gray-600">{invoice.issuerAddress}</div>}
                  <div className="text-sm text-gray-600">{invoice.issuerZip} {invoice.issuerCity}</div>
                  {invoice.issuerEmail && <div className="text-sm text-gray-600 mt-1">{invoice.issuerEmail}</div>}
                  {invoice.issuerSiret && <div className="text-xs text-gray-400 mt-1">SIRET : {invoice.issuerSiret}</div>}
                </div>
                <div className="rounded-xl p-4" style={{ background: `${invoice.accentColor}08`, border: `2px solid ${invoice.accentColor}25` }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Client</div>
                  <div className="font-bold text-gray-900">{invoice.clientName || '—'}</div>
                  {invoice.clientAddress && <div className="text-sm text-gray-600">{invoice.clientAddress}</div>}
                  {invoice.clientEmail && <div className="text-sm text-gray-600 mt-1">{invoice.clientEmail}</div>}
                  {invoice.clientPhone && <div className="text-sm text-gray-600">{invoice.clientPhone}</div>}
                  {invoice.clientRef && <div className="text-xs text-gray-400 mt-1">Réf. : {invoice.clientRef}</div>}
                </div>
              </div>
            )}

            {/* Classic: issuer/client */}
            {layout === 'classic' && (
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Émetteur</div>
                  <div className="font-bold text-gray-900">{invoice.issuerName}</div>
                  {invoice.issuerAddress && <div className="text-sm text-gray-600">{invoice.issuerAddress}</div>}
                  <div className="text-sm text-gray-600">{invoice.issuerZip} {invoice.issuerCity}{invoice.issuerCountry ? `, ${invoice.issuerCountry}` : ''}</div>
                  {invoice.issuerEmail && <div className="text-sm text-gray-600 mt-1">{invoice.issuerEmail}</div>}
                  {invoice.issuerPhone && <div className="text-sm text-gray-600">{invoice.issuerPhone}</div>}
                  {invoice.issuerSiret && <div className="text-xs text-gray-400 mt-1">SIRET : {invoice.issuerSiret}</div>}
                  {invoice.issuerVat && <div className="text-xs text-gray-400">TVA : {invoice.issuerVat}</div>}
                </div>
                <div className="rounded-xl p-4 border-2" style={{ borderColor: `${invoice.accentColor}40` }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Client / Destinataire</div>
                  <div className="font-bold text-gray-900">{invoice.clientName || '—'}</div>
                  {invoice.clientAddress && <div className="text-sm text-gray-600">{invoice.clientAddress}</div>}
                  <div className="text-sm text-gray-600">{invoice.clientZip} {invoice.clientCity}{invoice.clientCountry ? `, ${invoice.clientCountry}` : ''}</div>
                  {invoice.clientEmail && <div className="text-sm text-gray-600 mt-1">{invoice.clientEmail}</div>}
                  {invoice.clientPhone && <div className="text-sm text-gray-600">{invoice.clientPhone}</div>}
                  {invoice.clientRef && <div className="text-xs text-gray-400 mt-1">Réf. : {invoice.clientRef}</div>}
                </div>
              </div>
            )}

            {/* Minimal: inline issuer+client */}
            {layout === 'minimal' && (
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Émetteur</div>
                  <div className="font-bold text-gray-900">{invoice.issuerName}</div>
                  {invoice.issuerAddress && <div className="text-sm text-gray-600">{invoice.issuerAddress}</div>}
                  <div className="text-sm text-gray-600">{invoice.issuerZip} {invoice.issuerCity}</div>
                  {invoice.issuerSiret && <div className="text-xs text-gray-400 mt-1">SIRET : {invoice.issuerSiret}</div>}
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Client</div>
                  <div className="font-bold text-gray-900">{invoice.clientName || '—'}</div>
                  {invoice.clientAddress && <div className="text-sm text-gray-600">{invoice.clientAddress}</div>}
                  {invoice.clientEmail && <div className="text-sm text-gray-600">{invoice.clientEmail}</div>}
                  {invoice.clientRef && <div className="text-xs text-gray-400">Réf. : {invoice.clientRef}</div>}
                </div>
              </div>
            )}

            {/* Lines table — shared across all layouts */}
            <table className="w-full mb-8 text-sm">
              <thead>
                <tr className="border-b-2" style={{ borderColor: invoice.accentColor }}>
                  <th className="pb-2 text-left font-bold text-gray-700">Description</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-16">Qté</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-24">P.U. HT</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-16">Rem.</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-24">HT</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-14">TVA</th>
                  <th className="pb-2 text-right font-bold text-gray-700 w-24">TTC</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => {
                  const c = calcLine(line);
                  return (
                    <tr key={line.id} className={i % 2 === 0 ? 'bg-gray-50/60' : ''}>
                      <td className="py-2.5 pr-4">{line.description || <span className="text-gray-400 italic">Sans description</span>}</td>
                      <td className="py-2.5 text-right">{line.quantity}</td>
                      <td className="py-2.5 text-right">{fmt(line.unitPrice)} €</td>
                      <td className="py-2.5 text-right">{line.discount > 0 ? `${line.discount}%` : '—'}</td>
                      <td className="py-2.5 text-right">{fmt(c.ht)} €</td>
                      <td className="py-2.5 text-right">{line.vatRate}%</td>
                      <td className="py-2.5 text-right font-semibold">{fmt(c.ttc)} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals + VAT breakdown */}
            <div className="flex justify-end mb-8">
              <div className="w-80 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total HT</span><span className="font-semibold">{fmt(totals.ht)} €</span>
                </div>
                {/* VAT breakdown if multiple rates */}
                {multiVat ? vatBreakdown.map(v => (
                  <div key={v.rate} className="flex justify-between text-sm text-gray-500">
                    <span className="pl-3">TVA {v.rate}% (base {fmt(v.base)} €)</span>
                    <span>{fmt(v.vat * (1 - (invoice.globalDiscount ?? 0)/100))} €</span>
                  </div>
                )) : (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>TVA ({vatBreakdown[0]?.rate ?? 0}%)</span>
                    <span className="font-semibold">{fmt(totals.vat)} €</span>
                  </div>
                )}
                {/* Global discount */}
                {(invoice.globalDiscount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-rose-500">
                    <span>Remise globale ({invoice.globalDiscount}%)</span>
                    <span className="font-semibold">− {fmt(totals.discount)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black border-t-2 pt-2 mt-2" style={{ borderColor: invoice.accentColor, color: invoice.accentColor }}>
                  <span>Total TTC</span><span>{fmt(totals.ttc)} €</span>
                </div>
              </div>
            </div>

            {/* Notes & payment terms */}
            {(invoice.notes || invoice.paymentTerms) && (
              <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-6">
                {invoice.paymentTerms && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Conditions de paiement</div>
                    <div className="text-sm text-gray-600">{invoice.paymentTerms}</div>
                  </div>
                )}
                {invoice.notes && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes</div>
                    <div className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Electronic signature */}
            {invoice.signatureName && (
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Signature électronique</div>
                  <div className="font-black text-xl italic" style={{ fontFamily: 'Georgia, serif', color: invoice.accentColor }}>
                    {invoice.signatureName}
                  </div>
                  {invoice.signatureDate && (
                    <div className="text-xs text-gray-400 mt-1">
                      Signé le {new Date(invoice.signatureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Paiements partiels + reste dû */}
            {(invoice.partialPayments ?? []).length > 0 && invoice.status !== 'paid' && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Paiements reçus</div>
                {invoice.partialPayments.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{new Date(p.date).toLocaleDateString('fr-FR')}{p.note ? ` — ${p.note}` : ''}</span>
                    <span className="font-semibold text-emerald-600">− {fmt(p.amount)} €</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-black mt-2 pt-2 border-t border-gray-100">
                  <span>Reste dû</span>
                  <span style={{ color: invoice.accentColor }}>{fmt(calcAmountDue(invoice))} €</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-4 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>{invoice.issuerName}{invoice.issuerSiret ? ` — SIRET ${invoice.issuerSiret}` : ''}</span>
            <span>{invoice.number} — {new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</span>
          </div>
        </div>

        {/* Bottom print action */}
        <div className="no-print mt-4 flex justify-center">
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm transition-colors shadow-lg">
            <Printer className="w-4 h-4" /> Imprimer / PDF
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

// ─── Send email modal ─────────────────────────────────────────────────────────

function SendModal({ invoice, onClose, onSent }: {
  invoice: Invoice;
  onClose: () => void;
  onSent: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setDone(true);
      setTimeout(() => { onSent(note); onClose(); }, 1200);
    }, 1500);
  };

  const totals = calcTotalsWithDiscount(invoice.lines, invoice.globalDiscount);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#13131f] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Envoyer {docLabelCap(invoice).toLowerCase() === 'devis' ? 'le devis' : 'la facture'}</p>
              <p className="text-xs text-gray-500">{invoice.number} — {fmt(totals.ttc)} €</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Destinataire</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white">
              <User className="w-3.5 h-3.5 text-gray-500" />
              {invoice.clientName || 'Client'} {invoice.clientEmail ? `<${invoice.clientEmail}>` : '(email manquant)'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Objet</label>
            <div className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-gray-300">
              {docLabelCap(invoice)} {invoice.number} — {fmt(totals.ttc)} € TTC
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Note / Message (optionnel)</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder={`Veuillez trouver ci-joint votre ${docLabelCap(invoice).toLowerCase()}…`}
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/30 resize-none" />
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors">
            Annuler
          </button>
          <button type="button" onClick={handleSend} disabled={sending || done}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              done
                ? 'bg-emerald-500 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
            }`}>
            {done ? <><CheckCircle className="w-4 h-4" /> Envoyée !</>
              : sending ? <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /></>
              : <><Send className="w-4 h-4" /> Envoyer</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoiceEditor() {
  const { properties, bookings, guests } = useBNB();
  const { isDark } = useTheme();

  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInvoices());
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [sendModal, setSendModal] = useState<Invoice | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [saved, setSaved] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');
  const [showPresets, setShowPresets] = useState(false);
  const [splitPreview, setSplitPreview] = useState(false);
  const [autoSaveLabel, setAutoSaveLabel] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showClientBalance, setShowClientBalance] = useState(false);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(() => loadTemplates());
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentNote, setNewPaymentNote] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const dbHydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromDb = async () => {
      const [remoteInvoices, remoteTemplates, remoteIssuerProfile] = await Promise.all([
        loadStateFromDb<Invoice[]>(APP_STATE_KEY_INVOICES),
        loadStateFromDb<InvoiceTemplate[]>(APP_STATE_KEY_TEMPLATES),
        loadStateFromDb<Partial<IssuerProfile>>(APP_STATE_KEY_ISSUER_PROFILE),
      ]);

      if (cancelled) return;

      if (Array.isArray(remoteInvoices) && remoteInvoices.length > 0) {
        setInvoices(remoteInvoices);
      }

      if (Array.isArray(remoteTemplates) && remoteTemplates.length > 0) {
        setTemplates(remoteTemplates);
      }

      if (remoteIssuerProfile && typeof window !== 'undefined') {
        localStorage.setItem(ISSUER_PROFILE_KEY, JSON.stringify(remoteIssuerProfile));
      }

      dbHydratedRef.current = true;
    };

    void hydrateFromDb();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save issuer profile whenever editing changes
  useEffect(() => {
    if (!editing) return;
    saveIssuerProfile(editing);

    if (!dbHydratedRef.current) return;

    const profile: Partial<IssuerProfile> = {
      issuerName: editing.issuerName,
      issuerAddress: editing.issuerAddress,
      issuerCity: editing.issuerCity,
      issuerZip: editing.issuerZip,
      issuerCountry: editing.issuerCountry,
      issuerEmail: editing.issuerEmail,
      issuerPhone: editing.issuerPhone,
      issuerSiret: editing.issuerSiret,
      issuerVat: editing.issuerVat,
      issuerLogo: editing.issuerLogo,
    };

    const t = setTimeout(() => {
      void saveStateToDb(APP_STATE_KEY_ISSUER_PROFILE, profile);
    }, 400);

    return () => clearTimeout(t);
  }, [editing?.issuerName, editing?.issuerEmail, editing?.issuerPhone,
      editing?.issuerSiret, editing?.issuerVat, editing?.issuerAddress,
      editing?.issuerCity, editing?.issuerZip, editing?.issuerCountry,
      editing?.issuerLogo]);

  useEffect(() => {
    if (!dbHydratedRef.current) return;
    const t = setTimeout(() => {
      void saveStateToDb(APP_STATE_KEY_INVOICES, invoices);
    }, 500);
    return () => clearTimeout(t);
  }, [invoices]);

  useEffect(() => {
    if (!dbHydratedRef.current) return;
    const t = setTimeout(() => {
      void saveStateToDb(APP_STATE_KEY_TEMPLATES, templates);
    }, 500);
    return () => clearTimeout(t);
  }, [templates]);

  // Autosave every 30s in editor
  useEffect(() => {
    if (view !== 'editor' || !editing) return;
    const t = setInterval(() => {
      const updated = invoices.some(i => i.id === editing.id)
        ? invoices.map(i => i.id === editing.id ? { ...editing, updatedAt: new Date().toISOString() } : i)
        : [...invoices, { ...editing, updatedAt: new Date().toISOString() }];
      saveInvoices(updated);
      setInvoices(updated);
      setAutoSaveLabel('Sauvegarde auto ✓');
      setTimeout(() => setAutoSaveLabel(''), 2000);
    }, 30000);
    return () => clearInterval(t);
  }, [view, editing, invoices]);

  // Keyboard shortcuts
  useEffect(() => {
    if (view !== 'editor') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveEditing(); }
      if (e.key === 'Escape') { setView('list'); setEditing(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, editing]);

  // Keyboard shortcut: N = nouvelle facture depuis la liste
  useEffect(() => {
    if (view !== 'list') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey
        && !(e.target instanceof HTMLInputElement)
        && !(e.target instanceof HTMLTextAreaElement)
        && !(e.target instanceof HTMLSelectElement)) {
        createNew();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // ── persist ──
  const persist = useCallback((updated: Invoice[]) => {
    setInvoices(updated);
    saveInvoices(updated);
  }, []);

  // ── CRUD ──
  const createNew = () => {
    const inv = emptyInvoice(invoices);
    setEditing(inv);
    setView('editor');
  };

  const saveEditing = () => {
    if (!editing) return;
    const now = new Date().toISOString();
    const existing = invoices.find(i => i.id === editing.id);
    // Track status change in history
    const prevStatus = existing?.status;
    const history = editing.statusHistory ?? [];
    const updatedHistory = (prevStatus && prevStatus !== editing.status)
      ? [...history, { status: editing.status, date: now }]
      : history.length === 0
        ? [{ status: editing.status, date: now }]
        : history;
    const inv = { ...editing, updatedAt: now, statusHistory: updatedHistory };
    const updated = existing
      ? invoices.map(i => i.id === editing.id ? inv : i)
      : [...invoices, inv];
    persist(updated);
    setEditing(inv);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteInvoice = (id: string) => {
    if (!confirm('Supprimer cette facture ?')) return;
    persist(invoices.filter(i => i.id !== id));
  };

  const duplicateInvoice = (inv: Invoice) => {
    const copy: Invoice = {
      ...inv,
      id: `inv_${Date.now()}`,
      number: nextInvoiceNumber(invoices),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist([...invoices, copy]);
  };

  const renewInvoice = (inv: Invoice) => {
    // Advance dates by the recurring frequency
    const freqDays = inv.recurringFrequency === 'yearly' ? 365 : inv.recurringFrequency === 'quarterly' ? 91 : 30;
    const newIssue = new Date(inv.issueDate);
    newIssue.setDate(newIssue.getDate() + freqDays);
    const newDue = new Date(inv.dueDate);
    newDue.setDate(newDue.getDate() + freqDays);
    const copy: Invoice = {
      ...inv,
      id: `inv_${Date.now()}`,
      number: nextInvoiceNumber(invoices),
      status: 'draft',
      issueDate: newIssue.toISOString().split('T')[0],
      dueDate: newDue.toISOString().split('T')[0],
      partialPayments: [],
      statusHistory: [{ status: 'draft', date: new Date().toISOString(), note: `Renouvellement de ${inv.number}` }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    persist([...invoices, copy]);
    setEditing(copy);
    setView('editor');
  };

  const changeStatus = (id: string, status: InvoiceStatus, note?: string) => {
    persist(invoices.map(i => i.id === id ? {
      ...i, status, updatedAt: new Date().toISOString(),
      statusHistory: [...(i.statusHistory ?? []), { status, date: new Date().toISOString(), note }],
    } : i));
  };

  const handleSent = (invId: string, note: string) => {
    changeStatus(invId, 'sent', note || 'Envoyée par email');
    setSendModal(null);
  };

  // ── Templates ──
  const saveAsTemplate = () => {
    if (!editing || !templateName.trim()) return;
    const tpl: InvoiceTemplate = {
      id: `tpl_${Date.now()}`,
      name: templateName.trim(),
      createdAt: new Date().toISOString(),
      lines: editing.lines,
      paymentTerms: editing.paymentTerms,
      notes: editing.notes,
      accentColor: editing.accentColor,
      layout: editing.layout,
      globalDiscount: editing.globalDiscount,
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName('');
    setShowSaveTemplate(false);
  };

  const applyTemplate = (tpl: InvoiceTemplate) => {
    if (!editing) return;
    setEditing({
      ...editing,
      lines: tpl.lines.map(l => ({ ...l, id: `line_${Date.now()}_${Math.random()}` })),
      paymentTerms: tpl.paymentTerms,
      notes: tpl.notes,
      accentColor: tpl.accentColor,
      layout: tpl.layout,
      globalDiscount: tpl.globalDiscount,
    });
    setShowTemplates(false);
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  // ── Partial payments ──
  const addPartialPayment = () => {
    if (!editing) return;
    const amount = parseFloat(newPaymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    const payment = { amount, date: new Date().toISOString().split('T')[0], note: newPaymentNote || undefined };
    const updated = { ...editing, partialPayments: [...(editing.partialPayments ?? []), payment] };
    setEditing(updated);
    setNewPaymentAmount('');
    setNewPaymentNote('');
    // Auto-mark as paid if fully settled
    const totalPaid = (updated.partialPayments).reduce((s, p) => s + p.amount, 0);
    const totalDue  = calcTotalsWithDiscount(updated.lines, updated.globalDiscount).ttc;
    if (totalPaid >= totalDue - 0.01) {
      setEditing({ ...updated, status: 'paid' });
    }
  };

  const removePartialPayment = (idx: number) => {
    if (!editing) return;
    const payments = (editing.partialPayments ?? []).filter((_, i) => i !== idx);
    setEditing({ ...editing, partialPayments: payments });
  };

  // ── Client autocomplete ──
  const applyClientSuggestion = (c: ReturnType<typeof getClientSuggestions>[0]) => {
    if (!editing) return;
    setEditing({
      ...editing,
      clientName: c.name, clientEmail: c.email,
      clientAddress: c.address, clientCity: c.city,
      clientZip: c.zip, clientCountry: c.country,
      clientPhone: c.phone,
    });
    setShowClientSuggestions(false);
    setClientQuery('');
  };

  // ── Prefill from booking ──
  const prefillFromBooking = (bookingId: number) => {
    if (!editing) return;
    const b = bookings.find(bk => bk.id === bookingId);
    if (!b) return;
    const prop  = properties.find(p => p.id === b.propertyId);
    const guest = guests.find(g => g.id === b.guestId);
    const nights = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000);
    const pricePerNight = nights > 0 ? b.totalPrice / nights : b.totalPrice;

    setEditing({
      ...editing,
      bookingId: b.id,
      propertyId: b.propertyId,
      clientName: b.guestInfo?.name ?? guest?.name ?? '',
      clientEmail: b.guestInfo?.email ?? guest?.email ?? '',
      lines: [
        {
          id: `line_${Date.now()}`,
          description: `Location ${prop?.name ?? 'Bien'} \u2014 ${new Date(b.checkIn).toLocaleDateString('fr-FR')} au ${new Date(b.checkOut).toLocaleDateString('fr-FR')}`,
          quantity: nights,
          unitPrice: pricePerNight,
          vatRate: 0,
          discount: 0,
        },
      ],
    });
  };

  // ── Line helpers ──
  const updateLine = (lineId: string, field: keyof InvoiceLine, value: string | number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      lines: editing.lines.map(l => l.id === lineId ? { ...l, [field]: value } : l),
    });
  };
  const addLine = () => {
    if (!editing) return;
    setEditing({ ...editing, lines: [...editing.lines, newLine()] });
  };
  const removeLine = (lineId: string) => {
    if (!editing || editing.lines.length <= 1) return;
    setEditing({ ...editing, lines: editing.lines.filter(l => l.id !== lineId) });
  };

  // ── Export JSON ──
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(invoices, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `factures-bnbgest-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Import JSON ──
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Invoice[];
        if (Array.isArray(data)) persist([...invoices, ...data]);
      } catch { alert('Fichier invalide'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const header = ['N°','Statut','Client','Email','Émission','Échéance','HT','TVA','TTC','Remise globale %','Lignes'];
    const rows = invoices.map(i => {
      const t = calcTotalsWithDiscount(i.lines, i.globalDiscount);
      return [
        i.number, STATUS_META[i.status].label, i.clientName, i.clientEmail,
        i.issueDate, i.dueDate,
        fmt(t.ht), fmt(t.vat), fmt(t.ttc), i.globalDiscount,
        i.lines.length,
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `factures-bnbgest-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Toggle sort ──
  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  // ── Add preset line ──
  const addPresetLine = (preset: typeof LINE_PRESETS[0]) => {
    if (!editing) return;
    const line: InvoiceLine = { ...newLine(), ...preset.line } as InvoiceLine;
    setEditing({ ...editing, lines: [...editing.lines, line] });
    setShowPresets(false);
  };

  // ── Filtered list ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const periodFiltered = filterByPeriod(invoices, periodFilter);
    const arr = periodFiltered.filter(i => {
      const matchSearch = !q
        || i.number.toLowerCase().includes(q)
        || i.clientName.toLowerCase().includes(q)
        || i.clientEmail.toLowerCase().includes(q)
        || (i.notes ?? '').toLowerCase().includes(q)
        || (i.clientRef ?? '').toLowerCase().includes(q)
        || i.lines.some(l => l.description.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      return matchSearch && matchStatus;
    });
    arr.sort((a, b) => {
      let diff = 0;
      if (sortField === 'date')   diff = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
      if (sortField === 'amount') diff = calcTotals(a.lines).ttc - calcTotals(b.lines).ttc;
      if (sortField === 'status') diff = a.status.localeCompare(b.status);
      if (sortField === 'client') diff = a.clientName.localeCompare(b.clientName);
      return sortDir === 'asc' ? diff : -diff;
    });
    return arr;
  }, [invoices, search, statusFilter, sortField, sortDir, periodFilter]);

  // ── Stats ──
  const stats = useMemo(() => ({
    total:      invoices.length,
    draft:      invoices.filter(i => i.status === 'draft').length,
    sent:       invoices.filter(i => i.status === 'sent').length,
    paid:       invoices.filter(i => i.status === 'paid').length,
    overdue:    invoices.filter(i => i.status === 'overdue').length,
    revenue:    invoices.filter(i => i.status === 'paid').reduce((s, i) => s + calcTotals(i.lines).ttc, 0),
    pending:    invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + calcTotals(i.lines).ttc, 0),
    conversion: calcConversionRate(invoices),
    trend:      calcMonthlyTrend(invoices),
    statusDist: calcStatusDistribution(invoices),
    topClients: calcTopClients(invoices),
  }), [invoices]);

  // ── Client suggestions ──
  const clientSuggestions = useMemo(() => getClientSuggestions(invoices), [invoices]);

  // ── Revenue chart (last 6 months) ──
  const revenueChart = useMemo(() => {
    const months: Record<string, number> = {};
    for (let m = 5; m >= 0; m--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - m);
      const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    invoices.filter(i => i.status === 'paid').forEach(i => {
      const d = new Date(i.issueDate);
      const key = d.toLocaleString('fr-FR', { month: 'short', year: '2-digit' });
      if (key in months) months[key] += calcTotals(i.lines).ttc;
    });
    return Object.entries(months).map(([mois, montant]) => ({ mois, montant }));
  }, [invoices]);

  // ── Shared classes ──
  const card  = `rounded-2xl border ${isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm'}`;
  const input = `w-full px-3 py-2 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 ${
    isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
  }`;
  const label = `block text-xs font-semibold mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

  // ══════════════════════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === 'editor' && editing) {
    const totals = calcTotalsWithDiscount(editing.lines, editing.globalDiscount);
    const completion = calcCompletion(editing);
    const completionColor = completion >= 80 ? 'bg-emerald-500' : completion >= 50 ? 'bg-amber-500' : 'bg-rose-500';

    return (
      <div className="space-y-6">
        {/* Editor toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('list'); setEditing(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              <ArrowLeft className="w-4 h-4" /> Liste
            </button>
            {autoSaveLabel && (
              <span className="text-xs text-emerald-400 font-semibold animate-pulse">{autoSaveLabel}</span>
            )}
            <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Ctrl+S · Esc</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status selector */}
            <select value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value as InvoiceStatus })}
              className={`px-3 py-2 rounded-xl border text-sm font-semibold outline-none ${input}`}>
              {(Object.keys(STATUS_META) as InvoiceStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
            {/* Split preview toggle */}
            <button onClick={() => setSplitPreview(p => !p)}
              title="Aperçu côte à côte"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                splitPreview
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              <Eye className="w-4 h-4" /> {splitPreview ? 'Masquer aperçu' : 'Aperçu live'}
            </button>
            {/* Templates dropdown */}
            <div className="relative">
              <button onClick={() => setShowTemplates(p => !p)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  showTemplates
                    ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                    : isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}>
                <Bookmark className="w-4 h-4" /> Modèles
                {templates.length > 0 && <span className="text-xs bg-violet-500/20 text-violet-400 px-1.5 py-0 rounded-full">{templates.length}</span>}
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className={`absolute right-0 top-full mt-2 z-30 w-72 rounded-2xl border shadow-xl p-3 ${isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                    {templates.length === 0 ? (
                      <p className={`text-xs text-center py-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucun modèle sauvegardé.<br/>Sauvegardez depuis la barre latérale.</p>
                    ) : templates.map(tpl => (
                      <div key={tpl.id} className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-50'}`}
                        onClick={() => { applyTemplate(tpl); setShowTemplates(false); }}>
                        <div>
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{tpl.name}</p>
                          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{tpl.lines.length} ligne{tpl.lines.length > 1 ? 's' : ''} · {new Date(tpl.createdAt).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteTemplate(tpl.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" onClick={() => setPreview(editing)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <button onClick={saveEditing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105">
              {saved ? <><CheckCircle className="w-4 h-4" /> Sauvegardé</> : <><Save className="w-4 h-4" /> Sauvegarder</>}
            </button>
          </div>
        </div>

        {/* Completion bar */}
        <div className={`rounded-2xl p-3 flex items-center gap-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'}`}>
          <div className="flex items-center gap-2 shrink-0">
            <ListChecks className={`w-4 h-4 ${completion >= 80 ? 'text-emerald-500' : completion >= 50 ? 'text-amber-500' : 'text-rose-500'}`} />
            <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Complété</span>
            <span className={`text-xs font-black ${completion >= 80 ? 'text-emerald-500' : completion >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{completion}%</span>
          </div>
          <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
            <motion.div className={`h-full rounded-full ${completionColor}`}
              initial={{ width: 0 }} animate={{ width: `${completion}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </div>
          <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {completion < 100 && (
              !editing.issuerName ? 'Ajoutez le nom de l\'émetteur' :
              !editing.clientName ? 'Ajoutez le nom du client' :
              !editing.clientEmail ? 'Ajoutez l\'email client' :
              !editing.lines.some(l => l.description && l.unitPrice > 0) ? 'Complétez au moins une ligne' :
              'Ajoutez notes ou conditions'
            )}
          </div>
        </div>

        {/* Split layout */}
        <div className={splitPreview ? 'grid grid-cols-2 gap-6 items-start' : 'grid grid-cols-1 xl:grid-cols-3 gap-6'}>
          {/* Left: form */}
          <div className="xl:col-span-2 space-y-5">

            {/* Identity & color */}
            <div className={`p-5 ${card}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl" style={{ background: `${editing.accentColor}20` }}>
                  <FileText className="w-4 h-4" style={{ color: editing.accentColor }} />
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Identité de la facture</h3>
              </div>

              {/* Toggle Facture / Devis */}
              <div className="flex gap-2 mb-4">
                {(['invoice', 'quote'] as InvoiceDocType[]).map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setEditing({
                      ...editing,
                      documentType: dt,
                      number: dt !== editing.documentType
                        ? nextInvoiceNumber(invoices, dt)
                        : editing.number,
                    })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      editing.documentType === dt
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                        : isDark
                          ? 'border-white/10 text-gray-400 hover:bg-white/5'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {dt === 'invoice' ? <><Receipt className="w-3.5 h-3.5" /> Facture</> : <><FileText className="w-3.5 h-3.5" /> Devis</>}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>N° {editing.documentType === 'quote' ? 'de devis' : 'de facture'}</label>
                  <div className="flex gap-2">
                    <input value={numberPrefix} onChange={e => {
                      setNumberPrefix(e.target.value);
                      if (e.target.value) setEditing({ ...editing, number: `${e.target.value}-${editing.number.split('-').pop()}` });
                    }}
                      placeholder="Préfixe…" className={`${input} w-24`} />
                    <input value={editing.number} onChange={e => setEditing({ ...editing, number: e.target.value })} className={input} />
                  </div>
                </div>
                <div>
                  <label className={label}>Couleur accent</label>
                  <div className="flex items-center gap-2">
                    {ACCENT_COLORS.map(c => (
                      <button key={c} onClick={() => setEditing({ ...editing, accentColor: c })}
                        className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 ${editing.accentColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className={label}>Mise en page PDF</label>
                  <div className="flex gap-2">
                    {(['classic', 'modern', 'minimal'] as const).map(l => (
                      <button key={l} onClick={() => setEditing({ ...editing, layout: l })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          editing.layout === l
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                            : isDark ? 'border-white/10 text-gray-400 hover:bg-white/5' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}>
                        {l === 'classic' ? <><Layers className="w-3.5 h-3.5" /> Classique</> :
                         l === 'modern'  ? <><Layout className="w-3.5 h-3.5" /> Moderne</>  :
                                           <><FileText className="w-3.5 h-3.5" /> Minimal</>}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Recurring toggle */}
                <div className="col-span-2 flex items-center justify-between py-1">
                  <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Repeat className="w-3.5 h-3.5 text-violet-400" /> {editing.documentType === 'quote' ? 'Devis récurrent' : 'Facture récurrente'}
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditing({ ...editing, isRecurring: !editing.isRecurring })}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${editing.isRecurring ? 'bg-violet-500' : isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${editing.isRecurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    {editing.isRecurring && (
                      <select value={editing.recurringFrequency ?? 'monthly'}
                        onChange={e => setEditing({ ...editing, recurringFrequency: e.target.value as 'monthly'|'quarterly'|'yearly' })}
                        className={`text-xs px-2 py-1 rounded-xl border outline-none ${isDark ? 'bg-white/[0.05] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                        <option value="monthly">Mensuelle</option>
                        <option value="quarterly">Trimestrielle</option>
                        <option value="yearly">Annuelle</option>
                      </select>
                    )}
                  </div>
                </div>
                <div>
                  <label className={label}>Date d&apos;émission</label>
                  <input type="date" value={editing.issueDate} onChange={e => setEditing({ ...editing, issueDate: e.target.value })} className={input} />
                </div>
                <div>
                  <label className={label}>Date d&apos;échéance</label>
                  <input type="date" value={editing.dueDate} onChange={e => setEditing({ ...editing, dueDate: e.target.value })} className={input} />
                </div>

                {/* Tags libres */}
                <div className="col-span-2">
                  <label className={label}>Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editing.tags ?? []).map(tag => (
                      <span key={tag} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        {tag}
                        <button onClick={() => setEditing({ ...editing, tags: (editing.tags ?? []).filter(t => t !== tag) })}
                          className="hover:text-rose-400 transition-colors"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newTag} onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newTag.trim()) {
                          e.preventDefault();
                          if (!(editing.tags ?? []).includes(newTag.trim())) {
                            setEditing({ ...editing, tags: [...(editing.tags ?? []), newTag.trim()] });
                          }
                          setNewTag('');
                        }
                      }}
                      placeholder="Ajouter un tag + Entrée" className={`${input} text-xs py-1.5`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Prefill from booking */}
            {bookings.length > 0 && (
              <div className={`p-5 ${card}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Pr&eacute;remplir depuis une r&eacute;servation</h3>
                </div>
                <select onChange={e => e.target.value && prefillFromBooking(Number(e.target.value))}
                  className={input} defaultValue="">
                  <option value="">-- Choisir une r&eacute;servation --</option>
                  {bookings.map(b => {
                    const prop = properties.find(p => p.id === b.propertyId);
                    return (
                      <option key={b.id} value={b.id}>
                        #{b.id} — {b.guestInfo?.name ?? 'Client'} — {prop?.name ?? 'Bien'} — {new Date(b.checkIn).toLocaleDateString('fr-FR')} ({b.totalPrice.toLocaleString('fr-FR')} €)
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Issuer */}
            <div className={`p-5 ${card}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Émetteur (vous)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { field: 'issuerName'    as const, label: 'Raison sociale / Nom' },
                  { field: 'issuerEmail'   as const, label: 'Email' },
                  { field: 'issuerPhone'   as const, label: 'T\u00e9l\u00e9phone' },
                  { field: 'issuerAddress' as const, label: 'Adresse' },
                  { field: 'issuerZip'     as const, label: 'Code postal' },
                  { field: 'issuerCity'    as const, label: 'Ville' },
                  { field: 'issuerCountry' as const, label: 'Pays' },
                  { field: 'issuerSiret'   as const, label: 'SIRET' },
                  { field: 'issuerVat'     as const, label: 'N° TVA intracom.' },
                  { field: 'issuerLogo'    as const, label: 'URL Logo (https://…)' },
                ].map(({ field, label: lbl }) => (
                  <div key={field} className={(field === 'issuerAddress' || field === 'issuerLogo') ? 'col-span-2' : ''}>
                    <label className={label}>{lbl}</label>
                    <input value={(editing as any)[field] ?? ''} onChange={e => setEditing({ ...editing, [field]: e.target.value })} className={input} />
                  </div>
                ))}
              </div>
            </div>

            {/* Client */}
            <div className={`p-5 ${card}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Client</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Client autocomplete */}
                {clientSuggestions.length > 0 && (
                  <div className="col-span-2 relative">
                    <label className={label}>Remplir depuis un client existant</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input value={clientQuery}
                        onChange={e => { setClientQuery(e.target.value); setShowClientSuggestions(true); }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                        placeholder="Rechercher un client…"
                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border outline-none transition-colors ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600 focus:border-blue-500/50' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-400'}`} />
                    </div>
                    <AnimatePresence>
                      {showClientSuggestions && clientQuery && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className={`absolute z-20 left-0 right-0 mt-1 rounded-xl border shadow-xl p-1.5 max-h-48 overflow-y-auto ${isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                          {clientSuggestions
                            .filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()) || c.email.toLowerCase().includes(clientQuery.toLowerCase()))
                            .map(c => (
                              <button key={c.email || c.name} onMouseDown={() => applyClientSuggestion(c)}
                                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isDark ? 'hover:bg-white/[0.06] text-white' : 'hover:bg-gray-50 text-gray-900'}`}>
                                <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <div>
                                  <p className="font-semibold">{c.name}</p>
                                  {c.email && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.email}</p>}
                                </div>
                              </button>
                            ))}
                          {clientSuggestions.filter(c => c.name.toLowerCase().includes(clientQuery.toLowerCase()) || c.email.toLowerCase().includes(clientQuery.toLowerCase())).length === 0 && (
                            <p className={`text-xs text-center py-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Aucun résultat</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {[
                  { field: 'clientName'    as const, label: 'Nom complet' },
                  { field: 'clientEmail'   as const, label: 'Email' },
                  { field: 'clientPhone'   as const, label: 'Téléphone' },
                  { field: 'clientRef'     as const, label: 'Réf. / Bon de commande' },
                  { field: 'clientAddress' as const, label: 'Adresse' },
                  { field: 'clientZip'     as const, label: 'Code postal' },
                  { field: 'clientCity'    as const, label: 'Ville' },
                  { field: 'clientCountry' as const, label: 'Pays' },
                ].map(({ field, label: lbl }) => (
                  <div key={field} className={field === 'clientAddress' ? 'col-span-2' : ''}>
                    <label className={label}>{lbl}</label>
                    <input value={(editing as any)[field] ?? ''} onChange={e => setEditing({ ...editing, [field]: e.target.value })} className={input} />
                  </div>
                ))}
              </div>
            </div>

            {/* Lines */}
            <div className={`p-5 ${card}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
                    <Package className="w-4 h-4 text-purple-500" />
                  </div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Lignes de facturation</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Preset templates */}
                  <div className="relative">
                    <button onClick={() => setShowPresets(p => !p)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        isDark ? 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }`}>
                      <Zap className="w-3.5 h-3.5" /> Modèles {showPresets ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <AnimatePresence>
                      {showPresets && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className={`absolute right-0 top-full mt-2 z-20 w-56 rounded-2xl border shadow-xl p-2 grid grid-cols-2 gap-1 ${
                            isDark ? 'bg-[#1a1a2e] border-white/[0.08]' : 'bg-white border-gray-100'
                          }`}>
                          {LINE_PRESETS.map(preset => {
                            const PIcon = preset.icon;
                            return (
                              <button key={preset.label} onClick={() => addPresetLine(preset)}
                                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                                  isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                }`}>
                                <PIcon className="w-3.5 h-3.5 shrink-0 text-indigo-400" />{preset.label}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={addLine} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
              </div>

              {/* Header row */}
              <div className={`grid text-[11px] font-bold uppercase tracking-wide mb-2 px-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
                style={{ gridTemplateColumns: '1fr 70px 100px 70px 70px 90px 36px' }}>
                <span>Description</span>
                <span className="text-right">Qté</span>
                <span className="text-right">P.U. HT (€)</span>
                <span className="text-right">Remise %</span>
                <span className="text-right">TVA %</span>
                <span className="text-right">TTC (€)</span>
                <span />
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {editing.lines.map(line => {
                    const c = calcLine(line);
                    return (
                      <motion.div key={line.id}
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                        className={`grid items-center gap-2 px-2 py-1.5 rounded-xl ${isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
                        style={{ gridTemplateColumns: '1fr 70px 100px 70px 70px 90px 36px' }}>
                        <input value={line.description} onChange={e => updateLine(line.id, 'description', e.target.value)}
                          placeholder="Description de la prestation" className={`${input} py-1`} />
                        <input type="number" min={0} value={line.quantity} onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className={`${input} py-1 text-right`} />
                        <input type="number" min={0} step={0.01} value={line.unitPrice} onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`${input} py-1 text-right`} />
                        <input type="number" min={0} max={100} value={line.discount} onChange={e => updateLine(line.id, 'discount', parseFloat(e.target.value) || 0)}
                          className={`${input} py-1 text-right`} />
                        <input type="number" min={0} max={100} value={line.vatRate} onChange={e => updateLine(line.id, 'vatRate', parseFloat(e.target.value) || 0)}
                          className={`${input} py-1 text-right`} />
                        <div className={`text-right text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {fmt(c.ttc)} €
                        </div>
                        <button onClick={() => removeLine(line.id)} disabled={editing.lines.length <= 1}
                          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-30 text-rose-500 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Notes */}
            <div className={`p-5 ${card}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Conditions de paiement</label>
                  <input value={editing.paymentTerms} onChange={e => setEditing({ ...editing, paymentTerms: e.target.value })} className={input} />
                </div>
                <div>
                  <label className={label}>Remise globale (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="number" min={0} max={100} step={0.5}
                      value={editing.globalDiscount ?? 0}
                      onChange={e => setEditing({ ...editing, globalDiscount: parseFloat(e.target.value) || 0 })}
                      className={`${input} pl-8`} />
                  </div>
                  {(editing.globalDiscount ?? 0) > 0 && (
                    <p className="text-xs text-rose-400 mt-1 font-semibold">
                      − {fmt(totals.discount)} € de remise
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={label}>Notes (mentions légales, IBAN…)</label>
                  <textarea rows={3} value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })}
                    className={`${input} resize-none`} />
                </div>

                {/* Notes internes (mémo privé) */}
                <div className="col-span-2">
                  <button onClick={() => setShowInternalNotes(p => !p)}
                    className={`flex items-center gap-1.5 text-xs font-semibold mb-1 transition-colors ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                    <Lock className="w-3 h-3 text-amber-400" />
                    Notes internes (mémo privé — non visible sur le PDF)
                    {showInternalNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <AnimatePresence>
                    {showInternalNotes && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <textarea rows={2}
                          value={editing.internalNotes ?? ''}
                          onChange={e => setEditing({ ...editing, internalNotes: e.target.value })}
                          placeholder="Mémo interne : conditions spéciales, commentaires équipe…"
                          className={`${input} resize-none border-amber-500/30 focus:ring-amber-500/20`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Signature électronique */}
            <div className={`p-5 ${card}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <PenLine className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Signature électronique</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label}>Nom du signataire</label>
                  <input value={editing.signatureName ?? ''} onChange={e => setEditing({ ...editing, signatureName: e.target.value })}
                    className={input} placeholder="Jean Dupont" />
                </div>
                <div>
                  <label className={label}>Date de signature</label>
                  <input type="date" value={editing.signatureDate ?? ''} onChange={e => setEditing({ ...editing, signatureDate: e.target.value })}
                    className={input} />
                  {!editing.signatureDate && (
                    <button type="button" onClick={() => setEditing({ ...editing, signatureDate: new Date().toISOString().split('T')[0] })}
                      className="mt-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                      → Aujourd&apos;hui
                    </button>
                  )}
                </div>
              </div>
              {editing.signatureName && (
                <div className={`mt-3 p-3 rounded-xl border ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'} text-center`}>
                  <p className="text-xs text-gray-400 mb-1">Aperçu signature</p>
                  <p className="font-black text-lg italic" style={{ fontFamily: 'Georgia, serif', color: editing.accentColor }}>
                    {editing.signatureName}
                  </p>
                  {editing.signatureDate && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(editing.signatureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: recap OR live split preview */}
          <div className="space-y-5">
            {splitPreview ? (
              /* ── Live split preview ── */
              <div className={`sticky top-24 rounded-2xl overflow-hidden border ${isDark ? 'border-white/[0.08]' : 'border-gray-200'} shadow-xl`}>
                <div className={`flex items-center justify-between px-4 py-2 text-xs font-bold ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Aperçu en direct</span>
                  <span className="opacity-50">mis à jour automatiquement</span>
                </div>
                <div className="bg-white p-6 overflow-y-auto max-h-[78vh] text-gray-900 text-[11px]">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      {editing.issuerLogo
                        ? <img src={editing.issuerLogo} alt="logo" loading="lazy" className="h-10 object-contain mb-2" />
                        : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base mb-2"
                            style={{ background: editing.accentColor }}>
                            {(editing.issuerName || 'M').charAt(0).toUpperCase()}
                          </div>
                      }
                      <p className="font-black text-sm">{editing.issuerName || 'Votre société'}</p>
                      <p className="text-gray-500">{editing.issuerAddress}</p>
                      <p className="text-gray-500">{editing.issuerZip} {editing.issuerCity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl" style={{ color: editing.accentColor }}>{docLabel(editing)}</p>
                      <p className="font-bold">N° {editing.number}</p>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded text-white text-[10px] font-bold"
                        style={{ background: editing.accentColor }}>
                        {STATUS_META[editing.status].label}
                      </div>
                    </div>
                  </div>
                  {/* Client */}
                  <div className="mb-4 p-3 rounded-lg" style={{ background: `${editing.accentColor}10` }}>
                    <p className="font-bold text-xs mb-1" style={{ color: editing.accentColor }}>FACTURÉ À</p>
                    <p className="font-bold">{editing.clientName || '—'}</p>
                    {editing.clientAddress && <p className="text-gray-600">{editing.clientAddress}, {editing.clientZip} {editing.clientCity}</p>}
                    {editing.clientEmail && <p className="text-gray-500">{editing.clientEmail}</p>}
                    {editing.clientPhone && <p className="text-gray-500">{editing.clientPhone}</p>}
                  </div>
                  {/* Lines table */}
                  <table className="w-full mb-4 text-[10px]">
                    <thead>
                      <tr className="border-b" style={{ borderColor: editing.accentColor }}>
                        <th className="text-left pb-1 font-bold">Description</th>
                        <th className="text-right pb-1 font-bold">Qté</th>
                        <th className="text-right pb-1 font-bold">P.U. HT</th>
                        <th className="text-right pb-1 font-bold">Rem.</th>
                        <th className="text-right pb-1 font-bold">HT</th>
                        <th className="text-right pb-1 font-bold">TVA%</th>
                        <th className="text-right pb-1 font-bold">TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editing.lines.map(line => {
                        const c = calcLine(line);
                        return (
                          <tr key={line.id} className="border-b border-gray-100">
                            <td className="py-1">{line.description || '—'}</td>
                            <td className="text-right py-1">{line.quantity}</td>
                            <td className="text-right py-1">{fmt(line.unitPrice)} €</td>
                            <td className="text-right py-1">{line.discount}%</td>
                            <td className="text-right py-1">{fmt(c.ht)} €</td>
                            <td className="text-right py-1">{line.vatRate}%</td>
                            <td className="text-right py-1 font-bold">{fmt(c.ttc)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-44 space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">HT</span><span>{fmt(totals.ht)} €</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">TVA</span><span>{fmt(totals.vat)} €</span></div>
                      {calcVatBreakdown(editing.lines).length > 1 && calcVatBreakdown(editing.lines).map(v => (
                        <div key={v.rate} className="flex justify-between text-gray-400 pl-2 text-[9px]">
                          <span>TVA {v.rate}%</span><span>{fmt(v.vat)} €</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-black text-sm pt-1 border-t" style={{ color: editing.accentColor, borderColor: editing.accentColor }}>
                        <span>TTC</span><span>{fmt(totals.ttc)} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Sticky recap sidebar ── */
              <div className={`p-5 ${card} sticky top-24`}>
                <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Récapitulatif</h3>

                {/* Due date alert */}
                {editing.dueDate && editing.status !== 'paid' && editing.status !== 'cancelled' && (() => {
                  const days = dueDaysLeft(editing.dueDate);
                  if (days > 14) return null;
                  return (
                    <div className={`mb-4 rounded-xl px-3 py-2.5 flex items-center gap-2 text-xs font-bold ${
                      days < 0 ? 'bg-rose-500/10 text-rose-400' : days === 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-500/8 text-amber-500'
                    }`}>
                      <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                      {days < 0 ? `${Math.abs(days)} jours de retard !` : days === 0 ? "Échéance aujourd'hui !" : `Échéance dans ${days} jours`}
                    </div>
                  );
                })()}
                <div className="space-y-3">
                  {editing.lines.map(line => {
                    const c = calcLine(line);
                    return (
                      <div key={line.id} className="flex justify-between text-sm">
                        <span className={`truncate max-w-[160px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {line.description || 'Ligne sans titre'}
                        </span>
                        <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(c.ttc)} €</span>
                      </div>
                    );
                  })}
                </div>
                {/* Linked booking/property */}
                {(editing.bookingId || editing.propertyId) && (() => {
                  const prop    = properties.find(p => p.id === editing.propertyId);
                  const booking = bookings.find(b => b.id === editing.bookingId);
                  return (
                    <div className={`mt-3 p-3 rounded-xl border text-xs ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Link2 className="w-3 h-3 text-indigo-400" />
                        <span className={`font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Lié à</span>
                      </div>
                      {prop && (
                        <div className={`flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <FolderOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="font-semibold">{prop.name}</span>
                        </div>
                      )}
                      {booking && (
                        <div className={`flex items-center gap-1.5 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{new Date(booking.checkIn).toLocaleDateString('fr-FR')} → {new Date(booking.checkOut).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className={`mt-4 pt-4 border-t space-y-2 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                  <div className={`flex justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>Total HT</span><span className="font-semibold">{fmt(totals.ht)} €</span>
                  </div>
                  <div className={`flex justify-between text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>TVA</span><span className="font-semibold">{fmt(totals.vat)} €</span>
                  </div>
                  {/* VAT breakdown by rate */}
                  {calcVatBreakdown(editing.lines).length > 1 && calcVatBreakdown(editing.lines).map(v => (
                    <div key={v.rate} className={`flex justify-between text-xs pl-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span>↳ TVA {v.rate}%</span><span>{fmt(v.vat * (1 - (editing.globalDiscount ?? 0)/100))} €</span>
                    </div>
                  ))}
                  {/* Global discount */}
                  {(editing.globalDiscount ?? 0) > 0 && (
                    <div className="flex justify-between text-sm text-rose-400">
                      <span>Remise {editing.globalDiscount}%</span>
                      <span className="font-semibold">− {fmt(totals.discount)} €</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-black pt-2 border-t border-indigo-500/30"
                    style={{ color: editing.accentColor }}>
                    <span>TTC</span><span>{fmt(totals.ttc)} €</span>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <button type="button" onClick={() => setPreview(editing)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-white text-sm shadow-lg transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${editing.accentColor}, #8b5cf6)` }}>
                    <Eye className="w-4 h-4" /> Aperçu / Imprimer
                  </button>
                  <button type="button" onClick={() => setSendModal(editing)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">
                    <Send className="w-4 h-4" /> Envoyer par email
                  </button>
                  {/* Save as Template */}
                  {!showSaveTemplate ? (
                    <button type="button" onClick={() => setShowSaveTemplate(true)}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-2xl text-xs font-semibold border transition-colors ${isDark ? 'border-white/10 text-gray-400 hover:bg-white/[0.05]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      <Bookmark className="w-3.5 h-3.5" /> Sauvegarder comme modèle
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                        placeholder="Nom du modèle…"
                        className={`flex-1 text-xs px-2 py-1.5 rounded-xl border outline-none ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} />
                      <button type="button" onClick={saveAsTemplate} disabled={!templateName.trim()}
                        className="px-2.5 py-1.5 rounded-xl bg-violet-500 text-white text-xs font-bold disabled:opacity-50 hover:bg-violet-600 transition-colors">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(''); }}
                        className={`px-2 py-1.5 rounded-xl text-gray-400 transition-colors ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-gray-100'}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {/* History */}
                {(editing.statusHistory ?? []).length > 0 && (
                  <div className="mt-4">
                    <button type="button" onClick={() => setShowHistory(h => !h)}
                      className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}>
                      <History className="w-3.5 h-3.5" /> Historique {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1.5 overflow-hidden">
                          {[...(editing.statusHistory ?? [])].reverse().map((h, i) => {
                            const m = STATUS_META[h.status];
                            const HIcon = m.icon;
                            return (
                              <div key={i} className="flex items-start gap-2">
                                <HIcon className={`w-3 h-3 mt-0.5 shrink-0 ${m.color.split(' ')[0]}`} />
                                <div>
                                  <span className={`text-[11px] font-bold ${m.color.split(' ')[0]}`}>{m.label}</span>
                                  <span className={`text-[10px] ml-1.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {h.note && <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{h.note}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {/* Partial Payments */}
                <div className={`mt-4 pt-4 border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                  <button onClick={() => setShowPartialPayment(p => !p)}
                    className={`flex items-center justify-between w-full text-xs font-semibold transition-colors ${isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-teal-500" />
                      Paiements reçus
                      {(editing.partialPayments ?? []).length > 0 && (
                        <span className="text-[10px] bg-teal-500/10 text-teal-400 px-1.5 py-0.5 rounded-full font-bold">
                          {fmt(calcAmountPaid(editing))} €
                        </span>
                      )}
                    </span>
                    {showPartialPayment ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <AnimatePresence>
                    {showPartialPayment && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 space-y-2 overflow-hidden">
                        {(editing.partialPayments ?? []).map((pp, i) => (
                          <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-2 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}`}>
                            <div>
                              <span className="font-bold text-teal-400">{fmt(pp.amount)} €</span>
                              <span className={`ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {new Date(pp.date).toLocaleDateString('fr-FR')}
                              </span>
                              {pp.note && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{pp.note}</p>}
                            </div>
                            <button onClick={() => removePartialPayment(i)} className="text-gray-500 hover:text-rose-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {(editing.partialPayments ?? []).length > 0 && editing.status !== 'paid' && (
                          <div className={`flex justify-between text-xs font-bold px-2.5 py-1 rounded-lg ${isDark ? 'bg-amber-500/5' : 'bg-amber-50'}`}>
                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Reste dû</span>
                            <span className="text-amber-400">{fmt(calcAmountDue(editing))} €</span>
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <input type="number" min="0" step="0.01" value={newPaymentAmount}
                            onChange={e => setNewPaymentAmount(e.target.value)}
                            placeholder="Montant €"
                            className={`flex-1 text-xs px-2.5 py-1.5 rounded-xl border outline-none ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} />
                          <input value={newPaymentNote} onChange={e => setNewPaymentNote(e.target.value)}
                            placeholder="Note…"
                            className={`flex-1 text-xs px-2.5 py-1.5 rounded-xl border outline-none ${isDark ? 'bg-white/[0.05] border-white/10 text-white placeholder-gray-600' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`} />
                          <button onClick={addPartialPayment} disabled={!newPaymentAmount}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-500/10 text-teal-400 text-xs font-bold hover:bg-teal-500/20 disabled:opacity-50 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Toast overlay */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-bold shadow-xl pointer-events-none">
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview modal */}
        {preview && (
          <PreviewModal invoice={preview} onClose={() => setPreview(null)}
            properties={properties} bookings={bookings} />
        )}

        {/* Send modal */}
        {sendModal && (
          <SendModal invoice={sendModal} onClose={() => setSendModal(null)}
            onSent={(note) => handleSent(sendModal.id, note)} />
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Factures &amp; Devis
          </h2>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {invoices.filter(i => (i.documentType ?? 'invoice') === 'invoice').length} facture{invoices.filter(i => (i.documentType ?? 'invoice') === 'invoice').length !== 1 ? 's' : ''}
            &nbsp;&bull;&nbsp;
            {invoices.filter(i => i.documentType === 'quote').length} devis
            &nbsp;&bull;&nbsp;{fmt(stats.revenue)} € encaiss&eacute;s
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import */}
          <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-colors ${
            isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
            <Upload className="w-4 h-4" /> Importer
            <input type="file" accept=".json" className="hidden" onChange={importJSON} />
          </label>
          {/* Export JSON */}
          {invoices.length > 0 && (
            <button onClick={exportJSON} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
              <Download className="w-4 h-4" /> JSON
            </button>
          )}
          {/* Export CSV */}
          {invoices.length > 0 && (
            <button onClick={exportCSV} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
              <FileDown className="w-4 h-4" /> CSV
            </button>
          )}
          {/* Balance clients toggle */}
          {invoices.length > 0 && (
            <button onClick={() => setShowClientBalance(b => !b)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                showClientBalance
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                  : isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              <Users className="w-4 h-4" /> Balance clients
            </button>
          )}
          {/* Analytics toggle */}
          {invoices.length > 0 && (
            <button onClick={() => setShowAnalytics(b => !b)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                showAnalytics
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : isDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}>
              <PieChart className="w-4 h-4" /> Analytiques
            </button>
          )}
          <button onClick={createNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105">
            <Plus className="w-4 h-4" /> Nouvelle facture
          </button>
          <button onClick={() => { const inv = { ...emptyInvoice(invoices), documentType: 'quote' as InvoiceDocType, number: nextInvoiceNumber(invoices, 'quote') }; setEditing(inv); setView('editor'); setNumberPrefix('DEV'); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg hover:shadow-amber-500/30 transition-all hover:scale-105">
            <Plus className="w-4 h-4" /> Nouveau devis
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue encaissé */}
        <motion.div whileHover={{ scale: 1.02 }}
          className={`relative overflow-hidden rounded-2xl p-4 border ${isDark ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'}`}>
          <div className="absolute top-2 right-3 text-3xl opacity-10 select-none">💰</div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Encaissé</p>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(stats.revenue)} €</p>
          <div className="flex items-center gap-1.5 mt-2">
            {stats.trend.percent >= 0
              ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
            <span className={`text-xs font-semibold ${stats.trend.percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.trend.percent >= 0 ? '+' : ''}{stats.trend.percent}% vs mois préc.
            </span>
          </div>
        </motion.div>

        {/* En attente */}
        <motion.div whileHover={{ scale: 1.02 }}
          className={`relative overflow-hidden rounded-2xl p-4 border ${isDark ? 'bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-amber-500/20' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
          <div className="absolute top-2 right-3 text-3xl opacity-10 select-none">⏳</div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>En attente</p>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(stats.pending)} €</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-amber-400/70' : 'text-amber-600'}`}>
            {stats.sent + stats.overdue} facture{stats.sent + stats.overdue !== 1 ? 's' : ''} • {stats.overdue} en retard
          </p>
        </motion.div>

        {/* Taux conversion */}
        <motion.div whileHover={{ scale: 1.02 }}
          className={`relative overflow-hidden rounded-2xl p-4 border ${isDark ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'}`}>
          <div className="absolute top-2 right-3 text-3xl opacity-10 select-none">🎯</div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Taux de conversion</p>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.conversion}%</p>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.conversion}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${stats.conversion >= 70 ? 'bg-emerald-400' : stats.conversion >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
            />
          </div>
        </motion.div>

        {/* Brouillons / À envoyer */}
        <motion.div whileHover={{ scale: 1.02 }}
          className={`relative overflow-hidden rounded-2xl p-4 border ${isDark ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/50 border-white/[0.06]' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'}`}>
          <div className="absolute top-2 right-3 text-3xl opacity-10 select-none">📋</div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Brouillons</p>
          <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.draft}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {stats.total} total • {stats.paid} payée{stats.paid !== 1 ? 's' : ''}
          </p>
        </motion.div>
      </div>

      {/* Client Balance Panel */}
      <AnimatePresence>
        {showClientBalance && (
          <motion.div
            key="client-balance"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`${card} overflow-hidden`}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                  <Users className="w-4 h-4 text-indigo-500" />
                </div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Balance par client</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {calcClientBalance(invoices).length} client{calcClientBalance(invoices).length > 1 ? 's' : ''}
                </span>
              </div>
              {calcClientBalance(invoices).length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Aucune donnée client</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {calcClientBalance(invoices).map(c => (
                    <div key={c.email || c.name}
                      className={`rounded-xl p-3 border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name || '—'}</p>
                          {c.email && <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.email}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {c.due > 0 && (
                            <p className="text-sm font-black text-amber-400">{fmt(c.due)} €</p>
                          )}
                          {c.paid > 0 && (
                            <p className="text-xs font-semibold text-emerald-400">payé : {fmt(c.paid)} €</p>
                          )}
                          {c.due === 0 && c.paid === 0 && (
                            <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</p>
                          )}
                        </div>
                      </div>
                      {c.due > 0 && (
                        <div className="mt-2 w-full h-1 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (c.due/(c.due+c.paid||1))*100)}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div key="analytics"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`${card} overflow-hidden`}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                  <PieChart className="w-4 h-4 text-emerald-500" />
                </div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Tableau analytique</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Monthly trend */}
                <div className={`rounded-xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tendance mensuelle</span>
                  </div>
                  <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(stats.trend.current)} €</div>
                  <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${
                    stats.trend.percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {stats.trend.percent >= 0
                      ? <ArrowUpRight className="w-3.5 h-3.5" />
                      : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(stats.trend.percent)}% vs mois dernier ({fmt(stats.trend.previous)} €)
                  </div>
                </div>
                {/* Status distribution */}
                <div className={`sm:col-span-2 rounded-xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Répartition par statut</span>
                  </div>
                  <div className="space-y-2">
                    {stats.statusDist.map(({ status, count, amount }) => {
                      const meta = STATUS_META[status];
                      const SIcon = meta.icon;
                      const maxAmount = Math.max(...stats.statusDist.map(s => s.amount), 1);
                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 w-24 shrink-0">
                            <SIcon className={`w-3 h-3 ${meta.color.split(' ')[0]}`} />
                            <span className={`text-xs font-semibold ${meta.color.split(' ')[0]}`}>{meta.label}</span>
                          </div>
                          <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-gray-200'}`}>
                            <div className={`h-full rounded-full ${meta.color.split(' ')[0].replace('text-','bg-')}`}
                              style={{ width: `${Math.max(4, (amount / maxAmount) * 100)}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-24 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {fmt(amount)} € <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>({count})</span>
                          </span>
                        </div>
                      );
                    })}
                    {stats.statusDist.length === 0 && (
                      <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Aucune donnée</p>
                    )}
                  </div>
                </div>

                {/* Top clients */}
                {stats.topClients.length > 0 && (
                  <div className={`sm:col-span-3 rounded-xl p-4 ${isDark ? 'bg-white/[0.03] border border-white/[0.06]' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Top clients (encaissés)</span>
                    </div>
                    <div className="space-y-2">
                      {stats.topClients.map((c, idx) => {
                        const maxRev = stats.topClients[0].revenue;
                        return (
                          <div key={c.email || c.name} className="flex items-center gap-3">
                            <span className={`w-5 text-xs font-black text-center ${idx === 0 ? 'text-amber-400' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{c.name}</p>
                              <div className={`mt-0.5 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-gray-200'}`}>
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                              </div>
                            </div>
                            <span className={`text-xs font-bold w-20 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{fmt(c.revenue)} €</span>
                            <span className={`text-[10px] w-14 text-right ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{c.count} fact.</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI strip + mini chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Encaissé',    value: `${fmt(stats.revenue)} €`,  color: 'text-emerald-500', icon: TrendingUp },
            { label: 'En attente',  value: `${fmt(stats.pending)} €`,  color: 'text-amber-500',   icon: Clock },
            { label: 'Payées',      value: stats.paid,                 color: 'text-emerald-400', icon: CheckCircle },
            { label: 'En retard',   value: stats.overdue,              color: 'text-rose-500',    icon: AlertCircle },
            { label: 'Conversion',  value: `${stats.conversion}%`,     color: 'text-indigo-400',  icon: Target },
          ].map(({ label: lbl, value, color, icon: Icon }) => (
            <div key={lbl} className={`${card} p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className={`text-xs font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{lbl}</span>
              </div>
              <div className={`text-2xl font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className={`${card} p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Revenus encaissés (6 mois)</span>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={revenueChart} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mois" tick={{ fontSize: 9, fill: isDark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: isDark ? '#1a1a2e' : '#fff', border: 'none', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${fmt(Number(v ?? 0))} €`, 'Encaissé']}
              />
              <Area type="monotone" dataKey="montant" stroke="#6366f1" strokeWidth={2} fill="url(#invGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="N° ou client…" className={`${input} pl-9`} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${input} w-auto`}>
          <option value="all">Tous statuts</option>
          {(Object.keys(STATUS_META) as InvoiceStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>

        {/* Period filter */}
        <div className={`flex items-center gap-1 rounded-xl border px-2 py-1 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
          {(['all', 'month', 'quarter', 'year'] as PeriodFilter[]).map((p, idx) => {
            const labels = ['Tout', 'Ce mois', 'Trimestre', 'Cette année'];
            return (
              <button key={p} onClick={() => setPeriodFilter(p)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  periodFilter === p
                    ? 'bg-violet-500 text-white'
                    : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-200'
                }`}>{labels[idx]}</button>
            );
          })}
        </div>

        {/* Sort buttons */}
        <div className={`flex items-center gap-1 rounded-xl border px-2 py-1 ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'}`}>
          {(['date','amount','client','status'] as SortField[]).map(f => (
            <button key={f} onClick={() => toggleSort(f)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                sortField === f
                  ? 'bg-indigo-500 text-white'
                  : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-200'
              }`}>
              {f === 'date' ? 'Date' : f === 'amount' ? 'Montant' : f === 'client' ? 'Client' : 'Statut'}
              {sortField === f && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className={`${card} p-16 text-center`}>
          <FileText className={`w-14 h-14 mx-auto mb-4 opacity-20 ${isDark ? 'text-white' : 'text-gray-500'}`} />
          <p className={`text-lg font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {invoices.length === 0 ? 'Aucune facture. Créez-en une !' : 'Aucun résultat.'}
          </p>
          {invoices.length === 0 && (
            <button onClick={createNew} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> Créer ma première facture
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(inv => {
              const totals = calcTotals(inv.lines);
              const meta   = STATUS_META[inv.status];
              const Icon   = meta.icon;
              const prop   = properties.find(p => p.id === inv.propertyId);
              return (
                <motion.div key={inv.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className={`${card} p-4 flex flex-wrap items-center justify-between gap-4 hover:border-indigo-500/30 transition-all cursor-pointer`}
                  onClick={() => { setEditing(inv); setView('editor'); }}>

                  <div className="flex items-center gap-4 min-w-0">
                    {/* Color accent dot */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${inv.accentColor}18` }}>
                      <FileText className="w-5 h-5" style={{ color: inv.accentColor }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{inv.number}</span>
                        {/* Facture / Devis badge */}
                        {(inv.documentType ?? 'invoice') === 'quote' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400">
                            <FileText className="w-3 h-3" /> Devis
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.color}`}>
                          <Icon className="w-3 h-3" />{meta.label}
                        </span>
                        {prop && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{prop.name}</span>}
                        {inv.clientRef && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                            <Tag className="w-2.5 h-2.5 inline mr-0.5" />{inv.clientRef}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/[0.04] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                          {inv.lines.length} ligne{inv.lines.length > 1 ? 's' : ''}
                        </span>
                        {/* Layout badge */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isDark ? 'bg-white/[0.04] text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                          {inv.layout === 'modern' ? <Layout className="w-2.5 h-2.5" /> : inv.layout === 'minimal' ? <FileText className="w-2.5 h-2.5" /> : <Layers className="w-2.5 h-2.5" />}
                          {inv.layout ?? 'classic'}
                        </span>
                        {/* Recurring badge */}
                        {inv.isRecurring && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" /> Récurrente
                          </span>
                        )}
                        {/* Partial payment badge */}
                        {(inv.partialPayments ?? []).length > 0 && inv.status !== 'paid' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 flex items-center gap-1">
                            <CreditCard className="w-2.5 h-2.5" /> Acompte versé
                          </span>
                        )}
                        <DueBadge inv={inv} />
                        {needsReminder(inv) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 flex items-center gap-1">
                            <Bell className="w-2.5 h-2.5" /> Relance
                          </span>
                        )}
                        {/* Tag badges */}
                        {(inv.tags ?? []).map(tag => (
                          <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {inv.clientName || 'Sans client'} &bull; émise le {new Date(inv.issueDate).toLocaleDateString('fr-FR')}
                        {inv.dueDate && <> &bull; éch. {new Date(inv.dueDate).toLocaleDateString('fr-FR')}</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                    <div className="text-right">
                      <div className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{fmt(calcTotalsWithDiscount(inv.lines, inv.globalDiscount).ttc)} €</div>
                      <div className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>TTC</div>
                    </div>

                    {/* Quick status change */}
                    <select value={inv.status} onChange={e => changeStatus(inv.id, e.target.value as InvoiceStatus)}
                      className={`text-xs px-2 py-1 rounded-lg border outline-none ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                      {(Object.keys(STATUS_META) as InvoiceStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_META[s].label}</option>
                      ))}
                    </select>

                    <button type="button" onClick={() => setPreview(inv)} title="Aperçu"
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setSendModal(inv)} title="Envoyer"
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-blue-500/10 text-blue-400' : 'hover:bg-blue-50 text-blue-500'}`}>
                      <Send className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditing(inv); setView('editor'); }} title="Modifier"
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-indigo-500/10 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'}`}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => duplicateInvoice(inv)} title="Dupliquer"
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <Copy className="w-4 h-4" />
                    </button>
                    {inv.isRecurring && (
                      <button onClick={() => renewInvoice(inv)} title="Renouveler (récurrente)"
                        className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-violet-500/10 text-violet-400' : 'hover:bg-violet-50 text-violet-600'}`}>
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteInvoice(inv.id)} title="Supprimer"
                      className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-rose-500/10 text-rose-400' : 'hover:bg-rose-50 text-rose-500'}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button title="Copier le lien" onClick={() => {
                      const url = `${window.location.origin}/invoices/${inv.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setToast('Lien copié !');
                        setTimeout(() => setToast(null), 2500);
                      });
                    }} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                      <Link2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Toast overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-2xl bg-emerald-500 text-white text-sm font-bold shadow-xl pointer-events-none">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint */}
      {view === 'list' && invoices.length === 0 && (
        <p className={`text-center text-xs mt-2 ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
          Appuyez sur <kbd className={`mx-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-500'}`}>N</kbd> pour créer une facture
        </p>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal invoice={preview} onClose={() => setPreview(null)}
          properties={properties} bookings={bookings} />
      )}

      {/* Send modal */}
      {sendModal && (
        <SendModal invoice={sendModal} onClose={() => setSendModal(null)}
          onSent={(note) => handleSent(sendModal.id, note)} />
      )}
    </div>
  );
}
