# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - MaintenanceManager Modal >> New task modal should auto-focus and close with ESC
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:192:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Maintenance')

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
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
  119 |     const requiredInputs = await modal.locator('input[required], select[required]').all();
  120 |     
  121 |     // Verify aria-required on required fields
  122 |     for (const input of requiredInputs) {
  123 |       const ariaRequired = await input.getAttribute('aria-required');
  124 |       expect(ariaRequired).toBe('true');
  125 |     }
  126 |   });
  127 | });
  128 | 
  129 | test.describe('Accessibility - GuestManager Modals', () => {
  130 |   test.beforeEach(async ({ page }) => {
  131 |     await setupAuth(page);
  132 |     await page.click('text=Voyageurs');
  133 |     await page.waitForTimeout(500);
  134 |   });
  135 | 
  136 |   test('New guest modal should have correct ARIA attributes', async ({ page }) => {
  137 |     await page.click('button:has-text("Nouveau Voyageur")');
  138 |     
  139 |     const modal = page.locator('[role="dialog"]');
  140 |     await expect(modal).toBeVisible();
  141 |     
  142 |     await expect(modal).toHaveAttribute('role', 'dialog');
  143 |     await expect(modal).toHaveAttribute('aria-modal', 'true');
  144 |     
  145 |     const ariaLabelledBy = await modal.getAttribute('aria-labelledby');
  146 |     expect(ariaLabelledBy).toBeTruthy();
  147 |   });
  148 | 
  149 |   test('New guest modal should auto-focus and close with ESC', async ({ page }) => {
  150 |     await page.click('button:has-text("Nouveau Voyageur")');
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
> 178 |     await page.click('text=Maintenance');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
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
  251 |     await page.click('text=Générateur de Contrats');
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
```