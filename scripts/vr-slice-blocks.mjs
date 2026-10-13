// ─────────────────────────────────────────────────────────────────────────────
// vr-slice-blocks.mjs — the marked slice blocks inside an effect table
// ─────────────────────────────────────────────────────────────────────────────
// Effect-line slices write their lines in a block of their own at the end of a
// table, opened by a marker such as
//
//     // BUDGET AND FISCAL SLICE 1 (v360).
//
// A slice's test reads its own block — from its marker to the next slice marker
// or the end of the table — and pins everything else as it stood. A slice that
// lands later writes its own block after it, held by its own test, so an earlier
// slice's pins exclude any block with a newer version than its own.
//
//   import { sliceBlocks, keysAfter } from "./vr-slice-blocks.mjs";
//   const mine = sliceBlocks(src, "_DOS_EFFECT").find((b) => b.version === 360);
//   const newer = keysAfter(src, "_DOS_EFFECT", 360);   // keys a later slice wrote
const MARKER = /^ {4}\/\/ [A-Z][A-Z -]* SLICE \d+ \(v(\d+)\)\./gm;

function body(src, name) {
  const at = src.indexOf(`var ${name} = {`);
  if (at < 0) return "";
  return src.slice(at, src.indexOf("\n  };", at) + 4);
}

// Every marked block in the table, in order: { version, marker, keys }.
export function sliceBlocks(src, name) {
  const b = body(src, name);
  const marks = [...b.matchAll(MARKER)];
  return marks.map((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].index : b.length;
    const keys = [...b.slice(m.index, end).matchAll(/^ {4}'((?:[^'\\]|\\.)+)':$/gm)].map((x) => x[1].replace(/\\'/g, "'"));
    return { version: Number(m[1]), marker: m[0], keys };
  });
}

// The keys written by any slice newer than `version`.
export function keysAfter(src, name, version) {
  const out = new Set();
  for (const b of sliceBlocks(src, name)) if (b.version > version) for (const k of b.keys) out.add(k);
  return out;
}
