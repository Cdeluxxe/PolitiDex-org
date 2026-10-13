# PolitiDex Content Writing Standard

PolitiDex evaluates politicians as **individuals**, on their own record — not as
members of a party. Every Spotlight item, Promise description, issue position,
and summary must reflect that core ideology.

## The rule: write about the person, not the party

When describing what a politician did, ask:

> **"What did *this person* actually do, say, vote for, sponsor, or publicly support?"**

Never substitute what their party did for what the individual did.

### Do not group a politician with their party

Avoid partisan-grouping language when describing someone's actions, including:

- "her side opposed" / "his side voted for it"
- "her allies" / "his allies"
- "Republicans voted against it" / "Democrats supported it"
- "common in her party" / "like most in his party"
- "the party line" / "votes along party lines" / "party-line voting"
- "consistent with his party's base" / "the party's wing/faction"

These phrases judge a person by association rather than by their own conduct.

### Do not rank a person against a party cohort

When citing an achievement, measure it neutrally rather than against the
politician's own party — the team comparison adds nothing about the individual:

- ✅ "Passed 14 bills in the 2025 session — among the most of any legislator."
- ❌ "Passed 14 bills — more than any other Democrat."

### Do not turn a vote tally into a partisan label

A vote count is a fact; "on party lines" is editorializing. State the count.

- ✅ "It passed the House 58-14 and was signed by the governor."
- ❌ "It passed the House 58-14 on party lines."

### Focus on individual actions and words

State what the politician personally did or said, and source it:

- ✅ "Maloy publicly promoted $45M in rural-broadband funding for her district."
- ✅ "She has criticized the level of federal spending in the 2021 infrastructure law."
- ❌ "She championed funds from a law her side opposed."
- ❌ "Funds from a bill most Republicans voted against."

### When party context is genuinely relevant

Sometimes a party's collective position matters for understanding an
individual's stance — for example, when a politician **breaks** with the
prevailing position of their party, that contrast is part of *their* record.

Only include it when it is genuinely necessary to understand the individual,
and even then keep the focus on the person:

- ✅ "Henderson called the fraud claims 'absolute falsehoods' even as some in
  her party pressed for an audit." — the contrast illuminates *her* stand.
- ❌ "Her side wanted an audit, but she pushed back." — reduces her to a faction.

Prefer framing the individual's own position and let the divergence be implicit
("a law she has publicly criticized") rather than naming the party bloc.

## "Why it matters" sections

The "Why it matters" / `why` field should explain the significance of the
**individual's** record — consistency, candor, follow-through, rhetoric vs.
reality — not party conflict. Tie the takeaway back to the person.

Do not make a politician a proxy or "barometer" for a party, wing, or movement.
The significance is what *their* choices reveal, not what their faction's
fortunes are.

- ✅ "Whether voters reward Edwards's coalition-building approach is a test of
  her own appeal in a statewide race."
- ❌ "Her bid is a barometer for how much room remains in the GOP for moderates."

## Effect lines under vote rows

The one sentence under a vote row in an issue drawer (`_DOS_EFFECT` in
`consistency.js`) says what that act did to that issue, and nothing else.

- One sentence, 140 characters or fewer, ending on its stop. Anything longer
  prints nothing; a line is never clipped to fit.
- The act is the subject ("Raised…", "Would set…"), not the member, the party or
  the vote.
- An act that failed opens "Would have…". An act that carried but never became
  law, such as an adopted budget resolution or a House-only bill, opens "Would…".
  A public law reads as done.
- Written only from that pair's own stored source: its `did`, or, where it has
  none, its own mapping rationale and the measure's stored summary. Never a
  sibling issue's line, never a fact the source does not hold. A pair with no
  source that states an effect stays blank.
- No method words (precedent, mirror, primary, on-axis, coded, weighted…), no
  summed or combined figures, no partisan framing ("Republican-set levels"
  becomes "levels that trimmed some domestic programs").
- A stored `did` is never rewritten. A `did` too long for the row gets a
  separate short line written from it.

Budget and fiscal slice 1 added twenty such lines on H.Con.Res. 14, H.R. 1968
and H.R. 1 of the 119th Congress. `db/vr-fiscal-effect-lines.json` records each
line with the source it was written from, and
`scripts/test-fiscal-effect-lines.mjs` holds them to these rules.

