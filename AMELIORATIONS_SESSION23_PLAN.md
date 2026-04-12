# Session 23 - CI/CD Performance Integration Plan

**Date:** 12 avril 2026  
**Durée estimée:** 2h00  
**Priorité:** Automatiser les tests de performance dans la CI/CD

---

## 🎯 Objectifs

### Vision
Intégrer les tests de performance, Lighthouse CI, et validations dans GitHub Actions pour garantir que chaque PR et commit maintient les standards de performance établis en Session 21-22.

### Métriques Cibles
- Lighthouse Performance: ≥90 sur chaque PR
- Core Web Vitals: GOOD (LCP <2.5s, CLS <0.1, FCP <1.8s)
- Performance Tests: 8/10 minimum
- Build size: Alertes si >500KB initial JS
- API Response time: <500ms average

---

## 📋 Plan d'Action (5 Phases)

### Phase 1: GitHub Actions - Performance Tests (30 min)

**Objectif:** Créer workflow pour exécuter tests Playwright performance

#### 1.1 Créer `.github/workflows/performance.yml`
```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  performance-tests:
    name: Run Performance Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Build application
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}
      
      - name: Start server
        run: npm run start &
        env:
          PORT: 3000
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      
      - name: Run performance tests
        run: npm run test:performance
        continue-on-error: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: performance-test-results
          path: |
            test-results/
            playwright-report/
          retention-days: 30
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            
            const comment = `## 📊 Performance Test Results
            
            **Status:** ${results.status}
            **Tests Passed:** ${results.passed}/${results.total}
            **Duration:** ${results.duration}
            
            <details>
            <summary>View Details</summary>
            
            ${results.tests.map(t => `- ${t.status === 'passed' ? '✅' : '❌'} ${t.name}: ${t.duration}ms`).join('\n')}
            
            </details>
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### 1.2 Ajouter script de génération JSON résultats
```typescript
// scripts/format-perf-results.ts
import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('test-results.json', 'utf8'));

const formatted = {
  status: results.status === 'passed' ? '✅ Passed' : '❌ Failed',
  passed: results.suites.reduce((acc, s) => acc + s.specs.filter(sp => sp.ok).length, 0),
  total: results.suites.reduce((acc, s) => acc + s.specs.length, 0),
  duration: `${Math.round(results.duration / 1000)}s`,
  tests: results.suites.flatMap(s => s.specs.map(sp => ({
    name: sp.title,
    status: sp.ok ? 'passed' : 'failed',
    duration: sp.tests[0]?.results[0]?.duration || 0
  })))
};

writeFileSync('test-results-formatted.json', JSON.stringify(formatted, null, 2));
```

#### Impact
- ✅ Tests automatiques sur chaque PR
- ✅ Détection précoce de régressions
- ✅ Commentaires automatiques avec résultats

---

### Phase 2: Lighthouse CI Integration (35 min)

**Objectif:** Automatiser audits Lighthouse avec seuils stricts

#### 2.1 Créer `.github/workflows/lighthouse.yml`
```yaml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lighthouse:
    name: Lighthouse Audit
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Build
        run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      
      - name: Start server
        run: npm run start &
      
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@0.13.x
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Upload Lighthouse results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-results
          path: .lighthouseci/
          retention-days: 30
```

