import { Page } from '@playwright/test';

/**
 * Helper functions for authentication in Playwright tests
 * 
 * Session 19: Storage state optimization
 * - Tests now reuse authenticated session (no repeated logins)
 * - setupAuth() simplified (just verification, login already done)
 * - Fallback to manual login if storage state fails
 * 
 * IMPORTANT: Ces tests utilisent l'environnement local.
 * Pour CI/CD, configurer TEST_USER_EMAIL et TEST_USER_PASSWORD dans secrets GitHub.
 */

export const testCredentials = {
  email: process.env.TEST_USER_EMAIL || 'demo@bnbgest.com',
  password: process.env.TEST_USER_PASSWORD || 'Demo1234!',
};

/**
 * Login to the application using NextAuth
 * Handles the full login flow and waits for redirect to /admin
 */
export async function login(page: Page, email?: string, password?: string) {
  const loginEmail = email || testCredentials.email;
  const loginPassword = password || testCredentials.password;

  // Navigate to login page directly
  await page.goto('http://localhost:3000/login');
  
  // Wait for login form to load
  await page.waitForSelector('#email', { timeout: 10000 });
  
  // Fill credentials
  await page.fill('#email', loginEmail);
  await page.fill('#password', loginPassword);
  
  // Submit and wait for redirect
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin**', { timeout: 20000 });
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Navigate to NextAuth signout page
  await page.goto('/api/auth/signout');
  
  // Wait for signout form
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Click signout button
  await page.click('form button');
  
  // Wait for redirect to home
  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const url = page.url();
    
    // Must be on /admin URL
    if (!url.includes('/admin')) {
      return false;
    }
    
    // Wait for AdminSidebar to be present
    await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 5000 });
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Setup authentication state for tests
 * 
 * Session 20: Temporary workaround - always login manually
 * TODO: Fix storage state generation issue
 */
export async function setupAuth(page: Page) {
  // Always do manual login for now
  console.log('🔐 Logging in...');
  await login(page);
  
  console.log('✅ Login complete, waiting for sidebar...');
  
  // Give the page a moment to hydrate
  await page.waitForTimeout(1000);
  
  // Wait for AdminSidebar to be fully rendered
  await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 15000 });
  
  console.log('✅ Sidebar found!');
  
  // Wait for at least one tab to be present
  await page.waitForSelector('[data-testid="bookings-tab"]', { timeout: 10000 });
  
  console.log('✅ Tabs loaded!');
  
  // Small hydration wait
  await page.waitForTimeout(200);
  
  // Verify we're authenticated
  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    throw new Error('Failed to authenticate user');
  }
  
  console.log('✅ Authenticated successfully');
}
