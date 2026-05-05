const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { query } = require('../db/db');
const { ocrQueue, analysisQueue } = require('../workers/queue');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ── GET /admin/stats — system overview ────────────────────────
router.get('/stats', asyncHandler(async (req, res) => {
  const [users, files, reports, jobs] = await Promise.all([
    query(`SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE is_active) AS active,
             COUNT(*) FILTER (WHERE role = 'admin') AS admins
           FROM users`),
    query(`SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE status = 'analyzed') AS analyzed,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed
           FROM report_files`),
    query(`SELECT
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week
           FROM analysis_reports`),
    query(`SELECT
             COUNT(*) FILTER (WHERE status = 'pending') AS pending,
             COUNT(*) FILTER (WHERE status = 'running') AS running,
             COUNT(*) FILTER (WHERE status = 'failed') AS failed
           FROM processing_jobs`),
  ]);

  // Also get live queue counts from Bull
  const [ocrCounts, analysisCounts] = await Promise.all([
    ocrQueue.getJobCounts(),
    analysisQueue.getJobCounts(),
  ]);

  res.json({
    users: {
      total: parseInt(users.rows[0].total),
      active: parseInt(users.rows[0].active),
      admins: parseInt(users.rows[0].admins),
    },
    files: {
      total: parseInt(files.rows[0].total),
      analyzed: parseInt(files.rows[0].analyzed),
      failed: parseInt(files.rows[0].failed),
    },
    reports: {
      total: parseInt(reports.rows[0].total),
      thisWeek: parseInt(reports.rows[0].this_week),
    },
    jobs: {
      pending: parseInt(jobs.rows[0].pending),
      running: parseInt(jobs.rows[0].running),
      failed: parseInt(jobs.rows[0].failed),
    },
    queues: {
      ocr: ocrCounts,
      analysis: analysisCounts,
    },
  });
}));

// ── GET /admin/users — all users with stats ───────────────────
router.get('/users', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT
       u.id, u.email, u.full_name, u.company, u.role,
       u.is_active, u.created_at,
       COUNT(DISTINCT rf.id) AS file_count,
       COUNT(DISTINCT ar.id) AS report_count
     FROM users u
     LEFT JOIN report_files rf ON rf.user_id = u.id
     LEFT JOIN analysis_reports ar ON ar.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  res.json({ users: result.rows });
}));

// ── PATCH /admin/users/:userId — update role or status ────────
router.patch('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isActive, role } = req.body;

  // Prevent admin from deactivating themselves
  if (userId === req.user.userId && isActive === false) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (isActive !== undefined) {
    updates.push(`is_active = $${idx++}`);
    params.push(isActive);
  }
  if (role !== undefined && ['analyst', 'admin'].includes(role)) {
    updates.push(`role = $${idx++}`);
    params.push(role);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  params.push(userId);
  const result = await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}
     RETURNING id, email, full_name, role, is_active`,
    params
  );

  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ user: result.rows[0] });
}));

// ── DELETE /admin/users/:userId — hard delete (dangerous) ─────
router.delete('/users/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  await query('DELETE FROM users WHERE id = $1', [userId]);
  res.json({ message: 'User deleted' });
}));

// ── POST /admin/jobs/retry-failed — requeue all failed jobs ───
router.post('/jobs/retry-failed', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT pj.file_id, pj.job_type, rf.user_id, rf.s3_key, rf.file_type
     FROM processing_jobs pj
     JOIN report_files rf ON rf.id = pj.file_id
     WHERE pj.status = 'failed' AND pj.job_type = 'ocr'
     LIMIT 50`
  );

  let queued = 0;
  for (const job of result.rows) {
    await ocrQueue.add(
      { fileId: job.file_id, userId: job.user_id, s3Key: job.s3_key, mimeType: job.file_type },
      { jobId: `ocr-admin-retry-${job.file_id}-${Date.now()}` }
    );
    await query(
      "UPDATE report_files SET status='uploaded', error_message=NULL WHERE id=$1",
      [job.file_id]
    );
    queued++;
  }

  res.json({ message: `Queued ${queued} failed jobs for retry`, queued });
}));

module.exports = router;
