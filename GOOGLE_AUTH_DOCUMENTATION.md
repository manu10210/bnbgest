# 🔐 Authentification Google OAuth - Documentation Complète

## 📋 Vue d'Ensemble

BNBGest intègre maintenant **Google OAuth** pour une connexion sécurisée et professionnelle. Les utilisateurs peuvent se connecter via :

1. **Email/Password classique** (méthode existante)
2. **Google OAuth** (nouvelle méthode - connexion en 1 clic)

---

## ✅ Fichiers Créés/Modifiés

### Nouveaux Fichiers

| Fichier | Description |
|---------|-------------|
| `auth.config.ts` | Configuration NextAuth (providers, callbacks, sécurité) |
| `auth.ts` | Exports NextAuth (handlers, signIn, signOut, auth) |
| `app/api/auth/[...nextauth]/route.ts` | API Route pour NextAuth |
| `types/next-auth.d.ts` | Types TypeScript pour NextAuth |
| `components/AuthSessionProvider.tsx` | Provider de session NextAuth |
| `GOOGLE_AUTH_SETUP.md` | **Guide complet de configuration** |

### Fichiers Modifiés

| Fichier | Modifications |
|---------|---------------|
| `app/login/page.tsx` | Ajout du bouton "Continuer avec Google" |
| `app/layout.tsx` | Ajout de `AuthSessionProvider` |
| `.env.example` | Ajout des variables Google OAuth |
| `.env.local` | Configuration locale (à personnaliser) |
| `package.json` | Ajout de `next-auth@beta` |

---

## 🔑 Configuration Requise

### 1. Variables d'Environnement Locales (`.env.local`)

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super-secret-key-change-this
GOOGLE_CLIENT_ID=votre-client-id
GOOGLE_CLIENT_SECRET=votre-client-secret
```

### 2. Variables d'Environnement Vercel (Production)

Sur https://vercel.com/claustreemmanuel-4943s-projects/bnbgest/settings/environment-variables

| Variable | Valeur Production | Environnements |
|----------|-------------------|----------------|
| `NEXTAUTH_URL` | `https://bnbgest.vercel.app` | Production |
| `NEXTAUTH_SECRET` | `secret-généré-avec-openssl` | Production, Preview, Development |
| `GOOGLE_CLIENT_ID` | `votre-client-id` | Production, Preview, Development |
| `GOOGLE_CLIENT_SECRET` | `votre-client-secret` | Production, Preview, Development |

---

## 🚀 Guide de Configuration (Étapes Rapides)

### Étape 1 : Google Cloud Console

1. **Créer un projet Google Cloud**
   - https://console.cloud.google.com/
   - Nouveau Projet → `BNBGest`

2. **Configurer OAuth Consent Screen**
   - Type : External
   - App name : `BNBGest`
   - Scopes : `userinfo.email`, `userinfo.profile`
   - Test users : `claustre.emmanuel@gmail.com`

3. **Créer OAuth Client ID**
   - Type : Web Application
   - JavaScript Origins :
     ```
     http://localhost:3000
     https://bnbgest.vercel.app
     ```
   - Redirect URIs :
     ```
     http://localhost:3000/api/auth/callback/google
     https://bnbgest.vercel.app/api/auth/callback/google
     ```

4. **Noter les clés**
   - Client ID : `123456789-abc...apps.googleusercontent.com`
   - Client Secret : `GOCSPX-abc...`

### Étape 2 : Configuration Locale

```bash
# Copier le fichier d'exemple
cp .env.example .env.local

# Éditer .env.local avec vos clés Google
```

### Étape 3 : Configuration Vercel

```bash
# Via CLI
vercel env add NEXTAUTH_URL production
# Valeur: https://bnbgest.vercel.app

vercel env add NEXTAUTH_SECRET production
# Valeur: $(openssl rand -base64 32)

vercel env add GOOGLE_CLIENT_ID production
# Valeur: votre-client-id

vercel env add GOOGLE_CLIENT_SECRET production
# Valeur: votre-client-secret
```

