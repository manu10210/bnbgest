# 🚀 Plan d'Améliorations Systématiques BNBGest - Avril 2026

## 📊 Analyse de l'état actuel

### ✅ Points forts identifiés
- ✅ Architecture Next.js 15 + React 19 moderne
- ✅ TypeScript strict activé
- ✅ Prisma ORM configuré
- ✅ Authentification NextAuth.js
- ✅ Intégrations API (Airbnb, Booking.com, Stripe)
- ✅ Security headers (middleware.ts)
- ✅ Documentation exhaustive (40+ fichiers MD)
- ✅ Animations Framer Motion
- ✅ Dark mode support
- ✅ Déployé sur Vercel

### ⚠️ Points d'amélioration identifiés

#### 🔴 CRITIQUES (Sécurité & Stabilité)
1. **Erreurs TypeScript Prisma** - 43 erreurs dans routes Airbnb API
2. **Authentication middleware manquant** - Routes API non protégées
3. **Rate limiting absent** - Risque de DDoS/abus
4. **Validation inputs insuffisante** - Risque d'injection
5. **Error boundaries manquants** - Crashs UI possibles

#### 🟡 IMPORTANTES (Performance & UX)
6. **Caching layer absent** - Pas de SWR/React Query
7. **Loading states inconsistants** - UX dégradée
8. **Bundle size non optimisé** - 103kB shared
9. **Images non optimisées** - Pas de CDN/compression
10. **Mobile responsiveness** - Besoin d'amélioration

#### 🟢 SOUHAITABLES (Qualité & Maintenance)
11. **Tests unitaires/E2E absents** - 0% coverage
12. **Monitoring/Analytics limité** - Pas de Sentry
13. **Documentation API (OpenAPI)** - Pas de spec Swagger
14. **Logs structurés manquants** - Debug difficile
15. **CI/CD pipeline incomplet** - Pas de tests auto

---

## 🎯 Plan d'Action (Phases)

### 📍 PHASE 1 : Corrections Critiques (4h)

#### 1.1 Corriger erreurs TypeScript Prisma (1h)

**Problème** : Schema Prisma non synchronisé avec code TypeScript

**Solution** :
```bash
# Vérifier le schema
npx prisma validate

# Régénérer le client
npx prisma generate

# Push changes si nécessaire
npx prisma db push
```

**Fichiers impactés** :
- `app/api/integrations/airbnb/*/route.ts` (43 erreurs)

---

#### 1.2 Ajouter Authentication Middleware (1.5h)

**Créer middleware d'authentification** :

```typescript
// lib/auth-middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return session;
}

export async function requireRole(request: Request, role: string) {
  const session = await requireAuth(request);
  
  if (session instanceof NextResponse) return session;
  
  if (session.user.role !== role && session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  return session;
}

export async function requireOwnership(
  request: Request,
  resourceId: string,
  resourceType: 'property' | 'booking' | 'guest'
) {
  const session = await requireAuth(request);
  if (session instanceof NextResponse) return session;
  
  // Vérifier ownership en DB
  const resource = await prisma[resourceType].findUnique({
    where: { id: resourceId },
    select: { userId: true }
  });
  
  if (!resource || resource.userId !== session.user.id) {
    return NextResponse.json(
      { error: 'Forbidden - Not owner' },
      { status: 403 }
    );
  }
  
  return session;
}
```

**Appliquer sur toutes les routes API** :

```typescript
// app/api/properties/route.ts
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  const session = authResult;
  // Suite du code...
}

export async function POST(request: Request) {
  const authResult = await requireRole(request, 'OWNER');
  if (authResult instanceof NextResponse) return authResult;
  
  // Suite du code...
}
```

**Routes à protéger (priorité)** :
- ✅ `/api/properties` (GET, POST, PUT, DELETE)
- ✅ `/api/bookings` (POST, PUT, DELETE)
- ✅ `/api/guests` (GET, POST, PUT, DELETE)
- ✅ `/api/cleanings` (POST, PUT)
- ✅ `/api/maintenance` (POST, PUT)
- ✅ `/api/integrations/*` (GET, POST)

---

#### 1.3 Ajouter Rate Limiting (1h)

**Installer Upstash Redis** :
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Créer middleware rate limit** :

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Configuration par type d'endpoint
const limiters = {
  strict: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 req/10s
    analytics: true,
  }),
  
  normal: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(30, '10 s'), // 30 req/10s
  }),
  
  relaxed: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '10 s'), // 100 req/10s
  }),
};

