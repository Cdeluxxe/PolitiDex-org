#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-related-issues-drawer.mjs — the related-issues map inside the drawer
// ─────────────────────────────────────────────────────────────────────────────
// The issue drawer prints, after the finding line and before the vote table,
// every issue the map relates to the open issue, one line each with two parts:
// stated ("supports|opposes|no stated position", from the stance map) then
// record ("record runs with|against", from the record-direction index; the
// drawer's own "N for · N against" tally when the votes run no one way; or
// "no record").
//
//   1. LEE × PROTECT PUBLIC LANDS (real data): the drawer leads with votes and
//      shows Keep Public Lands Public with Lee's stated position from the
//      stance map, as a link that opens that drawer on Lee; the block sits
//      between the finding line and the tally.
//   1b. LEE × KEEP PUBLIC LANDS PUBLIC (real data): Protect Public Lands shows
//      "no stated position · record runs against"; a stated issue with no
//      votes says "no record".
//   1c. VOTES ONLY + COLOURS: Lee's Keep Public Lands Public drawer lists
//      Protect Public Lands (no stated position) beside Expand Domestic Energy
//      Production and Local Land Control; a related issue with votes that run
//      no direction prints the drawer tally, still a link; every name carries its
//      issue's chip colour token.
//   2. FIXTURE: every related issue with a published direction is listed, in
//      map order; a mixed one, an unrelated one and the open issue are not; the
//      open issue is never a link; following a link lands on a drawer that
//      links back.
//   3. OMITTED: an issue with no related positions prints no block.
//   4. NOTHING ELSE MOVED: on the real corpus, every sampled drawer with the
//      block removed is byte-identical to the drawer rendered with no module,
//      and issue rows / scores are identical. Wiring and the shell bump.
//
//   node scripts/test-related-issues-drawer.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { NEW_PAIRS } from "./related-issues-new-pairs.mjs";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) => ok(a === b, `${msg}\n      got:  ${JSON.stringify(a)}\n      want: ${JSON.stringify(b)}`);

const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js",
  "state-senate-stances.js", "stance-helpers.js", "alignment-tool.js",
  "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js",
  "word-action.js", "profile-spine.js", "profiles-full.js", "issue-colors.js",
];
const corpus = buildCorpus(ROOT);

// withModule: load related-issues.js. extra: { pid: { key: stance } } layered
// over the real stance map for fixture files.
function boot(withModule, extra) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = withModule ? FILES.concat(["related-issues.js"]) : FILES;
  for (const f of files) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member surface */ }
  }
  if (extra) {
    const real = win._polPositionMap;
    win._polPositionMap = function (pid, p) {
      const base = real.apply(this, arguments) || {};
      if (!extra[pid]) return base;
      const out = Object.assign({}, base);
      for (const [k, s] of Object.entries(extra[pid])) out[k] = { stance: s, text: "fixture" };
      return out;
    };
  }
  return win;
}
const text = (h) => String(h || "").replace(/<span class="pdxri-ico"[^>]*>[^<]*<\/span> /g, "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const block = (h) => (/<div class="pdxri pdxri-drawer"[\s\S]*?<\/ul><\/div>/.exec(h) || [""])[0];
const lines = (h) => [...block(h).matchAll(/<li class="pdxri-item"[\s\S]*?<\/li>/g)].map((m) => text(m[0]));
const doors = (html) => [...html.matchAll(/<a class="pdxri-go" href="([^"]*)"(?: style="[^"]*")? data-pdxri-go="([^"]*)" data-pdxc-gap="([^"]*)" data-pdxc-gap-pid="([^"]*)"[^>]*>(?:<span class="pdxri-ico" aria-hidden="true">[^<]*<\/span> )?([^<]*)<\/a>/g)]
  .map((m) => ({ href: m[1], go: m[2], key: m[3], pid: m[4], label: m[5].replace(/&amp;/g, "&") }));
const WORD = { support: "supports", oppose: "opposes" };
const RECW = { with: "record runs with", against: "record runs against" };
const lbl = (win, k) => String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
// The expected line for one related key, built from the shared reads.
function wantLine(win, pid, k) {
  const RI = win.PDXRelatedIssues, pm = win._polPositionMap(pid, win.CMP_DATA[pid]) || {};
  const d = pm[k] && /^(support|oppose)$/.test(pm[k].stance) ? pm[k].stance : null;
  const r = RI.recordOf(pid, k), v = RI.hasVotes(pid, k);
  if (!d && !r && !v) return null;
  let rec = "no record";
  if (r) rec = RECW[r];
  else if (v) {
    const t = win.PDXConsistency.drawerTally(pid, k);
    rec = t ? (t.noSide ? `${t.acts} formal ${t.acts === 1 ? "act" : "acts"}`
      : `${t.advances} for · ${t.opposes} against${t.tookNoSide ? ` · ${t.tookNoSide} took no side` : ""}`) : null;
  }
  return rec == null ? null : `${lbl(win, k)}: ${d ? WORD[d] : "no stated position"} · ${rec}`;
}
const PART_RE = /^.+?: (supports|opposes|no stated position) · (record runs with|record runs against|no record|\d+ for · \d+ against( · \d+ took no side)?|\d+ formal acts?|\d+ votes? on file)$/;

// ── 1 · Lee × Protect Public Lands, real data ──────────────────────────────
{
  const win = boot(true);
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const kp = pm.lands_keep_public && pm.lands_keep_public.stance;
  ok(kp === "support" || kp === "oppose", "Lee has no published position on Keep Public Lands Public");
  const h = CS.gapViewHtml("lee", "lands_preserve") || "";
  const ln = lines(h);
  ok(ln.some((l) => l.startsWith(`Keep Public Lands Public: ${WORD[kp]} · `)), `Lee's drawer lacks Keep Public Lands Public: ${WORD[kp]} — ${JSON.stringify(ln)}`);
  ok(ln.length > 0 && ln.every((l) => PART_RE.test(l)), `a line lacks a stated or record part — ${JSON.stringify(ln)}`);
  const d = doors(block(h)).find((x) => x.key === "lands_keep_public");
  ok(d && d.pid === "lee", "Keep Public Lands Public is not a link to Lee's drawer on that issue");
  ok(/pdxgap|pdxlg/.test(CS.gapViewHtml("lee", "lands_keep_public") || ""), "the linked drawer does not render");
  const find = h.indexOf('class="pdxlg-find"'), at = h.indexOf('class="pdxri pdxri-drawer"');
  const tally = h.indexOf('data-pdxlg-tally="1"'), table = h.indexOf('<table class="pdxlg-t">');
  ok(tally > 0 && table > 0, "Lee's Protect Public Lands drawer has no vote table");
  ok(find >= 0 && at > find, "the block is not after the finding line");
  ok(at < tally && at < table, "the block is not before the votes");
  for (const it of RI.itemsFor("lee", win.CMP_DATA.lee, "lands_preserve")) {
    ok(RI.MAP.lands_preserve.includes(it.key), `${it.key} is in the drawer but not in the map`);
  }
}

