/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — ✒️ EER coverage gate + served standing (Axis B)
   ────────────────────────────────────────────────────────────────────────────
   Two things ship together here and this harness gates both, because each one is
   only honest in the presence of the other:

     1 · THE COVERAGE GATE. The lane holds a rich record for one figure. Rendered
         without qualification that reads as a finished lane, and a profile with no
         ✒️ section reads as a figure who has taken no formal action. The gate
         declares, in counts the reader can check, how much of the lane exists —
         and refuses to let anything rank or compare across figures while it is a
         pilot.

     2 · THE SERVED STANDING LOG. vr_exec_action_status was seeded by two applied
         migrations and read by nothing: the measure API returned positions with no
         join to it, so every "blocked by court order" and "challenged in court — no
         ruling on file" row sat in the database unreachable. It is now served and
         rendered, whole and append-only, with each entry's own citation.

   WHAT THIS HARNESS REFUSES TO ACCEPT
     · A gate whose numbers are typed in rather than counted — it would go stale
       behind the data and keep claiming a pilot after the lane was built out, or
       claim a built-out lane while one figure is on file.
     · A "current standing" that appears where nothing citable is on file. Silence
       must never be served as "in force".
     · A collapsed log. One row per change is the whole point of an append-only
       table; serving only the latest throws away the history it exists to keep.
     · A percentage or a vote word anywhere on either surface.

   Behavioural, not literal, wherever it can be: the source rule, the vocabulary
   set and the render functions are extracted from the shipped files and executed
   against synthetic rows, so a rename passes and a behaviour change fails.

   Run: node scripts/test-exec-standing.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

// A probe that cannot find its target proves nothing. Exit 2 rather than report a
// green run over contracts that were never evaluated.
function must(cond, what) {
  if (cond) return;
  console.error("\n✗ exec-standing harness is STALE — a contract cannot be verified:");
  console.error("  " + what + "\n");
  console.error("  Restore the probe target, or update this harness AND re-check the");
  console.error("  behaviour it describes.\n");
  process.exit(2);
}

// Brace-scan a plain `function name(...) { … }` out of a source file, honouring
// strings and escapes so a brace inside a string literal cannot end the scan.
function fnSrc(src, name, file) {
  const head = src.indexOf("function " + name + "(");
  must(head !== -1, `${file} no longer defines function ${name}()`);
  const open = src.indexOf("{", head);
  must(open !== -1, `function ${name}() in ${file} has no body`);
  let depth = 0, i = open, inStr = null, esc = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { inStr = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
  }
  must(depth === 0, `could not brace-scan function ${name}() in ${file}`);
  return src.slice(head, i);
}

const SUMKEYS = JSON.parse(read("db/exec-summary-keys.json"));
const FORBIDDEN = new RegExp(SUMKEYS.forbidden.pattern, SUMKEYS.forbidden.flags);
// Non-vacuity: prove the matcher still fires before trusting a clean result from it.
must(FORBIDDEN.test("Voted Yea") && FORBIDDEN.test("62%"),
  "the forbidden-vocabulary matcher no longer fires on vote language or a percentage");

const EXEC_RECORD = read("exec-record.js");
const EXEC_UI = read("exec-record-ui.js");
const BILL = read("bill-detail.js");
const FN = read("netlify/functions/voting-record.mts");

// ─────────────────────────────────────────────────────────────────────────────
// Sandbox: the shipped lane, with the shipped roster and the shipped actions
// ─────────────────────────────────────────────────────────────────────────────
function laneSandbox(opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, RegExp, Object, String, Number, Array, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  // The roster and the action payload are ordinary globals installed by their own
  // files; loading them the way the page does keeps this a test of shipped data.
  if (opts.roster !== null) {
    vm.runInContext(read("cmp-data.js"), ctx, { filename: "cmp-data.js" });
    if (opts.roster) ctx.CMP_DATA = opts.roster;
  }
  if (opts.actions !== null) {
    vm.runInContext(read("exec-action-data.js"), ctx, { filename: "exec-action-data.js" });
    if (opts.actions) ctx.EXEC_ACTIONS = opts.actions;
  }
  vm.runInContext(opts.recordSrc || EXEC_RECORD, ctx, { filename: "exec-record.js" });
  return ctx;
}

