# 🚀 BNBGest - Guide de Production

**Environnement** : PRODUCTION  
**Date** : 2 Avril 2026  
**URL** : https://bnbgest.vercel.app

---

## ⚠️ IMPORTANT - Environnement Production

Cette application est maintenant en **PRODUCTION**. Toutes les données sont **RÉELLES**.

### ❌ Interdictions Strictes

- **JAMAIS** exécuter `prisma/seed.ts` en production (protection activée)
- **JAMAIS** créer de comptes de test (`employee@bnbgest.com`, etc.)
- **JAMAIS** utiliser de données fictives
- **JAMAIS** faire de tests destructifs sur la DB production

---

## 👤 Compte Administrateur

### Compte Admin Réel
```
Email: claustre.emmanuel@gmail.com
Password: admin123
Role: ADMIN
```

**⚠️ SÉCURITÉ** : Changez le mot de passe admin immédiatement !

### Changer le Mot de Passe Admin

1. Connectez-vous sur https://bnbgest.vercel.app/login
2. Allez dans **Paramètres** → **Profil**
3. Changez votre mot de passe
4. **OU** utilisez ce script :

```typescript
// prisma/change-admin-password.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function changePassword() {
  const newPassword = 'VotreNouveauMotDePasseSécurisé2026!';
  const hashedPassword = await hash(newPassword, 10);
  
  await prisma.user.update({
    where: { email: 'claustre.emmanuel@gmail.com' },
    data: { password: hashedPassword }
  });
  
  console.log('✅ Password changed successfully!');
}

changePassword();
```

---

## 📊 État Actuel de la Base de Données

### Après Nettoyage Production
```
✅ Users: 1 (admin uniquement)
✅ Properties: 0 (prêt pour vraies propriétés)
✅ Bookings: 0 (prêt pour vraies réservations)
✅ Reviews: 0 (prêt pour vrais avis)
```

### Tous les Comptes de Test Supprimés
- ❌ `employee@bnbgest.com` - SUPPRIMÉ
- ❌ Propriétés de test - SUPPRIMÉES
- ❌ Réservations de test - SUPPRIMÉES
- ❌ Données fictives - SUPPRIMÉES

---

## 🔧 Gestion de la Production

### Scripts Disponibles

#### Nettoyage Production (déjà fait)
```powershell
# ⚠️ ATTENTION: Supprime TOUTES les données sauf admin
$env:DATABASE_URL=(Get-Content .env.production | Select-String 'POSTGRES_PRISMA_URL' | ForEach-Object { $_ -replace 'POSTGRES_PRISMA_URL=','' -replace '"','' })
npx tsx prisma/cleanup-production.ts
```

#### Backup de la Base de Données
```bash
# Créer un backup
npx prisma db pull --force --url="POSTGRES_PRISMA_URL"

# OU utiliser Neon Dashboard
# https://console.neon.tech/ → Backups → Create Backup
```

#### Statistiques Production
```bash
curl https://bnbgest.vercel.app/api/db-test
```

---

## 📝 Ajout de Données Réelles

### 1. Créer des Propriétés

**Via l'Interface Web** :
1. Connectez-vous : https://bnbgest.vercel.app/login
2. Menu → **Propriétés** → **Ajouter une propriété**
3. Remplissez les informations réelles
4. Ajoutez des photos via Cloudinary

**Via API** :
```bash
curl -X POST https://bnbgest.vercel.app/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Appartement Paris Centre",
    "description": "Magnifique appartement...",
    "address": "123 Rue de Rivoli",
    "city": "Paris",
    "country": "France",
    "capacity": 4,
    "bedrooms": 2,
    "bathrooms": 1,
    "price": 120.00,
    "userId": "USER_ID"
  }'
```

### 2. Créer des Utilisateurs

**Inviter des Employés** :
1. Menu → **Admin** → **Utilisateurs**
2. **Ajouter un utilisateur**
3. Définir le rôle : EMPLOYEE, MANAGER, ou ADMIN
4. Envoyer l'invitation par email

**Rôles Disponibles** :
- `ADMIN` : Accès total
- `MANAGER` : Gestion propriétés + équipes
- `EMPLOYEE` : Tâches assignées uniquement
- `USER` : Propriétaire de propriétés

### 3. Gérer les Réservations

**Via Calendrier** :
1. Menu → **Calendrier**
2. Cliquez sur une date
3. **Nouvelle réservation**
4. Remplissez les détails du client

