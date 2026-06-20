#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — June 2026 THREE-LAYER COMPLETION pass
//
// Finishes wiring the remaining current-sitting Utah State Legislators into the
// connected-evidence system. A legislator has a "full three-layer connection"
// when a single ISSUE_MAP issueKey is present in ALL THREE layers the evidence
// view (window._issueEvidenceMap) reads:
//   • Issue Position (ISSUE_STANCE_DATA)  — stance on the issue
//   • Promise        (roster promises[])   — a tracked promise on the issue
//   • Spotlight      (this doc's spotlight) — a recorded statement / action
//
// Going into this pass, 26 of the 40 curated legislators had at least one full
// connection. The remaining 14 were blocked ONLY on the Spotlight layer: their
// stance and promise already shared an issueKey, but no Spotlight item carried
// that key — either because an existing item was untagged, or because the item
// did not exist yet. This pass closes that gap two ways:
//
//   1) TAG existing items. Several blocked members already have a Spotlight
//      item ABOUT the target issue, authored and verified in earlier waves, that
//      simply lacks the issueKey. Tagging it connects the item with zero new
//      content. (One Eliason item is re-tagged from the narrower `health_mental`
//      to `healthcare` — the same key his stance and promise use — because his
//      correctional-health bill is a healthcare item and `health_mental` linked
//      to nothing in his record.)
//
//   2) AUTHOR new bill-grounded items. Where no existing item covered the target
//      issue, a single honest item is added, each anchored to a specific bill the
//      legislator CHIEF-sponsored, verified this pass against the official Utah
//      Legislature record (le.utah.gov bill pages / data feed): bill number,
//      exact short title, the named prime sponsor, and final status. Verona
//      Mauga's item also links the official House floor-video marker of her own
//      presentation (no timestamp is claimed because the marker page did not
//      expose a verifiable offset this pass — the marker itself seeks to her
//      segment).
//
// HONESTY (CONTENT_STYLE.md): every item is about the INDIVIDUAL's own bill and
// recorded action — never their party. Signed/again-status is a plain fact from
// the bill's own action history. No fabricated statements, bills, or timestamps.
// Bridger Bolinder is deliberately LEFT unconnected on housing: a full review of
// his chief-sponsored bills (2023–2026) found no verifiable housing-development
// record, so nothing is forced — his real focus is water/natural-resources, tax,
// and health, which his existing Spotlight items already reflect.
//
// Idempotent: a tag is applied only if the item lacks the key (or, for the one
// re-tag, still holds the old key); an authored item is appended only if no
// existing item already shares its headline. Safe to re-run.
//
//   node scripts/spotlight-three-layer-completion-jun2026.mjs            # dry run
//   node scripts/spotlight-three-layer-completion-jun2026.mjs --apply    # write
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');

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

const bill = (sess, num) => `https://le.utah.gov/~${sess}/bills/static/${num}.html`;
const floor = (marker) => `https://le.utah.gov/av/floorArchive.jsp?markerID=${marker}`;

// ── 1) TAG existing, already-verified items ─────────────────────────────────
// id    : Firestore document id
// match : a unique substring of the existing item's headline
// issueKey : the key that joins the item to the member's stance + promise
// from  : (optional) only re-tag if the item currently carries this key
const TAGS = [
  { id: 'jennifer_plumb',     match: 'Rural health-care funding bill (SB256)', issueKey: 'healthcare' },
  { id: 'kriebe',             match: "medically fragile",                       issueKey: 'public_schools' },
  { id: 'sandra_hollins',     match: 'Removed the slavery exception',           issueKey: 'rights_balance' },
  { id: 'carol_spackman_moss',match: 'IB advocacy into an enacted college-credit', issueKey: 'public_schools' },
  { id: 'jdailey',            match: 'Expanded Medicaid eligibility for Utahns with disabilities', issueKey: 'healthcare' },
  { id: 'doug_owens',         match: 'child-influencer protection law (HB322)', issueKey: 'privacy_rights' },
  { id: 'doug_owens',         match: 'Great Salt Lake and Clean Air caucuses',  issueKey: 'climate_action' },
  { id: 'nate_blouin',        match: 'signature grid bill (SB191)',             issueKey: 'climate_action' },
  { id: 'seliason',           match: 'correctional mental-health care bill',    issueKey: 'healthcare', from: 'health_mental' },
];

