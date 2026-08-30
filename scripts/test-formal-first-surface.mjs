#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-formal-first-surface.mjs — silence is not "no record", on the surfaces
// that most people actually see
// ─────────────────────────────────────────────────────────────────────────────
// Three shipped changes, one premise. The premise: a member can have sixty-four
// issues of roll-call record and seven documented stance cards, and every surface
// we built reads the seven. Browse called that person undocumented. The profile
// face offered a control labelled after stances. The word we used for "we have
// not mapped enough of this yet" was a word about THEIR record being thin.
//
//   PHASE 0 — the overlay is not named after stances any more, and the coverage
//             token's short noun no longer makes a claim about the subject.
//   PHASE 1 — the browse/search chip falls through to the size of the formal
//             record instead of to "Still documenting", and only says nothing
//             when there is genuinely nothing on file.
//   PHASE 2 — the formal pattern atlas mounts on the profile FACE behind a depth
//             gate, with per-mount view state so the face and the overlay can be
//             alive at the same time without sharing a filter or an element id.
//
// And one fence around all three: none of it is a second percentage. The record
// chip counts, the atlas ranks ordinally, and Direction Match is byte-identical
// with the whole formal-first surface rendered or not.
//
//   node scripts/test-formal-first-surface.mjs
//
// Real shipped modules in a node:vm sandbox, real profile data, votes seeded the
// way a completed /api/voting-record fetch leaves the cache.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// coverage.js is on this list and on almost no other engine harness's: phase 1 is
// defined against what coverage USED to answer on these rows, and asserting the
// new chip without the old one in the sandbox would only prove the new chip exists.
const FILES = [
  "cmp-data.js",
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  "stance-helpers.js",
  "alignment-tool.js",
  "acct-spotlight-data.js",
  "say-vs-do.js",
  "exec-action-data.js",
  "exec-record.js",
  "exec-record-ui.js",
  "consistency.js",
  "voting-record.js",
  "word-action.js",
  "coverage.js",
  "profile-spine.js",
  "profiles-full.js",
];
const SRC = FILES.map((f) => [f, R(f)]);
function boot() {
  const win = makeSandbox();
  const sandbox = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of SRC) vm.runInContext(src, sandbox, { filename: f });
  win.PROFILES = win.CMP_DATA;
  return win;
}

const PF_RAW = R("profiles-full.js");
const EYE_RAW = R("all-seeing-eye.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const hasI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) >= 0,
    `${msg} — "${needle}" missing`);
const lacksI = (hay, needle, msg) =>
  ok(String(hay).toLowerCase().indexOf(String(needle).toLowerCase()) < 0,
    `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
// A fixture that no longer offers a case is a silent pass, so the probes that
// establish one are fatal rather than counted.
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ formal-first surface: ${msg}`);
  process.exit(1);
};

// ── The fixture ──────────────────────────────────────────────────────────────
// DEEP  — a sitting senator with documented stance cards AND a wide roll-call
//         record: the seven-vs-sixty-four class this whole migration is about.
// QUIET — a member with a real formal record and NO documented stance at all.
//         Browse used to publish this person as "not yet documented".
// COLD  — the same QUIET member, no votes fetched. Nothing on file is still
//         nothing on file, and the chip has to stay quiet there.
const DEEP = "schumer";
const QUIET = "doug_mastriano";

const probe = boot();
must(probe.PDXConsistency && probe.PDXConsistency.formalPatternIndex,
  "PDXConsistency.formalPatternIndex is not exposed");
must(probe.PDXWordAction && typeof probe.PDXWordAction.searchBadgeHTML === "function",
  "PDXWordAction.searchBadgeHTML is gone");
must(typeof probe.PDXWordAction.recordBadgeHTML === "function" &&
     typeof probe.PDXWordAction.recordDepth === "function",
  "word-action.js no longer publishes recordBadgeHTML / recordDepth");
must(probe.PDXCoverage && typeof probe.PDXCoverage.badgeHTML === "function",
  "coverage.js no longer publishes badgeHTML — the fallback under test cannot be compared");
must(probe.CMP_DATA[DEEP] && probe.CMP_DATA[QUIET],
  "the fixture subjects are not in the bundled roster");
must((probe._resolveStanceList(QUIET, probe.CMP_DATA[QUIET]) || []).length === 0,
  `${QUIET} now has documented stances — the no-word-ledger case needs a different subject`);

const stanceKeys = new Set(
  (probe._resolveStanceList(DEEP, probe.CMP_DATA[DEEP]) || [])
    .map((s) => s && s.issueKey).filter(Boolean));
const ISSUE_KEYS = Object.keys(probe.ISSUE_MAP || {}).filter((k) => !/_balance$/.test(k));
const SILENT = ISSUE_KEYS.filter((k) => !stanceKeys.has(k));
const SPOKEN = ISSUE_KEYS.filter((k) => stanceKeys.has(k) && !(probe._PDX_RD_NO_POLE || {})[k]);
must(SILENT.length >= 24 && SPOKEN.length >= 2,
  "the fixture roster no longer offers both silent and spoken-for issues");