---

## 🎨 Interface Utilisateur

### Page de Login (`/login`)

**Avant (Email/Password uniquement)**
```
┌────────────────────────────┐
│ Email    [              ] │
│ Password [              ] │
│ [   Se connecter        ] │
└────────────────────────────┘
```

**Après (Email/Password + Google)**
```
┌────────────────────────────┐
│ Email    [              ] │
│ Password [              ] │
│ [   Se connecter        ] │
│ ──────────── OU ──────────│
│ [ 🔵 Continuer avec      ] │
│ [    Google             ] │
└────────────────────────────┘
```

### Bouton Google

- Design élégant avec logo Google coloré
- Animation au survol (scale + shadow)
- États : Normal, Hover, Loading, Disabled

---

## 🔒 Sécurité

### Liste Blanche des Emails

Dans `auth.config.ts` :

```typescript
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com'
];
```

**Comportement** :
- ✅ Si l'email est dans la liste → Connexion autorisée
- ❌ Si l'email n'est pas dans la liste → "Email not authorized"

### Ajouter un Nouvel Utilisateur

1. **Modifier `auth.config.ts`**
   ```typescript
   const AUTHORIZED_ADMINS = [
     'claustre.emmanuel@gmail.com',
     'employee@bnbgest.com',
     'nouveau@example.com'  // ← Ajouter ici
   ];
   ```

2. **Déployer**
   ```bash
   git add auth.config.ts
   git commit -m "feat: Add new authorized admin"
   git push
   ```

---

## 🧪 Tests

### Test Local (http://localhost:3000)

```bash
# 1. Démarrer le serveur
npm run dev

# 2. Ouvrir le navigateur
http://localhost:3000/login

# 3. Cliquer sur "Continuer avec Google"
# 4. Sélectionner votre compte Google
# 5. Autoriser l'application
# 6. Redirection vers /admin
```

### Test Production (https://bnbgest.vercel.app)

```bash
# 1. Ouvrir le navigateur
https://bnbgest.vercel.app/login

# 2. Cliquer sur "Continuer avec Google"
# 3. Sélectionner votre compte Google
# 4. Autoriser l'application
# 5. Redirection vers /admin
```

---

## 📊 Architecture Technique

### Flow d'Authentification Google

```
┌──────────┐     ┌──────────┐     ┌────────┐     ┌─────────┐
│  Client  │────▶│  NextAuth│────▶│ Google │────▶│   App   │
│  (User)  │     │   API    │     │  OAuth │     │ (Admin) │
└──────────┘     └──────────┘     └────────┘     └─────────┘
     │                │                 │              │
     │  Click Google  │                 │              │
     ├───────────────▶│                 │              │
     │                │  Redirect       │              │
     │                ├────────────────▶│              │
     │                │                 │              │
     │                │  User Login     │              │
     │                │◀────────────────┤              │
     │                │                 │              │
     │                │  Auth Code      │              │
     │                ├────────────────▶│              │
     │                │                 │              │
     │                │  Access Token   │              │
     │                │◀────────────────┤              │
     │                │                 │              │
     │                │  Check Email    │              │
     │                ├─────────────────┼─────────────▶│
     │                │                 │              │
     │  Redirect      │                 │              │
     │  to /admin     │                 │              │
     │◀───────────────┴─────────────────┴──────────────┘
```

### Callbacks NextAuth

| Callback | Description | Action |
|----------|-------------|--------|
| `signIn` | Après connexion Google | Vérifier si email dans `AUTHORIZED_ADMINS` |
| `jwt` | Création du token JWT | Ajouter `role`, `id`, `provider` au token |
| `session` | Création de la session | Transférer `role`, `id`, `provider` à la session |

---

## 🛠️ Dépannage

### Erreur : "redirect_uri_mismatch"

**Cause** : URL de redirection non autorisée

**Solution** :
1. Vérifier Google Cloud Console → Credentials
2. Ajouter exactement :
   - `http://localhost:3000/api/auth/callback/google`
   - `https://bnbgest.vercel.app/api/auth/callback/google`
