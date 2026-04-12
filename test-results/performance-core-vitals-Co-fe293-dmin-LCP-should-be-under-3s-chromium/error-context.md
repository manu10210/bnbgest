# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance\core-vitals.spec.ts >> Core Web Vitals - Admin Dashboard >> Admin LCP should be under 3s
- Location: tests\performance\core-vitals.spec.ts:110:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 3000
Received:   5000
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Aller au contenu principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - button "Retour" [ref=e7]:
          - img [ref=e8]
          - text: Retour
        - button "Passer en mode clair" [ref=e10]:
          - generic:
            - img
            - img
          - img [ref=e12]
      - generic [ref=e14]:
        - generic [ref=e16]: BG
        - heading "Bon retour !" [level=2] [ref=e17]
        - paragraph [ref=e18]: Accédez à votre espace administrateur
      - generic [ref=e19]:
        - button "Connexion" [ref=e20]:
          - generic [ref=e21]:
            - img [ref=e22]
            - text: Connexion
        - button "Inscription" [ref=e25]:
          - generic [ref=e26]:
            - img [ref=e27]
            - text: Inscription
      - generic [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]: Email
            - generic [ref=e34]:
              - img [ref=e36]
              - textbox "Email" [ref=e39]:
                - /placeholder: votre@email.com
          - generic [ref=e40]:
            - generic [ref=e41]: Mot de passe
            - generic [ref=e42]:
              - img [ref=e44]
              - textbox "Mot de passe" [ref=e47]:
                - /placeholder: Votre mot de passe
              - button [ref=e48]:
                - img [ref=e49]
          - link "Mot de passe oublié ?" [ref=e53] [cursor=pointer]:
            - /url: /forgot-password
          - button "Se connecter" [ref=e54]:
            - img [ref=e55]
            - text: Se connecter
          - generic [ref=e62]: OU
          - button "Continuer avec Google" [ref=e63]:
            - img [ref=e64]
            - text: Continuer avec Google
        - generic [ref=e69]:
          - generic [ref=e70]:
            - img [ref=e71]
            - heading "Comptes de test" [level=4] [ref=e74]
          - generic [ref=e75]:
            - generic [ref=e76]:
              - generic [ref=e77]: A
              - generic [ref=e78]:
                - strong [ref=e79]: claustre.emmanuel@gmail.com
                - text: — Admin
            - generic [ref=e80]:
              - generic [ref=e81]: E
              - generic [ref=e82]:
                - strong [ref=e83]: employee@bnbgest.com
                - text: — Employé
      - generic [ref=e84]:
        - generic [ref=e85]:
          - img [ref=e86]
          - generic [ref=e88]: Sécurisé
        - generic [ref=e89]:
          - img [ref=e90]
          - generic [ref=e92]: Rapide
        - generic [ref=e93]:
          - img [ref=e94]
          - generic [ref=e97]: Premium
      - paragraph [ref=e98]: © 2026 BNBGest · Gestion locative professionnelle
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e104] [cursor=pointer]:
    - img [ref=e105]
  - alert [ref=e108]
```

# Test source

```ts
  28  |           const lastEntry = entries[entries.length - 1] as any;
  29  |           resolve(lastEntry.renderTime || lastEntry.loadTime);
  30  |         }).observe({ type: 'largest-contentful-paint', buffered: true });
  31  |         
  32  |         // Timeout after 5s
  33  |         setTimeout(() => resolve(5000), 5000);
  34  |       });
  35  |     });
  36  |     
  37  |     console.log(`📊 LCP: ${Math.round(lcp)}ms`);
  38  |     expect(lcp).toBeLessThan(2500);
  39  |   });
  40  | 
  41  |   test('FCP should be under 1.8s', async ({ page }) => {
  42  |     await page.goto('/');
  43  |     
  44  |     const fcp = await page.evaluate(() => {
  45  |       return new Promise<number>((resolve) => {
  46  |         new PerformanceObserver((list) => {
  47  |           const entries = list.getEntries();
  48  |           const entry = entries[0] as any;
  49  |           resolve(entry.startTime);
  50  |         }).observe({ type: 'paint', buffered: true });
  51  |         
  52  |         setTimeout(() => resolve(3000), 3000);
  53  |       });
  54  |     });
  55  |     
  56  |     console.log(`📊 FCP: ${Math.round(fcp)}ms`);
  57  |     expect(fcp).toBeLessThan(1800);
  58  |   });
  59  | 
  60  |   test('TTFB should be under 800ms', async ({ page }) => {
  61  |     const startTime = Date.now();
  62  |     const response = await page.goto('/');
  63  |     const ttfb = Date.now() - startTime;
  64  |     
  65  |     console.log(`📊 TTFB: ${ttfb}ms`);
  66  |     expect(response?.status()).toBe(200);
  67  |     expect(ttfb).toBeLessThan(800);
  68  |   });
  69  | 
  70  |   test('CLS should be under 0.1', async ({ page }) => {
  71  |     await page.goto('/');
  72  |     
  73  |     // Wait for page to be stable
  74  |     await page.waitForLoadState('networkidle');
  75  |     await page.waitForTimeout(1000);
  76  |     
  77  |     const cls = await page.evaluate(() => {
  78  |       return new Promise<number>((resolve) => {
  79  |         let clsValue = 0;
  80  |         
  81  |         new PerformanceObserver((list) => {
  82  |           for (const entry of list.getEntries() as any[]) {
  83  |             if (!entry.hadRecentInput) {
  84  |               clsValue += entry.value;
  85  |             }
  86  |           }
  87  |         }).observe({ type: 'layout-shift', buffered: true });
  88  |         
  89  |         // Collect for 3 seconds
  90  |         setTimeout(() => resolve(clsValue), 3000);
  91  |       });
  92  |     });
  93  |     
  94  |     console.log(`📊 CLS: ${cls.toFixed(3)}`);
  95  |     expect(cls).toBeLessThan(0.1);
  96  |   });
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
> 128 |     expect(lcp).toBeLessThan(3000);
      |                 ^ Error: expect(received).toBeLessThan(expected)
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
  197 |     await page.goto('/');
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