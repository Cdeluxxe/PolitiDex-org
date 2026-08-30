# Voting-Record ingest — overlap-first wave runbook (Phase 13A)

Turnkey operator steps to execute the staged overlap-first ingest. Everything below
is already wired; the only thing this repo cannot supply is the two **secrets**. Once
they are set, the wave is a copy-paste.

## Blocker (why this wasn't auto-run)

The ingest is safe-by-default and stays disabled until an operator supplies secrets:

| Secret | Where | Needed for |
| --- | --- | --- |
| `CONGRESS_GOV_API_KEY` | Netlify env (the deployed Function) | the actual Congress.gov pull; unset → endpoint + cron are a clean no-op |
| `VR_INGEST_TOKEN` | Netlify env **and** operator shell | bearer auth on `/api/vr-ingest`; unset → endpoint 503, CLI refuses |

Neither is set in the build/agent environment, so no live pull can run here. No votes
were fabricated to fake the result.

## Readiness (confirmed)

- **Member map** — `db/vr-member-map.json`, 63 members, including the Phase-12 overlap
  additions (`schiff`, `jayapal`, `tlaib`, `ernst`, `maxine_waters`). Without these the
  ingest would drop their votes as `membersUnmapped`.
- **Issue-seed priorities** — `db/vr-issue-seed.json` → `_phase12_overlap_priority`
  (election_integrity, gov_transparency, foreign_balance, strong_defense, climate_action,
  stock_trading_ban) with the staged member→issue list.
- **Gates (all intact)** — source-URL required on every measure/rollcall; member votes
  written only when the bioguide resolves (never guessed); issue keys validated against
  the shipped allow-list; the title classifier only *suggests* (low weight, non-primary).

## Run the wave

```sh
export VR_SITE_URL=https://politidex.fyi        # or http://localhost:8889 for `netlify dev`
export VR_INGEST_TOKEN=…                          # the operator token (matches the Function env)
# CONGRESS_GOV_API_KEY must be set in the Function's Netlify environment.

# 1. Baseline integrity snapshot
node scripts/vr-ingest.mjs verify

# 2. Pull the 119th Congress roll calls, both chambers (idempotent; re-runnable).
#    Use --recent so `limit` means "the newest N", and --offset to page — see the
#    "unordered list" trap below. Three ~20-vote calls stay inside safe rate limits.
node scripts/vr-ingest.mjs run house 119 20 --recent --offset=0
node scripts/vr-ingest.mjs run house 119 20 --recent --offset=20
node scripts/vr-ingest.mjs run house 119 20 --recent --offset=40
node scripts/vr-ingest.mjs run senate 119 250

# 3. Attach the curated measure→issue mappings onto everything now present
curl -sS -X POST "$VR_SITE_URL/api/vr-ingest/seed-issues" \
  -H "authorization: Bearer $VR_INGEST_TOKEN" -H "content-type: application/json"

# 4. Confirm integrity again (no unsourced measures/rollcalls/actions)
node scripts/vr-ingest.mjs verify

# 5. PACK KEY MUST CHANGE. Any wave that touched vr_measure_issues ends here —
#    print the mapping version and confirm it is not the one the wave started at.
#    See the section immediately below for what this is and how to not defeat it.
node scripts/test-vr-pack-key-version.mjs
node scripts/test-vr-pack-rebuild-on-flip.mjs   # needs no DB; runs the read path
```

## Every mapping/promote migration ends with: **pack key must change.**

Say it out loud at the end of every wave that writes, updates, retracts or promotes
a row in `vr_measure_issues` — including a bare `is_primary` flip, which is the
change that looks like nothing and is not.

The reason it is a checklist line and not a task: **it is automatic, and the check is
that you did not defeat it.** The offline pack's blob key and its URL both carry a
fingerprint of the mapping table —
`member:<pid>@m<rowCount>-<md5(contents)[0..12]>`, computed by `mappingVersion()`
in `netlify/lib/vr-pack.ts` over `measure_id`, `issue_key`, `weight`, `is_primary`,
`support_meaning` and `rationale`. Any mapping write changes it, so the new key
misses, so the pack rebuilds on the next read, so the service worker's copy is
bypassed because the URL is different too. Nothing to bump, no counter to remember.

What "you did not defeat it" means, concretely:

- **Do not add a mapping column to the pack without adding it to the fingerprint.**
  If a wave teaches `PackIssue` a sixth field, that field belongs in the
  `string_agg` in `mappingVersion()` the same day. A field the pack serves and the
  fingerprint ignores is a stale pack with no window on it at all — permanent, not
  six hours.
- **Do not "fix" pack staleness by shortening `PACK_TTL_MS`.** It is six hours and
  it is about roll-call freshness only. Mapping staleness is not what it measures.
- **Do not write mapping rows around the pack.** A migration that changes the table
  is fine. A path that hands the pack builder a mapping the table does not hold is
  not: the fingerprint is of the table, so the key would not move.
- **Confirm it moved.** `node scripts/test-vr-pack-key-version.mjs` prints the
  current version and fails if the fingerprint is insensitive to any of the five
  mutation shapes. Run it after the migration lands; the printed version must
  differ from the one recorded in the wave's own notes.
- **And confirm the read path acts on it.** `node
  scripts/test-vr-pack-rebuild-on-flip.mjs` flips one `is_primary` in a fixture and
  runs the shipping `getMemberPack` over it: the next read must carry the new flag
  with the six-hour TTL nowhere near expiry, and the stance tree and the dossier
  must then agree about that member and that issue. It needs no database, so it
  runs in CI on every commit and not only at the end of a wave.

If the mapping table cannot be read at all, `mappingVersion()` returns
`m0-unknown` and the pack **fails closed**: nothing is read from the blob store
under that version, nothing is written to it, the response is `no-store`, and the
service worker declines to cache it. A reader still gets a freshly built pack; the
store simply never accumulates a blob whose mapping nobody can name. Do not "fix" a
noisy blind window by making that key cacheable — the previous mapping's blobs are
still there and are still the offline fallback.

Old keys are never deleted and nothing sweeps them. That is deliberate: a retired
pack is retired because nobody asks for its key any more, and a delete sweep that
silently misses one is a worse guarantee than a key that cannot be requested.

## Strict mapping rule for any NEW measure the pull surfaces

For a measure that isn't already issue-seeded, add a curated entry to
`db/vr-issue-seed.json` **only** when a single, clear policy nexus to an overlap issue
exists, with the correct `supportMeaning` (does a *Yea* advance or oppose that issue?).
If the nexus is ambiguous, multi-issue, or the direction is contestable, **leave it
unmapped** — an unmapped vote is honest; a wrong `supportMeaning` fabricates a false
verdict. Re-run step 3 after editing the seed.

### The `house-vote` list is unordered — always pass `--recent`

`GET /house-vote/{congress}` returns **no documented sort order**. Offset 0 of
`house-vote/119` comes back as roll calls 240, 306, 241, 116, 122, … So a bare
`limit: 20` means "20 *arbitrary* roll calls", not "the 20 most recent", and re-running
it re-fetches the same arbitrary slice forever — a bigger `limit` just adds more
arbitrary older votes. Two flags fix this:

| flag | effect |
| --- | --- |
| `--recent` (`recent: true`) | Walks the cheap, summary-only list pages, sorts by vote date, and keeps the newest `limit`. The expensive per-roll `/members` call is then made **only** for the selected roll calls, so "newest 20" costs the same member fetches as a bare `limit: 20`. |
| `--offset=N` (`offset: N`) | Pages the (now date-ordered) list, so successive safe-sized calls advance instead of repeating. |

Both default off, so the scheduled cron and any existing caller behave exactly as
before. Prefer three `limit=20 --recent --offset=0/20/40` calls over one `limit=60`:
same coverage, same ordering, and each call stays well inside the rate limit.

### House 119/s2 seed — the deploy-time twin of the House pull

`db/vr-house-seed-119-s2.json` holds the roll calls 224–283 window (2026-06-23 →
2026-07-23, 60 roll calls / 52 measures / 2,224 roster member votes) pulled by exactly
the command above, and `scripts/vr-gen-house-migration.mjs` turns it into an additive,
idempotent migration:

```sh
node scripts/vr-gen-house-migration.mjs > \
  netlify/database/migrations/20260724140000_seed_house_119_s2_voting_record.sql
```

This exists for the same reason as the Senate pair, plus one House-specific one:
`applyCuratedIssueSeed()` only attaches a mapping to a measure that **already exists**,
so a mapping added to `db/vr-issue-seed.json` for a measure that has never been ingested
is a silent no-op until the pull surfaces it. Seeding the measures at deploy time makes
the mapping deterministic rather than dependent on an operator having run step 2.
The runtime pull still re-fetches and upserts the same rolls; every insert in the
migration is find-or-create / `ON CONFLICT DO NOTHING`, so the two paths never fight.

Regenerate the seed by re-running the pull, then re-run the generator into a **new**
migration file — never edit an applied one.

### The earlier-measures companion seed

`db/vr-house-seed-119-s2-earlier.json` holds three roll calls from **February 2026**
(2/71 for H.R. 6329, 2/77 + 2/78 for H.R. 4758 — 2 measures, 111 roster member votes).
They sit far outside the `--recent` window above, so a recency-based pull will never
reach them again; they existed in production only because an ad-hoc live ingest happened
to create them, which made their `db/vr-issue-seed.json` mappings silent no-ops on any
fresh branch database. The generator takes a seed path so both seeds share one code path:

```sh
node scripts/vr-gen-house-migration.mjs db/vr-house-seed-119-s2-earlier.json > \
  netlify/database/migrations/20260724150000_seed_house_119_s2_earlier_measures.sql
```

To seed another out-of-window measure, add its roll calls to a seed file in this shape
and run the generator into a new migration. Both migrations are find-or-create /
`ON CONFLICT DO NOTHING`, so they never fight each other or the runtime ingest.

### Congress.gov URLs: the API's own field is not canonical

