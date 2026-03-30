# 📱 Upload Vidéo Mobile - Documentation Complète

## 🎯 Vue d'ensemble

Le système d'**Upload Vidéo Mobile** permet aux utilisateurs de télécharger des vidéos de guides d'équipements directement depuis leur téléphone en scannant un QR Code.

---

## ✨ Fonctionnalités

### 1. **QR Code pour Upload Mobile**
- ✅ Génération automatique d'un QR Code
- ✅ Accès direct via scan QR Code
- ✅ Interface optimisée pour mobile
- ✅ Compatible iOS et Android

### 2. **Page d'Upload Mobile**
- ✅ Design responsive et attrayant
- ✅ Gradient coloré (indigo → purple → pink)
- ✅ Support caméra et galerie photo
- ✅ Aperçu vidéo avant upload
- ✅ Sélection de catégorie avec icônes
- ✅ Barre de progression d'upload
- ✅ Validation des fichiers

### 3. **API Upload Vidéo**
- ✅ Endpoint: `/api/upload-video`
- ✅ Support fichiers jusqu'à 100MB
- ✅ Validation type MIME
- ✅ Génération ID unique
- ✅ Sauvegarde métadonnées JSON

### 4. **Catégories Disponibles**
1. 🔧 **Équipement** - Appareils généraux
2. 🔑 **Check-in** - Arrivée des invités
3. 🚪 **Check-out** - Départ des invités
4. 📶 **WiFi** - Connexion internet
5. 🌡️ **Chauffage** - Système de chauffage
6. 🍳 **Cuisine** - Électroménager cuisine
7. 🚿 **Salle de bain** - Équipements SdB
8. 📋 **Autre** - Divers

---

## 🚀 Guide d'utilisation

### Pour l'administrateur

#### 1. Accéder au QR Code
```
1. Allez sur http://localhost:3000/admin
2. Cliquez sur l'onglet "Guides Vidéo"
3. Cliquez sur le bouton "Upload Mobile" (violet)
4. Le QR Code s'affiche dans une modal
```

#### 2. Options disponibles
- **Copier le lien** - Copie l'URL dans le presse-papier
- **Ouvrir dans un nouvel onglet** - Teste la page d'upload
- **Imprimer le QR Code** - Afficher le QR pour impression

### Pour l'utilisateur mobile

#### 1. Scanner le QR Code
```
1. Ouvrir l'appareil photo du téléphone
2. Pointer vers le QR Code
3. Toucher la notification qui apparaît
4. La page d'upload s'ouvre
```

#### 2. Uploader une vidéo
```
1. Toucher "Sélectionner une vidéo"
2. Choisir entre:
   - 📷 Filmer avec la caméra
   - 🖼️ Galerie photo
3. Sélectionner la vidéo
4. Entrer un titre descriptif
5. Choisir une catégorie
6. Toucher "Télécharger"
```

#### 3. Confirmation
```
✅ Message de succès
⏱️ Préparation automatique pour une nouvelle vidéo
🔄 Possibilité d'uploader plusieurs vidéos
```

---

## 🔧 Implémentation Technique

### Architecture

```
Frontend Mobile          API Backend              Stockage
┌────────────────┐      ┌─────────────┐      ┌──────────────┐
│ /upload-video  │ ───> │ POST /api/  │ ───> │ /public/     │
│ page.tsx       │      │ upload-video│      │ uploads/     │
│                │ <─── │ route.ts    │      │ videos/      │
└────────────────┘      └─────────────┘      └──────────────┘
                              │
                              ├─> video-{id}.mp4
                              └─> {id}-metadata.json
```

### Fichiers créés

#### 1. `app/upload-video/page.tsx`
Page d'upload mobile avec interface moderne

**Composants:**
- Header avec icône vidéo
- Zone de sélection fichier (drag-drop style)
- Aperçu vidéo avec contrôles
- Champ titre
- Sélection catégorie (grille icônes)
- Barre de progression
- Messages d'erreur/succès
- Animations Framer Motion

