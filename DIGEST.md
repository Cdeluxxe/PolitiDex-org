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

**Six kinds, in four follow categories.** Phase 5 split two of Phase 2's four,
because each was carrying two materially different things under one label.

| Category | What it means to a reader | Kinds |
|---|---|---|
| **Formal acts** | What they did, in the formal record. | `vote`, `position`, `action` |
| **Stated positions** | What they said, sourced to where they said it. | `stated` |
| **Corrections** | Something the archive had wrong or incomplete. Now fixed. | `mapping` |
| **New coverage** | Something the archive did not hold before. Now it does. | `coverage` |

- **`vote`** — a tracked person's roll-call vote newly loaded into the archive.
  *"Celeste Maloy voted no on H.R. 1234 — …"*
- **`position`** — a newly sourced formal non-roll-call act: sponsorship,
  co-sponsorship, an amicus brief, a committee vote.
- **`stated`** — a tracked person entered an on-record **statement** on a measure.
  Split out of `position` in Phase 5: a sponsorship is an act and a statement is a
  word, and the difference between those two is the entire argument of this site.
  Announcing both as "New formal action" told a reader someone had *acted* when
  what they had done was *speak*. It is also the only stated word the server holds
  — the stance corpus is static client data, and nothing in the digest composes a
  position a person did not state.
- **`action`** — a measure on a followed issue moved a stage: reported out of
  committee, passed a chamber, enacted, vetoed.
- **`mapping`** — a measure the archive **already held** had its record corrected:
  a citation repaired, a title disambiguated, an issue mapping changed.
- **`coverage`** — a measure on a followed issue was **added**. Split from
  `mapping` in Phase 5. Phase 2's note claimed expansion and correction were "the
  same event from the reader's side"; that was wrong in a specific way. A
  correction is a claim about *our* past reliability; an expansion is the archive
  announcing that it grew. A reader is entitled to know which one they are being
  told, and to follow one without the other.

`EVENT_CATEGORY` in `netlify/lib/digest-record-core.mjs` is the **single**
definition of which kind belongs to which category. The email subheads, the in-app
group, the preference checkboxes and the query planner all read it, so a category
cannot mean one thing in a checkbox and another in a send.

Every item is **one act, one citation, one link**. A row without a `source_url` is
dropped rather than sent — an emailed claim a reader cannot check is worse than
silence.

### Why the four are never one "activity" switch

Both the email and the in-app panel print the record group **split into the four
categories, each under its own named subhead with a one-line definition** — never
as a single undifferentiated list. A flat list is the shape of an engagement feed:
it tells a reader that six things happened and makes them open each one to find out
which was a vote and which was us fixing a bill title. Split and named, the
structure itself answers "what kind of change is this?" before a link is clicked.

**No count is printed beside a category name.** "Formal acts (7)" invites the
comparison this product refuses — seven acts is not *more* than two in any sense a
reader should draw from a notification, and the number would be an artefact of our
coverage window rather than a fact about a person.

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

- Person-anchored acts (`vote`, `position`, `stated`) → **`/p/<pid>`**, the person file.
- Measure-anchored acts (`action`, `mapping`, `coverage`) →
  **`/vote/<congress>/<chamber>/<roll>`** when a roll call for that measure is on
  file (one extra read resolves it).
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
- Inside it, the four categories are followable individually — `follow_acts`,
  `follow_word`, `follow_corrections`, `follow_coverage`, all default on
  (`20260927000000_pdx_notification_follow_categories.sql`). A category switched
  off is not merely hidden: `buildRecordEvents` skips the **reads** for it, so a
  reader who follows only acts costs two queries instead of four and a category
  they declined leaves no trace of having been considered.
- The defaults are on in a deliberate direction. Every existing row belongs to
  someone who opted into record updates under the old single switch, so defaulting
  a category off would silently narrow consent already given. These columns can
  only ever *remove* kinds a reader explicitly declined.
- **There is no volume cap, no "highlights only" mode and no digest-worthiness
  threshold**, and there will not be one. Each would mean dropping real, sourced
  formal acts we said we would send, chosen by us for interestingness. The honest
  lever is *which kinds of change matter to you*; a cap is the dishonest one.

## Environment — what sending actually requires

Set these on the Netlify site (Site configuration → Environment variables). Values
are secrets; nothing below is committed.

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | **yes** | Resend API key used to send. |
| `DIGEST_FROM_EMAIL` | **yes** | Verified From address, `Name <addr@domain>` or `addr@domain`. |
| `DIGEST_REPLY_TO` | no | Friendly Reply-To; improves deliverability. |
| `DIGEST_UNSUB_SECRET` | no | HMAC secret for unsubscribe tokens. Defaults to `RESEND_API_KEY`, so one-click unsubscribe works with no extra config. Set it explicitly if you rotate the API key and do not want live unsubscribe links to break. |

Behaviour without them — a **blocked-on report**, not a quiet success.
`pdx-digest-cron` logs `BLOCKED — email delivery is not configured. Nothing was
sent and no watermark was advanced. Unset: <names>` and returns `200` with

```json
{ "blocked": "email-not-configured", "missingEnv": ["RESEND_API_KEY"], "delivered": false, "detail": "…" }
```

Three properties of that report are deliberate:

- It names the missing **variables**, never their values. Neither key is read,
  logged, echoed or interpolated anywhere in the function.
- It **never reports a send**. `sent`/`skippedEmpty`/`failed` are absent rather
  than returned as zeroes, because `sent: 0` in a 200 body reads as "there was
  nothing to send" — the opposite of the truth, which is that sending was never
  attempted.
- It runs **before any database read**, so a misconfigured deploy cannot look busy
  in the logs while advancing nothing.

Enabling the vars later "just works" — no code change, no backfill, and no cycle
was consumed while unconfigured. The in-app digest is unaffected by all of this; it
never needs an ESP.

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

`scripts/test-digest-events.mjs` — the fence: the six event kinds and their
wording, the four categories and the kind→category mapping, both the email and the
in-app panel printing the group split by category rather than as one list, every
emitted item carrying a citation, links resolving to `/p/<pid>` or
`/vote/<congress>/<chamber>/<roll>`, no aggregate / ranking / score / party field
in the group, per-category follow filtering narrowing the queries, the blocked-on
report naming variables and never a value or a send count, empty-digest suppression
and one-click unsubscribe intact, and `topic_record` + the four `follow_*` columns
threading from the schema through prefs, `buildDigest`, the email and the in-app
panel.
