#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-record-card.mjs — the share primitive, and the honesty that has to
// survive leaving the site
// ─────────────────────────────────────────────────────────────────────────────
// Every other card in this app is read by someone who can click. A chip opens a
// dossier, a tier opens the acts behind it, a coverage line opens the gap sheet.
// The record card is the one object that gets read by people who cannot do any of
// that: it arrives as an image in a group chat, a paste in an email, a link in a
// quote-post. Whatever it fails to say, nobody will look up.
//
// So the failure modes here are not the usual ones. A record card is wrong if it:
//
//   1. DROPS A BLOCK WITHOUT SAYING SO. Five blocks, one order, both surfaces.
//      A missing formal act is "no formal act on file here yet", never a gap in
//      the layout that reads as nothing to report.
//   2. PRINTS A SECOND PERCENTAGE. One figure exists in this product, it belongs
//      to the whole person, and it ships only when word-action.js says the read
//      is publishable. An issue card has no percentage at all — there is no
//      per-issue figure to print, and inventing one to fill a row is the exact
//      drift this module was written to refuse.
//   3. LOWERS A FLOOR TO LOOK FULL. Below the floor there is no smaller number
//      and no softer word: there is a card that says the record is still being
//      built. The module reads `publishable`; it does not own a threshold.
//   4. INVENTS COMPLETENESS. The coverage block is counts and a door, never a
//      ratio of what exists, and the anti-completeness line ships on every
//      surface of every card.
//   5. FRAMES A RECORD AS PARTY BEHAVIOUR — in a composed sentence. Not in a
//      quotation: people say "Democrats" and "bipartisan", committees are named
//      "(Democrats)", and a card that edited their word or renamed their citation
//      to protect our framing would be lying in the other direction. The line
//      between the two is asserted here in both directions.
//   6. LANDS SOMEWHERE ELSE. The link, the copy text and the image payload are
//      one URL, and that URL is /p/<pid> — the person file Phase 1 made real.
//   7. GRADES, RANKS OR SCORES. No letter, no band, no tier invented here, no
//      cross-person anything. Two record cards side by side are two records.
//   8. MOVES SOMETHING. It is a reader over public gates. Building every card in
//      the corpus leaves Direction Match, the formal pattern tiers and the
//      publication floors byte-identical.
//
// The last section is a census rather than a fixture: every card the shipped
// corpus can produce is built and audited, because a tripwire that only ever ran
// over one hand-made card is a tripwire nobody has tested.
//
//   node scripts/test-record-card.mjs
//
// Real shipped modules in a node:vm sandbox, real member votes rebuilt offline
// from the shipped seeds by vr-record-corpus.mjs. No database, no network.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The engine files the card reads through, plus the card. Order is load order.
const ENGINE = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "share-links.js", "receipt-cards.js", "profile-card.js", "inventory.js", "gaps.js",
  "profile-spine.js", "profiles-full.js",
];
const CARD_FILES = ["record-card.js", "self-defection.js"];
const SRC = [...ENGINE, ...CARD_FILES].map((f) => [f, R(f)]);
const ENGINE_SRC = ENGINE.map((f) => [f, R(f)]);

// `withCard: false` is the "this module was never shipped" control for section 8.
function boot(withCard) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const [f, src] of (withCard === false ? ENGINE_SRC : SRC)) {
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} unexpectedly present`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ record-card: ${msg}`);
  process.exit(1);
};

// Source-level assertions run over a comment-stripped copy: the header has to be
// able to name the products this module refuses to build.
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
const CARD_SRC = R("record-card.js");
const CARD_CODE = strip(CARD_SRC);

const W = boot(true);
const C = W.PDXRecordCard;
must(C && typeof C.read === "function", "window.PDXRecordCard.read is not exposed");

// The offline corpus, warmed into the record cache so the cards below are built
// from real roll-call votes rather than a stub.
const { byMember } = buildCorpus(ROOT);
must(byMember.size > 30, `the offline corpus is too small to census (${byMember.size} members)`);
for (const [pid, items] of byMember) W.PDXVotingRecord.noteMember(pid, items);

