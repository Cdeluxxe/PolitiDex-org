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
            "rationale": "Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal deficits over ten years."
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
            "rationale": "Section 2(a) directs the Election Assistance Commission to require documentary proof of United States citizenship on the federal voter-registration form."
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
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14257",
        "executiveOrderNumber": 14257,
        "title": "Regulating Imports With a Reciprocal Tariff To Rectify Trade Practices That Contribute to Large and Persistent Annual United States Goods Trade Deficits",
        "actedAt": "2025-04-02",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/04/07/2025-06063/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and",
        "sourceLabel": "Federal Register — Executive Order 14257, 90 FR 15041",
        "frCitation": "90 FR 15041",
        "frDocumentNumber": "2025-06063",
        "publishedAt": "2025-04-07",
        "issues": [
          {
            "issueKey": "tariffs_growth",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Imposes a baseline ad valorem duty on imports from nearly all trading partners plus higher country-specific rates, on the stated ground that persistent goods trade deficits have hollowed out the domestic manufacturing base."
          },
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "rationale": "Sets tariff rates by executive order under the International Emergency Economic Powers Act rather than under a rate schedule enacted by Congress."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "rationale": "The duties apply across nearly the whole import base and the order pairs them with no offsetting relief for household purchasers."
          },
          {
            "issueKey": "tariffs_china",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Assigns China one of the higher country-specific rates in the annexed schedule, on the stated ground of non-reciprocal trade practices."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "rationale": "Uses import duties as the instrument for reshoring domestic manufacturing and rebuilding supply chains."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-04-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14257 document record, 90 FR 15041",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/04/07/2025-06063/regulating-imports-with-a-reciprocal-tariff-to-rectify-trade-practices-that-contribute-to-large-and",
            "note": "Issued April 2, 2025 and published April 7, 2025. The register's disposition record for this order carries cross-references to a long series of later tariff actions but no entry revoking or superseding it, so it stood as published by later presidential action. This is not a statement about any challenge to it — the standing below is."
          },
          {
            "status": "struck_down",
            "effectiveAt": "2026-02-20",
            "authority": "Supreme Court of the United States (opinion of the Court delivered by the Chief Justice)",
            "basis": "court_ruling",
            "sourceLabel": "U.S. Supreme Court — Learning Resources, Inc. v. Trump, No. 24-1287, slip opinion of Feb. 20, 2026",
            "sourceUrl": "https://www.supremecourt.gov/opinions/25pdf/24-1287_4gcj.pdf",
            "note": "Held: the International Emergency Economic Powers Act does not authorize the President to impose tariffs. The opinion names this order among the challenged actions by number and citation. The Court affirmed the judgment of the Federal Circuit in No. 25-250, which had concluded that IEEPA's grant of authority to regulate importation did not authorize the challenged duties, and vacated the judgment in No. 24-1287 with instructions to dismiss for want of jurisdiction. Read from the Court's own syllabus holding and judgment paragraph. The Court decided nothing about refunds of duties already collected, and this row asserts nothing about them."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14273",
        "executiveOrderNumber": 14273,
        "title": "Lowering Drug Prices by Once Again Putting Americans First",
        "actedAt": "2025-04-15",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/04/18/2025-06837/lowering-drug-prices-by-once-again-putting-americans-first",
        "sourceLabel": "Federal Register — Executive Order 14273, 90 FR 16441",
        "frCitation": "90 FR 16441",
        "frDocumentNumber": "2025-06837",
        "publishedAt": "2025-04-18",
        "issues": [
          {
            "issueKey": "health_drug_prices",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Secretary of Health and Human Services to improve the Medicare drug-price negotiation program, to align payment for prescription medicines more closely with acquisition cost, and to pursue measures aimed at lowering what patients pay at the pharmacy counter."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-04-18",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14273 document record, 90 FR 16441",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/04/18/2025-06837/lowering-drug-prices-by-once-again-putting-americans-first",
            "note": "Issued April 15, 2025 and published April 18, 2025. The register's disposition record for this order carries a single cross-reference to Executive Order 14297 and no revocation or supersession entry, so it stands as published. A cross-reference is not a repeal. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14297",
        "executiveOrderNumber": 14297,
        "title": "Delivering Most-Favored-Nation Prescription Drug Pricing to American Patients",
        "actedAt": "2025-05-12",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/05/15/2025-08876/delivering-most-favored-nation-prescription-drug-pricing-to-american-patients",
        "sourceLabel": "Federal Register — Executive Order 14297, 90 FR 20749",
        "frCitation": "90 FR 20749",
        "frDocumentNumber": "2025-08876",
        "publishedAt": "2025-05-15",
        "issues": [
          {
            "issueKey": "health_drug_prices",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Directs the Secretary of Health and Human Services to set price targets for prescription medicines benchmarked to the lower prices paid by comparably developed nations, and to open a direct-to-patient purchasing channel at those prices.",
            "circularWithStance": true,
            "circularNote": "This order IS the stance card's source: the card's own citation is the presidential-actions page for this document, and its text restates the order's two operative directives. No identifier matches mechanically because the card writes the benchmark policy in prose while the row carries the order's formal title, so the declared flag is what holds the pair."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-05-15",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14297 document record, 90 FR 20749",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/05/15/2025-08876/delivering-most-favored-nation-prescription-drug-pricing-to-american-patients",
            "note": "Issued May 12, 2025 and published May 15, 2025. The register's disposition record carries a single cross-reference to Executive Order 14273 and no revocation or supersession entry, so it stands as published. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14233",
        "executiveOrderNumber": 14233,
        "title": "Establishment of the Strategic Bitcoin Reserve and United States Digital Asset Stockpile",
        "actedAt": "2025-03-06",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/03/11/2025-03992/establishment-of-the-strategic-bitcoin-reserve-and-united-states-digital-asset-stockpile",
        "sourceLabel": "Federal Register — Executive Order 14233, 90 FR 11789",
        "frCitation": "90 FR 11789",
        "frDocumentNumber": "2025-03992",
        "publishedAt": "2025-03-11",
        "issues": [
          {
            "issueKey": "crypto_cbdc",
            "direction": "advances",
            "isPrimary": true,
            "weight": 60,
            "rationale": "Establishes a federal framework for digital assets already held by the government — a Strategic Bitcoin Reserve and a United States Digital Asset Stockpile under Treasury custody — and sets rules for how those holdings are accounted for and disposed of. Weighted below the two orders that regulate the asset class itself, because custody policy for government holdings answers only part of what this issue asks."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-03-11",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14233 document record, 90 FR 11789",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/03/11/2025-03992/establishment-of-the-strategic-bitcoin-reserve-and-united-states-digital-asset-stockpile",
            "note": "Issued March 6, 2025 and published March 11, 2025. The register's disposition record for this order is empty — no revocation, supersession or cross-reference entry of any kind — so it stands as published by later presidential action. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14178",
        "executiveOrderNumber": 14178,
        "title": "Strengthening American Leadership in Digital Financial Technology",
        "actedAt": "2025-01-23",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02123/strengthening-american-leadership-in-digital-financial-technology",
        "sourceLabel": "Federal Register — Executive Order 14178, 90 FR 8647",
        "frCitation": "90 FR 8647",
        "frDocumentNumber": "2025-02123",
        "publishedAt": "2025-01-31",
        "issues": [
          {
            "issueKey": "crypto_cbdc",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs agencies to protect access to public blockchain networks and to develop a federal regulatory framework for digital assets, and prohibits agencies from establishing, issuing or promoting a United States central bank digital currency."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-31",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14178 document record, 90 FR 8647",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02123/strengthening-american-leadership-in-digital-financial-technology",
            "note": "Issued January 23, 2025 and published January 31, 2025. The register's disposition record shows this order revoking Executive Order 14067 of March 9, 2022, and carries no entry revoking or superseding this order in turn, so it stands as published. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14221",
        "executiveOrderNumber": 14221,
        "title": "Making America Healthy Again by Empowering Patients With Clear, Accurate, and Actionable Healthcare Pricing Information",
        "actedAt": "2025-02-25",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/28/2025-03440/making-america-healthy-again-by-empowering-patients-with-clear-accurate-and-actionable-healthcare",
        "sourceLabel": "Federal Register — Executive Order 14221, 90 FR 11005",
        "frCitation": "90 FR 11005",
        "frDocumentNumber": "2025-03440",
        "publishedAt": "2025-02-28",
        "issues": [
          {
            "issueKey": "healthcare_costs",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Departments of the Treasury, Labor and Health and Human Services to enforce the hospital and health-plan price-disclosure requirements, to require disclosure of actual prices rather than estimates, and to standardize pricing data so it can be compared across providers."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-28",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14221 document record, 90 FR 11005",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/28/2025-03440/making-america-healthy-again-by-empowering-patients-with-clear-accurate-and-actionable-healthcare",
            "note": "Issued February 25, 2025 and published February 28, 2025. The register's disposition record carries a single cross-reference to Executive Order 14158 and no revocation or supersession entry, so it stands as published. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14165",
        "executiveOrderNumber": 14165,
        "title": "Securing Our Borders",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02015/securing-our-borders",
        "sourceLabel": "Federal Register — Executive Order 14165, 90 FR 8467",
        "frCitation": "90 FR 8467",
        "frDocumentNumber": "2025-02015",
        "publishedAt": "2025-01-30",
        "issues": [
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs resumption of physical barrier construction along the southern border, deployment of personnel and detection technology to maintain operational control of it, and detention rather than release of those apprehended crossing it."
          },
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Directs removal of apprehended entrants and termination of practices that released them into the interior pending proceedings."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-30",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14165 document record, 90 FR 8467",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02015/securing-our-borders",
            "note": "Issued January 20, 2025 and published January 30, 2025. The register's disposition record for this order is empty — no revocation, supersession or cross-reference entry of any kind — so it stands as published by later presidential action. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14159",
        "executiveOrderNumber": 14159,
        "title": "Protecting the American People Against Invasion",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-02006/protecting-the-american-people-against-invasion",
        "sourceLabel": "Federal Register — Executive Order 14159, 90 FR 8443",
        "frCitation": "90 FR 8443",
        "frDocumentNumber": "2025-02006",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Department of Homeland Security to prioritize removal of those present without authorization, to restore programs enlisting State and local officers in interior enforcement, and to expand detention capacity pending removal."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Directs the enforcement machinery behind the border regime, including expanded detention and the use of expedited removal to the extent the statute allows."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-29",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14159 document record, 90 FR 8443",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-02006/protecting-the-american-people-against-invasion",
            "note": "Issued January 20, 2025 and published January 29, 2025. The register's disposition record shows this order revoking Executive Orders 13993, 14010, 14011 and 14012, and carries cross-references to two later orders but no entry revoking or superseding this one, so it stands as published. This says nothing about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-26",
        "measureNumber": "S. 331",
        "congress": 119,
        "chamber": "senate",
        "title": "Halt All Lethal Trafficking of Fentanyl Act",
        "actedAt": "2025-07-16",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/331",
        "sourceLabel": "Congress.gov — S. 331, 119th Congress",
        "issues": [
          {
            "issueKey": "immig_fentanyl",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 2 amends section 202(c) of the Controlled Substances Act to place fentanyl-related substances, including their salts and isomers, on schedule I as a class rather than one compound at a time."
          },
          {
            "issueKey": "tough_on_crime",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "rationale": "Class scheduling brings the offences and penalties attached to schedule I to bear on a whole family of related substances."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-16",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-26, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ26/html/PLAW-119publ26.htm",
            "note": "Enacted and published as Public Law 119-26, approved July 16, 2025, at 139 Stat. 409. Nothing on file repeals or amends it. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-27",
        "measureNumber": "S. 1582",
        "congress": 119,
        "chamber": "senate",
        "title": "Guiding and Establishing National Innovation for U.S. Stablecoins Act",
        "actedAt": "2025-07-18",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/senate-bill/1582",
        "sourceLabel": "Congress.gov — S. 1582, 119th Congress",
        "issues": [
          {
            "issueKey": "crypto_cbdc",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Creates the federal regulatory regime for payment stablecoins — who may issue them, which federal banking agency supervises each class of issuer, and what reserve and disclosure obligations attach."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-18",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-27, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ27/html/PLAW-119publ27.htm",
            "note": "Enacted and published as Public Law 119-27, approved July 18, 2025, at 139 Stat. 419. Nothing on file repeals or amends it. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-28",
        "measureNumber": "H.R. 4",
        "congress": 119,
        "chamber": "house",
        "title": "Rescissions Act of 2025",
        "actedAt": "2025-07-24",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/house-bill/4",
        "sourceLabel": "Congress.gov — H.R. 4, 119th Congress",
        "issues": [
          {
            "issueKey": "cut_spending",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Cancels unobligated balances of budget authority already appropriated, item by item, on the President's own rescission request — foreign assistance and public-broadcasting accounts among them."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-24",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-28, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ28/html/PLAW-119publ28.htm",
            "note": "Enacted and published as Public Law 119-28, approved July 24, 2025, at 139 Stat. 467. Nothing on file repeals or amends it. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14173",
        "executiveOrderNumber": 14173,
        "title": "Ending Illegal Discrimination and Restoring Merit-Based Opportunity",
        "actedAt": "2025-01-21",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02097/ending-illegal-discrimination-and-restoring-merit-based-opportunity",
        "sourceLabel": "Federal Register — Executive Order 14173, 90 FR 8633",
        "frCitation": "90 FR 8633",
        "frDocumentNumber": "2025-02097",
        "publishedAt": "2025-01-31",
        "issues": [
          {
            "issueKey": "end_dei",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Revokes the executive order that imposed affirmative-action obligations on federal contractors and directs agencies to end federal preference programs. The Federal Register disposition record for this document enumerates the revocations by number, including EO 11246 of September 24, 1965 and EO 13672 of July 21, 2014."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-21",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14173 document record, 90 FR 8633",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02097/ending-illegal-discrimination-and-restoring-merit-based-opportunity",
            "note": "Published at 90 FR 8633. The disposition record for this document lists the orders it revokes and carries no entry revoking or superseding it in turn, so it stands as published by later presidential action. That is the whole of the claim and it says nothing about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14222",
        "executiveOrderNumber": 14222,
        "title": "Implementing the President's \"Department of Government Efficiency\" Cost Efficiency Initiative",
        "actedAt": "2025-02-26",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/03/03/2025-03527/implementing-the-presidents-department-of-government-efficiency-cost-efficiency-initiative",
        "sourceLabel": "Federal Register — Executive Order 14222, 90 FR 11095",
        "frCitation": "90 FR 11095",
        "frDocumentNumber": "2025-03527",
        "publishedAt": "2025-03-03",
        "issues": [
          {
            "issueKey": "cut_spending",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 1 commences what the order calls a transformation in federal spending on contracts, grants and loans, and directs agency heads to build a centralised review of covered payments with the DOGE team lead before they are made."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-26",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14222 document record, 90 FR 11095",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/03/03/2025-03527/implementing-the-presidents-department-of-government-efficiency-cost-efficiency-initiative",
            "note": "Published at 90 FR 11095. The disposition record for this document carries a single cross-reference to EO 14158 and no entry revoking or superseding it, so it stands as published by later presidential action. This describes the order's status in the register and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14169",
        "executiveOrderNumber": 14169,
        "title": "Reevaluating and Realigning United States Foreign Aid",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02091/reevaluating-and-realigning-united-states-foreign-aid",
        "sourceLabel": "Federal Register — Executive Order 14169, 90 FR 8619",
        "frCitation": "90 FR 8619",
        "frDocumentNumber": "2025-02091",
        "publishedAt": "2025-01-30",
        "issues": [
          {
            "issueKey": "america_first_fp",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 2 states as policy that no further United States foreign assistance shall be disbursed in a manner that is not fully aligned with the foreign policy of the President, and section 3 imposes an immediate pause on new obligations and disbursements pending review."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14169 document record, 90 FR 8619",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02091/reevaluating-and-realigning-united-states-foreign-aid",
            "note": "Published at 90 FR 8619. The disposition record for this document carries a cross-reference to a later presidential memorandum and no entry revoking or superseding the order, so it stands as published by later presidential action. This order has been litigated over the funds it paused, and this row deliberately reports only the register: it is not a statement about any challenge to it, and no ruling is claimed here."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14186",
        "executiveOrderNumber": 14186,
        "title": "The Iron Dome for America",
        "actedAt": "2025-01-27",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/03/2025-02182/the-iron-dome-for-america",
        "sourceLabel": "Federal Register — Executive Order 14186, 90 FR 8767",
        "frCitation": "90 FR 8767",
        "frDocumentNumber": "2025-02182",
        "publishedAt": "2025-02-03",
        "issues": [
          {
            "issueKey": "strong_defense",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Secretary of Defense to submit an architecture and implementation plan for a next-generation missile defense shield for the United States, including the capability to defeat ballistic, hypersonic and cruise missile attacks."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-27",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14186 document record, 90 FR 8767",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/03/2025-02182/the-iron-dome-for-america",
            "note": "Published at 90 FR 8767. The disposition record for this document carries one cross-reference, to EO 14369 of December 18, 2025, and that later order's own disposition record revokes EO 14056 rather than this one — so nothing on file revokes or supersedes it. This describes the register only and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14261",
        "executiveOrderNumber": 14261,
        "title": "Reinvigorating America's Beautiful Clean Coal Industry and Amending Executive Order 14241",
        "actedAt": "2025-04-08",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/04/14/2025-06380/reinvigorating-americas-beautiful-clean-coal-industry-and-amending-executive-order-14241",
        "sourceLabel": "Federal Register — Executive Order 14261, 90 FR 15517",
        "frCitation": "90 FR 15517",
        "frDocumentNumber": "2025-06380",
        "publishedAt": "2025-04-14",
        "issues": [
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 1 states that increasing domestic energy production including coal is the purpose of the order, and section 3 designates coal as a mineral under EO 14241 so that it receives that order's expedited treatment."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Section 4 directs the Secretaries of the Interior, Agriculture and Energy to report on coal resources and reserves on federal lands and on obstacles to leasing and mining them."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-04-08",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14261 document record, 90 FR 15517",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/04/14/2025-06380/reinvigorating-americas-beautiful-clean-coal-industry-and-amending-executive-order-14241",
            "note": "Published at 90 FR 15517. The disposition record for this document shows that it amends EO 14241 and cross-references EO 14386 of February 11, 2026; that later order's own disposition record cross-references this one without revoking it, so nothing on file revokes or supersedes it. This is a reading of the register and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14153",
        "executiveOrderNumber": 14153,
        "title": "Unleashing Alaska's Extraordinary Resource Potential",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01955/unleashing-alaskas-extraordinary-resource-potential",
        "sourceLabel": "Federal Register — Executive Order 14153, 90 FR 8347",
        "frCitation": "90 FR 8347",
        "frDocumentNumber": "2025-01955",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Secretaries of the Interior, Agriculture, Energy and Commerce to expedite permitting and leasing for energy and natural-resource projects in Alaska and to reopen federal acreage there to development."
          },
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Section 3 directs agencies to prioritise the development of Alaska's liquefied natural gas potential, including the transport of that gas to other regions of the United States and to allied nations."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14153 document record, 90 FR 8347",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01955/unleashing-alaskas-extraordinary-resource-potential",
            "note": "Published at 90 FR 8347. The disposition record for this document is empty — no later presidential action revokes, supersedes or amends it — so it stands as published. That is a reading of the register and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14164",
        "executiveOrderNumber": 14164,
        "title": "Restoring the Death Penalty and Protecting Public Safety",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02012/restoring-the-death-penalty-and-protecting-public-safety",
        "sourceLabel": "Federal Register — Executive Order 14164, 90 FR 8463",
        "frCitation": "90 FR 8463",
        "frDocumentNumber": "2025-02012",
        "publishedAt": "2025-01-30",
        "issues": [
          {
            "issueKey": "tough_on_crime",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Attorney General to pursue the death penalty for federal capital crimes and to seek it in particular for the murder of a law-enforcement officer and for capital crimes committed by people unlawfully present in the United States."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14164 document record, 90 FR 8463",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02012/restoring-the-death-penalty-and-protecting-public-safety",
            "note": "Published at 90 FR 8463. The disposition record for this document is empty — no later presidential action revokes or supersedes it — so it stands as published. This reports the register and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14162",
        "executiveOrderNumber": 14162,
        "title": "Putting America First in International Environmental Agreements",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02010/putting-america-first-in-international-environmental-agreements",
        "sourceLabel": "Federal Register — Executive Order 14162, 90 FR 8455",
        "frCitation": "90 FR 8455",
        "frDocumentNumber": "2025-02010",
        "publishedAt": "2025-01-30",
        "issues": [
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 3 directs the United States Ambassador to the United Nations to submit immediate written notice of withdrawal from the Paris Agreement and from any other commitment made under the United Nations Framework Convention on Climate Change.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue gives its evidence as \"Executive Order withdrawing from the Paris Agreement\", which is a description of this document and nothing else. The issue keeps two independent tests it does not name — Executive Order 14261 and Public Law 119-21."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14162 document record, 90 FR 8455",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02010/putting-america-first-in-international-environmental-agreements",
            "note": "Published at 90 FR 8455. The disposition record for this document carries a cross-reference to a later presidential memorandum and no entry revoking or superseding the order, so it stands as published by later presidential action. This is a reading of the register and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 10886",
        "title": "Declaring a National Emergency at the Southern Border of the United States",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01948/declaring-a-national-emergency-at-the-southern-border-of-the-united-states",
        "sourceLabel": "Federal Register — Proclamation 10886, 90 FR 8327",
        "frCitation": "90 FR 8327",
        "frDocumentNumber": "2025-01948",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Declares a national emergency at the southern border under the National Emergencies Act and directs the Secretaries of Defense and Homeland Security to order units of the armed forces to the border in support of the Department of Homeland Security's mission there."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-15",
            "authority": "President of the United States, by notice continuing the declared emergency",
            "basis": "register_continuation",
            "sourceLabel": "Federal Register — Notice on Declaring a National Emergency at the Southern Border of the United States, 90 FR 37371",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/08/04/2025-14789/notice-on-declaring-a-national-emergency-at-the-southern-border-of-the-united-states",
            "note": "A National Emergencies Act declaration expires one year after it is declared unless the President continues it. This notice, signed July 15, 2025 and published at 90 FR 37371, continues the emergency declared in this proclamation beyond its first anniversary, so it had not lapsed. A continuation is itself a presidential act: it establishes that the declaration is still on foot and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Presidential Memorandum, 90 FR 8245",
        "title": "Delivering Emergency Price Relief for American Families and Defeating the Cost-of-Living Crisis",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis",
        "sourceLabel": "Federal Register — Presidential Memorandum of January 20, 2025, 90 FR 8245",
        "frCitation": "90 FR 8245",
        "frDocumentNumber": "2025-01904",
        "publishedAt": "2025-01-28",
        "issues": [
          {
            "issueKey": "cost_living",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the heads of all executive departments and agencies to deliver emergency price relief and to pursue appropriate actions to lower the cost of housing, health care, food and energy, and to report to the Assistant to the President for Economic Policy every thirty days.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue quotes this document by title as its evidence — \"Signed the 'Delivering Emergency Price Relief for American Families' memorandum\" — so the pair cannot test itself. The issue is separately tested by the itemized pledge on it, which is scored against the Bureau of Labor Statistics consumer price index rather than against any document signed by the figure."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "President of the United States",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Presidential Memorandum of January 20, 2025 document record, 90 FR 8245",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis",
            "note": "Published at 90 FR 8245. The disposition record for this document is empty — no later presidential action revokes or supersedes it — so the direction to agencies stands as published. Standing describes the instrument, not its effect: this row asserts that the memorandum is on foot and asserts nothing about prices, and it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14212",
        "executiveOrderNumber": 14212,
        "title": "Establishing the President's Make America Healthy Again Commission",
        "actedAt": "2025-02-13",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/19/2025-02871/establishing-the-presidents-make-america-healthy-again-commission",
        "sourceLabel": "Federal Register — Executive Order 14212, 90 FR 9833",
        "frCitation": "90 FR 9833",
        "frDocumentNumber": "2025-02871",
        "publishedAt": "2025-02-19",
        "issues": [
          {
            "issueKey": "healthcare",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Establishes the President's Make America Healthy Again Commission, chaired by the Secretary of Health and Human Services, and directs it to study the childhood chronic disease crisis and its contributing causes and to submit the Make Our Children Healthy Again Assessment to the President within 100 days. Section 2 sets the policy that agencies addressing health or healthcare focus on reversing chronic disease and ensure the availability of expanded treatment options."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-19",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14212 document record, 90 FR 9833",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/19/2025-02871/establishing-the-presidents-make-america-healthy-again-commission",
            "note": "The register's disposition record for this order carries two forward cross-references — Executive Order 14355 of September 30, 2025 and Executive Order 14414 of June 25, 2026 — and neither revokes or supersedes it; both were read and are later health and agriculture orders that cite the Commission rather than end it. So the order stands as published. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14293",
        "executiveOrderNumber": 14293,
        "title": "Regulatory Relief To Promote Domestic Production of Critical Medicines",
        "actedAt": "2025-05-05",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/05/08/2025-08267/regulatory-relief-to-promote-domestic-production-of-critical-medicines",
        "sourceLabel": "Federal Register — Executive Order 14293, 90 FR 19615",
        "frCitation": "90 FR 19615",
        "frDocumentNumber": "2025-08267",
        "publishedAt": "2025-05-08",
        "issues": [
          {
            "issueKey": "healthcare",
            "direction": "advances",
            "isPrimary": true,
            "weight": 80,
            "rationale": "Directs the Commissioner of Food and Drugs, within 180 days, to review and eliminate duplicative or unnecessary regulations and guidance governing domestic pharmaceutical manufacturing, and to improve the timeliness and predictability of agency review of new and expanded manufacturing capacity."
          },
          {
            "issueKey": "health_drug_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Sets as policy the restoration of a domestic pharmaceutical manufacturing base on the stated ground that the barriers it removes stand in the way of an affordable pharmaceutical supply chain for American patients."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-05-08",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14293 document record, 90 FR 19615",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/05/08/2025-08267/regulatory-relief-to-promote-domestic-production-of-critical-medicines",
            "note": "The register's disposition record for this order carries one cross-reference, back to Executive Order 13944 of August 6, 2020, which the order itself cites as the first-term predecessor it builds on. There is no entry revoking or superseding it, so it stands as published. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 11010",
        "title": "Ensuring Affordable Beef for the American Consumer",
        "actedAt": "2026-02-06",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/02/13/2026-03050/ensuring-affordable-beef-for-the-american-consumer",
        "sourceLabel": "Federal Register — Proclamation 11010, 91 FR 7107",
        "frCitation": "91 FR 7107",
        "frDocumentNumber": "2026-03050",
        "publishedAt": "2026-02-13",
        "issues": [
          {
            "issueKey": "cost_living",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Increases the calendar-year 2026 in-quota quantity of the beef tariff-rate quota by 80,000 metric tons of lean beef trimmings, released in four quarterly tranches and allocated in its entirety to Argentina, on the determination that domestic supply would otherwise be inadequate to meet domestic demand at reasonable prices."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 85,
            "rationale": "Lowers a tariff barrier for the stated purpose of holding a consumer price down: the proclamation enlarges the in-quota quantity so that beef entering under the quota pays the low in-quota rate rather than the over-quota rate, on the President's determination that domestic supply would otherwise be inadequate to meet domestic demand at reasonable prices."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-02-13",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11010 document record, 91 FR 7107",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/13/2026-03050/ensuring-affordable-beef-for-the-american-consumer",
            "note": "The register's disposition record for this proclamation carries no cross-references at all, so nothing has revoked, amended or superseded it and it stands as published. Standing describes the instrument, not its effect: this row asserts that the quota increase is on foot and asserts nothing about the price of beef. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14394",
        "executiveOrderNumber": 14394,
        "title": "Removing Regulatory Barriers to Affordable Home Construction",
        "actedAt": "2026-03-13",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/03/18/2026-05388/removing-regulatory-barriers-to-affordable-home-construction",
        "sourceLabel": "Federal Register — Executive Order 14394, 91 FR 13207",
        "frCitation": "91 FR 13207",
        "frDocumentNumber": "2026-05388",
        "publishedAt": "2026-03-18",
        "issues": [
          {
            "issueKey": "housing_build",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Army Corps of Engineers and the Environmental Protection Agency to revise stormwater, wetlands and Clean Water Act section 404 permitting requirements to reduce housing construction costs, and directs Commerce, HUD, Transportation and the Federal Housing Finance Agency to consider eliminating rules that constrain residential development."
          },
          {
            "issueKey": "cost_living",
            "direction": "advances",
            "isPrimary": false,
            "weight": 80,
            "rationale": "Sets as administration policy the reduction of regulatory barriers to building homes on the stated ground that permitting delays and mandates have driven up the cost of new housing and made it less affordable."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-03-18",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14394 document record, 91 FR 13207",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/03/18/2026-05388/removing-regulatory-barriers-to-affordable-home-construction",
            "note": "The register's disposition record for this order carries no cross-references, so nothing has revoked or superseded it and it stands as published. The order directs rulemaking rather than performing it, so this row asserts that the direction is on foot and asserts nothing about any rule that follows from it. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 10896",
        "title": "Adjusting Imports of Steel Into the United States",
        "actedAt": "2025-02-10",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/18/2025-02833/adjusting-imports-of-steel-into-the-united-states",
        "sourceLabel": "Federal Register — Proclamation 10896, 90 FR 9817",
        "frCitation": "90 FR 9817",
        "frDocumentNumber": "2025-02833",
        "publishedAt": "2025-02-18",
        "issues": [
          {
            "issueKey": "tariffs_growth",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Terminates every country arrangement, exemption and quota that had displaced the section 232 steel tariff — for South Korea, Argentina, Australia, Brazil, Canada, Mexico, the European Union, Japan, the United Kingdom and Ukraine — effective March 12, 2025, restoring the ad valorem duty across steel imports."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Uses import duties on a single industrial input as the instrument for rebuilding domestic steel capacity, and removes the alternative arrangements that had let named partners ship outside the duty."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Restores the duty across the steel import base with no offsetting relief for downstream purchasers."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-18",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 10896 document record, 90 FR 9817",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/18/2025-02833/adjusting-imports-of-steel-into-the-united-states",
            "note": "The register's disposition record for this proclamation carries no revoking or superseding entry, so it stands as published. It is not among the documents whose duties Executive Order 14389 of February 20, 2026 ended: that order reaches only the additional ad valorem duties imposed under the International Emergency Economic Powers Act, and this proclamation was issued under section 232 of the Trade Expansion Act of 1962. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Presidential Memorandum, 90 FR 8471",
        "title": "America First Trade Policy",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02032/america-first-trade-policy",
        "sourceLabel": "Federal Register — Presidential Memorandum of January 20, 2025, 90 FR 8471",
        "frCitation": "90 FR 8471",
        "frDocumentNumber": "2025-02032",
        "publishedAt": "2025-01-30",
        "issues": [
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the Secretary of Commerce, with the Treasury and the Trade Representative, to investigate the causes of persistent annual goods trade deficits and to recommend remedies including a global supplemental tariff, and directs the Treasury to report on the feasibility of an external revenue service to collect duties."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-30",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — America First Trade Policy document record, 90 FR 8471",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/30/2025-02032/america-first-trade-policy",
            "note": "The register's disposition record for this memorandum carries no revoking or superseding entry, so the direction to agencies stands as published. The later tariff actions it asked agencies to recommend have their own standing rows on their own documents; this row asserts only that the direction is on foot. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14195",
        "executiveOrderNumber": 14195,
        "title": "Imposing Duties To Address the Synthetic Opioid Supply Chain in the People's Republic of China",
        "actedAt": "2025-02-01",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02408/imposing-duties-to-address-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of-china",
        "sourceLabel": "Federal Register — Executive Order 14195, 90 FR 9121",
        "frCitation": "90 FR 9121",
        "frDocumentNumber": "2025-02408",
        "publishedAt": "2025-02-07",
        "issues": [
          {
            "issueKey": "tariffs_china",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Imposes an additional ad valorem duty on all articles that are products of the People's Republic of China, invoking section 1702(a)(1)(B) of the International Emergency Economic Powers Act on the finding that other tariff authority was inadequate."
          },
          {
            "issueKey": "immig_fentanyl",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Expands the national emergency declared in Proclamation 10886 to cover the failure of the PRC government to intercept chemical precursor suppliers, money launderers and transnational criminal organisations, and imposes the duties as the measure against that supply chain."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14195 document record, 90 FR 9121",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02408/imposing-duties-to-address-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of-china",
            "note": "Issued February 1, 2025 and published February 7, 2025. The duties were collected under this order, as amended by Executive Order 14228 of March 3, 2025, for just over a year. That period is a fact about the record and is reported separately from what ended it, which is the row below. This is not a statement about any challenge to it."
          },
          {
            "status": "superseded",
            "effectiveAt": "2026-02-20",
            "authority": "President of the United States, by later executive order",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14389, Ending Certain Tariff Actions, 91 FR 9437",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
            "note": "Executive Order 14389, signed February 20, 2026 and published February 25, 2026, provides that the additional ad valorem duties imposed under the International Emergency Economic Powers Act by this order, as amended, \"shall no longer be in effect and, as soon as practicable, shall no longer be collected.\" That order names this one expressly and states that the national emergency and every other action taken under it are unaffected, so this row records the end of the duties and not the end of the order. Read from Executive Order 14389 itself; this is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14399",
        "executiveOrderNumber": 14399,
        "title": "Ensuring Citizenship Verification and Integrity in Federal Elections",
        "actedAt": "2026-03-31",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/04/03/2026-06601/ensuring-citizenship-verification-and-integrity-in-federal-elections",
        "sourceLabel": "Federal Register — Executive Order 14399, 91 FR 17125",
        "frCitation": "91 FR 17125",
        "frDocumentNumber": "2026-06601",
        "publishedAt": "2026-04-03",
        "issues": [
          {
            "issueKey": "election_integrity",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Directs the transmission of State Citizenship Lists built from Social Security Administration records and the Department of Homeland Security's SAVE program, directs the Attorney General to prioritise investigation and prosecution of officials who issue federal ballots to ineligible individuals, and directs the Postmaster General to begin a rulemaking within 60 days on uniform standards for mail-in and absentee ballot envelopes."
          },
          {
            "issueKey": "voter_id",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Builds federal citizenship verification for election eligibility on existing SSA and SAVE records, and requires unique Intelligent Mail barcode identifiers on outbound ballot mail so that ballots can be traced to an identified recipient."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-04-03",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14399 document record, 91 FR 17125",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/04/03/2026-06601/ensuring-citizenship-verification-and-integrity-in-federal-elections",
            "note": "The register's disposition record for this order carries no revoking or superseding entry, so it stands as published. The order itself states that appearing on a State Citizenship List does not by itself place anyone on the rolls and that State and Federal registration law still applies, so this row asserts that the order is on foot and asserts nothing about any registration outcome. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14150",
        "executiveOrderNumber": 14150,
        "title": "America First Policy Directive to the Secretary of State",
        "actedAt": "2025-01-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01952/america-first-policy-directive-to-the-secretary-of-state",
        "sourceLabel": "Federal Register — Executive Order 14150, 90 FR 8337",
        "frCitation": "90 FR 8337",
        "frDocumentNumber": "2025-01952",
        "publishedAt": "2025-01-29",
        "issues": [
          {
            "issueKey": "america_first",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 1 provides that from that day forward the foreign policy of the United States shall champion core American interests and always put America and American citizens first; section 2 directs the Secretary of State to issue guidance bringing the Department's policies, programs, personnel and operations in line with it."
          },
          {
            "issueKey": "america_first_fp",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "rationale": "Sets the doctrine that the foreign-aid realignment order signed the same day carries out, at the level of the Department of State as a whole rather than of one program."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-29",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14150 document record, 90 FR 8337",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/29/2025-01952/america-first-policy-directive-to-the-secretary-of-state",
            "note": "The register's disposition record for this order carries two cross-references — back to Executive Order 13985 of January 20, 2021, which it displaces, and forward to a memorandum of July 15, 2025 — and no entry revoking or superseding it, so it stands as published. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14360",
        "executiveOrderNumber": 14360,
        "title": "Modifying the Scope of the Reciprocal Tariffs With Respect to Certain Agricultural Products",
        "actedAt": "2025-11-14",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/11/25/2025-21203/modifying-the-scope-of-the-reciprocal-tariffs-with-respect-to-certain-agricultural-products",
        "sourceLabel": "Federal Register — Executive Order 14360, 90 FR 54091",
        "frCitation": "90 FR 54091",
        "frDocumentNumber": "2025-21203",
        "publishedAt": "2025-11-25",
        "issues": [
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "rationale": "Section 1 determines that certain agricultural products shall not be subject to the reciprocal tariff imposed under Executive Order 14257, as amended, and issues updated versions of that order's Annex II; section 2 modifies the Harmonized Tariff Schedule accordingly effective for goods entered on or after 12:01 a.m. eastern standard time on November 13, 2025 — a day before signature — and provides that to the extent implementation requires a refund of duties collected, refunds shall be processed through U.S. Customs and Border Protection's standard procedures."
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "rationale": "Removes a class of goods from the reciprocal tariff's coverage, and gives as the grounds for doing so the President's consideration of \"current domestic demand for certain products, and current domestic capacity to produce certain products\" alongside the status of negotiations — a narrowing of the instrument driven in part by domestic supply conditions rather than by anything a trading partner conceded."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-11-25",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14360 document record, 90 FR 54091",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/11/25/2025-21203/modifying-the-scope-of-the-reciprocal-tariffs-with-respect-to-certain-agricultural-products",
            "note": "The register's disposition record for this order carries three cross-references — back to Executive Order 14257 of April 2, 2025 and Executive Order 14346 of September 5, 2025, the orders whose annexes it updates, and forward to the notice of March 24, 2026 at 91 FR 15517, which continued the national emergency declared in Executive Order 14257 — and no entry revoking or superseding it, so it stands as published. Read the limit of that carefully: the duties this order carved products out of were themselves ended on February 20, 2026 by Executive Order 14389, and the order that imposed them was held unauthorized the same day. This row does not assert a standing beyond what the register shows, and it is not a statement about any challenge to this order."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 11038",
        "title": "Declaration of Emergency and Authorization for Temporary Duty-Free Importation of Phosphate Fertilizer From Morocco",
        "actedAt": "2026-06-29",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/07/02/2026-13588/declaration-of-emergency-and-authorization-for-temporary-duty-free-importation-of-phosphate",
        "sourceLabel": "Federal Register — Proclamation 11038, 91 FR 40855",
        "frCitation": "91 FR 40855",
        "frDocumentNumber": "2026-13588",
        "publishedAt": "2026-07-02",
        "issues": [
          {
            "issueKey": "econ_trade",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 85,
            "rationale": "Directs the Secretary of the Treasury and the Secretary of Commerce, under section 318 of the Tariff Act of 1930 (19 U.S.C. 1318(a)), to permit importation of phosphate fertilizers of the Kingdom of Morocco free of the collection of duties and of deposits of estimated duties under sections 1671, 1675 and 1677j of title 19 — the countervailing-duty provisions — for up to eight months or until the declared emergency terminates."
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Paragraph 4 states that United States production of phosphate fertilizer is insufficient to support domestic agricultural food production after accounting for exports, and that although the Federal Government is working with the private sector to expand domestic fertilizer manufacturing capacity, \"those efforts will take time to increase the supply materially\" — so the interim answer chosen is duty-free foreign supply rather than the tariff."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "rationale": "Paragraph 3 gives as the reason for the action persistent threats to the global fertilizer supply chain \"which create rapid price increases and procurement challenges\", and paragraph 2 ties the timing to the spring and summer application window, when the year's phosphate fertilizer goes onto the fields — relief from a duty, granted to keep an input cost down."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-07-02",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11038 document record, 91 FR 40855",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/07/02/2026-13588/declaration-of-emergency-and-authorization-for-temporary-duty-free-importation-of-phosphate",
            "note": "The register's disposition record for this proclamation carries no cross-references at all, so nothing has revoked, amended or superseded it and it stands as published. It is time-limited by its own paragraph (2), which runs the authorization until the earlier of eight months after June 29, 2026 or termination of the emergency it declares; that window had not closed when this row was written, and this row asserts nothing about what happens at its end. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 11012",
        "title": "Imposing a Temporary Import Surcharge To Address Fundamental International Payments Problems",
        "actedAt": "2026-02-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03824/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems",
        "sourceLabel": "Federal Register — Proclamation 11012, 91 FR 9339",
        "frCitation": "91 FR 9339",
        "frDocumentNumber": "2026-03824",
        "publishedAt": "2026-02-25",
        "issues": [
          {
            "issueKey": "tariffs_growth",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Imposes an additional 10 percent ad valorem surcharge on articles imported into the United States, effective for goods entered on or after 12:01 a.m. eastern standard time on February 24, 2026, under section 122 of the Trade Act of 1974 (19 U.S.C. 2132), which permits an import surcharge of up to 15 percent for up to 150 days to deal with large and serious United States balance-of-payments deficits."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 85,
            "rationale": "Re-imposes broad-based import duties across nearly the whole tariff schedule on the day the previous, differently-authorized program ended, so the trade-barrier posture continues without interruption under a statute the President selected for that purpose."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "rationale": "Applies a surcharge to nearly all imported articles. Paragraph 14 exempts a list of goods — critical minerals, bullion, energy, fertilizers, certain agricultural products, pharmaceuticals, certain electronics, vehicles, aerospace articles, goods already covered by section 232 actions, USMCA-qualifying duty-free Canadian and Mexican goods and CAFTA-DR textiles — and those carve-outs are recorded here rather than filed as relief, because a broad surcharge with a list of exceptions raises import costs on net and the chip on this issue is about everyday costs not rising."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-02-25",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11012 document record, 91 FR 9339",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03824/imposing-a-temporary-import-surcharge-to-address-fundamental-international-payments-problems",
            "note": "The register's disposition record for this proclamation carries no cross-references at all, so nothing on the register has revoked, amended or superseded it and it stands as published. It is time-limited on its own face: section 122 of the Trade Act of 1974 permits a surcharge for a period of no more than 150 days from February 24, 2026 unless that period is extended by Act of Congress. NO STANDING IS ASSERTED FOR WHAT HAPPENED AT THE END OF THAT PERIOD. Nothing on the register discloses it, and no public law of the 119th Congress read in this pass extends the surcharge — but the absence of an extension among the laws published so far is not a citable disposition, and this lane files no standing it cannot cite. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 119-37",
        "measureNumber": "H.R. 5371",
        "congress": 119,
        "chamber": "house",
        "title": "Continuing Appropriations, Agriculture, Legislative Branch, Military Construction and Veterans Affairs, and Extensions Act, 2026",
        "actedAt": "2025-11-12",
        "term": "47",
        "sourceUrl": "https://www.congress.gov/bill/119th-congress/house-bill/5371",
        "sourceLabel": "Congress.gov — H.R. 5371, 119th Congress",
        "issues": [
          {
            "issueKey": "cut_spending",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Section 120(a) provides that no federal funds may be used to initiate, carry out, implement or otherwise notice a reduction in force to reduce the number of employees within any department, agency or office of the Federal Government, and section 120(b) applies that to all civilian positions without regard to the source of their funding. Section 120(e) provides that any reduction in force taken by an Executive Agency between October 1, 2025 and enactment \"shall have no force or effect\", requires each notice to be rescinded, returns the employee to employment status as of September 30, 2025 without interruption, and directs back pay."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-11-12",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-37, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ37/html/PLAW-119publ37.htm",
            "note": "Enacted and published as Public Law 119-37, approved November 12, 2025, at 139 Stat. 495. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          },
          {
            "status": "expired",
            "effectiveAt": "2026-01-30",
            "authority": "By the terms of the Act itself",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 119-37, section 106(3), enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-119publ37/html/PLAW-119publ37.htm",
            "note": "Section 106 of division A provides that the appropriations, funds and authority granted by the Act are available until the first of three events, the last of which is the expiration date of January 30, 2026; section 120(a)'s prohibition on reductions in force runs \"during the period between the date of enactment of this Act and the date specified in section 106(3)\", so it lapsed on that date. Section 120(e) is different in kind and is not what expired: it voided the reductions in force already taken, rescinded the notices and directed back pay, and it had done so before the date above. This row is read from the Act's own text and is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "vetoed_law",
        "documentId": "H.J. Res. 46 (116th Congress)",
        "measureNumber": "H.J. Res. 46",
        "congress": 116,
        "chamber": "house",
        "title": "Relating to a national emergency declared by the President on February 15, 2019",
        "actedAt": "2019-03-15",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/116th-congress/house-joint-resolution/46",
        "sourceLabel": "Congress.gov — H.J. Res. 46, 116th Congress",
        "issues": [
          {
            "issueKey": "border_security",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 90,
            "rationale": "The direction recorded here describes the RESOLUTION, not the action taken against it: H.J. Res. 46 would have terminated the national emergency related to the U.S.-Mexico border declared on February 15, 2019, which cuts against this issue. The record engine inverts a blocking action, so the veto itself reads the other way — it kept that emergency in place."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2019-03-26",
            "authority": "The House of Representatives, on the question of passage notwithstanding the objections of the President",
            "basis": "congressional_action_record",
            "sourceLabel": "Congress.gov — H.J. Res. 46, 116th Congress, legislative action history",
            "sourceUrl": "https://www.congress.gov/bill/116th-congress/house-joint-resolution/46/all-actions",
            "note": "The resolution was returned to the House with the President's objections on March 15, 2019. On March 26, 2019 the House took up passage notwithstanding those objections and did not reach the two-thirds Article I, section 7 requires; the tally was 248 to 181. The resolution therefore never became law and the emergency it would have terminated stayed in place. This states what Congress did with the returned resolution and says nothing about any challenge to the veto or to anything the veto preserved."
          }
        ]
      },
      {
        "actionClass": "vetoed_law",
        "documentId": "S.J. Res. 7 (116th Congress)",
        "measureNumber": "S.J. Res. 7",
        "congress": 116,
        "chamber": "senate",
        "title": "A joint resolution to direct the removal of United States Armed Forces from hostilities in the Republic of Yemen that have not been authorized by Congress",
        "actedAt": "2019-04-16",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7",
        "sourceLabel": "Congress.gov — S.J. Res. 7, 116th Congress",
        "issues": [
          {
            "issueKey": "restraint",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "The direction recorded here describes the RESOLUTION, not the action taken against it. S.J. Res. 7 would have directed the removal of United States Armed Forces from hostilities in the Republic of Yemen that Congress had not authorized, which advances this issue. The record engine inverts a blocking action, so the veto reads the other way."
          },
          {
            "issueKey": "america_first_fp",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "rationale": "Same inversion applies: the direction is the resolution's. Withdrawing forces from an unauthorized foreign conflict is the ending of an open-ended commitment abroad, which is what the stated position on this issue is about, so the resolution advances it and the veto is read against it."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2019-05-02",
            "authority": "The Senate, on the question of passage notwithstanding the objections of the President",
            "basis": "congressional_action_record",
            "sourceLabel": "Congress.gov — S.J. Res. 7, 116th Congress, legislative action history",
            "sourceUrl": "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/7/all-actions",
            "note": "The resolution was returned to the Senate with the President's objections on April 16, 2019. On May 2, 2019 the Senate failed of passage over the veto, 53 to 45, short of the two-thirds Article I, section 7 requires. The resolution never became law. This states what Congress did with the returned resolution and says nothing about any challenge to the veto."
          }
        ]
      },
      {
        "actionClass": "vetoed_law",
        "documentId": "S.J. Res. 68 (116th Congress)",
        "measureNumber": "S.J. Res. 68",
        "congress": 116,
        "chamber": "senate",
        "title": "A joint resolution to direct the removal of United States Armed Forces from hostilities against the Islamic Republic of Iran that have not been authorized by Congress",
        "actedAt": "2020-05-06",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68",
        "sourceLabel": "Congress.gov — S.J. Res. 68, 116th Congress",
        "issues": [
          {
            "issueKey": "restraint",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "The direction recorded here describes the RESOLUTION, not the action taken against it. S.J. Res. 68 would have directed the removal of United States Armed Forces from hostilities against the Islamic Republic of Iran that Congress had not authorized, which advances this issue. The record engine inverts a blocking action, so the veto reads the other way."
          },
          {
            "issueKey": "america_first_fp",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "rationale": "Same inversion applies: the direction is the resolution's. This is the second document on this issue that would have closed off an unauthorized foreign engagement, thirteen months after the first, which is why it is filed rather than treated as the same decision restated."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2020-05-07",
            "authority": "The Senate, on the question of passage notwithstanding the objections of the President",
            "basis": "congressional_action_record",
            "sourceLabel": "Congress.gov — S.J. Res. 68, 116th Congress, legislative action history",
            "sourceUrl": "https://www.congress.gov/bill/116th-congress/senate-joint-resolution/68/all-actions",
            "note": "The resolution was returned to the Senate with the President's objections on May 6, 2020. On May 7, 2020 the Senate failed of passage over the veto, 49 to 44, short of the two-thirds Article I, section 7 requires. The resolution never became law. This states what Congress did with the returned resolution and says nothing about any challenge to the veto."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13765",
        "executiveOrderNumber": 13765,
        "title": "Minimizing the Economic Burden of the Patient Protection and Affordable Care Act Pending Repeal",
        "actedAt": "2017-01-20",
        "publishedAt": "2017-01-24",
        "term": "45",
        "frCitation": "82 FR 8351",
        "frDocumentNumber": "2017-01799",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/01/24/2017-01799/minimizing-the-economic-burden-of-the-patient-protection-and-affordable-care-act-pending-repeal",
        "sourceLabel": "Federal Register — Executive Order 13765, 82 FR 8351",
        "issues": [
          {
            "issueKey": "healthcare",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Section 1 states the policy of seeking the prompt repeal of the Patient Protection and Affordable Care Act, and section 2 directs the Secretary of Health and Human Services and every other agency with authority under the Act to 'waive, defer, grant exemptions from, or delay the implementation of' any provision imposing a cost, fee, tax, penalty or regulatory burden. Narrowing the reach of the coverage law is what this direction means on this issue."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-01-24",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13765 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/01/24/2017-01799/minimizing-the-economic-burden-of-the-patient-protection-and-affordable-care-act-pending-repeal",
            "note": "Signed January 20, 2017 and published January 24, 2017 at 82 FR 8351. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-28",
            "authority": "Executive Order 14009 of January 28, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13765 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/01/24/2017-01799/minimizing-the-economic-burden-of-the-patient-protection-and-affordable-care-act-pending-repeal",
            "note": "The disposition note on the register's own record for this document reads, in full: 'Revoked by: EO 14009, January 28, 2021'. The order no longer stands. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13767",
        "executiveOrderNumber": 13767,
        "title": "Border Security and Immigration Enforcement Improvements",
        "actedAt": "2017-01-25",
        "publishedAt": "2017-01-30",
        "term": "45",
        "frCitation": "82 FR 8793",
        "frDocumentNumber": "2017-02095",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/01/30/2017-02095/border-security-and-immigration-enforcement-improvements",
        "sourceLabel": "Federal Register — Executive Order 13767, 82 FR 8793",
        "issues": [
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": true,
            "weight": 95,
            "rationale": "Section 2(a) sets as the policy of the executive branch to secure the southern border 'through the immediate construction of a physical wall on the southern border, monitored and supported by adequate personnel', and section 3(e) defines that wall as a contiguous, impassable physical barrier."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-01-30",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13767 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/01/30/2017-02095/border-security-and-immigration-enforcement-improvements",
            "note": "Signed January 25, 2017 and published January 30, 2017 at 82 FR 8793. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-02-02",
            "authority": "Executive Order 14010 of February 2, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13767 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/01/30/2017-02095/border-security-and-immigration-enforcement-improvements",
            "note": "The disposition note on the register's own record for this document reads, in full: 'Revoked by: EO 14010, February 2, 2021'. The order no longer stands. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13783",
        "executiveOrderNumber": 13783,
        "title": "Promoting Energy Independence and Economic Growth",
        "actedAt": "2017-03-28",
        "publishedAt": "2017-03-31",
        "term": "45",
        "frCitation": "82 FR 16093",
        "frDocumentNumber": "2017-06576",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/03/31/2017-06576/promoting-energy-independence-and-economic-growth",
        "sourceLabel": "Federal Register — Executive Order 13783, 82 FR 16093",
        "issues": [
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Section 1(c) makes it the policy of the United States that agencies immediately review existing regulations that potentially burden the development or use of domestically produced energy resources and 'appropriately suspend, revise, or rescind those that unduly burden' that development."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 85,
            "rationale": "Section 4 directs the Administrator of the Environmental Protection Agency to take all steps necessary to review the Clean Power Plan and its related rules and guidance for consistency with section 1, and as soon as practicable to suspend, revise or rescind them if appropriate."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-03-31",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13783 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/03/31/2017-06576/promoting-energy-independence-and-economic-growth",
            "note": "Signed March 28, 2017 and published March 31, 2017 at 82 FR 16093. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-20",
            "authority": "Executive Order 13990 of January 20, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13783 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/03/31/2017-06576/promoting-energy-independence-and-economic-growth",
            "note": "The disposition note on the register's own record for this document ends: 'Revoked by: EO 13990, January 20, 2021'. The same note records that this order itself revoked Executive Order 13653 of November 1, 2013, which is the shape of the whole exchange and is why it is quoted rather than summarized. The order no longer stands. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13950",
        "executiveOrderNumber": 13950,
        "title": "Combating Race and Sex Stereotyping",
        "actedAt": "2020-09-22",
        "publishedAt": "2020-09-28",
        "term": "45",
        "frCitation": "85 FR 60683",
        "frDocumentNumber": "2020-21534",
        "sourceUrl": "https://www.federalregister.gov/documents/2020/09/28/2020-21534/combating-race-and-sex-stereotyping",
        "sourceLabel": "Federal Register — Executive Order 13950, 85 FR 60683",
        "issues": [
          {
            "issueKey": "end_dei",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "rationale": "Section 4 requires every Government contracting agency to write into each new contract a clause providing that 'the contractor shall not use any workplace training that inculcates in its employees any form of race or sex stereotyping or any form of race or sex scapegoating', and then enumerates the concepts that clause covers."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2020-09-28",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13950 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/09/28/2020-21534/combating-race-and-sex-stereotyping",
            "note": "Signed September 22, 2020 and published September 28, 2020 at 85 FR 60683. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-20",
            "authority": "Executive Order 13985 of January 20, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13950 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/09/28/2020-21534/combating-race-and-sex-stereotyping",
            "note": "The disposition note on the register's own record for this document reads: 'See: EO 11246, September 24, 1965; EO 14185, January 27, 2025' and 'Revoked by: EO 13985, January 20, 2021'. The order no longer stands. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 116-136",
        "measureNumber": "H.R. 748",
        "congress": 116,
        "chamber": "house",
        "title": "Coronavirus Aid, Relief, and Economic Security Act",
        "actedAt": "2020-03-27",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/116th-congress/house-bill/748",
        "sourceLabel": "Congress.gov — H.R. 748, 116th Congress",
        "issues": [
          {
            "issueKey": "cut_spending",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 95,
            "rationale": "Section 5001 adds a new title VI to the Social Security Act whose section 601(a)(1) provides that 'Out of any money in the Treasury of the United States not otherwise appropriated, there are appropriated for making payments to States, Tribal governments, and units of local government under this section, $150,000,000,000 for fiscal year 2020.' A direct appropriation of new federal money, quoted from the enrolled text rather than characterized from a topline."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2020-03-27",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 116-136, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-116publ136/html/PLAW-116publ136.htm",
            "note": "Enacted and published as Public Law 116-136, approved March 27, 2020, at 134 Stat. 281. Nothing on file repeals it. Individual time-limited authorities inside the Act ran on their own terms; this row is about the Act, not about any one of them, and the appropriation the mapping quotes was made on enactment. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      }
    ]
  };
})();
