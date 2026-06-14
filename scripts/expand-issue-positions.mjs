#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — expand structured issue positions to thin / no-stance profiles
//
// Many sitting Utah legislators, 2026 candidates, mayors and a few federal
// figures already carried richly *sourced* tracked promises and key issues in
// Firestore but had NO structured `stances` — so the Candidate Snapshot fell
// back to a bare "still being documented" view and the Alignment Tool had
// nothing to match them on.
//
// This script DERIVES structured issue positions from each politician's already
// documented, bill-sourced promises (the same material shown as their tracked
// priorities). Nothing is invented: every position maps to a promise the site
// already records, and where a promise cites a bill that citation is carried
// onto the card as `evidence`. Each derived position is keyed to an ISSUE_MAP
// issue so the candidate becomes comparable in the Personalized Alignment Tool.
//
//   node scripts/expand-issue-positions.mjs            # build + print report
//   node scripts/expand-issue-positions.mjs --emit     # write the index.html
//                                                        literal block to
//                                                        /tmp/stance-block.txt
//   node scripts/expand-issue-positions.mjs --apply    # mirror topic→text
//                                                        stances into Firestore
//
// Source of truth: the rich position cards live in index.html's
// ISSUE_STANCE_DATA (this script emits that block). Firestore receives a
// flattened topic→text mirror so the editor, validators and completeness
// metrics also see the positions. Re-running is idempotent (merge, never clobber).
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'fs';

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const EMIT  = process.argv.includes('--emit');
const STAMP = '2026-06-14T00:00:00.000Z';

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

