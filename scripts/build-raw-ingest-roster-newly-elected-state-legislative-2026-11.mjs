#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// build-raw-ingest-roster-newly-elected-state-legislative-2026-11.mjs
//
// Builds the ingest roster for the November 3, 2026 newly elected state
// legislators who already have curated stated positions on the site
// (db/newly-elected-state-legislative-*.json → their entries in
// politician-stances.js). Writes
// db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json.
//
// URL rule: no new URLs. A page joins the roster only when it is already the
// source of at least one curated stance claim for that member. Every page is
// recorded with the curated issue key(s) and side(s) it backs, so the
// re-score can compare the phase8-v3 read against the curator's stance.
//
// Read-only on the stance data: nothing in politician-stances*.js or the
// db/newly-elected-* files is changed.
//
//   node scripts/build-raw-ingest-roster-newly-elected-state-legislative-2026-11.mjs
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "db/raw-ingest-roster-newly-elected-state-legislative-2026-11.json");

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "politician-stances.js"), "utf8"), ctx);
const STANCES = ctx.window.ISSUE_STANCE_DATA;

const files = fs.readdirSync(path.join(root, "db")).filter((f) => /^newly-elected-state-legislative.*\.json$/.test(f)).sort();
const members = new Map();
for (const f of files) {
  for (const m of JSON.parse(fs.readFileSync(path.join(root, "db", f), "utf8")).members || []) {
    const e = members.get(m.pid) || { pid: m.pid, name: m.name, seat: m.seat, office: m.office, from: [] };
    e.from.push(f);
    members.set(m.pid, e);
  }
}

const sourceTypeFor = (label = "", url = "") => {
  const l = `${label} ${url}`.toLowerCase();
  if (/home page/.test(l)) return "campaign home page";
  if (/platform|pillars/.test(l)) return "campaign platform page";
  if (/priorit|fighting for|matters most|day one/.test(l)) return "campaign priorities page";
  return "campaign issues page";
};
const slug = (url) => {
  const u = new URL(url);
  return (u.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home").slice(0, 60);
};

const roster = [];
let pages = 0;
for (const m of members.values()) {
  const curated = (STANCES[m.pid] || []).filter((s) => s.source?.url && s.issueKey);
  const byUrl = new Map();
  for (const s of curated) {
    const row = byUrl.get(s.source.url) || { url: s.source.url, label: s.source.label || "", keys: [] };
    row.keys.push({ key: s.issueKey, side: s.issueStance || s.pos, pos: s.pos, topic: s.topic });
    byUrl.set(s.source.url, row);
  }
  const multi = byUrl.size > 1;
  const sources = [...byUrl.values()].map((row) => {
    pages++;
    return {
      politician_id: m.pid,
      topic: row.keys[0].key,
      source_type: sourceTypeFor(row.label, row.url),
      ...(multi ? { source_id: slug(row.url) } : {}),
      url: row.url,
      curated_label: row.label,
      curated: row.keys,
    };
  });
  roster.push({ politician_id: m.pid, name: m.name, office: m.office, seat: m.seat, curated_in: m.from, sources });
}

const doc = {
  _note: "Ingest roster for the newly elected (November 3, 2026) state legislators who already have curated stated positions. Every URL is a page already cited as the source of a curated stance claim for that member; no URL was added from search or guessed. All are campaign pages: no official legislature issue page or press release is cited for this set. `topic` is the first curated issue key on the page (the raw-ingest record key); `curated` lists every curated key + side the page backs. Separate from the cron rotation ROSTER (raw-ingest-core.mjs) — pulled once by scripts/ingest-newly-elected-state-legislative-2026-11.mjs into the raw-ingest store, with no Locker hook.",
  built: new Date().toISOString().slice(0, 10),
  members: roster.length,
  pages,
  roster,
};
fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
console.log(`roster: ${roster.length} member(s), ${pages} page(s) → ${path.relative(root, OUT)}`);
