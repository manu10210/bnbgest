// Script de nettoyage pour production - Supprime les données de test
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTestData() {
  console.log('🧹 Cleaning test data from production database...');

  try {
    // Supprimer les données de test (garder uniquement admin réel)
    
    // 1. Supprimer toutes les données liées (ordre important pour les foreign keys)
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
    
    console.log('✅ All test data deleted');

    // 2. Supprimer les comptes de test (garder uniquement admin)
    const deletedEmployees = await prisma.user.deleteMany({
      where: {
        email: {
          not: 'claustre.emmanuel@gmail.com'
        }
      }
    });
    
    console.log(`✅ Deleted ${deletedEmployees.count} test user accounts`);

    // 3. Vérifier que le compte admin existe toujours
    const adminUser = await prisma.user.findUnique({
      where: { email: 'claustre.emmanuel@gmail.com' },
      select: { email: true, name: true, role: true }
    });

    if (adminUser) {
      console.log('✅ Admin account preserved:', adminUser);
    } else {
      console.error('❌ WARNING: Admin account not found!');
    }

    // 4. Afficher les statistiques finales
    const stats = {
      users: await prisma.user.count(),
      properties: await prisma.property.count(),
      bookings: await prisma.booking.count(),
      reviews: await prisma.review.count(),
    };

    console.log('\n📊 Database statistics after cleanup:');
    console.log('   - Users:', stats.users);
    console.log('   - Properties:', stats.properties);
    console.log('   - Bookings:', stats.bookings);
    console.log('   - Reviews:', stats.reviews);

    console.log('\n🎉 Production database is now clean and ready for real data!');
    console.log('\n📧 Admin account:');
    console.log('   Email: claustre.emmanuel@gmail.com');
    console.log('   Password: admin123 (remember to change this in production!)');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanTestData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
