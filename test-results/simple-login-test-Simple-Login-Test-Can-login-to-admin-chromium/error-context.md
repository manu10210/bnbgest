# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: simple-login-test.spec.ts >> Simple Login Test >> Can login to admin
- Location: tests\simple-login-test.spec.ts:4:7

# Error details

```
TimeoutError: page.goto: Timeout 15000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Simple Login Test', () => {
  4  |   test('Can login to admin', async ({ page }) => {
  5  |     console.log('🌐 Navigating to login page...');
> 6  |     await page.goto('http://localhost:3000/login');
     |                ^ TimeoutError: page.goto: Timeout 15000ms exceeded.
  7  |     
  8  |     console.log('✍️ Filling credentials...');
  9  |     await page.fill('#email', 'demo@bnbgest.com');
  10 |     await page.fill('#password', 'Demo1234!');
  11 |     
  12 |     console.log('🚀 Submitting...');
  13 |     await page.click('button[type="submit"]');
  14 |     
  15 |     console.log('⏳ Waiting for redirect...');
  16 |     await page.waitForURL('**/admin**', { timeout: 20000 });
  17 |     
  18 |     console.log('✅ On admin page:', page.url());
  19 |     
  20 |     // Verify we're authenticated
  21 |     await expect(page).toHaveURL(/\/admin/);
  22 |     
  23 |     console.log('🎉 Test passed!');
  24 |   });
  25 | });
  26 | 
```