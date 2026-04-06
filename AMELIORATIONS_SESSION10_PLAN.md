# 🎯 Session 10 - Plan d'Amélioration Générale

**Date** : 6 Avril 2026  
**Contexte** : Suite sessions 6-9 (Performance, UX, Type Safety)  
**Focus** : Type Safety lib/ + Stripe error handling

---

## 📊 Analyse Préliminaire

### 🔍 Types `any` Détectés (50+ instances)

#### Catégories Identifiées

**1. Haute Priorité - lib/stripe.ts (7 instances)** ⭐⭐⭐
```typescript
// PATTERN RÉPÉTITIF
} catch (error: any) {
  return { error: error.message };
}
```

**Fichiers** :
- lib/stripe.ts : 7 `error: any` (lignes 47, 67, 87, 136, 170, 195, 220)

**Impact** :
- ✅ Bibliothèque critique (paiements)
- ✅ Pattern répétitif → facile à corriger
- ✅ Type safety essentiel pour Stripe

---

**2. Priorité Moyenne - API Routes (8+ instances)** ⭐⭐
```typescript
// PATTERN DYNAMIQUE (acceptable)
const where: any = {};
const data: any = {};
```

**Fichiers** :
- app/api/expenses/route.ts (1)
- app/api/expenses/[id]/route.ts (1)
- app/api/inspections/route.ts (1)
- app/api/inspections/[id]/route.ts (1)
- app/api/access-codes/route.ts (1)
- app/api/access-codes/[id]/route.ts (1)
- app/api/notifications/route.ts (1)
- app/api/messages/route.ts (1)

**Décision** : ⏸️ **ACCEPTABLE** - Queries dynamiques Prisma (type-safe au runtime)

---

**3. Faible Priorité - External libs/UI (15+ instances)** ⭐
```typescript
// Analytics callbacks (external library)
onCLS((metric: any) => { ... }); // web-vitals library

// UI type casting (cosmétique)
(editing as any)[field]
```

**Fichiers** :
- components/AnalyticsWrapper.tsx : 5 instances (web-vitals callbacks)
- components/InvoiceEditor.tsx : 2 instances (dynamic fields)
- app/page.tsx : 2 instances (reviews mapping)
- hooks/useApi.ts : 1 instance (generics default)

**Décision** : ⏸️ **REPORTER** - External libs + UI casting

---

**4. Très Faible Priorité - Webhooks/Intégrations (10+ instances)** ⭐
```typescript
// Airbnb webhook handlers (données externes)
async function handleReservationEvent(reservation: any) { ... }
```

**Fichiers** :
- app/api/integrations/airbnb/webhook/route.ts : 5 fonctions
- app/api/integrations/airbnb/listings/route.ts : 1 instance
- app/api/integrations/airbnb/sync/route.ts : 1 instance

**Décision** : ⏸️ **ACCEPTABLE** - Données externes non typées

---

## 🎯 Stratégie Session 10

### Phase A : lib/stripe.ts Error Handling ⭐⭐⭐

**Temps estimé** : 15 minutes  
**Valeur** : Très haute (paiements critiques)

#### Analyse du Pattern Actuel

```typescript
// ❌ AVANT (répété 7 fois)
try {
  // Stripe API call
  const result = await stripe.someMethod();
  return { success: true, data: result };
} catch (error: any) {
  return { error: error.message };
}
```

**Problèmes** :
1. `error.message` non type-safe
2. Stripe errors peuvent avoir différents types
3. Pattern répété 7 fois

#### Solution Proposée

```typescript
// ✅ APRÈS
import Stripe from 'stripe';

try {
  // Stripe API call
  const result = await stripe.someMethod();
  return { success: true, data: result };
} catch (error) {
  // Type guard pour Stripe errors
  if (error instanceof Stripe.errors.StripeError) {
    return { error: error.message };
  }
  const message = error instanceof Error ? error.message : 'Stripe error';
  return { error: message };
}
```

**Cibles (7 fonctions)** :
1. `createPaymentIntent()` - ligne 47
2. `createCheckoutSession()` - ligne 67
3. `confirmPayment()` - ligne 87
4. `refundPayment()` - ligne 136
5. `getPaymentIntent()` - ligne 170
6. `cancelPaymentIntent()` - ligne 195
7. `createCustomer()` - ligne 220

**Impact** :
- ✅ Type safety Stripe complet
- ✅ Meilleure gestion erreurs
- ✅ Pattern cohérent sessions 5-8
- ✅ Production-ready error handling

