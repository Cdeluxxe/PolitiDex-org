#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-money-theme.mjs — money is recognizable, and money is not a verdict
// ─────────────────────────────────────────────────────────────────────────────
// Finance had two colour problems at once, pulling in opposite directions.
//
// It had NO colour where it needed one. The letterhead money chip shipped in the
// same neutral steel as everything else in a letterhead, so nothing connected the
// 💰 pill on a person's name, the money row in the library, the header on Follow
// the Money and the funding block halfway down a profile. Four doors into one
// lane, and a reader had to read all four to find that out.
//
// And it had the WRONG colour where it had one. `_pdxFundingChip`,
// `_pdxFundingSection`, the Compare table's funding rows and the profile nav rail
// all painted a green → amber → red ladder keyed to donor mix: `is-grass` green,
// `is-mixed` amber, `is-big` red, with a matching 🌱 / ⚖️ / 🏦 glyph ramp behind
// it. That is the retired 0–100 "Constituents-First signal" — its three levels,
// its three colours, its cut-offs — surviving as CSS and emoji after the
// arithmetic was deleted. Nobody needed a tooltip to know which pill they were
// meant to disapprove of.
//
// Both are fixed by the same token: a DEEP FOREST FILL with a GOLD OUTLINE, a
// gold 💰 and gold dollar marks, used on money surfaces and nowhere else, and
// meaning exactly one thing — "this is the money lane". This file is the fence:
//
//   1. ONE TOKEN, DECLARED ONCE, MIRRORED HONESTLY. The :root custom properties
//      in finance-lane.css and PDXFinanceLane.THEME agree value for value. Two
//      copies exist because blocks travel with inline styles into surfaces that
//      never load the stylesheet; two copies that can drift silently are worse
//      than one that cannot travel.
//   2. THE SAME DOOR IN BOTH STATES. Lee's $8.6M chip and an empty Utah chip are
//      identical markup once the words are removed — same class, no inline style,
//      no state-keyed CSS override, same weight. Missing data stays WORDS.
//   3. THE DONOR-MIX RAMP IS GONE, NOT RENAMED. No surface maps `is-grass` /
//      `is-mixed` / `is-big` to different colours, no glyph ramp, and the
//      lane's own bucket palette is one colour rather than five.
//   4. NO BANNED HEX ON A MONEY SURFACE. Not the yes/no pair (#4ade80, #f87171),
//      not the verdict ramp (#6ee7a0, #f5c842, #86efac, #fca5a5), not the
//      outside-spending orange (#fb923c). Amber is what a middling grade looks
//      like on this site, and no money surface is allowed to look like a grade.
//   5. COMPOSITION BARS ARE GOLD-ON-SLATE, AND SAY SO BY LENGTH. Gold is the
//      dollars, slate is the rest. No bar encodes anything in brightness.
//   6. THE PAIR IS NOT FOR SALE. It appears on no issue chip, no Yea/Nay pill and
//      not on the ⚖️ Word vs Action badge sitting inches from the money chip in
//      the same letterhead. Housing and lands letterhead chips render exactly the
//      colours issue-colors.js gives them.
//   7. THE WALL STILL HOLDS. Booting the whole money theme moves no Direction
//      Match figure, no tier and no formal-pattern row.
//
//   node scripts/test-money-theme.mjs
//
// Real shipped modules in node:vm sandboxes, with the REAL FTM_FUNDING seed
// lifted out of index.html — so the chips compared here are browser chips.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox, ENGINE_FILES } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} missing`);
const lacks = (hay, needle, msg) =>
  ok(!String(hay).includes(needle), `${msg} — ${JSON.stringify(needle)} is still there`);
const section = (t) => console.log(`\n   ── ${t}`);
const die = (msg) => {
  console.error(`✗ money-theme: STALE HARNESS — ${msg}`);
  process.exit(1);
};

// Comments are where the reasoning lives, and reasoning is allowed to name the
// hex it retired. Every "no banned colour" sweep runs over stripped source.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ");

const INDEX = R("index.html");
const LANE_SRC = R("finance-lane.js");
const LANE_CSS = R("finance-lane.css");