export async function rateLimit(
  request: Request,
  type: 'strict' | 'normal' | 'relaxed' = 'normal'
) {
  const ip = request.headers.get('x-forwarded-for') ?? 
             request.headers.get('x-real-ip') ?? 
             'anonymous';
  
  const { success, limit, remaining, reset } = 
    await limiters[type].limit(ip);
  
  if (!success) {
    return new Response(
      JSON.stringify({
        error: 'Too Many Requests',
        limit,
        remaining,
        reset: new Date(reset).toISOString()
      }),
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
        }
      }
    );
  }
  
  return null; // OK, continuer
}
```

**Appliquer sur routes sensibles** :

```typescript
// app/api/properties/route.ts
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit strict pour création
  const rateLimitResult = await rateLimit(request, 'strict');
  if (rateLimitResult) return rateLimitResult;
  
  // Auth check
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  
  // Suite...
}
```

**Variables d'environnement à ajouter** :
```bash
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx
```

---

#### 1.4 Validation Inputs Renforcée (30min)

**Installer Zod pour validation** :
```bash
npm install zod
```

**Créer schémas de validation** :

```typescript
// lib/validations.ts
import { z } from 'zod';

export const PropertySchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(5000).optional(),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(100),
  country: z.string().length(2), // ISO code
  zipCode: z.string().regex(/^[0-9]{5}$/),
  bedrooms: z.number().int().min(1).max(50),
  bathrooms: z.number().int().min(1).max(50),
  capacity: z.number().int().min(1).max(100),
  price: z.number().positive().max(100000),
  userId: z.string().uuid(),
});

export const BookingSchema = z.object({
  propertyId: z.string().uuid(),
  guestId: z.string().uuid(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20),
  totalPrice: z.number().positive(),
}).refine(data => new Date(data.checkOut) > new Date(data.checkIn), {
  message: 'Check-out must be after check-in'
});

export const GuestSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{8,20}$/),
  nationality: z.string().length(2).optional(),
  passportNumber: z.string().min(6).max(20).optional(),
});
```

**Utiliser dans les routes** :

```typescript
// app/api/properties/route.ts
import { PropertySchema } from '@/lib/validations';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validation Zod
    const validatedData = PropertySchema.parse(body);
    
    // Créer avec données validées
    const property = await prisma.property.create({
      data: validatedData
    });
    
    return NextResponse.json(property, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### 📍 PHASE 2 : Performance & UX (6h)

#### 2.1 Ajouter Caching Layer avec SWR (2h)

**Installer SWR** :
```bash
npm install swr
```

**Créer hooks personnalisés** :

```typescript
// lib/hooks/useApi.ts
import useSWR from 'swr';

const fetcher = (url: string) => 
  fetch(url).then(r => r.json());

export function useProperties(filters?: { status?: string }) {
  const params = new URLSearchParams(filters);
  const { data, error, mutate } = useSWR(
    `/api/properties?${params}`,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5s
    }
  );
  
  return {
    properties: data?.properties,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}

export function useProperty(id: string) {
  const { data, error, mutate } = useSWR(
    id ? `/api/properties/${id}` : null,
    fetcher,
    { refreshInterval: 30000 } // 30s auto-refresh
  );
  
  return {
    property: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}

export function useBookings(propertyId?: string) {
  const params = propertyId ? `?propertyId=${propertyId}` : '';
  const { data, error, mutate } = useSWR(
    `/api/bookings${params}`,
    fetcher
  );
  
  return {
    bookings: data?.bookings,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  };
}
```

**Utiliser dans components** :

```typescript
// components/PropertiesManager.tsx
import { useProperties } from '@/lib/hooks/useApi';

export default function PropertiesManager() {
  const { properties, isLoading, isError, refresh } = useProperties();
  
  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage error={isError} />;
  
  return (
    <div>
      <button onClick={() => refresh()}>
        Refresh
      </button>
      {properties.map(prop => (
        <PropertyCard key={prop.id} property={prop} />
      ))}
    </div>
  );
}
```

---

#### 2.2 Loading States Uniformes (1h)

**Créer composants loading** :

```typescript
// components/LoadingStates.tsx
export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
    </div>
  );
}
```

**Standard loading pattern** :

```typescript
export default function Page() {
  const { data, isLoading, error } = useApi('/api/data');
  
  if (isLoading) return <SkeletonCard />;
  if (error) return <ErrorBoundary error={error} />;
  if (!data) return <EmptyState />;
  
  return <DataView data={data} />;
}
```

---

#### 2.3 Optimiser Images (2h)

**Créer composant Image optimisé** :

```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  return (
    <div className="relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`${className} transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        quality={85}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNjY2MiLz48L3N2Zz4="
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-400">Failed to load</span>
        </div>
      )}
    </div>
  );
}
```

**Configurer domains autorisés** :

```typescript
// next.config.ts
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'bnbgest.vercel.app',
      'storage.googleapis.com',
      'cloudinary.com',
      'unsplash.com',
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

