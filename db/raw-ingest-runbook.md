# Raw ingest + stance scoring — runbook

The scheduled raw-ingest cron runs every minute. Each run plans up to 8 politicians
from the rotation roster, pulls their pages into the `raw-ingest` Blobs store and
scores every page against every issue key. Clear reads go to the Evidence Locker
(`evidence-locker` store), and qualifying Locker items are promoted into
`pdx_stated_positions`. The code lives in `netlify/functions/raw-ingest-cron.mts` and
`netlify/lib/raw-ingest-*.mjs`, `stance-score-core.mjs`, `evidence-locker-core.mjs`
and `stated-positions-core.mjs`.

## Roster and tiers

Every politician on the PolitiDex roster (`db/share-index.json` people) is in the
rotation roster. Configured rows and the pool expansion keep their tiers (tier 1 first,
then tier 2). Everyone else joins as **tier 3** from
`db/raw-ingest-full-roster-2026-11.json`. These rows start with no pages, and the planner
skips a row with nothing to pull until a page for that politician is configured.
After the site roster changes, regenerate the file with
`node scripts/build-raw-ingest-full-roster-2026-11.mjs`. Run it with `--check` to
verify the file is current.

This page covers the **fresh evidence pass** (`netlify/lib/raw-ingest-fresh.mjs`).
That pass stopped the cycle from re-reading the same homepages and press indexes and
logging "0 new items" on every run.

## Source types pulled

| Class | What it is | Where the URL comes from |
| --- | --- | --- |
| *(existing)* | Configured topic pages, official patterns, discovery patterns, known homepages | `raw-ingest-core.mjs`, `raw-ingest-expansion.mjs` |
| `congress_member`, `statewide_official`, `campaign_issues`, `state_legislature` | Cited press releases, issue sections and member pages | `raw-ingest-source-types.mjs` (each URL is cited on the site) |
| `youtube` | Official / campaign channels (mention items only) | `raw-ingest-social.mjs` |
| **`fresh_statement`** | Statement, remarks, speech, op-ed or testimony | Linked from the politician's own newsroom, issues index or homepage |
| **`fresh_press_release`** | Press release (`…/press-releases/<slug>`, `…/news/<slug>`, `DocumentID=`) | Same |
| **`fresh_issue_page`** | Campaign or official issue / priority page (`…/issues/<slug>`, `…/priorities/<slug>`, `…/platform/…`) | Same |

The three fresh classes follow these rules:

- **Only links found on the politician's own pages.** No URL is guessed or built from
  a pattern. Links must be on the same host as the page they were found on.
- **Pages that are not harvested:**
  - hosts shared by two roster politicians (for example `whitehouse.gov`, used by
    both Trump and Vance), because the links cannot be told apart;
  - state legislature and Congress.gov pages, which link to other members;
  - YouTube.
- **Links that are skipped:** navigation, pagination, tag and category pages,
  contact and donate pages, assets (PDF, images), off-host links, and index pages
  without a slug.
- **Ranking**, from likeliest to carry clear position language to least:
  1. statements;
  2. issue pages;
  3. press releases.

  Policy words in the link (introduces, bill, act, opposes, calls for …) raise the
  rank. Ceremonial items (congratulates, honors, grants, tours …) are pushed below
  zero and dropped. A link that names a topic the politician has thin or no Locker
  coverage on gets a bonus. Ties keep page order, which is newest first on a
  newsroom.
- Source types read `official …` (on `.gov` or official pages) or `campaign …`, so
  the Locker's campaign/official provenance rule (W3) applies unchanged.

## Discovery: frontier and seen ledger

Two small documents in the `raw-ingest-rotation` store hold the state:

- `frontier.json` holds harvested candidate pages per politician, best first, up to
  30 per politician. A candidate with an issue key the scorer has no rules for is
  dropped when the document is read.
- `seen.json` records every URL fetched successfully and when, keeping the 6,000
  most recent. A seen URL is never offered as fresh again.

Each run works like this:

1. **Harvest.** Discovery reads the links on every stable official-pattern page it
   checks, and the pull reads the links on every page it fetches. New candidates go
   into the frontier.
2. **Add.** For each planned politician, up to `FRESH_PER_POLITICIAN` (2)
   unfetched frontier pages join the pull list. If a harvest in step 1 found pages,
   they can join the same run.
3. **Caps stay the same:** 8 politicians, 6 sources each, 36 per run.
   - A fresh page takes a free slot.
   - If the politician is at the cap, the fresh page takes the slot of a page the
     seen ledger shows was already read. Index-like pages, official patterns and
     the ground-truth page are never displaced, because they feed the harvest.