// ── the real seed, lifted, not retyped ──────────────────────────────────────
function liftSeed() {
  const at = INDEX.indexOf("var FTM_FUNDING = {");
  if (at < 0) die("FTM_FUNDING is no longer in index.html");
  const end = INDEX.indexOf("\n    };", at);
  if (end < at) die("could not find the end of the FTM_FUNDING literal");
  const literal = INDEX.slice(at + "var FTM_FUNDING = ".length, end + "\n    }".length);
  return new Function("return (" + literal + ");")();
}
const SEED = liftSeed();
if (!SEED.lee) die("`lee` is no longer in the funding seed — the acceptance case names Lee");
if (!(SEED.lee.receipts > 0)) die("Lee's seeded receipts are not a positive figure");

function laneBox() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win._FTM_BY_ID = {};
  for (const id of Object.keys(SEED)) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
  win.FTM_AS_OF = (INDEX.match(/var FTM_AS_OF = '([^']*)'/) || [])[1] || "";
  vm.runInContext(LANE_SRC, ctx, { filename: "finance-lane.js" });
  if (!win.PDXFinanceLane) die("finance-lane.js did not install PDXFinanceLane");
  return win.PDXFinanceLane;
}
const L = laneBox();

// ── 1 · one token, declared once, mirrored honestly ─────────────────────────
{
  section("1 · one token, declared once, mirrored honestly");

  const T = L.THEME;
  ok(T && typeof T === "object", "PDXFinanceLane publishes THEME");
  if (!T) die("PDXFinanceLane.THEME is unavailable — the token is no longer published");

  // The CSS side of the token. Read out of :root rather than asserted as a
  // literal, so a rename in the stylesheet surfaces here as a mismatch instead
  // of quietly leaving the JS copy behind.
  const rootAt = LANE_CSS.indexOf(":root {");
  if (rootAt < 0) die("finance-lane.css no longer declares the token in :root");
  const rootBlock = LANE_CSS.slice(rootAt, LANE_CSS.indexOf("}", rootAt));
  const cssVar = (name) => {
    const m = rootBlock.match(new RegExp("--pdx-money-" + name + "\\s*:\\s*([^;]+);"));
    return m ? m[1].trim() : null;
  };
  const PAIRS = [
    ["fill", "fill"], ["fill-hi", "fillHi"], ["line", "line"],
    ["line-soft", "lineSoft"], ["ink", "ink"], ["text", "text"], ["rest", "rest"]
  ];
  for (const [css, js] of PAIRS) {
    const v = cssVar(css);
    ok(v !== null, `--pdx-money-${css} is declared in finance-lane.css`);
    eq(T[js], v, `--pdx-money-${css} and THEME.${js} are the same value`);
  }
  eq(Object.keys(T).length, PAIRS.length,
    "THEME carries exactly the values the stylesheet declares — no third, undeclared token");

  // The pair itself: a deep forest fill and a metallic gold, chosen so neither can
  // be mistaken for the verdict vocabulary that sits beside it on the same page.
  has(T.fill, "rgba(15, 61, 46", "the fill is a deep forest green");
  eq(T.line, "#c9992f", "the outline is the metallic gold");
  eq(T.rest, "#3d4f66", "'the rest' of a composition bar is slate");
  ok(T.line !== "#f5c842" && T.ink !== "#f5c842",
    "the gold is not this codebase's signal amber (#f5c842), which means a middling verdict");
  eq(L.ACCENT, T.line, "the lane's one accent IS the token's outline — not a second colour");

  // EVERY USE OUTSIDE finance-lane.css CARRIES A FALLBACK. That stylesheet loads
  // non-blocking (media=print + onload), so for the first frames of a page the
  // token does not exist yet, and `background: var(--pdx-money-fill)` with no
  // fallback is guaranteed-invalid — the declaration drops and a funding pill
  // paints with no fill and no border before snapping into place. A door that
  // flashes the wrong way on first paint is the same failure as a door that dims
  // when it is empty: the reader sees a difference that means nothing.
  // `var(--x, rgba(1, 2, 3, .4))` nests parentheses, so the fallback is read by
  // walking to the matching close rather than by a regex that stops at the first.
  const tokenUses = (src) => {
    const out = [];
    const re = /var\(\s*--pdx-money-([a-z-]+)\s*/g;
    let m;
    while ((m = re.exec(src))) {
      let i = re.lastIndex, depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
        i++;
      }
      const rest = src.slice(re.lastIndex, i - 1).trim();
      out.push({ name: m[1], fallback: rest.startsWith(",") ? rest.slice(1).trim() : null });
    }
    return out;
  };
  const CSS_OF = { fill: "fill", "fill-hi": "fillHi", line: "line", "line-soft": "lineSoft",
                   ink: "ink", text: "text", rest: "rest" };
  for (const f of ["app.css", "index.html", "my-profile.css", "impact-ledger.css"]) {
    const src = f.endsWith(".css") ? stripCss(R(f)) : R(f);
    const uses = tokenUses(src);
    ok(uses.length > 0, `${f} actually references the money token`);
    const bare = uses.filter((u) => u.fallback === null).map((u) => u.name);
    eq(bare.length, 0,
      `${f} gives every money-token reference a fallback${bare.length ? ` (bare: ${bare.join(", ")})` : ""}`);
    // …and the fallback is the value the stylesheet declares, so the first frame
    // and every frame after it are the same colour.
    for (const u of uses) {
      if (!u.fallback) continue;
      const key = CSS_OF[u.name];
      ok(!!key, `${f} references a declared token name (saw --pdx-money-${u.name})`);
      if (key) eq(u.fallback, T[key], `${f}'s fallback for --pdx-money-${u.name} is the declared value`);
    }
  }

  // A colour that never varies cannot grade. If any of these ever gain a
  // level-keyed variant, this is where it shows up.
  for (const v of Object.values(T)) {
    ok(typeof v === "string" && v.length > 0, "every token value is a single flat value");
    lacks(v, "gradient", "no token value is a gradient — nothing ramps");
  }
}

