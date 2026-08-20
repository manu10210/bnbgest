/**
 * 🧭 Classifieur — scoring pondéré, décision explicable
 *
 * Trois étapes :
 *   1. VOTE       — chaque règle qui matche apporte son poids à un genre.
 *   2. ARBITRAGE  — ajustements structurels (les arbitrages qui coûtaient cher).
 *   3. DÉCISION   — argmax + écart au second → genre, confiance, verdict.
 *
 * Rien n'est jeté : un email sans aucun signal ressort en `other_airbnb`
 * (ou `not_airbnb`) avec une confiance basse, pas en `null`.
 */

import type { EmailSignals } from './signals';
import { ALL_RULES, type ClassificationRule } from './rules';
import { KIND_META, type EmailKind } from './taxonomy';

// ─── Résultat ────────────────────────────────────────────────────────────────

export interface Evidence {
  ruleId: string;
  kind: EmailKind;
  scope: ClassificationRule['scope'] | 'structural';
  weight: number;
  why: string;
}

export interface Classification {
  kind: EmailKind;
  /** Score brut du genre retenu. */
  score: number;
  /** Écart avec le second genre — c'est lui qui dit si la décision est nette. */
  margin: number;
  /** 0-100. Combine score absolu et netteté de l'écart. */
  confidence: number;
  /**
   * `certain`  — slug canonique ou faisceau large et sans concurrent.
   * `probable` — décision nette mais sans preuve canonique.
   * `ambigu`   — deux genres au coude-à-coude → l'humain tranche.
   */
  verdict: 'certain' | 'probable' | 'ambigu';
  /** Genre arrivé second, utile pour afficher « ou peut-être … ». */
  runnerUp?: { kind: EmailKind; score: number };
  /** Toutes les preuves retenues, triées par poids décroissant. */
  evidence: Evidence[];
  /** Scores complets, pour le panneau de diagnostic. */
  scores: Partial<Record<EmailKind, number>>;
}

// ─── Étape 1 : vote ──────────────────────────────────────────────────────────

/**
 * Rendements décroissants : 3 règles faibles pour un même genre ne doivent
 * pas valoir une règle forte. Sinon il suffit d'ajouter des synonymes dans le
 * fichier de règles pour faire gagner n'importe quel genre — exactement le
 * travers qui a fait dériver l'ancien moteur.
 */
function sumWithDiminishingReturns(weights: number[]): number {
  return weights
    .slice()
    .sort((a, b) => b - a)
    .reduce((total, w, i) => total + w * Math.pow(0.45, i), 0);
}

function scopeText(signals: EmailSignals, scope: ClassificationRule['scope']): string {
  switch (scope) {
    case 'slug': return signals.slugBlob;
    case 'subject': return signals.text.foldedSubject;
    case 'body': return signals.text.folded;
  }
}

function collectVotes(signals: EmailSignals): { evidence: Evidence[]; byKind: Map<EmailKind, number[]> } {
  const evidence: Evidence[] = [];
  const byKind = new Map<EmailKind, number[]>();

  for (const rule of ALL_RULES) {
    const haystack = scopeText(signals, rule.scope);
    if (!haystack || !rule.re.test(haystack)) continue;

    evidence.push({
      ruleId: rule.id,
      kind: rule.kind,
      scope: rule.scope,
      weight: rule.weight,
      why: rule.why,
    });
    const bucket = byKind.get(rule.kind) ?? [];
    bucket.push(rule.weight);
    byKind.set(rule.kind, bucket);
  }

  return { evidence, byKind };
}

// ─── Étape 2 : arbitrages structurels ────────────────────────────────────────

/**
 * Les arbitrages que les regex seules ne savent pas rendre.
 * Chacun corrige une confusion précise, constatée sur de vrais emails.
 */
