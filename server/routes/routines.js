const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const router = express.Router();

// GET /api/routines/stats/summary  (must be before /:id)
router.get('/stats/summary', (req, res) => {
  const routines = db.get('routines').value();
  const runs = db.get('routine_runs').value();
  const successful = runs.filter(r => r.status === 'completed').length;
  const failed = runs.filter(r => r.status === 'failed').length;
  const durations = runs.filter(r => r.duration_ms).map(r => r.duration_ms);
  const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  res.json({
    total_routines: routines.length,
    active_routines: routines.filter(r => r.status === 'active').length,
    total_runs: runs.length,
    successful_runs: successful,
    failed_runs: failed,
    avg_duration_ms: Math.round(avg),
    by_type: {
      scheduled: routines.filter(r => r.type === 'scheduled').length,
      api: routines.filter(r => r.type === 'api').length,
      webhook: routines.filter(r => r.type === 'webhook').length,
    },
  });
});

// GET /api/routines/runs/all
router.get('/runs/all', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const runs = db.get('routine_runs').value();
  const routines = db.get('routines').value();
  const routineMap = Object.fromEntries(routines.map(r => [r.id, r]));

  const result = runs
    .slice()
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, limit)
    .map(r => ({
      ...r,
      routine_name: routineMap[r.routine_id]?.name || 'Unknown',
      routine_type: routineMap[r.routine_id]?.type || 'unknown',
    }));

  res.json(result);
});

