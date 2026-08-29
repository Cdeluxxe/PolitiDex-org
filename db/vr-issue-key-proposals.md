# Issue-key proposals — six subjects the Utah passes kept refusing

**Status: DECIDED. Three of the six are applied; three are refused in writing.**
Vocab wave V1 (2026-08) re-derived each proposal against the refusal ledgers
rather than accepting the recommendation at the bottom of this file, and split
them 3–3:

| Proposal | Decision | Where it lives now |
| --- | --- | --- |
| `sound_money` | **APPLIED** | `ISSUE_MAP`, `db/issue-keys.json`, migration `20261010000000_vr_vocab_wave_v1` |
| `tobacco_nicotine` | **APPLIED** (vocabulary only — no rows yet) | `ISSUE_MAP`, `db/issue-keys.json`, curator ledgers |
| `dev_district_finance` | **APPLIED** | `ISSUE_MAP`, `db/issue-keys.json`, migration `20261010000000_vr_vocab_wave_v1` |
| `family_parental_rights` | **REFUSED** — recurrence | nowhere; the bills stay refused |
| `disability_rights` | **REFUSED** — recurrence and polarity | nowhere; the bills stay refused |
| `road_safety_nonmotorized` | **REFUSED** — recurrence and boundary | nowhere; the bills stay refused |

Each proposal below keeps its original text unedited and carries a **Decision**
block stating what happened and why. The three refusals are not deferrals of a
decision — they are the decision, and re-opening one needs new bills, not a new
argument. The key count went 118 → 121.

## Why these six and not others

Every Utah curator pass ran on a standing instruction to refuse rather than
invent: a bill with no home in the shipped vocabulary is written down as refused,
with prose, and left out. That worked — 118 keys, unchanged across four waves —
but the refusal ledgers are now long enough to show *pattern*. (Wave V1 has since
taken the count to 121; the sentence above records the state that produced this
file.) Most refusals are
one-off: a bill whose text picks no direction, a repeal-and-add hybrid, a local
revenue authorization. These six are different. Each one is a subject the
Legislature returns to across sessions, with bills whose direction is not
ambiguous — the refusal in each case says some version of *"the direction is
clear but has no home."* That is the signature of a vocabulary gap rather than a
mapping judgment, and it is the only thing that should ever open one.

Each proposal below gives the key name, one scope sentence, the polarity, and the
refused bills that would have had somewhere to go. The example bills are quoted
from `db/vr-utah-committee-bills-{2024GS,2025GS}.json`'s `_refused` arrays, which
is where the reasoning already lives.

---

### 1. `family_parental_rights`

> **Decision: REFUSED (vocab wave V1).** Fails the recurrence test: one usable
> bill, no usable sibling. 2024GS H.B. 198 is the only instrument in the corpus
> with clean polarity, and it is not a landmark. Every sibling this file names
> fails polarity by the ledger's own words — H.B. 129 "opens and closes the same
> records in one bill", H.B. 532 repeals bodies *and* creates duties, 2025GS
> H.B. 112's text "does not say which" direction it takes so `edu_parental` would
> have to import one, and 2023GS S.B. 100 is a title-versus-text conflict. A sweep
> of all five Utah ledgers for parental-rights, termination, custody, foster,
> juvenile-court, adoption, paternity and child-welfare language surfaced no
> further candidate. One bill is a coincidence; the key would ship describing it.
> Re-open when a second session produces a directional instrument.

**Scope.** Whether a court, an agency, or the state must defer to a parent's
authority over their own child — the standard of proof and the process before
parental rights are limited or terminated, and who bears the burden when a
government entity is the moving party.

**Polarity.** `support` = raise the bar the state must clear before displacing a
parent. `oppose` = keep or widen the state's latitude to intervene on the child's
behalf.

**Boundaries.** IN: termination and limitation of parental rights, juvenile-court
process and findings, custody standards as against the state, parental consent
where the state is the counterparty. OUT: schooling and curriculum, which is
`edu_parental` and already scoped that way in writing; household economics of
raising a child, which is `family_support`; adoption and vital records, which is
its own unresolved subject (see HB0129 below) and should NOT be folded in here.

