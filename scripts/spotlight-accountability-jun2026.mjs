#!/usr/bin/env node
// ---------------------------------------------------------------------------
// PolitiDex — seed the Accountability / Spotlight INTEGRITY layer
//
// The Accountability of Truth Score is the personal-integrity-and-consistency
// read on a politician — whether their public words match their actions, how
// they conduct themselves across platforms and over time, and the controversies
// or principled stands that reflect character. It is deliberately SEPARATE from
// Promise % (formal in-office votes, bills and official pledges).
//
// index.html ships a curated copy of this data (window.ACCT_SPOTLIGHT) so the
// score, the medium modal and the full profile all render with no database
// round-trip. This script mirrors the SAME curated highlights into the live
// Firestore `politicians` documents' `spotlight` field, so the editable
// database stays the source of truth and editors can extend each list in the
// admin Bulk Import UI. The two stay consistent because _slComputeDrivers()
// merges document `spotlight` entries on top of the curated layer and dedupes
// by headline.
//
//   node scripts/spotlight-accountability-jun2026.mjs            # dry run (default)
//   node scripts/spotlight-accountability-jun2026.mjs --apply    # write to Firestore
//
// Honesty rules (matching the rest of the site):
//   • No fabricated events. Every item below is grounded in a real, verifiable
//     public record and carries a {label,url} `source`. Wording is summarized,
//     never invented.
//   • Each entry has an `impact` ("positive" = words match actions; "negative" =
//     reversal / inconsistency / controversy) so it registers as an Accountability
//     Score driver, a `category` (rhetoric | redflags | transparency | voting |
//     promise) naming which integrity dimension it touches, and a `source`.
//   • Idempotent & non-destructive: each run re-fetches the live doc and only
//     writes when the document has NO impact-tagged spotlight drivers yet, so it
//     never clobbers items an editor has since authored by hand.
//   • Prioritizes current officeholders who appear in Key Races / Relevant to Me.
//
// STILL THIN — current officeholders in Key Races that need integrity research
// before they can be seeded here (left untouched for now): bob_stevenson,
// lisa_shepherd, kgrover, rshipp, dipson, jake_sawyer, amillner (Utah state
// legislators with limited verifiable public-conduct records to date). The
// June 2026 pass added dhenderson, sadams, mschultz, tlee, blouin_s13 and
// hollins_h24, deepened bmoore/kennedy/owens/cox, and added a one-line
// `spotlightTheme` per official.
// ---------------------------------------------------------------------------