`GET /house-vote/{congress}` returns `legislationUrl` as
`https://www.congress.gov/bill/119/house-bill/8800` — a **bare** congress number. The
canonical congress.gov page, and the form every stored `vr_measures.source_url` uses, is
the ordinal `…/bill/119th-congress/house-bill/8800`. `canonicalCongressGovUrl()` in
`netlify/lib/vr-normalize.ts` rewrites the bare form on the way in (idempotent — an
already-ordinal URL doesn't match, and non-bill congress.gov paths are left alone), so a
live ingest and the seeds now cite the same URL shape. Historical rows written before
this fix were deliberately left as-is rather than rewritten in place.

### Two traps that produce BACKWARDS verdicts (both now handled in code)

1. **Procedural inversion.** A mapping's `supportMeaning` answers *does advancing the
   measure advance the issue?* — it does **not** know whether a yea advances the measure.
   On a motion to **recommit** or to **table**, a yea *blocks* the measure, so the
   ordinary read is inverted. `yeaBlocksMeasure()` (`netlify/lib/vr-pack.ts` and
   `netlify/functions/voting-record.mts`) flags those roll calls as `advanceInverted`,
   and `_voteEffectiveSupport` in `stance-helpers.js` flips them. The 0.25 procedural
   down-weight does **not** substitute for this — a quarter-weight backwards verdict is
   still backwards. Real case: H.R. 4758 roll 119/2/77.
2. **Rules are not policy.** A "Providing for consideration of…" resolution (H.Res. 1075
   / 682 / 916) is a floor-procedure vote whipped on party lines. Mapping one reads party
   discipline as conviction. Leave rule resolutions unmapped.

Also skip **unanimous / near-unanimous** measures: they differentiate nobody, so they add
attribution without adding signal. And never stretch a bill onto an issue the shipped
vocabulary can't express — there is no `human_rights`, `foreign_aid` or `sanctions` key,
so foreign-policy bills like H.R. 36 / H.R. 4423 stay unmapped rather than mis-keyed.

### Two more rules, learned the hard way in the substantive-remainder pass

3. **`gov_regulation` is about the regulatory question, not about every mandate.** Reserve
   it for measures whose *primary operative purpose* is regulation itself: CRA
   disapprovals, regulatory-budget caps, red-tape hotlines, rulemaking-quality bills.
   Do **not** map a measure to it merely because the measure directs an agency to issue or
   enforce a rule — that description fits most of the statute book, and it would turn a
   member's deregulation stance into a contradiction on any safety vote. This is why
   H.R. 973 (CPSC rule for micromobility batteries) and S. 2503 (ADS-B In equipment
   requirement) are unmapped despite both being contested. Without the line, "creates a
   federal mandate" sweeps in dozens of measures and the key stops meaning anything.
4. **A truncated purpose line is not a mappable purpose.** The Congress.gov vote feed cuts
   an amendment's purpose off, so amendments arrive as "strike section NNN, relating to …"
   or trail off mid-clause. If the missing words carry the *direction* — which way a
   deadline moves, which way a threshold goes — the amendment is not mappable from the
   line alone. Read the struck section in the reported bill text
   (`govinfo.gov/bulkdata/BILLS/119/2/hr/BILLS-119hr8800rh.xml` and siblings) and map from
   that, or leave it unmapped. This both created a mapping (H.Amdt. 242: §1213 extends the
   Afghanistan War Commission deadline 3→4 years, so striking it *keeps* the 3-year
   deadline) and prevented a wrong one (H.Amdt. 245: §518 replaces universal urinalysis
   with targeted voice-based screening, so `privacy_rights` points both ways at once).
   When the truncation only hides a number and not the direction — H.Amdt. 266 asks for a
   report on reducing DoD civilians "by…" — the mapping is safe at a low weight.

### Three more rules, from the Phase A pass over the 117th–118th enacted landmarks

5. **When opposition came from both flanks for opposite reasons, the headline key is
   unreadable — map the provisions instead.** The Fiscal Responsibility Act (H.R. 3746)
   passed 314-117 on Clerk roll 243/2023, and the party split was Republican 149-71,
   Democratic 165-46. The nays were fiscal hawks who thought the caps too loose *and*
   progressives objecting to the work requirements and the Mountain Valley Pipeline
   ratification. A `national_debt` or `cut_spending` row set to `yea_supports` would score
   the chamber's most debt-focused members as contradicting their own stance — precisely
   inverted. The provision-level slices are unambiguous and are what the record gets:
   `gov_regulation` (NEPA review limits), `energy_production` (Sec. 324), `gov_services`
   (TANF/SNAP work requirements), `edu_college_cost` (student loan payment restart). The
   test for this rule is not "was the vote close" but "did the two blocs of nays want
   opposite things"; if they did, the headline key describes neither of them.
6. **Take identity from the title as enacted, never the title as introduced.** Major
   packages are routinely hung on unrelated shells. In this window alone: CHIPS rode
   Legislative Branch appropriations, the FY22 NDAA rode a Pulse Memorial designation,
   the Bipartisan Safer Communities Act rode a Tallahassee courthouse naming, the FY23
   NDAA rode a rivers-and-harbors bill, the FY25 NDAA rode a wildlife habitat
   reauthorization, and H.R. 815 rode a title 38 veterans reimbursement bill. Use BILLSTATUS
   "Short Titles as Enacted", falling back to "Display Title", and record which in
   `db/vr-measure-identity.json` under `identityTitleType`. The same care applies one step
   further back, to *which bill* is the vehicle: the PACT Act is universally called
   H.R. 3967, but H.R. 3967 has no `<laws>` entry and stops at "Passed Senate"; the enacted
   text is S. 3373 (P.L. 117-168).
7. **Some packages were never voted as packages.** The House built H.R. 815 out of four
   separate division-level amendment votes under a special rule, and split CAA 2022
   (H.R. 2471) across Clerk rolls 65 and 66 by groups of divisions. BILLSTATUS attributes
   those rolls to the amendments and the rule, not to the vehicle, so H.R. 815's own
   BILLSTATUS shows no House recorded vote at all. Before attaching a measure-level mapping
   to a package, check whether a chamber-level vote on the whole thing exists. Where it
   doesn't, map from the division short titles if they are specific enough to be sourceable
   — and say in the migration that the rows have no House roll to attach to.

### Three more rules, from the 117th–118th roll-call ingest

8. **One decisive vote per chamber per measure — never the procedural rolls that
   surround it.** BILLSTATUS returns every recorded vote a measure ever drew, and for a
   landmark that is a flood: the Inflation Reduction Act has 41 Senate rolls, the American
   Rescue Plan 38, both almost entirely vote-a-rama amendments; the FY24 NDAA drew roughly
   40 House rolls. Ingest only the roll that decided the substance — final passage, the
   motion to concur, or the conference report — and match the question against that list
   explicitly rather than taking whatever roll BILLSTATUS lists last. Cloture motions,
   budget-point-of-order waivers and motions to table say nothing about whether a member
   supports what a bill *does*; scoring them is the same error as mapping a "providing for
   consideration" rule, and it is excluded for the same reason. Amendment rolls that
   genuinely divided the chamber are worth ingesting, but they need their own mapping
   first — an unmapped amendment roll attached to the vehicle's keys would score members on
   a question they never answered.
9. **Verify every roll against the chamber's own record before trusting a recorded roll
   number.** A roll number that arrived from a summary, an inventory table or an earlier
   pass is a claim, not a fact. This pass carried a bad one: the Phase A inventory recorded
   House roll 120/2024 for H.R. 7888, and the Clerk shows roll 120 is "Table Motion to
   Reconsider" (259-128) while roll 119 is "On Passage" (273-147). The check that caught it
   was mechanical and cheap — fetch the roll, then fail closed unless `<legis-num>` matches
   the expected citation *and* `<vote-question>` matches the decisive-question pattern.
   Build that assertion into the fetch, not into a later review step. Note also that the
   Clerk's `legis-num` spelling is `H R 1319`, with the periods replaced by spaces rather
   than stripped, and that `evs` is organised by calendar year:
   `year = 2 × congress + 1787 + (session − 1)`.
10. **Ingest a division as a child measure with a strict subset of the parent's keys.**
   Where rule 7 applies and only the divisions were voted, create the division under
   `vr_measures.parent_id` and map it to the keys its own text supports — dropping every
   parent key that lives in a different division. H.R. 8035 (Ukraine, roll 151/2024,
   311-112 with Republicans 101-112 against their own majority) is a child of H.R. 815 and
   carries `foreign_balance`, `america_first_fp` and `restraint`, but not the parent's
   `tech_balance` or `immig_fentanyl`, which are Divisions D and E. Divisions that passed
   near-unanimously are not worth ingesting at all — 366-58, 385-34 and 360-58 distinguish
   nobody — and declining them belongs in a ledger in the migration, not in silence.

Two attribution rules that apply to every pass, not just this one: **the roster is the
ceiling, not the chamber.** `db/vr-member-map.json` holds 63 entries, so a 435-member House
roll yields at most 38 attributed votes and a 100-member Senate roll at most 18. Store the
*full* chamber tallies in `vr_rollcalls.totals` and compute `is_party` from the full
recorded vote before filtering to the roster, or a 220-211 passage vote will read as 33-0.
And **the Senate's XML carries no bioguide id** — only last name, state and an LIS id — so
attribution there resolves on (last name, state) against the roster and accepts unique hits
only. Ambiguous and unknown members are skipped and counted, never guessed.

`scripts/test-mapping-discipline.mjs` enforces the mechanical half of all of this: no
"providing for consideration" resolution may ever be mapped, in a migration or in the
curated seed, and every curated mapping must carry a rationale and an `https` source.

## Backfilling the 117th and 118th — Phase A mapped and now scored, what's queued

Until migration `20260810000000_vr_phase_a_117_118_landmarks.sql`, the Official Record
held 128 measures in the 119th Congress, one in the 118th and none in the 117th. The
"last six years" was, in the data, one Congress. Note the structural reason this could
not be fixed with a seed edit: `applyCuratedIssueSeed()` matches existing rows and never
creates a measure, so a seed entry for a 117th-Congress bill matches nothing and is a
silent no-op. **Extending the window backwards requires a migration that creates the
measure rows first.** The seed is a mirror, not a source, for anything pre-119th.

Phase A created and mapped 15 enacted landmarks (51 issue rows) and moved rankable
coverage by zero, because there were no 117th/118th member votes in `vr_member_votes` to
score against. Migration `20260811000000_vr_phase_a_117_118_rollcalls.sql` closed that
half: 29 decisive roll calls (each measure's House and Senate passage vote, plus the
H.R. 8035 division), 731 attributed member-votes of which 722 are yea/nay, taking
rankable member-votes from 2,286 to 2,644, rankable (member, issue) pairs from 666 to
705, and people with at least one rankable record from 182 to 186. `cstewart`, `gaetz`,
`rubio` and `zeldin` gained their first vote record of any kind.

Two Phase A vehicles still have no House roll, for the reason rule 7 describes rather
than any gap in the fetch: H.R. 7776's only House vote is roll 253/2022 on the
rivers-and-harbors text the number carried before the NDAA replaced it, and the House
never voted the H.R. 815 package at all. Both are scoreable on the Senate side.

`scripts/vr-coverage-report.mjs` overlays `db/*-vote-seed.json` the same way it overlays
the mapping and identity seeds, so a committed-but-undeployed ingest is counted and
marked `pending` rather than reading as having changed nothing.

Queued, in priority order:

1. **The four appropriations omnibuses**, deferred on effort rather than declined on
   merit: H.R. 2471 (P.L. 117-103), H.R. 2617 (P.L. 117-328), H.R. 4366 (P.L. 118-42),
   H.R. 2882 (P.L. 118-47). Each bundles twelve appropriations divisions plus a tail of
   authorizing divisions — CAA 2023 alone carries the Electoral Count Reform Act, the
   Pregnant Workers Fairness Act, the PUMP Act and SECURE 2.0, and its Public Law summary
   runs to 611,000 characters. H.R. 1968, the 119th full-year CR, was mapped to four keys
   because its summary is short enough to read whole; the same is achievable here after a
   division-by-division read, and mapping them from reputation instead is exactly what
   rule 4 exists to prevent. Note rule 7 applies to at least CAA 2022.
2. **Contested amendment rolls inside the Phase A set**, which rule 8 deliberately left
   out because they need their own mappings first. The clearest candidate is House roll
   114/2024 on H.R. 7888 — the warrant-requirement amendment that failed on a 212-212 tie,
   a split no other vote in the set reproduces. Map the amendment, then ingest the roll.
3. **The remaining divisions of the packages rule 7 and rule 10 describe** — H.R. 8034,
   H.R. 8036 and H.R. 8038 under H.R. 815 (declined here for near-unanimity, so they need
   a reason beyond completeness), and CAA 2022's rolls 65 and 66, which are still unmapped
   and uningested.
4. **Contested non-enacted measures of the 117th/118th.** Phase A took enacted landmarks
   and major packages only, per the priority order. Failed cloture votes, failed passage
   votes and contested amendments in those congresses are untouched.
5. **The non-landmark backlog of both congresses.** Ordinary suspension-calendar bills,
   committee-reported measures and the rest of the two congresses' recorded votes. Large,
   and worth attempting only after the omnibuses, since those carry the most member-votes
   per unit of curation.

Declined outright, not queued: H.R. 3935, the FAA Reauthorization Act of 2024
(P.L. 118-63). Its margin is fine — 351-69 on Clerk roll 364/2023 — but no `ISSUE_MAP`
key expresses aviation policy, and attaching a 269,000-character programs bill to
`infrastructure` (keywords: roads, bridges, grid, water systems) would be the stretch
rule 2 forbids. Same reasoning as the S. 2503 ROTOR Act decline.

### Two rules from the first issue-first pass (Support for Israel)

11. **A near-unanimous margin is near-unanimous *relative to the question being scored*.**
   Rule 10 declined H.R. 8034 at 366-58 as distinguishing nobody, and for the general
   foreign-policy keys that was right: H.R. 8035's 311-112 Ukraine split already carried
   the supplemental's signal, and 366-58 added nothing to it. Under `israel_support` the
   same 58 nays are the entire point — they are the members who declined to fund Israel's
   missile defence on a bill that asked nothing else of them. So a decline recorded in a
   ledger is scoped to the keys of the pass that recorded it, and a later issue-first pass
   may reverse it. Reverse it *in writing*: `db/vr-israel-vote-seed.json` carries a
   `reversals` block and the Phase A decline's `why` string now ends in "SUPERSEDED
   2026-08", in both the builder and the seed. Never quietly rewrite the earlier judgement.
12. **The decisive-question gate takes shape-gated exceptions, never a loosened regex.**
   Rule 8 admits passage, concurrence and conference reports only. Two question forms
   decide substance without being any of those, and `scripts/test-vr-vote-seed.mjs` now
   admits each for exactly one measure shape: "On Agreeing to the Amendment" (House) or
   "On the Amendment" (Senate) on an `H.Amdt.`/`S.Amdt.`, and "On the Motion to Discharge"
   on an `S.J.Res.`/`H.J.Res.`. The
   second is the load-bearing one for arms-sale disapproval: under the Arms Export Control
   Act the resolution is the only vehicle, the discharge motion is the only vote the Senate
   ever takes on it, and a nay there is a recorded decision to let the sale proceed. Note
   how narrow the gate is — "On the Motion to Discharge" on a *bill* still fails, because
   there the discharge really is a step toward a later passage vote. Every roll admitted
   under an exception must carry a `decisiveWhy` of at least 24 characters saying why the
   question decided the substance; the test fails the seed otherwise.
   Kept separate from the exceptions is a shorter `PASSAGE_FORMS` list, for captions that
   *are* passage under a chamber's own house style rather than something argued into the
   set. It holds one entry: "On the Joint Resolution" on an `H.J.Res.`/`S.J.Res.`, the
   Senate's caption for the up-or-down vote on a joint resolution's text — the same act as
   "On Passage", which is why it carries no `decisiveWhy`. It is still shape-gated, and
   nothing procedural wears that caption: Senate motions read "On the Motion to …" and
   cloture reads "On Cloture Motion". Both stay out.

## Support for Israel — the first issue-complete vertical, and what's queued

Migration `20260812000000_vr_israel_support_rollcalls.sql` ingests 16 decisive roll calls
across the 117th–119th under one new `ISSUE_MAP` key, `israel_support`: six House rolls
(H.R. 5323 Iron Dome 420-9; H.Amdt. 478 to the FY24 State-Foreign-Ops bill; H.R. 6126
226-196; H.R. 7217 250-180; H.R. 8034 366-58; H.R. 8369 224-187), nine Senate discharge
votes on arms-sale disapproval resolutions, and House roll 243/2026 on H.Amdt. 235, which
was already live and is re-emitted as a no-op so the seed and the database agree. 415
attributed member-votes at the time, all through the bioguide → roster path — **713 after
the roster expansion below, on the same 16 rolls**. H.R. 8034 is created as a
child of H.R. 815 under rule 10 and carries `israel_support` alone; the parent keeps its
five existing keys and gains none, because the Israel money is Division A and nothing else.

Coverage after that pass, measured rather than asserted: 60 of the 63 roster slugs were
**scoreable** on the key (at least one yea/nay on a mapped measure), and **4** were
rankable — schiff, fetterman, jayapal, tlaib. The binding constraint was not mapping work:
of the 46 people holding a stated `israel_support` position, **42 had no bioguide → slug
entry at all**, so no vote could ever attach to them no matter how many rolls were ingested.

### The roster expansion — done, and what it taught

Migration `20260813000000_vr_israel_roster_expansion_votes.sql` closed that gap for **37 of
the 42**. All 37 are now attributable and all 37 are rankable on the key: `israel_support`
rankable people went **4 → 41**, rankable (member, issue) pairs **693 → 731**, recorded
yea/nay member-votes **6,840 → 7,132**, on the same 16 roll calls with no new curation.

The five who cannot be attributed, on the record so nobody re-opens the question: hegseth,
keith_kellogg, witkoff and zohran_mamdani have never served in Congress, so no Bioguide ID
exists for them at all; **ratcliffe** does resolve (R000601) but his only service ended
2020-05-22, entirely outside the 117th–119th window, so a roster entry could never carry a
vote. An entry for appearances' sake is worse than the gap it papers over.

13. **Roster admission is an explicit act, and drift in it is a real failure mode.**
   `db/vr-member-map.json` had fallen **101 entries behind its own generator**: slug →
   bioguide is read out of the congress-images portrait URLs in `BROWSE_PHOTOS`, portraits
   kept being curated, and `scripts/vr-gen-member-map.mjs` was never re-run. That silence
   *was* the 42-member gap. But a blind regenerate would have swept the roster 63 → ~164
   and silently changed the Official Record for ~100 people no pass had reviewed. So the
   ceiling is now stated in `db/vr-roster-admitted.json` and enforced both ways: a slug
   admitted there with no readable Bioguide is a hard generator error, and a curated
   portrait not admitted there is counted as `unadmittedPortraits` and attributes nothing.
   `node scripts/vr-gen-member-map.mjs --check` exits 1 on drift — run it in any pass that
   touches portraits. 73 admitted-eligible portraits remain as visible headroom.
14. **A widening of the roster can LOSE a member.** Annotating former members out of
   `legislators-historical.json` gave Rubio's roster row a state again, so he matched both
   that row and the `SENATE_ALUMNI` stand-in, the (surname, state) resolver read two rows as
   two people, and he was skipped as ambiguous on all three 118th arms-sale rolls — a
   regression introduced by the same change that fixed 37 others. `senateLookup` is now
   deduped by bioguide and ambiguity counts *distinct people*, not matching rows. Any pass
   that widens the roster must re-check the members who were already attributed.
15. **A Senate surname is not the last word of a name.** Senate roll-call XML carries no
   bioguide, so a senator resolves on (surname, state) — and the Senate writes
   `<last_name>Van Hollen</last_name>`. A last-word split yields "Hollen" and Chris Van
   Hollen silently receives nothing on nine arms-sale rolls he actually voted on. The
   builder keeps the roster's full name and compares it against the chamber's own surname
   string, so multi-word and hyphenated surnames match whole.
16. **De-duplicate an overlay at the grain of the table's unique index.**
   `scripts/vr-coverage-report.mjs` skipped a whole seeded roll call the moment that roll
   existed live, which is right for a new ingest and wrong for a re-attribution: every roll
   in this pass was already deployed, so the 292 yea/nay votes it unlocked read as zero and
   the pass looked inert. The overlay now keys on (roll call, member), matching
   `vr_member_votes`' own unique index, and still stops double-counting after the deploy.

### The Phase A re-attribution — done

Migration `20260814000000_vr_phase_a_roster_expansion_votes.sql` closed the debt the roster
expansion created. `db/vr-phase-a-vote-seed.json` was rebuilt against the 100-slug roster:
the same 29 roll calls, the same questions, tallies and party-crossover flags, **731 → 1,217
attributed member votes** (+486), distinct people **56 → 93**. Rankable (member, issue) pairs
went **731 → 765** (+34) across 14 issue keys, spread over 19 people — the heaviest being
`health_drug_prices` (6), `econ_workers` (5), `strong_defense` (5) and `veterans` (4).

Nobody gained a *first* rankable record from it, and that is the expected answer rather than a
disappointment: the same 37 members had already gained theirs from the Israel rolls one pass
earlier. What this pass bought is breadth — those members can now be judged on domestic
spending, defense authorisation, veterans' care and surveillance rather than on Israel alone.
Phase A's curated issue rows were not touched; only who is recognised changed.

17. **A member can be lost to a resolver bug on one seed and not another, so fix both.**
   The Senate resolver exists in two builders. Fixing the last-word surname split and the
   alumni duplication in `scripts/vr-build-israel-vote-seed.mjs` left the identical two
   defects sitting in `scripts/vr-build-phase-a-vote-seed.mjs`, where they cost 30 more
   member votes: Van Hollen was skipped on all 15 Phase A Senate rolls, and Rubio — who
   *was* attributed on the narrow roster, because his un-annotated row carried no state —
   would have been dropped as ambiguous the moment the widened roster gave it one. Verified
   counterfactually against the real XML for senate 117/2/325: the old resolver resolves 29
   of 100 senators and flags 1 ambiguous, the new one resolves 31 and flags none. When a
   resolver is fixed, grep for every builder that carries a copy of it.
18. **A roster admission is a debt against every seed already built.** Widening the roster
   does not just unlock the pass that asked for it — it silently under-attributes every
   existing seed, because each was filtered through the roster as it stood. The obligation
   is now written down: after any change to `db/vr-roster-admitted.json`, re-run **every**
   `db/*-vote-seed.json` builder and emit the differences, rather than only the seed the
   admission was motivated by. Both re-attribution migrations are pure re-assertions with
   `ON CONFLICT DO NOTHING`, so this is mechanical and safe to repeat.

Queued, in priority order:

1. **A stance pass over the 56 stance gaps.** These members already have judged votes on
   the key and are one sourced sentence away from rankable. Highest-volume first: curtis
   (12 judged, 100% pro-support), then barrasso, booker, collins, cruz, durbin, ernst,
   graham, grassley, hawley, john_cornyn, jon_ossoff, lee, murkowski, rand_paul and warren
   at 9 each; House at 7 each, including massie and maxine_waters at 14%, bennie_thompson
   and kclark at 29%, aoc at 0%, khanna 17%, crockett and mtg 33%, boebert 67%,
   scott_perry 83%. No position may be inferred from these numbers — that is precisely the
   invention the mapping rules forbid. The votes say what to go looking for, not what the
   member said.
2. **H.R. 340** (Hamas financing sanctions, 363-46). Queued rather than mapped: the margin
   is real and the subject is squarely on-key, but it needs its own read against rule 4
   before a direction is coded.
3. **The 117th column is one roll deep.** H.R. 5323 is the only 117th record on this issue,
   and a 420-9 vote is a thin signal by design. Contested 117th measures touching Israel
   aid, the Abraham Accords implementation bills and the Iron Dome supplemental's Senate
   path are all uningested.
4. **`is_primary` on H.Amdt. 235.** Its display-primary row is still `america_first_fp`
   from the earlier pass, while its strongest signal is now `israel_support` at weight 95.
   Moving it would be non-additive and purely cosmetic — `is_primary` drives sort order,
   the "Primary" badge and the Legislation-library link, never scoring — so it waits for a
   pass that is allowed to rewrite existing rows.
5. **The remaining 72 unadmitted portraits.** Every one has a readable Bioguide and would
   widen attribution across every ingested issue at once. Admission is cheap to write and
   expensive to get wrong, so it belongs in a pass that can re-measure the whole record —
   it must respect the photo gate in `scripts/test-photo-coverage.mjs`, which requires
   a bundled face for every roster slug, and under rule 18 it must re-run every vote-seed
   builder rather than just one.

One naming collision a reader of the coverage table would have tripped over is now repaired,
and the correction matters more than the original note. The slug `kennedy` is **Rep. Mike
Kennedy** (K000403, R-UT-03) — the id cmp-data.js, the UT-03 ballot breakdown and 16 curated
stance cards all belong to. Its portrait pointed at K000404, **Del. Kimberlyn King-Hinds**
(R-MP), so `scripts/vr-gen-member-map.mjs` derived `K000404 → kennedy` and 27 of her House
votes were written under his id, where they scored against his stated positions on four
issues. The portrait is repointed, the map regenerated, and
`20260815000000_vr_fix_kennedy_identity_collision.sql` removes those 27 rows; the 2 that
survive (119/1 rolls 112 and 114, H.J.Res. 89 and 88) are his own, seeded by name and
confirmed against the Clerk record. King-Hinds now resolves to no slug and is skipped.

Senator **John Kennedy** (K000393, R-LA) is `kennedy_john`, and his 17 Senate votes were
always attributed correctly — they were seeded by name, not through the map. He was simply
absent from the map, so an automated Senate ingest would have skipped him; he is now admitted
under the `kennedy_identity_aug2026` wave in `db/vr-roster-admitted.json` and K000393 resolves
to his own id.

Both defects are now unrepeatable rather than merely fixed: the generator refuses to write a
map where an admitted slug's portrait Bioguide names someone else, and
`scripts/test-identity-integrity.mjs` §12 asserts the same agreement from committed files
alone. That check found a second live instance on its first run — `bmoore` (Blake Moore,
M001213) pointing at M001209, Ben McAdams, a Democrat who left in 2021. No vote row needed
repair there, because every `bmoore` row was seeded by name and verifies against the Clerk
record as Blake Moore's own.

### The vote seeds cache the map's answer, so they had to be corrected too

Every `memberVotes` row in a vote seed carries both the `bioguideId` it was pulled for and
the `politicianId` the map resolved that Bioguide to **at pull time**. The Bioguide is the
fact; the pid is a cached lookup. Correcting the map does not update the seeds, and four
generators — `vr-gen-house-migration.mjs`, `vr-gen-israel-vote-migration.mjs`,
`vr-gen-phase-a-vote-migration.mjs`, `vr-gen-israel-roster-expansion-migration.mjs` — copy
that cached field straight into SQL. Re-running any of them would have emitted the deleted
rows again as a brand-new migration.

So the 24 K000404 rows in `db/vr-house-seed-119-s2.json` and the 1 in
`db/vr-israel-vote-seed.json` are removed (`memberVoteCount` 713 → 712, and roll 2/243's
`rosterSkipped` 382 → 383), which is simply what a re-pull under the corrected map produces:
both files already state that unmapped members are counted in `rosterSkipped` and never
guessed, and an unmapped K000404 belongs in that count. Regenerating each migration now
differs from the applied one only by those rows. No other member's row changes — `isParty`
was computed from the full chamber tally, and `partyTotals` is retained per roll call, so
neither depends on which members the roster happens to include.

`scripts/vr-seed-pid-guard.mjs` makes all four generators exit non-zero, naming the offending
rows, on any seeded pair the current map contradicts. It refuses rather than repairs on
purpose: silently re-resolving would emit a migration whose rows disagree with the seed it
claims to come from, and silently dropping the row would shrink a window the seed presents as
a complete chamber tally. A mismatch means the seed needs re-pulling — an operator's call.
`vr-gen-senate-migration.mjs` needs no guard; it resolves each pid from the Bioguide at
generation time, so its output cannot outlive a map correction.
`scripts/test-identity-integrity.mjs` §13 asserts the same across all five seeds (4,240
pairs) on every push, so a stale seed does not have to wait for a generator run to surface.

## Expected result — the ready-to-result comparisons

Each becomes a real both-sided comparison the moment its member's formal record on the
issue is pulled and classified (member already has a stated stance + a Say-vs-Do score):

| Member | Issue | Stated stance | Say-vs-Do | Readiness |
| --- | --- | --- | --- | --- |
| Adam Schiff | Government Transparency | support | scored | ready (clean) |
| Rashida Tlaib | Foreign Policy | oppose | scored | ready (clean) |
| Pramila Jayapal | Foreign Policy | mixed | scored | conditional (mixed stance scores softly) |
| Joni Ernst | Healthcare | — | scored | attribution-ready; awaits a stated stance |
| Maxine Waters | Justice | — | scored | attribution-ready; awaits a stated stance |
| Trent Kelly | Strong Defense | support | scored | **already both-sided (Phase 11)** |

To confirm after the run: open each member's profile → "Record vs. Public Picture" and
verify the issue now shows a two-sided comparison (Aligned / Mixed / Diverges) rather
than a one-sided score.

## Not reachable by this pull (needs Phase 13B)

State executives / law officers and state legislators with Say-vs-Do scores have no
federal roll call, so a Congress.gov ingest cannot create their comparisons. Those
require modeling **non-legislative formal actions** (executive orders, litigation,
administrative decisions) on the Official Record side — Phase 13B.

## Senate path — scaffold now, automated XML ingest next (Phase 13B)

The Congress.gov API has **no Senate roll-call resource** (`/senate-vote/{congress}` →
"Unknown resource"), so the Senate side has its own source seam rather than the House's
Congress.gov fetcher:

- **`netlify/lib/vr-senate-source.ts`** — the seam the ingest calls for
  `chamber === "senate"`. It returns the same canonical `RawVote[]` the House fetcher
  produces, so every downstream step (idempotent upserts, member map, issue seed, pack
  refresh, read path, UI) treats a Senate roll call exactly like a House one — there is
  no chamber special-casing past this seam.
- **`db/vr-senate-seed.json`** — the **active** source today: a small, curated set of
  real 119th-Congress Senate roll calls, built + audited by
  `scripts/vr-build-senate-seed.mjs` straight from official senate.gov roll-call XML
  (every position traces to a live senate.gov document; nothing is invented).
- **`netlify/database/migrations/*_seed_senate_voting_record.sql`** — the deploy-time
  twin, generated from the same seed JSON by `scripts/vr-gen-senate-migration.mjs`, so
  the votes are present the moment the branch DB is provisioned (no manual ingest call).

**The planned next step is the live senate.gov XML ingest.** It is scaffolded (not
omitted) in `vr-senate-source.ts` behind `VR_SENATE_XML`, currently a documented stub
that falls back to the curated seed. Finishing it means: fetch the vote menu +
per-vote XML, resolve each member by (last name, state) against `db/vr-member-map.json`
(senate.gov carries no bioguide id — this is the one extra step the House path doesn't
need; `scripts/vr-build-senate-seed.mjs` already contains the reference resolver), and
curate the measure→issue mappings for arbitrary new votes. Until then, the curated seed
IS the Senate source, and this scaffold is the bridge.

### Run the Senate ingest (once VR_SENATE_XML or the seed is in place)

```sh
# Same auth, same endpoint as the House — only the chamber changes.
node scripts/vr-ingest.mjs run senate 119 20
```

To extend the seed: add roll-call numbers to `ROLLCALLS` in
`scripts/vr-build-senate-seed.mjs`, re-run it, then regenerate the migration:

```sh
node scripts/vr-build-senate-seed.mjs
node scripts/vr-gen-senate-migration.mjs > netlify/database/migrations/<ts>_seed_senate_voting_record.sql
```

## The fiscal / enforcement pass — 119th Congress, done

Aimed at the user's brief for "the next high-value 119th Congress bills," this pass ended up
answering a different question than it was asked, and the reason is the finding worth keeping.
The candidate list (appropriations packages, rescissions, immigration enforcement, fentanyl,
DC crime) was scanned bill by bill against the Clerk's and the Senate's own roll-call records.
What the scan showed is that the 119th's biggest measures were **already mapped and badly
under-attributed**: H.R. 1 carried fourteen issue keys and nine attributed voters on its House
passage roll; H.R. 4 carried eight keys and nine voters; S. 331 carried three keys and eight
senators. The mapping work had been done. The vote rows had not.

So the pass is 3 new roll calls, 5 topped-up roll calls, **414 attributed member-votes** and
only **3 new issue mappings** — two of them on the single new measure. That ratio is the point,
not an apology for it.

`scripts/vr-build-fiscal-enforcement-vote-seed.mjs` → `db/vr-fiscal-enforcement-vote-seed.json`
→ `scripts/vr-gen-fiscal-enforcement-migration.mjs` →
`20260823000000_vr_fiscal_enforcement_rollcalls.sql`.

| chamber | roll | measure | question | totals | attributed |
|---|---:|---|---|---|---:|
| senate | 119/1/127 | S. 331 | On Passage of the Bill | 84-16 | 38 (was 8) |
| house | 119/1/145 | H.R. 1 | On Passage | 215-214 | 60 (new roll) |
| house | 119/1/166 | S. 331 | On Passage | 321-104 | 60 (new roll) |
| house | 119/1/168 | H.R. 4 | On Passage | 214-212 | 60 (was 9) |
| senate | 119/1/372 | H.R. 1 | On Passage of the Bill | 50-50, VP breaks tie | 38 (was 8) |
| house | 119/1/190 | H.R. 1 | On Motion to Concur in the Senate Amendment | 218-214 | 60 (was 39) |
| senate | 119/1/411 | H.R. 4 | On Passage of the Bill | 51-48 | 38 (was 8) |
| house | 119/1/264 | H.R. 3486 | On Passage | 226-197 | 60 (new measure) |

One new measure: **H.R. 3486, Stop Illegal Entry Act of 2025** (`tough_on_crime` 100 primary,
`border_security` 65), read from the engrossed text at `BILLS-119hr3486eh`. One new mapping on
an existing measure: **`america_first_fp` 65 on H.R. 4**, from the enrolled text at
`BILLS-119hr4enr`, where nineteen of the twenty rescission paragraphs are foreign assistance
(~$7.9B). Sixteen roll-call classes and eight facets are declined in the seed's own
`declinedRollCalls` and `declinedFacets`, with the reasoning attached to each.

Coverage moved 9,588 → 9,889 recorded yea/nay member-votes, 4,347 → 4,775 rankable, and
933 → **948** rankable (member, issue) pairs. The breadth number is small on purpose: almost
every pair this pass touches was already rankable through some other measure. What changed is
depth — 428 more judged votes standing behind positions that previously rested on one or two.

### Three rules, from the fiscal / enforcement pass

19. **A landmark that is already mapped is usually an attribution gap, not a mapping gap.**
   Before hunting new bills, check the attributed-voter count on the rolls already live. A
   measure with fourteen keys and nine voters out of 432 is producing a fourteenth of the
   signal it could. Topping it up costs no new editorial judgement — the mapping argument was
   already made and published — and it deepens every stated position that touches those keys
   at once. Volume of *bills* is the wrong metric; volume of *judged (member, key) evidence*
   is the right one.
20. **Omitting a key from `db/vr-issue-seed.json` is not a removal.** `applyCuratedIssueSeed()`
   upserts with `onConflictDoUpdate`, so it only ever touches the keys the seed carries — a
   key left out is a live row left alone, not a live row deleted. Two consequences. First,
   disagreeing with an earlier pass's mapping cannot be expressed by silently dropping the key;
   that needs its own migration and its own argument, and until then the honest move is to say
   so in `declinedFacets` and leave the row standing (this pass would not have added
   `gov_services` to H.R. 4, and did not remove it). Second, any key the seed *does* mirror
   must match the live rationale **byte for byte**, or the next `POST /seed-issues` silently
   rewrites published text. Verify the mirror against the migration source, not against memory.
21. **The live rationale is the first writer's, not the latest migration's.** Re-assertions use
   `ON CONFLICT DO NOTHING`, so when several migrations map the same (measure, key) the text in
   the database is the earliest one's — `20260807000000` re-states nine of H.R. 1's keys in its
   own words and none of that wording is live. Mirror only the keys whose first writer you have
   actually read. Corollary: grep **every** migration for a measure before adding a key to it.
   H.R. 4 looked like a three-key measure in the migration that created it and is a seven-key
   measure once `20260721140000` is counted.
22. **Read every candidate mapping backwards before you write it.** `support_meaning` is not a
   statement about the yea bloc; it tells `_voteEffectiveSupport` that a yea advances the issue
   **and** that a nay cuts against it, and the nay side is scored just as hard. So the test is
   not "does this provision exist in the text" — it is "is the nay bloc's vote honestly described
   as opposition to this issue". The August 2026 densification pass drafted twelve rows against
   real, verified provisions and shipped three; the nine refusals all failed the backwards read
   and none failed the forwards one. Two shapes recur, each an extension of rule 5 — and a third
   shape that used to sit here, "the section inside a vehicle", was retired by `20260911000000`
   because it was not a backwards-read failure at all; the product rule that replaced it closes
   this entry.
   · **The two-flank nay.** H.R. 8404 → `religious_liberty`: Secs. 6(b) and 7(a) are genuine
     affirmative protections, but a bloc voted no *because those protections were too weak*, so
     `yea_supports` records them as opposing the very thing they wanted more of.
   · **The conviction already carried.** H.R. 8034 → `strong_defense` and `cut_spending`: the
     emergency designation is real and the nays were not fiscal hawks; the conviction that vote
     actually records is already carried correctly by `israel_support`. A second key here is
     double-counting one belief, not new coverage.
   When a provision is real but the backwards read fails, the honest home for it is the refusal
   list in the migration header — written down, with the reason, so the next pass does not
   rediscover it as an opportunity.

   **The section inside a vehicle is still the section you voted for.** A provision does not stop
   counting because it travelled inside a larger bill. If the primary text contains a provision
   that clearly implicates key K, the measure belongs on K's formal ledger: a yea advances the
   package as written, including that provision, and a nay blocks it. Weight the row for the
   share of the bill the provision actually represents — a subtitle inside a defense
   authorization is a secondary key at low weight, not a primary one — and say in the rationale
   which sections carry it. Refuse only where the text contains no provision for K, where the
   same conviction is already carried by another mapping *on that same measure*, or where the
   measure is procedural. "Omnibus", "vehicle", and "members may have cared about a different
   title" are not grounds; the original position of this record, written in
   `20260720000000_hr1_omnibus_component_issues.sql`, is that an omnibus "should light up under
   MANY issues at once", and the vehicle bar had drifted away from it. Where a rider was
   separately voted, map the rider and not the parent — that is the duplicate rule, not the
   vehicle rule. Where the nay bloc split two ways for opposite reasons, rule 5 still governs and
   the key stays off. Direction is what the instrument does on K, not what motivated any bloc.
   `20260911000000` applied this to the three NDAAs that all carry a "Matters relating to Israel"
   subtitle and none of which carried the key: H.R. 8800 (40), S. 1071 (35) and S. 1605 (35).
   `20260912000000` applied it to the rest of the heavy single-key measures — H.R. 2670 (40,
   closing that trail at four NDAAs), H.R. 1 of the 117th onto `campaign_finance`,
   `gov_transparency` and `scotus_reform`, H.R. 4 of the 117th and H.R. 1181 and H.R. 8404 onto
   `states_federal_power`, and H.R. 36 onto `foreign_balance` from no mapping at all. Two things
   that pass settled and this rule should carry forward. **A provision may answer two chips.**
   H.R. 1181 Sec. 2(a) is both the gun-purchase-tracking question and the purchase-data question,
   and both rows are honest; the duplicate bar is about a rider that got its own roll call, not
   about a section that genuinely speaks to two keys. **A key with mappings running only one way
   is not a one-way key.** Every `states_federal_power` row was `yea_supports` until this pass,
   which is a fact about which votes had been read, not about the key; the chip is directional and
   the schema is bidirectional, so a vote that overrides the state's rule earns a `yea_opposes`
   row. What still bars a key is the chip's own SCOPE: `gov_transparency` is scoped in
   `alignment-tool.js` to disclosure BY members, so H.R. 4's Sec. 7 notice duty on state election
   administrators is not a mapping however transparent it is. Read the scope comment, not the
   label.

### Two rules from the consolidated-appropriations pass (`20260913000000`)

23. **A two-flank nay bloc disqualifies the keys the two flanks disagree about — not every key
   on the measure.** Rule 5's own test is "did the two blocs of nays want opposite things," and
   that question has to be asked *per key*, not once for the whole bill. H.R. 7148's 214 nays are
   193 Democrats and 21 Republicans, and on the SPENDING axis they are genuinely opposed: the
   Democratic nays objected to the levels and riders, the Republican nays to the topline. So
   `gov_services`, `national_debt`, `cut_spending`, `gov_balance` and `audit_spending` are all
   off, and `gov_services` is the sharpest case — it carries `lean: 'D'` in `alignment-tool.js`,
   so a `yea_supports` row would hand it to the 196 Republican yeas and take it from the 193
   Democratic nays, inverting the bloc the chip describes. But the same bloc is *not* internally
   opposed on Israel, on the abortion riders, on the defence appropriation or on the Medicare
   extenders, and on those axes the instrument does one thing and rule 5 has nothing to say. The
   failure mode this rule exists to stop is using one true observation about a bill's fiscal
   politics to void a whole division-by-division read. Read the nay bloc per key.
24. **When a measure has two decisive rolls in one chamber, rule 8's tie-breaker is which text
   was voted, not which vote came last.** The House passed H.R. 7148 on 22-Jan-2026 (roll 45,
   341-88) and concurred in the Senate amendments on 3-Feb-2026 (roll 53, 217-214). Roll 53 is
   the one ingested because it voted the ENROLLED text, and the enrolled text is what the
   mappings were read from. This is checkable rather than a preference: Division H of the enrolled
   act moves the P.L. 119-37 continuing-resolution date to 13-Feb-2026 and ratifies pay and
   obligations incurred during a lapse that began on or about 31-Jan-2026 — nine days after roll
   45. A division that did not exist yet cannot have been voted on, so attaching the enrolled
   bill's axes to roll 45 would score members on provisions they never saw. Where the two texts
   are the same, the later roll still wins on rule 8; where they differ, say which text each roll
   voted and ingest the one the mappings describe.

#### A bucket this pass needed: `below_floor`

   `20260913000000` declines eleven divisions and titles, and five of them are declined for a
   reason none of the existing buckets named: the provision is real, it clearly implicates a live
   key, and it is still too small a share of the vehicle to carry a row. The record's practical
   weight floor was 25 when this was written; the heavy-vehicle pass (`20260914000000`) took it to
   20 with the S. 2296 `back_police` and `homeless` rows, which are the two lowest in
   `db/vr-issue-seed.json`. Either way a one-line date extension inside one of eleven divisions
   does not reach it — the floor is a share-of-the-bill judgement, not a number to be argued down. Division I's
   Conrad 30, E-Verify, religious-worker and H-2B extensions (`immig_legal`), its NFIP and
   Cybersecurity Information Sharing Act extensions (`privacy_rights`), Division E Secs. 748-749
   on impoundment and apportionment reporting (`power_of_purse`, whose keyword list names both
   words outright) and Sec. 809's D.C. schedule I bar all sit here. `below_floor` is not a softer
   `no_provision`: it records that the provision exists and was read, so a later pass over a
   measure where the same axis IS the operative purpose can find it.

### Two rules from the heavy-vehicle densification pass (`20260914000000`)

25. **Two bills on the same subject may honestly carry different key sets, and the difference is
   the finding.** H.R. 7217 (118th, 366-58) and H.R. 8034 (118th, 366-58 on the same axis a
   month later) are both Israel security supplementals, and the temptation is to code the second
   like the first for consistency. The texts are not the same. H.R. 7217 is defence articles,
   Iron Dome and David's Sling procurement, and CENTCOM operations — `israel_support` primary and
   `strong_defense` secondary, and nothing else. H.R. 8034 keeps all of that and adds title III:
   $5.655B International Disaster Assistance, $3.495B Migration and Refugee Assistance, $75M
   INCLE, $10M for the Sinai MFO. That money is what `america_first_fp` is about, so H.R. 8034
   carries a third row and H.R. 7217 does not. Coding the pair alike — in either direction —
   would erase the substantive change between the two attempts, which is exactly the thing a
   member's two votes are supposed to be able to show. Consistency is owed to the TEXT, not to
   the pair.
26. **When a chip's scope note carves a subject out to another key, the row rests only on what is
   left.** `america_first_fp` was narrowed in August 2026 and its OUT list names aid to Israel
   specifically, handing it to `israel_support`. So the H.R. 8034 `america_first_fp` row cites the
   non-Israel humanitarian accounts and nothing else, and its weight of 50 is a share of those
   accounts, not of the bill. Its `support_meaning` is `yea_opposes`, because the chip's stated
   polarity is "'support' = cut, condition or wind down U.S. funding and commitments abroad" — a
   yea here increases them. Read the polarity line before choosing `support_meaning`; on the
   chips that are framed as a position rather than a subject, the intuitive direction is the
   wrong one about half the time. The migration's verification block asserts this row is still
   `yea_opposes`, because a later well-meaning "correction" to `yea_supports` would silently
   invert every member's score on the axis.

### Three rules from the SAVE / RISAA / ISASA pass (`20260915000000`)

27. **A refusal note written before a key existed is not precedent; re-read it when the taxonomy
   moves.** H.R. 8369's seed entry carried a `_note` declining the old `checks_balances` umbrella
   because "a member voting to force out bombs the administration had paused is voting about
   Israel." That is a reading of MOTIVE, which the product rule excludes, and it was written
   before the August 2026 split created `power_of_purse`. The bill's whole operative text —
   sec. 4 barring appropriated DoD and State funds from being used to withhold a delivery,
   sec. 5's 15-day delivery deadline, sec. 6 freezing the unobligated Office of the Secretary
   balances until each Secretary certifies to the Appropriations Committees — is a
   spend-what-was-appropriated instrument. It is now mapped `power_of_purse` 60 `yea_supports`.
   The general lesson: when a key splits, walk the refusal notes that cited the old umbrella.
   H.R. 8369 was the only `_note` in `db/vr-issue-seed.json` still citing `checks_balances` by
   name, and it is now annotated in place rather than rewritten — the original ground stays
   readable next to the re-read, so the reversal is auditable.
28. **`checks_balances` takes no roll-call mappings, by its own scope comment — refuse it on
   scope before reaching for rule 5.** `alignment-tool.js` says the key "has no roll-call mappings
   and is expected to keep none — a general-posture claim cannot be settled by any single vote,"
   and it sits on the receipt-card hold list for that reason. Anything with a named mechanism goes
   to one of the five mechanism keys. So for RISAA the answer was `congress_oversight`, not
   `checks_balances`, and the two-flank question — asked anyway, because the 147 nays are 88
   Republicans and 59 Democrats, exactly rule 5's shape — came back NO: both flanks wanted MORE
   constraint on executive querying (the thing they wanted added was the Biggs warrant amendment,
   house 118/2 roll 114, failed 212-212 the same day), and no provision of the act reduces a
   reporting duty to Congress. Cross-party nays are the trigger for the question, not the answer
   to it.
29. **A bill can be a preemption instrument and a subject-matter instrument at once, and the
   preemption row runs the opposite way from the sponsor's usual posture.** The SAVE Act's new
   NVRA sections 4(b) and 8(j) tell every State it may not register a federal-election applicant
   without documentary proof "[u]nder any method of voter registration," sec. 2(k) narrows the
   section 4(c) exemption that had kept the Act off certain States entirely, and secs. 2(i),
   2(j) and 3 make the enforcement federal too. That is `states_federal_power` coded
   `yea_opposes` — a yea substitutes a federal rule for the State's own procedure — even though
   the yea bloc was 216-0 Republican. Direction is what the instrument does, not who voted for
   it. Name the state-side counterweights in the rationale (here secs. 2(f)(1), 2(g) and 7) so
   the reader can see they were weighed rather than missed.

#### Two scope answers this pass needed

   **Pairing chips need both halves.** `immig_balance` is "Pair strong border security with earned
   legal pathways." The SAVE Act has neither: no border measure, no pathway, only
   noncitizen-registration enforcement. Mapping it because the word "immigration" appears in the
   bill's orbit is the slogan-level fit that gets refused. Same test killed `border_security` and
   `deportations` on the same measure — nothing in the text removes anyone from the country.

   **A specialised court's contempt power is not `judicial_check`.** RISAA sec. 5's FISC amicus
   changes and sec. 14's contempt authority do strengthen a court against the executive, but the
   key as scoped is about federal courts halting unlawful executive action, including nationwide.
   Filing FISA rolls there would put them in the nationwide-injunction percentage.

### Three rules from the federal formal-depth pass (`20261009000000`)

30. **Adding an honest secondary can make a member's record read WORSE. Check the primary wall
   before you ship a depth pass, not after.** This is the rule this pass exists to write down.
   `H.J.Res. 131` was mapped `gov_regulation` 60 `yea_supports` — correct on the merits, and the
   same weight the two live CRA precedents `H.J.Res. 88` and `H.J.Res. 89` already carry. Adding
   it gave 76 senators a **fourth** non-primary `gov_regulation` act, and four is exactly where
   `_recordDirectionIndex` in `stance-helpers.js` changes branch. Below four the member sits on the
   `thinEnough` branch (`judged >= _RD_THIN_MIN`, `actStrength >= _RD_THIN_MIN_STRENGTH`), whose
   source comment says in terms that **the primary wall is deliberately not on this branch**, and a
   one-sided run still reads. At four, `judged >= _RD_MIN_JUDGED` moves the member onto the
   `deepEnough` branch, where `out.primary < _RD_MIN_PRIMARY` returns
   `stop('record_thin', 'no_primary')`. `formalPatternIndex` then prints the row as unread with
   reason id `incidental` — **"Not about this issue"** — for a member who has voted the same way
   four times on four Congressional Review Act disapprovals.
   The engine is not wrong. Deep, one-sided and entirely incidental is a fair description of four
   secondaries and no primary, and it is a truer sentence than a confident direction would have
   been. So there are exactly two illegitimate responses and one legitimate one. **Do not** lower
   `_RD_MIN_PRIMARY` or move the wall: it is a floor, and the Utah cleanup's whole point was that
   floors do not move for convenience. **Do not** weaken or drop the mapping that tripped it either
   — that is tuning a reading to protect an index number, and rule 25 says consistency is owed to
   the text, not to the aggregate. The legitimate response is to **supply a PRIMARY act**, and
   before reaching for a new instrument, census the key: run the weight/`is_primary`/roll-coverage
   query per key and ask *which chamber can actually reach a primary here*. On `gov_regulation` the
   answer was that the Senate could not, and the reason was **attribution, not vocabulary**. All
   three of the key's 119th primaries were already mapped `w100 PRIMARY` and none was reachable by
   a senator: `H.R. 2965` is a House bill the Senate never voted on (correct), `H.J.Res. 25` was
   enacted as **P.L. 119-5 carrying no roll call at all, in either chamber**, and `S.J.Res. 18` —
   **a Senate joint resolution** — held only its **House** passage roll while its own chamber's
   52-48 vote sat unclaimed on senate.gov. Attributing three rolls the chambers had published all
   along cleared the wall upward: the 76 senators go `thin → strong` instead of `thin → unread`,
   and the pass's national `clear` count moves +272 instead of +101.
   Two corollaries worth keeping. First, **an enacted law with no attributed roll call anywhere is
   a defect on its face** — grep for it directly rather than waiting for an index to complain.
   Second, **a measure whose `chamber` does not appear among its own roll calls is almost always an
   ingest gap**, and it is a two-line query: it found `S.J.Res. 18` immediately. Where no primary
   is reachable even in principle, say so and stop. `energy_production` keeps six senators unread
   after this pass for exactly that reason: its only federal primaries are `H.Amdt. 248` (a House
   amendment) and `H.R. 1949`, which passed the House and has sat on the Senate Legislative
   Calendar under General Orders since 2025-12-08 without a vote. There is nothing to attribute,
   so the remedy is a future standalone contested Senate instrument on the key — never a fifth
   secondary, which would only deepen the same wall.
31. **A reserve fund, a point of order and a sense-of-the-Senate are not acts. Refuse the
   vote-a-rama amendment class on the instrument, before you ever look at its subject.**
   `S.Amdt. 2126` (Sanders) to `H.Con.Res. 14` is the trap in its most tempting form: contested
   47-52, on precisely the subject `econ_workers` describes, in precisely the chamber where
   `econ_workers` was blocked. Its stated purpose is "To make sure the Senate can increase the
   Federal minimum wage to $17 an hour" — a reserve-fund/point-of-order device that creates no
   authority, appropriates nothing and changes no law, offered to a **budget resolution, which is
   never presented to the President**. Scoring it would tell a reader that 47 senators voted to
   raise the minimum wage when what they voted for was permission to consider raising it later.
   The tell is textual and mechanical, so use it as a filter: `"To establish a deficit-neutral
   reserve fund relating to…"`, `"To make sure the Senate can…"`, and anything whose operative
   verb is *consider*. Declined with it on identical grounds here: Senate 119/1 rolls 175
   (Alsobrooks Amdt. 1466), 183 (Kim Amdt. 1644) and 186 (Baldwin Amdt. 1693), plus roll 65 in the
   `S.Con.Res. 7` vote-a-rama. Note this does **not** narrow rule 12: a real second-degree
   amendment to a real bill is still admissible on the shape gate, which is how `S.Amdt. 3535` to
   `S. 2296` — whose entire text is an appointment mechanism — came in on the same pass that
   refused these.
32. **The mirror of rule 27: when a key narrows, walk the live MAPPINGS, not just the refusal
   notes.** Rule 27 says re-read a refusal when the taxonomy moves. The reverse exposure is worse,
   because a refusal that goes stale publishes nothing while a **mapping** that goes stale keeps
   publishing. This pass refused `america_first` on `H.R. 1069` on solid ground — `alignment-tool.js`'s
   August 2026 narrowing removed the countering-China cards from the key because "the chip never
   mentioned" it, and the residue moved to `america_first_fp`, scoped to foreign aid and
   open-ended commitments. Applying that same reading one row over finds `H.R. 1048` (DETERRENT
   Act) live with `america_first` 70 `yea_supports` whose rationale reads, in full, "Targets
   foreign influence — especially from China, Iran, North Korea, and Russia — on U.S. campuses as
   a national-security matter." That is the exact ground the vocabulary disowned, on a measure
   already correctly `gov_transparency` 100 PRIMARY, and it is neither `america_first` as now
   chipped nor `america_first_fp` (there is no aid or commitment in it). It is **not** corrected
   here, deliberately: under rule 21 the live rationale is the first writer's, the fix is a guarded
   `UPDATE` that has to carry its own argument, and doing it inside a depth pass would move a
   published number as an undisclosed side effect of an attribution wave. It is queued below as its
   own item. The procedure to add to any narrowing: after editing a key's scope note, query
   `vr_measure_issues` for every live row on that key and re-read each rationale against the new
   chip — the query is cheap, and `america_first` had five rows.

### Five rules from federal wave F2 (`20261011000000`)

33. **An emergency-termination resolution files on the SUBJECT it terminates, coded against the
   thing it terminates, and carries no process secondary.** `S.J.Res. 10` and `S.J.Res. 71` are one
   operative sentence each: "That the national emergency relating to energy declared on January 20,
   2025, by the President in Executive Order 14156 … is terminated." Executive Order 14156 is
   already in this record at `energy_production` w100 PRIMARY `yea_supports`, for directing agencies
   to use emergency authorities to expedite domestic production. Terminating it withdraws exactly
   those authorities, so **a yea cuts against the key and the row is `yea_opposes`** — the polarity
   is read off the target, not off the sponsor's party. Weight 90 rather than 100 because the
   instrument reaches the emergency authorities alone and not the separate permitting and leasing
   apparatus of EO 14154, which the record scores on its own. The corpus was already consistent
   about this instrument class before the wave and it stays consistent: `H.J. Res. 46`, on the
   February 2019 border emergency, carries `border_security` w90 PRIMARY `yea_opposes` as its single
   row, and `S.J.Res. 37`, on the Canada tariff emergency, carries `tariffs_authority`. Both file
   the subject and neither files a process axis. **`congress_oversight` is the tempting refusal
   here** and it was refused: a National Emergencies Act termination is in form Congress reclaiming
   a delegated power, but "who decides" is held by members on both sides of the substantive
   question, so filing it alongside the subject key double-counts one vote onto two chips. The wall
   argues nothing for it either — `congress_oversight` already has a Senate-reachable primary
   (`S.Amdt. 3535`). One instrument, one claim.
   **A new judged mapping owes a curated mechanism pair in the same pass that lands it.**
   `scripts/test-mechanism-completeness.mjs` gates every judged act on a Contradicted or Mixed row
   at 100%, so a mapping that arrives with no entry in `_DOS_MECH` (`consistency.js`) fails the
   suite at once rather than at the next audit — which is the point of the gate. Both resolutions
   got their `did` / `why` / `more` lines written from the introduced text, not from the mapping's
   category, because on a one-sentence joint resolution the derived voice would read "counted on the
   energy chip because that is the primary subject of this measure" on a document whose subject a
   reader cannot infer from its number at all.
34. **The same text voted twice is two acts. Admit both when each is the only record of somebody's
   position — and state in the file what the second one does NOT add.** 50 U.S.C. 1622(b)
   re-privileges a termination resolution every six months, which is how a second floor vote on
   word-for-word identical text happened in October after February's failed. Depth-padding is the
   obvious objection, so the seed answers it with the diff rather than with a claim: among senators
   who cast a yea or nay the two rolls are **identical, member for member**, and the only
   differences are absences that cut both ways — `kevin_cramer` was Not Voting on roll 95 and voted
   nay on roll 554, while `cruz` and `sheehy` voted nay on roll 95 and were Not Voting on roll 554.
   So admitting only one would leave a senator unrecorded on a fight they took a side in, and
   admitting both is the only way to record all 100 seats. What it does **not** do is add
   discrimination: nobody changed sides. **Write that sentence down.** An identical-text pair is
   admissible on coverage grounds and inadmissible as evidence of independent agreement, and a
   reader who works that out from the numbers unaided has caught the record being quiet about it.
35. **Recency does not beat the near-unanimity floor, and one instrument's two chambers must be
   admitted on the same bar.** `H.R. 6644`'s Senate passage roll (119/2/53, 89-10) clears rule 11 by
   a tenth of a point — the losing side is **10.101%** of the yea+nay pool, and one more yea would
   have put it under. It is admitted on that basis rather than on a comfortable margin, and the
   thinness is stated rather than smoothed. The LATER act on the same bill, the 85-5 motion to
   concur (119/2/182), is refused twice over: "On the Motion" is not a passage form under rule 12,
   and 5.556% is below the bar. The deciding argument is a consistency one and worth keeping: the
   House roll this record **already held** on `H.R. 6644` is 358-32 — **8.205%, below the bar** — so
   refusing the Senate's 10.101% while keeping the House's 8.205% would have the record admitting a
   less separating vote and declining a more separating one on the same instrument. Check the
   sibling roll's share before refusing on margin. Nine cloture motions and motions to proceed on
   the same bill (87-8, 90-8, 84-8, 82-11, 89-9, 84-6 …) are refused on rule 8's question form
   first and would fail rule 11 second; both reasons go in the ledger, because a refusal that rests
   on two grounds survives one of them being revisited.
36. **A densification wave's no-loss promise must be checked on the row model's `read` flag, over
   every pid — not on the shape counters. On this wave the counter-based check reported ZERO losses
   when there were 29.** This is the rule most worth having. `scripts/vr-federal-fpi.mjs` derived
   its "characterisation lost" list from `_fpiShape`'s counters (`band`, `strongN`, `splitN`,
   `issues`) and computed it only over pids whose counters MOVED. That is the right view for "is
   this member's brief readable" and the wrong view for "did any row stop being characterised",
   for two independent reasons: a tier can move between two read states without changing a
   counter, and a member who gains a row on one key while losing one on another nets out to no
   movement and is never examined. F2 tripped both. The direct check — for every federal pid, the
   SET of keys whose row carries `read`, before against after, set-wise rather than by arithmetic —
   found 29 rows that stopped being characterised, on 29 members the old list never looked at. Both
   causes were real and both were disclosed rather than repaired (see `readLossDisclosure` in
   `db/vr-federal-mapping-seed-f2.json`): 27 senators whose only `permitting_reform` act was a nay
   on `H.R. 3746` now have one act each way and read `mixed_thin`, which is a **contradiction
   surfaced, not a wall tripped** — the honest fix would be to decline a verified contested 89-10
   Senate passage vote so that 27 one-vote rows keep looking read, and that inverts rule 25; and 2
   representatives lose `america_first` as the named cost of the retraction. **A retraction wave
   needs this check even more than an additive one**, because subtracting an act can take a row
   below the judged floor and the loss is invisible in any table where the same member gained a row
   elsewhere.
   The corollary is about the test, not the data. **A green test proves nothing until it has been
   made to fail.** `scripts/test-vr-federal-wave-f2.mjs` was run against twenty-eight single-field
   mutations of the seeds, the migration, the engine and the curated prose — floor lowered, polarity
   flipped, PRIMARY demoted, weight softened, `DELETE` unguarded, disclosure deleted, losses
   understated, no-loss check removed, a Utah brief made to lose a row, retraction dropped, refusal
   argument gutted, row-count pin loosened, `state` fix reverted, tally softened, a vote attributed
   to nobody, a procedural question admitted, an attribution dropped, `H.R. 1069` mapped, a
   mechanism entry deleted, the derived sentence put in the curated slot, the prose stripped of the
   order it names — and every one had to produce exit 1 with a specific complaint. Two did not, and
   the reason was a defect in the test: `ok()` returned nothing, so the guard
   `if (!ok(...)) continue;` always continued and **silently skipped every tally, question and
   attribution check in section 1**. The suite had been green with 101 assertions; with `ok()`
   returning its verdict, section 9 added for the mechanism pair and rule 37's timestamp and
   generator-drift assertions added, it runs 181. The negative
   controls found that, not the green run.

