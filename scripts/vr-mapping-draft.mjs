#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-mapping-draft — the curator's drafting bench for measure → issue mappings
// ─────────────────────────────────────────────────────────────────────────────
// THE BOTTLENECK THIS EXISTS FOR. Ingesting roll calls is mechanical and already
// automated. What is not automated, and must not be, is the judgement in the
// middle: which ISSUE_MAP keys a measure belongs on, which way a yea cuts on each
// of them, and how much of the bill each key actually represents. Every one of
// those is a sentence about a politician's convictions, and db/vr-ingest-runbook.md
// has twenty-four numbered rules because each of them was learned by getting one
// wrong. So the slow part of a mapping pass is not typing — it is reading the text,
// running the checks, and writing the rationale.
//
// WHAT THIS TOOL DOES, AND THE LINE IT WILL NOT CROSS. It does the typing and it
// runs the checklist. It proposes candidate keys from the shipped keyword
// vocabulary, names which keyword fired and where, states the runbook rule that
// applies to each candidate, prints the backwards read (rule 22) as a question the
// curator has to answer in words, and emits two artifacts pre-filled with
// everything except the judgements: a db/vr-issue-seed.json fragment and a
// migration SKELETON.
//
// IT DECIDES NOTHING. Every emitted candidate carries decision:"UNDECIDED",
// supportMeaning:null, weight:null and isPrimary:null. There is no default
// direction — netlify/lib/vr-ingest.ts's optional title classifier writes
// "yea_supports" as a placeholder and is off by default for exactly this reason,
// and a placeholder direction is the one field a hurried curator would leave
// standing. A row this tool emits cannot be applied: the seed fragment is not
// db/vr-issue-seed.json, and the SQL is written to `.sql.draft`, which the
// platform's migration runner does not read. The tool REFUSES to write anywhere
// under netlify/database/migrations/ or db/ at all.
//
// ONE FAMILY, WITH THE DOOR LEFT OPEN. Only the `bill` family is implemented —
// 63 of the 110 measures already in db/vr-issue-seed.json. `amendment` and
// `resolution` are declared in FAMILIES with the runbook rule that blocks them and
// are refused rather than guessed at, because for those two the rule IS the
// blocker: an amendment arrives with its purpose line truncated (rule 4) and a
// "Providing for consideration of…" resolution is floor procedure whipped on party
// lines (rule 2). Adding a family is one FAMILIES entry plus its checks.
//
// USAGE
//   # a measure already in the corpus — its title comes from the seed
//   node scripts/vr-mapping-draft.mjs --measure "H.R. 1" --congress 119
//
//   # a new measure, title (and optionally enrolled text) supplied
//   node scripts/vr-mapping-draft.mjs --number "H.R. 9311" --congress 119 \
//        --chamber house --title "Fix Our Forests Act" --text /tmp/hr9311.txt
//
//   # the same checklist over a mapping that already exists, unanswered
//   node scripts/vr-mapping-draft.mjs --audit "H.R. 1" --congress 119
//
//   # write the two draft artifacts somewhere a human can edit them
//   node scripts/vr-mapping-draft.mjs --measure "H.R. 1" --out /tmp/drafts
//
//   --json     machine-readable draft on stdout instead of the report
//   --margin   "363-46", so the unanimity check (rule 11) can run
//   --limit N  cap the candidate list (default 12)
//
// No database, no network. Reads db/issue-keys.json, db/vr-issue-seed.json and
// alignment-tool.js only.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve as pathResolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

// ── The shipped vocabulary ───────────────────────────────────────────────────
const KEYS = JSON.parse(R("db/issue-keys.json"));
const SEED = JSON.parse(R("db/vr-issue-seed.json"));
const ISSUE_KEYS = new Set(KEYS.keys);
const KEYWORDS = KEYS.keywords || {};

