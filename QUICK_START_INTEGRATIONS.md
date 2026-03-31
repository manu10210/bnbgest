# 🚀 Guide de Démarrage Rapide - Intégrations Airbnb & Booking

## ⚡ Configuration en 5 Minutes

### 📋 Prérequis
- ✅ Application BNBGest installée et fonctionnelle
- ✅ Compte Airbnb avec annonce(s) publiée(s)
- ✅ Compte Booking.com Extranet (pour API)

---

## 🏠 ÉTAPE 1 : Configurer Airbnb (iCal)

### 1.1 Obtenir votre URL iCal

1. **Connectez-vous à Airbnb**
   - Allez sur https://www.airbnb.fr
   - Connectez-vous avec votre compte hôte

2. **Accédez à votre annonce**
   - Cliquez sur "Annonces"
   - Sélectionnez l'annonce à synchroniser

3. **Exportez le calendrier**
   - Cliquez sur "Calendrier"
   - Cherchez "Exporter le calendrier" (souvent en bas de page)
   - Cliquez sur "Exporter le calendrier"
   - **Copiez l'URL** qui ressemble à :
     ```
     https://www.airbnb.com/calendar/ical/123456789.ics
     ```

### 1.2 Configurer dans BNBGest

1. **Accédez aux intégrations**
   ```
   http://localhost:3000/settings/integrations
   ```

2. **Activez Airbnb**
   - Cliquez sur le toggle à côté de "Airbnb"
   - Le formulaire apparaît

3. **Collez l'URL iCal**
   - Dans le champ "URL iCal"
   - Collez l'URL copiée précédemment

4. **Testez la connexion**
   - Cliquez sur "Tester la connexion"
   - Attendez le message "✅ Connexion Airbnb réussie !"

5. **Sauvegardez**
   - Cliquez sur "Sauvegarder les paramètres"

✅ **Airbnb configuré !** Les réservations seront synchronisées automatiquement.

---

## 🏨 ÉTAPE 2 : Configurer Booking.com (API XML)

### 2.1 Obtenir vos credentials Booking.com

1. **Connectez-vous à Booking.com Extranet**
   - Allez sur https://admin.booking.com
   - Connectez-vous avec votre compte

2. **Demandez l'accès API**
   - Allez dans "Connectivity" > "API Access"
   - OU cherchez "XML API" dans la recherche
   - Remplissez le formulaire de demande d'accès
   - **⚠️ Important** : L'activation peut prendre 2-5 jours ouvrables

3. **Récupérez vos credentials** (une fois approuvé)
   - **Hotel ID** : Identifiant unique de votre établissement
   - **Username** : Nom d'utilisateur API
   - **Password** : Mot de passe API

### 2.2 Configurer dans BNBGest

1. **Accédez aux intégrations**
   ```
   http://localhost:3000/settings/integrations
   ```

2. **Activez Booking.com**
   - Cliquez sur le toggle à côté de "Booking.com"
   - Le formulaire apparaît

3. **Entrez vos credentials**
   - **Hotel ID** : Votre identifiant d'établissement
   - **Username** : Votre username API
   - **Password** : Votre mot de passe API

4. **Testez la connexion**
   - Cliquez sur "Tester la connexion"
   - Attendez le message "✅ Connexion Booking réussie !"

5. **Sauvegardez**
   - Cliquez sur "Sauvegarder les paramètres"

✅ **Booking.com configuré !** Les réservations seront synchronisées automatiquement.

---

## 🔄 ÉTAPE 3 : Synchronisation Automatique

### Configuration du Cron Job (Vercel)

Si vous utilisez **Vercel** pour l'hébergement :

1. **Éditez `vercel.json`** à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/integrations/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

2. **Déployez sur Vercel**
   ```bash
   git add vercel.json
   git commit -m "feat: Add automatic integration sync cron job"
   git push
   ```

3. **Vérifiez dans le dashboard Vercel**
   - Allez dans votre projet Vercel
   - Section "Cron Jobs"
   - Vous devriez voir le job configuré

✅ **Synchronisation automatique activée !** Les réservations seront récupérées toutes les heures.

### Synchronisation Manuelle

Pour tester la synchronisation manuellement :

