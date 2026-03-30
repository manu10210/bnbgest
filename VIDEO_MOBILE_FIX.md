# 🎬 Fix Vidéo Mobile - Documentation

## ✅ Problème Résolu

### Symptôme
- La vidéo ne se lance pas sur le téléphone mobile
- La page du guide s'ouvre mais la vidéo ne joue pas
- Possible message d'erreur dans le lecteur vidéo

### Causes Identifiées

1. **AutoPlay bloqué** : Les navigateurs mobiles (iOS Safari, Chrome Android) bloquent l'autoplay des vidéos
2. **Format .MOV** : QuickTime (.mov) peut avoir des problèmes de compatibilité sur Android
3. **CORS** : Accès cross-origin depuis le mobile peut être bloqué
4. **Streaming** : Les fichiers volumineux nécessitent le support des Range requests

---

## 🔧 Solution Implémentée

### 1. Nouvelle API de Streaming Vidéo

**Fichier créé :** `app/api/video/[filename]/route.ts`

**Fonctionnalités :**
- ✅ Streaming progressif (charge par morceaux)
- ✅ Support Range requests (pour seek/navigation dans la vidéo)
- ✅ Headers CORS corrects (`Access-Control-Allow-Origin: *`)
- ✅ Cache optimisé (31536000 secondes = 1 an)
- ✅ Support multi-format (MP4, MOV, AVI, WebM, MKV)
- ✅ Détection automatique du type MIME

**Endpoint :**
```
GET /api/video/[filename]
```

**Exemple :**
```
http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov
```

---

### 2. Page Guide Améliorée

**Fichier modifié :** `app/guide/[id]/page.tsx`

**Modifications :**

#### Avant :
```tsx
<video
  src={guide.videoUrl}
  controls
  autoPlay  // ❌ Bloqué sur mobile
  playsInline
>
```

#### Après :
```tsx
<video
  src={videoSrc}  // ✅ Utilise l'API streaming
  controls
  playsInline
  preload="metadata"  // ✅ Charge plus vite
  crossOrigin="anonymous"  // ✅ CORS
>
  <source src={videoSrc} type="video/quicktime" />
  <source src={videoSrc} type="video/mp4" />
</video>
```

