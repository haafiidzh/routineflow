#!/usr/bin/env node
/**
 * Demo: Simulate a GitHub PR webhook event hitting the webhook routine
 * Usage: node scripts/simulate-webhook.js
 */

const BASE = `http://localhost:${process.env.PORT || 3000}/api`;

const payload = {
  pull_request: {
    number: Math.floor(Math.random() * 100) + 150,
    title: 'feat: add real-time notification streaming',
    user: { login: 'engineer-demo' },
    base: { ref: 'main' },
    head: { ref: 'feat/notifications-streaming' },
  },
};

(async () => {
  console.log('\nSimulating GitHub PR webhook...');
  console.log(`POST ${BASE}/routines/webhook/github`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(BASE + '/routines/webhook/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'pull_request',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('\nWebhook routine triggered:');
  console.log('  Status:', data.status);
  console.log('  Run ID:', data.run_id);
  console.log('  Output:', data.output);
})().catch(console.error);
