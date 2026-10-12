// Checks for the browser patcher (web/src). Needs the official V15 FM-1.fwsc.
//   node tests/test_web.cjs /path/to/FM-1.fwsc
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const FM1Patch = require(path.join(__dirname, '..', 'web', 'src', 'fm1patch.js'));
const SPEC = require(path.join(__dirname, '..', 'web', 'src', 'patches.js'));

const stockPath = process.argv[2] || process.env.FM1_FWSC;
if (!stockPath) {
  console.error('usage: node tests/test_web.cjs /path/to/FM-1.fwsc');
  process.exit(2);
}
let failed = 0;
function check(label, cond) {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`);
  if (!cond) failed++;
}

const stock = new Uint8Array(fs.readFileSync(stockPath));
const before = Buffer.from(stock).toString('hex');

const r = FM1Patch.patch(stock, SPEC);
check('accepts the official V15 file', r.ok);
check(`all ${r.checks.length} patch sites match`, r.checks.length === 16 && r.checks.every(c => c.ok));
check('output SHA-256 matches the expected value', r.outMatchesExpected);
check('input buffer is left untouched', Buffer.from(stock).toString('hex') === before);

const flipped = stock.slice();
flipped[0x50000] ^= 1;
const r2 = FM1Patch.patch(flipped, SPEC);
check('rejects a file with one byte changed', !r2.ok && r2.error === 'sha256' && !r2.output);
const r3 = FM1Patch.patch(stock.slice(0, 1000), SPEC);
check('rejects a truncated file', !r3.ok && r3.error === 'sha256');

for (const n of [0, 1, 55, 56, 63, 64, 65, 1000, stock.length]) {
  const buf = stock.slice(0, n);
  const want = crypto.createHash('sha256').update(buf).digest('hex');
  check(`built-in SHA-256 equals node:crypto (${n} bytes)`, FM1Patch.sha256Hex(buf) === want);
}

console.log(failed ? `${failed} failed` : 'all ok');
process.exit(failed ? 1 : 0);
