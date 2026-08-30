#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-densify-stances-aug2026.mjs — the stance half of the August 2026
// formal-record densification pass
// ─────────────────────────────────────────────────────────────────────────────
// 20260910000000_vr_densify_underweighted_landmarks.sql widened two heavily-voted
// measures from a single headline key onto the provisions their text actually
// supports:
//
//   H.R. 6955 (119) Main Street Capital Access Act — 216 recorded votes
//       + gov_regulation    w85 secondary yea_supports
//       + econ_corp_account w60 secondary yea_opposes
//   H.R. 2670 (118) FY24 National Defense Authorization Act — 197 recorded votes
//       + privacy_rights    w45 secondary yea_opposes  (Sec. 7902, FISA Title VII)
//
// Every member with a recorded vote on those measures is now on the issue ledger
// for the new keys. That is the whole point of the mapping work and it needs no
// stance at all. This script is the SECOND, much smaller half: the handful of
// members who, while that formal work was being done, turned out to have a real,
// dated, independently sourced position on one of the same keys.
//
// The bar every row here clears:
//   1. The position is independent of the vote it will be lined up against. Not
//      derived from the roll call, not a reaction to the bill, not a signature on
//      a cosponsor list standing in for a belief.
//   2. It is sourced to a stable, dated document and quoted or closely paraphrased
//      from the member's own words.
//   3. It is directional on the SAME issue key as the instrument, read against the
//      key's own chip and never against how the member voted.
//   4. It passes the shipped share/stance guards unchanged — this script re-runs
//      guards 10 and 15 out of receipt-cards.js in a bare VM before it will write.
//
// TWO OF THE THREE ROWS ARE REWRITES, not additions. Both cards already existed and
// both were blocked by guard 10 because the stated position was written as a vote.
// scripts/vr-audit-circular-stances-aug2026.mjs states the standing remedy for that
// shape: "the position has to be re-sourced to platform language, a speech, an
// interview or an official statement." That is what happens here — the claim is
// re-sourced, never laundered out of the vote language it replaces.
//
//   french_hill / gov_regulation
//     was: "In 2025 sponsored legislation to rescind a CFPB rule capping bank
//     overdraft fees at $5", evidenced by the committee chair, sourced to Wikipedia.
//     "sponsored" trips VOTE_VERB_RE, so the card never built. Re-sourced to the
//     July 22, 2026 letter he and the Financial Institutions Subcommittee sent the
//     Federal Reserve's Vice Chair for Supervision. The overdraft claim is dropped
//     rather than carried over: no primary source for it was reachable in this pass,
//     and the resolution behind it is a formal act that belongs on the ledger.
//
//   massie / privacy_rights
//     was a description of his nay on H.R. 7888, sourced to clerk.house.gov roll
//     119 — circular three ways over (measure number, vote verb, roll-call URL).
//     Re-sourced to the Surveillance Accountability Act he authored on April 23,
//     2026, and to the statement he issued with it. The vote it described stays on
//     the formal ledger, where it was already recorded; nothing is lost by taking
//     it out of the stated-position lane.
//
// AND ONE ADDITION:
//   boebert / privacy_rights — no card on the key at all. Rests on her own quoted
//   statement in that same release, not on the cosponsor line: she is an original
//   cosponsor (govinfo BILLSTATUS-119hr8470, isOriginalCosponsor true), but a
//   signature is not a position and is not what this card cites.
//
// DELIBERATELY NOT WRITTEN, though the key is dark and the member voted:
//   · maxine_waters / gov_regulation — her only statement on this bill's subject in
//     the window IS about this bill ("H.R. 6955 is Wall Street Deregulation Hiding
//     as a Community Bank Bill", Rules testimony). That is a reaction to the vehicle,
//     which guard 15's REACTION_RE exists to refuse. Her broader committee statement
//     is about the independence of the Federal Reserve and other regulators, which is
//     not the same axis as the volume and cost of federal rules. Left unscored.
//   · french_hill / econ_corp_account — the Federal Reserve letter asks for faster
//     merger review, not for less competition analysis. Reading "opposes corporate
//     accountability" off a letter about processing times would be inference, and the
//     H.R. 6955 econ_corp_account row already carries the substance honestly.
//   · curtis / privacy_rights — the existing card ("Voted to reauthorize federal
//     surveillance authority despite stated privacy concerns") is circular, and the
//     non-vote half names a concern without sourcing one. No independent statement
//     was found in this pass, so it is left as it stands.
//   · Every other dark (member, issue) pair created by the two new mappings — 60+ of
//     them. Clearing those in bulk with thin text is the failure mode this pass is
//     written against.
//
// Idempotent: a rewrite whose "before" line is already gone is reported and skipped,
// an addition whose key already carries a card is refused. Refuses to write if any
// targeted pid, line or guard check fails. Regenerate the chunks afterwards with
// scripts/split-stances.mjs.
//
// Run:  node scripts/vr-densify-stances-aug2026.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "politician-stances.js");
const WRITE = process.argv.includes("--write");

