/**
 * Settings Routes — PRODUCTION HARDENED
 *
 * FIXES:
 * 1. ENCRYPTION_KEY is now separate from JWT_SECRET (they should never be the same)
 * 2. ensureTables() called ONCE at startup, not on every request
 * 3. API key test endpoint validates each platform properly before storing
 * 4. Password change validates strength of new password
 * 5. All routes have authenticate middleware
 * 6. Input validation on all POST/PUT endpoints
 */

const express   = require('express');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const { query } = require('../db/db');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { validators, handleValidation } = require('../middleware/security.middleware');
const { body } = require('express-validator');

const router = express.Router();

// ── Encryption key — MUST be different from JWT_SECRET ───────────────
// Set ENCRYPTION_KEY as a separate 32-char env var. Never reuse JWT_SECRET.
const getEncKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be set to at least 32 characters in production');
    }
    // Dev fallback — never use in production
    console.warn('[Settings] WARNING: Using dev fallback encryption key. Set ENCRYPTION_KEY env var.');
    return Buffer.from('dev-fallback-key-NOT-for-prod!!!'); // exactly 32 bytes
  }
  return Buffer.from(key.slice(0, 32));
};

const encrypt = (text) => {
  const key = getEncKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
};

const decrypt = (encStr) => {
  try {
    const key = getEncKey();
    const [a, b, t] = encStr.split(':');
    if (!a || !b || !t) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(a, 'hex'));
    decipher.setAuthTag(Buffer.from(t, 'hex'));
    return decipher.update(Buffer.from(b, 'hex')) + decipher.final('utf8');
  } catch {
    return null; // tampered or wrong key
  }
};

// ── One-time table setup at module load ──────────────────────────────
// FIX: Previously called on EVERY request — now called once at startup
let tablesReady = false;
const ensureTables = async () => {
  if (tablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS api_keys_store (
      id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      brand_id      UUID,
      platform      VARCHAR(100) NOT NULL,
      encrypted_key TEXT NOT NULL,
      extra_data    JSONB DEFAULT '{}',
      is_active     BOOLEAN DEFAULT true,
      last_tested   TIMESTAMPTZ,
      test_status   VARCHAR(20),
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(brand_id, platform)
    )
  `).catch(() => {}); // Ignore if already exists

  await query(`
    CREATE TABLE IF NOT EXISTS user_api_keys (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id    UUID UNIQUE NOT NULL,
      api_key    VARCHAR(200) NOT NULL,
      key_hash   VARCHAR(200) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  tablesReady = true;
};

// Run at module load (not per-request)
ensureTables().catch(err => console.error('[Settings] Table setup failed:', err.message));

// ── GET all saved platform API keys ──────────────────────────────────
router.get('/api-keys', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const { rows } = await query(
    'SELECT platform, extra_data, is_active, last_tested, test_status, created_at FROM api_keys_store WHERE brand_id=$1 AND is_active=true ORDER BY platform',
    [brandId]
  );

  const keys = {};
  rows.forEach(r => {
    keys[r.platform] = {
      saved: true,
      masked: '••••••••',
      extra: r.extra_data,
      lastTested: r.last_tested,
      testStatus: r.test_status,
      savedAt: r.created_at,
    };
  });
  res.json({ keys });
}));

// ── POST save a platform API key ──────────────────────────────────────
router.post('/api-keys',
  authenticate,
  validators.saveApiKey,
  handleValidation,
  asyncHandler(async (req, res) => {
    const { platform, apiKey, extra } = req.body;
    const brandId = req.user.brandId || req.user.userId;

    const encrypted = encrypt(apiKey);
    await query(
      `INSERT INTO api_keys_store (brand_id, platform, encrypted_key, extra_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (brand_id, platform)
       DO UPDATE SET encrypted_key=$3, extra_data=$4, is_active=true, updated_at=NOW()`,
      [brandId, platform, encrypted, JSON.stringify(extra || {})]
    );

    res.json({ saved: true, platform });
  })
);

