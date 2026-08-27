#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// UTAH BILL TEXT — fetch the document the mapping has to be read out of
// ─────────────────────────────────────────────────────────────────────────────
// Data wave 4 is a curator pass over the bills the committee ingest refused for
// having no reviewed issue mapping. Its one hard rule is the rule wave 2 learned
// and wrote down: **a bill summary is not the bill.** `SB0097` (2023) reads as an
// existing Israel-boycott provision until the enrolled text is opened; `SB0100`'s
// title says "School Gender Identity Policies" and its surviving text is parental
// access to education records. Both were refused ON THE TEXT, and the refusal named
// the file it was read from.
//
// So a mapping pass needs the text, per bill, on disk, with the URL it came from
// recorded beside it. That is all this file does. It decides nothing, proposes
// nothing and writes nothing under db/ or netlify/database/.
//
// ── WHICH DOCUMENT IS "THE BILL" ────────────────────────────────────────────
// In preference order, whichever generation published it:
//
//   1. Enrolled  — the text as passed and signed. If it exists it is the bill.
//   2. The highest-numbered substitute. A Utah committee routinely replaces a bill
//      with a substitute and votes the substitute out, so on a bill that died in the
//      other chamber the last substitute is the text the committee actually voted on.
//   3. Introduced — only when neither of the above exists. Recorded as such, because
//      a bill that never got past introduction is the weakest text a mapping can
//      rest on.
//
// The version chosen is written into the cache entry as `textKind`, so a curator
// reading the worksheet always knows whether they are looking at enrolled law or an
// introduced draft. A bill for which NO text can be fetched is not silently
// summarised from its title — it is reported as textless, and the mapping pass
// refuses it on that ground.
//
// ── TWO PUBLISHING GENERATIONS, AND THE ONE THAT BIT ────────────────────────
// le.utah.gov serves `/data/{session}/{BILL}.json` in two unrelated shapes, and it
// is per-bill, not per-session — 2024GS returns the modern shape for HB0029 and the
// legacy one for HB0028:
//
//   modern  camelCase, `billVersionList[].billDocs[]` carrying real document URLs.
//           Substitutes are `fileType: "PubSub"` in 2025 and `fileType: "Introduced"
//           with subVersion > 0` in 2024 — the same document under two labels, so
//           this picks on subVersion rather than on the label.
//   legacy  flat lowercase keys (`shorttitle`, `hilightedprovisions`, `codesections`)
//           and NO document list at all. For these the bill text is not XML: it is
//           the server-rendered static page's `setBill4('/~YYYY/bills/hbillint/….htm'
//           ,'Introduced')` links. Guessing the URL by convention does not work —
//           `/Session/2024/bills/introduced/HB0028.xml` is a 404, in either casing —
//           so the page is read and the link taken from it.
//
// A first pass at this wave took the modern shape for the only shape and reported
// 140 of 141 2024GS bills as having "no published bill text of any kind". That is
// the failure this comment exists to prevent: an empty text bucket looks exactly
// like a session of bills about nothing, and would have produced 140 refusals with
// a false reason written next to each one.
//
// ── THE XML LIES ABOUT ITS OWN ENCODING ─────────────────────────────────────
// Every one of the XML files opens `<?xml version="1.0" encoding="UTF-16"?>` and
// every one of them is single-byte on the wire. Decoding as UTF-16 yields mojibake
// that still has a plausible length, which is the dangerous kind of wrong: a keyword
// scan over it returns zero hits and looks like a bill about nothing. Read as UTF-8,
// and assert the decode by looking for the enacting clause every Utah bill carries.
//
// ── FETCH DISCIPLINE ────────────────────────────────────────────────────────
// Same as scripts/vr-utah-ingest.mjs, for the same reason: node `fetch` gets a WAF
// "Request Rejected" page regardless of headers, so this shells out to curl with a
// browser UA, and treats that page as a hard error rather than caching it as text.
// 404s are HTTP 200-shaped in places on this host, so a fetched document that does
// not contain the enacting clause is reported, never cached as the bill.
//
// USAGE
//   node scripts/vr-utah-bill-text.mjs --bills HB0085,SB0057 --session 2025GS
//   node scripts/vr-utah-bill-text.mjs --from /tmp/bucket-2025GS.json   # --bucket output
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const CACHE = val("--cache", "/tmp/vr-utah-bill-text");
const SESSION = val("--session", "2025GS");

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const SRC = {
  billJson: (s, b) => `https://le.utah.gov/data/${s}/${b}.json`,
  billPage: (s, b) => `https://le.utah.gov/~${s.slice(0, 4)}/bills/static/${b}.html`,
  doc: (rel) => (/^https?:/.test(rel) ? rel : `https://le.utah.gov${rel}`),
};

function curl(url) {
  return execFileSync("curl", [
    "-sSL", "--max-time", "60", "-A", UA,
    "-H", "Accept: text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8",
    "-H", "Accept-Language: en-US,en;q=0.9",
    url,
  ], { maxBuffer: 1 << 28, encoding: "utf8" });
}

