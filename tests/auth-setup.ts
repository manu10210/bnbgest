import { chromium, FullConfig } from '@playwright/test';
import { seedTestUser } from './helpers/seed-test-user';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global authentication setup for Playwright tests
 * Generates authenticated storage state to avoid repeated logins
 * 
 * This runs ONCE before all tests, after global-setup.ts
 */
async function globalAuthSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication state...\n');

  const storageStatePath = 'playwright/.auth/user.json';

  // Check if storage state already exists
  if (fs.existsSync(storageStatePath)) {
    console.log('✅ Storage state already exists, skipping authentication setup');
    console.log('💾 Using existing: playwright/.auth/user.json\n');
    return;
  }

  try {
    // Ensure test user exists (should be done by global-setup, but double-check)
    await seedTestUser();

    const { baseURL } = config.projects[0].use;
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to NextAuth signin
    console.log('📧 Logging in as demo@bnbgest.com...');
    await page.goto(`${baseURL}/api/auth/signin`);

    // Wait for signin form
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });

    // Fill credentials
    await page.fill('input[name="email"]', 'demo@bnbgest.com');
    await page.fill('input[name="password"]', 'Demo1234!');

    // Submit and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);

    // Wait for admin page
    await page.waitForURL('**/admin', { timeout: 15000 });

    // Wait for sidebar to ensure full hydration
    await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 10000 });

    console.log('✅ Authentication successful!');

    // Save storage state (cookies + localStorage)
    await context.storageState({ path: 'playwright/.auth/user.json' });

    console.log('💾 Storage state saved to playwright/.auth/user.json');
    console.log('✅ Auth setup complete!\n');

    await browser.close();
  } catch (error) {
    console.error('❌ Auth setup failed:', error);
    throw error;
  }
}

export default globalAuthSetup;
