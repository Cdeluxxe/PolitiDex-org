#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-district-boards.mjs — every Utah district board the roster can name
// ─────────────────────────────────────────────────────────────────────────────
// ONE TEMPLATE, ONE GENERATOR, NOT SEVENTY HAND-WRITTEN DOCUMENTS.
//
// Six boards were opened by hand (SD-3, HD-16, SD-7, UT-2, HD-15, SD-6), each a
// document plus a row in four allow-lists. Every other Utah State House, State
// Senate and U.S. House seat is opened here, from the roster, on exactly that
// contract:
//
//   · a document, district-ut-<alias>.html, rendered from
//     scripts/district-board.template.html (HD-15's shell): the seat declared
//     twice, the canonical bare path, band 1 = the roster's pid;
//   · three 200 rewrites in netlify.toml (bare, trailing slash, .html);
//   · one row each in district-board.js BOARDS, district-voice.js BOARD_ROUTES
//     and netlify/functions/district-board.mts BOARD_SEATS;
//   · the precache entry, the nav-regex alias and the offline document map in
//     sw.js, because an offline /district/<alias> must be ITS OWN document.
//
// THE ROSTER IS THE GATE. A seat is opened only when:
//   state seat   window.pdxSeatedMemberFor(seat, n) names a pid, cmp-data.js has
//                a row for it, and window.pdxSeatClaim(pid, seat, n) is 'match'
//                (the record's own office + district claim THIS seat).
//   U.S. House   window._pdxUsHouseSeat('Utah', n) — the app's one owner of
//                that join — answers somebody. The row carries NO pid, as UT-2's
//                does; band 1 asks the join at paint time.
// A seat with no sitting pid is SKIPPED. Nothing here invents one, and there is
// no /district/* splat: a skipped seat has no document, no rewrite and no row,
// so /voice keeps saying "this room is not open" for it.
//
// THE SIX HAND-OPENED DOCUMENTS ARE NEVER WRITTEN. Their rows stay above each
// generated block, byte for byte; the suite pins their bytes.
//
//   node scripts/gen-district-boards.mjs          write everything
//   node scripts/gen-district-boards.mjs --check  exit 1 if anything would change
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// The six boards opened by hand, in the order they opened. Their documents and
// rows are theirs; the generator only ever writes AFTER them.
export const HAND_SEATS = [
  "ut-statesenate-3",
  "ut-statehouse-16",
  "ut-statesenate-7",
  "ut-house-2",
  "ut-statehouse-15",
  "ut-statesenate-6",
];

// Utah's seat counts under the 2022 legislative plan and the 2026 congressional map.
const CHAMBERS = [
  { chamber: "statehouse", code: "hd", count: 75 },
  { chamber: "statesenate", code: "sd", count: 29 },
  { chamber: "house", code: "cd", count: 4 },
];

const BEGIN = "@generated district-boards begin";
const END = "@generated district-boards end";

// ── THE ROSTER, RUN ONCE ────────────────────────────────────────────────────
function loadRoster() {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  for (const f of ["cmp-data.js", "voter-hub-location.js", "seated-member.js"]) {
    vm.runInContext(R(f), ctx, { filename: f });
  }
  if (!win.CMP_DATA || typeof win.pdxSeatedMemberFor !== "function" ||
      typeof win.pdxSeatClaim !== "function" || typeof win._pdxUsHouseSeat !== "function") {
    throw new Error("gen-district-boards: the roster or its lookups did not load");
  }
  return win;
}

const ORD = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return n + ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");
};

// The place label, AS THE ROSTER WRITES IT: the parenthetical on the record's
// own district string ("UT District 68 (Vernal, Uintah / Duchesne County)").
// A record with no parenthetical gets the plan's own words, not a guessed town.
function whereOf(state, n) {
  const m = /\(([^)]+)\)\s*$/.exec(String(state || ""));
  return m ? m[1].trim() : `District ${n} as the 2022 legislative plan draws it`;
}

