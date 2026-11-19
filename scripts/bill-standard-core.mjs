// ─────────────────────────────────────────────────────────────────────────────
// bill-standard-core.mjs — the bill ground-truth standard (bill-gt-v1) as code
// ─────────────────────────────────────────────────────────────────────────────
// The reference ledger is db/bill-standard/119-s-5653.json. Every field named
// here is a field that file carries; nothing is added. Two things live here:
//
//   validateLedger(ledger, ctx) → { errors, warnings }
//       The shape and the rules a ledger must keep. scripts/gen-bill-standard.mjs
//       --check runs it over every file in db/bill-standard/, and
//       scripts/test-bill-standard.mjs holds the reference to it.
//
//   scaffoldLedger(record, opts) → ledger
//       The parts the official record can fill without reading or judgment:
//       identity, sponsors and cosponsors, the dated action timeline, status,
//       text versions and recorded roll calls with roster links. Everything that
//       needs reading the text (overview, provisions, issue mappings, claims,
//       statements) starts empty, and its completeness mark says "missing" and
//       why. The scaffold never writes a provision, mapping or quote.
//
// THE RULES IT KEEPS
//
//   · REGISTER KEYS ONLY. Every issues[].issueKey and provisions[].issueKeys
//     entry is in db/issue-keys.json. A considered entry may also be a topic
//     that is not in the text, spelled "(not in text) <topic>".
//   · SPLIT, DON'T COLLAPSE (splitMappingRule). A key may carry one row per
//     direction. Two rows for one key must be yea_supports and yea_opposes,
//     cite different sections, and each carry their own weight and quote. A
//     single row whose rationale calls itself mixed or two-way is an error. A
//     key declined because it "runs both ways" is a warning: under the rule it
//     should be split, not declined.
//   · EVERY CITATION RESOLVES. A mapping's provisionRefs and quoteRef name
//     provisions in the ledger, and each of those provisions lists the key.
//     claimRef names a claim. A provision with no key says whyUnmapped.
//   · PRIMARY SOURCES. Every URL outside secondarySources is on an official
//     host (PRIMARY_HOSTS). Each secondarySources row is labelled secondary.
//   · THE COUNTS ARE TRUE. The E_issue_mapping note states the number of keys
//     mapped (and rows, when a key is split) and the number considered and
//     declined, and those numbers match the lists. Roll-call totals match the
//     member rows. overview.wordCount matches the summary.
//   · NOTHING GUESSED. Missing parts are recorded as missing, in the
//     completeness mark and note, not filled in.
// ─────────────────────────────────────────────────────────────────────────────
import { billStage } from "../netlify/lib/bill-record-stages.mjs";

export const STANDARD_VERSION = "bill-gt-v1";

export const SPLIT_MAPPING_RULE =
  "When a bill's text supports an issue key in some sections and opposes it in others, record one mapping row per direction for that key (yea_supports and yea_opposes), each citing its own sections with its own weight and a short quote; do not collapse conflicting effects into one direction.";

export const PRIMARY_LABEL_NOTE =
  "Primary is a display label only. It carries no scoring weight and does not decide what is shown. Weights describe how central the issue is to the text.";

export const STATUS_WORDS = [
  "introduced", "in_committee", "reported", "passed_house", "passed_senate", "passed_both",
  "resolving_differences", "to_president", "enacted", "vetoed", "veto_overridden", "failed",
];
export const TIMELINE_STAGES = [...STATUS_WORDS, "other"];
export const DIRECTIONS = ["yea_supports", "yea_opposes"];
export const MARKS = ["present", "partial", "missing"];
export const COMPLETENESS_SECTIONS = [
  "A_identity", "B_status", "C_overview", "D_provisions", "E_issue_mapping",
  "F_positions", "G_votes", "H_contested_claims", "I_citations",
];

// Official record keepers and members' own pages. Subdomains count (a senator's
// office at www.<name>.senate.gov, a committee at energy.senate.gov).
export const PRIMARY_HOSTS = [
  "congress.gov", "govinfo.gov", "senate.gov", "house.gov", "cbo.gov", "jct.gov",
  "gao.gov", "whitehouse.gov", "federalregister.gov", "crsreports.congress.gov",
];
export const isPrimaryUrl = (u) => {
  let h;
  try { h = new URL(u).hostname.toLowerCase(); } catch { return false; }
  return PRIMARY_HOSTS.some((p) => h === p || h.endsWith("." + p));
};

// Collapsed-mix wording: a single row that says it cuts both ways.
export const MIXED_WORDS = /\b(mixed|runs against it|cuts both ways|runs both ways|one support_meaning cannot hold both)\b/i;

