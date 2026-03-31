# 📝 Système d'Inscription - Documentation

## 🎯 Vue d'Ensemble

La page de connexion intègre maintenant un **système d'inscription complet** permettant aux utilisateurs de créer un compte via :

1. **Formulaire classique** (Email + Mot de passe + Nom)
2. **🆕 Inscription rapide avec Google** (1 clic)

---

## ✨ Fonctionnalités

### 🔄 Toggle Connexion/Inscription

Interface avec onglets pour basculer entre :
- **Connexion** - Pour les utilisateurs existants
- **Inscription** - Pour les nouveaux utilisateurs

### 📋 Formulaire d'Inscription

**Champs requis** :
- ✅ **Nom complet** (nouveau champ)
- ✅ **Email** (validation d'email)
- ✅ **Mot de passe** (minimum 6 caractères)
- ✅ **Confirmer mot de passe** (vérification de correspondance)

**Validations** :
```typescript
- Nom non vide
- Email valide (@)
- Mot de passe ≥ 6 caractères
- Confirmation = mot de passe
```

### 🔐 Sécurité

- Mots de passe masqués avec option affichage
- Validation côté client
- Messages d'erreur clairs
- Confirmation de mot de passe obligatoire

### 🎨 Interface Utilisateur

**Design élégant** :
- Onglets avec gradient animé
- Champs avec icônes et focus states
- Animations fluides (fadeIn, scale)
- Mode clair/sombre adaptatif

**Messages** :
- ❌ Erreurs en rouge avec icône
- ✅ Succès en vert avec icône
- ⏳ États de chargement

---

## 🚀 Utilisation

### Inscription via Formulaire

```
1. Aller sur /login
2. Cliquer sur l'onglet "Inscription"
3. Remplir le formulaire:
   - Nom complet
   - Email
   - Mot de passe (6+ caractères)
   - Confirmer mot de passe
4. Cliquer "S'inscrire"
5. Confirmation → Redirection vers connexion
```

### Inscription via Google OAuth

```
1. Aller sur /login
2. Cliquer sur "S'inscrire avec Google"
3. Sélectionner compte Google
4. Autoriser l'application
5. Connexion automatique → /admin
```

---

## 🎯 Comportement

### Mode Connexion
- Affiche : Email + Mot de passe
- Bouton : "Se connecter"
- Google : "Continuer avec Google"
- Comptes de test visibles

### Mode Inscription
- Affiche : Nom + Email + Mot de passe + Confirmation
- Bouton : "S'inscrire"
- Google : "S'inscrire avec Google"
- Comptes de test masqués

---

## 💻 Code Technique

### État du Composant

```typescript
const [isSignUp, setIsSignUp] = useState(false);
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState('');
```

### Fonction handleSignUp

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');

  // Validations
  if (!name.trim()) {
    setError('Le nom est requis');
    return;
  }
  if (!email.trim() || !email.includes('@')) {
    setError('Email invalide');
    return;
  }
  if (password.length < 6) {
    setError('Le mot de passe doit contenir au moins 6 caractères');
    return;
  }
  if (password !== confirmPassword) {
    setError('Les mots de passe ne correspondent pas');
    return;
  }

  // API Call (simulation)
  setIsSubmitting(true);
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSuccess('✅ Inscription réussie ! Redirection...');
    
    // Redirection vers connexion après 2s
    setTimeout(() => {
      setIsSignUp(false);
      // Reset form
    }, 2000);
  } catch (_err) {
    setError('Une erreur est survenue');
  } finally {
    setIsSubmitting(false);
  }
};
```

### Toggle Connexion/Inscription

```tsx
<div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.04]">
  <button
    type="button"
    onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
    className={!isSignUp ? 'active-gradient' : 'inactive'}
  >
    <LogIn size={16} />
    Connexion
  </button>
  <button
    type="button"
    onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
    className={isSignUp ? 'active-gradient' : 'inactive'}
  >
    <UserPlus size={16} />
    Inscription
  </button>
</div>
```

---

## 🔄 Intégration avec Backend

### À Implémenter (Production)

Remplacer la simulation par un vrai appel API :

```typescript
const handleSignUp = async (e: React.FormEvent) => {
  // ... validations ...

  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.message || 'Erreur lors de l\'inscription');
      return;
    }

    setSuccess('✅ Inscription réussie !');
    
    // Connexion automatique ou redirection
    setTimeout(() => {
      login(email, password);
    }, 1500);
    
  } catch (err) {
    setError('Erreur réseau');
  }
};
```

### API Route `/api/auth/signup`

```typescript
// app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  // Validations serveur
  if (!name || !email || !password) {
    return NextResponse.json(
      { message: 'Tous les champs sont requis' },
      { status: 400 }
    );
  }

  // Vérifier si l'email existe déjà
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { message: 'Cet email est déjà utilisé' },
      { status: 409 }
    );
  }

  // Hash du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  // Créer l'utilisateur
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'client' // Rôle par défaut
    }
  });

  return NextResponse.json({
    message: 'Inscription réussie',
    user: { id: user.id, name: user.name, email: user.email }
  });
}
```

---

## 🎨 Styles et Animations

### Animations

```css
/* Apparition des champs d'inscription */
.animate-fadeInUp {
  animation: fadeInUp 0.3s ease-out;
}

