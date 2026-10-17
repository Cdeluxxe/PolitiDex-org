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

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "db", "bill-record.json");
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i === -1 ? "" : argv[i + 1] || ""; };
const CACHE = opt("--cache");
const ONLY = opt("--only");
const KEY = process.env.CONGRESS_GOV_API_KEY || "";
const API = "https://api.congress.gov/v3";

// The nominations on file are printed under a short label ("Bondi — AG"), not
// under their PN citation. Each label → the citation Congress.gov files it under,
// checked against the nomination's own description on Congress.gov.
export const NOMINATION_PN = {
  "Bondi — AG": "11-2",
  "Gabbard — DNI": "11-16",
  "Kennedy — HHS": "11-8",
  "McMahon — ED": "11-10",
  "Patel — FBI": "12-35",
  "PN11-7": "11-7",
  "Rubio — State": "11-13",
  "Vought — OMB": "11-22",
};

const FED_TYPES = {
  "H.R.": "hr", "S.": "s", "H.J.Res.": "hjres", "S.J.Res.": "sjres",
  "H.Con.Res.": "hconres", "S.Con.Res.": "sconres", "H.Res.": "hres", "S.Res.": "sres",
};
const AMDT_TYPES = { "H.Amdt.": "hamdt", "S.Amdt.": "samdt" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const day = (s) => {
  const t = String(s || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return "";
};

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

const cg = (p, extra = "") => `${API}/${p}?format=json&limit=250${extra}&api_key=${KEY}`;
async function cgAll(p, field, cacheName) {
  const out = [];
  for (let offset = 0; offset < 5000; offset += 250) {
    const j = await getJson(cg(p, `&offset=${offset}`), `${cacheName}-${offset}`);
    const rows = (j && j[field]) || [];
    out.push(...rows);
    if (rows.length < 250) break;
  }
  return out;
}

const chamberOf = (s) => (/senate/i.test(s) ? "senate" : /house/i.test(s) ? "house" : "");
const person = (p, r) => ({
  r,
  id: String(p.bioguideId || ""),
  n: clean(p.fullName || [p.firstName, p.lastName].filter(Boolean).join(" ")),
  h: /^Sen\./.test(p.fullName || "") ? "S" : "H",
});

// ── Federal bills and resolutions ───────────────────────────────────────────
// The Library of Congress action codes, read for what each one IS. A code
// outside this table is a reading, a referral, a calendar entry or a hearing.
const BLOCKED = /^(Cloture on the (motion to proceed( to the measure)?|measure|motion to concur in the House amendment.*?) not invoked|Motion to proceed to consideration of measure (rejected|not agreed to)|Motion to discharge .* (rejected|not agreed to)|Point of order that the measure is not entitled to expedited procedures.*? agreed to in Senate)/i;
function billStage(a) {
  const code = String(a.actionCode || "");
  const t = clean(a.text);
  // The Senate's own floor entries carry no source code, and the Library of
  // Congress does not re-code a failed motion. Those are read for one thing only:
  // a floor vote that stopped the measure.
  if (String((a.sourceSystem || {}).code || "") !== "9") return BLOCKED.test(t) ? ["blocked", "senate", t] : null;
  if (code === "1000" || code === "10000" || /^(Introduced|Submitted) in (House|Senate)$/i.test(t))
    return ["introduced", code === "1000" || /in House$/i.test(t) ? "house" : "senate", t];
  if (/^Committee on .*\. Original measure reported to Senate/i.test(t)) return ["introduced", "senate", t];
  if ((code === "1010" || code === "10010") || /^The (House|Senate) Committee on .* reported an original measure/i.test(t))
    return ["introduced", code === "1010" || /^The House/i.test(t) ? "house" : "senate", t];
  if ((code === "5000" || code === "14000") && /\bReported\b/.test(t) && !/^Supplemental/i.test(t))
    return ["reported", code === "5000" ? "house" : "senate", t];
  if (code === "14500" || code === "4500" || /^(Senate|House) Committee on .* [Dd]ischarged\b/.test(t))
    return ["discharged", code === "4500" || /^House/.test(t) ? "house" : "senate", t];
  if (code === "8000") return ["passed", "house", t.replace(/^Passed\/agreed to in House:\s*/i, "")];
  if (code === "17000") return ["passed", "senate", t.replace(/^Passed\/agreed to in Senate:\s*/i, "")];
  if (code === "9000") return ["failed_vote", "house", t.replace(/^Failed of passage\/not agreed to in House:\s*/i, "")];
  if (code === "18000") return ["failed_vote", "senate", t.replace(/^Failed of passage\/not agreed to in Senate:\s*/i, "")];
  if (code === "28000") return ["presented", "", t];
  if (/^Signed by President/i.test(t)) return ["signed", "", t];
  if (/^Became Public Law/i.test(t)) return ["law", "", t];
  if (/^Became Private Law/i.test(t)) return ["law", "", t];
  if (/^(Vetoed by President|Pocket Vetoed by President)/i.test(t)) return ["vetoed", "", t];
  if (/^Passed (House|Senate) over veto/i.test(t)) return ["override_passed", chamberOf(t), t];
  if (/^Failed of passage in (House|Senate) over veto/i.test(t)) return ["override_failed", chamberOf(t), t];
  if (/^Resolving differences -- (House|Senate) actions:/i.test(t)) {
    const body = t.replace(/^Resolving differences -- (House|Senate) actions:\s*/i, "");
    if (/(agree|concur)\w*\s+(to|in)\s+the\s+(House|Senate)\s+amendment/i.test(body) && /Agreed to|agreed to in Senate/i.test(body) &&
        !/with an amendment|disagree|insist/i.test(body))
      return ["resolved", /House actions/i.test(t) ? "house" : "senate", body];
    if (/Conference report agreed to/i.test(body)) return ["resolved", /House actions/i.test(t) ? "house" : "senate", body];
  }
  if (BLOCKED.test(t)) return ["blocked", "senate", t];
  return null;
}

// `rows` in the order the record lists them: Congress.gov lists newest first,
// le.utah.gov oldest first. Two steps on one day keep the record's own order.
function pickActions(rows, stageOf, newestFirst = true) {
  const seen = new Set();
  const out = [];
  const firstOnly = new Set(["introduced", "reported", "discharged", "presented", "signed", "law", "vetoed", "offered", "adopted", "confirmed", "received"]);
  const sorted = rows
    .map((a, i) => ({ a, i }))
    .sort((p, q) => String(p.a.actionDate || "").localeCompare(String(q.a.actionDate || "")) || (newestFirst ? q.i - p.i : p.i - q.i));
  for (const { a } of sorted) {
    const st = stageOf(a);
    if (!st) continue;
    const [s, c, x] = st;
    const d = day(a.actionDate);
    const k1 = `${s}|${c}|${d}|${x}`;
    if (seen.has(k1)) continue;
    if (firstOnly.has(s) && out.some((o) => o.s === s && o.c === c)) continue;
    seen.add(k1);
    out.push({ d, s, c, x: x.slice(0, 280) });
  }
  // On one day the record's own list can put the signature ahead of the
  // presentment it follows; those three keep the order they happen in.
  const RANK = { presented: 1, signed: 2, vetoed: 2, law: 3 };
  return out.map((o, i) => ({ o, i }))
    .sort((p, q) => p.o.d.localeCompare(q.o.d) || ((RANK[p.o.s] && RANK[q.o.s]) ? RANK[p.o.s] - RANK[q.o.s] : 0) || p.i - q.i)
    .map((x) => x.o);
}

async function federalBill(sitting, number) {
  const [pre, num] = number.split(" ");
  const t = FED_TYPES[pre];
  const base = `bill/${sitting}/${t}/${num}`;
  const b = ((await getJson(cg(base), base)) || {}).bill;
  if (!b) return null;
  const cos = await cgAll(`${base}/cosponsors`, "cosponsors", `${base}/cosponsors`);
  const acts = (await cgAll(`${base}/actions`, "actions", `${base}/actions`))
    .filter((a) => !a.sourceSystem || String(a.sourceSystem.code) === "9" || a.sourceSystem.name === "Senate");
  const typeWord = { hr: "house-bill", s: "senate-bill", hjres: "house-joint-resolution", sjres: "senate-joint-resolution",
    hconres: "house-concurrent-resolution", sconres: "senate-concurrent-resolution", hres: "house-resolution", sres: "senate-resolution" }[t];
  return {
    src: `https://www.congress.gov/bill/${sitting}th-congress/${typeWord}/${num}`,
    ch: chamberOf(b.originChamber),
    in: day(b.introducedDate),
    sp: [
      ...(b.sponsors || []).map((p) => person(p, "sponsor")),
      ...cos.filter((p) => !p.sponsorshipWithdrawnDate).map((p) => person(p, "cosponsor")),
    ],
    a: pickActions(acts, billStage),
  };
}

// ── Amendments ──────────────────────────────────────────────────────────────
function amendmentStage(a) {
  const t = clean(a.text).replace(/^(Roll call votes on amendments in (House|Senate)|(House|Senate) amendment (agreed to|not agreed to|offered|submitted)):\s*/i, "");
  if (/\b(offered|proposed|submitted) by\b/i.test(t) && /^Amendment|^Mr\.|^Ms\.|^Mrs\./i.test(t)) return ["offered", "", t];
  if (/withdrawn/i.test(t)) return ["withdrawn", "", t];
  if (/(not agreed to|Failed|rejected|fell when)/i.test(t) && /amendment/i.test(t)) return ["failed_vote", "", t];
  if (/(Agreed to|agreed to in Senate)/i.test(t) && /amendment/i.test(t) && !/motion to (table|reconsider)/i.test(t)) return ["adopted", "", t];
  return null;
}

async function federalAmendment(sitting, number) {
  const [pre, num] = number.split(" ");
  const t = AMDT_TYPES[pre];
  const base = `amendment/${sitting}/${t}/${num}`;
  const am = ((await getJson(cg(base), base)) || {}).amendment;
  if (!am) return null;
  const cos = await cgAll(`${base}/cosponsors`, "cosponsors", `${base}/cosponsors`).catch(() => []);
  const acts = await cgAll(`${base}/actions`, "actions", `${base}/actions`);
  const ch = chamberOf(am.chamber);
  const a = pickActions(acts, amendmentStage).map((x) => ({ ...x, c: ch }));
  const when = day(am.submittedDate || am.proposedDate || (acts[acts.length - 1] || {}).actionDate);
  return {
    src: `https://www.congress.gov/amendment/${sitting}th-congress/${t === "hamdt" ? "house-amendment" : "senate-amendment"}/${num}`,
    ch,
    in: when,
    sp: [
      ...(am.sponsors || []).map((p) => person(p, "sponsor")),
      ...cos.filter((p) => !p.sponsorshipWithdrawnDate).map((p) => person(p, "cosponsor")),
    ],
    // Same-day steps in the order they happen: offered, then decided.
    a: a.map((x, i) => ({ x, i })).sort((p, q) => p.x.d.localeCompare(q.x.d) || (p.x.s === "offered" ? -1 : 0) - (q.x.s === "offered" ? -1 : 0) || p.i - q.i).map((o) => o.x),
  };
}

// ── Nominations ─────────────────────────────────────────────────────────────
function nominationStage(a) {
  const t = clean(a.text);
  if (/^Received in the Senate/i.test(t)) return ["received", "senate", t];
  if (/^Committee on .* Reported|Reported by Senator/i.test(t)) return ["reported", "senate", t];
  if (/^Confirmed by the Senate/i.test(t)) return ["confirmed", "senate", t];
  if (/^(Rejected|Not confirmed)/i.test(t)) return ["rejected", "senate", t];
  if (/withdrawal of nomination/i.test(t)) return ["withdrawn", "senate", t];
  if (/^Returned to the President/i.test(t)) return ["returned", "senate", t];
  return null;
}

async function nomination(sitting, number) {
  const pn = NOMINATION_PN[number];
  if (!pn) return null;
  const base = `nomination/${sitting}/${pn}`;
  const n = ((await getJson(cg(base), base)) || {}).nomination;
  if (!n) return null;
  const acts = await cgAll(`${base}/actions`, "actions", `${base}/actions`);
  const [num, part] = pn.split("-");
  return {
    src: `https://www.congress.gov/nomination/${sitting}th-congress/${num}${part ? "/" + part : ""}`,
    ch: "senate",
    in: day(n.receivedDate),
    sp: [],
    a: pickActions(acts, nominationStage),
  };
}

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
  if (t.type === "nomination" || NOMINATION_PN[t.number]) return nomination(t.sitting, t.number);
  const pre = t.number.split(" ")[0];
  if (AMDT_TYPES[pre]) return federalAmendment(t.sitting, t.number);
  if (FED_TYPES[pre]) return federalBill(t.sitting, t.number);
  return null;
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
  const sorted = Object.fromEntries(Object.keys(records).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((k) => [k, records[k]]));
  fs.writeFileSync(OUT, JSON.stringify({
    _comment: "GENERATED by scripts/fetch-bill-record.mjs from the official record (Congress.gov API for federal measures, le.utah.gov bill files for Utah) — do not edit by hand. Per bill document: the record page (src), chamber of origin (ch), date introduced (in), sponsors and co-sponsors as the record names them (sp), and the key actions with their dates and the record's own text (a). Roster ids and status are derived from this file by scripts/gen-bill-docs.mjs.",
    fetchedOn: new Date().toISOString().slice(0, 10),
    records: sorted,
  }, null, 1) + "\n");
  console.log(`wrote db/bill-record.json (${Object.keys(sorted).length} records${missing.length ? `; no record for ${missing.length}: ${missing.join(", ")}` : ""})`);
}
