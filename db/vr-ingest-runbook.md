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
