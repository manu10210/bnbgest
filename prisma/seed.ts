import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ⚠️ PROTECTION PRODUCTION: Ne jamais seed en production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    console.log('❌ SEED BLOCKED: Cannot run seed in production environment!');
    console.log('   Use prisma/cleanup-production.ts to manage production data.');
    process.exit(1);
  }

  console.log('🌱 Starting seed (development only)...');

  // Nettoyer la base (développement uniquement)
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

  // 1. Créer un utilisateur admin
  const passwordHash = await hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'claustre.emmanuel@gmail.com',
      name: 'Emmanuel Claustre',
      password: passwordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
      profile: {
        create: {
          phone: '+33 6 12 34 56 78',
          company: 'BNBGEST',
          address: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          website: 'https://bnbgest.vercel.app',
          bio: 'Gestionnaire de propriétés Airbnb depuis 2020',
          timezone: 'Europe/Paris',
          language: 'fr',
          currency: 'EUR'
        }
      },
      settings: {
        create: {
          twoFactorEnabled: false,
          autoBackupEnabled: true,
          backupFrequency: 'daily',
          backupTime: '03:00',
          retentionDays: 30,
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          numberFormat: 'space',
          firstDayOfWeek: 1
        }
      }
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // 2. Créer des propriétés
  const property1 = await prisma.property.create({
    data: {
      name: 'Appartement Marais',
      address: '15 Rue des Rosiers',
      city: 'Paris',
      country: 'France',
      description: 'Magnifique appartement au cœur du Marais, proche du métro et des commerces',
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      price: 150,
      currency: 'EUR',
      status: 'ACTIVE',
      userId: admin.id
    }
  });

  const property2 = await prisma.property.create({
    data: {
      name: 'Studio Montmartre',
      address: '8 Rue Norvins',
      city: 'Paris',
      country: 'France',
      description: 'Studio cosy avec vue sur Sacré-Cœur',
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      price: 90,
      currency: 'EUR',
      status: 'ACTIVE',
      userId: admin.id
    }
  });

  console.log('✅ Properties created:', property1.name, property2.name);

  // 3. Créer des réservations
  const booking1 = await prisma.booking.create({
    data: {
      propertyId: property1.id,
      userId: admin.id,
      guestName: 'Jean Dupont',
      guestEmail: 'jean.dupont@example.com',
      guestPhone: '+33 6 98 76 54 32',
      checkIn: new Date('2024-06-15'),
      checkOut: new Date('2024-06-20'),
      guests: 2,
      totalPrice: 750,
      status: 'CONFIRMED',
      source: 'DIRECT',
      notes: 'Arrivée prévue vers 15h'
    }
  });

  const booking2 = await prisma.booking.create({
    data: {
      propertyId: property1.id,
      guestName: 'Marie Martin',
      guestEmail: 'marie.martin@example.com',
      checkIn: new Date('2024-07-01'),
      checkOut: new Date('2024-07-07'),
      guests: 4,
      totalPrice: 900,
      status: 'CONFIRMED',
      source: 'AIRBNB',
      externalId: 'AIRBNB-12345'
    }
  });

  const booking3 = await prisma.booking.create({
    data: {
      propertyId: property2.id,
      guestName: 'Peter Smith',
      guestEmail: 'peter@example.com',
      checkIn: new Date('2024-06-25'),
      checkOut: new Date('2024-06-28'),
      guests: 2,
      totalPrice: 270,
      status: 'CONFIRMED',
      source: 'BOOKING_COM',
      externalId: 'BOOKING-67890'
    }
  });

  console.log('✅ Bookings created:', booking1.guestName, booking2.guestName, booking3.guestName);

  // 4. Créer des paiements
  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: 750,
      currency: 'EUR',
      status: 'COMPLETED',
      method: 'CARD',
      transactionId: 'TRX-001',
      paidAt: new Date()
    }
  });

  await prisma.payment.create({
    data: {
      bookingId: booking2.id,
      amount: 900,
      currency: 'EUR',
      status: 'COMPLETED',
      method: 'STRIPE',
      transactionId: 'TRX-002',
      paidAt: new Date()
    }
  });

  console.log('✅ Payments created');

  // 5. Créer des avis
  await prisma.review.create({
    data: {
      propertyId: property1.id,
      bookingId: booking1.id,
      userId: admin.id,
      guestName: 'Jean Dupont',
      rating: 5,
      comment: 'Excellent séjour, appartement conforme à la description. Hôte très accueillant.',
      isPublic: true,
      source: 'DIRECT'
    }
  });

  await prisma.review.create({
    data: {
      propertyId: property1.id,
      guestName: 'Marie Martin',
      rating: 4,
      comment: 'Très bon emplacement, appartement propre et bien équipé.',
      isPublic: true,
      source: 'AIRBNB',
      externalId: 'AIRBNB-REV-001'
    }
  });

  console.log('✅ Reviews created');

  // 6. Créer des photos
  await prisma.photo.createMany({
    data: [
      {
        propertyId: property1.id,
        url: '/photos/marais-living.jpg',
        caption: 'Salon spacieux',
        category: 'living_room',
        order: 1,
        isMain: true
      },
      {
        propertyId: property1.id,
        url: '/photos/marais-bedroom.jpg',
        caption: 'Chambre principale',
        category: 'bedroom',
        order: 2,
        isMain: false
      },
      {
        propertyId: property2.id,
        url: '/photos/montmartre-studio.jpg',
        caption: 'Studio vue Sacré-Cœur',
        category: 'living_room',
        order: 1,
        isMain: true
      }
    ]
  });

  console.log('✅ Photos created');

  // 7. Créer des tâches de nettoyage
  await prisma.cleaning.createMany({
    data: [
      {
        propertyId: property1.id,
        scheduledDate: new Date('2024-06-14'),
        status: 'COMPLETED',
        assignedTo: 'Sophie Nettoyage',
        completedDate: new Date('2024-06-14'),
        estimatedTime: 120,
        actualTime: 115,
        notes: 'Nettoyage complet effectué'
      },
      {
        propertyId: property1.id,
        scheduledDate: new Date('2024-06-20'),
        status: 'SCHEDULED',
        assignedTo: 'Sophie Nettoyage',
        estimatedTime: 120
      },
      {
        propertyId: property2.id,
        scheduledDate: new Date('2024-06-24'),
        status: 'SCHEDULED',
        estimatedTime: 90
      }
    ]
  });

  console.log('✅ Cleanings created');

  // 8. Créer des tâches de maintenance
  await prisma.maintenanceTask.createMany({
    data: [
      {
        propertyId: property1.id,
        title: 'Réparer robinet cuisine',
        description: 'Fuite légère du robinet de la cuisine',
        priority: 'MEDIUM',
        status: 'PENDING',
        category: 'Plumbing',
        dueDate: new Date('2024-06-30'),
        cost: 80
      },
      {
        propertyId: property1.id,
        title: 'Changer ampoule couloir',
        description: 'Ampoule LED grillée dans le couloir',
        priority: 'LOW',
        status: 'COMPLETED',
        category: 'Electrical',
        completedAt: new Date('2024-06-10'),
        cost: 15
      },
      {
        propertyId: property2.id,
        title: 'Vérifier chaudière',
        description: 'Contrôle annuel de la chaudière',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        category: 'HVAC',
        assignedTo: 'Plombier Pro',
        dueDate: new Date('2024-07-01'),
        cost: 120
      }
    ]
  });

  console.log('✅ Maintenance tasks created');

  // 9. Créer des items d'inventaire
  await prisma.inventoryItem.createMany({
    data: [
      {
        propertyId: property1.id,
        name: 'Draps housse',
        category: 'Linge',
        quantity: 6,
        minQuantity: 3,
        unit: 'pièces',
        location: 'Placard chambre',
        lastChecked: new Date()
      },
      {
        propertyId: property1.id,
        name: 'Savon liquide',
        category: 'Produits',
        quantity: 4,
        minQuantity: 2,
        unit: 'litres',
        location: 'Salle de bain',
        lastChecked: new Date()
      },
      {
        propertyId: property1.id,
        name: 'Papier toilette',
        category: 'Produits',
        quantity: 8,
        minQuantity: 5,
        unit: 'rouleaux',
        location: 'Salle de bain'
      },
      {
        propertyId: property2.id,
        name: 'Serviettes de bain',
        category: 'Linge',
        quantity: 4,
        minQuantity: 2,
        unit: 'pièces',
        location: 'Placard entrée'
      }
    ]
  });

  console.log('✅ Inventory items created');

  // 10. Créer des paramètres d'intégration
  await prisma.integrationSetting.createMany({
    data: [
      {
        platform: 'airbnb',
        enabled: false,
        icalUrl: '',
        syncStatus: 'success'
      },
      {
        platform: 'booking_com',
        enabled: false,
        hotelId: '',
        syncStatus: 'success'
      }
    ]
  });

  console.log('✅ Integration settings created');

  // 11. Créer des sauvegardes
  await prisma.backup.createMany({
    data: [
      {
        name: 'backup-2024-03-30-03-00',
        type: 'AUTOMATIC',
        status: 'COMPLETED',
        size: 45200000,
        path: '/backups/2024-03-30.sql',
        createdAt: new Date('2024-03-30T03:00:00')
      },
      {
        name: 'backup-2024-03-29-03-00',
        type: 'AUTOMATIC',
        status: 'COMPLETED',
        size: 44800000,
        path: '/backups/2024-03-29.sql',
        createdAt: new Date('2024-03-29T03:00:00')
      },
      {
        name: 'backup-manual-2024-03-28',
        type: 'MANUAL',
        status: 'COMPLETED',
        size: 44500000,
        path: '/backups/2024-03-28-manual.sql',
        createdAt: new Date('2024-03-28T14:30:00')
      }
    ]
  });

  console.log('✅ Backups created');

  // 12. Stats finales
  const stats = {
    users: await prisma.user.count(),
    properties: await prisma.property.count(),
    bookings: await prisma.booking.count(),
    reviews: await prisma.review.count(),
    cleanings: await prisma.cleaning.count(),
    maintenance: await prisma.maintenanceTask.count(),
    inventory: await prisma.inventoryItem.count()
  };

  console.log('\n🎉 Seed completed successfully!');
  console.log('📊 Database statistics:');
  console.log(`   - Users: ${stats.users}`);
  console.log(`   - Properties: ${stats.properties}`);
  console.log(`   - Bookings: ${stats.bookings}`);
  console.log(`   - Reviews: ${stats.reviews}`);
  console.log(`   - Cleanings: ${stats.cleanings}`);
  console.log(`   - Maintenance tasks: ${stats.maintenance}`);
  console.log(`   - Inventory items: ${stats.inventory}`);
  console.log('\n📧 Test credentials:');
  console.log('   Email: claustre.emmanuel@gmail.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
