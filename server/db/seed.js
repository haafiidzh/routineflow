require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

console.log('Seeding database...');

db.set('routines', []).set('routine_runs', []).set('issues', [])
  .set('deploys', []).set('pull_requests', []).set('doc_health', []).write();

// ─── Routines ────────────────────────────────────────────────────────────────

const routines = [
  {
    id: uuidv4(),
    name: 'Nightly Backlog Triage',
    type: 'scheduled',
    trigger_config: { cron: '0 2 * * *', description: 'Every night at 2:00 AM' },
    prompt: 'Review all open issues. Assign a priority (critical/high/medium/low) based on title, labels, and description. Add a short triage note explaining the priority decision. Focus on user-impact and recency.',
    status: 'active',
    last_run: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    next_run: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
    run_count: 14,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Weekly Doc Drift Detection',
    type: 'scheduled',
    trigger_config: { cron: '0 9 * * 1', description: 'Every Monday at 9:00 AM' },
    prompt: 'Check all documented files for drift. Compare each file\'s last modified date with its documentation last-updated date. Flag files with a drift score > 70 and suggest what sections need updating.',
    status: 'active',
    last_run: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    next_run: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    run_count: 6,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Deploy Verification',
    type: 'api',
    trigger_config: { endpoint: '/api/routines/trigger/deploy-verification', auth: 'bearer' },
    prompt: 'A new deployment was just triggered. Check health endpoints, verify service response times, inspect error rates, and confirm the deployment succeeded. If any check fails, describe the failure clearly.',
    status: 'active',
    last_run: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    next_run: null,
    run_count: 31,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Alert Triage',
    type: 'api',
    trigger_config: { endpoint: '/api/routines/trigger/alert-triage', auth: 'bearer' },
    prompt: 'An alert has been fired from the monitoring system. Analyze the alert payload, correlate it with recent deploys and open issues, assess severity, and produce a summary with recommended next steps for the on-call engineer.',
    status: 'active',
    last_run: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    next_run: null,
    run_count: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'PR Code Review',
    type: 'webhook',
    trigger_config: { event: 'pull_request', actions: ['opened', 'synchronize'], filter: 'base:main' },
    prompt: 'A pull request was opened or updated. Review the diff for: security vulnerabilities, performance regressions, missing tests, style guide violations, and breaking API changes. Provide actionable, line-specific feedback.',
    status: 'active',
    last_run: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    next_run: null,
    run_count: 19,
    created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'SDK Port Automation',
    type: 'webhook',
    trigger_config: { event: 'push', actions: ['push'], filter: 'branch:main,paths:src/api/**' },
    prompt: 'New changes were pushed to the main API source. For every changed API function, generate the equivalent TypeScript SDK method and Python SDK method. Open a draft PR with the ported code and a migration guide.',
    status: 'paused',
    last_run: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    next_run: null,
    run_count: 3,
    created_at: new Date().toISOString(),
  },
];

db.get('routines').push(...routines).write();

// ─── Routine Runs ─────────────────────────────────────────────────────────────

const [triageR, docR, deployR, alertR, prR] = routines;

