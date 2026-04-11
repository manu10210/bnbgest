import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot } from '../helpers/screenshot-helper';

test.describe('Visual Regression - Main Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Dashboard - Full page', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-full', {
      fullPage: true,
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="live-revenue"]',
        '[data-testid="live-stats"]',
      ],
    });
  });

  test('Dashboard - Hero section', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-hero', {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="live-stats"]',
      ],
    });
  });

  test('Bookings - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500); // Wait for tab content
    
    await takeScreenshot(page, 'bookings-list', {
      mask: ['[data-testid="booking-date"]'],
    });
  });

  test('Guests - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'guests-cards');
  });

  test('Maintenance - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="maintenance-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'maintenance-list');
  });

  test('Inventory - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="inventory-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'inventory-grid');
  });

  test('Reviews - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="reviews-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'reviews-list');
  });

  test('Settings - Tab view', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'settings-general');
  });
});
