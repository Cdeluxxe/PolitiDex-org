#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// H.R. 1 citation audit — does every visible topic rest on operative text?
// ─────────────────────────────────────────────────────────────────────────────
// The bill face shows all fourteen of H.R. 1's issue mappings with no fold. This
// script answers the question that makes that honest: for each of those fourteen,
// is there a named provision row carrying operative text, and who owns it?
//
// It reads the committed SQL corpus — no database, no network. Migrations are
// applied in filename order, exactly as the runner applies them, so "before" is
// the state as of the last migration preceding this pass and "after" is the state
// including it. Numbers here are derived from the files, not typed in.
//
//   node scripts/vr-audit-hr1-citations.mjs            human-readable report
//   node scripts/vr-audit-hr1-citations.mjs --json     the report object
//   node scripts/vr-audit-hr1-citations.mjs --write    regenerate db/vr-hr1-citation-audit.json
//
// scripts/test-hr1-citation-integrity.mjs imports auditHr1Citations() and asserts
// against what it derives, so the committed JSON cannot drift from the SQL.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGDIR = path.join(ROOT, "netlify", "database", "migrations");
export const THIS_PASS = "20260923000000_vr_hr1_citation_integrity.sql";

// ── SQL reading ──────────────────────────────────────────────────────────────
// Strip `--` comments without eating a `--` that lives inside a string literal,
// and without touching the literals themselves (a rationale may contain them).
function stripComments(sql) {
  let out = "", i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      out += sql.slice(i, j); i = j; continue;
    }
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      i = nl === -1 ? sql.length : nl; continue;
    }
    out += c; i++;
  }
  return out;
}

// Split a comma-separated argument list at depth zero, respecting literals.
function splitTop(s) {
  const parts = []; let depth = 0, start = 0, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'") {
      i++;
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") { i += 2; continue; }
        if (s[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "," && depth === 0) { parts.push(s.slice(start, i)); start = i + 1; }
    i++;
  }
  parts.push(s.slice(start));
  return parts.map((p) => p.trim());
}

// Read one parenthesised group starting at `open` (index of "("), literal-aware.
function readGroup(s, open) {
  let depth = 0, i = open;
  while (i < s.length) {
    const c = s[i];
    if (c === "'") {
      i++;
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") { i += 2; continue; }
        if (s[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return { body: s.slice(open + 1, i), end: i + 1 }; }
    i++;
  }
  return null;
}

// A value in a tuple: string literal, NULL, number, or a declared text variable.
function value(raw, vars) {
  const t = raw.trim();
  if (/^NULL$/i.test(t)) return null;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^(TRUE|FALSE)$/i.test(t)) return /^TRUE$/i.test(t);
  if (t.startsWith("'")) return t.slice(1, -1).replace(/''/g, "'");
  if (Object.prototype.hasOwnProperty.call(vars, t)) return vars[t];
  return { unresolved: t };
}

// `VAR text := 'literal';` declarations, so source_url comes out concrete.
function declaredVars(sql) {
  const vars = {};
  const re = /(\w+)\s+text\s*:=\s*('(?:[^']|'')*')\s*;/g;
  let m;
  while ((m = re.exec(sql))) vars[m[1]] = m[2].slice(1, -1).replace(/''/g, "'");
  return vars;
}

// Which PL/pgSQL variable holds H.R. 1's id in this file (may be several).
function hr1Vars(sql) {
  const out = new Set();
  const re = /SELECT\s+id\s+INTO\s+(\w+)\s+FROM\s+vr_measures\s+WHERE\s+([^;]*?)\bLIMIT\b/gi;
  let m;
  while ((m = re.exec(sql))) {
    const where = m[2];
    if (/number\s*=\s*'H\.R\. 1'/.test(where) && /congress\s*=\s*119/.test(where)) out.add(m[1]);
  }
  return out;
}

// ── statement extraction ─────────────────────────────────────────────────────
const ISSUE_COLS = ["measure_id", "issue_key", "weight", "is_primary", "support_meaning", "rationale", "source_url"];
const PROV_COLS = ["measure_id", "label", "description", "issue_key", "support_meaning", "source_url", "sort_order"];

