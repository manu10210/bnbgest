import { test } from '@playwright/test';
import { setupAuth } from '../helpers/auth-helper';
import { takeElementScreenshot } from '../helpers/screenshot-helper';

test.describe('Visual Regression - Components', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('Sidebar - Navigation menu', async ({ page }) => {
    await page.goto('/admin');
    
    const sidebar = page.locator('[data-testid="admin-sidebar"]');
    const exists = await sidebar.count() > 0;
    
    if (exists) {
      await takeElementScreenshot(page, '[data-testid="admin-sidebar"]', 'sidebar-nav');
    }
  });

  test('Tab Navigation - Active state', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(300);
    
    const tab = page.locator('[data-testid="bookings-tab"]');
    const exists = await tab.count() > 0;
    
    if (exists) {
      await takeElementScreenshot(page, '[data-testid="bookings-tab"]', 'tab-active');
    }
  });

  test('Button - Primary default', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(300);
    
    const addButton = page.locator('[data-testid="add-guest-button"]');
    const exists = await addButton.count() > 0;
    
    if (exists) {
      await takeElementScreenshot(page, '[data-testid="add-guest-button"]', 'button-primary');
    }
  });

  test('Button - Primary hover', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(300);
    
    const addButton = page.locator('[data-testid="add-guest-button"]');
    const exists = await addButton.count() > 0;
    
    if (exists) {
      await addButton.hover();
      await page.waitForTimeout(200);
      await takeElementScreenshot(page, '[data-testid="add-guest-button"]', 'button-primary-hover');
    }
  });

  test('Modal - Guest form (if exists)', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(300);
    
    const addButton = page.locator('[data-testid="add-guest-button"]');
    const buttonExists = await addButton.count() > 0;
    
    if (buttonExists) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      const modal = page.locator('[data-testid="guest-modal"]');
      const modalExists = await modal.count() > 0;
      
      if (modalExists) {
        await takeElementScreenshot(page, '[data-testid="guest-modal"]', 'modal-guest-form');
      }
    }
  });

  test('Form - Validation errors (if exists)', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="guests-tab"]');
    await page.waitForTimeout(300);
    
    const addButton = page.locator('[data-testid="add-guest-button"]');
    const buttonExists = await addButton.count() > 0;
    
    if (buttonExists) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Try to submit empty form
      const submitButton = page.locator('[data-testid="submit-guest"]');
      const submitExists = await submitButton.count() > 0;
      
      if (submitExists) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        const form = page.locator('[data-testid="guest-form"]');
        const formExists = await form.count() > 0;
        
        if (formExists) {
          await takeElementScreenshot(page, '[data-testid="guest-form"]', 'form-validation-errors');
        }
      }
    }
  });

  test('KPI Cards - Stats display', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for any stat card
    const statCards = page.locator('[class*="glass"]').first();
    const exists = await statCards.count() > 0;
    
    if (exists) {
      await takeElementScreenshot(page, '[class*="glass"]', 'kpi-card');
    }
  });

  test('Table - Data rows (if exists)', async ({ page }) => {
    await page.goto('/admin');
    await page.click('[data-testid="bookings-tab"]');
    await page.waitForTimeout(500);
    
    const table = page.locator('table').first();
    const exists = await table.count() > 0;
    
    if (exists) {
      await takeElementScreenshot(page, 'table', 'table-bookings');
    }
  });
});
