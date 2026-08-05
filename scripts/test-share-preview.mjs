#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Share previews + honest deep links — the contract
// ─────────────────────────────────────────────────────────────────────────────
// THE BUG CLASS THIS EXISTS TO PREVENT
//
// A social card is the one piece of PolitiDex that travels WITHOUT the page. It is
// screenshotted, cached by scrapers for days, and read by people who never click.
// So the two ways it can go wrong are both severe and both silent:
//
//   1. It says something the site would not say. A preview is an ADDRESS LABEL —
//      what the page is about — never a verdict, a score, or a kept/broken tally.
//      Nothing on the edge can recompute a judgment, and a stale judgment frozen
//      into a PNG is not correctable. The resolver therefore carries no numbers,
//      and this harness fails if one appears.
//   2. An Issue Spotlight gets mistaken for an Official Record finding. A Spotlight
//      is a sourced explainer about a SUBJECT; the Official Record is a claim about
//      a PERSON. They must not share an eyebrow, an accent, or a vocabulary.
//
// And the third thing, which is why /vote/ is in here: netlify.toml rewrites
// /vote/* to index.html with status 200. Before this change nothing read that path,
// so every roll-call citation quietly returned the front page — a dead link that
// looks alive. The rule now is narrow and testable: a malformed or positively
// unknown roll call gets a real 404; ANY other failure (timeout, 500, cold
// database) falls through to the page unchanged.
//
//   node scripts/test-share-preview.mjs
//
// Transpiles netlify/lib/share-target.ts with esbuild and runs it against the
// committed share index, with fetch stubbed. Loads share-links.js into a node:vm
// sandbox with a fake window/location. No database, no network, no browser.

import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Tiny assert harness ──────────────────────────────────────────────────────
let passed = 0;
const failures = [];
function ok(cond, msg) { if (cond) passed++; else failures.push(msg); }
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++; else failures.push(`${msg}\n    expected ${e}\n    got      ${a}`);
}

// ── Transpile the resolver (TS → ESM), JSON import and all ───────────────────
// Bundling here also proves the `with { type: "json" }` import resolves at all —
// the edge runtime is Deno, but a broken path or a malformed index fails here first.
const outFile = join(mkdtempSync(join(tmpdir(), "share-test-")), "share-target.mjs");
execFileSync(
  join(ROOT, "node_modules/.bin/esbuild"),
  [
    join(ROOT, "netlify/lib/share-target.ts"),
    "--bundle", "--platform=node", "--format=esm", `--outfile=${outFile}`,
  ],
  { stdio: ["ignore", "ignore", "inherit"] }
);
const S = await import(outFile);
const INDEX = JSON.parse(readFileSync(join(ROOT, "db/share-index.json"), "utf8"));

const at = (u) => new URL(u, "https://politidex.fyi");
const parse = (u) => S.parseTarget(at(u));
const resolve = (u, origin = "https://politidex.fyi") => S.resolveTarget(parse(u), origin);

// ── 1. The generated index is real ───────────────────────────────────────────
// A silently empty index would make every assertion below vacuous: parseTarget
// would still work, resolveTarget would return null everywhere, and the site would
// ship with nothing but generic cards. Pin the floors.
ok(Object.keys(INDEX.people).length > 500, "index: people table is populated");
ok(Object.keys(INDEX.spotlights).length > 20, "index: spotlight table is populated");
ok(Object.keys(INDEX.cores).length >= 10, "index: core issue table is populated");
ok(Object.keys(INDEX.issues).length > 50, "index: issue label table is populated");

// The index must carry IDENTITY ONLY. Any score-shaped key is a judgment that the
// edge would then be free to print on a card it cannot recompute.
const FORBIDDEN = /^(score|pct|percent|grade|verdict|kept|broken|promise|rating|rank)$/i;
const leaked = [];
for (const [table, rows] of Object.entries(INDEX)) {
  for (const [id, row] of Object.entries(rows)) {
    if (row && typeof row === "object") {
      for (const k of Object.keys(row)) if (FORBIDDEN.test(k)) leaked.push(`${table}.${id}.${k}`);
    }
  }
}
eq(leaked, [], "index: carries no score/verdict field for a card to print");

// ── 2. parseTarget — every server-visible share form ─────────────────────────
eq(parse("/?p=aaron_ford"), { kind: "profile", id: "aaron_ford" }, "parse: ?p= → profile");
eq(parse("/issue/ai-regulation-job-displacement-2026"),
  { kind: "spotlight", slug: "ai-regulation-job-displacement-2026" }, "parse: /issue/<slug> → spotlight");
eq(parse("/?issue=ai-regulation-job-displacement-2026"),
  { kind: "spotlight", slug: "ai-regulation-job-displacement-2026" }, "parse: ?issue= → spotlight");
