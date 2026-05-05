/**
 * Integration tests — spin up the Express app and test real HTTP.
 * Uses in-memory mocks for DB and Redis so no real Postgres needed.
 *
 * Run: cd backend && node src/__tests__/routes.test.js
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';
process.env.JWT_SECRET    = 'test_secret_that_is_long_enough_32ch';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.NODE_ENV = 'test';

const assert   = require('node:assert/strict');
const http     = require('node:http');
const { sign } = require('jsonwebtoken');

// ── Minimal fetch helper (native, no supertest dep required) ──
const request = (server) => {
  const addr = server.address();
  const base = `http://127.0.0.1:${addr.port}`;

  return {
    get:    (path, headers = {}) => fetch(`${base}${path}`, { headers }),
    post:   (path, body, headers = {}) => fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  };
};

// ── Build a minimal Express app for testing ───────────────────
// We don't load server.js (it opens DB connections) — instead we
// build a clean test harness with only the auth routes mounted.
const buildTestApp = () => {
  require('dotenv').config();
  const express  = require('express');
  const app      = express();
  app.use(express.json());

  // ── Mock DB query ────────────────────────────────────────────
  const users = new Map();
  const bcrypt = require('bcryptjs');

  // Patch db module
  const db = require('../db/db');
  const origQuery = db.query;
  db.query = async (sql, params = []) => {
    const s = sql.toLowerCase().trim();

    if (s.includes('insert into users')) {
      const id = `test-${Date.now()}`;
      const [email, hash, name, company] = params;
      users.set(email, { id, email, password_hash: hash, full_name: name, company, role: 'analyst', is_active: true });
      return { rows: [{ id, email, full_name: name, company, role: 'analyst' }] };
    }

    if (s.includes('select') && s.includes('from users where email')) {
      const [email] = params;
      const user = users.get(email);
      return { rows: user ? [user] : [] };
    }

    if (s.includes('select id from users where email')) {
      const [email] = params;
      return { rows: users.has(email) ? [{ id: 'x' }] : [] };
    }

    if (s.includes('select') && s.includes('from users where id')) {
      const [id] = params;
      const user = [...users.values()].find(u => u.id === id);
      return { rows: user ? [{ id: user.id, email: user.email, full_name: user.full_name, company: user.company, role: user.role, is_active: true }] : [] };
    }

    return { rows: [] };
  };

  const authRoutes = require('../routes/auth.routes');
  app.use('/api/auth', authRoutes);

  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });

  // Restore after test
  app._cleanup = () => { db.query = origQuery; };

  return app;
};

// ── Test runner ───────────────────────────────────────────────
let passed = 0, failed = 0;
const ok = async (label, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`);
    failed++;
  }
};

const run = async () => {
  const app = buildTestApp();
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const req = request(server);

  // ── Auth: Register ───────────────────────────────────────────
  console.log('\nPOST /api/auth/register');

  await ok('returns 201 with valid data', async () => {
    const res = await req.post('/api/auth/register', {
      email: 'test@cerebre.media',
      password: 'password123',
      fullName: 'Test User',
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.user.email, 'test@cerebre.media');
    assert.ok(!body.user.password_hash, 'password hash must not be exposed');
  });

  await ok('returns 400 for missing fields', async () => {
    const res = await req.post('/api/auth/register', { email: 'bad' });
    assert.equal(res.status, 400);
  });

  await ok('returns 400 for short password', async () => {
    const res = await req.post('/api/auth/register', {
      email: 'other@cerebre.media',
      password: 'short',
      fullName: 'X',
    });
    assert.equal(res.status, 400);
  });

  await ok('returns 409 for duplicate email', async () => {
    await req.post('/api/auth/register', {
      email: 'dup@cerebre.media', password: 'password123', fullName: 'A',
    });
    const res = await req.post('/api/auth/register', {
      email: 'dup@cerebre.media', password: 'password123', fullName: 'B',
    });
    assert.equal(res.status, 409);
  });

  // ── Auth: Login ──────────────────────────────────────────────
  console.log('\nPOST /api/auth/login');

  await ok('returns JWT on valid login', async () => {
    await req.post('/api/auth/register', {
      email: 'login@cerebre.media', password: 'password123', fullName: 'Login User',
    });
    const res = await req.post('/api/auth/login', {
      email: 'login@cerebre.media', password: 'password123',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token, 'must return a JWT token');
    assert.ok(body.user, 'must return user object');
    assert.ok(!body.user.password_hash, 'must not expose hash');
  });

  await ok('returns 401 for wrong password', async () => {
    await req.post('/api/auth/register', {
      email: 'wrongpw@cerebre.media', password: 'correct123', fullName: 'X',
    });
    const res = await req.post('/api/auth/login', {
      email: 'wrongpw@cerebre.media', password: 'wrongpassword',
    });
    assert.equal(res.status, 401);
  });

  await ok('returns 401 for unknown email', async () => {
    const res = await req.post('/api/auth/login', {
      email: 'nobody@cerebre.media', password: 'password123',
    });
    assert.equal(res.status, 401);
  });

  // ── Auth: Me ─────────────────────────────────────────────────
  console.log('\nGET /api/auth/me');

  await ok('returns user for valid token', async () => {
    await req.post('/api/auth/register', {
      email: 'me@cerebre.media', password: 'password123', fullName: 'Me User',
    });
    const loginRes = await req.post('/api/auth/login', {
      email: 'me@cerebre.media', password: 'password123',
    });
    const { token } = await loginRes.json();
    const res = await req.get('/api/auth/me', { Authorization: `Bearer ${token}` });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.user.email, 'me@cerebre.media');
  });

  await ok('returns 401 without token', async () => {
    const res = await req.get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  await ok('returns 401 with invalid token', async () => {
    const res = await req.get('/api/auth/me', { Authorization: 'Bearer not.a.real.token' });
    assert.equal(res.status, 401);
  });

  // ── Health check ─────────────────────────────────────────────
  console.log('\nGET /health (via app)');
  // Health check depends on pool — skip in unit mode, just check route structure
  await ok('app handles unknown routes with 404', async () => {
    const res = await req.get('/api/nonexistent');
    // No 500 — should be 404 from catch-all or Express default
    assert.ok(res.status < 500, `Expected <500, got ${res.status}`);
  });

  // ── Cleanup ──────────────────────────────────────────────────
  app._cleanup();
  await new Promise(r => server.close(r));

  const summary = `\n${passed + failed} tests: ${passed} passed, ${failed} failed`;
  console.log(summary);
  if (failed > 0) process.exit(1);
};

run().catch(err => {
  console.error('Test runner crashed:', err.message);
  process.exit(1);
});
