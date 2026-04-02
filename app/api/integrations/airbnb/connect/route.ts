/**
 * 🔗 Airbnb OAuth Connection
 * Initier la connexion OAuth avec Airbnb
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient } from '@/lib/airbnb-api';

export async function GET(request: NextRequest) {
  try {
    const client = createAirbnbClient();
    
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb API credentials not configured. Please set AIRBNB_CLIENT_ID and AIRBNB_CLIENT_SECRET in environment variables.'
      }, { status: 500 });
    }

    // Générer l'URL d'autorisation
    const state = crypto.randomUUID();
    const authUrl = client.getAuthorizationUrl(state);

    // Stocker le state dans la session (pour vérification)
    // TODO: Implémenter le stockage du state en session

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect user to authUrl to authorize'
    });

  } catch (error) {
    console.error('Airbnb connect error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate authorization URL',
      details: (error as Error).message
    }, { status: 500 });
  }
}
