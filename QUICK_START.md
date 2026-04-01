# 🚀 Guide de Démarrage Rapide - BNBGest

Date: 1 avril 2026

## 📋 Table des Matières

1. [Setup Vercel Postgres](#setup-vercel-postgres)
2. [Utilisation des APIs](#utilisation-des-apis)
3. [Exemples de Code](#exemples-de-code)
4. [Commandes Utiles](#commandes-utiles)

---

## 🗄️ Setup Vercel Postgres

### Étape 1: Créer la Base de Données

1. Va sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique sur **Storage** dans la navigation
3. Clique sur **Create Database**
4. Sélectionne **Postgres**
5. Nomme-la: `bnbgest-db`
6. Région: Choisis la plus proche de tes utilisateurs
7. Clique sur **Create**

### Étape 2: Connecter à ton Projet

1. Dans la page de la base de données, clique sur **Connect Project**
2. Sélectionne ton projet `bnbgest`
3. Les variables d'environnement sont auto-ajoutées ✅

### Étape 3: Ajouter les Variables Manquantes

Dans **Settings** → **Environment Variables**, ajoute:

```
NEXTAUTH_URL=https://bnbgest.vercel.app
NEXTAUTH_SECRET=[ton secret généré]
```

Pour générer le secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Étape 4: Premier Déploiement

1. Va dans **Deployments**
2. Clique sur **Redeploy** sur le dernier déploiement
3. Attends que le build se termine (migrations Prisma auto-exécutées)

### Étape 5: Seed la Base de Données

```bash
# Depuis ton terminal local
vercel env pull .env.local
npm run db:seed
```

### ✅ Vérification

Teste la connexion:
```bash
curl https://bnbgest.vercel.app/api/db-test
```

Devrait retourner:
```json
{
  "success": true,
  "database": "connected",
  "counts": {
    "users": 1,
    "properties": 2,
    "bookings": 3
  }
}
```

---

## 📡 Utilisation des APIs

### Endpoints Disponibles

#### 🏠 Properties
```
GET    /api/properties              # Liste toutes
POST   /api/properties              # Crée une nouvelle
GET    /api/properties/[id]         # Détails avec relations
PATCH  /api/properties/[id]         # Met à jour
DELETE /api/properties/[id]         # Désactive (soft delete)
```

#### 📅 Bookings
```
GET    /api/bookings                # Liste avec filtres
POST   /api/bookings                # Crée (avec check dispo)
```

#### ⭐ Reviews
```
GET    /api/reviews                 # Liste des avis
POST   /api/reviews                 # Crée un avis
GET    /api/reviews/[id]            # Détails
PATCH  /api/reviews/[id]            # Répondre à l'avis
DELETE /api/reviews/[id]            # Supprime
```

#### 🔧 Maintenance
```
GET    /api/maintenance             # Liste des tâches
POST   /api/maintenance             # Crée une tâche
GET    /api/maintenance/[id]        # Détails
PATCH  /api/maintenance/[id]        # Met à jour
DELETE /api/maintenance/[id]        # Supprime
```

#### 🧹 Cleanings
```
GET    /api/cleanings               # Liste des nettoyages
POST   /api/cleanings               # Crée (avec check conflit)
GET    /api/cleanings/[id]          # Détails
PATCH  /api/cleanings/[id]          # Met à jour
DELETE /api/cleanings/[id]          # Supprime
```

#### 📊 Stats
```
GET    /api/stats                   # Dashboard complet
```

---

## 💻 Exemples de Code

### 1. Afficher la Liste des Propriétés

```tsx
'use client';

import { useApi } from '@/hooks/useApi';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function PropertiesPage() {
  const { data, loading, error, refetch } = useApi('/api/properties?status=ACTIVE');

  if (loading) return <LoadingSpinner size="lg" text="Chargement des propriétés..." />;
  if (error) return <div className="text-red-500">Erreur: {error.message}</div>;

  return (
    <ErrorBoundary>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mes Propriétés</h1>
          <button onClick={refetch} className="btn-primary">
            Rafraîchir
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.properties.map((property) => (
            <div key={property.id} className="card">
              <h3 className="font-semibold">{property.name}</h3>
              <p className="text-gray-600">{property.city}</p>
              <p className="text-lg font-bold">{property.pricePerNight}€/nuit</p>
              <div className="mt-2 text-sm text-gray-500">
                {property._count.bookings} réservations
              </div>
            </div>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

---

### 2. Créer une Nouvelle Réservation

```tsx
'use client';

import { useState } from 'react';
import { useMutation } from '@/hooks/useApi';

export default function BookingForm({ propertyId }: { propertyId: number }) {
  const { mutate, loading, error } = useMutation('/api/bookings', 'POST');
  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    totalPrice: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const booking = await mutate({
        propertyId,
        ...formData,
        status: 'CONFIRMED',
        source: 'DIRECT'
      });
      
      alert('Réservation créée avec succès !');
      // Rediriger ou mettre à jour l'UI
    } catch (err: any) {
      if (err.message.includes('not available')) {
        alert('Dates non disponibles !');
      } else {
        alert('Erreur: ' + err.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Nom du client"
        value={formData.guestName}
        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
        required
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formData.guestEmail}
        onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
        required
      />

      <input
        type="date"
        value={formData.checkIn}
        onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
        required
      />

      <input
        type="date"
        value={formData.checkOut}
        onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
        required
      />

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Création...' : 'Créer la réservation'}
      </button>

      {error && <div className="text-red-500">{error.message}</div>}
    </form>
  );
}
```

---

### 3. Dashboard avec Statistiques

```tsx
'use client';

import { useApi } from '@/hooks/useApi';
import { LoadingGrid } from '@/components/LoadingSpinner';

export default function Dashboard() {
  const { data, loading } = useApi('/api/stats');

  if (loading) return <LoadingGrid count={4} />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-blue-50">
          <h3 className="text-sm text-gray-600">Revenus Total</h3>
          <p className="text-3xl font-bold text-blue-600">
            {data?.bookings.totalRevenue.toFixed(2)}€
          </p>
        </div>

        <div className="card bg-green-50">
          <h3 className="text-sm text-gray-600">Taux d'Occupation</h3>
          <p className="text-3xl font-bold text-green-600">
            {data?.occupancy.rate.toFixed(1)}%
          </p>
        </div>

        <div className="card bg-yellow-50">
          <h3 className="text-sm text-gray-600">Note Moyenne</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {data?.reviews.averageRating.toFixed(1)}/5
          </p>
        </div>

        <div className="card bg-purple-50">
          <h3 className="text-sm text-gray-600">Réservations</h3>
          <p className="text-3xl font-bold text-purple-600">
            {data?.bookings.total}
          </p>
        </div>
      </div>

      {/* Graphique des revenus */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Revenus Hebdomadaires</h2>
        {/* Utiliser Recharts ici avec data.trends.weeklyRevenue */}
      </div>

      {/* Stats détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h3 className="font-bold mb-2">Réservations par Source</h3>
          <ul className="space-y-2">
            <li>Direct: {data?.bookings.bySource.direct}</li>
            <li>Airbnb: {data?.bookings.bySource.airbnb}</li>
            <li>Booking.com: {data?.bookings.bySource.bookingCom}</li>
          </ul>
        </div>

        <div className="card">
          <h3 className="font-bold mb-2">Maintenance</h3>
          <ul className="space-y-2">
            <li className="text-red-600">
              Urgent: {data?.maintenance.byPriority.urgent}
            </li>
            <li className="text-orange-600">
              High: {data?.maintenance.byPriority.high}
            </li>
            <li>Total: {data?.maintenance.total}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Recherche avec Debounce

```tsx
'use client';

import { useState } from 'react';
import { useApi, useDebounce } from '@/hooks/useApi';

export default function SearchProperties() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const { data, loading } = useApi(
    debouncedQuery ? `/api/properties?search=${debouncedQuery}` : null
  );

  return (
    <div>
      <input
        type="search"
        placeholder="Rechercher une propriété..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-2 border rounded"
      />

      {loading && <div>Recherche...</div>}

      {data && (
        <div className="mt-4">
          {data.properties.length} résultat(s) trouvé(s)
        </div>
      )}
    </div>
  );
}
```

---

### 5. Liste avec Pagination

```tsx
'use client';

import { useApi, usePagination } from '@/hooks/useApi';

export default function BookingsList() {
  const { data, loading } = useApi('/api/bookings');
  
  const {
    currentItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = usePagination(data?.bookings || [], 10);

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr>
            <th>Client</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Prix</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.guestName}</td>
              <td>{new Date(booking.checkIn).toLocaleDateString()}</td>
              <td>{new Date(booking.checkOut).toLocaleDateString()}</td>
              <td>{booking.totalPrice}€</td>
              <td>{booking.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4">
        <button onClick={prevPage} disabled={!hasPrevPage}>
          Précédent
        </button>
        <span>Page {currentPage} / {totalPages}</span>
        <button onClick={nextPage} disabled={!hasNextPage}>
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

## 🛠️ Commandes Utiles

### Développement Local

```bash
# Démarrer le serveur dev
npm run dev

# Tester la connexion DB
curl http://localhost:3000/api/db-test

# Voir les logs Prisma
$env:DEBUG="prisma:*"; npm run dev

# Reset la base locale
npx prisma migrate reset

# Seed les données
npm run db:seed
```

### Production (Vercel)

```bash
# Pull les variables d'environnement
vercel env pull .env.local

# Déployer
vercel --prod

# Voir les logs
vercel logs

# Seed la production (une seule fois)
vercel env pull
npm run db:seed
```

### Prisma

```bash
# Générer le client
npx prisma generate

# Créer une migration
npx prisma migrate dev --name add_new_field

# Voir la DB dans le browser
npx prisma studio

# Formater le schema
npx prisma format
```

---

## 🧪 Tests des APIs

### Via cURL

```bash
# Test DB
curl https://bnbgest.vercel.app/api/db-test

# Liste propriétés
curl https://bnbgest.vercel.app/api/properties

# Stats dashboard
curl https://bnbgest.vercel.app/api/stats

# Créer une propriété (avec auth)
curl -X POST https://bnbgest.vercel.app/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Property",
    "ownerId": 1,
    "address": "123 Rue Test",
    "city": "Paris",
    "country": "France",
    "bedrooms": 2,
    "bathrooms": 1,
    "maxGuests": 4,
    "pricePerNight": 100
  }'
```

### Via PowerShell

```powershell
# Test DB
Invoke-RestMethod -Uri "https://bnbgest.vercel.app/api/db-test" -Method Get

# Stats
$stats = Invoke-RestMethod -Uri "https://bnbgest.vercel.app/api/stats"
$stats.bookings.totalRevenue
```

---

## 📊 Structure de Réponse

### Succès
```json
{
  "success": true,
  "data": { ... }
}
```

### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request (validation failed)
- `404` - Not Found
- `409` - Conflict (ex: dates unavailable)
- `500` - Server Error

---

## 🎯 Prochaines Étapes

1. ✅ Setup Vercel Postgres
2. ✅ Tester `/api/db-test`
3. ✅ Seed les données
4. 🔄 Migrer un composant vers les APIs
5. 📝 Ajouter authentication middleware
6. 🚀 Déployer en production

---

## 📚 Documentation Complète

- **API_DOCUMENTATION.md** - Guide complet de toutes les APIs
- **AMELIORATIONS_APP.md** - Détails des améliorations
- **VERCEL_DEPLOYMENT_GUIDE.md** - Guide de déploiement
- **DATABASE_INTEGRATION.md** - Documentation Prisma

---

## 🆘 Troubleshooting

### "Can't reach database server"
- Vérifie que `POSTGRES_PRISMA_URL` est défini
- Vérifie que la DB Vercel est créée
- Check les logs: `vercel logs`

### "Prisma client not generated"
- Run: `npx prisma generate`
- Redéploie: `vercel --prod`

### "Authentication failed"
- Vérifie `NEXTAUTH_SECRET` et `NEXTAUTH_URL`
- Regénère le secret si nécessaire

### "Migration failed"
- Check Vercel build logs
- Vérifie que `prisma migrate deploy` s'exécute
- Reset si nécessaire: `npx prisma migrate reset`

---

## 💡 Tips & Astuces

### 1. Utilise ErrorBoundary partout
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. Loading states améliorés
```tsx
{loading ? <LoadingSpinner /> : <Content />}
```

### 3. Optimistic Updates
```tsx
const { data, mutate } = useApi('/api/properties');

// Update local sans refetch
mutate((current) => ({
  ...current,
  properties: [...current.properties, newProperty]
}));
```

### 4. Filtres URL
```tsx
const filters = {
  status: 'ACTIVE',
  city: 'Paris'
};

const query = new URLSearchParams(filters).toString();
const { data } = useApi(`/api/properties?${query}`);
```

---

## 🎉 Conclusion

Tu as maintenant :
- ✅ 6 APIs RESTful complètes
- ✅ Hooks réutilisables
- ✅ Composants UI prêts
- ✅ Documentation complète

**Ready to rock!** 🚀