37. **A roll call's timestamp is the document's, to the minute, with the offset on it — a calendar
   day is not a timestamp.** senate.gov prints `<vote_date>` as Eastern wall time with no zone
   attached ("October 8, 2025,  07:05 PM"). This wave's first seed filed the day alone, which the
   migration then inserted as `TIMESTAMPTZ '2025-10-08'` — read by Postgres as midnight in whatever
   zone the session happens to be set to, so a UTC-configured server stores the moment nine hours
   before the Senate cast it and a west-of-Eastern one can print the vote on the wrong day. The rule
   is the same one rule 4 states for tallies, applied to time: **file what the document says, do not
   file a rounded version of it.** The parse and the daylight-saving table live in the F1 builder
   (`scripts/vr-build-federal-depth-vote-seed.mjs`), and a later wave copies them rather than
   inventing a second spelling, so two waves' rollcalls stay comparable rows. The declared field in
   the builder's `ROLLS` table stays a CLAIM about the calendar day and is checked against the day
   the document prints — a disagreement drops the roll whole, which is what happened when the check
   was tried against a deliberately wrong date. `scripts/test-vr-vote-seed.mjs` already gated this
   corpus-wide (`voteDate is not an ISO timestamp`) and it is the test that caught the defect: it
   sorts after `test-vr-utah-committee-mapping.mjs`, which cannot run without a warm `/tmp` ingest
   cache, so **the suite aborted before reaching it and the wave looked green for two full runs.**
   When `npm test` stops early, run the scripts that sort after the stopping point by hand before
   claiming a green suite — an aborted suite is not a passed suite.
   A second finding rode along with the first: **a generated migration can fall behind its
   generator silently.** `scripts/vr-gen-federal-wave-f2-migration.mjs` prints to stdout and the file
   is written by redirection, so the on-disk SQL had a two-line refusal for `H.R. 6644`'s motions to
   proceed while the generator had grown the full rule-8-then-rule-11 argument. Nothing complained,
   because nothing compared them. The wave's test now regenerates and requires byte-identity, which
   is the only bar that keeps the deployed SQL and its stated reasoning from drifting apart.

