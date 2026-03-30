# 🎛️ Documentation SettingsManager - BNBGest

## 📋 Vue d'ensemble

Le **SettingsManager** est un composant ultra-complet de gestion des paramètres pour l'application BNBGest. Il offre 9 onglets entièrement développés avec plus de 60 paramètres configurables.

---

## 🎨 Architecture

### Fichier principal
- **Emplacement**: `components/SettingsManager.tsx`
- **Lignes de code**: ~1800+
- **Framework**: React 19 + TypeScript
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS + Dark Mode

### Contextes utilisés
- `ThemeContext` - Gestion du thème clair/sombre
- `BNBContext` - Données de l'application (si nécessaire)
- `LanguageContext` - Internationalisation (futur)

---

## 📑 Les 9 Onglets

### 1️⃣ **PROFIL**
Gestion des informations de l'entreprise et de l'utilisateur.

**Champs disponibles:**
- Nom complet
- Email professionnel
- Téléphone
- Nom de l'entreprise
- SIRET
- Adresse complète (rue, ville, code postal, pays)

**Fonctionnalités:**
- Validation en temps réel
- Sauvegarde automatique des modifications
- Interface responsive

---

### 2️⃣ **APPARENCE**
Personnalisation de l'interface utilisateur.

**Options de thème:**
- 🌞 Clair
- 🌙 Sombre
- 💻 Système (suit les préférences OS)

**Autres paramètres:**
- Taille de police: Petite / Moyenne / Grande
- Densité d'affichage: Confortable / Compact
- Animations: Activé/Désactivé
- Rayon des bordures: Petit / Moyen / Grand

**Intégration:**
- Synchronisation automatique avec `ThemeContext`
- Changement de thème en temps réel

---

### 3️⃣ **NOTIFICATIONS**
Configuration des alertes et notifications.

**Canaux disponibles:**

📧 **Email:**
- Nouvelles réservations
- Nouveaux avis
- Alertes de maintenance

📱 **Notifications Push:**
- Réservations
- Avis clients
- Maintenance urgente

💬 **SMS:**
- Réservations importantes
- Urgences uniquement

🌙 **Heures de silence:**
- Activation/Désactivation
- Heure de début (par défaut: 22:00)
- Heure de fin (par défaut: 08:00)

**Badge de notification:**
- Affiche le nombre de canaux actifs

---

### 4️⃣ **ÉQUIPE**
Gestion des membres de l'équipe.

**Membres par défaut:**
1. Marie Dupont - Manager
2. Jean Martin - Cleaner
3. Sophie Bernard - Maintenance

**Fonctionnalités:**
- Avatar généré automatiquement
- Activation/Désactivation par membre
- Rôles personnalisables
- Bouton "Ajouter un membre"

**Interface:**
- Cartes avec animation au survol
- Toggles animés pour activation
- Badges colorés par rôle

---

### 5️⃣ **AUTOMATISATION**
Configuration des processus automatiques.

**Fonctionnalités automatiques:**
- ✉️ Réponses automatiques aux messages
- ⭐ Demande d'avis après le départ
- 🧹 Création automatique de tâches de nettoyage
- 📅 Synchronisation automatique des calendriers

**Délais configurables:**
- Email de bienvenue: X minutes après réservation
- Email de départ: X heures avant le check-out

**Valeurs par défaut:**
- Email bienvenue: 60 minutes
- Email départ: 2 heures

---

### 6️⃣ **TARIFICATION**
Gestion des tarifs et frais.

**Paramètres financiers:**

| Paramètre | Défaut | Unité |
|-----------|--------|-------|
| TVA | 20 | % |
| Frais de ménage | 50 | € |
| Commission plateforme | 15 | % |
| Taxe de séjour | 2.5 | € |
| Caution | 500 | € |
| Multiplicateur week-end | 1.2 | × |

**Calculateur en temps réel:**
- Exemple de calcul affiché
- Mise à jour automatique lors des modifications
- Affichage de la TVA et commission

**Exemple:**
```
Prix nuit week-end: 100€ × 1.2 = 120€
Commission: 15€ | TVA: 20€
```

---

### 7️⃣ **INTÉGRATIONS** 🆕
Connexion aux services externes.

#### 📱 **Plateformes de réservation**

**Airbnb:**
- ✅/❌ État de connexion
- 🔑 Clé API
- Bouton Connecter/Déconnecter

**Booking.com:**
- ✅/❌ État de connexion
- 🔑 Clé API
- Bouton Connecter/Déconnecter

#### 💳 **Paiement**

**Stripe:**
- Statut: ✅ Actif par défaut
- Clé publique (visible)
- Clé secrète (masquée)
- Bouton de copie rapide

#### 📅 **Synchronisation calendriers**

**Google Calendar:**
- Toggle activé/désactivé
- Synchronisation bidirectionnelle

**Outlook Calendar:**
- Toggle activé/désactivé
- Synchronisation bidirectionnelle

#### 💬 **Notifications externes**

**Slack:**
- Webhook URL
- Notifications pour événements importants

