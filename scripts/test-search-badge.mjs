// ═══════════════════════════════════════════════════════════════════════════
//  THE ALL-SEEING EYE POLITICIAN CHIP — one meaning, in the index's own words
// ═══════════════════════════════════════════════════════════════════════════
// The chip on a search result row used to be the curated Say-vs-Do receipt
// verdict. That layer answers a different question — "does a negative public
// record item exist for someone with a stated position" — off a different
// evidence base, and it answered it in the ISSUE INDEX's hardest words:
// "Says One Thing · Does Another". So a profile whose index reads 0 Contradicted
// and 4 Mixed announced itself in search with the Contradicted vocabulary, and a
// reader had no way to tell the two surfaces were not talking about the same
// thing.
//
// The rule this file pins down:
//
//     the chip is the strongest result in that politician's issue index,
//     named and coloured exactly as the index names and colours it.
//
// Strongest is OUTCOMES order, and only a bucket that HAS rows can be it — so
// Mixed is reachable, and a Mixed record is never dressed in the hard negative.
// The coverage bucket is not a result and is never the chip.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

// ── Fake DOM ────────────────────────────────────────────────────────────────
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), toggle: () => {}, contains: (c) => cls.has(c) },
    _attrs: {},
    setAttribute(k, v) { el._attrs[k] = v; }, getAttribute: (k) => (k in el._attrs ? el._attrs[k] : null),
    focus() {}, scrollIntoView() {}, addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { if (c) c.parentNode = el; return c; },
    querySelector: () => null, querySelectorAll: () => [], contains: () => true,
  };
  return el;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: mkEl, createTextNode: mkEl,
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};

const PID = "rep_badge";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
  energy: { label: "Energy" },
};
ctx.ISSUE_STANCE_DATA = { [PID]: [] };
ctx.PROFILES = { [PID]: { name: "Marta Solano", office: "U.S. Representative", party: "R" } };
ctx.CMP_DATA = { [PID]: {} };
ctx.window._getPhotoUrl = () => "";
ctx.window.PDXIssueColors = {
  isCore: () => false,
  getIssueColor: () => ({ mapped: false, color: "#9fb4d4" }),
  styleFor: () => "",
};

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "exec-record.js", "pdx-learn.js",
                    "consistency.js", "word-action.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);

const C = ctx.window.PDXConsistency;
const WA = ctx.window.PDXWordAction;

ok(typeof WA.searchBadgeHTML === "function",
  "the index no longer publishes a chip for the search row, so the eye has nothing to read and\n" +
  "    falls back to a different evidence base with the index's own words on it");

// ── A driveable index ───────────────────────────────────────────────────────
// The row model, stubbed, so a record's bucket shape can be set exactly. Nothing
// about the chip is invented here: it reads the same rows the index files.
const stubRow = (key, label, token) => ({
  pid: PID, key, label, tier: 1, category: "econ", categoryLabel: "Economy",
  stance: { key, label: "Said a thing", direction: "support", text: "said a thing", source: "" },
  lane: "record", tested: true, scored: true, testability: "high",
  actions: { count: 2, lane: "record", judged: 2 },
  verdict: { token, label: token, cls: "x", ico: "•", color: "#fff", score: null, basis: "action" },
  public: { token: "no_record", count: 0, judged: false },
  evidence: { count: 2, actions: 2, public: 0, total: 2, strength: "documented", sources: [] },
  setAside: null, weights: {}, ov: {},
});
const realIssueRows = C.issueRows, realRank = C.rankIssueRows;
const withRows = (rows) => {
  C.issueRows = () => rows;
  C.rankIssueRows = (rs) => rs;
  try { return WA.searchBadgeHTML(PID); }
  finally { C.issueRows = realIssueRows; C.rankIssueRows = realRank; }
};

// ═════════════════════════════════════════════════════════════════════════════
// 1 · The chip is the strongest bucket that has rows — and only that
// ═════════════════════════════════════════════════════════════════════════════
const R_CON = stubRow("lower_taxes", "Lower Taxes", "contradicts");
const R_MIX = stubRow("healthcare", "Health Care", "mixed");
const R_OK = stubRow("border_security", "Border Security", "consistent");
const R_THIN = stubRow("energy", "Energy", "limited");

const sharp = withRows([R_CON, R_MIX, R_OK, R_THIN]);
has(sharp, ">Contradicted<", "strongest: a record with a contradicted issue does not lead with it");
has(sharp, 'data-pdxwa-eye="contradicts"', "strongest: the chip does not say which bucket it came from");

// THE REPORTED CASE. Nothing contradicted, four mixed. The chip must be Mixed —
// this is the exact shape that was announcing itself as the hard negative.
const mixedOnly = withRows([R_MIX, R_OK, R_OK, R_THIN]);
has(mixedOnly, ">Mixed<",
  "strongest: a record whose sharpest formal result is Mixed is not called Mixed");
hasnt(mixedOnly, "Contradicted",
  "strongest: a Mixed record is presented in the Contradicted bucket's words — the exact drift this\n" +
  "    chip was rewritten to end");
hasnt(mixedOnly, "Says One Thing",
  "strongest: the hard-negative receipt vocabulary is back on a record with no contradiction in its\n" +
  "    index, which is what made the chip and the profile disagree");
eq(withRows([R_OK, R_OK]).includes(">Backed up<"), true,
  "strongest: a clean record is not named with the index's word for a clean record");

// An empty bucket ABOVE never promotes itself: zero contradicted is zero, not a
// reason to print Contradicted, and not a reason to skip Mixed.
hasnt(withRows([R_MIX]), "Contradicted", "strongest: an empty bucket above the live one still supplies the word");