function applyStructuralAdjustments(
  scores: Map<EmailKind, number>,
  signals: EmailSignals,
  evidence: Evidence[],
): void {
  const s = signals.structural;
  const bump = (kind: EmailKind, delta: number, why: string) => {
    if (delta === 0) return;
    scores.set(kind, (scores.get(kind) ?? 0) + delta);
    evidence.push({ ruleId: `struct.${kind}`, kind, scope: 'structural', weight: delta, why });
  };

  const hasCode = signals.confirmationCodes.length > 0;
  const looksLikeStayRecap = s.hasStayBlock && (hasCode || s.hasListingTypeBlock);

  // ① Le faux positif « versement » le plus courant : un récapitulatif de
  //    réservation contient un bloc « Versement de l'hôte ». Un vrai email de
  //    versement, lui, n'a ni dates de séjour ni type de logement.
  if (looksLikeStayRecap && (scores.get('payout_sent') ?? 0) > 0) {
    bump('payout_sent', -45, 'Bloc séjour + code de confirmation : ce n’est pas un email de versement');
  }

  // ② Symétrique : un email centré sur un montant, sans séjour décrit,
  //    est bien un mouvement d'argent.
  if (!s.hasStayBlock && s.hasMoney && !s.hasFeeBreakdown) {
    bump('payout_sent', 12, 'Montant sans description de séjour');
  }

  // ③ Un avis reçu s'accompagne d'une note ou d'un lien vers l'évaluation.
  //    Sans ni l'un ni l'autre, mais avec un séjour décrit, c'est autre chose.
  if ((scores.get('review_received') ?? 0) > 0) {
    if (s.hasStarRating || s.hasReviewCta) {
      bump('review_received', 14, 'Note en étoiles ou lien vers l’évaluation');
    } else if (looksLikeStayRecap) {
      bump('review_received', -25, 'Aucune note ni lien d’évaluation, mais un récapitulatif de séjour');
    }
  }

  // ④ Les genres qui décrivent un séjour gagnent à en montrer un.
  for (const kind of ['booking_new', 'booking_modified', 'booking_cancelled', 'booking_checkout', 'booking_reminder'] as EmailKind[]) {
    if ((scores.get(kind) ?? 0) <= 0) continue;
    if (looksLikeStayRecap) bump(kind, 12, 'Récapitulatif de séjour présent');
    else if (!s.hasStayBlock && !hasCode) bump(kind, -10, 'Ni dates de séjour ni code de confirmation');
  }

  // ⑤ Une nouvelle réservation détaille toujours les frais.
  if ((scores.get('booking_new') ?? 0) > 0 && s.hasFeeBreakdown) {
    bump('booking_new', 10, 'Détail des frais présent');
  }

  // ⑥ Expéditeur : une notification hôte vient d'une adresse transactionnelle.
  if (!signals.isAirbnbSender) {
    bump('not_airbnb', 60, 'Expéditeur hors domaine Airbnb');
  } else if (!signals.isTransactionalSender) {
    // Adresse Airbnb mais pas transactionnelle → probablement du marketing.
    bump('marketing', 10, 'Adresse Airbnb non transactionnelle');
  }

  // ⑦ Un fil de messagerie identifié, sans aucun signal de réservation.
  if (signals.threadId && !looksLikeStayRecap && !hasCode) {
    bump('guest_message', 15, 'Lien de fil de messagerie sans contexte de réservation');
  }
}

// ─── Étape 3 : décision ──────────────────────────────────────────────────────

/** Seuil au-delà duquel on considère la décision nette. */
const CLEAR_MARGIN = 20;
/** En dessous de ce score, aucun signal ne mérite qu'on tranche. */
const MIN_SCORE = 18;

function computeConfidence(top: number, margin: number, hasCanonicalSlug: boolean): number {
  if (hasCanonicalSlug) return Math.min(99, 88 + Math.round(Math.min(margin, 40) / 4));

  // Le score seul dit « j'ai des indices » ; l'écart dit « et pas de rival ».
  const scoreComponent = Math.min(55, (top / 90) * 55);
  const marginComponent = Math.min(35, (margin / 45) * 35);
  return Math.max(10, Math.round(scoreComponent + marginComponent));
}

export function classifyEmail(signals: EmailSignals): Classification {
  const { evidence, byKind } = collectVotes(signals);

  const scores = new Map<EmailKind, number>();
  for (const [kind, weights] of byKind) {
    scores.set(kind, sumWithDiminishingReturns(weights));
  }

  applyStructuralAdjustments(scores, signals, evidence);

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  evidence.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const scoresObject = Object.fromEntries(
    ranked.map(([k, v]) => [k, Math.round(v)]),
  ) as Partial<Record<EmailKind, number>>;

  // Aucun signal exploitable : on le dit, on ne devine pas.
  if (ranked.length === 0 || ranked[0][1] < MIN_SCORE) {
    const fallback: EmailKind = signals.isAirbnbSender ? 'other_airbnb' : 'not_airbnb';
    return {
      kind: fallback,
      score: ranked[0]?.[1] ?? 0,
      margin: 0,
      confidence: signals.isAirbnbSender ? 25 : 60,
      verdict: 'ambigu',
      evidence,
      scores: scoresObject,
    };
  }

  const [topKind, topScore] = ranked[0];
  const runnerUp = ranked[1];
  const margin = topScore - (runnerUp?.[1] ?? 0);

  const hasCanonicalSlug = evidence.some(
    (e) => e.scope === 'slug' && e.kind === topKind && e.weight >= 100,
  );

  const verdict: Classification['verdict'] =
    hasCanonicalSlug ? 'certain'
      : margin >= CLEAR_MARGIN ? 'probable'
        : 'ambigu';

  return {
    kind: topKind,
    score: Math.round(topScore),
    margin: Math.round(margin),
    confidence: computeConfidence(topScore, margin, hasCanonicalSlug),
    verdict,
    runnerUp: runnerUp ? { kind: runnerUp[0], score: Math.round(runnerUp[1]) } : undefined,
    evidence,
    scores: scoresObject,
  };
}

/** Libellé court d'une décision, pour les logs et l'UI. */
export function describeClassification(c: Classification): string {
  const label = KIND_META[c.kind].label;
  const top = c.evidence.find((e) => e.kind === c.kind);
  return `${label} (${c.confidence}%, ${c.verdict})${top ? ` — ${top.why}` : ''}`;
}
