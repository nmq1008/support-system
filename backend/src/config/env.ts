import dotenv from 'dotenv';

dotenv.config();

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production-hidesk-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  databaseUrl:
    process.env.DATABASE_URL ||
    `postgres://${process.env.PGUSER || 'hidesk'}:${process.env.PGPASSWORD || 'hidesk'}@${
      process.env.PGHOST || 'localhost'
    }:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'hidesk'}`,

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  runMigrations: bool(process.env.RUN_MIGRATIONS, false),
  runSeed: bool(process.env.RUN_SEED, false),

  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxUploadMb: num(process.env.MAX_UPLOAD_MB, 20),

  // ── SMTP (email notifications) ──
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: num(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'HiDesk <no-reply@hidesk.vn>',
  },
  appUrl: process.env.APP_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export type Env = typeof env;
