'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Euro, Calendar, Users, Wrench, Star, Building2,
  Lightbulb, BarChart2, Zap, ChevronRight, RefreshCw, Copy, Check,
  MessageCircle, Bot, X, Minimize2, Maximize2
} from 'lucide-react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';

/* ═══ TYPES ═══ */
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
  data?: ContextData;
}

interface QuickAction {
  label: string;
  query: string;
  icon: string;
}

interface ContextData {
  type: 'metric' | 'list' | 'alert' | 'insight';
  value?: string | number;
  color?: string;
}

/* ═══ HELPERS ═══ */
function uid() { return Math.random().toString(36).slice(2); }
function fdate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }
function fdates(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }
function ddays(a: string, b: string) { return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); }
function euro(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n); }

const SEASON: Record<number, number> = { 0: .75, 1: .80, 2: .90, 3: 1.00, 4: 1.05, 5: 1.15, 6: 1.30, 7: 1.35, 8: 1.20, 9: 1.05, 10: .85, 11: .80 };
const MFR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* ═══ QUICK SUGGESTIONS ═══ */
const SUGGESTIONS: QuickAction[] = [
  { label: 'Résumé du mois', query: 'Fais-moi un résumé de ce mois', icon: '📊' },
  { label: 'Revenus cette année', query: 'Quels sont mes revenus cette année ?', icon: '💶' },
  { label: 'Prochains check-ins', query: 'Qui arrive dans les 7 prochains jours ?', icon: '🔑' },
  { label: 'Problèmes urgents', query: 'Quels sont mes problèmes urgents ?', icon: '🚨' },
  { label: 'Meilleure propriété', query: 'Quelle est ma meilleure propriété ?', icon: '🏆' },
  { label: 'Avis sans réponse', query: 'Quels avis n\'ont pas encore de réponse ?', icon: '⭐' },
  { label: 'Taux occupation', query: 'Quel est mon taux d\'occupation actuel ?', icon: '📅' },
  { label: 'Conseils tarifs', query: 'Dois-je ajuster mes tarifs ce mois-ci ?', icon: '💡' },
];

/* ═══ AI ENGINE ═══ */
function buildContext(
  properties: ReturnType<typeof useBNB>['properties'],
  bookings: ReturnType<typeof useBNB>['bookings'],
  guests: ReturnType<typeof useBNB>['guests'],
  maintenanceTasks: ReturnType<typeof useBNB>['maintenanceTasks'],
  reviews: ReturnType<typeof useBNB>['reviews'],
  inventory: ReturnType<typeof useBNB>['inventory'],
  getOccupancyRate: ReturnType<typeof useBNB>['getOccupancyRate'],
  getRevenueByProperty: ReturnType<typeof useBNB>['getRevenueByProperty'],
) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const mo = now.getMonth();
  const yr = now.getFullYear();
  const mStart = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
  const mEnd = `${yr}-${String(mo + 1).padStart(2, '0')}-${new Date(yr, mo + 1, 0).getDate()}`;
  const yStart = `${yr}-01-01`;
  const yEnd = `${yr}-12-31`;
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const d7f = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
  const d30f = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

  // Revenue
  const revMonth = properties.reduce((s, p) => s + getRevenueByProperty(p.id, mStart, mEnd), 0);
  const revYear = properties.reduce((s, p) => s + getRevenueByProperty(p.id, yStart, yEnd), 0);
  const revPrevMonth = (() => {
    const pm = mo === 0 ? 11 : mo - 1;
    const py = mo === 0 ? yr - 1 : yr;
    const s = `${py}-${String(pm + 1).padStart(2, '0')}-01`;
    const e = `${py}-${String(pm + 1).padStart(2, '0')}-${new Date(py, pm + 1, 0).getDate()}`;
    return properties.reduce((sum, p) => sum + getRevenueByProperty(p.id, s, e), 0);
  })();

  // Occupancy
  const avgOcc = properties.length > 0
    ? Math.round(properties.reduce((s, p) => s + getOccupancyRate(p.id, d30, today), 0) / properties.length)
    : 0;

  // Bookings
  const upcoming7 = bookings.filter(b => b.checkIn >= today && b.checkIn <= d7f && (b.status === 'confirmed' || b.status === 'completed'));
  const upcoming30 = bookings.filter(b => b.checkIn >= today && b.checkIn <= d30f && (b.status === 'confirmed' || b.status === 'completed'));
  const activeBookings = bookings.filter(b => b.checkIn <= today && b.checkOut >= today && b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const totalBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;

  // Maintenance
  const urgentTasks = maintenanceTasks.filter(t => t.status !== 'completed' && t.priority === 'urgent');
  const overdueTasks = maintenanceTasks.filter(t => t.status !== 'completed' && new Date(t.scheduledDate) < now);
  const pendingTasks = maintenanceTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  // Reviews
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const unanswered = reviews.filter(r => !r.response && r.rating <= 3);
  const recentReviews = reviews.filter(r => r.createdAt >= d30).slice(0, 5);

  // Inventory
  const lowStock = inventory.filter(i => i.quantity <= i.minimumQuantity);

  // Properties perf
  const propPerf = properties.map(p => ({
    ...p,
    revMonth: getRevenueByProperty(p.id, mStart, mEnd),
    revYear: getRevenueByProperty(p.id, yStart, yEnd),
    occ: Math.round(getOccupancyRate(p.id, d30, today)),
  })).sort((a, b) => b.revMonth - a.revMonth);

  // Seasonal advice
  const sf = SEASON[mo];
  const seasonAdvice = sf >= 1.15 ? 'haute saison — tarifs +' : sf <= 0.85 ? 'basse saison — tarifs à adapter' : 'saison intermédiaire';

  return {
    now, today, mo, yr, mStart, mEnd, yStart, yEnd, d30, d7f, d30f,
    revMonth, revYear, revPrevMonth, avgOcc,
    upcoming7, upcoming30, activeBookings, pendingBookings, totalBookings,
    urgentTasks, overdueTasks, pendingTasks,
    avgRating, unanswered, recentReviews,
    lowStock, propPerf, sf, seasonAdvice,
    properties, bookings, guests, maintenanceTasks, reviews, inventory,
    getRevenueByProperty, getOccupancyRate,
  };
}

