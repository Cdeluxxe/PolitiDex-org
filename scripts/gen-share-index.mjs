#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-share-index.mjs — the small lookup table the share-preview edge runs on
// ─────────────────────────────────────────────────────────────────────────────
// A social scraper does not run JavaScript. It fetches the URL once, reads the
// HEAD, and leaves. So the only way a shared PolitiDex link can unfurl as itself
// rather than as the generic homepage card is for the EDGE to already know what
// that URL is about — before the app boots.
//
// Everything the edge needs for a title and a one-line description is already in
// the client bundle, but it is spread across megabytes of DOM-coupled JS that no
// edge function can (or should) load. This build step distills the four small
// pieces that matter into one JSON file the edge imports at cold start:
//
//   people       — id → name / office / state / party       (from cmp-data.js)
//   spotlights   — slug → title / description / place       (from spotlights-data.js)
//   cores        — core issue key → label / blurb           (from alignment-tool.js)
//   issues       — ISSUE_MAP key → label                    (from alignment-tool.js)
//   personRecord — id → up to 6 formal-pattern lines        (from gen-crawl-record.mjs)
//
// Nothing here is a judgment. There is deliberately no score, no verdict, no
// kept/broken tally: a preview is an ADDRESS LABEL for a page, and a cached
// verdict that has since moved is exactly the kind of thing that must never
// travel as a PNG in someone's feed. The edge card says what the page IS.
//
// ── The fifth table is not for a card ───────────────────────────────────────
// personRecord is read by the person-file CRAWL BLOCK, not by a preview: the
// visible <h1>/office/record header share-preview.ts injects into /p/<pid> so the
// address is a document about one person before any JavaScript runs. Phase A gave
// that block a name and an office, which made 757 person addresses distinct from
// the homepage without making them distinct from EACH OTHER. These lines are the
// formal record's shape, in the profile brief's own words.
//
// It is still not a judgment, and it is held to the same walls: a tier and an
// issue and, where the brief prints them, two side counts. No percentage, no
// Direction Match figure, no Word-vs-Action number, no party tally. And the lines
// are SELECTED here, never derived — scripts/gen-crawl-record.mjs boots the real
// consistency.js and reads formalPatternIndex.shape(), the same accessor the live
// brief renders from, so there is exactly one pattern engine in the product. Its
// header carries the rest of the reasoning; regenerating this index refreshes the
// snapshot, which is why it lives here and not in a file of its own that could be
// forgotten.
//
// ── The second output: db/share-stances.json ─────────────────────────────────
// A Word-vs-Action link is ABOUT a comparison, and until now the edge could not
// see either half of it, so every record preview unfurled as the same factless
// template: "What X said about Y, next to what they did." That sentence describes
// a comparison instead of showing one, which is why nobody clicked it.
//
// The DID half already lives in the database and the edge can fetch it. The SAID
// half lives in the client stance bundle, which no edge function can load. So the
// stated position is distilled here, into its own file rather than into the index
// above, because it is ~8× the size of everything else combined and only the two
// share functions ever read it — keeping it separate makes that cost explicit and
// measurable rather than smuggled into a file four other things import.
//
// This does NOT break the honesty rule above. A stated position and a recorded
// vote are both immutable facts with sources; the VERDICT computed from them is
// the revisable interpretation, and that still never travels. The card shows the
// two facts and lets the reader do the arithmetic.
//
// Entries are keyed by the ROSTER id a share link actually carries, not by the
// stance block's own key, and are resolved with the same precedence the client
// uses (`_resolveStanceList` in stance-helpers.js: direct id → STANCE_ALIASES →
// display-name slug → alias of that slug). Resolving here rather than at the edge
// means the preview can never disagree with the page it previews.
//
// Run it whenever the roster, the Spotlights, the stance data, or the issue
// vocabulary change:
//   node scripts/gen-share-index.mjs
// Output is sorted and carries no timestamp, so re-running only changes the file
// when the underlying content actually changed.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildCrawlRecord } from "./gen-crawl-record.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "db", "share-index.json");
const OUT_STANCES = join(ROOT, "db", "share-stances.json");

