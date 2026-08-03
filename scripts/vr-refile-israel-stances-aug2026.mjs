// ─────────────────────────────────────────────────────────────────────────────
// vr-refile-israel-stances-aug2026.mjs — put the Israel stances under the Israel key
// ─────────────────────────────────────────────────────────────────────────────
// `israel_support` was added to ISSUE_MAP because 76 sourced rows in
// ISSUE_STANCE_DATA already state a direction on U.S. support for Israel while being
// filed under four general-posture keys — foreign_balance (43), strong_defense (28),
// restraint (3), america_first_fp (2). Adding the key without moving those rows would
// have made the whole issue vertical read as a stance desert: every member with an
// Israel vote would show up as "votes exist, no stated position" when the position is
// sitting right there, one key over. So the coverage picture would have been wrong in
// the exact way this pass is supposed to fix.
//
// What moves and what does not is a single rule, applied row by row rather than by
// regex, because the distinction is semantic:
//
//   MOVES — the row's operative claim is a direction on U.S. support for Israel and
//   nothing else material. "Israel Aid & Conditions", "Support for Israel",
//   "Israel & the Alliance", "Blocking Arms Sales to Israel".
//
//   STAYS — Israel appears as one item inside a broader posture the row is really
//   about, and moving it would delete the rest of the signal. Three families:
//     · general defense/foreign-policy rows ("Defense", "National Security",
//       "Foreign Policy", "National Defense", "Defense & Allies") — the sentence is
//       about military strength or alliances generally and names Israel in a list;
//     · two-theatre aid rows ("Israel & Ukraine Aid") — these are statements about
//       the 2024 national-security supplemental, where Israel is co-equal with
//       Ukraine and the Indo-Pacific. Re-keying them to israel_support would silently
//       recode a Ukraine-aid position as an Israel-only one, which is the mirror image
//       of the force-fit this pass exists to undo;
//     · blended defense-and-Israel rows ("Defense & Israel", "Israel & Defense",
//       "Foreign Policy & Israel") — same reasoning as the first family, even though
//       the topic string happens to lead with "Israel".
//
// Nothing is added, nothing is deleted, no text or source changes: only the issueKey
// on rows that were filed under a chip their own sentence never addressed. Idempotent
// — a row already on israel_support is counted and skipped.
//
// Run:  node scripts/vr-refile-israel-stances-aug2026.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "politician-stances.js");
const WRITE = process.argv.includes("--write");
const NEW_KEY = "israel_support";

// (pid, topic) → the row moves. Topic disambiguates within a politician, so this list
// survives edits above it in the file. Every entry was read in full before inclusion.
const MOVES = [
  ["haley_stevens", "Israel & Foreign Policy"],
  ["thune", "Israel & Foreign Aid"],
  ["jeffries", "Israel & Foreign Aid"],
  ["schumer", "Israel & U.S. Aid"],
  ["fetterman", "Support for Israel"],
  ["hegseth", "Israel & Iran"],
  ["sanders", "Blocking Arms Sales to Israel"],
  ["risch", "Israel & U.S. Aid"],
  ["slotkin", "Israel's Security, With Conditions"],
  ["tim_scott", "Support for Israel"],
  ["brian_mast", "Support for Israel"],
  ["chris_murphy", "Israel Aid & Conditions"],
  ["mark_kelly", "Israel & National Security"],
  ["lankford", "Support for Israel"],
  ["gallego", "Support for Israel"],
  ["kaine", "Israel Aid & War Powers"],
  ["schiff", "Israel Aid & Conditions"],
  ["meeks", "Israel Aid & Two-State"],
  ["adam_smith", "Israel Aid & Conditions"],
  ["britt", "Support for Israel"],
  ["reed", "Israel Aid"],
  ["shaheen", "Israel Aid"],
  ["jayapal", "Israel Aid & Gaza"],
  ["van_hollen", "Israel Aid & Conditions"],
  ["warnock", "Israel Aid"],
  ["ratcliffe", "Iran & Israel"],
  ["stefanik", "Israel & Campus Antisemitism"],
  ["witkoff", "Israel & Gaza"],
  ["torres", "Israel Aid"],
  ["omar", "Israel Aid & Gaza"],
  ["mike_waltz", "Israel"],
  ["tlaib", "Israel Aid & Gaza"],
  ["andy_kim", "Israel & Gaza"],
  ["rosen", "Israel"],
  ["dan_goldman", "Israel"],
  ["mike_lawler", "Israel"],
  ["summer_lee", "Israel Aid & Gaza"],
  ["steny_hoyer", "Israel Aid"],
  ["keith_kellogg", "Israel & the Middle East"],
  ["josh_gottheimer", "Israel & the Alliance"],
  ["jake_auchincloss", "Israel & the Alliance"],
  ["greg_landsman", "Israel & the Alliance"],
  ["mcconnell", "Israel & Alliances"],
  ["don_bacon", "Israel"],
  ["tom_suozzi", "Israel"],
  ["zohran_mamdani", "Israel & Gaza"],
];
const WANT = new Set(MOVES.map(([p, t]) => `${p}||${t}`));

const lines = fs.readFileSync(SRC, "utf8").split("\n");
const moved = [];
const already = [];
let pid = "?";

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const pm = L.match(/^\s{2,6}([a-z0-9_]+):\s*\[/);
  if (pm) pid = pm[1];

  const km = L.match(/issueKey\s*:\s*'([a-z0-9_]+)'/);
  if (!km) continue;
  // The topic string is the row's own label; `\\'` inside it is an escaped apostrophe.
  const tm = L.match(/topic\s*:\s*'((?:[^'\\]|\\.)*)'/);
  if (!tm) continue;
  const topic = tm[1].replace(/\\(.)/g, "$1");
  const id = `${pid}||${topic}`;
  if (!WANT.has(id)) continue;

  if (km[1] === NEW_KEY) { already.push(id); continue; }
  lines[i] = L.replace(/issueKey\s*:\s*'[a-z0-9_]+'/, `issueKey:'${NEW_KEY}'`);
  moved.push({ id, from: km[1], line: i + 1 });
}

const seen = new Set([...moved.map(m => m.id), ...already]);
const missing = [...WANT].filter(k => !seen.has(k));

console.log(`Israel stance re-file — ${MOVES.length} rows targeted`);
const byFrom = {};
for (const m of moved) byFrom[m.from] = (byFrom[m.from] || 0) + 1;
for (const [k, n] of Object.entries(byFrom).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${k} → ${NEW_KEY}`);
}
if (already.length) console.log(`  ${String(already.length).padStart(3)}  already on ${NEW_KEY} (no-op)`);
if (missing.length) {
  console.error(`\n! ${missing.length} targeted row(s) not found — refusing to write:`);
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}

if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }
fs.writeFileSync(SRC, lines.join("\n"), "utf8");
console.log(`\nWrote ${moved.length} change(s) to politician-stances.js`);
