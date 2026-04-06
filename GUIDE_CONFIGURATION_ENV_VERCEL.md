# 🔐 Guide de Configuration Variables d'Environnement Vercel

## 📋 Instructions Pas à Pas

### Étape 1 : Accès au Dashboard
✅ **Page ouverte** : https://vercel.com/claustreemmanuel-4943s-projects/bnbgest/settings/environment-variables

### Étape 2 : Ajouter les Variables
Pour chaque variable ci-dessous :
1. Cliquez sur **"Add New"** ou **"Create"**
2. Entrez le **nom** de la variable (exactement comme indiqué)
3. Entrez la **valeur**
4. Sélectionnez **"Production"** comme environnement
5. Cliquez sur **"Save"**

---

## 🔴 VARIABLES CRITIQUES (Ordre de priorité)

### 1. Database PostgreSQL ⚠️ ESSENTIEL
```
Nom: DATABASE_URL
Valeur: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
Environnement: ✓ Production
```
**Où obtenir ?**
- Neon.tech : https://console.neon.tech
- Supabase : https://app.supabase.com
- Vercel Postgres : https://vercel.com/storage/postgres

**Format exemple** :
```
postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

### 2. NextAuth Configuration ⚠️ ESSENTIEL
```
Nom: NEXTAUTH_URL
Valeur: https://bnbgest.vercel.app
Environnement: ✓ Production
```

```
Nom: NEXTAUTH_SECRET
Valeur: [À GÉNÉRER - voir ci-dessous]
Environnement: ✓ Production
```

**Générer NEXTAUTH_SECRET** :
```bash
# Exécutez dans le terminal PowerShell
openssl rand -base64 32

# OU
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 3. Google OAuth ⚠️ REQUIS pour connexion
```
Nom: GOOGLE_CLIENT_ID
Valeur: [Votre Client ID Google]
Environnement: ✓ Production
```

```
Nom: GOOGLE_CLIENT_SECRET
Valeur: [Votre Client Secret Google]
Environnement: ✓ Production
```

**Où obtenir ?**
1. Allez sur : https://console.cloud.google.com/apis/credentials
2. Créez un projet ou sélectionnez-en un
3. Créez des "Identifiants OAuth 2.0"
4. Ajoutez l'URI de redirection :
   ```
   https://bnbgest.vercel.app/api/auth/callback/google
   ```

---

## 🟡 VARIABLES IMPORTANTES (Fortement recommandées)

### 4. Stripe Payment
```
Nom: STRIPE_SECRET_KEY
Valeur: sk_live_... (ou sk_test_... pour test)
Environnement: ✓ Production
```

```
Nom: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Valeur: pk_live_... (ou pk_test_... pour test)
Environnement: ✓ Production
```

```
Nom: STRIPE_WEBHOOK_SECRET
Valeur: whsec_...
Environnement: ✓ Production
```

**Où obtenir ?**
- Dashboard Stripe : https://dashboard.stripe.com/apikeys
- Webhook secret : https://dashboard.stripe.com/webhooks

**Configurer le webhook Stripe** :
- URL : `https://bnbgest.vercel.app/api/stripe/webhook`
- Événements : `payment_intent.succeeded`, `checkout.session.completed`, `charge.refunded`

---

### 5. Email (Resend)
```
Nom: RESEND_API_KEY
Valeur: re_...
Environnement: ✓ Production
```

**Où obtenir ?**
- Dashboard Resend : https://resend.com/api-keys

---

### 6. Cloudinary (Images)
```
Nom: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
Valeur: [Votre cloud name]
Environnement: ✓ Production
```

```
Nom: CLOUDINARY_API_KEY
Valeur: [Votre API key]
Environnement: ✓ Production
```

```
Nom: CLOUDINARY_API_SECRET
Valeur: [Votre API secret]
Environnement: ✓ Production
```

**Où obtenir ?**
- Dashboard Cloudinary : https://console.cloudinary.com/settings

---

## 🟢 VARIABLES OPTIONNELLES

### 7. Airbnb Integration (Optionnel)
```
Nom: AIRBNB_CLIENT_ID
Valeur: [Votre Client ID Airbnb]
Environnement: ✓ Production
```

```
Nom: AIRBNB_CLIENT_SECRET
Valeur: [Votre Client Secret Airbnb]
Environnement: ✓ Production
```

---

## 📊 Checklist de Configuration

### Phase 1 : Minimum Viable (Application démarre)
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `NEXTAUTH_URL` - https://bnbgest.vercel.app
- [ ] `NEXTAUTH_SECRET` - Généré avec openssl/node

### Phase 2 : Authentification (Connexion fonctionne)
- [ ] `GOOGLE_CLIENT_ID` - OAuth Google
- [ ] `GOOGLE_CLIENT_SECRET` - OAuth Google
- [ ] Configured redirect URI in Google Console

