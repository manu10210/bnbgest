# 🚀 Guide Rapide - Démarrage Base de Données

## 🎯 Option 1 : PostgreSQL avec Docker (Recommandé)

### Prérequis
- Docker Desktop installé ([Télécharger](https://www.docker.com/products/docker-desktop/))

### Démarrage en 3 commandes

```bash
# 1. Démarrer PostgreSQL
docker-compose up -d

# 2. Générer le client Prisma et créer les tables
npx prisma migrate dev --name init

# 3. Peupler avec des données de test
npm run db:seed
```

### Vérification

```bash
# Ouvrir Prisma Studio pour voir les données
npx prisma studio
```

Ouvre http://localhost:5555 - Vous verrez :
- ✅ 1 utilisateur admin
- ✅ 2 propriétés
- ✅ 3 réservations
- ✅ 2 avis
- ✅ Photos, nettoyages, maintenance, inventaire

### Connexion test
- **Email**: claustre.emmanuel@gmail.com
- **Password**: admin123

---

## 🎯 Option 2 : Vercel Postgres (Production)

### 1. Créer la base Vercel

Dans votre dashboard Vercel :
1. Aller dans **Storage** → **Create Database**
2. Sélectionner **Postgres**
3. Nommer : `bnbgest-db`
4. Connect to project : `bnbgest`

### 2. Variables d'environnement

Vercel configure automatiquement. Vérifier dans **Settings** → **Environment Variables** :

```bash
POSTGRES_URL=postgres://default:xxx@xxx-pooler.aws.postgres.vercel-storage.com/verceldb
POSTGRES_PRISMA_URL=postgres://default:xxx@xxx-pooler.aws.postgres.vercel-storage.com/verceldb?pgbouncer=true
DATABASE_URL=$POSTGRES_PRISMA_URL
```

### 3. Déploiement

```bash
git push
```

Vercel va automatiquement :
1. ✅ Installer les dépendances
2. ✅ Générer le client Prisma (`prisma generate`)
3. ✅ Appliquer les migrations (`prisma migrate deploy`)
4. ✅ Build Next.js

### 4. Seed en production (optionnel)

```bash
# Depuis votre machine locale avec DATABASE_URL de Vercel
npx prisma db seed
```

---

## 📊 Commandes utiles

```bash
# Voir les données visuellement
npx prisma studio

# Créer une migration
npx prisma migrate dev --name add_feature

# Appliquer les migrations en production
npx prisma migrate deploy

# Réinitialiser la base (⚠️ Supprime tout)
npx prisma migrate reset

# Vérifier la connexion
npx prisma db execute --stdin < test.sql
```

---

## 🔧 Troubleshooting

### ❌ "Can't reach database server"

**Docker :**
```bash
# Vérifier que le container tourne
docker ps

# Voir les logs
docker logs bnbgest-postgres

# Redémarrer
docker-compose restart
```

**Vercel :**
```bash
# Vérifier la connexion
DATABASE_URL="votre_url" npx prisma db execute --stdin < test.sql
```

### ❌ "Prisma Client not generated"

```bash
npx prisma generate
```

### ❌ "Migration failed"

```bash
# Réinitialiser et réappliquer
npx prisma migrate reset
npx prisma migrate dev --name init
```

---

## 🎉 C'est prêt !

Votre base de données est maintenant configurée avec :

- 📦 **20 tables** (Users, Properties, Bookings, etc.)
- 🔐 **Auth** complète (NextAuth + Google)
- 🏠 **Properties** avec photos/videos
- 📅 **Bookings** Airbnb/Booking.com
- ⭐ **Reviews** & ratings
- 🧹 **Cleaning** checklists
- 🔧 **Maintenance** tasks
- 📦 **Inventory** tracking
- 💾 **Backups** automatiques
- 📊 **Analytics** & audit logs

### Prochaines étapes

1. **Développement local** : `npm run dev`
2. **Tester l'API** : `curl http://localhost:3000/api/health`
3. **Voir les données** : `npx prisma studio`
4. **Déployer** : `git push`

---

Pour plus de détails, voir **DATABASE_INTEGRATION.md** (3000+ lignes)
