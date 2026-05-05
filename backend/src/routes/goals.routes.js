const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');
const { createGoal, updateGoalProgress, getCompanyGoals } = require('../services/goals.service');
const { query } = require('../db/db');
const config = require('../config');

const router = express.Router();

// POST /goals — create a new business goal
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  if (!companyId) return res.status(400).json({ error: 'No company associated with your account' });

  const goal = await createGoal(
    companyId,
    req.user.userId,
    req.body,
    config.anthropic.apiKey
  );
  res.status(201).json({ goal });
}));

// GET /goals — list all goals for company
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  if (!companyId) return res.json({ goals: [] });

  const { status, horizon } = req.query;
  const goals = await getCompanyGoals(companyId, { status, horizon });
  res.json({ goals });
}));

// GET /goals/:goalId — single goal detail
router.get('/:goalId', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT * FROM business_goals WHERE id = $1 AND company_id = $2',
    [req.params.goalId, req.user.companyId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Goal not found' });
  res.json({ goal: result.rows[0] });
}));

// PUT /goals/:goalId — update goal
router.put('/:goalId', authenticate, asyncHandler(async (req, res) => {
  const { title, description, target_value, status } = req.body;
  const result = await query(
    `UPDATE business_goals SET title=$1, description=$2, target_value=$3, status=$4, updated_at=NOW()
     WHERE id=$5 AND company_id=$6 RETURNING *`,
    [title, description, target_value, status, req.params.goalId, req.user.companyId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Goal not found' });
  res.json({ goal: result.rows[0] });
}));

// DELETE /goals/:goalId
router.delete('/:goalId', authenticate, asyncHandler(async (req, res) => {
  await query('DELETE FROM business_goals WHERE id=$1 AND company_id=$2', [req.params.goalId, req.user.companyId]);
  res.json({ message: 'Goal deleted' });
}));

// POST /goals/refresh-progress — update all goal progress from latest metrics
router.post('/refresh-progress', authenticate, asyncHandler(async (req, res) => {
  await updateGoalProgress(req.user.companyId);
  const goals = await getCompanyGoals(req.user.companyId);
  res.json({ message: 'Progress updated', goals });
}));

module.exports = router;
