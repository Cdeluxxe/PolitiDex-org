--- ─────────────────────────────────────────────────────────────────────────────
--- Instrument summaries, wave 1 — what the writing ORDERS, read off the writing
--- ─────────────────────────────────────────────────────────────────────────────
--- THE DEFECT
---
--- A measure sheet opens on a number, a title, a date and a link. Where the
--- archive holds no description it says so, in as many words, which is honest —
--- but on the two instruments below it held a description that was barely one:
--- a signing sentence and a single restatement of the mapping rationale. So the
--- title did the talking, and the title of a presidential memorandum is
---
---   "Delivering Emergency Price Relief for American Families and Defeating the
---    Cost-of-Living Crisis"
---
--- which names no lever at all. A reader could not tell from this face whether
--- the document strikes a rule, spends money, pauses a program or asks for a
--- memo — and a reader who takes the title as the description has been handed a
--- slogan and told it is a finding. The same face carries the Federal Register
--- link the whole time, so the fix is not new evidence: it is reading the
--- evidence already cited and writing down what it directs.
---
--- WHAT THIS PASS WRITES
---
--- vr_measures.summary — the ONE description column the sheet already renders and
--- db/vr-measure-identity.json already fills for floor bills — for exactly two
--- rows, both executive instruments already mapped and already live on a profile:
---
---   Presidential Memorandum, 90 FR 8245  (cost_living, in force)
---   Executive Order 14162                (climate_action, in force)
---
--- Nothing else is touched. No row is created, no title is rewritten, no mapping,
--- rationale, status or issue key moves, and no floor bill gets a summary here:
--- a bill with no CRS text on file keeps saying it has none, because the fix for
--- that is to read its text, not to write around it.
---
--- SOURCING — both summaries were written from the official text, not from the
--- title, not from the mapping rationale, and not from any secondary description
---
---   90 FR 8245   https://www.federalregister.gov/documents/full_text/text/2025/01/28/2025-01904.txt
---                Memorandum of January 20, 2025, published 2025-01-28. One
---                unnumbered directive paragraph plus a reporting clause.
---   EO 14162     https://www.federalregister.gov/documents/full_text/text/2025/01/30/2025-02010.txt
---                Executive Order 14162 of January 20, 2025, published 2025-01-30.
---                Sec. 3(a)-(g) are the operative directives; Sec. 4 is the
---                standard general-provisions clause and is not summarised.
---
--- THE RULES THE PROSE FOLLOWS, which are the reason this is a curation pass and
--- not a generation pass:
---
---   · LEVERS ONLY. Who must do what, by when, and what is revoked, rescinded,
---     withdrawn from or reported. Where the document names a deadline the
---     summary names the same deadline. Where it names an officer the summary
---     names the same officer.
---   · NOT IN THE SOURCE, NOT IN THE SUMMARY. EO 14162's Sec. 1 and Sec. 2 state
---     a purpose and a policy and direct nobody; they are not summarised as
---     though they were levers. The memorandum's five areas are given in its own
---     terms and attributed to it where the phrasing is its characterisation
---     rather than an operative direction.
---   · NO EFFECT CLAIM. Neither summary says a price moved, a cost fell, a family
---     was helped or a policy worked, and neither names a party. An instrument in
---     force is an instrument in force: standing describes the writing, not its
---     effect, and this column carries what the writing orders and stops there.
---
--- IDEMPOTENCE. Each UPDATE is guarded by `summary IS DISTINCT FROM` the exact
--- text it writes, so re-running is a no-op, and by number + executive chamber,
--- so it can only ever touch the instrument it names. A database where the row
--- does not exist yet (the wave-4 seed creates both) is left alone with a NOTICE
--- rather than an exception: this pass has nothing to say about a corpus that has
--- not reached wave 4.
--- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  s text;
  n integer;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- @summary-seed number="Presidential Memorandum, 90 FR 8245"
  -- @summary-source https://www.federalregister.gov/documents/2025/01/28/2025-01904/delivering-emergency-price-relief-for-american-families-and-defeating-the-cost-of-living-crisis
  -- ═══════════════════════════════════════════════════════════════════════════
  s := 'Orders the heads of all executive departments and agencies to deliver '
    || 'emergency price relief to the American people. '
    || 'Names the areas that relief is to be pursued in: lowering the cost of '
    || 'housing and expanding housing supply; eliminating administrative expense '
    || 'and rent-seeking practices in health care; removing requirements the '
    || 'memorandum says raise the cost of home appliances; creating employment '
    || 'opportunities for American workers, including bringing discouraged workers '
    || 'back into the labor force; and eliminating climate policies it calls '
    || 'coercive. '
    || 'Requires the Assistant to the President for Economic Policy to report to '
    || 'the President on implementation within 30 days of the memorandum and every '
    || '30 days after that. '
    || 'Names no rule to amend, no program to pause and no sum of money: what each '
    || 'department does under the order is left to that department. '
    || 'The memorandum is a direction to agencies and a reporting clock, and this '
    || 'summary is a reading of its text rather than a statement about any price.';

  UPDATE vr_measures
     SET summary = s, updated_at = now()
   WHERE chamber = 'executive'
     AND number = 'Presidential Memorandum, 90 FR 8245'
     AND summary IS DISTINCT FROM s;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE NOTICE 'summary seed: 90 FR 8245 already current or not present (0 rows)';
  ELSE
    RAISE NOTICE 'summary seed: 90 FR 8245 updated (% row(s))', n;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- @summary-seed number="Executive Order 14162"
  -- @summary-source https://www.federalregister.gov/documents/2025/01/30/2025-02010/putting-america-first-in-international-environmental-agreements
  -- ═══════════════════════════════════════════════════════════════════════════
  s := 'Directs the United States Ambassador to the United Nations to submit '
    || 'immediate written notice that the United States is withdrawing from the '
    || 'Paris Agreement; the notice is attached to the order and the withdrawal '
    || 'takes effect on delivery. '
    || 'Directs the same officer to notify withdrawal from any other agreement, '
    || 'pact or accord made under the United Nations Framework Convention on '
    || 'Climate Change. '
    || 'Directs the Ambassador, with the Secretaries of State and the Treasury, to '
    || 'cease or revoke every financial commitment the United States made under '
    || 'that convention. '
    || 'Revokes and rescinds the U.S. International Climate Finance Plan, and gives '
    || 'the Director of the Office of Management and Budget 10 days to issue '
    || 'guidance rescinding all frozen funds. '
    || 'Gives 30 days for the Secretaries of State, the Treasury, Commerce, Health '
    || 'and Human Services, Energy and Agriculture, the EPA and USAID '
    || 'Administrators, and the heads of the four federal financing bodies it names '
    || 'to report which policies advancing that plan they revoked or rescinded. '
    || 'Requires a certified report to the Assistants to the President for Economic '
    || 'Policy and for National Security Affairs once the notices and revocations '
    || 'are complete.';

  UPDATE vr_measures
     SET summary = s, updated_at = now()
   WHERE chamber = 'executive'
     AND number = 'Executive Order 14162'
     AND summary IS DISTINCT FROM s;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE NOTICE 'summary seed: EO 14162 already current or not present (0 rows)';
  ELSE
    RAISE NOTICE 'summary seed: EO 14162 updated (% row(s))', n;
  END IF;
END $$;
