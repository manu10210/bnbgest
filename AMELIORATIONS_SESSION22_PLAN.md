# Session 22 - Performance Optimizations Plan

**Date:** 12 avril 2026  
**Durée estimée:** 2h30  
**Priorité:** Réduire bundle JS de 15MB à <2MB

---

## 🎯 Objectifs

### Métriques Cibles
| Métrique | Actuel | Cible | Amélioration |
|----------|--------|-------|--------------|
| **Total JS** | 743 KB (test) / ~15 MB (build) | < 500 KB | -67% |
| **TTFB** | 2982ms | < 800ms | -73% |
| **Main Bundle** | 7.4 MB | < 200 KB | -97% |
| **LCP** | 2252ms | < 2000ms | -11% |

### Problèmes Identifiés

**🔴 CRITIQUE - Bundle Size**
- `main-app.js`: **7.4 MB** (!!!)
- `main.js`: **6.9 MB**
- **Total**: ~15 MB de JavaScript

**🟡 MOYEN - Dependencies**
- `lucide-react`: **35 MB** - Tree-shaking incomplet
- `jspdf`: **29 MB** - Chargé systématiquement
- `date-fns`: **22 MB** - Imports non optimisés
- `@fullcalendar`: Gros composant non lazy-loadé

**🟡 MOYEN - Performance**
- TTFB: 2982ms (3.7x trop lent)
- Pas de caching côté serveur
- Pas de static generation

---

## 📋 Plan d'Action (6 Phases)

### Phase 1: Dynamic Imports (30 min) 🎯 Priority 1

**Objectif:** Lazy-load les composants lourds

#### 1.1 Calendar Components
```typescript
// app/admin/calendrier/page.tsx
const FullCalendar = dynamic(
  () => import('@fullcalendar/react'),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);
```

#### 1.2 PDF Generator
```typescript
// components/ContractPDF.tsx
const JsPDFDocument = dynamic(
  () => import('jspdf').then(mod => ({ default: mod.jsPDF })),
  { ssr: false }
);
```

#### 1.3 Charts (si utilisés)
```typescript
const Chart = dynamic(() => import('react-chartjs-2'), { ssr: false });
```

**Impact attendu:** -3 MB bundle principal

---

### Phase 2: Tree-Shake Lucide Icons (20 min) 🎯 Priority 2

**Problème:** `lucide-react` (35 MB) charge tous les icônes

#### 2.1 Créer un fichier d'exports optimisé
```typescript
// lib/icons.ts
export { 
  Home,
  Calendar,
  Users,
  Settings,
  // ... uniquement les icônes utilisées
} from 'lucide-react';
```

#### 2.2 Remplacer tous les imports
```bash
# Avant
import { Home, Calendar } from 'lucide-react';

# Après
import { Home, Calendar } from '@/lib/icons';
```

#### 2.3 Configurer webpack pour tree-shaking
```javascript
// next.config.ts
webpack: (config) => {
  config.optimization.usedExports = true;
  return config;
}
```

**Impact attendu:** -10-15 MB

---

### Phase 3: Optimize date-fns (15 min) 🎯 Priority 3

**Problème:** Imports complets au lieu de fonctions individuelles

#### 3.1 Remplacer les imports
```typescript
// ❌ Avant
import * as dateFns from 'date-fns';
import { format, addDays, ... } from 'date-fns';

// ✅ Après
import format from 'date-fns/format';
import addDays from 'date-fns/addDays';
```

#### 3.2 Utiliser date-fns/esm
```typescript
import format from 'date-fns/esm/format';
```

**Impact attendu:** -5-8 MB

---

### Phase 4: Code Splitting par Route (25 min) 🎯 Priority 4

#### 4.1 Identifier les routes lourdes
- `/admin/calendrier` → FullCalendar
- `/admin/contracts` → PDF generation
- `/admin/analytics` → Charts (si présent)

#### 4.2 Suspense boundaries
```typescript
// app/admin/layout.tsx
import { Suspense } from 'react';

export default function AdminLayout({ children }) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      {children}
    </Suspense>
  );
}
```

#### 4.3 Route-based splitting
```typescript
// next.config.ts
experimental: {
  optimizePackageImports: ['lucide-react', 'date-fns']
}
```

**Impact attendu:** -2-3 MB par route

---

### Phase 5: Static Generation & Caching (30 min) 🎯 Priority 5

**Objectif:** Réduire TTFB de 2982ms → <800ms

#### 5.1 Homepage en Static
```typescript
// app/page.tsx
export const dynamic = 'force-static';
export const revalidate = 3600; // 1 hour ISR
```

#### 5.2 API Routes avec caching
```typescript
// app/api/properties/route.ts
export const revalidate = 60; // 1 minute

export async function GET() {
  const data = await getProperties();
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
    }
  });
}
```

#### 5.3 Preload Critical Resources
```typescript
// app/layout.tsx
<head>
  <link rel="preload" href="/fonts/inter.woff2" as="font" crossOrigin="anonymous" />
  <link rel="preconnect" href="https://api.bnbgest.com" />
</head>
```

