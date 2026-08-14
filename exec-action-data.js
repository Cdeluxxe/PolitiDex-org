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
            "plain": "Told every agency with authority under the Affordable Care Act to waive, delay or grant exemptions from any of its requirements that impose a cost or a penalty, while repeal was pursued. That loosens the coverage law's reach without Congress changing it.",
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
            "plain": "Ordered the immediate construction of a continuous, impassable physical wall along the southern border, staffed and monitored. Building that barrier is the commitment this issue tracks.",
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
            "plain": "Ordered agencies to go back through existing rules and suspend, revise or rescind any that burden domestic energy development. Clearing regulatory obstacles is the mechanism it uses to raise output.",
            "rationale": "Section 1(c) makes it the policy of the United States that agencies immediately review existing regulations that potentially burden the development or use of domestically produced energy resources and 'appropriately suspend, revise, or rescind those that unduly burden' that development."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 85,
            "plain": "Directed the EPA to review the Clean Power Plan — the rule limiting power-plant carbon emissions — and suspend, revise or rescind it. Pulling back the main federal carbon rule cuts against this issue.",
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
        "documentId": "Executive Order 13789",
        "executiveOrderNumber": 13789,
        "title": "Identifying and Reducing Tax Regulatory Burdens",
        "actedAt": "2017-04-21",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/04/26/2017-08586/identifying-and-reducing-tax-regulatory-burdens",
        "sourceLabel": "Federal Register — Executive Order 13789, 82 FR 19317",
        "frCitation": "82 FR 19317",
        "frDocumentNumber": "2017-08586",
        "publishedAt": "2017-04-26",
        "issues": [
          {
            "issueKey": "lower_taxes",
            "direction": "advances",
            "isPrimary": true,
            "weight": 55,
            "plain": "Ordered Treasury to find the tax regulations issued since 2016 that impose an undue financial burden and to delay, modify or rescind them — a narrow touch on this issue, because it moves regulations rather than rates.",
            "rationale": "Section 2(a) directs the Secretary of the Treasury to review all significant tax regulations issued on or after January 1, 2016 and identify those that \"impose an undue financial burden on United States taxpayers,\" \"add undue complexity to the Federal tax laws,\" or \"exceed the statutory authority of the Internal Revenue Service.\" Section 2(b) directs the Secretary to recommend specific mitigating actions and to \"take appropriate steps to cause the effective date of such regulations to be delayed or suspended, to the extent permitted by law, and to modify or rescind such regulations as appropriate.\" Mapped at reduced weight because the chip is written about tax RATES and this order reaches only the regulations built on top of them; the `plain` line says so rather than borrowing the force of a rate cut."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-04-26",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13789 document record, 82 FR 19317",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/04/26/2017-08586/identifying-and-reducing-tax-regulatory-burdens",
            "note": "Signed April 21, 2017 and published April 26, 2017 at 82 FR 19317. The register’s disposition record for this document carries a single cross-reference, back to Executive Order 12866 of September 30, 1993, and no entry revoking or superseding it, so it stands as published. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13799",
        "executiveOrderNumber": 13799,
        "title": "Establishment of Presidential Advisory Commission on Election Integrity",
        "actedAt": "2017-05-11",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/05/16/2017-10003/establishment-of-presidential-advisory-commission-on-election-integrity",
        "sourceLabel": "Federal Register — Executive Order 13799, 82 FR 22389",
        "frCitation": "82 FR 22389",
        "frDocumentNumber": "2017-10003",
        "publishedAt": "2017-05-16",
        "issues": [
          {
            "issueKey": "voter_id",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Stood up a presidential commission to study how people register and cast ballots in federal elections, and to report on the weaknesses that could put ineligible people on the rolls.",
            "rationale": "Section 1 establishes the Presidential Advisory Commission on Election Integrity. Section 3 gives it the mission of studying the registration and balloting processes used in Federal elections, reporting on practices that enhance or undermine confidence in them, and reporting on the vulnerabilities in those systems and practices that could lead to improper registrations and improper ballots, including fraudulent ones. Section 4 defines both of those terms by reference to legal eligibility. It is an advisory body: it studies and reports, and section 3 gives it no power to change any State’s eligibility rules. Mapped at reduced weight and filed as a secondary reading for that reason — the chip is about requiring photo identification, and a commission charged with examining eligibility safeguards moves toward that position without imposing one."
          },
          {
            "issueKey": "election_integrity",
            "direction": "advances",
            "isPrimary": true,
            "weight": 75,
            "plain": "Made federal election security a standing White House project by creating a commission chaired by the Vice President to report on what undermines public confidence in federal elections.",
            "rationale": "Sections 1–3, above. Carried as the primary mapping because the commission the order creates is an election-integrity body by its own name and charge; the identification question below is one item inside that charge rather than the charge itself."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-05-16",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13799 document record, 82 FR 22389",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/05/16/2017-10003/establishment-of-presidential-advisory-commission-on-election-integrity",
            "note": "Signed May 11, 2017 and published May 16, 2017 at 82 FR 22389. The commission it created operated under this order for just under eight months. That period is a fact about the record and is reported separately from what ended it, which is the row below. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2018-01-03",
            "authority": "Executive Order 13820 of January 3, 2018, signed by the same President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13820, Termination of Presidential Advisory Commission on Election Integrity, 83 FR 969",
            "sourceUrl": "https://www.federalregister.gov/documents/2018/01/08/2018-00240/termination-of-presidential-advisory-commission-on-election-integrity",
            "note": "This document's own register record carries no “Revoked by:” entry — the reciprocal note sits on the revoking order, whose disposition record reads, in full: “Revokes: EO 13799, May 11, 2017”. The operative text is section 1 of Executive Order 13820: “Executive Order 13799 of May 11, 2017 (Establishment of Presidential Advisory Commission on Election Integrity), is hereby revoked, and the Presidential Advisory Commission on Election Integrity is accordingly terminated.” Both were read from Executive Order 13820’s own record. Revocation is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it. The terminating order states no position of its own, which is why it is recorded here as standing and is not filed as an instrument with a direction of its own."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13813",
        "executiveOrderNumber": 13813,
        "title": "Promoting Healthcare Choice and Competition Across the United States",
        "actedAt": "2017-10-12",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2017/10/17/2017-22677/promoting-healthcare-choice-and-competition-across-the-united-states",
        "sourceLabel": "Federal Register — Executive Order 13813, 82 FR 48385",
        "frCitation": "82 FR 48385",
        "frDocumentNumber": "2017-22677",
        "publishedAt": "2017-10-17",
        "issues": [
          {
            "issueKey": "healthcare_costs",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Ordered Labor, Treasury and HHS to widen three cheaper alternatives to Affordable Care Act plans — association health plans, short-term policies and health reimbursement arrangements — on the stated ground that exchange premiums had roughly doubled since 2013.",
            "rationale": "Section 1(a) states the policy of facilitating \"a healthcare system that provides high-quality care at affordable prices\" and finds that the average exchange premium in the 39 healthcare.gov States \"is more than double the average overall individual market premium recorded in 2013.\" Section 1(b) names association health plans, short-term limited-duration insurance and health reimbursement arrangements as the three near-term priorities. Sections 2, 3 and 4 direct the Secretaries of Labor, the Treasury and Health and Human Services to consider rulemaking expanding each. Mapped to the price chip rather than to the coverage chip because the order’s own stated mechanism is cost."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-10-17",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13813 document record, 82 FR 48385",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/10/17/2017-22677/promoting-healthcare-choice-and-competition-across-the-united-states",
            "note": "Signed October 12, 2017 and published October 17, 2017 at 82 FR 48385. Unrevoked as of that date on the register’s own disposition record. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-28",
            "authority": "Executive Order 14009 of January 28, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13813 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2017/10/17/2017-22677/promoting-healthcare-choice-and-competition-across-the-united-states",
            "note": "The disposition note on the register’s own record for this document reads, in full: \"Revoked by: EO 14009, January 28, 2021.\" The order no longer stands. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          }
        ]
      },
      {
        "actionClass": "signed_law",
        "documentId": "Public Law 115-97",
        "measureNumber": "H.R. 1",
        "congress": 115,
        "chamber": "house",
        "title": "To provide for reconciliation pursuant to titles II and V of the concurrent resolution on the budget for fiscal year 2018",
        "actedAt": "2017-12-22",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/115th-congress/house-bill/1",
        "sourceLabel": "Congress.gov — H.R. 1, 115th Congress",
        "issues": [
          {
            "issueKey": "lower_taxes",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "circularWithStance": true,
            "circularNote": "Declared, not matched. The only lower_taxes stance card on file reads \"Signed the 2017 Tax Cuts and Jobs Act and backs extending the individual and pass-through cuts,\" with an evidence line of \"Signed Tax Cuts and Jobs Act (2017).\" That card is a narration of THIS law, so this law cannot test it — but the mechanical guard in consistency.js#execCircular would not have caught it, because the card names the act by a popular short title that the enrolled text does not carry and that therefore appears in none of this row’s identifiers. The flag is set by hand for that reason. The row still ships: it is real, sourced record and the lane renders it. It simply cannot be scored, and it is not counted in this issue’s scored depth.",
            "plain": "Signed the 2017 law cutting individual income-tax rates through 2025 and cutting the corporate rate to 21 percent.",
            "rationale": "Section 11001 adds Internal Revenue Code section 1(j), setting reduced individual rate tables for taxable years beginning after December 31, 2017 and before January 1, 2026; title I also reduces the corporate rate to 21 percent. Verified against GPO’s published enrolled text, PLAW-115publ97, approved December 22, 2017."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2017-12-22",
            "authority": "Passed by Congress and signed by the President",
            "basis": "enacted_law_published",
            "sourceLabel": "GovInfo — Public Law 115-97, enrolled text as published by GPO",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-115publ97/html/PLAW-115publ97.htm",
            "note": "Enacted and published as Public Law 115-97, approved December 22, 2017. Nothing on file repeals it. Read the limit precisely: several of its individual-side provisions were written to expire after 2025 and were later made permanent by Public Law 119-21, which is a separate row in this record. This states that the law exists and stands as published; it is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13839",
        "executiveOrderNumber": 13839,
        "title": "Promoting Accountability and Streamlining Removal Procedures Consistent With Merit System Principles",
        "actedAt": "2018-05-25",
        "publishedAt": "2018-06-01",
        "term": "45",
        "frCitation": "83 FR 25343",
        "frDocumentNumber": "2018-11939",
        "sourceUrl": "https://www.federalregister.gov/documents/2018/06/01/2018-11939/promoting-accountability-and-streamlining-removal-procedures-consistent-with-merit-system-principles",
        "sourceLabel": "Federal Register — Executive Order 13839, 83 FR 25343",
        "issues": [
          {
            "issueKey": "civil_service_control",
            "direction": "advances",
            "isPrimary": true,
            "weight": 75,
            "plain": "Barred agencies from agreeing to progressive-discipline steps or grievance rights before removing a career employee, and held the period to fix performance to 30 days. It moves control over firings from negotiated procedure to the agency head.",
            "rationale": "Section 2 sets the principles: agencies should limit the opportunity period to demonstrate acceptable performance under 5 U.S.C. 4302(c)(6) to the time that provides sufficient opportunity, supervisors and deciding officials should not be required to use progressive discipline, and agencies should not require suspension of an employee before proposing to remove that employee. Section 4 then makes those principles binding: no agency shall make an agreement, including a collective bargaining agreement, that limits its discretion to employ chapter 75 procedures to address unacceptable performance, that requires chapter 43 procedures before removing an employee for unacceptable performance, or that limits its discretion to remove an employee from Federal service without first engaging in progressive discipline, and section 4(c) holds the demonstration period to 30 days except where the agency determines in its sole and exclusive discretion that longer is necessary. Section 3 directs agency heads to endeavor to exclude from grievance procedures negotiated under 5 U.S.C. 7121 any dispute concerning decisions to remove an employee from Federal service. The instrument narrows the adverse-action protections attached to career executive-branch employees, which is what this key records."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2018-06-01",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13839 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2018/06/01/2018-11939/promoting-accountability-and-streamlining-removal-procedures-consistent-with-merit-system-principles",
            "note": "Signed May 25, 2018 and published June 1, 2018 at 83 FR 25343. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-22",
            "authority": "Executive Order 14003 of January 22, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13839 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2018/06/01/2018-11939/promoting-accountability-and-streamlining-removal-procedures-consistent-with-merit-system-principles",
            "note": "The disposition note on the register's own record for this document reads, in full: 'Revoked by: EO 14003 of January 22, 2021'. The order no longer stands, and the register records no later reinstatement of it — which is the whole difference between this document and Executive Order 13957, whose record carries one, and the reason the two first-term orders in this wave are filed with opposite current standings. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
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
            "plain": "Vetoed the resolution that would have terminated the February 2019 border national emergency, keeping the emergency — and the authorities it opened for barrier construction — in place.",
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
            "plain": "Vetoed the resolution directing the withdrawal of U.S. forces from the Yemen conflict, which Congress had never authorized. Blocking it kept those forces committed.",
            "rationale": "The direction recorded here describes the RESOLUTION, not the action taken against it. S.J. Res. 7 would have directed the removal of United States Armed Forces from hostilities in the Republic of Yemen that Congress had not authorized, which advances this issue. The record engine inverts a blocking action, so the veto reads the other way."
          },
          {
            "issueKey": "war_powers",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "plain": "The blocked resolution would have required congressional authorization for the forces committed to that conflict; the veto left them there without it.",
            "rationale": "Re-keyed from america_first_fp in the August 2026 taxonomy split: this row was always about who authorizes the use of force, not about what the United States funds abroad, and the narrowed america_first_fp key covers aid and commitments only. Same inversion as the restraint row above — the direction is the resolution’s. A resolution directing removal of forces from hostilities Congress had not authorized advances the claim that Congress must authorize them, so the veto is read against it."
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
        "actionClass": "executive_order",
        "documentId": "Executive Order 13877",
        "executiveOrderNumber": 13877,
        "title": "Improving Price and Quality Transparency in American Healthcare To Put Patients First",
        "actedAt": "2019-06-24",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2019/06/27/2019-13945/improving-price-and-quality-transparency-in-american-healthcare-to-put-patients-first",
        "sourceLabel": "Federal Register — Executive Order 13877, 84 FR 30849",
        "frCitation": "84 FR 30849",
        "frDocumentNumber": "2019-13945",
        "publishedAt": "2019-06-27",
        "issues": [
          {
            "issueKey": "healthcare_costs",
            "direction": "advances",
            "isPrimary": true,
            "weight": 80,
            "circularWithStance": true,
            "circularNote": "Declared, not matched. The healthcare_costs stance card on file is built entirely from remarks he gave on health-care price transparency on June 24, 2019 — the day he signed this order, at the event where he signed it. The card quotes the words and cites the Public Papers, and it names no document, so neither the identifier matcher nor an evidence-line check would fire; but the word and the deed here are the same event, and a document cannot test a card that is a transcript of its own signing ceremony. Flagged by hand for that reason. The row ships as record and is not counted in this issue’s scored depth.",
            "plain": "Ordered hospitals to publish the prices they actually negotiate rather than list rates, and told agencies to write rules giving patients an out-of-pocket estimate before they receive care.",
            "rationale": "Section 3 directs the Secretary of Health and Human Services to propose a rule requiring hospitals to publish \"standard charge information, including charges and information based on negotiated rates and for common or shoppable items and services, in an easy-to-understand, consumer-friendly, and machine-readable format.\" Section 4 directs the Secretaries of Health and Human Services, the Treasury and Labor to propose a rule requiring providers and insurers to give patients expected out-of-pocket cost information before care."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2019-06-27",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13877 document record, 84 FR 30849",
            "sourceUrl": "https://www.federalregister.gov/documents/2019/06/27/2019-13945/improving-price-and-quality-transparency-in-american-healthcare-to-put-patients-first",
            "note": "Signed June 24, 2019 and published June 27, 2019 at 84 FR 30849. The register’s disposition record for this document carries a single cross-reference, back to Executive Order 13813 of October 12, 2017, and no entry revoking or superseding it, so it stands as published. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
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
            "plain": "Signed the CARES Act, whose section 601 appropriates $150 billion in new federal money for state, tribal and local governments alone. Enacting an appropriation of that size runs against a record of cutting spending.",
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
            "plain": "Vetoed the resolution directing withdrawal of U.S. forces from hostilities with Iran that Congress had not authorized, leaving that engagement in place.",
            "rationale": "The direction recorded here describes the RESOLUTION, not the action taken against it. S.J. Res. 68 would have directed the removal of United States Armed Forces from hostilities against the Islamic Republic of Iran that Congress had not authorized, which advances this issue. The record engine inverts a blocking action, so the veto reads the other way."
          },
          {
            "issueKey": "war_powers",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "plain": "A second resolution asserting that this engagement lacked congressional authorization was blocked thirteen months after the first, leaving that question unanswered.",
            "rationale": "Re-keyed from america_first_fp in the August 2026 taxonomy split, on the same reasoning as S.J. Res. 7: the claim under test is who authorizes hostilities, which the narrowed america_first_fp key no longer covers. The direction is the resolution’s and the veto is read against it. Filed separately from S.J. Res. 7 because it concerns a different country and has its own returned-resolution history."
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
        "actionClass": "directive",
        "documentId": "Presidential Memorandum, 85 FR 49587",
        "title": "Deferring Payroll Tax Obligations in Light of the Ongoing COVID-19 Disaster",
        "actedAt": "2020-08-08",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2020/08/13/2020-17899/deferring-payroll-tax-obligations-in-light-of-the-ongoing-covid-19-disaster",
        "sourceLabel": "Federal Register — Presidential Memorandum of August 8, 2020, 85 FR 49587",
        "frCitation": "85 FR 49587",
        "frDocumentNumber": "2020-17899",
        "publishedAt": "2020-08-13",
        "status": [
          {
            "status": "expired",
            "effectiveAt": "2020-12-31",
            "authority": "By the terms of the memorandum itself, section 2",
            "basis": "register_continuation",
            "sourceLabel": "Federal Register — Presidential Memorandum of August 8, 2020, 85 FR 49587, section 2",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/08/13/2020-17899/deferring-payroll-tax-obligations-in-light-of-the-ongoing-covid-19-disaster",
            "note": "Section 2 of the memorandum directs the Secretary of the Treasury to defer the withholding, deposit and payment of the tax imposed by 26 U.S.C. 3101(a) \"on wages or compensation, as applicable, paid during the period of September 1, 2020, through December 31, 2020\" — an end date the document sets for itself. The register carries no continuation and no later instrument extending that window, so the deferral authority ran out on the date named rather than being revoked. This row reads the memorandum's own timetable and the absence of any register entry extending it; it says nothing about any challenge to the memorandum, and it is not a statement about whether the deferred tax was ever forgiven, which section 4 left to Congress and Congress did not do."
          }
        ],
        "issues": [
          {
            "issueKey": "lower_taxes",
            "direction": "advances",
            "isPrimary": true,
            "weight": 50,
            "plain": "Directed Treasury to defer — not forgive — the employee share of Social Security payroll tax for lower-paid workers for the last four months of 2020, and to explore legislation wiping out the deferred amount.",
            "rationale": "Section 2 directs the Secretary of the Treasury to use the authority of 26 U.S.C. 7508A to defer withholding, deposit and payment of the tax imposed by 26 U.S.C. 3101(a) on wages paid September 1 through December 31, 2020 for employees generally earning less than $4,000 per biweekly pay period; section 4 directs the Secretary to \"explore avenues, including legislation, to eliminate the obligation to pay the taxes deferred.\" Mapped at reduced weight and described in `plain` as a deferral because that is what it is — the obligation was postponed by executive action, not cut, and only Congress could have eliminated it."
          },
          {
            "issueKey": "tax_middle_class",
            "direction": "advances",
            "isPrimary": false,
            "weight": 50,
            "plain": "Aimed the deferral at workers earning under roughly $104,000 annually, so the relief it delivered was bounded to middle- and lower-income paychecks.",
            "rationale": "Section 2 limits the deferral to employees \"generally less than $4,000 during a bi-weekly pay period, or the equivalent threshold amount with respect to other pay periods,\" which is the income bound that makes this a household-side mapping rather than a general rate mapping. Weighted level with the lower_taxes mapping rather than above it: the income bound is what makes this a household-side reading, but it is the same single act of deferral, and the primary mapping is the one that names the mechanism."
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
            "plain": "Required a clause in every new federal contract barring workplace training that teaches race or sex stereotyping, and listed the concepts that clause covers. It uses contracting terms to reach training inside private employers.",
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
        "actionClass": "executive_order",
        "documentId": "Executive Order 13951",
        "executiveOrderNumber": 13951,
        "title": "An America-First Healthcare Plan",
        "actedAt": "2020-09-24",
        "term": "45",
        "sourceUrl": "https://www.federalregister.gov/documents/2020/10/01/2020-21914/an-america-first-healthcare-plan",
        "sourceLabel": "Federal Register — Executive Order 13951, 85 FR 62179",
        "frCitation": "85 FR 62179",
        "frDocumentNumber": "2020-21914",
        "publishedAt": "2020-10-01",
        "issues": [
          {
            "issueKey": "healthcare_costs",
            "direction": "advances",
            "isPrimary": true,
            "weight": 85,
            "plain": "Set a deadline for ending surprise medical bills — telling HHS to reach a deal with Congress by the end of 2020 and to act administratively if Congress did not — and ordered hospital billing conduct published on Medicare’s comparison site.",
            "rationale": "Section 4 is titled \"Lowering Healthcare Costs for Americans.\" Section 4(b)(i) directs the Secretary of Health and Human Services to \"work with the Congress to reach a legislative solution by December 31, 2020\" on surprise billing; 4(b)(ii) directs administrative action \"in the event a legislative solution is not reached\" to prevent a patient receiving a bill for unforeseeable out-of-pocket expenses; 4(b)(iii) directs the Medicare.gov Hospital Compare site to be updated within 180 days to show whether a hospital complies with the Hospital Price Transparency Final Rule, whether it issues itemized discharge receipts, and how often it sues patients, garnishes wages or places liens on homes. Section 4(a) directs expanded access to affordable medicines."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2020-10-01",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13951 document record, 85 FR 62179",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/10/01/2020-21914/an-america-first-healthcare-plan",
            "note": "Signed September 24, 2020 and published October 1, 2020 at 85 FR 62179. The register’s disposition record for this document carries twelve cross-references to other health orders of the same term and no entry revoking or superseding it, so it stands as published on that record. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 13957",
        "executiveOrderNumber": 13957,
        "title": "Creating Schedule F in the Excepted Service",
        "actedAt": "2020-10-21",
        "publishedAt": "2020-10-26",
        "term": "45",
        "frCitation": "85 FR 67631",
        "frDocumentNumber": "2020-23780",
        "sourceUrl": "https://www.federalregister.gov/documents/2020/10/26/2020-23780/creating-schedule-f-in-the-excepted-service",
        "sourceLabel": "Federal Register — Executive Order 13957, 85 FR 67631",
        "issues": [
          {
            "issueKey": "civil_service_control",
            "direction": "advances",
            "isPrimary": true,
            "weight": 95,
            "plain": "Created Schedule F, moving career federal jobs that shape policy into the excepted service and switching off the civil-service hiring and removal rules for them. Making those posts removable at will is what this issue is about.",
            "rationale": "Section 3 directs that appointments to positions of a confidential, policy-determining, policy-making or policy-advocating character that are not normally subject to change as a result of a Presidential transition shall be made under Schedule F of the excepted service. Section 4(a)(i) amends 5 CFR 6.2 to add that schedule to the list of positions OPM excepts from the competitive service, defining it as 'Positions of a confidential, policy-determining, policy-making, or policy-advocating character not normally subject to change as a result of a Presidential transition'. Section 4(a)(ii) amends 5 CFR 6.4 to read that, except as required by statute, 'the Civil Service Rules and Regulations shall not apply to removals from positions listed in Schedules A, C, D, E, or F'. Section 1 states the finding it rests on: that conditions of good administration make necessary an exception to the competitive hiring rules and examinations for career positions of that character, and similarly make necessary excepting such positions from the adverse action procedures set forth in chapter 75 of title 5. Creating an excepted category for career policy-influencing positions and detaching the removal rules from it is the mechanism this key exists to record."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2020-10-26",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13957 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/10/26/2020-23780/creating-schedule-f-in-the-excepted-service",
            "note": "Signed October 21, 2020 and published October 26, 2020 at 85 FR 67631. Unrevoked as of that date on the register's own disposition record. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "rescinded",
            "effectiveAt": "2021-01-22",
            "authority": "Executive Order 14003 of January 22, 2021, signed by the succeeding President",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13957 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/10/26/2020-23780/creating-schedule-f-in-the-excepted-service",
            "note": "The first line of the disposition note on the register's own record for this document reads: 'Revoked by: EO 14003, January 22, 2021'. Ninety-three days after it was published the order no longer stood, and for the four years that followed this was where its history ended. It is filed as its own row rather than folded into the row after it because a standing that was later undone still happened, and the append-only log is what makes that visible. Revocation by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it."
          },
          {
            "status": "in_force",
            "effectiveAt": "2025-01-20",
            "authority": "Executive Order 14171 of January 20, 2025, which reinstated it with full force and effect",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 13957 document record, disposition notes",
            "sourceUrl": "https://www.federalregister.gov/documents/2020/10/26/2020-23780/creating-schedule-f-in-the-excepted-service",
            "note": "THE CURRENT STANDING. The disposition note on the register's own record for this document carries three lines: 'Revoked by: EO 14003, January 22, 2021', 'Reinstated by: EO 14171, January 20, 2025' and 'Amended by: EO 14171, January 21, 2025; EO 14410, June 3, 2026'. Section 2 of Executive Order 14171 reads that this order 'is hereby immediately reinstated with full force and effect, subject to the amendments described in section 3 of this order; provided that the date of this order shall be treated as the date of Executive Order 13957'. A first-term order struck out by the succeeding President and restored on the first day of the next term is the reason the term filter exists, and it is the reason this document was worth an issue key. READ THE LIMIT: reinstatement by a later President is a presidential act, so this row is not a statement about any challenge to the order and no court is claimed to have reached it. There is litigation over this policy and it is disclosed where it belongs — the union's amended complaint names the 2025 order and the 2026 order as the instruments it asks the court to hold unlawful, and it recites this document as history, so the challenged standing sits on those two rows and not on this one."
          }
        ]
      },
      {
        "actionClass": "vetoed_law",
        "documentId": "H.R. 6395 (116th Congress)",
        "measureNumber": "H.R. 6395",
        "congress": 116,
        "chamber": "house",
        "title": "William M. (Mac) Thornberry National Defense Authorization Act for Fiscal Year 2021",
        "actedAt": "2020-12-23",
        "term": "45",
        "sourceUrl": "https://www.congress.gov/bill/116th-congress/house-bill/6395",
        "sourceLabel": "Congress.gov — H.R. 6395, 116th Congress",
        "issues": [
          {
            "issueKey": "america_first",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "plain": "Vetoed the annual defense authorization, returning the Pentagon's funding levels and troop strengths to the House unsigned rather than enacting them.",
            "rationale": "The direction recorded here describes the MEASURE, not the action taken against it. H.R. 6395 is the annual defense authorization: its long title is 'An Act to authorize appropriations for fiscal year 2021 for military activities of the Department of Defense, for military construction, and for defense activities of the Department of Energy, to prescribe military personnel strengths for such fiscal year, and for other purposes'. Funding and manning the armed forces at the level the Department asked for is what the stated position's commitment to the military is about, so the measure advances this issue. The record engine inverts a blocking action, so the veto itself reads the other way — it returned that authorization to the House without approval."
          }
        ],
        "status": [
          {
            "status": "overridden",
            "effectiveAt": "2020-12-28",
            "authority": "The House of Representatives, on the question of passage, the objections of the President to the contrary notwithstanding",
            "basis": "congressional_action_record",
            "sourceLabel": "Clerk of the House — electronic record for Roll No. 253 of 2020, 116th Congress, 2nd session",
            "sourceUrl": "https://clerk.house.gov/evs/2020/roll253.xml",
            "note": "THE FIRST OF THE TWO CHAMBERS, filed as its own row so the override is not presented as a single event. The Clerk's record for December 28, 2020 gives the question as 'On Passage, Objections of the President to the Contrary Notwithstanding', the measure as H R 6395 and the result as 'Passed', with 322 in favour and 87 against — past the two-thirds threshold Article I, section 7 sets. On its own this makes no law: a measure returned without approval needs both chambers, and the row after it is where the second one acts. This states what the House did with the returned bill and says nothing about any challenge to the veto or to the measure."
          },
          {
            "status": "overridden",
            "effectiveAt": "2021-01-01",
            "authority": "The Senate, completing reconsideration under Article I, section 7, and the measure's approval as Public Law 116-283",
            "basis": "congressional_action_record",
            "sourceLabel": "GovInfo — Public Law 116-283, enrolled text as published by GPO, 134 Stat. 3388 (reconsideration resolutions at 134 Stat. 4868)",
            "sourceUrl": "https://www.govinfo.gov/content/pkg/PLAW-116publ283/html/PLAW-116publ283.htm",
            "note": "THE CURRENT STANDING, AND THE WHOLE POINT OF THE TOKEN: THE VETO DID NOT HOLD. The bill was returned to the House without approval on December 23, 2020; the House reconsidered it on December 28 and the Senate on January 1, and the enrolled text prints both resolutions — 'Resolved, That the said bill do pass, two-thirds of the House of Representatives agreeing to pass the same' and 'Resolved, That the said bill do pass, two-thirds of the Senators present having agreed to pass the same'. Its LEGISLATIVE HISTORY block names the December 23 veto message, the December 28 House reconsideration and the January 1 Senate reconsideration. The measure became Public Law 116-283, approved January 1, 2021, at 134 Stat. 3388. One document is cited here rather than two because this one establishes both facts the standing rests on — that the Senate acted and that the measure became law; the Senate's own record of the question is named in _verificationPass.wave9. READ THIS EXACTLY AS NARROWLY AS IT IS WRITTEN. It states what Congress did with the returned bill and what became of the measure. It is not a court holding anything unlawful, it is not a judgment about the Act or about the reasons the veto gave, and it is not a win or a loss on the subject of the Act — Axis A already reports the direction of the act, and this axis reports only what became of it. It says nothing about any challenge to the measure."
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
            "plain": "Directed the Secretary of State to bring the Department's policies, programs, personnel and operations into line with putting American interests first. It sets the doctrine as an operating instruction, not a statement.",
            "rationale": "Section 1 provides that from that day forward the foreign policy of the United States shall champion core American interests and always put America and American citizens first; section 2 directs the Secretary of State to issue guidance bringing the Department's policies, programs, personnel and operations in line with it."
          },
          {
            "issueKey": "america_first_fp",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Applies the America-First test to the State Department as a whole — the frame the same-day foreign-aid order then carries out on one program.",
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
            "plain": "Ordered federal diversity, equity and inclusion offices, positions, programs, grants and contracts shut down across the executive branch.",
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
            "plain": "Directed Interior, Agriculture, Energy and Commerce to speed permitting and leasing in Alaska and reopen federal acreage there to resource development.",
            "rationale": "Directs the Secretaries of the Interior, Agriculture, Energy and Commerce to expedite permitting and leasing for energy and natural-resource projects in Alaska and to reopen federal acreage there to development."
          },
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Tells agencies to prioritize developing Alaska's liquefied natural gas, including moving it to other states and to allied nations — added supply is the point.",
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
            "plain": "Directed agencies to expedite oil, gas and mineral permitting and leasing and to strip out rules that slow domestic production.",
            "rationale": "Directs agencies to expedite oil, gas and mineral permitting and leasing and to remove regulatory barriers to domestic energy production.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order by title — \"Signed the 'Unleashing American Energy' and 'National Energy Emergency' executive orders\". The issue is tested instead by Public Law 119-21, which that card does not name."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "plain": "Revoked the previous administration's climate executive orders, including the ones setting federal emissions and clean-energy direction.",
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
            "plain": "Declared a national energy emergency so agencies can use emergency powers to fast-track production, transport, refining and generation.",
            "rationale": "Declares a national energy emergency and directs agencies to use emergency authorities to expedite domestic energy production, transportation, refining and generation.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue cites this order by title and opens by narrating it — \"Declared a national energy emergency at the start of his second term\". The issue is tested instead by Public Law 119-21, which that card does not name."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Puts Clean Water Act and Endangered Species Act reviews for energy projects on federal land and water onto emergency timelines.",
            "rationale": "Sections 4 and 5 direct emergency Clean Water Act and Rivers and Harbors Act permitting by the Army Corps of Engineers and emergency Endangered Species Act consultation procedures for energy projects on federal land and water."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "plain": "The emergency's own definition of energy lists oil, gas, coal, uranium, hydropower and critical minerals but leaves out wind and solar, so the fast-track procedures are unavailable to them.",
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
          },
          {
            "status": "challenged_unverified",
            "effectiveAt": "2026-06-04",
            "authority": "Challenge pending — U.S. District Court for the Western District of Washington (State of Washington v. Trump, No. 2:25-cv-00869-JNW)",
            "basis": "pending_litigation",
            "sourceLabel": "W.D. Wash. — State of Washington v. Trump, No. 2:25-cv-00869-JNW, Defendants' Reply in Support of Their Motion to Dismiss (ECF 101, filed June 4, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.wawd.348016/gov.uscourts.wawd.348016.101.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/70238539/state-of-washington-v-trump/",
            "note": "THE CURRENT STANDING. The token does not move; what moves is the date on which it was last checked, and for a coverage token that date IS the substantive claim — the row asserts the state of our file, so a file checked in January cannot speak for July. Re-read in this pass: the case is live and the dispositive motion is fully briefed and undecided. The document cited here is the defendants' reply in support of their own motion to dismiss under Rules 12(b)(1) and 12(b)(6), noted for June 4, 2026, arguing that the plaintiff States lack standing, that their claims could only be ripe in a challenge to a particular project, and that no final agency action exists. Every signed order on the docket through ECF 123 of July 30, 2026 is procedural — leave to appear, amicus leave, deadline stipulations, and a stay during a lapse of appropriations. So the position is unchanged and stated the same way: no court has stopped this order and no court has upheld it. The absence of a ruling is what this pass searched for and did not find, which is not a guarantee that none exists."
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
            "plain": "Directed Homeland Security to prioritize removals, restore the programs that deputize state and local officers for interior enforcement, and expand detention while removals are pending.",
            "rationale": "Directs the Department of Homeland Security to prioritize removal of those present without authorization, to restore programs enlisting State and local officers in interior enforcement, and to expand detention capacity pending removal."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Builds out the detention and expedited-removal machinery behind the border regime, so people apprehended are held rather than released inland.",
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
            "plain": "Ordered immediate written notice of U.S. withdrawal from the Paris Agreement and from other commitments made under the UN climate convention.",
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
            "plain": "Directed the Attorney General to seek the federal death penalty for capital crimes, and specifically for the murder of a law-enforcement officer and for capital crimes by people in the country unlawfully.",
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
            "plain": "Ordered barrier construction restarted, personnel and detection technology deployed to hold operational control of the southern border, and apprehended crossers detained rather than released.",
            "rationale": "Directs resumption of physical barrier construction along the southern border, deployment of personnel and detection technology to maintain operational control of it, and detention rather than release of those apprehended crossing it."
          },
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Directs removal of apprehended entrants and ends the practices that released them into the interior while their cases were pending.",
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
            "plain": "Froze new foreign-aid obligations and payments pending review, and set the rule that no assistance goes out unless it is fully aligned with the President's foreign policy.",
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
        "documentId": "Executive Order 14171",
        "executiveOrderNumber": 14171,
        "title": "Restoring Accountability to Policy-Influencing Positions Within the Federal Workforce",
        "actedAt": "2025-01-20",
        "publishedAt": "2025-01-31",
        "term": "47",
        "frCitation": "90 FR 8625",
        "frDocumentNumber": "2025-02095",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02095/restoring-accountability-to-policy-influencing-positions-within-the-federal-workforce",
        "sourceLabel": "Federal Register — Executive Order 14171, 90 FR 8625",
        "issues": [
          {
            "issueKey": "civil_service_control",
            "direction": "advances",
            "isPrimary": true,
            "weight": 100,
            "plain": "Reinstated Schedule F under the name Schedule Policy/Career and added that employees in those jobs must faithfully implement administration policy, with failure to do so grounds for dismissal. This is the order that put the category back.",
            "rationale": "Section 2 reinstates Executive Order 13957 'immediately ... with full force and effect' and provides that the date of this order shall be treated as the date of that one. Section 3 amends it: subsection (a) replaces the letter 'F' throughout, where used to designate an excepted service schedule, with the words 'Policy/Career'; subsection (b)(ii) inserts the words 'competitive service and the' immediately before the words 'adverse action procedures', so the finding of necessity reaches both; subsection (c) narrows the schedule's definition to 'Career positions'; and subsection (f)(ii) adds a new section 6(b) providing that employees in or applicants for Schedule Policy/Career positions 'are required to faithfully implement administration policies to the best of their ability' and that 'Failure to do so is grounds for dismissal'. Section 4 directs the Director of the Office of Personnel Management to amend the Civil Service Regulations to rescind the changes made by the final rule of April 9, 2024, 89 Fed. Reg. 24982, that impede the purposes of Executive Order 13957, and holds 5 CFR part 302 subpart F and 5 CFR 210.102(b)(3) and (4) inoperative until that is done. Section 6 revokes Executive Order 14003, the order that had revoked Executive Order 13957. It carries the heaviest weight under this key because it is the instrument that put the category back."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-01-31",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14171 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/01/31/2025-02095/restoring-accountability-to-policy-influencing-positions-within-the-federal-workforce",
            "note": "Signed January 20, 2025 and published January 31, 2025 at 90 FR 8625. The disposition note on the register's own record for this document reads 'Reinstates: EO 13957, October 21, 2020', 'Revokes: EO 14003, January 22, 2021' and 'Amended by: EO 14410, June 3, 2026' — it has not been revoked or superseded by any later presidential action. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "challenged_unverified",
            "effectiveAt": "2026-06-17",
            "authority": "Challenge pending — U.S. District Court for the District of Columbia (National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC)",
            "basis": "pending_litigation",
            "sourceLabel": "D.D.C. — National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC, Amended Complaint for Declaratory and Injunctive Relief (ECF 30, filed June 17, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.dcd.276604/gov.uscourts.dcd.276604.30.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69560537/national-treasury-employees-union-v-trump/",
            "note": "THE CURRENT STANDING, and it is a statement about this file rather than about the order. The amended complaint was read in full in this pass. Its opening paragraph names this document — 'Exec. Order No. 14, 171, Restoring Accountability to Policy-Influencing Positions Within the Federal Workforce (Policy/Career Order) (90 Fed. Reg. 8625) (Jan. 31, 2025)' — and Counts 1 and 2 ask the court to hold that 'the initial Policy/Career Order and the Implementing Policy/Career Order' unlawful and ultra vires, on the grounds that they exceed the authority 5 U.S.C. 3302 gives the President and that they strip accrued and vested rights. The docket was opened on January 20, 2025, the day the order was signed; it is not terminated; its newest entry when read here was dated August 6, 2026; and it carries no ruling on this order — no preliminary injunction, no judgment, nothing beyond the pleadings and scheduling. A search of published opinions for this order and for Schedule Policy/Career returned no ruling either. So no court has stopped this order and no court has upheld it, and 'in force' would assert the second of those. Dated to the operative amended complaint, the document actually read, rather than to the docket's opening date. The absence of a ruling is what this pass searched for and did not find, which is not a guarantee that none exists."
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
            "plain": "Directed every agency head to pursue actions lowering the cost of housing, health care, food and energy, and to report progress to the President's economic adviser every thirty days.",
            "counts": "A standing instruction to every agency aimed at the four categories this issue is about — housing, health care, food and energy.",
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
            "plain": "Directed Commerce, Treasury and the Trade Representative to investigate persistent goods trade deficits and recommend remedies, including a global supplemental tariff and a new service to collect duties.",
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
            "plain": "Declared a national emergency at the southern border and ordered armed-forces units there to support the Homeland Security mission.",
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
            "plain": "Revoked the 1965 order requiring affirmative action by federal contractors and directed agencies to end federal preference programs.",
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
          },
          {
            "status": "partly_blocked",
            "effectiveAt": "2025-02-21",
            "authority": "U.S. District Court for the District of Maryland (Judge Adam B. Abelson)",
            "basis": "court_ruling",
            "sourceLabel": "D. Md. — National Association of Diversity Officers in Higher Education v. Trump, No. 1:25-cv-00333-ABA, Preliminary Injunction of Feb. 21, 2025 (ECF 45)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.45.0_5.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "BACKFILL — the first standing this order held, appended behind the current one. 'The Motion is GRANTED IN PART and DENIED IN PART.' Two provisions of this order were reached: Section 3(b)(iv), which the court calls the Certification Provision and which requires every contract and grant award to carry a term certifying that the counterparty operates no programs promoting DEI that violate Federal anti-discrimination law, and Section 4(b)(iii), the Enforcement Threat Provision, which directs a strategic enforcement plan under which each agency identifies up to nine potential civil compliance investigations. The Enjoined Parties — 'Defendants other than the President' and those in active concert with them — were ordered not to require any certification under the first or bring any enforcement action under the second. Partly blocked and not blocked: two provisions were enjoined and the rest of the order was not, and the President himself was not enjoined. Read from the injunction order itself (ECF 45), not from the accompanying memorandum opinion. The same order also enjoined a provision of EO 14151, which is that order's row and not this one's."
          },
          {
            "status": "in_force",
            "effectiveAt": "2025-03-14",
            "authority": "U.S. Court of Appeals for the Fourth Circuit",
            "basis": "court_ruling",
            "sourceLabel": "Fourth Circuit — National Association of Diversity Officers in Higher Education v. Trump, No. 25-1189, Order of Mar. 14, 2025 granting a stay pending appeal (D. Md. ECF 73)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.73.0_2.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "BACKFILL — 'we grant the government's motion for a stay of the preliminary injunction'. The injunction stopped operating as to this order's two provisions along with everything else it covered, so the order was operative again. A STAY IS NOT A MERITS RULING and this row claims nothing beyond the operation of the order: the same order set an expedited briefing schedule and the appeal stayed pending until February 6, 2026."
          },
          {
            "status": "in_force",
            "effectiveAt": "2026-02-06",
            "authority": "U.S. Court of Appeals for the Fourth Circuit",
            "basis": "court_ruling",
            "sourceLabel": "Fourth Circuit — National Association of Diversity Officers in Higher Education v. Trump, No. 25-1189 (published opinion, Feb. 6, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/pdf/2026/02/06/natl._assoc._of_diversity_officers_in_higher_edu._v._donald_trump.pdf",
            "caseUrl": "https://www.courtlistener.com/opinion/10785644/natl-assoc-of-diversity-officers-in-higher-edu-v-donald-trump/",
            "note": "BACKFILL — the appeal reached judgment: 'we vacate the district court's order granting plaintiffs' motion for a preliminary injunction, and remand for further proceedings. VACATED AND REMANDED'. The injunction that had reached this order's Certification and Enforcement Threat Provisions no longer exists, so no injunction against this order is in effect. Vacated on appeal is not upheld on the merits, and this row does not say it was."
          },
          {
            "status": "in_force",
            "effectiveAt": "2026-06-30",
            "authority": "U.S. District Court for the District of Maryland (Judge Adam B. Abelson)",
            "basis": "court_ruling",
            "sourceLabel": "D. Md. — National Association of Diversity Officers in Higher Education v. Trump, No. 1:25-cv-00333-ABA, Order of June 30, 2026 dismissing the case (ECF 107)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.mdd.575287/gov.uscourts.mdd.575287.107.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69607847/national-association-of-diversity-officers-in-higher-education-v-trump/",
            "note": "THE CURRENT STANDING. On remand the plaintiffs filed a notice of voluntary dismissal without prejudice and the court accepted it: 'it is hereby ORDERED that the notice is ACCEPTED. The Clerk is directed to CLOSE this case.' The case is closed and no injunction against this order is in effect. WITHOUT PREJUDICE and by the plaintiffs' own choice — no court held this order lawful, and this row does not say one did."
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
            "plain": "Protected access to public blockchain networks, started work on a federal rulebook for digital assets, and barred agencies from creating or promoting a U.S. central bank digital currency.",
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
            "plain": "Ordered the Secretary of Defense to deliver an architecture and build plan for a homeland missile-defense shield covering ballistic, hypersonic and cruise missile attack.",
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
        "documentId": "Executive Order 14190",
        "executiveOrderNumber": 14190,
        "title": "Ending Radical Indoctrination in K-12 Schooling",
        "actedAt": "2025-01-29",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/03/2025-02232/ending-radical-indoctrination-in-k-12-schooling",
        "sourceLabel": "Federal Register — Executive Order 14190, 90 FR 8853",
        "frCitation": "90 FR 8853",
        "frDocumentNumber": "2025-02232",
        "publishedAt": "2025-02-03",
        "issues": [
          {
            "issueKey": "end_dei",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Ordered a government-wide plan to cut off federal money to K-12 schools that teach what the order calls discriminatory equity ideology — the schools side of this issue, which the federal-workforce orders do not reach.",
            "rationale": "Section 3(a)(i) directs the Secretaries of Education, Defense and Health and Human Services to deliver an \"Ending Indoctrination Strategy\" containing a plan for \"eliminating Federal funding or support for illegal and discriminatory treatment and indoctrination in K-12 schools, including based on gender ideology and discriminatory equity ideology.\" Section 3(b) requires that strategy to inventory every federal funding stream that supports such instruction, in curriculum and in teacher training, and each agency’s process to prevent or rescind those funds. Section 1 grounds the order in Title VI, Title IX, FERPA and the PPRA. Mapped to end_dei because the chip covers government AND schools; this is the only instrument in this record on the schools side."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-03",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14190 document record, 90 FR 8853",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/03/2025-02232/ending-radical-indoctrination-in-k-12-schooling",
            "note": "Signed January 29, 2025 and published February 3, 2025 at 90 FR 8853. The register’s disposition record for this document carries three cross-references — to Executive Order 13958 of November 2, 2020, Executive Order 13985 of January 20, 2021 and Executive Order 14280 of April 23, 2025 — and no entry revoking or superseding it, so it stands as published. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          }
        ]
      },
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
            "plain": "Signed the law requiring federal detention and removal proceedings for unauthorized immigrants arrested for the listed offenses. Detention becomes mandatory rather than a discretionary call.",
            "rationale": "Mandates detention and removal proceedings for covered unauthorized immigrants.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue names this law as its own evidence — it reads \"signing his first law — the Laken Riley Act (Public Law 119-1)\" and cites the bill page as its source. A card written from this document cannot also be the word this document tests."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Removes enforcement discretion at the point of arrest, so covered people are held for immigration proceedings instead of released.",
            "rationale": "Tightens immigration enforcement."
          },
          {
            "issueKey": "tough_on_crime",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "plain": "The trigger list is criminal: burglary, theft, larceny, shoplifting, assault of a police officer, or any offense causing death or serious bodily injury.",
            "rationale": "Triggered by arrest for burglary, theft, larceny, shoplifting, assault of a law enforcement officer, or any crime resulting in death or serious bodily injury."
          },
          {
            "issueKey": "state_standing",
            "direction": "advances",
            "isPrimary": false,
            "weight": 40,
            "plain": "Gives state attorneys general standing to sue the federal government over certain immigration detention and enforcement decisions — a narrow grant inside an immigration law, not a general shift of power.",
            "rationale": "Gives state attorneys general standing to sue the federal government over certain immigration-detention and enforcement decisions. Re-keyed from states_federal_power in the August 2026 taxonomy split: a cause of action against the federal government is a different question from whose rule governs a shared subject, and it now has its own key."
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
        "actionClass": "executive_order",
        "documentId": "Executive Order 14193",
        "executiveOrderNumber": 14193,
        "title": "Imposing Duties To Address the Flow of Illicit Drugs Across Our Northern Border",
        "actedAt": "2025-02-01",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02406/imposing-duties-to-address-the-flow-of-illicit-drugs-across-our-northern-border",
        "sourceLabel": "Federal Register — Executive Order 14193, 90 FR 9113",
        "frCitation": "90 FR 9113",
        "frDocumentNumber": "2025-02406",
        "publishedAt": "2025-02-07",
        "issues": [
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 70,
            "plain": "Set the tariff rates himself by executive order under emergency economic powers, rather than under a rate schedule enacted by Congress.",
            "rationale": "The order is issued \"by the authority vested in me as President by the Constitution and the laws of the United States of America, including the International Emergency Economic Powers Act (50 U.S.C. 1701 et seq.), the National Emergencies Act (50 U.S.C. 1601 et seq.), section 604 of the Trade Act of 1974 (19 U.S.C. 2483), and section 301 of title 3, United States Code,\" and imposes additional ad valorem duties on articles that are products of Canada. Mapped opposes because the chip states the guardrail position — keeping Congress’s constitutional role over tariffs — and setting rates unilaterally under an emergency statute runs against it. The mapping is about WHO SET THE RATE, not about whether the rate was wise."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14193 document record, 90 FR 9113",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02406/imposing-duties-to-address-the-flow-of-illicit-drugs-across-our-northern-border",
            "note": "Signed February 1, 2025 and published February 7, 2025 at 90 FR 9113. The duties were collected under this order, as amended by Executive Order 14226 of March 2, 2025 and Executive Order 14289 of April 29, 2025, for just over twelve months. That period is a fact about the record and is reported separately from what ended it, which is the row below. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "superseded",
            "effectiveAt": "2026-02-20",
            "authority": "President of the United States, by later executive order",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14389, Ending Certain Tariff Actions, 91 FR 9437",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
            "note": "Executive Order 14389, signed February 20, 2026 and published February 25, 2026, provides that the additional ad valorem duties imposed under the International Emergency Economic Powers Act by this order, as amended, \"shall no longer be in effect and, as soon as practicable, shall no longer be collected.\" That order names this one expressly and states that the national emergency declared or described in it, and every other action taken under it, are unaffected — so this row records the end of the duties and not the end of the order. Read from Executive Order 14389 itself; this is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14194",
        "executiveOrderNumber": 14194,
        "title": "Imposing Duties To Address the Situation at Our Southern Border",
        "actedAt": "2025-02-01",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02407/imposing-duties-to-address-the-situation-at-our-southern-border",
        "sourceLabel": "Federal Register — Executive Order 14194, 90 FR 9117",
        "frCitation": "90 FR 9117",
        "frDocumentNumber": "2025-02407",
        "publishedAt": "2025-02-07",
        "issues": [
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 70,
            "plain": "Set the tariff rates himself by executive order under emergency economic powers, rather than under a rate schedule enacted by Congress.",
            "rationale": "Same authority clause and same mechanism as Executive Order 14193, applied to articles that are products of Mexico: additional ad valorem duties imposed under the International Emergency Economic Powers Act and the National Emergencies Act by executive order. Filed as its own row rather than folded into the northern-border order because it is a separate instrument with its own citation and its own amendment history — Executive Order 14227 of March 2, 2025, Executive Order 14289 of April 29, 2025 and Proclamation 10962 of July 30, 2025."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-02-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14194 document record, 90 FR 9117",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/02/07/2025-02407/imposing-duties-to-address-the-situation-at-our-southern-border",
            "note": "Signed February 1, 2025 and published February 7, 2025 at 90 FR 9117. The duties were collected under this order, as amended, for just over twelve months. That period is a fact about the record and is reported separately from what ended it, which is the row below. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "superseded",
            "effectiveAt": "2026-02-20",
            "authority": "President of the United States, by later executive order",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14389, Ending Certain Tariff Actions, 91 FR 9437",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
            "note": "Executive Order 14389, signed February 20, 2026 and published February 25, 2026, provides that the additional ad valorem duties imposed under the International Emergency Economic Powers Act by this order, as amended, \"shall no longer be in effect and, as soon as practicable, shall no longer be collected.\" That order names this one expressly and states that the national emergency declared or described in it, and every other action taken under it, are unaffected — so this row records the end of the duties and not the end of the order. Read from Executive Order 14389 itself; this is not a statement about any challenge to it."
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
            "plain": "Imposed an extra across-the-board duty on goods from China, using emergency economic powers after finding ordinary tariff authority inadequate.",
            "rationale": "Imposes an additional ad valorem duty on all articles that are products of the People's Republic of China, invoking section 1702(a)(1)(B) of the International Emergency Economic Powers Act on the finding that other tariff authority was inadequate."
          },
          {
            "issueKey": "immig_fentanyl",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Extends the border emergency to China's failure to stop precursor-chemical suppliers and cartel money laundering, and uses the new duties as the lever against that supply chain.",
            "rationale": "Expands the national emergency declared in Proclamation 10886 to cover the failure of the PRC government to intercept chemical precursor suppliers, money launderers and transnational criminal organisations, and imposes the duties as the measure against that supply chain."
          },
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "plain": "Set the China duty rate himself by executive order under emergency economic powers, rather than under a rate schedule enacted by Congress.",
            "rationale": "The order is issued under the International Emergency Economic Powers Act and the National Emergencies Act and imposes an additional ad valorem duty on articles that are products of the PRC, with section 3 reserving to the President the determination whether the PRC has taken adequate steps. Mapped opposes on the guardrail chip, on the same ground as Executive Orders 14193, 14194, 14245 and 14257: the mapping is about who set the rate, not about whether the rate was wise. Added in wave 11; this document was already in the record for its tariffs_china and immig_fentanyl mappings, and leaving the authority question off it while filing three sibling orders for exactly that question would have been selection."
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
            "note": "Issued February 1, 2025 and published February 7, 2025. The duties were collected under this order, as amended by Executive Order 14228 of March 3, 2025, for just over twelve months. That period is a fact about the record and is reported separately from what ended it, which is the row below. This is not a statement about any challenge to it."
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
            "plain": "Terminated every country arrangement, exemption and quota that had displaced the steel tariff — Canada, Mexico, the EU, Japan, the UK, Brazil and others — restoring the duty across steel imports.",
            "rationale": "Terminates every country arrangement, exemption and quota that had displaced the section 232 steel tariff — for South Korea, Argentina, Australia, Brazil, Canada, Mexico, the European Union, Japan, the United Kingdom and Ukraine — effective March 12, 2025, restoring the ad valorem duty across steel imports."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Uses a duty on one industrial input to rebuild domestic steel capacity, and closes the side doors named partners had been shipping through.",
            "rationale": "Uses import duties on a single industrial input as the instrument for rebuilding domestic steel capacity, and removes the alternative arrangements that had let named partners ship outside the duty."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 60,
            "plain": "Restores the duty across the steel import base with no offsetting relief for the American manufacturers and builders who buy steel.",
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
            "plain": "Created the Make America Healthy Again Commission under the HHS Secretary and gave it 100 days to report on childhood chronic disease and its causes. It is a study-and-report body; it changes no coverage or payment rule by itself.",
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
            "plain": "Directed Treasury, Labor and HHS to enforce hospital and health-plan price disclosure, require actual prices instead of estimates, and standardize the data so patients can compare across providers.",
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
            "plain": "Ordered agencies to route contract, grant and loan payments through a centralized review with the DOGE team lead before the money goes out the door.",
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
        "documentId": "Executive Order 14228",
        "executiveOrderNumber": 14228,
        "title": "Further Amendment to Duties Addressing the Synthetic Opioid Supply Chain in the People’s Republic of China",
        "actedAt": "2025-03-03",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/03/07/2025-03775/further-amendment-to-duties-addressing-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of",
        "sourceLabel": "Federal Register — Executive Order 14228, 90 FR 11463",
        "frCitation": "90 FR 11463",
        "frDocumentNumber": "2025-03775",
        "publishedAt": "2025-03-07",
        "issues": [
          {
            "issueKey": "tariffs_china",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Doubled the China tariff he had imposed five weeks earlier, from 10 percent to 20 percent, on the finding that Beijing had not moved against the fentanyl trade.",
            "rationale": "Section 1 states the determination \"that the PRC has not taken adequate steps to alleviate the illicit drug crisis through cooperative enforcement actions, and that the crisis described in Executive Order 14195 has not abated.\" Section 2 amends section 2(a) of Executive Order 14195 \"by striking the words ``10 percent’’ and inserting in lieu thereof the words ``20 percent’’.\" Filed as its own row because it is a separate instrument with its own citation; the order it amends is already in this record and carries its own mapping."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-03-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14228 document record, 90 FR 11463",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/03/07/2025-03775/further-amendment-to-duties-addressing-the-synthetic-opioid-supply-chain-in-the-peoples-republic-of",
            "note": "Signed March 3, 2025 and published March 7, 2025 at 90 FR 11463. The register’s disposition record for this document carries cross-references to Executive Order 14200 of February 5, 2025 and Executive Order 14256 of April 2, 2025, and an \"Amends\" entry for Executive Order 14195 of February 1, 2025, and no entry revoking or superseding it, so it stands as published. Read the limit of that carefully: the duties this order raised were themselves ended on February 20, 2026 by Executive Order 14389, which names \"Executive Order 14195, as amended\" — that supersession is recorded on the Executive Order 14195 row, and this row does not assert a disposition the register does not show for it. This is not a statement about any challenge to the order."
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
            "plain": "Set up a Strategic Bitcoin Reserve and a digital-asset stockpile under Treasury custody, with rules for accounting and disposal. It governs what the government already holds rather than the rules the asset class trades under, which is why it sits below the orders that do.",
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
        "documentId": "Executive Order 14245",
        "executiveOrderNumber": 14245,
        "title": "Imposing Tariffs on Countries Importing Venezuelan Oil",
        "actedAt": "2025-03-24",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/03/27/2025-05440/imposing-tariffs-on-countries-importing-venezuelan-oil",
        "sourceLabel": "Federal Register — Executive Order 14245, 90 FR 13829",
        "frCitation": "90 FR 13829",
        "frDocumentNumber": "2025-05440",
        "publishedAt": "2025-03-27",
        "issues": [
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 70,
            "plain": "Claimed the power to tariff any country that buys Venezuelan oil, at a rate and against a target chosen by the executive branch alone.",
            "rationale": "Issued under the International Emergency Economic Powers Act and the National Emergencies Act, the order authorizes a 25 percent ad valorem duty on goods from any country determined to import Venezuelan oil, directly or indirectly, with the determination left to the Secretary of State in consultation with named officials. Mapped opposes on the same ground as the other two duty orders in this wave: the chip is about who sets tariffs, and this instrument places both the rate and the choice of target inside the executive branch."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-03-27",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14245 document record, 90 FR 13829",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/03/27/2025-05440/imposing-tariffs-on-countries-importing-venezuelan-oil",
            "note": "Signed March 24, 2025 and published March 27, 2025 at 90 FR 13829. That the order stood is a fact about the record and is reported separately from what ended it, which is the row below. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "superseded",
            "effectiveAt": "2026-02-20",
            "authority": "President of the United States, by later executive order",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14389, Ending Certain Tariff Actions, 91 FR 9437",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
            "note": "Executive Order 14389, signed February 20, 2026 and published February 25, 2026, provides that the additional ad valorem duties imposed under the International Emergency Economic Powers Act by this order, as amended, \"shall no longer be in effect and, as soon as practicable, shall no longer be collected.\" That order names this one expressly and states that the national emergency declared or described in it, and every other action taken under it, are unaffected — so this row records the end of the duties and not the end of the order. Read from Executive Order 14389 itself; this is not a statement about any challenge to it."
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
            "plain": "Directed the Election Assistance Commission to require documentary proof of U.S. citizenship on the federal voter-registration form.",
            "rationale": "Section 2(a) directs the Election Assistance Commission to require documentary proof of United States citizenship on the federal voter-registration form."
          },
          {
            "issueKey": "election_integrity",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Directs federal agencies to share data to identify ineligible registrants and to enforce ballot-receipt deadlines against states that count late-arriving ballots.",
            "rationale": "Directs federal agencies to share data to identify ineligible registrants and directs enforcement of ballot-receipt deadlines against States that count late-arriving ballots."
          },
          {
            "issueKey": "states_federal_power",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "plain": "Directed the federal government into the running of elections that the Constitution leaves to the states — setting a ballot-receipt rule and conditioning federal election funding on state compliance.",
            "rationale": "The order directs the Election Assistance Commission to condition federal funds on state adoption of the national mail voter registration form as amended by the order, and directs the Attorney General to enforce against states that count absentee or mail ballots received after election day. Mapped opposes on the chip \"keep decisions with the states unless there’s a clear national reason for Washington to override them,\" which the order overrides by directing state election administration from Washington. Note the standing rows already on this document: a federal court has permanently enjoined parts of it. This mapping records what the order directed, and the standing rows record what survived."
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
          },
          {
            "status": "partly_blocked",
            "effectiveAt": "2026-03-31",
            "authority": "U.S. District Court for the District of Columbia (Judge Colleen Kollar-Kotelly)",
            "basis": "court_ruling",
            "sourceLabel": "D.D.C. — LULAC v. Executive Office of the President, Nos. 25-0946 / 25-0952 / 25-0955 (CKK), Final Judgment of Mar. 31, 2026 (ECF 256)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.dcd.279032/gov.uscourts.dcd.279032.256.0.pdf",
            "note": "THE CURRENT STANDING, and the row that closes the January 30, 2026 row's “left for further proceedings” clause — which is why it was written: that clause had gone stale and a reader was being told the case was still open on those sections when it is not. The parties told the court they no longer wished to litigate the remaining issues, and judgment was entered under Rule 58(d). Its own terms: Sections 2(d) and 3(d) are DECLARED to violate the separation of powers and the named agencies are PERMANENTLY ENJOINED from taking any action to implement or give effect to either; the earlier permanent injunction against Section 2(a) is restated and is already on appeal; in implementing Sections 2(b) and 3(a) the named agencies are DECLARED bound by the Privacy Act, including its requirement of at least thirty days' notice and opportunity for comment for a new or intended routine use; and judgment is entered FOR the defendants on everything else, with the challenges to Sections 4(a), 7(a) and 7(b) and the Administrative Procedure Act claims dismissed without prejudice. THE TOKEN DOES NOT MOVE, and that is the finding rather than a failure to look: parts of this order are permanently enjoined and parts are operative, which is what 'partly blocked' means. What changed is that the disposition is final rather than interim. The court retains jurisdiction to enforce the judgment, and notices of appeal were entered the same day and again on May 28, 2026; an appellate ruling would arrive as a further row rather than as an edit to this one."
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
            "plain": "Imposed a baseline duty on imports from nearly every trading partner plus higher country-specific rates, on the finding that persistent goods deficits hollowed out domestic manufacturing.",
            "rationale": "Imposes a baseline ad valorem duty on imports from nearly all trading partners plus higher country-specific rates, on the stated ground that persistent goods trade deficits have hollowed out the domestic manufacturing base."
          },
          {
            "issueKey": "tariffs_authority",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "plain": "Sets the rates by executive order under emergency economic powers rather than under a rate schedule enacted by Congress.",
            "rationale": "Sets tariff rates by executive order under the International Emergency Economic Powers Act rather than under a rate schedule enacted by Congress."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "The duties reach nearly the whole import base and the order pairs them with no offsetting relief for household purchasers.",
            "rationale": "The duties apply across nearly the whole import base and the order pairs them with no offsetting relief for household purchasers."
          },
          {
            "issueKey": "tariffs_china",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Assigns China one of the higher country-specific rates in the annexed schedule, on the stated ground of non-reciprocal trade practices.",
            "rationale": "Assigns China one of the higher country-specific rates in the annexed schedule, on the stated ground of non-reciprocal trade practices."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "plain": "Uses import duties as the instrument for reshoring manufacturing and rebuilding supply chains.",
            "rationale": "Uses import duties as the instrument for reshoring domestic manufacturing and rebuilding supply chains."
          },
          {
            "issueKey": "cost_living",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "plain": "The duty reaches articles from nearly every trading partner and the order pairs it with no offsetting relief, so the charge lands on imported consumer goods — one of the four costs the day-one affordability directive named.",
            "rationale": "The stated position on this chip is the day-one directive telling every agency to pursue emergency measures lowering the cost of housing, health care, energy and consumer goods. This order runs the other way on the last of those: it imposes an additional ad valorem duty on articles from nearly every trading partner, with higher country-specific rates in its annex, and it contains no offsetting measure for household purchasers. Added in wave 12 as a secondary mapping at reduced weight because the order is a trade instrument whose stated subject is the goods trade deficit rather than consumer prices; the tariffs_prices mapping already on this row carries the narrow reading about tariffs and prices, and this one carries the separate tension with the affordability directive. Note the struck_down standing row already on this document: this mapping records what the order imposed, and the standing rows record what survived."
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
            "plain": "Designated coal as a mineral under the critical-minerals order so coal projects receive its expedited treatment, with raising domestic production as the stated purpose.",
            "rationale": "Section 1 states that increasing domestic energy production including coal is the purpose of the order, and section 3 designates coal as a mineral under EO 14241 so that it receives that order's expedited treatment."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Directs Interior, Agriculture and Energy to report on coal resources on federal lands and on the obstacles to leasing and mining them.",
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
            "plain": "Directed HHS to improve Medicare drug-price negotiation, align payment more closely with what medicines cost to acquire, and pursue lower prices at the pharmacy counter.",
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
        "documentId": "Executive Order 14281",
        "executiveOrderNumber": 14281,
        "title": "Restoring Equality of Opportunity and Meritocracy",
        "actedAt": "2025-04-23",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy",
        "sourceLabel": "Federal Register — Executive Order 14281, 90 FR 17537",
        "frCitation": "90 FR 17537",
        "frDocumentNumber": "2025-07378",
        "publishedAt": "2025-04-28",
        "issues": [
          {
            "issueKey": "end_dei",
            "direction": "advances",
            "isPrimary": true,
            "weight": 75,
            "plain": "Told every federal agency to stop enforcing disparate-impact discrimination law and told the Attorney General to start repealing the rules that carry it — the legal theory that treats unequal outcomes as evidence of discrimination.",
            "rationale": "Section 1 states that the principle of equal treatment \"guarantees equality of opportunity, not equal outcomes\" and \"encourages meritocracy and a colorblind society, not race- or sex-based favoritism,\" and identifies disparate-impact liability as the movement’s \"key tool.\" Section 4 directs that \"all agencies shall deprioritize enforcement of all statutes and regulations to the extent they include disparate-impact liability,\" naming 42 U.S.C. 2000e-2 and three Justice Department regulations. Section 5(a) directs the Attorney General, under the delegation in Executive Order 12250, to \"initiate appropriate action to repeal or amend the implementing regulations for Title VI of the Civil Rights Act of 1964 for all agencies to the extent they contemplate disparate-impact liability.\" Mapped to end_dei on the \"in favor of merit\" limb of the chip."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-04-28",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14281 document record, 90 FR 17537",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/04/28/2025-07378/restoring-equality-of-opportunity-and-meritocracy",
            "note": "Signed April 23, 2025 and published April 28, 2025 at 90 FR 17537. The register’s disposition record for this document carries a single cross-reference, back to Executive Order 12250 of November 2, 1980, and no entry revoking or superseding it, so it stands as published. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
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
            "plain": "Gave the FDA 180 days to eliminate duplicative rules on domestic drug manufacturing and to make review of new and expanded plants faster and more predictable.",
            "rationale": "Directs the Commissioner of Food and Drugs, within 180 days, to review and eliminate duplicative or unnecessary regulations and guidance governing domestic pharmaceutical manufacturing, and to improve the timeliness and predictability of agency review of new and expanded manufacturing capacity."
          },
          {
            "issueKey": "health_drug_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Treats the manufacturing rules it removes as obstacles to an affordable drug supply chain; any price effect is indirect, through supply.",
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
            "plain": "Directed HHS to set U.S. price targets benchmarked to the lower prices comparably developed nations pay, and to open a direct-to-patient channel selling at those prices.",
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
            "plain": "Signed the law extending the 2017 individual income-tax rates and making them permanent instead of letting them expire.",
            "rationale": "Extends and makes permanent the 2017 individual income-tax rates."
          },
          {
            "issueKey": "tax_middle_class",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Locks in the 2017 rate schedule and adds temporary deductions for tip and overtime income.",
            "rationale": "Makes the 2017 individual income-tax rates permanent and adds temporary deductions for tips and overtime pay."
          },
          {
            "issueKey": "cut_spending",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Reduces federal spending across several mandatory programs to offset part of its tax provisions.",
            "rationale": "Reduces federal spending across several mandatory programs."
          },
          {
            "issueKey": "national_debt",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "plain": "Nonpartisan Congressional Budget Office analysis projects the law adds trillions of dollars to federal deficits over a ten-year window.",
            "rationale": "Nonpartisan CBO analysis projects the Act adds trillions of dollars to federal deficits over ten years."
          },
          {
            "issueKey": "healthcare",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 60,
            "plain": "Pays for part of its cost with Medicaid and SNAP reductions that CBO estimates leave millions more people without insurance.",
            "rationale": "Offsets part of its cost with Medicaid and SNAP reductions the CBO estimates leave millions more people uninsured.",
            "circularWithStance": true,
            "circularNote": "The stance card on this issue is titled \"H.R.1: Medicaid & SNAP\" and exists to report this law's projected coverage effect. The card is downstream of this document, so this document cannot test it."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 55,
            "plain": "Appropriates money for border-barrier construction and for border enforcement personnel.",
            "rationale": "Funds border-barrier construction and border enforcement personnel."
          },
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 55,
            "plain": "Phases out and repeals the clean-energy and electric-vehicle tax credits enacted in 2022.",
            "rationale": "Phases out and repeals clean-energy and electric-vehicle tax credits enacted in 2022."
          },
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": false,
            "weight": 50,
            "plain": "Appropriates tens of billions of dollars for immigration detention and removal operations.",
            "rationale": "Appropriates tens of billions of dollars for immigration detention and removal operations."
          },
          {
            "issueKey": "family_support",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "plain": "Raises the child tax credit to $2,200 per child and makes that level permanent — one provision inside a broad reconciliation law, not a family-policy bill.",
            "rationale": "Raises the child tax credit to $2,200 per child and makes it permanent."
          },
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "plain": "Expands onshore and offshore oil, gas and coal leasing and speeds fossil-fuel permitting — a section of a broad law rather than its purpose.",
            "rationale": "Expands onshore and offshore oil, gas, and coal leasing and speeds fossil-fuel permitting."
          },
          {
            "issueKey": "strong_defense",
            "direction": "advances",
            "isPrimary": false,
            "weight": 45,
            "plain": "Adds a large increase in defense and military spending.",
            "rationale": "Adds a large increase in defense and military spending."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 40,
            "plain": "Opens additional federal lands and waters to energy leasing — one title of a broad law, not its subject.",
            "rationale": "Opens additional federal lands and waters to energy leasing."
          },
          {
            "issueKey": "edu_college_cost",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 40,
            "plain": "Restricts graduate and parent student-loan borrowing and narrows the repayment options attached to it.",
            "rationale": "Restricts graduate and parent student-loan borrowing and repayment options."
          },
          {
            "issueKey": "school_choice",
            "direction": "advances",
            "isPrimary": false,
            "weight": 35,
            "plain": "Creates a federal tax credit for donations to K-12 private-school scholarship organizations — a single provision, and an indirect route to the goal.",
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
            "plain": "Signed the law placing fentanyl-related substances on schedule I as an entire class, so a chemist cannot stay ahead of it by altering one molecule at a time.",
            "rationale": "Section 2 amends section 202(c) of the Controlled Substances Act to place fentanyl-related substances, including their salts and isomers, on schedule I as a class rather than one compound at a time."
          },
          {
            "issueKey": "tough_on_crime",
            "direction": "advances",
            "isPrimary": false,
            "weight": 75,
            "plain": "Class scheduling brings schedule I offenses and penalties to bear on a whole family of related compounds at once.",
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
        "actionClass": "executive_order",
        "documentId": "Executive Order 14317",
        "executiveOrderNumber": 14317,
        "title": "Creating Schedule G in the Excepted Service",
        "actedAt": "2025-07-17",
        "publishedAt": "2025-07-23",
        "term": "47",
        "frCitation": "90 FR 34753",
        "frDocumentNumber": "2025-13925",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/07/23/2025-13925/creating-schedule-g-in-the-excepted-service",
        "sourceLabel": "Federal Register — Executive Order 14317, 90 FR 34753",
        "issues": [
          {
            "issueKey": "civil_service_control",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Created Schedule G for noncareer policy-making jobs that turn over with a new President, and switched off the civil-service removal rules for them.",
            "rationale": "Section 1 states the gap: Schedule C covers noncareer excepted service positions of a confidential or policy-determining character and Schedule Policy/Career covers career positions of that character, but 'there is, however, no excepted service schedule for noncareer positions of a policy-making or policy-advocating character'. Section 3 directs that appointments to such positions, where they are normally subject to change as a result of a Presidential transition, shall be made under Schedule G. Section 4(a) amends 5 CFR 6.2 to add Schedule G to the schedules OPM excepts from the competitive service, and section 4(b) amends 5 CFR 6.4 so that the Civil Service Rules and Regulations shall not apply to removals from positions listed in Schedule G alongside Schedules A, C, D, E and Policy/Career. Section 5(b) directs the Secretary of Veterans Affairs, in making Schedule G appointments, to consider whether prospective appointees 'would be suitable exponents of the President's policies' while not taking political affiliation or political activity into account. Creating an excepted personnel category and detaching the removal rules from it is the mechanism this key records."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-07-23",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14317 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/07/23/2025-13925/creating-schedule-g-in-the-excepted-service",
            "note": "Signed July 17, 2025 and published July 23, 2025 at 90 FR 34753. The register's own record for this document carries no disposition note at all: no later presidential action has revoked, amended, reinstated or superseded it. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
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
            "plain": "Signed the law setting the federal rules for payment stablecoins: who may issue them, which banking regulator supervises each class of issuer, and what reserves and disclosures they must carry.",
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
            "plain": "Signed the law cancelling appropriated money that had not yet been obligated, account by account, on the President's own rescission request — foreign assistance and public broadcasting among them.",
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
        "documentId": "Executive Order 14353",
        "executiveOrderNumber": 14353,
        "title": "Assuring the Security of the State of Qatar",
        "actedAt": "2025-09-29",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/10/06/2025-19483/assuring-the-security-of-the-state-of-qatar",
        "sourceLabel": "Federal Register — Executive Order 14353, 90 FR 48143",
        "frCitation": "90 FR 48143",
        "frDocumentNumber": "2025-19483",
        "publishedAt": "2025-10-06",
        "issues": [
          {
            "issueKey": "war_powers",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 85,
            "plain": "Committed the United States in advance to defend another country by military means if that country is attacked, and set up standing joint war planning to carry it out — a forward commitment made by order alone, with no congressional authorization named in it.",
            "rationale": "Section 1 makes it the policy of the United States “to guarantee the security and territorial integrity of the State of Qatar against external attack.” Section 2(a) provides that the United States “shall regard any armed attack on the territory, sovereignty, or critical infrastructure of the State of Qatar as a threat to the peace and security of the United States,” and section 2(b) that in that event the United States “shall take all lawful and appropriate measures—including diplomatic, economic, and, if necessary, military—to defend the interests of the United States and of the State of Qatar and to restore peace and stability.” Section 2(c) directs the Secretary of War, in coordination with the Secretary of State and the Director of National Intelligence, to “maintain joint contingency planning” with Qatar for a rapid and coordinated response. The order rests on “the authority vested in me as President by the Constitution and the laws of the United States” and identifies no treaty, statute or authorization for the use of military force. Mapped as opposing the congressional war-power chip because the instrument is itself the whole authorization for what it promises."
          },
          {
            "issueKey": "restraint",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "plain": "A standing promise to fight for another country if it is attacked is a new open-ended military commitment, not the winding down of one.",
            "rationale": "Sections 1 and 2, quoted in the war_powers rationale on this row. Filed against the restraint chip because the commitment the order creates carries no end date, no sunset and no triggering condition narrower than “any armed attack” on the covered state’s territory, sovereignty or critical infrastructure, and because section 2(c) makes the planning for it continuous rather than contingent on a later decision. The mapping records what the order commits the United States to do; it makes no claim about whether that commitment was wise."
          },
          {
            "issueKey": "america_first_fp",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "The stated doctrine presses allies to carry more of their own defense; this order has the United States take on the defense of one instead. A narrower link — the order is a security guarantee, not a foreign-aid or burden-sharing instrument.",
            "rationale": "The stated position on this chip is a doctrine of pressing allies to fund their own defense and of questioning open-ended commitments abroad. Section 1 of this order runs the other way for one ally: it makes guaranteeing that state’s security and territorial integrity the policy of the United States, and section 2(b) puts American military means behind the guarantee if an attack comes. The order asks nothing of the covered state in return and sets no cost-sharing condition. Mapped below the weight given to the war_powers reading because the stated doctrine is written about aid and burden-sharing rather than about defense guarantees, so the tension is real but secondary."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-10-06",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14353 document record, 90 FR 48143",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/10/06/2025-19483/assuring-the-security-of-the-state-of-qatar",
            "note": "Signed September 29, 2025 and published October 6, 2025 at 90 FR 48143. The register’s document record for this order carries no disposition note and there is no later presidential document revoking, amending or superseding it, so it stands as published. This describes the register’s record of presidential action and is not a statement about any challenge to the order."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14358",
        "executiveOrderNumber": 14358,
        "title": "Modifying Reciprocal Tariff Rates Consistent With the Economic and Trade Arrangement Between the United States and the People’s Republic of China",
        "actedAt": "2025-11-04",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2025/11/07/2025-19826/modifying-reciprocal-tariff-rates-consistent-with-the-economic-and-trade-arrangement-between-the",
        "sourceLabel": "Federal Register — Executive Order 14358, 90 FR 50729",
        "frCitation": "90 FR 50729",
        "frDocumentNumber": "2025-19826",
        "publishedAt": "2025-11-07",
        "issues": [
          {
            "issueKey": "tariffs_china",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 55,
            "plain": "Kept the higher China tariff rates switched off for a further twelve months under a negotiated trade arrangement, extending a suspension rather than collecting the duties.",
            "rationale": "Section 1 recounts that the heightened ad valorem duties on PRC goods imposed by Executive Order 14257 as amended were suspended in Executive Order 14298 of May 12, 2025 and Executive Order 14334 of August 11, 2025 following discussions with the PRC. Section 2 directs that \"Heading 9903.01.63 and subdivision (v)(xvii)(10) of U.S. note 2 to subchapter III of chapter 99 of the Harmonized Tariff Schedule of the United States shall continue to be suspended until 12:01 a.m. eastern standard time on November 10, 2026.\" Mapped opposes because the chip is about USING tariffs to counter China and this instrument holds them in abeyance; mapped at reduced weight and described in `plain` as a suspension because section 3(b) preserves the power to reimpose them if the PRC does not honour the arrangement."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2025-11-07",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14358 document record, 90 FR 50729",
            "sourceUrl": "https://www.federalregister.gov/documents/2025/11/07/2025-19826/modifying-reciprocal-tariff-rates-consistent-with-the-economic-and-trade-arrangement-between-the",
            "note": "Signed November 4, 2025 and published November 7, 2025 at 90 FR 50729. The register’s disposition record for this document is empty — no revocation and no supersession — so it stands as published. Read the limit of that carefully: the reciprocal duties whose suspension this order extended were themselves ended on February 20, 2026 by Executive Order 14389. This row does not assert a standing beyond what the register shows, and it is not a statement about any challenge to the order."
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
            "plain": "Signed the funding law that bars federal funds from being used for any reduction in force, voids the reductions taken since October 1, 2025, and orders those employees reinstated with back pay. Signing it stopped workforce cuts rather than making them.",
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
            "plain": "Pulled a list of agricultural products out of the reciprocal tariff and ordered refunds of duties already collected on them.",
            "rationale": "Section 1 determines that certain agricultural products shall not be subject to the reciprocal tariff imposed under Executive Order 14257, as amended, and issues updated versions of that order's Annex II; section 2 modifies the Harmonized Tariff Schedule accordingly effective for goods entered on or after 12:01 a.m. eastern standard time on November 13, 2025 — a day before signature — and provides that to the extent implementation requires a refund of duties collected, refunds shall be processed through U.S. Customs and Border Protection's standard procedures."
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 65,
            "plain": "Narrows the reciprocal tariff's coverage, giving domestic demand and domestic production capacity — not a concession from a trading partner — as part of the reason.",
            "rationale": "Removes a class of goods from the reciprocal tariff's coverage, and gives as the grounds for doing so the President's consideration of \"current domestic demand for certain products, and current domestic capacity to produce certain products\" alongside the status of negotiations — a narrowing of the instrument driven in part by domestic supply conditions rather than by anything a trading partner conceded."
          },
          {
            "issueKey": "cost_living",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Took the reciprocal-tariff duty back off imported food — coffee, bananas, beef and other farm goods the United States does not grow enough of — so the tariff stopped showing up in grocery prices.",
            "rationale": "Section 2 modifies the Harmonized Tariff Schedule as provided in Annex I, effective for goods entered for consumption on or after 12:01 a.m. eastern standard time on November 13, 2025, and provides for refunds of duties already collected. Section 1 states the decision followed monitoring of \"current domestic demand for certain products, and current domestic capacity to produce certain products.\" Filed as a secondary mapping on a document already in this record for its tariffs_prices and tariffs_growth mappings: the household-grocery reading is a distinct issue from the general price reading, and this is the only instrument in the record that reaches food prices directly."
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
        "actionClass": "executive_order",
        "documentId": "Executive Order 14373",
        "executiveOrderNumber": 14373,
        "title": "Safeguarding Venezuelan Oil Revenue for the Good of the American and Venezuelan People",
        "actedAt": "2026-01-09",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/01/15/2026-00831/safeguarding-venezuelan-oil-revenue-for-the-good-of-the-american-and-venezuelan-people",
        "sourceLabel": "Federal Register — Executive Order 14373, 91 FR 2045",
        "frCitation": "91 FR 2045",
        "frDocumentNumber": "2026-00831",
        "publishedAt": "2026-01-15",
        "issues": [
          {
            "issueKey": "america_first_fp",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 75,
            "plain": "Declared a new national emergency so the United States could hold another government's oil revenue in Treasury custody, and named that country's economic and political stability an American foreign policy objective the order says must not fail.",
            "rationale": "Section 1 finds that attachment or other judicial process against the covered funds “will substantially interfere with our critical efforts to ensure economic and political stability in Venezuela,” and that the failure of those efforts “would jeopardize major foreign policy objectives of the United States,” which the section lists as ending illegal immigration and illicit narcotics flows, “protecting American interests against malign actors such as Iran and Hezbollah,” and “bringing peace, prosperity, and stability to the Venezuelan people and to the Western Hemisphere more generally.” On that finding the order declares a national emergency under the International Emergency Economic Powers Act and the National Emergencies Act. Section 3 renders any attachment, judgment, lien, execution or garnishment against the covered funds null and void and bars any transfer of them except under a licence issued under the order. Section 4 finds the funds are property of that government, held by the United States “solely in a custodial and governmental capacity,” and “held pending sovereign disposition for public, governmental, or diplomatic purposes determined by the Secretary of State, on behalf of the Government of Venezuela.” Mapped as opposing the America-First chip because that chip is written around questioning open-ended commitments abroad, and this order takes one on: it makes another country’s stabilization a named United States objective and puts the Treasury in the position of custodian for that country’s resource revenue for a period the order does not bound."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-01-15",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14373 document record, 91 FR 2045",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/01/15/2026-00831/safeguarding-venezuelan-oil-revenue-for-the-good-of-the-american-and-venezuelan-people",
            "note": "Signed January 9, 2026 and published January 15, 2026 at 91 FR 2045. The register’s document record carries no disposition note and no later presidential document revokes, amends or supersedes it; the later register entries that refer to it are notices of Treasury general licences issued under its own authority, which leave the order in place. This describes the register’s record of presidential action and is not a statement about any challenge to the order."
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
            "plain": "Raised the 2026 beef import quota by 80,000 metric tons of lean trimmings, released quarterly and allocated to Argentina, on a determination that domestic supply would not meet demand at reasonable prices.",
            "counts": "A formal supply action aimed at making a staple consumer food more affordable.",
            "rationale": "Increases the calendar-year 2026 in-quota quantity of the beef tariff-rate quota by 80,000 metric tons of lean beef trimmings, released in four quarterly tranches and allocated in its entirety to Argentina, on the determination that domestic supply would otherwise be inadequate to meet domestic demand at reasonable prices."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 85,
            "plain": "Enlarging the quota lets that beef enter at the low in-quota tariff rate instead of the high over-quota rate — a trade barrier lowered to hold a grocery price down.",
            "counts": "A tariff barrier lowered for the stated purpose of holding a consumer price down — the exact trade-off this issue is about.",
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
        "documentId": "Executive Order 14389",
        "executiveOrderNumber": 14389,
        "title": "Ending Certain Tariff Actions",
        "actedAt": "2026-02-20",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
        "sourceLabel": "Federal Register — Executive Order 14389, 91 FR 9437",
        "frCitation": "91 FR 9437",
        "frDocumentNumber": "2026-03832",
        "publishedAt": "2026-02-25",
        "issues": [
          {
            "issueKey": "tariffs_china",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 70,
            "plain": "Ended the tariffs he had imposed on China under emergency economic powers, ordering agencies to stop collecting them as soon as practicable.",
            "rationale": "Section 1 provides that the additional ad valorem duties imposed under IEEPA in Executive Order 14195 as amended — the synthetic-opioid duties on the PRC — along with those in Executive Orders 14193, 14194, 14245, 14257, 14323, 14329, 14380 and 14382, \"shall no longer be in effect and, as soon as practicable, shall no longer be collected.\" Section 2(a) directs every agency head to \"take all appropriate steps to end\" those duties and to \"immediately begin taking steps to effectuate this order.\""
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "Switched off the whole emergency-powers tariff program at once, removing the import duties that were the instrument of the reshoring case.",
            "rationale": "Section 1, above, reaches nine orders including Executive Order 14257, the reciprocal-tariff order whose stated ground was that persistent goods trade deficits had hollowed out the domestic manufacturing base. Mapped opposes because the chip is about USING tariffs to reshore manufacturing and this instrument ends their collection."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Removing the duties takes the tariff component back out of the price of the covered imports.",
            "rationale": "Section 1 ends collection of the additional ad valorem duties; section 2(b) directs the Secretary of Commerce, the Secretary of Homeland Security and the United States Trade Representative to implement, and section 2(a) provides for refunds of duties collected to be processed under standard Customs procedures. Mapped advances because the chip asks that families be shielded from tariff-driven price increases."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-02-25",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14389 document record, 91 FR 9437",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/02/25/2026-03832/ending-certain-tariff-actions",
            "note": "Signed February 20, 2026 and published February 25, 2026 at 91 FR 9437. The register’s disposition record for this document carries eleven cross-references to the orders it unwinds and to Proclamation 11012 and Executive Order 14388 of the same day, and no entry revoking or superseding it, so it stands as published. This is a statement about the register’s record of presidential action and is not a statement about any challenge to the order."
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
            "plain": "Imposed a temporary 10 percent surcharge on imported articles under the balance-of-payments provision of the Trade Act, which allows up to 15 percent for up to 150 days.",
            "rationale": "Imposes an additional 10 percent ad valorem surcharge on articles imported into the United States, effective for goods entered on or after 12:01 a.m. eastern standard time on February 24, 2026, under section 122 of the Trade Act of 1974 (19 U.S.C. 2132), which permits an import surcharge of up to 15 percent for up to 150 days to deal with large and serious United States balance-of-payments deficits."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 85,
            "plain": "Re-imposed broad import duties on the day the previous, differently authorized program ended, under a statute chosen for that purpose, so the trade-barrier posture continued without a gap.",
            "rationale": "Re-imposes broad-based import duties across nearly the whole tariff schedule on the day the previous, differently-authorized program ended, so the trade-barrier posture continues without interruption under a statute the President selected for that purpose."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "plain": "Applies to nearly all imported articles. The carve-out list — critical minerals, energy, fertilizers, medicines, some food and electronics — narrows it, but a broad surcharge still raises import costs on net.",
            "rationale": "Applies a surcharge to nearly all imported articles. Paragraph 14 exempts a list of goods — critical minerals, bullion, energy, fertilizers, certain agricultural products, pharmaceuticals, certain electronics, vehicles, aerospace articles, goods already covered by section 232 actions, USMCA-qualifying duty-free Canadian and Mexican goods and CAFTA-DR textiles — and those carve-outs are recorded here rather than filed as relief, because a broad surcharge with a list of exceptions raises import costs on net and the chip on this issue is about everyday costs not rising."
          },
          {
            "issueKey": "cost_living",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "A surcharge on nearly all imported articles raises what imported goods cost — thirteen months after the directive telling every agency to find emergency ways of bringing those costs down.",
            "rationale": "The stated position on this chip is the day-one directive to lower the cost of housing, health care, energy and consumer goods. This proclamation imposes an additional 10 percent ad valorem surcharge on articles imported into the United States under section 122 of the Trade Act of 1974. Its paragraph 14 carve-out list — critical minerals, bullion, energy, fertilizers, certain agricultural products, pharmaceuticals, certain electronics — removes several of the named categories from the charge, which is why this is filed below the weight of the primary mapping; the surcharge still reaches imported consumer goods generally, and it issued more than a year into the directive it sits against. Added in wave 12."
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
        "actionClass": "directive",
        "documentId": "Proclamation 11015",
        "title": "Commitment to Countering Cartel Criminal Activity",
        "actedAt": "2026-03-07",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/03/12/2026-04924/commitment-to-countering-cartel-criminal-activity",
        "sourceLabel": "Federal Register — Proclamation 11015, 91 FR 12285",
        "frCitation": "91 FR 12285",
        "frDocumentNumber": "2026-04924",
        "publishedAt": "2026-03-12",
        "issues": [
          {
            "issueKey": "war_powers",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 80,
            "plain": "Committed the United States to an armed campaign across the Western Hemisphere and to mobilizing partner militaries for it, by proclamation, with no congressional authorization named in the text.",
            "rationale": "The preamble recites that the Secretary of War convened a coalition of military leaders and representatives from seventeen countries “demonstrating that the region is ready to operationalize hard power to defeat these threats,” and states that the United States “will address these grave dangers by use of any necessary resources and legally available authorities, together with our partner nations.” Numbered paragraph (1) proclaims that the covered organizations “should be demolished to the fullest extent possible,” qualified in the same clause by applicable law; paragraph (3) that the United States “will train and mobilize partner nation militaries” to dismantle them; paragraph (4) that the United States and its allies “should keep external threats at bay.” The proclamation issues “by virtue of the authority vested in me by the Constitution and the laws of the United States” and identifies no authorization for the use of military force. Mapped as opposing the congressional war-power chip because a hemisphere-wide commitment to armed action is asserted here as an executive act on its own authority."
          },
          {
            "issueKey": "restraint",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "plain": "A proclamation committing the country to demolishing armed organizations abroad, using any necessary resources, opens a campaign rather than ending one.",
            "rationale": "Preamble and numbered paragraphs (1) through (4), quoted in the war_powers rationale on this row. Filed against the restraint chip because the commitment is open-ended in every dimension the document addresses: it names no end date, no theatre narrower than the Western Hemisphere, no ceiling on means beyond “any necessary resources and legally available authorities,” and an objective — demolition of the covered organizations “to the fullest extent possible” — that the document does not treat as achieved. The mapping records the commitment the document makes and asserts nothing about the campaign’s results."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-03-12",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11015 document record, 91 FR 12285",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/03/12/2026-04924/commitment-to-countering-cartel-criminal-activity",
            "note": "Signed March 7, 2026 and published March 12, 2026 at 91 FR 12285. The register’s document record carries no disposition note and no later presidential document revoking or superseding it, so it stands as published. This describes the register’s record of presidential action and is not a statement about any challenge to the proclamation."
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
            "plain": "Ordered the Army Corps and the EPA to rewrite stormwater, wetlands and Clean Water Act permitting to cut housing construction costs, and told HUD, Commerce, Transportation and the housing finance regulator to identify rules to eliminate.",
            "rationale": "Directs the Army Corps of Engineers and the Environmental Protection Agency to revise stormwater, wetlands and Clean Water Act section 404 permitting requirements to reduce housing construction costs, and directs Commerce, HUD, Transportation and the Federal Housing Finance Agency to consider eliminating rules that constrain residential development."
          },
          {
            "issueKey": "cost_living",
            "direction": "advances",
            "isPrimary": false,
            "weight": 80,
            "plain": "Treats permitting delays and building mandates as a cause of high housing prices, and makes removing them administration policy.",
            "counts": "Housing is the largest fixed line in most household budgets, and this order goes at the permitting cost of building more of it.",
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
            "plain": "Ordered state citizenship lists built from Social Security and Homeland Security records, told the Attorney General to prioritize prosecuting officials who issue federal ballots to ineligible people, and started a rulemaking on uniform mail-ballot envelopes.",
            "rationale": "Directs the transmission of State Citizenship Lists built from Social Security Administration records and the Department of Homeland Security's SAVE program, directs the Attorney General to prioritise investigation and prosecution of officials who issue federal ballots to ineligible individuals, and directs the Postmaster General to begin a rulemaking within 60 days on uniform standards for mail-in and absentee ballot envelopes."
          },
          {
            "issueKey": "voter_id",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Checks eligibility against existing federal citizenship records and puts a unique tracking barcode on outbound ballot mail so a ballot can be traced to the person it was sent to.",
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
          },
          {
            "status": "in_force",
            "effectiveAt": "2026-05-28",
            "authority": "U.S. District Court for the District of Columbia (Judge Carl J. Nichols)",
            "basis": "court_ruling",
            "sourceLabel": "D.D.C. — Democratic Senatorial Campaign Committee v. Trump, No. 1:26-cv-01114 (CJN) (consolidated), Memorandum Opinion of May 28, 2026 (ECF 143)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.dcd.291053/gov.uscourts.dcd.291053.143.0_1.pdf",
            "note": "THE CURRENT STANDING, and a row that exists because the register alone can no longer describe this order. It is under challenge: LULAC v. Executive Office of the President, No. 1:26-cv-01132, was filed in the District of Columbia on April 2, 2026 naming this order by title and asking that Sections 2(a), 3(b)(iii) and 3(b)(iv) be enjoined, and on April 14, 2026 it was consolidated with NAACP v. Trump, No. 1:26-cv-01151, into the lead case above. On May 28, 2026 the court DENIED the motions for a preliminary injunction. Read what that denial is and is not. The claims against Section 3 were held unripe because the Postal Service has issued neither a proposed nor a final rule; the claims against Section 2(a) failed for want of a showing of likely standing and imminent irreparable harm because no State Citizenship List has been created or transmitted and no State has acted on one; and the opinion states that plaintiffs may renew their motions if and when those actions occur. NO COURT HAS UPHELD THIS ORDER. Nothing enjoins it — that is what this row says and the whole of what it says. Notices of appeal were entered June 1, 2026 and the appeal was transmitted to the Court of Appeals on June 2, 2026."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 11020",
        "title": "Adjusting Imports of Pharmaceuticals and Pharmaceutical Ingredients Into the United States",
        "actedAt": "2026-04-02",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/04/09/2026-06956/adjusting-imports-of-pharmaceuticals-and-pharmaceutical-ingredients-into-the-united-states",
        "sourceLabel": "Federal Register — Proclamation 11020, 91 FR 18183",
        "frCitation": "91 FR 18183",
        "frDocumentNumber": "2026-06956",
        "publishedAt": "2026-04-09",
        "issues": [
          {
            "issueKey": "health_drug_prices",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 80,
            "plain": "Put a 100 percent border duty on imported patented medicines and their listed ingredients, with lower rates for named countries and for firms whose onshoring plans are approved. Generics, biosimilars and a list of specialty therapies are exempt, but the charge lands on patented drugs at the border.",
            "rationale": "Clause (3)(a) subjects imports of patented pharmaceuticals and associated pharmaceutical ingredients listed in Annex I to a 100 percent ad valorem duty rate. Clause (3)(b) sets that rate at 20 percent for products of companies whose onshoring plans the Secretary has approved, rising to 100 percent on April 2, 2030; clause (3)(c) sets 15 percent for products of Japan, the European Union, the Republic of Korea, and Switzerland and Liechtenstein jointly, and 10 percent for the United Kingdom. Paragraph 11 records that generic and biosimilar products are not subject to section 232 duties at this time, and clause (3)(d) sets a zero rate for orphan drugs, nuclear medicines, plasma derived therapies, fertility treatments, cell and gene therapies and antibody drug conjugates. The charge therefore falls on the patented medicines the proclamation names, and it is collected at the border on the imported article."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 75,
            "plain": "A 100 percent duty is the steepest rate on any product line in this record, and the proclamation's own findings place the bulk of covered supply outside the country.",
            "rationale": "A duty of 100 percent ad valorem on an imported article is the largest single rate on any product line in this file. Paragraph 2 states that approximately 53 percent of patented pharmaceutical products distributed domestically are produced outside the country and that only 15 percent of patented active pharmaceutical ingredients by volume are domestically produced for the United States market, so the proclamation's own findings place the bulk of the covered supply on the dutiable side of the border."
          },
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Rests on a national-security finding about foreign dependence for medicines and directs continued negotiation of agreements to address it.",
            "rationale": "The action rests on the Secretary of Commerce's section 232 finding, recited in paragraph 1, that pharmaceuticals and associated active pharmaceutical ingredients are being imported in such quantities and under such circumstances as to threaten to impair the national security of the United States, and clause (1) directs continued negotiation of agreements under 19 U.S.C. 1862(c)(3)(A)(i) to address that threatened impairment."
          },
          {
            "issueKey": "cost_living",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "Put a border charge on imported patented medicines, raising the cost of health care — named in the day-one affordability directive as one of the four costs every agency was told to bring down.",
            "rationale": "The stated position on this chip is the day-one directive to lower the cost of housing, health care, energy and consumer goods. This proclamation imposes a duty of one hundred percent on imported patented and branded medicines and their listed ingredients, with lower rates for named countries and for firms whose onshoring plans are approved, and its own findings place the bulk of covered supply outside the country. Generics, biosimilars and a list of specialty therapies are exempt, which is one reason it is filed below the weight of the primary mapping. Added in wave 12 as a secondary mapping because the primary reading of this document is the drug-pricing one already on this row; the cost_living mapping records the separate tension with the broader affordability directive, which names health care by name."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-04-09",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11020 document record, 91 FR 18183",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/04/09/2026-06956/adjusting-imports-of-pharmaceuticals-and-pharmaceutical-ingredients-into-the-united-states",
            "note": "The register's disposition record for this proclamation carries no revocation, amendment or supersession, so it stands as published. Clause (3)(b) provides on its own terms that the 20 percent rate rises to 100 percent on April 2, 2030, and clause (3)(c) provides that the United Kingdom rate reduces to zero to the extent required by any future pricing agreement; this row asserts nothing about either future date. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14402",
        "executiveOrderNumber": 14402,
        "title": "Promoting Efficiency, Accountability, and Performance in Federal Contracting",
        "actedAt": "2026-04-30",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/05/05/2026-08900/promoting-efficiency-accountability-and-performance-in-federal-contracting",
        "sourceLabel": "Federal Register — Executive Order 14402, 91 FR 24325",
        "frCitation": "91 FR 24325",
        "frDocumentNumber": "2026-08900",
        "publishedAt": "2026-05-05",
        "issues": [
          {
            "issueKey": "cut_spending",
            "direction": "advances",
            "isPrimary": true,
            "weight": 75,
            "plain": "Made fixed-price contracts the default across federal procurement, and required written justification — plus the agency head's approval above set dollar thresholds — for anything else.",
            "rationale": "Section 2(a) directs executive branch departments and agencies, so far as applicable law allows, to utilize fixed-price contracts in procurement, making them the default rather than the exception. Section 2(b)(i) requires a contracting officer to justify any non-fixed-price contract in writing to the agency head, and section 2(b)(ii) requires the agency head's written approval where the non-fixed-price value exceeds 100 million dollars for a Department of War contract, 35 million for the National Aeronautics and Space Administration, 25 million for the Department of Homeland Security and 10 million for any other agency. Section 1 gives as the reason a review of Fiscal Year 2024 spending that identified approximately 120 billion dollars obligated on cost-reimbursement consulting contracts alone."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-05-05",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14402 document record, 91 FR 24325",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/05/05/2026-08900/promoting-efficiency-accountability-and-performance-in-federal-contracting",
            "note": "The register's disposition record for this order carries no revocation, amendment or supersession, so it stands as published. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14406",
        "executiveOrderNumber": 14406,
        "title": "Restoring Integrity to America's Financial System",
        "actedAt": "2026-05-19",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/05/22/2026-10400/restoring-integrity-to-americas-financial-system",
        "sourceLabel": "Federal Register — Executive Order 14406, 91 FR 30479",
        "frCitation": "91 FR 30479",
        "frDocumentNumber": "2026-10400",
        "publishedAt": "2026-05-22",
        "issues": [
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Ordered Treasury to issue a formal advisory telling banks what to watch for when accounts or credit are obtained without lawful status or work authorization, and to change Bank Secrecy Act rules so institutions may ask.",
            "rationale": "Section 3(a) directs the Secretary of the Treasury, within 60 days, to issue a formal Advisory to financial institutions describing red flags associated with exploitation of the United States financial system by non-work authorized populations and their employers, including payroll tax evasion and the use of an individual taxpayer identification number to obtain credit products or open depository accounts where the applicant lacks verified lawful immigration status. Section 3(b)(ii) directs proposed changes to Bank Secrecy Act implementing regulations so that institutions retain authority to obtain information relevant to whether account holders possess lawful immigration status and employment authorization."
          },
          {
            "issueKey": "immig_fentanyl",
            "direction": "advances",
            "isPrimary": false,
            "weight": 65,
            "plain": "Aims the same advisory at small cross-border transfers tied to cartel fentanyl money and at the financial signatures of labor trafficking.",
            "rationale": "Section 1 gives as a reason for the order that low-dollar cross-border funds transfers have been used to facilitate or commit terrorist financing, narcotics trafficking and human trafficking, and that financial trend analyses have uncovered hubs of fentanyl-related financial activity in the United States related to Mexico-based cartels. Section 3(a)(v) directs the Advisory to describe financial activity indicative of labor trafficking or forced labor as defined in 18 U.S.C. 1589."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-05-22",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14406 document record, 91 FR 30479",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/05/22/2026-10400/restoring-integrity-to-americas-financial-system",
            "note": "The register's disposition record for this order carries no revocation, amendment or supersession, so it stands as published. The order directs proposed regulatory changes on 60-, 90- and 180-day clocks; whether any of those proposals has been adopted is a separate question this row does not reach. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14410",
        "executiveOrderNumber": 14410,
        "title": "Implementing Schedule Policy/Career in the Excepted Service",
        "actedAt": "2026-06-03",
        "publishedAt": "2026-06-10",
        "term": "47",
        "frCitation": "91 FR 34893",
        "frDocumentNumber": "2026-11594",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/06/10/2026-11594/implementing-schedule-policycareer-in-the-excepted-service",
        "sourceLabel": "Federal Register — Executive Order 14410, 91 FR 34893",
        "issues": [
          {
            "issueKey": "civil_service_control",
            "direction": "advances",
            "isPrimary": true,
            "weight": 95,
            "plain": "Moved the career positions named in its appendix into Schedule Policy/Career, gave agencies seven days to notify the employees, and removed the trial-period and pay-protection rules attached to those posts. This is the order that carried the reclassification out.",
            "rationale": "Section 5 is the operative part. Subsection (a) determines that the positions set forth in the Appendix have a confidential, policy-determining, policy-making or policy-advocating character and that it is necessary and warranted by conditions of good administration to except them from the competitive service; subsection (b) places those positions in Schedule Policy/Career; subsection (c) gives each agency head seven days to notify the officers and employees encumbering them and to conform agency records and practices. The Appendix runs from page 34895 to page 35124 of the published document. Section 2 amends the Civil Service Rules to carry the transfer: Rule I, so that an employee in the competitive service with competitive status when the position is first listed under Schedule Policy/Career is in the excepted service but retains that status; Rule XI, so that individuals appointed to positions in Schedule C, Schedule E, Schedule Policy/Career and Schedule G are not subject to trial periods; and 5 CFR 550.704(b), by adding a new subparagraph (6) reaching an employee who occupies a Schedule Policy/Career position where the agency identifies unacceptable performance or misconduct as the basis for separation in a written notice. Section 3(a) further amends Executive Order 13957 as amended by Executive Order 14171. Section 4 directs each agency with Schedule Policy/Career employees to set aside a separate bonus pool."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-06-10",
            "authority": "Signed by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14410 document record",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/06/10/2026-11594/implementing-schedule-policycareer-in-the-excepted-service",
            "note": "Signed June 3, 2026 and published June 10, 2026 at 91 FR 34893. The disposition note on the register's own record for this document reads 'Amends: EO 13562, December 27, 2010; EO 13957, October 21, 2020; EO 14171, January 20, 2025; EO 14217, February 19, 2025' — it names what this order changed and records nothing done to it in return. This is a statement about the register's record of presidential action and is not a statement about any challenge to the order."
          },
          {
            "status": "challenged_unverified",
            "effectiveAt": "2026-06-17",
            "authority": "Challenge pending — U.S. District Court for the District of Columbia (National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC)",
            "basis": "pending_litigation",
            "sourceLabel": "D.D.C. — National Treasury Employees Union v. Trump, No. 1:25-cv-00170-JMC, Amended Complaint for Declaratory and Injunctive Relief (ECF 30, filed June 17, 2026)",
            "sourceUrl": "https://storage.courtlistener.com/recap/gov.uscourts.dcd.276604/gov.uscourts.dcd.276604.30.0.pdf",
            "caseUrl": "https://www.courtlistener.com/docket/69560537/national-treasury-employees-union-v-trump/",
            "note": "THE CURRENT STANDING, fourteen days after the order was signed. The amended complaint, read in full in this pass, was filed two weeks after this document issued and exists in its amended form because of it: paragraph 3 reads 'The President issued another Executive Order on June 3, 2026, which immediately placed thousands of positions (affecting approximately 8000 employees) into Schedule Policy/Career and directed agencies to notify affected employees within seven days. Exec. Order No. 14,410, Implementing Schedule Policy/Career in the Excepted Service (Implementing Policy/Career Order) (91 Fed. Reg. 34893) (June 3, 2026)'. Counts 1 and 2 name 'the Implementing Policy/Career Order' alongside the 2025 order and ask the court to hold both unlawful and ultra vires. The docket, No. 1:25-cv-00170-JMC in the District of Columbia, is not terminated and its newest entry when read here was dated August 6, 2026; it carries no ruling on this order, and a search of published opinions for Schedule Policy/Career returned no ruling either. So no court has stopped this order and no court has upheld it. Filing it as in force would have been the easier call and the wrong one: the challenge was already on file when this pass read the register. The absence of a ruling is what this pass searched for and did not find, which is not a guarantee that none exists."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14411",
        "executiveOrderNumber": 14411,
        "title": "Strengthening Customs Enforcement",
        "actedAt": "2026-06-03",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/06/10/2026-11595/strengthening-customs-enforcement",
        "sourceLabel": "Federal Register — Executive Order 14411, 91 FR 35125",
        "frCitation": "91 FR 35125",
        "frDocumentNumber": "2026-11595",
        "publishedAt": "2026-06-10",
        "issues": [
          {
            "issueKey": "econ_trade",
            "direction": "advances",
            "isPrimary": true,
            "weight": 70,
            "plain": "Ordered Homeland Security to require importers of record to hold domestic assets or larger bonds and disclose beneficial ownership, and to bar foreign importers from filing informal entries.",
            "rationale": "Section 2(a) directs the Secretary of Homeland Security, within 180 days, to revise importer eligibility regulations to require that an importer of record maintain a minimum level of tangible domestic assets or bonding as determined by U.S. Customs and Border Protection, to increase the minimum required bond coverage, and to require additional identification data including ownership and beneficial ownership disclosures. Section 2(b)(i) directs the Secretary to prohibit a foreign importer of record from filing informal entry under regulations promulgated pursuant to 19 U.S.C. 1498."
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Tightens who may act as an importer of record so duties owed are actually collected — collection is what makes a tariff schedule bite.",
            "rationale": "Section 1 gives as the purpose of the order that effective customs enforcement ensures importers of record are correctly identified and accountable for duties owed, and identifies undervaluing imports and avoiding payment of duties through various arrangements and schemes as forms of noncompliance that disadvantage domestic businesses."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-06-10",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14411 document record, 91 FR 35125",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/06/10/2026-11595/strengthening-customs-enforcement",
            "note": "The register's disposition record for this order carries no revocation, amendment or supersession, so it stands as published. The order's operative directions run on a 180-day clock to the Secretary of Homeland Security; whether the revised regulations have issued is a separate question this row does not reach. This is not a statement about any challenge to it."
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
            "plain": "Declared an emergency and let Moroccan phosphate fertilizer enter duty-free for up to eight months, waiving the countervailing duties that otherwise applied.",
            "rationale": "Directs the Secretary of the Treasury and the Secretary of Commerce, under section 318 of the Tariff Act of 1930 (19 U.S.C. 1318(a)), to permit importation of phosphate fertilizers of the Kingdom of Morocco free of the collection of duties and of deposits of estimated duties under sections 1671, 1675 and 1677j of title 19 — the countervailing-duty provisions — for up to eight months or until the declared emergency terminates."
          },
          {
            "issueKey": "tariffs_growth",
            "direction": "opposes",
            "isPrimary": false,
            "weight": 70,
            "plain": "Chose duty-free foreign supply as the answer to a fertilizer shortfall, on the finding that building domestic capacity would take time.",
            "rationale": "Paragraph 4 states that United States production of phosphate fertilizer is insufficient to support domestic agricultural food production after accounting for exports, and that although the Federal Government is working with the private sector to expand domestic fertilizer manufacturing capacity, \"those efforts will take time to increase the supply materially\" — so the interim answer chosen is duty-free foreign supply rather than the tariff."
          },
          {
            "issueKey": "tariffs_prices",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Waived a duty on a farm input during the spring application window, on the stated ground that supply-chain disruption was driving rapid price increases.",
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
        "documentId": "Proclamation 11041",
        "title": "Regulatory Relief for Certain Stationary Sources To Promote American Chemical Manufacturing Security",
        "actedAt": "2026-07-09",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/07/16/2026-14452/regulatory-relief-for-certain-stationary-sources-to-promote-american-chemical-manufacturing-security",
        "sourceLabel": "Federal Register — Proclamation 11041, 91 FR 44719",
        "frCitation": "91 FR 44719",
        "frDocumentNumber": "2026-14452",
        "publishedAt": "2026-07-16",
        "issues": [
          {
            "issueKey": "climate_action",
            "direction": "opposes",
            "isPrimary": true,
            "weight": 75,
            "plain": "Exempted the chemical plants named in its annex from the 2024 hazardous air pollutant standards for an additional two-year period past their compliance dates, leaving the older, looser limits in force for them.",
            "rationale": "The proclamation exempts stationary sources identified in Annex I from compliance with those aspects of the 2024 rule at 89 FR 42932 that were promulgated under section 112 of the Clean Air Act, 42 U.S.C. 7412, for a period of two years beyond the rule's relevant compliance dates, using the exemption power in section 112(i)(4). Its stated effect is that during each such two-year period those sources remain subject to the emissions and compliance obligations that applied under the standard as it existed before that rule."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-07-16",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11041 document record, 91 FR 44719",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/07/16/2026-14452/regulatory-relief-for-certain-stationary-sources-to-promote-american-chemical-manufacturing-security",
            "note": "The register's disposition record for this proclamation carries no revocation, amendment or supersession, so it stands as published. The exemption is time-limited by its own terms to two years beyond each affected compliance date, and this row asserts nothing about what happens at the end of that period. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "directive",
        "documentId": "Proclamation 11043",
        "title": "Modifying the Bears Ears National Monument",
        "actedAt": "2026-07-13",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/07/17/2026-14548/modifying-the-bears-ears-national-monument",
        "sourceLabel": "Federal Register — Proclamation 11043, 91 FR 45169",
        "frCitation": "91 FR 45169",
        "frDocumentNumber": "2026-14548",
        "publishedAt": "2026-07-17",
        "issues": [
          {
            "issueKey": "energy_production",
            "direction": "advances",
            "isPrimary": true,
            "weight": 65,
            "plain": "Cut roughly 1.24 million acres from Bears Ears National Monument, citing the need to reduce reliance on foreign sources of resources found inside the old boundary.",
            "rationale": "Among the findings recited before the operative clause is that the need to reduce the Nation's reliance on foreign sources of several resources vital to economic and national security, including resources located within the historic and current boundaries of the Monument, is greater than it was in 2017, and that this further necessitates the exclusion of lands retained within the Monument by Proclamation 9681. The operative clause then excludes approximately 1,238,904 acres and leaves reserved federal lands of approximately 121,096 acres in the Indian Creek Unit and the Shash Jaa Unit."
          },
          {
            "issueKey": "lands_energy",
            "direction": "advances",
            "isPrimary": false,
            "weight": 60,
            "plain": "Shrinking the monument returns that federal acreage to the general land rules, subject to valid existing rights, rather than monument protection.",
            "rationale": "The proclamation acts under section 320301 of title 54, United States Code, to modify the boundaries of the Bears Ears National Monument, and provides that any lands reserved by Proclamations 9558, 9681 or 10285 that fall outside the boundaries on the accompanying map are excluded from the Monument, with the exclusion taking effect at 9:00 a.m. eastern daylight time on the date 60 days after the proclamation, subject to valid existing rights and the provisions of existing withdrawals."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-07-17",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Proclamation 11043 document record, 91 FR 45169",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/07/17/2026-14548/modifying-the-bears-ears-national-monument",
            "note": "The register's disposition record for this proclamation carries no revocation, amendment or supersession, so it stands as published. The exclusion takes effect by the proclamation's own terms 60 days after July 13, 2026, subject to valid existing rights, the provisions of existing withdrawals and the requirements of applicable law. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14418",
        "executiveOrderNumber": 14418,
        "title": "Continuing To Protect the Meaning and Value of American Citizenship",
        "actedAt": "2026-08-06",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/08/11/2026-16403/continuing-to-protect-the-meaning-and-value-of-american-citizenship",
        "sourceLabel": "Federal Register — Executive Order 14418, 91 FR 51991",
        "frCitation": "91 FR 51991",
        "frDocumentNumber": "2026-16403",
        "publishedAt": "2026-08-11",
        "issues": [
          {
            "issueKey": "immigration_reform",
            "direction": "advances",
            "isPrimary": true,
            "weight": 90,
            "plain": "Directs federal agencies to stop issuing or accepting documents recognizing citizenship for a person born here to two noncitizen parents in four listed situations, among them a parent who is an alien enemy or a foreign government employee. It narrows who is treated as a citizen at birth.",
            "rationale": "Section 2 sets the policy that no executive department or agency shall issue documents recognizing United States citizenship to, or accept documents purporting to recognize it regarding, persons neither of whose parents is a citizen where any of four conditions applies: a parent is an alien enemy as defined in the order; a parent is a foreign government employee as defined in the order; a parent engaged in a commercial transaction to purchase or access birthright citizenship, including a transaction to ensure the mother is present in the United States to give birth or a transaction with a surrogate so present; or the person is born in a territory or territorial waters where citizenship is not conferred by federal statute. Section 3(a) directs the Secretary of State, the Attorney General, the Secretary of Homeland Security and the Commissioner of Social Security to ensure their regulations and policies align with the order, and section 3(b) directs all agency heads to issue public implementation guidance within 30 days."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-08-11",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14418 document record, 91 FR 51991",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/08/11/2026-16403/continuing-to-protect-the-meaning-and-value-of-american-citizenship",
            "note": "The register's disposition record for this order carries no revocation, amendment or supersession, so it stands as published. Published August 11, 2026, five days after signature. This is not a statement about any challenge to it."
          }
        ]
      },
      {
        "actionClass": "executive_order",
        "documentId": "Executive Order 14419",
        "executiveOrderNumber": 14419,
        "title": "Ending Birth Tourism",
        "actedAt": "2026-08-06",
        "term": "47",
        "sourceUrl": "https://www.federalregister.gov/documents/2026/08/11/2026-16404/ending-birth-tourism",
        "sourceLabel": "Federal Register — Executive Order 14419, 91 FR 51993",
        "frCitation": "91 FR 51993",
        "frDocumentNumber": "2026-16404",
        "publishedAt": "2026-08-11",
        "issues": [
          {
            "issueKey": "immigration_reform",
            "direction": "advances",
            "isPrimary": true,
            "weight": 80,
            "plain": "Defines birth tourism — entering on a temporary visa in order to give birth on U.S. soil — and sets preventing it as the policy governing those visa classifications.",
            "rationale": "Section 3 defines birth tourism as the entry of a foreign national into the United States via a nonimmigrant visa for the purpose of giving birth on American soil, or any effort by a foreign national to facilitate such entry. Section 1 states the policy of preventing the exploitation of nonimmigrant visa classifications by persons engaging in birth tourism, on the ground that it enables foreign nationals to exploit temporary admission to obtain permanent immigration-related benefits."
          },
          {
            "issueKey": "border_security",
            "direction": "advances",
            "isPrimary": false,
            "weight": 70,
            "plain": "Delegates the President's entry-control power so State and Homeland Security can refuse or revoke visas, bar entry and act against the people and entities that arrange such travel.",
            "rationale": "Section 2 delegates to the Secretary of State and the Secretary of Homeland Security the President's authority under section 215(a) of the Immigration and Nationality Act, 8 U.S.C. 1185(a), to the extent necessary to implement the order. Section 4(a) provides that action may include preventing entry or the granting of any visa or travel authorization to an alien entering or attempting to enter for the purpose of engaging in birth tourism, revoking the visa or travel authorization and permanently barring entry of such an alien, denial of entry to or removal of an alien who previously engaged or plans to engage in birth tourism, and action against entities or individuals inside or outside the United States responsible for facilitating it."
          },
          {
            "issueKey": "deportations",
            "direction": "advances",
            "isPrimary": false,
            "weight": 65,
            "plain": "Names removal among the tools available against a foreign national who engaged or plans to engage in birth tourism, with humanitarian and national-interest exemptions.",
            "rationale": "Section 4(a) names removal among the actions the Secretaries may take within their respective discretion and authority, applying it to any alien who previously engaged or plans to engage in birth tourism. Section 5 provides that the Secretary of State or the Secretary of Homeland Security may exempt a foreign national from actions taken pursuant to the order on humanitarian grounds or where entry is in the national interest."
          }
        ],
        "status": [
          {
            "status": "in_force",
            "effectiveAt": "2026-08-11",
            "authority": "Issued by the President and published in the Federal Register",
            "basis": "register_disposition",
            "sourceLabel": "Federal Register — Executive Order 14419 document record, 91 FR 51993",
            "sourceUrl": "https://www.federalregister.gov/documents/2026/08/11/2026-16404/ending-birth-tourism",
            "note": "The register's disposition record for this order carries no revocation, amendment or supersession, so it stands as published. Published August 11, 2026, five days after signature; it is the newest presidential document this pass placed on file. This is not a statement about any challenge to it."
          }
        ]
      }
    ]
  };
})();