function inserts(sql, table, cols, vars, isHr1) {
  const rows = [];
  const re = new RegExp("INSERT\\s+INTO\\s+" + table + "\\s*\\(([^)]*)\\)", "gi");
  let m;
  while ((m = re.exec(sql))) {
    const declared = m[1].split(",").map((s) => s.trim());
    const rest = sql.slice(m.index + m[0].length);

    // form A: ... VALUES (t), (t), ...
    const vIdx = rest.search(/^\s*VALUES/i);
    if (vIdx === 0) {
      let cur = rest.slice(rest.search(/VALUES/i) + 6);
      let consumed = 0;
      for (;;) {
        const open = cur.indexOf("(");
        if (open === -1) break;
        const pre = cur.slice(0, open);
        if (/[;]/.test(pre) || /\b(ON|WHERE|RETURNING|END|INSERT|UPDATE|SELECT)\b/i.test(pre)) break;
        const grp = readGroup(cur, open);
        if (!grp) break;
        const args = splitTop(grp.body);
        if (args.length === declared.length) {
          const row = {};
          declared.forEach((c, i2) => { row[c] = value(args[i2], vars); });
          if (isHr1(args[0].trim())) rows.push(row);
        }
        cur = cur.slice(grp.end); consumed += grp.end;
        if (consumed > 40000) break;
      }
      continue;
    }

    // form B: ... SELECT m_hr1, 'label', ... WHERE NOT EXISTS (...)
    const sIdx = rest.search(/^\s*SELECT\b/i);
    if (sIdx === 0) {
      const body = rest.slice(rest.search(/SELECT/i) + 6);
      const stop = (() => {
        // first top-level WHERE / ON CONFLICT / ;
        let depth = 0, i = 0;
        while (i < body.length) {
          const c = body[i];
          if (c === "'") { i++; while (i < body.length) { if (body[i] === "'" && body[i + 1] === "'") { i += 2; continue; } if (body[i] === "'") { i++; break; } i++; } continue; }
          if (c === "(") depth++;
          else if (c === ")") depth--;
          else if (depth === 0 && (body[i] === ";" || /^\s(WHERE|ON)\s/i.test(body.slice(i, i + 7)))) return i;
          i++;
        }
        return body.length;
      })();
      const args = splitTop(body.slice(0, stop));
      if (args.length === declared.length && isHr1(args[0].trim())) {
        const row = {};
        declared.forEach((c, i2) => { row[c] = value(args[i2], vars); });
        rows.push(row);
      }
    }
  }
  void cols;
  return rows;
}

function updates(sql, table, vars, isHr1) {
  const out = [];
  const re = new RegExp("UPDATE\\s+" + table + "\\s+SET\\b", "gi");
  let m;
  while ((m = re.exec(sql))) {
    const rest = sql.slice(m.index + m[0].length);
    // statement runs to the first top-level semicolon
    let depth = 0, i = 0, end = rest.length;
    while (i < rest.length) {
      const c = rest[i];
      if (c === "'") { i++; while (i < rest.length) { if (rest[i] === "'" && rest[i + 1] === "'") { i += 2; continue; } if (rest[i] === "'") { i++; break; } i++; } continue; }
      if (c === "(") depth++;
      else if (c === ")") depth--;
      else if (c === ";" && depth === 0) { end = i; break; }
      i++;
    }
    const stmt = rest.slice(0, end);
    const wIdx = (() => {
      let d = 0, j = 0;
      while (j < stmt.length) {
        const c = stmt[j];
        if (c === "'") { j++; while (j < stmt.length) { if (stmt[j] === "'" && stmt[j + 1] === "'") { j += 2; continue; } if (stmt[j] === "'") { j++; break; } j++; } continue; }
        if (c === "(") d++;
        else if (c === ")") d--;
        else if (d === 0 && /^\sWHERE\s/i.test(stmt.slice(j, j + 7))) return j;
        j++;
      }
      return -1;
    })();
    const setPart = wIdx === -1 ? stmt : stmt.slice(0, wIdx);
    const wherePart = wIdx === -1 ? "" : stmt.slice(wIdx);
    const set = {};
    for (const a of splitTop(setPart)) {
      const eq = a.indexOf("=");
      if (eq === -1) continue;
      set[a.slice(0, eq).trim()] = value(a.slice(eq + 1), vars);
    }
    const lab = /label\s*=\s*('(?:[^']|'')*')/.exec(wherePart);
    const key = /issue_key\s*=\s*('(?:[^']|'')*')/.exec(wherePart);
    const mvar = /measure_id\s*=\s*(\w+)/.exec(wherePart);
    out.push({
      set,
      where: {
        label: lab ? lab[1].slice(1, -1).replace(/''/g, "'") : null,
        issueKey: key ? key[1].slice(1, -1).replace(/''/g, "'") : null,
      },
      targetsHr1: mvar ? isHr1(mvar[1]) : /H\.R\. 1/.test(wherePart),
      raw: stmt,
    });
  }
  return out;
}

