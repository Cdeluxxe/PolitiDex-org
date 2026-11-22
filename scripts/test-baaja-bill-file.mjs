#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-baaja-bill-file.mjs — S. 5653 (BAAJA) has a bill file, generated from its ledger
// ─────────────────────────────────────────────────────────────────────────────
// S. 5653, the Bipartisan American Affordability and Jobs Act of 2026, had a
// full ground-truth ledger (db/bill-standard/119-s-5653.json) and no bill file,
// so the site search found nothing for "baaja", "BAAJA" or "S. 5653". The bill
// file is now generated from that ledger by scripts/gen-bill-docs.mjs.
//
// What must stay true:
//
//   1. THE FILE EXISTS. db/bill-docs.json holds "119|S. 5653", built from the
//      ledger, and the sitemap lists /b/119/S.%205653.
//   2. IT IS REACHABLE. /b/119/S.%205653 and the sitting-less /b/S.%205653 are
//      served the bill template and the edge writes the bill into the body:
//      number, title, short names, status, sponsors and history.
//   3. EVERY MAPPING ROW IS ON THE PAGE. All 18 ledger rows, in ledger order,
//      each with its key, its direction, its sections, its quote and its
//      rationale — with the ledger's completeness note and equality statement.
//   4. NO WEIGHT, PRIMARY LABEL OR RANKING LANGUAGE. Outside the equality
//      statement itself (which says rows carry none), the page carries no such
//      word, and the doc carries no such field.
//   5. SEARCH FINDS IT. "baaja", "BAAJA", "S. 5653" and "American Affordability"
//      each return the page in the eye.
//   6. NOTHING ELSE MOVED. The ledger still validates as it stands, the bill
//      now sits on its sponsors' person files (the record holds it), and every
//      other bill document is the one the migrations alone produce.
//   7. THE RECORD ROW IS THE LEDGER. 20261214000000_vr_seed_baaja_s5653.sql is
//      exactly what scripts/gen-baaja-migration.mjs writes from the ledger: the
//      18 mapping rows verbatim (key, direction, rationale, source), the six
//      vehicle roll calls with all 600 senator votes, and the mapping index
//      widened to one row per direction so the three split keys fit.
//   8. THE PANEL LOADS. The bill page offers the panel control, and opening
//      S. 5653 resolves its measure id and renders the live detail — all 18
//      rows and all six roll calls — instead of "Could not load this bill".
//
//   node scripts/test-baaja-bill-file.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";
import { billDocs } from "./gen-bill-docs.mjs";
import { validateLedger, RANKING_FIELDS } from "./bill-standard-core.mjs";
import { renderMigration } from "./gen-baaja-migration.mjs";
import { measureAddresses } from "./vr-measure-addresses.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ baaja bill file: STALE HARNESS — ${m}`); process.exit(2); };

const ORIGIN = "https://politidex.fyi";
const NUM = "S. 5653";
const KEY = `119|${NUM}`;
const PAGE = `/b/119/${encodeURIComponent(NUM)}`;
const LEDGER = JSON.parse(R("db/bill-standard/119-s-5653.json"));
const DOCS = JSON.parse(R("db/bill-docs.json")).docs;
const DOC = DOCS[KEY];
must(LEDGER && Array.isArray(LEDGER.issues), "the S. 5653 ledger is readable");

