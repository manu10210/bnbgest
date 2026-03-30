# 📸 Documentation Galerie Avant/Après Ménage

> **Version** : 2.0  
> **Dernière mise à jour** : Janvier 2025  
> **Composant** : `CleaningGallery.tsx`

---

## 📑 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Fonctionnalités principales](#fonctionnalités-principales)
3. [Guide d'utilisation](#guide-dutilisation)
4. [Gestion des photos](#gestion-des-photos)
5. [Modes d'affichage](#modes-daffichage)
6. [Comparaison avant/après](#comparaison-avantaprès)
7. [Workflow de validation](#workflow-de-validation)
8. [Statistiques et rapports](#statistiques-et-rapports)
9. [Export et partage](#export-et-partage)
10. [Optimisation et bonnes pratiques](#optimisation-et-bonnes-pratiques)

---

## 🎯 Vue d'ensemble

La **Galerie Avant/Après Ménage** est un système complet de documentation photographique permettant de suivre et valider la qualité des interventions de ménage. Elle offre une interface professionnelle pour capturer, organiser, comparer et valider les photos de ménage avant et après chaque session.

### Objectifs principaux

- 📷 **Documentation visuelle** : Capture systématique des états avant/après
- ✅ **Validation qualité** : Workflow d'approbation avec notation
- 📊 **Suivi performance** : Statistiques et métriques de nettoyage
- 🔍 **Comparaison facile** : Outils de comparaison côte à côte
- 📦 **Export professionnel** : Génération de rapports et archives

---

## ⚡ Fonctionnalités principales

### Gestion des sessions

- ✅ Création de sessions par propriété
- ✅ Association aux réservations
- ✅ Suivi multi-pièces (10 types de pièces)
- ✅ Attribution au personnel
- ✅ Statuts multiples (5 états)
- ✅ Horodatage automatique
- ✅ Notes et commentaires

### Gestion des photos

- 📸 Upload multiple de photos
- 📸 Catégorisation avant/après
- 📸 Organisation par pièce
- 📸 Métadonnées automatiques (dimensions, taille, date)
- 📸 Tags et annotations
- 📸 Notation individuelle
- 📸 Suppression sélective

### Visualisation

- 👁️ Mode grille (aperçu rapide)
- 👁️ Mode liste (détails complets)
- 👁️ Mode comparaison (côte à côte)
- 👁️ Visionneuse plein écran
- 👁️ Zoom et rotation
- 👁️ Diaporama automatique

### Filtres et recherche

- 🔍 Recherche textuelle
- 🔍 Filtre par propriété
- 🔍 Filtre par statut
- 🔍 Filtre par pièce
- 🔍 Filtre par date
- 🔍 Tri multiple

---

## 📖 Guide d'utilisation

### 1. Créer une nouvelle session

**Étapes** :

1. Cliquez sur **"Nouvelle session"** en haut à droite
2. Remplissez le formulaire :
   - **Propriété** * (obligatoire)
   - **Réservation** (optionnel - se remplit automatiquement selon la propriété)
   - **Effectué par** * (nom du personnel)
   - **Pièces à nettoyer** * (sélection multiple)
   - **Notes** (instructions, remarques)
3. Cliquez sur **"Créer"**

**Résultat** : Une nouvelle session est créée avec le statut "En cours" et s'ouvre automatiquement pour l'ajout de photos.

---

### 2. Ajouter des photos

**Méthode 1 : Upload depuis la fiche session**

1. Ouvrez une session (clic sur une carte)
2. Dans chaque pièce, cliquez sur :
   - **Bouton "Avant"** (rouge) pour les photos avant nettoyage
   - **Bouton "Après"** (vert) pour les photos après nettoyage
3. Sélectionnez une ou plusieurs photos
4. Les photos sont automatiquement ajoutées et classées

**Méthode 2 : Upload multiple**

1. Utilisez le bouton d'upload dans la zone de comparaison
2. Sélectionnez plusieurs photos simultanément
3. Elles seront ajoutées à la pièce active

**💡 Astuce** : Prenez toujours les photos "Avant" en premier pour garder une organisation claire.

---

### 3. Visualiser et gérer les photos

**Visionneuse plein écran** :

- **Clic sur une photo** → Ouvre en plein écran
- **Molette souris** → Zoom in/out
- **Boutons de contrôle** :
  - 🔍+ Zoom in
  - 🔍- Zoom out
  - 🔄 Rotation 90°
  - ♻️ Réinitialiser

**Informations affichées** :
- Type (AVANT/APRÈS)
- Pièce concernée
- Date et heure
- Dimensions (largeur × hauteur)
- Uploadé par (nom du personnel)

**Suppression** :
- Survolez une miniature
- Cliquez sur l'icône 🗑️ (poubelle)
- Confirmez la suppression

---

## 🖼️ Gestion des photos

### Types de pièces supportées

| Pièce | Icône | Code |
|-------|-------|------|
| Chambre | 🛏️ | `bedroom` |
| Salle de bain | 🚿 | `bathroom` |
| Cuisine | 🍳 | `kitchen` |
| Salon | 🛋️ | `livingRoom` |
| Terrasse | 🌿 | `terrace` |
| Entrée | 🚪 | `entrance` |
| Bureau | 💼 | `office` |
| Buanderie | 🧺 | `laundry` |
| Garage | 🚗 | `garage` |
| Jardin | 🌻 | `garden` |

### Métadonnées automatiques

Chaque photo capture automatiquement :

```typescript
{
  id: "cp_1234567890_abc123",
  url: "data:image/jpeg;base64,...",
  type: "before" | "after",
  room: "bedroom",
  timestamp: "2025-01-14T10:30:00.000Z",
  size: 2458624, // bytes
  width: 1920,
  height: 1080,
  uploadedBy: "Marie Dupont"
}
```

### Bonnes pratiques photo

✅ **À FAIRE** :
- Prenez les photos avant ET après pour chaque pièce
- Utilisez un bon éclairage naturel
- Cadrez de manière cohérente (même angle avant/après)
- Incluez les zones problématiques
- Photographiez les détails importants

❌ **À ÉVITER** :
- Photos floues ou mal éclairées
- Angles incohérents entre avant/après
- Photos trop lourdes (> 5MB)
- Oublier des pièces

---

## 👁️ Modes d'affichage

### Mode Grille (Grid)

**Idéal pour** : Vue d'ensemble rapide de toutes les sessions

**Caractéristiques** :
- Cartes compactes en grille 3 colonnes
- Aperçu avant/après côte à côte
- Badge de statut coloré
- Informations clés (propriété, date, personnel)
- Compteur de photos par type
- Liste des pièces concernées

**Clic** : Ouvre la session en détail

---

### Mode Liste (List)

**Idéal pour** : Analyse détaillée et actions rapides

**Caractéristiques** :
- Vue en ligne complète
- Toutes les métadonnées visibles
- Boutons d'action rapide :
  - 📋 Dupliquer la session
  - 🗑️ Supprimer la session
- Note globale si disponible
- Statut en grand format

**Actions** :
- Clic sur la ligne → Ouvre en détail
- Clic sur les boutons → Actions directes

---

### Mode Comparaison (Comparison)

**Idéal pour** : Validation qualité et inspection visuelle

**Caractéristiques** :
- Affichage côte à côte strict
- Une paire avant/après par ligne
- Regroupement par pièce
- Zoom synchronisé (option)
- Boutons d'ajout si photo manquante

**Utilisation** :
1. Sélectionnez une session
2. Cliquez sur "Mode comparaison"
3. Parcourez les paires de photos
4. Validez ou rejetez la session

---

## 🔍 Comparaison avant/après

### Paires de comparaison

Le système crée automatiquement des **paires de comparaison** :

- **1 paire = 1 photo avant + 1 photo après** pour une même pièce
- Si plusieurs photos avant/après, crée plusieurs paires
- Si photo manquante, propose l'ajout

**Exemple** : 

```
Cuisine :
  Paire 1 : [Avant-1.jpg] ↔ [Après-1.jpg]
  Paire 2 : [Avant-2.jpg] ↔ [Après-2.jpg]
```

---

### Outils de comparaison

**Fonctionnalités disponibles** :

1. **Affichage côte à côte** :
   - Vue claire des deux états
   - Même hauteur pour faciliter la comparaison

2. **Zoom synchronisé** (à venir) :
   - Zoom identique sur les deux photos
   - Navigation synchronisée

3. **Superposition** (à venir) :
   - Curseur de transition
   - Effet "avant/après" interactif

4. **Annotations** (à venir) :
   - Marquer les zones d'intérêt
   - Signaler les problèmes

---

## ✅ Workflow de validation

### Statuts de session

```
┌─────────────┐
│  PENDING    │ ──┐
│  (En attente)│   │
└─────────────┘   │
                  ▼
┌─────────────┐  ┌─────────────┐
│ IN_PROGRESS │─→│  COMPLETED  │
│  (En cours) │  │  (Terminée) │
└─────────────┘  └─────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────┐             ┌─────────────┐
│  VALIDATED  │             │  REJECTED   │
│  (Validée)  │             │  (Rejetée)  │
└─────────────┘             └─────────────┘
```

---

### Processus de validation

**Étape 1 : Création**
- Statut initial : **EN COURS**
- Le personnel ajoute les photos
- Champs requis : propriété, pièces, personnel

**Étape 2 : Complétion**
- Le personnel clique sur **"Marquer terminée"**
- Statut change : **TERMINÉE**
- Prêt pour validation

**Étape 3 : Validation/Rejet**

**Option A : Validation** ✅
1. Clic sur **"Valider"**
2. Saisie d'une note (1-5)
3. Enregistrement :
   - `status = "validated"`
   - `validatedBy = "Admin"`
   - `validatedAt = Date actuelle`
   - `overallRating = Note saisie`

**Option B : Rejet** ❌
1. Clic sur **"Rejeter"**
2. Saisie de la raison
3. Enregistrement :
   - `status = "rejected"`
   - `rejectedReason = Raison saisie`
4. Le personnel peut corriger et resoumettre

---

### Critères de validation

**✅ Session validable** :
- ✔️ Photos avant ET après pour chaque pièce
- ✔️ Photos de bonne qualité (nettes, bien cadrées)
- ✔️ Amélioration visible entre avant/après
- ✔️ Toutes les pièces couvertes
- ✔️ Pas de zones manquées

**❌ Motifs de rejet** :
- ❌ Photos manquantes
- ❌ Photos de mauvaise qualité
- ❌ Ménage incomplet
- ❌ Problèmes non résolus
- ❌ Zones sales visibles sur photos "après"

---

## 📊 Statistiques et rapports

### Tableau de bord

**6 indicateurs clés** (KPI) :

1. **Total sessions** 📁
   - Nombre total de sessions créées
   - Toutes périodes confondues

2. **Sessions validées** ✅
   - Nombre de sessions avec statut "Validée"
   - Indicateur de qualité

3. **Sessions en cours** 🔄
   - Sessions actives en ce moment
   - Charge de travail actuelle

4. **Total photos** 📷
   - Nombre cumulé de toutes les photos
   - Volume de documentation

5. **Note moyenne** ⭐
   - Moyenne des notes de validation
   - Sur une échelle de 1 à 5
   - Indicateur de satisfaction

6. **Taux de validation** 📈
   - % de sessions validées / total
   - Indicateur de performance

---

### Interprétation des métriques

**Note moyenne** :
- 4.5 - 5.0 : ⭐⭐⭐⭐⭐ Excellent
- 4.0 - 4.4 : ⭐⭐⭐⭐ Très bien
- 3.5 - 3.9 : ⭐⭐⭐ Bien
- 3.0 - 3.4 : ⭐⭐ Moyen
- < 3.0 : ⭐ À améliorer

**Taux de validation** :
- > 90% : Performance excellente
- 80-90% : Performance bonne
- 70-80% : Performance acceptable
- < 70% : Amélioration nécessaire

---

### Filtres avancés

**Recherche textuelle** :
- Nom de propriété
- Nom du personnel
- Notes de session

**Filtres disponibles** :
1. **Par propriété** : Sélection dans liste déroulante
2. **Par statut** : En attente, En cours, Terminée, Validée, Rejetée
3. **Par pièce** : Toutes les 10 types de pièces
4. **Par date** : Plage de dates (à venir)

**Tri** :
- Par date (plus récent d'abord)
- Par propriété (ordre alphabétique)
- Par statut (ordre logique)
- Par note (meilleures notes d'abord)

---

## 📦 Export et partage

### Export de session

**Fonctionnalité** : Bouton "Exporter" dans chaque session

**Format** : JSON

**Contenu exporté** :
```json
{
  "session": {
    "id": "cs_1234567890_abc123",
    "propertyId": 1,
    "date": "2025-01-14T10:30:00.000Z",
    "status": "validated",
    "completedBy": "Marie Dupont",
    "rooms": ["bedroom", "bathroom", "kitchen"],
    "photos": [...],
    "notes": "RAS",
    "overallRating": 5
  },
  "property": {
    "id": 1,
    "name": "Villa Côte d'Azur"
  },
  "exportDate": "2025-01-14T15:45:00.000Z"
}
```

**Utilisation** :
- Sauvegarde locale
- Archivage
- Envoi au client
- Import dans autre système

---

### Export photo (à venir)

**Formats prévus** :
- **ZIP** : Archive toutes les photos d'une session
- **PDF** : Rapport avec photos avant/après
- **Images** : Téléchargement individuel

---

### Partage client (à venir)

**Lien de partage** :
- Génération d'URL unique
- Accès limité dans le temps
- Vue lecture seule
- Pas d'édition possible

---

## ⚙️ Optimisation et bonnes pratiques

### Performance

**Stockage** :
- Utilise `localStorage` (limite ~5-10MB selon navigateur)
- Photos stockées en base64
- Compression recommandée avant upload

**⚠️ Limitations** :
- Environ 20-50 photos selon qualité
- Si limite atteinte → Utiliser export pour archiver et nettoyer

**Solutions futures** :
- Migration vers IndexedDB (100MB+)
- Upload vers serveur cloud
- Compression automatique

---

### Qualité des photos

**Recommandations** :

1. **Résolution** :
   - Minimum : 1280×720 (HD)
   - Optimal : 1920×1080 (Full HD)
   - Maximum : 3840×2160 (4K)

2. **Taille fichier** :
   - Idéal : < 1MB par photo
   - Maximum : < 3MB par photo
   - Compresser si > 3MB

3. **Éclairage** :
   - Lumière naturelle de préférence
   - Éviter contre-jour
   - Allumer lumières d'appoint si besoin

4. **Cadrage** :
   - Garder même angle avant/après
   - Capturer toute la zone concernée
   - Éviter objets personnels dans le cadre

---

### Organisation

**Workflow recommandé** :

1. **Avant le ménage** :
   - Créer la session
   - Prendre toutes les photos "Avant"
   - Vérifier que toutes les pièces sont couvertes

2. **Pendant le ménage** :
   - Travailler pièce par pièce
   - Cocher mentalement les zones faites

3. **Après le ménage** :
   - Prendre toutes les photos "Après"
   - Même ordre que les photos "Avant"
   - Marquer comme "Terminée"

4. **Validation** :
   - Manager vérifie dans les 24h
   - Valide ou demande corrections
   - Note la qualité

---

### Sécurité et confidentialité

**Données sensibles** :
- ✅ Ne pas photographier documents personnels
- ✅ Éviter objets de valeur dans le cadre
- ✅ Flouter visages si présents
- ✅ Respecter vie privée des clients

**Sauvegarde** :
- ✅ Exporter régulièrement les sessions importantes
- ✅ Archiver les anciennes sessions
- ✅ Supprimer photos après validation finale (selon politique)

---

## 🎓 Cas d'usage

### Cas 1 : Ménage standard (Turnover)

**Contexte** : Check-out à 11h, check-in à 16h

1. 11h00 : Créer session "Turnover - Villa Azur"
2. 11h05 : Photos "Avant" (toutes les pièces)
3. 11h10-14h30 : Ménage complet
4. 14h35 : Photos "Après" (toutes les pièces)
5. 14h40 : Marquer "Terminée"
6. 15h00 : Manager valide (note 5/5)
7. 16h00 : Propriété prête pour check-in

**Résultat** : Preuve visuelle de la qualité, client rassuré, équipe reconnue

---

### Cas 2 : Ménage après dégâts

**Contexte** : Dégâts signalés par client sortant

1. Créer session "Dégâts - Appartement Centre"
2. Photos "Avant" détaillées des dégâts
3. Ajouter notes explicatives
4. Ménage et réparations
5. Photos "Après" montrant résolution
6. Validation avec note
7. Export pour assurance/dépôt de garantie

**Résultat** : Documentation légale, preuve de résolution

---

### Cas 3 : Contrôle qualité régulier

**Contexte** : Audit mensuel de qualité

1. Créer sessions pour toutes les propriétés
2. Photos avant ménage hebdomadaire
3. Photos après ménage
4. Comparer qualité entre propriétés
5. Identifier tendances (pièces problématiques)
6. Former équipe sur points faibles

**Résultat** : Amélioration continue, standards élevés

---

## 🚀 Évolutions futures

### Version 2.1 (Q1 2025)

- [ ] **Slider avant/après** : Curseur de comparaison interactif
- [ ] **Annotations** : Marquage zones d'intérêt
- [ ] **Export PDF** : Rapport professionnel
- [ ] **Filtres date** : Plages de dates personnalisées

### Version 2.2 (Q2 2025)

- [ ] **IndexedDB** : Stockage illimité
- [ ] **Compression auto** : Optimisation images
- [ ] **Templates** : Sessions pré-configurées
- [ ] **Notifications** : Alertes validation

### Version 3.0 (Q3 2025)

- [ ] **Mode hors ligne** : Sync cloud
- [ ] **IA qualité** : Détection auto problèmes
- [ ] **Rapports analytics** : Statistiques avancées
- [ ] **API REST** : Intégration externe

---

## 📞 Support

**Questions ou problèmes** :
1. Consultez cette documentation
2. Vérifiez les logs console (F12)
3. Exportez vos données avant toute action
4. Contactez le support technique

**Limites connues** :
- localStorage limité (5-10MB)
- Pas de sync multi-appareils
- Photos perdues si cache navigateur vidé

**Solutions** :
- Exporter régulièrement
- Utiliser même navigateur/appareil
- Ne pas vider cache navigateur

---

## 📝 Changelog

### v2.0.0 (2025-01-14)
- ✨ Refonte complète de l'interface
- ✨ Ajout mode comparaison
- ✨ Statistiques détaillées (6 KPIs)
- ✨ Visionneuse plein écran avec contrôles
- ✨ 10 types de pièces (vs 6 avant)
- ✨ Export JSON
- ✨ Duplication de sessions
- ✨ Métadonnées photos enrichies
- 🐛 Corrections bugs affichage dark mode

### v1.0.0 (2024-12)
- 🎉 Version initiale
- ✅ CRUD sessions
- ✅ Upload photos
- ✅ Vue grille
- ✅ Validation basique

---

**🎯 Rappel** : Cette galerie est un outil de **documentation et validation qualité**. L'objectif est de maintenir un standard élevé de propreté et de garantir la satisfaction client grâce à la preuve visuelle.

---

*Documentation mise à jour le 14 janvier 2025*  
*Version du composant : 2.0.0*  
*Auteur : BNBGest Development Team*
