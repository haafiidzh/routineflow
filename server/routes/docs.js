const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const docs = db.get('doc_health').value()
    .sort((a, b) => b.drift_score - a.drift_score);
  res.json(docs);
});

router.get('/stats', (req, res) => {
  const docs = db.get('doc_health').value();
  const avgDrift = docs.reduce((s, d) => s + d.drift_score, 0) / (docs.length || 1);
  const avgCoverage = docs.reduce((s, d) => s + d.doc_coverage, 0) / (docs.length || 1);
  res.json({
    total_files: docs.length,
    high_drift_files: docs.filter(d => d.drift_score > 70).length,
    avg_drift_score: Math.round(avgDrift),
    avg_coverage: Math.round(avgCoverage),
  });
});

module.exports = router;
