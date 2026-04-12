module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/admin',
      ],
      // Number of runs per URL (median will be used)
      numberOfRuns: 3,
      // Chrome flags for consistent testing
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance - Strict CI requirements
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        
        // Core Web Vitals - Session 22 targets
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // Resource sizes - Session 22 bundle optimizations
        'total-byte-weight': ['warn', { maxNumericValue: 512000 }], // 500KB
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        
        // Images - Session 22 lazy loading
        'uses-optimized-images': 'error',
        'modern-image-formats': 'warn',
        'uses-responsive-images': 'warn',
        'offscreen-images': 'error',
        
        // JavaScript - Session 22 code splitting
        'unused-javascript': ['warn', { maxNumericValue: 100000 }], // 100KB max unused
        'unminified-javascript': 'error',
        'legacy-javascript': 'warn',
        'bootup-time': ['warn', { maxNumericValue: 3500 }],
        
        // CSS
        'unused-css-rules': 'warn',
        'unminified-css': 'error',
        
        // Fonts
        'font-display': 'warn',
        
        // Other
        'uses-http2': 'warn',
        'uses-text-compression': 'error',
      },
    },
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
    },
  },
};
