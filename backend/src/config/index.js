require('dotenv').config();

const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  return process.env[key];
};

// ── Derive the public API URL ────────────────────────────────────────
// Used to build OAuth callback URLs that external platforms redirect back to.
// Priority: explicit API_BASE_URL → Railway public domain → localhost
const deriveApiUrl = () => {
  if (process.env.BACKEND_URL)
    return process.env.BACKEND_URL.replace(/\/$/, ''); // remove trailing slash

  // if (process.env.RENDER_EXTERNAL_URL)
  //   return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');

  // Local development fallback
  const port = process.env.PORT || '4000';
  return `http://localhost:${port}`;
};

module.exports = {
  env:  process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  // ── app ── used by server.js and routes ───────────────────────────
  // All config.app.* references now resolve correctly
  app: {
    port:        parseInt(process.env.PORT || '4000', 10),
    apiUrl:      deriveApiUrl(),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  db: {
    url: required('DATABASE_URL'),
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  s3: {
    region:          process.env.AWS_REGION || 'auto',
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket:          process.env.S3_BUCKET_NAME || 'cerebre-media-files',
    endpoint:        process.env.S3_ENDPOINT || undefined, // Cloudflare R2
  },

  anthropic: {
    apiKey:    process.env.ANTHROPIC_API_KEY || null, // null = users supply own key
    model:     process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 4096,
  },

  upload: {
    maxFileSizeMb:    parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
    allowedMimeTypes: [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
    ],
  },

  // Kept for backward compatibility (server.js reads config.app.frontendUrl,
  // but other files may still read config.frontend.url)
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // Platform canonical names — normaliser maps aliases → these
  platforms: {
    INSTAGRAM: 'instagram',
    FACEBOOK:  'facebook',
    TWITTER:   'twitter',
    TIKTOK:    'tiktok',
    YOUTUBE:   'youtube',
    GOOGLE_ADS:'google_ads',
    WEBSITE:   'website',
    EMAIL:     'email',
    LINKEDIN:  'linkedin',
  },
};
