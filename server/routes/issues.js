const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const { status, priority } = req.query;
  const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4 };

  let issues = db.get('issues').value();
  if (status) issues = issues.filter(i => i.status === status);
  if (priority) issues = issues.filter(i => i.priority === priority);

  issues.sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));
  res.json(issues);
});

router.get('/stats', (req, res) => {
  const issues = db.get('issues').value();
  res.json({
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    triaged: issues.filter(i => i.triaged_at).length,
    by_priority: {
      critical: issues.filter(i => i.priority === 'critical').length,
      high: issues.filter(i => i.priority === 'high').length,
      medium: issues.filter(i => i.priority === 'medium').length,
      low: issues.filter(i => i.priority === 'low').length,
    },
  });
});

module.exports = router;
