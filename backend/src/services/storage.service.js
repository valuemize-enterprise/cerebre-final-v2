const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// ── S3 / R2 Client ────────────────────────────────────────────
const s3Client = new S3Client({
  region: config.s3.region,
  credentials: config.s3.accessKeyId
    ? {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      }
    : undefined, // Falls back to IAM role in production EC2/Lambda
  ...(config.s3.endpoint ? { endpoint: config.s3.endpoint } : {}),
});

/**
 * Upload a buffer to S3/R2.
 * Returns { key, url }
 */
const uploadFile = async ({ buffer, originalName, mimeType, userId }) => {
  const ext = path.extname(originalName).toLowerCase();
  const key = `uploads/${userId}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    Metadata: {
      'original-name': encodeURIComponent(originalName),
      'user-id': userId,
    },
  });

  await s3Client.send(command);

  // Public URL (works if bucket has public policy, else use signed URLs)
  const url = config.s3.endpoint
    ? `${config.s3.endpoint}/${config.s3.bucket}/${key}`
    : `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${key}`;

  logger.debug('[S3] Uploaded', { key, mimeType, bytes: buffer.length });
  return { key, url };
};

/**
 * Generate a pre-signed GET URL (expires in 1 hour)
 */
const getSignedDownloadUrl = async (key, expiresInSeconds = 3600) => {
  const command = new GetObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
};

/**
 * Delete an object from S3/R2
 */
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
  });
  await s3Client.send(command);
  logger.debug('[S3] Deleted', { key });
};

/**
 * Upload a JSON report as a stored file
 */
const uploadReport = async ({ reportData, userId, reportId }) => {
  const key = `reports/${userId}/${reportId}.json`;
  const buffer = Buffer.from(JSON.stringify(reportData, null, 2), 'utf8');

  const command = new PutObjectCommand({
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
    ContentType: 'application/json',
  });

  await s3Client.send(command);
  return key;
};

module.exports = { uploadFile, getSignedDownloadUrl, deleteFile, uploadReport };
