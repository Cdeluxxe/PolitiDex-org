#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-judicial-retention.mjs — a retention seat is an office, not a grade
// ─────────────────────────────────────────────────────────────────────────────
// Utah ballots in even years carry yes/no judicial retention. Door 2 resolved
// two Senate seats, a House seat, a governor and two state chambers, called the
// result "your ballot workspace", and said nothing about the third branch. This
// pass closes that hole by adding a new OFFICE CLASS — and the entire risk of
// adding an office class to a product built around scoring is that the office
// quietly acquires a score.
//
// So most of what follows is not "does the feature work". It is "did the
// feature stay a feature":
//
//   1. IDENTITY ONLY. The roster carries name, court, appointing governor,
//      appointment and confirmation dates, next retention date and pid. No
//      party — party is not on the judicial ballot. No score, no percentage, no
//      Direction Match input, no promise counts. And no judge in CMP_DATA,
//      because a record in that roster inherits every one of those.
//   2. ONE OWNER. Three surfaces read judicial-retention.js and none of them
//      decides a retention fact for itself.
//   3. DOOR 2 IS STILL DOOR 2. A Utah location gets the rows the slate holds or
//      an honest blank; an out-of-Utah location gets no judge at all; the
//      unmapped courts name WHICH MAP IS MISSING rather than offering the
//      nearest judge on file. And the band is a sibling of #bw-body that never
//      joins seats(), so the "N of 6 decided" counter still counts one act.
//   4. THE JUDGE FILE PAINTS NO FIGURE. No ring, no percentage, no Direction
//      Match, and no "no clear voting pattern" said over an office that does
//      not vote. The formal lane says so in words.
//   5. THE JPEC BLOCK EITHER CITES judges.utah.gov OR SAYS NOT ON FILE.
//   6. THE COPY WALLS HOLD. Six locked phrases, and the banned list absent from
//      every judge surface's rendered output.
//   7. TWIN BOOT. The legislative Direction Match, the formal tiers and the
//      publication floor read identically with these files loaded and without
//      them.
//   8. FAIL CLOSED. Two judges of one name on one court is dropped from the
//      ballot and the drop is reported.
//   9. LOAD-BEARING. Each added guard is removed in turn and the assertion that
//      covers it must fail. A probe that passes without the line it tests is
//      not testing anything.
//
//   node scripts/test-judicial-retention.mjs

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const CODE = (f) => R(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).includes(n), `${m} — missing ${JSON.stringify(n)}`);
const lacks = (h, n, m) => ok(!String(h).includes(n), `${m} — found ${JSON.stringify(n)}`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (c, m) => { if (c) return; console.error(`✗ judicial retention: STALE HARNESS — ${m}`); process.exit(2); };

const FILES = ["judicial-data.js", "judicial-retention.js", "judge-file.js",
               "judicial-ballot.js", "judicial-retention.css"];
FILES.forEach((f) => must(existsSync(join(ROOT, f)), `${f} is gone — this probe is stale`));

const INDEX = R("index.html");
const SW = R("sw.js");
const DATA_SRC = CODE("judicial-data.js");
const RET_SRC = CODE("judicial-retention.js");
const JF_SRC = CODE("judge-file.js");
const JB_SRC = CODE("judicial-ballot.js");
const PF_SRC = CODE("person-file.js");
const BW_SRC = CODE("ballot-workspace.js");

// ─────────────────────────────────────────────────────────────────────────────
// A hand-rolled DOM, small enough that everything the modules touch is
// observable. Elements register themselves by id on append, because both mounts
// look their slot up by id before creating it — without the registry every
// paint would look like a first paint.
// ─────────────────────────────────────────────────────────────────────────────
function stubEl(tag, byId) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    id: "", className: "", innerHTML: "", textContent: "",
    children: [], attrs: {}, listeners: {}, parentNode: null,
    appendChild(c) {
      c.parentNode = el; el.children.push(c);
      if (byId && c.id) byId[c.id] = c;
      return c;
    },
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return el.attrs[k] === undefined ? null : el.attrs[k]; },
    removeAttribute(k) { delete el.attrs[k]; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    style: { setProperty() {}, removeProperty() {} },
  };
  return el;
}

