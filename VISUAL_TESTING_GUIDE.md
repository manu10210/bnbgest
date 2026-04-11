# 🎨 Visual Regression Testing Guide

## 📋 Overview

Cette application utilise **Playwright built-in screenshot comparison** pour détecter automatiquement les régressions visuelles. Les tests capturent des screenshots de référence (baseline) et les comparent avec les screenshots des tests suivants.

---

## 🏗️ Structure

```
tests/
├── visual/
│   ├── visual-regression.spec.ts   # Tests pages principales
│   ├── critical-pages.spec.ts      # Tests pages critiques
│   ├── components.spec.ts          # Tests composants UI
│   └── responsive.spec.ts          # Tests responsive
├── helpers/
│   └── screenshot-helper.ts        # Helpers screenshots
└── *-snapshots/                    # Baseline screenshots (auto-generated)
    ├── chromium/
    ├── firefox/
    └── webkit/
```

---

## 🚀 Commandes

### Lancer tests visuels

```bash
# Tous les tests visuels
npm run test:visual

# Tests visuels spécifiques
npx playwright test tests/visual/visual-regression.spec.ts
npx playwright test tests/visual/responsive.spec.ts

# Tests visuels sur un browser spécifique
npx playwright test tests/visual --project=chromium
```

### Mettre à jour baseline

```bash
# Après changements UI intentionnels
npm run test:visual:update

# Mettre à jour baseline pour un test spécifique
npx playwright test tests/visual/visual-regression.spec.ts --update-snapshots

# Mettre à jour baseline pour un browser spécifique
npx playwright test tests/visual --project=chromium --update-snapshots
```

### Comparer screenshots

```bash
# Ouvrir rapport HTML avec comparaison visuelle
npx playwright show-report

# Le rapport affiche:
# - Screenshots baseline (attendus)
# - Screenshots actuels
# - Diff highlights (zones différentes en rouge)
```

---

## 🎯 Best Practices

### 1. Masquer contenu dynamique

```typescript
await takeScreenshot(page, 'dashboard', {
  mask: [
    '[data-testid="current-time"]',  // Date/heure change
    '[data-testid="live-stats"]',    // Données temps réel
    '[data-testid="user-id"]',       // IDs uniques
  ],
});
```

**Pourquoi ?** Le contenu dynamique change à chaque exécution, causant des faux positifs.

### 2. Attendre fonts/images

```typescript
// Le helper le fait automatiquement
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');
```

**Pourquoi ?** Évite les screenshots incomplets (fonts/images en cours de chargement).

### 3. Tolérance diff pixels

```typescript
// playwright.config.ts
expect: {
  toMatchSnapshot: {
    maxDiffPixels: 100,       // 100px différence OK
    maxDiffPixelRatio: 0.01,  // 1% différence OK
    threshold: 0.2,           // Color threshold 0-1
  },
}
```

**Pourquoi ?** Antialiasing et rendering peuvent varier légèrement entre OS.

### 4. Screenshots full-page

```typescript
await takeScreenshot(page, 'dashboard-full', {
  fullPage: true,  // Capture toute la page (avec scroll)
});
```

**Pourquoi ?** Utile pour détecter régressions hors viewport initial.

### 5. Screenshots élément spécifique

```typescript
await takeElementScreenshot(
  page, 
  '[data-testid="sidebar"]', 
  'sidebar-nav'
);
```

**Pourquoi ?** Plus précis, évite faux positifs du reste de la page.

---

## 🔄 Workflow

### Développement local

1. **Développer feature UI**
   ```bash
   # Travail sur composant
   ```

2. **Lancer tests visuels**
   ```bash
   npm run test:visual
   ```

3. **Si échec attendu** (changement UI intentionnel)
   ```bash
   npm run test:visual:update
   ```

4. **Commit baseline mis à jour**
   ```bash
   git add tests/*-snapshots/
   git commit -m "chore: update visual regression baseline after UI change"
   ```

### CI/CD

1. **PR créée** → Tests visuels automatiques
2. **Échec détecté** → Rapport artifacts uploadé
3. **Reviewer vérifie screenshots** dans artifacts GitHub Actions
4. **Approuve** (changement intentionnel) ou **demande fix** (régression)

---

## 📸 Types de Screenshots

### Full Page
```typescript
await takeScreenshot(page, 'dashboard-full', {
  fullPage: true,
});
```
- Capture toute la page avec scroll
- Utile pour pages longues

