#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-digest-events.mjs — the digest sends the archive, not an opinion about it
// ─────────────────────────────────────────────────────────────────────────────
// A digest is the only thing PolitiDex says to someone who did not ask a question.
// It lands in an inbox, out of context, next to marketing — and the reader cannot
// click a chip to see what a word rests on. That makes the email the easiest place
// on the whole product to turn an archive into an accusation, and the hardest place
// to take one back.
//
// So the record group has a narrow job: tell a reader that something they track
// changed, and hand them the receipt. This file is the fence around that job:
//
//   1. FOUR KINDS, PLAIN WORDS. A recorded vote, a sourced formal action, a measure
//      that moved, a record that was corrected. Every wording map is a map from a
//      code to a description — there is no map from a formal act to an adjective.
//   2. NOTHING WITHOUT A CITATION. Every read drops rows with no source_url, and
//      every rendered row carries the source as a link. An emailed claim a reader
//      cannot check is worse than silence.
//   3. PHASE-1 ADDRESSES. Person-anchored acts land on /p/<pid>; measure-anchored
//      ones on /vote/<congress>/<chamber>/<roll>. Both are 200-rewrites, so a link
//      is a page and not a bounce to the front door.
//   4. NO AGGREGATE, EVER. No ranking, no score, no percentage, no party field, no
//      "worst of the week". One act, one citation, one link — and the order is the
//      calendar's, not importance's.
//   5. OPT-IN, SUPPRESSED, UNSUBSCRIBABLE. Only email_enabled rows, empty digests
//      never sent, RFC 8058 one-click headers on every send.
//   6. topic_record THREADS END TO END. Schema → migration → prefs API → buildDigest
//      → email → in-app panel, with the default ON and the old-prefs case handled.
//   7. THE EMAIL AND THE APP SAY THE SAME THING. The kickers are compared value by
//      value, so the inbox cannot drift into a louder vocabulary than the site.
//
//   node scripts/test-digest-events.mjs
//
// The wording, addressing, ordering and email rows are IMPORTED from the same
// module the Functions import, so what is asserted here is what ships. The in-app
// helpers are lifted out of index.html and run in a node:vm.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import {
  ACTION_WORD, KIND_KICKER, STAGE_WORD, VOTE_WORD,
  clip, labelForPoliticianId, measureLabel, personPath, recordEmailRows,
  recordLink, recordTextBlock, rollcallPath, sortRecordEvents,
} from "../netlify/lib/digest-record-core.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

const CORE = R("netlify/lib/digest-record-core.mjs");
const DIGEST = R("netlify/lib/digest.ts");
const API = R("netlify/functions/pdx-digest.mts");
const CRON = R("netlify/functions/pdx-digest-cron.mts");
const SCHEMA = R("db/schema.ts");
const TOML = R("netlify.toml");
const INDEX = R("index.html");
const DOC = R("DIGEST.md");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const lacks = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — "${needle}" present and must not be`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ digest-events: ${msg}`);
  process.exit(1);
};

// Comments have to be free to name what the code refuses to do ("no worst of the
// week"), so source-level assertions run over a comment-stripped copy.
const strip = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

// The slice of digest.ts that builds the group — everything before it is the
// interface and the doctrine comment, everything after is the older groups.
const RECORD_SRC = (() => {
  const s = DIGEST.indexOf("export async function buildRecordEvents");
  const e = DIGEST.indexOf("export async function buildDigest");
  must(s > 0 && e > s, "could not locate buildRecordEvents in netlify/lib/digest.ts");
  return DIGEST.slice(s, e);
})();
const RECORD_CODE = strip(RECORD_SRC);

// The in-app record helpers, lifted from index.html and run for real.
const APP_HELPERS = (() => {
  const s = INDEX.indexOf("var RECORD_KICKER");
  const e = INDEX.indexOf("function verdictLabel", s);
  must(s > 0 && e > s, "could not locate the in-app record helpers in index.html");
  return INDEX.slice(s, e);
})();
const app = {};
vm.runInContext(APP_HELPERS + "\n;out.RECORD_KICKER=RECORD_KICKER;out.RECORD_ICO=RECORD_ICO;out.fmt=fmtRecordDate;",
  vm.createContext({ out: app, console }), { filename: "index.html:record-helpers" });

const SITE = "https://politidex.fyi";

