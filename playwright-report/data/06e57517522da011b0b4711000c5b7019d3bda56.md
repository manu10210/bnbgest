# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance\core-vitals.spec.ts >> Core Web Vitals - Homepage >> TTFB should be under 800ms
- Location: tests\performance\core-vitals.spec.ts:60:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 800
Received:   2982
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Aller au contenu principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - banner [ref=e5]:
        - generic [ref=e7]:
          - generic [ref=e8] [cursor=pointer]:
            - img [ref=e10]
            - generic [ref=e14]: bnbgest
          - generic [ref=e15]:
            - button "Passer en mode clair" [ref=e16]:
              - generic:
                - img
                - img
              - img [ref=e18]
            - button "Connexion" [ref=e20]
      - main [ref=e21]:
        - generic [ref=e22]:
          - generic [ref=e24]:
            - generic [ref=e25]:
              - generic [ref=e26]:
                - img [ref=e27]
                - text: Plateforme de gestion locative tout-en-un
              - heading "Gérez votre location comme un hôte pro" [level=1] [ref=e30]:
                - text: Gérez votre location
                - text: comme un hôte pro
              - paragraph [ref=e31]: Réservations, calendrier, tarification dynamique, contrats et bien plus. Tout dans un seul outil élégant.
              - generic [ref=e32]:
                - button "Commencer gratuitement" [ref=e33]:
                  - img [ref=e34]
                  - text: Commencer gratuitement
                  - img [ref=e39]
                - button "Découvrir la plateforme" [ref=e41]:
                  - img [ref=e42]
                  - text: Découvrir la plateforme
            - generic [ref=e46]:
              - img [ref=e48]
              - generic [ref=e50]:
                - paragraph [ref=e51]: +23%
                - paragraph [ref=e52]: de revenus
            - generic [ref=e55]:
              - img [ref=e57]
              - generic [ref=e59]:
                - paragraph [ref=e60]: 4.9/5
                - paragraph [ref=e61]: satisfaction
            - generic [ref=e64]:
              - img [ref=e66]
              - generic [ref=e68]:
                - paragraph [ref=e69]: 5min
                - paragraph [ref=e70]: mise en place
          - generic [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - img [ref=e75]
                - text: Fonctionnalités
              - heading "Tout ce dont vous avez besoin" [level=2] [ref=e79]
              - paragraph [ref=e80]: Une suite complète d'outils pour gérer votre activité comme un professionnel
            - generic [ref=e81]:
              - generic [ref=e82]:
                - img [ref=e84]
                - paragraph [ref=e86]: Réservations
                - paragraph [ref=e87]: Gestion complète
              - generic [ref=e88]:
                - img [ref=e90]
                - paragraph [ref=e93]: Tarification
                - paragraph [ref=e94]: Prix dynamiques
              - generic [ref=e95]:
                - img [ref=e97]
                - paragraph [ref=e99]: Maintenance
                - paragraph [ref=e100]: Suivi en temps réel
              - generic [ref=e101]:
                - img [ref=e103]
                - paragraph [ref=e107]: Inventaire
                - paragraph [ref=e108]: Stock automatisé
              - generic [ref=e109]:
                - img [ref=e111]
                - paragraph [ref=e113]: Finances
                - paragraph [ref=e114]: Rapports détaillés
              - generic [ref=e115]:
                - img [ref=e117]
                - paragraph [ref=e120]: Guide accueil
                - paragraph [ref=e121]: Multi-langues
              - generic [ref=e122]:
                - img [ref=e124]
                - paragraph [ref=e126]: Avis clients
                - paragraph [ref=e127]: Réputation
              - generic [ref=e128]:
                - img [ref=e130]
                - paragraph [ref=e132]: Contrats
                - paragraph [ref=e133]: Génération auto
            - generic [ref=e135]:
              - generic [ref=e136]:
                - img [ref=e138]
                - generic [ref=e140]: Données sécurisées
              - generic [ref=e141]:
                - img [ref=e143]
                - generic [ref=e145]: Ultra rapide
              - generic [ref=e146]:
                - img [ref=e148]
                - generic [ref=e150]: Design premium
              - generic [ref=e151]:
                - img [ref=e153]
                - generic [ref=e156]: 30+ outils intégrés
              - generic [ref=e157]:
                - img [ref=e159]
                - generic [ref=e164]: Mis à jour en continu
          - generic [ref=e166]:
            - img [ref=e168]
            - heading "Prêt à transformer votre activité ?" [level=2] [ref=e173]
            - paragraph [ref=e174]: Rejoignez les hôtes qui utilisent BNBGest pour simplifier leur gestion au quotidien.
            - button "Démarrer maintenant" [ref=e175]:
              - text: Démarrer maintenant
              - img [ref=e176]
      - contentinfo [ref=e178]:
        - generic [ref=e179]:
          - generic [ref=e180]:
            - img [ref=e182]
            - generic [ref=e185]: © 2026 BNBGest
            - generic [ref=e186]: ·
            - generic [ref=e187]: Gestion locative professionnelle
          - generic [ref=e188]:
            - img [ref=e189]
            - generic [ref=e192]: Français (FR)
    - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e198] [cursor=pointer]:
    - img [ref=e199]
  - alert [ref=e202]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * Core Web Vitals Performance Tests
  5   |  * 
  6   |  * Session 21: Performance Testing
  7   |  * - Tests LCP (Largest Contentful Paint)
  8   |  * - Tests FCP (First Contentful Paint)
  9   |  * - Tests CLS (Cumulative Layout Shift)
  10  |  * - Tests TTFB (Time to First Byte)
  11  |  * - Tests page load performance
  12  |  * 
  13  |  * Thresholds based on Google's Core Web Vitals:
  14  |  * - LCP: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
  15  |  * - FCP: Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
  16  |  * - CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
  17  |  * - TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms
  18  |  */
  19  | 
  20  | test.describe('Core Web Vitals - Homepage', () => {
  21  |   test('LCP should be under 2.5s', async ({ page }) => {
  22  |     await page.goto('/');
  23  |     
  24  |     const lcp = await page.evaluate(() => {
  25  |       return new Promise<number>((resolve) => {
  26  |         new PerformanceObserver((list) => {
  27  |           const entries = list.getEntries();
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
> 67  |     expect(ttfb).toBeLessThan(800);
      |                  ^ Error: expect(received).toBeLessThan(expected)
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
```