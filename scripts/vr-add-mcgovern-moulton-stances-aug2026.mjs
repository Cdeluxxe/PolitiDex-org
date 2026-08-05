// ─────────────────────────────────────────────────────────────────────────────
// vr-add-mcgovern-moulton-stances-aug2026.mjs — unlock the McGovern/Moulton record
// ─────────────────────────────────────────────────────────────────────────────
// 20260822000000_vr_epstein_cosponsor_roster_expansion.sql gave Rep. Jim McGovern
// (jim_mcgovern) and Rep. Seth Moulton (seth_moulton) their first attributable rows:
// a cosponsorship of H.R. 4405 plus a yea on house 119/1 roll 289 (Epstein Files
// Transparency Act) and a nay on house 119/2 roll 214 (S. 2, Secure America Act).
//
// Both were then testable but not rankable. Rankability needs three legs — a member
// vote, a measure→issue mapping, and a stated position on the same issue — and the two
// measures map onto keys neither member had a stance card for:
//
//   H.R. 4405 → gov_transparency (w100, primary, yea_supports)
//   S. 2      → deportations (w100, primary), border_security (w90),
//               immig_fentanyl (w50), tough_on_crime (w40) — all yea_supports
//
// This pass adds the third leg for gov_transparency, deportations and border_security,
// which is every key of those four where each member has actually said something a
// primary or named source carries. Rules applied row by row:
//
//   · Direction is coded against the ISSUE_MAP chip for the key, never against how the
//     member voted. gov_transparency is "Force more disclosure, ban member stock
//     trading and toughen ethics rules"; deportations is "Carry out large-scale
//     deportations of people here illegally and fully lock down the border";
//     border_security is "Finish border barriers and deport people here illegally".
//     The votes were the reason to go looking, never the evidence.
//
//   · Every card carries a quote or a documented action from the member, with the URL
//     it came from. No card summarises a vote total, and none is written from what a
//     member's colleagues said.
//
//   · `mixed` where the record states both halves and flattening either would be a
//     misquote — used once, for Moulton on border_security, whose platform backs border
//     enforcement in terms while he refuses to fund the agencies that carry it out.
//
// TWO KEYS ARE DELIBERATELY LEFT EMPTY, so a nay on S. 2 stays unrankable on them:
//
//   · immig_fentanyl — neither member has a sourceable position on fentanyl or cartel
//     interdiction. Moulton's immigration platform says "We all want to stem the flow
//     of drugs into our country" and never names fentanyl, precursors or interdiction;
//     reading a direction on the drug out of one clause about drugs generally is the
//     inference this pass avoids. Nothing at all was found for McGovern.
//   · tough_on_crime — S. 2 earns this key at weight 40 through Sec. 102's Homeland
//     Security Investigations staffing, which is not what either member spoke about.
//     A card here would have to be built out of their immigration remarks, which would
//     put an enforcement-posture position on a criminal-justice axis.
//
// Also left alone: immigration_reform. Both records support it plainly — Moulton calls
// himself "such a proud supporter" of DACA and the DREAM Act — but the only measure
// carrying that key is S.Amdt. 5813, a Senate roll. A House member cannot be ranked on
// it, so it is not part of this pass's purpose. Worth a card whenever a House
// immigration_reform measure lands.
//
// Additive only: no existing row is edited, re-keyed or removed, and both pids already
// have a stance array. Idempotent — a card whose (pid, topic) already exists is counted
// and skipped. Refuses to write if either targeted pid is missing.
//
// Run:  node scripts/vr-add-mcgovern-moulton-stances-aug2026.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "politician-stances.js");
const WRITE = process.argv.includes("--write");

