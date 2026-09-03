#!/usr/bin/env node
/**
 * test-instrument-summaries.mjs — the sheet says what the text does, and cites it
 * ─────────────────────────────────────────────────────────────────────────────
 * THE DEFECT THIS SUITE LOCKS SHUT
 *
 * A measure sheet used to open on a title, a date and a link, and the title did
 * all the talking. On the January 20, 2025 memorandum that title is "Delivering
 * Emergency Price Relief for American Families and Defeating the Cost-of-Living
 * Crisis", which names no lever whatsoever — not a rule, not a deadline, not a
 * dollar. A reader could not tell the slogan from the text, and the archive's own
 * description was hidden in a closed fold below the census where nobody looks.
 *
 * What this suite holds:
 *
 *   1. THE SEEDED PROSE IS LEVERS, SOURCED. The two summaries written by
 *      20261027000000_vr_instrument_lever_summaries_w1.sql are read straight out
 *      of the migration and checked as prose: 3-8 sentences, no effect claim, no
 *      party, not the title again, and each one naming officers and deadlines the
 *      cited document actually contains.
 *   2. IT RENDERS IN THE IDENTITY BLOCK, ABOVE THE CHIPS, WITH THE URL. The real
 *      bill-detail.js is booted and the real memorandum payload rendered through
 *      it. The summary has to land inside <dl class="bd-ident">, before the first
 *      topic chip, with the Federal Register link beside the prose.
 *   3. ONE FIELD, ONE PRINTING. The fold and the identity row read the same
 *      column and exactly one of them prints it, so a reader never meets the same
 *      description twice and a 2,600-character omnibus wall never lands in an
 *      identity row.
 *   4. THE EMPTY LINE IS STILL LOCKED. A measure with no description on file says
 *      "No plain-language summary on file yet" — and so does a measure whose
 *      description is nothing but its own title, because that is a title wearing a
 *      summary's label and no summary at all.
 *   5. THE WALLS STAND. A floor bill with an empty chamber file still says no vote
 *      on file; the executive-act copy, the disapproval-measure clarifier and the
 *      standing caveat are untouched.
 *   6. THE GUARDS ARE LOAD-BEARING. Three mutations of the shipped renderer must
 *      each break a claim above.
 *
 *   node scripts/test-instrument-summaries.mjs
 *
 * Exit code is non-zero on any failure so it can gate CI.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const hasNot = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n  · ${t}`);

const MIGRATION = "netlify/database/migrations/20261027000000_vr_instrument_lever_summaries_w1.sql";
const SQL = R(MIGRATION);
const DETAIL = R("bill-detail.js");
const GAP = "No plain-language summary on file yet";

// The locked executive-act copy, verbatim — this pass may not touch a word of it.
const SAY = "This is an executive act. One official issued it; it does not go to a House or " +
  "Senate roll call. The formal record here is the issuance (and any later revoke/supersede), " +
  "not a yea/nay.";
const CRA = "A later vote on a related disapproval resolution belongs to that measure and is " +
  "counted there; it is not a floor tally for this instrument.";
const STANDING = "Standing describes the instrument, not its effect.";
const ROLLGAP = "No recorded roll-call votes for this measure yet.";
const VOTEGAP = "No recorded vote on file.";

// ── read the seeded prose out of the migration ───────────────────────────────
// The summaries are asserted as SHIPPED TEXT, not as a copy of them kept in this
// file. A fixture holding its own idea of the prose would pass forever while the
// migration wrote something else, so the extractor reads the PL/pgSQL assignment
// and rebuilds the concatenated literal exactly as Postgres would.
function seededSummaries(sql) {
  const out = new Map();
  const re = /--\s*@summary-seed number="([^"]+)"\s*\n\s*--\s*@summary-source (\S+)[\s\S]*?\n\s*s :=([\s\S]*?);\s*\n/g;
  for (const m of sql.matchAll(re)) {
    const lits = [...m[3].matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'"));
    out.set(m[1], { text: lits.join(""), source: m[2] });
  }
  return out;
}
const SEEDED = seededSummaries(SQL);
const MEMO_NUM = "Presidential Memorandum, 90 FR 8245";
const EO_NUM = "Executive Order 14162";
const FR_MEMO = "https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis";
const FR_EO = "https://www.federalregister.gov/documents/2025/01/30/2025-02010/putting-america-first-in-international-environmental-agreements";

console.log("\n📄 instrument summaries — what the writing orders, plus the official source");
if (!SEEDED.has(MEMO_NUM) || !SEEDED.has(EO_NUM)) {
  console.error(`✗ instrument summaries: ${MIGRATION} yielded ${SEEDED.size} seeded summaries — nothing below can be trusted`);
  process.exit(1);
}
const MEMO_SUM = SEEDED.get(MEMO_NUM);
const EO_SUM = SEEDED.get(EO_NUM);

// Titles the prose is not allowed to be a restatement of.
const MEMO_TITLE = "Delivering Emergency Price Relief for American Families and Defeating the Cost-of-Living Crisis";
const EO_TITLE = "Putting America First in International Environmental Agreements";

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the seeded prose is levers, in the shape the identity block wants");
// ═════════════════════════════════════════════════════════════════════════════
{
  eq(SEEDED.size, 2, "the pass seeds a number of instruments other than the two it names");
  for (const [num, { text }] of SEEDED) {
    ok(text.length > 220, `${num}: the seeded summary is too short to be a lever list (${text.length} chars)`);
    // 3-8 SHORT SENTENCES. Counted on sentence-ending periods followed by a space
    // or the end of the field, which is what the prose is written in.
    const sentences = text.split(/\.(?:\s+|$)/).filter((s) => s.trim().length > 8);
    ok(sentences.length >= 3 && sentences.length <= 8,
      `${num}: the seeded summary is ${sentences.length} sentences — the brief allows 3 to 8`);
    // The gate in bill-detail.js decides whether this lands in the identity block
    // or stays folded. Seeded lever prose must be on the identity-block side of it.
    const max = Number((DETAIL.match(/IDENT_SUMMARY_MAX\s*=\s*(\d+)/) || [])[1]);
    ok(max > 0, "bill-detail.js no longer declares IDENT_SUMMARY_MAX — this suite cannot tell where a summary renders");
    ok(text.length <= max,
      `${num}: the seeded summary is ${text.length} chars, over the ${max}-char identity gate, so it would render folded instead of in the identity block`);
  }
  // The memorandum's own levers: the officer it names, the clock it sets, and the
  // areas it lists. Each one is in the Federal Register text and none is in the title.
  for (const frag of [
    "heads of all executive departments and agencies",
    "Assistant to the President for Economic Policy",
    "within 30 days",
    "every 30 days",
    "housing supply",
    "home appliances",
    "discouraged workers",
  ]) has(MEMO_SUM.text, frag, `90 FR 8245: the seeded summary drops a lever the memorandum contains (${frag})`);
  // The order's levers: two notices, a revocation, two clocks, two named officers.
  for (const frag of [
    "Ambassador to the United Nations",
    "Paris Agreement",
    "United Nations Framework Convention on Climate Change",
    "cease or revoke",
    "International Climate Finance Plan",
    "Office of Management and Budget",
    "10 days",
    "30 days",
  ]) has(EO_SUM.text, frag, `EO 14162: the seeded summary drops a lever the order contains (${frag})`);
  // NOT DERIVED FROM THE TITLE. The strongest form of the claim available to a
  // test: no six-word run of either title survives in its summary.
  for (const [num, title, sum] of [[MEMO_NUM, MEMO_TITLE, MEMO_SUM.text], [EO_NUM, EO_TITLE, EO_SUM.text]]) {
    const words = title.split(/\s+/);
    let echoed = 0;
    for (let i = 0; i + 6 <= words.length; i++) {
      if (sum.includes(words.slice(i, i + 6).join(" "))) echoed++;
    }
    eq(echoed, 0, `${num}: the seeded summary reuses a run of its own title — the title is being passed off as the description`);
    ok(sum !== title, `${num}: the seeded summary IS the title`);
  }
  // AND EACH ONE CITES THE DOCUMENT IT WAS READ FROM, in the migration, beside
  // the prose — the URL the sheet renders comes from the measure row, but the
  // curation record has to name the text a human actually read.
  eq(MEMO_SUM.source, FR_MEMO, "90 FR 8245's seeded summary does not cite the Federal Register document it was read from");
  eq(EO_SUM.source, FR_EO, "EO 14162's seeded summary does not cite the Federal Register document it was read from");
  has(SQL, "federalregister.gov/documents/full_text/text/2025/01/28/2025-01904.txt",
    "the migration no longer records the raw text of the memorandum it was written from");
  has(SQL, "federalregister.gov/documents/full_text/text/2025/01/30/2025-02010.txt",
    "the migration no longer records the raw text of the order it was written from");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · no effect claim, no party, no score anywhere in the prose");
// ═════════════════════════════════════════════════════════════════════════════
// The one thing a plain-language summary must never become is an argument. These
// are the exact strings the brief banned, plus the score vocabulary this archive
// bans everywhere: an instrument in force is an instrument in force, and standing
// describes the writing rather than its effect.
{
  const BANNED = [
    "helps families", "help families", "costs will fall", "prices will fall", "lower prices",
    "reduces prices", "brought prices down", "cost of living fell", "will save",
    "Republican", "Democrat", "Democratic", "GOP", "conservative", "liberal", "%",
    "mostly", "largely", "strongly", "poorly", "consistent", "inconsistent", "mixed record",
  ];
  for (const [num, { text }] of SEEDED) {
    for (const b of BANNED) {
      ok(!text.toLowerCase().includes(b.toLowerCase()), `${num}: the seeded summary carries a banned string (${b})`);
    }
    // No vote language on an instrument nobody voted on.
    ok(!/\b(yea|nay|roll ?call|voted)\b/i.test(text), `${num}: the seeded summary uses vote language about an instrument with no vote`);
  }
  // The characterisations the memorandum makes are ATTRIBUTED to it rather than
  // asserted by us. "raise the cost of home appliances" is the document's claim.
  has(MEMO_SUM.text, "the memorandum says raise the cost of home appliances",
    "90 FR 8245's summary states the document's cost claim as a fact of the world instead of attributing it");
  has(MEMO_SUM.text, "it calls coercive",
    "90 FR 8245's summary adopts the document's characterisation of climate policy instead of attributing it");
  // And it says plainly that it is a reading of a text, not a finding about prices.
  has(MEMO_SUM.text, "rather than a statement about any price",
    "90 FR 8245's summary no longer disclaims that it says nothing about prices");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · the migration writes summaries and nothing else");
// ═════════════════════════════════════════════════════════════════════════════
{
  const body = SQL.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
  hasNot(body, "INSERT INTO", "the summary pass creates rows — it may only fill a description on rows that exist");
  hasNot(body, "DELETE", "the summary pass deletes something");
  hasNot(body, "ALTER TABLE", "the summary pass changes schema");
  hasNot(body, "SET title", "the summary pass rewrites a title");
  hasNot(body, "vr_measure_issues", "the summary pass touches issue mappings");
  hasNot(body, "vr_exec_action_status", "the summary pass touches standing");
  hasNot(body, "vr_positions", "the summary pass touches positions");
  eq((body.match(/UPDATE vr_measures/g) || []).length, 2, "the summary pass updates a number of measures other than two");
  // Idempotent by construction: each write is guarded against the text it writes.
  eq((body.match(/summary IS DISTINCT FROM s/g) || []).length, 2,
    "an UPDATE is not guarded by `summary IS DISTINCT FROM s` — re-running the migration would churn rows");
  // Scoped to the executive chamber and the instrument named, never to a number alone.
  eq((body.match(/chamber = 'executive'/g) || []).length, 2, "an UPDATE is not scoped to the executive chamber");
  has(body, `number = '${MEMO_NUM}'`, "the memorandum update no longer matches the instrument by number");
  has(body, `number = '${EO_NUM}'`, "the order update no longer matches the instrument by number");
}

// ── boot the shipped panel ───────────────────────────────────────────────────
function boot(src) {
  const win = makeSandbox();
  const capture = { innerHTML: "", scrollTop: 0 };
  win.document.getElementById = (id) => (id === "pdx-bd-scroll" ? capture : null);
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  for (const f of [...ENGINE_FILES, "issue-colors.js", "issue-scope.js", "receipt-cards.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  vm.runInContext(src || DETAIL, ctx, { filename: "bill-detail.js" });
  if (!win.PDXBillDetail || typeof win.PDXBillDetail.open !== "function") {
    throw new Error("PDXBillDetail.open() unavailable after loading bill-detail.js");
  }
  return { win, capture };
}
async function render(win, capture, data) {
  capture.innerHTML = "";
  win.PDXBills = {
    get: () => Promise.resolve(data),
    list: () => Promise.resolve({ items: [] }),
    listSync: () => ({ items: [] }),
    isFollowed: () => false,
  };
  win.PDXBillDetail.open(data.measure.id);
  for (let i = 0; i < 12; i++) await Promise.resolve();
  return capture.innerHTML;
}
const ident = (html) => {
  const i = html.indexOf('<dl class="bd-ident">');
  if (i < 0) return "";
  const j = html.indexOf("</dl>", i);
  return j < 0 ? html.slice(i) : html.slice(i, j + 5);
};

// ── the fixtures ─────────────────────────────────────────────────────────────
// 90 FR 8245 as the archive now holds it: the real number, the real title, the
// real Federal Register URL, and the summary text this pass seeds.
const FR8245 = {
  measure: {
    id: 90245, number: MEMO_NUM, congress: null, chamber: "executive",
    measureType: "memorandum", status: "enacted", title: MEMO_TITLE,
    shortTitle: "Emergency price relief memorandum",
    introducedAt: "2025-01-20", summary: MEMO_SUM.text,
    externalIds: { mappingReadFrom: "as issued", mappingTextUrl: FR_MEMO, frCitation: "90 FR 8245" },
    source: { url: FR_MEMO, label: "Federal Register" },
  },
  issues: [
    { issueKey: "cost_living", supportMeaning: "yea_supports", isPrimary: true, rationale: "Directs agencies to pursue price relief." },
    { issueKey: "housing", supportMeaning: "yea_supports", isPrimary: false, rationale: "Names housing supply among the directed actions." },
  ],
  rollcalls: [], positions: [], provisions: [], actions: [],
};
// EO 14162, the already-mapped order on a live climate profile.
const EO14162 = {
  measure: {
    id: 14162, number: EO_NUM, congress: null, chamber: "executive",
    measureType: "executive_order", status: "enacted", title: EO_TITLE,
    introducedAt: "2025-01-20", summary: EO_SUM.text,
    externalIds: { mappingReadFrom: "as issued", mappingTextUrl: FR_EO, frCitation: "90 FR 8455" },
    source: { url: FR_EO, label: "Federal Register" },
  },
  issues: [{ issueKey: "climate_action", supportMeaning: "yea_opposes", isPrimary: true, rationale: "Section 3 directs notice of withdrawal." }],
  rollcalls: [], positions: [], provisions: [], actions: [],
};
// THE EMPTY CASE. Same instrument, nothing on file — the locked line's fixture.
const NOSUM = { ...FR8245, measure: { ...FR8245.measure, summary: "" } };
// THE TITLE-ECHO CASE. A description column filled with the measure's own name.
const ECHO = { ...FR8245, measure: { ...FR8245.measure, summary: MEMO_TITLE } };
// THE OMNIBUS WALL. 2,600 characters of ingested section-by-section description,
// which is a footnote and not an identity fact.
const WALL_TEXT = "This Act makes appropriations for the fiscal year. " +
  "Division A provides amounts for agriculture, rural development and the Food and Drug Administration. ".repeat(25);
const WALL = {
  measure: {
    id: 3057, number: "H.R. 3057", congress: 119, chamber: "house", measureType: "bill",
    status: "enacted", title: "Consolidated Appropriations Act", introducedAt: "2025-05-01",
    summary: WALL_TEXT,
    externalIds: { congressGovUrl: "https://www.congress.gov/bill/119th-congress/house-bill/3057" },
    source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/3057", label: "Congress.gov" },
  },
  issues: [{ issueKey: "cut_spending", supportMeaning: "yea_supports", isPrimary: true, rationale: "Sets discretionary totals." }],
  rollcalls: [], positions: [], provisions: [], actions: [],
};
// THE FLOOR-BILL CONTROL. A senate bill with an empty chamber file and no
// description. It must go on saying both true things about itself.
const SENATE_BILL = {
  measure: {
    id: 4021, number: "S. 4021", congress: 119, chamber: "senate", measureType: "bill",
    status: "introduced", title: "A bill to do a thing", introducedAt: "2025-04-02",
    source: { url: "https://www.congress.gov/bill/119th-congress/senate-bill/4021", label: "Congress.gov" },
  },
  issues: [], rollcalls: [], positions: [], provisions: [], actions: [],
};

const { win, capture } = boot();
const MEMO = await render(win, capture, FR8245);
const ORDER = await render(win, capture, EO14162);
const EMPTY = await render(win, capture, NOSUM);
const TITLED = await render(win, capture, ECHO);
const OMNI = await render(win, capture, WALL);
const FLOOR = await render(win, capture, SENATE_BILL);
for (const [name, html] of [["90 FR 8245", MEMO], ["EO 14162", ORDER], ["no summary", EMPTY],
  ["title echo", TITLED], ["omnibus", OMNI], ["S. 4021", FLOOR]]) {
  if (!html || html.length < 600) {
    console.error(`✗ instrument summaries: ${name} rendered ${html.length} characters — nothing below can be trusted`);
    process.exit(1);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · 90 FR 8245: the identity block explains the text and cites it");
// ═════════════════════════════════════════════════════════════════════════════
{
  const dl = ident(MEMO);
  ok(dl.length > 200, "the memorandum sheet has no identity block at all");
  has(dl, MEMO_SUM.text, "the seeded summary is not in the identity block");
  has(dl, '<span class="bd-ident-sum">', "the summary is not rendered as an identity fact");
  // THE OFFICIAL URL, BESIDE THE PROSE. Not three rows up, not only in the fold.
  const sumRow = dl.slice(dl.indexOf("bd-ident-sumfact"));
  has(sumRow, FR_MEMO, "the Federal Register URL is not printed beside the summary prose");
  has(sumRow, "Read from", "the summary prose carries no citation line");
  has(sumRow, "Federal Register", "the citation beside the summary does not name the record it was read from");
  // THE TITLE IS NOT THE EXPLANATION. The summary and the title are both on the
  // page and they are different sentences.
  ok(MEMO_SUM.text !== MEMO_TITLE, "the summary and the title are the same string");
  has(MEMO, MEMO_TITLE, "the sheet lost the measure's own title");
  hasNot(dl, GAP, "the memorandum is told it has no summary while printing one");
  // ABOVE THE TOPIC CHIPS. A chip is a mapping; a mapping means nothing until the
  // reader knows what was mapped.
  const sumAt = MEMO.indexOf('class="bd-ident-sum"');
  const chipAt = MEMO.indexOf('class="bd-lh-chip"');
  ok(sumAt > 0 && chipAt > 0, "the sheet is missing either the summary or the topic chips");
  ok(sumAt < chipAt, "the summary renders BELOW the topic chips");
  // EO 14162 gets the same treatment on a live climate profile's instrument.
  const dlo = ident(ORDER);
  has(dlo, EO_SUM.text, "EO 14162's seeded summary is not in its identity block");
  has(dlo.slice(dlo.indexOf("bd-ident-sumfact")), FR_EO, "EO 14162's summary prose carries no Federal Register URL");
  hasNot(dlo, GAP, "EO 14162 is told it has no summary while printing one");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · one field, one printing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The description that went up is not also folded below.
  hasNot(MEMO, "bd-fold", "the memorandum prints its description twice — identity block and fold");
  hasNot(ORDER, "bd-fold", "EO 14162 prints its description twice — identity block and fold");
  eq((MEMO.match(new RegExp(MEMO_SUM.text.slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1,
    "the seeded summary appears more than once on the memorandum sheet");
  // And the omnibus wall goes the other way: folded, never in an identity row.
  const dlw = ident(OMNI);
  hasNot(dlw, "bd-ident-sum", "a 2,600-character ingested description was promoted into the identity block");
  hasNot(dlw, GAP, "an omnibus with a description on file is told it has none");
  has(OMNI, "bd-fold", "the omnibus description lost its fold");
  has(OMNI, WALL_TEXT.slice(0, 60), "the omnibus description is no longer printed anywhere");
  // Still exactly one printing, just the other surface.
  eq((OMNI.match(/bd-fold-body/g) || []).length, 1, "the omnibus description is folded more than once");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the locked empty line, and a title is never a summary");
// ═════════════════════════════════════════════════════════════════════════════
{
  const dl = ident(EMPTY);
  has(dl, GAP, "a measure with no description on file stopped saying so");
  hasNot(EMPTY, "bd-ident-sum", "a measure with no description on file rendered a summary anyway");
  hasNot(EMPTY, "bd-fold", "a measure with no description on file rendered an empty fold");
  // THE TITLE-ECHO CASE. A description column holding the measure's own name is
  // not a description, and this face says so rather than reprinting the title
  // under a heading that claims it explains the text.
  const dle = ident(TITLED);
  has(dle, GAP, "a description that is only the measure's title is passed off as a summary");
  hasNot(dle, "bd-ident-sum", "a title copied into the description column rendered as a summary");
  hasNot(TITLED, "bd-fold-body", "a title copied into the description column rendered as a folded description");
  // The floor bill with nothing on file says it too.
  has(ident(FLOOR), GAP, "a floor bill with no description on file stopped saying so");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the walls: floor votes, executive-act copy, standing");
// ═════════════════════════════════════════════════════════════════════════════
{
  // A floor bill with an empty chamber file keeps both true sentences.
  has(FLOOR, ROLLGAP, "a senate bill with an empty chamber file stopped saying no roll call was recorded");
  has(FLOOR, VOTEGAP, "a senate bill with an empty chamber file stopped leading with 'No recorded vote on file'");
  hasNot(FLOOR, SAY, "a senate bill was told it is an executive act");
  // The executive-act copy is untouched, on both instruments.
  for (const [name, html] of [["90 FR 8245", MEMO], ["EO 14162", ORDER]]) {
    has(html, SAY, `${name}: the sheet lost the executive-act sentence`);
    has(html, CRA, `${name}: the sheet lost the disapproval-measure clarifier`);
    has(html, STANDING, `${name}: the sheet lost 'Standing describes the instrument, not its effect.'`);
    hasNot(html, ROLLGAP, `${name}: an executive act is back to reporting a missing roll call`);
  }
  // And the summary row introduces no score and no party to a face that has never
  // carried either.
  for (const w of ["Republican", "Democrat", "GOP", "%"]) {
    hasNot(ident(MEMO), w, `the identity block now carries a party word or a percentage (${w})`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the guards are load-bearing (mutations must break the claims)");
// ═════════════════════════════════════════════════════════════════════════════
// Every claim above is worth its line only if a plausible regression fails it.
{
  // (a) THE RENDER GOES AWAY. Drop the identity summary row and §4 collapses.
  const noRow = DETAIL.replace(/    var isum = identSummary\(m\);/, "    var isum = '';");
  ok(noRow !== DETAIL, "GUARD BROKEN: mutation (a) matched nothing — identSummary() is not called where this suite expects");
  // (b) THE TITLE RULE GOES AWAY. Stop reading a title-echo as empty and §6 collapses.
  const noEcho = DETAIL.replace(/    if \(f === flatText\(m && m\.title\)[^\n]*\n/, "");
  ok(noEcho !== DETAIL, "GUARD BROKEN: mutation (b) matched nothing — the title-echo rule is not shaped as this suite expects");
  // (c) THE LENGTH GATE GOES AWAY. Promote the omnibus wall and §5 collapses.
  const noGate = DETAIL.replace(/IDENT_SUMMARY_MAX = \d+/, "IDENT_SUMMARY_MAX = 999999");
  ok(noGate !== DETAIL, "GUARD BROKEN: mutation (c) matched nothing");
  for (const [label, src, fixture, want, wantIn] of [
    ["(a) no identity summary row", noRow, FR8245, MEMO_SUM.text, false],
    ["(b) no title-echo rule", noEcho, ECHO, GAP, false],
    ["(c) no length gate", noGate, WALL, "bd-ident-sum", true],
  ]) {
    const b = boot(src);
    const html = await render(b.win, b.capture, fixture);
    const found = wantIn ? html.includes(want) : ident(html).includes(want);
    ok(wantIn ? found : !found,
      `GUARD BROKEN: mutation ${label} still satisfies the suite — the claim it should break is not load-bearing`);
  }
}

// ── report ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  for (const f of failures) console.error(`✗ ${f}`);
  console.error(`\n✗ instrument summaries: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ instrument summaries: all ${passed} assertions passed`);
