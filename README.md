# RoutineFlow

A full-stack JavaScript dashboard that demonstrates all three types of **Claude Code Routines** — scheduled, API-triggered, and webhook-based. Built to prove the concepts from the [Introducing Routines in Claude Code](https://claude.com/blog/introducing-routines-in-claude-code) article.

---

## What Are Claude Code Routines?

Claude Code Routines are automations you configure once — with a prompt, a repository, and a trigger — and Claude runs them on Anthropic's cloud infrastructure. Your device does not need to be on.

There are three trigger types:

| Type | How It Fires | Example |
|---|---|---|
| **Scheduled** | Cron cadence (hourly / nightly / weekly) | Nightly backlog triage at 2:00 AM |
| **API** | POST to a unique endpoint with a Bearer token | CI/CD pipeline triggers deploy verification |
| **Webhook** | GitHub event matching a filter | PR opened against `main` triggers code review |

---

## What This Project Does

RoutineFlow simulates a real DevOps team's automation layer. It models six routines across all three types, stores results in a JSON database, and exposes a live dashboard to see routine runs, triaged issues, deploy health, PR reviews, and documentation drift scores.

The project does **not** run real Claude AI calls — it simulates the outputs. It is designed to teach you what routines produce and how to wire them up before you connect the real Claude API or the Claude Code Routines feature.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Server | Express 4 |
| Database | lowdb (JSON file, pure JS — no native build needed) |
| Scheduler | node-cron |
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| IDs | uuid v4 |

---

## Project Structure

```
routineflow/
├── server/
│   ├── index.js                  # Express entry point, mounts all routes, starts scheduler
│   ├── routes/
│   │   ├── routines.js           # Routine CRUD + all three trigger endpoints
│   │   ├── issues.js             # Backlog issue list and stats
│   │   ├── deploys.js            # Deploy records and health check results
│   │   ├── prs.js                # Pull request list and review stats
│   │   └── docs.js               # Documentation drift scores
│   ├── services/
│   │   └── scheduler.js          # node-cron jobs (nightly triage, next-run updates)
│   └── db/
│       ├── database.js           # lowdb setup and default schema
│       └── seed.js               # Populates all tables with realistic dummy data
├── client/
│   ├── index.html                # SPA shell with nav and modal containers
│   ├── css/style.css             # Dark theme, GitHub-style UI
│   └── js/app.js                 # All view rendering and API calls (vanilla JS)
├── scripts/
│   ├── trigger-api-routine.js    # CLI script: POST to deploy-verification or alert-triage
│   └── simulate-webhook.js       # CLI script: send a fake GitHub PR webhook event
├── data/
│   └── routineflow.json          # Live JSON database (auto-created by seed, gitignored)
├── .env.example                  # Environment variable template
├── .gitignore
└── package.json
```

---

## The Six Routines

### Scheduled

**1. Nightly Backlog Triage**
- Trigger: `0 2 * * *` — every night at 2:00 AM
- Prompt: Review all open issues, assign priority (critical / high / medium / low) based on labels and description, add triage notes.
- What it does in this project: Scans open issues, applies priority rules based on label keywords (`data-loss` → critical, `auth` → high, `typo` → low), writes triage notes back to the issue, logs a run record.

**2. Weekly Doc Drift Detection**
- Trigger: `0 9 * * 1` — every Monday at 9:00 AM
- Prompt: Compare each file's last-modified date with its documentation last-updated date. Flag files with a drift score above 70 and suggest what sections need updating.
- What it does in this project: Reads `doc_health` records, counts high-drift files, logs a summary run.

### API-Triggered

**3. Deploy Verification**
- Endpoint: `POST /api/routines/trigger/deploy-verification`
- Auth: Bearer token (`API_ROUTINE_TOKEN` env var, optional in dev)
- Payload: `{ service, version, environment }`
- Prompt: Check health endpoints, verify response times and error rates, confirm the deployment succeeded.
- What it does in this project: Runs a simulated health check suite (4 checks: `/health`, error rate, p99 latency, DB connections), marks the deploy record as `healthy` or `failed`, logs the run.
- Demo bad deploy: Send `service: "user-service", version: "v1.8.0"` to trigger a deliberately failing scenario.

**4. Alert Triage**
- Endpoint: `POST /api/routines/trigger/alert-triage`
- Auth: Bearer token (optional in dev)
- Payload: `{ alert, severity, source }`
- Prompt: Analyze the alert, correlate with recent deploys and open issues, assess severity, produce a recommended next-steps summary.
- What it does in this project: Pulls the 3 most recent deploys and all open high-priority issues, builds a contextual summary, logs the run.

### Webhook

**5. PR Code Review**
- Trigger: GitHub `pull_request` event, actions `opened` / `synchronize`, filter `base:main`
- Endpoint: `POST /api/routines/webhook/github` (with `x-github-event: pull_request` header)
- Prompt: Review the diff for security vulnerabilities, performance regressions, missing tests, style violations, and breaking API changes.
- What it does in this project: Logs a run record for the incoming PR, marks the PR as `reviewed` in the database.

**6. SDK Port Automation** *(paused)*
- Trigger: GitHub `push` event on `main` matching paths `src/api/**`
- Prompt: For every changed API function, generate the equivalent TypeScript and Python SDK methods. Open a draft PR.
- Status: Paused in seed data to demonstrate that routines can be toggled on/off.

---

## API Reference

### Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard` | Aggregate stats for all sections |

### Routines

| Method | Path | Description |
|---|---|---|
| GET | `/api/routines` | List all routines with run counts |
| GET | `/api/routines/:id` | Single routine with last 20 runs |
| GET | `/api/routines/runs/all` | Recent runs across all routines |
| GET | `/api/routines/runs/:id` | Single run detail |
| GET | `/api/routines/stats/summary` | Aggregate routine stats |
| PATCH | `/api/routines/:id/status` | Set status to `active` or `paused` |
| POST | `/api/routines/trigger/deploy-verification` | Trigger deploy verification routine |
| POST | `/api/routines/trigger/alert-triage` | Trigger alert triage routine |
| POST | `/api/routines/webhook/github` | Receive GitHub webhook event |

### Issues, Deploys, PRs, Docs

| Method | Path | Description |
|---|---|---|
| GET | `/api/issues` | List issues (filter by `?status=` `?priority=`) |
| GET | `/api/issues/stats` | Issue counts by priority |
| GET | `/api/deploys` | List deploys sorted by date |
| GET | `/api/deploys/stats` | Deploy counts by status |
| GET | `/api/prs` | List pull requests |
| GET | `/api/prs/stats` | PR counts by review status |
| GET | `/api/docs` | Doc health records sorted by drift score |
| GET | `/api/docs/stats` | Avg drift, coverage, high-drift count |

---

## Setup

```bash
# 1. Clone or copy the project
cd /home/coder/routineflow

# 2. Install dependencies
npm install

# 3. Copy env template
cp .env.example .env

# 4. Seed dummy data
npm run seed

# 5. Start the server
npm start
# → http://localhost:3000
```

### Development (auto-restart)
```bash
npm run dev
```

### CLI scripts
```bash
# Trigger deploy verification from the command line (simulates a CI/CD pipeline call)
npm run trigger:deploy

# Trigger alert triage (simulates PagerDuty / Datadog calling the routine endpoint)
npm run trigger:alert

# Simulate a GitHub PR webhook event
npm run simulate:webhook
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Environment name |
| `API_ROUTINE_TOKEN` | *(empty)* | Bearer token for API routine endpoints. If empty, auth is skipped in dev. |
| `GITHUB_WEBHOOK_SECRET` | *(empty)* | HMAC secret for verifying real GitHub webhook payloads |
| `DB_PATH` | `./data/routineflow.json` | Path to the JSON database file |
| `DEMO_SCHEDULER` | `false` | Set to `true` to run the triage routine every minute (for demos) |

---

## Dummy Data

The seed script (`server/db/seed.js`) creates:

| Collection | Count | Notes |
|---|---|---|
| Routines | 6 | 2 scheduled, 2 API, 2 webhook (1 paused) |
| Routine Runs | 7 | Mix of completed and failed, all trigger types |
| Issues | 8 | All priorities, triaged with notes |
| Deploys | 4 | 2 healthy, 1 failed, 1 pending |
| Pull Requests | 4 | Mix of approved, changes requested, pending |
| Doc Health | 6 | Range of drift scores from 5 to 91 |

Re-running `npm run seed` resets all data to this baseline.

---

## Dashboard Views

| View | What It Shows |
|---|---|
| **Dashboard** | Summary stats, recent run log, explainer cards for each routine type |
| **Routines** | All 6 routine cards with type, status, prompt preview, run count, next scheduled run |
| **Issues** | Triaged backlog sorted by priority, triage notes from the nightly routine |
| **Deploys** | Health check results per deploy, verification status, inline trigger form |
| **Pull Requests** | PR list with review status and routine-generated review notes |
| **Doc Health** | Drift score bars per file, issues list, coverage percentage |

Every row and card is clickable and opens a detail modal.

---

## Making It Real

### Option 1 — Use Claude Code Routines directly (recommended)

No deployment needed. Routines run on Anthropic's infrastructure — your device can be off.

1. Install Claude Code: `npm install -g @anthropic-ai/claude-code`
2. Authenticate: `claude login`
3. Open the Routines panel in Claude Code
4. Write a prompt, pick a trigger, connect your GitHub repo
5. Done — Anthropic's cloud handles execution

**Limits:** Pro: 5 routines/day · Max: 15/day · Team/Enterprise: 25/day

### Option 2 — Deploy this project + real Claude API calls

Deploy the Node.js server to a cloud host so it runs 24/7 and is reachable by real GitHub webhooks.

**Easy free hosts:** Railway, Render, Fly.io

**Replace simulated outputs with real Claude API calls:**

```js
// Install the SDK
// npm install @anthropic-ai/sdk

const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

// In your route handler, replace the hardcoded output string with:
const message = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: routine.prompt + '\n\nContext:\n' + JSON.stringify(input, null, 2)
  }]
});
const output = message.content[0].text;
```

**Wire real GitHub webhooks:**
1. Deploy the server to get a public URL
2. In your GitHub repo → Settings → Webhooks → Add webhook
3. Payload URL: `https://your-app.railway.app/api/routines/webhook/github`
4. Content type: `application/json`
5. Events: Pull requests, Pushes

