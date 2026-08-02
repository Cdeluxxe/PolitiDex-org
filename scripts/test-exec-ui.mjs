#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// ✒️ Executive Enactment Record — Phase 4 guards: the RENDERED surface
// ─────────────────────────────────────────────────────────────────────────────
// Phases 1–3 gated the vocabulary, the read path and the seed. Nothing was on
// screen, so nothing could be misread. This file gates the thing a reader actually
// sees: the HTML exec-record-ui.js produces from the real shipped data, driven
// through the real read path in a DOM-less sandbox.
//
// The rules are the same rules, checked one layer further out — because every one of
// them can be satisfied by the data and still broken by the markup:
//
//   1. No percentage character anywhere in the output, and no graded adjective
//      standing in for one. Checked against a NEUTRAL fixture render so that any hit
//      is provably the renderer's own copy rather than an interpolated issue label.
//   2. No vote language, checked against the REAL render, where the interpolated
//      strings come from curated data that a later edit could contaminate.
//   3. Every standing chip carries its citation IN THE SAME CARD. A "struck down"
//      chip with no ruling behind it is the single most damaging thing this lane
//      could publish, and it is exactly the kind of thing a markup refactor drops.
//   4. An action with no citable standing is NOT rendered as being in force.
//   5. Omnibus actions render EVERY issue with its own direction. H.R. 1's four
//      'opposes' mappings must survive to the screen; a flattened headline line would
//      let a signed omnibus read as a single clean win.
//   6. A figure with nothing on file renders the empty string — no fabricated
//      sentence, no empty panel. Also the offline / no-data case: with
//      window.EXEC_ACTIONS absent the section must disappear, not throw.
//   7. exec-action-data.js is exactly what the generator produces from the seed.
//      A hand edit to the client copy would publish a citation the curated seed does
//      not carry, which is the whole reason that file is generated.
//   8. index.html loads the three files in dependency order and mounts the section
//      additively, with the 🏛️ Official Record surfaces untouched.
//
//   node scripts/test-exec-ui.mjs
//
// No database, no network, no real DOM. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { buildExecActionData, OUT_PATH, SEED_PATH } from "./gen-exec-action-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(R(p));

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
const has = (hay, needle, msg) => ok(String(hay).includes(needle), `${msg} — missing ${JSON.stringify(needle)}`);
// Curated prose reaches the markup escaped — apostrophes and ampersands are ordinary
// in law titles, court notes and issue labels — so expectations are escaped the same
// way rather than the renderer being asked to emit raw text.
const escHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hasText = (hay, needle, msg) => has(hay, escHtml(needle), msg);

const SEED = readJson(SEED_PATH);
const SUMKEYS = readJson("db/exec-summary-keys.json");
const TYPES = readJson("db/exec-action-types.json");
const FORBIDDEN = new RegExp(SUMKEYS.forbidden.pattern, SUMKEYS.forbidden.flags);
// The narrow matcher for the real render: vote language and the percent sign only.
// The graded-adjective half of the rule cannot be applied to real output, because
// curated issue labels and rationales legitimately contain words like "strongest" —
// so it is applied to the neutral fixture instead, where every string is ours.
const VOTE_WORDS = /%|\b(vot(e|ed|es|ing)|yea|nay|roll ?calls?)\b/i;

ok(FORBIDDEN.test("mostly acted on it"), "matcher is vacuous: it does not fire on 'mostly'");
ok(VOTE_WORDS.test("Voted Yea"), "vote matcher is vacuous: it does not fire on 'Voted Yea'");
ok(VOTE_WORDS.test("71%"), "vote matcher is vacuous: it does not fire on a percentage");

