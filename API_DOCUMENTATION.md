# 📚 API Documentation - BNBGest

## Table des Matières

- [Authentication](#authentication)
- [Properties API](#properties-api)
- [Bookings API](#bookings-api)
- [Database Test](#database-test)
- [Image Optimization](#image-optimization)
- [Hooks & Utilities](#hooks--utilities)

---

## Authentication

Toutes les APIs utilisent NextAuth.js pour l'authentication. Les endpoints protégés nécessitent une session valide.

---

## Properties API

### GET /api/properties

Récupère toutes les propriétés avec leurs relations.

**Query Parameters:**
- `status` (optional): `ACTIVE` | `INACTIVE` | `MAINTENANCE`
- `ownerId` (optional): ID du propriétaire

**Response:**
```json
{
  "success": true,
  "count": 2,
  "properties": [
    {
      "id": 1,
      "name": "Appartement Marais",
      "description": "Charmant appartement...",
      "address": "12 Rue des Rosiers",
      "city": "Paris",
      "country": "France",
      "zipCode": "75004",
      "bedrooms": 2,
      "bathrooms": 1,
      "maxGuests": 4,
      "pricePerNight": 150.0,
      "status": "ACTIVE",
      "owner": {
        "id": 1,
        "name": "Emmanuel Claustre",
        "email": "claustre.emmanuel@gmail.com"
      },
      "bookings": [...],
      "photos": [...],
      "_count": {
        "bookings": 15,
        "reviews": 12,
        "cleanings": 8,
        "maintenanceTasks": 3
      }
    }
  ]
}
```

**Example:**
```typescript
const { data, loading, error } = useApi('/api/properties?status=ACTIVE');
```

---

### POST /api/properties

Crée une nouvelle propriété.

**Request Body:**
```json
{
  "name": "Studio Montmartre",
  "description": "Studio cosy près du Sacré-Cœur",
  "address": "5 Place du Tertre",
  "city": "Paris",
  "country": "France",
  "zipCode": "75018",
  "bedrooms": 1,
  "bathrooms": 1,
  "maxGuests": 2,
  "pricePerNight": 85.0,
  "ownerId": 1,
  "status": "ACTIVE",
  "amenities": "WiFi, TV, Cuisine équipée",
  "houseRules": "Non fumeur, Pas d'animaux"
}
```

**Response:**
```json
{
  "success": true,
  "property": { ... }
}
```

**Example:**
```typescript
const { mutate, loading } = useMutation('/api/properties', 'POST');

await mutate({
  name: 'Studio Montmartre',
  ownerId: 1,
  pricePerNight: 85,
  // ... other fields
});
```

---

### GET /api/properties/[id]

Récupère une propriété spécifique avec toutes ses données.

**Response:**
```json
{
  "success": true,
  "property": {
    "id": 1,
    "name": "Appartement Marais",
    "owner": { ... },
    "bookings": [ ... ],
    "photos": [ ... ],
    "videos": [ ... ],
    "reviews": [ ... ],
    "cleanings": [ ... ],
    "maintenanceTasks": [ ... ],
    "inventoryItems": [ ... ],
    "_count": {
      "bookings": 15,
      "reviews": 12,
      "cleanings": 8,
      "maintenanceTasks": 3,
      "photos": 10,
      "videos": 2
    }
  },
  "stats": {
    "totalBookings": 15,
    "completedBookings": 12,
    "totalRevenue": 1800.0,
    "averageRating": 4.6,
    "reviewCount": 12,
    "maintenanceCount": 3,
    "cleaningCount": 8
  }
}
```

**Example:**
```typescript
const { data, loading } = useApi(`/api/properties/${propertyId}`);
```

---

### PATCH /api/properties/[id]

Met à jour une propriété.

**Request Body:** (tous les champs sont optionnels)
```json
{
  "name": "Nouveau nom",
  "pricePerNight": 120.0,
  "status": "MAINTENANCE",
  "description": "Description mise à jour"
}
```

**Example:**
```typescript
const { mutate } = useMutation(`/api/properties/${id}`, 'PATCH');

await mutate({
  pricePerNight: 120,
  status: 'MAINTENANCE'
});
```

---

### DELETE /api/properties/[id]

Désactive une propriété (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Property deactivated successfully",
  "property": { ... }
}
```

---

## Bookings API

### GET /api/bookings

Récupère toutes les réservations avec filtres et statistiques.

**Query Parameters:**
- `propertyId` (optional): ID de la propriété
- `status` (optional): `PENDING` | `CONFIRMED` | `CHECKED_IN` | `CHECKED_OUT` | `CANCELLED`
- `source` (optional): `DIRECT` | `AIRBNB` | `BOOKING_COM` | `OTHER`
- `startDate` (optional): Date de début (ISO 8601)
- `endDate` (optional): Date de fin (ISO 8601)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "bookings": [
    {
      "id": 1,
      "propertyId": 1,
      "guestName": "Jean Dupont",
      "guestEmail": "jean.dupont@example.com",
      "guestPhone": "+33612345678",
      "checkIn": "2026-04-15T00:00:00.000Z",
      "checkOut": "2026-04-20T00:00:00.000Z",
      "guests": 4,
      "totalPrice": 750.0,
      "status": "CONFIRMED",
      "source": "DIRECT",
      "property": {
        "id": 1,
        "name": "Appartement Marais",
        "address": "12 Rue des Rosiers",
        "city": "Paris"
      },
      "payments": [ ... ],
      "review": null
    }
  ],
  "stats": {
    "total": 10,
    "confirmed": 6,
    "pending": 2,
    "checkedIn": 1,
    "checkedOut": 0,
    "cancelled": 1,
    "totalRevenue": 5400.0
  }
}
```

**Example:**
```typescript
// Toutes les réservations confirmées
const { data } = useApi('/api/bookings?status=CONFIRMED');

// Réservations d'une propriété
const { data } = useApi(`/api/bookings?propertyId=${propertyId}`);

// Réservations par période
const { data } = useApi(
  `/api/bookings?startDate=2026-04-01&endDate=2026-04-30`
);
```

---

### POST /api/bookings

Crée une nouvelle réservation avec vérification de disponibilité.

**Request Body:**
```json
{
  "propertyId": 1,
  "guestName": "Marie Martin",
  "guestEmail": "marie.martin@example.com",
  "guestPhone": "+33612345678",
  "checkIn": "2026-05-01",
  "checkOut": "2026-05-07",
  "guests": 2,
  "totalPrice": 900.0,
  "status": "CONFIRMED",
  "source": "AIRBNB",
  "externalId": "AIRBNB-123456",
  "notes": "Arrivée tardive demandée"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": 2,
    "propertyId": 1,
    "guestName": "Marie Martin",
    // ... autres champs
    "property": {
      "id": 1,
      "name": "Appartement Marais",
      "address": "12 Rue des Rosiers",
      "pricePerNight": 150.0
    }
  }
}
```

**Error (conflit de dates):**
```json
{
  "success": false,
  "error": "Property not available for selected dates"
}
```
Status: `409 Conflict`

**Example:**
```typescript
const { mutate, loading, error } = useMutation('/api/bookings', 'POST');

try {
  const booking = await mutate({
    propertyId: 1,
    guestName: 'Marie Martin',
    guestEmail: 'marie@example.com',
    checkIn: '2026-05-01',
    checkOut: '2026-05-07',
    guests: 2,
    totalPrice: 900,
    source: 'AIRBNB'
  });
  
  console.log('Booking created:', booking);
} catch (err) {
  console.error('Booking failed:', err.message);
}
```

---

## Database Test

### GET /api/db-test

Vérifie la connexion à la base de données PostgreSQL.

**Response:**
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "counts": {
    "users": 1,
    "properties": 2,
    "bookings": 3
  },
  "prismaVersion": "7.6.0",
  "provider": "postgresql"
}
```

**Error:**
```json
{
  "success": false,
  "database": "error",
  "error": "Can't reach database server",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

**Example:**
```bash
curl https://bnbgest.vercel.app/api/db-test
```

---

## Image Optimization

### POST /api/optimize-image

Optimise une image avec Next.js Image Optimization.

**Request:**
```json
{
  "url": "/uploads/photo.jpg",
  "width": 1920,
  "quality": 85,
  "format": "webp"
}
```

**Response:**
```json
{
  "optimizedUrl": "/_next/image?url=%2Fuploads%2Fphoto.jpg&w=1920&q=85",
  "format": "webp",
  "originalSize": 2048,
  "optimizedSize": 512,
  "savings": 75
}
```

**Parameters:**
- `url` (required): URL de l'image
- `width` (optional): Largeur cible (default: 1200)
- `height` (optional): Hauteur cible
- `quality` (optional): Qualité 1-100 (default: 80)
- `format` (optional): `webp` | `avif` | `jpeg` | `png` (default: webp)

**Savings Calculation:**
- AVIF: ~75% de compression
- WebP: ~65% de compression
- JPEG: ~50% de compression
- PNG: ~20% de compression

**Example:**
```typescript
const { mutate } = useMutation('/api/optimize-image', 'POST');

const result = await mutate({
  url: '/uploads/photo.jpg',
  width: 1920,
  quality: 85,
  format: 'webp'
});

console.log(`Optimized! Saved ${result.savings}%`);
```

---

### GET /api/optimize-image

Génère un blur placeholder pour une image.

**Query Parameters:**
- `url` (required): URL de l'image

**Response:**
```json
{
  "url": "/uploads/photo.jpg",
  "blurDataUrl": "data:image/svg+xml;base64,...",
  "formats": ["webp", "avif", "jpeg"],
  "sizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
}
```

**Example:**
```typescript
const { data } = useApi(`/api/optimize-image?url=${encodeURIComponent(imageUrl)}`);

<Image
  src={imageUrl}
  placeholder="blur"
  blurDataURL={data.blurDataUrl}
  width={1200}
  height={800}
/>
```

---

## Hooks & Utilities

### useApi

Hook pour fetch automatique avec gestion d'état.

```typescript
import { useApi } from '@/hooks/useApi';

function PropertiesList() {
  const { data, loading, error, refetch } = useApi('/api/properties');

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.properties.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

---

### useMutation

Hook pour les mutations (POST, PATCH, DELETE).

```typescript
import { useMutation } from '@/hooks/useApi';

function CreatePropertyForm() {
  const { mutate, loading, error } = useMutation('/api/properties', 'POST');

  const handleSubmit = async (formData) => {
    try {
      const property = await mutate(formData);
      console.log('Created:', property);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Property'}
      </button>
      {error && <div className="error">{error.message}</div>}
    </form>
  );
}
```

---

### useDebounce

Hook pour le debounce (recherches).

```typescript
import { useDebounce } from '@/hooks/useApi';

function SearchBar() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const { data } = useApi(
    debouncedQuery ? `/api/properties?search=${debouncedQuery}` : null
  );

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search properties..."
    />
  );
}
```

---

### usePagination

Hook pour la pagination.

```typescript
import { usePagination } from '@/hooks/useApi';

function PropertyList({ properties }) {
  const {
    currentItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage
  } = usePagination(properties, 10);

  return (
    <div>
      {currentItems.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
      
      <div className="pagination">
        <button onClick={prevPage} disabled={!hasPrevPage}>
          Previous
        </button>
        <span>{currentPage} / {totalPages}</span>
        <button onClick={nextPage} disabled={!hasNextPage}>
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Error Handling

Toutes les APIs retournent un format d'erreur cohérent :

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200` OK - Succès
- `201` Created - Ressource créée
- `400` Bad Request - Paramètres invalides
- `404` Not Found - Ressource introuvable
- `409` Conflict - Conflit (ex: dates indisponibles)
- `500` Internal Server Error - Erreur serveur

---

## Rate Limiting

Les APIs sont protégées par les limites Vercel :
- **Serverless Functions**: 10s timeout, 50MB response
- **Edge Functions**: 30s timeout, 4MB response
- **Connection Pooling**: PgBouncer configuré automatiquement

---

## Caching

Headers de cache configurés :
- **Images**: `s-maxage=3600, stale-while-revalidate=86400`
- **Data**: `s-maxage=60, stale-while-revalidate=300`
- **Static**: `s-maxage=86400, stale-while-revalidate=604800`

---

## Testing

Test des APIs en local :

```bash
# Start dev server
npm run dev

# Test database connection
curl http://localhost:3000/api/db-test

# Test properties endpoint
curl http://localhost:3000/api/properties

# Create property
curl -X POST http://localhost:3000/api/properties \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Property","ownerId":1,"pricePerNight":100}'
```

---

## Production URLs

**Base URL**: `https://bnbgest.vercel.app`

All endpoints:
- `GET /api/db-test`
- `GET /api/properties`
- `POST /api/properties`
- `GET /api/properties/[id]`
- `PATCH /api/properties/[id]`
- `DELETE /api/properties/[id]`
- `GET /api/bookings`
- `POST /api/bookings`
- `POST /api/optimize-image`
- `GET /api/optimize-image`

---

## 🎯 Next Steps

1. ✅ Créer les APIs Reviews
2. ✅ Créer les APIs Maintenance
3. ✅ Créer les APIs Cleanings
4. ✅ Ajouter authentication middleware
5. ✅ Implémenter rate limiting custom
6. ✅ Ajouter des webhooks pour intégrations
