'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  type: 'apartment' | 'house' | 'studio' | 'villa' | 'room';
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  price: number;
  description: string;
  images: string[];
  status: 'active' | 'inactive' | 'maintenance' | 'blocked';
  createdAt: string;
  updatedAt: string;
  ownerId: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rules?: string[];
  checkInTime: string;
  checkOutTime: string;
  cleaningFee: number;
  securityDeposit: number;
  minimumStay: number;
  maximumStay?: number;
  availabilityCalendar: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  id: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  status: 'available' | 'booked' | 'blocked' | 'maintenance';
  price?: number;
  notes?: string;
}

export interface Booking {
  id: number;
  propertyId: number;
  guestId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial';
  createdAt: string;
  updatedAt: string;
  specialRequests?: string;
  guestInfo: {
    name: string;
    email: string;
    phone: string;
  };
  paymentInfo?: {
    method: string;
    transactionId: string;
    amount: number;
  };
  // Données financières détaillées (depuis emails Airbnb)
  hostPayout?: number;       // Virement reçu de Airbnb
  cleaningFee?: number;      // Frais de ménage facturés
  serviceFee?: number;       // Commission Airbnb
  nightlyRate?: number;      // Prix par nuit
  taxAmount?: number;        // Taxes (TVA, taxe de séjour…)
  payoutDate?: string;       // Date du virement (YYYY-MM-DD)
  payoutConfirmed?: boolean; // true = virement confirmé par email
  // Horaires check-in/check-out (depuis emails Airbnb)
  checkInTime?: string;      // Heure d'arrivée (ex: "15:00")
  checkOutTime?: string;     // Heure de départ (ex: "11:00")
}

export interface Guest {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  nationality?: string;
  language: string;
  totalBookings: number;
  totalSpent: number;
  rating: number;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  lastBooking?: string;
  preferences?: {
    smoking: boolean;
    pets: boolean;
    parties: boolean;
    preferredAmenities: string[];
  };
}

export interface MaintenanceTask {
  id: number;
  propertyId: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: 'cleaning' | 'repair' | 'inspection' | 'supplies' | 'other';
  assignedTo?: number; // employee ID
  estimatedCost: number;
  actualCost?: number;
  scheduledDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  photos?: string[];
}

export interface InventoryItem {
  id: number;
  propertyId: number;
  name: string;
  category: 'bedding' | 'towels' | 'kitchen' | 'bathroom' | 'cleaning' | 'electronics' | 'furniture' | 'other';
  quantity: number;
  minimumQuantity: number;
  unit: string;
  supplier?: string;
  cost?: number; // Coût unitaire
  lastRestocked: string;
  expiryDate?: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired';
  location: string;
  notes?: string;
}

export interface Review {
  id: number;
  propertyId: number;
  bookingId: number;
  guestId: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  response?: {
    message: string;
    respondedAt: string;
    respondedBy: number;
  };
  verified: boolean;
  helpful: number;
}

export interface FinancialReport {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  occupancyRate: number;
  averageDailyRate: number;
  bookingsCount: number;
  breakdown: {
    accommodation: number;
    cleaning: number;
    maintenance: number;
    supplies: number;
    other: number;
  };
}

interface BNBContextType {
  // Properties
  properties: Property[];
  addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProperty: (id: number, updates: Partial<Property>) => void;
  deleteProperty: (id: number) => void;
  getProperty: (id: number) => Property | undefined;

  // Bookings
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBooking: (id: number, updates: Partial<Booking>) => void;
  cancelBooking: (id: number, reason?: string) => void;
  getBookingsByProperty: (propertyId: number) => Booking[];
  getBookingsByDateRange: (startDate: string, endDate: string) => Booking[];