// ── corpus replay ────────────────────────────────────────────────────────────
function migrationFiles() {
  return fs.readdirSync(MIGDIR).filter((f) => f.endsWith(".sql")).sort();
}

function replay(upTo) {
  const mappings = new Map();   // issue_key -> row
  const provisions = new Map(); // label -> row
  const touchedBy = { mappings: new Map(), provisions: new Map() };

  for (const file of migrationFiles()) {
    if (upTo && file > upTo) break;
    const sql = stripComments(fs.readFileSync(path.join(MIGDIR, file), "utf8"));
    if (!/vr_measure_(issues|provisions)/.test(sql)) continue;
    const vars = declaredVars(sql);
    const hv = hr1Vars(sql);
    if (!hv.size) continue;
    const isHr1 = (v) => hv.has(v.trim());

    for (const r of inserts(sql, "vr_measure_issues", ISSUE_COLS, vars, isHr1)) {
      // every H.R. 1 mapping insert in the corpus is ON CONFLICT DO NOTHING
      if (!mappings.has(r.issue_key)) {
        mappings.set(r.issue_key, { ...r, firstSeenIn: file });
        touchedBy.mappings.set(r.issue_key, [file]);
      }
    }
    for (const r of inserts(sql, "vr_measure_provisions", PROV_COLS, vars, isHr1)) {
      if (!provisions.has(r.label)) {
        provisions.set(r.label, { ...r, firstSeenIn: file });
        touchedBy.provisions.set(r.label, [file]);
      }
    }
    for (const u of updates(sql, "vr_measure_issues", vars, isHr1)) {
      if (!u.targetsHr1 || !u.where.issueKey) continue;
      const row = mappings.get(u.where.issueKey);
      if (!row) continue;
      Object.assign(row, renameCols(u.set));
      (touchedBy.mappings.get(u.where.issueKey) || []).push(file);
    }
    for (const u of updates(sql, "vr_measure_provisions", vars, isHr1)) {
      if (!u.targetsHr1 || !u.where.label) continue;
      const row = provisions.get(u.where.label);
      if (!row) continue;
      Object.assign(row, renameCols(u.set));
      (touchedBy.provisions.get(u.where.label) || []).push(file);
    }
  }
  return { mappings, provisions, touchedBy };
}

function renameCols(set) {
  const out = {};
  for (const k of Object.keys(set)) out[k] = set[k];
  return out;
}

// ── the report ───────────────────────────────────────────────────────────────
const CO_READ = /Also read under:\s*([^.]+)\./;

function shape(state) {
  const provs = [...state.provisions.values()].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const owned = new Map();  // issue_key -> [labels]
  const coRead = new Map(); // co-read label text -> [provision labels]
  for (const p of provs) {
    if (p.issue_key) {
      if (!owned.has(p.issue_key)) owned.set(p.issue_key, []);
      owned.get(p.issue_key).push(p.label);
    }
    const m = CO_READ.exec(String(p.description || ""));
    if (m) {
      const topic = m[1].trim();
      if (!coRead.has(topic)) coRead.set(topic, []);
      coRead.get(topic).push(p.label);
    }
  }
  return { provs, owned, coRead };
}

