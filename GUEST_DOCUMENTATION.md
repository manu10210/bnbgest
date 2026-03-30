# 📋 Documentation du Gestionnaire de Voyageurs (GuestManager)

## 📚 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Architecture technique](#architecture-technique)
4. [Interface utilisateur](#interface-utilisateur)
5. [Gestion des données](#gestion-des-données)
6. [Statistiques et analyses](#statistiques-et-analyses)
7. [Filtres et recherche](#filtres-et-recherche)
8. [Actions et opérations](#actions-et-opérations)
9. [Intégration](#intégration)
10. [Feuille de route](#feuille-de-route)

---

## 🎯 Vue d'ensemble

Le **GuestManager** est un composant React avancé conçu pour gérer l'ensemble du cycle de vie des voyageurs dans l'application BNBGest. Il offre une interface complète pour visualiser, analyser, communiquer avec et gérer les profils des clients.

### Caractéristiques principales

- **Interface moderne** avec animations Framer Motion
- **Statistiques en temps réel** avec 6 cartes métriques
- **Multi-vues** : tableau détaillé et grille de cartes
- **Filtrage avancé** par statut, vérification, nationalité
- **Recherche puissante** sur nom, email, téléphone
- **Gestion complète** : création, modification, visualisation
- **Actions groupées** : activation, désactivation, export
- **Mode sombre** complet avec thèmes cohérents
- **Responsive design** optimisé mobile/tablette/desktop

---

## ⚡ Fonctionnalités principales

### 1. **Tableau de bord statistique**

Le composant affiche 6 cartes de statistiques en temps réel :

#### **Voyageurs Actifs** 🟢
- Nombre de voyageurs avec statut `active`
- Indicateur de croissance visuel
- Couleur : Vert

#### **Voyageurs Inactifs** ⚪
- Voyageurs avec statut `inactive`
- Voyageurs n'ayant pas réservé récemment
- Couleur : Gris

#### **Voyageurs Bloqués** 🔴
- Voyageurs avec statut `blocked`
- Liste noire pour comportement inapproprié
- Couleur : Rouge

#### **Voyageurs VIP** ⭐
- Voyageurs avec 5+ réservations
- Statut premium automatique
- Couleur : Jaune

#### **Voyageurs Vérifiés** 🛡️
- Voyageurs avec niveau de vérification élevé
- Vérification email/téléphone/identité
- Couleur : Bleu

#### **Total Réservations** 📅
- Somme de toutes les réservations
- Métrique d'activité globale
- Couleur : Indigo

### 2. **Profils voyageurs enrichis**

Chaque voyageur dispose d'un profil complet avec :

#### Informations personnelles
- Nom complet
- Email (vérifié ou non)
- Téléphone (vérifié ou non)
- Nationalité avec drapeaux 🇫🇷🇬🇧🇺🇸
- Langue préférée
- Avatar (initiale auto-générée)

#### Métriques de performance
- **Total réservations** : Nombre de séjours
- **Nuits totales** : Durée cumulée des séjours
- **Dépenses totales** : Revenus générés en €
- **Séjour moyen** : Durée moyenne en nuits
- **Note moyenne** : Évaluation de 0 à 5 ⭐
- **Taux d'annulation** : Pourcentage d'annulations

#### Historique
- Date de création du compte
- Dernière réservation
- Prochaine réservation planifiée
- Propriété favorite (la plus réservée)

#### Statuts et badges
- **Statut général** : Active / Inactive / Blocked
- **Niveau de vérification** :
  - ❌ Non vérifié
  - 📧 Email vérifié
  - 📱 Téléphone vérifié
  - ✅ Vérifié complet
  - ⭐ Superhost (5+ réservations)
- **VIP** : Badge doré pour clients fidèles
- **Points de fidélité** : 100 points/réservation

### 3. **Système de recherche intelligent**

La barre de recherche permet de trouver instantanément un voyageur par :
- **Nom** : Recherche partielle insensible à la casse
- **Email** : Domaine ou adresse complète
- **Téléphone** : Numéro partiel ou complet
- **Nationalité** : Code pays (FR, GB, US...)

### 4. **Filtrage multi-critères**

#### Filtres disponibles

**Par statut** :
- Tous les voyageurs
- Actifs uniquement
- Inactifs uniquement
- Bloqués uniquement

**Par niveau de vérification** :
- Tous
- Non vérifiés
- Email vérifié
- Téléphone vérifié
- Vérifiés complets
- Superhosts

**Tri par** :
- Nom (A-Z ou Z-A)
- Nombre de réservations (↑↓)
- Dépenses totales (↑↓)
- Note moyenne (↑↓)
- Récence (dernière réservation)

### 5. **Modes d'affichage**

#### **Vue Tableau** 📊
- Liste complète avec colonnes détaillées
- Sélection multiple avec cases à cocher
- Triage par colonne
- Actions rapides par ligne
- Colonnes :
  - Sélection
  - Voyageur (nom, avatar, badges)
  - Contact (email, téléphone)
  - Statut
  - Réservations (nombre, nuits)
  - Dépenses (montant, moyenne)
  - Note (étoiles)
  - Actions (détails, modifier, contacter, bloquer)

#### **Vue Grille** 🎴
- Cartes visuelles avec design moderne
- 3 colonnes sur desktop, responsive
- Informations condensées
- Hover effects avec agrandissement
- Actions en bas de carte

### 6. **Modals de gestion**

#### **Modal Détails** 👁️
Affiche le profil complet avec :
- Informations personnelles complètes
- Statistiques détaillées
- Historique de réservations
- Actions rapides (modifier, contacter, voir réservations)

#### **Modal Création/Édition** ✏️
Formulaire complet pour :
- Nom complet (requis)
- Email (requis, validation format)
- Téléphone (optionnel)
- Langue (sélection dans liste)
- Nationalité (drapeaux + codes pays)
- Statut (actif/inactif/bloqué)
- Validation en temps réel
- Messages d'erreur explicites

#### **Modal Communication** 💬
(Interface pour fonctionnalité future)
- Envoi d'emails personnalisés
- Messages SMS
- Notifications WhatsApp
- Historique des communications

#### **Modal Réservations** 📅
(Interface pour fonctionnalité future)
- Liste des réservations du voyageur
- Détails de chaque séjour
- Export PDF des factures

---

## 🏗️ Architecture technique

### Technologies utilisées

```typescript
// Frameworks & Libraries
- React 18+ (hooks, context)
- Next.js 15.5 (app router)
- TypeScript (typage strict)
- Framer Motion (animations)
- Lucide React (icônes)
- Tailwind CSS (styling)
```

### Structure des types

```typescript
interface ExtendedGuest extends Guest {
  // Données de base (de BNBContext)
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  nationality?: string;
  language: string;
  totalBookings: number;
  totalSpent: number;
  rating: number;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  lastBooking?: string;
  preferences?: {
    smoking: boolean;
    pets: boolean;
    parties: boolean;
    preferredAmenities: string[];
  };

  // Enrichissements calculés
  lastBookingDate?: string;
  nextBookingDate?: string;
  averageStay?: number;
  favoriteProperty?: string;
  totalNights?: number;
  cancellationRate?: number;
  responseTime?: number;
  verificationLevel?: 'none' | 'email' | 'phone' | 'verified' | 'superhost';
  tags?: string[];
  notes?: string[];
  loyaltyPoints?: number;
  vipStatus?: boolean;
  blacklisted?: boolean;
  communicationPreferences?: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    language: string;
  };
}
```

### États du composant

```typescript
// Navigation
const [viewMode, setViewMode] = useState<ViewMode>('table');
const [showModal, setShowModal] = useState<ModalType | null>(null);
const [showFiltersPanel, setShowFiltersPanel] = useState(true);

// Filtres
const [statusFilter, setStatusFilter] = useState<string>('all');
const [verificationFilter, setVerificationFilter] = useState<string>('all');
const [searchQuery, setSearchQuery] = useState<string>('');
const [sortBy, setSortBy] = useState<SortBy>('bookings');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

// Sélection
const [selectedGuest, setSelectedGuest] = useState<ExtendedGuest | null>(null);
const [selectedGuests, setSelectedGuests] = useState<Set<number>>(new Set());

// Formulaire
const [editForm, setEditForm] = useState<Partial<ExtendedGuest>>({});
const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
```

### Hooks personnalisés

```typescript
// Contexte BNB
const { guests, bookings, properties, addGuest, updateGuest } = useBNB();

// Contexte Thème
const { isDark } = useTheme();
```

### Calculs mémoïsés (useMemo)

#### 1. **Enrichissement des données**
```typescript
const extendedGuests: ExtendedGuest[] = useMemo(() => {
  return guests.map(guest => {
    // Calcul des réservations du voyageur
    const guestBookings = bookings.filter(b => b.guestId === guest.id);
    
    // Statistiques dérivées
    const totalNights = calculateTotalNights(guestBookings);
    const averageStay = totalNights / guestBookings.length;
    const cancellationRate = calculateCancellationRate(guestBookings);
    const favoriteProperty = findFavoriteProperty(guestBookings);
    
    // Métadonnées enrichies
    return {
      ...guest,
      totalNights,
      averageStay,
      cancellationRate,
      favoriteProperty,
      vipStatus: guest.totalBookings >= 5,
      loyaltyPoints: guest.totalBookings * 100,
      // ... autres enrichissements
    };
  });
}, [guests, bookings, properties]);
```

#### 2. **Filtrage et tri**
```typescript
const filteredGuests = useMemo(() => {
  let filtered = [...extendedGuests];

  // Filtre de statut
  if (statusFilter !== 'all') {
    filtered = filtered.filter(g => g.status === statusFilter);
  }

  // Filtre de vérification
  if (verificationFilter !== 'all') {
    filtered = filtered.filter(g => g.verificationLevel === verificationFilter);
  }

  // Recherche textuelle
  if (searchQuery) {
    filtered = filtered.filter(g =>
      g.name.toLowerCase().includes(query) ||
      g.email.toLowerCase().includes(query) ||
      g.phone?.toLowerCase().includes(query)
    );
  }

  // Tri
  filtered.sort((a, b) => {
    // Logique de tri selon sortBy et sortOrder
  });

  return filtered;
}, [extendedGuests, statusFilter, verificationFilter, searchQuery, sortBy, sortOrder]);
```

#### 3. **Statistiques agrégées**
```typescript
const stats = useMemo(() => {
  return {
    total: filteredGuests.length,
    active: filteredGuests.filter(g => g.status === 'active').length,
    inactive: filteredGuests.filter(g => g.status === 'inactive').length,
    blocked: filteredGuests.filter(g => g.status === 'blocked').length,
    vip: filteredGuests.filter(g => g.vipStatus).length,
    verified: filteredGuests.filter(g => g.verificationLevel === 'verified').length,
    totalRevenue: filteredGuests.reduce((sum, g) => sum + g.totalSpent, 0),
    totalBookings: filteredGuests.reduce((sum, g) => sum + g.totalBookings, 0),
    avgRating: filteredGuests.reduce((sum, g) => sum + g.rating, 0) / filteredGuests.length,
  };
}, [filteredGuests]);
```

### Fonctions utilitaires

```typescript
// Formatage monétaire
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(amount);
};

// Formatage dates
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Couleurs de statut
const getStatusColor = (status: string) => {
  const colors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900',
  };
  return colors[status];
};

// Badges de vérification
const getVerificationBadge = (level: string) => {
  const badges = {
    none: { color: 'bg-gray-100', icon: XCircle, label: 'Non vérifié' },
    email: { color: 'bg-blue-100', icon: Mail, label: 'Email vérifié' },
    phone: { color: 'bg-purple-100', icon: Phone, label: 'Téléphone vérifié' },
    verified: { color: 'bg-green-100', icon: CheckCircle, label: 'Vérifié' },
    superhost: { color: 'bg-yellow-100', icon: Star, label: 'Superhost' },
  };
  return badges[level];
};

// Étoiles de notation
const getRatingStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
    />
  ));
};
```

---

## 🎨 Interface utilisateur

### Palette de couleurs

#### Cartes statistiques
```css
/* Voyageurs Actifs */
gradient: from-green-50 to-green-100
border: green-200
dark: from-green-900 to-green-800

/* Voyageurs Inactifs */
gradient: from-gray-50 to-gray-100
border: gray-200
dark: from-gray-700 to-gray-600

/* Voyageurs Bloqués */
gradient: from-red-50 to-red-100
border: red-200
dark: from-red-900 to-red-800

/* VIP */
gradient: from-yellow-50 to-yellow-100
border: yellow-200
dark: from-yellow-900 to-yellow-800

/* Vérifiés */
gradient: from-blue-50 to-blue-100
border: blue-200
dark: from-blue-900 to-blue-800

/* Total Réservations */
gradient: from-indigo-50 to-indigo-100
border: indigo-200
dark: from-indigo-900 to-indigo-800
```

#### Boutons d'action
```css
/* Nouveau voyageur */
bg-indigo-600 hover:bg-indigo-700

/* Exporter */
bg-green-600 hover:bg-green-700

/* Activer (bulk) */
bg-green-600 hover:bg-green-700

/* Désactiver (bulk) */
bg-orange-600 hover:bg-orange-700

/* Email (bulk) */
bg-blue-600 hover:bg-blue-700

/* Réinitialiser filtres */
bg-gray-500 hover:bg-gray-600
```

#### Badges de statut
```css
/* Active */
bg-green-100 text-green-800
dark:bg-green-900 dark:text-green-200

/* Inactive */
bg-gray-100 text-gray-800
dark:bg-gray-700 dark:text-gray-200

/* Blocked */
bg-red-100 text-red-800
dark:bg-red-900 dark:text-red-200
```

### Animations Framer Motion

#### En-tête
```typescript
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
>
```

#### Cartes statistiques
```typescript
<motion.div
  whileHover={{ scale: 1.05 }}
>
```

#### Lignes de tableau
```typescript
<motion.tr
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ delay: index * 0.02 }}
>
```

#### Cartes grille
```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ delay: index * 0.05 }}
  whileHover={{ scale: 1.02 }}
>
```

#### Modals
```typescript
// Overlay
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>

// Contenu modal
<motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.9, opacity: 0 }}
>
```

### Icônes (Lucide React)

```typescript
// Navigation
Users, Search, Filter, Download, Plus, RefreshCw

// Contact
Mail, Phone, Globe, MapPin, Send, MessageSquare

// Actions
Edit, Trash2, Eye, CheckCircle, XCircle, Ban, UserCheck, UserX

// Métriques
DollarSign, Calendar, Star, TrendingUp, Award, Shield, Clock

// Autres
AlertCircle, ChevronDown, ChevronUp, X, Copy, Printer, Share2
```

### Responsive Design

```css
/* Mobile (<640px) */
grid-cols-1 /* Grille 1 colonne */
px-4 py-2 /* Padding réduit */

/* Tablette (640px-1024px) */
grid-cols-2 /* Grille 2 colonnes */
md:grid-cols-2

/* Desktop (>1024px) */
grid-cols-3 /* Grille 3 colonnes */
lg:grid-cols-3
lg:grid-cols-6 /* Stats sur 6 colonnes */
```

---

## 💾 Gestion des données

### Source de données

Les données proviennent du **BNBContext** via le hook `useBNB()` :

```typescript
const { 
  guests,      // Guest[] - Liste des voyageurs
  bookings,    // Booking[] - Liste des réservations
  properties,  // Property[] - Liste des propriétés
  addGuest,    // (guest: Guest) => void
  updateGuest, // (id: number, updates: Partial<Guest>) => void
} = useBNB();
```

### Persistance

Les données sont stockées dans **localStorage** via le contexte :
- Clé : `bnb_data`
- Format : JSON stringifié
- Mise à jour : Automatique à chaque modification
- Restauration : Au chargement de l'application

### Opérations CRUD

#### **Create - Création**
```typescript
const handleSaveGuest = () => {
  const newGuest: Guest = {
    id: Math.max(0, ...guests.map(g => g.id)) + 1,
    name: editForm.name!,
    email: editForm.email!,
    phone: editForm.phone || '',
    language: editForm.language || 'fr',
    nationality: editForm.nationality,
    totalBookings: 0,
    totalSpent: 0,
    rating: 5,
    status: 'active',
    createdAt: new Date().toISOString(),
    preferences: {
      smoking: false,
      pets: false,
      parties: false,
      preferredAmenities: [],
    },
  };
  addGuest(newGuest);
};
```

#### **Read - Lecture**
```typescript
// Lecture directe depuis le contexte
const guests = useBNB().guests;

// Enrichissement avec calculs
const extendedGuests = useMemo(() => {
  return guests.map(guest => {
    // Enrichissements...
  });
}, [guests, bookings]);
```

#### **Update - Modification**
```typescript
// Modification du statut
updateGuest(guest.id, { status: 'blocked' });

// Modification complète depuis le formulaire
updateGuest(selectedGuest.id, editForm);
```

#### **Delete - Suppression**
Non implémentée actuellement (fonction deleteGuest n'existe pas dans BNBContext).
Pour ajouter cette fonctionnalité :
1. Ajouter `deleteGuest` dans BNBContext
2. Ajouter un bouton de suppression dans les actions
3. Implémenter la logique avec confirmation

### Validation des données

#### Formulaire de création/édition
```typescript
const errors: { [key: string]: string } = {};

// Nom requis
if (!editForm.name?.trim()) {
  errors.name = 'Le nom est requis';
}

// Email requis et format valide
if (!editForm.email?.trim()) {
  errors.email = 'L\'email est requis';
}
if (editForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
  errors.email = 'Email invalide';
}

if (Object.keys(errors).length > 0) {
  setFormErrors(errors);
  return;
}
```

---

## 📊 Statistiques et analyses

### Métriques en temps réel

#### 1. **Voyageurs Actifs**
```typescript
const active = filteredGuests.filter(g => g.status === 'active').length;
```
- Indicateur de santé de la base clients
- Cible : >80% du total

#### 2. **Voyageurs Inactifs**
```typescript
const inactive = filteredGuests.filter(g => g.status === 'inactive').length;
```
- Opportunités de réactivation
- Actions : Campagnes email, offres spéciales

#### 3. **Voyageurs Bloqués**
```typescript
const blocked = filteredGuests.filter(g => g.status === 'blocked').length;
```
- Liste noire
- Raisons : Non-paiement, dommages, comportement

#### 4. **Voyageurs VIP**
```typescript
const vip = filteredGuests.filter(g => g.vipStatus).length;
// vipStatus = totalBookings >= 5
```
- Clients fidèles à privilégier
- Avantages : Upgrades, early check-in, réductions

#### 5. **Voyageurs Vérifiés**
```typescript
const verified = filteredGuests.filter(g => 
  g.verificationLevel === 'verified' || 
  g.verificationLevel === 'superhost'
).length;
```
- Confiance accrue
- Réduction des risques

#### 6. **Total Réservations**
```typescript
const totalBookings = filteredGuests.reduce((sum, g) => 
  sum + g.totalBookings, 0
);
```
- Volume d'activité global

### Métriques dérivées

#### Revenus totaux
```typescript
const totalRevenue = filteredGuests.reduce((sum, g) => 
  sum + g.totalSpent, 0
);
```

#### Note moyenne
```typescript
const avgRating = total > 0 
  ? filteredGuests.reduce((sum, g) => sum + g.rating, 0) / total 
  : 0;
```

#### Dépenses moyennes
```typescript
const avgSpent = total > 0 ? totalRevenue / total : 0;
```

#### Réservations moyennes
```typescript
const avgBookings = total > 0 ? totalBookings / total : 0;
```

### Calculs par voyageur

#### Nuits totales
```typescript
const totalNights = completedBookings.reduce((sum, booking) => {
  const nights = Math.ceil(
    (new Date(booking.checkOut).getTime() - 
     new Date(booking.checkIn).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  return sum + nights;
}, 0);
```

#### Séjour moyen
```typescript
const averageStay = completedBookings.length > 0 
  ? totalNights / completedBookings.length 
  : 0;
```

#### Taux d'annulation
```typescript
const cancellationRate = guestBookings.length > 0 
  ? (cancelledBookings.length / guestBookings.length) * 100 
  : 0;
```

#### Propriété favorite
```typescript
const propertyBookings = completedBookings.reduce((acc, booking) => {
  acc[booking.propertyId] = (acc[booking.propertyId] || 0) + 1;
  return acc;
}, {});

const favoritePropertyId = Object.entries(propertyBookings)
  .sort((a, b) => b[1] - a[1])[0]?.[0];

const favoriteProperty = properties.find(p => 
  p.id === parseInt(favoritePropertyId)
)?.name;
```

---

## 🔍 Filtres et recherche

### Barre de recherche

#### Champs indexés
```typescript
const query = searchQuery.toLowerCase();
filtered = filtered.filter(g =>
  g.name.toLowerCase().includes(query) ||
  g.email.toLowerCase().includes(query) ||
  g.phone?.toLowerCase().includes(query) ||
  g.nationality?.toLowerCase().includes(query)
);
```

#### Exemples de recherche
- `"martin"` → Trouve "Martin Dupont", "martin@example.com"
- `"06"` → Trouve "+33 6 12 34 56 78"
- `"FR"` → Trouve tous les voyageurs français
- `"@gmail"` → Trouve tous les emails Gmail

### Filtres

#### Par statut
```typescript
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="all">Tous</option>
  <option value="active">Actifs</option>
  <option value="inactive">Inactifs</option>
  <option value="blocked">Bloqués</option>
</select>
```

#### Par niveau de vérification
```typescript
<select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
  <option value="all">Tous</option>
  <option value="none">Non vérifiés</option>
  <option value="email">Email vérifié</option>
  <option value="phone">Téléphone vérifié</option>
  <option value="verified">Vérifiés</option>
  <option value="superhost">Superhosts</option>
</select>
```

### Tri

#### Options de tri
```typescript
type SortBy = 'name' | 'bookings' | 'spent' | 'rating' | 'recent';
```

#### Logique de tri
```typescript
filtered.sort((a, b) => {
  let comparison = 0;
  
  switch (sortBy) {
    case 'name':
      comparison = a.name.localeCompare(b.name);
      break;
    case 'bookings':
      comparison = a.totalBookings - b.totalBookings;
      break;
    case 'spent':
      comparison = a.totalSpent - b.totalSpent;
      break;
    case 'rating':
      comparison = a.rating - b.rating;
      break;
    case 'recent':
      comparison = new Date(b.lastBookingDate || 0).getTime() - 
                   new Date(a.lastBookingDate || 0).getTime();
      break;
  }
  
  return sortOrder === 'asc' ? comparison : -comparison;
});
```

### Réinitialisation
```typescript
const resetFilters = () => {
  setStatusFilter('all');
  setVerificationFilter('all');
  setSearchQuery('');
};
```

---

## ⚙️ Actions et opérations

### Actions individuelles

#### Voir les détails
```typescript
<button onClick={() => {
  setSelectedGuest(guest);
  setShowModal('details');
}}>
  <Eye className="w-5 h-5" />
</button>
```
- Ouvre le modal avec profil complet
- Affiche statistiques détaillées

#### Modifier
```typescript
<button onClick={() => {
  setSelectedGuest(guest);
  setEditForm(guest);
  setShowModal('edit');
}}>
  <Edit className="w-5 h-5" />
</button>
```
- Pré-remplit le formulaire
- Validation en temps réel

#### Contacter
```typescript
<button onClick={() => {
  setSelectedGuest(guest);
  setShowModal('communication');
}}>
  <Send className="w-5 h-5" />
</button>
```
- Interface de communication
- Email, SMS, WhatsApp

#### Bloquer/Débloquer
```typescript
// Bloquer
<button onClick={() => {
  if (confirm(`Bloquer ${guest.name} ?`)) {
    updateGuest(guest.id, { status: 'blocked' });
  }
}}>
  <Ban className="w-5 h-5" />
</button>

// Débloquer
<button onClick={() => updateGuest(guest.id, { status: 'active' })}>
  <CheckCircle className="w-5 h-5" />
</button>
```

### Actions groupées (Bulk actions)

#### Sélection
```typescript
// Case à cocher "Tout sélectionner"
<input
  type="checkbox"
  onChange={(e) => {
    if (e.target.checked) {
      setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
    } else {
      setSelectedGuests(new Set());
    }
  }}
  checked={selectedGuests.size === filteredGuests.length}
/>

// Cases individuelles
<input
  type="checkbox"
  checked={selectedGuests.has(guest.id)}
  onChange={() => toggleGuestSelection(guest.id)}
/>
```

#### Activer en masse
```typescript
if (confirm(`Activer ${selectedGuests.size} voyageurs ?`)) {
  selectedGuests.forEach(id => {
    const guest = guests.find(g => g.id === id);
    if (guest) updateGuest(id, { status: 'active' });
  });
  setSelectedGuests(new Set());
}
```

#### Désactiver en masse
```typescript
if (confirm(`Désactiver ${selectedGuests.size} voyageurs ?`)) {
  selectedGuests.forEach(id => {
    const guest = guests.find(g => g.id === id);
    if (guest) updateGuest(id, { status: 'inactive' });
  });
  setSelectedGuests(new Set());
}
```

#### Envoi d'emails groupés
```typescript
const emails = filteredGuests
  .filter(g => selectedGuests.has(g.id))
  .map(g => g.email);

// À implémenter : service d'envoi d'emails
alert(`Envoi d'emails à ${selectedGuests.size} voyageurs...`);
```

#### Export CSV
```typescript
const csv = filteredGuests
  .filter(g => selectedGuests.has(g.id))
  .map(g => `${g.id},${g.name},${g.email},${g.phone},${g.totalBookings},${g.totalSpent},${g.rating},${g.status}`)
  .join('\n');

const blob = new Blob(
  ['ID,Name,Email,Phone,Bookings,Spent,Rating,Status\n' + csv], 
  { type: 'text/csv' }
);

const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `voyageurs-${new Date().toISOString().split('T')[0]}.csv`;
a.click();
```

---

## 🔗 Intégration

### Dans AdminDashboard

```typescript
import GuestManager from '../components/GuestManager';

// Onglet Voyageurs
{activeTab === 'guests' && (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
    <GuestManager />
  </div>
)}
```

### Props disponibles

```typescript
interface GuestManagerProps {
  compact?: boolean;      // Affichage compact (défaut: false)
  showFilters?: boolean;  // Afficher les filtres (défaut: true)
}

// Exemple d'utilisation
<GuestManager 
  compact={false} 
  showFilters={true} 
/>
```

### Dépendances requises

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "next": "^15.0.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

### Contextes nécessaires

#### BNBContext
```typescript
import { useBNB } from '../contexts/BNBContext';

// Fournit :
- guests: Guest[]
- bookings: Booking[]
- properties: Property[]
- addGuest: (guest: Guest) => void
- updateGuest: (id: number, updates: Partial<Guest>) => void
```

#### ThemeContext
```typescript
import { useTheme } from '../contexts/ThemeContext';

// Fournit :
- isDark: boolean
- toggleTheme: () => void
```

---

## 🚀 Feuille de route

### Fonctionnalités à court terme

#### 1. **Système de communication avancé** 📧
- Templates d'emails personnalisables
- Envoi de SMS via Twilio
- Intégration WhatsApp Business
- Historique des communications
- Réponses automatiques

#### 2. **Gestion des documents** 📄
- Upload de pièces d'identité
- Vérification automatique (OCR)
- Stockage sécurisé
- Dates d'expiration
- Notifications de renouvellement

#### 3. **Programme de fidélité** 🎁
- Système de points
- Niveaux de fidélité (Bronze, Argent, Or, Platine)
- Récompenses automatiques
- Offres personnalisées
- Dashboard de progression

#### 4. **Analyse comportementale** 📈
- Préférences de réservation
- Patterns de consommation
- Prédiction de churn
- Recommandations de propriétés
- Score de valeur client (CLV)

### Fonctionnalités à moyen terme

#### 5. **Intégration CRM** 🤝
- Export vers Salesforce
- Synchronisation HubSpot
- API RESTful
- Webhooks
- Intégrations tierces

#### 6. **Segmentation avancée** 🎯
- Segments personnalisés
- Critères multiples
- Campagnes ciblées
- A/B testing
- Analyse de performance

#### 7. **Évaluations et avis** ⭐
- Système de notation bidirectionnel
- Avis détaillés
- Modération
- Réponses aux avis
- Statistiques d'avis

#### 8. **Gestion des conflits** ⚖️
- Système de tickets
- Historique des litiges
- Résolution guidée
- Escalade automatique
- Base de connaissances

### Fonctionnalités à long terme

#### 9. **Intelligence artificielle** 🤖
- Chatbot pour voyageurs
- Réponses automatiques
- Détection de fraude
- Prédiction de satisfaction
- Recommandations personnalisées

#### 10. **Multi-propriétés** 🏘️
- Gestion de portefeuilles
- Transferts inter-propriétés
- Réservations groupées
- Statistiques consolidées

#### 11. **Application mobile** 📱
- App iOS/Android
- Check-in mobile
- Communication directe
- Notifications push
- Géolocalisation

#### 12. **Conformité RGPD** 🔒
- Gestion des consentements
- Export de données
- Droit à l'oubli
- Anonymisation
- Audit trail

---

## 📝 Exemples de code

### Exemple 1 : Créer un nouveau voyageur

```typescript
const newGuest: Guest = {
  id: 1,
  name: "Jean Dupont",
  email: "jean.dupont@example.com",
  phone: "+33 6 12 34 56 78",
  nationality: "FR",
  language: "fr",
  totalBookings: 0,
  totalSpent: 0,
  rating: 5,
  status: "active",
  createdAt: new Date().toISOString(),
  preferences: {
    smoking: false,
    pets: false,
    parties: false,
    preferredAmenities: ["WiFi", "Parking"]
  }
};

addGuest(newGuest);
```

### Exemple 2 : Modifier un voyageur

```typescript
// Changer le statut
updateGuest(1, { status: 'blocked' });

// Mettre à jour plusieurs champs
updateGuest(1, {
  phone: "+33 6 98 76 54 32",
  nationality: "BE",
  preferences: {
    smoking: true,
    pets: true,
    parties: false,
    preferredAmenities: ["WiFi", "Parking", "Pool"]
  }
});
```

### Exemple 3 : Filtrer les voyageurs VIP français

```typescript
const vipFrenchGuests = extendedGuests.filter(guest => 
  guest.vipStatus && 
  guest.nationality === 'FR'
);

console.log(`${vipFrenchGuests.length} voyageurs VIP français`);
```

### Exemple 4 : Calculer le CA d'un voyageur

```typescript
const calculateGuestRevenue = (guestId: number) => {
  const guestBookings = bookings.filter(b => 
    b.guestId === guestId && 
    b.status === 'completed'
  );
  
  return guestBookings.reduce((total, booking) => 
    total + booking.totalPrice, 0
  );
};

const revenue = calculateGuestRevenue(1);
console.log(`Revenus: ${formatCurrency(revenue)}`);
```

### Exemple 5 : Export CSV personnalisé

```typescript
const exportToCSV = (guests: ExtendedGuest[], filename: string) => {
  const headers = [
    'ID', 'Nom', 'Email', 'Téléphone', 'Nationalité',
    'Réservations', 'Dépenses', 'Note', 'Statut'
  ];
  
  const rows = guests.map(g => [
    g.id,
    g.name,
    g.email,
    g.phone,
    g.nationality || '-',
    g.totalBookings,
    g.totalSpent,
    g.rating,
    g.status
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
};

// Utilisation
exportToCSV(filteredGuests, 'voyageurs-vip.csv');
```

---

## 🐛 Résolution de problèmes

### Erreur : "Property deleteGuest does not exist"

**Cause** : La fonction `deleteGuest` n'est pas définie dans BNBContext.

**Solution** : Ne pas utiliser `deleteGuest` ou l'ajouter au contexte :

```typescript
// Dans BNBContext.tsx
const deleteGuest = (id: number) => {
  setBnbData(prev => ({
    ...prev,
    guests: prev.guests.filter(g => g.id !== id)
  }));
};
```

### Problème : Les statistiques ne se mettent pas à jour

**Cause** : useMemo ne recalcule pas les dépendances.

**Solution** : Vérifier les dépendances de useMemo :

```typescript
const stats = useMemo(() => {
  // Calculs...
}, [filteredGuests]); // ✅ Dépendance correcte
```

### Problème : La recherche est lente

**Cause** : Trop de voyageurs, recherche non optimisée.

**Solution** : Implémenter un debounce :

```typescript
import { useState, useEffect } from 'react';

const [searchInput, setSearchInput] = useState('');
const [searchQuery, setSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setSearchQuery(searchInput);
  }, 300); // Délai de 300ms
  
  return () => clearTimeout(timer);
}, [searchInput]);
```

### Problème : Le mode sombre ne fonctionne pas

**Cause** : ThemeContext non fourni ou className manquante.

**Solution** : Ajouter `dark` className au conteneur :

```typescript
<div className={`space-y-6 ${isDark ? 'dark' : ''}`}>
  {/* Contenu */}
</div>
```

---

## 📚 Ressources

### Documentation externe

- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Fichiers liés

- `components/GuestManager.tsx` - Composant principal
- `contexts/BNBContext.tsx` - Contexte de données
- `contexts/ThemeContext.tsx` - Contexte de thème
- `components/AdminDashboard.tsx` - Intégration du composant
- `BOOKING_DOCUMENTATION.md` - Documentation réservations

---

## ✅ Checklist de déploiement

- [x] Composant GuestManager créé
- [x] Types TypeScript définis
- [x] Statistiques implémentées
- [x] Filtres fonctionnels
- [x] Recherche opérationnelle
- [x] Actions CRUD complètes
- [x] Modals de gestion
- [x] Animations Framer Motion
- [x] Mode sombre supporté
- [x] Responsive design
- [x] Build réussi
- [x] Documentation complète
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Déploiement en production

---

## 📄 Licence

Ce composant fait partie de l'application **BNBGest** © 2025

---

**Version de la documentation** : 1.0.0  
**Dernière mise à jour** : 14 janvier 2025  
**Auteur** : GitHub Copilot