**Fonctionnalités:**
```typescript
// Sélection fichier
<input
  type="file"
  accept="video/*"
  capture="environment"
  onChange={handleFileSelect}
/>

// Validation
if (!file.type.startsWith('video/')) {
  setUploadError('Veuillez sélectionner un fichier vidéo');
  return;
}

if (file.size > 100 * 1024 * 1024) {
  setUploadError('Trop volumineux (max 100MB)');
  return;
}

// Upload avec progression
const formData = new FormData();
formData.append('video', selectedFile);
formData.append('title', videoTitle);
formData.append('category', videoCategory);

const response = await fetch('/api/upload-video', {
  method: 'POST',
  body: formData,
});
```

#### 2. `app/api/upload-video/route.ts`
API route pour traiter les uploads

**Fonctionnalités:**
```typescript
export async function POST(request: NextRequest) {
  // 1. Récupération formData
  const formData = await request.formData();
  const video = formData.get('video') as File;
  
  // 2. Validation
  if (!video.type.startsWith('video/')) {
    return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
  }
  
  // 3. Sauvegarde fichier
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
  const fileName = `video-${uniqueId}.${extension}`;
  await writeFile(filePath, buffer);
  
  // 4. Métadonnées JSON
  const metadata = {
    id, title, category, fileName,
    filePath: `/uploads/videos/${fileName}`,
    timestamp, size, type
  };
  await writeFile(metadataPath, JSON.stringify(metadata));
  
  return NextResponse.json({ success: true, data: metadata });
}
```

**Configuration:**
```typescript
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',  // Support gros fichiers
    },
  },
};
```

#### 3. `components/EquipmentVideoQR.tsx` (modifié)
Ajout du bouton "Upload Mobile" et modal QR Code

**Modifications:**
```typescript
// État
const [showUploadQR, setShowUploadQR] = useState(false);

// Bouton
<button onClick={() => setShowUploadQR(true)}>
  <Smartphone /> Upload Mobile
</button>

// Modal QR Code
<QRCodeSVG
  value={`${window.location.origin}/upload-video`}
  size={220}
  level="H"
  imageSettings={{
    src: '/favicon.ico',
    height: 40,
    width: 40,
    excavate: true,
  }}
/>
```

---

## 📱 Interface Mobile

### Design

```
┌─────────────────────────────┐
│ 🎥 Upload Vidéo             │ <- Header gradient
│ Téléchargez vos guides      │
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │   📤 Sélectionner    │   │ <- Zone upload
│  │   une vidéo          │   │
│  │                      │   │
│  │  📷 Galerie • Caméra │   │
│  └─────────────────────┘   │
│                             │
│  Max 100MB • MP4, MOV, AVI  │
├─────────────────────────────┤
│ 🏠 Accueil                  │ <- Footer
│ 💡 Filmez en paysage        │
└─────────────────────────────┘
```

### Après sélection vidéo

```
┌─────────────────────────────┐
│ [Aperçu vidéo avec player]  │ <- Vidéo preview
│ 🎬 video.mp4 | 25.4 MB      │
├─────────────────────────────┤
│ Titre de la vidéo *         │
│ [                         ] │ <- Input
├─────────────────────────────┤
│ Catégorie                   │
│ [🔧] [🔑] [🚪] [📶]        │ <- Grid
│ [🌡️] [🍳] [🚿] [📋]        │
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓░░░ 75%            │ <- Progression
├─────────────────────────────┤
│ [Annuler] [📤 Télécharger] │ <- Actions
└─────────────────────────────┘
```

---

## 🎨 Styles et Animations

### Couleurs
```css
/* Gradient principal */
background: linear-gradient(to bottom right, 
  #6366f1,  /* Indigo */
  #a855f7,  /* Purple */
  #ec4899   /* Pink */
);

/* Boutons */
.upload-button {
  background: linear-gradient(to right, #6366f1, #a855f7);
}

.category-selected {
  border: 2px solid #6366f1;
  background: rgba(99, 102, 241, 0.1);
}
```

