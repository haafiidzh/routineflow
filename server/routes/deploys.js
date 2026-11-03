const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const deploys = db.get('deploys').value()
    .sort((a, b) => new Date(b.deployed_at) - new Date(a.deployed_at));
  res.json(deploys);
});

router.get('/stats', (req, res) => {
  const deploys = db.get('deploys').value();
  res.json({
    total: deploys.length,
    healthy: deploys.filter(d => d.status === 'healthy').length,
    failed: deploys.filter(d => d.status === 'failed').length,
    pending: deploys.filter(d => d.status === 'pending').length,
    verified_by_routine: deploys.filter(d => d.verified_by_routine).length,
  });
});

module.exports = router;
