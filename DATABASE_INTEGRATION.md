# 🗄️ Guide d'intégration Base de Données - BNBGEST

## 📋 Vue d'ensemble

BNBGEST utilise **Prisma ORM** avec **PostgreSQL** pour une gestion complète et typée de la base de données.

### 🎯 Avantages

- ✅ **Type-safe** : TypeScript end-to-end
- ✅ **Migrations** : Gestion automatique du schéma
- ✅ **Performances** : Connection pooling et optimisations
- ✅ **Vercel** : Intégration native avec Vercel Postgres
- ✅ **Dev friendly** : Prisma Studio pour visualiser les données

## 🏗️ Architecture

### Modèles de données (20 tables)

#### 👤 **Authentification & Utilisateurs**
- `User` - Utilisateurs principaux
- `Account` - Comptes OAuth (Google, etc.)
- `Session` - Sessions actives
- `UserProfile` - Profils détaillés (téléphone, adresse, etc.)
- `UserSettings` - Préférences utilisateur (2FA, notifications, etc.)

#### 🏠 **Propriétés**
- `Property` - Propriétés (appartements, maisons)
- Relations : bookings, photos, videos, reviews, cleanings, maintenance, inventory, contracts

#### 📅 **Réservations**
- `Booking` - Réservations (Airbnb, Booking.com, direct)
- `Payment` - Paiements associés
- Statuts : PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED

#### ⭐ **Avis & Évaluations**
- `Review` - Avis clients (1-5 étoiles)
- Synchronisation Airbnb/Booking.com

#### 🖼️ **Médias**
- `Photo` - Photos propriétés (Cloudinary)
- `Video` - Vidéos de présentation

#### 🧹 **Nettoyage**
- `Cleaning` - Planning de nettoyage
- Checklist en JSON, durées estimées/réelles

#### 🔧 **Maintenance**
- `MaintenanceTask` - Tâches de maintenance
- Priorités : LOW, MEDIUM, HIGH, URGENT

#### 📦 **Inventaire**
- `InventoryItem` - Stocks (linge, produits, équipements)
- Alertes stock minimum

#### 📄 **Contrats**
- `Contract` - Contrats de location
- Génération PDF, signatures électroniques

#### 🔗 **Intégrations**
- `IntegrationSetting` - Configuration Airbnb/Booking.com
- Synchronisation calendrier iCal

#### 🔔 **Notifications**
- `NotificationPreference` - Préférences par utilisateur
- `NotificationLog` - Historique des envois

#### 💾 **Sauvegardes**
- `Backup` - Historique des sauvegardes
- Types : MANUAL, AUTOMATIC

#### 📊 **Analytics & Logs**
- `AnalyticsEvent` - Événements utilisateur
- `AuditLog` - Logs d'audit (CREATE, UPDATE, DELETE)

## 🚀 Installation & Configuration

### 1️⃣ Installation locale (Développement)

#### Option A : PostgreSQL avec Docker (Recommandé)

```bash
# Créer un container PostgreSQL
docker run --name bnbgest-postgres \
  -e POSTGRES_USER=bnbgest \
  -e POSTGRES_PASSWORD=bnbgest123 \
  -e POSTGRES_DB=bnbgest \
  -p 5432:5432 \
  -d postgres:15-alpine

# Vérifier que le container tourne
docker ps
```

#### Option B : PostgreSQL installé localement

**Windows:**
1. Télécharger PostgreSQL : https://www.postgresql.org/download/windows/
2. Installer et créer la base `bnbgest`
3. Configurer le mot de passe

