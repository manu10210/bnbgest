import { NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { IntegrationSettings } from '@/types/integrations';

const SETTINGS_FILE = path.join(process.cwd(), 'public', 'data', 'integration-settings.json');

// GET - Récupérer les paramètres
export async function GET() {
  try {
    // Créer le dossier si nécessaire
    const dir = path.dirname(SETTINGS_FILE);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Lire le fichier
    if (!existsSync(SETTINGS_FILE)) {
      return NextResponse.json({
        airbnb: { enabled: false, credentials: {} },
        booking: { enabled: false, credentials: {} }
      });
    }

    const data = await readFile(SETTINGS_FILE, 'utf-8');
    const settings: IntegrationSettings = JSON.parse(data);

    // Ne pas renvoyer les mots de passe
    if (settings.booking?.credentials) {
      const { password, ...rest } = settings.booking.credentials;
      settings.booking.credentials = rest as any;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error reading integration settings:', error);
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    );
  }
}

// POST - Sauvegarder les paramètres
export async function POST(request: Request) {
  try {
    const settings: IntegrationSettings = await request.json();

    // Créer le dossier si nécessaire
    const dir = path.dirname(SETTINGS_FILE);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Sauvegarder
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));

    return NextResponse.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    console.error('Error saving integration settings:', error);
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
