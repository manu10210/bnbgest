# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-navigation.spec.ts >> Accessibility - Dark Mode Navigation >> Skip link should adapt to dark mode
- Location: tests\e2e\accessibility\a11y-navigation.spec.ts:166:7

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[aria-label*="theme"], [aria-label*="thème"]').first()

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
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
  128 |     await expect(page.locator('main[role="main"]')).toBeVisible();
  129 |     
  130 |     // Verify banner landmark
  131 |     await expect(page.locator('header[role="banner"]')).toBeVisible();
  132 |     
  133 |     // Verify navigation landmark (breadcrumbs)
  134 |     await expect(page.locator('nav[aria-label="Fil d\'Ariane"]')).toBeVisible();
  135 |   });
  136 | 
  137 |   test('Page should have no axe accessibility violations', async ({ page }) => {
  138 |     // Run full page scan with axe-core
  139 |     const accessibilityScanResults = await new AxeBuilder({ page })
  140 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  141 |       .analyze();
  142 |     
  143 |     // Verify no violations
  144 |     expect(accessibilityScanResults.violations).toEqual([]);
  145 |   });
  146 | 
  147 |   test('Navigation landmarks should be accessible to screen readers', async ({ page }) => {
  148 |     // Get all landmarks
  149 |     const landmarks = await page.locator('[role="banner"], [role="main"], nav[aria-label]').all();
  150 |     
  151 |     // Verify at least 3 landmarks (banner, main, breadcrumbs nav)
  152 |     expect(landmarks.length).toBeGreaterThanOrEqual(3);
  153 |     
  154 |     // Verify all landmarks are visible
  155 |     for (const landmark of landmarks) {
  156 |       await expect(landmark).toBeVisible();
  157 |     }
  158 |   });
  159 | });
  160 | 
  161 | test.describe('Accessibility - Dark Mode Navigation', () => {
  162 |   test.beforeEach(async ({ page }) => {
  163 |     await page.goto('/admin');
  164 |   });
  165 | 
  166 |   test('Skip link should adapt to dark mode', async ({ page }) => {
  167 |     // Toggle dark mode
  168 |     const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
> 169 |     await themeToggle.click();
      |                       ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  170 |     
  171 |     // Wait for theme change
  172 |     await page.waitForTimeout(300);
  173 |     
  174 |     // Tab to skip link
  175 |     await page.keyboard.press('Tab');
  176 |     
  177 |     // Verify skip link visible in dark mode
  178 |     const skipLink = page.locator('.skip-link');
  179 |     await expect(skipLink).toBeVisible();
  180 |     
  181 |     // Verify dark mode class applied to body/html
  182 |     const isDarkMode = await page.evaluate(() => {
  183 |       return document.documentElement.classList.contains('dark') || 
  184 |              document.body.classList.contains('dark');
  185 |     });
  186 |     
  187 |     if (isDarkMode) {
  188 |       // Verify outline color adapted (should be #FF385C in dark mode)
  189 |       const outlineColor = await skipLink.evaluate((el) => {
  190 |         return window.getComputedStyle(el).outlineColor;
  191 |       });
  192 |       
  193 |       // Outline should exist
  194 |       expect(outlineColor).not.toBe('none');
  195 |     }
  196 |   });
  197 | 
  198 |   test('Focus visible should use accent color in dark mode', async ({ page }) => {
  199 |     // Toggle dark mode
  200 |     const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
  201 |     await themeToggle.click();
  202 |     
  203 |     await page.waitForTimeout(300);
  204 |     
  205 |     // Focus on interactive element
  206 |     await page.keyboard.press('Tab');
  207 |     await page.keyboard.press('Tab');
  208 |     
  209 |     const focusedElement = await page.locator(':focus-visible');
  210 |     
  211 |     // Verify element is focused
  212 |     await expect(focusedElement).toBeVisible();
  213 |     
  214 |     // Verify dark mode class
  215 |     const isDarkMode = await page.evaluate(() => {
  216 |       return document.documentElement.classList.contains('dark') || 
  217 |              document.body.classList.contains('dark');
  218 |     });
  219 |     
  220 |     expect(isDarkMode).toBeTruthy();
  221 |   });
  222 | });
  223 | 
```