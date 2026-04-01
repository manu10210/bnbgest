# 🚀 Guide de Déploiement Vercel avec PostgreSQL

## ✅ Configuration Complétée

L'application est maintenant **100% compatible Vercel** avec Prisma 7 et PostgreSQL.

## 📋 Étapes de Déploiement

### 1. Créer une Base de Données Vercel Postgres

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet `bnbgest`
3. Onglet **Storage** → **Create Database**
4. Choisissez **Postgres**
5. Région : Choisir la même que votre projet (ex: `fra1` pour Europe)
6. Cliquez sur **Create**

### 2. Variables d'Environnement Automatiques

Vercel configure **automatiquement** ces variables :

```bash
POSTGRES_URL
POSTGRES_PRISMA_URL         # ✅ Utilisé par Prisma (avec connection pooling)
POSTGRES_URL_NON_POOLING    # ✅ Utilisé pour migrations
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

**Aucune configuration manuelle nécessaire !**

### 3. Ajouter les Variables NextAuth

Dans **Settings** → **Environment Variables**, ajoutez :

```bash
# NextAuth (obligatoire)
NEXTAUTH_URL=https://bnbgest.vercel.app
NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>

# Google OAuth (optionnel)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 4. Déployer

```bash
git add .
git commit -m "feat: PostgreSQL compatibility for Vercel"
git push
```

Vercel va automatiquement :
1. ✅ Installer les dépendances
2. ✅ Générer Prisma Client (`prisma generate`)
3. ✅ Exécuter les migrations (`prisma migrate deploy`)
4. ✅ Build Next.js
5. ✅ Déployer

### 5. Initialiser la Base de Données (Première fois)

Après le premier déploiement, exécutez le seed en local connecté à Vercel Postgres :

```bash
# Option A : Via Vercel CLI
vercel env pull .env.local
npx prisma db seed

# Option B : Manuellement via Prisma Studio
npx prisma studio
# Ouvrir http://localhost:5555 et ajouter les données
```

## 📊 Structure de la Base de Données

### 20 Tables Créées

#### Authentication
- `User` - Utilisateurs (admin, employés)
- `Account` - Comptes OAuth
- `Session` - Sessions actives
- `UserProfile` - Profils utilisateurs
- `UserSettings` - Paramètres utilisateurs

#### Propriétés & Réservations
- `Property` - Propriétés (appartements, studios)
- `Booking` - Réservations (Direct, Airbnb, Booking.com)
- `Payment` - Paiements (CARD, STRIPE, PAYPAL, etc.)
- `Review` - Avis clients

#### Médias
- `Photo` - Photos (Cloudinary)
- `Video` - Vidéos

#### Opérations
- `Cleaning` - Ménages planifiés
- `MaintenanceTask` - Tâches de maintenance
- `InventoryItem` - Inventaire (draps, savon, etc.)
- `Contract` - Contrats

#### Intégrations
- `IntegrationSetting` - Paramètres Airbnb/Booking
- `NotificationPreference` - Préférences notifications
- `NotificationLog` - Logs notifications

#### Système
- `Backup` - Sauvegardes
- `AnalyticsEvent` - Événements analytiques
- `AuditLog` - Logs d'audit

### 10 Enums

```prisma
Role: USER | ADMIN | EMPLOYEE
PropertyStatus: ACTIVE | INACTIVE | MAINTENANCE
BookingStatus: PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED
BookingSource: DIRECT | AIRBNB | BOOKING_COM | OTHER
PaymentStatus: PENDING | COMPLETED | FAILED | REFUNDED
PaymentMethod: CASH | CARD | BANK_TRANSFER | PAYPAL | STRIPE
CleaningStatus: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
MaintenancePriority: LOW | MEDIUM | HIGH | URGENT
MaintenanceStatus: PENDING | IN_PROGRESS | COMPLETED | CANCELLED
ContractStatus: DRAFT | ACTIVE | EXPIRED | TERMINATED
BackupType: MANUAL | AUTOMATIC
BackupStatus: PENDING | COMPLETED | FAILED
```

