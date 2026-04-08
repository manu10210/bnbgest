# 🧪 Session 17 - Tests E2E avec Playwright - PLAN

**Date**: 8 Avril 2026  
**Durée estimée**: ~4-6 heures  
**Objectif**: Implémenter des tests End-to-End avec Playwright pour garantir la qualité et prévenir les régressions

---

## 🎯 Objectif

Mettre en place une **infrastructure de tests E2E complète** avec Playwright pour :
- ✅ Tester les flows critiques (booking, guest, maintenance)
- ✅ Valider l'accessibilité (axe-core integration)
- ✅ Prévenir les régressions futures
- ✅ Intégration CI/CD (GitHub Actions)

---

## 📋 Phases d'Implémentation

### **Phase 1: Setup Playwright (30 min)**

#### 1.1 Installation
```bash
npm install -D @playwright/test
npx playwright install
```

#### 1.2 Configuration (`playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 1.3 Structure dossiers
```
tests/
├── e2e/
│   ├── booking/
│   │   ├── booking-creation.spec.ts
│   │   └── booking-qr-code.spec.ts
│   ├── guest/
│   │   ├── guest-management.spec.ts
│   │   └── guest-search.spec.ts
│   ├── maintenance/
│   │   ├── maintenance-tasks.spec.ts
│   │   └── maintenance-calendar.spec.ts
│   ├── accessibility/
│   │   ├── a11y-modals.spec.ts
│   │   ├── a11y-navigation.spec.ts
│   │   └── a11y-forms.spec.ts
│   └── fixtures/
│       └── test-data.ts
├── helpers/
│   ├── auth-helper.ts
│   └── db-helper.ts
└── reports/
```

---

### **Phase 2: Tests Critiques (2-3 heures)**

#### 2.1 Booking Flow Tests (`tests/e2e/booking/booking-creation.spec.ts`)

**Test Cases**:
1. ✅ Créer une nouvelle réservation
2. ✅ Vérifier la validation des champs obligatoires
3. ✅ Vérifier le calcul automatique des prix
4. ✅ Vérifier la génération du QR code
5. ✅ Vérifier la sauvegarde en base de données

**Exemple de test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Booking Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/admin');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
    
    // Navigate to bookings
    await page.click('text=Réservations');
  });

  test('should create a new booking successfully', async ({ page }) => {
    // Click "Nouvelle Réservation" button
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Wait for modal to appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Fill booking form
    await page.fill('[name="guestName"]', 'John Doe');
    await page.fill('[name="email"]', 'john.doe@example.com');
    await page.fill('[name="checkIn"]', '2026-05-01');
    await page.fill('[name="checkOut"]', '2026-05-07');
    await page.selectOption('[name="propertyId"]', { index: 1 });
    await page.fill('[name="adults"]', '2');
    await page.fill('[name="children"]', '1');
    
    // Submit form
    await page.click('button:has-text("Créer la réservation")');
    
    // Verify success toast
    await expect(page.locator('text=Réservation créée avec succès')).toBeVisible();
    
    // Verify modal closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Verify booking appears in list
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Try to submit empty form
    await page.click('button:has-text("Créer la réservation")');
    
    // Verify validation messages
    await expect(page.locator('text=Ce champ est requis')).toHaveCount(5);
  });

  test('should calculate total price automatically', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Fill dates (6 nights)
    await page.fill('[name="checkIn"]', '2026-05-01');
    await page.fill('[name="checkOut"]', '2026-05-07');
    
    // Select property with 100€/night
    await page.selectOption('[name="propertyId"]', { label: 'Villa Sunset (100€)' });
    
    // Verify calculated price
    await expect(page.locator('[data-testid="total-price"]')).toHaveText('600 €');
  });
});
```

---

#### 2.2 Guest Management Tests (`tests/e2e/guest/guest-management.spec.ts`)

**Test Cases**:
1. ✅ Créer un nouveau voyageur
2. ✅ Modifier un voyageur existant
3. ✅ Rechercher un voyageur
4. ✅ Vérifier la validation email
5. ✅ Supprimer un voyageur

**Exemple de test**:
```typescript
test.describe('Guest Management', () => {
  test('should create a new guest', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Voyageurs');
    
    // Open new guest modal
    await page.click('button:has-text("Nouveau Voyageur")');
    
    // Fill form
    await page.fill('[name="name"]', 'Jane Smith');
    await page.fill('[name="email"]', 'jane.smith@example.com');
    await page.fill('[name="phone"]', '+33612345678');
    await page.selectOption('[name="nationality"]', 'France');
    
    // Submit
    await page.click('button:has-text("Enregistrer")');
    
    // Verify success
    await expect(page.locator('text=Voyageur créé avec succès')).toBeVisible();
    await expect(page.locator('text=Jane Smith')).toBeVisible();
  });

  test('should search guests by name', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Voyageurs');
    
    // Type in search
    await page.fill('[placeholder*="Rechercher"]', 'Jane');
    
    // Verify filtered results
    await expect(page.locator('text=Jane Smith')).toBeVisible();
    await expect(page.locator('text=John Doe')).not.toBeVisible();
  });
});
```

---

#### 2.3 Maintenance Tasks Tests (`tests/e2e/maintenance/maintenance-tasks.spec.ts`)

**Test Cases**:
1. ✅ Créer une nouvelle tâche de maintenance
2. ✅ Marquer une tâche comme complétée
3. ✅ Filtrer par statut (pending/completed)
4. ✅ Assigner à une propriété
5. ✅ Vérifier les priorités

---

### **Phase 3: Tests d'Accessibilité (1-2 heures)**

#### 3.1 Installation axe-core
```bash
npm install -D @axe-core/playwright
```

#### 3.2 Tests Accessibilité (`tests/e2e/accessibility/a11y-modals.spec.ts`)

**Test Cases**:
1. ✅ Tous les modals ont role="dialog"
2. ✅ Tous les modals ont aria-modal="true"
3. ✅ Tous les modals ont aria-labelledby
4. ✅ Focus auto sur premier champ au montage
5. ✅ ESC key ferme tous les modals
6. ✅ Skip link fonctionnel
7. ✅ Landmarks présents (main, header, nav)

**Exemple de test**:
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility - Modals', () => {
  test('BookingManager modal should be accessible', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Réservations');
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"]');
    
    // Run axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    // Verify no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Modal should have correct ARIA attributes', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Réservations');
    await page.click('button:has-text("Nouvelle Réservation")');
    
    const modal = page.locator('[role="dialog"]');
    
    // Verify ARIA attributes
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby');
  });

  test('ESC key should close modal', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Réservations');
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Verify modal open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Verify modal closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('Focus should auto-focus on first input', async ({ page }) => {
    await page.goto('/admin');
    await page.click('text=Réservations');
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Wait for modal
    await page.waitForTimeout(200); // Focus useEffect delay
    
    // Verify first input is focused
    const firstInput = page.locator('[role="dialog"] input').first();
    await expect(firstInput).toBeFocused();
  });
});
```

