import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Tests d'accessibilité pour la navigation (Session 16)
 * - Skip link (WCAG 2.4.1)
 * - Landmarks (WCAG 1.3.1)
 * - Breadcrumbs (WCAG 2.4.8)
 * - Focus visible (WCAG 2.4.7)
 */

test.describe('Accessibility - Navigation Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur page admin (nécessite auth)
    await page.goto('/admin');
  });

  test('Skip link should be functional and keyboard accessible', async ({ page }) => {
    // Recharger pour reset focus
    await page.reload();
    
    // Press Tab to focus skip link (first focusable element)
    await page.keyboard.press('Tab');
    
    // Verify skip link is visible
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveText('Aller au contenu principal');
    
    // Verify skip link has correct href
    await expect(skipLink).toHaveAttribute('href', '#main-content');
    
    // Verify skip link has aria-label
    await expect(skipLink).toHaveAttribute('aria-label', 'Aller au contenu principal');
    
    // Press Enter to activate skip link
    await page.keyboard.press('Enter');
    
    // Verify URL has hash
    await expect(page).toHaveURL(/.*#main-content/);
  });

  test('Main landmark should exist with correct attributes', async ({ page }) => {
    // Verify main element exists
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeVisible();
    
    // Verify main has role="main"
    await expect(mainContent).toHaveAttribute('role', 'main');
    
    // Verify main has id="main-content" (skip link target)
    await expect(mainContent).toHaveAttribute('id', 'main-content');
  });

  test('Header banner should exist with correct role', async ({ page }) => {
    // Verify header element exists
    const header = page.locator('header[role="banner"]');
    await expect(header).toBeVisible();
    
    // Verify header has role="banner"
    await expect(header).toHaveAttribute('role', 'banner');
  });

  test('Breadcrumbs navigation should have correct ARIA', async ({ page }) => {
    // Verify breadcrumbs nav exists
    const breadcrumbNav = page.locator('nav[aria-label="Fil d\'Ariane"]');
    await expect(breadcrumbNav).toBeVisible();
    
    // Verify nav has aria-label
    await expect(breadcrumbNav).toHaveAttribute('aria-label', 'Fil d\'Ariane');
    
    // Verify ordered list structure
    const breadcrumbList = breadcrumbNav.locator('ol');
    await expect(breadcrumbList).toBeVisible();
    
    // Verify home link exists
    const homeLink = breadcrumbNav.locator('a[href="/admin"]');
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveText('Accueil');
    
    // Verify current page has aria-current="page"
    const currentPage = breadcrumbNav.locator('[aria-current="page"]');
    await expect(currentPage).toBeVisible();
  });

  test('Breadcrumbs should update dynamically on tab change', async ({ page }) => {
    // Default tab: Tableau de bord
    let currentPage = page.locator('[aria-current="page"]');
    await expect(currentPage).toContainText('Tableau de bord');
    
    // Click "Réservations" tab
    await page.click('text=Réservations');
    
    // Verify breadcrumb updated
    currentPage = page.locator('[aria-current="page"]');
    await expect(currentPage).toContainText('Réservations');
    
    // Click "Voyageurs" tab
    await page.click('text=Voyageurs');
    
    // Verify breadcrumb updated again
    currentPage = page.locator('[aria-current="page"]');
    await expect(currentPage).toContainText('Voyageurs');
  });

  test('Focus visible CSS should be applied on keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // Next element
    
    // Get focused element
    const focusedElement = await page.locator(':focus-visible');
    
    // Verify focus-visible is active
    await expect(focusedElement).toBeVisible();
    
    // Verify outline exists (CSS applied)
    const outlineColor = await focusedElement.evaluate((el) => {
      return window.getComputedStyle(el).outlineColor;
    });
    
    // Verify outline is not "none" (should be rgb color)
    expect(outlineColor).not.toBe('none');
  });

  test('Page should have all semantic landmarks', async ({ page }) => {
    // Verify main landmark
    await expect(page.locator('main[role="main"]')).toBeVisible();
    
    // Verify banner landmark
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    
    // Verify navigation landmark (breadcrumbs)
    await expect(page.locator('nav[aria-label="Fil d\'Ariane"]')).toBeVisible();
  });

  test('Page should have no axe accessibility violations', async ({ page }) => {
    // Run full page scan with axe-core
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    // Verify no violations
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Navigation landmarks should be accessible to screen readers', async ({ page }) => {
    // Get all landmarks
    const landmarks = await page.locator('[role="banner"], [role="main"], nav[aria-label]').all();
    
    // Verify at least 3 landmarks (banner, main, breadcrumbs nav)
    expect(landmarks.length).toBeGreaterThanOrEqual(3);
    
    // Verify all landmarks are visible
    for (const landmark of landmarks) {
      await expect(landmark).toBeVisible();
    }
  });
});

test.describe('Accessibility - Dark Mode Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('Skip link should adapt to dark mode', async ({ page }) => {
    // Toggle dark mode
    const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
    await themeToggle.click();
    
    // Wait for theme change
    await page.waitForTimeout(300);
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    
    // Verify skip link visible in dark mode
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeVisible();
    
    // Verify dark mode class applied to body/html
    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') || 
             document.body.classList.contains('dark');
    });
    
    if (isDarkMode) {
      // Verify outline color adapted (should be #FF385C in dark mode)
      const outlineColor = await skipLink.evaluate((el) => {
        return window.getComputedStyle(el).outlineColor;
      });
      
      // Outline should exist
      expect(outlineColor).not.toBe('none');
    }
  });

  test('Focus visible should use accent color in dark mode', async ({ page }) => {
    // Toggle dark mode
    const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
    await themeToggle.click();
    
    await page.waitForTimeout(300);
    
    // Focus on interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.locator(':focus-visible');
    
    // Verify element is focused
    await expect(focusedElement).toBeVisible();
    
    // Verify dark mode class
    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') || 
             document.body.classList.contains('dark');
    });
    
    expect(isDarkMode).toBeTruthy();
  });
});