```bash
# Via curl
curl http://localhost:3000/api/integrations/sync

# Via navigateur
http://localhost:3000/api/integrations/sync
```

---

## 🧪 ÉTAPE 4 : Vérifier que ça Fonctionne

### Test Airbnb

1. **Créez une réservation test sur Airbnb**
   - Bloquez quelques dates sur votre calendrier Airbnb

2. **Synchronisez**
   ```bash
   curl http://localhost:3000/api/integrations/airbnb/calendar \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"icalUrl":"VOTRE_URL_ICAL"}'
   ```

3. **Vérifiez la réponse**
   ```json
   {
     "success": true,
     "reservations": [...],
     "count": 1
   }
   ```

### Test Booking.com

1. **Créez une réservation test sur Booking.com**

2. **Synchronisez**
   ```bash
   curl http://localhost:3000/api/integrations/booking/reservations \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "credentials": {
         "hotelId": "VOTRE_HOTEL_ID",
         "username": "VOTRE_USERNAME",
         "password": "VOTRE_PASSWORD"
       }
     }'
   ```

3. **Vérifiez la réponse**
   ```json
   {
     "success": true,
     "reservations": [...],
     "count": 1
   }
   ```

---

## 📊 Que se passe-t-il après la synchronisation ?

### Données récupérées

**Depuis Airbnb (iCal)** :
- ✅ Dates de check-in et check-out
- ✅ Nom du client (si disponible dans iCal)
- ✅ Dates bloquées
- ⚠️ Prix non disponible (limitation iCal)
- ⚠️ Nombre de personnes non disponible (limitation iCal)

**Depuis Booking.com (API)** :
- ✅ Dates de check-in et check-out
- ✅ Nom du client complet
- ✅ Nombre de personnes
- ✅ Prix total de la réservation
- ✅ Statut de la réservation
- ✅ ID de réservation Booking

### Où sont stockées les données ?

Actuellement, les réservations sont **récupérées mais pas encore sauvegardées** en base de données.

**Pour les sauvegarder**, vous devez :

1. **Ajouter une base de données** (ex: PostgreSQL, MySQL, MongoDB)
2. **Créer une table `external_reservations`**
3. **Modifier les API routes** pour sauvegarder les données

Consultez la documentation complète dans `INTEGRATIONS_AIRBNB_BOOKING.md` section "Sauvegarde en Base de Données".

---

## 🛠️ Dépannage

### ❌ Erreur "Failed to parse iCal URL" (Airbnb)

**Causes possibles** :
- URL iCal invalide ou expirée
- Problème de connexion internet
- Calendrier Airbnb non publié

**Solutions** :
1. Vérifiez que l'URL commence par `https://www.airbnb.com/calendar/ical/`
2. Testez l'URL dans votre navigateur (vous devriez télécharger un fichier .ics)
3. Régénérez l'URL iCal depuis Airbnb

### ❌ Erreur "Connection failed" (Booking.com)

**Causes possibles** :
- Credentials incorrects
- Accès API pas encore activé
- Hotel ID invalide

**Solutions** :
1. Vérifiez vos credentials dans Booking.com Extranet
2. Attendez l'activation de l'API (2-5 jours après demande)
3. Contactez le support Booking.com si problème persiste

### ❌ Pas de réservations trouvées

**Causes possibles** :
- Pas de réservations dans la période (6 mois à venir)
- Calendrier non synchronisé
- Problème d'API

**Solutions** :
1. Créez une réservation test pour vérifier
2. Attendez quelques minutes et réessayez
3. Vérifiez les logs dans la console

---

## 📚 Documentation Complète

Pour aller plus loin :

📖 **INTEGRATIONS_AIRBNB_BOOKING.md** - Documentation complète
- Architecture technique
- Code examples avancés
- Sauvegarde en base de données
- Gestion des conflits
- Sécurité et best practices

---

## 🎉 C'est Tout !

Votre système d'intégration Airbnb & Booking.com est maintenant opérationnel !

**Synchronisation automatique** : Toutes les heures  
**Réservations** : Importées automatiquement  
**Conflits** : Évités automatiquement  

**Bon courage ! 🚀**
