# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: accessibility\a11y-modals.spec.ts >> Accessibility - GuestManager Modals >> New guest modal should have correct ARIA attributes
- Location: tests\e2e\accessibility\a11y-modals.spec.ts:135:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Voyageurs')

```

# Page snapshot

```yaml
- paragraph [ref=e5]: VÃ©rification de l'authentification...
```

# Test source

```ts
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
  118 |     const requiredInputs = await modal.locator('input[required], select[required]').all();
  119 |     
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
> 131 |     await page.click('text=Voyageurs');
      |                ^ TimeoutError: page.click: Timeout 10000ms exceeded.
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
  220 |     await page.click('text=Inventaire');
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
```