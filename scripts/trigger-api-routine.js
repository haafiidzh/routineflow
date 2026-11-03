#!/usr/bin/env node
/**
 * Demo: Trigger an API Routine from the command line
 * Usage: node scripts/trigger-api-routine.js deploy
 *        node scripts/trigger-api-routine.js alert
 */

const type = process.argv[2] || 'deploy';
const BASE = `http://localhost:${process.env.PORT || 3000}/api`;
const TOKEN = process.env.API_ROUTINE_TOKEN || '';

const payloads = {
  deploy: {
    path: '/routines/trigger/deploy-verification',
    body: { service: 'api-gateway', version: 'v2.5.0', environment: 'production' },
  },
  alert: {
    path: '/routines/trigger/alert-triage',
    body: { alert: 'Memory usage > 90% on api-gateway-prod-3', severity: 'critical', source: 'Prometheus' },
  },
};

const target = payloads[type];
if (!target) {
  console.error(`Unknown routine type: ${type}. Use 'deploy' or 'alert'.`);
  process.exit(1);
}

(async () => {
  console.log(`\nTriggering "${type}" API routine...`);
  console.log(`POST ${BASE}${target.path}`);
  console.log('Payload:', JSON.stringify(target.body, null, 2));

  const res = await fetch(BASE + target.path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(target.body),
  });

  const data = await res.json();
  console.log('\nRoutine completed:');
  console.log('  Status:', data.status);
  console.log('  Run ID:', data.run_id);
  console.log('  Session URL:', data.session_url);
  console.log('  Output:', data.output);
})().catch(console.error);
