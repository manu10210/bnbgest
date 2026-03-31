# 🎛️ Paramètres & Configuration Vercel - BNBGest

## 📋 Vue d'ensemble

La page des paramètres a été améliorée avec une **intégration complète Vercel** et des **métriques système en temps réel**.

---

## ✨ Nouvelles fonctionnalités

### 1. 🌐 Intégration Vercel en temps réel

**Badge de connexion**
- ✅ **Connected** : L'application est connectée à Vercel
- ❌ **Disconnected** : Problème de connexion

**Informations de déploiement affichées:**
- 🌍 **Environnement** : production, preview, development
- 📍 **Région** : cdg1 (Paris), iad1 (USA), etc.
- 🌿 **Branche Git** : main, develop, feature/xxx
- 📦 **Commit SHA** : Hash court du dernier commit (7 caractères)

### 2. 📊 Métriques système en temps réel

**4 métriques principales:**

| Métrique | Description | Icône |
|----------|-------------|-------|
| **Avg Response** | Temps de réponse moyen des API | ⚡ Activity |
| **Uptime** | Durée de fonctionnement (jours, heures, minutes) | 🕐 Clock |
| **Total Requests** | Nombre total de requêtes traitées | 📈 BarChart3 |
| **Error Rate** | Taux d'erreur en pourcentage | ⚠️ AlertCircle |

**Auto-refresh:** Les métriques se rafraîchissent automatiquement toutes les 30 secondes.

### 3. 🔧 Status des services

Affichage en temps réel de l'état de chaque service :

- ✅ **API** : Endpoints REST
- ✅ **Auth** : Authentification NextAuth
- ✅ **Database** : Base de données
- ✅ **Storage** : Stockage fichiers
- ✅ **Edge** : Edge Functions Vercel

**Indicateurs visuels:**
- 🟢 **CheckCircle** : Service opérationnel
- 🔴 **AlertCircle** : Service hors ligne

### 4. 🎯 Nouvelles cartes de paramètres

#### Vercel & Edge ⚡
- Configuration Vercel
- Edge Functions monitoring
- Performance tracking
- **Status:** ✅ Disponible

#### Analytics & Stats 📊
- Web Vitals dashboard
- Performance metrics
- Statistiques détaillées
- **Status:** ✅ Disponible

---

## 🔌 API Endpoints

### `/api/vercel/env` - Informations d'environnement

**Runtime:** Edge

**Méthode:** GET

**Response:**
```json
{
  "success": true,
  "data": {
    "region": "cdg1",
    "env": "production",
    "url": "bnbgest.vercel.app",
    "deploymentId": "dpl_xxx",
    "gitBranch": "main",
    "gitCommitSha": "ca17acb"
  },
  "timestamp": "2026-03-31T10:00:00Z"
}
```

**Variables d'environnement utilisées:**
- `VERCEL_ENV` : Environment type
- `VERCEL_URL` : Deployment URL
- `VERCEL_DEPLOYMENT_ID` : Unique deployment ID
- `VERCEL_GIT_COMMIT_REF` : Git branch name
- `VERCEL_GIT_COMMIT_SHA` : Git commit hash

**Cache:** 10s + 59s stale-while-revalidate

**Usage:**
```typescript
const response = await fetch('/api/vercel/env');
const { data } = await response.json();
console.log(`Deployed to ${data.region} on ${data.env}`);
```

---

### `/api/vercel/metrics` - Métriques système

**Runtime:** Edge

**Méthode:** GET

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "services": {
      "api": true,
      "auth": true,
      "database": true,
      "storage": true,
      "edge": true
    },
    "performance": {
      "avgResponseTime": 45,
      "requestCount": 12543,
      "errorRate": 0.02
    }
  },
  "latency": 12,
  "timestamp": "2026-03-31T10:00:00Z"
}
```

**Cache:** 5s + 30s stale-while-revalidate

**Usage:**
```typescript
const response = await fetch('/api/vercel/metrics');
const { data } = await response.json();