// THE RICH FILE and THE THIN FILE — the two the brief names. `lee` has a
// publishable read, a warm roll-call record and tested word. The thin pick is a
// county commissioner with two documented positions, no roll-call record at all
// and therefore no read to publish: the below-floor case, in the shipped data.
const RICH = "lee";
const THIN = (() => {
  for (const pid of Object.keys(W.CMP_DATA)) {
    if (byMember.has(pid)) continue;
    const r = W.PDXWordAction.read(pid, W.CMP_DATA[pid]) || {};
    if ((r.items || []).length && (r.items || []).length <= 2 && !r.publishable) return pid;
  }
  return null;
})();
must(W.CMP_DATA[RICH], `${RICH} is not in the roster`);
must(THIN, "no below-floor person file found in the shipped roster");

const RICH_READ = W.PDXWordAction.read(RICH, W.CMP_DATA[RICH]);
must(RICH_READ && RICH_READ.publishable === true,
  `${RICH}'s read is not publishable in this harness — the Direction Match section needs it`);
const RICH_ISSUE = (RICH_READ.tested || [])[0] && (RICH_READ.tested || [])[0].issueKey;
must(RICH_ISSUE, `${RICH} has no tested issue to build an issue card from`);

const P = (pid, issueKey) => C.read(pid, issueKey ? { issueKey } : {});
const M_PERSON = P(RICH);
const M_ISSUE = P(RICH, RICH_ISSUE);
const M_THIN = P(THIN);
must(M_PERSON && M_ISSUE && M_THIN, "one of the three worked cards did not build");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · five blocks, one order, and a shortfall is a sentence");
// ═════════════════════════════════════════════════════════════════════════════

eq(C.BLOCKS.join(","), "stated,formal,points,coverage,sources",
  "the five blocks are declared in the brief's order");
