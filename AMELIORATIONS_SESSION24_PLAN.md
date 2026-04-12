# Session 24 - Real User Monitoring & Quick Performance Wins

**Date:** 12 avril 2026  
**Durée estimée:** 2h00  
**Priorité:** Monitoring utilisateurs réels + optimisations rapides

---

## 🎯 Objectifs

### Vision
Implémenter le monitoring des utilisateurs réels (RUM) pour mesurer la performance en production, et déployer des optimisations rapides pour améliorer immédiatement l'expérience utilisateur.

### Métriques Cibles
- Web Vitals tracking: 100% des sessions
- Preload critical resources: -500ms FCP
- Database indexes: -50% query time
- API caching extended: -80% sur endpoints non-cachés
- Service Worker: Offline support + cache assets

---

## 📋 Plan d'Action (6 Phases)

### Phase 1: Vercel Analytics & Web Vitals Integration (25 min)

**Objectif:** Capturer métriques réelles utilisateurs en production

#### 1.1 Configuration Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Déjà installé:** `@vercel/analytics` et `@vercel/speed-insights` dans package.json ✅

#### 1.2 Web Vitals Custom Tracking
```typescript
// lib/web-vitals-tracker.ts
import { onCLS, onFCP, onFID, onLCP, onTTFB, Metric } from 'web-vitals';

interface WebVitalsData extends Metric {
  page?: string;
  userId?: string;
}

export function reportWebVitals(onPerfEntry?: (metric: WebVitalsData) => void) {
  if (onPerfEntry && typeof window !== 'undefined') {
    const reportMetric = (metric: Metric) => {
      const data: WebVitalsData = {
        ...metric,
        page: window.location.pathname,
        userId: getUserId(), // from session/cookie
      };
      
      // Send to API
      onPerfEntry(data);
      
      // Also send to analytics endpoint
      fetch('/api/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(console.error);
    };

    onCLS(reportMetric);
    onFCP(reportMetric);
    onFID(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
  }
}
```

#### 1.3 Enhance API Vitals Endpoint
```typescript
// app/api/vitals/route.ts - Already exists, enhance it
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const metric = await request.json();
  
  // Store in database for analytics
  await prisma.webVital.create({
    data: {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      page: metric.page,
      userId: metric.userId,
      timestamp: new Date(),
    },
  });
  
  // Also log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 ${metric.name}: ${metric.value}ms (${metric.rating})`);
  }
  
  return new Response('OK', { status: 200 });
}
```

#### Impact
- ✅ Métriques réelles utilisateurs capturées
- ✅ Dashboard Vercel avec trends
- ✅ Database historique pour analytics
- ✅ Alertes si dégradation

---

### Phase 2: Preload Critical Resources (20 min)

**Objectif:** Charger ressources critiques en priorité

#### 2.1 Font Preloading
```typescript
// app/layout.tsx - Add to <head>
<link
  rel="preload"
  href="/fonts/inter-var.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```

#### 2.2 Critical CSS/JS Preload
```typescript
// next.config.ts - Add to headers
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Link',
          value: '</fonts/inter-var.woff2>; rel=preload; as=font; crossorigin=anonymous',
        },
      ],
    },
  ];
}
```

#### 2.3 DNS Prefetch & Preconnect
```typescript
// app/layout.tsx - Add to <head>
<link rel="preconnect" href="https://res.cloudinary.com" />
<link rel="dns-prefetch" href="https://res.cloudinary.com" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />
```

#### 2.4 API Route Prefetch
```typescript
// components/Layout.tsx - For logged-in users
useEffect(() => {
  if (session?.user) {
    // Prefetch likely next pages
    router.prefetch('/admin');
    router.prefetch('/properties');
    
    // Warm up API cache
    fetch('/api/properties').catch(() => {});
    fetch('/api/stats').catch(() => {});
  }
}, [session, router]);
```

