#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vote-actions-recorded-votes.mjs — the per-roll publish gate, the Senate
// identity gap, and the two public views of it
// ─────────────────────────────────────────────────────────────────────────────
// Pins:
//   1. THE GATE IS PER ROLL CALL (va-publish-v2): a held roll call no longer
//      hides its bill's other roll calls; bill rules still hold the whole bill.
//   2. OFF-ROSTER IS NOT UNIDENTIFIED: a member with a bioguide id and no
//      PolitiDex file is left off and does not hold the roll; a member whose id
//      never resolved (LIS id, no bioguide) still holds it.
//   3. THE PUBLIC BILL READ (publishedForBill): only passing roll calls, totals
//      over every recorded row, members listed only with a roster id, no member
//      id / raw key / bioguide leaves; the endpoint is the gate's output.
//   4. THE SENATE GAP: LIS_SEED resolves the two departed senators, the LIS
//      index merges instead of replacing, the cron's LIS catch-up fills stored
//      rows, the member map carries Darline Graham, and the roll-forward
//      migration touches only those three members' unidentified rows.
//   5. "RECORDED VOTES" ON THE PERSON FILE and "ROLL CALLS ON THE RECORD" ON THE
//      BILL PAGE render the published rows, label them as the raw record (no
//      verdict, no comparison), and render nothing when nothing is published.
//
//   node scripts/test-vote-actions-recorded-votes.mjs   (no database, no network)
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, mkdtempSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else if (failures.length < 60) failures.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const dir = mkdtempSync(join(tmpdir(), "va-rv-"));
const build = async (entry, name, plugins = []) => {
  const out = join(dir, `${name}.mjs`);
  await esbuild.build({ entryPoints: [join(ROOT, entry)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "silent", plugins });
  return import(pathToFileURL(out).href);
};
const P = await build("netlify/lib/vote-actions-publish.ts", "pub");
const C = await build("netlify/lib/vote-actions-core.ts", "core");
const Q = await build("netlify/lib/vote-actions-quality.ts", "q");

eq(P.PUBLISH_RULES_VERSION, "va-publish-v2", "rules version names the per-roll gate");
eq(P.BILL_RULES.map((r) => r.id), ["not_nomination", "has_topic_tag"], "bill-level rules");
eq(P.ROLL_RULES.map((r) => r.id), ["has_votes", "members_mapped", "vote_kind_known", "raw_payload_stored"], "roll-level rules");

// ── An in-memory table, aggregated the way billPublishStats / rollPublishStats do ──
const BILLS = {
  "us-119-hr-5000": { billKey: "us-119-hr-5000", congress: 119, measureType: "bill", number: "H.R. 5000", title: "A test act", tags: 2 },
  "us-119-hr-6100": { billKey: "us-119-hr-6100", congress: 119, measureType: "bill", number: "H.R. 6100", title: "Untagged act", tags: 0 },
  "us-119-pn-12": { billKey: "us-119-pn-12", congress: 119, measureType: "nomination", number: "PN 12", title: "A nomination", tags: 1 },
};
let ROWS = [];
const row = (bill, roll, pid, vote, extra = {}) => ({
  billKey: bill, chamber: "house", congress: 119, session: 2, rollNumber: roll, voteDate: `2026-05-${String(roll % 28 + 1).padStart(2, "0")}T00:00:00Z`,
  vote, voteRaw: { yes: "Yea", no: "Nay", present: "Present", not_voting: "Not Voting" }[vote], voteKind: "passage", isProcedural: false,
  question: `On passage, roll ${roll}`, result: "Passed", sourceUrl: `https://clerk.house.gov/Votes/2026${roll}`, sourceLabel: "U.S. House (Clerk)",
  rawRef: `house/119/2/roll-${roll}.json`, politicianId: pid, bioguideId: pid ? `B${pid}` : "B_OFF", memberId: pid ? `B${pid}` : "B_OFF",
  memberName: pid ? pid.replace(/_/g, " ") : "Off Roster", party: "D", state: "ME", ...extra,
});
const statOf = (list, b) => ({
  billKey: b.billKey, measureType: b.measureType, tagCount: b.tags, rows: list.length,
  unmappedRows: list.filter((r) => !r.politicianId).length,
  unresolvedRows: list.filter((r) => !r.politicianId && !r.bioguideId).length,
  unknownKindRows: list.filter((r) => r.voteKind === "unknown" || r.isProcedural == null).length,
  missingRawRows: list.filter((r) => !r.rawRef).length,
  proceduralRows: list.filter((r) => r.isProcedural === true).length,
});
const deps = {
  rowsForPolitician: async (pid) => ROWS.filter((r) => r.politicianId === pid),
  statsForBills: async (keys) => keys.filter((k) => BILLS[k]).map((k) => ({ ...statOf(ROWS.filter((r) => r.billKey === k), BILLS[k]), rolls: new Set(ROWS.filter((r) => r.billKey === k).map((r) => r.rollNumber)).size })),
  statsForRolls: async (keys) => {
    const out = [];
    for (const k of keys) {
      const rolls = [...new Set(ROWS.filter((r) => r.billKey === k).map((r) => r.rollNumber))];
      for (const n of rolls) {
        const list = ROWS.filter((r) => r.billKey === k && r.rollNumber === n);
        const b = BILLS[k] || { billKey: k, measureType: null, tags: 0 };
        out.push({ ...statOf(list, b), chamber: "house", congress: 119, session: 2, rollNumber: n, rolls: 1 });
      }
    }
    return out;
  },
  rowsForBill: async (k) => ROWS.filter((r) => r.billKey === k),
  billInfo: async (keys) => keys.filter((k) => BILLS[k]).map((k) => ({ billKey: k, congress: BILLS[k].congress, measureType: BILLS[k].measureType, number: BILLS[k].number, title: BILLS[k].title, shortTitle: null })),
};

ROWS = [
  // H.R. 5000 roll 300: clean.
  row("us-119-hr-5000", 300, "chellie_pingree", "yes"), row("us-119-hr-5000", 300, "pat_member", "no"),
  // roll 301: an off-roster member (bioguide known, no file) — must NOT hold it.
  row("us-119-hr-5000", 301, "chellie_pingree", "no"), row("us-119-hr-5000", 301, "pat_member", "no"), row("us-119-hr-5000", 301, null, "yes"),
  // roll 302: an unidentified member (no bioguide) — MUST hold it.
  row("us-119-hr-5000", 302, "chellie_pingree", "yes"), row("us-119-hr-5000", 302, null, "yes", { bioguideId: null, memberId: "S999" }),
  // roll 303: one row with no stored payload — holds this roll only.
  row("us-119-hr-5000", 303, "chellie_pingree", "yes"), row("us-119-hr-5000", 303, "pat_member", "yes", { rawRef: null }),
  // A bill-rule failure holds every roll on the bill.
  row("us-119-hr-6100", 310, "chellie_pingree", "yes"),
  row("us-119-pn-12", 311, "chellie_pingree", "yes"),
];

// ── 1 · per-roll ─────────────────────────────────────────────────────────────
let pub = await P.publishedForPolitician("chellie_pingree", deps);
eq(Object.keys(pub.billKeys), ["us-119-hr-5000"], "untagged bill and nomination stay held (bill rules)");
eq(pub.billKeys["us-119-hr-5000"].map((r) => r.roll), [300, 301], "the bill publishes its valid roll calls; 302 and 303 are held on their own");
eq(pub.rolls, 2, "roll count");
eq(pub.info["us-119-hr-5000"], { number: "H.R. 5000", title: "A test act", measureType: "bill", congress: 119, page: "/b/119/H.R.%205000" }, "each bill is named, with its /b/ address");
const keysOf = (o) => [...new Set(Object.values(o.billKeys).flat().flatMap((r) => Object.keys(r)))].sort();
eq(keysOf(pub), ["chamber", "congress", "date", "procedural", "question", "roll", "session", "sourceLabel", "sourceUrl", "vote", "voteKind", "voteRaw"], "public person rows still carry public fields only");
// Without per-roll counts the gate falls back to the bill totals: never looser.
const legacy = await P.publishedForPolitician("chellie_pingree", { rowsForPolitician: deps.rowsForPolitician, statsForBills: deps.statsForBills });
eq(Object.keys(legacy.billKeys), [], "no per-roll counts → all-or-nothing, and an unidentified member holds the whole bill");
// The gate result for the curator names what holds each roll.
const cur = await P.curatorLinksForPolitician("chellie_pingree", deps);
eq(cur.billKeys["us-119-hr-5000"].map((r) => [r.roll, r.gate.publishable, r.gate.failed]),
  [[300, true, []], [301, true, []], [302, false, ["members_mapped"]], [303, false, ["raw_payload_stored"]]], "curator rows carry each roll call's own gate");
ok(cur.publish["us-119-hr-5000"].publishable && cur.publish["us-119-hr-5000"].rollsPublishable === 2 && cur.publish["us-119-hr-5000"].rollsHeld === 2, "bill gate: public with 2 rolls, 2 held");
eq(cur.publish["us-119-hr-6100"].failed, ["has_topic_tag"], "bill rule named for the untagged bill");
eq(P.evaluateRoll("k", { billKey: "k", measureType: "bill", tagCount: 1, rows: 3, unmappedRows: 3, unresolvedRows: 0, unknownKindRows: 0, missingRawRows: 0 }).publishable, true, "off-roster rows alone do not hold a roll");
eq(P.evaluateRoll("k", { billKey: "k", measureType: "bill", tagCount: 1, rows: 3, unmappedRows: 1, unresolvedRows: 1, unknownKindRows: 0, missingRawRows: 0 }).failed, ["members_mapped"], "an unidentified row holds the roll");
eq(P.evaluateRoll("k", { billKey: "k", measureType: "bill", tagCount: 1, rows: 3, unmappedRows: 1, unknownKindRows: 0, missingRawRows: 0 }).failed, ["members_mapped"], "unresolved count absent → strict reading");

// ── 2 · the public bill read ─────────────────────────────────────────────────
let bill = await P.publishedForBill("us-119-hr-5000", deps);
eq(bill.rolls.map((r) => r.roll), [300, 301], "bill read: only passing roll calls");
const r301 = bill.rolls[1];
eq(r301.totals, { yes: 1, no: 2, present: 0, not_voting: 0 }, "totals count every recorded row, listed or not");
eq(r301.unlisted, 1, "the off-roster row is counted, not named");
eq(r301.members.map((m) => [m.pid, m.vote]), [["chellie_pingree", "no"], ["pat_member", "no"]], "members listed by roster id, the off-roster one left off");
eq(Object.keys(r301.members[0]).sort(), ["name", "party", "pid", "state", "vote", "voteRaw"], "member rows carry public fields only");
const flat = JSON.stringify(bill);
ok(!/rawRef|raw_ref|memberId|bioguide|B_OFF|S999|house\/119\/2\/roll/.test(flat), "no raw key, member id or bioguide leaves the bill read");
eq(bill.info.page, "/b/119/H.R.%205000", "bill read names its page");
eq((await P.publishedForBill("us-119-hr-6100", deps)).rolls, [], "a bill failing a bill rule sends no roll call");
eq((await P.publishedForBill("us-119-pn-12", deps)).rolls, [], "a nomination sends no roll call");
eq((await P.publishedForBill("us-119-hr-1", deps)).rolls, [], "no bill row → nothing");
// The endpoint is the gate's output.
const fnOut = join(dir, "bill-fn.mjs");
await esbuild.build({
  entryPoints: [join(ROOT, "netlify/functions/vote-actions-bill.mts")], bundle: true, platform: "node", format: "esm", outfile: fnOut, logLevel: "silent",
  plugins: [{ name: "stub", setup(b) {
    b.onResolve({ filter: /vote-actions-db\.js$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ loader: "js", contents: "export const publishDeps = new Proxy({}, { get: (_, k) => globalThis.__deps[k] });" }));
  } }],
});
globalThis.__deps = deps;
const fn = (await import(pathToFileURL(fnOut).href)).default;
let res = await fn(new Request("https://x.test/api/vote-actions/bill?key=us-119-hr-5000"));
eq([res.status, (await res.json()).rolls.map((r) => r.roll)], [200, [300, 301]], "endpoint = publishedForBill");
eq((await fn(new Request("https://x.test/api/vote-actions/bill?key=drop%20table"))).status, 400, "malformed key → 400");
globalThis.__deps = { ...deps, statsForBills: async () => { throw new Error("db down"); } };
res = await fn(new Request("https://x.test/api/vote-actions/bill?key=us-119-hr-5000"));
eq([res.status, Object.keys(await res.json())], [500, ["error"]], "a failed read says so and leaks nothing");
ok(/path: "\/api\/vote-actions\/bill"/.test(R("netlify/functions/vote-actions-bill.mts")), "endpoint path");