// ── 2 · the same door in both states ────────────────────────────────────────
{
  section("2 · Lee's $8.6M chip and an empty Utah chip are the same door");

  const full = L.letterheadChipHtml("lee");
  ok(full.length > 40, "Lee's chip renders");
  const fullRead = L.chipRead("lee");
  eq(fullRead.state, "file", "Lee reads as a filing on file");
  has(full, "$8.6M", "…and prints the $8.6M figure");

  // A Utah id the seed does not carry. `chipRead` returns 'empty' for anyone
  // with no record, which is the acceptance case's "empty Utah chip".
  const EMPTY_PID = "utah-no-filing-yet";
  if (SEED[EMPTY_PID]) die(`${EMPTY_PID} unexpectedly has a filing in the seed`);
  const empty = L.letterheadChipHtml(EMPTY_PID);
  ok(empty.length > 40, "the empty chip renders — it is never nothing");
  eq(L.chipRead(EMPTY_PID).state, "empty", "an id with no record reads as `empty`");
  // "Yet" described a queue that does not exist — it told a reader the file was on
  // its way when for most of this roster nobody has looked and no ingest is
  // scheduled to look. "On hand" states only what PolitiDex is holding.
  has(empty, "No money file on hand", "the absent state is WORDS, not a colour");
  lacks(empty, "No money file yet", "…and does not promise a file that is not queued");

  // THE CENTRAL ASSERTION OF THIS FILE, and it needs one clarification about what
  // "identical" can honestly mean here. Lee's chip prints four facts and the empty
  // chip prints one, because Lee's filing contains four facts and the empty one
  // contains none. That is a difference in the WORDS, which is exactly where the
  // request puts it. What must not differ is the DOOR: the element, its class, its
  // attributes, its glyph, and the vocabulary of classes its words are allowed to
  // wear. So the comparison is on the frame, and it is exact.
  const frame = (html) => html
    .slice(0, html.indexOf(">") + 1)
    .replace(/data-pdx-mchip="[^"]*"/, 'data-pdx-mchip="PID"')
    .replace(/data-pdx-mchip-state="[^"]*"/, 'data-pdx-mchip-state="STATE"')
    .replace(/aria-label="[^"]*"/, 'aria-label="LABEL"');
  eq(frame(empty), frame(full),
    "the empty chip and the $8.6M chip open with byte-identical markup");
  ok(frame(full).includes('class="pdx-mchip"'),
    "…and that markup carries the one chip class and no state-keyed variant of it");

  // The gold 💰 leads both chips, at the same size, in the same span.
  const ico = (html) => (html.match(/<span class="pdx-mchip-ico"[^>]*>[^<]*<\/span>/) || [])[0];
  ok(!!ico(full), "the chip leads with the 💰 span");
  eq(ico(empty), ico(full), "the 💰 is byte-identical in both states — same glyph, same span, same class");

  // Every word on either chip wears a class from the same closed set. A new class
  // is how a "we only dim it a little when it's empty" variant would arrive.
  const CLASSES = ["pdx-mchip", "pdx-mchip-ico", "pdx-mchip-fig", "pdx-mchip-hi", "pdx-mchip-sep"];
  for (const [name, html] of [["Lee's chip", full], ["the empty chip", empty]]) {
    for (const m of html.matchAll(/class="(pdx-mchip[^"]*)"/g)) {
      ok(CLASSES.indexOf(m[1]) >= 0, `${name} uses only the chip's own classes (saw "${m[1]}")`);
    }
    has(html, '<span class="pdx-mchip-fig">',
      `${name} sets its leading fact in the same figure class`);
  }

  // Belt and braces on the two ways a variant could sneak back in.
  for (const [name, html] of [["Lee's chip", full], ["the empty chip", empty]]) {
    ok(!/style="/.test(html), `${name} carries no inline colour of its own`);
    has(html, 'class="pdx-mchip"', `${name} wears the one chip class`);
  }
  lacks(stripCss(LANE_CSS), "pdx-mchip-state",
    "no stylesheet rule keys off the chip's state — the state is for behaviour, not weight");

  // The state attribute is still emitted: the mount uses it, and a reader's
  // screen reader gets the words. It just cannot reach the paint.
  has(full, 'data-pdx-mchip-state="file"', "the state attribute survives for behaviour");
  has(empty, 'data-pdx-mchip-state="empty"', "…in both states");

  // And the row-sized door on the profile does the same thing.
  const rowFull = L.entryHtml("lee");
  const rowEmpty = L.entryHtml(EMPTY_PID);
  ok(rowFull.length > 100 && rowEmpty.length > 100, "the money entry row renders in both states");
  for (const [name, html] of [["on file", rowFull], ["not on file", rowEmpty]]) {
    has(html, "border-left:3px solid #c9992f", `the money entry row (${name}) has the gold left edge`);
    lacks(html, "dashed", `the money entry row (${name}) has no dashed frame`);
  }
}

