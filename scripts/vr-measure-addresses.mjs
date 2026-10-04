// ─────────────────────────────────────────────────────────────────────────────
// vr-measure-addresses.mjs — which bills already have an address, offline
// ─────────────────────────────────────────────────────────────────────────────
// THE PROBLEM THIS EXISTS TO FIX
//
// /b/<sitting>/<number> is a real, server-visible address: netlify.toml serves
// index.html for it, share-preview.ts unfurls it, and share-links.js opens the
// bill panel on arrival. Every one of those pieces has been in place for a while
// and none of them put the address in sitemap.xml, so the bill face of the
// archive had no crawl path at all — a shared bill link worked and nothing else
// could ever find one.
//
// The sitemap generator could not fix that on its own, and its own header says
// why: the measure set lives in the database behind /api/voting-record, not in a
// data file the browser and Node both read, so there was nothing to enumerate
// without either a build-time database read or a hand-typed list that goes stale.
//
// WHERE THIS LOOKS INSTEAD
//
// netlify/database/migrations/*.sql — the applied migrations, which ARE in the
// repo and ARE the rows. Every measure the archive holds arrived through an
// `INSERT INTO vr_measures` in one of those files: the landmark seeds, the
// chamber windows, the Utah state and committee waves, the densification passes.
// So this module reads the migrations in applied order and rebuilds the identity
// half of vr_measures from them — number, chamber, congress or state session,
// title, source_url — plus, for each row, whether an issue mapping, a roll call
// or a committee position landed alongside it.
//
// That is a PROJECTION, not the database, and it is honest about the difference:
//
//   · Rows the live ingest added at runtime (vr-ingest-cron pulling a new roll
//     call from the Clerk) are not in any migration, so they are not here. They
//     are missing from the sitemap, which costs a crawl and tells no lie.
//   · A migration that was applied and later corrected is read in order, so the
//     correction wins: the one identity repair that rewrote a measure's NUMBER
//     (20260804000000, "Senate Amendments to H.R. 29" → "Senate Amendment to
//     S. 5") moves the address rather than leaving the old one advertised.
//
// THE FLOOR
//
// An address is published only when the row can carry it and the page it opens
// has something on it:
//
//   identity   a printed number AND a sitting — a congress ("119") or a state
//              session ("2025GS"). Not decoration: the number alone is not an
//              identity ("H.B. 208" names a different Utah bill in every general
//              session), and the sitting is the first segment of the address, so
//              a row without one has no /b/<sitting>/<number> form to publish.
//              This is also what keeps executive orders, proclamations and the
//              litigation rows out — they have neither, because they are not
//              bills, and no type allow-list was needed to say so.
//   citable    a source_url. getMeasureRef() in the voting-record function
//              answers 404 for a row without one ("never list a measure with no
//              citable source"), so an address for it does not open. Advertising
//              it would be advertising a 404.
//   content    at least one of: a real title, an issue mapping, or a formal act
//              on file (a roll call or a committee vote). A row carrying only a
//              number and a placeholder title — "Roll call 247", the roll number
//              the ingest saw before anyone had said what was voted on — is a
//              stub, and the panel it opens is a header with nothing under it.
//
// USAGE
//   import { measureAddresses, billPath } from "./vr-measure-addresses.mjs";
//   const { published, refused, stats } = measureAddresses(ROOT);
// ─────────────────────────────────────────────────────────────────────────────
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = ["netlify", "database", "migrations"];

// ── SQL literals, read rather than evaluated ────────────────────────────────
// Everything below walks the text with a quote/paren depth counter instead of a
// regular expression. The tuples in these files carry apostrophes inside quoted
// prose ('Utah''s'), commas inside JSON and nested parens inside
// jsonb_build_object(...) and ::timestamptz casts, all of which a comma-splitting
// regex gets wrong in a way that is silent — a shifted column reads a summary as
// a status and the row still looks plausible.

