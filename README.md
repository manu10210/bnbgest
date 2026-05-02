# 🏠 BNBGest - Gestion Locative Professionnelle

[![Déploiement](https://img.shields.io/badge/deploy-vercel-black)](https://bnbgest.vercel.app)
[![Production](https://img.shields.io/badge/status-PRODUCTION-success)](https://bnbgest.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> Application web complète et moderne pour gérer vos propriétés Airbnb de manière professionnelle.

🌐 **URL Production** : [https://bnbgest.vercel.app](https://bnbgest.vercel.app)  
🟢 **Statut** : EN PRODUCTION - DONNÉES RÉELLES UNIQUEMENT

---

## ⚠️ ENVIRONNEMENT PRODUCTION

Cette application est **EN PRODUCTION**. Toutes les données sont **RÉELLES**.

- ✅ Base de données nettoyée (données de test supprimées)
- ✅ Seed automatique bloqué en production
- ✅ Un seul compte admin actif
- 📖 **Guide Production** : Voir [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)

**Compte Admin** :
```
Email: claustre.emmanuel@gmail.com
Password: admin123 (⚠️ À CHANGER IMMÉDIATEMENT)
```

---

## 🚀 Déploiement Vercel

### Prérequis
- Compte [Vercel](https://vercel.com)
- Compte [GitHub](https://github.com)

### Déploiement Rapide

1. **Fork/Clone ce repository**
   ```bash
   git clone https://github.com/manu10210/bnbgest.git
   cd bnbgest
   ```

2. **Déployer sur Vercel**
   - Connectez votre repo GitHub à Vercel
   - Vercel détecte automatiquement Next.js
   - Cliquez sur "Deploy"

3. **Créer la Base de Données Postgres**
   - Dans Vercel Dashboard → Storage → Create Database
   - Choisir "Postgres"
   - Les variables d'environnement sont auto-configurées ✅
   - Vérifiez que `POSTGRES_URL_NON_POOLING` est bien présent (utilisé par Prisma pour les migrations)

4. **Ajouter les Variables NextAuth**
   - Settings → Environment Variables
   - `NEXTAUTH_URL` = votre URL Vercel
   - `NEXTAUTH_SECRET` = générer avec `openssl rand -base64 32`

5. **Redéployer**
   - Vercel va exécuter les migrations automatiquement
   - L'application est prête ! 🎉

📖 **[Guide Complet de Déploiement →](./VERCEL_DEPLOYMENT_GUIDE.md)**

---

## ✨ Fonctionnalités Principales

### 📊 Tableau de Bord
- Vue d'ensemble des revenus, dépenses et profits
- Graphiques interactifs (Recharts)
- Prévisions de revenus
- Statistiques en temps réel

### 🏡 Gestion des Propriétés
- Création et gestion de propriétés multiples
- Configuration détaillée (équipements, prix, disponibilité)
- Photos et galeries
- Personnalisation complète

### 📅 Réservations & Calendrier
- Système de réservation complet
- Calendrier interactif (FullCalendar)
- Gestion des dates et tarifs
- Historique des réservations

### 🧹 Maintenance & Ménage
- Checklists de nettoyage personnalisables
- Galerie photo avant/après
- Assignation aux employés
- Suivi des tâches en temps réel

### 👥 Gestion Clients & Invités
- Profils clients détaillés
- Historique des séjours
- Système de notation et avis
- Communication centralisée

### 📦 Inventaire
- Suivi des stocks et équipements
- Alertes de réapprovisionnement
- Gestion des fournisseurs
- Historique des achats

### 📱 Guides Vidéo Équipements (QR Codes)
- Création de guides vidéo pour chaque équipement
- Génération automatique de QR codes
- Accessible depuis mobile
- Upload vidéo depuis smartphone
- Streaming optimisé

### 📄 Génération de Contrats
- Modèles de contrats personnalisables
- Génération automatique PDF
- Variables dynamiques
- Signature électronique

### 🎨 Personnalisation
- Thème clair/sombre
- Customisation des couleurs
- Multi-langue (FR/EN/ES)
- Interface adaptative

### � Authentification Sécurisée
- **Email/Password classique**
- **🆕 Google OAuth (1-clic)**
- JWT strategy (NextAuth.js v5)
- Whitelist d'emails autorisés
- Sessions sécurisées (30 jours)
- Gestion des rôles (Admin/Employé/Client)

### �📱 Progressive Web App (PWA)
- Installation comme app native
- Raccourcis rapides
- Icône sur écran d'accueil
- Mode standalone

---

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 18+ installé
- npm ou yarn
- Git (pour déploiement automatique)

### Installation Locale

```bash
# Cloner le repository
git clone https://github.com/manu10210/bnbgest.git

# Installer les dépendances
cd bnbgest
npm install

# Lancer en développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Build Production

```bash
# Build de l'application
npm run build

# Lancer en production
npm start
```

---

## 📱 Installation PWA

### Sur Mobile (Android)
1. Ouvrez https://bnbgest.vercel.app sur Chrome
2. Menu (3 points) → "Ajouter à l'écran d'accueil"
3. Confirmez l'installation

### Sur iPhone/iPad
1. Ouvrez https://bnbgest.vercel.app sur Safari
2. Bouton Partager → "Sur l'écran d'accueil"
3. Installez

### Sur Desktop
1. Ouvrez https://bnbgest.vercel.app
2. Cliquez sur ⊕ dans la barre d'adresse
3. "Installer BNBGest"

## 🔐 Authentification

### Connexion Email/Password (Par défaut)

Comptes de test inclus :

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `claustre.emmanuel@gmail.com` | `admin123` | Admin |
| `employee@bnbgest.com` | `emp123` | Employé |

### 🆕 Connexion Google OAuth

**Configuration Google Cloud Console requise** - Voir [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md)

1. **Créer un projet Google Cloud**
2. **Configurer OAuth Consent Screen**
3. **Créer OAuth Client ID**
4. **Configurer les variables d'environnement**

**Variables requises (.env.local)** :
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**Générer un secret sécurisé** :
```bash
# Windows PowerShell
.\generate-nextauth-secret.ps1

# Ou batch
.\generate-secret.bat

# Ou manuellement
openssl rand -base64 32
```

**Emails autorisés** (configuré dans `auth.config.ts`) :
- `claustre.emmanuel@gmail.com` ✅
- `employee@bnbgest.com` ✅

📘 **Documentation complète** : [GOOGLE_AUTH_DOCUMENTATION.md](./GOOGLE_AUTH_DOCUMENTATION.md)

---

## 🎯 Navigation

### Pages Principales

| Route | Description | Accès |
|-------|-------------|-------|
| `/` | Page d'accueil | Public |
| `/login` | Connexion | Public |
| `/admin` | Tableau de bord admin | Admin |
| `/calendar` | Calendrier interactif | Admin/Employé |
| `/client` | Espace client | Client |
| `/employee` | Espace employé | Employé |
| `/photos` | Galerie photos | Admin |
| `/upload` | Upload photos (QR) | Public |
| `/upload-video` | Upload vidéos (QR) | Public |
| `/guide/[id]` | Guide vidéo équipement | Public |

### API Routes

- `/api/guides` - Gestion guides vidéo
- `/api/photos` - Upload photos
- `/api/upload-video` - Upload vidéos
- `/api/video/[filename]` - Streaming vidéo
- `/api/network-ip` - Détection IP réseau

---

## 🛠️ Technologies Utilisées

### Frontend
- **Next.js 15.5** - Framework React
- **React 19.2** - Library UI
- **TypeScript 5** - Typage statique
- **Tailwind CSS 4** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Composants & UI
- **FullCalendar** - Calendrier interactif
- **Recharts** - Graphiques
- **QRCode.react** - Génération QR codes
- **jsPDF** - Export PDF
- **React Hook Form** - Formulaires
- **Zod** - Validation

### Backend & Déploiement
- **Vercel** - Hébergement & CI/CD
- **Next.js API Routes** - Backend serverless
- **GitHub** - Version control
- **Cloudinary** - Stockage médias (recommandé)

---

## 📂 Structure du Projet

## Upload de Photos depuis Mobile

L'application inclut une fonctionnalité innovante d'upload de photos depuis mobile via QR code :

### Comment ça marche :
1. Dans le configurateur de propriété (étape 4 - Photos), cliquez sur "Afficher QR"
2. Scannez le QR code avec votre téléphone
3. Sur votre mobile, vous pouvez prendre des photos ou sélectionner depuis la galerie
4. Les photos sont automatiquement ajoutées à votre propriété sur l'ordinateur

### Avantages :
- Photos de meilleure qualité depuis l'appareil photo du téléphone
- Plus pratique que de transférer manuellement les fichiers
- Synchronisation automatique en temps réel
- Interface mobile optimisée

### API Endpoints :
- `POST /api/upload` : Upload d'images depuis mobile
- `GET /api/upload?session=xxx` : Récupération des images uploadées pour une session
