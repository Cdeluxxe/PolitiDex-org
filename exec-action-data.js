/* ═══════════════════════════════════════════════════════════════════════════
   PolitiDex — ✒️ EXECUTIVE ENACTMENT RECORD · action data (window.EXEC_ACTIONS)
   ═══════════════════════════════════════════════════════════════════════════
   GENERATED FILE — do not edit by hand.
     source:    db/exec-action-seed.json
     generator: scripts/gen-exec-action-data.mjs
     gate:      scripts/test-exec-data.mjs (fails if this file drifts from the seed)

   Edit the seed and re-run the generator. A hand edit here would be silently
   reverted by the next generation, and worse, would let the browser publish a
   standing or a citation the curated seed does not carry.

   WHAT THIS IS
   The formal actions on file for each executive figure — signed legislation,
   vetoes, executive orders and formal directives — in exactly the shape
   exec-record.js's actionsFor() / standingOf() already read: per-issue mappings
   with a direction, and an append-only standing log where every entry carries its
   own citation. Curation commentary ("_"-prefixed keys in the seed) is stripped;
   the rationales and standing notes the UI renders are kept in full.

   WHY IT IS ITS OWN FILE
   It is loaded only where an executive profile can be rendered, so the read path
   (exec-record.js) and the vocabulary stay useful in contexts that never need the
   payload. exec-record.js reads window.EXEC_ACTIONS lazily and returns an honest
   empty record when it is absent, so a page that omits this file shows nothing
   rather than guessing — which is also what happens offline before it loads.

   NO SCORE LIVES HERE. There is no ratio, no total and no field that could become
   one; see exec-record.js's header for why a percentage over these rows would
   divide by a number we invented.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  // Idempotent, and never clobbers a payload another surface already installed.
  if (window.EXEC_ACTIONS) return;
  window.EXEC_ACTIONS = {
    "trump": [
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-1",
        "measureNumber": "S. 5",
        "congress": 119,
        "chamber": "senate",
        "title": "Laken Riley Act",
        "actedAt": "2025-01-29",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/5",
        "sourceLabel": "Congress.gov — S. 5, 119th Congress",
        "issues": [
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Mandates detention and removal proceedings for covered unauthorized immigrants.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue names this law as its own evidence — it reads \"signing his first law — the Laken Riley Act (Public Law 119-1)\" and cites the bill page as its source. A card written from this document cannot also be the word this document tests."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Tightens immigration enforcement."
          },
          {
            "issueKey": "tough_on_crime",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Triggered by arrest for burglary, theft, larceny, shoplifting, assault of a law enforcement officer, or any crime resulting in death or serious bodily injury."
          },
          {
            "issueKey": "states_federal_power",
            "direction": "advances",
            "isPrimary": false,
            "weight": 40,
            "rationale": "Gives state attorneys general standing to sue the federal government over certain immigration-detention and enforcement decisions."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-29",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-1, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ1/pdf/PLAW-119publ1.pdf",
            "note": "Enacted and published as Public Law 119-1, approved January 29, 2025. Nothing on file repeals or amends it. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-21",
        "measureNumber": "H.R. 1",
        "congress": 119,
        "chamber": "house",
        "title": "To provide for reconciliation pursuant to title II of H. Con. Res. 14",
        "actedAt": "2025-07-04",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/house-bill/1",
        "sourceLabel": "Congress.gov — H.R. 1, 119th Congress",
        "issues": [
          {
            "issueKey": "lower_taxes",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Extends and makes permanent the 2017 individual income-tax rates."
          },
          {
            "issueKey": "tax_middle_class",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Makes the 2017 individual income-tax rates permanent and adds temporary deductions for tips and overtime pay."
          },
          {
            "issueKey": "cut_spending",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Reduces federal spending across several mandatory programs."
          },
          {
            "issueKey": "national_debt",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "rationale": "Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal deficits over ten years.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue is titled \"H.R.1: Deficit & Debt\" and exists to report this law's projected deficit effect. The card is downstream of this document, so this document cannot test it."
          },
          {
            "issueKey": "healthcare",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Offsets part of its cost with Medicaid and SNAP reductions the CBO estimates leave millions more people uninsured.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue is titled \"H.R.1: Medicaid & SNAP\" and exists to report this law's projected coverage effect. The card is downstream of this document, so this document cannot test it."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Funds border-barrier construction and border enforcement personnel."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Phases out and repeals clean-energy and electric-vehicle tax credits enacted in 2022."
          },
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": false,
            "weight": 50,
            "rationale": "Appropriates tens of billions of dollars for immigration detention and removal operations."
          },
          {
            "issueKey": "family_support",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "rationale": "Raises the child tax credit to $2,200 per child and makes it permanent."
          },
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "rationale": "Expands onshore and offshore oil, gas, and coal leasing and speeds fossil-fuel permitting."
          },
          {
            "issueKey": "strong_defense",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "rationale": "Adds a large increase in defense and military spending."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 40,
            "rationale": "Opens additional federal lands and waters to energy leasing."
          },
          {
            "issueKey": "edu_college_cost",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 40,
            "rationale": "Restricts graduate and parent student-loan borrowing and repayment options."
          },
          {
            "issueKey": "school_choice",
            "direction": "advances",
            "isPrimary": false,
            "weight": 35,
            "rationale": "Creates a federal tax credit for donations to K-12 private-school scholarship organizations."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-04",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-21, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf",
            "note": "Enacted and published as Public Law 119-21, approved July 4, 2025. Nothing on file repeals it. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14154",
        "executiveOrderNumber": 14154,
        "title": "Unleashing American Energy",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy",
        "sourceLabel": "Federal Register — Executive Order 14154, 90 FR 8353",
        "frCitation": "90 FR 8353",
        "frDocumentNumber": "2025-01956",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs agencies to expedite oil, gas and mineral permitting and leasing and to remove regulatory barriers to domestic energy production.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order by title — \"Signed the 'Unleashing American Energy' and 'National Energy Emergency' executive orders\". The issue is tested instead by Public Law 119-21, which that card does not name."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Revokes the previous administration's climate executive orders. The Federal Register disposition record for this document lists the revocations by number, including EO 13990 and EO 14008."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14154 document record, 90 FR 8353",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01956/unleashing-american-energy",
            "note": "Published at 90 FR 8353 and not revoked or superseded by any later presidential action in the Federal Register's disposition record for this document. That is the whole of the claim: it describes the order's status in the register, NOT the outcome of any challenge to it. This pass found no ruling enjoining EO 14154 itself; the litigation it appears in concerns agency implementation of funding provisions, and the appellate ruling there (4th Cir. No. 25-1575, decided 2026-01-21) vacated the district court's injunctions rather than extending them."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14156",
        "executiveOrderNumber": 14156,
        "title": "Declaring a National Energy Emergency",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency",
        "sourceLabel": "Federal Register — Executive Order 14156, 90 FR 8433",
        "frCitation": "90 FR 8433",
        "frDocumentNumber": "2025-02003",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Declares a national energy emergency and directs agencies to use emergency authorities to expedite domestic energy production, transportation, refining and generation.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order by title and opens by narrating it — \"Declared a national energy emergency at the start of his second term\". The issue is tested instead by Public Law 119-21, which that card does not name."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Sections 4 and 5 direct emergency Clean Water Act and Rivers and Harbors Act permitting by the Army Corps of Engineers and emergency Endangered Species Act consultation procedures for energy projects on federal land and water."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Section 8(a) defines the 'energy' the emergency covers as crude oil, natural gas, lease condensates, natural gas liquids, refined petroleum products, uranium, coal, biofuels, geothermal heat, the kinetic movement of flowing water and critical minerals — wind and solar are absent from the definition, so the emergency's expedited procedures are unavailable to them."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14156 document record, 90 FR 8433",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-02003/declaring-a-national-energy-emergency",
            "note": "Published at 90 FR 8433 and carrying no revocation in the Federal Register's disposition record for this document. That is the whole of the claim: it describes the order's status in the register, NOT the outcome of any challenge to it. The later rows in this log are what report the challenge."
          },
          {
            "status": "in_force",
            "effectiveAt": "2026-01-12",
            "authority": "President of the United States",
            "basis": "register_continuation",
            "sourceLabel": "Federal Register — Continuation of the National Emergency With Respect to Energy, 91 FR 1667 (doc 2026-00732), signed Jan. 12, 2026",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/01/14/2026-00732/continuation-of-the-national-emergency-with-respect-to-energy",
            "note": "A National Emergencies Act declaration expires after one year unless it is continued, so this row exists to answer a question the first row cannot: the order did not lapse on January 20, 2026. The notice states 'I am continuing for 1 year the national emergency declared in Executive Order 14156', under 50 U.S.C. 1622(d). CITATION CORRECTION: the Federal Register's own disposition note for EO 14156 cites this as 'Notice of January 12, 2026 (91 FR 1661)', but 91 FR 1661 is a different document (doc 2026-00698, a Foreign Assistance Act delegation). The continuation is doc 2026-00732 at 91 FR 1667, which is what this row cites and what was read. A continuation says nothing about any challenge to the order."
          },
          {
            "status": "challenged_unverified",
            "effectiveAt": "2026-01-30",
            "authority": "Challenge pending — U.S. District Court for the Western District of Washington (State of Washington v. Trump, No. 2:25-cv-00869-JNW)",
            "basis": "pending_litigation",
            "sourceLabel": "W.D. Wash. — State of Washington v. Trump, No. 2:25-cv-00869-JNW, First Amended and Supplemental Complaint (ECF 55, filed Jan. 30, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.wawd.348016/gov.uscourts.wawd.348016.55.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/70238539/state-of-washington-v-trump/",
            "note": "THE CURRENT STANDING, and it is a statement about this file rather than about the order. Seventeen States are suing over this order; its paragraph 1 reads 'This case concerns an Executive Order issued on January 20, 2025, EO 14156, 90 Fed. Reg. 8433 (January 29, 2025)', and the prayer for relief asks the court to declare EO 14156 unlawful and to enjoin the agencies implementing it. The docket was filed May 9, 2025 and is not terminated; as read in this pass it carries no preliminary-injunction ruling and no ruling on the pending motion to dismiss. So no court has stopped this order and no court has upheld it — 'in force' would assert the second of those, which is why this row does not say it. Dated to the operative amended complaint, the document actually read, rather than to the docket's filing date."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14151",
        "executiveOrderNumber": 14151,
        "title": "Ending Radical and Wasteful Government DEI Programs and Preferencing",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01953/ending-radical-and-wasteful-government-dei-programs-and-preferencing",
        "sourceLabel": "Federal Register — Executive Order 14151, 90 FR 8339",
        "frCitation": "90 FR 8339",
        "frDocumentNumber": "2025-01953",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "end_dei",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the termination of federal diversity, equity and inclusion offices, positions, programs and related grants and contracts.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order's own subject — \"Signed executive orders ending federal DEI programs and preferencing\" — and links the order itself. No other action on file reaches this issue, so it stands as coverage rather than as a test."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-02-06",
            "authority": "U.S. Court of Appeals for the Fourth Circuit",
            "basis": "court_ruling",
            "sourceLabel": "Fourth Circuit — National Association of Diversity Officers in Higher Education v. Trump, No. 25-1189 (published opinion, Feb. 6, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/pdf/2026/02/06/natl._assoc._of_diversity_officers_in_higher_edu._v._donald_trump.pdf",
            "caseUrl": "https://www.courtlistener.com/opinion/10785644/natl-assoc-of-diversity-officers-in-higher-edu-v-donald-trump/",
            "note": "The facial challenge to this order reached judgment: the Fourth Circuit VACATED the district court's preliminary injunction and remanded for further proceedings, so no injunction against the order is in effect. Read from the court's own published opinion, which closes 'we vacate the district court's order granting plaintiffs' motion for a preliminary injunction, and remand for further proceedings. VACATED AND REMANDED'. The case continues on remand; a later ruling would arrive as a further row in this log rather than a change to this one."
          },
          {
            "status": "partly_blocked",
            "effectiveAt": "2025-02-21",
            "authority": "U.S. District Court for the District of Maryland (Judge Adam B. Abelson)",
            "basis": "court_ruling",
            "sourceLabel": "D. Md. — National Association of Diversity Officers in Higher Education v. Trump, No. 1:25-cv-00333-ABA, Preliminary Injunction of Feb. 21, 2025 (ECF 45)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.45.0_5.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "BACKFILL — the first standing this order held, appended behind the current one. 'The Motion is GRANTED IN PART and DENIED IN PART': the court preliminarily enjoined this order's Section 2(b)(i), the Termination Provision, in part — together with two provisions of a different order, EO 14173, which are not this row's subject. Partly blocked and not blocked: one provision of this order was enjoined and the rest was not, and the Enjoined Parties are 'Defendants other than the President' and those acting in concert with them, not the President himself. Read from the injunction order itself, not from the accompanying memorandum opinion (ECF 44)."
          },
          {
            "status": "in_force",
            "effectiveAt": "2025-03-14",
            "authority": "U.S. Court of Appeals for the Fourth Circuit",
            "basis": "court_ruling",
            "sourceLabel": "Fourth Circuit — National Association of Diversity Officers in Higher Education v. Trump, No. 25-1189, Order of Mar. 14, 2025 granting a stay pending appeal (D. Md. ECF 73)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.73.0_2.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "BACKFILL — 'we grant the government's motion for a stay of the preliminary injunction', entered at the direction of Chief Judge Diaz with the concurrence of Judges Harris and Rushing, applying the Nken v. Holder factors. The injunction stopped operating, so the order was operative again — which is why this row reads in force. A STAY IS NOT A MERITS RULING: the same order set an expedited briefing schedule and the appeal remained pending until the February 6, 2026 decision above, which is the row that resolved it. This row is what 'in force' is licensed to mean here and no more."
          },
          {
            "status": "in_force",
            "effectiveAt": "2026-06-30",
            "authority": "U.S. District Court for the District of Maryland (Judge Adam B. Abelson)",
            "basis": "court_ruling",
            "sourceLabel": "D. Md. — National Association of Diversity Officers in Higher Education v. Trump, No. 1:25-cv-00333-ABA, Order of June 30, 2026 dismissing the case (ECF 107)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.107.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "THE CURRENT STANDING, found while verifying the docket for the backfill above and appended rather than folded into the earlier row. On remand the plaintiffs filed a notice of voluntary dismissal without prejudice and the court accepted it: 'it is hereby ORDERED that the notice is ACCEPTED. The Clerk is directed to CLOSE this case.' The case is closed and no injunction against this order is in effect. WITHOUT PREJUDICE and by the plaintiffs' own choice — no court held this order lawful, and this row does not say one did. It supersedes the February 6, 2026 row's closing sentence ('the case continues on remand'), which was true when written; the earlier row stays as filed because the log is append-only."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14248",
        "executiveOrderNumber": 14248,
        "title": "Preserving and Protecting the Integrity of American Elections",
        "actedAt": "2025-03-25",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/03/28/2025-05523/preserving-and-protecting-the-integrity-of-american-elections",
        "sourceLabel": "Federal Register — Executive Order 14248, 90 FR 14005",
        "frCitation": "90 FR 14005",
        "frDocumentNumber": "2025-05523",
        "publishedAt": "2025-03-28",
        "issues": [
          {
            "issueKey": "voter_id",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 2(a) directs the Election Assistance Commission to require documentary proof of United States citizenship on the federal voter-registration form.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order by number: \"Signed EO 14248, 'Preserving and Protecting the Integrity of American Elections'\". No other action on file reaches this issue, so it stands as coverage rather than as a test."
          },
          {
            "issueKey": "election_integrity",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Directs federal agencies to share data to identify ineligible registrants and directs enforcement of ballot-receipt deadlines against States that count late-arriving ballots."
          }
        ],
        "status": [
          {
            "status": "partly_blocked",
            "effectiveAt": "2025-04-24",
            "authority": "U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)",
            "basis": "court_ruling",
            "sourceLabel": "D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 / 25-0955 (CKK), Memorandum Opinion of Apr. 24, 2025",
            "sourceUrl": "https://storage.courtlistener.com/pdf/2025/04/24/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf",
            "caseUrl": "https://www.courtlistener.com/opinion/10384437/league-of-united-latin-american-citizens-v-executive-office-of-the/",
            "note": "Sections 2(a) and 2(d) PRELIMINARILY ENJOINED; the motions were DENIED as to Sections 2(b), 7(a) and 7(b), which were left free to operate. Read from the court's own opinion, whose disposition names each section separately."
          },
          {
            "status": "partly_blocked",
            "effectiveAt": "2025-10-31",
            "authority": "U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)",
            "basis": "court_ruling",
            "sourceLabel": "D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 / 25-0955 (CKK), Memorandum Opinion of Oct. 31, 2025",
            "sourceUrl": "https://storage.courtlistener.com/pdf/2025/10/31/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf",
            "caseUrl": "https://www.courtlistener.com/opinion/10715616/league-of-united-latin-american-citizens-v-executive-office-of-the/",
            "note": "Escalation, not resolution: on partial summary judgment the court PERMANENTLY ENJOINED implementation of Section 2(a) and entered a final, appealable judgment on those separation-of-powers claims. Certain Administrative Procedure Act claims were dismissed without prejudice for want of final agency action. The rest of the order was not enjoined, so the standing stays 'partly blocked'."
          },
          {
            "status": "partly_blocked",
            "effectiveAt": "2026-01-30",
            "authority": "U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)",
            "basis": "court_ruling",
            "sourceLabel": "D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 / 25-0955 (CKK), Memorandum Opinion of Jan. 30, 2026",
            "sourceUrl": "https://storage.courtlistener.com/pdf/2026/01/30/league_of_united_latin_american_citizens_v._executive_office_of_the.pdf",
            "caseUrl": "https://www.courtlistener.com/opinion/10782009/league-of-united-latin-american-citizens-v-executive-office-of-the/",
            "note": "The current standing. The court DECLARED that Sections 2(d) and 3(d) cannot lawfully be implemented and PERMANENTLY ENJOINED them; dismissed the claims directed at Sections 4(a), 7(a) and 7(b) for want of standing or final agency action; and left claims touching Sections 2(b) and 3(a) for further proceedings, subject to strict Privacy Act compliance. Parts of the order are permanently enjoined and parts are still operative — which is what 'partly blocked' means, and why one word for the whole order would be false either way."
          }
        ]
      }
    ]
  };
})();