const runs = [
  {
    id: uuidv4(), routine_id: triageR.id, triggered_by: 'schedule', status: 'completed',
    input: { issue_count: 12 },
    output: 'Triaged 12 issues. Escalated 2 to critical (auth timeout + data loss report). Moved 5 to low priority (cosmetic). Added notes to all.',
    duration_ms: 4820, started_at: triageR.last_run,
    finished_at: new Date(new Date(triageR.last_run).getTime() + 4820).toISOString(),
  },
  {
    id: uuidv4(), routine_id: triageR.id, triggered_by: 'schedule', status: 'completed',
    input: { issue_count: 9 },
    output: 'Triaged 9 issues. No critical issues found. Promoted 3 to high priority based on recency and user reports.',
    duration_ms: 3210,
    started_at: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 32 * 60 * 60 * 1000 + 3210).toISOString(),
  },
  {
    id: uuidv4(), routine_id: docR.id, triggered_by: 'schedule', status: 'completed',
    input: { files_checked: 24 },
    output: 'Checked 24 files. Found 6 with high drift (score > 70). Main offenders: auth/middleware.js (score 91), api/payments.js (score 85). Suggest updating API reference and authentication guide.',
    duration_ms: 7340, started_at: docR.last_run,
    finished_at: new Date(new Date(docR.last_run).getTime() + 7340).toISOString(),
  },
  {
    id: uuidv4(), routine_id: deployR.id, triggered_by: 'api:ci-pipeline', status: 'completed',
    input: { service: 'api-gateway', version: 'v2.3.1', environment: 'production' },
    output: 'All 5 health checks passed. Response time p99: 142ms (within SLA). Error rate: 0.02% (baseline). Deploy v2.3.1 verified as healthy.',
    duration_ms: 2100, started_at: deployR.last_run,
    finished_at: new Date(new Date(deployR.last_run).getTime() + 2100).toISOString(),
  },
  {
    id: uuidv4(), routine_id: alertR.id, triggered_by: 'api:pagerduty', status: 'completed',
    input: { alert: 'High error rate on /api/checkout', severity: 'warning', source: 'Datadog' },
    output: 'Correlated alert with deploy v2.3.0 (30 min ago). Error pattern matches known issue #441. Recommend rolling back to v2.2.9. Notified on-call.',
    duration_ms: 1890, started_at: alertR.last_run,
    finished_at: new Date(new Date(alertR.last_run).getTime() + 1890).toISOString(),
  },
  {
    id: uuidv4(), routine_id: prR.id, triggered_by: 'webhook:github', status: 'completed',
    input: { pr_number: 142, title: 'feat: add OAuth2 PKCE flow', author: 'alice' },
    output: 'Review complete. Found 2 issues: (1) Missing rate limit on /oauth/token endpoint — potential brute force vector. (2) PKCE verifier not validated server-side. 3 suggestions for test coverage. Approved with changes requested.',
    duration_ms: 5600, started_at: prR.last_run,
    finished_at: new Date(new Date(prR.last_run).getTime() + 5600).toISOString(),
  },
  {
    id: uuidv4(), routine_id: deployR.id, triggered_by: 'api:ci-pipeline', status: 'failed',
    input: { service: 'user-service', version: 'v1.8.0', environment: 'production' },
    output: 'Health check FAILED: /health returned 503. Database connection pool exhausted. Deploy v1.8.0 marked as degraded. Recommend immediate rollback.',
    duration_ms: 8900,
    started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    finished_at: new Date(Date.now() - 5 * 60 * 60 * 1000 + 8900).toISOString(),
  },
];

db.get('routine_runs').push(...runs).write();

// ─── Issues ──────────────────────────────────────────────────────────────────