#### Impact
- ✅ FCP: -300-500ms (fonts preloaded)
- ✅ LCP: -200-400ms (critical assets prioritized)
- ✅ TTFB: -100ms (DNS prefetch)
- ✅ Navigation: Instant (prefetch)

---

### Phase 3: Database Indexes (25 min)

**Objectif:** Optimiser requêtes DB fréquentes

#### 3.1 Identify Slow Queries
```typescript
// prisma/schema.prisma - Add indexes
model Property {
  id          String   @id @default(cuid())
  userId      String
  name        String
  status      String
  createdAt   DateTime @default(now())
  
  // Indexes for frequent queries
  @@index([userId])                    // Properties by user
  @@index([status])                    // Filter by status
  @@index([userId, status])            // User properties by status
  @@index([createdAt(sort: Desc)])     // Recent properties
  
  user User @relation(fields: [userId], references: [id])
}

model Booking {
  id          String   @id @default(cuid())
  propertyId  String
  userId      String
  startDate   DateTime
  endDate     DateTime
  status      String
  createdAt   DateTime @default(now())
  
  // Indexes for frequent queries
  @@index([propertyId])                         // Bookings by property
  @@index([userId])                             // Bookings by user
  @@index([status])                             // Filter by status
  @@index([startDate, endDate])                 // Date range queries
  @@index([propertyId, startDate, endDate])     // Availability checks
  
  property Property @relation(fields: [propertyId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
}

model Review {
  id          String   @id @default(cuid())
  propertyId  String
  userId      String
  rating      Int
  createdAt   DateTime @default(now())
  
  // Indexes
  @@index([propertyId])                // Reviews by property
  @@index([userId])                    // Reviews by user
  @@index([propertyId, rating])        // Average rating calculation
  @@index([createdAt(sort: Desc)])     // Recent reviews
  
  property Property @relation(fields: [propertyId], references: [id])
  user     User     @relation(fields: [userId], references: [id])
}
```

#### 3.2 Migration
```bash
npx prisma migrate dev --name add_performance_indexes
```

#### 3.3 Query Optimization Examples
```typescript
// Before: N+1 query problem
const properties = await prisma.property.findMany();
for (const property of properties) {
  const bookings = await prisma.booking.findMany({
    where: { propertyId: property.id }
  });
}

// After: Single query with include
const properties = await prisma.property.findMany({
  include: {
    bookings: {
      where: { status: 'CONFIRMED' }
    },
    _count: {
      select: { bookings: true, reviews: true }
    }
  }
});
```

#### Impact
- ✅ Query time: -50% average
- ✅ API /properties: -200ms
- ✅ API /stats: -300ms
- ✅ Dashboard load: -500ms

---

### Phase 4: Extended API Caching (25 min)

**Objectif:** Étendre ISR à tous les endpoints

#### 4.1 Reviews API
```typescript
// app/api/reviews/route.ts
export const revalidate = 300; // 5 minutes

export async function GET(request: Request) {
  const reviews = await prisma.review.findMany({
    include: { user: true, property: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  
  return NextResponse.json(
    { reviews },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  );
}
```

#### 4.2 Rentabilité API
```typescript
// app/api/rentabilite/route.ts
export const revalidate = 600; // 10 minutes

export async function GET(request: Request) {
  // Heavy calculations can be cached longer
  const rentabilite = await calculateRentabilite();
  
  return NextResponse.json(
    { rentabilite },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    }
  );
}
```

#### 4.3 Bookings API
```typescript
// app/api/bookings/route.ts
export const revalidate = 120; // 2 minutes

export async function GET(request: Request) {
  const bookings = await prisma.booking.findMany({
    include: { property: true, user: true },
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json(
    { bookings },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    }
  );
}
```