---

### Phase B : OPTIONNELLE - API Dynamic Queries

**Temps estimé** : 20 minutes  
**Valeur** : Moyenne (refactoring cosmetique)

**Décision** : ⏸️ **REPORTER** - `where: any` est acceptable pour Prisma (type-safe au runtime)

---

## 📈 Métriques Attendues

| Métrique | Avant | Après (A) | Gain |
|----------|-------|-----------|------|
| **lib/ any types** | 7 | 0 | **-100% ✅** |
| **Stripe type safety** | 0% | 100% | **+100% ✅** |
| **Build time** | 22.2s | ~22s | Stable |
| **Type coverage** | 94% | 95% | **+1%** |

---

## ✅ Pattern à Appliquer (Stripe Errors)

```typescript
import Stripe from 'stripe';

// ✅ PATTERN TYPE-SAFE
try {
  const result = await stripe.apiCall();
  return { success: true, data: result };
} catch (error) {
  // Stripe-specific errors
  if (error instanceof Stripe.errors.StripeError) {
    return { error: error.message };
  }
  
  // Generic errors
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { error: message };
}
```

**Types Stripe** :
- `Stripe.errors.StripeCardError` - Carte refusée
- `Stripe.errors.StripeRateLimitError` - Rate limit
- `Stripe.errors.StripeInvalidRequestError` - Requête invalide
- `Stripe.errors.StripeAPIError` - API error
- `Stripe.errors.StripeConnectionError` - Connexion
- `Stripe.errors.StripeAuthenticationError` - Auth

---

## 🎯 Ordre d'Exécution

### Phase A (PRIORITÉ ABSOLUE)
1. ✅ Lire lib/stripe.ts structure
2. ✅ Vérifier import Stripe disponible
3. ✅ Appliquer pattern 7 fonctions
4. ✅ Build validation
5. ✅ Documentation + Commit

### Phase B (OPTIONNEL)
⏸️ Reporter API dynamic queries (valeur faible)

---

## 🚫 Exclusions Délibérées

### AnalyticsWrapper.tsx (5 any)
- ❌ **AUCUNE ACTION** - web-vitals library (external types)
- Callback signatures imposées par la lib

### API Routes Dynamic Queries (8 any)
- ❌ **AUCUNE ACTION** - `where: any = {}` acceptable
- Prisma type-safe au runtime
- Pattern standard documentation Prisma

### Airbnb Webhooks (10+ any)
- ❌ **AUCUNE ACTION** - Données externes
- Format Airbnb non typé officiellement
- Acceptable pour intégrations tierces

### UI Type Casting (5+ any)
- ❌ **AUCUNE ACTION** - Cosmétique
- `(editing as any)[field]` pour fields dynamiques
- Faible valeur vs effort

---

## 🎉 Résultat Attendu Session 10

### Accomplissements
- ✅ **7 Stripe errors** → type-safe
- ✅ **lib/ type coverage** : 100%
- ✅ **Pattern Stripe** standardisé
- ✅ **0 régression** TypeScript
- ✅ **Build stable** <23s

### Fichiers Touchés (Phase A)
- lib/stripe.ts (7 fonctions modifiées)
- AMELIORATIONS_SESSION10_PLAN.md (plan)
- AMELIORATIONS_SESSION10_COMPLETE.md (résultats)

### Commit Message Prévu
```
✨ Session 10: Type safety Stripe error handling

- lib/stripe.ts: 7 error: any → Stripe.errors guards
- Pattern: instanceof Stripe.errors.StripeError
- Coverage: 100% lib/ type-safe
- Build: Validé 0 errors
- Impact: Paiements production-ready
```

---

## 🔮 Sessions Futures

### Session 11+ Opportunités
1. **Alert() restants** (~20 composants secondaires)
2. **Performance Round 2** (useMemo profiling si besoin)
3. **Accessibilité** (ARIA, keyboard nav)
4. **Tests E2E** (Playwright critiques)

### Progression Type Safety
- Session 5 : API routes error handling
- Session 8 : Components error handling (5 any)
- Session 10 : **lib/ Stripe** (7 any)
- **Résultat** : 94% → 95% type coverage

---

**Status** : 📋 Plan prêt  
**Temps total** : 15 minutes (Phase A uniquement)  
**Risque** : ⭐ Très faible (pattern éprouvé)  
**Valeur** : ⭐⭐⭐ Très haute (paiements critiques)
