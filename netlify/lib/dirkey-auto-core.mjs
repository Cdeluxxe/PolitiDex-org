// ═══════════════════════════════════════════════════════════════════════════
// dirkey-auto-core.mjs — the automatic candidate generator for the person-page
// "bills and stances on directional issues" section
// ────────────────────────────────────────────────────────────────────────────
// WHAT IT DOES. For people who are NOT in the ground-truth set, it reads the
// first-party pages the site already links on their stance cards (campaign
// pages, official .gov pages, press releases, speeches — the scorer's own
// primarySourceKind rule), and for each page that speaks to an approved
// directional key it records:
//   · the quote (the scorer's first clear / implied statement, else its first
//     topic mention),
//   · the bill matches the shared bill finder already produces on that page,
//   · the scorer's four-value read (support / oppose / mixed / no clear
//     position) and its confidence.
// Each person's rows are tagged internally — `tag: { source: "auto" }` on the
// person and on every row — so a later batch pass can find them. The tag is
// never rendered.
//
// SOFT CAP. At most AUTO_SOFT_CAP (40) new people are added per run. Everyone
// else stays queued: a person is only marked done once their pages were read,
// and a person whose linked pages change is queued again.
//
// APPROVED KEYS ONLY. The generator reads the keys that have a bill pattern
// (bill-key-patterns.mjs MAPPED_KEYS) and nothing else. Bills the finder sees
// that match no key are clustered into PROPOSED keys (proposeKeys); a
// proposal is ignored here until someone approves it AND gives it a pattern
// in bill-key-patterns.mjs, at which point it is a mapped key like any other.
//
// Hand-checked people are never touched: the caller passes every
// ground-truth person in `exclude`, and the page module lets the hand-checked
// table win for any person in both.
//
// Pure and dependency-injected (fetchPage, now) so the suite can run it
// offline. scripts/gen-dirkey-auto.mjs is the repeatable pass that runs it
// against the live pages and writes the files.
// ═══════════════════════════════════════════════════════════════════════════
import { createHash } from "node:crypto";
import * as F from "./bill-finder-core.mjs";
import * as K from "./bill-key-patterns.mjs";
import * as S from "./stance-score-core.mjs";
import { DIRECTIONAL_ISSUE_KEYS } from "./stance-topic-vocab.mjs";

export const AUTO_VERSION = "dirkey-auto-v1";
export const AUTO_SOFT_CAP = 40;
// How many queued people one run may read before stopping, so a run with
// few hits still ends in bounded time. The rest stay queued.
export const AUTO_MAX_ATTEMPTS = 160;
export const AUTO_TAG = Object.freeze({ source: "auto" });
const RANK = { high: 3, medium: 2, low: 1 };

/** The keys the generator may use: those with a bill pattern. Proposals never enter. */
export function generatorKeys() {
  return [...K.MAPPED_KEYS];
}

/** Which approved keys a stance card's issue key reads on: itself, or its pattern-key children. */
export function keysForIssue(issueKey, keys = generatorKeys()) {
  if (!issueKey) return [];
  if (keys.includes(issueKey)) return [issueKey];
  return keys.filter((k) => DIRECTIONAL_ISSUE_KEYS[k]?.parent === issueKey);
}

/** First-party: the candidate's own campaign / official page, release, speech or statement (scorer R8 rule). */
export function isFirstParty(label, url) {
  if (!/^https:\/\//i.test(String(url || ""))) return false;
  return S.primarySourceKind(label, url) !== null;
}

const fingerprint = (sources) => createHash("sha256").update(sources.map((s) => `${s.url}|${s.keys.join(",")}`).sort().join("\n")).digest("hex").slice(0, 16);

/**
 * The queue: people with at least one first-party linked page on an approved
 * key, minus `exclude` (ground-truth people) and minus people already done
 * with the same pages. Sorted by person id so runs are repeatable.
 *   stanceData: { pid: [card…] } (window.ISSUE_STANCE_DATA)
 *   state.processed: { pid: { fingerprint, … } }
 */
export function buildQueue(stanceData, { exclude = new Set(), state = {}, keys = generatorKeys() } = {}) {
  const processed = state?.processed || {};
  const out = [];
  for (const pid of Object.keys(stanceData || {}).sort()) {
    if (exclude.has(pid) || !/^[a-z0-9_]{1,80}$/.test(pid)) continue;
    const cards = Array.isArray(stanceData[pid]) ? stanceData[pid] : [];
    const byUrl = new Map();
    for (const c of cards) {
      const hit = keysForIssue(c?.issueKey, keys);
      const url = c?.source?.url;
      if (!hit.length || !isFirstParty(c?.source?.label, url)) continue;
      const s = byUrl.get(url) || { url, label: String(c.source.label || "").trim() || "official page", keys: [] };
      for (const k of hit) if (!s.keys.includes(k)) s.keys.push(k);
      byUrl.set(url, s);
    }
    if (!byUrl.size) continue;
    const sources = [...byUrl.values()];
    const fp = fingerprint(sources);
    if (processed[pid]?.fingerprint === fp) continue;
    out.push({ politician_id: pid, sources, fingerprint: fp });
  }
  return out;
}

const clip = (s, n = 240) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t; };
const pageUrl = (c) => `/b/${encodeURIComponent(c.congress)}/${encodeURIComponent(c.bill)}`;