#### 4.4 Cache Strategy Documentation
```markdown
# API Caching Strategy

| Endpoint | Revalidate | Cache-Control | Justification |
|----------|-----------|---------------|---------------|
| /api/properties | 60s | s-maxage=60, swr=120 | Frequently updated |
| /api/stats | 120s | s-maxage=120, swr=240 | Analytics tolerate delay |
| /api/bookings | 120s | s-maxage=120, swr=240 | Real-time not critical |
| /api/reviews | 300s | s-maxage=300, swr=600 | Rarely change |
| /api/rentabilite | 600s | s-maxage=600, swr=1200 | Heavy computation |
```

#### Impact
- ✅ Reviews TTFB: -80% (cache hits)
- ✅ Rentabilité TTFB: -90% (cache hits)
- ✅ Bookings TTFB: -75% (cache hits)
- ✅ Server load: -60% overall

---

### Phase 5: Service Worker for Offline Support (30 min)

**Objectif:** Cache assets et support offline basique

#### 5.1 Create Service Worker
```javascript
// public/sw.js
const CACHE_NAME = 'bnbgest-v1';
const STATIC_CACHE = 'static-v1';

const STATIC_ASSETS = [
  '/',
  '/login',
  '/offline',
  '/fonts/inter-var.woff2',
  '/images/logo.png',
];

// Install - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // API requests: Network first
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request);
        })
    );
    return;
  }
  
  // Static assets: Cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      });
    })
  );
});
```

#### 5.2 Register Service Worker
```typescript
// app/layout.tsx or components/ServiceWorkerRegistration.tsx
'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, notify user
                console.log('🔄 New content available, please refresh');
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}
```

#### 5.3 Offline Page
```typescript
// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Vous êtes hors ligne</h1>
        <p className="text-gray-600 mb-6">
          Veuillez vérifier votre connexion internet.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
```

#### Impact
- ✅ Offline support: Basic navigation works
- ✅ Repeat visits: -50% load time (cached assets)
- ✅ API resilience: Cached fallback
- ✅ PWA ready: Can be installed

---

### Phase 6: Performance Monitoring Dashboard (15 min)

**Objectif:** Créer dashboard pour visualiser métriques

#### 6.1 Web Vitals Chart Component
```typescript
// components/admin/WebVitalsChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function WebVitalsChart() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch('/api/vitals/analytics')
      .then(res => res.json())
      .then(setData);
  }, []);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Core Web Vitals (7 derniers jours)</h3>
      <LineChart width={800} height={400} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="lcp" stroke="#8884d8" name="LCP (ms)" />
        <Line type="monotone" dataKey="fcp" stroke="#82ca9d" name="FCP (ms)" />
        <Line type="monotone" dataKey="cls" stroke="#ffc658" name="CLS (x100)" />
      </LineChart>
    </div>
  );
}
```

#### 6.2 Analytics API
```typescript
// app/api/vitals/analytics/route.ts
export async function GET() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const vitals = await prisma.webVital.findMany({
    where: {
      timestamp: { gte: sevenDaysAgo }
    },
    orderBy: { timestamp: 'asc' }
  });
  
  // Group by day and calculate averages
  const grouped = vitals.reduce((acc, vital) => {
    const date = vital.timestamp.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, lcp: [], fcp: [], cls: [] };
    }
    if (vital.name === 'LCP') acc[date].lcp.push(vital.value);
    if (vital.name === 'FCP') acc[date].fcp.push(vital.value);
    if (vital.name === 'CLS') acc[date].cls.push(vital.value * 100);
    return acc;
  }, {});
  
  const result = Object.values(grouped).map((day) => ({
    date: day.date,
    lcp: average(day.lcp),
    fcp: average(day.fcp),
    cls: average(day.cls),
  }));
  
  return NextResponse.json(result);
}

function average(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b) / arr.length : 0;
}
```

#### 6.3 Add to Admin Dashboard
```typescript
// app/admin/page.tsx
import { WebVitalsChart } from '@/components/admin/WebVitalsChart';

export default function AdminPage() {
  return (
    <div>
      {/* Existing dashboard content */}
      
      <div className="mt-8">
        <WebVitalsChart />
      </div>
    </div>
  );
}
```

