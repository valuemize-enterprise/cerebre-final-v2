const express = require('express');
const { body, validationResult } = require('express-validator');
const { createUser, loginUser, getUserById } = require('../services/auth.service');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

// ── POST /auth/register ───────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
    body('fullName').trim().notEmpty().withMessage('Full name required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, company } = req.body;
    const user = await createUser({ email, password, fullName, company });
    res.status(201).json({ message: 'Account created', user });
  })
);

// ── POST /auth/login ─────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const { user, token } = await loginUser({ email, password });

    res.json({
      message: 'Login successful',
      token,
      user,
    });
  })
);

// ── GET /auth/me ─────────────────────────────────────────────
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  })
);

module.exports = router;
