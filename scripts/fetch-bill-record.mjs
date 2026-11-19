#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fetch-bill-record.mjs — who wrote each bill, and what happened to it, as filed
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS WRITES
//
//   db/bill-record.json   one entry per bill document (the same "<sitting>|<number>"
//                         keys db/bill-docs.json carries), holding ONLY what the
//                         official record says:
//
//                           src   the record page a reader can check it against
//                           ch    the chamber of origin ("house" | "senate")
//                           in    the date it was introduced (or submitted, for
//                                 an amendment; received, for a nomination)
//                           sp    sponsors, in the record's own order:
//                                 { r: "sponsor" | "floor_sponsor" | "cosponsor",
//                                   id: bioguide id or Utah legislator code,
//                                   n: the name exactly as the record prints it,
//                                   h: "H" | "S" — the chamber the person sat in }
//                           a     the key actions, oldest first:
//                                 { d: "YYYY-MM-DD", s: stage, c: chamber,
//                                   x: the action text as the record prints it }
//
// WHERE IT READS FROM — the record keepers, nowhere else.
//
//   · Federal bills, resolutions, amendments and nominations: the Congress.gov
//     API (the Library of Congress's own feed; CONGRESS_GOV_API_KEY). For a bill
//     only the Library of Congress's coded actions are read (sourceSystem 9) —
//     the same action appears again from the House clerk's system, and reading
//     both would print every step twice.
//   · Utah bills: le.utah.gov's own bill file, /data/<session>/<bill>.json, the
//     JSON its bill pages are drawn from.
//
// WHICH ACTIONS ARE "KEY". Introduced; reported (or recommended) from committee;
// passed or failed in a chamber; a floor motion that stopped it; both chambers
// agreeing to one text; presented to the President or sent to the Governor;
// signed, became law, vetoed, an override; filed without passage (Utah's own
// last action for a bill that died). Readings, referrals, calendars, holds and
// fiscal notes are not printed. Nothing is paraphrased: `x` is the record's text,
// with whitespace collapsed and a leading "Passed/agreed to in House:" tag
// removed where the stage already says it.
//
// WHAT IT DOES NOT DO. No roster id is assigned here (gen-bill-docs.mjs does
// that, against the roster tables the voting record already uses). No status is
// decided here either — gen-bill-docs.mjs derives it from these actions, so a
// test can re-derive it from the same file.
//
// USAGE
//   node scripts/fetch-bill-record.mjs                 # every bill document
//   node scripts/fetch-bill-record.mjs --cache <dir>   # reuse raw responses
//   node scripts/fetch-bill-record.mjs --only "2026GS|H.B. 585"
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { measureAddresses } from "./vr-measure-addresses.mjs";
// The action classifiers are shared with the vote-actions job, which builds the
// same record for bill pages it generates (netlify/lib/vote-actions-pages.ts).
import { clean, day, pickActions } from "../netlify/lib/bill-record-stages.mjs";
import { NOMINATION_PN, federalReader, renderBillRecord } from "../netlify/lib/bill-record-federal.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "db", "bill-record.json");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i === -1 ? "" : argv[i + 1] || ""; };
const CACHE = opt("--cache");
const ONLY = opt("--only");
const KEY = process.env.CONGRESS_GOV_API_KEY || "";
const API = "https://api.congress.gov/v3";

// The federal reads (bills, resolutions, amendments, nominations) live in
// netlify/lib/bill-record-federal.mjs, shared with the scheduled bill-record
// job (netlify/functions/congress-sync-bill-record.mts).
export { NOMINATION_PN };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(u, cacheName) {
  const cp = CACHE && cacheName ? path.join(CACHE, cacheName.replace(/[^A-Za-z0-9._-]+/g, "_") + ".json") : "";
  if (cp && fs.existsSync(cp)) return JSON.parse(fs.readFileSync(cp, "utf8"));
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(u, { headers: { accept: "application/json" } }).catch(() => null);
    if (res && res.ok) {
      const j = await res.json();
      if (cp) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(cp, JSON.stringify(j)); }
      return j;
    }
    if (res && res.status === 404) return null;
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`could not read ${u.replace(/api_key=[^&]+/, "api_key=…")}`);
}

