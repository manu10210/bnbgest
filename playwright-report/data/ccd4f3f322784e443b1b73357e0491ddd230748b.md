# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - Full Page Axe Scan >> Each tab should have no axe violations
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:342:7

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
  254 | 
  255 |   test('Template modal should have correct ARIA attributes', async ({ page }) => {
  256 |     // Find button to open template modal (adjust selector based on actual implementation)
  257 |     const templateButton = page.locator('button:has-text("Modèle"), button:has-text("Template")').first();
  258 |     
  259 |     if (await templateButton.count() > 0) {
  260 |       await templateButton.click();
  261 |       
  262 |       const modal = page.locator('[role="dialog"]');
  263 |       await expect(modal).toBeVisible();
  264 |       
  265 |       await expect(modal).toHaveAttribute('role', 'dialog');
  266 |       await expect(modal).toHaveAttribute('aria-modal', 'true');
  267 |     }
  268 |   });
  269 | });
  270 | 
  271 | test.describe('Accessibility - Keyboard Navigation All Modals', () => {
  272 |   test('All modals should close with ESC key consistently', async ({ page }) => {
  273 |     await setupAuth(page);
  274 |     
  275 |     // Test cases: [tab name, button text]
  276 |     const modalTests = [
  277 |       ['Réservations', 'Nouvelle Réservation'],
  278 |       ['Voyageurs', 'Nouveau Voyageur'],
  279 |       ['Maintenance', 'Nouvelle Tâche'],
  280 |       ['Inventaire', 'Ajouter un Équipement'],
  281 |     ];
  282 |     
  283 |     for (const [tabName, buttonText] of modalTests) {
  284 |       // Navigate to tab
  285 |       await page.click(`text=${tabName}`);
  286 |       await page.waitForTimeout(300);
  287 |       
  288 |       // Open modal
  289 |       await page.click(`button:has-text("${buttonText}")`);
  290 |       
  291 |       // Verify modal open
  292 |       await expect(page.locator('[role="dialog"]')).toBeVisible();
  293 |       
  294 |       // Press ESC
  295 |       await page.keyboard.press('Escape');
  296 |       
  297 |       // Verify modal closed
  298 |       await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  299 |     }
  300 |   });
  301 | 
  302 |   test('All modals should auto-focus on first input consistently', async ({ page }) => {
  303 |     await setupAuth(page);
  304 |     
  305 |     const modalTests = [
  306 |       ['Réservations', 'Nouvelle Réservation'],
  307 |       ['Voyageurs', 'Nouveau Voyageur'],
  308 |       ['Maintenance', 'Nouvelle Tâche'],
  309 |       ['Inventaire', 'Ajouter un Équipement'],
  310 |     ];
  311 |     
  312 |     for (const [tabName, buttonText] of modalTests) {
  313 |       await page.click(`text=${tabName}`);
  314 |       await page.waitForTimeout(300);
  315 |       
  316 |       await page.click(`button:has-text("${buttonText}")`);
  317 |       await page.waitForTimeout(200); // useEffect delay
  318 |       
  319 |       // Verify first focusable element is focused
  320 |       const modal = page.locator('[role="dialog"]');
  321 |       const firstFocusable = modal.locator('input, select, textarea, button').first();
  322 |       
  323 |       await expect(firstFocusable).toBeFocused();
  324 |       
  325 |       // Close modal
  326 |       await page.keyboard.press('Escape');
  327 |     }
  328 |   });
  329 | });
  330 | 
  331 | test.describe('Accessibility - Full Page Axe Scan', () => {
  332 |   test('Admin dashboard should have no axe violations', async ({ page }) => {
  333 |     await setupAuth(page);
  334 |     
  335 |     const accessibilityScanResults = await new AxeBuilder({ page })
  336 |       .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  337 |       .analyze();
  338 |     
  339 |     expect(accessibilityScanResults.violations).toEqual([]);
  340 |   });
  341 | 
  342 |   test('Each tab should have no axe violations', async ({ page }) => {
  343 |     await setupAuth(page);
  344 |     
  345 |     const tabs = [
  346 |       'Réservations',
  347 |       'Voyageurs',
  348 |       'Maintenance',
  349 |       'Inventaire',
  350 |       'Paramètres',
  351 |     ];
  352 |     
  353 |     for (const tabName of tabs) {
> 354 |       await page.click(`text=${tabName}`);
      |                  ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  355 |       await page.waitForTimeout(500);
  356 |       
  357 |       const accessibilityScanResults = await new AxeBuilder({ page })
  358 |         .withTags(['wcag2a', 'wcag2aa'])
  359 |         .analyze();
  360 |       
  361 |       // Log violations if any for debugging
  362 |       if (accessibilityScanResults.violations.length > 0) {
  363 |         console.log(`Violations in ${tabName}:`, accessibilityScanResults.violations);
  364 |       }
  365 |       
  366 |       expect(accessibilityScanResults.violations).toEqual([]);
  367 |     }
  368 |   });
  369 | });
  370 | 
```