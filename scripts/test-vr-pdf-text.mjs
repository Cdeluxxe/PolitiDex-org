#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-vr-pdf-text.mjs — the minutes PDF reader, and what it must refuse
// ─────────────────────────────────────────────────────────────────────────────
// Utah publishes committee minutes as PDFs written by Apache FOP, and FOP does
// not put readable text in them. Every glyph is an index into a subset font, so a
// naive reader that looks for literal `(...)Tj` strings finds NOTHING and reports
// an empty document — which is the single most dangerous failure mode this wave
// has, because "no committee votes in these minutes" and "I could not read these
// minutes" would look identical in the counts. vr-pdf-text.mjs exists to tell
// those two apart, and this harness pins the mechanism:
//
//   1. GLYPH INDICES DECODE. A hex string of subset-font glyph indices comes back
//      as text, via the font's own /ToUnicode CMap — both bfchar and bfrange.
//   2. NO CMAP MEANS NO TEXT. A font with no /ToUnicode is unreadable, and the
//      reader returns nothing for it rather than guessing at the codes.
//   3. LAYOUT IS NOT INVENTED. FOP kerns by moving x, so words must be split on a
//      forward jump and lines on a baseline change — otherwise a name table comes
//      out as one joined run and the name matcher silently misses everyone.
//   4. A SCANNED PAGE IS REFUSED. An image-only page (DCTDecode) yields zero
//      lines, which the ingest must read as UNREADABLE.
//   5. ZERO LINES IS NOT EMPTY. The module says so in its own words, because the
//      count in the wave report depends on the distinction.
//
// The fixtures are built here, byte by byte, rather than committed: a real
// minutes PDF is a 50KB binary nobody can review in a diff, and what needs
// pinning is the decoder, not one document. Everything below is dependency-free.
//
//   node scripts/test-vr-pdf-text.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { parseToUnicode, pdfToLines, pdfText } from "./vr-pdf-text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };
const eq = (a, b, msg) =>
  ok(a === b, `${msg} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (hay, needle, msg) =>
  ok(String(hay).indexOf(needle) >= 0, `${msg} — "${needle}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);
const must = (cond, msg) => {
  if (cond) return;
  console.error(`✗ vr-pdf-text: ${msg}`);
  process.exit(1);
};

// ── A PDF, assembled ─────────────────────────────────────────────────────────
// Object bodies in, `N 0 obj … endobj` out. The reader scans for that pattern
// brute-force rather than walking the xref table, so a fixture does not need a
// valid xref — but it does need real Flate streams, real object numbers and real
// indirect references, because those are exactly what it follows.
const obj = (id, body) => `${id} 0 obj\n${body}\nendobj\n`;
const stream = (dict, bytes) => {
  const z = deflateSync(Buffer.from(bytes, "latin1"));
  return Buffer.concat([
    Buffer.from(`<< ${dict} /Filter /FlateDecode /Length ${z.length} >>\nstream\n`, "latin1"),
    z,
    Buffer.from("\nendstream", "latin1"),
  ]).toString("latin1");
};
const buildPdf = (objects) =>
  Buffer.from("%PDF-1.4\n" + objects.join("") + "%%EOF\n", "latin1");

// A subset font's CMap: glyph 1..n → the letters of an alphabet, the way FOP
// writes one. bfchar for the singletons, bfrange for the run.
const CMAP_BFCHAR = `/CIDInit /ProcSet findresource begin
12 dict begin begincmap
1 beginbfchar
<0001> <0048>
endbfchar
3 beginbfchar
<0002> <004F>
<0003> <0055>
<0004> <0053>
endbfchar
endcmap end end`;
// A→Z at glyph 0x0010..0x0029, and a space at 0x0001.
const CMAP_BFRANGE = `/CIDInit /ProcSet findresource begin
begincmap
1 beginbfchar
<0001> <0020>
endbfchar
1 beginbfrange
<0010> <0029> <0041>
endbfrange
endcmap end end`;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · The CMap itself");
// ═════════════════════════════════════════════════════════════════════════════
{
  const m = parseToUnicode(CMAP_BFCHAR);
  eq(m.get(1), "H", "a bfchar singleton maps its glyph to its character");
  eq(m.get(4), "S", "a later bfchar block is read too, not just the first");
  eq(m.size, 4, "no glyph is invented");
  const r = parseToUnicode(CMAP_BFRANGE);
  eq(r.get(0x10), "A", "a bfrange maps its low glyph");
  eq(r.get(0x29), "Z", "a bfrange maps its high glyph");
  eq(r.get(0x1a), "K", "…and every glyph between them");
  eq(r.get(0x2a), undefined, "a bfrange does not run past its stated high glyph");
  eq(r.get(1), " ", "bfchar and bfrange coexist in one CMap");
  eq(parseToUnicode("no cmap here").size, 0, "a stream with no CMap yields no mappings");
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · Glyph indices become text");
// ═════════════════════════════════════════════════════════════════════════════
// The word "HOUSE" as FOP would write it: hex glyph indices in a TJ array, with
// kerning numbers between them, under a font that only a /ToUnicode can decode.
const G = {};  // letter → glyph hex, using the bfrange fixture
for (let i = 0; i < 26; i++) G[String.fromCharCode(65 + i)] = (0x10 + i).toString(16).padStart(4, "0");
const glyphs = (word) => [...word.toUpperCase()].map((c) => (c === " " ? "0001" : G[c])).join("");

const CONTENT = `BT
/F1 11 Tf
1 0 0 1 72 700 Tm
[<${glyphs("HOUSE")}>] TJ
1 0 0 1 110 700 Tm
[<${glyphs("EDUCATION")}>] TJ
1 0 0 1 72 680 Tm
[<${glyphs("MOTION")}>] TJ
ET`;
const FONT_DOC = buildPdf([
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>"),
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
  obj(3, "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
  obj(4, stream("", CONTENT)),
  obj(5, "<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Times /ToUnicode 6 0 R >>"),
  obj(6, stream("", CMAP_BFRANGE)),
]);
{
  const lines = pdfToLines(FONT_DOC);
  must(lines.length > 0, "the fixture PDF decoded to nothing — the harness proves nothing");
  eq(lines.length, 2, "a baseline change ends a line");
  eq(lines[0], "HOUSE EDUCATION",
    "two positioned runs on one baseline are one line, with the gap as a space");
  eq(lines[1], "MOTION", "the second baseline is the second line");
  has(pdfText(FONT_DOC), "\n", "pdfText joins the lines with newlines");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · No CMap means no text — never a guess");
// ═════════════════════════════════════════════════════════════════════════════
// The same content stream, the same glyph indices, but the font declares no
// /ToUnicode. Reading the indices as character codes would produce plausible
// mojibake — which is worse than nothing, because it would match nothing and be
// counted as an empty document. The reader must return nothing at all.
{
  const NO_CMAP = buildPdf([
    obj(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    obj(3, "<< /Type /Page /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    obj(4, stream("", CONTENT)),
    obj(5, "<< /Type /Font /Subtype /Type0 /BaseFont /ABCDEF+Times >>"),
  ]);
  eq(pdfToLines(NO_CMAP).length, 0, "a font with no /ToUnicode yields no lines");
}

// ═════════════════════════════════════════════════════════════════════════════
section("4 · Layout is read, not invented");
// ═════════════════════════════════════════════════════════════════════════════
// A committee vote table is drawn as one text run per column, positioned. This is
// where a reader that ignores x/y produces "AUXIERBALLARDBIRKELAND" and a name
// matcher that then finds nobody. Both operators FOP uses — Tm and Td — must
// split, and a small jump must NOT split (it is intra-word kerning).
{
  const TABLE = `BT
/F1 11 Tf
1 0 0 1 72 700 Tm
[<${glyphs("AUXIER")}>] TJ
1 0 0 1 200 700 Tm
[<${glyphs("BALLARD")}>] TJ
0 -20 Td
[<${glyphs("BIRKELAND")}>] TJ
0.4 0 Td
[<${glyphs("S")}>] TJ
ET`;
  const doc = buildPdf([
    obj(3, "<< /Type /Page /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    obj(4, stream("", TABLE)),
    obj(5, "<< /Type /Font /ToUnicode 6 0 R >>"),
    obj(6, stream("", CMAP_BFRANGE)),
  ]);
  const lines = pdfToLines(doc);
  eq(lines.length, 2, "a Td baseline change ends a line just as a Tm one does");
  eq(lines[0], "AUXIER BALLARD",
    "two columns on one baseline are separated, not joined");
  eq(lines[1], "BIRKELANDS",
    "a sub-point forward jump is kerning inside a word, not a column break");
}
// A literal string, which some pages do use, still reads.
{
  const doc = buildPdf([
    obj(3, "<< /Type /Page /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    obj(4, stream("", "BT /F1 11 Tf 1 0 0 1 72 700 Tm (Yeas - 9 Nays - 2) Tj ET")),
    obj(5, "<< /Type /Font /ToUnicode 6 0 R >>"),
    obj(6, stream("", CMAP_BFRANGE)),
  ]);
  eq(pdfToLines(doc)[0], "Yeas - 9 Nays - 2",
    "a literal (…)Tj string is taken as written");
}
// A KNOWN LIMITATION, PINNED RATHER THAN HIDDEN. Inside a single TJ array, FOP
// separates runs with a kerning NUMBER, and this reader ignores those numbers —
// so two runs in one array come out joined. It does not matter for what the
// ingest asks of this text: confirmAgainstPdf() compares everything with the
// spaces removed on both sides, so a missing space cannot turn a confirmation
// into a refusal or the other way round. It is pinned here so that a future
// caller that DOES need word boundaries finds out from a test rather than from
// a wrong answer.
{
  const doc = buildPdf([
    obj(3, "<< /Type /Page /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    obj(4, stream("", `BT /F1 11 Tf 1 0 0 1 72 700 Tm [<${glyphs("HOUSE")}> -250 <${glyphs("EDUCATION")}>] TJ ET`)),
    obj(5, "<< /Type /Font /ToUnicode 6 0 R >>"),
    obj(6, stream("", CMAP_BFRANGE)),
  ]);
  eq(pdfToLines(doc)[0], "HOUSEEDUCATION",
    "intra-array kerning is not read as a space — a known limit, immaterial to the space-stripped cross-check");
  const ING = R("scripts/vr-utah-committee-ingest.mjs");
  has(ING, "nospace(motionText)",
    "…because the ingest compares the motion sentence with the spaces removed");
}

// ═════════════════════════════════════════════════════════════════════════════
section("5 · A scanned page is refused, and silence is not emptiness");
// ═════════════════════════════════════════════════════════════════════════════
{
  const SCAN = buildPdf([
    obj(3, "<< /Type /Page /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>"),
    obj(4, "<< /Type /XObject /Subtype /Image /Filter /DCTDecode /Length 8 >>\nstream\n\xFF\xD8\xFF\xE0abcd\nendstream"),
    obj(5, stream("", "q 612 0 0 792 0 0 cm /Im1 Do Q")),
  ]);
  eq(pdfToLines(SCAN).length, 0, "an image-only page yields no lines");
  eq(pdfToLines(Buffer.from("not a pdf at all", "latin1")).length, 0,
    "a non-PDF yields no lines rather than throwing");
  eq(pdfToLines(Buffer.alloc(0)).length, 0, "an empty buffer yields no lines");
}
// The module has to say what zero lines means, because the wave report's
// "fetched vs parsed vs refused" split is exactly this distinction.
{
  const SRC = R("scripts/vr-pdf-text.mjs");
  has(SRC, "UNREADABLE", "the module names the unreadable case in its own words");
  has(SRC, "Zero lines means", "…and says what zero lines means for a caller");
  has(SRC, "DCTDecode", "…and names the scanned-page filter it cannot read");
  has(SRC, "ToUnicode", "…and names the table the whole approach depends on");
}
// The ingest that consumes this must treat an unreadable PDF as a refusal it
// reports, not as a meeting with no votes.
{
  const ING = R("scripts/vr-utah-committee-ingest.mjs");
  has(ING, "pdfToLines", "the committee ingest reads its PDFs through this module");
  has(ING, "pdfUnconfirmed",
    "the ingest counts the acts whose PDF did not confirm them, separately");
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n   ${passed} checks passed`);
if (failures.length) {
  console.error(`\n✗ vr-pdf-text: ${failures.length} failure(s)`);
  for (const f of failures.slice(0, 40)) console.error(`   • ${f}`);
  process.exit(1);
}
console.log("✓ vr-pdf-text: glyph indices decode, and an unreadable page says so");
