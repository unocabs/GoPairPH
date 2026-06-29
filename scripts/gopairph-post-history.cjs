#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const statePath = path.resolve(
  __dirname,
  '..',
  '.automation-state',
  'gopairph-post-history.json',
);

function readHistory() {
  if (!fs.existsSync(statePath)) return [];
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

function writeHistory(history) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(history.slice(-7), null, 2)}\n`);
}

const [command = 'list', payload] = process.argv.slice(2);

if (command === 'list') {
  process.stdout.write(`${JSON.stringify(readHistory(), null, 2)}\n`);
  process.exit(0);
}

if (command === 'add') {
  if (!payload) {
    console.error('Usage: node scripts/gopairph-post-history.cjs add <json-record>');
    process.exit(1);
  }

  const record = JSON.parse(payload);
  writeHistory([...readHistory(), record]);
  process.stdout.write(`${JSON.stringify(readHistory(), null, 2)}\n`);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
