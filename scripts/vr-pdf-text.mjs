#!/usr/bin/env node
// ── READING A UTAH COMMITTEE MINUTES PDF, WITH NO DEPENDENCIES ───────────────
// The Utah Legislature publishes committee minutes as PDFs, and those PDFs are the
// document a citation can point a reader at. So the ingest has to be able to READ
// them — not to guess at them from the file size, and not to take a JSON feed's word
// for what the published minutes say.
//
// The obvious approach — pull the literal strings out of the content stream — finds
// nothing at all here, and it is worth writing down why, because "0 lines extracted"
// looks exactly like "scanned image" and these are not scanned. The minutes are
// rendered by Apache FOP, which embeds a SUBSET of each font and addresses it by
// glyph index:
//
//   BT /F158 11 Tf 1 0 0 -1 0 15.18 Tm
//   [<000A000B00060009>] TJ
//   ET
//
// There is no "(House Education)" in that stream. 000A is "the tenth glyph of the
// subset", and only the font's own /ToUnicode CMap says which character that is. So
// this reader does the small amount of PDF that makes the text appear:
//
//   1. find every object (by scanning for "N 0 obj" — these files have working xref
//      tables, but scanning cannot be broken by one),
//   2. for every font object with a /ToUnicode, inflate that CMap and read its
//      bfchar/bfrange entries into glyph → character,
//   3. walk each content stream tracking the current font, decode the hex strings
//      through that font's map, and break a line whenever the text matrix moves to a
//      new baseline.
//
// What comes out is the page's text in reading order, one string per baseline. That
// is enough to confirm a committee, a date, a motion and a vote tally; it is NOT a
// layout engine, and the multi-column name tables come out as one run per column
// (see the caveats in db/vr-ingest-runbook.md). Anything a real PDF library would do
// that this does not — encryption, CID fonts with no ToUnicode, actual scans — shows
// up as zero lines, which the caller must treat as UNREADABLE rather than as empty.

import fs from "node:fs";
import zlib from "node:zlib";

// Every "N G obj … endobj" body, by object number. latin1 throughout: a PDF is
// bytes, and decoding it as UTF-8 would corrupt the binary streams before inflate
// ever sees them.
function scanObjects(buf) {
  const s = buf.toString("latin1");
  const objs = new Map();
  const re = /(\d+)\s+(\d+)\s+obj\b/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf("endobj", start);
    if (end < 0) continue;
    objs.set(Number(m[1]), { body: s.slice(start, end), start });
  }
  return { s, objs };
}

// The bytes between "stream" and "endstream", inflated when the dictionary says so.
// Returns null when there is no stream or the filter is one we do not do — the
// caller then simply has one fewer stream to read, never a crash.
function streamBytes(s, obj) {
  const k = obj.body.indexOf("stream");
  if (k < 0) return null;
  const dict = obj.body.slice(0, k);
  let p = obj.start + k + "stream".length;
  if (s.charCodeAt(p) === 13) p++;
  if (s.charCodeAt(p) === 10) p++;
  const e = s.indexOf("endstream", p);
  if (e < 0) return null;
  const raw = Buffer.from(s.slice(p, e), "latin1");
  if (/\/FlateDecode/.test(dict)) {
    try { return zlib.inflateSync(raw); } catch { return null; }
  }
  if (/\/Filter/.test(dict)) return null; // DCTDecode &c: an image, not text
  return raw;
}

const hexPairsToString = (h) => {
  let out = "";
  for (let i = 0; i + 1 < h.length; i += 4) {
    out += String.fromCharCode(parseInt(h.slice(i, i + 4).padEnd(4, "0"), 16));
  }
  return out;
};

// glyph code → character, from one /ToUnicode CMap. Both forms appear in FOP output:
// bfchar for one-offs, bfrange for runs.
export function parseToUnicode(txt) {
  const map = new Map();
  for (const blk of txt.match(/beginbfchar([\s\S]*?)endbfchar/g) || []) {
    for (const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      map.set(parseInt(m[1], 16), hexPairsToString(m[2]));
    }
  }
  for (const blk of txt.match(/beginbfrange([\s\S]*?)endbfrange/g) || []) {
    for (const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), to = parseInt(m[3], 16);
      for (let i = 0; lo + i <= hi && i < 0x10000; i++) {
        map.set(lo + i, String.fromCodePoint(to + i));
      }
    }
  }
  return map;
}

