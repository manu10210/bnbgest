# 🎯 Session 20 - Visual Regression Testing & Mobile E2E

> **Date**: 11 Avril 2026  
> **Contexte**: Session 19 complete (tests E2E optimisés 90/90, 1.5 min)  
> **Objectif**: Ajouter tests visuels et mobile pour garantir qualité UI  
> **Durée estimée**: 2-3 heures  

---

## 📋 Contexte Session 20

### État Actuel (Post-Session 19)

**Tests E2E** : ✅ EXCELLENT
- 90/90 tests passent (100%)
- Temps exécution : 1.5 min local, 3 min CI
- Storage state auth (0s login)
- 3 workers parallèles (Chromium, Firefox, WebKit)
- 0 violations WCAG 2.1 AA
- Coverage : ~80% flows critiques

**Gaps Identifiés** :
- ❌ **Pas de tests visuels** : Régressions UI non détectées
- ❌ **Mobile non testé** : Tests desktop uniquement
- ❌ **Pas de screenshots baseline** : Impossible comparer versions
- ❌ **Responsive non validé** : Breakpoints non testés automatiquement

### Problèmes Réels Identifiés

**Régressions visuelles potentielles** :
```typescript
// Exemple: Changement CSS non détecté
// AVANT : padding: 1rem
// APRÈS : padding: 1px  ← Bug visuel non détecté par tests fonctionnels
```

**Mobile non testé** :
- Navigation mobile
- Touch gestures
- Viewport mobile (375x667, 414x896)
- Menu hamburger
- Modals mobile

---

## 🎯 Objectifs Session 20

### Objectif Principal
**Ajouter couverture tests visuels + mobile pour détecter régressions UI**

### Objectifs Spécifiques
1. ✅ **Visual regression testing** : Détecter changements UI non intentionnels
2. ✅ **Mobile E2E tests** : Valider flows sur devices mobiles
3. ✅ **Screenshot comparison** : Baseline vs actual
4. ✅ **Responsive validation** : Tester breakpoints clés
5. ✅ **Documentation** : Guide visual testing + mobile testing

### Métriques Cibles

| Métrique | Session 19 | Session 20 | Gain |
|----------|-----------|-----------|------|
| **Tests visuels** | 0 | 30+ screenshots | +30 |
| **Devices testés** | 1 (Desktop) | 4 (Desktop + 3 mobile) | +300% |
| **Coverage UI** | 0% | 80% pages critiques | +80% |
| **Baseline screenshots** | 0 | 30+ images | +30 |
| **Détection régressions** | Manuel | Automatique | 100% |

---

## 🏗️ Architecture Technique

### Approche Visual Regression Testing