### Five rules from federal wave F3 (`20261017000000`)

38. **"Census first" means census off the DATA, and the new ranking will not be the one the last
   wave left behind.** F2 closed its pass with a candidate list, and reusing it was the obvious
   opening move and the wrong one: three of its named candidates had since gained a Senate primary
   from F2's own rolls, and the key that turned out to matter most (`lands_preserve`, 96 unread
   senator rows) was not on it at all. The rebuild is two joins and one sandbox call, and it is
   cheap enough that there is no excuse for inheriting a ranking. PRIMARY-by-chamber comes off
   `vr_measure_issues × vr_measures`, counting distinct MEASURES — not rows — that carry the key at
   `is_primary` and have at least one roll call in that chamber; the unread half comes from calling
   `PDXConsistency.formalPatternIndex.rows()` through the `node:vm` sandbox and bucketing by the
   reason string the engine itself returns, restricted to the 99 senators on the reviewed roster.
   `node scripts/vr-federal-fpi.mjs --set all --waves f1,f2 --chambers` prints the whole thing.
   What the rebuild said: of 98 keys the formal index reports on, **35 had a Senate-reachable
   PRIMARY and 63 had none**, and on those 63 the row is written by the primary wall rather than
   by the member's record. The two dominant reasons split cleanly — `vehicle_only` 429 rows (every
   act arrived inside a package) and `incidental` 1486 rows (four or more secondaries and no
   primary) — and they need different fixes, which is the point of bucketing rather than totalling.
   **A wave that ranks 23 holes and closes 2 looks like a failure until it can name why the other
   21 are attribution holes.** The four highest-ranked keys (`health_rural`, `free_speech`,
   `econ_smallbiz`, `econ_workers`) were re-checked instrument by instrument, not carried on F2's
   word, and all four are blocked on the same thing: there is no admissible standalone Senate
   instrument in the 119th. Seven keys are written up that way in `blockedOn`, each naming the exact
   bill that would unblock it (S. 2683, S. 146, H.R. 3193, H.R. 5408, S. 1101 …). A blocked key with
   a named bill is a finding. A blocked key with no bill named is a curator who stopped looking.

39. **A process secondary that consistency DEMANDS can still be a deletion of information. Project
   it, measure it, and refuse it — and write the divergence on both measures.** This is the wave's
   hardest call and its most reusable rule. Every Congressional Review Act resolution in the record
   carries a `gov_regulation` process secondary — H.J.Res. 44, 88, 89 and 131 at weight 60,
   H.J.Res. 78 at 70 — so filing the same row on `S.J.Res. 7` and `H.J.Res. 140` was the consistent
   move, and it was drafted. Then it was measured: the pair gains **ZERO** characterised rows and
   costs **TWO** (`angus_king/gov_regulation`, `lujan/gov_regulation`, both read → unread). The
   mechanism is rule 30's exactly. Each senator holds three live `gov_regulation` acts —
   H.J.Res. 44, 88, 89 — all non-primary, all nay, a perfectly uniform record the engine names
   today. Two more non-primary acts take them to five, across `_RD_MIN_JUDGED`, onto the
   `deepEnough` branch, where the primary wall (`primary < 1`) fires because neither senator has a
   recorded vote on any `gov_regulation` PRIMARY. A uniform record stops being named and **nothing
   is named in its place** — a tripped wall, not a surfaced contradiction, because all five acts
   point the same way and there is no disagreement for the engine to have found. Rule 30 says a key
   is fixed by supplying a PRIMARY and never by a further secondary, and `gov_regulation` needs no
   fixing: it already holds five primaries, two Senate-reachable. **Consistency with a corpus habit
   is not a reason on its own** — it is a hypothesis, and the counter is the referee. Two procedural
   notes that cost nothing and save the next curator an afternoon: write the refusal on BOTH
   measures rather than cross-referencing one, because the closest sibling in the record
   (H.J.Res. 131, the other BLM CRA) DOES carry the row and a curator comparing the two files needs
   the reason in front of them; and state what would make the row correct — here, a
   `gov_regulation` PRIMARY that King and Lujan are actually recorded on. S.J.Res. 18 is the key's
   Senate primary and neither of them is on its roll.

40. **A mirror pair — a PRIMARY and a non-primary on the same measure pointing OPPOSITE ways — is
   the one shape in which adding a secondary is worth it in a densification wave, and it still owes
   a loss ledger.** `H.J.Res. 140` disapproves Public Land Order No. 7917, so it carries
   `lands_preserve` w90 PRIMARY `yea_opposes` and `lands_energy` w75 non-primary `yea_supports`:
   the resolution really does reopen 225,504 acres to mineral leasing, and a member who voted for
   it has done that. The mirror is what makes the secondary safe in general — opposite polarity
   reads as a position on the other side of one fight rather than as a fourth helping of the same
   thing — and H.J.Res. 131's own precedent requires it, filing `lands_preserve` as ITS mirror at
   w90. But "safe in general" is not "free", and this row is where the wave's one read loss came
   from. `trent_kelly` holds three `lands_energy` acts: H.J.Res. 131 w100 PRIMARY on which he is
   recorded NOT VOTING, plus two package secondaries he voted yea on. His only primary takes no
   side, so the primary wall has nothing to count; three acts keep him under `_RD_MIN_JUDGED` and
   the row reads thin; a fourth crosses the floor and the wall fires. **The row was kept on
   arithmetic and not on taste: it gains eight characterised rows and costs one, against the
   `gov_regulation` pair's zero and two.** Those two decisions have to be made by the same rule in
   the same pass or neither is a rule. And the cost is published beside the 184 gains rather than
   netted into them (see `readLossDisclosure` in `db/vr-federal-mapping-seed-f3.json`), because a
   wave that reports only its wins is not measuring itself.

41. **Cousin refusals are settled on the shipped scope note's OUT list and on the precedent
   measure's own written reason — never on the curator's sense of adjacency. And a keyword array is
   not evidence.** Ten rows were read and refused this wave, and the two that took real work are
   worth transcribing. `energy_production` on H.J.Res. 140: H.J.Res. 131 files it at w75 and states
   why — "the reopened acreage is … the part of the programme area with the highest hydrocarbon
   potential, and the programme it belongs to exists to lease, develop, produce and transport oil
   and gas." **Read the precedent's reason, not just its row.** None of it is true of a
   copper-nickel sulphide withdrawal: no hydrocarbon programme, no lease sale, no generating
   capacity. `energy_production`'s scope note puts "who owns the land it happens on (`lands_energy`,
   `lands_local`)" on its OUT list by name, which decides it. The one real argument for the key —
   "geothermal" appears in the withdrawal's statutory citation — is written down and then refused,
   because a citation to the geothermal leasing laws is not a geothermal project. `water` goes the
   same way on its own note: IN for "reducing, pricing or measuring water DEMAND", and this is a
   land-protection act with a water consequence. And the trap to record for the next curator:
   **`rural_ag`'s keyword list contains the literal string `'rural broadband'`, and also `'grazing'`
   and `'water right'`, so a keyword-driven mapper fires on both of this wave's measures.** Neither
   instrument names a farm, ranch or commodity interest. A key is earned from the instrument's text;
   an overlap in a keyword array is a coincidence in a data structure. Refuse it in writing, because
   the array is still there and the next wave will hit it again.

42. **A key in `_RD_NO_POLE` can never be characterised, so declining its roll is not a gap — but
   the no-pole fact must never be the FIRST reason, or engine configuration has started deciding
   what is true about a document.** Two instances, deliberately handled in opposite order.
   `S.Amdt. 3872` to the NDAA is admissible on form and genuinely contested, and it was declined
   with the reason stated plainly: its key is `guard_authority`, which sits in `_RD_NO_POLE` in
   `stance-helpers.js`, so a PRIMARY there moves no reader-visible state and ingesting the roll
   would only pad the wave's numbers. That is an honest decline, and it belongs in
   `declinedRollCalls` so a later curator does not re-derive it. `states_federal_power` on
   H.J.Res. 140 is the mirror case and is refused **on the text first** — Congress overriding a
   federal agency creates, preempts and restores no state authority, and Minnesota is where the land
   is rather than a party to the allocation — with the no-pole fact appended only to record that
   nothing was lost by refusing. Getting that order backwards would let the record refuse a true
   mapping because a config array happens to exclude the key, and the day the array changes the
   refusal becomes unreadable. Refuse on the document; note the engine second.

### Best remaining follow-ups after this pass

0. *(Closed August 2026.)* **H.R. 6955** (119/2 roll 271) and **H.R. 2670** (118/1 roll 723) were
   the two heaviest single-key measures in the record; `20260910000000` widened them onto
   `gov_regulation` / `econ_corp_account` and `privacy_rights` respectively, and corrected the
   H.R. 2670 `strong_defense` rationale, which asserted the enacted summary carried no FISA
   section 702 provision. Sec. 7902 reauthorizes Title VII through April 19, 2024.
0b. *(Opened by `20260911000000`, the pass that retired the vehicle bar.)* Three follow-ups the
   NDAA Israel pass wrote down rather than took:
   · **`veterans` across the NDAAs.** S. 1605 Secs. 6601 (Laos irregular-forces cemetery
     eligibility) and 6602 (Egypt and Syria added to the burn pit registry) are real and both
     point the same way, but weigh in below this record's floor of 25 on their own. H.R. 2670's
     Division E title L is still unresolved for a different reason (direction, per
     `20260910000000`). One pass should settle both.
   · **`foreign_balance` across the NDAAs.** S. 1605 Sec. 1232 extends the Ukraine Security
     Assistance Initiative and Title XIII Subtitle A carries NATO matters. It goes on all four
     NDAAs or none — H.R. 2670 joined the `israel_support` trail in `20260912000000`, so the
     consistency set is H.R. 8800, S. 1071, S. 1605 and H.R. 2670. Putting it on one alone would
     recreate the inconsistency the Israel pass removed.
   · **S. 1605's `strong_defense` weight of 100** is out of line with H.R. 8800 and S. 1071 at 80
     for the same kind of bill. Rule 21 makes that a guarded `UPDATE` with its own argument, not
     a side effect of an additive pass.
0c. *(Opened by `20260912000000`, the formal densification pass.)* Two vocabulary gaps and one
   scope question that pass named rather than filled:
   · **No key for foreign influence in domestic institutions.** H.R. 1069 (PROTECT Our Kids Act,
     247-164, 99 member-votes) cuts federal education funds from any K-12 school partnered with a
     PRC-funded institute. `tariffs_china` is trade, `america_first_fp` is foreign aid, and
     `public_schools` is a funding-level chip. The bill stays unmapped until the vocabulary
     question is decided on its own; do not invent a key for one measure.
   · **No key for a time standard.** H.R. 139 (Sunshine Protection Act, 308-117) has no chip and
     should not grow one. Its state-exemption clause is a savings clause, not a preemption, so it
     is not a `states_federal_power` vote either.
   · **Rule 3 is now the reason two contested bills stay dark**: H.R. 973 (105 member-votes) and
     S. 2503 (98). Both were re-read in this pass and left where rule 3 put them. If rule 3 is
     ever revisited, these are the two measures that change.
