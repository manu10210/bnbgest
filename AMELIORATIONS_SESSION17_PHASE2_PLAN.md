# 🧪 Session 17 Phase 2 - Fix Tests + CI/CD - PLAN

**Date**: 8 Avril 2026  
**Durée estimée**: ~2-3 heures  
**Objectif**: Rendre les tests fonctionnels avec authentification + Setup CI/CD

---

## 🎯 Objectifs Phase 2

### 1. Fix Tests avec Authentication (45 min)
- Mettre à jour `a11y-navigation.spec.ts` avec `setupAuth()`
- Mettre à jour `a11y-modals.spec.ts` avec `setupAuth()`
- Re-exécuter tests et valider succès
- Target: 30/30 tests passent ✅

### 2. Database Test Helper (30 min)
- Créer `tests/helpers/db-helper.ts`
- Function `createTestUser()` - Créer utilisateur pour tests
- Function `cleanupTestData()` - Nettoyer entre tests
- Function `seedTestData()` - Seed propriétés/réservations test

### 3. CI/CD GitHub Actions (45 min)
- Créer `.github/workflows/playwright.yml`
- Configuration secrets (DATABASE_URL, TEST_USER_EMAIL, etc.)
- Upload artifacts (screenshots, videos, reports)
- Badge status dans README

### 4. Validation Finale (30 min)
- Exécuter tous les tests localement
- Valider 0 violations WCAG 2.1 AA
- Trigger CI/CD GitHub
- Vérifier pipeline success

---

## 📋 Étapes Détaillées

### Phase 2.1: Mise à Jour Tests avec Auth

#### Fichier 1: `tests/e2e/accessibility/a11y-navigation.spec.ts`

**Changements**:
```typescript
// AVANT:
test.beforeEach(async ({ page }) => {
  await page.goto('/admin');
});

// APRÈS:
import { setupAuth } from '../../helpers/auth-helper';

test.beforeEach(async ({ page }) => {
  await setupAuth(page); // Auto-login
  // page.goto('/admin') déjà fait par setupAuth
});
```

**Impact**: 11 tests navigation fonctionnels ✅

---

#### Fichier 2: `tests/e2e/accessibility/a11y-modals.spec.ts`

**Changements similaires**:
```typescript
// BookingManager tests
test.beforeEach(async ({ page }) => {
  await setupAuth(page);
  await page.click('text=Réservations'); // Maintenant trouvé!
  await page.waitForTimeout(500);
});

// Répéter pour tous les describe blocks
```

**Impact**: 19 tests modals fonctionnels ✅

---

### Phase 2.2: Database Helper

#### `tests/helpers/db-helper.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Create test user for E2E tests
 * Email: demo@bnbgest.com
 * Password: demo123
 */
export async function createTestUser() {
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@bnbgest.com' },
    update: {
      name: 'Test User',
      password: hashedPassword,
    },
    create: {
      email: 'demo@bnbgest.com',
      name: 'Test User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  
  return user;
}

/**
 * Create test property for E2E tests
 */
export async function createTestProperty(userId: string) {
  const property = await prisma.property.upsert({
    where: { id: 'test-property-1' },
    update: {
      name: 'Test Villa',
      address: '123 Test Street',
      pricePerNight: 100,
    },
    create: {
      id: 'test-property-1',
      name: 'Test Villa',
      address: '123 Test Street',
      city: 'Paris',
      country: 'France',
      pricePerNight: 100,
      maxGuests: 6,
      bedrooms: 3,
      bathrooms: 2,
      userId: userId,
    },
  });
  
  return property;
}

/**
 * Seed test data (user + property)
 */
export async function seedTestData() {
  const user = await createTestUser();
  const property = await createTestProperty(user.id);
  
  return { user, property };
}

/**
 * Cleanup test data between tests
 * WARNING: Only use in test environment!
 */
export async function cleanupTestData() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanupTestData can only be run in test environment');
  }
  
  // Delete test bookings
  await prisma.booking.deleteMany({
    where: {
      OR: [
        { guestEmail: { contains: 'test' } },
        { propertyId: 'test-property-1' },
      ],
    },
  });
  
  // Delete test guests
  await prisma.guest.deleteMany({
    where: { email: { contains: 'test' } },
  });
  
  // Delete test maintenance tasks
  await prisma.maintenanceTask.deleteMany({
    where: { propertyId: 'test-property-1' },
  });
  
  // Keep test user and property for reuse
  console.log('✅ Test data cleaned up');
}

/**
 * Disconnect Prisma client
 */
export async function disconnectDB() {
  await prisma.$disconnect();
}
```

**Usage dans tests**:
```typescript
import { seedTestData, cleanupTestData } from '../helpers/db-helper';