// ── THE PLAN ────────────────────────────────────────────────────────────────
// Every seat, with either a board row or the reason it has none.
export function planBoards() {
  const win = loadRoster();
  const RO = win.CMP_DATA;
  const boards = [];
  const skipped = [];
  for (const { chamber, code, count } of CHAMBERS) {
    for (let n = 1; n <= count; n++) {
      const seat = `ut-${chamber}-${n}`;
      const alias = `ut-${code}-${n}`;
      if (HAND_SEATS.includes(seat)) continue;
      if (chamber === "house") {
        const holder = win._pdxUsHouseSeat("Utah", n) || "";
        const row = holder && RO[holder];
        if (!row) { skipped.push({ seat, alias, reason: "no sitting U.S. Representative on the roster" }); continue; }
        boards.push({
          seat, alias, chamber, district: n, pid: "", joinPid: holder,
          usHouse: { state: "Utah", district: n },
          member: row.name, office: row.office,
          h1: `Utah’s ${ORD(n)} Congressional District`,
          where: "The district as the court-ordered 2026 map draws it",
          kick: `UT-${n} district board`,
        });
        continue;
      }
      const pid = win.pdxSeatedMemberFor(seat, n) || "";
      if (!pid) { skipped.push({ seat, alias, reason: "no sitting pid on the roster" }); continue; }
      const row = RO[pid];
      if (!row) { skipped.push({ seat, alias, pid, reason: "pid has no cmp-data.js row" }); continue; }
      const claim = win.pdxSeatClaim(pid, seat, n);
      if (claim !== "match") { skipped.push({ seat, alias, pid, reason: `roster record does not claim this seat (${claim})` }); continue; }
      const body = chamber === "statehouse" ? "House" : "Senate";
      boards.push({
        seat, alias, chamber, district: n, pid,
        member: row.name, office: row.office,
        h1: `Utah ${body} District ${n}`,
        where: whereOf(row.state, n),
        kick: `${body} District ${n} board`,
      });
    }
  }
  for (const b of boards) {
    b.route = `/district/${b.alias}`;
    b.doc = `district-${b.alias}.html`;
    b.kickTitle = `The district board for ${b.h1}: who is in the room and what is on the table. A place, not a scorecard.`;
  }
  return { boards, skipped };
}

// ── RENDERING ───────────────────────────────────────────────────────────────
const html = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/’/g, "&rsquo;");
const js = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const RETURN_TAG =
  "  <!-- THE RETURN INTENT. PDXReturn, generated byte for byte from its owner\n" +
  "       (voter-hub-location.js) by scripts/gen-pdx-return.mjs, so Join and every\n" +
  "       sign-in door on this board carry it back here. Before the chip. -->\n" +
  "  <script defer src=\"/pdx-return.js\"></script>\n";

export function renderDoc(b, template = R("scripts/district-board.template.html")) {
  const h1 = html(b.h1);
  const where = html(b.where);
  const noscript = b.usHouse
    ? [
        `        <p class="pdx-sh-note">`,
        `          This is the district board for ${h1}, as the`,
        `          court-ordered 2026 map draws it. It needs`,
        `          JavaScript to read who holds the seat, the count of who is in the`,
        `          room, and the measures on this district&rsquo;s table — and which`,
        `          member holds a congressional district is a lookup, so there is no`,
        `          name for this fallback to print. You can still`,
        `          <a href="/#who-represents-me">see who represents you</a> or`,
        `          <a href="/my-stances">set your own positions</a>.`,
        `        </p>`,
      ]
    : [
        `        <p class="pdx-sh-note">`,
        `          This is the district board for ${h1} &mdash; ${where}.`,
        `          It needs JavaScript to read the seat&rsquo;s roster row, the count of`,
        `          who is in the room, and the measures on this district&rsquo;s table.`,
        `          You can still`,
        `          <a href="/p/${b.pid}">read the sitting member&rsquo;s record</a>`,
        `          (<span data-pdxdb-roster-name>${html(b.member)}</span>,`,
        `          <span data-pdxdb-roster-office>${html(b.office)}</span>),`,
        `          <a href="/#who-represents-me">see who represents you</a>, or`,
        `          <a href="/my-stances">set your own positions</a>.`,
        `        </p>`,
      ];
  const vars = {
    FILE: b.doc,
    H1_CAPS: b.h1.toUpperCase(),
    ROSTER_NOTE: b.usHouse
      ? `the U.S. House join _pdxUsHouseSeat('Utah', ${b.district}), which names no pid here`
      : `${b.chamber} ${b.district} → ${b.pid}`,
    ALIAS: b.alias,
    H1_HTML: h1,
    WHERE_HTML: where,
    US_HOUSE_SCRIPT: b.usHouse ? `  <script defer src="/voter-hub-location.js"></script>\n` : "",
    // PDXReturn for the chrome's Join. A congressional board already has it from
    // voter-hub-location.js above; every other board gets the generated copy.
    RETURN_SCRIPT: b.usHouse ? "" : RETURN_TAG,
    NOSCRIPT: noscript.join("\n"),
  };
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => {
    if (!(k in vars)) throw new Error(`gen-district-boards: unknown template slot ${m}`);
    return vars[k];
  });
}

function boardsRows(boards) {
  return boards.map((b) => {
    const f = [
      `seat: ${js(b.seat)}`, `alias: ${js(b.alias)}`, `route: ${js(b.route)}`, `pid: ${js(b.pid)}`,
    ];
    if (b.usHouse) f.push(`usHouse: { state: 'Utah', district: ${b.district} }`);
    f.push(`h1: ${js(b.h1)}`, `where: ${js(b.where)}`, `kick: ${js(b.kick)}`, `kickTitle: ${js(b.kickTitle)}`);
    return `    ${js(b.seat)}: { ${f.join(", ")} },`;
  });
}

