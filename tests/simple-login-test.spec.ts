import { test, expect } from '@playwright/test';

test.describe('Simple Login Test', () => {
  test('Can login to admin', async ({ page }) => {
    console.log('🌐 Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    console.log('✍️ Filling credentials...');
    await page.fill('#email', 'demo@bnbgest.com');
    await page.fill('#password', 'Demo1234!');
    
    console.log('🚀 Submitting...');
    await page.click('button[type="submit"]');
    
    console.log('⏳ Waiting for redirect...');
    await page.waitForURL('**/admin**', { timeout: 20000 });
    
    console.log('✅ On admin page:', page.url());
    
    // Verify we're authenticated
    await expect(page).toHaveURL(/\/admin/);
    
    console.log('🎉 Test passed!');
  });
});
