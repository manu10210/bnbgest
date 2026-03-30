# 🚀 Déploiement BNBGest sur Vercel

## Étape 1 : Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Connectez-vous avec **GitHub** (recommandé) ou email

## Étape 2 : Préparer votre code (déjà fait ✅)

Les fichiers suivants ont été créés :
- ✅ `vercel.json` - Configuration Vercel
- ✅ `.vercelignore` - Fichiers à exclure
- ✅ `.env.example` - Variables d'environnement

## Étape 3 : Déployer via Vercel CLI

### Installation de Vercel CLI

```powershell
npm install -g vercel
```

### Connexion à Vercel

```powershell
vercel login
```

### Déploiement

```powershell
# Depuis le dossier BNBGEST
cd C:\Users\claus\BNBGEST

# Déploiement de test
vercel

# Déploiement en production
vercel --prod
```

## Étape 4 : Déployer via GitHub (Recommandé)

### 4.1 Créer un dépôt GitHub

```powershell
# Initialiser Git (si pas déjà fait)
git init
git add .
git commit -m "Initial commit - BNBGest ready for Vercel"

# Créer un nouveau dépôt sur GitHub.com
# Puis :
git remote add origin https://github.com/VOTRE-USERNAME/bnbgest.git
git branch -M main
git push -u origin main
```

### 4.2 Connecter à Vercel

1. Sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Cliquez sur **"Add New Project"**
3. Sélectionnez **"Import Git Repository"**
4. Choisissez votre dépôt **bnbgest**
5. Cliquez sur **"Deploy"**

🎉 **C'est tout !** Vercel détecte automatiquement Next.js et configure tout.

## 🌐 Après le déploiement

Votre app sera disponible sur :
- **URL Vercel** : `https://bnbgest.vercel.app`
- **Domaine personnalisé** : Configurez dans Settings > Domains

## 📱 QR Codes et URL réseau

⚠️ **Important** : Les QR codes utilisant `192.168.1.11` ne fonctionneront que sur votre réseau local.

Pour une utilisation publique :
1. L'app sera déployée sur `https://votre-app.vercel.app`
2. Les QR codes généreront automatiquement l'URL Vercel
3. Accessible de n'importe où avec Internet

## 🔧 Configuration supplémentaire

### Variables d'environnement sur Vercel

1. Dashboard Vercel > Votre projet > **Settings** > **Environment Variables**
2. Ajoutez si nécessaire :
   - `NODE_ENV` = `production`
   - Autres variables spécifiques

### Domaine personnalisé

1. Dashboard > **Settings** > **Domains**
2. Ajoutez votre domaine (ex: `bnbgest.com`)
3. Suivez les instructions DNS

## 📊 Fonctionnalités Vercel incluses

- ✅ **HTTPS automatique** (SSL gratuit)
- ✅ **CDN mondial** (temps de chargement ultra-rapide)
- ✅ **Déploiement automatique** à chaque push Git
- ✅ **Preview deployments** pour chaque branche
- ✅ **Analytics** (optionnel)
- ✅ **Scaling automatique**

## 🆘 Problèmes courants

### Le build échoue
- Vérifiez que `npm run build` fonctionne en local
- Consultez les logs Vercel

### Fichiers manquants (uploads, etc.)
- Vercel est **serverless** - les fichiers uploadés ne persistent pas
- Solution : Utilisez un service de stockage externe :
  - **Cloudinary** (images/vidéos)
  - **AWS S3** ou **Azure Blob Storage**
  - **Vercel Blob** (nouveau service Vercel)

### API routes ne fonctionnent pas
- Vérifiez que les routes sont dans `app/api/`
- Les API routes Next.js fonctionnent nativement sur Vercel

## 📞 Support

- [Documentation Vercel](https://vercel.com/docs)
- [Next.js sur Vercel](https://vercel.com/docs/frameworks/nextjs)
