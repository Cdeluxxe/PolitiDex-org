#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — deepen the Promise Tracker for CURRENT SITTING Utah State
// Legislators who carry relatively few tracked promises (June 2026)
//
// A focused audit of the 102 current sitting Utah State House/Senate members in
// the live `politicians` collection ranked every member by the number of
// substantive tracked promises. After prior waves lifted most of the chamber to
// 6–7 promises, a thin cluster remained — members whose Follow-Through Rate
// rests on only a handful of documented commitments even though their public
// legislative record contains more verifiable, enacted work than the profile
// reflects. Examples (substantive promises): clinton_okerlund 4 · cmusselman 6 ·
// dipson 6 · rshipp 6 · jon_hawkins 6 · r_neil_walter 6 · christine_watkins 6.
//
// This pass adds real, verifiable promises to that set. Every item below is tied
// to a SPECIFIC action — a bill the member personally sponsored — whose outcome
// was confirmed against the Utah Legislature's own bill-status record
// (le.utah.gov /data/<session>/<bill>.json):
//
//   • verdict "kept"   = the bill was passed and Governor Signed.
//   • verdict "broken" = a bill the member sponsored that did NOT pass its
//                        session (recorded honestly, never dressed up).
//   • verdict "pending"= an unresolved / ongoing effort.
//
// Honesty rules (matching the rest of the site and CONTENT_STYLE.md):
//   • No fabricated promises. Each maps to a documented bill with a citable
//     le.utah.gov source whose final action was verified.
//   • Plain, individual-focused language — what THIS member sponsored and what
//     happened to it. No party framing, no exaggeration.
//   • Each promise carries an `issueKey` drawn from the member's OWN documented
//     ISSUE_STANCE_DATA positions wherever one fits, so a kept promise BACKS that
//     stance (and a broken one cuts against it) in the Connected-Evidence view.
//   • Genuinely thin records are NOT padded. clinton_okerlund, a first-term
//     member with a short bill list, gets only the one enacted law his record
//     actually supports; members whose full record is already captured were left
//     out of this pass entirely. Honesty over forced content.
//
// Idempotent & non-destructive: each run re-fetches the live doc, appends only
// promises whose titles are not already present, then recomputes the kept /
// broken / pending counts so the profile's live Follow-Through Rate
// (Kept ÷ (Kept + Broken)), its four-way split, and the Connected-Evidence dots
// all reflect the new promises. The curated, impact-weighted `score` (the
// "Published Promise Score") is deliberately LEFT ALONE — the profile renders it
// as an editorial value that can sit above or below the raw ratio, so a script
// must not clobber it with the naive ratio. These members already carry a
// curated score; only the underlying promise ledger and counts are deepened.
//
//   node scripts/add-promises-current-utah-legislators-jun2026.mjs           # dry run
//   node scripts/add-promises-current-utah-legislators-jun2026.mjs --apply   # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-22T00:00:00.000Z';

