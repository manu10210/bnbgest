# 🔐 Configuration Google OAuth pour BNBGest

## 📋 Prérequis

Vous aurez besoin d'un compte Google pour créer une application OAuth.

## 🚀 Étape 1 : Créer un Projet Google Cloud

1. **Accédez à la Console Google Cloud**
   - Rendez-vous sur : https://console.cloud.google.com/
   - Connectez-vous avec votre compte Google

2. **Créer un Nouveau Projet**
   - Cliquez sur le menu déroulant du projet (en haut)
   - Cliquez sur "Nouveau Projet"
   - Nom du projet : `BNBGest` (ou le nom de votre choix)
   - Cliquez sur "Créer"

## 🔑 Étape 2 : Configurer l'Écran de Consentement OAuth

1. **Accédez à OAuth Consent Screen**
   - Menu ☰ → APIs & Services → OAuth consent screen
   - URL : https://console.cloud.google.com/apis/credentials/consent

2. **Type d'Utilisateur**
   - Sélectionnez **"External"** (utilisateurs externes)
   - Cliquez sur "Create"

3. **Informations de l'Application**
   - **App name** : `BNBGest`
   - **User support email** : Votre email
   - **Developer contact** : Votre email
   - Cliquez sur "Save and Continue"

4. **Scopes (Portées)**
   - Cliquez sur "Add or Remove Scopes"
   - Sélectionnez :
     - `userinfo.email` (Email)
     - `userinfo.profile` (Profil)
   - Cliquez sur "Update"
   - Cliquez sur "Save and Continue"

5. **Test Users (Utilisateurs de Test)**
   - Ajoutez votre email : `claustre.emmanuel@gmail.com`
   - Ajoutez tout autre email autorisé
   - Cliquez sur "Save and Continue"

6. **Résumé**
   - Vérifiez les informations
   - Cliquez sur "Back to Dashboard"

## 🎫 Étape 3 : Créer les Identifiants OAuth

1. **Accédez à Credentials**
   - Menu ☰ → APIs & Services → Credentials
   - URL : https://console.cloud.google.com/apis/credentials

2. **Créer un OAuth Client ID**
   - Cliquez sur "+ CREATE CREDENTIALS"
   - Sélectionnez "OAuth client ID"

3. **Type d'Application**
   - Application type : **"Web application"**
   - Name : `BNBGest Web Client`

4. **Authorized JavaScript Origins**
   ```
   http://localhost:3000
   https://bnbgest.vercel.app
   ```

5. **Authorized Redirect URIs**
   ```
   http://localhost:3000/api/auth/callback/google
   https://bnbgest.vercel.app/api/auth/callback/google
   ```

6. **Créer**
   - Cliquez sur "Create"
   - ⚠️ **IMPORTANT** : Notez le **Client ID** et le **Client Secret**

## ⚙️ Étape 4 : Configuration Locale (.env.local)

Créez ou modifiez le fichier `.env.local` à la racine du projet :

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super-secret-key-change-in-production-use-openssl-rand-base64-32

# Google OAuth Configuration
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
```

### 🔐 Générer un NEXTAUTH_SECRET Sécurisé

**Option 1 : Avec OpenSSL (Recommandé)**
```bash
openssl rand -base64 32
```

**Option 2 : En ligne**
- https://generate-secret.vercel.app/32

**Option 3 : Avec Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## ☁️ Étape 5 : Configuration Vercel (Production)

### 5.1 Via Dashboard Vercel

1. **Accédez aux Settings**
   - https://vercel.com/claustreemmanuel-4943s-projects/bnbgest/settings/environment-variables

2. **Ajoutez les Variables**

| Name | Value | Environment |
|------|-------|-------------|
| `NEXTAUTH_URL` | `https://bnbgest.vercel.app` | Production |
| `NEXTAUTH_SECRET` | `votre-secret-genere` | Production, Preview, Development |
| `GOOGLE_CLIENT_ID` | `votre-client-id` | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | `votre-client-secret` | Production, Preview, Development |

3. **Redéployez**
   - Vercel détectera les nouvelles variables
   - Ou forcez un redéploiement : `git commit --allow-empty -m "redeploy" && git push`

