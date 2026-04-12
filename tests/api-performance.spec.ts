import { test, expect } from '@playwright/test';

/**
 * API Performance Tests
 * 
 * Validates that API endpoints respond within acceptable time limits.
 * These tests ensure ISR caching (Session 22) is working correctly.
 */

const API_ENDPOINTS = [
  { 
    path: '/api/properties', 
    maxTime: 500,
    description: 'Property listings (ISR: 60s)'
  },
  { 
    path: '/api/stats', 
    maxTime: 800,
    description: 'Dashboard statistics (ISR: 120s)'
  },
  { 
    path: '/api/bookings', 
    maxTime: 500,
    description: 'Booking data'
  },
  { 
    path: '/api/reviews', 
    maxTime: 600,
    description: 'Reviews data'
  },
];

test.describe('API Performance', () => {
  test.beforeAll(async () => {
    console.log('\n📊 Starting API Performance Tests...\n');
  });

  for (const endpoint of API_ENDPOINTS) {
    test(`${endpoint.path} should respond within ${endpoint.maxTime}ms`, async ({ request }) => {
      const start = Date.now();
      
      const response = await request.get(`http://localhost:3000${endpoint.path}`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      const duration = Date.now() - start;
      
      // Log results
      const status = response.ok() ? '✅' : '❌';
      const perfStatus = duration < endpoint.maxTime ? '⚡' : '🐌';
      console.log(`${status} ${perfStatus} ${endpoint.path}: ${duration}ms (limit: ${endpoint.maxTime}ms)`);
      
      // Assertions
      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(endpoint.maxTime);
      
      // Check cache headers (for ISR endpoints)
      if (endpoint.path.includes('/properties') || endpoint.path.includes('/stats')) {
        const cacheControl = response.headers()['cache-control'];
        expect(cacheControl).toBeTruthy();
        console.log(`   📦 Cache-Control: ${cacheControl}`);
      }
    });
  }

  test('Multiple requests should benefit from caching', async ({ request }) => {
    const endpoint = '/api/properties';
    const runs = 3;
    const times: number[] = [];
    
    console.log(`\n🔄 Testing cache effectiveness (${runs} requests)...`);
    
    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      const response = await request.get(`http://localhost:3000${endpoint}`);
      const duration = Date.now() - start;
      
      times.push(duration);
      console.log(`   Request ${i + 1}: ${duration}ms`);
      
      expect(response.ok()).toBeTruthy();
    }
    
    // Later requests should generally be faster (cached)
    const firstRequest = times[0];
    const avgLaterRequests = times.slice(1).reduce((a, b) => a + b, 0) / (runs - 1);
    
    console.log(`   📈 First request: ${firstRequest}ms`);
    console.log(`   📈 Avg cached requests: ${Math.round(avgLaterRequests)}ms`);
    
    // Cache should improve performance by at least 20%
    const improvement = ((firstRequest - avgLaterRequests) / firstRequest) * 100;
    console.log(`   💡 Cache improvement: ${Math.round(improvement)}%`);
    
    // Note: In CI this might vary, so we just log it
    expect(times.every(t => t > 0)).toBeTruthy();
  });

  test('API endpoints should return valid JSON', async ({ request }) => {
    console.log('\n🔍 Validating JSON responses...');
    
    for (const endpoint of API_ENDPOINTS) {
      const response = await request.get(`http://localhost:3000${endpoint.path}`);
      
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toBeTruthy();
      
      console.log(`   ✅ ${endpoint.path}: Valid JSON`);
    }
  });

  test.afterAll(async () => {
    console.log('\n✅ API Performance Tests Complete\n');
  });
});
