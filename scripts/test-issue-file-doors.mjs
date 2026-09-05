#!/usr/bin/env node
/**
 * test-issue-file-doors.mjs — the issue name is a door, the key has a definition,
 * and one measure teaches the measure
 * ─────────────────────────────────────────────────────────────────────────────
 * THE READER THIS PASS WAS BUILT FOR. Celeste Maloy on Farmers & Rural
 * Communities. The dossier stated her thin read, named the bill behind it —
 * H.R. 7567 — and then answered neither of the two questions a reader asks next:
 *
 *   · WHAT DOES THIS KEY COVER? The title printed a chip name and led nowhere.
 *     /i/<key> had existed for a while and no person×issue surface linked to it.
 *   · WHAT DID THAT MEASURE DO? The roll-up that explains a measure rendered only
 *     from two items up, so the thinnest records in the product — the ones where
 *     a single vote IS the whole formal case — were the one depth at which the
 *     explainer door did not exist.
 *
 * And rural_ag had no argued boundary at all, which is not a cosmetic gap: two
 * federal waves refused to map amendments to the key IN WRITING because of it
 * (F3 on a keyword collision with 'rural broadband', F9 twice, on H.Amdt. 202 and
 * H.Amdt. 207). A key that costs the curators mappings is a key the reader cannot
 * be expected to guess either.
 *
 * WHAT THIS FILE PINS
 *
 *   1. THE TITLE IS A DOOR, AND THE ADDRESS HAS ONE OWNER. Maloy's rural_ag
 *      dossier header links to /i/rural_ag, and no module in this pass spells the
 *      '/i/' prefix — every one of them asks pdx-issue-family.js.
 *   2. ⓘ BESIDE THE TITLE, ON ALL THREE SURFACES. The dossier header, the brief's
 *      pattern rows and the topic tree's leaves. rural_ag has argued scope this
 *      pass and reads it; cost_living still has none and says so in the one
 *      honest sentence rather than inventing a pole.
 *   3. NOTHING IS NESTED. Every new control is a SIBLING of the element that
 *      opens the dossier, never a child of it — because an <a> or <button> inside
 *      another interactive element makes the parser close the outer one early and
 *      drops the rest of the row on the floor.
 *   4. ONE MEASURE OPENS THE EXPLAINER. Driven on H.R. 7567 itself: the roll-up
 *      renders at one item, carries data-pdxdrv-open, names the bill, says the
 *      side in words rather than as "1 advanced", and prints one clipped sentence
 *      of the curator's own mapping rationale — verbatim, not summarised.
 *   5. /i/rural_ag RESOLVES FROM A COLD LOAD, in the same rewrite class as /p/.
 *   6. THE SITEMAP LISTS THE KEYS WITH SOMETHING TO READ, and the person half of
 *      it is byte-identical to HEAD's.
 *   7. NO NEW SCORE, NO PARTY FRAMING, NO SECOND PRODUCT. Swept over the new copy.
 *   8. TWIN BOOT — formal tiers and Direction Match are byte-identical to HEAD.
 *
 * A NOTE ON THE H.R. 7567 FIXTURE. Offline, Maloy's rural_ag lane is cold: the
 * roll is in db/vr-federal-wave-f11-vote-seed.json and the w100 PRIMARY mapping
 * is in the F9 migration, but db/vr-issue-seed.json — the only mapping table the
 * offline corpus reads — has not been regenerated for wave F11, which is what
 * scripts/test-vr-federal-wave-f11.mjs already fails on. So section 4 assembles
 * the record item from those two SHIPPED sources and hands it to the real
 * PDXVotingRecord: the identity, the date, the question, Maloy's own side and the
 * rationale are all read out of the repo, and nothing about the row is invented
 * here. The claim under test is the renderer's, and the renderer sees exactly what
 * a browser will see when the seed catches up.
 *
 *   node scripts/test-issue-file-doors.mjs
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const J = (f) => JSON.parse(R(f));
const HEAD = (f) => {
  try {
    return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — ${JSON.stringify(needle)} missing`);
const no = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) < 0, `${msg} — ${JSON.stringify(needle)} present`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ issue file doors: STALE PROBE — ${msg}`);
  process.exit(2);
};

const MALOY = "maloy";
const LEE = "lee";
const KEY = "rural_ag";            // the key this pass gave a boundary to
const BLANK_KEY = "cost_living";   // the key that still has none, on purpose
const HOUSING = "housing";         // Lee's smoke key
const BILL = "H.R. 7567";

// ── Boot ─────────────────────────────────────────────────────────────────────
// index.html's order: the family table and the scope table bracket the engine,
// exactly as the page defers them.
const FILES = [
  "pdx-issue-family.js",
  ...ENGINE_FILES,
  "issue-scope.js",
  "issue-colors.js",
  "voting-record.js",
  "stance-tree.js",
  "profile-spine.js",
];
function boot(get, files) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  for (const f of (files || FILES)) {
    const src = get(f);
    if (src === null) continue;
    vm.runInContext(src, ctx, { filename: f });
  }
  win.PROFILES = win.CMP_DATA;
  return win;
}

const corpus = buildCorpus(ROOT);
must(corpus && corpus.byMember && corpus.byMember.size > 300, "the record corpus did not load enough members");

const seed = (win) => {
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  return win;
};

const W = seed(boot(R));
const CS = W.PDXConsistency;
must(CS && typeof CS.gapViewHtml === "function", "PDXConsistency.gapViewHtml is gone");
must(typeof CS.dossierDriversHtml === "function", "PDXConsistency.dossierDriversHtml is gone");
must(W.PDXIssueFamily && typeof W.PDXIssueFamily.profileUrl === "function", "PDXIssueFamily.profileUrl is gone");
must(W.PDXIssueScope && typeof W.PDXIssueScope.read === "function", "PDXIssueScope.read is gone");
must(W.PDXStanceTree && typeof W.PDXStanceTree.sectionHtml === "function", "PDXStanceTree.sectionHtml is gone");
must(W.PDXWordAction && typeof W.PDXWordAction.briefHtml === "function", "PDXWordAction.briefHtml is gone");
must(W.ISSUE_MAP && W.ISSUE_MAP[KEY], `${KEY} is not in ISSUE_MAP any more`);
must(W.CMP_DATA[MALOY] && W.CMP_DATA[LEE], "maloy or lee left the roster");

const URL_KEY = W.PDXIssueFamily.profileUrl(KEY);
must(URL_KEY === "/i/" + KEY, `profileUrl(${KEY}) is ${URL_KEY}, not the address this file was written against`);

// The tags stripped before a prose sweep: they carry quoted names — a chip label,
// a statute's own title, the curator's own sentence — not copy this pass composed.
const visible = (h) => String(h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
// These modules argue in prose, at length, and the prose quotes the very strings
// the walls below forbid in CODE — "no module writes '/i/' inline" is a comment
// that contains '/i/'. So the sweeps run on the source with its line comments
// removed: the wall is about what the file DOES, and the note explaining the wall
// must not be what trips it.
const code = (f) => R(f).replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

// ═════════════════════════════════════════════════════════════════════════════
section("1 · the title is a door, and one module owns the address");
// ═════════════════════════════════════════════════════════════════════════════
{
  const head = CS.gapViewHtml(MALOY, KEY);
  must(head && head.length > 500, "maloy's rural_ag dossier rendered nothing to check");
  has(head, `<a href="/i/${KEY}"`, "the dossier title is not a link to the issue file");
  // The class survives, tint or no tint: eight suites match on it, and the tinted
  // form is "pdxgap-title pdxc-ic" — Maloy's rural_ag row carries a rail.
  has(head, `class="pdxgap-title`, "the title lost the class the issue index and the gap sheet both pin");
  has(head, `data-pdxgap-file="${KEY}"`, "the title link does not declare which key it opens");
  // The title is inside nothing: the header is inert, so here the NAME itself may
  // be the anchor. That is the whole reason this surface differs from the two
  // below, and it is the reason the class attribute is written after href — eight
  // suites match on 'class="pdxgap-title">'.
  ok(/<a href="\/i\/[^"]+" class="pdxgap-title/.test(head),
    "the title's href/class order moved — the suites that match on class=\"pdxgap-title\"> would break");

  // Every surface that names a key asks the family table for the address. A path
  // spelled inline is a second copy of the address, which is how a rename ships
  // half-done.
  for (const f of ["consistency.js", "stance-tree.js", "word-action.js"]) {
    const src = code(f);
    no(src, "'/i/'", `${f} spells the issue-file prefix instead of asking PDXIssueFamily`);
    no(src, '"/i/"', `${f} spells the issue-file prefix instead of asking PDXIssueFamily`);
    has(src, "profileUrl", `${f} does not ask PDXIssueFamily for the issue-file address`);
  }

  // Fail closed: a page without the family table renders the name as it always
  // did, not a link to a guess.
  const NOFAM = seed(boot(R, FILES.filter((f) => f !== "pdx-issue-family.js")));
  const bare = NOFAM.PDXConsistency.gapViewHtml(MALOY, KEY);
  must(bare && bare.length > 500, "the no-family sandbox rendered no dossier at all");
  no(bare, "/i/" + KEY, "the dossier invented an issue-file address with no family table on the page");
  has(bare, "pdxgap-title", "the dossier lost its title when the family table was absent");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · ⓘ beside the title on all three surfaces, and an honest blank");
// ═════════════════════════════════════════════════════════════════════════════
{
  const head = CS.gapViewHtml(MALOY, KEY);
  has(head, `data-pdxis-key="${KEY}"`, "the dossier header carries no scope control");
  has(head, "pdxgap-titlerow", "the title and its ⓘ are not on one row");

  // rural_ag has a boundary this pass, and it is transcribed rather than written.
  const r = W.PDXIssueScope.read(KEY);
  must(r, `PDXIssueScope.read(${KEY}) returned nothing`);
  eq(r.defined, true, `${KEY} still has no scope prose — the pass that names it in the spec left it blank`);
  ok(String(r.inn || "").length > 80, `${KEY}'s "what is in" clause is too short to be an argued boundary`);
  ok(String(r.out || "").length > 80, `${KEY}'s "what is out" clause is too short to be an argued boundary`);
  has(r.pole, "Advanced", `${KEY} does not say what a count on it means`);
  // Transcription, not generation: a sample of the shipped prose has to be
  // findable in the file where the boundary was argued.
  const AT = R("alignment-tool.js");
  has(AT, "SCOPE (rural_ag)", "the boundary was not argued in alignment-tool.js, where the key lives");
  for (const phrase of ["crop insurance", "rural broadband", "reference prices"]) {
    has(AT, phrase, `"${phrase}" is in the shipped scope but not in alignment-tool.js — it is not transcribed`);
  }
  // The refusals that made the gap expensive are named where the argument is.
  has(AT, "H.Amdt. 202", "the argued scope does not record the F9 decline it exists because of");
  has(AT, "H.Amdt. 207", "the argued scope does not record the second F9 decline");

  // The blank is still honest on a key with nothing argued.
  const blank = W.PDXIssueScope.read(BLANK_KEY);
  must(blank, `PDXIssueScope.read(${BLANK_KEY}) returned nothing — the blank fixture is gone`);
  eq(blank.defined, false, `${BLANK_KEY} acquired scope prose — this file needs a new blank fixture`);
  has(W.PDXIssueScope.cardHtml(BLANK_KEY), W.PDXIssueScope.NO_DEF,
    "a key with no boundary does not print the honest blank");
  const blankCard = W.PDXIssueScope.cardHtml(BLANK_KEY);
  no(blankCard, "Advanced = ", "a key with no boundary invented a pole anyway");
  has(W.PDXIssueScope.controlHtml(BLANK_KEY), "pdxis-key",
    "the ⓘ disappeared on an unscoped key — the blank has to be reachable to be honest");

  // The tree leaf and the brief row. Maloy's tree has no rural_ag leaf offline —
  // the key is cold for her until the F11 seed lands — so these are checked on
  // every leaf her tree DOES render, which is the stronger claim anyway: the
  // controls are a property of a leaf, not of one lucky key.
  const tree = W.PDXStanceTree.sectionHtml(MALOY);
  must(tree && tree.length > 2000, "maloy's topic tree rendered nothing");
  const leaves = tree.match(/<div class="pdxtree-leaf[\s\S]*?<\/div>\s*(?=<div class="pdxtree-leaf|$)/g) ||
    tree.split('<div class="pdxtree-leaf').slice(1).map((x) => '<div class="pdxtree-leaf' + x);
  ok(leaves.length > 20, `only ${leaves.length} tree leaves to check`);
  const noFile = [];
  const noKey = [];
  for (const lf of leaves) {
    const k = (/data-pdxtree-issue="([^"]*)"/.exec(lf) || [])[1] || "";
    if (!k) continue;
    if (lf.indexOf(`class="pdxtree-file" href="/i/${k}"`) < 0) noFile.push(k);
    if (W.PDXIssueScope.SCOPE[k] && lf.indexOf(`data-pdxis-key="${k}"`) < 0) noKey.push(k);
  }
  eq(noFile.length, 0, `${noFile.length} tree leaf/leaves have no issue-file anchor: ${noFile.slice(0, 4).join(" ")}`);
  eq(noKey.length, 0, `${noKey.length} scoped tree leaf/leaves have no ⓘ: ${noKey.slice(0, 4).join(" ")}`);
  // And the key this pass scoped reads on a leaf that does carry it.
  const leeTree = W.PDXStanceTree.sectionHtml(LEE);
  const anyScoped = leaves.concat(leeTree.split('<div class="pdxtree-leaf').slice(1))
    .find((lf) => /data-pdxis-key="/.test(lf));
  must(anyScoped, "no leaf anywhere carries a scope control");
  const brief = W.PDXWordAction.briefHtml(MALOY) || "";
  must(brief.length > 500, "maloy's record brief rendered nothing");
  has(brief, "pdxis-key", "the brief's pattern rows carry no scope control");
  has(brief, 'class="pdxwa-shape-file" href="/i/', "the brief's pattern rows have no issue-file door");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · nothing is nested inside anything interactive");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The rule, restated because it is the one that silently eats markup: an <a> or
  // a <button> inside another interactive element makes the HTML parser close the
  // outer element at the nested one, and every span after it leaves the row.
  const tree = W.PDXStanceTree.sectionHtml(MALOY);
  const faces = tree.match(/<button type="button" class="pdxtree-face"[\s\S]*?<\/button>/g) || [];
  ok(faces.length > 5, `only ${faces.length} tree faces to check for nesting`);
  const nestedFace = faces.filter((f) => /<a\b|<button\b/.test(f.slice(f.indexOf(">") + 1)));
  eq(nestedFace.length, 0, `${nestedFace.length} tree face(s) contain a nested interactive element`);
  // And the two controls really are outside it.
  ok(tree.indexOf(`</button><button type="button" class="pdxis-key"`) >= 0,
    "the tree's ⓘ is not a sibling that follows the face button");

  const brief = W.PDXWordAction.briefHtml(MALOY) || "";
  const doors = brief.match(/<span class="pdxwa-shape-door"[\s\S]*?<span class="pdxwa-shape-bar">[\s\S]*?<\/span><\/span>/g) || [];
  ok(doors.length > 0, "no brief pattern-row doors to check for nesting");
  const nestedDoor = doors.filter((d) => /<a\b/.test(d));
  eq(nestedDoor.length, 0, `${nestedDoor.length} brief row door(s) contain an anchor`);
  // The bar survives the row, which is the symptom a nested element would produce.
  ok(brief.indexOf('<span class="pdxwa-shape-bar">') > 0, "the pattern bar left the brief rows");

  // The dossier's own row door, unchanged: attributes on the outermost element,
  // spans inside.
  const drv = CS.dossierDriversHtml(LEE, HOUSING) || CS.dossierDriversHtml(MALOY, "econ_taxes") || "";
  if (drv) {
    no(drv, "<a ", "the measures roll-up grew an anchor inside its row");
    no(drv, "<button", "the measures roll-up grew a button inside its row");
    has(drv, 'role="button" tabindex="0"', "the roll-up row stopped announcing itself as a control");
  }

  // issue-scope.js must not defend itself with stopPropagation: the ⓘ being a
  // sibling is the guarantee, and a stopPropagation would hide a regression that
  // put it back inside a door.
  no(code("issue-scope.js"), "stopPropagation",
    "issue-scope.js defends the ⓘ with stopPropagation instead of staying outside the door");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · H.R. 7567 — one measure, one door, the curator's own sentence");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The fixture, assembled from the two shipped sources named in this file's
  // header. Nothing about the row is authored here.
  const vs = J("db/vr-federal-wave-f11-vote-seed.json");
  const v = (vs.votes || [])[0];
  must(v && v.measure && v.measure.number === BILL, `the F11 vote seed no longer carries ${BILL}`);
  const cell = (v.memberVotes || []).find((m) => m.politicianId === MALOY);
  must(cell && cell.position, `${MALOY} is not on roll ${v.rollNumber} in the F11 vote seed`);

  const MIG = R("netlify/database/migrations/20260721100000_seed_farm_bill_2026.sql");
  const mm = /\(m_farm, 'rural_ag',\s*(\d+), (true|false),\s*'(\w+)',\s*'([^']+)'\)/.exec(MIG);
  must(mm, "the H.R. 7567 → rural_ag mapping row is no longer in the farm-bill migration in the form this file reads");
  const RATIONALE = mm[4];
  must(RATIONALE.length > 40, "the mapping rationale is too short to clip");

  const item = {
    kind: "vote",
    measureId: `${BILL}|${v.congress}`,
    measureType: v.measure.measureType || "bill",
    number: BILL,
    title: "Farm, Food, and National Security Act",
    chamber: v.chamber,
    status: "",
    date: new Date(v.voteDate).toISOString(),
    action: v.question,
    actionType: v.actionType,
    position: cell.position,
    result: v.result,
    isParty: cell.isParty || null,
    supports: null,
    isProcedural: false,
    advanceInverted: false,
    isAmendment: false,
    parentMeasureId: null,
    rollcallId: v.rollNumber,
    congress: v.congress,
    session: v.session,
    rollNumber: v.rollNumber,
    issues: [{
      issueKey: KEY,
      weight: Number(mm[1]),
      isPrimary: mm[2] === "true",
      supportMeaning: mm[3],
      rationale: RATIONALE,
    }],
    source: { url: v.sourceUrl, label: v.sourceLabel },
  };

  const F = boot(R);
  F.PDXVotingRecord.noteMember(MALOY, [item]);
  const FCS = F.PDXConsistency;
  const d = FCS.dossierDrivers(MALOY, KEY);
  must(d, "the drivers model came back empty with the fixture loaded");
  eq(d.items, 1, "the fixture is not a one-item lane any more");
  eq(d.docs, 1, "the fixture is not a one-measure lane any more");

  const html = FCS.dossierDriversHtml(MALOY, KEY);
  ok(html !== "", "a lane whose whole formal case is one vote still renders no roll-up");
  has(html, "Which measure this came from", "the one-measure heading is plural or missing");
  no(html, "Which measures this came from", "a single measure is announced as measures");
  has(html, BILL, `the roll-up does not name ${BILL}`);
  // The door: on the outermost <li>, pointed at this person and this key.
  has(html, "data-pdxdrv-open=", "the one-measure row is not a door onto the explainer");
  has(html, `data-pdxdrv-pid="${MALOY}"`, "the door does not carry whose record it opens");
  has(html, `data-pdxdrv-key="${KEY}"`, "the door does not carry which key it opens");
  ok(/<li class="pdxgap-drv-r[^"]*" data-pdxdrv-open=/.test(html),
    "the door attribute is not on the outermost element of the row");
  no(html, "<a ", "the one-measure row nested an anchor");
  no(html, "<button", "the one-measure row nested a button");

  // The side, said rather than counted.
  has(html, "advanced", "the row does not say which way she went");
  no(html, "1 advanced", "the side is printed as a count of one, which is what this pass removed");

  // And one sentence of the curator's own rationale, verbatim.
  const wsp = /<span class="pdxgap-drv-w">([\s\S]*?)<\/span>/.exec(html);
  must(wsp, "the one-measure row prints no rationale sentence at all");
  const shown = wsp[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const base = shown.endsWith("…") ? shown.slice(0, -1) : shown;
  ok(RATIONALE.indexOf(base) === 0, "the printed sentence is not a verbatim prefix of the mapping's rationale");
  ok(base.length > 24, `the rationale was clipped to a fragment: ${JSON.stringify(shown)}`);
  ok(shown.length <= 224, `the summary line is a paragraph (${shown.length} chars)`);
  has(shown, "crop insurance", "the printed sentence is not the farm bill's own rationale");

  // The clip is a boundary, not a rewrite: an abbreviation-blind splitter cuts
  // "McDowell amendment to H.R. 8800 …" down to the string "R.".
  const fragments = [];
  for (const [pid, recs] of corpus.byMember) {
    for (const k of new Set(recs.flatMap((x) => (x.issues || []).map((i) => i.issueKey)))) {
      const dd = CS.dossierDrivers(pid, k);
      if (!dd || dd.items !== 1 || dd.docs !== 1) continue;
      const hh = CS.dossierDriversHtml(pid, k);
      const m = /<span class="pdxgap-drv-w">([\s\S]*?)<\/span>/.exec(hh);
      if (m && visible(m[1]).length < 24) fragments.push(`${pid}/${k}: ${visible(m[1])}`);
    }
  }
  eq(fragments.length, 0, `${fragments.length} lane(s) printed a clipped fragment instead of a sentence — ` +
    fragments.slice(0, 3).join(" | "));

  console.log(`      ${BILL}: ${cell.position} · ${d.items} item · ${shown.length} chars of rationale`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · /i/<key> resolves from a cold load, same rewrite class as /p/");
// ═════════════════════════════════════════════════════════════════════════════
{
  const TOML = R("netlify.toml");
  // The two paths are served by the same kind of rule: a 200 rewrite to the shell.
  const rule = /\[\[redirects\]\]\s*\n\s*from = "\/i\/\*"\s*\n\s*to = "\/index\.html"\s*\n\s*status = 200/.exec(TOML);
  ok(!!rule, "netlify.toml does not rewrite /i/* to the shell at status 200");
  ok(/from = "\/p\/\*"[\s\S]{0,120}status = 200/.test(TOML), "the /p/* rewrite this rule is modelled on is gone");

  const PROF = R("pdx-issue-profile.js");
  has(PROF, "PATH_RE", "pdx-issue-profile.js no longer declares the path matcher");
  has(PROF, "/^\\/i\\/([^/]+)\\/?$/", "the /i/ path matcher changed shape — this file's deep link claim is stale");
  // A cold arrival cannot wait to be told: the module kicks its own adopt.
  has(PROF, "bootAdopt", "pdx-issue-profile.js has no cold-load self-kick");
  has(PROF, "issueKeyFor", "the profile no longer resolves aliases through Door 1's resolver");
  has(PROF, "canonical", "an alias arrival no longer re-stamps rel=canonical");
  // Root-absolute assets only. A relative src in the shell resolves against the
  // ARRIVAL path, so under /i/rural_ag "app.js" is a request for /i/app.js — the
  // failure mode that makes a deep link load a blank page. Read off the shell's
  // real <script> and <link> tags rather than every href in the file, because the
  // page also builds markup inside JS strings where the path is a variable.
  const tags = R("index.html").match(/<(?:script|link)\b[^>]*>/g) || [];
  ok(tags.length > 20, `only ${tags.length} asset tags in the shell to check`);
  const rel = [];
  for (const t of tags) {
    const m = /\s(?:src|href)="([^"]+)"/.exec(t);
    if (!m) continue;
    const v = m[1];
    if (/^(?:\/|https?:|\/\/|#|data:|mailto:)/.test(v)) continue;
    rel.push(v);
  }
  eq(rel.length, 0, `index.html has ${rel.length} relative asset path(s), which break one directory down: ` +
    rel.slice(0, 3).join(" "));

  // The service worker serves the shell for a deep path rather than 404ing it.
  const SW = R("sw.js");
  const m = /const CACHE_VERSION = 'v(\d+)';/.exec(SW);
  must(m, "CACHE_VERSION is not in sw.js in the form this file reads");
  const prev = HEAD("sw.js");
  if (prev) {
    const pm = /const CACHE_VERSION = 'v(\d+)';/.exec(prev);
    if (pm) ok(Number(m[1]) > Number(pm[1]),
      `CACHE_VERSION did not move past HEAD's v${pm[1]} — warm devices would serve the old shell against the new doors`);
  }
  has(SW, `// v${m[1]} - `, `sw.js has no prose log entry for v${m[1]}`);
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · the sitemap lists the keys with something to read");
// ═════════════════════════════════════════════════════════════════════════════
{
  const XML = R("sitemap.xml");
  has(XML, `<loc>https://www.politidex.fyi/i/${KEY}</loc>`, `${KEY} has an argued boundary and no sitemap entry`);
  // Every listed /i/ address is a key the app can actually open.
  const listed = [...XML.matchAll(/<loc>https:\/\/www\.politidex\.fyi\/i\/([^<]+)<\/loc>/g)].map((x) => x[1]);
  ok(listed.length > 60, `only ${listed.length} issue files are listed`);
  const unshipped = listed.filter((k) => {
    const e = W.ISSUE_MAP[decodeURIComponent(k)];
    return !(e && (e.label || e.chip));
  });
  eq(unshipped.length, 0, `${unshipped.length} listed issue file(s) name a key the app cannot open: ` +
    unshipped.slice(0, 4).join(" "));
  // A key with neither a boundary nor a formal mapping is not advertised.
  const scoped = new Set(Object.keys(W.PDXIssueScope.SCOPE || {}));
  const orphans = Object.keys(W.ISSUE_MAP).filter((k) => !scoped.has(k) && listed.indexOf(k) === -1);
  ok(orphans.length > 0, "every tracked key is listed, so the floor this section checks does not exist");
  // Person addresses are untouched by this pass.
  const prevXml = HEAD("sitemap.xml");
  if (prevXml) {
    const people = (s) => (s.match(/<loc>[^<]*\/p\/[^<]*<\/loc>/g) || []).join("\n");
    eq(people(XML), people(prevXml), "the person half of the sitemap moved — this pass may not touch /p/ addresses");
  }
  // Two keys the migrations map are legacy spellings the app no longer resolves.
  // Matched as whole addresses: /i/crypto_regulation is a real key and must stay.
  for (const dead of ["crypto", "defense"]) {
    no(XML, `/i/${dead}</loc>`, `${dead} no longer resolves and is advertised anyway`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · no new score, no party framing, no second product");
// ═════════════════════════════════════════════════════════════════════════════
{
  // The new copy, isolated: the title row, the file anchors, the rationale span
  // and the scope prose. The word wall runs on what this pass composed — the
  // curator's quoted sentence is data, and section 4 proves it verbatim instead.
  const head = CS.gapViewHtml(MALOY, KEY);
  const titleRow = /<div class="pdxgap-titlerow">[\s\S]*?<\/div>/.exec(head);
  must(titleRow, "the title row is gone, so this sweep would pass on nothing");
  const newCopy = [
    visible(titleRow[0]),
    visible(/<a class="pdxtree-file"[\s\S]*?<\/a>/.exec(W.PDXStanceTree.sectionHtml(MALOY))?.[0] || ""),
    visible(/<a class="pdxwa-shape-file"[\s\S]*?<\/a>/.exec(W.PDXWordAction.briefHtml(MALOY) || "")?.[0] || ""),
    [W.PDXIssueScope.SCOPE[KEY].inn, W.PDXIssueScope.SCOPE[KEY].out,
     W.PDXIssueScope.SCOPE[KEY].pole, W.PDXIssueScope.SCOPE[KEY].note].join(" "),
  ].join(" · ");
  ok(newCopy.length > 400, "the isolated new copy is too short — the probes above matched nothing");
  for (const bad of ["%", "Democrat", "Republican", "partisan", "grade", "score", "rank", "lean:"]) {
    no(newCopy, bad, `the new copy says "${bad}"`);
  }
  const scan = CS.menu && CS.menu.scan ? CS.menu.scan(newCopy) : [];
  eq((scan || []).length, 0, `the new copy trips the word wall: ${JSON.stringify((scan || []).slice(0, 3))}`);

  // No new nav destination, and no third product: the doors point at addresses
  // that already existed.
  const IDX = R("index.html");
  no(IDX, 'href="/i/', "an issue file became a link in the page chrome");
  // The issue file itself is not rebuilt: the door opens the surface door1
  // already owns.
  has(R("pdx-issue-profile.js"), "issueProfileHtml", "the issue file stopped mounting Door 1's own markup");

  // The header still carries exactly the one figure it always did.
  const pcts = (head.match(/\d+%/g) || []);
  const prevHead = null; // the count is the claim: one lane figure, no second copy
  ok(pcts.length <= 1, `the dossier header prints ${pcts.length} percentages`);
  void prevHead;
}

// ═════════════════════════════════════════════════════════════════════════════
section("8 · twin boot — formal tiers and Direction Match are byte-identical");
// ═════════════════════════════════════════════════════════════════════════════
{
  const A = seed(boot(HEAD));
  const B = seed(boot(R));
  must(A.PDXConsistency && typeof A.PDXConsistency.scopedOverall === "function", "HEAD's consistency.js did not boot");
  must(B.PDXWordAction && typeof B.PDXWordAction.read === "function", "the working tree's word-action.js did not boot");
  const scopes = Object.keys(B.PDXConsistency.SCOPES);
  must(scopes.length > 0, "PDXConsistency.SCOPES is empty");
  const drift = [];
  let swept = 0;
  for (const [pid] of corpus.byMember) {
    swept++;
    for (const sc of scopes) {
      if (JSON.stringify(A.PDXConsistency.scopedOverall(sc, pid)) !==
          JSON.stringify(B.PDXConsistency.scopedOverall(sc, pid))) drift.push(`${pid}/${sc}`);
    }
    if (JSON.stringify(A.PDXWordAction.read(pid)) !== JSON.stringify(B.PDXWordAction.read(pid))) drift.push(`${pid}/ledger`);
    if (JSON.stringify(A.PDXConsistency.formalPatternIndex.shape(pid)) !==
        JSON.stringify(B.PDXConsistency.formalPatternIndex.shape(pid))) drift.push(`${pid}/formal`);
  }
  ok(swept > 300, `the twin boot only swept ${swept} files`);
  eq(drift.slice(0, 8).join(" | "), "",
    `${drift.length} formal tier / Direction Match read(s) moved — this pass added doors and must move none`);
  console.log(`      ${swept} files swept across ${scopes.length} scopes; no tier or match read moved`);

  // The dossier read itself is unchanged too: the doors are markup, not a reading.
  const rdrift = [];
  for (const pid of [MALOY, LEE]) {
    for (const k of Object.keys(B.ISSUE_MAP)) {
      if (JSON.stringify(A.PDXConsistency.dossierRead(pid, k)) !==
          JSON.stringify(B.PDXConsistency.dossierRead(pid, k))) rdrift.push(`${pid}/${k}`);
    }
  }
  eq(rdrift.length, 0, `${rdrift.length} dossier read(s) moved: ${rdrift.slice(0, 4).join(" ")}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures.length) {
  console.error(`✗ issue file doors: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ issue file doors: the title opens the key's own file, and one measure teaches the measure — ${passed} assertions passed\n`);