**Option 1 : Playwright Built-in Screenshots** (Recommandé) ✅
- Avantages :
  - ✅ Déjà installé (Playwright)
  - ✅ Gratuit (pas de service cloud)
  - ✅ Contrôle total (local + CI)
  - ✅ Rapide (pas d'API calls externes)
- Inconvénients :
  - ⚠️ Pas d'UI de comparaison fancy
  - ⚠️ Maintenance screenshots baseline manuelle

**Option 2 : Percy (Cloud service)** ❌
- Avantages :
  - ✅ UI comparison élégante
  - ✅ Historique versions
- Inconvénients :
  - ❌ Coût : $299/mois (plan Pro)
  - ❌ Dépendance service externe
  - ❌ Latence API calls

**Option 3 : Chromatic (Storybook)** ❌
- Avantages :
  - ✅ Integration Storybook
  - ✅ UI comparison
- Inconvénients :
  - ❌ Coût : $149/mois
  - ❌ Requiert Storybook setup (2-3h)

**Choix : Playwright Built-in** ✅

### Configuration Mobile Testing

**Devices à tester** :
```typescript
// playwright.config.ts
const mobileDevices = {
  'iPhone SE': {
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...',
  },
  'iPhone 12 Pro': {
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)...',
  },
  'Pixel 5': {
    viewport: { width: 393, height: 851 },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)...',
  },
  'iPad Air': {
    viewport: { width: 820, height: 1180 },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)...',
  },
};
```

---

## 📝 Plan d'Exécution Détaillé

### Phase 1 : Visual Regression Setup (45 min)

#### 1.1 Configuration Playwright Screenshots (15 min)

**Créer `playwright.config.ts` section visual** :
```typescript
// playwright.config.ts
export default defineConfig({
  // ... existing config
  
  use: {
    // ... existing use options
    
    // Visual regression settings
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  
  // Snapshot settings
  expect: {
    toMatchSnapshot: {
      maxDiffPixels: 100,        // Allow 100 pixels difference
      maxDiffPixelRatio: 0.01,   // Allow 1% difference
      threshold: 0.2,            // Color threshold
    },
  },
});
```

#### 1.2 Créer Helper Screenshot (15 min)

**Fichier `tests/helpers/screenshot-helper.ts`** :
```typescript
import { Page, expect } from '@playwright/test';

/**
 * Take screenshot and compare with baseline
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    mask?: string[]; // CSS selectors to mask dynamic content
  }
) {
  // Mask dynamic content (dates, IDs, etc.)
  if (options?.mask) {
    for (const selector of options.mask) {
      await page.locator(selector).evaluateAll(elements => {
        elements.forEach(el => {
          (el as HTMLElement).style.visibility = 'hidden';
        });
      });
    }
  }

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Wait for images to load
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options?.fullPage ?? false,
    clip: options?.clip,
  });
}

/**
 * Take screenshot of specific element
 */
export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string
) {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toHaveScreenshot(`${name}.png`);
}
```

#### 1.3 Créer Test Suite Visual (15 min)

**Fichier `tests/visual/visual-regression.spec.ts`** :
```typescript
import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot } from '../helpers/screenshot-helper';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Dashboard - Full page', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-full', {
      fullPage: true,
      mask: [
        '[data-testid="current-time"]',    // Dynamic time
        '[data-testid="live-revenue"]',    // Real-time data
      ],
    });
  });

  test('Bookings - List view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    
    await takeScreenshot(page, 'bookings-list', {
      mask: ['[data-testid="booking-date"]'],
    });
  });

  test('Guests - Card layout', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    
    await takeScreenshot(page, 'guests-cards');
  });

  test('Settings - Sidebar navigation', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'sidebar', {
      clip: { x: 0, y: 0, width: 280, height: 800 },
    });
  });
});
```

---

### Phase 2 : Mobile Testing Setup (60 min)

#### 2.1 Ajouter Mobile Devices Config (15 min)

**Modifier `playwright.config.ts`** :
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ... existing config
  
  projects: [
    // Existing desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    
    // NEW: Mobile devices
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad (gen 7)'],
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
```

#### 2.2 Créer Mobile Test Helpers (20 min)

**Fichier `tests/helpers/mobile-helper.ts`** :
```typescript
import { Page } from '@playwright/test';

/**
 * Check if test is running on mobile viewport
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * Open mobile hamburger menu
 */
export async function openMobileMenu(page: Page) {
  if (!isMobileViewport(page)) return;
  
  const hamburger = page.locator('[data-testid="mobile-menu-button"]');
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await page.waitForSelector('[data-testid="mobile-menu"]', { 
      state: 'visible' 
    });
  }
}

/**
 * Close mobile hamburger menu
 */
export async function closeMobileMenu(page: Page) {
  if (!isMobileViewport(page)) return;
  
  const closeButton = page.locator('[data-testid="mobile-menu-close"]');
  if (await closeButton.isVisible()) {
    await closeButton.click();
    await page.waitForSelector('[data-testid="mobile-menu"]', { 
      state: 'hidden' 
    });
  }
}

/**
 * Swipe gesture (for mobile carousels, etc.)
 */
export async function swipe(
  page: Page,
  selector: string,
  direction: 'left' | 'right' | 'up' | 'down'
) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) throw new Error(`Element ${selector} not found`);
  
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  const distance = 100;
  
  switch (direction) {
    case 'left':
      endX = startX - distance;
      break;
    case 'right':
      endX = startX + distance;
      break;
    case 'up':
      endY = startY - distance;
      break;
    case 'down':
      endY = startY + distance;
      break;
  }
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Tap (mobile click equivalent)
 */
