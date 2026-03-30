# 📦 Migration du stockage vers Cloudinary

## Pourquoi Cloudinary ?

Vercel est **serverless**, ce qui signifie :
- ❌ Les fichiers uploadés (photos/vidéos) ne persistent pas après redéploiement
- ❌ Le dossier `public/uploads/` est réinitialisé à chaque build

**Solution :** Stocker les fichiers sur un service cloud externe.

## ☁️ Cloudinary - Solution recommandée

### Avantages
- ✅ **Gratuit jusqu'à 25 GB**
- ✅ **Optimisation automatique** des images/vidéos
- ✅ **CDN mondial** ultra-rapide
- ✅ **Streaming vidéo** optimisé
- ✅ **API simple** avec SDK Next.js
- ✅ **Transformations d'images** à la volée

### Plan gratuit
- 25 GB de stockage
- 25 GB de bande passante/mois
- Largement suffisant pour démarrer

## 🚀 Configuration Cloudinary

### 1. Créer un compte

1. Allez sur [cloudinary.com](https://cloudinary.com)
2. Sign Up (gratuit)
3. Notez vos identifiants :
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Installer le SDK

```powershell
npm install cloudinary next-cloudinary
```

### 3. Configuration des variables d'environnement

Créez `.env.local` :

```env
# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Sur Vercel :
1. Dashboard > Settings > Environment Variables
2. Ajoutez les 3 variables ci-dessus

### 4. Exemple d'upload vidéo vers Cloudinary

Créez `lib/cloudinary.ts` :

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadVideo(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: 'bnbgest/equipment-videos',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}

export async function uploadImage(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'bnbgest/photos',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}
```

### 5. Modifier l'API d'upload vidéo

Modifiez `app/api/upload-video/route.ts` :

```typescript
import { uploadVideo } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    // Upload vers Cloudinary
    const result = await uploadVideo(file);
    
    return Response.json({
      success: true,
      videoUrl: result.secure_url, // URL Cloudinary
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
    });
  } catch (error) {
    return Response.json({ success: false, error }, { status: 500 });
  }
}
```

### 6. Utiliser les vidéos Cloudinary

Les vidéos seront maintenant accessibles via :
```
https://res.cloudinary.com/your_cloud_name/video/upload/v1234567890/bnbgest/equipment-videos/video.mp4
```

Avantages :
- ✅ URL permanente (ne change jamais)
- ✅ Streaming optimisé
- ✅ Compatible mobile (MP4 automatique)
- ✅ Pas de problème de stockage Vercel

## 🔄 Migration des vidéos existantes

Pour migrer vos vidéos actuelles :

```powershell
# Script PowerShell de migration
$videos = Get-ChildItem "public\uploads\videos\*.mov", "public\uploads\videos\*.mp4"

foreach ($video in $videos) {
    Write-Host "Upload: $($video.Name)"
    # Utilisez l'interface Cloudinary ou leur CLI
    # cloudinary upload $video.FullName
}
```

Ou via interface web Cloudinary : Media Library > Upload

## 📊 Alternatives à Cloudinary

Si vous préférez autre chose :

### Vercel Blob (Nouveau)
- Intégré à Vercel
- Simple à configurer
- Gratuit : 1 GB
- Prix : ~$0.15/GB/mois

```powershell
npm install @vercel/blob
```

### AWS S3
- Très utilisé
- Prix : ~$0.023/GB/mois
- Plus complexe à configurer

### Azure Blob Storage
- Alternative Microsoft
- Prix similaire à S3

## 📝 Checklist de migration

- [ ] Créer compte Cloudinary
- [ ] Installer `cloudinary` et `next-cloudinary`
- [ ] Configurer variables d'environnement
- [ ] Créer `lib/cloudinary.ts`
- [ ] Modifier API upload vidéo
- [ ] Modifier API upload photo
- [ ] Tester upload en local
- [ ] Migrer vidéos existantes
- [ ] Déployer sur Vercel
- [ ] Vérifier fonctionnement

## 🆘 Support

- [Documentation Cloudinary](https://cloudinary.com/documentation)
- [Next.js + Cloudinary](https://next.cloudinary.dev/)
