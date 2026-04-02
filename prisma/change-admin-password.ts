// Script pour changer le mot de passe administrateur
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function changeAdminPassword() {
  console.log('🔐 Change Admin Password\n');

  try {
    // Vérifier que l'admin existe
    const admin = await prisma.user.findUnique({
      where: { email: 'claustre.emmanuel@gmail.com' },
      select: { email: true, name: true, role: true }
    });

    if (!admin) {
      console.error('❌ Admin account not found!');
      process.exit(1);
    }

    console.log('✅ Admin account found:', admin.email);
    console.log('');

    // Demander le nouveau mot de passe
    const newPassword = await question('Enter new password (min 8 characters): ');
    
    if (!newPassword || newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long!');
      process.exit(1);
    }

    const confirmPassword = await question('Confirm new password: ');

    if (newPassword !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      process.exit(1);
    }

    // Hash et mise à jour
    console.log('\n🔄 Updating password...');
    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
      where: { email: 'claustre.emmanuel@gmail.com' },
      data: { password: hashedPassword }
    });

    console.log('✅ Password changed successfully!');
    console.log('\n📧 You can now login with:');
    console.log('   Email:', admin.email);
    console.log('   Password: (your new password)');
    console.log('\n🔗 Login URL: https://bnbgest.vercel.app/login');

  } catch (error) {
    console.error('❌ Error changing password:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

changeAdminPassword()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
