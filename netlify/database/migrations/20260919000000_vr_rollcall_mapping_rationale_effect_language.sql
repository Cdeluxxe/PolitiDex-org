-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — effect language for the mapping rationales under judged roll calls
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PROBLEM
-- A member issue dossier can be entirely correct and still teach nothing. On a
-- Contradicted or Mixed row the reader has been told the member SAID they support
-- something and that the formal record reads "0 aligned · N against", and then the
-- votes underneath are listed by bill title with a multi-issue chip. Nothing on the
-- face says what part of the measure is about THIS issue, so the verdict reads as
-- an assertion. That is worst on the appropriations and omnibus rows, where the
-- short title names an account family and the issue was scored off one amendment,
-- one division or one section inside it.
--
-- The curated prose table in consistency.js now carries a written "what it did" and
-- "why it counts here" for every judged roll-call act on those rows. This migration
-- does the other half, in the data: the `rationale` column is the mapping's own
-- audit trail — why this measure is on this issue's list at this weight — and it is
-- printed to the reader, one fold below the roll call ("Why this measure is on this
-- list", consistency.js) and under the bundled-issues list in bill-detail.js.
--
-- 14 of the rationales sitting under judged roll-call acts were shorter than the
-- line already on the face. They named a category rather than an effect:
--
--   "Tightens immigration enforcement."                          (33 chars)
--   "Modestly reduces outlays against the federal deficit."       (53 chars)
--   "Enacts net spending reductions through budget reconciliation." (61 chars)
--
-- Each of those is true and none of them can be checked. A reader cannot tell which
-- section did it, how much of the bill it was, or why the mapping carries the weight
-- it carries. Below 40 characters the fold does not even open, so three of these
-- were invisible as well as thin.
--
-- THE FIX
-- Every row below is rewritten from the measure text already on file — the summary
-- in vr_measures, the identity record in db/vr-measure-identity.json, and the
-- operative sections the existing curated entries were written from. Each new
-- rationale states the operative provision, then what a yea therefore does, then
-- the weighting reason where the mapping is narrow or secondary. Nothing is
-- invented: where the repo does not hold a division letter or a dollar figure, the
-- sentence does not assert one.
--
-- WHAT THIS DOES NOT TOUCH
-- No weight, no is_primary, no support_meaning, no issue_key, no vote, no measure.
-- The same roll calls count the same way for the same members at the same strength;
-- Direction Match and every issue verdict are byte-identical before and after. This
-- is the explanation changing, not the score. Additive and idempotent: each
-- statement is a keyed UPDATE that can be re-run.
--
-- Mirrored into db/vr-issue-seed.json in the same change, because the shipped seed
-- is what the static site and the offline harnesses read.

-- ── Appropriations and omnibus vehicles: the "one vote, many issues" case ────

-- H.R. 8595 (119) — FY2027 national security / State Dept appropriations. The
-- vehicle also carries the SAVE Act, which is why the elections rows exist on it
-- and why this row is weighted at 60 rather than at a defence authorisation's level.
UPDATE vr_measure_issues
   SET rationale = 'The Act makes the fiscal 2027 appropriations for national security, State Department and related programs, so a yea funds those accounts for the year. Weighted 60 rather than at the primary because an appropriations vehicle sets amounts for programs already authorised elsewhere and takes no position on force structure, procurement or posture — and because the same bill carries the SAVE Act, which is scored on the elections rows rather than here.'
 WHERE issue_key = 'strong_defense'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 8595' AND congress = 119);

-- H.R. 1 (119) — 2025 reconciliation act. Four of its rows are judged and three of
-- them were category labels. Each names the title it is scored off.
UPDATE vr_measure_issues
   SET rationale = 'The act makes permanent and extends the individual and business tax provisions of the 2017 tax act and raises the maximum child tax credit to $2,200 per child, indexed for inflation from 2026. Lower income and business taxes are this chip''s subject and they are the act''s headline title, so a yea is a direct vote to cut and extend them.'
 WHERE issue_key = 'lower_taxes'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'The act''s spending reductions sit in the Medicaid title — lower federal Medicaid spending with tighter enrolment and eligibility processes — and in raising the SNAP able-bodied-adult work-requirement age from 55 to 65; a yea enacts them. Weighted 70 rather than at the primary because the same act''s tax title runs the other way on the fiscal total and is read on its own chip rather than netted out here.'
 WHERE issue_key = 'cut_spending'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'The act reduces federal Medicaid spending and tightens Medicaid enrolment and eligibility processes, so fewer applicants qualify and the federal share behind those who do is smaller. This chip''s support direction is coverage getting easier to obtain and keep, so the same yea that counts for the act''s tax title is coded against the issue here.'
 WHERE issue_key = 'healthcare'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'The act appropriates new funding for border enforcement and immigration operations — the staffing and operational money this chip measures — so a yea funds them. Weighted 55 because it is one appropriation inside a reconciliation act whose controlling business is taxes and spending, so a nay may be about the rest of the bill.'
 WHERE issue_key = 'border_security'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 1' AND congress = 119);

-- H.R. 4 (119) — the July 2025 rescissions act.
UPDATE vr_measure_issues
   SET rationale = 'The act cancels unobligated balances Congress had already appropriated to the State Department, USAID, several related agencies and the Corporation for Public Broadcasting, acting on the rescissions the President proposed in June 2025. Taking back money already appropriated is the most direct form of the spending cut this chip measures, so a yea is a vote for one.'
 WHERE issue_key = 'cut_spending'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'Cancelling unobligated balances lowers federal outlays by the amount rescinded, so a yea reduces the deficit by that amount. Weighted 40 because the enacted total is small against the deficit — smaller again than the version the House passed, after the Senate carved out global health, food aid and several other accounts — and because the act changes no revenue source, entitlement or fiscal rule.'
 WHERE issue_key = 'national_debt'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4' AND congress = 119);

-- ── Standalone bills whose rationale named a category, not a provision ───────

-- The two Laken Riley vehicles. Both were "Tightens immigration enforcement."
UPDATE vr_measure_issues
   SET rationale = 'Section 2 requires the Department of Homeland Security to detain an inadmissible alien charged with, arrested for, convicted of or admitting burglary, theft, larceny or shoplifting, to issue a detainer and take custody from state or local police, and to place them in removal proceedings. Detaining and removing people already found inadmissible is interior enforcement of the same immigration line this chip measures at the border, so a yea tightens it. Weighted 70 rather than at the primary because the bill adds no border infrastructure, personnel or asylum change of its own.'
 WHERE issue_key = 'border_security'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 29' AND congress = 119);

UPDATE vr_measure_issues
   SET rationale = 'The Senate vehicle for the Laken Riley Act removes the discretion to release a covered non-citizen from custody once they have been charged, so the immigration laws are enforced through mandatory custody rather than at the line itself; a yea tightens that enforcement. Weighted 70 rather than at the primary because the act adds no border personnel, technology or funding.'
 WHERE issue_key = 'border_security'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 5' AND congress = 119);

-- S. 331 (119) — HALT Fentanyl Act.
UPDATE vr_measure_issues
   SET rationale = 'The act applies the quantity thresholds and mandatory-minimum sentences already carried by individual fentanyl analogues to the whole class of fentanyl-related substances, so 100 grams or more triggers a ten-year mandatory minimum. Longer mandatory sentences reached through a lower threshold is what this chip measures, so a yea counts as support. Weighted 75 rather than at the primary because the act''s subject is scheduling and the sentencing effect follows from it.'
 WHERE issue_key = 'tough_on_crime'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 331' AND congress = 119);

-- H.R. 2965 (119) — small-business regulatory budget.
UPDATE vr_measure_issues
   SET rationale = 'The bill requires the Small Business Administration to hold its annual regulatory budget at no more than zero: the net compliance cost its new rules impose on a small business must be offset by cost removed through modifying or repealing existing rules. The budget is scoped to the burden small businesses carry, so a yea caps it. Weighted 80 rather than at the primary because the bill''s controlling subject is the regulatory cap itself, which is read on the red-tape chip.'
 WHERE issue_key = 'econ_smallbiz'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 2965' AND congress = 119);

-- H.R. 4346 (117) — CHIPS and Science Act.
UPDATE vr_measure_issues
   SET rationale = 'The act appropriates new budget authority for the CHIPS funds with no offsetting revenue or spending reduction, so a yea adds to the deficit. Weighted 45 because the deficit effect is a by-product of the semiconductor programme rather than its purpose, and the act changes no revenue baseline, entitlement or fiscal rule.'
 WHERE issue_key = 'national_debt'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 4346' AND congress = 117);

-- H.R. 3076 (117) — Postal Service Reform Act.
UPDATE vr_measure_issues
   SET rationale = 'The act requires the Postal Service to publish an online public dashboard of service-performance data broken down by delivery unit — a standing disclosure any member of the public can open, not a report to Congress. Weighted 45 because the act''s controlling subject is postal finance and service standards, and the dashboard is one provision inside it.'
 WHERE issue_key = 'gov_transparency'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'H.R. 3076' AND congress = 117);

-- S. 3373 (117) — PACT Act.
UPDATE vr_measure_issues
   SET rationale = 'The act opens VA health-care enrolment and treatment to veterans exposed to toxic substances and sets presumptions of service connection for conditions tied to burn pits and Agent Orange, so the mechanism is an expansion of who a federal health system will treat rather than only cash benefits; a yea counts as support. Weighted 50 because it widens one federal system for one population rather than coverage generally.'
 WHERE issue_key = 'healthcare'
   AND measure_id IN (SELECT id FROM vr_measures WHERE number = 'S. 3373' AND congress = 117);
