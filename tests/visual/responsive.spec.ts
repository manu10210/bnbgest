import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot } from '../helpers/screenshot-helper';

const breakpoints = [
  { name: 'mobile-sm', width: 375, height: 667 },   // iPhone SE
  { name: 'mobile-md', width: 390, height: 844 },   // iPhone 12
  { name: 'mobile-lg', width: 414, height: 896 },   // iPhone 12 Pro Max
  { name: 'tablet-sm', width: 768, height: 1024 },  // iPad Mini
  { name: 'tablet-lg', width: 1024, height: 1366 }, // iPad Pro
  { name: 'desktop-sm', width: 1280, height: 800 }, // Laptop
  { name: 'desktop-md', width: 1440, height: 900 }, // Desktop
  { name: 'desktop-lg', width: 1920, height: 1080 }, // Full HD
];

test.describe('Responsive Design - All Breakpoints', () => {
  for (const breakpoint of breakpoints) {
    test(`Dashboard at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await setupAuth(page);
      await page.goto('/admin');
      await page.waitForTimeout(500);
      
      await takeScreenshot(page, `dashboard-${breakpoint.name}`, {
        mask: ['[data-testid="current-time"]', '[data-testid="live-stats"]'],
      });
    });
  }
});

test.describe('Responsive Design - Orientation', () => {
  test('Mobile landscape - Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape
    
    await setupAuth(page);
    await page.goto('/admin');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'dashboard-landscape', {
      mask: ['[data-testid="current-time"]'],
    });
  });

  test('Tablet portrait - Bookings', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad portrait
    
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'bookings-tablet-portrait');
  });

  test('Tablet landscape - Guests', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 }); // iPad landscape
    
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'guests-tablet-landscape');
  });
});

test.describe('Responsive Design - Key Pages', () => {
  test('Bookings - Mobile vs Desktop', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'bookings-mobile');
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'bookings-desktop');
  });

  test('Guests - Mobile vs Desktop', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'guests-mobile');
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'guests-desktop');
  });

  test('Settings - Mobile vs Desktop', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await setupAuth(page);
    await page.goto('/admin');
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'settings-mobile', {
      mask: ['[data-testid="api-key"]'],
    });
    
    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'settings-desktop', {
      mask: ['[data-testid="api-key"]'],
    });
  });
});
