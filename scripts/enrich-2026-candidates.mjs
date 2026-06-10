#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — enrich thin 2026 candidate profiles in the live Firestore roster
//
// A roster review found that the weakest profiles on the site belong to 2026
// candidates: short bios, no key issues, and empty "stated positions." Most of
// those candidates have NO verifiable public platform (confirmed by a sourced
// research pass), so inventing positions for them would be dishonest. This
// script enriches only the records where real, citable campaign material exists,
// using the same `politicians` collection that index.html reads at runtime.
//
//   node scripts/enrich-2026-candidates.mjs            # dry run (default)
//   node scripts/enrich-2026-candidates.mjs --apply    # write to Firestore
//
// Scope (deliberately narrow — verifiability over volume):
//   • tami_tran    — full enrichment. Active open-seat candidate for Senate
//                    District 6 (advanced to the June 23, 2026 GOP primary).
//                    Bio, key issues, stated positions, and stances drawn from
//                    her campaign site (vote4tami.com) and Standard-Examiner.
//   • adam_sorenson — corrects a now-inaccurate bio that said "limited verified
//                    public information is available about his background." His
//                    professional background (Gross & Rooney trial attorney) and
//                    consumer/injury-victim platform are in fact documented; the
//                    record honestly notes he was eliminated at convention.
//
// Every position below is a campaign pledge or stated priority, never a governing
// record — promises are marked "pending" and accountability summaries say so.
// The script sets only the named fields (via updateMask) and re-running is safe.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-10T00:00:00.000Z';

// ── Firestore value encoder ────────────────────────────────────────────────
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