// ═════════════════════════════════════════════════════════════════════════════
// 2 · Coverage is not a result, and silence is not a verdict
// ═════════════════════════════════════════════════════════════════════════════
// "Not enough record yet" is coverage. PDXCoverage already has a chip that says
// exactly that, and it is the honest one for this row — so the index stands down
// rather than printing a fifth word for a fourth bucket.
eq(withRows([R_THIN, R_THIN]), "",
  "coverage: a record with nothing but 'not enough record yet' rows is given a result chip, which\n" +
  "    turns our own coverage gap into a finding about them");
eq(WA.searchBadgeHTML("nobody_at_all"), "",
  "coverage: a politician with no index at all still gets a chip");
eq(WA.searchBadgeHTML(""), "", "coverage: an empty id produces a chip");
eq(WA.searchBadgeHTML(null), "", "coverage: a null id produces a chip");

// ═════════════════════════════════════════════════════════════════════════════
// 3 · One vocabulary, borrowed and never restated
// ═════════════════════════════════════════════════════════════════════════════
// Every word and every colour the chip can print has to come from OUTCOMES. If
// this drifts, search and the profile are two surfaces naming the same result
// two different ways, which is the whole bug.
for (const o of WA.OUTCOMES) {
  if (o.secondary) continue;
  const chip = withRows([stubRow("lower_taxes", "Lower Taxes", o.token)]);
  has(chip, ">" + o.short + "<", `vocabulary: the "${o.token}" chip does not print the index's short name`);
  has(chip, "--pdxwa-col:" + o.col, `vocabulary: the "${o.token}" chip does not carry the index's colour`);
  has(chip, o.sub, `vocabulary: the "${o.token}" chip does not explain the bucket it names`);
}
// The counts ride in the tooltip, not on the row: the chip is one word, and a
// second number beside a name in a search list is a scoreboard nobody asked for.
const counted = withRows([R_MIX, R_MIX, R_OK, R_THIN]);
has(counted, "2 issues of 4 read Mixed",
  "vocabulary: the chip does not say how much of the index it is speaking for");
const visible = counted.replace(/<[^>]*>/g, "");
eq(visible.trim(), "Mixed", "vocabulary: the chip prints more than the bucket's own word on the row itself");
eq((counted.match(/%/g) || []).length, 0,
  "vocabulary: the chip prints a percentage — it names where the record's sharpest result was filed,\n" +
  "    not how big it is, and a second score in search is a second scoreboard");

// The chip is a chip. A search row is already a button, and a control inside a
// control is a tap that does two things.
hasnt(sharp, "<button", "shape: the chip is a control nested inside the search row's own button");
hasnt(sharp, "href=", "shape: the chip is a link inside the row's button");

// ═════════════════════════════════════════════════════════════════════════════
// 4 · The eye reads the index FIRST, and keeps its honest fallbacks
// ═════════════════════════════════════════════════════════════════════════════
// The order is the contract: the index is the meaning; the curated receipt covers
// people the formal index cannot reach; coverage catches everyone else so a person
// we know but have not documented reads as "not yet documented" instead of as
// silence. Checked against the source because polItem() is private to the eye's
// IIFE and needs the whole search surface mounted to call.
const eye = read("all-seeing-eye.js");
const iIndex = eye.indexOf("PDXWordAction.searchBadgeHTML");
const iReceipt = eye.indexOf("PDXReceipts.rowBadge");
const iCoverage = eye.indexOf("PDXCoverage.badgeHTML");
ok(iIndex !== -1, "eye: the search row never asks the issue index for its chip");
ok(iReceipt !== -1, "eye: the curated receipt fallback was removed — a politician with no formal index\n" +
  "    loses a badge they had a real answer for");
ok(iCoverage !== -1, "eye: the coverage fallback was removed, so an undocumented official reads as silence");
ok(iIndex < iReceipt, "eye: the receipt verdict is consulted before the issue index, so the chip can still\n" +
  "    announce a hard negative that the profile it links to does not report");
ok(iReceipt < iCoverage, "eye: coverage outranks a real receipt verdict");

// ═════════════════════════════════════════════════════════════════════════════
// 5 · The chip agrees with the index it was read from — on real data
// ═════════════════════════════════════════════════════════════════════════════
// No stubs from here down. Whatever the seeded record says for this figure, the
// chip and the index block have to say the SAME thing about it, because they are
// now the same read. This is the assertion that survives a scoring change.
const realChip = WA.searchBadgeHTML(PID);
const realIndex = WA.headlineHtml(PID, ctx.PROFILES[PID]) || "";
if (realChip) {
  const tok = (realChip.match(/data-pdxwa-eye="([a-z]+)"/) || [])[1];
  const o = WA.outcomeFor(tok);
  ok(!!o, "agreement: the chip names a bucket that is not in the published vocabulary");
  ok(o && !o.secondary, "agreement: the chip is reporting the coverage bucket as a result");
  // The bucket the chip claims must be a bucket the index actually filed rows in.
  ok(new RegExp('data-pdxwa-seg="' + tok + '"[\\s\\S]{0,240}?pdxwa-oc-tab-n">[1-9]').test(realIndex) ||
     realIndex.indexOf('data-pdxwa-oc-panel="' + tok + '"') !== -1,
     "agreement: the chip names a bucket the index shows as empty");
} else {
  ok(true, "agreement: this fixture has no index chip, so there is nothing to disagree with");
}

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ search badge: ${failures.length} failed, ${passed} passed\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log(`✓ search badge: all ${passed} assertions passed — one chip, one meaning, the index's own words`);