// ── 2) AUTHOR new, bill-grounded items ──────────────────────────────────────
// Each fact below was verified this pass on the official Utah Legislature site.
const AUTHORS = [
  // Lincoln Fillmore — school choice (stance + promise already on school_choice)
  { id: 'lfillmore', item: {
    date: '2024', impact: 'positive', category: 'voting', sourceType: 'official_bill_record',
    issueKey: 'school_choice',
    headline: 'Chief-sponsored SB44, merging Utah’s special-needs school scholarships',
    facts: 'Fillmore was the chief sponsor of S.B. 44 (2024), Alternative Education Scholarship Combination, which merged the Carson Smith and Special Needs Opportunity Scholarship programs into one, extended eligibility to home-school and preschool-aged students, and broadened allowable scholarship expenses. The bill was signed by the Governor on March 20, 2024.',
    why: 'School choice is the issue Fillmore’s profile leads with, and authoring the law that consolidated and expanded Utah’s special-needs scholarships is a concrete, enacted action that matches what he has promised and where he stands.',
    tags: ['Notable Actions'],
    source: { label: 'S.B. 44 (2024) — official bill record', url: bill('2024', 'SB0044') },
  }},
  // Candice Pierucci — school choice (House sponsor of the Utah Fits All law)
  { id: 'cpierucci', item: {
    date: '2023', impact: 'positive', category: 'voting', sourceType: 'official_bill_record',
    issueKey: 'school_choice',
    headline: 'Primary House sponsor of HB215, Utah’s school-choice scholarship law',
    facts: 'Pierucci was the primary House sponsor of H.B. 215 (2023), Funding for Teacher Salaries and Optional Education Opportunities, which established Utah’s school-choice scholarship program (the Utah Fits All Scholarship) alongside teacher salary funding. The bill was signed by the Governor on January 28, 2023.',
    why: 'Carrying the House version of Utah’s signature school-choice law is the clearest recorded action behind Pierucci’s stated position and promise on school choice — her own name on the bill that created the program.',
    tags: ['Notable Actions'],
    source: { label: 'H.B. 215 (2023) — official bill record', url: bill('2023', 'HB0215') },
  }},
  // Tyler Clancy — homelessness / housing support (no prior Spotlight items)
  { id: 'tclancy', item: {
    date: '2024', impact: 'positive', category: 'voting', sourceType: 'official_bill_record',
    issueKey: 'housing_support',
    headline: 'Chief-sponsored HB298, restructuring Utah’s homeless-services governance',
    facts: 'Clancy was the primary sponsor of H.B. 298 (2024), Homelessness Services Amendments, which reorganized the state’s homeless-services structure — including renaming the Utah Homelessness Council to the Utah Homeless Services Board and changing its membership. The bill was signed by the Governor on March 18, 2024.',
    why: 'A Provo police officer who works directly on homelessness, Clancy turned that focus into enacted law restructuring how Utah governs its homeless-services system — a recorded action matching the housing-support stance and promise his profile already carries.',
    tags: ['Notable Actions'],
    source: { label: 'H.B. 298 (2024) — official bill record', url: bill('2024', 'HB0298') },
  }},
  // Gay Lynn Bennion — public schools (no prior Spotlight items)
  { id: 'gay_lynn_bennion', item: {
    date: '2023', impact: 'positive', category: 'voting', sourceType: 'official_bill_record',
    issueKey: 'public_schools',
    headline: 'Chief-sponsored HB217, funding energy and water upgrades for public schools',
    facts: 'Bennion was the chief sponsor of H.B. 217 (2023), School Energy and Water Reductions, which authorized the Utah State Board of Education to issue grants to school districts and charter schools for projects that reduce school energy and water use, backed by a one-time $9.9 million appropriation. The bill was signed by the Governor on March 14, 2023.',
    why: 'A former educator, Bennion authored and passed a public-schools law directing real money to districts and charters — an enacted result, not just advocacy, on the public-education issue her stance and promise center on.',
    tags: ['Positive Leadership'],
    source: { label: 'H.B. 217 (2023) — official bill record', url: bill('2023', 'HB0217') },
  }},
  // Verona Mauga — government services (signed law + official floor video marker)
  { id: 'verona_mauga', item: {
    date: '2025', impact: 'positive', category: 'voting', sourceType: 'official_floor_video',
    issueKey: 'gov_services',
    headline: 'Chief-sponsored HB248, putting the state behind veterans charged for benefits help',
    facts: 'Mauga was the primary sponsor of H.B. 248 (2025), Veteran Protections Amendments, which made the Division of Consumer Protection responsible for enforcing civil penalties against people who unlawfully charge veterans for help obtaining VA benefits. She presented the bill on the House floor (Day 24 of the 2025 session); it was signed by the Governor on March 25, 2025.',
    why: 'A freshman legislator turning a constituent-protection idea into enacted law — with the state itself enforcing it — is a tangible government-services result that backs the stance and promise her profile already records.',
    tags: ['Notable Actions'],
    media: { type: 'video', label: 'Official Utah House floor video — 2025 General Session', url: floor('129726') },
    source: { label: 'H.B. 248 (2025) — official bill record', url: bill('2025', 'HB0248') },
  }},
  // Verona Mauga — small business / economy (bonus second connection, signed law)
  { id: 'verona_mauga', item: {
    date: '2026', impact: 'positive', category: 'voting', sourceType: 'official_floor_video',
    issueKey: 'econ_smallbiz',
    headline: 'Chief-sponsored HB172, easing food-safety compliance for food businesses',
    facts: 'Mauga was the primary sponsor of H.B. 172 (2026), Food Safety Amendments, which adjusted exemptions from food-service establishment requirements and extended the food-safety-manager certification renewal period from three years to five. She presented the bill on the House floor (Day 22 of the 2026 session); it was signed by the Governor on March 17, 2026.',
    why: 'Cutting a recurring compliance cost for food-service operators is a concrete small-business result, broadening Mauga’s enacted record into the economy issue her profile lists.',
    tags: ['Notable Actions'],
    media: { type: 'video', label: 'Official Utah House floor video — 2026 General Session', url: floor('133801') },
    source: { label: 'H.B. 172 (2026) — official bill record', url: bill('2026', 'HB0172') },
  }},
];

