-- ─────────────────────────────────────────────────────────────────────────────
-- Voting Record — wave 19: Governors & Secretaries of State enter the record
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS WAVE: Wave 18 brought state attorneys general into the Voting Record for
-- the first time. Two large groups the site already profiles with stated positions
-- were still entirely absent from the accountability layer: the 50 GOVERNORS and the
-- 16 SECRETARIES OF STATE. This wave lights both up, keyed to the SAME roster slugs
-- their profiles and stances use, so their concrete actions line up with their words
-- in Say-vs-Do and each item surfaces under the Spotlights/issues it shares a key
-- with.
--
-- Two connected, timely threads (mid–late 2025):
--   1) The National Guard federalization disputes. When the President federalized
--      state National Guard units over governors' objections, three governors went
--      to court to stop the deployments in their states. These are modeled as
--      litigation measures (measure_type='litigation', chamber='court') with the
--      governor AND the state attorney general as named plaintiffs — bringing the
--      governors in as first-class actors and reinforcing the AGs from wave 18.
--   2) The SAVE Act (H.R. 22), a proof-of-citizenship voter-registration bill ALREADY
--      in the record. Secretaries of State — the officials who actually run
--      elections — took public, on-record positions on it. Those are added as
--      'statement' positions ON the existing measure, connecting the SoS profiles to
--      a bill, an issue (election_integrity), and its Spotlights.
--
-- BALANCE / NEUTRALITY: the Guard cases record only what was filed, by whom, and the
-- dated court steps — no verdict framing. The SoS positions are deliberately
-- bipartisan: three Democratic secretaries who opposed the SAVE Act and one
-- Republican secretary who supported citizenship-verification, each on its own
-- source. Litigation status stays at the neutral 'pending'; the timeline carries the
-- court outcomes. Every politician_id is verified against the roster; every issue_key
-- against db/issue-keys.json; every source is an official government page or a major
-- outlet.
--
-- ADDITIVE + IDEMPOTENT: measures inserted only when absent (guarded by title);
-- issues/actions guarded; positions use ON CONFLICT DO NOTHING. The SoS block is a
-- no-op if H.R. 22 is not present. Rolls forward from the applied migrations; edits
-- none. Safe to re-run.

