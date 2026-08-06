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
// Six properties carry that change, and every one of them fails QUIETLY — a
// mis-ordered profile still renders, a lost block still leaves a valid page, a
// clipped drawer still opens, a drifted rail still scrolls. So they are tested
// rather than trusted:
//
//   1. THE ORDER IS THE PRODUCT. STAGES must match the spine the profile promises
//      (identity → short version → verdict → tension → signature issues → record
//      → receipts → you → money → full record), and the assembler must place
//      chunks by stage no matter what order the template emits them in. That
//      sequence is an accountability path, so the assertions check its four claims
//      — judgment first, contradiction before reputation, findings before methods,
//      the reader before the money tail — not merely that the array parses.
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
//   6. THE RAIL DERIVES TOO, AND THE SPY DOES NOT MEASURE. The jump rail's order
//      comes from an anchor→stage registry checked against the page itself, and at
//      runtime from real document position — never from the order the pill-pushing
//      code happens to run in. Its active pill comes from IntersectionObserver
//      callbacks that arrive with their geometry already measured, not from a
//      per-frame getBoundingClientRect sweep of the whole profile subtree.
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
  const want = ["identity", "brief", "verdict", "signature", "record", "tension", "receipts", "money", "you", "drawers"];
  ok(JSON.stringify(SP.STAGES.map((s) => s.key)) === JSON.stringify(want),
     "order: STAGES is exactly the promised spine — identity, short version, Word vs Action, stances, official record, flashpoints, evidence, money, you, full record");
  ok(SP.STAGES.every((s) => s.label && s.ask && /\?|\./.test(s.ask)),
     "order: every stage carries both a label and the reader question it answers");
  // Two rails asking the same question is a rail that has stopped orienting
  // anyone. The verdict asks whether they stand by what they said; the receipts
  // stage asks where the proof of that is. They are not the same question.
  ok(new Set(SP.STAGES.map((s) => s.ask)).size === SP.STAGES.length,
     "order: no two stages ask the reader the same question");

  // The four claims the path makes, asserted as order rather than as prose.
  const kAt = (k) => SP.STAGES.findIndex((s) => s.key === k);
  ok(kAt("verdict") < kAt("record") && kAt("verdict") < kAt("receipts") && kAt("verdict") < kAt("drawers"),
     "path: the judgment comes before the apparatus that produced it — findings before methods");
  ok(kAt("verdict") === kAt("brief") + 1,
     "path: the verdict is the first major surface after the letterhead and the brief");
  // What they stand for now sits between the score and the record: the stances
  // layer is what the Official Record is a test OF, so it has to be read first,
  // and the flashpoints that follow are heat about specific stances rather than
  // the reader's introduction to the person.
  ok(kAt("signature") < kAt("record") && kAt("record") < kAt("tension"),
     "path: stances precede the record that tests them, and the heat comes after both");
  ok(kAt("money") < kAt("you") && kAt("you") < kAt("drawers"),
     "path: the follow-the-money lens precedes the reader's own stake, and the deep record still closes the profile");

  // The whole point: source position must stop deciding reading position.
  const out = SP.assemble([
    ["drawers", "<i>D</i>"], ["money", "<i>M</i>"], ["identity", "<i>I</i>"],
    ["record", "<i>R</i>"], ["signature", "<i>S</i>"], ["verdict", "<i>V</i>"],
    ["tension", "<i>T</i>"],
  ]);
  const at = (s) => out.indexOf(s);
  ok(at("<i>I</i>") < at("<i>V</i>") && at("<i>V</i>") < at("<i>S</i>") &&
     at("<i>S</i>") < at("<i>R</i>") && at("<i>R</i>") < at("<i>T</i>") &&
     at("<i>T</i>") < at("<i>M</i>") && at("<i>M</i>") < at("<i>D</i>"),
     "order: assemble() emits stages in spine order regardless of the order they were handed in");

  const two = SP.assemble([["money", "<i>first</i>"], ["money", "<i>second</i>"]]);
  ok(two.indexOf("<i>first</i>") < two.indexOf("<i>second</i>"),
     "order: source order is preserved WITHIN a stage — only between stages is it ignored");

  // Rails are the phone reader's "which question am I inside" marker, and they
  // are also the jump targets the brief's chips aim at, so their ids matter.
  ok(/id="pdxsp-money"/.test(out) && /id="pdxsp-record"/.test(out),
     "order: a stage with content emits a rail carrying the stable id its jump chips target");
  ok(/id="pdxsp-verdict"/.test(out),
     "order: the verdict stage emits its own rail, so the primary judgment is a nameable place on the page");
  ok(!/id="pdxsp-receipts"/.test(out),
     "order: a stage with nothing to say emits no rail — so a chip aimed at it can be detected as dead");
  ok(!/id="pdxsp-identity"/.test(out) && !/id="pdxsp-brief"/.test(out),
     "order: identity and the brief are silent stages — no heading is printed over the letterhead");
  ok(/pdxsp-rail-ask/.test(out) && /Who funds them/.test(out),
     "order: the rail prints the question, not just a label");
  // Rail numbering is derived from which stages rendered, so a profile with no
  // funding on file does not print a gap in the sequence.
  ok(/pdxsp-rail-n" aria-hidden="true">1</.test(out) &&
     out.indexOf('>1<') < out.indexOf('>2<'),
     "order: rails are numbered over the stages that actually rendered, starting at 1");
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
  ["identity", "brief", "verdict", "tension", "signature", "record", "receipts", "money", "you"].forEach((k) => {
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
  // The Promise Tracker gateway is mounted ZERO times by design. Pledges are an
  // input to Word vs Action, not a rival integrity product with its own section,
  // so the gateway no longer gets profile chrome. Its delegated handlers are still
  // bound from the Official Record; only the second front door is gone.
  ok(!/PDXConsistency\.gatewayHtml\(id\)/.test(PF),
    "dedupe: the Promise Tracker gateway is mounted in the modal body again — that is a\n" +
    "    second integrity product competing with Word vs Action for the same reader");
  once("PDXConsistency.officialRecordSectionHtml(id)", "the Official Record feed");
  once("PDXConsistency.stancesSectionHtml(id)", "the Stances & Connections layer");
  // Say-vs-Do and the record-vs-public-picture bridge are mounted ZERO times by
  // design. Say-vs-Do was a second per-issue verdict for the same issue, and the
  // bridge existed only to referee the disagreement between the two. The public
  // record is now an input resolved ON the issue row (PDXConsistency.issueRow),
  // so there is one verdict per issue and nothing left for a referee to settle.
  // Both exporters survive on PDXConsistency; nothing on a profile calls them.
  ok(!/PDXConsistency\.saydoSectionHtml\(id\)/.test(PF),
    "dedupe: the Say-vs-Do section is mounted in the modal body again — that is a second\n" +
    "    per-issue verdict that can disagree with Word vs Action about the same issue");
  ok(!/PDXConsistency\.divergenceSectionHtml\(id\)/.test(PF),
    "dedupe: the record-vs-public-picture bridge is mounted again — it only ever refereed a\n" +
    "    disagreement between two verdict systems, and there is only one verdict system now");

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
  ok(/_pdxRevealTarget/.test(jump) && /_pdxOpenClosedChain\(el\)/.test(jump),
     "wiring: a jump to a target inside a closed drawer opens the drawer first");
  ok(jump.indexOf("toggleDD") < jump.indexOf("getBoundingClientRect"),
     "wiring: and it opens it BEFORE measuring, so the scroll offset reflects the expanded layout");
  ok(/window\._pdxNavJump\('pdx-promise-section'\)/.test(PF),
     "wiring: filtering promises from a hero badge routes through the drawer-aware jump, not a bare scrollIntoView");

  // 6g. No control was buried by the restaging. The slot at #pdxsec-verify is the
  //     profile's one "how do I know this is real?" action, and it used to be the
  //     last element of the promise ledger — which is now inside a closed drawer.
  //
  //     What that slot HOLDS changed after the mobile pass: it used to open
  //     openFullProfileVerify(), a simulated multi-AI report (hardcoded delay,
  //     client-side prose, and a fabricated weighted "Trust Score" — a second
  //     primary score on a page whose whole contract is that Word vs Action is the
  //     only one). It was retired rather than wired, and the slot now opens the
  //     real scoring methodology. So this checks placement, singleness AND that the
  //     simulation has not crept back in.
  const verifyAt = PF.indexOf('id="pdxsec-verify"');
  ok(verifyAt !== -1 && PF.lastIndexOf("<!--PDXSP:record-->", verifyAt) > PF.lastIndexOf("<!--PDXSP:dw:", verifyAt),
     "reach: the profile's how-was-this-checked action sits on the official-record stage, not inside a full-record drawer");
  ok((PF.match(/class="pdx-howchecked"/g) || []).length === 1,
     "reach: and it is still mounted exactly once — lifting it out of the ledger did not duplicate it");
  ok(!/openFullProfileVerify\('/.test(PF),
     "reach: the retired multi-AI 'verification' simulation is CALLED again from the profile — it makes no\n" +
     "    request and prints an invented Trust Score, which is a rival primary number sourced from nothing.\n" +
     "    (Matching a call with an argument on purpose: the name is still named in the comment that records\n" +
     "    why the control was retired, and that comment should stay.)");
  ok(/openMethodology/.test(PF.slice(verifyAt, verifyAt + 900)),
     "reach: the slot no longer opens anything real — a control that answers 'how do I know?' has to land on the\n" +
     "    scoring methodology, not on a dead end");
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

// ── 8. Deferred drawer inners ────────────────────────────────────────────────
// Collapsing a drawer hides its cost from the reader, not from the browser: a
// closed .dd-body is max-height:0, not display:none, so its markup is still
// parsed, still becomes elements, still gets style resolved on the tap that
// opens the profile. Deferred mode holds that markup back as a string. These
// assertions are all about the ways that could quietly break something.
{
  const lid = { id: "pdxsp-t-money", ico: "💰", title: "Full financial record",
                meta: "12 filings", sub: "Every filing, in full." };
  const PAYLOAD = '<div id="pdxsp-t-guts">GUTS<canvas id="pdxsp-t-canvas"></canvas></div>';

  const inline = SP.drawer({ ...lid, html: PAYLOAD });
  const lazy = SP.drawer({ ...lid, html: PAYLOAD, defer: true });

  // 8a. The payload is not in the emitted string at all — which is the entire
  //     point. A placeholder marks where it goes back.
  ok(inline.includes("GUTS") && !lazy.includes("GUTS"),
     "defer: a deferred drawer emits none of its inner markup, so nothing is parsed or laid out for content nobody asked to see");
  ok(!/pdxsp-t-canvas/.test(lazy),
     "defer: not even the canvases — a zero-height Chart.js canvas was the expensive half of the money drawer");
  ok(/<div class="dd-inner pdxsp-dw-inner" data-pdxsp-defer="pdxsp-t-money"><\/div>/.test(lazy),
     "defer: the .dd-inner is emitted as an empty leaf carrying the marker materialize() looks for");
  ok(SP._deferredIds().indexOf("pdxsp-t-money") !== -1,
     "defer: the held-back body is stashed under the drawer id, keyed the same way toggleDD is called");

  // 8b. The lid must not advertise itself differently for being cheap, or the
  //     reader is choosing between two drawers that describe themselves unequally.
  const upToBody = (s) => s.slice(0, s.indexOf('<div class="dd-body'));
  ok(upToBody(inline) === upToBody(lazy) && /12 filings/.test(lazy) && /Full financial record/.test(lazy),
     "defer: the lid is byte-identical to the inline form — same title, same count, same toggle contract");
  ok(/aria-expanded="false"/.test(lazy) && /class="dd-body dd-free"/.test(lazy),
     "defer: it is still a closed .dd-free drawer, so the open path and the uncapped height are unchanged");

  // 8c. hasTarget answers "does this destination exist" without mounting it.
  registry["pdxsp-t-live"] = noopEl();
  ok(SP.hasTarget("pdxsp-t-guts") && SP.hasTarget("pdxsp-t-canvas"),
     "defer: hasTarget finds an id that is waiting inside a deferred body, so a caller that needs one does not conclude it was deleted");
  ok(SP.hasTarget("pdxsp-t-live") && !SP.hasTarget("pdxsp-t-absent") && !SP.hasTarget(""),
     "defer: and it still answers plainly for ids that are live in the document, absent, or empty");
  ok(SP._deferredIds().indexOf("pdxsp-t-money") !== -1,
     "defer: asking the question does not mount the answer — hasTarget leaves the body stashed");

  // 8d. materialize(): one-shot, synchronous, and it tells the profile.
  const mkHost = (drawerId) => ({
    innerHTML: "", _attrs: { "data-pdxsp-defer": drawerId },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
  });
  const host = mkHost("pdxsp-t-money");
  registry["pdxsp-t-money"] = { ...noopEl(), children: [noopEl(), host] };
  const revealed = [];
  ctx.window._pdxAfterDrawerReveal = (id, h) => { revealed.push([id, h === host, host.innerHTML.length]); };

  ok(SP.materialize("pdxsp-t-money") === true && host.innerHTML.includes("GUTS"),
     "defer: materialize injects the stashed body into its placeholder, skipping siblings that are not the marked host");
  ok(host.innerHTML.includes("Every filing, in full."),
     "defer: the subtitle rides along with the payload, so no promise made on the lid goes missing on open");
  ok(host.getAttribute("data-pdxsp-defer") === null,
     "defer: the marker is cleared, so a second pass cannot target an already-filled host");
  ok(SP._deferredIds().indexOf("pdxsp-t-money") === -1 && SP.materialize("pdxsp-t-money") === false,
     "defer: injection is one-shot — the stash entry is consumed, so re-opening a drawer never re-writes its contents");
  ok(revealed.length === 1 && revealed[0][0] === "pdxsp-t-money" && revealed[0][1] === true && revealed[0][2] > 0,
     "defer: the profile is notified once, with the host, AFTER the markup is in it — the chart queue and the scroll-spy run against mounted nodes");
  ok(SP.materialize("pdxsp-t-nosuch") === false,
     "defer: materializing an unknown or non-deferred drawer is a no-op rather than a throw");

  // 8e. revealFor(): the route every jump target takes.
  const lazy2 = SP.drawer({ id: "pdxsp-t-promises", title: "Promise ledger", html: '<ul id="pdxsp-t-list">ROWS</ul>', defer: true });
  ok(lazy2.includes("data-pdxsp-defer"), "defer: second drawer stashed");
  const host2 = mkHost("pdxsp-t-promises");
  registry["pdxsp-t-promises"] = { ...noopEl(), children: [host2] };
  ok(SP.revealFor("pdxsp-t-list") === true && host2.innerHTML.includes("ROWS"),
     "defer: revealFor mounts whichever drawer holds a given element id — a promise filter or a deep link resolves against content that was never in the document");
  ok(SP.revealFor("pdxsp-t-live") === false && SP.revealFor("pdxsp-t-absent") === false && SP.revealFor("") === false,
     "defer: and it does nothing for an id that is already live, one that does not exist, or none at all");

  // 8f. The store is per-render. Two profiles in a row must not share a stash.
  SP.drawer({ id: "pdxsp-t-stale", title: "T", html: '<b id="pdxsp-t-stalekid">X</b>', defer: true });
  SP.assembleTagged("<!--PDXSP:record-->R", { drawers: [] });
  ok(SP._deferredIds().length === 0 && !SP.hasTarget("pdxsp-t-stalekid"),
     "defer: assembleTagged clears the stash, so opening one profile can never mount the previous profile's record");

  // 8g. prune() must not delete a chip whose destination is deferred.
  SP.drawer({ id: "pdxsp-t-dw", title: "T", html: '<div id="pdxsp-t-deep">D</div>', defer: true });
  const chip = { getAttribute: (k) => (k === "data-pdxbr-to" ? "pdxsp-t-deep" : null), parentNode: null };
  const dead = { getAttribute: (k) => (k === "data-pdxbr-to" ? "pdxsp-t-gone" : null), parentNode: null };
  const gone = [];
  const parent2 = { removeChild: (c) => gone.push(c.getAttribute("data-pdxbr-to")) };
  chip.parentNode = parent2; dead.parentNode = parent2;
  SP.hydrate({ querySelectorAll: () => [chip, dead] });
  ok(gone.length === 1 && gone[0] === "pdxsp-t-gone",
     "defer: a jump chip aimed inside a deferred drawer survives pruning, while one aimed at nothing is still removed");
}

// ── 9. Deferral is wired into the profile, and nothing was cut off by it ──────
{
  const PF = read("profiles-full.js");
  // These assertions are about ORDER — reveal before lookup, mount before open —
  // and the code is commented with prose that names the same functions, which
  // would otherwise answer for it.
  const PFC = PF.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  // 9a. Which drawers pay up front. The heavy, self-contained ones are deferred;
  //     activity is not, because it is short and owns a spied-on nav anchor.
  const specs = PFC.slice(PFC.indexOf("drawers: ["), PFC.indexOf("_spine.hydrate(_mc)"));
  const spec = (k) => {
    const at = specs.indexOf("id: '" + k + "'");
    if (at === -1) return "";
    const next = specs.indexOf("{ id: '", at);
    return specs.slice(at, next === -1 ? specs.length : next);
  };
  ["positions", "votes", "promises", "money"].forEach((k) => {
    ok(/defer: true/.test(spec(k)), `defer: the '${k}' drawer is deferred — it is heavy and nothing outside it needs its nodes before it opens`);
  });
  ok(spec("activity") !== "" && !/defer: true/.test(spec("activity")),
     "defer: the activity drawer is deliberately NOT deferred — it is a short freshness block holding the anchor the nav rail spies on");

  // 9b. toggleDD mounts before it opens. If the order slipped, the reader would
  //     see an open empty drawer, and the chart drain below would find no canvas.
  const td = PFC.slice(PFC.indexOf("function toggleDD"), PFC.indexOf("function toggleDD") + 1600);
  ok(/materialize/.test(td) && td.indexOf("materialize") < td.indexOf("dd-open"),
     "defer: toggleDD materializes a deferred inner BEFORE the open class goes on, so the reveal and the content land in the same frame");
  ok(td.indexOf("materialize") < td.indexOf("_pdxDrainCharts"),
     "defer: and before the chart drain, so a queued chart finds a canvas that exists");

  // 9c. Everything that reaches INTO a drawer by id reveals first. Each of these
  //     was a live control that deferral would have turned into a dead button.
  const jump = PFC.slice(PFC.indexOf("window._pdxNavJump = function"), PFC.indexOf("window._pdxInitProfileNav"));
  ok(/_pdxRevealTarget/.test(jump) && jump.indexOf("_pdxRevealTarget") < jump.indexOf("getElementById(targetId)"),
     "defer: the quick-jump rail reveals its target before looking it up, so a pill aimed into a deferred drawer still scrolls");
  const filt = PFC.slice(PFC.indexOf("window.pdxFilterPromises = function"), PFC.indexOf("window.pdxFilterPromises = function") + 900);
  ok(/_pdxRevealTarget\('pdx-promise-list'\)/.test(filt) && filt.indexOf("_pdxRevealTarget") < filt.indexOf("if (!list) return"),
     "defer: the hero count chips reveal the promise list before the bail that would otherwise make every one of them do nothing");
  ok(/window\._pdxRevealTarget = function/.test(PF) && /revealFor/.test(PF),
     "defer: those callers go through one small wrapper, so the spine stays optional — no spine means no reveal, not a throw");

  // 9d. The chart queue. A canvas that does not exist yet is indistinguishable
  //     from one whose profile closed, and treating the first as the second is
  //     how a deferred chart silently never draws.
  const drain = PFC.slice(PFC.indexOf("function _pdxDrainCharts"), PFC.indexOf("function _pdxDrainCharts") + 700);
  ok(/keep\.push\(job\)/.test(drain) && !/if \(!el\) return;/.test(drain),
     "defer: _pdxDrainCharts keeps a job whose canvas is missing rather than discarding it — not mounted yet is not the same as gone");
  ok(/function _pdxResetChartQueue/.test(PFC) && (PFC.match(/_pdxResetChartQueue\(\)/g) || []).length >= 3,
     "defer: the queue is emptied at the two moments a parked job really is dead — a new profile render and modal close");
  const wealth = PFC.slice(PFC.indexOf("_pdxDrawerChart('wealthChart'"), PFC.indexOf("_pdxDrawerChart('wealthChart'") + 400);
  ok(/getElementById\('wealthChart'\)/.test(wealth),
     "defer: the wealth chart resolves its canvas inside the job body, at draw time — capturing it at render time would queue nothing at all");
  const ftm = PFC.slice(PFC.indexOf("_pdxDrawerChart('ftmNwChart'"), PFC.indexOf("_pdxDrawerChart('ftmNwChart'") + 400);
  ok(/getElementById\('ftmNwChart'\)/.test(ftm),
     "defer: and so does the net-worth chart in the money drawer");

  // 9e. The one seam back into the profile. The re-arm goes through the coalescing
  //      entry point rather than calling the arm directly: a reader who opens three
  //      drawers in a row should pay for one re-arm, on the frame after the last
  //      mutation, not three in the middle of them.
  const after = PFC.slice(PFC.indexOf("window._pdxAfterDrawerReveal = function"), PFC.indexOf("window._pdxRevealTarget = function"));
  ok(/_pdxDrainCharts/.test(after) && /_pdxNavRearmSoon/.test(after),
     "defer: on reveal the profile drains its chart queue and re-arms the nav, so the new subtree joins the jump rail");
  ok(!/_pdxInitProfileNav/.test(after),
     "defer: and it does not arm the rail synchronously mid-mutation — that is what the coalescer is for");
  ok(/ftm-follow-btn/.test(after) && /_pdxFollowMoneyOn/.test(after),
     "defer: and re-applies the Follow Money Trail state that was fetched while the button was still a string, so a following reader does not see an un-followed button");

  // 9f. The voting record. It used to demand its container synchronously before it
  //     would even fetch, so deferring the votes drawer would have switched the
  //     live record off for every member.
  const VR = read("voting-record.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const init = VR.slice(VR.indexOf("window._pdxInitVotingRecord = function"), VR.indexOf("window._pdxInitVotingRecord = function") + 1400);
  ok(/hasTarget\('pdx-voting-record'\)/.test(init),
     "defer: the voting record accepts a container that is waiting inside a deferred drawer instead of bailing out of the fetch");
  ok(/_pdxRevealTarget\('pdx-voting-record'\)/.test(VR) &&
     VR.indexOf("_pdxRevealTarget('pdx-voting-record')") < VR.indexOf("var section = document.getElementById('pdx-voting-record')"),
     "defer: and it reveals the drawer only once the data has arrived, then resolves the node — a member with no record never mounts the drawer at all");

  // 9g. The Official Record gates its two links to the voting record on whether
  //     that section exists. The check always answered about the PREVIOUS render,
  //     because it runs while the next profile is still a string — so once the
  //     record moved into a deferred drawer the evidence moved into the stash, and
  //     a DOM-only check would have hidden a live link from most readers.
  const CJ = read("consistency.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  ok(/function _vrSectionReachable/.test(CJ) && /hasTarget\('pdxsec-voting'\)/.test(CJ),
     "defer: the Official Record asks the spine as well as the document whether a voting record section is reachable");
  ok(!/document\.getElementById\('pdxsec-voting'\)\) return ''/.test(CJ) &&
     (CJ.match(/_vrSectionReachable\(\)/g) || []).length >= 3,
     "defer: and both of its gated links — the raw-record button and the mapped-count summary — go through that one check");
}

// ── 10. Lids: progressive disclosure inside a section that stays open ────────
// A drawer moves a whole section out of the first read. A lid is finer: the digest
// keeps reading and the bulk folds. Everything below is about the two ways that
// goes wrong — a fold that hides a claim with no way back to its receipt, and a
// marker that fails closed and eats the content it was supposed to reveal.
{
  ctx.window._pdxAfterDrawerReveal = () => {};
  try { SP.assembleTagged(""); } catch (e) {}   // clears the per-render stores

  const long = (tag) => "<p>" + tag.repeat(60) + "</p>";
  const BULK = long("bulk ");

  // 10a. The marker resolves into the drawer contract, and the bulk is stashed.
  const lazy = SP.applyLids('<div>DIGEST</div><!--PDXSP:lid id="t-one" label="Show the rest" defer-->' +
    BULK + "<!--PDXSP:/lid-->");
  ok(lazy.includes("DIGEST") && !lazy.includes("bulk bulk"),
     "lid: the digest stays in the emitted string and the bulk does not — the fold is the point");
  ok(/<div class="dd-inner pdxsp-lid-inner" data-pdxsp-defer="pdxsp-lid-t-one"><\/div>/.test(lazy),
     "lid: a deferred lid emits the same empty marked leaf a deferred drawer does, so one materialize() serves both");
  ok(/toggleDD\('pdxsp-lid-t-one'\)/.test(lazy) && /id="btn-pdxsp-lid-t-one"/.test(lazy) &&
     /aria-controls="pdxsp-lid-t-one"/.test(lazy) && /aria-expanded="false"/.test(lazy),
     "lid: it reuses toggleDD and the full aria contract rather than inventing a second collapse mechanism");
  ok(/<div class="dd-body dd-free" id="pdxsp-lid-t-one">/.test(lazy),
     "lid: the body is .dd-free, so a long fold is not clipped by the drawer max-height cap");
  ok(lazy.includes("Show the rest") && !/PDXSP:/.test(lazy),
     "lid: the label survives and no marker is left in the output to leak into the page as a comment");
  ok(SP._deferredIds().indexOf("pdxsp-lid-t-one") !== -1,
     "lid: the held-back bulk is stashed under the lid id, in the same store the drawers use");

  // 10b. Undeferred form: same control, content inline. This is what a caller gets
  //      when the content has to be in the document at mount (anchors, hydration).
  const inline = SP.applyLids('<!--PDXSP:lid id="t-two" label="Show the rest"-->' + BULK + "<!--PDXSP:/lid-->");
  ok(inline.includes("bulk bulk") && /<div class="dd-inner pdxsp-lid-inner">/.test(inline) &&
     !/data-pdxsp-defer/.test(inline),
     "lid: without defer the bulk is emitted inline behind the same control, and nothing is stashed");

  // 10c. Fail-open. Every one of these would be a silent content loss if it failed
  //      the other way, so each returns the content rather than a control over it.
  ok(SP.applyLids("<p>plain</p>") === "<p>plain</p>",
     "lid: a string with no markers is returned untouched, not reparsed");
  ok(SP.applyLids('<!--PDXSP:lid label="No id"-->' + BULK + "<!--PDXSP:/lid-->").includes("bulk bulk"),
     "lid: a marker with no id renders its content inline — an unidentifiable fold is dropped, never its content");
  ok(SP.applyLids('<!--PDXSP:lid id="t-tiny" label="x"-->' + "<p>one short row</p>" + "<!--PDXSP:/lid-->") ===
     "<p>one short row</p>",
     "lid: content too small to be worth a tap is emitted as-is, so a thin profile does not get a control that reveals one line");
  ok(SP.applyLids('<!--PDXSP:lid id="t-empty" label="x"-->   <!--PDXSP:/lid-->') === "",
     "lid: an empty region emits nothing at all rather than a control over nothing");
  const straddle = SP.applyLids('<!--PDXSP:lid id="t-bad" label="x"-->' + BULK +
    "<!--PDXSP:record-->" + BULK + "<!--PDXSP:/lid-->");
  ok(straddle.includes("PDXSP:record") && !/pdxsp-lid-t-bad/.test(straddle),
     "lid: a region containing a stage or drawer sentinel is left completely alone — folding one would silently relocate a section");
  const dupe = SP.applyLids('<!--PDXSP:lid id="t-one" label="Again" defer-->' + BULK + "<!--PDXSP:/lid-->");
  ok(dupe.includes("bulk bulk") && !/id="pdxsp-lid-t-one"/.test(dupe),
     "lid: a second claim on an id already in use renders inline, so two nodes can never answer to one control");
  const reclaimed = SP.applyLids('<!--PDXSP:lid id="t-one" label="Again" defer-->' + BULK + "<!--PDXSP:/lid-->", true);
  ok(/id="pdxsp-lid-t-one"/.test(reclaimed) && !reclaimed.includes("bulk bulk"),
     "lid: in reclaim mode it does rebuild that id — the case where a warm repaint is replacing the very section that owned it");

  // 10d. The proof path still resolves into a folded region.
  ok(SP.hasTarget("pdxsp-lid-t-one"),
     "lid: the spine knows a stashed lid body exists, so a caller does not conclude the content was deleted");
  const inner = SP.applyLids('<!--PDXSP:lid id="t-anchor" label="x" defer-->' +
    '<div id="evd-issue-massie-guns">' + BULK + "</div><!--PDXSP:/lid-->");
  ok(!inner.includes("evd-issue-massie-guns") && SP.hasTarget("evd-issue-massie-guns"),
     "lid: an anchor inside a folded region is not in the document yet and hasTarget still finds it — which is what keeps a receipt chip live");

  // 10e. A lid inside a deferred drawer: two levels of stash, one tap. Without the
  //      outer-container walk this returns false and the reader taps a dead control.
  const nestedLid = SP.applyLids('<!--PDXSP:lid id="nested" label="x" defer-->' + BULK + "<!--PDXSP:/lid-->");
  const outerDrawer = SP.drawer({ id: "pdxsp-t-nest", ico: "📋", title: "Outer", html: nestedLid, defer: true });
  ok(outerDrawer.includes('data-pdxsp-defer="pdxsp-t-nest"') && !outerDrawer.includes("pdxsp-lid-nested"),
     "lid: nesting a lid inside a deferred drawer stashes both — the outer body holds the lid control, the lid body holds the bulk");
  const lidHost = { _attrs: { "data-pdxsp-defer": "pdxsp-lid-nested" }, innerHTML: "",
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; } };
  const outerHost = {
    _attrs: { "data-pdxsp-defer": "pdxsp-t-nest" }, _html: "",
    get innerHTML() { return this._html; },
    // The browser turns the injected string into nodes; this is that step.
    set innerHTML(v) {
      this._html = v;
      if (v.includes('id="pdxsp-lid-nested"')) registry["pdxsp-lid-nested"] = { ...noopEl(), children: [lidHost] };
    },
    getAttribute(k) { return k in this._attrs ? this._attrs[k] : null; },
    removeAttribute(k) { delete this._attrs[k]; },
  };
  registry["pdxsp-t-nest"] = { ...noopEl(), children: [outerHost] };
  ok(SP.materialize("pdxsp-lid-nested") === true && lidHost.innerHTML.includes("bulk bulk"),
     "lid: materialize on the inner lid mounts the drawer above it first, then itself — one tap reaches content two stashes deep");
  ok(SP._deferredIds().indexOf("pdxsp-lid-nested") === -1 && SP._deferredIds().indexOf("pdxsp-t-nest") === -1,
     "lid: and both stashes are cleared, so neither can be mounted twice");

  // 10f. Wiring: assembly resolves lids before it splits, and clears them after.
  const at = CODE.slice(CODE.indexOf("function assembleTagged"), CODE.indexOf("function briefHtml"));
  ok(at.indexOf("body = applyLids(body)") !== -1 &&
     at.indexOf("body = applyLids(body)") < at.indexOf("TAG_RE.exec(body)"),
     "lid: assembleTagged resolves the markers before it splits the body, so a renderer never has to know which stage it lands in");
  ok(/function resetDefer\(\)\s*\{\s*DEFER = \{\};\s*LIDS = \{\};/.test(CODE),
     "lid: the per-render reset clears the lid registry too — profile B must not inherit profile A's claimed ids");
  ok(typeof SP.applyLids === "function",
     "lid: applyLids is exported, because the surfaces that repaint one section in place cannot go through assembleTagged");

  // 10g. Which blocks actually carry a lid, and what stays above it. This is the
  //      default-open contract, asserted rather than described.
  const nc = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const CJL = nc("consistency.js"), WAL = nc("word-action.js"), PFL = nc("profiles-full.js");
  ok(/PDXSP:lid id="or-rest"/.test(CJL) && /PDXSP:lid id="sd-rest"/.test(CJL) &&
     /PDXSP:lid id="dv-aligned"/.test(CJL),
     "lid: the Official Record, Say-vs-Do and divergence sections each fold their bulk list");
  ok(/PDXSP:lid id="wa-feeds"/.test(WAL) && !/pdxwa-feeds-h">What feeds/.test(WAL),
     "lid: the What-feeds-this-score explainer folds, and its heading became the lid label rather than being printed twice");
  ok(/PDXSP:lid id="ev-rest"/.test(PFL) && /PDXSP:lid id="ev-thin"/.test(PFL),
     "lid: the Connected Evidence grid folds its tail of cards and its no-record stances separately");
  ok(!/evd-more-btn/.test(PFL) && !/display:none;margin-top:0\.7rem/.test(PFL),
     "lid: and the hand-rolled display:none toggle it used to use is gone, so that fold now has aria-expanded like every other one");

  const or = CJL.slice(CJL.indexOf("function _orInner"), CJL.indexOf("function _orRawLink"));
  ok(or.indexOf("var body = lead;") !== -1 && or.indexOf("var lead =") < or.indexOf('PDXSP:lid id="or-rest"'),
     "lid: the Official Record keeps its leading category open — the sorts run contradiction-first, so the sharpest finding is never behind the lid");
  ok(/return head \+ _orMappedSummaryHtml\(pid\) \+ _coverageLine\(/.test(or),
     "lid: its heading, verdict chip, mapped-record summary and coverage line all stay above the fold");
  const dv = CJL.slice(CJL.indexOf("function _dvInner"), CJL.indexOf("var _divergenceInner"));
  ok(/return head \+ covDv \+ tally \+ rows \+ note;/.test(dv) && /actionRows\.join\(''\)/.test(dv) &&
     dv.indexOf("actionRows.join('')") < dv.indexOf('PDXSP:lid id="dv-aligned"'),
     "lid: divergence folds only the rows where both records agree — the diverging and mixed rows, the ones that are a finding, stay open");
  const hl = WAL.slice(WAL.indexOf("function headlineHtml"), WAL.indexOf("function lidify"));
  ok(hl.indexOf("pdxwa-num-v") < hl.indexOf("feedsHtml(pid, p, r)") &&
     hl.indexOf("pdxwa-cov") < hl.indexOf("feedsHtml(pid, p, r)"),
     "lid: the primary Word vs Action number, verdict and coverage line are all emitted before the fold, so the one score is still the first thing read");

  // 10h. The repaint paths. Both of these hand HTML to innerHTML directly, so both
  //      have to resolve markers themselves or the fold silently disappears.
  ok(/function _lidify/.test(CJL) && /SP\.applyLids\(html, true\)/.test(CJL) &&
     (CJL.match(/_lidify\(_/g) || []).length === 3,
     "lid: all three warm-refresh repaints in consistency.js run the markers through the spine in reclaim mode");
  ok(/_lidsOpenIn\(/.test(CJL) && /_lidsReopen\(/.test(CJL) && /window\.toggleDD\(id\)/.test(CJL),
     "lid: and they re-open any lid the reader had already opened, so a background refresh does not undo their tap");
  ok(/slot\.innerHTML = lidify\(fresh\)/.test(WAL) && /dd-body\.dd-open\[id\^="pdxsp-lid-"\]/.test(WAL),
     "lid: the Word vs Action repaint does the same for its own explainer fold");

  // 10i. Reach-ins. A fold is only safe if every route into it mounts it first.
  const jump = PFL.slice(PFL.indexOf("window._pdxJumpEvidence = function"), PFL.indexOf("function _pdxEvCounts"));
  ok(jump.indexOf("_pdxRevealTarget") < jump.indexOf("document.getElementById(anchorId)") &&
     /_pdxOpenClosedChain\(el\)/.test(jump),
     "lid: the evidence anchors mount their card and open the lid above it before looking for it — the chip that used to do nothing now works");
  ok((PFL.match(/^\s+_pdxOpenClosedChain\(el\);/gm) || []).length === 2 &&
     /function _pdxOpenClosedChain/.test(PFL),
     "lid: the jump rail and the evidence anchors share one chain-opening walk rather than keeping two copies of it");
  ok(/dd-body'\) && !node\.classList\.contains\('dd-open'\)/.test(PFL),
     "lid: that walk keys off .dd-body without .dd-open, which is why it opens lids and drawers alike with no list to maintain");
}

// ── 11. The verdict stage, and the rail that has to agree with it ────────────
// Phase 4 moved the sequence, not the substance. These assertions are about
// PLACEMENT: which stage each surface is tagged into, and whether the jump rail
// still describes the page it is a map of. They are source-level on purpose —
// the tags are what the assembler reads, so the tags are the product decision.
{
  const PFL = read("profiles-full.js");

  // 11a. One score, one stage. The verdict stage holds the Word vs Action read and
  //      the synthesis of that same read — and nothing else that carries a number.
  const verdictAt = PFL.indexOf("<!--PDXSP:verdict-->");
  ok(verdictAt !== -1, "verdict: the profile body declares a verdict stage");
  const afterVerdict = PFL.slice(verdictAt);
  const verdictBlock = afterVerdict.slice(0, afterVerdict.indexOf("<!--PDXSP:record-->"));
  ok(/PDXWordAction\.sectionHtml\(id, p\)/.test(verdictBlock),
     "verdict: Word vs Action is the verdict stage — the primary read is no longer the header of one system among several");
  // Phase 5 moved Connecting the Dots under the score so the synthesis could not
  // precede the thing it derives. Phase 6 removed it: its joined say→did rows, its
  // five-link chain and its chip row all restate what the score section renders in
  // its own vocabulary, and on Trump that was ~13,000 characters of markup sitting
  // directly under the number it duplicated.
  ok(!/_pdxConnectDots\(/.test(verdictBlock),
     "verdict: Connecting the Dots is mounted under the score again — the verdict stage carries ONE read,\n" +
     "    and a synthesis printed beside the score it synthesises is a second read of the same evidence");
  ok(!/_renderFollowThrough\(/.test(verdictBlock),
     "verdict: the pledge ledger is back beside the score — it is an INPUT to Word vs Action, and the\n" +
     "    verdict stage is where the one score is, not where its inputs are argued");
  ok(!/_renderAccountabilityCard\(/.test(verdictBlock),
     "verdict: the retired accountability composite is not promoted into the verdict stage either");

  // 11b. The verdict is met before the apparatus. Compared as tag positions in the
  //      template only where the template's own order matters — the sentinel for
  //      the verdict must be the FIRST stage sentinel in the body, because the text
  //      ahead of it is the letterhead and defaults to identity. Searched from the
  //      template literal onward: the doc comment above it prints a specimen
  //      sentinel to explain the convention, and that specimen is not markup.
  const bodyFrom = PFL.indexOf("const _profileBody = ");
  ok(bodyFrom !== -1, "verdict: the profile body template is where this file says it is");
  const firstTag = (PFL.slice(bodyFrom).match(/<!--PDXSP:([a-z0-9:_-]+)-->/) || [])[1];
  ok(firstTag === "verdict",
     "verdict: it is the first sentinel in the body, so the letterhead ahead of it still defaults to identity");

  // 11c. The rail has to read in page order or the scroll-spy walks backwards.
  //      Pills are pushed in one block; their push order IS the rail order.
  const railFrom = PFL.indexOf("const _navItems = [];");
  const railTo = PFL.indexOf("// A single pill isn't a \"map\"");
  ok(railFrom !== -1 && railTo > railFrom, "rail: the pill list is built in one contiguous block");
  const rail = PFL.slice(railFrom, railTo);
  const pillAt = (t) => rail.indexOf("'" + t + "'");
  const pills = [
    ["pdxsec-wordaction", "verdict"],
    ["pdxsec-positions", "signature"],
    ["pdxsec-official-record", "record"],
    ["pdxsec-controversies", "tension"],
    ["pdxsec-evidence", "receipts"],
    ["pdxsec-funding", "money"],
    ["pdxsec-match", "you"],
    ["pdxsec-activity", "drawers"],
  ];
  pills.forEach((pill) => {
    ok(pillAt(pill[0]) !== -1, `rail: the ${pill[1]} stage has a pill (${pill[0]})`);
  });
  let monotonic = true;
  for (let i = 1; i < pills.length; i++) {
    if (pillAt(pills[i][0]) < pillAt(pills[i - 1][0])) monotonic = false;
  }
  ok(monotonic,
     "rail: pills are pushed in the order a reader meets their sections — verdict, stances, record, flashpoints, receipts, money, you, drawers");
  // The stances pill aims at #pdxsec-positions, not #pdxsec-stances. Stances &
  // Connections renders only when the row model has something to say, while the
  // positions anchor is always mounted in the same stage — and _pdxNavJump bails
  // silently on a missing id, so a pill aimed at the conditional anchor would be
  // a dead pill on exactly the profiles with the least to show.
  ok(!/'pdxsec-stances'/.test(rail),
     "rail: a pill aims at #pdxsec-stances, an anchor that does not render on every profile —\n" +
     "    _pdxNavJump no-ops on a missing target, so that pill dead-ends silently");
  ok(pillAt("pdxsec-wordaction") < pillAt("pdxsec-official-record"),
     "rail: Word vs Action still leads the rail, and now leads the page too");
  // The record stage used to carry THREE pills — "Promises" (a rate), "Record" (a
  // second pledge count aimed into a drawer) and "Enactments" (an executive count).
  // Phase 5 cut that to one. Phase 6 cut the surviving pledge pill too: a rail entry
  // reading "Promises · 6K · 6B · 2P" one pill away from the ⚖️ percentage is a
  // second scoreboard in the header strip, whatever it links to.
  ok(pillAt("pdxsec-score") === -1,
     "rail: the pledge pill is back in the header strip — a kept/broken tally beside the one\n" +
     "    percentage reads as a rival tally of the same politician");
  ok(pillAt("pdxsec-record") === -1,
     "rail: the old drawer-bound Record pill is back — that is a second pledge count posing as a\n" +
     "    record lane");
  ok(!/PDXExecRecordUI\.navPill/.test(rail),
     "rail: the Enactments pill is back — the executive lane lives inside the Official Record now,\n" +
     "    so it must not also claim a rail entry of its own");
  ok(rail.indexOf("action: 'stance'") > pillAt("pdxsec-positions") &&
     rail.indexOf("action: 'stance'") < pillAt("pdxsec-evidence"),
     "rail: Full Report stays attached to Positions — it is the see-everything extension of that pill, not a stage of its own");
  // Full Report carries no anchor: railOrder ranks it by the pill ahead of it, so it
  // is only ever correctly placed if it cannot ship without Positions. They are
  // pushed under one gate, and that shared gate is the guarantee.
  ok(rail.slice(pillAt("pdxsec-positions"), rail.indexOf("action: 'stance'")).indexOf("\n    }") === -1,
     "rail: the Full Report pill has left the Positions gate — an anchorless pill that can ship without\n" +
     "    the pill it inherits its rank from will land somewhere arbitrary in the rail");
  // Exactly one percentage in the rail, still. Reordering must not have smuggled
  // the pledge rate back in beside the primary read.
  ok((rail.match(/value: _waVal/g) || []).length === 1 && !/value: scoreNum \+ '%'/.test(rail),
     "rail: exactly one pill reports a percentage — the reorder did not reintroduce a rival score");

  // 11d. Nothing moved into or out of a drawer. Phase 4 is order-only, so every
  //      drawer spec and every deferral flag must be exactly as Phase 2 left them.
  const specs = [...PFL.matchAll(/\{ id: '([a-z]+)', stage: '([a-z]+)',/g)].map((m) => m[1] + ":" + m[2]);
  ok(JSON.stringify(specs) === JSON.stringify([
    "positions:drawers", "votes:drawers", "promises:drawers", "money:drawers", "activity:drawers",
  ]), "keep: the five drawers are untouched and still land in the full-record stage");
  ok((PFL.match(/^\s+defer: true,$/gm) || []).length === 4,
     "keep: the same four drawers are still deferred — the reorder did not un-defer a heavy inner");
}


// ── 12. The rail derives, and the spy stopped measuring ──────────────────────
// The jump rail had two independent fragilities. Its ORDER was the order the
// pill-pushing code happened to run in — a hand-maintained second copy of STAGES,
// free to drift, and it had drifted. Its ACTIVE STATE came from a rAF-throttled
// scroll handler that called getBoundingClientRect() on the modal body and on every
// tracked anchor, every frame, across the largest subtree in the app.
//
// Both are now derived. The order comes from an anchor→stage registry beside STAGES
// and, at runtime, from real document position. The active state comes from
// IntersectionObserver callbacks that arrive with their geometry already measured.
// Neither derivation announces itself when it breaks — a drifted rail still renders
// and a dead spy still scrolls — so both are pinned here.
{
  const PFR = read("profiles-full.js")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const SPS = read("profile-spine.js");

  // 12a. The registry agrees with the template. This is the assertion that makes
  //      the derivation trustworthy: the map is only a source of truth if it says
  //      what the page actually does. Each anchor literal in the profile body is
  //      resolved to the nearest preceding sentinel, with dw:<id> resolved through
  //      the drawer specs (all five declare the full-record stage).
  const bodySrc = PFR.slice(PFR.indexOf("const _profileBody = "));
  const realStage = {};
  {
    const re = /<!--PDXSP:([a-z0-9:_-]+)-->|id="(pdxsec-[a-z-]+)"/g;
    let m, cur = "identity";
    while ((m = re.exec(bodySrc)) !== null) {
      if (m[1]) { cur = m[1]; continue; }
      realStage[m[2]] = cur.startsWith("dw:") ? "drawers" : cur;
    }
  }
  // Five anchors are emitted by other modules, so the template only shows the call.
  // The stage of the call is the stage of the anchor.
  const external = [
    ["pdxsec-wordaction", "PDXWordAction.sectionHtml", "word-action.js"],
    ["pdxsec-stances", "PDXConsistency.stancesSectionHtml", "consistency.js"],
    ["pdxsec-controversies", "_renderControversies", "controversies.js"],
    ["pdxsec-funding", "_pdxFundingSection", "index.html"],
  ];
  {
    const re = /<!--PDXSP:([a-z0-9:_-]+)-->|(PDXWordAction\.sectionHtml|PDXConsistency\.stancesSectionHtml|_renderControversies|_pdxFundingSection)\(/g;
    let m, cur = "identity";
    while ((m = re.exec(bodySrc)) !== null) {
      if (m[1]) { cur = m[1]; continue; }
      const hit = external.find((x) => x[1] === m[2]);
      if (hit) realStage[hit[0]] = cur.startsWith("dw:") ? "drawers" : cur;
    }
  }
  // The voting anchor is emitted by voting-record.js into the votes drawer.
  ok(/<span id="pdxsec-voting"/.test(read("voting-record.js")),
     "rail: voting-record.js still emits the anchor its Votes pill aims at");
  realStage["pdxsec-voting"] = "drawers";

  const anchors = Object.keys(realStage);
  ok(anchors.length >= 17,
     "rail: the anchor scan found the profile's jump anchors (" + anchors.length + ")");
  let wrong = [];
  anchors.forEach((a) => {
    const reg = SP.targetStage(a);
    if (reg !== realStage[a]) wrong.push(a + ": registry " + reg + " vs. page " + realStage[a]);
  });
  ok(wrong.length === 0,
     "rail: every registered anchor names the stage it really sits in — " + (wrong.join("; ") || "all agree"));
  ok(SP.targetStage("pdxsec-record") === "drawers",
     "rail: the Record pill is registered against the full-record stage, because its destination is inside the promises drawer — the pill goes where it sends you");
  ok(SP.targetStage("pdxsec-wordaction") === "verdict",
     "rail: and the primary read is registered against the verdict stage, so it leads the rail by derivation rather than by push position");

  // 12b. Every target a pill can carry is registered, or it would silently sort to
  //      the deep end. Collected from the rail block plus the two pills built
  //      elsewhere (Enactments via PDXExecRecordUI, Votes via voting-record.js).
  const railBlock = PFR.slice(PFR.indexOf("const _navItems = [];"), PFR.indexOf("const _navOrdered"));
  const pillTargets = [...railBlock.matchAll(/target: '(pdxsec-[a-z-]+)'/g)].map((m) => m[1]);
  ok(pillTargets.length >= 8, "rail: the pill block still declares its targets as literals");
  const unregistered = pillTargets
    .concat(["pdxsec-exec-record", "pdxsec-voting"])
    .filter((t) => !SP.targetStage(t));
  ok(unregistered.length === 0,
     "rail: no pill aims at an unregistered anchor — " + (unregistered.join(", ") || "all registered"));

  // 12c. railOrder's contract. Stable within a stage, action pills ride with the
  //      pill they follow, an unknown target is demoted rather than promoted, and a
  //      malformed list does not throw the rail away.
  const keys = (l) => l.map((x) => x.k);
  ok(JSON.stringify(keys(SP.railOrder([
    { k: "money", target: "pdxsec-funding" },
    { k: "verdict", target: "pdxsec-wordaction" },
  ]))) === JSON.stringify(["verdict", "money"]),
     "railOrder: a list pushed in the wrong order still comes out in spine order");
  ok(JSON.stringify(keys(SP.railOrder([
    { k: "score", target: "pdxsec-score" },
    { k: "record", target: "pdxsec-record" },
  ]))) === JSON.stringify(["score", "record"]),
     "railOrder: two pills in one stage keep their push order — the sort is stable, so the source still reads top to bottom");
  // A pill with no anchor and nothing anchored ahead of it has declared no position,
  // so it sinks rather than floating above the verdict.
  ok(JSON.stringify(keys(SP.railOrder([
    { k: "orphan" },
    { k: "verdict", target: "pdxsec-wordaction" },
  ]))) === JSON.stringify(["verdict", "orphan"]),
     "railOrder: a leading action pill with nothing to inherit from sinks to the deep end");
  ok(JSON.stringify(keys(SP.railOrder([
    { k: "money", target: "pdxsec-funding" },
    { k: "positions", target: "pdxsec-positions" },
    { k: "report" },
    { k: "verdict", target: "pdxsec-wordaction" },
  ]))) === JSON.stringify(["verdict", "positions", "report", "money"]),
     "railOrder: the Full Report action pill has no anchor of its own, so it inherits the rank of the pill it follows and stays attached to Positions");
  ok(JSON.stringify(keys(SP.railOrder([
    { k: "mystery", target: "pdxsec-not-a-real-anchor" },
    { k: "money", target: "pdxsec-funding" },
  ]))) === JSON.stringify(["money", "mystery"]),
     "railOrder: an unregistered target sorts to the deep end, never ahead of the verdict");
  ok(SP.railOrder([]).length === 0 && SP.railOrder().length === 0 &&
     SP.railOrder([null, { k: "x", target: "pdxsec-match" }]).length === 1,
     "railOrder: an empty, absent or hole-punched list is survivable — the rail is a nicety and must never throw");

  // Any one profile shows a SUBSET of the roster, because most pills self-gate. The
  // sort key is the stage rank and the sort is stable, so every subset has to come
  // out as a subsequence of the full order. Checked by exhaustion rather than
  // asserted, which is what makes the claim cover Massie and every other profile.
  //
  // Anchored pills only. The one action pill has no anchor and is ranked RELATIVE to
  // the pill ahead of it, so its position is not subset-invariant by construction —
  // drop Positions and the Full Report pill genuinely has nowhere to be. That pill is
  // covered by its own assertions above and by the paired-gating check below, which
  // is the property that actually protects it: it never ships without Positions.
  {
    const roster = ["pdxsec-wordaction", "pdxsec-official-record", "pdxsec-controversies",
      "pdxsec-positions", "pdxsec-evidence", "pdxsec-match", "pdxsec-funding",
      "pdxsec-score", "pdxsec-record", "pdxsec-exec-record", "pdxsec-activity"]
      .map((t, i) => ({ k: i, target: t }));
    const full = SP.railOrder(roster);
    let subsetOk = true;
    for (let mask = 0; mask < (1 << roster.length); mask++) {
      const sub = roster.filter((_, i) => mask & (1 << i));
      const got = SP.railOrder(sub);
      const want = full.filter((x) => sub.indexOf(x) !== -1);
      if (got.length !== want.length || got.some((x, i) => x !== want[i])) { subsetOk = false; break; }
    }
    ok(subsetOk,
       "railOrder: all " + (1 << roster.length) + " possible pill subsets come out as a subsequence of the full derived order, so a thin profile's rail is ordered too");
    // And wherever Positions survives, the action pill it carries stays welded to it.
    let weldedOk = true;
    for (let mask = 0; mask < (1 << roster.length); mask++) {
      const sub = roster.filter((_, i) => mask & (1 << i));
      const pos = sub.filter((x) => x.target === "pdxsec-positions");
      if (!pos.length) continue;
      const withReport = sub.slice();
      withReport.splice(withReport.indexOf(pos[0]) + 1, 0, { k: "report" });
      const out = SP.railOrder(withReport).map((x) => x.k);
      if (out[out.indexOf(pos[0].k) + 1] !== "report") { weldedOk = false; break; }
    }
    ok(weldedOk,
       "railOrder: in every subset that shows Positions, the Full Report pill it carries lands directly\n" +
       "    after it — an action pill rides with its host or it is a stray link");
  }

  // 12d. The rail is BUILT through the derivation, not merely capable of it. A
  //      railOrder that nothing calls is a comment.
  ok(/PDXProfileSpine\.railOrder\(_navItems\)/.test(PFR),
     "rail: the profile sorts its pill list through the spine instead of trusting the push order");
  ok(/_navOrdered\.length >= 2/.test(PFR) && /_navOrdered\.map\(function/.test(PFR) &&
     !/_navItems\.map\(function/.test(PFR),
     "rail: and it renders the SORTED list — an unsorted render would make the derivation decorative");
  ok(/typeof window\.PDXProfileSpine\.railOrder === 'function'[\s\S]{0,140}: _navItems/.test(PFR),
     "rail: with the unsorted list as the fallback, so a missing spine costs the order and not the rail");

  // 12e. The spy no longer measures. Every layout-forcing read that used to happen
  //      per frame is gone from the callback path; the one that survives runs once
  //      per arm, to find the height of the sticky rail.
  const spy = PFR.slice(PFR.indexOf("window._pdxInitProfileNav = function"),
                        PFR.indexOf("function _pdxNavSyncOrder"));
  ok(spy.length > 400, "spy: the arm function is where this file says it is");
  ok(/new IntersectionObserver\(/.test(spy),
     "spy: the active pill is driven by IntersectionObserver");
  ok(!/getBoundingClientRect\(/.test(spy),
     "spy: and it never calls getBoundingClientRect — that was a forced layout flush per anchor per frame, on the one gesture where a phone has no headroom");
  ok(!/addEventListener\(\s*'scroll'/.test(spy) && !/requestAnimationFrame/.test(spy),
     "spy: the per-frame scroll listener is gone entirely, not merely throttled harder");
  ok(!/\.scrollHeight/.test(spy) && !/\.clientHeight/.test(spy) && !/\.scrollTop/.test(spy),
     "spy: and the bottom-of-page test no longer reads scrollHeight, which forces layout every time it is asked");
  ok((spy.match(/\.offsetHeight/g) || []).length === 1,
     "spy: exactly one layout read survives — the rail height, taken once per arm rather than once per frame");
  ok(/root: body/.test(spy) && /rootMargin: \(-line\)/.test(spy),
     "spy: the observer root is the modal body clipped by the rail height, so a callback fires exactly when an anchor crosses the line a reader reads from");
  ok(/e\.rootBounds/.test(spy) && /e\.boundingClientRect\.top/.test(spy),
     "spy: and the crossing test compares the two rects the entry already carries — the same predicate as before, measured by the compositor instead of by us");
  ok(/rootBounds \? [\s\S]{0,80}: null/.test(spy) && /!e\.isIntersecting/.test(spy),
     "spy: with a fallback for the case where rootBounds is null, so the rail degrades instead of inverting");
  ok(/typeof window\.IntersectionObserver !== 'function'/.test(spy),
     "spy: and a path for a browser without IntersectionObserver at all — every pill still scrolls, only the highlight is lost");

  // 12f. Order at runtime comes from the document, which is the only authority that
  //      cannot drift. This is what catches a pill appended after the build.
  ok(/compareDocumentPosition/.test(spy),
     "spy: the tracked anchors are sorted by real document position, so the active index can only move forwards as the reader scrolls down");
  const sync = PFR.slice(PFR.indexOf("function _pdxNavSyncOrder"), PFR.indexOf("function _pdxNavTeardown"));
  ok(/appendChild/.test(sync) && /if \(same\) return;/.test(sync),
     "spy: pill nodes are moved to match that order, and only when they actually disagree — re-appending children that are already in place still moves them, and the track is a horizontally scrolled row");
  ok(/rank\[t\] !== undefined/.test(sync) && /cur\.pills\.push\(b\)/.test(sync),
     "spy: action pills travel with the section pill they follow, so sorting the rail cannot detach Full Report from Positions");
  ok(/_pdxNavRearmSoon/.test(read("voting-record.js")),
     "spy: the late-injected Votes pill re-arms the rail, which is what sorts it into place once its drawer has mounted");

  // 12g. Reachability. The jump still reveals before it measures, in that order:
  //      mount a deferred drawer, open every closed lid above the target, and only
  //      then compute the offset, so it reflects the expanded layout.
  const jumpFn = PFR.slice(PFR.indexOf("window._pdxNavJump = function"),
                           PFR.indexOf("window._pdxNavRearmSoon = function"));
  const iReveal = jumpFn.indexOf("_pdxRevealTarget(targetId)");
  const iChain = jumpFn.indexOf("_pdxOpenClosedChain(el)");
  const iMeasure = jumpFn.indexOf("getBoundingClientRect");
  ok(iReveal !== -1 && iChain > iReveal && iMeasure > iChain,
     "reach: the jump still mounts a deferred drawer, then opens every closed lid above the target, then measures — measuring first would scroll to a collapsed box");
  ok(/_pdxNavRepaint\(true\)/.test(jumpFn),
     "reach: and the jump forces one repaint when its suppression window lifts, so the rail resyncs to where the scroll actually settled instead of keeping the pill the tap lit");

  // 12h. Coalescing. Three callers re-arm the rail; a burst of them must cost one.
  const soon = PFR.slice(PFR.indexOf("window._pdxNavRearmSoon = function"),
                         PFR.indexOf("window._pdxInitProfileNav = function"));
  ok(/_pdxNavRearmPending/.test(soon) && /requestAnimationFrame/.test(soon),
     "coalesce: re-arms collapse into one animation frame, so opening three drawers in a row costs one re-arm and it reads layout after the mutation settles");
  ok(/_pdxNavTeardown\(\);/.test(spy),
     "coalesce: arming tears the previous observers down first, so re-arming can never stack two observers on one profile");
  const closeFn = PFR.slice(PFR.indexOf("function closeModal()"), PFR.indexOf("var _pdxPendingCharts"));
  ok(/_pdxNavTeardown\(\)/.test(closeFn) && !/removeEventListener\('scroll'/.test(closeFn),
     "coalesce: and closing the profile disconnects them, so nothing is left observing a detached subtree");
  ok(/disconnect\(\)/.test(PFR.slice(PFR.indexOf("function _pdxNavTeardown"))),
     "coalesce: teardown actually disconnects rather than dropping the reference and leaving the observer live");

  // 12i. The spine still owns the decision. Phase 5 derives the rail FROM the
  //      order; it must not have quietly restated it.
  ok(!/var RAIL_ORDER|railSequence|PILL_ORDER/.test(SPS),
     "keep: there is no second ordered list of pills anywhere in the spine — STAGES plus the anchor registry is the whole declaration");
  ok(SP.STAGE_KEYS.join(">") === "identity>brief>verdict>signature>record>tension>receipts>money>you>drawers",
     "keep: and the stage order is the locked spine — the score, then what they stand for, then the\n" +
     "    record that tests it, then the heat, then the proof, and money stays a lens of its own at the tail");
}


if (failures.length) {
  console.error("\n✗ profile spine: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ profile spine: all " + passed + " assertions passed");
