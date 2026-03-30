# 📄 Documentation Générateur de Contrats de Location

## Vue d'ensemble

Le **Générateur de Contrats** est un système professionnel de création de contrats de location saisonnière en PDF. Il permet de générer rapidement des documents juridiques complets, personnalisés et conformes.

### ✨ Fonctionnalités principales

- ✅ **Génération PDF professionnelle** avec mise en page soignée
- ✅ **Multi-langue** (Français/Anglais)
- ✅ **Système de modèles** pour sauvegarder vos configurations
- ✅ **Historique complet** de tous les contrats générés
- ✅ **Statistiques en temps réel** (contrats, téléchargements, envois)
- ✅ **Configuration avancée** (15+ champs personnalisables)
- ✅ **Articles juridiques complets** (10 articles + clauses supplémentaires)
- ✅ **Calculs financiers automatiques** (TVA, frais de service, taxes de séjour)
- ✅ **Mode sombre** complet
- ✅ **Animations fluides** avec Framer Motion
- ✅ **Sauvegarde locale** (localStorage)

---

## 📊 Interface & Navigation

### Onglets principaux

#### 1️⃣ **Générer**
Interface principale de création de contrats

**Sections:**
- 🏠 Sélection propriété/réservation
- 👤 Configuration propriétaire (bailleur)
- 💰 Conditions financières
- 📋 Règlement intérieur
- 📝 Instructions arrivée/départ
- ⚙️ Options avancées

#### 2️⃣ **Modèles**
Gestion des modèles de configuration

**Actions:**
- Créer un nouveau modèle
- Charger un modèle existant
- Supprimer un modèle
- Voir les détails (nom, description, date)

#### 3️⃣ **Historique**
Suivi de tous les contrats générés

**Informations affichées:**
- Nom du locataire
- Propriété concernée
- Date/heure de génération
- Nombre de téléchargements
- Statut d'envoi au client

**Filtres:**
- Recherche par nom/propriété
- Filtre par propriété
- Tri par date

#### 4️⃣ **Paramètres**
Configuration globale du générateur

**Options:**
- Langue par défaut (FR/EN)
- Options d'inclusion (inventaire, photos, carte)
- Informations propriétaire par défaut

---

## 🎯 Tableau de bord (KPIs)

4 indicateurs affichés en permanence:

| KPI | Description | Icône |
|-----|-------------|-------|
| **Contrats** | Nombre total de contrats générés | 📄 |
| **Téléchargements** | Total des téléchargements PDF | ⬇️ |
| **Envoyés** | Contrats envoyés aux clients | 📧 |
| **Modèles** | Nombre de modèles sauvegardés | 📁 |

---

## 📝 Génération d'un contrat

### Étape 1: Sélection de la réservation

1. Choisir la **propriété** dans la liste déroulante
2. Sélectionner la **réservation** associée
3. Vérifier le récapitulatif affiché:
   - Nom du locataire
   - Email du locataire
   - Dates du séjour
   - Nombre de nuits
   - Montant total
   - Caution

### Étape 2: Configuration du propriétaire (Bailleur)

**Champs obligatoires:**
- Nom complet
- Adresse complète
- Téléphone
- Email

**Champs optionnels:**
- Numéro SIRET
- Numéro de licence (tourisme)
- Numéro de TVA

### Étape 3: Conditions financières

**Paramètres:**
- **Méthode de caution** (6 choix):
  - Virement bancaire
  - Carte bancaire
  - Chèque
  - Espèces
  - Empreinte bancaire
  - Caution en ligne (Swikly, etc.)

- **Conditions de paiement** (personnalisable):
  - Exemple: "Acompte de 30% à la réservation, solde 30 jours avant l'arrivée"

- **Politique d'annulation** (personnalisable):
  - Exemple: "Annulation gratuite jusqu'à 30 jours avant l'arrivée..."

**Calculs automatiques:**
```
Hébergement = Nuits × Prix/nuit
Frais de ménage = Selon propriété
Frais de service = 3% du montant hébergement
Taxe de séjour = 5.5% du montant hébergement
────────────────────────────────────
Total TTC
+ Caution (séparée)
```

### Étape 4: Règlement intérieur

