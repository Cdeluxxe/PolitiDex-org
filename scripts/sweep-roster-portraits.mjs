#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// sweep-roster-portraits.mjs — one portrait per person, on the roster row
// ─────────────────────────────────────────────────────────────────────────────
// THE TWO STORES THIS ENDS. A face lived in two places:
//   · the ROSTER FIELD — `photo` on the person's record. The bundled copy is
//     CMP_DATA[pid].photo (cmp-data.js); the live copy is PROFILES[pid].photo
//     (the Firestore roster, which firebase-boot.js publishes over it). This is
//     the field the person file reads (profiles-full.js's letterhead, p.photo).
//   · the CARD'S MAP — BROWSE_PHOTOS (browse-photos.js), which the homepage
//     record card reached through window._getPhotoUrl's last tier.
// The bundled roster field was empty on every row, so the card painted a face
// that the person file, reading the field, could not: /p/khanna printed 🏭.
//
// THE RULE, per pid on the roster (the card's portrait is what _getPhotoUrl
// answered for that pid from the bundled tables, alias hops included):
//   card has one, roster field empty  → COPY the card's URL onto the field.
//                                       Nothing is downloaded; the string moves.
//   both have one and they differ     → DO NOT PICK. Reported; the field stays.
//   roster has one, card has none     → nothing to move; the card reads it.
//   neither has one                   → nothing. The row's own mark stays.
// After the move, every BROWSE_PHOTOS key whose face now lives on a roster row
// is removed — the card stops carrying its own — but ONLY if every pid and every
// old key still resolves to exactly the URL it resolved to before. A key no
// roster row can reach (a candidate with no row) keeps the map as its only home.
//
// The live layer (Firestore) is not in this repository and is not swept here.
// Its `photo`, where it has one, already outranks the bundled field on every
// surface, which is the existing merge order and is unchanged.
//
// Run once; a second run finds nothing to move and writes nothing.
//   node scripts/sweep-roster-portraits.mjs           apply + write the report
//   node scripts/sweep-roster-portraits.mjs --check   exit 1 if it would change a byte
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
export const REPORT = "PORTRAIT_SWEEP.md";

// ── THE CLASSIFIER. Pure, so the suite can drive it with a fixture. ─────────
// roster: { pid: url|'' }   card: { pid: url|'' }
export function classify(roster, card) {
  const out = { copy: [], differ: [], rosterOnly: [], neither: [] };
  const pids = [...new Set([...Object.keys(roster), ...Object.keys(card)])].sort();
  for (const pid of pids) {
    const r = String(roster[pid] || "").trim();
    const c = String(card[pid] || "").trim();
    if (c && !r) out.copy.push({ pid, url: c });
    else if (c && r && c !== r) out.differ.push({ pid, roster: r, card: c });
    else if (r) out.rosterOnly.push(pid);
    else out.neither.push(pid);
  }
  return out;
}

// ── THE RESOLVER, LIFTED FROM ITS OWNER ─────────────────────────────────────
// ballot-breakdown.js's four functions, run over the bundled tables in a
// sandbox. Never re-implemented here: the card's portrait is whatever the
// card's own resolver answers.
function lift(src, name) {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`ballot-breakdown.js no longer declares ${name}()`);
  let d = 0, j = src.indexOf("{", i);
  for (; j < src.length; j++) {
    if (src[j] === "{") d++;
    else if (src[j] === "}") { d--; if (!d) break; }
  }
  return src.slice(i, j + 1);
}
export function resolverSource() {
  const bb = R("ballot-breakdown.js");
  return "(function () {\n" + ["_photoUnder", "_photoSlug", "_photoKeys", "_getPhotoUrl"].map((n) => lift(bb, n)).join("\n") +
    "\nwindow.__photo = _getPhotoUrl;\n})();";
}
function aliasSource() {
  const sh = R("stance-helpers.js");
  const a = sh.indexOf("var STANCE_ALIASES = {");
  const tail = "window.PDX_PID_ALIASES = PDX_PID_ALIASES;";
  const b = sh.indexOf(tail, a);
  if (a < 0 || b < 0) throw new Error("stance-helpers.js: the alias tables moved");
  return sh.slice(a, b + tail.length);
}
// A sandbox holding exactly the bundled tables the homepage card reads.
export function world(cmpSrc, bpSrc) {
  const w = { console };
  w.window = w;
  const ctx = vm.createContext(w);
  vm.runInContext(cmpSrc, ctx, { filename: "cmp-data.js" });
  vm.runInContext(bpSrc, ctx, { filename: "browse-photos.js" });
  vm.runInContext(R("profile-alias.js"), ctx, { filename: "profile-alias.js" });
  vm.runInContext(aliasSource(), ctx, { filename: "stance-helpers.js[aliases]" });
  vm.runInContext(resolverSource(), ctx, { filename: "ballot-breakdown.js[_getPhotoUrl]" });
  return w;
}

