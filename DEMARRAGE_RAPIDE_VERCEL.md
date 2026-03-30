# 🚀 Démarrage Rapide - Déploiement Vercel

## ✅ Votre application est prête !

Tous les fichiers de configuration ont été créés automatiquement.

## 🎯 Déployer en 5 minutes (Méthode recommandée)

### Étape 1 : Créer un compte Vercel (2 min)

1. Ouvrez **https://vercel.com/signup**
2. Cliquez sur **"Continue with GitHub"**
3. Autorisez Vercel à accéder à vos dépôts

### Étape 2 : Pousser votre code sur GitHub (1 min)

```powershell
# Si pas encore fait :
git init
git add .
git commit -m "Ready for Vercel deployment"

# Créer un nouveau dépôt sur github.com/new
# Puis :
git remote add origin https://github.com/VOTRE-USERNAME/bnbgest.git
git branch -M main
git push -u origin main
```

### Étape 3 : Importer sur Vercel (1 min)

1. Sur **vercel.com/new**
2. Cliquez **"Import Git Repository"**
3. Sélectionnez votre dépôt **bnbgest**
4. Cliquez **"Deploy"** ✅

### Étape 4 : Attendre le déploiement (1 min)

Vercel va automatiquement :
- ✅ Installer les dépendances (`npm install`)
- ✅ Builder l'application (`npm run build`)
- ✅ Déployer sur le CDN mondial
- ✅ Générer une URL HTTPS

## 🎉 Résultat

Votre app sera accessible sur :
```
https://bnbgest-XXXXX.vercel.app
```

## ⚙️ Configuration Post-Déploiement

### Domaine personnalisé (Optionnel)

1. Dashboard Vercel > **Settings** > **Domains**
2. Ajoutez **bnbgest.com** (ou votre domaine)
3. Configurez les DNS selon les instructions

### Variables d'environnement (Si nécessaire)

1. Dashboard > **Settings** > **Environment Variables**
2. Ajoutez vos variables (ex: clés API)

## ⚠️ Important : Stockage des fichiers

**Problème :** Vercel est serverless - les uploads (photos/vidéos) ne sont pas sauvegardés après redéploiement.

**Solution :** Migrer vers Cloudinary (voir `CLOUDINARY_MIGRATION.md`)

## 📱 QR Codes après déploiement

Les QR codes généreront automatiquement l'URL Vercel :
- Avant : `http://192.168.1.11:3000/guide/abc123`
- Après : `https://bnbgest.vercel.app/guide/abc123`

✅ Accessible depuis n'importe où (pas besoin d'être sur le même WiFi)

## 🆘 Aide

- **Documentation complète :** `DEPLOIEMENT_VERCEL.md`
- **Migration stockage :** `CLOUDINARY_MIGRATION.md`
- **Support Vercel :** https://vercel.com/docs
