module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      numberOfRuns: 1,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
    assert: {
      assertions: {
        'categories:performance':    ['warn', { minScore: 0.5 }],
        'categories:accessibility':  ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo':            ['warn', { minScore: 0.8 }],
      },
    },
  },
};
