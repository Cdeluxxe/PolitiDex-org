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
export VR_SITE_URL=https://politidex.org        # or http://localhost:8889 for `netlify dev`
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
```

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
   admits each for exactly one measure shape: "On Agreeing to the Amendment" on an
   `H.Amdt.`/`S.Amdt.`, and "On the Motion to Discharge" on an `S.J.Res.`/`H.J.Res.`. The
   second is the load-bearing one for arms-sale disapproval: under the Arms Export Control
   Act the resolution is the only vehicle, the discharge motion is the only vote the Senate
   ever takes on it, and a nay there is a recorded decision to let the sale proceed. Note
   how narrow the gate is — "On the Motion to Discharge" on a *bill* still fails, because
   there the discharge really is a step toward a later passage vote. Every roll admitted
   under an exception must carry a `decisiveWhy` of at least 24 characters saying why the
   question decided the substance; the test fails the seed otherwise.

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

Queued, in priority order:

1. **Re-attribute the Phase A roll calls against the widened roster.** The 37 new members
   also voted on the 29 Phase A rolls, so `db/vr-phase-a-vote-seed.json` is now
   under-attributed by construction — it was built against a 63-slug roster. Re-running
   `scripts/vr-build-phase-a-vote-seed.mjs` and emitting a forward-only migration is the
   single highest-yield follow-up, and it is mechanical: no new curation, no new rolls.
   Deliberately left out of the Israel pass, which was scoped to Israel roll calls.
2. **A stance pass over the 56 stance gaps.** These members already have judged votes on
   the key and are one sourced sentence away from rankable. Highest-volume first: curtis
   (12 judged, 100% pro-support), then barrasso, booker, collins, cruz, durbin, ernst,
   graham, grassley, hawley, john_cornyn, jon_ossoff, lee, murkowski, rand_paul and warren
   at 9 each; House at 7 each, including massie and maxine_waters at 14%, bennie_thompson
   and kclark at 29%, aoc at 0%, khanna 17%, crockett and mtg 33%, boebert 67%,
   scott_perry 83%. No position may be inferred from these numbers — that is precisely the
   invention the mapping rules forbid. The votes say what to go looking for, not what the
   member said.
3. **H.R. 340** (Hamas financing sanctions, 363-46). Queued rather than mapped: the margin
   is real and the subject is squarely on-key, but it needs its own read against rule 4
   before a direction is coded.
4. **The 117th column is one roll deep.** H.R. 5323 is the only 117th record on this issue,
   and a 420-9 vote is a thin signal by design. Contested 117th measures touching Israel
   aid, the Abraham Accords implementation bills and the Iron Dome supplemental's Senate
   path are all uningested.
5. **`is_primary` on H.Amdt. 235.** Its display-primary row is still `america_first_fp`
   from the earlier pass, while its strongest signal is now `israel_support` at weight 95.
   Moving it would be non-additive and purely cosmetic — `is_primary` drives sort order,
   the "Primary" badge and the Legislation-library link, never scoring — so it waits for a
   pass that is allowed to rewrite existing rows.
6. **The remaining 73 unadmitted portraits.** Every one has a readable Bioguide and would
   widen attribution across every ingested issue at once. Admission is cheap to write and
   expensive to get wrong, so it belongs in a pass that can re-measure the whole record —
   and it must respect the photo gate in `scripts/test-photo-coverage.mjs`, which requires
   a bundled face for every roster slug.

One naming collision a reader of the coverage table will trip over: the slug `kennedy` is
**Kimberlyn King-Hinds** (K000404, House, MP), not Senator John Kennedy (K000393), who has
no roster entry. That is why "Kennedy (LA)" on the nine Senate rolls resolves to nothing
and is correctly skipped, and why `kennedy` shows a single House amendment vote. Pre-existing
and out of scope for an additive pass, but it should be fixed before either name is
published in a ranking.

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