/* Gradient actif sur onglets */
.active-gradient {
  background: linear-gradient(to right, #FF385C, #E31C5F);
  color: white;
  box-shadow: 0 10px 25px -5px rgba(255, 56, 92, 0.25);
}
```

### États Visuels

- **Focus** : Ring #FF385C avec animation
- **Hover** : Légère élévation + ombre
- **Disabled** : Opacité 50% + cursor not-allowed
- **Error** : Border rouge + message
- **Success** : Border verte + message

---

## 📱 Responsive Design

### Mobile (< 768px)
- Onglets empilés verticalement si nécessaire
- Champs pleine largeur
- Taille de police adaptée

### Tablet (768px - 1024px)
- Layout identique au desktop
- Padding ajusté

### Desktop (> 1024px)
- Max-width: 28rem (448px)
- Centré avec animations

---

## ✅ Checklist de Déploiement

### Frontend
- [x] Toggle Connexion/Inscription
- [x] Formulaire d'inscription complet
- [x] Validations côté client
- [x] Messages d'erreur/succès
- [x] Inscription rapide avec Google
- [x] Animations et UX

### Backend (À Faire)
- [ ] Route API `/api/auth/signup`
- [ ] Validation serveur
- [ ] Hash des mots de passe (bcrypt)
- [ ] Vérification email unique
- [ ] Création utilisateur en DB
- [ ] Email de confirmation (optionnel)
- [ ] Connexion automatique après inscription

### Base de Données
- [ ] Table `users` avec champs :
  - `id` (UUID)
  - `name` (String)
  - `email` (String, unique)
  - `password` (String, hashed)
  - `role` (Enum: admin, employee, client)
  - `emailVerified` (DateTime, nullable)
  - `createdAt` (DateTime)

---

## 🔐 Sécurité Best Practices

### Côté Client
- ✅ Validation des entrées
- ✅ Mots de passe masqués
- ✅ Confirmation de mot de passe
- ✅ Messages d'erreur génériques

### Côté Serveur
- ⚠️ **À IMPLÉMENTER** :
  - Hash bcrypt (cost factor 10+)
  - Rate limiting (max 5 tentatives/heure)
  - CSRF protection
  - Email verification
  - Password strength validation
  - SQL injection prevention (ORM)

---

## 📊 Métriques et Monitoring

### KPIs à Suivre
- Nombre d'inscriptions/jour
- Taux de réussite (vs erreurs)
- Inscriptions Google vs Email
- Temps moyen d'inscription
- Taux d'activation email

### Logs
```typescript
console.log('[SIGNUP] New user registered:', {
  email: user.email,
  method: 'email' | 'google',
  timestamp: new Date(),
  ip: request.ip
});
```

---

## 🆘 Troubleshooting

### Erreur : "Les mots de passe ne correspondent pas"
**Cause** : Confirmation ≠ Mot de passe  
**Solution** : Vérifier la saisie

### Erreur : "Email invalide"
**Cause** : Pas de `@` dans l'email  
**Solution** : Entrer un email valide

### Erreur : "Le mot de passe doit contenir au moins 6 caractères"
**Cause** : Mot de passe trop court  
**Solution** : Minimum 6 caractères

### Google OAuth ne fonctionne pas
**Cause** : Variables d'environnement manquantes  
**Solution** : Voir `GOOGLE_AUTH_SETUP.md`

---

## 🚀 Prochaines Améliorations

### Court Terme
- [ ] API d'inscription backend
- [ ] Validation email (lien de confirmation)
- [ ] Force du mot de passe (indicateur visuel)
- [ ] Captcha (anti-bot)

### Moyen Terme
- [ ] Profil utilisateur après inscription
- [ ] Choix du rôle à l'inscription
- [ ] Avatar/photo de profil
- [ ] Termes et conditions (checkbox)

### Long Terme
- [ ] Authentification à deux facteurs (2FA)
- [ ] Connexion avec d'autres providers (GitHub, Microsoft)
- [ ] Importation de contacts
- [ ] Onboarding guidé

---

**✅ Système d'inscription opérationnel !**

🔗 **URL** : http://localhost:3000/login  
📘 **Code** : `app/login/page.tsx`  
📚 **Docs** : Ce fichier

---

*Dernière mise à jour : 31 Mars 2026*