DO $$
DECLARE
  m_caguard integer;
  m_ilguard integer;
  m_orguard integer;
  m_save    integer;
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- 1 · California National Guard federalization — Newsom v. Trump (filed Jun 2025)
  --     Governor Newsom and AG Bonta sued after the President federalized part of the
  --     California National Guard during Los Angeles protests without the governor's
  --     consent, arguing it exceeded federal statutory authority and infringed the
  --     governor's role as commander-in-chief of the state Guard.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_caguard FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'California challenge to the National Guard federalization (Newsom v. Trump)' LIMIT 1;
  IF m_caguard IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Newsom v. Trump (N.D. Cal. 3:25-cv-04870)',
       'California challenge to the National Guard federalization (Newsom v. Trump)',
       'California National Guard (Newsom v. Trump)',
       'California Governor Gavin Newsom and Attorney General Rob Bonta sued the federal government after the President federalized part of the California National Guard during June 2025 protests in Los Angeles without the governor''s consent. The suit argued the move exceeded the President''s authority under 10 U.S.C. 12406 and infringed the governor''s role as commander-in-chief of the state Guard.',
       'pending', 'gavin_newsom',
       'https://www.gov.ca.gov/2025/06/09/governor-newsom-suing-president-trump-and-department-of-defense-for-illegal-takeover-of-calguard-unit/', 'Office of the Governor of California',
       '{"court":"U.S. District Court, N.D. Cal. / 9th Circuit","docketNumber":"3:25-cv-04870"}')
    RETURNING id INTO m_caguard;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_caguard, 'gov_balance',       100, true,  'yea_supports', 'A federalism dispute over the limits of federal authority to command a state''s National Guard without the governor''s consent.'),
      (m_caguard, 'democracy_balance',  70, false, 'yea_supports', 'Tests statutory and constitutional checks on the use of federalized military force domestically.'),
      (m_caguard, 'immig_balance',      35, false, 'yea_supports', 'The deployment followed protests over federal immigration-enforcement operations in Los Angeles; the immigration context is recorded neutrally.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_caguard, 'other', 'court', '2025-06-09T00:00:00Z', 'California''s governor and attorney general filed suit challenging the federalization of the California National Guard.', 'https://oag.ca.gov/news/press-releases/attorney-general-bonta-governor-newsom-challenge-trump-order-seeking-federalize', 'California Attorney General', 10),
      (m_caguard, 'other', 'court', '2025-06-19T00:00:00Z', 'A Ninth Circuit panel stayed the district court''s order, allowing the federalization to continue while the case proceeded.', 'https://cdn.ca9.uscourts.gov/datastore/opinions/2025/06/19/25-3727.pdf', 'U.S. Court of Appeals, 9th Circuit', 20),
      (m_caguard, 'other', 'court', '2025-12-10T00:00:00Z', 'A federal judge ordered the Los Angeles National Guard deployment to end; the deployment wound down at the end of 2025.', 'https://www.gov.ca.gov/2025/12/10/federal-court-to-trump-keeping-a-standing-army-is-illegal-the-federalization-of-californias-national-guard-must-end/', 'Office of the Governor of California', 30);

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_caguard, 'gavin_newsom', 'plaintiff', true, '2025-06-09T00:00:00Z', 'https://www.gov.ca.gov/2025/06/09/governor-newsom-suing-president-trump-and-department-of-defense-for-illegal-takeover-of-calguard-unit/', 'Governor of California; lead plaintiff challenging the federalization of the state National Guard.'),
      (m_caguard, 'rob_bonta',    'plaintiff', true, '2025-06-09T00:00:00Z', 'https://oag.ca.gov/news/press-releases/attorney-general-bonta-governor-newsom-challenge-trump-order-seeking-federalize', 'California Attorney General; co-filed the challenge.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2 · Illinois National Guard deployment — Illinois v. Trump (filed Oct 2025)
  --     Governor Pritzker and AG Raoul sued to block the deployment of National Guard
  --     troops to the Chicago area. Later dismissed as moot after the deployment ended.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_ilguard FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'Illinois challenge to the National Guard deployment to Chicago' LIMIT 1;
  IF m_ilguard IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Illinois v. Trump (N.D. Ill., 2025)',
       'Illinois challenge to the National Guard deployment to Chicago',
       'Illinois National Guard (Illinois v. Trump)',
       'Illinois Governor JB Pritzker, the State of Illinois, and the City of Chicago sued to block the deployment of National Guard troops to the Chicago area in October 2025, arguing it violated the Posse Comitatus Act and exceeded federal authority. A court blocked the deployment; the case was later dismissed as moot after the deployment ended.',
       'pending', 'jb_pritzker',
       'https://www.nbcnews.com/politics/trump-administration/illinois-sues-trump-administration-national-guard-deployment-chicago-rcna235900', 'NBC News',
       '{"court":"U.S. District Court, N.D. Ill."}')
    RETURNING id INTO m_ilguard;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_ilguard, 'gov_balance',       100, true,  'yea_supports', 'A federalism dispute over federal deployment of National Guard troops into a state over the governor''s objection.'),
      (m_ilguard, 'democracy_balance',  70, false, 'yea_supports', 'Raises Posse Comitatus Act limits on using the military for domestic law enforcement.'),
      (m_ilguard, 'immig_balance',      35, false, 'yea_supports', 'The deployment was tied to protests near a federal immigration facility; the immigration context is recorded neutrally.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_ilguard, 'other', 'court', '2025-10-06T00:00:00Z', 'Illinois and Chicago filed suit to block the National Guard deployment, citing the Posse Comitatus Act.', 'https://capitolnewsillinois.com/news/illinois-sues-to-block-trumps-national-guard-deployment-to-chicago/', 'Capitol News Illinois', 10),
      (m_ilguard, 'other', 'court', '2025-10-09T00:00:00Z', 'A federal judge blocked the deployment, finding the Guard was not trained for the law-enforcement role at issue.', 'https://www.cbsnews.com/chicago/news/judge-ruling-on-national-guard-lawsuit-illinois-chicago/', 'CBS News Chicago', 20),
      (m_ilguard, 'other', 'court', '2025-12-31T00:00:00Z', 'After the deployment ended, the court dismissed the case as moot.', 'https://www.cbsnews.com/chicago/news/illinois-lawsuit-trump-national-guard-chicago-dismissed/', 'CBS News Chicago', 30);

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_ilguard, 'jb_pritzker', 'plaintiff', true, '2025-10-06T00:00:00Z', 'https://capitolnewsillinois.com/news/illinois-sues-to-block-trumps-national-guard-deployment-to-chicago/', 'Governor of Illinois; lead plaintiff seeking to block the National Guard deployment to Chicago.'),
      (m_ilguard, 'kwame_raoul', 'plaintiff', true, '2025-10-06T00:00:00Z', 'https://capitolnewsillinois.com/news/illinois-sues-to-block-trumps-national-guard-deployment-to-chicago/', 'Illinois Attorney General; co-filed the challenge.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3 · Oregon / Portland National Guard — Oregon v. Trump (filed Sep–Oct 2025)
  --     Governor Kotek, the State of Oregon and the City of Portland sued to block a
  --     Guard deployment to Portland; California later joined after the administration
  --     tried to route California troops into Oregon. A judge permanently blocked it.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_orguard FROM vr_measures
    WHERE measure_type = 'litigation' AND title = 'Oregon challenge to the National Guard deployment to Portland' LIMIT 1;
  IF m_orguard IS NULL THEN
    INSERT INTO vr_measures
      (measure_type, congress, chamber, number, title, short_title, summary, status, sponsor_id, source_url, source_label, external_ids)
    VALUES
      ('litigation', NULL, 'court', 'Oregon v. Trump (D. Or., 2025)',
       'Oregon challenge to the National Guard deployment to Portland',
       'Oregon National Guard (Oregon v. Trump)',
       'Oregon Governor Tina Kotek, the State of Oregon and the City of Portland sued to block the federalized deployment of National Guard troops to Portland in fall 2025. California joined the suit after the administration attempted to send California troops into Oregon. A federal judge permanently blocked the deployment.',
       'pending', 'tina_kotek',
       'https://oregoncapitalchronicle.com/2025/11/07/federal-judge-finds-trump-guard-deployment-to-portland-illegal/', 'Oregon Capital Chronicle',
       '{"court":"U.S. District Court, D. Oregon"}')
    RETURNING id INTO m_orguard;

    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary, support_meaning, rationale) VALUES
      (m_orguard, 'gov_balance',       100, true,  'yea_supports', 'A federalism dispute over federalizing and deploying National Guard troops into a state over the governor''s objection.'),
      (m_orguard, 'democracy_balance',  70, false, 'yea_supports', 'Tests statutory limits on domestic use of federalized military force.'),
      (m_orguard, 'immig_balance',      35, false, 'yea_supports', 'The deployment order followed protests at a federal immigration facility in Portland; the context is recorded neutrally.');

    INSERT INTO vr_measure_actions (measure_id, stage, chamber, action_date, text, source_url, source_label, sort_order) VALUES
      (m_orguard, 'other', 'court', '2025-10-04T00:00:00Z', 'A federal judge issued an order blocking the deployment of the Oregon National Guard, finding insufficient justification.', 'https://www.cnn.com/2025/10/06/us/oregon-national-guard-trump-ruling-portland-hnk', 'CNN', 10),
      (m_orguard, 'other', 'court', '2025-11-07T00:00:00Z', 'After a three-day trial, the judge permanently blocked the National Guard deployment to Portland.', 'https://www.cbsnews.com/news/judge-permanently-blocks-trump-administration-deploying-national-guard-troops-portland/', 'CBS News', 20);

    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_orguard, 'tina_kotek',   'plaintiff', true, '2025-10-04T00:00:00Z', 'https://oregoncapitalchronicle.com/2025/11/07/federal-judge-finds-trump-guard-deployment-to-portland-illegal/', 'Governor of Oregon; lead plaintiff seeking to block the National Guard deployment to Portland.'),
      (m_orguard, 'dan_rayfield', 'plaintiff', true, '2025-10-04T00:00:00Z', 'https://oregoncapitalchronicle.com/2025/11/07/federal-judge-finds-trump-guard-deployment-to-portland-illegal/', 'Oregon Attorney General; co-filed the challenge.'),
      (m_orguard, 'gavin_newsom', 'plaintiff', true, '2025-10-05T00:00:00Z', 'https://oregoncapitalchronicle.com/2025/11/07/federal-judge-finds-trump-guard-deployment-to-portland-illegal/', 'Governor of California; California joined the Oregon suit after the administration attempted to route California troops into Oregon.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4 · Secretaries of State on the SAVE Act (H.R. 22) — statement positions on the
  --     EXISTING measure. The officials who run elections took public positions on the
  --     proof-of-citizenship registration bill. Recorded as on-record statements, both
  --     sides represented. No-op if H.R. 22 is not present.
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT id INTO m_save FROM vr_measures WHERE number = 'H.R. 22' AND congress = 119 LIMIT 1;
  IF m_save IS NOT NULL THEN
    INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
      (m_save, 'adrian_fontes',      'statement', false, '2025-05-19T00:00:00Z', 'https://www.votebeat.org/2025/05/19/secretary-of-state-adrian-fontes-david-scanlan-proof-of-citizenship-save-act/', 'Arizona Secretary of State (Democrat); raised concerns that the bill''s documentation requirement and penalties on election officials could burden eligible voters.'),
      (m_save, 'jocelyn_benson',     'statement', false, '2025-04-04T00:00:00Z', 'https://mcclain.house.gov/_cache/files/3/e/3e83a424-c7bb-4ad6-813b-a9c1ffea5c64/F815EDE4061A27D19B37F9CFB7CDC9F11A29B671C7B810A7FD37301820464292.mi-delegation-letter-to-secretary-benson-re-noncitizen-voting.pdf', 'Michigan Secretary of State (Democrat); publicly opposed the SAVE Act''s proof-of-citizenship requirement.'),
      (m_save, 'steve_simon',        'statement', false, '2025-03-31T00:00:00Z', 'https://www.sos.mn.gov/media/zzia53yr/033125-secretaries-of-state-letter-on-the-save-act.pdf', 'Minnesota Secretary of State (Democrat); joined a March 2025 secretaries-of-state letter opposing the SAVE Act.'),
      (m_save, 'brad_raffensperger', 'statement', true,  '2025-04-10T00:00:00Z', 'https://sos.ga.gov/news/secretary-raffensperger-save-was-valuable-citizenship-verification-tool-states', 'Georgia Secretary of State (Republican); supported citizenship-verification for voter rolls and the proof-of-citizenship approach.')
    ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
  END IF;

END $$;