eq(parse("/?bill=119/H.R.%201"), { kind: "bill", congress: "119", number: "H.R. 1" }, "parse: ?bill= splits congress/number");
eq(parse("/?receipt=aaron_ford~healthcare"),
  { kind: "receipt", pid: "aaron_ford", issue: "healthcare" }, "parse: ?receipt= → receipt");
eq(parse("/?record=aaron_ford~healthcare"),
  { kind: "record", pid: "aaron_ford", issue: "healthcare" }, "parse: ?record= → record");
eq(parse("/?rank=healthcare&key=drug_prices"),
  { kind: "rank", core: "healthcare", focus: "drug_prices" }, "parse: ?rank= → ranking");
eq(parse("/vote/119/House/190"),
  { kind: "vote", congress: "119", chamber: "house", roll: "190" }, "parse: /vote/ path, chamber lower-cased");

// Receipt and record are two different surfaces and must never collapse into one.
ok(parse("/?receipt=x~y").kind !== parse("/?record=x~y").kind,
  "parse: Say-vs-Do and Official Record stay distinct kinds");

// The app writes ?p= while a profile is open and strips it on close, so it can sit
// on top of a Spotlight or roll-call path in a URL the reader copies out of the
// bar. What is on screen is the profile, and that is what the card must be about.
eq(parse("/issue/ai-regulation-job-displacement-2026?p=aaron_ford"),
  { kind: "profile", id: "aaron_ford" }, "parse: an open profile outranks the path it sits on");
eq(parse("/vote/119/house/190?p=aaron_ford"),
  { kind: "profile", id: "aaron_ford" }, "parse: …including over a roll-call path");

// Non-share URLs are none of this function's business — returning a target for a
// plain page load would put the edge in front of traffic it has no reason to touch.
for (const u of ["/", "/index.html", "/?utm_source=x", "/?views=abc", "/vote/119/house"])
  ok(parse(u) === null, `parse: '${u}' is not a share link`);

// ── 3. Resolution from the index (no network) ────────────────────────────────
const profile = await resolve("/?p=aaron_ford");
ok(profile && profile.title === "Aaron Ford", "profile: titled with the real name from the index");
ok(/Attorney General/.test(profile.subtitle) && /Nevada/.test(profile.subtitle),
  "profile: subtitle carries office and state");
ok(!profile.hash, "profile: needs no hash — ?p= already boots the app");

const spot = await resolve("/issue/ai-regulation-job-displacement-2026");
ok(spot && spot.title === INDEX.spotlights["ai-regulation-job-displacement-2026"].t,
  "spotlight: titled with the spotlight's own headline");
ok(spot.description.length > 40, "spotlight: has a real description, not a stub");

const rank = await resolve("/?rank=healthcare");
ok(rank && /^Who backs up their words on /.test(rank.title), "ranking: says what the ranking is");
ok(rank.hash === "#issue=healthcare", "ranking: ?rank= restores the app's existing #issue= hash");
// "X — X" in a <title> reads as a bug. The parent issue earns its place only when
// the sub-issue in the title is a different thing.
ok(!/^(.+) — \1 · PolitiDex$/.test(S.pageTitle(rank)), "ranking: title never repeats the issue back to itself");
ok(!/^(.+) — \1 · PolitiDex$/.test(S.pageTitle(await resolve("/?rank=healthcare&key=drug_prices"))),
  "ranking: an unrecognised sub-issue key does not produce a doubled title");

const receipt = await resolve("/?receipt=aaron_ford~healthcare");
ok(receipt.hash === "#receipt=aaron_ford~healthcare", "receipt: restores #receipt=");
const record = await resolve("/?record=aaron_ford~healthcare");
ok(record.hash === "#record=aaron_ford~healthcare", "record: restores #record=");
ok(receipt.eyebrow !== record.eyebrow, "receipt vs record: different eyebrows");

// An id we do not hold resolves to nothing — the caller falls back to the site
// card. Guessing a plausible name for an unknown id is how a preview starts lying.
for (const u of ["/?p=not_a_real_person", "/issue/not-a-real-spotlight", "/?receipt=nobody~healthcare"])
  ok((await resolve(u)) === null, `unknown: '${u}' resolves to null, never to an invented title`);

// ── 3b. The comparison — two facts, or none ──────────────────────────────────
// A Say-vs-Do link used to unfurl as an address label: the same sentence for every
// person, differing only by name and issue. It now carries the two halves of the
// comparison, which is allowed for one specific reason — a stated position and a
// recorded vote are IMMUTABLE and sourced, so a copy of them sitting in a platform
// cache for a week cannot become wrong. The verdict drawn from them is revisable,
// so it stays off the card. This section pins both halves of that bargain.
const realFetch = globalThis.fetch;
function stubFetch(reply) {
  globalThis.fetch = async () => {
    if (reply === "throw") throw new Error("network down");
    if (typeof reply === "number") return new Response("", { status: reply });
    return new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
  };
}
const stubMember = (items) => stubFetch({ items, total: items.length });

