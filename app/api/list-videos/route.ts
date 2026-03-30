import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'videos');
    
    // Lire tous les fichiers du dossier
    const files = await readdir(uploadsDir);
    
    // Filtrer uniquement les fichiers JSON de métadonnées
    const metadataFiles = files.filter(f => f.endsWith('-metadata.json'));
    
    // Lire chaque fichier de métadonnées
    const videos = await Promise.all(
      metadataFiles.map(async (file) => {
        try {
          const filePath = join(uploadsDir, file);
          const content = await readFile(filePath, 'utf-8');
          const metadata = JSON.parse(content);
          return metadata;
        } catch (error) {
          console.error(`Error reading ${file}:`, error);
          return null;
        }
      })
    );
    
    // Filtrer les résultats null et trier par date (plus récent en premier)
    const validVideos = videos
      .filter(v => v !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json({
      success: true,
      videos: validVideos,
      count: validVideos.length
    });
  } catch (error: any) {
    console.error('Error listing videos:', error);
    
    // Si le dossier n'existe pas, retourner une liste vide
    if (error.code === 'ENOENT') {
      return NextResponse.json({
        success: true,
        videos: [],
        count: 0
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to list videos', message: error.message },
      { status: 500 }
    );
  }
}
