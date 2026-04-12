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
        chromeFlags: '--no-sandbox --disable-gpu',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        
        // Resource sizes
        'total-byte-weight': ['warn', { maxNumericValue: 512000 }], // 500KB
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        
        // Images
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-responsive-images': 'warn',
        
        // JavaScript
        'unused-javascript': 'warn',
        'unminified-javascript': 'error',
        'legacy-javascript': 'warn',
        
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
