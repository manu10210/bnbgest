/**
 * 🏠 Airbnb Listings Sync
 * Synchroniser les propriétés Airbnb
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAirbnbClient } from '@/lib/airbnb-api';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Récupérer les tokens depuis la DB
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled || !settings.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Airbnb not connected. Please connect first.'
      }, { status: 401 });
    }

    // Créer le client et définir les tokens
    const client = createAirbnbClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create Airbnb client'
      }, { status: 500 });
    }

    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'listings:read',
    });

    // Récupérer les listings Airbnb
    const { listings, total } = await client.getListings({ status: 'active' });

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Synchroniser chaque listing
    for (const listing of listings) {
      try {
        // Chercher si la propriété existe déjà
        const existingProperty = await prisma.property.findFirst({
          where: { 
            OR: [
              { externalId: listing.id },
              { name: listing.name }
            ]
          }
        });

        const propertyData: any = {
          name: listing.name,
          description: listing.description,
          address: `${listing.address.street}, ${listing.address.city}, ${listing.address.state} ${listing.address.zipCode}`,
          city: listing.address.city,
          country: listing.address.country,
          zipCode: listing.address.zipCode,
          type: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          capacity: listing.accommodates,
          maxGuests: listing.accommodates,
          price: listing.pricing.basePrice,
          pricePerNight: listing.pricing.basePrice,
          cleaningFee: listing.pricing.cleaningFee || 0,
          status: listing.status === 'active' ? 'ACTIVE' as const : 'INACTIVE' as const,
          externalId: listing.id,
          externalSource: 'airbnb',
          amenities: listing.amenities,
          images: listing.photos.map(p => p.url),
          metadata: {
            airbnbListingId: listing.id,
            roomType: listing.roomType,
            beds: listing.beds,
            minNights: listing.availability.minNights,
            maxNights: listing.availability.maxNights,
            instantBookable: listing.availability.instantBookable,
            houseRules: listing.houseRules,
            location: {
              latitude: listing.address.latitude,
              longitude: listing.address.longitude,
            },
          },
        };

        if (existingProperty) {
          // Mettre à jour
          await prisma.property.update({
            where: { id: existingProperty.id },
            data: propertyData
          });
          updatedCount++;
        } else {
          // Créer - nécessite userId
          const defaultUser = await prisma.user.findFirst();
          if (defaultUser) {
            await prisma.property.create({
              data: {
                ...propertyData,
                userId: defaultUser.id,
              }
            });
            createdCount++;
          }
        }

        syncedCount++;
      } catch (err) {
        console.error(`Error syncing listing ${listing.id}:`, err);
      }
    }

    // Mettre à jour les paramètres d'intégration
    await prisma.integrationSetting.update({
      where: { platform: 'airbnb' },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'success',
      }
    });

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} listings from Airbnb`,
      stats: {
        total,
        synced: syncedCount,
        created: createdCount,
        updated: updatedCount,
      }
    });

  } catch (error) {
    console.error('Airbnb listings sync error:', error);
    
    // Mettre à jour le statut d'erreur
    await prisma.integrationSetting.update({
      where: { platform: 'airbnb' },
      data: {
        syncStatus: 'error',
        lastSyncAt: new Date(),
      }
    }).catch(console.error);

    return NextResponse.json({
      success: false,
      error: 'Failed to sync listings',
      details: (error as Error).message
    }, { status: 500 });
  }
}
