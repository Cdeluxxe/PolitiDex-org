// ─────────────────────────────────────────────────────────────────────────────
// bill-record-stages.mjs — which Congress.gov actions are "key", and what each is
// ─────────────────────────────────────────────────────────────────────────────
// Moved out of scripts/fetch-bill-record.mjs unchanged, so the build-time record
// (db/bill-record.json) and the bill pages the vote-actions job generates
// (netlify/lib/vote-actions-pages.ts) read actions with ONE classifier. No
// imports, no I/O: plain functions over Congress.gov action rows.
//
//   billStage(action)       → [stage, chamber, text] | null   (bills, resolutions)
//   amendmentStage(action)  → [stage, chamber, text] | null
//   pickActions(rows, stageOf, newestFirst) → [{ d, s, c, x }] oldest first
// ─────────────────────────────────────────────────────────────────────────────

export const clean = (s) => String(s == null ? "" : s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
export const day = (s) => {
  const t = String(s || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return "";
};
export const chamberOf = (s) => (/senate/i.test(s) ? "senate" : /house/i.test(s) ? "house" : "");

// The Library of Congress action codes, read for what each one IS. A code
// outside this table is a reading, a referral, a calendar entry or a hearing.
export const BLOCKED = /^(Cloture on the (motion to proceed( to the measure)?|measure|motion to concur in the House amendment.*?) not invoked|Motion to proceed to consideration of measure (rejected|not agreed to)|Motion to discharge .* (rejected|not agreed to)|Point of order that the measure is not entitled to expedited procedures.*? agreed to in Senate)/i;
export function billStage(a) {
  const code = String(a.actionCode || "");
  const t = clean(a.text);
  // The Senate's own floor entries carry no source code, and the Library of
  // Congress does not re-code a failed motion. Those are read for one thing only:
  // a floor vote that stopped the measure.
  if (String((a.sourceSystem || {}).code || "") !== "9") return BLOCKED.test(t) ? ["blocked", "senate", t] : null;
  if (code === "1000" || code === "10000" || /^(Introduced|Submitted) in (House|Senate)$/i.test(t))
    return ["introduced", code === "1000" || /in House$/i.test(t) ? "house" : "senate", t];
  if (/^Committee on .*\. Original measure reported to Senate/i.test(t)) return ["introduced", "senate", t];
  if ((code === "1010" || code === "10010") || /^The (House|Senate) Committee on .* reported an original measure/i.test(t))
    return ["introduced", code === "1010" || /^The House/i.test(t) ? "house" : "senate", t];
  if ((code === "5000" || code === "14000") && /\bReported\b/.test(t) && !/^Supplemental/i.test(t))
    return ["reported", code === "5000" ? "house" : "senate", t];
  if (code === "14500" || code === "4500" || /^(Senate|House) Committee on .* [Dd]ischarged\b/.test(t))
    return ["discharged", code === "4500" || /^House/.test(t) ? "house" : "senate", t];
  if (code === "8000") return ["passed", "house", t.replace(/^Passed\/agreed to in House:\s*/i, "")];
  if (code === "17000") return ["passed", "senate", t.replace(/^Passed\/agreed to in Senate:\s*/i, "")];
  if (code === "9000") return ["failed_vote", "house", t.replace(/^Failed of passage\/not agreed to in House:\s*/i, "")];
  if (code === "18000") return ["failed_vote", "senate", t.replace(/^Failed of passage\/not agreed to in Senate:\s*/i, "")];
  if (code === "28000") return ["presented", "", t];
  if (/^Signed by President/i.test(t)) return ["signed", "", t];
  if (/^Became Public Law/i.test(t)) return ["law", "", t];
  if (/^Became Private Law/i.test(t)) return ["law", "", t];
  if (/^(Vetoed by President|Pocket Vetoed by President)/i.test(t)) return ["vetoed", "", t];
  if (/^Passed (House|Senate) over veto/i.test(t)) return ["override_passed", chamberOf(t), t];
  if (/^Failed of passage in (House|Senate) over veto/i.test(t)) return ["override_failed", chamberOf(t), t];
  if (/^Resolving differences -- (House|Senate) actions:/i.test(t)) {
    const body = t.replace(/^Resolving differences -- (House|Senate) actions:\s*/i, "");
    if (/(agree|concur)\w*\s+(to|in)\s+the\s+(House|Senate)\s+amendment/i.test(body) && /Agreed to|agreed to in Senate/i.test(body) &&
        !/with an amendment|disagree|insist/i.test(body))
      return ["resolved", /House actions/i.test(t) ? "house" : "senate", body];
    if (/Conference report agreed to/i.test(body)) return ["resolved", /House actions/i.test(t) ? "house" : "senate", body];
  }
  if (BLOCKED.test(t)) return ["blocked", "senate", t];
  return null;
}

// `rows` in the order the record lists them: Congress.gov lists newest first,
// le.utah.gov oldest first. Two steps on one day keep the record's own order.
export function pickActions(rows, stageOf, newestFirst = true) {
  const seen = new Set();
  const out = [];
  const firstOnly = new Set(["introduced", "reported", "discharged", "presented", "signed", "law", "vetoed", "offered", "adopted", "confirmed", "received"]);
  const sorted = rows
    .map((a, i) => ({ a, i }))
    .sort((p, q) => String(p.a.actionDate || "").localeCompare(String(q.a.actionDate || "")) || (newestFirst ? q.i - p.i : p.i - q.i));
  for (const { a } of sorted) {
    const st = stageOf(a);
    if (!st) continue;
    const [s, c, x] = st;
    const d = day(a.actionDate);
    const k1 = `${s}|${c}|${d}|${x}`;
    if (seen.has(k1)) continue;
    if (firstOnly.has(s) && out.some((o) => o.s === s && o.c === c)) continue;
    seen.add(k1);
    out.push({ d, s, c, x: x.slice(0, 280) });
  }
  // On one day the record's own list can put the signature ahead of the
  // presentment it follows; those three keep the order they happen in.
  const RANK = { presented: 1, signed: 2, vetoed: 2, law: 3 };
  return out.map((o, i) => ({ o, i }))
    .sort((p, q) => p.o.d.localeCompare(q.o.d) || ((RANK[p.o.s] && RANK[q.o.s]) ? RANK[p.o.s] - RANK[q.o.s] : 0) || p.i - q.i)
    .map((x) => x.o);
}


export function amendmentStage(a) {
  const t = clean(a.text).replace(/^(Roll call votes on amendments in (House|Senate)|(House|Senate) amendment (agreed to|not agreed to|offered|submitted)):\s*/i, "");
  if (/\b(offered|proposed|submitted) by\b/i.test(t) && /^Amendment|^Mr\.|^Ms\.|^Mrs\./i.test(t)) return ["offered", "", t];
  if (/withdrawn/i.test(t)) return ["withdrawn", "", t];
  if (/(not agreed to|Failed|rejected|fell when)/i.test(t) && /amendment/i.test(t)) return ["failed_vote", "", t];
  if (/(Agreed to|agreed to in Senate)/i.test(t) && /amendment/i.test(t) && !/motion to (table|reconsider)/i.test(t)) return ["adopted", "", t];
  return null;
}

