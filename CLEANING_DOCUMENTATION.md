# 📋 Documentation - Checklist Ménage

## Vue d'ensemble

Le système de **Checklist Ménage** de BNBGest est un outil professionnel complet pour gérer et suivre toutes les sessions de nettoyage de vos propriétés. Il offre un suivi en temps réel, des statistiques détaillées, et une traçabilité complète pour garantir des standards de propreté élevés.

---

## ✨ Fonctionnalités principales

### 🎯 Gestion des sessions

- **Création de sessions** liées à des propriétés et réservations
- **Assignation** à des personnes ou équipes
- **Suivi en temps réel** avec timer et pause
- **6 zones de nettoyage** pré-configurées :
  - 🏠 Entrée / Salon (10 tâches)
  - 🛏️ Chambre(s) (10 tâches)
  - 🚿 Salle de bain (10 tâches)
  - 🍳 Cuisine (12 tâches)
  - 🌳 Extérieur / Communs (8 tâches)
  - ✅ Contrôle final (5 tâches)

### 📊 Statistiques et KPIs

Le tableau de bord affiche :
- **Total de sessions** créées
- **Sessions complétées** avec succès
- **Sessions en cours** actuellement
- **Durée moyenne** d'une session
- **Note moyenne** de qualité
- **Taux de complétion** global

### 🔍 Filtrage et recherche

- Recherche par **propriété**, **assigné** ou **notes**
- Filtrage par **statut** (complétées, en cours, en attente, annulées)
- Tri par **date**, **propriété**, **durée** ou **note**

---

## 🏗️ Architecture technique

### Types de données

#### CleaningSession
```typescript
interface CleaningSession {
  id: string;
  propertyId: number;
  bookingId?: number;
  assignedTo: string;
  team?: string[];
  startedAt?: string;
  completedAt?: string;
  pausedDuration?: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'verified' | 'cancelled';
  rooms: RoomChecklist[];
  notes: string;
  createdAt: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestCount?: number;
  overallRating?: number;
  quality?: 'excellent' | 'good' | 'average' | 'poor';
  cost?: number;
  supplies?: { item: string; quantity: number; cost: number }[];
  issues?: { description: string; severity: 'low' | 'medium' | 'high'; resolved: boolean }[];
  beforePhotos?: string[];
  afterPhotos?: string[];
  verifiedBy?: string;
  verifiedAt?: string;
}
```

#### RoomChecklist
```typescript
interface RoomChecklist {
  room: string;
  icon: string;
  color: string;
  items: ChecklistItem[];
  completedCount?: number;
  totalCount?: number;
  estimatedDuration?: number;
}
```

#### ChecklistItem
```typescript
interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime?: number; // en minutes
  note?: string;
  photos?: string[];
  completedAt?: string;
  completedBy?: string;
  issues?: string[];
  rating?: number; // 1-5
}
```

### Stockage

Les données sont stockées dans **localStorage** avec la clé :
```
bnbgest_cleaning_sessions
```

---

## 🚀 Guide d'utilisation

### 1. Créer une nouvelle session

1. Cliquez sur **"Nouvelle session"**
2. Sélectionnez la **propriété**
3. (Optionnel) Associez une **réservation**
4. Saisissez le nom de la **personne assignée**
5. Cliquez sur **"Créer"**

La session est créée avec le statut **"En attente"**.

### 2. Démarrer une session

1. Accédez à l'onglet **"Session active"**
2. Cliquez sur **"Démarrer"**
3. Le timer démarre automatiquement
4. Cochez les tâches au fur et à mesure

### 3. Gérer la session

**Mettre en pause** :
- Cliquez sur **"Pause"** pour arrêter temporairement
- Le temps de pause est comptabilisé

**Reprendre** :
- Cliquez sur **"Reprendre"** pour continuer
- Le timer repart

**Réinitialiser** :
- Cliquez sur **🔄** pour décocher toutes les tâches
- Confirmation requise

### 4. Compléter une session

1. Vérifiez que toutes les tâches importantes sont cochées
2. Ajoutez des **notes** si nécessaire
3. Cliquez sur **"Terminer"**
4. Si < 100% complété, une confirmation sera demandée
5. La session passe en statut **"Terminée"**