  // Guests
  guests: Guest[];
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'totalBookings' | 'totalSpent' | 'rating'>) => void;
  updateGuest: (id: number, updates: Partial<Guest>) => void;
  getGuest: (id: number) => Guest | undefined;

  // Maintenance
  maintenanceTasks: MaintenanceTask[];
  addMaintenanceTask: (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaintenanceTask: (id: number, updates: Partial<MaintenanceTask>) => void;
  completeMaintenanceTask: (id: number, actualCost?: number) => void;
  getMaintenanceTasksByProperty: (propertyId: number) => MaintenanceTask[];
  getOverdueTasks: () => MaintenanceTask[];

  // Inventory
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: number) => void;
  getLowStockItems: () => InventoryItem[];
  getInventoryByProperty: (propertyId: number) => InventoryItem[];

  // Reviews
  reviews: Review[];
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'verified' | 'helpful'>) => void;
  respondToReview: (reviewId: number, response: string, respondedBy: number) => void;
  getReviewsByProperty: (propertyId: number) => Review[];
  getAverageRating: (propertyId: number) => number;

  // Analytics
  generateFinancialReport: (startDate: string, endDate: string) => FinancialReport;
  getOccupancyRate: (propertyId: number, startDate: string, endDate: string) => number;
  getRevenueByProperty: (propertyId: number, startDate: string, endDate: string) => number;

  // Utilities
  exportData: (type: 'properties' | 'bookings' | 'guests' | 'maintenance' | 'inventory') => string;
  importData: (type: string, data: unknown[]) => void;
  searchProperties: (query: string) => Property[];
  searchGuests: (query: string) => Guest[];

  // Gmail — Purge des données importées
  purgeGmailImports: () => { bookings: number; guests: number };
}

const BNBContext = createContext<BNBContextType | undefined>(undefined);

// Helpers localStorage - Version sécurisée SSR
function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    console.warn(`Erreur lors du chargement de ${key} depuis localStorage`);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
  }
}

type BookingMonthlyArchive = {
  monthKey: string; // YYYY-MM
  generatedAt: string;
  bookings: Booking[];
  stats: {
    bookingsCount: number;
    confirmedCount: number;
    cancelledCount: number;
    revenue: number;
  };
};

function getMonthKeyFromIso(dateIso?: string): string | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function normalizeBookingStatus(status?: string | null): Booking['status'] {
  switch ((status || '').toUpperCase()) {
    case 'CONFIRMED':
    case 'CHECKED_IN':
      return 'confirmed';
    case 'CHECKED_OUT':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'NO_SHOW':
      return 'no_show';
    case 'PENDING':
    default:
      return 'pending';
  }
}