**Synchronisation Airbnb/Booking** :
1. Menu → **Paramètres** → **Intégrations**
2. Connectez vos comptes Airbnb/Booking.com
3. Activez la synchronisation automatique

---

## 🔒 Sécurité Production

### Variables d'Environnement

**Vérifier sur Vercel** :
```bash
vercel env ls
```

**Variables Critiques** :
- `NEXTAUTH_SECRET` : Secret pour sessions
- `NEXTAUTH_URL` : https://bnbgest.vercel.app
- `POSTGRES_PRISMA_URL` : Connection DB poolée
- `CLOUDINARY_*` : Credentials Cloudinary

### Recommandations

1. ✅ **Changez le mot de passe admin**
2. ✅ **Activez 2FA** (si disponible)
3. ✅ **Configurez les alertes Vercel**
4. ✅ **Activez les backups automatiques Neon**
5. ✅ **Configurez le rate limiting**

---

## 📈 Monitoring Production

### Health Check
```bash
curl https://bnbgest.vercel.app/api/health
```

**Réponse attendue** :
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "databaseLatency": 200-300,
    "api": true,
    "auth": true
  }
}
```

### Vercel Analytics
- Dashboard : https://vercel.com/claustreemmanuel-4943s-projects/bnbgest
- Analytics → Performance metrics
- Speed Insights → Core Web Vitals

### Logs Production
```bash
vercel logs https://bnbgest.vercel.app --follow
```

---

## 🚨 En Cas de Problème

### Application Down
1. Vérifier : https://bnbgest.vercel.app/api/health
2. Logs : `vercel logs --follow`
3. Redéployer : `vercel --prod`

### Database Issues
1. Vérifier Neon : https://console.neon.tech/
2. Tester connexion : `curl https://bnbgest.vercel.app/api/db-test`
3. Migrations : `npx prisma migrate deploy`

### Erreurs 500
1. Vérifier logs Vercel
2. Vérifier variables d'environnement
3. Vérifier quotas Neon (plan gratuit : limites)

---

## 📞 Support

### Contacts
- **Admin** : claustre.emmanuel@gmail.com
- **Vercel Dashboard** : https://vercel.com/claustreemmanuel-4943s-projects/bnbgest
- **GitHub Issues** : https://github.com/manu10210/bnbgest/issues

### Documentation
- `DEPLOYMENT_SUCCESS.md` : Guide de déploiement complet
- `AMELIORATIONS_POST_DEPLOYMENT.md` : Roadmap améliorations
- `API_DOCUMENTATION.md` : Documentation API
- `README.md` : Guide général

---

## ✅ Checklist Post-Déploiement

### Sécurité
- [ ] Mot de passe admin changé
- [ ] Variables d'environnement vérifiées
- [ ] Backups automatiques configurés
- [ ] Rate limiting activé
- [ ] HTTPS forcé (déjà actif sur Vercel)

### Monitoring
- [ ] Vercel Analytics configuré
- [ ] Alertes erreurs configurées
- [ ] Health checks automatiques (cron job)
- [ ] Logs retention configuré

### Données
- [ ] Base de données nettoyée ✅
- [ ] Première propriété réelle ajoutée
- [ ] Premier client réel créé
- [ ] Intégrations Airbnb/Booking testées

### Utilisateurs
- [ ] Compte admin sécurisé
- [ ] Premiers employés invités
- [ ] Rôles et permissions configurés
- [ ] Formation utilisateurs effectuée

---

## 🎯 Prochaines Étapes

### Immédiat
1. **Changer le mot de passe admin** (PRIORITÉ 1)
2. Ajouter la première propriété réelle
3. Tester toutes les fonctionnalités critiques
4. Inviter les premiers utilisateurs

### Cette Semaine
1. Configurer les intégrations Airbnb/Booking
2. Ajouter toutes les propriétés réelles
3. Former l'équipe sur l'utilisation
4. Configurer les notifications email

### Ce Mois
1. Analyser les métriques d'utilisation
2. Optimiser selon les retours utilisateurs
3. Ajouter fonctionnalités demandées
4. Planifier la roadmap 2026

---

**Dernière mise à jour** : 2 Avril 2026, 20:30  
**Statut** : 🟢 PRODUCTION - DONNÉES RÉELLES UNIQUEMENT  
**Version** : 1.0.1