// A synthetic group covering all four kinds, both address shapes, an undated act
// and a hostile string. Nothing here is read from the database — the point is to
// exercise the exact functions the sender calls.
const EVENTS = [
  {
    kind: "vote", id: 11,
    headline: "Celeste Maloy voted no on H.R. 1234 — Example Act",
    detail: "On passage of the bill", date: "2026-05-04T00:00:00.000Z",
    sourceUrl: "https://clerk.house.gov/Votes/2026123", sourceLabel: "House Clerk",
    path: "/p/celeste_maloy", politicianId: "celeste_maloy", issueKeys: [],
  },
  {
    kind: "position", id: 12,
    headline: "Mike Lee co-sponsored S. 99 — Another Act",
    detail: "", date: "2026-05-02T00:00:00.000Z",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/99",
    sourceLabel: "Congress.gov",
    path: "/p/mike_lee", politicianId: "mike_lee", issueKeys: [],
  },
  {
    kind: "action", id: 13,
    headline: "H.R. 1234 — Example Act passed the House",
    detail: "Passed by recorded vote: 218 - 214", date: "2026-04-30T00:00:00.000Z",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/1234/actions",
    sourceLabel: "Congress.gov",
    path: "/vote/119/house/190", politicianId: null, issueKeys: ["housing", "healthcare"],
  },
  {
    kind: "mapping", id: 14,
    headline: 'The record for S. 99 — <Another> "Act" was updated',
    detail: "A citation, title or issue mapping on this measure changed.",
    date: "2026-04-28T00:00:00.000Z",
    sourceUrl: "https://www.congress.gov/bill/119th-congress/senate-bill/99",
    sourceLabel: "Congress.gov",
    path: null, politicianId: null, issueKeys: ["housing"],
  },
  {
    kind: "position", id: 15, headline: "An undated formal act on file",
    detail: "", date: null,
    sourceUrl: "https://example.gov/doc", sourceLabel: "Agency record",
    path: "/p/someone", politicianId: "someone", issueKeys: [],
  },
];

const HTML = recordEmailRows(EVENTS, SITE);
const TEXT = recordTextBlock(EVENTS, SITE);

// ═════════════════════════════════════════════════════════════════════════════
section("1 · four kinds, and every wording map is a description");

eq(Object.keys(KIND_KICKER).sort().join(","), "action,mapping,position,vote",
  "the group has exactly four kinds");
eq(KIND_KICKER.vote, "New recorded vote", "a roll call is announced as a recorded vote");
eq(KIND_KICKER.position, "New formal action", "a non-roll-call act is announced as a formal action");
eq(KIND_KICKER.action, "Measure moved", "a stage change is announced as the measure moving");
eq(KIND_KICKER.mapping, "Record updated", "a correction is announced as the record updating");

eq(Object.keys(VOTE_WORD).sort().join(","), "nay,not_voting,present,yea",
  "the four recordable positions, and no fifth");
eq(VOTE_WORD.yea, "voted yes", "yea reads as voted yes");
eq(VOTE_WORD.nay, "voted no", "nay reads as voted no");
eq(VOTE_WORD.present, "voted present", "present reads as present");
eq(VOTE_WORD.not_voting, "did not vote", "not voting reads as did not vote");

// The one thing a wording map must never contain.
const VERDICT_WORDS = [
  "betray", "caved", "cave", "flip-flop", "flipflop", "snuck", "sneak", "rammed",
  "gutted", "defied", "defy", "hypocri", "shameful", "outrage", "slam", "blast",
  "worst", "best", "failed us", "sold out", "bought", "corrupt", "finally", "again",
  "brave", "courageous", "cowardly", "extreme", "radical", "sensible",
];
const ALL_WORDS = [
  ...Object.entries(VOTE_WORD), ...Object.entries(ACTION_WORD),
  ...Object.entries(STAGE_WORD), ...Object.entries(KIND_KICKER),
];
for (const [k, v] of ALL_WORDS) {
  const low = String(v).toLowerCase();
  for (const bad of VERDICT_WORDS) {
    // "failed" is a real legislative stage; "failed us" is the editorial version.
    ok(low.indexOf(bad) < 0, `the wording for "${k}" ("${v}") uses no verdict word ("${bad}")`);
  }
  ok(!/[!?]/.test(String(v)), `the wording for "${k}" carries no exclamation or question mark`);
  ok(!/%|\bscore\b|\brank/i.test(String(v)), `the wording for "${k}" is not a measurement`);
}
eq(STAGE_WORD.failed, "failed", "a measure that failed is described with the stage name, plainly");
eq(STAGE_WORD.enacted, "was enacted", "enactment is described, not celebrated");
eq(ACTION_WORD.cosponsor, "co-sponsored", "co-sponsorship is described in the record's own word");