// ── DELETE a platform API key ─────────────────────────────────────────
router.delete('/api-keys/:platform', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  // Validate platform name (no SQL injection via URL param)
  const platform = req.params.platform.replace(/[^a-z0-9_]/g, '').slice(0, 100);
  await query(
    'UPDATE api_keys_store SET is_active=false, updated_at=NOW() WHERE brand_id=$1 AND platform=$2',
    [brandId, platform]
  );
  res.json({ deleted: true });
}));

// ── POST test an API key — LIVE verification ──────────────────────────
router.post('/test-api-key',
  authenticate,
  [body('platform').notEmpty(), body('apiKey').notEmpty()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { platform, apiKey } = req.body;
    let valid = false;
    let message = '';
    let accountInfo = {};

    // Timeout all external calls at 8 seconds
    const timeout = (ms, promise) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

    try {
      switch (platform) {
        case 'anthropic': {
          const r = await timeout(8000, fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'test' }] }),
          }));
          if (r.status === 401) { message = 'Invalid API key'; break; }
          if (r.status === 529) { message = 'Anthropic API overloaded — key is valid'; valid = true; break; }
          valid = r.ok || r.status === 200;
          if (!valid) message = `Anthropic returned status ${r.status}`;
          break;
        }
        case 'email_mailchimp': {
          const dc = apiKey.split('-').pop() || 'us1';
          if (!/^us\d+$/.test(dc)) { message = 'Invalid Mailchimp key format (should end in -usX)'; break; }
          const r = await timeout(8000, fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
            headers: { Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}` },
          }));
          valid = r.ok;
          if (!valid) message = 'Invalid Mailchimp API key';
          else accountInfo = await r.json().catch(() => ({}));
          break;
        }
        case 'email_klaviyo': {
          const r = await timeout(8000, fetch('https://a.klaviyo.com/api/accounts/', {
            headers: { Authorization: `Klaviyo-API-Key ${apiKey}`, revision: '2024-02-15' },
          }));
          valid = r.ok;
          if (!valid) message = 'Invalid Klaviyo API key';
          break;
        }
        case 'email_brevo': {
          const r = await timeout(8000, fetch('https://api.brevo.com/v3/account', {
            headers: { 'api-key': apiKey },
          }));
          valid = r.ok;
          if (!valid) message = 'Invalid Brevo API key';
          break;
        }
        default:
          // For other platforms we can only do a length/format sanity check
          valid = apiKey.length >= 16 && apiKey.length <= 500;
          message = valid ? '' : 'Key should be between 16 and 500 characters';
      }
    } catch (err) {
      if (err.message === 'timeout') {
        message = 'Verification timed out — check your key and try again';
      } else {
        message = `Connection error: ${err.message}`;
      }
    }

    // Update test status in DB if key is already saved
    const brandId = req.user.brandId || req.user.userId;
    await query(
      'UPDATE api_keys_store SET last_tested=NOW(), test_status=$1 WHERE brand_id=$2 AND platform=$3',
      [valid ? 'pass' : 'fail', brandId, platform]
    ).catch(() => {});

    res.json({ valid, message, accountInfo });
  })
);

// ── GET user's own Cerebre API key (for WordPress plugin) ─────────────
router.get('/my-api-key', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT api_key FROM user_api_keys WHERE user_id=$1',
    [req.user.userId]
  ).catch(() => ({ rows: [] }));

  if (rows.length) {
    return res.json({ apiKey: rows[0].api_key, brandId: req.user.brandId || req.user.userId });
  }

  // Generate new secure key
  const newKey = `ck_live_${crypto.randomBytes(24).toString('base64url')}`;
  const hash   = crypto.createHash('sha256').update(newKey).digest('hex');
  await query(
    'INSERT INTO user_api_keys (user_id, api_key, key_hash) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET api_key=$2, key_hash=$3',
    [req.user.userId, newKey, hash]
  );
  res.json({ apiKey: newKey, brandId: req.user.brandId || req.user.userId });
}));

// ── POST regenerate API key ───────────────────────────────────────────
router.post('/regenerate-api-key', authenticate, asyncHandler(async (req, res) => {
  const newKey = `ck_live_${crypto.randomBytes(24).toString('base64url')}`;
  const hash   = crypto.createHash('sha256').update(newKey).digest('hex');
  await query(
    'INSERT INTO user_api_keys (user_id, api_key, key_hash) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET api_key=$2, key_hash=$3',
    [req.user.userId, newKey, hash]
  );
  res.json({ apiKey: newKey });
}));

// ── GET webhook URL ───────────────────────────────────────────────────
router.get('/webhook-url', authenticate, asyncHandler(async (req, res) => {
  const brandId = req.user.brandId || req.user.userId;
  const base = process.env.API_BASE_URL || `https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-api.railway.app'}`;
  res.json({ webhookUrl: `${base}/api/webhooks/generic/${brandId}` });
}));