**macOS (Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
createdb bnbgest
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb bnbgest
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'bnbgest123';"
```

### 2️⃣ Configuration de la connexion

Modifier `.env.local` :

```bash
# Development
DATABASE_URL="postgresql://bnbgest:bnbgest123@localhost:5432/bnbgest?schema=public"
```

### 3️⃣ Générer le client Prisma

```bash
npx prisma generate
```

### 4️⃣ Créer les tables (Migration)

```bash
# Créer et appliquer la migration initiale
npx prisma migrate dev --name init

# Cette commande :
# 1. Crée le dossier prisma/migrations/
# 2. Génère le SQL de création des tables
# 3. Applique les migrations à la DB
# 4. Génère le client Prisma
```

### 5️⃣ Seed (Données de test)

Créer `prisma/seed.ts` :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Créer un utilisateur admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@bnbgest.com',
      name: 'Admin BNBGEST',
      role: 'ADMIN',
      profile: {
        create: {
          phone: '+33 6 12 34 56 78',
          company: 'BNBGEST',
          city: 'Paris',
          country: 'France'
        }
      }
    }
  });

  // Créer une propriété
  const property = await prisma.property.create({
    data: {
      name: 'Appartement Marais',
      address: '15 Rue des Rosiers',
      city: 'Paris',
      country: 'France',
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      price: 150,
      userId: admin.id
    }
  });

  console.log('✅ Seed completed:', { admin, property });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Ajouter dans `package.json` :

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Exécuter le seed :

```bash
npm install -D ts-node
npx prisma db seed
```

### 6️⃣ Visualiser les données (Prisma Studio)

```bash
npx prisma studio
```

Ouvre un interface web sur http://localhost:5555

## 🌐 Déploiement Production (Vercel)

### 1️⃣ Créer une base Vercel Postgres

```bash
# Depuis votre dashboard Vercel
1. Aller dans Storage
2. Créer "Postgres Database"
3. Connecter à votre projet BNBGEST
```

### 2️⃣ Variables d'environnement

Vercel configure automatiquement :
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

Ajouter manuellement dans Vercel :
```bash
DATABASE_URL=$POSTGRES_PRISMA_URL
```

### 3️⃣ Script de build

Modifier `package.json` :

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

### 4️⃣ Deploy

```bash
git add .
git commit -m "feat: Add Prisma database integration"
git push
```

Vercel déploiera automatiquement avec :
1. Installation des dépendances
2. Génération du client Prisma
3. Application des migrations
4. Build Next.js

## 📚 Utilisation dans le code

### Import du client

```typescript
import prisma from '@/lib/prisma';
```

### Exemples CRUD

#### Create (Créer une réservation)

```typescript
const booking = await prisma.booking.create({
  data: {
    propertyId: 1,
    guestName: 'Jean Dupont',
    guestEmail: 'jean@example.com',
    checkIn: new Date('2024-06-01'),
    checkOut: new Date('2024-06-05'),
    guests: 2,
    totalPrice: 600,
    status: 'CONFIRMED'
  }
});
```

#### Read (Lire les réservations)

```typescript
// Toutes les réservations
const bookings = await prisma.booking.findMany({
  include: {
    property: true,
    payments: true
  },
  orderBy: { checkIn: 'desc' }
});

// Réservation par ID
const booking = await prisma.booking.findUnique({
  where: { id: 1 },
  include: { property: true }
});

// Recherche avec filtre
const upcomingBookings = await prisma.booking.findMany({
  where: {
    checkIn: { gte: new Date() },
    status: 'CONFIRMED'
  }
});
```

#### Update (Mettre à jour)

```typescript
const updated = await prisma.booking.update({
  where: { id: 1 },
  data: {
    status: 'CHECKED_IN',
    updatedAt: new Date()
  }
});
```

#### Delete (Supprimer)

```typescript
await prisma.booking.delete({
  where: { id: 1 }
});
```

### Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Créer la réservation
  const booking = await tx.booking.create({
    data: { /* ... */ }
  });

  // Créer le paiement
  const payment = await tx.payment.create({
    data: {
      bookingId: booking.id,
      amount: booking.totalPrice,
      method: 'CARD'
    }
  });

  // Enregistrer dans les logs
  await tx.auditLog.create({
    data: {
      action: 'CREATE',
      resource: 'Booking',
      resourceId: booking.id.toString()
    }
  });

  return { booking, payment };
});
```

### Relations

```typescript
// Récupérer une propriété avec toutes ses relations
const property = await prisma.property.findUnique({
  where: { id: 1 },
  include: {
    bookings: {
      where: { status: 'CONFIRMED' },
      orderBy: { checkIn: 'desc' }
    },
    photos: { where: { isMain: true } },
    reviews: { orderBy: { createdAt: 'desc' }, take: 5 },
    cleanings: { where: { status: 'SCHEDULED' } },
    maintenance: { where: { status: 'PENDING' } }
  }
});
```

### Agrégations

```typescript
// Statistiques des réservations
const stats = await prisma.booking.aggregate({
  _count: true,
  _sum: { totalPrice: true },
  _avg: { totalPrice: true },
  where: {
    status: 'COMPLETED',
    checkIn: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31')
    }
  }
});

console.log(`Total: ${stats._count}`);
console.log(`Revenu: ${stats._sum.totalPrice}€`);
console.log(`Moyenne: ${stats._avg.totalPrice}€`);
```

## 🔧 Migrations

### Créer une nouvelle migration

```bash
# Après avoir modifié schema.prisma
npx prisma migrate dev --name add_new_feature
```

### Appliquer les migrations en production

```bash
npx prisma migrate deploy
```

### Réinitialiser la base (⚠️ Supprime toutes les données)

```bash
npx prisma migrate reset
```

## 🛠️ Commandes utiles

```bash
# Formater le schéma
npx prisma format

# Valider le schéma
npx prisma validate

# Générer le client
npx prisma generate

# Ouvrir Prisma Studio
npx prisma studio

# Créer une migration
npx prisma migrate dev --name my_migration

# Appliquer les migrations
npx prisma migrate deploy

# Seed la base
npx prisma db seed

# Réinitialiser (⚠️ Danger)
npx prisma migrate reset

# Inspecter une DB existante
npx prisma db pull
```

## 📊 Monitoring & Performance

### Connection Pooling

Prisma utilise automatiquement le connection pooling. Pour Vercel :

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Vercel Postgres utilise PgBouncer automatiquement.

### Logging

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ]
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### Indexes