#### 2.2 Configurer `.lighthouserc.js` pour CI
```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/admin'
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1
        }
      }
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        
        // Bundle sizes
        'total-byte-weight': ['warn', { maxNumericValue: 512000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        
        // Images
        'uses-optimized-images': 'error',
        'modern-image-formats': 'warn',
        'offscreen-images': 'error',
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

#### Impact
- ✅ Lighthouse audit automatique
- ✅ Fail PR si score <90
- ✅ Historique des audits
- ✅ Détection problèmes images/bundles

---

### Phase 3: Bundle Size Monitoring (25 min)

**Objectif:** Alertes si bundle size augmente

#### 3.1 Créer `.github/workflows/bundle-size.yml`
```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    name: Check Bundle Size
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Build and analyze
        run: ANALYZE=true npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      
      - name: Get bundle sizes
        id: bundle-size
        run: |
          echo "Reading .next build stats..."
          
          # Get main bundle size
          MAIN_SIZE=$(du -sh .next/static/chunks/main-*.js | cut -f1)
          
          # Get total bundle size
          TOTAL_SIZE=$(du -sh .next/static | cut -f1)
          
          echo "main_size=$MAIN_SIZE" >> $GITHUB_OUTPUT
          echo "total_size=$TOTAL_SIZE" >> $GITHUB_OUTPUT
      
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const mainSize = '${{ steps.bundle-size.outputs.main_size }}';
            const totalSize = '${{ steps.bundle-size.outputs.total_size }}';
            
            const comment = `## 📦 Bundle Size Report
            
            **Main Bundle:** ${mainSize}
            **Total Static:** ${totalSize}
            
            ⚠️ Target: Main <200KB, Total <2MB
            
            💡 Use \`npm run analyze:bundle\` to investigate.
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### 3.2 Installer `bundlesize` package
```json
// package.json
{
  "bundlesize": [
    {
      "path": ".next/static/chunks/main-*.js",
      "maxSize": "200 KB"
    },
    {
      "path": ".next/static/chunks/vendor-*.js",
      "maxSize": "500 KB"
    }
  ]
}
```

#### Impact
- ✅ Surveillance bundle size
- ✅ Alertes si dépassement
- ✅ Visibilité sur chaque PR

---

### Phase 4: API Response Time Monitoring (20 min)

**Objectif:** Monitorer performance API en CI

#### 4.1 Créer script de test API
```typescript
// tests/api-performance.spec.ts
import { test, expect } from '@playwright/test';

const API_ENDPOINTS = [
  { path: '/api/properties', maxTime: 500 },
  { path: '/api/stats', maxTime: 800 },
  { path: '/api/bookings', maxTime: 500 },
];

test.describe('API Performance', () => {
  for (const endpoint of API_ENDPOINTS) {
    test(`${endpoint.path} should respond within ${endpoint.maxTime}ms`, async ({ request }) => {
      const start = Date.now();
      
      const response = await request.get(`http://localhost:3000${endpoint.path}`, {
        headers: {
          'Cookie': 'auth-token=test' // Use test auth
        }
      });
      
      const duration = Date.now() - start;
      
      console.log(`📊 ${endpoint.path}: ${duration}ms`);
      
      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(endpoint.maxTime);
    });
  }
});
```

#### 4.2 Ajouter au workflow performance
```yaml
- name: Run API performance tests
  run: npx playwright test tests/api-performance.spec.ts
```

#### Impact
- ✅ Validation temps réponse API
- ✅ Détection régressions TTFB
- ✅ Garantit cache fonctionne

---

### Phase 5: Performance Dashboard & Reporting (10 min)

**Objectif:** Centraliser résultats performance

#### 5.1 Créer page status
```markdown
# docs/PERFORMANCE_STATUS.md

## Performance Metrics Status

Last updated: {{ DATE }}