**Améliorations :**
- ✅ Suppression de `autoPlay` (l'utilisateur doit cliquer Play)
- ✅ Ajout de `preload="metadata"` (affiche le poster et la durée)
- ✅ Ajout de `crossOrigin="anonymous"` (permet CORS)
- ✅ Sources multiples (QuickTime + MP4)
- ✅ URL pointant vers l'API streaming au lieu du fichier direct

---

## 🧪 Tests

### Test 1 : API Streaming (PC)

**URL :**
```
http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov
```

**Commande PowerShell :**
```powershell
Invoke-WebRequest -Uri "http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov" -Method Head
```

**Résultat attendu :**
```
Status: 200
Content-Type: video/quicktime
Content-Length: 68898985 (65.7 MB)
Accept-Ranges: bytes
```

---

### Test 2 : Page Guide (PC)

**URL :**
```
http://192.168.1.11:3000/guide/guide_1774812731254_nlbqvr
```

**Résultat attendu :**
- Page s'affiche correctement
- Lecteur vidéo visible avec contrôles
- Bouton Play fonctionnel
- Vidéo joue après clic sur Play

---

### Test 3 : QR Code (Mobile)

**Procédure :**
1. Téléphone connecté au même WiFi que le PC (192.168.1.x)
2. Scanner le QR code depuis l'Admin
3. La page s'ouvre : `http://192.168.1.11:3000/guide/[id]`
4. Lecteur vidéo visible
5. Cliquer sur Play ▶️
6. Vidéo commence à jouer

**Si ça ne marche pas :**
- Vérifier connexion WiFi (même réseau)
- Tester l'URL manuellement dans le navigateur mobile
- Vérifier les logs du serveur
- Essayer sur un autre navigateur mobile (Safari vs Chrome)

---

## 📱 Compatibilité Mobile

### iOS (iPhone/iPad)

✅ **Safari iOS** :
- QuickTime (.mov) : ✅ Natif
- MP4 : ✅ Natif
- Streaming : ✅ Support complet
- Range requests : ✅ Support complet

✅ **Chrome iOS** :
- Utilise le moteur Safari
- Mêmes compatibilités que Safari

### Android

✅ **Chrome Android** :
- QuickTime (.mov) : ⚠️ Limité (peut ne pas fonctionner)
- MP4 : ✅ Natif
- Streaming : ✅ Support complet
- Range requests : ✅ Support complet

⚠️ **Firefox Android** :
- QuickTime (.mov) : ❌ Non supporté
- MP4 : ✅ Natif
- Streaming : ✅ Support complet

**Recommandation :** Convertir les .mov en .mp4 pour une meilleure compatibilité Android.

---

## 🔄 Conversion Vidéo (Optionnel)

Si les vidéos .mov ne fonctionnent pas sur Android, les convertir en .mp4 :

### Avec FFmpeg (gratuit)

**Installation :**
```powershell
# Télécharger depuis https://ffmpeg.org/download.html
```

**Conversion :**
```powershell
ffmpeg -i "C:\Users\claus\BNBGEST\public\uploads\videos\video-1774812652430-dj3dmak.mov" `
       -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k `
       "C:\Users\claus\BNBGEST\public\uploads\videos\video-1774812652430-dj3dmak.mp4"
```

**Paramètres :**
- `-c:v libx264` : Codec vidéo H.264 (universel)
- `-crf 23` : Qualité (0-51, 23 = bonne qualité)
- `-c:a aac` : Codec audio AAC (universel)
- `-b:a 128k` : Bitrate audio 128 kbps

**Après conversion :**
Mettre à jour le guide pour pointer vers le fichier .mp4 au lieu de .mov.

---

## 🛠️ Dépannage

### Erreur : "Failed to load resource"

**Cause :** Fichier vidéo introuvable ou permissions incorrectes

**Solution :**
```powershell
# Vérifier que le fichier existe
Test-Path "C:\Users\claus\BNBGEST\public\uploads\videos\video-1774812652430-dj3dmak.mov"

# Vérifier les permissions (doit être accessible en lecture)
Get-Acl "C:\Users\claus\BNBGEST\public\uploads\videos\video-1774812652430-dj3dmak.mov"
```

---

### Erreur : "CORS policy blocked"

**Cause :** Headers CORS manquants

**Solution :** Vérifier que l'API `/api/video/[filename]` retourne bien :
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

**Test :**
```powershell
$r = Invoke-WebRequest -Uri "http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov" -Method Head
$r.Headers['Access-Control-Allow-Origin']  # Devrait afficher: *
```

---

### Vidéo ne joue pas sur Android

**Cause :** Format QuickTime (.mov) non supporté

**Solutions :**
1. **Option A** : Convertir en MP4 (voir section Conversion)
2. **Option B** : Re-uploader la vidéo depuis Android au format MP4
3. **Option C** : Utiliser l'appareil photo en mode "Compatible" (MP4)

---

### Vidéo se charge lentement

**Cause :** Fichier trop volumineux

**Solutions :**
1. **Compression** :
```powershell
# Réduire la taille sans perte visible de qualité
ffmpeg -i input.mov -c:v libx264 -crf 28 -preset slow output.mp4
```

2. **Résolution** : Réduire de 4K à 1080p
```powershell
ffmpeg -i input.mov -vf scale=1920:1080 output.mp4
```

3. **Cache** : Le cache est déjà activé (31536000 secondes)

---

## 📊 Statistiques Vidéo

**Vidéo actuelle :**
- **ID :** 1774812652430-dj3dmak
- **Nom :** Lock sur plaque de cuisson
- **Format :** QuickTime (.mov)
- **Taille :** 68,898,985 bytes (65.7 MB)
- **Date :** 29/03/2026 19:30:29
- **Source :** iPhone (IMG_8779.mov)

**Guide associé :**
- **ID :** guide_1774812731254_nlbqvr
- **Nom :** Lock sur plaque de cuisson
- **Catégorie :** Electroménager
- **Propriété :** ID 1

---

## 🚀 URLs de Test

### PC (Navigateur)
```
http://192.168.1.11:3000/admin
http://192.168.1.11:3000/guide/guide_1774812731254_nlbqvr
http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov
http://192.168.1.11:3000/api/guides
```

### Mobile (Navigateur ou QR Code)
```
http://192.168.1.11:3000/guide/guide_1774812731254_nlbqvr
```

---

## 📝 Architecture du Système

```
┌─────────────────────────────────────────────────┐
│ Mobile (iPhone/Android)                         │
│ Scanner QR Code                                 │
└─────────────────────────────────────────────────┘
                    ↓
        http://192.168.1.11:3000/guide/[id]
                    ↓
┌─────────────────────────────────────────────────┐
│ Next.js Route: /guide/[id]/page.tsx             │
│ 1. Charge guide depuis /api/guides?id=[id]     │
│ 2. Affiche la page avec vidéo player           │
│ 3. Vidéo src = /api/video/[filename]           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ API Route: /api/video/[filename]/route.ts      │
│ 1. Lit le fichier dans public/uploads/videos/  │
│ 2. Gère Range requests pour streaming          │
│ 3. Retourne la vidéo avec headers CORS         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Fichier: public/uploads/videos/video-*.mov     │
│ Vidéo originale uploadée depuis mobile         │
└─────────────────────────────────────────────────┘
```

---

## ✨ Améliorations Futures

### 1. Conversion Automatique
Convertir automatiquement les .mov en .mp4 lors de l'upload.

### 2. Miniatures Vidéo
Générer des thumbnails automatiques pour l'aperçu.

### 3. Transcoding Multi-Résolution
Créer plusieurs versions (360p, 720p, 1080p) pour s'adapter à la connexion.

### 4. CDN
Utiliser un CDN (Cloudflare, AWS CloudFront) pour une meilleure performance mondiale.

### 5. Analytics
Tracker les vues, durée de visionnage, taux de complétion.

---

## 📞 Support

Si le problème persiste après avoir appliqué tous ces correctifs :

1. **Vérifier les logs serveur** :
   - Regarder la fenêtre PowerShell où `npm start` tourne
   - Chercher des erreurs lors de l'accès à `/api/video/`

2. **Tester avec curl** :
   ```bash
   curl -I http://192.168.1.11:3000/api/video/video-1774812652430-dj3dmak.mov
   ```

3. **Console navigateur mobile** :
   - Sur iOS Safari : Settings → Safari → Advanced → Web Inspector
   - Sur Android Chrome : chrome://inspect

4. **Tester sur plusieurs appareils** :
   - Différents navigateurs
   - iOS vs Android
   - WiFi vs 4G/5G (nécessite exposer le serveur)

---

**Date de création :** 29 mars 2026  
**Version :** 1.0  
**Statut :** ✅ Déployé et opérationnel  
**Vidéo test :** Lock sur plaque de cuisson (65.7 MB .mov)