// The stance bundle, in the exact set and order index.html loads it with `defer`.
// politician-stances.js is deliberately ABSENT: it is the retired ~1.1 MB monolith
// that scripts/split-stances.mjs divided into the two chunks below, and reading it
// here would ship stale positions the app itself no longer serves.
const STANCE_FILES = [
  "politician-stances-core.js",
  "politician-stances-ext.js",
  "state-senate-stances.js",
  ...Array.from({ length: 15 }, (_, i) => `state-senate-stances-w${i + 2}.js`),
];

// ── Reading the plain-data bundles ───────────────────────────────────────────
// cmp-data.js and spotlights-data.js are pure `Object.assign(window.X, {…})`
// data modules — no DOM, no side effects — so they evaluate cleanly in a bare
// sandbox with nothing but a `window` object to attach to.
function loadDataGlobals(files) {
  const sandbox = { window: {}, document: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), "utf8");
    try {
      vm.runInContext(src, sandbox, { filename: f });
    } catch (err) {
      throw new Error(`Failed to evaluate ${f}: ${err.message}`);
    }
  }
  return sandbox.window;
}

// ── Reading a literal out of a DOM-coupled file ──────────────────────────────
// alignment-tool.js is a big IIFE that touches the DOM, so it cannot be run.
// Extract just the balanced literal that follows a marker, counting only the
// brackets that are part of the structure — skipping any that appear inside
// string literals or inside `//` and `/* */` comments, both of which occur
// throughout these blocks. (Same scanner shape as gen-issue-keys.mjs.)
function extractLiteral(src, markerRe, open, close, what) {
  const marker = markerRe.exec(src);
  if (!marker) throw new Error(`Could not find ${what} in alignment-tool.js`);

  let i = marker.index + marker[0].length;
  if (src[i] !== open) throw new Error(`Expected \`${open}\` after ${what}`);

  let depth = 0;
  let quote = null;
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && next === "/") {
      i = src.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") quote = ch;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Unbalanced brackets while reading ${what}`);
}

function evalLiteral(literal, what) {
  try {
    return new Function(`return (${literal});`)();
  } catch (err) {
    throw new Error(`Failed to evaluate ${what}: ${err.message}`);
  }
}

// Collapse whitespace and cap a string — descriptions land in a <meta content="…">
// and on a 1200×630 card, and neither has room for an essay.
function trim(s, max) {
  const out = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (out.length <= max) return out;
  return out.slice(0, max - 1).replace(/[\s,;:.\-—]+$/, "") + "…";
}

// ── people ───────────────────────────────────────────────────────────────────
const globals = loadDataGlobals(["cmp-data.js", "spotlights-data.js", ...STANCE_FILES]);

// The stance wave files multiply (there are 16 already), and a wave that ships to
// index.html but not to STANCE_FILES above would silently cost every one of its
// people a rich preview — a gap nobody would notice, because the fallback is the
// old factless card that looks fine. So the two lists are asserted equal here.
{
  const indexHtml = readFileSync(join(ROOT, "index.html"), "utf8");
  const referenced = new Set(
    Array.from(
      indexHtml.matchAll(/<script[^>]+src="\/?((?:politician|state-senate)-stances[^"]*\.js)"/g),
      (m) => m[1]
    )
  );
  const missing = [...referenced].filter((f) => !STANCE_FILES.includes(f)).sort();
  if (missing.length) {
    throw new Error(
      `index.html loads stance files this generator does not read: ${missing.join(", ")}. ` +
        `Add them to STANCE_FILES or their people lose the "said" side of every share preview.`
    );
  }
  const stale = STANCE_FILES.filter((f) => !referenced.has(f)).sort();
  if (stale.length) {
    throw new Error(
      `STANCE_FILES reads files index.html no longer loads: ${stale.join(", ")}. ` +
        `Remove them, or the preview will quote positions the app does not serve.`
    );
  }
}

const people = {};
const roster = globals.CMP_DATA || {};
for (const id of Object.keys(roster).sort()) {
  const p = roster[id];
  if (!p || !p.name) continue;
  const rec = { n: trim(p.name, 80) };
  if (p.office) rec.o = trim(p.office, 80);
  if (p.state) rec.s = trim(p.state, 40);
  if (p.party) rec.p = trim(p.party, 16);
  people[id] = rec;
}
if (!Object.keys(people).length) {
  throw new Error("CMP_DATA produced zero people — refusing to write an empty index");
}

