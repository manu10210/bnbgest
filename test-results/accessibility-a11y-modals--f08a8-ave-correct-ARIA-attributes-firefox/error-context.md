# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - ContractGenerator Modal >> Template modal should have correct ARIA attributes
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:255:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Générateur de Contrats')

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
  151 |     await page.waitForTimeout(200);
  152 |     
  153 |     // Verify auto-focus
  154 |     const modal = page.locator('[role="dialog"]');
  155 |     const firstInput = modal.locator('input').first();
  156 |     await expect(firstInput).toBeFocused();
  157 |     
  158 |     // Close with ESC
  159 |     await page.keyboard.press('Escape');
  160 |     await expect(modal).not.toBeVisible();
  161 |   });
  162 | 
  163 |   test('New guest modal should have no axe violations', async ({ page }) => {
  164 |     await page.click('button:has-text("Nouveau Voyageur")');
  165 |     await page.waitForTimeout(300);
  166 |     
  167 |     const accessibilityScanResults = await new AxeBuilder({ page })
  168 |       .include('[role="dialog"]')
  169 |       .analyze();
  170 |     
  171 |     expect(accessibilityScanResults.violations).toEqual([]);
  172 |   });
  173 | });
  174 | 
  175 | test.describe('Accessibility - MaintenanceManager Modal', () => {
  176 |   test.beforeEach(async ({ page }) => {
  177 |     await setupAuth(page);
  178 |     await page.click('text=Maintenance');
  179 |     await page.waitForTimeout(500);
  180 |   });
  181 | 
  182 |   test('New task modal should have correct ARIA attributes', async ({ page }) => {
  183 |     await page.click('button:has-text("Nouvelle Tâche")');
  184 |     
  185 |     const modal = page.locator('[role="dialog"]');
  186 |     await expect(modal).toBeVisible();
  187 |     
  188 |     await expect(modal).toHaveAttribute('role', 'dialog');
  189 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  190 |   });
  191 | 
  192 |   test('New task modal should auto-focus and close with ESC', async ({ page }) => {
  193 |     await page.click('button:has-text("Nouvelle Tâche")');
  194 |     await page.waitForTimeout(200);
  195 |     
  196 |     // Verify auto-focus
  197 |     const modal = page.locator('[role="dialog"]');
  198 |     const firstInput = modal.locator('input, select, textarea').first();
  199 |     await expect(firstInput).toBeFocused();
  200 |     
  201 |     // Close with ESC
  202 |     await page.keyboard.press('Escape');
  203 |     await expect(modal).not.toBeVisible();
  204 |   });
  205 | 
  206 |   test('New task modal should have no axe violations', async ({ page }) => {
  207 |     await page.click('button:has-text("Nouvelle Tâche")');
  208 |     await page.waitForTimeout(300);
  209 |     
  210 |     const accessibilityScanResults = await new AxeBuilder({ page })
  211 |       .include('[role="dialog"]')
  212 |       .analyze();
  213 |     
  214 |     expect(accessibilityScanResults.violations).toEqual([]);
  215 |   });
  216 | });
  217 | 
  218 | test.describe('Accessibility - InventoryManager Modal', () => {
  219 |   test.beforeEach(async ({ page }) => {
  220 |     await setupAuth(page);
  221 |     await page.click('text=Inventaire');
  222 |     await page.waitForTimeout(500);
  223 |   });
  224 | 
  225 |   test('Add item modal should have correct ARIA attributes', async ({ page }) => {
  226 |     await page.click('button:has-text("Ajouter un Équipement")');
  227 |     
  228 |     const modal = page.locator('[role="dialog"]');
  229 |     await expect(modal).toBeVisible();
  230 |     
  231 |     await expect(modal).toHaveAttribute('role', 'dialog');
  232 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  233 |   });
  234 | 
  235 |   test('Add item modal should auto-focus and close with ESC', async ({ page }) => {
  236 |     await page.click('button:has-text("Ajouter un Équipement")');
  237 |     await page.waitForTimeout(200);
  238 |     
  239 |     const modal = page.locator('[role="dialog"]');
  240 |     const firstInput = modal.locator('input').first();
  241 |     await expect(firstInput).toBeFocused();
  242 |     
  243 |     await page.keyboard.press('Escape');
  244 |     await expect(modal).not.toBeVisible();
  245 |   });
  246 | });
  247 | 
  248 | test.describe('Accessibility - ContractGenerator Modal', () => {
  249 |   test.beforeEach(async ({ page }) => {
  250 |     await setupAuth(page);
> 251 |     await page.click('text=Générateur de Contrats');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  252 |     await page.waitForTimeout(500);
  253 |   });
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
```