console.warn(
  '[deprecated] Use scripts/prisma-migrate-retry.mjs instead of scripts/prisma-migrate-retry.js'
);

(async () => {
  await import('./prisma-migrate-retry.mjs');
})();
