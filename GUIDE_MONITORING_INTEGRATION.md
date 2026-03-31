# 🎯 Guide Rapide - Ajouter le Performance Monitor

## Objectif
Intégrer le composant **PerformanceMonitor** dans le dashboard admin pour surveiller l'application en temps réel.

---

## Option 1 : Onglet dédié dans AdminDashboard (Recommandé)

### 1. Ouvrir `components/AdminDashboard.tsx`

### 2. Importer le composant
```typescript
import PerformanceMonitor from './PerformanceMonitor';
```

### 3. Ajouter un nouvel onglet dans `tabs`
```typescript
const tabs = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: Home },
  { id: 'bookings', label: 'Réservations', icon: Calendar },
  { id: 'guests', label: 'Invités', icon: Users },
  { id: 'inventory', label: 'Inventaire', icon: Package },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'cleaning', label: 'Nettoyage', icon: SparkleIcon },
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'reports', label: 'Rapports', icon: TrendingUp },
  { id: 'reviews', label: 'Avis', icon: Star },
  { id: 'customization', label: 'Personnalisation', icon: Settings },
  { id: 'integrations', label: 'Intégrations', icon: Plug },
  { id: 'export', label: 'Export/Import', icon: Download },
  { id: 'monitoring', label: 'Monitoring', icon: Activity }, // ⬅️ NOUVEAU
];
```

### 4. Ajouter le cas dans le switch
```typescript
{activeTab === 'overview' && <DashboardOverview />}
{activeTab === 'bookings' && <BookingManager />}
{activeTab === 'guests' && <GuestManager />}
{activeTab === 'inventory' && <InventoryManager />}
{activeTab === 'maintenance' && <MaintenanceManagerAdvanced />}
{activeTab === 'cleaning' && <CleaningChecklist />}
{activeTab === 'contracts' && <ContractGenerator />}
{activeTab === 'reports' && <FinancialReports />}
{activeTab === 'reviews' && <ReviewsManager />}
{activeTab === 'customization' && <CustomizationPanel />}
{activeTab === 'integrations' && <IntegrationSettings />}
{activeTab === 'export' && <DataExportImportAdvanced />}
{activeTab === 'monitoring' && <PerformanceMonitor />}  {/* ⬅️ NOUVEAU */}
```

---

## Option 2 : Page dédiée `/admin/monitoring`

### 1. Créer le fichier `app/admin/monitoring/page.tsx`

```typescript
'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PerformanceMonitor from '@/components/PerformanceMonitor';

export default function MonitoringPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour au Dashboard</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Monitoring & Performance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Surveillez la santé et les performances de votre application en temps réel
          </p>
        </div>

        {/* Performance Monitor */}
        <PerformanceMonitor />
      </div>
    </div>
  );
}
```

### 2. Ajouter un lien dans AdminSidebar

Ouvrir `components/AdminSidebar.tsx` et ajouter :

```typescript
{
  id: 'monitoring',
  label: 'Monitoring',
  icon: Activity,
  href: '/admin/monitoring',  // ⬅️ Lien direct
},
```

---

## Option 3 : Widget dans DashboardOverview (Plus subtil)

### 1. Ouvrir `components/DashboardOverview.tsx`

### 2. Importer le composant
```typescript
import PerformanceMonitor from './PerformanceMonitor';
```

### 3. Ajouter dans le layout existant

Ajouter après les cartes de statistiques :

```typescript
{/* Statistiques principales */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  {/* ... cartes existantes ... */}
</div>

{/* Performance Monitor */}
<div className="mb-8">
  <PerformanceMonitor />
</div>

{/* Graphiques et autres widgets */}
{/* ... reste du code ... */}
```

---

## Recommandation 🎯

**Option 1** (Onglet dans AdminDashboard) est la meilleure pour :
- ✅ Accès rapide depuis le menu principal
- ✅ Cohérence avec l'interface existante
- ✅ Pas de navigation supplémentaire

**Option 2** (Page dédiée) est meilleure si :
- ✅ Vous voulez une vue plein écran
- ✅ Vous prévoyez d'ajouter plus de widgets de monitoring
- ✅ Vous voulez séparer le monitoring des fonctions admin

**Option 3** (Widget dans Overview) est pratique pour :
- ✅ Affichage permanent sur la page d'accueil
- ✅ Monitoring "at a glance"
- ⚠️ Peut surcharger la page d'accueil

---

## Test après implémentation

1. **Compiler**
   ```bash
   npm run build
   ```

2. **Lancer en dev**
   ```bash
   npm run dev
   ```

3. **Vérifier**
   - Accéder au dashboard admin
   - Cliquer sur l'onglet/page Monitoring
   - Vérifier que les métriques s'affichent
   - Attendre 30s pour voir le refresh automatique

4. **Tester l'API**
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## Prochaines améliorations possibles

### Graphiques historiques
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

// Stocker les données historiques
const [history, setHistory] = useState<Array<{time: string, responseTime: number}>>([]);

// Ajouter aux données toutes les 30s
useEffect(() => {
  if (health) {
    setHistory(prev => [...prev.slice(-20), {
      time: new Date().toLocaleTimeString(),
      responseTime: parseInt(health.responseTime)
    }]);
  }
}, [health]);

// Afficher le graphique
<LineChart data={history} width={600} height={200}>
  <XAxis dataKey="time" />
  <YAxis />
  <Line type="monotone" dataKey="responseTime" stroke="#3b82f6" />
</LineChart>
```

### Alertes
```typescript
// Alerte si response time > 1000ms
useEffect(() => {
  if (health && parseInt(health.responseTime) > 1000) {
    toast.error('⚠️ Temps de réponse élevé : ' + health.responseTime);
  }
}, [health]);
```

### Export des métriques
```typescript
const exportMetrics = () => {
  const data = JSON.stringify(health, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `health-${Date.now()}.json`;
  a.click();
};
```

---

## Commit des changements

```bash
# Après avoir ajouté le monitoring au dashboard
git add .
git commit -m "feat: Add PerformanceMonitor to admin dashboard"
git push
```

---

**✅ Le composant PerformanceMonitor est prêt à être intégré !**

Choisissez l'option qui correspond le mieux à vos besoins et suivez les étapes ci-dessus. 🚀
