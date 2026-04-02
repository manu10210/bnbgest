/**
 * 🏠 Airbnb API Client - Intégration Complète
 * 
 * Client officiel pour l'API Airbnb avec :
 * - Authentification OAuth2
 * - Gestion des listings (propriétés)
 * - Synchronisation des réservations
 * - Gestion du calendrier et disponibilités
 * - Prix dynamiques
 * - Messages et communications
 * - Webhooks
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import qs from 'qs';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface AirbnbConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion?: string;
  environment?: 'sandbox' | 'production';
}

export interface AirbnbTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
}

export interface AirbnbListing {
  id: string;
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  propertyType: string;
  roomType: 'entire_place' | 'private_room' | 'shared_room';
  accommodates: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  amenities: string[];
  photos: Array<{
    url: string;
    caption?: string;
    sortOrder: number;
  }>;
  pricing: {
    basePrice: number;
    currency: string;
    cleaningFee?: number;
    extraGuestFee?: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;
  };
  availability: {
    minNights: number;
    maxNights: number;
    advanceNotice: number;
    bookingLeadTime: number;
    instantBookable: boolean;
  };
  houseRules: {
    checkInTime: string;
    checkOutTime: string;
    allowsPets: boolean;
    allowsSmoking: boolean;
    allowsEvents: boolean;
    quietHours?: string;
  };
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
}

export interface AirbnbReservation {
  id: string;
  confirmationCode: string;
  listingId: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    verified: boolean;
  };
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  nights: number;
  pricing: {
    baseAmount: number;
    cleaningFee: number;
    serviceFee: number;
    taxAmount: number;
    totalAmount: number;
    payoutAmount: number;
    currency: string;
  };
  paymentStatus: 'pending' | 'authorized' | 'captured' | 'refunded';
  specialRequests?: string;
  guestMessage?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface AirbnbCalendarDay {
  date: string;
  available: boolean;
  price: number;
  minNights: number;
  maxNights: number;
  notes?: string;
}

export interface AirbnbMessage {
  id: string;
  threadId: string;
  reservationId?: string;
  listingId: string;
  from: {
    id: string;
    name: string;
    role: 'host' | 'guest';
  };
  to: {
    id: string;
    name: string;
    role: 'host' | 'guest';
  };
  content: string;
  sentAt: string;
  read: boolean;
}

export interface AirbnbWebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  apiVersion: string;
}

// ============================================================================
// Airbnb API Client
// ============================================================================

export class AirbnbAPIClient {
  private client: AxiosInstance;
  private config: AirbnbConfig;
  private tokens?: AirbnbTokens;

  constructor(config: AirbnbConfig) {
    this.config = {
      apiVersion: 'v2',
      environment: 'production',
      ...config,
    };

    const baseURL = this.config.environment === 'sandbox'
      ? 'https://api.airbnb.com/sandbox'
      : 'https://api.airbnb.com';

    this.client = axios.create({
      baseURL: `${baseURL}/${this.config.apiVersion}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    // Intercepteur pour ajouter le token
    this.client.interceptors.request.use(async (config) => {
      if (this.tokens) {
        // Vérifier si le token est expiré
        if (Date.now() >= this.tokens.expiresAt) {
          await this.refreshAccessToken();
        }
        config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
      }
      return config;
    });

    // Intercepteur pour gérer les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.tokens?.refreshToken) {
          // Token expiré, essayer de rafraîchir
          await this.refreshAccessToken();
          // Réessayer la requête
          return this.client.request(error.config!);
        }
        throw this.handleError(error);
      }
    );
  }

  // ==========================================================================
  // Authentication
  // ==========================================================================

  /**
   * Générer l'URL d'autorisation OAuth2
   */
  getAuthorizationUrl(state?: string): string {
    const params = qs.stringify({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'listings:read listings:write reservations:read messages:read messages:write calendar:read calendar:write',
      state: state || this.generateState(),
    });

    const baseUrl = this.config.environment === 'sandbox'
      ? 'https://www.airbnb.com/sandbox/oauth/authorize'
      : 'https://www.airbnb.com/oauth/authorize';

    return `${baseUrl}?${params}`;
  }

  /**
   * Échanger le code d'autorisation contre un access token
   */
  async exchangeCodeForToken(code: string): Promise<AirbnbTokens> {
    try {
      const response = await axios.post(
        'https://api.airbnb.com/oauth/token',
        qs.stringify({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        tokenType: response.data.token_type,
        scope: response.data.scope,
      };

      return this.tokens;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Rafraîchir l'access token
   */
  async refreshAccessToken(): Promise<AirbnbTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(
        'https://api.airbnb.com/oauth/token',
        qs.stringify({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.tokens.refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
        tokenType: response.data.token_type,
        scope: response.data.scope,
      };

      return this.tokens;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Définir les tokens manuellement
   */
  setTokens(tokens: AirbnbTokens): void {
    this.tokens = tokens;
  }

  /**
   * Obtenir les tokens actuels
   */
  getTokens(): AirbnbTokens | undefined {
    return this.tokens;
  }

  // ==========================================================================
  // Listings (Propriétés)
  // ==========================================================================

  /**
   * Récupérer tous les listings de l'hôte
   */
  async getListings(params?: {
    status?: 'active' | 'inactive' | 'pending';
    limit?: number;
    offset?: number;
  }): Promise<{ listings: AirbnbListing[]; total: number }> {
    const response = await this.client.get('/listings', { params });
    return {
      listings: response.data.listings,
      total: response.data.total,
    };
  }

  /**
   * Récupérer un listing spécifique
   */
  async getListing(listingId: string): Promise<AirbnbListing> {
    const response = await this.client.get(`/listings/${listingId}`);
    return response.data;
  }

  /**
   * Créer un nouveau listing
   */
  async createListing(data: Partial<AirbnbListing>): Promise<AirbnbListing> {
    const response = await this.client.post('/listings', data);
    return response.data;
  }

  /**
   * Mettre à jour un listing
   */
  async updateListing(listingId: string, data: Partial<AirbnbListing>): Promise<AirbnbListing> {
    const response = await this.client.patch(`/listings/${listingId}`, data);
    return response.data;
  }

  /**
   * Supprimer un listing
   */
  async deleteListing(listingId: string): Promise<void> {
    await this.client.delete(`/listings/${listingId}`);
  }

  /**
   * Activer/Désactiver un listing
   */
  async setListingStatus(listingId: string, status: 'active' | 'inactive'): Promise<AirbnbListing> {
    const response = await this.client.patch(`/listings/${listingId}/status`, { status });
    return response.data;
  }

  // ==========================================================================
  // Reservations
  // ==========================================================================

  /**
   * Récupérer toutes les réservations
   */
  async getReservations(params?: {
    listingId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ reservations: AirbnbReservation[]; total: number }> {
    const response = await this.client.get('/reservations', { params });
    return {
      reservations: response.data.reservations,
      total: response.data.total,
    };
  }

  /**
   * Récupérer une réservation spécifique
   */
  async getReservation(reservationId: string): Promise<AirbnbReservation> {
    const response = await this.client.get(`/reservations/${reservationId}`);
    return response.data;
  }

  /**
   * Accepter une demande de réservation
   */
  async acceptReservation(reservationId: string, message?: string): Promise<AirbnbReservation> {
    const response = await this.client.post(`/reservations/${reservationId}/accept`, { message });
    return response.data;
  }

  /**
   * Refuser une demande de réservation
   */
  async declineReservation(reservationId: string, reason: string, message?: string): Promise<AirbnbReservation> {
    const response = await this.client.post(`/reservations/${reservationId}/decline`, { reason, message });
    return response.data;
  }

  /**
   * Annuler une réservation
   */
  async cancelReservation(reservationId: string, reason: string): Promise<AirbnbReservation> {
    const response = await this.client.post(`/reservations/${reservationId}/cancel`, { reason });
    return response.data;
  }

  // ==========================================================================
  // Calendar & Availability
  // ==========================================================================

  /**
   * Récupérer le calendrier d'un listing
   */
  async getCalendar(
    listingId: string,
    params: {
      startDate: string; // YYYY-MM-DD
      endDate: string;   // YYYY-MM-DD
    }
  ): Promise<AirbnbCalendarDay[]> {
    const response = await this.client.get(`/listings/${listingId}/calendar`, { params });
    return response.data.days;
  }

  /**
   * Mettre à jour les disponibilités
   */
  async updateAvailability(
    listingId: string,
    updates: Array<{
      date: string;
      available: boolean;
      price?: number;
      minNights?: number;
      maxNights?: number;
      notes?: string;
    }>
  ): Promise<void> {
    await this.client.put(`/listings/${listingId}/calendar`, { updates });
  }

  /**
   * Bloquer des dates
   */
  async blockDates(
    listingId: string,
    dates: string[],
    notes?: string
  ): Promise<void> {
    const updates = dates.map(date => ({
      date,
      available: false,
      notes,
    }));
    await this.updateAvailability(listingId, updates);
  }

  /**
   * Débloquer des dates
   */
  async unblockDates(
    listingId: string,
    dates: string[]
  ): Promise<void> {
    const updates = dates.map(date => ({
      date,
      available: true,
    }));
    await this.updateAvailability(listingId, updates);
  }

  // ==========================================================================
  // Pricing
  // ==========================================================================

  /**
   * Mettre à jour les prix dynamiques
   */
  async updatePricing(
    listingId: string,
    pricing: Array<{
      date: string;
      price: number;
      minNights?: number;
      maxNights?: number;
    }>
  ): Promise<void> {
    await this.client.put(`/listings/${listingId}/pricing`, { pricing });
  }

  /**
   * Obtenir les suggestions de prix
   */
  async getPricingSuggestions(
    listingId: string,
    params: {
      startDate: string;
      endDate: string;
    }
  ): Promise<Array<{ date: string; suggestedPrice: number; confidence: number }>> {
    const response = await this.client.get(`/listings/${listingId}/pricing/suggestions`, { params });
    return response.data.suggestions;
  }

  // ==========================================================================
  // Messages
  // ==========================================================================

  /**
   * Récupérer les threads de messages
   */
  async getMessageThreads(params?: {
    listingId?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const response = await this.client.get('/messages/threads', { params });
    return response.data.threads;
  }

  /**
   * Récupérer les messages d'un thread
   */
  async getMessages(threadId: string): Promise<AirbnbMessage[]> {
    const response = await this.client.get(`/messages/threads/${threadId}`);
    return response.data.messages;
  }

  /**
   * Envoyer un message
   */
  async sendMessage(threadId: string, content: string): Promise<AirbnbMessage> {
    const response = await this.client.post(`/messages/threads/${threadId}`, { content });
    return response.data;
  }

  /**
   * Marquer un message comme lu
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    await this.client.post(`/messages/${messageId}/read`);
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * Enregistrer un webhook
   */
  async registerWebhook(params: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{ id: string; url: string; events: string[] }> {
    const response = await this.client.post('/webhooks', params);
    return response.data;
  }

  /**
   * Récupérer les webhooks enregistrés
   */
  async getWebhooks(): Promise<any[]> {
    const response = await this.client.get('/webhooks');
    return response.data.webhooks;
  }

  /**
   * Supprimer un webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.client.delete(`/webhooks/${webhookId}`);
  }

  /**
   * Vérifier la signature d'un webhook
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return signature === expectedSignature;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  private generateState(): string {
    return require('crypto').randomBytes(16).toString('hex');
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const data = error.response.data as any;
      return new Error(
        `Airbnb API Error: ${data.error || data.message || error.message} (Status: ${error.response.status})`
      );
    }
    return new Error(`Airbnb API Error: ${error.message}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Créer un client Airbnb API avec les credentials stockés
 */
export function createAirbnbClient(config?: Partial<AirbnbConfig>): AirbnbAPIClient | null {
  const clientId = process.env.AIRBNB_CLIENT_ID;
  const clientSecret = process.env.AIRBNB_CLIENT_SECRET;
  const redirectUri = process.env.AIRBNB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/airbnb/callback`;

  if (!clientId || !clientSecret) {
    console.warn('Airbnb API credentials not configured');
    return null;
  }

  return new AirbnbAPIClient({
    clientId,
    clientSecret,
    redirectUri,
    ...config,
  });
}

/**
 * Convertir une réservation Airbnb en format BNBGest
 */
export function convertAirbnbReservationToBNBGest(reservation: AirbnbReservation): any {
  return {
    externalId: reservation.id,
    externalSource: 'airbnb',
    guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
    guestEmail: reservation.guest.email,
    guestPhone: reservation.guest.phone || '',
    checkIn: new Date(reservation.checkIn),
    checkOut: new Date(reservation.checkOut),
    guests: reservation.numberOfGuests,
    totalPrice: reservation.pricing.totalAmount,
    status: convertAirbnbStatus(reservation.status),
    confirmationCode: reservation.confirmationCode,
    specialRequests: reservation.specialRequests || '',
    metadata: {
      airbnbReservationId: reservation.id,
      confirmationCode: reservation.confirmationCode,
      adults: reservation.adults,
      children: reservation.children,
      infants: reservation.infants,
      pets: reservation.pets,
      pricing: reservation.pricing,
      paymentStatus: reservation.paymentStatus,
    },
  };
}

/**
 * Convertir le statut Airbnb en statut BNBGest
 */
function convertAirbnbStatus(status: AirbnbReservation['status']): string {
  const statusMap: Record<string, string> = {
    'pending': 'PENDING',
    'accepted': 'CONFIRMED',
    'declined': 'CANCELLED',
    'cancelled': 'CANCELLED',
    'completed': 'COMPLETED',
  };
  return statusMap[status] || 'PENDING';
}
