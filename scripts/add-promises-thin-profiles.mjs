#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — add tracked promises to thin profiles in the live Firestore roster
//
// A roster review found several higher-visibility politicians carrying very few
// tracked promises (0–3), which left their Promise % thin or unscored. This
// script adds real, verifiable promises — each tied to a public record (a bill,
// a vote, a documented outcome, or an on-the-record campaign goal) with at least
// one source — to a focused, high-confidence set of profiles. It writes to the
// same `politicians` collection that index.html reads at runtime.
//
//   node scripts/add-promises-thin-profiles.mjs            # dry run (default)
//   node scripts/add-promises-thin-profiles.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated promises. Every item below maps to a documented action,
//     vote, bill, or stated goal, with a citable source.
//   • "kept" = a pledge the record shows they followed through on; "broken" = a
//     pledge or stated goal the record shows they did not meet (incl. resigning
//     mid-term); "pending" = not yet resolved.
//   • Each run re-fetches the live doc, appends only promises whose titles are
//     not already present (idempotent / safe to re-run), then recomputes the
//     kept / broken / pending counts and the published Promise % as the raw
//     follow-through rate  Kept ÷ (Kept + Broken)  so the headline score matches
//     the formula shown in the profile.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-11T00:00:00.000Z';

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
  if (v.arrayValue !== undefined) return (v.arrayValue.values || []).map(dec);
  if (v.mapValue !== undefined) {
    const o = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = dec(val);
    return o;
  }
  return null;
}