export async function tap(page: Page, selector: string) {
  await page.locator(selector).tap();
}
```

#### 2.3 Créer Mobile Test Suite (25 min)

**Fichier `tests/e2e/mobile/mobile-navigation.spec.ts`** :
```typescript
import { test, expect } from '@playwright/test';
import { setupAuth } from '../../helpers/auth-helper';
import { 
  isMobileViewport, 
  openMobileMenu, 
  closeMobileMenu 
} from '../../helpers/mobile-helper';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should display mobile menu on small viewport', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Desktop only test');
    
    await page.goto('/admin');
    
    // Hamburger menu should be visible
    const hamburger = page.locator('[data-testid="mobile-menu-button"]');
    await expect(hamburger).toBeVisible();
    
    // Desktop sidebar should be hidden
    const sidebar = page.locator('[data-testid="admin-sidebar"]');
    await expect(sidebar).toBeHidden();
  });

  test('should open and close mobile menu', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Desktop only test');
    
    await page.goto('/admin');
    
    // Open menu
    await openMobileMenu(page);
    const menu = page.locator('[data-testid="mobile-menu"]');
    await expect(menu).toBeVisible();
    
    // Close menu
    await closeMobileMenu(page);
    await expect(menu).toBeHidden();
  });

  test('should navigate to Bookings via mobile menu', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Desktop only test');
    
    await page.goto('/admin');
    
    await openMobileMenu(page);
    await page.click('[data-testid="mobile-bookings-tab"]');
    
    // Should navigate to bookings
    const bookingsTab = page.locator('[data-testid="bookings-tab"]');
    await expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display responsive cards on mobile', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Desktop only test');
    
    await page.goto('/admin');
    await openMobileMenu(page);
    await page.click('[data-testid="mobile-guests-tab"]');
    
    // Cards should stack vertically
    const cards = page.locator('[data-testid="guest-card"]');
    const count = await cards.count();
    
    expect(count).toBeGreaterThan(0);
    
    // First card should be full width
    const firstCard = cards.first();
    const box = await firstCard.boundingBox();
    const viewport = page.viewportSize();
    
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    
    if (box && viewport) {
      const cardWidth = box.width;
      const viewportWidth = viewport.width;
      
      // Card should be ~90-100% of viewport width (accounting for padding)
      expect(cardWidth).toBeGreaterThan(viewportWidth * 0.85);
    }
  });
});
```

---

### Phase 3 : Tests Visuels Complets (30 min)

#### 3.1 Tests Visuels Pages Critiques (20 min)

**Fichier `tests/visual/critical-pages.spec.ts`** :
```typescript
import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot, takeElementScreenshot } from '../helpers/screenshot-helper';