---

#### 3.3 Tests Navigation Accessibilité (`tests/e2e/accessibility/a11y-navigation.spec.ts`)

```typescript
test.describe('Accessibility - Navigation', () => {
  test('Skip link should be functional', async ({ page }) => {
    await page.goto('/admin');
    
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');
    
    // Verify skip link visible
    await expect(page.locator('.skip-link')).toBeVisible();
    
    // Press Enter
    await page.keyboard.press('Enter');
    
    // Verify focus on main content
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('Landmarks should be present', async ({ page }) => {
    await page.goto('/admin');
    
    // Verify landmarks
    await expect(page.locator('[role="banner"]')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();
    await expect(page.locator('[aria-label="Fil d\'Ariane"]')).toBeVisible();
  });

  test('Breadcrumbs should have aria-current', async ({ page }) => {
    await page.goto('/admin');
    
    // Verify breadcrumb structure
    const breadcrumb = page.locator('[aria-label="Fil d\'Ariane"]');
    await expect(breadcrumb).toBeVisible();
    
    // Verify aria-current on active page
    await expect(breadcrumb.locator('[aria-current="page"]')).toBeVisible();
  });

  test('Page should have no axe violations', async ({ page }) => {
    await page.goto('/admin');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

---

### **Phase 4: CI/CD Integration (30 min)**

#### 4.1 GitHub Actions Workflow (`.github/workflows/playwright.yml`)

```yaml
name: Playwright Tests
on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
      
    - name: Setup database
      run: |
        npx prisma generate
        npx prisma migrate deploy
      env:
        DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        
    - name: Run Playwright tests
      run: npx playwright test
      env:
        DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
        NEXTAUTH_URL: http://localhost:3000
        
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

---

### **Phase 5: Fixtures & Helpers (1 heure)**

#### 5.1 Test Data Fixtures (`tests/fixtures/test-data.ts`)

```typescript
export const testData = {
  users: {
    admin: {
      email: 'admin@bnbgest.com',
      password: 'admin123',
      name: 'Admin User',
    },
    owner: {
      email: 'owner@bnbgest.com',
      password: 'owner123',
      name: 'Property Owner',
    },
  },
  
  properties: {
    villa: {
      name: 'Villa Sunset',
      address: '123 Beach Road',
      pricePerNight: 100,
      maxGuests: 6,
    },
    apartment: {
      name: 'City Apartment',
      address: '456 Downtown St',
      pricePerNight: 75,
      maxGuests: 4,
    },
  },
  
  bookings: {
    upcoming: {
      guestName: 'John Doe',
      email: 'john.doe@example.com',
      checkIn: '2026-05-01',
      checkOut: '2026-05-07',
      adults: 2,
      children: 1,
      status: 'confirmed',
    },
  },
  
  guests: {
    jane: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '+33612345678',
      nationality: 'France',
    },
  },
};
```

---

#### 5.2 Auth Helper (`tests/helpers/auth-helper.ts`)