---

#### 2.4 Mobile Responsiveness (1h)

**Créer breakpoints utilities** :

```typescript
// lib/responsive.ts
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet() {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 1025px)');
}
```

**Adapter components** :

```typescript
export default function DataTable() {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <MobileCardView data={data} />;
  }
  
  return <DesktopTableView data={data} />;
}
```

---

### 📍 PHASE 3 : Qualité & Maintenance (8h)

#### 3.1 Tests Unitaires avec Vitest (3h)

**Installer Vitest** :
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom happy-dom
```

**Configuration** :

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './vitest.setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**Exemples de tests** :

```typescript
// __tests__/components/PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PropertyCard from '@/components/PropertyCard';

describe('PropertyCard', () => {
  it('renders property name', () => {
    const property = {
      id: '1',
      name: 'Villa Sunset',
      city: 'Nice',
      price: 150,
    };
    
    render(<PropertyCard property={property} />);
    
    expect(screen.getByText('Villa Sunset')).toBeInTheDocument();
    expect(screen.getByText('Nice')).toBeInTheDocument();
  });
  
  it('displays price correctly', () => {
    const property = { id: '1', name: 'Test', price: 200 };
    render(<PropertyCard property={property} />);
    
    expect(screen.getByText(/200.*€/)).toBeInTheDocument();
  });
});
```

```typescript
// __tests__/lib/validations.test.ts
import { describe, it, expect } from 'vitest';
import { PropertySchema } from '@/lib/validations';

describe('PropertySchema', () => {
  it('validates correct property data', () => {
    const data = {
      name: 'Villa Test',
      address: '123 Rue Test',
      city: 'Paris',
      country: 'FR',
      zipCode: '75001',
      bedrooms: 3,
      bathrooms: 2,
      capacity: 6,
      price: 150,
      userId: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    expect(() => PropertySchema.parse(data)).not.toThrow();
  });
  
  it('rejects invalid zipCode', () => {
    const data = { /* ... */ zipCode: 'INVALID' };
    
    expect(() => PropertySchema.parse(data)).toThrow();
  });
});
```

**Scripts package.json** :
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

#### 3.2 Tests E2E avec Playwright (2h)

**Installer Playwright** :
```bash
npm install -D @playwright/test
npx playwright install
```

**Configuration** :

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Exemple de test** :

```typescript
// e2e/properties.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Properties Management', () => {
  test('should create a new property', async ({ page }) => {
    await page.goto('/admin');
    
    // Login
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to properties
    await page.click('text=Propriétés');
    await expect(page).toHaveURL('/admin/properties');
    
    // Create property
    await page.click('text=Nouvelle Propriété');
    await page.fill('[name="name"]', 'Villa Test E2E');
    await page.fill('[name="city"]', 'Nice');
    await page.fill('[name="price"]', '200');
    await page.click('button:has-text("Créer")');
    
    // Verify
    await expect(page.locator('text=Villa Test E2E')).toBeVisible();
  });
  
  test('should filter properties by city', async ({ page }) => {
    await page.goto('/admin/properties');
    
    await page.fill('[placeholder="Rechercher"]', 'Nice');
    await page.waitForTimeout(500);
    
    const cards = page.locator('[data-testid="property-card"]');
    await expect(cards).toHaveCount(3);
  });
});
```

---

#### 3.3 Monitoring avec Sentry (1h)

**Installer Sentry** :
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configuration** :

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || 'development',
});
```

**Utiliser dans error boundaries** :

```typescript
// components/ErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs';

export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }
  
  // render...
}
```

---

#### 3.4 Logs Structurés (1h)

**Créer logger** :

