import { Page, expect } from '@playwright/test';

/**
 * Take screenshot and compare with baseline
 * Session 20: Visual regression testing helper
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
    mask?: string[]; // CSS selectors to mask dynamic content
  }
) {
  // Mask dynamic content (dates, IDs, etc.)
  if (options?.mask) {
    for (const selector of options.mask) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        await elements.evaluateAll(elements => {
          elements.forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });
      }
    }
  }

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  // Wait for images to load
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    console.warn('⚠️  Network not idle, continuing with screenshot...');
  });

  // Wait for animations to complete (CSS transition + prefers-reduced-motion)
  await page.waitForTimeout(200);

  // Take screenshot
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options?.fullPage ?? false,
    clip: options?.clip,
  });
}

/**
 * Take screenshot of specific element
 */
export async function takeElementScreenshot(
  page: Page,
  selector: string,
  name: string
) {
  const element = page.locator(selector);
  await expect(element).toBeVisible({ timeout: 10000 });
  
  // Wait for element to be stable
  await page.waitForTimeout(200);
  
  await expect(element).toHaveScreenshot(`${name}.png`);
}

/**
 * Take screenshot with multiple viewports (responsive testing)
 */
export async function takeResponsiveScreenshots(
  page: Page,
  name: string,
  viewports: Array<{ width: number; height: number; suffix: string }>
) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(300); // Wait for resize
    await takeScreenshot(page, `${name}-${viewport.suffix}`);
  }
}
