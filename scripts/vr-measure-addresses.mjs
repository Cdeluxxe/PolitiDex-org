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
  const stats = { files: 0, inserts: 0, unparsed: 0, renames: 0, mappings: 0, acts: 0 };

  const touch = (k, patch) => {
    const r = rows.get(k);
    if (!r) return null;
    Object.assign(r, patch);
    return r;
  };

  for (const file of files) {
    const src = readFileSync(join(dir, file), "utf8");
    if (!src.includes("vr_measures")) continue;
    stats.files++;

    const decls = declarations(src);
    const bound = new Map(); // plpgsql variable → row key
    let lastKey = null;      // the measure this file inserted most recently

    EVENT.lastIndex = 0;
    let m;
    while ((m = EVENT.exec(src))) {
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
          if (table === "vr_measure_issues") { r.mappings++; stats.mappings++; }
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

  return { published, refused, stats };
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
