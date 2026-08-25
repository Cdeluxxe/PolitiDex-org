#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Tests for 🧭 THE TWO JOBS — the profile's top-of-page explainer
// ─────────────────────────────────────────────────────────────────────────────
// A politician profile publishes two different things and readers were collapsing
// them into one:
//
//   🏛 THE FORMAL RECORD is an inventory with a direction — every issue where
//      votes or formal actions are on file, and which way those acts pointed. It
//      is the main view of where this person stands.
//   ⚖️ WORD VS ACTION is a test, and a test needs a stated position on file before
//      it can run at all. It therefore speaks about a FRACTION of the issues the
//      record covers, and it answers one narrow question: when they took a
//      position, did the formal record point the same way?
//
// Read as one thing, the percentage in the letterhead becomes "the score for this
// person" and every issue the test could not reach reads as something withheld.
// profile-spine.js twoJobsMount() is the correction, and it is a teaching note
// rather than a section, so it must earn its place and then leave.
//
// Six properties carry that, and every one of them fails quietly:
//
//   1. IT IS MOUNTED IN THE IDENTITY ZONE. The frame has to arrive before either
//      surface makes a claim, so the call site sits in the chunk of the profile
//      template that precedes the first <!--PDXSP:--> sentinel — the letterhead's
//      own stage.
//   2. IT TEACHES BOTH JOBS, AND WHICH ONE IS PRIMARY. Record first and named as
//      the main view; Word vs Action second and named as the narrow one.
//   3. IT REFUSES TO BE THE VERDICT. It says in words that the narrow read is an
//      integrity check and not an approval rating or an overall grade.
//   4. THE ASYMMETRY IS SAID OUT LOUD, and named as the shape of the data rather
//      than as a finding about the person.
//   5. IT LEAVES AND STAYS GONE. Dismissal is PDXLearn's, which is remembered per
//      visitor through PDXStore; once dismissed the module renders nothing and
//      costs nothing.
//   6. IT COMPUTES NOTHING. Both counts come from the accessors the two surfaces
//      publish. No percentage, no arithmetic, no third figure — and the count
//      line is dropped rather than printed backwards when the asymmetry is not
//      there to describe.
//
//   node scripts/test-two-jobs-explainer.mjs
//
// Runs the real pdx-learn.js and profile-spine.js in a node:vm sandbox against a
// minimal fake DOM. No database, no network, no browser.
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

const SPINE = read("profile-spine.js");
const PROFILES = read("profiles-full.js");
const CSS = read("pdx-learn.css");