// Split a comma-separated SQL list at depth zero, outside quotes.
function splitList(s) {
  const out = [];
  let cur = "", depth = 0, quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === "'") {
        if (s[i + 1] === "'") { cur += "''"; i++; } else { quoted = false; cur += c; }
      } else cur += c;
      continue;
    }
    if (c === "'") { quoted = true; cur += c; continue; }
    if (c === "(") { depth++; cur += c; continue; }
    if (c === ")") { depth--; cur += c; continue; }
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// Read the balanced parenthesised group that starts at s[i] === "(".
// Returns [inner, indexAfterClosingParen] or [null, i].
function readGroup(s, i) {
  if (s[i] !== "(") return [null, i];
  let depth = 0, quoted = false;
  const start = i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === "'") { if (s[i + 1] === "'") i++; else quoted = false; }
      continue;
    }
    if (c === "'") { quoted = true; continue; }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (!depth) return [s.slice(start + 1, i), i + 1]; }
  }
  return [null, i];
}

// ── plpgsql DECLARE constants ───────────────────────────────────────────────
// Several seeds hoist the long congress.gov and Clerk URLs into the DO block's
// DECLARE section — `HR471 text := 'https://…';` — and then write the VARIABLE
// into source_url. Read literally, those rows look sourceless, which would have
// silently withheld two dozen real addresses from the sitemap on a technicality
// of SQL style. So declarations are collected with their positions and resolved
// against the position that uses them: one file may declare the same name in
// several DO blocks, and the nearest declaration above the use is the live one.
const DECLARE_CONST =
  /^[ \t]*([A-Za-z_][A-Za-z_0-9]*)[ \t]+(?:CONSTANT[ \t]+)?[A-Za-z]+(?:\([^)]*\))?[ \t]*:=[ \t]*'((?:[^']|'')*)'[ \t]*;/gm;

function declarations(src) {
  const out = [];
  DECLARE_CONST.lastIndex = 0;
  let m;
  while ((m = DECLARE_CONST.exec(src))) {
    out.push({ pos: m.index, name: m[1], value: m[2].replace(/''/g, "'") });
  }
  return out;
}

// A single value token → the JS value it denotes, or null for anything that is
// not a plain literal (a plpgsql variable, a cast, a function call, NULL).
function literal(tok) {
  if (tok == null) return null;
  const s = String(tok).trim();
  if (!s || /^null$/i.test(s)) return null;
  if (s.startsWith("'")) {
    const end = s.lastIndexOf("'");
    if (end <= 0) return null;
    return s.slice(1, end).replace(/''/g, "'");
  }
  if (/^-?\d+$/.test(s)) return s;
  return null;
}

// literal(), then the DECLARE constants above it in the same file.
function valueAt(tok, decls, pos) {
  const direct = literal(tok);
  if (direct != null) return direct;
  const name = String(tok == null ? "" : tok).trim();
  if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(name)) return null;
  let best = null;
  for (const d of decls) {
    if (d.pos > pos) break;
    if (d.name === name) best = d.value;
  }
  return best;
}

// external_ids arrives two ways — a jsonb literal ('{"utahSession":"2025GS"}')
// and jsonb_build_object('utahSession', '2025GS', …). The state session is read
// out of either, from the same key getMeasureRef() resolves a state sitting on.
function sessionOf(expr) {
  const s = String(expr == null ? "" : expr);
  const built = /'utahSession'\s*,\s*'([^']+)'/.exec(s);
  if (built) return built[1].trim().toUpperCase();
  const json = /"utahSession"\s*:\s*"([^"]+)"/.exec(s);
  if (json) return json[1].trim().toUpperCase();
  return "";
}