// ── 3 · the donor-mix ramp is gone, not renamed ─────────────────────────────
{
  section("3 · the green → amber → red donor-mix ramp is gone");

  const APP = stripCss(R("app.css"));
  // The three ramp classes still exist as hooks — index.html and compare-table.js
  // emit them — but they may no longer resolve to DIFFERENT paint. The check is on
  // the declarations, not on the class names.
  const declsFor = (cls) => {
    const out = [];
    const re = new RegExp("\\." + cls + "\\s*[,{]", "g");
    let m;
    while ((m = re.exec(APP))) {
      const open = APP.indexOf("{", m.index);
      const close = APP.indexOf("}", open);
      if (open > 0 && close > open) out.push(APP.slice(open + 1, close).replace(/\s+/g, " ").trim());
    }
    return out;
  };
  // `pdx-fund-base` is now in the second column: the profile money section leads
  // with PDXFinanceLane.countsHtml (counts, no level), so nothing emits the
  // donor-mix pill and both its markup and its CSS are deleted. A class family
  // that does not exist is a STRONGER guarantee than one painted identically at
  // three levels — there is no rule left for a future edit to differentiate. So
  // the assertion is: either the family is gone, or every level it still has
  // paints the same, from the money token.
  const RAMP_FAMILIES = ["pdx-fchip", "cmp-fund-base"];
  const RETIRED_FAMILIES = ["pdx-fund-base"];
  for (const family of RAMP_FAMILIES.concat(RETIRED_FAMILIES)) {
    const grass = declsFor(`${family}\\.is-grass`);
    const mixed = declsFor(`${family}\\.is-mixed`);
    const big = declsFor(`${family}\\.is-big`);
    if (RETIRED_FAMILIES.includes(family)) {
      eq(grass.length + mixed.length + big.length, 0,
        `.${family} is retired: no level of it resolves to any rule at all`);
      lacks(stripJs(INDEX), `${family} `,
        `…and index.html emits no ${family} pill for the counts lead to sit beside`);
      continue;
    }
    ok(grass.length > 0, `.${family}.is-grass still resolves to a rule`);
    eq(JSON.stringify(grass), JSON.stringify(mixed),
      `.${family}: grassroots and mixed are painted identically`);
    eq(JSON.stringify(mixed), JSON.stringify(big),
      `.${family}: mixed and big-money are painted identically`);
    for (const d of grass) {
      has(d, "--pdx-money-", `.${family}'s one rule takes its colour from the money token`);
    }
  }

  // The retired SIZE TIER, on the same terms. "Large war chest" / "Modest war
  // chest" ranked a dollar figure that the tile beside it printed in full.
  // Scoped to the renderer, not to the whole file: one candidate's `whyItMatters`
  // prose calls a rival's fundraising "incumbent war chests", which is record
  // narrative quoting a filing's context rather than a tier this lane assigns.
  const sectAt = INDEX.indexOf("window._pdxFundingSection = function");
  if (sectAt < 0) die("_pdxFundingSection is no longer in index.html");
  const sectFn = stripJs(INDEX.slice(sectAt, INDEX.indexOf("\n    };", sectAt)));
  for (const dead of ["pdx-fund-scale", "war chest", "pdx-fund-baserow", "_pdxFundWord("]) {
    lacks(APP, dead, `app.css carries no ${dead} rule`);
    lacks(sectFn, dead, `the profile money section emits no ${dead}`);
  }
  // …and the counts lead is what took their place.
  has(sectFn, "PDXFinanceLane.countsHtml", "the money section leads with the counts read");

  // The glyph ramp behind the colour ramp. 🌱 / ⚖️ / 🏦 was the same three-step
  // judgement drawn in pictures, and the ⚖️ in the middle was Word vs Action's
  // own badge borrowed for a donor mix.
  const charAt = INDEX.indexOf("function _fundingCharacter(p)");
  if (charAt < 0) die("_fundingCharacter is no longer in index.html");
  const charFn = stripJs(INDEX.slice(charAt, INDEX.indexOf("\n    }", charAt)));
  eq((charFn.match(/icon = /g) || []).length, 1,
    "_fundingCharacter assigns its glyph exactly once, for every level");
  has(charFn, "icon = '\u{1F4B0}'", "…and that glyph is 💰");
  for (const glyph of ["\u{1F331}", "\u{1F3E6}", "⚖"]) {
    lacks(charFn, glyph, `_fundingCharacter no longer returns ${glyph} for one level`);
  }
  // The mix is still reported. Removing the ramp must not remove the fact.
  has(charFn, "% small-dollar", "the donor mix is still reported — in words, with its percentage");
  has(charFn, "kind = 'bigmoney'", "…and callers still get the category for use in text");

  // The nav rail dot, which showed every section of a profile at once and put a
  // three-colour verdict on donor mix beside dots that really are graded reads.
  const PF = stripJs(R("profiles-full.js"));
  const railAt = PF.indexOf("target: 'pdxsec-funding'");
  if (railAt < 0) die("the funding entry is no longer in the profile nav rail");
  const rail = PF.slice(PF.lastIndexOf("_navFund =", railAt), railAt + 220);
  has(rail, "_fc = '#c9992f'", "the rail's funding dot is the money gold, flat");
  lacks(rail, "grassroots'", "…and no longer switches colour on the funding kind");
  lacks(rail, "#f87171", "…so big-money no longer gets a red dot in the rail");

  // The lane's own bucket palette, which was five hues — one of them an amber
  // attached to a donor-mix category.
  const hues = new Set(Object.values(L.COLORS).map((h) => h.toLowerCase()));
  eq(hues.size, 1, "the five funding buckets are one colour");
  eq([...hues][0], L.THEME.line, "…and that colour is the token's gold");
}

