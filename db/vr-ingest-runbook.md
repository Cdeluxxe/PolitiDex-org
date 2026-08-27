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

The 2024 result:

| | 2025GS | 2024GS |
| --- | --- | --- |
| Meetings cached / approved | 278 / 255 | 280 / 248 |
| PDFs fetched / readable | 255 / 255 | 248 / 248 |
| Motions / with a recorded roll | 2,732 / 2,661 | 2,608 / 2,536 |
| Admitted motions | 32 | 26 |
| In-lane bills with a recorded committee vote | 42 → 24 after the 10% bar | 28 → 20 after the 10% bar |
| Motions refused as near-unanimous | 44 | 19 |
| Printed names resolved / unmapped / refused | 96 / 0 / 0 | 67 / 12 / 0 |
| Committee acts on bills in the lane | 32 on 24 | 26 on 20 |
| Reprints collapsed | 10 | 0 |
| Rows written | 241 | 174 |
| — of those, superseded by a floor vote | 191 | 162 |
| — of those, the member's only act on the bill | **50** | **12** |
| Off-lane rows / bills / contested bills | 1,166 / 675 / 173 | 1,076 / 640 / 141 |

The 12 unmapped 2024 names are a coverage gap and are counted as one: Rep. B.
King, D. Johnson, J. Briscoe, J. Cobb, J. Rohner, K. Birkeland, P. Lyman, S.
Lund, S. Pulsipher, T. Jimenez, Sen. D. Buxton and Sen. M. Kennedy. Each was
checked against that chamber's 2024 floor map and has no unambiguous match there
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
  disagree is confirmed on `committeePrefixKey()` — chamber plus two significant
  words — and the relaxation is disclosed per act in the collect report. A
  committee whose first two significant words also changed would refuse, and
  should: at that point the document and the metadata are not obviously about the
  same body.
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