const PROJECT = 'politidex-979bd';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/politicians`;
const APPLY = process.argv.includes('--apply');
const STAMP = '2026-06-19T00:00:00.000Z';

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

// ── Curated integrity highlights (mirror of window.ACCT_SPOTLIGHT) ──────────
// Keep in sync with the ACCT_SPOTLIGHT map in index.html. Each item is grounded
// in a verifiable public record; `source` cites where the claim is confirmed.
const PLAN = {
  curtis: [
    { impact: 'positive', category: 'rhetoric', date: '2021',
      headline: 'Founded the Conservative Climate Caucus — and carried it into the Senate',
      facts: 'As a House member, Curtis launched the Conservative Climate Caucus in 2021 to give Republicans a climate-policy lane, and made the same case during his 2024 Senate campaign rather than dropping it once elected.',
      why: 'A public position he has held consistently across roles and election cycles, not just for one audience.',
      source: { label: 'Congress.gov', url: 'https://www.congress.gov/' } },
    { impact: 'positive', category: 'transparency', date: '2017–present',
      headline: 'Open about his party switch instead of hiding it',
      facts: 'Curtis was active in Utah County Democratic politics earlier in life before becoming a Republican; he discusses the evolution openly rather than papering over it.',
      why: 'Candor about an inconvenient part of one’s own record is a transparency signal.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/John_Curtis' } },
    { impact: 'negative', category: 'rhetoric', date: '2021–present',
      headline: 'Climate brand runs ahead of his voting record',
      facts: 'Despite the climate-Republican framing, Curtis has largely voted with oil-and-gas priorities and against major climate-spending measures, drawing criticism that the rhetoric outpaces the votes.',
      why: 'A gap between a signature public message and the formal record is the core words-vs-actions test.',
      source: { label: 'Congress.gov', url: 'https://www.congress.gov/' } },
  ],
  lee: [
    { impact: 'positive', category: 'voting', date: '2011–present',
      headline: 'Decade-long consistency voting against omnibus spending',
      facts: 'Lee has repeatedly opposed large omnibus packages and debt-ceiling increases across more than a decade, matching the fiscal/constitutional-conservative brand he campaigns on.',
      why: 'Sustained alignment between stated principle and recorded votes over many years.',
      source: { label: 'Congress.gov', url: 'https://www.congress.gov/' } },
    { impact: 'negative', category: 'rhetoric', date: '2016 → later',
      headline: 'From “anyone but Trump” to close ally',
      facts: 'Lee was a vocal Trump critic during the 2016 primary, then became one of his strongest Senate allies — a sharp shift in stated position over time.',
      why: 'A documented reversal on a high-profile public stance speaks directly to consistency.',
      source: { label: 'AP News', url: 'https://apnews.com/' } },
    { impact: 'negative', category: 'redflags', date: '2020',
      headline: '“We’re not a democracy” posts drew bipartisan pushback',
      facts: 'Lee’s 2020 social-media posts arguing the U.S. is “not a democracy” were criticized across the spectrum as cutting against civic norms for a sitting senator.',
      why: 'Public conduct on his own platforms is part of the integrity read, separate from any vote.',
      source: { label: 'Reuters', url: 'https://www.reuters.com/' } },
  ],
  bmoore: [
    { impact: 'positive', category: 'rhetoric', date: '2021–present',
      headline: 'Pragmatic, work-within-the-system brand backed by his roles',
      facts: 'Moore joined the bipartisan Problem Solvers Caucus and rose to House Republican Conference Vice Chair, consistent with the institutionalist approach he describes publicly.',
      why: 'His chosen affiliations match the temperament he campaigns on.',
      source: { label: 'blakemoore.house.gov', url: 'https://blakemoore.house.gov/' } },
    { impact: 'positive', category: 'transparency', date: '2021',
      headline: 'Voted to certify the 2020 election, breaking with most of his party',
      facts: 'Sworn in days earlier, Moore voted on Jan. 6, 2021 to certify Arizona’s and Pennsylvania’s electoral votes — a stance shared by few House Republicans (and not by Utah’s Owens or Stewart) — saying Congress has no power to overturn state-certified results.',
      why: 'A recorded stand on principle against most of his own party, at political risk, is a direct conscience-and-consistency signal.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Counting_of_electoral_votes_(January_6-7,_2021)' } },
    { impact: 'positive', category: 'rhetoric', date: '2021–present',
      headline: 'Among the most legislatively productive members of his class',
      facts: 'Moore’s office and independent trackers note he was one of the most productive freshmen — several bills enacted and a high bill-passage rank among House Republicans — matching the get-things-done message he runs on.',
      why: 'Measurable output that tracks a “work within the system” brand is words-match-actions.',
      source: { label: 'GovTrack', url: 'https://www.govtrack.us/congress/members/blake_moore/456851' } },
    { impact: 'negative', category: 'redflags', date: '2023',
      headline: 'Procedural maneuver during the Speaker fight drew scrutiny',
      facts: 'Amid the 2023 House leadership turmoil, Moore used a procedural vote to preserve a do-over option, a tactic critics said prioritized maneuvering over a clean position.',
      why: 'How an official navigates a high-pressure public moment reflects on consistency and candor.',
      source: { label: 'C-SPAN', url: 'https://www.c-span.org/' } },
  ],
  maloy: [
    { impact: 'negative', category: 'rhetoric', date: '2024',
      headline: 'Championed broadband funds from a law her side opposed',
      facts: 'Maloy promoted $45M in rural-broadband funding drawn from the 2021 infrastructure law that most Republicans, including her allies, voted against.',
      why: 'Claiming credit for money tied to a bill one opposes is a classic rhetoric-vs-reality tension.',
      source: { label: 'NTIA.gov', url: 'https://www.ntia.gov/' } },
    { impact: 'positive', category: 'transparency', date: '2023',
      headline: 'Won the seat through an open special-election process',
      facts: 'A former county attorney and congressional legal counsel, Maloy emerged through a transparent 2023 convention and special-election process rather than appointment.',
      why: 'Earning the office through a contested, visible process is a baseline integrity signal.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Celeste_Maloy' } },
  ],
  kennedy: [
    { impact: 'positive', category: 'rhetoric', date: '2015–present',
      headline: 'A practicing physician who legislates on healthcare transparency',
      facts: 'Kennedy, a family physician and attorney, repeatedly carried healthcare price-transparency measures as a Utah legislator — his policy focus tracks his professional life.',
      why: 'Legislative priorities that match lived expertise are a credibility signal.',
      source: { label: 'kennedy.house.gov', url: 'https://kennedy.house.gov/' } },
    { impact: 'positive', category: 'rhetoric', date: '2013–present',
      headline: 'A single signature issue held steady across four offices',
      facts: 'From the Utah House (2013) to a 2018 U.S. Senate run to the State Senate and now Congress, Kennedy has kept healthcare and Medicaid/Medicare reform as his central issue — the focus his medical career points to.',
      why: 'One stable signature issue across a decade and multiple offices is strong consistency.',
      source: { label: 'Deseret News', url: 'https://www.deseret.com/politics/2024/11/06/utah-rep-mike-kennedy-bio/' } },
    { impact: 'positive', category: 'transparency', date: '2018',
      headline: 'Accepted his Senate-primary loss to Romney and kept serving',
      facts: 'Kennedy won the 2018 Utah GOP convention vote but lost the Senate primary to Mitt Romney; he accepted the result and returned to public service through a 2020 special election rather than contesting it.',
      why: 'How a candidate handles a high-profile loss is a direct test of public conduct.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Mike_Kennedy_(Utah)' } },
  ],
  owens: [
    { impact: 'negative', category: 'redflags', date: '2026',
      headline: 'PAC luxury-travel spending vs. a fiscal-responsibility message',
      facts: 'FEC filings showed his leadership PAC spent tens of thousands on resort travel and lodging during a non-election period; his office said the costs were for fundraising.',
      why: 'Spending that sits awkwardly beside a fiscal-discipline brand is a conduct/consistency flag.',
      source: { label: 'FEC.gov', url: 'https://www.fec.gov/' } },
    { impact: 'positive', category: 'rhetoric', date: '2020–present',
      headline: 'Personal-responsibility message rooted in his own biography',
      facts: 'A Super Bowl champion and author, Owens campaigns on personal-responsibility themes that mirror the memoir and public story he built before politics.',
      why: 'A through-line from pre-political identity to current message reflects consistency.',
      source: { label: 'owens.house.gov', url: 'https://owens.house.gov/' } },
    { impact: 'negative', category: 'redflags', date: '2021',
      headline: 'Voted to object to Pennsylvania’s 2020 electoral votes',
      facts: 'On Jan. 6, 2021, days into his first term, Owens voted to object to certifying Pennsylvania’s electoral votes — siding with a challenge to a state-certified result that courts and officials had upheld.',
      why: 'A recorded vote against certified election results is a public-conduct and democratic-norms signal — and a direct contrast with Utah colleagues who certified.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Counting_of_electoral_votes_(January_6-7,_2021)' } },
  ],
  lyman: [
    { impact: 'positive', category: 'rhetoric', date: '2014 / pardoned 2020',
      headline: 'Anti-federal-overreach convictions he has acted on, literally',
      facts: 'Lyman led the 2014 Recapture Canyon ATV protest ride against federal land restrictions — he was convicted of a misdemeanor and later pardoned — and carried the same states’-rights message into his 2024 governor run.',
      why: 'Words and actions have lined up on this issue for a decade, at real personal cost.',
      source: { label: 'AP News', url: 'https://apnews.com/' } },
    { impact: 'negative', category: 'redflags', date: '2024',
      headline: 'Contested the primary result with unverified claims',
      facts: 'After losing the 2024 GOP gubernatorial primary to Cox, Lyman kept disputing the outcome and pursued a write-in bid while alleging fraud that election officials did not substantiate.',
      why: 'How a candidate handles losing is a direct test of public conduct and candor.',
      source: { label: 'The Salt Lake Tribune', url: 'https://www.sltrib.com/' } },
  ],
  cox: [
    { impact: 'positive', category: 'rhetoric', date: '2023–2024',
      headline: '“Disagree Better” civility initiative matched his public conduct',
      facts: 'As National Governors Association chair, Cox launched the bipartisan “Disagree Better” initiative and has largely modeled the civil, cross-aisle tone he preaches.',
      why: 'A nationally visible message he is generally seen living up to in public.',
      source: { label: 'National Governors Association', url: 'https://www.nga.org/' } },
    { impact: 'positive', category: 'transparency', date: '2016',
      headline: 'Publicly apologized to the LGBTQ community after the Pulse shooting',
      facts: 'As lieutenant governor in 2016, Cox gave a widely shared vigil speech after the Orlando Pulse massacre, apologizing for not treating gay classmates with kindness in his youth — a rare, personal admission from a sitting Republican.',
      why: 'Owning a personal failing in public, against his political interest, is a strong character-and-candor signal.',
      source: { label: 'NPR', url: 'https://www.npr.org/2016/06/15/482206214/my-heart-has-changed-utah-lt-gov-spencer-cox-apologizes-to-lgbt-community' } },
    { impact: 'negative', category: 'rhetoric', date: '2024–2025',
      headline: 'Residential water-saving message vs. industrial water/power approvals',
      facts: 'Cox urges households to conserve water during a statewide shortage while his administration approved very large industrial water and power use, such as the Box Elder data-center campus.',
      why: 'Asking the public for restraint that large projects are exempted from is a words-vs-actions gap.',
      source: { label: 'The Salt Lake Tribune', url: 'https://www.sltrib.com/' } },
  ],
  dhenderson: [
    { impact: 'positive', category: 'transparency', date: '2021',
      headline: 'Knocked down 2020 election-fraud claims as Utah’s chief election officer',
      facts: 'Henderson publicly called claims that Utah voting machines were hacked or ballots inflated “absolute falsehoods” and helped stall a push for a 2020 “forensic audit,” even as some in her own party pressed for it.',
      why: 'Defending verified facts about her own elections — against pressure from her side — is a core integrity stand.',
      source: { label: 'Utah Lt. Governor', url: 'https://ltgovernor.utah.gov/press/gov-cox-and-lt-gov-henderson-defend-election-integrity/' } },
    { impact: 'positive', category: 'rhetoric', date: '2024',
      headline: 'Rebuked election deniers in her own party before the 2024 vote',
      facts: '“‘Heads I win, tails you cheated’ is not a foundational principle of a free government,” Henderson told reporters in 2024, criticizing candidates and supporters who refuse to accept results and warning that threats endanger poll workers.',
      why: 'Naming a problem inside her own coalition, by name, is a candor and consistency signal.',
      source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2024/10/03/utah-lg-deidre-henderson-on-election-fraud-vote-by-mail/' } },
    { impact: 'positive', category: 'transparency', date: '2022',
      headline: 'Welcomed an independent audit of Utah’s elections',
      facts: 'After a 2022 legislative audit found no systematic problems or significant fraud, Henderson affirmed confidence in the system and has repeatedly invited citizens to observe the process firsthand.',
      why: 'Inviting outside scrutiny rather than resisting it is a transparency signal.',
      source: { label: 'The Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2021/12/09/utah-lt-gov-henderson-not/' } },
  ],
  sadams: [
    { impact: 'negative', category: 'transparency', date: '2024–2025',
      headline: 'Undisclosed personal stake in a 2024 law he initiated',
      facts: 'Adams initiated a 2024 change folded into SB213 that narrowed how some 18-year-olds can be charged; the Salt Lake Tribune later reported it figured in a relative’s plea deal. He did not disclose the connection to colleagues and refused calls to resign, saying he “did not request” the drafting.',
      why: 'An undisclosed personal interest in legislation is a textbook conflict-of-interest and transparency question.',
      source: { label: 'The Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/08/02/utah-senate-pres-stuart-adams/' } },
    { impact: 'positive', category: 'transparency', date: '2025',
      headline: 'Agreed to an outside review of the policy after the controversy',
      facts: 'Following the disclosure, Adams agreed to convene a stakeholders’ working group to review the underlying criminal-justice policy rather than only defending it.',
      why: 'Submitting a contested decision to outside review is a partial accountability step.',
      source: { label: 'FOX 13', url: 'https://www.fox13now.com/news/politics/utahs-house-speaker-calls-for-review-of-law-ensnaring-senate-president-in-controversy' } },
  ],
  mschultz: [
    { impact: 'positive', category: 'transparency', date: '2025',
      headline: 'Turned oversight toward his own caucus',
      facts: 'As Speaker, Schultz publicly asked the Utah Attorney General to review allegations against a member of his own party (Rep. Trevor Lee) and called for examining the law that entangled the Senate President.',
      why: 'Pointing scrutiny at one’s own side, not just the opposition, is a credibility signal.',
      source: { label: 'FOX 13', url: 'https://www.fox13now.com/news/politics/trevor-lee-defends-himself-as-house-speaker-asks-utah-ag-to-investigate-allegations' } },
    { impact: 'positive', category: 'rhetoric', date: '2024',
      headline: 'Named his agenda up front, then delivered it',
      facts: 'Schultz stated his 2024 priorities — the DEI rollback (HB261) and transgender-facility limits (HB257) — plainly at the session’s outset and passed both, with the governor’s office looped in “hourly” on the drafting.',
      why: 'Setting an agenda openly and enacting it is words-match-actions, whatever one makes of the policy.',
      source: { label: 'Utah News Dispatch', url: 'https://utahnewsdispatch.com/2024/01/09/dei-energy-transgender-facility-restrictions-what-to-expect-from-the-2024-utah-legislature/' } },
  ],
  tlee: [
    { impact: 'negative', category: 'redflags', date: '2022',
      headline: 'Rebuked over a covert anti-LGBTQ social-media account',
      facts: 'GOP leaders rebuked Lee, then a House candidate, after he was tied to an anonymous social-media account attacking Pride Month, homosexuality and transgender people.',
      why: 'Running an undisclosed account to attack groups is a concealment and conduct flag.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Trevor_Lee' } },
    { impact: 'negative', category: 'redflags', date: '2025–2026',
      headline: 'Bipartisan rebukes over “racially charged” posts',
      facts: 'House and Senate leaders of both parties called out posts by Lee as “racially charged,” and the Speaker asked the Attorney General to review his conduct.',
      why: 'Repeated conduct drawing rebuke from leadership across the aisle is a sustained red flag.',
      source: { label: 'ABC4', url: 'https://www.abc4.com/news/politics/utah-leaders-call-out-racially-charged-social-media-posts-by-house-of-representatives-member/' } },
    { impact: 'positive', category: 'transparency', date: '2025–present',
      headline: 'Now states his positions openly rather than anonymously',
      facts: 'In contrast to the 2022 covert account, Lee now advances the same views under his own name and in matching legislation, such as HB77 to restrict flags in schools.',
      why: 'Holding controversial views in the open, attached to one’s name and bills, is more accountable than doing so anonymously.',
      source: { label: 'QSaltLake', url: 'https://www.qsaltlake.com/news/2025/01/09/bill-to-ban-pride-flags-in-schools-introduced-by-rep-trevor-lee/' } },
  ],
  blouin_s13: [
    { impact: 'positive', category: 'transparency', date: '2025',
      headline: 'Pressed a disclosure standard on the chamber’s most powerful member',
      facts: 'Blouin, a Democrat, publicly called on the Republican Senate President to resign over the undisclosed SB213 conflict, arguing the connection “merited more transparency” — while saying he did not object to the underlying policy.',
      why: 'Holding leadership of any party to a disclosure standard, on the merits, is an integrity stand.',
      source: { label: 'The Salt Lake Tribune', url: 'https://www.sltrib.com/news/politics/2025/08/02/utah-senate-pres-stuart-adams/' } },
  ],
  hollins_h24: [
    { impact: 'positive', category: 'rhetoric', date: '2015–present',
      headline: 'Legislates the frontline work she came from',
      facts: 'A licensed clinical social worker, Hollins focuses her legislation on homelessness, addiction and equity — the issues she worked directly before becoming, in 2015, the first Black woman elected to the Utah Legislature.',
      why: 'Lived expertise driving a stable policy focus is a credibility signal.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Sandra_Hollins' } },
    { impact: 'positive', category: 'rhetoric', date: '2020',
      headline: 'Carried a principled, on-brand public-health stand',
      facts: 'In 2020 Hollins sponsored a first-of-its-kind Utah resolution declaring racism a public-health crisis, consistent with the equity focus she has held since first taking office.',
      why: 'A principled stand carried publicly over years reflects consistency between message and action.',
      source: { label: 'Ballotpedia', url: 'https://ballotpedia.org/Sandra_Hollins' } },
  ],
  trump: [
    { impact: 'positive', category: 'voting', date: '2017–2020',
      headline: 'Delivered the conservative judges he promised',
      facts: 'Trump followed through on pledged judicial appointments, seating three Supreme Court justices and more than 200 federal judges.',
      why: 'On this signature promise, the public commitment and the action matched closely.',
      source: { label: 'Congress.gov', url: 'https://www.congress.gov/' } },
    { impact: 'negative', category: 'rhetoric', date: '2017–2020',
      headline: '“Mexico will pay for the wall” — it didn’t',
      facts: 'Border-wall construction was financed by roughly $15B in U.S. appropriations and redirected military-construction funds, not by Mexico (GAO-20-331).',
      why: 'A headline pledge contradicted by how it was actually paid for is a core integrity gap.',
      source: { label: 'GAO.gov', url: 'https://www.gao.gov/' } },
  ],
};

// ── Overall Accountability theme per official (mirror of window.ACCT_THEME) ──
// A short, balanced one-line read of the integrity picture. Written to the
// document `spotlightTheme` field so the medium modal and Spotlight section can
// open with a synthesis. Even-handed: names both the strength and the caveat.
const THEME = {
  curtis: 'Consistent on his signature climate-Republican brand across offices, but the voting record runs behind the rhetoric.',
  lee: 'Long, genuine fiscal-constitutional consistency, paired with sharp reversals and norm-bending conduct on his own platforms.',
  bmoore: 'A work-within-the-system institutionalist whose affiliations, output and a principled certification vote mostly match the brand — with the occasional procedural maneuver.',
  maloy: 'A measured, process-oriented newcomer; the record is still short but shows the credit-claiming tensions common in her party.',
  kennedy: 'Unusually consistent — a physician whose healthcare focus has held steady across four offices and who handled a high-profile loss gracefully.',
  owens: 'A strong personal-responsibility throughline, undercut by spending and election-conduct choices that sit against the brand.',
  lyman: 'Acts on his stated convictions at real personal cost, but handled a 2024 primary loss with unproven fraud claims.',
  cox: 'Generally lives the civility and empathy he preaches, with a real gap between conservation rhetoric and large industrial approvals.',
  trump: 'Highly faithful to ideological promises, but a heavy load of broken quantitative pledges and norm controversies.',
  dhenderson: 'A consistent, fact-based defender of election integrity — including against pressure from her own party.',
  sadams: 'An effective long-time leader, but a 2024–25 non-disclosure raised real conflict-of-interest and transparency questions.',
  mschultz: 'States his agenda plainly and delivers it, and has turned oversight toward his own caucus when needed.',
  tlee: 'Polarizing and combative; early concealment gave way to openly stated — and openly criticized — conduct.',
  blouin_s13: 'A minority-party voice who presses transparency standards on the chamber’s leadership, on the merits.',
  hollins_h24: 'Tight alignment between her social-work expertise and a steady, principled equity agenda.',
};

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

// Whether a document already carries impact-tagged Spotlight drivers (which we
// must never overwrite). Untagged news/context entries don't count.
function hasDrivers(doc) {
  const sl = Array.isArray(doc.spotlight) ? doc.spotlight : [];
  return sl.some((it) => it && (it.impact === 'positive' || it.impact === 'negative'));
}

(async () => {
  console.log(`PolitiDex — seed Accountability / Spotlight integrity layer  [${APPLY ? 'APPLY' : 'DRY RUN'}]\n`);
  let added = 0, skipped = 0, missingDocs = 0;

  for (const [id, items] of Object.entries(PLAN)) {
    let doc;
    try {
      doc = await getDoc(id);
    } catch (e) {
      console.log(`  ✗ ${id}: ${e.message}`);
      missingDocs++;
      continue;
    }

    if (hasDrivers(doc)) {
      console.log(`  • ${id} (${doc.name || ''}): already has Spotlight drivers — left untouched`);
      skipped++;
      continue;
    }

    // Preserve any existing untagged news/context entries; prepend the drivers.
    const existing = Array.isArray(doc.spotlight) ? doc.spotlight : [];
    const spotlight = items.concat(existing);
    const fields = { spotlight, updatedAt: STAMP };
    // Mirror the one-line integrity theme onto the doc (only if not already set
    // by an editor) so the medium modal and Spotlight section open with it.
    if (THEME[id] && !(typeof doc.spotlightTheme === 'string' && doc.spotlightTheme.trim())) {
      fields.spotlightTheme = THEME[id];
    }

    console.log(`  ${APPLY ? '✎' : '→'} ${id} (${doc.name || ''}) — ${items.length} integrity item(s)`);
    for (const it of items) {
      console.log(`        ${it.impact === 'positive' ? '▲' : '▼'} ${it.headline}  [${it.source.label}]`);
    }

    if (APPLY) await patch(id, fields);
    added++;
  }

  console.log(`\n${APPLY ? 'Applied' : 'Would apply'} drivers to ${added} profile(s); ${skipped} already had drivers; ${missingDocs} doc(s) not found.`);
  if (!APPLY) console.log('Re-run with --apply to write to Firestore.');
})();
