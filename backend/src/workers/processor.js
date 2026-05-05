require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { v4: uuidv4 } = require('uuid');
const { ocrQueue, analysisQueue } = require('./queue');
const { extractContent } = require('../services/ocr.service');
const { normalizeData } = require('../services/normalization.service');
const { analyzeReport, calculateDeltas } = require('../services/ai.service');
const { getSignedDownloadUrl, uploadReport } = require('../services/storage.service');
const { query, withTransaction } = require('../db/db');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════
// OCR WORKER
// Job data: { fileId, userId, s3Key, mimeType }
// ══════════════════════════════════════════════════════════════
ocrQueue.process(2, async (job) => {
  const { fileId, userId, s3Key, mimeType } = job.data;
  logger.info('[Worker:OCR] Starting', { fileId, mimeType });

  await query(
    'UPDATE report_files SET status = $1 WHERE id = $2',
    ['processing', fileId]
  );
  await query(
    'UPDATE processing_jobs SET status = $1, started_at = NOW() WHERE file_id = $2 AND job_type = $3',
    ['running', fileId, 'ocr']
  );

  try {
    // 1. Get file from S3
    const signedUrl = await getSignedDownloadUrl(s3Key, 300);
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`S3 fetch failed: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // 2. Extract content
    job.progress(20);
    const extracted = await extractContent(buffer, mimeType);

    // 3. Store extracted data
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO extracted_data (file_id, raw_text, tables, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (file_id) DO UPDATE
         SET raw_text = $2, tables = $3, metadata = $4`,
        [fileId, extracted.rawText, JSON.stringify(extracted.tables), JSON.stringify(extracted.metadata)]
      );

      // 4. Normalize
      const normalized = normalizeData(extracted);
      job.progress(50);

      for (const metrics of normalized) {
        await client.query(
          `INSERT INTO platform_metrics
           (file_id, user_id, platform, report_period_start, report_period_end,
            impressions, reach, followers_total, followers_gained, followers_lost,
            likes, comments, shares, saves, clicks, engagement_rate,
            website_visits, sessions, bounce_rate, avg_session_duration_sec,
            leads, conversions, conversion_rate, revenue,
            posts_published, stories_published, videos_published,
            ad_spend, cpc, cpm, roas, raw_normalized)
           VALUES
           ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32)`,
          [
            fileId, userId, metrics.platform,
            metrics.report_period_start, metrics.report_period_end,
            metrics.impressions, metrics.reach, metrics.followers_total,
            metrics.followers_gained, metrics.followers_lost,
            metrics.likes, metrics.comments, metrics.shares,
            metrics.saves, metrics.clicks, metrics.engagement_rate,
            metrics.website_visits, metrics.sessions, metrics.bounce_rate,
            metrics.avg_session_duration_sec, metrics.leads, metrics.conversions,
            metrics.conversion_rate, metrics.revenue, metrics.posts_published,
            metrics.stories_published, metrics.videos_published,
            metrics.ad_spend, metrics.cpc, metrics.cpm, metrics.roas,
            JSON.stringify(metrics.raw_normalized),
          ]
        );
      }

      await client.query(
        'UPDATE report_files SET status = $1 WHERE id = $2',
        ['extracted', fileId]
      );
      await client.query(
        'UPDATE processing_jobs SET status = $1, finished_at = NOW() WHERE file_id = $2 AND job_type = $3',
        ['done', fileId, 'ocr']
      );
    });

    job.progress(100);
    logger.info('[Worker:OCR] Complete', { fileId });

    // Enqueue AI analysis
    await analysisQueue.add({
      fileId,
      userId,
      triggerAuto: true,
    });

    return { fileId, success: true };
  } catch (err) {
    logger.error('[Worker:OCR] Failed', { fileId, error: err.message });
    await query('UPDATE report_files SET status = $1, error_message = $2 WHERE id = $3',
      ['failed', err.message, fileId]);
    await query(
      'UPDATE processing_jobs SET status = $1, error = $2, finished_at = NOW() WHERE file_id = $3 AND job_type = $4',
      ['failed', err.message, fileId, 'ocr']
    );
    throw err;
  }
});

