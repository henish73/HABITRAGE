const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const action = process.argv[2] || 'up';
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.resolve(rootDir, '.test-pg-data');
const pgBinDir = 'C:\\Program Files\\PostgreSQL\\17\\bin';

function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', cwd: rootDir, ...opts });
}

if (action === 'up') {
  if (isDockerAvailable()) {
    console.log('[test-db] Using Docker Compose...');
    run('docker compose up -d test-db');
  } else if (fs.existsSync(pgBinDir)) {
    console.log('[test-db] Docker not running. Using local PostgreSQL 17 on port 5433...');
    if (!fs.existsSync(dataDir)) {
      console.log('[test-db] Initializing data directory at', dataDir);
      run(`"${path.join(pgBinDir, 'initdb.exe')}" -D "${dataDir}" -U postgres -A trust`);
    }
    // Check if running
    try {
      execSync(`"${path.join(pgBinDir, 'pg_ctl.exe')}" -D "${dataDir}" status`, { stdio: 'ignore' });
      console.log('[test-db] PostgreSQL on 5433 is already running.');
    } catch {
      console.log('[test-db] Starting PostgreSQL on port 5433...');
      const logFile = path.join(dataDir, 'server.log');
      run(`"${path.join(pgBinDir, 'pg_ctl.exe')}" -D "${dataDir}" -o "-p 5433" -l "${logFile}" start`);
    }
    // Ensure database exists
    try {
      execSync(`"${path.join(pgBinDir, 'createdb.exe')}" -h 127.0.0.1 -p 5433 -U postgres financeos_test`, { stdio: 'ignore' });
      console.log('[test-db] Created database financeos_test');
    } catch {
      // already exists
    }
  } else {
    console.error('[test-db] Error: Neither Docker nor PostgreSQL 17 found.');
    process.exit(1);
  }
} else if (action === 'down') {
  if (isDockerAvailable()) {
    try {
      run('docker compose down');
    } catch {}
  }
  if (fs.existsSync(path.join(pgBinDir, 'pg_ctl.exe')) && fs.existsSync(dataDir)) {
    try {
      run(`"${path.join(pgBinDir, 'pg_ctl.exe')}" -D "${dataDir}" stop`);
      console.log('[test-db] Stopped local PostgreSQL.');
    } catch {}
  }
}