// The page's text escape (share-preview.ts text()): &, < and > only.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the bill file exists, from the ledger");
// ═════════════════════════════════════════════════════════════════════════════
ok(!!DOC, "db/bill-docs.json holds 119|S. 5653");
must(DOC, "no S. 5653 document to test");
eq(DOC.t, "Bipartisan American Affordability and Jobs Act of 2026", "the title is the ledger's short title");
eq(DOC.c, "senate", "the chamber is the Senate");
eq(DOC.st, "pending", "status: in committee is pending");
has(DOC.sl, "in committee", "the status label says it is in committee");
eq(JSON.stringify(DOC.sp), JSON.stringify({ s: ["capito"], c: ["lee", "whitehouse", "heinrich"] }), "the sponsor and three co-sponsors");
eq(DOC.rs, LEDGER.identity.congressGovUrl, "the record page is the ledger's Congress.gov page");
eq(DOC.h.length, LEDGER.status.timeline.length, "every timeline row is in the history");
eq(DOC.ld.f, "db/bill-standard/119-s-5653.json", "the doc names the ledger it came from");
has(R("sitemap.xml"), `<loc>${ORIGIN}/b/119/S.%205653</loc>`, "the sitemap lists /b/119/S.%205653");
eq(validateLedger(LEDGER, {
  issueKeys: new Set(JSON.parse(R("db/issue-keys.json")).keys),
  people: new Set(Object.keys(JSON.parse(R("db/share-index.json")).people)),
  strict: true,
}).errors.length, 0, "the ledger still passes the strict (publish) check");
ok(Object.keys(billDocs(ROOT)).length === Object.keys(DOCS).length, "db/bill-docs.json is current");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · the page is reachable and written into the body");
// ═════════════════════════════════════════════════════════════════════════════
const BILL_HTML = R("bill.html");
const TOML = R("netlify.toml");
const bRules = [...TOML.matchAll(/\[\[redirects\]\]\s*\n\s*from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"\s*\n\s*status\s*=\s*(\d+)/g)]
  .filter((m) => m[1].startsWith("/b/"));
eq(bRules.length, 1, "still exactly one /b/ rule");
ok(bRules[0] && bRules[0][1] === "/b/*" && bRules[0][2] === "/bill.html" && bRules[0][3] === "200", "/b/* serves /bill.html at 200");

const outDir = mkdtempSync(join(tmpdir(), "baaja-"));
execFileSync(join(ROOT, "node_modules/.bin/esbuild"),
  [join(ROOT, "netlify/edge-functions/share-preview.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${join(outDir, "sp.mjs")}`, "--log-level=error"],
  { stdio: ["ignore", "ignore", "inherit"] });
const EDGE = (await import(join(outDir, "sp.mjs"))).default;
globalThis.fetch = async () => { throw new Error("offline"); };
async function serve(path) {
  const ctx = { next: async () => new Response(BILL_HTML, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }) };
  const res = await EDGE(new Request(ORIGIN + path), ctx);
  return res ? { status: res.status, html: await res.text() } : { status: 200, html: BILL_HTML };
}
const seamOf = (html) => (html.match(/<!--pdx:bill-doc-->[\s\S]*?<!--\/pdx:bill-doc-->/) || [""])[0];

const page = await serve(PAGE);
eq(page.status, 200, `${PAGE} answers 200`);
const body = seamOf(page.html);
has(body, `<h1 class="pdx-bill-num">${NUM}</h1>`, "the body names S. 5653 in its <h1>");
has(body, "Bipartisan American Affordability and Jobs Act of 2026", "the body carries the title");
has(body, "BAAJA", "the body carries the short name BAAJA");
has(body, "American Affordability", "the body carries the short name American Affordability");
has(body, "Pending — in committee", "the body carries the status");
for (const pid of ["capito", "lee", "whitehouse", "heinrich"]) has(body, `data-pdx-bill-sponsor="${pid}"`, `the body links sponsor ${pid}`);
has(body, "History · from the official record", "the body carries the history block");
has(body, 'data-pdx-bill-held="doc"', "the body is the snapshot document");
ok(!body.includes("data-pdx-bill-empty"), "S. 5653 is not the empty");
has(page.html, `<link rel="canonical" href="${ORIGIN}${PAGE}"`, "the page canonicalises to /b/119/S.%205653");
ok(!/name="robots" content="noindex"/.test(page.html), "the page is indexable");
has(page.html, "<title>S. 5653", "the head names the measure");

const alias = await serve(`/b/${encodeURIComponent(NUM)}`);
eq(alias.status, 200, "/b/S.%205653 answers 200");
has(seamOf(alias.html), `<h1 class="pdx-bill-num">${NUM}</h1>`, "/b/S.%205653 is the same bill file");
has(alias.html, `<link rel="canonical" href="${ORIGIN}${PAGE}"`, "/b/S.%205653 canonicalises to the full address");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · every mapping row, with key, direction, quote and rationale");
// ═════════════════════════════════════════════════════════════════════════════
eq(LEDGER.issues.length, 18, "the ledger holds 18 mapping rows");
const items = [...body.matchAll(/<li data-pdx-bill-map data-key="([^"]+)" data-direction="([^"]+)">([\s\S]*?)<\/li>/g)];
eq(items.length, 18, "the page lists 18 mapping rows");
LEDGER.issues.forEach((row, i) => {
  const it = items[i];
  if (!it) return ok(false, `row ${i + 1} (${row.issueKey}) is missing`);
  eq(it[1], row.issueKey, `row ${i + 1}: key`);
  eq(it[2], row.supportMeaning, `row ${i + 1} (${row.issueKey}): direction`);
  has(it[3], `<code data-pdx-bill-map-key>${row.issueKey}</code>`, `row ${i + 1}: the key is printed`);
  has(it[3], `data-pdx-bill-map-direction="${row.supportMeaning}"`, `row ${i + 1}: the direction is printed`);
  has(it[3], row.supportMeaning === "yea_supports" ? "A yea vote supports this issue" : "A yea vote opposes this issue", `row ${i + 1}: the direction in words`);
  has(it[3], `“${esc(row.quote)}”`, `row ${i + 1} (${row.issueKey}): the quote, verbatim`);
  has(it[3], `<span data-pdx-bill-map-section>${esc(row.quoteRef)}</span>`, `row ${i + 1}: the quoted section`);
  for (const ref of row.provisionRefs) has(it[3], esc(ref), `row ${i + 1}: section ${ref}`);
  has(it[3], esc(row.rationale), `row ${i + 1} (${row.issueKey}): the rationale, verbatim`);
});
const splits = LEDGER.issues.reduce((m, r) => ((m[r.issueKey] = (m[r.issueKey] || []).concat(r.supportMeaning)), m), {});
for (const k of ["tribal_consultation", "property_rights", "mine_cleanup"]) {
  eq(JSON.stringify([...(splits[k] || [])].sort()), JSON.stringify(["yea_opposes", "yea_supports"]), `${k} is split one row per direction`);
}
has(body, `data-pdx-bill-ledger-equality>${esc(LEDGER.mappingEqualityNote)}</p>`, "the equality statement is on the page");
has(body, esc(LEDGER.completeness.E_issue_mapping.note), "the completeness note is on the page");
has(body, "mine_cleanup", "the new mine_cleanup key is on the page");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no weight, primary label or ranking language");
// ═════════════════════════════════════════════════════════════════════════════
const RANK_WORDS = /\bweights?\b|\bweighted\b|\bprimary\b|\bsecondary\b|\branks?\b|\branked\b|\branking\b|\bpriority\b|\btop issue\b|\bmain issue\b|\bheadline issue\b/i;
const withoutEq = body.replace(/<p class="pdx-bill-ledger-eq"[\s\S]*?<\/p>/, "");
const words = withoutEq.replace(/<[^>]+>/g, " ");
ok(!RANK_WORDS.test(words), `the page prints ranking language outside the equality statement: ${(words.match(RANK_WORDS) || [])[0]}`);
const ldJson = JSON.stringify(DOC.ld);
for (const f of RANKING_FIELDS) ok(!new RegExp(`"${f}"\\s*:`).test(ldJson), `the doc carries no ${f} field`);
for (const r of DOC.ld.rows) ok(Object.keys(r).every((k) => ["k", "i", "d", "r", "qr", "q", "w", "u"].includes(k)), `row ${r.k} carries only key, label, direction, sections, quote and rationale`);

// ═════════════════════════════════════════════════════════════════════════════
section("5 · search finds it");
// ═════════════════════════════════════════════════════════════════════════════
const ROWS = (() => { const w = {}; vm.runInNewContext(R("bill-search-index.js"), { window: w }); return w.PDX_BILL_SEARCH; })();
const ROW = ROWS.find((r) => r[0] === "119" && r[1] === NUM);
ok(!!ROW, "S. 5653 is in the eye's bill index");
ok(ROW && /\(BAAJA\)$/.test(ROW[2]) && /American Affordability/.test(ROW[2]), "the index row's searched title carries the short names");
eq(ROW && ROW.length, 6, "the row keeps the index's six-field shape");
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {}, _li: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
      toggle: (c, on) => (on === undefined ? (set.has(c) ? set.delete(c) : set.add(c)) : (on ? set.add(c) : set.delete(c))),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); }, getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener(t, f) { (n._li[t] = n._li[t] || []).push(f); }, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true, matches: () => false,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 360, height: 400, bottom: 400, right: 360 }),
  };
  return n;
}
function bootEye(rows, inline) {
  const w = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  w.document.getElementById = (id) => ids[id] || null;
  w.history = { replaceState() {}, pushState() {} };
  const store = {};
  w.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  w.addEventListener = () => {};
  const ctx = vm.createContext(w);
  for (const f of [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js"]) vm.runInContext(R(f), ctx, { filename: f });
  w.PROFILES = w.CMP_DATA;
  w.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  w.PDX_BILLS_INDEX = inline || [];
  w._issueLabel = (k) => (w.ISSUE_MAP && w.ISSUE_MAP[k] && w.ISSUE_MAP[k].label) || "";
  w.PDXSaved = { list: () => [], has: () => false };
  w.PDXBills = { open: () => true };
  vm.runInContext(R("all-seeing-eye.js"), ctx, { filename: "all-seeing-eye.js" });
  must(w.PDXEye && typeof w.PDXEye.render === "function", "PDXEye.render is unavailable");
  w.PDX_BILL_SEARCH = rows; w.PDXEye.rebuild();
  eye.classList.add("is-open");
  return (q) => { input.value = q; w.PDXEye.render(q); return panel.innerHTML || ""; };
}
const hrefs = (html) => [...String(html).matchAll(/<a role="option" class="pdx-eye-item pdx-eye-item--bill"[^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
const INLINE = (() => { const w = {}; vm.runInNewContext(R("bills-index.js"), { window: w }); return w.PDX_BILLS_INDEX; })();
for (const [label, search] of [["page index", bootEye(ROWS)], ["page + curated index", bootEye(ROWS, INLINE)]]) {
  for (const q of ["baaja", "BAAJA", "S. 5653", "American Affordability", "Bipartisan American Affordability and Jobs Act"]) {
    const got = hrefs(search(q));
    ok(got.includes(PAGE), `${label}: "${q}" finds ${NUM} (got ${got.slice(0, 5).join(", ")})`);
    console.log(`      ${label}: "${q}" → ${NUM} at row ${got.indexOf(PAGE) + 1} of ${got.length}`);
  }
}
// Without the short names, "baaja" would find nothing: the title does not hold it.
{
  const bare = ROWS.map((r) => (r[1] === NUM ? [r[0], r[1], DOC.t, ...r.slice(3)] : r));
  ok(!hrefs(bootEye(bare)("baaja")).includes(PAGE), "the short names are what make \"baaja\" find the page");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing else moved");
// ═════════════════════════════════════════════════════════════════════════════
// S. 5653 is now in the Voting Record (20261214000000_vr_seed_baaja_s5653.sql),
// so the migrations alone produce a document for it too. The ledger is laid
// over that document: the page keeps the ledger's fields and mapping table, and
// the bill joins its sponsors' person files like any record-held bill.
const PB = JSON.parse(R("person-bills.json"));
const pbRow = PB.bills.findIndex((b) => b[0] === "119" && b[1] === NUM);
ok(pbRow >= 0, "person bill lists carry S. 5653 now that the record holds it");
for (const [pid, role] of [["capito", "s"], ["lee", "c"], ["whitehouse", "c"], ["heinrich", "c"]]) {
  ok((PB.people[pid] || []).some(([i, r]) => i === pbRow && r === role), `${pid}'s person file lists S. 5653 (${role})`);
}
const migrationOnly = billDocs(ROOT, { noLedgers: true });
ok(!!migrationOnly[KEY], "the migrations alone now hold an S. 5653 document");
eq(Object.keys(DOCS).filter((k) => !migrationOnly[k]).length, 0, "the ledger adds no document the migrations lack");
eq(DOC.ld.vr, true, "the doc says the Voting Record holds the measure");
ok(Object.keys(migrationOnly).filter((k) => k !== KEY).every((k) => JSON.stringify(migrationOnly[k]) === JSON.stringify(DOCS[k])), "every other bill document is unchanged");
ok(ROWS.every((r) => r.length === 6), "every index row keeps the six-field shape");
ok(ROWS.every((r) => r[1] === NUM || !DOCS[`${r[0]}|${r[1]}`] || r[2] === (DOCS[`${r[0]}|${r[1]}`].t || "")), "only the ledger-published row's searched title differs from its stored title");
eq(R("all-seeing-eye.js"), execFileSync("git", ["show", "HEAD:all-seeing-eye.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }), "the eye itself is unchanged");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the Voting Record row is the ledger, verbatim");
// ═════════════════════════════════════════════════════════════════════════════
const MIG_FILE = "netlify/database/migrations/20261214000000_vr_seed_baaja_s5653.sql";
const MIG = R(MIG_FILE);
eq(MIG, renderMigration(LEDGER), "the migration is exactly what gen-baaja-migration.mjs writes from the ledger");
const sq = (x) => `'${String(x).replace(/'/g, "''")}'`;
const issueBlock = MIG.slice(MIG.indexOf("INSERT INTO vr_measure_issues"), MIG.indexOf("ON CONFLICT (measure_id, issue_key, support_meaning)"));
const migRows = [...issueBlock.matchAll(/\(m_s5653, '([a-z_]+)', 100, false, '(yea_supports|yea_opposes)',\n      ('(?:[^']|'')*'),\n      ('(?:[^']|'')*'), 'curated'\)/g)];
eq(migRows.length, 18, "the migration writes 18 mapping rows");
LEDGER.issues.forEach((row, i) => {
  const m = migRows[i];
  if (!m) return ok(false, `migration row ${i + 1} missing`);
  eq(m[1], row.issueKey, `migration row ${i + 1}: key`);
  eq(m[2], row.supportMeaning, `migration row ${i + 1} (${row.issueKey}): direction`);
  eq(m[3], sq(row.rationale), `migration row ${i + 1} (${row.issueKey}): rationale, verbatim`);
  eq(m[4], sq(row.sourceUrl), `migration row ${i + 1}: source`);
});
has(MIG, "CREATE UNIQUE INDEX IF NOT EXISTS vr_measure_issues_unique\n  ON vr_measure_issues (measure_id, issue_key, support_meaning);", "the mapping index is one row per direction");
has(R("db/schema.ts"), 'uniqueIndex("vr_measure_issues_unique").on(t.measureId, t.issueKey, t.supportMeaning)', "db/schema.ts declares the same index");
for (const f of ["netlify/lib/vr-ingest.ts", "netlify/lib/vr-issue-proposals-db.ts"]) {
  ok(!/target: \[vrMeasureIssues\.measureId, vrMeasureIssues\.issueKey\]/.test(R(f)), `${f} no longer upserts against the retired two-column index`);
}
eq((MIG.match(/INSERT INTO vr_rollcalls/g) || []).length, 6, "six roll calls");
for (const rc of LEDGER.votes.rollcalls) {
  has(MIG, `'senate', 119, ${rc.session}, ${rc.roll}, TIMESTAMPTZ '${rc.date}T12:00:00-05:00', ${sq(rc.question)}, ${sq(rc.actionType)}`, `roll ${rc.roll} with its own question and type`);
}
eq((MIG.match(/^    \(rc, '/gm) || []).length, 600, "600 member votes, all 100 senators on each roll");
const addr = measureAddresses(ROOT).published.find((a) => a.sitting === "119" && a.number === NUM);
ok(!!addr, "the migration reader finds S. 5653");
eq(addr && addr.mappings, 18, "the migration reader counts 18 mappings");
eq(addr && [...addr.issues].sort().join(","), [...new Set(LEDGER.issues.map((x) => x.issueKey))].sort().join(","), "over the ledger's 15 keys");
const alreadyApplied = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => f > "20261213000000_pdx_stated_positions_text_kind.sql");
eq(alreadyApplied.join(","), "20261214000000_vr_seed_baaja_s5653.sql", "exactly one new migration");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the panel loads S. 5653");
// ═════════════════════════════════════════════════════════════════════════════
has(body, `<button type="button" data-pdx-bill-panel>`, "the bill page offers the panel control again");
{
  const MID = 5653000;
  const fixture = {
    measure: { id: MID, number: NUM, congress: 119, chamber: "senate", status: "pending", title: LEDGER.identity.shortTitle,
      summary: LEDGER.overview.plainSummary, source: { url: LEDGER.identity.congressGovUrl, label: "Congress.gov" } },
    issues: LEDGER.issues.map((x) => ({ issueKey: x.issueKey, weight: 100, supportMeaning: x.supportMeaning, rationale: x.rationale })),
    rollcalls: LEDGER.votes.rollcalls.map((rc, i) => ({
      id: i + 1, chamber: "senate", congress: 119, session: rc.session, rollNumber: rc.roll, voteDate: `${rc.date}T17:00:00Z`,
      question: rc.question, actionType: rc.actionType, result: rc.result, totals: rc.totals, source: { url: rc.sourceUrl },
      votes: rc.members.map((m) => ({ politicianId: m.politicianId, position: { Yea: "yea", Nay: "nay" }[m.vote] || "not_voting", isParty: null })),
    })),
    positions: [], provisions: [], actions: [],
  };
  const DOC_SCRIPTS = [...BILL_HTML.matchAll(/<script\b[^>]*\bsrc="\/([^"]+)"[^>]*><\/script>/g)].map((m) => m[1]);
  const win = makeSandbox();
  win.__PDX_BILL_DOC = true;
  win.location = { href: ORIGIN + PAGE, pathname: PAGE, search: "", hash: "", origin: ORIGIN, assign() { win.__assigned = true; } };
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  win.fetch = () => Promise.reject(new Error("offline"));
  const ctx = vm.createContext(win);
  for (const f of DOC_SCRIPTS) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { /* page scripts the panel does not need */ } }
  must(win.PDXBillDetail && typeof win.PDXBillDetail.open === "function", "bill-detail.js boots");
  let asked = null;
  win.PDXBills = {
    list: (f) => Promise.resolve({ items: [{ id: MID, number: NUM, congress: 119, chamber: "senate" }] }),
    get: (id) => { asked = id; return Promise.resolve(fixture); },
    listSync: () => ({ items: [] }), isFollowed: () => false,
  };
  win.PDXBillDetail.open(NUM, "119", { arrival: true });
  for (let i = 0; i < 60; i++) await Promise.resolve();
  const html = capture.innerHTML;
  eq(asked, MID, "the number resolves to the measure id and the detail is fetched");
  ok(!html.includes("Could not load this bill right now."), "the panel does not print the load error");
  ok(!html.includes("aren’t available right now"), "the panel is the live detail, not the card-only fallback");
  ok(!win.__assigned, "the panel does not send the reader away");
  eq((html.match(/<div class="bd-omni-row/g) || []).length, 18, "the panel lists all 18 mapping rows");
  for (const rc of LEDGER.votes.rollcalls) has(html, esc(rc.question).replace(/"/g, "&quot;"), `the panel shows roll ${rc.roll}`);
}

console.log(`\n   ${failures.length ? "✗" : "✓"} baaja bill file: ${passed} passed, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log(`      ✗ ${f.slice(0, 300)}`);
process.exit(failures.length ? 1 : 0);
