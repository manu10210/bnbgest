import { test, expect } from '@playwright/test';

/**
 * Core Web Vitals Performance Tests
 * 
 * Session 21: Performance Testing
 * - Tests LCP (Largest Contentful Paint)
 * - Tests FCP (First Contentful Paint)
 * - Tests CLS (Cumulative Layout Shift)
 * - Tests TTFB (Time to First Byte)
 * - Tests page load performance
 * 
 * Thresholds based on Google's Core Web Vitals:
 * - LCP: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
 * - FCP: Good < 1.8s, Needs Improvement < 3s, Poor >= 3s
 * - CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
 * - TTFB: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms
 */

test.describe('Core Web Vitals - Homepage', () => {
  test('LCP should be under 2.5s', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Timeout after 5s
        setTimeout(() => resolve(5000), 5000);
      });
    });
    
    console.log(`📊 LCP: ${Math.round(lcp)}ms`);
    expect(lcp).toBeLessThan(2500);
  });

  test('FCP should be under 1.8s', async ({ page }) => {
    await page.goto('/');
    
    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const entry = entries[0] as any;
          resolve(entry.startTime);
        }).observe({ type: 'paint', buffered: true });
        
        setTimeout(() => resolve(3000), 3000);
      });
    });
    
    console.log(`📊 FCP: ${Math.round(fcp)}ms`);
    expect(fcp).toBeLessThan(1800);
  });

  test('TTFB should be under 800ms', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.goto('/');
    const ttfb = Date.now() - startTime;
    
    console.log(`📊 TTFB: ${ttfb}ms`);
    expect(response?.status()).toBe(200);
    expect(ttfb).toBeLessThan(800);
  });

  test('CLS should be under 0.1', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be stable
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ type: 'layout-shift', buffered: true });
        
        // Collect for 3 seconds
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    console.log(`📊 CLS: ${cls.toFixed(3)}`);
    expect(cls).toBeLessThan(0.1);
  });

  test('Page load should complete in under 3s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('load');
    const loadTime = Date.now() - startTime;
    
    console.log(`📊 Page Load: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000);
  });
});

test.describe('Core Web Vitals - Admin Dashboard', () => {
  test('Admin LCP should be under 3s', async ({ page }) => {
    // Note: This will fail without auth, but demonstrates the test structure
    await page.goto('/admin');
    
    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          resolve(lastEntry.renderTime || lastEntry.loadTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        setTimeout(() => resolve(5000), 5000);
      });
    });
    
    console.log(`📊 Admin LCP: ${Math.round(lcp)}ms`);
    // More lenient threshold for admin (includes auth redirect)
    expect(lcp).toBeLessThan(3000);
  });
});

test.describe('Bundle Performance', () => {
  test('Total JavaScript size should be reasonable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const jsSize = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;
      
      entries.forEach((entry) => {
        if (entry.name.endsWith('.js')) {
          totalSize += entry.transferSize || 0;
        }
      });
      
      return totalSize;
    });
    
    const jsSizeKB = Math.round(jsSize / 1024);
    console.log(`📊 Total JS: ${jsSizeKB} KB`);
    
    // Should be under 500KB total
    expect(jsSize).toBeLessThan(500 * 1024);
  });

  test('Total CSS size should be reasonable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const cssSize = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      let totalSize = 0;
      
      entries.forEach((entry) => {
        if (entry.name.endsWith('.css')) {
          totalSize += entry.transferSize || 0;
        }
      });
      
      return totalSize;
    });
    
    const cssSizeKB = Math.round(cssSize / 1024);
    console.log(`📊 Total CSS: ${cssSizeKB} KB`);
    
    // Should be under 50KB total
    expect(cssSize).toBeLessThan(50 * 1024);
  });
});

test.describe('Resource Loading', () => {
  test('Images should be lazy loaded', async ({ page }) => {
    await page.goto('/');
    
    const lazyImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => img.loading === 'lazy').length;
    });
    
    console.log(`📊 Lazy images: ${lazyImages}`);
    // At least some images should be lazy loaded
    expect(lazyImages).toBeGreaterThan(0);
  });

  test('Fonts should be optimized', async ({ page }) => {
    await page.goto('/');
    
    const fontDisplay = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      let hasOptimalFontDisplay = false;
      
      styles.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach((rule: any) => {
            if (rule.style?.fontDisplay === 'swap' || rule.style?.fontDisplay === 'optional') {
              hasOptimalFontDisplay = true;
            }
          });
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      });
      
      return hasOptimalFontDisplay;
    });
    
    console.log(`📊 Font Display optimized: ${fontDisplay}`);
    expect(fontDisplay).toBe(true);
  });
});
