#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// vr-backfill-stances-aug2026.mjs — file the stated position independently of
// the roll call it will be tested against
// ─────────────────────────────────────────────────────────────────────────────
// Thousands of member votes are ingested and mapped. A pair only becomes
// judgeable when a STATED POSITION sits on the same issue key — and where one
// does, it is sometimes written as the vote itself ("Voted for the SAVE Act,
// saying…"). Guard 10 refuses that as the SAID side, correctly: a card whose two
// halves are the same document has not tested anything.
//
// Every row below already had independent position language available — either
// quoted on the row itself (in `evidence`, or in the second half of a sentence
// whose first half was the vote) or in the sourced document the row cites. The
// edit is subtractive: the vote clause comes out, the position stays, sourced to
// the same URL as before. Nothing is added that the row or its source did not
// already carry, no `issueKey`, `pos`, `issueStance` or `source` is touched, and
// no measure-to-issue mapping is changed.
//
// Three shapes recur:
//
//   1. THE POSITION WAS ALREADY THERE, behind the vote. "Voted for X, saying
//      'only U.S. citizens are legally allowed to vote in our federal elections
//      – full stop.'" The quote is the position; the clause in front of it is
//      the roll call. Dropping the clause loses nothing but the circularity.
//
//   2. THE POSITION WAS IN `evidence`. Westerman's column was filed as "I voted
//      against raising the debt limit"; the same column argues "we must balance
//      our checkbooks and live within our means". The column is the source
//      either way — only which sentence is quoted changes.
//
//   3. THE VOTE WAS ONLY IN `evidence`. The text stated a position cleanly and
//      the row was held because its evidence line read "Cosponsor; statement of
//      …" or "voting to advance …". Those lines are re-cut to the same fact
//      without the vote verb.
//
// A fourth shape recurs and is REFUSED here rather than rewritten: rows whose
// only content is the roll call, sourced to a bare domain, a press-release index,
// an aggregator (Wikipedia, OnTheIssues, GovTrack) or the roll call itself. There
// is nothing independent to fall back on, so those pairs stay dark and are
// reported by scripts/vr-audit-circular-stances-aug2026.mjs.
//
// Two guard mechanics shape the wording and are worth stating plainly, because
// they look like word games otherwise:
//
//   · VOTE_VERB_RE matches the bare word "voting". On voting_access and
//     election_security that is the SUBJECT, not the act — "attacks on voting
//     rights" is a position, not a roll call. Accepted rewrites therefore say
//     "the ballot", "casting ballots" or "mail balloting". Quoted words are never
//     altered inside quotation marks; the quotation is closed early instead.
//   · MEASURE_CITE_RE's bare `S\.?\s?\d+` branch matches a possessive before a
//     year — "Georgia's 2021 election law" reads as measure "S 2021". One row is
//     re-worded around it ("the Georgia election law enacted in 2021").
//
// The script re-runs the shipped guards against every rewritten row before it
// writes anything, so a rewrite that still blocks fails the run rather than
// landing silently.
//
// Run:  node scripts/vr-backfill-stances-aug2026.mjs [--write]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'politician-stances.js');
const WRITE = process.argv.includes('--write');

// ── The shipped guards, so this script cannot drift from what ships ──────────
function loadGuards() {
  const noopEl = () => ({
    style: {}, textContent: '', hidden: false, className: '', innerHTML: '',
    classList: { add() {}, remove() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, appendChild() {}, removeChild() {},
    querySelector: () => null, querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {}, focus() {}, scrollIntoView() {},
    closest: () => null, insertAdjacentHTML() {}, remove() {},
  });
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    document: {
      readyState: 'complete',
      head: noopEl(), body: noopEl(), documentElement: noopEl(),
      createElement: noopEl, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { hash: '', origin: 'https://politidex.fyi', pathname: '/' },
    navigator: {},
    setTimeout: () => 0, clearTimeout: () => {},
    setInterval: () => 0, clearInterval: () => {},
    requestAnimationFrame: () => 0,
    JSON, Math, Date, Promise, encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'receipt-cards.js'), 'utf8'), ctx,
    { filename: 'receipt-cards.js' });
  const api = ctx.window.PDXReceiptCards;
  if (!api || !api.guards) throw new Error('receipt-cards.js did not expose its guards');
  return api.guards;
}