Déjà optimisés dans le schéma :

```prisma
model Booking {
  @@index([propertyId])
  @@index([checkIn, checkOut])
  @@index([status])
}
```

## 🔒 Sécurité

### 1. Jamais exposer la DATABASE_URL

```typescript
// ❌ MAL
export const databaseUrl = process.env.DATABASE_URL;

// ✅ BON
// Utiliser uniquement côté serveur
```

### 2. Validation des entrées

```typescript
import { z } from 'zod';

const bookingSchema = z.object({
  guestName: z.string().min(2),
  guestEmail: z.string().email(),
  checkIn: z.date(),
  guests: z.number().min(1).max(20)
});

const data = bookingSchema.parse(input);
const booking = await prisma.booking.create({ data });
```

### 3. Row-Level Security (RLS)

Implémenter dans les API routes :

```typescript
// Vérifier que l'utilisateur peut accéder à cette ressource
const property = await prisma.property.findFirst({
  where: {
    id: propertyId,
    userId: session.user.id // ✅ Filtrer par userId
  }
});
```

## 📖 Ressources

- 📘 **Prisma Docs** : https://www.prisma.io/docs
- 🎥 **Prisma YouTube** : https://www.youtube.com/@PrismaData
- 💬 **Prisma Discord** : https://pris.ly/discord
- 📦 **Vercel Postgres** : https://vercel.com/docs/storage/vercel-postgres

## 🐛 Troubleshooting

### Erreur : "Can't reach database server"

```bash
# Vérifier que PostgreSQL tourne
docker ps  # Pour Docker
brew services list  # Pour macOS
sudo systemctl status postgresql  # Pour Linux

# Tester la connexion
psql postgresql://user:password@localhost:5432/bnbgest
```

### Erreur : "Migration failed"

```bash
# Réinitialiser et réappliquer
npx prisma migrate reset
npx prisma migrate dev
```

### Erreur : "Prisma Client not generated"

```bash
npx prisma generate
```

## ✅ Checklist de déploiement

- [ ] PostgreSQL installé (local) ou Docker
- [ ] DATABASE_URL configuré dans .env.local
- [ ] `npx prisma generate` exécuté
- [ ] `npx prisma migrate dev` exécuté
- [ ] Seed données de test créées
- [ ] Vercel Postgres créé (production)
- [ ] Variables d'environnement Vercel configurées
- [ ] Build script mis à jour
- [ ] Tests de connexion réussis

---

🎉 **Base de données prête !** Vous pouvez maintenant utiliser Prisma dans toute l'application.
