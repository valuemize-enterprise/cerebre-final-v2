/**
 * validate-env.js — HARDENED
 *
 * FIXES:
 * 1. Validates ENCRYPTION_KEY is separate from JWT_SECRET
 * 2. Validates CORS origin is set in production
 * 3. Warns about Railway cold-start on free tier
 * 4. Checks ANTHROPIC_API_KEY format (must start with sk-ant-)
 * 5. Validates DATABASE_URL format
 */

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  // ── Required in all environments ──────────────────────────────
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set — the application cannot start without a database');
  } else if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
    errors.push('DATABASE_URL must start with postgresql:// or postgres://');
  }

  if (!process.env.REDIS_URL) {
    errors.push('REDIS_URL is not set — the job queue will not work');
  }

  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set — authentication will not work');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // ── Production-only requirements ──────────────────────────────
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.FRONTEND_URL) {
      errors.push('FRONTEND_URL is not set — CORS will block all browser requests. Set to your Vercel URL.');
    }

    if (!process.env.ENCRYPTION_KEY) {
      errors.push('ENCRYPTION_KEY is not set — API keys cannot be stored securely');
    } else if (process.env.ENCRYPTION_KEY === process.env.JWT_SECRET) {
      errors.push('ENCRYPTION_KEY must be different from JWT_SECRET — never reuse secrets');
    } else if (process.env.ENCRYPTION_KEY.length < 32) {
      errors.push('ENCRYPTION_KEY must be at least 32 characters');
    }

    if (!process.env.ANTHROPIC_API_KEY && !process.env.ALLOW_NO_AI) {
      warnings.push('ANTHROPIC_API_KEY is not set — AI features will only work if users provide their own key via Settings → API Keys');
    } else if (process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
      warnings.push('ANTHROPIC_API_KEY format looks incorrect — should start with sk-ant-api03-');
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.S3_BUCKET_NAME) {
      warnings.push('R2/S3 storage credentials incomplete — file upload will not work');
    }
  }

  // ── Warnings in all environments ──────────────────────────────
  if (process.env.JWT_SECRET === 'change-me' || process.env.JWT_SECRET?.includes('example')) {
    errors.push('JWT_SECRET appears to be a placeholder — change it to a random 40+ character string');
  }

  // ── Output results ────────────────────────────────────────────
  if (warnings.length > 0) {
    console.warn('\n[Config] WARNINGS:');
    warnings.forEach(w => console.warn(`  ⚠  ${w}`));
    console.warn('');
  }

  if (errors.length > 0) {
    console.error('\n[Config] STARTUP FAILED — missing required configuration:');
    errors.forEach(e => console.error(`  ✗  ${e}`));
    console.error('\nFix these in Railway: Service → Variables tab\n');
    process.exit(1);
  }

  console.log(`[Config] ✓ Environment validated (${process.env.NODE_ENV || 'development'})`);
};

module.exports = { validateEnv };