// ── 4 · no banned hex on a money surface ────────────────────────────────────
{
  section("4 · no verdict colour, and no amber, on any money surface");

  // #4ade80 / #f87171 are this codebase's YES and NO. #6ee7a0 / #f5c842 / #86efac
  // / #fca5a5 are the retired grade's own ramp. #fb923c was the orange the
  // outside-spending eyebrow used to report a LEVEL in before the sentence
  // underneath got to report it in words.
  const BANNED = ["#4ade80", "#f87171", "#6ee7a0", "#f5c842", "#86efac", "#fca5a5", "#fb923c"];

  // my-profile.css also styles stance pills (is-support / is-oppose) and alignment
  // rows (is-agree / is-differ), which are genuinely two-valued and keep the
  // verdict vocabulary on purpose. The sweep is scoped to the file's MONEY rules,
  // because the claim being fenced is about money surfaces, not about the file.
  const MPC_ALL = stripCss(R("my-profile.css"));
  const moneyRules = MPC_ALL
    .split("}")
    .filter((r) => /\.mp-mix|\.mp-money|\.mp-fig|\.mp-sig/.test(r))
    .join("}");
  ok(moneyRules.length > 200, "found the Money Tree's own rules in my-profile.css to sweep");

  const SURFACES = [
    ["finance-lane.js", stripJs(LANE_SRC)],
    ["finance-lane.css", stripCss(LANE_CSS)],
    ["my-profile.css (money rules)", moneyRules],
    ["impact-ledger.css", stripCss(R("impact-ledger.css"))]
  ];
  for (const [name, src] of SURFACES) {
    for (const hex of BANNED) lacks(src, hex, `${name} uses no ${hex}`);
  }

  // The Money Tree's model, which is where the mix rows are built.
  const MP = stripJs(R("my-profile.js"));
  const mixBlock = MP.slice(MP.indexOf("var MIX = ["), MP.indexOf("function group3"));
  lacks(mixBlock, "#", "the Money Tree's source list declares no colour at all");
  lacks(MP, "LANE_COLORS", "…and keeps no local copy of the lane's palette");

  // The ledger recap's finance column.
  const IL = stripJs(R("impact-ledger.js"));
  const recapAt = IL.indexOf("function financeRecapHTML");
  if (recapAt < 0) die("financeRecapHTML is no longer in impact-ledger.js");
  const recap = IL.slice(recapAt, IL.indexOf("\n  }", recapAt));
  for (const hex of BANNED) lacks(recap, hex, `the ledger's finance recap uses no ${hex}`);
  has(recap, "#c9992f", "the recap's bar fill falls back to the money gold, not to steel");

  // And the two dollar figures that were painted in the YES green.
  const APP = stripCss(R("app.css"));
  for (const cls of ["cmp-fund-raised", "pdx-fund-raised"]) {
    const at = APP.indexOf("." + cls + " {");
    ok(at > 0, `.${cls} is still declared`);
    const decl = APP.slice(at, APP.indexOf("}", at));
    has(decl, "--pdx-money-ink", `.${cls} prints its dollars in the money ink`);
    lacks(decl, "#4ade80", `.${cls} no longer prints its dollars in the YES green`);
  }

  // The rendered blocks, not just the source — an inline style built by string
  // concatenation would slip past a grep for a literal.
  const RENDERED = [
    ["the composition block", L.compositionHtml(L.read("lee"))],
    ["the money entry row", L.entryHtml("lee")],
    ["the letterhead chip", L.letterheadChipHtml("lee")]
  ];
  for (const [name, html] of RENDERED) {
    ok(html.length > 30, `${name} rendered something to check`);
    for (const hex of BANNED) lacks(html, hex, `${name} paints no ${hex}`);
  }
}

