# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-navigation.spec.ts >> Accessibility - Dark Mode Navigation >> Focus visible should use accent color in dark mode
- Location: tests\e2e\accessibility\a11y-navigation.spec.ts:199:7

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
  160 | });
  161 | 
  162 | test.describe('Accessibility - Dark Mode Navigation', () => {
  163 |   test.beforeEach(async ({ page }) => {
  164 |     await setupAuth(page);
  165 |   });
  166 | 
  167 |   test('Skip link should adapt to dark mode', async ({ page }) => {
  168 |     // Toggle dark mode
  169 |     const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
  170 |     await themeToggle.click();
  171 |     
  172 |     // Wait for theme change
  173 |     await page.waitForTimeout(300);
  174 |     
  175 |     // Tab to skip link
  176 |     await page.keyboard.press('Tab');
  177 |     
  178 |     // Verify skip link visible in dark mode
  179 |     const skipLink = page.locator('.skip-link');
  180 |     await expect(skipLink).toBeVisible();
  181 |     
  182 |     // Verify dark mode class applied to body/html
  183 |     const isDarkMode = await page.evaluate(() => {
  184 |       return document.documentElement.classList.contains('dark') || 
  185 |              document.body.classList.contains('dark');
  186 |     });
  187 |     
  188 |     if (isDarkMode) {
  189 |       // Verify outline color adapted (should be #FF385C in dark mode)
  190 |       const outlineColor = await skipLink.evaluate((el) => {
  191 |         return window.getComputedStyle(el).outlineColor;
  192 |       });
  193 |       
  194 |       // Outline should exist
  195 |       expect(outlineColor).not.toBe('none');
  196 |     }
  197 |   });
  198 | 
  199 |   test('Focus visible should use accent color in dark mode', async ({ page }) => {
  200 |     // Toggle dark mode
  201 |     const themeToggle = page.locator('[aria-label*="theme"], [aria-label*="thème"]').first();
> 202 |     await themeToggle.click();
      |                       ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  203 |     
  204 |     await page.waitForTimeout(300);
  205 |     
  206 |     // Focus on interactive element
  207 |     await page.keyboard.press('Tab');
  208 |     await page.keyboard.press('Tab');
  209 |     
  210 |     const focusedElement = await page.locator(':focus-visible');
  211 |     
  212 |     // Verify element is focused
  213 |     await expect(focusedElement).toBeVisible();
  214 |     
  215 |     // Verify dark mode class
  216 |     const isDarkMode = await page.evaluate(() => {
  217 |       return document.documentElement.classList.contains('dark') || 
  218 |              document.body.classList.contains('dark');
  219 |     });
  220 |     
  221 |     expect(isDarkMode).toBeTruthy();
  222 |   });
  223 | });
  224 | 
```