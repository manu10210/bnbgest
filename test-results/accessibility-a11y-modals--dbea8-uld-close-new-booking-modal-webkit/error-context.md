# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - BookingManager Modals >> ESC key should close new booking modal
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:59:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Réservations')

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import AxeBuilder from '@axe-core/playwright';
  3   | import { setupAuth } from '../../helpers/auth-helper';
  4   | 
  5   | /**
  6   |  * Tests d'accessibilité pour les modals (Sessions 13-15)
  7   |  * - ARIA attributes (role="dialog", aria-modal, aria-labelledby)
  8   |  * - Focus management (auto-focus, trap, restore)
  9   |  * - Keyboard navigation (ESC key, Tab)
  10  |  * - Form accessibility (aria-required, aria-invalid, htmlFor/id)
  11  |  */
  12  | 
  13  | test.describe('Accessibility - BookingManager Modals', () => {
  14  |   test.beforeEach(async ({ page }) => {
  15  |     await setupAuth(page);
  16  |     
  17  |     // Navigate to Réservations tab
> 18  |     await page.click('text=Réservations');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  19  |     await page.waitForTimeout(500);
  20  |   });
  21  | 
  22  |   test('New booking modal should have correct ARIA attributes', async ({ page }) => {
  23  |     // Click "Nouvelle Réservation" button
  24  |     await page.click('button:has-text("Nouvelle Réservation")');
  25  |     
  26  |     // Wait for modal to appear
  27  |     const modal = page.locator('[role="dialog"]');
  28  |     await expect(modal).toBeVisible();
  29  |     
  30  |     // Verify role="dialog"
  31  |     await expect(modal).toHaveAttribute('role', 'dialog');
  32  |     
  33  |     // Verify aria-modal="true"
  34  |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  35  |     
  36  |     // Verify aria-labelledby exists and points to title
  37  |     const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
  38  |     expect(ariaLabelledBy).toBeTruthy();
  39  |     
  40  |     if (ariaLabelledBy) {
  41  |       const titleElement = page.locator(`#${ariaLabelledBy}`);
  42  |       await expect(titleElement).toBeVisible();
  43  |     }
  44  |   });
  45  | 
  46  |   test('New booking modal should auto-focus on first input', async ({ page }) => {
  47  |     await page.click('button:has-text("Nouvelle Réservation")');
  48  |     
  49  |     // Wait for modal and focus useEffect (150ms delay)
  50  |     await page.waitForTimeout(200);
  51  |     
  52  |     // Verify first input is focused
  53  |     const modal = page.locator('[role="dialog"]');
  54  |     const firstInput = modal.locator('input').first();
  55  |     
  56  |     await expect(firstInput).toBeFocused();
  57  |   });
  58  | 
  59  |   test('ESC key should close new booking modal', async ({ page }) => {
  60  |     await page.click('button:has-text("Nouvelle Réservation")');
  61  |     
  62  |     // Verify modal open
  63  |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  64  |     
  65  |     // Press ESC
  66  |     await page.keyboard.press('Escape');
  67  |     
  68  |     // Verify modal closed
  69  |     await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  70  |   });
  71  | 
  72  |   test('New booking modal should have no axe violations', async ({ page }) => {
  73  |     await page.click('button:has-text("Nouvelle Réservation")');
  74  |     await page.waitForTimeout(300);
  75  |     
  76  |     // Run axe-core on modal only
  77  |     const accessibilityScanResults = await new AxeBuilder({ page })
  78  |       .include('[role="dialog"]')
  79  |       .analyze();
  80  |     
  81  |     expect(accessibilityScanResults.violations).toEqual([]);
  82  |   });
  83  | 
  84  |   test('Form inputs should have correct accessibility attributes', async ({ page }) => {
  85  |     await page.click('button:has-text("Nouvelle Réservation")');
  86  |     await page.waitForTimeout(300);
  87  |     
  88  |     const modal = page.locator('[role="dialog"]');
  89  |     
  90  |     // Get all input elements
  91  |     const inputs = await modal.locator('input, select, textarea').all();
  92  |     
  93  |     // Verify each input has proper labels
  94  |     for (const input of inputs) {
  95  |       // Get input id
  96  |       const inputId = await input.getAttribute('id');
  97  |       
  98  |       if (inputId) {
  99  |         // Find corresponding label
  100 |         const label = modal.locator(`label[for="${inputId}"]`);
  101 |         
  102 |         // Verify label exists (or input has aria-label)
  103 |         const hasLabel = await label.count() > 0;
  104 |         const hasAriaLabel = await input.getAttribute('aria-label');
  105 |         
  106 |         // One of them should exist
  107 |         expect(hasLabel || hasAriaLabel).toBeTruthy();
  108 |       }
  109 |     }
  110 |   });
  111 | 
  112 |   test('Required fields should have aria-required attribute', async ({ page }) => {
  113 |     await page.click('button:has-text("Nouvelle Réservation")');
  114 |     await page.waitForTimeout(300);
  115 |     
  116 |     const modal = page.locator('[role="dialog"]');
  117 |     
  118 |     // Get all required inputs (by checking for "required" or "*" in label)
```