// ── ISSUE_MAP, extracted from the shipped labels ─────────────────────────────
// alignment-tool.js owns ISSUE_MAP and is far too DOM-bound to load here, so the
// labels are read out of its source. Using the REAL labels matters: they are the one
// class of interpolated string the renderer does not control, and a label carrying a
// stray "%" would put a percentage on an EER surface through the back door.
const ISSUE_MAP = {};
{
  const src = R("alignment-tool.js");
  const re = /^\s*([a-z0-9_]+):\s*\{\s*label:\s*'((?:[^'\\]|\\.)*)'/gm;
  let m;
  while ((m = re.exec(src))) ISSUE_MAP[m[1]] = { label: m[2].replace(/\\'/g, "'") };
}
ok(Object.keys(ISSUE_MAP).length > 40,
  `only ${Object.keys(ISSUE_MAP).length} ISSUE_MAP labels extracted — has alignment-tool.js's shape changed?`);
for (const a of SEED.actions.trump) {
  for (const m of a.issues) {
    const lbl = ISSUE_MAP[m.issueKey] && ISSUE_MAP[m.issueKey].label;
    if (!lbl) continue; // renderer falls back to the key, which is safe by construction
    const hit = lbl.match(VOTE_WORDS);
    ok(!hit, `ISSUE_MAP label for ${m.issueKey} would put ${JSON.stringify(hit && hit[0])} on an EER surface: ${lbl}`);
  }
}

// ── A DOM-less sandbox with just enough document to inject a <style> ─────────
function makeSandbox() {
  const styles = [];
  const doc = {
    _ids: {},
    getElementById(id) { return doc._ids[id] || null; },
    createElement() { return { id: "", textContent: "" }; },
    head: { appendChild(el) { styles.push(el); doc._ids[el.id] = el; } }
  };
  const ctx = { console, JSON, Math, Date, setTimeout, clearTimeout, document: doc };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  const sandbox = vm.createContext(ctx);
  for (const f of ["politician-stances.js", "stance-helpers.js", OUT_PATH, "exec-record.js", "exec-record-ui.js"]) {
    vm.runInContext(R(f), sandbox, { filename: f });
  }
  ctx.ISSUE_MAP = ISSUE_MAP;
  ctx.CMP_DATA = { trump: { name: "Donald Trump" } };
  return { ctx, styles };
}

const { ctx, styles } = makeSandbox();
const UI = ctx.window.PDXExecRecordUI;
const EX = ctx.window.PDXExecRecord;
ok(!!UI, "exec-record-ui.js did not expose window.PDXExecRecordUI");
ok(!!EX, "exec-record.js did not expose window.PDXExecRecord");
if (!UI || !EX) { console.error("✗ fatal: the lane did not load"); process.exit(1); }
for (const fn of ["sectionHtml", "navPill", "ensureStyles"]) {
  eq(typeof UI[fn], "function", `PDXExecRecordUI.${fn} is not a function`);
}
ok(!!ctx.window.EXEC_ACTIONS && !!ctx.window.EXEC_ACTIONS.trump,
  "exec-action-data.js did not expose window.EXEC_ACTIONS.trump");

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The quiet states — nothing on file must render NOTHING
// ─────────────────────────────────────────────────────────────────────────────
eq(UI.sectionHtml(""), "", "an empty pid rendered something");
eq(UI.sectionHtml(null), "", "a null pid rendered something");
eq(UI.sectionHtml("mike_lee"), "", "a non-executive figure rendered an EER section");
eq(UI.navPill("mike_lee"), null, "a non-executive figure produced an EER nav pill");
{
  // Offline / cold first paint: the data file has not arrived (or failed to).
  const saved = ctx.window.EXEC_ACTIONS;
  ctx.window.EXEC_ACTIONS = undefined;
  eq(UI.sectionHtml("trump"), "", "with no action data loaded, the section still rendered");
  eq(UI.navPill("trump"), null, "with no action data loaded, the nav pill still appeared");
  ctx.window.EXEC_ACTIONS = { trump: [] };
  eq(UI.sectionHtml("trump"), "", "with an empty action list, the section still rendered");
  ctx.window.EXEC_ACTIONS = saved;
  ok(!!ctx.window.EXEC_ACTIONS.trump.length, "teardown failed: the real action data was not restored");
}
eq(UI.sectionHtml("trump").length > 0, true, "the real render came back empty");

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The real render
// ─────────────────────────────────────────────────────────────────────────────
const HTML = UI.sectionHtml("trump");
const SUM = EX.summary("trump");

ok(/^<section class="pdxer"/.test(HTML), "the section does not open with the scoped .pdxer wrapper");
has(HTML, 'aria-label="Executive Enactment Record"', "the section carries no accessible name");
has(HTML, "✒️", "the lane's own icon is absent — a screenshot would not identify the lane");

// Decision 1 — no percentage, no vote language, anywhere in real output.
{
  const hit = HTML.match(VOTE_WORDS);
  ok(!hit, `the rendered EER surface contains ${JSON.stringify(hit && hit[0])}`);
}

// Decision 4 — the framing leads the summary sentence, as a prefix, not a pattern.
{
  const m = HTML.match(/<p class="pdxer-sum"[^>]*>([^<]+)<\/p>/);
  ok(!!m, "no summary paragraph rendered");
  if (m) {
    ok(m[1].indexOf(SUMKEYS.framing) === 0,
      `the summary does not LEAD with the framing clause: ${JSON.stringify(m[1].slice(0, 80))}`);
    eq(m[1], SUM.label, "the rendered summary text is not the read path's own generated label");
  }
}
// …and the tip rides on it, so the method is one hover away everywhere the label is.
has(HTML, "No percentage is shown", "the summary tip does not explain the absence of a score");

// Decision 6 — two units, labelled, never added.
has(HTML, "Two different units, never added together", "the unit disclosure is missing");
{
  const axes = HTML.match(/<span class="pdxer-axis-lbl">([\s\S]*?)<\/span>/g) || [];
  ok(axes.length >= 2, `expected an alignment row and a standing row, found ${axes.length} axis labels`);
  ok(axes.some((a) => /issue/.test(a)), "the alignment axis is not labelled in issues");
  ok(axes.some((a) => /document/.test(a)), "the standing axis is not labelled in documents");
  const totals = String(SUM.issues.total + SUM.actions.total);
  ok(!new RegExp(`>${totals}\\s+(issue|document)`).test(HTML),
    "a combined issue+document total appears to be rendered — the two units were added");
}

// Decision 2 / 7 — both axes present, and the contested standing survives to the row.
has(HTML, "Standing ·", "the standing axis row is missing");
ok(SUM.contested, "fixture drift: the seeded record is no longer contested, so the sticky-standing rule is untested here");
has(HTML, "Partly blocked in court", "a contested standing did not surface in the rendering");
has(HTML, "In force", "the in-force standing did not surface in the rendering");

// Decision 5 — coverage is stated as coverage.
has(HTML, "coverage, not a finding", "the no-action-found bucket is not labelled as coverage");
ok(!/declined to act/.test(HTML.split("not that the figure declined to act").join("")),
  "the coverage copy reads as an accusation rather than as coverage");

// Decision 11 — tariffs_authority stays held, and the hole it leaves is disclosed.
// The count in the summary line comes from the gated Phase-2 read path and is not
// touched here; what is withheld is the NAMING of the issue, which is the thing the
// stance filing cannot support. See the HELD_ISSUE_KEYS comment in exec-record-ui.js.
{
  const uiSrc = R("exec-record-ui.js");
  const held = (uiSrc.match(/var HELD_ISSUE_KEYS = \{([\s\S]*?)\n  \};/) || [])[1] || "";
  ok(/\btariffs_authority\s*:/.test(held),
    "tariffs_authority is no longer held back in exec-record-ui.js — locked decision 11 says it stays blocked");
  const heldKeys = (held.match(/^\s{4}([a-z0-9_]+)\s*:/gm) || []).map((s) => s.trim().replace(/:$/, ""));
  ok(heldKeys.length > 0, "HELD_ISSUE_KEYS could not be parsed out of exec-record-ui.js");

  // The chip list is the only place an issue is named on the strength of a stance alone.
  const body = (HTML.match(/<div class="pdxer-cov-body">([\s\S]*?)<\/div>/) || [])[1] || "";
  const chips = (body.match(/<span class="pdxer-chip pdxer-none">([\s\S]*?)<\/span>/g) || [])
    .map((s) => s.replace(/<[^>]+>/g, ""));
  ok(chips.length > 0, "the coverage chip list rendered no issues, so the hold rule is untested");

  let expectHeld = 0;
  for (const k of heldKeys) {
    const tok = EX.issue("trump", k).token;
    if (tok !== "said_not_done") continue; // not in this bucket for this figure; nothing to hide
    expectHeld++;
    const lbl = ISSUE_MAP[k] ? ISSUE_MAP[k].label : k.replace(/_/g, " ");
    ok(!chips.some((c) => c === escHtml(lbl)),
      `held issue ${k} was named in the coverage list as ${JSON.stringify(lbl)}`);
  }
  ok(expectHeld > 0,
    "fixture drift: no held key is currently in the no-action-found bucket, so decision 11 is untested here");

  // The list is now shorter than the count above it. That gap must be visible.
  hasText(HTML, "counted above but not named here",
    "issues were withheld from the coverage list without disclosing it");
  has(HTML, `>${expectHeld} of them `,
    `the withheld-issue disclosure does not report ${expectHeld} withheld ${expectHeld === 1 ? "issue" : "issues"}`);
  eq(chips.length + expectHeld, SUM.issues.noActionFound,
    "named coverage chips plus withheld issues do not add back up to the count in the summary line");
}

// Every seeded action reaches the screen, newest first.
for (const a of SEED.actions.trump) {
  hasText(HTML, a.documentId, `action ${a.documentId} is missing from the rendering`);
  hasText(HTML, a.title, `the title of ${a.documentId} is missing from the rendering`);
}
{
  const order = (HTML.match(/data-pdxer-doc="([^"]+)"/g) || []).map((s) => s.replace(/.*="|"$/g, ""));
  eq(order.length, SEED.actions.trump.length, "wrong number of action cards rendered");
  const dates = order.map((d) => (SEED.actions.trump.find((a) => a.documentId === d) || {}).actedAt);
  const sorted = dates.slice().sort().reverse();
  eq(dates.join(","), sorted.join(","), "action cards are not in newest-first order");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Standing chips carry their citations, in the same card
// ─────────────────────────────────────────────────────────────────────────────
const CARDS = HTML.split('<article class="pdxer-card"').slice(1);
eq(CARDS.length, SEED.actions.trump.length, "card split did not find every action card");
const STANDING_LABELS = Object.values(EX.STANDING).map((s) => s.label);
for (const card of CARDS) {
  const doc = (card.match(/data-pdxer-doc="([^"]+)"/) || [])[1] || "?";
  const seeded = SEED.actions.trump.find((a) => escHtml(a.documentId) === doc);
  ok(!!seeded, `rendered a card for an unknown document: ${doc}`);
  if (!seeded) continue;

  const shown = STANDING_LABELS.filter((l) => card.includes(l));
  ok(shown.length > 0, `${doc}: no standing is shown at all`);
  // Requirement: in_force / partly_blocked / blocked / struck_down surface WITH a
  // citation. The chip and the link that warrants it live in the same card, so this
  // is checked per card rather than per document.
  const urls = new Set(card.match(/href="([^"]+)"/g) || []);
  ok(urls.size > 0, `${doc}: a standing is shown with no citation link in the card`);
  for (const s of seeded.status || []) {
    if (!EX.sourceOk(s.sourceUrl)) continue;
    has(card, s.sourceUrl, `${doc}: the citation for the ${s.status} entry of ${s.effectiveAt} is not rendered`);
    has(card, EX.STANDING[s.status].label, `${doc}: the ${s.status} standing label is not rendered`);
    if (s.caseUrl) has(card, s.caseUrl, `${doc}: the case docket link for ${s.effectiveAt} is not rendered`);
  }
  // The document's own source of record is on the card too, not only its standing.
  has(card, seeded.sourceUrl, `${doc}: the action's own primary source is not linked`);
}

// Every link in the whole section passes the SHIPPED source gate and points at a
// primary host. A rendered citation that would have been rejected by the read path is
// the same failure as an unsourced claim, arriving through a different door.
{
  const hrefs = [...HTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  ok(hrefs.length >= 10, `only ${hrefs.length} citation links rendered — expected one per action plus one per standing`);
  const hosts = new Set(TYPES.sourceRule.primaryHosts);
  for (const h of hrefs) {
    ok(EX.sourceOk(h), `a rendered link fails the lane's own source rule: ${h}`);
    const host = (h.match(/^https:\/\/([^/]+)/) || [])[1] || "";
    ok(hosts.has(host), `a rendered link points at a non-primary host: ${host}`);
    ok(!/whitehouse\.gov/i.test(host), `a rendered link cites whitehouse.gov: ${h}`);
  }
  ok(!/target="_blank"(?![^>]*rel="noopener")/.test(HTML),
    "an external link opens in a new tab without rel=noopener");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 · The omnibus rule — every issue, every direction, never flattened
// ─────────────────────────────────────────────────────────────────────────────
{
  const hr1 = CARDS.find((c) => c.includes("Public Law 119-21"));
  ok(!!hr1, "the H.R. 1 card is missing");
  const seeded = SEED.actions.trump.find((a) => a.documentId === "Public Law 119-21");
  const adv = seeded.issues.filter((i) => i.direction === "advances");
  const opp = seeded.issues.filter((i) => i.direction === "opposes");
  ok(opp.length >= 4, `fixture drift: H.R. 1 now carries ${opp.length} 'opposes' mappings`);
  if (hr1) {
    has(hr1, `Cuts against — ${opp.length} issues`, "the against-direction group header is missing or miscounted");
    has(hr1, `Advances — ${adv.length} issues`, "the advances-direction group header is missing or miscounted");
    // Against first: the direction a reader least expects from the signer's own hand
    // is the one that must not be buried below ten rows of agreement.
    ok(hr1.indexOf("Cuts against") < hr1.indexOf("Advances"),
      "the against-direction group is rendered below the advances group");
    for (const m of seeded.issues) {
      const label = (ISSUE_MAP[m.issueKey] && ISSUE_MAP[m.issueKey].label) || m.issueKey.replace(/_/g, " ");
      hasText(hr1, label, `H.R. 1 issue ${m.issueKey} is not named on the card`);
      hasText(hr1, m.rationale, `H.R. 1 issue ${m.issueKey} is named with no rationale`);
    }
    eq((hr1.match(/pdxer-issrow/g) || []).length, seeded.issues.length,
      "the H.R. 1 card does not render one row per issue mapping");
    has(hr1, "primary", "the primary issue is not marked on the omnibus card");
  }
  // The sole-authored order that also runs both ways.
  const eo = CARDS.find((c) => c.includes("Executive Order 14154"));
  if (eo) {
    has(eo, "Cuts against — 1 issue", "EO 14154's opposing mapping did not survive to the card");
    has(eo, "Advances — 1 issue", "EO 14154's advancing mapping did not survive to the card");
  }
}

// The append-only standing log: three rulings, three citations, one row each.
{
  const eo = CARDS.find((c) => c.includes("Executive Order 14248"));
  ok(!!eo, "the EO 14248 card is missing");
  const seeded = SEED.actions.trump.find((a) => a.documentId === "Executive Order 14248");
  eq(seeded.status.length, 3, "fixture drift: EO 14248 no longer carries three standing entries");
  if (eo) {
    has(eo, "2 earlier recorded changes", "the earlier standing history is not offered");
    for (const s of seeded.status) hasText(eo, s.note, `the standing note of ${s.effectiveAt} is not rendered`);
    // Current standing first: the latest entry by effectiveAt leads the card.
    const idx = seeded.status.map((s) => eo.indexOf(s.sourceUrl));
    const latest = seeded.status.slice().sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt))[0];
    ok(eo.indexOf(latest.sourceUrl) === Math.min(...idx),
      "the current standing is not the first one rendered on the card");
  }
}

// The wave-2 token: a live challenge renders as neither blocked nor undisturbed.
// The whole point of `challenged_unverified` is the distance between "a court stopped
// this" and "nothing has disturbed this". If the rendering collapses that distance in
// either direction the token has failed, so both directions are checked here.
{
  const eo = CARDS.find((c) => c.includes("Executive Order 14156"));
  ok(!!eo, "the EO 14156 card is missing — the new standing token is unexercised in the UI");
  const seeded = SEED.actions.trump.find((a) => a.documentId === "Executive Order 14156");
  ok(!!seeded, "fixture drift: EO 14156 is no longer seeded");
  const live = (seeded.status || []).find((s) => s.status === "challenged_unverified");
  ok(!!live, "fixture drift: EO 14156 no longer carries a challenged_unverified entry");
  if (eo && live) {
    // Its own chip class. Reusing the in-force green or the blocked red would assert
    // an outcome no ruling on file supports.
    has(eo, 'class="pdxer-chip pdxer-challenged"', "the challenged standing borrows another standing's chip class");
    has(eo, EX.STANDING.challenged_unverified.label, "the challenged standing label is not rendered on the card");
    has(eo, live.sourceUrl, "the challenged standing is rendered with no citation of the filing");
    has(eo, live.caseUrl, "the challenged standing is rendered with no case docket link");
    hasText(eo, live.note, "the challenged standing is rendered with no note stating what is and is not known");

    // Not upgraded into a ruling.
    for (const t of ["blocked", "partly_blocked", "struck_down"]) {
      ok(!eo.includes(EX.STANDING[t].label),
        `the EO 14156 card shows ${JSON.stringify(EX.STANDING[t].label)} — a pending challenge was rendered as a ruling`);
    }
    // Nor quietly downgraded: the live challenge is the latest row, so it leads the
    // card rather than sitting behind the earlier-changes fold.
    const rows = seeded.status.slice().sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt));
    eq(rows[0].status, "challenged_unverified", "fixture drift: the challenge is no longer EO 14156's current standing");
    ok(eo.indexOf(live.sourceUrl) < eo.indexOf("pdxer-more"),
      "the live challenge is filed behind the earlier-changes fold instead of leading the card");
    has(eo, "2 earlier recorded changes", "EO 14156's two earlier standing rows are not offered");
  }

  // Axis B counts it as its own bucket, after the rulings and ahead of in force.
  eq(SUM.actions.challengedUnverified, 1,
    "fixture drift: the summary no longer counts exactly one challenged-unverified document");
  const row = (HTML.match(/<div class="pdxer-axis"><span class="pdxer-axis-lbl">Standing ·[\s\S]*?<\/div>/) || [])[0] || "";
  ok(row, "the standing axis row could not be isolated");
  has(row, "pdxer-challenged", "the challenged bucket is missing from the standing axis row");
  has(row, `<b>${SUM.actions.challengedUnverified}</b> ${EX.STANDING.challenged_unverified.label}`,
    "the standing axis row does not carry a count for the challenged bucket");
  ok(row.indexOf("pdxer-challenged") < row.indexOf("pdxer-inforce"),
    "the challenged bucket is ordered below the in-force bucket in the standing axis row");
  if (row.includes("pdxer-partly")) {
    ok(row.indexOf("pdxer-partly") < row.indexOf("pdxer-challenged"),
      "a pending challenge is ordered above an actual injunction in the standing axis row");
  }
}