function mappingRow(m, src, catalog) {
  const cat = m.id ? catalog?.byId?.get(m.id) : null;
  const slug = F.urlSlugText(src.link);
  const quoted = String(m.span).split(" … ").filter((x) => x && x !== slug).join(" … ") || m.span;
  return {
    key: m.key,
    ...(m.bill ? { bill: m.bill, congress: Number(String(m.id).split("|")[0]) || null } : {}),
    ...(cat ? { title: cat.title, page: pageUrl(cat) } : {}),
    ...(!m.bill && !m.resolves_to ? { name: m.matched } : {}),
    ...(!m.bill && m.resolves_to ? {
      one_of: m.resolves_to.map((x) => { const c = catalog?.byId?.get(x.id); return c ? { bill: c.bill, congress: c.congress, page: pageUrl(c) } : { bill: x.id.split("|")[1], congress: Number(x.id.split("|")[0]) }; }),
      ...(m.best_fit ? { best_fit: catalog?.byId?.get(m.best_fit)?.bill || m.best_fit } : {}) } : {}),
    confidence: m.confidence,
    basis: m.basis,
    justification: clip(quoted),
    source: src,
    tag: { ...AUTO_TAG },
  };
}

/**
 * Read one queued person's pages. → { politician_id, ok, rows: { mappings, stances }, unmapped, fetched, failed }
 * `ok` is false only when no page could be read at all (the person stays queued).
 */
export async function processPerson(person, { fetchPage, catalog = null, now = () => new Date(), keys = generatorKeys() }) {
  const pid = person.politician_id;
  const fetchedAt = now().toISOString();
  const mappings = new Map();
  const stances = new Map();
  const unmapped = [];
  let fetched = 0, failed = 0;
  for (const s of person.sources) {
    let body;
    try {
      const got = await fetchPage(s.url);
      if (!got || !got.ok || !String(got.body || "").trim()) throw new Error(got?.error || "empty");
      body = String(got.body);
      fetched++;
    } catch { failed++; continue; }
    const src = { type: s.label, link: s.url };
    const pageKeys = s.keys.filter((k) => keys.includes(k));
    if (!pageKeys.length) continue;
    // 1. The bill finder on the page: its matches on the keys the site ties to this page.
    //    (Run on every approved key once, so `unmapped` is the bills that match none.)
    let mapped = { mappings: [], unmapped: [] };
    try {
      const found = F.findBills({ body, url: s.url, date: fetchedAt.slice(0, 10), politician_id: pid, source_type: s.label }, { catalog });
      const all = K.mapFound(found, { keys });
      mapped = { mappings: all.mappings.filter((m) => pageKeys.includes(m.key)), unmapped: all.unmapped };
    } catch { /* no matches from this page */ }
    const matchedKeys = new Set(mapped.mappings.map((m) => m.key));
    // 2. The scorer, on the same keys. A key is hit when the page states a
    //    position on it (a clear or implied statement) or the finder matched a
    //    bill to it; a bare topic mention (a menu item, a page title) is not.
    const sentences = S.extractSentences(body);
    const hitKeys = new Set();
    for (const key of pageKeys) {
      const raw = { url: s.url, fetched_at: fetchedAt, source_type: s.label, politician_id: pid, topic: key, body };
      let c;
      try { c = S.scoreRawRecord(raw, key, sentences); } catch { continue; }
      const st = c.sources?.[0]?.statements || [];
      const signal = st.find((x) => x.kind === "clear" || x.kind === "implication");
      if (!signal && !matchedKeys.has(key)) continue;
      hitKeys.add(key);
      const lead = signal || st[0];
      const row = {
        key, position: c.position, confidence: c.confidence, reason: c.confidence_reason,
        record: "first-party page linked on the site, read automatically",
        ...(lead?.text ? { quote: clip(lead.text, 200) } : {}),
        sources: [src],
        tag: { ...AUTO_TAG },
      };
      const prev = stances.get(key);
      // One read per key: the page with a clear read, then the more confident, wins; the other pages are listed.
      if (!prev) stances.set(key, row);
      else if (row.position !== "no clear position" && (prev.position === "no clear position" || row.confidence > prev.confidence)) stances.set(key, { ...row, sources: [src, ...prev.sources] });
      else prev.sources.push(src);
    }
    for (const m of mapped.mappings) {
      if (!hitKeys.has(m.key)) continue;
      const ident = m.id || (m.resolves_to ? `phrase:${m.resolves_to.map((x) => x.id).join(",")}` : `name:${String(m.matched).toLowerCase()}`);
      const k = `${ident}|${m.key}`;
      const row = mappingRow(m, src, catalog);
      const prev = mappings.get(k);
      if (!prev) mappings.set(k, row);
      else if (RANK[row.confidence] > RANK[prev.confidence]) mappings.set(k, { ...row, also_found_in: [prev.source, ...(prev.also_found_in || [])] });
      else (prev.also_found_in ||= []).push(src);
    }
    // 3. Bills on the page that match no approved key at all: material for proposed keys.
    for (const u of mapped.unmapped) {
      const cat = u.id ? catalog?.byId?.get(u.id) : null;
      if (!cat) continue; // a proposal needs an official title to name its subject
      unmapped.push({ id: u.id, bill: cat.bill, congress: cat.congress, title: cat.title, issue_keys: cat.issue_keys || [], span: clip(u.span, 300), politician_id: pid, link: s.url });
    }
  }
  const order = (k) => keys.indexOf(k);
  return {
    politician_id: pid,
    ok: fetched > 0,
    fetched, failed,
    rows: {
      mappings: [...mappings.values()].sort((a, b) => order(a.key) - order(b.key) || RANK[b.confidence] - RANK[a.confidence]),
      stances: [...stances.values()].sort((a, b) => order(a.key) - order(b.key)),
    },
    unmapped,
  };
}

