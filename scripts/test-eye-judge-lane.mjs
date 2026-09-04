#!/usr/bin/env node
/**
 * test-eye-judge-lane.mjs — the Eye finds a judge, and calls her nothing else
 * ─────────────────────────────────────────────────────────────────────────────
 * A judge file is complete and addressable — /p/jill_pohlman renders a
 * letterhead, a retention question, a JPEC line, a seat, an honest empty formal
 * record and a prior-retention history — and until this lane existed the only
 * door to it was the Door 2 ballot band, on a ballot page, for a voter whose
 * county the map could place. Typing "Pohlman" into the All-Seeing Eye said the
 * eye finds nothing, because the Eye's people haystack is the union of CMP_DATA
 * and PROFILES and judges are deliberately in neither.
 *
 * Deliberately, because the alternative is worse. A judge inside CMP_DATA is a
 * judge inside Direction Match, inside Word vs Action, inside a formal-pattern
 * tier and inside a publication floor — a yes/no on one name, scored as though
 * it were a voting record. So the fix is a lane, not a tenancy, and this file
 * pins the difference:
 *
 *   1. THE NAME IS FINDABLE. "Pohlman" ranks exactly one judge row, it is Jill
 *      M. Pohlman's, and its address is /p/jill_pohlman. "Rawson" ranks a
 *      district judge. Court, unit and pid are all searchable, so a reader who
 *      knows the seat and not the name still arrives.
 *   2. THE ROW IS NOT A RECORD. No party chip, no Direction Match percentage,
 *      no Word-vs-Action ring, no formal-act count, no coverage badge, no
 *      consistency tier, no action strip, no "thin voting record" — and
 *      rotating every party letter in the roster does not move the list.
 *   3. A JUDGE IS NOT A LEGISLATOR MISS. On a judge-only query the Formal,
 *      Public and Mandate counts are all 0 and the panel still does not say the
 *      eye finds nothing. Those two facts together are the whole point: "no
 *      legislative record here" is true, "nothing found" was not.
 *   4. THE COUNT ENTERS NO DENOMINATOR. The same legislative queries are run on
 *      an Eye that indexes the judiciary and on one that indexes none; the
 *      Formal, Public and Mandate counts and the painted legislative rows are
 *      identical either way. This is the twin boot.
 *   5. NO PHANTOM JURISDICTION. "Ohio" ranks no judge. The registry is Utah's
 *      and the subsequence fallback is not allowed to invent a local bench.
 *   6. THE RETENTION FACT IS NOT THE EYE'S TO GUESS. The status strings come
 *      from judicial-retention.js's own locked SEARCH vocabulary, the Eye
 *      hardcodes no judge and no court, and none of the banned political
 *      vocabulary reaches a row.
 *   7. THE DOOR IS THE INTERCEPT THAT ALREADY EXISTS. The navigate arm hands the
 *      pid to PDXPerson.open, which judge-file.js's openModal wrapper answers.
 *      No second renderer, no new global.
 *
 * Real shipped modules in a node:vm sandbox: the real roster, the real
 * ISSUE_MAP, the real 126-judge registry. No fixtures.
 *
 *   node scripts/test-eye-judge-lane.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const EYE_SRC = R("all-seeing-eye.js");
const RET_SRC = R("judicial-retention.js");
const JF_SRC = R("judge-file.js");
const FB_SRC = R("firebase-boot.js");
const INDEX_SRC = R("index.html");
const CMP_SRC = R("cmp-data.js");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
const no = (hay, needle, msg) => ok(!String(hay).includes(needle), `${msg} — found ${JSON.stringify(needle)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ eye judge lane: STALE HARNESS — ${msg}`);
  process.exit(2);
};

// The two judges the spec names, and the seats they sit on. Spelled out here so
// a registry that renames or drops them fails loudly instead of quietly making
// every claim below vacuous.
const POHLMAN = { pid: "jill_pohlman", name: "Jill M. Pohlman", court: "Utah Supreme Court" };
const RAWSON = { pid: "blaine_rawson", name: "E. Blaine Rawson", court: "Utah District Court" };

// ── boot ────────────────────────────────────────────────────────────────────
function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {},
    classList: {
      add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c),
    },
    setAttribute(k, v) { n._attrs[k] = String(v); },
    getAttribute(k) { return k in n._attrs ? n._attrs[k] : null; },
    removeAttribute(k) { delete n._attrs[k]; },
    focus() {}, blur() {}, scrollIntoView() {}, click() {},
    addEventListener() {}, removeEventListener() {}, remove() {},
    appendChild: (c) => c, insertBefore: (c) => c, insertAdjacentHTML() {},
    querySelector: () => null, querySelectorAll: () => [], closest: () => null, contains: () => true,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 320, height: 44, bottom: 44, right: 320 }),
  };
  return n;
}

// `noJudicial` is the twin: the same Eye, booted without the judicial registry,
// which is also exactly what the live page looks like for the moment between the
// Eye's sync <script> and the deferred judicial files arriving.
function boot(opts) {
  opts = opts || {};
  const win = makeSandbox();
  const panel = stubNode(), input = stubNode(), eye = stubNode(), clear = stubNode();
  input.tagName = "TEXTAREA";
  const ids = { "pdx-eye-panel": panel, "pdx-eye-input": input, "pdx-eye": eye, "pdx-eye-clear": clear };
  win.document.getElementById = (id) => ids[id] || null;
  win.history = { replaceState() {}, pushState() {} };
  const ctx = vm.createContext(win);
  const files = [...ENGINE_FILES, "pdx-issue-family.js", "issue-colors.js", "person-link.js"];
  if (!opts.noJudicial) files.push("judicial-data.js", "judicial-retention.js");
  for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
  win.PROFILES = win.CMP_DATA;
  if (opts.party) {
    const rot = { R: "D", D: "I", I: "R" };
    const swapped = {};
    for (const [id, rec] of Object.entries(win.CMP_DATA || {})) {
      const p = String((rec && rec.party) || "").trim().charAt(0).toUpperCase();
      swapped[id] = { ...rec, party: rot[p] || rec.party };
    }
    win.CMP_DATA = swapped;
    win.PROFILES = swapped;
  }
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  vm.runInContext(EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  must(typeof win.PDXEye.lane === "function", "PDXEye.lane() is not published");
  return {
    win, panel, input,
    lane(m) { return win.PDXEye.lane(m); },
    search(q) {
      eye.classList.add("is-open");
      input.value = q;
      win.PDXEye.rebuild();
      win.PDXEye.render(q);
      return panel.innerHTML || "";
    },
  };
}

const CATS = (html) => [...String(html).matchAll(/data-cat="([^"]+)"/g)].map((m) => m[1]);
function catSlice(html, cat) {
  const s = String(html);
  const at = s.indexOf(`data-cat="${cat}"`);
  if (at === -1) return "";
  const next = s.indexOf('data-cat="', at + 10);
  return next === -1 ? s.slice(at) : s.slice(at, next);
}
const ROWS = (html) =>
  [...String(html).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="([^"]+)"(?:\s+data-(?:key|id|slug|number)="([^"]*)")?/g)]
    .map((m) => ({ kind: m[1], key: m[2] || "" }));
const laneCount = (html, id) => {
  const m = String(html).match(
    new RegExp(`data-eye-lane="${id}"[^>]*>.*?<span class="pdx-eye-lane-n">(\\d+)</span>`)
  );
  return m ? Number(m[1]) : null;
};
// Every judge row's pid, in painted order. Read off the row's own class so a
// chip inside some other row can never be counted as a judge.
// The query is wrapped in <mark> inside the name, so a claim about the text a
// reader sees has to be made against the de-marked string.
const TEXT = (html) => String(html).replace(/<\/?mark>/g, "");
const JUDGE_PIDS = (html) =>
  [...String(html).matchAll(/class="pdx-eye-item pdx-eye-item--judge"[^>]*?data-id="([^"]*)"/g)].map((m) => m[1]);

// ── harness self-checks ─────────────────────────────────────────────────────
const probe = boot();
must(probe.win.PDXJudicial && typeof probe.win.PDXJudicial.searchRows === "function",
  "PDXJudicial.searchRows() is not published — the lane has no source");
const SROWS = probe.win.PDXJudicial.searchRows();
must(SROWS.length > 100, `searchRows() returned ${SROWS.length} rows — the registry did not load`);
for (const j of [POHLMAN, RAWSON]) {
  const r = SROWS.find((x) => x.pid === j.pid);
  must(r, `${j.pid} is not in the registry — this file names a judge who does not exist`);
  must(r.name === j.name, `${j.pid} is now named ${JSON.stringify(r.name)}, not ${JSON.stringify(j.name)}`);
  must(r.court === j.court, `${j.pid} now sits on ${JSON.stringify(r.court)}, not ${JSON.stringify(j.court)}`);
}
must(!probe.win.CMP_DATA[POHLMAN.pid] && !probe.win.PROFILES[POHLMAN.pid],
  "a judge is in CMP_DATA/PROFILES — the whole premise of this lane is gone");
must(JUDGE_PIDS(probe.search("Pohlman")).length > 0,
  "the judge-row extractor found nothing for 'Pohlman' — every claim below is vacuous");
must(probe.win.PDXPersonLink && typeof probe.win.PDXPersonLink.attrs === "function",
  "PDXPersonLink.attrs() is unavailable — the row cannot advertise an address");
// The legislative queries the twin boot is measured on. Chosen to hit both
// lanes and to have nothing to do with a court.
const LEG_QUERIES = ["Lee", "climate", "Curtis", "water", "housing"];
{
  const t = boot({ noJudicial: true });
  must(SROWS.length > 0, "no judge rows to compare against");
  for (const q of LEG_QUERIES) {
    t.lane("formal");
    must(ROWS(t.search(q)).length > 0,
      `the judge-free Eye answered nothing for ${JSON.stringify(q)} — the twin has nothing to be identical to`);
  }
}

console.log("⚖ eye judge lane — a seat on a ballot, not a voting record");

// ── 1 · the name is findable, and it opens the file ─────────────────────────
section("1 · Pohlman, Rawson, and the address each row advertises");
{
  const B = boot();
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    const html = B.search("Pohlman");
    const pids = JUDGE_PIDS(html);
    eq(pids.length, 1, `${mode} lane: "Pohlman" did not rank exactly one judge`);
    eq(pids[0], POHLMAN.pid, `${mode} lane: "Pohlman" ranked the wrong judge`);
    has(html, `href="/p/${POHLMAN.pid}"`, `${mode} lane: the Pohlman row advertises no /p/ address`);
    const slice = TEXT(catSlice(html, "judge"));
    has(slice, POHLMAN.name, `${mode} lane: the row does not print her name`);
    has(slice, POHLMAN.court, `${mode} lane: the row does not print her court`);
    has(slice, "retention election", `${mode} lane: the row does not say she is on a retention ballot`);
    no(html, "the eye finds nothing", `${mode} lane: a found judge was reported as nothing found`);
  }
  // A district judge, whose row has to carry the district as well as the court.
  B.lane("formal");
  const rh = B.search("Rawson");
  const rp = JUDGE_PIDS(rh);
  ok(rp.includes(RAWSON.pid), `"Rawson" did not rank ${RAWSON.pid}`);
  const rslice = TEXT(catSlice(rh, "judge"));
  has(rslice, RAWSON.court, "the Rawson row does not print the district court");
  has(rslice, "Second Judicial District", "the Rawson row does not print which district");
  has(rh, `href="/p/${RAWSON.pid}"`, "the Rawson row advertises no /p/ address");
  // COURT, UNIT AND PID ARE SEARCHABLE, not just the name. A reader who knows
  // the seat and not the name still gets there.
  for (const q of ["Utah Supreme Court", "Second Judicial District", POHLMAN.pid, "retention"]) {
    B.lane("formal");
    ok(JUDGE_PIDS(B.search(q)).length > 0, `nothing judicial ranked for ${JSON.stringify(q)}`);
  }
  ok(JUDGE_PIDS(B.search("Utah Supreme Court")).includes(POHLMAN.pid),
    "searching the court did not surface a justice who sits on it");
}

// ── 2 · the row is not a record ─────────────────────────────────────────────
section("2 · no party, no score, no ring, no strip, no 'thin record'");
{
  const B = boot();
  const BANNED_ON_A_ROW = [
    "pdx-eye-tag",            // the party chip
    "pdx-eye-wa",             // the word-vs-action ring
    "pdx-eye-actions",        // add to my team / compare / share
    "pdx-eye-rel",            // the cross-link chips
    "data-pdx-eye-saved",     // savable, i.e. rosterable
    "thin voting record",
    "Direction Match",
    "formal acts",
    "backs it up",
  ];
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    for (const q of ["Pohlman", "Rawson", "Utah Supreme Court"]) {
      const slice = catSlice(B.search(q), "judge");
      ok(slice.length > 0, `${mode}/${q}: no judge group to inspect`);
      for (const bad of BANNED_ON_A_ROW) {
        no(slice, bad, `${mode}/${q}: a judge row carries ${JSON.stringify(bad)}`);
      }
      // No percentage and no bare party letter anywhere in the group.
      ok(!/\d+%/.test(slice), `${mode}/${q}: a judge row printed a percentage`);
      ok(!/>\s*[RDI]\s*</.test(slice), `${mode}/${q}: a judge row printed a party letter`);
      // No photo: a retention question is about a seat, and a face invites the
      // candidate-card reading this lane exists to refuse.
      no(slice, "<img", `${mode}/${q}: a judge row printed a photo`);
    }
  }
  // AND THE LIST DOES NOT MOVE WHEN THE ROSTER'S PARTIES ROTATE.
  const straight = boot(); straight.lane("formal");
  const rotated = boot({ party: true }); rotated.lane("formal");
  for (const q of ["Pohlman", "Rawson"]) {
    eq(JUDGE_PIDS(rotated.search(q)).join("|"), JUDGE_PIDS(straight.search(q)).join("|"),
      `rotating every party letter changed the judge rows for ${JSON.stringify(q)}`);
  }
  // The renderer never asks the three badge engines for a judge. Read off the
  // source, because a missing engine in the sandbox would hide a live call.
  const jiAt = EYE_SRC.indexOf("function judgeItem(");
  ok(jiAt > 0, "judgeItem() is gone from all-seeing-eye.js");
  const ji = EYE_SRC.slice(jiAt, EYE_SRC.indexOf("\n    }", jiAt));
  for (const engine of ["PDXWordAction", "PDXReceipts", "PDXCoverage", "PDXConsistency",
                        "formalPatternIndex", "partyOf", "photoFor", "actionStrip", "relBlock"]) {
    no(ji, engine, `judgeItem() reaches for ${engine}`);
  }
  // kind: 'judge' is what keeps a judge out of the person-row machinery. If the
  // kind were 'pol' every one of the assertions above would be a coincidence.
  const idxAt = EYE_SRC.indexOf("kind: 'judge'");
  ok(idxAt > 0, "the judge index entry is gone");
  const entry = EYE_SRC.slice(idxAt, idxAt + 900);
  for (const engine of ["CMP_DATA", "PROFILES", "PDXWordAction", "formalPatternIndex", "party"]) {
    no(entry, engine, `the judge index entry reaches for ${engine}`);
  }
}

// ── 3 · a judge is not a legislator miss ────────────────────────────────────
section("3 · Formal 0, Public 0, Mandate 0 — and still an answer");
{
  const B = boot();
  // A query that ranks a judge and nothing else. Pohlman is not in the roster,
  // in ISSUE_MAP, in the bills index or in the spotlights, so every legislative
  // lane genuinely has zero to report.
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    const html = B.search("Pohlman");
    for (const id of ["formal", "public", "mandate"]) {
      eq(laneCount(html, id), 0, `${mode} lane: the ${id} counter counted a judge as its own hit`);
    }
    ok(JUDGE_PIDS(html).length > 0, `${mode} lane: the judge row vanished`);
    no(html, "the eye finds nothing", `${mode} lane: a found judge still reported nothing found`);
    // The group says, once, why a visible row is counted in no lane.
    has(catSlice(html, "judge"), "counted in neither",
      `${mode} lane: the judge group does not say it is counted in no lane`);
  }
  // The judge group is NOT in the mandate lane: a retention seat is not a
  // proposed reform, and the mandate lane's own emptiness must stay honest.
  B.lane("mandate");
  const mh = B.search("Pohlman");
  eq(JUDGE_PIDS(mh).length, 0, "the mandate lane painted a judge row");
  ok(!CATS(mh).includes("judge"), "the mandate lane opened a judge group");
}

// ── 4 · the twin boot ───────────────────────────────────────────────────────
section("4 · legislative search is byte-identical with the lane and without it");
{
  const withJ = boot();
  const without = boot({ noJudicial: true });
  for (const mode of ["formal", "public", "mandate"]) {
    withJ.lane(mode); without.lane(mode);
    for (const q of LEG_QUERIES) {
      const a = withJ.search(q), b = without.search(q);
      for (const id of ["formal", "public", "mandate"]) {
        eq(laneCount(a, id), laneCount(b, id),
          `${mode}/${q}: the ${id} count moved when the judiciary was indexed`);
      }
      // Same legislative rows, same order. Judge rows are excluded from the
      // comparison because they are the thing being added.
      const strip = (h) => ROWS(h).filter((r) => r.kind !== "judge").map((r) => r.kind + ":" + r.key).join("|");
      eq(strip(a), strip(b), `${mode}/${q}: the legislative rows moved when the judiciary was indexed`);
      // And the groups the reader sees are the same set, plus at most 'judge'.
      const extra = CATS(a).filter((c) => c !== "judge");
      eq(extra.join("|"), CATS(b).join("|"), `${mode}/${q}: the groups changed shape`);
    }
  }
  // /p/lee specifically: the spec names it, and it is the query most likely to
  // collide with a judge's surname.
  withJ.lane("formal"); without.lane("formal");
  eq(withJ.search("Lee").replace(/<div class="pdx-eye-cat" data-cat="judge"[\s\S]*?(?=<div class="pdx-eye-cat"|$)/, ""),
     without.search("Lee"),
     "the /p/lee Eye path changed once the judiciary was indexed");
}

// ── 5 · no phantom jurisdiction ─────────────────────────────────────────────
section("5 · Ohio ranks no Utah judge");
{
  const B = boot();
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    for (const q of ["Ohio", "Ohio judge", "Cleveland", "Ohio Supreme Court"]) {
      eq(JUDGE_PIDS(B.search(q)).length, 0, `${mode}/${q}: an out-of-state query invented a local judge`);
    }
  }
  // Not luck: no judge's haystack mentions another state, and the registry says
  // which state it is for.
  eq(String(probe.win.PDX_JUDICIAL.STATE), "Utah", "the judicial registry is no longer Utah's");
  ok(!SROWS.some((r) => /ohio/i.test(JSON.stringify(r))), "a judge row mentions Ohio");
  ok(SROWS.every((r) => /utah|district|juvenile|justice|appeals|supreme/i.test(r.court)),
    "a judge row names a court this registry cannot place");
}

// ── 6 · the retention fact belongs to its owner ─────────────────────────────
section("6 · locked vocabulary, no hardcoded judge, no banned words");
{
  // The three status strings are judicial-retention.js's, not the Eye's.
  has(RET_SRC, "onSlate: 'retention election'", "the on-slate search string is gone from its owner");
  has(RET_SRC, "not on the '", "the off-slate search string is gone from its owner");
  has(RET_SRC, "former: 'no longer on the court'", "the former-judge search string is gone from its owner");
  const V = probe.win.PDXJudicial.SEARCH;
  ok(V && V.onSlate === "retention election", "SEARCH.onSlate is not the locked string");
  ok(V && V.offSlate === "not on the 2026 slate", "SEARCH.offSlate is not the locked string");
  ok(V && V.former === "no longer on the court", "SEARCH.former is not the locked string");
  // Every row's status is one of the three. No fourth phrasing, ever.
  const allowed = new Set([V.onSlate, V.offSlate, V.former]);
  ok(SROWS.every((r) => allowed.has(r.status)),
    "a search row carries a status outside the locked vocabulary");
  ok(SROWS.filter((r) => r.status === V.onSlate).length > 0, "no judge is reported as standing for retention");
  ok(SROWS.filter((r) => r.status === V.offSlate).length > 0, "no judge is reported as off the slate");
  // The Eye names no judge and no court of its own: rename one in the registry
  // and the lane follows, because the lane has no opinions.
  // Comments stripped first: this is a claim about what the lane COMPUTES, and
  // the comments that explain why it computes nothing of its own are allowed to
  // name the judge whose file went unfindable.
  const EYE_CODE = EYE_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  for (const needle of [POHLMAN.pid, POHLMAN.name, RAWSON.pid, RAWSON.name,
                        "Supreme Court", "Judicial District", "retention election"]) {
    no(EYE_CODE, needle, `all-seeing-eye.js hardcodes ${JSON.stringify(needle)}`);
  }
  has(EYE_SRC, "J.searchRows()", "the Eye stopped reading the one retention source");
  // The banned political vocabulary, checked against what a reader actually
  // sees rather than against the source.
  const BANNED = ["activist", "liberal court", "conservative court", "legislating from the bench",
                  "packed", "party-line bench", "swamp"];
  const B = boot();
  for (const mode of ["formal", "public"]) {
    B.lane(mode);
    const slice = catSlice(B.search("Pohlman"), "judge").toLowerCase() +
      catSlice(B.search("Rawson"), "judge").toLowerCase();
    for (const bad of BANNED) no(slice, bad, `a judge row printed banned vocabulary: ${JSON.stringify(bad)}`);
  }
  // AND JUDGES ARE STILL OUT OF THE ARITHMETIC. cmp-data.js is the file the
  // floor, the compare field and Direction Match all read.
  for (const j of [POHLMAN, RAWSON]) {
    no(CMP_SRC, `'${j.pid}'`, `${j.pid} was added to cmp-data.js`);
    no(CMP_SRC, `"${j.pid}"`, `${j.pid} was added to cmp-data.js`);
  }
}

// ── 7 · the door is the intercept that already exists ───────────────────────
section("7 · the row opens the judge file through openModal, not a second path");
{
  const arm = (EYE_SRC.match(/else if \(kind === 'judge'\) \{[\s\S]*?\n      \}/) || [""])[0];
  ok(arm.length > 0, "all-seeing-eye.js has no navigate() arm for a judge row");
  has(arm, "PDXPerson", "the judge row does not hand the pid to the person-file opener");
  has(arm, "showProfile", "the judge row has no fallback opener");
  no(arm, "PDXJudgeFile", "the judge row calls the judge renderer directly, bypassing the intercept");
  // The intercept it relies on is still the single funnel.
  has(JF_SRC, "window.openModal.__jfOpen", "judge-file.js no longer guards its openModal wrapper");
  has(JF_SRC, "if (isJudge(id))", "judge-file.js no longer intercepts a judicial pid");
  // THE ROSTER TOAST. A judge file waits on no roster, so the loading pill is
  // suppressed while a judicial pid is open — and the error pill is not, because
  // that one is a true report about the rest of the app.
  has(FB_SRC, "function _pdxJudicialFileOpen()", "firebase-boot.js lost the judicial check");
  has(FB_SRC, "st === 'loading' && _pdxJudicialFileOpen()",
    "the roster pill no longer asks whether a judge file is open");
  has(FB_SRC, "window._pdxRenderRosterStatus = _pdxRenderRosterStatus",
    "the roster renderer is not exposed for the judge file to re-run");
  has(FB_SRC, "is-error", "the error pill was removed along with the loading pill");
  has(JF_SRC, "window._pdxRenderRosterStatus", "the judge file never re-runs the roster-pill decision");
  // THE COURT STRIP. publicLane() is keyed on the court, so the strip names the
  // court and states the rule above the quotes rather than under them.
  has(JF_SRC, "jf-court-strip", "the public lane was not hoisted into a court strip");
  has(JF_SRC, "About the court", "the court strip does not name what it is about");
  has(JF_SRC, "quoted, never scored", "the court strip dropped the locked note");
  has(JF_SRC, "attached to the court rather than to a judge", "the court strip dropped the attribution line");
  has(JF_SRC, "if (!rows.length) return ''", "the court strip is no longer gated on the court having rows");
  has(R("judicial-retention.css"), ".jf-court-strip", "the court strip has no frame");
  // The row's own styling exists, and it is the neutral one.
  has(INDEX_SRC, ".pdx-eye-item--judge", "the judge row has no spine rule");
  has(INDEX_SRC, ".pdx-eye-cat-note", "the group note has no styling");
  // The index is rebuilt when the deferred registry lands. The Eye is a sync
  // script; without this the first (empty) index is the only one there is.
  has(EYE_SRC, "'J' + judgeRows().length", "the index memo key ignores the judicial registry's arrival");
  // Proof, not inspection: an Eye that memoised past the registry would answer
  // nothing here, because the first rebuild in boot() ran before it existed.
  const late = boot({ noJudicial: true });
  late.lane("formal");
  eq(JUDGE_PIDS(late.search("Pohlman")).length, 0, "a judge ranked on an Eye with no registry");
  no(late.search("Pohlman"), 'data-cat="judge"', "an empty registry still opened a judge group");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ eye judge lane: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ eye judge lane: all ${passed} assertions passed`);
console.log(`  ${SROWS.length} seats indexed · 3 locked statuses · 0 in any lane count · twin boot identical`);
