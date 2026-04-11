/**
 * Reset demo user with correct password
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetDemoUser() {
  const email = 'demo@bnbgest.com';
  const password = 'Demo1234!';

  console.log('🔄 Resetting demo user...');

  // Delete existing user
  await prisma.user.deleteMany({
    where: { email },
  });

  console.log('✅ Existing user deleted');

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create new user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  console.log('✅ New user created:');
  console.log('   📧 Email:', email);
  console.log('   🔑 Password:', password);
  console.log('   👤 Role: ADMIN');
  console.log('\n🎉 You can now login with these credentials!\n');

  await prisma.$disconnect();
}

resetDemoUser().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