### Phase 3 : Paiements (Stripe fonctionne)
- [ ] `STRIPE_SECRET_KEY` - Backend
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Frontend
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhooks
- [ ] Configured webhook endpoint in Stripe

### Phase 4 : Emails (Notifications fonctionnent)
- [ ] `RESEND_API_KEY` - Email sending

### Phase 5 : Images (Upload fonctionne)
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`

### Phase 6 : Intégrations (Optionnel)
- [ ] `AIRBNB_CLIENT_ID`
- [ ] `AIRBNB_CLIENT_SECRET`

---

## 🔄 Après Configuration

### 1. Redéployer (Important!)
Les variables d'environnement ne sont appliquées qu'au prochain déploiement.

**Option A : Via Dashboard**
- Allez dans l'onglet "Deployments"
- Cliquez sur les 3 points du dernier déploiement
- Cliquez "Redeploy"

**Option B : Via CLI**
```bash
vercel --prod
```

### 2. Vérifier les Variables
```bash
# Lister toutes les variables
vercel env ls

# Vérifier une variable spécifique
vercel env pull
```

### 3. Tester l'Application
1. Ouvrez https://bnbgest.vercel.app
2. Testez la connexion Google
3. Vérifiez que la base de données fonctionne
4. Testez une fonctionnalité (création propriété, réservation)

---

## 🚨 Dépannage

### Erreur : "DATABASE_URL is not defined"
**Solution** :
1. Vérifiez que `DATABASE_URL` est bien ajoutée
2. Vérifiez l'environnement = "Production"
3. Redéployez l'application
4. Attendez 1-2 minutes que le déploiement se termine

### Erreur : "NEXTAUTH_URL is not defined"
**Solution** :
1. Ajoutez `NEXTAUTH_URL` = `https://bnbgest.vercel.app`
2. Redéployez

### Connexion Google ne fonctionne pas
**Solution** :
1. Vérifiez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`
2. Vérifiez l'URI de redirection dans Google Console :
   ```
   https://bnbgest.vercel.app/api/auth/callback/google
   ```
3. Redéployez

### Images ne s'uploadent pas
**Solution** :
1. Vérifiez les 3 variables Cloudinary
2. Vérifiez que votre compte Cloudinary est actif
3. Redéployez

---

## 💡 Commandes Utiles

### Générer NEXTAUTH_SECRET
```bash
# PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# OU Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OU OpenSSL
openssl rand -base64 32
```

### Vérifier les Variables
```bash
# Lister
vercel env ls

# Télécharger en local (pour vérification)
vercel env pull .env.local

# Ajouter via CLI
vercel env add VARIABLE_NAME production
```

### Logs en Temps Réel
```bash
vercel logs https://bnbgest.vercel.app --follow
```

---

## 📚 Ressources

### Documentations Officielles
- **Vercel Env Vars** : https://vercel.com/docs/concepts/projects/environment-variables
- **NextAuth.js** : https://next-auth.js.org/configuration/options
- **Prisma** : https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-monorepo
- **Stripe** : https://stripe.com/docs/webhooks/quickstart
- **Cloudinary** : https://cloudinary.com/documentation/node_integration

### Providers Recommandés
- **Database** : Neon.tech (Free tier généreux)
- **Email** : Resend (Free tier 100 emails/jour)
- **Images** : Cloudinary (Free tier 25 GB)
- **Payments** : Stripe (Commission par transaction)

---

## ✅ Validation Finale

Une fois toutes les variables configurées et redéployé :

1. **Test de santé** :
   ```bash
   curl https://bnbgest.vercel.app/api/health
   ```

2. **Test de connexion** :
   - Ouvrez https://bnbgest.vercel.app
   - Cliquez "Se connecter"
   - Testez Google OAuth

3. **Test de base de données** :
   - Créez une propriété
   - Vérifiez qu'elle apparaît dans la liste

4. **Vérifier les logs** :
   - Dashboard Vercel → Onglet "Logs"
   - Recherchez les erreurs

---

## 🎯 Ordre Recommandé de Configuration

**Session 1 (Maintenant - 10 min)** :
1. ✅ DATABASE_URL
2. ✅ NEXTAUTH_URL
3. ✅ NEXTAUTH_SECRET
4. ✅ GOOGLE_CLIENT_ID
5. ✅ GOOGLE_CLIENT_SECRET
6. 🔄 Redéployer
7. ✅ Tester connexion

**Session 2 (Plus tard - 15 min)** :
1. STRIPE_SECRET_KEY
2. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
3. STRIPE_WEBHOOK_SECRET
4. Configurer webhook Stripe
5. Redéployer
6. Tester un paiement

**Session 3 (Optionnel - 10 min)** :
1. RESEND_API_KEY
2. CLOUDINARY vars (x3)
3. AIRBNB vars (si nécessaire)
4. Redéployer
5. Tester emails et images

---

**Besoin d'aide ?** Consultez le fichier `DEPLOYMENT_VERCEL_AVRIL_2026.md` pour plus de détails ! 📖
