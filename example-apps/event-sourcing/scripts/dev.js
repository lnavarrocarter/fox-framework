#!/usr/bin/env node
const { execSync, spawn } = require('child_process');
const args = process.argv.slice(2);
const opts = new Set(args.flatMap(a => {
  if (a.startsWith('--option=')) return a.slice(9).split(',');
  if (a === '--infrastructure') return ['infrastructure'];
  return [];
}));
if (opts.has('infrastructure')) {
  console.log('[dev] Starting infrastructure...');
  execSync('docker compose -f docker-compose.infra.yml up -d', { stdio: 'inherit' });
  console.log('[dev] Infrastructure ready.\n');
}
const proc = spawn('npm', ['run', 'dev:app'], { stdio: 'inherit', shell: true });
proc.on('exit', code => process.exit(code ?? 0));