// `src` lets a load-bearing probe swap one file's source for a mutated copy.
function sandbox(opts) {
  opts = opts || {};
  const src = opts.src || {};
  const byId = {};
  const mk = (tag) => stubEl(tag, byId);
  const put = (id) => { const e = mk(); e.id = id; byId[id] = e; return e; };

  const workspace = put("ballot-workspace");
  workspace.appendChild(put("bw-body"));
  const wrm = mk();
  put("modal-content"); put("modal-icon"); put("modal-name-small");
  put("modal-office-small"); put("modal-overlay"); put("modal-body");
  put("modal-panel"); put("modal-file-kicker");

  const doc = {
    readyState: "complete",
    createElement: (t) => mk(t),
    getElementById: (id) => byId[id] || null,
    querySelector: (sel) => (sel === "#who-represents-me .wrm-inner" ? wrm : null),
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    head: mk(), body: mk(), documentElement: mk(),
    title: "PolitiDex",
  };
  const win = {
    document: doc,
    location: { pathname: "/", hash: "", search: "" },
    history: { replaceState() {}, pushState() {} },
    addEventListener() {}, removeEventListener() {},
    setTimeout(fn) { if (opts.runTimers && typeof fn === "function") { try { fn(); } catch (e) {} } return 0; },
    clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    console: { log() {}, warn() {}, error() {} },
    pdxRepsForMe: opts.reps ? () => opts.reps : undefined,
    PDXPersonLink: {
      anchor(pid, label, o) {
        const cls = o && o.cls ? ` class="${o.cls}"` : "";
        return `<a${cls} href="/p/${pid}">${label}</a>`;
      },
    },
    PDXPerson: {
      __calls: [],
      mounted(p) { win.PDXPerson.__calls.push("mounted:" + p); },
      stamp(p) { win.PDXPerson.__calls.push("stamp:" + p); },
      kicker(p) { win.PDXPerson.__calls.push("kicker:" + p); },
      chrome(p) { win.PDXPerson.__calls.push("chrome:" + p); },
    },
    __roster: [],
    __wrm: wrm,
    __byId: byId,
  };
  // The roster renderer this pass must never hand a judge to.
  win.openModal = function (id) { win.__roster.push(id); return "roster"; };
  win.closeModal = function () { win.__roster.push("close"); return true; };
  win.window = win;
  win.self = win;

  const ctx = vm.createContext(win);
  ["judicial-data.js", "judicial-retention.js", "judge-file.js", "judicial-ballot.js"]
    .forEach((f) => {
      new vm.Script(src[f] !== undefined ? src[f] : R(f), { filename: f }).runInContext(ctx);
    });
  return win;
}

const UTAH = {
  located: true, national: false, state: "Utah", area: "Davis County",
  districtsResolvable: true, levels: [],
};
const OHIO = {
  located: true, national: false, state: "Ohio", area: "Columbus",
  districtsResolvable: false, levels: [],
};
const NOWHERE = { located: false, national: false, state: "", area: "", levels: [] };

const W = sandbox({ reps: UTAH });
const J = W.PDXJudicial;
must(J && typeof J.ballot === "function" && typeof J.judge === "function",
     "window.PDXJudicial is not the shape this probe expects");
must(W.PDX_JUDICIAL && W.PDX_JUDICIAL.JUDGES, "the judicial roster did not load — this probe is stale");

// The one row the pass verified as standing for retention. Read from the
// shipped data rather than typed here, so this harness cannot drift from it.
const SLATE_2026 = W.PDX_JUDICIAL.SLATES["2026"];
must(SLATE_2026 && SLATE_2026.supreme, "the 2026 Supreme Court slate is gone — this probe is stale");
const STANDING = Object.keys(W.PDX_JUDICIAL.JUDGES)
  .filter((pid) => W.PDX_JUDICIAL.JUDGES[pid].retention)
  .sort();
must(STANDING.length >= 1, "no judge in the roster stands for retention — this probe is stale");

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Identity only. No party, no score, no Direction Match input.
// ─────────────────────────────────────────────────────────────────────────────
section("1 · the roster carries identity and nothing that could become a score");

// Every field name in the data file, so a score cannot be added under a new
// name without this list noticing.
const FIELDS = new Set();
Object.keys(W.PDX_JUDICIAL.JUDGES).forEach((pid) => {
  Object.keys(W.PDX_JUDICIAL.JUDGES[pid]).forEach((k) => FIELDS.add(k));
});
const FORBIDDEN_FIELDS = ["party", "score", "scores", "rating", "grade", "match",
  "kept", "broken", "pending", "percent", "pct", "dm", "mandate", "finance",
  "ideology", "lean", "tilt"];
FORBIDDEN_FIELDS.forEach((f) => {
  ok(!FIELDS.has(f), `a judge row carries a "${f}" field — that is the scoring apparatus arriving under a new name`);
});
["name", "court", "pid", "appointedBy", "appointed", "confirmed", "retention"].forEach((f) => {
  ok(FIELDS.has(f), `the roster no longer carries "${f}", which is one of the identity fields a retention row is made of`);
});

// No judge is written into the bundled roster. That is the whole reason the
// registry exists: CMP_DATA membership drags in party, score, promise counts
// and the publication floor.
{
  const cmp = R("cmp-data.js");
  const leaked = Object.keys(W.PDX_JUDICIAL.JUDGES).filter((pid) => cmp.includes(`"${pid}"`));
  eq(leaked.join(","), "",
     `these judges have been written into CMP_DATA, which gives them a party chip, a score ring and the publication floor: ${leaked.join(", ")}`);
  lacks(cmp, '"judicial": true',
        "a CMP_DATA record now claims the judicial file class, which would route a legislator through the judge file");
}

