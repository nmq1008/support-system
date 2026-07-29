import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { pool } from './config/db';
import { runMigrations } from './db/migrate';
import { seed } from './db/seed';
import { demoSeed } from './db/demo-seed';
import { initRealtime } from './realtime/io';

async function bootstrap() {
  if (env.runMigrations) {
    await runMigrations();
  }
  // RUN_DEMO_SEED takes precedence: builds the 30-org operating dataset once
  // (idempotent — skips if the DB already has data). Otherwise the small seed.
  if (env.runDemoSeed) {
    try {
      await demoSeed({ skipIfSeeded: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[demo-seed] skipped/failed:', (err as Error).message);
    }
  } else if (env.runSeed) {
    try {
      await seed();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[seed] skipped/failed:', (err as Error).message);
    }
  }

  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  HiDesk API listening on http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`  Swagger:  http://localhost:${env.port}/api/docs\n`);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[bootstrap] fatal', err);
  pool.end().finally(() => process.exit(1));
});

// Graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    // eslint-disable-next-line no-console
    console.log(`\n[${sig}] shutting down`);
    pool.end().finally(() => process.exit(0));
  });
}