// ── The shape, field by field, read off the reference ───────────────────────
// [required, optional]. A field outside both is an error (no invented fields).
const F = (req, opt = []) => ({ req, opt });
export const SHAPE = {
  top: F(
    ["standardVersion", "verifiedOn", "verifiedBy", "key", "identity", "status", "overview", "provisions",
     "issues", "splitMappingRule", "considered", "primaryLabelNote", "sponsors", "sponsorNote", "statedOnBill",
     "statedCheck", "votes", "claims", "scorekeepers", "secondarySources", "completeness", "doesNotDo"],
    [], // plus textDelta_<FROM>_to_<TO>, allowed when a substitute text exists
  ),
  identity: F(
    ["congress", "session", "number", "billType", "chamber", "shortTitle", "officialTitle", "policyArea",
     "congressGovUrl", "billStatusUrl", "textVersionsRead", "companions", "sponsor"],
    ["acronym", "floorVehicle", "nameNote"],
  ),
  textVersion: F(["version", "label", "textUrl", "why"], ["amendmentUrl"]),
  companions: F(["relatedBillsOnRecord", "note"]),
  floorVehicle: F(["number", "congress", "title", "congressGovUrl", "billStatusUrl", "note"], ["substituteAmendment"]),
  identitySponsor: F(["politicianId", "bioguideId", "recordName"]),
  status: F(["statusWords", "statusAsOf", "timeline", "timelineNote"]), // plus <Compact> and vehicle_<Compact>
  measureStatus: F(["status", "lastAction"], ["statusNote"]),
  lastAction: F(["date", "text", "sourceUrl"]),
  timeline: F(["date", "measure", "stage", "text", "sourceUrl"]),
  overview: F(["plainSummary", "wordCount", "summarySources", "valueWordCheck"]),
  summarySource: F(["label", "url"]),
  provision: F(["ref", "label", "plain", "textQuote", "quoteFrom", "sourceUrl", "issueKeys", "presentIn"], ["amendmentHistory", "whyUnmapped"]),
  issue: F(["issueKey", "weight", "primaryLabel", "supportMeaning", "provisionRefs", "quote", "quoteRef", "rationale", "sourceUrl"], ["claimRef"]),
  considered: F(["issueKey", "whyNot"]),
  sponsor: F(["politicianId", "bioguideId", "recordName", "role", "original", "joinedOn", "profile"]),
  stated: F(["politicianId", "stance", "excerpt", "date", "venue", "sourceUrl", "lockerItemId"], ["note"]),
  statedCheck: F(["checkedOn", "method", "counts", "lockerQualityNotes"]),
  votes: F(["rollcalls", "substantiveVote", "sponsorVotes", "noRecordedVote", "rosterLinking"]), // plus on<Compact>Itself
  rollcall: F(["chamber", "congress", "session", "roll", "date", "measure", "question", "actionType", "procedural", "result", "requiredMajority", "totals", "byParty", "sourceUrl", "rosterLinked", "members"]),
  member: F(["politicianId", "name", "vote"], ["lis", "bioguideId"]),
  noRecordedVote: F(["date", "item", "outcome", "sourceUrl"]),
  claim: F(["id", "question", "provisionRefs", "supportersSay", "opponentsSay", "whatTheTextSays", "plainRead", "independentRead"]),
  said: F(["who", "text", "sourceUrl", "date"]),
  textSays: F(["ref", "quote", "sourceUrl"]),
  scorekeeper: F(["scorekeeper", "finding", "sourceUrl", "date", "verification"]),
  secondary: F(["label", "type", "pairedPrimary", "use"]),
  textDelta: F(["addedSections", "removedSections", "materiallyChanged", "method"]),
  completenessEntry: F(["mark", "note"]),
};

/** "S. 5653" → "S5653", "H.R. 2347" → "HR2347", "S.Amdt. 6883" → "SAmdt6883". */
export const compact = (number) => String(number).replace(/[^A-Za-z0-9]/g, "");
/** db/bill-standard file name: "119|S. 5653" → "119-s-5653.json". */
export const ledgerFileName = (congress, number) =>
  `${congress}-${String(number).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`;

const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