// ── 3 · status summary per roll ──────────────────────────────────────────────
const billStats = await deps.statsForBills(Object.keys(BILLS));
const rollStats = await deps.statsForRolls(Object.keys(BILLS));
const sum = P.publishSummary(billStats, rollStats);
eq(sum.publishableBills.text, "1 / 3 (33.3%)", "summary: bills with at least one public roll");
eq(sum.publishableRolls.text, "2 / 4 (50.0%)", "summary: roll calls on eligible bills");
eq(sum.failingRollsByRule, { has_votes: 0, members_mapped: 1, vote_kind_known: 0, raw_payload_stored: 1 }, "summary: per-rule roll fails");
const sb = Q.buildStatusBody({ lastRun: null, ledger: {}, status: { bills: {}, votes: {}, tags: [], unmappedMembers: [], publishStats: billStats, publishRollStats: rollStats }, publish: P.publishSummary });
ok(sb.quality.publish.publishableRolls && !("publishRollStats" in sb), "status body carries the per-roll summary, not the raw per-roll rows");

// ── 4 · the Senate gap ───────────────────────────────────────────────────────
eq(C.LIS_SEED, { S293: "G000359", S419: "M001190" }, "LIS seed: the two departed senators");
const mm = JSON.parse(R("db/vr-member-map.json")).map;
eq([mm.G000359, mm.M001190, mm.G000608], ["graham", "mullin", "darline_graham"], "member map: both Grahams and Mullin");
ok(JSON.parse(R("db/vr-roster-admitted.json")).waves.vote_actions_senate_gap_nov2026.includes("darline_graham"), "Darline Graham is admitted in her own wave");
// The cron's LIS catch-up over an in-memory repo, with no network.
const store = new Map([
  ["a", { memberIdScheme: "lis", memberId: "S293", bioguideId: null, politicianId: null }],
  ["b", { memberIdScheme: "lis", memberId: "S419", bioguideId: null, politicianId: null }],
  ["c", { memberIdScheme: "lis", memberId: "S777", bioguideId: null, politicianId: null }],
  ["d", { memberIdScheme: "lis", memberId: "S441", bioguideId: "G000608", politicianId: null }],
  ["e", { memberIdScheme: "lis", memberId: "S100", bioguideId: "Z000001", politicianId: "someone" }],
]);
const repo = {
  async getBill() { return null; }, async upsertBill() {}, async upsertVotes() { return { inserted: 0, revised: 0 }; }, async retagVotes() { return 0; },
  async billsNeedingMeta() { return []; }, async billsWithStaleTags() { return []; },
  async unresolvedLisIds() { return [...new Set([...store.values()].filter((r) => r.memberIdScheme === "lis" && !r.bioguideId).map((r) => r.memberId))]; },
  async resolveLisMembers(t) { let n = 0; for (const [lis, bio, pid] of t) for (const r of store.values()) if (r.memberIdScheme === "lis" && r.memberId === lis && !r.bioguideId) { r.bioguideId = bio; if (pid) r.politicianId = pid; n++; } return n; },
  async unmappedBioguides() { return [...new Set([...store.values()].filter((r) => !r.politicianId && r.bioguideId).map((r) => r.bioguideId))]; },
  async mapMembers(pairs) { let n = 0; for (const [b, p] of pairs) for (const r of store.values()) if (r.bioguideId === b && !r.politicianId) { r.politicianId = p; n++; } return n; },
};
const NOW = new Date("2026-11-18T12:00:00Z");
const fetch404 = async () => ({ ok: false, status: 404, headers: new Headers(), text: async () => "", json: async () => null });
const lines = [];
const state = { ledger: {}, lis: { at: NOW.toISOString(), map: {} }, congresses: {}, pages: {} };
const run = await C.runVoteActions({ fetch: fetch404, repo, state, memberMap: { G000359: "graham", M001190: "mullin", G000608: "darline_graham" }, now: () => NOW, log: (l) => lines.push(l), chambers: ["senate"], budgetMs: 60_000 });
eq([store.get("a").bioguideId, store.get("a").politicianId], ["G000359", "graham"], "LIS catch-up: Lindsey Graham's stored rows resolve");
eq([store.get("b").bioguideId, store.get("b").politicianId], ["M001190", "mullin"], "LIS catch-up: Mullin's stored rows resolve");
eq([store.get("c").bioguideId, store.get("c").politicianId], [null, null], "an LIS id nobody knows stays unresolved — never guessed");
eq(store.get("d").politicianId, "darline_graham", "roster catch-up: Darline Graham's rows map through the member map");
eq(store.get("e").politicianId, "someone", "an existing mapping is never rewritten");
eq(run.report.membersRemapped, 3, "both catch-ups count toward membersRemapped");
ok(lines.some((l) => /LIS CATCH-UP — 2 senator id\(s\) resolved, 2 row\(s\) filled/.test(l)), "LIS catch-up is logged");
// The refreshed index merges: a senator who left keeps their resolution.
const fetchLeg = async (u) => String(u).includes("legislators-current")
  ? { ok: true, status: 200, headers: new Headers(), json: async () => [{ id: { lis: "S500", bioguide: "N000500" } }], text: async () => JSON.stringify([{ id: { lis: "S500", bioguide: "N000500" } }]) }
  : fetch404(u);
