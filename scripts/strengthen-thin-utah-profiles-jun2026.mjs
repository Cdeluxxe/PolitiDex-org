#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — strengthen the THINNEST sitting Utah legislator profiles
// (June 2026 quality-floor pass)
//
// A depth audit of all 103 sitting Utah State Representatives and Senators in
// the live `politicians` collection found two clear, fixable gaps that drive
// the distance between the best and worst profiles:
//
//   1. ISSUE POSITIONS — a cluster of ~15 members were stuck at exactly THREE
//      documented `stances`, well below the 5-6 most peers carry. That is too
//      thin to be useful for the Alignment Tool.
//   2. SPOTLIGHT / ACCOUNTABILITY — 94 of 103 sitting members had ZERO entries
//      in the `spotlight` (Accountability-of-Truth) layer, even prominent
//      leaders and decades-tenured members with well-documented public records.
//
// This pass closes both gaps for a prioritized set, with a hard honesty rule:
//
//   • Every NEW stance below is a restatement of a fact ALREADY documented in
//     that same profile (a real bill in its `promises`, a committee chair in
//     its `bio`, or a stated `keyIssue`) — surfaced into the issue-position
//     layer. No new factual claims are introduced; nothing is invented.
//   • Every SPOTLIGHT item is grounded in a verifiable public record and
//     carries a real, load-tested `source` {label,url}. Bill citations point at
//     canonical le.utah.gov static pages; roles at official committee pages or
//     Ballotpedia/Wikipedia. Each source URL was checked to resolve (HTTP 200/
//     202) before inclusion. Facts were cross-checked via web research and
//     corrected where stale (e.g. Vickers is NO LONGER Senate Majority Leader;
//     Romero/Hollins leadership and bill dates were corrected to source).
//   • Low-profile freshmen with genuinely thin public records are intentionally
//     left WITHOUT a spotlight rather than padded with filler — honesty over
//     forced content, matching the rest of the site.
//
// Idempotent & non-destructive:
//   • A stance is added only if its key is not already present.
//   • A member's spotlight items are written only if the live doc has NO
//     spotlight entries yet — an editor's hand-authored list is never clobbered.
//
//   node scripts/strengthen-thin-utah-profiles-jun2026.mjs            # dry run
//   node scripts/strengthen-thin-utah-profiles-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-20T00:00:00.000Z';

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

