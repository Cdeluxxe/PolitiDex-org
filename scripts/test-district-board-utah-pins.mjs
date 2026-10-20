#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-district-board-utah-pins.mjs — Utah boards: three pinned issues above
// the category list, and a topic list that starts collapsed
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. EVERY UTAH BOARD shows the three pins — Data Centers, Protect Public
//      Lands, Great Salt Lake Water — in that order, below the search field and
//      the type/time filters and above the category list.
//   2. A PIN OPENS ITS GROUPS. Data Centers opens every data-center group on
//      the seat (growth, power, water); the other two open lands_preserve and
//      water. A pin whose keys have no measure on the seat opens an empty group
//      that says "No measures on this seat for this issue yet." Pressing it
//      again, or picking a chip, clears it. The click handler routes the tap.
//   3. NOT A SECOND TAXONOMY. The pins use existing ISSUE_MAP keys only and
//      wear the same colour token and palette class as those keys' chips; the
//      empty group is not a measure group, so no count, chip or poll reads it,
//      and the category count is unchanged.
//   4. COLLAPSED ON FIRST PAINT: every group and parent starts closed, except
//      a group the visitor holds a side on (and its parent).
//   5. SEARCH AND FILTERS STILL WORK, with and without a pin pressed.
//   6. A NON-UTAH BOARD shows no pin row.
//   7. SHIPPED: no equity language; both board files precached; the shell moved.
//
//   node scripts/test-district-board-utah-pins.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};
const MOD = R("district-board.js");
const SW = R("sw.js");

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const section = (t) => console.log(`\n   ── ${t}`);

const BOOT_FILES = ["cmp-data.js", "issue-map.js", "issue-colors.js", "stance-sides.js"];
function boot({ desk = {}, host = true } = {}) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ counts: {}, rooms: [], proposals: [] }) });
  for (const f of BOOT_FILES) vm.runInContext(R(f), ctx, { filename: f });
  win.PDXStances = { all: () => [], count: () => 0 };
  win.PDXYourFile = { answered: () => Object.keys(desk), position: (k) => desk[k] || null };
  win.PDXVotingRecord = { fetchMember: () => Promise.resolve({ items: [], summary: {} }) };
  if (host) win.document.getElementById = (id) => (id === "pdx-district-composer" ? {} : null);
  vm.runInContext(MOD, ctx, { filename: "district-board.js" });
  return { B: win.PDXDistrictBoard, win };
}

const iss = (...keys) => keys.map((k) => ({ issueKey: k, weight: 1, isPrimary: false, supportMeaning: "", rationale: null }));
const m = (id, number, title, keys) => ({
  kind: "vote", measureId: id, number, title,
  measureIdent: { session: "2025GS", billUrl: null, officialTitle: null, readFrom: null, readFromUrl: null },
  issues: iss(...keys),
});
const ITEMS = [
  m(1, "H.B. 101", "Starter Home Amendments", ["housing"]),
  m(2, "S.B. 57", "Public Education Funding", ["public_schools"]),
  m(3, "H.B. 208", "Great Salt Lake Watershed", ["water"]),
  m(4, "S.B. 132", "Data Center Water Use", ["datacenter_water"]),
  m(5, "H.B. 77", "Data Center Power Rates", ["datacenter_power"]),
];
const MANDATES = [{ id: 7, title: "Publish every committee vote within 24 hours", supportCount: 3 }];

// ── Readers over the rendered markup ────────────────────────────────────────
const pinRow = (h) => (/<div class="pdxdb-utpins"[\s\S]*?<\/div>/.exec(h) || [""])[0];
const pinButtons = (h) => [...pinRow(h).matchAll(/<button type="button" class="([^"]*)" data-pdxdb-utpin="([^"]*)" aria-pressed="([^"]*)"([^>]*)>([^<]*)<\/button>/g)]
  .map((x) => ({ cls: x[1], id: x[2], pressed: x[3], rest: x[4], label: x[5] }));