// ── 1b · Lee × Keep Public Lands Public, real data: stated and record lines ─
{
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  const ln = lines(h);
  ok(ln.includes("Protect Public Lands: no stated position · record runs against"), `Lee's Keep Public Lands Public drawer lacks Protect Public Lands: no stated position · record runs against — ${JSON.stringify(ln)}`);
  const stated = (k) => pm[k] && /^(support|oppose)$/.test(pm[k].stance) ? pm[k].stance : null;
  ok(!stated("lands_preserve"), "Lee now has a stated position on Protect Public Lands; pick another record-only key");
  // Stated, no votes: "no record".
  const sn = RI.MAP.lands_keep_public.find((k) => stated(k) && !RI.hasVotes("lee", k) && !RI.recordOf("lee", k));
  ok(!!sn, "no stated, no-votes related issue on Lee's Keep Public Lands Public drawer");
  if (sn) eq(JSON.stringify(ln.filter((l) => l.startsWith(lbl(win, sn) + ":"))), JSON.stringify([`${lbl(win, sn)}: ${WORD[stated(sn)]} · no record`]), `${sn}: a stated issue with no votes says no record`);
  // Every line is exactly the expected two-part line, in map order.
  eq(JSON.stringify(ln), JSON.stringify(RI.MAP.lands_keep_public.map((k) => wantLine(win, "lee", k)).filter(Boolean)), "every line carries both parts");
  const b = block(h);
  ok(/data-pdxri-key="lands_preserve" data-pdxri-line="both" data-pdxri-dir="none" data-pdxri-rec="against"><span class="pdxri-issue"[^>]*><a class="pdxri-go"[^>]*data-pdxc-gap="lands_preserve"/.test(b),
     "the record line's issue name opens Protect Public Lands on Lee");
  // Lee's Protect Public Lands record line is red; a runs-with line is green.
  ok(/data-pdxri-key="lands_preserve" data-pdxri-line="both" data-pdxri-dir="none" data-pdxri-rec="against">[\s\S]*?<span class="pdxri-dir s-none">no stated position<\/span>[\s\S]*?<span class="pdxri-rec r-against">record runs against<\/span>/.test(b),
     "Lee's Protect Public Lands record line is not red");
  ok(/<span class="pdxri-rec r-with">record runs with<\/span>/.test(b), "no green record-runs-with line on Lee's drawer");
  const cs = R("consistency.js"), pf = R("person-file.css");
  ok(cs.includes("'.pdxri-drawer .pdxri-rec.r-with{color:#4ade80;}'") && cs.includes("'.pdxri-drawer .pdxri-rec.r-against{color:#f87171;}'"),
     "the drawer record words are not the supports green / opposes red");
  ok(cs.includes("'.pdxri-drawer .pdxri-dir.s-support{color:#4ade80;}'") && cs.includes("'.pdxri-drawer .pdxri-dir.s-oppose{color:#f87171;}'"),
     "the record colours no longer match the stated colours");
  ok(/\.pdxri-rec\.r-with \{ color: #4ade80; \}/.test(pf) && /\.pdxri-rec\.r-against \{ color: #f87171; \}/.test(pf), "person-file record words are not green / red");
  ok(!/class="pdxri-dir[^"]*">record/.test(b), "a record word carries the stated position tint");
  ok(/<span class="pdxri-rec r-none">no record<\/span>/.test(b) && /<span class="pdxri-dir s-none">no stated position<\/span>/.test(b), "the absent parts are not neutral");
  ok(!/\.pdxri-(dir\.s|rec\.r)-none/.test(cs) && !/\.pdxri-(dir\.s|rec\.r)-none/.test(pf) && !/\.pdxri-tally[^{]*\{[^}]*color/.test(cs + pf),
     "no stated position / no record / the tally picked up a colour");
  ok(!ln.some((l) => /^Keep Public Lands Public:/.test(l)), "the open issue is repeated in its own drawer");
}

// ── 1c · votes-only lines and issue colours, real data ─────────────────────
{
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues, C = win.PDXIssueColors;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  const b = block(h), ln = lines(h);
  ok(!(pm.lands_preserve && /^(support|oppose)$/.test(pm.lands_preserve.stance)), "Lee has a stated position on Protect Public Lands");
  ok(ln.some((l) => l.startsWith("Protect Public Lands")), `Protect Public Lands missing from Lee's Keep Public Lands Public drawer — ${JSON.stringify(ln)}`);
  ok(ln.some((l) => l.startsWith("Expand Domestic Energy Production:")) && ln.some((l) => l.startsWith("Local Land Control:")),
     "Expand Domestic Energy Production / Local Land Control missing beside it");
  ok(doors(b).some((d) => d.key === "lands_preserve" && d.pid === "lee"), "Protect Public Lands is not a link on Lee");
  // A votes-only key with no direction: the drawer's own tally, still a link.
  const bare = RI.MAP.lands_keep_public.find((k) => !(pm[k] && /^(support|oppose)$/.test(pm[k].stance)) && !RI.recordOf("lee", k) && RI.hasVotes("lee", k));
  ok(!!bare, "no votes-only, no-direction related issue on Lee's drawer");
  if (bare) {
    const L = String(win.ISSUE_MAP[bare].label).replace(/^[^A-Za-z0-9]+/, "").trim();
    // The tally is the one that key's own drawer prints on its "Acts:" line.
    const own = /<div class="pdxlg-side"[^>]*>Acts: ([^<]*)<\/div>/.exec(CS.gapViewHtml("lee", bare) || "");
    ok(!!own, `${bare}: its own drawer prints no Acts tally`);
    if (own) eq(JSON.stringify(ln.filter((l) => l.startsWith(L))), JSON.stringify([`${L}: no stated position · ${own[1]}`]), `${bare}: a votes-only line shows the drawer tally`);
    const li = (new RegExp(`<li class="pdxri-item" data-pdxri-key="${bare}" data-pdxri-line="both"[^>]*>[\\s\\S]*?</li>`).exec(b) || [""])[0];
    ok(/class="pdxri-go"/.test(li) && /pdxri-dir s-none/.test(li) && !/class="pdxri-rec/.test(li) && /<span class="pdxri-tally">[^<]+ for · [^<]+ against/.test(li),
       `${bare}: the votes-only line is not a link with a neutral tally`);
  }
  // Colours: every name span carries its issue's chip token.
  const spans = [...b.matchAll(/<span class="pdxri-issue" data-pdxri-color="([^"]+)" style="([^"]*)">/g)];
  eq(spans.length, (b.match(/class="pdxri-issue"/g) || []).length, "an issue name has no colour token");
  for (const [, key, style] of spans) {
    eq(style, C.styleFor(key) + `color:${C.getIssueColor(key).ink};`, `${key}: the name is not in its issue chip colour`);
    ok(style.includes(C.getIssueColor(key).ink), `${key}: the chip ink is missing`);
  }
  ok(/\.pdxri-drawer \.pdxri-issue\{[^}]*color:var\(--pdx-ic-ink/.test(R("consistency.js")), "the drawer name does not read --pdx-ic-ink");
  // Icons: each name is led by its issue chip icon, inside the one link.
  const named = [...b.matchAll(/<span class="pdxri-issue" data-pdxri-color="([^"]+)"[^>]*>(<a class="pdxri-go"[^>]*>)?(?:<span class="pdxri-ico" aria-hidden="true">([^<]*)<\/span> )?/g)];
  eq(named.length, spans.length, "icon scan missed a name");
  for (const [, key, link, ico] of named) {
    ok(!!ico && String(win.ISSUE_MAP[key].label).startsWith(ico), `${key}: name lacks its issue icon`);
    ok(!!link, `${key}: icon is not inside the link`);
  }
  eq((b.match(/<a class="pdxri-go"/g) || []).length, (b.match(/class="pdxri-issue"/g) || []).length, "an icon added a second link");
  // Every line, stated and record: the name and its link wear the issue ink;
  // the position and record words keep green / red.
  for (const m of b.matchAll(/<li class="pdxri-item" data-pdxri-key="([^"]+)" data-pdxri-line="both" data-pdxri-dir="([^"]+)" data-pdxri-rec="([^"]+)"[\s\S]*?<\/li>/g)) {
    const ink = C.getIssueColor(m[1]).ink;
    ok(m[0].includes(`<a class="pdxri-go" href="/p/lee?issue=${m[1]}" style="color:${ink};"`), `${m[1]}: the link is not in its issue colour`);
    if (m[2] !== "none") ok(/<span class="pdxri-dir s-(support|oppose)">(supports|opposes)<\/span>/.test(m[0]), `${m[1]}: position word lost green / red`);
    else ok(m[0].includes('<span class="pdxri-dir s-none">no stated position</span>'), `${m[1]}: no stated position missing`);
    if (m[3] === "with" || m[3] === "against") ok(/<span class="pdxri-rec r-(with|against)">record runs (with|against)<\/span>/.test(m[0]), `${m[1]}: record word lost green / red`);
    else if (m[3] === "none") ok(m[0].includes('<span class="pdxri-rec r-none">no record</span>'), `${m[1]}: no record missing`);
    else ok(/<span class="pdxri-tally">[^<]+<\/span>/.test(m[0]), `${m[1]}: tally missing`);
    ok(!/pdxri-(dir|rec)[^>]*style=/.test(m[0]), `${m[1]}: the issue colour leaked onto the direction word`);
  }
  ok(/\.pdxri-drawer \.pdxri-go\{color:inherit;text-decoration:underline/.test(R("consistency.js")), "the drawer link lost its underline");
  ok(/\.pdxri-drawer \.pdxri-dir\.s-support\{color:#4ade80;\}/.test(R("consistency.js")) && /\.pdxri-drawer \.pdxri-dir\.s-oppose\{color:#f87171;\}/.test(R("consistency.js")),
     "the position words are no longer green / red");
  ok(/\.pdxri-issue \{[^}]*color: var\(--pdx-ic-ink/.test(R("person-file.css")), "the person-file name does not read --pdx-ic-ink");
}

// ── 1d · Lee × Tackle the National Debt: the split tally surfaces ──────────
// Live, Lee's Middle-Class Tax Relief drawer prints "Acts: 1 for · 1 against"
// and the record-direction index reads it as split (votes, no one-way lead).
// The offline corpus is a projection of the seeds and may not hold those two
// acts; where it does not, that live shape is laid over the two shared reads
// (the index and the drawer ledger), and nothing else is touched.
{
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  ok(!(pm.tax_middle_class && /^(support|oppose)$/.test(pm.tax_middle_class.stance)),
     "Lee has a stated position on Middle-Class Tax Relief; the tally line is not exercised");
  const live = CS.drawerTally("lee", "tax_middle_class");
  if (!live || !RI.hasVotes("lee", "tax_middle_class")) {
    const rd = win._pdxRecordDirection, dt = CS.drawerTally;
    win._pdxRecordDirection = function (pid, key) {
      if (pid === "lee" && key === "tax_middle_class") return { characterised: false, lead: null, total: 2, judged: 2, advances: 1, opposes: 1 };
      return rd.apply(this, arguments);
    };
    CS.drawerTally = (pid, key) => (pid === "lee" && key === "tax_middle_class")
      ? { acts: 2, advances: 1, opposes: 1, tookNoSide: 0, noSide: false } : dt(pid, key);
  } else {
    const own = /<div class="pdxlg-side"[^>]*>Acts: ([^<]*)<\/div>/.exec(CS.gapViewHtml("lee", "tax_middle_class") || "");
    ok(!!own && own[1] === "1 for · 1 against", `Lee's Middle-Class Tax Relief drawer tally moved: ${own && own[1]}`);
  }
  ok(!RI.recordOf("lee", "tax_middle_class"), "Lee's Middle-Class Tax Relief record now runs one way");
  const ln = lines(CS.gapViewHtml("lee", "national_debt") || "");
  const L = String(win.ISSUE_MAP.tax_middle_class.label).replace(/^[^A-Za-z0-9]+/, "").trim();
  eq(JSON.stringify(ln.filter((l) => l.startsWith(L))), JSON.stringify([`${L}: no stated position · 1 for · 1 against`]),
     "Lee's National Debt drawer: Middle-Class Tax Relief shows no stated position · 1 for · 1 against");
  // One-way record lines and stated lines keep their words on the same drawer.
  ok(ln.some((l) => / · record runs (with|against)$/.test(l)), "no one-way record line on Lee's National Debt drawer");
  ok(ln.some((l) => /: (supports|opposes) · /.test(l)), "no stated line on Lee's National Debt drawer");
  ok(ln.every((l) => PART_RE.test(l)), `a National Debt line lacks a part — ${JSON.stringify(ln)}`);
  // Every related key with no votes and no stance stays out.
  for (const k of RI.MAP.national_debt) {
    const has = (pm[k] && /^(support|oppose)$/.test(pm[k].stance)) || RI.recordOf("lee", k) || RI.hasVotes("lee", k);
    const Lk = String(win.ISSUE_MAP[k].label).replace(/^[^A-Za-z0-9]+/, "").trim();
    if (!has) ok(!ln.some((l) => l === Lk || l.startsWith(Lk + ":")), `${k}: no votes and no stance, yet listed`);
  }
}

// ── 2, 3 · fixture file ─────────────────────────────────────────────────────
const PID = "lee";
const FIX = {
  [PID]: {
    lands_preserve: "support", lands_keep_public: "support", energy_production: "oppose",
    gov_regulation: "support", lands_local: "mixed", lands_energy: "mixed",
    gun_rights: "support", gun_safety: "oppose",
  },
};
{
  const win = boot(true, FIX);
  if (win.__err) failures.push(`boot: ${win.__err}`);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  ok(RI && typeof RI.drawerHtml === "function", "PDXRelatedIssues.drawerHtml is published");
  const pm = win._polPositionMap(PID, win.CMP_DATA[PID]);
  const want = (key) => RI.MAP[key].map((k) => wantLine(win, PID, k)).filter(Boolean);

  const h = CS.gapViewHtml(PID, "lands_preserve") || "";
  const b = block(h);
  ok(!!b && text(b).startsWith("Related issues"), "Protect Public Lands drawer: no Related issues block");
  const ln = lines(h);
  eq(JSON.stringify(ln), JSON.stringify(want("lands_preserve")), "drawer lists every related published position, in map order");
  for (const l of ["Keep Public Lands Public: supports · ", "Expand Domestic Energy Production: opposes · ", "Cut Federal Red Tape: supports · "]) {
    ok(ln.some((x) => x.startsWith(l)), `drawer lacks ${l}`);
  }
  ok(!ln.some((l) => /^(Local Land Control|Energy & Resource Development): (supports|opposes)/.test(l)), "a mixed related position is printed");
  ok(!ln.some((l) => /Gun/.test(l)), "an unrelated issue is printed");
  ok(!ln.some((l) => /^Protect Public Lands:/.test(l)), "the open issue is listed");
  ok(!doors(b).some((x) => x.key === "lands_preserve"), "the open issue is a link");
  eq(doors(b).length, ln.length, "not every related line is a link");
  for (const x of doors(b)) eq(x.pid, PID, `${x.key} link opens another person`);
  eq((h.match(/class="pdxri pdxri-drawer"/g) || []).length, 1, "exactly one block in the drawer");
  ok(!/%|score|grade|contradict|badge/i.test(text(b)), "the drawer block carries a verdict word");

  const back = CS.gapViewHtml(PID, "lands_keep_public") || "";
  ok(lines(back).some((l) => l.startsWith("Protect Public Lands: supports · ")), "the linked drawer lacks the issue just left");
  ok(doors(block(back)).some((x) => x.key === "lands_preserve"), "the linked drawer has no link back");
  ok(!doors(block(back)).some((x) => x.key === "lands_keep_public"), "the linked drawer links to itself");

  const hg = lines(CS.gapViewHtml(PID, "gun_rights") || "");
  ok(hg.some((l) => l.startsWith("Stronger Gun Safety Laws: opposes · ")) && !hg.some((l) => /Lands/.test(l)), "the gun drawer lists the wrong issues");

  for (const key of ["voter_id", "pro_life", "healthcare"]) {
    const hx = CS.gapViewHtml(PID, key) || "";
    if (want(key).length) continue;
    ok(!/pdxri-drawer|Related issues/.test(hx), `${key}: a related-issues block prints with no related position`);
  }
  let omitted = 0;
  for (const key of Object.keys(RI.MAP)) {
    if (want(key).length) continue;
    omitted++;
    eq(RI.drawerHtml(PID, win.CMP_DATA[PID], key), "", `${key}: drawerHtml is not empty with no related position`);
  }
  ok(omitted > 0, "no issue without related positions was checked");

  const cs = R("consistency.js");
  ok(/closest\('\[data-pdxc-gap\]'\)[\s\S]{0,400}openGap\(gap\.getAttribute\('data-pdxc-gap-pid'\)[^,]*,\s*gap\.getAttribute\('data-pdxc-gap'\)/.test(cs),
     "the shared click route no longer opens openGap(pid, key) from data-pdxc-gap");
}

// ── 4 · nothing else moved on the real corpus ───────────────────────────────
{
  const off = boot(false), on = boot(true);
  const pids = ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis", "john_boyd"];
  let sheets = 0, withBlock = 0, bothChecked = 0;
  for (const pid of pids) {
    let rows0 = [], rows1 = [];
    try { rows0 = off.PDXConsistency.issueRows(pid) || []; rows1 = on.PDXConsistency.issueRows(pid) || []; } catch { /* none */ }
    eq(JSON.stringify(rows1), JSON.stringify(rows0), `${pid}: issue rows / scores moved`);
    for (const r of rows0) {
      const a = off.PDXConsistency.gapViewHtml(pid, r.key) || "";
      const b = on.PDXConsistency.gapViewHtml(pid, r.key) || "";
      sheets++;
      const bl = block(b);
      if (bl) {
        withBlock++;
        const want = on.PDXRelatedIssues.itemsFor(pid, on.CMP_DATA[pid], r.key).flatMap(on.PDXRelatedIssues.lineTexts);
        eq(JSON.stringify(lines(b)), JSON.stringify(want), `${pid} × ${r.key}: drawer lines are not this issue's related positions`);
        // One line per issue, both parts on it.
        const lis = [...bl.matchAll(/<li class="pdxri-item" data-pdxri-key="([^"]+)"[\s\S]*?<\/li>/g)];
        const keys = lis.map((m) => m[1]);
        eq(new Set(keys).size, keys.length, `${pid} × ${r.key}: an issue appears as two lines`);
        ok(!keys.includes(r.key), `${pid} × ${r.key}: the open issue is listed`);
        for (const m of lis) {
          ok((m[0].match(/class="pdxri-dir s-/g) || []).length === 1 && (m[0].match(/class="pdxri-(rec r-|tally)/g) || []).length === 1,
             `${pid} × ${r.key} × ${m[1]}: a line lacks one part or carries two`);
          ok(PART_RE.test(text(m[0])), `${pid} × ${r.key} × ${m[1]}: "${text(m[0])}" is not one two-part line`);
        }
        bothChecked += lis.length;
      } else {
        eq(on.PDXRelatedIssues.itemsFor(pid, on.CMP_DATA[pid], r.key).length, 0, `${pid} × ${r.key}: related position but no block`);
      }
      ok(b.replace(bl, "") === a, `${pid} × ${r.key}: the drawer changed beyond the related-issues block`);
    }
  }
  ok(sheets > 20, `only ${sheets} drawers sampled`);
  ok(bothChecked > 100, `only ${bothChecked} lines checked for both parts`);
  console.log(`   real corpus: ${sheets} drawers compared · ${withBlock} carry a related-issues block`);
}

// ── 5 · where this conflicts: the reader's stances against the mapped pairs ─
{
  const CFB = (h) => (/<div class="pdxri-conflicts"[\s\S]*?<\/(?:ul|p)><\/div>/.exec(h) || [""])[0];
  const withSides = (win, sides) => {
    win.PDXStanceSides = { list: () => Object.entries(sides).map(([key, position]) => ({ key, position, priority: "medium" })) };
    return win;
  };
  const OTHER = { support: "oppose", oppose: "support" };
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const pm = win._polPositionMap("lee", win.CMP_DATA.lee) || {};
  const dirOf = (k) => (pm[k] && /^(support|oppose)$/.test(pm[k].stance) ? pm[k].stance : null);
  const agrees = (k, side) => {
    const d = dirOf(k), r = RI.recordOf("lee", k);
    return (!d || d === side) && (!r || r === (side === "support" ? "with" : "against"));
  };

  // A stated conflict: Lee's stated side on Keep Public Lands Public, the reader on the other side.
  const kp = dirOf("lands_keep_public");
  withSides(win, { lands_keep_public: OTHER[kp] });
  let h = CS.gapViewHtml("lee", "lands_preserve") || "";
  let cf = CFB(h);
  ok(cf, "a reader whose stance conflicts with a mapped pair gets no Where this conflicts section");
  ok(text(cf).startsWith("Where this conflicts"), "the section is not headed Where this conflicts");
  const line = [...cf.matchAll(/<li class="pdxri-cf-item" data-pdxri-cf="lands_keep_public">[\s\S]*?<\/li>/g)].map((m) => text(m[0]))[0] || "";
  eq(line, `Protect Public Lands and Keep Public Lands Public: on Keep Public Lands Public they ${kp}; you ${OTHER[kp]}.`,
    "the conflict line does not name both issues, Lee's stated side and the reader's stance");
  const at = h.indexOf('class="pdxri pdxri-drawer"'), c0 = h.indexOf('class="pdxri-conflicts"');
  const tally = h.indexOf('data-pdxlg-tally="1"'), table = h.indexOf('<table class="pdxlg-t">');
  ok(at >= 0 && c0 > at, "the section is not after the stated/record lines");
  ok(c0 < tally && c0 < table, "the section is not before the vote rows");
  // Only pairs from the map, each listed once.
  const cfKeys = [...cf.matchAll(/data-pdxri-cf="([^"]+)"/g)].map((m) => m[1]);
  ok(cfKeys.every((k) => RI.MAP.lands_preserve.includes(k)), `a conflict pair is not in the map — ${JSON.stringify(cfKeys)}`);
  eq(new Set(cfKeys).size, cfKeys.length, "a pair is listed twice");
  // The existing block is unchanged by the section.
  const plain = boot(true).PDXConsistency.gapViewHtml("lee", "lands_preserve") || "";
  eq(h.replace(cf, ""), plain, "the drawer changed beyond the conflicts section");

  // A record conflict: Protect Public Lands has no stated position from Lee, a record that runs one way.
  const rp = RI.recordOf("lee", "lands_preserve");
  ok(!dirOf("lands_preserve") && (rp === "with" || rp === "against"), "fixture: Lee's Protect Public Lands is not record-only");
  const youRec = rp === "against" ? "support" : "oppose";
  withSides(win, { lands_preserve: youRec });
  h = CS.gapViewHtml("lee", "lands_keep_public") || "";
  cf = CFB(h);
  const rl = [...cf.matchAll(/<li class="pdxri-cf-item" data-pdxri-cf="lands_preserve">[\s\S]*?<\/li>/g)].map((m) => text(m[0]))[0] || "";
  eq(rl, `Keep Public Lands Public and Protect Public Lands: on Protect Public Lands their record runs ${rp} it; you ${youRec}.`,
    "a record-only side does not print as the record");
  ok(/data-pdxri-cf-how="record"/.test(cf), "the record side is not marked as the record");

  // Stances on file, none conflicting → the section reads the no-conflicts line.
  const calm = RI.MAP.lands_preserve.find((k) => dirOf(k) && agrees(k, dirOf(k)));
  ok(!!calm, "fixture: no related issue where Lee's stated and record sides agree");
  withSides(win, { [calm]: dirOf(calm) });
  h = CS.gapViewHtml("lee", "lands_preserve") || "";
  cf = CFB(h);
  eq(text(cf), "Where this conflictsNo conflicts with your stances on these issues.", "stances with no conflict do not read the no-conflicts line");
  ok(!/pdxri-cf-item/.test(cf), "the no-conflicts section lists a line");

  // A mixed side is not a side.
  withSides(win, { lands_keep_public: "mixed" });
  ok(!CFB(CS.gapViewHtml("lee", "lands_preserve") || ""), "a reader holding only a mixed side gets the section");
  // No saved stances, or no stance reader on the page → no section.
  withSides(win, {});
  ok(!CFB(CS.gapViewHtml("lee", "lands_preserve") || ""), "a reader with no saved stances gets the section");
  delete win.PDXStanceSides;
  ok(!/pdxri-conflicts/.test(CS.gapViewHtml("lee", "lands_preserve") || ""), "a page with no stance reader gets the section");
  // An open issue with no listed related issue prints nothing, even with stances.
  withSides(win, { lands_keep_public: OTHER[kp] });
  eq(RI.conflictsHtml("lee", win.CMP_DATA.lee, "no_such_issue_key"), "", "an issue outside the map prints a section");

  // Copy and routes: no residency, equity, Utah-first or verdict words; no doors.
  withSides(win, { lands_keep_public: OTHER[kp], lands_preserve: youRec });
  for (const k of ["lands_preserve", "lands_keep_public"]) {
    const b = CFB(CS.gapViewHtml("lee", k) || "");
    ok(!/<a\b|href=/.test(b), `${k}: the conflicts section links somewhere`);
    ok(!/\butah\b|\bfirst\b|coming|equity|\bstocks?\b|\bshares?\b|member|residen|verif|%|score|grade|badge/i.test(text(b)),
      `${k}: the conflicts section carries banned wording — ${text(b)}`);
  }
  // The map itself is not changed by reading it.
  const fresh = boot(true).PDXRelatedIssues.MAP;
  eq(JSON.stringify(RI.MAP), JSON.stringify(fresh), "reading conflicts changed the map");
  ok(/v521 - [\s\S]*?MIGRATION COST: none/.test(R("sw.js")), "the shell's v521 note does not say no migration");
  ok(Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 521, "the shell did not move for the conflicts section");
}

// ── 6 · the same section on the homepage, person, issue and ballot pages ────
// Each page loads the real stance reader and both stores (no stand-in reader):
// the stores run in the drawer sandbox over a saved device stance, and the
// section must read exactly as it does on the homepage.
{
  const CFB = (h) => (/<div class="pdxri-conflicts"[\s\S]*?<\/(?:ul|p)><\/div>/.exec(h) || [""])[0];
  const live = (f) => R(f).replace(/<!--[\s\S]*?-->/g, "");
  const PAGES = { "index.html": "/", "person.html": "/p/lee", "issue.html": "/i/lands_preserve", "ballot.html": "/ballot" };
  const STORE_FILES = ["stance-sides.js", "my-stances.js", "your-file.js"];
  for (const page of Object.keys(PAGES)) {
    for (const f of [...STORE_FILES, "consistency.js", "related-issues.js"]) {
      ok(live(page).includes(`<script defer src="/${f}"></script>`), `${page}: does not load /${f}`);
    }
  }
  const OTHER = { support: "oppose", oppose: "support" };
  // A drawer on `page` for a reader whose device store holds `sides`.
  function drawerOn(page, sides, key = "lands_preserve") {
    const win = boot(true);
    const mem = {};
    if (sides) {
      const items = {};
      for (const [k, position] of Object.entries(sides)) items[k] = { issueKey: k, position, priority: "medium", updatedAt: 1, createdAt: 1 };
      mem.pdx_my_stances_v1 = JSON.stringify({ version: 1, items, tombstones: {}, settings: {}, updatedAt: 1 });
    }
    win.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; },
    };
    win.location = Object.assign({}, win.location, { pathname: PAGES[page], href: "https://politidex.fyi" + PAGES[page] });
    for (const f of STORE_FILES) {
      try { vm.runInContext(R(f), win, { filename: f }); } catch (e) { failures.push(`${page}: ${f} threw on boot — ${e.message}`); }
    }
    ok(!!(win.PDXStances && win.PDXStanceSides), `${page}: the real stance reader and store did not publish`);
    return { win, h: win.PDXConsistency.gapViewHtml("lee", key) || "" };
  }
  const base = boot(true);
  const pm = base._polPositionMap("lee", base.CMP_DATA.lee) || {};
  const kp = pm.lands_keep_public && pm.lands_keep_public.stance;
  const want = `Protect Public Lands and Keep Public Lands Public: on Keep Public Lands Public they ${kp}; you ${OTHER[kp]}.`;
  const plain = base.PDXConsistency.gapViewHtml("lee", "lands_preserve") || "";
  // A related issue where Lee's stated side and record agree, held the same way.
  const dirOf = (k) => (pm[k] && /^(support|oppose)$/.test(pm[k].stance) ? pm[k].stance : null);
  const calm = base.PDXRelatedIssues.MAP.lands_preserve.find((k) => {
    const d = dirOf(k), r = base.PDXRelatedIssues.recordOf("lee", k);
    return d && (!r || r === (d === "support" ? "with" : "against"));
  });
  ok(!!calm, "fixture: no related issue where Lee's stated side and record agree");
  const calmSide = calm ? dirOf(calm) : "support";
  let first = null;
  for (const page of Object.keys(PAGES)) {
    // A conflicting saved stance → the section, the same line, the same place.
    const { h } = drawerOn(page, { lands_keep_public: OTHER[kp] });
    const cf = CFB(h);
    ok(text(cf).startsWith("Where this conflicts"), `${page}: a conflicting saved stance shows no Where this conflicts section`);
    const line = [...cf.matchAll(/<li class="pdxri-cf-item" data-pdxri-cf="lands_keep_public">[\s\S]*?<\/li>/g)].map((m) => text(m[0]))[0] || "";
    eq(line, want, `${page}: the conflict line is not the homepage's wording`);
    const at = h.indexOf('class="pdxri pdxri-drawer"'), c0 = h.indexOf('class="pdxri-conflicts"'), table = h.indexOf('<table class="pdxlg-t">');
    ok(at >= 0 && c0 > at && c0 < table, `${page}: the section is not after the related-issues lines and before the vote rows`);
    if (first === null) first = cf; else eq(cf, first, `${page}: the section differs from the homepage's`);
    // A saved stance that agrees with Lee's stated side and record → the no-conflicts line.
    eq(text(CFB(drawerOn(page, { [calm]: calmSide }).h)), "Where this conflictsNo conflicts with your stances on these issues.",
      `${page}: a non-conflicting saved stance does not read the no-conflicts line`);
    // Only a mixed stance, or none → no section, and the drawer is the plain one.
    const mixed = drawerOn(page, { lands_keep_public: "mixed" }).h;
    ok(!/pdxri-conflicts/.test(mixed), `${page}: a reader with only a mixed stance gets the section`);
    const none = drawerOn(page, null).h;
    ok(!/pdxri-conflicts/.test(none), `${page}: a reader with no saved stances gets the section`);
    eq(none, plain, `${page}: with no saved stances the drawer changed`);
  }
  // No new routes: the three documents are served by the rewrites they already had.
  const toml = R("netlify.toml").split("\n").filter((l) => !/^\s*#/.test(l)).join("\n");
  ok(!/my-stances\.js|your-file\.js|stance-sides\.js/.test(toml), "a stance script got its own route");
  const sw = R("sw.js");
  for (const f of ["/stance-sides.js", "/my-stances.js"]) ok(sw.includes(`  '${f}',\n`), `${f} is not precached`);
  // your-file.js stays out of the precache on purpose (a stale copy beside a fresh shell paints an overlay).
  ok(!sw.includes("  '/your-file.js',\n"), "/your-file.js was added to the precache");
  ok(/v522 - [\s\S]*?MIGRATION COST: none/.test(sw), "the shell's v522 note does not say no migration");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 522, "the shell did not move for the three pages");
}

// ── 7 · the new cross-topic pairs feed the conflicts check ──────────────────
// On the real corpus, every new pair where a politician has a stated side or a
// one-way record on one side: a reader on the other side of it gets a line
// naming both issues, that side, and the reader's stance.
{
  ok(Array.isArray(NEW_PAIRS) && NEW_PAIRS.length >= 10, "the new pairs list could not be read from the related-issues suite");
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  const OTHER = { support: "oppose", oppose: "support" };
  const RECSIDE = { with: "support", against: "oppose" };
  let hits = 0, statedHits = 0, recordHits = 0;
  const pids = Object.keys(win.CMP_DATA);
  for (const [a, b] of NEW_PAIRS || []) {
    for (const [open, other] of [[a, b], [b, a]]) {
      // The first politician with a side on `other` that is listed in `open`'s drawer.
      for (const pid of pids) {
        const it = RI.itemsFor(pid, win.CMP_DATA[pid], open).find((x) => x.key === other);
        if (!it || !(it.dir || it.rec)) continue;
        const theirs = it.dir || RECSIDE[it.rec];
        win.PDXStanceSides = { list: () => [{ key: other, position: OTHER[theirs], priority: "medium" }] };
        const list = RI.conflictsFor(pid, win.CMP_DATA[pid], open) || [];
        const c = list.find((x) => x.bKey === other);
        ok(!!c, `${pid} × ${open} · ${other}: a reader against their side gets no conflicts line`);
        if (c) {
          const t = RI.conflictText(c);
          const they = it.dir ? (it.dir === "support" ? "they support" : "they oppose")
            : (it.rec === "with" ? "their record runs with it" : "their record runs against it");
          eq(t, `${lbl(win, open)} and ${lbl(win, other)}: on ${lbl(win, other)} ${they}; you ${OTHER[theirs]}.`,
            `${pid} × ${open} · ${other}: the line does not name both issues, their side and the reader's stance`);
          ok(CS.gapViewHtml(pid, open).includes(`data-pdxri-cf="${other}"`), `${pid} × ${open} · ${other}: the drawer does not print the line`);
          hits++; if (it.dir) statedHits++; else recordHits++;
        }
        break;
      }
    }
  }
  delete win.PDXStanceSides;
  ok(hits >= 1, "no new pair produced a conflicts line on the real corpus");
  const sw = R("sw.js");
  ok(/v523 - [\s\S]*?MIGRATION COST: none/.test(sw), "the shell's v523 note does not say no migration");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 523, "the shell did not move for the new pairs");
  console.log(`   new pairs: ${hits} conflict lines checked (${statedHits} stated, ${recordHits} record)`);
}

// ── 8 · show N more: long blocks collapse, short ones do not ───────────────
{
  // A tiny DOM over one block's markup: its list items, each with an attribute
  // set, and the button, whose closest('ul') is that list.
  function fakeList(html) {
    const ul = { rows: [] };
    let btn = null;
    for (const m of html.matchAll(/<li class="([^"]+)"([^>]*)>([\s\S]*?)<\/li>/g)) {
      if (m[1] === "pdxri-more-li") {
        const b = /<button[^>]*data-pdxri-more="(\d+)"[^>]*aria-expanded="(\w+)"[^>]*>([^<]*)<\/button>/.exec(m[3]);
        const attrs = { "data-pdxri-more": b[1], "aria-expanded": b[2] };
        btn = {
          textContent: b[3], attrs,
          getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = String(v); },
          closest: (sel) => (sel === "ul" ? ul : null),
        };
        continue;
      }
      const attrs = {};
      for (const a of m[2].matchAll(/\s([a-z-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = a[2] === undefined ? "" : a[2];
      ul.rows.push({ cls: m[1], attrs, text: text(m[3]),
        removeAttribute(k) { delete this.attrs[k]; }, setAttribute(k, v) { this.attrs[k] = String(v); } });
    }
    ul.querySelectorAll = (sel) => (sel === "[data-pdxri-extra]" ? ul.rows.filter((r) => "data-pdxri-extra" in r.attrs) : []);
    const visible = () => ul.rows.filter((r) => !("hidden" in r.attrs));
    return { ul, btn, visible };
  }
  const win = boot(true);
  const CS = win.PDXConsistency, RI = win.PDXRelatedIssues;
  eq(RI.RELATED_SHOWN, 4, "the related-issues block does not show four lines before collapsing");
  eq(RI.CONFLICTS_SHOWN, 3, "the conflicts section does not show three lines before collapsing");

  // Related issues: find a real drawer with five or more lines and one with four or fewer.
  const pids = ["lee", "trump", "chellie_pingree", "blake_moore", "celeste_maloy", "john_curtis", "john_boyd"];
  let long = null, short = null;
  for (const pid of pids) {
    for (const r of (CS.issueRows(pid) || [])) {
      const n = RI.itemsFor(pid, win.CMP_DATA[pid], r.key).length;
      if (!long && n >= 5) long = { pid, key: r.key, n };
      if (!short && n >= 1 && n <= 4) short = { pid, key: r.key, n };
    }
    if (long && short) break;
  }
  ok(!!long, "fixture: no sampled drawer has five or more related-issues lines");
  ok(!!short, "fixture: no sampled drawer has between one and four related-issues lines");
  if (long) {
    const h = CS.gapViewHtml(long.pid, long.key) || "";
    const bl = block(h);
    const f = fakeList(bl);
    eq(f.ul.rows.length, long.n, `${long.pid} × ${long.key}: a line was dropped instead of hidden`);
    eq(f.visible().length, 4, `${long.pid} × ${long.key}: the block does not show its first four lines`);
    ok(f.ul.rows.slice(0, 4).every((r) => !("hidden" in r.attrs)) && f.ul.rows.slice(4).every((r) => "hidden" in r.attrs),
      `${long.pid} × ${long.key}: the shown lines are not the first four`);
    ok(f.btn && f.btn.textContent === `Show ${long.n - 4} more`, `${long.pid} × ${long.key}: no "Show ${long.n - 4} more" control`);
    ok(/<li class="pdxri-more-li">[\s\S]*<\/li><\/ul><\/div>$/.test(bl), `${long.pid} × ${long.key}: the control is not at the bottom of the block`);
    eq(RI.toggleMore(f.btn), true, "the control did not open");
    eq(f.visible().length, long.n, `${long.pid} × ${long.key}: expanding did not reveal every line`);
    eq(f.btn.textContent, "Show fewer", "an open control does not read Show fewer");
    eq(f.btn.attrs["aria-expanded"], "true", "an open control is not marked expanded");
    eq(RI.toggleMore(f.btn), false, "the control did not close");
    eq(f.visible().length, 4, `${long.pid} × ${long.key}: collapsing did not return to the first four`);
    eq(f.btn.textContent, `Show ${long.n - 4} more`, "a closed control does not read Show N more again");
    // The lines themselves, in order and in words, are what they were.
    eq(JSON.stringify(lines(h)), JSON.stringify(RI.itemsFor(long.pid, win.CMP_DATA[long.pid], long.key).flatMap(RI.lineTexts)),
      `${long.pid} × ${long.key}: collapsing changed the lines`);
  }
  if (short) {
    const bl = block(CS.gapViewHtml(short.pid, short.key) || "");
    ok(!/data-pdxri-more|data-pdxri-extra|\shidden[\s>]/.test(bl), `${short.pid} × ${short.key}: four or fewer lines still collapse`);
  }
  // Exactly four, and five, on a fixture file: the cut is at four.
  {
    const rel = boot(true).PDXRelatedIssues.MAP.lands_preserve;
    const fx = (n) => Object.fromEntries(rel.slice(0, n).map((k) => [k, "support"]));
    const four = boot(true, { pdx_fixture_four: fx(4) }).PDXRelatedIssues.drawerHtml("pdx_fixture_four", {}, "lands_preserve");
    eq((four.match(/<li class="pdxri-item"/g) || []).length, 4, "fixture: four stances did not print four lines");
    ok(!/data-pdxri-more|data-pdxri-extra|\shidden[\s>]/.test(four), "exactly four related-issues lines still collapse");
    const five = boot(true, { pdx_fixture_five: fx(5) }).PDXRelatedIssues.drawerHtml("pdx_fixture_five", {}, "lands_preserve");
    eq((five.match(/<li class="pdxri-item"/g) || []).length, 5, "fixture: five stances did not print five lines");
    ok(/>Show 1 more<\/button>/.test(five) && (five.match(/ hidden>/g) || []).length === 1, "five related-issues lines do not show four and Show 1 more");
  }

  // Conflicts: Lee × Protect Public Lands, reader against every related issue Lee holds a side on.
  const OTHER = { support: "oppose", oppose: "support" };
  const RECSIDE = { with: "support", against: "oppose" };
  const items = RI.itemsFor("lee", win.CMP_DATA.lee, "lands_preserve").filter((it) => it.dir || it.rec);
  ok(items.length >= 5, `fixture: Lee's Protect Public Lands drawer has only ${items.length} related issues with a side`);
  const CFB = (h) => (/<div class="pdxri-conflicts"[\s\S]*?<\/(?:ul|p)><\/div>/.exec(h) || [""])[0];
  const against = (list) => { win.PDXStanceSides = { list: () => list.map((it) => ({ key: it.key, position: OTHER[it.dir || RECSIDE[it.rec]], priority: "medium" })) }; };
  against(items);
  let cf = CFB(CS.gapViewHtml("lee", "lands_preserve") || "");
  const nCf = (RI.conflictsFor("lee", win.CMP_DATA.lee, "lands_preserve") || []).length;
  ok(nCf > 3, `fixture: only ${nCf} conflict lines`);
  let f = fakeList(cf);
  eq(f.ul.rows.length, nCf, "a conflict line was dropped instead of hidden");
  eq(f.visible().length, 3, "the conflicts section does not show its first three lines");
  ok(f.btn && f.btn.textContent === `Show ${nCf - 3} more`, `the conflicts section has no "Show ${nCf - 3} more" control`);
  ok(/<li class="pdxri-more-li">[\s\S]*<\/li><\/ul><\/div>$/.test(cf), "the conflicts control is not at the bottom of its section");
  RI.toggleMore(f.btn);
  eq(f.visible().length, nCf, "expanding the conflicts section did not reveal every line");
  RI.toggleMore(f.btn);
  eq(f.visible().length, 3, "collapsing the conflicts section did not return to the first three");
  eq(f.ul.rows.map((r) => r.text).join(" | "),
    (RI.conflictsFor("lee", win.CMP_DATA.lee, "lands_preserve") || []).map(RI.conflictText).join(" | "),
    "collapsing changed the conflict lines");
  // Three or fewer: no control.
  against(items.slice(0, 3));
  cf = CFB(CS.gapViewHtml("lee", "lands_preserve") || "");
  eq((cf.match(/<li class="pdxri-cf-item"/g) || []).length, 3, "fixture: three conflicts did not print three lines");
  ok(!/data-pdxri-more|data-pdxri-extra|\shidden[\s>]/.test(cf), "three conflict lines still collapse");
  // The no-conflicts line never collapses: a reader who agrees with Lee on
  // every related issue where his stated side and record do not split.
  const agree = items.filter((it) => !(it.dir && it.rec && RECSIDE[it.rec] !== it.dir));
  win.PDXStanceSides = { list: () => agree.map((it) => ({ key: it.key, position: it.dir || RECSIDE[it.rec], priority: "medium" })) };
  ok(agree.length > 3, `fixture: only ${agree.length} agreeing stances`);
  eq((RI.conflictsFor("lee", win.CMP_DATA.lee, "lands_preserve") || []).length, 0, "fixture: agreeing stances still conflict");
  cf = CFB(CS.gapViewHtml("lee", "lands_preserve") || "");
  ok(/pdxri-cf-none/.test(cf) && !/data-pdxri-more|\shidden[\s>]/.test(cf), "the no-conflicts line collapses");
  delete win.PDXStanceSides;

  // The page hears the button: one capture-phase click listener, which opens it.
  {
    const w2 = boot(false);
    const heard = [];
    w2.document.addEventListener = (type, fn, cap) => heard.push({ type, fn, cap });
    vm.runInContext(R("related-issues.js"), w2, { filename: "related-issues.js" });
    const click = heard.filter((x) => x.type === "click");
    eq(click.length, 1, "related-issues.js does not listen for the control's click once");
    ok(click[0] && click[0].cap === true, "the control's click listener is not in the capture phase");
    if (long && click[0]) {
      const g = fakeList(block(w2.PDXConsistency.gapViewHtml(long.pid, long.key) || ""));
      let prevented = false;
      click[0].fn({ target: { closest: (sel) => (sel === "[data-pdxri-more]" ? g.btn : null) }, preventDefault() { prevented = true; } });
      ok(prevented && g.visible().length === long.n, "a click on Show N more does not open the block");
      click[0].fn({ target: { closest: () => null }, preventDefault() { prevented = "other"; } });
      ok(prevented === true, "a click elsewhere was handled");
    }
  }
  // The look: a hidden line stays hidden over the drawer's display:block rule.
  ok(/\.pdxri-drawer \[hidden\],\.pdxri-conflicts \[hidden\]\{display:none !important;\}/.test(RI.MORE_CSS),
    "a hidden line can still show under the drawer's display:block rule");
  const sw = R("sw.js");
  ok(/v524 - [\s\S]*?MIGRATION COST: none/.test(sw), "the shell's v524 note does not say no migration");
  ok(Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]) >= 524, "the shell did not move for Show N more");
}

// ── wiring ──────────────────────────────────────────────────────────────────
{
  const cs = R("consistency.js");
  ok(/typeof RI\.drawerHtml !== 'function'/.test(cs), "the drawer call is guarded");
  for (const page of ["index.html", "person.html", "ballot.html", "issue.html"]) {
    ok(R(page).includes('<script defer src="/related-issues.js"></script>'), `${page} loads related-issues.js`);
  }
  const sw = R("sw.js");
  ok(sw.includes("'/related-issues.js',") && sw.includes("'/consistency.js',"), "drawer scripts are precached");
  const v = Number((sw.match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v >= 511, "shell version bumped for one line per related issue");
  ok(/\.pdxri-dir, \.pdxri-rec, \.pdxri-tally \{ white-space: nowrap; \}/.test(R("person-file.css")) &&
     cs.includes("'.pdxri-drawer .pdxri-dir,.pdxri-drawer .pdxri-rec,.pdxri-drawer .pdxri-tally{white-space:nowrap;}'"),
     "a line part can break mid-phrase");
}

if (failures.length) {
  console.error(`\n✗ related-issues-drawer: ${failures.length} failure(s)\n  - ` + failures.join("\n  - "));
  process.exit(1);
}
console.log(`✓ related-issues-drawer: all ${passed} assertions passed`);
