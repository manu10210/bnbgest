import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedTestUser() {
  const email = 'demo@bnbgest.com';
  const password = 'Demo1234!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('✅ Test user already exists:', email);
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Test user created successfully!');
  console.log('📧 Email:', email);
  console.log('🔑 Password: Demo1234!');
  
  return user;
}

export async function cleanupTestUser() {
  await prisma.user.deleteMany({
    where: { email: 'demo@bnbgest.com' },
  });
  console.log('🗑️ Test user cleaned up');
}

if (require.main === module) {
  seedTestUser()
    .then(() => prisma.$disconnect())
    .catch((error) => {
      console.error('❌ Error seeding test user:', error);
      prisma.$disconnect();
      process.exit(1);
    });
}