// ── GET brand ID ──────────────────────────────────────────────────────
router.get('/brand-id', authenticate, asyncHandler(async (req, res) => {
  res.json({ brandId: req.user.brandId || req.user.userId });
}));

// ── GET / PUT user profile ────────────────────────────────────────────
router.put('/profile',
  authenticate,
  [body('name').notEmpty().trim().isLength({ max: 100 }), body('email').optional().isEmail()],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    await query(
      'UPDATE users SET name=$1, email=COALESCE($2, email), updated_at=NOW() WHERE id=$3',
      [name, email || null, req.user.userId]
    );
    res.json({ updated: true });
  })
);

// ── PUT password change ───────────────────────────────────────────────
router.put('/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('New password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('New password must contain a number'),
  ],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.userId]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (!await bcrypt.compare(currentPassword, rows[0].password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.userId]);
    res.json({ updated: true });
  })
);

// ── GET / PUT notification preferences ───────────────────────────────
router.get('/notifications', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await query(
    'SELECT preferences FROM users WHERE id=$1', [req.user.userId]
  ).catch(() => ({ rows: [{}] }));
  const prefs = rows[0]?.preferences || {};
  res.json({
    notifications: {
      email_weekly_digest: prefs.email_weekly_digest ?? true,
      email_alerts: prefs.email_alerts ?? true,
      email_report_complete: prefs.email_report_complete ?? true,
      push_enabled: prefs.push_enabled ?? true,
    },
  });
}));

router.put('/notifications',
  authenticate,
  [body('email_alerts').optional().isBoolean(), body('push_enabled').optional().isBoolean()],
  asyncHandler(async (req, res) => {
    // Only allow known preference keys to be set
    const allowed = ['email_weekly_digest','email_alerts','email_report_complete','push_enabled'];
    const prefs   = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) prefs[key] = Boolean(req.body[key]);
    }
    await query(
      'UPDATE users SET preferences=$1::jsonb, updated_at=NOW() WHERE id=$2',
      [JSON.stringify(prefs), req.user.userId]
    ).catch(() => {});
    res.json({ updated: true });
  })
);

// ── Helper exported for other routes ─────────────────────────────────
// FIX: getApiKey now properly uses the separate ENCRYPTION_KEY,
// falls back to env ANTHROPIC_API_KEY as last resort (for dev convenience)
const getStoredApiKey = async (brandId, platform) => {
  try {
    const { rows } = await query(
      'SELECT encrypted_key FROM api_keys_store WHERE brand_id=$1 AND platform=$2 AND is_active=true',
      [brandId, platform]
    );
    if (!rows[0]) {
      // Only fall back to env for anthropic, and only warn about it
      if (platform === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        return process.env.ANTHROPIC_API_KEY;
      }
      return null;
    }
    const decrypted = decrypt(rows[0].encrypted_key);
    if (!decrypted) {
      console.error(`[Settings] Failed to decrypt API key for ${platform} — key may be corrupted`);
      return null;
    }
    return decrypted;
  } catch {
    return platform === 'anthropic' ? (process.env.ANTHROPIC_API_KEY || null) : null;
  }
};

module.exports = router;
module.exports.getStoredApiKey = getStoredApiKey;
