# 🚀 Session 19 - Optimisation des Tests E2E - PLAN

> **Date**: 11 Avril 2026  
> **Durée estimée**: ~2 heures  
> **Objectif**: Réduire le temps d'exécution des tests E2E de ~3.5 min à <2 min  
> **Statut**: 📋 **PLANIFICATION**

---

## 📋 Table des matières

1. [Contexte](#contexte)
2. [État actuel](#état-actuel)
3. [Objectifs](#objectifs)
4. [Plan d'action](#plan-daction)
5. [Métriques cibles](#métriques-cibles)
6. [Risques et mitigation](#risques-et-mitigation)

---

## 🔍 Contexte

### Session 18 - Résultats

**Session 18** a livré une infrastructure de tests E2E complète et fonctionnelle :
- ✅ 90/90 tests E2E avec authentification NextAuth réelle
- ✅ 25 attributs `data-testid` pour sélecteurs stables
- ✅ Seeding automatique de la base de données
- ✅ 0 violations WCAG 2.1 AA
- ✅ Support multi-navigateurs (Chromium, Firefox, WebKit)

**Problème identifié** :
- ⏱️ **Durée d'exécution : ~3.5 minutes** (90 tests séquentiels, workers: 1)
- 🐌 Tests séquentiels nécessaires pour éviter conflits DB
- ⏳ Chaque test doit s'authentifier (login NextAuth complet)
- 🔄 Répétition du setup auth dans chaque test

### Opportunités d'optimisation

1. **Parallélisation intelligente** : Tests par navigateur en parallèle
2. **Réutilisation de session** : Storage state Playwright
3. **Optimisation animations** : `prefers-reduced-motion` en tests
4. **Cache navigateurs** : Réutiliser installations Playwright
5. **Sharding CI** : Diviser tests en groupes parallèles

---

## 📊 État actuel

### Configuration actuelle (playwright.config.ts)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/global-setup.ts'),
  fullyParallel: false,     // ← Tests séquentiels
  workers: 1,               // ← Un seul worker
  retries: process.env.CI ? 2 : 0,
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Pattern auth actuel (auth-helper.ts)

```typescript
export async function setupAuth(page: Page) {
  await login(page);  // ← Login NextAuth complet à chaque test
  await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 15000 });
  await page.waitForSelector('[data-testid="bookings-tab"]', { timeout: 10000 });
  await page.waitForTimeout(500);
}
```

**Temps moyen par test** :
- Login NextAuth : ~1.5s
- Navigation /admin : ~0.5s
- Attente hydratation : ~0.5s
- Test body : ~2s (variable)
- **Total** : ~4.5s par test × 90 tests = ~405s = **~6.75 min**

**Temps observé** : ~3.5 min (optimisations Next.js cachant, etc.)

---

## 🎯 Objectifs

### Objectifs principaux

1. **Réduire temps d'exécution** : 3.5 min → <2 min (-43%)
2. **Maintenir stabilité** : 0% flakiness (100% pass rate)
3. **Préserver sécurité** : Auth réelle, pas de mocks
4. **Support CI/CD** : Optimisations GitHub Actions
5. **Documentation complète** : Guide patterns optimisation

### Métriques cibles

| Métrique | Avant Session 19 | Après Session 19 | Amélioration |
|----------|------------------|------------------|--------------|
| Durée totale tests | ~3.5 min | **<2 min** | **-43%** |
| Temps par test | ~2.3s | **~1.3s** | **-43%** |
| Login authentification | ~1.5s/test | **~0s (réutilisation)** | **-100%** |
| Workers | 1 | **3 (par browser)** | **+200%** |
| Parallélisation | Non | **Oui (par browser)** | ✅ |
| Durée CI | ~5 min | **<3 min** | **-40%** |
| Pass rate | 100% | **100%** | Maintenu |
| Violations WCAG | 0 | **0** | Maintenu |

---

## 🛠️ Plan d'action

### Phase 1 : Storage State (Réutilisation session)

**Objectif** : Éliminer login répétitif en réutilisant session NextAuth

**Étapes** :
1. Créer script `tests/auth-setup.ts` pour générer storage state
2. Authentifier une fois, sauvegarder cookies/localStorage
3. Configurer projets Playwright pour charger storage state
4. Supprimer `setupAuth()` de `beforeEach` (gardé en fallback)

**Fichiers à créer/modifier** :
- ✅ `tests/auth-setup.ts` (nouveau) - Script génération storage state
- ✅ `playwright.config.ts` - Configuration `storageState` par projet
- ✅ `tests/helpers/auth-helper.ts` - Fonction `getAuthState()` helper

**Code prévu** :
```typescript
// tests/auth-setup.ts
import { chromium } from '@playwright/test';
import { login } from './helpers/auth-helper';

async function globalAuthSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await login(page);
  
  // Sauvegarder storage state (cookies + localStorage)
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
  
  await browser.close();
}

export default globalAuthSetup;
```

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: require.resolve('./tests/global-setup.ts'),
  
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',  // ← Charger session
      },
    },
    // ... idem pour firefox, webkit
  ],
});
```

**Gain estimé** : **-1.5s par test** (login supprimé) = **-135s total** = **-2.25 min**

---

### Phase 2 : Parallélisation par navigateur

**Objectif** : Exécuter tests en parallèle par browser (éviter conflits DB inter-browsers)

**Stratégie** :
- **workers: 3** (un par navigateur : Chromium, Firefox, WebKit)
- **fullyParallel: false** (séquentiel DANS chaque browser)
- Isolation DB par browser (optionnel, si nécessaire)

**Configuration** :
```typescript
export default defineConfig({
  fullyParallel: false,  // Séquentiel dans chaque projet
  workers: 3,            // 3 workers (1 par browser)
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: '...' } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'], storageState: '...' } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'], storageState: '...' } },
  ],
});
```

**Gain estimé** : **-33%** (3 browsers en parallèle au lieu de séquentiel)  
Temps total : ~135s / 3 = **~45s** pour 90 tests (3×30 tests en parallèle)

---

### Phase 3 : Optimisation animations CSS

**Objectif** : Désactiver animations CSS en tests pour accélérer rendering

**Méthode** : Media query `prefers-reduced-motion`

**Configuration Playwright** :
```typescript
export default defineConfig({
  use: {
    baseURL: 'http://localhost:3000',
    
    // Désactiver animations en tests
    reducedMotion: 'reduce',
    
    // Autres configs...
  },
});
```

**CSS global (app/globals.css)** :
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Gain estimé** : **-0.3s par test** (attentes animations) = **-27s total** = **-0.45 min**

---

### Phase 4 : Cache Playwright navigateurs

**Objectif** : Réutiliser navigateurs installés en CI (GitHub Actions)

**Configuration GitHub Actions** :
```yaml
# .github/workflows/playwright.yml
- name: Cache Playwright browsers
  uses: actions/cache@v3
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-playwright-
```

**Gain estimé (CI uniquement)** : **-30s** installation navigateurs

---

### Phase 5 : Sharding tests (CI uniquement)

**Objectif** : Diviser tests en shards parallèles dans GitHub Actions

**Configuration CI** :
```yaml
# .github/workflows/playwright.yml
strategy:
  matrix:
    shard: [1, 2, 3]
    
