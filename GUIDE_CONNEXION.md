# 🔐 Guide de Connexion - BNBGest

## Problème : Redirection vers /login

Si vous êtes redirigé vers la page de connexion quand vous accédez à `/calendar` ou `/admin`, c'est normal ! Ces pages sont **protégées** et nécessitent une authentification.

---

## ✅ Solution : Se Connecter

### Étape 1 : Accéder à la page de connexion

**URL** : http://localhost:3000/login

### Étape 2 : Utiliser les identifiants

Deux comptes sont disponibles par défaut :

#### 👤 **Compte Administrateur** (Accès Complet)
- **Email** : `claustre.emmanuel@gmail.com`
- **Mot de passe** : `admin123`
- **Rôle** : Admin
- **Accès** : Toutes les pages (/admin, /calendar, etc.)

#### 👤 **Compte Employé** (Accès Limité)
- **Email** : `employee@bnbgest.com`
- **Mot de passe** : `emp123`
- **Rôle** : Employé
- **Accès** : Pages employé uniquement

---

## 📋 Pages et Permissions

| Page | URL | Rôle requis |
|------|-----|-------------|
| Accueil | `/` | Aucun (public) |
| Login | `/login` | Aucun (public) |
| Admin Dashboard | `/admin` | **Admin** |
| Calendrier | `/calendar` | **Admin** |
| Photos | `/photos` | **Admin** |
| Client | `/client` | **Admin** |
| Employee | `/employee` | **Admin** |

---

## 🔧 Procédure Complète

### 1. Se Connecter

1. Ouvrir : http://localhost:3000/login
2. Entrer l'email : `claustre.emmanuel@gmail.com`
3. Entrer le mot de passe : `admin123`
4. Cliquer sur "Se connecter"

### 2. Accéder au Calendrier

Une fois connecté :
- **URL directe** : http://localhost:3000/calendar
- **Ou via Admin** : http://localhost:3000/admin → Onglet "Calendrier"

---

## 🛠️ Dépannage

### Problème : "Toujours redirigé vers /login"

**Causes possibles** :

1. **Session expirée**
   - Solution : Reconnectez-vous

2. **localStorage vide**
   - Solution : Ouvrez la console développeur (F12)
   - Allez dans "Application" → "Local Storage"
   - Vérifiez si `bnbgest_user` existe
   - Si absent, reconnectez-vous

3. **Cookie bloqué**
   - Solution : Vérifiez les paramètres du navigateur
   - Autorisez les cookies pour localhost

### Problème : "Mot de passe refusé"

Vérifiez :
- ✅ Email exact : `claustre.emmanuel@gmail.com`
- ✅ Mot de passe exact : `admin123`
- ✅ Pas d'espace avant/après
- ✅ Respectez la casse

### Problème : "Page blanche après connexion"

1. Vérifiez la console (F12)
2. Recherchez les erreurs JavaScript
3. Rafraîchissez la page (Ctrl+R)

---

## 🔍 Vérifier l'État de Connexion

### Méthode 1 : Console Développeur

1. Ouvrez la console (F12)
2. Tapez :
```javascript
JSON.parse(localStorage.getItem('bnbgest_user'))
```
3. Si connecté, vous verrez :
```json
{
  "id": 1,
  "email": "claustre.emmanuel@gmail.com",
  "name": "Emmanuel Claustre",
  "role": "admin",
  "avatar": "EC"
}
```

### Méthode 2 : Interface

- Si connecté : Bouton "Administration" visible en haut à droite
- Si non connecté : Bouton "Connexion" visible

---

## 🚀 Accès Rapide après Connexion

Une fois connecté en tant qu'admin :

### Via la page d'accueil
1. http://localhost:3000
2. Cliquez sur "Administration"
3. Choisissez l'onglet souhaité

### Directement
- Admin : http://localhost:3000/admin
- Calendrier : http://localhost:3000/calendar
- Inventaire : http://localhost:3000/admin (onglet Inventaire)
- Maintenance : http://localhost:3000/admin (onglet Maintenance)

---

## 🔄 Se Déconnecter

Pour tester la connexion :

1. Cliquez sur votre nom en haut à droite (si visible)
2. Ou effacez le localStorage :
```javascript
localStorage.removeItem('bnbgest_user')
```
3. Rechargez la page

---

## 💡 Modification pour Accès Public

Si vous souhaitez rendre le calendrier accessible **sans authentification** :

### Option 1 : Supprimer ProtectedRoute

Modifiez `app/calendar/page.tsx` :

```tsx
'use client';

import InteractiveCalendar from '../../components/InteractiveCalendar';

export default function CalendarPage() {
  return <InteractiveCalendar />;
}
```

### Option 2 : Changer le Rôle Requis

Modifiez `app/calendar/page.tsx` pour permettre tous les rôles :

```tsx
'use client';

import InteractiveCalendar from '../../components/InteractiveCalendar';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function CalendarPage() {
  return (
    <ProtectedRoute requiredRole={undefined}>
      <InteractiveCalendar />
    </ProtectedRoute>
  );
}
```

---

## 📞 Support

### Identifiants de Test

**Admin complet** :
- Email : `claustre.emmanuel@gmail.com`
- Mot de passe : `admin123`

**Employé** :
- Email : `employee@bnbgest.com`
- Mot de passe : `emp123`

### Fichiers Concernés

- Authentification : `contexts/AuthContext.tsx`
- Protection des routes : `components/ProtectedRoute.tsx`
- Page de connexion : `app/login/page.tsx`
- Page calendrier : `app/calendar/page.tsx`

---

**Version** : 1.0  
**Date** : Mars 2026  
**Auteur** : BNBGest Team
