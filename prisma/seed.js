// Seed script compatible Vercel PostgreSQL
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  
  // Nettoyage
  console.log('Cleaning database...');
  await prisma.auditLog.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.backup.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.integrationSetting.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.maintenanceTask.deleteMany();
  await prisma.cleaning.deleteMany();
  await prisma.video.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.property.deleteMany();
  await prisma.userSettings.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Database cleaned');
  
  // Créer un utilisateur admin
  console.log('Creating admin user...');
  const hashedPassword = await hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'claustre.emmanuel@gmail.com',
      name: 'Emmanuel Claustre',
      hashedPassword,
      emailVerified: new Date(),
      role: 'ADMIN',
    },
  });
  
  console.log(`✅ Admin user created: ${admin.email}`);
  
  // Créer 2 propriétés
  console.log('Creating properties...');
  const property1 = await prisma.property.create({
    data: {
      name: 'Appartement Marais',
      address: '12 Rue des Rosiers, Paris 75004',
      city: 'Paris',
      country: 'France',
      zipCode: '75004',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      pricePerNight: 150.0,
      description: 'Charmant appartement dans le Marais',
      ownerId: admin.id,
      status: 'ACTIVE',
    },
  });
  
  const property2 = await prisma.property.create({
    data: {
      name: 'Studio Montmartre',
      address: '5 Place du Tertre, Paris 75018',
      city: 'Paris',
      country: 'France',
      zipCode: '75018',
      bedrooms: 1,
      bathrooms: 1,
      maxGuests: 2,
      pricePerNight: 85.0,
      description: 'Studio cosy près du Sacré-Cœur',
      ownerId: admin.id,
      status: 'ACTIVE',
    },
  });
  
  console.log(`✅ ${await prisma.property.count()} properties created`);
  
  // Créer 3 réservations
  console.log('Creating bookings...');
  const bookings = await prisma.booking.createMany({
    data: [
      {
        propertyId: property1.id,
        guestName: 'Jean Dupont',
        guestEmail: 'jean.dupont@example.com',
        guestPhone: '+33612345678',
        checkIn: new Date('2026-04-15'),
        checkOut: new Date('2026-04-20'),
        guests: 4,
        totalPrice: 750.0,
        status: 'CONFIRMED',
        source: 'DIRECT',
      },
      {
        propertyId: property1.id,
        guestName: 'Marie Martin',
        guestEmail: 'marie.martin@example.com',
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-07'),
        guests: 2,
        totalPrice: 900.0,
        status: 'CONFIRMED',
        source: 'AIRBNB',
        externalId: 'AIRBNB-123456',
      },
      {
        propertyId: property2.id,
        guestName: 'Pierre Bernard',
        guestEmail: 'pierre.bernard@example.com',
        guestPhone: '+33698765432',
        checkIn: new Date('2026-04-10'),
        checkOut: new Date('2026-04-12'),
        guests: 2,
        totalPrice: 170.0,
        status: 'PENDING',
        source: 'BOOKING_COM',
        externalId: 'BOOKING-789012',
      },
    ],
  });
  
  console.log(`✅ ${bookings.count} bookings created`);
  
  console.log('\n🎉 Seed completed successfully!');
  console.log('📊 Statistics:');
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Properties: ${await prisma.property.count()}`);
  console.log(`   - Bookings: ${await prisma.booking.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