/**
 * One run. Reads queued people in order until AUTO_SOFT_CAP people have been
 * added (or AUTO_MAX_ATTEMPTS were read). Returns the new people, the updated
 * state, the unmapped bills seen, and the run summary.
 */
export async function runGenerator({ queue, fetchPage, catalog = null, state = {}, now = () => new Date(), cap = AUTO_SOFT_CAP, maxAttempts = AUTO_MAX_ATTEMPTS, keys = generatorKeys(), log = () => {} }) {
  const at = now().toISOString();
  const run = `${AUTO_VERSION}@${at}`;
  const processed = { ...(state?.processed || {}) };
  const people = {};
  const unmapped = [];
  let attempted = 0, unreadable = 0;
  for (const person of queue) {
    if (Object.keys(people).length >= cap || attempted >= maxAttempts) break;
    attempted++;
    const r = await processPerson(person, { fetchPage, catalog, now, keys });
    unmapped.push(...r.unmapped);
    if (!r.ok) { unreadable++; log(`dirkey-auto: ${person.politician_id} — no page could be read; stays queued`); continue; }
    const has = r.rows.mappings.length || r.rows.stances.length;
    processed[person.politician_id] = { fingerprint: person.fingerprint, at, run, result: has ? "added" : "no_hit" };
    if (!has) { log(`dirkey-auto: ${person.politician_id} — pages read, no approved key spoken to`); continue; }
    people[person.politician_id] = { tag: { ...AUTO_TAG, run }, ...r.rows };
    log(`dirkey-auto: ${person.politician_id} — ${r.rows.mappings.length} bill match(es), ${r.rows.stances.length} read(s)`);
  }
  const added = Object.keys(people);
  const remaining = queue.filter((p) => !(processed[p.politician_id]?.fingerprint === p.fingerprint)).length;
  return {
    run, people, unmapped,
    state: { ...(state || {}), processed },
    summary: { run, at, soft_cap: cap, attempted, added: added.length, added_people: added, unreadable, remaining_in_queue: remaining },
  };
}

