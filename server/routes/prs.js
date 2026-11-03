const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const prs = db.get('pull_requests').value()
    .sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
  res.json(prs);
});

router.get('/stats', (req, res) => {
  const prs = db.get('pull_requests').value();
  res.json({
    total: prs.length,
    pending_review: prs.filter(p => p.review_status === 'pending').length,
    approved: prs.filter(p => p.review_status === 'approved').length,
    changes_requested: prs.filter(p => p.review_status === 'changes_requested').length,
    reviewed_by_routine: prs.filter(p => p.reviewed_by_routine).length,
  });
});

module.exports = router;