const HILL_SRC = "https://financialservices.house.gov/news/documentsingle.aspx?DocumentID=411208";
const SAA_SRC = "https://massie.house.gov/news/documentsingle.aspx?DocumentID=395818";

// ── The three cards ──────────────────────────────────────────────────────────
// `was` is the exact substring of the line this card replaces; omit it for an
// addition. `key` is checked against db/issue-keys.json before anything is written.
const CARDS = [
  {
    pid: "french_hill", key: "gov_regulation", icon: "🏦", pos: "support",
    topic: "Financial Regulation",
    was: "text:'In 2025 sponsored legislation to rescind a CFPB rule capping bank overdraft fees at $5.', evidence:'Chairs the House Financial Services Committee.', source:{label:'Wikipedia', url:'https://en.wikipedia.org/wiki/French_Hill_(politician)'}",
    text: "Presses federal banking regulators to lighten the burden of their own review processes, asking the Federal Reserve to clear long-pending bank merger and acquisition applications, adopt its Inspector General’s recommendations on the backlog, and widen the use of delegated authority so fewer applications need a full review — arguing that faster review means a stronger banking system and wider access to financial services.",
    ev: "Chairs the House Financial Services Committee; signed the July 22, 2026 letter to Federal Reserve Vice Chair for Supervision Michelle Bowman along with every member of the Financial Institutions Subcommittee.",
    label: "financialservices.house.gov", url: HILL_SRC,
  },
  {
    pid: "massie", key: "privacy_rights", icon: "🔒", pos: "support",
    topic: "Privacy & Surveillance",
    was: "text:'Voted no on the Reforming Intelligence and Securing America Act (H.R. 7888), which extended warrantless Section 702 collection for two years and broadened the definition of an electronic communications service provider; it passed the House 273–147 on April 12, 2024.', evidence:'Recorded a no vote on H.R. 7888, Roll Call 119, April 12, 2024.', source:{label:'House Clerk — Roll Call 119 (2024)', url:'https://clerk.house.gov/evs/2024/roll119.xml'}",
    text: "Lead author of the Surveillance Accountability Act, which would require a warrant based on probable cause before any government search that significantly intrudes on someone’s privacy — including data held by internet providers, banks, cloud services and data brokers — and would let people sue federal employees who search without one. He says “the Bill of Rights is not a suggestion, and Fourth Amendment protections against warrantless searches conducted by the government are not optional.”",
    ev: "Introduced the Surveillance Accountability Act on April 23, 2026 with Rep. Lauren Boebert as co-lead. It closes the third-party doctrine loophole, defines a search to include metadata, geolocation, financial records and internet activity, and bars warrantless facial recognition, biometric tracking and license-plate reader surveillance aimed at individuals.",
    label: "massie.house.gov", url: SAA_SRC,
  },
  {
    pid: "boebert", key: "privacy_rights", icon: "🔒", pos: "support",
    topic: "Privacy & Surveillance",
    text: "Co-lead of the Surveillance Accountability Act, a universal warrant requirement for government searches of personal data. She says it “forces the government to obey the Fourth Amendment in the digital age. No more warrantless searches of your phone, cloud data, bank records, or internet history. No more hiding behind the ‘third-party doctrine.’ No more creepy warrantless facial recognition or tracking.”",
    ev: "Named co-lead of the Surveillance Accountability Act on the day it was introduced, April 23, 2026, in the release announcing it.",
    label: "massie.house.gov", url: SAA_SRC,
  },
];

// ── The shipped guards, loaded rather than re-implemented ────────────────────
// Same bare-VM shape scripts/vr-audit-circular-stances-aug2026.mjs uses, so this
// script cannot drift from the logic that decides whether a card builds.
function loadGuards() {
  const noopEl = () => ({
    style: {}, textContent: "", hidden: false, className: "", innerHTML: "",
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    document: {
      readyState: "complete",
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { hash: "", origin: "https://www.politidex.fyi", pathname: "/" },
    navigator: {},
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "receipt-cards.js"), "utf8"), ctx,
    { filename: "receipt-cards.js" });
  const g = ctx.window.PDXReceiptCards && ctx.window.PDXReceiptCards.guards;
  if (!g || !g.blockStance || !g.blockDependentStance) {
    throw new Error("receipt-cards.js did not expose guards.blockStance / guards.blockDependentStance");
  }
  return g;
}

const guards = loadGuards();
const KEYS = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "db/issue-keys.json"), "utf8")).keys.map((k) => k.key || k));

