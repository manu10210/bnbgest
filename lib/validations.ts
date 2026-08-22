/**
 * Validation Schemas avec Zod
 * Schémas de validation pour toutes les entrées utilisateur
 */

import { z } from 'zod';

// ==========================================
// PROPERTY SCHEMAS
// ==========================================

export const PropertySchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters'),
  
  description: z.string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional(),
  
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
  
  city: z.string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  
  country: z.string()
    .length(2, 'Country must be a 2-letter ISO code (e.g., FR, US)'),
  
  zipCode: z.string()
    .regex(/^[0-9]{5}$/, 'Zip code must be 5 digits')
    .optional(),
  
  bedrooms: z.number()
    .int('Bedrooms must be an integer')
    .min(1, 'Must have at least 1 bedroom')
    .max(50, 'Cannot have more than 50 bedrooms'),
  
  bathrooms: z.number()
    .int('Bathrooms must be an integer')
    .min(1, 'Must have at least 1 bathroom')
    .max(50, 'Cannot have more than 50 bathrooms'),
  
  capacity: z.number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity cannot exceed 100'),
  
  price: z.number()
    .positive('Price must be positive')
    .max(100000, 'Price cannot exceed 100,000'),
  
  pricePerNight: z.number()
    .positive('Price per night must be positive')
    .max(10000, 'Price per night cannot exceed 10,000')
    .optional(),
  
  cleaningFee: z.number()
    .nonnegative('Cleaning fee cannot be negative')
    .max(5000, 'Cleaning fee cannot exceed 5,000')
    .default(0),
  
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code (EUR, USD, GBP)')
    .default('EUR'),
  
  userId: z.string()
    .cuid('Invalid user ID format'),
});

export const PropertyUpdateSchema = PropertySchema.partial();

// ==========================================
// BOOKING SCHEMAS
// ==========================================

export const BookingSchema = z.object({
  propertyId: z.number()
    .int('Property ID must be an integer')
    .positive('Property ID must be positive'),
  
  guestName: z.string()
    .min(1, 'Guest name must be at least 1 character')
    .max(100, 'Guest name must be less than 100 characters'),
  
  guestEmail: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  
  guestPhone: z.string()
    .max(50, 'Phone number too long')
    .optional()
    .nullable(),
  
  checkIn: z.string()
    .datetime('Invalid check-in date format'),
  
  checkOut: z.string()
    .datetime('Invalid check-out date format'),
  
  guests: z.number()
    .int('Number of guests must be an integer')
    .min(0, 'Must have at least 0 guest')
    .max(100, 'Cannot exceed 100 guests'),
  
  totalPrice: z.number()
    .min(0, 'Total price cannot be negative')
    .max(1000000, 'Total price cannot exceed 1,000,000'),
  
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional()
    .nullable(),
  
  specialRequests: z.string()
    .max(5000, 'Special requests must be less than 5000 characters')
    .optional()
    .nullable(),

  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'COMPLETED'])
    .optional(),

  source: z.enum(['AIRBNB', 'BOOKING', 'DIRECT', 'VRBO', 'OTHER'])
    .optional(),

  confirmationCode: z.string().max(100).optional().nullable(),

  externalId: z.string()
    .max(191, 'External ID must be less than 191 characters')
    .optional()
    .nullable(),

  // Identifiant d'annonce Airbnb (/rooms/123…) : ancre STABLE du logement,
  // utilisé côté serveur pour rattacher la réservation à la bonne propriété.
  airbnbListingId: z.string()
    .regex(/^\d{5,20}$/, 'Invalid Airbnb listing id')
    .optional()
    .nullable(),

}).refine(data => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut >= checkIn;
}, {
  message: 'Check-out must be after or same as check-in',
  path: ['checkOut']
});

// Update schema without refinements to allow .partial()
export const BookingUpdateSchema = z.object({
  propertyId: z.number().int().positive().optional(),
  guestName: z.string().min(2).max(100).optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().regex(/^\+?[0-9\s\-()]{8,20}$/).optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  guests: z.number().int().min(0).max(100).optional(),
  totalPrice: z.number().positive().max(1000000).optional(),
  notes: z.string().max(2000).optional(),
  specialRequests: z.string().max(1000).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']).optional(),
});

// ==========================================
// USER PROFILE SCHEMAS
// ==========================================

export const UserProfileSchema = z.object({
  phone: z.string()
    .regex(/^\+?[0-9\s\-()]{8,20}$/, 'Invalid phone number')
    .optional(),
  
  company: z.string()
    .max(100, 'Company name must be less than 100 characters')
    .optional(),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional(),
  
  city: z.string()
    .max(100, 'City must be less than 100 characters')
    .optional(),
  
  postalCode: z.string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  
  country: z.string()
    .length(2, 'Country must be a 2-letter ISO code')
    .optional(),
  
  website: z.string()
    .url('Invalid website URL')
    .optional(),
  
  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),
  
  timezone: z.string()
    .default('Europe/Paris'),
  
  language: z.string()
    .regex(/^[a-z]{2}$/, 'Language must be a 2-letter code')
    .default('fr'),
  
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .default('EUR'),
});

// ==========================================
// CLEANING SCHEMAS
// ==========================================