// ── Enrichment table ───────────────────────────────────────────────────────
// Each entry lists exactly the fields to set; everything else is left untouched.
const PLAN = [
  {
    id: 'tami_tran',
    fields: {
      bio:
        "Tami Tran is the Republican candidate for the open Utah State Senate District 6 seat in " +
        "Davis County (the Kaysville–Layton area) and the sitting Mayor of Kaysville, now in her fifth " +
        "year leading the city. Born in Seoul, South Korea, she was adopted as a child, became a " +
        "naturalized U.S. citizen in 1979, and later reconnected with her birth family after nearly five " +
        "decades. She studied political science at Brigham Young University and in 2004 co-founded a " +
        "Department of Defense contracting company, where she serves as CEO. Before becoming mayor she " +
        "served on the Kaysville Planning Commission and City Council, and she chairs both the Davis " +
        "Technical College Board of Trustees and the Davis County Council of Governments. She entered the " +
        "race after longtime Sen. Jerry Stevenson announced his retirement, advancing from the April 2026 " +
        "Republican convention to the June 23, 2026 primary on a platform of fiscal discipline, housing " +
        "affordability, parental choice in education, and family- and freedom-focused priorities.",
      quote: "I'm not confrontational. I don't want to start a fight, but if I'm in a fight, I'm going to win it.",
      keyIssues: [
        'Fiscal responsibility & low taxes',
        'Housing affordability',
        'Education & parental choice',
        'Public safety & first responders',
        'Second Amendment rights',
        'Economy, growth & local infrastructure',
      ],
      promises: [
        {
          title: 'Keep taxes low and budgets balanced',
          detail: "Pledges to 'live within our means,' fund only core public services, and keep taxes simple and stable for families and small businesses.",
          sources: ['https://vote4tami.com/issues/'],
          verdict: 'pending',
        },
        {
          title: 'Let the market lower housing costs',
          detail: "Says government should 'get out of the way' on housing, and has proposed redirecting grant money toward homeowners remodeling existing homes rather than only new construction.",
          sources: ['https://www.standard.net/news/2026/may/25/tami-tran-highlights-experience-in-bid-for-senate-district-6-seat/'],
          verdict: 'pending',
        },
        {
          title: 'Expand parental choice in education',
          detail: 'Backs empowering families to choose public, private, charter, or home school, with high standards, accountability, and stronger civics instruction.',
          sources: ['https://vote4tami.com/issues/'],
          verdict: 'pending',
        },
        {
          title: 'Support police and first responders',
          detail: "Pledges to back law enforcement, firefighters, and first responders, and to prioritize victims' rights.",
          sources: ['https://vote4tami.com/issues/'],
          verdict: 'pending',
        },
        {
          title: 'Defend Second Amendment and family priorities',
          detail: 'Campaigns to protect the right of law-abiding citizens to keep and bear arms, and to champion parental rights and religious freedom.',
          sources: ['https://vote4tami.com/issues/'],
          verdict: 'pending',
        },
      ],
      stances: {
        'Fiscal Responsibility': "Campaigns on living within our means, funding only core public services, balanced budgets, and government transparency.",
        'Housing': "Favors reducing government's role so the private market can lower housing costs, and redirecting grant money toward homeowners improving existing homes.",
        'Education': 'Supports parental choice across public, private, charter, and home-school options, with high standards and stronger civics.',
        'Public Safety': "Backs police, firefighters, and first responders, and prioritizes victims' rights.",
        'Second Amendment': 'Supports the right of law-abiding citizens to keep and bear arms.',
        'Land Use': 'As Kaysville mayor, worked to amend a microschool bill she said would have allowed large enrollments in residential neighborhoods.',
      },
      accountability: {
        overallScore: 70,
        summary:
          'Sitting Kaysville mayor, now in her fifth year, running for the open Senate District 6 seat. ' +
          'The score reflects a substantive executive municipal record; her state-level pledges are campaign ' +
          'positions marked pending until she takes office, where kept-and-broken promises can be tracked.',
      },
      kept: 0,
      broken: 0,
      pending: 5,
      score: 70,
      profileStatus: 'full',
      updatedAt: STAMP,
    },
  },

  {
    id: 'adam_sorenson',
    fields: {
      bio:
        "Adam Sorenson is a Salt Lake City trial attorney who ran as a Republican for Utah House " +
        "District 17 in Davis County during the 2026 cycle. A partner at the firm Gross & Rooney, he " +
        "represents plaintiffs in medical-malpractice and personal-injury cases and has advocated for " +
        "survivors of abuse. He earned his undergraduate degree at Brigham Young University and his law " +
        "degree at the University of North Carolina, then clerked for U.S. District Judge Ted Stewart in " +
        "Utah. He entered the race centered on consumer and injury-victim protection, arguing that recent " +
        "changes to Utah's personal-injury law tilted the playing field toward the insurance industry and " +
        "away from people harmed by negligent drivers. He was eliminated at the Davis County Republican " +
        "convention on April 18, 2026, and afterward endorsed fellow Republican Sam Barlow.",
      keyIssues: [
        'Holding the insurance industry accountable',
        'Protecting injury victims & consumers',
        'Access to the civil-justice system',
      ],
      accountability: {
        overallScore: 38,
        summary:
          "A 2026 Republican candidate for Utah House District 17 and a practicing plaintiffs' attorney " +
          'whose campaign centered on consumer and injury-victim protection. He was eliminated at the Davis ' +
          'County Republican convention on April 18, 2026, and has no legislative voting record, so the score ' +
          'reflects a documented professional background but an unsuccessful, single-cycle candidacy.',
      },
      updatedAt: STAMP,
    },
  },
];

async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) throw new Error(`fetch ${id}: HTTP ${r.status}`);
  return r.json();
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
  console.log(`PolitiDex — enrich 2026 candidates  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let done = 0;
  for (const plan of PLAN) {
    try {
      await getDoc(plan.id); // confirm the record exists before writing
    } catch (e) {
      console.log(`  ✗ ${plan.id}: ${e.message}`);
      continue;
    }
    const keys = Object.keys(plan.fields).join(', ');
    console.log(`  ${APPLY ? '✎' : '→'} ${plan.id}: set { ${keys} }`);
    if (APPLY) await patch(plan.id, plan.fields);
    done++;
  }
  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${done} enrichment(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