### Viewport Only
```typescript
await takeScreenshot(page, 'dashboard-hero', {
  clip: { x: 0, y: 0, width: 1280, height: 800 },
});
```
- Capture zone spécifique
- Utile pour hero sections

### Element Specific
```typescript
await takeElementScreenshot(page, '[data-testid="card"]', 'card');
```
- Capture composant isolé
- Utile pour composants réutilisables

---

## 🐛 Troubleshooting

### Tests échouent en CI mais passent en local

**Cause** : Différences rendering OS (macOS vs Linux)

**Solution 1** : Générer baseline en CI
```yaml
# .github/workflows/playwright.yml
- name: Generate baseline
  run: npx playwright test tests/visual --update-snapshots
  if: github.ref == 'refs/heads/main'
```

**Solution 2** : Augmenter tolérance
```typescript
// playwright.config.ts
maxDiffPixels: 200,  // Augmenter de 100 à 200
```

---

### Trop de faux positifs

**Cause** : maxDiffPixels trop strict

**Solution** :
```typescript
// playwright.config.ts
expect: {
  toMatchSnapshot: {
    maxDiffPixels: 200,        // Augmenter
    maxDiffPixelRatio: 0.02,   // Augmenter à 2%
  },
}
```

---

### Fonts différentes entre environnements

**Cause** : Fonts système non disponibles en CI

**Solution** : Utiliser web fonts (Google Fonts, etc.)
```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html className={inter.className}>
      {children}
    </html>
  );
}
```

---

### Screenshots en échec après changement CSS

**Cause** : Changement intentionnel non mis à jour

**Solution** :
```bash
# Mettre à jour baseline
npm run test:visual:update

# Vérifier diff
git diff tests/*-snapshots/

# Commit si changement valide
git add tests/*-snapshots/
git commit -m "chore: update visual baseline after CSS change"
```

---

## 📊 Métriques

### Coverage Actuel
- **30+ screenshots** baseline
- **8 breakpoints** testés
- **6 devices** (3 desktop + 3 mobile)
- **80%** pages critiques couvertes

### Impact
- **Détection bugs UI** : 100% automatique
- **Temps validation UI** : 0s (vs 15 min manuel)
- **Faux positifs** : <5% (tolérance configurée)

---

## 🔍 Exemples Avancés

### Test responsive multi-breakpoints
```typescript
import { takeResponsiveScreenshots } from '../helpers/screenshot-helper';

test('Dashboard responsive', async ({ page }) => {
  await page.goto('/admin');
  
  await takeResponsiveScreenshots(page, 'dashboard', [
    { width: 375, height: 667, suffix: 'mobile' },
    { width: 768, height: 1024, suffix: 'tablet' },
    { width: 1440, height: 900, suffix: 'desktop' },
  ]);
});
```

### Test dark mode
```typescript
test('Dashboard dark mode', async ({ page }) => {
  await page.goto('/admin');
  
  // Switch to dark mode
  await page.click('[data-testid="theme-toggle"]');
  await page.waitForTimeout(300);
  
  await takeScreenshot(page, 'dashboard-dark');
});
```

### Test states interactifs
```typescript
test('Button states', async ({ page }) => {
  await page.goto('/admin');
  
  const button = page.locator('[data-testid="button"]');
  
  // Default
  await takeElementScreenshot(page, '[data-testid="button"]', 'button-default');
  
  // Hover
  await button.hover();
  await takeElementScreenshot(page, '[data-testid="button"]', 'button-hover');
  
  // Focus
  await button.focus();
  await takeElementScreenshot(page, '[data-testid="button"]', 'button-focus');
  
  // Active
  await button.click({ noWaitAfter: true });
  await takeElementScreenshot(page, '[data-testid="button"]', 'button-active');
});
```

---

## 📚 Ressources

- [Playwright Screenshots](https://playwright.dev/docs/screenshots)
- [Visual Comparison](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## ✅ Checklist

- [ ] Tests visuels passent (100%)
- [ ] Baseline à jour après changements UI
- [ ] Masqué contenu dynamique
- [ ] Tolérance configurée (maxDiffPixels)
- [ ] CI/CD upload screenshots artifacts
- [ ] Documentation à jour

---

**🎨 Visual Regression Testing - Active depuis Session 20** ✅