for (const k of C.BLOCKS) {
  ok(C.LABELS[k] && C.LABELS[k].length > 3, `the ${k} block has a reader-facing label`);
}
// The order is the same in the paste and in the markup. Anything else means the
// person who opened the link is reading a different card from the one shared.
for (const [name, render] of [["text", (m) => C.text(m)], ["html", (m) => C.html(m)]]) {
  for (const [what, m] of [["the person card", M_PERSON], ["the issue card", M_ISSUE],
                           ["the thin card", M_THIN]]) {
    const out = render(m);
    const at = (k) => out.indexOf(name === "text" ? C.LABELS[k].toUpperCase() : C.LABELS[k]);
    const seen = ["formal", "points", "coverage", "sources"].map(at);
    ok(seen.every((v) => v > 0), `${name}: ${what} prints formal, points, coverage and sources`);
    ok(seen.every((v, i) => i === 0 || v > seen[i - 1]),
      `${name}: ${what} prints them in the declared order`);
    if (m.stated) ok(at("stated") > 0 && at("stated") < seen[0],
      `${name}: ${what} prints the stated position first, above the acts`);
  }
}
// Block 1 is the only one that can be absent, and only because there is no
// independent word to print. It is never filled in from somewhere else.
eq(M_PERSON.stated, null, "a person-summary card names no single stated position");
ok(!!M_ISSUE.stated, "an issue card with real word on file prints it");
eq(Object.keys(C.INDEPENDENT_KINDS).sort().join(","), "pledge-stated,position",
  "only independently-worded kinds count as a stated position");
{
  // A record-derived card is not their word. Steer word-action to hand one back
  // and the block must stay empty rather than borrow it.
  const real = W.PDXWordAction.issueRead;
  W.PDXWordAction.issueRead = () => ({
    text: "Their record on this issue advanced it four times.",
    kind: "record-derived", stance: "support", sources: [{ url: "https://example.gov/x", label: "X" }],
  });
  const m = P(RICH, RICH_ISSUE);
  eq(m.stated, null, "a card narrated from the record is not printed as a stated position");
  W.PDXWordAction.issueRead = () => ({
    text: "We should keep the federal investment going.",
    kind: "position", stance: "support", sources: [],
  });
  const m2 = P(RICH, RICH_ISSUE);
  ok(!!m2.stated, "real independent word with nothing to cite is still printed");
  eq(m2.stated.source, null, "and its citation is honestly absent");
  eq(m2.stated.missing, C.BUILDING.statedSource,
    "with the locked line saying there is no citation link on file");
  has(C.text(m2), C.BUILDING.statedSource, "the paste carries that line under the quote");
  has(C.html(m2), C.BUILDING.statedSource, "and so does the markup");
  eq(C.audit(m2).length, 0, "a disclosed unlinked quote is allowed to ship");
  eq(C.audit({ ...m2, stated: { text: "x", source: null, missing: "" } })
    .filter((v) => v.indexOf("neither a citation nor") >= 0).length, 1,
    "an UNdisclosed unlinked quote is caught");
  W.PDXWordAction.issueRead = real;
}
// Every shortfall sentence is written once, in one place.
for (const k of ["person", "issue", "word", "stated", "formal", "sources", "statedSource"]) {
  ok(C.BUILDING[k] && C.BUILDING[k].length > 10, `the ${k} shortfall has locked copy`);
  ok(!/\d\s*%/.test(C.BUILDING[k]), `and the ${k} shortfall carries no figure`);
}
// A missing block says so rather than vanishing.
{
  const bare = { ...M_THIN, formal: null, sources: [] };
  has(C.text(bare), C.BUILDING.formal, "no formal act on file is stated, not omitted");
  has(C.text(bare), C.BUILDING.sources, "no citation on file is stated, not omitted");
  has(C.html(bare), C.BUILDING.formal, "in the markup too");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · one percentage, one gate, and no floor moved to reach it");
// ═════════════════════════════════════════════════════════════════════════════

ok(!!M_PERSON.directionMatch, "a publishable person card carries Direction Match");
eq(M_PERSON.directionMatch.pct, RICH_READ.pct,
  "and the figure is word-action's own, not a recomputation");
eq(M_ISSUE.directionMatch, null, "an issue card carries no Direction Match at all");
eq(M_THIN.directionMatch, null, "and neither does a below-floor person card");
// Exactly one percentage on the whole card, and it is that row.
{
  const t = C.text(M_PERSON);
  const pcts = t.match(/\d\s*%/g) || [];
  eq(pcts.length, 1, "the person card's paste contains exactly one percentage");
  has(t, M_PERSON.directionMatch.text, "and it is the Direction Match row");
  const ti = C.text(M_ISSUE);
  eq((ti.match(/\d\s*%/g) || []).length, 0, "the issue card's paste contains none");
  eq((C.text(M_THIN).match(/\d\s*%/g) || []).length, 0, "the thin card's paste contains none");
  eq((C.html(M_ISSUE).match(/\d\s*%/g) || []).length, 0, "nor does the issue markup");
}
// The gate is `publishable`, read and not re-decided. Flip it and the row goes.
{
  const real = W.PDXWordAction.read;
  W.PDXWordAction.read = (pid, p) => {
    const r = real.call(W.PDXWordAction, pid, p);
    return r ? { ...r, publishable: false } : r;
  };
  const m = P(RICH);
  eq(m.directionMatch, null, "publishable false removes the row outright");
  has(C.text(m), C.BUILDING.word, "and the card says why, in the locked words");
  lacks(C.text(m), "%", "a card below the floor prints no percentage at all");
  // Not a smaller number, not a rounder one, not a hedge: no number.
  W.PDXWordAction.read = (pid, p) => {
    const r = real.call(W.PDXWordAction, pid, p);
    return r ? { ...r, publishable: true, pct: null } : r;
  };
  eq(P(RICH).directionMatch, null, "publishable with no figure is still no row");
  W.PDXWordAction.read = real;
}
// The module owns no threshold it could quietly relax.
for (const n of ["MIN_", "FLOOR", "floors", "threshold", "atLeast"]) {
  lacks(CARD_CODE, n, `the module declares no floor of its own ("${n}")`);
}
eq((CARD_CODE.match(/publishable/g) || []).length, 4,
  "publishable is read in the two places that need it, and set nowhere");
lacks(CARD_CODE, "publishable =", "the module never assigns publishable");
lacks(CARD_CODE, "publishable:", "and never fabricates a read that carries it");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · a thin file gets a thin card that says so");
// ═════════════════════════════════════════════════════════════════════════════

{
  const t = C.text(M_THIN);
  eq(M_THIN.building, true, "the below-floor card is flagged as still being built");
  has(t, C.BUILDING.person, "and says the record is still being built, in those words");
  has(t, C.BUILDING.word, "and that there is not enough tested word for a match");
  has(t, C.BUILDING.formal, "and that no formal act is on file");
  eq(M_THIN.tier, "none", "with no tier claimed");
  eq(C.audit(M_THIN).length, 0, "the thin card is shippable — thin is not a violation");
  // The affordance is NOT withdrawn. "Still being built" is a true thing to hand
  // someone, and hiding the button would make the archive look absent instead.
  ok(C.buttonHtml({ pid: THIN }).indexOf("data-pdxrec-share") > 0,
    "a thin file still offers the share control");
  // Nothing about a thin card reads as a judgement on the person.
  for (const bad of ["no record", "nothing on the record", "failed", "refused", "hiding",
                     "empty record", "blank"]) {
    lacks(t.toLowerCase(), bad, `the thin card does not say "${bad}"`);
  }
  // "Loading the record…" is honest on a page and a broken promise on an object
  // that travels — especially for a local official with no roll-call record to
  // load. It never reaches a card.
  lacks(t, "Loading the record", "a transient loading label never ships on a card");
  lacks(C.html(M_THIN), "Loading the record", "nor in the markup");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · the link, the paste and the image agree, and all three land on /p/");
// ═════════════════════════════════════════════════════════════════════════════

eq(C.url(RICH), `https://politidex.fyi/p/${RICH}`, "a person card's url is the person file");
eq(C.url(RICH, RICH_ISSUE),
  `https://politidex.fyi/p/${RICH}?record=${encodeURIComponent(RICH + "~" + RICH_ISSUE)}`,
  "an issue card's url is the person file with the record view named on it");
eq(C.url(RICH), W.PDXShareLinks.personRecord(RICH),
  "and the builder is share-links', so the copy path cannot disagree with the link");
eq(C.url(RICH, RICH_ISSUE), W.PDXShareLinks.personRecord(RICH, RICH_ISSUE), "on both scopes");
eq(C.url(""), "https://politidex.fyi/", "no pid, no fabricated address");
eq(M_PERSON.url, C.url(RICH), "the model carries that url");
has(C.text(M_PERSON), M_PERSON.url, "the paste ends on it");
has(C.text(M_ISSUE), M_ISSUE.url, "the issue paste ends on its own");
// The in-app href is the same address, path-only, so a click routes through the SPA.
eq(C._pathOf(M_PERSON), `/p/${RICH}`, "in-app, the person card links the person file path");
has(C._pathOf(M_ISSUE), `/p/${RICH}?record=`, "and the issue card keeps the record view");
has(C.html(M_PERSON), `href="/p/${RICH}"`, "the rendered name is that link");
// Phase 1's rewrite has to still make it a page rather than a redirect.
{
  const toml = R("netlify.toml");
  const i = toml.indexOf('from = "/p/*"');
  ok(i > 0, "netlify.toml still rewrites person files");
  ok(toml.slice(i, i + 200).indexOf("status = 200") > 0,
    "and it is a 200, so a shared record card link is a page");
}
// The OG preview must stay the person card. share-target resolves /p/<pid> to a
// profile BEFORE it looks at ?record=, so /p/lee and /p/lee?record=lee~gun_safety
// unfurl as one entity rather than two competing previews of the same person.
{
  const st = strip(R("netlify/lib/share-target.ts"));
  const iP = st.indexOf('kind: "profile"');
  const iR = st.indexOf('q.get(kind)');
  ok(iP > 0, "share-target still resolves /p/<pid> to a profile");
  ok(iR > iP, "and resolves it before reading ?record=, so one person is one preview");
  has(st, "case \"profile\":   return `/p/${e(t.id)}`", "and canonicalises a profile to /p/<pid>");
  has(strip(R("netlify/edge-functions/share-preview.ts")), '"/p/*"',
    "and the preview edge function runs in front of that path");
}
// No decoration, no tracker, no wrapper — on any surface.
for (const bad of ["utm_", "?ref=", "click.", "/r/?u="]) {
  lacks(C.text(M_PERSON), bad, `the paste carries no link decoration ("${bad}")`);
  lacks(C.html(M_ISSUE), bad, `nor does the markup ("${bad}")`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · what the tripwires catch — asserted by catching it");
// ═════════════════════════════════════════════════════════════════════════════

// scrub() DROPS a line rather than softening it. A shorter card is allowed; a
// card that says something it must not is not.
eq(C.scrub(["A clean formal act line."]).length, 1, "a clean line survives the scrub");
eq(C.scrub(["Backed it 83% of the time"]).length, 0, "a stray percentage takes the line with it");
eq(C.scrub(["Voted with the Republicans on this"]).length, 0, "so does a party name");
eq(C.scrub(["Broke with their party on the bill"]).length, 0,
  "and so does the shipped party-framing phrase list");
eq(C.scrub([null, "", "  ", "Kept."]).join("|"), "Kept.", "blanks are dropped quietly");

// audit() names the violation on a forged model, so the fence tests the tripwire
// and not merely a card that happened to pass.
const forged = (patch) => C.audit({ ...M_PERSON, ...patch });
const caught = (patch, needle, msg) =>
  ok(forged(patch).some((v) => v.indexOf(needle) >= 0),
    `${msg} — audit said ${JSON.stringify(forged(patch))}`);
caught({ coverage: { lines: ["Backed it 71% of the time"] } },
  "a percentage outside the Direction Match row", "a second percentage is caught");
caught({ coverage: { lines: ["Voted with the Democrats every time"] } },
  "party framing on the card", "party framing in a composed line is caught");
caught({ coverage: { lines: ["This is the complete record for this member."] } },
  "a completeness claim", "a completeness claim is caught");
caught({ coverage: { lines: ["Ranked 3rd of 50 on this issue"] } },
  "a grade or ranking", "a ranking is caught");
caught({ coverage: { lines: ["Graded B on the record"] } },
  "a grade or ranking", "a letter grade is caught");
caught({ complete: true }, "claims completeness", "a completeness flag is caught");
caught({ note: "" }, "without the coverage wall", "a card shipped without the wall is caught");
caught({ url: "https://politidex.fyi/?record=lee~x" },
  "not a person file", "a url that is not a person file is caught");
eq(C.audit({ ...M_ISSUE, directionMatch: { pct: 83, text: "Direction Match 83%" } })
  .filter((v) => v.indexOf("Direction Match on an issue card") >= 0).length, 1,
  "a percentage smuggled onto an issue card is caught");
eq(C.audit(null).length, 1, "and a missing card is not silently fine");

// THE OTHER DIRECTION. The tripwires run over what the CARD wrote. A quotation
// and a citation's proper name are exempt, because editing either to protect our
// framing is the dishonesty this fence is usually guarding against, reversed.
{
  const quoted = {
    ...M_ISSUE,
    stated: { text: "Democrats and Republicans both voted for that bipartisan bill.",
              source: { url: "https://example.com/a", label: "Deseret News" }, missing: "" },
    sources: [{ label: "House Armed Services Committee (Democrats)", url: "https://example.gov/b" }],
  };
  eq(C.audit(quoted).length, 0,
    "their own words and a committee's real name do not trip the party wire");
  has(C.text(quoted), "bipartisan bill", "and the quotation reaches the reader intact");
  has(C.text(quoted), "(Democrats)", "as does the citation's real name");
  // A bill is really called the Bipartisan Safer Communities Act. Dropping the
  // act line would delete a formal act from the card to protect a phrase.
  eq(C.scrub(["Bipartisan Safer Communities Act · Voted Nay"]).length, 0,
    "the composed-line scrub is strict by design…");
  has(CARD_CODE, "scrubQuoted", "…so quoted act lines go through their own, narrower scrub");
  const billLine = "S. 2938 · Bipartisan Safer Communities Act · Voted Nay";
  const bill = { ...M_ISSUE, formal: { lines: [billLine], quoted: [billLine], card: null } };
  eq(C.audit(bill).filter((v) => v.indexOf("party framing") >= 0).length, 0,
    "and a bill's real name is not read as party framing");
  // The exemption is the QUOTED set, not the block: a sentence this module wrote
  // into the same block is still policed.
  eq(C.audit({ ...M_ISSUE, formal: { lines: [billLine, "Sided with the Republicans here"],
    quoted: [billLine], card: null } })
    .filter((v) => v.indexOf("party framing") >= 0).length, 1,
    "while a composed line in that same block still trips the wire");
  // And the real formal block carries that set, so the exemption is reachable.
  ok(Array.isArray((M_ISSUE.formal || {}).quoted),
    "a real formal block names which of its lines are quotations");
}
// The product's own disclaimer says "not a score". A wire that fired on the
// denial would be reading it as the claim.
eq(C.audit({ ...M_ISSUE, points: { lines: ["3 votes on file — all 3 cut against it"],
  note: "this is what the record itself did — not a score." } }).length, 0,
  "an explicit “not a score” disclaimer is not a score");
caught({ coverage: { lines: ["The score is what the record itself did."] } },
  "a grade or ranking", "but an affirmative score claim still is");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · nothing composited, nothing ranked, nothing written");
// ═════════════════════════════════════════════════════════════════════════════

// The refusals are DECLARED in two places — the NEVER_FEEDS list and the grade
// tripwire's own word list — so those two declarations come out before asking
// whether the module can reach any of it.
const DECLESS = CARD_CODE
  .replace(/NEVER_FEEDS:[\s\S]*?\],/, " ")
  .replace(/var GRADE_WORDS =[^;]*;/, " ");
eq(C.scored, false, "the module declares itself unscored");
eq(C.ranked, false, "and unranked");
for (const n of ["directionMatchInput", "retiredCompositeRating", "compositeGrade",
                 "financeIntoDirectionMatch", "crossPersonRanking", "leaderboard"]) {
  ok(C.NEVER_FEEDS.indexOf(n) >= 0, `NEVER_FEEDS declares ${n}`);
  lacks(DECLESS, n, `and the module never touches ${n}`);
}
// The retired composite is refused by DESCRIPTION, because the retirement fence
// bans its identifier from every shipped module — including from a list of
// things we promise not to build.
lacks(CARD_CODE, "accountabilityScore", "the retired symbol is spelled in a shipped module");
// The retired composite, the money lane and cross-person comparison, by name.
for (const n of ["accountability", "AccountabilityScore", "compositeScore", "overallGrade",
                 "PDXFinance", "financeTotal", "contribution", "PDXMandate",
                 "compareTo", "vsAverage", "percentile", "peerRank"]) {
  lacks(DECLESS, n, `the card cannot reach ${n}`);
}
// A reader, not a writer: no persistence, no network, no engine mutation.
for (const n of ["localStorage", "sessionStorage", "fetch(", "XMLHttpRequest",
                 "noteMember(", "indexedDB", "document.cookie"]) {
  lacks(CARD_CODE, n, `the card does not ${n.replace(/\W/g, "")}`);
}
// It reads the PUBLIC gates. cardsFor is the ungated feed and must not appear.
has(CARD_CODE, "publicCardsFor", "the say-vs-do feed is read through its public gate");
has(CARD_CODE, "publicRecordDirectionCardsFor", "and so is the record-direction feed");
ok(!/[^c]cardsFor\(/.test(CARD_CODE.replace(/public(Record Direction)?CardsFor/g, "")),
  "and the ungated cardsFor() is never called");
// The tier is read, never derived. A second tier engine is a second grade.
lacks(CARD_CODE, "_recordPatternTier", "the module does not re-run the pattern tier engine");
has(CARD_CODE, "publicTier", "it asks receipt-cards for the tier it already published");
has(CARD_CODE, "recordDirection.slot", "and prints the slot's own three states verbatim");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the coverage block is counts and a door, never a proportion");
// ═════════════════════════════════════════════════════════════════════════════

for (const m of [M_PERSON, M_ISSUE, M_THIN]) {
  eq(m.complete, false, `the ${m.scope} card never claims completeness`);
  eq(m.note, C.NOTE, "and ships the coverage wall");
  has(C.text(m), C.NOTE, "in the paste");
  has(C.html(m), C.NOTE, "and in the markup");
  ok((m.coverage.lines || []).length > 0, "with at least one coverage line");
  for (const l of m.coverage.lines) {
    ok(!/\d\s*%/.test(l), `the coverage line carries no percentage (${l})`);
    ok(!/\bcomplete\b|\bfull record\b|\ball of\b/i.test(l),
      `and no completeness claim (${l})`);
  }
}
has(C.NOTE, "not everything that exists", "the wall says what the card is not");
has(C.NOTE, "counts, never as a completeness figure", "and how coverage is stated");
// The count is said once. Saying "11 open gaps" twice under one heading reads as
// two facts about the same number.
{
  const t = C.text(M_PERSON);
  const n = M_PERSON.coverage.gaps;
  if (n) eq((t.match(new RegExp(n + " open gap", "g")) || []).length, 1,
    "the open-gap count appears exactly once on the card");
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · a self-defection item shares as one person × one issue");
// ═════════════════════════════════════════════════════════════════════════════

{
  const SD = W.PDXSelfDefection;
  must(SD && typeof SD.itemsFor === "function", "PDXSelfDefection is not loaded in this harness");
  let found = null;
  for (const pid of [...byMember.keys()].slice(0, 80)) {
    const list = SD.itemsFor(pid, W.CMP_DATA[pid]);
    if (list && list.length) { found = [pid, list]; break; }
  }
  must(found, "no real self-defection item in the corpus to share");
  const [pid, list] = found;
  const html = SD.personHtml(pid, W.CMP_DATA[pid]);
  const btns = html.match(/data-pdxrec-share="/g) || [];
  eq(btns.length, list.length,
    "every item on the list carries its own share control — one per contradiction");
  const withIssue = html.match(/data-pdxrec-share-issue="/g) || [];
  eq(withIssue.length, list.length,
    "and each one names the issue, so a share is one person on one issue");
  for (const x of list) {
    has(html, `data-pdxrec-share-issue="${x.issueKey}"`,
      `the ${x.issueKey} item shares as that issue`);
    const m = P(pid, x.issueKey);
    ok(!!m, `and the card for ${pid}/${x.issueKey} builds`);
    eq(C.audit(m).length, 0, `and ships clean`);
    eq(m.directionMatch, null, "with no percentage on it");
    has(m.url, `/p/${pid}`, "landing on the person file");
  }
  // Still not a leaderboard: the share is per item, and nothing counts them.
  const btn = C.buttonHtml({ pid, issueKey: list[0].issueKey });
  for (const bad of ["worst", "best", "rank", "leaderboard", "#1", "top "]) {
    lacks(btn.toLowerCase(), bad, `the share control says nothing ranked ("${bad}")`);
  }
  lacks(btn, "%", "and carries no figure");
  eq(C.buttonHtml({}), "", "no pid, no control");
  has(btn, "aria-label", "the control is labelled for a screen reader");
  has(btn, "Opens their person file", "and says where it goes");
}

// ═════════════════════════════════════════════════════════════════════════════
section("9 · the census — every card the corpus can build, audited");
// ═════════════════════════════════════════════════════════════════════════════

{
  let cards = 0, dm = 0, issueCards = 0, thinCards = 0, quoted = 0, unlinked = 0;
  const violations = [];
  const pids = [...byMember.keys()].slice(0, 60);
  for (const pid of pids) {
    const p = W.CMP_DATA[pid];
    if (!p) continue;
    const read = W.PDXWordAction.read(pid, p) || {};
    const m = P(pid);
    cards++;
    if (m.directionMatch) dm++;
    if (m.building) thinCards++;
    violations.push(...C.audit(m).map((v) => `${pid} (person): ${v}`));
    const keys = [...new Set([...(read.tested || []), ...(read.untested || [])]
      .map((t) => t && t.issueKey).filter(Boolean))].slice(0, 6);
    for (const k of keys) {
      const mi = P(pid, k);
      if (!mi) continue;
      cards++; issueCards++;
      if (mi.stated) { quoted++; if (!mi.stated.source) unlinked++; }
      violations.push(...C.audit(mi).map((v) => `${pid}/${k}: ${v}`));
      if (mi.directionMatch) violations.push(`${pid}/${k}: an issue card carried a percentage`);
    }
  }
  must(cards > 200, `the census is too small to mean anything (${cards} cards)`);
  ok(issueCards > 100, `the census covers real issue cards (${issueCards})`);
  ok(dm > 0, `and real publishable person cards (${dm} with a Direction Match)`);
  eq(violations.length, 0,
    `every one of the ${cards} cards the corpus can build audits clean` +
    (violations.length ? ` — first: ${violations[0]}` : ""));
  console.log(`      ${cards} cards · ${dm} publishable · ${thinCards} still being built · ` +
    `${quoted} quoted positions (${unlinked} with no citation link, all disclosed)`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("10 · nothing moved");
// ═════════════════════════════════════════════════════════════════════════════

{
  // The control: the same engine files with record-card.js never loaded. Take the
  // reads there, build every card in the live sandbox, then take them again.
  const Z = boot(false);
  for (const [pid, items] of byMember) Z.PDXVotingRecord.noteMember(pid, items);
  const pids = [...byMember.keys()].slice(0, 40);
  const snap = (win) => pids.map((pid) => {
    const p = win.CMP_DATA[pid];
    const r = win.PDXWordAction.read(pid, p) || {};
    const sh = win.PDXConsistency.formalPatternIndex.shape(pid) || {};
    return [pid, r.pct, r.publishable, (r.tested || []).length, (r.untested || []).length,
      sh.judged, sh.read, sh.strongN, sh.splitN, sh.thinN].join("|");
  }).join("\n");

  const before = snap(Z);
  const liveBefore = snap(W);
  eq(liveBefore, before,
    "loading record-card.js changes no read: the two sandboxes agree figure for figure");
  // Now build everything, including every issue card, and look again.
  for (const pid of pids) {
    C.read(pid);
    C.text(pid);
    C.html(pid);
    const r = W.PDXWordAction.read(pid, W.CMP_DATA[pid]) || {};
    for (const t of (r.tested || []).slice(0, 4)) {
      C.read(pid, { issueKey: t.issueKey });
      C.html(pid, { issueKey: t.issueKey });
    }
  }
  eq(snap(W), before, "and building every card moves nothing either");
  // No engine file names this lane.
  for (const f of ["consistency.js", "word-action.js", "receipt-cards.js", "stance-helpers.js",
                   "inventory.js", "gaps.js", "profile-card.js"]) {
    lacks(strip(R(f)), "PDXRecordCard", `${f} does not know this module exists`);
  }
  // Except share-links, which owns the address — and owns only the address.
  has(strip(R("share-links.js")), "personRecord", "share-links.js owns the record-card address");
  lacks(strip(R("share-links.js")), "PDXRecordCard", "and does not read the card itself");
}

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ record-card: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ record-card: all ${passed} assertions passed`);
console.log("   five blocks · one gated percentage · thin says thin · every link on /p/ · " +
  "quotes intact, framing fenced · nothing moved");
