# Session 21 - Performance Testing & Optimization

**Date:** 12 avril 2026  
**Objectif:** Implémenter des tests de performance, monitoring et optimisations

---

## 🎯 Objectifs de la Session

### Phase 1 : Lighthouse CI Integration (30 min)
- [ ] Installer Lighthouse CI
- [ ] Configurer `.lighthouserc.js`
- [ ] Créer workflow GitHub Actions pour Lighthouse
- [ ] Définir budgets de performance
- [ ] Tester en local

### Phase 2 : Core Web Vitals Monitoring (30 min)
- [ ] Ajouter Web Vitals library
- [ ] Créer composant `WebVitalsReporter`
- [ ] Intégrer dans `layout.tsx`
- [ ] Configurer analytics endpoint
- [ ] Ajouter dashboard de monitoring

### Phase 3 : Bundle Analysis (20 min)
- [ ] Installer `@next/bundle-analyzer`
- [ ] Configurer dans `next.config.ts`
- [ ] Analyser les bundles actuels
- [ ] Identifier opportunités d'optimisation
- [ ] Documenter la taille des bundles

### Phase 4 : Performance Optimizations (45 min)
- [ ] Optimiser les images (next/image)
- [ ] Implémenter lazy loading pour composants lourds
- [ ] Optimiser les imports (tree shaking)
- [ ] Configurer font optimization
- [ ] Ajouter preload pour ressources critiques
- [ ] Optimiser CSS (purge unused)

### Phase 5 : Performance Tests (30 min)
- [ ] Créer tests Playwright pour performance
- [ ] Mesurer Time to Interactive (TTI)
- [ ] Mesurer First Contentful Paint (FCP)
- [ ] Mesurer Largest Contentful Paint (LCP)
- [ ] Créer rapport de performance

### Phase 6 : Documentation & CI/CD (15 min)
- [ ] Documenter les budgets de performance
- [ ] Créer guide d'optimisation
- [ ] Configurer alertes de régression
- [ ] Mettre à jour README.md

---

## 📊 Métriques Cibles

### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1
- **FCP (First Contentful Paint):** < 1.8s
- **TTI (Time to Interactive):** < 3.5s

### Lighthouse Scores
- **Performance:** ≥ 90
- **Accessibility:** ≥ 95
- **Best Practices:** ≥ 90
- **SEO:** ≥ 95

### Bundle Size Budgets
- **Initial JS:** < 200KB (gzipped)
- **Total JS:** < 500KB (gzipped)
- **CSS:** < 50KB (gzipped)
- **Images:** Optimized (WebP, lazy loading)

---

## 🛠️ Technologies & Outils

### Testing & Monitoring
- **Lighthouse CI** - Automated performance audits
- **web-vitals** - Real user monitoring (RUM)
- **@next/bundle-analyzer** - Bundle size analysis
- **Playwright Performance API** - Custom performance tests

### Optimizations
- **next/image** - Image optimization
- **next/font** - Font optimization
- **Dynamic imports** - Code splitting
- **React.lazy + Suspense** - Component lazy loading

---

## 📁 Fichiers à Créer

```
├── .lighthouserc.js                    # Lighthouse CI config
├── components/
│   └── WebVitalsReporter.tsx          # Web Vitals tracking
├── app/
│   └── api/
│       └── vitals/
│           └── route.ts               # Endpoint pour metrics
├── tests/
│   └── performance/
│       ├── core-vitals.spec.ts        # Tests Core Web Vitals
│       ├── lighthouse.spec.ts         # Tests Lighthouse
│       └── bundle-size.spec.ts        # Tests taille bundles
├── scripts/
│   ├── analyze-bundle.sh              # Script analyse bundles (Bash)
│   └── analyze-bundle.ps1             # Script analyse bundles (PowerShell)
├── docs/
│   ├── PERFORMANCE_GUIDE.md           # Guide optimisation
│   └── PERFORMANCE_BUDGETS.md         # Budgets documentés
└── .github/
    └── workflows/
        └── lighthouse.yml             # CI Lighthouse
```

---

## 🚀 Plan d'Exécution

### Étape 1 : Setup Lighthouse CI (10 min)
```bash
npm install -D @lhci/cli lighthouse
```

Configuration `.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/admin'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Étape 2 : Web Vitals Integration (15 min)
```bash
npm install web-vitals
```

Composant `WebVitalsReporter.tsx`:
```typescript
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Send to analytics
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
        headers: { 'Content-Type': 'application/json' },
      }).catch(console.error);
    }
    
    // Log in development
    console.log(metric);
  });
  
  return null;
}
```

### Étape 3 : Bundle Analyzer (5 min)
```bash
npm install -D @next/bundle-analyzer
```

Configuration `next.config.ts`:
```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

### Étape 4 : Performance Tests (20 min)
```typescript
// tests/performance/core-vitals.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Core Web Vitals', () => {
  test('Homepage should meet LCP threshold', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });
    
    expect(lcp).toBeLessThan(2500); // 2.5s threshold
  });
});
```

---

## 📈 Résultats Attendus

### Avant Optimisation (Estimation)
- Performance: ~75
- Bundle size: ~800KB
- LCP: ~3.5s

### Après Optimisation (Cible)
- Performance: ≥90
- Bundle size: <500KB
- LCP: <2.5s
- Réduction: ~40% de la taille des bundles

---

## ✅ Critères de Succès

1. ✅ Lighthouse CI configuré et fonctionnel
2. ✅ Web Vitals tracking actif
3. ✅ Bundle analysis automatisé
4. ✅ Scores Lighthouse ≥ 90/95/90/95
5. ✅ Core Web Vitals dans les seuils verts
6. ✅ CI/CD avec alertes de régression
7. ✅ Documentation complète

---

## 🔄 Prochaines Sessions

### Session 22 : Security & Compliance
- Security headers
- CSP (Content Security Policy)
- CSRF protection
- Rate limiting
- Audit de sécurité

### Session 23 : Advanced Monitoring
- Error tracking (Sentry)
- APM (Application Performance Monitoring)
- Log aggregation
- Custom dashboards

---

## 📝 Notes

- Les tests de performance seront exécutés en CI/CD
- Les budgets sont configurables par environnement
- Le monitoring Web Vitals est opt-in (production only)
- Les optimisations sont non-breaking changes
