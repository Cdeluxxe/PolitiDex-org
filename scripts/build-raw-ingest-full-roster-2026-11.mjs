#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-full-roster-2026-11.mjs
//
// Opens the raw-ingest / stance-score rotation (ROSTER in
// netlify/lib/raw-ingest-core.mjs) to EVERY politician on the PolitiDex roster.
// Writes db/raw-ingest-full-roster-2026-11.json: one row for each person on the
// site roster (db/share-index.json `people`, the canonical roster ids) who is
// not in the rotation yet — after the configured rows and the pool expansion.
//
//   · Every row here is TIER 3. Rows already in the rotation keep their tier
//     (1 or 2, or the existing tier 3) exactly as configured: this file never
//     re-tiers anybody, it only adds the people who were absent.
//   · has_board / has_stances follow the same data as every other roster row
//     (SEAT_HOLDERS; the curated stated positions) so the flags stay honest,
//     but they do NOT lift the tier: the rest of the roster is tier 3.
//   · A person already rotating under another id (a personAliases entry that
//     points at them, e.g. an old slug for a Utah legislator) is not added a
//     second time — except where the alias is known to name a different person
//     (NOT_SAME_PERSON below).
//   · Then the SITTING HOLDER of every legislative seat with a district board
//     (SEAT_HOLDERS *-statehouse-* / *-statesenate-*) who is not rotating yet,
//     as a tier-3 row carrying the seat, chamber, district, state and the
//     office / state text of their site record (cmp-data.js), so the URL
//     resolvers can match them. Candidates and former members are never added.
//   · No pages. No URL is guessed: a row joins with `sources: []` and becomes
//     plannable as soon as a page for that politician is configured (a curated
//     page, an extra source, the pool, a newsroom pattern). The planner skips a
//     row with nothing to pull, exactly as it already does.
//
// `--check` exits non-zero when the committed file is out of date.
//
//   node scripts/build-raw-ingest-full-roster-2026-11.mjs [--check]
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-full-roster-2026-11.json");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));

// The roster WITH the pool expansion, WITHOUT this file (so the build is stable).
process.env.PDX_RAW_INGEST_NO_FULL_ROSTER = "1";
const core = await import("../netlify/lib/raw-ingest-core.mjs");
const { SEAT_HOLDERS } = await import("../netlify/lib/seat-holders.mjs");

// Aliases in share-index that resolve a rotating id to a DIFFERENT person.
//   mike_rogers — the rotation row is Michigan's Mike Rogers (Congress.gov
//   R000572); the site alias resolves the slug to Alabama's Mike Rogers
//   (mike_rogers_al, R000575), who is not rotating yet.
const NOT_SAME_PERSON = { mike_rogers: "mike_rogers_al" };

const STANCE_SRC = ["politician-stances.js", "politician-stances-core.js", "politician-stances-ext.js"]
  .filter((f) => fs.existsSync(path.join(root, f))).map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
const boards = new Set(Object.values(SEAT_HOLDERS).map((h) => h?.pid).filter(Boolean));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasStances = (pid) => new RegExp(`^\\s*['"]?${esc(pid)}['"]?\\s*:\\s*\\[`, "m").test(STANCE_SRC);

const share = read("db/share-index.json");
const people = share.people || {};
const aliases = share.personAliases || {};

// Canonical ids already rotating: the row's own id, and the id its alias resolves to.
const covered = new Set();
for (const r of core.ROSTER) {
  covered.add(r.politician_id);
  const a = aliases[r.politician_id];
  if (a && NOT_SAME_PERSON[r.politician_id] !== a) covered.add(a);
}

const politicians = Object.keys(people).sort()
  .filter((pid) => !covered.has(pid))
  .map((pid) => ({ politician_id: pid, name: people[pid].n, tier: 3, has_board: boards.has(pid), has_stances: hasStances(pid) }));

// ── Sitting state legislators who hold a seat with a district board ──
// Every legislative board seat on the site (SEAT_HOLDERS *-statehouse-N /
// *-statesenate-N) whose sitting member is not rotating yet — under their own
// id or an alias — joins as one more TIER-3 row. Only the seat's sitting
// holder; no board is opened and no candidate added. Identity (name, office,
// state, district) is copied from the member's site record (cmp-data.js) so
// the URL resolvers can match them; no page is attached and no URL is built.
const cctx = { window: {} };
vm.createContext(cctx);
vm.runInContext(fs.readFileSync(path.join(root, "cmp-data.js"), "utf8"), cctx);
const CMP = cctx.window.CMP_DATA || {};
const listed = new Set(politicians.map((r) => r.politician_id));
const boardRows = [];
const boardSkipped = [];
for (const [seat, h] of Object.entries(SEAT_HOLDERS).sort(([a], [b]) => a.localeCompare(b))) {
  const m = /^([a-z]{2})-state(house|senate)-(.+)$/.exec(seat);
  if (!m || !h?.pid) continue;
  const pid = h.pid;
  if (covered.has(pid) || covered.has(aliases[pid]) || listed.has(pid)) continue;
  const rec = CMP[pid];
  if (!rec) { boardSkipped.push({ seat, politician_id: pid, why: "no site record" }); continue; }
  if (rec.candidate || /\b(?:candidate|former|nominee|elect)\b/i.test(rec.office || "")) { boardSkipped.push({ seat, politician_id: pid, why: `not a sitting member (${rec.office})` }); continue; }
  boardRows.push({ politician_id: pid, name: rec.name || h.name, tier: 3, has_board: true, has_stances: hasStances(pid),
    board_seat: seat, state: m[1].toUpperCase(), chamber: m[2], district: m[3], office: rec.office || "", state_listed: rec.state || "" });
  listed.add(pid);
}
politicians.push(...boardRows);

const doc = {
  _note: "Full-roster rows for the raw-ingest / stance-score rotation (applied by netlify/lib/raw-ingest-core.mjs after the pool expansion). Generated by scripts/build-raw-ingest-full-roster-2026-11.mjs from db/share-index.json: every politician on the PolitiDex roster who is not rotating yet, all TIER 3. Rows already in the rotation keep their tier. No pages are attached and no URL is guessed — a row becomes plannable once a page for that politician is configured. Rows with `board_seat` are the sitting holders of legislative seats with a district board (SEAT_HOLDERS) who were not rotating yet; their identity (office, state_listed, chamber, district) is copied from cmp-data.js so the URL resolvers can match them.",
  source: "db/share-index.json people",
  summary: {
    site_roster: Object.keys(people).length,
    already_rotating: Object.keys(people).length - (politicians.length - boardRows.length),
    added_tier3: politicians.length,
    added_board_holders: boardRows.length,
    board_holders_skipped: boardSkipped.length,
    with_board: politicians.filter((r) => r.has_board).length,
    with_stances: politicians.filter((r) => r.has_stances).length,
  },
  ...(boardSkipped.length ? { board_holders_skipped: boardSkipped } : {}),
  politicians,
};
// One row per line: small, and a roster change is a one-line diff.
const { politicians: rows, ...head } = doc;
const text = JSON.stringify(head, null, 1).replace(/\n}$/, `,\n "politicians": [\n${rows.map((r) => "  " + JSON.stringify(r)).join(",\n")}\n ]\n}`) + "\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (cur !== text) { console.error(`${path.relative(root, OUT)} is out of date — run node scripts/build-raw-ingest-full-roster-2026-11.mjs`); process.exit(1); }
  console.log(`${path.relative(root, OUT)} is current`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`full roster: ${JSON.stringify(doc.summary)} → ${path.relative(root, OUT)}`);
}