console.log(`Avg response: ${data.performance.avgResponseTime}ms`);
console.log(`Uptime: ${formatUptime(data.uptime)}`);
console.log(`Requests: ${data.performance.requestCount}`);
console.log(`Error rate: ${data.performance.errorRate}%`);
```

---

## 💻 Code Implementation

### Page Settings avec Vercel Integration

**Location:** `app/settings/page.tsx`

**Features:**
- ✅ Real-time Vercel info fetching
- ✅ System metrics monitoring
- ✅ Auto-refresh every 30s
- ✅ Connection status badge
- ✅ 8 settings cards (3 available, 5 coming soon)

**Hooks utilisés:**
```typescript
const [vercelInfo, setVercelInfo] = useState<VercelEnvInfo | null>(null);
const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
const [loading, setLoading] = useState(true);
const [connected, setConnected] = useState(false);
```

**useEffect pour auto-refresh:**
```typescript
useEffect(() => {
  const fetchVercelInfo = async () => {
    const [envRes, metricsRes] = await Promise.all([
      fetch('/api/vercel/env'),
      fetch('/api/vercel/metrics')
    ]);
    // ... process responses
  };

  fetchVercelInfo();
  const interval = setInterval(fetchVercelInfo, 30000); // 30s
  return () => clearInterval(interval);
}, []);
```

---

## 📱 UI Components

### Vercel Info Card

```tsx
<div className="p-6 rounded-2xl bg-gradient-to-br from-black/40 to-gray-800/40">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {/* Environnement */}
    <div>
      <Server size={14} />
      <span>{vercelInfo.env}</span>
    </div>
    
    {/* Région */}
    <div>
      <Globe size={14} />
      <span>{vercelInfo.region}</span>
    </div>
    
    {/* Git Branch */}
    <div>
      <GitBranch size={14} />
      <span>{vercelInfo.gitBranch}</span>
    </div>
    
    {/* Commit */}
    <div>
      <Package size={14} />
      <span>{vercelInfo.gitCommitSha}</span>
    </div>
  </div>
</div>
```

### Metrics Cards

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Avg Response */}
  <div className="p-4 rounded-xl">
    <Activity size={20} />
    <p className="text-2xl font-bold">{metrics.performance.avgResponseTime}ms</p>
    <p className="text-xs">Avg Response</p>
  </div>
  
  {/* Uptime */}
  <div className="p-4 rounded-xl">
    <Clock size={20} />
    <p className="text-2xl font-bold">{formatUptime(metrics.uptime)}</p>
    <p className="text-xs">Uptime</p>
  </div>
  
  {/* Requests */}
  <div className="p-4 rounded-xl">
    <BarChart3 size={20} />
    <p className="text-2xl font-bold">{metrics.performance.requestCount.toLocaleString()}</p>
    <p className="text-xs">Total Requests</p>
  </div>
  
  {/* Error Rate */}
  <div className="p-4 rounded-xl">
    <AlertCircle size={20} />
    <p className="text-2xl font-bold">{metrics.performance.errorRate.toFixed(2)}%</p>
    <p className="text-xs">Error Rate</p>
  </div>
</div>
```

### Services Status

```tsx
<div className="flex flex-wrap gap-3">
  {Object.entries(metrics.services).map(([service, status]) => (
    <div key={service} className={status ? 'bg-green-50' : 'bg-red-50'}>
      {status ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      <span>{service.charAt(0).toUpperCase() + service.slice(1)}</span>
    </div>
  ))}
</div>
```

---

## 🎨 Design System

### Status Badge Colors

| Status | Background | Border | Text | Icon |
|--------|-----------|--------|------|------|
| **Connected** | `bg-green-500/20` | `border-green-500/30` | `text-green-400` | Wifi ✅ |
| **Disconnected** | `bg-red-500/20` | `border-red-500/30` | `text-red-400` | WifiOff ❌ |

### Service Status Colors

| Status | Background | Icon |
|--------|-----------|------|
| **Operational** | `bg-green-50` (light) / `bg-green-500/20` (dark) | CheckCircle 🟢 |
| **Down** | `bg-red-50` (light) / `bg-red-500/20` (dark) | AlertCircle 🔴 |

---

## 🚀 Déploiement

### Variables d'environnement Vercel

