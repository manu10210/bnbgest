import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');
    
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'videos');
    
    // Trouver les fichiers correspondants (vidéo + métadonnées)
    const metadataPath = join(uploadsDir, `${videoId}-metadata.json`);
    
    // Lire le fichier de métadonnées pour obtenir le nom du fichier vidéo
    const fs = require('fs').promises;
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    const videoPath = join(uploadsDir, metadata.fileName);
    
    // Supprimer les deux fichiers
    await unlink(videoPath);
    await unlink(metadataPath);
    
    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete video', message: error.message },
      { status: 500 }
    );
  }
}