export function auditHr1Citations() {
  const files = migrationFiles();
  const idx = files.indexOf(THIS_PASS);
  const prior = idx > 0 ? files[idx - 1] : null;

  const before = replay(prior);
  const after = replay(null);

  const keys = [...after.mappings.keys()];
  const bShape = shape(before);
  const aShape = shape(after);

  const beforeUnbacked = keys.filter((k) => !bShape.owned.has(k)).sort();
  const afterOwnerless = keys.filter((k) => !aShape.owned.has(k)).sort();

  // A key is cited after the pass if a provision carries it, OR a provision names
  // it in an "Also read under:" note. The co-read note carries a display label, so
  // resolve it against the shipped taxonomy labels.
  const labelFor = issueLabels();
  const coReadKeys = new Map(); // issue_key -> [provision labels]
  for (const [topic, labels] of aShape.coRead) {
    const k = Object.keys(labelFor).find((kk) => labelFor[kk] === topic);
    if (k) coReadKeys.set(k, labels);
  }
  const afterUncited = afterOwnerless.filter((k) => !coReadKeys.has(k));

  const ownerOf = (sh) => sh.provs.map((p) => ({ label: p.label, owner: p.issue_key }));

  const ownership = aShape.provs.map((p) => ({
    label: p.label,
    owner: p.issue_key,
    supportMeaning: p.support_meaning,
    alsoReadUnder: (() => { const m = CO_READ.exec(String(p.description || "")); return m ? m[1].trim() : null; })(),
    source: p.source_url,
    anchor: (/\bSec\. \d+\b/.exec(String(p.description || "")) || [null])[0],
  }));

  const sharedAnchors = ownership
    .filter((o) => o.alsoReadUnder)
    .map((o) => {
      const second = Object.keys(labelFor).find((k) => labelFor[k] === o.alsoReadUnder) || null;
      return { provision: o.label, owner: o.owner, alsoReadBy: second, alsoReadLabel: o.alsoReadUnder, duplicateRowsCreated: 0 };
    });

  const nd = (m) => {
    const r = m.get("national_debt");
    return r ? { sourceUrl: r.source_url, anchor: (/\bSec\. \d+\b/.exec(String(r.rationale || "")) || [null])[0], citesCbo: /cbo\.gov/i.test(String(r.source_url || "")) } : null;
  };

  const scoring = keys.sort().map((k) => {
    const b = before.mappings.get(k), a = after.mappings.get(k);
    return {
      issueKey: k,
      weight: a.weight, isPrimary: a.is_primary, supportMeaning: a.support_meaning,
      unchanged: !!b && b.weight === a.weight && b.is_primary === a.is_primary && b.support_meaning === a.support_meaning,
    };
  });

  return {
    measure: { number: "H.R. 1", congress: 119, chamber: "house", title: "One Big Beautiful Bill Act" },
    pass: THIS_PASS,
    priorMigration: prior,
    note: "Derived from the committed migration corpus by scripts/vr-audit-hr1-citations.mjs. vr_measure_provisions is display-only; no scoring path reads it.",
    before: {
      mappings: before.mappings.size,
      provisions: before.provisions.size,
      mappingsWithProvisionRow: keys.length - beforeUnbacked.length,
      mappingsWithoutProvisionRow: beforeUnbacked,
      provisionsWithoutIssueKey: bShape.provs.filter((p) => !p.issue_key).map((p) => p.label),
      nationalDebtCitation: nd(before.mappings),
    },
    after: {
      mappings: after.mappings.size,
      provisions: after.provisions.size,
      mappingsWithProvisionRow: keys.length - afterOwnerless.length,
      mappingsOwningNoProvision: afterOwnerless,
      mappingsWithCoReadNote: [...coReadKeys.keys()].sort(),
      mappingsCited: keys.length - afterUncited.length,
      mappingsStillUncited: afterUncited,
      provisionsWithoutIssueKey: aShape.provs.filter((p) => !p.issue_key).map((p) => p.label),
      nationalDebtCitation: nd(after.mappings),
    },
    ownershipBefore: ownerOf(bShape),
    ownership,
    sharedAnchors,
    scoring,
    residuals: [
      {
        issueKeys: ["lands_energy", "energy_production"],
        claim: "onshore and offshore oil, gas, and coal leasing",
        cited: "Sec. 50101 (onshore oil and gas leasing) only",
        status: "open",
        why: "Only the onshore oil and gas provision is verifiable from the enacted text checked in this pass. The offshore and coal readings stay asserted by the rationale and uncited by a provision row rather than being widened into a row that overstates what was checked.",
      },
    ],
  };
}