const state2 = { ledger: {}, lis: { at: "2026-01-01T00:00:00Z", map: { S123: "OLD0001" } }, congresses: {}, pages: {} };
store.set("f", { memberIdScheme: "lis", memberId: "S123", bioguideId: null, politicianId: null });
const run2 = await C.runVoteActions({ fetch: fetchLeg, repo, state: state2, memberMap: {}, now: () => NOW, log: () => {}, chambers: ["senate"], budgetMs: 60_000 });
eq(Object.keys(run2.state.lis.map).sort(), ["S123", "S293", "S419", "S500"], "stale index refreshed by merging: old, seed and current ids kept");
eq(store.get("f").bioguideId, "OLD0001", "an id from an earlier refresh still resolves after the senator leaves the current file");
// The roll-forward migration: data only, three members, never overwrites.
const migs = readdirSync(join(ROOT, "netlify/database/migrations")).filter((f) => /vote_actions_senate_member_identity/.test(f));
eq(migs, ["20261211000000_vote_actions_senate_member_identity.sql"], "one roll-forward migration");
const sqlText = R(`netlify/database/migrations/${migs[0]}`).split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
eq((sqlText.match(/\bUPDATE\b/g) || []).length, 3, "three updates");
ok(!/\b(DELETE|INSERT|DROP|ALTER|CREATE|TRUNCATE)\b/i.test(sqlText), "no other statement");
ok(/"member_id" = 'S293' AND "bioguide_id" IS NULL/.test(sqlText) && /"member_id" = 'S419' AND "bioguide_id" IS NULL/.test(sqlText) && /"bioguide_id" = 'G000608' AND "politician_id" IS NULL/.test(sqlText), "each update only touches unidentified rows of its member");

