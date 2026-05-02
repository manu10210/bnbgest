import { spawn } from 'node:child_process';

const MAX_ATTEMPTS = Number(process.env.PRISMA_MIGRATE_MAX_ATTEMPTS || 3);
const RETRY_DELAY_MS = Number(process.env.PRISMA_MIGRATE_RETRY_DELAY_MS || 5000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(cmd, ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`prisma migrate deploy exited with code ${code}`));
      }
    });
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    console.log(`[prisma-migrate-retry] Attempt ${attempt}/${MAX_ATTEMPTS}`);
    await runMigrateDeploy();
    console.log('[prisma-migrate-retry] Migration deploy succeeded.');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[prisma-migrate-retry] Attempt ${attempt} failed: ${message}`);

    if (attempt >= MAX_ATTEMPTS) {
      console.error('[prisma-migrate-retry] No attempts remaining. Failing build.');
      process.exit(1);
    }

    console.log(`[prisma-migrate-retry] Retrying in ${RETRY_DELAY_MS}ms...`);
    await sleep(RETRY_DELAY_MS);
  }
}
