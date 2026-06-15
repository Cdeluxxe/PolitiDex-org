#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — add sourced signature pull-quotes to profiles missing them
//
// A database review found ~76 politician profiles with no `quote`. The profile
// modal and the browse cards both hide the quote area gracefully when empty, so
// nothing looked broken — but the missing quotes made many profiles feel less
// human. This script backfills REAL, verifiable pull-quotes (with a short source
// note) onto the live Firestore `politicians` documents that index.html reads at
// runtime, prioritizing high-visibility officials, sitting officeholders, and
// active 2026 candidates.
//
//   node scripts/add-pull-quotes.mjs            # dry run (default)
//   node scripts/add-pull-quotes.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated quotes. Every quote below is a verbatim, on-the-record
//     statement the politician actually said or wrote, confirmed at the cited
//     `source` URL during research. Wording is preserved; only trimming (with an
//     ellipsis) was applied, never paraphrase.
//   • `quote`        — the verbatim pull-quote shown on the card and in the modal.
//   • `quoteSource`  — a short attribution note rendered under the quote.
//   • `source`       — the URL/outlet the quote was verified against (kept here
//                      for provenance; not written to the document).
//   • Idempotent: each run re-fetches the live doc and only adds a quote where the
//     document currently has none, so it is safe to re-run and never clobbers a
//     quote an editor has since written by hand.
//   • Profiles for which no genuine, distinctive quote could be verified are left
//     untouched (the quote area keeps hiding gracefully).
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-15T00:00:00.000Z';

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