const SAID = JSON.parse(readFileSync(join(ROOT, "db/share-stances.json"), "utf8")).stances;
ok(Object.keys(SAID).length > 2000, "stance index: the said half is populated");

// Every key must name someone the card can actually title, or the edge would hold a
// quote it cannot attribute.
{
  const orphans = Object.keys(SAID).filter((k) => !INDEX.people[k.split("|")[0]]);
  eq(orphans.slice(0, 5), [], "stance index: every stance belongs to a person in the index");
  const empty = Object.entries(SAID).filter(([, v]) => !v.t || !String(v.t).trim());
  eq(empty.map(([k]) => k).slice(0, 5), [], "stance index: no stance carries an empty quote");
  const long = Object.entries(SAID).filter(([, v]) => String(v.t).length > 200);
  eq(long.map(([k]) => k).slice(0, 5), [], "stance index: quotes stay inside the card's budget");
  // The stance data has NO date field anywhere in it. The generator must not have
  // invented one, and the card must not print one — a fabricated date on a real
  // quote is exactly the kind of thing that cannot be taken back once cached.
  const dated = Object.entries(SAID).filter(([, v]) => Object.keys(v).some((f) => /^(d|dt|date|when|year)$/i.test(f)));
  eq(dated.map(([k]) => k).slice(0, 5), [], "stance index: carries no date, because the source data has none");
  const scored = Object.entries(SAID).filter(([, v]) => Object.keys(v).some((f) => FORBIDDEN.test(f)));
  eq(scored.map(([k]) => k).slice(0, 5), [], "stance index: carries no score/verdict field");
}

// The record half is ranked by what a reader can check: a recorded yea/nay on the
// measure itself beats one on the procedural motion that carried it, which beats an
// action with no roll call at all.
const CMP_URL = "/?record=curtis~climate_action";
stubMember([
  { kind: "position", actionType: "cosponsor", number: "H.R. 9", title: "Clean Energy Act", date: "2025-03-04", chamber: "house", source: { url: "https://a" } },
  { kind: "vote", position: "nay", isProcedural: true, number: "H.Res. 12", shortTitle: "Providing for consideration", date: "2025-07-01", chamber: "house", result: "passed", source: { url: "https://b" } },
  { kind: "vote", position: "yea", isProcedural: false, number: "S. 5", shortTitle: "Laken Riley Act", date: "2025-01-20", chamber: "senate", result: "passed", source: { url: "https://c" } },
]);
const cmp = await resolve(CMP_URL);
ok(cmp && cmp.comparison, "comparison: a record link resolves both halves");
eq(cmp.comparison.said.text, SAID["curtis|climate_action"].t,
  "comparison: the said half is the stored quote, character for character");
eq(cmp.comparison.said.word, "Supports", "comparison: the direction word comes from the app's own stance field");
eq(cmp.comparison.said.source, SAID["curtis|climate_action"].s, "comparison: the said half names its source");
ok(!("date" in cmp.comparison.said), "comparison: the said half carries no date it does not have");
eq(cmp.comparison.did.action, "Voted Yea", "comparison: the action is read off the record");
eq(cmp.comparison.did.measure, "S. 5", "comparison: the real vote outranks the procedural motion and the cosponsorship");
eq(cmp.comparison.did.date, "2025-01-20", "comparison: the record half keeps its real date");
ok(/Laken Riley/.test(cmp.description) && /Conservative Climate/.test(cmp.description),
  "comparison: the description carries both facts, not a description of them");
ok(/20 Jan 2025/.test(cmp.description), "comparison: the vote's date travels with the vote");
ok(!/undefined|NaN|null/.test(cmp.description), "comparison: no unresolved field leaks into the copy");

// A row with no source is not a citable fact, whatever else it says.
stubMember([{ kind: "vote", position: "yea", number: "S. 5", shortTitle: "Laken Riley Act", date: "2025-01-20", chamber: "senate", source: {} }]);
{
  const r = await resolve(CMP_URL);
  ok(r.comparison && !r.comparison.did, "comparison: a sourceless record row is dropped, not printed");
  ok(r.comparison.said, "comparison: the said half still travels on its own");
  ok(/Conservative Climate/.test(r.description), "comparison: a one-sided card still carries its one fact");
}

// The database being slow or down must degrade to the half we hold, never to a
// guess about the half we do not.
for (const failure of [500, "throw", { items: [] }]) {
  stubFetch(failure);
  const r = await resolve(CMP_URL);
  ok(r.comparison && r.comparison.said && !r.comparison.did,
    `comparison: a ${typeof failure === "object" ? "empty" : failure} record reply leaves the said half alone`);
  ok(!/Voted|roll call/i.test(r.description),
    "comparison: with no record in hand the copy claims no vote");
}

// Neither half → the old address-label sentence, verbatim. No quote marks, because
// there is no quote.
stubFetch("throw");
{
  const r = await resolve("/?record=aaron_ford~healthcare");
  ok(r && !r.comparison, "comparison: absent when neither half resolves");
  ok(/next to what they did/.test(r.description), "comparison: falls back to the honest address label");
  ok(!/[“”]/.test(r.description), "comparison: an unresolvable pair invents no quote");
}
globalThis.fetch = realFetch;

