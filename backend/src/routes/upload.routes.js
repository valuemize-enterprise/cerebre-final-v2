const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { upload, handleMulterError } = require('../middleware/upload.middleware');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { uploadFile, getSignedDownloadUrl, deleteFile } = require('../services/storage.service');
const { ocrQueue } = require('../workers/queue');
const { query, withTransaction } = require('../db/db');
const logger = require('../utils/logger');

const router = express.Router();

// ── POST /upload — single or multi-file ──────────────────────
router.post(
  '/',
  authenticate,
  upload.array('files', 10),
  handleMulterError,
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const userId = req.user.userId;
    const uploaded = [];

    for (const file of req.files) {
      const fileId = uuidv4();

      // 1. Upload to S3/R2
      const { key, url } = await uploadFile({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        userId,
      });

      // 2. Store file record + create job record
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO report_files
           (id, user_id, filename, original_name, file_type, file_size, s3_key, s3_url, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'uploaded')`,
          [
            fileId, userId,
            key.split('/').pop(),
            file.originalname,
            file.mimetype,
            file.size,
            key, url,
          ]
        );

        await client.query(
          `INSERT INTO processing_jobs (file_id, user_id, job_type, status)
           VALUES ($1,$2,'ocr','pending')`,
          [fileId, userId]
        );
      });

      // 3. Enqueue OCR job
      const job = await ocrQueue.add(
        { fileId, userId, s3Key: key, mimeType: file.mimetype },
        { jobId: `ocr-${fileId}` }
      );

      await query(
        'UPDATE processing_jobs SET queue_job_id = $1 WHERE file_id = $2 AND job_type = $3',
        [String(job.id), fileId, 'ocr']
      );

      uploaded.push({
        fileId,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'uploaded',
        queuedAt: new Date().toISOString(),
      });

      logger.info('[Upload] File queued', { fileId, userId, name: file.originalname });
    }

    res.status(202).json({
      message: `${uploaded.length} file(s) uploaded and queued for processing`,
      files: uploaded,
    });
  })
);

// ── GET /upload — list user's files ──────────────────────────
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT
         rf.id, rf.original_name, rf.file_type, rf.file_size,
         rf.status, rf.error_message, rf.uploaded_at,
         COUNT(pm.id) as platform_count,
         COUNT(ar.id) as report_count
       FROM report_files rf
       LEFT JOIN platform_metrics pm ON pm.file_id = rf.id
       LEFT JOIN analysis_reports ar ON rf.id = ANY(ar.file_ids)
       WHERE rf.user_id = $1
       GROUP BY rf.id
       ORDER BY rf.uploaded_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM report_files WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      files: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  })
);

// ── GET /upload/:fileId/status — polling endpoint ─────────────
router.get(
  '/:fileId/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT
         rf.id, rf.status, rf.error_message, rf.uploaded_at,
         pj.job_type, pj.status as job_status, pj.attempts,
         pj.started_at, pj.finished_at, pj.error as job_error,
         COUNT(pm.id) as platforms_detected
       FROM report_files rf
       LEFT JOIN processing_jobs pj ON pj.file_id = rf.id
       LEFT JOIN platform_metrics pm ON pm.file_id = rf.id
       WHERE rf.id = $1 AND rf.user_id = $2
       GROUP BY rf.id, pj.job_type, pj.status, pj.attempts, pj.started_at, pj.finished_at, pj.error`,
      [req.params.fileId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Estimate progress percentage
    const progressMap = {
      uploaded: 5,
      processing: 35,
      extracted: 60,
      analyzed: 100,
      failed: 0,
    };

    res.json({
      fileId: file.id,
      status: file.status,
      progress: progressMap[file.status] || 0,
      platformsDetected: parseInt(file.platforms_detected),
      error: file.error_message,
      jobs: result.rows.map((r) => ({
        type: r.job_type,
        status: r.job_status,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        attempts: r.attempts,
        error: r.job_error,
      })),
    });
  })
);

// ── GET /upload/:fileId/download — signed URL ─────────────────
router.get(
  '/:fileId/download',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      'SELECT s3_key FROM report_files WHERE id = $1 AND user_id = $2',
      [req.params.fileId, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });

    const signedUrl = await getSignedDownloadUrl(result.rows[0].s3_key, 300);
    res.json({ url: signedUrl, expiresIn: 300 });
  })
);

// ── DELETE /upload/:fileId ────────────────────────────────────
router.delete(
  '/:fileId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      'SELECT s3_key FROM report_files WHERE id = $1 AND user_id = $2',
      [req.params.fileId, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });

    await deleteFile(result.rows[0].s3_key);
    await query('DELETE FROM report_files WHERE id = $1', [req.params.fileId]);

    res.json({ message: 'File deleted' });
  })
);

module.exports = router;