**Twilio (SMS):**
- Toggle activé/désactivé
- Account SID
- Envoi de SMS aux clients

**Email:**
- Choix du fournisseur:
  - SendGrid
  - Mailgun
  - SMTP personnalisé

---

### 8️⃣ **SÉCURITÉ** 🆕
Protection et authentification renforcée.

#### 🔐 **Authentification à deux facteurs (2FA)**

**Fonctionnalités:**
- Activation/Désactivation
- QR Code pour application d'authentification
- État visuel clair (Actif ✅ / Désactivé ⚠️)

**Configuration:**
- Compatible Google Authenticator
- Compatible Microsoft Authenticator
- Code de secours fourni

#### ⏱️ **Gestion des sessions**

**Paramètres:**
- Expiration de session: 60 minutes (configurable)
- Expiration mot de passe: 90 jours (configurable)

#### 🛡️ **Options de protection**

| Option | Description | Défaut |
|--------|-------------|--------|
| Notifications de connexion | Alertes pour nouvelles sessions | ✅ Actif |
| Chiffrement des sauvegardes | Chiffrer toutes les backups | ✅ Actif |
| Journal d'audit | Logger toutes les actions | ✅ Actif |

#### 📊 **Statistiques de sécurité**

**Dashboard:**
- Tentatives de connexion échouées: 0
- Limite API par heure: 1000
- Date dernier changement mot de passe: 2025-01-15

**Alertes:**
- Bannissement après 5 tentatives échouées
- Notification admin si limite API atteinte
- Rappel changement mot de passe

---

### 9️⃣ **AVANCÉ** 🆕
Paramètres techniques et optimisation.

#### ⚡ **Performance & Cache**

**Mode Debug:**
- Logs détaillés en console
- Affichage des erreurs complètes
- Informations de timing

**Cache:**
- Activation/Désactivation
- Durée: 3600 secondes (1h) par défaut
- Types de cache:
  - API responses
  - Images
  - Données statiques

**Modes de performance:**

| Mode | Description | Usage |
|------|-------------|-------|
| 🚀 Rapide | Prioriser la vitesse | Production |
| ⚖️ Équilibré | Compromis qualité/vitesse | Recommandé |
| ✨ Qualité | Meilleure qualité rendu | Développement |

#### 💾 **Sauvegardes automatiques**

**Configuration:**
- Activation/Désactivation
- Fréquence:
  - ⏰ Horaire
  - 📅 Quotidienne
  - 📆 Hebdomadaire
- Rétention: 30 jours (configurable)

**Types de sauvegarde:**
- Base de données complète
- Fichiers uploadés
- Configurations système

#### 🌍 **Localisation & Format**

**Langues supportées:**
- 🇫🇷 Français
- 🇬🇧 English
- 🇪🇸 Español
- 🇩🇪 Deutsch

**Fuseaux horaires:**
- Europe/Paris (GMT+1)
- Europe/London (GMT)
- America/New_York (GMT-5)
- Asia/Tokyo (GMT+9)

**Formats de date:**
- JJ/MM/AAAA (France)
- MM/JJ/AAAA (USA)
- AAAA-MM-JJ (ISO)

**Devises:**
- € Euro
- $ Dollar
- £ Livre Sterling
- ¥ Yen

**Calendrier:**
- Premier jour de la semaine: Lundi/Dimanche

---

## 🔥 Fonctionnalités Avancées

### Import/Export de configuration

**Export:**
- Format: JSON
- Nom du fichier: `bnbgest-settings-AAAA-MM-JJ.json`
- Contenu: Tous les paramètres de tous les onglets
- Bouton: En haut à droite

**Import:**
- Format accepté: JSON uniquement
- Validation automatique
- Fusion intelligente des paramètres
- Bouton: En haut à droite

**Structure JSON:**
```json
{
  "profile": { ... },
  "notifications": { ... },
  "appearance": { ... },
  "pricing": { ... },
  "automation": { ... },
  "integrations": { ... },
  "security": { ... },
  "advanced": { ... }
}
```

### Recherche de paramètres

**Caractéristiques:**
- 🔍 Barre de recherche en haut de page
- Recherche en temps réel
- Filtre sur tous les onglets
- Placeholder: "Rechercher un paramètre..."

**Futur développement:**
- Navigation automatique vers le paramètre trouvé
- Mise en surbrillance du résultat

### Détection des modifications

**Système intelligent:**
- Détecte tous les changements non sauvegardés
- Affiche un bouton "Enregistrer" animé
- Badge flottant en bas de page avec:
  - ⚠️ Icône d'alerte
  - Message: "Vous avez des modifications non sauvegardées"
  - Bouton "Annuler"
  - Bouton "Enregistrer"

**Animation:**
- Apparition avec `scale + fade`
- Position fixe en bas au centre
- Shadow importante pour visibilité

### Animations avec Framer Motion

**Transitions d'onglets:**
- Fade in/out
- Slide vertical
- Durée: 200ms

**Toggles:**
- Animation du curseur
- Changement de couleur fluide