---

## 📋 Zones et tâches

### 🏠 Entrée / Salon (20 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Aspirer / balayer le sol | Haute | 5 min |
| Laver le sol | Haute | 5 min |
| Dépoussiérer les meubles | Moyenne | 3 min |
| Nettoyer vitres et miroirs | Moyenne | 4 min |
| Vider les poubelles | Haute | 1 min |
| Vérifier éclairages | **Critique** | 1 min |
| Remettre coussins en place | Basse | 1 min |
| Vérifier télécommandes (piles) | Moyenne | 1 min |
| Aérer la pièce | Haute | 1 min |
| Ranger magazines / livres | Basse | 2 min |

### 🛏️ Chambre(s) (25 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Changer les draps | **Critique** | 5 min |
| Changer les taies d'oreiller | **Critique** | 2 min |
| Refaire le lit (pliage hôtelier) | Haute | 5 min |
| Aspirer / balayer le sol | Haute | 4 min |
| Dépoussiérer tables de nuit | Moyenne | 2 min |
| Nettoyer miroir / vitres | Moyenne | 3 min |
| Vérifier penderie (cintres) | Moyenne | 1 min |
| Vérifier prises et éclairages | **Critique** | 1 min |
| Placer serviettes supplémentaires | Basse | 1 min |
| Vérifier climatisation / chauffage | Haute | 1 min |

### 🚿 Salle de bain (30 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Nettoyer la douche / baignoire | **Critique** | 8 min |
| Nettoyer toilettes (intérieur + extérieur) | **Critique** | 5 min |
| Nettoyer lavabo et robinetterie | Haute | 4 min |
| Nettoyer le miroir | Haute | 2 min |
| Remplacer serviettes propres | **Critique** | 3 min |
| Vérifier savon / shampoing / gel douche | Haute | 2 min |
| Vérifier papier toilette (+ rouleau) | **Critique** | 1 min |
| Laver le sol | Haute | 3 min |
| Vider la poubelle | Haute | 1 min |
| Désinfecter toutes les surfaces | **Critique** | 5 min |

### 🍳 Cuisine (35 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Nettoyer le plan de travail | Haute | 3 min |
| Nettoyer la cuisinière / plaques | Haute | 5 min |
| Nettoyer le four (intérieur) | Moyenne | 8 min |
| Nettoyer le micro-ondes | Haute | 4 min |
| Nettoyer le réfrigérateur (vider + essuyer) | **Critique** | 6 min |
| Lancer / vider le lave-vaisselle | Moyenne | 2 min |
| Vérifier vaisselle complète et rangée | Haute | 3 min |
| Remplacer éponge et produit vaisselle | Moyenne | 1 min |
| Vider les poubelles (tri sélectif) | Haute | 2 min |
| Laver le sol | Haute | 4 min |
| Nettoyer évier et robinetterie | Haute | 3 min |
| Vérifier machine à café / bouilloire | Moyenne | 2 min |

### 🌳 Extérieur / Communs (15 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Vérifier boîte aux lettres | Basse | 1 min |
| Nettoyer le paillasson | Moyenne | 2 min |
| Vérifier la porte d'entrée (serrure) | **Critique** | 1 min |
| Arroser les plantes si nécessaire | Basse | 3 min |
| Vérifier le thermostat / chauffage | Haute | 2 min |
| Laisser les clés / boîtier à clé | **Critique** | 1 min |
| Vérifier éclairages extérieurs | Moyenne | 2 min |
| Nettoyer balcon / terrasse | Moyenne | 5 min |

### ✅ Contrôle final (10 min)

| Tâche | Priorité | Temps |
|-------|----------|-------|
| Vérification globale de la propreté | **Critique** | 3 min |
| Prendre photos "après" | Haute | 2 min |
| Vérifier WiFi et codes d'accès | **Critique** | 1 min |
| Documenter problèmes éventuels | Haute | 2 min |
| Signer et valider la checklist | **Critique** | 1 min |

**Durée totale estimée : ~2h15**

---

## 🎨 Statuts de session