// A title that is really a placeholder. The ingest labels a measure it met
// through a vote with the roll-call number it saw, and migration
// 20260726160000 exists to replace nineteen of exactly these; a row still
// wearing one has not been identified yet, so it is not content.
const PLACEHOLDER_TITLE = /^(?:roll\s*call|vote)\s*(?:no\.?|#)?\s*\d+/i;

function realTitle(title, number) {
  const t = String(title == null ? "" : title).trim();
  if (!t) return false;
  if (PLACEHOLDER_TITLE.test(t)) return false;
  // A "title" that only repeats the number says nothing the address did not.
  if (t.toLowerCase() === String(number || "").trim().toLowerCase()) return false;
  return true;
}

// The sitting: a congress for a federal row, the recorded session for a state
// one. Same two-source rule getMeasureRef() resolves an address against.
function sittingOf(congress, extIds) {
  const c = literal(congress);
  if (c != null && /^\d+$/.test(c)) return c;
  return sessionOf(extIds) || "";
}

const key = (sitting, number) => `${sitting}|${number}`;

// ── the scan ────────────────────────────────────────────────────────────────
// One linear pass per file over five events, in the order they appear, because
// that order is the only thing that links a child row to its parent. These files
// are plpgsql: a measure insert ends `RETURNING id INTO m_id`, and the mapping,
// roll call and committee positions that belong to it are inserted a few lines
// later against `m_id`. A file may rebind the same variable name dozens of times
// (the Utah waves use `m_id` for every bill in the session), so the binding is
// tracked as it moves rather than collected up front.
const EVENT = new RegExp(
  [
    // 1: INSERT INTO <table> — the paren group that follows is the column list
    String.raw`INSERT\s+INTO\s+(vr_measures|vr_measure_issues|vr_rollcalls|vr_positions)\s*(?=\()`,
    // 2: RETURNING id INTO <var>
    String.raw`RETURNING\s+id\s+INTO\s+([a-zA-Z_][a-zA-Z_0-9]*)`,
    // 3: SELECT id INTO <var> … ;  (4: the rest of that statement)
    String.raw`SELECT\s+id\s+INTO\s+([a-zA-Z_][a-zA-Z_0-9]*)([\s\S]{0,600}?);`,
    // 5: UPDATE vr_measures … ;  (6: the rest of that statement)
    String.raw`UPDATE\s+vr_measures\b([\s\S]{0,2000}?);`,
  ].join("|"),
  "gi"
);

// ── the corrections a later migration made to the mapping table ─────────────
// `issueKeys` above is every key ever INSERTED for a measure, and that is all the
// address floor and the issue files have ever needed: "was this measure mapped",
// "does this key have a record". The bill document asks a narrower question —
// WHICH issues is this measure mapped to now — and the answer is not the inserts.
// Later migrations re-key mappings (20260904000000 moved every gov_regulation row
// that was really about review time onto permitting_reform) and delete them
// (20260725010000 dropped eight confirmations from "Balance the Budget"). A
// document listing the inserted keys would print the very filings those
// migrations exist to withdraw.
//
// So every UPDATE … SET issue_key and every DELETE FROM vr_measure_issues is
// replayed against `issues`, in applied order, at its position in its file. A
// statement that changes neither (a rationale rewrite, a primary flag) is not a
// mapping change and is skipped. One that does, and whose measure or key this
// reader cannot resolve, is never guessed at: it is counted in
// stats.unresolvedCorrections, and gen-bill-docs.mjs refuses to write while that
// count is not zero.

// Quote contents blanked to spaces, same length, so structure (WHERE, parens,
// semicolons) is searched without prose inside a rationale matching it.
function masked(s) {
  let out = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === "'") {
        if (s[i + 1] === "'") { out += "  "; i++; continue; }
        quoted = false; out += c; continue;
      }
      out += c === "\n" ? "\n" : " ";
      continue;
    }
    if (c === "'") quoted = true;
    out += c;
  }
  return out;
}

// `--` line comments blanked to spaces, same length. The prose in them carries
// apostrophes ("the bill's") that would otherwise open a quote the SQL never did.
function uncomment(s) {
  let out = "", quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === "'") { if (s[i + 1] === "'") { out += "''"; i++; continue; } quoted = false; }
      out += c;
      continue;
    }
    if (c === "'") { quoted = true; out += c; continue; }
    if (c === "-" && s[i + 1] === "-") {
      while (i < s.length && s[i] !== "\n") { out += " "; i++; }
      if (i < s.length) out += "\n";
      continue;
    }
    out += c;
  }
  return out;
}

