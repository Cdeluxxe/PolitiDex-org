#!/usr/bin/env node
// test-stance-oppose-mixed-rules.mjs — R21 (2026-11-26): general oppose / mixed
// reads the earlier rules got wrong or missed.
//
// Every sentence here is written for this suite. None is taken from a locked
// ground-truth record: the six-politician oppose / mixed set
// (db/stance-ground-truth-six-oppose-mixed-2026-11.json) is the measuring set
// for these rules and is never quoted in a stance test (its own guard suite
// fails if one is).
//
//   (a) a counter verb on an effort before a polarity frame turns it around;
//   (b) "prohibit / bar / stop X from <verb>ing Y" counters Y;
//   (c) criticism — a policy as the subject of a verdict, or "waste … on" it —
//       reads the side against it; harm nouns and the speaker's own subject do not;
//   (d) gun keys: a negated harm on the right, and limit / curtail / impinge on
//       the rights of law-abiding owners;
//   (e) R14 reads procedural opposition in the lead (floor opposition, a veto).
// Read-only: nothing is written to the stance store or the Evidence Locker.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = await import(pathToFileURL(path.join(root, 'netlify/lib/stance-score-core.mjs')).href);

let failures = 0;
const t = (name, fn) => {
  try { fn(); console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const side = (sentence, topic) => { const c = S.classify(sentence, topic, 'test_member'); return c.kind === 'clear' ? c.side : c.kind; };
const page = (paras, topic, source_type = 'press release') => S.scoreRawRecord({
  url: 'https://test-member.house.gov/media/press-releases/example', fetched_at: '2026-11-26T00:00:00.000Z', source_type,
  politician_id: 'test_member', topic, body: paras.map((p) => `<p>${p}</p>`).join('\n'),
}, topic).position;

// (a)
t('R21a: "stand against efforts to repeal <a pro-life provision>" is oppose on pro_choice, support on pro_life', () => {
  const s = 'We stand against efforts to repeal the Hyde Amendment in every spending bill.';
  assert.equal(side(s, 'pro_choice'), 'oppose');
  assert.equal(side(s, 'pro_life'), 'support');
});
t('R21a control: a call to repeal it still reads support on pro_choice', () => {
  assert.equal(side('We will repeal the Hyde Amendment.', 'pro_choice'), 'support');
});
// (b)
t('R21b: "prohibits the Department from funding wind energy" is oppose on climate_action', () => {
  assert.equal(side('My amendment prohibits the Department from funding wind energy projects.', 'climate_action'), 'oppose');
});
t('R21b: "bar the agency from blocking …" defends what is blocked', () => {
  assert.equal(side('This bill would bar the agency from cutting Social Security benefits for retirees.', 'social_security'), 'support');
});
// (c)
t('R21c: a program as the subject of "is not the answer" reads oppose', () => {
  assert.equal(side('Medicare for All is not the answer for working families.', 'healthcare'), 'oppose');
});
t('R21c: "waste billions on <a border wall>" reads oppose on border_security', () => {
  assert.equal(side('The plan would waste $4.2 billion on a border wall.', 'border_security'), 'oppose');
});
t('R21c: an action named as the subject of "does nothing to" reads against it', () => {
  assert.equal(side('Funding more deportation flights does nothing to fix our immigration system.', 'deportations'), 'oppose');
});
t('R21c control: a harm noun between the program and the verdict judges the harm, not the program', () => {
  assert.notEqual(side('Medicaid cuts do nothing to help families.', 'healthcare'), 'oppose');
});
t('R21c control: the speaker as subject is not a verdict on the policy', () => {
  assert.equal(side('I support clean energy jobs in every county.', 'climate_action'), 'support');
});
t('R21c control: "is a disaster" can describe a problem, so it is not read as criticism', () => {
  assert.notEqual(side('The border is a disaster.', 'border_security'), 'oppose');
});
// (d)
t('R21d: "the right to bear arms shall not be infringed" is oppose on gun_safety, support on gun_rights', () => {
  const s = 'Our right to bear arms shall not be infringed.';
  assert.equal(side(s, 'gun_safety'), 'oppose');
  assert.equal(side(s, 'gun_rights'), 'support');
});
t('R21d: curtailing the rights of law-abiding gun owners reads oppose on gun_safety', () => {
  assert.equal(side('These new mandates would curtail the rights of law-abiding gun owners.', 'gun_safety'), 'oppose');
});
t('R21d control: a red-flag call stays gun-safety support', () => {
  assert.equal(side('I have called for red flag laws in our state.', 'gun_safety'), 'support');
});
// (e)
t('R21e: "I rise today in opposition to" a named gun bill reads oppose', () => {
  assert.equal(page(['I rise today in opposition to H.R. 4021, the Assault Weapons Ban Act.', 'This bill punishes the law-abiding.'], 'gun_safety', 'floor speech'), 'oppose');
});
t('R21e: a veto of a named measure reads oppose', () => {
  assert.equal(page(['Today I vetoed S.J. Res. 12, a war powers resolution on hostilities against Iran.', 'It ties the hands of our commanders.'], 'iran_hostilities', 'statement'), 'oppose');
});
t('R21e control: urging someone else to veto is not the politician\'s own veto', () => {
  assert.notEqual(page(['I urge the Governor to veto S.J. Res. 12, a war powers resolution on hostilities against Iran.', 'The resolution is long overdue.'], 'iran_hostilities', 'statement'), 'oppose');
});

if (failures) { console.error(`${failures} failing`); process.exit(1); }
console.log('stance oppose / mixed rules (R21): all checks pass');
