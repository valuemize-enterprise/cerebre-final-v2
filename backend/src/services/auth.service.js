const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../db/db');
const config = require('../config');
const logger = require('../utils/logger');

const SALT_ROUNDS = 12;

// ── Token management ─────────────────────────────────────────

const generateToken = (userId, email, role) =>
  jwt.sign({ userId, email, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

const verifyToken = (token) => jwt.verify(token, config.jwt.secret);

// ── Password ─────────────────────────────────────────────────

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

// ── User CRUD ─────────────────────────────────────────────────

const createUser = async ({ email, password, fullName, company }) => {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    `INSERT INTO users (email, password_hash, full_name, company)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, company, role, created_at`,
    [email.toLowerCase(), passwordHash, fullName, company || 'Cerebre Media Africa']
  );
  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await query(
    'SELECT id, email, full_name, company, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const loginUser = async ({ email, password }) => {
  const result = await query(
    'SELECT id, email, password_hash, full_name, company, role, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  const user = result.rows[0];

  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }
  if (!user.is_active) {
    throw Object.assign(new Error('Account disabled'), { statusCode: 403 });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
  }

  const token = generateToken(user.id, user.email, user.role);
  const { password_hash, ...safeUser } = user;

  logger.debug('[Auth] Login success', { userId: user.id, email: user.email });
  return { user: safeUser, token };
};

module.exports = { generateToken, verifyToken, createUser, getUserById, loginUser };