// The EO 14151 backfill: the log grew backwards without the published row moving.
{
  const eo = CARDS.find((c) => c.includes("Executive Order 14151"));
  ok(!!eo, "the EO 14151 card is missing");
  const seeded = SEED.actions.trump.find((a) => a.documentId === "Executive Order 14151");
  eq(seeded.status.length, 4, "fixture drift: EO 14151 no longer carries four standing entries");
  if (eo) {
    has(eo, "3 earlier recorded changes", "the backfilled standing history is not offered on the EO 14151 card");
    // Every appended row reaches the screen with its own warrant, including the two
    // 2025 rows that predate the row already published against this action.
    for (const s of seeded.status) {
      hasText(eo, s.note, `the EO 14151 standing note of ${s.effectiveAt} is not rendered`);
      has(eo, s.sourceUrl, `the EO 14151 citation for ${s.effectiveAt} is not rendered`);
      hasText(eo, s.authority, `the EO 14151 authority for ${s.effectiveAt} is not rendered`);
    }
    // Append-only means the earlier reading survives verbatim. This is the row that
    // was already on file before the backfill; it is asserted here so a later edit to
    // it fails loudly rather than quietly rewriting history.
    const published = seeded.status.find((s) => s.effectiveAt.startsWith("2026-02-06"));
    ok(!!published, "the standing row published before the wave-2 backfill is gone from the log");
    // And the current standing is still resolved by date, not by array position.
    eq(EX.standingOf(seeded), "in_force",
      "EO 14151's current standing changed — the backfill was supposed to append behind it");
    const latest = seeded.status.slice().sort((a, b) => Date.parse(b.effectiveAt) - Date.parse(a.effectiveAt))[0];
    ok(eo.indexOf(latest.sourceUrl) < eo.indexOf(published.sourceUrl),
      "a backfilled row is rendered ahead of the current standing");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Fail closed — an uncitable standing is never rendered as operative
// ─────────────────────────────────────────────────────────────────────────────
{
  const { ctx: c2 } = makeSandbox();
  c2.window.EXEC_ACTIONS = {
    trump: [{
      actionClass: "executive_order",
      documentId: "Executive Order 99999",
      title: "Fixture order with an uncitable standing",
      actedAt: "2025-06-01", term: "47",
      sourceUrl: "https://www.federalregister.gov/documents/2025/06/02/2025-99999/fixture-order",
      sourceLabel: "Federal Register — fixture",
      issues: [{ issueKey: "energy_production", direction: "advances", isPrimary: true, weight: 100, rationale: "Fixture rationale." }],
      // A standing with no citation, and one citing a fact sheet: both must be refused.
      status: [
        { status: "in_force", effectiveAt: "2025-06-01", authority: "President of the United States", basis: "register_disposition", note: "Fixture." },
        { status: "struck_down", effectiveAt: "2025-07-01", authority: "A court", basis: "court_ruling", sourceLabel: "Fact sheet", sourceUrl: "https://www.whitehouse.gov/fact-sheets/fixture" }
      ]
    }]
  };
  const out = c2.window.PDXExecRecordUI.sectionHtml("trump");
  ok(out.length > 0, "the fixture action did not render at all");
  has(out, "No confirmed standing on file", "an uncitable standing was not disclosed as unconfirmed");
  ok(!/In force/.test(out), "an uncitable standing was rendered as 'In force'");
  ok(!/Struck down/.test(out), "a standing citing a fact sheet was rendered as 'Struck down'");
  ok(!/whitehouse\.gov/.test(out), "a rejected fact-sheet citation still reached the markup");
  has(out, "not presented as being in force", "the unconfirmed-standing disclosure does not say what it means");
}

// Escaping: curated data is trusted, but a renderer that interpolates it raw is one
// bad paste away from breaking the profile it is embedded in.
{
  const { ctx: c3 } = makeSandbox();
  c3.window.EXEC_ACTIONS = {
    trump: [{
      actionClass: "signed_law",
      documentId: 'Public Law 119-99 "<script>alert(1)</script>"',
      title: "<img src=x onerror=alert(1)>",
      actedAt: "2025-05-01", term: "47",
      sourceUrl: "https://www.congress.gov/bill/119th-congress/house-bill/9999",
      sourceLabel: "Congress.gov — fixture",
      issues: [{ issueKey: "lower_taxes", direction: "advances", isPrimary: true, weight: 100, rationale: "<b>raw</b>" }],
      status: [{ status: "in_force", effectiveAt: "2025-05-01", authority: "Congress & the President", basis: "enacted_law_published", sourceLabel: "GovInfo — fixture", sourceUrl: "https://www.govinfo.gov/content/pkg/PLAW-119publ99/pdf/PLAW-119publ99.pdf" }]
    }]
  };
  const out = c3.window.PDXExecRecordUI.sectionHtml("trump");
  ok(!/<script>/.test(out), "a script tag in curated data reached the markup unescaped");
  ok(!/<img /.test(out), "an img tag in curated data reached the markup unescaped");
  ok(!/<b>raw<\/b>/.test(out), "raw HTML in a rationale reached the markup unescaped");
  has(out, "&amp;", "an ampersand in curated data was not escaped");
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · The graded-adjective rule, on a neutral fixture
// ─────────────────────────────────────────────────────────────────────────────
// Every string in this render is either the renderer's own copy or a neutral fixture
// value, so the FULL forbidden matcher can be applied and any hit is provably ours.
{
  const { ctx: c4 } = makeSandbox();
  c4.window.CMP_DATA = {};            // no stated positions → no interpolated stance labels
  c4.window.ISSUE_MAP = { alpha_key: { label: "Alpha" }, beta_key: { label: "Beta" } };
  c4.window.EXEC_ACTIONS = {
    trump: [{
      actionClass: "executive_order",
      documentId: "Executive Order 90001",
      title: "Alpha order",
      actedAt: "2025-02-02", term: "47",
      sourceUrl: "https://www.federalregister.gov/documents/2025/02/03/2025-90001/alpha-order",
      sourceLabel: "Federal Register — Alpha",
      issues: [
        { issueKey: "alpha_key", direction: "advances", isPrimary: true, weight: 100, rationale: "Alpha rationale." },
        { issueKey: "beta_key", direction: "opposes", isPrimary: false, weight: 50, rationale: "Beta rationale." }
      ],
      status: [{ status: "partly_blocked", effectiveAt: "2025-03-03", authority: "A district court", basis: "court_ruling", sourceLabel: "CourtListener — Alpha ruling", sourceUrl: "https://storage.courtlistener.com/pdf/2025/03/03/alpha.pdf", note: "Alpha note." }]
    }]
  };
  const out = c4.window.PDXExecRecordUI.sectionHtml("trump");
  ok(out.length > 0, "the neutral fixture did not render");
  const hits = [];
  let m;
  const re = new RegExp(SUMKEYS.forbidden.pattern, "gi");
  while ((m = re.exec(out))) hits.push(m[0]);
  ok(hits.length === 0, `the renderer's own copy uses forbidden EER vocabulary: ${JSON.stringify([...new Set(hits)])}`);
  // …and prove the neutral render is not vacuous: it really does contain the copy.
  has(out, "Of the formal actions on file", "the neutral render carries no summary label to check");
  has(out, "Partly blocked in court", "the neutral render carries no standing chip to check");
  has(out, "Cuts against", "the neutral render carries no direction group to check");
}

// ─────────────────────────────────────────────────────────────────────────────
// 7 · The nav pill
// ─────────────────────────────────────────────────────────────────────────────
{
  const pill = UI.navPill("trump");
  ok(!!pill, "no nav pill for a figure with a record on file");
  if (pill) {
    eq(pill.target, "pdxsec-exec-record", "the nav pill points at the wrong anchor");
    ok(!VOTE_WORDS.test(pill.value + " " + pill.label + " " + pill.tip),
      `the nav pill carries forbidden vocabulary: ${JSON.stringify(pill)}`);
    // A bare count in a pill is a number with no denominator attached; "on file" is
    // the smallest honest form of the framing clause.
    ok(/on file/i.test(pill.value), `the nav pill value drops the framing qualifier: ${pill.value}`);
    eq(pill.value.indexOf(String(SUM.actions.total + SUM.unstatedStanding)), 0,
      "the nav pill count does not match the document total");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8 · Styles are injected once, and are not load-bearing
// ─────────────────────────────────────────────────────────────────────────────
{
  UI.ensureStyles(); UI.ensureStyles();
  eq(styles.length, 1, "the stylesheet was injected more than once");
  eq(styles[0].id, "pdx-execrecord-css", "the stylesheet carries the wrong id");
  ok(/\.pdxer\{/.test(styles[0].textContent), "the stylesheet is not scoped under .pdxer");
  ok(/@media \(max-width:380px\)/.test(styles[0].textContent),
    "no narrow-viewport rule — the section must stay readable on a small phone");
  ok(!/[^-]width:\s*\d{3,}px/.test(styles[0].textContent),
    "a fixed pixel width would force horizontal scrolling on a phone");
  for (const s of Object.values(EX.STANDING)) {
    ok(styles[0].textContent.includes("." + s.cls.replace(/^exec-/, "pdxer-")),
      `no chip style for the ${s.key} standing — it would render as an unmarked chip`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9 · exec-action-data.js is generated, not hand-maintained
// ─────────────────────────────────────────────────────────────────────────────
{
  const shipped = R(OUT_PATH);
  eq(shipped, buildExecActionData(SEED),
    `${OUT_PATH} has drifted from ${SEED_PATH} — re-run node scripts/gen-exec-action-data.mjs`);
  has(shipped, "GENERATED FILE — do not edit by hand", "the generated file does not say it is generated");
  ok(!/"_[a-zA-Z]/.test(shipped), "curation commentary ('_'-prefixed keys) shipped to the client");
  ok(!/whitehouse\.gov/i.test(shipped), "the client action data cites whitehouse.gov");
  // Every citation in the client payload passes the shipped source gate.
  for (const u of shipped.match(/https?:\/\/[^\s"')]+/g) || []) {
    if (!/^https?:\/\//.test(u)) continue;
    ok(EX.sourceOk(u), `the client action data carries a citation the source rule rejects: ${u}`);
  }
  // The five actions, and nothing else, crossed over.
  const client = ctx.window.EXEC_ACTIONS;
  eq(Object.keys(client).length, Object.keys(SEED.actions).length, "the client payload covers the wrong figures");
  eq(client.trump.length, SEED.actions.trump.length, "the client payload carries the wrong number of actions");
  for (let i = 0; i < client.trump.length; i++) {
    const a = client.trump[i], s = SEED.actions.trump[i];
    eq(a.documentId, s.documentId, `client action ${i} is not the seeded one`);
    eq(a.issues.length, s.issues.length, `${s.documentId}: issue mappings were lost in generation`);
    eq(a.status.length, s.status.length, `${s.documentId}: standing entries were lost in generation`);
    for (let j = 0; j < s.status.length; j++) {
      eq(a.status[j].note, s.status[j].note, `${s.documentId}: standing note ${j} was altered in generation`);
      eq(a.status[j].sourceUrl, s.status[j].sourceUrl, `${s.documentId}: standing citation ${j} was altered`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 · index.html wiring — loaded in dependency order, mounted additively
// ─────────────────────────────────────────────────────────────────────────────
{
  const html = R("index.html");
  const at = (f) => html.indexOf(`src="${f}"`);

  // The profile template used to live in an inline <script> in index.html. The
  // first-paint pass moved the big inline blocks into external files loaded from
  // the same document positions, so the markup below is now in profiles-full.js
  // rather than in the HTML itself. The invariant is unchanged — the surface must
  // be mounted, exactly once, behind a guard — so the haystack is the document
  // TOGETHER WITH the local scripts it loads. Written this way it also survives
  // the next extraction without needing to be touched again.
  const page = [html, ...[...html.matchAll(/<script[^>]*\bsrc="\/?([^"/][^"]*\.js)"/g)]
    .map((m) => m[1])
    .filter((f, i, a) => a.indexOf(f) === i)
    .map((f) => { try { return R(f); } catch { return ""; } })].join("\n");

  for (const f of [OUT_PATH, "exec-record.js", "exec-record-ui.js"]) {
    ok(at(f) > 0, `index.html does not load ${f}`);
    eq((html.match(new RegExp(`src="${f.replace(/\./g, "\\.")}"`, "g")) || []).length, 1,
      `index.html loads ${f} more than once`);
    ok(new RegExp(`<script defer src="${f.replace(/\./g, "\\.")}"`).test(html),
      `${f} is not loaded with defer — it would block the first paint`);
  }
  // stance-helpers.js defines _polPositionMap, the one shared stance source; the read
  // path needs the data; the renderer needs the read path.
  ok(at("stance-helpers.js") < at("exec-record.js"), "exec-record.js loads before stance-helpers.js");
  ok(at(OUT_PATH) < at("exec-record.js"), `${OUT_PATH} loads after exec-record.js`);
  ok(at("exec-record.js") < at("exec-record-ui.js"), "exec-record-ui.js loads before exec-record.js");

  // Mounted once, into the profile, behind a guard.
  eq((page.match(/id="pdxsec-exec-record"/g) || []).length, 1,
    "the EER anchor is missing or duplicated in the profile template");
  has(page, "window.PDXExecRecordUI.sectionHtml", "the profile never calls the EER renderer");
  ok(/window\.PDXExecRecordUI && typeof window\.PDXExecRecordUI\.sectionHtml === 'function'/.test(page),
    "the EER render call is not guarded — a failed script load would break the profile");

  // Additive only: the 🏛️ surfaces are still mounted, unchanged.
  for (const marker of [
    'id="pdxsec-official-record"',
    "window.PDXConsistency.officialRecordSectionHtml(id)",
    'id="pdxsec-divergence"',
    'id="pdxsec-saydo"',
    'id="pdxsec-voting"'
  ]) has(page, marker, `a congressional Official Record surface was disturbed: ${marker}`);
}

// ─────────────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✗ exec UI: ${failures.length} failure(s) (${passed} passed)`);
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`✓ exec UI: ${passed} checks passed — ✒️ EER profile surface renders the seeded record honestly`);
