// ─────────────────────────────────────────────────────────────────────────────
// profile-evidence.js — the Spotlight ↔ evidence presentation layer
// ─────────────────────────────────────────────────────────────────────────────
// This file is what is LEFT of the retired Accountability Score module. It began
// as accountability-score.js: a composite 0–100 grade, a curated override map for
// two flagship profiles, a five-band rating vocabulary ("Highly Accountable" …
// "Low Accountability"), an inline purple score card, a browse-card score badge,
// and a deep-analysis overlay behind three buttons. All of that is gone — file,
// markup, vocabulary and doors. Nothing in the publish set computes, stores,
// renders or names a composite accountability grade any more, and
// scripts/test-accountability-retired.mjs fails the build if any of it returns.
//
// What survived is the part that was never a score: the shared evidence layer the
// rest of the app reads. Alias maps that answer "which record is this person",
// the escaping and label helpers, the Spotlight theme line, the evidence row, the
// driver computation, the pattern bar and the full-profile Spotlight section.
// Those are consumed by profiles-full.js, compare-hub.js, stance-helpers.js,
// say-vs-do.js, word-action.js, profile-dossier.js and others — they describe
// evidence, they do not grade a person, and removing them would have deleted the
// material underneath the retirement rather than the model on top of it.
//
// The code below is byte-for-byte the surviving half of the original module, in
// its original order, loaded from the same position in index.html — so execution
// order and global scope are unchanged for every one of those callers. It is
// ~9× smaller than what it replaces, which is the first-load win this rename
// exists to bank.
// ─────────────────────────────────────────────────────────────────────────────
  (function(){
    'use strict';
    // ═══ Shared Spotlight ↔ Accountability linkage ═══════════════════════════
    // The Spotlight section and the Accountability card both render from ONE
    // ordered list of score-driving items, so they map to each other by index:
    // contribution row i in the Accountability card highlights Spotlight card i,
    // and tapping Spotlight card i highlights contribution row i. The source is
    // strictly the official's own record — curator-flagged Spotlight entries
    // (impact 'positive'/'negative') followed by the kept/broken promise ledger
    // the score is actually computed from. Nothing is invented here.
    window._slSafeId = function(id){ return String(id == null ? '' : id).replace(/[^a-zA-Z0-9_-]/g, ''); };

    // Shared HTML-attribute/text escaper for source labels and URLs rendered by
    // the Spotlight cards, the medium modal and the Accountability card.
    window._slEsc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };

    // Maps a Spotlight item's `category` to the Accountability category it feeds.
    window._slCatLabel = function(key){
      var m = { promise:'Promise Keeping', voting:'Voting Consistency', rhetoric:'Rhetoric vs Reality', redflags:'Red Flags / Controversies', transparency:'Transparency' };
      return m[key] || '';
    };

    // ═══ Curated Accountability Spotlight — the INTEGRITY data layer ══════════
    // This is the personal-integrity-and-consistency record the Accountability of
    // Truth Score reads from — deliberately SEPARATE from Promise % (which tracks
    // formal in-office votes/bills/pledges). Each entry is a summarized, sourced
    // highlight about how an official behaves outside their formal power: whether
    // their public words match their actions, how they conduct themselves across
    // platforms and over time, and notable controversies or principled stands
    // that reflect character. Curated repo-side so it ships and renders without a
    // database round-trip; editor/Firestore `spotlight` entries merge on top.
    //
    // Item shape (top 3–5 per official; quality over quantity):
    //   impact   : 'positive' (words match actions / principled consistency) or
    //              'negative' (reversal, inconsistency, controversy). Drives the score.
    //   category : which integrity dimension it touches —
    //              'rhetoric' (words vs. reality), 'redflags' (controversy/conduct),
    //              'transparency', 'voting', 'promise'.
    //   date     : the year/span of the underlying, verifiable event.
    //   headline : the one-line summary shown everywhere.
    //   facts    : the grounded specifics (plain text; no fabrication).
    //   why      : why it speaks to integrity/consistency specifically.
    //   source   : { label, url } — clear sourcing for the claim.
    //   tags     : 1–2 human-readable categories from a small, fixed vocabulary
    //              (Consistency, Notable Actions, Public Statements, Rhetoric vs
    //              Reality, Positive Leadership, Public Behavior) shown as skimmable
    //              chips in the medium modal and full profile. Present on EVERY
    //              highlight so categorization is uniform across all officials.
    //
    // NOTE for future work — these officeholders still appear in Key Races /
    // Relevant to Me with a THIN integrity record here and need research:
    // bob_stevenson, lisa_shepherd, rshipp, jdraxler, jwestwood, jake_sawyer,
    // and the Davis/Weber/SLC State House profiles still missing data
    // (gsnow, jellis, sstoddard, cperry, pstrong) plus the local MAYORS and
    // 2026 CANDIDATES tiers, which remain the sparsest part of this layer.
    // The June 2026 expansion added 22 more Wasatch Front State Senators &
    // Representatives concentrated in Davis, Weber, Salt Lake County and Utah
    // County — janderegg, dhinkins, rwinterton, dowens_st, rspendlove,
    // kstratton, jbriscoe, swaldrip, cmusselman, jburton, tyler_clancy,
    // jferry, carl_albrecht, paul_a_cutler, stewart_e_barlow, cheryl_acton,
    // james_dunnigan, ryan_d_wilcox, jon_hawkins, doug_fiefia,
    // kay_christofferson and nelson_abbott — each with 3–5 sourced,
    // pattern-focused highlights, `tags`, and a one-line theme, plus aliases
    // (tclancy, dhawkins, mmckell, csnider) so the data lights up on whichever
    // surface the id comes from. An earlier pass added 20 legislators and
    // backfilled tags onto the original national figures, so every official is
    // uniformly categorized, tagged and themed.
    window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {};;

    // ── Overall Accountability theme per official (the one-line read) ─────────
    // A short, balanced summary of the integrity picture the items above add up
    // to — shown above the Spotlight drivers and in the medium modal so the
    // section opens with a synthesis, not just a list. Deliberately even-handed
    // (names both the strength and the caveat) and, like the items, separate
    // from Promise %. An editor/Firestore `spotlightTheme` on the document
    // overrides this curated default.
    window.ACCT_THEME = window.ACCT_THEME || {
      plumb: 'A frontline ER physician whose overdose-prevention work predates and matches her legislating — a rare record measured in lives saved.',
      verona_mauga: 'A barrier-breaking newcomer with a thin but real early record; a first-in-the-nation child-protection law is the clearest marker so far, while direct on-camera statements from her remain limited.',
      curtis: 'Consistent on his signature climate-Republican brand across offices, but the voting record runs behind the rhetoric.',
      lee: 'Long, genuine fiscal-constitutional consistency, paired with sharp reversals and norm-bending conduct on his own platforms.',
      bmoore: 'A work-within-the-system institutionalist whose affiliations, output and a principled certification vote mostly match the brand — with the occasional procedural maneuver.',
      maloy: 'Grounds her rural-water and public-lands work in genuine legal expertise, but pairs it with selective credit-claiming — touting federal funds from a law whose spending she has publicly criticized.',
      kennedy: 'Unusually consistent — a physician whose healthcare focus has held steady across four offices and who handled a high-profile loss gracefully.',
      owens: 'A strong personal-responsibility throughline, undercut by spending and election-conduct choices that sit against the brand.',
      lyman: 'Acts on his stated convictions at real personal cost, but handled a 2024 primary loss with unproven fraud claims.',
      cox: 'Generally lives the civility and empathy he preaches, with a real gap between conservation rhetoric and large industrial approvals.',
      trump: 'Highly faithful to ideological promises, but a heavy load of broken quantitative pledges and norm controversies.',
      dhenderson: 'A consistent, fact-based defender of election integrity — including against pressure from officials who wanted a different answer.',
      sadams: 'An effective long-time leader, but a 2024–25 non-disclosure raised real conflict-of-interest and transparency questions.',
      mschultz: 'States his agenda plainly and delivers it, and has turned oversight toward members of his own chamber when needed — though his push of the court-voided “Amendment D” cut against that transparency.',
      tlee: 'Polarizing and combative; early concealment gave way to openly stated — and openly criticized — conduct.',
      blouin_s13: 'A minority-party voice who presses transparency standards on the chamber’s leadership, on the merits.',
      hollins_h24: 'Tight alignment between her social-work expertise and a steady, principled equity agenda.',
      lescamilla: 'A barrier-breaking west-side advocate who backs her positions with follow-through and accepts setbacks gracefully.',
      kriebe: 'A teacher-legislator whose public-education advocacy lines up with her classroom career and a self-described willingness to cast lonely “no” votes.',
      spitcher: 'A working prosecutor who champions criminal-justice reform even against her own profession’s lobby, and one of the chamber’s most effective members.',
      bking: 'A long-serving minority leader whose insurance-law career matches his health focus, who lost a statewide race on values rather than grievance.',
      jdailey: 'A public-health specialist and steady, multi-year steward of Utah’s medical-cannabis program who builds bipartisan coalitions from the minority.',
      dmccay: 'Openly owns his signature, polarizing causes for years, with a pragmatic step back from his near-total abortion ban once courts intervened.',
      kivory: 'Built a genuinely consistent national land-transfer crusade that also drew a formal watchdog complaint he was never charged over.',
      mwinder: 'A capable public servant whose record is permanently marked by a 2011 fake-byline deception he ultimately disclosed himself.',
      jteuscher: 'A constitutional-law attorney entrusted with ethics oversight; a cleaner, lower-drama public-conduct record so far.',
      cpierucci: 'A fast-rising young leader whose signature school-choice law was struck down — and who answered the ruling by attacking the judge.',
      seliason: 'Utah’s go-to suicide-prevention lawmaker — a decade-long, consensus-built effort that helped seed the national 988 line.',
      amillner: 'A former university president whose education and economic-development focus in the Senate mirrors the institution she once led.',
      cwilson: 'A third-generation Logan business owner who ran on a clear reform message and stays active in local charity.',
      dthatcher: 'Left the dominant party on principle and originated the idea behind the national 988 line — a record of personally grounded, costly stands.',
      klisonbee: 'A consistent lead sponsor on abortion restrictions whose 2022 “intake of semen” remark became a national flashpoint she had to walk back.',
      wharper: 'The Legislature’s longest-serving member, with a decades-long transportation focus and a national, bipartisan leadership role.',
      lfillmore: 'A career-educator senator focused on education funding whose 2025 school-tax overhaul drew a “public trust” veto.',
      mballard: 'A higher-education budget chair, recognized by the institutions she funds, who publicly pushes for fewer, better bills.',
      kgrover: 'A former educator who steered Utah’s marquee anti-DEI law through the Senate and made on-record commitments to narrow its reach.',
      nthurston: 'A PhD health economist who pursues market-pragmatic, sometimes cross-ideological cost-cutting and openly names contradictions in policy he helped write.',
      tweiler: 'An accessible, plain-spoken senator with a consistent decade-long internet-safety record — though the same blunt online style draws as much criticism as praise.',
      rward: 'A practicing family physician who legislates from medical evidence and will vote alone when the science points the other way.',
      kcullimore: 'A privacy-and-tech legislator who wrote Utah’s consumer-privacy and youth social-media laws, shadowed by conflict questions over his family firm’s eviction practice.',
      aromero: 'A community-organizer-turned-minority-leader whose multi-year fight to test Utah’s rape-kit backlog became law.',
      cbramble: 'A powerful CPA-dealmaker and former national legislative leader — two decades of tax-cutting consistency and a defended election compromise, paired with a hardball reputation.',
      jstevenson: 'A long-serving Davis County budget chief whose appropriations work and Hill AFB advocacy match his district — though the budgets he writes have outpaced his own restraint rhetoric.',
      valpeterson_h56: 'A higher-education budget leader who funds the very university where he is a vice president — deep expertise that doubles as a standing conflict question.',
      fitisemanu_h30: 'The first Pacific Islander in the Utah Legislature, a public-health professional whose health-equity focus tracks his career and community.',
      mckell_s25: 'A trial attorney who became the national face of regulating minors’ social media, defending the laws openly through the litigation they invited.',
      gwynn_h6: 'A working law-enforcement officer who legislates the public-safety issues he handles on duty.',
      bwilson: 'A construction-businessman Speaker who made rescuing the Great Salt Lake his signature cause, then spent ~$2.8M of his own money on a Senate bid that finished a distant third.',
      kwan_s12: 'The first Chinese-American woman in the Legislature — a psychology professor whose steady advocacy against anti-Asian hate and for mental health tracks her identity and career.',
      brammer_s21: 'A BYU-trained attorney behind the unanimously praised Business and Chancery Court, whose porn-label and platform bills test whether his “not censorship / free speech” framing matched reality.',
      ssandall: 'A third-generation farmer whose Great Salt Lake and agricultural-water laws match his career, known for brokering deals to land contested water legislation.',
      evickers: 'The Legislature’s only pharmacist and a three-term Senate Majority Leader whose deep healthcare ties power his rural-health focus — and also drew conflict-of-interest accusations he rebutted.',
      snider_h5: 'A rancher, land-conservancy director and volunteer firefighter whose natural-resource and firefighter-health laws line up tightly with his life, elevated young to House Majority Leader.',
      defay_h15: 'A Davis County family-business executive and GOP campaign veteran appointed to Brad Wilson’s seat, who carried a Democrat’s child-marriage bill to a near-unanimous vote.',
      hall_h11: 'A registered nurse and freshman who authored Utah’s marquee anti-DEI law, making on-record promises about what it would not do — a clean rhetoric-vs-reality test still to be checked.',
      koford_h10: 'A Weber County Republican who flipped a seat by 309 votes on her second try and became a first-term lead on Great Salt Lake conservation, heavily funded by GOP leadership PACs.',
      jake_sawyer: 'A former Weber County GOP chair newly elected in 2024 whose record is still mostly campaign promises — one to watch as a voting record accumulates.',
      fgibson: 'A former House Majority Leader with a real record on homelessness and dropout prevention, but whose inland-port leadership repeatedly leaned against transparency and local legal recourse.',
      cory_maloy_h52: 'A communications professional with a consistent, multi-session Second Amendment and election-integrity record in a safe Lehi seat.',
      whyte_h63: 'An MPA-credentialed appropriations chair with strong local support but a thin public-conduct record, who has skipped voluntary candidate surveys.',
      gricius_h50: 'An Eagle Mountain citizen-activist-turned-legislator with a high-volume, high-controversy portfolio — election-data privacy and AI chatbot rules alongside the nation’s first fluoride ban.',
      lisa_shepherd: 'A longtime Provo GOP organizer and former county-commission policy advisor newly elected in 2024 — a coherent service path with a record still too short to fully test.',
      kohler_h59: 'A generational Midway dairy farmer and 16-year county commissioner whose water-and-ag focus fits his life, notable for openly owning a floor mistake and a non-absolutist take on book bans.',
      bolinder_h68: 'A Grantsville business-background legislator elevated to leadership in 2025 who then announced he won’t seek re-election — a thin public record beyond leadership and steady wins.',
      // June 2026 Wasatch Front expansion themes
      janderegg: 'A technology professional whose decade-long data-privacy and economic-development focus tracks his career, with a steady, low-drama public record.',
      dhinkins: 'A working rancher whose record stays rooted in rural agriculture and energy, with the occasional cross-grain stand — like protecting public-worker bargaining rights.',
      rwinterton: 'The Uinta Basin’s consistent energy-and-lands voice, who cut against type to sponsor a state refugee-services office.',
      dowens_st: 'A former educator turned methodical central-Utah steward, pairing rural energy and public-safety bills with on-the-record transparency and property-rights work.',
      rspendlove: 'The Legislature’s economist-in-residence: a former state chief economist who supplies the data behind Utah’s tax cuts and favors substance over spectacle.',
      kstratton: 'An attorney-legislator who practices the conservation he preaches — putting water-wise mandates on government first — across a disciplined public-lands and water record.',
      jbriscoe: 'A former teacher and long-serving Salt Lake City Democrat whose decade of public-education, clean-air and transit advocacy is consistent and openly argued from the minority.',
      swaldrip: 'The Legislature’s housing expert who gave up his seat to implement his own ideas as the Governor’s housing advisor, staking his credibility on a measurable 35,000-home target.',
      cmusselman: 'A consistent child-safety and public-safety legislator who also took on the unglamorous work of chairing economic-development appropriations.',
      jburton: 'A retired Major General who legislates the veterans and National Guard world he led, and who stepped into a thankless interim health post during the pandemic.',
      tyler_clancy: 'A working Provo police detective and one of the chamber’s youngest members who legislates the homelessness and public-safety beat he walks — though his zero-tolerance camp approach draws advocate pushback.',
      jferry: 'A fifth-generation farmer who authored Utah’s Great Salt Lake water-leasing law and then left office to run the agency that executes it — strong follow-through shadowed by a standing conflict-of-interest question.',
      carl_albrecht: 'A career rural-utility executive steering Utah’s nuclear and water future, with a coherent energy-and-agriculture portfolio and proactive disaster-resilience work.',
      paul_a_cutler: 'A Davis County representative who makes accountability his subject — tightening conflict-of-interest and candidate-disclosure rules on officials like himself.',
      stewart_e_barlow: 'A practicing surgeon who legislates healthcare from firsthand experience, an expertise-to-law match that also raises the usual insider-writing-his-own-industry’s-rules question.',
      cheryl_acton: 'A steady West Jordan representative focused on disclosure and student-data privacy, willing to apply tougher candidate-disclosure rules to her own contests.',
      james_dunnigan: 'A long-serving health-and-insurance workhorse with genuine institutional expertise — and a recurring conflict-of-interest question because that expertise is his own industry.',
      ryan_d_wilcox: 'An Ogden-area representative with a durable limited-government and child-protection throughline across a long, interrupted tenure, who pushes structural checks on rulemaking.',
      jon_hawkins: 'A Pleasant Grove consensus-builder trusted with technical, high-stakes bills that pass by near-unanimous margins, including a governor-requested government restructuring.',
      doug_fiefia: 'A tech-industry insider turned freshman who writes first-in-the-nation data-ownership and child-safety law against his former industry’s defaults — a focused, independent debut.',
      kay_christofferson: 'A civil engineer on the transportation beat whose expertise-to-policy match is clean, but whose state-override-of-a-city move sits in tension with the local-control principle he otherwise argues for.',
      nelson_abbott: 'An Orem attorney doing the careful, unglamorous civil-justice reform — guardianship, competency and probate — that quietly protects people with little political voice.',
      // June 2026 high-visibility gap-fill — nationally prominent figures and Utah mayors/officials.
      massie: 'A genuinely consistent libertarian-constitutionalist who casts lonely “no” votes on principle — including against bills his own leadership and president backed — though critics read the same independence as obstruction.',
      tgabbard: 'A high-profile journey from progressive Democrat to Trump-era DNI, anchored by a real anti-interventionist core but shadowed by conviction-vs-ambition questions after a full party switch.',
      hegseth: 'A combat-veteran defense secretary whose warfighter focus is genuine, but who arrived amid a razor-thin confirmation and information-handling lapses that test the standards he sets for the force.',
      boebert: 'A populist whose hardline brand authentically matches her biography, undercut by repeated personal-conduct controversies and a district switch to a safer seat.',
      mtg: 'A maximally confrontational figure who states her positions plainly but carries a record heavy on sanctions, conspiracy claims later walked back, and self-defeating leadership fights.',
      gaetz: 'A Trump-era provocateur who forced out a Speaker and then flamed out of an AG nomination, his tenure ending under a cloud of ethics questions he resigned ahead of.',
      rfkjr: 'An environmental-lawyer-turned-health-secretary with a real anti-establishment throughline, but whose vaccine claims run against scientific consensus and whose 2024 path raised conviction-vs-deal questions.',
      sanders: 'Remarkably consistent on economic populism for four decades — the rare politician whose message barely changes — with a recurring critique about wealth-vs-rhetoric.',
      nhaley: 'A disciplined establishment hawk capable of costly stands like the Confederate-flag removal, whose Trump-era posture has shifted with the political winds.',
      biden: 'A career institutionalist who kept major legislative and withdrawal promises and honored the transfer of power, but whose candor about his age and capacity became the defining accountability question of his term.',
      obama: 'A disciplined communicator who kept his signature ACA promise, paired with real rhetoric-vs-reality gaps on transparency, surveillance and “keep your plan.”',
      gwbush: 'A consequential wartime president who later owned his failures, but whose Iraq-WMD rationale and Katrina response remain central accountability marks — balanced by the lifesaving PEPFAR program.',
      cstewart: 'A reliable Utah national-security conservative whose mid-term 2023 resignation, citing family health, drew both sympathy and criticism for the costly special election it forced.',
      jdougall: 'A self-styled “watchdog” auditor who built genuine government-transparency tools, balanced against the partisan edge critics saw in some of his probes.',
      emendenhall: 'A data-and-air-quality SLC mayor whose environmental brand is backed by real initiatives, tested by the homelessness and downtown-safety pressures every big-city mayor faces.',
      jwilson: 'A veteran public servant from a prominent Utah family whose county-government record is steady and process-respecting, shadowed by the usual dynasty questions.',
      // July 2026 — District 6. This blurb is load-bearing, not decoration: the roster
      // `office` field can only say "Utah State Representative" (a /former/ office on a
      // pid in _UTAH_HOUSE_INFO is a hard failure by design), so the dates of his
      // federal service have to live somewhere a reader sees them, and this is it.
      rob_bishop: 'A former Utah House Speaker and nine-term U.S. Representative (2003–2021) who returned to the state House in May 2026 by special election, back on the public-lands and water fights he built his federal career on — and again pledging to term-limit himself.'
    };

    // ── Spotlight key aliases ────────────────────────────────────────────────
    // A handful of sitting legislators carry rich curated Spotlight data under the
    // browse-directory pid (e.g. `dmccay`) while the "Relevant to Me" surface
    // (_getPrimaryReps) iterates the CMP_DATA pid (e.g. `mccay_s11`). This map
    // lets the same drivers and theme light up on BOTH surfaces by resolving the
    // CMP_DATA pid back to the curated key when a direct lookup misses. Add a pair
    // here whenever a person exists under two ids and only one carries Spotlight.
    window.ACCT_ALIAS = window.ACCT_ALIAS || {
      mccay_s11: 'dmccay',
      harper_s16: 'wharper',
      teuscher_h44: 'jteuscher',
      eliason_h45: 'seliason',
      ivory_h39: 'kivory',
      lisonbee_h14: 'klisonbee',
      // `cullimore_s19` is a RETIRED id (db/vr-pid-aliases.json) — it was the
      // duplicate district-ballot record for Sen. Kirk Cullimore, merged into
      // `kcullimore`. Kept here on purpose: a saved My-Team pick or bookmark stored
      // under the old id still resolves to his curated Spotlight data.
      cullimore_s19: 'kcullimore',
      // June 2026 Wasatch Front expansion — map Power-Map short pids to the
      // canonical curated keys the new Spotlight/theme data is stored under.
      tclancy: 'tyler_clancy',
      dhawkins: 'jon_hawkins',
      mmckell: 'mckell_s25',
      csnider: 'snider_h5',
      // June 2026 video-evidence pass — bridge the browse-roster ids to the
      // CMP_DATA pids the curated Spotlight/theme data is stored under, so the
      // integrity items (and the new video-grounded ones) light up on the
      // browse profile too, not only the Relevant-to-Me surface.
      trevor_lee: 'tlee',
      escamilla: 'lescamilla',
      romero: 'aromero',
      stephanie_gricius: 'gricius_h50',
      jake_fitisemanu: 'fitisemanu_h30',
      // June 2026 connected-evidence completion — bridge the remaining sitting
      // Utah State Legislators' browse-roster ids to the curated keys their
      // Spotlight/theme data is already stored under. Each promise and Issue
      // Position for these members already carries a shared issueKey; without
      // this alias their (issueKey-tagged) Spotlight items never resolve on the
      // browse profile, so the Connected-Evidence view could only ever show the
      // stance+promise pair, never the full three-layer stance+promise+record.
      // Every mapping is name-verified against the curated entry's content.
      vickers: 'evickers',
      schultz: 'mschultz',
      weiler: 'tweiler',
      mccay: 'dmccay',
      cullimore: 'kcullimore',
      stevenson: 'jstevenson',
      millner: 'amillner',
      sandall_s: 'ssandall',
      blouin: 'blouin_s13',
      grover: 'kgrover',
      mckell: 'mckell_s25',
      val_peterson: 'valpeterson_h56',
      eliason: 'seliason',
      teuscher: 'jteuscher',
      hollins: 'hollins_h24',
      ray_ward: 'rward',
      snider: 'snider_h5',
      lisonbee: 'klisonbee',
      ken_ivory: 'kivory',
      brady_brammer: 'brammer_s21',
      katy_hall: 'hall_h11',
      // Split-key evidence fix: the Batch 6 Salt Lake County roster stored Sheriff
      // Rivera's profile under 'rosie_rivera_slco' (matching her curated stance cards),
      // but her Evidence Locker items live under the older 'rosie_rivera' key. Bridge
      // them so her connected evidence surfaces on the profile.
      rosie_rivera_slco: 'rosie_rivera',
      // July 2026 launch cleanup — collapse duplicate person records to one
      // curated key each (see scripts/cleanup-utah-duplicate-records-jul2026.mjs).
      mike_smith_utco: 'mike_smith_sheriff',
      mhogan: 'michelle_kaufusi',
      dwatts: 'monica_zoltanski_sandy',
      rwood: 'troy_walker_draper',
      // `calbrecht` is a RETIRED id (db/vr-pid-aliases.json) — the second Carl
      // Albrecht record, whose six bill-sourced stance cards, Evidence Locker group
      // and theme blurb were merged into `carl_albrecht` (the roster / browse /
      // Utah-map id) in July 2026. Kept here for the same reason as
      // `cullimore_s19`: a saved My-Team pick or bookmark stored under the old id
      // still resolves to his curated Spotlight data.
      calbrecht: 'carl_albrecht',
      // July 2026 surface-split sweep — browse-directory pid → curated roster id
      // for the Utah legislators whose spotlight cards are keyed on a slug of
      // their display name while their cmp-data.js record lives under a short id.
      // These are ONE person with one roster record, not merged duplicates: the
      // curated stance block stays under the name-slug key per this repo's
      // stance-key convention (see db/vr-pid-aliases.json and STANCE_ALIASES),
      // and _resolveStanceList()'s name-slug fallback already reached it. What
      // was missing is the profile hop — openModal() resolves PROFILES/CMP_DATA
      // and, before this pass, never followed ACCT_ALIAS, so tapping any of these
      // cards dead-ended on "This profile couldn't be loaded". Bridging them here
      // also brings their cards under section 6's label-vs-roster check.
      // (`derek_brown` is the exception — a genuine retired id, see below.)
      derek_brown:       'derek_brown_ut',
      evan_vickers:      'evickers',
      mike_mckell:       'mckell_s25',
      mike_schultz:      'mschultz',
      steve_eliason:     'eliason_h45',
      karen_kwan:        'kwan_s12',
      daniel_mccay:      'mccay_s11',
      ariel_defay:       'defay_h15',
      wayne_harper:      'harper_s16',
      keith_grover:      'kgrover',
      kirk_cullimore:    'kcullimore',
      mike_kohler:       'kohler_h59',
      rosie_rivera:      'rosie_rivera_slco',
      sandra_hollins:    'hollins_h24',
      angela_romero:     'aromero',
      karianne_lisonbee: 'lisonbee_h14',
      jordan_teuscher:   'teuscher_h44',
      ann_millner:       'amillner',
    };

    // ── Profile-id resolution — the other half of ACCT_ALIAS's old dual duty ──
    // ACCT_ALIAS above answers "where is this person's CURATED data?" — its values
    // are theme / ACCT_SPOTLIGHT keys, and six of them (`kivory`, `wharper`,
    // `seliason`, `klisonbee`, `dmccay`, `jteuscher`) deliberately have no
    // cmp-data.js record at all. Profile loading needs the opposite answer: "which
    // id has a real roster record?" Reading ACCT_ALIAS for both questions is what
    // left `ken_ivory` → `kivory` resolving to an id that names nobody, so the
    // modal dead-ended even though Ken Ivory is in the roster as `ivory_h39`.
    //
    // This table answers ONLY the profile question, and only where ACCT_ALIAS
    // cannot. Every value MUST be a live cmp-data.js id — scripts/
    // test-identity-integrity.mjs section 11 enforces that, and also fails if a
    // new curated key is added without a bridge here. Each mapping is the REVERSE
    // of an existing ACCT_ALIAS entry (`ivory_h39: 'kivory'` is the repo already
    // saying those two ids are one person), so nothing here is a new claim.
    //
    // ACCT_ALIAS is intentionally NOT edited: the curated key is re-derived from
    // the roster id by its existing entries, which is why the ACCT_THEME blurb and
    // the ACCT_SPOTLIGHT drivers keep resolving after a click lands on the roster
    // id (`kivory` → opens `ivory_h39` → _slTheme follows `ivory_h39: 'kivory'`
    // → ACCT_THEME.kivory). Its 2-hop curated chains are left alone; profile
    // resolution no longer walks them.
    window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {
      // curated keys with no roster record of their own
      kivory:    'ivory_h39',
      wharper:   'harper_s16',
      seliason:  'eliason_h45',
      klisonbee: 'lisonbee_h14',
      dmccay:    'mccay_s11',
      jteuscher: 'teuscher_h44',
      // short browse / catalog pids whose ACCT_ALIAS entry targets one of those
      ken_ivory: 'ivory_h39',
      eliason:   'eliason_h45',
      teuscher:  'teuscher_h44',
      lisonbee:  'lisonbee_h14',
      mccay:     'mccay_s11',
      // Stance-block keys. Each is a slug of the roster record's own display name
      // — the documented stance-key convention (db/vr-pid-aliases.json), where 24
      // of the 25 Utah "surface splits" turned out to be ONE record whose curated
      // block is keyed on the name slug, not two identities. So these are reverse
      // bridges, exactly like the ACCT ones above, and not merges:
      // _resolveStanceList(rosterId) already returns the block filed under the key
      // on its left. Without them a Stance Library row, a comparison-board dot and
      // an issue-view chip all opened nothing.
      bridger_bolinder: 'bolinder_h68',
      casey_snider:     'snider_h5',
      cory_maloy:       'cory_maloy_h52',
      curt_bramble:     'cbramble',
      don_ipson:        'dipson',
      jerry_stevenson:  'jstevenson',
      jill_koford:      'koford_h10',
      luz_escamilla:    'lescamilla',
      matthew_gwynn:    'gwynn_h6',
      nate_blouin:      'blouin_s13',
      phil_lyman:       'lyman',
      // CANONICAL: chew_h68. It is the roster record for Utah House District 68
      // (termStart 2015-01) and it holds the 90-act formal file; `scott_chew` is
      // the slug of that record's own display name and has no roster record of
      // its own. A stray PROFILES document under `scott_chew` is the same
      // officeholder, not a second one, so it must never open as its own file —
      // see the ordering note on PDXProfilePid below. Vote rows are NOT merged:
      // no voting-record rows were ever filed under `scott_chew`, so
      // PDX_PID_ALIASES / db/vr-pid-aliases.json stay out of this.
      scott_chew:       'chew_h68',
      scott_sandall:    'ssandall',
      stephen_l_whyte:  'whyte_h63',
      // sadams keeps its own 7-card block, which _resolveStanceList prefers; this
      // bridge fixes the dead click and lands on the right person. The 3 cards
      // filed under stuart_adams stay shadowed — collapsing them is a content
      // decision, tracked separately.
      stuart_adams:     'sadams',
      tiara_auxier:     'auxier_h4',
      todd_weiler:      'tweiler',
      troy_shelley:     'shelley_h66',
    };

    // Resolve any id to one a profile can actually open, in a single step.
    // Single-hop-on-miss, deliberately: a candidate is accepted only if IT has a
    // record, so nothing chains through a dead id, and an unknown id passes
    // through untouched so callers can still show their own not-found state
    // instead of silently opening the wrong person.
    //
    // A BRIDGE OUTRANKS A STRAY DOCUMENT FILED UNDER THE RETIRED KEY. This used
    // to read "a real profile always beats an alias" and returned `id` the moment
    // `id` had any record at all. That is right for an id nobody has ruled on and
    // wrong for the keys in the table above, because every one of them is this
    // repo's standing assertion that the id on the LEFT is not a separate
    // officeholder. When a stray PROFILES document later appears under one of
    // those keys — /p/scott_chew arriving with its own photo, seven topics and a
    // 100% figure next to chew_h68's 90-act formal file — the old order handed the
    // reader that document and never consulted the bridge, so ONE person read as
    // TWO current files for Utah House District 68.
    //
    // So the table is asked first, and only for keys that are IN the table. The
    // hop still requires the target to have a record of its own, so a stale alias
    // value can never blank out a live profile, and `direct !== id` keeps a
    // self-referential entry from looping. scripts/test-identity-integrity.mjs §11
    // already holds both sides of the table — every value is a live cmp-data
    // record, and no key is one — so the only id this reordering can reach is one
    // that has a PROFILES document and no roster record of its own: a duplicate
    // filed under a retired key, which is the defect.
    // scripts/test-chew-identity.mjs pins the live case end to end.
    window.PDXProfilePid = function (id) {
      if (!id) return id;
      var hasRec = function (x) {
        return !!((window.PROFILES && window.PROFILES[x]) ||
                  (typeof CMP_DATA !== 'undefined' && CMP_DATA[x]));
      };
      var direct = window.PDX_PROFILE_ALIAS && window.PDX_PROFILE_ALIAS[id];
      if (direct && direct !== id && hasRec(direct)) return direct;
      if (hasRec(id)) return id;
      var curated = window.ACCT_ALIAS && window.ACCT_ALIAS[id];
      if (curated && hasRec(curated)) return curated;
      return id;
    };

    // ── ONE PERSON, ONE ROW — the list-shaped half of the same question ──────
    // PDXProfilePid answers the question an ARRIVAL asks: "which id should this
    // address open?" A LIST asks the inverse — given a bag of ids unioned out of
    // PROFILES and CMP_DATA, how many PEOPLE are in it? Every list surface built
    // that bag from raw keys, so each id in the table above counted as one more
    // officeholder. That is why "chew" returned two current Utah House District
    // 68 files: `chew_h68` with the 90-act formal record, and `scott_chew`, a
    // Firestore photo stub whose own address already redirects to the first one.
    //
    // The two helpers below are the only new machinery in that pass, and neither
    // makes a new claim about anybody: both read PDXProfilePid, so a list can
    // never disagree with the address bar about who is one person. NOTHING IS
    // MERGED. The retired document still exists, still holds whatever it holds,
    // and its address still opens the canonical file. It just stops being
    // counted, ranked and rendered as a second human.
    //
    // WHY BOTH FAIL OPEN. Each returns the "keep the row" answer when it cannot
    // place an id — an id nobody has ruled on, or a bridge whose target has no
    // record. For a list, showing a duplicate is a cosmetic defect; hiding a real
    // officeholder is a factual one, and only one of those is worth risking.
    // ─────────────────────────────────────────────────────────────────────────

    // "Is this id an address rather than a person?" One caller today: the
    // Firestore lazy-loader, which must not mint a roster entry for a retired key.
    window.PDXRetiredPid = function (id) {
      if (!id) return false;
      try { return window.PDXProfilePid(id) !== id; } catch (e) { return false; }
    };

    // A bag of ids in; one entry per person out, in first-seen order so no
    // caller's existing sort shifts. `groups` maps each surviving id to every id
    // that resolved into it, so a surface that must not lose the retired
    // document's searchable text (the All-Seeing Eye's haystack) can fold that
    // text into the one row it kept instead of dropping it on the floor.
    window.PDXCanonIds = function (ids) {
      var order = [], groups = Object.create(null);
      (ids || []).forEach(function (id) {
        if (!id) return;
        var c = id;
        try { c = window.PDXProfilePid(id) || id; } catch (e) { c = id; }
        if (!groups[c]) { groups[c] = []; order.push(c); }
        if (groups[c].indexOf(id) === -1) groups[c].push(id);
      });
      return { ids: order, groups: groups };
    };

    // Resolve the overall theme for an official: a document-authored
    // `spotlightTheme` wins; otherwise the curated ACCT_THEME default. Returns
    // '' when there is nothing to show so callers can omit the banner cleanly.
    window._slTheme = function(p, id){
      p = p || {};
      var t = (p && typeof p.spotlightTheme === 'string') ? p.spotlightTheme.trim() : '';
      if (!t && id != null && window.ACCT_THEME){
        var _tk = (window.ACCT_ALIAS && window.ACCT_ALIAS[id] && typeof window.ACCT_THEME[id] !== 'string') ? window.ACCT_ALIAS[id] : id;
        if (typeof window.ACCT_THEME[_tk] === 'string') t = window.ACCT_THEME[_tk].trim();
      }
      return t || '';
    };

    // A compact themed banner shown above the Spotlight drivers — frames the
    // section with a one-line synthesis and reiterates the separation from
    // Promise %. Returns '' when no theme is available.
    window._slThemeBanner = function(p, id){
      var t = (typeof window._slTheme === 'function') ? window._slTheme(p, id) : '';
      if (!t) return '';
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      return '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(139,92,246,0.04));border:1px solid rgba(139,92,246,0.32);border-radius:0.7rem;padding:0.6rem 0.75rem;margin:0 0 0.85rem;">' +
          '<span style="font-size:0.85rem;line-height:1.1;flex-shrink:0;">🛡️</span>' +
          '<div style="min-width:0;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.1rem;">Accountability Theme · Integrity &amp; Consistency</div>' +
            '<div style="font-size:0.72rem;color:#cdd9ec;line-height:1.5;">' + esc(t) + '</div>' +
          '</div>' +
        '</div>';
    };

    // ── Spotlight evidence row ────────────────────────────────────────────────
    // Turns a Spotlight item's attached proof into clear, tappable links:
    // official floor/committee VIDEO opens with its timestamp ("▶ Watch · 24:42"),
    // an X post opens as "𝕏 View post", audio/document get their own glyphs, and
    // the written CITATION shows as a "🔗 Source" chip whenever it points somewhere
    // different from the media. The link URL is media.url when present, otherwise
    // the item's source.url — the floor-video records keep the watchable link on
    // `source` and only the medium + timestamp on `media`, so this recovers the
    // video link either way. Returns '' when there's nothing to open, so callers
    // can drop it in unconditionally. Shared by the medium-modal (_slCard) and the
    // full-analysis (_slRenderFullCard) Spotlight surfaces so video/post evidence
    // reads the same everywhere. `opts.stop` adds stopPropagation for cards that
    // are themselves tappable.
    // Name the kind of official video an item links to — "floor" or "committee" —
    // from its media kind/label, so a watch link reads as the authoritative source
    // it is ("Watch floor video · 24:42") rather than a generic link. Returns a
    // trailing-spaced word ('floor ' / 'committee ') or '' when it can't be told.
    window._slVideoKindWord = function(m){
      if (!m) return '';
      var k = String(m.kind || '').toLowerCase();
      if (k === 'committee') return 'committee ';
      if (k === 'floor') return 'floor ';
      var l = String(m.label || '').toLowerCase();
      if (/committee/.test(l)) return 'committee ';
      if (/floor/.test(l)) return 'floor ';
      return '';
    };

    window._slEvidenceRow = function(o, opts){
      o = o || {}; opts = opts || {};
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      var stop = opts.stop ? 'event.stopPropagation();' : '';
      var m = o.media || null;
      var st = String(o.sourceType || '');
      var srcUrl = (o.source && o.source.url) ? o.source.url : '';
      var mediaUrl = (m && m.url) ? m.url : '';
      var primaryUrl = mediaUrl || srcUrl;
      var type = (m && m.type) ? m.type
               : (/x_post|tweet/.test(st) ? 'x_post'
               : /facebook|fb_post/.test(st) ? 'facebook'
               : /video/.test(st) ? 'video'
               : /audio/.test(st) ? 'audio' : '');
      var MEDIA = {
        video:  { g: '▶',  col: '245,200,66'  },
        x_post: { g: '𝕏', col: '139,160,190' },
        facebook: { g: '📘', col: '146,166,232' },
        audio:  { g: '🎧', col: '167,139,250' },
        text:   { g: '📄', col: '120,180,140' }
      };
      var links = [];
      if (type && MEDIA[type] && primaryUrl) {
        var md = MEDIA[type];
        var ts = (m && m.timestamp) ? esc(m.timestamp) : '';
        var vk = (type === 'video' && typeof window._slVideoKindWord === 'function') ? window._slVideoKindWord(m) : '';
        var txt = type === 'video'  ? ('Watch ' + vk + 'video' + (ts ? ' · ' + ts : ''))
                : type === 'x_post' ? 'View post'
                : type === 'facebook' ? 'View Facebook post'
                : type === 'audio'  ? ('Listen' + (ts ? ' · ' + ts : ''))
                : 'Read';
        var ttl = (m && m.label) ? ' title="' + esc(m.label) + '"' : '';
        links.push('<a href="' + esc(primaryUrl) + '" target="_blank" rel="noopener" onclick="' + stop + '"' + ttl +
          ' style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:rgb(' + md.col + ');background:rgba(' + md.col + ',0.12);border:1px solid rgba(' + md.col + ',0.4);padding:0.14rem 0.5rem;border-radius:999px;">' + md.g + ' ' + txt + ' ↗</a>');
        // All-Seeing Eye cue — lead the row with the eye when the proof is video,
        // so the recognizable "video evidence" marker reads before the link text.
        if (type === 'video' && typeof window._pdxVideoEye === 'function') {
          var _eye = window._pdxVideoEye({ url: primaryUrl, timestamp: (m && m.timestamp) || '', kind: String(vk || '').trim() }, { stop: !!opts.stop });
          if (_eye) links.unshift(_eye);
        }
      }
      // Citation — show when it's a distinct destination (or the only link).
      if (srcUrl && (!links.length || srcUrl !== primaryUrl)) {
        links.push('<a href="' + esc(srcUrl) + '" target="_blank" rel="noopener" onclick="' + stop + '"' +
          ' style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);padding:0.14rem 0.5rem;border-radius:999px;">🔗 Source: ' + esc((o.source && o.source.label) || 'Link') + ' ↗</a>');
      }
      if (!links.length) return '';
      return '<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.35rem;">' + links.join('') + '</div>';
    };

    // The single ordered driver list shared by both sections. Merges, in priority
    // order: (1) editor/Firestore-authored `spotlight` drivers on the document,
    // then (2) the curated repo-side integrity layer (ACCT_SPOTLIGHT[id]), then
    // (3) the kept/broken promise ledger. Deduped by headline and capped at five
    // so the medium modal and Accountability card stay summarized, never a dump.
    window._slComputeDrivers = function(p, id){
      p = p || {};
      var out = [];
      var seen = {};
      function key(h){ return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
      function pushDriver(it){
        if (!it || (it.impact !== 'positive' && it.impact !== 'negative')) return;
        if (out.length >= 5) return;
        var hl = it.headline || it.title || 'Tracked issue';
        var k = key(hl);
        if (k && seen[k]) return;
        if (k) seen[k] = 1;
        out.push({
          kind: 'spotlight', impact: it.impact,
          headline: hl,
          date: it.date || '', category: it.category || '',
          // Light, human-readable categorization (1–2 simple tags such as
          // "Consistency", "Public Statements", "Rhetoric vs Reality") that sits
          // alongside the structured `category` so items are easy to filter,
          // summarize and skim in the medium modal and full profile.
          tags: Array.isArray(it.tags) ? it.tags.slice(0, 2) : [],
          body: it.facts || it.detail || '', why: it.why || '',
          source: it.source || null,
          // Carry the attached proof so a driver card can open the official
          // floor/committee video (with its timestamp) or X post directly —
          // the medium + timestamp live on `media`, the link on `media.url`
          // or, for floor-video items, on `source.url`.
          media: it.media || null, sourceType: it.sourceType || '', issueKey: it.issueKey || '',
          badge: it.badge || (it.impact === 'positive' ? '🛡️ Helps the Score' : '🛡️ Hurts the Score')
        });
      }
      // (1) Document-authored drivers take precedence.
      (Array.isArray(p.spotlight) ? p.spotlight : []).forEach(pushDriver);
      // (2) Curated repo-side integrity highlights fill in the rest. When a person
      // exists under two ids (a browse pid and a CMP_DATA pid), resolve the alias
      // so the same drivers light up on whichever surface the id came from.
      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;
      var curatedSl = (_slKey && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[_slKey])) ? window.ACCT_SPOTLIGHT[_slKey] : [];
      curatedSl.forEach(pushDriver);
      // (3) The formal promise ledger rounds out the picture (kept/broken).
      var proms = Array.isArray(p.promises) ? p.promises : [];
      proms.filter(function(r){ return r && r.verdict === 'broken'; }).slice(0, 2).forEach(function(r){
        out.push({ kind:'broken', impact:'negative', headline:r.title, date:r.date || '', category:'promise', body:r.detail || '', source:r.source || null, badge:'⚠ Promise Broken' });
      });
      proms.filter(function(r){ return r && r.verdict === 'kept'; }).slice(0, 2).forEach(function(r){
        out.push({ kind:'kept', impact:'positive', headline:r.title, date:r.date || '', category:'promise', body:r.detail || '', source:r.source || null, badge:'✅ Promise Kept' });
      });
      return out;
    };

    // ── "Pattern at a glance" summary bar ─────────────────────────────────────
    // A factual, skimmable read of the integrity record so a voter grasps the
    // OVERALL pattern without reading every highlight: how many flagged items
    // strengthen the record vs. weigh against it, and which categories they
    // fall under. It counts tags; it does not add up to a grade. It restates only the tags already on the record — it never
    // invents a judgement. `variant` 'med' renders a tight row for the medium
    // modal; 'full' adds the per-category chips. Returns '' when there's nothing
    // meaningful to summarize. Shared by all three Spotlight surfaces so they read
    // as one system.
    window._slPatternBar = function(items, variant){
      items = Array.isArray(items) ? items : [];
      if (!items.length) return '';
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      var pos = 0, neg = 0, neu = 0, catCount = {}, catOrder = [];
      items.forEach(function(it){
        if (it.impact === 'positive') pos++;
        else if (it.impact === 'negative') neg++;
        else neu++;
        var c = it.category || '';
        if (c){ if (catCount[c] == null){ catCount[c] = 0; catOrder.push(c); } catCount[c]++; }
      });
      // Plain-language read that only restates the balance of tagged items.
      var lead;
      if (pos && neg) lead = 'Mixed record — both strengths and concerns are flagged.';
      else if (pos && !neg) lead = 'Flagged items so far all strengthen the score.';
      else if (neg && !pos) lead = 'Flagged items so far all weigh on the score.';
      else lead = 'Tracked for context — nothing flagged as a score driver yet.';

      var tally = '';
      if (pos) tally += '<span class="sl-tally sl-tally-pos">▲ ' + pos + ' strengthen</span>';
      if (neg) tally += '<span class="sl-tally sl-tally-neg">▼ ' + neg + ' weigh on</span>';
      if (neu) tally += '<span class="sl-tally sl-tally-neu">● ' + neu + ' context</span>';

      var catChips = '';
      if (variant === 'full' && catOrder.length){
        catChips = '<div class="sl-pattern-cats">' + catOrder.slice(0, 6).map(function(c){
          var lbl = (typeof window._slCatLabel === 'function' && window._slCatLabel(c)) || (c.charAt(0).toUpperCase() + c.slice(1));
          return '<span class="sl-cat-chip">' + esc(lbl) + ' · ' + catCount[c] + '</span>';
        }).join('') + '</div>';
      }
      return '<div class="sl-pattern-bar">' +
          '<div class="sl-pattern-lead">' + lead + '</div>' +
          '<div class="sl-pattern-tally">' + tally + '</div>' +
          catChips +
        '</div>';
    };

    // ── Full-profile Spotlight rendering ──────────────────────────────────────
    // The medium modal surfaces only the top 2–4 score DRIVERS; the full
    // Accountability analysis shows the COMPLETE integrity record. _slAllHighlights
    // returns the merged, deduped, UNCAPPED list — document `spotlight` first, then
    // the curated repo-side layer (resolving the browse↔CMP_DATA alias) — including
    // neutral context items, every entry normalized to a single shape.
    window._slAllHighlights = function(p, id){
      p = p || {};
      var out = [], seen = {};
      function key(h){ return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
      function norm(it){
        if (!it) return null;
        var hl = it.headline || it.title || '';
        if (!hl) return null;
        var k = key(hl);
        if (k && seen[k]) return null;
        if (k) seen[k] = 1;
        var impact = (it.impact === 'positive' || it.impact === 'negative') ? it.impact : 'neutral';
        return { impact: impact, category: it.category || '', date: it.date || '',
          headline: hl, body: it.facts || it.detail || '', why: it.why || '',
          source: (it.source && it.source.url) ? it.source : null,
          media: it.media || null, sourceType: it.sourceType || '',
          tags: Array.isArray(it.tags) ? it.tags.slice(0, 3) : [] };
      }
      (Array.isArray(p.spotlight) ? p.spotlight : []).forEach(function(it){ var n = norm(it); if (n) out.push(n); });
      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;
      var curated = (_slKey && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[_slKey])) ? window.ACCT_SPOTLIGHT[_slKey] : [];
      curated.forEach(function(it){ var n = norm(it); if (n) out.push(n); });
      return out;
    };

    // One highlight card for the full Accountability view. Carries data-slcat /
    // data-slimpact so the category/impact filter chips can show & hide it. Shares
    // the dark, gold-accented house style and the ▲/▼ score-impact language of the
    // medium modal so the two surfaces read as one system. Body/why preserve any
    // inline source links (trusted curated/editor text); headline & tags escaped.
    window._slRenderFullCard = function(o){
      var esc = window._slEsc;
      var pos = o.impact === 'positive', neg = o.impact === 'negative';
      var edge = pos ? '74,222,128' : neg ? '248,113,113' : '120,140,170';
      var pill = pos ? '▲ Strengthens score' : neg ? '▼ Weighs on score' : '● Context · no score impact';
      var pillCol = pos ? '74,222,128' : neg ? '248,113,113' : '159,180,212';
      var catLabel = (o.category && typeof window._slCatLabel === 'function') ? window._slCatLabel(o.category) : '';
      var tagChips = (o.tags && o.tags.length) ? o.tags.map(function(t){
        return '<span style="color:#9fc6e8;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.32);padding:0.04rem 0.4rem;border-radius:999px;">' + esc(t) + '</span>';
      }).join('') : '';
      var srcRow = (typeof window._slEvidenceRow === 'function')
        ? window._slEvidenceRow(o, {})
        : ((o.source && o.source.url) ?
        '<div style="margin-top:0.5rem;"><a href="' + esc(o.source.url) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);padding:0.14rem 0.5rem;border-radius:999px;">🔗 Source: ' + esc(o.source.label || 'Link') + ' ↗</a></div>' : '');
      var metaRow = (catLabel || tagChips) ?
        '<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">' +
          (catLabel ? '<span style="color:#c4b5fd;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.4);padding:0.05rem 0.4rem;border-radius:999px;">' + esc(catLabel) + '</span>' : '') +
          tagChips +
        '</div>' : '';
      return '<div class="sl-full-card" data-slcat="' + esc(o.category || 'other') + '" data-slimpact="' + o.impact + '" style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-left:3px solid rgba(' + edge + ',0.7);border-radius:0.75rem;padding:0.8rem 0.9rem;margin-bottom:0.6rem;">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;">' +
          (o.date ? '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;font-weight:600;letter-spacing:0.04em;color:#9a8a55;">' + esc(o.date) + '</span>' : '') +
          '<span style="margin-left:auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:rgb(' + pillCol + ');background:rgba(' + pillCol + ',0.12);border:1px solid rgba(' + pillCol + ',0.4);padding:0.1rem 0.4rem;border-radius:999px;">' + pill + '</span>' +
        '</div>' +
        '<h4 style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.95rem;line-height:1.25;color:white;margin:0 0 ' + (o.body ? '0.35rem' : '0') + ';">' + esc(o.headline) + '</h4>' +
        (o.body ? '<p style="font-size:0.72rem;color:#c7d4e8;line-height:1.55;margin:0 0 ' + (o.why ? '0.45rem' : '0') + ';">' + o.body + '</p>' : '') +
        (o.why ? '<div style="display:flex;gap:0.4rem;font-size:0.7rem;line-height:1.5;color:#e3c97a;background:rgba(245,200,66,0.06);border-radius:0.5rem;padding:0.45rem 0.55rem;"><span style="flex-shrink:0;">⚡</span><span><strong style="color:#f5c842;">Why it matters:</strong> ' + o.why + '</span></div>' : '') +
        srcRow + metaRow +
      '</div>';
    };

    // Client-side category/impact filter for the full Spotlight list. Toggles each
    // card by its data-slcat / data-slimpact attribute and moves the active chip.
    window._slFilterFull = function(safeId, val){
      var wrap = document.getElementById('sl-full-' + safeId);
      if (!wrap) return;
      var cards = wrap.querySelectorAll('.sl-full-card');
      cards.forEach(function(c){
        var match = (val === 'all') ||
          (val === 'strength' && c.getAttribute('data-slimpact') === 'positive') ||
          (val === 'concern' && c.getAttribute('data-slimpact') === 'negative') ||
          (c.getAttribute('data-slcat') === val);
        c.style.display = match ? '' : 'none';
      });
      var chips = wrap.querySelectorAll('[data-slchip]');
      chips.forEach(function(ch){
        if (ch.getAttribute('data-slchip') === val) ch.classList.add('sl-chip-on');
        else ch.classList.remove('sl-chip-on');
      });
    };

    // The full integrity record for the Accountability analysis overlay: a clear
    // "what this measures vs Promise %" header, the one-line Accountability Theme,
    // optional category/impact filter chips when the list is long, the complete set
    // of highlights, and an honest empty state when the record is still thin.
    window._slFullSection = function(p, id){
      p = p || {};
      var safeId = (typeof window._slSafeId === 'function') ? window._slSafeId(id) : String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      var esc = window._slEsc;
      var items = (typeof window._slAllHighlights === 'function') ? window._slAllHighlights(p, id) : [];
      var themeHtml = (typeof window._slThemeBanner === 'function') ? window._slThemeBanner(p, id) : '';
      var last = (p && p.name) ? esc(String(p.name).trim().split(/\s+/).pop()) : 'this official';

      var header = '<div style="margin-bottom:0.85rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;display:flex;align-items:center;gap:0.4rem;">🔦 In the Spotlight — Integrity &amp; Consistency</div>' +
        '<p style="font-size:0.74rem;color:#9fb4d4;line-height:1.55;margin:0.35rem 0 0;">' + last + '’s personal-integrity record, item by item — public statements, conduct and notable actions that show whether the words match the actions over time. It is a list of sourced items, not a grade. This is the <strong style="color:#c4b5fd;">character &amp; consistency</strong> read, <strong style="color:#cdd9ec;">separate from &#9878;&#65039; Word vs Action</strong> (which tests stated positions and pledges against the formal voting record).</p>' +
      '</div>';

      if (!items.length){
        return '<div style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.02));border:1px solid rgba(139,92,246,0.3);border-radius:0.95rem;padding:1.1rem;">' +
          header + themeHtml +
          '<div style="background:rgba(10,15,30,0.5);border:1px dashed rgba(139,92,246,0.35);border-radius:0.8rem;padding:1.25rem 1rem;text-align:center;">' +
            '<div style="font-size:1.5rem;opacity:0.5;margin-bottom:0.3rem;">🔦</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.82rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fb4d4;">Limited public-behavior data available</div>' +
            '<p style="font-size:0.72rem;color:#7596c0;line-height:1.55;margin:0.4rem 0 0;">Spotlight highlights for ' + last + ' are coming soon. As verifiable public statements, votes and conduct accumulate, the integrity highlights that drive this score will appear here.</p>' +
          '</div>' +
        '</div>';
      }

      var nPos = items.filter(function(i){ return i.impact === 'positive'; }).length;
      var nNeg = items.filter(function(i){ return i.impact === 'negative'; }).length;
      var cats = [], catSeen = {};
      items.forEach(function(i){ var c = i.category || ''; if (c && !catSeen[c]){ catSeen[c] = 1; cats.push(c); } });

      var chips = '';
      if (items.length > 4 && (cats.length > 1 || (nPos && nNeg))){
        var chipArr = ['<button type="button" data-slchip="all" class="sl-chip sl-chip-on" onclick="window._slFilterFull(\'' + safeId + '\',\'all\')">All ' + items.length + '</button>'];
        if (nPos) chipArr.push('<button type="button" data-slchip="strength" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'strength\')">▲ Strengths ' + nPos + '</button>');
        if (nNeg) chipArr.push('<button type="button" data-slchip="concern" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'concern\')">▼ Concerns ' + nNeg + '</button>');
        cats.forEach(function(c){
          var lbl = (typeof window._slCatLabel === 'function' && window._slCatLabel(c)) || (c.charAt(0).toUpperCase() + c.slice(1));
          chipArr.push('<button type="button" data-slchip="' + esc(c) + '" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'' + esc(c) + '\')">' + esc(lbl) + '</button>');
        });
        chips = '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.75rem;">' + chipArr.join('') + '</div>';
      }

      var cards = items.map(function(o){ return window._slRenderFullCard(o); }).join('');
      var patternHtml = (typeof window._slPatternBar === 'function') ? window._slPatternBar(items, 'full') : '';

      return '<div id="sl-full-' + safeId + '" class="sl-full-wrap" style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.02));border:1px solid rgba(139,92,246,0.3);border-radius:0.95rem;padding:1.1rem;">' +
        header + themeHtml + patternHtml + chips + cards +
        '<p style="font-size:0.62rem;color:#4e72a0;line-height:1.5;margin:0.4rem 0 0;text-align:center;">Items marked ▲/▼ feed the Accountability of Truth Score above. Sources linked on each card.</p>' +
      '</div>';
    };

    window._slFlash = function(el){
      if (!el) return;
      el.classList.remove('sl-flash');
      void el.offsetWidth; // restart the animation
      el.classList.add('sl-flash');
      setTimeout(function(){ if (el) el.classList.remove('sl-flash'); }, 1600);
    };

    // Accountability → Spotlight: jump to (and pulse) the matching Spotlight card.
    window._slFocusSpotlight = function(safeId, i){
      var el = document.getElementById('sl-driver-' + safeId + '-' + i);
      if (!el){
        var sec = document.getElementById('spotlight-modal-section');
        if (sec) sec.scrollIntoView({ behavior:'smooth', block:'start' });
        return;
      }
      // Spotlight write-ups now live behind a closed disclosure (the visible
      // layer is a compact digest), so a jump has to open whatever drawer the
      // target sits in before scrolling — otherwise the scroll lands on a
      // collapsed box. _pdxNavJump already walks and opens that chain; use it
      // when it is available and fall back to the direct scroll when it is not.
      if (typeof window._pdxNavJump === 'function' && document.getElementById('modal-body')) {
        try { window._pdxNavJump('sl-driver-' + safeId + '-' + i, null); window._slFlash(el); return; } catch (e) {}
      }
      el.scrollIntoView({ behavior:'smooth', block:'center' });
      window._slFlash(el);
    };

    // Spotlight → Accountability: jump to the card and pulse the matching row.
  })();
