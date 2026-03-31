# 🚀 Démarrage Rapide - Google OAuth

## ⚡ Configuration en 5 Minutes

### 1. Google Cloud Console (3 min)

```
1. Allez sur https://console.cloud.google.com/
2. Créer un projet "BNBGest"
3. OAuth Consent Screen → External → Save
4. Credentials → Create OAuth Client ID → Web Application
5. Ajouter ces URLs:

   JavaScript Origins:
   • http://localhost:3000
   • https://bnbgest.vercel.app

   Redirect URIs:
   • http://localhost:3000/api/auth/callback/google
   • https://bnbgest.vercel.app/api/auth/callback/google

6. COPIER le Client ID et Client Secret
```

### 2. Configuration Locale (1 min)

```bash
# Éditer .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-genere
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-secret

# Générer le secret
.\generate-nextauth-secret.ps1
```

### 3. Test Local (30 sec)

```bash
npm run dev
# Ouvrir http://localhost:3000/login
# Cliquer "Continuer avec Google"
```

### 4. Configuration Vercel (1 min)

```bash
# Dashboard Vercel → Settings → Environment Variables
# Ajouter les 4 variables:
NEXTAUTH_URL = https://bnbgest.vercel.app
NEXTAUTH_SECRET = (le même que local)
GOOGLE_CLIENT_ID = (le même que local)
GOOGLE_CLIENT_SECRET = (le même que local)

# Redéployer
git commit --allow-empty -m "config: Google OAuth" && git push
```

## ✅ C'est Fait !

🎉 Votre authentification Google est maintenant active !

- 🏠 Local : http://localhost:3000/login
- ☁️ Production : https://bnbgest.vercel.app/login

## 🆘 Besoin d'aide ?

📘 Guide détaillé : `GOOGLE_AUTH_SETUP.md`
📘 Documentation : `GOOGLE_AUTH_DOCUMENTATION.md`

## 🔐 Ajouter un Utilisateur

```typescript
// Éditer auth.config.ts
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com',
  'nouveau@example.com'  // ← Ajouter ici
];

// Commit et push
git add auth.config.ts
git commit -m "feat: Add new admin"
git push
```

---

**Prêt à utiliser Google OAuth ! 🚀**
