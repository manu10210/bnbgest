# 🚀 Fonctionnalités Avancées Vercel - BNBGest

## 📋 Table des matières

1. [Edge Functions](#edge-functions)
2. [Web Vitals Analytics](#web-vitals-analytics)
3. [Image Optimization](#image-optimization)
4. [Webhooks](#webhooks)
5. [Configuration & Déploiement](#configuration--déploiement)

---

## 🌐 Edge Functions

Les Edge Functions sont déployées sur le réseau Edge de Vercel pour des réponses ultra-rapides (<50ms) partout dans le monde.

### 1. `/api/status` - Statut Système Edge

**Endpoint:** `GET https://bnbgest.vercel.app/api/status`

**Caractéristiques:**
- ⚡ **Edge Runtime** : Réponse <50ms globalement
- 🌍 **Multi-région** : Auto-détection de la région
- 📊 **Métriques temps réel** : Latence, services, statut
- 💾 **Cache CDN** : 10s cache, 59s stale-while-revalidate

**Exemple de réponse:**
```json
{
  "status": "operational",
  "timestamp": "2025-01-28T10:30:00Z",
  "region": "cdg1",
  "latency": 23,
  "services": {
    "api": true,
    "auth": true,
    "database": true,
    "storage": true
  }
}
```

**Utilisation:**
```typescript
const response = await fetch('/api/status');
const { status, region, latency } = await response.json();
console.log(`System is ${status} in ${region} (${latency}ms)`);
```

---

### 2. `/api/webhooks` - Gestionnaire de Webhooks Edge

**Endpoint:** 
- `POST https://bnbgest.vercel.app/api/webhooks` (Recevoir événements)
- `GET https://bnbgest.vercel.app/api/webhooks` (Vérifier statut)

**Caractéristiques:**
- ⚡ **Edge Runtime** : Traitement ultra-rapide
- 🔐 **Vérification de signature** : Header `x-webhook-signature`
- 🎯 **Multi-sources** : Airbnb, Booking.com, Stripe
- 📝 **Logging avancé** : Tous les événements loggés

**Sources supportées:**

#### Airbnb Webhooks
```typescript
// Événements supportés:
- reservation.created     // Nouvelle réservation
- reservation.cancelled   // Réservation annulée
- reservation.updated     // Modification réservation
```

#### Booking.com Webhooks
```typescript
// Événements supportés:
- reservation      // Nouvelle réservation
- modification     // Modification
```

#### Stripe Webhooks
```typescript
// Événements supportés:
- payment_intent.succeeded        // Paiement réussi
- payment_intent.payment_failed   // Paiement échoué
```

**Exemple d'envoi:**
```typescript
const response = await fetch('/api/webhooks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-source': 'airbnb',
    'x-webhook-signature': 'sha256=...'
  },
  body: JSON.stringify({
    source: 'airbnb',
    event: 'reservation.created',
    data: {
      reservationId: '12345',
      checkIn: '2025-02-01',
      checkOut: '2025-02-05',
      guestName: 'John Doe'
    },
    timestamp: new Date().toISOString()
  })
});
```

**Configuration des webhooks:**

1. **Airbnb:**
   - URL: `https://bnbgest.vercel.app/api/webhooks`
   - Méthode: POST
   - Header: `x-webhook-source: airbnb`

2. **Booking.com:**
   - URL: `https://bnbgest.vercel.app/api/webhooks`
   - Méthode: POST
   - Header: `x-webhook-source: booking`

3. **Stripe:**
   - URL: `https://bnbgest.vercel.app/api/webhooks`
   - Méthode: POST
   - Header: `x-webhook-source: stripe`
   - Signature: Stripe Webhook Secret

---

## 📊 Web Vitals Analytics

### Vue d'ensemble

Le système de Web Vitals track automatiquement les métriques de performance critiques pour l'expérience utilisateur.

**Métriques trackées:**

| Métrique | Description | Seuil optimal |
|----------|-------------|---------------|
| **CLS** | Cumulative Layout Shift | < 0.1 |
| **FCP** | First Contentful Paint | < 1.8s |
| **LCP** | Largest Contentful Paint | < 2.5s |
| **TTFB** | Time to First Byte | < 0.8s |
| **INP** | Interaction to Next Paint | < 200ms |

### Composant `<AnalyticsWrapper>`

**Intégré automatiquement dans le layout:**

```tsx
import AnalyticsWrapper from '@/components/AnalyticsWrapper';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnalyticsWrapper>
          {children}
        </AnalyticsWrapper>
      </body>
    </html>
  );
}
```

### API `/api/analytics`

**Endpoint:** `POST https://bnbgest.vercel.app/api/analytics`

**Payload:**
```typescript
interface AnalyticsPayload {
  metric: 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  pathname: string;
  timestamp: string;
}
```

**Exemple d'envoi manuel:**
```typescript
fetch('/api/analytics', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    metric: 'LCP',
    value: 1234,
    pathname: '/admin',
    timestamp: new Date().toISOString()
  })
});
```

### Visualisation des métriques

Les métriques sont loggées dans la console du navigateur :

```
[Web Vital] CLS: 0.05
[Web Vital] FCP: 1200
[Web Vital] LCP: 2100
[Web Vital] TTFB: 650
[Web Vital] INP: 150
```

**En production**, ces métriques peuvent être envoyées vers :
- ✅ Vercel Analytics (automatique)
- ✅ Google Analytics
- ✅ Custom backend
- ✅ Logging service (Datadog, Sentry, etc.)

---

## 🖼️ Image Optimization API

### API `/api/optimize-image`

**Endpoint:** 
- `POST https://bnbgest.vercel.app/api/optimize-image` (Optimiser)
- `GET https://bnbgest.vercel.app/api/optimize-image?url=...` (Placeholder)

### POST - Optimisation d'image

**Request:**
```typescript
interface ImageOptimizationRequest {
  url: string;
  width?: number;       // Default: 1200
  height?: number;      // Optional
  quality?: number;     // Default: 80 (1-100)
  format?: 'webp' | 'avif' | 'jpeg' | 'png';  // Default: webp
}
```

**Exemple:**
```typescript
const response = await fetch('/api/optimize-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: '/uploads/photo.jpg',
    width: 1920,
    quality: 85,
    format: 'webp'
  })
});

const { optimizedUrl, format } = await response.json();
```

**Response:**
```typescript
interface ImageOptimizationResponse {
  optimizedUrl: string;
  originalSize?: number;
  optimizedSize?: number;
  savings?: number;
  format: string;
}
```

### GET - Blur Placeholder

**Exemple:**
```typescript
const response = await fetch('/api/optimize-image?url=/uploads/photo.jpg');
const { blurDataUrl, formats, sizes } = await response.json();

// Response:
{
  "url": "/uploads/photo.jpg",
  "blurDataUrl": "data:image/svg+xml;base64,...",
  "formats": ["webp", "avif", "jpeg"],
  "sizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
}
```

### Utilisation avec Next.js Image

```tsx
import Image from 'next/image';

<Image
  src="/uploads/photo.jpg"
  alt="Property"
  width={1200}
  height={800}
  quality={85}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, 
         (max-width: 1200px) 50vw, 
         33vw"
/>
```

### Formats supportés

| Format | Compression | Qualité | Support navigateur |
|--------|-------------|---------|-------------------|
| **AVIF** | Meilleure (-50%) | Excellente | Chrome 85+, Firefox 93+ |
| **WebP** | Très bonne (-30%) | Excellente | Chrome 23+, Firefox 65+ |
| **JPEG** | Bonne | Bonne | Tous |
| **PNG** | Moyenne | Excellente (transparence) | Tous |

---

## ⚙️ Configuration & Déploiement

### Variables d'environnement

Créer un fichier `.env.local` :

```env
# Webhooks Secrets
WEBHOOK_SECRET_AIRBNB=your-airbnb-webhook-secret
WEBHOOK_SECRET_BOOKING=your-booking-webhook-secret
WEBHOOK_SECRET_STRIPE=your-stripe-webhook-secret

# Analytics (optionnel)
VERCEL_ANALYTICS_ID=your-analytics-id

# Database
DATABASE_URL=your-database-url

# Auth
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://bnbgest.vercel.app
```

### Configuration Vercel

**vercel.json:**
```json
{
  "regions": ["cdg1"],
  "crons": [
    {
      "path": "/api/integrations/sync",
      "schedule": "0 * * * *"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### Déploiement

1. **Push vers GitHub:**
```bash
git add .
git commit -m "feat: Add Edge Functions and Analytics"
git push origin main
```

2. **Déploiement automatique Vercel:**
   - Vercel détecte automatiquement le push
   - Build et déploie en ~2 minutes
   - Edge Functions déployées globalement

3. **Vérification:**
```bash
# Test status endpoint
curl https://bnbgest.vercel.app/api/status

# Test webhooks endpoint
curl https://bnbgest.vercel.app/api/webhooks

# Test analytics endpoint
curl https://bnbgest.vercel.app/api/analytics
```

---

## 🧪 Tests et monitoring

### Scripts npm

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "analyze": "node scripts/analyze-performance.js",
    "check:health": "curl https://bnbgest.vercel.app/api/health",
    "check:status": "curl https://bnbgest.vercel.app/api/status",
    "check:seo": "curl -I https://bnbgest.vercel.app"
  }
}
```

### Monitoring en production

**Endpoints de monitoring:**

1. **Health Check (Node.js):**
   ```
   GET /api/health
   ```

2. **Status Check (Edge):**
   ```
   GET /api/status
   ```

3. **Webhooks Status:**
   ```
   GET /api/webhooks
   ```

**Alerting recommandé:**
- ⚠️ Alert si status !== "operational"
- ⚠️ Alert si latency > 1000ms
- ⚠️ Alert si un service = false

---

## 📈 Performance attendue

### Avant optimisations
- ❌ Response time: ~150ms
- ❌ Bundle size: 115kB
- ❌ Images: Non optimisées
- ❌ Web Vitals: Non trackées

### Après optimisations
- ✅ Edge response: **<50ms** (-67%)
- ✅ Bundle size: **~95kB** (-17%)
- ✅ Images: **Optimisées AVIF/WebP** (-30%)
- ✅ Web Vitals: **Trackées en temps réel**
- ✅ Webhooks: **Temps réel** (<100ms)

---

## 🎯 Prochaines étapes

### Phase 1: Production (Terminé ✅)
- [x] Edge Functions (status, webhooks)
- [x] Web Vitals Analytics
- [x] Image Optimization API
- [x] Documentation complète

### Phase 2: Améliorations futures
- [ ] Rate limiting avec Vercel KV
- [ ] ISR pour pages dynamiques
- [ ] Dashboard analytics complet
- [ ] Notifications webhook (email/SMS)
- [ ] Backup automatique données

### Phase 3: Intégrations avancées
- [ ] Stripe webhooks complets
- [ ] Airbnb API v2
- [ ] Booking.com API complète
- [ ] Google Calendar sync
- [ ] iCal multi-calendriers

---

## 📝 Résumé des endpoints

| Endpoint | Runtime | Fonction | Cache |
|----------|---------|----------|-------|
| `/api/health` | Node.js | Health check complet | No cache |
| `/api/status` | **Edge** | Statut ultra-rapide | 10s |
| `/api/webhooks` | **Edge** | Réception événements | No cache |
| `/api/analytics` | **Edge** | Tracking Web Vitals | No cache |
| `/api/optimize-image` | **Edge** | Optimisation images | 1h |

---

## 🔗 Ressources

- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Image Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/images)
- [Webhooks Best Practices](https://webhook.site/webhooks)

---

**Dernière mise à jour:** 28 janvier 2025
**Version:** 2.0.0
**Auteur:** BNBGest Team