const issues = [
  {
    id: uuidv4(), title: 'Auth tokens expire silently causing data loss',
    body: 'Users report being logged out mid-session without warning. Any unsaved form data is lost. This has been reported 14 times in the past week.',
    labels: ['bug', 'auth', 'data-loss', 'user-reported'], priority: 'critical', status: 'open',
    assignee: 'bob', triage_notes: 'Critical: affects active sessions, direct data loss. 14 reports in 7 days.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Payment confirmation email sent twice on retry',
    body: 'When a payment times out and the user retries, they receive two confirmation emails. Idempotency key not applied to email service.',
    labels: ['bug', 'payments', 'email'], priority: 'high', status: 'in_progress',
    assignee: 'carol', triage_notes: 'High: financial confusion for users. Fix involves email service idempotency.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Add dark mode to dashboard',
    body: 'Feature request from several enterprise customers. Would improve usability for users working in low-light environments.',
    labels: ['enhancement', 'ui', 'customer-request'], priority: 'medium', status: 'open',
    assignee: null, triage_notes: 'Medium: quality of life, no production impact. Good first issue candidate.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Search results slow when filtering by date range',
    body: 'Queries with a date range filter take > 3s on datasets > 100k records. Missing composite index on (created_at, status).',
    labels: ['performance', 'database', 'search'], priority: 'high', status: 'open',
    assignee: 'alice', triage_notes: 'High: measurable perf regression at scale, straightforward DB index fix.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Typo in onboarding tooltip text',
    body: '"Welcom to RoutineFlow" should be "Welcome to RoutineFlow" on step 2 of the onboarding wizard.',
    labels: ['bug', 'ui', 'typo'], priority: 'low', status: 'open',
    assignee: null, triage_notes: 'Low: cosmetic typo, no functional impact.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Webhook delivery retry logic does not respect backoff',
    body: 'Failed webhooks are retried immediately 3 times instead of using exponential backoff. This hammers downstream services during outages.',
    labels: ['bug', 'webhooks', 'reliability'], priority: 'high', status: 'open',
    assignee: null, triage_notes: 'High: amplifies downstream failures. Fix: implement exponential backoff with jitter.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'Export to CSV does not include timezone offset',
    body: 'Timestamps in CSV exports are in UTC but not labeled. International customers are confused about time values.',
    labels: ['bug', 'export', 'internationalization'], priority: 'medium', status: 'open',
    assignee: null, triage_notes: 'Medium: data interpretation issue, affects international users. Append UTC offset to timestamps.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
  {
    id: uuidv4(), title: 'API rate limit headers not returned on 200 responses',
    body: 'X-RateLimit-Remaining and X-RateLimit-Reset headers are missing from successful responses. Clients cannot proactively throttle.',
    labels: ['bug', 'api', 'rate-limiting'], priority: 'medium', status: 'open',
    assignee: 'dave', triage_notes: 'Medium: developer experience issue, no data loss. Middleware fix.',
    triaged_at: triageR.last_run, created_at: new Date().toISOString(),
  },
];

db.get('issues').push(...issues).write();

// ─── Deploys ─────────────────────────────────────────────────────────────────

const deploys = [
  {
    id: uuidv4(), service: 'api-gateway', version: 'v2.3.1', environment: 'production', status: 'healthy',
    health_checks: {
      '/health': { status: 200, latency_ms: 12 }, '/metrics': { status: 200, latency_ms: 8 },
      'error_rate': { value: '0.02%', threshold: '1%', ok: true },
      'p99_latency': { value: '142ms', threshold: '500ms', ok: true },
      'db_connections': { value: 28, max: 100, ok: true },
    },
    verified_by_routine: true,
    verification_notes: 'All 5 checks passed. p99 latency 142ms, error rate 0.02%.',
    deployed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    verified_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 2100).toISOString(),
  },
  {
    id: uuidv4(), service: 'user-service', version: 'v1.8.0', environment: 'production', status: 'failed',
    health_checks: {
      '/health': { status: 503, latency_ms: 8900, error: 'Connection pool exhausted' },
      'db_connections': { value: 100, max: 100, ok: false },
    },
    verified_by_routine: true,
    verification_notes: 'FAILED: /health 503. DB connection pool at capacity. Recommend rollback to v1.7.9.',
    deployed_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    verified_at: new Date(Date.now() - 5 * 60 * 60 * 1000 + 8900).toISOString(),
  },
  {
    id: uuidv4(), service: 'notification-service', version: 'v3.1.0', environment: 'staging', status: 'healthy',
    health_checks: {
      '/health': { status: 200, latency_ms: 9 },
      'queue_depth': { value: 14, threshold: 1000, ok: true },
    },
    verified_by_routine: true,
    verification_notes: 'Staging deploy healthy. Queue depth nominal.',
    deployed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    verified_at: new Date(Date.now() - 1 * 60 * 60 * 1000 + 1200).toISOString(),
  },
  {
    id: uuidv4(), service: 'billing-service', version: 'v4.0.2', environment: 'production', status: 'pending',
    health_checks: {}, verified_by_routine: false, verification_notes: null,
    deployed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), verified_at: null,
  },
];

db.get('deploys').push(...deploys).write();

// ─── Pull Requests ────────────────────────────────────────────────────────────