// The four kinds emitted by the builder are exactly the four declared.
const emitted = [...RECORD_CODE.matchAll(/kind:\s*"([a-z]+)"/g)].map((m) => m[1]);
eq(emitted.length, 4, "the builder emits exactly four kinds of event");
eq([...new Set(emitted)].sort().join(","), "action,mapping,position,vote",
  "and they are the four declared on RecordEvent");
// Each read is narrowed by the watermark, or the first digest would send the archive.
eq((RECORD_CODE.match(/gt\(/g) || []).length, 4, "all four reads are gated on the since-watermark");
eq((RECORD_CODE.match(/inArray\(/g) || []).length, 5,
  "every read is narrowed to the reader's own people/issues (4 + the address lookup)");

// ═════════════════════════════════════════════════════════════════════════════
section("2 · nothing is sent without a citation");

eq((RECORD_CODE.match(/if \(!r\.srcUrl\) continue;/g) || []).length, 4,
  "each of the four reads drops rows with no source url");
eq((RECORD_CODE.match(/sourceUrl: r\.srcUrl,/g) || []).length, 4,
  "and the emitted citation is always the row's own");
lacks(RECORD_CODE, 'sourceUrl: ""', "no event is emitted with an empty citation");
lacks(RECORD_CODE, "sourceUrl: null", "no event is emitted with a null citation");
for (const e of EVENTS) {
  has(HTML, `href="${e.sourceUrl}"`, `the html row for ${e.kind} #${e.id} links its citation`);
  has(TEXT, `Source: ${e.sourceUrl}`, `the text row for ${e.kind} #${e.id} names its citation`);
}
eq((HTML.match(/Source: /g) || []).length, EVENTS.length,
  "every html row carries a Source line — no exceptions");
has(HTML, "Source: House Clerk", "the citation is labelled with the source it came from");

// ═════════════════════════════════════════════════════════════════════════════
section("3 · links land on Phase-1 addresses");

eq(personPath("celeste_maloy"), "/p/celeste_maloy", "a person-anchored act lands on the person file");
eq(personPath(""), null, "no id, no fabricated address");
eq(rollcallPath(119, "House", 12), "/vote/119/house/12", "a roll call has an on-site address");
eq(rollcallPath(119, "Senate", 0), "/vote/119/senate/0", "roll number zero is a roll number");
eq(rollcallPath(119, "joint", 3), null, "an unroutable chamber gets no address");
eq(rollcallPath(null, "house", 3), null, "a missing congress gets no address");
eq(rollcallPath(119, "house", null), null, "a missing roll number gets no address");

eq(recordLink(EVENTS[0], SITE), `${SITE}/p/celeste_maloy`, "the email links the person file");
eq(recordLink(EVENTS[2], SITE), `${SITE}/vote/119/house/190`, "the email links the roll-call address");
eq(recordLink(EVENTS[3], SITE), EVENTS[3].sourceUrl,
  "with no on-site address, the email links the citation itself — never a guess");
has(HTML, `href="${SITE}/p/celeste_maloy"`, "the rendered html carries the person-file link");
has(TEXT, `${SITE}/vote/119/house/190`, "the rendered text carries the roll-call link");

// Both address families are real pages, not bounces.
for (const [pat, label] of [['from = "/p/*"', "person files"], ['from = "/vote/*"', "roll calls"]]) {
  const i = TOML.indexOf(pat);
  ok(i > 0, `netlify.toml still rewrites ${label}`);
  ok(TOML.slice(i, i + 200).indexOf("status = 200") > 0,
    `the ${label} rewrite is a 200, so a digest link is a page and not a redirect`);
}
// No tracking, no wrapper, no bounce host.
for (const bad of ["utm_", "?ref=", "click.", "/r/?u=", "track?"]) {
  lacks(HTML, bad, `no link decoration in the email ("${bad}")`);
  lacks(TEXT, bad, `no link decoration in the text part ("${bad}")`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no aggregate, no ranking, no score, no party");

const AGG = [
  /%/, /\bscore\b/i, /\brank(ing|ed|s)?\b/i, /leaderboard/i, /\bparty\b/i,
  /worst/i, /\bbest\b/i, /top \d/i, /most \w+ (of|this)/i, /\d+ of \d+/,
  /out of \d+/i, /average/i, /\bgrade\b/i, /\btier\b/i, /direction match/i,
  /word vs\.? action/i,
];
for (const re of AGG) {
  ok(!re.test(HTML), `the email's record rows carry no ${re} framing`);
  ok(!re.test(TEXT), `the text part carries no ${re} framing`);
  ok(!re.test(RECORD_CODE), `the builder carries no ${re} framing`);
}
// The group never reads the integrity lanes, and they never read it.
for (const n of ["directionMatch", "wordVsAction", "publicationFloor", "formalPatternTier",
  "ballotSort", "yourMatch"]) {
  lacks(RECORD_CODE, n, `the record group does not touch ${n}`);
}
// Nor the momentum or money lanes: a support count and a filing are not record events.
for (const n of ["pdxProposal", "proposalVotes", "supportCount", "FTM_FUNDING", "financeLane"]) {
  lacks(strip(DIGEST), n, `the digest never reads ${n}`);
}
// RecordEvent's own field names are descriptive, never measurements.
const IFACE = (() => {
  const s = DIGEST.indexOf("export interface RecordEvent {");
  const e = DIGEST.indexOf("}", DIGEST.indexOf("issueKeys", s));
  return DIGEST.slice(s, e);
})();
const fields = [...strip(IFACE).matchAll(/^\s{2}(\w+)[?]?:/gm)].map((m) => m[1]);
eq(fields.sort().join(","),
  "date,detail,headline,id,issueKeys,kind,path,politicianId,sourceLabel,sourceUrl",
  "a record event carries an act, a date, a citation and an address — nothing else");
for (const f of fields) {
  ok(!/score|rank|pct|percent|rating|grade|weight|tier|total|count/i.test(f),
    `the field "${f}" is not named like a measurement`);
}

// Order is the calendar's. Newest first, undated last, and the tiebreak is stable
// rather than a judgement about which act matters more.
const sorted = sortRecordEvents([...EVENTS]);
eq(sorted.map((e) => e.id).join(","), "11,12,13,14,15", "newest act first, undated last");
const tie = sortRecordEvents([
  { kind: "vote", id: 2, date: "2026-01-01T00:00:00.000Z" },
  { kind: "action", id: 1, date: "2026-01-01T00:00:00.000Z" },
]);
eq(tie.map((e) => e.kind).join(","), "action,vote", "same-day acts break on kind, not on magnitude");
// A field that looks like importance changes nothing about the order.
const withWeight = sortRecordEvents([
  { kind: "vote", id: 1, date: "2026-01-01T00:00:00.000Z", weight: 1 },
  { kind: "vote", id: 2, date: "2026-02-01T00:00:00.000Z", weight: 0 },
]);
eq(withWeight.map((e) => e.id).join(","), "2,1", "the sort reads the date and the id, nothing else");
// The rendered rows keep the order they were handed — no re-ranking in the email.
const MARKERS = ["Celeste Maloy voted no", "Mike Lee co-sponsored",
  "Example Act passed the House", "was updated", "An undated formal act"];
const positions = MARKERS.map((m) => HTML.indexOf(m));
ok(positions.every((v) => v > 0), "every event is present in the rendered html");
ok(positions.every((v, i) => i === 0 || v > positions[i - 1]),
  "the email renders the group in the order it was given");
// An empty group renders nothing at all, so the heading is omitted with it.
eq(recordEmailRows([], SITE), "", "an empty record group renders no html");
eq(recordTextBlock([], SITE), "", "an empty record group renders no text");
eq(recordEmailRows(null, SITE), "", "a missing record group renders no html");

// Hostile strings are escaped, not executed, and not stripped into a different claim.
has(HTML, "&lt;Another&gt;", "markup in a measure title is escaped");
lacks(HTML, "<Another>", "and never emitted raw");
has(HTML, "&quot;Act&quot;", "quotes in a title survive as quotes");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · opt-in, empty-suppressed, one-click unsubscribable");

const CRONC = strip(CRON);
has(CRONC, "eq(pdxNotificationPrefs.emailEnabled, true)", "only opted-in rows are candidates");
has(CRONC, "if (built.counts.total === 0)", "an empty digest is still detected");
has(CRONC, "skippedEmpty++", "and counted as skipped rather than sent");
has(CRONC, '"List-Unsubscribe"', "RFC 2369 List-Unsubscribe is still sent");
has(CRONC, '"List-Unsubscribe-Post": "List-Unsubscribe=One-Click"',
  "RFC 8058 one-click unsubscribe is still sent");
has(CRONC, "unsubscribeUrl(row.userId)", "and the visible unsubscribe link is still built");
has(CRONC, "unsubscribe from email digests", "the email body still says how to stop it");
// The config gate runs before anything is read or sent.
const iGate = CRONC.indexOf("if (!emailConfigured)");
const iRead = CRONC.indexOf(".from(pdxNotificationPrefs)");
ok(iGate > 0 && iRead > iGate, "an unconfigured environment returns before reading any row");
has(CRONC, "RESEND_API_KEY && process.env.DIGEST_FROM_EMAIL",
  "both required variables are checked together");
has(CRONC, "email-not-configured", "and the no-op is reported plainly");
has(CRONC, "lastDigestAt: new Date()", "the watermark advances only after a send");
// Nothing about a recipient, and nothing about a secret, is ever logged.
ok(!/\$\{process\.env\./.test(CRONC), "no environment value is ever interpolated into output");
ok(!/console\.[a-z]+\([^)]*row\.email/.test(CRONC), "a recipient address is never logged");
// A log line may name a variable ("set RESEND_API_KEY to enable"); it may never
// carry one's value.
ok(!/console\.[a-z]+\([^)]*process\.env/.test(CRONC),
  "no log line reads an environment variable at all");
has(CRONC, "schedule: \"0 13 * * *\"", "the sender is still scheduled, once a day");

// The record group is composed in the shared module — the cron builds no rows of
// its own, so there is one place where the wording can change.
has(CRON, "recordEmailRows(digest.record, site)", "the html rows come from the shared module");
has(CRON, "recordTextBlock(digest.record, site)", "and so do the text rows");
has(CRON, 'section("On The Record", recRows)', "the record group leads the email");
const iRec = CRON.indexOf('section("On The Record"');
const iEv = CRON.indexOf('section("New Evidence"');
ok(iRec > 0 && iEv > iRec, "the archive is placed above the conversation about it");

// ═════════════════════════════════════════════════════════════════════════════
section("6 · topic_record threads schema → prefs → digest → email → app");

has(SCHEMA, 'topicRecord: boolean("topic_record").notNull().default(true)',
  "the column exists and defaults on");
const MIGRATIONS = R("netlify/database/migrations/20260924000000_pdx_rate_limits_and_topic_record/migration.sql");
has(MIGRATIONS, 'ADD COLUMN "topic_record" boolean DEFAULT true NOT NULL',
  "and the migration that adds it is on disk");
has(API, "topicRecord: true", "the prefs API defaults the topic on for a new reader");
has(API, "topicRecord: row.topicRecord", "reads it back on GET");
has(API, "topicRecord: bool(body?.topicRecord", "accepts it on PUT");
has(API, "record: prefs.topicRecord", "and passes it into the digest build");
has(strip(DIGEST), "{ evidence: true, community: true, record: true }",
  "buildDigest defaults the record group on");
has(strip(DIGEST), "topics.record !== false",
  "an older caller with no record flag still gets the group");
has(strip(DIGEST), "record: RecordEvent[]", "the Digest type carries the group");
has(strip(DIGEST), "record: number;", "the counts block carries the group's own count");
has(strip(DIGEST), "record: record.length,", "and it is the number actually sent");
has(CRONC, "record: row.topicRecord", "the email respects the reader's toggle");
has(DOC, "RESEND_API_KEY", "DIGEST.md names the required api key variable");
has(DOC, "DIGEST_FROM_EMAIL", "DIGEST.md names the required from-address variable");
has(DOC, "DIGEST_UNSUB_SECRET", "DIGEST.md names the optional unsubscribe secret");
has(DOC, "email-not-configured", "DIGEST.md documents the unconfigured behaviour");
ok(!/re_[A-Za-z0-9]{8}/.test(DOC + CRON + DIGEST), "no key-shaped literal anywhere in the digest path");

// ═════════════════════════════════════════════════════════════════════════════
section("7 · the in-app panel says the same thing as the email");

eq(Object.keys(app.RECORD_KICKER).sort().join(","), "action,mapping,position,vote",
  "the panel knows the same four kinds");
for (const k of Object.keys(KIND_KICKER)) {
  eq(app.RECORD_KICKER[k], KIND_KICKER[k],
    `the panel and the email announce "${k}" with the same words`);
}
eq(Object.keys(app.RECORD_ICO).sort().join(","), "action,mapping,position,vote",
  "and gives each kind an icon");
// A date is formatted, never invented.
ok(/2026/.test(app.fmt("2026-03-04T12:00:00.000Z")), "a real date renders its year");
ok(/Mar/.test(app.fmt("2026-03-04T12:00:00.000Z")), "and its month");
eq(app.fmt("not-a-date"), "not-a-date", "an unparseable date is echoed, never guessed at");
eq(app.fmt("2026-03-04"), app.fmt("2026-03-04T00:00:00.000Z"), "date-only and full ISO agree");

// The client wiring, in the file that ships it.
has(INDEX, "topicRecord: true", "the client's default prefs turn the group on");
has(INDEX, "p.topicRecord !== false", "prefs saved before the group existed still get it");
has(INDEX, "record: rc, total: ev + co + pr + tm + rc", "the group counts toward the badge");
has(INDEX, "toggleRow('topicRecord', 'Record updates'", "and it has its own settings switch");
has(INDEX, "group('On The Record'", "the panel renders the group");
has(INDEX, "_digest.record = []", "marking the digest read clears it");
const APP_GROUP = (() => {
  const s = INDEX.indexOf("// ── On the record (server) ─");
  const e = INDEX.indexOf("// Promise updates (client)", s);
  must(s > 0 && e > s, "could not locate the in-app record group in index.html");
  return INDEX.slice(s, e);
})();
const APP_CODE = strip(APP_GROUP);
// A record row is not a verdict row: no kept/broken styling, no verdict chip.
for (const bad of ["is-broken", "is-kept", "wc-chip--kept", "wc-chip--broken", "verdictLabel",
  "verdictChipCls"]) {
  lacks(APP_CODE, bad, `a record row carries no verdict styling ("${bad}")`);
}
for (const re of AGG) ok(!re.test(APP_CODE), `the in-app group carries no ${re} framing`);
has(APP_CODE, "wc: 'profile'", "a person-anchored row opens the person file");
has(APP_CODE, "wc: 'url'", "a measure-anchored row navigates to its own address");
has(APP_CODE, "r.sourceUrl", "and falls back to the citation when there is no address");
has(INDEX, "if (a === 'url')", "the panel can actually follow a record address");

// ═════════════════════════════════════════════════════════════════════════════
section("8 · the pure module is pure, and the label transform invents nothing");

ok(!/drizzle|from "\.\.\/\.\.\/db/.test(CORE), "the record core imports no database");
ok(!/process\.env/.test(CORE), "the record core reads no environment");
ok(!/fetch\(/.test(CORE), "the record core makes no network call");
ok(!/Date\.now\(\)/.test(strip(CORE)), "the record core keeps no clock of its own");
eq(labelForPoliticianId("celeste_maloy"), "Celeste Maloy", "an id becomes a readable label");
eq(labelForPoliticianId("michael_adams_ky"), "Michael Adams",
  "a disambiguating state suffix is dropped rather than read aloud");
eq(labelForPoliticianId("mike_lee"), "Mike Lee", "a two-part id keeps both parts");
eq(labelForPoliticianId("ut_gov"), "UT Gov",
  "a two-letter part is upper-cased rather than expanded into a word");
eq(labelForPoliticianId(""), "", "no id, no label");
eq(labelForPoliticianId("unmatched_person_zz"), "Unmatched Person ZZ",
  "a suffix that is not a state code is not silently dropped");
// The label says nothing the id did not.
for (const bad of ["Rep.", "Sen.", "Republican", "Democrat", "(R)", "(D)", "District"]) {
  lacks(labelForPoliticianId("celeste_maloy"), bad, `the label infers no ${bad}`);
}
eq(measureLabel("H.R. 1234", "Example Act", "A much longer official title"),
  "H.R. 1234 — Example Act", "a measure is named by its number and short title");
eq(measureLabel("H.R. 1234", null, "A much longer official title"),
  "H.R. 1234 — A much longer official title", "with the full title when there is no short one");
eq(measureLabel(null, null, "Just a title"), "Just a title", "and by its title when it has no number");
eq(clip("abcdef", 4), "abc…", "clipping marks that it clipped");
eq(clip("abc", 4), "abc", "and leaves a short value alone");

// ── Result ───────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  failures.forEach((f) => console.error(`   ✗ ${f}`));
  console.error(`\n✗ digest-events: ${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
console.log(`✓ digest-events: all ${passed} assertions passed`);
console.log(`   4 event kinds · every item cited · links on /p/ and /vote/ · ` +
  `no aggregate, no ranking, no score`);