const vote = (n, issueKey, position) => ({
  kind: "vote", rollcallId: 700 + n, measureId: 800 + n, number: "S. " + (100 + n),
  date: "2025-0" + ((n % 9) + 1) + "-11", action: "On Passage", position: position,
  isProcedural: false, title: "Measure " + n,
  source: { url: "https://www.congress.gov/roll-call-vote/" + (700 + n), label: "Congress.gov" },
  issues: [{ issueKey: issueKey, weight: 100, isPrimary: true, supportMeaning: "yea_supports" }],
});
// A deep one-way run on twenty-four issues, two of which they have also written
// a position on — so the atlas has both a "pattern only" pile and a "stated" pile
// and the two views under test are each non-empty.
function seedFor(keys) {
  const out = [];
  let n = 0;
  keys.forEach((k) => { for (let i = 0; i < 12; i++) out.push(vote(n++, k, "yea")); });
  return out;
}
const DEEP_KEYS = SILENT.slice(0, 22).concat(SPOKEN.slice(0, 2));
const QUIET_KEYS = SILENT.slice(0, 20);

const A = boot();
A.PDXVotingRecord.noteMember(DEEP, seedFor(DEEP_KEYS));
A.PDXVotingRecord.noteMember(QUIET, seedFor(QUIET_KEYS));
// COLD: identical build, no vote pack anywhere.
const COLD = boot();

const WA = A.PDXWordAction;
const FPI = A.PDXConsistency.formalPatternIndex;
const ROWS = FPI.rows(DEEP);
must(ROWS.length >= 20, `the seeded fixture produced only ${ROWS.length} atlas rows`);
must(ROWS.some((x) => x.said) && ROWS.some((x) => !x.said),
  "the seeded fixture no longer produces both stated and pattern-only rows");

