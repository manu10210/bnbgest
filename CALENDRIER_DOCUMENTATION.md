# 📅 Calendrier Interactif - Documentation Complète

## 🎯 Vue d'ensemble

Le calendrier interactif est un composant React moderne utilisant **react-calendar** pour visualiser et gérer les réservations, tâches de maintenance et périodes bloquées pour chaque propriété.

## 📦 Technologies utilisées

- **react-calendar** v4.8.0 - Composant calendrier
- **date-fns** v3.x - Manipulation et formatage des dates
- **framer-motion** - Animations fluides
- **Tailwind CSS** - Styling responsive
- **TypeScript** - Typage strict

## 📁 Fichiers créés

### 1. `components/InteractiveCalendar.tsx` (627 lignes)
Composant principal du calendrier avec toutes les fonctionnalités.

### 2. `app/calendar/page.tsx` (13 lignes)
Wrapper de la page avec protection d'authentification.

## ✨ Fonctionnalités

### 📅 Visualisation

- **Vue mois/année** - Basculer entre deux modes d'affichage
- **Navigation** - Boutons prev/next pour changer de mois
- **Points colorés** - Indicateurs visuels sur les dates avec événements
- **Sélecteur de propriété** - Filtrer par bien immobilier
- **Locale française** - Tous les textes en français

### 🎨 Types d'événements