0d. *(Opened by `20260914000000`, the heavy-vehicle pass.)* Two more vocabulary gaps, named and
   not filled:
   · **No key for economic-security sanctions or outbound investment screening.** S. 2296's
     Division A title XVII and Division E carry export-control and investment-screening matter
     aimed at the PRC. `tariffs_china` is a TARIFF chip by its own scope note and `strong_defense`
     is force structure; neither is this. The measure carries five other axes without it.
   · **No key for domestic protective-security grants.** H.R. 8034's Nonprofit Security Grant
     Program money protects houses of worship and community institutions against targeted
     violence. `back_police` is police funding and tougher penalties, `tough_on_crime` is
     sentencing, and `religious_liberty` is a rights chip rather than a grant chip — there is no
     homeland-security key at all. Left unmapped rather than approximated.
0e. *(Opened by `20261009000000`. **All three closed by `20261011000000`, wave F2** — see the
   closure note at the end of this item.)* Two rows to correct and one key with nothing to
   attribute. All three are named by rule 30 or 32 and none is taken here, because each moves a
   published number and belongs in a pass that argues for it:
   · **`H.R. 1048`'s `america_first` 70 row is stale against the August 2026 narrowing** (rule 32).
     Its rationale rests on countering-China grounds the key's own scope note now disowns, on a
     measure already `gov_transparency` 100 PRIMARY. It is neither `america_first` as now chipped
     nor `america_first_fp` — there is no aid or commitment in the DETERRENT Act. Wants a guarded
     `UPDATE` (rule 21) carrying its own argument, most likely a removal rather than a re-key. The
     same query that found it should be run across all five live `america_first` rows.
   · **`energy_production` has no primary a senator can reach** (rule 30, second corollary). Six
     senators — alsobrooks, ashley_moody, jim_justice, mccormick, moreno, sheehy — read `incidental`
     after this pass for that reason alone. `H.Amdt. 248` is a House amendment; `H.R. 1949` passed
     the House and has sat on the Senate Legislative Calendar under General Orders since 2025-12-08
     with no vote taken, so there is genuinely nothing to attribute. This needs a standalone
     contested Senate instrument on the key, NOT a fifth secondary.
   · **The roster `state` field is wrong for two Utah House members.** `maloy` and `owens` carry
     bare "District 2" and "District 4" in CMP_DATA where the other five carry Utah. It does not
     affect this pass — House attribution resolves on the bioguide in the Clerk's XML, never on
     state — but it WOULD silently break a Senate-style (surname, state) resolution, which is the
     one place a bad state field fails closed into a skip rather than loudly.

   **Closure (wave F2, `20261011000000`).** · The `H.R. 1048` row was **retracted**, not re-keyed:
   the DETERRENT Act is a domestic disclosure statute with no aid level, partner funding, assessed
   contribution or commitment wind-down in it, so it does not fit `america_first_fp` either. The
   `DELETE` is guarded on all five columns of the row it removes, and the retraction's measured cost
   is published — `america_first` goes `mixed_thin` 10 → 2 and `incidental` 99 → 101, a net +6
   characterised, with the two losses (`dan_crenshaw`, `massie`) named. The full five-row audit rule
   32 asked for was run; two more stale rows came out of it and are queued as 0f below.
   · `energy_production` got the **Senate-reachable PRIMARY** it lacked, twice over: `S.J.Res. 10`
   and `S.J.Res. 71` at w90 PRIMARY `yea_opposes` (rule 33), with the Senate's own passage rolls
   119/1/95 (47-52) and 119/1/554 (47-51) attributed. The key's `incidental` count over all federal
   pids falls 41 → 10, and the six senators rule 30 named by hand are characterised. No fifth
   secondary was added; the tempting one, `S.J.Res. 80`'s NPR-A leasing CRA, was refused on rule 3
   for exactly that reason.
   · The two roster `state` fields are **fixed** — `maloy` and `owens` now read "Utah · District 2"
   and "Utah · District 4", matching the form the other five Utah House members already carried, and
   `scripts/test-vr-federal-wave-f2.mjs` pins both literals so a regeneration cannot quietly revert
   them.

0f. *(Opened by `20261011000000`, wave F2.)* What the full `america_first` audit turned up and the
   wave deliberately did not take. Rule 32's query was run across all five live rows: two are
   clean, one was retracted, and **two are stale and left standing, named rather than hidden.**
   · **`H.R. 276`'s `america_first` w100 PRIMARY** — "Codifies the 'Gulf of America' renaming as a
     symbolic america-first measure and locks in the executive order." A renaming statute funds
     nothing abroad and commits to nothing abroad, so it is off the narrowed chip's IN list on the
     same reading that retracted `H.R. 1048`. It is left because it is the measure's **only** issue
     row, and removing it would drop a contested roll — house 119/1/122, 211-206 — out of the issue
     record entirely rather than re-file it. The honest fix needs a key for symbolic-sovereignty
     measures and there is not one; inventing it for one measure is the 1069-class gap this wave was
     told not to fill. Two ways out, both legitimate: a V-wave key that clears the standing rule
     (recurring + clean polarity + not a cousin), or a reasoned decision that a naming bill does not
     belong in the issue record at all.
   · **`H.R. 6395`'s `america_first` w90 PRIMARY** (FY2021 NDAA) — worse than the row F2 retracted,
     because it is a PRIMARY whose own written argument, "funding and manning the armed forces at the
     level the Department asked for", is another chip's subject: the narrowed scope note assigns
     military posture toward adversaries to `strong_defense` by name. This is a **re-key**, not a
     removal — the measure has a real axis — and a re-key moves published percentages on two keys at
     once, so under rule 21 it wants its own pass and its own argument.
   · Noted while auditing, not acted on: **`H.R. 4` carries `america_first` w60 and
     `america_first_fp` w65 on the same $7.9B rescission** — a cousin pair on one instrument. Both
     rows predate the wave and rule 21 leaves them with their writer, but a cousin pair is exactly
     what the V1 standing rule exists to prevent, so it should be settled the next time either chip
     is opened.
   · And the question `scotus_reform` raises rather than answers: **101 of 101 rows on that key read
     `vehicle_only`, because it has no PRIMARY instrument anywhere in the corpus in either chamber.**
     Nothing in the 119th unblocks it — the Senate menu sweep found the subject only in judicial
     nominations, which are confirmations of individuals and not acts on court structure. Whether a
     key with no primary in either chamber should be publishing rows at all is a design question,
     and it is raised here, not decided.

0g. *(Opened by `20261017000000`, wave F3.)* The chamber gap after the wave, and the four things it
   could not close. F3 took the Senate count from 35 to **37 of 98 keys with a Senate-reachable
   PRIMARY**, so **61 keys still have none** and on every one of them a senator's row is written by
   the primary wall. That is the headline number to carry forward, and the honest reading of it is
   that most of what remains is an ATTRIBUTION hole and not a mapping backlog — which is a different
   kind of work and needs saying so the next wave does not go looking for text to map.
   · **Seven keys are blocked on an instrument that does not exist, each with the bill named** — see
     `blockedOn` in `db/vr-federal-mapping-seed-f3.json` for the full argument on each.
     `health_rural` (98 rows; wants a standalone rural-hospital passage vote — S. 2683 was reported
     by Finance and never brought up); `free_speech` (98 rows; S. 146 passed by UNANIMOUS CONSENT,
     so there is no roll to attribute and no mapping can fill it); `econ_smallbiz` (89 rows; the
     Congress's only Senate instrument, Scott (FL) Amdt. 3113, failed 15-81 and rule 11 refuses it —
     H.R. 3193 has passed the House and sits on the Senate calendar); `econ_workers` (89 rows;
     H.R. 5408 was received in the Senate 2026-06-10 and has never been voted); `scotus_reform` (10
     rows; nothing of any kind in the 119th — S. 1101 is the live candidate); `tax_middle_class` (98
     rows, all `incidental`; every Senate act on the key is a title of the reconciliation bill or an
     amendment to H.Con.Res. 14, and mapping a package title as a primary is the "package %" the
     doctrine forbids). Do not re-derive these; re-check them against the NEXT Congress's menu.
   · **`gov_regulation` is blocked on a primary two named senators can reach, which is not the same
     problem.** `angus_king` and `lujan` each hold three non-primary acts on a key that already has
     five primaries, and no recorded vote on any of them. S.J.Res. 18 is the key's Senate primary and
     neither is on its roll. This is the only entry in the ledger that a mapping wave cannot help
     with at all, and it is why F3 refused the two CRA process secondaries (rule 39): they would have
     carried both senators to five uniform secondaries and tripped the wall. Listed because a reader
     of the refusals will otherwise ask why a well-stocked key still has an unread senator row.
   · **`no_side` is now the largest single unread bucket over the Senate — 987 rows, untouched by
     this wave and untouched by the last two.** It is worth stating plainly that this is NOT a gap
     of the same species: those rows exist because the member took no side on the acts they have, and
     no amount of ingest fixes them. `incidental` (1486 → 1316) and `vehicle_only` (429 → 427) are
     the buckets a mapping wave can move. Ranking future candidates on the `no_side` count would
     send a wave chasing rows that are already correct.
   · **The `scotus_reform` design question 0f raised is still open and F3 sharpened it.** Both 119th
     Senate vote menus were swept for court-structure, ethics and jurisdiction instruments and none
     received a recorded vote, so the key's rows read `vehicle_only` off judiciary provisions inside
     appropriations. Whether a key with no PRIMARY instrument in EITHER chamber should be publishing
     rows at all is still a design decision and still not made here. F3's contribution is to have
     verified that no ingest available in this Congress makes the question go away.
   · Recorded because it moved and was disclosed rather than filtered: `mixed_thin` over the Senate
     **rises** 595 → 609 on this wave. Fourteen senators whose records on the shipped keys are
     genuinely divided now read as divided instead of as unclassified. That is a result, not a
     regression, and rule 25 is why it ships.

1. ~~**H.R. 7148, Consolidated Appropriations Act, 2026** (119/2 rolls 45 and 53).~~ **Closed by
   `20260913000000_vr_consolidated_approps_2026.sql`.** The division-by-division read was done
   against the enrolled text (govinfo `PLAW-119publ75`, 34,584 lines) and the measure was ingested
   with roll 119/2/53 (217-214, 108 attributed) and six axes: `strong_defense` 70 primary,
   `israel_support` 50, `health_rural` 45, `foreign_balance` 40, `health_drug_prices` 40,
   `pro_life` 35. Two corrections to the record this follow-up was written from:
   · The fiscal pass's decline note said the act "separates far fewer members than its size
     suggests." That is wrong. Roll 45 is 341-88 and roll 53 is **217-214 with the parties
     inverted** — R 196-21, D 21-193. It is one of the most separating rolls of the session.
   · Only ONE of the two rolls was ingestable, and the tie-breaker is textual rather than
     chronological. Roll 53 voted the enrolled text; roll 45, taken 22-Jan-2026, cannot have
     contained Division H, whose continuing-resolution date is 13-Feb-2026 and whose lapse
     coverage begins on or about 31-Jan-2026. See rule 23.
2. **The twelve H.R. 1 Senate amendment rolls** (358, 360–370). Single-axis tests inside the
   omnibus — wind and solar credits, rural hospitals, SNAP, Medicaid, the AI moratorium — each
   of which would need its own amendment measure row with a strict subset of the parent's keys.
   The cleanest signal in the 119th record that is not yet ingested.
3. **The DC crime and policing package** (H.R. 2056 / 5103 / 5125 / 5140 / 5143 / 5214, rolls
   171, 271, 274, 275, 298 and 119/2/101). Six separately-voted bills on one theme; declined
   here on scope, not on merit.
4. **H.R. 4016** (DoD Appropriations Act, 2026). ~~**S. 2296** (the Senate's own FY2026 NDAA
   position).~~ **S. 2296 closed by `20260914000000`** — five secondary axes read off the
   engrossed text division by division: `israel_support` 40 (Div A tit. XII subtit. E),
   `housing_build` 35 and `homeless` 20 (Div I, the Road to Housing Act), `immig_fentanyl` 30
   (Div G tit. LXI, the BUST FENTANYL Act) and `back_police` 20 (Div A tit. X subtit. H).
5. **H.R. 6409, FENCES Act** — border-barrier construction, the capacity axis H.R. 3486
   explicitly does not carry.
6. *(Opened by `20260915000000`.)* **H.R. 6126** (118th, 61 member-votes, `israel_support` +
   `cut_spending`) was the runner-up for that pass's third slot. It is the first of the three
   118th-Congress Israel supplementals and, under rule 25, has to be read on its own text rather
   than coded from its siblings: it pairs the security appropriation with a $14.3B rescission of
   Inflation Reduction Act IRS enforcement funding, which is why `cut_spending` is already on it.
   `strong_defense` is the likely third and `power_of_purse` should be checked against the
   rescission title.
7. **Schedule the cross-NDAA pass now.** `foreign_balance` and `veterans` across S. 1605,
   S. 1071, H.R. 8800, H.R. 2670 and now H.R. 5009 (118th, FY2025 NDAA, 59 member-votes, two
   keys) are all-or-none by construction — putting either key on one NDAA alone recreates the
   inconsistency the Israel pass removed. Five measures is too many for an opportunistic slot at
   the end of a densification pass, and every densification pass since `20260911000000` has
   deferred it for that reason. It wants a dedicated pass whose entire subject is the consistency
   set, taken together with the S. 1605 `strong_defense` weight correction (rule 21, guarded
   `UPDATE`) since both touch the same five rows.

---

## § Utah — the first state legislature in the formal lane (`20260929000000`)

Everything above this line is Congress. This section is the state path, added by
Data wave 1 so that Utah ballot people stop opening to "No formal pattern on file
yet." It is a separate path because `netlify/lib/vr-ingest.ts` knows only
congress.gov and senate.gov: it takes a Congress number, a session and a roll
number, and none of those three things means anything in Salt Lake City.

Baseline before the wave: **92 Utah state-level pids on the archive — 65 with an
empty formal file, 27 thin, 0 readable.** `mschultz`, the Speaker and the wave's
canary, was empty. After it, measured by running the shipped `formalPatternIndex`
over the seed in a vm: **14 empty, 33 thin, 46 readable** across 93 pids (the extra
one is `sadams`, whom the `_classifyBrowseType` fix below returned to the
state-senator bucket). The 14 still-empty files belong to people who cast no 2025
legislature votes — former members, statewide executives and candidates — and
nothing was manufactured for them.

### Source of record

Everything comes from `le.utah.gov`, which publishes per-member roll calls in
HTML and bill metadata in JSON. There is no key and no API contract; there is a
WAF.

| What | URL |
| --- | --- |
| Bill metadata + action history | `https://le.utah.gov/data/{session}/{BILL}.json` |
| Bill page (the citable URL) | `https://le.utah.gov/~{year}/bills/static/{BILL}.html` |
| One floor roll call, per member | `https://le.utah.gov/DynaBill/svotes.jsp?sessionid={session}&voteid={id}&house={H\|S}` |
| Legislator roster | `https://le.utah.gov/data/legislators.json` |

**Node `fetch` is rejected.** The WAF returns a "Request Rejected" page to it
regardless of headers. `scripts/vr-utah-ingest.mjs` shells out to `curl` with a
browser user-agent plus `Accept` and `Accept-Language`, and treats that page as a
hard error rather than caching it as content. `/data/` has no index and `/asp/…`
is rejected outright, so bill numbers have to come from `/billlist.jsp` or from
enumerating `HB0001…`.

### How a state row is stored, and why there is no new column

Jurisdiction lives **in the `chamber` field**: `'utah house'` and `'utah senate'`.
`congress` is NULL, `session` is the calendar year (2025) and `roll_number` is
Utah's own `voteID`. This was chosen over adding a `jurisdiction` column because
`chamber` is the field the client already prints — so the stored value and the
displayed label cannot drift apart, and a Utah vote physically cannot render as
"House". Dedupe comes from two additive partial unique indexes:

```sql
CREATE UNIQUE INDEX vr_rollcalls_state_unique
  ON vr_rollcalls (chamber, session, roll_number) WHERE congress IS NULL;
CREATE UNIQUE INDEX vr_measures_utah_unique
  ON vr_measures (chamber, number, (external_ids->>'utahSession'))
  WHERE external_ids ? 'utahSession';
```

The existing `vr_rollcalls_unique` on `(chamber, congress, session, roll_number)`
is not binding for these rows, because a NULL member makes the tuple non-unique in
Postgres. Nothing applied was altered.

Both indexes are declared in `db/schema.ts` **and** carried in the drizzle chain by
`20260930000000_vr_utah_state_dedupe_indexes`, the snapshot twin of the
hand-written migration — same pattern as
`20260927000000` / `20260928000000_pdx_notification_follow_categories`. Skipping
the twin is the trap: `drizzle-kit generate` diffs `db/schema.ts` against the
newest `snapshot.json`, so an index declared in the schema but absent from that
snapshot gets a second `CREATE` in the next generated migration. The generated
stamp (a wall clock, `20260827010150`) sorted behind ninety-one applied migrations
and had to be re-picked by hand, and the two `CREATE`s were guarded with
`IF NOT EXISTS`, which is the only edit made to drizzle's output.

**Every surface that prints a chamber owes the reader the display form, by exact
match.** `voting-record.js` keyed its glossary chip off `/house/i.test(chamber)`,
which is true of `'utah house'` — so a Utah floor vote would have opened the
federal card, "435 members, each representing one district, apportioned by state
population", above a vote of a 75-member body. Adding a state means adding: two
entries to `CHAMBER_LABEL` / `CHAMBER_TERM` in `voting-record.js`, two cases in
`bill-detail.js`'s `chamberLabel`, and two glossary entries in `pdx-learn.js`.
A chamber with no glossary entry of its own renders as plain text — no tap
target — rather than borrowing the nearest-looking one.

### The five rules this pass ran on

1. **One instrument, one act.** A Utah bill is commonly voted four times in one
   chamber: second reading, third reading, a re-vote after amendment, and
   concurrence. Exactly one is written per `(bill, chamber)` — the latest
   passage-code action, tie-broken by date. This is the same rule as PASS 2's
   floor-supersedes-non-floor in `stance-helpers.js`, applied at ingest instead
   of at read time, because the roll calls are all floor votes and PASS 2 would
   count all four.
2. **Near-unanimous roll calls are refused**, at the same bar as the federal
   rule at line 149: below one tenth of the yea+nay pool on the losing side, the
   vote differentiates nobody and only inflates depth. Seven roll calls on
   otherwise-admitted bills were dropped for this (the other chamber's vote on
   the same bill is present in every case).
3. **Nobody is guessed.** The vote pages print `Surname, I.` A candidate must
   match on surname **within one chamber's pid pool**, then on first-name
   compatibility (exact, initial-prefix, or a small nickname table), then be
   confirmed against the district in the page's leglookup link. The tool writes a
   *draft* map to its cache; the accepted table is `db/vr-utah-member-map.json`,
   which is a reviewed human artifact and the only thing the seeder will read.
   Wave 1 refused three names there (`Moss, J.`, `Peterson, K.`, `Peterson, T.`
   — each sharing a surname with a *different* person already on the roster) and
   left 26 House and 1 Senate name unmapped because they were not on the
   PolitiDex roster at all. Wave 2's roster pass cleared all 27 and, with them,
   the three refusals — not by relaxing the rule but because the three were
   distinct people who were simply missing, and once they exist the printed
   initial plus the district resolves each uniquely. `_refusalsCleared` in that
   file records the reasoning; `_refusedNames` is now empty for 2025GS, and the
   archive sessions have their own. Each roll call carries its own
   `droppedNotOnRoster` list and the migration discloses the count per roll call
   plus one consolidated list at the head of the file. **An unmapped name is a
   coverage gap and is labelled as one; it is never a refusal, and a refusal is
   never quietly a gap.**
4. **Former members stay in the pool.** Tyler Clancy and Matthew Gwynn cast 2025
   votes and have since left the House. Excluding them would either lose those
   votes or — far worse — hand them to their successors. Their vote pages carry no
   leglookup link, so they are the two entries under
   `_acceptedWithoutDistrict`, accepted on the district recorded in the roster.