// One content stream → lines. The text matrix (Tm) and the two offset operators
// (Td/TD) are the only positioning this needs: a change of baseline ends a line, and
// a forward jump on the same baseline is a space (FOP kerns by moving x rather than
// by emitting a space glyph, so without this "HOUSEEDUCATION" comes out joined).
//   The one gap left: a kerning NUMBER between two runs of a single TJ array is
// ignored, so those two runs do come out joined. Nothing here needs the boundary —
// the minutes cross-check in vr-utah-committee-ingest.mjs compares with the spaces
// removed on both sides — and test-vr-pdf-text.mjs pins the behaviour so a caller
// that does need word boundaries learns it from a test, not from a wrong answer.
function decodeContent(txt, cmapByName) {
  const lines = [];
  let font = null, cur = "", lastY = null, lastX = null;
  const flush = () => {
    const t = cur.replace(/\s+/g, " ").trim();
    if (t) lines.push(t);
    cur = "";
  };
  const decodeHex = (h) => {
    const clean = h.replace(/\s+/g, "");
    const cm = font ? cmapByName.get(font) : null;
    let out = "";
    for (let i = 0; i + 1 < clean.length; i += 4) {
      const code = parseInt(clean.slice(i, i + 4).padEnd(4, "0"), 16);
      if (cm && cm.has(code)) out += cm.get(code);
    }
    return out;
  };
  const re = /\/(F\d+)\s+[-\d.]+\s+Tf|((?:[-\d.]+\s+){6})Tm|((?:[-\d.]+\s+){2})T[dD]|\[([^\]]*)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj|<([0-9A-Fa-f\s]*)>\s*Tj/g;
  let m;
  while ((m = re.exec(txt))) {
    if (m[1]) { font = m[1]; continue; }
    if (m[2]) {
      const n = m[2].trim().split(/\s+/).map(Number);
      const x = n[4], y = n[5];
      if (lastY !== null && Math.abs(y - lastY) > 0.5) flush();
      else if (lastX !== null && x - lastX > 1.5) cur += " ";
      lastY = y; lastX = x;
      continue;
    }
    if (m[3]) {
      const n = m[3].trim().split(/\s+/).map(Number);
      if (Math.abs(n[1]) > 0.5) flush(); else if (n[0] > 1.5) cur += " ";
      continue;
    }
    if (m[4] != null) {
      for (const h of m[4].matchAll(/<([0-9A-Fa-f\s]*)>/g)) cur += decodeHex(h[1]);
      continue;
    }
    if (m[5] != null) { cur += m[5].replace(/\\([()\\])/g, "$1"); continue; }
    if (m[6] != null) { cur += decodeHex(m[6]); }
  }
  flush();
  return lines;
}

// The whole document, in the order the objects appear — which for FOP output is page
// order. Zero lines means UNREADABLE, not empty; callers must say so out loud.
export function pdfToLines(buf) {
  const { s, objs } = scanObjects(buf);
  const cmapByObj = new Map();
  for (const [id, o] of objs) {
    if (!/\/Type\s*\/Font/.test(o.body)) continue;
    const ref = /\/ToUnicode\s+(\d+)\s+\d+\s+R/.exec(o.body);
    if (!ref) continue;
    const target = objs.get(Number(ref[1]));
    const st = target && streamBytes(s, target);
    if (st) cmapByObj.set(id, parseToUnicode(st.toString("latin1")));
  }
  // /F158 is a name in a page's resource dictionary, not a global; in practice FOP
  // numbers them once per document, so a document-wide name → CMap table is right
  // and keeps this from having to walk the page tree.
  const cmapByName = new Map();
  for (const [, o] of objs) {
    for (const m of o.body.matchAll(/\/(F\d+)\s+(\d+)\s+\d+\s+R/g)) {
      const cm = cmapByObj.get(Number(m[2]));
      if (cm) cmapByName.set(m[1], cm);
    }
  }
  const lines = [];
  for (const [, o] of objs) {
    const st = streamBytes(s, o);
    if (!st) continue;
    const txt = st.toString("latin1");
    if (!/\bBT\b/.test(txt) || !/\bT[Jj]\b/.test(txt)) continue;
    lines.push(...decodeContent(txt, cmapByName));
  }
  return lines;
}

export const pdfText = (buf) => pdfToLines(buf).join("\n");

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = process.argv[2];
  if (!f) { console.error("usage: vr-pdf-text.mjs <file.pdf>"); process.exit(2); }
  const lines = pdfToLines(fs.readFileSync(f));
  console.error(`${lines.length} line(s)`);
  process.stdout.write(lines.join("\n") + "\n");
}