function fields(errs, where, obj, shape) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) { errs.push(`${where}: expected an object`); return false; }
  for (const k of shape.req) if (!(k in obj)) errs.push(`${where}: missing field ${k}`);
  for (const k of Object.keys(obj)) if (!shape.req.includes(k) && !shape.opt.includes(k)) errs.push(`${where}: field ${k} is not in the standard`);
  return true;
}
function list(errs, where, arr, shape) {
  if (!Array.isArray(arr)) { errs.push(`${where}: expected a list`); return []; }
  arr.forEach((x, i) => fields(errs, `${where}[${i}]`, x, shape));
  return arr;
}
function urls(v, path, out) {
  if (typeof v === "string") { if (/^https?:\/\//.test(v)) out.push([path, v]); return out; }
  if (Array.isArray(v)) v.forEach((x, i) => urls(x, `${path}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) urls(x, `${path}.${k}`, out);
  return out;
}

/**
 * Check a ledger against bill-gt-v1.
 *   ctx.issueKeys  Set of register keys (db/issue-keys.json)
 *   ctx.people     Set of roster ids (db/share-index.json people)
 *   ctx.strict     treat any "missing" completeness mark as an error (publish-ready)
 */
export function validateLedger(L, ctx = {}) {
  const errors = [], warnings = [];
  const keys = ctx.issueKeys || new Set();
  const people = ctx.people || new Set();
  const inRoster = (id) => id == null || people.has(id);

  if (!fields(errors, "ledger", L, { req: SHAPE.top.req, opt: Object.keys(L || {}).filter((k) => /^textDelta_[A-Za-z0-9]+_to_[A-Za-z0-9]+$/.test(k)) })) return { errors, warnings };
  if (L.standardVersion !== STANDARD_VERSION) errors.push(`standardVersion is ${L.standardVersion}, not ${STANDARD_VERSION}`);
  if (!isDate(L.verifiedOn)) errors.push("verifiedOn is not a date");
  if (L.splitMappingRule !== SPLIT_MAPPING_RULE) errors.push("splitMappingRule is not the standard's rule text");

  // A. identity
  const id = L.identity || {};
  if (fields(errors, "identity", id, SHAPE.identity)) {
    if (L.key !== `${id.congress}|${id.number}`) errors.push(`key ${L.key} does not match identity ${id.congress}|${id.number}`);
    if (!id.officialTitle) errors.push("identity.officialTitle is empty");
    list(errors, "identity.textVersionsRead", id.textVersionsRead, SHAPE.textVersion);
    fields(errors, "identity.companions", id.companions, SHAPE.companions);
    fields(errors, "identity.sponsor", id.sponsor, SHAPE.identitySponsor);
    if (id.floorVehicle) fields(errors, "identity.floorVehicle", id.floorVehicle, SHAPE.floorVehicle);
  }
  const self = compact(id.number || "");
  const vehicle = id.floorVehicle ? `vehicle_${compact(id.floorVehicle.number)}` : null;

  // B. status
  const st = L.status || {};
  if (fields(errors, "status", st, { req: [...SHAPE.status.req, self], opt: vehicle ? [vehicle] : [] })) {
    for (const k of [self, vehicle].filter(Boolean)) {
      if (!st[k]) { if (k === self) continue; errors.push(`status.${k} missing for the floor vehicle`); continue; }
      if (fields(errors, `status.${k}`, st[k], SHAPE.measureStatus)) {
        if (!STATUS_WORDS.includes(st[k].status)) errors.push(`status.${k}.status ${st[k].status} is not a status word`);
        fields(errors, `status.${k}.lastAction`, st[k].lastAction, SHAPE.lastAction);
      }
    }
    const tl = list(errors, "status.timeline", st.timeline, SHAPE.timeline);
    tl.forEach((r, i) => {
      if (!isDate(r.date)) errors.push(`status.timeline[${i}]: undated row`);
      if (!TIMELINE_STAGES.includes(r.stage)) errors.push(`status.timeline[${i}]: stage ${r.stage} is not a status word or "other"`);
      if (i && r.date < tl[i - 1].date) errors.push(`status.timeline[${i}]: out of date order`);
    });
    if (!tl.some((r) => r.stage === "introduced" && r.measure === id.number)) errors.push("status.timeline has no introduced row for the bill (introduced date)");
  }

  // C. overview
  const ov = L.overview || {};
  if (fields(errors, "overview", ov, SHAPE.overview)) {
    list(errors, "overview.summarySources", ov.summarySources, SHAPE.summarySource);
    if (ov.plainSummary && ov.wordCount !== words(ov.plainSummary)) errors.push(`overview.wordCount ${ov.wordCount} but the summary has ${words(ov.plainSummary)} words`);
  }

  // D. provisions
  const provs = list(errors, "provisions", L.provisions, SHAPE.provision);
  const byRef = new Map();
  provs.forEach((p, i) => {
    if (byRef.has(p.ref)) errors.push(`provisions[${i}]: duplicate ref ${p.ref}`);
    byRef.set(p.ref, p);
    if (!p.textQuote) errors.push(`provisions[${i}] ${p.ref}: no verbatim quote`);
    for (const k of p.issueKeys || []) if (!keys.has(k)) errors.push(`provisions[${i}] ${p.ref}: ${k} is not a register key`);
    if (!(p.issueKeys || []).length && !p.whyUnmapped) errors.push(`provisions[${i}] ${p.ref}: no issue key and no whyUnmapped`);
    if ((p.issueKeys || []).length && p.whyUnmapped) errors.push(`provisions[${i}] ${p.ref}: has keys and a whyUnmapped`);
  });

  // E. issue mappings + splitMappingRule
  const claimIds = new Set((L.claims || []).map((c) => c.id));
  const rows = list(errors, "issues", L.issues, SHAPE.issue);
  const perKey = new Map();
  rows.forEach((r, i) => {
    const w = `issues[${i}] ${r.issueKey}`;
    if (!keys.has(r.issueKey)) errors.push(`${w}: not a register key`);
    if (!DIRECTIONS.includes(r.supportMeaning)) errors.push(`${w}: supportMeaning ${r.supportMeaning} is not yea_supports or yea_opposes`);
    if (!Number.isInteger(r.weight) || r.weight < 1 || r.weight > 100) errors.push(`${w}: weight ${r.weight} is not 1-100`);
    if (!r.quote) errors.push(`${w}: no quote`);
    if (!(r.provisionRefs || []).length) errors.push(`${w}: no provisionRefs`);
    for (const ref of [...(r.provisionRefs || []), r.quoteRef]) {
      const p = byRef.get(ref);
      if (!p) errors.push(`${w}: cites ${ref}, which is not a provision in this ledger`);
      else if (!(p.issueKeys || []).includes(r.issueKey)) errors.push(`${w}: provision ${ref} does not list ${r.issueKey}`);
    }
    if (r.claimRef && !claimIds.has(r.claimRef)) errors.push(`${w}: claimRef ${r.claimRef} is not a claim`);
    if (!perKey.has(r.issueKey)) perKey.set(r.issueKey, []);
    perKey.get(r.issueKey).push(r);
  });
  for (const [k, rs] of perKey) {
    if (rs.length === 1) {
      if (MIXED_WORDS.test(rs[0].rationale || "")) errors.push(`issues ${k}: one row calls itself mixed or two-way; split it into a yea_supports row and a yea_opposes row (splitMappingRule)`);
      continue;
    }
    const dirs = rs.map((r) => r.supportMeaning);
    if (rs.length > 2 || new Set(dirs).size !== rs.length) errors.push(`issues ${k}: ${rs.length} rows; a split key carries one row per direction`);
    const [a, b] = rs;
    if (b && (a.provisionRefs || []).some((x) => (b.provisionRefs || []).includes(x))) errors.push(`issues ${k}: split rows cite the same section`);
    if (b && a.quote === b.quote) errors.push(`issues ${k}: split rows share one quote`);
  }
  const primaries = rows.filter((r) => r.primaryLabel === true).length;
  if (rows.length && primaries !== 1) errors.push(`issues: ${primaries} primary labels; the standard uses exactly one`);
  for (const p of provs) for (const k of p.issueKeys || []) if (!perKey.has(k)) errors.push(`provision ${p.ref} lists ${k}, which has no mapping row`);

  const cons = list(errors, "considered", L.considered, SHAPE.considered);
  cons.forEach((c, i) => {
    if (!keys.has(c.issueKey) && !/^\(not in text\) \S/.test(c.issueKey)) errors.push(`considered[${i}]: ${c.issueKey} is not a register key`);
    if (perKey.has(c.issueKey)) errors.push(`considered[${i}]: ${c.issueKey} is both mapped and declined`);
    if (MIXED_WORDS.test(c.whyNot || "")) warnings.push(`considered ${c.issueKey}: declined because it runs both ways; under splitMappingRule it should be mapped as two rows`);
  });

  // F. sponsors and statements
  const sps = list(errors, "sponsors", L.sponsors, SHAPE.sponsor);
  if (sps.filter((s) => s.role === "sponsor").length !== 1) errors.push("sponsors: the standard lists exactly one sponsor");
  sps.forEach((s, i) => {
    if (!["sponsor", "cosponsor"].includes(s.role)) errors.push(`sponsors[${i}]: role ${s.role}`);
    if (!/\[[A-Z]{1,2}-[A-Z]{2}(-(\d+|At Large))?\]$/.test(s.recordName || "")) errors.push(`sponsors[${i}]: recordName "${s.recordName}" carries no [party-state]`);
    if (!inRoster(s.politicianId)) errors.push(`sponsors[${i}]: ${s.politicianId} is not in the roster`);
    if (s.politicianId && s.profile !== `/p/${s.politicianId}`) errors.push(`sponsors[${i}]: profile ${s.profile} is not /p/${s.politicianId}`);
    if (!s.politicianId && s.profile !== null) errors.push(`sponsors[${i}]: no roster id but a profile link`);
    if (!isDate(s.joinedOn)) errors.push(`sponsors[${i}]: joinedOn is not a date`);
  });
  list(errors, "statedOnBill", L.statedOnBill, SHAPE.stated).forEach((s, i) => {
    if (!inRoster(s.politicianId)) errors.push(`statedOnBill[${i}]: ${s.politicianId} is not in the roster`);
    if (!s.excerpt) errors.push(`statedOnBill[${i}]: no verbatim excerpt`);
  });
  fields(errors, "statedCheck", L.statedCheck, SHAPE.statedCheck);

  // G. votes
  const v = L.votes || {};
  if (fields(errors, "votes", v, { req: [...SHAPE.votes.req, `on${self}Itself`], opt: [] })) {
    list(errors, "votes.rollcalls", v.rollcalls, SHAPE.rollcall).forEach((r, i) => {
      const w = `votes.rollcalls[${i}] roll ${r.roll}`;
      const ms = list(errors, `${w}.members`, r.members, SHAPE.member);
      const n = (re) => ms.filter((m) => re.test(m.vote || "")).length;
      const t = r.totals || {};
      if (n(/^(Yea|Aye|Yes)$/i) !== t.yea || n(/^(Nay|No)$/i) !== t.nay || n(/^Not Voting$/i) !== t.notVoting)
        errors.push(`${w}: totals do not match the member rows`);
      const linked = ms.filter((m) => m.politicianId).length;
      if (r.rosterLinked !== `${linked} of ${ms.length}`) errors.push(`${w}: rosterLinked "${r.rosterLinked}" but ${linked} of ${ms.length} are linked`);
      ms.forEach((m) => { if (!inRoster(m.politicianId)) errors.push(`${w}: ${m.politicianId} is not in the roster`); });
    });
    list(errors, "votes.noRecordedVote", v.noRecordedVote, SHAPE.noRecordedVote);
  }

  // H. claims
  list(errors, "claims", L.claims, SHAPE.claim).forEach((c, i) => {
    const w = `claims[${i}] ${c.id}`;
    for (const ref of c.provisionRefs || []) if (!byRef.has(ref)) errors.push(`${w}: cites ${ref}, which is not a provision`);
    for (const side of ["supportersSay", "opponentsSay"]) {
      const said = list(errors, `${w}.${side}`, c[side], SHAPE.said);
      said.forEach((s) => { if (!inRoster(s.who)) errors.push(`${w}.${side}: ${s.who} is not in the roster`); });
      if (!said.length) warnings.push(`${w}: no ${side} on record`);
    }
    if (!list(errors, `${w}.whatTheTextSays`, c.whatTheTextSays, SHAPE.textSays).length) errors.push(`${w}: no text quoted`);
    if (!c.plainRead) errors.push(`${w}: no plain reading`);
    if (c.independentRead) fields(errors, `${w}.independentRead`, c.independentRead, SHAPE.scorekeeper);
  });
  list(errors, "scorekeepers", L.scorekeepers, SHAPE.scorekeeper);

  // I. citations
  list(errors, "secondarySources", L.secondarySources, SHAPE.secondary).forEach((s, i) => {
    if (s.type !== "secondary") errors.push(`secondarySources[${i}]: type is ${s.type}, not secondary`);
  });
  const { secondarySources, ...rest } = L;
  for (const [p, u] of urls(rest, "ledger", [])) if (!isPrimaryUrl(u)) errors.push(`${p}: ${u} is not a primary source; list it in secondarySources`);
  for (const [p, u] of urls(secondarySources || [], "secondarySources", [])) if (p.endsWith(".pairedPrimary") && !isPrimaryUrl(u)) errors.push(`${p}: pairedPrimary ${u} is not primary`);
  for (const k of Object.keys(L).filter((k) => k.startsWith("textDelta_"))) fields(errors, k, L[k], SHAPE.textDelta);

  // Completeness
  const cm = L.completeness || {};
  if (fields(errors, "completeness", cm, { req: COMPLETENESS_SECTIONS, opt: [] })) {
    for (const s of COMPLETENESS_SECTIONS) {
      if (!fields(errors, `completeness.${s}`, cm[s], SHAPE.completenessEntry)) continue;
      if (!MARKS.includes(cm[s].mark)) errors.push(`completeness.${s}: mark ${cm[s].mark}`);
      if (cm[s].mark === "missing") (ctx.strict ? errors : warnings).push(`completeness.${s}: missing (${cm[s].note})`);
    }
    const e = (cm.E_issue_mapping || {}).note || "";
    const mapped = perKey.size, declined = cons.length;
    const m = /^(\d+) keys? mapped(?: in (\d+) rows)?, (\d+) considered and declined/.exec(e);
    if (!m) errors.push('completeness.E_issue_mapping: note must open "N keys mapped[ in M rows], K considered and declined"');
    else {
      if (+m[1] !== mapped) errors.push(`completeness.E_issue_mapping: says ${m[1]} keys mapped, ledger has ${mapped}`);
      if (rows.length !== mapped && +(m[2] || mapped) !== rows.length) errors.push(`completeness.E_issue_mapping: ${rows.length} rows for ${mapped} keys; the note must say "in ${rows.length} rows"`);
      if (m[2] && +m[2] !== rows.length) errors.push(`completeness.E_issue_mapping: says ${m[2]} rows, ledger has ${rows.length}`);
      if (+m[3] !== declined) errors.push(`completeness.E_issue_mapping: says ${m[3]} considered, ledger has ${declined}`);
    }
  }
  return { errors, warnings };
}

/** The E_issue_mapping note's opening, from the lists themselves. */
export function mappingCountNote(issues, considered) {
  const k = new Set(issues.map((r) => r.issueKey)).size;
  return `${k} keys mapped${issues.length !== k ? ` in ${issues.length} rows` : ""}, ${considered.length} considered and declined.`;
}

// ── Quote checking (needs the text, so the CLI fetches it) ──────────────────
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
export const normText = (s) => String(s || "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e.toLowerCase()] ?? m)
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ")
  .replace(/\s+/g, " ").trim();
/** Every verbatim quote in a ledger with the URL it claims to come from. */
export function quotesOf(L) {
  const q = [];
  (L.provisions || []).forEach((p) => q.push({ where: `provision ${p.ref}`, quote: p.textQuote, url: p.sourceUrl }));
  (L.issues || []).forEach((r) => q.push({ where: `issue ${r.issueKey} ${r.supportMeaning}`, quote: r.quote, url: r.sourceUrl }));
  (L.claims || []).forEach((c) => (c.whatTheTextSays || []).forEach((t) => q.push({ where: `claim ${c.id} ${t.ref}`, quote: t.quote, url: t.sourceUrl })));
  return q.filter((x) => x.quote);
}

// ── Scaffold: what the official record fills, and nothing else ──────────────
// A record is the Congress.gov API's own rows for the bill (see the CLI):
//   { bill, actions, cosponsors, titles, textVersions, relatedBills, rollcalls }
// rollcalls are parsed chamber roll-call files: { chamber, congress, session,
//   roll, date, measure, question, result, requiredMajority, sourceUrl,
//   members: [{ lis?, bioguideId?, name, party, vote }] }.
// opts: { today, memberMap (bioguide → roster id), lisMap (LIS → roster id), people }

const TYPE_PATH = {
  s: "senate-bill", hr: "house-bill", sres: "senate-resolution", hres: "house-resolution",
  sjres: "senate-joint-resolution", hjres: "house-joint-resolution", sconres: "senate-concurrent-resolution", hconres: "house-concurrent-resolution",
};
const ordinal = (n) => `${n}${[, "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th"}`;
export const congressGovUrl = (c, type, num) => `https://www.congress.gov/bill/${ordinal(+c)}-congress/${TYPE_PATH[type]}/${num}`;
export const billStatusUrl = (c, type, num) => `https://www.govinfo.gov/bulkdata/BILLSTATUS/${c}/${type}/BILLSTATUS-${c}${type}${num}.xml`;
export const printedNumber = (type, num) => ({ s: "S.", hr: "H.R.", sres: "S.Res.", hres: "H.Res.", sjres: "S.J.Res.", hjres: "H.J.Res.", sconres: "S.Con.Res.", hconres: "H.Con.Res." }[type] + " " + num);

/** One Congress.gov action → a status word, or "other". The repo's one action
 *  classifier (netlify/lib/bill-record-stages.mjs billStage) decides the stage;
 *  only a committee referral, which it leaves out, is read here. */
const STAGE_WORD = {
  introduced: () => "introduced", reported: () => "reported", presented: () => "to_president",
  law: () => "enacted", vetoed: () => "vetoed", failed_vote: () => "failed", resolved: () => "resolving_differences",
  passed: (c) => (c === "house" ? "passed_house" : c === "senate" ? "passed_senate" : "other"),
};
export function stageOfAction(a) {
  const st = billStage(a);
  if (st && STAGE_WORD[st[0]]) return STAGE_WORD[st[0]](st[1]);
  if (String(a.sourceSystem?.code ?? "9") === "9" && /^(Read twice and referred to|Referred to the)\b/i.test(String(a.text || ""))) return "in_committee";
  return "other";
}

const actionUrl = (c, type, num) => `${congressGovUrl(c, type, num)}/all-actions`;

/** Congress.gov lists newest first and repeats an action once per source system;
 *  the Library of Congress rows are kept, oldest first, same-day steps in the
 *  order they happened. */
export function timelineFrom(record) {
  const b = record.bill;
  const type = b.type.toLowerCase();
  const num = printedNumber(type, b.number);
  const seen = new Set();
  return [...(record.actions || [])].reverse()
    .filter((a) => String(a.sourceSystem?.code ?? "9") === "9")
    .map((a) => ({
      date: String(a.actionDate || "").slice(0, 10),
      measure: num,
      stage: stageOfAction(a),
      text: String(a.text || "").replace(/\s+/g, " ").trim(),
      sourceUrl: actionUrl(b.congress, type, b.number),
    }))
    .filter((r) => { const k = `${r.date}|${r.text}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r, i) => ({ r, i }))
    .sort((x, y) => x.r.date.localeCompare(y.r.date) || x.i - y.i)
    .map((x) => x.r);
}

export function statusFrom(timeline, number) {
  const own = timeline.filter((r) => !number || r.measure === number);
  const staged = own.filter((r) => r.stage !== "other");
  const last = own[own.length - 1];
  let status = staged.length ? staged[staged.length - 1].stage : "introduced";
  const passed = new Set(staged.map((r) => r.stage));
  if (/^passed_(house|senate)$/.test(status) && passed.has("passed_house") && passed.has("passed_senate")) status = "passed_both";
  return { status, lastAction: last ? { date: last.date, text: last.text, sourceUrl: last.sourceUrl } : null };
}

const actionTypeOf = (q) => /cloture/i.test(q) ? "cloture" : /^On (the )?Amendment/i.test(q) ? "amendment" : /passage/i.test(q) ? "passage"
  : /waive|point of order|table/i.test(q) ? "procedural" : "motion";

export function rollcallFrom(rc, opts) {
  const link = (m) => (m.lis && opts.lisMap?.[m.lis]) || (m.bioguideId && opts.memberMap?.[m.bioguideId]) || null;
  const members = rc.members.map((m) => {
    const id = link(m);
    return { politicianId: id && (!opts.people || opts.people.has(id)) ? id : null, ...(m.lis ? { lis: m.lis } : {}), ...(m.bioguideId ? { bioguideId: m.bioguideId } : {}), name: m.name, vote: m.vote };
  });
  const by = {};
  rc.members.forEach((m) => { by[m.party] = by[m.party] || {}; by[m.party][m.vote] = (by[m.party][m.vote] || 0) + 1; });
  const cnt = (re) => rc.members.filter((m) => re.test(m.vote)).length;
  const type = actionTypeOf(rc.question);
  return {
    chamber: rc.chamber, congress: rc.congress, session: rc.session, roll: rc.roll, date: rc.date, measure: rc.measure,
    question: rc.question, actionType: type, procedural: !["passage", "amendment"].includes(type), result: rc.result,
    requiredMajority: rc.requiredMajority, totals: { yea: cnt(/^(Yea|Aye|Yes)$/i), nay: cnt(/^(Nay|No)$/i), notVoting: cnt(/^Not Voting$/i) },
    byParty: by, sourceUrl: rc.sourceUrl, rosterLinked: `${members.filter((m) => m.politicianId).length} of ${members.length}`, members,
  };
}

const missing = (note) => ({ mark: "missing", note });

export function scaffoldLedger(record, opts = {}) {
  const b = record.bill;
  const type = b.type.toLowerCase();
  const number = printedNumber(type, b.number);
  const today = opts.today;
  const self = compact(number);
  const roster = (bio) => { const id = opts.memberMap?.[bio] || null; return id && (!opts.people || opts.people.has(id)) ? id : null; };
  const titles = record.titles || [];
  const short = titles.find((t) => /^Short Title/i.test(t.titleType || ""))?.title || null;
  const sp = (b.sponsors || [])[0] || {};
  const sponsors = [
    ...(b.sponsors || []).slice(0, 1).map((s) => ({ s, role: "sponsor", original: true, joinedOn: b.introducedDate })),
    ...(record.cosponsors || []).filter((c) => !c.sponsorshipWithdrawnDate).map((s) => ({ s, role: "cosponsor", original: !!s.isOriginalCosponsor, joinedOn: s.sponsorshipDate })),
  ].map(({ s, role, original, joinedOn }) => {
    const id = roster(s.bioguideId);
    return { politicianId: id, bioguideId: s.bioguideId, recordName: s.fullName, role, original, joinedOn, profile: id ? `/p/${id}` : null };
  });
  const withdrawn = (record.cosponsors || []).filter((c) => c.sponsorshipWithdrawnDate).length;
  const cos = sponsors.filter((s) => s.role === "cosponsor");
  const offRoster = sponsors.filter((s) => !s.politicianId).length;
  const veh = opts.vehicle || null; // the floor vehicle's own record, when the bill moves on another measure
  const vNumber = veh ? printedNumber(veh.bill.type.toLowerCase(), veh.bill.number) : null;
  const timeline = [...timelineFrom(record), ...(veh ? timelineFrom(veh) : [])]
    .map((r, i) => ({ r, i })).sort((x, y) => x.r.date.localeCompare(y.r.date) || x.i - y.i).map((x) => x.r);
  const rollcalls = [...(record.rollcalls || []), ...(veh?.rollcalls || [])]
    .sort((x, y) => String(x.date).localeCompare(String(y.date)) || x.roll - y.roll)
    .map((rc) => rollcallFrom(rc, opts));
  const versions = (record.textVersions || []).map((v) => {
    const f = (v.formats || []).find((x) => /Formatted Text/i.test(x.type)) || (v.formats || [])[0] || {};
    const pkg = /(BILLS-\d+[a-z]+\d+([a-z]+))\.htm/.exec(f.url || "");
    const textUrl = pkg ? `https://www.govinfo.gov/content/pkg/${pkg[1]}/html/${pkg[1]}.htm` : f.url || null;
    return { version: pkg?.[2] || v.type, label: `${v.type}${v.date ? ` (${String(v.date).slice(0, 10)})` : ""}`, textUrl, why: "Listed by Congress.gov as a published text version of the bill. Not read yet." };
  });
  const related = (record.relatedBills || []).map((r) => ({ number: printedNumber(String(r.type).toLowerCase(), r.number), congress: r.congress, relationship: (r.relationshipDetails || []).map((d) => d.type).join("; ") }));

  return {
    standardVersion: STANDARD_VERSION,
    verifiedOn: today,
    verifiedBy: "generator scaffold (official record only); provisions, mappings, claims and statements not read yet; needs a reading pass and human review before any migration",
    key: `${b.congress}|${number}`,
    identity: {
      congress: b.congress,
      session: timeline.length ? (+timeline[0].date.slice(0, 4) % 2 ? 1 : 2) : null,
      number, billType: type, chamber: String(b.originChamber || "").toLowerCase(),
      shortTitle: short,
      officialTitle: titles.find((t) => /^Official Title/i.test(t.titleType || ""))?.title || b.title || null,
      policyArea: b.policyArea?.name || null,
      congressGovUrl: congressGovUrl(b.congress, type, b.number),
      billStatusUrl: billStatusUrl(b.congress, type, b.number),
      textVersionsRead: versions,
      companions: { relatedBillsOnRecord: related, note: `Congress.gov lists ${related.length} related bill${related.length === 1 ? "" : "s"} (read ${today}).` },
      ...(veh ? { floorVehicle: {
        number: vNumber, congress: veh.bill.congress, title: veh.bill.title || null,
        congressGovUrl: congressGovUrl(veh.bill.congress, veh.bill.type.toLowerCase(), veh.bill.number),
        billStatusUrl: billStatusUrl(veh.bill.congress, veh.bill.type.toLowerCase(), veh.bill.number),
        note: `Named as the floor vehicle when the ledger was scaffolded. Its text and any substitute amendment are not read yet.`,
      } } : {}),
      sponsor: { politicianId: roster(sp.bioguideId), bioguideId: sp.bioguideId || null, recordName: sp.fullName || null },
    },
    status: {
      statusWords: STATUS_WORDS.join(" · "),
      statusAsOf: today,
      [self]: statusFrom(timeline, number),
      ...(veh ? { [`vehicle_${compact(vNumber)}`]: statusFrom(timeline, vNumber) } : {}),
      timeline,
      timelineNote: '"other" marks an action that is not one of the status stages. Stages are read off the action text only.',
    },
    overview: { plainSummary: "", wordCount: 0, summarySources: [], valueWordCheck: "Not written yet." },
    provisions: [],
    issues: [],
    splitMappingRule: SPLIT_MAPPING_RULE,
    considered: [],
    primaryLabelNote: PRIMARY_LABEL_NOTE,
    sponsors,
    sponsorNote: `Congress.gov lists 1 sponsor and ${cos.length} cosponsor${cos.length === 1 ? "" : "s"} (${cos.filter((c) => c.original).length} original)${withdrawn ? `, ${withdrawn} withdrawn` : ", none withdrawn"} (read ${today}). ${offRoster ? `${offRoster} not on the PolitiDex roster (no profile link).` : "All are on the PolitiDex roster."}`,
    statedOnBill: [],
    statedCheck: { checkedOn: null, method: "Not checked yet. Sponsor and cosponsor statements must come from their own pages or the Congressional Record.", counts: {}, lockerQualityNotes: [] },
    votes: {
      [`on${self}Itself`]: rollcalls.length ? `${rollcalls.length} recorded roll call${rollcalls.length === 1 ? "" : "s"} on the record (Congress.gov actions, read ${today}).` : `None. No recorded roll call on the record (Congress.gov actions, read ${today}).`,
      rollcalls,
      substantiveVote: null,
      sponsorVotes: null,
      noRecordedVote: [],
      rosterLinking: "Senators linked by LIS member id and House members by bioguide id, through the roster tables the voting record already uses. A member with no roster row is kept with politicianId null.",
    },
    claims: [],
    scorekeepers: [],
    secondarySources: [],
    completeness: {
      A_identity: { mark: versions.length ? "partial" : "missing", note: `${versions.length} text version${versions.length === 1 ? "" : "s"} listed; none read yet. Floor vehicle, if any, not checked.` },
      B_status: { mark: timeline.length ? "present" : "missing", note: timeline.length ? "Official record only; every timeline row is dated." : "No actions on the record were read." },
      C_overview: missing("Not written yet."),
      D_provisions: missing("Text not read yet. No provision is recorded until it is read and quoted."),
      E_issue_mapping: missing(`${mappingCountNote([], [])} Not mapped yet.`),
      F_positions: missing("Statements not checked yet."),
      G_votes: rollcalls.length ? { mark: "partial", note: `${rollcalls.length} roll call${rollcalls.length === 1 ? "" : "s"} read from the chamber files; ${rollcalls.map((r) => r.rosterLinked).join(", ")} linked. Floor vehicle votes, if any, not checked.` } : { mark: "present", note: "No recorded vote on the record." },
      H_contested_claims: missing("Not researched yet."),
      I_citations: { mark: "partial", note: "Identity, status, sponsors and votes cite the official record only. Other sections not written yet." },
    },
    doesNotDo: "No live page, data row, migration or service worker is changed by this file.",
  };
}
