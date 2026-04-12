import { test as base } from '@playwright/test';
import { login } from '../helpers/auth-helper';
import type { Page } from '@playwright/test';

/**
 * Extended Playwright test with automatic authentication
 * 
 * Usage:
 *   import { test, expect } from './fixtures/authenticated-test';
 *   
 *   test('my test', async ({ page }) => {
 *     // page is already authenticated!
 *     await page.goto('/admin');
 *   });
 */

type AuthenticatedTestFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthenticatedTestFixtures>({
  authenticatedPage: async ({ page }: { page: Page }, use) => {
    // Perform authentication before each test
    await login(page);
    
    // Use the authenticated page in the test
    await use(page);
    
    // Cleanup after test (if needed)
  },
});

// Re-export expect
export { expect } from '@playwright/test';