| Statut | Couleur | Description |
|--------|---------|-------------|
| **En attente** | Gris | Session créée, pas encore démarrée |
| **En cours** | Bleu | Session active, timer en marche |
| **En pause** | Jaune | Session pausée temporairement |
| **Terminée** | Vert | Session complétée |
| **Vérifiée** | Violet | Session complétée et vérifiée |
| **Annulée** | Rouge | Session annulée |

## 🏷️ Niveaux de priorité

| Priorité | Couleur | Utilisation |
|----------|---------|-------------|
| **Critique** | Rouge | Tâches essentielles à la sécurité et l'hygiène |
| **Haute** | Orange | Tâches importantes pour la satisfaction client |
| **Moyenne** | Jaune | Tâches importantes mais non urgentes |
| **Basse** | Gris | Tâches de confort, non essentielles |

---

## 📱 Vues disponibles

### Session active
- Affiche la session en cours
- Timer en temps réel
- Progression visuelle
- Checklist interactive par pièce
- Zone de notes

### Historique
- Liste de toutes les sessions
- Filtres et recherche
- Actions rapides (voir, dupliquer, supprimer)
- Tri personnalisable

### Statistiques
- Graphiques de performance (à venir)
- Tendances temporelles (à venir)
- Analyses comparatives (à venir)

---

## 🔧 Fonctions avancées

### Dupliquer une session
Permet de créer une nouvelle session basée sur une session existante :
- Structure identique
- Statut remis à "En attente"
- Tâches non cochées

### Réinitialiser une session
Décoche toutes les tâches de la session active :
- Garde la structure
- Préserve les informations de session
- Recommence à zéro

### Timer intelligent
- Démarre au lancement de la session
- Met en pause automatiquement
- Comptabilise le temps de pause
- Calcule la durée nette de travail

---

## 💡 Bonnes pratiques

### Pour les gestionnaires

1. **Créez des sessions à l'avance** pour planifier le ménage
2. **Assignez clairement** les responsables
3. **Consultez l'historique** régulièrement pour détecter les problèmes récurrents
4. **Utilisez les notes** pour communiquer des instructions spécifiques

### Pour les équipes de ménage

1. **Démarrez la session** dès votre arrivée
2. **Suivez l'ordre** des pièces pour une efficacité maximale
3. **Cochez chaque tâche** immédiatement après l'avoir faite
4. **Utilisez la pause** pendant les vraies pauses pour un temps précis
5. **Ajoutez des notes** pour tout problème ou observation
6. **Prenez des photos** en cas d'anomalie (fonctionnalité à venir)

### Pour la qualité

1. **Priorisez les tâches critiques** en rouge/orange
2. **Vérifiez toujours** avant de terminer
3. **Documentez** les problèmes rencontrés
4. **Comparez** avec les sessions précédentes
5. **Analysez les durées** pour optimiser

---

## 🎯 Indicateurs de performance

### KPIs à suivre

**Taux de complétion** :
```
Nombre de sessions terminées / Nombre total de sessions × 100
```

**Durée moyenne** :
```
Somme des durées / Nombre de sessions complétées
```

**Note moyenne de qualité** :
```
Somme des notes / Nombre de sessions notées
```

**Sessions par propriété** :
```
Nombre de sessions / Nombre de propriétés
```

---

## 🚧 Fonctionnalités à venir

### Court terme
- [ ] Upload de photos par tâche
- [ ] Signature digitale de validation
- [ ] Export PDF des checklists
- [ ] Notifications par email/SMS
- [ ] Mode hors ligne

### Moyen terme
- [ ] Templates personnalisés par propriété
- [ ] Gestion des fournitures et coûts
- [ ] Système de notation par le client
- [ ] Rapport de problèmes avec photos
- [ ] Calendrier de planification

### Long terme
- [ ] Application mobile dédiée
- [ ] Reconnaissance vocale
- [ ] IA pour détection de problèmes récurrents
- [ ] Intégration avec systèmes de gestion d'immeubles
- [ ] Benchmarking avec d'autres propriétés

---

## 🔐 Sécurité et confidentialité

- Les données sont stockées **localement** dans votre navigateur
- Aucune donnée n'est envoyée à des serveurs externes
- Sauvegarde automatique à chaque modification
- Pas de limite de stockage (selon la capacité du navigateur)

