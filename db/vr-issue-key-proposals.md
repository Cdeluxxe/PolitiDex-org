# Issue-key proposals — six subjects the Utah passes kept refusing

**Status: PROPOSAL. Nothing here is applied.** No key below exists in
`ISSUE_MAP` (`alignment-tool.js`), no seed maps to one, and no migration writes
one. This file is a decision to be made, not a change that was made. Adding any
of these keys is a separate pass that also has to answer the questions in
"What adding a key actually costs" at the bottom.

## Why these six and not others

Every Utah curator pass ran on a standing instruction to refuse rather than
invent: a bill with no home in the shipped vocabulary is written down as refused,
with prose, and left out. That worked — 118 keys, unchanged across four waves —
but the refusal ledgers are now long enough to show *pattern*. Most refusals are
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
