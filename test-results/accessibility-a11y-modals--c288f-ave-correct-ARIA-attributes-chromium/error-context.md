# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - InventoryManager Modal >> Add item modal should have correct ARIA attributes
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:224:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Inventaire')

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
  120 |     // Verify aria-required on required fields
  121 |     for (const input of requiredInputs) {
  122 |       const ariaRequired = await input.getAttribute('aria-required');
  123 |       expect(ariaRequired).toBe('true');
  124 |     }
  125 |   });
  126 | });
  127 | 
  128 | test.describe('Accessibility - GuestManager Modals', () => {
  129 |   test.beforeEach(async ({ page }) => {
  130 |     await page.goto('/admin');
  131 |     await page.click('text=Voyageurs');
  132 |     await page.waitForTimeout(500);
  133 |   });
  134 | 
  135 |   test('New guest modal should have correct ARIA attributes', async ({ page }) => {
  136 |     await page.click('button:has-text("Nouveau Voyageur")');
  137 |     
  138 |     const modal = page.locator('[role="dialog"]');
  139 |     await expect(modal).toBeVisible();
  140 |     
  141 |     await expect(modal).toHaveAttribute('role', 'dialog');
  142 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  143 |     
  144 |     const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
  145 |     expect(ariaLabelledBy).toBeTruthy();
  146 |   });
  147 | 
  148 |   test('New guest modal should auto-focus and close with ESC', async ({ page }) => {
  149 |     await page.click('button:has-text("Nouveau Voyageur")');
  150 |     await page.waitForTimeout(200);
  151 |     
  152 |     // Verify auto-focus
  153 |     const modal = page.locator('[role="dialog"]');
  154 |     const firstInput = modal.locator('input').first();
  155 |     await expect(firstInput).toBeFocused();
  156 |     
  157 |     // Close with ESC
  158 |     await page.keyboard.press('Escape');
  159 |     await expect(modal).not.toBeVisible();
  160 |   });
  161 | 
  162 |   test('New guest modal should have no axe violations', async ({ page }) => {
  163 |     await page.click('button:has-text("Nouveau Voyageur")');
  164 |     await page.waitForTimeout(300);
  165 |     
  166 |     const accessibilityScanResults = await new AxeBuilder({ page })
  167 |       .include('[role="dialog"]')
  168 |       .analyze();
  169 |     
  170 |     expect(accessibilityScanResults.violations).toEqual([]);
  171 |   });
  172 | });
  173 | 
  174 | test.describe('Accessibility - MaintenanceManager Modal', () => {
  175 |   test.beforeEach(async ({ page }) => {
  176 |     await page.goto('/admin');
  177 |     await page.click('text=Maintenance');
  178 |     await page.waitForTimeout(500);
  179 |   });
  180 | 
  181 |   test('New task modal should have correct ARIA attributes', async ({ page }) => {
  182 |     await page.click('button:has-text("Nouvelle Tâche")');
  183 |     
  184 |     const modal = page.locator('[role="dialog"]');
  185 |     await expect(modal).toBeVisible();
  186 |     
  187 |     await expect(modal).toHaveAttribute('role', 'dialog');
  188 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  189 |   });
  190 | 
  191 |   test('New task modal should auto-focus and close with ESC', async ({ page }) => {
  192 |     await page.click('button:has-text("Nouvelle Tâche")');
  193 |     await page.waitForTimeout(200);
  194 |     
  195 |     // Verify auto-focus
  196 |     const modal = page.locator('[role="dialog"]');
  197 |     const firstInput = modal.locator('input, select, textarea').first();
  198 |     await expect(firstInput).toBeFocused();
  199 |     
  200 |     // Close with ESC
  201 |     await page.keyboard.press('Escape');
  202 |     await expect(modal).not.toBeVisible();
  203 |   });
  204 | 
  205 |   test('New task modal should have no axe violations', async ({ page }) => {
  206 |     await page.click('button:has-text("Nouvelle Tâche")');
  207 |     await page.waitForTimeout(300);
  208 |     
  209 |     const accessibilityScanResults = await new AxeBuilder({ page })
  210 |       .include('[role="dialog"]')
  211 |       .analyze();
  212 |     
  213 |     expect(accessibilityScanResults.violations).toEqual([]);
  214 |   });
  215 | });
  216 | 
  217 | test.describe('Accessibility - InventoryManager Modal', () => {
  218 |   test.beforeEach(async ({ page }) => {
  219 |     await page.goto('/admin');
> 220 |     await page.click('text=Inventaire');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  221 |     await page.waitForTimeout(500);
  222 |   });
  223 | 
  224 |   test('Add item modal should have correct ARIA attributes', async ({ page }) => {
  225 |     await page.click('button:has-text("Ajouter un Équipement")');
  226 |     
  227 |     const modal = page.locator('[role="dialog"]');
  228 |     await expect(modal).toBeVisible();
  229 |     
  230 |     await expect(modal).toHaveAttribute('role', 'dialog');
  231 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  232 |   });
  233 | 
  234 |   test('Add item modal should auto-focus and close with ESC', async ({ page }) => {
  235 |     await page.click('button:has-text("Ajouter un Équipement")');
  236 |     await page.waitForTimeout(200);
  237 |     
  238 |     const modal = page.locator('[role="dialog"]');
  239 |     const firstInput = modal.locator('input').first();
  240 |     await expect(firstInput).toBeFocused();
  241 |     
  242 |     await page.keyboard.press('Escape');
  243 |     await expect(modal).not.toBeVisible();
  244 |   });
  245 | });
  246 | 
  247 | test.describe('Accessibility - ContractGenerator Modal', () => {
  248 |   test.beforeEach(async ({ page }) => {
  249 |     await page.goto('/admin');
  250 |     await page.click('text=Générateur de Contrats');
  251 |     await page.waitForTimeout(500);
  252 |   });
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
```