5. **A bill nobody can read gets no mapping.** 42 bills were mapped; **30 were
   refused in writing**, each with its reason, in `_refused` in
   `db/vr-utah-bills.json`. The refusals are the useful half of that file. Two
   patterns recur: a bill whose own coordination clause contradicts its operative
   sentence (SB0327), and a genuinely contested bill for which no issue key
   exists (HB0247 — the session's closest vote at 38-37). *A contested margin is
   not a reason to invent a mapping.*

### Data wave 2 — the roster first, then backwards through the archive

Wave 1 left two holes in the same place. A quarter of the Utah House was not on
`cmp-data.js` at all, so 905 parsed 2025 votes were thrown away for want of anyone
to attribute them to; and only one session existed, so a member's "pattern" was
one year's agenda. Wave 2 closed both, in that order, because the second one is
worth less until the first is done: ingesting an older session for a roster that
cannot hold half its votes just drops more rows.

**1. Roster coverage.** 27 identity-only records were added to `cmp-data.js` —
name, office, state, chamber, district and nothing else. No stances, no bio, no
publishable flag: the publication floor is unchanged, and a person with votes and
no positions is a legitimate, honest thing for this repo to hold. Re-running
attribution over the *same* 55 roll calls turned 2,254 member votes into 3,159
across 104 members, dropping nobody. `db/vr-utah-member-map.json` grew by those 27
names; the three permanent refusals stayed refused.

**2. Two archive sessions.** `2024GS` and `2023GS`, newest first, each a full pass
of the wave-1 pipeline: survey → curator file → collect → reviewed member map →
seed → migration.

| | 2024GS | 2023GS |
| --- | --- | --- |
| Passed-bills index | 552 bills | 543 bills |
| Admissible contested final-passage roll calls | 125, across 103 bills | 113, across 91 bills |
| Bills read in full | 40 | 61 |
| Admitted / refused in writing | 28 / 12 | 40 / 21 |
| Measures · roll calls · member votes | 28 · 39 · 1,885 | 40 · 49 · 2,490 |
| Issue mappings (distinct keys) | 33 (25) | 49 (30) |
| Members attributed | 86 (59 H, 27 S) | 84 (58 H, 26 S) |
| Vote rows dropped, no roster identity | 442 | 677 |
| Migration | `20261002000000` | `20261003000000` |

Not one issue key was invented for either session, and no bar moved: 14 of 2023's
qualifying roll calls were refused on the same minority-share rule that refused
seven in wave 1.

**The archive publishes a different shape, not a different doctrine.** From 2025GS
the bill JSON carries `actionHistoryList` with an `actionCode`, a `voteID` and a
tally per action. 2024GS and 2023GS carry `actionhistory` as `{date, action,
location}` — no vote id anywhere in the JSON, so the recorded floor votes are
unreachable from it. They are on the **static bill page**, whose action table has
carried a linked tally per recorded vote for years, pointing at the same
`svotes.jsp` page the modern JSON points at. The archive path reads that page and
normalises it into the shape the modern JSON already has, so one-final-passage-
per-chamber, the minority-share bar and the printed-name map all run unchanged.
The one field the page does not print is the `actionCode` the final-passage rule
keys on; `ARCHIVE_ACTION_CODES` in `scripts/vr-utah-ingest.mjs` is the
legislature's own action-text-to-code pairing, harvested from the sessions that
publish both fields on the same row, and a recorded vote whose action text is not
in that table is **reported as unclassified, never dropped in silence** — 264 such
votes in 2024, 232 in 2023.

**What the survey cannot see, stated as coverage rather than as a rule.** Two
gaps, both inherited from wave 1 and both deliberately not closed here, because
widening either would change what the already-shipped 2025 record says and that
deserves its own migration:

- **Bills that failed on the floor are invisible.** `--survey` walks
  `passedbills.asp`, which is an index of what *passed*. A bill defeated on the
  floor never appears in it, and its `HFAIL` / `SFAIL` roll call is outside the
  admitted action codes anyway — so a member's most revealing vote of a session
  can be one this pipeline structurally cannot reach.
- **Suspension and conference passage are not admitted.** `SPASS23SP` /
  `HPASS23SP` ("passed 2nd & 3rd readings/ suspension") is genuinely a chamber's
  final act on a bill, and so is a conference committee's `SCOMFINALP` /
  `HCOMFINALP`. `PASSAGE_CODES` admits neither.

**A name is confirmed against the roster for its own year.** Old vote pages often
carry no leglookup link, so the district cross-check that wave 1 relied on is
frequently unavailable — and a 2023 district is not a 2025 district. Each archive
session therefore has its own reviewed map (`db/vr-utah-member-map-2024GS.json`,
`…-2023GS.json`), confirmed against `/asp/roster/roster.asp?year=YYYY` — the
legislature's own membership list for that year, 105 people for 2024 and 104 for
2023 — and each records in prose which names were accepted without a district and
why. Three members sat in the other chamber in those years and were added by hand
with `confirmedByDistrict: false`, because the district on the page belongs to a
seat they no longer hold. **The map is extended, never fuzzy-matched.** Two names
are refused in both sessions — `Judkins, M.` and `Lyman, P.`, each matching a
roster record for the same distinctive name under a *non-legislative* office
(Mayor of Provo; a gubernatorial candidate) — and they are listed as refusals,
separately from the 18 and 20 names that are ordinary coverage gaps.

**Where the text came from.** A bill summary is not the bill. `SB0097` (2023) reads
as an existing Israel-boycott provision until you read the enrolled text at
`/~2023/bills/sbillenr/<BILL>.htm`, which adds an economic-boycott prong broad
enough that no single issue key states its direction — so it is refused, and the
refusal says which document it was refused on. `SB0100`'s title says "School
Gender Identity Policies" and its surviving text is parental access to education
records: refused for the same reason. When a summary and a text disagree, the text
is the bill and the refusal names the file it was read from.

**Result, measured the same way as wave 1** — the shipped `formalPatternIndex` run
over the seeds in a vm, no floors touched:

| | empty | thin | readable |
| --- | --- | --- | --- |
| wave 1 (2025GS only) | 11 | 32 | 46 |
| \+ wave 2 roster | 11 | 35 | 70 |
| \+ 2024GS | 11 | 9 | 96 |
| \+ 2023GS | 10 | 4 | 102 |

Two cautions on that table. It is measured over 116 pids at the end and 89 at the
start, so the columns are not a fixed population — 27 of the readable rows are
people who had no file at all before wave 2. And the wave-1 row is this harness's
own re-measurement, not the number wave 1 reported (14 / 33 / 46 over 93 pids);
`readable` reproduces exactly, but the older run's pid predicate was about four
pids wider, so `empty` and `thin` do not. The 10 still-empty files belong to
people who cast no votes in any of the three sessions.

### Deliberately deferred: sponsorship rows

No `vr_positions` rows were written for prime or floor sponsorship this wave.
Two reasons, both worth re-reading before someone adds them:

- **They would add almost no signal.** PASS 2 makes a floor vote supersede a
  non-floor act on the same instrument, and a Utah sponsor nearly always voted on
  their own bill — so the 0.45 lead-sponsor act would be dropped in favour of the
  1.00 floor vote it already has.
- **They need a second identity path.** Sponsors are printed as
  `Rep. Dunnigan, James A.` — a different format from the roll call's
  `Dunnigan, J.`, which the accepted map is keyed on. That is a whole second
  name-matching surface to review, for a signal PASS 2 discards.

### The federal sweep is federal

`scripts/test-vr-vote-seed.mjs` walks `db/*-vote-seed.json` and enforces bioguide
attribution, a Congress number, a session of 1 or 2, a `house`/`senate` chamber and
a mapping in `db/vr-issue-seed.json` — five things a state legislature does not
have. It now partitions the directory: federal-shaped seeds (those with a top-level
`votes` array) go through the pass, and anything else must be **named by some
`scripts/test-*.mjs`** or the sweep fails. Adding a state seed therefore means
adding its harness in the same change; the alternative — quietly excluding the file
— produces a seed nobody has ever read.

`scripts/vr-coverage-report.mjs` has the same federal assumption from the other
side: it overlays committed-but-undeployed seeds and joins on a Congress number, so
the Utah seed contributes nothing to it. It now prints the name of any seed it will
not overlay, because contributing zero rows silently looks exactly like a pass that
unlocked nothing. A state coverage overlay would need its own keying and is not
written.

### Verifying, and what is still blocked

The migration is data-only; no `NETLIFY_DATABASE_URL` exists in the build sandbox,
so it applies on deploy. Post-deploy, the check is `/p/mschultz`, whose brief block
read "26 issues on the formal record · 32 votes and formal actions read · 1 deep
enough to characterise" after wave 1, over a `housing` cluster at 4 advanced / 0
against. After wave 2's three sessions the same page carries **42 issues, 8 of
them deep enough to characterise** (6 strong, 2 mostly) — measured by running the
shipped index over the three seeds, so the deployed page should match. Those
numbers may only ever go up on the same data; a smaller count means votes went
missing, and a larger one with no new seed means a floor moved. Check two or three
other UT legislators the same way (`sadams`, `rward`, `aromero`).
`scripts/test-vr-utah-record.mjs` pins all three sessions' seeds, curator files,
member maps and migrations, plus the client labels, without a database — 2,597
assertions, and its archive section re-derives the minority-share bar and the
dropped-vote counts from the tallies rather than trusting the headers.

**No receipt cards, on purpose.** A Utah roll call has everything a share card's
VERIFY line needs — `le.utah.gov` publishes a per-member vote page for every one,
and the ingest stores its address — and `receipt-cards.js` refuses it anyway. Guard
12 would have refused it by falling through (the citation is DERIVED from
`(chamber, congress, session, roll)` and a state row has no congress), but falling
through told a curator reading `audit()` that "the roll number is missing", which
on these rows is false. The chamber is now named at `STATE_CHAMBERS` in
receipt-cards.js with the real reason: nothing has read those pages.
`scripts/vr-check-citations.mjs` is what makes guard 14 a denylist rather than an
allowlist — it fetches every derivable citation, confirms the page names the roll
call cited, and cross-checks the measure against the chamber's structured record —
and it knows two page shapes, both federal. Printing a state address would put a
permanently unread link on the one surface that travels without its context. What
unblocks it: an `svotes.jsp` reader in that script plus a fetch that survives the
WAF (the same browser headers `curl` needs; Node `fetch` is rejected outright).
Until then the run summary names the gap — the citation check prints how many of
its underivable rows are non-federal chambers, instead of folding them into one
count.

Still blocked, in priority order:

1. ~~**Committee votes.**~~ **Done in wave 3** — see "§ Utah committee votes —
   the PDF minutes path" below. What this entry said at the time: Utah publishes
   them, but only inside per-committee PDF minutes, not in the `svotes.jsp`
   structure, and no parse path existed. There is one now, and the depth gain was
   smaller than this entry predicted — 50 acts that no floor vote already speaks
   for, and no change to any member's tier.
2. **The special sessions, and 2022 and earlier.** Wave 2 did `2024GS` and
   `2023GS`; the same archive path reads any session whose static bill page has
   the four-cell action table, so the remaining cost is a curator pass per
   session. Diminishing: three general sessions already carry most sitting
   members past the characterisation floor, and the further back it goes the
   fewer of the voters are still in the roster's House.
3. **The two structural gaps above** — floor defeats (`HFAIL` / `SFAIL`, and
   invisible to a passed-bills index) and suspension / conference final passage.
   Admitting either changes what the shipped 2025 record says about the same
   bills, so it needs its own curator pass and its own migration, not a widened
   constant.
4. **Receipt cards for state votes.** See "No receipt cards, on purpose" above:
   an `svotes.jsp` page reader and a WAF-surviving fetch in
   `scripts/vr-check-citations.mjs`, after which the `STATE_CHAMBERS` branch in
   receipt-cards.js becomes a citation instead of a refusal.
5. **Other states.** The path generalises — the chamber-field convention, the
   accepted-map rule, and the two partial indexes are not Utah-specific — but each
   state needs its own fetcher, because none of them publish the same way.

## § Utah committee votes — the PDF minutes path (`20261004000000`, `20261005000000`)

Wave 2 left committee votes as blocker #1: Utah publishes them, but only inside
per-committee minutes, and the minutes are PDFs. Wave 3 built the parse path. It
is a separate path again — not because the storage is different (it is
`vr_positions`, the same table cosponsorships use) but because the *source* is a
document rather than a table, and every step between the document and a row is a
place to invent a fact about a named person.

Result: **32 committee acts on 24 bills, 241 member positions**, of which 191 are
already spoken for by a floor vote and **50 are the member's only act on that
instrument**. Depth effect on the Utah state roster: **none** — 10 empty / 4 thin
/ 102 readable before and after, 0 thin→readable. That is the honest headline and
it is in the wave report; the value delivered is 50 acts on the record and a
repeatable path, not a tier change.

2024GS was run through the same path in the same wave (`20261005000000`), which
brings the two sessions to **58 committee acts on 44 bills and 415 member
positions, 62 of them the member's only act on that instrument**. See "The second
session" below — including the two defects a second session was what it took to
find.

### The URL chain

There is no committee-votes endpoint. There is a chain, and each link is needed:

| Step | URL | What it gives |
| --- | --- | --- |
| 1. Committees | `https://le.utah.gov/ajax/ajaxLoadCommittees.jsp?yr={year}` | 82 committees for 2025; standing ones are `HST*` / `SST*` — 14 House, 11 Senate |
| 2. Meetings | `https://le.utah.gov/committee/getMeetingInfo.jsp?com={COM}&yr={year}` | the committee's meetings, each with an `mtgid`. **Its `minutes` field is empty here** — this is the trap |
| 3. Meeting | `https://le.utah.gov/committee/getMeetingInfo.jsp?mtgid={id}` | the same meeting again, and *now* `minutes` holds the PDF path |
| 4. Minutes (structured) | `https://le.utah.gov/MtgMinutes/PublicMinutes?requestType=getMeetingInfo&meetingID={id}` | the minutes as JSON: attendance, agenda items, motions, **named vote lists** |
| 5. Minutes (PDF) | `https://le.utah.gov/interim/{year}/pdf/{n}.pdf` | the citable document |

Same WAF as wave 1: `curl` with a browser UA plus `Accept` / `Accept-Language`
works, Node `fetch` is rejected outright, and a body containing "Request
Rejected" is a hard error rather than an empty result. Everything is cached
under `--cache` (default `/tmp/vr-utah-committee-cache`) so a re-run costs
nothing and a parser change can be re-measured against identical bytes.

### The PDF *and* the JSON, and why both

Step 4 states the votes — `motionData.yesVotes[] / noVotes[] / absVotes[]`, by
printed name. Step 5 draws them. Deriving the vote lists from the PDF instead
would mean inferring which column a name sits in from its glyph x-position: a
layout guess, on a document whose columns are not declared anywhere. So:

* **the JSON is the extraction source** — it says who voted which way, in words;
* **the PDF is the citation *and* a mandatory cross-check.** No act is admitted
  unless its PDF text contains all four of the committee name, the meeting date
  in words, the motion sentence, and the printed tally. All 32 admitted acts
  cleared it; `pdfUnconfirmed` is 0.

`scripts/vr-pdf-text.mjs` does the extraction, and the reason it exists is that
these PDFs contain no readable text. Apache FOP writes every glyph as an index
into a subset font (`[<000A000B…>] TJ` under `/F158`), so a reader looking for
literal `(…)Tj` strings finds nothing and reports an *empty* document — which
would be indistinguishable from "this meeting took no votes". The module decodes
each font's `/ToUnicode` CMap (bfchar and bfrange) and says out loud that zero
lines means UNREADABLE. 255 of 255 approved-meeting PDFs were readable; no
scanned page was encountered in 2025GS.

### What is admitted, and what is refused

Seven rules, all in `readMotion()` / `collect()` in
`scripts/vr-utah-committee-ingest.mjs`, checked in this order:

1. **It has to be a pass motion.** "Pass out favorably" and its variants only.
   `replace` (448), `adjourn` (259), `approve` minutes (242), `amend` (207),
   `place on agenda` (100), `hold` (66) are all refused by name and counted.
2. **It has to be a recorded roll.** A motion with no `yesVotes`/`noVotes` is an
   attendance list dressed as a vote; 34 refused.
3. **The bill has to be identifiable.** The motion sentence or its agenda item
   must name a bill (`SB0308`, `SB0137S02`); 59 refused for naming none.
4. **The bill has to be in the formal lane already.** A committee vote on a bill
   with no reviewed issue mapping has nothing to say about an issue. This is the
   biggest refusal by far: **1,166 rows across 675 bills**. 173 of those bills
   had a *contested* committee vote and are the obvious curator-pass candidates.
5. **It has to be contested.** The same 10%-minority bar wave 1 applied to floor
   roll calls: a 9-0 committee vote differentiates nobody. 42 of the 76 in-lane
   committee actions were unanimous; 44 rows refused as `near_unanimous`.
6. **The printed name has to be in the reviewed map.** See below.
7. **The PDF has to confirm it.** The four-way check above.

The cost of rule 5 is recorded in the script's own comment so a curator can argue
the other way with the numbers in front of them: **with** the bar, 24 bills / 32
acts / 241 rows; **without** it, 42 bills / 76 acts / 546 rows.

### Names: three spellings of one person

The minutes print vote lines as `Rep. R. Walter`, attendance as
`Rep. R. Neil Walter`, and the floor pages — the wave-1/2 map's keys — as
`Walter, N.`. Neither initial is derivable from the other. So the reviewed map
`db/vr-utah-committee-map.json` is keyed by the *committee* printed form, per
chamber, and every entry states how it was accepted:

* `exact_floor_key` (87 forms) — the printed form resolves to a wave-1/2 floor
  key with no ambiguity.
* `unique_surname_confirmed_by_attendance` (9 forms) — one surname on the floor
  map, and the meeting's own attendance line carries a given name of which both
  the printed initial and the floor key's initial are an in-order subsequence.
  Each entry names the attendance line in `confirmedBy`. This is what resolved
  Rep. Walter.

96 printed forms, 0 unmapped, 0 refused in 2025GS. The Judkins/Lyman-class
collisions the earlier waves refused **stay refused** and are listed separately
from the coverage gaps, because an unmapped name is a gap and a refused name is a
decision.

### One instrument, one count — the defect this wave surfaced

`stance-helpers.js` already supersedes a non-floor act when a floor act exists on
the same instrument, so the direction read was correct from the start. But
`window._pdxRecordMappedCounts` in `voting-record.js` — the count that feeds the
12-record characterisation floor — had no instrument dedupe. A superseded
committee act would therefore have bought its member a free +1 toward "enough
record to characterise": the same double count wearing a different hat. It now
skips a non-floor act on an instrument the member also has a floor act on, keeps
reporting every warm record in `total`, and discloses the drop count in
`supersededActs`. Records that are all floor votes are provably unaffected, which
is why the fix is narrow rather than a global measure dedupe.

`scripts/test-vr-utah-committee.mjs` §7 pins both halves against a synthetic
member, and treats the fixture's own admission as fatal — an earlier draft had
the floor vote's `position` as `"Yea"` rather than `"yea"`, so the engine judged
it zero times and every "adds nothing" assertion passed for the wrong reason.

### Why `vr_positions` and not `vr_rollcalls`

Three reasons, and the third is the one the brief asked about:

1. Only `kind: "position"` items get the 0.60 committee act class and the
   "Committee vote" noun; a `vr_rollcalls` row would print "Voted Yea" at floor
   weight 1.00.
2. The unique index `(measure_id, politician_id, action_type)` is exactly the
   "one act per person per instrument" rule, enforced by the database.
3. **Roll-number collision is impossible because `vr_positions` has no
   `roll_number` column.** There is nothing to collide with. The meeting id lives
   in the row's `note` and in its `source_url`.

`acted_at` is the meeting date at `T00:00:00-07:00`. The minutes give a date and
a start time for the *meeting*, not for the individual motion, so the time of day
is not known and is not invented.

### The second session: 2024GS, and the two defects it found

The brief's stretch scope was "2024GS if the parser is stable". It was, and the
run needed no parser change — but it needed two fixes, both of which are the same
kind of bug: a thing that looked verified because it had only ever been run once.

**The committee list's code field is `ownerid`.** `survey()` read `c.id ||
c.comCode`, which are what the *other* le.utah.gov feeds call that field. The
2025 survey had been run against a cache a prototype had already filled, so the
standing-committee filter matched nothing and it did not matter. Run cold against
2024, it returned "0 standing committees of 85". Fixed by reading
`ownerid || id || comCode`, and re-running 2025 from cache reproduced 25 / 278 /
261 exactly.

**The SQL header had two numbers typed in by hand.** The near-unanimous paragraph
said "which is why 24 bills are represented and not the 42 that had a committee
vote at all" — 2025's figures, printed unchanged into the 2024 file above 2024's
20 bills. Both counts now come off the seed (`counts.measures`,
`counts.billsWithAnyCommitteeVote`), the seed carries them because `--seed`
records them at collect time, and `buildSql` throws rather than print a header
with a hole in it if handed a seed that predates the keys. The generated 2025 file
is byte-identical to the committed one after the change, and
`test-vr-utah-committee.mjs` now asserts that byte-identity for both sessions —
which is the only form of this check that a future hand-typed number cannot slip
past.

**A committee that renamed itself.** Three 2024 acts refused as
`pdf_does_not_confirm`, all `missing: ["committee"]`. The meeting metadata says
"House Public Utilities and Energy Standing Committee"; the letterhead on the PDF
says "HOUSE PUBLIC UTILITIES, ENERGY, AND TECHNOLOGY STANDING COMMITTEE". The
committee was renamed and the metadata was not. `committeePrefixKey()` is a
documented second door: chamber plus the first *two* significant words
(`HOUSEPUBLICUTILITIES`), never one — one word is loose enough to match a
committee it is not. A match on the prefix rather than the full name sets
`renamed: true` on the confirmation, the collect report prints the committee by
name, and the date / motion / tally checks are untouched, so the relaxation is
about a name and nothing else. 2025GS's seed came out byte-identical afterwards.

**And the door had a bug in it, which took a later pass to find.** The prefix key
is built by dropping stopwords — `of`, `and`, `the`, `on`, `for`, `in` — and then
stripping every non-letter, so `House Business, Labor, and Commerce Standing
Committee` becomes `HOUSEBUSINESSLABOR`. It was then tested as a *substring* of a
haystack that had had only its whitespace stripped, and that haystack still read
`HOUSEBUSINESSANDLABORSTANDINGCOMMITTEE` — with the `AND` the key had just thrown
away. The two strings can never match, whatever the document says. Three 2024
acts sat refused as `pdf_does_not_confirm` on a comparison that could not have
succeeded: H.B. 137, H.B. 267 and H.B. 463, each with its date, its motion
sentence and its printed tally confirming against the published minutes all
along. The fix is `committeePrefixHit()`, which matches chamber + first
significant word + second significant word *as a sequence*, allowing punctuation
and the same stopword list to appear between them in the document. It is strictly
wider than the substring test it replaces — the gap also matches empty, so every
name that confirmed before still confirms — and it still cannot admit a wrong
document by itself, because date, motion and tally are unchanged fences beside
it. The recovered acts are worth stating: four acts and 67 positions across 12
bills, and `pdfUnconfirmed` for 2024GS went from 3 to 0.

The 2024 result:

| | 2025GS | 2024GS |
| --- | --- | --- |
| Meetings cached / approved | 278 / 255 | 280 / 248 |
| PDFs fetched / readable | 255 / 255 | 248 / 248 |
| Motions / with a recorded roll | 2,732 / 2,661 | 2,608 / 2,536 |
| Admitted motions | 32 | 26 |
| In-lane bills with a recorded committee vote | 42 → 24 after the 10% bar | 28 → 20 after the 10% bar |
| Motions refused as near-unanimous | 44 | 19 |
| Printed names resolved / unmapped / refused | 96 / 0 / 0 | 74 / 12 / 0 |
| Committee acts on bills in the lane | 32 on 24 | 26 on 20 |
| Reprints collapsed | 10 | 0 |
| Rows written | 241 | 174 |
| — of those, superseded by a floor vote | 191 | 162 |
| — of those, the member's only act on the bill | **50** | **12** |
| Off-lane rows / bills / contested bills | 1,166 / 675 / 173 | 1,076 / 640 / 141 |

(The 2024 resolved figure was 67 when wave 3 shipped and is 74 after wave 5
widened the renamed-committee door — see "Wave 5" below. Nothing else in this
table moved: the recovered acts are committee-mapping lane, not wave-3 lane.)

The 18 unmapped 2024 names are a coverage gap and are counted as one: Rep. B.
Garner, B. King, D. Johnson, J. Briscoe, J. Cobb, J. Rohner, J. Stenquist, K.
Birkeland, M. Judkins, M. Wheatley, P. Lyman, R. Lesser, R. Spendlove, S. Lund,
S. Pulsipher, T. Jimenez, Sen. D. Buxton and Sen. M. Kennedy. (Twelve of them
when wave 3 shipped; the last six arrived with wave 4's wider lane — see "Wave 5"
below.) Each was checked against that chamber's 2024 floor map and has no
unambiguous match there
— "Johnson, J." on the 2024 Senate floor page is Sen. John Johnson, so the House's
"D. Johnson" is genuinely absent rather than merely awkward. Rep. P. Lyman stays
unmapped by the brief's explicit instruction: the Lyman collision is not to be
attributed. Zero names were refused this session, and the refusal ledger is a
stated zero rather than an absent key.

### Run it

```bash
# 1. Fetch. Walks the five-step chain above and caches every byte. Network.
node scripts/vr-utah-committee-ingest.mjs --survey --session 2025GS

# 2. Read the cache and draft the printed-name map (writes nothing to db/):
#    every printed form and how it would be resolved, for a human to accept,
#    refuse, or leave unmapped. Prints the full refusal ledger.
node scripts/vr-utah-committee-ingest.mjs --collect --session 2025GS

# 3. With db/vr-utah-committee-map.json accepted, build the seed and the SQL
#    into --out (default /tmp/vr-utah-drafts), for review before committing.
node scripts/vr-utah-committee-ingest.mjs --seed --session 2025GS
node scripts/vr-utah-committee-ingest.mjs --sql  --session 2025GS

# Every step is per-session, and every artefact is suffixed for any session but
# 2025GS: db/vr-utah-committee-map-2024GS.json, -seed-2024GS.json.
node scripts/vr-utah-committee-ingest.mjs --survey  --session 2024GS
node scripts/vr-utah-committee-ingest.mjs --collect --session 2024GS

# What the reviewed-map fence costs, in votes rather than in names. Read-only:
# builds the lane in memory, writes nothing, prints the ranked dropped-vote
# ledger the coverage note in the map file quotes.
node scripts/vr-utah-committee-mapping.mjs --dropped --session 2024GS

# What the PDF reader actually sees, for one document.
node scripts/vr-pdf-text.mjs /tmp/vr-utah-committee-cache/2025GS/pdf/19683.pdf
```

### Parser limitations

* **Columns.** A vote table drawn as one text run per column comes out as one
  extracted line per baseline with the columns space-separated — fine for the
  cross-check, which strips spaces on both sides, but a caller wanting the table
  *structure* would have to read x-positions.
* **Intra-array kerning.** Two runs separated by a kerning number inside a single
  `TJ` array come out joined (`HOUSEEDUCATION`). Pinned in
  `scripts/test-vr-pdf-text.mjs` rather than fixed, because nothing here needs the
  boundary.
* **Scanned pages.** Handled — `DCTDecode` yields zero lines, and zero lines is
  reported as unreadable, never as empty. None occurred in either session: 255 of
  255 PDFs readable for 2025GS, 248 of 248 for 2024GS.
* **Draft and summary minutes.** Only `minutesStatus` APPROVED meetings are read
  (255 of 278 for 2025GS; 17 Summary, 6 Draft — and 248 of 280 for 2024GS). A
  draft can be edited before approval, so admitting one would cite a document that
  may change.
* **Renamed committees.** A committee whose letterhead and whose metadata name
  disagree is confirmed on `committeePrefixHit()` — chamber plus the first two
  significant words, matched as a sequence that tolerates punctuation and the
  stopword list between them — and the relaxation is disclosed per act in the
  collect report as `renamed`. Matching as a sequence rather than as one
  stopword-stripped substring is deliberate and was learned the hard way: the
  substring form silently refused any committee whose real letterhead kept a word
  the key had dropped. A committee whose first two significant words also changed
  would refuse, and should: at that point the document and the metadata are not
  obviously about the same body.
* **Joint and interim committees.** Not surveyed. Only `HST*` / `SST*` standing
  committees were walked; appropriations subcommittees and interim committees
  publish on the same chain and would extend the same parser.

### Still blocked after wave 3

1. **The 173 bills with a contested committee vote and no issue mapping.** The
   single largest available gain, and it is a curator pass, not a parser change:
   the committee acts are already extracted and refused only because the parent
   bill has no reviewed mapping.
2. ~~**2024GS and earlier.**~~ **2024GS done in the same wave**
   (`20261005000000`): 26 acts on 20 bills, 174 rows, 12 of them the member's only
   act on the bill. 2023GS and earlier remain open, and each needs the same three
   things — its own survey fetch, its own reviewed printed-name map (the
   membership changes) and its own migration. Nothing in the script is
   session-specific except the `--session` default; the two fixes 2024 forced
   (`ownerid`, the templated header) mean the next session should need neither.
3. **Everything wave 2 left blocked** — floor defeats, suspension/conference
   passage, receipt cards for state votes, other states — is unchanged. Wave 3
   deliberately widened no floor-action code.

### Wave 5 — the cleanup pass, and how a shipped seed grows safely

Wave 5 shipped no new session and no new lane. It fixed the renamed-committee door
above and dealt with the consequence, which is the interesting part: **a seed that
has already been written into a migration is not a file you can regenerate in
place.** `20261007000000_vr_utah_2024gs_committee_mapping.sql` is applied. It is
the record of what the database was actually told, so it is not edited, not
renamed and not regenerated — and after the door was widened it no longer equals
its own generator's output, which is correct and expected.

What ships instead is a forward delta:
`20261008000000_vr_utah_2024gs_committee_mapping_renamed_committee.sql`, generated
by `--sql --bills <list> --name renamed_committee`. It restates the twelve
affected bills in full — HB0028, HB0111, HB0137, HB0186, HB0267, HB0284, HB0335,
HB0429, HB0460, HB0463, HB0465, HB0534 — with the same generated blocks as before,
unmodified. Restating a whole block is safe precisely because the generator was
idempotent from the start: each block selects its measure before inserting one,
guards every issue mapping with `IF NOT EXISTS`, and ends every position insert
with `ON CONFLICT (measure_id, politician_id, action_type) DO NOTHING`. Of the 124
positions the delta names, 67 are new and the rest are no-ops. Three of the twelve
bills are new measures; nine already existed and gained positions.

Two things this forced, both worth keeping:

* **The delta's header states the delta's own numbers.** `buildSql()` recounts
  measures, mappings, acts and positions off the emitted subset when `--bills` is
  given, and prints a paragraph naming every bill in the file and saying plainly
  that whatever the database already holds is a no-op. A migration whose prose
  claims 64 bills over a body carrying 12 is a lie in the place a reader trusts
  most.
* **The harness reads a session's migrations as a set, not as a file.**
  `test-vr-utah-committee-mapping.mjs` used to compare one file's block count to
  the seed's measure count. It now parses every migration for a session, keys
  measures by chamber + number and positions by measure + politician + date, and
  asserts the *union* equals the seed in both directions: every seeded position is
  written by some migration, and no migration writes a position the seed does not
  hold. Union rather than sum, because a delta restates.

**Late printed-name additions.** Widening the door admitted meetings that had
never been read, which surfaced seven printed forms not yet in
`db/vr-utah-committee-map-2024GS.json`: Rep. A. Matthews, B. Brammer, J. Dunnigan,
J. Teuscher and N. Thurston land exactly on hand-reviewed 2024 floor keys; Rep. A.
Maloy and C. Musselman are unique surnames confirmed by the same meeting's own
attendance lines. Both routes are the doors `_howReviewed` already documented (now
64 exact / 10 attendance of 74). No fuzzy matching was added and no name was
resolved by similarity.

**The unmapped 2024 names are still unmapped, and now counted in votes rather
than in names.** This is the one place this pass found its own paperwork lying.
`_unmappedIsCoverage` quoted a hand-totalled figure — 12 names, 36 dropped
positions, 29 acts — that had been true of wave 3's lane alone and was never
updated when wave 4 more than tripled it. The root cause was in the report, not
in the prose: `rep.names.unmappedForms` records each printed form **once**, which
is the right unit for "how many people would a roster wave have to resolve" and
the wrong unit for "how much record are we throwing away", since one unmapped
chair on a busy committee costs more votes than five members who appeared once.
The ingest now counts occurrences too (`droppedPositions` / `droppedByForm`), the
mapping tool grew a read-only `--dropped` that prints the ranked ledger, and the
map file quotes that output instead of arithmetic:

```bash
node scripts/vr-utah-committee-mapping.mjs --dropped --session 2024GS
#   2024GS mapping lane: dropped votes 151 across 18 unmapped name(s)
#       16  Rep. S. Lund
#       15  Rep. K. Birkeland
#       ...
node scripts/vr-utah-committee-mapping.mjs --dropped --session 2025GS
#   2025GS mapping lane: no dropped votes — every printed name on every
#   admitted act resolved
```

So the true 2024 figure is **151 dropped committee positions across the 104 acts
the lane now holds, on 18 printed names** — Lund 16, Birkeland 15, Rohner 13,
Lyman 13, King 12, D. Johnson 12, Cobb 10, Pulsipher 10, Kennedy 9, Wheatley 8,
Jimenez 8, Briscoe 7, Buxton 5, Garner 3, Judkins 3, Lesser 3, Stenquist 2,
Spendlove 2. Wave 3's own 26 acts account for 33 of the 151; only 4 fall on the
four acts this pass recovered, so the widened door is a rounding error in the gap
and the gap is a roster wave's to close. Six names — Garner, Judkins, Lesser,
Spendlove, Stenquist and Wheatley — are listed in the ledger for the first time
even though the bar never moved; all six surnames are absent from both chambers of
the 86-key 2024 floor map, so they are the same class of gap and need no new
doctrine. `test-vr-utah-committee.mjs` now checks the note against the ledger it
describes: same count, every gap named, and the re-derivation command cited.
`_nearCollisions` records why each is a roster problem rather than a matching
problem — House "Rep.
D. Johnson" against Senate `john_johnson`, `marsha_judkins_provo` who is the Mayor
of Provo, `lyman` who is a gubernatorial candidate, and Sen. M. Kennedy who is the
federal `kennedy` pid. The fix is a roster wave, not a closer string comparison.

**2025GS is unaffected.** Regenerating its mapping seed after the door change
produced a byte-identical file, as did both wave-3 committee seeds. The widened
door changed exactly one session's data.

### Wave 6 — 2023GS committee minutes, and the roster wave the gap ledger asked for

Wave 6 did two jobs and found a third. The jobs were the third session of committee
minutes and the 18 printed names wave 5 wrote down and could not resolve. The third
thing was a discovery about *why* two shipped seeds had grown, and it is the part
worth reading first because it is the part that is easy to get wrong in a report.

**2023GS, the same path as 2024 and 2025.** `--survey` cached 285 meetings, 240 of
them with `minutesStatus === "APPROVED"`; every one of the 240 published PDFs
fetched and every one produced text, so **zero meetings failed closed as
UNREADABLE** and none was a Draft or a Summary. 2 471 motions parsed, 2 364 with a
recorded roll. The seven admission rules and the 10 %-minority contestedness bar
then did their usual work: **40 acts admitted on 27 bills, 33 refused as
near-unanimous, 9 later reprints dropped, 303 positions written** — 207 of them
superseded by the same member's floor vote on the same bill and **96 fresh**, where
the committee record is the only record. Three acts confirmed on the
renamed-committee door's short name. That door was **not touched**: it is still the
sequence match wave 5 made it, and wave 6 added no second relaxation.

**The 2023 printed-name map had to be re-reviewed, and the membership is why.** It
would have been quicker to copy `db/vr-utah-committee-map-2024GS.json` and change
the session string. It would also have been wrong. Senate District 22 seats Jacob L.
Anderegg in 2023 and Chris Balderree in 2024; House District 26 seats Quinn Kotter
in 2023 and prints "MacPherson" in 2024. A reused map would have dropped two
humans' votes while looking complete, so
`db/vr-utah-committee-map-2023GS.json` names both seats in
`_reviewedForThisSession`, cites the 2023 roster page and nothing else, and
`test-vr-utah-committee.mjs` § 9 checks all three facts — including that Anderegg
and Kotter appear in the 2023 map and *not* in the 2024 one.

#### The third identity door: `unique_surname_on_session_roster`

Wave 5 left 18 printed names written to nobody and **151 dropped committee
positions** across the 2024 mapping lane. Every one of the 18 turned out to match
exactly one member of the printed chamber on the Legislature's own 2024 roster page
with an agreeing given initial — and **none of them had a record in `cmp-data.js`
at all**. So the brief's first clause, "resolve only with a human-unique match to
cmp-data", resolved zero: there was nothing to match against. The gap was never a
matching problem. It was a roster problem, exactly as wave 5's `_nearCollisions`
said.

The door that closes it opens on one condition and has no threshold to tune:

> the roster page for **this session** lists exactly one member of **that chamber**
> with that surname, and that member's given name begins with the printed initial.

One roster row in, one human out. A second same-surname member in the same chamber
**closes** the door rather than starting a comparison — there is no string distance,
no nickname table and no score. `confirmedBy` records the roster row verbatim
("`King, Brian S. · Representative · Democrat · 23`") so a reader checks the
resolution against the same line the reviewer read, and the test re-derives surname,
chamber word and initial from that string rather than trusting it.

**16 identity-only rows were added to `cmp-data.js`** from those roster rows: 14
needed by 2024, plus Kotter and Anderegg needed only by 2023. They carry name,
office, state, district and party — **no score, no promise ledger, no stances, no
`termStart`** (a roster page states the seat, not the tenure, and 624 of the
pre-existing 784 records already omit both). All 16 read "Former" because none
appears in the current `le.utah.gov/data/legislators.json` in either chamber.

Result: **`--dropped --session 2024GS` fell from "151 positions across 18 unmapped
names" to "dropped votes 0 across 0 unmapped name(s) · 39 on refused name(s)"**, and
`unmapped` is now empty in both the 2024 and the 2023 map.

#### Four refusals, and why they moved ledgers

`Rep. M. Judkins`, `Rep. P. Lyman`, `Sen. M. Kennedy` and `Rep. D. Johnson` stay
refused in both sessions. Each already has a `cmp-data.js` record under the same
distinctive name in **the wrong office**: `marsha_judkins_provo` is the Mayor of
Provo, `lyman` is a gubernatorial candidate, `kennedy` is Mike Kennedy of the U.S.
House under a federal pid. Attributing a state committee vote to one of those
records files it under an office the person did not hold; creating a second record
splits one human in two. `Rep. D. Johnson` prints in the **House** while the only
Utah Johnson on the roster is `john_johnson`, a state **Senator** — and both hold
District 3, which makes it the most dangerous near-match in the file rather than the
easiest.

They also **moved out of `unmapped` and into `_refusedNames`**, which is a doctrine
point and not bookkeeping. Before the roster was read they were gaps someone could
close. After it, they are decisions not to close them. That is precisely the
distinction the two ledgers exist to draw, so the refusals are now in the ledger
that means "decided" and `_unmappedIsCoverage` says the gap it heads is closed. 19
positions are withheld by those four refusals — Kennedy 8, D. Johnson 7, Lyman 3,
Judkins 1.

#### Where the 2024 and 2025 seed growth actually came from

This is the finding, and the first draft of the report got it wrong. Regenerating
the 2024GS and 2025GS **committee-vote** seeds after wave 6 produced bigger files:
2024 went 20 bills / 26 acts / 174 positions → 21 / 28 / 214, and 2025 went 24 / 32
/ 241 → 27 / 35 / 258. The tempting explanation is "newly published minutes". It is
false, and `--verify` said so out loud: `NOT IN BUCKET: HB0348` for 2024 and
`NOT IN BUCKET: SB0026, SB0316, SB0336` for 2025.

An act-level novelty check settled it: **every novel act belongs to a bill that
vocabulary wave V1 gave a reviewed issue key.** 2025's +17 positions are exactly the
three V1 acts (7 + 7 + 3); 2024's +40 are 15 on H.B. 348 plus 25 recovered by the
roster door. **No newly published minutes contributed anything, and no fence moved.**
A bill with no reviewed mapping is off-lane by rule; the moment V1 reviewed
`sound_money` and `dev_district_finance` for those four bills, contested
pass-out-favorably votes already sitting in the cache became admissible under rules
already in force.

That is also why the **mapping lane's bucket shrank while its admitted count grew**
(2025GS 173 → 170 bucket, 76 → 78 admitted; 2024GS 141 → 140, 64 → 66). The bucket
is "had a committee vote and has *no* reviewed mapping", so V1 reviewing a mapping
moves a bill out of this lane and into the formal one. Their refusals stay on the
record — this lane really did decline to map them — now flagged
**`leftTheBucket: true`**, which is what lets `--verify` tell a documented exit from
silent drift. An unflagged stranger still exits 1; a flag on a bill the bucket still
holds exits 1 the other way.

#### A shipped seed grew again, so `--sql` learned the delta

Wave 5 taught `vr-utah-committee-mapping.mjs --sql` to emit a forward delta. Wave 6
needed the same thing from `vr-utah-committee-ingest.mjs`, because
`20261004000000` and `20261005000000` are applied and their seeds had just grown.
Both tools now take `--bills`, `--name` and `--reason`; the ingest's `buildSql`
keeps the **whole** seed's counts for the SQL `VERIFICATION` block (the database's
end state after every migration in the session has run) and a **recounted** subset
for the prose (what this file restates). A delta header says "WHAT THIS RESTATES",
lists its bills with per-bill act and position counts, wraps `--reason` prose under
"WHY THEY CHANGED.", and **refuses to claim a new-row count** — how many of its rows
are new depends on which migrations have been applied, which is a fact about the
database and not about the file.

Five migrations shipped, all forward-only, none editing an applied file:

| stamp | lane | shape |
|---|---|---|
| `20261012000000_vr_utah_2023gs_committee_votes` | committee votes | full — 303 positions / 40 acts / 27 bills |
| `20261013000000_vr_utah_2024gs_committee_votes_roster_rows` | committee votes | delta — 13 bills, 164 restated rows, verifies 214 on 21 |
| `20261014000000_vr_utah_2025gs_committee_votes_v1_vocabulary_keys` | committee votes | delta — 3 bills, 17 rows, verifies 258 on 27 |
| `20261015000000_vr_utah_2024gs_committee_mapping_roster_rows_and_v1_bills` | mapping | delta — 44 bills |
| `20261016000000_vr_utah_2025gs_committee_mapping_v1_committee_only_bills` | mapping | delta — 2 bills, 2 mappings, 15 positions |

`test-vr-utah-committee.mjs` changed shape to match: a session is now a **list** of
migrations, and what it asserts is the **union** of their rows keyed on
`vr_positions_unique`, collapsed the way Postgres will collapse it. Counting insert
statements would have read wave 6's restatement as a double count — 2024GS's two
files hold 338 statements for 214 distinct rows. Per file it still checks the file's
own arithmetic (stated rows = inserted rows, fresh + superseded = total, the
near-unanimous paragraph counts *this file's* bills), and byte-identity against
`buildSql` now applies to each session's **newest** file only. The applied files
behind it were generated from a smaller seed and cannot regenerate — which is the
whole reason the new rows arrived as a delta instead of an edit.

#### What the index says, and what it does not

The 16 identity rows grew the FPI denominator from **116 to 132**, and all 16 land
on **thin** in both columns: real committee positions, not enough pattern for the
engine to characterise. That is the honest tier for them and it is checked by name —
none lands on **empty** (so no row was added that carries nothing) and none lands on
**readable** (so no identity row bought a characterisation it had not earned). The
ten empty members are the same ten before and after, and nobody lost a readable
record.

| lane | empty | thin | readable |
|---|---|---|---|
| waves 1–3 + 2023GS committee | 10 | 20 | 102 |
| + wave-4 mapping positions | 10 | 19 | 103 |

**Readable-tier movement from 2023GS is nil, and that was expected.** 207 of its 303
positions are superseded by a floor vote the index already read, and the 96 fresh
ones are spread thin across 27 bills — one member picking up one committee act on
one bill does not cross a characterisation bar. The one member who moved
(`jason_thompson`, thin → readable) moved on wave-4 mapping positions, not on 2023.
Depth arrived; tiers barely noticed. Saying so is the report.

### Wave 7 — the 2023GS committee lane re-run from a cold cache, and what it found

Wave 7 was briefed as "2023GS committee votes into the formal lane, same path, same
fences, earlier session." That session is already in the formal lane: wave 6 shipped
it as `20261012000000_vr_utah_2023gs_committee_votes`, 303 positions on 27 bills. So
wave 7 could either restate 303 applied rows under a new stamp and add nothing, or it
could do the one thing nobody had done yet — **run the whole path again from an empty
cache and check that the shipped lane is what the sources still say.** It did the
second, and it shipped no migration, because a delta of zero rows is not a migration.

**The re-run was cold.** `/tmp/vr-utah-committee-cache` was empty. `--survey --session
2023GS` re-fetched the committee list, all 25 standing committees' meeting lists, all
**285 meetings**, all 285 minutes records and all **249 published PDFs** over the
network. `--collect` then re-read them: **240 meetings APPROVED** (36 Summary, 9
Draft, none admitted), **240 PDFs published, fetched, readable, zero UNREADABLE**,
**2 471 motions parsed, 2 364 with a recorded roll**.

**Every number came back the same.** 40 acts admitted on 27 bills, 303 positions, 207
superseded by the same member's floor vote, 96 fresh, 33 refused as near-unanimous, 9
later reprints dropped, 89 printed forms resolved, 0 unmapped, 4 refused, 19 positions
withheld by those refusals. `db/vr-utah-committee-seed-2023GS.json` regenerated
**byte-identical** to the committed file, and `buildSql("2023GS")` regenerated
`20261012000000` **byte-identical to the applied migration**. The lane is
reproducible from its published sources, not just from its own seed.

#### The three fence bills are refused here by the other fence

H.B. 137, H.B. 267 and H.B. 463 are the three acts wave 5 had refused in **2024GS**
with `missing: ["committee"]`, and the brief asked that they stay refused in 2023
unless this session's PDFs independently confirm the committee name — and that the
minutes fence not be widened to clear them. Both hold, and for a reason better than
compliance: in 2023GS **the minutes fence is never consulted for them at all.**

All three are 2023GS bills. All three are **off-lane** — the parent bill has no
reviewed issue mapping — so they are refused at rule 5 before any PDF is opened.
H.B. 137 (House Natural Resources, Agriculture, and Environment, 2023-02-15) and
H.B. 463 (House Judiciary, 2023-02-22) do carry contested pass-out-favorably motions
and sit in the off-lane contested bucket; H.B. 267 had a committee vote that was not
contested. Not one of them turns on a committee-name match in this session.

**No door was widened.** The renamed-committee door was used exactly **3 times** in
2023GS, all on the same committee and all on the case wave 5 already documented —
*House Public Utilities and Energy Standing Committee*, whose letterhead reads
"…, ENERGY, AND TECHNOLOGY…" — on H.B. 289, H.B. 357 and H.B. 425. The sequence
relaxation wave 5 added is unchanged and gained nothing new here.

#### The off-lane refusal, counted

Rule 5 is the largest refusal in this session and it is stated here rather than left
in a tool's stdout. 2023GS committee minutes carry **1 020 recorded-roll
pass-out-favorably rows across 612 bills that have no reviewed issue mapping**, and
**135 of those bills carry a contested committee vote across 157 contested acts**.
Every one is refused. None was mapped, and no issue key was invented to admit one:
a committee vote is evidence of a position on a bill, never evidence of what the bill
is about. Those 135 bills are the curator worklist `--bucket --session 2023GS`
prints, and this pass deliberately left them where they are.

#### What the index says about 2023GS specifically, with the number

Wave 6 reported readable-tier movement from 2023GS as "nil". That was right and it
was not measured. Wave 7 measured it, by booting the index with the 2023GS committee
seed withheld and again with it in place — floor plus committee only, so the wave-4
mapping positions cannot be confused for this lane's work:

| lane | empty | thin | readable |
|---|---|---|---|
| floor + 2025/2024 committee (2023GS withheld) | 17 | 13 | 102 |
| + 2023GS committee acts | 10 | 20 | 102 |
| delta attributable to 2023GS | **−7** | **+7** | **0** |

**Seven members moved from `empty` to `thin`, and nobody became readable.** Members
with a record went 115 → 122, the same seven. That is the honest shape of this lane:
2023GS put a first formal act on file for seven Utah legislators who had none, and
bought no characterisation for anybody. **37 distinct members** hold at least one of
the 96 fresh rows — a first recorded act on that bill — spread over 27 bills, which
is why no characterisation bar moves: one act on one bill is depth, not a pattern.
No floor moved, no tier collapsed, and the 102 readable records are the same 102.


### Wave 8 — the 2023GS off-lane bucket, worked by hand (`20261019000000`)

Wave 7 measured the cost of rule 5 in 2023GS and refused to pay it: **1 020
recorded-roll pass-out-favorably rows across 612 bills with no reviewed issue
mapping**, of which **135 bills / 157 contested acts** cleared the 10%-minority bar.
Wave 8 is the curator pass over exactly that 135, the same job wave 4 did for 2024GS
and 2025GS. **No new ingest, no fence widened, no floor moved, no issue key added.**

**The list was recomputed, not pasted.** `--bucket --session 2023GS` was re-run
against the shipped ingest output over the warm wave-7 cache (249 PDFs, 240 approved
minutes) and returned 135 bills / 157 acts — the same number wave 7 published, from
the same source rather than from wave 7's prose. `scripts/vr-utah-bill-text.mjs`
then fetched all 135: **132 readable, 3 not** (H.R. 3, H.R. 4, S.R. 4 — the extractor
cannot find an enacting clause in a resolution, which is correct, because a
resolution has none).

#### The count

| | bills |
|---|---|
| contested off-lane bucket, recomputed | **135** |
| admitted with a reviewed mapping | **68** |
| refused in writing | **67** |
| unaccounted | **0** |

68 bills carry **70 reviewed mappings** — two bills earned a second key for a
genuinely distinct provision (H.B. 54, `lower_taxes` 85 + `tax_middle_class` 50;
H.B. 147, `tough_on_crime` 55 + `free_speech` 45 `yea_opposes`) — across **35 shipped
keys**, **59 `yea_supports` / 11 `yea_opposes`**, weights **45–85, median 55**. The
seed is **81 acts and 607 positions, 0 superseded**: these measures have no floor
roll by construction, so every one of the 607 is that member's only act on that bill
and all of them count.

Admission rates, recomputed from the three decision files rather than quoted:

| session | bucket | admitted | refused | rate | keys used |
|---|---|---|---|---|---|
| 2025GS (wave 4) | 173 | 78 | 95 | 45.1% | 46 |
| 2024GS (wave 4) | 141 | 66 | 75 | 46.8% | 40 |
| 2023GS (wave 8) | 135 | **68** | **67** | **50.4%** | 35 |

The wave-8 brief quoted wave 4 as "314 → 140 admitted, 174 refused"; the two files
read **144 admitted / 170 refused** over the same 314. Both pairs total 314, so the
brief's figure is a transposition rather than a discrepancy in the record — but the
recomputed pair is the one to quote. Note also that `--verify` recomputes the bucket
on every run and now reads **170** for 2025GS and **140** for 2024GS, because
vocabulary wave V1 later reviewed keys for four of those bills and they left this
lane; the decision files still hold all 314 decisions. 2023GS has no such exits.

The two bucket numbers above are therefore *decisions*, not *bucket size*, for
2024/2025. For 2023GS the two coincide at 135.

#### Two rules from this pass

1. **An institution-creating bill is admitted only where the new body gets operative
   duties over the policy itself.** H.B. 307 creates the Utah Water Ways partnership
   and gives it water-stewardship powers and duties, so it takes `water` at a narrow
   45 — the same key wave 4 reviewed for a 2024 bill directing that partnership's
   work. H.B. 177, H.B. 210, H.B. 268, S.B. 62, S.B. 109 and S.B. 125 create bodies
   that **study, advise or report** and nothing more, and are refused. A commission
   that produces a recommendation is not a direction on the policy; treating it as
   one would let any interim-study bill inherit the weight of the fight it studies.

2. **A bill that pushes one key both ways is refused, not mapped to its louder half.**
   H.B. 297, H.B. 303, H.B. 304, S.B. 93, S.B. 233 and S.B. 257 each contain
   provisions running in opposite directions on the same key. Rule 22 already forbids
   a circular stance; the mapping-pass version is that a curator may not pick the
   subsection they find more consequential and publish it as the bill's direction.
   Both halves are in the text, so the text does not have a direction.

Both conventions are recorded verbatim in `_note` in
`db/vr-utah-committee-bills-2023GS.json`, next to the decisions they governed, so a
later reader can check a refusal against the rule that produced it.

#### The three fence bills, one more time

The brief asked that H.B. 137 / H.B. 267 / H.B. 463 stay off this list if they are
off-lane, and that mapping not be used to reach past the minutes fence. **H.B. 267
is not in the bucket at all** (its 2023GS committee vote was not contested).
H.B. 137 and H.B. 463 are in it, and both are **refused on their own text**:

- **2023GS H.B. 137 is "State Crustacean Designation"** — the brine shrimp. Utah
  renumbers every session, so this is a different instrument from the 2024GS H.B. 137
  wave 5 refused. A state-symbol designation carries no direction on any key.
- **2023GS H.B. 463 is "High School Sports Amendments."** Its operative provision
  names "birth certificate or other identifying documents" and never names sex or
  gender. Mapping `lgbtq_rights` onto it would be inference past the text, which
  fence 4 forbids.

It is worth stating why this could not have gone wrong even if a mapping had been
admitted: the ingest tests **lane membership before it confirms a PDF**, so admitting
a mapping moves a bill from "refused at rule 5" to "now subject to rules 6 and 7" —
the full four-part minutes confirmation still runs. A mapping cannot buy a
committee-name match.

#### No new key, and the one candidate that nearly earned one

The bar was: the fight must already clear all six standing vocab rules **and** ≥3 of
these bills must have been refused for lack of the key. Exactly one candidate met the
second half and failed the first.

**Candidate ballot access / party nomination method** — H.B. 91, H.B. 202, H.B. 393
and H.B. 453 all turn on how a *candidate* reaches the ballot — convention versus
signature gathering, and the signature counts required for a party's nomination —
with H.B. 205 adjacent (a primary runoff, i.e. election method rather than access).
Four refusals is over the threshold. It is still refused, and listed for V2, because it
fails **rule 2 (CLEAN POLARITY)** — the convention-versus-signature fight has no
single voter-legible direction; both camps describe themselves as widening access —
and **rule 3 (NOT A COUSIN)**, since it sits on top of `voting_access`,
`election_integrity` and `democracy_balance` without being any of them.

Below the three-bill threshold and noted as watch items, not proposals:
victims' rights / restitution (H.B. 456), automated traffic enforcement (S.B. 105),
state-funded early childhood education (S.B. 258).

H.B. 202 is worth its own line, as the clearest illustration of fence 4. It looked
like an initiative-threshold bill and was expected to map. Dumping the whole of
`20A-9-408` from the introduced text showed the section **reorganised into new
subsections with every number unchanged** — 28 000 / 7 000 / 2 000 / 1 000 / 2 000
and the 3% alternative all survive verbatim. There is no delta to have a direction
about, so it is refused. The text is the bill.

#### What it costs the reader, measured

Booted with the 2023GS mapping seed withheld and again with it in place, floor plus
committee plus the wave-4 mapping lane held constant:

| lane | empty | thin | readable |
|---|---|---|---|
| shipped (2023GS mapping withheld) | 10 | 19 | 103 |
| + the 68 bills of this pass | 10 | 16 | 106 |
| delta | **0** | **−3** | **+3** |

**Three members crossed thin → readable** — `kera_birkeland`, `steven_lund`,
`susan_pulsipher` — **nobody regressed, and nobody left `empty`.** The 607 positions
add **128 issue rows** but only **29 new (member, issue) cells**: 16 newly clear, 14
newly split, 1 fewer unread. Nearly as many new cells argue with themselves as speak
clearly, which is the honest shape of a committee lane: a single committee act on a
single bill is depth, not a pattern.

**The three who crossed are three of wave 6's sixteen identity-only roster rows, and
that deserves saying out loud.** Wave 6 added those sixteen for legislators who cast
recorded committee votes and had no roster record at all, and
`test-vr-utah-committee-mapping.mjs` fenced them at `thin` in both states with the
reasoning "no identity row buys a characterisation it did not earn." Wave 8 gave
three of them enough mapped committee acts for the **shipped** tier rule to
characterise one or two issues each:

| member | before | after |
|---|---|---|
| `kera_birkeland` | thin · 10 acts · 0 clear | readable · 28 acts · 1 clear |
| `steven_lund` | thin · 13 acts · 0 clear | readable · 32 acts · 2 clear |
| `susan_pulsipher` | thin · 9 acts · 0 clear | readable · 22 acts · 1 clear |

**No floor was moved to allow this.** The tier rule, the 0.60 committee weight and
the coverage bar are the ones waves 3 and 4 shipped, and the index is the shipped
module in a sandbox. What moved is the evidence. The fence was rewritten to match its
own stated purpose rather than its then-true observation: the three are **named**, and
what they earned is now asserted — each held **0** clear issues before and holds ≥1
after, on strictly more acts, and crossed on a *clear* issue rather than by splitting
an old one. The other thirteen must still be `thin` in both states, and none of the
sixteen may land on `empty`.

A reader who thinks a record built entirely of committee votes should not read as
`readable` has a real objection, and the lever for it is not this file: it is the
tier rule, or the 0.60 weight, or a rule that committee-only members are excluded
from characterisation. Those are floor changes and this pass had no mandate for one.
The change is disclosed here so the decision can be made deliberately.

#### Twelve rows read as splits now, up from five

`M.lost` — (member, issue) cells that lost a one-sided read — went **5 → 12**. The
seven new ones: `andrew_stoddard`/`gun_rights`, `joseph_elison`/`edu_parental`,
`karen_m_peterson`/`edu_parental`, `nelson_abbott`/`tough_on_crime`,
`nthurston`/`privacy_rights`, `r_neil_walter`/`edu_parental`, `rshipp`/`water`.
**Three of the twelve fell from `strong`**, the strongest read the engine gives
(`karen_m_peterson`, `r_neil_walter`, `rshipp`). Every one is a member whose 2023
committee vote runs against their own floor run on the same key, and **every one
lands on `split`, not on `thin`** — a real tier that still says something. That is
the wave-4 doctrine working: a committee vote is allowed to turn a one-sided read
into a split, and the fence is that no such row stops being nameable. The harness
bound was raised from 6 to 12 **with the seven names written into it**, not with a
larger number and no list.

#### One coverage gap, left open on purpose

`Rep. J. Briscoe` appears on admitted acts in this wider lane and is not in
`db/vr-utah-committee-map-2023GS.json`. **4 votes are dropped** rather than
attributed, alongside the 42 withheld by the four names the map already refuses. Wave 4
hit the same thing and recorded the precedent in `_nearCollisions`: a mapping pass
surfaces printed names and **does not extend a reviewed identity artifact**, because
name review is its own fence with its own doors. The name is logged here for the next
name-review wave, not resolved here.

#### Three corrections the harness forced

1. **A secondary key at 50 was over the narrow-link bar.** H.B. 54's second key
   (`tax_middle_class`) was reviewed at 50 while the shipped narrow-mapping bar is
   **45**, and `loadDecisions()` does not check it — only the harness does. It was
   lowered to 45. A non-primary key has to print as a narrow link, and a curator's
   sense of how consequential the provision is does not get to override that.
2. **The `_leftTheBucket` note has to name the flag it explains.** The harness reads
   the note for the literal string `leftTheBucket`; the first draft explained the
   concept without naming it. Rewritten to say "No bill carries the leftTheBucket
   flag in this session…".
3. **68 new bill addresses meant a stale sitemap.** `measureAddresses()` reads the
   migrations, so the 68 new `vr_measures` inserts became 68 openable `/b/2023GS/…`
   addresses the committed `sitemap.xml` did not list, and two sitemap tests failed
   on it. `node scripts/gen-sitemap.mjs` — 1 227 urls, +68, `robots.txt` unchanged.
   **A mapping pass ships a sitemap regeneration.** It is the step that is easy to
   forget because nothing in the mapping tooling mentions it.

#### Two things the generator learned

1. **`--sql` now emits its own VERIFICATION block**, scoped by
   `external_ids->>'committeeOnly' = 'true'` — the exact predicate the seed-lane
   migrations *exclude*. The two guards therefore partition a session's
   `committee_vote` rows instead of each asserting a total against the whole session,
   which is what the brief asked for and what `20261015000000` (wave 4's 2024GS
   mapping file) shipped without. A `--bills` delta narrows the same predicate to the
   bills it restates. It also asserts that every committee-only measure carries its
   reviewed issue rows, that none of them reached `vr_rollcalls` at all, and that
   every position cites an `le.utah.gov` PDF.
2. **The header no longer says "Wave 4."** It said so on every session because the
   line was hardcoded, which would have put wave 4's name on this file's provenance.
   It now reads "This pass read the bill text and reviewed them."

#### The harness, and how sections 5 and 6 were actually verified

`test-vr-utah-committee-mapping.mjs` now runs over three sessions. Its section 1
recomputes each bucket through the shipped ingest, so **it cannot run in an
environment without a warm `/tmp` ingest cache** — a known env failure, and it
crashes at section 1 before sections 2–6 execute. Shipping unverified edits to
sections 5 and 6 was not acceptable, so they were exercised by writing **scratch
bucket stubs** to `/tmp/bucket-{2025,2024}GS.json`, derived from the shipped decision
files as `admitted ∪ (refused minus leftTheBucket)` — which reproduces 170 and 140
exactly. With those in place the harness runs end to end: **891 assertions, 0
failed.** The stubs were then deleted, so the reported env failure is the same one as
before. Section 1's real guarantee is unchanged and comes from `--verify`, which
recomputes the bucket from the ingest rather than from a stub.

Two shape changes were needed:

- **The VERIFICATION block is not a measure block.** `sqlRows()` required every `DO`
  block to select a measure by number and chamber; the guard selects none. It is now
  skipped there and in the per-block arithmetic, identified by its own `DECLARE`
  line rather than by position.
- **The write fence had to be restated as a write fence.** It read `lacks(stmts,
  "vr_rollcalls")` over all executable text, and the guard *reads* `vr_rollcalls` to
  prove the count is zero. Reading a table to prove it is untouched is the opposite
  of touching it. The guard is now cut out of that fence and given a stricter one:
  **it may contain no `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP` or `CREATE` at
  all.** Net stronger, not weaker.

#### Twin boot

The shipped Direction Match derivation was run from a HEAD-only copy of the tree and
from the working tree, against the same live record:
`vr-audit-record-direction-coverage.mjs` and `vr-audit-record-direction-cards.mjs`
both came back **byte-identical** (`md5 3095ce3a…` and `5ae20174…`). 1 534 judged
pairs before and after, **0 verdicts moved, 0 stated positions appeared or changed.**
That is the expected result and it is worth stating why: this pass writes a pending
migration, a seed and an index harness, none of which any shipped surface reads at
runtime. The measured surfaces move when the migration is applied, not when it lands.

#### Run it

```bash
# the list, recomputed from the shipped ingest output
node scripts/vr-utah-committee-mapping.mjs --worksheet --session 2023GS

# accounting: admitted + refused must equal the bucket, exit 1 otherwise
node scripts/vr-utah-committee-mapping.mjs --verify --session 2023GS
#   2023GS: bucket 135 · admitted 68 · refused 67 · unaccounted 0

# the seed the index reads, and what the name fence costs
node scripts/vr-utah-committee-mapping.mjs --seed --session 2023GS
node scripts/vr-utah-committee-mapping.mjs --dropped --session 2023GS

# the migration
node scripts/vr-utah-committee-mapping.mjs --sql --session 2023GS --out /tmp/vr-utah-drafts

# the reader-facing delta
node scripts/vr-utah-fpi.mjs

# 68 new bill addresses — do not skip this
node scripts/gen-sitemap.mjs
```
