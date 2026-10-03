/**
 * Centralized, validated environment config.
 * Fails fast (throws at import time) if a required variable is missing —
 * this runs on every cold start in serverless, which is the correct
 * failure mode there (surfaces immediately in every invocation's logs
 * rather than a server that silently never started).
 *
 * Ported from the Express backend's src/config/env.ts — logic unchanged.
 * Next.js loads .env/.env.local itself, so no dotenv.config() call here.
 * No PORT — the platform (Vercel) assigns that, not the app.
 */
function required(key: string): string {
  const val = process.env[key];
  if (val === undefined || val === '') {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return val;
}

/** Required env var that must also be a long random secret (spec: >=64 chars). */
function requiredSecret(key: string, minLen = 64): string {
  const val = required(key);
  if (val.length < minLen) {
    throw new Error(
      `[env] ${key} must be at least ${minLen} characters (got ${val.length}). ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
    );
  }
  return val;
}

function optional(key: string, fallback: string): string {
  const val = process.env[key];
  return val === undefined || val === '' ? fallback : val;
}

function bool(key: string, fallback = false): boolean {
  const val = process.env[key];
  if (val === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
}

function int(key: string, fallback: number): number {
  const val = process.env[key];
  const n = parseInt(val ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  from: string;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface RazorpayConfig {
  keyId: string;
  secret: string;
  readonly enabled: boolean;
}

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  readonly enabled: boolean;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  readonly enabled: boolean;
}

export interface AppEnv {
  nodeEnv: string;
  isProd: boolean;
  corsOrigins: string[];
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  billing: {
    trialDays: number;
    graceDays: number;
    defaultAmount: number;
  };
  razorpay: RazorpayConfig;
  firebase: FirebaseConfig;
  googleOAuth: GoogleOAuthConfig;
  notify: {
    email: EmailConfig;
    telegram: TelegramConfig;
  };
  resend: {
    apiKey: string;
    from: string;
    get enabled(): boolean;
  };
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  cron: {
    secret: string;
  };
  whatsapp: {
    token: string;
    phoneId: string;
  };
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';

// CORS_ORIGINS must be an explicit allowlist in production — never fall back
// to '*', which (combined with credentials:true) would reflect any origin.
const corsOriginsRaw = optional('CORS_ORIGINS', '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (isProd && (corsOriginsRaw.length === 0 || corsOriginsRaw.includes('*'))) {
  throw new Error(
    '[env] CORS_ORIGINS must be set to an explicit comma-separated list of allowed origins in production (wildcard "*" is not permitted).'
  );
}

export const env: AppEnv = {
  nodeEnv,
  isProd,
  corsOrigins: corsOriginsRaw,

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: requiredSecret('JWT_ACCESS_SECRET'),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET'),
    accessTtl: optional('ACCESS_TOKEN_TTL', '15m'),
    refreshTtl: optional('REFRESH_TOKEN_TTL', '30d'),
  },

  billing: {
    trialDays: int('TRIAL_DAYS', 7),
    graceDays: int('BILLING_GRACE_DAYS', 2),
    defaultAmount: int('DEFAULT_PLAN_AMOUNT', 2500),
  },

  razorpay: {
    keyId: optional('RAZORPAY_KEY_ID', ''),
    secret: optional('RAZORPAY_SECRET', ''),
    get enabled(): boolean {
      return Boolean(this.keyId && this.secret && !this.keyId.includes('xxxx'));
    },
  },

  firebase: {
    projectId: optional('FIREBASE_PROJECT_ID', ''),
    clientEmail: optional('FIREBASE_CLIENT_EMAIL', ''),
    // Service-account keys are shipped as JSON with literal "\n" escapes;
    // .env can't hold real newlines in one value, so unescape them here.
    privateKey: optional('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
    get enabled(): boolean {
      return Boolean(this.projectId && this.clientEmail && this.privateKey);
    },
  },

  whatsapp: {
    token: optional('WHATSAPP_TOKEN', ''),
    phoneId: optional('WHATSAPP_PHONE_ID', ''),
  },

  googleOAuth: {
    clientId: optional('GOOGLE_OAUTH_CLIENT_ID', ''),
    clientSecret: optional('GOOGLE_OAUTH_CLIENT_SECRET', ''),
    get enabled(): boolean {
      return Boolean(this.clientId && this.clientSecret);
    },
  },

  notify: {
    email: {
      enabled: bool('NOTIFY_EMAIL_ENABLED', false),
      host: optional('SMTP_HOST', ''),
      port: int('SMTP_PORT', 587),
      user: optional('SMTP_USER', ''),
      pass: optional('SMTP_PASS', ''),
      to: optional('NOTIFY_EMAIL_TO', ''),
      from: optional('NOTIFY_EMAIL_FROM', 'Campus <no-reply@campusweb.co.in>'),
    },
    telegram: {
      enabled: bool('TELEGRAM_NOTIFY_ENABLED', false),
      botToken: optional('TELEGRAM_BOT_TOKEN', ''),
      chatId: optional('TELEGRAM_CHAT_ID', ''),
    },
  },
  // Tenant-facing automated emails (fee due, attendance, etc.) — separate
  // from notify.email above, which is SMTP-based and only alerts the
  // platform owner about new leads. Gated per-tenant by the 'email_notifications'
  // plan feature in featureGuard.
  resend: {
    apiKey: optional('RESEND_API_KEY', ''),
    from: optional('RESEND_FROM_EMAIL', 'Campus <notifications@campusweb.co.in>'),
    get enabled(): boolean {
      return Boolean(this.apiKey);
    },
  },
  cloudinary: {
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  },

  // Shared secret Vercel Cron / cron-job.org must send back so /api/cron/*
  // routes can't be triggered by anyone who finds the URL.
  cron: {
    secret: optional('CRON_SECRET', ''),
  },
};

export default env;
