import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const GUIDES_FILE = path.join(process.cwd(), 'public', 'data', 'equipment-guides.json');

// Assurer que le dossier data existe
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Lire les guides depuis le fichier JSON
function readGuides() {
  ensureDataDir();
  if (!fs.existsSync(GUIDES_FILE)) {
    fs.writeFileSync(GUIDES_FILE, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(GUIDES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Écrire les guides dans le fichier JSON
function writeGuides(guides: any[]) {
  ensureDataDir();
  fs.writeFileSync(GUIDES_FILE, JSON.stringify(guides, null, 2));
}

// GET - Récupérer tous les guides ou un guide spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    const guides = readGuides();

    if (id) {
      const guide = guides.find((g: any) => g.id === id);
      if (!guide) {
        return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
      }
      return NextResponse.json(guide);
    }

    return NextResponse.json(guides);
  } catch (error) {
    console.error('Error reading guides:', error);
    return NextResponse.json({ error: 'Failed to read guides' }, { status: 500 });
  }
}

// POST - Créer ou mettre à jour des guides
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (Array.isArray(body)) {
      // Remplacer tous les guides
      writeGuides(body);
      return NextResponse.json({ success: true, count: body.length });
    } else if (body.id) {
      // Mettre à jour ou ajouter un guide unique
      const guides = readGuides();
      const index = guides.findIndex((g: any) => g.id === body.id);
      
      if (index >= 0) {
        guides[index] = body;
      } else {
        guides.push(body);
      }
      
      writeGuides(guides);
      return NextResponse.json({ success: true, guide: body });
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error writing guides:', error);
    return NextResponse.json({ error: 'Failed to write guides' }, { status: 500 });
  }
}

// DELETE - Supprimer un guide
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const guides = readGuides();
    const filteredGuides = guides.filter((g: any) => g.id !== id);

    if (guides.length === filteredGuides.length) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    writeGuides(filteredGuides);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting guide:', error);
    return NextResponse.json({ error: 'Failed to delete guide' }, { status: 500 });
  }
}