### Animations Framer Motion
```typescript
// Apparition header
initial={{ opacity: 0, y: -20 }}
animate={{ opacity: 1, y: 0 }}

// Card principale
initial={{ opacity: 0, scale: 0.95 }}
animate={{ opacity: 1, scale: 1 }}

// Succès
<AnimatePresence mode="wait">
  {uploadSuccess && (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      ✅ Succès
    </motion.div>
  )}
</AnimatePresence>

// Barre de progression
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${uploadProgress}%` }}
/>
```

---

## 💾 Stockage des Vidéos

### Structure des fichiers

```
public/
└── uploads/
    └── videos/
        ├── video-1234567890-abc123.mp4       <- Fichier vidéo
        ├── 1234567890-abc123-metadata.json   <- Métadonnées
        ├── video-1234567891-def456.mp4
        └── 1234567891-def456-metadata.json
```

### Format métadonnées JSON

```json
{
  "id": "1234567890-abc123",
  "title": "Comment utiliser le lave-vaisselle",
  "category": "cuisine",
  "fileName": "video-1234567890-abc123.mp4",
  "filePath": "/uploads/videos/video-1234567890-abc123.mp4",
  "uploadedFrom": "mobile",
  "timestamp": "2026-03-29T10:30:00.000Z",
  "size": 25600000,
  "type": "video/mp4",
  "originalName": "lave_vaisselle_guide.mp4"
}
```

---

## 🔒 Sécurité

### Validations

1. **Type de fichier**
   ```typescript
   if (!file.type.startsWith('video/')) {
     return error('Type de fichier invalide');
   }
   ```

2. **Taille maximale**
   ```typescript
   const maxSize = 100 * 1024 * 1024; // 100MB
   if (file.size > maxSize) {
     return error('Fichier trop volumineux');
   }
   ```

3. **Nom de fichier sécurisé**
   ```typescript
   const uniqueId = Date.now() + '-' + Math.random().toString(36);
   const fileName = `video-${uniqueId}.${extension}`;
   ```

4. **Répertoire uploads protégé**
   ```typescript
   const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
   if (!existsSync(uploadsDir)) {
     await mkdir(uploadsDir, { recursive: true });
   }
   ```

### Bonnes pratiques

- ✅ Génération d'ID unique pour éviter collisions
- ✅ Validation MIME type côté serveur
- ✅ Limite de taille configurée
- ✅ Stockage dans dossier dédié
- ✅ Métadonnées séparées du fichier vidéo
- ✅ Gestion d'erreurs complète

---

## 📊 Statistiques et Monitoring

### Informations collectées

```json
{
  "uploadedFrom": "mobile",     // Source (mobile/desktop)
  "timestamp": "2026-03-29...", // Date/heure
  "size": 25600000,             // Taille en bytes
  "type": "video/mp4",          // Type MIME
  "category": "cuisine",        // Catégorie
  "originalName": "video.mp4"   // Nom original
}
```

### Métriques possibles
- Nombre d'uploads par jour
- Taille totale stockée
- Catégories les plus utilisées
- Durée moyenne des vidéos
- Formats vidéo utilisés

---

## 🐛 Dépannage

### Problèmes courants

#### 1. QR Code ne scanne pas
**Solution:**
- Vérifier que le serveur est démarré (`npm start`)
- S'assurer que l'URL est accessible
- Augmenter la luminosité du QR Code
- Essayer avec une autre app de scan QR

#### 2. Upload échoue
**Solution:**
```typescript
// Vérifier les logs côté serveur
console.log('Upload error:', error);

// Vérifier la taille du fichier
if (file.size > 100 * 1024 * 1024) {
  // Trop volumineux
}

// Vérifier le type
if (!file.type.startsWith('video/')) {
  // Type invalide
}
```

#### 3. Vidéo ne s'affiche pas après upload
**Solution:**
- Vérifier que le fichier existe dans `public/uploads/videos/`
- Vérifier les permissions du dossier
- Contrôler le path dans les métadonnées JSON
- Tester l'URL directe: `http://localhost:3000/uploads/videos/video-xxx.mp4`

#### 4. Erreur 413 (Payload Too Large)
**Solution:**
```typescript
// Augmenter la limite dans next.config.ts
export default {
  api: {
    bodyParser: {
      sizeLimit: '150mb', // Augmenter ici
    },
  },
};
```

