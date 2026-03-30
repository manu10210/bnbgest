# 📡 API Guides - Documentation

## ✅ Problème Résolu

### Problème Initial
- **Symptôme** : "Guide introuvable" lors du scan du QR code depuis mobile
- **Cause** : Les guides étaient stockés dans le `localStorage` du navigateur PC uniquement
- **Impact** : Le téléphone ne pouvait pas accéder aux guides créés sur le PC car chaque appareil a son propre `localStorage`

### Solution Implémentée
- **Nouvelle API** : `/api/guides` pour stocker les guides côté serveur
- **Stockage partagé** : Fichier `public/data/equipment-guides.json`
- **Synchronisation** : Automatique entre `localStorage` et l'API serveur
- **Compatibilité** : Fallback sur `localStorage` si l'API est indisponible

---

## 🔧 API Endpoints

### GET `/api/guides`
Récupère tous les guides ou un guide spécifique.

**Récupérer tous les guides:**
```http
GET http://192.168.1.11:3000/api/guides
```

**Response:**
```json
[
  {
    "id": "guide_1234567890_abc123",
    "propertyId": 1,
    "equipmentName": "Allumage TV",
    "category": "multimedia",
    "videoUrl": "/uploads/videos/video-1774810197803-83kz1ce.mov",
    "description": "Comment allumer la télévision",
    "views": 0,
    "rating": 0,
    "createdAt": "2026-03-29T18:49:36.387Z",
    "updatedAt": "2026-03-29T18:49:36.387Z"
  }
]
```

**Récupérer un guide spécifique:**
```http
GET http://192.168.1.11:3000/api/guides?id=guide_1234567890_abc123
```

**Response:**
```json
{
  "id": "guide_1234567890_abc123",
  "propertyId": 1,
  "equipmentName": "Allumage TV",
  ...
}
```

---

### POST `/api/guides`
Crée ou met à jour des guides.

**Sauvegarder tous les guides:**
```http
POST http://192.168.1.11:3000/api/guides
Content-Type: application/json

[
  {
    "id": "guide_1234567890_abc123",
    "propertyId": 1,
    "equipmentName": "Allumage TV",
    ...
  }
]
```

**Response:**
```json
{
  "success": true,
  "count": 1
}
```

**Ajouter/Mettre à jour un guide unique:**
```http
POST http://192.168.1.11:3000/api/guides
Content-Type: application/json

{
  "id": "guide_1234567890_abc123",
  "propertyId": 1,
  "equipmentName": "Allumage TV",
  ...
}
```

**Response:**
```json
{
  "success": true,
  "guide": { ... }
}
```

---

### DELETE `/api/guides?id={id}`
Supprime un guide.

**Request:**
```http
DELETE http://192.168.1.11:3000/api/guides?id=guide_1234567890_abc123
```

**Response:**
```json
{
  "success": true
}
```

---

## 📱 Workflow Complet

### 1. Création d'un Guide (PC)
```
PC → Admin Panel → Guides Vidéo → Créer un guide
     ↓
   EquipmentVideoQR.tsx
     ↓
   Sauvegarde dans:
     - localStorage (local)
     - API /api/guides (serveur)
     ↓
   public/data/equipment-guides.json
```

### 2. Scan du QR Code (Mobile)
```
Mobile → Scan QR Code
     ↓
   URL: http://192.168.1.11:3000/guide/[id]
     ↓
   /guide/[id]/page.tsx
     ↓
   Charge depuis:
     1. API /api/guides?id=[id] (priorité)
     2. localStorage (fallback)
     ↓
   Affiche la vidéo
```

### 3. Synchronisation Automatique
```
Au chargement de EquipmentVideoQR:
  1. Charge depuis API
  2. Si API vide → charge localStorage
  3. Si localStorage a des données → sync vers API
  
À chaque sauvegarde:
  1. Sauvegarde dans localStorage
  2. Sauvegarde dans API (automatique)
```

---

## 🗂️ Structure du Fichier JSON

**Emplacement:** `public/data/equipment-guides.json`

**Format:**
```json
[
  {
    "id": "guide_1774810197803_83kz1c",
    "propertyId": 1,
    "equipmentName": "Allumage TV",
    "category": "multimedia",
    "videoUrl": "/uploads/videos/video-1774810197803-83kz1ce.mov",
    "description": "Vidéo uploadée le 29/03/2026",
    "brand": "",
    "model": "",
    "purchaseDate": "",
    "warrantyUntil": "",
    "maintenanceNotes": "",
    "quickTips": [],
    "languages": ["fr"],
    "thumbnailUrl": "",
    "duration": "",
    "difficulty": "moyen",
    "views": 0,
    "rating": 0,
    "ratingCount": 0,
    "tags": [],
    "lastUpdated": "2026-03-29T18:49:36.387Z",
    "createdAt": "2026-03-29T18:49:36.387Z",
    "updatedAt": "2026-03-29T18:49:36.387Z"
  }
]
```

