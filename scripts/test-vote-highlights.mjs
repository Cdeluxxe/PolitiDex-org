#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Voting Record Highlights — the sample must not stand in for the record
// ─────────────────────────────────────────────────────────────────────────────
// The highlights block above the full voting record is built synchronously from a
// hand-curated map of three to six annotated votes. That sample is worth keeping:
// each row carries a why-this-matters line tying the vote to a promise and to who
// funded the campaign. What it must never do is READ as the member's legislative
// history — a three-chip kept/partial/broken tally over five hand-picked rows,
// under the heading "Voting Record Highlights", is the closest thing on a profile
// to a rival score assembled out of a sample, while the real record (hundreds of
// roll calls, already feeding Word vs Action) sits one fetch away.
//
// So the section has two layers: a live slot filled from the real record, and the
// curated selection, labelled as a selection. This gates both halves:
//
//   1. the live slot hydrates from the SYNC cache only (never its own fetch),
//   2. it fails closed — no record warm, no record at all → nothing painted,
//   3. it prints counts, dates and positions but never a percentage,
//   4. it prefers issue-mapped records, newest first,
//   5. it is idempotent, and re-paints only when the record grows,
//   6. the curated layer names itself a selection and scopes its own tally,
//   7. the warm signal that triggers it is actually emitted.
//
//   node scripts/test-vote-highlights.mjs
//
// Runs the real hydrator: the _VRHI_* region of profiles-full.js is evaluated in a
// node:vm against a minimal fake DOM. No network, no DB, no browser.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(ROOT, f), "utf8");

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const eq = (a, b, m) => ok(a === b, m + `\n    expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const PF = read("profiles-full.js");
const VR = read("voting-record.js");
const WA = read("word-action.js");
const CSS = read("app.css");

// ── The hydrator, lifted out and run for real ────────────────────────────────
// Sliced rather than imported because profiles-full.js is a single global script
// that touches the DOM at load. The slice is self-contained: it closes over
// _pdxEyeEsc (supplied below) and reads everything else off window.
const REGION_START = "  var _VRHI_POS = {";
const REGION_END = "  function openModal(id) {";
const a = PF.indexOf(REGION_START), b = PF.indexOf(REGION_END);
ok(a !== -1 && b > a, "harness: the hydrator region moved — fix the slice bounds in this test");
const REGION = PF.slice(a, b);

function fakeSlot() {
  return {
    attrs: {}, innerHTML: "", hidden: true,
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
  };
}
function fakeHost(pid) {
  const slot = fakeSlot();
  const wait = fakeSlot();
  wait.hidden = false; // the cold-open placeholder ships visible in the markup
  return {
    slot, wait, classes: [],
    getAttribute(k) { return k === "data-pdx-vrhi-pid" ? pid : null; },
    querySelector(sel) {
      if (sel === ".pdx-vrhi-live") return slot;
      if (sel === ".pdx-vrhi-wait") return wait;
      return null;
    },
    classList: { add(c) { this.owner.classes.push(c); } },
  };
}

// records: what PDXVotingRecord.memberRecords() hands back. opts lets a scenario
// drop a capability (no position map, no counts helper) to prove the fallbacks.
function run(records, opts) {
  opts = opts || {};
  const host = opts.noHost ? null : fakeHost(opts.pid === undefined ? "massie" : opts.pid);
  if (host) host.classList.owner = host;
  const events = [];
  const ctx = {
    console, JSON, Math, Date, String, Array, Object, RegExp, Number, isNaN,
    parseInt, parseFloat, setTimeout, clearTimeout,
    document: { querySelector: (sel) => (sel === "[data-pdx-vrhi-pid]" ? host : null) },
    addEventListener: (t) => events.push(t),
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.PROFILES = { massie: { name: "Thomas Massie" } };
  ctx.CMP_DATA = {};
  ctx.PDXVotingRecord = { memberRecords: () => records };
  if (opts.noVR) delete ctx.PDXVotingRecord;
  ctx._issueLabel = (k) => ({ surveillance: "Surveillance", spending: "Spending" }[k] || k);
  if (!opts.noCounts) {
    ctx._pdxRecordMappedCounts = () => {
      const seen = {};
      let votes = 0;
      (records || []).forEach((r) => {
        let mapped = false;
        (r.issues || []).forEach((m) => { if (m && m.issueKey) { mapped = true; seen[m.issueKey] = 1; } });
        if (mapped) votes++;
      });
      return { votes, issues: Object.keys(seen).length, total: (records || []).length, issueKeys: Object.keys(seen) };
    };
  }
  if (!opts.noStances) {
    ctx._polPositionMap = () => ({ surveillance: { stance: "oppose" } });
    ctx._voteEffectiveSupport = (it) => (it.position === "yea");
    ctx._stanceVoteVerdict = (stance, eff) =>
      (eff === null ? "no_position" : (stance === "oppose") === (eff === false) ? "consistent" : "contradicts");
  }
  const sb = vm.createContext(ctx);
  // The one thing the slice closes over from its file rather than from window.
  vm.runInContext("function _pdxEyeEsc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}", sb);
  vm.runInContext(REGION, sb, { filename: "vrhi-region.js" });
  ctx._pdxHydrateVoteHighlights(opts.settled ? { settled: true } : undefined);
  return { ctx, host, slot: host && host.slot, wait: host && host.wait, events };
}

const rec = (o) => Object.assign({
  kind: "vote", number: "H.R. 1", title: "A Bill", date: "2024-03-01",
  position: "nay", issues: [{ issueKey: "surveillance", supportMeaning: "support" }],
}, o);

// ── 1. It paints the real record, by name and by count ───────────────────────
{
  const { slot, host } = run([
    rec({ number: "H.R. 7888", title: "FISA Reauthorization", date: "2024-04-12" }),
    rec({ number: "H.R. 2", title: "Secure the Border Act", date: "2023-05-11", position: "yea" }),
    rec({ number: "H.R. 9", title: "An Older Bill", date: "2022-01-04" }),
  ]);
  ok(slot.hidden === false, "the live slot stays hidden with three warm records — the record is there and unshown");
  ok(/H\.R\. 7888/.test(slot.innerHTML) && /FISA Reauthorization/.test(slot.innerHTML),
     "the live layer does not name the actual bill — a highlight the reader cannot look up is not a receipt");
  ok(/3 records on file/.test(slot.innerHTML),
     "the live layer does not say how much record there is, which is the whole point of it");
  ok(/mapped to 1 tracked issue\b/.test(slot.innerHTML),
     "the live layer does not say how much of the record is checkable against a stated position");
  ok(/Thomas said/.test(slot.innerHTML),
     "the entry line does not name whose word the votes are checked against");
  ok(host.classes.indexOf("pdx-vrhi-haslive") !== -1,
     "the section is not marked as having a live layer, so the curated sample can never be demoted beneath it");
  ok(/_pdxNavJump\('pdxsec-voting'\)/.test(slot.innerHTML),
     "the live layer does not offer a way into the full filterable record");
}

// ── 2. No second score. Counts, never a rate ─────────────────────────────────
{
  const { slot } = run([rec({}), rec({ number: "H.R. 3", position: "yea" })]);
  ok(!/%/.test(slot.innerHTML),
     "the live layer prints a percentage — Word vs Action is the only score on a profile");
  ok(!/\bscore\b/i.test(slot.innerHTML),
     "the live layer calls something a score");
  ok(!/Kept Word|Broke Word/.test(slot.innerHTML),
     "the live layer re-runs the curated kept/broken tally over the live set — that is a second aggregate\n" +
     "    judgement, and the one aggregate judgement is Word vs Action");
}

// ── 3. Fails closed ──────────────────────────────────────────────────────────
{
  const cold = run(null);
  eq(cold.slot.innerHTML, "", "nothing warm in the sync cache and the slot painted anyway");
  ok(cold.slot.hidden === true, "nothing warm and the slot revealed itself empty");

  const empty = run([]);
  eq(empty.slot.innerHTML, "", "a member with an empty record (challenger, appointee) got a live layer");

  ok(run(null, { noHost: true }).host === null, "harness sanity: the no-host scenario built a host");
  // No profile document, no stance map, no counts helper: still paints, still honest.
  const bare = run([rec({})], { noStances: true, noCounts: true, pid: "unknown" });
  ok(bare.slot.hidden === false && /1 record on file/.test(bare.slot.innerHTML),
     "the live layer needs the stance map and the counts helper to render at all — it should degrade to the\n" +
     "    plain record, which is still true");
  ok(!/Matches stance|Against stance/.test(bare.slot.innerHTML),
     "a per-vote stance verdict appeared with no stated stance to compare against");
  ok(!/undefined|NaN|null/.test(bare.slot.innerHTML),
     "the degraded live layer leaks undefined/NaN into the page");
}

// ── 4. Newest first, and issue-mapped records preferred ──────────────────────
{
  const { slot } = run([
    rec({ number: "OLD", date: "2019-01-01" }),
    rec({ number: "NEW", date: "2025-06-06" }),
    rec({ number: "MID", date: "2022-02-02" }),
    rec({ number: "UNMAPPED", date: "2026-01-01", issues: [] }),
  ]);
  const order = ["NEW", "MID", "OLD"].map((n) => slot.innerHTML.indexOf(n));
  ok(order[0] !== -1 && order[0] < order[1] && order[1] < order[2],
     "the live cards are not newest-first — a highlights block that leads with 2019 reads as stale data");
  ok(slot.innerHTML.indexOf("UNMAPPED") === -1,
     "an unmapped record outranked mapped ones, even though only a mapped vote can be checked against a stance");
  // …but an entirely unmapped record still shows something rather than nothing.
  const unmapped = run([rec({ number: "H.R. 55", date: "2024-01-01", issues: [] })]);
  ok(/H\.R\. 55/.test(unmapped.slot.innerHTML),
     "a member whose record is real but not yet issue-mapped gets an empty slot instead of their own votes");
}

// ── 5. Idempotent, and re-paints only when the record grows ──────────────────
{
  const records = [rec({}), rec({ number: "H.R. 3" })];
  const { ctx, slot } = run(records);
  const first = slot.innerHTML;
  slot.innerHTML = "TOUCHED";
  ctx._pdxHydrateVoteHighlights();
  eq(slot.innerHTML, "TOUCHED", "a second hydration on an unchanged record re-painted, throwing away DOM state");
  records.push(rec({ number: "H.R. 4" }));
  ctx._pdxHydrateVoteHighlights();
  ok(slot.innerHTML !== "TOUCHED" && /3 records on file/.test(slot.innerHTML),
     "the record grew (a later page loaded) and the live layer kept showing the old count");
  ok(first.length > 0, "harness sanity: the first paint was empty");
}

// ── 6. It reads the cache — it never fetches ─────────────────────────────────
{
  const region = REGION;
  ok(!/fetchMember|fetchPack|fetch\(/.test(region),
     "the hydrator fetches. It runs on profile open and on every warm event; the record it needs is already\n" +
     "    being fetched by voting-record.js, and a second request per open is a real cost for no new data");
  ok(/memberRecords/.test(region),
     "the hydrator does not read PDXVotingRecord's sync cache, which is the one source it is allowed");
  ok(/try \{/.test(region) && /catch \(e\) \{/.test(region),
     "the hydrator is not wrapped — a throw here would take out the curated selection below it too");
}

// ── 7. Wiring: the section, the hook and the warm signal ─────────────────────
{
  ok(/data-pdx-vrhi-pid="' \+ id \+ '"/.test(PF),
     "the highlights section does not carry the politician id, so the hydrator cannot tell whose record it holds");
  ok(/'<div class="pdx-vrhi-live" hidden><\/div>'/.test(PF),
     "the highlights section has no live slot to fill");
  ok(PF.indexOf('class="pdx-vrhi-live"') < PF.indexOf('class="pdx-vrhi-curated"'),
     "the curated sample renders ABOVE the live record — the sample must not be the first thing read");
  ok(/Annotated selection/.test(PF),
     "the curated layer does not name itself a selection, so five hand-picked rows still read as the record");
  ok(/These counts cover the ' \+ vr\.length \+ ' annotated vote/.test(PF),
     "the curated tally does not scope itself to the annotated rows — an unscoped kept/broken tally over a\n" +
     "    sample is a claim about the whole voting history");
  const open = PF.slice(PF.indexOf("function openModal(id) {"));
  ok(/_pdxHydrateVoteHighlights\(\)/.test(open),
     "opening a profile never calls the hydrator, so an already-warm record is ignored until something else warms");
  ok(open.indexOf("_pdxInitVotingRecord()") < open.indexOf("_pdxHydrateVoteHighlights()"),
     "the hydrator runs before the record load is even kicked off");
  ok(/addEventListener\('pdx-consistency-warm'/.test(PF) && /addEventListener\('pdx-voting-warm'/.test(PF),
     "the hydrator listens for only one of the two warm signals, so whichever path lands first decides whether\n" +
     "    the live layer ever appears");
  ok(/__pdxVrhiBound/.test(PF),
     "the warm listeners are bound unguarded — profiles-full.js re-evaluated would stack duplicates");
  // And the signal exists on the other side.
  const noteAt = VR.indexOf("PDXVotingRecord.noteMember(job.id, _state.items)");
  ok(noteAt !== -1 && /pdx-voting-warm/.test(VR.slice(noteAt, noteAt + 900)),
     "voting-record.js warms the sync cache without announcing it, so a surface built before the fetch landed\n" +
     "    has no way to know it can stop guessing");
  ok(VR.indexOf("pdx-voting-warm") > noteAt,
     "the warm event fires BEFORE the cache it announces is populated");
}

// ── 8. The styles ship ───────────────────────────────────────────────────────
{
  ok(/\.pdx-vrhi-live \{/.test(CSS) && /\.pdx-vrhi-live\[hidden\] \{ display: none; \}/.test(CSS),
     "the live layer has no styles, or no rule keeping the empty slot from occupying space");
  ok(/\.pdx-vrhi-haslive \.pdx-vrhi-curated \{/.test(CSS),
     "there is no rule demoting the curated sample once the live record is present");
  ok(/@media \(max-width: 480px\) \{[^]*?\.pdx-vrhi-live \{/.test(CSS),
     "the live layer has no phone pass — this section sits mid-profile on the surface it was reported on");
}

// ── 9. The cold-open placeholder ─────────────────────────────────────────────
// One quiet line while the record is in flight, gone the instant it lands, and
// never a number. The failure this guards is a permanent "loading…" on a member
// whose record simply does not exist — a status line that outlives its status.
{
  // Cold: the record has not arrived and no load has landed yet. The line stays.
  const cold = run(null);
  ok(cold.wait.hidden === false,
     "the placeholder was retired on a cold open with nothing settled — the section opens on the curated\n" +
     "    sample with no sign the real record is still coming");
  eq(cold.slot.innerHTML, "", "harness sanity: the cold scenario painted a live panel");

  // Warm: the record is there. The line must be gone in the same pass that paints.
  const warm = run([rec({}), rec({ number: "H.R. 3" })]);
  ok(warm.wait.hidden === true,
     "the placeholder survived alongside a painted live panel — 'loading' sitting above loaded data");

  // Settled and still nothing: the load landed, this member has no roll call.
  const none = run([], { settled: true });
  ok(none.wait.hidden === true,
     "a load landed and produced no records, and the placeholder is still claiming to be loading — that is\n" +
     "    the one state where the line becomes untrue and it is the state it must clear itself in");
  ok(none.slot.innerHTML === "" && none.host.classes.indexOf("pdx-vrhi-haslive") === -1,
     "clearing the placeholder on an empty settled record also painted or marked a live layer");

  // A speculative re-check must NOT conclude the record is absent.
  ok(run(null, { settled: false }).wait.hidden === false,
     "an unsettled re-check cleared the placeholder — consistency.js can warm before the roll-call fetch\n" +
     "    lands, and dropping the line there hides a load that is still in flight");

  // No record module at all: nothing is ever coming.
  ok(run(null, { noVR: true }).wait.hidden === true,
     "PDXVotingRecord is absent entirely and the placeholder still promises a record that can never load");

  // It never invents anything — and it speaks with the same voice as the hero, which
  // is waiting on the same roll-call fetch and can be on screen at the same time.
  ok(/class="pdx-vrhi-wait">Loading the record…</.test(PF),
     "the cold-open placeholder copy is missing, or has drifted from the phrase the hero uses while the\n" +
     "    same fetch is in flight — two wordings for one wait read as two jobs in progress");
  ok(/sub = 'Loading the record…'/.test(WA),
     "the hero's warming sub-line no longer uses the shared waiting phrase");
  const waitLine = PF.slice(PF.indexOf('class="pdx-vrhi-wait"'), PF.indexOf('class="pdx-vrhi-wait"') + 120);
  ok(!/\d/.test(waitLine.replace(/pdx-vrhi-wait/g, "")),
     "the placeholder carries a digit — with no warm record there is no count that is true yet");
  ok(PF.indexOf('class="pdx-vrhi-live"') < PF.indexOf('class="pdx-vrhi-wait"'),
     "the placeholder renders above the live slot, so the panel appears below the line it replaces");
  // Only the voting warm may settle it.
  const bind = PF.slice(PF.indexOf("__pdxVrhiBound"), PF.indexOf("__pdxVrhiBound") + 700);
  ok(/'pdx-voting-warm', _vrhiSettled/.test(bind),
     "the voting warm does not settle the placeholder, so a member with no record shows the line forever");
  ok(/'pdx-consistency-warm', _vrhiWarm/.test(bind),
     "the consistency warm was wired to the settling handler — it can fire while the roll call is still\n" +
     "    loading, which would clear the line early");
  ok(/\.pdx-vrhi-wait\[hidden\] \{ display: none; \}/.test(CSS),
     "nothing hides the retired placeholder, so `hidden` leaves it on screen under the live panel");
}

if (fails.length) {
  console.error(`\n✗ vote highlights: ${fails.length} failure(s)\n`);
  fails.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  process.exit(1);
}
console.log("✓ vote highlights: all assertions passed");
