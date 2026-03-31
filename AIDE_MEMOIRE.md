# 📋 Aide-Mémoire - Google OAuth

## 🎯 Ce qui a été fait

✅ **Code complet installé et déployé**
- NextAuth.js v5 avec Google OAuth
- Bouton "Continuer avec Google" sur /login
- Sécurité par whitelist d'emails
- Documentation complète (3 guides)
- Scripts de génération de secret

## 🔧 Ce qu'il reste à faire (Configuration)

### Étape 1 : Google Cloud Console
```
URL: https://console.cloud.google.com/

1. Nouveau Projet → "BNBGest"
2. OAuth Consent Screen → External
3. Create OAuth Client ID → Web Application
4. JavaScript Origins:
   - http://localhost:3000
   - https://bnbgest.vercel.app
5. Redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - https://bnbgest.vercel.app/api/auth/callback/google
6. NOTER: Client ID + Client Secret
```

### Étape 2 : Local (.env.local)
```bash
# Générer le secret
.\generate-nextauth-secret.ps1

# Éditer .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret-généré>
GOOGLE_CLIENT_ID=<votre-client-id>
GOOGLE_CLIENT_SECRET=<votre-secret>
```

### Étape 3 : Test
```bash
npm run dev
# → http://localhost:3000/login
# Cliquer "Continuer avec Google"
```

### Étape 4 : Production (Vercel)
```
URL: https://vercel.com/.../settings/environment-variables

Ajouter:
- NEXTAUTH_URL = https://bnbgest.vercel.app
- NEXTAUTH_SECRET = <le même que local>
- GOOGLE_CLIENT_ID = <le même que local>
- GOOGLE_CLIENT_SECRET = <le même que local>

Puis: git push (redéploiement auto)
```

## 📚 Guides Disponibles

| Guide | Utilisation |
|-------|-------------|
| `QUICK_START_GOOGLE_AUTH.md` | ⚡ Configuration en 5 min |
| `GOOGLE_AUTH_SETUP.md` | 📖 Guide complet étape par étape |
| `GOOGLE_AUTH_DOCUMENTATION.md` | 🔧 Documentation technique |

## 🔐 Ajouter un Utilisateur

```typescript
// Fichier: auth.config.ts
const AUTHORIZED_ADMINS = [
  'claustre.emmanuel@gmail.com',
  'employee@bnbgest.com',
  'nouveau@email.com'  // ← Ajouter ici
];

// Puis:
git add auth.config.ts
git commit -m "feat: Add new admin"
git push
```

## 🆘 Dépannage

| Erreur | Solution |
|--------|----------|
| `redirect_uri_mismatch` | Vérifier les URLs dans Google Cloud |
| `Email not authorized` | Ajouter l'email dans `auth.config.ts` |
| `Missing GOOGLE_CLIENT_ID` | Configurer `.env.local` ou Vercel |

## ✅ Checklist Rapide

**Google Cloud Console**
- [ ] Projet créé
- [ ] OAuth Consent configuré
- [ ] Client ID créé
- [ ] Client ID et Secret notés

**Configuration Locale**
- [ ] .env.local édité
- [ ] Secret généré
- [ ] Test réussi (npm run dev)

**Production**
- [ ] Variables Vercel ajoutées
- [ ] git push effectué
- [ ] Test production réussi

---

**Temps total estimé : 5-10 minutes** ⚡
