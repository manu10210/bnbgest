# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-navigation.spec.ts >> Accessibility - Navigation Structure >> Skip link should be functional and keyboard accessible
- Location: tests\e2e\accessibility\a11y-navigation.spec.ts:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.skip-link')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.skip-link')

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
  5   |  * Tests d'accessibilité pour la navigation (Session 16)
  6   |  * - Skip link (WCAG 2.4.1)
  7   |  * - Landmarks (WCAG 1.3.1)
  8   |  * - Breadcrumbs (WCAG 2.4.8)
  9   |  * - Focus visible (WCAG 2.4.7)
  10  |  */
  11  | 
  12  | test.describe('Accessibility - Navigation Structure', () => {
  13  |   test.beforeEach(async ({ page }) => {
  14  |     // Aller sur page admin (nécessite auth)
  15  |     await page.goto('/admin');
  16  |   });
  17  | 
  18  |   test('Skip link should be functional and keyboard accessible', async ({ page }) => {
  19  |     // Recharger pour reset focus
  20  |     await page.reload();
  21  |     
  22  |     // Press Tab to focus skip link (first focusable element)
  23  |     await page.keyboard.press('Tab');
  24  |     
  25  |     // Verify skip link is visible
  26  |     const skipLink = page.locator('.skip-link');
> 27  |     await expect(skipLink).toBeVisible();
      |                            ^ Error: expect(locator).toBeVisible() failed
  28  |     await expect(skipLink).toHaveText('Aller au contenu principal');
  29  |     
  30  |     // Verify skip link has correct href
  31  |     await expect(skipLink).toHaveAttribute('href', '#main-content');
  32  |     
  33  |     // Verify skip link has aria-label
  34  |     await expect(skipLink).toHaveAttribute('aria-label', 'Aller au contenu principal');
  35  |     
  36  |     // Press Enter to activate skip link
  37  |     await page.keyboard.press('Enter');
  38  |     
  39  |     // Verify URL has hash
  40  |     await expect(page).toHaveURL(/.*#main-content/);
  41  |   });
  42  | 
  43  |   test('Main landmark should exist with correct attributes', async ({ page }) => {
  44  |     // Verify main element exists
  45  |     const mainContent = page.locator('main#main-content');
  46  |     await expect(mainContent).toBeVisible();
  47  |     
  48  |     // Verify main has role="main"
  49  |     await expect(mainContent).toHaveAttribute('role', 'main');
  50  |     
  51  |     // Verify main has id="main-content" (skip link target)
  52  |     await expect(mainContent).toHaveAttribute('id', 'main-content');
  53  |   });
  54  | 
  55  |   test('Header banner should exist with correct role', async ({ page }) => {
  56  |     // Verify header element exists
  57  |     const header = page.locator('header[role="banner"]');
  58  |     await expect(header).toBeVisible();
  59  |     
  60  |     // Verify header has role="banner"
  61  |     await expect(header).toHaveAttribute('role', 'banner');
  62  |   });
  63  | 
  64  |   test('Breadcrumbs navigation should have correct ARIA', async ({ page }) => {
  65  |     // Verify breadcrumbs nav exists
  66  |     const breadcrumbNav = page.locator('nav[aria-label="Fil d\'Ariane"]');
  67  |     await expect(breadcrumbNav).toBeVisible();
  68  |     
  69  |     // Verify nav has aria-label
  70  |     await expect(breadcrumbNav).toHaveAttribute('aria-label', 'Fil d\'Ariane');
  71  |     
  72  |     // Verify ordered list structure
  73  |     const breadcrumbList = breadcrumbNav.locator('ol');
  74  |     await expect(breadcrumbList).toBeVisible();
  75  |     
  76  |     // Verify home link exists
  77  |     const homeLink = breadcrumbNav.locator('a[href="/admin"]');
  78  |     await expect(homeLink).toBeVisible();
  79  |     await expect(homeLink).toHaveText('Accueil');
  80  |     
  81  |     // Verify current page has aria-current="page"
  82  |     const currentPage = breadcrumbNav.locator('[aria-current="page"]');
  83  |     await expect(currentPage).toBeVisible();
  84  |   });
  85  | 
  86  |   test('Breadcrumbs should update dynamically on tab change', async ({ page }) => {
  87  |     // Default tab: Tableau de bord
  88  |     let currentPage = page.locator('[aria-current="page"]');
  89  |     await expect(currentPage).toContainText('Tableau de bord');
  90  |     
  91  |     // Click "Réservations" tab
  92  |     await page.click('text=Réservations');
  93  |     
  94  |     // Verify breadcrumb updated
  95  |     currentPage = page.locator('[aria-current="page"]');
  96  |     await expect(currentPage).toContainText('Réservations');
  97  |     
  98  |     // Click "Voyageurs" tab
  99  |     await page.click('text=Voyageurs');
  100 |     
  101 |     // Verify breadcrumb updated again
  102 |     currentPage = page.locator('[aria-current="page"]');
  103 |     await expect(currentPage).toContainText('Voyageurs');
  104 |   });
  105 | 
  106 |   test('Focus visible CSS should be applied on keyboard navigation', async ({ page }) => {
  107 |     // Tab through interactive elements
  108 |     await page.keyboard.press('Tab'); // Skip link
  109 |     await page.keyboard.press('Tab'); // Next element
  110 |     
  111 |     // Get focused element
  112 |     const focusedElement = await page.locator(':focus-visible');
  113 |     
  114 |     // Verify focus-visible is active
  115 |     await expect(focusedElement).toBeVisible();
  116 |     
  117 |     // Verify outline exists (CSS applied)
  118 |     const outlineColor = await focusedElement.evaluate((el) => {
  119 |       return window.getComputedStyle(el).outlineColor;
  120 |     });
  121 |     
  122 |     // Verify outline is not "none" (should be rgb color)
  123 |     expect(outlineColor).not.toBe('none');
  124 |   });
  125 | 
  126 |   test('Page should have all semantic landmarks', async ({ page }) => {
  127 |     // Verify main landmark
```