const LANE = laneSandbox({});
const EX = LANE.window.PDXExecRecord;
must(!!EX, "exec-record.js did not expose window.PDXExecRecord");
must(typeof EX.coverage === "function", "PDXExecRecord.coverage() is missing — the gate is not exposed");
must(typeof EX.comparable === "function", "PDXExecRecord.comparable() is missing — the non-comparability rule is not exposed");

// ═════════════════════════════════════════════════════════════════════════════
// Contract 1 — the gate reports the lane HONESTLY, from live counts
// ═════════════════════════════════════════════════════════════════════════════
{
  const cov = EX.coverage();
  eq(cov.state, "pilot",
    "the EER declares itself built out. One figure has actions on file; a lane that does\n" +
    "    not say so turns our coverage gap into a claim that other figures acted less.");
  eq(cov.comparable, false,
    "the EER declares itself comparable across figures while one figure is on file");
  eq(EX.comparable(), false, "PDXExecRecord.comparable() disagrees with coverage().comparable");
  eq(cov.onFile, 1, "the covered-figure count is not 1 — the shipped action file holds one figure");

  // The denominator has to be the real roster, not a hard-coded number, or the gate
  // goes stale the moment a governor is added.
  ok(cov.tracked > 50,
    `the gate says it tracks only ${cov.tracked} chief executives; the shipped roster holds far more`);
  const RE_CHIEF = /\b(president|governor|mayor)\b/i;
  const RE_NOT = /\b(candidate|former|lieutenant|vice|deputy|nominee)\b/i;
  let counted = 0;
  for (const pid of Object.keys(LANE.CMP_DATA || {})) {
    const office = String((LANE.CMP_DATA[pid] || {}).office || "");
    if (RE_CHIEF.test(office) && !RE_NOT.test(office)) counted++;
  }
  eq(cov.tracked, counted,
    "the gate's denominator disagrees with a direct count over the shipped roster — it is not derived from the data");

  // The sentence a reader checks. Both live numbers must actually appear in it.
  ok(cov.line.indexOf(String(cov.onFile)) !== -1 && cov.line.indexOf(String(cov.tracked)) !== -1,
    `the coverage sentence does not carry both counts: ${JSON.stringify(cov.line)}`);
  ok(!FORBIDDEN.test(cov.line), `the coverage sentence uses forbidden EER vocabulary: ${JSON.stringify(cov.line)}`);
  for (const k of ["badge", "label", "short", "compare"]) {
    ok(!FORBIDDEN.test(String(cov[k] || "")),
      `coverage.${k} uses forbidden EER vocabulary: ${JSON.stringify(cov[k])}`);
  }
  // The point of the banner is the inference it blocks. It has to say, in words,
  // that an absent section is a gap in our file rather than a finding.
  ok(/gap in our file|nothing recorded yet|has nothing recorded/i.test(cov.short),
    "the pilot copy states the coverage level without stating what an ABSENT section means —\n" +
    "    that inference is the entire failure the gate exists to prevent");
  ok(/not a finding|not a finding that/i.test(cov.short),
    "the pilot copy does not disclaim that absence is a finding about the figure");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 2 — the gate is DERIVED, so it moves when the data moves
// ═════════════════════════════════════════════════════════════════════════════
// Without this the gate could be a constant that happens to read correctly today.
{
  // Nothing on file anywhere → 'none', and still not comparable.
  const empty = laneSandbox({ actions: {} });
  const covNone = empty.window.PDXExecRecord.coverage();
  eq(covNone.state, "none", "with no actions on file the gate does not fall to 'none'");
  eq(covNone.onFile, 0, "with no actions on file the covered count is not 0");
  eq(covNone.comparable, false, "an empty lane declares itself comparable");

  // No roster to check against → the gate stays CLOSED rather than opening because
  // the denominator vanished. Fail closed is the whole posture of this lane.
  const noRoster = laneSandbox({ roster: {} });
  const covBlind = noRoster.window.PDXExecRecord.coverage();
  eq(covBlind.tracked, 0, "an empty roster still reports tracked chief executives");
  eq(covBlind.comparable, false,
    "with no roster to measure against, the gate OPENED. A missing denominator is not evidence of coverage.");

  // …and 'broad' is reachable, so the pilot verdict is a reading of the data rather
  // than the only state the code can produce. Patching the office allow-list is the
  // only way to simulate a built-out lane, since it is what bounds the numerator.
  const threePids =
    "var EXEC_PIDS = {\n" +
    "    trump: { office: 'President of the United States', currentTerm: '47' },\n" +
    "    gov_a: { office: 'Governor', currentTerm: '1' },\n" +
    "    gov_b: { office: 'Governor', currentTerm: '1' }\n" +
    "  };";
  const patched = EXEC_RECORD.replace(
    /var EXEC_PIDS = \{\s*trump: \{ office: 'President of the United States', currentTerm: '47' \}\s*\};/,
    threePids
  );
  must(patched !== EXEC_RECORD, "could not patch EXEC_PIDS — the reachability probe for 'broad' cannot run");
  const oneAction = (term) => ([{
    actionClass: "executive_order",
    documentId: "EO 1", title: "Test order", actedAt: "2025-02-01", term: term,
    sourceUrl: "https://www.federalregister.gov/documents/2025/02/01/2025-00001/test-order",
    sourceLabel: "Federal Register — test order",
    issues: [], status: []
  }]);
  const built = laneSandbox({
    recordSrc: patched,
    roster: { trump: { office: "47th President" }, gov_a: { office: "Governor" }, gov_b: { office: "Governor" }, sen: { office: "U.S. Senator" } },
    actions: { trump: oneAction("47"), gov_a: oneAction("1"), gov_b: oneAction("1") }
  });
  const covBroad = built.window.PDXExecRecord.coverage();
  eq(covBroad.onFile, 3, "the patched lane does not see all three seeded figures");
  eq(covBroad.state, "broad",
    "with every tracked chief executive on file the gate STILL says pilot — it is a constant, not a reading");
  eq(covBroad.comparable, true, "a fully covered lane still refuses comparison — the gate cannot ever open");

  // Three figures on file but a large field → still a pilot. Count alone is not
  // coverage; a section that appears on a sliver of the figures it applies to still
  // reads as a verdict on the ones it skips.
  const roster40 = {};
  for (let i = 0; i < 40; i++) roster40["g" + i] = { office: "Governor" };
  roster40.trump = { office: "47th President" };
  roster40.gov_a = { office: "Governor" };
  roster40.gov_b = { office: "Governor" };
  const sparse = laneSandbox({
    recordSrc: patched, roster: roster40,
    actions: { trump: oneAction("47"), gov_a: oneAction("1"), gov_b: oneAction("1") }
  });
  eq(sparse.window.PDXExecRecord.coverage().state, "pilot",
    "3 figures on file out of 43 tracked reads as broad coverage — the share threshold is not applied");

  // The source gate feeds the numerator: a figure whose only action cites a directory
  // index is not covered, because a reader cannot see it.
  const unciteable = laneSandbox({
    actions: { trump: [{
      actionClass: "executive_order", documentId: "EO 2", title: "Unciteable", actedAt: "2025-02-01", term: "47",
      sourceUrl: "https://www.whitehouse.gov/presidential-actions/",
      sourceLabel: "Presidential actions", issues: [], status: []
    }] }
  });
  eq(unciteable.window.PDXExecRecord.coverage().onFile, 0,
    "a figure whose every action fails the source rule still counts as covered — the numerator\n" +
    "    counts curation rather than what a reader can actually open");
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 3 — the gate renders FIRST, and the compact rendering carries it too
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/coverageGateHtml\(\)/.test(EXEC_UI), "exec-record-ui.js does not render a coverage gate");
  const section = fnSrc(EXEC_UI, "sectionHtml", "exec-record-ui.js");
  const iGate = section.indexOf("coverageGateHtml()");
  const iSum = section.indexOf("pdxer-sum");
  const iCards = section.indexOf("cards +");
  must(iGate !== -1 && iSum !== -1 && iCards !== -1,
    "sectionHtml no longer assembles the gate, the count summary and the cards in one expression");
  ok(iGate < iSum,
    "the coverage gate renders BELOW the count summary. Under the counts it is a footnote to a\n" +
    "    claim the reader has already formed; above them it is a condition on all of it.");
  ok(iGate < iCards, "the coverage gate renders below the action cards");

  const pill = fnSrc(EXEC_UI, "navPill", "exec-record-ui.js");
  ok(/coverage\s*===\s*'function'|typeof ex\.coverage/.test(pill),
    "the nav pill does not consult the coverage gate — the compact rendering is where a\n" +
    "    qualifier is most easily lost, and it is exactly where it must survive");
  ok(/comparable/.test(pill), "the nav pill does not carry the comparability flag");
  ok(pill.indexOf("%") === -1, "the nav pill prints a percentage");

  // And end to end: the shipped section for the one covered figure actually contains
  // the banner, ahead of everything else.
  const uiCtx = laneSandbox({});
  const els = [];
  uiCtx.document = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {} }),
    head: { appendChild: (n) => els.push(n) },
    documentElement: { appendChild: (n) => els.push(n) }
  };
  vm.runInContext(EXEC_UI, uiCtx, { filename: "exec-record-ui.js" });
  const html = uiCtx.window.PDXExecRecordUI.sectionHtml("trump");
  must(html && html.length > 500, "the shipped section for trump did not render — the end-to-end probe cannot run");
  ok(/pdxer-gate/.test(html), "the rendered trump section carries no coverage gate");
  ok(html.indexOf("pdxer-gate") < html.indexOf("pdxer-sum"),
    "in the rendered section the gate comes after the counts");
  const cov = EX.coverage();
  ok(html.indexOf(cov.line) !== -1, "the rendered gate does not carry the checkable coverage sentence");
  const pillOut = uiCtx.window.PDXExecRecordUI.navPill("trump");
  must(!!pillOut, "navPill('trump') returned nothing — the compact-rendering probe cannot run");
  eq(pillOut.comparable, false, "the rendered nav pill claims the lane is comparable");
  ok(pillOut.tip.indexOf(cov.line) !== -1,
    "the nav pill tip drops the coverage declaration — a reader who only hovers the rail is\n" +
    "    told the record is complete");
  ok(!FORBIDDEN.test(pillOut.tip), `the nav pill tip uses forbidden EER vocabulary: ${JSON.stringify(pillOut.tip)}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 4 — the API serves the standing log, source-gated and whole
// ═════════════════════════════════════════════════════════════════════════════
{
  ok(/vrExecActionStatus,?\s*\n?\s*\}\s*from "\.\.\/\.\.\/db\/schema\.js"/.test(FN) ||
     /^\s*vrExecActionStatus,\s*$/m.test(FN),
    "voting-record.mts does not import vrExecActionStatus — the standing log is still stranded");
  ok(/\.from\(vrExecActionStatus\)/.test(FN),
    "voting-record.mts never queries vr_exec_action_status");
  ok(/inArray\(vrExecActionStatus\.positionId/.test(FN),
    "the standing query does not join on position_id — it cannot be attributed to an action");
  ok(/standing:\s*history/.test(FN) && /standingCurrent:/.test(FN),
    "the measure payload does not expose standing / standingCurrent on a position");
  // Append-only means the WHOLE log ships. A payload carrying only the latest row
  // would silently discard the history the table exists to preserve.
  ok(/history\[history\.length - 1\]/.test(FN),
    "standingCurrent is not the last entry of the served history — the two could disagree");
  ok(/history\.length \? history\[history\.length - 1\] : null/.test(FN),
    "standingCurrent is not null when the history is empty — silence would be served as a standing");
  // And the read must never mutate the log.
  const measure = FN.slice(FN.indexOf("async function getMeasure"), FN.indexOf("async function getMeasure") + 6000);
  must(measure.length > 2000, "getMeasure() could not be sliced — the append-only probe cannot run");
  ok(!/\.insert\(vrExecActionStatus|\.update\(vrExecActionStatus|\.delete\(vrExecActionStatus/.test(FN),
    "the Function writes to vr_exec_action_status; the standing log is append-only and read-only here");

  // The status allow-list is DERIVED from the shipped vocabulary file, not retyped.
  const setSrc = FN.slice(FN.indexOf("const EXEC_STANDING_STATUSES"), FN.indexOf("const EXEC_REJECT_SRC"));
  must(setSrc.length > 80, "EXEC_STANDING_STATUSES could not be located in the Function");
  ok(/execSummaryKeys/.test(setSrc),
    "the Function's standing allow-list is hand-written rather than read from db/exec-summary-keys.json —\n" +
    "    it would silently drop a token the moment the vocabulary widened");
  const tokens = Object.values(SUMKEYS.buckets.actions.keys).map((k) => k.token);
  ok(tokens.includes("challenged_unverified"),
    "challenged_unverified is not in the shipped action vocabulary — the served log has nowhere to put a live challenge");

  // The source rule, executed. Extracted from the Function so this gates the shipped
  // rule and not a copy of it.
  const rejectSrc = FN.slice(FN.indexOf("const EXEC_REJECT_SRC"), FN.indexOf("function execSourceOk"));
  must(rejectSrc.length > 100, "EXEC_REJECT_SRC could not be located in the Function");
  const okFn = fnSrc(FN, "execSourceOk", "voting-record.mts")
    .replace(/: string \| null \| undefined/g, "").replace(/: boolean/g, "").replace(/: RegExp\[\]/g, "");
  const srcCtx = vm.createContext({ RegExp, String });
  vm.runInContext(rejectSrc.replace(/: RegExp\[\]/g, "") + "\n" + okFn + "\nglobalThis.f = execSourceOk;", srcCtx);
  const sourceOk = srcCtx.f;
  ok(sourceOk("https://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf"),
    "the served source rule rejects a published Public Law PDF");
  ok(sourceOk("https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs"),
    "the served source rule rejects a Federal Register document");
  ok(!sourceOk("http://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf"),
    "the served source rule accepts plain http");
  ok(!sourceOk("https://www.whitehouse.gov"), "the served source rule accepts a bare host, which cites nothing");
  ok(!sourceOk("https://www.whitehouse.gov/presidential-actions/"),
    "the served source rule accepts a directory index instead of a document");
  ok(!sourceOk("https://www.whitehouse.gov/fact-sheets/2025/01/order/"),
    "the served source rule accepts a fact sheet — the administration describing its own order");
  ok(!sourceOk(""), "the served source rule accepts an empty url");
  ok(!sourceOk(null), "the served source rule accepts a null url");

  // The client-side rule and the served rule must agree, or a standing visible on a
  // profile would vanish on the bill panel (or worse, the other way round).
  const probes = [
    "https://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf",
    "https://www.whitehouse.gov",
    "https://www.whitehouse.gov/presidential-actions/",
    "https://www.whitehouse.gov/fact-sheets/2025/01/order/",
    "http://example.gov/doc.pdf"
  ];
  for (const u of probes) {
    eq(!!sourceOk(u), !!EX.sourceOk(u),
      `the served source rule and exec-record.js disagree about ${u}`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Contract 5 — the bill panel renders standing, whole, sourced, and fails closed
// ═════════════════════════════════════════════════════════════════════════════
{
  // Extract the render chain and run it. Closure-private by design, so it is lifted
  // out and executed against synthetic rows rather than read for literals.
  const chain = [
    "function esc(s){return String(s==null?'':s).replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'})[c];});}",
    "function escAttr(s){return esc(s);}",
    "function fmtDate(iso){return iso ? String(iso).slice(0,10) : '';}",
    "function nameFor(id){return 'Test Figure';}",
    fnSrc(BILL, "standingMeta", "bill-detail.js"),
    fnSrc(BILL, "standingChip", "bill-detail.js"),
    fnSrc(BILL, "standingEntryHtml", "bill-detail.js"),
    fnSrc(BILL, "standingHtml", "bill-detail.js"),
    fnSrc(BILL, "isExecAction", "bill-detail.js"),
    fnSrc(BILL, "execActionsSection", "bill-detail.js"),
    "globalThis.standingHtml = standingHtml; globalThis.execActionsSection = execActionsSection; globalThis.isExecAction = isExecAction;"
  ].join("\n");
  const bdCtx = { console, JSON, Math, Date, RegExp, Object, String, Number, Array };
  bdCtx.window = bdCtx; bdCtx.globalThis = bdCtx;
  // The label table the panel borrows, so this proves the reuse rather than a copy.
  bdCtx.window.PDXExecRecord = EX;
  vm.runInContext(
    "var EXEC_ACTION_TYPES = " + JSON.stringify({ signed: 1, issued: 1, vetoed: 1 }) + ";\n" +
    "var ACTION_LABEL = " + JSON.stringify({ signed: "Signed into law", issued: "Issued", vetoed: "Vetoed" }) + ";\n" +
    chain,
    vm.createContext(bdCtx)
  );

  const entry = (status, when, url) => ({
    status, effectiveAt: when, authority: "U.S. District Court", note: "Test note.",
    source: { url: url, label: "Court opinion" }
  });
  const log = [
    entry("in_force", "2025-01-20T00:00:00.000Z", "https://www.federalregister.gov/documents/2025/01/29/2025-01953/x"),
    entry("partly_blocked", "2025-02-21T00:00:00.000Z", "https://www.govinfo.gov/content/pkg/USCOURTS-a/pdf/USCOURTS-a.pdf")
  ];
  const out = bdCtx.standingHtml({ standing: log, standingCurrent: log[1] });

  // Newest first: the reader's first question is where it stands now.
  ok(out.indexOf("Partly blocked in court") !== -1, "the rendered standing does not name the current status");
  ok(out.indexOf("Partly blocked in court") < out.indexOf("In force"),
    "the rendered log leads with the OLDEST entry — the current standing must come first");
  // …but the earlier entries survive. Append-only is meaningless if only the tip ships.
  ok(/1 earlier recorded change/.test(out),
    "the earlier entries are not offered — an order that was in force and is now partly blocked\n" +
    "    is two sourced facts, and the first one is what explains the second");
  // Every entry keeps its own citation.
  const links = out.match(/href="/g) || [];
  eq(links.length, 2, "not every standing entry carries its own source link");
  ok(out.indexOf("govinfo.gov") !== -1 && out.indexOf("federalregister.gov") !== -1,
    "a standing entry lost its citation");
  ok(!FORBIDDEN.test(out.replace(/<[^>]*>/g, " ")),
    "the rendered standing uses forbidden EER vocabulary (a percentage or vote language)");

  // FAIL CLOSED. Nothing on file is not "in force".
  const none = bdCtx.standingHtml({ standing: [], standingCurrent: null });
  ok(!/In force/i.test(none), "an action with no standing on file renders as in force");
  ok(/No standing on file/i.test(none), "an action with no standing on file renders no honest empty state");
  ok(/gap in the record|not a finding/i.test(none),
    "the empty standing state does not say that silence is a gap rather than a finding");

  // An unknown token must degrade to its own plain name, never borrow another's chip.
  const weird = bdCtx.standingHtml({ standing: [entry("some_new_token", "2025-03-01T00:00:00.000Z", "https://example.gov/x.pdf")] });
  ok(!/In force/i.test(weird), "an unrecognised standing token renders as in force");
  ok(/Some new token/.test(weird), "an unrecognised standing token is not rendered under its own name");

  // The section itself: an executive act is not a member action, and it carries the log.
  const section = bdCtx.execActionsSection({}, [{
    politicianId: "trump", actionType: "issued", actedAt: "2025-01-20T00:00:00.000Z",
    note: "Issued as an executive order.", source: { url: "https://www.federalregister.gov/documents/2025/01/29/2025-01953/x", label: "Federal Register" },
    standing: log, standingCurrent: log[1]
  }]);
  ok(/Executive action/i.test(section), "the executive action section has no heading of its own");
  ok(/Issued/.test(section), "the executive action section does not label the act of issuing");
  ok(/Partly blocked in court/.test(section), "the executive action section does not carry the standing");
  ok(!/\bvot/i.test(section.replace(/<[^>]*>/g, " ")),
    "the executive action section uses vote language about an act that involved no vote");
  ok(section.indexOf("%") === -1, "the executive action section prints a percentage");
  eq(bdCtx.execActionsSection({}, []), "", "the executive action section renders something with no executive actions");
  eq(bdCtx.execActionsSection({}, [{ politicianId: "x", actionType: "statement" }]), "",
    "a member statement is being rendered in the executive lane");
  ok(bdCtx.isExecAction({ actionType: "signed" }) && bdCtx.isExecAction({ actionType: "issued" }),
    "signed / issued are not recognised as executive actions");
  ok(!bdCtx.isExecAction({ actionType: "cosponsor" }) && !bdCtx.isExecAction({}),
    "a member action is being classed as an executive one");

  // And the panel must not have quietly kept exec actions in the member list too.
  const member = fnSrc(BILL, "memberActionsSection", "bill-detail.js");
  ok(/isExecAction/.test(member),
    "memberActionsSection does not exclude executive actions — a president signing a law would\n" +
    "    be listed as a member action on the same measure");
}

// ── Report ───────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ exec standing: ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
const cov = EX.coverage();
console.log(`✓ ${passed} assertions passed — ✒️ EER coverage gate (${cov.state}: ${cov.onFile}/${cov.tracked}) + served standing log`);