// ── Sandbox ──────────────────────────────────────────────────────────────────
// Real modules, fake DOM. `hosts` stands in for the one node the warm seam looks
// up, so the cold-start path can be exercised without a document.
function makeCtx(engines, opts) {
  const hosts = {};
  const warm = [];
  const ctx = {
    console, JSON, Math, Object, Array, String, RegExp, Boolean, Number, Date,
    parseInt, isNaN, encodeURIComponent, decodeURIComponent,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout() {},
    document: {
      readyState: "complete",
      body: { appendChild() {}, style: {} },
      documentElement: { style: {} },
      createElement: () => ({
        style: {}, innerHTML: "", setAttribute() {}, getAttribute: () => null,
        classList: { add() {}, remove() {}, contains: () => false },
        appendChild() {}, querySelector: () => null, addEventListener() {},
      }),
      getElementById: () => null,
      querySelector: (sel) => (sel in hosts ? hosts[sel] : null),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    addEventListener: (n, fn) => { if (n === "pdx-consistency-warm") warm.push(fn); },
    removeEventListener: (n, fn) => {
      if (n !== "pdx-consistency-warm") return;
      const i = warm.indexOf(fn); if (i >= 0) warm.splice(i, 1);
    },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  Object.assign(ctx, engines || {});
  vm.createContext(ctx);
  // The education layer is loaded unless a case is specifically about its absence.
  // It has to be omitted rather than deleted: a property assigned INSIDE a
  // contextified sandbox lives on the real global and survives a delete on the
  // sandbox object, so "delete window.PDXLearn" would silently test nothing.
  if (!opts || opts.learn !== false) {
    new vm.Script(read("pdx-learn.js"), { filename: "pdx-learn.js" }).runInContext(ctx);
  }
  new vm.Script(SPINE, { filename: "profile-spine.js" }).runInContext(ctx);
  return { ctx, hosts, warm, SP: ctx.window.PDXProfileSpine, L: ctx.window.PDXLearn };
}

// Two engine doubles, shaped exactly like the accessors the module is allowed to
// call and nothing else — so a module that grew a second source would fail here.
const engines = (recorded, tested) => ({
  PDXConsistency: { formalPatternIndex: { count: () => recorded } },
  PDXWordAction: {
    read: () => ({ coverage: { tested: tested } }),
    testedOf: (r) => (r && r.coverage && r.coverage.tested) || 0,
  },
});

const P = { name: "Mike Lee", office: "U.S. Senator", party: "Republican" };

// Strip comments before asserting on what the code DOES — this module is heavily
// commented and the prose must not be allowed to answer for the code.
const CODE = SPINE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ── 1. It is mounted in the identity zone ────────────────────────────────────
{
  ok(typeof (makeCtx(engines(43, 12)).SP || {}).twoJobsMount === "function",
     "mount: the spine exports twoJobsMount() — the explainer is a spine concern, because what it teaches is the profile's own sequence");

  const call = PROFILES.indexOf("PDXProfileSpine.twoJobsMount(id, p)");
  ok(call > 0, "mount: the profile template actually calls it — an exported renderer nobody mounts is a renderer that does not exist");

  // assembleTagged() files everything before the FIRST sentinel under `identity`.
  // That is the letterhead's own stage, and it is where the frame has to land.
  const firstSentinel = PROFILES.indexOf("<!--PDXSP:", PROFILES.indexOf("const _profileBody = `"));
  ok(firstSentinel > 0 && call < firstSentinel,
     "mount: the call sits BEFORE the first PDXSP sentinel, so the assembler files it in the identity stage — the frame arrives ahead of every surface that makes a claim");

  const heroEnd = PROFILES.indexOf("Quick-jump navigation");
  ok(heroEnd > 0 && call > heroEnd,
     "mount: and it sits below the letterhead rather than inside it — a teaching note may not push the name, office and score off the first screen");

  // Guarded call site: a profile must render in full even with the spine absent.
  const site = PROFILES.slice(call - 400, call + 200);
  ok(/typeof window\.PDXProfileSpine\.twoJobsMount === 'function'/.test(site) && /catch\s*\(e\)\s*\{\s*return ''/.test(site),
     "mount: the call site is guarded on both the function and a throw — a broken explainer may never take the profile down with it");
}

// ── 2. It teaches both jobs, and which one is primary ────────────────────────
{
  const { SP } = makeCtx(engines(43, 12));
  const html = SP.twoJobsMount("mike-lee", P);
  ok(!!html && html.indexOf("pdxl-note") > 0,
     "copy: it renders, and it renders as a PDXLearn note rather than as a bespoke panel — one visual language for teaching");

  const iRecord = html.indexOf("The record");
  const iWord = html.indexOf("Word vs Action");
  ok(iRecord > 0 && iWord > 0 && iRecord < iWord,
     "copy: the formal record is taught FIRST — it is the primary view, and reading order is how a note says which of two things is primary");
  ok(/the main view/i.test(html),
     "copy: the record is named as the main view in so many words");
  ok(/votes or formal actions are on file/i.test(html) && /which way those acts pointed/i.test(html),
     "copy: and the record is described as what it is — an inventory of acts with a direction, not a score");
  ok(/runs only where they also stated a position/i.test(html),
     "copy: Word vs Action states its precondition — it only runs where a real stated position exists");
  ok(/did the formal record point the same way|pointed the same way/i.test(html),
     "copy: and it states the one question it answers — when they took a position, did the formal record point the same way");
  ok(/narrow/i.test(html),
     "copy: Word vs Action is named as the narrow read, so the reader is told its scope before they are told its number");

  // Short enough to actually be read. Budgeted in two parts, because they are two
  // different asks of the reader: the EXPLANATION is prose they have to get
  // through once, and the count line under it is two numbers they take in at a
  // glance. Pooling them would let a growing explanation hide behind a short
  // count line, which is exactly the drift this budget exists to catch.
  const tokens = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const countPara = (html.match(/<p class="pdxsp-tj-counts"[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
  const explain = tokens(html) - tokens(countPara);
  ok(explain > 40 && explain <= 110,
     "copy: the explanation itself is " + explain + " words — enough to teach two jobs and the asymmetry between them, short enough that people actually read it");
  ok(tokens(countPara) <= 20,
     "copy: and the count line under it is " + tokens(countPara) + " words — a glance, not a second paragraph");
}

// ── 3. It refuses to be the verdict ──────────────────────────────────────────
{
  const { SP } = makeCtx(engines(43, 12));
  const html = SP.twoJobsMount("mike-lee", P);
  ok(/integrity check/i.test(html),
     "frame: the narrow read is named an integrity check — the mechanism, not a rating");
  ok(/not an approval rating/i.test(html),
     "frame: and it says plainly that it is not an approval rating");
  ok(/an overall grade/i.test(html),
     "frame: and not an overall grade — the two things readers were mistaking it for, both denied by name");

  // Tone. This explains a process; it may never characterise a position, a
  // person or a party as good or bad, and it may not name a party at all.
  const prose = html.replace(/<[^>]*>/g, " ").toLowerCase();
  const banned = ["good", "bad", "better", "worse", "hypocri", "liar", "dishonest",
                  "trustworthy", "republican", "democrat", "conservative", "liberal",
                  "party line", "extreme", "moderate"];
  banned.forEach((w) => ok(prose.indexOf(w) === -1,
     "tone: the copy never uses “" + w + "” — the explainer describes a process and never whether a position or a person is good"));
  ok(!/\byou should\b|\bwatch out\b|\bbeware\b/.test(prose),
     "tone: and it never tells the reader what to conclude");
}

// ── 4. The asymmetry is said out loud ────────────────────────────────────────
{
  const { SP } = makeCtx(engines(43, 12));
  const html = SP.twoJobsMount("mike-lee", P);
  ok(/covers far more ground than the percentage/i.test(html),
     "asymmetry: it states that the record covers far more ground than the percentage tests");
  ok(/most issues have a record/i.test(html),
     "asymmetry: and that most issues have a record and nothing to test it against — normal, not damning");
  ok(/honest shape of the data/i.test(html) && /not a finding about them/i.test(html),
     "asymmetry: and it names the gap as the honest shape of the data rather than as a finding about the person");

  // The numbers make the argument concrete on a deep profile.
  ok(/<b>43<\/b> issues with a formal record/.test(html) && /<b>12<\/b> with a position to test against it/.test(html),
     "asymmetry: with both counts known it prints them — 43 issues on the record, 12 of them testable — because “far more” is an argument and the two numbers are the thing itself");

  // The teaching door: the phrase that carries the whole point opens the
  // glossary entry that already explains an untested row.
  ok(/data-pdx-term="notscored"/.test(html),
     "asymmetry: “nothing quotable to test it against” is a live glossary term, so a reader who wants the longer answer has one tap to it");
}

// ── 5. It leaves, and stays gone ─────────────────────────────────────────────
{
  const { SP, L } = makeCtx(engines(43, 12));
  ok(!!SP.twoJobsMount("mike-lee", P), "dismiss: it renders for a first-time visitor");
  ok(/data-pdxl-note-x/.test(SP.twoJobsMount("mike-lee", P)),
     "dismiss: and it carries PDXLearn's dismiss control rather than a bespoke close button");

  L.dismissNote(SP.TWO_JOBS_ID);
  ok(SP.twoJobsMount("mike-lee", P) === "",
     "dismiss: once dismissed it renders NOTHING on the next profile open — a returning visitor is never taxed with the same explanation twice");
  ok(L.noteDismissed(SP.TWO_JOBS_ID),
     "dismiss: and the dismissal is PDXLearn's own per-visitor state, which rides PDXStore rather than a private flag this module would have to sync");

  // Cheap: the dismissed path must not reach either engine.
  let touched = 0;
  const { SP: SP2, L: L2 } = makeCtx({
    PDXConsistency: { formalPatternIndex: { count: () => { touched++; return 43; } } },
    PDXWordAction: { read: () => { touched++; return { coverage: { tested: 12 } }; }, testedOf: () => 12 },
  });
  L2.dismissNote(SP2.TWO_JOBS_ID);
  SP2.twoJobsMount("mike-lee", P);
  ok(touched === 0,
     "dismiss: and a returning visitor costs no read of either engine — the note is gone before anything is computed for it");

  // No education layer at all → no note, and no throw.
  const bare = makeCtx(engines(43, 12), { learn: false });
  ok(bare.SP.twoJobsMount("mike-lee", P) === "",
     "degrade: with the education layer absent the explainer renders nothing rather than half a control");
  ok(bare.SP.twoJobsMount("", P) === "",
     "degrade: and with no politician there is nothing to frame");
}

// ── 6. It computes nothing ───────────────────────────────────────────────────
{
  // Both numbers come from the surfaces' own published accessors.
  ok(/PDXConsistency[\s\S]{0,200}formalPatternIndex[\s\S]{0,80}count/.test(CODE),
     "walls: the record count is read off PDXConsistency.formalPatternIndex.count() — the same rows the formal index renders");
  ok(/PDXWordAction[\s\S]{0,300}testedOf\(/.test(CODE),
     "walls: and the tested count is PDXWordAction.testedOf(read()) — the same call that prints the depth caption beside the percentage, so the note cannot disagree with the score");

  const fn = CODE.slice(CODE.indexOf("function twoJobsCounts"), CODE.indexOf("function bindTwoJobs"));
  ok(!/[*/]\s*100|\.toFixed|Math\.round\(|pct|percent/i.test(fn.replace(/percentage/gi, "")),
     "walls: nothing in the explainer's own code divides, rounds or builds a percentage — there is no third figure on this page");

  // The asymmetry line is a claim about the data, so it is dropped whenever the
  // data does not support it rather than printed backwards.
  ok(makeCtx(engines(43, 0)).SP._twoJobsCountLine("mike-lee", P) === "",
     "walls: with no tested issues yet there is no count line — the qualitative sentence still stands on its own");
  ok(makeCtx(engines(0, 0)).SP._twoJobsCountLine("mike-lee", P) === "",
     "walls: and with a cold record there is no count line either, rather than a pair of zeroes read as a finding");
  ok(makeCtx(engines(9, 9)).SP._twoJobsCountLine("mike-lee", P) === "",
     "walls: when the tested count is not actually smaller, the asymmetry the line describes is not there — so the line is dropped rather than printed backwards");
  ok(makeCtx(engines(12, 43)).SP._twoJobsCountLine("mike-lee", P) === "",
     "walls: and it can never claim more tested issues than recorded ones");

  const line = makeCtx(engines(43, 12)).SP._twoJobsCountLine("mike-lee", P);
  ok(/43/.test(line) && /12/.test(line) && !/%/.test(line),
     "walls: the line it does print is two counts and no percentage");
}

// ── 7. The cold start ────────────────────────────────────────────────────────
// A member's identity zone is built while the roll-call record is still in
// flight, so neither count is knowable at first paint. The prose must render
// immediately and never move; only the counts may arrive late.
{
  const { SP, hosts, warm } = makeCtx({
    PDXConsistency: { formalPatternIndex: { count: () => (cold ? 0 : 43) } },
    PDXWordAction: {
      read: () => ({ coverage: { tested: cold ? 0 : 12 } }),
      testedOf: (r) => (r && r.coverage && r.coverage.tested) || 0,
    },
  });
  var cold = true;                                  // eslint-disable-line no-var
  const html = SP.twoJobsMount("mike-lee", P);
  ok(/covers far more ground than the percentage/.test(html),
     "cold: on a cold profile the explanation renders in full — the teaching does not wait on the record");
  ok(!/issues with a formal record/.test(html),
     "cold: and it prints no counts it does not have yet");

  const uid = (html.match(/data-pdxsp-tj="([^"]+)"/) || [])[1];
  ok(!!uid, "cold: it leaves a host for the counts to arrive into — a bare string would mean the figures only ever appeared on already-warm profiles");
  ok(warm.length === 1, "cold: exactly one listener is armed for the warm event");

  const host = { innerHTML: "" };
  hosts['[data-pdxsp-tj="' + uid + '"]'] = host;
  cold = false;
  warm[0]({ detail: { pid: "mike-lee" } });
  ok(/<b>43<\/b> issues with a formal record/.test(host.innerHTML),
     "cold: and when the record warms, the counts arrive into that host through the same pdx-consistency-warm seam every other cold-start figure on this page uses");

  // Another politician's warm event must not repaint this one.
  host.innerHTML = "SENTINEL";
  warm[0]({ detail: { pid: "someone-else" } });
  ok(host.innerHTML === "SENTINEL",
     "cold: a warm event for a different profile is ignored, so one person's counts can never land under another person's name");

  // Host gone (the note was dismissed, or the profile was closed) → unbind.
  delete hosts['[data-pdxsp-tj="' + uid + '"]'];
  warm[0]({ detail: { pid: "mike-lee" } });
  ok(warm.length === 0,
     "cold: and once the note is gone the listener removes itself rather than surviving as a leak against a detached node");
}

// ── 8. The skin is the primitive's, not a bespoke one ────────────────────────
{
  ok(/\.pdxl-note-body p \{/.test(CSS) && /\.pdxl-note-body p:last-child/.test(CSS),
     "skin: multi-paragraph support was added to the NOTE primitive, generically — any note may teach two things, not just this one");
  ok(/\.pdxl-note-body p:empty \{ display: none/.test(CSS),
     "skin: an empty counts host collapses, so a cold profile carries no gap where a figure it does not have would go");
  const { SP } = makeCtx(engines(43, 12));
  const html = SP.twoJobsMount("mike-lee", P);
  ok(!/style="/.test(html),
     "skin: the explainer ships no inline styles — it looks like every other teaching note on the site, which is what keeps education from reading as a judgement");
  ok(!/#4ade80|#f87171|#f5c842/.test(html),
     "skin: and it borrows none of the verdict colours — education must never look like a finding");
}

if (failures.length) {
  console.error("\n✗ two-jobs explainer: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ two-jobs explainer: all " + passed + " assertions passed");