// ── ISSUE POSITIONS to add (each grounded in the profile's existing record) ──
// key -> stance text. Added only when the key is not already present.
const STANCE_ADDS = {
  kay_christofferson: {
    'Growth & Land Use': "A civil engineer and House Transportation chair focused on corridor preservation and aligning Utah County's rapid growth with road and transit capacity.",
    'Vehicles & Licensing': 'Sponsored legislation modernizing Utah’s Motor Vehicle Division statutes.',
  },
  cory_maloy: {
    'Healthcare Costs': 'Sponsored 2025 legislation standardizing ambulance reimbursement rates, banning balance billing, and updating health-facility administrator licensing.',
    'Taxes & Small Business': 'Chairs the House Business, Labor and Commerce Committee and backs tax reduction and lighter regulation for small businesses.',
  },
  jburton: {
    'Emergency & Disaster Response': "A retired major general who led day-to-day operations of Utah's Department of Health COVID-19 response in 2020 and focuses on emergency and disaster readiness.",
    'Government Operations': 'Chaired the House Government Operations Committee, working on state fiscal and government-operations policy.',
  },
  kristen_chevrier: {
    'Healthcare & Medical Freedom': 'Directs a Utah advocacy group on informed consent and medical freedom; sponsored a bill giving patients the right to supply their own blood for medical procedures.',
    'Food & Nutrition Policy': 'Passed 2025 laws restricting SNAP purchases of candy and soda and limiting synthetic dyes and additives in public-school meals.',
  },
  r_neil_walter: {
    'Housing & Property Rights': "Sponsored creation of a Homeowners' Association Ombudsman office and works on HOA governance and homeowner rights.",
    'Consumer Protection': 'Sponsored legislation requiring clear labeling of cultivated and alternative meat products.',
  },
  anthony_loubet: {
    'Workers & Cost of Living': "Sponsored workers'-compensation reform aimed at lowering costs for his working-class Salt Lake County district.",
    'Courts & Civil Law': 'An attorney who has carried civil- and commercial-law reform, including cracking down on the unauthorized practice of law and expanding adult protective services.',
  },
  cheryl_acton: {
    'Disability Services': 'Sponsored 2024 legislation protecting day programs and services for people with disabilities.',
    'Retirement & Pensions': 'Chaired a retirement appropriations subcommittee and sponsored legislation strengthening public-employee retirement benefits.',
  },
  john_johnson: {
    'Public Schools': 'Sponsored legislation improving accountability in standardized testing and reforming the Statewide Online Education Program for rural and small schools.',
    'Limited Government': 'Sponsored legislation banning DEI-office funding in higher education and advancing intellectual diversity on campuses.',
  },
  karen_m_peterson: {
    'Economic Development': 'Sponsored legislation transforming the Utah Innovation Lab into the Nucleus Institute to support innovation and economic development.',
    'Local Government': 'Drawing on her Clinton City Council service, sponsored legislation codifying local transportation utility fees and study requirements.',
  },
  logan_monson: {
    'Healthcare Access': 'A rural nurse administrator who sponsored expansion of the rural-hospital physician loan-repayment program and 340B drug-discount reform.',
    'Agriculture & Rural Communities': 'A fifth-generation livestock producer focused on grazing, agriculture, and the needs of remote rural communities.',
  },
  hoang_nguyen: {
    'Air Quality & Environment': 'Sponsored 2026 legislation modernizing CO2 system safety rules and focuses on environmental quality and emissions reduction.',
    'Immigrant & Refugee Communities': "Utah's first Vietnamese-American refugee legislator, focused on representation for immigrant and refugee communities.",
  },
  kstratton: {
    'Property Rights': 'Sponsored legislation prioritizing federal land over private land for energy-corridor siting to protect private landowners from eminent-domain overreach.',
    'Natural Resources & Environment': "Chairs the Senate Natural Resources, Agriculture and Environment interim committee and advanced Utah's State Resource Management Plan.",
  },
  rosalba_dominguez: {
    'Energy & Water': 'Centers renewable energy and water conservation; sponsored legislation increasing accountability for data-center water and energy use.',
    'Children & Families': 'Passed 2025 legislation creating a voluntary state Diapering Supplies Fund for families in need.',
  },
  john_arthur: {
    'Renter Protections': 'Sponsored legislation requiring 60-day notice before residential rent increases.',
    'Teacher Support': 'The 2021 Utah Teacher of the Year, he champions educator pay and staffing every school with a certified teacher-librarian.',
  },
  leah_hansen: {
    'Property Rights & Foreign Ownership': 'Sponsored legislation restricting land purchases by foreign-adversary entities.',
    'Limited Government': 'Campaigns on restrained government and pledges to limit her own legislative footprint as a check on government growth.',
  },
};