**Règles par défaut (FR):**
- Interdiction de fumer
- Animaux non acceptés
- Respect du voisinage (silence après 22h)
- Capacité max respectée
- Respect des équipements
- Tri des déchets

**Personnalisation:**
- Ajouter des règles spécifiques
- Supprimer des règles
- Ordre modifiable

### Étape 5: Instructions arrivée/départ

**Instructions d'arrivée:**
- Heure d'arrivée
- Procédure de check-in
- Localisation des clés
- Code d'accès
- Contact sur place

**Instructions de départ:**
- Heure de départ
- Procédure de check-out
- État des lieux
- Restitution des clés
- Consignes de ménage

### Étape 6: Options avancées

**Informations supplémentaires:**
- Assurance (obligatoire ou recommandée)
- Contact d'urgence (24/7)
- Détails WiFi (SSID, mot de passe)
- Informations parking

**Options d'inclusion:**
- ☑️ Inclure l'inventaire
- ☑️ Inclure des photos
- ☑️ Inclure une carte

**Clauses supplémentaires:**
- Ajouter des clauses personnalisées
- Texte libre
- Numérotation automatique

### Étape 7: Génération

**Actions disponibles:**
- 👁️ **Aperçu** : Prévisualiser avant génération
- 💾 **Sauvegarder comme modèle** : Réutiliser la config
- ⬇️ **Télécharger PDF** : Générer et télécharger

---

## 📄 Structure du contrat PDF

### En-tête
- Titre: "CONTRAT DE LOCATION SAISONNIÈRE" / "SEASONAL RENTAL CONTRACT"
- Référence: `BG-{bookingId}-{year}`
- Date de génération
- Design professionnel avec gradient indigo

### Article 1 — PARTIES / PARTIES

**LE BAILLEUR (Owner):**
- Nom complet
- Adresse
- Téléphone
- Email
- SIRET (si fourni)
- Licence touristique (si fournie)

**LE LOCATAIRE (Tenant):**
- Nom complet
- Email
- Téléphone
- Nombre de personnes

### Article 2 — DÉSIGNATION DU LOGEMENT / PROPERTY DESCRIPTION

- Nom de la propriété
- Type de bien (Appartement, Maison, etc.)
- Adresse complète
- Capacité d'accueil
- Nombre de chambres
- Nombre de salles de bain
- Équipements principaux (liste)

### Article 3 — DURÉE DU SÉJOUR / RENTAL PERIOD

- Date et heure d'arrivée
- Date et heure de départ
- Nombre de nuits
- Nombre de personnes

### Article 4 — CONDITIONS FINANCIÈRES / FINANCIAL CONDITIONS

Tableau détaillé:

| Désignation | Quantité | Prix unitaire | Montant |
|-------------|----------|---------------|---------|
| Hébergement | X nuits | XXX € | XXX € |
| Ménage | 1 | XXX € | XXX € |
| Frais service | - | - | XXX € |
| Sous-total HT | - | - | XXX € |
| TVA (5.5%) | - | - | XXX € |
| **TOTAL TTC** | - | - | **XXX €** |
| Caution | - | - | XXX € |

**Modalités de paiement:**
- Texte personnalisé (ex: acompte 30%, solde 30j avant)

**Méthode de caution:**
- Texte personnalisé selon choix

### Article 5 — CONDITIONS D'ANNULATION / CANCELLATION POLICY

Texte personnalisé avec politique d'annulation complète.

### Article 6 — RÈGLEMENT INTÉRIEUR / HOUSE RULES

Liste numérotée des règles:
1. Interdiction de fumer...
2. Animaux...
3. Bruit...
4. Capacité...
5. Équipements...
6. Déchets...
7+ Règles personnalisées

### Article 7 — INSTRUCTIONS D'ARRIVÉE / ARRIVAL INSTRUCTIONS

- Heure d'arrivée
- Procédure check-in
- Localisation clés
- Codes d'accès
- Contact sur place

### Article 8 — INSTRUCTIONS DE DÉPART / DEPARTURE INSTRUCTIONS

- Heure de départ
- Procédure check-out
- État des lieux
- Restitution clés
- Consignes ménage

### Article 9 — ASSURANCE / INSURANCE

Information sur l'assurance:
- Obligation ou recommandation
- Type de couverture
- Responsabilité civile
- Dommages matériels