// ── 4. No preview states a verdict ───────────────────────────────────────────
// Every field that can reach a card or a <meta>, across every index-backed surface,
// swept for judgment vocabulary and for score-shaped numbers.
//
// One refinement now that comparisons travel: a quoted stance is the SUBJECT's
// words, not ours, and a bill's short title is Congress's. Those are stripped
// before the sweep. Everything left is ours, and ours must state nothing.
const VERDICT_WORDS = /\b(kept|broken|flip[- ]?flop|liar|lied|hypocri\w*|betrayed|failing|grade [A-F]\b)/i;
const SCORE_SHAPE = /\b\d{1,3}\s?%|\b\d\/\d\b|\bscore\b/i;
function ourWordsOnly(r) {
  let desc = r.description;
  if (r.comparison) {
    desc = desc.replace(/“[^”]*”?/g, " "); // the quoted position, closed or truncated
    const t = r.comparison.did?.title;
    if (t) desc = desc.split(t).join(" ");
  }
  return [r.title, r.subtitle, desc, r.footnote, S.pageTitle(r)].join(" ¶ ");
}
stubMember([
  { kind: "vote", position: "yea", isProcedural: false, number: "S. 5", shortTitle: "Laken Riley Act", date: "2025-01-20", chamber: "senate", result: "passed", source: { url: "https://c" } },
]);
const sampleUrls = [
  "/?p=aaron_ford", "/issue/ai-regulation-job-displacement-2026", "/?rank=healthcare",
  "/?rank=healthcare&key=drug_prices", "/?receipt=aaron_ford~healthcare", "/?record=aaron_ford~healthcare",
  "/?record=curtis~climate_action", "/?receipt=curtis~healthcare",
];
for (const u of sampleUrls) {
  const r = await resolve(u);
  if (!r) { failures.push(`sweep: '${u}' unexpectedly failed to resolve`); continue; }
  const blob = ourWordsOnly(r);
  ok(!VERDICT_WORDS.test(blob), `honesty: '${u}' preview states no verdict — got: ${blob}`);
  ok(!SCORE_SHAPE.test(blob), `honesty: '${u}' preview prints no score — got: ${blob}`);
  ok(/PolitiDex$/.test(S.pageTitle(r)), `title: '${u}' <title> is branded`);
  ok(S.pageTitle(r).length <= 110, `title: '${u}' <title> stays inside its budget`);
  // A comparison earns a longer description because it is carrying evidence; an
  // address label does not.
  const budget = r.comparison ? 280 : 200;
  ok(r.description.length <= budget, `description: '${u}' fits an unfurl (${r.description.length}/${budget})`);
  ok(/^kind=/.test(r.ogQuery), `card: '${u}' addresses /share-og by kind + ids`);
}
globalThis.fetch = realFetch;


// ── 5. A Spotlight is not a verdict card ─────────────────────────────────────
// The single most damaging confusion this feature could create, so it is pinned
// from both directions: the Spotlight must SAY it is not a verdict, and it must not
// borrow the Official Record's chrome or wording.
ok(/not a verdict on any politician/i.test(spot.footnote),
  "spotlight: footnote says outright that it is not a verdict on a politician");
ok(!/official record/i.test([spot.eyebrow, spot.title, spot.description].join(" ")),
  "spotlight: never borrows Official Record vocabulary");
ok(spot.eyebrow !== S.CHROME.record.eyebrow && spot.accent !== S.CHROME.record.accent,
  "spotlight: neither eyebrow nor accent collides with the Official Record");

// Every surface is visually distinct, or two PolitiDex links in one feed read as
// the same card and the labelling was pointless.
const eyebrows = Object.values(S.CHROME).map((c) => c.eyebrow);
const accents = Object.values(S.CHROME).map((c) => c.accent);
eq(new Set(eyebrows).size, eyebrows.length, "chrome: every surface has its own eyebrow");
eq(new Set(accents).size, accents.length, "chrome: every surface has its own accent");

// ── 6. /vote/ — honest, or nothing ───────────────────────────────────────────
// Reusing the fetch stub from §3b so each reply shape can be pinned exactly. The
// rule under test: only a definitive "no such roll call" may produce a 404;
// everything else falls through to the page, because our outage is not the link's
// fault.

for (const bad of ["/vote/119/senat/190", "/vote/abc/house/190", "/vote/119/house/0"]) {
  stubFetch(500); // must not even matter — the address is wrong on its face
  const r = await resolve(bad);
  ok(r && r.notFound === true, `vote: malformed address '${bad}' is refused without a lookup`);
}

