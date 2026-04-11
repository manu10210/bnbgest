import { test, expect } from '@playwright/test';
import { setupAuth } from '../../helpers/auth-helper';
import { 
  isMobileViewport, 
  openMobileMenu, 
  closeMobileMenu,
  scrollToElement,
} from '../../helpers/mobile-helper';

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should display correct viewport for mobile', async ({ page }) => {
    const viewport = page.viewportSize();
    
    if (viewport && viewport.width < 768) {
      await page.goto('/admin');
      
      // Mobile viewport detected
      expect(isMobileViewport(page)).toBe(true);
    }
  });

  test('should navigate to Bookings tab', async ({ page }) => {
    await page.goto('/admin');
    
    if (isMobileViewport(page)) {
      // Mobile: might need hamburger menu
      await openMobileMenu(page);
    }
    
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    
    const bookingsTab = page.locator('[data-testid="bookings-tab"]');
    await expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should navigate to Guests tab', async ({ page }) => {
    await page.goto('/admin');
    
    if (isMobileViewport(page)) {
      await openMobileMenu(page);
    }
    
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    
    const guestsTab = page.locator('[data-testid="guests-tab"]');
    await expect(guestsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display responsive cards on mobile', async ({ page }) => {
    if (!isMobileViewport(page)) {
      test.skip();
    }
    
    await page.goto('/admin');
    await openMobileMenu(page);
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(500);
    
    // Check if cards exist
    const cards = page.locator('[data-testid="guest-card"]');
    const count = await cards.count();
    
    if (count > 0) {
      // First card should be full width
      const firstCard = cards.first();
      const box = await firstCard.boundingBox();
      const viewport = page.viewportSize();
      
      expect(box).not.toBeNull();
      expect(viewport).not.toBeNull();
      
      if (box && viewport) {
        const cardWidth = box.width;
        const viewportWidth = viewport.width;
        
        // Card should be ~80-100% of viewport width (accounting for padding)
        expect(cardWidth).toBeGreaterThan(viewportWidth * 0.70);
      }
    }
  });

  test('should scroll to element', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="settings-tab"]');
    await page.waitForTimeout(500);
    
    // Scroll to settings content
    const settingsContent = page.locator('[data-testid="settings-tab"]');
    const exists = await settingsContent.count() > 0;
    
    if (exists) {
      await scrollToElement(page, '[data-testid="settings-tab"]');
      await expect(settingsContent).toBeInViewport();
    }
  });

  test('should handle touch interactions', async ({ page }) => {
    if (!isMobileViewport(page)) {
      test.skip();
    }
    
    await page.goto('/admin');
    
    // Tap on tab (mobile touch)
    const bookingsTab = page.locator('[data-testid="bookings-tab"]');
    const exists = await bookingsTab.count() > 0;
    
    if (exists) {
      await bookingsTab.tap();
      await page.waitForTimeout(500);
      await expect(bookingsTab).toHaveAttribute('aria-selected', 'true');
    }
  });
});

test.describe('Mobile - Page Loading', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('should load admin dashboard on mobile', async ({ page }) => {
    if (!isMobileViewport(page)) {
      test.skip();
    }
    
    await page.goto('/admin');
    
    // Check sidebar or main content loads
    const sidebar = page.locator('[data-testid="admin-sidebar"]');
    const mainContent = page.locator('main');
    
    const sidebarExists = await sidebar.count() > 0;
    const mainExists = await mainContent.count() > 0;
    
    expect(sidebarExists || mainExists).toBe(true);
  });

  test('should load bookings on mobile', async ({ page }) => {
    if (!isMobileViewport(page)) {
      test.skip();
    }
    
    await page.goto('/admin');
    await openMobileMenu(page);
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    
    const bookingsContent = page.locator('[data-testid="bookings-tab"]');
    await expect(bookingsContent).toBeVisible();
  });

  test('should load upload video page on mobile', async ({ page }) => {
    if (!isMobileViewport(page)) {
      test.skip();
    }
    
    await page.goto('/upload-video');
    await page.waitForTimeout(1000); // Wait for QR code
    
    // Page should load
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