// api.congress.gov/v3 `path` → JSON | null (404); the shared federal reader
// pages through lists by handing in `&offset=`.
const readFederal = federalReader((p, cacheName, extra) => getJson(`${API}/${p}?format=json&limit=250${extra || ""}&api_key=${KEY}`, cacheName));

// ── Utah ────────────────────────────────────────────────────────────────────
// le.utah.gov's action codes and descriptions. The description is the text the
// bill page prints, so it is what `x` carries.
function utahStage(a) {
  const code = String(a.actionCode || "");
  const t = clean(a.description);
  const ch = /^S/.test(code) || /^Senate/.test(t) ? "senate" : /^H/.test(code) || /^House/.test(t) ? "house" : "";
  const vote = clean(a.voteStr);
  const withVote = vote ? `${t} (${vote})` : t;
  if (/1st reading \(Introduced\)/i.test(t)) return ["introduced", ch, t];
  if (/Comm - (Favorable|Substitute|Amendment|Consent Calendar) Recommendation$/i.test(t)) return ["reported", ch, withVote];
  if (/Comm - (Motion to Recommend Failed|Held|Not Considered)$/i.test(t)) return ["committee_failed", ch, withVote];
  if (/Comm - (Recommends )?Returned to Rules$/i.test(t)) return ["committee_returned", ch, withVote];
  if (/\/ strike enacting clause$/i.test(t)) return ["enacting_clause_struck", ch, t];
  if (/\/ passed (3rd reading|2nd & 3rd readings)/i.test(t)) return ["passed", ch, withVote];
  if (/^(House|Senate)\/ failed$/i.test(t)) return ["failed_vote", ch, withVote];
  if (/\/ concurs with (Senate|House) amendment/i.test(t)) return ["resolved", ch, withVote];
  if (/\/ to Governor$/i.test(t)) return ["presented", "", t];
  if (/^Governor Signed$/i.test(t)) return ["signed", "", t];
  if (/^Governor Vetoed/i.test(t)) return ["vetoed", "", t];
  if (/^Became Law w(\/o|ithout) (the )?Governor'?s? Signature/i.test(t)) return ["law", "", t];
  if (/veto override/i.test(t)) return [/fail/i.test(t) ? "override_failed" : "override_passed", ch, withVote];
  if (/^(House|Senate)\/ filed$/i.test(t)) return ["filed", ch, `${t} — ${clean(a.owner)}`];
  return null;
}

// The bill page itself, for the two older sessions: their /data/ file names each
// sponsor by legislator code only, and the static page prints the name.
async function getText(u, cacheName) {
  const cp = CACHE ? path.join(CACHE, cacheName.replace(/[^A-Za-z0-9._-]+/g, "_") + ".html") : "";
  if (cp && fs.existsSync(cp)) return fs.readFileSync(cp, "utf8");
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(u).catch(() => null);
    const t = res && res.ok ? await res.text() : "";
    // le.utah.gov's firewall answers a burst with a 200 "Request Rejected" page.
    if (t && !/<title>Request Rejected<\/title>/i.test(t)) {
      if (cp) { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(cp, t); }
      return t;
    }
    if (res && res.status === 404) return "";
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`could not read ${u}`);
}

export function utahPageSponsors(html) {
  const t = clean(String(html || "").replace(/<!--[\s\S]*?-->/g, " "));
  const prime = /(?<!Floor )Sponsor:\s+((?:Rep|Sen)\. [^:]+?)\s+(?:Floor Sponsor:|Drafting Attorney:)/.exec(t);
  const floor = /Floor Sponsor:\s+((?:Rep|Sen)\. [^:]+?)\s+(?:Substitute Sponsor:|Drafting Attorney:|Fiscal Analyst:)/.exec(t);
  return { prime: prime ? prime[1].trim() : "", floor: floor ? floor[1].trim() : "" };
}