### Article 10 — CONTACT D'URGENCE / EMERGENCY CONTACT

- Numéro d'urgence 24/7
- Nom du contact
- Services d'urgence locaux

### CLAUSES PARTICULIÈRES / ADDITIONAL CLAUSES

Liste numérotée des clauses supplémentaires personnalisées.

### SIGNATURES

Deux cadres signature:
- **Le Bailleur** (gauche)
  - Fait à: ________
  - Le: ________
  - Signature:
  
- **Le Locataire** (droite)
  - Fait à: ________
  - Le: ________
  - Signature:

### Pied de page
- Numéro de page (1/X, 2/X, etc.)
- Référence du contrat

---

## 🎨 Système de modèles

### Créer un modèle

1. Configurer tous les champs souhaités
2. Cliquer sur "💾 Sauvegarder comme modèle"
3. Entrer un **nom** (ex: "Contrat Standard Été")
4. Ajouter une **description** (ex: "Configuration pour locations estivales")
5. Valider

**Informations sauvegardées:**
- Toutes les informations propriétaire
- Conditions financières
- Règles de la maison
- Instructions
- Options d'inclusion
- Clauses supplémentaires

### Utiliser un modèle

1. Aller dans l'onglet "Modèles"
2. Trouver le modèle souhaité
3. Cliquer sur "Utiliser ce modèle"
4. → Retour automatique à l'onglet "Générer"
5. Configuration pré-remplie
6. Sélectionner propriété/réservation
7. Ajuster si nécessaire
8. Générer

### Supprimer un modèle

1. Onglet "Modèles"
2. Cliquer sur l'icône 🗑️
3. Confirmer la suppression

---

## 📊 Historique des contrats

### Informations enregistrées

Pour chaque contrat généré:
- ID unique
- ID de réservation
- ID de propriété
- Nom du locataire
- Date/heure de génération
- Nombre de téléchargements
- Statut d'envoi au client

### Fonctionnalités

**Recherche:**
- Par nom de locataire
- Par nom de propriété
- Recherche instantanée

**Filtres:**
- Par propriété spécifique
- Combinable avec recherche

**Actions:**
- Voir les détails
- Télécharger à nouveau
- Marquer comme "envoyé"

---

## ⚙️ Configuration avancée

### Langue

**Français (FR):**
- Tous les articles en français
- Formats de date FR
- Devise: €

**Anglais (EN):**
- All articles in English
- Date formats EN
- Currency: €

**Changement:**
- Sélecteur de langue dans paramètres
- Appliqué au prochain contrat
- PDF généré dans la langue choisie

### Options d'inclusion

**Inventaire:**
- Ajoute une section "État des lieux"
- Liste détaillée des équipements
- Cochable

**Photos:**
- Insère des photos de la propriété
- Maximum 4 photos
- Optimisées pour PDF

**Carte:**
- Carte de localisation
- Adresse exacte
- Points d'intérêt

---

## 💡 Bonnes pratiques

### Avant génération

✅ **Vérifier:**
- Toutes les informations propriétaire
- Dates et horaires corrects
- Montants calculés exacts
- Politique d'annulation claire
- Contact d'urgence fourni

✅ **Utiliser l'aperçu:**
- Toujours prévisualiser avant génération finale
- Vérifier orthographe et mise en page
- Contrôler les calculs

✅ **Sauvegarder en modèle:**
- Pour réutilisation rapide
- Standardisation des contrats
- Gain de temps

### Personnalisation

✅ **Adapter selon la saison:**
- Politique annulation plus souple hors saison
- Instructions spécifiques (chauffage, climatisation)

✅ **Adapter selon la durée:**
- Conditions différentes pour longs séjours
- Réductions possibles

✅ **Adapter selon le type:**
- Règles plus strictes pour grande capacité
- Assurance renforcée pour propriétés haut de gamme

### Juridique

⚠️ **Important:**
- Les contrats générés sont des modèles
- Faire relire par un professionnel du droit
- Adapter aux lois locales
- Vérifier conformité réglementaire
- Mise à jour régulière

✅ **Mentions obligatoires:**
- Assurance multirisque habitation
- Numéro de licence touristique (si obligatoire)
- Taxe de séjour
- Règlement de copropriété (si applicable)

