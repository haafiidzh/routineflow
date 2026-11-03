const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const adapter = new FileSync(path.join(dataDir, 'routineflow.json'));
const db = low(adapter);

db.defaults({
  routines: [],
  routine_runs: [],
  issues: [],
  deploys: [],
  pull_requests: [],
  doc_health: [],
}).write();

module.exports = db;