**Refused bills this would cover.**
- 2024GS H.B. 198 — requires the juvenile court to give "serious consideration to
  the fundamental right of a parent" and heightened findings when a governmental
  entity moves to terminate. Refused verbatim as *"the direction is clear but has
  no home."*
- 2024GS H.B. 532 — partially; the criminal-and-juvenile-justice data duties in
  it are a separate provision and the bill would still be a hybrid.
- 2025GS H.B. 129 — adoption-record access with a counter-petition to keep records
  sealed. **Named as a near miss, not as coverage:** this bill opens and closes the
  same records, and adoption records are not parental-rights process. It stays
  refused even if this key ships.

---

### 2. `sound_money`

> **Decision: APPLIED (vocab wave V1).** Three instruments across two sessions,
> one direction. The scope sentence shipped as written; the polarity shipped as
> `yea_supports` = the vote widened the monetary role of specie; the OUT-of-scope
> argument against `crypto_cbdc` shipped verbatim into the boundary comment above
> the entry in `alignment-tool.js`, joined by `audit_spending`, `lower_taxes` and
> `national_debt`. The key carries **no `lean`**: the state-level sound-money
> coalition and the treasury-practice objection to it both run inside one party
> here. Label 🥇 Gold & Sound Money, category `gov`.
>
> Bills homed: **2024GS H.B. 348** (weight 80, floor, in the migration), **2025GS
> H.B. 67** (weight 40, floor, in the migration — a third instrument this file had
> not yet found), **2025GS H.B. 528** (weight 70, committee ledger only — no rows
> until the minutes bucket exists).

**Scope.** Whether the state treats gold and silver as money — accepting them for
state obligations, holding them as reserves, or exempting them from tax — as
distinct from digital assets.

**Polarity.** `support` = widen the monetary role of specie in state finance.
`oppose` = keep state money management in conventional instruments.

**Boundaries.** IN: legal-tender and specie-payment statutes, precious-metals
authority in state investment and reserve law, bullion tax treatment. OUT:
`crypto_cbdc`, which is scoped to digital assets and central bank digital
currency. This distinction is the whole reason the key is proposed rather than
the bills being mapped: filing a gold-remittance statute under `crypto_cbdc`
would score a member's crypto position off a mining severance tax.

**Refused bills this would cover.**
- 2025GS H.B. 528 — lets severance and income tax be paid in gold, with a reduced
  severance rate and a credit for operators who pay in gold.
- 2024GS H.B. 348 — exempts part of the budget reserve accounts from the State
  Money Management Act and authorizes the treasurer to invest reserves in
  precious metals.

Both refusals name `crypto_cbdc` explicitly and decline it.

---

### 3. `tobacco_nicotine`

> **Decision: APPLIED (vocab wave V1), vocabulary only.** Two instruments across
> two sessions, both tightening, each refusal cross-referencing the other. Scope,
> polarity and the OUT-of-scope argument against `medical_freedom` shipped as
> written, joined by `health_mental`, `healthcare`, `healthcare_costs` and
> `cannabis_reform`. No `lean`: retail-freedom and youth-protection arguments both
> run inside the majority party here. Label 🚭 Tobacco & Vaping Rules, category
> `health`.
>
> Bills homed in the curator ledgers: **2024GS S.B. 61** (weight 80) and **2025GS
> S.B. 186** (weight 80). Both are committee-only, so the key has **no database
> rows** and no chip with an act behind it until the committee wave lands its
> minutes roster. That is deliberate: attributing a committee vote without the
> roster means guessing who was in the room.

**Scope.** How tightly the state regulates the sale of tobacco and nicotine
products — flavor bans, product registries, nicotine limits, retailer permitting
and the penalties attached.

**Polarity.** `support` = tighter restriction on sale and product composition.
`oppose` = lighter restriction, or defence of retailer latitude.

**Boundaries.** IN: flavored-product bans, nicotine content limits, market-
authorization requirements, retailer registries, permit fees and sale penalties.
OUT: `health_mental` and `healthcare` generally; `medical_freedom`, which is
about mandates on a person's own medical decisions, not about what a retailer may
stock. A tobacco *tax* rate change is a revenue bill and belongs with the tax
keys unless the text is plainly about consumption.