// ── THE FILES ───────────────────────────────────────────────────────────────
const ENTRY_RE = /^(\s+)([a-z0-9_]+):\s*'([^']*)',?(\s*\/\/.*)?$/;
export function parseBrowse(src) {
  const out = {};
  for (const line of src.split("\n")) {
    const m = ENTRY_RE.exec(line);
    if (m) out[m[2]] = { url: m[3], note: (m[4] || "").trim() };
  }
  return out;
}
// Add `"photo"` after the row's "name" line. Rows are ` "pid": {` at one space.
export function writeRosterPhotos(cmpSrc, copies) {
  const want = new Map(copies.map((c) => [c.pid, c.url]));
  const lines = cmpSrc.split("\n");
  const out = [];
  let row = null, placed = false;
  const done = new Set();
  for (const line of lines) {
    const open = /^ "([a-z0-9_]+)": \{$/.exec(line);
    if (open) { row = open[1]; placed = false; }
    out.push(line);
    if (row && !placed && want.has(row) && /^  "name": ".*",$/.test(line)) {
      if (!/^https:\/\/[^"'\s\\]+$/.test(want.get(row))) throw new Error(`${row}: not a plain https address`);
      out.push(`  "photo": ${JSON.stringify(want.get(row))},`);
      placed = true; done.add(row);
    }
    if (/^ \},?$/.test(line)) row = null;
  }
  for (const pid of want.keys()) if (!done.has(pid)) throw new Error(`cmp-data.js: no "name" line found for ${pid}`);
  return out.join("\n");
}
// The map, rebuilt: its header, then only the entries no roster row can hold,
// each on its own line with its own trailing note. The comment blocks that
// described moved entries go with them — their faces now live on roster rows,
// and the history is in version control and PORTRAIT_SWEEP.md.
export const BROWSE_HEAD = [
  "// ─────────────────────────────────────────────────────────────────────────────",
  "// BROWSE_PHOTOS — portraits for people WITH NO ROSTER ROW, and nobody else",
  "// ─────────────────────────────────────────────────────────────────────────────",
  "// A PERSON HAS ONE PORTRAIT, AND IT IS THE ROSTER FIELD: `photo` on their record",
  "// (CMP_DATA[pid].photo in cmp-data.js, overlaid by the live PROFILES[pid].photo).",
  "// The person file, district-board band 1 and the homepage record card all read",
  "// it — the first two through window.pdxPortrait (roster-portrait.js), the card",
  "// through window._getPhotoUrl, whose first two tiers are that same field.",
  "//",
  "// This map used to hold 715 faces the roster field did not, which is how the",
  "// card painted Ro Khanna while /p/khanna painted 🏭. scripts/",
  "// sweep-roster-portraits.mjs moved every face a roster row could hold onto that",
  "// row (PORTRAIT_SWEEP.md lists the counts and the disagreements). What is left",
  "// is the people the bundled roster has no row for — candidates and records that",
  "// live only in the Firestore roster — reached as _getPhotoUrl's last tier.",
  "// DO NOT ADD A FACE HERE FOR A PID THAT HAS A ROSTER ROW: put it on the row.",
  "// scripts/test-roster-portrait.mjs fails if one comes back.",
  "//",
  "// Values are single-quoted string literals, one entry per line, closed by an",
  "// indented `};` — scripts/audit-photo-coverage.mjs parses this shape.",
  "// ─────────────────────────────────────────────────────────────────────────────",
];
export function writeBrowse(bpSrc, drop) {
  const keep = bpSrc.split("\n").filter((line) => {
    const m = ENTRY_RE.exec(line);
    return m && !drop.has(m[2]);
  }).map((line) => line.replace(/^\s+/, "      "));
  return BROWSE_HEAD.concat([
    "  (function () {",
    "    var BROWSE_PHOTOS = {",
  ], keep, [
    "    };",
    "    // Published for window._getPhotoUrl's last tier, which lives in another",
    "    // <script> closure where this `var` is not in scope.",
    "    try { window.BROWSE_PHOTOS = BROWSE_PHOTOS; } catch (e) {}",
    "  })();",
    "",
  ]).join("\n");
}

// ── THE SWEEP ───────────────────────────────────────────────────────────────
export function plan() {
  const CMP = R("cmp-data.js");
  const BP = R("browse-photos.js");
  const before = world(CMP, BP);
  const D = before.CMP_DATA;
  const pids = Object.keys(D);
  // The roster field as it stands, and the card's portrait with the roster
  // tier taken out of the walk (so a filled field cannot answer for the card).
  const roster = {}, card = {};
  for (const pid of pids) roster[pid] = String(D[pid].photo || "").trim();
  const held = {};
  for (const pid of pids) { held[pid] = D[pid].photo; delete D[pid].photo; }
  for (const pid of pids) card[pid] = String(before.__photo(pid) || "").trim();
  for (const pid of pids) if (held[pid] !== undefined) D[pid].photo = held[pid];
  const verdict = classify(roster, card);

  // Every answer before the move, for every pid and every map key.
  const entries = parseBrowse(BP);
  const keys = Object.keys(entries);
  const askBefore = {};
  for (const k of [...pids, ...keys]) askBefore[k] = String(before.__photo(k) || "");

  const CMP2 = verdict.copy.length ? writeRosterPhotos(CMP, verdict.copy) : CMP;
  // Drop every map key whose URL now sits on a roster row a hop away; then put
  // back any key whose own answer, or any pid's, would move.
  const onRoster = new Set(pids.map((p) => (roster[p] || card[p])).filter(Boolean));
  let drop = new Set(keys.filter((k) => onRoster.has(entries[k].url)));
  let BP2, after, moved;
  for (let pass = 0; pass < 20; pass++) {
    BP2 = writeBrowse(BP, drop);
    after = world(CMP2, BP2);
    moved = Object.keys(askBefore).filter((k) => String(after.__photo(k) || "") !== askBefore[k]);
    const back = moved.filter((k) => drop.has(k));
    if (!back.length) break;
    for (const k of back) drop.delete(k);
  }
  if (moved.length) throw new Error(`the move would change ${moved.length} answer(s): ${moved.slice(0, 5).join(", ")}`);
  const kept = keys.filter((k) => !drop.has(k));
  return { CMP, BP, CMP2, BP2, verdict, entries, drop: [...drop].sort(), kept, pids };
}

export function reportText(p) {
  const v = p.verdict;
  const lines = [];
  lines.push("# Portrait sweep — one portrait per person, on the roster row");
  lines.push("");
  lines.push("Written by `scripts/sweep-roster-portraits.mjs`. The roster field is `photo` on the person's");
  lines.push("record: `CMP_DATA[pid].photo` in cmp-data.js (bundled), overlaid by the live Firestore");
  lines.push("`PROFILES[pid].photo` where that document carries one. The card's old store was the");
  lines.push("`BROWSE_PHOTOS` map in browse-photos.js, reached through `window._getPhotoUrl`.");
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push(`- Roster rows swept: ${p.pids.length}`);
  lines.push(`- Card had a portrait, roster field empty — copied onto the field: ${v.copy.length}`);
  lines.push(`- Both had one and they differ — not picked, field left as it was: ${v.differ.length}`);
  lines.push(`- Roster had one, card had none — card now reads the field: ${v.rosterOnly.length}`);
  lines.push(`- Neither had one — the row's own mark stays: ${v.neither.length}`);
  lines.push(`- Map keys removed (their face now lives on a roster row): ${p.drop.length}`);
  lines.push(`- Map keys kept (no roster row can reach them): ${p.kept.length}`);
  lines.push("");
  lines.push("## Disagreements");
  lines.push("");
  if (!v.differ.length) {
    lines.push("None in the bundled roster: no row carried a `photo` before this sweep, so no card");
    lines.push("portrait could disagree with one. The live Firestore layer is not in this repository and");
    lines.push("was not swept; where it carries a `photo`, that value already outranks the bundled field on");
    lines.push("every surface, as before. A disagreement found there belongs in this list.");
  } else {
    lines.push("| pid | roster field (kept) | card portrait (not applied) |");
    lines.push("| --- | --- | --- |");
    for (const d of v.differ) lines.push(`| ${d.pid} | ${d.roster} | ${d.card} |`);
  }
  lines.push("");
  lines.push("## Map keys kept, and why");
  lines.push("");
  lines.push("These keys have no roster row in cmp-data.js and no alias hop to one, so there is no roster");
  lines.push("field to move their face onto. They stay in browse-photos.js as the only copy.");
  lines.push("");
  for (const k of p.kept) lines.push(`- \`${k}\` — ${p.entries[k].url}`);
  lines.push("");
  return lines.join("\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// THE SECOND SWEEP — THE STORE THE FIRST ONE DID NOT OPEN
// ─────────────────────────────────────────────────────────────────────────────
// The search row (all-seeing-eye.js photoFor) asked window._getPhotoUrl, and
// _getPhotoUrl's key hop (_photoKeys) walks every alias of a pid through the
// LIVE roster too: the Firestore `politicians` collection, published as
// window.PROFILES. A face filed on an alias document — `politicians/klisonbee`
// carries Karianne Lisonbee's `photo`, and her roster row is `lisonbee_h14` —
// painted in search while pdxPortrait, which reads PROFILES[pid] and
// CMP_DATA[pid] and does not hop, painted 🏛 on /p/lisonbee_h14 and on her board.
// The first sweep built its world from the bundled tables only, so it never saw
// that document.
//
// THE SAME RULE, per roster pid:
//   the roster field  = pdxPortrait(pid), the owner, live tier first;
//   the search's face = _getPhotoUrl(pid) with that pid's OWN two tiers held
//                       out, so it is what the search row reached beyond the
//                       field (an alias document, a slug, the map).
//   field empty, search has one  → COPY the search URL onto CMP_DATA[pid].photo.
//   both, and they differ        → DO NOT PICK. Reported; the field stays.
//   neither                      → nothing; the row's own mark stays.
// Firestore is READ (name + photo field mask, the same public REST read
// firebase-boot.js makes on every page load) and never written. No image is
// downloaded: the URL string is all that moves.
//   node scripts/sweep-roster-portraits.mjs --live   read the live roster, apply, write the report
export const LIVE_FIELDS = ["name", "photo"];
export async function fetchLive() {
  const fb = R("firebase-boot.js");
  const project = (/projectId:\s*"([^"]+)"/.exec(fb) || [])[1];
  const key = (/apiKey:[^"\n]*"([^"]+)"/.exec(fb) || [])[1];
  if (!project || !key) throw new Error("firebase-boot.js: the roster's project config moved");
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/politicians`;
  const live = {};
  let token = null;
  do {
    const q = ["pageSize=300", "key=" + encodeURIComponent(key)]
      .concat(LIVE_FIELDS.map((f) => "mask.fieldPaths=" + f));
    if (token) q.push("pageToken=" + encodeURIComponent(token));
    const r = await fetch(base + "?" + q.join("&"));
    if (!r.ok) throw new Error(`the live roster answered HTTP ${r.status}`);
    const d = await r.json();
    for (const doc of d.documents || []) {
      const f = doc.fields || {};
      const o = {};
      for (const k of LIVE_FIELDS) if (f[k] && typeof f[k].stringValue === "string") o[k] = f[k].stringValue;
      live[doc.name.split("/").pop()] = o;
    }
    token = d.nextPageToken;
  } while (token);
  return live;
}
// firebase-boot.js applies PDX_PHOTO_FIX to every document before it lands in
// PROFILES; the sweep sees PROFILES as the page does.
function photoFixSource() {
  const m = /var PDX_PHOTO_FIX = \{[\s\S]*?\};/.exec(R("firebase-boot.js"));
  if (!m) throw new Error("firebase-boot.js no longer declares PDX_PHOTO_FIX");
  return m[0] + "\nwindow.PDX_PHOTO_FIX = PDX_PHOTO_FIX;";
}
// live: { docId: { name, photo } } — a fetchLive() answer, or a fixture.
export function planLive(live, cmpSrc = R("cmp-data.js"), bpSrc = R("browse-photos.js")) {
  const w = world(cmpSrc, bpSrc);
  vm.runInContext(photoFixSource(), vm.createContext(w), { filename: "firebase-boot.js[PDX_PHOTO_FIX]" });
  const fix = w.PDX_PHOTO_FIX || {};
  w.PROFILES = {};
  for (const id of Object.keys(live)) {
    const o = Object.assign({}, live[id]);
    if (fix[id]) o.photo = fix[id];
    w.PROFILES[id] = o;
  }
  vm.runInContext(R("roster-portrait.js"), vm.createContext(w), { filename: "roster-portrait.js" });
  const D = w.CMP_DATA;
  const pids = Object.keys(D);
  const roster = {}, search = {};
  for (const pid of pids) {
    roster[pid] = String(w.pdxPortrait(pid) || "").trim();
    const pr = w.PROFILES[pid];
    const lp = pr ? pr.photo : undefined, cp = D[pid].photo;
    if (pr) delete pr.photo;
    delete D[pid].photo;
    search[pid] = String(w.__photo(pid) || "").trim();
    if (lp !== undefined) pr.photo = lp;
    if (cp !== undefined) D[pid].photo = cp;
  }
  const verdict = classify(roster, search);
  // Which tier the field answered from, for the disagreement report.
  for (const d of verdict.differ) {
    const lp = String((w.PROFILES[d.pid] && w.PROFILES[d.pid].photo) || "").trim();
    d.tier = lp && lp === d.roster ? `live politicians/${d.pid}` : "cmp-data.js";
  }
  const CMP2 = verdict.copy.length ? writeRosterPhotos(cmpSrc, verdict.copy) : cmpSrc;
  return { verdict, roster, search, pids, docs: Object.keys(live).length, CMP: cmpSrc, CMP2 };
}

export const LIVE_OPEN = "<!-- live-sweep -->";
export const LIVE_CLOSE = "<!-- /live-sweep -->";
export function liveReportText(l, when) {
  const v = l.verdict;
  const lines = [LIVE_OPEN, "## Second sweep — the live roster the first sweep did not open", ""];
  lines.push("The search dropdown's face came from `window._getPhotoUrl`, whose key hop (`_photoKeys`) walks");
  lines.push("every alias of a pid through the live Firestore roster — the `politicians` collection,");
  lines.push("published as `window.PROFILES`. A `photo` filed on an alias document reached search and no");
  lines.push("other surface: `politicians/klisonbee` carries Karianne Lisonbee's portrait while her roster");
  lines.push("row is `lisonbee_h14`, so search painted her face and `/p/lisonbee_h14` and `/district/ut-hd-14`,");
  lines.push("which read `pdxPortrait` (no hop), painted 🏛.");
  lines.push("");
  lines.push(`Read ${when}: ${l.docs} live documents (\`name\` and \`photo\` only, read-only; no image downloaded).`);
  lines.push("");
  lines.push("### Counts");
  lines.push("");
  lines.push(`- Roster rows swept: ${l.pids.length}`);
  lines.push(`- Search had a portrait, roster field empty — copied onto the field: ${v.copy.length}`);
  lines.push(`- Both had one and they differ — not picked, field left as it was: ${v.differ.length}`);
  lines.push(`- Roster field had one, search reached nothing else: ${v.rosterOnly.length}`);
  lines.push(`- Neither had one — the row's own mark stays: ${v.neither.length}`);
  lines.push("");
  lines.push("### Copied onto `CMP_DATA[pid].photo`");
  lines.push("");
  if (!v.copy.length) lines.push("None.");
  for (const c of v.copy) lines.push(`- \`${c.pid}\` — ${c.url}`);
  lines.push("");
  lines.push("### Disagreements");
  lines.push("");
  if (!v.differ.length) lines.push("None.");
  else {
    lines.push("| pid | roster field (kept) | where the field answered from | search portrait (not applied) |");
    lines.push("| --- | --- | --- | --- |");
    for (const d of v.differ) lines.push(`| ${d.pid} | ${d.roster} | ${d.tier || ""} | ${d.card} |`);
  }
  lines.push("");
  lines.push("After the copy, the search row reads the roster field through `pdxPortrait` for every pid");
  lines.push("with a roster row, the same reader the person file and the district board use, and keeps");
  lines.push("`_getPhotoUrl` only for ids with no roster row (candidates the map still holds).");
  lines.push(LIVE_CLOSE);
  return lines.join("\n");
}
export function withLiveReport(rep, section) {
  const a = rep.indexOf(LIVE_OPEN), b = rep.indexOf(LIVE_CLOSE);
  if (a >= 0 && b > a) return rep.slice(0, a) + section + rep.slice(b + LIVE_CLOSE.length);
  return rep.replace(/\s*$/, "\n\n") + section + "\n";
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv.includes("--live")) {
  const l = planLive(await fetchLive());
  if (l.CMP2 === l.CMP) {
    console.log(`sweep-roster-portraits --live: nothing to move (${l.verdict.differ.length} disagreement(s) still listed); report left as written`);
    process.exit(0);
  }
  writeFileSync(join(ROOT, "cmp-data.js"), l.CMP2);
  const when = new Date().toISOString().slice(0, 10);
  writeFileSync(join(ROOT, REPORT), withLiveReport(R(REPORT), liveReportText(l, when)));
  console.log(`sweep-roster-portraits --live: ${l.verdict.copy.length} copied, ${l.verdict.differ.length} disagree, ` +
    `${l.verdict.neither.length} with none, over ${l.docs} live documents`);
  process.exit(0);
}
if (isMain) {
  const check = process.argv.includes("--check");
  const p = plan();
  const changes = p.CMP2 !== p.CMP || p.BP2 !== p.BP;
  if (check) {
    if (changes) { console.error("sweep-roster-portraits: the sweep would still move portraits"); process.exit(1); }
    console.log("sweep-roster-portraits: nothing to move");
    process.exit(0);
  }
  if (!changes) { console.log("sweep-roster-portraits: nothing to move; report left as written"); process.exit(0); }
  writeFileSync(join(ROOT, "cmp-data.js"), p.CMP2);
  writeFileSync(join(ROOT, "browse-photos.js"), p.BP2);
  writeFileSync(join(ROOT, REPORT), reportText(p));
  console.log(`sweep-roster-portraits: ${p.verdict.copy.length} copied, ${p.verdict.differ.length} disagree, ` +
    `${p.verdict.neither.length} with none; ${p.drop.length} map keys removed, ${p.kept.length} kept`);
}