// Paren depth at each index of a masked string.
function depths(mk) {
  const d = new Array(mk.length);
  let n = 0;
  for (let i = 0; i < mk.length; i++) {
    if (mk[i] === "(") { d[i] = n; n++; continue; }
    if (mk[i] === ")") { n--; d[i] = n; continue; }
    d[i] = n;
  }
  return d;
}

// The first `<re>` in src[from, to) at paren depth `depth`, as a match on the
// ORIGINAL text (so literals survive) — or null.
function topLevel(src, mk, dep, re, from, to, depth) {
  const g = new RegExp(re.source, "gi");
  g.lastIndex = from;
  let m;
  while ((m = g.exec(mk)) && m.index < to) {
    if (dep[m.index] === depth) {
      const o = new RegExp(re.source, "iy");
      o.lastIndex = m.index;
      return o.exec(src);
    }
  }
  return null;
}

// Which measures a `SELECT id FROM vr_measures [alias] WHERE …` names. Returns a
// predicate over projected rows, or null when the clause says something this
// reader does not model (so the caller can refuse rather than guess).
function measureFilter(clause) {
  const s = String(clause || "");
  const conds = [];
  const pairs = /\(\s*(?:\w+\.)?number\s*,\s*(?:\w+\.)?congress\s*\)\s*IN\s*\(([\s\S]*)\)/i.exec(s);
  if (pairs) {
    const want = new Set();
    for (const t of pairs[1].matchAll(/\(\s*'((?:[^']|'')*)'\s*,\s*(\d+)\s*\)/g)) want.add(key(t[2], t[1].replace(/''/g, "'")));
    if (!want.size) return null;
    conds.push((r) => want.has(key(r.sitting, r.number)));
  } else {
    const inList = /\b(?:\w+\.)?number\s+IN\s*\(([^)]*)\)/i.exec(s);
    const one = /\b(?:\w+\.)?number\s*=\s*'((?:[^']|'')*)'/i.exec(s);
    if (inList) {
      const want = new Set([...inList[1].matchAll(/'((?:[^']|'')*)'/g)].map((x) => x[1].replace(/''/g, "'")));
      conds.push((r) => want.has(r.number));
    } else if (one) {
      const n = one[1].replace(/''/g, "'");
      conds.push((r) => r.number === n);
    } else return null;
    const cong = /\b(?:\w+\.)?congress\s*=\s*(\d+)/i.exec(s);
    if (cong) conds.push((r) => r.sitting === cong[1]);
  }
  const type = /\b(?:\w+\.)?measure_type\s*=\s*'([^']*)'/i.exec(s);
  if (type) conds.push((r) => r.measureType === type[1]);
  return (r) => conds.every((c) => c(r));
}

