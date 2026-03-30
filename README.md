# Application de Gestion de Maintenance Airbnb

Une application web complète pour gérer les propriétés Airbnb, les réservations, les tâches de maintenance et les finances.

## Fonctionnalités

- **Tableau de bord** : Vue d'ensemble des revenus, dépenses et profits
- **Gestion des propriétés** : Ajout, liste avec équipements et prix
- **Réservations** : Gestion des réservations avec dates et revenus
- **Tâches de maintenance** : Assignation, suivi des statuts et coûts
- **Employés** : Liste des employés pour assignation des tâches
- **Gestion des clients** : Profils clients avec historique des réservations et notes
- **Inventaire** : Suivi des stocks, alertes de réapprovisionnement et fournisseurs
- **Avis clients** : Système de notation et commentaires pour les propriétés
- **Calendrier** : Vue calendrier des tâches et événements
- **Niveaux d'accès** : Client, Employé, Administrateur
- **Upload mobile** : QR code pour uploader des photos depuis mobile
- Interface moderne avec Next.js et Tailwind CSS

## Démarrage

Installez les dépendances :

```bash
npm install
```

Lancez le serveur de développement :

```bash
npm run dev
```

Ouvrez [http://localhost:3001](http://localhost:3001) dans votre navigateur.

## Pages

- `/` : Page d'accueil avec navigation
- `/calendar` : Calendrier des tâches
- `/admin` : Espace administrateur (gestion complète)
- `/client` : Espace client (vision limitée)
- `/employee` : Espace employé (tâches assignées)

## Technologies Utilisées

- Next.js 16
- TypeScript
- Tailwind CSS
- FullCalendar

## Upload de Photos depuis Mobile

L'application inclut une fonctionnalité innovante d'upload de photos depuis mobile via QR code :

### Comment ça marche :
1. Dans le configurateur de propriété (étape 4 - Photos), cliquez sur "Afficher QR"
2. Scannez le QR code avec votre téléphone
3. Sur votre mobile, vous pouvez prendre des photos ou sélectionner depuis la galerie
4. Les photos sont automatiquement ajoutées à votre propriété sur l'ordinateur

### Avantages :
- Photos de meilleure qualité depuis l'appareil photo du téléphone
- Plus pratique que de transférer manuellement les fichiers
- Synchronisation automatique en temps réel
- Interface mobile optimisée

### API Endpoints :
- `POST /api/upload` : Upload d'images depuis mobile
- `GET /api/upload?session=xxx` : Récupération des images uploadées pour une session
