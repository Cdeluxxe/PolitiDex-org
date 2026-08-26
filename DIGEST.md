# PolitiDex Digest — what it sends, and what it will never send

The digest is the archive's only outbound voice. It goes to an inbox, where nobody
can click through to context and nobody asked a question — so the bar for what
belongs in it is higher than for anything on the site, not lower.

There is exactly one thing it is for: **telling a reader that something they track
changed, and handing them the receipt.**

## The four groups

| Group | Source | Where it comes from |
|---|---|---|
| **On The Record** | server | `buildRecordEvents()` — the archive itself |
| New Evidence | server | community evidence on followed issues |
| Community Discussion | server | threads and comments on followed people/issues |
| Promise Updates · Team Changes | client | static/local data, in-app only |

"On The Record" is new in Phase 2 and leads both the email and the in-app panel,
because it is the only group that is the record rather than the conversation about
the record.

## What a record event is

Four kinds, and no fifth:

- **`vote`** — a tracked person's roll-call vote newly loaded into the archive.
  *"Celeste Maloy voted no on H.R. 1234 — …"*
- **`position`** — a newly sourced formal non-roll-call act: sponsorship,
  co-sponsorship, an amicus brief, a committee vote, an on-record statement.
- **`action`** — a measure on a followed issue moved a stage: reported out of
  committee, passed a chamber, enacted, vetoed.
- **`mapping`** — a measure on a followed issue was added to the archive, or its
  record was corrected (a citation repaired, a title disambiguated, an issue
  mapping changed). Coverage expansion and correction are the same event from the
  reader's side: what the site holds is not what it held last week.

Every item is **one act, one citation, one link**. A row without a `source_url` is
dropped rather than sent — an emailed claim a reader cannot check is worse than
silence.

Wording comes from three fixed maps in `netlify/lib/digest-record-core.mjs`
(`VOTE_WORD`, `ACTION_WORD`, `STAGE_WORD`). The record says yea, nay, present or
not voting; so do they. There is no map from a formal act to an adjective anywhere
in the digest.

## What it will never send

- **No aggregate over people.** No "worst politicians this week", no counts by
  party, no ranking of anybody against anybody.
- **No score, no percentage, no grade.** The digest reports that the record moved.
  Whether that is good is not its call.
- **No party framing.** No group reads a party field.
- **Nothing from a lane that is not the record.** Support counts (momentum) and
  finance composition are not digest events, and Direction Match is neither read
  nor sent — a contradiction is something a reader finds on the person file with
  the receipt open, not something that arrives in an inbox as a verdict.

## Where the links land

Phase-1 addresses, resolved before send:

- Person-anchored acts (`vote`, `position`) → **`/p/<pid>`**, the person file.
- Measure-anchored acts (`action`, `mapping`) → **`/vote/<congress>/<chamber>/<roll>`**
  when a roll call for that measure is on file (one extra read resolves it).
- Otherwise → the citation URL itself.

Both `/p/*` and `/vote/*` are 200-rewrites in `netlify.toml`, so every link is a
real page and not a redirect to the front door.

## Opt-in, suppression, unsubscribe

- Email is **off by default**. `pdx-digest-cron` only considers rows with
  `email_enabled = true`.
- Cadence is the reader's (daily / weekly), enforced against `last_digest_at`, so
  nobody is mailed twice in a window.
- **An empty digest is never sent.** `counts.total === 0` → skipped.
- `last_digest_at` advances only after a successful send, so a delivery failure
  retries next run instead of silently eating a cycle.
- Every email carries a visible unsubscribe link plus RFC 2369 `List-Unsubscribe`
  and RFC 8058 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. The
  token is a stateless HMAC, so one-click works without a session.
- The record group is a topic toggle of its own (`topic_record`, default on) in
  both the in-app settings modal and the email.

## Environment — what sending actually requires

Set these on the Netlify site (Site configuration → Environment variables). Values
are secrets; nothing below is committed.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **yes** | Resend API key used to send. |
| `DIGEST_FROM_EMAIL` | **yes** | Verified From address, `Name <addr@domain>` or `addr@domain`. |
| `DIGEST_REPLY_TO` | no | Friendly Reply-To; improves deliverability. |
| `DIGEST_UNSUB_SECRET` | no | HMAC secret for unsubscribe tokens. Defaults to `RESEND_API_KEY`, so one-click unsubscribe works with no extra config. Set it explicitly if you rotate the API key and do not want live unsubscribe links to break. |

Behaviour without them: `pdx-digest-cron` logs
`email delivery not configured (set RESEND_API_KEY + DIGEST_FROM_EMAIL to enable)`,
returns `200 email-not-configured`, and advances nothing. Enabling the vars later
"just works" — no code change, no backfill, and no cycle was consumed while
unconfigured. The in-app digest is unaffected by all of this; it never needs an ESP.

The scheduled function runs at **13:00 UTC daily** (`schedule: "0 13 * * *"`).
Daily-cadence readers get every run; weekly readers get the first run after their
6.5-day window elapses.

## Verifying a send

1. Confirm the two required vars are set on the site.
2. Turn on the email digest for a signed-in account (Notification Settings →
   Email digest) with at least one saved person or issue.
3. Trigger the scheduled function once from the Netlify UI (Functions →
   `pdx-digest-cron` → *Run*), or wait for 13:00 UTC.
4. The log line `pdx-digest-cron done: sent=… skippedEmpty=… failed=…` reports the
   outcome. `skippedEmpty` incrementing is the healthy answer when nothing changed.

## Tests

`scripts/test-digest-events.mjs` — the fence: the four event kinds and their
wording, every emitted item carrying a citation, links resolving to `/p/<pid>` or
`/vote/<congress>/<chamber>/<roll>`, no aggregate / ranking / score / party field
in the group, empty-digest suppression and one-click unsubscribe intact, and
`topic_record` threading from the schema through prefs, `buildDigest`, the email
and the in-app panel.
