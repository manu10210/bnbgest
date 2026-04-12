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
  payoutDate?: string;       // Date du virement (YYYY-MM-DD)
  payoutConfirmed?: boolean; // true = virement confirmé par email
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

export function BNBProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(() => loadFromStorage('bnbgest_properties', []));
  const [bookings, setBookings] = useState<Booking[]>(() => loadFromStorage('bnbgest_bookings', []));
  const [guests, setGuests] = useState<Guest[]>(() => loadFromStorage('bnbgest_guests', []));
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(() => loadFromStorage('bnbgest_maintenance', []));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadFromStorage('bnbgest_inventory', []));
  const [reviews, setReviews] = useState<Review[]>(() => loadFromStorage('bnbgest_reviews', []));

  // Persistance automatique dans localStorage
  useEffect(() => { saveToStorage('bnbgest_properties', properties); }, [properties]);
  useEffect(() => { saveToStorage('bnbgest_bookings', bookings); }, [bookings]);
  useEffect(() => { saveToStorage('bnbgest_guests', guests); }, [guests]);
  useEffect(() => { saveToStorage('bnbgest_maintenance', maintenanceTasks); }, [maintenanceTasks]);
  useEffect(() => { saveToStorage('bnbgest_inventory', inventory); }, [inventory]);
  useEffect(() => { saveToStorage('bnbgest_reviews', reviews); }, [reviews]);

  // Properties functions
  const addProperty = (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProperty: Property = {
      ...property,
      id: Math.max(...properties.map(p => p.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProperties([...properties, newProperty]);
  };

  const updateProperty = (id: number, updates: Partial<Property>) => {
    setProperties(properties.map(prop =>
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
    const newBooking: Booking = {
      ...booking,
      id: Math.max(...bookings.map(b => b.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setBookings([...bookings, newBooking]);
  };

  const updateBooking = (id: number, updates: Partial<Booking>) => {
    setBookings(bookings.map(booking =>
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
      booking.checkIn >= startDate && booking.checkOut <= endDate
    );

  // Guests functions
  const addGuest = (guest: Omit<Guest, 'id' | 'createdAt' | 'totalBookings' | 'totalSpent' | 'rating'>) => {
    const newGuest: Guest = {
      ...guest,
      id: Math.max(...guests.map(g => g.id), 0) + 1,
      createdAt: new Date().toISOString(),
      totalBookings: 0,
      totalSpent: 0,
      rating: 0
    };
    setGuests([...guests, newGuest]);
  };

  const updateGuest = (id: number, updates: Partial<Guest>) => {
    setGuests(guests.map(guest =>
      guest.id === id ? { ...guest, ...updates } : guest
    ));
  };

  const getGuest = (id: number) => guests.find(guest => guest.id === id);

  // Maintenance functions
  const addMaintenanceTask = (task: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: MaintenanceTask = {
      ...task,
      id: Math.max(...maintenanceTasks.map(t => t.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setMaintenanceTasks([...maintenanceTasks, newTask]);
  };

  const updateMaintenanceTask = (id: number, updates: Partial<MaintenanceTask>) => {
    setMaintenanceTasks(maintenanceTasks.map(task =>
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
    const newItem: InventoryItem = {
      ...item,
      id: Math.max(...inventory.map(i => i.id), 0) + 1
    };
    setInventory([...inventory, newItem]);
  };

  const updateInventoryItem = (id: number, updates: Partial<InventoryItem>) => {
    setInventory(inventory.map(item =>
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
    const newReview: Review = {
      ...review,
      id: Math.max(...reviews.map(r => r.id), 0) + 1,
      createdAt: new Date().toISOString(),
      verified: true,
      helpful: 0
    };
    setReviews([...reviews, newReview]);
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

  // Analytics functions
  const generateFinancialReport = (startDate: string, endDate: string): FinancialReport => {
    const periodBookings = getBookingsByDateRange(startDate, endDate);
    const revenue = periodBookings
      .filter(b => b.status === 'completed' && b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const expenses = maintenanceTasks
      .filter(t => t.completedDate && t.completedDate >= startDate && t.completedDate <= endDate)
      .reduce((sum, t) => sum + (t.actualCost || t.estimatedCost), 0);

    const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const bookedDays = periodBookings.reduce((sum, b) => {
      const days = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    const occupancyRate = (bookedDays / (totalDays * properties.length)) * 100;

    return {
      period: `${startDate} to ${endDate}`,
      revenue,
      expenses,
      profit: revenue - expenses,
      occupancyRate,
      averageDailyRate: revenue / bookedDays || 0,
      bookingsCount: periodBookings.length,
      breakdown: {
        accommodation: revenue * 0.8,
        cleaning: revenue * 0.1,
        maintenance: expenses * 0.6,
        supplies: expenses * 0.3,
        other: expenses * 0.1
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
        b.status === 'completed' &&
        b.paymentStatus === 'paid' &&
        b.checkOut >= startDate &&
        b.checkIn <= endDate
      )
      .reduce((sum, b) => sum + b.totalPrice, 0);
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
    searchGuests
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