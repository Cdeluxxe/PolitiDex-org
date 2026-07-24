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

# 2. Pull the 119th Congress roll calls, both chambers (idempotent; re-runnable)
node scripts/vr-ingest.mjs run house  119 250
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