**Impact attendu:** TTFB -70% (2982ms → ~800ms)

---

### Phase 6: Image Optimization (20 min) 🎯 Priority 6

#### 6.1 Lazy Loading
```typescript
// Trouver toutes les images
<Image src="/hero.jpg" loading="lazy" alt="..." />
```

#### 6.2 Responsive Images
```typescript
<Image
  src="/property.jpg"
  sizes="(max-width: 768px) 100vw, 50vw"
  width={800}
  height={600}
/>
```

#### 6.3 WebP/AVIF format
```typescript
// next.config.ts
images: {
  formats: ['image/avif', 'image/webp'],
  deviceSizes: [640, 750, 828, 1080, 1200],
}
```

**Impact attendu:** LCP -20%

---

## 🔧 Configuration Changes

### next.config.ts (Complet)
```typescript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Performance
  reactStrictMode: true,
  swcMinify: true,
  
  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', '@fullcalendar/react'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Tree shaking
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };

    // Split chunks
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common components
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'async',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
          // Heavy libraries
          fullcalendar: {
            test: /@fullcalendar/,
            name: 'fullcalendar',
            chunks: 'async',
            priority: 30,
          },
          jspdf: {
            test: /jspdf/,
            name: 'jspdf',
            chunks: 'async',
            priority: 30,
          },
        },
      };
    }

    return config;
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
```

---

## 📊 Tests de Validation

### Après chaque phase, tester:
```bash
# 1. Build size
npm run build

# 2. Performance tests
npm run test:performance

# 3. Bundle analysis
npm run analyze:bundle

# 4. Lighthouse
npm run lighthouse:local
```

### Critères de succès:
- [ ] Bundle principal < 200 KB
- [ ] Total JS < 500 KB
- [ ] TTFB < 800ms
- [ ] LCP < 2000ms
- [ ] Tous les tests de performance passent (10/10)

---

## 📁 Fichiers à Modifier

### Nouvelles créations (3)
1. `lib/icons.ts` - Exports optimisés Lucide
2. `components/skeletons/CalendarSkeleton.tsx`
3. `components/skeletons/AdminSkeleton.tsx`

### Modifications (15+)
1. `next.config.ts` - Optimizations webpack
2. `app/page.tsx` - Static generation
3. `app/layout.tsx` - Preload resources
4. `app/admin/calendrier/page.tsx` - Dynamic import
5. `components/ContractPDF.tsx` - Dynamic import
6. `lib/date-utils.ts` - Optimize date-fns imports
7. Tous les fichiers avec `lucide-react` imports (~20 fichiers)
8. Toutes les API routes - Add caching headers
9. Tous les composants avec images - Add lazy loading

---

## ⏱️ Timeline

| Phase | Durée | Cumul |
|-------|-------|-------|
| 1. Dynamic Imports | 30 min | 0h30 |
| 2. Tree-Shake Icons | 20 min | 0h50 |
| 3. Optimize date-fns | 15 min | 1h05 |
| 4. Code Splitting | 25 min | 1h30 |
| 5. Static Gen & Cache | 30 min | 2h00 |
| 6. Image Optimization | 20 min | 2h20 |
| Tests & Validation | 10 min | 2h30 |

---

## 🎯 Impact Prévisionnel

### Avant Optimisation
- Bundle: **~15 MB**
- TTFB: **2982ms**
- LCP: **2252ms**
- Performance Tests: **5/10 passed**

### Après Optimisation
- Bundle: **<2 MB** (-87%)
- TTFB: **<800ms** (-73%)
- LCP: **<2000ms** (-11%)
- Performance Tests: **10/10 passed** 🎉

---

## 🚀 Quick Wins (Si temps limité)

### Top 3 actions (45 min):
1. **Dynamic import FullCalendar** (15 min) → -3 MB
2. **Tree-shake lucide-react** (20 min) → -10 MB
3. **Static homepage** (10 min) → TTFB -50%

**Total impact: -13 MB bundle, TTFB -1500ms**

---

## 📝 Notes

### Dépendances identifiées:
- `@next`: 142 MB
- `next`: 133 MB
- `@lhci`: 99 MB (dev only ✅)
- `@prisma`: 81 MB (nécessaire)
- `lucide-react`: **35 MB** (À optimiser ⚠️)
- `jspdf`: **29 MB** (À lazy-load ⚠️)
- `date-fns`: **22 MB** (À optimiser ⚠️)
- `@fullcalendar`: Dans chunks (À lazy-load ⚠️)

### Stratégie:
1. ✅ Garder: Prisma, Next.js (nécessaires)
2. ⚠️ Optimiser: lucide-react, date-fns (tree-shake)
3. 🔄 Lazy-load: jspdf, @fullcalendar (dynamic imports)

---

**Prêt à commencer ?** 🚀

Session 22 - Phase 1: Dynamic Imports