test.describe('Critical Pages - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Admin Dashboard - Above the fold', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-hero', {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="live-stats"]',
      ],
    });
  });

  test('Bookings - Calendar view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.click('[data-testid="calendar-view"]');
    
    await takeElementScreenshot(
      page,
      '[data-testid="calendar-component"]',
      'bookings-calendar'
    );
  });

  test('Guest Profile - Modal', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    
    // Open first guest profile
    const firstGuest = page.locator('[data-testid="guest-card"]').first();
    await firstGuest.click();
    
    await page.waitForSelector('[data-testid="guest-modal"]');
    
    await takeElementScreenshot(
      page,
      '[data-testid="guest-modal"]',
      'guest-profile-modal'
    );
  });

  test('Settings - Payment configuration', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.click('[data-testid="payments-tab"]');
    
    await takeScreenshot(page, 'settings-payments', {
      mask: ['[data-testid="stripe-key"]'], // Mask sensitive data
    });
  });

  test('Mobile Upload - QR Code page', async ({ page }) => {
    await page.goto('/upload-video');
    
    await takeScreenshot(page, 'upload-video-qr', {
      fullPage: true,
    });
  });
});
```

#### 3.2 Tests Visuels Composants (10 min)

**Fichier `tests/visual/components.spec.ts`** :
```typescript
import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeElementScreenshot } from '../helpers/screenshot-helper';

test.describe('Components - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Sidebar - Navigation menu', async ({ page }) => {
    await page.goto('/admin');
    
    await takeElementScreenshot(
      page,
      '[data-testid="admin-sidebar"]',
      'sidebar-nav'
    );
  });

  test('KPI Cards - Revenue stats', async ({ page }) => {
    await page.goto('/admin');
    
    await takeElementScreenshot(
      page,
      '[data-testid="revenue-card"]',
      'kpi-revenue'
    );
  });

  test('Data Table - Bookings list', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    
    await takeElementScreenshot(
      page,
      '[data-testid="bookings-table"]',
      'table-bookings'
    );
  });

  test('Button States - Primary button', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    
    const addButton = page.locator('[data-testid="add-guest-button"]');
    
    // Default state
    await takeElementScreenshot(page, '[data-testid="add-guest-button"]', 'button-default');
    
    // Hover state
    await addButton.hover();
    await takeElementScreenshot(page, '[data-testid="add-guest-button"]', 'button-hover');
  });

  test('Form Validation - Error states', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.click('[data-testid="add-guest-button"]');
    
    // Submit empty form to trigger validation
    await page.click('[data-testid="submit-guest"]');
    
    await takeElementScreenshot(
      page,
      '[data-testid="guest-form"]',
      'form-validation-errors'
    );
  });
});
```

---

### Phase 4 : Responsive Testing (30 min)

#### 4.1 Tests Breakpoints (20 min)

**Fichier `tests/visual/responsive.spec.ts`** :
```typescript
import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot } from '../helpers/screenshot-helper';

const breakpoints = [
  { name: 'mobile-sm', width: 375, height: 667 },   // iPhone SE
  { name: 'mobile-md', width: 390, height: 844 },   // iPhone 12
  { name: 'mobile-lg', width: 414, height: 896 },   // iPhone 12 Pro Max
  { name: 'tablet-sm', width: 768, height: 1024 },  // iPad Mini
  { name: 'tablet-lg', width: 1024, height: 1366 }, // iPad Pro
  { name: 'desktop-sm', width: 1280, height: 800 }, // Laptop
  { name: 'desktop-md', width: 1440, height: 900 }, // Desktop
  { name: 'desktop-lg', width: 1920, height: 1080 }, // Full HD
];