// Issue labels, read off ISSUE_MAP in alignment-tool.js. The backwards read has to
// be printed in the words a reader would see on the chip, not as a bare key — the
// whole point of the check is that a curator says the sentence out loud.
function issueLabels() {
  const out = {};
  try {
    const src = R("alignment-tool.js");
    const re = /(['"]?)([a-z0-9_]+)\1\s*:\s*\{[^}]*?label\s*:\s*(['"])((?:\\.|(?!\3).)*)\3/g;
    let m;
    while ((m = re.exec(src))) {
      if (ISSUE_KEYS.has(m[2]) && !out[m[2]]) out[m[2]] = m[4];
    }
  } catch {}
  return out;
}
const LABELS = issueLabels();
const labelOf = (k) => LABELS[k] || k;

// ── Measure families — THE EXTENSION POINT ───────────────────────────────────
// Adding a family means adding an entry here plus whatever family-specific checks
// belong in CHECKS. `implemented:false` is a refusal with a reason, not a stub: the
// tool exits rather than drafting, because for both unimplemented families the
// runbook rule that blocks them blocks the DRAFT and not just the decision.
const FAMILIES = {
  bill: {
    implemented: true,
    label: "Bill",
    match: (n) => /^(H\.R\.|S\.)\s*\d+$/i.test(String(n).trim()),
    note:
      "A bill's own title and enrolled text carry its direction, so a candidate key " +
      "can be proposed from them and decided by reading the sections it names.",
  },
  amendment: {
    implemented: false,
    label: "Amendment",
    match: (n) => /^(H|S)\.Amdt\.\s*\d+$/i.test(String(n).trim()),
    blockedBy:
      "runbook rule 4 — a truncated purpose line is not a mappable purpose. The " +
      "Congress.gov vote feed cuts an amendment's purpose off mid-clause, and when the " +
      "missing words carry the DIRECTION (which way a deadline moves, which way a " +
      "threshold goes) the amendment is not mappable from the line alone. Read the struck " +
      "section in the reported bill text and map from that, by hand.",
  },
  resolution: {
    implemented: false,
    label: "Resolution",
    match: (n) => /^(H|S)\.(J\.|Con\.)?Res\.\s*\d+$/i.test(String(n).trim()),
    blockedBy:
      "runbook rule 2 — rules are not policy. A 'Providing for consideration of…' " +
      "resolution is a floor-procedure vote whipped on party lines, and mapping one reads " +
      "party discipline as conviction. Simple and concurrent resolutions are also " +
      "non-binding. A joint resolution CAN be substantive (a CRA disapproval, an arms-sale " +
      "disapproval under rule 12) — draft those by hand against the underlying rule.",
  },
};

function familyOf(number) {
  for (const [key, f] of Object.entries(FAMILIES)) {
    if (f.match(number)) return { key, ...f };
  }
  return null;
}

// ── Candidate proposal ───────────────────────────────────────────────────────
// Keyword containment against the shipped vocabulary, and nothing cleverer. This
// is the same containment netlify/lib/vr-normalize.ts's suggestIssue() runs — with
// its single-hit restriction removed, which is precisely why that function is not
// what a curator needs: a real bill hits four or five buckets, suggestIssue()
// returns null on every one of them, and the curator is back to reading the whole
// vocabulary by hand. Multiple hits are the normal case and they are the useful
// output; the ranking is by evidence found, and it is NOT a confidence score.
function candidates(title, text, limit) {
  const t = String(title || "").toLowerCase();
  const x = String(text || "").toLowerCase();
  const out = [];
  for (const key of Object.keys(KEYWORDS)) {
    if (!ISSUE_KEYS.has(key)) continue;
    const inTitle = [];
    const inText = [];
    for (const kw of KEYWORDS[key] || []) {
      const k = String(kw || "").toLowerCase();
      if (!k) continue;
      if (t.indexOf(k) !== -1) inTitle.push(kw);
      else if (x && x.indexOf(k) !== -1) inText.push(kw);
    }
    if (!inTitle.length && !inText.length) continue;
    out.push({
      issueKey: key,
      label: labelOf(key),
      matchedInTitle: inTitle,
      matchedInText: inText,
      // Where the evidence came from. A title hit is a claim about what the bill IS;
      // a body hit is a claim that the bill mentions something. They are not the
      // same strength of evidence and the report says which is which.
      evidence: inTitle.length ? "title" : "text",
    });
  }
  out.sort((a, b) => {
    if (a.evidence !== b.evidence) return a.evidence === "title" ? -1 : 1;
    const an = a.matchedInTitle.length + a.matchedInText.length;
    const bn = b.matchedInTitle.length + b.matchedInText.length;
    if (an !== bn) return bn - an;
    return a.issueKey.localeCompare(b.issueKey);
  });
  return out.slice(0, limit);
}

// ── The checklist ────────────────────────────────────────────────────────────
// Every entry is a question in the runbook's own words, addressed to a human, with
// no machine-supplied answer. `answer` is always null on emit. A check that could be
// mechanised is still printed as a question when the answer is a JUDGEMENT — the
// unanimity check knows the margin but not whether the question being scored makes
// the margin meaningful (rule 11).
function checksFor(m, cand) {
  const num = m.number;
  const label = cand.label;
  const list = [
    {
      id: "backwards_read",
      rule: "runbook rule 22",
      required: true,
      question:
        `Say it out loud: "A NAY on ${num} is honestly described as opposition to ` +
        `${label}." Is that true? support_meaning is not a statement about the yea ` +
        `bloc — it tells _voteEffectiveSupport that a yea advances the issue AND that ` +
        `a nay cuts against it, and the nay side is scored just as hard. The test is ` +
        `not "does this provision exist in the text".`,
      answer: null,
    },
    {
      id: "two_flank_nay",
      rule: "runbook rule 22 / rule 23",
      required: true,
      question:
        `Did any of the nay bloc vote no because ${label} was addressed too WEAKLY? ` +
        `If so this key records them as opposing the thing they wanted more of, and it ` +
        `is disqualified — the keys the two flanks agree about are not.`,
      answer: null,
    },
    {
      id: "conviction_already_carried",
      rule: "runbook rule 22",
      required: true,
      question:
        `Is the conviction this key would record already carried by another mapping on ` +
        `${num} itself? A second key on one belief is double-counting, not new coverage.`,
      answer: null,
    },
    {
      id: "vehicle_share",
      rule: "runbook rule 22 (the section inside a vehicle)",
      required: true,
      question:
        `Which SECTIONS of ${num} carry ${label}, and what share of the bill are they? ` +
        `A provision does not stop counting because it travelled inside a larger bill — ` +
        `but a subtitle inside an authorisation is a secondary key at low weight, not a ` +
        `primary one. Name the sections in the rationale.`,
      answer: null,
    },
    {
      id: "vocabulary_fit",
      rule: "runbook (never stretch a bill onto an issue the vocabulary can't express)",
      required: true,
      question:
        `Does "${cand.issueKey}" actually express what ${num} does, or is it the ` +
        `nearest available key? There is no human_rights, foreign_aid or sanctions key — ` +
        `a measure the shipped vocabulary cannot express stays unmapped rather than ` +
        `mis-keyed.`,
      answer: null,
    },
  ];

  if (cand.issueKey === "gov_regulation") {
    list.push({
      id: "gov_regulation_reserved",
      rule: "runbook rule 3",
      required: true,
      question:
        `Is regulation itself the PRIMARY operative purpose of ${num} (a CRA ` +
        `disapproval, a regulatory-budget cap, a rulemaking-quality bill)? Directing an ` +
        `agency to issue or enforce a rule is not enough — that description fits most of ` +
        `the statute book, and it turns a deregulation stance into a contradiction on any ` +
        `safety vote.`,
      answer: null,
    });
  }
  if (cand.evidence === "text") {
    list.push({
      id: "text_only_evidence",
      rule: "drafting bench",
      required: true,
      question:
        `The only keyword evidence for this key is in the body text, not the title ` +
        `(${cand.matchedInText.slice(0, 4).join(", ")}). A mention is not a purpose. What ` +
        `does ${num} DO on ${label}?`,
      answer: null,
    });
  }
  return list;
}

// Checks about the measure as a whole rather than about one candidate key.
function measureChecks(m) {
  const list = [
    {
      id: "decisive_question",
      rule: "runbook rule 8 / rule 12",
      required: true,
      question:
        `Which roll call is the decisive question for ${m.number} in each chamber? ` +
        `Passage, concurrence and conference reports only — plus the two shape-gated ` +
        `exceptions (an amendment's "On Agreeing to the Amendment" / "On the Amendment", ` +
        `and "On the Motion to Discharge" on a joint resolution). One decisive vote per ` +
        `chamber per measure.`,
      answer: null,
    },
    {
      id: "procedural_inversion",
      rule: "runbook rule 1",
      required: true,
      question:
        `Is the decisive roll a motion to recommit, to commit or to table? On those a ` +
        `yea BLOCKS the measure, so the ordinary read is inverted. support_meaning does ` +
        `not know this — yeaBlocksMeasure() handles it, and the 0.25 procedural ` +
        `down-weight does not substitute for it.`,
      answer: null,
    },
    {
      id: "not_a_removal",
      rule: "runbook rule 20",
      required: true,
      question:
        `If you drop a key that ${m.number} already carries, say so explicitly — ` +
        `omitting a key from db/vr-issue-seed.json is NOT a removal. ` +
        `applyCuratedIssueSeed() only adds and re-asserts.`,
      answer: null,
    },
    {
      id: "first_rationale_stands",
      rule: "runbook rule 21",
      required: true,
      question:
        `Is any of these keys already mapped? The LIVE rationale is the first writer's, ` +
        `not the latest migration's — a re-assertion does not overwrite it, so check what ` +
        `is actually stored before writing a new sentence.`,
      answer: null,
    },
  ];
  if (m.margin) {
    const [a, b] = String(m.margin).split(/[-–]/).map((n) => parseInt(n, 10));
    const total = (a || 0) + (b || 0);
    const share = total ? Math.max(a || 0, b || 0) / total : 0;
    list.push({
      id: "unanimity",
      rule: "runbook rule 11 (and the near-unanimous skip)",
      required: true,
      // The margin is arithmetic; whether it differentiates anybody is not. Rule 11
      // is the case where a 366-58 vote that distinguished nobody on the general
      // foreign-policy keys was the entire point under israel_support.
      question:
        `The recorded margin is ${m.margin} — the majority side is ` +
        `${Math.round(share * 100)} percent of votes cast. A near-unanimous measure ` +
        `differentiates nobody and is normally skipped. Is this margin near-unanimous ` +
        `RELATIVE TO THE KEY being scored, or is the small bloc the entire point on it?`,
      answer: null,
    });
  }
  return list;
}

// ── Weight guidance (a band, never a value) ──────────────────────────────────
// Read off the corpus, so the guidance is what the archive actually did rather than
// a number invented here. It is printed as a band with what each band has MEANT,
// and the emitted row still carries weight:null — a weight is a judgement about how
// much of a bill a provision represents, and no distribution can supply it.
function weightBands() {
  const buckets = new Map();
  for (const m of SEED.measures || []) {
    for (const i of m.issues || []) {
      const w = i.weight;
      if (typeof w !== "number") continue;
      const b = buckets.get(w) || { weight: w, n: 0, primary: 0 };
      b.n++;
      if (i.isPrimary) b.primary++;
      buckets.set(w, b);
    }
  }
  return [...buckets.values()].sort((a, b) => b.weight - a.weight);
}

// ── Corpus lookup ────────────────────────────────────────────────────────────
const normNum = (n) =>
  String(n || "").trim().toUpperCase().replace(/\s+/g, " ").replace(/\.\s/g, ". ");

function fromCorpus(number, congress) {
  const want = normNum(number);
  return (SEED.measures || []).filter((m) => {
    if (normNum(m.number) !== want) return false;
    if (congress && Number(m.congress) !== Number(congress)) return false;
    return true;
  });
}

// ── Emitted artifacts ────────────────────────────────────────────────────────
function draftFor(m, cands) {
  return {
    _status: "draft",
    _requiresHumanConfirmation: true,
    _generatedBy: "scripts/vr-mapping-draft.mjs",
    _notice:
      "DRAFT — NOT APPLIABLE. Every issue below is UNDECIDED: no supportMeaning, no " +
      "weight, no isPrimary, no rationale. A curator answers every check, fills every " +
      "null, deletes every candidate they reject, and only then moves the surviving " +
      "rows into db/vr-issue-seed.json by hand. Nothing in this file is a mapping.",
    measure: {
      measureType: m.family,
      congress: m.congress,
      chamber: m.chamber,
      number: m.number,
      sourceUrl: m.sourceUrl || null,
      title: m.title || null,
    },
    measureChecks: measureChecks(m),
    candidates: cands.map((c) => ({
      issueKey: c.issueKey,
      label: c.label,
      // UNDECIDED for a proposal; LIVE_UNREVIEWED when auditing a mapping that is
      // already shipped. Neither is an acceptance, and neither can be applied.
      decision: c.stored ? "LIVE_UNREVIEWED" : "UNDECIDED",
      stored: c.stored || null,
      // The three judgements. Null on purpose, and the reason is in _notice: a
      // placeholder direction is the one field a hurried curator would leave standing,
      // and a placeholder direction is a backwards verdict waiting to happen.
      supportMeaning: null,
      weight: null,
      isPrimary: null,
      rationale: null,
      evidence: {
        from: c.evidence,
        matchedInTitle: c.matchedInTitle,
        matchedInText: c.matchedInText,
      },
      checks: c.checks || checksFor(m, c),
    })),
  };
}

// The SQL skeleton. Every statement is commented out and the file is written with a
// `.sql.draft` extension, which the platform's migration runner does not read — so
// this artifact cannot be applied by being in the wrong directory, only by a human
// deliberately renaming it after filling it in.
function skeletonSql(m, cands, stampArg) {
  const stamp = stampArg;
  const L = [];
  L.push("-- ---------------------------------------------------------------------------");
  L.push(`-- DRAFT SKELETON — ${m.number} (${m.congress}th Congress) → issue mappings`);
  L.push("-- ---------------------------------------------------------------------------");
  L.push("-- GENERATED BY scripts/vr-mapping-draft.mjs. THIS FILE IS NOT A MIGRATION.");
  L.push("--");
  L.push("-- Every statement below is commented out and every judgement is a TODO. The");
  L.push("-- file is written as `.sql.draft` so the platform's migration runner does not");
  L.push("-- read it. To ship: answer every check in the companion draft JSON, fill the");
  L.push("-- three judgement columns, delete the candidates you rejected, write the");
  L.push("-- refusal list into this header with reasons, rename to `.sql`, and move it");
  L.push("-- into netlify/database/migrations/ yourself.");
  L.push("--");
  L.push("-- WHY THE EXPLICIT NULLs ARE THE SAFETY. vr_measure_issues.weight, .is_primary");
  L.push("-- and .support_meaning are all NOT NULL in db/schema.ts, each with a default.");
  L.push("-- This skeleton writes an explicit NULL into all three rather than omitting the");
  L.push("-- columns, so an unedited skeleton that someone renamed and moved into the");
  L.push("-- migrations directory regardless raises a not-null violation instead of quietly");
  L.push("-- inserting the schema defaults — which for support_meaning is 'yea_supports',");
  L.push("-- a direction no human chose. Filling these in is the work; it cannot be skipped.");
  L.push("--");
  L.push("-- THE REFUSALS BELONG IN THIS HEADER. runbook rule 22: when a provision is");
  L.push("-- real but the backwards read fails, the honest home for it is the refusal");
  L.push("-- list in the migration header — written down, with the reason, so the next");
  L.push("-- pass does not rediscover it as an opportunity.");
  L.push("--");
  L.push("-- Refused this pass:");
  L.push("--   TODO(curator): key · why the backwards read failed");
  L.push("--");
  L.push(`-- Candidates proposed by keyword evidence: ${cands.length}`);
  L.push(`-- Candidates accepted by a human: 0 (nothing here has been accepted)`);
  L.push("");
  L.push("-- The measure this attaches to must already exist. Never create one here.");
  L.push("-- DO $$");
  L.push("-- DECLARE mid BIGINT;");
  L.push("-- BEGIN");
  L.push("--   SELECT id INTO mid FROM vr_measures");
  L.push(`--    WHERE congress = ${Number(m.congress) || 0}`);
  L.push(`--      AND chamber = '${String(m.chamber || "").replace(/'/g, "''")}'`);
  L.push(`--      AND number = '${String(m.number).replace(/'/g, "''")}';`);
  L.push("--   IF mid IS NULL THEN");
  L.push(`--     RAISE EXCEPTION 'measure ${String(m.number).replace(/'/g, "''")} not found — refusing to invent it';`);
  L.push("--   END IF;");
  L.push("");
  for (const c of cands) {
    L.push(`--   -- ${c.issueKey} · ${c.label}`);
    L.push(`--   -- REVIEW: keyword evidence in ${c.evidence}` +
      (c.matchedInTitle.length ? ` — title: ${c.matchedInTitle.join(", ")}` : "") +
      (c.matchedInText.length ? ` — text: ${c.matchedInText.join(", ")}` : ""));
    L.push("--   -- REVIEW: backwards read (rule 22) — UNANSWERED");
    L.push("--   -- REVIEW: support_meaning — UNDECIDED (yea_supports | yea_opposes)");
    L.push("--   -- REVIEW: weight — UNDECIDED · is_primary — UNDECIDED");
    L.push("--   -- REVIEW: rationale — must name the sections that carry this key");
    L.push("--   INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale)");
    L.push(`--   VALUES (mid, '${c.issueKey}', NULL /* TODO */, NULL /* TODO */, NULL /* TODO */, NULL /* TODO */)`);
    L.push("--   ON CONFLICT DO NOTHING;");
    L.push("");
  }
  L.push("-- END $$;");
  L.push("");
  L.push(`-- draft stamp: ${stamp}`);
  return L.join("\n");
}

// ── Report ───────────────────────────────────────────────────────────────────
const W = (s) => process.stdout.write(s + "\n");
const HR = "─".repeat(78);

function report(m, cands, drafted) {
  W("");
  W(HR);
  W(`  DRAFT MAPPING BENCH · ${m.number} · ${m.congress}th Congress · ${m.chamber}`);
  W(HR);
  W(`  family      ${m.family} (${FAMILIES[m.family].label})`);
  W(`  title       ${m.title || "(none supplied)"}`);
  if (m.sourceUrl) W(`  source      ${m.sourceUrl}`);
  if (m.textChars) W(`  text        ${m.textChars} characters supplied`);
  if (m.margin) W(`  margin      ${m.margin}`);
  W("");
  W("  NOTHING BELOW IS A MAPPING. Every candidate is UNDECIDED and every judgement");
  W("  column is null. This tool proposes and checks; a human decides.");
  W("");

  if (m.existing && m.existing.length) {
    W(`  ── Already in db/vr-issue-seed.json (${m.existing.length}) ` + "─".repeat(24));
    for (const i of m.existing) {
      W(`     ${i.isPrimary ? "★" : " "} ${i.issueKey.padEnd(26)} w${String(i.weight).padStart(3)}  ${i.supportMeaning}`);
    }
    W("     runbook rule 21: the LIVE rationale is the first writer's. Re-asserting");
    W("     does not overwrite it — read what is stored before rewriting a sentence.");
    W("");
  }

  W(`  ── Measure-level checks (${m.checks.length}) ` + "─".repeat(38));
  for (const c of m.checks) {
    W("");
    W(`     [ ] ${c.id}  ·  ${c.rule}`);
    for (const line of wrap(c.question, 68)) W(`         ${line}`);
  }
  W("");

  W(`  ── Candidate issue keys (${cands.length}) ` + "─".repeat(40));
  if (!cands.length) {
    W("");
    W("     No keyword evidence in the title or supplied text. That is a real answer:");
    W("     a measure the shipped vocabulary cannot express stays unmapped rather than");
    W("     mis-keyed. Supply --text, or leave it unmapped.");
  }
  for (const c of cands) {
    W("");
    W(`     ${c.issueKey}  ·  ${c.label}`);
    W(`       evidence     ${c.evidence}` +
      (c.matchedInTitle.length ? ` — title: ${c.matchedInTitle.join(", ")}` : "") +
      (c.matchedInText.length ? ` — text: ${c.matchedInText.join(", ")}` : ""));
    if (c.stored) {
      W(`       decision     LIVE_UNREVIEWED (this mapping is already shipped)`);
      W(`       direction    ${c.stored.supportMeaning}`);
      W(`       weight       ${c.stored.weight}` +
        `${c.stored.isPrimary ? "                 is_primary  yes" : "                  is_primary  no"}`);
    } else {
      W(`       decision     UNDECIDED`);
      W(`       direction    (undecided — yea_supports | yea_opposes)`);
      W(`       weight       (undecided)          is_primary  (undecided)`);
    }
    for (const ck of c.checks) {
      W("");
      W(`       [ ] ${ck.id}  ·  ${ck.rule}`);
      for (const line of wrap(ck.question, 64)) W(`           ${line}`);
    }
  }
  W("");
  W("  ── Weight bands, as the corpus actually uses them " + "─".repeat(26));
  W("     (guidance only — the emitted rows carry weight:null)");
  for (const b of weightBands()) {
    W(`       ${String(b.weight).padStart(3)}   ${String(b.n).padStart(3)} row(s), ${b.primary} of them primary`);
  }
  W("");
  if (drafted.length) {
    W("  ── Written " + "─".repeat(64));
    for (const f of drafted) W(`     ${f}`);
    W("");
  }
  W(HR);
  W("  Next: answer every [ ], delete every candidate you reject, write the refusals");
  W("  into the skeleton's header with reasons, then hand-edit db/vr-issue-seed.json.");
  W(HR);
  W("");
}

function wrap(s, n) {
  const words = String(s).split(/\s+/);
  const out = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > n) { out.push(line.trim()); line = w; }
    else line += " " + w;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

// ── Where a draft may be written ─────────────────────────────────────────────
// FAIL CLOSED ON THE PATH. A draft is not a migration and not a seed, and the two
// ways it could quietly become one are being written into the migrations directory
// (where the platform would apply it) or into db/ (where a build script would read
// it). Both are refused before anything is written, on the resolved path, so `..`
// cannot walk into them.
const FORBIDDEN = ["netlify/database/migrations", "db"];
function assertWritable(dir) {
  const abs = pathResolve(dir);
  for (const f of FORBIDDEN) {
    const bad = pathResolve(join(ROOT, f));
    if (abs === bad || abs.startsWith(bad + sep)) {
      die(
        `refusing to write a draft into ${f}/ — a draft written there is one rename ` +
        `away from being applied. Pass --out somewhere outside the repo's data and ` +
        `migration directories.`
      );
    }
  }
  return abs;
}

function die(msg) {
  process.stderr.write(`\nvr-mapping-draft: ${msg}\n\n`);
  process.exit(1);
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { limit: 12 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case "--measure": case "--number": a.number = v; i++; break;
      case "--audit": a.number = v; a.audit = true; i++; break;
      case "--congress": a.congress = parseInt(v, 10); i++; break;
      case "--chamber": a.chamber = v; i++; break;
      case "--title": a.title = v; i++; break;
      case "--text": a.textPath = v; i++; break;
      case "--source": a.sourceUrl = v; i++; break;
      case "--margin": a.margin = v; i++; break;
      case "--out": a.out = v; i++; break;
      case "--limit": a.limit = Math.max(1, parseInt(v, 10) || 12); i++; break;
      case "--json": a.json = true; break;
      case "--stamp": a.stamp = v; i++; break;
      case "-h": case "--help": a.help = true; break;
      default:
        if (k.startsWith("--")) die(`unknown option ${k}`);
    }
  }
  return a;
}

function main(argv) {
  const a = parseArgs(argv);
  if (a.help || !a.number) {
    W("");
    W("  node scripts/vr-mapping-draft.mjs --measure \"H.R. 1\" --congress 119");
    W("  node scripts/vr-mapping-draft.mjs --number \"H.R. 9311\" --congress 119 \\");
    W("       --chamber house --title \"…\" [--text file] [--margin 214-201]");
    W("  node scripts/vr-mapping-draft.mjs --audit \"H.R. 1\" --congress 119");
    W("");
    W("  --out DIR   write the draft JSON + .sql.draft skeleton (never into db/ or");
    W("              netlify/database/migrations/ — both are refused)");
    W("  --json      machine-readable draft on stdout");
    W("");
    return a.help ? 0 : 1;
  }

  const fam = familyOf(a.number);
  if (!fam) die(`"${a.number}" does not match any declared measure family. Add one to FAMILIES.`);
  if (!fam.implemented) {
    die(
      `the ${fam.label.toLowerCase()} family is deliberately not drafted by this tool.\n` +
      `  Blocked by ${fam.blockedBy}\n` +
      `  Adding it is one FAMILIES entry plus its family-specific checks — but read the\n` +
      `  rule first: for this family the rule blocks the DRAFT, not just the decision.`
    );
  }

  const hits = fromCorpus(a.number, a.congress);
  if (hits.length > 1 && !a.congress) {
    die(`"${a.number}" matches ${hits.length} corpus entries — pass --congress to pick one.`);
  }
  const corpus = hits[0] || null;

  const m = {
    number: normNum(a.number),
    family: fam.key,
    congress: a.congress || (corpus && corpus.congress) || null,
    chamber: a.chamber || (corpus && corpus.chamber) || null,
    title: a.title || (corpus && corpus.title) || null,
    sourceUrl: a.sourceUrl || (corpus && corpus.sourceUrl) || null,
    margin: a.margin || null,
    existing: corpus ? corpus.issues || [] : [],
  };
  if (!m.congress) die("a congress is required — pass --congress.");
  if (!m.chamber) die("a chamber is required — pass --chamber house|senate.");

  let text = "";
  if (a.textPath) {
    if (!existsSync(a.textPath)) die(`--text file not found: ${a.textPath}`);
    text = readFileSync(a.textPath, "utf8");
    m.textChars = text.length;
  }

  // AUDIT MODE runs the identical checklist over the mappings that already exist,
  // unanswered. It is the same rules applied to work already shipped, which is what
  // rule 22's own account of the densification pass describes: twelve drafted, three
  // shipped, nine refused on the backwards read and none on the forwards one.
  let cands;
  if (a.audit) {
    if (!m.existing.length) die(`"${m.number}" has no mappings in db/vr-issue-seed.json to audit.`);
    cands = m.existing.map((i) => ({
      issueKey: i.issueKey,
      label: labelOf(i.issueKey),
      matchedInTitle: [],
      matchedInText: [],
      evidence: "existing",
      stored: {
        supportMeaning: i.supportMeaning,
        weight: i.weight,
        isPrimary: !!i.isPrimary,
      },
    }));
  } else {
    if (!m.title && !text) {
      // db/vr-issue-seed.json stores identity and mappings, not titles — so the
      // corpus can never supply this, and propose mode always needs --title. The
      // stored rationales are NOT a fallback: proposing keys from sentences written
      // to justify those same keys is circular, and it would launder an existing
      // mapping into fresh-looking evidence for itself.
      die(
        `no title and no text for ${m.number}. A candidate key proposed from a bare ` +
        `bill number would be a guess, and the corpus does not store titles. Pass ` +
        `--title, --text, or both — or use --audit to run the checklist over the ` +
        `mappings ${m.number} already carries.`
      );
    }
    cands = candidates(m.title, text, a.limit);
  }

  m.checks = measureChecks(m);
  for (const c of cands) c.checks = checksFor(m, c);
  const draft = draftFor(m, cands);
  if (a.audit) draft._notice = "AUDIT — the checklist above is unanswered for mappings that are ALREADY LIVE. " + draft._notice;

  const written = [];
  if (a.out) {
    const dir = assertWritable(a.out);
    mkdirSync(dir, { recursive: true });
    const slug = m.number.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const stamp = a.stamp || "TODO_TIMESTAMP";
    const jf = join(dir, `vr-mapping-draft-${m.congress}-${slug}.json`);
    const sf = join(dir, `${stamp}_vr_map_${slug}.sql.draft`);
    writeFileSync(jf, JSON.stringify(draft, null, 2) + "\n");
    writeFileSync(sf, skeletonSql(m, cands, stamp) + "\n");
    written.push(jf, sf);
  }

  if (a.json) W(JSON.stringify(draft, null, 2));
  else report(m, cands, written);
  return 0;
}

// Exported for scripts/test-vr-mapping-draft.mjs, which drives the same functions
// the CLI does rather than shelling out and grepping stdout.
export {
  FAMILIES, familyOf, candidates, checksFor, measureChecks, draftFor,
  skeletonSql, weightBands, fromCorpus, assertWritable, FORBIDDEN, labelOf,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
