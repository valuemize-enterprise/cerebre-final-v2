const Bull = require('bull');
const config = require('../config');
const logger = require('../utils/logger');

// ── Queue definitions ─────────────────────────────────────────
const ocrQueue = new Bull('ocr-queue', {
  redis: config.redis.url,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const analysisQueue = new Bull('analysis-queue', {
  redis: config.redis.url,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    timeout: 120_000, // 2 min — AI calls can be slow
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// ── Queue event logging ────────────────────────────────────────
[ocrQueue, analysisQueue].forEach((q) => {
  q.on('failed', (job, err) => {
    logger.error(`[Queue] Job failed — ${q.name}`, {
      jobId: job.id,
      data: job.data,
      error: err.message,
      attemptsMade: job.attemptsMade,
    });
  });
  q.on('stalled', (job) => {
    logger.warn(`[Queue] Job stalled — ${q.name}`, { jobId: job.id });
  });
});

module.exports = { ocrQueue, analysisQueue };