// ── Verified pull-quotes ────────────────────────────────────────────────────
// Each quote was confirmed verbatim at its `source` URL during research.
const PLAN = [
  // ── High-visibility officials & notable former leaders ──────────────────
  { id: 'moaks', quote: "Outcomes-based governance like the UN's [Sustainable Development Goals] and ESG opens the door to authoritarianism. It is Satan's plan.", quoteSource: 'Speaking at the 2023 Salt Lake County GOP convention', source: { label: 'Gizmodo', url: 'https://gizmodo.com/esg-is-satan-s-plan-utah-treasurer-marlo-oaks-says-1850237962' } },
  { id: 'bking', quote: "I'm a Democrat because of my faith, not despite it.", quoteSource: 'From a 2024 campaign ad for governor', source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2024/04/25/brian-king-says-faith-drives-campaign-to-unseat-utah-governor-spencer-cox/' } },
  { id: 'fgibson', quote: 'Serving in the House has been the honor of a lifetime and I could not be more proud of the work my colleagues and I have accomplished.', quoteSource: 'On resigning as House Majority Leader, 2021', source: { label: 'Utah House of Representatives', url: 'https://house.utleg.gov/wp-content/uploads/2021/10/Gibson-Press-Release.pdf' } },
  { id: 'ddamschen', quote: 'I am humbled by this opportunity to serve Utah and its residents.', quoteSource: 'On his 2015 appointment as state treasurer', source: { label: 'Utah Office of State Treasurer', url: 'https://treasurer.utah.gov/featured-news/governor-appoints-david-damschen-as-new-state-treasurer/' } },
  { id: 'dramsey', quote: "I love serving as mayor of South Jordan and am very proud of all we've accomplished.", quoteSource: 'To Utah Business, 2024', source: { label: 'Utah Business', url: 'https://www.utahbusiness.com/awards-and-rankings/2024/05/28/dawn-r-ramsey-30-women-to-watch-2024/' } },
  { id: 'slockhart', quote: 'I will not be bullied or intimidated by radical groups who want to push their high-density, anti-family, and anti-police agenda.', quoteSource: 'As Orem mayor, to KUTV, 2023', source: { label: 'KUTV', url: 'https://kutv.com/news/local/orem-mayor-david-young-assaulted-after-city-council-meeting-suspect-linnea-pugmire-arrested-spit-on-public-official-provo-daily-herald' } },

  // ── Sitting state senators & notable representatives ────────────────────
  { id: 'spitcher', quote: 'At its core, this bill moves us away from wealth-based pretrial detention towards a pretrial process that focuses on risk.', quoteSource: 'On her 2021 bail-reform bill', source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2021-11-11/utah-legislature-passes-bail-reform-compromise-bill' } },
  { id: 'kivory', quote: 'This is clearly out of balance. It clearly undermines the founding principles of our nation.', quoteSource: 'On federal control of Western public lands, to the Salt Lake Tribune', source: { label: 'The Salt Lake Tribune', url: 'https://archive.sltrib.com/article.php?id=57952776&itype=CMSID' } },
  { id: 'kstratton', quote: "This isn't targeted at any proposal, it's targeted about process and transparency in whatever proposal could potentially come forward.", quoteSource: 'On his Utah Lake transparency amendments, 2022', source: { label: 'Daily Herald', url: 'https://www.heraldextra.com/news/local/2022/feb/08/utah-lake-debate-takes-to-the-capitol/' } },
  { id: 'karen_kwan', quote: 'When I was campaigning, it was really important that I stayed true to myself, that everything I did was rooted in good intentions.', quoteSource: 'Reflecting on her trailblazing campaign, 2017', source: { label: 'China Daily', url: 'https://usa.chinadaily.com.cn/us/2017-04/01/content_28763591.htm' } },
  { id: 'john_johnson', quote: "'We the People' tell the Government what to do, it doesn't tell us… 'We the people' are the driver — the Government is the car.", quoteSource: 'His stated philosophy of limited government, campaign site', source: { label: 'John for Utah', url: 'https://johnforutah.com/' } },
  { id: 'jake_fitisemanu', quote: "We may have our individual principles, we may have our individual values but I'm here to represent a community.", quoteSource: 'After his 2024 election, to KSL TV', source: { label: 'KSL TV', url: 'https://ksltv.com/politics-elections/utah-legislature/3-pacific-islander-lawmakers-joining-utah-legislature/729133/' } },
  { id: 'doug_fiefia', quote: "I know it sounds like 'Doug, this is all you talk about.' That's because it's coming, it's here and it's going to be our biggest fight.", quoteSource: 'On regulating AI, to KUER, 2026', source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2026-04-19/trump-doesnt-want-states-regulating-ai-utah-rep-doug-fiefia-isnt-listening' } },
  { id: 'james_dunnigan', quote: 'Minimal regulation, help those in need, provide opportunities for all to succeed.', quoteSource: 'His stated philosophy of government, to Utah Policy', source: { label: 'Utah Policy', url: 'https://utahpolicy.com/archive/25457-policymaker-profile-getting-to-know-james-dunnigan' } },

  // ── Sitting state representatives ───────────────────────────────────────
  { id: 'jake_sawyer', quote: "I'm running to represent House District 9 because I believe our voices should come before politics.", quoteSource: 'In a 2024 Salt Lake Tribune guest op-ed', source: { label: 'Salt Lake Tribune', url: 'https://www.sltrib.com/opinion/commentary/2024/09/26/jake-sawyer-utah-legislator-id/' } },
  { id: 'jason_b_kyle', quote: "Parents understand the needs of their children and should have input in their children's education.", quoteSource: 'His stated education position', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/jason-b-kyle' } },
  { id: 'jason_thompson', quote: 'Serving as your state representative for Utah House District 3 has been one of the greatest honors of my life.', quoteSource: 'From his campaign website', source: { label: 'Elect Jason Thompson', url: 'https://www.electjasonthompson.com/' } },
  { id: 'jill_koford', quote: 'As your representative, I will focus on keeping the state government out of your life.', quoteSource: 'From her campaign priorities', source: { label: 'Vote Koford', url: 'https://www.votekoford.com/priorities' } },
  { id: 'jon_hawkins', quote: 'I want to increase diverse economic development across Utah.', quoteSource: 'His stated economic-development priority', source: { label: 'BallotReady', url: 'https://www.ballotready.org/people/jon-hawkins' } },
  { id: 'joseph_elison', quote: "If this is able to pass in Utah, trust me, there will not be a soul in the United States who won't know about it.", quoteSource: 'On his bill to end daylight saving clock changes, to KSL, 2025', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51235286/utah-lawmakers-advance-with-plan-to-kill-daylight-saving-time' } },
  { id: 'katy_hall', quote: 'It is a big responsibility to represent my district down there and I feel that greatly.', quoteSource: 'To the Standard-Examiner during her first weeks in office, 2023', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/government/2023/feb/06/rep-katy-hall-says-shes-delivering-on-vow-to-be-common-sense-conservative/' } },
  { id: 'kay_christofferson', quote: "We felt like we came up with something that, maybe, neither party is completely happy with, but it's a compromise that we can agree with.", quoteSource: 'On a 2025 transportation compromise, to KSL', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51264078/utah-transportation-bill-moves-forward-without-controversial-salt-lake-city-project-pause' } },
  { id: 'lisa_shepherd', quote: 'As I begin my service to represent you in the Utah House, please know I do not take this responsibility lightly.', quoteSource: 'In a letter to House District 61 constituents', source: { label: 'lisa61.com', url: 'https://lisa61.com/' } },
  { id: 'mark_strong', quote: 'I am a die hard Utahn, a husband, father, and business professional.', quoteSource: 'From his campaign website', source: { label: 'strong4utah.com', url: 'https://www.strong4utah.com/' } },
  { id: 'ryan_d_wilcox', quote: 'I want them [a potential school shooter] to wonder in the back of their minds, is there a dozen at this one or is there one?', quoteSource: 'On armed school security, to KUER, 2023', source: { label: 'KUER', url: 'https://www.kuer.org/politics-government/2023-11-16/utah-rep-ryan-wilcox-is-advocating-for-armed-security-in-every-school' } },
  { id: 'sahara_hayes', quote: 'My view is that the government exists to serve its citizens, and that it should be doing everything it can to uplift the people who call our state home.', quoteSource: 'On why she ran for office, to KSL, 2023', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/50556547/making-politics-for-you-why-utah-rep-sahara-hayes-ran-for-office' } },
  { id: 'grant_miller', quote: "If you have a friend who's Palestinian or Jewish, reach out to him and check up on them. This is hard on everybody, and a lot of this is becoming a contest of who's suffering more.", quoteSource: "As Utah's first Palestinian-American lawmaker, to KSL NewsRadio", source: { label: 'KSL NewsRadio', url: 'https://kslnewsradio.com/utah/grant-miller-gaza/2211217/' } },
  { id: 'karen_m_peterson', quote: "This just requires that they bring the public in earlier to the conversation when there's going to be a tax increase.", quoteSource: 'On her property-tax transparency bill, to KSL, 2026', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51472510/law-aims-to-bolster-transparency-when-cities-school-districts-other-entities-pursue-tax-hikes' } },
  { id: 'rosalba_dominguez', quote: "It's a need that is growing within our state, and it's a need that I would love to help families and children to be able to participate in.", quoteSource: 'On her diaper-supplies fund bill, to Deseret News, 2025', source: { label: 'Deseret News', url: 'https://www.deseret.com/utah/2025/03/01/diaper-supplies-fund/' } },
  { id: 'seliason', quote: 'We typically just think of public health as vaccines, but mental health is the epitome of public health.', quoteSource: "On Utah's 988 crisis line and suicide prevention", source: { label: '#CrisisTalk', url: 'https://talk.crisisnow.com/representative-steve-eliason-on-988-how-crisis-intervention-and-suicide-prevention-takes-ongoing-attention-by-legislators/' } },
  { id: 'david_shallenberger', quote: 'I love this community and am ready to work tirelessly to protect it.', quoteSource: 'From his campaign website', source: { label: 'david4utah.com', url: 'https://www.david4utah.com/' } },
  { id: 'matt_macpherson', quote: "I love this community, and I'm deeply invested in its success.", quoteSource: 'Launching his re-election campaign, to Utah Policy', source: { label: 'Utah Policy', url: 'https://utahpolicy.com/news-release/76246-matt-macpherson-launches-re-election-campaign-for-utah-house-district-26' } },
  { id: 'kristen_chevrier', quote: 'When you call someone an anti-vaxxer, you have no idea what their history is.', quoteSource: 'To KSL in 2020, before her appointment to the House', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/46744889/ksl-investigates-will-the-hope-of-a-covid-19-vaccine-be-derailed-by-mistrust' } },
  { id: 'leah_hansen', quote: "Serving in Utah's House of Representatives these last few months has been an intense and rewarding experience, and I have only just started!", quoteSource: 'Announcing her 2026 re-election bid', source: { label: 'Lehi Free Press', url: 'https://lehifreepress.com/2026/01/01/saratoga-springs-and-west-lehi-rep-leah-hansen-announces-reelection-bid/' } },
  { id: 'logan_monson', quote: "I will be fiscally conservative, fight for our public lands' rights and support local control.", quoteSource: 'Launching his House campaign as Blanding mayor', source: { label: 'San Juan Record', url: 'https://sjrnews.com/news/logan-monson-mayor-blanding-launches-campaign-utah-legislature' } },
  { id: 'val_peterson', quote: 'We have zero and zero — zero one time and zero ongoing. So that’s the number the committees are working with.', quoteSource: 'As House budget chair, on the 2026 base budget, to Deseret News, 2025', source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2025/01/31/utah-legislature-passes-base-budget-to-fund-government-in-fiscal-year-2026/' } },

  // ── Active / notable 2026 candidates ────────────────────────────────────
  { id: 'john_knotwell', quote: "The legislature talks about over a billion dollars in tax relief. That's good, but families need relief they can actually feel — relief from skyrocketing housing costs and rising property taxes.", quoteSource: 'From his 2026 state-senate campaign site', source: { label: 'John Knotwell for State Senate', url: 'https://johnknotwell.com/' } },
  { id: 'josh_smith', quote: 'I saw a need in our legislature for diverse backgrounds and decided to offer my expertise.', quoteSource: 'From his 2026 campaign website (Forward Party)', source: { label: 'Elect Josh Smith', url: 'https://www.electjoshsmith.com/' } },
  { id: 'john_taylor', quote: 'I have not sought to be a politician, and I think we need outsider perspectives.', quoteSource: 'To the Standard-Examiner, 2026', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/may/19/john-taylor-touts-lisonbee-support-conservative-discernment-in-house-district-14-race/' } },
  { id: 'jonah_johnson', quote: "I'm running because I see what's coming, I care deeply about this state, and I'm ready to step up when it matters most.", quoteSource: 'From his 2026 campaign website', source: { label: 'jonahforutah.com', url: 'https://jonahforutah.com/' } },
  { id: 'kelly_smith', quote: "I'm running because people deserve a representative who is present, responsive, and grounded in this community.", quoteSource: 'From her 2026 campaign announcement', source: { label: 'Utah Policy', url: 'https://utahpolicy.com/news-release/76288-educator-and-city-council-member-kelly-smith-enters-senate-district-21-race-pledging-steady-collaborative-leadership' } },
  { id: 'lili_bitner', quote: "I think there are very few problems on this earth that don't have solutions.", quoteSource: 'To the Standard-Examiner, 2026', source: { label: 'Standard-Examiner', url: 'https://www.standard.net/news/2026/jun/08/lili-bitner-wants-to-bring-her-grit-determination-and-mothers-voice-to-house-district-17-seat/' } },
  { id: 'mckay_jensen', quote: 'I believe in growth that makes sense for Provo.', quoteSource: 'From his 2026 campaign announcement', source: { label: 'Utah Policy', url: 'https://utahpolicy.com/news-release/76459-republican-mckay-jensen-announces-candidacy-for-utah-house-district-60' } },
  { id: 'jiro_johnson', quote: "I'm running again because I want to continue building a Salt Lake County that doesn't leave our residents behind…", quoteSource: 'On seeking reelection to the county council, to KSL', source: { label: 'KSL.com', url: 'https://www.ksl.com/article/51426342/which-salt-lake-county-council-members-are-running-for-reelection' } },
  { id: 'laurie_stringham', quote: 'I am running for Salt Lake County Council because I am concerned about the direction our county is headed.', quoteSource: 'Announcing her county-council candidacy, to KUTV', source: { label: 'KUTV', url: 'https://kutv.com/news/election/laurie-stringham-announces-candidacy-for-salt-lake-city-council' } },
  { id: 'jeffrey_anderson', quote: 'I am not running for office because I have always wanted to be a politician.', quoteSource: 'From his 2026 campaign website', source: { label: 'Jeff Anderson for Utah House', url: 'https://jeffandersonforutahhouse.com/' } },
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
  console.log(`PolitiDex — add sourced pull-quotes  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let added = 0, skipped = 0, missingDocs = 0;

  for (const item of PLAN) {
    let doc;
    try {
      doc = await getDoc(item.id);
    } catch (e) {
      console.log(`  ✗ ${item.id}: ${e.message}`);
      missingDocs++;
      continue;
    }

    const existing = (doc.quote == null ? '' : String(doc.quote)).trim();
    if (existing) {
      console.log(`  • ${item.id} (${doc.name || ''}): already has a quote — left untouched`);
      skipped++;
      continue;
    }

    const fields = { quote: item.quote, quoteSource: item.quoteSource, updatedAt: STAMP };
    console.log(`  ${APPLY ? '✎' : '→'} ${item.id} (${doc.name || ''})`);
    console.log(`        "${item.quote}"`);
    console.log(`        — ${item.quoteSource}  [${item.source.label}]`);

    if (APPLY) await patch(item.id, fields);
    added++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} ${added} quote(s); ${skipped} already had one; ${missingDocs} doc(s) not found.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