// ── personAliases — the id an ARRIVING person address means ──────────────────
// /p/mike_lee and /p/lee are one senator. /p/scott_chew and /p/chew_h68 are one
// Utah representative. The app has always known that: person-file.js resolve()
// walks PDX_PROFILE_ALIAS and then the display-name slug before it opens
// anything, which is why those addresses open the right file in the browser.
//
// The EDGE could not know it, and that was a crawl defect rather than a cosmetic
// one. An unresolved alias meant INDEX.people had no row, so resolveTarget
// returned null, so /p/mike_lee kept the homepage's title and the homepage's
// canonical — a second address for a person who already has one, declaring
// itself a duplicate of "/". So the same two tables the app resolves through are
// distilled here, in the same precedence order, exactly as the stance index below
// mirrors _resolveStanceList. This is NOT a second identity table: every entry is
// derived from a claim the repo already makes, and no entry invents a person.
//
//   1 · PDX_PROFILE_ALIAS (profile-evidence.js) — the repo's standing assertion
//       that the id on the left is not a separate officeholder. It wins, because
//       it wins in canonId(): a retirement outranks a stray document filed under
//       the retired key (the /p/scott_chew vs /p/chew_h68 defect).
//   2 · the display-name slug, accepted ONLY when exactly one roster record
//       answers to it. Two people share a name more often than a slug table
//       expects, so an ambiguous name resolves to nothing rather than to a coin
//       flip — the same refusal bySlug() makes.
//
// A slug that is itself a roster id is never emitted: resolve() checks
// record(pid) before it reaches the slug step, so that id already means itself.
// PROFILES (the Firestore half of the roster) is not readable at build time, so a
// person who exists ONLY there gets no alias row and simply keeps today's generic
// preview — the same fail-open the rest of this file uses.
const profileAliases = evalLiteral(
  extractLiteral(
    readFileSync(join(ROOT, "profile-evidence.js"), "utf8"),
    /window\.PDX_PROFILE_ALIAS\s*=\s*window\.PDX_PROFILE_ALIAS\s*\|\|\s*/,
    "{",
    "}",
    "`window.PDX_PROFILE_ALIAS =`"
  ),
  "the PDX_PROFILE_ALIAS literal"
);

