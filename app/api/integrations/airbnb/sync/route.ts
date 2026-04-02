/**
 * 🔄 Airbnb Auto Sync Cron Job
 * Synchronisation automatique toutes les heures
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAirbnbClient, convertAirbnbReservationToBNBGest } from '@/lib/airbnb-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

export async function GET() {
  console.log('🔄 Starting Airbnb auto-sync...');
  
  try {
    // Récupérer les paramètres d'intégration
    const settings = await prisma.integrationSetting.findUnique({
      where: { platform: 'airbnb' }
    });

    if (!settings?.enabled) {
      return NextResponse.json({
        success: false,
        message: 'Airbnb integration not enabled'
      });
    }

    if (!settings.accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Airbnb not connected. Please authenticate first.'
      });
    }

    // Créer le client Airbnb
    const client = createAirbnbClient();
    if (!client) {
      throw new Error('Failed to create Airbnb client');
    }

    // Définir les tokens
    client.setTokens({
      accessToken: settings.accessToken,
      refreshToken: settings.refreshToken || '',
      expiresAt: settings.tokenExpiresAt?.getTime() || Date.now(),
      tokenType: 'Bearer',
      scope: 'listings:read reservations:read',
    });

    const syncResults = {
      listings: { synced: 0, created: 0, updated: 0, errors: 0 },
      reservations: { synced: 0, created: 0, updated: 0, errors: 0 },
    };

    // ======================================================================
    // 1. Synchroniser les listings
    // ======================================================================
    try {
      console.log('📋 Syncing listings...');
      const { listings } = await client.getListings({ status: 'active' });

      for (const listing of listings) {
        try {
          const existing = await prisma.property.findFirst({
            where: { 
              OR: [
                { externalId: listing.id },
                { AND: [{ name: listing.name }, { externalSource: 'airbnb' }] }
              ]
            }
          });

          const propertyData: any = {
            name: listing.name,
            description: listing.description,
            address: `${listing.address.street}, ${listing.address.city}`,
            city: listing.address.city,
            country: listing.address.country,
            zipCode: listing.address.zipCode,
            type: listing.propertyType,
            bedrooms: listing.bedrooms,
            bathrooms: listing.bathrooms,
            maxGuests: listing.accommodates,
            capacity: listing.accommodates,
            pricePerNight: listing.pricing.basePrice,
            price: listing.pricing.basePrice,
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
              pricing: listing.pricing,
              availability: listing.availability,
              houseRules: listing.houseRules,
            },
          };

          if (existing) {
            // Mettre à jour
            await prisma.property.update({
              where: { id: existing.id },
              data: propertyData
            });
            syncResults.listings.updated++;
          } else {
            // Créer (nécessite userId)
            const defaultUser = await prisma.user.findFirst();
            if (defaultUser) {
              await prisma.property.create({
                data: {
                  ...propertyData,
                  userId: defaultUser.id,
                }
              });
              syncResults.listings.created++;
            }
          }
          syncResults.listings.synced++;
        } catch (err) {
          console.error(`Error syncing listing ${listing.id}:`, err);
          syncResults.listings.errors++;
        }
      }

      console.log(`✅ Listings sync: ${syncResults.listings.synced} synced, ${syncResults.listings.created} created, ${syncResults.listings.updated} updated`);
    } catch (error) {
      console.error('Listings sync error:', error);
    }

    // ======================================================================
    // 2. Synchroniser les réservations
    // ======================================================================
    try {
      console.log('📅 Syncing reservations...');
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12);

      const { reservations } = await client.getReservations({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      for (const reservation of reservations) {
        try {
          const property = await prisma.property.findFirst({
            where: { 
              AND: [
                { externalId: reservation.listingId },
                { externalSource: 'airbnb' }
              ]
            }
          });

          if (!property) {
            console.warn(`Property not found for listing ${reservation.listingId}`);
            continue;
          }

          const bookingData = convertAirbnbReservationToBNBGest(reservation);
          const existing = await prisma.booking.findFirst({
            where: { externalId: reservation.id }
          });

          if (existing) {
            // Mettre à jour
            await prisma.booking.update({
              where: { id: existing.id },
              data: {
                ...bookingData,
                propertyId: property.id,
              }
            });
            syncResults.reservations.updated++;
          } else {
            // Créer
            await prisma.booking.create({
              data: {
                ...bookingData,
                propertyId: property.id,
              }
            });
            syncResults.reservations.created++;
          }
          syncResults.reservations.synced++;
        } catch (err) {
          console.error(`Error syncing reservation ${reservation.id}:`, err);
          syncResults.reservations.errors++;
        }
      }

      console.log(`✅ Reservations sync: ${syncResults.reservations.synced} synced, ${syncResults.reservations.created} created, ${syncResults.reservations.updated} updated`);
    } catch (error) {
      console.error('Reservations sync error:', error);
    }

    // ======================================================================
    // 3. Mettre à jour les paramètres d'intégration
    // ======================================================================
    await prisma.integrationSetting.update({
      where: { platform: 'airbnb' },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'success',
      }
    });

    console.log('✅ Airbnb auto-sync completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Airbnb sync completed successfully',
      results: syncResults,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Airbnb auto-sync error:', error);

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
      error: 'Sync failed',
      details: (error as Error).message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