### 5.2 Via CLI Vercel

```bash
# Ajoutez les variables d'environnement
vercel env add NEXTAUTH_URL production
# Valeur: https://bnbgest.vercel.app

vercel env add NEXTAUTH_SECRET production
# Valeur: votre-secret-genere

vercel env add GOOGLE_CLIENT_ID production
# Valeur: votre-google-client-id

vercel env add GOOGLE_CLIENT_SECRET production
# Valeur: votre-google-client-secret

# Redéployez
vercel --prod
```

## 🧪 Étape 6 : Tester l'Authentification

### En Local (http://localhost:3000)

1. **Démarrez le serveur**
   ```bash
   npm run dev
   ```

2. **Accédez à la page de login**
   - http://localhost:3000/login

3. **Cliquez sur "Continuer avec Google"**
   - Sélectionnez votre compte Google
   - Autorisez l'application
   - Vous devriez être redirigé vers `/admin`

### En Production (https://bnbgest.vercel.app)

1. **Accédez à la page de login**
   - https://bnbgest.vercel.app/login

2. **Cliquez sur "Continuer avec Google"**
   - Sélectionnez votre compte Google
   - Autorisez l'application
   - Vous devriez être redirigé vers `/admin`

## 🔒 Sécurité : Gérer les Emails Autorisés

### Configuration Actuelle

Dans `auth.config.ts`, seuls ces emails sont autorisés :

```typescript
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com'
];
```

### Ajouter un Nouvel Utilisateur

1. **Modifiez `auth.config.ts`**
   ```typescript
   const AUTHORIZED_ADMINS = [
     'claustre.emmanuel@gmail.com',
     'employee@bnbgest.com',
     'nouvel.utilisateur@example.com'  // ← Ajoutez ici
   ];
   ```

2. **Commitez et déployez**
   ```bash
   git add auth.config.ts
   git commit -m "feat: Add new authorized admin"
   git push
   ```

3. **Vérifiez le déploiement**
   - Vercel redéploiera automatiquement
   - Le nouvel utilisateur pourra se connecter

## ⚠️ Troubleshooting

### Erreur : "redirect_uri_mismatch"

**Cause** : L'URL de redirection n'est pas autorisée

**Solution** :
1. Vérifiez que les URLs dans Google Cloud Console correspondent exactement :
   ```
   http://localhost:3000/api/auth/callback/google
   https://bnbgest.vercel.app/api/auth/callback/google
   ```
2. Pas d'espace, pas de `/` à la fin

### Erreur : "Email not authorized"

**Cause** : L'email n'est pas dans `AUTHORIZED_ADMINS`

**Solution** :
1. Ajoutez l'email dans `auth.config.ts`
2. Redéployez

### Erreur : "Configuration manquante"

**Cause** : Variables d'environnement non configurées

**Solution** :
1. Vérifiez `.env.local` en local
2. Vérifiez les variables Vercel en production
3. Redémarrez le serveur local : `npm run dev`

### L'application demande de vérifier l'identité

**Cause** : L'application est en mode "Test" sur Google

**Solution** :
1. Ajoutez les utilisateurs de test dans Google Cloud Console
2. Ou publiez l'application (OAuth Consent Screen → Publish App)

## 📊 Monitoring des Connexions

### Logs NextAuth (Développement)

Ajoutez dans `.env.local` :
```bash
NEXTAUTH_DEBUG=true
```

### Vérifier les Sessions

```typescript
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();
  console.log(session);
  return <div>User: {session?.user?.email}</div>;
}
```

## 🎯 Prochaines Étapes

- [ ] ✅ Configurer Google OAuth
- [ ] 🔄 Tester en local
- [ ] ☁️ Déployer sur Vercel
- [ ] 📧 Ajouter d'autres utilisateurs autorisés
- [ ] 🗄️ (Optionnel) Migrer vers une base de données
- [ ] 📧 (Optionnel) Ajouter d'autres providers (GitHub, Microsoft, etc.)

## 📚 Ressources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)

---

**✅ Configuration terminée !** Vos utilisateurs peuvent maintenant se connecter avec Google.