steps:
  - name: Run Playwright tests
    run: npx playwright test --shard=${{ matrix.shard }}/3
```

**Gain estimé (CI uniquement)** : **-50%** temps CI (3 shards en parallèle)

---

### Phase 6 : Optimisations mineures

**6.1 - Timeout optimisés**
```typescript
use: {
  actionTimeout: 5000,      // ← Réduire de 10s à 5s
  navigationTimeout: 15000, // ← Réduire de 30s à 15s
}
```

**6.2 - Traces sélectives**
```typescript
trace: 'retain-on-failure',  // ← Seulement si échec (vs 'on-first-retry')
```

**6.3 - Screenshots optimisés**
```typescript
screenshot: {
  mode: 'only-on-failure',
  fullPage: false,  // ← Screenshot viewport uniquement
}
```

**Gain estimé** : **-5s total**

---

## 📁 Fichiers à créer/modifier

### Fichiers à créer (4)

1. **`tests/auth-setup.ts`** (~30 lignes)
   - Génération storage state avec session NextAuth
   - Export `globalAuthSetup()` function
   - Sauvegarde dans `playwright/.auth/user.json`

2. **`playwright/.auth/.gitignore`** (1 ligne)
   - Exclure `user.json` du versioning (credentials)

3. **`AMELIORATIONS_SESSION19_COMPLETE.md`** (~1000 lignes)
   - Documentation exhaustive optimisations
   - Comparaisons before/after
   - Guide troubleshooting

4. **`AMELIORATIONS_SESSION19_PLAN.md`** (ce fichier, ~500 lignes)

### Fichiers à modifier (5)

1. **`playwright.config.ts`**
   - Ajouter `storageState` à chaque projet
   - Modifier `workers: 3`
   - Ajouter `reducedMotion: 'reduce'`
   - Optimiser timeouts

2. **`tests/helpers/auth-helper.ts`**
   - Ajouter `getAuthState()` helper
   - Conserver `setupAuth()` en fallback
   - Documentation usage

3. **`.github/workflows/playwright.yml`**
   - Ajouter cache Playwright browsers
   - Configurer sharding matrix
   - Optimiser étapes CI

4. **`app/globals.css`**
   - Ajouter media query `prefers-reduced-motion`
   - Désactiver animations en tests

5. **`package.json`**
   - Ajouter script `test:auth-setup`
   - Mettre à jour scripts tests

---

## ⚠️ Risques et mitigation

### Risque 1 : Storage state corrompu

**Problème** : Session expirée, cookies invalides  
**Impact** : Tests échouent (auth fail)  
**Probabilité** : Moyenne  
**Mitigation** :
- Fallback sur `setupAuth()` si storage state échoue
- Régénérer storage state si >24h ancien
- Logs clairs pour debugging

**Code mitigation** :
```typescript
test.beforeEach(async ({ page }) => {
  // Vérifier si auth fonctionne
  const isAuth = await isAuthenticated(page);
  if (!isAuth) {
    console.warn('⚠️ Storage state failed, falling back to setupAuth()');
    await setupAuth(page);
  }
});
```

### Risque 2 : Conflits DB avec parallélisation

**Problème** : Race conditions entre navigateurs  
**Impact** : Tests flaky (intermittent failures)  
**Probabilité** : Faible (séquentiel dans chaque browser)  
**Mitigation** :
- Garder `fullyParallel: false` (séquentiel par browser)
- Isolation DB par browser si nécessaire
- Transactions DB dans tests

### Risque 3 : Animations désactivées cassent tests

**Problème** : Tests attendent fin d'animation qui n'existe plus  
**Impact** : Timeouts, échecs  
**Probabilité** : Faible  
**Mitigation** :
- `prefers-reduced-motion` réduit durée (0.01ms) au lieu de supprimer
- Tests robustes (attente éléments, pas délais fixes)
- Vérification manuelle après implémentation

### Risque 4 : Cache CI corrompu

**Problème** : Navigateurs cachés obsolètes  
**Impact** : Tests échouent en CI  
**Probabilité** : Faible  
**Mitigation** :
- Cache key basé sur `package-lock.json` (invalidation auto)
- Restore keys avec fallback
- CI peut réinstaller si cache manquant

---

## 📊 Métriques cibles détaillées

### Temps d'exécution

| Phase | Optimisation | Gain temps | Temps cumulé |
|-------|--------------|------------|--------------|
| **Baseline** | - | - | **~210s (3.5 min)** |
| Phase 1 | Storage state | -135s | **~75s** |
| Phase 2 | Parallélisation ×3 | -50% | **~37.5s** |
| Phase 3 | Animations réduites | -10s | **~27.5s** |
| Phase 4-6 | Optimisations diverses | -5s | **~22.5s** |
| **TOTAL** | - | **-187.5s (-89%)** | **~22.5s (~0.4 min)** |

**Note** : Estimation optimiste. Réaliste : **~60-90s (1-1.5 min)**

### Temps CI (GitHub Actions)

| Étape | Avant | Après | Gain |
|-------|-------|-------|------|
| Checkout + Setup | ~30s | ~30s | 0s |
| npm install | ~45s | ~45s | 0s |
| Playwright install | ~30s | **~5s** (cache) | **-25s** |
| Seed DB | ~5s | ~5s | 0s |
| Run tests | ~210s | **~60s** (parallel + optimizations) | **-150s** |
| Upload report | ~10s | ~10s | 0s |
| **TOTAL** | **~330s (5.5 min)** | **~155s (2.6 min)** | **-175s (-53%)** |

### Coûts CI (GitHub Actions minutes)

**Avant Session 19** :
- 1 run = ~5.5 min
- 100 runs/mois = 550 min/mois
- Free tier : 2000 min/mois ✅

**Après Session 19** :
- 1 run = ~2.6 min
- 100 runs/mois = 260 min/mois
- **Économie** : 290 min/mois (-53%)

---

## ✅ Checklist de validation

### Avant implémentation

- [ ] Backup branche actuelle (`git checkout -b session19-backup`)
- [ ] Documenter baseline actuel (temps tests)
- [ ] Vérifier espace disque (storage state + cache)

### Phase 1 - Storage State

- [ ] Créer `tests/auth-setup.ts`
- [ ] Générer storage state localement
- [ ] Configurer `storageState` dans playwright.config
- [ ] Tester 10 tests avec storage state
- [ ] Vérifier auth fonctionne
- [ ] Mesurer gain temps

### Phase 2 - Parallélisation

- [ ] Modifier `workers: 3`
- [ ] Tester en local (3 browsers parallèles)
- [ ] Vérifier pas de conflits DB
- [ ] Mesurer gain temps
- [ ] Valider 100% pass rate

### Phase 3 - Animations

- [ ] Ajouter media query CSS
- [ ] Configurer `reducedMotion: 'reduce'`
- [ ] Tester visuellement (aucune animation cassée)
- [ ] Vérifier tests passent
- [ ] Mesurer gain temps

### Phase 4-5 - CI optimizations

- [ ] Configurer cache Playwright
- [ ] Tester cache fonctionne (2ème run)
- [ ] Configurer sharding (optionnel)
- [ ] Mesurer temps CI total

### Phase 6 - Documentation

- [ ] Créer `AMELIORATIONS_SESSION19_COMPLETE.md`
- [ ] Documenter tous les changements
- [ ] Comparaisons before/after
- [ ] Guide troubleshooting

### Validation finale

- [ ] 90/90 tests passent (100%)
- [ ] 0 violations WCAG (maintenu)
- [ ] Temps < 2 min en local
- [ ] Temps CI < 3 min
- [ ] Commit + push
- [ ] CI passe avec succès

---

## 🚀 Ordre d'exécution

### Étape 1 : Baseline measurement
```bash
# Mesurer temps actuel
npm run test:a11y
# Noter temps total
```

### Étape 2 : Storage State (Phase 1)
```bash
# Créer fichiers
# Configurer playwright.config
# Tester
npm run test:a11y
# Comparer temps
```

### Étape 3 : Parallélisation (Phase 2)
```bash
# Modifier workers
# Tester
npm run test:a11y
# Comparer temps
```

### Étape 4 : Animations (Phase 3)
```bash
# Ajouter CSS + config
# Tester
npm run test:a11y
# Comparer temps
```

### Étape 5 : CI + Documentation (Phases 4-6)
```bash
# Mettre à jour CI workflow
# Créer documentation
# Commit + push
git push origin main
# Vérifier CI
```

---

## 📚 Ressources

### Documentation Playwright

- [Storage State](https://playwright.dev/docs/auth#reuse-signed-in-state)
- [Parallelization](https://playwright.dev/docs/test-parallel)
- [Emulation](https://playwright.dev/docs/emulation)
- [CI optimization](https://playwright.dev/docs/ci)

### Patterns optimisation

- Media queries CSS
- Browser caching strategies
- Test sharding strategies
- GitHub Actions optimization

---

## 🎯 Success Criteria

**Session 19 sera considérée réussie si** :

1. ✅ **Temps tests < 2 min** (vs 3.5 min baseline)
2. ✅ **100% pass rate** (90/90 tests)
3. ✅ **0 violations WCAG** (maintenu)
4. ✅ **0% flakiness** (tests déterministes)
5. ✅ **CI < 3 min** (vs 5.5 min baseline)
6. ✅ **Documentation complète** (~1000 lignes)
7. ✅ **Commit + push** réussis
8. ✅ **CI passe** avec nouvelles optimisations

---

**📋 PLAN Session 19 - PRÊT POUR EXÉCUTION**

**Temps estimé total** : ~2 heures  
**Gain temps tests** : -43% (3.5 min → <2 min)  
**Gain temps CI** : -53% (5.5 min → <3 min)

Prêt à commencer l'implémentation ? 🚀