Long-did overrides slice 3 added three lines on H.R. 8595 of the 119th, for
the election security, voter ID and voting access pairs. Each stored `did` runs
past one sentence or 140 characters, so the row printed nothing. Each line is
written from that `did` alone: the facts it names, and every figure, are the
`did`'s own, and the `did` itself is unchanged. `db/vr-long-did-effect-lines.json`
records each line beside the `did` it came from, and
`scripts/test-long-did-effect-lines.mjs` holds them to these rules. H.R. 1968's
two long-`did` pairs already carried slice 1's lines and were left as they were.

EPA waiver resolutions slice 4 added four lines on H.J.Res. 88 and H.J.Res. 89
of the 119th, the resolutions that revoked California's Advanced Clean Cars II
and Advanced Clean Trucks waivers, on the States vs. Federal Power and Cost of
Living pairs. Neither pair stores a `did`, so each line is written from its own
mapping rationale. Both resolutions are law, so the lines read as done, and like
the lines already on them they name no tally. A line on one issue never repeats
another issue's line for the same resolution: the climate, energy and red-tape
rows keep their own sentences. `db/vr-epa-waiver-effect-lines.json` records
each line beside the rationale it came from, and
`scripts/test-epa-waiver-effect-lines.mjs` holds them to these rules.

Blank rows slice 6 added fifteen lines on eight high-volume acts: the 2026
farm bill, the Gulf of America and MEGOBARI acts, two FY2026 defense amendments,
the GENIUS Act, the Rescissions Act and the Social Security Fairness Act. Each
pair stores no `did`, so each line is written from its own mapping rationale,
using the act's stored summary or title only where the rationale abbreviates a
name. Tense follows the stored outcome: enacted reads as done, a bill that passed
the House only or an agreed House amendment opens "Would", a failed amendment
opens "Would have". A rationale that is a forecast about an act (a deficit
projection) or that restates a sibling issue's fact is left blank rather than
turned into a line. `db/vr-blank-rows-slice6.json` records each line beside its
source and lists the pairs left blank and why, and
`scripts/test-blank-rows-slice6.mjs` holds them to these rules.

Blank rows slice 7 added nineteen lines on eight acts at about 110 member rows
each: the Israel Security Assistance Support Act (power of the purse), the
women's sports bill, the fracking, HALT Fentanyl, born-alive, health-premiums
and SUPPORT Act bills, and the TAKE IT DOWN Act. The rules are slice 6's, with
one refinement: a bill that passed the House only takes the "Would" or "Would
have" its existing lines already use, so one act never reads in two tenses. Ten
pairs on these acts stay blank because their stored text only states an aim or
a topic, only restates a sibling issue's fact, conflicts with the stored status,
or is mapped in a form the repository's migration projection cannot yet read.
`db/vr-blank-rows-slice7.json` records each line beside its source and every
skip with its reason, and `scripts/test-blank-rows-slice7.mjs` holds them to
these rules.

### Executive rows

An executive document's row (an order, a proclamation, a memorandum, a veto)
takes the same kind of sentence, stored in `_DOS_EXEC_EFFECT` and keyed by the
document and the issue. It is never shared with a vote on the same subject: the
two tables stay separate, and a line written for a veto cannot surface under a
member's vote on the vetoed bill.

- The document is the subject, in the past tense ("Imposed…", "Ended…",
  "Waived…"). The President is not named.
- Written only from that document-and-issue pair's own stored `plain`,
  `rationale` or `counts` and the document's stored title. Every figure the line
  names is a figure that pair stores; nothing is added from memory or from
  another issue on the same document.
- What the document did, not how it later fared. A struck-down or superseded
  order still reads as what it imposed; its standing is shown elsewhere.
- A document that touches an issue only in passing and carries no key in the
  family being written stays blank rather than being swept in.

Tariff orders slice 2 added thirty-seven such lines on the sixteen tariff and
trade documents, across the six tariff, trade and cost-of-living keys.
`db/vr-tariff-exec-effect-lines.json` records each line with the stored words
it was written from, and `scripts/test-tariff-exec-effect-lines.mjs` holds them
to these rules.

## Scope

This standard applies to all current and future content: Spotlight items
(`headline`, `facts`, `why`), `spotlightTheme` summaries, Promise descriptions,
and issue positions. The goal is to help users judge each politician on their
own record, through an individual lens rather than a partisan one.