const prs = [
  {
    id: uuidv4(), repo: 'org/routineflow-api', number: 142,
    title: 'feat: add OAuth2 PKCE flow', author: 'alice',
    base_branch: 'main', head_branch: 'feat/oauth-pkce',
    diff_summary: '+342 -18 lines across 8 files. New files: src/auth/pkce.js, tests/auth/pkce.test.js.',
    review_status: 'changes_requested',
    review_notes: 'Found 2 security issues: (1) Missing rate limit on /oauth/token. (2) PKCE verifier not validated server-side. Must fix before merge.',
    reviewed_by_routine: true,
    opened_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reviewed_at: prR.last_run,
  },
  {
    id: uuidv4(), repo: 'org/routineflow-api', number: 141,
    title: 'fix: exponential backoff for webhook retries', author: 'bob',
    base_branch: 'main', head_branch: 'fix/webhook-backoff',
    diff_summary: '+89 -34 lines across 3 files. Modified: src/services/webhook.js, tests/services/webhook.test.js.',
    review_status: 'approved',
    review_notes: 'Clean implementation. Backoff correctly caps at 30s with jitter. Tests cover all retry scenarios. Ready to merge.',
    reviewed_by_routine: true,
    opened_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(), repo: 'org/routineflow-frontend', number: 98,
    title: 'feat: dark mode toggle', author: 'carol',
    base_branch: 'main', head_branch: 'feat/dark-mode',
    diff_summary: '+210 -5 lines across 12 files. CSS variables, new ThemeProvider component, localStorage persistence.',
    review_status: 'pending', review_notes: null, reviewed_by_routine: false,
    opened_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), reviewed_at: null,
  },
  {
    id: uuidv4(), repo: 'org/routineflow-api', number: 140,
    title: 'chore: upgrade dependencies to latest', author: 'dave',
    base_branch: 'main', head_branch: 'chore/dep-upgrade',
    diff_summary: '+0 -0 lines logic changes. package.json and package-lock.json only.',
    review_status: 'approved',
    review_notes: 'No logic changes. Dependency audit clean — no new vulnerabilities introduced.',
    reviewed_by_routine: true,
    opened_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
  },
];

db.get('pull_requests').push(...prs).write();

// ─── Doc Health ───────────────────────────────────────────────────────────────

const docs = [
  {
    id: uuidv4(), file_path: 'src/auth/middleware.js',
    last_modified: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 22, drift_score: 91,
    issues: ['JWT refresh logic added but not documented', 'Rate limit middleware undocumented', '3 new exported functions with no JSDoc'],
    checked_at: docR.last_run,
  },
  {
    id: uuidv4(), file_path: 'src/api/payments.js',
    last_modified: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 45, drift_score: 85,
    issues: ['Stripe webhook handler undocumented', 'New refund endpoint missing from API reference', 'Error codes not listed'],
    checked_at: docR.last_run,
  },
  {
    id: uuidv4(), file_path: 'src/services/webhook.js',
    last_modified: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 30, drift_score: 78,
    issues: ['Backoff algorithm undocumented', 'Retry limits not specified in docs'],
    checked_at: docR.last_run,
  },
  {
    id: uuidv4(), file_path: 'src/routes/users.js',
    last_modified: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 88, drift_score: 12,
    issues: ['Minor: pagination params could be more explicit'],
    checked_at: docR.last_run,
  },
  {
    id: uuidv4(), file_path: 'src/routes/search.js',
    last_modified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 75, drift_score: 34,
    issues: ['New filter params not in API docs', 'Date range query example outdated'],
    checked_at: docR.last_run,
  },
  {
    id: uuidv4(), file_path: 'src/models/user.js',
    last_modified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    doc_coverage: 95, drift_score: 5,
    issues: [],
    checked_at: docR.last_run,
  },
];

db.get('doc_health').push(...docs).write();

const counts = {
  routines: db.get('routines').value().length,
  runs: db.get('routine_runs').value().length,
  issues: db.get('issues').value().length,
  deploys: db.get('deploys').value().length,
  prs: db.get('pull_requests').value().length,
  docs: db.get('doc_health').value().length,
};
console.log('Seed complete:', counts);