type Ctx = ReturnType<typeof buildContext>;

/* ═══ RESPONSE GENERATOR ═══ */
function generateResponse(query: string, ctx: Ctx): { content: string; actions?: QuickAction[] } {
  const q = query.toLowerCase();
  const {
    revMonth, revYear, revPrevMonth, avgOcc,
    upcoming7, upcoming30, activeBookings, pendingBookings,
    urgentTasks, overdueTasks, pendingTasks,
    avgRating, unanswered, recentReviews,
    lowStock, propPerf, sf, seasonAdvice,
    mo, yr, today,
    properties, bookings, reviews, inventory, maintenanceTasks,
    getRevenueByProperty,
  } = ctx;

  // ── RÉSUMÉ ──
  if (q.includes('résumé') || q.includes('resume') || q.includes('bilan') || q.includes('comment ça va') || q.includes('situation')) {
    const revDelta = revPrevMonth > 0 ? Math.round(((revMonth - revPrevMonth) / revPrevMonth) * 100) : 0;
    const alerts = [
      urgentTasks.length > 0 && `⚠️ ${urgentTasks.length} tâche${urgentTasks.length > 1 ? 's' : ''} urgente${urgentTasks.length > 1 ? 's' : ''}`,
      unanswered.length > 0 && `⭐ ${unanswered.length} avis négatif${unanswered.length > 1 ? 's' : ''} sans réponse`,
      lowStock.length > 0 && `📦 ${lowStock.length} article${lowStock.length > 1 ? 's' : ''} en rupture`,
      pendingBookings.length > 0 && `📋 ${pendingBookings.length} réservation${pendingBookings.length > 1 ? 's' : ''} en attente`,
    ].filter(Boolean);

    return {
      content: `**📊 Résumé — ${MFR[mo]} ${yr}**\n\n**Revenus du mois :** ${euro(revMonth)} ${revDelta >= 0 ? `(+${revDelta}% vs mois précédent 📈)` : `(${revDelta}% vs mois précédent 📉)`}\n**Revenus YTD :** ${euro(revYear)}\n**Taux d'occupation :** ${avgOcc}% sur 30 jours\n**Note moyenne :** ${avgRating}★ sur ${reviews.length} avis\n**Biens actifs :** ${properties.filter(p => p.status === 'active').length}/${properties.length}\n**Réservations à venir :** ${upcoming30.length} dans les 30 prochains jours\n\n${alerts.length > 0 ? `**🔔 Points d'attention :**\n${alerts.join('\n')}` : '**✅ Aucun point critique détecté.**'}`,
      actions: [
        { label: 'Détail revenus', query: 'Quels sont mes revenus cette année ?', icon: '💶' },
        { label: 'Urgences', query: 'Quels sont mes problèmes urgents ?', icon: '🚨' },
        { label: 'Prochains séjours', query: 'Qui arrive dans les 7 prochains jours ?', icon: '🔑' },
      ],
    };
  }

  // ── REVENUS ──
  if (q.includes('revenu') || q.includes('chiffre') || q.includes('argent') || q.includes('gagn')) {
    const best = propPerf[0];
    const worst = propPerf[propPerf.length - 1];
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const s = `${yr}-${String(i + 1).padStart(2, '0')}-01`;
      const e = `${yr}-${String(i + 1).padStart(2, '0')}-${new Date(yr, i + 1, 0).getDate()}`;
      return { m: MFR[i], v: Math.round(properties.reduce((sum, p) => sum + getRevenueByProperty(p.id, s, e), 0)) };
    });
    const bestMonth = monthly.reduce((a, b) => b.v > a.v ? b : a, { m: '', v: 0 });
    const details = propPerf.map(p => `• **${p.name}** : ${euro(p.revMonth)} ce mois · ${euro(p.revYear)} annuel`).join('\n');

    return {
      content: `**💶 Revenus ${yr}**\n\n**Total annuel :** ${euro(revYear)}\n**Ce mois (${MFR[mo]}) :** ${euro(revMonth)}\n**Meilleur mois :** ${bestMonth.m} — ${euro(bestMonth.v)}\n\n**Détail par bien :**\n${details}\n\n**Meilleure performance :** ${best?.name} (${euro(best?.revMonth || 0)}/mois)\n${worst && worst.revMonth < best?.revMonth / 2 ? `**⚠️ Sous-performance :** ${worst.name} — envisagez une révision de la stratégie tarifaire.` : ''}`,
      actions: [
        { label: 'Conseils tarifs', query: 'Dois-je ajuster mes tarifs ce mois-ci ?', icon: '💡' },
        { label: 'Occupation', query: 'Quel est mon taux d\'occupation actuel ?', icon: '📅' },
      ],
    };
  }

  // ── OCCUPATION ──
  if (q.includes('occupation') || q.includes('taux') || q.includes('disponible') || q.includes('libre') || q.includes('vide')) {
    const details = propPerf.map(p => {
      const bar = '█'.repeat(Math.round(p.occ / 10)) + '░'.repeat(10 - Math.round(p.occ / 10));
      return `• **${p.name}** : ${bar} ${p.occ}%`;
    }).join('\n');
    const advice = avgOcc >= 80 ? '🔥 Occupation excellente ! Vous pouvez augmenter vos tarifs.' : avgOcc >= 60 ? '📈 Bonne occupation. Objectif : 75-85%.' : '⚠️ Occupation faible. Envisagez une promotion ou une révision tarifaire.';

    return {
      content: `**📅 Taux d'occupation — 30 derniers jours**\n\n**Moyenne portfolio :** ${avgOcc}%\n${advice}\n\n**Par propriété :**\n${details}\n\n**Prochains 30 jours :** ${upcoming30.length} réservation${upcoming30.length > 1 ? 's' : ''} confirmée${upcoming30.length > 1 ? 's' : ''}\n**En cours :** ${activeBookings.length} séjour${activeBookings.length > 1 ? 's' : ''} actif${activeBookings.length > 1 ? 's' : ''}`,
      actions: [
        { label: 'Revenus', query: 'Quels sont mes revenus cette année ?', icon: '💶' },
        { label: 'Créneaux vides', query: 'Quels créneaux sont vides dans les 30 prochains jours ?', icon: '📅' },
      ],
    };
  }

  // ── CHECK-INS ──
  if (q.includes('arrive') || q.includes('check-in') || q.includes('checkin') || q.includes('prochain') || q.includes('7 jour') || q.includes('semaine')) {
    if (upcoming7.length === 0) {
      return {
        content: `**🔑 Check-ins — 7 prochains jours**\n\nAucune arrivée prévue dans les 7 prochains jours.\n\n${upcoming30.length > 0 ? `Les prochaines arrivées sont dans les 30 jours : **${upcoming30.length} réservation${upcoming30.length > 1 ? 's' : ''}**.` : 'Aucune réservation dans les 30 prochains jours non plus. Pensez à activer des promotions !'}`,
        actions: [{ label: 'Créneaux vides', query: 'Quels créneaux sont vides dans les 30 prochains jours ?', icon: '📅' }],
      };
    }
    const list = upcoming7.map(b => {
      const prop = ctx.properties.find(p => p.id === b.propertyId);
      const nights = ddays(b.checkIn, b.checkOut);
      return `• **${b.guestInfo?.name || 'Voyageur'}** → ${prop?.name || '?'} · ${fdate(b.checkIn)} (${nights} nuit${nights > 1 ? 's' : ''}) · ${euro(b.totalPrice)}`;
    }).join('\n');
    return {
      content: `**🔑 Check-ins — 7 prochains jours**\n\n${upcoming7.length} arrivée${upcoming7.length > 1 ? 's' : ''} prévue${upcoming7.length > 1 ? 's' : ''} :\n\n${list}\n\n${activeBookings.length > 0 ? `**En ce moment :** ${activeBookings.length} séjour${activeBookings.length > 1 ? 's' : ''} en cours.` : ''}`,
      actions: [
        { label: 'Toutes les réservations', query: 'Résumé du mois', icon: '📊' },
        { label: 'Maintenance urgente', query: 'Quels sont mes problèmes urgents ?', icon: '🚨' },
      ],
    };
  }

  // ── CRÉNEAUX VIDES ──
  if (q.includes('créneau') || q.includes('vide') || q.includes('disponib') || q.includes('vac')) {
    const gaps = ctx.properties.map(p => {
      const pb = bookings.filter(b => b.propertyId === p.id && b.checkIn >= today && b.checkIn <= ctx.d30f && (b.status === 'confirmed' || b.status === 'completed'));
      const cov = pb.reduce((s, b) => s + ddays(b.checkIn, b.checkOut), 0);
      const vac = Math.max(0, 30 - cov);
      return { name: p.name, vac, cov, price: p.price };
    }).filter(g => g.vac >= 3);

    if (gaps.length === 0) return { content: '**📅 Créneaux disponibles**\n\nToutes vos propriétés sont bien remplies dans les 30 prochains jours ! Excellent taux de remplissage. 🎉', actions: [] };

    const list = gaps.map(g => `• **${g.name}** : ${g.vac} jours vides sur 30 → manque à gagner ~${euro(g.vac * g.price * 0.75)}`).join('\n');
    const total = gaps.reduce((s, g) => s + g.vac * g.price * 0.75, 0);

    return {
      content: `**📅 Créneaux vides — 30 prochains jours**\n\n${list}\n\n**Manque à gagner total estimé : ${euro(total)}**\n\n💡 **Conseil :** Une promotion de -10% sur ces créneaux pourrait générer ~${euro(total * 0.9)} vs 0€ sans action.`,
      actions: [{ label: 'Conseils tarifs', query: 'Dois-je ajuster mes tarifs ce mois-ci ?', icon: '💡' }],
    };
  }

  // ── URGENCES / PROBLÈMES ──
  if (q.includes('urgent') || q.includes('problème') || q.includes('probleme') || q.includes('alerte') || q.includes('critique') || q.includes('attention')) {
    const issues: string[] = [];
    if (urgentTasks.length > 0) issues.push(`🔴 **${urgentTasks.length} maintenance urgente${urgentTasks.length > 1 ? 's' : ''} :** ${urgentTasks.map(t => t.title).join(', ')}`);
    if (overdueTasks.length > 0) issues.push(`🟠 **${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard** (planifiées mais non faites)`);
    if (unanswered.length > 0) issues.push(`🟡 **${unanswered.length} avis négatif${unanswered.length > 1 ? 's' : ''} sans réponse** — impact réputation`);
    if (lowStock.filter(i => i.quantity === 0).length > 0) issues.push(`🟠 **${lowStock.filter(i => i.quantity === 0).length} article${lowStock.filter(i => i.quantity === 0).length > 1 ? 's' : ''} en rupture totale** dans l'inventaire`);
    if (pendingBookings.length > 0) issues.push(`🟡 **${pendingBookings.length} réservation${pendingBookings.length > 1 ? 's' : ''} en attente** de confirmation`);

    if (issues.length === 0) return { content: '**✅ Aucun problème urgent détecté !**\n\nToutes vos opérations semblent sous contrôle. Continuez comme ça ! 🎉', actions: [{ label: 'Résumé complet', query: 'Fais-moi un résumé de ce mois', icon: '📊' }] };

    return {
      content: `**🚨 Points d'attention — ${issues.length} élément${issues.length > 1 ? 's' : ''}**\n\n${issues.join('\n\n')}`,
      actions: [
        { label: 'Résumé du mois', query: 'Fais-moi un résumé de ce mois', icon: '📊' },
        { label: 'Avis sans réponse', query: 'Quels avis n\'ont pas encore de réponse ?', icon: '⭐' },
      ],
    };
  }

  // ── MEILLEURE PROPRIÉTÉ ──
  if (q.includes('meilleur') || q.includes('top') || q.includes('performan') || q.includes('comparaison') || q.includes('classement')) {
    if (propPerf.length === 0) return { content: 'Aucune propriété trouvée.' };
    const medals = ['🥇', '🥈', '🥉'];
    const list = propPerf.map((p, i) => `${medals[i] || '  '} **${p.name}** : ${euro(p.revMonth)}/mois · ${p.occ}% occ · ${euro(p.revYear)} annuel`).join('\n');
    const best = propPerf[0];
    return {
      content: `**🏆 Classement des propriétés — ${MFR[mo]}**\n\n${list}\n\n**MVP du mois :** ${best.name} avec ${euro(best.revMonth)} de revenus et ${best.occ}% d'occupation.\n\n${propPerf.length > 1 && propPerf[propPerf.length - 1].revMonth < best.revMonth / 3 ? `💡 **${propPerf[propPerf.length - 1].name}** est en nette sous-performance. Une révision de la stratégie s'impose.` : ''}`,
      actions: [
        { label: 'Détail revenus', query: 'Quels sont mes revenus cette année ?', icon: '💶' },
        { label: 'Conseils tarifs', query: 'Dois-je ajuster mes tarifs ce mois-ci ?', icon: '💡' },
      ],
    };
  }

  // ── AVIS ──
  if (q.includes('avis') || q.includes('note') || q.includes('review') || q.includes('étoile') || q.includes('rating')) {
    const five = reviews.filter(r => r.rating === 5).length;
    const four = reviews.filter(r => r.rating >= 4).length;
    const bad = reviews.filter(r => r.rating <= 3);
    const recent = recentReviews.map(r => {
      const p = ctx.properties.find(pp => pp.id === r.propertyId);
      return `• **${r.rating}★** — ${p?.name || '?'} · "${r.comment?.slice(0, 60)}${(r.comment?.length || 0) > 60 ? '…' : ''}"${r.response ? ' ✅ répondu' : ' ⏳ sans réponse'}`;
    }).join('\n');

    return {
      content: `**⭐ Avis & Réputation**\n\n**Note moyenne :** ${avgRating}★ sur ${reviews.length} avis\n**5 étoiles :** ${five} avis (${reviews.length > 0 ? Math.round((five / reviews.length) * 100) : 0}%)\n**4+ étoiles :** ${four} avis\n**Avis négatifs (≤3★) :** ${bad.length} dont ${unanswered.length} sans réponse\n\n${recent.length > 0 ? `**Avis récents (30j) :**\n${recent}` : 'Aucun avis récent.'}${unanswered.length > 0 ? `\n\n⚠️ **Action requise :** ${unanswered.length} avis négatif${unanswered.length > 1 ? 's' : ''} sans réponse. Répondre dans les 48h peut augmenter votre note de +0.2★.` : ''}`,
      actions: unanswered.length > 0 ? [{ label: 'Avis sans réponse', query: 'Quels avis n\'ont pas encore de réponse ?', icon: '⭐' }] : [],
    };
  }

  // ── AVIS SANS RÉPONSE ──
  if (q.includes('sans réponse') || q.includes('répondr') || q.includes('repondr')) {
    if (unanswered.length === 0) return {
      content: '**✅ Tous les avis négatifs ont une réponse !**\n\nVotre gestion de la réputation est exemplaire. Les hôtes qui répondent à tous leurs avis ont en moyenne +0.3★.',
      actions: [{ label: 'Résumé', query: 'Fais-moi un résumé de ce mois', icon: '📊' }],
    };
    const list = unanswered.map(r => {
      const p = ctx.properties.find(pp => pp.id === r.propertyId);
      return `• **${r.rating}★** — ${p?.name} · ${fdates(r.createdAt)}\n  "${r.comment?.slice(0, 80)}${(r.comment?.length || 0) > 80 ? '…' : ''}"`;
    }).join('\n\n');
    return {
      content: `**⭐ ${unanswered.length} avis négatif${unanswered.length > 1 ? 's' : ''} sans réponse**\n\n${list}\n\n💡 **Conseil :** Répondez avec empathie en moins de 48h. Une bonne réponse à un avis négatif peut convaincre 70% des futurs voyageurs de réserver quand même.`,
    };
  }

  // ── TARIFS ──
  if (q.includes('tarif') || q.includes('prix') || q.includes('ajust') || q.includes('augment') || q.includes('baisser') || q.includes('saisonn')) {
    const sf = SEASON[mo];
    const advice = propPerf.map(p => {
      const suggested = Math.round((p.price * sf) / 5) * 5;
      const delta = suggested - p.price;
      const occ = p.occ;
      let rec = '';
      if (occ > 80 && delta > 0) rec = `🔥 Occupation forte — montez à **${suggested}€** (+${delta}€)`;
      else if (occ < 40) rec = `❄️ Occupation faible — envisagez **${Math.round(suggested * 0.92 / 5) * 5}€** pour stimuler les réservations`;
      else if (delta > 0) rec = `📈 Saisonnalité ${seasonAdvice} — **${suggested}€** recommandé (+${delta}€)`;
      else rec = `📉 Saisonnalité basse — **${suggested}€** recommandé (${delta}€)`;
      return `• **${p.name}** (actuel: ${p.price}€) → ${rec}`;
    }).join('\n');

    return {
      content: `**💡 Conseils tarifs — ${MFR[mo]} (coefficient saisonnier: ×${sf.toFixed(2)})**\n\nNous sommes en **${seasonAdvice}**.\n\n${advice}\n\n**Principe clé :** En haute saison (juil-août), augmentez 15-30%. En basse saison, préférez l'occupation à la marge.`,
      actions: [
        { label: 'Taux occupation', query: 'Quel est mon taux d\'occupation actuel ?', icon: '📅' },
        { label: 'Revenus', query: 'Quels sont mes revenus cette année ?', icon: '💶' },
      ],
    };
  }

  // ── MAINTENANCE ──
  if (q.includes('mainten') || q.includes('réparat') || q.includes('tâche') || q.includes('travaux')) {
    const all = maintenanceTasks.filter(t => t.status !== 'completed');
    if (all.length === 0) return { content: '**🔧 Maintenance**\n\n✅ Aucune tâche en cours. Tout est à jour !', actions: [] };
    const list = all.slice(0, 8).map(t => {
      const p = ctx.properties.find(pp => pp.id === t.propertyId);
      const late = new Date(t.scheduledDate) < new Date() ? ` ⚠️ RETARD (${ddays(t.scheduledDate, today)}j)` : '';
      return `• ${t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : '🟡'} **${t.title}** — ${p?.name || '?'}${late}`;
    }).join('\n');
    return {
      content: `**🔧 Maintenance — ${all.length} tâche${all.length > 1 ? 's' : ''} en cours**\n\n${list}\n\n${urgentTasks.length > 0 ? `⚠️ **${urgentTasks.length} urgente${urgentTasks.length > 1 ? 's' : ''}** — à traiter immédiatement.` : ''}${overdueTasks.length > 0 ? `\n📌 **${overdueTasks.length} en retard** — planifiez rapidement.` : ''}`,
    };
  }

  // ── INVENTAIRE ──
  if (q.includes('inventor') || q.includes('stock') || q.includes('rupture') || q.includes('fournitur')) {
    if (lowStock.length === 0) return { content: '**📦 Inventaire**\n\n✅ Tous les articles sont bien approvisionnés !', actions: [] };
    const list = lowStock.map(i => {
      const p = ctx.properties.find(pp => pp.id === i.propertyId);
      return `• ${i.quantity === 0 ? '🔴' : '🟡'} **${i.name}** — ${p?.name || '?'} : ${i.quantity}/${i.minimumQuantity} unités`;
    }).join('\n');
    return {
      content: `**📦 Stock critique — ${lowStock.length} article${lowStock.length > 1 ? 's' : ''}**\n\n${list}\n\n💡 Des articles manquants à l'arrivée d'un voyageur sont la 2ème cause d'avis négatifs.`,
    };
  }

  // ── VOYAGEURS ──
  if (q.includes('voyageur') || q.includes('client') || q.includes('guest')) {
    const guests = ctx.guests;
    const top = [...guests].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5);
    const vips = guests.filter(g => g.totalBookings >= 3);
    return {
      content: `**👤 Voyageurs**\n\n**Total :** ${guests.length} voyageurs\n**VIP (3+ séjours) :** ${vips.length}\n\n**Top voyageurs :**\n${top.map(g => `• **${g.name}** — ${g.totalBookings} séjour${g.totalBookings > 1 ? 's' : ''}${g.rating ? ` · ${g.rating}★` : ''}`).join('\n')}`,
    };
  }

  // ── PROPRIÉTÉS ──
  if (q.includes('propriét') || q.includes('logement') || q.includes('bien') || q.includes('appartement') || q.includes('maison')) {
    const list = propPerf.map(p => `• **${p.name}** — ${p.type} · ${p.city} · ${p.price}€/nuit · ${p.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}`).join('\n');
    return { content: `**🏠 Mes propriétés — ${ctx.properties.length} bien${ctx.properties.length > 1 ? 's' : ''}**\n\n${list}` };
  }

  // ── PRÉVISIONS ──
  if (q.includes('prévision') || q.includes('projection') || q.includes('prochains mois') || q.includes('futur')) {
    const projected = Array.from({ length: 3 }, (_, i) => {
      const pm = (mo + i + 1) % 12;
      const py = mo + i + 1 > 11 ? yr + 1 : yr;
      const sf = SEASON[pm];
      const base = revMonth > 0 ? revMonth : 1000;
      const proj = Math.round(base * sf);
      return `• **${MFR[pm]} ${py}** : ~${euro(proj)} (coeff ×${sf.toFixed(2)})`;
    });
    return {
      content: `**📈 Projections — 3 prochains mois**\n\nBasées sur vos revenus actuels (${euro(revMonth)}/mois) et les coefficients saisonniers :\n\n${projected.join('\n')}\n\n💡 Ces projections sont indicatives. La réalité dépendra de votre taux de remplissage et de vos ajustements tarifaires.`,
    };
  }

  // ── HELP / AIDE ──
  if (q.includes('aide') || q.includes('help') || q.includes('peux-tu') || q.includes('que peux') || q.includes('capacité')) {
    return {
      content: `**🧠 Voici ce que je peux analyser pour vous :**\n\n📊 **Résumé & bilan** — vue globale de votre activité\n💶 **Revenus** — détail par bien, mois, année\n📅 **Occupation** — taux et créneaux vides\n🔑 **Check-ins** — arrivées et départs à venir\n🚨 **Urgences** — problèmes critiques à traiter\n🏆 **Performance** — classement de vos biens\n⭐ **Avis** — réputation et avis sans réponse\n💡 **Tarifs** — conseils saisonniers et élasticité\n🔧 **Maintenance** — tâches en cours et retards\n📦 **Inventaire** — articles en rupture\n📈 **Prévisions** — projections des prochains mois\n\nPosez-moi n'importe quelle question sur vos données !`,
      actions: SUGGESTIONS.slice(0, 4),
    };
  }

  // ── FALLBACK ──
  return {
    content: `Je n'ai pas bien compris votre question. Voici ce que je peux analyser :\n\n• Revenus et performance financière\n• Taux d'occupation et créneaux vides\n• Prochains check-ins et séjours en cours\n• Problèmes urgents et alertes\n• Avis et réputation\n• Conseils tarifaires saisonniers\n• Maintenance et inventaire\n\nEssayez : *"Résumé du mois"*, *"Qui arrive cette semaine ?"*, ou *"Quels sont mes problèmes urgents ?"*`,
    actions: SUGGESTIONS.slice(0, 4),
  };
}

