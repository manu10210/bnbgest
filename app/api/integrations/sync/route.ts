import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { AirbnbClient } from '@/lib/airbnb-client';
import { BookingClient } from '@/lib/booking-client';
import { IntegrationSettings } from '@/types/integrations';
import prisma from '@/lib/prisma';

const SETTINGS_FILE = path.join(process.cwd(), 'public', 'data', 'integration-settings.json');

export async function GET() {
  try {
    // Lire les paramètres
    if (!existsSync(SETTINGS_FILE)) {
      return NextResponse.json({
        success: false,
        message: 'No integration settings found'
      });
    }

    const data = await readFile(SETTINGS_FILE, 'utf-8');
    const settings: IntegrationSettings = JSON.parse(data);

    const syncResults = {
      airbnb: { synced: false, count: 0, saved: 0, error: null as string | null },
      booking: { synced: false, count: 0, saved: 0, error: null as string | null }
    };

    // Sync Airbnb
    if (settings.airbnb?.enabled && settings.airbnb.credentials.icalUrl) {
      try {
        const client = new AirbnbClient(settings.airbnb.credentials.icalUrl);
        const reservations = await client.getReservations();
        
        // ✅ Sauvegarder en base de données
        let savedCount = 0;
        for (const reservation of reservations) {
          try {
            // Chercher ou créer la propriété (utiliser la première par défaut)
            const property = await prisma.property.findFirst();
            
            if (property) {
              await prisma.booking.upsert({
                where: {
                  externalId: reservation.id || `airbnb-${reservation.guestName}-${reservation.checkIn}`
                },
                update: {
                  guestName: reservation.guestName,
                  guestEmail: 'unknown@airbnb.com',
                  checkIn: new Date(reservation.checkIn),
                  checkOut: new Date(reservation.checkOut),
                  guests: reservation.guests || 1,
                  totalPrice: reservation.price || 0,
                  status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                  source: 'AIRBNB',
                  updatedAt: new Date()
                },
                create: {
                  propertyId: property.id,
                  guestName: reservation.guestName,
                  guestEmail: 'unknown@airbnb.com',
                  checkIn: new Date(reservation.checkIn),
                  checkOut: new Date(reservation.checkOut),
                  guests: reservation.guests || 1,
                  totalPrice: reservation.price || 0,
                  status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                  source: 'AIRBNB',
                  externalId: reservation.id || `airbnb-${reservation.guestName}-${reservation.checkIn}`
                }
              });
              savedCount++;
            }
          } catch (err) {
            console.error('Error saving Airbnb reservation:', err);
          }
        }
        
        console.log(`✅ Synced ${reservations.length} Airbnb reservations (${savedCount} saved to DB)`);
        
        // Mettre à jour les paramètres d'intégration
        await prisma.integrationSetting.upsert({
          where: { platform: 'airbnb' },
          update: {
            lastSyncAt: new Date(),
            syncStatus: 'success'
          },
          create: {
            platform: 'airbnb',
            enabled: true,
            icalUrl: settings.airbnb.credentials.icalUrl,
            lastSyncAt: new Date(),
            syncStatus: 'success'
          }
        });
        
        syncResults.airbnb = { synced: true, count: reservations.length, saved: savedCount, error: null };
      } catch (error) {
        console.error('Airbnb sync error:', error);
        syncResults.airbnb.error = (error as Error).message;
        
        await prisma.integrationSetting.upsert({
          where: { platform: 'airbnb' },
          update: {
            lastSyncAt: new Date(),
            syncStatus: 'error'
          },
          create: {
            platform: 'airbnb',
            enabled: true,
            lastSyncAt: new Date(),
            syncStatus: 'error'
          }
        });
      }
    }

    // Sync Booking.com
    if (settings.booking?.enabled && settings.booking.credentials.hotelId) {
      try {
        const client = new BookingClient(settings.booking.credentials);
        const reservations = await client.getReservations();
        
        // ✅ Sauvegarder en base de données
        let savedCount = 0;
        for (const reservation of reservations) {
          try {
            const property = await prisma.property.findFirst();
            
            if (property) {
              await prisma.booking.upsert({
                where: {
                  externalId: reservation.id || `booking-${reservation.guestName}-${reservation.checkIn}`
                },
                update: {
                  guestName: reservation.guestName,
                  guestEmail: 'unknown@booking.com',
                  checkIn: new Date(reservation.checkIn),
                  checkOut: new Date(reservation.checkOut),
                  guests: reservation.guests || 1,
                  totalPrice: reservation.price || 0,
                  status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                  source: 'BOOKING_COM',
                  updatedAt: new Date()
                },
                create: {
                  propertyId: property.id,
                  guestName: reservation.guestName,
                  guestEmail: 'unknown@booking.com',
                  checkIn: new Date(reservation.checkIn),
                  checkOut: new Date(reservation.checkOut),
                  guests: reservation.guests || 1,
                  totalPrice: reservation.price || 0,
                  status: reservation.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                  source: 'BOOKING_COM',
                  externalId: reservation.id || `booking-${reservation.guestName}-${reservation.checkIn}`
                }
              });
              savedCount++;
            }
          } catch (err) {
            console.error('Error saving Booking.com reservation:', err);
          }
        }
        
        console.log(`✅ Synced ${reservations.length} Booking.com reservations (${savedCount} saved to DB)`);
        
        await prisma.integrationSetting.upsert({
          where: { platform: 'booking_com' },
          update: {
            lastSyncAt: new Date(),
            syncStatus: 'success'
          },
          create: {
            platform: 'booking_com',
            enabled: true,
            hotelId: settings.booking.credentials.hotelId,
            lastSyncAt: new Date(),
            syncStatus: 'success'
          }
        });
        
        syncResults.booking = { synced: true, count: reservations.length, saved: savedCount, error: null };
      } catch (error) {
        console.error('Booking sync error:', error);
        syncResults.booking.error = (error as Error).message;
        
        await prisma.integrationSetting.upsert({
          where: { platform: 'booking_com' },
          update: {
            lastSyncAt: new Date(),
            syncStatus: 'error'
          },
          create: {
            platform: 'booking_com',
            enabled: true,
            lastSyncAt: new Date(),
            syncStatus: 'error'
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: syncResults
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