const groups = (h) => [...h.matchAll(/<details class="pdxdb-group[^"]*" data-pdxdb-group="([^"]*)"([^>]*)>/g)]
  .map((x) => ({ key: x[1], open: /\sopen\b/.test(x[2]), hidden: /\shidden\b/.test(x[2]) }));
const parents = (h) => [...h.matchAll(/<details class="pdxdb-parent" data-pdxdb-parent="([^"]*)"([^>]*)>/g)]
  .map((x) => ({ key: x[1], open: /\sopen\b/.test(x[2]), hidden: /\shidden\b/.test(x[2]) }));
const emptyPin = (h, id) => {
  const x = new RegExp(`<details class="pdxdb-group pdxdb-group--pinempty" data-pdxdb-pin-empty="${id}"([^>]*)>([\\s\\S]*?)</details>`).exec(h);
  return x ? { hidden: /\shidden\b/.test(x[1]), open: /\sopen\b/.test(x[1]), body: x[2] } : null;
};
const shownOpen = (h) => groups(h).filter((g) => g.open && !g.hidden).map((g) => g.key).sort();
const shown = (h) => groups(h).filter((g) => !g.hidden).map((g) => g.key).sort();
const findNoneShown = (h) => /data-pdxdb-find-none(?! hidden)[^>]*>/.test(h) && !/data-pdxdb-find-none hidden/.test(h);
const LABELS = ["Data Centers", "Protect Public Lands", "Great Salt Lake Water"];
const IDS = ["datacenters", "public_lands", "gsl_water"];
const EMPTY_LINE = "No measures on this seat for this issue yet.";
const EQ = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;

const { B, win } = boot({ desk: { water: "support" } });
if (!B || typeof B.tableHtml !== "function" || typeof B.setPin !== "function" || !Array.isArray(B.UTAH_PINS)) {
  console.error("✗ district board utah pins: STALE HARNESS — PDXDistrictBoard, setPin or UTAH_PINS did not publish");
  process.exit(2);
}
const render = (seat, items = ITEMS, mandates = MANDATES) => { win.__PDX_DISTRICT_BOARD_SEAT = seat; return B.tableHtml("ok", items, [], mandates); };
const reset = () => { B.setPin(""); B.setCategory(""); B.setQuery(""); B.setType(""); B.setTime(""); };

// ═════════════════════════════════════════════════════════════════════════════
section("1 · every Utah board shows the three pins above the category list");
{
  const seats = Object.keys(B.BOARDS);
  eq(seats.length, 88, "the board table holds every Utah board");
  const kinds = { hd: 0, sd: 0, cd: 0, statewide: 0 };
  for (const seat of seats) {
    const al = B.BOARDS[seat].alias;
    if (/^ut-hd-/.test(al)) kinds.hd++; else if (/^ut-sd-/.test(al)) kinds.sd++; else if (/^ut-cd-/.test(al)) kinds.cd++; else kinds.statewide++;
    reset();
    const h = render(seat);
    const bs = pinButtons(h);
    eq(JSON.stringify(bs.map((b) => b.label)), JSON.stringify(LABELS), `${al}: the three pins, in order`);
    const at = { search: h.indexOf("data-pdxdb-search"), toggles: h.indexOf('class="pdxdb-toggles"'), pins: h.indexOf('class="pdxdb-utpins"'),
      cats: h.indexOf('class="pdxdb-cats"'), list: h.indexOf('class="pdxdb-groups"') };
    ok(at.search >= 0 && at.toggles > at.search && at.pins > at.toggles && at.cats > at.pins && at.list > at.cats,
      `${al}: search, then filters, then the pins, then the category list (${JSON.stringify(at)})`);
    ok(bs.every((b) => b.pressed === "false"), `${al}: no pin is pressed on first paint`);
  }
  eq(JSON.stringify(kinds), JSON.stringify({ hd: 52, sd: 29, cd: 4, statewide: 3 }), "state House, state Senate, U.S. House and the three statewide boards are all covered");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · a pin opens that issue's group, or an empty group that says so");
const SEAT = "ut-statehouse-16";
{
  reset();
  B.setPin("gsl_water");
  const h = render(SEAT);
  eq(JSON.stringify(shownOpen(h)), '["water"]', "Great Salt Lake Water opens the water group, and only it");
  eq(JSON.stringify(shown(h)), '["water"]', "…and every other group is hidden while it is pressed");
  ok(parents(h).filter((p) => !p.hidden).every((p) => p.open), "…its parent is shown and open");
  eq(pinButtons(h).find((b) => b.id === "gsl_water").pressed, "true", "…and the pin says it is pressed");
  ok(/<ul class="pdxdb-mandates" data-pdxdb-mandates="" hidden>/.test(h), "…mandate rows step aside, as under an issue chip");

  B.setPin("datacenters");
  const d = render(SEAT);
  eq(JSON.stringify(shownOpen(d)), '["datacenter_power","datacenter_water"]', "Data Centers opens every data-center group this seat has");
  ok(!emptyPin(d, "datacenters"), "…and prints no empty group, because the seat has data-center measures");

  B.setPin("public_lands");
  const p = render(SEAT);
  const e = emptyPin(p, "public_lands");
  ok(!!e && !e.hidden && e.open, "Protect Public Lands, with no measure on the seat, opens an empty group");
  ok(!!e && e.body.includes(EMPTY_LINE), `…that says "${EMPTY_LINE}"`);
  eq(JSON.stringify(shown(p)), "[]", "…and no measure group is shown under it");
  ok(!findNoneShown(p), "…and the search miss line stays hidden, because the empty group is the answer");

  B.setPin("public_lands");   // the pressed pin again
  const off = render(SEAT);
  ok(pinButtons(off).every((b) => b.pressed === "false"), "pressing the pressed pin clears it");
  ok(emptyPin(off, "public_lands") && emptyPin(off, "public_lands").hidden, "…and its empty group hides");
  eq(JSON.stringify(shown(off)), JSON.stringify(["", "datacenter_power", "datacenter_water", "housing", "public_schools", "water"].filter((k) => k !== "")), "…and every group is back under All");

  B.setPin("gsl_water"); B.setCategory("housing");
  const c = render(SEAT);
  ok(pinButtons(c).every((b) => b.pressed === "false"), "picking a chip clears the pin");
  eq(JSON.stringify(shown(c)), '["housing"]', "…and the chip's own group is what shows");
  B.setCategory(""); B.setPin("datacenters");
  eq(pinButtons(render(SEAT)).find((b) => b.id === "datacenters").pressed, "true", "pressing a pin after a chip presses it");
  eq((/data-pdxdb-cat="housing" aria-pressed="([^"]*)"/.exec(render(SEAT)) || [])[1], "false", "…and un-presses the chip");
  B.setPin("not-a-pin");
  ok(pinButtons(render(SEAT)).every((b) => b.pressed === "false"), "an unknown pin id presses nothing");
}
{
  // THE TAP, through the board's own click handler and applied in place.
  reset();
  const mkEl = (attrs, extra = {}) => ({
    attrs: { ...attrs }, hidden: !!extra.hidden, open: !!extra.open,
    getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }, hasAttribute(n) { return n in this.attrs; },
    setAttribute(n, v) { this.attrs[n] = String(v); },
    querySelector: () => null, querySelectorAll: () => [],
    closest(sel) { const a = (/^\[([a-z-]+)\]$/.exec(sel) || [])[1]; return a && a in this.attrs ? this : null; },
  });
  const pinEls = IDS.map((id) => mkEl({ "data-pdxdb-utpin": id, "aria-pressed": "false" }));
  const emptyEl = mkEl({ "data-pdxdb-pin-empty": "public_lands" }, { hidden: true, open: true });
  const groupEls = ["water", "housing"].map((k) => mkEl({ "data-pdxdb-group": k }));
  const listeners = {};
  const host = {
    innerHTML: "", getAttribute: (n) => (n === "data-pdxdb-seat" ? SEAT : null), setAttribute() {}, appendChild() {},
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    querySelector: () => null,
    querySelectorAll: (sel) => sel === "[data-pdxdb-utpin]" ? pinEls : sel === "[data-pdxdb-pin-empty]" ? [emptyEl] : sel === "[data-pdxdb-group]" ? groupEls : [],
  };
  B.mount(host);
  ok((listeners.click || []).length > 0, "the board wires its click handler");
  for (const f of listeners.click || []) f({ target: pinEls[1] });
  eq(pinEls[1].attrs["aria-pressed"], "true", "a tap on Protect Public Lands presses it, in place");
  eq(emptyEl.hidden, false, "…and shows its empty group, in place");
  ok(groupEls.every((g) => g.hidden), "…and hides the measure groups, in place");
  for (const f of listeners.click || []) f({ target: pinEls[2] });
  eq(pinEls[2].attrs["aria-pressed"], "true", "a tap on Great Salt Lake Water presses it");
  eq(pinEls[1].attrs["aria-pressed"], "false", "…and releases the other pin");
  eq(emptyEl.hidden, true, "…and hides the other pin's empty group");
  eq(groupEls[0].hidden, false, "…and shows the water group");
  eq(groupEls[0].open, true, "…open");
  eq(groupEls[1].hidden, true, "…and keeps housing hidden");
  reset();
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · not a second taxonomy");
{
  reset();
  const KEYS = new Set(JSON.parse(R("db/issue-keys.json")).keys);
  for (const p of B.UTAH_PINS) for (const k of p.keys) ok(KEYS.has(k) && !!B.issueLabel(k), `${p.id}: ${k} is an existing issue key`);
  eq(JSON.stringify(B.UTAH_PINS.map((p) => p.keys)), JSON.stringify([["datacenter_growth", "datacenter_power", "datacenter_water"], ["lands_preserve"], ["water"]]), "the pins' keys are the reviewed ones");
  // The same colour as the chip: water's pin and water's chip carry one token.
  const h = render(SEAT);
  const tokenOf = (s) => (/(\sstyle="[^"]*"|\sdata-ic="[^"]*")+/.exec(s) || [""])[0].trim();
  const waterChip = (/<button type="button" class="pdxdb-cat[^"]*" data-pdxdb-cat="water" aria-pressed="[^"]*"([^>]*)>/.exec(h) || [])[1] || "";
  const waterPin = pinButtons(h).find((b) => b.id === "gsl_water");
  ok(tokenOf(waterChip).length > 0, "the water chip carries a colour token");
  eq(tokenOf(waterPin.rest), tokenOf(waterChip), "the Great Salt Lake Water pin wears the water chip's colour token");
  const waterParentChip = (/<button type="button" class="(pdxdb-cat[^"]*)" data-pdxdb-cat="water"/.exec(h) || [])[1] || "";
  const icChip = (waterParentChip.match(/pdxdb-ic-[a-z_]+/) || [""])[0];
  ok(icChip && waterPin.cls.split(/\s+/).includes(icChip), `…and the palette class its chip wears (${icChip})`);
  ok(pinButtons(h).every((b) => /pdxdb-ic-[a-z_]+/.test(b.cls)), "every pin wears a palette class");
  // Counts unchanged: the empty groups are not groups of measures.
  ok(!/data-pdxdb-pin-empty="[^"]*"[^>]*data-pdxdb-group=/.test(h) && !/data-pdxdb-group="[^"]*"[^>]*data-pdxdb-pin-empty/.test(h), "an empty pin group is never a data-pdxdb-group");
  eq(+((/data-pdxdb-cat-count="(\d+)"/.exec(h)) || [])[1], 5, "the category count is the seat's five issues, pins or no pins");
  const allChip = (/data-pdxdb-cat="" aria-pressed="[^"]*"[^>]*>[^<]*<span class="pdxdb-cat-n">(\d+)</.exec(h) || [])[1];
  eq(+allChip, ITEMS.length + MANDATES.length, "the All chip's count is unchanged");
  ok(!/datacenter_|lands_preserve/.test(pinRow(h)), "the pin row prints no raw issue key");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · collapsed on first paint, except the visitor's own side");
{
  reset();
  const h = render(SEAT);
  eq(JSON.stringify(shownOpen(h)), '["water"]', "only the group the visitor holds a side on starts open");
  const ps = parents(h);
  ok(ps.length > 0, "the composer board nests groups under parents");
  const withWater = ps.filter((p) => p.open);
  eq(withWater.length, 1, "exactly one parent starts open — the one holding the visitor's side");
  ok(new RegExp(`data-pdxdb-parent="${withWater[0] && withWater[0].key}"[\\s\\S]*?data-pdxdb-group="water"`).test(h), "…and it is water's parent");
  const none = boot({ desk: {} });
  none.win.__PDX_DISTRICT_BOARD_SEAT = SEAT;
  const h0 = none.B.tableHtml("ok", ITEMS, [], MANDATES);
  eq(JSON.stringify(shownOpen(h0)), "[]", "a visitor with no sides on file sees every group collapsed");
  ok(parents(h0).every((p) => !p.open), "…and every parent collapsed");
  eq(emptyPin(h0, "public_lands") && emptyPin(h0, "public_lands").hidden, true, "…and no empty pin group showing");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · search and the type/time filters still work");
{
  reset();
  B.setQuery("watershed");
  eq(JSON.stringify(shownOpen(render(SEAT))), '["water"]', "a title search opens only its group");
  B.setQuery("S.B. 57");
  eq(JSON.stringify(shownOpen(render(SEAT))), '["public_schools"]', "a bill-number search opens only its group");
  B.setQuery("nothing matches this");
  ok(findNoneShown(render(SEAT)), "a search with no hit prints the miss line");
  B.setQuery("");
  B.setType("mandates");
  const mh = render(SEAT);
  eq(JSON.stringify(shown(mh)), "[]", "Mandates hides every measure group");
  ok(/<ul class="pdxdb-mandates" data-pdxdb-mandates="">/.test(mh), "…and shows the mandate rows");
  B.setType("topics");
  ok(/<ul class="pdxdb-mandates" data-pdxdb-mandates="" hidden>/.test(render(SEAT)), "Topics hides the mandate rows");
  B.setType("");
  B.setTime("past");
  eq(JSON.stringify(shown(render(SEAT))), "[]", "Past keeps no measure from the seat's latest sitting");
  B.setTime("");
  // With a pin pressed: the search and the filters still narrow inside it.
  B.setPin("datacenters"); B.setQuery("power");
  eq(JSON.stringify(shownOpen(render(SEAT))), '["datacenter_power"]', "a search narrows inside a pressed pin");
  B.setQuery(""); B.setType("mandates");
  eq(JSON.stringify(shown(render(SEAT))), "[]", "Mandates hides a pin's measure groups too");
  reset();
  eq(JSON.stringify(shownOpen(render(SEAT))), '["water"]', "cleared, the band is back to its first paint");
}

// ═════════════════════════════════════════════════════════════════════════════
section("6 · a non-Utah board shows no pin row");
{
  reset();
  eq(B.pinsFor("oh-statehouse-1").length, 0, "pinsFor gives a non-Utah seat no pins");
  eq(B.pinsFor("ut-statehouse-16").length, 3, "…and a Utah seat all three");
  // A board row for another state, added the way a generated row would be.
  const plain = boot({ desk: { water: "support" }, host: false });
  plain.B.BOARDS["oh-statehouse-1"] = { seat: "oh-statehouse-1", alias: "oh-hd-1", route: "/district/oh-hd-1", pid: "", h1: "Ohio House District 1", where: "", kick: "", kickTitle: "" };
  plain.win.__PDX_DISTRICT_BOARD_SEAT = "oh-statehouse-1";
  const oh = plain.B.tableHtml("ok", ITEMS, [], MANDATES);
  ok(oh.includes("pdxdb-groups") && !oh.includes("pdxdb-utpins") && !oh.includes("data-pdxdb-pin-empty"), "an Ohio board prints its list with no pin row and no empty pin group");
  plain.B.setPin("gsl_water");
  const ohp = plain.B.tableHtml("ok", ITEMS, [], MANDATES);
  ok(!ohp.includes("pdxdb-utpins"), "…even with a pin id set");
  // A render that cannot say which seat it is for borrows no Utah pins either.
  plain.win.__PDX_DISTRICT_BOARD_SEAT = "";
  ok(!plain.B.tableHtml("ok", ITEMS, [], MANDATES).includes("pdxdb-utpins"), "a board that names no seat prints no pins");
}

// ═════════════════════════════════════════════════════════════════════════════
section("7 · shipped");
{
  reset();
  const copy = `${B.COPY.utPinsLabel} ${B.COPY.utPinEmpty} ${B.UTAH_PINS.map((p) => p.label).join(" ")}`;
  ok(!EQ.test(copy), "the pin copy carries no equity language");
  ok(!EQ.test(render(SEAT).replace(/<[^>]+>/g, " ")), "the rendered band carries no equity language");
  ok(/'\/district-board\.js',/.test(SW) && /'\/district-board\.css',/.test(SW), "both board files are precached");
  ok(/\.pdxdb-utpins \{/.test(R("district-board.css")), "the stylesheet lays out the pin row");
  const v = (src) => +((/CACHE_VERSION = 'v(\d+)'/.exec(src || "") || [])[1] || 0);
  const head = HEAD("sw.js");
  if (head != null && (HEAD("district-board.js") !== MOD || HEAD("district-board.css") !== R("district-board.css"))) {
    ok(v(SW) > v(head), "the board files changed and the shell version moved");
  } else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} district board utah pins: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