**Refused bills this would cover.**
- 2025GS S.B. 186 — tobacco and e-cigarette enforcement: registry, flavored-
  product penalties, higher permit fees, amended criminal penalties.
- 2024GS S.B. 61 — bans flavored e-cigarette products, codifies a nicotine limit,
  requires federal market authorization, creates a registry.

The 2024 refusal already cross-references the 2025 one, which is the pattern this
proposal exists to name.

---

### 4. `disability_rights`

> **Decision: REFUSED (vocab wave V1).** Fails recurrence *and* polarity, exactly
> as the caveat below predicted. 2024GS H.B. 197, 2025GS H.B. 334 and 2025GS
> S.B. 199 each expand and subordinate the same autonomy in one text, so a key
> would house them without giving them a direction. That leaves 2024GS S.B. 82 as
> the only clean instrument, and it is refused for a second, independent reason:
> its entire highlighted provision is "clarifies the scope" of the public
> accommodation act, a one-line summary naming neither what is added nor what is
> removed. A key with one bill, and that bill unmappable on characterisation
> grounds, is a chip with nothing behind it.

**Scope.** The legal autonomy and access rights of people with disabilities —
guardianship and supported decision-making, and whether public-accommodation
duties reach a given setting.

**Polarity.** `support` = more autonomy retained by the individual and wider
accommodation duties. `oppose` = more authority to a guardian or a court, and
narrower accommodation duties.

**Boundaries.** IN: guardianship and conservatorship standards, supported
decision-making agreements, public-accommodation and accessibility obligations,
service-animal and access provisions. OUT: benefit eligibility and program
funding, which is `family_support` or `healthcare`; employment discrimination
generally, which is `econ_workers`.

**Caveat this key does not fix.** Three of the four bills below expand and
subordinate the same autonomy *in one text* — they enact supported
decision-making agreements and then condition their use on the guardian's
permission. A key gives them a home; it does not give them a direction. They
would very likely still be refused for picking neither side, and that is the
correct outcome. Only S.B. 82 has a clean direction.

**Refused bills this would cover.**
- 2024GS S.B. 82 — carves business website accessibility out of the state public
  accommodation act. Clean direction; refused only for lack of a key.
- 2025GS H.B. 334, 2025GS S.B. 199, 2024GS H.B. 197 — guardianship and supported
  decision-making. Home yes, direction no.

---

### 5. `road_safety_nonmotorized`

> **Decision: REFUSED (vocab wave V1).** Fails recurrence *and* the
> not-a-cousin-of-a-shipped-key test. The corpus does hold a second bicycle-safety
> measure — 2025GS H.B. 290, "Bicycle Lane Safety Amendments" — but it is **already
> mapped to `transit` at weight 50, primary**, and wave V1 ran under a standing
> rule against restuffing old maps. So the key would ship with the single 2024GS
> H.B. 449 example this file already calls the thinnest of the six. That `transit`
> absorbed a bike-lane bill without anyone objecting is also the empirical answer
> to the boundary question below: the line against the shipped chip is not clean.

**Scope.** Whether the state requires design and rules that protect people
outside a vehicle — pedestrians, cyclists, and other non-motorized road users.

**Polarity.** `support` = stronger standards and duties protecting non-motorized
users. `oppose` = fewer such requirements, or priority to vehicle throughput.

**Boundaries.** IN: crosswalk and pedestrian-facility standards, bicycle
provisions in traffic code, vulnerable-user protections, e-bike and scooter rules
where the claim is about safety. OUT: `transit`, which is about public
transportation service; `infrastructure`, which is about the built network and
its funding. Both were considered and rejected in the refusal prose — a crosswalk
standard is neither a bus route nor a capital program.

**Refused bills this would cover.**
- 2024GS H.B. 449 — extends the Pedestrian Safety and Facilities Act to
  bicyclists and adds safety measures for both.

**Thinnest of the six.** One bill across two sessions. A key with one example is a
key that may be describing a coincidence, and this one should probably wait for a
second session's evidence.

---

### 6. `dev_district_finance`

