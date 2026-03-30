# 📦 Documentation du Module Inventaire - BNBGest

## Vue d'ensemble

Le module **InventoryManager** offre une gestion complète et professionnelle de l'inventaire pour vos propriétés locatives. Il permet de suivre les stocks, gérer les réapprovisionnements et optimiser les coûts.

---

## ✨ Fonctionnalités Principales

### 1. **Tableau de Bord Statistique**
- 📊 **4 cartes de statistiques en temps réel** :
  - Total des articles
  - Articles en stock
  - Articles en stock faible
  - Articles en rupture de stock

### 2. **Gestion Complète des Articles**
- ➕ Ajout d'articles avec tous les détails
- ✏️ Modification des articles existants
- 🗑️ Suppression d'articles
- 👁️ Vue détaillée avec toutes les informations

### 3. **Ajustement Rapide de Stock**
- 🔼 Boutons **+1** et **+5** pour augmenter le stock
- 🔽 Boutons **-1** et **-5** pour diminuer le stock
- ⚡ Ajustement instantané sans ouvrir de modal
- 📝 Enregistrement automatique des mouvements

### 4. **Alertes et Notifications**
- ⚠️ **Alertes de stock faible** en haut de page
- 🔴 Badges de statut colorés (En stock, Stock faible, Rupture)
- 📌 Affichage des 5 articles les plus critiques

### 5. **Réapprovisionnement en Masse**
- 🔄 Réapprovisionner automatiquement tous les articles en stock faible
- 📈 Quantité cible : 2× le seuil minimum
- ✅ Confirmation avant action
- 📊 Prévisualisation des changements

### 6. **Export de Données**
- 📥 **Export CSV** de l'inventaire complet
- 📋 Inclut : nom, catégorie, quantité, seuil, statut, emplacement, fournisseur
- 💾 Fichier nommé avec la date : `inventaire_YYYY-MM-DD.csv`

### 7. **Statistiques Détaillées**
- 📊 **Modal de statistiques** avec :
  - Total des articles
  - Valeur totale estimée (en €)
  - Taux de disponibilité (%)
  - Répartition par catégorie avec graphiques
  - Nombre d'articles par catégorie

### 8. **Filtres Avancés**
- 🔍 **Recherche** par nom ou emplacement
- 🏷️ **Filtre par catégorie** (9 catégories disponibles)
- 🎯 **Filtre par statut** (En stock, Stock faible, Rupture)
- 🏠 **Filtre par propriété** (si propertyId fourni)

### 9. **Informations Détaillées**
- 📦 Quantité actuelle vs seuil minimum
- 📍 Emplacement précis de l'article
- 🏪 Fournisseur
- 💰 Coût unitaire
- 📅 Date de dernier réapprovisionnement
- 📝 Notes personnalisées
- 🆔 QR Code avec ID unique

---

## 🎨 Interface Utilisateur

### Cartes de Statistiques
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Total articles │   En stock      │  Stock faible   │    Rupture      │
│      🔵 15      │     🟢 10       │     🟡 3        │     🔴 2        │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Boutons d'Action
- **🟦 Statistiques** - Voir les statistiques détaillées
- **🟩 Export CSV** - Télécharger l'inventaire
- **🟧 Réappro. masse** - Réapprovisionner les articles en stock faible
- **🟦 Ajouter** - Ajouter un nouvel article

### Actions sur les Articles
- **👁️ Détails** - Voir la fiche complète
- **➖ -1** - Retirer 1 unité
- **➕ +1** - Ajouter 1 unité
- **✏️ Modifier** - Éditer l'article
- **🗑️ Supprimer** - Supprimer l'article

---

## 📋 Catégories d'Articles

1. **Nettoyage** - Produits d'entretien, désinfectants
2. **Entretien** - Outils, pièces de rechange
3. **Literie** - Draps, couvertures, oreillers
4. **Électroménager** - Appareils, accessoires
5. **Décoration** - Objets décoratifs, cadres
6. **Cuisine** - Ustensiles, vaisselle
7. **Salle de bain** - Serviettes, accessoires
8. **Jardin** - Outils, mobilier extérieur
9. **Autre** - Articles divers

---

## 🔧 Utilisation

### Ajouter un Article

1. Cliquer sur **"Ajouter"**
2. Remplir le formulaire :
   - **Nom** * (obligatoire)
   - **Catégorie** * (obligatoire)
   - Quantité
   - Seuil minimum
   - Unité (pièces, litres, kg...)
   - Emplacement
   - Fournisseur
   - Coût unitaire (€)
   - Propriété
   - Notes
3. Cliquer sur **"Ajouter"**

### Modifier un Article

1. Cliquer sur **"Modifier"** sur la ligne de l'article
2. Modifier les champs souhaités
3. Cliquer sur **"Modifier"** pour valider

### Voir les Détails

1. Cliquer sur **"Détails"** sur la ligne de l'article
2. Voir toutes les informations
3. Utiliser les boutons **-5, -1, +1, +5** pour ajuster le stock
4. Modifier ou fermer le modal

### Ajuster Rapidement le Stock

1. Directement dans le tableau, cliquer sur **"-1"** ou **"+1"**
2. Le stock est mis à jour instantanément
3. Le statut est recalculé automatiquement

### Réapprovisionner en Masse