// The five courts, as browse types.
const COURT_KEYS = J.courts().map((c) => c.key).join(",");
eq(COURT_KEYS, "supreme,appeals,district,juvenile,justice",
   "the five Utah court classes are not the office types the roster offers");
J.courts().forEach((c) => {
  ok(!!c.label && c.label.indexOf("Utah") === 0, `court ${c.key} is not labelled as a Utah court`);
  ok(c.term === 10 || c.term === 6, `court ${c.key} carries a retention term that is neither 10 nor 6 years`);
});

// A judge with no JPEC card still exists as a file that says so — the
// publication floor's rule, restated for this office class rather than
// replaced.
{
  const bare = Object.keys(W.PDX_JUDICIAL.JUDGES).find((pid) => !W.PDX_JUDICIAL.JUDGES[pid].jpec);
  must(bare, "every judge has a JPEC card — the no-card path cannot be tested");
  const rec = J.personRecord(bare);
  ok(!!rec && !!rec.name && rec.judicial === true,
     "a judge with no JPEC report has no person record at all, so the file would not exist");
  eq(J.jpec(bare).label, J.VOCAB.jpecNone,
     "a judge with no JPEC report does not say so in the locked phrase");
  has(J.jpec(bare).url, "judges.utah.gov",
      "the empty JPEC card does not point at the official source");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · One owner
// ─────────────────────────────────────────────────────────────────────────────
section("2 · every surface reads the one retention object");

[["judge-file.js", JF_SRC], ["judicial-ballot.js", JB_SRC]].forEach(([name, src]) => {
  has(src, "window.PDXJudicial", `${name} does not read the retention object`);
  lacks(src, "PDX_JUDICIAL.JUDGES", `${name} reaches past the retention object straight into the raw roster`);
  lacks(src, "_currentVoterLocation",
        `${name} reads the voter's location itself — that question already has one owner`);
});
has(JB_SRC, "pdxRepsForMe", "the Door 2 band does not resolve through the one resolver");
lacks(RET_SRC, "document.", "judicial-retention.js touches the DOM — it is supposed to answer questions, not render");

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Door 2
// ─────────────────────────────────────────────────────────────────────────────
section("3 · Utah gets the rows on file or an honest blank; nowhere else gets a judge");

// A Utah location with a known county: the rows are exactly the slate rows that
// carry a retention date, and nothing else.
{
  const b = J.ballot(UTAH);
  eq(b.utah, true, "a Utah location was not recognised as Utah");
  eq(b.rows.map((r) => r.pid).sort().join(","), STANDING.join(","),
     "the retention rows for a Utah ballot are not the roster's standing-for-retention rows");
  b.rows.forEach((r) => {
    has(r.question, "be retained?", "a retention row is not phrased as the ballot's yes/no question");
    eq(r.certified, false,
       "a retention row claims the official list is certified — it is not on file for 2026");
  });
  ok(!b.certified, "the ballot claims a certified 2026 retention list");
  has(b.note, "not on file", "the ballot does not say the official list is missing");

  // The unmapped courts are PRESENT and say which map is missing. A court that
  // is simply absent reads as a court with no question on the ballot.
  const unmapped = b.courts.filter((c) => c.status === "unmapped").map((c) => c.key).sort();
  eq(unmapped.join(","), "district,justice,juvenile",
     "the courts PolitiDex cannot place a voter inside are not reported as unmapped");
  ok(b.missing.length >= 3, "the missing judicial-district maps are not reported at all");
  b.courts.filter((c) => c.status === "unmapped").forEach((c) => {
    has(c.note, "does not map", `the ${c.key} court does not say the map is missing`);
    eq(c.count, 0, `the ${c.key} court produced rows from geography we do not hold`);
  });
}

// Out of Utah: no rows, no judge name anywhere, and the reason stated.
{
  const b = J.ballot(OHIO);
  eq(b.utah, false, "an Ohio location was treated as Utah");
  eq(b.rows.length, 0, "an Ohio ballot was handed judicial retention rows");
  has(b.note, "Utah only", "the out-of-Utah blank does not say why it is blank");
  const w = sandbox({ reps: OHIO });
  const band = w.PDXJudicialBallot._band();
  Object.keys(w.PDX_JUDICIAL.JUDGES).forEach((pid) => {
    lacks(band, w.PDX_JUDICIAL.JUDGES[pid].name,
          `the Door 2 band names a Utah judge on an Ohio ballot (${pid})`);
  });
  lacks(band, "District Court", "an Ohio ballot was offered a Utah district court row");
  lacks(band, "be retained?", "an Ohio ballot was asked a Utah retention question");
}

// No location: no claim of any kind.
{
  const b = J.ballot(NOWHERE);
  eq(b.rows.length, 0, "an unlocated visitor was handed retention rows");
  const w = sandbox({ reps: NOWHERE });
  eq(w.PDXJudicialBallot._band(), "", "the band rendered before a location was set");
}

// The band is a SIBLING of #bw-body, and it is not a seat.
{
  const w = sandbox({ reps: UTAH, runTimers: true });
  const ws = w.__byId["ballot-workspace"];
  const band = w.__byId["jr-band"];
  must(band, "the retention band did not mount — this probe is stale");
  eq(band.parentNode === ws, true,
     "the band mounted somewhere other than #ballot-workspace");
  eq(band.parentNode.id, "ballot-workspace",
     "the band is not a child of the workspace section");
  ok(band.parentNode.id !== "bw-body",
     "the band mounted INSIDE #bw-body, whose innerHTML sync() overwrites in one write — it would vanish on the next repaint");
  // A second paint does not mount a second band.
  w.PDXJudicialBallot.sync();
  eq(ws.children.filter((c) => c.id === "jr-band").length, 1,
     "a repaint mounted a second retention band");
  has(band.innerHTML, "be retained?", "the mounted band does not carry the retention question");
}

// seats() — the denominator door2-spine counts — is untouched.
{
  const seatBlock = BW_SRC.slice(BW_SRC.indexOf("var SEAT_FALLBACK"), BW_SRC.indexOf("function seats()"));
  must(seatBlock.length > 100, "ballot-workspace's seat list could not be located — this probe is stale");
  ["judic", "retention", "judge", "court"].forEach((t) => {
    ok(seatBlock.toLowerCase().indexOf(t) === -1,
       `a judicial row has been added to ballot-workspace's seat list — that puts a yes/no act in the "N of 6 decided" denominator (${t})`);
  });
  lacks(JB_SRC, "TEAM_POSITIONS",
        "the retention band writes into the seat list, which is what the progress counter counts");
  lacks(JB_SRC, "pdxBallotWorkspaceOpen",
        "the retention band drives the seat picker, which has no pick engine for a yes/no question");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The judge file paints no figure
// ─────────────────────────────────────────────────────────────────────────────
section("4 · the judge file leads with the court, and carries no score of any kind");

const PID = STANDING[0];
const FILE_HTML = W.PDXJudgeFile._html(J.judge(PID));

// ─────────────────────────────────────────────────────────────────────────────
// A CLAIM IS NOT A NEGATION. Both surfaces carry a wall paragraph that names
// the machinery they refuse to use — "nothing here feeds Direction Match, Word
// vs Action, a formal-record tier or any score" — and a bare token search over
// the rendered HTML would read that sentence as the thing it forbids. So the
// "no figure" sweeps below run over the html with the wall and note paragraphs
// removed, and those paragraphs are then asserted to say what they should. The
// banned-token sweep in section 6 deliberately does NOT strip anything: none of
// those words belongs on a judge surface even inside a denial.
// ─────────────────────────────────────────────────────────────────────────────
const NEGATION_CLASSES = ["jf-wall", "jf-note", "jr-note"];
const claims = (html) => {
  let out = String(html);
  NEGATION_CLASSES.forEach((cls) => {
    out = out.replace(new RegExp(`<p class="${cls}">[\\s\\S]*?</p>`, "g"), "");
  });
  return out;
};
must(claims(FILE_HTML).indexOf("Direction Match") === -1 &&
     FILE_HTML.indexOf("Direction Match") > -1,
     "the judge file's wall paragraph could not be stripped — this probe is stale");
{
  has(FILE_HTML, "retention election",
      "the judge file's letterhead does not name the retention election");
  has(FILE_HTML, J.judge(PID).courtShort,
      "the judge file's letterhead does not name the court");
  ok(FILE_HTML.indexOf("%") === -1,
     "the judge file prints a percentage — there is no figure this office could be scored on");
  // "no clear voting pattern" is banned OUTRIGHT, negation or not: it is the
  // legislator sentence for a thin roll-call record, and said over an office
  // that casts no roll calls it describes a gap that does not exist.
  lacks(FILE_HTML, "no clear voting pattern",
        "the judge file says \"no clear voting pattern\" over an office that does not vote bills");
  ["Direction Match", "Word vs Action", "Promises kept", "score", "Score", "match rate"].forEach((t) => {
    lacks(claims(FILE_HTML), t, `the judge file carries "${t}" as a claim, which is legislator machinery applied to an office that does not vote bills`);
  });
  // And the wall says, in words, that none of it is fed.
  has(FILE_HTML, "Nothing here feeds",
      "the judge file no longer states the wall — that nothing on it feeds a score");
  // The formal lane is empty AND says why.
  has(FILE_HTML, "does not vote bills",
      "the judge file's formal lane does not say that this office has no roll call");
  has(FILE_HTML, "Rulings are not promises",
      "the judge file does not refuse to read a holding as a kept or broken pledge");
  // The appointing governor is a link to THEIR file, not a chip on this one.
  has(FILE_HTML, '/p/cox', "the appointing governor does not deep-link to their own file");
  lacks(FILE_HTML, "appointee of", "the appointing governor has become a chip on the judge's file");
  has(FILE_HTML, "not a description of the judge",
      "the file does not say that who appointed a judge is not a description of the judge");
}

// The renderer intercepts the one funnel and never hands a judge to the roster.
{
  const w = sandbox({ reps: UTAH, runTimers: true });
  const out = w.openModal(PID);
  eq(out, true, "openModal did not report that the judge file rendered");
  eq(w.__roster.length, 0,
     "a judge was handed to the roster renderer, which holds no record for one");
  has(w.__byId["modal-content"].innerHTML, "retention election",
      "the judge file did not render into the modal");
  eq(w.__byId["modal-office-small"].textContent.indexOf("Utah") > -1, true,
     "the modal top bar does not name the court and state");
  eq(w._pdxCurrentProfileId, PID,
     "the open judge file is not the current file, so the cold-arrival poll would keep running");
  ["mounted:" + PID, "stamp:" + PID, "kicker:" + PID].forEach((c) => {
    ok(w.PDXPerson.__calls.indexOf(c) > -1,
       `the judge file did not hand ${c.split(":")[0]} to PDXPerson, which owns the address`);
  });
  eq(w.__byId["modal-panel"].getAttribute("data-pdx-judge"), "1",
     "the panel is not marked as a judge file, so the team/evidence footer would act on a record that does not exist");
  // A non-judge passes straight through, and the mark comes off.
  w.openModal("cox");
  eq(w.__roster.join(","), "cox", "a legislator no longer reaches the roster renderer");
  eq(w.__byId["modal-panel"].getAttribute("data-pdx-judge"), null,
     "the judge mark survived a legislator's file, which would hide that file's footer");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · The JPEC block
// ─────────────────────────────────────────────────────────────────────────────
section("5 · the JPEC block quotes the commission or says the report is not on file");

Object.keys(W.PDX_JUDICIAL.JUDGES).forEach((pid) => {
  const c = J.jpec(pid);
  const known = [J.VOCAB.jpecYes, J.VOCAB.jpecNo, J.VOCAB.jpecNone];
  ok(known.indexOf(c.label) > -1,
     `${pid}'s JPEC card says "${c.label}", which is not one of the three locked phrases`);
  if (c.status === "none") {
    has(c.url, "judges.utah.gov", `${pid} has no JPEC report and does not point at the official source`);
  } else {
    ok(!!c.url, `${pid} has a JPEC recommendation with no source URL, which makes it PolitiDex's claim`);
  }
  const html = W.PDXJudgeFile._html(J.judge(pid));
  ok(html.indexOf("judges.utah.gov") > -1 || html.indexOf(J.VOCAB.jpecNone) > -1,
     `${pid}'s file neither cites judges.utah.gov nor says no JPEC report is on file`);
});
has(FILE_HTML, "does not compute a substitute",
    "the judge file does not say that PolitiDex publishes no substitute for the official evaluation");

// ─────────────────────────────────────────────────────────────────────────────
// 6 · Copy walls
// ─────────────────────────────────────────────────────────────────────────────
section("6 · locked phrases only, and the banned list absent from every judge surface");

const LOCKED = ["retained", "not retained", "stands for retention",
  "JPEC recommends retain", "JPEC does not recommend", "no JPEC report on file"];
LOCKED.forEach((p) => {
  ok(Object.keys(J.VOCAB).some((k) => J.VOCAB[k] === p),
     `the locked phrase "${p}" is no longer in the vocabulary`);
});
eq(Object.keys(J.VOCAB).length, LOCKED.length,
   "the locked vocabulary has grown — a seventh phrase is a synonym, and synonyms are how a verdict gets in");

// The sweep runs over RENDERED OUTPUT, not source, because the banned list has
// to be declared somewhere and a source grep would only ever find its own
// declaration.
const SURFACES = {
  "judge file": FILE_HTML,
  "Door 2 band (Utah)": sandbox({ reps: UTAH }).PDXJudicialBallot._band(),
  "Door 2 band (Ohio)": sandbox({ reps: OHIO }).PDXJudicialBallot._band(),
  "archive listing": W.PDXJudicialBallot._arch(),
};
Object.keys(W.PDX_JUDICIAL.JUDGES).forEach((pid) => {
  SURFACES["judge file · " + pid] = W.PDXJudgeFile._html(J.judge(pid));
});
J.BANNED.forEach((word) => {
  Object.keys(SURFACES).forEach((name) => {
    ok(SURFACES[name].toLowerCase().indexOf(word.toLowerCase()) === -1,
       `the ${name} carries the banned token "${word}"`);
  });
});
["activist", "liberal court", "conservative court", "legislating from the bench",
 "packed", "swamp", "party-line bench"].forEach((w) => {
  ok(J.BANNED.map((b) => b.toLowerCase()).indexOf(w) > -1,
     `"${w}" has fallen off the banned list`);
});

// The public lane is cited, court-level, and never a grade.
{
  const rows = J.publicLane("supreme");
  ok(rows.length > 0, "the public lane holds nothing, so the cited-comment path cannot be tested");
  rows.forEach((p) => {
    ok(/^https:\/\//.test(String(p.url)), "a public-lane item carries no https cite");
    ok(!!p.cite, "a public-lane item names no source");
  });
  has(FILE_HTML, "quoted, never scored",
      "the public lane does not say that a comment is quoted rather than scored");
  // Attached to the COURT, so a named campaign is never pinned to a guessed name.
  lacks(DATA_SRC, "PUBLIC = {\n    jill_pohlman",
        "the public lane has been attached to a judge rather than to the court");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 · Twin boot — the legislative read is untouched
// ─────────────────────────────────────────────────────────────────────────────
section("7 · Direction Match, the formal tiers and the publication floor did not move");

// person-file.js's record() gained ONE guarded lookup, and it runs LAST.
{
  const recSrc = PF_SRC.slice(PF_SRC.indexOf("function record(pid)"));
  const body = recSrc.slice(0, recSrc.indexOf("\n  }") + 4);
  must(body.includes("PROFILES") && body.includes("CMP_DATA"),
       "person-file's record() no longer reads the two rosters — this probe is stale");
  ok(body.indexOf("PROFILES") < body.indexOf("PDXJudicial") &&
     body.indexOf("CMP_DATA") < body.indexOf("PDXJudicial"),
     "the judicial registry is consulted BEFORE the rosters, so a judge pid could shadow a roster record");
  has(body, "PDXJudicial", "person-file's record() cannot see a judge, so /p/<judge> answers with a 404 notice");

  // Twin boot, literally: the same lifted record() over the same roster, with
  // and without the registry present, must return the identical object.
  const probe = (withRegistry) => {
    const ctx = vm.createContext({});
    ctx.window = ctx;
    ctx.PROFILES = null;
    ctx.CMP_DATA = { lee: { name: "Mike Lee", office: "U.S. Senator", party: "R", score: 61 } };
    if (withRegistry) ctx.PDXJudicial = { personRecord: () => ({ name: "A Judge", judicial: true }) };
    new vm.Script(body + "\nthis.run = function (p) { return record(p); };",
                  { filename: "record-probe" }).runInContext(ctx);
    return { known: ctx.run("lee"), unknown: ctx.run("nobody_at_all") };
  };
  eq(JSON.stringify(probe(true).known), JSON.stringify(probe(false).known),
     "a legislator's record resolves differently with the judicial registry loaded — the registry is not additive");
  eq(probe(false).unknown, null,
     "record() without the registry no longer fails closed on a pid nobody holds");
}

// The kicker's judicial branch is gated on the file class and returns before
// the floor is read.
{
  const kick = PF_SRC.slice(PF_SRC.indexOf("function kicker(pid)"));
  const body = kick.slice(0, kick.indexOf("host.innerHTML = '<span class=\"pf-kick-what\">Person file</span>'"));
  must(body.includes("d.judicial"), "the kicker's judicial branch is gone — this probe is stale");
  ok(body.indexOf("d.judicial") < body.indexOf("var F = floor()"),
     "the kicker reads the publication floor before it checks the file class, so a judge can still be stamped \"record still being built\"");
  has(body, "Judge file", "the kicker does not name the judge file class");
  // The floor itself is not moved.
  const FL = CODE("publication-floor.js");
  has(FL, "MIN_CITED_POSITIONS", "publication-floor.js no longer declares its floor — this probe is stale");
  lacks(FL, "judicial", "the publication floor now has an opinion about judges");
  lacks(FL, "PDXJudicial", "the publication floor now reads the judicial registry");
}

// A judge never triggers the voting-record warm, because a retention seat casts
// no roll calls and the fetch would be the vote-pattern apparatus reaching for
// an office that has no votes.
{
  const warmSrc = PF_SRC.slice(PF_SRC.indexOf("function warm(pid)"));
  const body = warmSrc.slice(0, warmSrc.indexOf("\n  }") + 4);
  must(body.includes("PDXVotingRecord"), "person-file's warm() no longer fetches a member record — this probe is stale");
  has(body, "jd.judicial", "a judge still triggers the voting-record fetch, which is a vote-pattern engine reaching for an office with no votes");
  ok(body.indexOf("jd.judicial") < body.indexOf("PDXVotingRecord"),
     "the judicial guard runs after the fetch is set up rather than before it");
}

// Nothing in the new files feeds a score.
const SCORE_SINKS = ["PDXConsistency", "PDXDirectionMatch", "pdxDirectionMatch",
  "_pdxWordAction", "PDXMandate", "PDXPublicationFloor", "PDXFormalIndex"];
[["judicial-data.js", DATA_SRC], ["judicial-retention.js", RET_SRC],
 ["judge-file.js", JF_SRC], ["judicial-ballot.js", JB_SRC]].forEach(([name, src]) => {
  SCORE_SINKS.forEach((s) => {
    lacks(src, s, `${name} reaches into ${s} — a retention row is not an input to any score`);
  });
});
has(RET_SRC, "WALL", "the retention object no longer declares its wall");
has(J.WALL, "not a grade", "the wall no longer says that a retention question is not a grade");

// ─────────────────────────────────────────────────────────────────────────────
// 8 · Fail closed on a name collision
// ─────────────────────────────────────────────────────────────────────────────
section("8 · two judges of one name on one court are dropped and the drop is reported");

eq(J.collisions().length, 0, "the shipped roster already has a name collision in it");
{
  // Inject a twin of the standing judge into the shipped data and re-run the
  // shipped resolver — no paraphrase of the rule.
  const src = R("judicial-data.js").replace(
    "  window.PDX_JUDICIAL = {",
    `  JUDGES.twin_probe = JSON.parse(JSON.stringify(JUDGES.${PID}));
  JUDGES.twin_probe.pid = 'twin_probe';
  SLATES[2026].supreme.pids.push('twin_probe');
  window.PDX_JUDICIAL = {`);
  const w = sandbox({ reps: UTAH, src: { "judicial-data.js": src } });
  const Jt = w.PDXJudicial;
  eq(Jt.collisions().length, 1, "a duplicated name on one court was not detected as a collision");
  const b = Jt.ballot(UTAH);
  eq(b.rows.length, 0, "a name the roster cannot tell apart was still printed as a ballot question");
  ok(b.missing.some((m) => m.indexOf("share this name") > -1),
     "the dropped collision was swallowed rather than reported");
  has(w.PDXJudgeFile._html(Jt.judge(PID)), "share this name",
      "the judge file does not say that two records on this court share the name");
}

// ─────────────────────────────────────────────────────────────────────────────
// 9 · The archive listing
// ─────────────────────────────────────────────────────────────────────────────
section("9 · the archive lists Utah courts, alphabetically, with no party and no composite");

{
  const groups = J.archive();
  eq(groups.length, 5, "the archive does not list all five Utah court classes");
  eq(groups.map((g) => g.label)[0], "Utah · Supreme Court",
     "the archive heading is not state · court, which is the one true thing a roster slice can say");
  const sup = groups.find((g) => g.key === "supreme");
  const names = sup.rows.map((r) => r.name);
  eq(names.join(","), names.slice().sort((a, b) => a.localeCompare(b)).join(","),
     "the archive's court listing is not alphabetical");
  groups.filter((g) => !g.rows.length).forEach((g) => {
    has(g.note, "on file yet", `the empty ${g.key} listing does not say it is empty`);
  });

  // Renders for a reader in Ohio, unchanged — a roster slice makes no seat claim.
  const wOh = sandbox({ reps: OHIO, runTimers: true });
  const arch = wOh.PDXJudicialBallot._arch();
  has(arch, "Utah · Supreme Court", "the archive stopped listing Utah courts for a reader outside Utah");
  has(arch, "not a ballot", "the archive listing does not disclaim being a ballot");
  has(arch, "not a claim that these questions are on your ballot",
      "the archive listing does not disclaim the reader's ballot in words");
  lacks(claims(arch), "your ballot",
        "the archive listing makes a claim about the reader's ballot outside its own disclaimer");
  lacks(arch, "represents you", "the archive listing claims to name someone who represents the reader");
  ok(wOh.__byId["jr-arch"], "the archive listing did not mount for a reader outside Utah");
  // No party chip, no composite.
  ["party", "%", "score"].forEach((t) => {
    lacks(claims(arch), t, `the archive listing carries "${t}" as a claim, which a roster slice of a non-partisan office cannot have`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 · Wiring
// ─────────────────────────────────────────────────────────────────────────────
section("10 · loaded, precached, and version-noted");

["judicial-data.js", "judicial-retention.js", "judge-file.js", "judicial-ballot.js"].forEach((f) => {
  has(INDEX, `<script defer src="/${f}"></script>`, `${f} is not loaded from index.html`);
});
has(INDEX, 'href="/judicial-retention.css" media="print"',
    "the judicial stylesheet is not on the non-blocking path");
has(INDEX, '<noscript><link rel="stylesheet" href="/judicial-retention.css" /></noscript>',
    "the judicial stylesheet has no noscript fallback");
// Data before the object before the surfaces.
{
  const at = (f) => INDEX.indexOf(`src="/${f}"`);
  ok(at("judicial-data.js") < at("judicial-retention.js"),
     "the retention object loads before its data");
  ok(at("judicial-retention.js") < at("judge-file.js") &&
     at("judicial-retention.js") < at("judicial-ballot.js"),
     "a judicial surface loads before the object it reads");
  ok(at("person-file.js") < at("judge-file.js"),
     "judge-file.js loads before person-file.js, which owns the address it stamps");
}

// The service worker: bumped, and the note names every changed precached asset.
{
  const m = /const CACHE_VERSION = '(v\d+)'/.exec(SW);
  must(m, "sw.js no longer declares a cache version — this probe is stale");
  eq(m[1], "v127", "the cache version was not bumped for this pass");
  const note = SW.slice(SW.indexOf("// v127"), SW.indexOf("\n//\n// v126"));
  must(note.length > 400, "the v127 note could not be sliced — this probe is stale");
  ["judicial-data.js", "judicial-retention.js", "judge-file.js", "judicial-ballot.js",
   "judicial-retention.css", "person-file.js", "index.html"].forEach((f) => {
    has(note, f, `the v127 note does not name ${f}, which this pass changed and the shell precaches`);
  });
  FILES.forEach((f) => {
    has(SW, `'/${f}'`, `${f} is not precached, so a shared /p/<judge> link would open a file with no renderer`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 11 · Load-bearing — remove one guard at a time, and it must be CAUGHT
// ─────────────────────────────────────────────────────────────────────────────
section("11 · every added guard is load-bearing");

const RET_FILE = R("judicial-retention.js");
const JF_FILE = R("judge-file.js");

function mutant(file, from, to) {
  const src = file === "judicial-retention.js" ? RET_FILE : JF_FILE;
  must(src.includes(from), `the load-bearing probe could not find ${JSON.stringify(from.slice(0, 48))} — this probe is stale`);
  return sandbox({ reps: UTAH, runTimers: true, src: { [file]: src.replace(from, to) } });
}

// The Utah gate. Break it and an Ohio ballot gets Utah judges.
{
  const w = mutant("judicial-retention.js",
                   "if (String(out.state).trim().toLowerCase() !== 'utah') {",
                   "if (false) {");
  const b = w.PDXJudicial.ballot(OHIO);
  ok(b.rows.length > 0,
     "CAUGHT NOTHING: removing the Utah gate did not put a Utah judge on an Ohio ballot, so the gate is not what keeps them off it");
}

// The retention-date gate. The shipped slate happens to hold only judges whose
// retention date IS on file, so the gate has to be exercised against a slate
// that also names one whose date is not — which is the realistic case the
// moment a name is added ahead of its date. Shipped code: the dateless judge is
// not on the ballot. Gate removed: they are, with no date on the row.
{
  const DATELESS = Object.keys(W.PDX_JUDICIAL.JUDGES)
    .find((pid) => !W.PDX_JUDICIAL.JUDGES[pid].retention &&
                   W.PDX_JUDICIAL.JUDGES[pid].court === "supreme" &&
                   W.PDX_JUDICIAL.JUDGES[pid].seated !== false &&
                   !W.PDX_JUDICIAL.JUDGES[pid].former);
  must(DATELESS, "no seated judge lacks a retention date — this probe is stale");
  const data = R("judicial-data.js").replace(
    "  window.PDX_JUDICIAL = {",
    `  SLATES[2026].supreme.pids.push('${DATELESS}');
  window.PDX_JUDICIAL = {`);
  const shipped = sandbox({ reps: UTAH, src: { "judicial-data.js": data } });
  eq(shipped.PDXJudicial.ballot(UTAH).rows.map((r) => r.pid).join(","), PID,
     "a judge whose next retention date is not on file was printed as a question on the ballot");
  const broken = sandbox({
    reps: UTAH,
    src: {
      "judicial-data.js": data,
      "judicial-retention.js": RET_FILE.replace("if (!rt.stands) return;", ""),
    },
  });
  const rows = broken.PDXJudicial.ballot(UTAH).rows;
  ok(rows.length > 1 && rows.some((r) => !r.date),
     "CAUGHT NOTHING: removing the retention-date gate did not put a dateless judge on the ballot, so the gate is not what keeps them off it");
}

// The collision drop.
{
  const src = R("judicial-data.js").replace(
    "  window.PDX_JUDICIAL = {",
    `  JUDGES.twin_probe = JSON.parse(JSON.stringify(JUDGES.${PID}));
  JUDGES.twin_probe.pid = 'twin_probe';
  SLATES[2026].supreme.pids.push('twin_probe');
  window.PDX_JUDICIAL = {`);
  const broken = RET_FILE.replace(
    "if (j.ambiguous) { dropped.push(j.courtLabel + ' — two records share this name'); return; }", "");
  must(broken !== RET_FILE, "the collision drop could not be located — this probe is stale");
  const w = sandbox({ reps: UTAH, src: { "judicial-data.js": src, "judicial-retention.js": broken } });
  ok(w.PDXJudicial.ballot(UTAH).rows.length > 0,
     "CAUGHT NOTHING: removing the collision drop still produced no rows, so fail-closed is not what suppresses a duplicated name");
}

// The judge intercept in openModal.
{
  const w = mutant("judge-file.js", "if (isJudge(id)) {", "if (false) {");
  w.openModal(PID);
  ok(w.__roster.indexOf(PID) > -1,
     "CAUGHT NOTHING: removing the judge intercept did not send the judge to the roster renderer, so the intercept is not what keeps them apart");
  const clean = sandbox({ reps: UTAH, runTimers: true });
  clean.openModal(PID);
  eq(clean.__roster.length, 0, "the shipped intercept lets a judge reach the roster renderer");
}

console.log("");
if (failures.length) {
  console.error(`✗ judicial retention: ${failures.length} failure(s), ${passed} passed\n`);
  failures.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log(`✓ judicial retention: a retention seat is an office on a ballot and never a grade — ${passed} assertions passed\n`);