// ── New promises per profile ───────────────────────────────────────────────
// `add` lists the promises to append. `accountability` (optional) is set only
// for previously unscored profiles so the card reads as complete.
const PLAN = [
  // ── Brian King — former UT House Minority Leader, 2024 gov nominee ───────
  {
    id: 'bking',
    add: [
      {
        title: 'Push to expand Medicaid for low-income Utahns',
        detail: 'As House Minority Leader he repeatedly pressed for full Medicaid expansion and criticized GOP leaders for sidelining it; Utah voters approved expansion in 2018 and it took effect in 2020.',
        verdict: 'kept',
        sources: [
          { url: 'https://en.wikipedia.org/wiki/Brian_King_(politician)', label: 'Wikipedia' },
          { url: 'http://utahpolicy.com/index.php/features/today-at-utah-policy/4900-house-minority-leader-rep-brian-king-on-medicaid-expansion-and-utah-s-booming-economy-video', label: 'Utah Policy' },
        ],
      },
      {
        title: 'Defend Utah’s voter-approved ballot initiatives',
        detail: 'Made protecting the 2018 redistricting, Medicaid and medical-cannabis initiatives a signature cause, repeatedly faulting the Legislature for watering them down — a theme he carried into his 2024 campaign.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.sltrib.com/news/politics/2023/12/04/democrat-brian-king-announces-hes/', label: 'Salt Lake Tribune' },
        ],
      },
      {
        title: 'Win the governorship and end one-party rule in 2024',
        detail: 'Became the 2024 Democratic nominee for governor on a pledge to break decades of single-party control, but lost the November 2024 general election to incumbent Republican Spencer Cox.',
        verdict: 'broken',
        sources: [
          { url: 'https://ballotpedia.org/Brian_King', label: 'Ballotpedia' },
          { url: 'https://www.axios.com/local/salt-lake-city/2023/12/04/brian-king-2024-governor-cox-race-election-utah', label: 'Axios' },
        ],
      },
      {
        title: 'Keep building the Utah Democratic Party',
        detail: 'After the 2024 loss he stayed in the arena, running for and winning the Utah Democratic Party chairmanship in May 2025.',
        verdict: 'kept',
        sources: [
          { url: 'https://en.wikipedia.org/wiki/Brian_King_(politician)', label: 'Wikipedia' },
        ],
      },
    ],
    accountability: {
      overallScore: 70,
      summary:
        'A 16-year Utah House member and Minority Leader (2015–2023) with a substantive legislative record on health care and ballot-initiative integrity, later the 2024 Democratic nominee for governor. The score reflects long, documented follow-through on his stated priorities alongside an unsuccessful statewide bid; he now chairs the Utah Democratic Party.',
    },
  },

  // ── Francis Gibson — former UT House Majority Leader (2019–2021) ─────────
  {
    id: 'fgibson',
    add: [
      {
        title: 'Establish the Utah Inland Port',
        detail: 'Helped shepherd creation of the Utah Inland Port Authority through the Legislature despite opposition from Salt Lake City leaders.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.sltrib.com/news/politics/2021/10/26/top-gop-house-leader/', label: 'Salt Lake Tribune' },
        ],
      },
      {
        title: 'Create state digital-privacy protections',
        detail: 'Spearheaded establishing a state chief privacy officer and a 12-member Personal Privacy Oversight Committee to govern how Utah handles personal data.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.sltrib.com/news/politics/2021/10/26/top-gop-house-leader/', label: 'Salt Lake Tribune' },
        ],
      },
      {
        title: 'Overhaul Utah’s tax code (2019 tax reform)',
        detail: 'Helped pass the 2019 tax-restructuring package as a leadership priority, but it was repealed in early 2020 after a citizen referendum forced its reversal.',
        verdict: 'broken',
        sources: [
          { url: 'https://en.wikipedia.org/wiki/Francis_Gibson_(politician)', label: 'Wikipedia' },
        ],
      },
      {
        title: 'Serve out his elected House term',
        detail: 'Resigned abruptly mid-term in November 2021, citing career and family obligations, leaving House District 65 before his term ended.',
        verdict: 'broken',
        sources: [
          { url: 'https://www.ksl.com/article/50270278/utah-house-majority-leader-francis-gibson-resigning-from-legislature', label: 'KSL' },
        ],
      },
    ],
    accountability: {
      overallScore: 58,
      summary:
        'A 12-year Utah House member who rose to Majority Leader (2019–2021) and delivered on signature priorities like the inland port and digital-privacy oversight, but saw the 2019 tax overhaul repealed by referendum and resigned mid-term in 2021. The score reflects a real leadership record tempered by those reversals.',
    },
  },

  // ── David Damschen — former Utah State Treasurer (2016–2021) ─────────────
  {
    id: 'ddamschen',
    add: [
      {
        title: 'Safeguard and grow Utah’s public investment funds',
        detail: 'Oversaw the multibillion-dollar Public Treasurers’ Investment Fund and other state pools, which generated more than $2 billion in stable interest income during his tenure.',
        verdict: 'kept',
        sources: [
          { url: 'https://treasurer.utah.gov/featured-news/utah-treasurer-david-damschen-resigns-from-office-to-succeed-utah-housing-corporation-president-and-ceo-grant-whitaker/', label: 'Utah Treasurer' },
          { url: 'https://le.utah.gov/interim/2021/pdf/00001065.pdf', label: 'Utah Legislature' },
        ],
      },
      {
        title: 'Return unclaimed property to Utah families',
        detail: 'Through the Treasurer’s Unclaimed Property Division, returned more than $200 million in unclaimed property to Utahns during his time in office.',
        verdict: 'kept',
        sources: [
          { url: 'https://treasurer.utah.gov/featured-news/utah-treasurer-david-damschen-resigns-from-office-to-succeed-utah-housing-corporation-president-and-ceo-grant-whitaker/', label: 'Utah Treasurer' },
        ],
      },
      {
        title: 'Champion financial education',
        detail: 'As 2019 president of the National Association of State Treasurers he championed improving financial education in public schools; the association honored him with its Harlan Boyles/Edward T. Alter Distinguished Service Award.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.deseret.com/utah/2020/9/15/21438646/utah-treasurer-david-damschen-outstanding-service-national-association-of-state-treasurers/', label: 'Deseret News' },
        ],
      },
      {
        title: 'Serve a full second term as Treasurer',
        detail: 'Won re-election to a second full term in November 2020 but resigned effective April 30, 2021 to become president and CEO of the Utah Housing Corporation.',
        verdict: 'broken',
        sources: [
          { url: 'https://ballotpedia.org/David_Damschen', label: 'Ballotpedia' },
        ],
      },
    ],
    accountability: {
      overallScore: 74,
      summary:
        'Utah’s 25th State Treasurer (2016–2021), nationally recognized for prudent stewardship of the state’s investment pools and unclaimed-property program. The score reflects a strong, well-documented record of delivering on his core duties, offset by leaving elected office mid-second-term for the Utah Housing Corporation.',
    },
  },

  // ── Marjorie Taylor Greene — former U.S. Representative (GA-14) ──────────
  {
    id: 'mtg',
    add: [
      {
        title: '“Fire Fauci” — make-good on her signature pledge',
        detail: 'Her marquee “Fire Fauci Act” never advanced out of committee and drew only a small fraction of Republican co-sponsors; Dr. Anthony Fauci ultimately retired on his own terms in December 2022 rather than being removed.',
        verdict: 'broken',
        sources: [
          { url: 'https://www.newsweek.com/marjorie-taylor-greene-pushes-vote-fire-fauci-act-despite-slim-chances-success-1642316', label: 'Newsweek' },
        ],
      },
      {
        title: 'Impeach President Biden',
        detail: 'Repeatedly introduced articles of impeachment against President Biden (2021 and 2023), but the efforts never gained the votes to advance and Biden was never impeached.',
        verdict: 'broken',
        sources: [
          { url: 'https://www.nbcnews.com/politics/congress/marjorie-taylor-greene-introduces-biden-impeachment-articles-rcna85098', label: 'NBC News' },
        ],
      },
      {
        title: 'Regain influence after being stripped of committees',
        detail: 'Removed from all committees by House Democrats in 2021, she backed Kevin McCarthy for Speaker and in January 2023 was seated on the Oversight & Accountability and Homeland Security committees.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.cnn.com/2023/01/17/politics/marjorie-taylor-greene-paul-gosar-committee-assignments/index.html', label: 'CNN' },
        ],
      },
    ],
  },

  // ── Matt Gaetz — former U.S. Representative (FL-1) ──────────────────────
  {
    id: 'gaetz',
    add: [
      {
        title: 'Champion congressional term limits',
        detail: 'Acted on his term-limits pledge as an original co-sponsor of constitutional-amendment resolutions to cap congressional terms across multiple Congresses (e.g., H.J.Res.20 in 2019 and H.J.Res.12 in 2021).',
        verdict: 'kept',
        sources: [
          { url: 'https://www.congress.gov/bill/117th-congress/house-joint-resolution/12/cosponsors', label: 'Congress.gov' },
        ],
      },
      {
        title: 'Take on federal gun regulators — “Abolish the ATF Act”',
        detail: 'Followed through on his pledge to confront the ATF by sponsoring the “Abolish the ATF Act” (H.R.374) in 2023; the bill made his position concrete though it did not pass.',
        verdict: 'kept',
        sources: [
          { url: 'https://www.congress.gov/bill/118th-congress/house-bill/374', label: 'Congress.gov' },
          { url: 'http://gaetz.house.gov/media/press-releases/congressman-matt-gaetz-introduces-abolish-atf-act', label: 'gaetz.house.gov' },
        ],
      },
    ],
  },

  // ── Chris Stewart — former U.S. Representative (UT-2) ───────────────────
  {
    id: 'cstewart',
    add: [
      {
        title: 'Block new national monuments / oppose Bears Ears',
        detail: 'Made fighting unilateral national-monument designations a signature cause; his amendment to bar new Utah monuments where there is local opposition cleared committee and was folded into an Interior funding bill that passed the House.',
        verdict: 'kept',
        sources: [
          { url: 'https://stewart.house.gov/media-center/press-releases/rep-stewart-s-amendment-to-block-new-national-monuments-in-utah-passes', label: 'stewart.house.gov' },
        ],
      },
      {
        title: 'Counter foreign-intelligence threats — KREMLIN Act',
        detail: 'Co-authored the bipartisan KREMLIN Act with Rep. Raja Krishnamoorthi to expose Russian efforts to recruit former U.S. officials; the bill passed the House.',
        verdict: 'kept',
        sources: [
          { url: 'https://stewart.house.gov/', label: 'stewart.house.gov' },
        ],
      },
    ],
  },
];

