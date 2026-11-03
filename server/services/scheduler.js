const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

function runTriageRoutine() {
  const routine = db.get('routines').find({ name: 'Nightly Backlog Triage' }).value();
  if (!routine || routine.status !== 'active') return;

  const openIssues = db.get('issues').filter({ status: 'open' }).value();
  const runId = uuidv4();
  const startedAt = new Date().toISOString();
  let escalated = 0;

  openIssues.forEach(issue => {
    const labels = issue.labels || [];
    let newPriority = issue.priority;
    const notes = [];

    if (labels.includes('data-loss') || issue.title.toLowerCase().includes('data loss')) {
      newPriority = 'critical'; notes.push('Data loss detected — escalated to critical'); escalated++;
    } else if (labels.includes('security') || labels.includes('auth')) {
      newPriority = 'high'; notes.push('Security/auth concern — high priority');
    } else if (labels.includes('typo') || labels.includes('cosmetic')) {
      newPriority = 'low'; notes.push('Cosmetic issue — low priority');
    }

    db.get('issues').find({ id: issue.id })
      .assign({ priority: newPriority, triage_notes: notes.join('. ') || issue.triage_notes, triaged_at: startedAt })
      .write();
  });

  const output = `Triaged ${openIssues.length} issues. Escalated ${escalated} to critical.`;
  const finishedAt = new Date().toISOString();

  db.get('routine_runs').push({
    id: runId, routine_id: routine.id, triggered_by: 'schedule', status: 'completed',
    input: { issue_count: openIssues.length }, output,
    duration_ms: Math.floor(Math.random() * 5000) + 2000,
    started_at: startedAt, finished_at: finishedAt,
  }).write();

  db.get('routines').find({ id: routine.id })
    .assign({ last_run: finishedAt, run_count: (routine.run_count || 0) + 1 }).write();

  console.log(`[Scheduler] Nightly triage: ${output}`);
}

function startScheduler() {
  // Update next_run times every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    const now = new Date();
    const nextNight = new Date(now);
    nextNight.setHours(2, 0, 0, 0);
    if (nextNight <= now) nextNight.setDate(nextNight.getDate() + 1);

    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - nextMonday.getDay()) % 7 || 7;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0);

    const triageR = db.get('routines').find({ name: 'Nightly Backlog Triage' }).value();
    const docR = db.get('routines').find({ name: 'Weekly Doc Drift Detection' }).value();
    if (triageR) db.get('routines').find({ id: triageR.id }).assign({ next_run: nextNight.toISOString() }).write();
    if (docR) db.get('routines').find({ id: docR.id }).assign({ next_run: nextMonday.toISOString() }).write();
  });

  // Demo triage run (only in demo mode)
  if (process.env.DEMO_SCHEDULER === 'true') {
    cron.schedule('* * * * *', () => {
      console.log('[Scheduler] Demo triage tick...');
      runTriageRoutine();
    });
  }

  console.log('[Scheduler] Started.');
}

module.exports = { startScheduler, runTriageRoutine };
