# PolitiDex Campaign-Finance Integrity Signal

PolitiDex's "promises, money, receipts" mission has three legs. This document
covers the **money** leg: the **Constituents-First signal**, a transparent
0–100 read of *where a politician's campaign money comes from* — small-dollar
constituents versus concentrated money and special interests.

It is the finance sibling of the Evidence Locker's
[`_strength()`](./EVIDENCE_STRENGTH.md): it measures a structural fact about the
funding, **not** whether we agree with the politician's politics, and every
score lists the plain-language reasons behind it so it never reads as a black
box. The score is computed live in `_financeSignal()` in `index.html` and is
exposed as `window._pdxFinanceSignal(id)`.

## The data

Each tracked politician has an itemized funding breakdown for one representative
cycle in `FTM_FUNDING` (in the Follow-the-Money block of `index.html`), sourced
from public filings:

- **Federal** offices → the **FEC** (`fec.gov/data`) and OpenSecrets.
- **State / local** offices (e.g. Governor Cox) → **Utah's state disclosure
  system** (`disclosures.utah.gov`).

The buckets mirror what the FEC itself reports, so every share shown in the UI
is one raw number divided by others on the same page — auditable end to end:

| Bucket | Meaning |
|---|---|
| `smallDollar` | Unitemized / small individual donors (grassroots, < $200) |
| `largeIndividual` | Large itemized individual contributions |
| `pac` | PAC & committee money (incl. corporate / industry PACs) |
| `selfFunded` | The candidate's own money / loans |
| `party` | Party-committee transfers (**neutral** — left out of the math) |
| `outside` | Independent / "dark-money" spending *for* them, graded as a **level** (high / moderate / low / none), never a fabricated exact dollar figure |

Figures are representative most-recent-cycle totals. The UI links every card to
the live FEC / OpenSecrets / Utah-disclosure page so a visitor can verify.

## The score

`_financeSignal()` starts at **50** and adjusts by the *shares* of receipts:

| Signal | Points |
|---|---|
| Small-dollar (grassroots) share of receipts | **+** up to +50 |
| Large-individual + PAC share (concentrated money) | **−** up to −30 |
| Self-funded share (access by personal wealth) | **−** up to −20 |
| Outside / "dark-money" exposure — high / moderate / low | **−** 12 / 6 / 2 |

The result is clamped to **3–97**. Party transfers are neutral.

Levels: **Constituents-First** at 65+, **Mixed Funding** at 45–64,
**Special-Interest Heavy** below 45.

## Worked examples (live figures)

- **Thomas Massie — 77, Constituents-First.** 70% small-dollar `(+35)`, 25%
  large-individual + PAC `(−8)`, no self-funding, no outside spending on file.
- **Caroline Gleich — 75, Constituents-First.** A 2024 Senate *challenger* who
  ran an overwhelmingly small-dollar campaign: 65% small-dollar `(+33)`, only 28%
  concentrated `(−8)`. Shows the signal rewards grassroots funding regardless of
  party or incumbency.
- **John Curtis — 56, Mixed Funding.** 45% small-dollar `(+23)`, 48%
  large-individual + PAC `(−14)`, low outside exposure `(−2)`.
- **Mike Lee — 46, Mixed Funding.** 38% small-dollar `(+19)`, 55%
  large-individual + PAC `(−17)`, moderate outside-group spending `(−6)`.
- **Blake Moore — 45, Mixed Funding.** 30% small-dollar `(+15)`, 61%
  large-individual + PAC `(−18)` reflecting leadership-PAC and finance money.
- **Dan Bilzerian — 35, Special-Interest Heavy.** 84% self-funded `(−17)`, only
  8% small-dollar `(+4)`, 6% concentrated `(−2)` — a wealth-driven, not
  constituent-driven, campaign.
- **Donald Trump — 32, Special-Interest Heavy.** 28% small-dollar `(+14)`, 67%
  large-individual + PAC `(−20)`, high super-PAC / outside spending `(−12)`.

## Freshness / provenance

Every finance record carries a review date. A module-level `FTM_AS_OF` sets the
default (currently **July 2026**), and any single filing can override it with a
per-record `asOf`. The date surfaces in three places so a reader always knows
how fresh the data is: the Follow the Money section header ("Data last reviewed
…"), and the footer of every signal card, next to a "Verify at source" link to
the underlying FEC / OpenSecrets / Utah-disclosure page.


## Where it shows up

1. **Follow the Money cards** — each card leads with the score badge, the
   small-dollar / large-indiv+PAC / self-funded composition, the reasons, and
   the dark-money exposure note.
2. **Profile → Money & Funding** — the same signal on an individual profile.
3. **The People's Mandate Alignment** — the **Constituents Over Special
   Interests** pillar *is* this signal, with the full reason breakdown shown
   inline, and the **Transparency** pillar is seeded from it. Officials without
   a filing fall back to the curated `FINANCE_INTEGRITY` seed map.

## Refreshing the data

`scripts/finance-integrity-refresh.mjs` documents and (when a `FEC_API_KEY`
environment variable is present) fetches current FEC totals into the
`FTM_FUNDING` shape for review. State/local figures are pulled manually from
`disclosures.utah.gov`. The script never writes to `index.html` automatically —
a human reviews the numbers and updates `FTM_FUNDING` so nothing unverified
ships. See the script header for details.

## Writing standard

Follows [`CONTENT_STYLE.md`](./CONTENT_STYLE.md): neutral and record-based. The
signal describes the funding structure, never a party. Contributions are legal
and do not imply corruption — the signal is about *who has financial access*,
which is exactly what public disclosure exists to reveal.