// Replace everything strictly between the begin and end marker lines.
function splice(src, file, lines) {
  const a = src.indexOf(BEGIN);
  const z = src.indexOf(END);
  if (a < 0 || z < 0 || z < a) throw new Error(`gen-district-boards: ${file} has no generated block markers`);
  if (src.indexOf(BEGIN, a + 1) >= 0) throw new Error(`gen-district-boards: ${file} has two generated blocks`);
  const from = src.indexOf("\n", a) + 1;
  const to = src.lastIndexOf("\n", z) + 1;
  return src.slice(0, from) + (lines.length ? lines.join("\n") + "\n" : "") + src.slice(to);
}

// The nav regex is one literal (a regex cannot hold a marker comment), so the
// whole line is rewritten from the hand aliases plus the generated ones.
const HAND_ALIASES = ["ut-sd-3", "ut-hd-16", "ut-sd-7", "ut-cd-2", "ut-hd-15", "ut-sd-6"];
function navReLine(boards) {
  const all = HAND_ALIASES.concat(boards.map((b) => b.alias));
  return `  /^\\/district\\/(?:${all.join("|")})(?:\\/|\\.html)?$/;`;
}

export function renderAll() {
  const { boards, skipped } = planBoards();
  const out = new Map();

  out.set("district-board.js", splice(R("district-board.js"), "district-board.js", boardsRows(boards)));
  out.set("district-voice.js", splice(R("district-voice.js"), "district-voice.js",
    boards.map((b) => `    ${js(b.seat)}: ${js(b.route)},`)));
  out.set("netlify/functions/district-board.mts", splice(R("netlify/functions/district-board.mts"),
    "district-board.mts", boards.map((b) => `  "${b.seat}": 1,`)));
  out.set("netlify.toml", splice(R("netlify.toml"), "netlify.toml", boards.flatMap((b) => [
    `# ${b.h1.replace("’", "'")} — ${b.usHouse ? "U.S. House join" : b.pid}`,
    ...["", "/", ".html"].flatMap((sfx) => [
      "[[redirects]]",
      `  from = "/district/${b.alias}${sfx}"`,
      `  to = "/${b.doc}"`,
      "  status = 200",
    ]),
    "",
  ])));

  // sw.js carries THREE generated blocks, so its markers are suffixed.
  let sw = R("sw.js");
  const swBlock = (src, tag, lines) => {
    const b = `${BEGIN} ${tag}`, e = `${END} ${tag}`;
    const a = src.indexOf(b), z = src.indexOf(e);
    if (a < 0 || z < a) throw new Error(`gen-district-boards: sw.js has no ${tag} block`);
    const from = src.indexOf("\n", a) + 1, to = src.lastIndexOf("\n", z) + 1;
    return src.slice(0, from) + (lines.length ? lines.join("\n") + "\n" : "") + src.slice(to);
  };
  sw = swBlock(sw, "precache", boards.map((b) => `  '/${b.doc}',`));
  sw = swBlock(sw, "nav-re", ["const DISTRICT_BOARD_NAV_RE =", navReLine(boards)]);
  sw = swBlock(sw, "docs", boards.map((b) => `  ${js(b.alias)}: '/${b.doc}',`));
  out.set("sw.js", sw);

  const tpl = R("scripts/district-board.template.html");
  for (const b of boards) out.set(b.doc, renderDoc(b, tpl));

  // A generated document whose seat fell off the roster is removed, never left
  // behind as an address with no row.
  const keep = new Set([...HAND_ALIASES.map((a) => `district-${a}.html`), ...boards.map((b) => b.doc)]);
  const stale = readdirSync(ROOT).filter((f) => /^district-ut-(?:hd|sd|cd)-\d+\.html$/.test(f) && !keep.has(f));

  return { boards, skipped, out, stale };
}

function main() {
  const check = process.argv.includes("--check");
  const { boards, skipped, out, stale } = renderAll();
  const drift = [];
  for (const [f, body] of out) {
    const p = join(ROOT, f);
    const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
    if (cur === body) continue;
    drift.push(f);
    if (!check) writeFileSync(p, body);
  }
  for (const f of stale) {
    drift.push(`${f} (stale)`);
    if (!check) unlinkSync(join(ROOT, f));
  }
  console.log(`gen-district-boards: ${boards.length} generated boards, ${skipped.length} seats skipped (no sitting pid)`);
  if (check) {
    if (drift.length) {
      console.log(`  out of date: ${drift.join(", ")}\n  run: node scripts/gen-district-boards.mjs`);
      process.exit(1);
    }
    console.log("  up to date");
  } else {
    console.log(drift.length ? `  wrote ${drift.length} file(s)` : "  nothing to write");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