// GET /api/routines/runs/:id
router.get('/runs/:id', (req, res) => {
  const run = db.get('routine_runs').find({ id: req.params.id }).value();
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

// GET /api/routines — list all routines
router.get('/', (req, res) => {
  const routines = db.get('routines').value();
  const runs = db.get('routine_runs').value();

  const result = routines.map(r => {
    const rRuns = runs.filter(rr => rr.routine_id === r.id);
    return {
      ...r,
      total_runs: rRuns.length,
      failed_runs: rRuns.filter(rr => rr.status === 'failed').length,
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json(result);
});

// GET /api/routines/:id
router.get('/:id', (req, res) => {
  const routine = db.get('routines').find({ id: req.params.id }).value();
  if (!routine) return res.status(404).json({ error: 'Not found' });

  const runs = db.get('routine_runs')
    .filter(r => r.routine_id === req.params.id)
    .value()
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 20);

  res.json({ ...routine, recent_runs: runs });
});

// POST /api/routines/trigger/deploy-verification
router.post('/trigger/deploy-verification', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (process.env.API_ROUTINE_TOKEN && token !== process.env.API_ROUTINE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const routine = db.get('routines').find({ name: 'Deploy Verification' }).value();
  if (!routine) return res.status(404).json({ error: 'Routine not found' });

  const { service, version, environment } = req.body;
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const healthChecks = simulateHealthCheck(service, version);
  const allPassed = healthChecks.every(c => c.ok);
  const output = allPassed
    ? `All ${healthChecks.length} health checks passed. Deploy ${version} on ${service} verified as healthy.`
    : `Health check FAILED: ${healthChecks.filter(c => !c.ok).map(c => c.name).join(', ')} failed on ${service} ${version}. Recommend rollback.`;

  const finishedAt = new Date().toISOString();
  const duration = Math.floor(Math.random() * 3000) + 1000;
  const runStatus = allPassed ? 'completed' : 'failed';

  const run = {
    id: runId, routine_id: routine.id, triggered_by: 'api:ci-pipeline',
    status: runStatus,
    input: { service, version, environment },
    output, duration_ms: duration, started_at: startedAt, finished_at: finishedAt,
  };

  db.get('routine_runs').push(run).write();
  db.get('routines').find({ id: routine.id }).assign({ last_run: finishedAt, run_count: (routine.run_count || 0) + 1 }).write();

  if (service && version) {
    const deployStatus = allPassed ? 'healthy' : 'failed';
    const existingDeploy = db.get('deploys').find({ service, version, environment }).value();
    if (existingDeploy) {
      db.get('deploys').find({ service, version, environment })
        .assign({ status: deployStatus, verified_by_routine: true, verification_notes: output, verified_at: finishedAt })
        .write();
    } else {
      db.get('deploys').push({
        id: uuidv4(), service, version, environment, status: deployStatus,
        health_checks: Object.fromEntries(healthChecks.map(c => [c.name, c])),
        verified_by_routine: true, verification_notes: output,
        deployed_at: startedAt, verified_at: finishedAt,
      }).write();
    }
  }

  res.json({ run_id: runId, session_url: `/api/routines/runs/${runId}`, status: runStatus, output, health_checks: healthChecks });
});

// POST /api/routines/trigger/alert-triage
router.post('/trigger/alert-triage', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (process.env.API_ROUTINE_TOKEN && token !== process.env.API_ROUTINE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const routine = db.get('routines').find({ name: 'Alert Triage' }).value();
  if (!routine) return res.status(404).json({ error: 'Routine not found' });

  const { alert, severity, source } = req.body;
  const runId = uuidv4();
  const startedAt = new Date().toISOString();

  const recentDeploys = db.get('deploys').value()
    .sort((a, b) => new Date(b.deployed_at) - new Date(a.deployed_at)).slice(0, 3);
  const openHighPriIssues = db.get('issues').filter(i => i.status === 'open' && ['critical', 'high'].includes(i.priority)).value();

  const deployCtx = recentDeploys.map(d => `${d.service} ${d.version} (${d.status})`).join(', ');
  const output = `Alert "${alert}" (${severity}) received from ${source}. ` +
    `Recent deploys: [${deployCtx}]. ${openHighPriIssues.length} open high-priority issues detected. ` +
    `Recommend investigating correlation with latest deploys. On-call notified.`;

  const finishedAt = new Date().toISOString();
  const duration = Math.floor(Math.random() * 2000) + 500;

  db.get('routine_runs').push({
    id: runId, routine_id: routine.id,
    triggered_by: `api:${(source || 'unknown').toLowerCase().replace(/\s+/g, '-')}`,
    status: 'completed', input: { alert, severity, source }, output,
    duration_ms: duration, started_at: startedAt, finished_at: finishedAt,
  }).write();

  db.get('routines').find({ id: routine.id })
    .assign({ last_run: finishedAt, run_count: (routine.run_count || 0) + 1 }).write();

  res.json({ run_id: runId, session_url: `/api/routines/runs/${runId}`, status: 'completed', output });
});

// POST /api/routines/webhook/github
router.post('/webhook/github', (req, res) => {
  const event = req.headers['x-github-event'] || 'pull_request';
  const payload = req.body;

  const routine = db.get('routines').filter(r => r.type === 'webhook' && r.status === 'active').first().value();
  if (!routine) return res.status(404).json({ error: 'No active webhook routine' });

  const prNumber = payload.pull_request?.number || Math.floor(Math.random() * 200);
  const prTitle = payload.pull_request?.title || 'Incoming PR';
  const author = payload.pull_request?.user?.login || 'unknown';

  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  const output = `Webhook received: ${event} on PR #${prNumber} "${prTitle}" by ${author}. ` +
    `Routine "${routine.name}" triggered. Code review queued and will begin shortly.`;

  const finishedAt = new Date().toISOString();

  db.get('routine_runs').push({
    id: runId, routine_id: routine.id, triggered_by: 'webhook:github', status: 'completed',
    input: { event, pr_number: prNumber, title: prTitle, author },
    output, duration_ms: 450, started_at: startedAt, finished_at: finishedAt,
  }).write();

  db.get('routines').find({ id: routine.id })
    .assign({ last_run: finishedAt, run_count: (routine.run_count || 0) + 1 }).write();

  const existingPR = db.get('pull_requests').find({ number: prNumber }).value();
  if (existingPR) {
    db.get('pull_requests').find({ number: prNumber })
      .assign({ review_status: 'reviewed', reviewed_by_routine: true, reviewed_at: finishedAt }).write();
  }

  res.json({ run_id: runId, session_url: `/api/routines/runs/${runId}`, status: 'completed', output });
});

// PATCH /api/routines/:id/status
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'paused'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const routine = db.get('routines').find({ id: req.params.id }).value();
  if (!routine) return res.status(404).json({ error: 'Not found' });
  db.get('routines').find({ id: req.params.id }).assign({ status }).write();
  res.json({ success: true });
});

function simulateHealthCheck(service, version) {
  const isBad = service === 'user-service' && version === 'v1.8.0';
  return [
    { name: '/health', status: isBad ? 503 : 200, latency_ms: isBad ? 8000 : 12, ok: !isBad },
    { name: 'error_rate', value: isBad ? '4.2%' : '0.01%', threshold: '1%', ok: !isBad },
    { name: 'p99_latency', value: isBad ? '820ms' : '135ms', threshold: '500ms', ok: !isBad },
    { name: 'db_connections', value: isBad ? 100 : 22, max: 100, ok: !isBad },
  ];
}

module.exports = router;