#### 🔵 Réservations (Bookings)
- **Bleu vif** (#3b82f6) - Réservation confirmée
- **Vert** (#10b981) - Réservation terminée
- **Orange** (#f59e0b) - Réservation en attente

#### 🟣 Maintenance (Tasks)
- **Violet** (#8b5cf6) - Tâche planifiée
- **Rouge** (#ef4444) - Tâche urgente
- **Vert** (#10b981) - Tâche terminée

#### 🔴 Dates bloquées
- **Rouge** - Périodes indisponibles

### 📊 Statistiques mensuelles

Cartes affichant pour le mois en cours :
- 📈 Nombre de réservations
- 💰 Revenus totaux (€)
- 🔧 Nombre de tâches de maintenance
- ⏳ Tâches en attente

### 🔒 Blocage de dates

Modal avec formulaire pour :
- Sélection date de début
- Sélection date de fin
- Raison du blocage (optionnel)
- Validation et enregistrement

### 📱 Interface

- **Responsive** - Adapté mobile et desktop
- **Mode sombre** - Support du thème sombre
- **Animations** - Transitions fluides (framer-motion)
- **Sidebar** - Panneau latéral pour détails des événements
- **Légende** - Explication des couleurs

## 🚀 Installation

Les dépendances sont déjà installées :

```bash
npm install react-calendar date-fns
```

## 💻 Utilisation

### Accès
```
http://localhost:3000/calendar
```

### Code d'intégration

```tsx
import InteractiveCalendar from '../components/InteractiveCalendar';

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <InteractiveCalendar />
    </ProtectedRoute>
  );
}
```

## 🎨 Personnalisation CSS

Le composant utilise des classes Tailwind et du CSS custom pour react-calendar.

### Exemple de personnalisation

```css
.react-calendar {
  border: none;
  border-radius: 1rem;
}

.react-calendar__tile--active {
  background: #3b82f6 !important;
  color: white;
}
```

## 📋 Structure des données

### CalendarEvent

```typescript
interface CalendarEvent {
  id: string | number;
  type: 'booking' | 'maintenance' | 'blocked';
  startDate: Date;
  endDate: Date;
  title: string;
  color: string;
  data: Booking | MaintenanceTask | any;
}
```

### ViewMode

```typescript
type ViewMode = 'month' | 'year';
```

## 🔧 Fonctions principales

### `tileContent(date: Date)`
Affiche les indicateurs (dots) sur chaque date selon les événements.

### `tileClassName(date: Date)`
Ajoute des classes CSS pour styling conditionnel.

### `handleDateClick(date: Date)`
Gère le clic sur une date - affiche les événements du jour.

### `handleBlockDates()`
Enregistre une période bloquée pour la propriété sélectionnée.

### `getEventsForDate(date: Date)`
Récupère tous les événements pour une date donnée.

## 📊 Calcul des statistiques

```typescript
const monthStats = useMemo(() => {
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  const monthBookings = bookings.filter(b => {
    const checkIn = new Date(b.checkIn);
    return checkIn.getMonth() === currentMonth && 
           checkIn.getFullYear() === currentYear;
  });

  return {
    bookings: monthBookings.length,
    tasks: monthTasks.length,
    revenue: monthBookings.reduce((sum, b) => sum + b.totalPrice, 0),
    pendingTasks: monthTasks.filter(t => t.status === 'pending').length
  };
}, [selectedDate, bookings, maintenanceTasks]);
```

## 🎯 Actions utilisateur

### 1. Sélectionner une propriété
Utiliser le dropdown en haut de la page.

### 2. Voir les événements d'une date
Cliquer sur n'importe quelle date du calendrier.

### 3. Bloquer des dates
1. Cliquer sur "Bloquer des dates"
2. Sélectionner date début/fin
3. Ajouter une raison (optionnel)
4. Cliquer "Bloquer"

### 4. Changer de vue
Basculer entre vue "Mois" et "Année".

## 🔍 Détails techniques

### Gestion des événements qui chevauchent des mois

Le composant utilise `isWithinInterval` de date-fns pour détecter si une date est dans une plage :

```typescript
const isDateInEvent = (date: Date, event: CalendarEvent) => {
  return isWithinInterval(date, {
    start: event.startDate,
    end: event.endDate
  });
};
```

### Optimisation avec useMemo

Les événements et statistiques sont calculés avec `useMemo` pour éviter les re-calculs inutiles :

```typescript
const events = useMemo(() => {
  // Construction des événements
}, [bookings, maintenanceTasks, selectedProperty]);
```

## 🌐 Localisation

Utilise la locale française de date-fns :

```typescript
import { fr } from 'date-fns/locale';

format(date, 'PPPP', { locale: fr });
// Résultat: "vendredi 28 mars 2026"
```

## 🎭 Modes d'affichage

### Mode Mois
- Affiche tous les jours du mois
- Indicateurs visuels sur chaque date
- Navigation mois par mois

### Mode Année
- Vue compacte de 12 mois
- Navigation rapide entre mois
- Moins de détails mais vue globale

## 🐛 Débogage

### Vérifier les événements

```typescript
console.log('Events:', events);
console.log('Selected Property:', selectedProperty);
```

### Vérifier le rendu

```typescript
console.log('Rendering calendar for:', selectedDate);
console.log('Stats:', monthStats);
```

## 🚀 Performance

- **Lazy loading** - Événements chargés uniquement pour la propriété sélectionnée
- **Memoization** - Calculs mis en cache avec useMemo
- **Optimistic UI** - Mise à jour immédiate de l'interface

## 📱 Responsive Design

### Mobile (< 768px)
- Calendrier pleine largeur
- Stats en colonnes
- Sidebar en modal

### Tablet (768px - 1024px)
- Calendrier + sidebar côte à côte
- Stats en 2 colonnes

### Desktop (> 1024px)
- Vue complète optimisée
- Stats en 4 colonnes
- Large calendrier

## 🎨 Thème

### Mode Clair
- Fond blanc
- Texte gris foncé
- Bordures grises claires

### Mode Sombre
- Fond gris foncé (#1a1a2e)
- Texte blanc
- Bordures grises transparentes

## ✅ Tests

### Test d'affichage
1. Accéder à `/calendar`
2. Vérifier présence du calendrier
3. Cliquer sur une date
4. Vérifier affichage des événements

### Test de blocage
1. Cliquer "Bloquer des dates"
2. Sélectionner période
3. Enregistrer
4. Vérifier date bloquée en rouge

### Test de statistiques
1. Sélectionner propriété avec réservations
2. Vérifier calculs corrects
3. Changer de mois
4. Vérifier mise à jour stats

## 🔗 Intégration avec BNBContext

Le calendrier utilise le contexte BNB pour :
- Récupérer les propriétés
- Récupérer les réservations
- Récupérer les tâches
- Mettre à jour les propriétés (blocage)

```typescript
const { properties, bookings, maintenanceTasks, updateProperty } = useBNB();
```

## 📚 Ressources

- [react-calendar](https://github.com/wojtekmaj/react-calendar)
- [date-fns](https://date-fns.org/)
- [framer-motion](https://www.framer.com/motion/)

## 🎉 Statut

✅ **OPÉRATIONNEL**
- Build réussi
- Serveur actif (port 3000)
- Route accessible
- Toutes fonctionnalités implémentées

---

**Dernière mise à jour:** 28 mars 2026  
**Version:** 1.0.0  
**Auteur:** BNBGest Development Team