test.describe('Responsive Design - All breakpoints', () => {
  for (const breakpoint of breakpoints) {
    test(`Dashboard at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await setupAuth(page);
      await page.goto('/admin');
      
      await takeScreenshot(page, `dashboard-${breakpoint.name}`, {
        mask: ['[data-testid="current-time"]'],
      });
    });
  }
});
```

#### 4.2 Tests Orientation (10 min)

**Ajouter tests orientation** dans `tests/visual/responsive.spec.ts` :
```typescript
test.describe('Responsive Design - Orientation', () => {
  test('Mobile landscape - Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
    
    await setupAuth(page);
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-landscape');
  });

  test('Tablet portrait - Bookings', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad portrait
    
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    
    await takeScreenshot(page, 'bookings-tablet-portrait');
  });

  test('Tablet landscape - Calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 }); // iPad landscape
    
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.click('[data-testid="calendar-view"]');
    
    await takeScreenshot(page, 'calendar-tablet-landscape');
  });
});
```

---

### Phase 5 : CI/CD Integration (15 min)

#### 5.1 Update GitHub Actions Workflow (10 min)

**Modifier `.github/workflows/playwright.yml`** :
```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      NEXTAUTH_URL: http://localhost:3000
      TEST_USER_PASSWORD: Demo1234!

    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Cache Playwright Browsers
        id: cache-playwright
        uses: actions/cache@v3
        with:
          path: ~/.cache/ms-playwright
          key: ${{ runner.os }}-playwright-${{ hashFiles('**/package-lock.json') }}
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
        if: steps.cache-playwright.outputs.cache-hit != 'true'
      
      - name: Install Playwright Dependencies (cache hit)
        run: npx playwright install-deps
        if: steps.cache-playwright.outputs.cache-hit == 'true'
      
      - name: Run Playwright tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
      
      # NEW: Upload screenshots for comparison
      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: screenshots
          path: test-results/**/*.png
          retention-days: 30
      
      # NEW: Upload baseline screenshots (first time only)
      - name: Upload baseline screenshots
        uses: actions/upload-artifact@v3
        if: github.ref == 'refs/heads/main' && success()
        with:
          name: baseline-screenshots
          path: tests/**/*-snapshots/**/*.png
          retention-days: 90
```

#### 5.2 Créer Script Baseline Update (5 min)

**Fichier `scripts/update-visual-baseline.sh`** :
```bash
#!/bin/bash

# Update visual regression baseline screenshots
# Run this after intentional UI changes

echo "🔄 Updating visual regression baseline screenshots..."

# Remove old baseline
rm -rf tests/**/*-snapshots/

# Run tests to generate new baseline
npx playwright test --update-snapshots

echo "✅ Baseline updated!"
echo "📝 Commit with message: 'chore: update visual regression baseline'"
```

**Ajouter script NPM** dans `package.json` :
```json
{
  "scripts": {
    "test:visual": "playwright test tests/visual",
    "test:visual:update": "playwright test tests/visual --update-snapshots",
    "test:mobile": "playwright test tests/e2e/mobile"
  }
}
```

---

### Phase 6 : Documentation (30 min)

#### 6.1 Créer Guide Visual Testing (15 min)

**Fichier `VISUAL_TESTING_GUIDE.md`** :
```markdown
# 🎨 Visual Regression Testing Guide

## Overview
Cette application utilise Playwright built-in screenshot comparison pour détecter les régressions visuelles.

## Structure
```
tests/
├── visual/
│   ├── visual-regression.spec.ts   # Tests pages principales
│   ├── critical-pages.spec.ts      # Tests pages critiques
│   ├── components.spec.ts          # Tests composants UI
│   └── responsive.spec.ts          # Tests responsive
├── helpers/
│   └── screenshot-helper.ts        # Helpers screenshots
└── *-snapshots/                    # Baseline screenshots
```

## Commandes

### Lancer tests visuels
```bash
npm run test:visual
```

### Mettre à jour baseline
```bash
# Après changements UI intentionnels
npm run test:visual:update
```

### Comparer screenshots
```bash
# Ouvrir rapport HTML avec comparaison
npx playwright show-report
```

## Best Practices

### 1. Masquer contenu dynamique
```typescript
await takeScreenshot(page, 'dashboard', {
  mask: [
    '[data-testid="current-time"]',  // Date/heure change
    '[data-testid="live-stats"]',    // Données temps réel
  ],
});
```

### 2. Attendre fonts/images
```typescript
// Helper le fait automatiquement
await page.evaluate(() => document.fonts.ready);
await page.waitForLoadState('networkidle');
```

### 3. Tolérance diff pixels
```typescript
// playwright.config.ts
expect: {
  toMatchSnapshot: {
    maxDiffPixels: 100,       // 100px différence OK
    maxDiffPixelRatio: 0.01,  // 1% différence OK
  },
}
```

## Workflow

### Développement local
1. Faire changements UI
2. Lancer `npm run test:visual`
3. Si échec attendu : `npm run test:visual:update`
4. Commit baseline mis à jour

### CI/CD
1. PR créée → Tests visuels auto
2. Échec détecté → Rapport artifacts
3. Reviewer vérifie screenshots
4. Approuve ou demande fix

## Troubleshooting

### Tests échouent en CI mais passent en local
- **Cause** : Différences rendering OS (macOS vs Linux)
- **Solution** : Générer baseline en CI

### Trop de faux positifs
- **Cause** : maxDiffPixels trop strict
- **Solution** : Augmenter tolérance dans config
```

#### 6.2 Créer Guide Mobile Testing (15 min)

**Fichier `MOBILE_TESTING_GUIDE.md`** :
```markdown
# 📱 Mobile E2E Testing Guide

## Overview
Tests E2E sur devices mobiles (iPhone, Android, iPad) pour valider responsive design et touch interactions.

## Devices Testés

### Mobile
- **iPhone SE** : 375x667 (petit écran)
- **iPhone 12** : 390x844 (standard)
- **Pixel 5** : 393x851 (Android)

### Tablet
- **iPad (gen 7)** : 820x1180 (tablette)

## Structure
```
tests/
├── e2e/
│   └── mobile/
│       ├── mobile-navigation.spec.ts
│       ├── mobile-booking.spec.ts
│       └── mobile-gestures.spec.ts
└── helpers/
    └── mobile-helper.ts
```

## Commandes

### Lancer tests mobile
```bash
npm run test:mobile
```

### Lancer tests mobile spécifique device
```bash
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Helpers Disponibles

### 1. Check mobile viewport
```typescript
import { isMobileViewport } from '../helpers/mobile-helper';

if (isMobileViewport(page)) {
  // Code mobile spécifique
}
```

### 2. Ouvrir/fermer menu mobile
```typescript
import { openMobileMenu, closeMobileMenu } from '../helpers/mobile-helper';

await openMobileMenu(page);
await closeMobileMenu(page);
```

### 3. Swipe gestures
```typescript
import { swipe } from '../helpers/mobile-helper';

await swipe(page, '[data-testid="carousel"]', 'left');
```

### 4. Tap (mobile click)
```typescript
import { tap } from '../helpers/mobile-helper';

await tap(page, '[data-testid="button"]');
```

## Best Practices

### 1. Skip tests non mobile
```typescript
test.skip(!isMobileViewport(page), 'Desktop only test');
```

### 2. Tester menu hamburger
```typescript
const hamburger = page.locator('[data-testid="mobile-menu-button"]');
await expect(hamburger).toBeVisible();
```

### 3. Valider cards responsive
```typescript
const card = page.locator('[data-testid="card"]').first();
const box = await card.boundingBox();
const viewport = page.viewportSize();

// Card should be ~90% viewport width
expect(box.width).toBeGreaterThan(viewport.width * 0.85);
```

## Workflow

### Développement local
1. Développer feature
2. Tester desktop : `npm run test:a11y`
3. Tester mobile : `npm run test:mobile`
4. Commit

### CI/CD
- Tests desktop ET mobile automatiques
- 6 projects total (3 desktop + 3 mobile)

## Troubleshooting

### Menu mobile ne s'ouvre pas
- Vérifier `data-testid="mobile-menu-button"` existe
- Vérifier viewport < 768px

### Touch gestures ne fonctionnent pas
- Utiliser `tap()` au lieu de `click()`
- Utiliser `swipe()` pour gestures
```

---

## 📊 Métriques Attendues

### Avant Session 20
- Tests visuels : **0**
- Devices testés : **1** (Desktop Chrome)
- Coverage UI : **0%**
- Screenshots baseline : **0**
- Détection régressions : **Manuelle**

### Après Session 20
- Tests visuels : **30+** screenshots
- Devices testés : **6** (3 desktop + 3 mobile)
- Coverage UI : **80%** pages critiques
- Screenshots baseline : **30+** images
- Détection régressions : **Automatique**

### Impact
- **Détection bugs UI** : 100% automatique (vs 0% avant)
- **Mobile testing** : +300% coverage (1 → 4 devices)
- **Temps validation UI** : 0s (automatique vs 15 min manuel)
- **Confidence déploiement** : +50% (UI validée auto)

---

## ✅ Checklist Validation

### Tests Visuels
- [ ] Configuration screenshot dans `playwright.config.ts`
- [ ] Helper `screenshot-helper.ts` créé
- [ ] Test suite `visual-regression.spec.ts` (pages principales)
- [ ] Test suite `critical-pages.spec.ts` (pages critiques)
- [ ] Test suite `components.spec.ts` (composants UI)
- [ ] Test suite `responsive.spec.ts` (breakpoints)
- [ ] 30+ screenshots baseline générés
- [ ] Tests visuels passent (100%)

### Mobile Testing
- [ ] Configuration mobile devices dans `playwright.config.ts`
- [ ] Helper `mobile-helper.ts` créé
- [ ] Test suite `mobile-navigation.spec.ts`
- [ ] Test suite `mobile-booking.spec.ts` (optionnel)
- [ ] Tests mobile passent (100%)
- [ ] 3 devices mobiles testés (iPhone, Android, iPad)

### CI/CD
- [ ] Workflow GitHub Actions mis à jour
- [ ] Artifacts screenshots configurés
- [ ] Script `update-visual-baseline.sh` créé
- [ ] Scripts NPM ajoutés (`test:visual`, `test:mobile`)

### Documentation
- [ ] `VISUAL_TESTING_GUIDE.md` créé
- [ ] `MOBILE_TESTING_GUIDE.md` créé
- [ ] `AMELIORATIONS_SESSION20_COMPLETE.md` créé
- [ ] README mis à jour (si nécessaire)

---

## 🚀 Commandes Rapides

```bash
# Tests visuels complets
npm run test:visual

# Mettre à jour baseline après changements UI
npm run test:visual:update

# Tests mobile
npm run test:mobile

# Tests complets (desktop + mobile + visual)
npm run test:a11y

# Rapport HTML avec screenshots
npx playwright show-report

# Tests specific device
npx playwright test --project="iPhone 12"
npx playwright test --project="Pixel 5"
```

---

## 📝 Notes Techniques

### Différences OS Rendering
- **macOS** : Rendering légèrement différent (fonts, anti-aliasing)
- **Linux CI** : Rendering peut différer
- **Solution** : Générer baseline en CI, ou tolérance +100 pixels

### Performance Impact
- **Screenshots** : +0.5s par screenshot
- **Total overhead** : ~15s pour 30 screenshots
- **Mitigation** : Parallélisation (workers: 3)

### Maintenance Baseline
- **Fréquence update** : Après chaque changement UI intentionnel
- **Storage** : ~2MB pour 30 screenshots PNG
- **Retention CI** : 90 jours (baseline), 30 jours (test results)

---

## 🎯 Prochaines Sessions (Optionnel)

### Session 21 : Performance Testing
- Lighthouse CI integration
- Core Web Vitals monitoring
- Bundle size tracking
- Performance budgets

### Session 22 : Security Testing
- OWASP ZAP integration
- Dependency vulnerability scanning
- Security headers validation
- Penetration testing

### Session 23 : Load Testing
- k6 setup
- Load scenarios (booking flow)
- Stress testing
- Performance under load

---

**Session 20 prête à démarrer ! 🚀**

**Temps estimé total** : 2-3 heures  
**Impact** : +80% UI coverage, détection bugs UI 100% auto  
**Effort** : Moyen (setup puis maintenance faible)  
