import { Page } from '@playwright/test';

/**
 * Helper functions for authentication in Playwright tests
 * 
 * IMPORTANT: Ces tests utilisent l'environnement local.
 * Pour CI/CD, configurer TEST_USER_EMAIL et TEST_USER_PASSWORD dans secrets GitHub.
 */

export const testCredentials = {
  email: process.env.TEST_USER_EMAIL || 'demo@bnbgest.com',
  password: process.env.TEST_USER_PASSWORD || 'demo123',
};

/**
 * Login to the application
 * Handles the full login flow and waits for redirect to /admin
 */
export async function login(page: Page, email?: string, password?: string) {
  const loginEmail = email || testCredentials.email;
  const loginPassword = password || testCredentials.password;

  // Go to admin page (will redirect to login if not authenticated)
  await page.goto('/admin');
  
  // Check if we're on login page
  const isLoginPage = page.url().includes('login') || page.url().includes('signin') || page.url().includes('auth');
  
  if (isLoginPage || await page.locator('[name="email"]').count() > 0) {
    // Fill login form
    await page.fill('[name="email"]', loginEmail);
    await page.fill('[name="password"]', loginPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to /admin
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  } else {
    // Already authenticated, just wait for load
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Look for logout button/link (adjust selector based on actual UI)
  const logoutButton = page.locator('[aria-label="Déconnexion"], button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();
  
  if (await logoutButton.count() > 0) {
    await logoutButton.click();
    await page.waitForURL(/\/|login|signin/, { timeout: 5000 });
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  
  // Check if we're on /admin (authenticated) or login page (not authenticated)
  const currentUrl = page.url();
  return currentUrl.includes('/admin') && !currentUrl.includes('login') && !currentUrl.includes('signin');
}

/**
 * Setup authentication state for tests
 * This should be called in test.beforeAll or test.beforeEach
 */
export async function setupAuth(page: Page) {
  await login(page);
  
  // Verify we're authenticated
  const authenticated = await isAuthenticated(page);
  if (!authenticated) {
    throw new Error('Failed to authenticate user');
  }
}
