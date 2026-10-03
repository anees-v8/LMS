import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized, validated environment config.
 * Fails fast at boot if a required variable is missing.
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
  /** Web-application OAuth client — used both by the mobile app (as
   *  serverClientId, to request a server auth code) and by this backend
   *  (to exchange that code for tokens). Same client works for both. */
  clientId: string;
  clientSecret: string;
  readonly enabled: boolean;
}

export interface AppEnv {
  nodeEnv: string;
  isProd: boolean;
  port: number;
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
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
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
  port: int('PORT', 4000),
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
  cloudinary: {
    cloudName: process.env.CLOUD_NAME,
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  },
};

export default env;