4. **Mark seen.** After the pull, every fetched URL is marked seen and removed from
   the frontier.

Log lines:

- `discovery: HARVEST …`
- `discovery: NEW … (… · fresh, linked from …)`
- `discovery: DISPLACED …`
- `discovery: fresh pages — …`
- `discovery: N new URL(s) this run in total`
- `raw-ingest: fresh evidence — …`

The report carries `fresh: { added, displaced, harvested, frontier, seen, targeted }`.

To reset the pass, delete `frontier.json` and `seen.json` from the rotation store.
The next run starts from an empty frontier and re-harvests.

## Topic selection rule

A page's raw record is still filed under its configured topic, which is its key in
the raw store. What changes is the topic it is **scored** under:

1. **Pages cited for a topic keep it.** This covers issue pages, the
   `raw-ingest-source-types.mjs` entries and the ground-truth page.
2. **Default-topic pages are retargeted.** These are homepages, indexes, newsrooms,
   `official-*` / `discovered-*` / `known-homepage` / `fresh-*` sources: anything
   that was filed under a topic, mostly `cost_living`, only because it needed one.
   For these pages, each topic the scorer has rules for gets a signal score:
   - title / h1 mentions ×4 (capped at 2);
   - a URL-slug mention ×3;
   - body sentences mentioning the topic ×1 (capped at 10, from the first 600
     sentences);
   - `cost_living` counts at half weight, because its vocabulary ("pay", "tax",
     "prices") appears on almost any page.
3. **Coverage bonus.** +1.5 when the politician has no strong or weak Locker items
   on the topic, and +0.75 when coverage is thin (below the baseline of 1 strong or
   3 weak).
4. **When a page moves.** It moves only when the best topic has a signal of at
   least 3 *and* leads the filed topic by at least 3 after the bonus. Otherwise it
   keeps its filed topic. A page with no signal at all is never moved onto a thin
   topic.
5. **Harvested links** are filed, before they are fetched, under the topic their
   link text and slug signal, using the same bonus. With no signal they keep the
   topic of the page they were found on.

Only issue keys present in `TOPIC_RULES` (and never no-pole keys) can be chosen, so
the pass can never put an unknown key into the Locker. Cross-topic scoring is
unchanged: every page is still scored against every key after targeting. A move is
logged as `stance-score: TARGET pid|from → topic — reason`.

## Promotion of new evidence

The run already recomputes stated positions for every politician it wrote for or
planned. In addition:

- **Thin-topic writes go first.** A Locker write that is **strong**, or **weak at
  confidence ≥ 0.5** (`PROMOTE_THIN_WEAK_MIN`), on a politician + issue that was
  thin or empty before the run puts that politician at the front of the recompute.
  That politician is never deferred by the run budget. The run logs
  `stated-positions: new evidence on thin topic(s) — …` and sets
  `report.stated_positions.priority`.
- **Rows that are never written** (neither upserted nor withdrawn):
  - curated rows (any `provenance` other than `pipeline`). The production adapter
    also guards its upsert (`setWhere provenance = 'pipeline'`) and its withdraw by
    provenance;
  - active pipeline rows whose evidence includes a Locker item an editor marked
    `reviewed` in `db/evidence-locker-review.json`.

  Held rows are logged as `stated-positions: pid — N row(s) left as they are: …`.
  The one-time backfill follows the same rule.

## Safety rules (unchanged)

- Unknown issue keys are refused. Targeting and the frontier only carry scored keys.
- Proposed and rejected measure-issue mappings are never public. This pass does not
  touch them.
- An existing strong Locker item is never replaced. A weak or mention item is
  replaced only by a stronger read of the same page. Identical or weaker reads log
  `EXISTS … left unchanged`.
- Review flags (W5) and cross-topic conflicts (W6) are honoured as before.

## Tests and migrations

- `node scripts/test-raw-ingest-fresh.mjs` covers the pass: thin coverage leads to a
  new item and a stated-position change, discovery adds at least 1 URL, strong items
  are left unchanged, curated and reviewed rows are held, and targeting, source
  types, caps, shared hosts and unknown keys are handled.
- `scripts/test-raw-ingest.mjs`, `test-stated-positions.mjs` and
  `test-stated-positions-backfill.mjs` cover the earlier behaviour.
- **No migration.** The frontier and seen ledger are Blobs documents, and
  `pdx_stated_positions` already has the `provenance` column.