// ── Firestore value encoder / decoder ──────────────────────────────────────
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = enc(val);
    return { mapValue: { fields } };
  }
  throw new Error('cannot encode value: ' + String(v));
}
function dec(v) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── New promises per profile ───────────────────────────────────────────────
// Every `verdict:'kept'` item below was confirmed "Governor Signed" on
// le.utah.gov; the single `verdict:'broken'` item was confirmed to have stalled
// in its session. issueKey values match positions the member already holds in
// ISSUE_STANCE_DATA, so the new promises light up that member's stance dots.
const PLAN = [
  // ── Clint Okerlund — first-term State Representative ─────────────────────
  // Thinnest current sitting member (4 promises). Short bill list; add only the
  // one enacted law it supports rather than padding a genuinely light record.
  {
    id: 'clinton_okerlund',
    add: [
      {
        title: 'Overhaul how Utah’s Office of Homeless Services operates',
        detail: 'Sponsored H.B. 308 (2026), Homeless Services Amendments, revising the duties, staffing, and reporting requirements of the state Office of Homeless Services and its coordinator; signed into law.',
        verdict: 'kept',
        issueKey: 'housing_support',
        sources: [{ label: 'le.utah.gov — H.B. 308 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0308.html' }],
      },
    ],
  },

  // ── Calvin Musselman — State Senator ────────────────────────────────────
  {
    id: 'cmusselman',
    add: [
      {
        title: 'Tighten construction storm-water rules to protect clean water',
        detail: 'Sponsored S.B. 220 (2025), Construction Modifications, setting Division of Water Quality standards for controlling and inspecting storm-water runoff at construction sites; signed into law.',
        verdict: 'kept',
        issueKey: 'enviro_balance',
        sources: [{ label: 'le.utah.gov — S.B. 220 (2025)', url: 'https://le.utah.gov/~2025/bills/static/SB0220.html' }],
      },
      {
        title: 'Streamline how Utah adjusts city and county boundaries',
        detail: 'Sponsored S.B. 104 (2025), Boundary Line Amendments, modifying the process local governments use to propose and review municipal and county boundary adjustments; signed into law.',
        verdict: 'kept',
        issueKey: 'lands_local',
        sources: [{ label: 'le.utah.gov — S.B. 104 (2025)', url: 'https://le.utah.gov/~2025/bills/static/SB0104.html' }],
      },
      {
        title: 'Stiffen penalties for repeat theft offenders',
        detail: 'Sponsored S.B. 125 (2026), Theft Amendments, allowing a prior theft, robbery, burglary, or fraud conviction to enhance a later theft-of-service charge to a third-degree felony; signed into law.',
        verdict: 'kept',
        issueKey: 'back_police',
        sources: [{ label: 'le.utah.gov — S.B. 125 (2026)', url: 'https://le.utah.gov/~2026/bills/static/SB0125.html' }],
      },
    ],
  },

  // ── Don Ipson — State Senator (Washington County) ───────────────────────
  {
    id: 'dipson',
    add: [
      {
        title: 'Create a statewide fund to fight hunger',
        detail: 'Sponsored S.B. 151 (2025), establishing the Statewide Hunger Relief Fund and an income-tax-return checkoff that lets taxpayers contribute to the Utah Food Bank; signed into law.',
        verdict: 'kept',
        issueKey: 'family_support',
        sources: [{ label: 'le.utah.gov — S.B. 151 (2025)', url: 'https://le.utah.gov/~2025/bills/static/SB0151.html' }],
      },
      {
        title: 'Create a criminal offense for child torture',
        detail: 'Sponsored S.B. 24 (2025), Child Abuse and Torture Amendments, creating a new child-torture offense carrying mandatory imprisonment; signed into law.',
        verdict: 'kept',
        issueKey: 'back_police',
        sources: [{ label: 'le.utah.gov — S.B. 24 (2025)', url: 'https://le.utah.gov/~2025/bills/static/SB0024.html' }],
      },
      {
        title: 'Strengthen penalties for assaulting peace officers',
        detail: 'Sponsored S.B. 27 (2026), Assault or Threat of Violence Amendments, separating and expanding the offenses for assault or threat of violence against peace officers and uniformed service members; signed into law.',
        verdict: 'kept',
        issueKey: 'back_police',
        sources: [{ label: 'le.utah.gov — S.B. 27 (2026)', url: 'https://le.utah.gov/~2026/bills/static/SB0027.html' }],
      },
    ],
  },

  // ── Rex Shipp — State Representative ─────────────────────────────────────
  {
    id: 'rshipp',
    add: [
      {
        title: 'Ease pre-placement evaluation rules for some adoptions',
        detail: 'Sponsored H.B. 141 (2025), Adoption Modifications, creating exceptions to the required pre-placement adoptive evaluation; signed into law.',
        verdict: 'kept',
        issueKey: 'family_support',
        sources: [{ label: 'le.utah.gov — H.B. 141 (2025)', url: 'https://le.utah.gov/~2025/bills/static/HB0141.html' }],
      },
      {
        title: 'Update Utah’s invasive-mussel boating rules',
        detail: 'Sponsored H.B. 125 (2026), Department of Natural Resources Related Modifications, defining "invasive mussel" and revising decontamination and exemption rules for vessels; signed into law.',
        verdict: 'kept',
        issueKey: 'lands_balance',
        sources: [{ label: 'le.utah.gov — H.B. 125 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0125.html' }],
      },
    ],
  },

  // ── Jon Hawkins — State Representative ───────────────────────────────────
  {
    id: 'jon_hawkins',
    add: [
      {
        title: 'Criminalize tampering with search-and-rescue tracking equipment',
        detail: 'Sponsored H.B. 354 (2026), Rescue Tracking Equipment Offense Amendments, creating a criminal offense and penalty for interfering with rescue tracking equipment; signed into law.',
        verdict: 'kept',
        issueKey: 'back_police',
        sources: [{ label: 'le.utah.gov — H.B. 354 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0354.html' }],
      },
    ],
  },

  // ── R. Neil Walter — State Representative (St. George area) ──────────────
  {
    id: 'r_neil_walter',
    add: [
      {
        title: 'Help cities enforce short-term-rental rules',
        detail: 'Sponsored H.B. 256 (2025), Municipal and County Zoning Amendments, letting a city or county use a rental listing as evidence that a short-term rental occurred when it has additional supporting information; signed into law.',
        verdict: 'kept',
        issueKey: 'lands_local',
        sources: [{ label: 'le.utah.gov — H.B. 256 (2025)', url: 'https://le.utah.gov/~2025/bills/static/HB0256.html' }],
      },
      {
        title: 'Close a fraudulent-deed loophole in property records',
        detail: 'Sponsored H.B. 108 (2025), Fraudulent Deed Amendments, excluding governing documents and reinvestment-fee covenants from the legal definition of a deed; signed into law.',
        verdict: 'kept',
        issueKey: 'property_rights',
        sources: [{ label: 'le.utah.gov — H.B. 108 (2025)', url: 'https://le.utah.gov/~2025/bills/static/HB0108.html' }],
      },
      {
        title: 'Require an annual public report of government cash balances',
        detail: 'Sponsored H.B. 475 (2025), Public Funds Reporting Amendments, directing the state auditor to publish each year the cash, cash-equivalent, and investment balances held by every entity that holds public funds; signed into law.',
        verdict: 'kept',
        issueKey: 'gov_transparency',
        sources: [{ label: 'le.utah.gov — H.B. 475 (2025)', url: 'https://le.utah.gov/~2025/bills/static/HB0475.html' }],
      },
      {
        title: 'Make the HOA Ombudsman publish its advisory opinions',
        detail: 'Sponsored H.B. 406 (2026), Homeowners’ Association Modifications, to require the HOA Ombudsman’s office to make its advisory opinions and educational materials public; the bill stalled in the House and did not pass.',
        verdict: 'broken',
        issueKey: 'gov_regulation',
        sources: [{ label: 'le.utah.gov — H.B. 406 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0406.html' }],
      },
    ],
  },

  // ── Christine Watkins — State Representative (Carbon County) ─────────────
  {
    id: 'christine_watkins',
    add: [
      {
        title: 'Require insurers to cover mobile mammography screenings',
        detail: 'Sponsored H.B. 468 (2026), Mobile Mammography Amendments, requiring health benefit plans to cover mobile mammography screenings in certain circumstances; signed into law.',
        verdict: 'kept',
        issueKey: 'healthcare',
        sources: [{ label: 'le.utah.gov — H.B. 468 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0468.html' }],
      },
      {
        title: 'Clarify when permanent-custody orders can be revisited',
        detail: 'Sponsored H.B. 105 (2026), Child Welfare Revisions, addressing when a parent may petition to modify an order of permanent custody and guardianship; signed into law.',
        verdict: 'kept',
        issueKey: 'family_support',
        sources: [{ label: 'le.utah.gov — H.B. 105 (2026)', url: 'https://le.utah.gov/~2026/bills/static/HB0105.html' }],
      },
    ],
  },
];

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  const j = await r.json();
  const o = {};
  for (const [k, v] of Object.entries(j.fields || {})) o[k] = dec(v);
  return o;
}