// ── Firestore I/O ───────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
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
  console.log(`PolitiDex — add promises to thin profiles  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let totalAdded = 0;
  let touched = 0;

  for (const plan of PLAN) {
    let doc;
    try {
      doc = await getDoc(plan.id);
    } catch (e) {
      console.log(`  ✗ ${plan.id}: ${e.message}`);
      continue;
    }

    const existing = Array.isArray(doc.promises) ? doc.promises.slice() : [];
    const haveTitles = new Set(existing.map((p) => (p && p.title ? String(p.title).trim() : '')));
    const fresh = plan.add.filter((p) => !haveTitles.has(p.title.trim()));

    if (!fresh.length) {
      console.log(`  • ${plan.id}: up to date (no new promises)`);
      continue;
    }

    const promises = existing.concat(fresh);
    const kept = promises.filter((p) => p && p.verdict === 'kept').length;
    const broken = promises.filter((p) => p && p.verdict === 'broken').length;
    const pending = promises.filter((p) => p && p.verdict === 'pending').length;
    const score = kept + broken > 0 ? Math.round((100 * kept) / (kept + broken)) : null;

    const fields = { promises, kept, broken, pending, score, updatedAt: STAMP };
    if (plan.accountability) fields.accountability = plan.accountability;

    console.log(
      `  ${APPLY ? '✎' : '→'} ${plan.id} (${doc.name || ''}): +${fresh.length} promise(s) ` +
      `→ kept/broken/pending = ${kept}/${broken}/${pending}, Promise % = ${score == null ? '—' : score}`
    );
    fresh.forEach((p) => console.log(`        [${p.verdict}] ${p.title}`));

    if (APPLY) await patch(plan.id, fields);
    totalAdded += fresh.length;
    touched++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${totalAdded} new promise(s) across ${touched} profile(s).`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