// ─────────────────────────────────────────────────────────────────────────────
// The edits. Keyed on (pid, topic) — the topic string is the row's own label, so
// this list survives any edit above it in the file. `text` and/or `evidence` are
// replaced; a field left out is left alone.
// ─────────────────────────────────────────────────────────────────────────────
const EDITS = [
  // ── cut_spending ──────────────────────────────────────────────────────────
  {
    pid: 'bruce_westerman', topic: 'Federal Spending',
    text: 'As a self-described "proponent of limited government and fiscal responsibility," argues in a column titled "America is Addicted to Spending" that "Americans are addicted to government programs and the spending required to keep them going" and that "Like every family and every business in America, we must balance our checkbooks and live within our means."',
    evidence: 'The same column says "While it is easy to accept seemingly free goods and services, it is never truly free," and pledges "I will always fight for fiscal responsibility and advocate for a limited government."',
  },
  {
    pid: 'mariannette_miller_meeks', topic: 'Federal Spending',
    evidence: 'She made the remark while pressing for a constitutional amendment requiring a balanced federal budget, noting "our national debt is over $39 trillion and growing."',
  },
  {
    pid: 'tlaib', topic: 'Federal Spending',
    text: 'Says her residents "are tired of the cuts to their services," and objects to what she calls "a harmful Republican budget that betrays our families."',
  },
  {
    pid: 'bennie_thompson', topic: 'Federal Spending',
    text: 'Says he "will never" back "any cuts to Medicaid, Medicare, Social Security, or any programs that benefit my constituents."',
  },
  {
    pid: 'michael_guest', topic: 'Federal Spending',
    text: 'Opposes "increasing government spending at a time when Mississippians are experiencing record high inflation."',
  },
  {
    pid: 'scott_perry', topic: 'Cutting Spending',
    evidence: 'Chaired the House Freedom Caucus from 2022 to early 2024, and publicly criticized the projected deficit increase in the 2025 tax-and-spending law.',
  },

  // ── voting_access ─────────────────────────────────────────────────────────
  {
    pid: 'boebert', topic: 'Nationalizing Mail-In Voting',
    text: 'Her election-integrity platform opposes federal legislation that she says would "ban voter ID laws, federalize our elections," nationalize mail balloting and "make it harder to audit election results."',
  },
  {
    pid: 'don_bacon', topic: 'Federal Mandates on State Voting Rules',
    text: 'Objects to federal election legislation that would "reverse the longstanding history of state-controlled elections" and "mandate ballot harvesting which is now illegal in Nebraska," saying "Nebraska does elections right and does not want to be runover by the Federal government."',
    evidence: 'Statement, March 3, 2021.',
  },
  {
    pid: 'emmer', topic: 'Ballot Collection & State Election Rules',
    text: 'Opposes federal election legislation that "would erode state control of their elections and provide government funding for partisan campaigns," arguing on the House floor that it would "eliminate our state-based system of elections, codify practices like ballot harvesting," and set up "a federal match for campaign contributions using public funds." Fact-checkers noted the bill loosened limits on who may return a sealed absentee ballot rather than mandating ballot collection.',
    evidence: 'Statement and floor remarks, March 3, 2021.',
  },
  {
    pid: 'jason_smith', topic: 'Universal Mail Ballots vs. Absentee Voting',
    text: 'Draws a hard line between universal mail balloting and absentee ballots — the first, he wrote, "is not anything like absentee ballots." He objects to states "just sending these official ballots out to every single name on the rolls, regardless of whether they request one or not," arguing that with "no identification, signature or residency verification" there is "little to no way to prevent identity forgery."',
  },
  {
    pid: 'jim_jordan', topic: 'Limiting Mail Voting',
    text: 'Would narrow mail balloting to a short list of cases: "It would be nice if we just got rid of the mail in issue, except for the people who have a truly legitimate reason," naming "overseas military folks, people overseas or can\'t vote on election day" as the exceptions, and contrasting them with "the blanket kind of mail in" system he says California has.',
  },
  {
    pid: 'kclark', topic: 'Equal Access to the Ballot Box',
    text: 'Says "nothing is more sacred or foundational to a democracy than equal access to the ballot box," and has pressed the House to restore the protections struck down in Shelby County v. Holder, saying she "will not rest until" they are "the law of the land."',
  },
  {
    pid: 'khanna', topic: 'Barriers to the Ballot',
    text: 'Co-authored an op-ed arguing that attacks on the right to the ballot "target communities of color, but also suppress the votes of women, people with disabilities, students, and the poor," and pressing the Senate to act: "we can\'t wait for another election cycle... to stop the American people from being denied the right to the ballot."',
  },
  {
    pid: 'michael_guest', topic: 'Codifying Pandemic Voting Changes',
    text: 'Calls federal election legislation "nothing less than a federal takeover of elections" that would "undermine the integrity of our elections by codifying many of the" ballot changes made during the pandemic. He argues that "Article I, Section 4 of the Constitution gives states— not Congress, not the Executive Branch, not the judiciary—the authority over elections," and that "What\'s best for California and New York is not always best for the rest of the country."',
    evidence: 'Statement, March 3, 2021.',
  },
  {
    pid: 'mike_simpson', topic: 'Ballot Collection & Drop Boxes',
    text: 'Argues "ballot harvesting is one of the most alarming threats to the integrity of free and fair elections," objecting to rules that authorize "designated ballot retrievers" to collect ballots from drop boxes and polling sites and that would prohibit "states from setting a limit on how many ballots" a retriever can submit.',
  },
  {
    pid: 'stephanie_bice', topic: 'Drop Boxes, Same-Day Registration & Absentee Rules',
    text: 'Opposes federal election legislation because "It would strip the notary requirement for absentee ballots and no longer require voter ID," and objects to "24-hour ballot drop boxes with no staff or monitoring required," to "allowing for same-day voter registration," and to a rule under which states could "accept ballots 7 days after elections."',
  },
  {
    pid: 'tom_cole', topic: 'Federal Mandates on Voting Methods',
    text: 'Says "The ability to vote is one of the most precious rights American citizens have," but opposes federal mandates on how states run elections — automatic and same-day registration, mail and early in-person balloting, and overrides of state voter ID laws — as "an unprecedented power grab by Washington" that would "irrevocably alter how states oversee and operate their own elections."',
    evidence: 'Statement, January 13, 2022.',
  },
  {
    pid: 'adam_smith', topic: 'Registration & Early Voting Expansion',
    text: 'Backs legislation to "modernize voter registration and increase access to support free and fair elections with more equitable electoral practices," specifically automatic voter registration, required early in-person options and mail balloting.',
    evidence: 'Statement, March 3, 2021.',
  },
  {
    pid: 'jeffries', topic: 'Voting Rights Act Restoration',
    text: 'Presses for restoring federal preclearance review of state election changes, saying "We will not rest until" that protection "becomes the law of the land."',
    evidence: 'Statement on the Supreme Court\'s April 2026 decision on federal preclearance.',
  },
  {
    pid: 'omar', topic: 'Removing Barriers to Voting',
    text: 'Wrote that the country must remove "substantial barriers" to the ballot "for low-income communities and people of color, ban gerrymanders," and grant "self-government to the voters of Washington, D.C."',
  },
  {
    pid: 'owens', topic: 'Extending the Voting Period',
    text: 'Objects to letting presidential candidates sue for an extended balloting period after polls have closed, warning it could let a candidate who had already lost the count be granted additional days to cast ballots after election day.',
    evidence: 'Statement, September 21, 2022.',
  },
  {
    pid: 'steny_hoyer', topic: 'Ballot Access & Early Voting',
    text: 'Argues casting a ballot should be "made easier and easy to vote," citing weekend and early in-person options so shift workers can cast a ballot, and opposes state laws that make "it more difficult to vote in America."',
  },

  // ── israel_support ────────────────────────────────────────────────────────
  {
    pid: 'curtis', topic: 'Support for Israel',
    text: 'Backs continued U.S. security assistance to Israel; after Israel struck Iranian targets he said Israel "exercised its sovereign right to defend itself against an existential threat" and that the United States must stand firmly with it.',
  },
  {
    pid: 'khanna', topic: 'Military Aid to Israel',
    text: 'Opposes U.S. aid to Israel, including funding for offensive and defensive weapons such as the Iron Dome, having earlier objected to "a blank check for Netanyahu and offensive weapons unconditionally."',
  },
  {
    pid: 'mariannette_miller_meeks', topic: 'Support for Israel',
    text: 'Says "we support Israel in its actions in order to squash Hamas" and calls Israel "a key strategic ally for the United States."',
  },
  {
    pid: 'owens', topic: 'Israel & U.S. Aid',
    text: 'Says "America must stand shoulder to shoulder with Israel, our strongest ally in the Middle East," and that the United States "unequivocally stands with our ally, Israel."',
  },
  {
    pid: 'scalise', topic: 'Israel Aid & Withheld Weapons',
    evidence: 'Statement responding to the National Security Memorandum 20 report on U.S. military assistance, 2024.',
  },
  {
    pid: 'stephanie_bice', topic: 'Support for Israel',
    text: 'Says Israel has an absolute right to defend itself and that Congress and the White House must stand unwavering in support of "our greatest ally in the Middle East," and backs U.S. funding for Israel\'s defense against Iran and its proxies.',
  },
  {
    pid: 'scott_perry', topic: 'Israel Aid & Package Objections',
    text: 'Says he has backed "aid for Israel and support for Israel every single time," and recognizes the 2019-2028 memorandum of understanding committing $38 billion in security assistance.',
    evidence: 'He objected to the April 2024 package because it carried more than $9 billion in Gaza humanitarian funding and bundled several theatres; he prefers single-subject bills. The objection is to the vehicle\'s contents, not to Israel\'s assistance.',
  },

  // ── election_security ─────────────────────────────────────────────────────
  {
    pid: 'bennie_thompson', topic: 'Election Security Standards & Audits',
    text: 'Co-chaired the Task Force on Election Security and authored legislation requiring paper ballots, cybersecurity standards for election-system vendors and post-election risk-limiting audits. "This should not be a partisan issue, but Congress has done far too little to prevent foreign election meddling."',
    evidence: 'Statement of January 4, 2019.',
  },
  {
    pid: 'bmoore', topic: 'State Election Law Changes',
    text: 'Joined a statement with then-Rep. Chris Stewart on the Georgia election law enacted in 2021, saying the state "has taken necessary actions to secure election integrity, a laudable and important mission," and that critics could not "credibly and accurately point to aspects of the bill that hinder" Georgians\' access to the ballot.',
  },
  {
    pid: 'emmer', topic: 'Minnesota Voter Roll Verification',
    text: 'Says "for too long, voter fraud has gone unchecked in Minnesota" and that "Minnesotans deserve to have confidence in the fairness and security of our elections."',
    evidence: 'Statement of February 2, 2026.',
  },
  {
    pid: 'frank_lucas', topic: 'Federal Election Standards & Security',
    text: 'Faults federal election legislation for "weakening our election security, redirecting hard-earned taxpayer dollars to fund political campaigns, and federalizing state and local elections," saying that in the rush to pass it "Democrats ignored feedback provided by the National Institute of Standards and Technology" that would have helped communities run "safe, secure, and accessible elections."',
    evidence: 'Statement, March 3, 2021.',
  },
  {
    pid: 'french_hill', topic: 'Citizenship Documentation at Registration',
    text: 'Says "only U.S. citizens are legally allowed to vote in our federal elections – full stop," and backs citizenship-verification requirements because they help "safeguard the integrity of our elections around the country."',
    evidence: 'Statement, July 10, 2024.',
  },
  {
    pid: 'jeffries', topic: 'Citizenship Verification & Voter Data',
    text: 'Says "Republicans have adopted voter suppression as an electoral strategy. That\'s what the so-called SAVE Act is all about," and objects to citizenship checks run against state voter rolls: "This version, as I understand it, will actually give [DHS] the power to get" those records "from states across the country," asking "Who\'d want DHS and ICE...to have more data about the American people? It\'s outrageous."',
    evidence: 'Remarks, February 9, 2026.',
  },
  {
    pid: 'jim_jordan', topic: 'Photo ID & Citizenship Checks',
    text: 'Says Americans, not foreigners, should be the ones casting ballots in American elections, that "We should have photo ID," and that a citizenship requirement is already "the law frankly." Asked what worries him most about the midterms, he named ballot chain-of-custody procedures.',
  },
  {
    pid: 'kclark', topic: 'Documentary Proof & Photo ID Rules',
    text: 'Opposes documentary-proof-of-citizenship and photo ID requirements for registration, calling them "a minefield of red tape" and saying of Republicans, "They are afraid of actual American citizens" casting ballots. She says married women who changed their names would have to "go down to a clerk and prove that they are citizens, sign affidavits, and do this in person," and objects to states handing voter rolls to the Department of Homeland Security. "This is election rigging. This is voter suppression."',
    evidence: 'Floor remarks, February 11, 2026.',
  },
  {
    pid: 'khanna', topic: 'Paper Trails & Risk-Limiting Audits',
    text: 'Co-wrote an op-ed with Michael McFaul and Alex Stamos arguing "we must act quickly and boldly to enhance the cybersecurity of our" election infrastructure, and backing requirements for "unhackable paper trails" and "risk-limiting audits across the United States." His framing: "Securing our democracy is not a partisan project."',
  },
  {
    pid: 'michael_guest', topic: 'Mail Ballot Eligibility Certification',
    text: 'Says "The foundation of any democracy is the trust that the people place in the process of the election," and backs requiring state election officials to certify that recipients of mail and absentee ballots are living citizens eligible to vote, adding that "we must set up provisions that protect our elections from natural human error."',
    evidence: 'Statement of December 9, 2020.',
  },
  {
    pid: 'mike_simpson', topic: 'Photo ID & Citizenship at Registration',
    text: 'Says "all Americans want safe and secure elections" and that requiring photo identification and verifying citizenship at registration "is a common-sense approach to strengthening current election laws."',
    evidence: 'Statement, February 11, 2026.',
  },
  {
    pid: 'owens', topic: 'Citizens-Only Federal Elections',
    text: 'Says "Upholding the U.S. Constitution and securing our nation\'s elections shouldn\'t be controversial or partisan," describes the ballot as "the fundamental freedom granted to U.S. citizens," and calls letting noncitizens cast ballots "a slap in the face to every single American."',
    evidence: 'Statement of May 16, 2024.',
  },
  {
    pid: 'stefanik', topic: 'Voter Eligibility & Proof of Citizenship',
    text: 'Says "President Trump and House Republicans are leading the way in ensuring only Americans vote in American elections," and backs codifying "into law President Trump\'s executive order to restore election integrity across the country."',
    evidence: 'Statement of April 10, 2025.',
  },
  {
    pid: 'steny_hoyer', topic: 'Paper Ballots & Voting System Security',
    text: 'Says "Nothing is more important to our democracy than ensuring that every American can safely and securely cast a ballot," and backs requiring individual, durable, voter-verified paper ballots, barring election systems from being connected to the internet or wireless technologies, funding state election infrastructure and tightening vendor accountability.',
    evidence: 'Statement as Majority Leader, June 27, 2019.',
  },
  {
    pid: 'stephanie_bice', topic: 'Access to Federal Citizenship Data',
    text: 'Says "Securing our elections is of paramount importance," and backs giving states no-cost access to federal citizenship databases and requiring a program to remove noncitizens from registration lists — measures she says "will strengthen our election administration, improve voter confidence, and ensure that American elections are ONLY for American citizens."',
    evidence: 'Statement, July 11, 2024.',
  },
  {
    pid: 'steve_womack', topic: 'Verifying Voter Citizenship',
    text: 'Says "the law is clear that the only people eligible to vote in our federal elections are U.S. citizens," and backs citizenship safeguards "needed to help ensure this standard is upheld."',
    evidence: 'Statement, February 11, 2026.',
  },
  {
    pid: 'tom_cole', topic: 'Removing Noncitizens From Voter Rolls',
    text: 'Backs requiring documentary proof of citizenship at registration and removing noncitizens from existing rolls, saying "This legislation will not only secure our elections but will also stop illegal immigrants from influencing the outcome."',
    evidence: 'Statement, April 10, 2025.',
  },
  {
    pid: 'bruce_westerman', topic: 'Proof of Citizenship for Registration',
    text: 'Says "it\'s commonsense that only American citizens should be allowed to vote in American elections" and that "lax voter registration laws have allowed noncitizens to vote in our elections."',
    evidence: 'Statement, April 10, 2025.',
  },
  {
    pid: 'dan_goldman', topic: 'Proof-of-Citizenship Registration Rules',
    text: 'Opposes documentary-proof-of-citizenship registration requirements as a threat to same-day registration, early in-person balloting and automatic voter registration, calling them "a deliberate effort to disenfranchise millions of legal American voters."',
    evidence: 'Statement with New York election-rights groups, April 17, 2025.',
  },
  {
    pid: 'mariannette_miller_meeks', topic: 'Citizenship & ID Requirements',
    text: 'Says "requiring proof of citizenship and valid ID to vote in federal elections has overwhelming support from the American people."',
    evidence: 'Statement, February 11, 2026.',
  },
  {
    pid: 'chip_roy', topic: 'Voter Eligibility & Proof of Citizenship',
    text: 'Says the aim is "to ensure only U.S. citizens vote in federal elections," backing documentary proof of citizenship before a state registers someone for a federal election and removal of noncitizens from existing rolls.',
    evidence: 'Statement, April 2025.',
  },
  {
    pid: 'donalds', topic: 'Nationwide Voter ID',
    text: 'Backs "common-sense, nationwide Voter ID" to "secure our federal elections," requiring physical photo identification to vote in federal elections, with verification alternatives for mail-in ballots and exemptions for military, disabled and elderly voters.',
    evidence: 'Statement, July 23, 2026.',
  },
  {
    pid: 'nadler', topic: 'Proof-of-Citizenship Requirements',
    text: 'Calls proof-of-citizenship requirements for federal elections "a solution in search of a problem," noting that "American voters are already required to declare that they are U.S. citizens when registering to vote" and that "every credible study has concluded that noncitizen" participation "in federal elections is practically nil."',
    evidence: 'Ranking Member opening statement, House Judiciary Subcommittee hearing, September 10, 2024.',
  },
  {
    pid: 'marie_gluesenkamp_perez', topic: 'Citizen-Only Voting',
    text: 'Says the ballot is "a sacred right belonging only to American citizens" and that she does not support noncitizens taking part in American elections, while calling several of the SAVE Act\'s provisions deeply flawed.',
  },

  // ── border_security ───────────────────────────────────────────────────────
  {
    pid: 'michael_guest', topic: 'Border Security',
    text: 'Says "our border is broken" and that "We must stop the flow of illegal drugs from pouring into our communities," arguing "Congress must fill the gap of leadership created by the inaction of this Administration." He chairs the Homeland Security Subcommittee on Border Security and Enforcement.',
  },
  {
    pid: 'steve_womack', topic: 'Border Security',
    text: 'Supports continued border-barrier construction and federal funding for enforcement: "We are delivering more resources to secure our border, support our law enforcement agents, and keep America\'s communities safe."',
  },

  // ── gov_regulation / gov_transparency / deportations / taxes / trading ────
  {
    pid: 'boebert', topic: 'Reining In the Federal Bureaucracy',
    evidence: 'Issue page, "Oversight and Accountability"; in May 2024 she moved to strike the Bureau of Land Management\'s "Fluid Mineral Leases and Leasing Process" rule.',
  },
  {
    pid: 'seth_moulton', topic: 'Epstein Files & Forced Disclosure',
    text: 'Wants the Epstein files released, saying "a lot of the American people think it\'s ridiculous that the rich and powerful get protected and that\'s obviously what\'s going on here," and pressing the point directly: "We want to vote on this, let us vote on it, Mr. Speaker."',
    evidence: 'He argued the House should not have left for recess with the matter unresolved — "There\'s a lot of work to do, we shouldn\'t be home."',
  },
  {
    pid: 'seth_moulton', topic: 'ICE Funding & Deportation Standards',
    text: 'Says "I refuse to fund ICE" — "No more blank checks for an agency" he argues has killed people it encountered — and frames the money as a tradeoff against health care for the same taxpayers.',
    evidence: 'He objects that watering down "the requirement to actually convict somebody" undermines due process, warning that someone "who is actually innocent but charged with a crime like shoplifting could be arrested and deported."',
  },
  {
    pid: 'troy_downing', topic: 'Tax Relief',
    text: 'Backs the 2025 tax-and-spending law as tax relief that prevents an increase on Montana families.',
  },
  {
    pid: 'rick_crawford', topic: 'Tax Relief',
    text: 'Backs preserving "the largest tax cut in history for working and middle-class Americans."',
  },
  {
    pid: 'rob_bresnahan', topic: 'Stock Trading Ban',
    text: 'Campaigned in 2024 on barring members of Congress from trading individual stocks and has pushed legislation to do it — though his own active trading has since drawn scrutiny.',
    evidence: 'Reporting found he continued trading heavily through 2025.',
  },
];