async function patch(id, fields) {
  const mask = Object.keys(fields);
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const body = { fields: {} };
  for (const [k, v] of Object.entries(fields)) body.fields[k] = enc(v);
  const r = await fetch(`${BASE}/${id}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — add promises to thin CURRENT Utah legislators  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let totalAdded = 0;
  let touched = 0;
  let missing = 0;

  for (const plan of PLAN) {
    let doc;
    try {
      doc = await getDoc(plan.id);
    } catch (e) {
      console.log(`  ✗ ${plan.id}: ${e.message}`);
      continue;
    }
    if (!doc) {
      console.log(`  – ${plan.id}: not in Firestore — skipped`);
      missing++;
      continue;
    }

    const existing = Array.isArray(doc.promises) ? doc.promises.slice() : [];
    const haveTitles = new Set(existing.map((p) => (p && p.title ? String(p.title).trim() : '')));
    const fresh = plan.add.filter((p) => !haveTitles.has(p.title.trim()));

    if (!fresh.length) {
      console.log(`  • ${plan.id} (${doc.name || ''}): up to date (no new promises)`);
      continue;
    }

    const promises = existing.concat(fresh);
    const kept = promises.filter((p) => p && p.verdict === 'kept').length;
    const broken = promises.filter((p) => p && p.verdict === 'broken').length;
    const pending = promises.filter((p) => p && p.verdict === 'pending').length;
    // Live Follow-Through Rate the profile renders from these counts. The
    // curated `score` (Published Promise Score) is intentionally NOT written.
    const rate = kept + broken > 0 ? Math.round((100 * kept) / (kept + broken)) : null;

    const fields = { promises, kept, broken, pending, updatedAt: STAMP };

    console.log(
      `  ${APPLY ? '✎' : '→'} ${plan.id} (${doc.name || ''}): +${fresh.length} promise(s) ` +
      `→ kept/broken/pending = ${kept}/${broken}/${pending}, Follow-Through = ${rate == null ? '—' : rate + '%'}` +
      ` (published score ${doc.score == null ? '—' : doc.score} left unchanged)`
    );
    fresh.forEach((p) => console.log(`        [${p.verdict}] ${p.issueKey || '—'} :: ${p.title}`));

    if (APPLY) await patch(plan.id, fields);
    totalAdded += fresh.length;
    touched++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${totalAdded} new promise(s) across ${touched} profile(s).` +
    (missing ? `  (${missing} not in Firestore.)` : ''));
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