---

## 🔧 Dépannage

### Problème: PDF ne se génère pas

**Solutions:**
1. Vérifier que propriété ET réservation sont sélectionnées
2. Remplir au minimum: nom, adresse, téléphone, email propriétaire
3. Vérifier console navigateur pour erreurs
4. Réessayer après rechargement de page

### Problème: Modèle ne se charge pas

**Solutions:**
1. Vérifier que le modèle existe dans la liste
2. Effacer cache du navigateur
3. Vérifier localStorage (max 5MB)
4. Recréer le modèle si nécessaire

### Problème: Historique incomplet

**Solutions:**
1. L'historique est local (localStorage)
2. Effacement cache = perte historique
3. Exporter régulièrement les données
4. Ne pas dépasser limite 5MB

### Problème: Calculs incorrects

**Solutions:**
1. Vérifier prix configuré dans propriété
2. Vérifier frais de ménage
3. Vérifier caution
4. Formules:
   - Service = 3% hébergement
   - TVA = 5.5% hébergement
   - Total = Hébergement + Ménage + Service + TVA

---

## 📈 Évolutions futures

### Prévues

- [ ] **Signatures électroniques** avec DocuSign/HelloSign
- [ ] **Envoi email automatique** avec pièce jointe
- [ ] **Génération par lot** (plusieurs contrats à la fois)
- [ ] **Export Word/ODT** en plus de PDF
- [ ] **Synchronisation cloud** (sauvegarde en ligne)
- [ ] **Plus de langues** (ES, DE, IT)
- [ ] **Personnalisation avancée** (logo, couleurs)
- [ ] **Versions de contrat** (historique modifications)
- [ ] **Statistiques avancées** (graphiques, tendances)
- [ ] **Calcul automatique taxes locales**

### Demandées

- [ ] Intégration calendrier (rappels signature)
- [ ] Rappels automatiques (renouvellement, échéances)
- [ ] Templates juridiques préétablis par région
- [ ] Vérification conformité automatique
- [ ] Archivage légal sécurisé

---

## 📞 Support

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl + P` | Prévisualiser contrat |
| `Ctrl + S` | Sauvegarder modèle |
| `Ctrl + D` | Télécharger PDF |
| `Échap` | Fermer modal |

### Limites techniques

**localStorage:**
- Max 5-10 MB selon navigateur
- ~100 contrats en historique
- ~50 modèles sauvegardés

**PDF:**
- Max 20 pages recommandé
- Images optimisées auto
- Polices embarquées

---

## 📚 Annexes

### Exemple de politique d'annulation

```
ANNULATION PAR LE LOCATAIRE:
- Plus de 60 jours avant l'arrivée: remboursement intégral
- Entre 60 et 30 jours: 50% du montant facturé
- Entre 30 et 14 jours: 75% du montant facturé  
- Moins de 14 jours: 100% du montant facturé

ANNULATION PAR LE BAILLEUR:
- Remboursement intégral dans tous les cas
- Aide à la recherche d'un logement équivalent
```

### Exemple de conditions de paiement

```
MODALITÉS DE RÈGLEMENT:
- Acompte de 30% à la réservation (non remboursable)
- Solde 30 jours avant l'arrivée
- Caution versée 7 jours avant l'arrivée
- Taxe de séjour réglée à l'arrivée en espèces

MOYENS DE PAIEMENT ACCEPTÉS:
- Virement bancaire (IBAN fourni)
- Carte bancaire via plateforme sécurisée
- Chèque (à l'ordre de [NOM])
```

### Exemple d'instructions arrivée

```
CHECK-IN:
- Heure: entre 16h et 20h
- Remise des clés: boîte à clés sécurisée
- Code d'accès: envoyé 48h avant par SMS
- Localisation: à gauche de la porte d'entrée

EN CAS DE RETARD:
- Prévenir au: +33 X XX XX XX XX
- Arrivée après 20h: frais de 50€
- Arrivée après minuit: non autorisée

PREMIER CONTACT:
- Accueil personnalisé si possible
- Visite guidée du logement
- Remise du livret d'accueil
- Questions/réponses
```

---

**Documentation version 1.0 — Janvier 2025**