// ── 5 · the two views ────────────────────────────────────────────────────────
function el(tag) {
  return { tagName: tag, children: [], attrs: {}, style: { setProperty() {} }, hidden: false, innerHTML: "", parentNode: null, isConnected: true,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, hasAttribute(k) { return k in this.attrs; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = this; const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; },
    get nextSibling() { const p = this.parentNode; if (!p) return null; return p.children[p.children.indexOf(this) + 1] || null; },
    querySelector(sel) {
      const want = sel.startsWith("#") ? (n) => n.id === sel.slice(1) : sel.startsWith(".") ? (n) => String(n.className || "").split(/\s+/).includes(sel.slice(1)) : () => false;
      const walk = (n) => { for (const c of n.children) { if (want(c)) return c; const f = walk(c); if (f) return f; } return null; };
      return walk(this);
    } };
}
function bootDoc(src, setup, fetchImpl, location) {
  const body = el("body"), head = el("head");
  const doc = { readyState: "complete", body, head, documentElement: head, addEventListener() {},
    createElement: el, getElementById: (id) => body.querySelector("#" + id) || head.querySelector("#" + id), querySelector: (sel) => body.querySelector(sel) };
  setup(body);
  const win = { document: doc, fetch: fetchImpl, location: location || { pathname: "/" }, setTimeout, console };
  win.window = win;
  vm.runInContext(src, vm.createContext(win), { filename: "module.js" });
  return { win, body };
}
const settle = () => new Promise((r) => setTimeout(r, 20));
const jsonRes = (d) => Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(d)) });

