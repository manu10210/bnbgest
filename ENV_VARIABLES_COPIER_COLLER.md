# 📋 Variables d'Environnement - Valeurs à Copier-Coller

**Date de génération** : 6 avril 2026

---

## ✅ VALEURS PRÊTES À COPIER

### 1. NEXTAUTH_URL
```
https://bnbgest.vercel.app
```

### 2. NEXTAUTH_SECRET (GÉNÉRÉ)
```
q5tYQH8VQYCuygVxxQmJjlO4W0vqTF+aD29xuQ4xeZQ=
```

---

## 📝 TEMPLATE POUR LES AUTRES VARIABLES

### 3. DATABASE_URL (À OBTENIR)
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

**Providers recommandés** :
- **Neon.tech** : https://console.neon.tech
  - Free tier : Generous
  - Setup : 2 minutes
  
- **Supabase** : https://app.supabase.com
  - Free tier : 500MB
  - Bonus : Includes Auth & Storage

- **Vercel Postgres** : https://vercel.com/storage/postgres
  - Integration directe Vercel
  - Free tier : 256MB

**Format attendu** :
```
postgresql://neondb_owner:npg_abc123@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

### 4. GOOGLE_CLIENT_ID (À OBTENIR)
**Étapes** :
1. Allez sur : https://console.cloud.google.com/apis/credentials
2. Créez un nouveau projet ou sélectionnez-en un
3. Cliquez "Create Credentials" → "OAuth client ID"
4. Type : "Web application"
5. Authorized redirect URIs : **IMPORTANT !**
   ```
   https://bnbgest.vercel.app/api/auth/callback/google
   ```
6. Copiez le Client ID

**Format** :
```
123456789-abcdefghijklmnop.apps.googleusercontent.com
```

---

### 5. GOOGLE_CLIENT_SECRET (À OBTENIR)
**Même page que GOOGLE_CLIENT_ID**

Après avoir créé les credentials OAuth, vous obtenez :
- Client ID
- Client Secret ← Copiez celui-ci

**Format** :
```
GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
```

---

## 🟡 VARIABLES IMPORTANTES (Phase 2)

### STRIPE_SECRET_KEY
**Où obtenir** : https://dashboard.stripe.com/apikeys

**Format** :
```
sk_test_... (mode test)
sk_live_... (mode production)
```

⚠️ **Commencez avec sk_test_** pour tester sans risque

---

### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
**Même page** : https://dashboard.stripe.com/apikeys

**Format** :
```
pk_test_... (mode test)
pk_live_... (mode production)
```

⚠️ Utilisez la **pk_test_** qui correspond à votre **sk_test_**

---

### STRIPE_WEBHOOK_SECRET
**Où configurer** : https://dashboard.stripe.com/webhooks

**Étapes** :
1. Cliquez "Add endpoint"
2. URL : `https://bnbgest.vercel.app/api/stripe/webhook`
3. Événements à écouter :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `charge.refunded`
4. Cliquez "Add endpoint"
5. Copiez le "Signing secret"

**Format** :
```
whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
```

---

### RESEND_API_KEY
**Où obtenir** : https://resend.com/api-keys

