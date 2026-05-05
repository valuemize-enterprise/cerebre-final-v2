const { verifyToken } = require('../services/auth.service');
const logger = require('../utils/logger');

/** Require a valid JWT. Attaches req.user = { userId, email, role } */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch (err) {
    logger.debug('[Auth] Token verification failed', { error: err.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Require one of the given roles */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole };
