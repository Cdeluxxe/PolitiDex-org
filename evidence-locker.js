// ─────────────────────────────────────────────────────────────────────────────
// Evidence Locker
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 58995 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  (function () {
    'use strict';

    // ── Evidence-type vocabulary ───────────────────────────────────────────
    // The badge + chip metadata for every kind of evidence the locker can show.
    // Floor/committee video is listed first and styled gold so official recorded
    // words are the easiest thing to find and open.
    var EL_TYPES = {
      floor_video:     { label: 'Floor Video',     icon: '▶',  badge: 't-video',    video: true },
      committee_video: { label: 'Committee Video', icon: '🎥', badge: 't-video',    video: true },
      youtube:         { label: 'YouTube Video',   icon: '▶',  badge: 't-video',    video: true },
      x_post:          { label: 'X Post',          icon: '𝕏',  badge: 't-x' },
      facebook:        { label: 'Facebook Post',   icon: '📘', badge: 't-facebook' },
      bill:            { label: 'Bill Record',     icon: '📜', badge: 't-bill' },
      audio:           { label: 'Audio',           icon: '🎙', badge: 't-audio' },
      statement:       { label: 'Statement',       icon: '🗒', badge: 't-statement' }
    };
    // A camera-with-an-eye-in-the-lens brandmark — PolitiDex's "watch the record"
    // mark. Reused across the locker (section header, modal) so the same cue that
    // flags video proof on a profile also signs the library it lives in. Uses
    // currentColor so each placement controls its own tint/glow via CSS.
    var _EL_EYE_SVG =
      '<svg class="el-brandmark" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">' +
        '<rect x="2" y="7" width="20" height="13" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M8.2 7 L9.5 4.6 L14.5 4.6 L15.8 7 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="13.6" r="4.7" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M8.6 13.6 C10 11.9 14 11.9 15.4 13.6 C14 15.3 10 15.3 8.6 13.6 Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="13.6" r="1.55" fill="currentColor"/>' +
        '<circle cx="18.4" cy="9.6" r="0.95" fill="currentColor"/>' +
      '</svg>';
    // Stable display order for the type chips.
    var EL_TYPE_ORDER = ['floor_video', 'committee_video', 'youtube', 'x_post', 'facebook', 'bill', 'audio', 'statement'];

    var _state = { search: '', category: '', issue: '', pol: '', type: '', mandate: '', sort: 'date_desc', compare: null, relevant: false };
    var _items = null;       // flattened evidence items (built once full docs load)
    var _itemsByUid = {};    // uid → item, for the detail modal
    var _itemsByKey = {};    // stableKey → item, for re-linking saved evidence
    var _promsByPol = {};    // politician id → [{ title, detail, verdict, issueKey, issueLabel }]
    var _loading = false;
    var _loaded = false;
    var _relevantSet = null; // Set of politician IDs considered "relevant" to the current user (saved team + reps + ballot); built lazily by _getRelevantPids()

    // ── Phase 5 · Politician View state ─────────────────────────────────────
    // A footprint-first lens, kept independent of the All-Evidence `_state` above
    // so the two views never disturb each other's filters.
    var _polSel = [];           // selected politician ids (the By-Politician lens)
    var _polGroupBy = 'issue';  // 'issue' | 'type' | 'strength' | 'recency' | 'category'
    var _polSearch = '';        // within-results text filter for the lens
    var _polCoreSel = '';       // active Core National Issue filter within the lens ('' = none)
    var _polIssueSel = '';      // active specific-issue filter ('' = none, '__general' = untagged)
    var _polStancesOpen = false;// is the "Full Stances & Positions" panel expanded?
    var _polActive = false;     // is the By-Politician view currently showing?
    var _issueActive = false;   // is the By-Issue (Issue Gateway) view currently showing?
    var _issueQuery = '';       // search text filtering the issue gateway cards
    var _issueFocusKey = '';    // when set, the By-Issue view shows the stance-grouped focus for this issue (''=gateway grid)

    function _esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function _issueMap() {
      return (typeof ISSUE_MAP !== 'undefined' && ISSUE_MAP) ? ISSUE_MAP : (window.ISSUE_MAP || {});
    }

    // ── Best-effort issue + stance inference for untagged evidence ──────────
    // Most spotlight items carry an author-set `issueKey`. The ones that don't
    // used to drop straight into the broad "Other / General" bucket, which
    // starved the category headers, issue chips, Core National Issue filters
    // and the Full Stances list. The classifiers below are a FALLBACK ONLY —
    // they never override an author-set key or a documented position. There are
    // three layers, tried in order of precision, each more conservative than it
    // looks:
    //   1. `_inferIssueFromText` — scores the headline + facts against the SAME
    //      ISSUE_MAP keyword vocabulary the Alignment Tool already maintains, so
    //      there is no second keyword list to keep in sync. A confident match
    //      yields a specific issue (and its category for free).
    //   2. `_inferCategoryFromText` — when no specific issue is found, reads a
    //      clear BROAD-topic signal and files the item under the right Category
    //      header only (no fabricated issue label). High-value Utah topics live
    //      here: taxes/budget, education, healthcare, housing, public safety,
    //      immigration, environment/energy, elections/government, transportation.
    //   3. `_inferStanceFromText` — a deliberately conservative Support / Oppose /
    //      Mixed read used only as a last-resort stance fallback.
    // Nothing is ever fabricated: a weak, ambiguous match still reads "Other /
    // General", and an ambiguous category tie stays untagged on purpose.

    // ISSUE_MAP keywords too generic to tag on their own — a lone "reform" or
    // "affordable" should never produce a confident issue. They contribute no
    // score by themselves; only a specific term (a multi-word phrase, or a
    // distinctive single word like "fentanyl") earns a tag.
    var _EL_WEAK_KW = {
      'reform': 1, 'accountability': 1, 'affordable': 1, 'jobs': 1, 'growth': 1,
      'balance': 1, 'balanced': 1, 'transparency': 1, 'services': 1, 'funding': 1,
      'crisis': 1, 'opportunity': 1, 'responsible': 1, 'bipartisan': 1, 'moderate': 1,
      'state': 1, 'community': 1, 'investment': 1, 'cost': 1, 'safety': 1, 'security': 1,
      'benefits': 1, 'reform': 1, 'fair': 1, 'fairness': 1, 'modernize': 1, 'industry': 1
    };

    // Score `text` against every ISSUE_MAP issue; return the best match
    // { key, score, hits, conf } or null. A multi-word keyword phrase
    // ("background check") is a strong, specific signal (3 pts); a distinctive
    // single word ("fentanyl") is solid (2 pts); a generic word from the weak
    // list counts only toward tiebreak presence (0 pts). A confident tag needs
    // at least one specific signal — generic-only matches stay untagged.
    function _inferIssueFromText(text) {
      var imap = _issueMap();
      var low = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
      if (low.length < 6) return null;
      var best = null;
      for (var key in imap) {
        var def = imap[key];
        if (!def || !def.keywords) continue;
        var score = 0, hits = 0;
        for (var i = 0; i < def.keywords.length; i++) {
          var kw = String(def.keywords[i]).toLowerCase();
          if (!kw || low.indexOf(kw) === -1) continue;
          hits++;
          if (kw.indexOf(' ') !== -1) score += 3;       // specific multi-word phrase
          else if (_EL_WEAK_KW[kw]) score += 0;          // generic — needs corroboration
          else score += 2;                               // distinctive single word
        }
        if (!hits) continue;
        if (!best || score > best.score || (score === best.score && hits > best.hits)) {
          best = { key: key, score: score, hits: hits };
        }
      }
      if (!best || best.score < 2) return null;          // require a specific signal
      best.conf = best.score >= 3 ? 'matched' : 'weak';
      return best;
    }

    // ── Broad-category safety net for high-signal untagged evidence ────────
    // `_inferIssueFromText` only escapes the "Other / General" bucket when it can
    // pin an item to ONE specific ISSUE_MAP issue. Plenty of clearly-on-topic
    // Utah legislative headlines don't name a specific issue keyword but still
    // carry an unmistakable BROAD-topic signal — "per-pupil spending", "light
    // rail", "Great Salt Lake", "budget shortfall", "gun storage". This companion
    // reads those signals and returns just the broad Category, so the item is
    // filed under the right header (💰 Taxes & Economy, 🎓 Education, …) WITHOUT
    // inventing a specific issue label it can't actually support. That keeps it
    // honest: the card shows the real subject area and a subtle "may need review"
    // dot, never a fabricated stance/issue.
    //
    // Two rules keep it from over-tagging — it is meant to shrink "Other /
    // General", not to label everything:
    //   1. Every term below is a SPECIFIC, high-signal phrase (a multi-word
    //      phrase or a distinctive single word). Generic words a headline shares
    //      across topics ("funding", "reform", "safety") are deliberately absent,
    //      so a vague headline still stays untagged.
    //   2. If two different categories tie on signal count the result is
    //      AMBIGUOUS, so it returns null and the item stays in "Other / General"
    //      rather than guessing. Better untagged than wrongly categorized.
    //
    // The phrase sets mirror how the same topics already roll up in ISSUE_MAP
    // (e.g. "property tax" and "cost of living" sit under Housing, not Taxes),
    // so the two layers can't disagree about where a subject belongs. Sensitive,
    // already-well-covered topics (abortion, LGBTQ+, foreign policy) are left to
    // the issue layer on purpose and intentionally have no phrases here.
    // Each `re` is GLOBAL so a category's hit COUNT can break ties; read with
    // String.match (never .test) to avoid global-regex lastIndex state.
    var _EL_CATEGORY_SIGNALS = [
      { key: 'taxes_economy',   re: /\b(income|sales|gas|grocery|food|corporate|payroll|capital gains) tax(es)?\b|\btax (cut|cuts|hike|hikes|increase|increases|relief|rebate|rebates|credit|credits|bracket|brackets|rate|rates|burden)\b|\bstate budget\b|\bbudget (surplus|deficit|shortfall|cuts?)\b|\bbalanced budget\b|\bgeneral fund\b|\bappropriations?\b|\bfiscal (note|year|policy|responsibility)\b|\bminimum wage\b|\beconomic development\b|\bsmall business(es)?\b/g },
      { key: 'education',       re: /\bpublic (school|schools|education)\b|\bschool (funding|choice|voucher|vouchers|safety|district|board)\b|\bteacher (pay|salary|salaries|shortage|shortages)\b|\bper[- ]pupil\b|\bspecial education\b|\bcharter school(s)?\b|\bcurriculum\b|\bclassroom(s)?\b|\bhigher education\b|\btuition\b|\bstudent (loan|loans|debt)\b|\butah fits all\b|\bparental rights\b/g },
      { key: 'health_human',    re: /\bmedicaid\b|\bmedicare\b|\bobamacare\b|\baffordable care act\b|\bhealth insurance\b|\bhealth (care|coverage)\b|\bhealthcare\b|\bprescription (drug|drugs)\b|\bdrug prices?\b|\bmental health\b|\bbehavioral health\b|\bopioid(s)?\b|\bsuicide prevention\b|\brural hospital(s)?\b|\bnursing home(s)?\b|\bchild care\b|\bchildcare\b|\bpaid (family|medical) leave\b|\bpublic health\b|\bmedical freedom\b|\bvaccine mandate\b/g },
      { key: 'housing',         re: /\baffordable housing\b|\bhousing (supply|crisis|shortage|market|costs?|prices?|affordability|assistance|development)\b|\bzoning\b|\bhomeless(ness)?\b|\brent (control|relief|prices?|increases?)\b|\beviction(s)?\b|\bfirst[- ]time (home ?)?buyer(s)?\b|\bstarter home(s)?\b|\bproperty tax(es)?\b|\bcost of living\b|\bmortgage rate(s)?\b/g },
      { key: 'safety_justice',  re: /\blaw enforcement\b|\bpolice (officer|officers|funding|department|chief)\b|\bviolent crime\b|\bcriminal justice\b|\bsentencing\b|\bincarceration\b|\bsecond amendment\b|\bgun (rights|safety|control|violence|laws?|storage)\b|\bbackground check(s)?\b|\bred[- ]flag\b|\bpublic safety\b|\bdistrict attorney\b|\bconcealed carry\b|\bhate crime(s)?\b/g },
      { key: 'immigration',     re: /\bimmigration\b|\bborder (security|wall|crossing|crossings|patrol|crisis)\b|\billegal immigration\b|\bdeportation(s)?\b|\basylum\b|\bwork visa(s)?\b|\bgreen card(s)?\b|\bdaca\b|\bdreamer(s)?\b|\bsanctuary (city|cities|state)\b|\bpathway to citizenship\b|\bcartel(s)?\b/g },
      { key: 'enviro_land',     re: /\bpublic land(s)?\b|\bgreat salt lake\b|\blake powell\b|\bcolorado river\b|\bwater (conservation|rights?|storage|supply)\b|\bdrought\b|\bair quality\b|\bclean energy\b|\brenewable(s| energy)?\b|\bnuclear (energy|power|reactor)\b|\boil and gas\b|\bnatural gas\b|\b(coal mine|coal plant|mining|drilling)\b|\bwildfire(s)?\b|\bclimate (change|action)\b|\bemissions\b|\bnational (park|parks|monument|forest)\b|\bgrazing\b|\bendangered species\b/g },
      { key: 'gov_elections',   re: /\bvoter id\b|\belection (integrity|security|fraud|results?)\b|\bballot (initiative|measure|access|harvesting)\b|\bmail[- ]in (ballot|ballots|voting)\b|\bearly voting\b|\bredistrict\w*\b|\bgerrymander\w*\b|\bterm limits?\b|\bcampaign finance\b|\bopen primary\b|\branked[- ]choice\b|\bvoter (registration|rolls|turnout)\b|\bvoting rights\b/g },
      { key: 'transport_infra', re: /\bpublic transit\b|\blight rail\b|\bcommuter rail\b|\bbus rapid transit\b|\bmass transit\b|\bhighway(s)?\b|\bfreeway(s)?\b|\broad (funding|construction|project|projects|maintenance|repair)\b|\bbridge (repair|replacement|funding|project)\b|\binfrastructure\b|\bbroadband\b|\btransportation (funding|project|projects|plan|bill)\b|\binterstate \d|\btraffic congestion\b|\bairport (expansion|terminal)\b/g }
    ];

    // Read the single clearest broad Category from `text`, or null when there is
    // no strong signal OR two categories tie (ambiguous → stay "Other / General").
    // Returns { key, conf:'weak' } — 'weak' because a broad-category-only tag is
    // intentionally less precise than a specific issue, so it stays in the curator
    // triage pool and wears the subtle "may need a review" dot while still showing
    // the correct subject header. Never returns a fabricated issueKey.
    function _inferCategoryFromText(text) {
      var low = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
      if (low.length < 8) return null;
      var best = null, tie = false;
      for (var i = 0; i < _EL_CATEGORY_SIGNALS.length; i++) {
        var m = low.match(_EL_CATEGORY_SIGNALS[i].re);
        if (!m) continue;
        var hits = m.length;                       // distinct high-signal phrase hits
        if (!best || hits > best.hits) { best = { key: _EL_CATEGORY_SIGNALS[i].key, hits: hits }; tie = false; }
        else if (hits === best.hits && _EL_CATEGORY_SIGNALS[i].key !== best.key) { tie = true; }
      }
      if (!best || tie) return null;               // no clear winner → leave untagged
      return { key: best.key, conf: 'weak' };
    }

    // ── Headline / summary stance reader ──────────────────────────────────
    // Surface-level stance read from an evidence headline + facts. It feeds
    // `item.stanceGuess`, the single shared signal behind every inferred-stance
    // surface: the card stance chip, the By-Politician "Full Stances" rows, and
    // the By-Issue gateway cards. Deliberately CONSERVATIVE — it fires only on
    // clear, directional language and otherwise stays silent (returns null), so
    // those surfaces keep reading the documented position rather than dressing a
    // guess up as a sourced fact. Returns 'support' | 'oppose' | 'mixed' | null.
    //
    // The detection is tiered by signal strength, so high-signal evidence wins
    // and weak/vague wording is ignored rather than over-claimed:
    //   • SPONSORSHIP is the strongest signal. Sponsoring / chief-sponsoring /
    //     introducing a numbered bill IS supporting it, so it counts as clear
    //     support, and an official bill record (opts.isBill) reads as support
    //     unless the text itself shows opposition.
    //   • CLEAR directional verbs assert a stance: "supported", "backed",
    //     "voted for", "championed", "endorsed" (support) and "opposed", "voted
    //     against", "blocked", "vetoed", "fought against", "criticized",
    //     "condemned" (oppose).
    //   • WEAK / vague wording ("praised", "defended", "warned", "called for")
    //     is intentionally NOT in the clear tiers, so a single soft word can no
    //     longer manufacture a stance the way the old keyword soup did.
    //   • NEGATION is read in context: "did not support", "refused to back",
    //     "declined to vote for" flips a support phrase into opposition instead
    //     of misreading the bare keyword as support.
    //   • THIRD-PARTY opposition is discounted: when the politician clearly
    //     supports/sponsors something and the only opposition is attributed to
    //     OTHERS ("critics blasted the bill she sponsored"), that is not the
    //     politician's stance, so it stays single-sided support, not false mixed.
    //   • 'mixed' is reserved for genuinely two-sided records — a CLEAR support
    //     signal AND a CLEAR opposition signal from the same item.

    // Sponsorship — the clearest exercise of a stance. A bare sponsorship word
    // counts on its own; "introduced/authored/filed … <a bill>" needs the bill
    // noun nearby so a generic "introduced an idea" doesn't trip it.
    var _EL_SPONSOR_RE = /\b(chief[- ]?sponsor\w*|floor[- ]?sponsor\w*|lead[- ]?sponsor\w*|prime[- ]?sponsor\w*|co-?sponsor\w*|sponsor(?:s|ed|ing|ship)?)\b/;
    var _EL_INTRO_BILL_RE = /\b(introduc(?:e|ed|es|ing)|author(?:ed|s|ing)?|filed)\b[^.]{0,30}\b(h\.?\s?b\.?|s\.?\s?b\.?|h\.?\s?r\.?|s\.?\s?r\.?|bill|measure|resolution|amendment|legislation|act)\b/;
    // Clear support — unambiguous, first-person directional verbs. "carried/ran
    // the bill" are the Utah floor-sponsor idioms (presenting a bill on the floor
    // is supporting it), added alongside the generic support verbs.
    var _EL_SUPPORT_RE = /\b(support(?:s|ed|ing)?|backs?|backed|back the|champion(?:s|ed|ing)?|in favor of|votes? (?:for|yes|to pass|to advance|to approve|to fund)|voted (?:for|yes|to pass|to approve|to fund)|endorse[sd]?|advocat(?:e|es|ed|ing)|push(?:es|ed|ing)? for|fights? for|fought for|sign(?:s|ed)? into law|help(?:s|ed)? (?:pass|advance)|secured funding|carried the (?:bill|measure|legislation)|ran the (?:bill|measure|legislation))\b/;
    // Clear opposition — unambiguous directional verbs, incl. the explicitly
    // requested "criticized"/"fought against"/"blocked" signals, plus the common
    // procedural-kill votes ("voted to table", "voted down", "voted to defeat").
    var _EL_OPPOSE_RE = /\b(oppos(?:e|es|ed|ing)|votes? (?:no|against|to repeal|to block|to kill|to table|to defeat)|voted (?:no|against|down|to table|to defeat)|blocks?|blocked|rejects?|rejected|veto(?:es|ed)?|repeals?|repealed|fights? against|fought against|kill(?:s|ed)? the (?:bill|measure|legislation|amendment)|defeats?|defeated|strike[sd]? down|struck down|criticiz\w+|condemn(?:s|ed|ing)?|denounc\w+|blast(?:s|ed)?|slam(?:s|med)?|decr(?:y|ied|ies))\b/;
    // Negated support → opposition. The negator must sit right before the
    // support verb (≤2 words) so it reads "did not [really] support", not a
    // negation aimed at something else in the sentence.
    var _EL_NEG_SUPPORT_RE = /\b(?:did\s?(?:n['’]?t| not)|does\s?(?:n['’]?t| not)|do\s?(?:n['’]?t| not)|would\s?(?:n['’]?t| not)|won['’]?t|will not|refus(?:e|ed|es)\s+to|declin(?:e|ed|es)\s+to|decid(?:e|ed)\s+not\s+to|fail(?:s|ed)?\s+to)\s+(?:\w+\s+){0,2}?(?:support|back|endorse|sponsor|co-?sponsor|vote[sd]?\s+(?:for|yes)|champion|advocat\w*|sign\b)/;
    // Opposition attributed to a third party rather than the politician.
    var _EL_THIRDPARTY_OPP_RE = /\b(critics?|opponents?|rivals?|detractors?|democrats?|republicans?|the gop|activists?|advocates?|protest\w*|some (?:lawmakers|legislators|members|critics)|many (?:lawmakers|critics))\s+(?:\w+\s+){0,3}?(?:oppos\w+|reject\w+|blast\w+|slam\w+|condemn\w+|criticiz\w+|denounc\w+|fought against|voted against|block\w+)\b/;

    // opts.isBill — the item IS an official bill record (typeKey 'bill').
    function _inferStanceFromText(text, opts) {
      var low = ' ' + String(text || '').toLowerCase().replace(/\s+/g, ' ') + ' ';
      if (low.length < 6) return null;

      var sponsor = _EL_SPONSOR_RE.test(low) || _EL_INTRO_BILL_RE.test(low);
      var supportClear = sponsor || _EL_SUPPORT_RE.test(low);
      var opposeClear = _EL_OPPOSE_RE.test(low);

      // Negation flips a support phrase into opposition.
      if (_EL_NEG_SUPPORT_RE.test(low)) {
        supportClear = false;
        sponsor = false;
        opposeClear = true;
      }

      // Official bill record is sponsorship by definition → support, unless the
      // text itself carries clear opposition (e.g. a bill they voted against).
      if (opts && opts.isBill && !opposeClear) { sponsor = true; supportClear = true; }

      // Discount opposition that clearly belongs to OTHERS when the politician
      // themselves is on the supporting side — keeps it support, not false mixed.
      if (supportClear && opposeClear && _EL_THIRDPARTY_OPP_RE.test(low)) {
        opposeClear = false;
      }

      if (!supportClear && !opposeClear) return null;   // only weak/vague wording
      if (supportClear && opposeClear) return 'mixed';  // genuine two-sided record
      return supportClear ? 'support' : 'oppose';
    }

    // ── Politician group classifiers (office-title based) ───────────────────
    // The Evidence Locker began life scoped to current sitting Utah State
    // Legislators, which made the live "on the record" counts on the People's
    // Mandate reform cards look artificially thin for nationally-relevant
    // reforms. It now spans a broader roster: each politician is sorted into one
    // group by their `office` title (plus the lite-index `candidate` flag), and
    // `_roster(scope)` selects which groups to include. The original Utah-only
    // behaviour is preserved exactly under the 'utah' scope so every Utah-focused
    // surface — and the fast first wave of the locker load — is unchanged.

    // A current sitting Utah State Legislator. Excludes federal members, the
    // Governor, and anyone standing as a candidate (their office carries
    // "Candidate" or a U.S./Congressional title). Kept byte-for-byte so existing
    // callers that rely on this exact predicate behave identically.
    function _isUtahLeg(office) {
      var o = String(office || '');
      if (!o) return false;
      if (/candidate|former/i.test(o)) return false;
      if (/U\.S\.|Congress|Governor|President of the United/i.test(o)) return false;
      return /Utah/i.test(o) && /(State\s+(Representative|Senator)|Senate\s+President|(House|Senate)\s+(Majority|Minority)\s+Leader)/i.test(o);
    }

    // A sitting federal official — U.S. Senators, U.S. House members, and the
    // relevant executive-branch officials (President / Vice President / a U.S.
    // Cabinet secretary). Candidacies are excluded here so a "Candidate for U.S.
    // Senate" lands in the candidate group instead.
    function _isFederalOfficial(office) {
      var o = String(office || '');
      if (!o || /candidate|former/i.test(o)) return false;
      return /U\.S\.\s*(Senator|Rep(\.|resentative)?|House|Congress)/i.test(o) ||
             /\bMember of Congress\b|\bCongress(man|woman|member)\b/i.test(o) ||
             /President of the United|\bVice President\b/i.test(o) ||
             /\bU\.S\.\s*(Cabinet\s+)?Secretary\b|\bCabinet Secretary\b/i.test(o);
    }

    // A sitting statewide executive-branch official (Governor, Lt. Governor,
    // Attorney General, Treasurer, Auditor, Secretary of State). Federal "U.S.
    // …" titles and candidacies are excluded.
    function _isStateExec(office) {
      var o = String(office || '');
      if (!o || /candidate|former/i.test(o) || /U\.S\.|President of the United/i.test(o)) return false;
      return /\bGovernor\b|Lieutenant Governor|Attorney General|State Treasurer|State Auditor|Secretary of State/i.test(o);
    }

    // A 2026 candidate — anyone whose record is framed as a candidacy, via the
    // lite-index `candidate` flag or a "Candidate for …" office title. The whole
    // roster is the 2026 cycle, so these are 2026 candidates for federal,
    // statewide and legislative office.
    function _isCandidate(rec) {
      if (!rec) return false;
      if (rec.candidate === true) return true;
      return /candidate/i.test(String(rec.office || ''));
    }

    // The locker group a record belongs to, or '' for anyone outside scope.
    // Order matters: a sitting Utah legislator is classified first (so a Utah
    // seat is never reclassified), then candidacies, then federal and statewide-
    // executive offices.
    function _polGroup(rec) {
      if (!rec) return '';
      var office = rec.office || '';
      if (_isUtahLeg(office)) return 'utah_leg';
      if (_isCandidate(rec)) return 'candidate';
      if (_isFederalOfficial(office)) return 'federal';
      if (_isStateExec(office)) return 'state_exec';
      return '';
    }

    // Which groups each named scope includes. 'utah' is the original narrow
    // roster (used wherever only sitting Utah legislators are wanted, and as the
    // fast priority wave of the locker load); 'all' is the broadened roster that
    // powers the full library and the Mandate on-record counts.
    var EL_SCOPES = {
      utah: { utah_leg: 1 },
      all:  { utah_leg: 1, federal: 1, state_exec: 1, candidate: 1 }
    };

    // Roster of politician ids the locker should harvest evidence from, for a
    // given scope ('all' by default). Drawn from the live lite index (PROFILES)
    // and the bundled static roster (CMP_DATA), deduped by id, with sitting Utah
    // legislators listed FIRST so the priority load wave covers them before the
    // broader federal/candidate set.
    function _roster(scope) {
      var want = EL_SCOPES[scope] || EL_SCOPES.all;
      var seen = {}, utah = [], rest = [];
      function scan(src) {
        if (!src) return;
        Object.keys(src).forEach(function (id) {
          if (seen[id]) return;
          var rec = src[id];
          var g = _polGroup(rec);
          if (!g || !want[g]) return;
          seen[id] = 1;
          (g === 'utah_leg' ? utah : rest).push(id);
        });
      }
      scan(window.PROFILES);
      if (typeof CMP_DATA !== 'undefined') scan(CMP_DATA);
      return utah.concat(rest);
    }

    // ── "Relevant to Me" foundation ─────────────────────────────────────────
    // The set of politician ids the current user actually cares about. It folds
    // together three independent, optional sources, each read through the same
    // guards the rest of the app already uses:
    //   1. the politicians they've saved to My Team,
    //   2. the representatives for their confirmed district + statewide offices,
    //   3. the candidates on their current ballot (incumbents + challengers).
    // It is deliberately defensive: every source is wrapped so a missing helper
    // or absent data contributes nothing, and a visitor with no saved team and
    // no confirmed location yields an EMPTY Set rather than a guess. Callers
    // cache the result in _relevantSet; recomputing here always reflects the
    // latest team/location state.
    function _getRelevantPids() {
      var set = new Set();
      // 1) The user's team — Phase 3 reads this through the unified PDXTeamView
      //    adapter (tracked roster + committed ballot picks + the officials who
      //    represent the voter). The adapter prefers the v2 source and falls back
      //    to the legacy stores internally. If the adapter is entirely absent we
      //    drop back to the in-session _myPoliticians set exactly as before.
      var gotTeamView = false;
      try {
        var _tv = window.PDXTeamView;
        if (_tv && typeof _tv === 'object') {
          if (typeof _tv.roster === 'function') {
            (_tv.roster() || []).forEach(function (pid) { if (pid) { set.add(String(pid)); gotTeamView = true; } });
          }
          if (typeof _tv.bySeat === 'function') {
            var _bal = _tv.bySeat() || {};
            for (var _k in _bal) { if (_bal[_k]) { set.add(String(_bal[_k])); gotTeamView = true; } }
          }
          if (typeof _tv.representsMe === 'function') {
            (_tv.representsMe() || []).forEach(function (r) { if (r && r.pid) { set.add(String(r.pid)); gotTeamView = true; } });
          }
        }
      } catch (e) {}
      if (!gotTeamView) {
        try {
          if (typeof _myPoliticians !== 'undefined' && _myPoliticians && typeof _myPoliticians.forEach === 'function') {
            _myPoliticians.forEach(function (pid) { if (pid) set.add(pid); });
          }
        } catch (e) {}
      }
      // 2) District + statewide representatives (returns [] without a location).
      try {
        if (typeof _getPrimaryReps === 'function') {
          (_getPrimaryReps() || []).forEach(function (pid) { if (pid) set.add(pid); });
        }
      } catch (e) {}
      // 3) Votable candidates on the current ballot — but only when the area
      //    genuinely matches this voter, so a default fallback area never pulls
      //    in candidates the user can't actually vote for.
      try {
        var krd = (typeof window.keyRacesRelevantData === 'function') ? window.keyRacesRelevantData() : null;
        if (krd && krd.matched) {
          Object.keys(krd.byRace || {}).forEach(function (rk) {
            var r = krd.byRace[rk];
            ((r && r.pids) || []).forEach(function (pid) { if (pid) set.add(pid); });
          });
          Object.keys(krd.statewide || {}).forEach(function (rk) {
            (krd.statewide[rk] || []).forEach(function (pid) { if (pid) set.add(pid); });
          });
        }
      } catch (e) {}
      return set;
    }

    // ── Power / Position tie ───────────────────────────────────────────────
    // Surfaces when a piece of evidence isn't just a stated position, but lands
    // squarely inside the politician's *actual* power: a committee they sit on,
    // a bill they sponsored, or a statutory office whose authority covers the
    // topic. Returns { type, label, reason } (consumed by _powerBadgeHtml) or
    // null when no clear tie exists.
    //
    // Deliberately CONSERVATIVE — it would rather miss a real tie than slap a
    // misleading "power" badge on a generic statement. Every tie requires BOTH:
    //   1. a concrete power signal read from the politician's ROLE — their
    //      office text, `why`, or `bio`. Never `keyIssues`, which are only
    //      stated priorities, not powers held; and
    //   2. that the power's domain matches the evidence item's broad Category
    //      (item.category, e.g. 'taxes_economy', 'safety_justice').
    //
    // Current rules, in priority order (strongest signal wins; first match
    // returns, so the order below is the precedence order):
    //
    //   1. sponsorship — the clearest exercise of legislative power. Fires when
    //       ANY of:  (a) the item IS an official bill record (typeKey 'bill');
    //       (b) the receipt's own text names an explicit lead role — "chief /
    //       prime / floor / lead / house / senate sponsor"; or (c) softer
    //       sponsorship verbs ("sponsored / co-sponsored / introduced /
    //       authored") backed by a real numbered bill (HB/SB/HJR/HCR/…). The
    //       bill-number requirement on (c) stops a vague "introduced an idea"
    //       from tripping it. Read from the ITEM text, never the bio, so we only
    //       claim sponsorship the receipt itself documents.
    //   2. committee — the role text (office / why / bio) names a committee whose
    //       jurisdiction matches the item's Category (Revenue & Taxation,
    //       Appropriations, Judiciary, Education, Health & Human Services,
    //       Housing, Natural Resources, Transportation, Gov Operations, …). If a
    //       CHAIR / vice-chair word sits in the same clause as the committee
    //       name, the badge is upgraded to "… Chair" with a stronger reason,
    //       because controlling a committee's calendar is real agenda power.
    //   3. statutory — the OFFICE ACTUALLY HELD confers authority over the topic
    //       (Sheriff / police chief / D.A. → Public Safety; Treasurer / Auditor →
    //       Taxes & Economy; Superintendent / school board → Education; Secretary
    //       of State / Lt. Governor / county clerk → Gov & Elections; health
    //       commissioner → Healthcare; land commissioner → Environment). Read
    //       from the office field ONLY (item.office / rec.office), NOT the prose
    //       bio — so a bio that merely *mentions* a sheriff or treasurer can't
    //       claim that office for this politician.
    //   4. leadership — a chamber-wide agenda-setting role (Speaker, President,
    //       Majority/Minority Leader, Whip, Conference chair) AND a strong OR
    //       official item, so this broad power is only claimed on high-impact
    //       evidence (an official record or a Strong-graded receipt) rather than
    //       every routine statement.
    //
    // To extend later: add a COMMITTEE_POWERS / STATUTORY_POWERS entry (key =
    // Category), or a new branch — but keep each gated on a real role signal AND
    // a Category match, and keep statutory tied to the office actually held.
    function _powerTie(item, rec) {
      if (!item) return null;
      rec = rec || (window.PROFILES && window.PROFILES[item.id]) ||
            ((typeof CMP_DATA !== 'undefined') ? CMP_DATA[item.id] : null) || {};
      var cat = item.category || 'other';
      if (cat === 'other') return null; // no clear domain to tie a power to
      // Role text — committee + leadership signals are read from fields that
      // describe real position/authority: office held, the curator's `why`, and
      // the prose `bio`. We deliberately do NOT read keyIssues/stances: those are
      // stated priorities, not powers actually held.
      var role = [item.office, rec.office, rec.why, rec.bio]
        .filter(Boolean).join(' · ').toLowerCase();
      // Office actually HELD — statutory authority is read from this alone, so a
      // bio that merely mentions a sheriff/treasurer can't borrow that office.
      var officeText = [item.office, rec.office].filter(Boolean).join(' · ').toLowerCase();
      // Item text — the receipt's own headline + facts. Used only for the
      // sponsorship test, where the evidence itself names the bill/sponsor role.
      var text = ((item.headline || '') + ' ' + (item.facts || '')).toLowerCase();
      var catLabel = item.categoryLabel || 'this area';
      // An "official" item = a government record (bill / floor / committee video).
      var officialItem = item.typeKey === 'bill' || item.typeKey === 'floor_video' ||
        item.typeKey === 'committee_video';
      var strongItem = !!(item.strength && item.strength.level === 'strong');

      // 1 ── SPONSORSHIP (strongest) ────────────────────────────────────────
      // (a) the evidence is an official bill record; (b) an explicit lead-sponsor
      // role is named; or (c) a softer sponsorship verb + a real numbered bill.
      var leadSponsor = /\b(chief|prime|floor|lead(?:ing)?|house|senate)[- ]?sponsor(?:ed|ing)?\b/.test(text);
      var softSponsor = /\b(co-?sponsor(?:ed|ing)?|sponsored|introduc(?:e|ed|es|ing)|authored)\b/.test(text);
      var billNumber  = /\b(h\.?\s?b\.?|s\.?\s?b\.?|h\.?\s?r\.?|s\.?\s?r\.?|h\.?\s?j\.?\s?r\.?|s\.?\s?j\.?\s?r\.?|h\.?\s?c\.?\s?r\.?|s\.?\s?c\.?\s?r\.?|house bill|senate bill)\s?\.?\s?\d/.test(text);
      if (item.typeKey === 'bill' || leadSponsor || (softSponsor && billNumber)) {
        var spLabel = item.typeKey === 'bill' ? 'Bill Sponsor'
          : /\bchief[- ]?sponsor/.test(text) ? 'Chief Sponsor'
          : /\bprime[- ]?sponsor/.test(text) ? 'Prime Sponsor'
          : /\bfloor[- ]?sponsor/.test(text) ? 'Floor Sponsor'
          : 'Bill Sponsor';
        return { type: 'sponsorship', label: spLabel,
          reason: 'Sponsored legislation on ' + catLabel +
            ' — a direct use of their lawmaking power, not just a stated position.' };
      }

      // 2 ── COMMITTEE: role names a committee whose domain matches the Category.
      // Each regex carries enough context (usually the literal word "committee",
      // or an unmistakable panel name like "ways and means") that a stray topic
      // word can't match.
      var COMMITTEE_POWERS = {
        taxes_economy:   { re: /revenue (and|&) taxation|tax(ation)?[^.]{0,24}committee|\bappropriations\b|budget[- ]?(writ|chair|committee)|ways and means|business (and|&) labor|economic development committee/, label: 'Tax / Budget Committee' },
        education:       { re: /education committee|higher education|public education committee|education appropriations|school (choice|funding) committee/, label: 'Education Committee' },
        health_human:    { re: /health (and|&) human|health committee|human services committee|social services committee/, label: 'Health & Human Services Committee' },
        housing:         { re: /housing[^.]{0,28}committee|community (and|&) neighborhood[^.]{0,20}committee|land use[^.]{0,20}committee/, label: 'Housing / Land-Use Committee' },
        safety_justice:  { re: /judiciary committee|law enforcement (and|&) criminal justice|criminal justice committee|public safety committee/, label: 'Judiciary / Public-Safety Committee' },
        immigration:     { re: /immigration committee|immigration (and|&) (naturalization|citizenship)/, label: 'Immigration Committee' },
        enviro_land:     { re: /natural resources( and| &)?( agriculture)? committee|public lands committee|environment committee|energy (and|&) (utilities|natural resources)|agriculture committee/, label: 'Natural Resources / Energy Committee' },
        gov_elections:   { re: /government operations|elections committee|rules committee|state affairs committee/, label: 'Government & Elections Committee' },
        transport_infra: { re: /transportation committee|infrastructure committee|public utilities (and|&) (technology|energy)/, label: 'Transportation / Infrastructure Committee' }
      };
      var cp = COMMITTEE_POWERS[cat];
      if (cp && cp.re.test(role)) {
        // Chair upgrade: only when a chair word sits in the SAME clause as the
        // committee name, so we never read "chair" from an unrelated sentence.
        var chair = false;
        role.split(/[.·;]/).forEach(function (cl) {
          if (cp.re.test(cl) && /\b(chairs?|chair(man|woman|person)|chaired|chairing|co-?chairs?|vice[- ]?chairs?)\b/.test(cl)) chair = true;
        });
        return { type: 'committee',
          label: chair ? cp.label + ' Chair' : cp.label,
          reason: (chair ? 'Chairs' : 'Sits on') + ' a committee that directly shapes ' +
            catLabel + ' policy' + (chair ? ' and controls which bills advance.' : '.') };
      }

      // 3 ── STATUTORY office: the office HELD carries authority over the topic.
      // Read from officeText (office field only) — never the bio — so the badge
      // reflects the office this politician actually holds.
      var STATUTORY_POWERS = {
        safety_justice:  { re: /\bsheriff\b|police chief|chief of police|district attorney|county attorney|\bprosecutor\b|attorney general/, label: 'Law-Enforcement Office' },
        taxes_economy:   { re: /\btreasurer\b|\bauditor\b|\bcomptroller\b|\bassessor\b/, label: 'Fiscal Office' },
        education:       { re: /\bsuperintendent\b|school board|board of education/, label: 'Education Office' },
        gov_elections:   { re: /secretary of state|lieutenant governor|county clerk|chief election officer|elections? (director|administrator)/, label: 'Elections Authority' },
        health_human:    { re: /(commissioner|director) of (public )?health|state health officer|surgeon general|county health (director|officer)/, label: 'Public-Health Office' },
        enviro_land:     { re: /land commissioner|commissioner of public lands|state forester/, label: 'Public-Lands Office' }
      };
      var sp = STATUTORY_POWERS[cat];
      if (sp && sp.re.test(officeText)) {
        return { type: 'statutory', label: sp.label,
          reason: 'Holds an office with direct statutory authority over ' + catLabel + '.' };
      }

      // 4 ── LEADERSHIP: chamber-wide agenda-setting role + a strong/official item.
      var isLeader = /\bspeaker\b|senate president|president of the senate|president pro tempore|majority leader|minority leader|majority whip|minority whip|\bwhip\b|conference (chair|vice chair)|caucus (chair|leader)/.test(role);
      if (isLeader && (strongItem || officialItem)) {
        return { type: 'leadership', label: 'Chamber Leadership',
          reason: 'A chamber leader steering high-impact action on ' + catLabel +
            ' — sets which bills reach the floor.' };
      }
      return null;
    }
    // Exposed so other surfaces (the Alignment Tool's issue-by-issue breakdown)
    // can read the SAME positional-power signal the Evidence Locker derives, so a
    // committee / statutory / leadership / sponsor tie reads identically in both.
    try { window._powerTie = _powerTie; } catch (e) {}

    // Classify one spotlight/evidence entry into an EL_TYPES key.
    function _classify(it) {
      var mt = (it.media && it.media.type) || '';
      var st = it.sourceType || '';
      var hint = ((it.media && it.media.label) || '') + ' ' + ((it.source && it.source.label) || '');
      // YouTube — a social/video source. Detected BEFORE the official-video branch
      // (le.utah.gov floor/committee clips) so it is never mis-graded as an
      // official government record. Keyed on sourceType 'youtube' (every curated
      // YouTube item carries it) with a youtube.com/youtu.be URL fallback.
      var mediaUrl = (it.media && it.media.url) || '';
      if (st === 'youtube' || mt === 'youtube' || /youtu\.?be|youtube\.com/i.test(mediaUrl)) return 'youtube';
      if (mt === 'video' || st === 'official_floor_video' || st === 'official_committee_video') {
        if (st === 'official_committee_video' || /committee/i.test(hint)) return 'committee_video';
        return 'floor_video';
      }
      if (mt === 'x_post' || st === 'x_post') return 'x_post';
      if (mt === 'facebook' || st === 'facebook_post') return 'facebook';
      if (mt === 'audio' || st === 'audio') return 'audio';
      if (st === 'official_bill_record') return 'bill';
      return 'statement';
    }

    // ── High-quality direct-interview exception (YouTube) ──────────────────
    // Most YouTube items are a social/video source whose strength is capped at
    // "Moderate" — a clip, a short statement, an edited segment. But a direct,
    // on-the-record interview where the politician speaks at length in their own
    // words is often clearer and more useful than a short official clip, and it
    // should not be penalised for living on YouTube. This is an explicit, author-
    // set exception: an item is treated as a high-quality interview ONLY when its
    // author marks it with `interview` after confirming ALL of the following hold:
    //
    //   1. DIRECT — the politician personally speaks; it is not a clip *about*
    //      them, a montage, or a host summarising their views.
    //   2. ATTRIBUTABLE — the video is clearly and verifiably the named
    //      politician (own channel, or a reputable interviewer/outlet whose title
    //      names them; confirmed live via YouTube's oEmbed title + channel).
    //   3. SUBSTANTIVE — it is a real policy discussion (positions, reasoning,
    //      record), not a soundbite, ad, or ceremonial appearance.
    //   4. LONG-FORM — a town hall, podcast, news interview, debate, or extended
    //      sit-down, not a short cut-down clip. The optional `minutes` records the
    //      run length; when present it must clear the long-form bar (>= 8 min).
    //
    // The flag may be `interview: true`, or an object documenting the basis,
    // e.g. `interview: { minutes: 42, outlet: 'Iowa PBS — Iowa Press', format: 'news interview' }`.
    // A qualifying interview earns the same +2 base as an official record, so a
    // long-form interview with a direct link and a tracked issue reads "Strong";
    // a generic YouTube clip (no flag) still tops out at "Moderate".
    function _isQualityInterview(it) {
      if (!it || it.typeKey !== 'youtube') return false;
      var q = it.interview;
      if (!q) return false;
      // A flag can never promote a clip that is itself declared short.
      if (typeof q === 'object' && typeof q.minutes === 'number' && q.minutes < 8) return false;
      return true;
    }

    // ── Phase 4 · Evidence Strength ────────────────────────────────────────
    // A deliberately simple, transparent score. We don't judge the *content* of
    // a piece of evidence — only how verifiable it is: where it comes from,
    // whether there's a direct link, a pinpoint timestamp, and whether it's
    // tied to a tracked issue/action. Returns a level + the plain reasons behind
    // it, so the badge can explain itself rather than read as a verdict.
    //
    // One content-aware exception: a high-quality, direct politician interview on
    // YouTube (see _isQualityInterview) is lifted above the generic social/video
    // ceiling and graded like a first-person record, because a long-form interview
    // is often the clearest statement of a politician's own positions.
    function _strength(it) {
      var reasons = [], score = 0;
      var official = (it.typeKey === 'floor_video' || it.typeKey === 'committee_video' || it.typeKey === 'bill');
      var qualityInterview = _isQualityInterview(it);
      if (official) {
        score += 2;
        reasons.push('Official record (' + (it.typeLabel || 'government source') + ')');
      } else if (qualityInterview) {
        score += 2;
        var mins = (it.interview && typeof it.interview === 'object' && it.interview.minutes) ? it.interview.minutes : 0;
        reasons.push('In-depth direct interview' + (mins ? ' (~' + mins + ' min, in their own words)' : ' (long-form, in their own words)'));
      } else if (it.typeKey === 'audio' || it.typeKey === 'statement') {
        score += 1;
        reasons.push('On-the-record statement');
      } else if (it.typeKey === 'youtube') {
        reasons.push('Video posted to YouTube (social/video source)');
      } else {
        reasons.push('Social media post');
      }
      if (it.url) { score += 1; reasons.push('Direct source link'); }
      if (it.timestamp) { score += 1; reasons.push('Pinpoint timestamp'); }
      if (it.issueKey) { score += 1; reasons.push('Tied to a tracked issue'); }
      var level = score >= 4 ? 'strong' : score >= 2 ? 'moderate' : 'limited';
      var label = level === 'strong' ? 'Strong' : level === 'moderate' ? 'Moderate' : 'Limited';
      var bars = level === 'strong' ? '●●●' : level === 'moderate' ? '●●○' : '●○○';
      return { level: level, label: label, bars: bars, reasons: reasons };
    }

    // Stable identity for a piece of evidence — survives page reloads (the live
    // `uid` does not, since it's assigned by build order). Used as the key under
    // which an item is saved into a personal collection.
    function _stableKey(it) {
      var hk = String(it.headline || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
      return (it.id || '') + '|' + hk;
    }

    // Sortable rank from a free-text date like "2025", "May 2026", "Apr 2026".
    function _dateRank(d) {
      var s = String(d || ''); var ym = s.match(/(20\d{2})/);
      var year = ym ? parseInt(ym[1], 10) : 0;
      var mons = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
      var mm = s.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
      return year * 100 + (mm ? mons[mm[1]] : 0);
    }

    // Build the flat evidence list across the whole roster. Each member's own
    // `spotlight` array is authoritative; the static SPOTLIGHT_DATA map is folded
    // in as a fallback. Deduped by headline within a member.
    function _build() {
      var list = [], imap = _issueMap();
      var SD = window.SPOTLIGHT_DATA || {};
      var uid = 0;
      _itemsByUid = {};
      _itemsByKey = {};
      _promsByPol = {};
      _roster().forEach(function (id) {
        var rec = (window.PROFILES && window.PROFILES[id]) ||
                  ((typeof CMP_DATA !== 'undefined') ? CMP_DATA[id] : null) || {};
        var name = rec.name || id;
        var office = rec.office || '';
        var district = rec.district || rec.state || '';
        // Collect this member's tracked promises so the detail modal can show the
        // Promises they've made on the same issue as a given piece of evidence.
        if (Array.isArray(rec.promises)) {
          var pseen = {};
          rec.promises.forEach(function (pr) {
            if (!pr || !pr.title) return;
            var pk = String(pr.title).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 90);
            if (pseen[pk]) return; pseen[pk] = 1;
            var pik = pr.issueKey || '';
            (_promsByPol[id] || (_promsByPol[id] = [])).push({
              title: pr.title,
              detail: pr.detail || '',
              verdict: (pr.verdict === 'kept' || pr.verdict === 'broken') ? pr.verdict : 'pending',
              issueKey: pik,
              issueLabel: (pik && imap[pik] && imap[pik].label) ? imap[pik].label : ''
            });
          });
        }
        var sources = [];
        if (Array.isArray(rec.spotlight)) sources = sources.concat(rec.spotlight);
        if (Array.isArray(SD[id])) sources = sources.concat(SD[id]);
        var seen = {};
        sources.forEach(function (it) {
          if (!it || !it.headline) return;
          var hk = String(it.headline).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
          if (seen[hk]) return; seen[hk] = 1;
          var typeKey = _classify(it);
          var ik = it.issueKey || '';
          // Tagging provenance, for transparency in the UI + dev logging:
          //   'author'  — an author-set issueKey (authoritative, untouched)
          //   'matched' — confidently inferred from headline keywords
          //   'weak'    — loosely inferred (one specific term, OR a broad-category-
          //               only signal with no specific issue) — may need review
          //   'none'    — no signal found; stays in "Other / General"
          var tagConf = ik ? 'author' : 'none';
          // FALLBACK ONLY: when an item has no author-set issue, try to read one
          // from its headline + facts against the shared ISSUE_MAP vocabulary so
          // it can file under a real category/issue instead of "Other / General".
          var inferText = (it.headline || '') + ' . ' + (it.facts || '');
          if (!ik) {
            var guess = _inferIssueFromText(inferText);
            if (guess) { ik = guess.key; tagConf = guess.conf; }
          }
          // Surface stance read (Support / Oppose / Mixed). Used only as a
          // fallback in the Full Stances list when no documented position exists.
          // An official bill record (typeKey 'bill') is passed through so it is
          // weighted as sponsorship — the strongest stance signal.
          var stanceGuess = _inferStanceFromText(inferText, { isBill: typeKey === 'bill' }) || '';
          var issueLabel = (ik && imap[ik] && imap[ik].label) ? imap[ik].label : 'General';
          // Broad Category, derived from the issueKey (issueKey → cat → category).
          // This is the idempotent "backfill": every item is filed under exactly
          // one Category on every load, with no stored field to migrate.
          var catKey = (typeof window._pdxCategoryOf === 'function') ? window._pdxCategoryOf(ik) : 'other';
          // SECOND-CHANCE CATEGORY SAFETY NET: an item the issue layer couldn't
          // pin to a specific issue may still carry a clear BROAD-topic signal
          // (e.g. "light rail", "per-pupil spending", "Great Salt Lake"). Only when
          // it has no issueKey at all — a confident issue (even one that maps to
          // 'other', like foreign policy) is always respected. This pulls clearly-
          // categorizable evidence out of "Other / General" without fabricating a
          // specific issue label, so the card shows the right subject header and a
          // subtle "may need a review" dot instead of a generic bucket.
          if (!ik && catKey === 'other') {
            var catGuess = (typeof _inferCategoryFromText === 'function') ? _inferCategoryFromText(inferText) : null;
            if (catGuess) { catKey = catGuess.key; tagConf = catGuess.conf; }
          }
          var catDesc = (typeof window._pdxEvidenceCategory === 'function') ? window._pdxEvidenceCategory(catKey) : null;
          var url = (it.media && it.media.url) || (it.source && it.source.url) || '';
          var item = {
            uid: 'ev' + (uid++),
            id: id, name: name, office: office, district: district,
            headline: it.headline, facts: it.facts || '', date: it.date || '',
            dateRank: _dateRank(it.date), issueKey: ik, issueLabel: issueLabel,
            category: catKey,
            tagConf: tagConf, stanceGuess: stanceGuess,
            categoryLabel: catDesc ? catDesc.label : 'Other / General',
            categoryIcon: catDesc ? catDesc.icon : '🎯',
            typeKey: typeKey, typeLabel: (EL_TYPES[typeKey] || {}).label || '', url: url,
            timestamp: (it.media && it.media.timestamp) || '',
            // Author-set high-quality-interview marker (see _isQualityInterview).
            // Carried onto the flat item so strength grading and saved snapshots
            // both see it. May be `true` or an object documenting length/outlet.
            interview: it.interview || (it.media && it.media.interview) || null,
            sourceLabel: (it.source && it.source.label) || (it.media && it.media.label) || ''
          };
          item.strength = _strength(item);
          item.powerTie = _powerTie(item, rec);
          item.key = _stableKey(item);
          list.push(item);
          _itemsByUid[item.uid] = item;
          _itemsByKey[item.key] = item;
        });
      });
      list.sort(function (a, b) {
        if (b.dateRank !== a.dateRank) return b.dateRank - a.dateRank;
        return a.name.localeCompare(b.name);
      });
      // Dev-only tagging diagnostics — flip on with `window._PDX_DEBUG_TAGGING
      // = true` in the console, then re-open the locker. Shows how many items
      // are author-tagged vs auto-tagged vs still untagged, and lists the
      // headlines still landing in "Other / General" so they're easy to triage.
      // Dev triage workflow — when debug mode is on, refresh the floating triage
      // panel + console breakdown against the freshly built list so a curator can
      // quickly shrink the "Other / General" bucket. No-op (and zero overhead)
      // when the flag is off, so normal Locker behaviour is untouched.
      try {
        if (window._PDX_DEBUG_TAGGING && list.length) _renderTriage(list);
      } catch (e) {}
      return list;
    }

    // ── Dev / curator Triage Workflow ───────────────────────────────────────
    // Behind `window._PDX_DEBUG_TAGGING = true` only. Surfaces every untagged or
    // low-confidence piece of evidence in a scrollable, filterable floating panel
    // (plus a console breakdown) and lets a curator assign a proper broad Category
    // or specific ISSUE_MAP issue key on the spot. Assignments mutate the live
    // in-memory item so the Locker reflects them immediately, and each is logged
    // in a copy-pasteable shape for permanent curation. Nothing here runs — or
    // even builds its option list — unless the debug flag is set, so the Locker's
    // behaviour with the flag off is completely unchanged. Reuses the shared
    // classification helpers (_issueMap, _strength) and the published category
    // vocabulary (_pdxEvidenceCategories / _pdxCategoryOf / _pdxEvidenceCategory)
    // so there is no duplicate data to maintain.
    var _triageState = { cat: 'other', conf: 'all', q: '', sort: 'recent' };
    var _triageOptsHtml = null;   // memoized assign <option> list (built from ISSUE_MAP)
    var _triageSrc = null;        // the working item list the panel is rendering
    window._pdxTriageSuggestions = window._pdxTriageSuggestions || [];

    // The triage pool: anything a curator might want to fix — items with no
    // tracked issue ('none'), loosely-inferred items ('weak'), or anything still
    // sitting in the broad "Other / General" bucket.
    function _triagePool(src) {
      return (src || []).filter(function (it) {
        return it.tagConf === 'none' || it.tagConf === 'weak' || it.category === 'other';
      });
    }

    // Per-politician evidence counts across the whole library, for the "evidence
    // count" sort (more-documented politicians first).
    function _triagePolCounts(src) {
      var c = {};
      (src || []).forEach(function (it) { c[it.id] = (c[it.id] || 0) + 1; });
      return c;
    }

    // Build the assign <select> options ONCE: a placeholder, then one optgroup per
    // broad Category (canonical order) offering a "file under category only" choice
    // plus every specific ISSUE_MAP issue that rolls up to it. Reused verbatim for
    // every row. value = "iss:<issueKey>" | "cat:<categoryKey>".
    function _triageOptions() {
      if (_triageOptsHtml != null) return _triageOptsHtml;
      var imap = _issueMap();
      var cats = (typeof window._pdxEvidenceCategories === 'function') ? window._pdxEvidenceCategories() : [];
      var byCat = {};
      Object.keys(imap).forEach(function (k) {
        var ck = (typeof window._pdxCategoryOf === 'function') ? window._pdxCategoryOf(k) : 'other';
        (byCat[ck] || (byCat[ck] = [])).push({ k: k, label: (imap[k] && imap[k].label) || k });
      });
      var html = '<option value="">— assign category / issue —</option>';
      cats.forEach(function (c) {
        var opts = (byCat[c.key] || []).slice().sort(function (a, b) { return a.label.localeCompare(b.label); });
        html += '<optgroup label="' + _esc((c.icon ? c.icon + ' ' : '') + c.label) + '">';
        html += '<option value="cat:' + _esc(c.key) + '">▸ File under ' + _esc(c.label) + ' (no specific issue)</option>';
        opts.forEach(function (o) {
          html += '<option value="iss:' + _esc(o.k) + '">· ' + _esc(o.label) + '</option>';
        });
        html += '</optgroup>';
      });
      _triageOptsHtml = html;
      return html;
    }

    // Assign a Category/issue to one item from the triage panel. Mutates the live
    // in-memory item (so the Locker reflects it at once), re-grades strength, logs
    // a copy-pasteable suggestion, and refreshes both the Locker and the panel.
    window._pdxTriageAssign = function (uid, value) {
      var it = _itemsByUid[uid];
      if (!it || !value) return;
      var imap = _issueMap();
      if (value.indexOf('iss:') === 0) {
        var k = value.slice(4);
        it.issueKey = k;
        it.issueLabel = (imap[k] && imap[k].label) ? imap[k].label : 'General';
        it.category = (typeof window._pdxCategoryOf === 'function') ? window._pdxCategoryOf(k) : 'other';
        it.tagConf = 'author';   // a hand-curated tag is authoritative
      } else if (value.indexOf('cat:') === 0) {
        it.issueKey = '';
        it.issueLabel = 'General';
        it.category = value.slice(4);
        it.tagConf = 'author';
      } else { return; }
      var d = (typeof window._pdxEvidenceCategory === 'function') ? window._pdxEvidenceCategory(it.category) : null;
      it.categoryLabel = d ? d.label : 'Other / General';
      it.categoryIcon = d ? d.icon : '🎯';
      it.strength = _strength(it);
      // Copy-pasteable curation record — the shape a curator pastes back into the
      // politician's spotlight entry to make the tag permanent.
      var sugg = { politician: it.id, headline: it.headline, issueKey: it.issueKey || null, category: it.category };
      window._pdxTriageSuggestions.push(sugg);
      console.log('[EvidenceLocker] tag →', it.name + ':', JSON.stringify(sugg));
      // Reflect the change everywhere the item appears.
      try { _populateFilters(); } catch (e) {}
      try { _renderDiscovery(); } catch (e) {}
      try { _render(); } catch (e) {}
      try { if (_polActive) _renderPolView(); } catch (e) {}
      _renderTriage(_items);
    };

    // Clipboard helpers used by the panel's "Copy" buttons. Write to the clipboard
    // when available and always echo to the console as a fallback.
    window._pdxTriageCopy = function (text) {
      var s = String(text == null ? '' : text);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s);
      } catch (e) {}
      console.log('[EvidenceLocker] copied:', s);
    };
    window._pdxTriageCopyItem = function (uid) {
      var it = _itemsByUid[uid];
      if (!it) return;
      window._pdxTriageCopy(JSON.stringify({ politician: it.id, headline: it.headline, issueKey: it.issueKey || null, category: it.category }));
    };
    window._pdxTriageCopyAll = function () {
      if (!window._pdxTriageSuggestions.length) { console.log('[EvidenceLocker] no triage suggestions yet'); return; }
      window._pdxTriageCopy(JSON.stringify(window._pdxTriageSuggestions, null, 2));
    };

    // Update one triage filter and refresh just the list body, so typing in the
    // search box keeps focus and the summary/controls don't flicker.
    window._pdxTriageSet = function (field, value) {
      _triageState[field] = value;
      _renderTriageBody();
    };
    window._pdxTriageClose = function () {
      var p = document.getElementById('el-triage-panel');
      if (p) p.style.display = 'none';
    };
    // Manual (re)open from the console: `window._pdxTriage()`.
    window._pdxTriage = function () {
      window._PDX_DEBUG_TAGGING = true;
      _renderTriage(_items);
      var p = document.getElementById('el-triage-panel');
      if (p) p.style.display = '';
    };

    function _triageEnsureStyle() {
      if (document.getElementById('el-triage-style')) return;
      var s = document.createElement('style');
      s.id = 'el-triage-style';
      s.textContent =
        '#el-triage-panel{position:fixed;top:0;right:0;width:430px;max-width:96vw;height:100vh;z-index:99999;' +
          'display:flex;flex-direction:column;background:#0d1526;color:#e8eefc;border-left:1px solid rgba(255,255,255,.12);' +
          'box-shadow:-8px 0 32px rgba(0,0,0,.5);font:13px/1.45 ui-sans-serif,system-ui,-apple-system,sans-serif;}' +
        '#el-triage-panel *{box-sizing:border-box;}' +
        '.el-tg-hd{padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.1);background:#101a30;}' +
        '.el-tg-hd-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
        '.el-tg-title{font-weight:700;font-size:14px;}' +
        '.el-tg-x{background:rgba(255,255,255,.08);border:0;color:#e8eefc;border-radius:6px;cursor:pointer;padding:4px 9px;font-size:14px;}' +
        '.el-tg-x:hover{background:rgba(255,255,255,.18);}' +
        '.el-tg-sum{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}' +
        '.el-tg-stat{background:rgba(255,255,255,.06);border-radius:6px;padding:5px 8px;font-size:11px;display:flex;flex-direction:column;min-width:64px;}' +
        '.el-tg-stat b{font-size:15px;line-height:1.1;}' +
        '.el-tg-stat .k{opacity:.7;text-transform:uppercase;letter-spacing:.03em;font-size:9px;}' +
        '.el-tg-stat .p{opacity:.55;font-size:9px;margin-top:1px;}' +
        '.el-tg-other{margin-top:8px;font-size:12px;opacity:.9;}' +
        '.el-tg-other b{color:#ffd27d;}' +
        '.el-tg-ctrls{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}' +
        '.el-tg-ctrls select,.el-tg-ctrls input{background:#0a1322;color:#e8eefc;border:1px solid rgba(255,255,255,.18);' +
          'border-radius:6px;padding:5px 7px;font-size:12px;max-width:100%;}' +
        '.el-tg-ctrls input{flex:1 1 100%;}' +
        '.el-tg-copyall{background:#1d3a6b;border:0;color:#dce8ff;border-radius:6px;cursor:pointer;padding:5px 9px;font-size:11px;}' +
        '.el-tg-copyall:hover{background:#27508f;}' +
        '.el-tg-body{flex:1 1 auto;overflow-y:auto;padding:8px 10px 40px;}' +
        '.el-tg-empty{opacity:.6;padding:24px 6px;text-align:center;}' +
        '.el-tg-row{border:1px solid rgba(255,255,255,.09);border-radius:8px;padding:9px 10px;margin-bottom:8px;background:rgba(255,255,255,.025);}' +
        '.el-tg-meta{display:flex;align-items:center;gap:7px;font-size:11px;opacity:.92;margin-bottom:4px;flex-wrap:wrap;}' +
        '.el-tg-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;}' +
        '.el-tg-dot.none{background:#9aa3b2;}.el-tg-dot.weak{background:#f4b740;}.el-tg-dot.matched{background:#4d9bff;}.el-tg-dot.author{background:#4d9bff;}' +
        '.el-tg-pol{font-weight:600;}' +
        '.el-tg-cur{opacity:.7;}' +
        '.el-tg-head{font-size:12.5px;line-height:1.4;margin-bottom:7px;}' +
        '.el-tg-actions{display:flex;gap:6px;}' +
        '.el-tg-actions select{flex:1 1 auto;background:#0a1322;color:#e8eefc;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 6px;font-size:11.5px;}' +
        '.el-tg-actions button{background:rgba(255,255,255,.08);border:0;color:#e8eefc;border-radius:6px;cursor:pointer;padding:5px 8px;font-size:11px;flex:0 0 auto;}' +
        '.el-tg-actions button:hover{background:rgba(255,255,255,.18);}' +
        /* Debug triage panel on phones — fill the screen so it never leaves a
           dead sliver, drop the now-redundant left border, and lift the close
           button and per-row controls to a comfortable tap size. The panel only
           ever appears with window._PDX_DEBUG_TAGGING on, so this is a
           degrade-gracefully safeguard, not a shipped surface. */
        '@media (max-width:640px){' +
          '#el-triage-panel{width:100vw;max-width:100vw;border-left:0;}' +
          '.el-tg-x{min-height:34px;min-width:34px;}' +
          '.el-tg-ctrls select,.el-tg-ctrls input,.el-tg-copyall,' +
            '.el-tg-actions select,.el-tg-actions button{min-height:36px;}' +
        '}';
      document.head.appendChild(s);
    }

    // Build the full panel (style + header summary + controls + list). Used on
    // open and after each assignment (so the summary counts refresh).
    function _renderTriage(list) {
      if (!window._PDX_DEBUG_TAGGING) return;
      _triageSrc = (list && list.length) ? list : (_items || []);
      var src = _triageSrc;
      // Enhanced console breakdown.
      var tally = { author: 0, matched: 0, weak: 0, none: 0 };
      src.forEach(function (x) { tally[x.tagConf] = (tally[x.tagConf] || 0) + 1; });
      var total = src.length;
      var otherN = src.filter(function (x) { return x.category === 'other'; }).length;
      var pct = total ? Math.round((otherN / total) * 100) : 0;
      // Percentage of the whole library for one bucket count (0 when empty).
      var pctOf = function (n) { return total ? Math.round((n / total) * 100) : 0; };
      try {
        console.table({
          'author-tagged': { count: tally.author, pct: pctOf(tally.author) + '%' },
          'auto-tagged':   { count: tally.matched, pct: pctOf(tally.matched) + '%' },
          'loose':         { count: tally.weak, pct: pctOf(tally.weak) + '%' },
          'untagged':      { count: tally.none, pct: pctOf(tally.none) + '%' },
          'Other/General': { count: otherN, pct: pct + '%' }
        });
      } catch (e) { console.log('[EvidenceLocker] tagging quality:', tally); }
      console.log('[EvidenceLocker] Other/General: ' + otherN + '/' + total + ' (' + pct + '%) · triage pool: ' + _triagePool(src).length +
        ' — open the panel on the right, or call window._pdxTriage()');

      _triageEnsureStyle();
      var panel = document.getElementById('el-triage-panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'el-triage-panel';
        document.body.appendChild(panel);
      }
      panel.style.display = '';

      // Category filter options — only categories that actually have pool items,
      // in canonical order, each with a live count. "Other / General" leads.
      var pool = _triagePool(src);
      var catCounts = {};
      pool.forEach(function (it) { catCounts[it.category] = (catCounts[it.category] || 0) + 1; });
      var cats = (typeof window._pdxEvidenceCategories === 'function') ? window._pdxEvidenceCategories() : [];
      var catOpts = '<option value="__all"' + (_triageState.cat === '__all' ? ' selected' : '') + '>All flagged (' + pool.length + ')</option>';
      cats.forEach(function (c) {
        if (!catCounts[c.key]) return;
        catOpts += '<option value="' + _esc(c.key) + '"' + (_triageState.cat === c.key ? ' selected' : '') + '>' +
          _esc((c.icon ? c.icon + ' ' : '') + c.label) + ' (' + catCounts[c.key] + ')</option>';
      });

      function selOpt(v, label, cur) { return '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + label + '</option>'; }

      panel.innerHTML =
        '<div class="el-tg-hd">' +
          '<div class="el-tg-hd-top">' +
            '<span class="el-tg-title">🧭 Evidence Triage</span>' +
            '<button type="button" class="el-tg-x" title="Hide (reopen with window._pdxTriage())" onclick="window._pdxTriageClose()">✕</button>' +
          '</div>' +
          '<div class="el-tg-sum">' +
            '<span class="el-tg-stat"><span class="k">author</span><b>' + tally.author + '</b><span class="p">' + pctOf(tally.author) + '%</span></span>' +
            '<span class="el-tg-stat"><span class="k">auto</span><b>' + tally.matched + '</b><span class="p">' + pctOf(tally.matched) + '%</span></span>' +
            '<span class="el-tg-stat"><span class="k">loose</span><b>' + tally.weak + '</b><span class="p">' + pctOf(tally.weak) + '%</span></span>' +
            '<span class="el-tg-stat"><span class="k">untagged</span><b>' + tally.none + '</b><span class="p">' + pctOf(tally.none) + '%</span></span>' +
            '<span class="el-tg-stat"><span class="k">other</span><b>' + otherN + '</b><span class="p">' + pct + '%</span></span>' +
            '<span class="el-tg-stat"><span class="k">total</span><b>' + total + '</b><span class="p">100%</span></span>' +
          '</div>' +
          '<div class="el-tg-other">Other / General: <b>' + otherN + '</b> / ' + total + ' (<b>' + pct + '%</b>)</div>' +
          '<div class="el-tg-ctrls">' +
            '<select onchange="window._pdxTriageSet(\'cat\', this.value)">' + catOpts + '</select>' +
            '<select onchange="window._pdxTriageSet(\'conf\', this.value)">' +
              selOpt('all', 'All confidence', _triageState.conf) +
              selOpt('none', 'Untagged only', _triageState.conf) +
              selOpt('weak', 'Loose only', _triageState.conf) +
            '</select>' +
            '<select onchange="window._pdxTriageSet(\'sort\', this.value)">' +
              selOpt('recent', 'Newest', _triageState.sort) +
              selOpt('oldest', 'Oldest', _triageState.sort) +
              selOpt('count', 'Most-documented politician', _triageState.sort) +
              selOpt('az', 'Headline A–Z', _triageState.sort) +
            '</select>' +
            '<button type="button" class="el-tg-copyall" title="Copy every assignment made this session" onclick="window._pdxTriageCopyAll()">⧉ Copy all</button>' +
            '<input type="search" placeholder="Search headlines…" value="' + _esc(_triageState.q) + '" oninput="window._pdxTriageSet(\'q\', this.value)">' +
          '</div>' +
        '</div>' +
        '<div class="el-tg-body" id="el-triage-body"></div>';
      _renderTriageBody();
    }

    // Rebuild only the scrollable list (cheap; called on every filter keystroke).
    function _renderTriageBody() {
      var body = document.getElementById('el-triage-body');
      if (!body) return;
      var src = _triageSrc || _items || [];
      var pool = _triagePool(src);
      var counts = _triagePolCounts(src);
      var q = (_triageState.q || '').toLowerCase().trim();
      var rows = pool.filter(function (it) {
        if (_triageState.cat && _triageState.cat !== '__all' && it.category !== _triageState.cat) return false;
        if (_triageState.conf === 'none' && it.tagConf !== 'none') return false;
        if (_triageState.conf === 'weak' && it.tagConf !== 'weak') return false;
        if (q) {
          var hay = (it.name + ' ' + it.headline + ' ' + (it.facts || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });
      rows.sort(function (a, b) {
        if (_triageState.sort === 'oldest') return (a.dateRank - b.dateRank) || a.name.localeCompare(b.name);
        if (_triageState.sort === 'az') return a.headline.localeCompare(b.headline);
        if (_triageState.sort === 'count') {
          var d = (counts[b.id] || 0) - (counts[a.id] || 0);
          return d || (b.dateRank - a.dateRank);
        }
        return (b.dateRank - a.dateRank) || a.name.localeCompare(b.name);   // 'recent'
      });
      if (!rows.length) {
        body.innerHTML = '<div class="el-tg-empty">Nothing matches — the bucket is clear for this filter. 🎉</div>';
        return;
      }
      var opts = _triageOptions();
      body.innerHTML = '<div class="el-tg-empty" style="padding:4px 6px;text-align:left;">' + rows.length + ' item' + (rows.length === 1 ? '' : 's') + ' to triage</div>' +
        rows.map(function (it) {
          var cur = (it.categoryIcon || '🎯') + ' ' + (it.categoryLabel || 'Other / General') +
            (it.issueLabel && it.issueLabel !== 'General' ? ' · ' + it.issueLabel : '');
          return '<div class="el-tg-row">' +
            '<div class="el-tg-meta">' +
              '<span class="el-tg-dot ' + _esc(it.tagConf) + '" title="' + _esc(it.tagConf) + '"></span>' +
              '<span class="el-tg-pol">' + _esc(it.name) + '</span>' +
              '<span class="el-tg-cur">now: ' + _esc(cur) + '</span>' +
            '</div>' +
            '<div class="el-tg-head">' + _esc(it.headline) + '</div>' +
            '<div class="el-tg-actions">' +
              '<select onchange="window._pdxTriageAssign(\'' + _esc(it.uid) + '\', this.value)">' + opts + '</select>' +
              '<button type="button" title="Copy this item\'s current tag as JSON" onclick="window._pdxTriageCopyItem(\'' + _esc(it.uid) + '\')">⧉</button>' +
            '</div>' +
          '</div>';
        }).join('');
    }

    // Populate the issue + politician dropdowns and the type chips from whatever
    // evidence actually exists, so a filter never offers an empty result.
    function _populateFilters() {
      // Reset the dropdowns to just their static first option so a reload/retry
      // can never stack duplicate entries.
      ['el-f-category', 'el-f-issue', 'el-f-pol'].forEach(function (selId) {
        var sel = document.getElementById(selId);
        if (sel) while (sel.options.length > 1) sel.remove(1);
      });
      var issues = {}, pols = {}, types = {}, cats = {};
      _items.forEach(function (it) {
        if (it.issueKey) issues[it.issueKey] = it.issueLabel;
        if (it.category) cats[it.category] = (cats[it.category] || 0) + 1;
        pols[it.id] = it.name;
        types[it.typeKey] = (types[it.typeKey] || 0) + 1;
      });
      // Broad Category dropdown — list only the Categories that actually have
      // evidence on the page, in the canonical EVIDENCE_CATEGORIES order, so the
      // filter never offers an empty bucket. Each option carries a live count so
      // a visitor can see how much sits under a topic before selecting it.
      var catSel = document.getElementById('el-f-category');
      if (catSel) {
        var allCats = (typeof window._pdxEvidenceCategories === 'function') ? window._pdxEvidenceCategories() : [];
        allCats.filter(function (c) { return cats[c.key]; }).forEach(function (c) {
          var o = document.createElement('option');
          o.value = c.key;
          o.textContent = (c.icon ? c.icon + ' ' : '') + c.label + ' (' + cats[c.key] + ')';
          catSel.appendChild(o);
        });
      }
      var issueSel = document.getElementById('el-f-issue');
      var polSel = document.getElementById('el-f-pol');
      if (issueSel) {
        // Topic ("cat:<key>") options first, so a voter can filter by a whole
        // subject area — this is the value the My Priorities dashboard passes
        // when opening "all my team's evidence on Healthcare". Only categories
        // that actually have evidence on the page are offered.
        var imap = _issueMap();
        var catsPresent = {};
        Object.keys(issues).forEach(function (k) {
          var c = imap[k] && imap[k].cat; if (c) catsPresent[c] = true;
        });
        var catList = (typeof window._pdxIssueCategories === 'function') ? window._pdxIssueCategories() : [];
        var catOpts = catList.filter(function (c) { return catsPresent[c.key]; });
        if (catOpts.length) {
          var og = document.createElement('optgroup');
          og.label = 'By topic';
          catOpts.forEach(function (c) {
            var o = document.createElement('option');
            o.value = 'cat:' + c.key; o.textContent = (c.icon ? c.icon + ' ' : '') + 'All ' + c.label;
            og.appendChild(o);
          });
          issueSel.appendChild(og);
        }
        Object.keys(issues).map(function (k) { return [k, issues[k]]; })
          .sort(function (a, b) { return a[1].localeCompare(b[1]); })
          .forEach(function (pair) {
            var o = document.createElement('option');
            o.value = pair[0]; o.textContent = pair[1]; issueSel.appendChild(o);
          });
      }
      if (polSel) {
        Object.keys(pols).map(function (k) { return [k, pols[k]]; })
          .sort(function (a, b) { return a[1].localeCompare(b[1]); })
          .forEach(function (pair) {
            var o = document.createElement('option');
            o.value = pair[0]; o.textContent = pair[1]; polSel.appendChild(o);
          });
      }
      var wrap = document.getElementById('el-types');
      if (wrap) {
        var html = '<button type="button" class="el-chip is-active" data-type="">All Types</button>';
        EL_TYPE_ORDER.forEach(function (k) {
          if (!types[k]) return;
          var t = EL_TYPES[k];
          html += '<button type="button" class="el-chip" data-type="' + k + '">' +
            '<span>' + t.icon + '</span>' + _esc(t.label) + ' <span style="opacity:0.65">' + types[k] + '</span></button>';
        });
        wrap.innerHTML = html;
        wrap.querySelectorAll('.el-chip').forEach(function (chip) {
          chip.addEventListener('click', function () {
            _state.type = chip.getAttribute('data-type') || '';
            wrap.querySelectorAll('.el-chip').forEach(function (c) { c.classList.remove('is-active'); });
            chip.classList.add('is-active');
            _render();
          });
        });
      }
    }

    function _matches(it) {
      if (_state.category && it.category !== _state.category) return false;
      // "Relevant to Me": narrow to the politicians the user actually cares about
      // (saved team + their reps + ballot). Gracefully a no-op when the set is
      // null/empty — a visitor with no team and no confirmed location keeps seeing
      // everything rather than an empty locker. Composes with every other filter.
      if (_state.relevant && _relevantSet && _relevantSet.size && !_relevantSet.has(it.id)) return false;
      if (_state.mandate) {
        // A per-reform filter: keep only evidence on one of the tracked issues
        // that the People's Mandate reform touches (it may touch more than one).
        var mk = (typeof window._pdxMandateIssueKeys === 'function') ? window._pdxMandateIssueKeys(_state.mandate) : [];
        if (!it.issueKey || mk.indexOf(it.issueKey) === -1) return false;
      }
      if (_state.issue) {
        // A "cat:<key>" value filters by a whole topic (every issue in that
        // category) — used by the My Priorities "see all my team's evidence on
        // this topic" jump. A plain value filters by the single issue key.
        if (_state.issue.indexOf('cat:') === 0) {
          var imap = _issueMap();
          var im = imap && imap[it.issueKey];
          if (!im || ('cat:' + im.cat) !== _state.issue) return false;
        } else if (it.issueKey !== _state.issue) return false;
      }
      if (_state.pol && it.id !== _state.pol) return false;
      if (_state.type && it.typeKey !== _state.type) return false;
      if (_state.search) {
        var hay = (it.name + ' ' + it.office + ' ' + it.headline + ' ' + it.facts +
                   ' ' + (it.categoryLabel || '') + ' ' + it.issueLabel + ' ' + it.typeLabel).toLowerCase();
        if (hay.indexOf(_state.search) === -1) return false;
      }
      return true;
    }

    // Numeric rank for the strength sort: Strong (3) → Moderate (2) → Limited (1).
    function _strengthRank(it) {
      var lvl = (it.strength && it.strength.level) || (_strength(it).level);
      return lvl === 'strong' ? 3 : lvl === 'moderate' ? 2 : 1;
    }

    // Apply the active sort order. Date sorts fall back to member name; the name
    // and issue sorts fall back to newest-first so ties read chronologically.
    function _sortItems(arr) {
      var s = _state.sort;
      return arr.slice().sort(function (a, b) {
        if (s === 'date_asc') {
          if (a.dateRank !== b.dateRank) return a.dateRank - b.dateRank;
          return a.name.localeCompare(b.name);
        }
        if (s === 'strength_desc') {
          var sr = _strengthRank(b) - _strengthRank(a);
          if (sr !== 0) return sr;
          if (a.dateRank !== b.dateRank) return b.dateRank - a.dateRank;
          return a.name.localeCompare(b.name);
        }
        if (s === 'pol_asc') {
          var n = a.name.localeCompare(b.name);
          return n !== 0 ? n : b.dateRank - a.dateRank;
        }
        if (s === 'cat_asc') {
          var cl = (a.categoryLabel || '').localeCompare(b.categoryLabel || '');
          if (cl !== 0) return cl;
          var ci = a.issueLabel.localeCompare(b.issueLabel);
          return ci !== 0 ? ci : b.dateRank - a.dateRank;
        }
        if (s === 'issue_asc') {
          var il = a.issueLabel.localeCompare(b.issueLabel);
          return il !== 0 ? il : b.dateRank - a.dateRank;
        }
        // 'date_desc' (default) — newest first, then member name.
        if (a.dateRank !== b.dateRank) return b.dateRank - a.dateRank;
        return a.name.localeCompare(b.name);
      });
    }

    // Strength badge markup. Tolerates a snapshot that stored only the level
    // (recomputes a label/bars) as well as a fully-built live item.
    function _strengthHtml(it) {
      var s = it.strength;
      if (!s) s = _strength(it);
      else if (typeof s === 'string') s = { level: s, label: s.charAt(0).toUpperCase() + s.slice(1), bars: s === 'strong' ? '●●●' : s === 'moderate' ? '●●○' : '●○○', reasons: [] };
      var why = (s.reasons && s.reasons.length) ? 'Why: ' + s.reasons.join(' · ') : '';
      return '<span class="el-strength is-' + s.level + '" title="Evidence strength: ' + _esc(s.label) +
        (why ? ' — ' + _esc(why) : '') + '">' +
        '<span class="el-str-bars" aria-hidden="true">' + s.bars + '</span>' + _esc(s.label) + '</span>';
    }

    // Bookmark/save control. `where` distinguishes the card vs the modal so the
    // delegated click handler can resolve the right item.
    function _bmHtml(it, where) {
      var saved = _isSaved(it.key);
      return '<button type="button" class="el-bm' + (saved ? ' is-saved' : '') + '" data-bm-key="' + _esc(it.key) +
        '" data-bm-where="' + (where || 'card') + '" aria-pressed="' + (saved ? 'true' : 'false') +
        '" title="' + (saved ? 'In a collection — manage' : 'Save to a collection') +
        '" aria-label="' + (saved ? 'Saved — manage collections' : 'Save to a collection') + '">' +
        (saved ? '🔖' : '🏷') + '</button>';
    }

    // Resolve a Category descriptor for any item — uses the stamped fields when
    // present (live items) and otherwise derives from the issueKey, so a saved
    // snapshot from before Categories existed still shows the right badge.
    function _catOf(it) {
      if (it && it.categoryLabel) return { label: it.categoryLabel, icon: it.categoryIcon || '🎯' };
      var key = (it && it.category) ||
        (typeof window._pdxCategoryOf === 'function' ? window._pdxCategoryOf(it && it.issueKey) : '');
      var d = (key && typeof window._pdxEvidenceCategory === 'function') ? window._pdxEvidenceCategory(key) : null;
      return d ? { label: d.label, icon: d.icon } : null;
    }
    function _catChipHtml(it) {
      var c = _catOf(it);
      if (!c) return '';
      return '<span class="el-cat" title="Category: ' + _esc(c.label) + '">' +
        '<span class="el-cat-ico" aria-hidden="true">' + _esc(c.icon) + '</span>' + _esc(c.label) + '</span>';
    }
    // The broad Category key for an item — the stamped field on live items, with
    // a derive-from-issueKey fallback so a pre-Categories saved snapshot still
    // resolves. Drives the `el-cat-c-<key>` colour class on cards and chips.
    function _catKeyOf(it) {
      if (it && it.category) return it.category;
      if (typeof window._pdxCategoryOf === 'function') return window._pdxCategoryOf(it && it.issueKey);
      return 'other';
    }
    // The prominent Category header that now leads every card and the detail
    // modal. The `el-cat-c-<key>` class carries the topic's colour, so the
    // header tints itself; `bmWhere` (card | modal) folds the save control in at
    // the right edge so the header doubles as the card's top action row.
    function _catHeadHtml(it, bmWhere) {
      var c = _catOf(it) || { label: 'Other / General', icon: '🎯' };
      return '<div class="el-cat-head el-cat-c-' + _esc(_catKeyOf(it)) + '">' +
        '<button type="button" class="el-cat-head-btn" data-el-cat="' + _esc(_catKeyOf(it)) +
          '" title="See all evidence in ' + _esc(c.label) + '">' +
          '<span class="el-cat-head-ico" aria-hidden="true">' + _esc(c.icon) + '</span>' +
          '<span class="el-cat-head-label">' + _esc(c.label) + '</span>' +
        '</button>' +
        _tagDotHtml(it) +
        (bmWhere ? _bmHtml(it, bmWhere) : '') +
      '</div>';
    }

    // A small, optional tagging-quality dot shown only when an item was NOT
    // author-tagged — so a clean (dot-less) header reads "well tagged" and the
    // dot flags items that were auto-classified or still generic. Subtle by
    // design; the tooltip explains the state. Tolerates saved snapshots from
    // before tagConf existed (returns nothing).
    function _tagDotHtml(it) {
      var c = it && it.tagConf;
      if (!c || c === 'author') return '';
      var meta = c === 'matched'
        ? { cls: 'is-auto',  t: 'Auto-tagged from the headline’s keywords' }
        : c === 'weak'
        ? { cls: 'is-loose', t: 'Loosely auto-tagged from the headline — may need a review' }
        : { cls: 'is-none',  t: 'Untagged — filed under Other / General' };
      return '<span class="el-tagq ' + meta.cls + '" title="' + _esc(meta.t) + '"></span>';
    }

    // ── Media previews ─────────────────────────────────────────────────────
    // Richer, more inviting evidence cards. Recorded video gets a cinematic
    // thumbnail tile with a prominent play button (and a real YouTube poster
    // when the link is one); X posts get a pull-quote preview of the post.
    function _ytId(url) {
      var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
      return m ? m[1] : '';
    }
    function _videoTileHtml(it) {
      var kindLabel = it.typeKey === 'committee_video' ? 'Committee Video'
        : it.typeKey === 'youtube' ? 'YouTube' : 'Floor Video';
      var yt = _ytId(it.url);
      var img = yt ? '<img class="el-thumb-img" loading="lazy" alt="" src="https://img.youtube.com/vi/' + _esc(yt) + '/hqdefault.jpg">' : '';
      var ts = it.timestamp ? '<span class="el-thumb-ts">' + _esc(it.timestamp) + '</span>' : '';
      var cap = (!img && it.sourceLabel) ? '<span class="el-thumb-cap">' + _esc(it.sourceLabel) + '</span>' : '';
      var inner = img +
        '<span class="el-thumb-tag">🎥 ' + _esc(kindLabel) + '</span>' +
        '<span class="el-thumb-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>' +
        ts + cap;
      // For a YouTube clip, deep-link the cited timestamp so the "pinpoint
      // timestamp" the badge credits actually seeks there (floor/committee links
      // are routed through the in-app player, which handles their offset itself).
      var href = (typeof window._pdxYtDeepLink === 'function') ? window._pdxYtDeepLink(it.url, it.timestamp) : it.url;
      return it.url
        ? '<a class="el-thumb" href="' + _esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="Watch the video: ' + _esc(it.headline) + '">' + inner + '</a>'
        : '<span class="el-thumb" aria-hidden="true">' + inner + '</span>';
    }
    function _quoteTileHtml(it, allowHeadline) {
      var raw = it.facts || (allowHeadline ? it.headline : '');
      var txt = String(raw || '').replace(/<[^>]*>/g, '').trim();
      if (!txt) return '';
      var tone = it.typeKey === 'statement' ? ' is-statement'
        : it.typeKey === 'facebook' ? ' is-facebook'
        : it.typeKey === 'audio' ? ' is-audio' : '';
      return '<blockquote class="el-quote' + tone + '">' + _esc(txt) + '</blockquote>';
    }
    // Official bill records read as plain text otherwise — give them a document
    // "record" tile (ledger-lined, sealed) so an official action looks as solid
    // as the recorded video it sits beside.
    function _billTileHtml(it) {
      var src = it.sourceLabel || (it.url ? 'Public bill record' : '');
      return '<div class="el-bill-tile">' +
          '<span class="el-bill-ico" aria-hidden="true">📜</span>' +
          '<span class="el-bill-body">' +
            '<span class="el-bill-tag">Official Bill Record</span>' +
            (src ? '<span class="el-bill-src">' + _esc(src) + '</span>' : '') +
          '</span>' +
          '<span class="el-bill-seal" aria-hidden="true">⚖</span>' +
        '</div>';
    }
    // Today as a sortable year*100+month rank, matching _dateRank, so freshness
    // can be measured against the real calendar rather than a hardcoded date.
    function _nowRank() {
      var d = new Date();
      return d.getFullYear() * 100 + (d.getMonth() + 1);
    }
    // How fresh a piece of evidence is, by its own date. Drives the Recently
    // Added badge so "new" reads honestly: items from the last month or two are
    // flagged green, the rest of the year reads "Recent", and anything older
    // falls back to its year. Returns null when an item carries no parseable date.
    function _freshness(it) {
      var r = it.dateRank || 0;
      if (!r) return null;
      var now = _nowRank();
      var months = (Math.floor(now / 100) - Math.floor(r / 100)) * 12 + ((now % 100) - (r % 100));
      if (months <= 1)  return { label: 'Just added', cls: 'is-fresh' };
      if (months <= 3)  return { label: 'New',        cls: 'is-fresh' };
      if (months <= 12) return { label: 'Recent',     cls: 'is-recent' };
      var yr = Math.floor(r / 100);
      return { label: yr ? String(yr) : 'Older', cls: 'is-older' };
    }

    // Documented (or, failing that, headline-inferred) stance pill for one
    // evidence card — so the card itself says where the politician stands on this
    // issue without opening the modal. A documented position from
    // ISSUE_STANCE_DATA always wins; only when there is none do we fall back to
    // the headline-inferred read, marked with the same "~" the By-Politician
    // stance rows use. Honest by construction: documented and inferred never blur.
    var _EL_CSTANCE = {
      support: { cls: 'is-support', ico: '✓', lbl: 'Supports' },
      oppose:  { cls: 'is-oppose',  ico: '✗', lbl: 'Opposes' },
      mixed:   { cls: 'is-mixed',   ico: '~', lbl: 'Mixed' }
    };
    function _elCardStanceChip(it) {
      if (!it || !it.issueKey) return '';
      var dir = '', inferred = false;
      try {
        if (typeof window._polPositionMap === 'function') {
          var pm = window._polPositionMap(it.id, { name: it.name }) || {};
          var doc = pm[it.issueKey];
          if (doc && doc.stance) dir = String(doc.stance).toLowerCase();
        }
      } catch (e) {}
      if (!dir && it.stanceGuess) { dir = String(it.stanceGuess).toLowerCase(); inferred = true; }
      var m = _EL_CSTANCE[dir];
      if (!m) return '';
      var tip = inferred
        ? 'Inferred from the headline — not yet a documented position'
        : 'Documented position on ' + (it.issueLabel || 'this issue');
      return '<span class="el-cstance ' + m.cls + '" title="' + _esc(tip) + '">' +
        '<span class="el-cstance-ico" aria-hidden="true">' + m.ico + '</span>' + m.lbl +
        ((inferred && dir !== 'mixed') ? ' <span class="el-cstance-inf" aria-hidden="true">~</span>' : '') +
      '</span>';
    }

    // Small power/position badge — a gold pill surfaced when an item carries a
    // meaningful `powerTie` (a tie to who holds the relevant power/position).
    // `powerTie` is a { type, label, reason } object (see _powerTie); the short
    // label rides in the pill, the fuller reason lives in the hover tooltip, and
    // the tie `type` (sponsorship / committee / statutory / leadership) is
    // exposed as a modifier class + data-attr for styling/analytics. A legacy
    // plain-string powerTie is still accepted. Shared by the card grid and the
    // detail modal so both read the same.
    function _powerBadgeHtml(it) {
      var pt = it && it.powerTie;
      if (!pt) return '';
      var label, tip, type;
      if (typeof pt === 'string') { label = pt; tip = pt; type = ''; }
      else {
        label = pt.label || 'Power';
        tip = (pt.label ? pt.label + ' — ' : '') + (pt.reason || '');
        type = pt.type || '';
      }
      var cls = 'el-power-badge' + (type ? ' el-pt-' + _esc(type) : '');
      return '<span class="' + cls + '"' + (type ? ' data-pt-type="' + _esc(type) + '"' : '') +
        ' title="' + _esc(tip.trim()) + '">⚡ ' + _esc(label) + '</span>';
    }
    // Exposed so the Alignment Tool can render the identical gold power/position
    // pill from a { type, label, reason } powerTie, keeping the two surfaces in
    // lock-step (sponsorship still reads loudest via the strong-gold variant).
    try {
      window._powerBadgeHtml = _powerBadgeHtml;
      window._alignPowerBadgeHtml = function (pt) { return pt ? _powerBadgeHtml({ powerTie: pt }) : ''; };
    } catch (e) {}

    // Shared stance pill (Support / Oppose / Mixed) in the Evidence Locker's own
    // colour language — green / red / amber — exposed so the Alignment Tool draws
    // an identical chip and the stance read can never drift between the surfaces.
    try {
      window._pdxStanceChipHtml = function (dir, opts) {
        opts = opts || {};
        var m = _EL_CSTANCE[String(dir == null ? '' : dir).toLowerCase()];
        if (!m) return '';
        var title = opts.title ? ' title="' + _esc(opts.title) + '"' : '';
        return '<span class="el-cstance ' + m.cls + (opts.cls ? ' ' + opts.cls : '') + '"' + title + '>' +
          '<span class="el-cstance-ico" aria-hidden="true">' + m.ico + '</span>' + _esc(opts.label || m.lbl) +
        '</span>';
      };
    } catch (e) {}

    function _cardHtml(it, opts) {
      opts = opts || {};
      var t = EL_TYPES[it.typeKey] || EL_TYPES.statement;
      var srcLabel = t.video ? 'Watch video' :
        it.typeKey === 'x_post' ? 'View X post' :
        it.typeKey === 'facebook' ? 'View Facebook post' :
        it.typeKey === 'bill' ? 'View bill record' : 'View source';
      var ts = (t.video && it.timestamp) ? ' <span style="opacity:0.75">· ' + _esc(it.timestamp) + '</span>' : '';
      var srcBtn = it.url
        ? '<a class="el-btn el-btn-src' + (t.video ? '' : ' is-plain') + '" href="' + _esc(it.url) +
            '" target="_blank" rel="noopener noreferrer">' + t.icon + ' ' + srcLabel + ts + '</a>'
        : '';
      var profBtn = '<button type="button" class="el-btn el-btn-prof" onclick="if(typeof showProfile===\'function\')showProfile(\'' +
        _esc(it.id) + '\')">View ' + _esc((it.name || '').split(' ').slice(-1)[0]) + '’s profile →</button>';
      // In My Evidence, the last action lets you pull the item out of *this*
      // collection directly; elsewhere it's the standard "open details" hint.
      var lastAction = opts.collId
        ? '<button type="button" class="el-btn el-btn-remove" data-rm-key="' + _esc(it.key) +
            '" data-rm-coll="' + _esc(opts.collId) + '">✕ Remove</button>'
        : '<span class="el-card-hint">Details &amp; connections →</span>';
      var issueChip = it.issueKey ? '<button type="button" class="el-issue el-issue-btn" data-el-issue="' + _esc(it.issueKey) + '" title="See all evidence on ' + _esc(it.issueLabel) + '">' + _esc(it.issueLabel) + '</button>' : '';
      var mandateChip = (it.issueKey && typeof window._pdxMandateChip === 'function')
        ? window._pdxMandateChip(it.issueKey, { compact: true }) : '';
      var dateChip = it.date ? '<span class="el-date">' + _esc(it.date) + '</span>' : '';
      // When the Locker is narrowed to one politician, surface a compact depth pill
      // inline with the metadata — the count + strength tier of that politician's
      // whole record on this card's issue — so the breadth behind the filter reads
      // at a glance. Secondary by design; only ever shown for a real, issue-tagged
      // record, and silent in the unfiltered library so the grid stays uncluttered.
      var depthChip = (!opts.noDepth && _state.pol && it.issueKey && typeof window._pdxEvidenceDepthPill === 'function')
        ? window._pdxEvidenceDepthPill(it.id, it.issueKey, {}) : '';
      var quoteTypes = { x_post: 1, statement: 1, facebook: 1, audio: 1 };
      var videoTile = t.video ? _videoTileHtml(it) : '';
      var billTile = (it.typeKey === 'bill') ? _billTileHtml(it) : '';
      var quoteTile = quoteTypes[it.typeKey] ? _quoteTileHtml(it, it.typeKey === 'x_post') : '';
      var facts = (!quoteTile && it.facts) ? '<div class="el-facts">' + _esc(String(it.facts).replace(/<[^>]*>/g, '')) + '</div>' : '';
      var fresh = opts.recent ? _freshness(it) : null;
      var flag = opts.featured ? '<span class="el-feat-flag">★ Featured</span>'
        : (fresh ? '<span class="el-new-badge ' + fresh.cls + '">✦ ' + _esc(fresh.label) + '</span>'
          : opts.recent ? '<span class="el-new-badge">✦ New</span>' : '');
      // Card layout — Category leads as the primary, colour-coded header; the
      // evidence type tag drops to the secondary row beneath it, alongside the
      // strength, issue and date cues.
      // Highlight cards belonging to a politician the visitor was just comparing,
      // when they arrived via a Compare "See everyone's evidence" jump.
      var cmpHit = !!(_state.compare && _state.compare.pols && _state.issue &&
        _state.compare.issue === _state.issue && _state.compare.pols.indexOf(it.id) !== -1);
      // Optional, subtle bridge to the Community Exchange. Rendered hidden and
      // only revealed (after render) for issues that actually have discussion —
      // so the curated grid stays uncluttered when there's nothing to link to.
      var ceeLink = it.issueKey
        ? '<button type="button" class="el-cee-link" hidden data-cee-issue="' + _esc(it.issueKey) +
            '" data-cee-label="' + _esc(it.issueLabel || '') + '">💬 See community discussion' +
            '<span class="el-cee-count" hidden></span></button>'
        : '';
      // …and a scannable echo of it up in the metadata row: a compact gold post-count
      // pill so the lively issues stand out at a glance while skimming the grid. Same
      // hidden-until-confirmed treatment and same cached count as the link above.
      var ceeTag = it.issueKey
        ? '<button type="button" class="el-cee-tag" hidden data-cee-issue="' + _esc(it.issueKey) +
            '" data-cee-label="' + _esc(it.issueLabel || '') +
            '" title="See community discussion on ' + _esc(it.issueLabel || 'this issue') + '">' +
            '<span class="el-cee-tag-ico" aria-hidden="true">💬</span><span class="el-cee-tag-n"></span></button>'
        : '';
      return '<article class="el-card' + (t.video ? ' el-video' : '') + ' el-t-' + _esc(it.typeKey) +
          ' el-cat-c-' + _esc(_catKeyOf(it)) +
          (it.typeKey === 'x_post' ? ' t-x-tint' : '') +
          (opts.featured ? ' is-featured' : '') +
          (cmpHit ? ' el-card-cmp' : '') + '" data-uid="' + _esc(it.uid || '') +
          '" data-key="' + _esc(it.key) + '" role="button" tabindex="0" aria-label="Open detail for: ' + _esc(it.headline) + '">' +
        _catHeadHtml(it, 'card') +
        '<div class="el-card-top">' +
          flag +
          '<span class="el-badge ' + t.badge + '">' + t.icon + ' ' + _esc(t.label) + '</span>' +
          _strengthHtml(it) +
          issueChip + _elCardStanceChip(it) + ceeTag + dateChip + depthChip + _powerBadgeHtml(it) +
        '</div>' +
        '<div class="el-pol">' + _esc(it.name) +
          (it.office ? '<span class="el-office">' + _esc(it.office) + (it.district && String(it.district).indexOf(it.office) === -1 ? ' · ' + _esc(it.district) : '') + '</span>' : '') +
        '</div>' +
        '<div class="el-headline">' + _esc(it.headline) + '</div>' +
        (mandateChip ? '<div class="el-mandate" style="margin:0.1rem 0 0.15rem;">' + mandateChip + '</div>' : '') +
        billTile +
        quoteTile +
        facts +
        videoTile +
        '<div class="el-actions">' + srcBtn + profBtn + lastAction +
        '</div>' + ceeLink +
      '</article>';
    }

    // Shimmer placeholder cards shown while the library streams in.
    function _skelHtml(n) {
      var one = '<div class="el-skel" aria-hidden="true"></div>';
      var out = '';
      for (var i = 0; i < n; i++) out += one;
      return out;
    }

    // ── Single-politician context header + issue grouping ───────────────────
    // When the All Evidence view is narrowed to exactly one politician (a jump in
    // from their Full Stance Record, the profile evidence block, or the politician
    // filter), the otherwise-generic results list becomes that politician's
    // dedicated evidence file: a contextual header (name · photo · office · footprint
    // stats + a one-tap return to their Full Stance Record) sitting over receipts
    // grouped and clearly labelled by issue — each issue carrying its
    // Support / Oppose / Mixed read and the same Evidence-blue depth pill used across
    // the site. Everything is derived from the already-loaded evidence index +
    // cached stance data, so no new network request is made.
    function _polCtxProfile(id) {
      return (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ? CMP_DATA[id]
           : (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id] : null;
    }
    function _polContextHeaderHtml(id, r) {
      var prof = _polCtxProfile(id) || {};
      var photo = (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(id) || '') : (prof.photo || '');
      var icon = prof.icon || '🏛';
      var avatar = photo
        ? '<img loading="lazy" decoding="async" src="' + _esc(photo) + '" alt="' + _esc(r.name) + '" onerror="this.style.display=\'none\';this.parentNode.textContent=\'' + _esc(icon) + '\';">'
        : _esc(icon);
      var receipts = r.count || 0;
      var issueN = Object.keys(r.issues || {}).length;
      // Footprint stats — the politician's whole loaded record, independent of any
      // active sub-filter, so the header always reads as "their file". The
      // community-discussion stat is filled in asynchronously from a cached map.
      var stats = '<span><b>' + receipts + '</b> receipt' + (receipts === 1 ? '' : 's') + '</span>' +
        (issueN ? '<span class="el-pol-ctx-dot" aria-hidden="true">•</span><span><b>' + issueN + '</b> issue' + (issueN === 1 ? '' : 's') + ' with evidence</span>' : '') +
        '<span class="el-pol-ctx-comm" hidden><span class="el-pol-ctx-dot" aria-hidden="true">•</span>' +
          '<span><b class="el-pol-ctx-comm-n"></b> active community discussion<span class="el-pol-ctx-comm-s"></span></span></span>';
      var back = (typeof window._pdxOpenStanceRecord === 'function')
        ? '<button type="button" class="el-pol-ctx-back" data-pol-record="' + _esc(id) + '" ' +
            'title="Return to ' + _esc(r.name) + '’s full record on the issues">' +
            '<span aria-hidden="true">←</span> Back to ' + _esc(r.name) + '’s record on the issues</button>'
        : '';
      return '<div class="el-pol-ctx-card">' +
          '<div class="el-pol-ctx-avatar">' + avatar + '</div>' +
          '<div class="el-pol-ctx-main">' +
            '<span class="el-pol-ctx-kicker">📂 Evidence file</span>' +
            '<span class="el-pol-ctx-name">' + _esc(r.name) + '</span>' +
            (r.office ? '<span class="el-pol-ctx-office">' + _esc(r.office) +
              (r.district && String(r.district).indexOf(r.office) === -1 ? ' · ' + _esc(r.district) : '') + '</span>' : '') +
            '<span class="el-pol-ctx-stats">' + stats + '</span>' +
          '</div>' +
          back +
        '</div>';
    }
    // Group the politician's filtered receipts by issue, resolving each issue's
    // stance the same way the rest of the Locker does: a documented position wins,
    // otherwise a best-effort read inferred from the headlines, else none.
    function _polFilterGroups(items, id) {
      var pm = {};
      try {
        if (typeof window._polPositionMap === 'function') {
          pm = window._polPositionMap(id, _polCtxProfile(id) || { name: _polName(id) }) || {};
        }
      } catch (e) {}
      var buckets = Object.create(null), order = [];
      items.forEach(function (it) {
        var key = it.issueKey || '__general';
        var b = buckets[key];
        if (!b) {
          b = buckets[key] = { key: key, label: it.issueKey ? it.issueLabel : 'General / untagged',
            icon: it.categoryIcon || '🏷', items: [], sup: 0, opp: 0 };
          order.push(key);
        }
        b.items.push(it);
        if (it.stanceGuess === 'support') b.sup++;
        else if (it.stanceGuess === 'oppose') b.opp++;
        else if (it.stanceGuess === 'mixed') { b.sup++; b.opp++; }
      });
      var rows = order.map(function (k) { return buckets[k]; });
      rows.sort(function (a, b) {
        if (a.key === '__general') return 1;
        if (b.key === '__general') return -1;
        return b.items.length - a.items.length;
      });
      rows.forEach(function (r) {
        var st = (r.key !== '__general' && pm[r.key] && pm[r.key].stance) ? String(pm[r.key].stance).toLowerCase() : '';
        if (st && _EL_CSTANCE[st]) { r.stance = st; r.inferred = false; }
        else if (r.key !== '__general' && (r.sup || r.opp)) { r.stance = (r.sup && r.opp) ? 'mixed' : (r.sup ? 'support' : 'oppose'); r.inferred = true; }
        else { r.stance = ''; r.inferred = false; }
      });
      return rows;
    }
    function _polGroupedHtml(items, id) {
      return _polFilterGroups(items, id).map(function (g) {
        var stanceChip = (g.stance && typeof window._pdxStanceChipHtml === 'function')
          ? window._pdxStanceChipHtml(g.stance, { title: g.inferred
              ? 'Inferred from the headlines — not yet a documented position'
              : 'Documented position on ' + g.label }) : '';
        // Reuse the established Evidence-blue depth pill ("📂 Strong • 12") so the
        // strength + breadth of this politician's record on the issue is scannable.
        var depthPill = (g.key !== '__general' && typeof window._pdxEvidenceDepthPill === 'function')
          ? window._pdxEvidenceDepthPill(id, g.key, {}) : '';
        var n = g.items.length;
        var head = '<div class="el-polgrp-head">' +
            '<span class="el-polgrp-ico" aria-hidden="true">' + _esc(g.icon) + '</span>' +
            '<span class="el-polgrp-label">' + _esc(g.label) + '</span>' +
            stanceChip +
            '<span class="el-polgrp-count">' + n + ' receipt' + (n === 1 ? '' : 's') + '</span>' +
            (depthPill ? '<span class="el-polgrp-depth">' + depthPill + '</span>' : '') +
          '</div>';
        // Low-evidence issue group: a quiet on-ramp to suggest more receipts for
        // THIS politician on THIS issue. Only for thinly-documented real issues
        // (≤ 2 receipts, never the untagged "General" bucket), so well-documented
        // groups stay clean. Reuses the Community Exchange deep-link — no request.
        var suggestMore = (g.key !== '__general' && n <= 2 && typeof window._pdxSuggestCueHtml === 'function')
          ? window._pdxSuggestCueHtml((typeof _polName === 'function' ? _polName(id) : ''),
              { issue: g.key, issueLabel: g.label, label: 'Suggest more receipts for this issue', cls: 'el-suggest-more', ico: '➕' })
          : '';
        return '<section class="el-polgrp" data-pol-group-sec="' + _esc(g.key) + '">' + head +
          '<div class="el-grid el-polgrp-grid">' + g.items.map(function (it) { return _cardHtml(it, { noDepth: true }); }).join('') + '</div>' +
          suggestMore +
        '</section>';
      }).join('');
    }
    // Fill the optional "active community discussions" stat in the header from the
    // SAME cached map the card activity tags read (PDXCommunity.issuesWithPosts) —
    // so it adds no network request, and only ever shows when discussion exists.
    function _fillPolCtxCommunity(id) {
      if (!window.PDXCommunity || typeof window.PDXCommunity.issuesWithPosts !== 'function' || !_items) return;
      var keys = Object.create(null);
      _items.forEach(function (it) { if (it.id === id && it.issueKey) keys[it.issueKey] = 1; });
      window.PDXCommunity.issuesWithPosts().then(function (counts) {
        if (_state.pol !== id) return;                 // header changed while we waited
        var ctx = document.getElementById('el-pol-context');
        var wrap = ctx && ctx.querySelector('.el-pol-ctx-comm');
        if (!wrap) return;
        var live = 0;
        Object.keys(keys).forEach(function (k) { if (counts[k] > 0) live++; });
        if (live > 0) {
          var nEl = wrap.querySelector('.el-pol-ctx-comm-n');
          var sEl = wrap.querySelector('.el-pol-ctx-comm-s');
          if (nEl) nEl.textContent = live;
          if (sEl) sEl.textContent = (live === 1 ? '' : 's');
          wrap.hidden = false;
        } else {
          wrap.hidden = true;
        }
      }).catch(function () {});
    }

    // Surface curated Issue Spotlights that match the active search, above the raw
    // evidence rows. Uses the shared PDXSpotlight matcher, so the same terms that
    // work in Browse (data center, Alpine, Vineyard, Saratoga, property tax) also
    // surface the sourced guide here in the reference library.
    function _renderSpotlightHits() {
      var wrap = document.getElementById('el-spotlight-hits');
      var grid = document.getElementById('el-spotlight-hits-grid');
      if (!wrap || !grid) return;
      var q = _state.search || '';
      var api = window.PDXSpotlight;
      var hits = (q && q.length >= 2 && api && typeof api.match === 'function') ? api.match(q) : [];
      // Only in the flat search — stay out of the way of a focused single-politician file.
      if (!hits.length || _state.pol) { wrap.classList.remove('is-on'); grid.innerHTML = ''; return; }
      grid.innerHTML = hits.slice(0, 3).map(function (sp) {
        var s = (typeof api.strengthFor === 'function') ? api.strengthFor(sp) : { level: 'moderate', label: 'Documented' };
        return '<button type="button" class="elsh-card" data-slug="' + _esc(sp.slug) + '" ' +
            'aria-label="View the ' + _esc(sp.title) + ' Issue Spotlight">' +
          '<span class="elsh-k">🔦 ' + _esc(sp.eyebrow || 'Issue Spotlight') + '</span>' +
          '<span class="elsh-t">' + _esc(sp.title) + '</span>' +
          '<span class="elsh-p">📍 ' + _esc(sp.place || '') + '</span>' +
          '<span class="elsh-foot">' +
            '<span class="elsh-doc lvl-' + s.level + '">📑 ' + _esc(s.label) + '</span>' +
            '<span class="elsh-cta">View Spotlight →</span>' +
          '</span>' +
        '</button>';
      }).join('');
      grid.querySelectorAll('[data-slug]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (window.PDXSpotlight && typeof window.PDXSpotlight.open === 'function') {
            window.PDXSpotlight.open(b.getAttribute('data-slug'));
          }
        });
      });
      wrap.classList.add('is-on');
    }

    function _render() {
      var results = document.getElementById('el-results');
      var empty = document.getElementById('el-empty');
      var count = document.getElementById('el-count');
      if (!results || !_items) return;
      _renderSpotlightHits();
      // Keep the "Relevant to Me" set fresh: rebuild it from the latest team +
      // location + ballot whenever the filter is active, and clear it the moment
      // the flag is off (including after a state reset, which sets relevant:false).
      _relevantSet = _state.relevant ? _getRelevantPids() : null;
      var shown = _sortItems(_items.filter(_matches));
      // Single-politician focus: render that politician's evidence file — a
      // contextual header over receipts grouped by issue. Only when the view is
      // narrowed to exactly one politician; the unfiltered / multi-issue library
      // keeps its clean flat grid.
      var polCtx = document.getElementById('el-pol-context');
      var roster = _state.pol ? _polRoster() : null;
      if (_state.pol && roster && roster[_state.pol]) {
        if (polCtx) { polCtx.style.display = ''; polCtx.innerHTML = _polContextHeaderHtml(_state.pol, roster[_state.pol]); }
        results.classList.add('el-results-grouped');
        results.innerHTML = _polGroupedHtml(shown, _state.pol);
        _fillPolCtxCommunity(_state.pol);
        // A deep link that named a specific issue still works: that issue's group
        // is highlighted (and only it renders, since the issue filter is applied),
        // so the receipts a visitor came for read as the focus of the file.
        if (_state.issue) {
          var tgt = results.querySelector('[data-pol-group-sec="' + _state.issue.replace(/"/g, '\\"') + '"]');
          if (tgt) tgt.classList.add('is-highlighted');
        }
      } else {
        if (polCtx) { polCtx.style.display = 'none'; polCtx.innerHTML = ''; }
        results.classList.remove('el-results-grouped');
        results.innerHTML = shown.map(_cardHtml).join('');
      }
      if (empty) empty.style.display = shown.length ? 'none' : 'block';
      if (count) {
        count.innerHTML = '<strong>' + shown.length + '</strong> of ' + _items.length +
          ' evidence item' + (_items.length === 1 ? '' : 's') + ' shown';
      }
      // Per-reform filter banner — visible and removable, so a visitor who jumped
      // here from a People's Mandate reform card can see why the library is
      // narrowed and clear it in one tap.
      var mf = document.getElementById('el-mandate-filter');
      if (mf) {
        if (_state.mandate) {
          var rn = (typeof window._pdxMandateName === 'function') ? window._pdxMandateName(_state.mandate) : '';
          mf.style.display = '';
          mf.innerHTML =
            '<span class="el-mandate-filter-ico" aria-hidden="true">📜</span>' +
            '<span class="el-mandate-filter-txt">Politicians on the record for the reform <strong>' + _esc(rn || 'this reform') + '</strong></span>' +
            '<button type="button" class="el-mandate-filter-clear" onclick="window._pdxEvidenceClearMandate&&window._pdxEvidenceClearMandate()">Clear ✕</button>';
        } else {
          mf.style.display = 'none';
          mf.innerHTML = '';
        }
      }
      // Comparison-context banner — shown when the visitor arrived from a Compare
      // issue row's "See everyone's evidence" link. The results already show every
      // politician on record for the issue; this names the lineup they were
      // comparing (whose cards are highlighted below) and clears in one tap.
      var cf = document.getElementById('el-compare-filter');
      if (cf) {
        var cmp = _state.compare;
        if (cmp && _state.issue && cmp.issue === _state.issue) {
          var issLbl = '';
          var issEl = document.getElementById('el-f-issue');
          if (issEl && issEl.value === _state.issue && issEl.selectedIndex >= 0 && issEl.options[issEl.selectedIndex]) {
            issLbl = issEl.options[issEl.selectedIndex].text;
          }
          var nms = (cmp.names && cmp.names.length) ? cmp.names : [];
          var nmTxt = nms.length
            ? nms.map(function (n) { return _esc(n); }).join(', ')
            : 'the politicians you were comparing';
          // Whose cards are highlighted — Compare's lineup by default, or the saved
          // team when the visitor jumped here from a My Team issue row.
          var who = (cmp.label && String(cmp.label)) ? String(cmp.label) : 'the picks you were comparing';
          cf.style.display = '';
          cf.innerHTML =
            '<span class="el-mandate-filter-ico" aria-hidden="true">⚖️</span>' +
            '<span class="el-mandate-filter-txt">Everyone’s evidence on <strong>' + _esc(issLbl || 'this issue') + '</strong>' +
              (nms.length ? ' — ' + _esc(who) + ' (<strong>' + nmTxt + '</strong>) are highlighted' : '') +
            '</span>' +
            '<button type="button" class="el-mandate-filter-clear" onclick="window._pdxEvidenceClearCompare&&window._pdxEvidenceClearCompare()">Clear ✕</button>';
        } else {
          cf.style.display = 'none';
          cf.innerHTML = '';
        }
      }
      // "Relevant to Me" context banner — shown while the saved team + reps filter
      // is active, so a visitor knows the library is narrowed to their people and
      // can clear it in one tap. The toggle's pressed state is kept in sync here.
      var rf = document.getElementById('el-relevant-filter');
      if (rf) {
        if (_state.relevant) {
          rf.style.display = '';
          // Honesty gate: when there is no saved team and no confirmed location the
          // relevant set is empty and _matches() deliberately keeps the full library
          // visible. Say so plainly rather than claiming a narrowing that isn't
          // happening, and nudge the visitor toward the action that would enable it.
          var hasRel = !!(_relevantSet && _relevantSet.size);
          rf.innerHTML =
            '<span class="el-mandate-filter-ico" aria-hidden="true">⭐</span>' +
            '<span class="el-mandate-filter-txt">' +
              (hasRel
                ? 'Showing evidence for your saved team + representatives'
                : 'No saved team or confirmed location yet — showing the full library. Add picks to My Team or set your area to focus this filter.') +
            '</span>' +
            '<button type="button" class="el-mandate-filter-clear" onclick="window._pdxEvidenceClearRelevant&&window._pdxEvidenceClearRelevant()">Clear ✕</button>';
        } else {
          rf.style.display = 'none';
          rf.innerHTML = '';
        }
      }
      var rToggle = document.getElementById('el-relevant-toggle');
      if (rToggle) {
        rToggle.classList.toggle('is-active', !!_state.relevant);
        rToggle.setAttribute('aria-pressed', _state.relevant ? 'true' : 'false');
      }
      _syncDiscovery();
      // Keep the quick-jump bar's live counts + gating in sync with every render
      // (search, filter, sort, sync merges all funnel through here).
      if (window.rebuildEvidenceNav) window.rebuildEvidenceNav();
    }

    // ── Discovery layer (Explore by Category · Featured · Recently Added) ────
    // A curated browse surface that sits above the filters. Featured/Recent are
    // built once (their ordering doesn't depend on the active filters); the
    // showcase steps aside whenever a filter or search is active so focused
    // results stay clean, while the category chips stay put as a quick filter.
    function _isDefaultState() {
      return !_state.search && !_state.category && !_state.issue && !_state.pol && !_state.type && !_state.mandate;
    }
    // How "feature-worthy" an item is: recorded video and strong sourcing lead,
    // with a gentle recency nudge so fresh, high-quality evidence rises.
    function _featScore(it) {
      var t = EL_TYPES[it.typeKey] || {};
      var score = _strengthRank(it) * 3;
      if (t.video) score += 6;
      else if (it.typeKey === 'bill') score += 2;
      if (it.url) score += 1;
      if (it.timestamp) score += 1;
      if (it.issueKey) score += 1;
      score += Math.max(0, (it.dateRank - 202000) / 100) * 0.2;
      return score;
    }
    function _featuredPick(n) {
      var pool = _items.slice().sort(function (a, b) {
        var d = _featScore(b) - _featScore(a);
        if (d) return d > 0 ? 1 : -1;
        return b.dateRank - a.dateRank;
      });
      var out = [], perPol = {};   // cap 2 per legislator so the row stays varied
      for (var i = 0; i < pool.length && out.length < n; i++) {
        var it = pool[i];
        if ((perPol[it.id] || 0) >= 2) continue;
        perPol[it.id] = (perPol[it.id] || 0) + 1;
        out.push(it);
      }
      return out;
    }
    function _recentPick(n) {
      return _items.slice().sort(function (a, b) {
        if (b.dateRank !== a.dateRank) return b.dateRank - a.dateRank;
        return a.name.localeCompare(b.name);
      }).slice(0, n);
    }
    // Build the showcase + category chips once after the library loads.
    function _renderDiscovery() {
      if (!_items) return;
      var qcRow = document.getElementById('el-qc-row');
      if (qcRow) {
        var counts = {};
        _items.forEach(function (it) { counts[it.category] = (counts[it.category] || 0) + 1; });
        var cats = (typeof window._pdxEvidenceCategories === 'function') ? window._pdxEvidenceCategories() : [];
        qcRow.innerHTML = cats.filter(function (c) { return counts[c.key]; }).map(function (c) {
          return '<button type="button" class="el-qc el-cat-c-' + _esc(c.key) + (_state.category === c.key ? ' is-active' : '') +
            '" data-cat="' + _esc(c.key) + '">' +
            '<span class="el-qc-ico" aria-hidden="true">' + _esc(c.icon) + '</span>' + _esc(c.label) +
            ' <span class="el-qc-n">' + counts[c.key] + '</span></button>';
        }).join('');
      }
      var fg = document.getElementById('el-feat-grid');
      if (fg) fg.innerHTML = _featuredPick(6).map(function (it) { return _cardHtml(it, { featured: true }); }).join('');
      var rr = document.getElementById('el-recent-rail');
      if (rr) rr.innerHTML = _recentPick(10).map(function (it) { return _cardHtml(it, { recent: true }); }).join('') +
        '<button type="button" class="el-recent-cta" id="el-recent-more">' +
          '<span class="el-recent-cta-ico" aria-hidden="true">→</span>' +
          '<span>See all newest</span>' +
          '<span class="el-recent-cta-sub">Browse the full library, newest first</span>' +
        '</button>';
    }
    // Jump from the showcase into the full, unfiltered library sorted newest-first
    // — the destination for the "See all newest" rail CTA.
    function _browseNewest() {
      _state = { search: '', category: '', issue: '', pol: '', type: '', mandate: '', sort: 'date_desc', compare: null, relevant: false };
      var s = document.getElementById('el-f-search');
      var clear = document.getElementById('el-search-clear');
      var cat = document.getElementById('el-f-category');
      var iss = document.getElementById('el-f-issue');
      var pol = document.getElementById('el-f-pol');
      var sort = document.getElementById('el-f-sort');
      if (s) s.value = ''; if (clear) clear.hidden = true;
      if (cat) cat.value = ''; if (iss) iss.value = ''; if (pol) pol.value = '';
      if (sort) sort.value = 'date_desc';
      var wrap = document.getElementById('el-types');
      if (wrap) wrap.querySelectorAll('.el-chip').forEach(function (c) {
        c.classList.toggle('is-active', !c.getAttribute('data-type'));
      });
      _updatePolBridge();
      _render();
      var tb = document.querySelector('#evidence-locker .el-toolbar');
      if (tb && tb.scrollIntoView) tb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Keep the showcase visibility + active category chip in step with filters.
    function _syncDiscovery() {
      var qc = document.getElementById('el-quickcats');
      var sc = document.getElementById('el-showcase');
      if (qc) qc.style.display = _items ? '' : 'none';
      if (sc) sc.style.display = (_items && _isDefaultState()) ? '' : 'none';
      var row = document.getElementById('el-qc-row');
      if (row) row.querySelectorAll('.el-qc').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-cat') === _state.category);
      });
    }

    // ── Detail modal ───────────────────────────────────────────────────────
    // Clicking a card opens a clean detail view: the full headline + summary,
    // the direct source link, and everything PolitiDex has connected to it on
    // the same issue — the member's Promises (with kept/broken/pending verdict)
    // and their other evidence on that issue.
    var _lastFocus = null;

    function _verdictLabel(v) {
      return v === 'kept' ? 'Kept' : v === 'broken' ? 'Broken' : 'Pending';
    }

    function _relRowHtml(o) {
      var rt = EL_TYPES[o.typeKey] || EL_TYPES.statement;
      return '<button type="button" class="el-rel" data-rel-uid="' + _esc(o.uid) + '">' +
        '<span class="el-rel-icon ' + (rt.video ? 't-video' : '') + '">' + rt.icon + '</span>' +
        '<span class="el-rel-body">' +
          '<span class="el-rel-type">' + _esc(rt.label) + (o.date ? ' · ' + _esc(o.date) : '') + '</span>' +
          '<span class="el-rel-head">' + _esc(o.headline) + '</span>' +
        '</span>' +
        '<span class="el-rel-arrow" aria-hidden="true">→</span>' +
      '</button>';
    }

    function _promRowHtml(p) {
      var v = (p.verdict === 'kept' || p.verdict === 'broken') ? p.verdict : 'pending';
      return '<div class="el-prom">' +
        '<span class="el-prom-dot ' + v + '" aria-hidden="true"></span>' +
        '<div class="el-prom-body">' +
          '<div class="el-prom-row">' +
            '<span class="el-prom-title">' + _esc(p.title) + '</span>' +
            '<span class="el-prom-verdict ' + v + '">' + _verdictLabel(v) + '</span>' +
          '</div>' +
          (p.detail ? '<div class="el-prom-detail">' + _esc(String(p.detail).replace(/<[^>]*>/g, '')) + '</div>' : '') +
        '</div>' +
      '</div>';
    }

    // The "Connected on this issue" block: Promises + other evidence the same
    // member has on the same issueKey as the open item.
    function _connectedHtml(it) {
      var first = (it.name || '').split(' ').slice(-1)[0] || it.name;
      var hasIssue = !!it.issueKey;
      var proms = (hasIssue && _promsByPol[it.id])
        ? _promsByPol[it.id].filter(function (p) { return p.issueKey === it.issueKey; })
        : [];
      var related = (hasIssue && _items)
        ? _items.filter(function (o) { return o.uid !== it.uid && o.id === it.id && o.issueKey === it.issueKey; })
        : [];

      var head = '<div class="el-connected-title">🔗 Connected on this issue</div>';
      var sub;
      if (hasIssue) {
        sub = '<div class="el-connected-sub">Other Promises and evidence from <strong>' + _esc(first) +
          '</strong> on <strong>' + _esc(it.issueLabel) + '</strong>.</div>';
      } else {
        sub = '<div class="el-connected-sub">This item isn’t tagged to a specific issue yet.</div>';
      }

      var body = '';
      if (proms.length) {
        body += '<div class="el-subhead">Promises on this issue <span class="el-subcount">' + proms.length + '</span></div>';
        body += proms.map(_promRowHtml).join('');
      }
      if (related.length) {
        body += '<div class="el-subhead">More evidence on this issue <span class="el-subcount">' + related.length + '</span></div>';
        body += related.map(_relRowHtml).join('');
      }
      if (!proms.length && !related.length) {
        body += '<div class="el-connected-empty">' + (hasIssue
          ? 'No other Promises or evidence from ' + _esc(first) + ' on this issue yet — this is the only item so far.'
          : 'No connected Promises or evidence to show for this item yet.') + '</div>';
      }

      // People's Mandate tie — if this issue is one citizens are actively voting
      // on, surface the reform(s) and a one-tap jump to it, so the evidence
      // connects outward to what the public is demanding, not just inward to the
      // official's own record.
      var mandate = (hasIssue && typeof window._pdxMandateForIssue === 'function')
        ? window._pdxMandateForIssue(it.issueKey) : [];
      if (mandate.length) {
        var jsKey = String(it.issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var names = mandate.map(function (m) { return '<span class="el-mandate-pill">' + (m.icon || '📜') + ' ' + _esc(m.name) + '</span>'; }).join('');
        body += '<div class="el-subhead" style="margin-top:0.75rem;">📜 The People’s Mandate</div>' +
          '<div class="el-connected-sub">This issue is part of a reform citizens are voting on in The People’s Mandate.</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin:0.35rem 0 0.5rem;">' + names + '</div>' +
          '<button type="button" class="el-btn el-btn-prof" style="width:100%;" ' +
            'onclick="window._pdxMandateFocus&&window._pdxMandateFocus(\'' + jsKey + '\');">📜 See this in The People’s Mandate →</button>';
      }

      // Community Exchange bridge — a single subtle link out to community
      // discussion on this issue. Rendered hidden and revealed after the modal
      // mounts only when relevant posts exist, so the curated detail view never
      // shows a dead-end link or embeds community content.
      if (hasIssue) {
        body += '<button type="button" class="el-cee-link el-cee-link-modal" hidden ' +
          'data-cee-issue="' + _esc(it.issueKey) + '" data-cee-label="' + _esc(it.issueLabel || '') + '">' +
          '💬 See community discussion on ' + _esc(it.issueLabel) +
          '<span class="el-cee-count" hidden></span> →</button>';
      }

      return '<div class="el-connected">' + head + sub + body + '</div>';
    }

    function _modalContentHtml(it) {
      var t = EL_TYPES[it.typeKey] || EL_TYPES.statement;
      var srcLabel = t.video ? 'Watch the video' :
        it.typeKey === 'x_post' ? 'View the X post' :
        it.typeKey === 'facebook' ? 'View the Facebook post' :
        it.typeKey === 'bill' ? 'View the bill record' : 'Open the source';
      var ts = (t.video && it.timestamp) ? ' · ' + _esc(it.timestamp) : '';
      var srcBtn = it.url
        ? '<div class="el-modal-src-wrap">' +
            '<a class="el-modal-src' + (t.video ? '' : ' is-plain') + '" href="' + _esc(it.url) +
              '" target="_blank" rel="noopener noreferrer">' + t.icon + ' ' + srcLabel + ts + ' ↗</a>' +
            (it.sourceLabel ? '<span class="el-modal-srcmeta">Source: ' + _esc(it.sourceLabel) + '</span>' : '') +
          '</div>'
        : '<div class="el-modal-src-wrap"><span class="el-modal-srcmeta">No public source link recorded for this item.</span></div>';

      var issueChip = it.issueKey
        ? '<button type="button" class="el-issue el-issue-btn" data-el-issue="' + _esc(it.issueKey) + '" title="See all evidence on ' + _esc(it.issueLabel) + '">' + _esc(it.issueLabel) + '</button>'
        : '<span class="el-issue">General</span>';
      var dateChip = it.date ? '<span class="el-date">' + _esc(it.date) + '</span>' : '';
      // Hero media: the video gets a large cinematic thumbnail, a bill its record
      // tile, and a quote-bearing type its pull-quote. When the quote already
      // carries the item's text we drop the duplicate summary line below it.
      var quoteTypes = { x_post: 1, statement: 1, facebook: 1, audio: 1 };
      var quoteText = quoteTypes[it.typeKey]
        ? String(it.facts || (it.typeKey === 'x_post' ? it.headline : '') || '').replace(/<[^>]*>/g, '').trim()
        : '';
      var media = '';
      if (t.video) media = _videoTileHtml(it);
      else if (it.typeKey === 'bill') media = _billTileHtml(it);
      else if (quoteText) media = '<blockquote class="el-quote el-quote-lg">' + _esc(quoteText) + '</blockquote>';
      var mediaBlock = media ? '<div class="el-modal-media">' + media + '</div>' : '';
      var summary = it.facts
        ? _esc(String(it.facts).replace(/<[^>]*>/g, ''))
        : 'No summary recorded for this item — open the source for the full context.';
      // Skip the prose summary when the pull-quote above already shows it verbatim.
      var summaryBlock = quoteText ? '' : '<div class="el-modal-summary">' + summary + '</div>';
      var first = (it.name || '').split(' ').slice(-1)[0] || it.name;
      var profBtn = '<div class="el-modal-prof"><button type="button" class="el-btn el-btn-prof" onclick="if(window._pdxElCloseModal)window._pdxElCloseModal();if(typeof showProfile===\'function\')showProfile(\'' +
        _esc(it.id) + '\')">View ' + _esc(first) + '’s full profile →</button></div>';

      return _catHeadHtml(it, 'modal') +
        '<div class="el-modal-top">' +
          '<span class="el-badge ' + t.badge + '">' + t.icon + ' ' + _esc(t.label) + '</span>' +
          _strengthHtml(it) +
          issueChip + _elCardStanceChip(it) + dateChip + _powerBadgeHtml(it) +
        '</div>' +
        '<div class="el-modal-pol">' + _esc(it.name) +
          (it.office ? '<span class="el-office">' + _esc(it.office) + (it.district && String(it.district).indexOf(it.office) === -1 ? ' · ' + _esc(it.district) : '') + '</span>' : '') +
        '</div>' +
        '<h3 class="el-modal-headline" id="el-modal-headline">' + _esc(it.headline) + '</h3>' +
        mediaBlock +
        summaryBlock +
        srcBtn +
        _connectedHtml(it) +
        profBtn;
    }

    function _openModal(uid) {
      _openModalItem(_itemsByUid[uid]);
    }
    function _openModalItem(it) {
      var overlay = document.getElementById('el-modal-overlay');
      var inner = document.getElementById('el-modal-inner');
      if (!it || !overlay || !inner) return;
      inner.innerHTML = _modalContentHtml(it);
      inner.scrollTop = 0;
      _enhanceCommunityLinks(inner);
      if (overlay.hidden) {
        overlay.hidden = false;
        void overlay.offsetWidth; // reflow so the transition runs
      }
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (!_lastFocus) _lastFocus = document.activeElement;
      var closeBtn = document.getElementById('el-modal-close');
      if (closeBtn) closeBtn.focus();
    }

    function _closeModal() {
      var overlay = document.getElementById('el-modal-overlay');
      if (!overlay || overlay.hidden) return;
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { if (!overlay.classList.contains('is-open')) overlay.hidden = true; }, 220);
      if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch (e) {} }
      _lastFocus = null;
    }

    function _wireModal() {
      var results = document.getElementById('el-results');
      var overlay = document.getElementById('el-modal-overlay');
      var closeBtn = document.getElementById('el-modal-close');
      var inner = document.getElementById('el-modal-inner');

      // Open from a card — but let the inline source link / profile button keep
      // their own behavior (don't hijack a real <a>/<button> click).
      if (results) {
        results.addEventListener('click', function (e) {
          if (e.target.closest('a, button')) return;
          var card = e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) _openModal(card.getAttribute('data-uid'));
        });
        results.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          var card = e.target.closest && e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) { e.preventDefault(); _openModal(card.getAttribute('data-uid')); }
        });
      }
      if (closeBtn) closeBtn.addEventListener('click', _closeModal);
      if (overlay) overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _closeModal(); // click on the dimmed backdrop
      });
      // Featured + Recently Added cards open the same detail modal. Their inline
      // video thumbnail / source link / profile button keep their own behavior.
      var showcase = document.getElementById('el-showcase');
      if (showcase) {
        showcase.addEventListener('click', function (e) {
          if (e.target.closest('#el-recent-more')) { _browseNewest(); return; }
          if (e.target.closest('a, button')) return;
          var card = e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) _openModal(card.getAttribute('data-uid'));
        });
        showcase.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          var card = e.target.closest && e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) { e.preventDefault(); _openModal(card.getAttribute('data-uid')); }
        });
      }
      // Jump between connected evidence items without leaving the modal.
      if (inner) inner.addEventListener('click', function (e) {
        var rel = e.target.closest('.el-rel');
        if (rel && rel.getAttribute('data-rel-uid')) _openModal(rel.getAttribute('data-rel-uid'));
      });
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape' && e.key !== 'Esc') return;
        // The save modal stacks above the detail modal — let it take Escape first
        // so one press peels off only the topmost layer.
        var save = document.getElementById('el-save-overlay');
        if (save && !save.hidden) return;
        _closeModal();
      });
      window._pdxElCloseModal = _closeModal; // let the in-modal profile button dismiss first
    }

    // Lazy-load full Firestore docs for the roster, with a small concurrency cap,
    // then build + render. Robust by construction: every per-member fetch is
    // bounded by a timeout and an overall watchdog guarantees the section is
    // resolved (rendered or shown an error) even if Firestore reads hang — a
    // single stalled `.get()` on a flaky network used to strand the whole locker
    // on its spinner forever. Falls back gracefully to whatever data is already
    // in memory if the lazy loader is unavailable.
    var _finished = false;       // finish() is one-shot per _load run
    var _loadWatchdog = null;

    // Resolve a profile fetch but never wait longer than `ms`. Firestore's
    // `.get()` can stay pending indefinitely when offline/throttled (it neither
    // resolves nor rejects), so we race it against a timer and move on — the real
    // fetch still completes and caches in the background if it ever arrives.
    function _ensureWithTimeout(id, ms) {
      var p;
      try {
        p = (typeof window._pdxEnsureFullProfile === 'function')
          ? window._pdxEnsureFullProfile(id) : null;
      } catch (e) { p = null; }
      // Guard against a non-thenable return (the source of "Cannot read properties
      // of undefined (reading 'then')") so the loader can never crash on it.
      if (!p || typeof p.then !== 'function') p = Promise.resolve(null);
      return new Promise(function (resolve) {
        var settled = false;
        var t = setTimeout(function () { if (!settled) { settled = true; resolve(null); } }, ms);
        p.then(function () {}, function () {}).then(function () {
          if (!settled) { settled = true; clearTimeout(t); resolve(null); }
        });
      });
    }

    // Replace the spinner with a clear error + a Retry button.
    function _showError(msg) {
      _loading = false;
      if (_loadWatchdog) { clearTimeout(_loadWatchdog); _loadWatchdog = null; }
      var resultsEl = document.getElementById('el-results');
      if (resultsEl) resultsEl.innerHTML = '';
      var status = document.getElementById('el-status');
      if (!status) return;
      status.style.display = '';
      status.className = 'el-status is-error';
      status.innerHTML =
        '<div class="el-err-ico" aria-hidden="true">⚠️</div>' +
        '<div class="el-err-title">' + _esc(msg || 'Couldn’t load the evidence library.') + '</div>' +
        '<div class="el-err-sub">Check your connection and try again.</div>' +
        '<button type="button" class="el-retry" id="el-retry">↻ Retry</button>';
      var btn = document.getElementById('el-retry');
      if (btn) btn.addEventListener('click', function () {
        status.className = 'el-status';
        _loaded = false; _loading = false; _finished = false;
        _load();
      });
    }

    function _load() {
      if (_loaded || _loading) return;
      _loading = true;
      _finished = false;
      var status = document.getElementById('el-status');
      // Priority wave: sitting Utah legislators only. The common Utah-focused
      // experience paints fast and never waits on the broader federal/2026-
      // candidate roster — that streams in afterwards via _loadExtended(), so a
      // visitor who only cares about Utah pays nothing for the wider data.
      var ids = _roster('utah');
      if (!ids.length) ids = _roster('all');  // no Utah seats indexed yet — fall back

      // An empty roster means the profile index hasn't arrived yet. If the loader
      // is gone or the roster errored out, surface a retry; otherwise the data is
      // probably still streaming in — wait briefly and try again rather than
      // rendering a permanently empty locker.
      if (!ids.length) {
        _loading = false;
        if (typeof window._pdxEnsureFullProfile !== 'function' || window._pdxRosterState === 'error') {
          _showError('Couldn’t load the evidence library.');
        } else {
          setTimeout(function () { if (!_loaded && !_loading) _load(); }, 1500);
        }
        return;
      }

      if (status) {
        status.style.display = '';
        status.className = 'el-status';
        status.innerHTML = '<span class="el-loading-mark">' + _EL_EYE_SVG + '</span>' +
          '<span class="el-spin"></span>Building the Digital Library — evidence from ' + ids.length + ' Utah legislators…';
      }
      // Show shimmer placeholders in the grid while the per-member docs stream in,
      // so the section reads as "filling up" rather than empty-then-popped.
      var resultsEl = document.getElementById('el-results');
      if (resultsEl) resultsEl.innerHTML = _skelHtml(6);

      var i = 0, active = 0, done = 0, total = ids.length, LIMIT = 6;
      function finish() {
        if (_finished) return;
        _finished = true;
        if (_loadWatchdog) { clearTimeout(_loadWatchdog); _loadWatchdog = null; }
        try {
          _items = _build();
        } catch (e) {
          console.error('Evidence Locker build failed:', e);
          _showError('Something went wrong building the evidence library.');
          return;
        }
        _populateFilters();
        _renderDiscovery();
        if (status) { status.style.display = 'none'; status.className = 'el-status'; }
        _loaded = true; _loading = false;
        // A profile may have asked to open the locker pre-filtered before the
        // data finished loading — honour that now, otherwise just render.
        if (_pendingOpen) { var po = _pendingOpen; _pendingOpen = null; _applyOpen(po); }
        else _render();
        if (_polActive) _renderPolView();
        if (_issueActive) _renderIssueView();
        // Let dependent surfaces (the People's Mandate reform cards' live
        // on-record counts) refresh now that the evidence index exists.
        try { document.dispatchEvent(new CustomEvent('pdx-evidence-ready')); } catch (e) {}
        // Now broaden: stream the federal + 2026-candidate + statewide-exec
        // roster in the background and refresh once it lands, so the Mandate
        // on-record counts become representative without delaying the Utah-first
        // paint above. No-op if already started or if there is nothing extra.
        _loadExtended();
      }
      if (typeof window._pdxEnsureFullProfile !== 'function') { finish(); return; }

      // Overall watchdog: however slow the network, replace the spinner with
      // whatever evidence has arrived within this window so the section never
      // hangs. Late docs still cache for next time.
      _loadWatchdog = setTimeout(function () {
        console.warn('Evidence Locker: load watchdog fired at', done, 'of', total, 'profiles.');
        finish();
      }, 15000);

      function pump() {
        while (active < LIMIT && i < total) {
          var id = ids[i++]; active++;
          _ensureWithTimeout(id, 8000).then(function () {
            active--; done++;
            if (status && !_finished) status.innerHTML = '<span class="el-spin"></span>Loading evidence… ' + done + '/' + total;
            if (done === total) finish(); else pump();
          });
        }
      }
      pump();
    }

    // Restore the visible filter controls to the active `_state` after the
    // dropdowns/chips are rebuilt. _populateFilters() wipes and re-adds options,
    // which would otherwise leave a control showing its first option while a
    // filter is still applied. Safe because the broadened roster is a superset —
    // any previously-selected value still exists in the rebuilt list.
    function _syncControls() {
      var cat = document.getElementById('el-f-category');
      var iss = document.getElementById('el-f-issue');
      var pol = document.getElementById('el-f-pol');
      if (cat) cat.value = _state.category;
      if (iss) iss.value = _state.issue;
      if (pol) pol.value = _state.pol;
      var wrap = document.getElementById('el-types');
      if (wrap) wrap.querySelectorAll('.el-chip').forEach(function (c) {
        c.classList.toggle('is-active', (c.getAttribute('data-type') || '') === _state.type);
      });
    }

    // Background pass over the broadened roster — every in-scope politician who
    // ISN'T a sitting Utah legislator (federal officials, statewide executives,
    // and 2026 candidates). Runs once, only after the Utah priority wave has
    // already painted, so Utah-only visitors never pay for data they don't need.
    // When it finishes it rebuilds the evidence index, refreshes the filters +
    // discovery showcase + visible results (re-syncing any active filter), and
    // re-fires `pdx-evidence-ready` so the People's Mandate reform cards upgrade
    // their live "on the record" counts in place.
    var _extStarted = false;
    function _loadExtended() {
      if (_extStarted) return;
      _extStarted = true;
      if (typeof window._pdxEnsureFullProfile !== 'function') return;
      var utahSet = Object.create(null);
      _roster('utah').forEach(function (id) { utahSet[id] = 1; });
      var ids = _roster('all').filter(function (id) { return !utahSet[id]; });
      if (!ids.length) return;
      var i = 0, active = 0, done = 0, total = ids.length, LIMIT = 4;
      function rebuild() {
        try { _items = _build(); }
        catch (e) { console.error('Evidence Locker extended build failed:', e); return; }
        _populateFilters();
        _syncControls();
        _renderDiscovery();
        _render();
        if (_polActive) _renderPolView();
        if (_issueActive) _renderIssueView();
        try { document.dispatchEvent(new CustomEvent('pdx-evidence-ready')); } catch (e) {}
      }
      function pump() {
        while (active < LIMIT && i < total) {
          var id = ids[i++]; active++;
          _ensureWithTimeout(id, 8000).then(function () {
            active--; done++;
            if (done === total) rebuild(); else pump();
          });
        }
      }
      pump();
    }

    function _wire() {
      var s = document.getElementById('el-f-search');
      var clear = document.getElementById('el-search-clear');
      var cat = document.getElementById('el-f-category');
      var iss = document.getElementById('el-f-issue');
      var pol = document.getElementById('el-f-pol');
      var sort = document.getElementById('el-f-sort');
      var reset = document.getElementById('el-reset');
      var searchTimer = null;
      if (s) s.addEventListener('input', function () {
        if (clear) clear.hidden = !s.value;
        clearTimeout(searchTimer);
        // Debounce so typing stays smooth even across the full evidence set.
        searchTimer = setTimeout(function () {
          _state.search = s.value.trim().toLowerCase();
          _render();
        }, 120);
      });
      if (clear) clear.addEventListener('click', function () {
        if (s) s.value = '';
        clear.hidden = true; _state.search = '';
        _render(); if (s) s.focus();
      });
      if (cat) cat.addEventListener('change', function () { _state.category = cat.value; _state.compare = null; _render(); });
      if (iss) iss.addEventListener('change', function () { _state.issue = iss.value; _state.compare = null; _render(); });
      if (pol) pol.addEventListener('change', function () { _state.pol = pol.value; _state.compare = null; _updatePolBridge(); _render(); });
      if (sort) sort.addEventListener('change', function () { _state.sort = sort.value; _render(); });

      // "Relevant to Me" toggle — flips the saved team + reps filter on/off and
      // re-renders. _render() rebuilds the relevant pid set, shows/hides the
      // banner, and syncs this button's active/pressed state.
      var relToggle = document.getElementById('el-relevant-toggle');
      if (relToggle) relToggle.addEventListener('click', function () {
        _state.relevant = !_state.relevant;
        _render();
      });

      // The politician filter's "→ see full footprint" bridge: jump from a single
      // All Evidence politician selection straight into the By-Politician lens.
      var bridge = document.getElementById('el-pol-bridge');
      if (bridge) bridge.addEventListener('click', function (e) {
        if (e.target.closest('#el-pol-bridge-btn') && _state.pol) _enterPolView([_state.pol]);
      });

      // Explore by Category chips — a one-tap topic filter. Tapping the active
      // category again clears it. Mirrors the value into the Category dropdown
      // and nudges the filtered results into view.
      var qcRow = document.getElementById('el-qc-row');
      if (qcRow) qcRow.addEventListener('click', function (e) {
        var btn = e.target.closest('.el-qc');
        if (!btn) return;
        var k = btn.getAttribute('data-cat') || '';
        _state.category = (_state.category === k) ? '' : k;
        if (cat) cat.value = _state.category;
        _render();
        if (_state.category) {
          var tb = document.querySelector('#evidence-locker .el-toolbar');
          if (tb && tb.scrollIntoView) tb.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      if (reset) reset.addEventListener('click', function () {
        _state = { search: '', category: '', issue: '', pol: '', type: '', mandate: '', sort: 'date_desc', compare: null, relevant: false };
        if (s) s.value = ''; if (cat) cat.value = ''; if (iss) iss.value = ''; if (pol) pol.value = '';
        if (sort) sort.value = 'date_desc'; if (clear) clear.hidden = true;
        var wrap = document.getElementById('el-types');
        if (wrap) wrap.querySelectorAll('.el-chip').forEach(function (c) {
          c.classList.toggle('is-active', !c.getAttribute('data-type'));
        });
        _updatePolBridge();
        _render();
      });
      // The empty-state's own "Reset all filters" button reuses the same reset.
      var emptyReset = document.getElementById('el-empty-reset');
      if (emptyReset && reset) emptyReset.addEventListener('click', function () { reset.click(); });
    }

    // ═══════════════════ Phase 4 · Saved Collections ("My Evidence") ═══════
    // Lets a visitor bookmark individual evidence items into named personal
    // collections (e.g. "Water Issues", "My District"). Persistence mirrors the
    // rest of the site exactly: localStorage is the always-on device store, and
    // for signed-in accounts the same data is merged to/from the Firestore
    // `users/{uid}.evidence_collections` field — the identical pattern used by
    // Favourites and My Team. No new backend; saved items stay tied to the
    // logged-in Firebase user.
    var EV_COLL_KEY = 'politidex_evidence_collections';
    var _colls = {};        // collId → { id, name, order, items: { stableKey → snapshot } }
    var _saveCtx = null;    // item currently open in the save modal
    var _myevActive = false;

    // Minimal display snapshot — lets My Evidence render a saved item even after
    // a reload, before (or without) the full live evidence list being built.
    function _snap(it) {
      return {
        key: it.key, id: it.id, name: it.name, office: it.office, district: it.district,
        headline: it.headline, facts: it.facts || '', date: it.date || '', dateRank: it.dateRank || 0,
        issueKey: it.issueKey || '', issueLabel: it.issueLabel || '', typeKey: it.typeKey,
        category: it.category || '', categoryLabel: it.categoryLabel || '', categoryIcon: it.categoryIcon || '',
        typeLabel: it.typeLabel || '', url: it.url || '', timestamp: it.timestamp || '',
        sourceLabel: it.sourceLabel || '', strength: it.strength, savedAt: Date.now()
      };
    }

    function _normColl(c, id) {
      c = c || {};
      return {
        id: c.id || id, name: c.name || 'Saved', order: c.order || 0,
        items: (c.items && typeof c.items === 'object') ? c.items : {}
      };
    }
    // Union local + cloud on sign-in so a device's saves are never lost.
    function _mergeColls(localC, cloudC) {
      var out = {};
      Object.keys(cloudC || {}).forEach(function (id) { out[id] = _normColl(cloudC[id], id); });
      Object.keys(localC || {}).forEach(function (id) {
        var lc = _normColl(localC[id], id);
        if (!out[id]) { out[id] = lc; return; }
        Object.keys(lc.items || {}).forEach(function (k) { if (!out[id].items[k]) out[id].items[k] = lc.items[k]; });
        if (!out[id].name && lc.name) out[id].name = lc.name;
      });
      return out;
    }

    function _persist(quiet) {
      // Route through PDXStore when present so a save/delete marks the 'evidence'
      // collection dirty for the shared tombstone/watermark sync (PDXEvidenceSync,
      // later in the file) — the same foundation Saved and Team use. PDXStore.write
      // still persists to this exact localStorage key, so every read below is
      // unaffected; a direct-localStorage fallback keeps the local-only experience
      // intact when the store is absent. The legacy Firestore backup is unchanged
      // (kept so pre-sync clients keep interoperating).
      if (window.PDXStore) { try { window.PDXStore.write(EV_COLL_KEY, _colls, { collection: 'evidence' }); } catch (e) { try { localStorage.setItem(EV_COLL_KEY, JSON.stringify(_colls)); } catch (e2) {} } }
      else { try { localStorage.setItem(EV_COLL_KEY, JSON.stringify(_colls)); } catch (e) {} }
      var user = (window.auth && window.auth.currentUser) ? window.auth.currentUser : null;
      if (user && !user.isAnonymous && window.db) {
        window.db.collection('users').doc(user.uid).set({ evidence_collections: _colls }, { merge: true })
          .then(function () { if (!quiet && typeof window._showAccountSaveToast === 'function') window._showAccountSaveToast(); })
          .catch(function (e) { console.warn('Save evidence collections failed:', e); });
      }
    }
    function _loadLocal() {
      try {
        var s = localStorage.getItem(EV_COLL_KEY);
        if (s) { var p = JSON.parse(s); if (p && typeof p === 'object') _colls = p; }
      } catch (e) { _colls = {}; }
    }

    // Our own auth listener (Firebase supports multiple) keeps collections in
    // sync with the signed-in account without disturbing the page's main flow.
    var _cloudWired = false;
    function _wireCloud() {
      if (_cloudWired || !window.auth || !window.auth.onAuthStateChanged) return;
      _cloudWired = true;
      window.auth.onAuthStateChanged(function (user) {
        if (user && !user.isAnonymous && window.db) {
          window.db.collection('users').doc(user.uid).get().then(function (doc) {
            if (doc.exists) {
              var data = doc.data() || {};
              if (data.evidence_collections && typeof data.evidence_collections === 'object') {
                _colls = _mergeColls(_colls, data.evidence_collections);
              }
            }
            _persist(true);      // push any merged device-only saves up to the cloud (silently)
            _afterCollChange();
          }).catch(function (e) { console.warn('Load evidence collections failed:', e); _afterCollChange(); });
        } else {
          _afterCollChange();    // guest / anonymous — keep the localStorage copy
        }
        _updateSigninHint();
      });
    }

    function _isSaved(key) {
      if (!key) return false;
      var ids = Object.keys(_colls);
      for (var i = 0; i < ids.length; i++) {
        var c = _colls[ids[i]];
        if (c && c.items && c.items[key]) return true;
      }
      return false;
    }
    function _collList() {
      return Object.keys(_colls).map(function (id) { return _colls[id]; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    }
    function _itemCount(c) { return (c && c.items) ? Object.keys(c.items).length : 0; }
    function _totalSaved() {
      var set = {};
      _collList().forEach(function (c) { Object.keys(c.items || {}).forEach(function (k) { set[k] = 1; }); });
      return Object.keys(set).length;
    }
    function _createColl(name) {
      name = String(name || '').trim().slice(0, 48) || 'Saved';
      var id = 'col_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      _colls[id] = { id: id, name: name, order: Date.now(), items: {} };
      return id;
    }
    function _addToColl(collId, snap) {
      var c = _colls[collId]; if (!c) return;
      if (!c.items) c.items = {};
      c.items[snap.key] = snap;
      _persist(); _afterCollChange();
    }
    function _removeFromColl(collId, key) {
      var c = _colls[collId]; if (!c || !c.items) return;
      delete c.items[key];
      _persist(); _afterCollChange();
    }
    function _renameColl(collId, name) {
      var c = _colls[collId]; if (!c) return;
      c.name = String(name || '').trim().slice(0, 48) || c.name;
      _persist(); _afterCollChange();
    }
    function _deleteColl(collId) {
      delete _colls[collId];
      _persist(); _afterCollChange();
    }

    // Resolve a stableKey back to a renderable item — preferring the live built
    // item (so the detail modal gets full "connected" data), falling back to the
    // stored snapshot.
    function _resolveItem(key) {
      if (_itemsByKey[key]) return _itemsByKey[key];
      var ids = Object.keys(_colls);
      for (var i = 0; i < ids.length; i++) {
        var c = _colls[ids[i]];
        if (c && c.items && c.items[key]) return c.items[key];
      }
      return null;
    }

    function _afterCollChange() {
      _updateTabCount();
      _refreshBmUI();
      if (_myevActive) _renderMyev();
    }
    function _updateTabCount() {
      var el = document.getElementById('el-myev-count');
      if (el) el.textContent = String(_totalSaved());
    }
    function _refreshBmUI() {
      document.querySelectorAll('.el-bm[data-bm-key]').forEach(function (btn) {
        var k = btn.getAttribute('data-bm-key'); var saved = _isSaved(k);
        btn.classList.toggle('is-saved', saved);
        btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
        btn.textContent = saved ? '🔖' : '🏷';
        btn.title = saved ? 'In a collection — manage' : 'Save to a collection';
      });
    }
    function _updateSigninHint() {
      var hint = document.getElementById('el-myev-signin');
      if (!hint) return;
      var user = (window.auth && window.auth.currentUser) ? window.auth.currentUser : null;
      hint.style.display = (user && !user.isAnonymous) ? 'none' : '';
    }
    function _updateSaveNote() {
      var note = document.getElementById('el-save-note');
      if (!note) return;
      var user = (window.auth && window.auth.currentUser) ? window.auth.currentUser : null;
      note.textContent = (user && !user.isAnonymous)
        ? 'Synced to your account.' : 'Saved on this device — sign in to sync across devices.';
    }

    // ── Save-to-collection modal ───────────────────────────────────────────
    function _openSave(key) {
      var it = _resolveItem(key);
      if (!it) return;
      _saveCtx = it;
      var head = document.getElementById('el-save-head');
      if (head) head.textContent = it.headline || 'this evidence';
      var input = document.getElementById('el-save-newinput');
      if (input) input.value = '';
      _renderSaveList();
      _updateSaveNote();
      var ov = document.getElementById('el-save-overlay');
      if (ov) { ov.hidden = false; void ov.offsetWidth; ov.classList.add('is-open'); }
      document.body.style.overflow = 'hidden';
    }
    function _closeSave() {
      var ov = document.getElementById('el-save-overlay');
      if (!ov) return;
      ov.classList.remove('is-open');
      setTimeout(function () { if (!ov.classList.contains('is-open')) ov.hidden = true; }, 200);
      _saveCtx = null;
      // Only release the scroll lock if the detail modal isn't still open behind us.
      var detail = document.getElementById('el-modal-overlay');
      if (!detail || detail.hidden) document.body.style.overflow = '';
    }
    function _renderSaveList() {
      var wrap = document.getElementById('el-save-list');
      if (!wrap || !_saveCtx) return;
      var key = _saveCtx.key;
      var list = _collList();
      if (!list.length) {
        wrap.innerHTML = '<div class="el-save-empty">No collections yet. Name your first one below — e.g. “Water Issues”, “My District”, or “Campaign Promises”.</div>';
        return;
      }
      wrap.innerHTML = list.map(function (c) {
        var inIt = !!(c.items && c.items[key]);
        var n = _itemCount(c);
        return '<button type="button" class="el-save-opt' + (inIt ? ' is-in' : '') + '" data-coll="' + _esc(c.id) + '">' +
          '<span class="el-save-check">' + (inIt ? '✓' : '') + '</span>' +
          '<span class="el-save-opt-body">' +
            '<span class="el-save-opt-name">' + _esc(c.name) + '</span>' +
            '<span class="el-save-opt-meta">' + n + ' item' + (n === 1 ? '' : 's') + (inIt ? ' · saved' : '') + '</span>' +
          '</span>' +
        '</button>';
      }).join('');
    }
    function _toggleInColl(collId) {
      if (!_saveCtx) return;
      var c = _colls[collId]; if (!c) return;
      var key = _saveCtx.key;
      if (c.items && c.items[key]) _removeFromColl(collId, key);
      else _addToColl(collId, _snap(_saveCtx));
      _renderSaveList();
    }
    function _createAndAdd() {
      var input = document.getElementById('el-save-newinput');
      if (!input || !_saveCtx) return;
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      var id = _createColl(name);
      _addToColl(id, _snap(_saveCtx));
      input.value = '';
      _renderSaveList();
    }

    // ── My Evidence view ───────────────────────────────────────────────────
    function _renderMyev() {
      var body = document.getElementById('el-myev-body');
      if (!body) return;
      var list = _collList();
      if (!list.length || _totalSaved() === 0) {
        body.innerHTML = '<div class="el-status" style="padding:2.5rem 1rem;">You haven’t saved any evidence yet.<br>' +
          'Browse the locker and tap <strong>🏷 Save</strong> on any card to start a collection.</div>';
        return;
      }
      body.innerHTML = list.map(function (c) {
        var items = Object.keys(c.items || {}).map(function (k) { return c.items[k]; })
          .sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
        var grid = items.length
          ? '<div class="el-grid">' + items.map(function (s) { return _cardHtml(s, { collId: c.id }); }).join('') + '</div>'
          : '<div class="el-coll-empty">No items in this collection yet — add some from the All Evidence tab.</div>';
        return '<section class="el-coll" data-coll="' + _esc(c.id) + '">' +
          '<div class="el-coll-bar">' +
            '<span class="el-coll-name">📁 ' + _esc(c.name) + ' <span class="el-coll-count">' + items.length + '</span></span>' +
            '<span class="el-coll-tools">' +
              '<button type="button" class="el-coll-tool" data-act="rename" data-coll="' + _esc(c.id) + '">Rename</button>' +
              '<button type="button" class="el-coll-tool is-danger" data-act="delete" data-coll="' + _esc(c.id) + '">Delete</button>' +
            '</span>' +
          '</div>' + grid +
        '</section>';
      }).join('');
    }

    // ═══════════════ Phase 5 · Politician View ════════════════════════════
    // A footprint-first lens over the SAME evidence index: a visitor selects one
    // or more politicians and reads only their evidence, grouped by issue, type,
    // strength or recency. It reuses _cardHtml, the detail modal and the
    // save-to-collection flow wholesale, so every card interaction is identical
    // to All Evidence — only the framing (whose receipts, how grouped) changes.

    // Distinct politicians that actually have evidence in the index, each with a
    // small stat roll-up. Rebuilt from _items so it always reflects the live
    // roster (Utah first, then the federal / 2026-candidate wave) as it streams.
    function _polRoster() {
      var map = Object.create(null);
      if (!_items) return map;
      _items.forEach(function (it) {
        var r = map[it.id] || (map[it.id] = {
          id: it.id, name: it.name, office: it.office || '', district: it.district || '',
          count: 0, strong: 0, video: 0, issues: Object.create(null),
          latest: 0, fed: _isFederalOfficial(it.office || '')
        });
        r.count++;
        if (it.strength && it.strength.level === 'strong') r.strong++;
        var t = EL_TYPES[it.typeKey]; if (t && t.video) r.video++;
        if (it.issueKey) r.issues[it.issueKey] = 1;
        if (it.dateRank > r.latest) r.latest = it.dateRank;
      });
      return map;
    }
    function _polName(id) { var r = _polRoster()[id]; return r ? r.name : id; }
    function _isPolSelected(id) { return _polSel.indexOf(id) !== -1; }
    function _polAdd(id) { if (!id || _isPolSelected(id)) return; _polSel.push(id); _polCoreSel = ''; _polIssueSel = ''; _polStancesOpen = false; _renderPolView(); }
    function _polRemove(id) { var i = _polSel.indexOf(id); if (i === -1) return; _polSel.splice(i, 1); _polCoreSel = ''; _polIssueSel = ''; _polStancesOpen = false; _renderPolView(); }
    function _polClear() { _polSel = []; _polCoreSel = ''; _polIssueSel = ''; _polStancesOpen = false; _renderPolView(); }

    // Enter the lens focused on a specific set of politicians (used by the All
    // Evidence "see full footprint" bridge and bare politician deep-links).
    function _enterPolView(ids) {
      _polSel = (ids || []).filter(Boolean);
      _polSearch = '';
      _polCoreSel = '';
      _polIssueSel = '';
      _polStancesOpen = false;
      var add = document.getElementById('el-pol-add'); if (add) add.value = '';
      var sr = document.getElementById('el-pol-search'); if (sr) sr.value = '';
      var menu = document.getElementById('el-polpick-menu'); if (menu) { menu.hidden = true; menu.innerHTML = ''; }
      _setView('pol');
    }

    // An item is in the lens when its politician is selected and it survives the
    // optional within-results text search (the same fields All Evidence searches).
    function _polMatches(it) {
      if (_polSel.indexOf(it.id) === -1) return false;
      if (_polCoreSel) {
        if (!it.issueKey) return false;
        var ci = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(it.issueKey) : null;
        if (!ci || ci.key !== _polCoreSel) return false;
      }
      if (_polIssueSel) {
        if (_polIssueSel === '__general') { if (it.issueKey) return false; }
        else if (it.issueKey !== _polIssueSel) return false;
      }
      if (_polSearch) {
        var hay = (it.name + ' ' + it.office + ' ' + it.headline + ' ' + it.facts + ' ' +
                   (it.categoryLabel || '') + ' ' + it.issueLabel + ' ' + (it.typeLabel || '')).toLowerCase();
        if (hay.indexOf(_polSearch) === -1) return false;
      }
      return true;
    }

    // Today as a year*100+month rank, matching _dateRank.
    function _polNowRank() { var d = new Date(); return d.getFullYear() * 100 + (d.getMonth() + 1); }
    // A recency bucket for an item, with a sortable rank (higher = more recent).
    function _recencyBucket(it) {
      var r = it.dateRank || 0;
      if (!r) return { key: 'undated', label: 'Undated', icon: '🗓', rank: -1 };
      var now = _polNowRank();
      var months = (Math.floor(now / 100) - Math.floor(r / 100)) * 12 + ((now % 100) - (r % 100));
      if (months <= 1)  return { key: 'm1', label: 'Just added',     icon: '✦',  rank: 1e9 };
      if (months <= 3)  return { key: 'm3', label: 'Past 3 months',  icon: '🆕', rank: 1e9 - 1 };
      if (months <= 12) return { key: 'y1', label: 'This past year', icon: '📅', rank: 1e9 - 2 };
      var yr = Math.floor(r / 100);
      return { key: 'y' + yr, label: String(yr), icon: '🗓', rank: yr };
    }
    function _rankLabel(rank) {
      if (!rank) return '';
      var yr = Math.floor(rank / 100), mo = rank % 100;
      var names = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return (mo >= 1 && mo <= 12 ? names[mo] + ' ' : '') + yr;
    }
    function _rankRange(minR, maxR) {
      if (!minR && !maxR) return '';
      var a = _rankLabel(minR), b = _rankLabel(maxR);
      return a === b ? b : (a + ' – ' + b);
    }

    // Group the lens's items by the active mode, returning ordered groups each
    // with a label, icon, optional CSS modifier, and newest-first items.
    function _polGroups(items) {
      var mode = _polGroupBy, groups = {}, order = [];
      function bucket(key, label, icon, cls, rank) {
        if (!groups[key]) { groups[key] = { key: key, label: label, icon: icon || '', cls: cls || '', rank: rank || 0, items: [] }; order.push(key); }
        return groups[key];
      }
      items.forEach(function (it) {
        if (mode === 'type') {
          var t = EL_TYPES[it.typeKey] || EL_TYPES.statement;
          bucket(it.typeKey, t.label, t.icon, '', 0).items.push(it);
        } else if (mode === 'strength') {
          var lvl = (it.strength && it.strength.level) || 'limited';
          var lab = lvl === 'strong' ? 'Strong evidence' : lvl === 'moderate' ? 'Moderate evidence' : 'Limited evidence';
          var ico = lvl === 'strong' ? '●●●' : lvl === 'moderate' ? '●●○' : '●○○';
          bucket(lvl, lab, ico, 'is-' + lvl, 0).items.push(it);
        } else if (mode === 'recency') {
          var rb = _recencyBucket(it);
          bucket(rb.key, rb.label, rb.icon, '', rb.rank).items.push(it);
        } else if (mode === 'category') {
          var ck = _catKeyOf(it) || 'other';
          var cc = _catOf(it) || { label: 'Other / General', icon: '🎯' };
          bucket(ck, cc.label, cc.icon, '', 0).items.push(it);
        } else { // issue (default)
          var key = it.issueKey || '__general';
          var label = it.issueKey ? it.issueLabel : 'General / untagged';
          bucket(key, label, it.categoryIcon || '🏷', '', 0).items.push(it);
        }
      });
      var arr = order.map(function (k) { return groups[k]; });
      if (mode === 'type') {
        arr.sort(function (a, b) { return EL_TYPE_ORDER.indexOf(a.key) - EL_TYPE_ORDER.indexOf(b.key); });
      } else if (mode === 'strength') {
        var sr = { strong: 0, moderate: 1, limited: 2 };
        arr.sort(function (a, b) { return sr[a.key] - sr[b.key]; });
      } else if (mode === 'recency') {
        arr.sort(function (a, b) { return b.rank - a.rank; });
      } else if (mode === 'category') { // most evidence first, the Other bucket last
        arr.sort(function (a, b) {
          if (a.key === 'other') return 1;
          if (b.key === 'other') return -1;
          return b.items.length - a.items.length;
        });
      } else { // issue — most evidence first, the General bucket last
        arr.sort(function (a, b) {
          if (a.key === '__general') return 1;
          if (b.key === '__general') return -1;
          return b.items.length - a.items.length;
        });
      }
      arr.forEach(function (g) { g.items.sort(function (a, b) { return b.dateRank - a.dateRank || a.name.localeCompare(b.name); }); });
      return arr;
    }

    // The selected-politician chips (each removable) + a clear-all when several.
    function _renderPolChips(roster) {
      var wrap = document.getElementById('el-pol-chips');
      if (!wrap) return;
      if (!_polSel.length) { wrap.innerHTML = ''; return; }
      var html = _polSel.map(function (id) {
        var r = roster[id] || { name: id, count: 0 };
        return '<span class="el-pol-chip">' +
          '<span class="el-pol-chip-name">' + _esc(r.name) + '</span>' +
          '<span class="el-pol-chip-n">' + (r.count || 0) + '</span>' +
          '<button type="button" class="el-pol-chip-rm" data-pol-rm="' + _esc(id) + '" aria-label="Remove ' + _esc(r.name) + '">×</button>' +
        '</span>';
      }).join('');
      if (_polSel.length > 1) {
        html += '<button type="button" class="el-pol-add-chip" id="el-pol-clear" style="border-style:dashed;">✕ Clear all</button>';
      }
      wrap.innerHTML = html;
    }

    // Quick-add suggestions shown while nothing is selected — federal profiles
    // (the newer footprints) first, then the people with the most evidence.
    function _renderPolSuggest(roster) {
      var wrap = document.getElementById('el-pol-suggest');
      if (!wrap) return;
      if (_polSel.length) { wrap.innerHTML = ''; return; }
      var ids = Object.keys(roster).filter(function (id) { return !_isPolSelected(id); });
      if (!ids.length) { wrap.innerHTML = ''; return; }
      ids.sort(function (a, b) {
        var ra = roster[a], rb = roster[b];
        if (rb.fed !== ra.fed) return rb.fed ? 1 : -1;
        return rb.count - ra.count;
      });
      wrap.innerHTML = '<span class="el-pol-suggest-lab">Suggested</span>' + ids.slice(0, 8).map(function (id) {
        var r = roster[id];
        return '<button type="button" class="el-pol-add-chip" data-pol-add="' + _esc(id) + '">' +
          '<span class="el-pac-plus" aria-hidden="true">＋</span>' + _esc(r.name) +
          (r.fed ? ' <span class="el-po-fed">Fed</span>' : '') +
          ' <span class="el-pac-n">' + r.count + '</span></button>';
      }).join('');
    }

    // The type-ahead menu of addable politicians, driven by the picker input.
    function _renderPolMenu(roster) {
      var menu = document.getElementById('el-polpick-menu');
      var input = document.getElementById('el-pol-add');
      if (!menu || !input) return;
      var q = String(input.value || '').trim().toLowerCase();
      if (!q) { menu.hidden = true; menu.innerHTML = ''; return; }
      var ids = Object.keys(roster).filter(function (id) {
        if (_isPolSelected(id)) return false;
        var r = roster[id];
        return (r.name + ' ' + r.office).toLowerCase().indexOf(q) !== -1;
      });
      ids.sort(function (a, b) {
        var ra = roster[a], rb = roster[b];
        var pa = ra.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        var pb = rb.name.toLowerCase().indexOf(q) === 0 ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return rb.count - ra.count;
      });
      menu.hidden = false;
      if (!ids.length) {
        menu.innerHTML = '<div class="el-polpick-empty">No politician with evidence matches “' + _esc(q) + '”.</div>';
        return;
      }
      menu.innerHTML = ids.slice(0, 30).map(function (id) {
        var r = roster[id];
        return '<button type="button" class="el-polpick-opt" data-pol-add="' + _esc(id) + '" role="option">' +
          '<span style="display:flex;flex-direction:column;min-width:0;">' +
            '<span class="el-po-name">' + _esc(r.name) + '</span>' +
            (r.office ? '<span class="el-po-office">' + _esc(r.office) + '</span>' : '') +
          '</span>' +
          '<span class="el-po-meta">' + (r.fed ? '<span class="el-po-fed">Fed</span>' : '') +
            '<span class="el-po-n">' + r.count + ' item' + (r.count === 1 ? '' : 's') + '</span></span>' +
        '</button>';
      }).join('');
    }

    // Stance rendering is delegated to the shared window.PDXStance helper — the
    // single source of truth for stance across the app — so the Evidence Locker
    // no longer keeps its own green ✓ / red ✗ / ~ vocabulary (the deprecated
    // _POL_STANCE_META, removed). We retain only the internal state KEYS the
    // locker's bucketing + inference pipeline speaks; each resolves to a canonical
    // PDXStance state at render time via _elStancePill():
    //   support → "Supported" (teal)        · oppose   → "Opposed" (orange-red)
    //   mixed   → "Mixed / Nuanced" (amber)  · tracking → "No Clear Position" (gray)
    var _EL_STANCE_KEYS = { support: 1, oppose: 1, mixed: 1, tracking: 1 };
    // The canonical four-state pill for one of the locker's internal stance keys.
    // Leads every stance row in By Politician and By Issue so the signal reads
    // identically to Who Stands Where, Compare, My Priorities and the profiles.
    function _elStancePill(internalKey) {
      return window.PDXStance.stancePill(window.PDXStance.resolveStance(internalKey));
    }

    // Build the "Full Stances & Positions" rows for a footprint: one row per issue
    // the selection has evidence on, paired with the politician's documented
    // position when ISSUE_STANCE_DATA carries one, plus that issue's evidence
    // count. Most-evidence first, the untagged "Other / General" bucket last —
    // the same ordering the issue grouping uses — so the list mirrors the chips
    // but goes the whole way down a person's record.
    function _polStanceRows(items) {
      // Merge documented positions across every selected politician.
      var posMap = Object.create(null);
      if (typeof window._polPositionMap === 'function') {
        _polSel.forEach(function (id) {
          var rec = (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ? CMP_DATA[id]
                  : (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id] : null;
          var pm = window._polPositionMap(id, rec) || {};
          Object.keys(pm).forEach(function (ik) {
            var st = pm[ik] && pm[ik].stance;
            if (!st) return;
            if (!posMap[ik]) posMap[ik] = st;
            else if (posMap[ik] !== st) posMap[ik] = 'mixed';
          });
        });
      }
      var buckets = Object.create(null), order = [];
      items.forEach(function (it) {
        var key = it.issueKey || '__general';
        var b = buckets[key];
        if (!b) {
          b = buckets[key] = { key: key, label: it.issueKey ? it.issueLabel : 'Other / General',
            icon: it.categoryIcon || '🏷', count: 0, stance: '', sup: 0, opp: 0 };
          order.push(key);
        }
        b.count++;
        // Tally any surface-level stance read from this item's headline, so an
        // issue with evidence but no documented position can still show a
        // best-effort Support / Oppose / Mixed instead of a flat "On record".
        if (it.stanceGuess === 'support') b.sup++;
        else if (it.stanceGuess === 'oppose') b.opp++;
        else if (it.stanceGuess === 'mixed') { b.sup++; b.opp++; }
      });
      var rows = order.map(function (k) { return buckets[k]; });
      rows.sort(function (a, b) {
        if (a.key === '__general') return 1;
        if (b.key === '__general') return -1;
        return b.count - a.count;
      });
      rows.forEach(function (r) {
        // Documented position wins; otherwise fall back to the inferred read
        // (only when the headlines actually pointed one way), else "On record".
        var st = (r.key !== '__general') ? posMap[r.key] : null;
        if (st && _EL_STANCE_KEYS[st]) { r.stance = st; return; }
        if (r.key !== '__general' && (r.sup || r.opp)) {
          r.stance = (r.sup && r.opp) ? 'mixed' : (r.sup ? 'support' : 'oppose');
          r.inferred = true;          // marks the read as derived, not documented
        } else {
          r.stance = 'tracking';
        }
      });
      return rows;
    }

    // The footprint summary band — headline counts over the whole selection
    // (independent of the within-results search, so the totals stay stable).
    function _polSummaryHtml(items, roster) {
      var strong = 0, video = 0, issues = Object.create(null), minR = 0, maxR = 0;
      var coreSeen = Object.create(null);   // core-issue key -> 1, for the priority readout
      items.forEach(function (it) {
        if (it.strength && it.strength.level === 'strong') strong++;
        var t = EL_TYPES[it.typeKey]; if (t && t.video) video++;
        if (it.issueKey) {
          issues[it.issueKey] = 1;
          var ci = (typeof window.coreIssueForKey === 'function') ? window.coreIssueForKey(it.issueKey) : null;
          if (ci) coreSeen[ci.key] = ci.label;
        }
        if (it.dateRank) {
          if (!minR || it.dateRank < minR) minR = it.dateRank;
          if (it.dateRank > maxR) maxR = it.dateRank;
        }
      });
      var issueN = Object.keys(issues).length;
      // Core National Issues coverage — how many of the priority issues this
      // footprint touches, and which. Surfaces the framework right where voters
      // browse a politician's record, so depth on the issues that matter is visible.
      var coreLabels = [], coreTotal = 0, coreList = [];
      if (Array.isArray(window.CORE_NATIONAL_ISSUES)) {
        coreTotal = window.CORE_NATIONAL_ISSUES.length;
        window.CORE_NATIONAL_ISSUES.forEach(function (ci) {
          if (coreSeen[ci.key]) { coreLabels.push(ci.label); coreList.push({ key: ci.key, label: ci.label }); }
        });
      }
      var titleTxt, officeTxt;
      if (_polSel.length === 1) {
        var r = roster[_polSel[0]] || { name: _polSel[0], office: '' };
        titleTxt = r.name + '’s evidence';
        officeTxt = r.office || '';
      } else {
        titleTxt = _polSel.length + ' politicians selected';
        officeTxt = _polSel.map(function (id) { return (roster[id] || {}).name || id; }).join(' · ');
      }
      var range = _rankRange(minR, maxR);
      var coreChips = coreList.length
        ? '<div class="el-pol-core" title="Highest-salience national issues this footprint covers — tap to filter">' +
            '<span class="el-pol-core-lab">Core national issues</span>' +
            coreList.map(function (c) {
              var on = (_polCoreSel === c.key);
              return '<button type="button" class="el-pol-core-chip' + (on ? ' active' : '') +
                '" data-core="' + _esc(c.key) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + _esc(c.label) + '</button>';
            }).join('') +
            (_polCoreSel ? '<button type="button" class="el-pol-core-clear" id="el-pol-core-clear">✕ Clear</button>' : '') +
          '</div>'
        : '';
      // Full Stances & Positions — the deeper, complete companion to the core
      // chips: every issue this footprint has evidence on, with the documented
      // position and a one-tap jump into that issue's evidence.
      var stanceRows = _polStanceRows(items);
      // When exactly one politician is in view, resolve their per-issue evidence
      // depth once (count + strongest strength tier) from the same loaded index, so
      // each stance row in the list can carry a quiet Evidence-blue tier label next
      // to its item count. Null for multi-select footprints, where a single tier
      // would be ambiguous.
      var _polDepth = (_polSel.length === 1 && typeof window._pdxEvidenceDepthForPerson === 'function')
        ? window._pdxEvidenceDepthForPerson(_polSel[0]) : null;
      var _POL_DEPTH_TINT = {
        strong:   { bg: 'rgba(96,165,250,0.20)', bd: 'rgba(96,165,250,0.55)', fg: '#bfdbfe' },
        moderate: { bg: 'rgba(96,165,250,0.13)', bd: 'rgba(96,165,250,0.40)', fg: '#a8c7fb' },
        limited:  { bg: 'rgba(96,165,250,0.08)', bd: 'rgba(96,165,250,0.28)', fg: '#93b4e6' }
      };
      var stanceToggle = '<button type="button" class="el-pol-stances-btn' + (_polStancesOpen ? ' is-open' : '') +
        '" id="el-pol-stances-toggle" aria-expanded="' + (_polStancesOpen ? 'true' : 'false') + '" aria-controls="el-pol-stances">' +
        '<span class="el-pss-ico" aria-hidden="true">📋</span>' +
        '<span class="el-pss-lab">View Full Stances &amp; Positions</span>' +
        (stanceRows.length ? '<span class="el-pss-n">' + stanceRows.length + '</span>' : '') +
        '<span class="el-pss-caret" aria-hidden="true">▸</span></button>';
      var issueBanner = '';
      if (_polIssueSel) {
        var activeRow = stanceRows.filter(function (r) { return r.key === _polIssueSel; })[0];
        var activeLbl = activeRow ? activeRow.label : (_polIssueSel === '__general' ? 'Other / General' : _polIssueSel);
        issueBanner = '<div class="el-pol-issue-active">' +
          '<span class="el-pia-lab">Showing</span>' +
          '<span class="el-pia-issue">' + _esc(activeLbl) + '</span>' +
          '<button type="button" class="el-pol-core-clear" id="el-pol-issue-clear">✕ Clear</button></div>';
      }
      var stancePanel = '';
      if (_polStancesOpen) {
        stancePanel = '<div class="el-pol-stances" id="el-pol-stances">' +
          '<div class="el-pss-head">Positions on key issues · tap one to see the evidence</div>' +
          (stanceRows.length ? stanceRows.map(function (r) {
            var on = (_polIssueSel === r.key);
            // An inferred read (headline-derived, no documented position) keeps a
            // quiet "inferred" caption + tooltip so it never reads as sourced fact;
            // the canonical pill itself stays byte-identical to every other surface.
            var inf = r.inferred && r.stance !== 'tracking';
            var infTag = inf
              ? '<span class="el-pss-inf" title="Inferred from the headlines below — not a documented position">inferred</span>'
              : '';
            var dd = _polDepth ? _polDepth[r.key] : null;
            var depthTag = dd
              ? '<span class="el-pss-depth is-' + dd.level + '" title="' + dd.count + ' item' + (dd.count === 1 ? '' : 's') +
                  ' on record — strength: ' + dd.tier + '" style="display:inline-flex;align-items:center;gap:0.22rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.54rem;letter-spacing:0.05em;text-transform:uppercase;color:' +
                  _POL_DEPTH_TINT[dd.level].fg + ';background:' + _POL_DEPTH_TINT[dd.level].bg + ';border:1px solid ' + _POL_DEPTH_TINT[dd.level].bd +
                  ';padding:0.08rem 0.4rem;border-radius:999px;line-height:1.3;white-space:nowrap;margin-left:0.3rem;">📂 ' + dd.tier + '</span>'
              : '';
            // Lead with the canonical PDXStance pill; the issue label and the
            // evidence count/depth follow as secondary metadata (Stance → Evidence).
            return '<button type="button" class="el-pss-row' + (on ? ' active' : '') +
              '" data-pol-issue="' + _esc(r.key) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
              _elStancePill(r.stance) +
              '<span class="el-pss-issue">' + _esc(r.label) + '</span>' +
              '<span class="el-pss-count">' + r.count + ' item' + (r.count === 1 ? '' : 's') + infTag + depthTag + '</span>' +
            '</button>';
          }).join('') : '<div class="el-pss-empty">No tagged stances yet for this footprint.</div>') +
        '</div>';
      }
      var stancesSection = '<div class="el-pol-stances-wrap">' + stanceToggle + issueBanner + stancePanel + '</div>';
      return '<div class="el-pol-sum-main">' +
          '<div class="el-pol-sum-titles">' +
            '<span class="el-pol-sum-eyebrow">Evidence footprint</span>' +
            '<div class="el-pol-sum-title">' + _esc(titleTxt) + '</div>' +
            (officeTxt ? '<div class="el-pol-sum-office">' + _esc(officeTxt) + '</div>' : '') +
          '</div>' +
          '<button type="button" class="el-pol-back" id="el-pol-back">← All evidence</button>' +
        '</div>' +
        '<div class="el-pol-stats">' +
          '<span class="el-pol-stat"><b>' + items.length + '</b> item' + (items.length === 1 ? '' : 's') + '</span>' +
          '<span class="el-pol-stat is-gold"><b>' + strong + '</b> strong</span>' +
          '<span class="el-pol-stat"><b>' + video + '</b> video</span>' +
          '<span class="el-pol-stat"><b>' + issueN + '</b> issue' + (issueN === 1 ? '' : 's') + '</span>' +
          (coreTotal ? '<span class="el-pol-stat is-core"><b>' + coreLabels.length + '/' + coreTotal + '</b> core issues</span>' : '') +
          (range ? '<span class="el-pol-stat">🗓 ' + _esc(range) + '</span>' : '') +
        '</div>' +
        coreChips +
        stancesSection;
    }

    // Render the summary band + the grouped result sections for the current
    // selection. Reuses _cardHtml so cards are byte-identical to All Evidence.
    // Run 3 perf: evidence-grid windowing state. _polWindow is the current card
    // budget; it resets to the default on any fresh search/filter render and grows
    // (via _polGrowWindow) as the visitor scrolls the sentinel into view.
    var _POL_WINDOW_STEP = 48;
    var _polWindow = _POL_WINDOW_STEP;
    var _polGrowing = false;
    function _polGrowWindow() {
      _polWindow += _POL_WINDOW_STEP;
      _polGrowing = true;
      try { _renderPolSummaryAndResults(_polRoster()); } finally { _polGrowing = false; }
    }

    function _renderPolSummaryAndResults(roster) {
      if (!_polGrowing) _polWindow = _POL_WINDOW_STEP;
      var summary = document.getElementById('el-pol-summary');
      var controls = document.getElementById('el-pol-controls');
      var empty = document.getElementById('el-pol-empty');
      var results = document.getElementById('el-pol-results');
      if (!results) return;

      if (!_polSel.length) {
        if (summary) summary.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (empty) empty.style.display = '';
        results.innerHTML = '';
        return;
      }
      if (empty) empty.style.display = 'none';
      if (controls) controls.style.display = '';

      if (!_items) {
        if (summary) summary.style.display = 'none';
        results.innerHTML = '<div class="el-status"><span class="el-spin"></span>Loading the evidence library…</div>';
        return;
      }

      var footprint = _items.filter(function (it) { return _polSel.indexOf(it.id) !== -1; });
      if (summary) { summary.style.display = ''; summary.innerHTML = _polSummaryHtml(footprint, roster); }

      var shown = _items.filter(_polMatches);
      if (!shown.length) {
        results.innerHTML = '<div class="el-empty" style="display:block;">' +
          '<div class="el-empty-ico" aria-hidden="true">🔍</div>' +
          '<div class="el-empty-title">No evidence matches “' + _esc(_polSearch) + '”</div>' +
          '<div class="el-empty-sub">Clear the search to see the full footprint.</div></div>';
        return;
      }
      var groups = _polGroups(shown);
      // Run 3 perf: window the evidence grid. Render cards up to a budget across
      // the groups, then a sentinel that grows the window as the visitor scrolls
      // (or on click). Any change to the search/filter resets the window to the
      // top via _polWindow; small footprints (≤ budget) render whole, unchanged.
      var _budget = _polWindow, _rendered = 0, _total = shown.length;
      var _parts = [];
      for (var _gi = 0; _gi < groups.length && _budget > 0; _gi++) {
        var g = groups[_gi];
        var _its = g.items.slice(0, _budget);
        _budget -= _its.length; _rendered += _its.length;
        _parts.push('<section class="el-polgrp' + (g.cls ? ' ' + g.cls : '') + '">' +
          '<div class="el-polgrp-head">' +
            '<span class="el-polgrp-title"><span class="el-polgrp-ico" aria-hidden="true">' + _esc(g.icon) + '</span>' + _esc(g.label) + '</span>' +
            '<span class="el-polgrp-n">' + g.items.length + '</span>' +
          '</div>' +
          '<div class="el-grid">' + _its.map(function (it) { return _cardHtml(it); }).join('') + '</div>' +
        '</section>');
      }
      if (_rendered < _total) {
        _parts.push('<div class="el-window-more" id="el-pol-more-sentinel" style="text-align:center;padding:0.75rem 0;">' +
          '<button type="button" class="el-pol-add-chip" id="el-pol-more-btn">Show more (' + (_total - _rendered) + ' more)</button></div>');
      }
      results.innerHTML = _parts.join('');
      if (_rendered < _total) {
        var _mb = document.getElementById('el-pol-more-btn');
        if (_mb) _mb.addEventListener('click', _polGrowWindow);
        var _sen = document.getElementById('el-pol-more-sentinel');
        if (_sen && 'IntersectionObserver' in window) {
          var _io = new IntersectionObserver(function (ents) {
            ents.forEach(function (e) { if (e.isIntersecting) { _io.disconnect(); _polGrowWindow(); } });
          }, { rootMargin: '400px 0px' });
          _io.observe(_sen);
        }
      }
    }

    // Top-level render for the lens — rebuilds the picker, chips, suggestions,
    // type-ahead menu and the grouped results from the live index.
    function _renderPolView() {
      var roster = _polRoster();
      _renderPolChips(roster);
      _renderPolSuggest(roster);
      _renderPolMenu(roster);
      _renderPolSummaryAndResults(roster);
    }

    // The All Evidence "→ see full footprint" bridge under the politician filter,
    // updated whenever the All Evidence politician dropdown changes.
    function _updatePolBridge() {
      var bridge = document.getElementById('el-pol-bridge');
      if (!bridge) return;
      if (!_state.pol) { bridge.style.display = 'none'; bridge.innerHTML = ''; return; }
      bridge.style.display = '';
      bridge.innerHTML = '<span class="el-pol-suggest-lab">Focus</span>' +
        '<button type="button" class="el-pol-add-chip" id="el-pol-bridge-btn">' +
        '<span class="el-pac-plus" aria-hidden="true">👤</span>See ' + _esc(_polName(_state.pol)) + '’s full evidence footprint →</button>';
    }

    // Wire the lens once. Stable parent containers carry delegated handlers so
    // the inner HTML can be re-rendered freely without re-binding.
    function _wirePolView() {
      var view = document.getElementById('el-view-pol');
      var add = document.getElementById('el-pol-add');
      var search = document.getElementById('el-pol-search');
      if (add) {
        add.addEventListener('input', function () { _renderPolMenu(_polRoster()); });
        add.addEventListener('focus', function () { if (add.value.trim()) _renderPolMenu(_polRoster()); });
      }
      // Close the type-ahead menu on an outside click.
      document.addEventListener('click', function (e) {
        var menu = document.getElementById('el-polpick-menu');
        if (!menu || menu.hidden) return;
        if (!e.target.closest('.el-polpick-bar')) { menu.hidden = true; menu.innerHTML = ''; }
      });
      if (search) {
        var t = null;
        search.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () { _polSearch = search.value.trim().toLowerCase(); _renderPolSummaryAndResults(_polRoster()); }, 120);
        });
      }
      if (view) {
        view.addEventListener('click', function (e) {
          var addBtn = e.target.closest('[data-pol-add]');
          if (addBtn) {
            var inp = document.getElementById('el-pol-add'); if (inp) inp.value = '';
            var menu = document.getElementById('el-polpick-menu'); if (menu) { menu.hidden = true; menu.innerHTML = ''; }
            _polAdd(addBtn.getAttribute('data-pol-add'));
            return;
          }
          var rm = e.target.closest('[data-pol-rm]');
          if (rm) { _polRemove(rm.getAttribute('data-pol-rm')); return; }
          if (e.target.closest('#el-pol-clear')) { _polClear(); return; }
          if (e.target.closest('#el-pol-back')) { _setView('all'); return; }
          var coreClear = e.target.closest('#el-pol-core-clear');
          if (coreClear) { _polCoreSel = ''; _renderPolSummaryAndResults(_polRoster()); return; }
          var coreBtn = e.target.closest('[data-core]');
          if (coreBtn) {
            var ck = coreBtn.getAttribute('data-core') || '';
            _polCoreSel = (_polCoreSel === ck) ? '' : ck;
            _polIssueSel = '';   // the broad core filter and the specific-issue filter are mutually exclusive
            _renderPolSummaryAndResults(_polRoster());
            return;
          }
          // Full Stances & Positions — toggle the panel, clear the active issue, or
          // jump straight into one issue's evidence.
          if (e.target.closest('#el-pol-stances-toggle')) {
            _polStancesOpen = !_polStancesOpen;
            _renderPolSummaryAndResults(_polRoster());
            return;
          }
          if (e.target.closest('#el-pol-issue-clear')) {
            _polIssueSel = '';
            _renderPolSummaryAndResults(_polRoster());
            return;
          }
          var stanceRow = e.target.closest('[data-pol-issue]');
          if (stanceRow) {
            var ik = stanceRow.getAttribute('data-pol-issue') || '';
            _polIssueSel = (_polIssueSel === ik) ? '' : ik;
            _polCoreSel = '';            // the specific-issue filter supersedes the core grouping
            _polStancesOpen = false;     // collapse so the filtered evidence is immediately visible
            _renderPolSummaryAndResults(_polRoster());
            return;
          }
          var gb = e.target.closest('.el-polgroup-btn');
          if (gb) {
            _polGroupBy = gb.getAttribute('data-group') || 'issue';
            view.querySelectorAll('.el-polgroup-btn').forEach(function (b) { b.classList.toggle('is-active', b === gb); });
            _renderPolSummaryAndResults(_polRoster());
            return;
          }
          // Open the detail modal from a card — but never hijack an inline
          // link/button (source link, profile button, bookmark).
          if (e.target.closest('a, button')) return;
          var card = e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) _openModalItem(_itemsByUid[card.getAttribute('data-uid')]);
        });
        view.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
          var card = e.target.closest && e.target.closest('.el-card');
          if (card && card.getAttribute('data-uid')) { e.preventDefault(); _openModalItem(_itemsByUid[card.getAttribute('data-uid')]); }
        });
      }
    }

    // ── By Issue · Issue Gateway Cards ───────────────────────────────────────
    // Roll the flat evidence index up into one gateway per tracked issue. Each
    // gateway counts the distinct politicians on record and splits them by the
    // SAME headline-inferred stance read the By-Politician "Full Stances" rows
    // use: a politician supports if their items only point that way, opposes if
    // only the other, mixed if both, or is merely "on record" when no headline
    // gives a direction. Reuses every field already on the item (issueKey,
    // issueLabel, categoryIcon, categoryLabel, stanceGuess) so there is no second
    // data source to keep in sync. Sorted most-covered issue first.
    function _issueGateways() {
      if (!_items) return [];
      var byIssue = Object.create(null);
      _items.forEach(function (it) {
        if (!it.issueKey) return;   // only tracked issues become gateways
        var g = byIssue[it.issueKey];
        if (!g) g = byIssue[it.issueKey] = {
          key: it.issueKey, label: it.issueLabel || it.issueKey,
          icon: it.categoryIcon || '🎯', categoryLabel: it.categoryLabel || '',
          items: 0, pols: Object.create(null)
        };
        g.items++;
        var p = g.pols[it.id];
        if (!p) p = g.pols[it.id] = { sup: 0, opp: 0 };
        if (it.stanceGuess === 'support') p.sup++;
        else if (it.stanceGuess === 'oppose') p.opp++;
        else if (it.stanceGuess === 'mixed') { p.sup++; p.opp++; }
      });
      var out = [];
      Object.keys(byIssue).forEach(function (k) {
        var g = byIssue[k];
        var ids = Object.keys(g.pols);
        var sup = 0, opp = 0, mix = 0, rec = 0;
        ids.forEach(function (id) {
          var p = g.pols[id];
          if (p.sup && p.opp) mix++;
          else if (p.sup) sup++;
          else if (p.opp) opp++;
          else rec++;
        });
        out.push({ key: g.key, label: g.label, icon: g.icon, categoryLabel: g.categoryLabel,
          items: g.items, pols: ids.length, sup: sup, opp: opp, mix: mix, rec: rec });
      });
      out.sort(function (a, b) {
        if (b.pols !== a.pols) return b.pols - a.pols;
        if (b.items !== a.items) return b.items - a.items;
        return a.label.localeCompare(b.label);
      });
      return out;
    }

    function _issueCardHtml(g) {
      var sts = '';
      if (g.sup) sts += '<span class="el-ig-st is-support">✓ ' + g.sup + ' Support' + (g.sup === 1 ? 's' : '') + '</span>';
      if (g.opp) sts += '<span class="el-ig-st is-oppose">✕ ' + g.opp + ' Oppose' + (g.opp === 1 ? 's' : '') + '</span>';
      if (g.mix) sts += '<span class="el-ig-st is-mixed">~ ' + g.mix + ' Mixed</span>';
      if (g.rec) sts += '<span class="el-ig-st is-rec">• ' + g.rec + ' On record</span>';
      // Quiet community-activity hint, scannable alongside the stance chips. A
      // static span (the whole card is a button) revealed only when the issue has
      // posts — same cached count, so the grid stays clean for quiet issues.
      var ceeTag = '<span class="el-cee-tag" hidden data-cee-issue="' + _esc(g.key) +
        '" data-cee-label="' + _esc(g.label || '') + '">' +
        '<span class="el-cee-tag-ico" aria-hidden="true">💬</span><span class="el-cee-tag-n"></span></span>';
      return '<button type="button" class="el-issue-card" role="listitem" data-el-issue-gw="' + _esc(g.key) + '" ' +
        'aria-label="Explore evidence on ' + _esc(g.label) + ' — ' + g.pols + ' politician' + (g.pols === 1 ? '' : 's') + ' on record">' +
        '<div class="el-ig-top"><span class="el-ig-ico" aria-hidden="true">' + _esc(g.icon) + '</span>' +
        '<div class="el-ig-head"><span class="el-ig-title">' + _esc(g.label) + '</span>' +
        (g.categoryLabel ? '<span class="el-ig-cat">' + _esc(g.categoryLabel) + '</span>' : '') + '</div></div>' +
        '<div class="el-ig-stat"><strong>' + g.pols + '</strong> politician' + (g.pols === 1 ? '' : 's') + ' on record · ' +
        '<strong>' + g.items + '</strong> receipt' + (g.items === 1 ? '' : 's') + '</div>' +
        '<div class="el-ig-stances">' + sts + ceeTag + '</div>' +
        '<div class="el-ig-cta">Explore evidence <span class="el-ig-go" aria-hidden="true">↗</span></div>' +
        '</button>';
    }

    function _renderIssueView() {
      var grid = document.getElementById('el-issue-grid');
      var statusEl = document.getElementById('el-issue-status');
      var emptyEl = document.getElementById('el-issue-empty');
      if (!grid) return;
      // Always (re)render lands on the gateway grid, not a stale focus panel.
      _showIssueBrowse();
      // Data not in yet — show the loading line and kick the deferred load so the
      // gateways paint as soon as the index is built. The load's finish() calls
      // back into here.
      if (!_items) {
        if (statusEl) statusEl.style.display = '';
        if (emptyEl) emptyEl.style.display = 'none';
        grid.innerHTML = '';
        _load();
        return;
      }
      if (statusEl) statusEl.style.display = 'none';
      var gws = _issueGateways();
      var q = _issueQuery;
      if (q) gws = gws.filter(function (g) {
        return (g.label + ' ' + g.categoryLabel).toLowerCase().indexOf(q) !== -1;
      });
      if (!gws.length) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.style.display = '';
        return;
      }
      if (emptyEl) emptyEl.style.display = 'none';
      grid.innerHTML = gws.map(_issueCardHtml).join('');
    }

    // ── By Issue · Stance-grouped focus ──────────────────────────────────────
    // Tapping a gateway card opens a focused, stance-bucketed breakdown for one
    // issue instead of just dumping the visitor into the filtered grid. Every
    // signal it shows is read from the SAME fields the rest of the Locker uses:
    // the per-politician documented position (_polPositionMap) wins, else the
    // headline-inferred stanceGuess tally (the exact logic the By-Politician
    // "Full Stances" rows use), and the gold power badge comes from each item's
    // own _powerTie. No second data source to keep in sync.
    // Stance buckets for the By-Issue focus. `key` is the locker's internal state
    // (matches the bucketing/inference pipeline); `label` + `cls` now carry the
    // canonical PDXStance vocabulary so the nav chips and section headers read as
    // the four canonical states (Supported / Opposed / Mixed / No Clear Position).
    var _ISSUE_FOCUS_BUCKETS = [
      { key: 'support',  label: 'Supported',         cls: 'is-support'  },
      { key: 'oppose',   label: 'Opposed',           cls: 'is-oppose'   },
      { key: 'mixed',    label: 'Mixed / Nuanced',   cls: 'is-mixed'    },
      { key: 'tracking', label: 'No Clear Position', cls: 'is-tracking' }
    ];
    // Sponsorship reads loudest, then committee, statutory, leadership — so when a
    // politician has several receipts on the issue, the strongest tie wins the badge.
    var _POWER_RANK = { sponsorship: 4, committee: 3, statutory: 2, leadership: 1 };
    function _strongerPower(a, b) {
      if (!a) return b || null;
      if (!b) return a;
      return ((_POWER_RANK[b.type] || 0) > (_POWER_RANK[a.type] || 0)) ? b : a;
    }

    function _showIssueBrowse() {
      _issueFocusKey = '';
      var browse = document.getElementById('el-issue-browse');
      var focus = document.getElementById('el-issue-focus');
      if (browse) browse.style.display = '';
      if (focus) { focus.style.display = 'none'; focus.innerHTML = ''; }
    }

    // Roll the issue's evidence up into one entry per politician: their stance on
    // THIS issue, the strongest power tie among their receipts, and how many
    // receipts they have. Returns the entries bucketed by stance, each bucket
    // sorted power-first then most-documented.
    function _issueFocusData(key) {
      var byPol = Object.create(null), order = [];
      var label = '', icon = '🎯', categoryLabel = '';
      _items.forEach(function (it) {
        if (it.issueKey !== key) return;
        if (!label) { label = it.issueLabel || key; icon = it.categoryIcon || '🎯'; categoryLabel = it.categoryLabel || ''; }
        var p = byPol[it.id];
        if (!p) { p = byPol[it.id] = { id: it.id, name: it.name, office: it.office || '',
          district: it.district || '', count: 0, sup: 0, opp: 0, mixed: 0, power: null, items: [] }; order.push(it.id); }
        p.count++;
        // Keep the actual receipts so the focus panel can expand a politician
        // inline. _items is already sorted newest-first, so each person's list
        // stays newest-first without re-sorting here.
        p.items.push(it);
        if (it.stanceGuess === 'support') p.sup++;
        else if (it.stanceGuess === 'oppose') p.opp++;
        else if (it.stanceGuess === 'mixed') p.mixed++;
        if (it.powerTie) p.power = _strongerPower(p.power, it.powerTie);
      });
      order.forEach(function (id) {
        var p = byPol[id];
        // Documented position (ISSUE_STANCE_DATA via _polPositionMap) always wins;
        // only when there is none do we fall back to the headline-inferred read.
        var doc = '';
        try {
          if (typeof window._polPositionMap === 'function') {
            var rec = (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) ? CMP_DATA[id]
                    : (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id] : null;
            var pm = window._polPositionMap(id, rec) || {};
            if (pm[key] && pm[key].stance) doc = String(pm[key].stance).toLowerCase();
          }
        } catch (e) {}
        if (doc && _EL_STANCE_KEYS[doc] && doc !== 'tracking') { p.stance = doc; p.inferred = false; }
        else if (p.mixed || (p.sup && p.opp)) { p.stance = 'mixed'; p.inferred = true; }
        else if (p.sup) { p.stance = 'support'; p.inferred = true; }
        else if (p.opp) { p.stance = 'oppose'; p.inferred = true; }
        else { p.stance = 'tracking'; p.inferred = false; }
      });
      var buckets = { support: [], oppose: [], mixed: [], tracking: [] };
      order.forEach(function (id) { var p = byPol[id]; (buckets[p.stance] || buckets.tracking).push(p); });
      Object.keys(buckets).forEach(function (bk) {
        buckets[bk].sort(function (a, b) {
          if (!!b.power !== !!a.power) return b.power ? 1 : -1;
          if (b.count !== a.count) return b.count - a.count;
          return a.name.localeCompare(b.name);
        });
      });
      return { key: key, label: label || key, icon: icon, categoryLabel: categoryLabel,
        buckets: buckets, total: order.length };
    }

    // Canonical stance pill (window.PDXStance) for a focus entry — the same pill
    // Who Stands Where, Compare and the profiles lead with, so By Issue speaks the
    // identical four-state language. "tracking" resolves to "No Clear Position".
    // Honesty about inferred vs documented reads rides in a separate caption
    // (_issueFocusInfTag) so the pill itself never blurs sourced and inferred.
    function _issueFocusStanceChip(p) {
      return window.PDXStance.stancePill(window.PDXStance.resolveStance(p.stance));
    }
    // Quiet "inferred" caption for a headline-derived (not documented) read, shown
    // beside the pill so a best-effort read never presents as a documented position.
    function _issueFocusInfTag(p) {
      if (!(p.inferred && p.stance !== 'tracking')) return '';
      return '<span class="el-if-inf" title="Inferred from the headlines on record — not yet a documented position">inferred</span>';
    }

    // One evidence receipt inside an expanded politician row. Reuses the Locker's
    // type badge and strength chip so the language matches the main grid, and
    // links straight into the shared detail modal via the item's uid.
    function _issueFocusEvHtml(it) {
      var t = EL_TYPES[it.typeKey] || EL_TYPES.statement;
      var typeChip = '<span class="el-badge ' + t.badge + '">' + t.icon + ' ' + _esc(t.label) + '</span>';
      var dateChip = it.date ? '<span class="el-if-ev-date">' + _esc(it.date) + '</span>' : '';
      var strength = (typeof _strengthHtml === 'function') ? _strengthHtml(it) : '';
      return '<div class="el-if-ev">' +
        '<div class="el-if-ev-head">' + _esc(it.headline || '') + '</div>' +
        '<div class="el-if-ev-meta">' + typeChip + strength + dateChip + '</div>' +
        '<button type="button" class="el-if-ev-open" data-if-detail="' + _esc(it.uid) +
          '" aria-label="Open full detail for: ' + _esc(it.headline || 'this evidence') + '">Open detail →</button>' +
      '</div>';
    }

    function _issueFocusPolHtml(p, key) {
      var office = [p.office, p.district].filter(Boolean).join(' · ');
      var powerBadge = p.power ? _powerBadgeHtml({ powerTie: p.power }) : '';
      var lastName = (p.name || '').split(' ').slice(-1)[0] || 'evidence';
      var evList = (p.items || []).map(_issueFocusEvHtml).join('');
      return '<div class="el-if-pol">' +
        '<div class="el-if-pol-top">' +
          '<div class="el-if-pol-id">' +
            '<div class="el-if-pol-name">' + _esc(p.name) + '</div>' +
            (office ? '<div class="el-if-pol-office">' + _esc(office) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="el-if-pol-sig">' + _issueFocusStanceChip(p) + _issueFocusInfTag(p) + powerBadge + '</div>' +
        '<div class="el-if-pol-foot">' +
          '<span class="el-if-pol-count"><b>' + p.count + '</b> receipt' + (p.count === 1 ? '' : 's') + '</span>' +
          '<button type="button" class="el-if-pol-toggle" data-if-toggle="' + _esc(p.id) +
            '" aria-expanded="false" aria-label="Show ' + _esc(p.name) + '’s evidence on this issue">' +
            '<span class="el-if-pol-chev" aria-hidden="true">▸</span>' +
            '<span class="el-if-pol-tlabel">Show evidence</span></button>' +
        '</div>' +
        '<div class="el-if-pol-evwrap" hidden>' +
          evList +
          '<button type="button" class="el-if-pol-ev" data-if-pol="' + _esc(p.id) +
            '" data-if-key="' + _esc(key) + '" aria-label="View ' + _esc(p.name) + '’s evidence in the Locker">' +
            'View ' + _esc(lastName) + '’s evidence in Locker ↗</button>' +
        '</div>' +
      '</div>';
    }

    function _issueFocusHtml(data) {
      var nav = _ISSUE_FOCUS_BUCKETS.map(function (b) {
        var n = data.buckets[b.key].length;
        return '<button type="button" class="el-if-navchip ' + b.cls + (n ? '' : ' is-empty') +
          '" data-if-jump="' + b.key + '"' + (n ? '' : ' aria-disabled="true" tabindex="-1"') + '>' +
          b.label + ' <span class="el-if-navn">' + n + '</span></button>';
      }).join('');
      var sections = _ISSUE_FOCUS_BUCKETS.map(function (b) {
        var list = data.buckets[b.key];
        if (!list.length) return '';
        return '<section class="el-if-sec ' + b.cls + '" id="el-if-sec-' + b.key + '">' +
          '<div class="el-if-sec-head">' +
            '<span class="el-if-sec-dot" aria-hidden="true">●</span>' +
            '<span class="el-if-sec-title">' + b.label + '</span>' +
            '<span class="el-if-sec-n">' + list.length + '</span>' +
          '</div>' +
          '<div class="el-if-grid">' + list.map(function (p) { return _issueFocusPolHtml(p, data.key); }).join('') + '</div>' +
        '</section>';
      }).join('');
      return '<div class="el-if-head">' +
          '<div class="el-if-head-main">' +
            '<span class="el-if-head-ico" aria-hidden="true">' + _esc(data.icon) + '</span>' +
            '<div class="el-if-head-titles">' +
              '<span class="el-if-eyebrow">Where they stand</span>' +
              '<div class="el-if-title">' + _esc(data.label) + '</div>' +
              '<div class="el-if-sub">' + (data.categoryLabel ? _esc(data.categoryLabel) + ' · ' : '') +
                '<strong>' + data.total + '</strong> politician' + (data.total === 1 ? '' : 's') + ' on record</div>' +
            '</div>' +
          '</div>' +
          '<div class="el-if-actions">' +
            '<button type="button" class="el-if-back" id="el-if-back">← All issues</button>' +
            '<button type="button" class="el-if-viewall" data-if-viewall="' + _esc(data.key) + '">📂 View all evidence ↗</button>' +
          '</div>' +
        '</div>' +
        '<div class="el-if-nav">' + nav + '</div>' +
        (sections || '<div class="el-issue-empty"><div class="el-issue-empty-ico" aria-hidden="true">🎯</div>' +
          '<div class="el-issue-empty-title">No politicians on record yet</div></div>');
    }

    function _renderIssueFocus(key) {
      if (!_items || !key) return;
      var browse = document.getElementById('el-issue-browse');
      var focus = document.getElementById('el-issue-focus');
      if (!focus) return;
      _issueFocusKey = key;
      focus.innerHTML = _issueFocusHtml(_issueFocusData(key));
      if (browse) browse.style.display = 'none';
      focus.style.display = '';
      if (focus.scrollIntoView) focus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Wire the By-Issue lens once. The grid's stable parent carries a delegated
    // click handler so re-rendering the cards never re-binds. Tapping a gateway
    // card opens the stance-grouped focus for that issue; the focus panel's own
    // delegated handler covers the back button, the stance jump-nav, each
    // politician's "view evidence" link, and the "view all evidence" deep-link.
    function _wireIssueView() {
      var grid = document.getElementById('el-issue-grid');
      if (grid) grid.addEventListener('click', function (e) {
        var card = e.target.closest('[data-el-issue-gw]');
        if (!card) return;
        var key = card.getAttribute('data-el-issue-gw');
        if (key) _renderIssueFocus(key);
      });
      var focus = document.getElementById('el-issue-focus');
      if (focus) focus.addEventListener('click', function (e) {
        if (e.target.closest('#el-if-back')) { _showIssueBrowse(); return; }
        var viewall = e.target.closest('[data-if-viewall]');
        if (viewall) { window._pdxOpenEvidenceLocker({ issue: viewall.getAttribute('data-if-viewall') }); return; }
        // Expand / collapse a politician's evidence inline, without leaving the panel.
        var toggle = e.target.closest('[data-if-toggle]');
        if (toggle) {
          var pol = toggle.closest('.el-if-pol');
          var wrap = pol && pol.querySelector('.el-if-pol-evwrap');
          if (wrap) {
            var opening = wrap.hasAttribute('hidden');
            if (opening) wrap.removeAttribute('hidden'); else wrap.setAttribute('hidden', '');
            toggle.setAttribute('aria-expanded', String(opening));
            if (pol) pol.classList.toggle('is-open', opening);
            var chev = toggle.querySelector('.el-if-pol-chev');
            if (chev) chev.textContent = opening ? '▾' : '▸';
            var lbl = toggle.querySelector('.el-if-pol-tlabel');
            if (lbl) lbl.textContent = opening ? 'Hide evidence' : 'Show evidence';
          }
          return;
        }
        // Open the shared detail modal for a single expanded receipt.
        var detail = e.target.closest('[data-if-detail]');
        if (detail) { _openModal(detail.getAttribute('data-if-detail')); return; }
        var ev = e.target.closest('[data-if-pol]');
        if (ev) { window._pdxOpenEvidenceLocker({ pol: ev.getAttribute('data-if-pol'), issue: ev.getAttribute('data-if-key') }); return; }
        var jump = e.target.closest('[data-if-jump]');
        if (jump) {
          var sec = document.getElementById('el-if-sec-' + jump.getAttribute('data-if-jump'));
          if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      var q = document.getElementById('el-issue-q');
      if (q) {
        var t = null;
        q.addEventListener('input', function () {
          clearTimeout(t);
          t = setTimeout(function () { _issueQuery = q.value.trim().toLowerCase(); _renderIssueView(); }, 120);
        });
      }
    }

    function _setView(which) {
      _myevActive = (which === 'myev');
      _polActive = (which === 'pol');
      _issueActive = (which === 'issue');
      var all = document.getElementById('el-view-all');
      var pol = document.getElementById('el-view-pol');
      var iss = document.getElementById('el-view-issue');
      var my = document.getElementById('el-view-myev');
      var ta = document.getElementById('el-tab-all');
      var tp = document.getElementById('el-tab-pol');
      var ti = document.getElementById('el-tab-issue');
      var tm = document.getElementById('el-tab-myev');
      if (all) all.style.display = (which === 'all') ? '' : 'none';
      if (pol) pol.style.display = _polActive ? '' : 'none';
      if (iss) iss.style.display = _issueActive ? '' : 'none';
      if (my) my.style.display = _myevActive ? '' : 'none';
      if (ta) { ta.classList.toggle('is-active', which === 'all'); ta.setAttribute('aria-selected', String(which === 'all')); }
      if (tp) { tp.classList.toggle('is-active', _polActive); tp.setAttribute('aria-selected', String(_polActive)); }
      if (ti) { ti.classList.toggle('is-active', _issueActive); ti.setAttribute('aria-selected', String(_issueActive)); }
      if (tm) { tm.classList.toggle('is-active', _myevActive); tm.setAttribute('aria-selected', String(_myevActive)); }
      if (_myevActive) { _renderMyev(); _updateSigninHint(); }
      if (_polActive) _renderPolView();
      if (_issueActive) _renderIssueView();
      // The quick-jump bar maps the All Evidence view; refresh it so it self-hides
      // on other tabs and reappears (with fresh counts) back on All Evidence.
      if (window.rebuildEvidenceNav) window.rebuildEvidenceNav();
    }


    function _wireCollections() {
      _loadLocal();
      _updateTabCount();

      var ta = document.getElementById('el-tab-all');
      var tm = document.getElementById('el-tab-myev');
      if (ta) ta.addEventListener('click', function () { _setView('all'); });
      var tp = document.getElementById('el-tab-pol');
      if (tp) tp.addEventListener('click', function () { _setView('pol'); });
      var ti = document.getElementById('el-tab-issue');
      if (ti) ti.addEventListener('click', function () { _setView('issue'); });
      if (tm) tm.addEventListener('click', function () { _setView('myev'); });

      var nc = document.getElementById('el-myev-newcol');
      if (nc) nc.addEventListener('click', function () {
        var name = window.prompt('Name your new collection (e.g. “Water Issues”):', '');
        if (name && name.trim()) { _createColl(name); _persist(); _afterCollChange(); }
      });
      var sb = document.getElementById('el-myev-signin-btn');
      if (sb) sb.addEventListener('click', function () { if (typeof window.openAuthModal === 'function') window.openAuthModal(); });

      // My Evidence body: collection tools, per-card remove, and card → detail.
      var body = document.getElementById('el-myev-body');
      if (body) body.addEventListener('click', function (e) {
        var tool = e.target.closest('.el-coll-tool');
        if (tool) {
          var cid = tool.getAttribute('data-coll'), act = tool.getAttribute('data-act'), c = _colls[cid];
          if (act === 'rename') {
            var nm = window.prompt('Rename collection:', c ? c.name : '');
            if (nm && nm.trim()) _renameColl(cid, nm);
          } else if (act === 'delete') {
            if (window.confirm('Delete the collection “' + (c ? c.name : '') + '”? The items saved in it will be removed.')) _deleteColl(cid);
          }
          return;
        }
        var rm = e.target.closest('.el-btn-remove');
        if (rm) { _removeFromColl(rm.getAttribute('data-rm-coll'), rm.getAttribute('data-rm-key')); return; }
        if (e.target.closest('a, button')) return;   // let bookmark/source/profile keep their own clicks
        var card = e.target.closest('.el-card');
        if (card && card.getAttribute('data-key')) _openModalItem(_resolveItem(card.getAttribute('data-key')));
      });

      // One delegated handler covers every bookmark button — All Evidence grid,
      // the detail modal, and My Evidence cards.
      document.addEventListener('click', function (e) {
        var bm = e.target.closest('.el-bm');
        if (bm && bm.getAttribute('data-bm-key')) {
          e.preventDefault();
          _openSave(bm.getAttribute('data-bm-key'));
        }
      });

      // Clickable category headers and issue chips (cards + detail modal) jump the
      // Locker to that filter via the same deep-link path used by profiles. The
      // detail modal is dismissed first so the filtered All Evidence grid is visible.
      document.addEventListener('click', function (e) {
        var catBtn = e.target.closest('.el-cat-head-btn');
        var issBtn = catBtn ? null : e.target.closest('.el-issue-btn');
        if (!catBtn && !issBtn) return;
        e.preventDefault();
        if (typeof window._pdxElCloseModal === 'function') { try { window._pdxElCloseModal(); } catch (_e) {} }
        if (catBtn && catBtn.getAttribute('data-el-cat')) {
          window._pdxOpenEvidenceLocker({ category: catBtn.getAttribute('data-el-cat') });
        } else if (issBtn && issBtn.getAttribute('data-el-issue')) {
          window._pdxOpenEvidenceLocker({ issue: issBtn.getAttribute('data-el-issue') });
        }
      });

      // The single-politician context header's "Back to … Full Stance Record"
      // button reopens that politician's Full Stance Record overlay (which layers
      // above this section), returning the visitor to where they jumped in from.
      var ctx = document.getElementById('el-pol-context');
      if (ctx) ctx.addEventListener('click', function (e) {
        var back = e.target.closest('.el-pol-ctx-back');
        if (!back) return;
        e.preventDefault();
        var pid = back.getAttribute('data-pol-record');
        if (pid && typeof window._pdxOpenStanceRecord === 'function') window._pdxOpenStanceRecord(pid);
      });

      // Save modal internals.
      var sList = document.getElementById('el-save-list');
      if (sList) sList.addEventListener('click', function (e) {
        var opt = e.target.closest('.el-save-opt');
        if (opt && opt.getAttribute('data-coll')) _toggleInColl(opt.getAttribute('data-coll'));
      });
      var nb = document.getElementById('el-save-newbtn');
      if (nb) nb.addEventListener('click', _createAndAdd);
      var ni = document.getElementById('el-save-newinput');
      if (ni) ni.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); _createAndAdd(); } });
      var done = document.getElementById('el-save-done');
      if (done) done.addEventListener('click', _closeSave);
      var sov = document.getElementById('el-save-overlay');
      if (sov) sov.addEventListener('click', function (e) { if (e.target === sov) _closeSave(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
          var ov = document.getElementById('el-save-overlay');
          if (ov && !ov.hidden) _closeSave();
        }
      });

      _wireCloud();
      _updateSigninHint();

      // When the shared sync layer (PDXEvidenceSync) merges a server snapshot into
      // the evidence store, it rewrites EV_COLL_KEY and fires 'pdx-evidence-synced'
      // with { external:true }. Reload the in-memory collections from storage and
      // refresh the tab count + bookmark states so a cross-device add/rename/delete
      // shows immediately and the counts stay accurate. Our own _persist writes
      // don't set the flag, so this never loops on local edits.
      window.addEventListener('pdx-evidence-synced', function (e) {
        if (!(e && e.detail && e.detail.external)) return;
        _loadLocal();
        _afterCollChange();
      });
    }

    // ── Public deep-link into the Evidence Locker, pre-filtered ──────────────
    // Called from a politician profile (the Evidence summary strip, a Connected
    // Evidence card, a Stance-at-a-Glance row) so a visitor lands on exactly the
    // evidence they tapped instead of scrolling the whole library. Ensures the
    // section's lazy data is loaded first, mirrors the filters into both _state
    // and the visible controls, switches to the All Evidence tab, scrolls the
    // section into view, and (when a uid is given) opens that item's detail.
    //   opts: { pol, issue, type, search, uid, scroll }
    var _pendingOpen = null;
    function _applyOpen(opts) {
      opts = opts || {};
      // A bare politician deep-link (no issue/category/type/search/uid/mandate)
      // lands in the footprint-first By-Politician lens, so "See all evidence for
      // X" feels like opening X's collection. Precise deep-links (an issue, a
      // category, a specific item uid…) stay in All Evidence so the exact filter
      // still applies there.
      var polOnly = opts.pol && !opts.issue && !opts.category && !opts.type &&
                    !opts.uid && !opts.search && !opts.mandate;
      if (polOnly) { _enterPolView([opts.pol]); return; }
      // A saved-team deep-link (a roster of politicians, no other precise filter)
      // opens the By-Politician lens pre-selected to the whole team — the
      // "Browse team evidence" entry point from My Team's Evidence. Same lens as
      // a single-pol link, just seeded with every saved pick.
      var polsOnly = opts.pols && opts.pols.length && !opts.issue && !opts.category &&
                     !opts.type && !opts.uid && !opts.search && !opts.mandate;
      if (polsOnly) { _enterPolView(opts.pols.slice()); return; }
      if (_myevActive || _polActive || _issueActive) _setView('all');   // bring a deep-link back to All Evidence
      _state.search = opts.search || '';
      _state.category = opts.category || '';
      _state.issue  = opts.issue  || '';
      _state.pol    = opts.pol    || '';
      _state.type   = opts.type   || '';
      _state.mandate = opts.mandate || '';
      // Comparison context — set when the visitor jumped here from a Compare
      // issue row's "See everyone's evidence" link. The issue filter alone shows
      // every politician on record; this just lets the Locker surface a banner
      // naming the lineup they were comparing and highlight those cards. Cleared
      // for any plain deep-link so it never lingers onto an unrelated filter.
      _state.compare = (opts.comparePols && opts.comparePols.length && opts.issue)
        ? { issue: opts.issue, pols: opts.comparePols.slice(), names: (opts.compareNames || []).slice(), label: opts.compareLabel || '' }
        : null;
      // Reflect the active filters in the controls so the visitor can see and
      // adjust them rather than being filtered invisibly.
      var s = document.getElementById('el-f-search');
      var clear = document.getElementById('el-search-clear');
      var cat = document.getElementById('el-f-category');
      var iss = document.getElementById('el-f-issue');
      var pol = document.getElementById('el-f-pol');
      if (s) s.value = _state.search;
      if (clear) clear.hidden = !_state.search;
      if (cat) cat.value = _state.category;
      if (iss) iss.value = _state.issue;
      if (pol) pol.value = _state.pol;
      var wrap = document.getElementById('el-types');
      if (wrap) wrap.querySelectorAll('.el-chip').forEach(function (c) {
        c.classList.toggle('is-active', (c.getAttribute('data-type') || '') === _state.type);
      });
      _updatePolBridge();
      _render();
      if (opts.uid && _itemsByUid[opts.uid]) _openModalItem(_itemsByUid[opts.uid]);
    }
    window._pdxOpenEvidenceLocker = function (opts) {
      opts = opts || {};
      // The Compare My Team overlay (z above this in-page section) would hide the
      // Locker we're about to scroll to — dismiss it first so the filtered
      // evidence is actually visible.
      if (typeof window.homeCompareClose === 'function') { try { window.homeCompareClose(); } catch (e) {} }
      // The Locker is a top-level section sitting BEHIND the profile modal, so
      // close that modal first (it also dismisses the stance-evidence popover)
      // — otherwise the visitor never sees the section we scroll to.
      if (opts.keepModal !== true && typeof window.closeModal === 'function') {
        try { window.closeModal(); } catch (e) {}
      }
      // The Full Stance Record overlay layers above the profile modal — dismiss it
      // too, so a jump from one of its rows / depth pills actually reveals the
      // Locker section we're scrolling to.
      if (typeof window._pdxCloseStanceRecord === 'function') { try { window._pdxCloseStanceRecord(); } catch (e) {} }
      var section = document.getElementById('evidence-locker');
      if (opts.scroll !== false && section && section.scrollIntoView) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (_loaded) { _applyOpen(opts); return; }
      // Not loaded yet — remember the request and kick the deferred load; the
      // load's finish() will apply it. (_load no-ops if already in flight.)
      _pendingOpen = opts;
      _load();
    };

    // The distinct politicians who have a piece of on-record evidence tied to any
    // of the given issue keys — the source of the live "on the record" count on
    // each People's Mandate reform card. Counts evidence items only (exactly what
    // the filtered Locker shows), so the number a visitor sees always equals the
    // people they land on after tapping it. Returns null until the library has
    // loaded, so callers can show a neutral state and refresh on the ready event.
    window._pdxEvidenceOnRecord = function (keys) {
      if (!_items) return null;
      var set = Object.create(null);
      (keys || []).forEach(function (k) { if (k) set[k] = 1; });
      var ids = Object.create(null);
      _items.forEach(function (it) { if (it.issueKey && set[it.issueKey]) ids[it.id] = 1; });
      var out = [];
      for (var id in ids) if (Object.prototype.hasOwnProperty.call(ids, id)) out.push(id);
      return out;
    };

    // Total on-record evidence items tied to ANY of the given politicians — the
    // team-wide number behind the "My Team's Evidence" summary. Counts items
    // exactly as the By-Politician lens would surface them (every item whose
    // politician is in the set), so the figure a voter reads always equals what
    // "Browse team evidence" lands them on. Returns null until the library has
    // loaded, letting callers paint a neutral state and refresh on the ready event.
    window._pdxEvidenceCountForPeople = function (polIds) {
      if (!_items) return null;
      var set = Object.create(null);
      (polIds || []).forEach(function (id) { if (id) set[id] = 1; });
      var n = 0;
      _items.forEach(function (it) { if (set[it.id]) n++; });
      return n;
    };

    // Best-effort issue inference for a free-text claim/story headline, exposed
    // for surfaces OUTSIDE the Locker scope (the standalone Spotlight / Hot
    // Topics board) that want to offer an issue-filtered "See the evidence"
    // jump. Scores the text against the SAME shared ISSUE_MAP keyword vocabulary
    // the Locker already uses to tag untagged evidence, so there is no second
    // keyword list to keep in sync. Returns { key, label, conf } on a confident,
    // specific match, else null — an ambiguous/weak match never fabricates a
    // tag. Pair with _pdxEvidenceOnRecord for the same "recognized key +
    // evidence on record" gating every other surface applies.
    window._pdxInferIssueFromText = function (text) {
      try {
        var best = _inferIssueFromText(text);
        if (!best || !best.key) return null;
        var def = _issueMap()[best.key] || {};
        var label = (typeof window._issueLabel === 'function' && window._issueLabel(best.key)) || def.label || best.key;
        return { key: best.key, label: label, conf: best.conf || '' };
      } catch (e) { return null; }
    };

    // The distinct tracked issue keys a SINGLE politician has on-record evidence
    // for in the Locker — the per-person inverse of _pdxEvidenceOnRecord. This is
    // what lets the People's Mandate profile cue count reforms for the broader
    // Evidence Locker roster (federal officials + 2026 candidates) whose receipts
    // live only in the Locker index, not in the bundled profile record. Returns
    // null until the library has loaded, so callers fall back to the profile's
    // own position/evidence map and refresh once data exists.
    window._pdxEvidenceIssueKeysForPerson = function (polId) {
      if (!_items || !polId) return null;
      var seen = Object.create(null), out = [];
      _items.forEach(function (it) {
        if (it.id === polId && it.issueKey && !seen[it.issueKey]) { seen[it.issueKey] = 1; out.push(it.issueKey); }
      });
      return out;
    };

    // Per-issue evidence COUNTS for one politician, drawn from the loaded Locker
    // index — { issueKey: count }. This is the exact number the By-Politician
    // stance rows show ("N items"), so the count a visitor reads on a profile or
    // in Compare always matches what the filtered Locker actually contains.
    // Returns null until the library has loaded, letting callers fall back to a
    // neutral (count-less) state rather than fabricating a number.
    window._pdxEvidenceIssueCountsForPerson = function (polId) {
      if (!_items || !polId) return null;
      var out = Object.create(null);
      _items.forEach(function (it) {
        if (it.id === polId && it.issueKey) out[it.issueKey] = (out[it.issueKey] || 0) + 1;
      });
      return out;
    };

    // Per-issue evidence DEPTH for one politician, aggregated from the SAME loaded
    // library index that powers the count links and accountability reads — so it
    // adds no network cost and never invents data. Returns
    //   { issueKey: { count, level, label, tier, bars } }
    // where `level`/`tier`/`bars` reflect the STRONGEST strength grade present on
    // that issue (strong > moderate > limited). Null until the library has loaded,
    // letting callers stay silent and refresh on the `pdx-evidence-ready` event.
    // Memoized per politician against the current `_items` identity, so the locker's
    // filtered card views can call it once per card without re-scanning the library.
    var _depthCacheItems = null, _depthCache = null;
    window._pdxEvidenceDepthForPerson = function (polId) {
      if (!_items || !polId) return null;
      if (_depthCacheItems !== _items) { _depthCacheItems = _items; _depthCache = Object.create(null); }
      if (polId in _depthCache) return _depthCache[polId];
      var rank = { limited: 1, moderate: 2, strong: 3 };
      var lvlOf = { 1: 'limited', 2: 'moderate', 3: 'strong' };
      var tierOf = { limited: 'Limited', moderate: 'Moderate', strong: 'Strong' };
      var barsOf = { limited: '●○○', moderate: '●●○', strong: '●●●' };
      var buckets = Object.create(null);
      _items.forEach(function (it) {
        if (it.id !== polId || !it.issueKey) return;
        var b = buckets[it.issueKey] || (buckets[it.issueKey] = { count: 0, best: 0, label: it.issueLabel || it.issueKey });
        b.count++;
        var lv = (it.strength && it.strength.level) || 'limited';
        if (rank[lv] > b.best) b.best = rank[lv];
      });
      var out = Object.create(null);
      Object.keys(buckets).forEach(function (k) {
        var b = buckets[k];
        var lv = lvlOf[b.best] || 'limited';
        out[k] = { count: b.count, level: lv, tier: tierOf[lv], bars: barsOf[lv], label: b.label };
      });
      _depthCache[polId] = out;
      return out;
    };

    // Compact, Evidence-blue DEPTH pill for one politician + issue — "📂 Strong • 12".
    // Quiet by design (small type, tight padding, muted translucent blue, the "blue =
    // toward curated evidence" direction language), it makes the strength of the
    // curated record behind a position scannable at a glance and deep-links into the
    // Evidence Locker filtered to exactly this politician + issue. Honesty gate: it
    // renders NOTHING once the library has loaded and confirmed there is no real
    // evidence on that issue. While the library is still loading it emits a hidden
    // stub that `_pdxEnhanceDepthPills` fills (or removes) on the ready event, so the
    // pill never flashes an empty or guessed state.
    //   opts.format === 'receipts' → "📂 12 receipts • Strong" (used on profiles)
    //   default                    → "📂 Strong • 12"          (compact, for the Locker)
    window._pdxEvidenceDepthPill = function (polId, issueKey, opts) {
      opts = opts || {};
      if (!polId || !issueKey) return '';
      var map = (typeof window._pdxEvidenceDepthForPerson === 'function') ? window._pdxEvidenceDepthForPerson(polId) : null;
      var fmt = opts.format === 'receipts' ? 'receipts' : '';
      if (!map) {
        // Library not loaded yet — hidden placeholder, enhanced on pdx-evidence-ready.
        return '<span class="pdx-depth-stub" hidden data-depth-stub="1" data-depth-pol="' + _esc(polId) +
          '" data-depth-issue="' + _esc(issueKey) + '"' + (fmt ? ' data-depth-format="' + _esc(fmt) + '"' : '') + '></span>';
      }
      var d = map[issueKey];
      if (!d || !d.count) return '';   // loaded + genuinely no evidence → show nothing
      var TIER = {
        strong:   { bg: 'rgba(96,165,250,0.20)', bd: 'rgba(96,165,250,0.55)', fg: '#bfdbfe' },
        moderate: { bg: 'rgba(96,165,250,0.13)', bd: 'rgba(96,165,250,0.40)', fg: '#a8c7fb' },
        limited:  { bg: 'rgba(96,165,250,0.08)', bd: 'rgba(96,165,250,0.28)', fg: '#93b4e6' }
      };
      var tc = TIER[d.level] || TIER.limited;
      var n = d.count;
      var txt = fmt === 'receipts'
        ? (n + ' receipt' + (n === 1 ? '' : 's') + ' • ' + d.tier)
        : (d.tier + ' • ' + n);
      var jsId = String(polId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var jsIk = String(issueKey).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      var title = n + ' piece' + (n === 1 ? '' : 's') + ' of curated evidence on record for ' + _esc(d.label) +
        ' — strength: ' + d.tier + '. Open the Evidence Locker filtered to this position.';
      return '<button type="button" class="pdx-depth-pill is-' + d.level + '" data-depth-pol="' + _esc(polId) +
        '" data-depth-issue="' + _esc(issueKey) + '" data-depth-done="1"' +
        ' onclick="event.stopPropagation();window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + jsId + '\',issue:\'' + jsIk + '\'});"' +
        ' title="' + title + '"' +
        ' style="cursor:pointer;display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;' +
        'font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:' + tc.fg + ';background:' + tc.bg + ';' +
        'border:1px solid ' + tc.bd + ';padding:0.14rem 0.5rem;border-radius:999px;line-height:1.3;white-space:nowrap;">' +
        '<span aria-hidden="true" style="opacity:0.9;">📂</span>' + _esc(txt) + '</button>';
    };

    // Progressive enhancement for depth pills rendered before the library finished
    // loading (e.g. a profile opened cold). Swaps each hidden stub for the real pill
    // — or removes it when there is genuinely no evidence on that issue — using the
    // cached index, so it adds no network cost. Runs on every `pdx-evidence-ready`,
    // and can be called with a root after any render that may contain stubs.
    window._pdxEnhanceDepthPills = function (root) {
      root = root || document;
      var stubs;
      try { stubs = root.querySelectorAll('[data-depth-stub]:not([data-depth-done])'); } catch (e) { return; }
      Array.prototype.forEach.call(stubs, function (el) {
        el.setAttribute('data-depth-done', '1');
        var pol = el.getAttribute('data-depth-pol');
        var iss = el.getAttribute('data-depth-issue');
        var fmt = el.getAttribute('data-depth-format') || '';
        var html = window._pdxEvidenceDepthPill(pol, iss, { format: fmt });
        if (html && html.indexOf('data-depth-stub') !== -1) return;   // library still not ready; leave stub
        if (!html) {
          // Genuinely no evidence on this issue — drop the stub, and the thin
          // wrapper row it sat in if that leaves the row empty (avoids a stray gap).
          var par = el.parentNode;
          if (par) {
            par.removeChild(el);
            if (par.classList && par.classList.contains('stance-depth-row') && !par.childNodes.length && par.parentNode) {
              par.parentNode.removeChild(par);
            }
          }
          return;
        }
        try {
          var tmp = document.createElement('div');
          tmp.innerHTML = html;
          var node = tmp.firstChild;
          if (node && el.parentNode) el.parentNode.replaceChild(node, el);
        } catch (e) {}
      });
    };
    document.addEventListener('pdx-evidence-ready', function () {
      try { window._pdxEnhanceDepthPills(document); } catch (e) {}
    });

    // Per-issue HEADLINE-INFERRED stance reads for one politician, drawn from the
    // loaded Locker index — { issueKey: { dir, count, label, icon } }. This mirrors
    // exactly the inference the By-Politician "Full Stances" rows use: tally each
    // item's stanceGuess, call it 'mixed' when the headlines point both ways. It
    // lets a profile surface the SAME conservative "~" read on issues a politician
    // has real evidence for but no documented ISSUE_STANCE_DATA position — without
    // ever fabricating one. Only issues whose headlines actually pointed somewhere
    // get a dir; issues with evidence but no directional signal are omitted, so a
    // caller can never render an empty inferred row. Returns null until the library
    // has loaded, letting callers stay silent and refresh on the ready event.
    window._pdxEvidenceInferredStancesForPerson = function (polId) {
      if (!_items || !polId) return null;
      var buckets = Object.create(null);
      _items.forEach(function (it) {
        if (it.id !== polId || !it.issueKey) return;
        var b = buckets[it.issueKey];
        if (!b) b = buckets[it.issueKey] = { count: 0, sup: 0, opp: 0,
          label: it.issueLabel || it.issueKey, icon: it.categoryIcon || '🎯' };
        b.count++;
        if (it.stanceGuess === 'support') b.sup++;
        else if (it.stanceGuess === 'oppose') b.opp++;
        else if (it.stanceGuess === 'mixed') { b.sup++; b.opp++; }
      });
      var out = Object.create(null);
      Object.keys(buckets).forEach(function (k) {
        var b = buckets[k];
        var dir = (b.sup && b.opp) ? 'mixed' : (b.sup ? 'support' : (b.opp ? 'oppose' : ''));
        if (!dir) return;   // no headline signal — omit, never invent a stance
        out[k] = { dir: dir, count: b.count, label: b.label, icon: b.icon };
      });
      return out;
    };

    // Clear an active per-reform filter from the visible "filtered to" pill,
    // returning the Locker to its full library.
    window._pdxEvidenceClearMandate = function () {
      _state.mandate = '';
      _render();
    };

    // Drop the Compare lineup context (banner + card highlights) while leaving the
    // issue filter in place, so the visitor stays on the full issue evidence.
    window._pdxEvidenceClearCompare = function () {
      _state.compare = null;
      _render();
    };

    // Turn off the "Relevant to Me" (saved team + representatives) filter from the
    // banner's Clear action, returning the Locker to its full library.
    window._pdxEvidenceClearRelevant = function () {
      _state.relevant = false;
      _render();
    };

    var _initDone = false;
    // ── Community Exchange links (progressive enhancement) ──────────────────
    // The hidden "See community discussion" links rendered on cards and in the
    // detail modal are revealed only for issues that actually have community
    // posts. A single cached read (PDXCommunity.issuesWithPosts) backs every
    // check, so this adds no per-card network cost and never embeds posts.
    function _enhanceCommunityLinks(root) {
      if (!window.PDXCommunity || typeof window.PDXCommunity.issuesWithPosts !== 'function') return;
      root = root || document;
      // Covers every community surface in one pass: the full "See community
      // discussion" links/modal button (which carry an inner .el-cee-count) and
      // the compact inline activity tags on cards + issue gateways (which carry a
      // .el-cee-tag-n number). All read the identical cached count.
      var nodes = root.querySelectorAll('[data-cee-issue]:not([data-cee-checked])');
      if (!nodes.length) return;
      var list = Array.prototype.slice.call(nodes);
      list.forEach(function (el) { el.setAttribute('data-cee-checked', '1'); });
      window.PDXCommunity.issuesWithPosts().then(function (counts) {
        list.forEach(function (el) {
          var n = counts[el.getAttribute('data-cee-issue')] || 0;
          if (n > 0) {
            // Surface how much discussion exists as light context — only ever
            // when there is real activity, and straight from the same cached
            // map, so no extra network cost and no post content is embedded.
            var label = n + (n === 1 ? ' post' : ' posts');
            var badge = el.querySelector('.el-cee-count');
            if (badge) { badge.textContent = label; badge.hidden = false; }
            var num = el.querySelector('.el-cee-tag-n');
            if (num) num.textContent = label;
            el.hidden = false;
          }
        });
      }).catch(function () {});
    }

    // Delegate clicks on the community links out to the Exchange bridge, and keep
    // freshly rendered cards enhanced as the library re-renders on filter/sort.
    function _wireCommunityLinks() {
      var section = document.getElementById('evidence-locker');
      if (!section) return;
      section.addEventListener('click', function (e) {
        // The full gold link and the compact card activity-tag both jump to the
        // Exchange filtered to the issue. The issue-gateway tag is a static span
        // (not matched here) so it falls through to its card's own navigation.
        var link = e.target.closest && e.target.closest('.el-cee-link, button.el-cee-tag');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        if (window._pdxElCloseModal) window._pdxElCloseModal();
        if (window.PDXCommunity && typeof window.PDXCommunity.openForIssue === 'function') {
          window.PDXCommunity.openForIssue(link.getAttribute('data-cee-issue'), link.getAttribute('data-cee-label'));
        }
      });
      if ('MutationObserver' in window) {
        var queued = false;
        var mo = new MutationObserver(function () {
          if (queued) return;
          queued = true;
          setTimeout(function () { queued = false; _enhanceCommunityLinks(section); }, 80);
        });
        mo.observe(section, { childList: true, subtree: true });
      }
      _enhanceCommunityLinks(section);
    }

    function _init() {
      if (_initDone) return;
      var section = document.getElementById('evidence-locker');
      if (!section) return;   // DOM not ready yet — a later trigger will retry.
      _initDone = true;
      _wire();
      _wireModal();
      _wireCollections();
      _wirePolView();
      _wireIssueView();
      _wireCommunityLinks();
      // Defer the heavy per-member fetch until the section is actually viewed…
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); _load(); } });
        }, { rootMargin: '200px' });
        io.observe(section);
      } else {
        _load();
      }
      // …but don't make the visitor scroll into the section for content to appear.
      // Kick a background load during idle time so the library is loading (or
      // already loaded) by the time they reach it — the IntersectionObserver
      // above just makes it immediate for anyone who scrolls there first, and
      // _load() no-ops if a load is already in flight.
      var _kick = function () { _load(); };
      if ('requestIdleCallback' in window) requestIdleCallback(_kick, { timeout: 2500 });
      else setTimeout(_kick, 1200);
      // Cold deep-link straight to the locker shouldn't wait for a scroll.
      if (location.hash === '#evidence-locker') _load();
    }

    // Primary path: runs after the deferred-DOMContentLoaded gate (i.e. once the
    // lite roster index has loaded), matching how the rest of the page boots — so
    // when Firebase is healthy the Locker initializes with live data.
    document.addEventListener('DOMContentLoaded', _init);
    // Safety net: that gate only fires once the Firestore index resolves. If
    // Firebase is misconfigured or unreachable and the gate never fires, initialize
    // anyway off the bundled static data so the Locker can never hang on its
    // spinner. _init is idempotent (guarded by _initDone), so racing both paths is
    // harmless — whichever fires first wins, the other no-ops.
    (function () {
      var realAEL = (typeof _originalAddEventListener === 'function')
        ? _originalAddEventListener : document.addEventListener.bind(document);
      function _fallbackInit() {
        // Give the deferred (live-data) path a brief head start before falling
        // back, so live evidence is preferred whenever Firebase does come through.
        setTimeout(function () { try { _init(); } catch (e) { console.error('Evidence Locker init failed:', e); } }, 4000);
      }
      if (document.readyState === 'loading') {
        realAEL.call(document, 'DOMContentLoaded', _fallbackInit);
      } else {
        _fallbackInit();
      }
    })();
  })();
  