/* ═══ MARKDOWN RENDERER ═══ */
function Markdown({ text, isDark }: { text: string; isDark: boolean }) {
  const lines = text.split('\n');
  const T = isDark ? 'text-white/90' : 'text-gray-800';
  const M = isDark ? 'text-white/50' : 'text-gray-500';

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Heading
        if (line.startsWith('**') && line.endsWith('**') && !line.slice(2, -2).includes('**')) {
          return <p key={i} className={`font-bold text-sm ${T}`}>{line.slice(2, -2)}</p>;
        }
        // Normal line with bold parts
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className={line.startsWith('•') ? `${T} pl-1` : T}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className={isDark ? 'text-white' : 'text-gray-900'}>{part.slice(2, -2)}</strong>
                : <span key={j} className={part.startsWith('•') ? T : part.match(/^[🔴🟠🟡🟢✅⚠️📊💶📅🔑🚨🏆⭐💡🔧📦👤🏠📈🧠]/) ? '' : ''}>{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function SmartChatAssistant() {
  const { properties, bookings, guests, maintenanceTasks, reviews, inventory, getOccupancyRate, getRevenueByProperty } = useBNB();
  const { isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ctx = useMemo(() => buildContext(
    properties, bookings, guests, maintenanceTasks, reviews, inventory,
    getOccupancyRate, getRevenueByProperty,
  ), [properties, bookings, guests, maintenanceTasks, reviews, inventory, getOccupancyRate, getRevenueByProperty]);

  // Welcome message
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonjour' : 'Bonsoir';
    const urgentCount = ctx.urgentTasks.length + ctx.unanswered.length + ctx.lowStock.filter(i => i.quantity === 0).length;
    const welcome: Message = {
      id: uid(),
      role: 'assistant',
      timestamp: new Date(),
      content: `${greeting} ! Je suis votre assistant IA BNB 🧠\n\nJ'ai analysé vos données en temps réel :\n\n• **${properties.length} bien${properties.length > 1 ? 's' : ''}** · **${ctx.totalBookings} réservations** · **${ctx.avgRating}★** moy.\n• Revenus ce mois : **${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(ctx.revMonth)}**\n• Occupation : **${ctx.avgOcc}%** sur 30 jours${urgentCount > 0 ? `\n\n⚠️ **${urgentCount} point${urgentCount > 1 ? 's' : ''} critique${urgentCount > 1 ? 's' : ''}** à traiter.` : '\n\n✅ Aucun problème critique détecté.'}`,
      actions: SUGGESTIONS.slice(0, 4),
    };
    setMessages([welcome]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    const userMsg: Message = { id: uid(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    const res = generateResponse(text.trim(), ctx);
    const botMsg: Message = { id: uid(), role: 'assistant', content: res.content, timestamp: new Date(), actions: res.actions };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const copyMsg = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, ''));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const C = isDark ? 'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl' : 'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC = isDark ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl' : 'bg-gray-50 border border-gray-100 rounded-xl';
  const T = isDark ? 'text-white' : 'text-gray-900';
  const M = isDark ? 'text-white/50' : 'text-gray-400';
  const S = isDark ? 'text-white/70' : 'text-gray-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={`${C} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#1a1a2e] animate-pulse" />
            </div>
            <div>
              <h1 className={`${T} text-xl font-bold`}>Assistant IA BNB</h1>
              <p className={`${M} text-sm`}>Analyse en temps réel · {properties.length} bien{properties.length > 1 ? 's' : ''} · {ctx.totalBookings} réservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isDark ? 'bg-emerald-900/30 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">En ligne</span>
            </div>
            <button onClick={() => { setMessages([]); setTimeout(() => { const now = new Date(); const h = now.getHours(); const g = h < 18 ? 'Bonjour' : 'Bonsoir'; setMessages([{ id: uid(), role: 'assistant', timestamp: new Date(), content: `Nouvelle conversation. ${g} ! Comment puis-je vous aider ?`, actions: SUGGESTIONS.slice(0, 4) }]); }, 100); }} className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`} title="Nouvelle conversation">
              <RefreshCw className={`w-4 h-4 ${M}`} />
            </button>
            <button onClick={() => setMinimized(v => !v)} className={`p-2 rounded-xl ${isDark ? 'bg-white/[0.06] hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              {minimized ? <Maximize2 className={`w-4 h-4 ${M}`} /> : <Minimize2 className={`w-4 h-4 ${M}`} />}
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Revenus du mois', value: euro(ctx.revMonth), icon: <Euro className="w-4 h-4" />, color: '#22c55e' },
            { label: 'Occupation 30j', value: `${ctx.avgOcc}%`, icon: <Calendar className="w-4 h-4" />, color: '#8b5cf6' },
            { label: 'Note moyenne', value: `${ctx.avgRating}★`, icon: <Star className="w-4 h-4" />, color: '#f59e0b' },
            { label: 'Points critiques', value: `${ctx.urgentTasks.length + ctx.unanswered.length}`, icon: <AlertTriangle className="w-4 h-4" />, color: ctx.urgentTasks.length + ctx.unanswered.length > 0 ? '#ef4444' : '#22c55e' },
          ].map((k, i) => (
            <div key={i} className={`${SC} p-3 flex items-center gap-2`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${k.color}18`, color: k.color }}>{k.icon}</div>
              <div className="min-w-0"><p className={`${M} text-xs leading-none`}>{k.label}</p><p className="font-bold text-sm mt-0.5" style={{ color: k.color }}>{k.value}</p></div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Chat area */}
      <AnimatePresence>
        {!minimized && (
          <motion.div key="chat" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`${C} flex flex-col overflow-hidden`} style={{ height: '62vh', minHeight: 400 }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
              {messages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role === 'assistant' ? 'bg-gradient-to-br from-violet-500 to-indigo-600' : isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-white" /> : <Users className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280' }} />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : isDark ? 'bg-white/[0.06] border border-white/[0.08] rounded-tl-sm' : 'bg-gray-50 border border-gray-100 rounded-tl-sm'}`}>
                      {msg.role === 'assistant'
                        ? <Markdown text={msg.content} isDark={isDark} />
                        : <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                      }
                    </div>

                    {/* Actions */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.actions.map((a, i) => (
                          <button key={i} onClick={() => sendMessage(a.query)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all hover:scale-105 ${isDark ? 'bg-white/[0.04] border-white/[0.1] text-white/70 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-violet-300' : 'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'}`}>
                            <span>{a.icon}</span><span>{a.label}</span><ChevronRight className="w-3 h-3 opacity-50" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Meta */}
                    <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      <span className={`text-[10px] ${M}`}>{msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {msg.role === 'assistant' && (
                        <button onClick={() => copyMsg(msg.id, msg.content)} className={`${M} hover:text-violet-400 transition-colors`}>
                          {copied === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-white/[0.06] border border-white/[0.08]' : 'bg-gray-50 border border-gray-100'}`}>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-violet-400" />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions rapides */}
            {messages.length <= 1 && (
              <div className={`px-5 pb-3 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
                <p className={`text-xs ${M} mt-3 mb-2`}>Suggestions rapides</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => sendMessage(s.query)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all hover:scale-105 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-violet-300' : 'bg-white border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-600'}`}>
                      <span>{s.icon}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className={`p-4 border-t ${isDark ? 'border-white/[0.05]' : 'border-gray-100'}`}>
              <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-3">
                <div className="relative flex-1">
                  <MessageCircle className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${M}`} />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Posez une question sur vos données..."
                    disabled={loading}
                    className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/30 ${isDark ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-violet-500/40' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-300'}`}
                  />
                </div>
                <button type="submit" disabled={loading || !input.trim()}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Envoyer</span>
                </button>
              </form>
              <p className={`text-[10px] ${M} mt-2 text-center`}>Analyse basée sur vos données réelles · Mise à jour en temps réel</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick actions grid (visible si minimisé) */}
      {minimized && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SUGGESTIONS.map((s, i) => (
            <motion.button key={i} whileHover={{ scale: 1.03 }} onClick={() => { setMinimized(false); setTimeout(() => sendMessage(s.query), 100); }}
              className={`${C} p-4 flex flex-col items-center gap-2 text-center transition-colors hover:border-violet-500/30`}>
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-xs font-medium ${S}`}>{s.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