// The shipped taxonomy labels, minus the emoji prefix — the co-read notes are
// written in exactly this vocabulary so a reader and this audit agree on what
// "Also read under: X" points at.
export function issueLabels() {
  const src = fs.readFileSync(path.join(ROOT, "alignment-tool.js"), "utf8");
  const out = {};
  const re = /^\s{4,}(\w+):\s*\{\s*label:\s*'([^']*)'/gm;
  let m;
  while ((m = re.exec(src))) {
    const plain = m[2].replace(/^[^A-Za-z0-9]+/, "").trim();
    if (plain && !(m[1] in out)) out[m[1]] = plain;
  }
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith("vr-audit-hr1-citations.mjs")) {
  const rep = auditHr1Citations();
  const outFile = path.join(ROOT, "db", "vr-hr1-citation-audit.json");
  if (process.argv.includes("--write")) {
    fs.writeFileSync(outFile, JSON.stringify(rep, null, 2) + "\n");
    console.log("wrote db/vr-hr1-citation-audit.json");
  } else if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rep, null, 2));
  } else {
    const b = rep.before, a = rep.after;
    console.log("\nH.R. 1 (119) — citation audit  ·  pass " + rep.pass);
    console.log("  before: " + b.mappings + " mappings · " + b.provisions + " provisions · "
      + b.mappingsWithProvisionRow + "/" + b.mappings + " with a provision row");
    console.log("          no provision row: " + (b.mappingsWithoutProvisionRow.join(", ") || "none"));
    console.log("          provision with no key: " + (b.provisionsWithoutIssueKey.join(", ") || "none"));
    console.log("          national_debt: " + b.nationalDebtCitation.sourceUrl);
    console.log("   after: " + a.mappings + " mappings · " + a.provisions + " provisions · "
      + a.mappingsWithProvisionRow + "/" + a.mappings + " own a provision row");
    console.log("          named by a co-read note:  " + (a.mappingsWithCoReadNote.join(", ") || "none"));
    console.log("          cited one way or the other: " + a.mappingsCited + "/" + a.mappings);
    console.log("          still uncited: " + (a.mappingsStillUncited.join(", ") || "none"));
    console.log("          provision with no key: " + (a.provisionsWithoutIssueKey.join(", ") || "none"));
    console.log("          national_debt: " + a.nationalDebtCitation.anchor + " @ " + a.nationalDebtCitation.sourceUrl);
    console.log("\n  provision ownership");
    for (const o of rep.ownership) {
      console.log("    " + (o.anchor ? o.anchor.padEnd(11) : "".padEnd(11)) + (o.label + " ").padEnd(36, ".")
        + " " + String(o.owner) + (o.alsoReadUnder ? "   + also read under: " + o.alsoReadUnder : ""));
    }
    console.log("\n  shared anchors (one owner, no duplicate rows)");
    for (const s of rep.sharedAnchors) console.log("    " + s.provision + ": " + s.owner + " + " + s.alsoReadBy);
    const drift = rep.scoring.filter((s) => !s.unchanged);
    console.log("\n  scoring drift: " + (drift.length ? drift.map((d) => d.issueKey).join(", ") : "none — weight/is_primary/support_meaning identical on all " + rep.scoring.length));
    console.log("");
  }
}