// Person file.
const personSrc = R("person-recorded-votes.js");
let asked = [];
let { win, body } = bootDoc(personSrc, (b) => {
  const stage = el("div"); stage.className = "pdxsp-stage-record"; b.appendChild(stage);
  const sp = el("div"); sp.id = "pdx-sponsored"; stage.appendChild(sp);
}, (u) => { asked.push(String(u)); return jsonRes(pub); });
win._pdxCurrentProfileId = "chellie_pingree";
win.PDXRecordedVotes.scan();
await settle();
const stage = body.querySelector(".pdxsp-stage-record");
const host = body.querySelector("#pdx-recorded-votes");
eq(asked, ["/api/vote-actions/published?pid=chellie_pingree"], "person section asks the public, gated read");
ok(host && !host.hidden && host.parentNode === stage && stage.children.indexOf(host) === stage.children.indexOf(body.querySelector("#pdx-sponsored")) + 1, "section sits in the Official record stage, after the sponsored bills");
ok(/Recorded votes/.test(host.innerHTML) && /The raw record/.test(host.innerHTML) && /not a verdict/.test(host.innerHTML) && /not compared with anything they have said/.test(host.innerHTML), "labelled as the raw record: no verdict, no comparison");
ok(/2 roll calls on 1 measure/.test(host.innerHTML), "counts what it lists");
ok(/href="\/b\/119\/H\.R\.%205000"/.test(host.innerHTML) && /A test act/.test(host.innerHTML), "names the bill and links its page");
ok(/>Yea</.test(host.innerHTML) && />Nay</.test(host.innerHTML) && /official record/.test(host.innerHTML), "each roll: the vote cast and the official record");
ok(!/data-pdx-rv-roll="house\|119\|2\|302"/.test(host.innerHTML) && !/house\|119\|2\|303/.test(host.innerHTML), "held roll calls are not listed");
const prose = host.innerHTML.replace(/<[^>]*>/g, " ").replace(/not a verdict/, "");
ok(!/\b(score|verdict|kept|broken|match|consistent|contradict|percent)\b|%/i.test(prose), "no score, verdict or comparison words");
({ win, body } = bootDoc(personSrc, (b) => { const s = el("div"); s.className = "pdxsp-stage-record"; b.appendChild(s); }, () => jsonRes({ pid: "x", billKeys: {} })));
win._pdxCurrentProfileId = "nobody_here";
win.PDXRecordedVotes.scan();
await settle();
ok(body.querySelector("#pdx-recorded-votes").hidden && body.querySelector("#pdx-recorded-votes").innerHTML === "", "nothing published → no section, not an empty one");
ok(/person-recorded-votes\.js/.test(R("person-bills.js")) && /data-pdx-recorded-votes-loader/.test(R("person-bills.js")), "person-bills.js loads it as a companion");
ok(!/person-recorded-votes/.test(R("person.html")), "the person shell itself is unchanged");

