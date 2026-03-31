import { ExternalReservation, BookingCredentials } from '@/types/integrations';

export class BookingClient {
  private hotelId: string;
  private username: string;
  private password: string;
  private apiUrl: string;

  constructor(credentials: BookingCredentials) {
    this.hotelId = credentials.hotelId;
    this.username = credentials.username;
    this.password = credentials.password;
    this.apiUrl = credentials.apiUrl || 'https://secure.booking.com/api';
  }

  async getReservations(): Promise<ExternalReservation[]> {
    try {
      const response = await fetch(`${this.apiUrl}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': this.getAuthHeader()
        },
        body: this.buildReservationsXML()
      });

      if (!response.ok) {
        throw new Error(`Booking API request failed: ${response.status}`);
      }

      const xmlData = await response.text();
      return this.parseReservationsXML(xmlData);
    } catch (error) {
      console.error('Error fetching Booking reservations:', error);
      throw error;
    }
  }

  async getProperties(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Authorization': this.getAuthHeader()
        },
        body: this.buildPropertiesXML()
      });

      if (!response.ok) {
        throw new Error(`Booking API request failed: ${response.status}`);
      }

      const xmlData = await response.text();
      return this.parsePropertiesXML(xmlData);
    } catch (error) {
      console.error('Error fetching Booking properties:', error);
      throw error;
    }
  }

  private getAuthHeader(): string {
    const credentials = `${this.username}:${this.password}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private buildReservationsXML(): string {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 180); // 6 mois
    const future = futureDate.toISOString().split('T')[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <hotel_id>${this.hotelId}</hotel_id>
  <action>get_reservations</action>
  <date_from>${today}</date_from>
  <date_to>${future}</date_to>
</request>`;
  }

  private buildPropertiesXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <hotel_id>${this.hotelId}</hotel_id>
  <action>get_properties</action>
</request>`;
  }

  private parseReservationsXML(xml: string): ExternalReservation[] {
    const reservations: ExternalReservation[] = [];
    
    // Parser XML basique (améliorer avec xml2js en production)
    const regex = /<reservation>([\s\S]*?)<\/reservation>/g;
    const matches = Array.from(xml.matchAll(regex));

    for (const match of matches) {
      const resXml = match[1];
      reservations.push({
        id: this.extractXMLValue(resXml, 'id'),
        platform: 'booking',
        propertyId: this.hotelId,
        guestName: this.extractXMLValue(resXml, 'guest_name'),
        checkIn: new Date(this.extractXMLValue(resXml, 'checkin')),
        checkOut: new Date(this.extractXMLValue(resXml, 'checkout')),
        guests: parseInt(this.extractXMLValue(resXml, 'guests') || '1'),
        price: parseFloat(this.extractXMLValue(resXml, 'price') || '0'),
        status: 'confirmed',
        platformReservationId: this.extractXMLValue(resXml, 'booking_id')
      });
    }

    return reservations;
  }

  private parsePropertiesXML(xml: string): any[] {
    // À implémenter selon le format Booking.com
    return [];
  }

  private extractXMLValue(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }
}