stubFetch(404);
const missing = await resolve("/vote/119/house/999999");
ok(missing && missing.notFound === true, "vote: an API 404 becomes an honest not-found");
ok(/no record of roll call 999999/i.test(missing.message) && /House/.test(missing.message),
  "vote: the not-found message names the exact roll call asked for");

for (const failure of [500, 503, "throw"]) {
  stubFetch(failure);
  const r = await resolve("/vote/119/house/190");
  ok(r === null, `vote: a ${failure} from the API fails OPEN (null), never a 404`);
}

stubFetch({
  rollcall: { rollNumber: 190, chamber: "house", question: "On Passage", result: "passed", totals: { yea: 215, nay: 214 } },
  measure: { congress: 119, number: "H.R. 1", shortTitle: "One Big Beautiful Bill Act" },
});
const vote = await resolve("/vote/119/house/190");
ok(vote && !vote.notFound, "vote: a known roll call resolves");
ok(/House roll call 190/.test(vote.title) && /H\.R\. 1/.test(vote.title),
  "vote: title names the chamber, the roll number and the measure");
ok(vote.hash === "#bill/119/H.R.%201", "vote: opens the measure the roll call belongs to");
ok(/215–214/.test(vote.description), "vote: the recorded tally is a fact, and is reported");

stubFetch({ measure: { congress: 119, number: "H.R. 1", shortTitle: "One Big Beautiful Bill Act" } });
const bill = await resolve("/?bill=119/H.R.%201");
ok(bill && bill.title === "H.R. 1", "bill: titled by its number");
ok(bill.hash === "#bill/119/H.R.%201", "bill: ?bill= restores the app's existing #bill/ hash");

stubFetch({});
ok((await resolve("/?bill=119/H.R.%20404")) === null, "bill: an unknown measure falls back to the site card");
globalThis.fetch = realFetch;

