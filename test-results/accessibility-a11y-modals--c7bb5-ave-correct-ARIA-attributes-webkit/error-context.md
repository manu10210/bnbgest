# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - GuestManager Modals >> New guest modal should have correct ARIA attributes
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:136:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid$="-tab"]') to be visible

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
  1  | import { Page } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Helper functions for authentication in Playwright tests
  5  |  * 
  6  |  * IMPORTANT: Ces tests utilisent l'environnement local.
  7  |  * Pour CI/CD, configurer TEST_USER_EMAIL et TEST_USER_PASSWORD dans secrets GitHub.
  8  |  */
  9  | 
  10 | export const testCredentials = {
  11 |   email: process.env.TEST_USER_EMAIL || 'demo@bnbgest.com',
  12 |   password: process.env.TEST_USER_PASSWORD || 'demo123',
  13 | };
  14 | 
  15 | /**
  16 |  * Login to the application
  17 |  * Handles the full login flow and waits for redirect to /admin
  18 |  */
  19 | export async function login(page: Page, email?: string, password?: string) {
  20 |   const loginEmail = email || testCredentials.email;
  21 |   const loginPassword = password || testCredentials.password;
  22 | 
  23 |   // Go to admin page (will redirect to login if not authenticated)
  24 |   await page.goto('/admin');
  25 |   
  26 |   // Check if we're on login page
  27 |   const isLoginPage = page.url().includes('login') || page.url().includes('signin') || page.url().includes('auth');
  28 |   
  29 |   if (isLoginPage || await page.locator('[name="email"]').count() > 0) {
  30 |     // Fill login form
  31 |     await page.fill('[name="email"]', loginEmail);
  32 |     await page.fill('[name="password"]', loginPassword);
  33 |     
  34 |     // Submit form
  35 |     await page.click('button[type="submit"]');
  36 |     
  37 |     // Wait for navigation to /admin
  38 |     await page.waitForURL(/\/admin/, { timeout: 10000 });
  39 |     
  40 |     // Wait for page to be fully loaded
  41 |     await page.waitForLoadState('networkidle');
  42 |   } else {
  43 |     // Already authenticated, just wait for load
  44 |     await page.waitForLoadState('networkidle');
  45 |   }
  46 | }
  47 | 
  48 | /**
  49 |  * Logout from the application
  50 |  */
  51 | export async function logout(page: Page) {
  52 |   // Look for logout button/link (adjust selector based on actual UI)
  53 |   const logoutButton = page.locator('[aria-label="Déconnexion"], button:has-text("Déconnexion"), a:has-text("Déconnexion")').first();
  54 |   
  55 |   if (await logoutButton.count() > 0) {
  56 |     await logoutButton.click();
  57 |     await page.waitForURL(/\/|login|signin/, { timeout: 5000 });
  58 |   }
  59 | }
  60 | 
  61 | /**
  62 |  * Check if user is authenticated
  63 |  */
  64 | export async function isAuthenticated(page: Page): Promise<boolean> {
  65 |   await page.goto('/admin');
  66 |   await page.waitForLoadState('networkidle');
  67 |   
  68 |   // Check if we're on /admin (authenticated) or login page (not authenticated)
  69 |   const currentUrl = page.url();
  70 |   return currentUrl.includes('/admin') && !currentUrl.includes('login') && !currentUrl.includes('signin');
  71 | }
  72 | 
  73 | /**
  74 |  * Setup authentication state for tests
  75 |  * This should be called in test.beforeAll or test.beforeEach
  76 |  */
  77 | export async function setupAuth(page: Page) {
  78 |   await login(page);
  79 |   
  80 |   // Verify we're authenticated
  81 |   const authenticated = await isAuthenticated(page);
  82 |   if (!authenticated) {
  83 |     throw new Error('Failed to authenticate user');
  84 |   }
  85 |   
  86 |   // Wait for AdminSidebar to be fully rendered
  87 |   // Verify that at least one tab button is present
> 88 |   await page.waitForSelector('[data-testid$="-tab"]', { timeout: 10000 });
     |              ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  89 |   
  90 |   // Additional wait for React hydration
  91 |   await page.waitForTimeout(500);
  92 | }
  93 | 
```