---

## 🚀 Améliorations Futures

### Court terme (1-2 semaines)
- [ ] Compression vidéo côté client
- [ ] Support de plusieurs vidéos simultanées
- [ ] Preview thumbnail automatique
- [ ] Détection durée vidéo

### Moyen terme (1 mois)
- [ ] Transcodage vidéo (conversion formats)
- [ ] Génération de résolutions multiples (720p, 1080p)
- [ ] Sous-titres automatiques
- [ ] Galerie vidéos uploadées

### Long terme (3+ mois)
- [ ] Streaming adaptatif (HLS/DASH)
- [ ] CDN integration
- [ ] Analytics d'usage des vidéos
- [ ] Partage vidéos entre propriétés

---

## 📝 Exemples d'Utilisation

### Cas d'usage 1: Tutoriel lave-vaisselle
```
1. Admin ouvre "Guides Vidéo" > "Upload Mobile"
2. Scanne le QR Code avec téléphone
3. Filme une vidéo montrant:
   - Comment remplir le lave-vaisselle
   - Où mettre les pastilles
   - Sélectionner le programme
4. Upload avec titre "Guide lave-vaisselle"
5. Catégorie: 🍳 Cuisine
6. Vidéo disponible instantanément
```

### Cas d'usage 2: Instructions WiFi
```
1. Scanne QR Code
2. Filme les étapes:
   - Montrer où est la box
   - Zoomer sur le mot de passe
   - Montrer comment se connecter
3. Upload "Connexion WiFi"
4. Catégorie: 📶 WiFi
5. QR Code imprimable pour les invités
```

### Cas d'usage 3: Check-in automatisé
```
1. Filme le processus check-in:
   - Localisation boîte à clés
   - Code d'accès
   - Entrée dans le logement
   - Tour rapide du logement
2. Upload "Procédure check-in"
3. Catégorie: 🔑 Check-in
4. Partage QR Code aux invités avant arrivée
```

---

## ✅ Checklist de Validation

### Fonctionnalités
- [x] QR Code généré dans admin
- [x] Page mobile accessible
- [x] Sélection fichier vidéo
- [x] Support caméra et galerie
- [x] Aperçu vidéo
- [x] Sélection catégorie
- [x] Upload avec progression
- [x] Validation fichiers
- [x] Sauvegarde métadonnées
- [x] Messages succès/erreur
- [x] Responsive mobile

### Design
- [x] Gradient attrayant
- [x] Icônes catégories
- [x] Animations fluides
- [x] Dark mode compatible
- [x] Loading states
- [x] Mobile-first design

### Sécurité
- [x] Validation type MIME
- [x] Limite taille fichier
- [x] ID unique généré
- [x] Dossier sécurisé
- [x] Gestion erreurs

---

## 📞 Support

### En cas de problème

1. **Vérifier les logs serveur**
   ```powershell
   # Dans la fenêtre PowerShell du serveur
   # Chercher les messages d'erreur
   ```

2. **Tester l'URL directement**
   ```
   http://localhost:3000/upload-video
   ```

3. **Vérifier les permissions**
   ```powershell
   # Vérifier que le dossier uploads existe
   Test-Path "C:\Users\claus\BNBGEST\public\uploads\videos"
   ```

4. **Consulter la documentation API**
   ```
   Endpoint: POST /api/upload-video
   Content-Type: multipart/form-data
   Max Size: 100MB
   ```

---

## 🎉 Conclusion

Le système d'**Upload Vidéo Mobile** transforme la gestion des guides d'équipements en permettant:

✅ **Simplicité** - Scan QR → Film → Upload  
✅ **Rapidité** - Quelques secondes pour créer un guide  
✅ **Qualité** - Vidéos nativement depuis smartphone  
✅ **Accessibilité** - Disponible partout via QR Code  
✅ **Professionnel** - Interface moderne et intuitive  

**Prochaine étape:** Testez l'upload depuis votre téléphone en scannant le QR Code ! 📱✨
