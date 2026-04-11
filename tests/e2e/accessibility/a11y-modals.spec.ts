import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupAuth } from '../../helpers/auth-helper';

/**
 * Tests d'accessibilité pour les modals (Sessions 13-15)
 * - ARIA attributes (role="dialog", aria-modal, aria-labelledby)
 * - Focus management (auto-focus, trap, restore)
 * - Keyboard navigation (ESC key, Tab)
 * - Form accessibility (aria-required, aria-invalid, htmlFor/id)
 */

test.describe('Accessibility - BookingManager Modals', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    
    // Navigate to Réservations tab
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(1000);
  });

  test('New booking modal should have correct ARIA attributes', async ({ page }) => {
    // Click "Nouvelle Réservation" button
    await page.click('[data-testid="new-booking-button"]');
    
    // Wait for modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    // Verify role="dialog"
    await expect(modal).toHaveAttribute('role', 'dialog');
    
    // Verify aria-modal="true"
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    
    // Verify aria-labelledby exists and points to title
    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBeTruthy();
    
    if (ariaLabelledBy) {
      const titleElement = page.locator(`#${ariaLabelledBy}`);
      await expect(titleElement).toBeVisible();
    }
  });

  test('New booking modal should auto-focus on first input', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Wait for modal and focus useEffect (150ms delay)
    await page.waitForTimeout(200);
    
    // Verify first input is focused
    const modal = page.locator('[role="dialog"]');
    const firstInput = modal.locator('input').first();
    
    await expect(firstInput).toBeFocused();
  });

  test('ESC key should close new booking modal', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    
    // Verify modal open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Press ESC
    await page.keyboard.press('Escape');
    
    // Verify modal closed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('New booking modal should have no axe violations', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    await page.waitForTimeout(300);
    
    // Run axe-core on modal only
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form inputs should have correct accessibility attributes', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    await page.waitForTimeout(300);
    
    const modal = page.locator('[role="dialog"]');
    
    // Get all input elements
    const inputs = await modal.locator('input, select, textarea').all();
    
    // Verify each input has proper labels
    for (const input of inputs) {
      // Get input id
      const inputId = await input.getAttribute('id');
      
      if (inputId) {
        // Find corresponding label
        const label = modal.locator(`label[for="${inputId}"]`);
        
        // Verify label exists (or input has aria-label)
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = await input.getAttribute('aria-label');
        
        // One of them should exist
        expect(hasLabel || hasAriaLabel).toBeTruthy();
      }
    }
  });

  test('Required fields should have aria-required attribute', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Réservation")');
    await page.waitForTimeout(300);
    
    const modal = page.locator('[role="dialog"]');
    
    // Get all required inputs (by checking for "required" or "*" in label)
    const requiredInputs = await modal.locator('input[required], select[required]').all();
    
    // Verify aria-required on required fields
    for (const input of requiredInputs) {
      const ariaRequired = await input.getAttribute('aria-required');
      expect(ariaRequired).toBe('true');
    }
  });
});