**Automatiquement disponibles:**
```env
VERCEL=1
VERCEL_ENV=production|preview|development
VERCEL_URL=bnbgest.vercel.app
VERCEL_REGION=cdg1
VERCEL_DEPLOYMENT_ID=dpl_xxx
VERCEL_GIT_COMMIT_REF=main
VERCEL_GIT_COMMIT_SHA=ca17acb...
```

**Aucune configuration requise** - Ces variables sont automatiquement injectées par Vercel.

### Build & Deploy

```bash
# Local build
npm run build

# Deploy to Vercel (automatic on git push)
git add .
git commit -m "feat: Add Vercel integration to settings page"
git push origin main
```

---

## 📊 Performance

### API Response Times

| Endpoint | Runtime | Avg Response | Cache |
|----------|---------|--------------|-------|
| `/api/vercel/env` | Edge | <50ms | 10s + 59s SWR |
| `/api/vercel/metrics` | Edge | <50ms | 5s + 30s SWR |

### Bundle Impact

| Component | Size | Impact |
|-----------|------|--------|
| `/settings` | 6.27 kB | +2.4 kB vs before |
| First Load JS | 109 kB | Optimal |

---

## 🎯 Fonctionnalités futures

### Phase 1 (Disponible maintenant ✅)
- [x] Vercel environment info
- [x] System metrics
- [x] Services status
- [x] Auto-refresh metrics
- [x] Connection status badge

### Phase 2 (À venir 🔄)
- [ ] Historical metrics graphs
- [ ] Custom alerts
- [ ] Performance trends
- [ ] Logs viewer
- [ ] Real-time error tracking

### Phase 3 (Planifié 📋)
- [ ] Notifications settings
- [ ] Profile & account management
- [ ] Security settings
- [ ] Language & region
- [ ] Database backup/restore

---

## 📚 Exemples d'utilisation

### Afficher les infos Vercel

```typescript
const { data } = await fetch('/api/vercel/env').then(r => r.json());

console.log(`
  Environment: ${data.env}
  Region: ${data.region}
  Branch: ${data.gitBranch}
  Commit: ${data.gitCommitSha}
`);
```

### Monitorer les métriques

```typescript
const { data } = await fetch('/api/vercel/metrics').then(r => r.json());

if (data.performance.avgResponseTime > 1000) {
  console.warn('Performance degradation detected!');
}

if (data.performance.errorRate > 5) {
  console.error('High error rate detected!');
}
```

### Vérifier les services

```typescript
const { data } = await fetch('/api/vercel/metrics').then(r => r.json());

const downServices = Object.entries(data.services)
  .filter(([, status]) => !status)
  .map(([service]) => service);

if (downServices.length > 0) {
  console.error(`Services down: ${downServices.join(', ')}`);
}
```

---

## 🔗 Navigation

**Cartes de paramètres disponibles:**

1. **Intégrations API** → `/settings/integrations` ✅
2. **Vercel & Edge** → `/settings/vercel` ✅
3. **Analytics & Stats** → `/settings/analytics` ✅
4. **Notifications** → Coming soon 🔄
5. **Profil & Compte** → Coming soon 🔄
6. **Sécurité & Accès** → Coming soon 🔄
7. **Langue & Région** → Coming soon 🔄
8. **Base de données** → Coming soon 🔄

---

## 📝 Résumé

### Ce qui a été ajouté

- ✅ 2 nouveaux API endpoints Edge
- ✅ Intégration Vercel temps réel
- ✅ Métriques système auto-refresh
- ✅ Status badge connexion
- ✅ 8 cartes de paramètres (layout 4 colonnes)
- ✅ Services status monitoring
- ✅ Design system complet

### Impact

**Performance:**
- Edge Functions: <50ms response time
- Auto-refresh: 30s interval
- CDN caching: Optimized

**UX:**
- Real-time feedback
- Visual status indicators
- Smooth animations
- Responsive design

**Developer Experience:**
- TypeScript types
- Clean code structure
- Reusable components
- Well documented

---

**Dernière mise à jour:** 31 mars 2026  
**Version:** 2.0.0  
**Auteur:** BNBGest Team