3. Pas d'espace, pas de `/` final

### Erreur : "Email not authorized"

**Cause** : Email non dans `AUTHORIZED_ADMINS`

**Solution** :
1. Ajouter l'email dans `auth.config.ts`
2. Git commit + push

### Erreur : "Missing GOOGLE_CLIENT_ID"

**Cause** : Variables d'environnement non configurées

**Solution** :
- **Local** : Vérifier `.env.local`
- **Production** : Vérifier variables Vercel

### L'application demande la vérification

**Cause** : App en mode "Test" sur Google

**Solution** :
1. **Option A** : Ajouter les utilisateurs de test
2. **Option B** : Publier l'app (OAuth Consent → Publish)

---

## 📈 Métriques et Monitoring

### Vérifier les Sessions

```typescript
// Dans n'importe quel composant Server
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();
  
  console.log({
    user: session?.user?.email,
    role: session?.user?.role,
    provider: session?.user?.provider, // 'google' ou 'credentials'
  });
}
```

### Logs de Débogage (Local)

Ajouter dans `.env.local` :
```bash
NEXTAUTH_DEBUG=true
```

---

## 🎯 Prochaines Améliorations Possibles

### Court Terme
- [ ] Migration vers une base de données (PostgreSQL, MongoDB)
- [ ] Stockage persistant des utilisateurs
- [ ] Rôles dynamiques (admin, employee, client)

### Moyen Terme
- [ ] Support multi-providers (GitHub, Microsoft, Facebook)
- [ ] Authentification à deux facteurs (2FA)
- [ ] Journaux d'audit (qui s'est connecté quand)

### Long Terme
- [ ] SSO (Single Sign-On) pour entreprises
- [ ] Gestion avancée des permissions
- [ ] Dashboard d'administration des utilisateurs

---

## 📚 Ressources

| Ressource | URL |
|-----------|-----|
| NextAuth.js Documentation | https://next-auth.js.org/ |
| Google Cloud Console | https://console.cloud.google.com/ |
| NextAuth.js Google Provider | https://next-auth.js.org/providers/google |
| Vercel Environment Variables | https://vercel.com/docs/environment-variables |
| Guide Configuration (Ce Projet) | `GOOGLE_AUTH_SETUP.md` |

---

## ✅ Checklist de Déploiement

### Configuration Google Cloud
- [ ] Projet créé sur Google Cloud
- [ ] OAuth Consent Screen configuré
- [ ] OAuth Client ID créé
- [ ] JavaScript Origins ajoutées
- [ ] Redirect URIs ajoutées
- [ ] Client ID et Secret notés

### Configuration Locale
- [ ] `.env.local` créé
- [ ] `NEXTAUTH_URL` configuré
- [ ] `NEXTAUTH_SECRET` généré
- [ ] `GOOGLE_CLIENT_ID` ajouté
- [ ] `GOOGLE_CLIENT_SECRET` ajouté
- [ ] Test local réussi

### Configuration Production (Vercel)
- [ ] Variables ajoutées sur Vercel Dashboard
- [ ] `NEXTAUTH_URL` = `https://bnbgest.vercel.app`
- [ ] `NEXTAUTH_SECRET` configuré
- [ ] `GOOGLE_CLIENT_ID` configuré
- [ ] `GOOGLE_CLIENT_SECRET` configuré
- [ ] Redéploiement effectué
- [ ] Test production réussi

### Sécurité
- [ ] Liste `AUTHORIZED_ADMINS` à jour
- [ ] `.env.local` dans `.gitignore`
- [ ] Secrets jamais commités sur Git

---

**✅ Authentification Google OAuth configurée avec succès !**

🔗 **Production** : https://bnbgest.vercel.app/login  
📖 **Guide Complet** : `GOOGLE_AUTH_SETUP.md`  
🔑 **Config** : `.env.local` (local) / Vercel Dashboard (production)

---

*Dernière mise à jour : 30 Mars 2026*
