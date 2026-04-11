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

  // Navigate to NextAuth signin page
  await page.goto('/api/auth/signin');
  
  // Wait for signin form to load
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  // Fill credentials
  await page.fill('input[name="email"]', loginEmail);
  await page.fill('input[name="password"]', loginPassword);
  
  // Submit form and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  
  // Wait for redirect to /admin
  await page.waitForURL('**/admin', { timeout: 15000 });
  
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
 * Session 19: With storage state, authentication is already done globally.
 * This function now just navigates to /admin and verifies auth works.
 * If storage state fails, falls back to manual login.
 */
export async function setupAuth(page: Page) {
  // Navigate to admin page (should be already authenticated via storage state)
  await page.goto('/admin');
  
  // Check if authentication works
  const isAuth = await isAuthenticated(page);
  
  if (!isAuth) {
    // Fallback: storage state failed, manual login required
    console.warn('⚠️  Storage state authentication failed, falling back to manual login...');
    await login(page);
  }
  
  // Wait for AdminSidebar to be fully rendered with data-testid
  await page.waitForSelector('[data-testid="admin-sidebar"]', { timeout: 10000 });
  
  // Wait for at least one tab to be present
  await page.waitForSelector('[data-testid="bookings-tab"]', { timeout: 5000 });
  
  // Reduced hydration wait (Session 19 optimization)
  await page.waitForTimeout(200);
  
  // Verify we're authenticated
  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    throw new Error('Failed to authenticate user');
  }
}