// ── Patcher ─────────────────────────────────────────────────────────────────
async function getDoc(id) {
  const r = await fetch(`${BASE}/${id}`);
  if (!r.ok) return null;
  const d = await r.json();
  const out = {};
  for (const [k, v] of Object.entries(d.fields || {})) out[k] = dec(v);
  return out;
}

async function patchSpotlight(id, spotlight) {
  const url = `${BASE}/${id}?updateMask.fieldPaths=spotlight`;
  const body = { fields: { spotlight: enc(spotlight) } };
  const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PATCH ${id} HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`);
}

async function run() {
  // group operations per document so each doc is written once
  const ids = [...new Set([...TAGS.map(t => t.id), ...AUTHORS.map(a => a.id)])];
  let tagged = 0, authored = 0, skipped = 0;
  const notes = [];

  for (const id of ids) {
    const doc = await getDoc(id);
    if (!doc) { notes.push(`✗ ${id}: document not found`); continue; }
    const spotlight = Array.isArray(doc.spotlight) ? doc.spotlight.map(s => ({ ...s })) : [];
    let changed = false;

    // tags
    for (const t of TAGS.filter(t => t.id === id)) {
      const it = spotlight.find(s => s && String(s.headline || '').includes(t.match));
      if (!it) { notes.push(`✗ ${id}: no item matching "${t.match}"`); continue; }
      if (t.from) {
        if (it.issueKey === t.from) { it.issueKey = t.issueKey; changed = true; tagged++; notes.push(`  ↻ ${id}: re-tagged "${t.match}" ${t.from} → ${t.issueKey}`); }
        else if (it.issueKey === t.issueKey) { skipped++; }
        else { notes.push(`• ${id}: "${t.match}" holds ${it.issueKey}, expected ${t.from} — left as is`); }
      } else {
        if (!it.issueKey) { it.issueKey = t.issueKey; changed = true; tagged++; notes.push(`  + ${id}: tagged "${t.match}" → ${t.issueKey}`); }
        else if (it.issueKey === t.issueKey) { skipped++; }
        else { notes.push(`• ${id}: "${t.match}" already holds ${it.issueKey} — left as is`); }
      }
    }

    // authored items
    for (const a of AUTHORS.filter(a => a.id === id)) {
      const exists = spotlight.some(s => s && String(s.headline || '').trim() === a.item.headline.trim());
      if (exists) { skipped++; continue; }
      spotlight.push(a.item);
      changed = true; authored++;
      notes.push(`  ★ ${id}: authored "${a.item.headline}" [${a.item.issueKey}]`);
    }

    if (changed && APPLY) await patchSpotlight(id, spotlight);
  }

  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — tagged ${tagged}, authored ${authored}, skipped ${skipped} (already done)`);
  notes.forEach(n => console.log(n));
  if (!APPLY) console.log('\nRe-run with --apply to write these changes to Firestore.');
}

run().catch(e => { console.error('error:', e.message); process.exit(1); });
