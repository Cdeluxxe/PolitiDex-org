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
//  3b. THE GEOGRAPHY IS THE STATUTE'S. Utah Code § 78A-1-102 divides the
//      district and juvenile courts into eight divisions covering twenty-nine
//      counties. A voter gets the statewide courts plus their OWN division and
//      no other, the map exists in exactly one place, and a county the map
//      cannot place gets the missing-map sentence rather than the nearest
//      judge. Seated is not standing: the 2026 slate is a separate structure
//      naming the Lieutenant Governor's filed questions verbatim, and a judge
//      who left the court is on no ballot anywhere.
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

// The location owner publishes `county`, and the retention band reads it from
// there. These fixtures are the resolver's output shape, not a location the
// band went and found for itself.
const UTAH = {
  located: true, national: false, state: "Utah", area: "Davis County",
  county: "Davis County", districtsResolvable: true, levels: [],
};
const BOXELDER = {
  located: true, national: false, state: "Utah", area: "Box Elder County",
  county: "Box Elder County", districtsResolvable: true, levels: [],
};
// Utah, and no county came back from the resolver.
const UTAH_NOCOUNTY = {
  located: true, national: false, state: "Utah", area: "Utah",
  county: "", districtsResolvable: true, levels: [],
};
// Utah, and a county the statute's map does not contain. Not a Utah county at
// all, which is exactly the shape of a resolver answer we must not place.
const UTAH_OFFMAP = {
  located: true, national: false, state: "Utah", area: "Elsewhere",
  county: "Beaverhead County", districtsResolvable: true, levels: [],
};
// A county name on a non-Utah location must not open any door on its own.
const OHIO = {
  located: true, national: false, state: "Ohio", area: "Columbus",
  county: "Franklin County", districtsResolvable: false, levels: [],
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

// What SHOULD be on one county's ballot, computed here from the roster and the
// statute's district table rather than from ballot() — otherwise the test would
// be asking the code under test whether it agrees with itself. Statewide courts
// are on every Utah ballot; a trial court is on the ballot of the counties in
// its own division and no others.
const DISTRICTS = W.PDX_JUDICIAL.DISTRICTS;
must(DISTRICTS && DISTRICTS.length === 8,
     "the eight geographical divisions are not on file — this probe is stale");
const STATEWIDE = W.PDX_JUDICIAL.COURTS
  .filter((c) => c.scope === "statewide").map((c) => c.key);
function districtOfCounty(county) {
  const key = (s) => String(s).toLowerCase().replace(/county/g, "").replace(/[^a-z]+/g, "");
  const hit = DISTRICTS.find((d) => d.counties.some((c) => key(c) === key(county)));
  return hit ? hit.n : null;
}
function expectedRows(county) {
  const n = districtOfCounty(county);
  return Object.keys(W.PDX_JUDICIAL.JUDGES)
    .filter((pid) => {
      const j = W.PDX_JUDICIAL.JUDGES[pid];
      if (!j.retention) return false;
      if (STATEWIDE.indexOf(j.court) > -1) return true;
      return n != null && j.district === n;
    })
    .sort();
}
// The judge whose file carries the court-level public lane, so the copy probes
// downstream have something to read. Named by court, not by position in a sorted
// list, because that list is now thirty-two rows long.
const PID = STANDING.find((pid) => W.PDX_JUDICIAL.JUDGES[pid].court === "supreme");
must(PID, "no Supreme Court judge stands for retention — this probe is stale");

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

// Two real counties in two different divisions. Each one gets the statewide
// courts plus the trial-court judges of ITS OWN division, and no judge from
// anybody else's.
[["Davis County", UTAH, 2], ["Box Elder County", BOXELDER, 1]].forEach(([label, reps, n]) => {
  const b = J.ballot(reps);
  eq(b.utah, true, `${label} was not recognised as Utah`);
  eq(b.county, label, `${label} did not survive from the resolver onto the ballot answer`);
  eq(b.district, n, `${label} was not placed in the ${n}th judicial district`);
  eq(b.rows.map((r) => r.pid).sort().join(","), expectedRows(label).join(","),
     `the retention rows for ${label} are not the statewide judges plus that county's own division`);
  ok(b.rows.length > 1,
     `${label} got one row or none, which is the silent hole this pass exists to close`);

  // The order's own test: no judge from a different district, ever.
  b.rows.forEach((r) => {
    if (r.district == null) return;
    eq(r.district, n,
       `${label} was shown a judge from the ${r.district}th district, whose voters are not this voter`);
  });
  // And the statewide rows really are statewide, not district rows with a
  // missing number.
  const sw = b.rows.filter((r) => STATEWIDE.indexOf(r.courtKey) > -1);
  ok(sw.length >= 2, `${label} lost the statewide retention questions`);
  sw.forEach((r) => {
    eq(r.unitLabel, "Statewide", `a statewide row on ${label} does not say it is statewide`);
    eq(r.district, null, `a statewide row on ${label} carries a judicial district it does not have`);
  });

  b.rows.forEach((r) => {
    // The state's own wording, which is "be retained in the office of ...?" —
    // not a sentence this codebase composes. What is asserted is that it IS the
    // yes/no retention question and that it is a question.
    has(r.question, "be retained", "a retention row is not phrased as the ballot's retention question");
    ok(/\?$/.test(String(r.question)), "a retention row is not phrased as a question");
    eq(r.certified, true,
       "a retention row does not carry the certification of the list it came from");
    has(String(r.date), "2026-11-03", "a retention row is not dated to the 2026 election");
  });
  ok(b.certified, "the ballot does not report the official 2026 list as certified");
  eq(b.note, "", "the ballot still carries the uncertified-list warning");
  lacks(b.note, "not on file", "the ballot says the official list is missing when it is on file");

  // The Court of Appeals stands statewide, so it is on this ballot exactly as
  // the Supreme Court is.
  const coa = b.courts.find((c) => c.key === "appeals");
  must(coa, "the Court of Appeals is not reported on a Utah ballot at all — this probe is stale");
  eq(coa.status, "rows", `${label} was told the Court of Appeals has no question`);
  ok(coa.count >= 1, `${label} got no Court of Appeals rows`);

  // Justice courts are still unmapped, and now the sentence names the county.
  const jc = b.courts.find((c) => c.key === "justice");
  eq(jc.status, "unmapped", "the justice court claims a map it does not have");
  eq(jc.count, 0, "the justice court produced rows from a roster we do not hold");
  has(jc.note, label, "the justice court's missing-roster sentence does not name the county");
  has(jc.note, "no Justice Court roster",
      "the justice court does not say the roster is what is missing");
  ok(b.missing.some((m) => m.indexOf("Justice Court") > -1),
     "the missing justice court roster is not reported at all");
});

// Two different counties are two different ballots. A district judge on one is
// not on the other, which is the whole point of the map.
{
  const trial = (reps) => J.ballot(reps).rows
    .filter((r) => r.district != null).map((r) => r.pid);
  const davis = trial(UTAH);
  const box = trial(BOXELDER);
  ok(davis.length > 0 && box.length > 0,
     "one of the two probe counties produced no trial-court rows — this probe is stale");
  eq(davis.filter((p) => box.indexOf(p) > -1).length, 0,
     "a trial-court judge appears on the ballots of two different judicial districts");
}

// A county the map does not contain, and no county at all: the same fail-closed
// answer this pass shipped when there was no map for anybody. A missing map is
// reported as a missing map, and nothing is invented to fill the row.
[["off the map", UTAH_OFFMAP, "Beaverhead County"], ["with no county", UTAH_NOCOUNTY, ""]]
  .forEach(([what, reps, county]) => {
    const b = J.ballot(reps);
    eq(b.utah, true, `a Utah location ${what} was not recognised as Utah`);
    eq(b.district, null, `a Utah location ${what} was placed in a judicial district anyway`);
    eq(b.rows.filter((r) => r.district != null).length, 0,
       `a Utah location ${what} was handed trial-court rows from geography we cannot place`);
    // The statewide questions still stand: they resolve from the STATE, and the
    // county has nothing to do with them.
    ok(b.rows.length >= 2,
       `a Utah location ${what} lost the statewide retention questions, which do not need a county`);

    const unmapped = b.courts.filter((c) => c.status === "unmapped").map((c) => c.key).sort();
    eq(unmapped.join(","), "district,justice,juvenile",
       `the courts PolitiDex cannot place a voter ${what} inside are not reported as unmapped`);
    b.courts.filter((c) => c.status === "unmapped").forEach((c) => {
      eq(c.count, 0, `the ${c.key} court produced rows from geography we do not hold`);
      has(c.note, "is claimed for your ballot",
          `the ${c.key} court does not say that no question is claimed`);
      if (c.key === "justice") return;
      // Two different failures, two different sentences. "We hold no map for
      // your county" and "we could not work out your county" are not the same
      // news, and a reader can act on the difference.
      if (county) {
        has(c.note, "no " + c.unit + " map",
            `the ${c.key} court does not say the ${c.unit} map is what is missing`);
        has(c.note, county, `the ${c.key} court does not name the county it cannot place`);
      } else {
        has(c.note, "could not resolve your county",
            `the ${c.key} court does not say that the county is what could not be resolved`);
      }
      has(c.note, "decided by the voters of each " + c.unit,
          `the ${c.key} court does not say whose question it is`);
    });
    ok(b.missing.length >= 3, "the missing judicial-district maps are not reported at all");
    // No judge name reaches the rendered band from an unplaceable trial court.
    const w = sandbox({ reps: reps });
    const band = w.PDXJudicialBallot._band();
    Object.keys(w.PDX_JUDICIAL.JUDGES)
      .filter((pid) => w.PDX_JUDICIAL.JUDGES[pid].district != null)
      .forEach((pid) => {
        lacks(band, w.PDX_JUDICIAL.JUDGES[pid].name,
              `a trial-court judge was named on a ballot ${what} (${pid})`);
      });
  });

// Where two official sources disagree about which court a seat sits on, the
// ballot says so and resolves neither.
{
  const conflicted = Object.keys(W.PDX_JUDICIAL.JUDGES)
    .filter((pid) => W.PDX_JUDICIAL.JUDGES[pid].slateConflict);
  ok(conflicted.length > 0,
     "no source conflict is on file, so the name-both-resolve-neither path cannot be tested");
  conflicted.forEach((pid) => {
    const j = J.judge(pid);
    const b = J.ballot({ located: true, state: "Utah", county: J.district(j.district).counties[0] });
    const row = b.rows.find((r) => r.pid === pid);
    must(row, `the conflicted judge ${pid} is not on their own district's ballot — this probe is stale`);
    has(row.conflict, "official", `the conflict on ${pid}'s row does not name the sources as official`);
    ok(row.filedOffice.length > 0,
       `${pid}'s row does not carry the office the state filed the question under`);
    // The verbatim filed question, typo and all, is what renders.
    eq(row.question, J.slateQuestion(pid).question,
       `${pid}'s row paraphrases the filed retention question instead of printing it`);
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
  lacks(band, "be retained", "an Ohio ballot was asked a Utah retention question");
  lacks(band, "Judicial District",
        "an Ohio ballot was offered a Utah judicial district");
  ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth"].forEach((o) => {
    lacks(band, o + " Judicial District",
          `an Ohio ballot named the ${o} Judicial District of Utah`);
  });
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
  has(band.innerHTML, "be retained", "the mounted band does not carry the retention question");
  // The unit each row was resolved by, on the row. On a ballot that now runs
  // five courts, "why is this judge on MY ballot" is answered by that label.
  has(band.innerHTML, "Statewide", "the mounted band does not say which rows stand statewide");
  has(band.innerHTML, "Judicial District",
      "the mounted band does not name the judicial district its trial-court rows came from");
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
// 3b · The map is the statute's, it is complete, and there is only one of it
// ─────────────────────────────────────────────────────────────────────────────
section("3b · the county map is the statute's eight divisions, once");

{
  // Utah Code § 78A-1-102 divides the district and juvenile courts into eight
  // geographical divisions covering all twenty-nine counties. Every county
  // appears exactly once: a county in two divisions would put a voter on two
  // ballots, and a missing county would read as "we do not map Utah" to
  // somebody who lives there.
  const counties = [];
  DISTRICTS.forEach((d) => d.counties.forEach((c) => counties.push(c)));
  eq(counties.length, 29, "the eight divisions do not cover twenty-nine counties");
  eq(new Set(counties.map((c) => c.toLowerCase())).size, 29,
     "a county appears in more than one judicial district");
  eq(DISTRICTS.map((d) => d.n).join(","), "1,2,3,4,5,6,7,8",
     "the judicial districts are not the statute's eight, numbered one through eight");
  DISTRICTS.forEach((d) => {
    ok(d.counties.length > 0, `the ${d.n}th judicial district has no counties`);
    has(d.label, "Judicial District", `the ${d.n}th district's label does not name it as one`);
    ok(!!d.juvenileLabel, `the ${d.n}th district carries no juvenile court label`);
  });
  // Every county resolves, from every spelling a resolver might hand over.
  counties.forEach((c) => {
    [c, c + " County", c.toLowerCase(), c.toUpperCase() + " COUNTY"].forEach((spelling) => {
      const hit = J.districtForCounty(spelling);
      ok(hit && hit.n === districtOfCounty(c),
         `"${spelling}" does not resolve to the district the statute puts it in`);
    });
  });
  // And a county that is not Utah's resolves to nothing rather than to district one.
  ["", null, undefined, "Beaverhead County", "Cook County", "0", "County"].forEach((bad) => {
    eq(J.districtForCounty(bad), null,
       `"${bad}" was placed inside a Utah judicial district`);
  });

  // The map exists once. A second copy of the county list anywhere else is a
  // second doctrine, and this is the file that would drift first.
  ["Box Elder", "Sanpete", "Daggett"].forEach((county) => {
    lacks(RET_SRC, "'" + county + "'",
          `judicial-retention.js keeps its own copy of the county map (${county})`);
    lacks(JB_SRC, county, `judicial-ballot.js resolves counties for itself (${county})`);
    lacks(JF_SRC, county, `judge-file.js resolves counties for itself (${county})`);
  });
  has(DATA_SRC, "78A-1-102", "the county map does not cite the statute it came from");
  has(DATA_SRC, "vote.utah.gov", "the 2026 slate does not cite the official list it came from");
  has(DATA_SRC, "utcourts.gov", "the roster does not cite the official directory it came from");
}

// The roster and the slate are separate things, and seated is not standing.
{
  const JUD = W.PDX_JUDICIAL.JUDGES;
  const S = W.PDX_JUDICIAL.SLATES["2026"];
  let filed = 0;
  Object.keys(S).forEach((courtKey) => {
    const sl = S[courtKey];
    ok(sl.certified === true, `the 2026 ${courtKey} slate is not marked certified`);
    ok(/^https:\/\//.test(String(sl.source)), `the 2026 ${courtKey} slate carries no https source`);
    eq(sl.pids.length, sl.questions.length,
       `the 2026 ${courtKey} slate's pid list and question list are different lengths`);
    sl.questions.forEach((q) => {
      filed++;
      const j = JUD[q.pid];
      must(j, `the 2026 slate names ${q.pid}, who is not in the roster — this probe is stale`);
      eq(j.court, courtKey,
         `${q.pid} is filed under ${courtKey} but the roster puts them on another court`);
      eq(j.retention, "2026-11-03", `${q.pid} is on the 2026 slate with no retention date`);
      has(q.question, "be retained", `${q.pid}'s filed question is not a retention question`);
      ok(!!q.status, `${q.pid}'s filing carries no status`);
      // A judge the roster places on a trial court is filed for that judge's
      // own district. The map is what decides who votes on the question, so a
      // mismatch here would put the question in front of the wrong counties.
      if (j.district != null) {
        eq(q.district, j.district,
           `${q.pid} is filed for the ${q.district}th district but sits in the ${j.district}th`);
      }
    });
  });
  ok(filed > 20, "the 2026 slate holds fewer questions than a Utah ballot carries");

  // Seated is not standing. Most of the bench is not on this ballot, and the
  // roster says so by leaving `retention` null rather than by omitting them.
  const seated = Object.keys(JUD).filter((pid) => JUD[pid].seated !== false && !JUD[pid].former);
  ok(seated.length > filed,
     "every seated judge is on the 2026 ballot, which is not how a staggered retention cycle works");
  Object.keys(JUD).forEach((pid) => {
    const j = JUD[pid];
    if (j.former || j.seated === false) {
      eq(j.retention, null,
         `${pid} has left the court or is unconfirmed and is still standing for retention`);
    }
    // A trial-court judge without a district cannot be placed on any ballot,
    // and an appellate judge with one would imply a boundary that does not exist.
    if (j.court === "district" || j.court === "juvenile") {
      ok(j.district >= 1 && j.district <= 8, `${pid} sits on a trial court with no judicial district`);
    } else {
      eq(j.district || null, null, `${pid} stands statewide and carries a judicial district`);
    }
  });
  // Departed justices stay off the band, wherever the reader is standing.
  const gone = Object.keys(JUD).filter((pid) => JUD[pid].former);
  ok(gone.length > 0, "no departed judge is on file, so the off-the-band path cannot be tested");
  gone.forEach((pid) => {
    [UTAH, BOXELDER, UTAH_NOCOUNTY].forEach((reps) => {
      lacks(sandbox({ reps }).PDXJudicialBallot._band(), JUD[pid].name,
            `a judge who left the court is on the retention band (${pid})`);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The judge file paints no figure
// ─────────────────────────────────────────────────────────────────────────────
section("4 · the judge file leads with the court, and carries no score of any kind");

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
  "Door 2 band (Davis County)": sandbox({ reps: UTAH }).PDXJudicialBallot._band(),
  "Door 2 band (Box Elder County)": sandbox({ reps: BOXELDER }).PDXJudicialBallot._band(),
  "Door 2 band (Utah, county unresolved)": sandbox({ reps: UTAH_NOCOUNTY }).PDXJudicialBallot._band(),
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
  // And it stays on the court it was reported about. The campaign note is
  // Supreme Court reporting; a district judge's file must not inherit it, which
  // is what "invented onto a judge" would look like in rendered output.
  const claim = rows[0].what.slice(0, 60);
  Object.keys(W.PDX_JUDICIAL.JUDGES)
    .filter((pid) => W.PDX_JUDICIAL.JUDGES[pid].court !== "supreme")
    .forEach((pid) => {
      lacks(W.PDXJudgeFile._html(J.judge(pid)), claim,
            `a Supreme Court campaign note was printed on a ${W.PDX_JUDICIAL.JUDGES[pid].court} judge's file (${pid})`);
    });
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
  // The twin and the judge it duplicates are BOTH dropped — neither can be
  // named honestly — while every row the roster can still tell apart survives.
  // Asserting an empty ballot would pass for the wrong reason on a ballot that
  // now carries a dozen rows.
  eq(b.rows.filter((r) => r.pid === PID || r.pid === "twin_probe").length, 0,
     "a name the roster cannot tell apart was still printed as a ballot question");
  ok(b.rows.length > 0,
     "the collision took the whole ballot down with it instead of dropping the two rows it affects");
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
  // v130 is this pass's floor, not its ceiling. The assertion was written the
  // day v130 shipped and read as an equality; later passes bump the shell for
  // their own reasons, and a warm device is only ever wrong if the version goes
  // BACKWARDS past the pass that needed it. So the floor is what is checked, and
  // the v130 note below is still required to be present and intact.
  ok(Number(m[1].slice(1)) >= 130,
     `the cache version fell below v130, the pass that took the live-ballot hero off files that are not on a ballot — got ${m[1]}`);
  // v130 took the live-ballot hero off the files that are not on a ballot. The
  // note names the modules that moved and says the two things a reader
  // upgrading a warm device needs: which surface changed, and that the judge
  // who left keeps her file.
  const note130 = SW.slice(SW.indexOf("// v130"), SW.indexOf("\n// v129 - THE EYE FOUND"));
  must(note130.length > 400, "the v130 note could not be sliced — this probe is stale");
  ["judicial-retention.js", "judge-file.js", "judicial-retention.css",
   "all-seeing-eye.js"].forEach((f) => {
    has(note130, f, `the v130 note does not name ${f}, which this pass changed`);
  });
  has(note130, "standing(", "the v130 note does not name the one status reader this pass added");
  has(note130, "CMP_DATA", "the v130 note does not say judges stayed out of CMP_DATA");
  has(note130, "Direction Match", "the v130 note does not say Direction Match is untouched");
  ok(SW.indexOf("// v130") < SW.indexOf("// v129 - THE EYE FOUND"),
     "the v130 note was filed below the v129 note it follows");
  // v129 opened the Eye onto the judge files v128 built. The note names the
  // judicial modules it touched, and says the two things a reader upgrading a
  // warm device most needs to hear: that the arithmetic did not move, and that
  // judges are still out of the roster the arithmetic reads.
  const note129 = SW.slice(SW.indexOf("// v129 - THE EYE FOUND"), SW.indexOf("\n// v128 - ONE JUDGE"));
  must(note129.length > 400, "the v129 note could not be sliced — this probe is stale");
  ["judicial-retention.js", "all-seeing-eye.js", "judge-file.js", "firebase-boot.js",
   "judicial-retention.css"].forEach((f) => {
    has(note129, f, `the v129 note does not name ${f}, which this pass changed`);
  });
  has(note129, "CMP_DATA", "the v129 note does not say judges stayed out of CMP_DATA");
  has(note129, "Direction Match", "the v129 note does not say Direction Match is untouched");
  // The v128 note is still below it, unedited: notes are newest-first, and a
  // note is a record of what shipped rather than a document to be revised.
  const note = SW.slice(SW.indexOf("// v128 - ONE JUDGE"), SW.indexOf("\n// v127 - A BALLOT"));
  must(note.length > 400, "the v128 note could not be sliced — this probe is stale");
  // Every file the v128 pass changed, still named in its note. voter-hub-location.js
  // is the one that is NOT precached, and the note has to say so — a runtime asset
  // whose stale copy the rename drops is a different mechanism from a shell
  // asset the rename replaces, and a reader upgrading a warm device needs the
  // difference.
  ["judicial-data.js", "judicial-retention.js", "judge-file.js", "judicial-ballot.js",
   "judicial-retention.css", "voter-hub-location.js"].forEach((f) => {
    has(note, f, `the v128 note does not name ${f}, which that pass changed`);
  });
  has(note, "78A-1-102", "the v128 note does not cite the statute the new map came from");
  has(note, "RUNTIME entry",
      "the v128 note does not say that the changed location owner is a runtime asset rather than a precached one");
  has(note, "seats()", "the v128 note no longer says the band stays out of the seat denominator");
  ok(SW.indexOf("// v129 - THE EYE FOUND") < SW.indexOf("// v128 - ONE JUDGE"),
     "the v129 note was filed below the v128 note it follows");
  ok(SW.indexOf("// v128 - ONE JUDGE") < SW.indexOf("// v127 - A BALLOT THAT NAMED SIX SEATS"),
     "the v128 note was filed below the v127 note it follows");
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
  const shippedRows = shipped.PDXJudicial.ballot(UTAH).rows.map((r) => r.pid);
  eq(shippedRows.indexOf(DATELESS), -1,
     "a judge whose next retention date is not on file was printed as a question on the ballot");
  ok(shippedRows.indexOf(PID) > -1,
     "the date gate took a dated judge off the ballot along with the dateless one");
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

// The district filter. Break it and a Davis County voter is handed the judges
// of all eight divisions — the single most plausible way this pass could ship a
// wrong answer that still looks like an answer.
{
  const w = mutant("judicial-retention.js",
                   "var tr = rowsFor(c, function (j) { return j.district === dd.n; });",
                   "var tr = rowsFor(c, function (j) { return !!j.district; });");
  const rows = w.PDXJudicial.ballot(UTAH).rows;
  ok(rows.some((r) => r.district != null && r.district !== 2),
     "CAUGHT NOTHING: removing the district filter did not put another division's judge on a Davis County ballot, so the filter is not what keeps them off it");
}

// The fail-closed branch for a county the map cannot place. Break it and an
// unplaceable county falls through to whatever the next branch does.
{
  const w = mutant("judicial-retention.js", "if (!dd) {", "if (false) {");
  // A throw counts as caught: with the branch gone the code walks straight into
  // the district it could not resolve. What must NOT happen is a clean answer
  // that quietly stops reporting the missing map.
  let threw = false;
  let b = null;
  try { b = w.PDXJudicial.ballot(UTAH_OFFMAP); } catch (e) { threw = true; }
  ok(threw || b.courts.filter((c) => c.status === "unmapped")
       .map((c) => c.key).indexOf("district") === -1,
     "CAUGHT NOTHING: removing the unplaceable-county branch still reported the district map as missing, so the branch is not what reports it");
}

// The county the location owner publishes. voter-hub-location.js needs far more
// DOM than this harness builds, so it is NOT loaded in the sandbox and this is
// not a mutation probe — it is two assertions with no pretence otherwise:
// the field still exists in the owner and is still match-and-Utah gated, and
// the shape it hands over without a county fails closed here.
{
  const VHL = R("voter-hub-location.js");
  const from = "county: (matched && krd && krd.county) ? String(krd.county) : '',";
  ok(VHL.includes(from),
     "the location owner no longer publishes the county the retention band reads, or publishes it ungated by `matched`");
  // The county comes off the curated area the resolver already matched. A
  // second reader of the raw location would be a second answer to where the
  // voter lives, which is the thing one-owner exists to prevent.
  lacks(RET_SRC, "_currentVoterLocation",
        "judicial-retention.js reads the voter's location itself");
  lacks(RET_SRC, "keyRacesRelevantData",
        "judicial-retention.js resolves the county itself instead of reading the resolver's answer");

  const noCounty = {};
  Object.keys(UTAH).forEach((k) => { if (k !== "county") noCounty[k] = UTAH[k]; });
  const b = J.ballot(noCounty);
  eq(b.rows.filter((r) => r.district != null).length, 0,
     "a resolver answer with no county in it still produced trial-court rows, so something other than the published county is placing this voter");
  eq(b.district, null, "a voter with no published county was placed in a judicial district anyway");
}

// The filed-elsewhere note. Two official sources disagree about which court
// holds one seat; remove the note and the court the question was FILED under
// goes quiet about it, which is the page resolving the conflict silently.
{
  const conflicted = Object.keys(W.PDX_JUDICIAL.JUDGES)
    .find((pid) => W.PDX_JUDICIAL.JUDGES[pid].slateConflict);
  must(conflicted, "no source conflict is on file — this probe is stale");
  const county = J.district(J.judge(conflicted).district).counties[0];
  const reps = { located: true, state: "Utah", county: county, levels: [] };
  const filedKey = J.slateQuestion(conflicted).filedCourt;
  const shippedNote = J.ballot(reps).courts.find((c) => c.key === filedKey).note;
  has(shippedNote, "resolves neither",
      "the court the question was filed under does not say the conflict is unresolved");
  const w = mutant("judicial-retention.js",
                   "var elsewhere = tr.rows.length ? [] : filedFor(c.key, dd.n, ELECTION.year)\n" +
                   "          .filter(function (q) { return q.rosterCourt !== c.key; });",
                   "var elsewhere = [];");
  const note = w.PDXJudicial.ballot(reps).courts.find((c) => c.key === filedKey).note;
  ok(note.indexOf("resolves neither") === -1,
     "CAUGHT NOTHING: removing the filed-elsewhere lookup left the conflict reported anyway, so the lookup is not what reports it");
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
