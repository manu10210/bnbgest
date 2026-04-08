import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Test user credentials (must match auth-helper.ts)
 */
export const testCredentials = {
  email: process.env.TEST_USER_EMAIL || 'demo@bnbgest.com',
  password: process.env.TEST_USER_PASSWORD || 'demo123',
  name: 'Test User Demo',
};

/**
 * Create or update test user in database
 * Used for E2E testing authentication
 */
export async function createTestUser() {
  const hashedPassword = await bcrypt.hash(testCredentials.password, 10);

  const user = await prisma.user.upsert({
    where: { email: testCredentials.email },
    create: {
      email: testCredentials.email,
      name: testCredentials.name,
      password: hashedPassword,
      role: 'ADMIN',
    },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`✅ Test user created/updated: ${user.email}`);
  return user;
}

/**
 * Create test property for bookings/maintenance tests
 */
export async function createTestProperty(userId: string) {
  // First, check if test property exists
  const existing = await prisma.property.findFirst({
    where: { 
      name: 'Villa Test E2E',
      userId 
    },
  });

  if (existing) {
    console.log(`✅ Test property already exists: ${existing.name}`);
    return existing;
  }

  // Create new test property
  const property = await prisma.property.create({
    data: {
      name: 'Villa Test E2E',
      address: '123 Test Street',
      city: 'Paris',
      country: 'France',
      zipCode: '75001',
      bedrooms: 3,
      bathrooms: 2,
      capacity: 6,
      maxGuests: 6,
      price: 150,
      pricePerNight: 150,
      description: 'Test property for E2E testing',
      userId,
    },
  });

  console.log(`✅ Test property created: ${property.name}`);
  return property;
}

/**
 * Seed test data (user + property)
 * Call this before running E2E tests
 */
export async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  const user = await createTestUser();
  const property = await createTestProperty(user.id);

  console.log('✅ Test data seeded successfully');
  return { user, property };
}

/**
 * Clean up test data after tests
 * DANGER: Only run in test environment!
 */
export async function cleanupTestData() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('❌ cleanupTestData() can only run in test environment!');
  }

  console.log('🧹 Cleaning up test data...');

  // Get test property
  const testProperty = await prisma.property.findFirst({
    where: { name: 'Villa Test E2E' },
  });

  if (testProperty) {
    // Delete test bookings
    await prisma.booking.deleteMany({
      where: { propertyId: testProperty.id },
    });

    // Delete test maintenance tasks
    await prisma.maintenanceTask.deleteMany({
      where: { propertyId: testProperty.id },
    });
  }

  // Delete test bookings with test emails
  await prisma.booking.deleteMany({
    where: { 
      guestEmail: { contains: 'test' }
    },
  });

  console.log('✅ Test data cleaned up');
}

/**
 * Disconnect database connection
 * Call this after all tests complete
 */
export async function disconnectDB() {
  await prisma.$disconnect();
  console.log('✅ Database disconnected');
}

/**
 * Create test guest for booking tests
 * Note: Schema uses guestEmail/guestName in Booking directly, no separate Guest model
 */
export async function createTestGuest() {
  // Guest data is embedded in Booking model
  // Return mock guest data for test bookings
  return {
    email: 'test-guest@example.com',
    name: 'Test Guest',
    phone: '+33612345678',
  };
}

/**
 * Create test booking for calendar tests
 */
export async function createTestBooking(propertyId: number, guestData?: { email: string; name: string; phone?: string }) {
  const guest = guestData || await createTestGuest();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 7 days from now

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3); // 3 nights

  const booking = await prisma.booking.create({
    data: {
      propertyId,
      guestName: guest.name,
      guestEmail: guest.email,
      guestPhone: guest.phone || null,
      checkIn: startDate,
      checkOut: endDate,
      guests: 2,
      totalPrice: 450, // 3 nights * 150
      status: 'CONFIRMED',
    },
  });

  console.log(`✅ Test booking created: ${booking.id}`);
  return booking;
}

// Export prisma client for advanced test scenarios
export { prisma };
