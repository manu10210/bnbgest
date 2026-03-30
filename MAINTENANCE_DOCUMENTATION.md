# 🔧 Documentation - Maintenance Avancée

## Vue d'ensemble

Le **MaintenanceManagerAdvanced** est un système complet de gestion de maintenance pour les propriétés. Il offre des fonctionnalités avancées pour planifier, suivre et analyser toutes les tâches de maintenance.

---

## 📋 Table des Matières

1. [Fonctionnalités](#fonctionnalités)
2. [Onglets Principaux](#onglets-principaux)
3. [Gestion des Tâches](#gestion-des-tâches)
4. [Fournisseurs](#fournisseurs)
5. [Modèles de Tâches](#modèles-de-tâches)
6. [Tâches Récurrentes](#tâches-récurrentes)
7. [Analyses et Statistiques](#analyses-et-statistiques)
8. [Paramètres et Notifications](#paramètres-et-notifications)
9. [Export/Import](#exportimport)
10. [Cas d'Usage](#cas-dusage)

---

## ✨ Fonctionnalités

### 🎯 Fonctionnalités Principales

#### 1. **Gestion Complète des Tâches**
- ✅ Création, modification, suppression de tâches
- ✅ Statuts : En attente, En cours, Terminée, Annulée
- ✅ Priorités : Urgente, Haute, Moyenne, Basse
- ✅ Catégories : Nettoyage, Réparation, Inspection, Fournitures, Autre
- ✅ Coûts estimés et réels avec calcul des écarts
- ✅ Dates d'échéance avec détection des retards
- ✅ Notes et descriptions détaillées
- ✅ Pièces jointes (photos, documents, factures)
- ✅ Historique complet des actions

#### 2. **4 Modes d'Affichage**
- 🃏 **Cards** : Vue en cartes détaillées
- ☰ **Table** : Vue en tableau compact
- ⊞ **Kanban** : Vue par colonnes de statut
- ⏱️ **Timeline** : Vue chronologique

#### 3. **Filtres Avancés**
- 🔍 Recherche textuelle
- 📊 Filtres multiples : Statut, Priorité, Catégorie, Propriété, Fournisseur
- 📅 Filtres par période (date de/à)
- 🎯 Tri : Par priorité, date ou coût

#### 4. **Statistiques en Temps Réel**
- 📈 Nombre total de tâches
- ✅ Taux de complétion
- 💶 Coûts totaux et moyens
- ⚠️ Tâches en retard
- ⏱️ Délai moyen de complétion
- 📊 Performance par catégorie, priorité et propriété

---

## 📑 Onglets Principaux

### 1. 🔧 Tâches

L'onglet principal pour gérer toutes les tâches de maintenance.

**Fonctionnalités :**
- Liste de toutes les tâches
- Filtrage et recherche
- Changement de mode d'affichage
- Actions rapides : Démarrer, Terminer, Modifier
- Détails complets au clic

**KPIs Affichés :**
- Total des tâches
- Tâches en attente
- Tâches en cours
- Tâches terminées
- Tâches en retard
- Coût estimé total
- Coût réel total

### 2. 📅 Calendrier

Vue calendrier des tâches planifiées.

**Fonctionnalités :**
- Vue mensuelle, hebdomadaire, journalière
- Glisser-déposer pour replanifier
- Codes couleur par priorité/catégorie
- Vue agenda compacte

**À Implémenter :**
```typescript
// Utiliser react-calendar ou fullcalendar
import Calendar from 'react-calendar';
import FullCalendar from '@fullcalendar/react';
```

### 3. 👥 Fournisseurs

Gestion de la base de données des fournisseurs/prestataires.

**Informations Stockées :**
- Nom et catégorie (plomberie, électricité, nettoyage, jardinage)
- Coordonnées (téléphone, email, adresse)
- Note moyenne (système d'évaluation 5 étoiles)
- Nombre d'interventions réalisées
- Coût total des interventions
- Notes et commentaires

**Catégories de Fournisseurs :**
- 🔵 **Plomberie** : Plombiers, chauffagistes
- 🟡 **Électricité** : Électriciens
- 🟢 **Nettoyage** : Entreprises de nettoyage
- 🌿 **Jardinage** : Jardiniers, paysagistes
- ⚫ **Général** : Autres prestataires

**Actions Disponibles :**
- ➕ Ajouter un nouveau fournisseur
- ✏️ Modifier les informations
- 📞 Contacter directement (appel/email)
- 📊 Voir l'historique des interventions
- ⭐ Noter et commenter

### 4. 📝 Modèles

Bibliothèque de modèles de tâches réutilisables.

**Structure d'un Modèle :**
```typescript
{
  id: number;
  name: string;
  category: 'cleaning' | 'repair' | 'inspection' | 'supplies' | 'other';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  description: string;
  estimatedCost: number;
  estimatedDuration: number; // heures
  checklistItems: string[];
}
```

**Exemples de Modèles Prédéfinis :**

1. **Inspection Chauffage Annuelle**
   - Catégorie : Inspection
   - Priorité : Moyenne
   - Coût estimé : 150€
   - Durée : 2h
   - Checklist : 5 items

2. **Nettoyage Approfondi**
   - Catégorie : Nettoyage
   - Priorité : Basse
   - Coût estimé : 120€
   - Durée : 4h
   - Checklist : 6 items

3. **Réparation Plomberie Standard**
   - Catégorie : Réparation
   - Priorité : Haute
   - Coût estimé : 250€
   - Durée : 3h
   - Checklist : 5 items

**Utilisation :**
- Créer une tâche à partir d'un modèle en 1 clic
- Personnaliser avant création
- Modifier les modèles existants
- Créer de nouveaux modèles à partir de tâches récurrentes

### 5. 🔄 Récurrences

Automatisation des tâches répétitives.

**Fréquences Disponibles :**
- 📅 **Quotidien** : Tous les jours
- 📅 **Hebdomadaire** : Chaque semaine (jour configurable)
- 📅 **Mensuel** : Chaque mois (jour du mois configurable)
- 📅 **Trimestriel** : Tous les 3 mois
- 📅 **Annuel** : Chaque année (mois configurable)

**Configuration d'une Règle :**
```typescript
{
  id: number;
  taskTemplateId: number;      // Modèle de tâche à utiliser
  propertyId: number;          // Propriété concernée
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: number;          // 0-6 pour hebdomadaire
  dayOfMonth?: number;         // 1-31 pour mensuel
  monthOfYear?: number;        // 1-12 pour annuel
  nextDueDate: string;         // Prochaine création
  autoCreate: boolean;         // Création automatique ou notification
  active: boolean;             // Règle activée/désactivée
}
```

**Exemples d'Utilisation :**

1. **Nettoyage Hebdomadaire**
   ```typescript
   {
     taskTemplateId: 2, // Nettoyage approfondi
     propertyId: 1,
     frequency: 'weekly',
     dayOfWeek: 6, // Samedi
     autoCreate: true,
     active: true
   }
   ```

2. **Inspection Annuelle Chauffage**
   ```typescript
   {
     taskTemplateId: 1,
     propertyId: 1,
     frequency: 'yearly',
     monthOfYear: 9, // Septembre
     autoCreate: true,
     active: true
   }
   ```

3. **Contrôle Mensuel des Équipements**
   ```typescript
   {
     taskTemplateId: 3,
     propertyId: 1,
     frequency: 'monthly',
     dayOfMonth: 15,
     autoCreate: false, // Notification seulement
     active: true
   }
   ```

**Fonctionnement :**
1. Le système vérifie quotidiennement les règles actives
2. Si `nextDueDate` ≤ aujourd'hui :
   - Si `autoCreate: true` → Création automatique de la tâche
   - Si `autoCreate: false` → Notification envoyée
3. Calcul de la prochaine échéance selon la fréquence
4. Mise à jour de `nextDueDate`

### 6. 📊 Analyses

Tableaux de bord et visualisations avancées.

**Graphiques Disponibles :**

1. **Tendance des 6 Derniers Mois**
   - Histogramme du nombre de tâches par mois
   - Évolution du coût mensuel
   - Comparaison mois par mois

2. **Répartition par Catégorie**
   - Graphique à barres
   - Pourcentages
   - Nombre de tâches par catégorie

3. **Répartition par Priorité**
   - Visualisation des urgences
   - Identification des problèmes récurrents
   - Barres de progression colorées

4. **Performance par Propriété**
   - Nombre de tâches par propriété
   - Coût total par propriété
   - Comparaison entre propriétés
   - Identification des propriétés à forte maintenance

**Métriques Calculées :**

```typescript
interface MaintenanceStats {
  totalTasks: number;
  completedTasks: number;
  avgCompletionTime: number;        // en jours
  totalCost: number;
  avgCost: number;
  costVariance: number;             // % différence estimé vs réel
  onTimeCompletion: number;         // % de tâches terminées à temps
  overdueCount: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byProperty: Record<number, { count: number; cost: number }>;
  monthlyTrend: Array<{ month: string; count: number; cost: number }>;
}
```

**Exemples d'Insights :**
- "70% de vos tâches sont terminées à temps"
- "Le coût réel dépasse l'estimation de 12%"
- "La propriété 'Appartement Paris 15' génère 35% des coûts de maintenance"
- "Les réparations représentent 45% des tâches"
- "Délai moyen de complétion : 5,2 jours"

### 7. ⚙️ Paramètres

Configuration générale et notifications.

**Notifications Configurables :**

1. **Tâches à Venir**
   - Alerte X jours avant l'échéance
   - Email automatique
   - Destinataires multiples

2. **Tâches en Retard**
   - Notification quotidienne
   - Liste des tâches overdue
   - Escalade si non traitée

3. **Coût Élevé**
   - Alerte si coût > seuil défini
   - Validation requise
   - Notification au gestionnaire

4. **Rappels Récurrents**
   - Notifications pour tâches récurrentes
   - Résumé hebdomadaire
   - Planification mensuelle

**Préférences :**
- 💶 **Devise** : EUR, USD, GBP
- 📅 **Format de date** : JJ/MM/AAAA, MM/DD/YYYY, YYYY-MM-DD
- 🌍 **Langue** : Français, English, Español
- 🎨 **Thème** : Clair, Sombre, Auto
- 📧 **Email** : Fréquence des notifications
- 🔔 **Sons** : Activer/désactiver les sons

---

## 🔧 Gestion des Tâches

### Cycle de Vie d'une Tâche

```
[CRÉATION] → [EN ATTENTE] → [EN COURS] → [TERMINÉE]
                    ↓
              [ANNULÉE]
```

### Statuts

1. **📋 En Attente (pending)**
   - Tâche créée mais non démarrée
   - Couleur : Gris
   - Actions : Démarrer, Modifier, Annuler

2. **🔄 En Cours (in_progress)**
   - Tâche en cours d'exécution
   - Couleur : Bleu
   - Actions : Terminer, Modifier, Annuler

3. **✅ Terminée (completed)**
   - Tâche complétée avec succès
   - Couleur : Vert
   - Enregistrement du coût réel
   - Archivage automatique après 90 jours

4. **✕ Annulée (cancelled)**
   - Tâche abandonnée
   - Couleur : Rouge
   - Raison d'annulation requise

### Priorités

| Priorité | Icône | Couleur | Délai Recommandé | Usage |
|----------|-------|---------|------------------|-------|
| **Urgente** | 🔴 | Rouge | < 24h | Urgences (fuite, panne électrique) |
| **Haute** | 🟠 | Orange | < 3 jours | Problèmes importants |
| **Moyenne** | 🟡 | Jaune | < 7 jours | Maintenance standard |
| **Basse** | 🟢 | Vert | < 30 jours | Améliorations, cosmétique |

### Catégories

1. **🧹 Nettoyage**
   - Nettoyage entre locations
   - Nettoyage approfondi
   - Désinfection

2. **🔧 Réparation**
   - Plomberie
   - Électricité
   - Serrurerie
   - Chauffage/Climatisation

3. **🔍 Inspection**
   - Contrôles périodiques
   - Diagnostics
   - Audits de sécurité

4. **📦 Fournitures**
   - Réapprovisionnement
   - Achat d'équipements
   - Consommables

5. **⚙️ Autre**
   - Tâches diverses
   - Administratif

### Coûts

**Coût Estimé :**
- Renseigné à la création
- Base pour le budget
- Comparaison avec le réel

**Coût Réel :**
- Renseigné à la complétion
- Peut inclure : Main d'œuvre, Pièces, Déplacement
- Calcul de l'écart : `(Réel - Estimé) / Estimé * 100`

**Indicateurs :**
- ⬇️ **Économie** : Coût réel < Estimé (vert)
- ⬆️ **Dépassement** : Coût réel > Estimé (rouge)
- ✓ **Conforme** : Coût réel = Estimé (bleu)

### Pièces Jointes

**Types Supportés :**
- 📷 **Images** : Photos avant/après, diagnostics visuels
- 📄 **Documents** : Rapports, devis, guides
- 🧾 **Factures** : Justificatifs de paiement

**Métadonnées :**
```typescript
{
  id: number;
  taskId: number;
  type: 'image' | 'document' | 'invoice';
  name: string;
  url: string;
  uploadedAt: string;
  size: number; // en bytes
}
```

### Historique

Chaque action est tracée :

```typescript
{
  id: number;
  taskId: number;
  action: 'created' | 'updated' | 'started' | 'completed' | 'cancelled' | 'comment';
  user: string;
  timestamp: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}
```

**Exemples :**
- "Tâche créée par Admin le 28/03/2026 à 14:30"
- "Statut changé : En attente → En cours par Jean le 29/03/2026"
- "Priorité modifiée : Moyenne → Urgente par Admin"
- "Tâche terminée avec un coût de 245€ (estimé: 250€) le 30/03/2026"

---

## 👥 Fournisseurs

### Structure de Données

```typescript
interface Supplier {
  id: number;
  name: string;
  category: 'plumbing' | 'electrical' | 'cleaning' | 'gardening' | 'general';
  phone: string;
  email: string;
  address: string;
  rating: number;           // 0-5 étoiles
  completedJobs: number;
  totalCost: number;
  notes: string;
}
```

### Évaluation des Fournisseurs

**Système d'étoiles (0-5) :**
- ⭐⭐⭐⭐⭐ 5/5 : Excellent
- ⭐⭐⭐⭐ 4/5 : Très bien
- ⭐⭐⭐ 3/5 : Bien
- ⭐⭐ 2/5 : Moyen
- ⭐ 1/5 : Insuffisant

**Critères d'Évaluation :**
1. Qualité du travail
2. Respect des délais
3. Tarifs
4. Communication
5. Professionnalisme

### Indicateurs de Performance

**Métriques par Fournisseur :**
- Nombre d'interventions réalisées
- Coût total dépensé
- Coût moyen par intervention
- Note moyenne
- Délai moyen d'intervention
- Taux de satisfaction
- Problèmes récurrents

**Rapport Mensuel :**
```
Fournisseur : Plomberie Dupont
Interventions : 8
Coût total : 2,450€
Coût moyen : 306€
Note : 4.5/5
Commentaires : "Excellent service, très réactif"
```

---

## 📝 Modèles de Tâches

### Avantages

1. **Gain de Temps** : Création en 1 clic
2. **Standardisation** : Processus uniformes
3. **Qualité** : Checklists prédéfinies
4. **Formation** : Guide pour nouveaux employés
5. **Budgétisation** : Coûts prévisibles

### Création d'un Modèle

**Étapes :**
1. Définir le nom et la description
2. Choisir catégorie et priorité
3. Estimer coût et durée
4. Créer la checklist
5. Ajouter des notes/instructions
6. Sauvegarder

**Exemple Complet :**

```typescript
{
  name: "Inspection Chauffage Annuelle",
  category: "inspection",
  priority: "medium",
  description: "Vérification complète du système de chauffage avant l'hiver",
  estimatedCost: 150,
  estimatedDuration: 2,
  checklistItems: [
    "Vérifier l'état de la chaudière",
    "Contrôler tous les radiateurs",
    "Tester le thermostat",
    "Purger le système si nécessaire",
    "Vérifier la pression du circuit",
    "Nettoyer les filtres",
    "Tester la soupape de sécurité",
    "Vérifier les joints et raccords",
    "Mesurer le rendement",
    "Établir le rapport d'inspection"
  ],
  notes: "À effectuer chaque année en septembre, avant la période de chauffe. Contacter Chauffage Martin."
}
```

### Bibliothèque de Modèles

**Nettoyage :**
- Nettoyage standard entre locations
- Nettoyage approfondi mensuel
- Désinfection complète
- Nettoyage vitres
- Nettoyage moquettes

**Réparations :**
- Réparation plomberie standard
- Intervention électrique
- Remplacement serrure
- Réparation chauffage
- Réparation climatisation

**Inspections :**
- Inspection trimestrielle
- Contrôle sécurité incendie
- Vérification conformité électrique
- Inspection post-location
- Audit énergétique

**Fournitures :**
- Réapprovisionnement linges
- Achat produits ménagers
- Remplacement équipements
- Achat mobilier

---

## 🔄 Tâches Récurrentes

### Fonctionnement

```
┌─────────────────┐
│  Règle Active   │
└────────┬────────┘
         │
         ▼
   ┌──────────────┐
   │ Vérification │ (Quotidienne)
   │   Système    │
   └──────┬───────┘
          │
          ▼
     Date atteinte?
          │
    ┌─────┴─────┐
    │ OUI       │ NON → Attendre
    ▼           │
┌─────────────┐ │
│ Création    │ │
│ Automatique │ │
│   ou        │ │
│Notification │ │
└──────┬──────┘ │
       │        │
       ▼        │
 ┌────────────┐ │
 │ Calculer   │ │
 │ Prochaine  │ │
 │  Échéance  │ │
 └──────┬─────┘ │
        │       │
        └───────┘
```

### Exemples de Configuration

**1. Nettoyage Hebdomadaire (Airbnb)**

```typescript
{
  taskTemplateId: 2, // Nettoyage approfondi
  propertyId: 1,     // Appartement Paris
  frequency: 'weekly',
  dayOfWeek: 6,      // Samedi
  nextDueDate: '2026-04-05',
  autoCreate: true,
  active: true
}
```

**Résultat :**
- Chaque samedi, création automatique d'une tâche de nettoyage
- Tâche prévue pour le samedi même
- Notification envoyée au prestataire
- Mise à jour automatique pour le samedi suivant

**2. Inspection Mensuelle**

```typescript
{
  taskTemplateId: 3,  // Inspection équipements
  propertyId: 1,
  frequency: 'monthly',
  dayOfMonth: 1,      // 1er du mois
  nextDueDate: '2026-04-01',
  autoCreate: false,  // Notification seulement
  active: true
}
```

**Résultat :**
- Le 1er de chaque mois, notification au gestionnaire
- Pas de création automatique
- Permet validation manuelle avant création

**3. Entretien Annuel Chaudière**

```typescript
{
  taskTemplateId: 1,  // Inspection chauffage
  propertyId: 1,
  frequency: 'yearly',
  monthOfYear: 9,     // Septembre
  dayOfMonth: 15,     // 15 septembre
  nextDueDate: '2026-09-15',
  autoCreate: true,
  active: true
}
```

**Résultat :**
- Chaque 15 septembre, création automatique
- Anticipation de la période de chauffe
- Respect des obligations légales

### Gestion des Récurrences

**Activation/Désactivation :**
- Toggle simple pour activer/désactiver
- Règles désactivées conservent leur configuration
- Réactivation reprend là où ça s'est arrêté

**Modification :**
- Changer la fréquence
- Modifier le template utilisé
- Ajuster les jours/mois
- Modifier autoCreate

**Suppression :**
- Suppression de la règle
- N'affecte pas les tâches déjà créées
- Confirmation requise

**Historique :**
- Logs de toutes les créations
- Traçabilité complète
- Statistiques d'utilisation

---

## 📊 Analyses et Statistiques

### Dashboard Principal

**4 KPIs Clés :**

1. **Total Tâches**
   - Nombre total
   - Taux de complétion
   - Tendance (↗ ↘)

2. **Coût Total**
   - Somme des coûts réels
   - Variance vs estimé
   - Budget restant

3. **Délai Moyen**
   - En jours
   - % terminées à temps
   - Comparaison avec période précédente

4. **En Retard**
   - Nombre absolu
   - Liste des urgences
   - Actions recommandées

### Graphiques et Visualisations

**1. Tendance Mensuelle**
```
Tâches |
  30   |     ╭─╮
  25   |   ╭─╯ │
  20   | ╭─╯   │
  15   |─╯     ╰─╮
  10   |         ╰─╮
   5   |           ╰─
   0   |____________
       J F M A M J
```

**2. Répartition par Catégorie**
```
Nettoyage    ████████████░░░░░░░░  60% (18)
Réparation   ██████████░░░░░░░░░░  50% (15)
Inspection   ████░░░░░░░░░░░░░░░░  20% (6)
Fournitures  ██░░░░░░░░░░░░░░░░░░  10% (3)
Autre        █░░░░░░░░░░░░░░░░░░░   5% (2)
```

**3. Répartition par Priorité**
```
Urgente      ██░░░░░░░░░░░░░░░░░░  10% (3)
Haute        ████████░░░░░░░░░░░░  40% (12)
Moyenne      ████████████░░░░░░░░  60% (18)
Basse        ██████░░░░░░░░░░░░░░  30% (9)
```

**4. Coûts par Propriété**
```
Appt Paris   ████████████████████ 4,500€
Maison Lyon  ██████████████░░░░░░ 3,200€
Studio Nice  ████████░░░░░░░░░░░░ 1,800€
Villa Bordeaux ██████░░░░░░░░░░░░ 1,200€
```

### Rapports Générés

**Rapport Mensuel :**
```
=== RAPPORT MAINTENANCE - MARS 2026 ===

📊 Activité :
- Tâches créées : 28
- Tâches terminées : 24
- Tâches en cours : 3
- Tâches en retard : 1
- Taux de complétion : 85.7%

💶 Financier :
- Coûts estimés : 3,450€
- Coûts réels : 3,680€
- Variance : +6.7%
- Économies : -230€

⏱️ Performance :
- Délai moyen : 4.8 jours
- % à temps : 78%
- Tâches urgentes : 2

🏠 Par Propriété :
- Appartement Paris : 12 tâches, 1,580€
- Maison Lyon : 8 tâches, 980€
- Studio Nice : 6 tâches, 720€
- Villa Bordeaux : 2 tâches, 400€

📋 Par Catégorie :
- Nettoyage : 40%
- Réparation : 35%
- Inspection : 15%
- Fournitures : 10%

👥 Top Fournisseurs :
1. Plomberie Dupont : 8 interventions, 1,240€, 4.5⭐
2. Clean & Shine : 12 interventions, 960€, 4.2⭐
3. Électricité Martin : 5 interventions, 750€, 4.8⭐

🎯 Recommandations :
- Anticiper la maintenance de la chaudière (Septembre)
- Réviser les contrats de nettoyage (coûts en hausse)
- Former l'équipe sur les nouvelles procédures
```

**Rapport Annuel :**
```
=== RAPPORT ANNUEL 2026 ===

📈 Évolution :
- T1 : 78 tâches, 8,900€
- T2 : 82 tâches, 9,450€
- T3 : 91 tâches, 10,200€
- T4 : 85 tâches, 9,650€
- Total : 336 tâches, 38,200€

📊 Tendances :
- Augmentation de 12% des tâches vs 2025
- Coûts stables (+3%)
- Amélioration du délai moyen (-15%)
- Meilleure anticipation (récurrences)

🏆 Succès :
- 0 urgence non traitée
- 92% de satisfaction fournisseurs
- Automatisation de 60% des tâches
- Réduction des coûts de 8%

⚠️ Points d'Attention :
- Propriété Paris : maintenance élevée
- Plomberie : interventions fréquentes
- Budget dépassé en Juillet et Décembre
```

---

## ⚙️ Paramètres et Notifications

### Configuration des Notifications

**Types de Notifications :**

1. **Tâches à Venir**
   ```
   Objet : 🔔 Tâche à venir dans 3 jours
   
   Bonjour,
   
   La tâche suivante est prévue dans 3 jours :
   
   📋 Nettoyage approfondi
   🏠 Appartement Paris
   📅 31/03/2026
   💶 Coût estimé : 120€
   👤 Assignée à : Clean & Shine
   
   Merci de confirmer la disponibilité.
   
   Cordialement,
   BNBGest
   ```

2. **Tâches en Retard**
   ```
   Objet : ⚠️ Tâche en retard : Action requise
   
   Attention,
   
   La tâche suivante est en retard de 2 jours :
   
   📋 Réparation fuite cuisine
   🏠 Studio Nice
   🔴 Priorité : URGENTE
   📅 Échéance : 26/03/2026
   
   Statut actuel : En attente
   
   Action immédiate requise.
   
   BNBGest
   ```

3. **Coût Élevé**
   ```
   Objet : 💶 Tâche à coût élevé - Validation requise
   
   Une nouvelle tâche avec un coût élevé nécessite votre validation :
   
   📋 Remplacement chaudière
   🏠 Maison Lyon
   💶 Coût estimé : 4,500€
   ⚠️ Seuil d'alerte : 3,000€
   
   Veuillez valider ou ajuster avant création.
   
   BNBGest
   ```

4. **Récurrence Créée**
   ```
   Objet : 🔄 Nouvelle tâche récurrente créée
   
   Une tâche récurrente a été créée automatiquement :
   
   📋 Nettoyage hebdomadaire
   🏠 Appartement Paris
   📅 05/04/2026
   🔄 Récurrence : Hebdomadaire (Samedi)
   
   Prochaine création : 12/04/2026
   
   BNBGest
   ```

### Préférences

**Interface :**
- Langue d'affichage
- Thème (clair/sombre)
- Devise
- Format de date
- Fuseau horaire

**Notifications :**
- Email activé/désactivé
- Fréquence des digests
- Types de notifications
- Destinataires par défaut
- Sons d'alerte

**Affichage :**
- Nombre d'éléments par page
- Colonnes visibles dans les tableaux
- Ordre de tri par défaut
- Filtres sauvegardés

**Sécurité :**
- Historique des connexions
- Activité du compte
- Préférences de confidentialité
- Partage de données

---

## 💾 Export / Import

### Export

**Formats Disponibles :**
- 📄 JSON : Toutes les données
- 📊 Excel : Tableaux et statistiques
- 📋 PDF : Rapports imprimables
- 📧 CSV : Import dans d'autres outils

**Contenu Exporté :**
```json
{
  "exportDate": "2026-03-28T10:30:00Z",
  "version": "1.0",
  "tasks": [...],
  "suppliers": [...],
  "templates": [...],
  "recurringRules": [...],
  "attachments": [...],
  "history": [...],
  "stats": {...}
}
```

**Utilisation :**
1. Cliquer sur "Exporter"
2. Choisir le format
3. Sélectionner la période
4. Télécharger le fichier

### Import

**Sources Acceptées :**
- Fichiers BNBGest (JSON)
- Excel standardisé
- CSV avec mapping
- Autres logiciels (via conversion)

**Processus :**
1. Validation du format
2. Vérification des données
3. Résolution des conflits
4. Importation
5. Rapport de résultat

**Gestion des Doublons :**
- Ignorer
- Remplacer
- Fusionner
- Créer nouveau

**Logs d'Import :**
```
=== IMPORT DU 28/03/2026 ===

✅ 45 tâches importées
✅ 8 fournisseurs importés
✅ 12 modèles importés
⚠️ 2 doublons détectés (fusionnés)
❌ 1 tâche invalide (ignorée)

Durée : 2.3 secondes
Fichier : backup-2026-03-28.json
```

---

## 🎯 Cas d'Usage

### Cas 1 : Location Airbnb

**Contexte :**
- Appartement loué à la semaine
- Nettoyage entre chaque location
- Inspections régulières

**Configuration :**

1. **Modèle de Nettoyage**
   ```typescript
   {
     name: "Nettoyage Airbnb Standard",
     category: "cleaning",
     priority: "high",
     estimatedCost: 80,
     estimatedDuration: 3,
     checklistItems: [
       "Aspirer tous les sols",
       "Nettoyer la salle de bain",
       "Nettoyer la cuisine",
       "Changer les draps",
       "Vérifier les équipements",
       "Jeter les poubelles",
       "Aérer les pièces"
     ]
   }
   ```

2. **Récurrence Hebdomadaire**
   ```typescript
   {
     taskTemplateId: 1,
     propertyId: 1,
     frequency: 'weekly',
     dayOfWeek: 6, // Samedi
     autoCreate: true
   }
   ```

3. **Inspection Mensuelle**
   ```typescript
   {
     name: "Inspection Post-Location",
     category: "inspection",
     priority: "medium",
     frequency: 'monthly',
     dayOfMonth: 1
   }
   ```

**Résultat :**
- Nettoyage automatique chaque samedi
- Inspection le 1er de chaque mois
- Budget maîtrisé (80€/semaine)
- Qualité constante
- Gain de temps : 15 min/semaine

### Cas 2 : Immeuble de Rapport

**Contexte :**
- 8 appartements
- Parties communes
- Équipements collectifs

**Configuration :**

1. **Modèle Entretien Parties Communes**
   ```typescript
   {
     name: "Entretien Hebdomadaire Parties Communes",
     category: "cleaning",
     checklistItems: [
       "Nettoyer l'entrée",
       "Nettoyer les escaliers",
       "Vider les boîtes aux lettres publicitaires",
       "Arroser les plantes",
       "Vérifier l'éclairage"
     ]
   }
   ```

2. **Contrôle Ascenseur**
   ```typescript
   {
     name: "Contrôle Trimestriel Ascenseur",
     category: "inspection",
     priority: "high",
     frequency: 'quarterly'
   }
   ```

3. **Fournisseurs Spécialisés**
   - Société de nettoyage
   - Technicien ascenseur
   - Plombier d'urgence
   - Électricien

**Résultat :**
- Entretien régulier assuré
- Conformité réglementaire
- Coûts partagés entre locataires
- Traçabilité complète

### Cas 3 : Villa de Luxe

**Contexte :**
- Location saisonnière haut de gamme
- Équipements premium (piscine, jacuzzi)
- Exigences qualité élevées

**Configuration :**

1. **Entretien Piscine**
   ```typescript
   {
     name: "Entretien Piscine Hebdomadaire",
     category: "maintenance",
     checklistItems: [
       "Tester le pH",
       "Ajouter les produits",
       "Nettoyer les filtres",
       "Aspirer le fond",
       "Vérifier le robot",
       "Nettoyer la ligne d'eau"
     ],
     frequency: 'weekly'
   }
   ```

2. **Jardinier**
   ```typescript
   {
     name: "Entretien Jardin",
     frequency: 'weekly',
     supplier: "Jardins de Provence",
     estimatedCost: 200
   }
   ```

3. **Contrôle Qualité Pré-Arrivée**
   ```typescript
   {
     name: "Checklist VIP",
     checklistItems: [
       "Vérifier tous les équipements",
       "Tester la domotique",
       "Contrôler le jacuzzi",
       "Vérifier la piscine",
       "Disposer les fleurs fraîches",
       "Remplir le bar",
       "Contrôler la climatisation",
       "Tester tous les appareils"
     ]
   }
   ```

**Résultat :**
- Service 5 étoiles
- Anticipation des problèmes
- Satisfaction client maximale
- Rentabilité optimisée

---

## 🚀 Fonctionnalités Avancées

### Intégrations

**Calendriers :**
- Google Calendar
- iCal
- Outlook

**Messagerie :**
- Email (Gmail, Outlook)
- SMS
- WhatsApp

**Comptabilité :**
- Export vers logiciels comptables
- Synchronisation des factures
- Budget prévisionnel

**IoT :**
- Capteurs de maintenance
- Alertes automatiques
- Domotique

### Automatisations

**Workflows :**
```
Tâche en retard > 3 jours
    ↓
Changement priorité → URGENTE
    ↓
Notification manager
    ↓
Escalade si pas de réponse (24h)
    ↓
Création tâche alternative
```

**Règles Métier :**
- Si coût > 1000€ → Approbation requise
- Si urgente → Notification SMS immédiate
- Si fournisseur indisponible → Proposer alternatives
- Si tâche récurrente → Ajustement automatique prix

### Intelligence Artificielle

**Prédictions :**
- Estimation automatique des coûts
- Prédiction des pannes
- Optimisation des plannings
- Recommandations de fournisseurs

**Analyse :**
- Détection des anomalies
- Identification des tendances
- Optimisation budgétaire
- Priorisation intelligente

---

## 📚 Annexes

### Glossaire

- **KPI** : Key Performance Indicator (Indicateur clé de performance)
- **SLA** : Service Level Agreement (Accord de niveau de service)
- **MTBF** : Mean Time Between Failures (Temps moyen entre pannes)
- **MTTR** : Mean Time To Repair (Temps moyen de réparation)
- **ROI** : Return On Investment (Retour sur investissement)

### Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + N` | Nouvelle tâche |
| `Ctrl + F` | Rechercher |
| `Ctrl + E` | Exporter |
| `Ctrl + I` | Importer |
| `Ctrl + ,` | Paramètres |
| `Ctrl + 1-7` | Changer d'onglet |
| `Esc` | Fermer modal |
| `Enter` | Valider formulaire |

### Support et Ressources

- 📧 **Email** : support@bnbgest.com
- 💬 **Chat** : chat.bnbgest.com
- 📚 **Documentation** : docs.bnbgest.com
- 🎥 **Tutoriels** : youtube.com/bnbgest
- 🐛 **Bugs** : github.com/bnbgest/issues

### Feuille de Route

**Version 2.0 (Q3 2026) :**
- [ ] Application mobile
- [ ] Mode hors ligne
- [ ] IA prédictive avancée
- [ ] Intégrations tierces

**Version 2.1 (Q4 2026) :**
- [ ] Réalité augmentée pour inspections
- [ ] Assistant vocal
- [ ] Blockchain pour traçabilité
- [ ] Multi-devise dynamique

---

**Dernière mise à jour** : 28 Mars 2026  
**Version** : 1.0.0  
**Auteur** : BNBGest Team