// ── SPOTLIGHT / ACCOUNTABILITY items (verifiable + sourced) ─────────────────
// Written only when the live doc has NO spotlight entries yet.
const SPOTLIGHT_ADDS = {
  lescamilla: [
    { impact: 'positive', category: 'transparency', date: '2009–present', tags: ['Notable Actions', 'Representation'],
      headline: 'First Latina and first immigrant elected to the Utah Legislature',
      facts: 'Escamilla, in office since 2009, was the first Latina and the first immigrant elected to the Utah State Legislature, and was elected Senate Minority Leader in January 2023.',
      why: 'A documented, durable record of representation capped by a caucus-elected leadership role.',
      source: { label: 'Ballotpedia — Luz Escamilla', url: 'https://ballotpedia.org/Luz_Escamilla' } },
    { impact: 'positive', category: 'rhetoric', date: '2019', tags: ['High-Profile Moments', 'Public Behavior'],
      headline: 'Ran for Salt Lake City mayor and conceded a clear result',
      facts: 'Escamilla ran for Salt Lake City mayor in 2019, lost the general election to Erin Mendenhall, and conceded publicly on Nov. 6, 2019, then returned to her Senate work.',
      why: 'Stepping onto a bigger stage and accepting the outcome openly is a conduct-and-candor signal.',
      source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2019/11/06/luz-escamilla-concedes/' } },
  ],
  evickers: [
    { impact: 'positive', category: 'voting', date: '2019', tags: ['Consistency', 'Notable Actions'],
      headline: 'Pharmacist-legislator who regulated pharmacy benefit managers',
      facts: 'A practicing pharmacist by trade, Vickers was the Senate sponsor of H.B. 370 (2019), the Pharmacy Benefit Manager Amendments, imposing disclosure and fiduciary duties on PBMs — legislating directly in his own professional field.',
      why: 'Using firsthand professional expertise to legislate in the same field is a competence-and-consistency signal.',
      source: { label: 'Utah Legislature — H.B. 370 (2019)', url: 'https://le.utah.gov/~2019/bills/static/HB0370.html' } },
    { impact: 'positive', category: 'transparency', date: '2019–2025', tags: ['Notable Actions'],
      headline: 'Served six years as Senate Majority Leader',
      facts: 'Vickers led the Senate Republican majority as Majority Leader from 2019 until January 2025, when Kirk Cullimore succeeded him; he continues to serve as a senator from Cedar City.',
      why: 'A documented record of sustained, peer-elected leadership.',
      source: { label: 'Deseret News — 2025 legislative leadership', url: 'https://www.deseret.com/politics/2024/11/07/utah-legislative-leadership-teams-for-2025/' } },
  ],
  wharper: [
    { impact: 'positive', category: 'transparency', date: '1997–present', tags: ['Notable Actions', 'Consistency'],
      headline: "Among the Legislature's most senior members, now Senate President Pro Tempore",
      facts: 'Harper has served in the Utah Legislature since 1997 (House through 2012, Senate since 2013), chairs the Senate Transportation, Public Utilities, Energy and Technology Committee, and holds the chamber’s President Pro Tempore post.',
      why: 'Sustained tenure and a peer-elected leadership role.',
      source: { label: 'Ballotpedia — Wayne Harper', url: 'https://ballotpedia.org/Wayne_Harper' } },
  ],
  dhinkins: [
    { impact: 'positive', category: 'rhetoric', date: '2019–present', tags: ['Consistency', 'Notable Actions'],
      headline: "Rancher-legislator pushing nuclear power to keep rural Utah's lights on",
      facts: 'Hinkins, who chairs the Senate Natural Resources, Agriculture & Environmental Quality Appropriations Subcommittee, has for years pressed to convert Emery County’s coal plants to nuclear and backed a molten-salt thorium reactor research project near the Hunter Power Plant, citing jobs and the risk of rolling blackouts as coal retires.',
      why: 'A consistent, openly stated energy priority tied directly to his district’s economy.',
      source: { label: "KSL — Molten salt reactor as Emery County's new coal", url: 'https://www.ksl.com/article/46489152/could-medical-isotopes-and-molten-salt-reactor-be-emery-countys-new-coal' } },
  ],
  sandra_hollins: [
    { impact: 'positive', category: 'transparency', date: '2014', tags: ['Notable Actions', 'Representation'],
      headline: 'First Black woman elected to the Utah Legislature',
      facts: 'Hollins was elected in November 2014 as the first Black woman to serve in the Utah Legislature, representing a Salt Lake City House district since 2015.',
      why: 'A documented historic milestone of representation.',
      source: { label: 'Wikipedia — Sandra Hollins', url: 'https://en.wikipedia.org/wiki/Sandra_Hollins' } },
    { impact: 'positive', category: 'voting', date: '2019–2022', tags: ['Notable Actions', 'Consistency'],
      headline: "Removed the slavery exception from Utah's constitution and made Juneteenth a state holiday",
      facts: 'Hollins sponsored H.J.R. 8 (2019), which voters approved as Constitutional Amendment C in 2020 to strike slavery-as-punishment language from Utah’s constitution; she also sponsored H.B. 238 (2022) establishing Juneteenth as a state holiday and the 2020 ban on knee-on-neck police restraints.',
      why: 'A sustained, enacted record matching her stated civil-rights priorities.',
      source: { label: 'Utah Legislature — H.J.R. 8 (2019)', url: 'https://le.utah.gov/~2019/bills/static/HJR008.html' } },
  ],
  aromero: [
    { impact: 'positive', category: 'voting', date: '2017–2020', tags: ['Notable Actions', 'Consistency'],
      headline: "Cleared Utah's rape-kit backlog and created the MMIR task force",
      facts: 'Romero sponsored H.B. 200 (2017), mandating testing and tracking of sexual-assault kits to clear Utah’s backlog, and H.B. 116 (2020) creating the state’s Murdered and Missing Indigenous Relatives task force, which she went on to chair.',
      why: 'Enacted, high-profile work that matches her stated victim-advocacy and Indigenous-justice priorities.',
      source: { label: 'Utah Legislature — H.B. 200 (2017)', url: 'https://le.utah.gov/~2017/bills/static/HB0200.html' } },
    { impact: 'positive', category: 'transparency', date: '2023–present', tags: ['Notable Actions', 'Representation'],
      headline: 'House Minority Leader and Shoshone-Bannock tribal member',
      facts: 'Romero has led Utah House Democrats as Minority Leader since January 2023 and is a member of the Shoshone-Bannock tribe.',
      why: 'A caucus-elected leadership role held consistently.',
      source: { label: 'Wikipedia — Angela Romero', url: 'https://en.wikipedia.org/wiki/Angela_Romero' } },
  ],
  tweiler: [
    { impact: 'positive', category: 'rhetoric', date: '2016–2023', tags: ['Notable Actions', 'Consistency'],
      headline: 'Author of Utah’s porn "public-health crisis" resolution and age-verification law — a model copied nationally',
      facts: 'Weiler sponsored S.C.R. 9 (2016) declaring pornography a public-health crisis and S.B. 287 (2023) requiring age verification on adult websites; both approaches were later adopted by many other states, and the age-verification model drew First Amendment litigation that reached the U.S. Supreme Court.',
      why: 'A signature agenda pursued consistently over years that measurably influenced other states.',
      source: { label: 'Utah Legislature — S.B. 287 (2023)', url: 'https://le.utah.gov/~2023/bills/static/SB0287.html' } },
  ],
  val_peterson: [
    { impact: 'positive', category: 'transparency', date: '2025–present', tags: ['Notable Actions'],
      headline: "House budget chief overseeing Utah's state budget",
      facts: 'Peterson, in the House since 2011, serves as House chair of the Executive Appropriations Committee, which crafts Utah’s state budget, and in 2025 sponsored H.B. 260 creating the First Credential Program to connect high-school students with industry-recognized credentials.',
      why: 'A documented record of fiscal leadership and enacted workforce policy.',
      source: { label: 'Utah Legislature — Executive Appropriations (2025)', url: 'https://le.utah.gov/committee/committee.jsp?com=APPEXE&year=2025' } },
  ],
  cory_maloy: [
    { impact: 'positive', category: 'voting', date: '2021', tags: ['Notable Actions'],
      headline: 'Authored the nation’s first all-industry regulatory "sandbox"',
      facts: 'Maloy sponsored H.B. 217 (2021), which expanded Utah’s industry-specific regulatory sandboxes into a first-in-the-nation, all-industry program and created the Office of Regulatory Relief.',
      why: 'A concrete, first-of-its-kind policy achievement matching his deregulation brand.',
      source: { label: 'Utah Legislature — H.B. 217 (2021)', url: 'https://le.utah.gov/~2021/bills/static/HB0217.html' } },
  ],
  stewart_e_barlow: [
    { impact: 'positive', category: 'voting', date: '2017', tags: ['Notable Actions', 'Consistency'],
      headline: "Physician-legislator who widened Utah's doctor pipeline",
      facts: 'Barlow, a practicing otolaryngologist, sponsored H.B. 396 (2017) creating an "associate physician" license that lets recent medical-school graduates practice under supervision — legislation drawing directly on his medical career.',
      why: 'Using firsthand professional expertise to legislate in the same field.',
      source: { label: 'Utah Legislature — H.B. 396 (2017)', url: 'https://le.utah.gov/~2017/bills/static/hb0396.html' } },
  ],
  hoang_nguyen: [
    { impact: 'positive', category: 'transparency', date: '2024', tags: ['Notable Actions', 'Representation'],
      headline: "Utah's first Vietnamese-American and first refugee legislator",
      facts: 'Nguyen, who resettled in the U.S. as a refugee from Vietnam, was elected in 2024 as the first Vietnamese-American and first refugee in the Utah Legislature, winning her Salt Lake County House seat with about 72% of the vote.',
      why: 'A documented milestone of representation.',
      source: { label: 'Northwest Asian Weekly', url: 'https://nwasianweekly.com/2024/12/nguyen-is-the-first-vietnamese-american-in-utah-state-legislature/' } },
  ],
  kay_christofferson: [
    { impact: 'positive', category: 'transparency', date: '2013–present', tags: ['Consistency', 'Notable Actions'],
      headline: 'Civil engineer who chairs the House Transportation Committee',
      facts: 'A registered civil engineer who worked with UDOT and UTA, Christofferson chairs the House Transportation Committee, where his engineering background informs a long record of transportation and transit legislation.',
      why: 'Sustained subject-matter leadership aligned with his profession.',
      source: { label: 'Utah Legislature — House Transportation Committee (2025)', url: 'https://le.utah.gov/committee/committee.jsp?year=2025&com=HSTTRA' } },
  ],
  kstratton: [
    { impact: 'positive', category: 'voting', date: '2025', tags: ['Notable Actions'],
      headline: 'Led Senate public-lands and resource-management legislation',
      facts: 'In his first Senate session, Stratton sponsored S.B. 51 (2025) adopting Utah’s updated statewide resource management plan and S.B. 158 (2025) on the acquisition of federally managed public lands — central pieces of the state-sovereignty-over-public-lands agenda.',
      why: 'A documented legislative focus matching his stated public-lands priorities.',
      source: { label: 'Utah Legislature — S.B. 51 (2025)', url: 'https://le.utah.gov/~2025/bills/static/SB0051.html' } },
  ],
};

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
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${id}: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

(async () => {
  console.log(`PolitiDex — strengthen thin Utah profiles  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  const ids = Array.from(new Set([...Object.keys(STANCE_ADDS), ...Object.keys(SPOTLIGHT_ADDS)]));
  let stanceWrites = 0, spotlightWrites = 0, touched = 0, missing = 0, skipped = 0;

  for (const id of ids) {
    let doc;
    try { doc = await getDoc(id); } catch (e) { console.log(`  ✗ ${id}: ${e.message}`); skipped++; continue; }
    if (!doc) { console.log(`  – ${id}: not in Firestore — skipped`); missing++; continue; }

    const fields = {};

    // Stances: merge, only adding keys that are not already present.
    const addS = STANCE_ADDS[id];
    if (addS) {
      const cur = (doc.stances && typeof doc.stances === 'object') ? { ...doc.stances } : {};
      const newKeys = [];
      for (const [k, v] of Object.entries(addS)) {
        if (!(k in cur)) { cur[k] = v; newKeys.push(k); }
      }
      if (newKeys.length) {
        fields.stances = cur;
        stanceWrites += newKeys.length;
        console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${newKeys.length} stance(s) -> ${newKeys.join(', ')}  [${Object.keys(cur).length} total]`);
      } else {
        console.log(`  = ${id} (${doc.name}): stances already present`);
      }
    }

    // Spotlight: write only if the doc has none yet.
    const addSL = SPOTLIGHT_ADDS[id];
    if (addSL) {
      const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
      if (existing.length === 0) {
        fields.spotlight = addSL;
        spotlightWrites += addSL.length;
        console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name}): +${addSL.length} spotlight item(s)`);
      } else {
        console.log(`  = ${id} (${doc.name}): spotlight already has ${existing.length} item(s) — left untouched`);
      }
    }

    if (Object.keys(fields).length) {
      fields.updatedAt = STAMP;
      if (APPLY) await patch(id, fields);
      touched++;
    }
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'}: ${stanceWrites} stance addition(s) + ${spotlightWrites} spotlight item(s) across ${touched} member(s).`);
  console.log(`(${missing} not in Firestore, ${skipped} error(s).)`);
  if (!APPLY) console.log('\nRe-run with --apply to write to Firestore.');
})();