// ══════════════════════════════════════════════════════════════
// AI ANALYSIS WORKER
// Job data: { fileId, userId, comparisonFileId? }
// ══════════════════════════════════════════════════════════════
analysisQueue.process(1, async (job) => {
  const { fileId, userId, comparisonFileId } = job.data;
  logger.info('[Worker:AI] Starting analysis', { fileId });

  try {
    // 1. Load current period metrics
    const metricsResult = await query(
      'SELECT * FROM platform_metrics WHERE file_id = $1',
      [fileId]
    );
    if (metricsResult.rows.length === 0) {
      throw new Error('No normalized metrics found for this file');
    }
    const metrics = metricsResult.rows;

    // 2. Load comparison metrics if provided
    let comparisonMetrics = null;
    if (comparisonFileId) {
      const compResult = await query(
        'SELECT * FROM platform_metrics WHERE file_id = $1',
        [comparisonFileId]
      );
      comparisonMetrics = compResult.rows;
    }

    // 3. Load raw text for additional context
    const extractedResult = await query(
      'SELECT raw_text FROM extracted_data WHERE file_id = $1',
      [fileId]
    );
    const rawText = extractedResult.rows[0]?.raw_text || '';

    // 4. Determine period label
    const firstMetric = metrics[0];
    const periodLabel = firstMetric.report_period_start
      ? `${firstMetric.report_period_start} to ${firstMetric.report_period_end}`
      : 'Unknown period';

    job.progress(20);

    // 5. Run AI analysis
    const analysisResult = await analyzeReport({
      metrics,
      periodLabel,
      comparisonMetrics,
      rawText,
    });

    job.progress(80);

    // 6. Calculate deltas if comparison data exists
    const deltas = comparisonMetrics ? calculateDeltas(metrics, comparisonMetrics) : {};

    // 7. Store analysis report
    const reportId = uuidv4();
    const s3Key = await uploadReport({
      reportData: analysisResult,
      userId,
      reportId,
    });

    await query(
      `INSERT INTO analysis_reports
       (id, user_id, file_ids, period_label, executive_snapshot, cross_platform_perf,
        platform_breakdown, content_analysis, audience_insights, funnel_analysis,
        what_worked_failed, strategic_recommendations, risk_opportunity,
        raw_ai_response, comparison_delta, prompt_tokens, completion_tokens, s3_report_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        reportId, userId, [fileId],
        periodLabel,
        JSON.stringify(analysisResult.executive_snapshot || {}),
        JSON.stringify(analysisResult.cross_platform_performance || {}),
        JSON.stringify(analysisResult.platform_breakdown || []),
        JSON.stringify(analysisResult.content_analysis || {}),
        JSON.stringify(analysisResult.audience_insights || {}),
        JSON.stringify(analysisResult.funnel_analysis || {}),
        JSON.stringify(analysisResult.what_worked_vs_failed || {}),
        JSON.stringify(analysisResult.strategic_recommendations || {}),
        JSON.stringify(analysisResult.risk_opportunity || {}),
        analysisResult.raw_ai_response || '',
        JSON.stringify(deltas),
        analysisResult._meta?.prompt_tokens || 0,
        analysisResult._meta?.completion_tokens || 0,
        s3Key,
      ]
    );

    await query(
      'UPDATE report_files SET status = $1 WHERE id = $2',
      ['analyzed', fileId]
    );

    job.progress(100);
    logger.info('[Worker:AI] Analysis complete', { fileId, reportId });

    return { fileId, reportId, success: true };
  } catch (err) {
    logger.error('[Worker:AI] Failed', { fileId, error: err.message });
    throw err;
  }
});

logger.info('[Worker] Processors ready — OCR and Analysis queues active');
