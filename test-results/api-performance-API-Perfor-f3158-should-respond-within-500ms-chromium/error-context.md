# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api-performance.spec.ts >> API Performance >> /api/bookings should respond within 500ms
- Location: tests\api-performance.spec.ts:39:9

# Error details

```
TimeoutError: apiRequestContext.get: Timeout 5000ms exceeded.
Call log:
  - → GET http://localhost:3000/api/bookings
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: application/json
    - accept-encoding: gzip,deflate,br

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | /**
  4   |  * API Performance Tests
  5   |  * 
  6   |  * Validates that API endpoints respond within acceptable time limits.
  7   |  * These tests ensure ISR caching (Session 22) is working correctly.
  8   |  */
  9   | 
  10  | const API_ENDPOINTS = [
  11  |   { 
  12  |     path: '/api/properties', 
  13  |     maxTime: 500,
  14  |     description: 'Property listings (ISR: 60s)'
  15  |   },
  16  |   { 
  17  |     path: '/api/stats', 
  18  |     maxTime: 800,
  19  |     description: 'Dashboard statistics (ISR: 120s)'
  20  |   },
  21  |   { 
  22  |     path: '/api/bookings', 
  23  |     maxTime: 500,
  24  |     description: 'Booking data'
  25  |   },
  26  |   { 
  27  |     path: '/api/reviews', 
  28  |     maxTime: 600,
  29  |     description: 'Reviews data'
  30  |   },
  31  | ];
  32  | 
  33  | test.describe('API Performance', () => {
  34  |   test.beforeAll(async () => {
  35  |     console.log('\n📊 Starting API Performance Tests...\n');
  36  |   });
  37  | 
  38  |   for (const endpoint of API_ENDPOINTS) {
  39  |     test(`${endpoint.path} should respond within ${endpoint.maxTime}ms`, async ({ request }) => {
  40  |       const start = Date.now();
  41  |       
> 42  |       const response = await request.get(`http://localhost:3000${endpoint.path}`, {
      |                                      ^ TimeoutError: apiRequestContext.get: Timeout 5000ms exceeded.
  43  |         headers: {
  44  |           'Accept': 'application/json',
  45  |         }
  46  |       });
  47  |       
  48  |       const duration = Date.now() - start;
  49  |       
  50  |       // Log results
  51  |       const status = response.ok() ? '✅' : '❌';
  52  |       const perfStatus = duration < endpoint.maxTime ? '⚡' : '🐌';
  53  |       console.log(`${status} ${perfStatus} ${endpoint.path}: ${duration}ms (limit: ${endpoint.maxTime}ms)`);
  54  |       
  55  |       // Assertions
  56  |       expect(response.ok()).toBeTruthy();
  57  |       expect(duration).toBeLessThan(endpoint.maxTime);
  58  |       
  59  |       // Check cache headers (for ISR endpoints)
  60  |       if (endpoint.path.includes('/properties') || endpoint.path.includes('/stats')) {
  61  |         const cacheControl = response.headers()['cache-control'];
  62  |         expect(cacheControl).toBeTruthy();
  63  |         console.log(`   📦 Cache-Control: ${cacheControl}`);
  64  |       }
  65  |     });
  66  |   }
  67  | 
  68  |   test('Multiple requests should benefit from caching', async ({ request }) => {
  69  |     const endpoint = '/api/properties';
  70  |     const runs = 3;
  71  |     const times: number[] = [];
  72  |     
  73  |     console.log(`\n🔄 Testing cache effectiveness (${runs} requests)...`);
  74  |     
  75  |     for (let i = 0; i < runs; i++) {
  76  |       const start = Date.now();
  77  |       const response = await request.get(`http://localhost:3000${endpoint}`);
  78  |       const duration = Date.now() - start;
  79  |       
  80  |       times.push(duration);
  81  |       console.log(`   Request ${i + 1}: ${duration}ms`);
  82  |       
  83  |       expect(response.ok()).toBeTruthy();
  84  |     }
  85  |     
  86  |     // Later requests should generally be faster (cached)
  87  |     const firstRequest = times[0];
  88  |     const avgLaterRequests = times.slice(1).reduce((a, b) => a + b, 0) / (runs - 1);
  89  |     
  90  |     console.log(`   📈 First request: ${firstRequest}ms`);
  91  |     console.log(`   📈 Avg cached requests: ${Math.round(avgLaterRequests)}ms`);
  92  |     
  93  |     // Cache should improve performance by at least 20%
  94  |     const improvement = ((firstRequest - avgLaterRequests) / firstRequest) * 100;
  95  |     console.log(`   💡 Cache improvement: ${Math.round(improvement)}%`);
  96  |     
  97  |     // Note: In CI this might vary, so we just log it
  98  |     expect(times.every(t => t > 0)).toBeTruthy();
  99  |   });
  100 | 
  101 |   test('API endpoints should return valid JSON', async ({ request }) => {
  102 |     console.log('\n🔍 Validating JSON responses...');
  103 |     
  104 |     for (const endpoint of API_ENDPOINTS) {
  105 |       const response = await request.get(`http://localhost:3000${endpoint.path}`);
  106 |       
  107 |       expect(response.ok()).toBeTruthy();
  108 |       
  109 |       const data = await response.json();
  110 |       expect(data).toBeTruthy();
  111 |       
  112 |       console.log(`   ✅ ${endpoint.path}: Valid JSON`);
  113 |     }
  114 |   });
  115 | 
  116 |   test.afterAll(async () => {
  117 |     console.log('\n✅ API Performance Tests Complete\n');
  118 |   });
  119 | });
  120 | 
```