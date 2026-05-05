const logger = require('../utils/logger');

/** Wrap async route handlers to catch promise rejections */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Global error handler — must be the LAST middleware registered */
const globalErrorHandler = (err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    logger.error('[Error]', {
      message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
    });
  } else {
    logger.debug('[4xx]', { message, url: req.originalUrl, status });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500
      ? { stack: err.stack }
      : {}),
  });
};

module.exports = { asyncHandler, globalErrorHandler };
