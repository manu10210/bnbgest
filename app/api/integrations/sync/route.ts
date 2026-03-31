import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { AirbnbClient } from '@/lib/airbnb-client';
import { BookingClient } from '@/lib/booking-client';
import { IntegrationSettings } from '@/types/integrations';

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
      airbnb: { synced: false, count: 0, error: null as string | null },
      booking: { synced: false, count: 0, error: null as string | null }
    };

    // Sync Airbnb
    if (settings.airbnb?.enabled && settings.airbnb.credentials.icalUrl) {
      try {
        const client = new AirbnbClient(settings.airbnb.credentials.icalUrl);
        const reservations = await client.getReservations();
        
        // TODO: Sauvegarder en base de données
        console.log(`Synced ${reservations.length} Airbnb reservations`);
        
        syncResults.airbnb = { synced: true, count: reservations.length, error: null };
      } catch (error) {
        console.error('Airbnb sync error:', error);
        syncResults.airbnb.error = (error as Error).message;
      }
    }

    // Sync Booking
    if (settings.booking?.enabled && settings.booking.credentials.hotelId) {
      try {
        const client = new BookingClient(settings.booking.credentials);
        const reservations = await client.getReservations();
        
        // TODO: Sauvegarder en base de données
        console.log(`Synced ${reservations.length} Booking reservations`);
        
        syncResults.booking = { synced: true, count: reservations.length, error: null };
      } catch (error) {
        console.error('Booking sync error:', error);
        syncResults.booking.error = (error as Error).message;
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