1. Cliquer sur **"Réappro. masse"** (visible si des articles sont en stock faible)
2. Vérifier la liste des articles à réapprovisionner
3. Confirmer l'action
4. Tous les articles sont réapprovisionnés à 2× leur seuil minimum

### Exporter l'Inventaire

1. Cliquer sur **"Export CSV"**
2. Le fichier est téléchargé automatiquement
3. Nom du fichier : `inventaire_2026-03-28.csv`

### Voir les Statistiques

1. Cliquer sur **"Statistiques"**
2. Consulter :
   - Nombre total d'articles
   - Valeur totale de l'inventaire
   - Taux de disponibilité
   - Répartition par catégorie

---

## 🎯 Statuts des Articles

| Statut | Badge | Condition |
|--------|-------|-----------|
| **En stock** | 🟢 Vert | `quantité > seuil minimum` |
| **Stock faible** | 🟡 Jaune | `0 < quantité ≤ seuil minimum` |
| **Rupture** | 🔴 Rouge | `quantité = 0` |

---

## 💾 Structure des Données

### Article d'Inventaire (InventoryItem)

```typescript
interface InventoryItem {
  id: number;                    // ID unique
  propertyId: number;            // ID de la propriété
  name: string;                  // Nom de l'article
  category: string;              // Catégorie
  quantity: number;              // Quantité actuelle
  minimumQuantity: number;       // Seuil minimum
  unit: string;                  // Unité (pièces, litres...)
  supplier?: string;             // Fournisseur
  cost?: number;                 // Coût unitaire en €
  lastRestocked: string;         // Date de dernier réappro
  status: string;                // 'in_stock' | 'low_stock' | 'out_of_stock'
  location: string;              // Emplacement
  notes?: string;                // Notes
}
```

### Mouvement de Stock (StockMovement)

```typescript
interface StockMovement {
  id: number;                    // ID unique
  itemId: number;                // ID de l'article
  type: 'in' | 'out' | 'adjustment';  // Type de mouvement
  quantity: number;              // Quantité
  date: string;                  // Date du mouvement
  reason: string;                // Raison
  user: string;                  // Utilisateur
}
```

---

## 🚀 Fonctionnalités Avancées

### Calcul Automatique du Statut

Le statut est automatiquement calculé :
```typescript
status = quantity <= minimumQuantity 
  ? (quantity === 0 ? 'out_of_stock' : 'low_stock')
  : 'in_stock';
```

### Calcul de la Valeur Totale

```typescript
totalValue = items.reduce((sum, item) => 
  sum + (item.quantity * (item.cost || 0)), 0
);
```

### Taux de Disponibilité

```typescript
availabilityRate = (inStockCount / totalItems) * 100;
```

---

## 📊 Export CSV

### Format du Fichier

```csv
Nom,Catégorie,Quantité,Seuil Min,Unité,Statut,Emplacement,Fournisseur,Dernière MAJ
"Draps queen",Literie,10,5,pièces,En stock,"Armoire 1",Amazon,2026-03-28
"Désinfectant",Nettoyage,2,5,litres,Stock faible,"Placard nettoyage",Carrefour,2026-03-20
```

---

## 🎨 Animations et Transitions

- **Apparition progressive** des cartes de statistiques
- **Effet de glissement** pour les lignes du tableau
- **Transitions fluides** pour les modals
- **Feedback visuel** sur les boutons au survol
- **Transformation d'échelle** sur les actions

---

## 🔐 Bonnes Pratiques

### Gestion du Stock

1. ✅ Définir un **seuil minimum** approprié pour chaque article
2. ✅ Vérifier régulièrement les **alertes de stock faible**
3. ✅ Utiliser le **réapprovisionnement en masse** pour gagner du temps
4. ✅ Noter le **fournisseur** pour faciliter les commandes
5. ✅ Indiquer le **coût unitaire** pour suivre les dépenses
6. ✅ Mettre à jour l'**emplacement** pour retrouver rapidement les articles

### Organisation

1. 📁 Utiliser les **catégories** de manière cohérente
2. 📍 Être précis dans les **emplacements**
3. 📝 Ajouter des **notes** pour les informations importantes
4. 🏷️ Utiliser des **noms descriptifs** pour les articles
5. 💰 Mettre à jour les **coûts** régulièrement

---

## 🆘 Dépannage

### Problème : Les statistiques ne s'affichent pas correctement

**Solution** : Vérifier que les articles ont un `cost` défini pour le calcul de la valeur totale.

### Problème : L'export CSV ne fonctionne pas

**Solution** : Vérifier les permissions de téléchargement du navigateur.

### Problème : Le statut ne se met pas à jour

**Solution** : Vérifier que `minimumQuantity` est défini et > 0.

---

## 🔄 Mises à Jour Futures

- [ ] Historique des mouvements de stock persistant
- [ ] Graphiques de tendances de consommation
- [ ] Prévisions de réapprovisionnement basées sur l'historique
- [ ] Notifications par email pour les stocks faibles
- [ ] Scanner de codes-barres pour l'ajout rapide
- [ ] Import CSV pour l'ajout en masse
- [ ] Rapports PDF détaillés
- [ ] Intégration avec les fournisseurs

---

## 📞 Support

Pour toute question ou problème, consulter la documentation complète ou contacter le support technique.

---

**Version** : 2.0  
**Dernière mise à jour** : Mars 2026  
**Auteur** : BNBGest Team