---

## 🛠️ Support technique

### Problèmes courants

**Les sessions ne se sauvent pas** :
- Vérifiez que le localStorage est activé
- Videz le cache du navigateur
- Essayez un autre navigateur

**Le timer ne démarre pas** :
- Rafraîchissez la page
- Vérifiez que JavaScript est activé
- Essayez de relancer la session

**Les statistiques sont incorrectes** :
- Attendez quelques secondes (calcul en cours)
- Rafraîchissez la page
- Vérifiez les dates des sessions

### Limites connues

- Pas de synchronisation multi-appareils
- Pas de sauvegarde cloud automatique
- Pas de collaboration temps réel

---

## 📊 Exemple de workflow complet

### Scénario : Ménage entre deux réservations

1. **Vendredi 10h** : Départ du client
2. **Vendredi 11h** : Gestionnaire crée une session
   - Propriété : "Appartement Centre-Ville"
   - Réservation : #123 (Check-in samedi 15h)
   - Assigné à : "Marie"
3. **Vendredi 13h** : Marie démarre la session
4. **Vendredi 13h-15h30** : Marie effectue le ménage
   - Coche les tâches au fur et à mesure
   - Pause déjeuner 20 minutes
   - Note : "Ampoule à changer dans salle de bain"
5. **Vendredi 15h30** : Marie termine la session
6. **Vendredi 16h** : Gestionnaire vérifie
   - Consulte les notes
   - Change l'ampoule
   - Marque comme "Vérifiée"

**Résultat** : Propriété prête pour l'arrivée du samedi, traçabilité complète

---

## 📈 Analyse des données

### Rapports disponibles

**Par session** :
- Durée totale
- Taux de complétion
- Tâches non effectuées
- Notes et observations

**Par propriété** :
- Nombre de nettoyages
- Durée moyenne
- Problèmes récurrents
- Coût total

**Par personne** :
- Nombre de sessions
- Durée moyenne
- Taux de complétion
- Évaluation qualité

---

## 🎓 Formation

### Pour les nouveaux utilisateurs

**Durée** : 15 minutes

**Programme** :
1. Création d'une session (3 min)
2. Navigation dans les pièces (2 min)
3. Utilisation du timer (2 min)
4. Complétion d'une session (3 min)
5. Consultation de l'historique (3 min)
6. Questions / Réponses (2 min)

---

## 📞 Contact et assistance

Pour toute question ou suggestion :
- Consultez d'abord cette documentation
- Vérifiez les problèmes courants ci-dessus
- Contactez l'équipe technique

---

## 🔄 Mises à jour

**Version actuelle : 2.0**

### Changelog

**v2.0 (2025-01-15)** :
- Refonte complète de l'interface
- Ajout de 6 zones de nettoyage détaillées
- Nouveau système de priorités
- Statistiques avancées
- Filtres et recherche améliorés
- Timer avec gestion des pauses
- Mode sombre optimisé

**v1.0 (2024-12-01)** :
- Version initiale
- Checklist basique
- Stockage localStorage

---

## 📝 Annexes

### Annexe A : Codes couleur des pièces

- 🏠 Entrée/Salon : Bleu → Cyan
- 🛏️ Chambre : Violet → Rose
- 🚿 Salle de bain : Turquoise → Émeraude
- 🍳 Cuisine : Orange → Rouge
- 🌳 Extérieur : Vert → Lime
- ✅ Contrôle : Indigo → Violet

### Annexe B : Raccourcis clavier (à venir)

- `N` : Nouvelle session
- `D` : Démarrer/Pause
- `C` : Terminer session
- `H` : Historique
- `S` : Statistiques

### Annexe C : Export de données

Format JSON disponible dans localStorage :
```json
{
  "id": "clean_1234567890_abc123",
  "propertyId": 1,
  "assignedTo": "Marie",
  "status": "completed",
  "rooms": [...],
  "createdAt": "2025-01-15T10:00:00Z",
  "completedAt": "2025-01-15T12:30:00Z"
}
```

---

**Dernière mise à jour : 15 janvier 2025**
**Version : 2.0**
**Auteur : BNBGest Team**