**Add webhook signature verification** (for production):
```js
const crypto = require('crypto');

function verifyGitHubSignature(req) {
  const sig = req.headers['x-hub-signature-256'];
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(digest));
}
```

---

## Suggested Real-World Routines

These are prompts you can use directly in Claude Code Routines or adapt for this project:

| Name | Type | Cadence / Trigger | Prompt Idea |
|---|---|---|---|
| Nightly Dependency Audit | Scheduled | Nightly | Run npm audit, find new CVEs rated High or Critical, open a GitHub issue with remediation steps |
| Flaky Test Detector | Scheduled | Weekly | Scan the last 50 CI runs, identify tests that flipped pass→fail more than twice, comment on the relevant PR |
| Deploy Rollback Advisor | API | On deploy failure | Given a failed deploy diff, compare against known-good versions, recommend the safest rollback target |
| PR Compliance Enforcer | Webhook | PR opened | Check for license headers, CHANGELOG entry, breaking API changes without migration guide, TODOs without linked issues |
| Doc Coverage Reporter | Scheduled | Weekly | Diff doc coverage scores week-over-week, post the top 5 files that need updating before the next release |
| On-Call Briefing Generator | API | Start of on-call shift | Pull last 24h of alerts, deploys, and critical issues, generate a structured handoff brief |

---

## Limitations of This Demo

- **No real AI calls.** All routine output is simulated. Replace with `@anthropic-ai/sdk` calls to get real Claude responses.
- **Local only.** `node-cron` stops when the process stops. For true "device off" scheduling, use Claude Code Routines or deploy to a persistent host.
- **No webhook signature verification.** The GitHub webhook endpoint accepts any payload. Add HMAC verification before exposing it publicly.
- **JSON database.** `lowdb` is fine for demos but not for concurrent writes at scale. Replace with PostgreSQL or SQLite for production.

---

## License

MIT