**Étapes** :
1. Créez un compte sur Resend (gratuit)
2. Allez dans "API Keys"
3. Créez une nouvelle clé
4. Copiez-la (elle ne sera affichée qu'une fois)

**Format** :
```
re_AbCdEfGh_IjKlMnOpQrStUvWxYz1234567890
```

**Free tier** : 100 emails/jour

---

## 🟢 VARIABLES OPTIONNELLES (Phase 3)

### CLOUDINARY (3 variables)

**Où obtenir** : https://console.cloudinary.com/settings

#### NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
```
votre-cloud-name
```

#### CLOUDINARY_API_KEY
```
123456789012345
```

#### CLOUDINARY_API_SECRET
```
AbCdEfGhIjKlMnOpQrStUvWxYz
```

---

### AIRBNB (Optionnel)

Ces variables ne sont nécessaires que si vous utilisez l'intégration Airbnb.

#### AIRBNB_CLIENT_ID
```
[À obtenir auprès de Airbnb Partner API]
```

#### AIRBNB_CLIENT_SECRET
```
[À obtenir auprès de Airbnb Partner API]
```

---

## 📋 CHECKLIST DE VÉRIFICATION

### Avant de commencer
- [ ] Dashboard Vercel ouvert
- [ ] Page "Environment Variables" affichée
- [ ] Ce fichier ouvert à côté pour copier-coller

### Phase 1 - Critiques (5 variables)
- [ ] `NEXTAUTH_URL` ajouté et sauvegardé
- [ ] `NEXTAUTH_SECRET` ajouté et sauvegardé
- [ ] Account créé sur Neon/Supabase/Vercel Postgres
- [ ] `DATABASE_URL` ajouté et sauvegardé
- [ ] Credentials Google OAuth créés
- [ ] URI de redirection Google configuré
- [ ] `GOOGLE_CLIENT_ID` ajouté et sauvegardé
- [ ] `GOOGLE_CLIENT_SECRET` ajouté et sauvegardé

### Phase 2 - Importantes (4 variables)
- [ ] Account Stripe créé (mode test OK)
- [ ] `STRIPE_SECRET_KEY` ajouté (sk_test_)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ajouté (pk_test_)
- [ ] Webhook Stripe configuré
- [ ] `STRIPE_WEBHOOK_SECRET` ajouté
- [ ] Account Resend créé
- [ ] `RESEND_API_KEY` ajouté

### Phase 3 - Optionnelles
- [ ] Account Cloudinary créé (si upload images)
- [ ] 3 variables Cloudinary ajoutées
- [ ] Airbnb API access (si intégration nécessaire)
- [ ] 2 variables Airbnb ajoutées

### Après configuration
- [ ] Toutes les variables sauvegardées
- [ ] Redéploiement lancé (Deployments → Redeploy)
- [ ] Déploiement terminé (2-3 minutes)
- [ ] Application testée : https://bnbgest.vercel.app
- [ ] Connexion Google testée
- [ ] Logs Vercel vérifiés (pas d'erreurs)

---

## 🚨 RAPPELS IMPORTANTS

### Sécurité
❌ **NE JAMAIS** :
- Commiter les secrets dans Git
- Partager les secrets publiquement
- Utiliser les mêmes secrets en dev et prod

✅ **TOUJOURS** :
- Utiliser des variables d'environnement
- Régénérer les secrets si exposés
- Utiliser sk_test_ en développement

### Environnement Vercel
⚠️ Sélectionnez **"Production"** pour chaque variable

⚠️ Les variables ne sont appliquées qu'après **Redéploiement**

### Format des URLs
✅ Bon : `https://bnbgest.vercel.app`
❌ Mauvais : `https://bnbgest.vercel.app/` (slash final)
❌ Mauvais : `http://bnbgest.vercel.app` (http au lieu de https)

---

## 💡 TIPS

### Copy-paste efficace
1. Double-cliquez sur la valeur pour la sélectionner
2. Ctrl+C pour copier
3. Dans Vercel, Ctrl+V pour coller
4. Vérifiez qu'il n'y a pas d'espaces avant/après

### Vérifier les variables
```bash
# Dans le terminal local
vercel env ls

# Télécharger pour vérification (ne pas commiter!)
vercel env pull .env.local
```

### Tester localement d'abord
Créez un fichier `.env.local` en local avec toutes les variables, testez que tout fonctionne, puis ajoutez-les dans Vercel.

---

## 🆘 Besoin d'aide ?

**Guide détaillé** : `GUIDE_CONFIGURATION_ENV_VERCEL.md`
**Documentation déploiement** : `DEPLOYMENT_VERCEL_AVRIL_2026.md`
**Documentation Vercel** : https://vercel.com/docs/concepts/projects/environment-variables

---

**Dernière mise à jour** : 6 avril 2026
**NEXTAUTH_SECRET généré le** : 6 avril 2026, copié dans le presse-papier
