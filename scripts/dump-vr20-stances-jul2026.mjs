#!/usr/bin/env node
// Read-only: dump the curated stance cards for the 20 unlocked VR members so a
// depth pass can match each on-record pledge to a roll call already in the
// voting record. node scripts/dump-vr20-stances-jul2026.mjs [id]
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const IDS = 'bennie_thompson bruce_westerman don_davis frank_lucas josh_brecheen julie_fedorchak mariannette_miller_meeks michael_guest mike_collins mike_ezell mike_flood mike_simpson rick_crawford rob_bresnahan ryan_mackenzie scott_perry stephanie_bice steve_womack trent_kelly troy_downing'.split(' ');

const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
ctx.navigator = { userAgent: 'node' };
ctx.location = { href: '', search: '', hash: '' };
const sandbox = vm.createContext(ctx);
const indexSrc = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const re = /<script[^>]*\bsrc="([^"]+stances[^"]*\.js)"/g;
let m;
while ((m = re.exec(indexSrc))) {
  const f = m[1].replace(/^\//, '');
  if (f === 'my-stances.js' || !fs.existsSync(path.join(ROOT, f))) continue;
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const S = ctx.ISSUE_STANCE_DATA || {};
const only = process.argv[2];
for (const id of IDS) {
  if (only && id !== only) continue;
  console.log('\n=== ' + id + ' (' + (S[id] || []).length + ' cards) ===');
  (S[id] || []).forEach((c, i) => {
    console.log(' [' + i + '] ' + c.topic + ' | key=' + (c.issueKey || 'NONE') + ' | pos=' + c.pos +
      ' | stance=' + (c.issueStance || '-') + ' | src=' + (c.source ? c.source.label + ' <' + c.source.url + '>' : 'NONE'));
    console.log('      ' + (c.text || '').replace(/\s+/g, ' '));
  });
}