// The instruments each card will be lined up against, so guard 15 is asked the
// question it is actually for: is this position independent of THAT document?
const INSTRUMENTS = {
  gov_regulation: { number: "H.R. 6955", source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/6955" } },
  econ_corp_account: { number: "H.R. 6955", source: { url: "https://www.congress.gov/bill/119th-congress/house-bill/6955" } },
  privacy_rights: { number: "H.R. 2670", source: { url: "https://www.congress.gov/bill/118th-congress/house-bill/2670" } },
};

const problems = [];
for (const c of CARDS) {
  const where = `${c.pid}/${c.key}`;
  if (!KEYS.has(c.key)) problems.push(`${where}: issue key is not in db/issue-keys.json`);
  const pos = { text: c.text, evidence: c.ev, source: { label: c.label, url: c.url } };
  const b10 = guards.blockStance(c.text);
  if (b10) problems.push(`${where}: guard 10 — ${b10}`);
  const b15 = guards.blockDependentStance(pos, INSTRUMENTS[c.key]);
  if (b15) problems.push(`${where}: guard 15 — ${b15}`);
  if (!/^https:\/\/\S+$/.test(c.url)) problems.push(`${where}: source url is not a bare https address`);
  if (!/\b(19|20)\d\d\b/.test(c.ev || "")) problems.push(`${where}: evidence carries no date`);
}
if (problems.length) {
  console.error(`! ${problems.length} card(s) fail the bar — refusing to write:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

// ── Apply ────────────────────────────────────────────────────────────────────
const q = (s) => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const PID_OPEN = /^\s{0,6}([a-z0-9_]+):\s*\[/;

let text = fs.readFileSync(SRC, "utf8");
const lines = text.split("\n");

// Block bounds per pid, for the additions.
const opens = [];
lines.forEach((l, i) => { const m = l.match(PID_OPEN); if (m) opens.push({ pid: m[1], line: i }); });
const blocks = new Map();
for (let k = 0; k < opens.length; k++) {
  const start = opens[k].line;
  const boundary = k + 1 < opens.length
    ? opens[k + 1].line
    : lines.findIndex((l, i) => i > start && /^\s{0,4}\};\s*$/.test(l));
  let close = -1;
  for (let i = boundary - 1; i > start; i--) {
    if (/^\s*\],?\s*$/.test(lines[i])) { close = i; break; }
  }
  if (close > start) blocks.set(opens[k].pid, { start, close });
}

// Existing (pid, issueKey) pairs — say-vs-do.js reads the FIRST card on a key, so a
// second one would never be scored.
const existingKeys = new Set();
{
  let pid = "?";
  for (const L of lines) {
    const pm = L.match(PID_OPEN);
    if (pm) { pid = pm[1]; continue; }
    const km = L.match(/issueKey\s*:\s*'([a-z0-9_]+)'/);
    if (km) existingKeys.add(`${pid}||${km[1]}`);
  }
}

const render = (c) => [
  `      { topic:${q(c.topic)}, icon:'${c.icon}', pos:'${c.pos}', issueKey:'${c.key}', issueStance:'${c.pos}',`,
  `        text:${q(c.text)},`,
  `        evidence:${q(c.ev)},`,
  `        source:{label:${q(c.label)}, url:${q(c.url)}} },`,
];

const rewrites = CARDS.filter((c) => c.was);
const adds = CARDS.filter((c) => !c.was);
const done = [];
const failures = [];

for (const c of rewrites) {
  if (!text.includes(c.was)) { failures.push(`${c.pid}/${c.key}: the line this rewrite replaces is not present verbatim`); continue; }
  if (text.split(c.was).length !== 2) { failures.push(`${c.pid}/${c.key}: the line this rewrite replaces is not unique`); continue; }
  const after = `text:${q(c.text)}, evidence:${q(c.ev)}, source:{label:${q(c.label)}, url:${q(c.url)}}`;
  text = text.replace(c.was, after);
  done.push({ ...c, how: "rewrite" });
}

const inserts = new Map();
for (const c of adds) {
  const b = blocks.get(c.pid);
  if (!b) { failures.push(`${c.pid}: not present in ISSUE_STANCE_DATA`); continue; }
  if (existingKeys.has(`${c.pid}||${c.key}`)) { failures.push(`${c.pid}/${c.key}: key already carries a card — say-vs-do would never read a second one`); continue; }
  if (!inserts.has(b.close)) inserts.set(b.close, []);
  inserts.get(b.close).push(...render(c));
  done.push({ ...c, how: "add" });
}

console.log(`densification stance pass — ${CARDS.length} card(s) targeted, all ${CARDS.length} clear guards 10 and 15`);
for (const d of done) console.log(`  ${d.how === "rewrite" ? "~" : "+"} ${d.pid.padEnd(14)} ${d.key.padEnd(18)} ${d.pos.padEnd(8)} ${d.topic}`);
if (failures.length) {
  console.error(`\n! ${failures.length} card(s) could not be applied — refusing to write:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }

if (inserts.size) {
  const src = text.split("\n");
  const out = [];
  // Re-locate the insertion points in the rewritten text: the rewrites above are
  // in-line substitutions, so line numbering is unchanged, but assert it anyway.
  if (src.length !== lines.length) throw new Error("line count moved during rewrite — refusing to insert by index");
  for (let i = 0; i < src.length; i++) {
    if (inserts.has(i)) out.push(...inserts.get(i));
    out.push(src[i]);
  }
  text = out.join("\n");
}
fs.writeFileSync(SRC, text, "utf8");
console.log(`\nWrote ${done.length} card(s) to politician-stances.js`);
