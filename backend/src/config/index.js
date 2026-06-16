require('dotenv').config();

const required = (key) => {
  if (!process.env[key]) throw new Error(`[Sabi] Missing required env var: ${key}`);
  return process.env[key];
};

const deriveApiUrl = () => {
  if (process.env.BACKEND_URL)         return process.env.BACKEND_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  return `http://localhost:${process.env.PORT || '4000'}`;
};

module.exports = {
  env:  process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  app: {
    port:        parseInt(process.env.PORT || '4000', 10),
    apiUrl:      deriveApiUrl(),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  db:    { url: required('DATABASE_URL') },
  redis: { url: process.env.REDIS_URL || 'redis://localhost:6379' },

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  s3: {
    region:          process.env.AWS_REGION || 'auto',
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    bucket:          process.env.S3_BUCKET_NAME || 'sabi-media-files',
    endpoint:        process.env.S3_ENDPOINT || undefined,
  },

  anthropic: {
    apiKey:    process.env.ANTHROPIC_API_KEY || null,
    model:     process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 4096,
  },

  upload: {
    maxFileSizeMb:    parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
    allowedMimeTypes: ['application/pdf','image/png','image/jpeg','image/jpg','image/webp'],
  },

  frontend: { url: process.env.FRONTEND_URL || 'http://localhost:3000' },

  platforms: {
    INSTAGRAM: 'instagram', FACEBOOK: 'facebook', TWITTER: 'twitter',
    TIKTOK: 'tiktok',       YOUTUBE: 'youtube',   GOOGLE_ADS: 'google_ads',
    WEBSITE: 'website',     EMAIL: 'email',        LINKEDIN: 'linkedin',
  },
};