// The WAF page is a 200 with a body. Caching it would put a rejection notice in the
// cache under a bill's name and every later read would treat it as the bill.
const REJECTED = /Request Rejected|The requested URL was rejected/i;

function cached(rel, url) {
  const f = path.join(CACHE, rel);
  if (fs.existsSync(f) && fs.statSync(f).size > 0) return fs.readFileSync(f, "utf8");
  const body = curl(url);
  if (REJECTED.test(body.slice(0, 4000))) throw new Error(`source refused the request: ${url}`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
  return body;
}

// ── The bill text, out of the XML ────────────────────────────────────────────
// `<info>` is the machine header — section uids, effective dates, buids. Everything
// a reader would call the bill is after `</info>`. Dropping the header is not
// cosmetic: it is dense with numbers that a keyword scan would otherwise read as
// content.
const ENACTING = /Be it enacted by the Legislature of the state of Utah/i;

const entities = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)))
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export function xmlToText(xml) {
  const i = xml.indexOf("</info>");
  let body = i >= 0 ? xml.slice(i + 7) : xml;
  body = entities(body.replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
  return body;
}

// ── The bill text, out of the legacy static HTML ─────────────────────────────
// These pages are one <font>-soup line per printed line of the bill, each prefixed
// with its line number and five &nbsp;. The line numbers are stripped: left in, a
// keyword scan reads a 400-line bill as 400 numbers.
export function htmlToText(html) {
  const i = html.indexOf('id="content"');
  let body = i >= 0 ? html.slice(html.indexOf(">", i) + 1) : html;
  body = entities(body.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));
  return body
    .split("\n")
    .map((l) => l.replace(/[  \t]+/g, " ").replace(/^\s*\d+\s/, "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

// Which of the published documents is the bill (modern JSON shape). Returns null
// rather than guessing.
export function pickDoc(meta) {
  const docs = [];
  for (const v of meta.billVersionList || []) {
    for (const d of v.billDocs || []) {
      docs.push({ ...d, versionSub: Number(v.subVersion || 0) });
    }
  }
  const xml = (d) => /\.xml$/i.test(String(d.url || ""));
  const enrolled = docs.filter((d) => d.fileType === "Enrolled" && xml(d));
  if (enrolled.length) return { kind: "enrolled", format: "xml", doc: enrolled[enrolled.length - 1] };
  // 2025 calls a substitute "PubSub"; 2024 calls it "Introduced" and distinguishes it
  // only by subVersion. Pick on subVersion, which both generations agree on.
  const subs = docs
    .filter((d) => xml(d) && d.versionSub > 0 && (d.fileType === "PubSub" || d.fileType === "Introduced"))
    .sort((a, b) => a.versionSub - b.versionSub);
  if (subs.length) {
    const top = subs[subs.length - 1];
    return { kind: `substitute_${top.versionSub}`, format: "xml", doc: top };
  }
  const intro = docs.filter((d) => xml(d) && d.fileType === "Introduced");
  if (intro.length) return { kind: "introduced", format: "xml", doc: intro[0] };
  return null;
}

// Which of the published documents is the bill (legacy shape — read off the static
// page, because the legacy JSON does not carry document URLs at all).
export function pickDocFromPage(html) {
  const found = [];
  const re = /setBill4\('([^']+)'\s*,\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(html))) found.push({ url: m[1], label: m[2] });
  // The fiscal note is published through the same JS hook and is not the bill.
  const docs = found.filter((d) => /\.htm$/i.test(d.url) && !/fnotes|\.fn\.htm$/i.test(d.url));
  const enr = docs.find((d) => /enrolled/i.test(d.label) || /billenr/i.test(d.url));
  if (enr) return { kind: "enrolled", format: "html", doc: enr };
  const subs = docs
    .filter((d) => /S\d+\.htm$/i.test(d.url))
    .map((d) => ({ ...d, n: Number(/S(\d+)\.htm$/i.exec(d.url)[1]) }))
    .sort((a, b) => a.n - b.n);
  if (subs.length) {
    const top = subs[subs.length - 1];
    return { kind: `substitute_${top.n}`, format: "html", doc: top };
  }
  const intro = docs.find((d) => /introduc/i.test(d.label) || /billint/i.test(d.url));
  if (intro) return { kind: "introduced", format: "html", doc: intro };
  return null;
}

// Bullet lists in `highlightedProvisions` arrive as <hr><ltbullet> markup. They are
// the legislature's own one-line-per-change summary and the single most useful thing
// to read before the full text, so they are unwrapped rather than stripped.
export const unbullet = (s) =>
  String(s || "")
    .replace(/<hr>\s*<ltbullet\d?>/gi, "\n  • ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

// One record shape out of two JSON shapes, so nothing downstream has to know which
// generation published the bill.
function normalizeMeta(meta, bill) {
  const legacy = !meta.billVersionList && (meta.shorttitle || meta.hilightedprovisions);
  if (!legacy) {
    return {
      legacy: false,
      number: meta.billNumberShort || null,
      title: meta.shortTitle || null,
      primeSponsor: meta.primeSponsorName || null,
      floorSponsor: meta.floorSponsorName || null,
      lastAction: meta.lastAction || null,
      lastActionDate: meta.lastActionDate || null,
      moniesAppropriated: meta.moniesAppropriated || null,
      generalProvisions: unbullet(meta.generalProvisions),
      highlightedProvisions: unbullet(meta.highlightedProvisions),
      subjects: [...new Set((meta.billVersionList || [])
        .flatMap((v) => (v.subjectList || []).map((x) => x.description)).filter(Boolean))],
      sectionsAffected: [...new Set((meta.billVersionList || [])
        .flatMap((v) => (v.sectionAffectedList || []).map((x) => x.secNo)).filter(Boolean))],
    };
  }
  const n = /^([HS])B0*(\d+)$/i.exec(bill);
  return {
    legacy: true,
    number: n ? `${n[1].toUpperCase()}.B. ${n[2]}` : bill,
    title: meta.shorttitle || null,
    primeSponsor: meta.sponsor || null,
    floorSponsor: meta.floorsponsor || null,
    lastAction: meta.lastaction || null,
    lastActionDate: meta.lastactiontime || null,
    moniesAppropriated: meta.monies || null,
    generalProvisions: unbullet(meta.generalprovisions),
    highlightedProvisions: unbullet(meta.hilightedprovisions),
    subjects: [...new Set(meta.subjects || [])],
    sectionsAffected: [...new Set(meta.codesections || [])],
  };
}

export function fetchBill(session, bill) {
  const metaTxt = cached(`${session}/${bill}.json`, SRC.billJson(session, bill));
  let meta;
  try { meta = JSON.parse(metaTxt); }
  catch (e) { return { bill, session, error: `bill json unparsable: ${e.message}` }; }
  const norm = normalizeMeta(meta, bill);
  const rec = {
    bill, session,
    chamber: /^H/i.test(bill) ? "utah house" : "utah senate",
    ...norm,
    billPage: SRC.billPage(session, bill),
    textKind: null, textUrl: null, textChars: 0, textFile: null, textOk: false,
  };
  let picked = pickDoc(meta);
  if (!picked) {
    // Legacy generation, or a modern record with no XML: the static page carries the
    // document links the JSON does not.
    let page;
    try { page = cached(`${session}/${bill}.page.html`, SRC.billPage(session, bill)); }
    catch (e) { rec.error = `bill page fetch failed: ${e.message}`; return rec; }
    picked = pickDocFromPage(page);
  }
  if (!picked) { rec.error = "no published bill text of any kind"; return rec; }
  rec.textKind = picked.kind;
  rec.textUrl = SRC.doc(picked.doc.url);
  rec.textFormat = picked.format;
  let raw;
  try { raw = cached(`${session}/text/${bill}.${picked.kind}.${picked.format}`, rec.textUrl); }
  catch (e) { rec.error = `text fetch failed: ${e.message}`; return rec; }
  const text = picked.format === "xml" ? xmlToText(raw) : htmlToText(raw);
  // The decode/right-document assertion. A UTF-16 misread produces a long string with
  // no English in it, and this host answers some missing paths with a 200-shaped error
  // page; the enacting clause is the cheapest thing neither can survive.
  if (!ENACTING.test(text) && text.length > 400) rec.decodeWarning = "enacting clause not found in extracted text";
  const tf = path.join(CACHE, session, "text", `${bill}.txt`);
  fs.mkdirSync(path.dirname(tf), { recursive: true });
  fs.writeFileSync(tf, text);
  rec.textFile = tf;
  rec.textChars = text.length;
  rec.textOk = text.length > 400 && !rec.decodeWarning;
  return rec;
}

function main() {
  let bills = [];
  if (has("--from")) {
    const j = JSON.parse(fs.readFileSync(val("--from"), "utf8"));
    bills = (j.bills || []).map((b) => (typeof b === "string" ? b : b.bill));
  } else if (has("--bills")) {
    bills = val("--bills", "").split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (!bills.length) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8")
      .split("\n").filter((l) => l.startsWith("//")).join("\n"));
    return;
  }
  const out = [];
  let ok = 0, bad = 0;
  for (const b of bills) {
    let rec;
    try { rec = fetchBill(SESSION, b); }
    catch (e) { rec = { bill: b, session: SESSION, error: e.message }; }
    if (rec.textOk) ok++; else bad++;
    out.push(rec);
    if (!has("--json")) {
      process.stderr.write(`${rec.textOk ? "ok  " : "MISS"} ${b} ${rec.textKind || "-"} ${rec.textChars} ${rec.error || rec.decodeWarning || ""}\n`);
    }
  }
  const f = path.join(CACHE, `${SESSION}.bills.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify({ session: SESSION, bills: out }, null, 2));
  if (has("--json")) console.log(JSON.stringify({ session: SESSION, ok, bad, bills: out }, null, 2));
  else console.log(`${f}  ${ok} with readable text, ${bad} without`);
}
if (import.meta.url === `file://${process.argv[1]}`) main();
