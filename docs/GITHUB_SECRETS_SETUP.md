# GitHub Actions CI/CD Setup Guide

## Required GitHub Secrets

Pour que les workflows CI/CD fonctionnent correctement, vous devez configurer les secrets suivants dans votre repository GitHub.

### Configuration des Secrets

**Emplacement:** `Repository → Settings → Secrets and variables → Actions`

---

## 🔐 Secrets Requis

### 1. **DATABASE_URL** (Required)
**Description:** URL de connexion à votre base de données PostgreSQL

**Format:**
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**Exemple:**
```
postgresql://myuser:mypassword@db.example.com:5432/bnbgest?sslmode=require
```

**Note:** Pour la CI/CD, utilisez une base de données de test dédiée, PAS votre base de production.

---

### 2. **NEXTAUTH_SECRET** (Required)
**Description:** Clé secrète pour chiffrer les tokens NextAuth

**Génération:**
```bash
openssl rand -base64 32
```

**Exemple:**
```
Ab3dEf5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5
```

**⚠️ Important:** Utilisez un secret différent pour la CI/CD et la production.

---

### 3. **NEXTAUTH_URL** (Auto-configured in workflows)
**Description:** URL de l'application NextAuth

**Valeur dans CI/CD:**
```
http://localhost:3000
```

**Note:** Ce secret est automatiquement défini dans les workflows, mais vous pouvez le surcharger si nécessaire.

---

### 4. **ADMIN_EMAIL** (Required for tests)
**Description:** Email du compte admin de test

**Valeur recommandée:**
```
demo@bnbgest.com
```

**Note:** Doit correspondre à un utilisateur existant dans votre base de données de test.

---

### 5. **ADMIN_PASSWORD** (Required for tests)
**Description:** Mot de passe du compte admin de test

**Valeur recommandée:**
```
Demo1234!
```

**Note:** Utilisez un mot de passe simple pour les tests, PAS votre mot de passe de production.

---

### 6. **LHCI_GITHUB_APP_TOKEN** (Optional)
**Description:** Token pour Lighthouse CI Server (optionnel, pour historique)

