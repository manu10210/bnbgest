export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { rateLimit } from '@/lib/rate-limit';

// Stockage temporaire des sessions d'upload
const uploadSessions = new Map<string, { propertyId: string; images: string[] }>();

// POST /api/upload - Upload d'images
// ✅ Protected: Auth required, Rate limited (upload: 5/60s)
export async function POST(request: NextRequest) {
  // 1. Rate limiting (strict pour uploads)
  const rateLimitResult = await rateLimit(request, 'upload');
  if (rateLimitResult) return rateLimitResult;

  // 2. Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID manquante' }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Aucune image reçue' }, { status: 400 });
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (_error) {
      // Le dossier existe déjà, c'est ok
    }

    const uploadedImages: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        continue; // Ignorer les fichiers non-images
      }

      // Générer un nom de fichier unique
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `property_${sessionId}_${timestamp}_${randomId}.${extension}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Sauvegarder le fichier
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);

      // Ajouter à la liste des images uploadées
      const imageUrl = `/uploads/${filename}`;
      uploadedImages.push(imageUrl);
    }

    // Mettre à jour la session
    const session = uploadSessions.get(sessionId) || { propertyId: sessionId, images: [] };
    session.images.push(...uploadedImages);
    uploadSessions.set(sessionId, session);

    return NextResponse.json({
      success: true,
      uploaded: uploadedImages.length,
      images: uploadedImages,
      total: session.images.length
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}

// Endpoint pour récupérer les images d'une session
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID manquante' }, { status: 400 });
  }

  const session = uploadSessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ images: [] });
  }

  return NextResponse.json({ images: session.images });
}