// Bill page.
const billSrc = R("bill-roll-calls.js");
asked = [];
({ win, body } = bootDoc(billSrc, (b) => { const m = el("main"); m.id = "pdx-bill-doc"; b.appendChild(m); },
  (u) => { asked.push(String(u)); return jsonRes(bill); }, { pathname: "/b/119/H.R.%205000" }));
await settle();
eq(asked, ["/api/vote-actions/bill?key=us-119-hr-5000"], "bill page asks the gated bill read by the shared key");
const sec = body.querySelector("#pdx-bill-rolls");
ok(sec && body.children.indexOf(sec) === body.children.indexOf(body.querySelector("#pdx-bill-doc")) + 1, "section added after the edge-written document, which is left as it was");
ok(/Roll calls on the record/.test(sec.innerHTML) && /raw record/.test(sec.innerHTML) && /No verdict and no comparison/.test(sec.innerHTML), "labelled as the raw record");
ok(/House roll 300/.test(sec.innerHTML) && /House roll 301/.test(sec.innerHTML) && !/roll 302|roll 303/.test(sec.innerHTML), "only the published roll calls");
ok(/Yea 1 · Nay 2/.test(sec.innerHTML) && /1 recorded vote from members with no PolitiDex file is counted above and not listed/.test(sec.innerHTML), "totals and the unlisted count");
ok(/href="\/p\/chellie_pingree"/.test(sec.innerHTML) && /href="\/p\/pat_member"/.test(sec.innerHTML), "listed members link to their files");
eq(win.PDXBillRollCalls.billKey("119", "S.Amdt. 4732"), "us-119-samdt-4732", "amendment key");
eq(win.PDXBillRollCalls.billKey("119", "H.Con.Res. 096"), "us-119-hconres-96", "leading zeros dropped");
eq(win.PDXBillRollCalls.billKey("2025GS", "HB 1"), null, "a state sitting has no vote-actions key");
eq(win.PDXBillRollCalls.billKey("119", "PN 12"), null, "a nomination has no bill page key");
asked = [];
({ win, body } = bootDoc(billSrc, (b) => { const m = el("main"); m.id = "pdx-bill-doc"; b.appendChild(m); },
  (u) => { asked.push(String(u)); return jsonRes({ billKey: "us-119-hr-6100", rolls: [] }); }, { pathname: "/b/119/H.R.%206100" }));
await settle();
eq([asked.length, body.children.length], [1, 1], "no published roll call → no section, page as it was");
({ win, body } = bootDoc(billSrc, (b) => { const m = el("main"); m.id = "pdx-bill-doc"; b.appendChild(m); },
  (u) => { asked.push(String(u)); return jsonRes(bill); }, { pathname: "/b/2025GS/HB%201" }));
await settle();
eq(asked.length, 1, "a state bill page asks nothing");
ok(/<script defer src="\/bill-roll-calls\.js"><\/script>/.test(R("bill.html")), "bill.html loads the module");

rmSync(dir, { recursive: true, force: true });
if (failures.length) {
  console.log(`\n✗ ${failures.length} failed, ${passed} passed`);
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log(`\n✓ vote-actions recorded votes: ${passed} checks passed`);
