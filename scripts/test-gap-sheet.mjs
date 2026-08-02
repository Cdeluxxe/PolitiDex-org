#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// The #record= arrival sheet — presentation contract
// ─────────────────────────────────────────────────────────────────────────────
// The gap sheet is now two surfaces wearing one set of markup: the cross-link a
// reader taps from inside a profile, and the LANDING PAGE every shared 🏛️ Official
// Record card deep-links into. The polish that made the second one work is all
// presentation — but presentation is exactly where the truth rules are easiest to
// break by accident, so the parts that could lie are pinned here:
//
//   · the identity block prints only roster facts, and prints a face that is either
//     a real URL or party-tinted initials — never an emoji inside an <img>;
//   · the header's hero chip is the OFFICIAL RECORD score under an 🏛️ eyebrow, and
//     the sheet never prints a third, blended number;
//   · with no curated Say-vs-Do on file, the sheet says so on purpose (solo layout)
//     instead of rendering a mostly-empty second column — and invents no evidence,
//     no count and no score for that side;
//   · the two-column comparison returns unchanged the moment curated evidence exists;
//   · the multi-issue disclosure is scannable HERE and still the inline sentence on
//     the profile feed — one measurement, two renderings;
//   · every deep link out of the sheet, and the share slot, survive the re-layout.
//
//   node scripts/test-gap-sheet.mjs
//
// Loads stance-helpers.js + voting-record.js + pdx-learn.js + consistency.js into one
// node:vm sandbox with a fake DOM, seeds the warm record cache directly (no fetch) and
// renders the real sheet HTML. No database, no network, no browser.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Fake DOM ────────────────────────────────────────────────────────────────
// Real enough for _ensureGapSheet: every created element answers querySelector
// for '.pdxgap-sheet' / '.pdxgap-body' with a stable child, and classList is
// recorded rather than dropped — the arrival mode is a class on the backdrop, so a
// noop classList would make that assertion vacuously pass.
const created = [];
const mkEl = () => {
  const cls = new Set();
  const el = {
    style: {}, textContent: "", innerHTML: "", hidden: false, className: "", id: "",
    parentNode: null,
    classList: {
      add: (c) => cls.add(c), remove: (c) => cls.delete(c),
      toggle() {}, contains: (c) => cls.has(c),
    },
    _classes: cls,
    setAttribute() {}, getAttribute: () => null, focus() {}, scrollIntoView() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild(c) { if (c) c.parentNode = el; return c; },
    querySelector: (sel) => el._kids[sel] || null,
    querySelectorAll: () => [],
    _kids: {},
  };
  return el;
};
const newEl = () => {
  const back = mkEl(), sheet = mkEl(), body = mkEl();
  sheet.parentNode = back;
  back._kids[".pdxgap-sheet"] = sheet;
  sheet._kids[".pdxgap-body"] = body;
  created.push(back);
  return back;
};
const ctx = {
  console, JSON, Math, Date, setTimeout, clearTimeout,
  setInterval: () => 0, clearInterval() {},
  Promise, String, Array, Object, RegExp, parseInt, parseFloat, isNaN,
  encodeURIComponent, decodeURIComponent,
  requestAnimationFrame: (f) => setTimeout(f, 0), fetch: () => new Promise(() => {}),
  location: { href: "/", search: "", hash: "" }, history: { replaceState() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  document: {
    readyState: "complete", head: mkEl(), body: mkEl(), documentElement: mkEl(),
    createElement: newEl, createTextNode: mkEl,
    getElementById: () => null,
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
  },
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; ctx.addEventListener = () => {};

// ── Roster ──────────────────────────────────────────────────────────────────
// PHOTO carries a real URL. EMOJI carries the thing some records actually hold in
// that slot. NOFACE has no photo at all. All three are otherwise identical.
const PHOTO = "rep_photo", EMOJI = "rep_emoji", NOFACE = "rep_noface", SAYDO = "rep_saydo";
const ISSUE = "lower_taxes";
ctx.ISSUE_MAP = {
  lower_taxes: { label: "Lower Taxes" },
  healthcare: { label: "Health Care" },
  border_security: { label: "Border Security" },
};
const stances = [{ issueKey: ISSUE, issueStance: "support" }, { issueKey: "healthcare", issueStance: "support" }];
ctx.ISSUE_STANCE_DATA = { [PHOTO]: stances, [EMOJI]: stances, [NOFACE]: stances, [SAYDO]: stances };
ctx.PROFILES = {
  [PHOTO]: {
    name: "Marta Solano", office: "U.S. Representative", district: "ID-02",
    state: "Idaho", party: "R", photo: "https://example.test/solano.jpg",
  },
  [EMOJI]: { name: "Dana Reyes", office: "U.S. Senator", state: "Ohio", party: "D", photo: "🧑‍⚖️" },
  [NOFACE]: { name: "Lee Park", party: "I" },
  [SAYDO]: { name: "Ada Quint", office: "U.S. Representative", state: "Maine", party: "D" },
};
ctx.CMP_DATA = { [PHOTO]: {}, [EMOJI]: {}, [NOFACE]: {}, [SAYDO]: {} };
// The app's single headshot source. Mirrors index.html's resolution order.
ctx.window._getPhotoUrl = (pid) => (ctx.PROFILES[pid] && ctx.PROFILES[pid].photo) || "";

const sandbox = vm.createContext(ctx);
for (const file of ["stance-helpers.js", "voting-record.js", "pdx-learn.js", "consistency.js"]) {
  vm.runInContext(readFileSync(join(ROOT, file), "utf8"), sandbox, { filename: file });
}

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const has = (s, sub, m) => ok(String(s).includes(sub), `${m} — missing ${JSON.stringify(sub)}`);
const hasnt = (s, sub, m) => ok(!String(s).includes(sub), `${m} — should not contain ${JSON.stringify(sub)}`);

// ── Warm records ────────────────────────────────────────────────────────────
// One multi-issue bill (the omnibus case the readability work is about) plus one
// single-issue vote, seeded the way a completed fetch leaves the cache. The omnibus
// pushes one sibling issue forward and cuts against another, which is the case the
// scannable Advances / Opposes block exists to make legible.
const HR1 = {
  kind: "vote", rollcallId: 11, measureId: 101, number: "H.R. 1", date: "2025-07-03",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "One Big Beautiful Bill Act",
  source: { url: "https://www.congress.gov/roll-call-vote/11", label: "Congress.gov" },
  issues: [
    { issueKey: ISSUE, weight: 100, isPrimary: true, supportMeaning: "yea_supports" },
    { issueKey: "healthcare", weight: 60, isPrimary: false, supportMeaning: "yea_opposes" },
    { issueKey: "border_security", weight: 40, isPrimary: false, supportMeaning: "yea_supports" },
  ],
};
const HR9 = {
  kind: "vote", rollcallId: 9, measureId: 109, number: "H.R. 9", date: "2025-03-11",
  action: "On Passage", position: "yea", isProcedural: false,
  title: "Taxpayer Relief Act",
  source: { url: "https://www.congress.gov/roll-call-vote/9", label: "Congress.gov" },
  issues: [{ issueKey: ISSUE, weight: 90, isPrimary: true, supportMeaning: "yea_supports" }],
};
for (const pid of [PHOTO, EMOJI, NOFACE, SAYDO]) {
  ctx.PDXVotingRecord._records[pid] = [HR1, HR9];
}

const C = ctx.window.PDXConsistency;
ok(typeof C.gapViewHtml === "function", "api: the sheet builder is reachable for testing");
const html = C.gapViewHtml(PHOTO, ISSUE);

// ── 1. The identity block ───────────────────────────────────────────────────
// The arrival used to open on an issue label and never name the member.
has(html, 'class="pdxgap-id"', "identity: the sheet opens with an identity row");
has(html, 'class="pdxgap-face"', "identity: with a face");
has(html, '<img src="https://example.test/solano.jpg"', "identity: the roster headshot is used");
has(html, 'loading="lazy"', "identity: the headshot is lazy — it is above the fold but not blocking");
has(html, "onerror=", "identity: a failed image falls back to the medallion rather than a broken frame");
has(html, '>Marta Solano<', "identity: the member is named");
has(html, "U.S. Representative · ID-02 · Idaho", "identity: office, district and state on one line");
has(html, 'class="pdxgap-party"', "identity: party is its own tinted chip");
has(html, "#f87171", "identity: tinted with the app's existing party colour");
// Order matters for recognition: face and name before the issue title.
ok(html.indexOf("Marta Solano") < html.indexOf("Lower Taxes"),
  "identity: the member is named before the issue, which is the order the card leads with");
has(html, 'class="pdxgap-title">Lower Taxes<', "identity: the issue is the sheet's title");

// Fail-closed on the photo slot: an emoji is not a URL.
const emojiHtml = C.gapViewHtml(EMOJI, ISSUE);
hasnt(emojiHtml, "<img", "photo: an emoji in the photo slot is refused, not rendered as an image");
has(emojiHtml, "pdxgap-face-ph", "photo: and the medallion takes its place");
has(emojiHtml, 'data-fb="DR"', "photo: initials come from the name");
// No photo at all → medallion, and only the facts the roster actually holds.
const noFace = C.gapViewHtml(NOFACE, ISSUE);
hasnt(noFace, "<img", "photo: no headshot on file → no <img> at all");
has(noFace, 'data-fb="LP"', "photo: initials again");
has(noFace, "#a78bfa", "photo: independent gets the independent colour");
hasnt(noFace, "pdxgap-who-sub\"><span>", "identity: a member with no office/state prints no office line");
has(noFace, 'class="pdxgap-party"', "identity: but the party it does know is still shown");

// ── 2. Verdict in under two seconds ─────────────────────────────────────────
has(html, "🏛️ Official Record", "verdict: the eyebrow names WHICH record this is");
has(html, 'class="pdxgap-rel-hero"', "verdict: the header carries the hero verdict chip");
has(html, 'class="pdxgap-relpct"', "verdict: with the score itself, not just a word");
ok(/pdxgap-relpct">\d+%<\/span> [^<]+<\/span>/.test(html),
  "verdict: the hero chip reads as <score>% <verdict label>");
has(html, "judged votes on this issue", "verdict: the depth behind the score is stated");
// The header % and the panel pill are the SAME number — a second figure would read
// as a second score.
const heroPct = (html.match(/pdxgap-relpct">(\d+)%/) || [])[1];
const pillPct = (html.match(/pdxgap-pct" style="color:[^"]*">(\d+)%/) || [])[1];
ok(heroPct && heroPct === pillPct,
  `verdict: header and panel print one number, not two (hero ${heroPct}, pill ${pillPct})`);

// ── 3. Official-Record-only arrival: an intentional empty state ──────────────
// This is every shared card: formal record present, curated Say-vs-Do absent.
has(html, "pdxgap-sides-solo", "solo: with no curated evidence the record takes the full width");
has(html, 'class="pdxgap-solo"', "solo: and the 🧾 side becomes a deliberate note");
has(html, "not on file yet", "solo: the absence is named");
has(html, "formal roll-call votes and legislative actions", "solo: it says what IS on file");
has(html, "has not been checked in yet", "solo: and that the curated layer is not");
has(html, "not a verdict", "solo: an absence of coverage is not a finding about the member");
has(html, "never merged into a single number", "solo: the separation rule is restated where it matters");
// Nothing invented for the empty side.
hasnt(html, "pdxor-pct-na", "solo: no '—' score pill is fabricated for the empty side");
hasnt(html, "Nothing on the public record yet",
  "solo: the old grey one-liner is gone, not merely restyled");
ok(html.split('class="pdxgap-side"').length - 1 === 1,
  "solo: exactly one panel renders — the empty column is not a column");
// The reader is never told a Say-vs-Do figure that does not exist.
ok((html.match(/%/g) || []).length === 2,
  "solo: only the Official Record % appears (header chip + panel pill), nothing else");

// ── 4. The two-column comparison still exists ───────────────────────────────
// Curated public-record evidence present → the sheet this was originally built for,
// unchanged. Seeded through the same collector consistency.js reads live.
ctx.window.PDXReceipts = {
  collect: () => [{
    pid: SAYDO, issueKey: ISSUE, category: "statement",
    headline: "Told a town hall the bill would cut taxes for everyone",
    date: "2025-06-01", source: { url: "https://example.test/townhall", label: "Town hall video" },
    verdict: { key: "contradicts", label: "Contradicts", color: "#f87171" },
  }, {
    pid: SAYDO, issueKey: ISSUE, category: "news",
    headline: "Backed the same cut in a floor speech",
    date: "2025-06-04", source: { url: "https://example.test/floor", label: "Floor record" },
    verdict: { key: "consistent", label: "Consistent", color: "#6ee7a0" },
  }],
};
const both = C.gapViewHtml(SAYDO, ISSUE);
ok(both.split('class="pdxgap-side"').length - 1 === 2,
  "two-sided: curated evidence on file → two panels again");
hasnt(both, "pdxgap-sides-solo", "two-sided: and no solo layout");
hasnt(both, 'class="pdxgap-solo"', "two-sided: and no empty-state note");
has(both, "Say-vs-Do", "two-sided: the 🧾 side is named");
has(both, "Public-record evidence", "two-sided: with its own scope line");
has(both, "example.test/townhall", "two-sided: and its own sourced evidence");
// Two scores, side by side, never summed into a third.
has(both, "⚖️ Record vs. Public Picture",
  "two-sided: the comparison framing returns when there are two numbers to compare");
has(both, "never blends them into one score", "two-sided: the separation statement is still printed");
delete ctx.window.PDXReceipts;

// ── 5. Multi-issue readability ──────────────────────────────────────────────
// Same measurement as the profile feed, laid out to be scanned instead of read.
has(html, 'class="pdxgap-om"', "omnibus: the sheet renders the scannable block");
has(html, "one vote, 3 issues", "omnibus: the header states the shape in one line");
has(html, "<b>Advances</b> 1 other issue", "omnibus: a counted Advances row");
has(html, "<b>Opposes</b> 1 other issue", "omnibus: and a counted Opposes row");
has(html, "cuts both ways", "omnibus: a bill that advances one issue and opposes another is flagged");
has(html, 'class="pdxgap-om-all"', "omnibus: the issue labels sit behind a disclosure");
has(html, "pdxgap-om-chips", "omnibus: full detail is kept, just not as the first wall");
has(html, "▼ Health Care", "omnibus: each chip carries the direction, inside the disclosure");
// The counted rows come first; the chip cloud is not the default view.
ok(html.indexOf("pdxgap-om-rows") < html.indexOf('class="pdxgap-om-all"') &&
   html.indexOf('class="pdxgap-om-all"') < html.indexOf("pdxgap-om-chips"),
  "omnibus: counted summary, then the disclosure, then the chips inside it");
hasnt(html, 'class="pdxor-omni"',
  "omnibus: the sheet does not ALSO print the inline sentence — one rendering, not two");
// Section-level provenance is a disclosure too, and keeps the canonical wording.
has(html, 'class="pdxgap-side-sub pdxgap-omni"', "omnibus: the section provenance line is a disclosure");
has(html, "came from multi-issue bills", "omnibus: its summary is the count");
has(html, "scored separately on each issue", "omnibus: the method stays visible");

// The profile feed is untouched — the block renderer is opt-in, so the surface that
// was already right must still print the sentence it always printed.
const feed = C.officialRecordSectionHtml(PHOTO);
has(feed, 'class="pdxor-omni"', "scope: the profile feed still uses the inline sentence");
hasnt(feed, 'class="pdxgap-om"', "scope: and does not pick up the sheet's block layout");

// ── 6. Deep links out, and the share affordance ─────────────────────────────
has(html, 'class="pdxgap-share"', "share: the share slot survives the re-layout");
ok(html.indexOf('class="pdxgap-share"') > html.indexOf('class="pdxgap-side"'),
  "share: it stays inside the 🏛️ panel, so what it shares is unambiguous");
// The button itself is emitted hidden and revealed only by PDXReceiptCards.hydrate() —
// consistency.js must never re-derive the eligibility guards.
const cs = readFileSync(join(ROOT, "consistency.js"), "utf8");
hasnt(cs, "_rcShareEligible", "share: the sheet does not second-guess the share gate");
// Every exit the sheet offers a cold arrival. The re-layout moved the panels around
// these, so each one is pinned: nothing here may become a dead end.
has(html, "Where to next", "links: the sheet names its exits");
has(html, 'data-pdxc-gap="healthcare"',
  "links: on to a named second issue for the same member, never a generic 'another issue'");
has(html, 'data-pdxc-gap-pid="' + PHOTO + '"', "links: carrying the member, since the sheet has no page behind it");
has(html, "Check Health Care", "links: and the destination is named in the copy");
has(html, 'data-pdxc-profile="' + PHOTO + '"', "links: back to the whole profile");
has(html, 'href="#voter-hub" data-pdxc-gapclose="1"',
  "links: and out to the reader's own delegation, closing the sheet on the way");
// Sourced evidence keeps its own link out to the primary source.
has(html, "congress.gov", "links: each quoted vote still links to its own source");
has(html, 'rel="noopener"', "links: external sources open safely");
has(html, "How to read this", "method: the method link stays on the sheet");
has(html, "What counts as a contradiction", "method: as does the contradiction definition");

// ── 7. Arrival mode ─────────────────────────────────────────────────────────
// The full-height layout is a class on the shared backdrop. It must be set from the
// caller's statement, fall back to the hash, and be CLEARED for an in-app open —
// openGap and openMethodology share one backdrop, so a sticky class would leak.
const backOf = () => created.find((e) => e.className === "pdxgap-back");
C.openGap(PHOTO, ISSUE, { arrival: true });
const back = backOf();
ok(!!back, "arrival: the sheet's backdrop was built");
ok(back && back.classList.contains("pdxgap-arrive"),
  "arrival: a stated arrival takes the whole viewport");
eq(back && back.hidden, false, "arrival: and the sheet is shown");
C.openGap(PHOTO, ISSUE, { arrival: false });
ok(back && !back.classList.contains("pdxgap-arrive"),
  "arrival: an in-app cross-link stays a short bottom sheet");
ctx.location.hash = "#record=" + PHOTO + "~" + ISSUE;
C.openGap(PHOTO, ISSUE);
ok(back && back.classList.contains("pdxgap-arrive"),
  "arrival: a caller that says nothing is read from the #record= hash");
C.openMethodology("cards");
ok(back && !back.classList.contains("pdxgap-arrive"),
  "arrival: the shared backdrop is reset by the other entry point, never inherited");
ctx.location.hash = "#methodology";
C.openMethodology("cards");
ok(back && back.classList.contains("pdxgap-arrive"),
  "arrival: a directly-linked methodology page is an arrival too");
ctx.location.hash = "";
// The body was actually filled — the class assertions above would pass on an empty sheet.
const body = back && back._kids[".pdxgap-sheet"]._kids[".pdxgap-body"];
ok(body && String(body.innerHTML).length > 500, "arrival: the sheet body is rendered, not empty");

// ── 8. Source contracts ─────────────────────────────────────────────────────
// receipt-cards.js owns the deep link and must keep stating the arrival outright;
// the hash fallback is a safety net, not the mechanism.
const rc = readFileSync(join(ROOT, "receipt-cards.js"), "utf8");
has(rc, "arrival: true", "contract: handleHash tells the sheet it is an arrival");
has(rc, "openGap(pid, iss, { arrival: true })", "contract: through the documented signature");
has(rc, "SHARE_HASH = 'record'", "contract: the shared link is still #record=");
// The presentation work must not have introduced a blended score anywhere.
hasnt(cs, "combinedScore", "truth: no third, blended score exists");
hasnt(cs, "overallConsistency", "truth: nor an overall figure spanning both records");
// Every class the sheet emits needs a rule, and every new rule needs an emitter —
// the hero chip shipped as dead CSS once already.
for (const cls of ["pdxgap-arrive", "pdxgap-id", "pdxgap-face", "pdxgap-face-ph", "pdxgap-who",
  "pdxgap-who-sub", "pdxgap-party", "pdxgap-rel-hero", "pdxgap-relpct", "pdxgap-sides-solo",
  "pdxgap-solo", "pdxgap-solo-h", "pdxgap-solo-b", "pdxgap-solo-n", "pdxgap-om", "pdxgap-om-h",
  "pdxgap-om-rows", "pdxgap-om-all", "pdxgap-om-chips", "pdxgap-om-chip", "pdxgap-omni-b"]) {
  ok(cs.includes("." + cls + "{") || cs.includes("." + cls + ",") || cs.includes("." + cls + ">") ||
    cs.includes("." + cls + " ") || cs.includes("." + cls + ":"),
    `css: .${cls} has a rule`);
}
// The top of the sheet is deliberately tight — this is the fix for the empty band.
ok(/\.pdxgap-sheet\{[^}]*padding:0\.65rem/.test(cs),
  "layout: the sheet's top padding is tightened for the arrival");
has(cs, ".pdxgap-share:empty{display:none", "layout: a dropped share button leaves no orphan border");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — #record= arrival sheet presentation contract`);