## 🔧 Scripts Disponibles

```bash
# Développement
npm run dev                    # Lancer Next.js en dev
npm run prisma:studio          # Ouvrir Prisma Studio
npm run prisma:generate        # Générer le client Prisma

# Base de données
npm run db:seed                # Peupler avec données de test
npm run db:push                # Push schema vers DB (dev)

# Production
npm run build                  # Build avec migrations
npm start                      # Lancer en production
```

## 🔐 Données de Test (Seed)

### Admin User
```
Email: claustre.emmanuel@gmail.com
Password: admin123
Role: ADMIN
```

### Propriétés
1. **Appartement Marais** - Paris 75004 (2 ch, 150€/nuit)
2. **Studio Montmartre** - Paris 75018 (1 ch, 85€/nuit)

### Réservations
1. Jean Dupont - 15-20 avril 2026 (Direct)
2. Marie Martin - 1-7 mai 2026 (Airbnb)
3. Pierre Bernard - 10-12 avril 2026 (Booking.com)

## 🔍 Vérifications Post-Déploiement

### 1. Vérifier les Migrations

```bash
vercel logs --follow
# Chercher : "✔ Generated Prisma Client"
# Chercher : "Applied XX migrations"
```

### 2. Tester la Connexion DB

Créez un endpoint test : `app/api/db-test/route.ts`

```typescript
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const count = await prisma.user.count();
    return Response.json({ 
      success: true, 
      users: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

Tester : `https://bnbgest.vercel.app/api/db-test`

### 3. Vérifier Prisma Studio en Local

```bash
# Connecter à la DB Vercel depuis local
vercel env pull .env.local
npx prisma studio
```

Ouvrir http://localhost:5555

## 🐛 Troubleshooting

### Erreur : "No Prisma schema found"

```bash
# Vérifier que prisma/schema.prisma existe
ls prisma/schema.prisma

# Régénérer le client
npx prisma generate
```

### Erreur : "Can't reach database server"

```bash
# Vérifier les variables d'environnement Vercel
vercel env ls

# Vérifier que POSTGRES_PRISMA_URL existe
# Si non : Recréer la liaison Storage → Postgres
```

### Erreur de Migration : "Schema drift"

```bash
# Reset la DB (⚠️ ATTENTION : Perte de données)
vercel env pull .env.local
npx prisma migrate reset

# Ou créer une nouvelle migration
npx prisma migrate dev --name fix_schema
git push
```

### Build Fail : "Prisma generate failed"

Vérifier `package.json` :

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

## 📚 Documentation Complète

- [DATABASE_INTEGRATION.md](./DATABASE_INTEGRATION.md) - Guide technique complet
- [DATABASE_QUICKSTART.md](./DATABASE_QUICKSTART.md) - Démarrage rapide
- [DATABASE_REPORT.md](./DATABASE_REPORT.md) - Rapport technique

## ✅ Checklist Déploiement

- [ ] Base Vercel Postgres créée
- [ ] Variables NEXTAUTH_URL et NEXTAUTH_SECRET ajoutées
- [ ] Code pushé sur GitHub
- [ ] Build réussi sur Vercel
- [ ] Migrations appliquées (vérifier logs)
- [ ] Seed exécuté (données de test)
- [ ] Test API `/api/db-test` → Success
- [ ] Connexion admin testée
- [ ] Prisma Studio fonctionne en local

## 🎉 Prêt pour Production !

L'application est maintenant entièrement compatible Vercel avec :
- ✅ Prisma 7 + PostgreSQL
- ✅ Connection pooling (PgBouncer)
- ✅ Migrations automatiques au build
- ✅ 20 tables avec relations complètes
- ✅ Seed script fonctionnel
- ✅ Support NextAuth.js
- ✅ APIs intégrations (Airbnb, Booking.com)

**URL Production** : https://bnbgest.vercel.app
