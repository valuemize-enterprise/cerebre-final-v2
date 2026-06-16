/**
 * server.js — PRODUCTION HARDENED
 *
 * FIXES vs previous version:
 * 1. CORS wildcard ('*') removed — uses explicit origin validation
 * 2. Global IP rate limiter applied before any route
 * 3. Input sanitization applied globally
 * 4. trust proxy set correctly for Railway/Render behind load balancer
 * 5. Graceful shutdown waits for in-flight requests
 * 6. Webhook routes get raw body BEFORE json parser (signature verification fix)
 * 7. 404 and global error handler return consistent JSON format
 * 8. Security headers hardened
 */

require('dotenv').config();
const { validateEnv } = require('./config/validate-env');
validateEnv();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const { Server } = require('socket.io');
const config     = require('./config');
const logger     = require('./utils/logger');
const { buildCorsConfig, sanitizeInput, ipRateLimiter } = require('./middleware/security.middleware');

// Routes
const authRoutes         = require('./routes/auth.routes');
const uploadRoutes       = require('./routes/upload.routes');
const reportRoutes       = require('./routes/reports.routes');
const metricsRoutes      = require('./routes/metrics.routes');
const settingsRoutes     = require('./routes/settings.routes');
const adminRoutes        = require('./routes/admin.routes');
const goalsRoutes        = require('./routes/goals.routes');
const scorecardsRoutes   = require('./routes/scorecards.routes');
const extendedRoutes     = require('./routes/extended.routes');
const webhooksRoutes     = require('./routes/webhooks.routes');
const platformConnRoutes = require('./routes/platform-connections.routes');
const clientPortalRoutes    = require('./routes/client-portal.routes');
const extendedClientRoutes  = require('./routes/extended.routes');
const agencyPerfRoutes      = require('./routes/agency-performance.routes');

const { ocrQueue, analysisQueue } = require('./workers/queue');

const app    = express();
const server = http.createServer(app);

// ── Trust proxy (Railway, Render, Heroku sit behind a load balancer) ──
// Without this, req.ip gives the load balancer IP, breaking IP rate limits
app.set('trust proxy', 1);

// ── Socket.io ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: buildCorsConfig(),
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  const timeout = setTimeout(() => socket.disconnect(true), 10000); // auth within 10s
  socket.on('authenticate', (token) => {
    clearTimeout(timeout);
    try {
      const jwt = require('jsonwebtoken');
      const { userId } = jwt.verify(token, config.jwt.secret);
      socket.join(`user:${userId}`);
      socket.userId = userId;
    } catch {
      socket.disconnect(true);
    }
  });
  socket.on('disconnect', () => {
    clearTimeout(timeout);
  });
});
app.set('io', io);

// ── Security headers ──────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.anthropic.com'],
    },
  },
  // Hide that we're using Express
  xPoweredBy: false,
}));

// ── CORS — strict, no wildcard ────────────────────────────────────────
app.use(cors(buildCorsConfig()));

// ── Global IP rate limiter (DDoS protection) ──────────────────────────
app.use(ipRateLimiter);

// ── Webhook routes: must capture RAW body BEFORE json parser ─────────
// This is critical for signature verification (Meta, Shopify)
app.use('/api/webhooks/meta',    express.raw({ type: 'application/json', limit: '1mb' }));
app.use('/api/webhooks/shopify', express.raw({ type: 'application/json', limit: '1mb' }));

// ── Body parsing ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Global input sanitization ─────────────────────────────────────────
app.use(sanitizeInput);

// ── Request logger (dev only, not sensitive data) ─────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ── Health check (no auth, no rate limit) ────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await require('./db/db').query('SELECT 1');
    const uptime = Math.floor(process.uptime());
    res.json({
      status: 'ok',
      db: 'connected',
      uptime: `${uptime}s`,
      version: process.env.npm_package_version || '2.0.0',
    });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected' });
  }
});

// ── API Routes ────────────────────────────────────────────────────────
// ORDER MATTERS: specific routes before catch-all extended routes
app.use('/api/auth',                authRoutes);
app.use('/api/upload',              uploadRoutes);
app.use('/api/reports',             reportRoutes);
app.use('/api/metrics',             metricsRoutes);
app.use('/api/settings',            settingsRoutes);
app.use('/api/admin',               adminRoutes);
app.use('/api/goals',               goalsRoutes);
app.use('/api/scorecards',          scorecardsRoutes);
app.use('/api/platform-connections', platformConnRoutes);
app.use('/api/webhooks',            webhooksRoutes);
app.use('/api/client',              clientPortalRoutes);
app.use('/api',                     extendedClientRoutes);
app.use('/api',                     agencyPerfRoutes);
app.use('/api',                     extendedRoutes); // catch-all LAST

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// ── Global error handler ──────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;

  // Don't leak stack traces in production
  const payload = {
    error: process.env.NODE_ENV === 'production'
      ? (status < 500 ? err.message : 'Internal server error')
      : err.message,
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  // Log 5xx errors
  if (status >= 500) {
    logger.error('[Server] Unhandled error', {
      error: err.message,
      path: req.path,
      method: req.method,
      stack: err.stack,
    });
  }

  // Never send a response if headers already sent (e.g. streaming)
  if (res.headersSent) return;
  res.status(status).json(payload);
});

// ── Queue → WebSocket bridge ──────────────────────────────────────────
const bridge = (queue, event) => {
  queue.on('global:completed', (_, result) => {
    try {
      const d = typeof result === 'string' ? JSON.parse(result) : result;
      if (d?.userId) io.to(`user:${d.userId}`).emit(event, d);
    } catch { /* malformed queue result — ignore */ }
  });
  queue.on('global:failed', (job, err) => {
    logger.warn(`[Queue] Job ${job} failed`, { error: err?.message });
  });
};
bridge(ocrQueue,      'ocr:update');
bridge(analysisQueue, 'analysis:update');

// ── Start server ──────────────────────────────────────────────────────
const PORT = config.app.port || 4000;
let activeConnections = 0;
server.on('connection', conn => {
  activeConnections++;
  conn.on('close', () => activeConnections--);
});

server.listen(PORT, () => {
  logger.info(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  logger.info(`[Server] CORS origin: ${process.env.FRONTEND_URL || 'NOT SET — CORS will fail in production'}`);
});

// ── Graceful shutdown — waits for in-flight requests ─────────────────
let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`[Server] ${signal} received — shutting down gracefully`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('[Server] HTTP server closed');
    try {
      await Promise.all([ocrQueue.close(), analysisQueue.close()]);
      await require('./db/db').pool.end();
      logger.info('[Server] All resources released');
    } catch (e) {
      logger.error('[Server] Shutdown error', { error: e.message });
    }
    process.exit(0);
  });

  // Force kill after 30s
  setTimeout(() => {
    logger.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 30_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error('[Server] Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled promise rejection', { reason: String(reason) });
});

module.exports = { app, server };