// ── 5 · composition bars: gold is the dollars, slate is the rest ────────────
{
  section("5 · gold is the dollars, slate is the rest, and length carries the share");

  const c = L.read("lee");
  if (!c || !c.rows || c.rows.length < 3) die("Lee's composition came back with too few rows to check");
  const comp = L.compositionHtml(c);

  // One track per bucket, one fill per track. The old single stacked bar always
  // filled 100% — in compose() the buckets sum to `receipts` by construction — so
  // it looked like a measurement while measuring nothing.
  const tracks = (comp.match(/background:#3d4f66/g) || []).length;
  const fills = (comp.match(/background:#c9992f/g) || []).length;
  eq(tracks, c.rows.length, "every bucket gets its own slate track");
  eq(fills, tracks, "…and exactly one gold fill per track");
  lacks(comp, "overflow:hidden;margin-bottom:0.5rem;background:rgba(10,15,30,0.6)",
    "the five-segment stacked bar is gone");

  // The share is carried by width and by nothing else. No fill may vary in
  // colour, alpha or opacity with its number.
  const widths = [...comp.matchAll(/width:(\d+)%;height:100%;background:#c9992f/g)].map((m) => +m[1]);
  eq(widths.length, c.rows.length, "each fill declares its own width");
  for (let i = 0; i < widths.length; i++) {
    eq(widths[i], Math.max(Math.min(c.rows[i].share, 100), 0),
      `bucket ${c.rows[i].key}'s bar is as long as its share`);
  }
  ok(new Set(widths).size > 1, "the bars differ from one another — they are measuring something");
  lacks(comp, "opacity:", "no bar encodes anything in opacity");

  // The dollars and the label are both on the row, which is why no legend is
  // needed and no colour key exists to be misread.
  for (const r of c.rows) has(comp, r.amountFmt, `${r.short}'s dollar figure is printed on its row`);

  // The Money Tree's bars, which used to be a stack in the same five hues.
  const MPC = stripCss(R("my-profile.css"));
  has(MPC, "--pdx-money-rest", "the Money Tree's track is the token's slate");
  has(MPC, "--pdx-money-line", "…and its fill is the token's gold");
  lacks(MPC, ".mp-mix-seg", "the stacked segment class is gone");
  lacks(MPC, ".mp-mix-dot", "…and so is the colour-key legend dot it needed");

  // The ledger recap's track, which was near-black — which reads as empty
  // background rather than as the other dollars in the filing.
  const ILC = stripCss(R("impact-ledger.css"));
  const trackAt = ILC.indexOf(".pdx-ilx-fbar-track");
  ok(trackAt > 0, ".pdx-ilx-fbar-track is still declared");
  const track = ILC.slice(trackAt, ILC.indexOf("}", trackAt));
  has(track, "--pdx-money-rest", "the recap's track is the token's slate, so gold reads as a share of it");
  lacks(track, "rgba(10, 15, 30, .6)", "…not near-black, which reads as nothing at all");
}

// ── 6 · the pair is not for sale ────────────────────────────────────────────
{
  section("6 · the pair does not travel to issue chips, vote pills or Word vs Action");

  const GOLD = ["#c9992f", "#e3c176", "rgba(15, 61, 46", "rgba(201, 153, 47"];
  const OFF_LIMITS = [
    ["issue-colors.js", stripJs(R("issue-colors.js"))],
    ["word-action.css", stripCss(R("word-action.css"))]
  ];
  for (const [name, src] of OFF_LIMITS) {
    for (const g of GOLD) lacks(src, g, `${name} does not borrow the money pair`);
  }
  lacks(stripJs(R("issue-colors.js")), "--pdx-money",
    "issue-colors.js does not reach for the money token either");

  // Housing and lands letterhead chips get their colour from issue-colors.js, and
  // that module's answer for them is unchanged by any of this.
  const box = (() => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    vm.runInContext(R("issue-colors.js"), ctx, { filename: "issue-colors.js" });
    if (!win.PDXIssueColors) die("issue-colors.js did not install PDXIssueColors");
    return win.PDXIssueColors;
  })();
  const PALETTE = R("issue-colors.js");
  for (const key of ["economy_cost_of_living", "climate_energy", "spending_debt_waste"]) {
    const st = box.styleFor(key);
    ok(typeof st === "string" && st.length > 0, `issue-colors still styles ${key}`);
    for (const g of GOLD) lacks(st, g, `${key}'s chip is not painted in the money pair`);
  }
  // The housing and public-lands keys resolve through the core bundles above; what
  // matters for the acceptance case is that the money work touched none of it.
  has(PALETTE, "['climate_energy',         'Climate & Energy',          '#2ECC71']",
    "the Climate & Energy issue colour is byte-for-byte what it was");
  has(PALETTE, "['economy_cost_of_living', 'Economy & Cost of Living',  '#F5A623']",
    "…and so is Economy & Cost of Living's");

  // The Yea/Nay vocabulary. Vote pills are green and red because a vote really is
  // a two-valued thing; a dollar figure is not, which is the whole argument.
  const APP = stripCss(R("app.css"));
  const yeaAt = APP.indexOf(".bd-pos-yea");
  if (yeaAt > 0) {
    const yea = APP.slice(yeaAt, APP.indexOf("}", yeaAt));
    for (const g of GOLD) lacks(yea, g, "the Yea pill is not painted in the money pair");
  }

  // And the badge sitting inches from the money chip in the same letterhead.
  const WAC = stripCss(R("word-action.css"));
  const badgeAt = WAC.indexOf(".pdxwa-cbadge");
  ok(badgeAt > 0, "the Word vs Action letterhead badge is still declared");
  const badge = WAC.slice(badgeAt, WAC.indexOf("}", badgeAt));
  for (const g of GOLD) lacks(badge, g, "the Word vs Action badge keeps its own colour");

  // The money section header classes exist and are used, so "recognizable" is a
  // fact about the shipped markup rather than about the stylesheet alone.
  for (const cls of ["pdx-money-h", "pdx-money-eyebrow"]) {
    has(LANE_CSS, "." + cls, `finance-lane.css declares .${cls}`);
    has(INDEX, cls, `…and index.html uses .${cls} on a money surface`);
  }
  has(R("impact-ledger.js"), "pdx-money-h",
    "the ledger's Follow the Money header wears the money header class too");
}

// ── 7 · the wall holds ──────────────────────────────────────────────────────
{
  section("7 · booting the money theme moves no graded read");

  // PDXConsistency does NOT carry directionMatch. Direction Match lives in
  // record-card.js as directionMatchOf() and surfaces through
  // PDXRecordCard.read(pid).directionMatch, so the boot below loads
  // voting-record.js and record-card.js explicitly and sets PROFILES on both
  // sides of the loads the way index.html does.
  const dm = (withMoney) => {
    const win = makeSandbox();
    const ctx = vm.createContext(win);
    win.PROFILES = win.CMP_DATA;
    win._FTM_BY_ID = {};
    if (withMoney) {
      for (const id of Object.keys(SEED)) win._FTM_BY_ID[id] = { id, name: id, funding: SEED[id] };
    }
    const files = [...ENGINE_FILES, "voting-record.js", "record-card.js"];
    if (withMoney) files.push("finance-lane.js", "impact-ledger.js", "my-profile.js");
    for (const f of files) vm.runInContext(R(f), ctx, { filename: f });
    win.PROFILES = win.CMP_DATA;
    const rc = win.PDXRecordCard;
    const cs = win.PDXConsistency;
    if (!rc || typeof rc.read !== "function") die("PDXRecordCard.read is unavailable");
    if (!cs || !cs.formalPatternIndex) die("PDXConsistency.formalPatternIndex is unavailable");
    const pids = Object.keys(win.CMP_DATA || {}).slice(0, 40);
    if (pids.length < 10) die(`the profile corpus came back with ${pids.length} members`);
    return pids.map((pid) => {
      let m = null;
      try { m = rc.read(pid); } catch (e) { return `${pid}=err:${e.message}`; }
      const d = (m && m.directionMatch) || null;
      const rows = (cs.formalPatternIndex.rows(pid) || [])
        .map((r) => [r.key, r.tier || "", r.total || 0, r.judged || 0].join("|")).sort().join(";");
      return `${pid}=${JSON.stringify(d)}|${m && m.tier}|${rows}`;
    }).join("\n");
  };
  const hot = dm(true);
  const cold = dm(false);
  ok(hot.length > 200, "the Direction Match fingerprint came back empty");
  eq(hot, cold, "loading the whole money theme moves a Direction Match figure or a tier");

  // Statically: the money token's own hexes appear in no graded lane.
  for (const f of ["record-card.js", "consistency.js", "word-action.js"]) {
    const src = stripJs(R(f));
    for (const g of ["#c9992f", "#e3c176", "--pdx-money"]) {
      lacks(src, g, `${f} never names the money token`);
    }
  }
  // And the lane still declares itself unscored.
  eq(L.scored, false, "the money lane still declares itself unscored");
  ok(Array.isArray(L.NEVER_FEEDS) && L.NEVER_FEEDS.length > 0,
    "…and still publishes the list of things it never feeds");
}

// ── report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`\n✗ money-theme: ${failures.length} failed, ${passed} passed\n`);
  for (const f of failures) console.error(`   ✗ ${f}`);
  process.exit(1);
}
console.log(`\n✓ money-theme: all ${passed} assertions passed`);
console.log(`   one pair · ${Object.keys(L.COLORS).length} buckets, 1 colour · empty file and $8.6M file, same door\n`);
