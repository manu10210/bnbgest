import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const video = formData.get('video') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const uploadedFrom = formData.get('uploadedFrom') as string;
    const timestamp = formData.get('timestamp') as string;

    if (!video) {
      return NextResponse.json(
        { success: false, message: 'Aucune vidéo fournie' },
        { status: 400 }
      );
    }

    // Vérifier le type de fichier
    if (!video.type.startsWith('video/')) {
      return NextResponse.json(
        { success: false, message: 'Le fichier doit être une vidéo' },
        { status: 400 }
      );
    }

    // Créer le dossier uploads/videos s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'videos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const fileExtension = video.name.split('.').pop();
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const fileName = `video-${uniqueId}.${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Convertir le fichier en buffer et sauvegarder
    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Créer l'objet de métadonnées
    const videoMetadata = {
      id: uniqueId,
      title,
      category,
      fileName,
      filePath: `/uploads/videos/${fileName}`,
      uploadedFrom,
      timestamp: timestamp || new Date().toISOString(),
      size: video.size,
      type: video.type,
      originalName: video.name,
    };

    // Sauvegarder les métadonnées dans un fichier JSON
    const metadataPath = path.join(uploadsDir, `${uniqueId}-metadata.json`);
    await writeFile(metadataPath, JSON.stringify(videoMetadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Vidéo uploadée avec succès',
      data: videoMetadata,
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erreur lors de l\'upload de la vidéo',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Configuration pour accepter les gros fichiers
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
