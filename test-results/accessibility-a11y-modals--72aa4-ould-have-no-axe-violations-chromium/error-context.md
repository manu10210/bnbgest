# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - BookingManager Modals >> New booking modal should have no axe violations
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:71:7

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
  3   | 
  4   | /**
  5   |  * Tests d'accessibilité pour les modals (Sessions 13-15)
  6   |  * - ARIA attributes (role="dialog", aria-modal, aria-labelledby)
  7   |  * - Focus management (auto-focus, trap, restore)
  8   |  * - Keyboard navigation (ESC key, Tab)
  9   |  * - Form accessibility (aria-required, aria-invalid, htmlFor/id)
  10  |  */
  11  | 
  12  | test.describe('Accessibility - BookingManager Modals', () => {
  13  |   test.beforeEach(async ({ page }) => {
  14  |     await page.goto('/admin');
  15  |     
  16  |     // Navigate to Réservations tab
> 17  |     await page.click('text=Réservations');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  18  |     await page.waitForTimeout(500);
  19  |   });
  20  | 
  21  |   test('New booking modal should have correct ARIA attributes', async ({ page }) => {
  22  |     // Click "Nouvelle Réservation" button
  23  |     await page.click('button:has-text("Nouvelle Réservation")');
  24  |     
  25  |     // Wait for modal to appear
  26  |     const modal = page.locator('[role="dialog"]');
  27  |     await expect(modal).toBeVisible();
  28  |     
  29  |     // Verify role="dialog"
  30  |     await expect(modal).toHaveAttribute('role', 'dialog');
  31  |     
  32  |     // Verify aria-modal="true"
  33  |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  34  |     
  35  |     // Verify aria-labelledby exists and points to title
  36  |     const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
  37  |     expect(ariaLabelledBy).toBeTruthy();
  38  |     
  39  |     if (ariaLabelledBy) {
  40  |       const titleElement = page.locator(`#${ariaLabelledBy}`);
  41  |       await expect(titleElement).toBeVisible();
  42  |     }
  43  |   });
  44  | 
  45  |   test('New booking modal should auto-focus on first input', async ({ page }) => {
  46  |     await page.click('button:has-text("Nouvelle Réservation")');
  47  |     
  48  |     // Wait for modal and focus useEffect (150ms delay)
  49  |     await page.waitForTimeout(200);
  50  |     
  51  |     // Verify first input is focused
  52  |     const modal = page.locator('[role="dialog"]');
  53  |     const firstInput = modal.locator('input').first();
  54  |     
  55  |     await expect(firstInput).toBeFocused();
  56  |   });
  57  | 
  58  |   test('ESC key should close new booking modal', async ({ page }) => {
  59  |     await page.click('button:has-text("Nouvelle Réservation")');
  60  |     
  61  |     // Verify modal open
  62  |     await expect(page.locator('[role="dialog"]')).toBeVisible();
  63  |     
  64  |     // Press ESC
  65  |     await page.keyboard.press('Escape');
  66  |     
  67  |     // Verify modal closed
  68  |     await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  69  |   });
  70  | 
  71  |   test('New booking modal should have no axe violations', async ({ page }) => {
  72  |     await page.click('button:has-text("Nouvelle Réservation")');
  73  |     await page.waitForTimeout(300);
  74  |     
  75  |     // Run axe-core on modal only
  76  |     const accessibilityScanResults = await new AxeBuilder({ page })
  77  |       .include('[role="dialog"]')
  78  |       .analyze();
  79  |     
  80  |     expect(accessibilityScanResults.violations).toEqual([]);
  81  |   });
  82  | 
  83  |   test('Form inputs should have correct accessibility attributes', async ({ page }) => {
  84  |     await page.click('button:has-text("Nouvelle Réservation")');
  85  |     await page.waitForTimeout(300);
  86  |     
  87  |     const modal = page.locator('[role="dialog"]');
  88  |     
  89  |     // Get all input elements
  90  |     const inputs = await modal.locator('input, select, textarea').all();
  91  |     
  92  |     // Verify each input has proper labels
  93  |     for (const input of inputs) {
  94  |       // Get input id
  95  |       const inputId = await input.getAttribute('id');
  96  |       
  97  |       if (inputId) {
  98  |         // Find corresponding label
  99  |         const label = modal.locator(`label[for="${inputId}"]`);
  100 |         
  101 |         // Verify label exists (or input has aria-label)
  102 |         const hasLabel = await label.count() > 0;
  103 |         const hasAriaLabel = await input.getAttribute('aria-label');
  104 |         
  105 |         // One of them should exist
  106 |         expect(hasLabel || hasAriaLabel).toBeTruthy();
  107 |       }
  108 |     }
  109 |   });
  110 | 
  111 |   test('Required fields should have aria-required attribute', async ({ page }) => {
  112 |     await page.click('button:has-text("Nouvelle Réservation")');
  113 |     await page.waitForTimeout(300);
  114 |     
  115 |     const modal = page.locator('[role="dialog"]');
  116 |     
  117 |     // Get all required inputs (by checking for "required" or "*" in label)
```