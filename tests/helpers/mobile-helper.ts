import { Page } from '@playwright/test';

/**
 * Check if test is running on mobile viewport
 * Session 20: Mobile testing helper
 */
export function isMobileViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * Check if test is running on tablet viewport
 */
export function isTabletViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport ? viewport.width >= 768 && viewport.width < 1024 : false;
}

/**
 * Open mobile hamburger menu
 */
export async function openMobileMenu(page: Page) {
  if (!isMobileViewport(page)) return;
  
  const hamburger = page.locator('[data-testid="mobile-menu-button"]');
  
  // Check if hamburger exists and is visible
  const isVisible = await hamburger.isVisible().catch(() => false);
  
  if (isVisible) {
    await hamburger.click();
    await page.waitForSelector('[data-testid="mobile-menu"]', { 
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.warn('⚠️  Mobile menu not found, continuing...');
    });
  }
}

/**
 * Close mobile hamburger menu
 */
export async function closeMobileMenu(page: Page) {
  if (!isMobileViewport(page)) return;
  
  const closeButton = page.locator('[data-testid="mobile-menu-close"]');
  
  const isVisible = await closeButton.isVisible().catch(() => false);
  
  if (isVisible) {
    await closeButton.click();
    await page.waitForSelector('[data-testid="mobile-menu"]', { 
      state: 'hidden',
      timeout: 5000,
    }).catch(() => {
      console.warn('⚠️  Mobile menu close failed, continuing...');
    });
  }
}

/**
 * Swipe gesture (for mobile carousels, etc.)
 */
export async function swipe(
  page: Page,
  selector: string,
  direction: 'left' | 'right' | 'up' | 'down'
) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) throw new Error(`Element ${selector} not found or not visible`);
  
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  
  let endX = startX;
  let endY = startY;
  
  const distance = 100;
  
  switch (direction) {
    case 'left':
      endX = startX - distance;
      break;
    case 'right':
      endX = startX + distance;
      break;
    case 'up':
      endY = startY - distance;
      break;
    case 'down':
      endY = startY + distance;
      break;
  }
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Tap (mobile click equivalent)
 */
export async function tap(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.tap();
}

/**
 * Long press (mobile long press gesture)
 */
export async function longPress(page: Page, selector: string, duration: number = 1000) {
  const element = page.locator(selector);
  const box = await element.boundingBox();
  
  if (!box) throw new Error(`Element ${selector} not found or not visible`);
  
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(duration);
  await page.mouse.up();
}

/**
 * Scroll to element (mobile scroll)
 */
export async function scrollToElement(page: Page, selector: string) {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300); // Wait for scroll animation
}
