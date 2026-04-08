# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - Full Page Axe Scan >> Each tab should have no axe violations
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:341:7

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
  253 | 
  254 |   test('Template modal should have correct ARIA attributes', async ({ page }) => {
  255 |     // Find button to open template modal (adjust selector based on actual implementation)
  256 |     const templateButton = page.locator('button:has-text("Modèle"), button:has-text("Template")').first();
  257 |     
  258 |     if (await templateButton.count() > 0) {
  259 |       await templateButton.click();
  260 |       
  261 |       const modal = page.locator('[role="dialog"]');
  262 |       await expect(modal).toBeVisible();
  263 |       
  264 |       await expect(modal).toHaveAttribute('role', 'dialog');
  265 |       await expect(modal).toHaveAttribute('aria-modal', 'true');
  266 |     }
  267 |   });
  268 | });
  269 | 
  270 | test.describe('Accessibility - Keyboard Navigation All Modals', () => {
  271 |   test('All modals should close with ESC key consistently', async ({ page }) => {
  272 |     await page.goto('/admin');
  273 |     
  274 |     // Test cases: [tab name, button text]
  275 |     const modalTests = [
  276 |       ['Réservations', 'Nouvelle Réservation'],
  277 |       ['Voyageurs', 'Nouveau Voyageur'],
  278 |       ['Maintenance', 'Nouvelle Tâche'],
  279 |       ['Inventaire', 'Ajouter un Équipement'],
  280 |     ];
  281 |     
  282 |     for (const [tabName, buttonText] of modalTests) {
  283 |       // Navigate to tab
  284 |       await page.click(`text=${tabName}`);
  285 |       await page.waitForTimeout(300);
  286 |       
  287 |       // Open modal
  288 |       await page.click(`button:has-text("${buttonText}")`);
  289 |       
  290 |       // Verify modal open
  291 |       await expect(page.locator('[role="dialog"]')).toBeVisible();
  292 |       
  293 |       // Press ESC
  294 |       await page.keyboard.press('Escape');
  295 |       
  296 |       // Verify modal closed
  297 |       await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  298 |     }
  299 |   });
  300 | 
  301 |   test('All modals should auto-focus on first input consistently', async ({ page }) => {
  302 |     await page.goto('/admin');
  303 |     
  304 |     const modalTests = [
  305 |       ['Réservations', 'Nouvelle Réservation'],
  306 |       ['Voyageurs', 'Nouveau Voyageur'],
  307 |       ['Maintenance', 'Nouvelle Tâche'],
  308 |       ['Inventaire', 'Ajouter un Équipement'],
  309 |     ];
  310 |     
  311 |     for (const [tabName, buttonText] of modalTests) {
  312 |       await page.click(`text=${tabName}`);
  313 |       await page.waitForTimeout(300);
  314 |       
  315 |       await page.click(`button:has-text("${buttonText}")`);
  316 |       await page.waitForTimeout(200); // useEffect delay
  317 |       
  318 |       // Verify first focusable element is focused
  319 |       const modal = page.locator('[role="dialog"]');
  320 |       const firstFocusable = modal.locator('input, select, textarea, button').first();
  321 |       
  322 |       await expect(firstFocusable).toBeFocused();
  323 |       
  324 |       // Close modal
  325 |       await page.keyboard.press('Escape');
  326 |     }
  327 |   });
  328 | });
  329 | 
  330 | test.describe('Accessibility - Full Page Axe Scan', () => {
  331 |   test('Admin dashboard should have no axe violations', async ({ page }) => {
  332 |     await page.goto('/admin');
  333 |     
  334 |     const accessibilityScanResults = await new AxeBuilder({ page })
  335 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  336 |       .analyze();
  337 |     
  338 |     expect(accessibilityScanResults.violations).toEqual([]);
  339 |   });
  340 | 
  341 |   test('Each tab should have no axe violations', async ({ page }) => {
  342 |     await page.goto('/admin');
  343 |     
  344 |     const tabs = [
  345 |       'Réservations',
  346 |       'Voyageurs',
  347 |       'Maintenance',
  348 |       'Inventaire',
  349 |       'Paramètres',
  350 |     ];
  351 |     
  352 |     for (const tabName of tabs) {
> 353 |       await page.click(`text=${tabName}`);
      |                  ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  354 |       await page.waitForTimeout(500);
  355 |       
  356 |       const accessibilityScanResults = await new AxeBuilder({ page })
  357 |         .withTags(['wcag2a', 'wcag2aa'])
  358 |         .analyze();
  359 |       
  360 |       // Log violations if any for debugging
  361 |       if (accessibilityScanResults.violations.length > 0) {
  362 |         console.log(`Violations in ${tabName}:`, accessibilityScanResults.violations);
  363 |       }
  364 |       
  365 |       expect(accessibilityScanResults.violations).toEqual([]);
  366 |     }
  367 |   });
  368 | });
  369 | 
```