// ─────────────────────────────────────────────────────────────────────────────
// vr-exec-later.mjs — "Trump's lines did not move", for a test that compares
// _DOS_EXEC_EFFECT against HEAD
// ─────────────────────────────────────────────────────────────────────────────
// Every effect-line pass held the executive table byte-identical to HEAD,
// because none of them wrote an executive line. A later executive slice writes
// its lines in its own marked block at the end of the table, held by its own
// test — the same allowance these files already make for a later vote-line
// wave. So a pass that does not own the executive table checks exactly this:
// every line HEAD held is still there, byte for byte, and any key HEAD did not
// hold sits inside a marked executive slice block.
//
//   import { execHeld, execLaterKeys } from "./vr-exec-later.mjs";
//   ok(execHeld(src, headSrc), "_DOS_EXEC_EFFECT is not byte-identical to HEAD");
import vm from "node:vm";

const NAME = "_DOS_EXEC_EFFECT";
// A marked executive slice: "    // TARIFF ORDERS SLICE 2 (v361)." and the like.
const MARKER = /^ {4}\/\/ [A-Z][A-Z ]* SLICE \d+ \(v\d+\)\./m;

function table(src) {
  const at = src.indexOf(`var ${NAME} = {`);
  if (at < 0) return null;
  const end = src.indexOf("\n  };", at);
  return { body: src.slice(at, end + 4), map: vm.runInNewContext("(" + src.slice(at + `var ${NAME} = `.length, end + 4) + ")") };
}

// The keys written inside a marked executive slice block, from its marker to
// the end of the table.
export function execLaterKeys(src) {
  const t = table(src);
  if (!t) return new Set();
  const m = MARKER.exec(t.body);
  if (!m) return new Set();
  return new Set([...t.body.slice(m.index).matchAll(/^ {4}'((?:[^'\\]|\\.)+)':$/gm)].map((x) => x[1].replace(/\\'/g, "'")));
}

export function execHeld(src, headSrc) {
  const now = table(src), was = table(headSrc);
  if (!now || !was) return false;
  const later = execLaterKeys(src);
  for (const [k, v] of Object.entries(was.map)) if (now.map[k] !== v) return false;
  for (const k of Object.keys(now.map)) if (!(k in was.map) && !later.has(k)) return false;
  return true;
}
