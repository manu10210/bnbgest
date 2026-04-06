/**
 * 🔧 Types API - Définitions TypeScript strictes pour les routes API
 * Centralisation des types pour éliminer les `any` et améliorer la sécurité
 */

import { Prisma } from '@prisma/client';

// =============================================================================
// Generic API Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// Airbnb Integration Types
// =============================================================================

export interface AirbnbReservation {
  id: string;
  listing_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancellation_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface AirbnbListing {
  id: string;
  name: string;
  description: string;
  price: number;
  status: 'active' | 'inactive' | 'archived';
  bedrooms?: number;
  bathrooms?: number;
  capacity?: number;
}

export interface AirbnbMessage {
  id: string;
  sender_name: string;
  sender_type: 'guest' | 'host';
  content: string;
  sent_at: string;
  read: boolean;
}

export interface AirbnbReview {
  id: string;
  listing_id: string;
  guest_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface AirbnbWebhookEvent {
  type: 'reservation.created' | 'reservation.updated' | 'reservation.cancelled' | 
        'listing.updated' | 'message.created' | 'review.created';
  data: AirbnbReservation | AirbnbListing | AirbnbMessage | AirbnbReview;
  timestamp: string;
}

// =============================================================================
// Stripe Types
// =============================================================================

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

export interface StripePaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

// =============================================================================
// Equipment Guide Types
// =============================================================================

export interface EquipmentGuide {
  id: string;
  title: string;
  category: string;
  tags: string[];
  language: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  views?: number;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoMetadata {
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  duration?: number;
}

// =============================================================================
// Webhook Types
// =============================================================================

export interface GenericWebhookEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature?: string;
}

// =============================================================================
// Prisma Dynamic Update Types
// =============================================================================

export type DynamicUpdateData = Record<string, unknown>;

// Helper type for flexible where clauses
export type DynamicWhereInput<T> = Partial<T> & {
  AND?: Array<DynamicWhereInput<T>>;
  OR?: Array<DynamicWhereInput<T>>;
  NOT?: DynamicWhereInput<T>;
};

// =============================================================================
// Utility Types
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

// =============================================================================
// Type Guards
// =============================================================================

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

// =============================================================================
// Error Handling
// =============================================================================

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}