> **Decision: APPLIED (vocab wave V1).** Five instruments across two sessions,
> every one of them creating or widening the mechanism. Scope and polarity shipped
> as written; the OUT-of-scope argument against `property_tax`, `prop_tax`,
> `housing_build` and `econ_growth` shipped into the boundary comment, joined by
> `housing_support` and `infrastructure`. No `lean`: stadium and convention-centre
> finance split both parties between the deal's boosters and its fiscal critics.
> Label 🏟 Development Districts & Public Financing, category `econ`.
>
> Bills homed: **2025GS S.B. 336** (75), **S.B. 316** (70) and **S.B. 26** (60) on
> the floor ledger and in the migration; **2024GS H.B. 562** (80) in the committee
> ledger only. The hybrid worry at the end of this section was the right one and it
> cost one bill: **2025GS S.B. 337** (Beehive Development Agency) is **still
> refused**, because its district-finance provisions sit inside an institutional
> omnibus whose housing, economic-development and governance changes pull in
> different directions, and admitting a whole-instrument vote on a narrow
> non-primary link would put it behind a key the instrument is not about. The
> housing provisions in S.B. 26 and S.B. 316 are left unmapped for the same reason.

**Scope.** Whether the state creates or empowers a special development district
that can tax, bond, capture property-tax differential, or fund a stadium or
venue — the finance instrument, not the project.

**Polarity.** `support` = create or widen district taxing and bonding authority.
`oppose` = restrain it, or keep the authority with general-purpose government.

**Boundaries.** IN: development authorities and districts as political
subdivisions, public infrastructure districts, tax-differential capture, privilege
taxes on state land, district authority to own or help build a venue. OUT:
`property_tax` and `prop_tax`, which are about rates households pay;
`housing_build`, which is about supply; `econ_growth`, which would flatten a
governance-and-finance question into a sentiment about growth.

**Refused bills this would cover.**
- 2024GS H.B. 562 — creates the Fairpark Area Investment and Restoration District
  with new local taxes, a privilege tax on state land, impact fee prohibitions,
  enhanced property tax revenue, and authority to help build a qualified stadium.
- 2025GS S.B. 336 — Fairpark district modifications: taxing authority, land use
  authority, a public infrastructure district empowered to levy and bond.
- 2025GS S.B. 337 — creates the Beehive Development Agency with a revolving loan
  fund, public infrastructure district authority and property tax differential.
- 2025GS S.B. 316 — Military Installation Development Authority and development
  zone finance, same instrument family.

The strongest of the six by volume, and the one whose scope sentence is hardest to
write: several of these bills also repeal boards, rename offices, and adjust resort
community taxes in the same text, so a key would admit the district-finance
provision and leave the rest of the bill's hybrid character intact.

---

## What adding a key actually costs

Listed here because the six sentences above are the easy part and the reason this
file is a proposal rather than a diff.

1. **A key is a permanent public label**, not an internal bucket. It appears on
   alignment cards, in the compare surfaces, and in a member's issue list.
   `gov_regulation`'s scope comment in `alignment-tool.js` is the record of what
   happens when one key holds two opposite meanings: a member's own authored
   position read as contradicting his own vote.
2. **A new key needs a colour, a category and a lean**, and `lean` on several of
   these is genuinely contested — `sound_money` and `dev_district_finance` do not
   sort cleanly onto a party.
3. **It needs a stance side.** A key with a formal record and no cited stance
   cards produces the one-sided read the publication floor and the Word-vs-Action
   surfaces already have to handle. Six keys with votes and no words would add six
   half-rows per affected member.
4. **It is retroactive.** Every prior session's refusal ledger has to be re-read
   against the new key, or the key silently means "bills after the date we added
   it", which is the kind of quiet inconsistency the ledgers exist to prevent.
5. **Two of the six should probably not ship.** `road_safety_nonmotorized` has one
   example. `disability_rights` would give three of its four bills a home and
   still refuse them for direction, which is a real gain in honesty and a small
   gain in coverage.

Recommendation, for whoever decides: `tobacco_nicotine` and `sound_money` are the
cleanest — recurring, directional, and refused for exactly one stated reason each.
`family_parental_rights` and `dev_district_finance` are worth doing and need their
boundary prose argued, not just written. The other two should wait.