test.beforeAll(async () => {
  await seedTestData(); // Run once before all tests
});

test.afterEach(async () => {
  await cleanupTestData(); // Clean between tests
});
```

---

### Phase 2.3: CI/CD GitHub Actions

#### `.github/workflows/playwright.yml`

```yaml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: bnbgest_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    
    - name: Setup database
      run: |
        npx prisma generate
        npx prisma migrate deploy
        npx prisma db seed
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bnbgest_test
    
    - name: Run Playwright tests
      run: npx playwright test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/bnbgest_test
        NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
        NEXTAUTH_URL: http://localhost:3000
        TEST_USER_EMAIL: demo@bnbgest.com
        TEST_USER_PASSWORD: demo123
    
    - name: Upload Playwright Report
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
    
    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: test-results
        path: test-results/
        retention-days: 30
```

**Features**:
- ✅ PostgreSQL service container
- ✅ Prisma migration + seed
- ✅ Tests execution
- ✅ Artifacts upload (reports, screenshots, videos)
- ✅ Trigger sur push/PR

---

#### Configuration Secrets GitHub

**Secrets requis**:
1. `NEXTAUTH_SECRET` - Secret pour NextAuth
2. Optionnel: `STRIPE_SECRET_KEY`, `CLOUDINARY_API_KEY`, etc.

**Comment ajouter**:
1. GitHub → Repository → Settings → Secrets and variables → Actions
2. New repository secret
3. Ajouter chaque secret

---

#### Badge Status README

**Ajouter dans `README.md`**:
```markdown
# BnBGest

[![Playwright Tests](https://github.com/manu10210/bnbgest/actions/workflows/playwright.yml/badge.svg)](https://github.com/manu10210/bnbgest/actions/workflows/playwright.yml)
[![Accessibility](https://img.shields.io/badge/WCAG%202.1%20AA-100%25-brightgreen)](https://www.w3.org/WAI/WCAG21/quickref/)
[![TypeScript](https://img.shields.io/badge/TypeScript-95%25-blue)](https://www.typescriptlang.org/)
```

---

## 🧪 Validation Finale

### Checklist Phase 2

#### Tests Fixes
- [ ] `a11y-navigation.spec.ts` updated avec `setupAuth()`
- [ ] `a11y-modals.spec.ts` updated avec `setupAuth()`
- [ ] Tests exécutés localement: `npm run test:a11y`
- [ ] Résultat: 30/30 tests passent ✅

#### Database Helper
- [ ] `db-helper.ts` créé
- [ ] `createTestUser()` fonctionne
- [ ] `seedTestData()` fonctionne
- [ ] `cleanupTestData()` fonctionne

#### CI/CD
- [ ] `.github/workflows/playwright.yml` créé
- [ ] Secrets configurés sur GitHub
- [ ] Push vers main
- [ ] Workflow trigger automatique
- [ ] Tests passent sur CI ✅
- [ ] Artifacts uploadés
- [ ] Badge ajouté dans README

#### Documentation
- [ ] `AMELIORATIONS_SESSION17_PHASE2_COMPLETE.md`
- [ ] Update `AMELIORATIONS_SESSION17_COMPLETE.md`
- [ ] Commit + Push

---

## 📊 Métriques Cibles Phase 2

### Tests
- **Avant Phase 2**: 2/30 tests passent (93% échec)
- **Après Phase 2**: 30/30 tests passent ✅ (100% succès)

### CI/CD
- **Pipeline time**: < 5 minutes
- **Tests execution**: ~2 minutes
- **Artifacts**: Screenshots + Videos + HTML Report

### Accessibilité
- **Axe violations**: 0 (WCAG 2.1 AA 100%)
- **Skip link**: Validé ✅
- **Landmarks**: Validés ✅
- **Modals ARIA**: Validés ✅
- **Focus management**: Validé ✅
- **ESC key**: Validé ✅

---

## 🎯 Résultat Final Attendu

### Application Status
**ENTERPRISE-GRADE 100% + ACCESSIBLE 100% + TESTED 100% + CI/CD 100%** ✅🧪♿🚀

- Type coverage: **95%** ✅
- UX moderne: **100%** ✅
- React hooks: **100%** optimal ✅
- Accessibilité: **100%** (WCAG 2.1 AA) ✅
- **Tests E2E: 100% passing** ✅ ← NOUVEAU
- **CI/CD: Opérationnel** ✅ ← NOUVEAU
- **Axe-core: 0 violations** ✅ ← NOUVEAU
- Build: **18.2s** (-26% vs baseline) ✅
- Production: LIVE https://bnbgest.vercel.app 🌐

---

**Session 17 Phase 2 - Prêt pour exécution ! 🚀**