// One card per (pid, issue key). `ev` is optional and becomes the row's `evidence`
// field — used where the record carries a qualifier the headline sentence would lose.
const ADDS = [
  // ── Rep. Jim McGovern (D-MA-2) ─────────────────────────────────────────────
  { pid: "jim_mcgovern", key: "gov_transparency", icon: "🔍",
    topic: "Epstein Files & Forced Disclosure", pos: "support",
    text: "As ranking member on Rules he moved repeatedly to put a bill compelling release of the Epstein files on the floor, including a motion to strike a non-binding Epstein resolution from the rule and take up H.R. 4405 instead. He said \"this isn't going away, and we're going to keep on pushing it,\" and that \"people will see through it, and they're either going to release the files or they're not.\"",
    ev: "Cosponsored H.R. 4405, the Epstein Files Transparency Act, on July 17, 2025. His Rules Committee motion to bring the bill straight to the floor under a closed rule was defeated 4-9 (rules.house.gov, H. Res. 589).",
    label: "ABC News", url: "https://abcnews.go.com/Politics/johnson-gop-committed-transparency-justice-epstein/story?id=125184235" },

  { pid: "jim_mcgovern", key: "deportations", icon: "🚨",
    topic: "ICE, Detention & Deportations", pos: "oppose",
    text: "After an unannounced oversight visit to the ICE facility in Burlington, Massachusetts, he wrote that \"ICE should be abolished,\" describing those held there as \"people who belong with their families and in their communities, not locked inside detention centers,\" and argued the operation is driven by fear rather than public safety.",
    ev: "Says members of Congress may inspect such facilities without notice and that Congress has to \"show up, ask tough questions, and demand answers\"; the visit was April 8, 2026, and he recounted meeting an asylum seeker who had been keeping every scheduled appointment.",
    label: "jimmcgovern.com", url: "https://www.jimmcgovern.com/2026/04/13/i-showed-up-at-an-ice-facility-unannoun-2026-04-13/" },

  { pid: "jim_mcgovern", key: "border_security", icon: "🛂",
    topic: "ICE & Border Enforcement Funding", pos: "oppose",
    text: "Moved in the Rules Committee to make in order three amendments that would each have redirected the $70 billion the Secure America Act gives ICE and Customs and Border Protection — to SNAP food assistance, to Medicaid and ACA coverage, and to offset a two-year extension of the ACA premium tax credits.",
    ev: "All three motions were defeated 4-7 on June 8, 2026, and S. 2 reached the floor under a closed rule that barred floor amendments.",
    label: "rules.house.gov — S. 2", url: "https://rules.house.gov/bill/119/s-2" },

  // ── Rep. Seth Moulton (D-MA-6) ─────────────────────────────────────────────
  { pid: "seth_moulton", key: "gov_transparency", icon: "🔍",
    topic: "Epstein Files & Forced Disclosure", pos: "support",
    text: "Pushed for a recorded House vote on releasing the Epstein files, saying \"a lot of the American people think it's ridiculous that the rich and powerful get protected and that's obviously what's going on here,\" and pressing the point directly: \"We want to vote on this, let us vote on it, Mr. Speaker.\"",
    ev: "Cosponsored H.R. 4405, the Epstein Files Transparency Act, on July 22, 2025, and argued the House should not have left for recess with the matter unresolved — \"There's a lot of work to do, we shouldn't be home.\"",
    label: "NBC10 Boston", url: "https://www.nbcboston.com/news/politics/moutlon-jeffrey-epstein-files-house-recess/3776390/" },

  { pid: "seth_moulton", key: "deportations", icon: "🚨",
    topic: "ICE Funding & Deportation Standards", pos: "oppose",
    text: "Says \"I refuse to fund ICE\" and votes against Homeland Security appropriations on that basis — \"No more blank checks for an agency\" he argues has killed people it encountered — and frames the money as a tradeoff against health care for the same taxpayers.",
    ev: "In his January 7, 2025 vote explainer on the Laken Riley Act he opposed the bill because it \"undermines due process by watering down the requirement to actually convict somebody,\" warning that someone \"who is actually innocent but charged with a crime like shoplifting could be arrested and deported.\"",
    label: "moulton.house.gov", url: "https://moulton.house.gov/news/press-releases/moulton-homeland-security-appropriations-bill-fy26-no-more-blank-checks-agency" },

  { pid: "seth_moulton", key: "border_security", icon: "🛂",
    topic: "Border Security & Enforcement Values", pos: "mixed",
    text: "Says \"we all want secure borders\" and backs an overhaul that \"safeguards the border and curbs illegal immigration\" with \"border enforcement that is both targeted and accessible to asylum seekers\" — while refusing to fund ICE as it currently operates and calling for \"immigration enforcement that upholds our American values.\"",
    ev: "His stated platform pairs that border enforcement with a functional path to citizenship and stronger workers' rights, and he has said it is easier to cross the border than to get through the legal process.",
    label: "moulton.house.gov", url: "https://moulton.house.gov/issues/reforming-our-immigration-system" },
];

