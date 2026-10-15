import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';

import env from './config/env.js';
import logger from './utils/logger.js';
import { healthCheck } from './config/db.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { scheduleBillingJob } from './jobs/billing.job.js';
import { scheduleTestReminderJob } from './jobs/testReminder.job.js';
import { scheduleFeeReminderJob } from './jobs/feeReminder.job.js';
import { scheduleLiveClassReminderJob } from './jobs/liveClassReminder.job.js';

// Load OpenAPI spec (works from both tsx dev mode and compiled dist/)
const openApiSpec = YAML.parse(
  readFileSync(join(process.cwd(), 'docs/openapi.yml'), 'utf-8')
);


// Routes
import authRoutes from './routes/auth.routes.js';
import leadRoutes from './routes/lead.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import adminRoutes from './routes/admin.routes.js';
import teacherRoutes from './routes/teacher.routes.js';
import studentRoutes from './routes/student.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import publicRoutes from './routes/public.routes.js';

const app = express();

// ── Security & parsing ──
app.use(helmet());
const corsIsWildcard = env.corsOrigins.includes('*');
if (corsIsWildcard) {
  logger.warn('CORS_ORIGINS is unset/"*" — allowing all origins WITHOUT credentials (dev only; not permitted in production)');
}
app.use(
  cors({
    origin: corsIsWildcard ? true : env.corsOrigins,
    // Reflecting any origin ("*") must never be combined with credentials — that
    // would let any website make authenticated cross-site requests.
    credentials: !corsIsWildcard,
  })
);
app.use(
  express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
// Custom request/response logger for detailed readable terminal output
app.use(requestLogger);
app.use(globalLimiter);

// ── Swagger UI (/docs) — development only ──────────────────────────────────
if (!env.isProd) {
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'Campus API Docs',
      customCss: '.swagger-ui .topbar { background-color: #1e293b; } .swagger-ui .topbar-wrapper img { display: none; } .swagger-ui .topbar-wrapper::before { content: "Campus API"; color: white; font-size: 1.2rem; font-weight: bold; }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    })
  );
  logger.info(`Swagger UI available at http://localhost:${env.port}/docs`);
}

// ── Health ──
app.get('/health', async (_req: Request, res: Response) => {
  let db = false;
  try {
    db = await healthCheck();
  } catch {
    db = false;
  }
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db, ts: new Date().toISOString() });
});

// ── API v1 ──
const api = express.Router();
api.use('/auth', authRoutes);
api.use('/leads', leadRoutes); // public demo bookings
api.use('/public', publicRoutes); // unauthenticated public data (plans etc.)
api.use('/superadmin', superadminRoutes);
api.use('/admin', adminRoutes);
api.use('/teacher', teacherRoutes);
api.use('/student', studentRoutes);
api.use('/payments', paymentRoutes);
app.use('/api/v1', api);

// ── 404 + error handler (must be last) ──
app.use(notFoundHandler);
app.use(errorHandler);

// ── Boot ──
const server = app.listen(env.port, '0.0.0.0', () => {
  logger.info(`Campus API listening on :${env.port}`, { env: env.nodeEnv });
  scheduleBillingJob();
  scheduleTestReminderJob();
  scheduleFeeReminderJob();
  scheduleLiveClassReminderJob();
});

// Graceful shutdown
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.on(sig, () => {
    logger.info(`${sig} received, shutting down`);
    server.close(() => process.exit(0));
  });
}

export default app;
