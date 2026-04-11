/**
 * Script simple pour générer le storage state via API NextAuth
 */
import { chromium } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupAuth() {
  console.log('\n🔐 Setup authentication storage state...\n');

  // 1. Ensure test user exists
  const email = 'demo@bnbgest.com';
  const password = 'Demo1234!';
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: 'Demo User',
      role: 'ADMIN',
    },
  });

  console.log('✅ User ready:', email);

  // 2. Launch browser and authenticate
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100, // Ralentir pour voir ce qui se passe
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🌐 Navigating to login page...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  console.log('✍️ Filling credentials...');
  await page.fill('#email', email);
  await page.fill('#password', password);

  console.log('🚀 Submitting form...');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to admin dashboard
  console.log('⏳ Waiting for authentication...');
  await page.waitForURL('**/admin**', { timeout: 30000 });
  await page.waitForLoadState('networkidle');

  // Verify we're authenticated
  await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 10000 });
  
  console.log('✅ Authentication successful!');

  // Save storage state
  await context.storageState({ path: 'playwright/.auth/user.json' });
  console.log('💾 Storage state saved!\n');

  await browser.close();
  await prisma.$disconnect();
  
  console.log('🎉 All done! Run tests with: npm run test:visual\n');
}

setupAuth().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