const countRows = (html) => (html.match(/class="pdxfpi-row/g) || []).length;
const text = (h) => String(h || "")
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · phase 0 — the overlay is not a stance appendix");
// ═════════════════════════════════════════════════════════════════════════════
// The overlay's contents were always formal-primary: the atlas leads, the curated
// cards follow. The NAME said otherwise, and a reader deciding whether to tap
// reads the name. Every string on the way in, and the dialog itself, is renamed
// to the thing behind the door — the record on the issues.
{
  const cta = A._pdxStanceRecordCta(DEEP, A.CMP_DATA[DEEP]);
  const mini = A._pdxStanceRecordMiniLink(DEEP, A.CMP_DATA[DEEP]);
  const body = A._pdxStanceRecordBody(DEEP, A.CMP_DATA[DEEP]);
  must(cta && mini && body, "the record overlay's entry points no longer render");

  for (const [name, html] of [["the profile CTA", cta], ["the in-context mini link", mini],
                              ["the overlay body", body]]) {
    lacksI(html, "Full Stance Record",
      `${name} still calls the overlay a stance record — the contents are formal-primary`);
    lacksI(html, "stance record",
      `${name} still says "stance record" somewhere in its visible markup`);
  }
  hasI(cta, "record on the issues", "the CTA names the record, not the stances");
  hasI(mini, "on the record", "the mini link names the record");

  // The dialog shell and the rail entry — the two places a screen-reader user is
  // told what they are opening.
  has(PF_RAW, 'aria-label="Full record on the issues for',
    "the overlay dialog still announces itself under the retired name");
  has(PF_RAW, '📑 Full Record on the Issues',
    "the overlay eyebrow no longer carries the new name");
  ok(!/aria-label="Open the full stance record/i.test(PF_RAW),
    "an aria-label still opens a 'full stance record'");
  ok(!/>\s*View the Full Stance Record\s*</.test(PF_RAW),
    "the CTA title string is still the retired name");

  // The name is one name. A second wording on a sibling surface is how a rename
  // half-lands and then rots.
  for (const f of ["stance-helpers.js", "evidence-locker.js", "index.html"]) {
    const src = R(f);
    const visible = src
      .replace(/\/\/[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
    lacksI(visible, "Full Stance Record",
      `${f} still ships the retired overlay name outside a comment`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · phase 0 — the coverage token stops describing their record");
// ═════════════════════════════════════════════════════════════════════════════
// `limited` fires when WE have not mapped enough to test what they said. Its long
// label prints with a subtitle that says so. Its SHORT noun prints alone — on the
// composition strip, the bucket switcher, the dossier header, the profile rail —
// and there "Thin record" is a claim about the subject built out of a shortfall
// in our own inventory. Same falsehood test-thin-record-honesty already refuses
// on the row face.
{
  const lim = WA.outcomeFor("limited");
  must(lim, "the `limited` outcome token is gone");
  eq(lim.short, "Not enough on file",
    "the coverage token's short noun is not the shipped word");
  ok(!/thin/i.test(lim.short),
    "the short noun is a 'thin' word again — it travels with no subtitle to correct it");
  ok(lim.secondary === true,
    "`limited` is no longer flagged secondary — coverage would be ranked as a result");
  hasI(lim.sub, "Coverage, not a result",
    "the token's subtitle no longer says which of the two it is");

  // No shipped surface may print the retired noun as a rendered word. Comments are
  // allowed to remember it; markup is not.
  const UI = ["word-action.js", "consistency.js", "profiles-full.js", "stance-helpers.js",
              "say-vs-do.js", "issue-view.js", "index.html"];
  for (const f of UI) {
    const src = R(f)
      .replace(/\/\/[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
    ok(!/>\s*Thin record\s*</.test(src) && !/["'`]Thin record["'`]/.test(src),
      `${f} still renders "Thin record" as a coverage label`);
  }

  // The index's own glossary and its low-count summary line had to move with it.
  const CJS = R("consistency.js");
  lacks(CJS, "still a thin record",
    "the mapped-count summary still calls a short mapping list a thin record");
  has(CJS, "not enough mapped yet to read a pattern",
    "the mapped-count summary no longer says whose shortfall it is");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · phase 1 — a formal record is not an absence of one");
// ═════════════════════════════════════════════════════════════════════════════
// The headline case: a member with a real roll-call record and not one documented
// stance. The issue index has no result to name, because nothing of theirs was
// ever quotable — and that used to fall all the way through to coverage, which
// answers a different question and answered it with "Not yet documented".
{
  const depth = WA.recordDepth(QUIET);
  must(depth && depth.issues >= 12,
    `the QUIET fixture only produced ${depth && depth.issues} issues of formal record`);
  eq(depth.issues, FPI.count(QUIET),
    "recordDepth and the atlas disagree about how many issues are on file");

  const chip = WA.searchBadgeHTML(QUIET);
  ok(!!chip, "a member with a deep formal record and no stance ledger still gets no browse chip");
  has(chip, 'data-pdxwa-eye="record"', "the fallback chip is not the record chip");
  has(chip, "🏛", "the record chip does not carry the formal-lane mark");
  hasI(chip, "on record", "the record chip does not say what it is counting");
  has(chip, String(depth.issues), "the record chip does not print the inventory count");

  // What the chip is NOT. Each of these is a different product claiming a
  // different thing, and the whole point of this fallback is that we can say
  // "there is a record here" without saying any of them.
  ok(!/\d\s*%/.test(chip), "the record chip prints a percentage — that is a second score");
  lacksI(chip, "Accountable", "the record chip grades them");
  lacksI(chip, "Democrat", "the record chip names a party");
  lacksI(chip, "Republican", "the record chip names a party");
  lacksI(chip, "Still documenting", "the record chip is still the coverage phrase");
  lacksI(chip, "Not yet documented", "the record chip is still the coverage phrase");
  // Direction Match may only appear as the disclaimer that there ISN'T one.
  ok(!/Direction Match/.test(chip) || /no Direction Match score/.test(chip),
    "the record chip mentions Direction Match as though something had been tested");
  hasI(chip, "size of the record", "the chip's tooltip no longer says what kind of fact it is");

  // The counterfactual, in the same sandbox. This block used to end by asserting
  // that coverage STILL said "Not yet documented" here — the phrase the record
  // chip was built to outrank. Outranking it was only ever half the repair: the
  // chip fixed the browse row, and left the sentence itself intact for every
  // other surface that asks coverage the same question. coverage.js now counts
  // the formal lane, so the phrase is not outranked on this member, it is not
  // produced. Twenty issues of roll call is a record; the thing we are short of
  // is a quote, and that is our gap to name.
  //
  // The old formula is kept here as the demonstration, so the regression stays
  // reproducible: score the same member on words alone and the sentence returns.
  const cv = A.PDXCoverage.assess(QUIET);
  const wordsOnly = cv.stances + cv.spotlight + cv.promises;
  must(wordsOnly === 0 && cv.formal >= 12,
    "the QUIET fixture is no longer words-empty and formally deep — the regression cannot be demonstrated");
  ok(cv.records === cv.formal && cv.key === "rich",
    "coverage still scores a twenty-issue roll-call record as no record at all");
  const cov = A.PDXCoverage.badgeHTML(QUIET) || "";
  ok(!/Not yet documented|Still documenting/.test(text(cov)),
    "coverage still calls a member with a deep formal record undocumented — " +
    "the phrase the record chip outranks is still being produced underneath it");
  ok(A.PDXCoverage.note(QUIET, "They") === "",
    "the coverage NOTE still describes this record as thin or absent, on every surface that asks for a sentence rather than a chip");
  has(R("coverage.js"), "THE FORMAL LANE COUNTS",
    "coverage.js does not record why the formal lane is in the count, so it can be dropped again");
  ok(/formal:\s*formal/.test(R("coverage.js")),
    "assess() no longer reports the formal count as its own field — a pattern folded into 'records' with no way to read it back is a stated position waiting to happen");

  // COLD proves it is the record doing the work and not a blanket suppression:
  // same member, no votes fetched, and the sentence is correct and comes back.
  ok(/Not yet documented/.test(text(COLD.PDXCoverage.badgeHTML(QUIET) || "")),
    "with nothing on file at all coverage has gone quiet too — 'not yet documented' is true there and must still be said");

  // Fails closed. No formal inventory, no chip: the fallback is a record chip,
  // not a participation trophy.
  eq(COLD.PDXWordAction.recordDepth(QUIET).issues, 0, "the COLD fixture is not actually cold");
  eq(COLD.PDXWordAction.searchBadgeHTML(QUIET), "",
    "a member with nothing on file now gets a record chip anyway");
  eq(COLD.PDXWordAction.recordBadgeHTML(QUIET), "",
    "recordBadgeHTML invents a chip out of an empty inventory");

  // A real index result still wins. The record chip is the fallback, never the
  // headline — a person whose word WAS tested reads as the test, not as inventory.
  const RESULT_PID = Object.keys(A.CMP_DATA).filter((id) => {
    const b = A.PDXWordAction.searchBadgeHTML(id);
    return b && b.indexOf('data-pdxwa-eye="record"') < 0;
  })[0];
  must(RESULT_PID, "no member in the roster produces an issue-index result chip any more");
  const rb = A.PDXWordAction.searchBadgeHTML(RESULT_PID);
  hasI(rb, "Issue index:", "a tested member's chip is no longer the index result");
  lacks(rb, 'data-pdxwa-eye="record"',
    "the inventory fallback outranked a real result — the chip order is inverted");

  // And the eye's own chain: formal before public before coverage.
  const iIndex = EYE_RAW.indexOf("PDXWordAction.searchBadgeHTML");
  const iReceipt = EYE_RAW.indexOf("PDXReceipts.rowBadge");
  const iCoverage = EYE_RAW.indexOf("PDXCoverage.badgeHTML");
  ok(iIndex > 0 && iIndex < iReceipt && iReceipt < iCoverage,
    "the browse row's badge chain is no longer index → receipts → coverage");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · phase 2 — the atlas mounts on the profile face");
// ═════════════════════════════════════════════════════════════════════════════
// It shipped inside the overlay, behind a control that was named after stances.
// Nobody who did not already know it existed was going to find it. It now renders
// on the profile body itself for anyone with enough record to warrant a long list.
{
  const BODY_AT = PF_RAW.indexOf("const _profileBody = ");
  must(BODY_AT !== -1, "the profile body template moved");
  const BODY = PF_RAW.slice(BODY_AT);
  must(BODY.length > 5000, "the isolated profile body is implausibly short");

  has(BODY, "pdxfpi-face", "the atlas does not mount on the profile body at all");
  has(BODY, "mount: 'face'", "the face mount does not pass its own mount key");
  ok(/FACE_MIN\s*=\s*(\d+)/.test(BODY), "the face mount has no depth gate");
  const gate = Number((BODY.match(/FACE_MIN\s*=\s*(\d+)/) || [])[1]);
  ok(gate >= 2, `the face depth gate is implausibly low (${gate})`);
  ok(/n\s*<\s*FACE_MIN/.test(BODY), "the depth gate is declared but never enforced");
  // PHASE 3 REORDERED THE READ ON PURPOSE, AND THE IA MERGE REORDERED IT AGAIN.
  // The atlas used to sit BELOW the word-versus-action section, as a discovery
  // surface hanging off the score. The record-first pass inverted that. This pass
  // finished the job: a flat, alphabetised, every-issue-on-the-formal-record list
  // is not a browse surface, it is a wall, and it was standing directly between a
  // two-chip summary and the topic tree built to do the same job properly. The
  // tree is the gateway now. The flat list survives as a COLLAPSED control under
  // it, for the reader who wants one long sortable column — the sort, the lane
  // wall, the per-mount filters and the dossier doors are all unchanged.
  //
  // Read position, not source position. The spine assembles the body by stage, so
  // a mount can move up the page without moving up the file, and that is exactly
  // what happened to the tree. Comparing raw string offsets here would now pin the
  // file layout while the page reordered underneath it.
  const SPINE = probe.PDXProfileSpine;
  must(!!SPINE, "the profile spine did not boot, so reading order cannot be resolved");
  const rank = (needle) => {
    const at = BODY.indexOf(needle);
    if (at === -1) return null;
    const tags = BODY.slice(0, at).match(/<!--PDXSP:([a-z0-9:_-]+)-->/g) || [];
    const last = tags.length ? tags[tags.length - 1].replace(/<!--PDXSP:|-->/g, "") : "identity";
    const si = SPINE.STAGE_KEYS.indexOf(last);
    return si === -1 ? null : si * 1e9 + at;
  };
  const iWA = rank("PDXWordAction.sectionHtml");
  const iFace = rank("pdxfpi-face");
  const iStrip = rank("pdxso-face");
  const iTree = rank("PDXStanceTree.sectionHtml(id)");
  ok(iStrip !== null, "the standout strip does not mount on the profile body at all");
  ok(iTree !== null, "the topic tree does not mount on the profile body at all");
  ok(iFace !== null, "the atlas does not mount on the profile body at all");
  ok(iWA !== null,
    "the Direction Match section stopped mounting on the profile body — demoted is not deleted");
  ok(iStrip < iTree,
    "the standout strip reads below the topic tree — the two-chip summary is the door into the browse, not a footnote to it");
  ok(iTree < iFace,
    "the flat formal list still reads above the topic tree — that is the parallel wall, and the tree is the gateway");
  ok(iFace < iWA,
    "the atlas reads below the Direction Match section — the record-first read puts the ledger first");
  // Collapsed, and honest about it. A <details> that ships open is the wall again
  // with a hinge drawn on it.
  const flat = BODY.slice(BODY.indexOf("<details id=\"pdxsec-formalatlas\""));
  has(BODY, "<details id=\"pdxsec-formalatlas\"",
    "the flat formal list is not a disclosure — the default profile prints every issue on the record above the fold");
  ok(!/^<details id="pdxsec-formalatlas"[^>]*\sopen[\s>]/.test(flat),
    "the flat formal list ships open, which is the flat wall with extra markup");
  has(flat.slice(0, 700), "View the flat formal list",
    "the control does not say what opening it shows");
  has(flat.slice(0, 700), "Every issue on the formal record",
    "the control dropped the label the old wall carried, so the rows it holds are now unfindable by name");
  // AND THE THING IT NOW SITS UNDER IS ALSO SHUT. Folding the flat wall into a
  // <details> only buys a short first screen if the gateway above it is short
  // too: a tree that auto-expands a branch puts one topic's issue rows between
  // the summary and this control, which is the wall's own failure at half length.
  const TREE_SRC = R("stance-tree.js");
  ok(!/defaultOpenKey/.test(TREE_SRC),
    "the topic tree auto-expands a branch again, so the explore stage opens on an issue list rather than on the map of topics");
  const openSrc = (TREE_SRC.match(/openKeys\s*=[^;]*/g) || []);
  eq(openSrc.length, 1,
    "the topic tree assigns its open-branch list more than once — only opts.open, the reader's own state, may expand anything");
  has(openSrc[0], "opts.open",
    "the tree's open branches no longer come from what the reader had open");
  has(TREE_SRC, 'data-pdxtree-open="' + "' + (open ? '1' : '0') + '",
    "a branch's open state stopped being the flag the caller passed it");

  // The rendered face index itself.
  const face = FPI.html(DEEP, { sort: "strength", mount: "face" });
  const overlay = FPI.html(DEEP, { sort: "strength" });
  must(face && overlay, "one of the two mounts renders nothing");
  eq(countRows(face), ROWS.length, "the face index does not show the whole atlas");
  has(face, 'data-pdxfpi-mount="face"', "the face host does not carry its mount key");
  has(overlay, 'data-pdxfpi-mount="default"', "the overlay host lost its mount key");
  has(face, FPI.WALL, "the face index drops the formal/public lane wall");
  hasI(face, "Pattern only", "the face index loses the pattern-only view");

  // Two mounts, two sets of element ids. _fpiRowId feeds data-pdxst-origin, so an
  // unkeyed id does not merely duplicate an id — it sends every tap inside the
  // overlay back to the copy of that row on the face underneath it.
  const faceIds = (face.match(/id="pdxfpi-row-[^"]*"/g) || []);
  const overlayIds = (overlay.match(/id="pdxfpi-row-[^"]*"/g) || []);
  must(faceIds.length && overlayIds.length, "the atlas rows no longer carry ids");
  eq(faceIds.filter((x) => overlayIds.indexOf(x) >= 0).length, 0,
    "the face and the overlay emit colliding row ids");
  ok(faceIds.every((x) => x.indexOf('id="pdxfpi-row-face-') === 0),
    "the face's row ids are not namespaced by mount");
  ok(overlayIds.every((x) => x.indexOf('id="pdxfpi-row-face-') !== 0),
    "the overlay's row ids picked up the face's namespace");
  const faceOrigins = (face.match(/data-pdxst-origin="[^"]*"/g) || []);
  ok(faceOrigins.length > 0 &&
     faceOrigins.every((x) => x.indexOf('data-pdxst-origin="pdxfpi-row-face-') === 0),
    "the face's dossier return targets point at the other mount's rows");

  // Two mounts, two filters. A reader who narrows the face to "Pattern only" has
  // not narrowed the overlay, and vice versa.
  const statedN = ROWS.filter((x) => x.said).length;
  const patternN = ROWS.length - statedN;
  must(statedN > 0 && patternN > 0 && statedN !== ROWS.length,
    "the fixture cannot distinguish the two views");
  FPI.html(DEEP, { mount: "face", view: "pattern" });
  eq(countRows(FPI.html(DEEP, { mount: "face" })), patternN,
    "the face forgot the view it was set to");
  eq(countRows(FPI.html(DEEP, {})), ROWS.length,
    "setting a view on the face narrowed the overlay too — the mounts share one filter");
  FPI.html(DEEP, { view: "stated" });
  eq(countRows(FPI.html(DEEP, {})), statedN, "the overlay forgot the view it was set to");
  eq(countRows(FPI.html(DEEP, { mount: "face" })), patternN,
    "setting a view on the overlay overwrote the face's — the mounts share one filter");
  // Back to a clean slate for anything below.
  FPI.html(DEEP, { view: "all" });
  FPI.html(DEEP, { mount: "face", view: "all" });

  // The gate does its job: a member with a shallow inventory gets no third short
  // list on their face.
  ok(COLD.PDXConsistency.formalPatternIndex.count(DEEP) < gate,
    "the COLD fixture clears the face depth gate — the gate cannot be shown to bite");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · none of it is a second score");
// ═════════════════════════════════════════════════════════════════════════════
// The one sanctioned percentage in the product is Direction Match. This phase adds
// a chip, an atlas and four renames, and not one of them is allowed to publish a
// competing figure or to move the sanctioned one by a single point.
{
  const face = FPI.html(DEEP, { sort: "strength", mount: "face" });
  const chip = WA.searchBadgeHTML(QUIET);
  for (const [name, html] of [["the face atlas", face], ["the record chip", chip]]) {
    ok(!/\d\s*%/.test(html), `${name} prints a percentage`);
    ok(!/advanceScore|advance\s*\/\s*\(/.test(html), `${name} publishes an advance ratio`);
    lacksI(html, "out of 100", `${name} publishes a hundred-point figure`);
  }

  // Direction Match, with the formal-first surface rendered and with it never
  // touched. Same sandbox shape, same seeds — the figure has to be identical.
  const B = boot();
  B.PDXVotingRecord.noteMember(DEEP, seedFor(DEEP_KEYS));
  const before = JSON.stringify(B.PDXWordAction.read(DEEP));
  // …now render every new surface at it.
  B.PDXConsistency.formalPatternIndex.html(DEEP, { mount: "face" });
  B.PDXWordAction.searchBadgeHTML(DEEP);
  B.PDXWordAction.recordDepth(DEEP);
  const after = JSON.stringify(B.PDXWordAction.read(DEEP));
  eq(after, before, "rendering the formal-first surfaces moved Direction Match");

  const A2 = boot();
  A2.PDXVotingRecord.noteMember(DEEP, seedFor(DEEP_KEYS));
  eq(JSON.stringify(A2.PDXWordAction.read(DEEP)), before,
    "Direction Match is not deterministic across identical seeds");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the executive lane's summary is not a roll-call wall in disguise");
// ═════════════════════════════════════════════════════════════════════════════
// The formal-first pass gave members a summary at the top and folded the flat atlas
// under the tree. The executive lane got the reorder and nothing to put in the slot,
// because the pattern engine declines that lane by design. The block that fills it
// now has one job and a short list of things it may not become: a second atlas, a
// fabricated roll-call read, or a place where public-lane tallies are printed as if
// they were formal.
{
  const CJS = R("consistency.js");
  const from = CJS.indexOf("✒️ THE COMPACT FORMAL SUMMARY — EXECUTIVE LANE");
  must(from > 0, "the executive formal summary moved — this source slice is stale");
  const XSRC = CJS.slice(from, CJS.indexOf("── THE FILTERS ──", from));
  must(XSRC.length > 2000, "the executive summary slice is too small to be the block");
  // Comments carry the reasoning and name the things the code must not do, so the
  // prohibitions are checked against the CODE with the comments stripped.
  const code = XSRC.replace(/\/\/.*$/gm, "");

  // ── It reads the exec lane, and only the exec lane ────────────────────────
  has(code, "PDXExecRecord", "the executive summary does not read the executive record");
  has(code, "sum.rows", "the executive summary rebuilds the issue universe instead of reading the one pass");
  //   THE ROW ENUMERATOR IS SHARED, BUT IT IS NO LONGER THE UNIVERSE. This block
  // also publishes shape() — the same four facts the top-of-file brief lists for a
  // member (depth, strongest one-sided, ran both ways, the uncharacterised tail) —
  // so an executive file and a member file render ONE brief instead of a pattern
  // list on one and a census on the other.
  //   WHICH ISSUES EXIST IS DECIDED BY THIS LANE, NOT BY THE MEMBER MODEL. It used
  // to enumerate _fpiRows() and keep the rows marked `lane: 'exec'`, which made the
  // letterhead's row list a hostage of a cache the member lane fills: _fpiRows() is
  // memoised per politician and its exec lane is built from the exec action pool,
  // which index.html loads AFTER this file. One early read of a president's rows and
  // the memo held no exec lane at all, so shape() published zero issues, the
  // letterhead fell back to its census-and-a-door, and the mid-page strip mounted
  // with the rows the letterhead had failed to find — with no repaint event on an
  // executive file to recover on. The universe is now `sum.rows`, the same array the
  // strip's own chips are selected from, so the two cannot disagree. The member row
  // is still consulted where it exists, keyed by issue, for the row object the
  // shared chip and refusal builders read; the lane filter lives on that lookup, so
  // no member-lane row can enter under an exec issue's key.
  has(code, "x.row.lane === 'exec'",
    "the exec shape stopped filtering the shared row enumerator to its own lane");
  has(code, "spine[sr.issueKey]",
    "the exec shape no longer keys the member row by the exec lane's own issue — the row set is\n" +
    "    back to being whatever the member-lane memo happened to hold when it was first filled");
  //   WHAT STAYS FORBIDDEN IS THE MEMBER CHARACTERISATION TIER. _stPatternTier()
  // returns null for this lane by design, and a tier taken from it would be a read
  // of roll calls that do not exist. The tier these rows carry comes from the
  // record-direction DISPLAY engine over PDXExecRecord's own acts — the same engine,
  // the same chip and the same "advanced / against" words a member's rows use, with
  // no floor vote invented to stand in for a signature.
  has(code, "_stDisplayTier",
    "the exec shape does not read the shared record-direction display tier");
  ok(!/_stPatternTier|_soPick|formalPatternIndex/.test(code),
    "the executive summary reaches into the member CHARACTERISATION engine — that engine returns null\n" +
    "    for this lane by design, and anything it produced here would be a tier invented for a record\n" +
    "    with no votes");
  ok(!/\bvote|roll[ -]?call/i.test(code),
    "the executive summary borrowed roll-call vocabulary for a lane that casts no votes");
  ok(!/publicTally|_stPublic|receipt/i.test(code),
    "the executive summary reads the public lane — a formal summary padded with public receipts is\n" +
    "    the one thing the exec lane's own thinness caveat exists to prevent");

  // ── It is a summary, not a second atlas ───────────────────────────────────
  has(code, "var _XS_CAP = 2", "the chip cap left the code, so the summary can grow back into a list");
  has(code, "slice(0, _XS_CAP)", "the buckets are no longer sliced to the declared cap");
  ok(!/<details/.test(code), "the executive summary mounts a disclosure — this block is four lines, not a drawer");
  ok(!/pdxsec-formalatlas/.test(code), "the executive summary mounts the flat formal atlas");
  ok(!/pdxfpi/.test(code), "the executive summary renders formal-pattern-index rows");
  // One route out, and it is the gateway — the same destination the shape hero's
  // "Explore all N by topic" button uses, so there is one browse surface, not two.
  has(code, "'pdxsec-stancetree'", "the executive summary's route control does not aim at the topic tree");
  eq((code.match(/pdxsec-stancetree/g) || []).length, 1,
    "the executive summary names the tree anchor more than once — one route, one destination");
  has(R("word-action.js"), "var SHAPE_JUMP = 'pdxsec-stancetree'",
    "the shape hero's route moved, so the two summaries no longer send readers to the same place");

  // ── No second score ───────────────────────────────────────────────────────
  ok(!/'%'|"%"|pct|percent/i.test(code), "the executive summary computes or prints a percentage");
  ok(!/\bscore\b|\brating\b|\bgrade\b/i.test(code.replace(/score:\s*null/g, "")),
    "the executive summary publishes a score, a rating or a grade");
  ok(!/loyalty|\bparty\b|republican|democrat/i.test(code),
    "the executive summary reintroduced party framing on the one lane with no caucus to frame it against");

  // ── Rendered, on the lane's own figure ────────────────────────────────────
  const W = boot();
  const XS = W.PDXConsistency.execRecordSummary;
  const html = XS.html("trump");
  ok(html.length > 0, "the executive summary renders nothing on the executive fixture");
  ok(!/\d\s*%/.test(html), "the executive summary prints a percentage");
  lacksI(html, "out of 100", "the executive summary publishes a hundred-point figure");
  // Rendering it must not move the sanctioned figure.
  const before = JSON.stringify(W.PDXWordAction.read("trump"));
  XS.html("trump"); XS.pick("trump");
  eq(JSON.stringify(W.PDXWordAction.read("trump")), before,
    "rendering the executive formal summary moved Direction Match");
  // …and it must not have opened anything in the gateway below it.
  ok(!/pdxtree-open="1"/.test(html), "the executive summary expands a topic-tree branch");
  // ── The listed rows count acts, and only the acts on file ─────────────────
  // NO FLOOR VOTE IS INVENTED FOR A LANE WITH NO FLOOR. One act is one count, so a
  // row can never report having read more than its own dossier holds, and the tier
  // behind it is a read of that inventory rather than a weighted floor tally.
  const xsh = (typeof XS.shape === "function") ? XS.shape("trump") : null;
  ok(!!(xsh && xsh.issues > 0), "the executive summary publishes no shape for the brief to list");
  if (xsh) {
    for (const row of xsh.tops.concat(xsh.splits)) {
      ok(row.judged > 0, `a listed exec row reports nothing read: ${row.key}`);
      ok(row.judged <= row.held,
        `the exec row for ${row.key} reports ${row.judged} read out of ${row.held} on file`);
      ok(/advanced|against/.test(row.counts || row.sideCounts || ""),
        `the exec row for ${row.key} tallies in some other vocabulary`);
    }
    eq(xsh.issues, xsh.characterised + xsh.tailN,
      "the exec shape drops issues between its buckets and its tail — a row with acts and no side " +
      "must still be counted");
    // ── AND THE ROW SET IS THIS LANE'S OWN LIST ─────────────────────────────
    // The letterhead lists what the mid-page strip selects from, so the two are
    // checked against ONE array: PDXExecRecord's summary rows. If shape() ever
    // enumerates a different universe again — the member-lane memo, filled before
    // the exec pool loads — this is the assertion that reports zero issues on a
    // record with dozens, which is exactly how the empty letterhead shipped.
    const laneKeys = new Set(
      (W.PDXExecRecord.summary("trump", { allTerms: true }).rows || [])
        .map((r) => r && r.issueKey).filter(Boolean));
    ok(laneKeys.size > 0, "the executive fixture holds no issues — this check is vacuous");
    eq(xsh.issues, laneKeys.size,
      "the exec shape counts a different set of issues than the executive record does");
    for (const row of xsh.tops.concat(xsh.splits)) {
      ok(laneKeys.has(row.key),
        `the exec shape lists ${row.key}, which the executive record's own row list does not hold`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the stance section stops calling a deep record an absent one");
// ═════════════════════════════════════════════════════════════════════════════
// Key Issue Stances falls back to the curated key-issue list when no sourced
// position is on file, and every one of those placeholder rows read the same
// way: pill "No Clear Position", line "A detailed position is being researched",
// note "Detailed stances for this official are still being documented". On a
// candidate that is the truth. On QUIET — twenty issues of roll call, printed
// further down this same profile — it is four cards of nothing over a full
// record, and "no clear position" is a claim about their clarity rather than
// about our sourcing.
//
// WHAT IT MAY NOT DO. The curated key-issue list is free text, so no card here
// can be bound to an issue key and no card may therefore carry a per-issue
// pattern — that would print one issue's votes under another issue's heading.
// The record is described at section level, in depth and characterisation only,
// and the row says the one thing it can say honestly: we have no quote.
{
  // PDXStance lives inline in index.html, so it is stubbed — faithfully enough
  // for the pill markup under test, and no further. The assertion is about which
  // WORD this module chooses, not about the four-state vocabulary itself.
  const stubStance = (win) => {
    win.PDXStance = {
      isTopPriority: () => false,
      resolveStance: () => "none",
      stanceState: () => ({ cls: "none", label: "No Clear Position" }),
      stancePill: () => '<span class="pdxis-stance pdxis-stance-none">' +
        '<span class="pdxis-stance-k">Stance</span>No Clear Position</span>',
    };
  };
  stubStance(A); stubStance(COLD);

  const qp = A.CMP_DATA[QUIET];
  must((A._pdxKeyIssues(qp) || []).length > 0,
    "the QUIET fixture has no curated key issues — the derived-card branch is unreachable");
  const deep = text(A._renderIssueStances(QUIET, qp) || "");
  must(deep.length > 0, "the stance section renders nothing on the QUIET fixture");

  ok(/20 issues of votes and formal actions/.test(deep),
    "the derived stance section never says how much formal record is on file — the reader is left with four blanks over twenty issues");
  ok(!/still being documented/i.test(deep),
    "the section still says positions are 'still being documented' with the record already on the page");
  ok(!/A detailed position is being researched/.test(deep),
    "the placeholder row still reads as though nothing about this person were known");
  ok(!/No Clear Position/.test(deep),
    "the row is still headed 'No Clear Position' — a claim about their clarity, over a record we have simply not quoted");
  ok(/No stance on file/.test(deep),
    "the row does not name the gap as OURS — 'no stance on file' is a fact about our sourcing, which is what this is");
  ok(/our documentation rather than their record/.test(deep),
    "the section note no longer carries the standing disclosure about whose gap this is");

  // The lane wall, on a surface that just started talking about votes.
  ok(/not a stated position/.test(deep) && /not in Direction Match/.test(deep),
    "the section now describes a voting record beside a stance pill without saying that a pattern is neither a stated position nor a scored one");
  ok(!/\d\s*%/.test(deep),
    "a percentage appeared on the stance section — the record is described in counts, never scored here");
  ok(!/(?:votes?|record)[^.]{0,40}\b(?:supports?|opposes?|backs?|favou?rs?)\b/i.test(deep),
    "the copy reads the formal pattern as a support or oppose — that is the stated-position claim this whole pass exists to refuse");

  // The ask changes with the gap. "Several issues still have no record" is the
  // one thing that is not true of this profile.
  ok(!/Several issues still have no record/.test(deep),
    "the contribution cue still asks for a record on a profile with twenty issues of one");
  ok(/stated a position in their own words/.test(deep),
    "the contribution cue does not ask for the thing that is actually missing");

  // COLD: same member, no votes fetched. Nothing on file is nothing on file, and
  // the original wording is correct there and must survive intact.
  const cold = text(COLD._renderIssueStances(QUIET, COLD.CMP_DATA[QUIET]) || "");
  must(cold.length > 0, "the COLD stance section renders nothing — the fallback cannot be compared");
  ok(/A detailed position is being researched/.test(cold) && /still being documented/i.test(cold),
    "with no record on file the original wording is gone — it was correct there, and only there");
  ok(/Several issues still have no record/.test(cold),
    "the record-shaped ask leaked onto a profile that genuinely has no record");
  ok(!/issues of votes and formal actions/.test(cold),
    "the formal sentence rendered over an empty formal file");

  // A DOCUMENTED record is untouched. This is a fallback for the derived branch
  // and must not reach a member whose positions we actually hold.
  const docPid = Object.keys(A.CMP_DATA).find((x) =>
    (A._resolveStanceList(x, A.CMP_DATA[x]) || []).length >= 3);
  must(docPid, "no member in the roster carries three documented stances — the negative case is untestable");
  const doc = text(A._renderIssueStances(docPid, A.CMP_DATA[docPid]) || "");
  ok(!/No stance on file/.test(doc) && !/issues of votes and formal actions/.test(doc),
    "the no-stance wording reached a member whose stances are documented — this is a fallback, not a replacement");

  // The empty state one level up: no stances AND no curated issues, on a member
  // whose promise ledger is empty (which is what _pdxRecordDepth reads) and whose
  // formal file is not. This is the branch that used to print "Stated positions
  // being documented" over a full roll-call record.
  A._pdxRecordDepth = (d) => (d && d.__thin ? "none" : "full");
  const bare = Object.assign({}, qp, { __thin: true, issues: [], keyIssues: [], promises: [], score: null });
  A.CMP_DATA.__bare = bare; A.PROFILES.__bare = bare;
  A.PDXVotingRecord.noteMember("__bare", seedFor(QUIET_KEYS));
  const es = text(A._renderIssueStances("__bare", bare) || "");
  must(es.length > 0, "the no-key-issues empty state does not render — the branch under test is dead");
  ok(/issues of formal record on file/.test(es) && !/Stated positions being documented/.test(es),
    "the empty state still headlines 'stated positions being documented' over a full formal file");
  ok(/gap is in our stance research, not in their record/.test(es),
    "the empty state does not say whose gap this is");
  ok(/does not enter Direction Match/.test(es),
    "the empty state describes a formal record without the lane wall");
  ok(!/\d\s*%/.test(es), "the empty state prints a percentage");
}

// ── Result ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ formal-first surface — ${failures.length} of ${passed + failures.length} assertions failed:\n`);
  failures.forEach((f) => console.error("  · " + f));
  process.exit(1);
}
console.log(`\n✓ formal-first surface — ${passed} assertions passed\n`);
