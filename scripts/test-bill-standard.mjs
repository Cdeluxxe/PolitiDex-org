#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-bill-standard.mjs — bill ledgers keep the shape and rules of 119-s-5653
// ─────────────────────────────────────────────────────────────────────────────
// db/bill-standard/119-s-5653.json is the ground-truth reference for bill-gt-v1.
// scripts/bill-standard-core.mjs encodes its shape and rules;
// scripts/gen-bill-standard.mjs scaffolds new ledgers and checks them.
//
// What must stay true (offline; no network):
//
//   1. THE REFERENCE PASSES. 0 errors. Its only warnings are the declined
//      property_rights key (runs both ways, a split candidate) and the
//      not-in-text abandoned-mine claim with no one on either side.
//   2. EVERY LEDGER ON DISK PASSES.
//   3. THE RULES BITE. Each mutation of the reference fails: a collapsed
//      "mixed" row, a split key with two rows the same direction or one shared
//      quote, an unregistered key, an invented field, a non-primary URL, a
//      false completeness count, a dangling citation, roll-call totals that
//      disagree with the members, a sponsor with no [party-state], a secondary
//      source not labelled secondary.
//   4. THE SCAFFOLD HAS THE REFERENCE'S SHAPE. Built from official-record rows
//      taken from the reference itself, it passes, carries no field path the
//      reference does not, has the same top-level sections, writes no
//      provision, mapping, quote or claim, and reproduces the reference's
//      identity, sponsors, status and roll-call rows. Under --strict its
//      unread sections fail.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "./bill-standard-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const REF = read("db/bill-standard/119-s-5653.json");
const ctx = { issueKeys: new Set(read("db/issue-keys.json").keys), people: new Set(Object.keys(read("db/share-index.json").people)) };
const clone = () => JSON.parse(JSON.stringify(REF));

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log(`  ✗ ${m}`); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}\n      got ${JSON.stringify(a)}\n      want ${JSON.stringify(b)}`);

// 1. The reference passes.
{
  const { errors, warnings } = S.validateLedger(REF, ctx);
  eq(errors, [], "1: the reference has no errors");
  eq(warnings.map((w) => w.split(":")[0]), [
    "considered property_rights",
    "claims[5] abandoned-mine-reclamation",
    "claims[5] abandoned-mine-reclamation",
  ], "1: the reference's warnings are the known three");
  const tc = REF.issues.filter((r) => r.issueKey === "tribal_consultation");
  eq(tc.map((r) => r.supportMeaning).sort(), ["yea_opposes", "yea_supports"], "1: tribal_consultation is split one row per direction");
  ok(REF.completeness.E_issue_mapping.note.startsWith(S.mappingCountNote(REF.issues, REF.considered).replace(/\.$/, "")), "1: the E note opens with the counts the lists give");
}

// 2. Every ledger on disk passes.
for (const f of fs.readdirSync(path.join(root, "db/bill-standard")).filter((f) => f.endsWith(".json"))) {
  eq(S.validateLedger(read(`db/bill-standard/${f}`), ctx).errors, [], `2: ${f} passes`);
}

// 3. The rules bite.
const MUTATIONS = {
  "collapsed mixed row": (L) => {
    const [a, b] = L.issues.filter((r) => r.issueKey === "tribal_consultation");
    L.issues = L.issues.filter((r) => r !== b);
    a.provisionRefs = [...a.provisionRefs, ...b.provisionRefs];
    a.rationale = "The read is mixed.";
    L.completeness.E_issue_mapping.note = "13 keys mapped, 17 considered and declined.";
  },
  "split rows, same direction": (L) => { L.issues.find((r) => r.supportMeaning === "yea_opposes" && r.issueKey === "tribal_consultation").supportMeaning = "yea_supports"; },
  "split rows, one quote": (L) => { const [a, b] = L.issues.filter((r) => r.issueKey === "tribal_consultation"); b.quote = a.quote; },
  "unregistered key": (L) => { L.issues[1].issueKey = "not_a_register_key"; },
  "invented field": (L) => { L.provisions[0].severity = "high"; },
  "non-primary URL": (L) => { L.provisions[0].sourceUrl = "https://example-news.com/story"; },
  "false considered count": (L) => { L.considered.pop(); },
  "false row count": (L) => { L.completeness.E_issue_mapping.note = L.completeness.E_issue_mapping.note.replace("in 14 rows", "in 13 rows"); },
  "dangling citation": (L) => { L.issues[0].quoteRef = "Div. Z, Sec. 9999"; },
  "provision missing its key": (L) => { L.provisions.find((p) => p.ref === L.issues[0].quoteRef).issueKeys = ["infrastructure"]; },
  "totals disagree with members": (L) => { L.votes.rollcalls[0].members[0].vote = L.votes.rollcalls[0].members[0].vote === "Yea" ? "Nay" : "Yea"; },
  "sponsor with no party-state": (L) => { L.sponsors[0].recordName = "Sen. Capito, Shelley Moore"; },
  "secondary not labelled": (L) => { L.secondarySources[0].type = "primary"; },
  "direction outside the two": (L) => { L.issues[0].supportMeaning = "mixed"; },
  "rule text changed": (L) => { L.splitMappingRule = "Pick the stronger direction."; },
  "wordCount wrong": (L) => { L.overview.wordCount += 1; },
};
for (const [name, mutate] of Object.entries(MUTATIONS)) {
  const L = clone();
  mutate(L);
  ok(S.validateLedger(L, ctx).errors.length > 0, `3: "${name}" is caught`);
}

// 4. The scaffold has the reference's shape.
{
  const sponsorRows = REF.sponsors;
  const actionsFrom = (measure) => REF.status.timeline.filter((r) => r.measure === measure)
    .map((r) => ({ actionDate: r.date, text: /^Introduced in House/.test(r.text) ? "Introduced in House" : r.text, sourceSystem: { code: 9, name: "Library of Congress" },
      actionCode: r.stage === "introduced" ? (/House/.test(r.text) ? "1000" : "10000") : r.stage === "reported" ? "5000" : r.stage === "passed_house" ? "8000" : "" }))
    .reverse(); // Congress.gov lists newest first
  const rc = (r) => ({ ...r, members: r.members.map((m) => ({ lis: m.lis, name: m.name, party: /\(([A-Z]+)-/.exec(m.name)[1], vote: m.vote })) });
  const own = REF.votes.rollcalls.filter((r) => r.measure !== "H.R. 2347");
  const veh = REF.votes.rollcalls.filter((r) => r.measure === "H.R. 2347");
  const record = {
    bill: { congress: 119, type: "S", number: "5653", originChamber: "Senate", introducedDate: "2026-09-30", title: REF.identity.officialTitle, policyArea: { name: REF.identity.policyArea },
      sponsors: [{ bioguideId: sponsorRows[0].bioguideId, fullName: sponsorRows[0].recordName }] },
    cosponsors: sponsorRows.slice(1).map((s) => ({ bioguideId: s.bioguideId, fullName: s.recordName, sponsorshipDate: s.joinedOn, isOriginalCosponsor: s.original })),
    titles: [{ titleType: "Official Title as Introduced", title: REF.identity.officialTitle }, { titleType: "Short Titles as Introduced", title: REF.identity.shortTitle }],
    textVersions: [{ type: "Introduced in Senate", date: "2026-09-30T04:00:00Z", formats: [{ type: "Formatted Text", url: "https://www.congress.gov/119/bills/s5653/BILLS-119s5653is.htm" }] }],
    relatedBills: [],
    actions: actionsFrom("S. 5653"),
    rollcalls: own.map(rc),
  };
  const vehicle = { bill: { congress: 119, type: "HR", number: "2347", title: REF.identity.floorVehicle.title }, actions: actionsFrom("H.R. 2347"), rollcalls: veh.map(rc) };
  const lisMap = Object.fromEntries(REF.votes.rollcalls.flatMap((r) => r.members).map((m) => [m.lis, m.politicianId]));
  const memberMap = Object.fromEntries(sponsorRows.map((s) => [s.bioguideId, s.politicianId]));
  const L = S.scaffoldLedger(record, { vehicle, today: "2026-11-19", lisMap, memberMap, people: ctx.people });

  const r = S.validateLedger(L, ctx);
  eq(r.errors, [], "4: the scaffold passes");
  ok(S.validateLedger(L, { ...ctx, strict: true }).errors.some((e) => /D_provisions: missing/.test(e)), "4: under --strict the unread sections fail");

  const paths = (v, p = "", out = new Set()) => {
    if (Array.isArray(v)) v.forEach((x) => paths(x, `${p}[]`, out));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { out.add(`${p}.${k}`); paths(x, `${p}.${k}`, out); }
    return out;
  };
  const refPaths = paths(REF);
  eq([...paths(L)].filter((p) => !refPaths.has(p)), [], "4: the scaffold has no field the reference lacks");
  eq(Object.keys(L).sort(), Object.keys(REF).filter((k) => !k.startsWith("textDelta_")).sort(), "4: the same top-level sections");
  for (const k of ["provisions", "issues", "considered", "claims", "statedOnBill", "scorekeepers", "secondarySources"]) eq(L[k], [], `4: the scaffold writes no ${k}`);
  for (const k of ["number", "congress", "billType", "chamber", "shortTitle", "officialTitle", "policyArea", "congressGovUrl", "billStatusUrl", "sponsor"]) eq(L.identity[k], REF.identity[k], `4: identity.${k} matches the reference`);
  eq(L.identity.textVersionsRead[0].textUrl, REF.identity.textVersionsRead[0].textUrl, "4: the text link is the GovInfo link the reference reads");
  eq(L.sponsors, REF.sponsors, "4: sponsors and cosponsors match the reference");
  eq(L.status.S5653.status, REF.status.S5653.status, "4: the bill's status matches");
  eq(L.status.vehicle_HR2347.status, REF.status.vehicle_HR2347.status, "4: the vehicle's status matches");
  eq(L.status.timeline.filter((t) => t.stage !== "other").map((t) => [t.date, t.measure, t.stage]),
    REF.status.timeline.filter((t) => t.stage !== "other").map((t) => [t.date, t.measure, t.stage]), "4: the staged timeline rows match");
  const pick = (r) => ({ roll: r.roll, measure: r.measure, actionType: r.actionType, procedural: r.procedural, totals: r.totals, byParty: r.byParty, rosterLinked: r.rosterLinked, members: r.members });
  eq(L.votes.rollcalls.map(pick), REF.votes.rollcalls.map(pick), "4: roll calls, types, totals and roster links match");
  eq(L.completeness.E_issue_mapping.mark, "missing", "4: unmapped is recorded as missing, not guessed");
}

// Stage words come from the repo's one action classifier.
eq([
  { text: "Introduced in Senate", actionCode: "10000", sourceSystem: { code: 9 } },
  { text: "Read twice and referred to the Committee on Finance.", sourceSystem: { code: 9 } },
  { text: "Passed/agreed to in Senate: Passed Senate without amendment by Unanimous Consent.", actionCode: "17000", sourceSystem: { code: 9 } },
  { text: "Became Public Law No: 119-1.", sourceSystem: { code: 9 } },
  { text: "Motion to proceed to consideration of measure made in Senate.", sourceSystem: { code: 0 } },
].map(S.stageOfAction), ["introduced", "in_committee", "passed_senate", "enacted", "other"], "stage words");

if (fails) { console.log(`test-bill-standard: ${fails} failure(s)`); process.exit(1); }
console.log("test-bill-standard: ok");
