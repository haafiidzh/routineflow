const API = '/api';
let currentView = 'dashboard';

// ─── Router ────────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    navigateTo(view);
  });
});

function navigateTo(view) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  currentView = view;
  renderView(view);
}

async function renderView(view) {
  switch (view) {
    case 'dashboard': return renderDashboard();
    case 'routines': return renderRoutines();
    case 'issues': return renderIssues();
    case 'deploys': return renderDeploys();
    case 'prs': return renderPRs();
    case 'docs': return renderDocs();
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function api(path) {
  const res = await fetch(API + path);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function badge(text, type) {
  return `<span class="badge badge-${type}">${text}</span>`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeUntil(iso) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'overdue';
  const m = Math.floor(diff / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
}

function duration(ms) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function showToast(title, msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-title">${title}</div>${msg}`;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), 5000);
}

function showModal(title, html) {
  document.getElementById('modal-content').innerHTML = `<h2>${title}</h2>${html}`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal-overlay').classList.add('hidden');
});
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.add('hidden');
});

// ─── Dashboard ─────────────────────────────────────────────────────────────

async function renderDashboard() {
  const c = document.getElementById('view-dashboard');
  const data = await api('/dashboard');

  c.innerHTML = `
    <div class="view-title">Dashboard</div>
    <div class="view-subtitle">Live overview of all Claude Code routine activity</div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">Total Routines</div>
        <div class="stat-value blue">${data.routines.total}</div>
        <div class="stat-sub">${data.routines.active} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Scheduled</div>
        <div class="stat-value blue">${data.routines.by_type.scheduled}</div>
        <div class="stat-sub">nightly / weekly</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">API-Triggered</div>
        <div class="stat-value purple">${data.routines.by_type.api}</div>
        <div class="stat-sub">deploy & alert</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Webhook</div>
        <div class="stat-value" style="color:var(--orange)">${data.routines.by_type.webhook}</div>
        <div class="stat-sub">GitHub events</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Runs</div>
        <div class="stat-value blue">${data.runs.total}</div>
        <div class="stat-sub">${data.runs.failed} failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open Issues</div>
        <div class="stat-value ${data.issues.critical > 0 ? 'red' : 'green'}">${data.issues.open}</div>
        <div class="stat-sub">${data.issues.critical} critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Deploys</div>
        <div class="stat-value ${data.deploys.failed > 0 ? 'red' : 'green'}">${data.deploys.healthy}</div>
        <div class="stat-sub">${data.deploys.failed} failed · ${data.deploys.pending} pending</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">PRs Awaiting Review</div>
        <div class="stat-value ${data.prs.pending_review > 0 ? 'yellow' : 'green'}">${data.prs.pending_review}</div>
        <div class="stat-sub">webhook routine checks</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">Recent Routine Runs</span>
        <span class="section-badge">${data.runs.total} total</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Routine</th>
              <th>Type</th>
              <th>Triggered By</th>
              <th>Status</th>
              <th>Duration</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            ${data.runs.recent.map(r => `
              <tr class="clickable-row" onclick='showRunModal(${JSON.stringify(r)})'>
                <td><strong>${r.routine_name}</strong></td>
                <td>${badge(r.routine_type, r.routine_type)}</td>
                <td><code style="font-size:11px;color:var(--text2)">${r.triggered_by}</code></td>
                <td>${badge(r.status, r.status)}</td>
                <td>${duration(r.duration_ms)}</td>
                <td style="color:var(--text2)">${timeAgo(r.started_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <span class="section-title">How Claude Code Routines Work</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${[
          { type: 'scheduled', icon: '🕐', title: 'Scheduled Routines', color: 'var(--accent)', desc: 'Set a cron cadence (hourly, nightly, weekly). Claude runs your prompt on infrastructure you don\'t manage. Examples: nightly backlog triage, weekly doc drift detection.' },
          { type: 'api', icon: '🔌', title: 'API Routines', color: 'var(--purple)', desc: 'Each routine gets its own endpoint + auth token. POST to trigger from CI/CD pipelines, alerting tools, or any script. Response includes a session URL for live output.' },
          { type: 'webhook', icon: '🪝', title: 'Webhook Routines', color: 'var(--orange)', desc: 'Wire to GitHub events. Filter by event type, PR target branch, or file path. One session per matching event — PR reviews, SDK port automation, compliance checks.' },
        ].map(item => `
          <div class="stat-card" style="border-color:${item.color}20">
            <div style="font-size:24px;margin-bottom:8px">${item.icon}</div>
            <div style="font-weight:700;color:${item.color};margin-bottom:8px">${item.title}</div>
            <div style="color:var(--text2);font-size:13px;line-height:1.6">${item.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ─── Routines view ─────────────────────────────────────────────────────────

async function renderRoutines() {
  const c = document.getElementById('view-routines');
  const routines = await api('/routines');

  c.innerHTML = `
    <div class="view-title">Routines</div>
    <div class="view-subtitle">All configured Claude Code routines — click a card to see details and run history</div>
    <div class="routine-grid">
      ${routines.map(r => `
        <div class="routine-card" onclick="openRoutineModal('${r.id}')">
          <div class="routine-card-header">
            <div class="routine-card-title">${r.name}</div>
            ${badge(r.status, r.status)}
          </div>
          <div class="routine-card-meta">
            ${badge(r.type, r.type)}
            <span class="badge" style="background:var(--bg3);color:var(--text2)">
              ${r.type === 'scheduled' ? r.trigger_config.description :
                r.type === 'api' ? r.trigger_config.endpoint :
                `${r.trigger_config.event} → ${r.trigger_config.filter || 'all'}`}
            </span>
          </div>
          <div class="routine-card-prompt">"${r.prompt}"</div>
          <div class="routine-card-footer">
            <div class="routine-card-stat">
              <strong>${r.run_count}</strong> runs · last ${timeAgo(r.last_run)}
            </div>
            <div class="routine-card-stat" style="color:${r.type === 'scheduled' ? 'var(--accent)' : 'var(--text2)'}">
              ${r.type === 'scheduled' ? `next ${timeUntil(r.next_run)}` : 'on-demand'}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function openRoutineModal(id) {
  const r = await api(`/routines/${id}`);
  const successRate = r.run_count
    ? Math.round(((r.run_count - (r.failed_runs || 0)) / r.run_count) * 100)
    : 100;

  showModal(r.name, `
    <div class="modal-section">
      <div class="modal-section-title">Type & Status</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${badge(r.type, r.type)} ${badge(r.status, r.status)}
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Trigger</div>
      <div class="modal-body">
        ${r.type === 'scheduled' ? `Cron: <code>${r.trigger_config.cron}</code> — ${r.trigger_config.description}` :
          r.type === 'api' ? `Endpoint: <code>POST ${r.trigger_config.endpoint}</code> (Bearer auth)` :
          `GitHub event: <code>${r.trigger_config.event}</code> · actions: ${r.trigger_config.actions?.join(', ')} · filter: ${r.trigger_config.filter}`}
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Prompt</div>
      <div class="modal-body" style="font-style:italic">"${r.prompt}"</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Stats</div>
      <div class="modal-body">${r.run_count} total runs · ${successRate}% success · last run ${timeAgo(r.last_run)}</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Recent Runs</div>
      <ul class="run-list">
        ${(r.recent_runs || []).slice(0, 5).map(run => `
          <li class="run-item" onclick='showRunModal(${JSON.stringify(run)})' style="cursor:pointer">
            <div class="run-dot ${run.status}"></div>
            <div>
              <div>${run.output ? run.output.substring(0, 100) + (run.output.length > 100 ? '…' : '') : 'No output'}</div>
              <div class="run-meta">${badge(run.status, run.status)} · ${run.triggered_by} · ${timeAgo(run.started_at)} · ${duration(run.duration_ms)}</div>
            </div>
          </li>
        `).join('') || '<li style="color:var(--text2);padding:8px 0">No runs yet</li>'}
      </ul>
    </div>
  `);
}

function showRunModal(run) {
  showModal('Run Details', `
    <div class="modal-section">
      <div class="modal-section-title">Status</div>
      ${badge(run.status, run.status)} · ${duration(run.duration_ms)}
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Triggered By</div>
      <code>${run.triggered_by}</code> · ${timeAgo(run.started_at)}
    </div>
    ${run.input ? `
    <div class="modal-section">
      <div class="modal-section-title">Input</div>
      <pre style="background:var(--bg);padding:10px;border-radius:6px;font-size:11px;overflow:auto;color:var(--accent)">${JSON.stringify(JSON.parse(run.input), null, 2)}</pre>
    </div>` : ''}
    ${run.output ? `
    <div class="modal-section">
      <div class="modal-section-title">Output</div>
      <div class="run-output">${run.output}</div>
    </div>` : ''}
  `);
}

// ─── Issues view ───────────────────────────────────────────────────────────

async function renderIssues() {
  const c = document.getElementById('view-issues');
  const [issues, stats] = await Promise.all([api('/issues'), api('/issues/stats')]);

  c.innerHTML = `
    <div class="view-title">Issues</div>
    <div class="view-subtitle">Backlog triaged nightly by the "Nightly Backlog Triage" scheduled routine</div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value blue">${stats.total}</div></div>
      <div class="stat-card"><div class="stat-label">Open</div><div class="stat-value green">${stats.open}</div></div>
      <div class="stat-card"><div class="stat-label">Triaged</div><div class="stat-value blue">${stats.triaged}</div><div class="stat-sub">by routine</div></div>
      <div class="stat-card"><div class="stat-label">Critical</div><div class="stat-value red">${stats.by_priority.critical}</div></div>
      <div class="stat-card"><div class="stat-label">High</div><div class="stat-value" style="color:var(--orange)">${stats.by_priority.high}</div></div>
      <div class="stat-card"><div class="stat-label">Medium</div><div class="stat-value blue">${stats.by_priority.medium}</div></div>
      <div class="stat-card"><div class="stat-label">Low</div><div class="stat-value" style="color:var(--text2)">${stats.by_priority.low}</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Triage Notes</th>
            <th>Triaged</th>
          </tr>
        </thead>
        <tbody>
          ${issues.map(i => `
            <tr class="clickable-row" onclick='showIssueModal(${JSON.stringify(i).replace(/'/g, "&#39;")})'>
              <td><strong>${i.title}</strong></td>
              <td>${badge(i.priority, i.priority)}</td>
              <td>${badge(i.status, i.status)}</td>
              <td style="color:var(--text2)">${i.assignee || '—'}</td>
              <td style="color:var(--text2);font-size:12px;max-width:260px">${i.triage_notes ? i.triage_notes.substring(0, 70) + '…' : '—'}</td>
              <td style="color:var(--text2)">${timeAgo(i.triaged_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showIssueModal(issue) {
  showModal(issue.title, `
    <div class="modal-section">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${badge(issue.priority, issue.priority)} ${badge(issue.status, issue.status)}
        ${(issue.labels || []).map(l => `<span class="badge" style="background:var(--bg3);color:var(--text2)">${l}</span>`).join('')}
      </div>
    </div>
    ${issue.body ? `<div class="modal-section"><div class="modal-section-title">Description</div><div class="modal-body">${issue.body}</div></div>` : ''}
    ${issue.triage_notes ? `<div class="modal-section"><div class="modal-section-title">Routine Triage Notes</div><div class="run-output">${issue.triage_notes}</div></div>` : ''}
    <div class="modal-section">
      <div class="modal-body">Assignee: ${issue.assignee || 'unassigned'} · Triaged ${timeAgo(issue.triaged_at)}</div>
    </div>
  `);
}

// ─── Deploys view ──────────────────────────────────────────────────────────

async function renderDeploys() {
  const c = document.getElementById('view-deploys');
  const [deploys, stats] = await Promise.all([api('/deploys'), api('/deploys/stats')]);

  c.innerHTML = `
    <div class="view-title">Deploys</div>
    <div class="view-subtitle">Health verified automatically by the "Deploy Verification" API routine after each CI/CD run</div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value blue">${stats.total}</div></div>
      <div class="stat-card"><div class="stat-label">Healthy</div><div class="stat-value green">${stats.healthy}</div></div>
      <div class="stat-card"><div class="stat-label">Failed</div><div class="stat-value red">${stats.failed}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--text2)">${stats.pending}</div></div>
      <div class="stat-card"><div class="stat-label">Verified by Routine</div><div class="stat-value blue">${stats.verified_by_routine}</div></div>
    </div>

    <div class="section">
      <div class="section-header"><span class="section-title">Deploy Verification Trigger</span></div>
      <div class="trigger-section">
        <div class="trigger-title">Trigger Deploy Verification Routine</div>
        <div class="trigger-desc">Simulates a CI/CD pipeline POSTing to the API routine endpoint after a deployment. The routine checks health, latency, error rates and marks the deploy as verified.</div>
        <div class="trigger-form">
          <div class="form-group">
            <label class="form-label">Service</label>
            <select class="form-select" id="deploy-service">
              <option value="api-gateway">api-gateway</option>
              <option value="user-service">user-service (bad deploy)</option>
              <option value="notification-service">notification-service</option>
              <option value="billing-service">billing-service</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Version</label>
            <input class="form-input" id="deploy-version" value="v2.4.0" />
          </div>
          <div class="form-group">
            <label class="form-label">Environment</label>
            <select class="form-select" id="deploy-env">
              <option>production</option>
              <option>staging</option>
            </select>
          </div>
          <button class="btn-primary" onclick="triggerDeployVerification()">Run Routine</button>
        </div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Version</th>
            <th>Environment</th>
            <th>Status</th>
            <th>Verified by Routine</th>
            <th>Notes</th>
            <th>Deployed</th>
          </tr>
        </thead>
        <tbody>
          ${deploys.map(d => `
            <tr class="clickable-row" onclick='showDeployModal(${JSON.stringify(d).replace(/'/g, "&#39;")})'>
              <td><strong>${d.service}</strong></td>
              <td><code style="font-size:12px">${d.version}</code></td>
              <td style="color:var(--text2)">${d.environment}</td>
              <td>${badge(d.status, d.status)}</td>
              <td>${d.verified_by_routine ? '✅ Yes' : '⏳ Pending'}</td>
              <td style="color:var(--text2);font-size:12px;max-width:220px">${d.verification_notes ? d.verification_notes.substring(0, 60) + '…' : '—'}</td>
              <td style="color:var(--text2)">${timeAgo(d.deployed_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showDeployModal(d) {
  const checks = d.health_checks || {};
  const checkHtml = Object.entries(checks).length
    ? Object.entries(checks).map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
          <code>${k}</code>
          <span style="color:${v.ok === false ? 'var(--red)' : 'var(--green)'}">${JSON.stringify(v)}</span>
        </div>
      `).join('')
    : '<div style="color:var(--text2)">No health checks yet</div>';

  showModal(`${d.service} ${d.version}`, `
    <div class="modal-section">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        ${badge(d.status, d.status)} <span style="color:var(--text2)">${d.environment}</span>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Health Checks</div>
      ${checkHtml}
    </div>
    ${d.verification_notes ? `
    <div class="modal-section">
      <div class="modal-section-title">Routine Verification Notes</div>
      <div class="run-output">${d.verification_notes}</div>
    </div>` : ''}
    <div class="modal-section">
      <div class="modal-body">Deployed ${timeAgo(d.deployed_at)} · Verified ${d.verified_at ? timeAgo(d.verified_at) : 'not yet'}</div>
    </div>
  `);
}

// ─── PRs view ──────────────────────────────────────────────────────────────

async function renderPRs() {
  const c = document.getElementById('view-prs');
  const [prs, stats] = await Promise.all([api('/prs'), api('/prs/stats')]);

  c.innerHTML = `
    <div class="view-title">Pull Requests</div>
    <div class="view-subtitle">Automatically reviewed by the "PR Code Review" webhook routine on every PR opened against main</div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value blue">${stats.total}</div></div>
      <div class="stat-card"><div class="stat-label">Pending Review</div><div class="stat-value yellow">${stats.pending_review}</div></div>
      <div class="stat-card"><div class="stat-label">Approved</div><div class="stat-value green">${stats.approved}</div></div>
      <div class="stat-card"><div class="stat-label">Changes Requested</div><div class="stat-value red">${stats.changes_requested}</div></div>
      <div class="stat-card"><div class="stat-label">Reviewed by Routine</div><div class="stat-value blue">${stats.reviewed_by_routine}</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>PR</th>
            <th>Repo</th>
            <th>Author</th>
            <th>Review Status</th>
            <th>Routine Review</th>
            <th>Diff</th>
            <th>Opened</th>
          </tr>
        </thead>
        <tbody>
          ${prs.map(p => `
            <tr class="clickable-row" onclick='showPRModal(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
              <td><strong>#${p.number}</strong> ${p.title}</td>
              <td style="color:var(--text2);font-size:12px">${p.repo}</td>
              <td style="color:var(--text2)">${p.author}</td>
              <td>${badge(p.review_status, p.review_status)}</td>
              <td>${p.reviewed_by_routine ? '🤖 Done' : '⏳ Pending'}</td>
              <td style="color:var(--text2);font-size:12px">${p.diff_summary ? p.diff_summary.substring(0, 40) + '…' : '—'}</td>
              <td style="color:var(--text2)">${timeAgo(p.opened_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showPRModal(p) {
  showModal(`#${p.number} ${p.title}`, `
    <div class="modal-section">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${badge(p.review_status, p.review_status)}
        <span style="color:var(--text2);font-size:13px">${p.repo} · by ${p.author} · ${p.head_branch} → ${p.base_branch}</span>
      </div>
    </div>
    ${p.diff_summary ? `
    <div class="modal-section">
      <div class="modal-section-title">Diff Summary</div>
      <div class="modal-body">${p.diff_summary}</div>
    </div>` : ''}
    ${p.review_notes ? `
    <div class="modal-section">
      <div class="modal-section-title">Routine Review Notes</div>
      <div class="run-output">${p.review_notes}</div>
    </div>` : ''}
    <div class="modal-section">
      <div class="modal-body">Opened ${timeAgo(p.opened_at)} · Reviewed ${p.reviewed_at ? timeAgo(p.reviewed_at) : 'not yet'}</div>
    </div>
  `);
}

// ─── Docs view ─────────────────────────────────────────────────────────────

async function renderDocs() {
  const c = document.getElementById('view-docs');
  const [docs, stats] = await Promise.all([api('/docs'), api('/docs/stats')]);

  c.innerHTML = `
    <div class="view-title">Documentation Health</div>
    <div class="view-subtitle">Drift scores updated weekly by the "Weekly Doc Drift Detection" scheduled routine</div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">Files Tracked</div><div class="stat-value blue">${stats.total_files}</div></div>
      <div class="stat-card"><div class="stat-label">High Drift (>70)</div><div class="stat-value red">${stats.high_drift_files}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Drift Score</div><div class="stat-value ${stats.avg_drift_score > 50 ? 'red' : 'green'}">${stats.avg_drift_score}</div></div>
      <div class="stat-card"><div class="stat-label">Avg Coverage</div><div class="stat-value ${stats.avg_coverage > 60 ? 'green' : 'yellow'}">${stats.avg_coverage}%</div></div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>Drift Score</th>
            <th>Coverage</th>
            <th>Issues Found</th>
            <th>Last Checked</th>
          </tr>
        </thead>
        <tbody>
          ${docs.map(d => {
            const driftClass = d.drift_score > 70 ? 'high' : d.drift_score > 40 ? 'medium' : 'low';
            return `
              <tr class="clickable-row" onclick='showDocModal(${JSON.stringify(d).replace(/'/g, "&#39;")})'>
                <td><code style="font-size:12px">${d.file_path}</code></td>
                <td>
                  <div class="drift-bar-wrap">
                    <div class="drift-bar"><div class="drift-fill ${driftClass}" style="width:${d.drift_score}%"></div></div>
                    <span class="drift-label" style="color:${driftClass === 'high' ? 'var(--red)' : driftClass === 'medium' ? 'var(--yellow)' : 'var(--green)'}">${d.drift_score}</span>
                  </div>
                </td>
                <td>
                  <div class="drift-bar-wrap">
                    <div class="drift-bar"><div class="drift-fill ${d.doc_coverage > 60 ? 'low' : 'high'}" style="width:${d.doc_coverage}%"></div></div>
                    <span class="drift-label">${d.doc_coverage}%</span>
                  </div>
                </td>
                <td style="color:var(--text2);font-size:12px">${d.issues.length} issue${d.issues.length !== 1 ? 's' : ''}</td>
                <td style="color:var(--text2)">${timeAgo(d.checked_at)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function showDocModal(d) {
  showModal(d.file_path, `
    <div class="modal-section">
      <div class="modal-section-title">Drift Score</div>
      <div style="font-size:28px;font-weight:700;color:${d.drift_score > 70 ? 'var(--red)' : d.drift_score > 40 ? 'var(--yellow)' : 'var(--green)'}">${d.drift_score} / 100</div>
      <div style="color:var(--text2);font-size:12px;margin-top:4px">Doc coverage: ${d.doc_coverage}%</div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Issues Found by Routine</div>
      ${d.issues.length
        ? `<ul style="list-style:none">${d.issues.map(i => `<li style="padding:6px 0;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px">⚠ ${i}</li>`).join('')}</ul>`
        : '<div style="color:var(--green)">No issues — docs are up to date</div>'}
    </div>
    <div class="modal-section">
      <div class="modal-body">Last checked ${timeAgo(d.checked_at)} · Last modified ${timeAgo(d.last_modified)}</div>
    </div>
  `);
}

// ─── Trigger buttons ───────────────────────────────────────────────────────

document.getElementById('triggerDeploy').addEventListener('click', () => {
  navigateTo('deploys');
  showToast('Deploy Check', 'Navigate to Deploys tab and use the form to trigger a verification routine.', 'info');
});

document.getElementById('triggerAlert').addEventListener('click', async () => {
  showToast('Alert Triage Running…', 'Triggering the Alert Triage API routine…', 'info');
  try {
    const result = await post('/routines/trigger/alert-triage', {
      alert: 'Elevated error rate on /api/checkout',
      severity: 'warning',
      source: 'Datadog',
    });
    showToast('Alert Triage Complete', result.output, 'success');
    if (currentView === 'routines') renderRoutines();
    if (currentView === 'dashboard') renderDashboard();
  } catch (e) {
    showToast('Error', 'Routine trigger failed.', 'error');
  }
});

document.getElementById('triggerWebhook').addEventListener('click', async () => {
  showToast('Webhook Received…', 'Simulating a GitHub PR webhook event…', 'info');
  try {
    const prNum = Math.floor(Math.random() * 50) + 150;
    const result = await post('/routines/webhook/github', {
      pull_request: {
        number: prNum,
        title: `feat: new feature branch #${prNum}`,
        user: { login: 'developer' },
      },
    });
    showToast('Webhook Routine Complete', result.output, 'success');
    if (currentView === 'routines') renderRoutines();
    if (currentView === 'dashboard') renderDashboard();
  } catch (e) {
    showToast('Error', 'Webhook simulation failed.', 'error');
  }
});

async function triggerDeployVerification() {
  const service = document.getElementById('deploy-service').value;
  const version = document.getElementById('deploy-version').value;
  const environment = document.getElementById('deploy-env').value;

  showToast('Deploy Verification Running…', `Checking ${service} ${version}…`, 'info');
  try {
    const result = await post('/routines/trigger/deploy-verification', { service, version, environment });
    const type = result.status === 'completed' ? 'success' : 'error';
    showToast(`Deploy ${result.status === 'completed' ? 'Verified ✅' : 'Failed ❌'}`, result.output, type);
    renderDeploys();
  } catch (e) {
    showToast('Error', 'Trigger failed.', 'error');
  }
}

// ─── Boot ──────────────────────────────────────────────────────────────────

renderView('dashboard');