test.describe('Accessibility - GuestManager Modals', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(1000);
  });

  test('New guest modal should have correct ARIA attributes', async ({ page }) => {
    await page.click('button:has-text("Nouveau Voyageur")');
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    
    const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBeTruthy();
  });

  test('New guest modal should auto-focus and close with ESC', async ({ page }) => {
    await page.click('button:has-text("Nouveau Voyageur")');
    await page.waitForTimeout(200);
    
    // Verify auto-focus
    const modal = page.locator('[role="dialog"]');
    const firstInput = modal.locator('input').first();
    await expect(firstInput).toBeFocused();
    
    // Close with ESC
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('New guest modal should have no axe violations', async ({ page }) => {
    await page.click('button:has-text("Nouveau Voyageur")');
    await page.waitForTimeout(300);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - MaintenanceManager Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.click('[data-testid="maintenance-tab"]');
    await page.waitForTimeout(1000);
  });

  test('New task modal should have correct ARIA attributes', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Tâche")');
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('New task modal should auto-focus and close with ESC', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Tâche")');
    await page.waitForTimeout(200);
    
    // Verify auto-focus
    const modal = page.locator('[role="dialog"]');
    const firstInput = modal.locator('input, select, textarea').first();
    await expect(firstInput).toBeFocused();
    
    // Close with ESC
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('New task modal should have no axe violations', async ({ page }) => {
    await page.click('button:has-text("Nouvelle Tâche")');
    await page.waitForTimeout(300);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Accessibility - InventoryManager Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.click('[data-testid="inventory-tab"]');
    await page.waitForTimeout(1000);
  });

  test('Add item modal should have correct ARIA attributes', async ({ page }) => {
    await page.click('button:has-text("Ajouter un Équipement")');
    
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  test('Add item modal should auto-focus and close with ESC', async ({ page }) => {
    await page.click('button:has-text("Ajouter un Équipement")');
    await page.waitForTimeout(200);
    
    const modal = page.locator('[role="dialog"]');
    const firstInput = modal.locator('input').first();
    await expect(firstInput).toBeFocused();
    
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});

test.describe('Accessibility - ContractGenerator Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.click('[data-testid="contract-tab"]');
    await page.waitForTimeout(1000);
  });

  test('Template modal should have correct ARIA attributes', async ({ page }) => {
    // Find button to open template modal (adjust selector based on actual implementation)
    const templateButton = page.locator('button:has-text("Modèle"), button:has-text("Template")').first();
    
    if (await templateButton.count() > 0) {
      await templateButton.click();
      
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-modal', 'true');
    }
  });
});

test.describe('Accessibility - Keyboard Navigation All Modals', () => {
  test('All modals should close with ESC key consistently', async ({ page }) => {
    await setupAuth(page);
    
    // Test cases: [tab data-testid, button data-testid]
    const modalTests: Array<[string, string]> = [
      ['bookings-tab', 'new-booking-button'],
      ['guests-tab', 'new-guest-button'],
      ['maintenance-tab', 'new-maintenance-button'],
      ['inventory-tab', 'add-inventory-button'],
    ];
    
    for (const [tabId, buttonId] of modalTests) {
      // Navigate to tab
      await page.click(`[data-testid="${tabId}"]`);
      await page.waitForTimeout(1000);
      
      // Open modal
      await page.click(`[data-testid="${buttonId}"]`);
      
      // Verify modal open
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });
      
      // Press ESC
      await page.keyboard.press('Escape');
      
      // Verify modal closed
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    }
  });

  test('All modals should auto-focus on first input consistently', async ({ page }) => {
    await setupAuth(page);
    
    const modalTests: Array<[string, string]> = [
      ['bookings-tab', 'new-booking-button'],
      ['guests-tab', 'new-guest-button'],
      ['maintenance-tab', 'new-maintenance-button'],
      ['inventory-tab', 'add-inventory-button'],
    ];

    for (const [tabId, buttonId] of modalTests) {
      await page.click(`[data-testid="${tabId}"]`);
      await page.waitForTimeout(1000);

      await page.click(`[data-testid="${buttonId}"]`);
      await page.waitForTimeout(200); // useEffect delay
      
      // Verify first focusable element is focused
      const modal = page.locator('[role="dialog"]');
      const firstFocusable = modal.locator('input, select, textarea, button').first();
      
      await expect(firstFocusable).toBeFocused();
      
      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Accessibility - Full Page Axe Scan', () => {
  test('Admin dashboard should have no axe violations', async ({ page }) => {
    await setupAuth(page);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Each tab should have no axe violations', async ({ page }) => {
    await setupAuth(page);
    
    const tabs = [
      'bookings-tab',
      'guests-tab',
      'maintenance-tab',
      'inventory-tab',
      'settings-tab',
    ];
    
    for (const tabId of tabs) {
      await page.click(`[data-testid="${tabId}"]`);
      await page.waitForTimeout(1500);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      // Log violations if any for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log(`Violations in ${tabId}:`, accessibilityScanResults.violations);
      }
      
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });
});