function normalizePaymentStatus(
  bookingLike: {
    status?: string | null;
    totalPrice?: number | null;
    specialRequests?: string | null;
    payments?: Array<{ status?: string | null; amount?: number | null }>;
  },
): Booking['paymentStatus'] {
  const paidPayment = bookingLike.payments?.find((p) => (p.status || '').toUpperCase() === 'PAID');
  if (paidPayment) return 'paid';

  const refundedPayment = bookingLike.payments?.find((p) => (p.status || '').toUpperCase() === 'REFUNDED');
  if (refundedPayment) return 'refunded';

  const partialPayment = bookingLike.payments?.find((p) => (p.status || '').toUpperCase() === 'PARTIAL');
  if (partialPayment) return 'partial';

  const normalizedStatus = normalizeBookingStatus(bookingLike.status || undefined);
  const hasPayoutMarker = /\[(?:VERSEMENT|PAYOUT)\s+[\d.,]+\s*€?/i.test(bookingLike.specialRequests || '');
  const hasPositiveAmount = (bookingLike.totalPrice ?? 0) > 0;

  if ((normalizedStatus === 'completed' || hasPayoutMarker) && hasPositiveAmount) return 'paid';
  return 'pending';
}

function extractPayoutFromNotes(specialRequests?: string | null): number | undefined {
  if (!specialRequests) return undefined;
  const match = specialRequests.match(/\[(?:VERSEMENT|PAYOUT)\s+([\d.,]+)\s*€?/i);
  if (!match?.[1]) return undefined;
  const normalized = match[1].replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

type ApiPropertyPayload = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  capacity?: number;
  amenities?: string[];
  pricePerNight?: number;
  price?: number;
  description?: string;
  images?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: string | number;
  cleaningFee?: number;
};

type ApiPaymentPayload = {
  status?: string;
  amount?: number;
  method?: string;
  transactionId?: string;
};

type ApiBookingPayload = {
  id: number;
  propertyId: number;
  status?: string;
  totalPrice?: number;
  specialRequests?: string | null;
  notes?: string | null;
  payments?: ApiPaymentPayload[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  createdAt?: string;
  updatedAt?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  confirmationCode?: string;
};

type ApiGuestPayload = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  language?: string;
  status?: string;
  nationality?: string;
  totalBookings?: number;
  totalSpent?: number;
  rating?: number;
  createdAt?: string;
  lastBooking?: string;
  preferences?: Guest['preferences'];
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGuestStatus(status?: string | null): Guest['status'] {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'blocked') return 'blocked';
  if (normalized === 'inactive') return 'inactive';
  return 'active';
}

function normalizeGuestIdentity(input: Pick<Guest, 'name' | 'email' | 'phone'>): string {
  const email = input.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const normalizedName = input.name.trim().toLowerCase().replace(/\s+/g, ' ');
  const normalizedPhone = (input.phone || '').replace(/[^\d+]/g, '');
  return normalizedPhone ? `name:${normalizedName}|phone:${normalizedPhone}` : `name:${normalizedName}`;
}

export function BNBProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(() => loadFromStorage('bnbgest_properties', []));
  const [bookings, setBookings] = useState<Booking[]>(() => loadFromStorage('bnbgest_bookings', []));
  const [guests, setGuests] = useState<Guest[]>(() => loadFromStorage('bnbgest_guests', []));
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(() => loadFromStorage('bnbgest_maintenance', []));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadFromStorage('bnbgest_inventory', []));
  const [reviews, setReviews] = useState<Review[]>(() => loadFromStorage('bnbgest_reviews', []));

  // Hydratation DB (si session/auth active) pour garder le front aligné avec PostgreSQL.
  useEffect(() => {
    let cancelled = false;

    const hydrateFromApi = async () => {
      try {
        const [propertiesRes, bookingsRes, guestsRes] = await Promise.all([
          fetch('/api/properties', { credentials: 'include' }),
          fetch('/api/bookings', { credentials: 'include' }),
          fetch('/api/guests', { credentials: 'include' }),
        ]);

        if (!propertiesRes.ok || !bookingsRes.ok) return;

        const [propertiesPayload, bookingsPayload, guestsPayload] = await Promise.all([
          propertiesRes.json(),
          bookingsRes.json(),
          guestsRes.ok ? guestsRes.json() : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const apiPropertiesRaw = Array.isArray(propertiesPayload?.properties)
          ? (propertiesPayload.properties as ApiPropertyPayload[])
          : [];
        const apiBookingsRaw = Array.isArray(bookingsPayload?.bookings)
          ? (bookingsPayload.bookings as ApiBookingPayload[])
          : [];
        const apiGuestsRaw = Array.isArray(guestsPayload?.guests)
          ? (guestsPayload.guests as ApiGuestPayload[])
          : [];

        const apiProperties: Property[] = apiPropertiesRaw
          .filter((p) => typeof p?.id === 'number' && !!p?.name)
          .map((p) => ({
            id: p.id,
            name: p.name,
            address: p.address || '',
            city: p.city || '',
            country: p.country || 'France',
            type: 'apartment',
            bedrooms: toNumber(p.bedrooms, 1),
            bathrooms: toNumber(p.bathrooms, 1),
            maxGuests: toNumber(p.maxGuests, toNumber(p.capacity, 2)),
            amenities: Array.isArray(p.amenities) ? p.amenities : [],
            price: toNumber(p.pricePerNight, toNumber(p.price, 0)),
            description: p.description || '',
            images: Array.isArray(p.images) ? p.images : [],
            status: (p.status || 'ACTIVE').toString().toLowerCase() === 'maintenance'
              ? 'maintenance'
              : (p.status || 'ACTIVE').toString().toLowerCase() === 'inactive'
                ? 'inactive'
                : 'active',
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
            ownerId: Number.parseInt(String(p.userId || 1), 10) || 1,
            checkInTime: '15:00',
            checkOutTime: '11:00',
            cleaningFee: toNumber(p.cleaningFee, 0),
            securityDeposit: 0,
            minimumStay: 1,
            availabilityCalendar: [],
            rules: [],
          }));

        const apiBookings: Booking[] = apiBookingsRaw
          .filter((b) => typeof b?.id === 'number' && typeof b?.propertyId === 'number')
          .map((b) => {
            const inferredPaymentStatus = normalizePaymentStatus({
              status: b.status,
              totalPrice: b.totalPrice,
              specialRequests: b.specialRequests,
              payments: Array.isArray(b.payments) ? b.payments : [],
            });
            const paidPayment = Array.isArray(b.payments)
              ? b.payments.find((p) => (p?.status || '').toUpperCase() === 'PAID' && Number.isFinite(p?.amount))
              : undefined;
            const payoutFromNotes = extractPayoutFromNotes(b.specialRequests);

            return {
              id: b.id,
              propertyId: b.propertyId,
              guestId: 0,
              checkIn: b.checkIn ? new Date(b.checkIn).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              checkOut: b.checkOut ? new Date(b.checkOut).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              guests: toNumber(b.guests, 1),
              totalPrice: toNumber(b.totalPrice, 0),
              status: normalizeBookingStatus(b.status),
              paymentStatus: inferredPaymentStatus,
              createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
              specialRequests: b.specialRequests || b.notes || '',
              guestInfo: {
                name: b.guestName || 'Voyageur',
                email: b.guestEmail || '',
                phone: b.guestPhone || '',
              },
              paymentInfo: paidPayment
                ? {
                    method: String(paidPayment.method || 'airbnb'),
                    transactionId: String(paidPayment.transactionId || b.confirmationCode || ''),
                    amount: toNumber(paidPayment.amount, toNumber(b.totalPrice, 0)),
                  }
                : undefined,
              hostPayout: payoutFromNotes,
              payoutConfirmed: !!payoutFromNotes,
            };
          });

        const apiGuests: Guest[] = apiGuestsRaw
          .filter((g) => typeof g?.id === 'number' && !!g?.name)
          .map((g) => ({
            id: g.id,
            name: g.name,
            email: g.email || '',
            phone: g.phone || '',
            language: g.language || 'fr',
            nationality: g.nationality,
            totalBookings: toNumber(g.totalBookings, 0),
            totalSpent: toNumber(g.totalSpent, 0),
            rating: toNumber(g.rating, 0),
            status: normalizeGuestStatus(g.status),
            createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : new Date().toISOString(),
            lastBooking: g.lastBooking ? new Date(g.lastBooking).toISOString().slice(0, 10) : undefined,
            preferences: g.preferences || {
              smoking: false,
              pets: false,
              parties: false,
              preferredAmenities: [],
            },
          }));

        setProperties((prev) => {
          if (apiProperties.length === 0) return prev;
          const prevById = new Map(prev.map((p) => [p.id, p]));
          const merged = [...prev];
          for (const apiProp of apiProperties) {
            const existing = prevById.get(apiProp.id);
            if (!existing) {
              merged.push(apiProp);
              continue;
            }
            const index = merged.findIndex((p) => p.id === apiProp.id);
            if (index >= 0) {
              merged[index] = {
                ...apiProp,
                ...existing,
                id: apiProp.id,
                updatedAt: existing.updatedAt || apiProp.updatedAt,
              };
            }
          }
          return merged;
        });

        setBookings((prev) => {
          if (apiBookings.length === 0) return prev;
          const mergedById = new Map<number, Booking>(prev.map((b) => [b.id, b]));

          for (const apiBooking of apiBookings) {
            const existing = mergedById.get(apiBooking.id);
            if (!existing) {
              mergedById.set(apiBooking.id, apiBooking);
              continue;
            }

            mergedById.set(apiBooking.id, {
              ...apiBooking,
              ...existing,
              id: apiBooking.id,
              propertyId: apiBooking.propertyId,
              status: existing.status || apiBooking.status,
              paymentStatus: existing.paymentStatus || apiBooking.paymentStatus,
              hostPayout: existing.hostPayout ?? apiBooking.hostPayout,
              payoutConfirmed: existing.payoutConfirmed ?? apiBooking.payoutConfirmed,
              updatedAt: existing.updatedAt || apiBooking.updatedAt,
            });
          }

          return Array.from(mergedById.values());
        });

        setGuests((prev) => {
          if (apiGuests.length === 0) return prev;
          const mergedByIdentity = new Map<string, Guest>(
            prev.map((guest) => [normalizeGuestIdentity(guest), guest]),
          );

          for (const apiGuest of apiGuests) {
            const key = normalizeGuestIdentity(apiGuest);
            const existing = mergedByIdentity.get(key);
            if (!existing) {
              mergedByIdentity.set(key, apiGuest);
              continue;
            }

            mergedByIdentity.set(key, {
              ...existing,
              ...apiGuest,
              id: apiGuest.id,
              totalBookings: apiGuest.totalBookings,
              totalSpent: apiGuest.totalSpent,
              rating: apiGuest.rating,
              status: apiGuest.status,
              createdAt: existing.createdAt || apiGuest.createdAt,
              lastBooking: apiGuest.lastBooking || existing.lastBooking,
            });
          }

          return Array.from(mergedByIdentity.values());
        });
      } catch {
        // Mode local/offline ou non authentifié: on garde le store local.
      }
    };

    hydrateFromApi();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persistance automatique dans localStorage
  useEffect(() => { saveToStorage('bnbgest_properties', properties); }, [properties]);
  useEffect(() => { saveToStorage('bnbgest_bookings', bookings); }, [bookings]);
  useEffect(() => { saveToStorage('bnbgest_guests', guests); }, [guests]);
  useEffect(() => { saveToStorage('bnbgest_maintenance', maintenanceTasks); }, [maintenanceTasks]);
  useEffect(() => { saveToStorage('bnbgest_inventory', inventory); }, [inventory]);
  useEffect(() => { saveToStorage('bnbgest_reviews', reviews); }, [reviews]);

  // Archivage mensuel automatique des mois précédents (bookings)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyBuckets = new Map<string, Booking[]>();

    for (const booking of bookings) {
      const monthKey = getMonthKeyFromIso(booking.checkIn);
      if (!monthKey) continue;
      if (monthKey >= currentMonthKey) continue; // on archive uniquement les mois précédents
      const list = monthlyBuckets.get(monthKey) ?? [];
      list.push(booking);
      monthlyBuckets.set(monthKey, list);
    }

    const archiveByMonth: Record<string, BookingMonthlyArchive> = {};
    for (const [monthKey, monthBookings] of monthlyBuckets.entries()) {
      const confirmedCount = monthBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
      const cancelledCount = monthBookings.filter(b => b.status === 'cancelled').length;
      const revenue = monthBookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      archiveByMonth[monthKey] = {
        monthKey,
        generatedAt: new Date().toISOString(),
        bookings: monthBookings,
        stats: {
          bookingsCount: monthBookings.length,
          confirmedCount,
          cancelledCount,
          revenue,
        },
      };
    }

    try {
      localStorage.setItem('bnbgest_bookings_archives', JSON.stringify(archiveByMonth));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde des archives mensuelles:', error);
    }
  }, [bookings]);

  // Properties functions
  const addProperty = (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    setProperties(prev => {
      const newProperty: Property = {
        ...property,
        id: Math.max(...prev.map(p => p.id), 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return [...prev, newProperty];
    });
  };

  const updateProperty = (id: number, updates: Partial<Property>) => {
    setProperties(prev => prev.map(prop =>
      prop.id === id
        ? { ...prop, ...updates, updatedAt: new Date().toISOString() }
        : prop
    ));
  };

  const deleteProperty = (id: number) => {
    setProperties(properties.filter(prop => prop.id !== id));
    // Also clean up related data
    setBookings(bookings.filter(booking => booking.propertyId !== id));
    setMaintenanceTasks(maintenanceTasks.filter(task => task.propertyId !== id));
    setInventory(inventory.filter(item => item.propertyId !== id));
    setReviews(reviews.filter(review => review.propertyId !== id));
  };

  const getProperty = (id: number) => properties.find(prop => prop.id === id);

  // Bookings functions
  const addBooking = (booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) => {
    setBookings(prev => {
      const newBooking: Booking = {
        ...booking,
        id: Math.max(...prev.map(b => b.id), 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return [...prev, newBooking];
    });
  };

  const updateBooking = (id: number, updates: Partial<Booking>) => {
    setBookings(prev => prev.map(booking =>
      booking.id === id
        ? { ...booking, ...updates, updatedAt: new Date().toISOString() }
        : booking
    ));
  };

  const cancelBooking = (id: number, _reason?: string) => {
    updateBooking(id, { status: 'cancelled' });
    // TODO: Send cancellation email, process refund, etc.
  };

  const getBookingsByProperty = (propertyId: number) =>
    bookings.filter(booking => booking.propertyId === propertyId);

  const getBookingsByDateRange = (startDate: string, endDate: string) =>
    bookings.filter(booking =>
      // Inclure toute réservation qui chevauche la période (pas seulement celles 100% dedans)
      booking.checkIn < endDate && booking.checkOut > startDate
    );

  const persistGuestToApi = async (
    guest: Guest,
    previousIdentity?: Pick<Guest, 'name' | 'email' | 'phone'>,
  ) => {
    try {
      await fetch('/api/guests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: {
            id: guest.id,
            name: guest.name,
            email: guest.email,
            phone: guest.phone,
            language: guest.language,
            nationality: guest.nationality,
            status: guest.status,
            totalBookings: guest.totalBookings,
            totalSpent: guest.totalSpent,
            rating: guest.rating,
            createdAt: guest.createdAt,
            lastBooking: guest.lastBooking,
            preferences: guest.preferences,
          },
          previousIdentity,
        }),
      });
    } catch {
      // Hors ligne / non authentifié : on conserve la source locale sans bloquer l'UI.
    }
  };

  // Guests functions
  const addGuest = (guest: Omit<Guest, 'id' | 'createdAt' | 'totalBookings' | 'totalSpent' | 'rating'>) => {
    const newGuest: Guest = {
      ...guest,
      id: Math.max(...guests.map(g => g.id), 0) + 1,
      createdAt: new Date().toISOString(),
      totalBookings: 0,
      totalSpent: 0,
      rating: 0,
    };

    setGuests(prev => [...prev, newGuest]);
    void persistGuestToApi(newGuest);
  };

  const updateGuest = (id: number, updates: Partial<Guest>) => {
    const existing = guests.find((guest) => guest.id === id);
    if (!existing) return;

    const updatedGuest: Guest = { ...existing, ...updates };
    setGuests(prev => prev.map(guest =>
      guest.id === id ? updatedGuest : guest
    ));

    void persistGuestToApi(updatedGuest, {
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
    });
  };

  const getGuest = (id: number) => guests.find(guest => guest.id === id);

  // Maintenance functions
  const addMaintenanceTask = (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    setMaintenanceTasks(prev => {
      const newTask: MaintenanceTask = {
        ...task,
        id: Math.max(...prev.map(t => t.id), 0) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return [...prev, newTask];
    });
  };

  const updateMaintenanceTask = (id: number, updates: Partial<MaintenanceTask>) => {
    setMaintenanceTasks(prev => prev.map(task =>
      task.id === id
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
  };

  const completeMaintenanceTask = (id: number, actualCost?: number) => {
    updateMaintenanceTask(id, {
      status: 'completed',
      completedDate: new Date().toISOString(),
      actualCost
    });
  };

  const getMaintenanceTasksByProperty = (propertyId: number) =>
    maintenanceTasks.filter(task => task.propertyId === propertyId);

  const getOverdueTasks = () =>
    maintenanceTasks.filter(task =>
      task.status !== 'completed' &&
      new Date(task.scheduledDate) < new Date()
    );

  // Inventory functions
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>) => {
    setInventory(prev => {
      const newItem: InventoryItem = {
        ...item,
        id: Math.max(...prev.map(i => i.id), 0) + 1
      };
      return [...prev, newItem];
    });
  };

  const updateInventoryItem = (id: number, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const deleteInventoryItem = (id: number) => {
    setInventory(inventory.filter(item => item.id !== id));
  };

  const getLowStockItems = () =>
    inventory.filter(item => item.quantity <= item.minimumQuantity);

  const getInventoryByProperty = (propertyId: number) =>
    inventory.filter(item => item.propertyId === propertyId);

  // Reviews functions
  const addReview = (review: Omit<Review, 'id' | 'createdAt' | 'verified' | 'helpful'>) => {
    setReviews(prev => {
      const newReview: Review = {
        ...review,
        id: Math.max(...prev.map(r => r.id), 0) + 1,
        createdAt: new Date().toISOString(),
        verified: true,
        helpful: 0
      };
      return [...prev, newReview];
    });
  };

  const respondToReview = (reviewId: number, response: string, respondedBy: number) => {
    setReviews(reviews.map(review =>
      review.id === reviewId
        ? {
            ...review,
            response: {
              message: response,
              respondedAt: new Date().toISOString(),
              respondedBy
            }
          }
        : review
    ));
  };

  const getReviewsByProperty = (propertyId: number) =>
    reviews.filter(review => review.propertyId === propertyId);

  const getAverageRating = (propertyId: number) => {
    const propertyReviews = getReviewsByProperty(propertyId);
    if (propertyReviews.length === 0) return 0;
    return propertyReviews.reduce((sum, review) => sum + review.rating, 0) / propertyReviews.length;
  };

  const getReceivedBookingAmount = (booking: Booking): number => {
    const hasLegacyPayoutMarker = /\[(?:VERSEMENT|PAYOUT)\s+[\d.,]+\s*€?/i.test(booking.specialRequests || '');
    const isLegacyCompleted = booking.status === 'completed' && (booking.totalPrice ?? 0) > 0;
    const isPastConfirmed =
      booking.status === 'confirmed' &&
      (booking.totalPrice ?? 0) > 0 &&
      new Date(booking.checkOut).getTime() < Date.now();

    const isReceived =
      booking.paymentStatus === 'paid' ||
      booking.paymentStatus === 'partial' ||
      !!booking.payoutConfirmed ||
      hasLegacyPayoutMarker ||
      isLegacyCompleted ||
      isPastConfirmed;

    if (!isReceived || booking.paymentStatus === 'refunded') return 0;

    if (booking.hostPayout && booking.hostPayout > 0) return booking.hostPayout;
    const payoutFromNotes = extractPayoutFromNotes(booking.specialRequests);
    if (payoutFromNotes && payoutFromNotes > 0) return payoutFromNotes;
    if (booking.paymentStatus === 'partial') return booking.paymentInfo?.amount ?? booking.totalPrice ?? 0;
    return booking.totalPrice ?? 0;
  };

  // Analytics functions
  const generateFinancialReport = (startDate: string, endDate: string): FinancialReport => {
    const periodBookings = getBookingsByDateRange(startDate, endDate);

    // ── Revenus perçus : paid/partial/payoutConfirmed (hors refunded) ──────
    const revenueBookings = periodBookings.filter(
      b => b.status !== 'cancelled'
    );
    const revenue = revenueBookings.reduce((sum, b) => sum + getReceivedBookingAmount(b), 0);

    // ── Dépenses maintenance (tâches complétées dans la période) ────────────
    const expenses = maintenanceTasks
      .filter(t => t.completedDate && t.completedDate >= startDate && t.completedDate <= endDate)
      .reduce((sum, t) => sum + (t.actualCost || t.estimatedCost), 0);

    // ── Jours réservés : uniquement confirmed/completed, clampés sur la période ──
    const totalDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const activeBookings = periodBookings.filter(
      b => b.status === 'confirmed' || b.status === 'completed'
    );
    const bookedDays = activeBookings.reduce((sum, b) => {
      const clampedIn  = new Date(Math.max(new Date(b.checkIn).getTime(),  new Date(startDate).getTime()));
      const clampedOut = new Date(Math.min(new Date(b.checkOut).getTime(), new Date(endDate).getTime()));
      const days = Math.ceil((clampedOut.getTime() - clampedIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    // ── Taux d'occupation : rapporté au nombre de logements actifs ──────────
    const activeProperties = properties.length > 0 ? properties.length : 1;
    const occupancyRate = totalDays > 0
      ? Math.min(100, (bookedDays / (totalDays * activeProperties)) * 100)
      : 0;

    // ── ADR : revenu réel / nuits effectivement réservées ───────────────────
    const averageDailyRate = bookedDays > 0 ? revenue / bookedDays : 0;

    // ── Breakdown réel (somme des champs disponibles) ───────────────────────
    const cleaningTotal = revenueBookings.reduce((s, b) => s + (b.cleaningFee || 0), 0);
    const serviceFeeTotal = revenueBookings.reduce((s, b) => s + (b.serviceFee  || 0), 0);
    const taxTotal        = revenueBookings.reduce((s, b) => s + (b.taxAmount   || 0), 0);
    const accommodationTotal = revenue - cleaningTotal - serviceFeeTotal - taxTotal;

    const maintenanceCost = maintenanceTasks
      .filter(t => t.completedDate && t.completedDate >= startDate && t.completedDate <= endDate && t.category !== 'cleaning')
      .reduce((s, t) => s + (t.actualCost || t.estimatedCost), 0);
    const cleaningCost = maintenanceTasks
      .filter(t => t.completedDate && t.completedDate >= startDate && t.completedDate <= endDate && t.category === 'cleaning')
      .reduce((s, t) => s + (t.actualCost || t.estimatedCost), 0);

    return {
      period: `${startDate} to ${endDate}`,
      revenue,
      expenses,
      profit: revenue - expenses,
      occupancyRate,
      averageDailyRate,
      bookingsCount: activeBookings.length,
      breakdown: {
        accommodation: Math.max(0, accommodationTotal),
        cleaning:      cleaningTotal + cleaningCost,
        maintenance:   maintenanceCost,
        supplies:      expenses - maintenanceCost - cleaningCost > 0 ? expenses - maintenanceCost - cleaningCost : 0,
        other:         serviceFeeTotal + taxTotal,
      }
    };
  };

  const getOccupancyRate = (propertyId: number, startDate: string, endDate: string): number => {
    const propertyBookings = getBookingsByProperty(propertyId)
      .filter(b => b.status === 'confirmed' || b.status === 'completed');

    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const bookedDays = propertyBookings.reduce((sum, b) => {
      const checkIn = new Date(Math.max(new Date(b.checkIn).getTime(), new Date(startDate).getTime()));
      const checkOut = new Date(Math.min(new Date(b.checkOut).getTime(), new Date(endDate).getTime()));
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    return (bookedDays / totalDays) * 100;
  };

  const getRevenueByProperty = (propertyId: number, startDate: string, endDate: string): number => {
    return getBookingsByProperty(propertyId)
      .filter(b =>
        b.status !== 'cancelled' &&
        b.checkOut >= startDate &&
        b.checkIn <= endDate
      )
      .reduce((sum, b) => sum + getReceivedBookingAmount(b), 0);
  };

  // Utility functions
  const exportData = (type: 'properties' | 'bookings' | 'guests' | 'maintenance' | 'inventory'): string => {
    let data: unknown[] = [];
    switch (type) {
      case 'properties': data = properties; break;
      case 'bookings': data = bookings; break;
      case 'guests': data = guests; break;
      case 'maintenance': data = maintenanceTasks; break;
      case 'inventory': data = inventory; break;
    }
    return JSON.stringify(data, null, 2);
  };

  const importData = (type: string, data: unknown[]) => {
    // This would typically validate and merge data
    console.log(`Importing ${data.length} ${type} records`);
  };

  const searchProperties = (query: string): Property[] => {
    const lowercaseQuery = query.toLowerCase();
    return properties.filter(prop =>
      prop.name.toLowerCase().includes(lowercaseQuery) ||
      prop.address.toLowerCase().includes(lowercaseQuery) ||
      prop.city.toLowerCase().includes(lowercaseQuery) ||
      prop.description.toLowerCase().includes(lowercaseQuery)
    );
  };

  const searchGuests = (query: string): Guest[] => {
    const lowercaseQuery = query.toLowerCase();
    return guests.filter(guest =>
      guest.name.toLowerCase().includes(lowercaseQuery) ||
      guest.email.toLowerCase().includes(lowercaseQuery) ||
      guest.phone.includes(query)
    );
  };

  // ─── Purge des données importées depuis Gmail ────────────────────────────
  // Supprime toutes les réservations (et voyageurs orphelins) créés par
  // l'import Gmail, identifiés par "Importé depuis Gmail" dans specialRequests.
  // Utilisé pendant la phase de développement du parser pour repartir de zéro.
  const purgeGmailImports = (): { bookings: number; guests: number } => {
    // 1. Identifier les bookings importés depuis Gmail
    const gmailBookingIds = new Set(
      bookings
        .filter(b => b.specialRequests?.includes('Importé depuis Gmail'))
        .map(b => b.id)
    );

    if (gmailBookingIds.size === 0) return { bookings: 0, guests: 0 };

    // 2. Identifier les guestIds concernés par ces bookings
    const gmailGuestIds = new Set(
      bookings
        .filter(b => gmailBookingIds.has(b.id))
        .map(b => b.guestId)
        .filter(id => id > 0)
    );

    // 3. Supprimer les bookings Gmail
    setBookings(prev => prev.filter(b => !gmailBookingIds.has(b.id)));

    // 4. Supprimer les voyageurs qui n'ont PLUS aucune autre réservation non-Gmail
    const remainingBookingsAfterPurge = bookings.filter(b => !gmailBookingIds.has(b.id));
    const guestIdsWithOtherBookings = new Set(
      remainingBookingsAfterPurge.map(b => b.guestId)
    );
    const orphanGuestIds = [...gmailGuestIds].filter(id => !guestIdsWithOtherBookings.has(id));
    if (orphanGuestIds.length > 0) {
      setGuests(prev => {
        return prev.filter(g => !orphanGuestIds.includes(g.id));
      });
    }

    return { bookings: gmailBookingIds.size, guests: orphanGuestIds.length };
  };

  const value = {
    // Properties
    properties,
    addProperty,
    updateProperty,
    deleteProperty,
    getProperty,

    // Bookings
    bookings,
    addBooking,
    updateBooking,
    cancelBooking,
    getBookingsByProperty,
    getBookingsByDateRange,

    // Guests
    guests,
    addGuest,
    updateGuest,
    getGuest,

    // Maintenance
    maintenanceTasks,
    addMaintenanceTask,
    updateMaintenanceTask,
    completeMaintenanceTask,
    getMaintenanceTasksByProperty,
    getOverdueTasks,

    // Inventory
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getLowStockItems,
    getInventoryByProperty,

    // Reviews
    reviews,
    addReview,
    respondToReview,
    getReviewsByProperty,
    getAverageRating,

    // Analytics
    generateFinancialReport,
    getOccupancyRate,
    getRevenueByProperty,

    // Utilities
    exportData,
    importData,
    searchProperties,
    searchGuests,

    // Gmail — Purge
    purgeGmailImports,
  };

  return (
    <BNBContext.Provider value={value}>
      {children}
    </BNBContext.Provider>
  );
}

export function useBNB() {
  const context = useContext(BNBContext);
  if (context === undefined) {
    throw new Error('useBNB must be used within a BNBProvider');
  }
  return context;
}