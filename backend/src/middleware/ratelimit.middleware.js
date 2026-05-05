const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let redis;
try {
  redis = new Redis(config.redis.url, { lazyConnect: true });
  redis.on('error', (e) => logger.warn('[RateLimit] Redis error', { error: e.message }));
} catch {
  redis = null;
}

/**
 * Per-user sliding window rate limiter backed by Redis.
 * Falls back to allowing the request if Redis is unavailable.
 *
 * @param {object} opts
 * @param {string} opts.keyPrefix   - Redis key prefix, e.g. 'ai_analysis'
 * @param {number} opts.windowSec   - Window size in seconds
 * @param {number} opts.maxRequests - Max requests per window per user
 * @param {string} opts.message     - Error message when limit exceeded
 */
const perUserRateLimit = ({ keyPrefix, windowSec, maxRequests, message }) => {
  return async (req, res, next) => {
    if (!redis || !req.user?.userId) return next();

    const key = `ratelimit:${keyPrefix}:${req.user.userId}`;

    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSec);
      const results = await pipeline.exec();
      const count = results[0][1];

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - count));
      res.setHeader('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + windowSec);

      if (count > maxRequests) {
        logger.warn('[RateLimit] Per-user limit exceeded', {
          userId: req.user.userId,
          key: keyPrefix,
          count,
          limit: maxRequests,
        });
        return res.status(429).json({
          error: message || 'Rate limit exceeded — please wait before trying again',
          retryAfter: windowSec,
        });
      }
    } catch (err) {
      // Don't block requests if Redis fails
      logger.warn('[RateLimit] Redis check failed, allowing request', { error: err.message });
    }

    next();
  };
};

// ── Pre-built limiters ────────────────────────────────────────

/** Max 10 AI analyses per user per hour */
const analysisRateLimit = perUserRateLimit({
  keyPrefix: 'analysis',
  windowSec: 3600,
  maxRequests: 10,
  message: 'Analysis limit reached — maximum 10 reports per hour per user',
});

/** Max 5 retries per user per 15 minutes */
const retryRateLimit = perUserRateLimit({
  keyPrefix: 'retry',
  windowSec: 900,
  maxRequests: 5,
  message: 'Retry limit reached — maximum 5 retries per 15 minutes',
});

/** Max 30 uploads per user per hour */
const uploadUserRateLimit = perUserRateLimit({
  keyPrefix: 'upload',
  windowSec: 3600,
  maxRequests: 30,
  message: 'Upload limit reached — maximum 30 files per hour',
});

module.exports = {
  perUserRateLimit,
  analysisRateLimit,
  retryRateLimit,
  uploadUserRateLimit,
};
