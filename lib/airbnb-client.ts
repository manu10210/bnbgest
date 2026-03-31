import { parseICalUrl, ICalEvent } from './ical-parser';
import { ExternalReservation } from '@/types/integrations';

export class AirbnbClient {
  private icalUrl: string;

  constructor(icalUrl: string) {
    this.icalUrl = icalUrl;
  }

  async getReservations(): Promise<ExternalReservation[]> {
    const events = await parseICalUrl(this.icalUrl);
    
    return events.map(event => ({
      id: event.uid,
      platform: 'airbnb' as const,
      propertyId: this.extractPropertyId(this.icalUrl),
      guestName: this.extractGuestName(event.summary),
      checkIn: event.start,
      checkOut: event.end,
      guests: 1, // iCal ne fournit pas toujours cette info
      price: 0, // iCal ne fournit pas le prix
      status: 'confirmed' as const,
      platformReservationId: event.uid
    }));
  }

  async getBlockedDates(): Promise<Date[]> {
    const events = await parseICalUrl(this.icalUrl);
    const dates: Date[] = [];

    events.forEach(event => {
      const current = new Date(event.start);
      const end = new Date(event.end);

      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });

    return dates;
  }

  private extractPropertyId(icalUrl: string): string {
    const match = icalUrl.match(/\/([^\/]+)\.ics$/);
    return match ? match[1] : 'unknown';
  }

  private extractGuestName(summary: string): string {
    // Format typique: "Reserved: John Doe" ou "Airbnb (Reserved)"
    const match = summary.match(/Reserved:\s*(.+)/i);
    if (match) return match[1].trim();
    
    // Si pas de nom, retourner "Guest"
    return 'Guest';
  }
}