```typescript
import { Page } from '@playwright/test';

export async function login(page: Page, email: string, password: string) {
  await page.goto('/admin');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/admin');
}

export async function logout(page: Page) {
  await page.click('[aria-label="Menu utilisateur"]');
  await page.click('text=Déconnexion');
  await page.waitForURL('/');
}
```

---

#### 5.3 Database Helper (`tests/helpers/db-helper.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanDatabase() {
  await prisma.booking.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.maintenanceTask.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
}

export async function seedTestData() {
  // Create test user
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      // Add hashed password
    },
  });
  
  // Create test property
  const property = await prisma.property.create({
    data: {
      name: 'Test Villa',
      address: '123 Test St',
      pricePerNight: 100,
    },
  });
  
  return { property };
}
```

---

## 📊 Métriques Cibles

### Coverage Cible
- **E2E Coverage**: 80% des flows critiques
- **Accessibility Tests**: 100% des modals + navigation
- **Cross-browser**: Chromium, Firefox, WebKit

### Performance Tests
- **Page Load**: < 3s
- **Modal Open**: < 200ms
- **Form Submit**: < 1s

### Accessibilité Axe-Core
- **Violations**: 0 (WCAG 2.1 AA)
- **Tests**: 15+ scénarios
- **Modals**: 7 modals testés

---

## 🎯 Scripts NPM

Ajouter dans `package.json`:

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:headed": "playwright test --headed",
    "test:chromium": "playwright test --project=chromium",
    "test:firefox": "playwright test --project=firefox",
    "test:webkit": "playwright test --project=webkit",
    "test:a11y": "playwright test tests/e2e/accessibility",
    "test:report": "playwright show-report"
  }
}
```

---

## ✅ Checklist Exécution

### Phase 1: Setup (30 min)
- [ ] Installer Playwright (`npm install -D @playwright/test`)
- [ ] Installer navigateurs (`npx playwright install`)
- [ ] Créer `playwright.config.ts`
- [ ] Créer structure dossiers `tests/e2e/`
- [ ] Tester configuration (`npx playwright test --list`)

### Phase 2: Tests Booking (1h)
- [ ] Créer `booking-creation.spec.ts`
- [ ] Test: Créer réservation
- [ ] Test: Validation champs
- [ ] Test: Calcul prix
- [ ] Test: QR code generation
- [ ] Exécuter tests (`npm run test:chromium`)

### Phase 3: Tests Guest (45 min)
- [ ] Créer `guest-management.spec.ts`
- [ ] Test: Créer voyageur
- [ ] Test: Modifier voyageur
- [ ] Test: Recherche
- [ ] Test: Validation email

### Phase 4: Tests Maintenance (45 min)
- [ ] Créer `maintenance-tasks.spec.ts`
- [ ] Test: Créer tâche
- [ ] Test: Marquer complété
- [ ] Test: Filtres statut

### Phase 5: Tests Accessibilité (1h30)
- [ ] Installer `@axe-core/playwright`
- [ ] Créer `a11y-modals.spec.ts`
- [ ] Test: ARIA attributes (7 modals)
- [ ] Test: Focus management
- [ ] Test: ESC key
- [ ] Créer `a11y-navigation.spec.ts`
- [ ] Test: Skip link
- [ ] Test: Landmarks
- [ ] Test: Breadcrumbs
- [ ] Test: Axe violations page complète

### Phase 6: Fixtures & Helpers (1h)
- [ ] Créer `test-data.ts`
- [ ] Créer `auth-helper.ts`
- [ ] Créer `db-helper.ts`
- [ ] Refactoriser tests avec helpers

### Phase 7: CI/CD (30 min)
- [ ] Créer `.github/workflows/playwright.yml`
- [ ] Configurer secrets GitHub
- [ ] Tester workflow sur push
- [ ] Vérifier artifacts upload

### Phase 8: Documentation (30 min)
- [ ] Créer `TESTING.md`
- [ ] Documenter patterns
- [ ] Ajouter exemples
- [ ] Créer `AMELIORATIONS_SESSION17_COMPLETE.md`

---

## 🚀 Résultat Attendu

### Après Session 17
- ✅ **15+ tests E2E** fonctionnels
- ✅ **0 violations accessibilité** (axe-core)
- ✅ **CI/CD pipeline** opérationnel
- ✅ **Coverage 80%** des flows critiques
- ✅ **Cross-browser testing** (3 navigateurs)
- ✅ **Documentation complète** (TESTING.md)

### Impact Application
- ✅ Prévention régressions
- ✅ Confiance déploiement
- ✅ Validation accessibilité automatisée
- ✅ Quality gate CI/CD

---

## 📚 Ressources

### Documentation Playwright
- https://playwright.dev/docs/intro
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/test-assertions

### Axe-Core Playwright
- https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright

### WCAG 2.1 AA Testing
- https://www.w3.org/WAI/WCAG21/quickref/
- https://webaim.org/resources/contrastchecker/

---

**Session 17 - Prêt pour exécution ! 🧪🚀**
