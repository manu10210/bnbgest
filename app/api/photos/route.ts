import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';

export interface PhotoFile {
  filename: string;
  url: string;
  session: string;
  uploadedAt: string;
  size: number;
}

export async function GET() {
  try {
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    let files: string[] = [];
    try {
      files = await readdir(uploadDir);
    } catch {
      return NextResponse.json({ photos: [], total: 0 });
    }

    // Filtrer uniquement les images
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
    const imageFiles = files.filter(f =>
      imageExtensions.some(ext => f.toLowerCase().endsWith(ext))
    );

    // Construire la liste avec métadonnées
    const photos: PhotoFile[] = await Promise.all(
      imageFiles.map(async (filename) => {
        const filePath = join(uploadDir, filename);
        let fileSize = 0;
        let mtime = new Date();
        try {
          const stats = await stat(filePath);
          fileSize = stats.size;
          mtime = stats.mtime;
        } catch {
          // ignore
        }

        // Extraire la session du nom : property_SESSION_TIMESTAMP_RANDOM.ext
        // Format: property_session_XXXX_YYYY_TIMESTAMP_RANDOM.ext
        const parts = filename.split('_');
        let session = 'default';
        // Le nom est: property_session_<ts>_<rand>_<ts2>_<rand2>.ext
        // session = parts[1]+'_'+parts[2]+'_'+parts[3]
        if (parts.length >= 4) {
          session = `${parts[1]}_${parts[2]}_${parts[3]}`;
        }

        // Extraire timestamp d'upload depuis le nom de fichier (5ème segment)
        let uploadedAt = mtime.toISOString();
        if (parts.length >= 5) {
          const ts = parseInt(parts[4]);
          if (!isNaN(ts) && ts > 1000000000000) {
            uploadedAt = new Date(ts).toISOString();
          }
        }

        return {
          filename,
          url: `/uploads/${filename}`,
          session,
          uploadedAt,
          size: fileSize,
        };
      })
    );

    // Trier par date d'upload décroissante
    photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({
      photos,
      total: photos.length,
      sessions: [...new Set(photos.map(p => p.session))],
    });

  } catch (error) {
    console.error('Erreur lecture photos:', error);
    return NextResponse.json({ error: 'Erreur lecture photos' }, { status: 500 });
  }
}

// ── DELETE /api/photos?filename=xxx ──────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Paramètre filename requis' }, { status: 400 });
    }

    // Sécurité : interdire les path traversal
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 });
    }

    const filepath = join(process.cwd(), 'public', 'uploads', filename);

    // Vérifier que le fichier existe
    try {
      await stat(filepath);
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
    }

    await unlink(filepath);
    return NextResponse.json({ success: true, deleted: filename });
  } catch (error) {
    console.error('Erreur suppression photo:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