// One UPDATE/DELETE on vr_measure_issues, read into
//   { kind: "skip" }                                   — changes no key
//   { kind: "delete"|"rekey", from, to, scope }        — scope: "all" | { var } | { filter }
//   { kind: "unresolved", why }
// `local` maps a plpgsql variable bound inside a VALUES loop to its filter.
function readCorrection(stmt, local) {
  const mk = masked(stmt);
  const dep = depths(mk);
  const isDelete = /^\s*DELETE\b/i.test(mk);
  const whereAt = topLevel(stmt, mk, dep, /\bWHERE\b/, 0, mk.length, 0);
  const wFrom = whereAt ? whereAt.index : mk.length;
  let to = null;
  if (!isDelete) {
    const set = topLevel(stmt, mk, dep, /\b(?:\w+\.)?issue_key\s*=\s*('(?:[^']|'')*'|[A-Za-z_][\w.]*)/, 0, wFrom, 0);
    if (!set) return { kind: "skip" };
    to = literal(set[1]);
    if (to == null) return { kind: "unresolved", why: "SET issue_key to a value this reader cannot resolve" };
  }
  if (!whereAt) return isDelete ? { kind: "unresolved", why: "DELETE with no WHERE" } : { kind: "unresolved", why: "re-key with no WHERE" };
  const from0 = topLevel(stmt, mk, dep, /\b(?:\w+\.)?issue_key\s*=\s*('(?:[^']|'')*'|[A-Za-z_][\w.]*)/, wFrom, mk.length, 0);
  const from = from0 ? literal(from0[1]) : null;
  if (from0 && from == null) return { kind: "unresolved", why: "WHERE issue_key names a value this reader cannot resolve" };

  let scope = "all";
  const byVar = topLevel(stmt, mk, dep, /\b(?:\w+\.)?measure_id\s*=\s*([A-Za-z_]\w*)\b(?!\s*\.)/, wFrom, mk.length, 0);
  const bySub = topLevel(stmt, mk, dep, /\b(?:\w+\.)?measure_id\s+IN\s*\(/, wFrom, mk.length, 0);
  if (bySub) {
    const [inner] = readGroup(stmt, bySub.index + bySub[0].length - 1);
    if (inner == null || !/^\s*SELECT\s+id\s+FROM\s+vr_measures\b/i.test(inner)) return { kind: "unresolved", why: "measure_id IN (…) is not a vr_measures lookup" };
    const f = measureFilter(inner.replace(/^\s*SELECT\s+id\s+FROM\s+vr_measures\b(?:\s+\w+)?\s+WHERE\b/i, ""));
    if (!f) return { kind: "unresolved", why: "the vr_measures lookup names no number this reader models" };
    scope = { filter: f };
  } else if (byVar) {
    scope = local && local.has(byVar[1]) ? { filter: local.get(byVar[1]) } : { var: byVar[1] };
  } else if (/\b(?:measure_id|id)\b/i.test(mk.slice(wFrom).replace(/\(\s*SELECT[\s\S]*$/i, ""))) {
    return { kind: "unresolved", why: "a measure scope this reader does not model" };
  }
  if (isDelete) {
    if (!from && scope === "all") return { kind: "unresolved", why: "DELETE of every mapping" };
    return { kind: "delete", from, scope };
  }
  if (!from) return { kind: "unresolved", why: "re-key that names no key it moves from" };
  return { kind: "rekey", from, to, scope };
}

// Every mapping correction in one file, with its position. A `FOR r IN SELECT *
// FROM (VALUES …) AS t(cols) LOOP … END LOOP` is expanded once per tuple, with
// r.<col> replaced by the tuple's token and a `SELECT id INTO <v> FROM
// vr_measures WHERE …` in the body bound to the measure it names.
const CORRECTION = /\b(?:UPDATE\s+vr_measure_issues|DELETE\s+FROM\s+vr_measure_issues)\b/gi;
function statementAt(src, mk, at) {
  const end = mk.indexOf(";", at);
  return src.slice(at, end === -1 ? src.length : end);
}
function corrections(raw) {
  const src = uncomment(raw);
  const mk = masked(src);
  const out = [];
  const spans = [];
  const LOOP = /\bFOR\s+([A-Za-z_]\w*)\s+IN\s+SELECT\s+\*\s+FROM\s*\(\s*VALUES\b/gi;
  let m;
  while ((m = LOOP.exec(mk))) {
    const open = mk.lastIndexOf("(", m.index + m[0].length);
    const [inner, after] = readGroup(src, open);
    if (inner == null) continue;
    const alias = /^\s*AS\s+\w+\s*\(([^)]*)\)\s*LOOP\b/i.exec(mk.slice(after));
    if (!alias) continue;
    const cols = alias[1].split(",").map((c) => c.trim().toLowerCase());
    const bodyAt = after + alias[0].length;
    const endAt = mk.slice(bodyAt).search(/\bEND\s+LOOP\b/i);
    if (endAt === -1) continue;
    const body = src.slice(bodyAt, bodyAt + endAt);
    spans.push([m.index, bodyAt + endAt]);
    if (!masked(body).match(CORRECTION)) continue;
    const tuplesSrc = inner.replace(/^\s*VALUES\s*/i, "");
    let at = 0;
    const tuples = [];
    while (at < tuplesSrc.length) {
      const open2 = masked(tuplesSrc).indexOf("(", at);
      if (open2 === -1) break;
      const [t, a2] = readGroup(tuplesSrc, open2);
      if (t == null) break;
      tuples.push(splitList(t));
      at = a2;
    }
    const rv = new RegExp(`\\b${m[1]}\\.(\\w+)\\b`, "g");
    for (const t of tuples) {
      const bound = body.replace(rv, (all, c) => {
        const i = cols.indexOf(c.toLowerCase());
        return i === -1 ? all : t[i];
      });
      const bmk = masked(bound);
      const local = new Map();
      for (const s of bound.matchAll(/\bSELECT\s+id\s+INTO\s+([A-Za-z_]\w*)\s+FROM\s+vr_measures\b(?:\s+\w+)?\s+WHERE\b([^;]*);/gi)) {
        const f = measureFilter(s[2]);
        if (f) local.set(s[1], f);
      }
      CORRECTION.lastIndex = 0;
      let c;
      while ((c = CORRECTION.exec(bmk))) out.push({ pos: m.index, op: readCorrection(statementAt(bound, bmk, c.index), local) });
    }
  }
  CORRECTION.lastIndex = 0;
  while ((m = CORRECTION.exec(mk))) {
    if (spans.some(([a, b]) => m.index >= a && m.index < b)) continue;
    out.push({ pos: m.index, op: readCorrection(statementAt(src, mk, m.index), null) });
  }
  return out.sort((a, b) => a.pos - b.pos);
}

// The (number, sitting) a WHERE clause names, when it names one literally.
function whereKey(clause) {
  const s = String(clause || "");
  const num = /\bnumber\s*=\s*'((?:[^']|'')*)'/i.exec(s);
  if (!num) return null;
  const number = num[1].replace(/''/g, "'");
  const cong = /\bcongress\s*=\s*(\d+)/i.exec(s);
  const sess = /utahSession'\s*=\s*'([^']+)'/i.exec(s);
  const sitting = cong ? cong[1] : sess ? sess[1].trim().toUpperCase() : "";
  return { number, sitting };
}

export function measureAddresses(ROOT) {
  const dir = join(ROOT, ...MIGRATIONS);
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  // sitting|number → row. Insertion order is applied order, which is the order
  // the archive itself was built in.
  const rows = new Map();
  const stats = { files: 0, inserts: 0, unparsed: 0, renames: 0, mappings: 0, acts: 0, corrections: 0, unresolvedCorrections: [] };
  // Every issue key the migrations map at least one measure to, in no particular
  // order and with no weight, side or count attached. It is a membership set and
  // nothing more — "this key has a formal record somewhere on file".
  const issueKeys = new Set();

  const touch = (k, patch) => {
    const r = rows.get(k);
    if (!r) return null;
    Object.assign(r, patch);
    return r;
  };

  for (const file of files) {
    const src = readFileSync(join(dir, file), "utf8");
    // A file that only corrects mappings (the orphan-key repair names no
    // vr_measures at all) is still read, for its corrections and nothing else.
    if (!src.includes("vr_measures") && !src.includes("vr_measure_issues")) continue;
    stats.files++;

    const decls = declarations(src);
    const bound = new Map(); // plpgsql variable → row key
    let lastKey = null;      // the measure this file inserted most recently

    // The mapping corrections in this file, replayed against `issues` as the walk
    // passes their position — so a correction sees exactly the rows and the
    // variable bindings the database saw when it ran.
    const pending = src.includes("vr_measure_issues") ? corrections(src) : [];
    const flush = (upTo) => {
      while (pending.length && pending[0].pos < upTo) {
        const { op } = pending.shift();
        if (op.kind === "skip") continue;
        if (op.kind === "unresolved") { stats.unresolvedCorrections.push({ file, why: op.why }); continue; }
        let targets;
        if (op.scope === "all") targets = [...rows.values()];
        else if (op.scope.var) {
          const k = bound.get(op.scope.var);
          if (!k) { stats.unresolvedCorrections.push({ file, why: `measure_id = ${op.scope.var}, a variable this file never bound` }); continue; }
          targets = rows.has(k) ? [rows.get(k)] : [];
        } else targets = [...rows.values()].filter(op.scope.filter);
        for (const r of targets) {
          if (op.kind === "delete") {
            if (op.from ? r.issues.delete(op.from) : (r.issues.size && (r.issues.clear(), true))) stats.corrections++;
          } else if (r.issues.has(op.from) && !r.issues.has(op.to)) {
            // A move onto a key the measure already holds is what the NOT EXISTS
            // guards in these files refuse; the old row stays where it was.
            r.issues.delete(op.from); r.issues.add(op.to); stats.corrections++;
          }
        }
      }
    };

    EVENT.lastIndex = 0;
    let m;
    while ((m = EVENT.exec(src))) {
      flush(m.index);
      // ── INSERT INTO <table> (cols) VALUES (…), (…) ───────────────────────
      if (m[1]) {
        const table = m[1].toLowerCase();
        const [colsRaw, afterCols] = readGroup(src, m.index + m[0].length);
        if (colsRaw == null) { stats.unparsed++; continue; }
        const cols = splitList(colsRaw).map((c) => c.trim().toLowerCase());
        const values = /^\s*VALUES\s*/i.exec(src.slice(afterCols));
        // `INSERT … SELECT …` carries no literal tuple; nothing to read.
        if (!values) { stats.unparsed++; continue; }

        let at = afterCols + values[0].length;
        const tuples = [];
        while (src[at] === "(") {
          const [inner, after] = readGroup(src, at);
          if (inner == null) break;
          tuples.push(splitList(inner));
          at = after;
          const comma = /^\s*,\s*/.exec(src.slice(at));
          if (!comma) break;
          at += comma[0].length;
        }
        if (!tuples.length) { stats.unparsed++; continue; }
        const col = (tuple, name) => {
          const i = cols.indexOf(name);
          return i === -1 ? undefined : tuple[i];
        };

        if (table === "vr_measures") {
          for (const t of tuples) {
            stats.inserts++;
            const number = literal(col(t, "number"));
            const ext = col(t, "external_ids");
            const sitting = sittingOf(col(t, "congress"), ext);
            const title = literal(col(t, "title"));
            const k = key(sitting, number);
            lastKey = number ? k : null;
            if (!number) continue;
            if (!rows.has(k)) {
              rows.set(k, {
                sitting,
                number,
                chamber: literal(col(t, "chamber")) || "",
                measureType: literal(col(t, "measure_type")) || "",
                title: title || "",
                source: valueAt(col(t, "source_url"), decls, m.index) || "",
                mappings: 0,
                acts: 0,
                issueKeys: [],
                issues: new Set(),
                files: [file],
              });
            } else {
              // A later migration re-stating a row it guards with NOT EXISTS is a
              // no-op against the database, and must be one here too — except
              // where it fills a gap the first insert left.
              const r = rows.get(k);
              if (!r.title && title) r.title = title;
              if (!r.source) r.source = valueAt(col(t, "source_url"), decls, m.index) || "";
              if (r.files.indexOf(file) === -1) r.files.push(file);
            }
          }
          continue;
        }

        // ── a child row: mapping, roll call, or committee position ──────────
        // Which measure it belongs to is written in its measure_id column: a
        // bound variable, a literal id (nothing to resolve — skipped), or an
        // inline `(SELECT id FROM vr_measures WHERE …)`.
        for (const t of tuples) {
          const ref = String(col(t, "measure_id") || "").trim();
          let k = null;
          if (/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(ref)) k = bound.get(ref) || null;
          else if (ref.startsWith("(")) {
            const w = whereKey(ref);
            if (w) k = key(w.sitting, w.number);
          }
          if (!k) k = null;
          if (!k || !rows.has(k)) continue;
          const r = rows.get(k);
          if (table === "vr_measure_issues") {
            r.mappings++; stats.mappings++;
            // WHICH KEY, NOT JUST HOW MANY. The count above answers "does this
            // measure open onto anything", which is all the bill address needed.
            // The issue file at /i/<key> asks the same question from the other
            // end — "does this KEY have a formal record on file" — and the answer
            // is in the same tuples, so it is read here rather than by a second
            // walk of the same 200 migrations. Literals only: a mapping whose
            // issue_key is a bound variable is not resolved, and an unresolved
            // key must never become a published address.
            const ik = literal(col(t, "issue_key"));
            if (ik) { issueKeys.add(ik); r.issueKeys.push(ik); r.issues.add(ik); }
          }
          else { r.acts++; stats.acts++; }
        }
        continue;
      }

      // ── RETURNING id INTO <var> ──────────────────────────────────────────
      if (m[2]) {
        if (lastKey) bound.set(m[2], lastKey);
        continue;
      }

      // ── SELECT id INTO <var> … FROM vr_measures WHERE … ──────────────────
      // How every later wave reaches a measure an earlier migration inserted.
      if (m[3]) {
        const clause = m[4] || "";
        if (!/vr_measures/i.test(clause)) continue;
        const w = whereKey(clause);
        if (w) {
          const k = key(w.sitting, w.number);
          bound.set(m[3], k);
          if (rows.has(k)) lastKey = k;
        }
        continue;
      }

      // ── UPDATE vr_measures … ────────────────────────────────────────────
      // Only one kind of update can move an address: one that rewrites `number`.
      // Everything else (a title backfill, a status change, a parent_id) leaves
      // the address where it was and is deliberately not replayed here.
      if (m[5] != null) {
        const stmt = m[5];
        const set = /\bSET\s+number\s*=\s*'((?:[^']|'')*)'/i.exec(stmt);
        if (!set) continue;
        const to = set[1].replace(/''/g, "'");
        // Which row: named literally in the WHERE, or reached through a variable
        // this file already bound.
        const w = whereKey(stmt.replace(/\bSET\b[\s\S]*?\bWHERE\b/i, " WHERE "));
        let from = w ? key(w.sitting, w.number) : null;
        if (!from || !rows.has(from)) {
          const viaVar = /\bWHERE\s+id\s*=\s*([a-zA-Z_][a-zA-Z_0-9]*)/i.exec(stmt);
          if (viaVar) from = bound.get(viaVar[1]) || null;
        }
        if (!from || !rows.has(from)) continue;
        const r = rows.get(from);
        const k = key(r.sitting, to);
        if (k === from) continue;
        rows.delete(from);
        r.number = to;
        if (r.files.indexOf(file) === -1) r.files.push(file);
        rows.set(k, r);
        for (const [v, bk] of bound) if (bk === from) bound.set(v, k);
        if (lastKey === from) lastKey = k;
        stats.renames++;
      }
    }
    flush(Infinity);
  }

  // ── the floor ───────────────────────────────────────────────────────────
  const published = [];
  const refused = [];
  for (const r of rows.values()) {
    const reasons = [];
    if (!r.number) reasons.push("no-number");
    if (!r.sitting) reasons.push("no-sitting");
    if (!r.source) reasons.push("no-source");
    const titled = realTitle(r.title, r.number);
    if (!titled && !r.mappings && !r.acts) reasons.push("empty-stub");
    const rec = {
      ...r,
      titled,
      reasons,
      // What the address opens on, for the report — never for a surface.
      via: titled ? "title" : r.mappings ? "mapping" : r.acts ? "act" : "",
    };
    if (reasons.length) refused.push(rec); else published.push(rec);
  }

  // Sitting, then number, read the way a person reads a bill list: H.B. 2
  // before H.B. 10.
  published.sort((a, b) =>
    a.sitting.localeCompare(b.sitting, undefined, { numeric: true }) ||
    a.number.localeCompare(b.number, undefined, { numeric: true })
  );

  return { published, refused, stats, issueKeys: [...issueKeys].sort() };
}

// ── the address ─────────────────────────────────────────────────────────────
// /b/<sitting>/<number>, the form share-links.js parses and canonicalPath() in
// netlify/lib/share-target.ts writes: both segments percent-encoded, the number
// exactly as the row prints it. "H.R. 6644" is the identity the archive, the
// Clerk and congress.gov all agree on, so the address carries it verbatim —
// /b/119/H.R.%206644 — rather than a prettier slug the resolver would not
// recognise. getMeasureRef() matches `number` exactly; a slug is a different
// string, and a sitemap full of them would be a file of 404s.
export function billPath(addr) {
  return `/b/${encodeURIComponent(addr.sitting)}/${encodeURIComponent(addr.number)}`;
}
