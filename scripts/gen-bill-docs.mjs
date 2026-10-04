#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// gen-bill-docs.mjs — the bill documents that exist, for the edge and the sitemap
// ─────────────────────────────────────────────────────────────────────────────
// WHAT THIS WRITES
//
//   db/bill-docs.json   one entry per /b/<sitting>/<number> document, keyed
//                       "<sitting>|<number>", the number spelled exactly as the
//                       row prints it. Each entry carries what the document's
//                       body says and nothing else:
//
//                         s   the sitting — a congress ("119") or a state
//                             session code ("2025GS")
//                         n   the printed number ("H.J.Res. 131")
//                         c   the chamber the row records ("house", "utah senate")
//                         t   the title the archive stores for the measure
//                         e   the effect lines already stored for it, one per
//                             issue: { i: issue label, l: the line }
//
// WHY IT EXISTS
//
// /b/119/H.J.Res.%20131 was in the sitemap and every drawer pointed at it, and
// the server answered it with index.html. The bill appeared only after the
// homepage's JavaScript opened a panel over itself, and the edge rewrote the
// <head> and put nothing in the <body>. A crawler got the homepage under a
// bill's title. The address is now its own document (bill.html), and the edge
// writes the bill INTO the body — and this file is what it writes from.
//
// WHERE THE WORDS COME FROM — nowhere new.
//
//   · Identity (sitting, number, chamber, title) is measureAddresses() in
//     vr-measure-addresses.mjs, the same projection of the applied migrations
//     the sitemap has listed bills from since bills had addresses. The floor is
//     that file's floor: a number, a sitting, a citable source and something to
//     read. No second rule.
//   · A title the migrations only ever stored as a placeholder ("Roll call 247")
//     is read from db/vr-measure-identity.json — the curated identity table the
//     ingest applies to exactly those rows — and printed only when that table
//     names the same (congress, number). Otherwise no title is printed at all.
//   · The effect lines are consistency.js's _DOS_EFFECT, else the pair's curated
//     `did` in _DOS_MECH, held to the drawer's own row rule (_dosEffectOk): one
//     sentence, 140 characters or fewer, no word about how the archive coded the
//     act. This is the line the issue drawer already prints under the row; it is
//     lifted out of the shipped source, not rewritten.
//
// WHAT IT DELIBERATELY DOES NOT CARRY. No scraped Congress.gov text, no summary,
// no score, no percentage, no support/oppose direction, no tally of members, no
// mapping weight. A line is an effect of the act on one issue, labelled by that
// issue's name; which way a vote on it "counts" is not on the document.
//
// THE SITEMAP READS THIS FILE. gen-sitemap.mjs lists a bill only if it has an
// entry here, so every advertised /b/ address is a document the edge can write.
// An address with no entry is the empty document and is never advertised.
//
// USAGE
//   node scripts/gen-bill-docs.mjs           # write db/bill-docs.json
//   node scripts/gen-bill-docs.mjs --check   # exit 1 if it is stale
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import vm from "node:vm";
import { measureAddresses } from "./vr-measure-addresses.mjs";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "db", "bill-docs.json");
const CHECK = process.argv.includes("--check");

const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

// One object literal out of consistency.js, evaluated on its own. The same lift
// scripts/test-issue-ledger.mjs makes, so the generator and the test read the
// store the same way.
function liftTable(src, name) {
  const a = src.indexOf(`var ${name} = {`);
  if (a === -1) throw new Error(`${name} is not in consistency.js in the form this generator reads`);
  const b = src.indexOf("\n  };", a);
  return vm.runInNewContext("(" + src.slice(a + `var ${name} = `.length, b + 4) + ")");
}

// The drawer's row rule, transcribed from _dosEffectOk in consistency.js. A test
// (test-bill-document.mjs) holds the two to the same verdicts.
const METHOD = /\b(?:precedent|mirror|discriminator|primary row|secondary row|vocabulary (?:carries|has) no|coded|chip|mapped|filed as|weighted)\b/i;
export function effectOk(raw) {
  const s = String(raw == null ? "" : raw).replace(/\s+/g, " ").trim();
  if (!s || s.length > 140 || !/[.!?]$/.test(s)) return "";
  if (/[.!?]\s+["“(]?[A-Z0-9]/.test(s.replace(/\bU\.S\./g, "US"))) return "";
  if (METHOD.test(s)) return "";
  return s;
}

const stripEmoji = (s) => String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
const PLACEHOLDER = /^(?:roll\s*call|vote)\s*(?:no\.?|#)?\s*\d+/i;

export function billDocs(root) {
  const R = (f) => fs.readFileSync(path.join(root || ROOT, f), "utf8");
  const src = R("consistency.js");
  const EFFECT = liftTable(src, "_DOS_EFFECT");
  const MECH = liftTable(src, "_DOS_MECH");
  const labels = (JSON.parse(R("db/share-index.json")).issues) || {};
  const identity = new Map();
  for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
    if (m && m.number && m.title) identity.set(`${m.congress}|${String(m.number).trim()}`, String(m.title).trim());
  }

  // Every (number|congress|issue) key either table holds, grouped by measure.
  const lines = new Map();
  for (const k of new Set([...Object.keys(EFFECT), ...Object.keys(MECH)])) {
    const [num, cong, issue] = k.split("|");
    const line = effectOk(EFFECT[k] || (MECH[k] && MECH[k].did) || "");
    if (!line || !issue) continue;
    const mk = `${cong}|${num}`;
    if (!lines.has(mk)) lines.set(mk, []);
    lines.get(mk).push({ issue, line });
  }

  const docs = {};
  for (const a of measureAddresses(root || ROOT).published) {
    const key = `${a.sitting}|${a.number}`;
    let title = String(a.title || "").trim();
    if (!title || PLACEHOLDER.test(title) || title.toLowerCase() === a.number.toLowerCase()) {
      title = identity.get(`${a.sitting}|${a.number}`) || "";
    }
    // One line per issue, in issue-label order, and a line two issues share is
    // printed once under the first.
    const seen = new Set();
    const e = (lines.get(`${a.sitting}|${a.number}`) || [])
      .map((x) => ({ i: stripEmoji(labels[x.issue] || ""), l: x.line }))
      .filter((x) => x.i)
      .sort((p, q) => p.i.localeCompare(q.i) || p.l.localeCompare(q.l))
      .filter((x) => (seen.has(x.l) ? false : (seen.add(x.l), true)));
    const doc = { s: a.sitting, n: a.number, c: a.chamber || "", t: title };
    if (e.length) doc.e = e;
    docs[key] = doc;
  }
  return docs;
}

function render(docs) {
  return JSON.stringify({
    _comment:
      "GENERATED by scripts/gen-bill-docs.mjs — do not edit by hand. One entry per /b/<sitting>/<number> document: sitting, number, chamber, stored title, and the stored per-issue effect lines. Read by netlify/lib/share-target.ts (the body the edge writes) and scripts/gen-sitemap.mjs (the bill rows it lists). No score, no direction, no scraped text.",
    docs,
  }, null, 1) + "\n";
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  const out = render(billDocs(ROOT));
  if (CHECK) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (cur !== out) {
      console.error("✗ db/bill-docs.json is stale — run node scripts/gen-bill-docs.mjs");
      process.exit(1);
    }
    console.log("✓ db/bill-docs.json is current");
  } else {
    fs.writeFileSync(OUT, out);
    console.log(`wrote db/bill-docs.json (${Object.keys(JSON.parse(out).docs).length} bill documents)`);
  }
}