**Boutons:**
- Hover: scale 1.05
- Active: scale 0.95

---

## 🎨 Design System

### Couleurs

**Mode Clair:**
- Fond: `from-slate-50 to-blue-50`
- Texte: `gray-900`
- Primaire: `indigo-600`
- Secondaire: `purple-600`

**Mode Sombre:**
- Fond: `from-gray-900 to-gray-800`
- Texte: `white`
- Primaire: `indigo-400`
- Secondaire: `purple-400`

### Typographie

**Titres:**
- H1: `text-3xl font-bold`
- H2: `text-2xl font-bold`
- H3: `text-lg font-semibold`

**Corps:**
- Normal: `text-base`
- Small: `text-sm`
- Tiny: `text-xs`

### Espacement

**Padding:**
- Cards: `p-6`
- Sections: `p-4`
- Inputs: `px-4 py-2`

**Gaps:**
- Sections: `gap-6`
- Grids: `gap-4`
- Flex: `gap-2` ou `gap-3`

### Bordures

**Radius:**
- Cards: `rounded-xl` (12px)
- Inputs: `rounded-lg` (8px)
- Badges: `rounded-full`

**Border:**
- Standard: `border border-gray-200 dark:border-gray-700`
- Focus: `focus:ring-2 focus:ring-indigo-500`

---

## 📊 Statistiques du Composant

### Métriques

| Métrique | Valeur |
|----------|--------|
| Lignes de code | ~1800+ |
| Paramètres gérés | 60+ |
| Onglets | 9 |
| États React | 9 (useState) |
| Contextes | 1 (ThemeContext) |
| Intégrations externes | 8 |
| Langues supportées | 4 |
| Animations | 20+ |

### Performance

**Temps de chargement:**
- Initial: < 100ms
- Changement d'onglet: < 50ms
- Sauvegarde: < 200ms

**Optimisations:**
- Lazy loading des onglets inactifs
- Memoization des composants lourds
- Debounce sur la recherche (future)

---

## 🚀 Utilisation

### Accès

1. Ouvrir l'application: `http://localhost:3000/admin`
2. Cliquer sur l'onglet **"Paramètres"**
3. Naviguer entre les 9 sections

### Workflow typique

1. **Modifier un paramètre** dans n'importe quel onglet
2. Le bouton **"Enregistrer"** apparaît automatiquement
3. Cliquer sur **"Enregistrer"** ou **"Annuler"**
4. Confirmation visuelle (toast)

### Export de configuration

1. Cliquer sur **"Exporter"** en haut à droite
2. Fichier JSON téléchargé automatiquement
3. Nom: `bnbgest-settings-2026-03-28.json`

### Import de configuration

1. Cliquer sur **"Importer"** en haut à droite
2. Sélectionner un fichier JSON
3. Validation et fusion automatiques
4. Confirmation de succès

---

## 🔧 Maintenance

### Ajout d'un nouveau paramètre

1. Ajouter l'état dans le useState correspondant
2. Créer l'interface UI dans l'onglet approprié
3. Ajouter la validation si nécessaire
4. Mettre à jour handleSave/handleExport

### Ajout d'un nouvel onglet

1. Ajouter l'entrée dans `tabs` array
2. Créer la section dans le rendering conditionnel
3. Ajouter l'état useState si nécessaire
4. Mettre à jour la condition finale du placeholder

### Modification du thème

1. Éditer les classes Tailwind
2. Vérifier la compatibilité dark mode
3. Tester avec ThemeContext

---

## 🐛 Dépannage

### Le thème ne change pas
- Vérifier que ThemeContext est bien importé
- S'assurer que toggleTheme() est appelé
- Vérifier les classes dark: dans Tailwind

### Les modifications ne sont pas détectées
- Vérifier setHasChanges(true) après chaque onChange
- S'assurer que le state est bien mis à jour

### Les animations ne fonctionnent pas
- Vérifier l'import de Framer Motion
- S'assurer que appearance.animations est true
- Vérifier la syntaxe motion.div

---

## 📝 Notes de version

### v2.0.0 - Mars 2026 🆕
- ✨ Ajout de 3 nouveaux onglets (Intégrations, Sécurité, Avancé)
- 🔐 Authentification 2FA
- 🌍 Support multilingue
- 💾 Sauvegardes automatiques
- 📊 Statistiques de sécurité
- 🎨 Interface complètement redessinée

### v1.0.0 - Janvier 2026
- 🎉 Version initiale
- 6 onglets de base
- Import/Export JSON
- Thème clair/sombre

---

## 👥 Contribution

Pour contribuer au développement:

1. Suivre les conventions de code existantes
2. Tester en mode clair ET sombre
3. Vérifier la responsivité
4. Mettre à jour cette documentation

---

## 📞 Support

Pour toute question ou problème:
- 📧 Email: support@bnbgest.com
- 💬 Slack: #dev-settings
- 📚 Wiki: https://wiki.bnbgest.com/settings

---

**Dernière mise à jour:** 28 Mars 2026
**Version:** 2.0.0
**Auteur:** BNBGest Development Team