async function utahBill(sitting, number) {
  const m = /^(H|S)\.B\. (\d+)$/.exec(number);
  if (!m) return null;
  const code = `${m[1]}B${m[2].padStart(4, "0")}`;
  const j = await getJson(`https://le.utah.gov/data/${sitting}/${code}.json`, `utah-${sitting}-${code}`);
  if (!j) return null;
  const year = sitting.slice(0, 4);
  const src = `https://le.utah.gov/~${year}/bills/static/${code}.html`;
  const houseOf = (name, fallback) => (/^Sen\./.test(name) ? "S" : /^Rep\./.test(name) ? "H" : fallback || "");
  const sp = [];
  let acts;
  if (j.actionHistoryList) {
    // The current file format: names, chambers and roll-call tallies inline.
    acts = j.actionHistoryList.map((a) => ({ ...a, actionDate: day(a.actionDate) }));
    const active = (j.billVersionList || []).find((v) => v.activeVersion) || {};
    if (j.primeSponsor) sp.push({ r: "sponsor", id: j.primeSponsor, n: clean(j.primeSponsorName), h: j.primeSponsorHouse || houseOf(j.primeSponsorName, m[1]) });
    if (j.floorSponsor) sp.push({ r: "floor_sponsor", id: j.floorSponsor, n: clean(j.floorSponsorName), h: j.floorSponsorHouse || houseOf(j.floorSponsorName) });
    for (const c of active.coSponsorList || []) {
      const id = c && (c.id || c.legislator || c.sponsor);
      const n = clean(c && (c.name || c.fullName || c.sponsorName || ""));
      if (id && n) sp.push({ r: "cosponsor", id, n, h: c.house || houseOf(n) });
    }
  } else {
    // The 2023/2024 format: {date, action, location}, sponsors as codes.
    acts = (j.actionhistory || []).map((a) => ({ actionDate: day(a.date), description: a.action, owner: a.location, actionCode: "" }));
    const names = utahPageSponsors(await getText(src, `utahpage-${sitting}-${code}`));
    if (j.sponsor && names.prime) sp.push({ r: "sponsor", id: j.sponsor, n: names.prime, h: houseOf(names.prime, m[1]) });
    if (j.floorsponsor && names.floor) sp.push({ r: "floor_sponsor", id: j.floorsponsor, n: names.floor, h: houseOf(names.floor) });
  }
  const a = pickActions(acts, utahStage, false);
  const intro = a.find((x) => x.s === "introduced");
  return { src, ch: m[1] === "H" ? "house" : "senate", in: intro ? intro.d : "", sp, a };
}

// ── The bill documents to read ──────────────────────────────────────────────
export function recordTargets(root) {
  return measureAddresses(root || ROOT).published.map((a) => ({ sitting: a.sitting, number: a.number, type: a.measureType }));
}

async function one(t) {
  if (/GS$/i.test(t.sitting)) return utahBill(t.sitting, t.number);
  return readFederal(t);
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  if (!KEY) { console.error("CONGRESS_GOV_API_KEY is not set"); process.exit(1); }
  const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")).records || {} : {};
  const records = ONLY ? { ...prior } : {};
  const targets = recordTargets(ROOT).filter((t) => !ONLY || `${t.sitting}|${t.number}` === ONLY);
  const missing = [];
  let i = 0;
  for (const t of targets) {
    const k = `${t.sitting}|${t.number}`;
    const r = await one(t);
    if (r) records[k] = r; else missing.push(k);
    if (++i % 25 === 0) console.log(`  … ${i}/${targets.length}`);
  }
  fs.writeFileSync(OUT, renderBillRecord(records, new Date().toISOString().slice(0, 10)));
  const sorted = records;
  console.log(`wrote db/bill-record.json (${Object.keys(sorted).length} records${missing.length ? `; no record for ${missing.length}: ${missing.join(", ")}` : ""})`);
}
