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
//                         m   the issues it is mapped to, one entry per issue:
//                             { i: the issue's label, l: the effect line stored
//                             for that pair — absent where none is stored }
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
//   · Which issues: the `issues` set measureAddresses() keeps for the row — the
//     keys its mapping inserts named, with every later re-key and delete in
//     the migrations replayed over them, so a filing a correction withdrew is
//     not printed. The label is the issue's own, from ISSUE_MAP in
//     issue-map.js. A key with no label there is not printed under a made-up
//     name. A measure mapped to nothing has no `m`, and its document says
//     nothing about issues at all — not "touches none".
//   · The effect lines are consistency.js's _DOS_EFFECT, else the pair's curated
//     `did` in _DOS_MECH, held to the drawer's own row rule (_dosEffectOk): one
//     sentence, 140 characters or fewer, no word about how the archive coded the
//     act. This is the line the issue drawer already prints under the row; it is
//     lifted out of the shipped source, not rewritten. A line sits only under
//     the issue it is stored on: an issue with no line that passes is listed
//     bare, and a line stored for an issue the measure is NOT mapped to is
//     not printed — there is no row in any drawer for it to sit under.
//
// WHAT IT DELIBERATELY DOES NOT CARRY. No scraped Congress.gov text, no summary,
// no score, no percentage, no support/oppose direction, no tally of members, no
// mapping weight, no primary flag. An entry is an issue's name and, where one is
// stored, what the act did to it; which way a vote on it "counts" is not on the
// document.
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

// ISSUE_MAP's labels, read out of issue-map.js by key: the first `key: { label:
// '…'` at the start of a line. db/share-index.json carries the same labels for
// the keys it indexes, and a test holds the two to agreement.
export function issueLabels(src) {
  const out = {};
  for (const m of String(src).matchAll(/^\s*([a-z][a-z0-9_]*):\s*\{\s*label:\s*'((?:[^'\\]|\\.)*)'/gm)) {
    if (!(m[1] in out)) out[m[1]] = m[2].replace(/\\(.)/g, "$1");
  }
  return out;
}
const PLACEHOLDER = /^(?:roll\s*call|vote)\s*(?:no\.?|#)?\s*\d+/i;

export function billDocs(root) {
  const R = (f) => fs.readFileSync(path.join(root || ROOT, f), "utf8");
  const src = R("consistency.js");
  const EFFECT = liftTable(src, "_DOS_EFFECT");
  const MECH = liftTable(src, "_DOS_MECH");
  const labels = issueLabels(R("issue-map.js"));
  const identity = new Map();
  for (const m of JSON.parse(R("db/vr-measure-identity.json")).measures || []) {
    if (m && m.number && m.title) identity.set(`${m.congress}|${String(m.number).trim()}`, String(m.title).trim());
  }

  // The stored line for one (measure, issue) pair, held to the drawer's rule.
  const lineFor = (num, cong, issue) => {
    const k = `${num}|${cong}|${issue}`;
    return effectOk(EFFECT[k] || (MECH[k] && MECH[k].did) || "");
  };

  const index = measureAddresses(root || ROOT);
  // A correction this reader could not place might have withdrawn an issue a
  // document would then still name. Refuse to write rather than print it.
  if (index.stats.unresolvedCorrections.length) {
    const u = index.stats.unresolvedCorrections[0];
    throw new Error(`${index.stats.unresolvedCorrections.length} mapping correction(s) in the migrations could not be replayed (first: ${u.file} — ${u.why})`);
  }

  const docs = {};
  for (const a of index.published) {
    const key = `${a.sitting}|${a.number}`;
    let title = String(a.title || "").trim();
    if (!title || PLACEHOLDER.test(title) || title.toLowerCase() === a.number.toLowerCase()) {
      title = identity.get(`${a.sitting}|${a.number}`) || "";
    }
    // One entry per mapped issue, in label order: the label, and the line
    // stored for THAT pair if one passes. Never another issue's line.
    const m = [...a.issues]
      .map((k) => {
        const i = stripEmoji(labels[k] || "");
        const l = i ? lineFor(a.number, a.sitting, k) : "";
        return l ? { i, l } : { i };
      })
      .filter((x) => x.i)
      .sort((p, q) => p.i.localeCompare(q.i));
    const doc = { s: a.sitting, n: a.number, c: a.chamber || "", t: title };
    if (m.length) doc.m = m;
    docs[key] = doc;
  }
  return docs;
}

function render(docs) {
  return JSON.stringify({
    _comment:
      "GENERATED by scripts/gen-bill-docs.mjs — do not edit by hand. One entry per /b/<sitting>/<number> document: sitting, number, chamber, stored title, and the issues it is mapped to, each with the effect line stored for that pair where one is. Read by netlify/lib/share-target.ts (the body the edge writes) and scripts/gen-sitemap.mjs (the bill rows it lists). No score, no direction, no scraped text.",
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