const q = s => `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

function render(a) {
  const out = [
    `      { topic:${q(a.topic)}, icon:'${a.icon}', pos:'${a.pos}', issueKey:'${a.key}', issueStance:'${a.pos}',`,
    `        text:${q(a.text)},`,
  ];
  if (a.ev) out.push(`        evidence:${q(a.ev)},`);
  out.push(`        source:{label:${q(a.label)}, url:${q(a.url)}} },`);
  return out;
}

const lines = fs.readFileSync(SRC, "utf8").split("\n");

// Index every pid block: opening line, and the line of its array's closing bracket.
// The close is found by walking back from the next pid key (or the object's own `};`)
// to the last `]`-only line, which avoids mis-reading brackets inside card strings.
const PID_OPEN = /^\s{2,6}([a-z0-9_]+):\s*\[\s*(\/\/.*)?$/;
const opens = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(PID_OPEN);
  if (m) opens.push({ pid: m[1], line: i });
}
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

// Existing (pid, topic) pairs, so a re-run adds nothing twice.
const existing = new Set();
{
  let pid = "?";
  for (const L of lines) {
    const pm = L.match(PID_OPEN);
    if (pm) { pid = pm[1]; continue; }
    const tm = L.match(/topic\s*:\s*'((?:[^'\\]|\\.)*)'/);
    if (tm) existing.add(`${pid}||${tm[1].replace(/\\(.)/g, "$1")}`);
  }
}

// Existing (pid, issueKey) pairs. say-vs-do.js reads the FIRST stance a member holds on
// a key, so a second card on a key already covered would never be the one scored — flag
// it rather than quietly append a row nothing reads.
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

const added = [];
const skipped = [];
const shadowed = [];
const missing = [];
const inserts = new Map(); // close-line index → lines to insert before it

for (const a of ADDS) {
  const b = blocks.get(a.pid);
  if (!b) { missing.push(a.pid); continue; }
  if (existing.has(`${a.pid}||${a.topic}`)) { skipped.push(`${a.pid}||${a.topic}`); continue; }
  if (existingKeys.has(`${a.pid}||${a.key}`)) { shadowed.push(`${a.pid}||${a.key}`); continue; }
  if (!inserts.has(b.close)) inserts.set(b.close, []);
  inserts.get(b.close).push(...render(a));
  existingKeys.add(`${a.pid}||${a.key}`);
  added.push({ pid: a.pid, key: a.key, pos: a.pos, topic: a.topic });
}

console.log(`McGovern/Moulton stance pass — ${ADDS.length} card(s) targeted`);
for (const a of added) console.log(`  + ${a.pid.padEnd(14)} ${a.key.padEnd(18)} ${a.pos.padEnd(8)} ${a.topic}`);
if (skipped.length) console.log(`  ${String(skipped.length).padStart(3)}  already present by topic (no-op)`);
for (const s of shadowed) console.log(`  ! ${s} — key already carries a stance; skipped (say-vs-do reads the first)`);
if (missing.length) {
  console.error(`\n! ${missing.length} targeted pid(s) not found in ISSUE_STANCE_DATA — refusing to write:`);
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

if (!WRITE) { console.log("\nDry run. Re-run with --write to apply."); process.exit(0); }

const out = [];
for (let i = 0; i < lines.length; i++) {
  if (inserts.has(i)) out.push(...inserts.get(i));
  out.push(lines[i]);
}
fs.writeFileSync(SRC, out.join("\n"), "utf8");
console.log(`\nWrote ${added.length} card(s) to politician-stances.js`);