#### Impact
- ✅ Visual trends over time
- ✅ Identify performance regressions
- ✅ Data-driven optimization decisions
- ✅ Stakeholder reporting

---

## 📁 Fichiers à Créer/Modifier

### Nouveaux Fichiers (8)
1. `lib/web-vitals-tracker.ts` - Custom Web Vitals tracking
2. `public/sw.js` - Service Worker
3. `components/ServiceWorkerRegistration.tsx` - SW registration
4. `app/offline/page.tsx` - Offline fallback page
5. `components/admin/WebVitalsChart.tsx` - Analytics chart
6. `app/api/vitals/analytics/route.ts` - Analytics endpoint
7. `prisma/migrations/xxx_add_performance_indexes.sql` - DB indexes
8. `docs/PERFORMANCE_MONITORING.md` - Documentation

### Fichiers à Modifier (6)
9. `app/layout.tsx` - Add Analytics, SpeedInsights, preload, ServiceWorker
10. `next.config.ts` - Add headers for preload
11. `prisma/schema.prisma` - Add indexes
12. `app/api/reviews/route.ts` - Add ISR caching
13. `app/api/rentabilite/route.ts` - Add ISR caching
14. `app/api/bookings/route.ts` - Add ISR caching

**Total:** 14 fichiers

---

## ⏱️ Timeline

| Phase | Tâche | Durée |
|-------|-------|-------|
| 1 | Vercel Analytics & Web Vitals | 25min |
| 2 | Preload critical resources | 20min |
| 3 | Database indexes | 25min |
| 4 | Extended API caching | 25min |
| 5 | Service Worker | 30min |
| 6 | Monitoring dashboard | 15min |
| **Total** | | **2h00** |

---

## 🎯 Critères de Succès

- [ ] Vercel Analytics capturing all sessions
- [ ] Web Vitals stored in database
- [ ] Fonts preloaded (<link rel="preload">)
- [ ] DNS prefetch for external domains
- [ ] Database indexes on frequent queries
- [ ] All major APIs have ISR caching
- [ ] Service Worker registered
- [ ] Offline page works
- [ ] Web Vitals chart in admin
- [ ] Performance improved by 20-30%

---

## 📈 Expected Results

### Before Session 24
| Metric | Current |
|--------|---------|
| FCP | ~1500ms |
| LCP | ~2100ms |
| TTFB (uncached) | ~2900ms |
| DB query time | ~200ms avg |
| Offline support | None |
| RUM | Not tracking |

### After Session 24
| Metric | Target | Improvement |
|--------|--------|-------------|
| FCP | ~1000ms | **-33%** ⚡ |
| LCP | ~1700ms | **-19%** ⚡ |
| TTFB (cached) | ~100ms | **-97%** 🚀 |
| DB query time | ~100ms | **-50%** ⚡ |
| Offline support | ✅ Basic | **NEW** 🎉 |
| RUM | ✅ 100% sessions | **NEW** 📊 |

---

## 💡 Quick Wins Prioritization

### High Impact, Low Effort
1. ✅ Preload fonts (5 min, -300ms FCP)
2. ✅ DNS prefetch (5 min, -100ms TTFB)
3. ✅ API caching reviews/bookings (10 min, -80% TTFB)

### Medium Impact, Medium Effort
4. ✅ Database indexes (20 min, -50% query time)
5. ✅ Web Vitals tracking (15 min, visibility++)
6. ✅ Vercel Analytics integration (10 min, RUM++)

### High Impact, High Effort
7. ✅ Service Worker (30 min, offline support)
8. ✅ Monitoring dashboard (15 min, insights++)

---

**Session 24 Status:** 📋 Plan créé  
**Prêt à commencer ?** 🚀

Phase 1 : Vercel Analytics & Web Vitals Integration