// ── field surgery ────────────────────────────────────────────────────────────
// A stance row is usually one line, but the longer ones are wrapped across up to
// four (`{ topic:… ,` / `text:…,` / `evidence:…,` / `source:… },`). So edits are
// applied over a row SPAN rather than a line: from the `{ topic:` line forward to
// the line that closes the object. Values are single-quoted with `\'` escapes.
// Walk from the opening quote to the first UNESCAPED closing quote rather than
// regexing, so an apostrophe inside the value cannot truncate the replacement.
function fieldSpan(line, field) {
  const open = line.search(new RegExp('(?:^|[\\s{,])' + field + ":\\s*'"));
  if (open < 0) return null;
  const start = line.indexOf("'", line.indexOf(field + ':', open)) + 1;
  for (let i = start; i < line.length; i++) {
    if (line[i] === '\\') { i++; continue; }
    if (line[i] === "'") return { start, end: i };
  }
  return null;
}
// The row's last line: the one that closes the object. Rows are at most a handful
// of lines, so the scan is bounded and never runs past the next row.
function rowEnd(lines, i) {
  for (let j = i; j < lines.length && j < i + 8; j++) {
    if (/\}\s*,?\s*$/.test(lines[j])) return j;
  }
  return i;
}
function findFieldLine(lines, i, end, field) {
  for (let j = i; j <= end; j++) if (fieldSpan(lines[j], field)) return j;
  return -1;
}
function readField(lines, i, end, field) {
  const j = findFieldLine(lines, i, end, field);
  if (j < 0) return '';
  const s = fieldSpan(lines[j], field);
  return lines[j].slice(s.start, s.end).replace(/\\(.)/g, '$1');
}
function writeField(lines, i, end, field, value) {
  const j = findFieldLine(lines, i, end, field);
  if (j < 0) return false;
  const s = fieldSpan(lines[j], field);
  lines[j] = lines[j].slice(0, s.start) +
    value.replace(/\\/g, '\\\\').replace(/'/g, "\\'") +
    lines[j].slice(s.end);
  return true;
}

// ── apply ───────────────────────────────────────────────────────────────────
const G = loadGuards();
const lines = fs.readFileSync(SRC, 'utf8').split('\n');
const want = new Map(EDITS.map(e => [e.pid + '||' + e.topic, e]));
const applied = [];
const problems = [];
let pid = '?';

for (let i = 0; i < lines.length; i++) {
  const L = lines[i];
  const pm = L.match(/^\s{2,6}([a-z0-9_]+):\s*\[/);
  if (pm) { pid = pm[1]; continue; }
  const tm = L.match(/topic\s*:\s*'((?:[^'\\]|\\.)*)'/);
  if (!tm) continue;
  const id = pid + '||' + tm[1].replace(/\\(.)/g, '$1');
  const edit = want.get(id);
  if (!edit || edit._done) continue;

  const end = rowEnd(lines, i);
  const before = lines.slice(i, end + 1).join('\n');
  for (const field of ['text', 'evidence']) {
    if (!edit[field]) continue;
    if (!writeField(lines, i, end, field, edit[field])) {
      problems.push(`${id}: has no \`${field}\` field to replace`);
    }
  }
  if (lines.slice(i, end + 1).join('\n') === before) { problems.push(`${id}: nothing changed`); continue; }

  // The row as it will ship, through the guards that will judge it.
  const row = {
    text: readField(lines, i, end, 'text'),
    evidence: readField(lines, i, end, 'evidence'),
    source: { url: readField(lines, i, end, 'url') },
  };
  const b10 = G.blockStance(row.text);
  const b15 = G.blockDependentStance(row, null);
  if (b10) problems.push(`${id}: rewritten text STILL blocks — ${b10}`);
  if (b15) problems.push(`${id}: rewritten row STILL blocks — ${b15}`);

  edit._done = true;
  applied.push({ id, fields: ['text', 'evidence'].filter(f => edit[f]) });
}

const missing = EDITS.filter(e => !e._done).map(e => e.pid + '||' + e.topic);

console.log(`Independent-stance backfill — ${EDITS.length} rows targeted`);
console.log(`  rewritten            : ${applied.length}`);
console.log(`  text edits           : ${applied.filter(a => a.fields.includes('text')).length}`);
console.log(`  evidence edits       : ${applied.filter(a => a.fields.includes('evidence')).length}`);

if (missing.length) {
  console.error(`\n! ${missing.length} targeted row(s) not found — refusing to write:`);
  for (const k of missing) console.error(`  - ${k}`);
  process.exit(1);
}
if (problems.length) {
  console.error(`\n! ${problems.length} rewritten row(s) still fail the shipped guards — refusing to write:`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (!WRITE) { console.log('\nDry run. Re-run with --write to apply.'); process.exit(0); }
fs.writeFileSync(SRC, lines.join('\n'), 'utf8');
console.log(`\nWrote ${applied.length} row(s) to politician-stances.js`);
