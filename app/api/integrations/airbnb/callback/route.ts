/**
 * 🔐 Airbnb OAuth Callback
 * Route pour recevoir le code d'autorisation OAuth2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient } from '@/lib/airbnb-api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Vérifier s'il y a une erreur
    if (error) {
      console.error('Airbnb OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${error}`, request.url)
      );
    }

    // Vérifier le code
    if (!code) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', request.url)
      );
    }

    // Créer le client Airbnb
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=client_not_configured', request.url)
      );
    }

    // Échanger le code contre un token
    const tokens = await client.exchangeCodeForToken(code);

    // Sauvegarder les tokens en base de données
    await prisma.integrationSetting.upsert({
      where: { platform: 'airbnb' },
      update: {
        enabled: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(tokens.expiresAt),
        syncStatus: 'success',
        lastSyncAt: new Date(),
      },
      create: {
        platform: 'airbnb',
        enabled: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: new Date(tokens.expiresAt),
        syncStatus: 'success',
        lastSyncAt: new Date(),
      },
    });

    console.log('✅ Airbnb OAuth tokens saved successfully');

    // Rediriger vers la page des paramètres avec succès
    return NextResponse.redirect(
      new URL('/settings/integrations?success=airbnb_connected', request.url)
    );

  } catch (error) {
    console.error('Airbnb OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=oauth_failed', request.url)
    );
  }
}
