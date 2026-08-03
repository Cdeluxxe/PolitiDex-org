#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for the PROFILE SPINE — profile-spine.js + the restaged openModal
// ─────────────────────────────────────────────────────────────────────────────
// The profile modal had strong data and no reading order. Every accountability
// lens the app grew was appended to one ~1,200-line template in build order, so
// money surfaced five times, promises three, votes three, stances four, all
// interleaved. profile-spine.js supplies the missing sequence, and profiles-full.js
// now annotates each block with the stage it belongs to instead of relying on its
// line number.
//
// Five properties carry that change, and every one of them fails QUIETLY — a
// mis-ordered profile still renders, a lost block still leaves a valid page, a
// clipped drawer still opens. So they are tested rather than trusted:
//
//   1. THE ORDER IS THE PRODUCT. STAGES must match the spine the profile promises
//      (identity → short version → signature issues → tension → record → receipts
//      → money → you → full record), and the assembler must place chunks by stage
//      no matter what order the template emits them in.
//
//   2. NOTHING IS DELETED. This was a re-sequencing, not a cull. An unknown stage
//      and a drawer tag with no spec must both survive to the deep end; every
//      renderer the old template mounted must still be mounted, exactly once.
//
//   3. THE DEEP RECORD IS REACHABLE AND UNCLIPPED. Drawers arrive closed, say what
//      is inside, and carry .dd-free — because app.css caps an open .dd-body at
//      2400px, which silently truncates a full voting record.
//
//   4. THE BRIEF DERIVES, IT NEVER ASSERTS. Everything on the first screen is read
//      back from the accessors the sections below use. With no gap and no
//      flashpoint it must SAY so, not hide; with no share artifact the control must
//      still work. No new score may be computed here.
//
//   5. IT DOES NOT MOVE THE PAGE. Chip pruning happens in the same task as the
//      innerHTML write, and drawers reveal without animating an unbounded height.
//
// Section 6 uses Thomas Massie as the worked example, because he is the profile
// this restaging was designed against: deep votes, deep money, deep promises.
//
//   node scripts/test-profile-spine.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// ── Sandbox ──────────────────────────────────────────────────────────────────
// Only what profile-spine.js touches. Stubs are swapped per-section so each
// assertion is about the module's behaviour and not about a fixture.
const registry = {};
const noopEl = () => ({
  style: {}, textContent: "", innerHTML: "",
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, appendChild() {},
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
});
const ctx = {
  console,
  document: {
    readyState: "complete",
    getElementById: (id) => (id in registry ? registry[id] : null),
    createElement: noopEl, querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {},
  },
  setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
  clearTimeout: () => {},
  JSON, Math, Date, Promise, Object, Array, String, Number, Boolean,
  encodeURIComponent, decodeURIComponent,
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;

const SRC = read("profile-spine.js");
vm.createContext(ctx);
new vm.Script(SRC, { filename: "profile-spine.js" }).runInContext(ctx);

const SP = ctx.window.PDXProfileSpine;
ok(!!SP, "module: profile-spine.js registers window.PDXProfileSpine");

// The source-level assertions further down are about what the code DOES, and
// this module is heavily commented — including naming the accessors it must NOT
// grow past. So they run against the code with comments stripped, or the prose
// would answer for the code. `[^:]` keeps `https://` out of the match.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ── 1. The order is the product ──────────────────────────────────────────────
{
  const want = ["identity", "brief", "signature", "tension", "record", "receipts", "money", "you", "drawers"];
  ok(JSON.stringify(SP.STAGES.map((s) => s.key)) === JSON.stringify(want),
     "order: STAGES is exactly the promised spine — identity, short version, signature issues, tension, record, receipts, money, you, full record");
  ok(SP.STAGES.every((s) => s.label && s.ask && /\?|\./.test(s.ask)),
     "order: every stage carries both a label and the reader question it answers");

  // The whole point: source position must stop deciding reading position.
  const out = SP.assemble([
    ["drawers", "<i>D</i>"], ["money", "<i>M</i>"], ["identity", "<i>I</i>"],
    ["record", "<i>R</i>"], ["signature", "<i>S</i>"],
  ]);
  const at = (s) => out.indexOf(s);
  ok(at("<i>I</i>") < at("<i>S</i>") && at("<i>S</i>") < at("<i>R</i>") &&
     at("<i>R</i>") < at("<i>M</i>") && at("<i>M</i>") < at("<i>D</i>"),
     "order: assemble() emits stages in spine order regardless of the order they were handed in");

  const two = SP.assemble([["money", "<i>first</i>"], ["money", "<i>second</i>"]]);
  ok(two.indexOf("<i>first</i>") < two.indexOf("<i>second</i>"),
     "order: source order is preserved WITHIN a stage — only between stages is it ignored");

  // Rails are the phone reader's "which question am I inside" marker, and they
  // are also the jump targets the brief's chips aim at, so their ids matter.
  ok(/id="pdxsp-money"/.test(out) && /id="pdxsp-record"/.test(out),
     "order: a stage with content emits a rail carrying the stable id its jump chips target");
  ok(!/id="pdxsp-receipts"/.test(out),
     "order: a stage with nothing to say emits no rail — so a chip aimed at it can be detected as dead");
  ok(!/id="pdxsp-identity"/.test(out) && !/id="pdxsp-brief"/.test(out),
     "order: identity and the brief are silent stages — no heading is printed over the letterhead");
  ok(/pdxsp-rail-ask/.test(out) && /Who funds them/.test(out),
     "order: the rail prints the question, not just a label");
}

// ── 2. Nothing is deleted ────────────────────────────────────────────────────
{
  const out = SP.assemble([["not_a_stage", "<i>X</i>"], ["record", "<i>R</i>"]]);
  ok(out.includes("<i>X</i>"),
     "keep: a chunk tagged with an unknown stage is parked at the deep end, never dropped");
  ok(out.indexOf("<i>R</i>") < out.indexOf("<i>X</i>"),
     "keep: the parked chunk lands after the real stages rather than in the middle of them");

  ok(SP.assemble([["record", "   \n  "]]) === "",
     "keep: whitespace-only output is dropped, so a self-gating renderer leaves no rail and no gap");

  const parked = SP.assembleTagged("A<!--PDXSP:dw:nospec-->B", { drawers: [] });
  ok(parked.includes("B"),
     "keep: a dw: tag with no drawer spec is parked in the full-record stage — a typo must not silently delete a section");
}

// ── 3. Sentinels, drawers, and the clip that would have eaten the record ─────
{
  const body =
    "LETTERHEAD" +
    "<!--PDXSP:money-->MONEYBLOCK" +
    "<!--PDXSP:dw:votes-->VOTEROW1" +
    "<!--PDXSP:record-->HIGHLIGHTS" +
    "<!--PDXSP:dw:votes-->VOTEROW2";
  const out = SP.assembleTagged(body, {
    drawers: [{ id: "votes", stage: "drawers", ico: "🗳️", title: "Full voting record", meta: "6 tracked", sub: "Every tracked vote." }],
  });

  ok(out.indexOf("LETTERHEAD") === 0 || out.indexOf("LETTERHEAD") < out.indexOf("HIGHLIGHTS"),
     "tagged: text before the first sentinel is the letterhead and stays first");
  ok(out.indexOf("HIGHLIGHTS") < out.indexOf("MONEYBLOCK"),
     "tagged: chunks are placed by their sentinel, not by where they appeared in the template");
  ok(out.includes("VOTEROW1") && out.includes("VOTEROW2"),
     "tagged: every chunk sharing a drawer id is collected — one renderer can feed two stages");
  ok(out.indexOf("VOTEROW1") < out.indexOf("VOTEROW2"),
     "tagged: drawer contents keep source order");
  ok((out.match(/pdxsp-dw-votes/g) || []).length >= 1 && (out.match(/id="pdxsp-dw-votes"/g) || []).length === 1,
     "tagged: the two chunks land in ONE drawer, not one drawer each");
  ok(out.indexOf("VOTEROW1") > out.indexOf("HIGHLIGHTS"),
     "tagged: the deep record sits below the spine, which is what progressive disclosure means here");

  ok(/class="dd-body dd-free"/.test(out),
     "drawer: the body carries .dd-free, which lifts app.css's 2400px open cap — without it a full voting record is silently clipped");
  ok(!/dd-body dd-free dd-open/.test(out) && /aria-expanded="false"/.test(out),
     "drawer: drawers arrive CLOSED, and say so to assistive tech");
  ok(/aria-controls="pdxsp-dw-votes"/.test(out) && /onclick="toggleDD\('pdxsp-dw-votes'\)"/.test(out),
     "drawer: it reuses the page's existing toggleDD contract rather than adding a second open/close behaviour");
  ok(/Full voting record/.test(out) && /6 tracked/.test(out) && /Every tracked vote\./.test(out),
     "drawer: the lid states what is inside and how much of it there is, so opening it is an informed tap");

  ok(SP.drawer({ id: "x", title: "T", html: "" }) === "",
     "drawer: an empty drawer renders nothing — no lids over nothing");
  ok(SP.drawer({ id: "", title: "T", html: "KEEP" }) === "KEEP",
     "drawer: with no id to toggle, the content is emitted bare rather than sealed shut");

  const css = read("profile-spine.css");
  ok(/\.dd-body\.dd-free\.dd-open \{[^}]*max-height: none/.test(css),
     "drawer: the .dd-free open rule actually removes the max-height cap");
  ok(/\.dd-body\.dd-free \{[^}]*transition: none/.test(css),
     "drawer: .dd-free also drops the transition — animating a multi-thousand-pixel reveal is the mobile jank the stability pass removed");
}

// ── 4. The brief derives, it never asserts ───────────────────────────────────
{
  const MASSIE = { name: "Thomas Massie", office: "U.S. House", keyIssues: ["national_debt", "gun_rights", "surveillance"] };

  ctx.window._issueLabel = (k) => ({
    national_debt: "💰 National Debt", gun_rights: "🔫 Gun Rights", surveillance: "🖥️ Surveillance",
  }[k] || "");

  // 4a. Curated key issues win, and they are the same keys the sections use.
  const sigs = SP._signatureIssues("massie", MASSIE, 3);
  ok(sigs.length === 3 && sigs[0].label === "💰 National Debt" && sigs[0].key === "national_debt",
     "brief: curated keyIssues are the signature issues, labelled through the shared _issueLabel vocabulary");

  // 4b. With no curated list it derives from the SAME accessors Stance at a
  //     Glance renders from, so the brief and the index cannot disagree.
  ctx.window._resolveStanceList = () => ([
    { topic: "Thin Issue", issueKey: "thin" },
    { topic: "Heavy Issue", issueKey: "heavy" },
  ]);
  ctx.window._issueEvidenceMap = () => ({
    heavy: { promises: [1, 2], spotlight: [1], counts: { spotlightNegative: 1, promisesBroken: 1 } },
    thin: { promises: [], spotlight: [], counts: {} },
  });
  const derived = SP._signatureIssues("x", { name: "No Curation" }, 3);
  ok(derived.length === 2 && derived[0].label === "Heavy Issue",
     "brief: without curation, signature issues are RANKED by how much of the record is tied to each");
  ok(/linked item/.test(derived[0].why) && derived[1].why === "position on file",
     "brief: each issue says why it is listed, in counts it can show — never a claim it cannot back");

  // 4c. Tension: a measured gap between the two feeds outranks a flagged item.
  ctx.window.PDXConsistency = {
    divergence: () => ({ both: [{ key: "gun_rights", gap: -28, off: { score: 55 }, say: { score: 83 } }] }),
  };
  ctx.window._pdxControversyItems = () => ([{ kind: "flag", title: "A flashpoint", summary: "s" }]);
  const t = SP._tension("massie", MASSIE);
  ok(t && t.kind === "gap" && t.badge === "28 pt gap",
     "brief: a scored Official-Record-vs-Say-vs-Do gap is the sharpest tension and wins over a flagged item");
  ok(/🏛️ 55% vs 🧾 83%/.test(t.detail) && /public record reads better/.test(t.detail),
     "brief: the gap is stated as the two feeds' own numbers, side by side, never blended into one");

  // A gap inside the alignment band is not a tension — it must fall through.
  ctx.window.PDXConsistency = { divergence: () => ({ both: [{ key: "x", gap: 9, off: { score: 50 }, say: { score: 59 } }] }) };
  const t2 = SP._tension("massie", MASSIE);
  ok(t2 && t2.kind === "flag" && t2.headline === "A flashpoint",
     "brief: a gap inside the aligned band is not called a disagreement — it falls through to the flagged flashpoint");

  // 4d. Nothing contested is a FINDING. It must be said, not hidden.
  ctx.window.PDXConsistency = { divergence: () => ({ both: [] }) };
  ctx.window._pdxControversyItems = () => ([]);
  ok(SP._tension("massie", MASSIE) === null,
     "brief: with no gap and no flashpoint, tension() returns null rather than promoting something weaker");
  const clean = SP.briefHtml("massie", MASSIE);
  ok(/No documented gap/.test(clean) && /contradicts itself/.test(clean),
     "brief: the empty state SAYS the record does not contradict itself instead of leaving a blank");
  ok(/not a guarantee about the future/.test(clean),
     "brief: and it scopes that to today, so a clean record is not read as a permanent clearance");

  // 4e. The share row is share-anywhere.js's control, unmodified, and the jump
  //     chips aim at rails rather than at self-gating section anchors.
  ctx.window.PDXShareAnywhere = { buttonHtml: (o) => "<button class='pdxsa-share-btn' data-pid='" + o.pid + "'></button>" };
  const withShare = SP.briefHtml("massie", MASSIE);
  ok(/pdxsa-share-btn/.test(withShare) && /data-pid='massie'/.test(withShare),
     "brief: 'what should I share next' is answered by the tier-aware share control, not by a second share path");
  ok(/data-pdxbr-to="pdxsp-record"/.test(withShare) && /data-pdxbr-to="pdxsp-money"/.test(withShare),
     "brief: inspect-next chips target the stage rails, which exist exactly when their stage has content");
  ok(!/pdxsec-funding/.test(withShare),
     "brief: no chip aims at a section anchor that only exists when that section renders — that is the dead control this replaced");

  // 4f. Self-gating: nothing to brief means no card at all.
  ctx.window._resolveStanceList = () => [];
  ctx.window._issueEvidenceMap = () => ({});
  ok(SP.briefHtml("empty", { name: "Nobody Tracked" }) === "",
     "brief: with neither a documented position nor a contested point the brief renders nothing");
  ok(SP.briefHtml("", MASSIE) === "", "brief: no pid, no brief");

  // 4g. No new scoring. The brief may format the record's numbers; it may not
  //     invent one. A score computed here would drift from the sections below.
  ok(!/officialRecord\s*\(|sayVsDo\s*\(/.test(CODE),
     "brief: the module never re-derives either feed — it reads the already-reconciled divergence view");
  ok(!/\/\s*\(?\s*kept|Math\.round\([^)]*100\s*\/|\bscore\s*=/.test(CODE),
     "brief: no percentage or score is computed in the spine — every figure it prints came from an accessor");
}

// ── 5. It does not move the page ─────────────────────────────────────────────
{
  // prune() removes a chip whose stage did not render. Done in the same task as
  // the innerHTML write it is invisible; done later it is a layout shift.
  const chips = [
    { _to: "pdxsp-record", getAttribute: (k) => (k === "data-pdxbr-to" ? "pdxsp-record" : null), parentNode: null },
    { _to: "pdxsp-money", getAttribute: (k) => (k === "data-pdxbr-to" ? "pdxsp-money" : null), parentNode: null },
  ];
  const removed = [];
  const parent = { removeChild: (c) => removed.push(c._to) };
  chips.forEach((c) => { c.parentNode = parent; });
  registry["pdxsp-record"] = noopEl();           // rendered
  delete registry["pdxsp-money"];                 // did not render
  const root = { querySelectorAll: () => chips };
  SP.hydrate(root);
  ok(removed.length === 1 && removed[0] === "pdxsp-money",
     "stability: a jump chip whose stage did not render is removed, so no control scrolls nowhere");
  ok(!removed.includes("pdxsp-record"),
     "stability: a chip with a live destination is left alone");

  ok(/before the browser has had a chance to paint|same task that set innerHTML/.test(SRC),
     "stability: hydrate() documents that it must run in the write's own task — the reason it is safe");
}

// ── 6. Massie, the worked example, and the dedupe in profiles-full.js ────────
{
  const PF = read("profiles-full.js");

  // 6a. The assembler is actually used, with a synchronous hydrate, and a
  //     fallback that renders the old body rather than nothing.
  ok(/assembleTagged\(_profileBody/.test(PF),
     "wiring: the modal body is assembled through the spine rather than written in build order");
  ok(/_mc\.innerHTML = \([\s\S]{0,200}assembleTagged[\s\S]{0,4000}: _profileBody;/.test(PF),
     "wiring: if profile-spine.js is missing the profile still renders — the spine is an ordering layer, not a prerequisite");
  const mount = PF.indexOf("_mc.innerHTML =");
  const hyd = PF.indexOf("_spine.hydrate(_mc)");
  ok(mount !== -1 && hyd > mount && !/await|then\(|setTimeout\([^)]*hydrate/.test(PF.slice(mount, hyd)),
     "wiring: hydrate() runs in the same synchronous task as the innerHTML write, before paint");

  // 6b. Sentinel coverage. Every stage of the spine must be claimed by at least
  //     one block, or a stage of the promised spine is simply missing.
  const tags = [...PF.matchAll(/<!--PDXSP:([a-z0-9:_-]+)-->/g)].map((m) => m[1]);
  const stageTags = new Set(tags.filter((t) => !t.startsWith("dw:")));
  ["identity", "brief", "signature", "tension", "record", "receipts", "money", "you"].forEach((k) => {
    ok(stageTags.has(k), `sentinels: at least one block claims the '${k}' stage`);
  });
  const dwTags = new Set(tags.filter((t) => t.startsWith("dw:")).map((t) => t.slice(3)));
  ["positions", "votes", "promises", "money", "activity"].forEach((k) => {
    ok(dwTags.has(k), `sentinels: the '${k}' drawer has content tagged into it`);
  });
  // Every drawer id that content is tagged into must have a spec, or the content
  // is parked in the generic deep end with no lid describing it.
  dwTags.forEach((k) => {
    ok(new RegExp("id: '" + k + "'").test(PF), `sentinels: the '${k}' drawer is declared in the drawer spec list`);
  });

  // 6c. The dedupe. Each of the repeated lenses may be MOUNTED once. This is the
  //     assertion that would have caught the original defect: the renderers were
  //     all called once each, but their output landed at four different depths
  //     interleaved with each other, so the reader met money five times. Now each
  //     renderer is called once and the SPINE decides where its output lands.
  const once = (needle, label) => {
    const n = (PF.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    ok(n === 1, `dedupe: ${label} is mounted exactly once in the modal body (found ${n})`);
  };
  once("window._renderIssueStances(id, p)", "the full per-issue stance set");
  once("window._renderStanceGlance(id, p)", "Stance at a Glance");
  once("window._renderVotingRecord(id, p)", "the API voting record");
  once("window._renderMajorContracts(id, p)", "major contracts");
  once("PDXConsistency.gatewayHtml(id)", "the Promise Tracker gateway");
  once("PDXConsistency.officialRecordSectionHtml(id)", "the Official Record feed");
  once("PDXConsistency.saydoSectionHtml(id)", "the Say-vs-Do feed");
  once("PDXConsistency.divergenceSectionHtml(id)", "the record-vs-public-picture bridge");

  // 6d. Massie. The profile this was designed against — and the one whose depth
  //     is now behind drawers instead of in front of the reader.
  ok(/massie: \[/.test(PF) && /massie:\s*\{ nwBefore/.test(PF) && /massie:\s*\{ label:'Thomas Massie'/.test(PF),
     "massie: his deep record is intact — key votes, campaign finance detail, and wealth-over-time series");
  const vrBlock = PF.slice(PF.indexOf("<!--PDXSP:record-->\n      <!-- Key Voting Record -->"));
  ok(/<!--PDXSP:dw:votes-->/.test(vrBlock.slice(0, vrBlock.indexOf("<!--PDXSP:tension-->"))),
     "massie: his six tracked votes split where they should — highlights on the spine, the full table in the votes drawer");
  const wealthAt = PF.indexOf("<!--PDXSP:dw:money-->");
  ok(wealthAt !== -1 && PF.indexOf("Wealth Over Time", wealthAt) > wealthAt,
     "massie: the wealth chart moved into the money drawer with the rest of the financial record");

  // 6e. Charts inside closed drawers. A canvas in a max-height:0 box measures
  //     zero and Chart.js will not reliably redraw on reveal, so both charts are
  //     parked and drawn on first open. Without this the drawers look broken.
  ok(/_pdxDrawerChart\('wealthChart'/.test(PF) && /_pdxDrawerChart\('ftmNwChart'/.test(PF),
     "charts: both drawer charts are deferred rather than drawn into a zero-height canvas");
  ok(/function _pdxDrainCharts/.test(PF) && /if \(!isOpen\) _pdxDrainCharts\(\);/.test(PF),
     "charts: toggleDD draws any pending chart on the open that first gives its canvas a size");
  ok(/aria-expanded/.test(PF.slice(PF.indexOf("function toggleDD"), PF.indexOf("function toggleDD") + 900)),
     "charts: toggleDD also keeps aria-expanded honest, since drawers are now a primary navigation surface");

  // 6f. Deep sections live inside closed drawers, so the quick-jump rail has to
  //     open the lid before scrolling or the pill looks like it does nothing.
  const jump = PF.slice(PF.indexOf("window._pdxNavJump = function"), PF.indexOf("window._pdxInitProfileNav"));
  ok(/dd-body/.test(jump) && /dd-open/.test(jump) && /toggleDD/.test(jump),
     "wiring: a jump to a target inside a closed drawer opens the drawer first");
  ok(jump.indexOf("toggleDD") < jump.indexOf("getBoundingClientRect"),
     "wiring: and it opens it BEFORE measuring, so the scroll offset reflects the expanded layout");
  ok(/window\._pdxNavJump\('pdx-promise-section'\)/.test(PF),
     "wiring: filtering promises from a hero badge routes through the drawer-aware jump, not a bare scrollIntoView");

  // 6g. No control was buried by the restaging. The multi-AI verification report
  //     has exactly one entry point in the whole app, and it used to be the last
  //     element of the promise ledger — which is now inside a closed drawer.
  const verifyAt = PF.indexOf('id="pdxsec-verify"');
  ok(verifyAt !== -1 && PF.lastIndexOf("<!--PDXSP:record-->", verifyAt) > PF.lastIndexOf("<!--PDXSP:dw:", verifyAt),
     "reach: the 'Verify Full Profile with AI' action sits on the official-record stage, not inside a full-record drawer");
  ok((PF.match(/openFullProfileVerify\('\$\{id\}'\)/g) || []).length === 1,
     "reach: and it is still mounted exactly once — lifting it out of the ledger did not duplicate it");
}

// ── 7. Shipping ──────────────────────────────────────────────────────────────
{
  const html = read("index.html");
  ok(/<script defer src="profile-spine\.js"><\/script>/.test(html),
     "ship: the spine is loaded on every page that can open a profile");
  ok(html.indexOf('src="share-anywhere.js"') < html.indexOf('src="profile-spine.js"'),
     "ship: it loads after share-anywhere.js, whose control the brief renders");
  ok(/<link rel="stylesheet" href="\/profile-spine\.css" media="print" onload="this\.media='all'" \/>/.test(html),
     "ship: its stylesheet is non-blocking — the blocking-CSS budget is already full and a profile is never the first paint");
  ok(/<noscript><link rel="stylesheet" href="\/profile-spine\.css" \/><\/noscript>/.test(html),
     "ship: with JS off the stylesheet still applies");

  const sw = read("sw.js");
  ok(/'\/profile-spine\.js'/.test(sw) && /'\/profile-spine\.css'/.test(sw),
     "ship: both assets are precached, so a repeat visit does not get an unordered or unstyled profile");
  const v = sw.match(/CACHE_VERSION\s*=\s*['"]v(\d+)['"]/);
  ok(v && Number(v[1]) >= 41,
     `ship: CACHE_VERSION is bumped so the new shell assets actually reach returning visitors (found ${v ? "v" + v[1] : "none"})`);

  const css = read("profile-spine.css");
  ok(/grid-template-columns: 1fr;/.test(css) && /@media \(min-width: 641px\)/.test(css),
     "ship: mobile-first — one column is the base rule and the wider layout is the exception");
  ok(/min-height: 2\.5rem|min-height: 2\.75rem|min-height: 3rem/.test(css),
     "ship: every control in the brief and on a drawer lid is thumb-sized at the narrowest width");
  ok(/@media \(prefers-reduced-motion: reduce\)/.test(css),
     "ship: the brief's transitions are dropped for readers who ask for less motion");
}

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("\n✗ profile spine: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ profile spine: all " + passed + " assertions passed");