// Mirror of canonId() in person-file.js: the bridge hop, taken only when its
// target is a live record, so a stale alias can never blank out a real person.
function canonId(id) {
  const direct = profileAliases[id];
  if (direct && direct !== id && people[direct]) return direct;
  return id;
}
function nameSlug(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const personAliases = {};
for (const key of Object.keys(profileAliases).sort()) {
  const target = canonId(key);
  if (target !== key && people[target]) personAliases[key] = target;
}
// Candidates are canonicalised BEFORE the ambiguity test, exactly as bySlug()
// does it: "Scott Chew" is the display name on the roster record and on the
// retired key, and two ids that canonicalise to the same one are one match, not a
// tie.
const AMBIGUOUS = " ";
const bySlug = {};
for (const id of Object.keys(people).sort()) {
  const want = nameSlug(people[id].n);
  if (!want) continue;
  const cid = canonId(id);
  if (bySlug[want] && bySlug[want] !== cid) bySlug[want] = AMBIGUOUS;
  else bySlug[want] = cid;
}
for (const want of Object.keys(bySlug).sort()) {
  const cid = bySlug[want];
  if (cid === AMBIGUOUS) continue;
  if (want === cid || people[want] || personAliases[want]) continue;
  personAliases[want] = cid;
}
if (!personAliases.mike_lee || !personAliases.scott_chew) {
  throw new Error(
    "personAliases lost a known alias (mike_lee → lee, scott_chew → chew_h68) — " +
      "refusing to write an index that would canonicalise a person's own address as the homepage"
  );
}

// ── spotlights ───────────────────────────────────────────────────────────────
// An Issue Spotlight is a documented explainer, not a verdict on a person, so the
// index carries only its own framing: what it is called, where it applies, and
// the neutral summary the page already publishes as its meta description.
const spotlights = {};
const spots = globals.SPOTLIGHTS || {};
for (const slug of Object.keys(spots).sort()) {
  const sp = spots[slug];
  if (!sp || !sp.title) continue;
  const rec = { t: trim(sp.title, 120) };
  const desc = sp.metaDescription || sp.blurb || sp.summary || "";
  if (desc) rec.d = trim(desc, 260);
  if (sp.place) rec.pl = trim(sp.place, 60);
  if (sp.updated) rec.u = trim(sp.updated, 60);
  spotlights[slug] = rec;
}
if (!Object.keys(spotlights).length) {
  throw new Error("SPOTLIGHTS produced zero entries — refusing to write an empty index");
}

// ── issue vocabulary ─────────────────────────────────────────────────────────
const alignSrc = readFileSync(join(ROOT, "alignment-tool.js"), "utf8");

const issueMap = evalLiteral(
  extractLiteral(alignSrc, /var\s+ISSUE_MAP\s*=\s*/, "{", "}", "`var ISSUE_MAP =`"),
  "the ISSUE_MAP literal"
);
const coreList = evalLiteral(
  extractLiteral(alignSrc, /var\s+CORE_NATIONAL_ISSUES\s*=\s*/, "[", "]", "`var CORE_NATIONAL_ISSUES =`"),
  "the CORE_NATIONAL_ISSUES literal"
);

const issues = {};
for (const k of Object.keys(issueMap).sort()) {
  const label = issueMap[k] && issueMap[k].label;
  if (label) issues[k] = trim(label, 80);
}

const cores = {};
for (const c of coreList) {
  if (!c || !c.key) continue;
  cores[c.key] = { l: trim(c.label, 90) };
  if (c.blurb) cores[c.key].b = trim(c.blurb, 220);
}
if (!Object.keys(cores).length) {
  throw new Error("CORE_NATIONAL_ISSUES produced zero entries — refusing to write an empty index");
}

// ── the formal-pattern snapshot (the person-file crawl block's record lines) ──
// Keyed on the CANONICAL roster id, because that is what canonicalPersonId()
// hands the lookup: /p/mike_lee and /p/lee resolve to `lee` before the table is
// read, so one entry serves both addresses and the two pages cannot print
// different records. A person the engines read nothing for gets no entry at all,
// and an address with no entry prints no record section — a thin unpublished file
// stays name and office, and never says "no pattern" as though that were a
// finding about the person rather than a gap in our curation.
const { personRecord, stats: recordStats } = buildCrawlRecord(ROOT);

const payload = {
  _generatedBy:
    "scripts/gen-share-index.mjs (from cmp-data.js, spotlights-data.js, alignment-tool.js, gen-crawl-record.mjs)",
  _note:
    "Read by netlify/edge-functions/share-preview.ts and share-og.ts to build per-link social previews. Titles and descriptions only — no scores, no verdicts. personAliases maps an arriving person id to the one roster id it means (PDX_PROFILE_ALIAS, then the unambiguous display-name slug — the same precedence person-file.js resolve() uses); it holds no facts about anybody. personRecord is the person-file crawl block's formal-record lines, keyed on canonical roster id: p=pattern label, i=issue label, c=side counts where the profile brief prints them. It is a BUILD-TIME PROJECTION of the shipped roll-call and committee seeds read through the live formalPatternIndex/execRecordSummary engines, capped at 6 lines in the brief's own order, and it exists so the crawl block never has to call the voting-record API on an anonymous first byte. A pid with no readable pattern is absent by design; do not fill one in.",
  counts: {
    people: Object.keys(people).length,
    personAliases: Object.keys(personAliases).length,
    spotlights: Object.keys(spotlights).length,
    cores: Object.keys(cores).length,
    issues: Object.keys(issues).length,
    personRecord: Object.keys(personRecord).length,
  },
  people,
  personAliases,
  spotlights,
  cores,
  issues,
  personRecord,
};

// ── stated positions (the SAID half of a Word-vs-Action preview) ─────────────
// Resolved with the client's own precedence so the preview and the page can never
// quote different things. STANCE_ALIASES lives inside a DOM-coupled IIFE, so it is
// read as a literal rather than executed.
const stanceAliases = evalLiteral(
  extractLiteral(
    readFileSync(join(ROOT, "stance-helpers.js"), "utf8"),
    /var\s+STANCE_ALIASES\s*=\s*/,
    "{",
    "}",
    "`var STANCE_ALIASES =`"
  ),
  "the STANCE_ALIASES literal"
);

const STANCE_DATA = globals.ISSUE_STANCE_DATA || {};
if (!Object.keys(STANCE_DATA).length) {
  throw new Error("ISSUE_STANCE_DATA produced zero entries — refusing to write an empty stance index");
}

// Mirror of _stanceSlug / _resolveStanceList in stance-helpers.js. Kept literal
// rather than clever: if that precedence changes, this must change with it.
function stanceSlug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function resolveStanceList(id, p) {
  if (id && STANCE_DATA[id]) return STANCE_DATA[id];
  if (id && stanceAliases[id] && STANCE_DATA[stanceAliases[id]]) return STANCE_DATA[stanceAliases[id]];
  const nameSlug = p && p.name ? stanceSlug(p.name) : "";
  if (nameSlug && STANCE_DATA[nameSlug]) return STANCE_DATA[nameSlug];
  if (nameSlug && stanceAliases[nameSlug] && STANCE_DATA[stanceAliases[nameSlug]]) {
    return STANCE_DATA[stanceAliases[nameSlug]];
  }
  return null;
}

// A card has room for about two lines of quote and og:description caps at ~200
// characters, so a longer position is trimmed on a word boundary rather than
// shipped and clipped mid-glyph by whichever platform renders it.
const SAID_MAX = 180;

const stances = {};
let stancePeople = 0;
for (const id of Object.keys(roster).sort()) {
  const list = resolveStanceList(id, roster[id]);
  if (!Array.isArray(list)) continue;
  let got = 0;
  for (const s of list) {
    if (!s || !s.issueKey) continue;
    // The quote itself. `topic` is the headline, not the position, so it is only a
    // last resort — and an entry with neither is not a said side at all.
    const text = trim(s.text || "", SAID_MAX) || trim(s.topic || "", SAID_MAX);
    if (!text) continue;
    const key = `${id}|${s.issueKey}`;
    if (stances[key]) continue; // first stance on an issue wins, as in the app
    const rec = { t: text };
    // support / oppose / mixed — the word the app's own verdict is computed
    // against. Carried so the card can print "Opposes: …" rather than implying a
    // reading of the prose that the engine did not make.
    const word = s.issueStance || s.pos || "";
    if (word) rec.w = trim(word, 12);
    if (s.topic) rec.h = trim(s.topic, 70);
    // Source LABEL only. There is no date field anywhere in the stance data (all
    // 5,180 entries lack one), so the card says who reported the position and does
    // not invent when — a plausible guessed date is the exact failure this file's
    // honesty rules exist to prevent.
    if (s.source && s.source.label) rec.s = trim(s.source.label, 40);
    stances[key] = rec;
    got++;
  }
  if (got) stancePeople++;
}

const stancePayload = {
  _generatedBy: `scripts/gen-share-index.mjs (from cmp-data.js and ${STANCE_FILES.length} stance bundles)`,
  _note:
    "The SAID half of a Word-vs-Action share preview: a politician's stated position on one issue, keyed '<rosterId>|<issueKey>'. Facts only — the sourced position and who reported it. No verdict, no score: the DID half is fetched live from the voting-record API at preview time and the reader draws the conclusion. Fields: t=position text, w=support/oppose/mixed, h=topic headline, s=source label. There is no date field because the stance data has none; do not synthesise one.",
  counts: { people: stancePeople, pairs: Object.keys(stances).length },
  stances,
};

writeFileSync(OUT, JSON.stringify(payload) + "\n", "utf8");
writeFileSync(OUT_STANCES, JSON.stringify(stancePayload) + "\n", "utf8");
console.log(
  `Wrote share index to ${OUT} — ` +
    `${payload.counts.people} people (+${payload.counts.personAliases} id aliases), ` +
    `${payload.counts.spotlights} spotlights, ` +
    `${payload.counts.cores} core issues, ${payload.counts.issues} issue keys, ` +
    `${payload.counts.personRecord} formal-record snapshots (${recordStats.lines} lines)`
);
console.log(
  `Wrote stated positions to ${OUT_STANCES} — ` +
    `${stancePayload.counts.pairs} (person, issue) pairs across ${stancePayload.counts.people} people ` +
    `(${(JSON.stringify(stancePayload).length / 1024).toFixed(0)} KB)`
);