---

## 🧪 Tests

### Test 1: Vérifier l'API
```powershell
# PC - Ouvrir PowerShell
Invoke-WebRequest -Uri "http://192.168.1.11:3000/api/guides" -UseBasicParsing
```

**Résultat attendu:** Liste des guides en JSON

---

### Test 2: Vérifier le fichier JSON
```powershell
# PC - Vérifier que le fichier existe
Get-Content "C:\Users\claus\BNBGEST\public\data\equipment-guides.json" | ConvertFrom-Json
```

**Résultat attendu:** Array de guides

---

### Test 3: Test depuis Mobile
```
1. Téléphone sur le MÊME WiFi que le PC
2. Ouvrir navigateur mobile
3. URL: http://192.168.1.11:3000/api/guides
4. Devrait afficher les guides en JSON
```

---

### Test 4: Test QR Code Complet
```
1. PC: Créer un guide dans Admin
2. PC: Télécharger le QR code
3. Mobile: Scanner le QR code
4. Mobile: La vidéo devrait s'afficher
```

---

## 🔧 Dépannage

### Erreur: "Guide introuvable"

**Vérification 1: L'API fonctionne?**
```powershell
Invoke-WebRequest -Uri "http://192.168.1.11:3000/api/guides" -UseBasicParsing
```

**Vérification 2: Le fichier JSON existe?**
```powershell
Test-Path "C:\Users\claus\BNBGEST\public\data\equipment-guides.json"
```

**Vérification 3: Le guide existe dans le fichier?**
```powershell
$guides = Get-Content "C:\Users\claus\BNBGEST\public\data\equipment-guides.json" | ConvertFrom-Json
$guides | Format-Table id, equipmentName
```

**Vérification 4: Le mobile est sur le bon réseau?**
```
Mobile → Paramètres WiFi
Vérifier: Connecté au même WiFi que le PC
IP doit être dans 192.168.1.x
```

---

### Erreur: "Failed to fetch"

**Cause possible:** Serveur non démarré

**Solution:**
```powershell
# Vérifier si le serveur tourne
netstat -ano | findstr :3000

# Redémarrer le serveur
npm start
```

---

### Migration de guides existants

**Si vous aviez déjà créé des guides avant cette mise à jour:**

1. Ouvrez `http://192.168.1.11:3000/admin`
2. Allez dans "Guides Vidéo Équipements"
3. Les guides existants dans `localStorage` seront AUTOMATIQUEMENT synchronisés avec l'API
4. Aucune action manuelle requise

**Vérification:**
```powershell
# Le fichier JSON devrait contenir vos guides
Get-Content "C:\Users\claus\BNBGEST\public\data\equipment-guides.json" | ConvertFrom-Json
```

---

## 💡 Avantages de cette Solution

✅ **Partage multi-appareils**
- Un guide créé sur PC est accessible depuis mobile, tablette, etc.

✅ **Persistance**
- Les guides sont sauvegardés sur le serveur
- Survit aux vidages de cache du navigateur

✅ **Compatibilité**
- Fallback sur localStorage si l'API est indisponible
- Synchronisation bidirectionnelle automatique

✅ **Performance**
- Chargement depuis le serveur (pas de limite de taille localStorage)
- Pas de duplication entre appareils

---

## 📝 Fichiers Modifiés

1. **app/api/guides/route.ts** (NOUVEAU)
   - Gestion de l'API GET/POST/DELETE
   - Stockage dans `public/data/equipment-guides.json`

2. **app/guide/[id]/page.tsx** (MODIFIÉ)
   - Charge depuis l'API en priorité
   - Fallback sur localStorage

3. **components/EquipmentVideoQR.tsx** (MODIFIÉ)
   - Synchronisation automatique avec l'API
   - Sauvegarde simultanée localStorage + API

---

## 🚀 Déploiement

**Le système est déjà déployé et fonctionnel !**

Pour vérifier:
```powershell
# 1. Serveur démarré?
netstat -ano | findstr :3000

# 2. API accessible?
Invoke-WebRequest -Uri "http://192.168.1.11:3000/api/guides"

# 3. Fichier JSON créé?
Test-Path "C:\Users\claus\BNBGEST\public\data\equipment-guides.json"
```

**Prochaine étape:** Créez votre premier guide et testez le QR code !

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez que le serveur tourne sur port 3000
2. Vérifiez que le mobile est sur le même WiFi
3. Testez l'API depuis le PC avant de tester depuis mobile
4. Consultez les logs du serveur en cas d'erreur

**Logs serveur:**
```powershell
# Si démarré avec npm start, les logs s'affichent dans la fenêtre PowerShell
```

---

**Date de création:** 29 mars 2026  
**Version:** 1.0  
**Statut:** ✅ Déployé et opérationnel