/** Merge a run's new people into the auto table; people already in it are not rewritten. */
export function mergeAutoTable(table, runResult, { keysMeta = {} } = {}) {
  const prev = table?.people || {};
  const people = { ...prev };
  for (const [pid, p] of Object.entries(runResult.people)) if (!people[pid]) people[pid] = p;
  return {
    _comment: "GENERATED by scripts/gen-dirkey-auto.mjs — do not edit by hand. Bill matches and stance-scorer reads for people outside the ground-truth set, read automatically from first-party pages the site links. Every person and row carries an internal tag { source: \"auto\" } for a later batch pass; the tag is not shown on the page. Shown on person pages by person-directional-keys.js, below any hand-checked row (a person in person-directional-keys.json is never read from here).",
    auto_version: AUTO_VERSION,
    finder_version: F.FINDER_VERSION,
    patterns_version: K.PATTERNS_VERSION,
    rules_version: S.RULES_VERSION,
    keys: keysMeta,
    people: Object.fromEntries(Object.entries(people).sort(([a], [b]) => a.localeCompare(b))),
  };
}

// ── Proposed keys ───────────────────────────────────────────────────────────
const STOP = new Set("a an and the of to for in on at by with from or as act acts bill resolution joint concurrent amendment amendments other purposes united states con res hr state states federal national provide providing require requiring certain relating respect law program programs year years fiscal ending september appropriations making it its that this be is are not into under".split(" "));
export const MEASURE_WORDS = ["fund", "funding", "ban", "prohibit", "repeal", "expand", "extend", "cut", "reduce", "increase", "protect", "require", "authorize", "restrict", "limit", "tax", "credit", "grant", "reform", "modernize", "establish", "eliminate", "lower", "cap"];
const words = (t) => String(t || "").replace(/^[A-Z][A-Za-z.\s]*\d+\s+—\s+/, "").toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const top = (counts, n) => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([w]) => w);

/**
 * Cluster bills that matched no approved key into proposals. A cluster is two
 * or more distinct catalog bills filed under the same catalog issue key that
 * has no bill pattern. Merges into an existing proposals doc, never changing
 * a proposal's `approved` flag. Proposals carry no pattern and are never read
 * by the generator.
 */
export const PROPOSAL_MAX_ISSUE_KEYS = 3;
export function proposeKeys(unmapped, doc = {}, { run = null, mapped = K.MAPPED_KEYS } = {}) {
  const groups = new Map();
  for (const u of unmapped) {
    // An omnibus (a reconciliation bill, an appropriations package) is filed
    // under many issues and says nothing about any one subject: left out.
    if ((u.issue_keys || []).length > PROPOSAL_MAX_ISSUE_KEYS) continue;
    for (const ik of u.issue_keys || []) {
      if (mapped.includes(ik)) continue; // a pattern miss on a key we have, not a new key
      const g = groups.get(ik) || { bills: new Map(), people: new Set() };
      if (!g.bills.has(u.id)) g.bills.set(u.id, u);
      g.people.add(u.politician_id);
      groups.set(ik, g);
    }
  }
  const proposals = { ...(doc?.proposals || {}) };
  for (const [ik, g] of groups) {
    const prev = proposals[`proposed_${ik}`];
    const bills = new Map((prev?.example_bills || []).map((b) => [b.id, b]));
    for (const u of g.bills.values()) if (!bills.has(u.id)) bills.set(u.id, { id: u.id, bill: u.bill, congress: u.congress, title: u.title, seen_in: { politician_id: u.politician_id, link: u.link } });
    if (bills.size < 2) continue;
    const subj = {}, meas = {};
    for (const b of bills.values()) for (const w of words(b.title)) subj[w] = (subj[w] || 0) + 1;
    for (const u of g.bills.values()) for (const w of words(`${u.title} ${u.span}`)) if (MEASURE_WORDS.includes(w)) meas[w] = (meas[w] || 0) + 1;
    for (const w of prev?.suggested_measure_words || []) meas[w] = (meas[w] || 0) + 1;
    proposals[`proposed_${ik}`] = {
      based_on_issue_key: ik,
      approved: prev?.approved === true,
      suggested_subject_words: top(subj, 8),
      suggested_measure_words: top(meas, 8),
      example_bills: [...bills.values()].slice(0, 8),
      bills_seen: bills.size,
      people: [...new Set([...(prev?.people || []), ...g.people])].sort(),
      first_seen: prev?.first_seen || run,
      last_seen: run,
    };
  }
  return {
    _comment: "WRITTEN by scripts/gen-dirkey-auto.mjs. Proposed directional keys: clusters of bills the bill finder found on first-party pages that match no key with a bill pattern. A proposal is ignored by the generator. To adopt one, set approved: true and add its pattern to netlify/lib/bill-key-patterns.mjs — only keys with a pattern are read. Re-runs never change the approved flag.",
    proposals: Object.fromEntries(Object.entries(proposals).sort(([a], [b]) => a.localeCompare(b))),
  };
}