### Lighthouse Scores
| Page | Performance | Accessibility | Best Practices | SEO |
|------|-------------|---------------|----------------|-----|
| Homepage | ![90](https://img.shields.io/badge/score-90-green) | 98 | 95 | 100 |
| Login | ![92](https://img.shields.io/badge/score-92-green) | 100 | 95 | 95 |
| Admin | ![88](https://img.shields.io/badge/score-88-yellow) | 96 | 92 | 90 |

### Core Web Vitals
- **LCP:** 2.1s ✅ (target: <2.5s)
- **CLS:** 0.02 ✅ (target: <0.1)
- **FCP:** 1.5s ✅ (target: <1.8s)

### Bundle Sizes
- **Main:** 185KB ✅ (target: <200KB)
- **Total JS:** 485KB ✅ (target: <500KB)

### API Response Times
- **/api/properties:** 95ms ✅ (target: <500ms)
- **/api/stats:** 120ms ✅ (target: <800ms)

### Test Results
- **Performance Tests:** 9/10 ✅
- **Visual Tests:** 8/8 ✅
- **E2E Tests:** 15/15 ✅
```

#### 5.2 Auto-update via GitHub Action
```yaml
- name: Update performance status
  run: node scripts/update-perf-status.js
```

#### Impact
- ✅ Vue d'ensemble performance
- ✅ Historique des métriques
- ✅ Documentation vivante

---

## 📊 Workflow Complet

```
PR Created
    ↓
┌───────────────────────────┐
│  GitHub Actions Triggered │
└───────────────────────────┘
    ↓
┌─────────────────┬─────────────────┬──────────────────┐
│  Performance    │  Lighthouse CI  │  Bundle Size     │
│  Tests          │                 │  Check           │
└────────┬────────┴────────┬────────┴────────┬─────────┘
         ↓                 ↓                 ↓
    ✅ 9/10            ✅ Score 92        ⚠️ +50KB
         ↓                 ↓                 ↓
┌────────────────────────────────────────────────┐
│         Comment PR with Results                │
│  - Performance: ✅ PASS (9/10)                 │
│  - Lighthouse: ✅ PASS (92/100)                │
│  - Bundle: ⚠️ WARNING (+50KB)                  │
└────────────────────────────────────────────────┘
         ↓
    Merge or Fix
```

---

## 🔧 Configuration Secrets GitHub

### Required Secrets
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
LHCI_GITHUB_APP_TOKEN=... (optional, for Lighthouse CI server)
```

### Setup
```bash
# GitHub repo → Settings → Secrets → Actions
# Add each secret manually
```

---

## 📁 Fichiers à Créer

### GitHub Actions (3)
1. `.github/workflows/performance.yml` - Tests performance
2. `.github/workflows/lighthouse.yml` - Audits Lighthouse
3. `.github/workflows/bundle-size.yml` - Check bundle

### Scripts (3)
4. `scripts/format-perf-results.ts` - Formatage résultats
5. `scripts/update-perf-status.js` - MAJ status dashboard
6. `tests/api-performance.spec.ts` - Tests perf API

### Documentation (2)
7. `docs/PERFORMANCE_STATUS.md` - Dashboard métriques
8. `.lighthouserc.js` - Config Lighthouse CI (déjà existe, à modifier)

### Configuration (1)
9. `package.json` - Ajouter scripts + bundlesize config

**Total:** 9 fichiers

---

## ⏱️ Timeline

| Phase | Tâche | Durée |
|-------|-------|-------|
| 1 | Performance Tests workflow | 30min |
| 2 | Lighthouse CI integration | 35min |
| 3 | Bundle size monitoring | 25min |
| 4 | API response time tests | 20min |
| 5 | Dashboard & reporting | 10min |
| **Total** | | **2h00** |

---

## 🎯 Critères de Succès

- [ ] Performance tests s'exécutent sur chaque PR
- [ ] Lighthouse audit automatique avec seuils
- [ ] Bundle size monitored avec alertes
- [ ] API response times validés
- [ ] Commentaires automatiques sur PR
- [ ] Dashboard performance à jour
- [ ] Fail PR si score <90 ou tests <8/10
- [ ] Artifacts sauvegardés (30 jours)

---

## 💡 Améliorations Futures (Session 24+)

### Performance Tracking Over Time
- Database des métriques historiques
- Graphiques tendances
- Alertes Slack/Discord sur régressions

### Advanced Monitoring
- Real User Monitoring (RUM)
- Synthetic monitoring (Pingdom, UptimeRobot)
- Error tracking (Sentry)

### Auto-Optimization
- Auto-fix suggestions
- Dependabot pour updates
- Auto-PR pour optimisations

---

**Session 23 Status:** 📋 Plan créé  
**Prêt à commencer ?** 🚀

Phase 1 : Créer workflow performance.yml
