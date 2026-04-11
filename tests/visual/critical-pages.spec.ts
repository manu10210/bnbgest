import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeScreenshot, takeElementScreenshot } from '../helpers/screenshot-helper';

test.describe('Visual Regression - Critical Pages', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Admin Dashboard - Above the fold', async ({ page }) => {
    await page.goto('/admin');
    
    await takeScreenshot(page, 'dashboard-atf', {
      clip: { x: 0, y: 0, width: 1280, height: 800 },
      mask: [
        '[data-testid="current-time"]',
        '[data-testid="live-stats"]',
      ],
    });
  });

  test('Bookings - Calendar view (if exists)', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    
    // Check if calendar view exists
    const calendarButton = page.locator('[data-testid="calendar-view"]');
    const exists = await calendarButton.count() > 0;
    
    if (exists) {
      await calendarButton.click();
      await page.waitForTimeout(500);
      
      const calendar = page.locator('[data-testid="calendar-component"]');
      const calendarExists = await calendar.count() > 0;
      
      if (calendarExists) {
        await takeElementScreenshot(page, '[data-testid="calendar-component"]', 'bookings-calendar');
      }
    }
  });

  test('Guest Profile - Card', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    
    // Check if guest cards exist
    const guestCards = page.locator('[data-testid="guest-card"]');
    const count = await guestCards.count();
    
    if (count > 0) {
      await takeElementScreenshot(page, '[data-testid="guest-card"]', 'guest-card');
    }
  });

  test('Maintenance - Task card', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="maintenance-tab"]');
    await page.waitForTimeout(500);
    
    const maintenanceCards = page.locator('[data-testid="maintenance-card"]');
    const count = await maintenanceCards.count();
    
    if (count > 0) {
      await takeElementScreenshot(page, '[data-testid="maintenance-card"]', 'maintenance-card');
    }
  });

  test('Inventory - Item card', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="inventory-tab"]');
    await page.waitForTimeout(500);
    
    const inventoryCards = page.locator('[data-testid="inventory-card"]');
    const count = await inventoryCards.count();
    
    if (count > 0) {
      await takeElementScreenshot(page, '[data-testid="inventory-card"]', 'inventory-card');
    }
  });

  test('Review - Rating card', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="reviews-tab"]');
    await page.waitForTimeout(500);
    
    const reviewCards = page.locator('[data-testid="review-card"]');
    const count = await reviewCards.count();
    
    if (count > 0) {
      await takeElementScreenshot(page, '[data-testid="review-card"]', 'review-card');
    }
  });

  test('Settings - Payment configuration', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);
    
    await takeScreenshot(page, 'settings-full', {
      fullPage: true,
      mask: ['[data-testid="stripe-key"]', '[data-testid="api-key"]'],
    });
  });

  test('Upload Video - QR Code page', async ({ page }) => {
    await page.goto('/upload-video');
    await page.waitForTimeout(1000); // Wait for QR code generation
    
    await takeScreenshot(page, 'upload-video-qr', {
      fullPage: true,
    });
  });
});