## What wave V1 actually paid

The recommendation above got two of its four calls right. Against the five costs:

1. **A permanent public label** — accepted for three keys, and the boundary prose
   is where the cost was paid: each new entry in `alignment-tool.js` carries a
   scope paragraph, the instruments that forced it, and a named refusal of every
   nearby chip, because `gov_regulation` is the record of what happens without one.
2. **Colour, category and lean** — categories are `gov`, `health` and `econ`; the
   colour follows the category. **All three carry no `lean`**, which is the honest
   answer this file predicted for two of them and turned out to be the right answer
   for the third as well.
3. **A stance side** — unpaid, and disclosed rather than hidden. All three ship
   with empty `stanceKeys`, so they have a formal record and no cited words. Three
   half-rows, not six.
4. **Retroactive re-reading** — paid. All five Utah ledgers were re-read against
   the three new keys, and only bills whose refusal note was already "clear
   direction, no key" were moved. Nine bills were remapped; no existing mapping
   was touched, restuffed or re-weighted.
5. **Two of the six should probably not ship** — three did not. The two this file
   named are both refused above, and `family_parental_rights` joined them on
   recurrence grounds the file had not tested.

Still proposed: **nothing.** All six rows are resolved. The next vocabulary wave
starts from the refusal ledgers again, not from this file.

---

## Federal wave F4 (2026-08): one vocabulary finding, not shipped

**Status: PROPOSED. Nothing applied. `keysAdded 0`.**

The federal census F4 ran to rank keys by how many senator rows they leave unread
turned up one vocabulary problem, and it is the opposite shape from everything in
this file above. The six proposals at the top are subjects the record kept voting
on that the vocabulary had no chip for. This one is a chip the vocabulary already
publishes that the record has stopped voting on.

### `america_first` — a bundling artefact, not a mapping gap

`america_first` sits near the top of the unread-row ranking: **97 unread senator
rows, all of them `incidental`**, and exactly one Senate-reachable act to promote —
H.R. 4 (the Rescissions Act of 2025) at weight 60, one title of an eight-key
package. On volume alone it was a tempting target for F4's promote, and it was
refused, because promoting one title of a rescissions package to argue a key whose
chip reads *"Put American interests first in trade, immigration and foreign
policy"* would be exactly the package-restuffing the wave's doctrine refuses.

But the refusal exposed something the ranking cannot say by itself. The key's
foreign-policy limb was **already superseded in August 2026** by `america_first_fp`,
whose scope note narrows to *what the United States funds and commits to abroad*
and explicitly OUTs military posture. What is left inside `america_first` is a
three-subject bundle — trade, immigration, foreign policy — each of which now has
a better-scoped home: `econ_trade` and `tariffs_authority` for the first,
`immigration_reform`, `border_security` and `deportations` for the second,
`america_first_fp` and `restraint` for the third.

So the 97 rows are not a mapping gap that a wave can close by finding the right
bill. They are an artefact of the bundling. There is no instrument that earns a
three-subject bundle at PRIMARY weight, and if one existed, mapping it would make
the key less readable rather than more.

**Why it is not shipped, against the V1 bar.** The bar asks for recurrence,
polarity, not-a-cousin, a readable chip, **and at least two instruments to map**.
This finding fails the last test in the direction that matters: there is nothing
to map it to. It also is not a *new* key at all — it is a retirement or a
re-scoping, which moves rows that are already published. That belongs in a
vocabulary pass with its own drift measurement, not inside a densification wave
whose entire acceptance test is byte-identity on everything it did not admit.

**What a decision would need.** Whoever takes this up needs three numbers this
file does not have: how many *live mappings* carry `america_first` (not how many
member rows read it), how many of those would land cleanly on one of the seven
successor keys named above, and how many would land nowhere. If the third number
is small the key can be retired by remapping. If it is large, the honest move is
to narrow the chip to trade-and-immigration and let `america_first_fp` keep the
rest — but that re-scoping has to be argued against the published chip, and every
affected dossier re-read, the way V1 paid cost 4 above.

Still proposed: **this one.** Nothing else changed.
