#!/usr/bin/env node
/**
 * test-judge-status.mjs — a departed judge's file is not a live retention card
 * ─────────────────────────────────────────────────────────────────────────────
 * Diana Hagen left the Utah Supreme Court in May 2026. The All-Seeing Eye said
 * so from the day the judge lane shipped: her row read "no longer on the
 * court". Tapping that row opened /p/diana_hagen, and the top of that file
 * read, in caps, above her name:
 *
 *     UTAH · SUPREME COURT · RETENTION ELECTION
 *
 * One fact, two surfaces, two answers — and the wrong one was the louder. The
 * cause was that they asked different questions. The row asked the Lieutenant
 * Governor's filed list whether it named this seat. The letterhead asked what
 * court the judge sits on, and every judge on this roster sits on a Utah court,
 * so every letterhead promised an election. That was false for ninety-four of
 * the hundred and twenty-six: the one who left, and the ninety-three who sit
 * and are simply not on this year's list.
 *
 * This file pins the repair:
 *
 *   1. ONE READER, THREE SENTENCES. judicial-retention.js's standing() computes
 *      the status once from the filed slate and returns one of exactly three
 *      locked strings. searchRows() reads it rather than re-deriving it, so the
 *      row and the file cannot disagree. There is no fourth status.
 *   2. THE DEPARTED FILE IS NOT A BALLOT CARD. Hagen's rendered file carries no
 *      "retention election" anywhere, no "stands for retention", no November
 *      date, and no "Shall … be retained?" — and her file, her seat history and
 *      her prior retention results all still exist.
 *   3. THE FILED LIST IS UNTOUCHED. Pohlman and Rawson keep the whole hero: the
 *      election eyebrow, the locked phrase, November 3 2026 and the state's own
 *      filed question verbatim.
 *   4. SITTING IS NOT STANDING. All ninety-three sitting judges who are not on
 *      the list get a court-and-seat eyebrow and no live question, and their
 *      letterhead is not byte-identical to a standing judge's.
 *   5. THE EYE'S FUZZY FALLBACK RESPECTS A WORD BOUNDARY. "Rawson" no longer
 *      ranks Brad Wilson (b-R-A-d W-il-SON), and any legislator a query does
 *      rank holds that query in its own fields. Typo tolerance survives.
 *   6. THE GUARDS ARE LOAD-BEARING. Mutate the one reader to always say
 *      "retention election" and the claims above must break.
 *
 * Real shipped modules in a node:vm sandbox: the real 126-judge registry, the
 * real roster, the real Eye. No fixtures.
 *
 *   node scripts/test-judge-status.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { ENGINE_FILES, makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ judge status: STALE HARNESS — ${m}`); process.exit(2); };

["judicial-data.js", "judicial-retention.js", "judge-file.js", "judicial-retention.css",
 "all-seeing-eye.js"].forEach((f) =>
  must(existsSync(join(ROOT, f)), `${f} is gone — this probe is stale`));

const RET_SRC = R("judicial-retention.js");
const JF_SRC = R("judge-file.js");
const CSS_SRC = R("judicial-retention.css");
const EYE_SRC = R("all-seeing-eye.js");

// The three judges the spec names, spelled out so a registry that renames or
// drops one fails loudly instead of quietly making every claim below vacuous.
const HAGEN = { pid: "diana_hagen", name: "Diana Hagen", court: "Utah Supreme Court" };
const POHLMAN = { pid: "jill_pohlman", name: "Jill M. Pohlman" };
const RAWSON = { pid: "blaine_rawson", name: "E. Blaine Rawson" };

// The words this pass exists to remove from ninety-four files, and the phrase a
// reader would take as a live ballot question. Checked case-insensitively,
// because the eyebrow is uppercased by CSS and a reader sees the caps.
const ELECTION_LINE = "retention election";
const STANDS = "stands for retention";
const QUESTION = "be retained";

// ── the judge-file sandbox ──────────────────────────────────────────────────
// Small enough that everything the file touches is observable. `src` lets a
// load-bearing probe swap one module's source for a mutated copy.
function stubEl(byId) {
  const el = {
    tagName: "DIV", id: "", className: "", innerHTML: "", textContent: "",
    children: [], attrs: {}, parentNode: null,
    appendChild(c) { c.parentNode = el; el.children.push(c); if (byId && c.id) byId[c.id] = c; return c; },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [],
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {}, removeProperty() {} },
  };
  return el;
}
function sandbox(opts) {
  opts = opts || {};
  const src = opts.src || {};
  const byId = {};
  const put = (id) => { const e = stubEl(byId); e.id = id; byId[id] = e; return e; };
  ["modal-content", "modal-icon", "modal-name-small", "modal-office-small",
   "modal-overlay", "modal-body", "modal-panel", "modal-file-kicker"].forEach(put);
  const doc = {
    readyState: "complete",
    createElement: () => stubEl(byId),
    getElementById: (id) => byId[id] || null,
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    head: stubEl(byId), body: stubEl(byId), documentElement: stubEl(byId),
  };
  const win = {
    document: doc,
    location: { pathname: "/", hash: "", search: "" },
    history: { replaceState() {}, pushState() {} },
    addEventListener() {}, removeEventListener() {},
    setTimeout(fn) { if (opts.runTimers && typeof fn === "function") { try { fn(); } catch (e) {} } return 0; },
    clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {} },
    PDXPersonLink: { anchor: (pid, label, o) => `<a${o && o.cls ? ` class="${o.cls}"` : ""} href="/p/${pid}">${label}</a>` },
    PDXPerson: { mounted() {}, stamp() {}, kicker() {}, chrome() {} },
    __byId: byId,
  };
  win.openModal = () => "roster";
  win.closeModal = () => true;
  win.window = win; win.self = win;
  const ctx = vm.createContext(win);
  ["judicial-data.js", "judicial-retention.js", "judge-file.js"].forEach((f) => {
    new vm.Script(src[f] !== undefined ? src[f] : R(f), { filename: f }).runInContext(ctx);
  });
  return win;
}

const W = sandbox();
const J = W.PDXJudicial;
const F = W.PDXJudgeFile;
must(J && typeof J.standing === "function",
  "PDXJudicial.standing() is not published — this pass has no one reader");
must(F && typeof F._html === "function", "PDXJudgeFile._html() is unavailable");
const ALL = J.all();
must(ALL.length > 100, `the registry holds ${ALL.length} rows — it did not load`);
for (const who of [HAGEN, POHLMAN, RAWSON]) {
  const j = J.judge(who.pid);
  must(j, `${who.pid} is not in the registry — this file names a judge who does not exist`);
  must(j.name === who.name, `${who.pid} is now named ${JSON.stringify(j.name)}, not ${JSON.stringify(who.name)}`);
}
must(J.judge(HAGEN.pid).former === true,
  "diana_hagen is no longer flagged as having left the court — the whole premise of this file is gone");

// Every file, rendered once, keyed by pid. Everything below reads from here.
const FILE = {};
const STATUS = {};
ALL.forEach((r) => { FILE[r.pid] = F._html(J.judge(r.pid)); STATUS[r.pid] = J.standing(r.pid); });
const BY = (key) => ALL.map((r) => r.pid).filter((p) => STATUS[p].key === key);
const LOW = (pid) => FILE[pid].toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// 1 · One reader, three sentences, and no fourth
// ─────────────────────────────────────────────────────────────────────────────
section("1 · one reader — three locked statuses, and the row reads the same call");

{
  const KEYS = ["onSlate", "offSlate", "former"];
  eq(Object.keys(J.SEARCH).sort().join(","), KEYS.slice().sort().join(","),
     "the locked status vocabulary is no longer exactly three — a fourth status is a hedge, and a hedge is where a live ballot gets back onto a file that has none");
  ALL.forEach((r) => {
    const st = STATUS[r.pid];
    ok(st && KEYS.indexOf(st.key) > -1, `${r.pid}'s status key is ${JSON.stringify(st && st.key)}, which is not one of the three`);
    eq(st.status, J.SEARCH[st.key], `${r.pid}'s status string is not the locked sentence for its key`);
    // A departed judge is not sitting, and every other row on this roster is.
    eq(st.sitting, !st.former, `${r.pid}'s sitting flag disagrees with its former flag`);
    ok(!(st.onSlate && st.former), `${r.pid} is both on the filed slate and gone from the court`);
  });
  // The row a reader taps and the file it opens are painted from ONE call.
  const rows = J.searchRows();
  eq(rows.length, ALL.length, "searchRows() does not cover the roster");
  rows.forEach((row) => {
    eq(row.status, STATUS[row.pid].status,
       `the search row for ${row.pid} says ${JSON.stringify(row.status)} and standing() says ${JSON.stringify(STATUS[row.pid].status)} — two readers of one fact`);
  });
  // searchRows() reads standing() rather than re-deriving the branch. Source
  // claim, because the whole failure this pass repairs was two copies of it.
  const rowsFn = RET_SRC.slice(RET_SRC.indexOf("function searchRows()"),
                               RET_SRC.indexOf("// ── What person-file.js needs"));
  must(rowsFn.length > 200, "searchRows() could not be sliced — this probe is stale");
  has(rowsFn, "standing(", "searchRows() no longer calls standing() — the second reader is back");
  lacks(rowsFn, "SEARCH.onSlate",
        "searchRows() re-derives the status branch itself, which is the duplication that let a row and a file disagree");
  // The tally is the whole shape of the problem: thirty-two stand, ninety-three
  // sit and are not on the list, one has left.
  eq(BY("onSlate").length + BY("offSlate").length + BY("former").length, ALL.length,
     "some judge falls into none of the three statuses");
  ok(BY("onSlate").length > 10, `only ${BY("onSlate").length} judges are on the filed slate — this probe is stale`);
  ok(BY("offSlate").length > 50, `only ${BY("offSlate").length} judges sit off the slate — this probe is stale`);
  ok(BY("former").length >= 1, "no judge has left the court — the departed-file claims below are vacuous");
  eq(STATUS[HAGEN.pid].key, "former", "diana_hagen's status is not 'former'");
  eq(STATUS[HAGEN.pid].status, "no longer on the court",
     "the departed sentence is not the one the Eye row already shipped");
  eq(STATUS[POHLMAN.pid].key, "onSlate", "jill_pohlman is not on the filed slate");
  eq(STATUS[RAWSON.pid].key, "onSlate", "blaine_rawson is not on the filed slate");
  // The file asks the reader; it does not compute a status of its own.
  has(JF_SRC, "Jj.standing", "judge-file.js does not read the one status reader");
  lacks(JF_SRC, "slateQuestion(j.pid, ",
        "judge-file.js derives the slate for itself rather than asking standing()");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The departed file is not a ballot card
// ─────────────────────────────────────────────────────────────────────────────
section("2 · a judge who left the court gets a former letterhead and no ballot chrome");

BY("former").forEach((pid) => {
  const name = J.judge(pid).name;
  lacks(LOW(pid), ELECTION_LINE,
        `${name} left the court and her file still says "retention election" — a departed file wearing a live-ballot hero is a lie about the ballot`);
  lacks(LOW(pid), STANDS, `${name}'s file says "${STANDS}" over a seat she does not hold`);
  lacks(LOW(pid), QUESTION,
        `${name}'s file prints a retention question as though a voter will be asked it`);
  lacks(FILE[pid], "November 3, 2026",
        `${name}'s file carries the election date, which is not a date on which anything about her is voted on`);
  // The eyebrow is the court and the fact that she is former — not the court alone.
  const eyebrow = /<p class="jf-eyebrow[^"]*">([^<]*)<\/p>/.exec(FILE[pid]);
  must(eyebrow, `${pid}'s letterhead has no eyebrow — this probe is stale`);
  has(eyebrow[1], "former", `${name}'s eyebrow does not say she is former: ${JSON.stringify(eyebrow[1])}`);
  has(eyebrow[1], J.judge(pid).courtLabel, `${name}'s eyebrow does not name the court she served on`);
  lacks(eyebrow[1].toLowerCase(), ELECTION_LINE, `${name}'s eyebrow still names an election`);
  eq(eyebrow[1], "Utah Supreme Court · former justice",
     "the departed justice's eyebrow is not the court and the word former");
  // The retention block is the roster's own leaving sentence, and nothing else.
  has(FILE[pid], J.judge(pid).leftNote,
      `${name}'s file dropped the sentence that says when and why she left`);
  has(FILE[pid], "Left the court in May 2026",
      "the leaving sentence no longer says when she left");
  // Her file is not deleted, and it is still a whole file.
  has(FILE[pid], name, `${name}'s file no longer prints her name`);
  has(FILE[pid], "How this seat was filled", `${name}'s file lost its seat block`);
  has(FILE[pid], "Prior retention", `${name}'s file lost its prior-retention block`);
  has(FILE[pid], "does not vote bills", `${name}'s file lost the honest empty formal record`);
  has(FILE[pid], "Nothing here feeds", `${name}'s file lost the wall`);
  // The status travels on the markup, so a stylesheet can hold the two apart.
  has(FILE[pid], 'data-jf-status="former"', `${name}'s file does not declare its status in the markup`);
  // And the modal chrome says former too: "Utah Supreme Court · Justice" is a
  // present-tense sentence about someone who no longer holds the seat.
  const w = sandbox({ runTimers: true });
  eq(w.openModal(pid), true, `${name}'s file did not render through the intercept`);
  const bar = w.__byId["modal-office-small"].textContent;
  has(bar, "former", `the modal top bar calls ${name} a sitting justice`);
  lacks(bar.toLowerCase(), ELECTION_LINE, "the modal top bar names an election over a departed justice");
  lacks(w.__byId["modal-content"].innerHTML.toLowerCase(), ELECTION_LINE,
        "the rendered modal still carries the election line for a departed justice");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3 · The filed list is untouched
// ─────────────────────────────────────────────────────────────────────────────
section("3 · the thirty-two on the filed list keep the whole election hero");

[POHLMAN, RAWSON].forEach((who) => {
  const pid = who.pid, j = J.judge(pid);
  has(LOW(pid), ELECTION_LINE, `${who.name} is on the filed list and her file dropped the election line`);
  has(FILE[pid], STANDS, `${who.name}'s file no longer carries the locked "${STANDS}"`);
  has(FILE[pid], "November 3, 2026", `${who.name}'s file no longer carries the election date`);
  has(FILE[pid], QUESTION, `${who.name}'s file no longer prints the retention question`);
  // The question is the state's own wording, not one this file composes.
  const q = J.slateQuestion(pid, 2026);
  must(q && q.question, `${pid} has no filed question — this probe is stale`);
  has(FILE[pid], q.question, `${who.name}'s file does not print the filed question verbatim`);
  has(FILE[pid], "Filed as: " + q.filedOffice, `${who.name}'s file does not cite the office the question was filed under`);
  has(FILE[pid], "unopposed and carries no party",
      `${who.name}'s file no longer says a retention question is unopposed and carries no party`);
  const eyebrow = /<p class="jf-eyebrow[^"]*">([^<]*)<\/p>/.exec(FILE[pid]);
  eq(eyebrow[1], `${j.state} · ${j.courtShort} · retention election`,
     `${who.name}'s eyebrow is not the shipped election letterhead`);
  has(FILE[pid], 'data-jf-status="onSlate"', `${who.name}'s file does not declare itself on the slate`);
});
// Every one of the thirty-two, not just the two the spec names.
BY("onSlate").forEach((pid) => {
  has(LOW(pid), ELECTION_LINE, `${pid} is on the filed list and its file does not say so`);
  has(FILE[pid], STANDS, `${pid} is on the filed list and its file omits the locked phrase`);
  has(FILE[pid], QUESTION, `${pid} is on the filed list and its file prints no question`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Sitting is not standing
// ─────────────────────────────────────────────────────────────────────────────
section("4 · the ninety-three who sit off the list keep a file and lose the hero");

BY("offSlate").forEach((pid) => {
  const j = J.judge(pid);
  lacks(LOW(pid), ELECTION_LINE,
        `${pid} is not on the filed 2026 list and its file says "retention election"`);
  lacks(LOW(pid), STANDS, `${pid} is not on the filed list and its file says "${STANDS}"`);
  lacks(LOW(pid), QUESTION,
        `${pid} is not on the filed list and its file prints a retention question as a live one`);
  // It still says which court and which seat, so a reader who arrived by name
  // learns where this judge sits.
  const eyebrow = /<p class="jf-eyebrow[^"]*">([^<]*)<\/p>/.exec(FILE[pid]);
  must(eyebrow, `${pid}'s letterhead has no eyebrow — this probe is stale`);
  has(eyebrow[1], j.courtShort, `${pid}'s eyebrow does not name the court`);
  if (j.unitLabel && j.unitLabel !== "Statewide") {
    has(eyebrow[1], j.unitLabel, `${pid}'s eyebrow does not name the judicial district`);
  }
  // And it says out loud that this seat is not on the list, rather than leaving
  // the reader to infer it from an absence.
  has(FILE[pid], "not on the 2026 slate", `${pid}'s file does not state that this seat is off the filed list`);
  has(FILE[pid], "not among the names filed", `${pid}'s file does not say the seat is absent from the filed list`);
  has(FILE[pid], 'data-jf-status="offSlate"', `${pid}'s file does not declare its status in the markup`);
  // The file is whole: what these ninety-three lose is the hero, not the record.
  has(FILE[pid], "How this seat was filled", `${pid}'s file lost its seat block`);
  has(FILE[pid], "does not vote bills", `${pid}'s file lost the honest empty formal record`);
});
{
  // Not merely different words — a different letterhead. Two judges on the same
  // court, one on the list and one not, must not paint the same hero.
  const standing = BY("onSlate").filter((p) => J.judge(p).courtKey === "supreme");
  const sitting = BY("offSlate").filter((p) => J.judge(p).courtKey === "supreme");
  must(standing.length && sitting.length,
    "the Supreme Court has no standing/sitting pair to compare — this probe is stale");
  const head = (pid) => FILE[pid].slice(0, FILE[pid].indexOf("</header>"));
  const a = head(standing[0]).replace(J.judge(standing[0]).name, "NAME");
  const b = head(sitting[0]).replace(J.judge(sitting[0]).name, "NAME");
  ok(a !== b,
     "a sitting judge who is not on the filed list paints the same letterhead as a judge who stands on it");
  // The status is on the wrapper AND on the header, so the stylesheet can hold
  // the three apart without the markup having to be re-read.
  ["jf-head--onSlate", "jf-head--offSlate", "jf-head--former"].forEach((cls) => {
    has(CSS_SRC, "." + cls.replace("jf-head--", "jf-eyebrow--"),
        `the stylesheet has no rule for the ${cls.split("--")[1]} eyebrow, so the three statuses look identical`);
  });
  has(FILE[standing[0]], 'class="jf-head jf-head--onSlate"', "a standing letterhead is not marked as one");
  has(FILE[sitting[0]], 'class="jf-head jf-head--offSlate"', "a sitting-off-the-list letterhead is not marked as one");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Copy sweep — the banned list, and no legislator machinery
// ─────────────────────────────────────────────────────────────────────────────
section("5 · no banned token and no score reaches any of the 126 files");

{
  // The negation paragraphs name the machinery they refuse; a bare token search
  // would read a denial as the thing denied. The banned sweep strips nothing.
  const claims = (h) => String(h).replace(/<p class="(?:jf-wall|jf-note)">[\s\S]*?<\/p>/g, "");
  must(claims(FILE[POHLMAN.pid]).indexOf("Direction Match") === -1 &&
       FILE[POHLMAN.pid].indexOf("Direction Match") > -1,
       "the wall paragraph could not be stripped — this probe is stale");
  ALL.forEach((r) => {
    J.BANNED.forEach((word) => {
      ok(LOW(r.pid).indexOf(word.toLowerCase()) === -1,
         `${r.pid}'s file carries the banned token "${word}"`);
    });
    ["Direction Match", "Word vs Action", "Promises kept", "score", "match rate", "%"].forEach((t) => {
      lacks(claims(FILE[r.pid]), t,
            `${r.pid}'s file carries "${t}" as a claim, which is legislator machinery on an office that votes no bills`);
    });
    lacks(FILE[r.pid], "no clear voting pattern",
          `${r.pid}'s file describes a roll-call gap that cannot exist for this office`);
  });
  // The locked vocabulary did not grow. A seventh phrase is a synonym, and a
  // synonym is how a verdict gets in.
  eq(Object.keys(J.VOCAB).length, 6, "the locked vocabulary grew during this pass");
  // No judge joined the roster the arithmetic reads.
  lacks(R("cmp-data.js"), '"' + HAGEN.pid + '"', "a judge was added to CMP_DATA");
  // A party READING, not the word: the file says "carries no party" out loud,
  // and a bare token search would read that sentence as the thing it denies.
  const jfCode = JF_SRC.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  [".party", "party:", "partyOf", "PARTY"].forEach((t) => {
    lacks(jfCode, t, `judge-file.js reads ${t} — a retention seat carries no party line`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · The Eye — the row is as shipped, and the fallback respects a boundary
// ─────────────────────────────────────────────────────────────────────────────
section("6 · the Eye row is unchanged, and 'Rawson' no longer ranks a legislator");

function stubNode() {
  const set = new Set();
  const n = {
    id: "", className: "", innerHTML: "", textContent: "", value: "", tagName: "DIV",
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, hidden: false, _attrs: {},
    classList: { add: (c) => set.add(c), remove: (c) => set.delete(c),
      toggle: (c) => (set.has(c) ? set.delete(c) : set.add(c)), contains: (c) => set.has(c) },
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
function eyeBoot(opts) {
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
  win.PDXLazyData = { ensure: () => Promise.resolve(true), loaded: () => true, whenReady: (k, cb) => cb() };
  win.PDX_BILLS_INDEX = win.PDX_BILLS_INDEX || [];
  win._issueLabel = (k) => (win.ISSUE_MAP && win.ISSUE_MAP[k] && win.ISSUE_MAP[k].label) || "";
  vm.runInContext(opts.eye || EYE_SRC, ctx, { filename: "all-seeing-eye.js" });
  must(win.PDXEye && typeof win.PDXEye.render === "function", "PDXEye.render is unavailable");
  return {
    win,
    search(q) { eye.classList.add("is-open"); input.value = q; win.PDXEye.rebuild(); win.PDXEye.render(q); return panel.innerHTML || ""; },
  };
}
const ROWS = (html) =>
  [...String(html).matchAll(/class="pdx-eye-item[^"]*"[^>]*?data-kind="([^"]+)"(?:\s+data-(?:key|id|slug|number)="([^"]*)")?/g)]
    .map((m) => ({ kind: m[1], key: m[2] || "" }));
const TEXT = (html) => String(html).replace(/<\/?mark>/g, "");

{
  const E = eyeBoot();
  // The row a reader taps for Hagen is exactly what shipped in v129.
  const hag = TEXT(E.search("Hagen"));
  has(hag, "no longer on the court", "the Eye row for a departed judge no longer says she left");
  lacks(hag.toLowerCase(), "hagen · utah supreme court · retention election",
        "the Eye restyled a departed judge's row as a live election");
  const hagRows = ROWS(hag).filter((r) => r.kind === "judge");
  eq(hagRows.length, 1, "the Eye does not rank exactly one judge for 'Hagen'");
  eq(hagRows[0].key, HAGEN.pid, "the judge the Eye ranks for 'Hagen' is not Diana Hagen");
  // A sitting judge off the list keeps the row the spec froze: the status is the
  // locked off-slate sentence, not an election.
  const off = BY("offSlate").map((p) => J.judge(p)).find((j) => j.courtKey === "supreme");
  must(off, "no sitting Supreme Court judge is off the filed list — this probe is stale");
  const offHtml = TEXT(E.search(off.name.split(" ").pop()));
  has(offHtml, "not on the 2026 slate", `the Eye row for ${off.name} does not carry the off-slate sentence`);

  // ── THE BOUNDARY ────────────────────────────────────────────────────────
  // "rawson" is a subsequence of "brad wilson" — b-R-A-d W-il-SON — and that
  // alone used to rank a legislator above the judge. It is not a near-miss on a
  // name; the letters were scavenged across a space.
  const raw = E.search("Rawson");
  const rawJudges = ROWS(raw).filter((r) => r.kind === "judge").map((r) => r.key);
  ok(rawJudges.indexOf(RAWSON.pid) > -1, "the Eye no longer finds Judge Rawson for 'Rawson'");
  // A legislator may only rank for a query when its own fields hold that query,
  // or when the query is a near-miss on ONE WORD of its name — "Hagen" for
  // Hageman, which is the dropped-letter tolerance the fallback exists for.
  // What it may never do is rank because the letters can be gathered across a
  // space, which is the whole of the Brad Wilson hit. No name is special-cased:
  // the claim is checked for every politician every query ranks.
  const fields = (rec) => [rec.name, rec.office, rec.state, rec.district, rec.bio,
    rec.quote, rec.tagline, rec.summary].filter(Boolean).join(" ").toLowerCase();
  const inOneWord = (rec, q) => String(rec.name || "").toLowerCase()
    .split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    .some((tok) => {
      let qi = 0;
      for (let i = 0; i < tok.length && qi < q.length; i++) if (tok[i] === q[qi]) qi++;
      return qi === q.length;
    });
  ["Rawson", "Hagen", "Pohlman", "Mow"].forEach((q) => {
    const html = E.search(q);
    const lc = q.toLowerCase();
    ROWS(html).filter((r) => r.kind === "pol").forEach((r) => {
      const rec = E.win.CMP_DATA[r.key] || E.win.PROFILES[r.key] || {};
      ok(fields(rec).indexOf(lc) > -1 || inOneWord(rec, lc),
         `the Eye ranked ${r.key} for "${q}": no field of that record contains "${lc}" and no single word of its name is a near-miss on it — the match crossed a word boundary`);
    });
  });
  // Typo tolerance is the reason the fallback exists, and it survives: the
  // dropped-letter cases are all inside ONE word.
  const massie = ROWS(E.search("massie")).filter((r) => r.kind === "pol").map((r) => r.key);
  ok(massie.length > 0, "the fuzzy fallback no longer finds a surname — the boundary rule cut too deep");
  has(EYE_SRC, "function subseqName", "the Eye has no token-wise fuzzy fallback");
  has(EYE_SRC, "subseqName(entry, q)", "score() does not use the token-wise fallback");
  // The rule is the boundary, not a list of names. The claim is about what the
  // Eye COMPUTES, so the comments — which name the two false hits this pass
  // removed, and have to in order to explain the rule — are stripped first.
  const eyeCode = EYE_SRC.split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n").toLowerCase();
  ["rawson", "wilson", "hagen", "pohlman", "hageman"].forEach((n) => {
    ok(eyeCode.indexOf(n) === -1,
       `all-seeing-eye.js hardcodes the name "${n}" — the boundary rule must not be a special case`);
  });
}
{
  // Twin boot: the legislative read is byte-identical with the judiciary
  // indexed and without it, for queries that have nothing to do with a court.
  const withJ = eyeBoot(), without = eyeBoot({ noJudicial: true });
  ["Lee", "climate", "Curtis", "water", "housing"].forEach((q) => {
    const a = ROWS(withJ.search(q)).filter((r) => r.kind !== "judge");
    const b = ROWS(without.search(q)).filter((r) => r.kind !== "judge");
    eq(JSON.stringify(a), JSON.stringify(b),
       `indexing the judiciary changed the legislative rows for "${q}"`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Load-bearing — break the reader, and the claims must fail
// ─────────────────────────────────────────────────────────────────────────────
section("7 · the guards are load-bearing");

{
  // (a) Make the one reader always say "on the filed slate". The departed file
  //     must go back to wearing a live ballot — which is what proves the claims
  //     in section 2 are watching the reader and not a coincidence.
  const broken = RET_SRC.replace(
    "var key = onSlate ? 'onSlate' : (j.former ? 'former' : 'offSlate');",
    "var key = 'onSlate';");
  must(broken !== RET_SRC, "the status branch could not be mutated — this probe is stale");
  const w = sandbox({ src: { "judicial-retention.js": broken } });
  const h = w.PDXJudgeFile._html(w.PDXJudicial.judge(HAGEN.pid)).toLowerCase();
  ok(h.indexOf(ELECTION_LINE) > -1,
     "forcing the status to 'on the filed slate' did not put the election line back on the departed file — the letterhead is not actually reading the status");
  // (b) Point the letterhead at the court again, the way it used to be. The
  //     ninety-four files that are not on a ballot must all start claiming one.
  const oldWay = JF_SRC.replace(
    "if (st.key === 'onSlate') return j.state + ' · ' + j.courtShort + ' · ' + st.status;",
    "return j.state + ' · ' + j.courtShort + ' · retention election';");
  must(oldWay !== JF_SRC, "the eyebrow branch could not be mutated — this probe is stale");
  const w2 = sandbox({ src: { "judge-file.js": oldWay } });
  const bad = BY("offSlate").concat(BY("former")).filter((pid) =>
    w2.PDXJudgeFile._html(w2.PDXJudicial.judge(pid)).toLowerCase().indexOf(ELECTION_LINE) > -1);
  ok(bad.length > 50,
     `restoring the court-derived eyebrow only put the election line on ${bad.length} off-ballot files — the eyebrow claim is not load-bearing`);
  // (c) Restore the cross-boundary fuzzy fallback, and the false legislator hit
  //     must come back.
  const loose = EYE_SRC.replace("var fq = subseqName(entry, q);", "var fq = subseq(name, q);");
  must(loose !== EYE_SRC, "the fuzzy fallback could not be mutated — this probe is stale");
  const E = eyeBoot({ eye: loose });
  const pols = ROWS(E.search("Rawson")).filter((r) => r.kind === "pol");
  ok(pols.length > 0,
     "restoring the whole-name fuzzy fallback did not bring back a legislator for 'Rawson' — the boundary claim is not load-bearing");
}

// ── report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ judge status: ${failures.length} of ${passed + failures.length} assertions failed\n`);
  failures.forEach((f) => console.error("   · " + f));
  process.exit(1);
}
console.log(`\n✓ judge status: a retention hero belongs only to a seat on the filed list — ${passed} assertions passed`);
console.log(`  ${BY("onSlate").length} stand · ${BY("offSlate").length} sit off the list · ${BY("former").length} departed · 3 locked statuses · 1 reader`);
