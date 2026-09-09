-- ─────────────────────────────────────────────────────────────────────────────
-- vr_positions — Utah executive formal lane, wave E1: signed and vetoed acts
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT THIS ADDS. 140 recorded gubernatorial acts — 138 bills Governor Cox signed
-- and 2 he vetoed — written as vr_positions rows with action_type 'gov_signed' or
-- 'gov_vetoed'. Every row belongs to politician_id 'cox'. It also creates one
-- measure, H.B. 306 of 2025GS, with its reviewed sound_money mapping, because that
-- veto had nowhere to hang.
--
-- WHY THIS FILE EXISTS. Governor Cox's profile said "No formal pattern on file yet"
-- and the reason was structural: the pattern engine eats floor votes, committee
-- votes and sponsorships, and a governor casts none of the three. The formal file
-- for that office is the bills the officeholder signed and the bills the
-- officeholder vetoed. This fills that lane out of the record. It invents no roll
-- call, and it attaches no House or Senate vote to a governor.
--
-- THE TWO ACTION TYPES ARE NEW AND DELIBERATELY DISTINCT. 'signed', 'vetoed' and
-- 'issued' already exist in this table, held only by the President, and
-- consistency.js deliberately keeps all three OUT of the stance-helpers act table so
-- a president's enactments route to the separate ✒️ Executive Enactment Record lane
-- with their own verbs ("Signed into law", "Vetoed", "Issued"). Reusing them for a
-- governor would have done two wrong things at once: 12 federal measures would have
-- flipped from the exec lane to the record lane because a weighable act suddenly
-- existed on them, and every one of those rows would have been relabeled, because
-- _pdxActLabel is consulted before the exec verb table. 'gov_signed' and
-- 'gov_vetoed' are therefore state-executive types of their own. No federal row
-- changes class, weight or label because of this file.
--
-- NEITHER IS A VOTE. Both carry act weight 0.70 in stance-helpers' _ACT_CLASSES —
-- below a floor roll call (1.00), above a committee vote (0.60) — and print as
-- exactly "Signed" and "Vetoed". They are offered to the record lane's depth
-- arithmetic and to the Word vs Action tested set. They are NOT offered to Direction
-- Match, and no surface labels either with a ballot verb. Same wall as committee
-- votes and sponsorships: depth in the record lane only.
--
-- HOW A ROW EARNED ITS PLACE. Four fences, all of them documented with their
-- refusals in db/vr-utah-exec-bills.json:
--   1. The act is a recorded gubernatorial action in the bill's own action history
--      on le.utah.gov — action code GSIGN ("Governor Signed") or GVETO ("Governor
--      Vetoed"), with a date and a bill number.
--   2. The officeholder came from db/vr-utah-exec-map.json, which maps (session,
--      office) → roster id and is human-accepted. A bill action never prints the
--      governor's name, so this is an identification a person made, exactly as
--      db/vr-utah-member-map.json is for a roll-call cell. Fail closed: an act
--      whose session has no officeholder key is discarded, never guessed.
--   3. The bill carries a reviewed issue mapping — from the floor waves, the
--      committee waves, or the single bill reviewed in this pass (H.B. 306). A
--      signed bill with no reviewed mapping stays unsigned to an issue: 977 such
--      acts are refused in writing and none of them characterises a row.
--   4. The bill has a vr_measures row, and the check for one reads EVERY
--      migration rather than the ones with "utah" in the filename. The first cut
--      of the generator scanned only the latter and refused five signed bills —
--      2025GS H.B. 67, S.B. 26, S.B. 316, S.B. 336 and 2024GS H.B. 348 — as
--      "mapped but no measure row"; all five measures exist, created by
--      20261010000000_vr_vocab_wave_v1.sql, because their issue keys were minted
--      in the vocabulary wave instead of a Utah data wave. Those five acts are
--      admitted here. No reviewed-and-mapped bill is refused for want of a
--      measure row, and none is given a measure invented to hold a signature.
--
-- WHAT IS REFUSED BY DESIGN. Action code GVETOLI (line item veto, 2 acts in 2024GS)
-- is not here: the bill itself became law and only named appropriation lines were
-- struck, so calling it "Vetoed" would overstate the record and no act class models
-- a partial veto. Action code GNOSIGN ("Became Law w/o Governor Signature", 5 acts)
-- is not here either: it is the ABSENCE of a gubernatorial act, and ingesting it
-- would attribute a decision that was never recorded. Nothing from a pledge ledger
-- or a press release becomes a formal act — a statement is still word, not action.
--
-- THE TIME OF DAY IS DROPPED ON PURPOSE. The 2025 session's action history carries a
-- clock time and the archive shape usually does not, so acted_at is the act's date at
-- midnight Mountain Standard Time — the same stamp the Utah floor and committee
-- migrations use — and each row's note carries the printed timestamp verbatim so
-- nothing is lost.
--
-- IDEMPOTENT. Every block selects its measure before inserting, guards the one issue
-- mapping with NOT EXISTS, and ends every position insert with ON CONFLICT
-- (measure_id, politician_id, action_type) DO NOTHING. A block whose measure does not
-- exist returns without inserting anything (fence 3), so a re-run after a later wave
-- admits one of the five refused measures still cannot conjure an act.
--
-- pack-generation: derived — up to 1 vr_measure_issues row(s) below, each
--   guarded by NOT EXISTS so a re-state is a no-op. Every row that actually lands
--   moves mappingVersion() in netlify/lib/vr-pack.ts: both the row count and the
--   md5 over the ordered (measure_id, issue_key, weight, is_primary,
--   support_meaning, rationale) tuples change. The pack key
--   member:<pid>@m<count>-<hash> therefore bumps for every member, so no blob built
--   before this deploy can be served after it and the six-hour PACK_TTL_MS is not
--   what does the retiring. Confirm the version moved with
--   scripts/test-vr-pack-key-version.mjs once the migration lands. The one row is
--   H.B. 306's sound_money mapping, reviewed in this pass; the other 134 acts hang
--   off mappings that shipped in the floor and committee waves and add no row here.
--
-- SOURCES. Every row carries the le.utah.gov bill status page it was read from.
-- Census, admission rules and every refusal: db/vr-utah-exec-bills.json.
-- Rows as generated: db/vr-utah-exec-seed.json.
-- Regenerate: node scripts/vr-utah-exec-ingest.mjs --census | --seed | --sql
-- ─────────────────────────────────────────────────────────────────────────────
-- HB0011 · H.B. 11 · Water Efficient Landscaping Requirements (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 11' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0011.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0029 · H.B. 29 · Sensitive Material Review Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 29' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0029.html', 'Governor Signed · 2024-03-18 11:43:00.000 · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0059 · H.B. 59 · Federal Funds Contingency Planning (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 59' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0059.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0062 · H.B. 62 · Utah Water Ways Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 62' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0062.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0068 · H.B. 68 · Drug Sentencing Modifications (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 68' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0068.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0119 · H.B. 119 · School Employee Firearm Possession Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 119' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0119.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0153 · H.B. 153 · Child Care Revisions (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 153' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0153.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0158 · H.B. 158 · Criminal Defamation Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 158' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0158.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0164 · H.B. 164 · Digital Currency Modifications (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 164' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0164.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0165 · H.B. 165 · Federal Law Enforcement Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 165' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0165.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0182 · H.B. 182 · Student Survey Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 182' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0182.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0191 · H.B. 191 · Electrical Energy Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 191' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0191.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0215 · H.B. 215 · Home Solar Energy Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 215' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0215.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0241 · H.B. 241 · Clean Energy Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 241' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0241.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0257 · H.B. 257 · Sex-based Designations for Privacy, Anti-bullying, and Women's Opportunities (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 257' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0257.html', 'Governor Signed · 2024-01-30 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0261 · H.B. 261 · Equal Opportunity Initiatives (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 261' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-01-30T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0261.html', 'Governor Signed · 2024-01-30 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0269 · H.B. 269 · Public School History Curricula Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0269.html', 'Governor Signed · 2024-03-20 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0273 · H.B. 273 · Sentencing Modifications for Certain DUI Offenses (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 273' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0273.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0289 · H.B. 289 · Property Rights Ombudsman Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 289' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0289.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0316 · H.B. 316 · Inmate Assignment Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 316' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0316.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0335 · H.B. 335 · State Grant Process Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 335' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0335.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0348 · H.B. 348 · Precious Metals Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 348' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0348.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0374 · H.B. 374 · State Energy Policy Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 374' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0374.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0378 · H.B. 378 · First Responder Mental Health Services Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 378' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0378.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0396 · H.B. 396 · Workplace Discrimination Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 396' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0396.html', 'Governor Signed · 2024-03-19 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0405 · H.B. 405 · Public Health Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 405' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0405.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0406 · H.B. 406 · Firearms Financial Transaction Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 406' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0406.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0424 · H.B. 424 · Lewdness Involving a Child Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 424' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0424.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0430 · H.B. 430 · Local Government Transportation Services Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 430' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0430.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0459 · H.B. 459 · Blended Plea Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 459' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0459.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0460 · H.B. 460 · Government Employee Conscience Protection Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 460' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0460.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0461 · H.B. 461 · Child Care Grant Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 461' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0461.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0465 · H.B. 465 · Housing Affordability Revisions (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 465' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0465.html', 'Governor Signed · 2024-03-19 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0471 · H.B. 471 · Public Lands Possession Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 471' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0471.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0496 · H.B. 496 · Public Land Use Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 496' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0496.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0517 · H.B. 517 · Half-day Kindergarten Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 517' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0517.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0529 · H.B. 529 · Utah Fits All Scholarship Program Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 529' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0529.html', 'Governor Signed · 2024-03-12 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0534 · H.B. 534 · Boards and Commissions Modifications (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 534' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0534.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0560 · H.B. 560 · Licensing Modifications (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 560' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0560.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0562 · H.B. 562 · Utah Fairpark Area Investment and Restoration District (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 562' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/HB0562.html', 'Governor Signed · 2024-03-19 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0044 · S.B. 44 · Alternative Education Scholarship Combination (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 44' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0044.html', 'Governor Signed · 2024-03-20 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0057 · S.B. 57 · Utah Constitutional Sovereignty Act (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 57' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-01-31T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0057.html', 'Governor Signed · 2024-01-31 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0060 · S.B. 60 · Drug Paraphernalia Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 60' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0060.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0061 · S.B. 61 · Electronic Cigarette Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 61' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-20T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0061.html', 'Governor Signed · 2024-03-20 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0069 · S.B. 69 · Income Tax Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 69' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0069.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0126 · S.B. 126 · Gestational Agreement Requirements (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 126' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0126.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0161 · S.B. 161 · Energy Security Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 161' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0161.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0166 · S.B. 166 · Health Benefit Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 166' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0166.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0173 · S.B. 173 · Market Informed Compensation for Teachers (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 173' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-18T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0173.html', 'Governor Signed · 2024-03-18 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0182 · S.B. 182 · Property Tax Assessment Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 182' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0182.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0194 · S.B. 194 · Social Media Regulation Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 194' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0194.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0200 · S.B. 200 · State Commission on Criminal and Juvenile Justice Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 200' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0200.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0208 · S.B. 208 · Housing and Transit Reinvestment Zone Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 208' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0208.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0211 · S.B. 211 · Generational Water Infrastructure Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 211' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0211.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0224 · S.B. 224 · Energy Independence Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 224' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0224.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0233 · S.B. 233 · Medical Cannabis Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 233' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-13T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0233.html', 'Governor Signed · 2024-03-13 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0250 · S.B. 250 · Property Tax Income Requirements (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 250' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0250.html', 'Governor Signed · 2024-03-14 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0268 · S.B. 268 · First Home Investment Zone Act (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 268' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-21T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0268.html', 'Governor Signed · 2024-03-21 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0272 · S.B. 272 · Capital City Revitalization Zone (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 272' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2024GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2024-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2024/bills/static/SB0272.html', 'Governor Signed · 2024-03-19 · le.utah.gov bill status action history')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0037 · H.B. 37 · Utah Housing Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 37' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0037.html', 'Governor Signed · 3/26/2025 8:53 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0067 · H.B. 67 · Precious Metals Investment and Administration Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 67' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0067.html', 'Governor Signed · 3/25/2025 5:46 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0070 · H.B. 70 · Decommissioned Asset Disposition Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 70' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0070.html', 'Governor Signed · 3/24/2025 4:28 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0081 · H.B. 81 · Fluoride Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 81' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0081.html', 'Governor Signed · 3/27/2025 9:59 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0084 · H.B. 84 · Vaccine Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 84' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0084.html', 'Governor Signed · 3/26/2025 8:59 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0085 · H.B. 85 · Environmental Permitting Modifications (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 85' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0085.html', 'Governor Signed · 3/24/2025 4:28 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0096 · H.B. 96 · Fraud Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 96' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0096.html', 'Governor Signed · 3/25/2025 5:55 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0100 · H.B. 100 · Food Security Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 100' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0100.html', 'Governor Signed · 3/25/2025 5:58 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0103 · H.B. 103 · State Land Access Road Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 103' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0103.html', 'Governor Signed · 3/24/2025 4:30 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0106 · H.B. 106 · Income Tax Revisions (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 106' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0106.html', 'Governor Signed · 3/26/2025 9:08 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0110 · H.B. 110 · Combined Basic Tax Rate Reduction (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 110' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0110.html', 'Governor Signed · 3/27/2025 10:01 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0119 · H.B. 119 · Solar Panel Restrictions in Homeowners Associations Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 119' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0119.html', 'Governor Signed · 3/25/2025 6:00 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0124 · H.B. 124 · Education Industry Employee Privacy (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 124' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0124.html', 'Governor Signed · 3/26/2025 9:09 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0195 · H.B. 195 · Firearm Retention Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 195' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0195.html', 'Governor Signed · 3/26/2025 9:19 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0201 · H.B. 201 · Energy Resource Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 201' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0201.html', 'Governor Signed · 3/25/2025 6:12 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0207 · H.B. 207 · Sexual Offense Revisions (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 207' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0207.html', 'Governor Signed · 3/25/2025 6:12 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0209 · H.B. 209 · Homeschool Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 209' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0209.html', 'Governor Signed · 3/26/2025 8:36 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0226 · H.B. 226 · Criminal Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 226' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0226.html', 'Governor Signed · 3/25/2025 6:16 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0230 · H.B. 230 · Blockchain and Digital Innovation Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 230' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0230.html', 'Governor Signed · 3/25/2025 6:17 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0233 · H.B. 233 · School Curriculum Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 233' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0233.html', 'Governor Signed · 3/26/2025 8:41 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0235 · H.B. 235 · County Auditor Modifications (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 235' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0235.html', 'Governor Signed · 3/25/2025 6:22 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0240 · H.B. 240 · Urban Farming Assessment Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 240' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0240.html', 'Governor Signed · 3/24/2025 4:34 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0246 · H.B. 246 · Statewide Online Education Program Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 246' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0246.html', 'Governor Signed · 3/27/2025 10:02 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0252 · H.B. 252 · State Custody Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 252' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0252.html', 'Governor Signed · 3/19/2025 9:28 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0256 · H.B. 256 · Municipal and County Zoning Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 256' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0256.html', 'Governor Signed · 3/19/2025 12:00 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0263 · H.B. 263 · Election Record Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 263' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0263.html', 'Governor Signed · 3/27/2025 10:03 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0264 · H.B. 264 · Tax Incentives Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 264' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0264.html', 'Governor Signed · 3/25/2025 6:39 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0267 · H.B. 267 · Public Sector Labor Union Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 267' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0267.html', 'Governor Signed · 2/14/2025 2:52 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0269 · H.B. 269 · Privacy Protections in Sex-designated Areas (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 269' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-02-14T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0269.html', 'Governor Signed · 2/14/2025 2:53 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0274 · H.B. 274 · Water Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 274' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0274.html', 'Governor Signed · 3/24/2025 4:22 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0281 · H.B. 281 · Health Curriculum and Procedures Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 281' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0281.html', 'Governor Signed · 3/26/2025 8:49 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0290 · H.B. 290 · Bicycle Lane Safety Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 290' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0290.html', 'Governor Signed · 3/27/2025 10:04 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0300 · H.B. 300 · Amendments to Election Law (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 300' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0300.html', 'Governor Signed · 3/26/2025 8:50 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0306 · H.B. 306 · Precious Metals Amendments (mapping: exec-wave-E1)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 306' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN
    INSERT INTO vr_measures (measure_type, congress, chamber, number, title,
      short_title, summary, status, source_url, source_label, external_ids)
    VALUES ('bill', NULL, 'utah house', 'H.B. 306', 'Precious Metals Amendments',
      'Precious Metals Amendments', 'This bill enacts and modifies provisions relating to state investment in gold and the establishment of a gold-backed digital payment system.', 'vetoed',
      'https://le.utah.gov/~2025/bills/static/HB0306.html', 'Utah State Legislature',
      jsonb_build_object('utahSession', '2025GS', 'utahBill', 'HB0306',
        'primeSponsor', 'Rep. Ivory, Ken', 'floorSponsor', 'Sen. Grover, Keith',
        'mappingReadFrom', 'enrolled', 'mappingTextUrl', 'https://le.utah.gov/Session/2025/bills/enrolled/HB0306.xml',
        'execActOnly', true))
    RETURNING id INTO m_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vr_measure_issues
                  WHERE measure_id = m_id AND issue_key = 'sound_money') THEN
    INSERT INTO vr_measure_issues (measure_id, issue_key, weight, is_primary,
      support_meaning, rationale, source_url)
    VALUES (m_id, 'sound_money', 65, true,
      'yea_supports', 'Enrolled text requires the state treasurer to develop and issue a competitive procurement for a precious metals-backed electronic payment system, sets the requirements for that request for proposals, requires the treasurer to evaluate the proposals, and extends the treasurer''s precious metals study while adding a sunset date and annual reporting to the Revenue and Taxation Interim Committee. Every operative clause moves the state one step further toward holding and transacting in specie, which is exactly what this key measures; the shipped keyword list for sound_money already names gold, bullion, specie, legal tender and state treasurer. The bill runs one direction only — nothing in it narrows the state''s precious-metals position — so a yea supports the key and the veto opposes it.', 'https://le.utah.gov/Session/2025/bills/enrolled/HB0306.xml');
  END IF;
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_vetoed', false, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0306.html', 'Governor Vetoed · 3/27/2025 9:48 AM · le.utah.gov bill status action history · action code GVETO')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0310 · H.B. 310 · Disability Coverage Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 310' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-19T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0310.html', 'Governor Signed · 3/19/2025 8:19 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0312 · H.B. 312 · Criminal Justice Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 312' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0312.html', 'Governor Signed · 3/25/2025 6:44 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0350 · H.B. 350 · District Energy Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 350' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0350.html', 'Governor Signed · 3/25/2025 6:51 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0355 · H.B. 355 · Mining and Critical Infrastructure Materials Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 355' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0355.html', 'Governor Signed · 3/26/2025 8:54 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0360 · H.B. 360 · Housing Attainability Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 360' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0360.html', 'Governor Signed · 3/26/2025 8:57 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0365 · H.B. 365 · Mental Health Care Study Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 365' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0365.html', 'Governor Signed · 3/26/2025 9:00 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0378 · H.B. 378 · Department of Natural Resources Funding Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 378' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0378.html', 'Governor Signed · 3/25/2025 6:55 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0390 · H.B. 390 · Religious Expression in Higher Education (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 390' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0390.html', 'Governor Signed · 3/26/2025 9:04 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0405 · H.B. 405 · Human Trafficking Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 405' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0405.html', 'Governor Signed · 3/25/2025 6:56 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0410 · H.B. 410 · Child Care Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 410' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0410.html', 'Governor Signed · 3/26/2025 9:06 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0420 · H.B. 420 · Halogen Emissions Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 420' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0420.html', 'Governor Signed · 3/25/2025 6:57 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0465 · H.B. 465 · Public Safety Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 465' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0465.html', 'Governor Signed · 3/25/2025 7:09 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0474 · H.B. 474 · Regulatory Oversight Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 474' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0474.html', 'Governor Signed · 3/27/2025 9:27 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0477 · H.B. 477 · School Trespass Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 477' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0477.html', 'Governor Signed · 3/27/2025 9:28 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0488 · H.B. 488 · Federalism Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 488' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0488.html', 'Governor Signed · 3/27/2025 9:35 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0497 · H.B. 497 · Public Education Compliance (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 497' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0497.html', 'Governor Signed · 3/27/2025 9:44 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0508 · H.B. 508 · School Data Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 508' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0508.html', 'Governor Signed · 3/27/2025 9:54 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0547 · H.B. 547 · Diaper Program Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 547' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0547.html', 'Governor Signed · 3/24/2025 4:19 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- HB0562 · H.B. 562 · Law Enforcement and Criminal Justice Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'H.B. 562' AND chamber = 'utah house'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/HB0562.html', 'Governor Signed · 3/27/2025 10:04 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0023 · S.B. 23 · First Home Investment Zone Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 23' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0023.html', 'Governor Signed · 3/26/2025 9:25 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0026 · S.B. 26 · Housing and Transit Reinvestment Zone Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 26' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-12T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0026.html', 'Governor Signed · 3/12/2025 12:12 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0061 · S.B. 61 · Energy Corridor Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 61' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0061.html', 'Governor Signed · 3/25/2025 7:27 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0071 · S.B. 71 · Social Security Tax Revisions (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 71' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0071.html', 'Governor Signed · 3/26/2025 9:12 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0073 · S.B. 73 · Statewide Initiatives Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 73' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0073.html', 'Governor Signed · 3/24/2025 4:26 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0078 · S.B. 78 · Homeless Individuals Protection Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 78' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0078.html', 'Governor Signed · 3/26/2025 9:16 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0080 · S.B. 80 · Water Fee Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 80' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-24T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0080.html', 'Governor Signed · 3/24/2025 4:29 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0090 · S.B. 90 · Mandatory Jail Sentence Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 90' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0090.html', 'Governor Signed · 3/25/2025 7:31 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0102 · S.B. 102 · Public Education Reporting Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 102' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0102.html', 'Governor Signed · 3/25/2025 7:35 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0115 · S.B. 115 · Substance Use Disorder Revisions (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 115' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0115.html', 'Governor Signed · 3/26/2025 9:18 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0137 · S.B. 137 · Course Choice Empowerment (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 137' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0137.html', 'Governor Signed · 3/27/2025 10:21 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0144 · S.B. 144 · Sexual Crimes Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 144' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0144.html', 'Governor Signed · 3/25/2025 7:38 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0154 · S.B. 154 · Legislative Audit Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 154' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0154.html', 'Governor Signed · 3/25/2025 7:40 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0171 · S.B. 171 · Indigent Defense Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 171' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0171.html', 'Governor Signed · 3/25/2025 7:43 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0181 · S.B. 181 · Housing Affordability Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 181' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0181.html', 'Governor Signed · 3/26/2025 9:46 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0187 · S.B. 187 · Throughput Infrastructure Funding Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 187' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0187.html', 'Governor Signed · 3/26/2025 9:46 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0190 · S.B. 190 · Workers' Compensation Modifications (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 190' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0190.html', 'Governor Signed · 3/26/2025 9:46 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0195 · S.B. 195 · Transportation Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 195' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0195.html', 'Governor Signed · 3/26/2025 9:47 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0203 · S.B. 203 · Judicial Standing Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 203' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0203.html', 'Governor Signed · 3/26/2025 9:48 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0204 · S.B. 204 · Right to Appeal Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 204' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0204.html', 'Governor Signed · 3/26/2025 9:49 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0259 · S.B. 259 · State Holy Days (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 259' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0259.html', 'Governor Signed · 3/25/2025 7:53 PM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0262 · S.B. 262 · Housing Affordability Modifications (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 262' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0262.html', 'Governor Signed · 3/27/2025 8:25 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0272 · S.B. 272 · Micro-education Entity Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 272' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-26T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0272.html', 'Governor Signed · 3/26/2025 9:52 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0274 · S.B. 274 · Health Insurance Preauthorization Revisions (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 274' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0274.html', 'Governor Signed · 3/27/2025 9:22 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0296 · S.B. 296 · Judicial Amendments (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 296' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_vetoed', false, '2025-03-25T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0296.html', 'Governor Vetoed · 3/25/2025 5:26 PM · le.utah.gov bill status action history · action code GVETO')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0316 · S.B. 316 · Military Installation Development Authority and Other Development Zone Amendments (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 316' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0316.html', 'Governor Signed · 3/27/2025 9:31 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0330 · S.B. 330 · Cosmetology Modifications (mapping: committee-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 330' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0330.html', 'Governor Signed · 3/27/2025 9:32 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;

-- SB0336 · S.B. 336 · Utah Fairpark Area Investment and Restoration District Modifications (mapping: floor-wave)
DO $$
DECLARE m_id integer;
BEGIN
  SELECT id INTO m_id FROM vr_measures
   WHERE number = 'S.B. 336' AND chamber = 'utah senate'
     AND external_ids->>'utahSession' = '2025GS' LIMIT 1;
  IF m_id IS NULL THEN RETURN; END IF;  -- fence 3: no measure, no act
  INSERT INTO vr_positions (measure_id, politician_id, action_type, supports, acted_at, source_url, note) VALUES
    (m_id, 'cox', 'gov_signed', true, '2025-03-27T00:00:00-07:00'::timestamptz, 'https://le.utah.gov/~2025/bills/static/SB0336.html', 'Governor Signed · 3/27/2025 9:39 AM · le.utah.gov bill status action history · action code GSIGN')
  ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING;
END $$;
