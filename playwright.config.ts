import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour tests E2E BnBGest
 * See https://playwright.dev/docs/test-configuration
 * 
 * Session 19 Optimizations:
 * - Storage state for auth reuse (no repeated logins)
 * - 3 workers (parallel by browser, sequential within)
 * - Reduced motion for faster animations
 * - Optimized timeouts
 * 
 * Session 20 Additions:
 * - Visual regression testing (screenshots)
 * - Mobile device testing (Pixel 5, iPhone 12, iPad)
 * - Snapshot comparison settings
 */
export default defineConfig({
  testDir: './tests',
  
  /* Global setup temporarily disabled for Session 20 troubleshooting */
  // globalSetup: require.resolve('./tests/auth-setup.ts'),
  
  /* Run tests sequentially WITHIN each browser project to avoid DB conflicts */
  fullyParallel: false,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* 3 workers: one per browser (parallel browsers, sequential within) */
  workers: 3,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:3000',
    
    /* Collect trace only on failure to save disk space */
    trace: 'retain-on-failure',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Optimized timeouts (Session 19) */
    actionTimeout: 5000,        // Reduced from 10s
    navigationTimeout: 15000,   // Reduced from 30s
  },

  /* Session 20: Visual regression snapshot settings */
  expect: {
    toMatchSnapshot: {
      maxDiffPixels: 100,        // Allow 100 pixels difference
      maxDiffPixelRatio: 0.01,   // Allow 1% difference
      threshold: 0.2,            // Color threshold (0-1)
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
        /* Reduce animations for faster tests (Session 19) */
        colorScheme: 'light',
        /* Headless mode disabled for Session 20 troubleshooting */
        headless: false,
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
        /* Reduce animations for faster tests (Session 19) */
        colorScheme: 'light',
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
        /* Reduce animations for faster tests (Session 19) */
        colorScheme: 'light',
      },
    },

    /* Session 20: Mobile device testing */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
      },
    },
    {
      name: 'Tablet',
      use: { 
        ...devices['iPad (gen 7)'],
        /* Storage state temporarily disabled for Session 20 troubleshooting */
        // storageState: 'playwright/.auth/user.json',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
