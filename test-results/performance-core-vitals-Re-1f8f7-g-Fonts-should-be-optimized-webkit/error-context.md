# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance\core-vitals.spec.ts >> Resource Loading >> Fonts should be optimized
- Location: tests\performance\core-vitals.spec.ts:196:7

# Error details

```
TimeoutError: page.goto: Timeout 15000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  97  | 
  98  |   test('Page load should complete in under 3s', async ({ page }) => {
  99  |     const startTime = Date.now();
  100 |     await page.goto('/');
  101 |     await page.waitForLoadState('load');
  102 |     const loadTime = Date.now() - startTime;
  103 |     
  104 |     console.log(`📊 Page Load: ${loadTime}ms`);
  105 |     expect(loadTime).toBeLessThan(3000);
  106 |   });
  107 | });
  108 | 
  109 | test.describe('Core Web Vitals - Admin Dashboard', () => {
  110 |   test('Admin LCP should be under 3s', async ({ page }) => {
  111 |     // Note: This will fail without auth, but demonstrates the test structure
  112 |     await page.goto('/admin');
  113 |     
  114 |     const lcp = await page.evaluate(() => {
  115 |       return new Promise<number>((resolve) => {
  116 |         new PerformanceObserver((list) => {
  117 |           const entries = list.getEntries();
  118 |           const lastEntry = entries[entries.length - 1] as any;
  119 |           resolve(lastEntry.renderTime || lastEntry.loadTime);
  120 |         }).observe({ type: 'largest-contentful-paint', buffered: true });
  121 |         
  122 |         setTimeout(() => resolve(5000), 5000);
  123 |       });
  124 |     });
  125 |     
  126 |     console.log(`📊 Admin LCP: ${Math.round(lcp)}ms`);
  127 |     // More lenient threshold for admin (includes auth redirect)
  128 |     expect(lcp).toBeLessThan(3000);
  129 |   });
  130 | });
  131 | 
  132 | test.describe('Bundle Performance', () => {
  133 |   test('Total JavaScript size should be reasonable', async ({ page }) => {
  134 |     await page.goto('/');
  135 |     await page.waitForLoadState('networkidle');
  136 |     
  137 |     const jsSize = await page.evaluate(() => {
  138 |       const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  139 |       let totalSize = 0;
  140 |       
  141 |       entries.forEach((entry) => {
  142 |         if (entry.name.endsWith('.js')) {
  143 |           totalSize += entry.transferSize || 0;
  144 |         }
  145 |       });
  146 |       
  147 |       return totalSize;
  148 |     });
  149 |     
  150 |     const jsSizeKB = Math.round(jsSize / 1024);
  151 |     console.log(`📊 Total JS: ${jsSizeKB} KB`);
  152 |     
  153 |     // Should be under 500KB total
  154 |     expect(jsSize).toBeLessThan(500 * 1024);
  155 |   });
  156 | 
  157 |   test('Total CSS size should be reasonable', async ({ page }) => {
  158 |     await page.goto('/');
  159 |     await page.waitForLoadState('networkidle');
  160 |     
  161 |     const cssSize = await page.evaluate(() => {
  162 |       const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  163 |       let totalSize = 0;
  164 |       
  165 |       entries.forEach((entry) => {
  166 |         if (entry.name.endsWith('.css')) {
  167 |           totalSize += entry.transferSize || 0;
  168 |         }
  169 |       });
  170 |       
  171 |       return totalSize;
  172 |     });
  173 |     
  174 |     const cssSizeKB = Math.round(cssSize / 1024);
  175 |     console.log(`📊 Total CSS: ${cssSizeKB} KB`);
  176 |     
  177 |     // Should be under 50KB total
  178 |     expect(cssSize).toBeLessThan(50 * 1024);
  179 |   });
  180 | });
  181 | 
  182 | test.describe('Resource Loading', () => {
  183 |   test('Images should be lazy loaded', async ({ page }) => {
  184 |     await page.goto('/');
  185 |     
  186 |     const lazyImages = await page.evaluate(() => {
  187 |       const images = Array.from(document.querySelectorAll('img'));
  188 |       return images.filter(img => img.loading === 'lazy').length;
  189 |     });
  190 |     
  191 |     console.log(`📊 Lazy images: ${lazyImages}`);
  192 |     // At least some images should be lazy loaded
  193 |     expect(lazyImages).toBeGreaterThan(0);
  194 |   });
  195 | 
  196 |   test('Fonts should be optimized', async ({ page }) => {
> 197 |     await page.goto('/');
      |                ^ TimeoutError: page.goto: Timeout 15000ms exceeded.
  198 |     
  199 |     const fontDisplay = await page.evaluate(() => {
  200 |       const styles = Array.from(document.styleSheets);
  201 |       let hasOptimalFontDisplay = false;
  202 |       
  203 |       styles.forEach(sheet => {
  204 |         try {
  205 |           const rules = Array.from(sheet.cssRules || []);
  206 |           rules.forEach((rule: any) => {
  207 |             if (rule.style?.fontDisplay === 'swap' || rule.style?.fontDisplay === 'optional') {
  208 |               hasOptimalFontDisplay = true;
  209 |             }
  210 |           });
  211 |         } catch (e) {
  212 |           // Cross-origin stylesheet, skip
  213 |         }
  214 |       });
  215 |       
  216 |       return hasOptimalFontDisplay;
  217 |     });
  218 |     
  219 |     console.log(`📊 Font Display optimized: ${fontDisplay}`);
  220 |     expect(fontDisplay).toBe(true);
  221 |   });
  222 | });
  223 | 
```