// ── 7. The card endpoint cannot be made to lie ───────────────────────────────
// /share-og is a public URL anyone can construct and screenshot. It takes ids and
// looks the words up; if it ever read a title/description/text param straight from
// the query it would become a way to print arbitrary claims on PolitiDex letterhead.
const OG_SRC = readFileSync(join(ROOT, "netlify/edge-functions/share-og.ts"), "utf8");
const ogParams = [...OG_SRC.matchAll(/searchParams\.get\(\s*["'`]([^"'`]+)["'`]\s*\)/g)].map((m) => m[1]);
const freeText = ogParams.filter((p) => /^(title|subtitle|desc|description|text|label|eyebrow|footnote|name)$/i.test(p));
eq(freeText, [], "share-og: reads ids only — no free-text parameter reaches the card");
ok(ogParams.includes("kind"), "share-og: dispatches on kind");
ok(/catch\b/.test(OG_SRC) && /genericCard\(\)/.test(OG_SRC),
  "share-og: any throw still returns a card, never a 500 for a scraper to cache");

// ── 7b. The rendered card, not just its source ───────────────────────────────
// The card is the artifact that actually travels, so it is rendered here and read.
// Bundling it also proves the Deno edge module has no Node-hostile import.
const ogOut = join(mkdtempSync(join(tmpdir(), "share-og-")), "share-og.mjs");
execFileSync(
  join(ROOT, "node_modules/.bin/esbuild"),
  [join(ROOT, "netlify/edge-functions/share-og.ts"), "--bundle", "--platform=node", "--format=esm", `--outfile=${ogOut}`],
  { stdio: ["ignore", "ignore", "inherit"] }
);
const OG = await import(ogOut);
const renderCard = async (query) =>
  (await OG.default(new Request("https://politidex.fyi/share-og?" + query))).text();

const REAL_VOTE = [
  { kind: "vote", position: "yea", isProcedural: false, number: "S. 5", shortTitle: "Laken Riley Act", date: "2025-01-20", chamber: "senate", result: "passed", source: { url: "https://c" } },
];
{
  stubMember(REAL_VOTE);
  const svg = await renderCard("kind=record&pid=curtis&issue=climate_action");
  ok(/^<svg /.test(svg.trim()) && /<\/svg>$/.test(svg.trim()), "card: renders one well-formed SVG");
  ok(!/undefined|NaN|\[object/.test(svg), "card: no unresolved value reaches the image");
  ok(/John Curtis/.test(svg), "card: the name is on it");
  ok(/ON CLIMATE ACTION/.test(svg), "card: the issue is on it, readable at feed size");
  ok(/SAID/.test(svg) && /ON THE RECORD/.test(svg), "card: both halves are labelled");
  ok(/Conservative Climate/.test(svg), "card: the stated position is quoted, not summarised");
  ok(/Voted Yea/.test(svg) && /S\. 5/.test(svg) && /20 Jan 2025/.test(svg),
    "card: the recorded action, the measure and its date are all on it");
  ok(/Source: Congress\.gov/.test(svg), "card: the said half names its source");
  // The whole bargain in one assertion: facts yes, judgment no.
  const CARD_VERDICT = /(backs it up|words match actions|says one thing|red flag|consistent|contradict|inconsist|mixed record|verdict|kept|broken|\d{1,3}\s?%)/i;
  const cardText = [...svg.matchAll(/>([^<]+)</g)].map((m) => m[1]).join(" ¶ ");
  ok(!CARD_VERDICT.test(cardText), `card: prints no verdict and no score — got: ${cardText}`);
  ok(/politidex\.fyi/.test(svg), "card: is branded");
}
{
  // Said-only: one full-width panel, and no empty box implying a missing vote.
  stubFetch({ items: [] });
  const svg = await renderCard("kind=receipt&pid=curtis&issue=climate_action");
  ok(/Conservative Climate/.test(svg), "card: a said-only card still carries its fact");
  ok(!/ON THE RECORD/.test(svg), "card: no record panel is drawn for a record we do not have");
  ok(!/>vs</.test(svg), "card: no comparison divider when there is nothing to compare against");
  ok(/width="1040"/.test(svg), "card: the surviving half takes the full width");
}
{
  // Nothing at all → the generic site card, never a half-drawn comparison.
  stubFetch("throw");
  const svg = await renderCard("kind=record&pid=aaron_ford&issue=healthcare");
  ok(!/SAID/.test(svg) && !/ON THE RECORD/.test(svg), "card: an unresolvable pair draws no panels");
  ok(/Track promises, money and receipts|Aaron Ford/.test(svg), "card: falls back to a real card");
  const svg2 = await renderCard("kind=record&pid=nobody_at_all&issue=healthcare");
  ok(/Track promises/.test(svg2), "card: an unknown person gets the site card, not an invented one");
}
{
  // Two different comparisons must not render as the same picture — the entire
  // point of putting the facts on the card.
  stubMember(REAL_VOTE);
  const a = await renderCard("kind=record&pid=curtis&issue=climate_action");
  const b = await renderCard("kind=record&pid=curtis&issue=healthcare");
  ok(a !== b, "card: a different issue produces a visibly different card");
}
globalThis.fetch = realFetch;

// ── 8. The meta rewriter fails open, and leaves ?views= alone ────────────────
const PRE_SRC = readFileSync(join(ROOT, "netlify/edge-functions/share-preview.ts"), "utf8");
ok(/searchParams\.has\(["'`]views["'`]\)\s*\)\s*return/.test(PRE_SRC),
  "share-preview: hands ?views= links back to stance-share.ts untouched");
ok(/if \(!target\) return;/.test(PRE_SRC), "share-preview: a URL it does not recognise passes straight through");
ok(/catch\s*{\s*\n?\s*return;/.test(PRE_SRC), "share-preview: any throw serves the original page");
ok(/headers\.delete\(["'`]content-length["'`]\)/.test(PRE_SRC) &&
   /headers\.delete\(["'`]content-encoding["'`]\)/.test(PRE_SRC),
  "share-preview: drops length/encoding headers made stale by the rewrite");
ok(/status:\s*404/.test(PRE_SRC), "share-preview: the dead-end page is a real 404, not a 200 dressed as one");
ok(/name="robots" content="noindex"/.test(PRE_SRC), "share-preview: the dead-end page is not indexable");

// The rewriter's meta selectors must match the tags index.html actually ships, or
// every rewrite silently no-ops and the whole feature is a no-op with tests.
const HTML = readFileSync(join(ROOT, "index.html"), "utf8");
for (const [sel, key] of [
  ["property", "og:title"], ["property", "og:description"], ["property", "og:url"],
  ["property", "og:image"], ["property", "og:image:alt"],
  ["name", "twitter:title"], ["name", "twitter:description"], ["name", "twitter:image"],
  ["name", "description"],
]) {
  const re = new RegExp(`<meta\\s+${sel}="${key}"\\s+content="[^"]*"`, "i");
  ok(re.test(HTML), `head: <meta ${sel}="${key}"> exists in the exact shape the rewriter matches`);
}
ok(/<title>[^<]*<\/title>/i.test(HTML), "head: <title> is rewritable");

// ── 9. Client arrival: the query form becomes the hash the app already reads ──
const LINKS_SRC = readFileSync(join(ROOT, "share-links.js"), "utf8");

// Just enough DOM for the /vote/ fallback notice to be built and inspected.
function fakeDocument() {
  const nodes = [];
  const mk = (tag) => ({
    tagName: tag, id: "", innerHTML: "", children: [], attrs: {}, parentNode: null,
    style: { cssText: "" },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener() {},
    querySelector() { return null; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
  });
  return {
    readyState: "complete",
    body: (() => { const b = mk("body"); nodes.push(b); return b; })(),
    createElement: mk,
    getElementById(id) { return this.body.children.find((c) => c.id === id) || null; },
    addEventListener() {},
  };
}

function loadLinks(href) {
  const u = new URL(href);
  const listeners = {};
  const win = {
    location: {
      href: u.href, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash,
    },
    history: { state: null, replaceState(_s, _t, next) { const n = new URL(next, u.origin); win.location.href = n.href; win.location.pathname = n.pathname; win.location.search = n.search; win.location.hash = n.hash; } },
    URL, URLSearchParams, HashChangeEvent: null, Event: class { constructor(t) { this.type = t; } },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatchEvent(e) { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
    document: fakeDocument(),
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(LINKS_SRC, win, { filename: "share-links.js" });
  win.notice = win.document.getElementById("pdx-vote-unresolved");
  return win;
}

let w = loadLinks("https://politidex.fyi/?bill=119%2FH.R.%201");
eq(w.location.hash, "#bill/119/H.R.%201", "arrival: ?bill= becomes the #bill/ hash the app already handles");
ok(!/bill=/.test(w.location.search), "arrival: the consumed param is cleaned out of the URL");

w = loadLinks("https://politidex.fyi/?receipt=aaron_ford~healthcare");
eq(w.location.hash, "#receipt=aaron_ford~healthcare", "arrival: ?receipt= becomes #receipt=");
w = loadLinks("https://politidex.fyi/?record=aaron_ford~healthcare");
eq(w.location.hash, "#record=aaron_ford~healthcare", "arrival: ?record= becomes #record=");
w = loadLinks("https://politidex.fyi/?rank=healthcare&key=drug_prices&mode=votes");
eq(w.location.hash, "#issue=healthcare&key=drug_prices&mode=votes", "arrival: ?rank= rebuilds the full ranking hash");

// An existing hash is what the reader asked for. This module's entire job is to be
// invisible when it is not needed — including for every hash link already shared.
w = loadLinks("https://politidex.fyi/?bill=119%2FH.R.%201#receipt=aaron_ford");
eq(w.location.hash, "#receipt=aaron_ford", "arrival: an existing hash always wins");

// Profiles and Spotlights are already server-visible and already have their own
// boot handlers; touching them here would be a race, not a feature.
ok(!/['"]p['"]/.test(LINKS_SRC.match(/var PARAMS = \[[^\]]*\]/)[0]) &&
   !/['"]issue['"]/.test(LINKS_SRC.match(/var PARAMS = \[[^\]]*\]/)[0]),
  "arrival: ?p= and ?issue= are left to their existing handlers");

// The edge's hint drives the case the client cannot work out for itself: /vote/.
const voteWin = loadLinks("https://politidex.fyi/vote/119/house/190");
eq(voteWin.location.hash, "", "arrival: /vote/ alone opens nothing without the edge");

// …but it must not silently look like a working link. When the edge did not run,
// or failed open on a slow database, the page says so rather than showing the
// front page to a reader who believes they followed a citation.
ok(voteWin.notice, "arrival: an unresolved /vote/ address gets an on-page notice");
{
  const said = voteWin.notice.innerHTML;
  ok(/couldn’t open House roll call 190/.test(said), "notice: names the exact roll call that failed");
  ok(/119th Congress/.test(said), "notice: names the Congress");
  // It knows the link did not open. It does NOT know the vote does not exist —
  // claiming that on a timeout would be its own kind of lie.
  ok(!/does not exist|no such|isn’t real|never happened/i.test(said),
    "notice: claims only that we could not open it, never that the vote does not exist");
  ok(/Dismiss/.test(said), "notice: is dismissible");
}
ok(!loadLinks("https://politidex.fyi/?receipt=aaron_ford~healthcare").notice,
  "notice: never appears on a link that did open");

// Re-run with the edge hint present, as share-preview.ts injects it.
{
  const src = "window.__PDX_SHARE_TARGET__={kind:'vote',hash:'#bill/119/H.R.%201'};\n" + LINKS_SRC;
  const u = new URL("https://politidex.fyi/vote/119/house/190");
  const win = {
    location: { href: u.href, origin: u.origin, pathname: u.pathname, search: u.search, hash: "" },
    history: { state: null, replaceState(_s, _t, next) { const n = new URL(next, u.origin); win.location.hash = n.hash; win.location.pathname = n.pathname; } },
    URL, URLSearchParams, HashChangeEvent: null, Event: class { constructor(t) { this.type = t; } },
    addEventListener() {}, dispatchEvent() { return true; },
    document: fakeDocument(),
  };
  win.window = win;
  vm.createContext(win);
  vm.runInContext(src, win, { filename: "share-links.js" });
  eq(win.location.hash, "#bill/119/H.R.%201", "arrival: the edge's /vote/ hint opens the measure");
  eq(win.location.pathname, "/vote/119/house/190",
    "arrival: the /vote/ path is preserved, so copying the URL back out keeps its card");
  ok(!win.document.getElementById("pdx-vote-unresolved"),
    "arrival: a /vote/ link the edge resolved shows no failure notice");
}

// Canonical builders — what the share buttons actually emit.
{
  const w2 = loadLinks("https://politidex.fyi/");
  const L = w2.PDXShareLinks;
  eq(L.bill(119, "H.R. 1"), "https://politidex.fyi/?bill=119%2FH.R.%201", "builder: bill link is server-visible");
  eq(L.receipt("aaron_ford", "healthcare"), "https://politidex.fyi/?receipt=aaron_ford~healthcare", "builder: receipt link");
  eq(L.record("aaron_ford", "healthcare"), "https://politidex.fyi/?record=aaron_ford~healthcare", "builder: record link");
  eq(L.rank("healthcare", { key: "drug_prices", mode: "all" }),
    "https://politidex.fyi/?rank=healthcare&key=drug_prices", "builder: ranking link drops default lens");
  eq(L.on("https://politidex.fyi", "http://localhost:8888/?receipt=x~y"),
    "https://politidex.fyi/?receipt=x~y", "builder: .on() moves a link onto the public share domain");

  // Round trip: everything a share button emits must parse back to the surface it
  // came from, and rebuild the same hash. This is the join between the two halves.
  for (const [url, kind] of [
    [L.bill(119, "H.R. 1"), "bill"],
    [L.receipt("aaron_ford", "healthcare"), "receipt"],
    [L.record("aaron_ford", "healthcare"), "record"],
    [L.rank("healthcare", { key: "drug_prices" }), "rank"],
  ]) {
    const t = parse(url);
    ok(t && t.kind === kind, `round trip: the emitted ${kind} link parses back to a ${kind} target`);
    const back = loadLinks(url);
    ok(back.location.hash.length > 1, `round trip: the emitted ${kind} link opens a hash on arrival`);
  }
}

// ── 10. Wiring: the client half must actually ship ───────────────────────────
ok(/<script[^>]+src="\/share-links\.js"/.test(HTML), "wiring: index.html loads share-links.js");
{
  // It must come before the feature modules whose hashes it sets, or those modules
  // boot, read an empty hash, and the deep link opens nothing.
  const pos = (re) => HTML.search(re);
  const links = pos(/<script[^>]+src="\/share-links\.js"/);
  for (const mod of ["/cmp-data.js", "/say-vs-do.js", "/bill-detail.js", "/issue-view.js"]) {
    const p = pos(new RegExp(`<script[^>]+src="${mod.replace(/[/.]/g, "\\$&")}"`));
    if (p === -1) continue;
    ok(links < p, `wiring: share-links.js is loaded before ${mod}`);
  }
}
const SW = readFileSync(join(ROOT, "sw.js"), "utf8");
ok(/['"]\/share-links\.js['"]/.test(SW), "wiring: the service worker precaches share-links.js");
{
  // A new shell asset with an unbumped cache version means returning visitors keep
  // the old shell and never fetch it — the deep links stay broken only for them,
  // which is the hardest kind of bug to see.
  const v = SW.match(/CACHE_VERSION\s*=\s*['"]v(\d+)['"]/);
  ok(v && Number(v[1]) >= 35, `wiring: CACHE_VERSION bumped for the new shell asset (found ${v ? "v" + v[1] : "none"})`);
}

// The share buttons themselves must prefer the canonical builders — otherwise the
// previewable form exists and nothing ever emits it.
for (const [file, needle] of [
  ["bill-detail.js", /PDXShareLinks[\s\S]{0,80}\.bill\(/],
  ["say-vs-do.js", /PDXShareLinks/],
  ["issue-view.js", /PDXShareLinks[\s\S]{0,80}\.rank\(/],
]) {
  ok(needle.test(readFileSync(join(ROOT, file), "utf8")), `wiring: ${file} emits the canonical share URL`);
}

// ── 11. The API routes the edge depends on ───────────────────────────────────
const VR = readFileSync(join(ROOT, "netlify/functions/voting-record.mts"), "utf8");
ok(/\/\^\\\/measure-ref\\\/|measure-ref/.test(VR), "api: /measure-ref/ route exists");
ok(/rollcall/.test(VR), "api: /rollcall/ route exists");
ok(/rollcallMatch/.test(VR) && /404/.test(VR),
  "api: the roll-call route can answer 404, which is what makes an honest dead link possible");

// The rewrite that serves /vote/ must still be there — the edge function decorates
// it, it does not replace it.
const TOML = readFileSync(join(ROOT, "netlify.toml"), "utf8");
ok(/from = "\/vote\/\*"[\s\S]{0,80}status = 200/.test(TOML), "route: /vote/* still rewrites to the app");
ok(/from = "\/issue\/\*"[\s\S]{0,80}status = 200/.test(TOML), "route: /issue/* rewrite is unchanged");

// ── report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ share previews: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error("");
  process.exit(1);
}
console.log(`✓ share previews: all ${passed} assertions passed`);
console.log(
  `  ${Object.keys(INDEX.people).length} people · ${Object.keys(INDEX.spotlights).length} spotlights · ` +
  `${Object.keys(INDEX.cores).length} core issues · ${Object.keys(S.CHROME).length} distinct card surfaces`
);
