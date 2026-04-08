# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-navigation.spec.ts >> Accessibility - Navigation Structure >> Header banner should exist with correct role
- Location: tests\e2e\accessibility\a11y-navigation.spec.ts:56:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header[role="banner"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('header[role="banner"]')

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
  6   |  * Tests d'accessibilité pour la navigation (Session 16)
  7   |  * - Skip link (WCAG 2.4.1)
  8   |  * - Landmarks (WCAG 1.3.1)
  9   |  * - Breadcrumbs (WCAG 2.4.8)
  10  |  * - Focus visible (WCAG 2.4.7)
  11  |  */
  12  | 
  13  | test.describe('Accessibility - Navigation Structure', () => {
  14  |   test.beforeEach(async ({ page }) => {
  15  |     // Authenticate and go to admin page
  16  |     await setupAuth(page);
  17  |   });
  18  | 
  19  |   test('Skip link should be functional and keyboard accessible', async ({ page }) => {
  20  |     // Recharger pour reset focus
  21  |     await page.reload();
  22  |     
  23  |     // Press Tab to focus skip link (first focusable element)
  24  |     await page.keyboard.press('Tab');
  25  |     
  26  |     // Verify skip link is visible
  27  |     const skipLink = page.locator('.skip-link');
  28  |     await expect(skipLink).toBeVisible();
  29  |     await expect(skipLink).toHaveText('Aller au contenu principal');
  30  |     
  31  |     // Verify skip link has correct href
  32  |     await expect(skipLink).toHaveAttribute('href', '#main-content');
  33  |     
  34  |     // Verify skip link has aria-label
  35  |     await expect(skipLink).toHaveAttribute('aria-label', 'Aller au contenu principal');
  36  |     
  37  |     // Press Enter to activate skip link
  38  |     await page.keyboard.press('Enter');
  39  |     
  40  |     // Verify URL has hash
  41  |     await expect(page).toHaveURL(/.*#main-content/);
  42  |   });
  43  | 
  44  |   test('Main landmark should exist with correct attributes', async ({ page }) => {
  45  |     // Verify main element exists
  46  |     const mainContent = page.locator('main#main-content');
  47  |     await expect(mainContent).toBeVisible();
  48  |     
  49  |     // Verify main has role="main"
  50  |     await expect(mainContent).toHaveAttribute('role', 'main');
  51  |     
  52  |     // Verify main has id="main-content" (skip link target)
  53  |     await expect(mainContent).toHaveAttribute('id', 'main-content');
  54  |   });
  55  | 
  56  |   test('Header banner should exist with correct role', async ({ page }) => {
  57  |     // Verify header element exists
  58  |     const header = page.locator('header[role="banner"]');
> 59  |     await expect(header).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
  60  |     
  61  |     // Verify header has role="banner"
  62  |     await expect(header).toHaveAttribute('role', 'banner');
  63  |   });
  64  | 
  65  |   test('Breadcrumbs navigation should have correct ARIA', async ({ page }) => {
  66  |     // Verify breadcrumbs nav exists
  67  |     const breadcrumbNav = page.locator('nav[aria-label="Fil d\'Ariane"]');
  68  |     await expect(breadcrumbNav).toBeVisible();
  69  |     
  70  |     // Verify nav has aria-label
  71  |     await expect(breadcrumbNav).toHaveAttribute('aria-label', 'Fil d\'Ariane');
  72  |     
  73  |     // Verify ordered list structure
  74  |     const breadcrumbList = breadcrumbNav.locator('ol');
  75  |     await expect(breadcrumbList).toBeVisible();
  76  |     
  77  |     // Verify home link exists
  78  |     const homeLink = breadcrumbNav.locator('a[href="/admin"]');
  79  |     await expect(homeLink).toBeVisible();
  80  |     await expect(homeLink).toHaveText('Accueil');
  81  |     
  82  |     // Verify current page has aria-current="page"
  83  |     const currentPage = breadcrumbNav.locator('[aria-current="page"]');
  84  |     await expect(currentPage).toBeVisible();
  85  |   });
  86  | 
  87  |   test('Breadcrumbs should update dynamically on tab change', async ({ page }) => {
  88  |     // Default tab: Tableau de bord
  89  |     let currentPage = page.locator('[aria-current="page"]');
  90  |     await expect(currentPage).toContainText('Tableau de bord');
  91  |     
  92  |     // Click "Réservations" tab
  93  |     await page.click('text=Réservations');
  94  |     
  95  |     // Verify breadcrumb updated
  96  |     currentPage = page.locator('[aria-current="page"]');
  97  |     await expect(currentPage).toContainText('Réservations');
  98  |     
  99  |     // Click "Voyageurs" tab
  100 |     await page.click('text=Voyageurs');
  101 |     
  102 |     // Verify breadcrumb updated again
  103 |     currentPage = page.locator('[aria-current="page"]');
  104 |     await expect(currentPage).toContainText('Voyageurs');
  105 |   });
  106 | 
  107 |   test('Focus visible CSS should be applied on keyboard navigation', async ({ page }) => {
  108 |     // Tab through interactive elements
  109 |     await page.keyboard.press('Tab'); // Skip link
  110 |     await page.keyboard.press('Tab'); // Next element
  111 |     
  112 |     // Get focused element
  113 |     const focusedElement = await page.locator(':focus-visible');
  114 |     
  115 |     // Verify focus-visible is active
  116 |     await expect(focusedElement).toBeVisible();
  117 |     
  118 |     // Verify outline exists (CSS applied)
  119 |     const outlineColor = await focusedElement.evaluate((el) => {
  120 |       return window.getComputedStyle(el).outlineColor;
  121 |     });
  122 |     
  123 |     // Verify outline is not "none" (should be rgb color)
  124 |     expect(outlineColor).not.toBe('none');
  125 |   });
  126 | 
  127 |   test('Page should have all semantic landmarks', async ({ page }) => {
  128 |     // Verify main landmark
  129 |     await expect(page.locator('main[role="main"]')).toBeVisible();
  130 |     
  131 |     // Verify banner landmark
  132 |     await expect(page.locator('header[role="banner"]')).toBeVisible();
  133 |     
  134 |     // Verify navigation landmark (breadcrumbs)
  135 |     await expect(page.locator('nav[aria-label="Fil d\'Ariane"]')).toBeVisible();
  136 |   });
  137 | 
  138 |   test('Page should have no axe accessibility violations', async ({ page }) => {
  139 |     // Run full page scan with axe-core
  140 |     const accessibilityScanResults = await new AxeBuilder({ page })
  141 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  142 |       .analyze();
  143 |     
  144 |     // Verify no violations
  145 |     expect(accessibilityScanResults.violations).toEqual([]);
  146 |   });
  147 | 
  148 |   test('Navigation landmarks should be accessible to screen readers', async ({ page }) => {
  149 |     // Get all landmarks
  150 |     const landmarks = await page.locator('[role="banner"], [role="main"], nav[aria-label]').all();
  151 |     
  152 |     // Verify at least 3 landmarks (banner, main, breadcrumbs nav)
  153 |     expect(landmarks.length).toBeGreaterThanOrEqual(3);
  154 |     
  155 |     // Verify all landmarks are visible
  156 |     for (const landmark of landmarks) {
  157 |       await expect(landmark).toBeVisible();
  158 |     }
  159 |   });
```