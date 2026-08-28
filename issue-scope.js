/* ════════════════════════════════════════════════════════════════════════════
   PolitiDex — THE ISSUE KEY, EXPLAINED  ·  window.PDXIssueScope
   ════════════════════════════════════════════════════════════════════════════

   WHAT THIS IS. A reader on a profile is shown "🦺 Stronger Gun Safety Laws —
   Mostly advances · 7 advanced · 0 against" and has no way to find out what that
   title covers. Does it include suppressor deregulation? Does a vote on
   trafficking enforcement land here or under gun rights? What did "advanced"
   mean on this particular issue? Every one of those answers has been written
   down for years — in the source comments over ISSUE_MAP, where the scope of each
   key was argued out and then locked — and none of it was ever on a page. This
   module is that prose, transcribed, and one small control that opens it.

   WHAT IT IS NOT, AND THIS IS THE WHOLE DESIGN CONSTRAINT.

   1. IT IS NOT GENERATED COPY. Every sentence below is transcribed from the
      shipped comment block over the key it describes in alignment-tool.js, or is
      the key's own ISSUE_MAP `label` / `chip`. Nothing here was written to fill a
      slot. A key whose scope was never argued out in a comment has NO entry, and
      the reader is told exactly that — "No definition on file yet" — because a
      plausible-sounding scope note invented for a key the ingest classifier does
      not actually follow is worse than a blank: it is a rule the product does not
      obey, printed as though it did.

   2. IT IS NOT A SECOND DEFINITION. The prose is a copy of the argument, but the
      argument still lives at the mapping site, and where the two could disagree
      the mapping wins. That is why the entries are excerpts of scope and polarity
      only — what is IN, what is OUT and which way "advanced" points — and never
      restate a floor, a tier, a threshold or a count. If a scope narrows in
      alignment-tool.js, this file is wrong until it is edited, and the test suite
      pins the keys it covers so that edit cannot be silently skipped.

   3. IT MAKES NO CLAIM ABOUT A PERSON. Nothing in here reads a pid, a record, a
      vote or a stance. It answers "what does this issue key mean", which is the
      same answer for every politician on the site, and it is mounted next to the
      record rather than inside it for exactly that reason. No score, no
      percentage, no party frame, no lean — `lean` is in ISSUE_MAP and is
      deliberately not read here; it is branding-disambiguation data for
      word-action.js and printing it would turn a scope note into a party label.

   THE POLARITY LINE, AND WHY IT IS ONE SENTENCE RATHER THAN A TABLE. stance-helpers.js
   already settled this and its wall over _RD_NO_POLE states the rule: the ISSUE_MAP
   label is itself a curated directional proposition ("✂️ Cut Federal Red Tape",
   "🛢 Expand Domestic Energy Production"), so "5 advanced it" resolves against the
   heading the reader just read, and a second gloss table would be a second place
   for the polarity of an issue to be stated — and therefore a place for it to
   disagree. So the poled keys get the rule, once, pointing at the title above it;
   only the keys whose shipped comment spells out its own polarity carry that
   sentence too, in the comment's own words.

   AND THE KEYS WITH NO POLE AT ALL. The `*_balance` family and the thirteen
   subject keys in _RD_NO_POLE name a subject or a contested authority rather than
   a proposition, and the pattern engine is required to refuse them. Those keys say
   so here instead of borrowing a direction word — the same refusal, in the reader's
   words rather than the engine's.
   ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.PDXIssueScope) return; // idempotent

  // ── THE LOCKED TABLE ────────────────────────────────────────────────────────
  // One entry per key whose scope was argued out and locked in a comment over
  // ISSUE_MAP. Fields, all optional and all excerpts:
  //   inn   what the key covers
  //   out   what it deliberately does not, and which cousin key holds it instead
  //   pole  what a vote counted as "advanced" did, where the comment states it
  //   note  the one thing about the key a reader would otherwise get wrong
  // A key absent from this table is not an error and must not be filled in from
  // the label. See wall item 1.
  var SCOPE = {
    gov_regulation: {
      inn: 'How many federal rules there are, what they cost to comply with, and the process by which they are written and repealed: Congressional Review Act disapprovals, REINS-style congressional approval of major rules, regulatory budgets, caps and sunset clauses, cost-benefit and paperwork requirements, and how much deference agencies get in writing rules at all.',
      out: 'What a particular rule should SAY. A claim that one sector needs tighter or looser rules belongs to that sector’s key — antitrust and consumer finance, data and platform duties, digital assets. Also out: federal environmental review of projects (Faster Permits & Reviews), personnel classification, headcount and telework, and preemption fights over whether a STATE may set its own rule where a federal one exists — that is a question about who decides, not about how heavy the rulebook is.',
      pole: 'Advanced = fewer and cheaper federal rules, and more procedural hurdles before new ones take effect. Against = defends federal rulemaking capacity and the existing stock of rules.',
      note: 'Narrowed in August 2026. It used to absorb anything with the word “regulation” in it, and both of its directions meant two opposite things at once.'
    },
    sound_money: {
      inn: 'What the treasury may HOLD and what the state will ACCEPT as payment — precious-metals reserves, remitting tax in gold, legal-tender and money-management statutes.',
      out: 'Digital assets and a central bank digital currency (Cryptocurrency Rules & Digital Dollar) — filing a gold-remittance statute there would move a member’s Bitcoin percentage on a vote about bullion. Also out: auditing the Fed, income and severance tax rates, and the national debt.',
      pole: 'Every instrument on file widens the role of specie; none narrows it. Advanced = the vote widened it.'
    },
    tobacco_nicotine: {
      inn: 'The rules on selling tobacco and nicotine products — what may be sold (flavour bans, nicotine caps, market-authorization requirements), who may sell it (permits, permit fees, a product registry), and what happens when they sell it anyway (retailer and criminal penalties).',
      out: 'Government mandates on a person’s own medical care (Medical Freedom) — a flavour ban is a product-market rule, not a mandate on a patient. Also out: mental health and the opioid crisis, coverage and price, and cannabis.',
      pole: 'Every instrument on file tightens; none loosens. Advanced = the vote tightened the rules.'
    },
    dev_district_finance: {
      inn: 'The special-purpose district and its money: draw a boundary, seat a board, and let it capture sales-tax and property-tax increment — or levy its own, or issue bonds — to pay for a stadium, a convention centre, a resort zone or a project area.',
      out: 'Federal business deregulation, which is the opposite posture — a tax-increment district is a targeted public subsidy, not a rollback. Also out: what a household pays in property tax (a district levy is a new taxing body, and filing it there would read as “voted for property tax relief”), housing supply, and the built infrastructure itself rather than the district that finances it.',
      pole: 'Every instrument on file creates or widens the mechanism; none contracts it. Advanced = the vote created or widened a capture district.'
    },
    permitting_reform: {
      inn: 'How long a federal review of a PROJECT takes and who may challenge it: the scope of environmental review, statutory page and deadline limits on it, lead-agency and one-federal-decision consolidation, and the window in which a completed permit may be sued over.',
      out: 'Whether the project itself is a good idea (energy production, climate action, infrastructure); local zoning and housing approvals; occupational licensing and small-business paperwork; and the size of the federal rulebook generally (Cut Federal Red Tape).',
      pole: 'Advanced = narrower review and firm deadlines. Against = keeps the current scope of review and the ability to challenge a permit.',
      note: 'Split out of Cut Federal Red Tape in August 2026, and it has a genuine cross-party stance coalition — the tell that it is a real axis and not a synonym.'
    },
    america_first_fp: {
      inn: 'What the United States funds and commits to abroad: foreign aid levels and conditions, funding for a specific partner or conflict, assessed contributions to multilateral bodies, and the wind-down of an open-ended commitment.',
      out: 'Whether CONGRESS must authorise the use of force — that is a claim about who decides, and it is held by members on both sides of the aid question. Also out: whether to intervene at all (Diplomacy & Restraint), countering China and military posture toward adversaries, and aid to Israel specifically, which has carried its own key since July 2026.',
      pole: 'Advanced = cut, condition or wind down U.S. funding and commitments abroad. Against = keeps or increases them.',
      note: 'Narrowed in August 2026. The old chip bundled three unrelated claims, so two members who hold their positions fully each read as half-contradicting them.'
    },
    israel_support: {
      inn: 'U.S. support for Israel itself — security assistance, weapons transfers and co-development, sanctions on its adversaries, and floor attempts to cut, block or condition that support.',
      out: 'Domestic antisemitism measures: those are civil-rights and campus-speech questions and belong to the rights and free-speech keys.',
      pole: 'Advanced = the vote favoured continued U.S. backing for Israel. A share under this key means “this share of their judged votes favoured that backing” — not “this share agreed with a process”.',
      note: 'Carries no party lean on purpose: both the pro-Israel coalition and its critics are cross-party, so coding it D or R would be false signal.'
    },
    election_security: {
      inn: 'Safeguards on who votes and how ballots are handled: eligibility verification (documentary proof of citizenship, ID), voter-roll maintenance, ballot chain-of-custody and handling rules, post-election audits and audit conditions on election funding, and enforcement against fraud or non-citizen voting.',
      out: 'Campaign finance, redistricting, certification of results and Electoral Count Act questions — those are not administration of the ballot.',
      pole: 'The title states the pro-safeguard direction, so advanced = the vote favoured tighter verification and ballot-handling safeguards.',
      note: 'One of two independent facets. A record can be pro-safeguard and pro-access at once, oppose both, or split them — nothing in the scoring couples this key to Expand Voting Access.'
    },
    voting_access: {
      inn: 'How easy it is to register and to cast a ballot — registration ease, early voting, mail ballots and drop boxes.',
      pole: 'The title states the pro-access direction, so advanced = the vote backed easier registration and more ways to cast a ballot; against = backed narrowing them.',
      note: 'The other half of the election-administration pair, scored independently of Election Security & Ballot Safeguards.'
    },
    gun_rights: {
      inn: 'The scope of the individual right to acquire, keep and carry: concealed and constitutional carry, interstate reciprocity, carry on federal land, protections against registry, purchase-tracking and licensing burdens, and category bans on commonly-owned firearms or magazines.',
      out: 'Screening, removal and storage rules aimed at misuse, which are the other facet (Stronger Gun Safety Laws). Suppressor deregulation and ATF-rule repeal touch this key alone.',
      pole: 'The title states the pro-rights direction, so a share here means “this share of their judged votes widened, or refused to narrow, the right”.',
      note: 'Firearms policy is two facets, not one axis, and they are scored independently — a record can advance both, oppose both, or one of each. A percentage under one says nothing about the other.'
    },
    gun_safety: {
      inn: 'Screening, removal and storage rules aimed at misuse: background-check expansion, red-flag and extreme-risk orders, assault-style and high-capacity-magazine restrictions, safe-storage requirements, and trafficking and straw-purchase enforcement.',
      out: 'The scope of the right to acquire, keep and carry, which is the other facet (Protect Gun Rights). Trafficking-enforcement funding and safe-storage grants touch this key alone.',
      pole: 'The title states the pro-regulation direction, so a share here means “this share of their judged votes tightened rules aimed at misuse”.',
      note: 'The two gun facets are not mirror images. Where a package genuinely does both in opposite directions — the 2022 Bipartisan Safer Communities Act, which expanded background checks while writing a no-registry guarantee into law — it is mapped to both facets rather than forced into one verdict.'
    },
    gun_balance: {
      inn: 'A composite position: keep legal gun ownership but require universal background checks and red-flag laws.',
      note: 'Not a facet, and deliberately not scored as one. It asserts a position on both gun axes at once, which is the thing the two-facet split exists to avoid, so it is a legacy middle key for the members whose stated position really is that blend. Its cards count toward neither facet’s coverage.'
    },
    states_federal_power: {
      inn: 'The preemption question only: when federal and state authority reach the same subject, whose rule governs. State AI and privacy laws, the California vehicle waiver, a state bank charter, state insurance and hemp rules, western water, who runs the schools.',
      out: 'Whether a state may sue or enforce against the federal government (States Suing Washington) and who commands the Guard or may direct state officers (Who Commands the National Guard). Both were filed here and both are separate questions — a member can want the state’s rule to govern and still oppose giving state attorneys general a new cause of action. Also out: transferring federal LAND decisions to states and counties, which has its own key.',
      note: 'Narrowed in August 2026 to the preemption question alone — it previously answered three different questions at once. The title is worded directionally on purpose: an even-handed “draw a clear line” wording would read as agreement with a process that both preemption hawks and federalism absolutists endorse.'
    },
    civil_service_control: {
      inn: 'One mechanism: the legal classification of executive-branch employees — which positions sit in the competitive service, which are excepted from it, and what removal and adverse-action protections attach to them. An instrument that creates, restores, expands or restricts an at-will, excepted or policy-influencing personnel CATEGORY, or changes the civil-service protections attached to one.',
      out: 'Agency reorganisations with no classification core; headcount cuts and reductions in force, which are about how many people work there rather than what protections the ones who remain hold; hiring-process reform, including probationary periods; federal-sector collective bargaining and union time, which are labour relations under a different chapter; and “drain the swamp” rhetoric with no formal mechanism behind it.',
      note: 'The title is worded as the direction that expands presidential control — reclassifying career policy jobs out of the competitive service and its removal procedures — because the alternative wording would read as agreement with a process both sides of the question endorse.'
    },
    checks_balances: {
      inn: 'The general posture only — that Congress and the courts remain a real check on executive power, whoever is president.',
      out: 'Anything with a named mechanism, which belongs to one of the five mechanism keys: war powers, court orders on the executive, the power of the purse, congressional oversight, and states suing Washington.',
      note: 'It has no roll-call mappings and is expected to keep none: a general-posture claim cannot be settled by any single vote.'
    },
    war_powers: {
      inn: 'Whether a vote of Congress is required before U.S. forces are committed to hostilities — war-powers resolutions, force authorisations, and the privileged resolutions that force the question.',
      out: 'Whether to intervene at all (Diplomacy & Restraint). Members hold the two independently: several who want the U.S. out of a conflict on the merits also vote against the war-powers resolution, and several institutionalists want the vote taken and would then vote yes.'
    },
    judicial_check: {
      inn: 'The reach of a court’s order against the executive branch — nationwide and universal injunctions, contempt, equitable relief, judge-shopping rules.',
      out: 'The ethics and tenure of justices (Supreme Court Reform).'
    },
    power_of_purse: {
      inn: 'Whether the executive must spend what Congress appropriated — impoundment, pocket rescissions, apportionment, funding freezes, reprogramming and transfer authority.'
    },
    congress_oversight: {
      inn: 'Compelling answers FROM the executive branch — subpoenas, document requests, testimony, executive privilege, contempt, inspectors general and notification requirements.',
      out: 'Disclosure BY members — financial disclosure, stock trading and ethics rules — which is Transparency & Anti-Corruption.'
    },
    state_standing: {
      inn: 'Whether states may take the federal government to court over federal enforcement choices that hit them — standing, causes of action, injunctive relief, mandamus.',
      out: 'Whose rule governs where federal and state law meet (Whose Rule Governs) and who commands the Guard.'
    },
    guard_authority: {
      inn: 'Who commands the National Guard — title 32 and title 10 status, federalisation, governor consent, the Insurrection Act, and directing state officers.',
      out: 'Whose rule governs where federal and state law meet, and whether a state may sue the federal government.'
    },
    prop_tax: {
      inn: 'Property taxes as a tax-policy question — relief and caps.',
      note: 'Property taxes are intentionally keyed in two places. This one frames them as tax policy; Lower Property Taxes (Housing) frames the same taxes as a housing-affordability question. Both feed the same cost-of-living bundle, and the two are not accidental duplicates.'
    },
    property_tax: {
      inn: 'Property taxes as a housing-affordability question — caps that let families and seniors afford to stay in their homes.',
      note: 'The housing-side half of a deliberate pair; Property Tax Relief frames the same taxes as tax policy.'
    }
  };

  // The three data-center keys and the three tariff keys were argued out as
  // FAMILIES, in one comment each, and the point of both comments is the same: three
  // flat keys let a record be pro-growth yet cost-skeptical at once, because the
  // tension is the data and not an editorial caveat. So the family note is stored
  // once and stamped onto its members rather than retyped three times.
  var FAMILIES = [
    { keys: ['datacenter_growth', 'datacenter_water', 'datacenter_power'],
      note: 'One of three separate data-center keys. Three flat keys let a record be pro-growth yet water- or power-skeptical at the same time — the tension is the data, not an editorial caveat.' },
    { keys: ['tariffs_growth', 'tariffs_prices', 'tariffs_authority'],
      note: 'One of three separate tariff keys, so a record can be pro-tariff yet cost- or authority-skeptical at once — the tension is the data, not an editorial caveat.' }
  ];
  FAMILIES.forEach(function (f) {
    f.keys.forEach(function (k) {
      var e = SCOPE[k] || (SCOPE[k] = {});
      if (!e.note) e.note = f.note;
    });
  });
  // No polarity sentence is stamped onto the data-center or tariff keys, and that
  // is not an omission. Four of the six are in the record engine's no-pole table —
  // their titles state a guardrail position, which is a subject rather than a
  // proposition the engine will take a side on — so read() prints the refusal for
  // them, and a "pro-safeguard means advanced" line here would promise a direction
  // the record is required never to publish.
  // The five mechanism keys under Congress-as-a-check state their polarity once,
  // together, in the shipped comment: every one of them is a WHO-DECIDES claim, so a
  // member may hold one way on one and the other way on another without any
  // inconsistency — which is exactly the distinction the retired umbrella key could
  // not draw.
  var MECH_POLE = 'A who-decides claim: advanced = the position in the title, against = the executive’s side of the same question. A record may go one way here and the other way on a neighbouring mechanism without inconsistency.';
  // …and only onto the three of the six the engine will read a side on. The list is
  // written out rather than filtered through noPole() at load time on purpose: this
  // file may be parsed before stance-helpers.js publishes its table, and a
  // load-order-dependent stamp is a bug that only shows up in one script order.
  // war_powers, state_standing and guard_authority sit in that table and get the
  // refusal instead — read() enforces that precedence whatever is stamped here.
  ['judicial_check', 'power_of_purse', 'congress_oversight']
    .forEach(function (k) { if (SCOPE[k] && !SCOPE[k].pole) SCOPE[k].pole = MECH_POLE; });

  // ── THE THREE SENTENCES THAT ARE DOCTRINE, NOT PER-KEY COPY ────────────────
  // These are the rules stated over _RD_NO_POLE in stance-helpers.js, in the
  // reader's words. They are printed for whole CLASSES of key, so they are stated
  // once here — a per-key copy would be a second place for the same rule to live.
  var POLE_DEFAULT = 'The title above is the direction. A vote counted as “advanced” moved toward it; “against” moved away from it.';
  var POLE_BALANCE = 'This key has no for-or-against. It states a blend of two positions, so the record engine will not read a side on it and no pattern is published here — only the inventory of what is on file.';
  var POLE_NONE = 'This key names a subject or a contested authority rather than a proposition, so the record engine will not read a side on it. An arithmetic direction exists in the mappings, but printing it would assert a pole nobody curated.';
  var NO_DEF = 'No definition on file yet.';

  // The keys the pattern engine refuses a direction on, read from the engine itself
  // rather than copied. A list typed here would go stale the first time the engine's
  // list changed, and the failure mode is the worst one available: a scope note
  // promising a direction the record will never print.
  function noPole(key) {
    try {
      if (/_balance$/.test(String(key || ''))) return 'balance';
      var T = window._PDX_RD_NO_POLE;
      if (T && T[key]) return 'nopole';
    } catch (e) {}
    return '';
  }

  function esc(s) {
    if (typeof window._slEsc === 'function') return window._slEsc(String(s == null ? '' : s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function imap() { try { return window.ISSUE_MAP || null; } catch (e) { return null; } }

  // ── ONE KEY, READ ──────────────────────────────────────────────────────────
  // Returns null only when the key is not in the issue vocabulary at all, which is
  // a bug in the caller rather than a state to render. A key that IS in the
  // vocabulary always reads: label and chip are shipped curated copy, and `defined`
  // says whether the scope argument was ever written down.
  function read(key) {
    var k = String(key || '');
    if (!k) return null;
    var M = imap();
    var e = (M && M[k]) ? M[k] : null;
    if (!e) return null;
    var s = SCOPE[k] || null;
    var np = noPole(k);
    return {
      key: k,
      label: e.label || k,
      chip: e.chip || '',
      cat: e.cat || '',
      defined: !!s,
      inn: s && s.inn ? s.inn : '',
      out: s && s.out ? s.out : '',
      note: s && s.note ? s.note : '',
      pole: np === 'balance' ? POLE_BALANCE
        : np === 'nopole' ? POLE_NONE
        : (s && s.pole) ? s.pole : POLE_DEFAULT,
      poled: !np
    };
  }

  // ── THE CONTROL ────────────────────────────────────────────────────────────
  // A trailing ⓘ, and it is a SIBLING of whatever door the row carries rather than
  // a child of it. That is deliberate and it is the reason there is no
  // stopPropagation anywhere in this file: consistency.js's dossier gateway finds
  // its target with closest('[data-pdxst-dos]'), and from a control mounted outside
  // that element there is no such ancestor to find. Two destinations, two controls,
  // no interception.
  function controlHtml(key) {
    var r = read(key);
    if (!r) return '';
    ensureStyles();
    bind();
    return '<button type="button" class="pdxis-key" data-pdxis-key="' + esc(r.key) + '"' +
      ' aria-haspopup="dialog" aria-expanded="false"' +
      ' aria-label="' + esc('What “' + r.label + '” covers') + '"' +
      ' title="' + esc('What “' + r.label + '” covers') + '">' +
      '<span aria-hidden="true">ⓘ</span></button>';
  }

  function sectHtml(lb, body) {
    if (!body) return '';
    return '<div class="pdxis-sect"><div class="pdxis-sect-h">' + esc(lb) + '</div>' +
      '<p class="pdxis-sect-b">' + esc(body) + '</p></div>';
  }
  function cardHtml(r) {
    // ORDER IS THE ARGUMENT. The label and its position statement first, because
    // that is what the reader tapped and it is the only part that is guaranteed to
    // exist. Then what "advanced" means, because the row they came from printed a
    // count of exactly that. Then the boundary — in, then out — because "what this
    // is not" is only readable after "what this is".
    return '<div class="pdxis-hd">' +
        '<span class="pdxis-hd-lb">' + esc(r.label) + '</span>' +
        '<span class="pdxis-hd-tag">Issue key</span>' +
        '<button type="button" class="pdxis-x" data-pdxis-close="1" aria-label="Close">' +
          '<span aria-hidden="true">×</span></button>' +
      '</div>' +
      (r.chip ? '<p class="pdxis-chip">' + esc(r.chip) + '</p>' : '') +
      sectHtml('What a count here means', r.pole) +
      (r.defined
        ? sectHtml('What it covers', r.inn) + sectHtml('What it does not', r.out) + sectHtml('Worth knowing', r.note)
        // THE HONEST BLANK. See wall item 1: a key whose scope was never argued out
        // gets told on, not filled in.
        : '<div class="pdxis-sect"><div class="pdxis-sect-h">What it covers</div>' +
            '<p class="pdxis-sect-b pdxis-off">' + esc(NO_DEF) + '</p></div>') +
      '<p class="pdxis-wall">This is what the issue key means, and it is the same for ' +
        'every politician on the site — it says nothing about this one’s record.</p>';
  }

  var _card = null, _scrim = null, _trigger = null, _openKey = '';

  function ensureCard() {
    if (_card) return _card;
    _scrim = document.createElement('div');
    _scrim.className = 'pdxis-scrim';
    _scrim.hidden = true;
    _scrim.setAttribute('data-pdxis-close', '1');
    _card = document.createElement('div');
    _card.className = 'pdxis-card';
    _card.id = 'pdxis-card';
    _card.setAttribute('role', 'dialog');
    _card.setAttribute('aria-modal', 'true');
    _card.setAttribute('aria-label', 'What this issue key covers');
    _card.setAttribute('tabindex', '-1');
    _card.hidden = true;
    document.body.appendChild(_scrim);
    document.body.appendChild(_card);
    return _card;
  }

  function open(key, trigger) {
    var r = read(key);
    if (!r || !document.body) return false;
    ensureStyles();
    var c = ensureCard();
    if (_trigger && _trigger !== trigger) _trigger.setAttribute('aria-expanded', 'false');
    c.innerHTML = cardHtml(r);
    _scrim.hidden = false;
    c.hidden = false;
    _openKey = r.key;
    _trigger = trigger || null;
    if (_trigger) {
      _trigger.setAttribute('aria-expanded', 'true');
      _trigger.setAttribute('aria-controls', 'pdxis-card');
    }
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(function () { if (_card) _card.classList.add('is-open'); });
    } else { c.classList.add('is-open'); }
    try { c.focus({ preventScroll: true }); } catch (e) {}
    return true;
  }

  function close(restoreFocus) {
    if (!_card || _card.hidden) return;
    _card.classList.remove('is-open');
    _card.hidden = true;
    if (_scrim) _scrim.hidden = true;
    var t = _trigger;
    _trigger = null; _openKey = '';
    if (t) {
      t.setAttribute('aria-expanded', 'false');
      t.removeAttribute('aria-controls');
      if (restoreFocus !== false) { try { t.focus({ preventScroll: true }); } catch (e) {} }
    }
  }

  var _bound = false;
  function bind() {
    if (_bound || !document.addEventListener) return;
    _bound = true;
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var x = e.target.closest('[data-pdxis-close]');
      if (x) { e.preventDefault(); close(true); return; }
      var b = e.target.closest('[data-pdxis-key]');
      if (!b) {
        // A tap anywhere outside an open card closes it, and does NOT swallow the
        // tap — the reader who reaches past this card for the row behind it meant
        // to reach it.
        if (_card && !_card.hidden && !e.target.closest('.pdxis-card')) close(false);
        return;
      }
      var k = b.getAttribute('data-pdxis-key') || '';
      e.preventDefault();
      if (_openKey === k && _card && !_card.hidden) { close(true); return; }
      open(k, b);
    }, false);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _card && !_card.hidden) { close(true); }
    }, false);
  }

  // ── STYLES, INJECTED ───────────────────────────────────────────────────────
  // Same pattern as consistency.js's ensureStyles(): the module carries its own
  // skin so a surface can mount the control without a stylesheet edit, and a page
  // that never renders one pays nothing.
  var _styled = false;
  function ensureStyles() {
    if (_styled) return;
    if (!document.head || !document.createElement) return;
    if (document.getElementById('pdx-issue-scope-css')) { _styled = true; return; }
    var st = document.createElement('style');
    st.id = 'pdx-issue-scope-css';
    st.textContent = [
      /* The control. 2.75rem of thumb, 1rem of ink — the target is padding, so it
         never grows the row it sits in. */
      '.pdxis-key{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
        'min-width:2.75rem;min-height:2.75rem;margin:-0.5rem -0.35rem -0.5rem 0;padding:0;',
        'background:none;border:0;border-radius:999px;color:#7596c0;font-size:0.95rem;line-height:1;cursor:pointer;}',
      '.pdxis-key:hover,.pdxis-key:focus-visible{color:#9fdbff;background:rgba(127,180,255,0.12);}',
      '.pdxis-key[aria-expanded="true"]{color:#9fdbff;background:rgba(127,180,255,0.16);}',
      '.pdxis-scrim{position:fixed;inset:0;z-index:9998;background:rgba(4,8,18,0.66);}',
      '.pdxis-card{position:fixed;z-index:9999;left:50%;transform:translate(-50%,8px);',
        'bottom:max(1rem,env(safe-area-inset-bottom));width:min(30rem,calc(100vw - 1.5rem));',
        'max-height:min(78vh,34rem);overflow:auto;-webkit-overflow-scrolling:touch;',
        'background:linear-gradient(180deg,#101a2e,#0b1220);border:1px solid rgba(159,180,212,0.22);',
        'border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,0.5);padding:0.9rem 1rem 1rem;',
        'opacity:0;transition:opacity 0.16s ease,transform 0.16s ease;}',
      '.pdxis-card.is-open{opacity:1;transform:translate(-50%,0);}',
      '@media (min-width:40rem){.pdxis-card{bottom:auto;top:50%;transform:translate(-50%,calc(-50% + 8px));}',
        '.pdxis-card.is-open{transform:translate(-50%,-50%);}}',
      '.pdxis-hd{display:flex;align-items:flex-start;gap:0.5rem;}',
      '.pdxis-hd-lb{flex:1 1 auto;min-width:0;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;',
        'font-size:1.05rem;line-height:1.2;color:#eef4ff;overflow-wrap:break-word;}',
      '.pdxis-hd-tag{flex:0 0 auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;',
        'letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;border:1px solid rgba(159,180,212,0.28);',
        'border-radius:999px;padding:0.15rem 0.4rem;margin-top:0.15rem;}',
      '.pdxis-x{flex:0 0 auto;min-width:2.25rem;min-height:2.25rem;margin:-0.4rem -0.5rem 0 0;padding:0;',
        'background:none;border:0;color:#9fb4d4;font-size:1.25rem;line-height:1;cursor:pointer;}',
      '.pdxis-x:hover,.pdxis-x:focus-visible{color:#eef4ff;}',
      '.pdxis-chip{margin:0.4rem 0 0.2rem;font-size:0.84rem;line-height:1.5;color:#c9d8ee;}',
      '.pdxis-sect{margin-top:0.7rem;}',
      '.pdxis-sect-h{font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;',
        'letter-spacing:0.11em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;}',
      '.pdxis-sect-b{margin:0;font-size:0.78rem;line-height:1.55;color:#b9cae3;overflow-wrap:break-word;}',
      '.pdxis-off{color:#7596c0;font-style:italic;}',
      '.pdxis-wall{margin:0.85rem 0 0;padding-top:0.55rem;border-top:1px solid rgba(159,180,212,0.14);',
        'font-size:0.7rem;line-height:1.5;color:#7596c0;}'
    ].join('');
    document.head.appendChild(st);
    _styled = true;
  }

  // ── SELF TEST ──────────────────────────────────────────────────────────────
  // Cheap enough to run in a headless sandbox: every key in the locked table is a
  // real key in the issue vocabulary, and no entry promises a direction on a key
  // the record engine is required to refuse one on.
  function selfTest() {
    var bad = [];
    var M = imap();
    Object.keys(SCOPE).forEach(function (k) {
      if (!M || !M[k]) bad.push('not in ISSUE_MAP: ' + k);
      if (SCOPE[k].pole && noPole(k)) bad.push('pole stated on a no-pole key: ' + k);
      var r = read(k);
      if (r && noPole(k) && r.pole !== POLE_BALANCE && r.pole !== POLE_NONE) {
        bad.push('no-pole key published a direction: ' + k);
      }
    });
    return { ok: !bad.length, problems: bad, keys: Object.keys(SCOPE).length };
  }

  window.PDXIssueScope = {
    // `cardHtml` is published for the same reason pdx-learn.js publishes its markup
    // primitives: the copy in it is the deliverable, and a test that can only reach
    // it through a real popover is a test that does not check the copy.
    read: read, controlHtml: controlHtml, cardHtml: function (key) {
      var r = read(key);
      return r ? cardHtml(r) : '';
    }, open: open, close: close,
    SCOPE: SCOPE, NO_DEF: NO_DEF,
    POLE_DEFAULT: POLE_DEFAULT, POLE_BALANCE: POLE_BALANCE, POLE_NONE: POLE_NONE,
    selfTest: selfTest
  };

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  } catch (e) {}
})();