export const CleaningSchema = z.object({
  propertyId: z.number()
    .int()
    .positive(),
  
  scheduledDate: z.string()
    .datetime('Invalid scheduled date format'),
  
  assignedTo: z.string()
    .max(100)
    .optional(),
  
  notes: z.string()
    .max(2000)
    .optional(),
  
  estimatedTime: z.number()
    .int()
    .min(15, 'Estimated time must be at least 15 minutes')
    .max(480, 'Estimated time cannot exceed 8 hours')
    .optional(),
});

export const CleaningUpdateSchema = z.object({
  propertyId: z.number().int().positive().optional(),
  scheduledDate: z.string().datetime().optional(),
  assignedTo: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  estimatedTime: z.number().int().min(15).max(480).optional(),
  completedDate: z.string().datetime().optional(),
  actualTime: z.number().int().min(0).max(480).optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

// ==========================================
// MAINTENANCE SCHEMAS
// ==========================================

export const MaintenanceSchema = z.object({
  propertyId: z.number()
    .int()
    .positive(),
  
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .default('MEDIUM'),
  
  category: z.string()
    .max(50)
    .optional(),
  
  assignedTo: z.string()
    .max(100)
    .optional(),
  
  dueDate: z.string()
    .datetime()
    .optional(),
  
  cost: z.number()
    .nonnegative('Cost cannot be negative')
    .max(1000000, 'Cost cannot exceed 1,000,000')
    .optional(),
  
  notes: z.string()
    .max(2000)
    .optional(),
});

export const MaintenanceUpdateSchema = MaintenanceSchema.partial().extend({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  completedAt: z.string().datetime().optional(),
});

// ==========================================
// REVIEW SCHEMAS
// ==========================================

export const ReviewSchema = z.object({
  propertyId: z.number()
    .int()
    .positive(),
  
  bookingId: z.number()
    .int()
    .positive()
    .optional(),
  
  guestName: z.string()
    .min(2, 'Guest name must be at least 2 characters')
    .max(100, 'Guest name must be less than 100 characters'),
  
  rating: z.number()
    .int()
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  
  comment: z.string()
    .max(2000, 'Comment must be less than 2000 characters')
    .optional(),
  
  isPublic: z.boolean()
    .default(true),
});

// ==========================================
// INTEGRATION SCHEMAS
// ==========================================

export const IntegrationSettingSchema = z.object({
  platform: z.string()
    .min(2, 'Platform name must be at least 2 characters')
    .max(50, 'Platform name must be less than 50 characters'),
  
  apiKey: z.string()
    .min(10, 'API key must be at least 10 characters')
    .optional(),
  
  apiSecret: z.string()
    .min(10, 'API secret must be at least 10 characters')
    .optional(),
  
  icalUrl: z.string()
    .url('Invalid iCal URL')
    .optional(),
  
  enabled: z.boolean()
    .default(false),
  
  config: z.record(z.string(), z.any())
    .optional(),
});

// ==========================================
// INVENTORY SCHEMAS
// ==========================================

export const InventoryItemSchema = z.object({
  propertyId: z.number()
    .int()
    .positive(),
  
  name: z.string()
    .min(2, 'Item name must be at least 2 characters')
    .max(100, 'Item name must be less than 100 characters'),
  
  category: z.string()
    .max(50, 'Category must be less than 50 characters'),
  
  quantity: z.number()
    .int()
    .nonnegative('Quantity cannot be negative'),
  
  minQuantity: z.number()
    .int()
    .nonnegative('Minimum quantity cannot be negative')
    .default(0),
  
  unit: z.string()
    .max(20, 'Unit must be less than 20 characters')
    .optional(),
  
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

// ==========================================
// QUERY PARAMS SCHEMAS
// ==========================================

export const PaginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page must be a number')
    .transform(Number)
    .pipe(z.number().int().positive())
    .default(1),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(10),
});

export const DateRangeSchema = z.object({
  startDate: z.string()
    .datetime('Invalid start date format'),
  
  endDate: z.string()
    .datetime('Invalid end date format'),
}).refine(data => {
  return new Date(data.endDate) > new Date(data.startDate);
}, {
  message: 'End date must be after start date',
  path: ['endDate']
});

// ==========================================
// FILE UPLOAD SCHEMAS
// ==========================================

export const FileUploadSchema = z.object({
  filename: z.string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters')
    .regex(/^[a-zA-Z0-9_\-\.]+$/, 'Filename contains invalid characters'),
  
  mimeType: z.string()
    .regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/, 'Invalid MIME type'),
  
  size: z.number()
    .int()
    .positive()
    .max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
});

export const ImageUploadSchema = FileUploadSchema.extend({
  mimeType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().max(10 * 1024 * 1024, 'Image size cannot exceed 10MB'),
});

export const VideoUploadSchema = FileUploadSchema.extend({
  mimeType: z.enum(['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm']),
  size: z.number().max(100 * 1024 * 1024, 'Video size cannot exceed 100MB'),
});

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Valide des données avec un schéma et retourne une réponse d'erreur si invalide
 */
export function validateOrError<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: unknown } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: {
          message: 'Validation failed',
          details: error.issues
        }
      };
    }
    return {
      success: false,
      error: { message: 'Unknown validation error' }
    };
  }
}

/**
 * Helper pour valider dans une route API
 */
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  request: Request
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}