```typescript
// lib/logger.ts
import { headers } from 'next/headers';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  requestId?: string;
  path?: string;
  [key: string]: any;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const headersList = headers();
    const requestId = headersList.get('x-request-id') || 'unknown';
    
    const logEntry = {
      timestamp,
      level,
      message,
      requestId,
      environment: process.env.NODE_ENV,
      ...context,
    };
    
    // Console en dev
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      // Structured logs en production
      console.log(JSON.stringify(logEntry));
    }
    
    // Envoyer à service externe (Datadog, Logtail, etc.)
    if (level === 'error' && process.env.LOGTAIL_TOKEN) {
      // await fetch(LOGTAIL_ENDPOINT, { ... });
    }
  }
  
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error?.message,
      stack: error?.stack,
    });
  }
}

export const logger = new Logger();
```

**Utiliser dans routes** :

```typescript
// app/api/properties/route.ts
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  const session = await requireAuth(request);
  
  try {
    logger.info('Creating new property', {
      userId: session.user.id,
      path: '/api/properties'
    });
    
    const property = await prisma.property.create({ /* ... */ });
    
    logger.info('Property created successfully', {
      userId: session.user.id,
      propertyId: property.id
    });
    
    return NextResponse.json(property);
    
  } catch (error) {
    logger.error('Failed to create property', error as Error, {
      userId: session.user.id
    });
    
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

---

#### 3.5 Documentation API OpenAPI (1h)

**Installer Swagger** :
```bash
npm install swagger-jsdoc swagger-ui-react
npm install -D @types/swagger-jsdoc @types/swagger-ui-react
```

**Créer spec** :

```typescript
// lib/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BNBGest API',
      version: '1.0.0',
      description: 'API de gestion de locations saisonnières',
      contact: {
        name: 'BNBGest Support',
        email: 'support@bnbgest.com'
      },
    },
    servers: [
      {
        url: 'https://bnbgest.vercel.app',
        description: 'Production'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      },
      schemas: {
        Property: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Villa Sunset' },
            city: { type: 'string', example: 'Nice' },
            price: { type: 'number', example: 150 },
            bedrooms: { type: 'number', example: 3 },
            bathrooms: { type: 'number', example: 2 },
            capacity: { type: 'number', example: 6 },
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./app/api/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

**Créer page docs** :

```typescript
// app/api/docs/page.tsx
'use client';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { swaggerSpec } from '@/lib/swagger';

export default function ApiDocs() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">BNBGest API Documentation</h1>
      <SwaggerUI spec={swaggerSpec} />
    </div>
  );
}
```

**Annoter les routes** :

```typescript
/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Liste toutes les propriétés
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filtrer par statut
 *     responses:
 *       200:
 *         description: Liste des propriétés
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 properties:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       401:
 *         description: Non autorisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export async function GET(request: Request) {
  // ...
}
```

---

### 📍 PHASE 4 : CI/CD & DevOps (4h)

#### 4.1 GitHub Actions CI/CD (2h)

**Créer workflow** :

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npx prisma validate
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx prisma generate
      - run: npm run test
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
  
  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npx prisma generate
      - run: npm run build
      
      - name: Check bundle size
        run: |
          npm run analyze
          if [ -f .next/analyze/bundle-stats.json ]; then
            cat .next/analyze/bundle-stats.json
          fi
  
  deploy:
    runs-on: ubuntu-latest
    needs: [build, e2e]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

#### 4.2 Pre-commit Hooks (30min)

**Installer Husky** :
```bash
npm install -D husky lint-staged
npx husky init
```

**Configuration** :

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npx prisma validate
```

```bash
# .husky/pre-push
npm run test
npm run build
```

---

#### 4.3 Environment Variables Management (30min)

**Créer .env.example complet** :

```bash
# .env.example

# Database
POSTGRES_URL=postgres://user:pass@host:5432/db
POSTGRES_PRISMA_URL=postgres://user:pass@host:5432/db?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://user:pass@host:5432/db

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# APIs
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

RESEND_API_KEY=re_xxx

AIRBNB_CLIENT_ID=xxx
AIRBNB_CLIENT_SECRET=xxx
AIRBNB_REDIRECT_URI=http://localhost:3000/api/integrations/airbnb/callback
AIRBNB_ENVIRONMENT=sandbox

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx

# Vercel
NEXT_PUBLIC_VERCEL_ENV=development
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Créer script de validation** :

```typescript
// scripts/validate-env.ts
import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(10),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  RESEND_API_KEY: z.string().startsWith('re_'),
});

try {
  envSchema.parse(process.env);
  console.log('✅ Environment variables valid');
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  process.exit(1);
}
```

**Ajouter au CI** :
```yaml
# .github/workflows/ci.yml
- name: Validate env
  run: npm run validate:env
```

---

#### 4.4 Performance Budget (1h)

**Installer bundle analyzer** :
```bash
npm install -D @next/bundle-analyzer
```

**Configuration** :

```typescript
// next.config.ts
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // ...existing config
  
  // Performance budgets
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      '@headlessui/react'
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
```

**Scripts** :
```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build"
  }
}
```

**Budget limits** :

```javascript
// next.config.ts (suite)
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxAssetSize: 200000, // 200kb
        maxEntrypointSize: 400000, // 400kb
        hints: 'warning',
      };
    }
    return config;
  },
};
```

---

## 📊 Récapitulatif des Phases

| Phase | Durée | Priorité | Impact |
|-------|-------|----------|--------|
| **Phase 1: Corrections Critiques** | 4h | 🔴 HAUTE | Sécurité & Stabilité |
| 1.1 Corriger erreurs Prisma | 1h | 🔴 | ⭐⭐⭐⭐⭐ |
| 1.2 Auth middleware | 1.5h | 🔴 | ⭐⭐⭐⭐⭐ |
| 1.3 Rate limiting | 1h | 🔴 | ⭐⭐⭐⭐ |
| 1.4 Validation inputs | 30min | 🔴 | ⭐⭐⭐⭐ |
| **Phase 2: Performance & UX** | 6h | 🟡 MOYENNE | Performance & Expérience |
| 2.1 SWR caching | 2h | 🟡 | ⭐⭐⭐⭐ |
| 2.2 Loading states | 1h | 🟡 | ⭐⭐⭐ |
| 2.3 Images optimisées | 2h | 🟡 | ⭐⭐⭐⭐ |
| 2.4 Mobile responsive | 1h | 🟡 | ⭐⭐⭐ |
| **Phase 3: Qualité** | 8h | 🟢 BASSE | Maintenance & Debug |
| 3.1 Tests unitaires | 3h | 🟢 | ⭐⭐⭐ |
| 3.2 Tests E2E | 2h | 🟢 | ⭐⭐⭐ |
| 3.3 Sentry monitoring | 1h | 🟢 | ⭐⭐⭐⭐ |
| 3.4 Logs structurés | 1h | 🟢 | ⭐⭐⭐ |
| 3.5 OpenAPI docs | 1h | 🟢 | ⭐⭐ |
| **Phase 4: CI/CD** | 4h | 🟢 BASSE | DevOps |
| 4.1 GitHub Actions | 2h | 🟢 | ⭐⭐⭐ |
| 4.2 Pre-commit hooks | 30min | 🟢 | ⭐⭐ |
| 4.3 Env management | 30min | 🟢 | ⭐⭐ |
| 4.4 Performance budget | 1h | 🟢 | ⭐⭐⭐ |
| **TOTAL** | **22h** | | |

---

## 🎯 Ordre d'Exécution Recommandé

### Semaine 1 (8h) - CRITIQUE
1. ✅ **1.1 Corriger erreurs Prisma** (1h) - BLOQUANT
2. ✅ **1.2 Auth middleware** (1.5h) - SÉCURITÉ
3. ✅ **1.3 Rate limiting** (1h) - SÉCURITÉ
4. ✅ **1.4 Validation Zod** (30min) - SÉCURITÉ
5. ✅ **2.3 Images optimisées** (2h) - PERFORMANCE
6. ✅ **3.3 Sentry** (1h) - MONITORING
7. ✅ **3.4 Logs** (1h) - DEBUG

### Semaine 2 (8h) - IMPORTANT
8. ✅ **2.1 SWR caching** (2h) - PERFORMANCE
9. ✅ **2.2 Loading states** (1h) - UX
10. ✅ **2.4 Mobile responsive** (1h) - UX
11. ✅ **4.1 GitHub Actions** (2h) - CI/CD
12. ✅ **4.2 Pre-commit hooks** (30min) - QUALITÉ
13. ✅ **4.3 Env management** (30min) - DEVOPS
14. ✅ **4.4 Performance budget** (1h) - PERF

### Semaine 3 (6h) - QUALITÉ
15. ✅ **3.1 Tests unitaires** (3h) - TESTS
16. ✅ **3.2 Tests E2E** (2h) - TESTS
17. ✅ **3.5 OpenAPI docs** (1h) - DOCS

---

## 📈 Métriques de Succès

### Avant Améliorations
- ❌ Erreurs TypeScript: 43
- ❌ Auth: 0% routes protégées
- ❌ Rate limiting: 0%
- ❌ Tests coverage: 0%
- ⚠️ Loading states: Inconsistants
- ⚠️ Bundle size: 103kB (non optimisé)
- ⚠️ Images: Non optimisées
- ❌ Monitoring: Vercel Analytics seul
- ❌ CI/CD: Manuel

### Après Améliorations (Cible)
- ✅ Erreurs TypeScript: 0
- ✅ Auth: 100% routes API protégées
- ✅ Rate limiting: 100% routes sensibles
- ✅ Tests coverage: 80%+
- ✅ Loading states: Standards uniformes
- ✅ Bundle size: <80kB (optimisé)
- ✅ Images: Next.js Image optimisées
- ✅ Monitoring: Sentry + Logs structurés
- ✅ CI/CD: GitHub Actions automatique

---

## 🚀 Getting Started

### 1. Commencer Phase 1

```bash
# Corriger erreurs Prisma
npx prisma validate
npx prisma generate
npx prisma db push

# Installer dépendances Phase 1
npm install @upstash/ratelimit @upstash/redis zod

# Créer fichiers
mkdir -p lib/{auth-middleware.ts,rate-limit.ts,validations.ts}
```

### 2. Tester localement

```bash
# Dev avec logs
npm run dev

# Tests
npm run test
npm run test:e2e

# Build
npm run build

# Analyze bundle
npm run analyze
```

### 3. Déployer

```bash
# Vérifier env
npm run validate:env

# Deploy
git add .
git commit -m "feat: Phase 1 improvements"
git push

# Auto-deploy via GitHub Actions
```

---

## 📝 Checklist Complète

### Phase 1 - Critique
- [ ] Corriger 43 erreurs TypeScript Prisma
- [ ] Créer `lib/auth-middleware.ts`
- [ ] Protéger toutes routes `/api/*`
- [ ] Créer `lib/rate-limit.ts`
- [ ] Appliquer rate limiting
- [ ] Créer `lib/validations.ts` avec Zod
- [ ] Valider tous inputs API

### Phase 2 - Performance
- [ ] Installer SWR
- [ ] Créer hooks `useApi`
- [ ] Remplacer fetch par SWR
- [ ] Créer composants loading
- [ ] Standardiser loading states
- [ ] Créer `OptimizedImage` component
- [ ] Migrer vers Next.js Image
- [ ] Créer hooks responsive
- [ ] Adapter layouts mobile

### Phase 3 - Qualité
- [ ] Installer Vitest
- [ ] Écrire 20+ tests unitaires
- [ ] Installer Playwright
- [ ] Écrire 10+ tests E2E
- [ ] Installer Sentry
- [ ] Configurer error tracking
- [ ] Créer `lib/logger.ts`
- [ ] Ajouter logs structurés
- [ ] Créer spec OpenAPI
- [ ] Publier docs `/api/docs`

### Phase 4 - CI/CD
- [ ] Créer `.github/workflows/ci.yml`
- [ ] Configurer tests automatiques
- [ ] Installer Husky
- [ ] Configurer pre-commit
- [ ] Créer `.env.example` complet
- [ ] Script `validate-env.ts`
- [ ] Installer bundle analyzer
- [ ] Définir performance budgets

---

## 🎉 Résultat Final

Après ces 22h d'améliorations :

✅ **Sécurité niveau entreprise**
- Auth sur toutes routes API
- Rate limiting anti-DDoS
- Validation stricte Zod
- Logs d'audit complets

✅ **Performance optimale**
- Bundle <80kB
- Images optimisées
- SWR caching
- Mobile 60fps

✅ **Qualité production**
- 80%+ test coverage
- E2E tests complets
- Sentry error tracking
- OpenAPI documentation

✅ **DevOps moderne**
- CI/CD automatique
- Pre-commit hooks
- Performance budgets
- Env validation

**BNBGest devient une application production-ready de niveau entreprise !** 🚀

---

**Document créé le** : 3 avril 2026  
**Version** : 1.0  
**Auteur** : GitHub Copilot  
**Statut** : 📋 Plan d'action prêt pour exécution