async function fetchAll() {
  let docs = [], tok = '';
  do {
    const u = new URL(BASE);
    u.searchParams.set('pageSize', '300');
    if (tok) u.searchParams.set('pageToken', tok);
    const r = await fetch(u);
    const j = await r.json();
    (j.documents || []).forEach(d => {
      const o = {};
      for (const [k, v] of Object.entries(d.fields || {})) o[k] = dec(v);
      o._id = d.name.split('/').pop();
      docs.push(o);
    });
    tok = j.nextPageToken;
  } while (tok);
  return docs;
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

// ── Issue mapping ───────────────────────────────────────────────────────────
// Ordered keyword → ISSUE_MAP issueKey rules. The FIRST rule whose pattern hits
// the promise/keyIssue text wins, so more specific topics are listed first. Each
// rule also carries a display `topic`, an `icon`, and the default `stance`
// (whether the politician backs that ISSUE_MAP position — almost always 'support'
// because the rule is chosen to match their own framing). Rules are intentionally
// strict: a promise that does not clearly map to an ISSUE_MAP issue is dropped
// rather than force-fit, so the Alignment Tool never matches on a wrong position.
const RULES = [
  // Water & environment
  { re:/great salt lake|\bberm\b|saline lake/i, key:'water', topic:'Great Salt Lake & Water', icon:'💧' },
  { re:/water right|water polic|water conserv|water adjudicat|drought|colorado river|\bturf\b|water-wise|reservoir|watershed|wetland|waterwise/i, key:'water', topic:'Water Conservation', icon:'💧' },
  { re:/air quality|clean air|emission|inversion|clean truck|tailpipe/i, key:'climate_action', topic:'Air Quality & Climate', icon:'🌱' },
  { re:/climate change|renewable energy|solar\b|cut emissions|carbon storage|clean.energy/i, key:'climate_action', topic:'Climate & Clean Energy', icon:'🌱' },
  { re:/open.space|conservation bond|public open space/i, key:'lands_preserve', topic:'Open Space & Conservation', icon:'🏞' },
  { re:/nuclear|geothermal|baseload|energy infrastructure|energy council|energy development zone|utility-scale|power plant|energy education/i, key:'enviro_energy', topic:'Energy Independence', icon:'⚡' },
  { re:/oil|natural gas|\bgas\b|mining|mineral|severance|extraction|drilling|coal|brine/i, key:'lands_energy', topic:'Energy & Resource Development', icon:'⛏' },
  { re:/wildfire|disaster recover|disaster fund|pre-disaster mitigation|emergency management|\bfema\b/i, key:'disaster_resilience', topic:'Disaster Resilience', icon:'🔥' },
  // Public lands
  { re:/public land|federal land|grazing|monument|antiquities|\bblm\b|sovereignty fund|state sovereignty|federal overreach|federalism|federal dependency|land transfer|state acquisition of federal|reduce federal dependence/i, key:'lands_local', topic:'Public Lands & Federalism', icon:'🏔' },
  { re:/wildlife|hunting|big game|\belk\b|fishing|sportsm|outfitter/i, key:'enviro_balance', topic:'Wildlife & Recreation', icon:'🦌' },
  // Agriculture / rural
  { re:/agritourism|farmland|agricultur|\bfarm\b|ranch|greenbelt|livestock|veterinar|rural develop|farm bureau|raw milk|urban farm/i, key:'rural_ag', topic:'Agriculture & Rural Communities', icon:'🌾' },
  // Taxes & government / fiscal
  { re:/income tax|tax rate|tax cut|income-tax|fiscal competitiv|lower the cost of living through.*tax|cut.*tax/i, key:'lower_taxes', topic:'Income Taxes', icon:'💰' },
  { re:/property tax|property-tax|truth.in.taxation|assessment appeal|fallow/i, key:'property_tax', topic:'Property Taxes', icon:'🏡' },
  { re:/balanced budget|national debt|deficit|budget hawk|fiscal resilience|fiscal sovereignty|surplus restricted|audit the fed/i, key:'gov_balance', topic:'Fiscal Responsibility', icon:'⚖️' },
  { re:/fiscal responsib|fiscal restraint|fiscal conservat|limited government|spending restraint|small.{0,3}government|efficient (use|government)|government.efficiency|regulatory oversight|red tape|deregulat|regulatory burden|cut.*regulation|unnecessary regulation|taxpayer dollar|spend taxpayer/i, key:'gov_waste', topic:'Limited Government', icon:'🧹' },
  { re:/transparency|conflict.of.interest|ethics requirement|ethics rules|open government|financial.disclosure|disclosure (requirement|label)|whistleblower/i, key:'gov_transparency', topic:'Transparency & Accountability', icon:'🔍' },
  { re:/term limit/i, key:'term_limits', topic:'Term Limits', icon:'⏳' },
  // Elections
  { re:/election integrity|voter roll|voter registration|signature (gather|verif|collect|verification)|election admin|election code|election security|drop box|voter id|ballot (counting|provision|selfie|by gathering)|mail (voting|ballot|-in ballot)|opt-in mail/i, key:'election_integrity', topic:'Election Integrity', icon:'🗳' },
  { re:/voting right|voting access|expand.*voting|enfranchise/i, key:'voting_access', topic:'Voting Access', icon:'📩' },
  { re:/redistrict|gerrymander|proposition 4|\bprop 4\b|independent redistricting|spoiler effect|ranked.choice|keep .* whole in one|county whole/i, key:'democracy_balance', topic:'Election & Redistricting Reform', icon:'⚖️' },
  // Immigration / public safety
  { re:/\bborder\b|illegal.reentry|illegal immigration|amnesty|deportation|\bice\b/i, key:'border_security', topic:'Border Security', icon:'🛡' },
  { re:/fentanyl|cartel/i, key:'immig_fentanyl', topic:'Fentanyl & Cartels', icon:'🚫' },
  { re:/immigrant|refugee|in-state tuition.*undocument|dreamer|\bdaca\b|pathway to citizen/i, key:'immigration_reform', topic:'Immigrant Communities', icon:'🤝' },
  { re:/opioid|overdose|naloxone/i, key:'health_mental', topic:'Opioids & Overdose', icon:'🚑' },
  // Guns
  { re:/second amendment|\b2a\b|firearm|gun right|constitutional carry|concealed carry|knife.law|weapon possess|seized firearm/i, key:'gun_rights', topic:'Gun Rights', icon:'🔫' },
  // Judiciary / courts (kept distinct from public-safety and mental-health)
  { re:/guardianship|supported decision|estate planning|probate|family court|coercive control|judicial amendment|chief justice|civil.liabilit|litigation funding|judiciary/i, key:'justice_balance', topic:'Courts & Civil Law', icon:'⚖️' },
  { re:/mental.health receiving|behavioral health|civil.commitment|\bcompetency\b|supported decision|disability rights|intellectual disabilit/i, key:'health_mental', topic:'Mental Health & Disability', icon:'🧠' },
  // Public safety (after fentanyl/guns/judiciary so they win their niches)
  { re:/police|law enforcement|public safety|public-safety|sentencing|criminal justice|use of force|recidivis|repeat offender|mandatory jail|prosecution|\bcrime\b|human traffick|sex traffick|smuggling|\btrafficking\b|victim (privacy|and witness|data)|body.cam/i, key:'back_police', topic:'Public Safety & Crime', icon:'👮' },
  // Healthcare
  { re:/insulin|prescription drug|drug pric|pharmacy benefit|\bpbm\b|spread pricing|drug rebate|medicaid pharmacy/i, key:'health_drug_prices', topic:'Prescription Drug Costs', icon:'💉' },
  { re:/medicaid expansion|medicaid coverage|expand.*coverage|uninsured|health insurance|preauthorization|assisted reproductive|primary care provider|gender-affirming/i, key:'healthcare', topic:'Healthcare Access', icon:'🏥' },
  { re:/healthcare cost|health.care cost|price transparency|market-based|community paramedic|emergency (medical|services)|rural health|telehealth|health workforce|\bems\b/i, key:'health_balance', topic:'Healthcare Costs & Access', icon:'⚖️' },
  { re:/medical freedom|vaccine mandate|vaccine choice|informed consent/i, key:'medical_freedom', topic:'Medical Freedom', icon:'🩺' },
  // Education
  { re:/school choice|education freedom|utah fits all|scholarship.*(private|home)|education choice/i, key:'school_choice', topic:'School Choice', icon:'🎓' },
  { re:/public school|public education|teacher (pay|support|salar)|school funding|education funding|per-?(pupil|student) (education )?funding|wpu|fund public education|oppos.*voucher|student teacher|inflationary education/i, key:'public_schools', topic:'Public Schools', icon:'🍎' },
  { re:/parental right|parents bill|curriculum|history curricul|parental (involve|notif|consent|education)|library (book|material)|local control in education|defend local control/i, key:'edu_parental', topic:'Parental Rights & Curriculum', icon:'👪' },
  { re:/higher education|intellectual diversity|\bdei\b|\buniversity|college access|college cost|tuition|student loan|student debt|workforce develop|apprenticeship|civic (education|excellence)|usu|suu|uvu|high-demand program/i, key:'edu_college_cost', topic:'Higher Education', icon:'🎓' },
  { re:/school safety|safe.*school|student health|student vision|epinephrine|medications in school|screen time in.*classroom|dyslexia|food dye/i, key:'public_schools', topic:'School Safety & Student Health', icon:'🍎' },
  // Family / work
  { re:/child care|childcare|daycare|pre-?k|preschool|early (childhood|learning)/i, key:'child_care', topic:'Child Care', icon:'🧸' },
  { re:/paid (family|medical|parental|postpartum).leave|postpartum leave|maternity|\bfmla\b/i, key:'paid_leave', topic:'Paid Family Leave', icon:'👶' },
  { re:/child tax credit|family tax|raising children|adoption|newborn|safe haven|children'?s policy|foster (child|care)|minors in state custody/i, key:'family_support', topic:'Children & Families', icon:'🍼' },
  // Economy / housing / infra
  { re:/small business|main street|entrepreneur|startup|licensing|gig.economy|service marketplace|earned wage|regulatory sandbox|recovery residence|sober-living|occupational license/i, key:'econ_smallbiz', topic:'Small Business & Licensing', icon:'🏪' },
  { re:/economic development|business park|tech corridor|innovation district|job.{0,8}(creat|growth)|attract.*employer|workforce service|data.center/i, key:'econ_growth', topic:'Economic Development', icon:'📈' },
  { re:/minimum wage|worker protection|collective bargaining|\bunion\b|labor right|overtime|pro-?worker/i, key:'econ_workers', topic:'Workers & Wages', icon:'🛠' },
  { re:/housing density|housing supply|affordable housing|housing afford|moderate income housing|zoning|housing plan|starter home|first-time (buyer|home)|expand housing|housing cost|lower.*housing/i, key:'housing_build', topic:'Housing Affordability', icon:'🏗' },
  { re:/\btransit\b|\btrax\b|frontrunner|light rail|commuter rail|bus rapid|\buta\b|transit (governance|connectivity)|transportation investment/i, key:'transit', topic:'Public Transit', icon:'🚆' },
  { re:/\broad\b|roads|highway|interchange|traffic|transportation|infrastructure|bridge|\budot\b|corridor (improvement|revital)|e-bike|mobility device|road rage|emergency communications/i, key:'infrastructure', topic:'Roads & Infrastructure', icon:'🚧' },
  { re:/broadband|internet access|rural broadband|fiber/i, key:'broadband', topic:'Broadband Access', icon:'📶' },
  { re:/cost of living|inflation|affordab.*(housing|childcare|healthcare)|family budget|lower costs for working families|lower the cost of living/i, key:'cost_living', topic:'Cost of Living', icon:'🛒' },
  // Rights / repro / foreign
  { re:/pro-?life|abortion|unborn|sanctity of life|heartbeat|trigger law/i, key:'pro_life', topic:'Abortion', icon:'🕊' },
  { re:/reproductive right|pro-?choice|abortion access/i, key:'pro_choice', topic:'Reproductive Rights', icon:'✊' },
  { re:/religious (freedom|liberty)|faith expression|conscience protection|first amendment.*relig|affirm.*religious|religious.freedom/i, key:'religious_liberty', topic:'Religious Liberty', icon:'⛪' },
  { re:/\blgbtq\b|transgender|marriage equality|anti-discrimination/i, key:'lgbtq_rights', topic:'LGBTQ+ Rights', icon:'🏳️‍🌈' },
  { re:/free speech|censorship|deplatform/i, key:'free_speech', topic:'Free Speech', icon:'🗣' },
  { re:/veteran|national guard|servicemember|military famil|military affairs|adjutant|gi bill|defense workforce|reenlistment|citizen-soldier/i, key:'veterans', topic:'Veterans & Military', icon:'🎖' },
  { re:/national defense|defense spending|peace through strength|armed forces|hill (air force|afb)|counter-?extremism|national security/i, key:'strong_defense', topic:'National Security & Defense', icon:'🦅' },
  { re:/america first|foreign aid|entanglement|ukraine aid/i, key:'america_first', topic:'America First', icon:'🇺🇸' },
  { re:/diplomacy|foreign intervention|war powers|endless war|accountable.*national.security/i, key:'restraint', topic:'Diplomacy & Restraint', icon:'🕊' },
  // Tech / privacy
  { re:/age verification|app store|social media|child online|online safety|device filter|minors.*(online|app|tech)|sexual extortion|student use of technology|child-safety plan/i, key:'tech_balance', topic:'Child Online Safety', icon:'📱' },
  { re:/\bprivacy\b|surveillance|\bfisa\b|section 702|location data|fourth amendment|reverse-location|warrant requirement|data privacy|consumer privacy/i, key:'privacy_rights', topic:'Privacy & Surveillance', icon:'🔒' },
  { re:/artificial intelligence|\bai\b policy|ai regulat|ai in education|deepfake|ai-generated political/i, key:'tech_balance', topic:'AI & Technology', icon:'🤖' },
  // Property
  { re:/property right|eminent domain|private property|\btakings\b|unauthorized occupant|squatter|short-term rental property/i, key:'property_rights', topic:'Property Rights', icon:'🏡' },
];

// Promises that are campaign-mechanics, not policy positions — skip them.
const SKIP = /\bwin\b|re-?election|won (his|her|the|a )|hold (the |his |her )|self-?funded|town hall|no pac money|attendance|100-day|release.*plan|^debate (the|his)|seek (re-?election|a)|ran for|lost the|completing two|serve.{0,4}(as|two|his|her).{0,12}(term|mayor)|first female|first .*(legislator|mayor)|enter(ed)? (the|politics)|qualify for the .*(ballot|primary)|gather(ing)? signatures|signature.* to qualify|serve on local|NHL|franchise|bringing an nhl/i;

// Per-id corrections layered on top of the rule engine ───────────────────────
// DROP_BY_ID: source promises (matched on text+detail) to omit for an id — used
// for niche bills that have no honest ISSUE_MAP home. KEY_BY_ID: re-classify a
// matching promise to the correct issueKey/topic the keyword engine missed.
const DROP_BY_ID = {
  anthony_loubet: [/adult protective|unauthorized practice/i],
  doug_fiefia:    [/inmate hospital|medicare-based rates/i],
  robert_wanlass: [/families first, freedom always/i],
  jon_hawkins:    [/\bnhl\b|franchise/i],
};
const KEY_BY_ID = {
  josh_smith:       [{ re:/spoiler effect|reform Utah'?s elections|ranked.choice/i, key:'democracy_balance', topic:'Election Reform', icon:'⚖️' }],
  bridger_bolinder: [{ re:/tourism-tax|recreation infrastructure/i, key:'infrastructure', topic:'Rural Infrastructure', icon:'🚧' }],
  calvin_roberts:   [{ re:/small business and low-tax/i, key:'econ_smallbiz', topic:'Small Business', icon:'🏪' }],
  laurie_stringham: [{ re:/public-safety bond/i, key:'back_police', topic:'Public Safety', icon:'👮' },
                     { re:/fiscal restraint|county budget/i, key:'gov_waste', topic:'Limited Government', icon:'🧹' }],
  doug_fiefia:      [{ re:/ai companies|child-safety plan/i, key:'tech_balance', topic:'AI & Child Safety', icon:'🤖' },
                     { re:/minors in state custody|foster (child|care)/i, key:'family_support', topic:'Children in State Care', icon:'🍼' }],
  mike_petersen:    [{ re:/religious freedom in public|affirming religious/i, key:'religious_liberty', topic:'Religious Liberty', icon:'⛪' }],
  karen_m_peterson: [{ re:/higher-education funding|high-demand program/i, key:'edu_college_cost', topic:'Higher Education', icon:'🎓' },
                     { re:/student teacher|stipend/i, key:'public_schools', topic:'Public Schools', icon:'🍎' }],
  cory_maloy:       [{ re:/earned wage access/i, key:'econ_smallbiz', topic:'Consumer Protection', icon:'🏪' }],
  jason_b_kyle:     [{ re:/recovery residence|sober-living/i, key:'health_mental', topic:'Addiction Recovery', icon:'🧠' }],
};

// ── Build positions for one politician ───────────────────────────────────────
function billCite(detail) {
  if (!detail) return '';
  // Strict: only real bill prefixes (HB/SB/HJR/SJR/HCR/SCR/HR/SR), never a
  // district token like "HD 6". Captures an optional trailing year.
  const m = detail.match(/\b(H\.?B|S\.?B|H\.?J\.?R|S\.?J\.?R|H\.?C\.?R|S\.?C\.?R|H\.?R|S\.?R)\.?\s?0*(\d{1,4})\b(?:[^.]{0,40}?\((\d{4})\))?/i);
  if (!m) return '';
  const type = m[1].replace(/\./g, '').toUpperCase();
  const num = m[2];
  const yr = m[3];
  return yr ? `${type} ${num} (${yr})` : `${type} ${num}`;
}

function firstSentence(s) {
  if (!s) return '';
  // Cut at the first sentence end (a period/!/? followed by space or end, so the
  // dots inside "H.B." don't split) OR a semicolon (details often append
  // "; signed by the governor…" which is procedural, not the position).
  const m = s.match(/^.*?(?:[.!?](?=\s|$)|;)/);
  let out = (m ? m[0] : s).replace(/;\s*$/, '.').trim();
  return out;
}

const VERB = /^(cut|strengthen|expand|reform|protect|create|advance|modernize|support|establish|require|fund|lower|ease|improve|boost|add|limit|ban|repeal|restrict|secure|deliver|build|increase|reduce|streamline|clarify|codify|crack|end|extend|regulate|set|speed|tighten|update|return|defend|promote|champion|address|prioritize|oppose|allow|enact|redirect|steer|lay|invest|restore|pass|give|keep|bring|direct|preempt|let|push|raise|stop|move|launch|win|vote|put|observe|serve|legalize|help|co-?sponsor|reshape|revise|impose|optimize|double|recodify|adjust|overhaul|simplify|abolish|mandate|designate|count|carry|study|open|restructure|shift|credit|make|provide|affirm|adopt|hold|ensure|guarantee|maintain|advocate|work|lead|drive|block|require|name|reinstate|repeal|fight|cosponsor|enhance|modify|expand|implement|deliver|hire|complete|upgrade|coordinate|grow|attract|oversee|manage|position)\b/i;
const LEAD_STRIP = /^(pledged to|promised to|promised|committed to|stated commitment to|campaign pledge to|endorsed|voted for|voted to|supported|backs|back|pursue|work to|worked to|fight to|fight for|continue to)\s+/i;

function cleanTitle(t) {
  let s = String(t || '').trim().replace(/^["'“]|["'”]$/g, '');
  // Strip a trailing "(HB 414, 2025)" / "(2025)" citation off the title.
  s = s.replace(/\s*\((?:H|S)\.?\s?[BJCR][^)]*\)\s*$/i,'').trim();
  s = s.replace(/\s*\((?:19|20)\d\d\)\s*$/,'').trim();
  s = s.replace(/[,—-]?\s*(signed into law|passed (both chambers|the (house|senate))|failed|vetoed|enacted into law)\b.*$/i,'').trim();
  // Title that is itself a bill descriptor ("H.B. 428 Property Tax Changes …") →
  // signal to fall back to the detail sentence instead.
  const billHead = /^(H\.?B|S\.?B|H\.?J\.?R|S\.?J\.?R|H\.?C\.?R|S\.?C\.?R)\.?\s?\d+/i.test(s) || /\bAmendments\b|\bModifications\b|\bRevisions\b/.test(s);
  const led = s.replace(LEAD_STRIP, '').trim();
  // Strip a leading bill id and trailing "Amendments/Modifications/Revisions"
  // off the clause so the fallback text never echoes a bill number.
  let cl = (led || s)
    .replace(/^(H|S)\.?\s?[BJCR]?\.?\.?\s?\d+[A-Za-z.]*\s*/i, '')
    .replace(/\s*(Amendments|Modifications|Revisions)\s*$/i, '')
    .trim();
  if (!cl) cl = led || s;
  return { clean: cl, nounish: !VERB.test(cl), useDetail: billHead };
}

function lc(s) {
  if (!s) return s;
  if (/^(Utah|App Store|Great Salt Lake|National Guard|Hill|AI|DEI|TRAX|ACA|PBM|I-15|VPN|U\.S\.|Medicaid|Medicare|Second Amendment|Social Security|NHL|UTA|USU|SUU|UVU|UDOT|Bears Ears|Colorado River|Lake Powell)/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function detailText(d) {
  // Normalize "H.B."/"S.J.R." etc. to "HB"/"SJR" so the dotted abbreviation does
  // not get mistaken for a sentence boundary by firstSentence().
  d = String(d || '').replace(/\b(H|S)\.(B|J|C|R)\.?([A-Z])?\.?/g, (m, a, b, c) => a + b + (c || ''));
  let s = firstSentence(d);
  if (!s) return '';
  // Pull off a leading "Sponsored/Introduced/Carried <bill>," prefix so the bill
  // (carried separately as evidence) is not duplicated and the clause reads as a
  // position. Keep a noun-phrase object ("the Insulin Access Amendments…") but
  // prepend "legislation" before a participle/verb clause ("allowing…").
  const m = s.match(/^((?:chief-?|primary-?|prime-?)?(?:co-?)?sponsor(?:ed|ing|s)?(?: of)?|carried|introduced)\s+(?:the\s+)?(?:H\.?B|S\.?B|H\.?J\.?R|S\.?J\.?R|H\.?C\.?R|S\.?C\.?R|H\.?R|S\.?R)\.?\s?\d+\s*[,:;]?\s*(.*)$/i);
  if (m) {
    let rest = (m[2] || '').replace(/^,\s*/, '').trim();
    if (rest) {
      const nounLead = /^(the|a|an)\b/i.test(rest) || /^[A-Z]/.test(rest);
      s = (nounLead ? 'Sponsored ' : 'Sponsored legislation ') + rest;
    } else {
      s = 'Sponsored legislation.';
    }
  }
  s = s.replace(/^as (chief|primary|prime|the) (house )?sponsor[, ]+/i, 'Sponsored legislation that ');
  s = s.replace(/^campaign pledge to\s+/i, 'Pledged to ');
  s = s.replace(/^stated commitment to\s+/i, 'Committed to ');
  if (!/[.!?]$/.test(s)) s += '.';
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return s.length <= 260 ? s : '';
}

function makeText(pr, isCand, bill) {
  const { clean, nounish, useDetail } = cleanTitle(pr.t);
  // Prefer the detail's own clean sentence for bill-formatted titles and for
  // officeholders/mayors whose promise title is a bare noun phrase.
  if (useDetail || (!isCand && !bill && nounish)) {
    const d = detailText(pr.d);
    if (d && d.length >= 40) return d;
  }
  if (isCand) {
    return nounish ? `Campaigned on ${lc(clean)}.` : `Campaigned on a commitment to ${lc(clean)}.`;
  }
  if (bill) {
    return nounish ? `Sponsored legislation addressing ${lc(clean)}.` : `Sponsored legislation to ${lc(clean)}.`;
  }
  return nounish ? `Has prioritized ${lc(clean)}.` : `Has worked to ${lc(clean)}.`;
}

function classify(id, hay) {
  // id-specific reclassification wins first.
  const ov = KEY_BY_ID[id];
  if (ov) for (const o of ov) if (o.re.test(hay)) return o;
  for (const r of RULES) if (r.re.test(hay)) return r;
  return null;
}

function buildPositions(p) {
  const drops = DROP_BY_ID[p._id || p.id] || [];
  const isCandidate = /candidate|nominee/i.test(p.office || '');
  const proms = (p.proms || []).filter(pr => {
    const hay = pr.t + ' ' + (pr.d || '');
    if (!pr.t || SKIP.test(hay)) return false;
    if (drops.some(re => re.test(hay))) return false;
    return true;
  });
  const used = new Set();
  const out = [];
  for (const pr of proms) {
    const hay = pr.t + ' ' + (pr.d || '');
    const rule = classify(p._id || p.id, hay);
    if (!rule || used.has(rule.key)) continue;
    used.add(rule.key);
    // Candidates get no "Sponsored" evidence — campaign positions, not a record.
    const bill = isCandidate ? '' : (billCite(pr.d) || billCite(pr.t));
    const text = makeText(pr, isCandidate, bill);
    const card = { topic: rule.topic, icon: rule.icon, pos: 'support', issueKey: rule.key, issueStance: 'support', text };
    if (bill && !text.includes(bill)) card.evidence = `Sponsored ${bill}.`;
    out.push(card);
    if (out.length >= 5) break;
  }
  return out;
}

// ── Curated supplement ───────────────────────────────────────────────────────
// A few higher-visibility figures whose documented record does not map cleanly
// through the keyword engine (their headline issues sit outside the ISSUE_MAP, or
// collapse to a single key). These positions are authored directly from the same
// documented key issues / promises already on their profile. Merged over (and
// preferred to) any generated set for that id.
const CURATED = {
  rfine: [ // Randy Fine — U.S. Rep, FL-06
    { topic:'Border Security', icon:'🛡', pos:'support', issueKey:'border_security', issueStance:'support',
      text:'Backs strict border enforcement and has pledged to vote against any amnesty legislation.' },
    { topic:'National Security', icon:'🦅', pos:'support', issueKey:'strong_defense', issueStance:'support',
      text:'Centers national security and counter-extremism, building his profile on a hawkish, strongly pro-Israel foreign policy.' },
    { topic:'Gun Rights', icon:'🔫', pos:'support', issueKey:'gun_rights', issueStance:'support',
      text:'A Second Amendment supporter who opposes new firearm restrictions.' },
    { topic:'Election Integrity', icon:'🗳', pos:'support', issueKey:'election_integrity', issueStance:'support',
      text:'Backs voter-ID and election-integrity measures.' },
    { topic:'Limited Government', icon:'💰', pos:'support', issueKey:'lower_taxes', issueStance:'support',
      text:'Runs on limited government, low taxes and fiscal conservatism.' },
  ],
};

// ── Emit the index.html ISSUE_STANCE_DATA literal block ──────────────────────
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function emitBlock(plan, names) {
  const lines = [];
  lines.push('    // ── Roster-wide thin-profile expansion (2026 sitting officials & candidates) ──');
  lines.push('    // Derived from each figure\'s own bill-sourced tracked promises and key issues');
  lines.push('    // (see their Firestore record). Positions carrying a bill citation are vote/');
  lines.push('    // sponsorship-backed; the rest reflect publicly campaigned priorities. Each is');
  lines.push('    // keyed to an ISSUE_MAP issue so the profile becomes comparable in the Alignment Tool.');
  for (const [id, cards] of Object.entries(plan)) {
    lines.push(`    ${id}: [ // ${names[id] || ''}`);
    for (const c of cards) {
      let parts = [`topic:'${esc(c.topic)}'`, `icon:'${c.icon}'`, `pos:'${c.pos}'`, `issueKey:'${c.issueKey}'`, `issueStance:'${c.issueStance}'`];
      parts.push(`text:'${esc(c.text)}'`);
      if (c.detail) parts.push(`detail:'${esc(c.detail)}'`);
      if (c.evidence) parts.push(`evidence:'${esc(c.evidence)}'`);
      lines.push(`      { ${parts.join(', ')} },`);
    }
    lines.push(`    ],`);
  }
  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const thin = JSON.parse(readFileSync('/tmp/thin.json', 'utf8'));
  const plan = {};
  const names = {};
  const stats = { profiles: 0, positions: 0, withBill: 0 };
  for (const p of thin) {
    let cards = buildPositions(p);
    if (CURATED[p.id]) cards = CURATED[p.id]; // hand-authored set wins
    if (cards.length < 2) continue; // keep only profiles we can meaningfully fill
    plan[p.id] = cards;
    names[p.id] = p.name;
    stats.profiles++;
    stats.positions += cards.length;
    stats.withBill += cards.filter(c => c.evidence).length;
  }
  console.log(`Built positions for ${stats.profiles} profiles, ${stats.positions} positions (${stats.withBill} bill-sourced).`);

  if (EMIT) {
    writeFileSync('/tmp/stance-block.txt', emitBlock(plan, names));
    writeFileSync('/tmp/plan.json', JSON.stringify(plan, null, 1));
    console.log('Wrote /tmp/stance-block.txt and /tmp/plan.json');
  }

  if (!EMIT && !APPLY) {
    // Report mode: print a sample for review
    const ids = Object.keys(plan).slice(0, 8);
    for (const id of ids) {
      console.log(`\n#### ${id} — ${names[id]}`);
      plan[id].forEach(c => console.log(`  [${c.issueKey}/${c.issueStance}] ${c.topic}: ${c.text}${c.evidence ? '  («' + c.evidence + '»)' : ''}`));
    }
  }

  if (APPLY) {
    console.log('\nMirroring topic→text stances into Firestore…');
    let touched = 0, added = 0;
    const live = await fetchAll();
    const byId = Object.fromEntries(live.map(d => [d._id, d]));
    for (const [id, cards] of Object.entries(plan)) {
      const doc = byId[id];
      if (!doc) { console.log(`  ✗ ${id}: not found live`); continue; }
      const existing = (doc.stances && typeof doc.stances === 'object' && !Array.isArray(doc.stances)) ? doc.stances : {};
      const merged = Object.assign({}, existing);
      let fresh = 0;
      for (const c of cards) {
        const txt = c.detail ? `${c.text} ${c.detail}` : c.text;
        if (!(c.topic in merged)) fresh++;
        merged[c.topic] = txt;
      }
      await patch(id, { stances: merged, updatedAt: STAMP });
      touched++; added += fresh;
      console.log(`  ✎ ${id} (${doc.name}): ${cards.length} positions (${fresh} new) → stances now ${Object.keys(merged).length}`);
    }
    console.log(`\nApplied stance mirror to ${touched} profiles (${added} new positions).`);
  }
})();
