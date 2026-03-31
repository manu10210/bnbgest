export interface AirbnbCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  icalUrl?: string;
}

export interface BookingCredentials {
  hotelId: string;
  username: string;
  password: string;
  apiUrl?: string;
}

export interface IntegrationSettings {
  airbnb?: {
    enabled: boolean;
    credentials: AirbnbCredentials;
    lastSync?: Date;
  };
  booking?: {
    enabled: boolean;
    credentials: BookingCredentials;
    lastSync?: Date;
  };
}

export interface ExternalReservation {
  id: string;
  platform: 'airbnb' | 'booking';
  propertyId: string;
  guestName: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  platformReservationId: string;
}

export interface ExternalProperty {
  id: string;
  platform: 'airbnb' | 'booking';
  name: string;
  address: string;
  type: string;
  capacity: number;
  platformPropertyId: string;
}
