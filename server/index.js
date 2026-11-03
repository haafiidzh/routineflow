require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { startScheduler } = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/routines', require('./routes/routines'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/deploys', require('./routes/deploys'));
app.use('/api/prs', require('./routes/prs'));
app.use('/api/docs', require('./routes/docs'));

app.get('/api/dashboard', (req, res) => {
  const db = require('./db/database');
  const routines = db.get('routines').value();
  const runs = db.get('routine_runs').value();
  const issues = db.get('issues').value();
  const deploys = db.get('deploys').value();
  const prs = db.get('pull_requests').value();
  const docs = db.get('doc_health').value();

  const routineMap = Object.fromEntries(routines.map(r => [r.id, r]));
  const recentRuns = runs
    .slice().sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 5)
    .map(r => ({
      ...r,
      routine_name: routineMap[r.routine_id]?.name || 'Unknown',
      routine_type: routineMap[r.routine_id]?.type || 'unknown',
    }));

  res.json({
    routines: {
      total: routines.length,
      active: routines.filter(r => r.status === 'active').length,
      by_type: {
        scheduled: routines.filter(r => r.type === 'scheduled').length,
        api: routines.filter(r => r.type === 'api').length,
        webhook: routines.filter(r => r.type === 'webhook').length,
      },
    },
    runs: {
      total: runs.length,
      completed: runs.filter(r => r.status === 'completed').length,
      failed: runs.filter(r => r.status === 'failed').length,
      recent: recentRuns,
    },
    issues: {
      open: issues.filter(i => i.status === 'open').length,
      critical: issues.filter(i => i.priority === 'critical' && i.status === 'open').length,
    },
    deploys: {
      healthy: deploys.filter(d => d.status === 'healthy').length,
      failed: deploys.filter(d => d.status === 'failed').length,
      pending: deploys.filter(d => d.status === 'pending').length,
    },
    prs: {
      pending_review: prs.filter(p => p.review_status === 'pending').length,
    },
    docs: {
      high_drift: docs.filter(d => d.drift_score > 70).length,
    },
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

startScheduler();

app.listen(PORT, () => {
  console.log(`RoutineFlow running at http://localhost:${PORT}`);
});