**Génération:**
1. Créer un compte sur [https://lhci.dev](https://lhci.dev)
2. Créer un nouveau projet
3. Copier le Build Token généré

**Exemple:**
```
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**⚠️ Note:** Si vous n'avez pas ce token, les résultats Lighthouse seront stockés temporairement (7 jours).

---

## 📝 Guide de Configuration Étape par Étape

### Étape 1: Accéder aux Secrets GitHub

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** (onglet en haut)
3. Dans le menu de gauche, cliquez sur **Secrets and variables → Actions**
4. Cliquez sur **New repository secret**

### Étape 2: Ajouter chaque Secret

Pour chaque secret listé ci-dessus:

1. Cliquez sur **New repository secret**
2. **Name:** Entrez le nom exact (ex: `DATABASE_URL`)
3. **Secret:** Collez la valeur correspondante
4. Cliquez sur **Add secret**

### Étape 3: Vérifier la Configuration

Une fois tous les secrets ajoutés, vous devriez voir:

```
✅ DATABASE_URL
✅ NEXTAUTH_SECRET
✅ ADMIN_EMAIL
✅ ADMIN_PASSWORD
⭕ LHCI_GITHUB_APP_TOKEN (optionnel)
```

---

## 🗄️ Configuration de la Base de Données de Test

### Option 1: PostgreSQL Local (Développement)

**Créer une DB de test:**
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE bnbgest_test;

# Créer un utilisateur
CREATE USER bnbgest_test_user WITH PASSWORD 'test_password';

# Donner les permissions
GRANT ALL PRIVILEGES ON DATABASE bnbgest_test TO bnbgest_test_user;
```

**DATABASE_URL pour tests locaux:**
```
postgresql://bnbgest_test_user:test_password@localhost:5432/bnbgest_test
```

---

### Option 2: PostgreSQL Cloud (CI/CD)

**Providers recommandés:**
- [Supabase](https://supabase.com) - Free tier disponible
- [Neon](https://neon.tech) - Free tier avec branches
- [Railway](https://railway.app) - Free tier limité
- [Vercel Postgres](https://vercel.com/storage/postgres) - Intégré avec Vercel

**Exemple avec Supabase:**

1. Créer un projet sur [Supabase](https://supabase.com)
2. Aller dans **Settings → Database**
3. Copier **Connection string**
4. Remplacer `[YOUR-PASSWORD]` par votre mot de passe
5. Ajouter `?sslmode=require` à la fin

**DATABASE_URL résultante:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxx.supabase.co:5432/postgres?sslmode=require
```

---

### Option 3: Docker (Local/CI)

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: bnbgest_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
```

**Démarrer:**
```bash
docker-compose up -d
```

**DATABASE_URL:**
```
postgresql://test_user:test_password@localhost:5433/bnbgest_test
```

---

## 🧪 Initialiser la Base de Données de Test

### Après avoir configuré DATABASE_URL

**1. Exécuter les migrations:**
```bash
npx prisma migrate deploy
```

**2. Seed les données de test:**
```bash
npm run db:seed
```

**3. Créer le compte admin de test:**
```bash
# Manuellement via Prisma Studio
npx prisma studio

# Ou via script
npx tsx tests/helpers/seed-test-user.ts
```

**Vérifier:**
- Email: `demo@bnbgest.com`
- Password: `Demo1234!`
- Role: `ADMIN`

---

## ✅ Validation de la Configuration

### Test Local

**1. Configurer `.env.test.local`:**
```bash
# Copier les secrets localement pour tester
cp .env.example .env.test.local
```

**2. Éditer `.env.test.local`:**
```env
DATABASE_URL="postgresql://test_user:test_password@localhost:5432/bnbgest_test"
NEXTAUTH_SECRET="Ab3dEf5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="demo@bnbgest.com"
ADMIN_PASSWORD="Demo1234!"
```

**3. Tester les workflows localement:**
```bash
# Installer act (GitHub Actions local runner)
# https://github.com/nektos/act

# Tester le workflow performance
act pull_request -j performance-tests --secret-file .env.test.local

# Tester le workflow lighthouse
act pull_request -j lighthouse --secret-file .env.test.local
```

---

### Test sur GitHub

**1. Push les workflows:**
```bash
git add .github/workflows/
git commit -m "feat(ci): Add CI/CD workflows"
git push origin main
```

**2. Créer une PR de test:**
```bash
git checkout -b test/ci-workflows
git push origin test/ci-workflows
# Créer la PR sur GitHub
```

**3. Vérifier les workflows:**
- Aller sur **Actions** dans GitHub
- Vérifier que les 3 workflows se lancent
- Vérifier les logs en cas d'erreur

---

## 🔍 Résolution des Problèmes

### Erreur: "DATABASE_URL is not set"

**Solution:**
1. Vérifier que le secret `DATABASE_URL` existe dans GitHub Secrets
2. Vérifier l'orthographe exacte (sensible à la casse)
3. Re-déclencher le workflow

---

### Erreur: "Connection refused to database"

**Solution:**
1. Vérifier que la base de données est accessible depuis GitHub
2. Vérifier les règles firewall/security groups
3. Utiliser un provider cloud avec accès public (Supabase, Neon)

---

### Erreur: "NEXTAUTH_SECRET is required"

**Solution:**
1. Générer un nouveau secret: `openssl rand -base64 32`
2. Ajouter le secret dans GitHub Settings
3. Re-déclencher le workflow

---

### Erreur: Tests échouent avec "Authentication failed"

**Solution:**
1. Vérifier que l'utilisateur admin existe dans la DB de test
2. Vérifier `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans les secrets
3. Exécuter `npm run db:seed` pour créer l'utilisateur

---

### Lighthouse CI: "No token provided"

**Solution:**
1. Ce n'est qu'un warning si `LHCI_GITHUB_APP_TOKEN` n'est pas défini
2. Les résultats seront stockés temporairement (7 jours)
3. Pour historique permanent: créer un compte sur [lhci.dev](https://lhci.dev)

---

## 📚 Ressources

### Documentation Officielle
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Playwright CI](https://playwright.dev/docs/ci)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [NextAuth.js](https://next-auth.js.org/configuration/options)

### Guides de Providers
- [Supabase Setup](https://supabase.com/docs/guides/database)
- [Neon Branching](https://neon.tech/docs/introduction/branching)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

---

## 🎯 Checklist Finale

Avant de pousser les workflows en production:

- [ ] Tous les secrets requis sont configurés dans GitHub
- [ ] La base de données de test est accessible
- [ ] Les migrations Prisma ont été exécutées
- [ ] Le compte admin de test existe
- [ ] Les workflows passent en local (avec `act` si possible)
- [ ] Une PR de test a été créée et les workflows passent
- [ ] Les commentaires automatiques apparaissent sur la PR
- [ ] Les artifacts sont uploadés correctement

---

**✅ Configuration complète !**

Vos workflows CI/CD sont maintenant prêts à surveiller automatiquement la performance de votre application sur chaque PR ! 🚀
