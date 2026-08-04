// ─────────────────────────────────────────────────────────────────────────────
// Accountability Score engine
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 54786 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  (function(){
    'use strict';
    var ACCT_VERSION = 1;

    function aesc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
    function acctMd(t){ return aesc(t).replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e6ecf5;font-weight:700;">$1</strong>'); }
    function clamp(n, lo, hi){ n = Math.round(n); return Math.max(lo, Math.min(hi, isNaN(n) ? lo : n)); }

    function acctRating(s){
      if (s >= 80) return 'Highly Accountable';
      if (s >= 65) return 'Mostly Accountable';
      if (s >= 50) return 'Mixed';
      if (s >= 35) return 'Questionable';
      return 'Low Accountability';
    }
    function acctLevelColor(s){
      if (s >= 65) return '#4ade80';
      if (s >= 50) return '#f5c842';
      return '#f87171';
    }
    // Exposed so other <script> blocks (the alignment quick-view, etc.) can render
    // the same accountability rating label and color without re-deriving the bands.
    window.acctRating = acctRating;
    window.acctLevelColor = acctLevelColor;
    // One-line, plain-language read of what the score means — so the metric explains
    // itself ("how well they keep their word") rather than reading as an abstract number.
    function acctPlain(s){
      if (s >= 80) return 'Consistently follows through on their word.';
      if (s >= 65) return 'Generally keeps their promises.';
      if (s >= 50) return 'A mixed record of keeping their word.';
      if (s >= 35) return 'Often falls short of their promises.';
      return 'Rarely follows through on their word.';
    }

    // Curated, fact-grounded overrides for the two flagship profiles, mirroring
    // the narratives already established elsewhere in the app.
    var CURATED = {
      trump: {
        overall: 29,
        categories: { promise: 24, voting: 84, rhetoric: 31, redflags: 22, transparency: 30 },
        strengths: [
          "**Ideological consistency:** Conservative judicial appointments (3 Supreme Court Justices, 200+ federal judges) and the 2017 Tax Cuts and Jobs Act closely matched campaign rhetoric.",
          "**Deregulation & trade:** Followed through on protectionist tariffs and large-scale federal deregulation as promised.",
          "**Energy posture:** Delivered pledged fossil-fuel deregulation and expanded federal land leasing."
        ],
        concerns: [
          "**Quantitative pledges broken:** Complete debt elimination, Mexican funding for the border wall, and full ACA repeal all failed to materialize.",
          "**Fiscal divergence:** Record deficits and a ~$7.9 trillion first-term debt increase directly contradicted balanced-budget rhetoric.",
          "**Legal & election controversies:** Ongoing indictments and contested-election disputes drive a heavy red-flag load."
        ],
        truthsVsMyths: [
          { myth: '"Mexico paid for the border wall."', truth: 'No — construction was financed by roughly $15 billion in U.S. appropriations and redirected military-construction funds (GAO-20-331).' },
          { myth: '"Trump eliminated the national debt."', truth: 'The opposite — the national debt rose approximately $7.9 trillion during his first term.' },
          { myth: '"Obamacare was repealed and replaced."', truth: 'Repeal-and-replace failed in 2017 despite Republican congressional majorities; the ACA remains in force.' },
          { myth: '"Trump never keeps his word."', truth: 'On ideology he is highly consistent — three Supreme Court justices, the 2017 tax cuts, and sweeping deregulation were all delivered.' }
        ],
        analystSummary: "From an analyst's vantage, Donald Trump shows exceptionally high consistency on ideological deliverables — judicial appointments, tax cuts, deregulation, and tariffs all tracked his campaign platform. The qualitative alignment between rhetoric and conservative policy outcomes is among the strongest on record.",
        factCheckerSummary: "A fact-checker's review finds that the headline quantitative promises — debt elimination, Mexican wall funding, and full ACA repeal — were systematically broken, while record deficits undercut fiscal rhetoric. Legal and election controversies further depress the objective accountability rating.",
        consensus: "Both perspectives converge on a sharp split: Donald Trump is highly faithful to ideological commitments yet broke most of his marquee quantitative pledges. Combined with a heavy controversy load, that yields a Low Accountability score of 29/100 despite near-perfect platform consistency."
      },
      cox: {
        overall: 66,
        categories: { promise: 70, voting: 73, rhetoric: 57, redflags: 60, transparency: 63 },
        strengths: [
          "**Second Amendment & social policy:** Delivered HB 60 constitutional carry and first-in-the-nation social-media-for-minors restrictions, as pledged.",
          "**Rural investment:** Secured $100M+ for rural broadband and led bipartisan Western water-preservation coalitions.",
          "**Bipartisan governing tone:** Maintained a moderate, cross-aisle brand with verified follow-through on mental-health parity."
        ],
        concerns: [
          "**Box Elder data-center campus:** The 9 GW / 40,000-acre approval places major strain on Utah's power grid and water supply during a statewide water crisis.",
          "**CentraCom ties:** Family fiber-infrastructure interests positioned to benefit from regional rollouts raise conflict-of-interest scrutiny.",
          "**Bond financing:** State revenue bonds funded developer utility infrastructure while bypassing direct voter consent, in tension with fiscal-accountability rhetoric."
        ],
        truthsVsMyths: [
          { myth: '"Cox is just another anti-tech conservative."', truth: 'He signed first-in-the-nation social-media-for-minors restrictions and championed statewide broadband expansion.' },
          { myth: '"Utah\'s water rules apply to everyone equally."', truth: 'Residential conservation targets sit alongside multi-million-gallon water-cooling approvals for the Box Elder data-center campus.' },
          { myth: '"Every major project went through the voters."', truth: 'State utility revenue bonds funded developer infrastructure, bypassing direct voter referendums.' }
        ],
        analystSummary: "From an analyst's vantage, Spencer Cox shows dependable follow-through on his core platform — constitutional carry, landmark youth social-media regulation, rural broadband, and mental-health parity were all delivered with bipartisan support.",
        factCheckerSummary: "A fact-checker's review flags a real gap between residential water-conservation rhetoric and industrial water-cooling approvals, plus transparency concerns around utility-bond financing and family business ties to CentraCom.",
        consensus: "Both perspectives agree the record is solid but imperfect: Spencer Cox reliably delivers on social and rural-investment pledges, yet large-scale tech-infrastructure deals, bond financing that bypassed voters, and family business ties pull the score to a Mostly Accountable 66/100."
      }
    };

    var AccountabilityAnalyzer = {
      analyze: function(id, p){
        p = p || {};
        var name = p.name || 'This official';
        var first = name.split(' ')[0];
        var base = (p.score === null || p.score === undefined) ? 60 : (+p.score || 0);
        var kept = +p.kept || 0, broken = +p.broken || 0, pending = +p.pending || 0;
        var resolved = kept + broken;
        var promiseKeeping = resolved ? clamp(kept / resolved * 100, 0, 100) : clamp(base, 0, 100);

        // Extract stated positions
        var stances = p.stances || {};
        var brokenStances = [], keptStances = [];
        Object.keys(stances).forEach(function(k){
          var t = stances[k];
          if (!t || typeof t !== 'string') return;
          var label = k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1');
          if (t.indexOf('❌') > -1 || t.indexOf('🔥') > -1) {
            brokenStances.push({ label: label, text: t.replace(/[❌🔥]/g, '').trim() });
          } else if (t !== 'N/A' && t !== 'No stated position' && t !== 'No detailed healthcare position stated') {
            keptStances.push({ label: label, text: t.trim() });
          }
        });

        var promises = Array.isArray(p.promises) ? p.promises : [];
        var keptProm = promises.filter(function(r){ return r && r.verdict === 'kept'; });
        var brokenProm = promises.filter(function(r){ return r && r.verdict === 'broken'; });
        var issues = (p.issues && p.issues.length ? p.issues : (p.keyIssues || [])) || [];

        var bn = brokenStances.length + brokenProm.length;

        // Category scores (0–100)
        var votingConsistency = clamp(base * 0.65 + promiseKeeping * 0.35 - broken * 1.5, 12, 97);
        var rhetoric = clamp(base - bn * 6 - 2, 12, 96);
        var redFlags = clamp(90 - bn * 12 - broken * 3, 10, 96);
        var transparency = clamp(base - 6 + keptStances.length * 2, 14, 95);

        var cats = [
          { key: 'promise', label: 'Promise Keeping', score: clamp(promiseKeeping, 0, 100), w: 0.28 },
          { key: 'voting', label: 'Voting Consistency', score: votingConsistency, w: 0.22 },
          { key: 'rhetoric', label: 'Rhetoric vs Reality', score: rhetoric, w: 0.20 },
          { key: 'redflags', label: 'Red Flags / Controversies', score: redFlags, w: 0.18 },
          { key: 'transparency', label: 'Transparency', score: transparency, w: 0.12 }
        ];

        // ── Integrity signal from curated/flagged Spotlight drivers ──────────
        // The Accountability Score is the INTEGRITY read (words vs. actions and
        // public conduct), so the curator-tagged Spotlight items move the number
        // directly — this is what keeps it from echoing the formal Promise %.
        // Only the non-promise integrity drivers count here; the promise ledger
        // is already captured by the 'promise' category above, so folding it in
        // again would double-count. Positive drivers lift Rhetoric/Transparency;
        // negative drivers weigh on Rhetoric/Red-Flags. Magnitudes are modest so
        // evidence nudges the score without overwhelming the baseline read.
        try {
          var _drv = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
          var _integ = _drv.filter(function(d){ return d && d.kind === 'spotlight'; });
          var _pos = _integ.filter(function(d){ return d.impact === 'positive'; }).length;
          var _neg = _integ.filter(function(d){ return d.impact === 'negative'; }).length;
          if (_pos || _neg) {
            var _byKey = {}; cats.forEach(function(c){ _byKey[c.key] = c; });
            var _lift = _pos * 4, _drag = _neg * 5;
            if (_byKey.rhetoric)     _byKey.rhetoric.score     = clamp(_byKey.rhetoric.score + _lift - _drag, 12, 96);
            if (_byKey.redflags)     _byKey.redflags.score     = clamp(_byKey.redflags.score - _drag, 10, 96);
            if (_byKey.transparency) _byKey.transparency.score = clamp(_byKey.transparency.score + Math.round(_lift * 0.6) - Math.round(_drag * 0.4), 14, 95);
          }
        } catch (e) { /* non-fatal — fall back to the baseline category reads */ }

        var curated = CURATED[id] || null;
        if (curated && curated.categories) {
          cats.forEach(function(c){ if (curated.categories[c.key] != null) c.score = curated.categories[c.key]; });
        }

        var overall = clamp(cats.reduce(function(a, c){ return a + c.score * c.w; }, 0), 0, 100);
        if (curated && curated.overall != null) overall = curated.overall;

        // Key strengths
        var strengths;
        if (curated && curated.strengths) {
          strengths = curated.strengths.slice();
        } else {
          strengths = [];
          // Lead with the integrity-positive Spotlight drivers — the words-match-
          // actions / principled-consistency items that define this score — so the
          // "Lifting" read is about character, not a restated promise rate.
          var _sdAll = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
          var _sdPos = _sdAll.filter(function(d){ return d.kind === 'spotlight' && d.impact === 'positive'; });
          var _sdNeg = _sdAll.filter(function(d){ return d.kind === 'spotlight' && d.impact === 'negative'; });
          _sdPos.slice(0, 2).forEach(function(d){ strengths.push("**" + d.headline + ":** " + (d.body || d.why || 'Consistent between word and action.')); });
          // The promise-keeping line only when there is a resolved ledger to cite.
          if (resolved > 0) strengths.push("**Promise follow-through:** " + kept + " kept vs " + broken + " broken — a " + promiseKeeping + "% keep rate on resolved commitments.");
          keptStances.slice(0, 3).forEach(function(s){ strengths.push("**" + s.label + ":** " + s.text); });
          keptProm.slice(0, 2).forEach(function(r){ strengths.push("**Kept — " + r.title + ":** " + (r.detail || 'Delivered as pledged.')); });
          if (issues.length) strengths.push("**Issue focus:** Sustained legislative engagement on " + issues.slice(0, 3).join(', ') + ".");
          if (strengths.length < 2) strengths.push("**Baseline integrity:** Core biographical and office records verify cleanly against official registries.");
        }

        // Major concerns / red flags
        var concerns;
        if (curated && curated.concerns) {
          concerns = curated.concerns.slice();
        } else {
          concerns = [];
          // Lead with the integrity-negative Spotlight drivers — reversals,
          // inconsistencies and conduct flags — for the same reason.
          var _cdNeg = (typeof window._slComputeDrivers === 'function')
            ? window._slComputeDrivers(p, id).filter(function(d){ return d.kind === 'spotlight' && d.impact === 'negative'; }) : [];
          _cdNeg.slice(0, 2).forEach(function(d){ concerns.push("**" + d.headline + ":** " + (d.body || d.why || 'A gap between stated position and conduct.')); });
          brokenStances.slice(0, 3).forEach(function(s){ concerns.push("**" + s.label + " gap:** " + s.text); });
          brokenProm.slice(0, 2).forEach(function(r){ concerns.push("**Broken — " + r.title + ":** " + (r.detail || 'Pledge not delivered.')); });
          if (pending > 0) concerns.push("**" + pending + " pledge" + (pending === 1 ? '' : 's') + " unresolved:** Commitments not yet delivered or formally abandoned.");
          if (redFlags < 55 && !_cdNeg.length) concerns.push("**Elevated controversy load:** Multiple flagged inconsistencies weigh on the overall accountability rating.");
          if (concerns.length === 0) concerns.push("**Thin reform record:** No major promise reversals verified this cycle, but limited co-sponsorship on flagship reforms warrants monitoring.");
        }

        // Truths vs Myths
        var tvm;
        if (curated && curated.truthsVsMyths) {
          tvm = curated.truthsVsMyths.slice();
        } else {
          tvm = [];
          if (resolved > 0) {
            tvm.push({ myth: '"' + first + '\'s promises are just campaign talk."', truth: 'The verified ledger shows ' + kept + ' kept vs ' + broken + ' broken promises — a ' + promiseKeeping + '% keep rate once pending items are set aside.' });
          } else {
            var _tvmPos = (typeof window._slComputeDrivers === 'function')
              ? window._slComputeDrivers(p, id).filter(function(d){ return d.kind === 'spotlight' && d.impact === 'positive'; })[0] : null;
            if (_tvmPos) tvm.push({ myth: '"' + first + ' just says what people want to hear."', truth: _tvmPos.headline + (_tvmPos.body ? ' — ' + _tvmPos.body : '') });
          }
          if (brokenStances[0]) tvm.push({ myth: '"' + first + ' fully delivered on ' + brokenStances[0].label.toLowerCase() + '."', truth: brokenStances[0].text });
          else if (brokenProm[0]) tvm.push({ myth: '"Every major pledge was honored."', truth: '"' + brokenProm[0].title + '": ' + (brokenProm[0].detail || 'recorded as broken.') });
          if (keptStances[0]) tvm.push({ myth: '"' + first + ' is all rhetoric, no record."', truth: keptStances[0].label + ': ' + keptStances[0].text });
          else if (keptProm[0]) tvm.push({ myth: '"Nothing actually got done."', truth: '"' + keptProm[0].title + '" was delivered: ' + (keptProm[0].detail || 'kept as pledged.') });
        }

        var analystScore = clamp(overall + 6, 0, 100);
        var fcScore = clamp(overall - 7, 0, 100);

        var analystSummary = curated && curated.analystSummary ? curated.analystSummary
          : ("From an analyst's vantage, " + first + " demonstrates " + (overall >= 65 ? 'strong and largely consistent' : overall >= 50 ? 'selective but real' : 'limited but non-zero') + " follow-through. Strengths cluster around " + (issues[0] || 'core platform priorities') + ", backed by a " + promiseKeeping + "% promise-keeping rate on resolved pledges.");
        var fcSummary = curated && curated.factCheckerSummary ? curated.factCheckerSummary
          : ("A fact-checker's review flags " + (bn > 0 ? bn + ' notable inconsistenc' + (bn === 1 ? 'y' : 'ies') : 'thin documentation on flagship pledges') + " between public messaging and the record. " + (broken > 0 ? broken + ' broken promise' + (broken === 1 ? '' : 's') + ' temper the headline narrative.' : 'Unresolved pending commitments keep the ceiling in check.'));
        var consensus = curated && curated.consensus ? curated.consensus
          : ("Across an advocacy-minded analyst read and a skeptical fact-checker read, " + name + " lands at an Accountability Score of " + overall + "/100 (" + acctRating(overall) + "). " + (overall >= 65 ? "The record shows dependable follow-through with a few areas worth watching." : overall >= 50 ? "The record is genuinely mixed: real deliverables sit alongside notable gaps between rhetoric and action." : "The analysis surfaces significant divergence between stated commitments and verified action."));

        var justification = name + " scores " + overall + "/100 — a weighted blend of promise-keeping (" + promiseKeeping + "%), voting consistency, rhetoric-vs-reality, controversy load, and transparency.";

        return {
          politicianId: id,
          version: ACCT_VERSION,
          generatedAt: (new Date()).toISOString(),
          overallScore: overall,
          rating: acctRating(overall),
          color: acctLevelColor(overall),
          justification: justification,
          categories: cats.map(function(c){ return { key: c.key, label: c.label, score: c.score }; }),
          analyst: { score: analystScore, summary: analystSummary, strengths: strengths },
          factChecker: { score: fcScore, summary: fcSummary, concerns: concerns },
          truthsVsMyths: tvm,
          strengths: strengths,
          concerns: concerns,
          consensus: consensus
        };
      }
    };

    // ── Persistence (Firestore, merged into the existing politician document) ──
    function saveAccountability(id, data){
      try {
        if (typeof PROFILES !== 'undefined' && PROFILES[id]) PROFILES[id].accountability = data;
        if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) CMP_DATA[id].accountability = data;
      } catch (e) { /* non-fatal */ }
      try {
        if (typeof db !== 'undefined' && db && db.collection) {
          db.collection('politicians').doc(id).set({ accountability: data }, { merge: true })
            .catch(function(e){ console.warn('Accountability save failed:', e && e.message); });
        }
      } catch (e) { console.warn('Accountability save error:', e); }
    }

    function getProfile(id){
      var p = (typeof PROFILES !== 'undefined') ? PROFILES[id] : null;
      if (!p && typeof CMP_DATA !== 'undefined') p = CMP_DATA[id];
      return p;
    }

    // ═══ Shared Spotlight ↔ Accountability linkage ═══════════════════════════
    // The Spotlight section and the Accountability card both render from ONE
    // ordered list of score-driving items, so they map to each other by index:
    // contribution row i in the Accountability card highlights Spotlight card i,
    // and tapping Spotlight card i highlights contribution row i. The source is
    // strictly the official's own record — curator-flagged Spotlight entries
    // (impact 'positive'/'negative') followed by the kept/broken promise ledger
    // the score is actually computed from. Nothing is invented here.
    window._slSafeId = function(id){ return String(id == null ? '' : id).replace(/[^a-zA-Z0-9_-]/g, ''); };

    // Shared HTML-attribute/text escaper for source labels and URLs rendered by
    // the Spotlight cards, the medium modal and the Accountability card.
    window._slEsc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };

    // Maps a Spotlight item's `category` to the Accountability category it feeds.
    window._slCatLabel = function(key){
      var m = { promise:'Promise Keeping', voting:'Voting Consistency', rhetoric:'Rhetoric vs Reality', redflags:'Red Flags / Controversies', transparency:'Transparency' };
      return m[key] || '';
    };

    // ═══ Curated Accountability Spotlight — the INTEGRITY data layer ══════════
    // This is the personal-integrity-and-consistency record the Accountability of
    // Truth Score reads from — deliberately SEPARATE from Promise % (which tracks
    // formal in-office votes/bills/pledges). Each entry is a summarized, sourced
    // highlight about how an official behaves outside their formal power: whether
    // their public words match their actions, how they conduct themselves across
    // platforms and over time, and notable controversies or principled stands
    // that reflect character. Curated repo-side so it ships and renders without a
    // database round-trip; editor/Firestore `spotlight` entries merge on top.
    //
    // Item shape (top 3–5 per official; quality over quantity):
    //   impact   : 'positive' (words match actions / principled consistency) or
    //              'negative' (reversal, inconsistency, controversy). Drives the score.
    //   category : which integrity dimension it touches —
    //              'rhetoric' (words vs. reality), 'redflags' (controversy/conduct),
    //              'transparency', 'voting', 'promise'.
    //   date     : the year/span of the underlying, verifiable event.
    //   headline : the one-line summary shown everywhere.
    //   facts    : the grounded specifics (plain text; no fabrication).
    //   why      : why it speaks to integrity/consistency specifically.
    //   source   : { label, url } — clear sourcing for the claim.
    //   tags     : 1–2 human-readable categories from a small, fixed vocabulary
    //              (Consistency, Notable Actions, Public Statements, Rhetoric vs
    //              Reality, Positive Leadership, Public Behavior) shown as skimmable
    //              chips in the medium modal and full profile. Present on EVERY
    //              highlight so categorization is uniform across all officials.
    //
    // NOTE for future work — these officeholders still appear in Key Races /
    // Relevant to Me with a THIN integrity record here and need research:
    // bob_stevenson, lisa_shepherd, rshipp, jdraxler, jwestwood, jake_sawyer,
    // and the Davis/Weber/SLC State House profiles still missing data
    // (gsnow, jellis, sstoddard, cperry, pstrong) plus the local MAYORS and
    // 2026 CANDIDATES tiers, which remain the sparsest part of this layer.
    // The June 2026 expansion added 22 more Wasatch Front State Senators &
    // Representatives concentrated in Davis, Weber, Salt Lake County and Utah
    // County — janderegg, dhinkins, rwinterton, dowens_st, rspendlove,
    // kstratton, jbriscoe, swaldrip, cmusselman, jburton, tyler_clancy,
    // jferry, carl_albrecht, paul_a_cutler, stewart_e_barlow, cheryl_acton,
    // james_dunnigan, ryan_d_wilcox, jon_hawkins, doug_fiefia,
    // kay_christofferson and nelson_abbott — each with 3–5 sourced,
    // pattern-focused highlights, `tags`, and a one-line theme, plus aliases
    // (tclancy, dhawkins, mmckell, csnider) so the data lights up on whichever
    // surface the id comes from. An earlier pass added 20 legislators and
    // backfilled tags onto the original national figures, so every official is
    // uniformly categorized, tagged and themed.
    window.ACCT_SPOTLIGHT = window.ACCT_SPOTLIGHT || {};;

    // ── Overall Accountability theme per official (the one-line read) ─────────
    // A short, balanced summary of the integrity picture the items above add up
    // to — shown above the Spotlight drivers and in the medium modal so the
    // section opens with a synthesis, not just a list. Deliberately even-handed
    // (names both the strength and the caveat) and, like the items, separate
    // from Promise %. An editor/Firestore `spotlightTheme` on the document
    // overrides this curated default.
    window.ACCT_THEME = window.ACCT_THEME || {
      plumb: 'A frontline ER physician whose overdose-prevention work predates and matches her legislating — a rare record measured in lives saved.',
      verona_mauga: 'A barrier-breaking newcomer with a thin but real early record; a first-in-the-nation child-protection law is the clearest marker so far, while direct on-camera statements from her remain limited.',
      curtis: 'Consistent on his signature climate-Republican brand across offices, but the voting record runs behind the rhetoric.',
      lee: 'Long, genuine fiscal-constitutional consistency, paired with sharp reversals and norm-bending conduct on his own platforms.',
      bmoore: 'A work-within-the-system institutionalist whose affiliations, output and a principled certification vote mostly match the brand — with the occasional procedural maneuver.',
      maloy: 'Grounds her rural-water and public-lands work in genuine legal expertise, but pairs it with selective credit-claiming — touting federal funds from a law whose spending she has publicly criticized.',
      kennedy: 'Unusually consistent — a physician whose healthcare focus has held steady across four offices and who handled a high-profile loss gracefully.',
      owens: 'A strong personal-responsibility throughline, undercut by spending and election-conduct choices that sit against the brand.',
      lyman: 'Acts on his stated convictions at real personal cost, but handled a 2024 primary loss with unproven fraud claims.',
      cox: 'Generally lives the civility and empathy he preaches, with a real gap between conservation rhetoric and large industrial approvals.',
      trump: 'Highly faithful to ideological promises, but a heavy load of broken quantitative pledges and norm controversies.',
      dhenderson: 'A consistent, fact-based defender of election integrity — including against pressure from her own party.',
      sadams: 'An effective long-time leader, but a 2024–25 non-disclosure raised real conflict-of-interest and transparency questions.',
      mschultz: 'States his agenda plainly and delivers it, and has turned oversight toward his own caucus when needed — though his push of the court-voided “Amendment D” cut against that transparency.',
      tlee: 'Polarizing and combative; early concealment gave way to openly stated — and openly criticized — conduct.',
      blouin_s13: 'A minority-party voice who presses transparency standards on the chamber’s leadership, on the merits.',
      hollins_h24: 'Tight alignment between her social-work expertise and a steady, principled equity agenda.',
      lescamilla: 'A barrier-breaking west-side advocate who backs her positions with follow-through and accepts setbacks gracefully.',
      kriebe: 'A teacher-legislator whose public-education advocacy lines up with her classroom career and a self-described willingness to cast lonely “no” votes.',
      spitcher: 'A working prosecutor who champions criminal-justice reform even against her own profession’s lobby, and one of the chamber’s most effective members.',
      bking: 'A long-serving minority leader whose insurance-law career matches his health focus, who lost a statewide race on values rather than grievance.',
      jdailey: 'A public-health specialist and steady, multi-year steward of Utah’s medical-cannabis program who builds bipartisan coalitions from the minority.',
      dmccay: 'Openly owns his signature, polarizing causes for years, with a pragmatic step back from his near-total abortion ban once courts intervened.',
      kivory: 'Built a genuinely consistent national land-transfer crusade that also drew a formal watchdog complaint he was never charged over.',
      mwinder: 'A capable public servant whose record is permanently marked by a 2011 fake-byline deception he ultimately disclosed himself.',
      jteuscher: 'A constitutional-law attorney entrusted with ethics oversight; a cleaner, lower-drama public-conduct record so far.',
      cpierucci: 'A fast-rising young leader whose signature school-choice law was struck down — and who answered the ruling by attacking the judge.',
      seliason: 'Utah’s go-to suicide-prevention lawmaker — a decade-long, consensus-built effort that helped seed the national 988 line.',
      amillner: 'A former university president whose education and economic-development focus in the Senate mirrors the institution she once led.',
      cwilson: 'A third-generation Logan business owner who ran on a clear reform message and stays active in local charity.',
      dthatcher: 'Left the dominant party on principle and originated the idea behind the national 988 line — a record of personally grounded, costly stands.',
      klisonbee: 'A consistent lead sponsor on abortion restrictions whose 2022 “intake of semen” remark became a national flashpoint she had to walk back.',
      wharper: 'The Legislature’s longest-serving member, with a decades-long transportation focus and a national, bipartisan leadership role.',
      lfillmore: 'A career-educator senator focused on education funding whose 2025 school-tax overhaul drew a “public trust” veto.',
      mballard: 'A higher-education budget chair, recognized by the institutions she funds, who publicly pushes for fewer, better bills.',
      kgrover: 'A former educator who steered Utah’s marquee anti-DEI law through the Senate and made on-record commitments to narrow its reach.',
      nthurston: 'A PhD health economist who pursues market-pragmatic, sometimes cross-ideological cost-cutting and openly names contradictions in policy he helped write.',
      tweiler: 'An accessible, plain-spoken senator with a consistent decade-long internet-safety record — though the same blunt online style draws as much criticism as praise.',
      rward: 'A practicing family physician who legislates from medical evidence and will break with his own caucus when the science points the other way.',
      kcullimore: 'A privacy-and-tech legislator who wrote Utah’s consumer-privacy and youth social-media laws, shadowed by conflict questions over his family firm’s eviction practice.',
      aromero: 'A community-organizer-turned-minority-leader whose multi-year fight to test Utah’s rape-kit backlog became law.',
      cbramble: 'A powerful CPA-dealmaker and former national legislative leader — two decades of tax-cutting consistency and a defended election compromise, paired with a hardball reputation.',
      jstevenson: 'A long-serving Davis County budget chief whose appropriations work and Hill AFB advocacy match his district — though the budgets he writes have outpaced his own restraint rhetoric.',
      valpeterson_h56: 'A higher-education budget leader who funds the very university where he is a vice president — deep expertise that doubles as a standing conflict question.',
      fitisemanu_h30: 'The first Pacific Islander in the Utah Legislature, a public-health professional whose health-equity focus tracks his career and community.',
      mckell_s25: 'A trial attorney who became the national face of regulating minors’ social media, defending the laws openly through the litigation they invited.',
      gwynn_h6: 'A working law-enforcement officer who legislates the public-safety issues he handles on duty.',
      bwilson: 'A construction-businessman Speaker who made rescuing the Great Salt Lake his signature cause, then spent ~$2.8M of his own money on a Senate bid that finished a distant third.',
      kwan_s12: 'The first Chinese-American woman in the Legislature — a psychology professor whose steady advocacy against anti-Asian hate and for mental health tracks her identity and career.',
      brammer_s21: 'A BYU-trained attorney behind the unanimously praised Business and Chancery Court, whose porn-label and platform bills test whether his “not censorship / free speech” framing matched reality.',
      ssandall: 'A third-generation farmer whose Great Salt Lake and agricultural-water laws match his career, known for brokering deals to land contested water legislation.',
      evickers: 'The Legislature’s only pharmacist and a three-term Senate Majority Leader whose deep healthcare ties power his rural-health focus — and also drew conflict-of-interest accusations he rebutted.',
      snider_h5: 'A rancher, land-conservancy director and volunteer firefighter whose natural-resource and firefighter-health laws line up tightly with his life, elevated young to House Majority Leader.',
      defay_h15: 'A Davis County family-business executive and GOP campaign veteran appointed to Brad Wilson’s seat, who carried a Democrat’s child-marriage bill to a near-unanimous vote.',
      hall_h11: 'A registered nurse and freshman who authored Utah’s marquee anti-DEI law, making on-record promises about what it would not do — a clean rhetoric-vs-reality test still to be checked.',
      koford_h10: 'A Weber County Republican who flipped a seat by 309 votes on her second try and became a first-term lead on Great Salt Lake conservation, heavily funded by GOP leadership PACs.',
      jake_sawyer: 'A former Weber County GOP chair newly elected in 2024 whose record is still mostly campaign promises — one to watch as a voting record accumulates.',
      fgibson: 'A former House Majority Leader with a real record on homelessness and dropout prevention, but whose inland-port leadership repeatedly leaned against transparency and local legal recourse.',
      cory_maloy_h52: 'A communications professional with a consistent, multi-session Second Amendment and election-integrity record in a safe Lehi seat.',
      whyte_h63: 'An MPA-credentialed appropriations chair with strong local support but a thin public-conduct record, who has skipped voluntary candidate surveys.',
      gricius_h50: 'An Eagle Mountain citizen-activist-turned-legislator with a high-volume, high-controversy portfolio — election-data privacy and AI chatbot rules alongside the nation’s first fluoride ban.',
      lisa_shepherd: 'A longtime Provo GOP organizer and former county-commission policy advisor newly elected in 2024 — a coherent service path with a record still too short to fully test.',
      kohler_h59: 'A generational Midway dairy farmer and 16-year county commissioner whose water-and-ag focus fits his life, notable for openly owning a floor mistake and a non-absolutist take on book bans.',
      bolinder_h68: 'A Grantsville business-background legislator elevated to leadership in 2025 who then announced he won’t seek re-election — a thin public record beyond leadership and steady wins.',
      // June 2026 Wasatch Front expansion themes
      janderegg: 'A technology professional whose decade-long data-privacy and economic-development focus tracks his career, with a steady, low-drama public record.',
      dhinkins: 'A working rancher whose record stays rooted in rural agriculture and energy, with the occasional cross-grain stand — like protecting public-worker bargaining rights.',
      rwinterton: 'The Uinta Basin’s consistent energy-and-lands voice, who broke from type to sponsor a state refugee-services office.',
      dowens_st: 'A former educator turned methodical central-Utah steward, pairing rural energy and public-safety bills with on-the-record transparency and property-rights work.',
      rspendlove: 'The Legislature’s economist-in-residence: a former state chief economist who supplies the data behind Utah’s tax cuts and favors substance over spectacle.',
      kstratton: 'An attorney-legislator who practices the conservation he preaches — putting water-wise mandates on government first — across a disciplined public-lands and water record.',
      jbriscoe: 'A former teacher and long-serving Salt Lake City Democrat whose decade of public-education, clean-air and transit advocacy is consistent and openly argued from the minority.',
      swaldrip: 'The Legislature’s housing expert who gave up his seat to implement his own ideas as the Governor’s housing advisor, staking his credibility on a measurable 35,000-home target.',
      cmusselman: 'A consistent child-safety and public-safety legislator who also took on the unglamorous work of chairing economic-development appropriations.',
      jburton: 'A retired Major General who legislates the veterans and National Guard world he led, and who stepped into a thankless interim health post during the pandemic.',
      tyler_clancy: 'A working Provo police detective and one of the chamber’s youngest members who legislates the homelessness and public-safety beat he walks — though his zero-tolerance camp approach draws advocate pushback.',
      jferry: 'A fifth-generation farmer who authored Utah’s Great Salt Lake water-leasing law and then left office to run the agency that executes it — strong follow-through shadowed by a standing conflict-of-interest question.',
      carl_albrecht: 'A career rural-utility executive steering Utah’s nuclear and water future, with a coherent energy-and-agriculture portfolio and proactive disaster-resilience work.',
      paul_a_cutler: 'A Davis County representative who makes accountability his subject — tightening conflict-of-interest and candidate-disclosure rules on officials like himself.',
      stewart_e_barlow: 'A practicing surgeon who legislates healthcare from firsthand experience, an expertise-to-law match that also raises the usual insider-writing-his-own-industry’s-rules question.',
      cheryl_acton: 'A steady West Jordan representative focused on disclosure and student-data privacy, willing to apply tougher candidate-disclosure rules to her own contests.',
      james_dunnigan: 'A long-serving health-and-insurance workhorse with genuine institutional expertise — and a recurring conflict-of-interest question because that expertise is his own industry.',
      ryan_d_wilcox: 'An Ogden-area representative with a durable limited-government and child-protection throughline across a long, interrupted tenure, who pushes structural checks on rulemaking.',
      jon_hawkins: 'A Pleasant Grove consensus-builder trusted with technical, high-stakes bills that pass by near-unanimous margins, including a governor-requested government restructuring.',
      doug_fiefia: 'A tech-industry insider turned freshman who writes first-in-the-nation data-ownership and child-safety law against his former industry’s defaults — a focused, independent debut.',
      kay_christofferson: 'A civil engineer on the transportation beat whose expertise-to-policy match is clean, but whose state-override-of-a-city move sits in tension with his caucus’s local-control rhetoric.',
      nelson_abbott: 'An Orem attorney doing the careful, unglamorous civil-justice reform — guardianship, competency and probate — that quietly protects people with little political voice.',
      // June 2026 high-visibility gap-fill — nationally prominent figures and Utah mayors/officials.
      massie: 'A genuinely consistent libertarian-constitutionalist who casts lonely “no” votes on principle — even against his own party and president — though critics read the same independence as obstruction.',
      tgabbard: 'A high-profile journey from progressive Democrat to Trump-era DNI, anchored by a real anti-interventionist core but shadowed by conviction-vs-ambition questions after a full party switch.',
      hegseth: 'A combat-veteran defense secretary whose warfighter focus is genuine, but who arrived amid a razor-thin confirmation and information-handling lapses that test the standards he sets for the force.',
      boebert: 'A populist whose hardline brand authentically matches her biography, undercut by repeated personal-conduct controversies and a district switch to a safer seat.',
      mtg: 'A maximally confrontational figure who states her positions plainly but carries a record heavy on sanctions, conspiracy claims later walked back, and self-defeating leadership fights.',
      gaetz: 'A Trump-era provocateur who forced out a Speaker and then flamed out of an AG nomination, his tenure ending under a cloud of ethics questions he resigned ahead of.',
      rfkjr: 'An environmental-lawyer-turned-health-secretary with a real anti-establishment throughline, but whose vaccine claims run against scientific consensus and whose 2024 path raised conviction-vs-deal questions.',
      sanders: 'Remarkably consistent on economic populism for four decades — the rare politician whose message barely changes — with a recurring critique about wealth-vs-rhetoric.',
      nhaley: 'A disciplined establishment hawk capable of costly stands like the Confederate-flag removal, whose Trump-era posture has shifted with the political winds.',
      biden: 'A career institutionalist who kept major legislative and withdrawal promises and honored the transfer of power, but whose candor about his age and capacity became the defining accountability question of his term.',
      obama: 'A disciplined communicator who kept his signature ACA promise, paired with real rhetoric-vs-reality gaps on transparency, surveillance and “keep your plan.”',
      gwbush: 'A consequential wartime president who later owned his failures, but whose Iraq-WMD rationale and Katrina response remain central accountability marks — balanced by the lifesaving PEPFAR program.',
      cstewart: 'A reliable Utah national-security conservative whose mid-term 2023 resignation, citing family health, drew both sympathy and criticism for the costly special election it forced.',
      jdougall: 'A self-styled “watchdog” auditor who built genuine government-transparency tools, balanced against the partisan edge critics saw in some of his probes.',
      emendenhall: 'A data-and-air-quality SLC mayor whose environmental brand is backed by real initiatives, tested by the homelessness and downtown-safety pressures every big-city mayor faces.',
      jwilson: 'A veteran public servant from a prominent Utah family whose county-government record is steady and process-respecting, shadowed by the usual dynasty questions.',
      // July 2026 — District 6. This blurb is load-bearing, not decoration: the roster
      // `office` field can only say "Utah State Representative" (a /former/ office on a
      // pid in _UTAH_HOUSE_INFO is a hard failure by design), so the dates of his
      // federal service have to live somewhere a reader sees them, and this is it.
      rob_bishop: 'A former Utah House Speaker and nine-term U.S. Representative (2003–2021) who returned to the state House in May 2026 by special election, back on the public-lands and water fights he built his federal career on — and again pledging to term-limit himself.'
    };

    // ── Spotlight key aliases ────────────────────────────────────────────────
    // A handful of sitting legislators carry rich curated Spotlight data under the
    // browse-directory pid (e.g. `dmccay`) while the "Relevant to Me" surface
    // (_getPrimaryReps) iterates the CMP_DATA pid (e.g. `mccay_s11`). This map
    // lets the same drivers and theme light up on BOTH surfaces by resolving the
    // CMP_DATA pid back to the curated key when a direct lookup misses. Add a pair
    // here whenever a person exists under two ids and only one carries Spotlight.
    window.ACCT_ALIAS = window.ACCT_ALIAS || {
      mccay_s11: 'dmccay',
      harper_s16: 'wharper',
      teuscher_h44: 'jteuscher',
      eliason_h45: 'seliason',
      ivory_h39: 'kivory',
      lisonbee_h14: 'klisonbee',
      // `cullimore_s19` is a RETIRED id (db/vr-pid-aliases.json) — it was the
      // duplicate district-ballot record for Sen. Kirk Cullimore, merged into
      // `kcullimore`. Kept here on purpose: a saved My-Team pick or bookmark stored
      // under the old id still resolves to his curated Spotlight data.
      cullimore_s19: 'kcullimore',
      // June 2026 Wasatch Front expansion — map Power-Map short pids to the
      // canonical curated keys the new Spotlight/theme data is stored under.
      tclancy: 'tyler_clancy',
      dhawkins: 'jon_hawkins',
      mmckell: 'mckell_s25',
      csnider: 'snider_h5',
      // June 2026 video-evidence pass — bridge the browse-roster ids to the
      // CMP_DATA pids the curated Spotlight/theme data is stored under, so the
      // integrity items (and the new video-grounded ones) light up on the
      // browse profile too, not only the Relevant-to-Me surface.
      trevor_lee: 'tlee',
      escamilla: 'lescamilla',
      romero: 'aromero',
      stephanie_gricius: 'gricius_h50',
      jake_fitisemanu: 'fitisemanu_h30',
      // June 2026 connected-evidence completion — bridge the remaining sitting
      // Utah State Legislators' browse-roster ids to the curated keys their
      // Spotlight/theme data is already stored under. Each promise and Issue
      // Position for these members already carries a shared issueKey; without
      // this alias their (issueKey-tagged) Spotlight items never resolve on the
      // browse profile, so the Connected-Evidence view could only ever show the
      // stance+promise pair, never the full three-layer stance+promise+record.
      // Every mapping is name-verified against the curated entry's content.
      vickers: 'evickers',
      schultz: 'mschultz',
      weiler: 'tweiler',
      mccay: 'dmccay',
      cullimore: 'kcullimore',
      stevenson: 'jstevenson',
      millner: 'amillner',
      sandall_s: 'ssandall',
      blouin: 'blouin_s13',
      grover: 'kgrover',
      mckell: 'mckell_s25',
      val_peterson: 'valpeterson_h56',
      eliason: 'seliason',
      teuscher: 'jteuscher',
      hollins: 'hollins_h24',
      ray_ward: 'rward',
      snider: 'snider_h5',
      lisonbee: 'klisonbee',
      ken_ivory: 'kivory',
      brady_brammer: 'brammer_s21',
      katy_hall: 'hall_h11',
      // Split-key evidence fix: the Batch 6 Salt Lake County roster stored Sheriff
      // Rivera's profile under 'rosie_rivera_slco' (matching her curated stance cards),
      // but her Evidence Locker items live under the older 'rosie_rivera' key. Bridge
      // them so her connected evidence surfaces on the profile.
      rosie_rivera_slco: 'rosie_rivera',
      // July 2026 launch cleanup — collapse duplicate person records to one
      // curated key each (see scripts/cleanup-utah-duplicate-records-jul2026.mjs).
      mike_smith_utco: 'mike_smith_sheriff',
      mhogan: 'michelle_kaufusi',
      dwatts: 'monica_zoltanski_sandy',
      rwood: 'troy_walker_draper',
      // `calbrecht` is a RETIRED id (db/vr-pid-aliases.json) — the second Carl
      // Albrecht record, whose six bill-sourced stance cards, Evidence Locker group
      // and theme blurb were merged into `carl_albrecht` (the roster / browse /
      // Utah-map id) in July 2026. Kept here for the same reason as
      // `cullimore_s19`: a saved My-Team pick or bookmark stored under the old id
      // still resolves to his curated Spotlight data.
      calbrecht: 'carl_albrecht',
      // July 2026 surface-split sweep — browse-directory pid → curated roster id
      // for the Utah legislators whose spotlight cards are keyed on a slug of
      // their display name while their cmp-data.js record lives under a short id.
      // These are ONE person with one roster record, not merged duplicates: the
      // curated stance block stays under the name-slug key per this repo's
      // stance-key convention (see db/vr-pid-aliases.json and STANCE_ALIASES),
      // and _resolveStanceList()'s name-slug fallback already reached it. What
      // was missing is the profile hop — openModal() resolves PROFILES/CMP_DATA
      // and, before this pass, never followed ACCT_ALIAS, so tapping any of these
      // cards dead-ended on "This profile couldn't be loaded". Bridging them here
      // also brings their cards under section 6's label-vs-roster check.
      // (`derek_brown` is the exception — a genuine retired id, see below.)
      derek_brown:       'derek_brown_ut',
      evan_vickers:      'evickers',
      mike_mckell:       'mckell_s25',
      mike_schultz:      'mschultz',
      steve_eliason:     'eliason_h45',
      karen_kwan:        'kwan_s12',
      daniel_mccay:      'mccay_s11',
      ariel_defay:       'defay_h15',
      wayne_harper:      'harper_s16',
      keith_grover:      'kgrover',
      kirk_cullimore:    'kcullimore',
      mike_kohler:       'kohler_h59',
      rosie_rivera:      'rosie_rivera_slco',
      sandra_hollins:    'hollins_h24',
      angela_romero:     'aromero',
      karianne_lisonbee: 'lisonbee_h14',
      jordan_teuscher:   'teuscher_h44',
      ann_millner:       'amillner',
    };

    // ── Profile-id resolution — the other half of ACCT_ALIAS's old dual duty ──
    // ACCT_ALIAS above answers "where is this person's CURATED data?" — its values
    // are theme / ACCT_SPOTLIGHT keys, and six of them (`kivory`, `wharper`,
    // `seliason`, `klisonbee`, `dmccay`, `jteuscher`) deliberately have no
    // cmp-data.js record at all. Profile loading needs the opposite answer: "which
    // id has a real roster record?" Reading ACCT_ALIAS for both questions is what
    // left `ken_ivory` → `kivory` resolving to an id that names nobody, so the
    // modal dead-ended even though Ken Ivory is in the roster as `ivory_h39`.
    //
    // This table answers ONLY the profile question, and only where ACCT_ALIAS
    // cannot. Every value MUST be a live cmp-data.js id — scripts/
    // test-identity-integrity.mjs section 11 enforces that, and also fails if a
    // new curated key is added without a bridge here. Each mapping is the REVERSE
    // of an existing ACCT_ALIAS entry (`ivory_h39: 'kivory'` is the repo already
    // saying those two ids are one person), so nothing here is a new claim.
    //
    // ACCT_ALIAS is intentionally NOT edited: the curated key is re-derived from
    // the roster id by its existing entries, which is why the ACCT_THEME blurb and
    // the ACCT_SPOTLIGHT drivers keep resolving after a click lands on the roster
    // id (`kivory` → opens `ivory_h39` → _slTheme follows `ivory_h39: 'kivory'`
    // → ACCT_THEME.kivory). Its 2-hop curated chains are left alone; profile
    // resolution no longer walks them.
    window.PDX_PROFILE_ALIAS = window.PDX_PROFILE_ALIAS || {
      // curated keys with no roster record of their own
      kivory:    'ivory_h39',
      wharper:   'harper_s16',
      seliason:  'eliason_h45',
      klisonbee: 'lisonbee_h14',
      dmccay:    'mccay_s11',
      jteuscher: 'teuscher_h44',
      // short browse / catalog pids whose ACCT_ALIAS entry targets one of those
      ken_ivory: 'ivory_h39',
      eliason:   'eliason_h45',
      teuscher:  'teuscher_h44',
      lisonbee:  'lisonbee_h14',
      mccay:     'mccay_s11',
      // Stance-block keys. Each is a slug of the roster record's own display name
      // — the documented stance-key convention (db/vr-pid-aliases.json), where 24
      // of the 25 Utah "surface splits" turned out to be ONE record whose curated
      // block is keyed on the name slug, not two identities. So these are reverse
      // bridges, exactly like the ACCT ones above, and not merges:
      // _resolveStanceList(rosterId) already returns the block filed under the key
      // on its left. Without them a Stance Library row, a comparison-board dot and
      // an issue-view chip all opened nothing.
      bridger_bolinder: 'bolinder_h68',
      casey_snider:     'snider_h5',
      cory_maloy:       'cory_maloy_h52',
      curt_bramble:     'cbramble',
      don_ipson:        'dipson',
      jerry_stevenson:  'jstevenson',
      jill_koford:      'koford_h10',
      luz_escamilla:    'lescamilla',
      matthew_gwynn:    'gwynn_h6',
      nate_blouin:      'blouin_s13',
      phil_lyman:       'lyman',
      scott_chew:       'chew_h68',
      scott_sandall:    'ssandall',
      stephen_l_whyte:  'whyte_h63',
      // sadams keeps its own 7-card block, which _resolveStanceList prefers; this
      // bridge fixes the dead click and lands on the right person. The 3 cards
      // filed under stuart_adams stay shadowed — collapsing them is a content
      // decision, tracked separately.
      stuart_adams:     'sadams',
      tiara_auxier:     'auxier_h4',
      todd_weiler:      'tweiler',
      troy_shelley:     'shelley_h66',
    };

    // Resolve any id to one a profile can actually open, in a single step.
    // Single-hop-on-miss, deliberately: a candidate is accepted only if IT has a
    // record, so nothing chains through a dead id, a real profile always beats an
    // alias, and an unknown id passes through untouched so callers can still show
    // their own not-found state instead of silently opening the wrong person.
    window.PDXProfilePid = function (id) {
      if (!id) return id;
      var hasRec = function (x) {
        return !!((window.PROFILES && window.PROFILES[x]) ||
                  (typeof CMP_DATA !== 'undefined' && CMP_DATA[x]));
      };
      if (hasRec(id)) return id;
      var direct = window.PDX_PROFILE_ALIAS && window.PDX_PROFILE_ALIAS[id];
      if (direct && hasRec(direct)) return direct;
      var curated = window.ACCT_ALIAS && window.ACCT_ALIAS[id];
      if (curated && hasRec(curated)) return curated;
      return id;
    };

    // Resolve the overall theme for an official: a document-authored
    // `spotlightTheme` wins; otherwise the curated ACCT_THEME default. Returns
    // '' when there is nothing to show so callers can omit the banner cleanly.
    window._slTheme = function(p, id){
      p = p || {};
      var t = (p && typeof p.spotlightTheme === 'string') ? p.spotlightTheme.trim() : '';
      if (!t && id != null && window.ACCT_THEME){
        var _tk = (window.ACCT_ALIAS && window.ACCT_ALIAS[id] && typeof window.ACCT_THEME[id] !== 'string') ? window.ACCT_ALIAS[id] : id;
        if (typeof window.ACCT_THEME[_tk] === 'string') t = window.ACCT_THEME[_tk].trim();
      }
      return t || '';
    };

    // A compact themed banner shown above the Spotlight drivers — frames the
    // section with a one-line synthesis and reiterates the separation from
    // Promise %. Returns '' when no theme is available.
    window._slThemeBanner = function(p, id){
      var t = (typeof window._slTheme === 'function') ? window._slTheme(p, id) : '';
      if (!t) return '';
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      return '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(139,92,246,0.04));border:1px solid rgba(139,92,246,0.32);border-radius:0.7rem;padding:0.6rem 0.75rem;margin:0 0 0.85rem;">' +
          '<span style="font-size:0.85rem;line-height:1.1;flex-shrink:0;">🛡️</span>' +
          '<div style="min-width:0;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.1rem;">Accountability Theme · Integrity &amp; Consistency</div>' +
            '<div style="font-size:0.72rem;color:#cdd9ec;line-height:1.5;">' + esc(t) + '</div>' +
          '</div>' +
        '</div>';
    };

    // ── Spotlight evidence row ────────────────────────────────────────────────
    // Turns a Spotlight item's attached proof into clear, tappable links:
    // official floor/committee VIDEO opens with its timestamp ("▶ Watch · 24:42"),
    // an X post opens as "𝕏 View post", audio/document get their own glyphs, and
    // the written CITATION shows as a "🔗 Source" chip whenever it points somewhere
    // different from the media. The link URL is media.url when present, otherwise
    // the item's source.url — the floor-video records keep the watchable link on
    // `source` and only the medium + timestamp on `media`, so this recovers the
    // video link either way. Returns '' when there's nothing to open, so callers
    // can drop it in unconditionally. Shared by the medium-modal (_slCard) and the
    // full-analysis (_slRenderFullCard) Spotlight surfaces so video/post evidence
    // reads the same everywhere. `opts.stop` adds stopPropagation for cards that
    // are themselves tappable.
    // Name the kind of official video an item links to — "floor" or "committee" —
    // from its media kind/label, so a watch link reads as the authoritative source
    // it is ("Watch floor video · 24:42") rather than a generic link. Returns a
    // trailing-spaced word ('floor ' / 'committee ') or '' when it can't be told.
    window._slVideoKindWord = function(m){
      if (!m) return '';
      var k = String(m.kind || '').toLowerCase();
      if (k === 'committee') return 'committee ';
      if (k === 'floor') return 'floor ';
      var l = String(m.label || '').toLowerCase();
      if (/committee/.test(l)) return 'committee ';
      if (/floor/.test(l)) return 'floor ';
      return '';
    };

    window._slEvidenceRow = function(o, opts){
      o = o || {}; opts = opts || {};
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      var stop = opts.stop ? 'event.stopPropagation();' : '';
      var m = o.media || null;
      var st = String(o.sourceType || '');
      var srcUrl = (o.source && o.source.url) ? o.source.url : '';
      var mediaUrl = (m && m.url) ? m.url : '';
      var primaryUrl = mediaUrl || srcUrl;
      var type = (m && m.type) ? m.type
               : (/x_post|tweet/.test(st) ? 'x_post'
               : /facebook|fb_post/.test(st) ? 'facebook'
               : /video/.test(st) ? 'video'
               : /audio/.test(st) ? 'audio' : '');
      var MEDIA = {
        video:  { g: '▶',  col: '245,200,66'  },
        x_post: { g: '𝕏', col: '139,160,190' },
        facebook: { g: '📘', col: '146,166,232' },
        audio:  { g: '🎧', col: '167,139,250' },
        text:   { g: '📄', col: '120,180,140' }
      };
      var links = [];
      if (type && MEDIA[type] && primaryUrl) {
        var md = MEDIA[type];
        var ts = (m && m.timestamp) ? esc(m.timestamp) : '';
        var vk = (type === 'video' && typeof window._slVideoKindWord === 'function') ? window._slVideoKindWord(m) : '';
        var txt = type === 'video'  ? ('Watch ' + vk + 'video' + (ts ? ' · ' + ts : ''))
                : type === 'x_post' ? 'View post'
                : type === 'facebook' ? 'View Facebook post'
                : type === 'audio'  ? ('Listen' + (ts ? ' · ' + ts : ''))
                : 'Read';
        var ttl = (m && m.label) ? ' title="' + esc(m.label) + '"' : '';
        links.push('<a href="' + esc(primaryUrl) + '" target="_blank" rel="noopener" onclick="' + stop + '"' + ttl +
          ' style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:rgb(' + md.col + ');background:rgba(' + md.col + ',0.12);border:1px solid rgba(' + md.col + ',0.4);padding:0.14rem 0.5rem;border-radius:999px;">' + md.g + ' ' + txt + ' ↗</a>');
        // All-Seeing Eye cue — lead the row with the eye when the proof is video,
        // so the recognizable "video evidence" marker reads before the link text.
        if (type === 'video' && typeof window._pdxVideoEye === 'function') {
          var _eye = window._pdxVideoEye({ url: primaryUrl, timestamp: (m && m.timestamp) || '', kind: String(vk || '').trim() }, { stop: !!opts.stop });
          if (_eye) links.unshift(_eye);
        }
      }
      // Citation — show when it's a distinct destination (or the only link).
      if (srcUrl && (!links.length || srcUrl !== primaryUrl)) {
        links.push('<a href="' + esc(srcUrl) + '" target="_blank" rel="noopener" onclick="' + stop + '"' +
          ' style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);padding:0.14rem 0.5rem;border-radius:999px;">🔗 Source: ' + esc((o.source && o.source.label) || 'Link') + ' ↗</a>');
      }
      if (!links.length) return '';
      return '<div style="margin-top:0.5rem;display:flex;flex-wrap:wrap;gap:0.35rem;">' + links.join('') + '</div>';
    };

    // The single ordered driver list shared by both sections. Merges, in priority
    // order: (1) editor/Firestore-authored `spotlight` drivers on the document,
    // then (2) the curated repo-side integrity layer (ACCT_SPOTLIGHT[id]), then
    // (3) the kept/broken promise ledger. Deduped by headline and capped at five
    // so the medium modal and Accountability card stay summarized, never a dump.
    window._slComputeDrivers = function(p, id){
      p = p || {};
      var out = [];
      var seen = {};
      function key(h){ return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
      function pushDriver(it){
        if (!it || (it.impact !== 'positive' && it.impact !== 'negative')) return;
        if (out.length >= 5) return;
        var hl = it.headline || it.title || 'Tracked issue';
        var k = key(hl);
        if (k && seen[k]) return;
        if (k) seen[k] = 1;
        out.push({
          kind: 'spotlight', impact: it.impact,
          headline: hl,
          date: it.date || '', category: it.category || '',
          // Light, human-readable categorization (1–2 simple tags such as
          // "Consistency", "Public Statements", "Rhetoric vs Reality") that sits
          // alongside the structured `category` so items are easy to filter,
          // summarize and skim in the medium modal and full profile.
          tags: Array.isArray(it.tags) ? it.tags.slice(0, 2) : [],
          body: it.facts || it.detail || '', why: it.why || '',
          source: it.source || null,
          // Carry the attached proof so a driver card can open the official
          // floor/committee video (with its timestamp) or X post directly —
          // the medium + timestamp live on `media`, the link on `media.url`
          // or, for floor-video items, on `source.url`.
          media: it.media || null, sourceType: it.sourceType || '', issueKey: it.issueKey || '',
          badge: it.badge || (it.impact === 'positive' ? '🛡️ Helps the Score' : '🛡️ Hurts the Score')
        });
      }
      // (1) Document-authored drivers take precedence.
      (Array.isArray(p.spotlight) ? p.spotlight : []).forEach(pushDriver);
      // (2) Curated repo-side integrity highlights fill in the rest. When a person
      // exists under two ids (a browse pid and a CMP_DATA pid), resolve the alias
      // so the same drivers light up on whichever surface the id came from.
      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;
      var curatedSl = (_slKey && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[_slKey])) ? window.ACCT_SPOTLIGHT[_slKey] : [];
      curatedSl.forEach(pushDriver);
      // (3) The formal promise ledger rounds out the picture (kept/broken).
      var proms = Array.isArray(p.promises) ? p.promises : [];
      proms.filter(function(r){ return r && r.verdict === 'broken'; }).slice(0, 2).forEach(function(r){
        out.push({ kind:'broken', impact:'negative', headline:r.title, date:r.date || '', category:'promise', body:r.detail || '', source:r.source || null, badge:'⚠ Promise Broken' });
      });
      proms.filter(function(r){ return r && r.verdict === 'kept'; }).slice(0, 2).forEach(function(r){
        out.push({ kind:'kept', impact:'positive', headline:r.title, date:r.date || '', category:'promise', body:r.detail || '', source:r.source || null, badge:'✅ Promise Kept' });
      });
      return out;
    };

    // ── "Pattern at a glance" summary bar ─────────────────────────────────────
    // A factual, skimmable read of the integrity record so a voter grasps the
    // OVERALL pattern without reading every highlight: how many flagged items
    // strengthen vs. weigh on the Accountability Score, and which categories they
    // fall under. It restates only the tags already on the record — it never
    // invents a judgement. `variant` 'med' renders a tight row for the medium
    // modal; 'full' adds the per-category chips. Returns '' when there's nothing
    // meaningful to summarize. Shared by all three Spotlight surfaces so they read
    // as one system.
    window._slPatternBar = function(items, variant){
      items = Array.isArray(items) ? items : [];
      if (!items.length) return '';
      var esc = (typeof window._slEsc === 'function') ? window._slEsc : function(s){ return String(s == null ? '' : s); };
      var pos = 0, neg = 0, neu = 0, catCount = {}, catOrder = [];
      items.forEach(function(it){
        if (it.impact === 'positive') pos++;
        else if (it.impact === 'negative') neg++;
        else neu++;
        var c = it.category || '';
        if (c){ if (catCount[c] == null){ catCount[c] = 0; catOrder.push(c); } catCount[c]++; }
      });
      // Plain-language read that only restates the balance of tagged items.
      var lead;
      if (pos && neg) lead = 'Mixed record — both strengths and concerns are flagged.';
      else if (pos && !neg) lead = 'Flagged items so far all strengthen the score.';
      else if (neg && !pos) lead = 'Flagged items so far all weigh on the score.';
      else lead = 'Tracked for context — nothing flagged as a score driver yet.';

      var tally = '';
      if (pos) tally += '<span class="sl-tally sl-tally-pos">▲ ' + pos + ' strengthen</span>';
      if (neg) tally += '<span class="sl-tally sl-tally-neg">▼ ' + neg + ' weigh on</span>';
      if (neu) tally += '<span class="sl-tally sl-tally-neu">● ' + neu + ' context</span>';

      var catChips = '';
      if (variant === 'full' && catOrder.length){
        catChips = '<div class="sl-pattern-cats">' + catOrder.slice(0, 6).map(function(c){
          var lbl = (typeof window._slCatLabel === 'function' && window._slCatLabel(c)) || (c.charAt(0).toUpperCase() + c.slice(1));
          return '<span class="sl-cat-chip">' + esc(lbl) + ' · ' + catCount[c] + '</span>';
        }).join('') + '</div>';
      }
      return '<div class="sl-pattern-bar">' +
          '<div class="sl-pattern-lead">' + lead + '</div>' +
          '<div class="sl-pattern-tally">' + tally + '</div>' +
          catChips +
        '</div>';
    };

    // ── Full-profile Spotlight rendering ──────────────────────────────────────
    // The medium modal surfaces only the top 2–4 score DRIVERS; the full
    // Accountability analysis shows the COMPLETE integrity record. _slAllHighlights
    // returns the merged, deduped, UNCAPPED list — document `spotlight` first, then
    // the curated repo-side layer (resolving the browse↔CMP_DATA alias) — including
    // neutral context items, every entry normalized to a single shape.
    window._slAllHighlights = function(p, id){
      p = p || {};
      var out = [], seen = {};
      function key(h){ return String(h || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 70); }
      function norm(it){
        if (!it) return null;
        var hl = it.headline || it.title || '';
        if (!hl) return null;
        var k = key(hl);
        if (k && seen[k]) return null;
        if (k) seen[k] = 1;
        var impact = (it.impact === 'positive' || it.impact === 'negative') ? it.impact : 'neutral';
        return { impact: impact, category: it.category || '', date: it.date || '',
          headline: hl, body: it.facts || it.detail || '', why: it.why || '',
          source: (it.source && it.source.url) ? it.source : null,
          media: it.media || null, sourceType: it.sourceType || '',
          tags: Array.isArray(it.tags) ? it.tags.slice(0, 3) : [] };
      }
      (Array.isArray(p.spotlight) ? p.spotlight : []).forEach(function(it){ var n = norm(it); if (n) out.push(n); });
      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;
      var curated = (_slKey && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[_slKey])) ? window.ACCT_SPOTLIGHT[_slKey] : [];
      curated.forEach(function(it){ var n = norm(it); if (n) out.push(n); });
      return out;
    };

    // One highlight card for the full Accountability view. Carries data-slcat /
    // data-slimpact so the category/impact filter chips can show & hide it. Shares
    // the dark, gold-accented house style and the ▲/▼ score-impact language of the
    // medium modal so the two surfaces read as one system. Body/why preserve any
    // inline source links (trusted curated/editor text); headline & tags escaped.
    window._slRenderFullCard = function(o){
      var esc = window._slEsc;
      var pos = o.impact === 'positive', neg = o.impact === 'negative';
      var edge = pos ? '74,222,128' : neg ? '248,113,113' : '120,140,170';
      var pill = pos ? '▲ Strengthens score' : neg ? '▼ Weighs on score' : '● Context · no score impact';
      var pillCol = pos ? '74,222,128' : neg ? '248,113,113' : '159,180,212';
      var catLabel = (o.category && typeof window._slCatLabel === 'function') ? window._slCatLabel(o.category) : '';
      var tagChips = (o.tags && o.tags.length) ? o.tags.map(function(t){
        return '<span style="color:#9fc6e8;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.32);padding:0.04rem 0.4rem;border-radius:999px;">' + esc(t) + '</span>';
      }).join('') : '';
      var srcRow = (typeof window._slEvidenceRow === 'function')
        ? window._slEvidenceRow(o, {})
        : ((o.source && o.source.url) ?
        '<div style="margin-top:0.5rem;"><a href="' + esc(o.source.url) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.3rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.06em;text-transform:uppercase;color:#86b8e0;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.3);padding:0.14rem 0.5rem;border-radius:999px;">🔗 Source: ' + esc(o.source.label || 'Link') + ' ↗</a></div>' : '');
      var metaRow = (catLabel || tagChips) ?
        '<div style="margin-top:0.5rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">' +
          (catLabel ? '<span style="color:#c4b5fd;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.4);padding:0.05rem 0.4rem;border-radius:999px;">' + esc(catLabel) + '</span>' : '') +
          tagChips +
        '</div>' : '';
      return '<div class="sl-full-card" data-slcat="' + esc(o.category || 'other') + '" data-slimpact="' + o.impact + '" style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-left:3px solid rgba(' + edge + ',0.7);border-radius:0.75rem;padding:0.8rem 0.9rem;margin-bottom:0.6rem;">' +
        '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;">' +
          (o.date ? '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;font-weight:600;letter-spacing:0.04em;color:#9a8a55;">' + esc(o.date) + '</span>' : '') +
          '<span style="margin-left:auto;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.52rem;letter-spacing:0.07em;text-transform:uppercase;color:rgb(' + pillCol + ');background:rgba(' + pillCol + ',0.12);border:1px solid rgba(' + pillCol + ',0.4);padding:0.1rem 0.4rem;border-radius:999px;">' + pill + '</span>' +
        '</div>' +
        '<h4 style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.95rem;line-height:1.25;color:white;margin:0 0 ' + (o.body ? '0.35rem' : '0') + ';">' + esc(o.headline) + '</h4>' +
        (o.body ? '<p style="font-size:0.72rem;color:#c7d4e8;line-height:1.55;margin:0 0 ' + (o.why ? '0.45rem' : '0') + ';">' + o.body + '</p>' : '') +
        (o.why ? '<div style="display:flex;gap:0.4rem;font-size:0.7rem;line-height:1.5;color:#e3c97a;background:rgba(245,200,66,0.06);border-radius:0.5rem;padding:0.45rem 0.55rem;"><span style="flex-shrink:0;">⚡</span><span><strong style="color:#f5c842;">Why it matters:</strong> ' + o.why + '</span></div>' : '') +
        srcRow + metaRow +
      '</div>';
    };

    // Client-side category/impact filter for the full Spotlight list. Toggles each
    // card by its data-slcat / data-slimpact attribute and moves the active chip.
    window._slFilterFull = function(safeId, val){
      var wrap = document.getElementById('sl-full-' + safeId);
      if (!wrap) return;
      var cards = wrap.querySelectorAll('.sl-full-card');
      cards.forEach(function(c){
        var match = (val === 'all') ||
          (val === 'strength' && c.getAttribute('data-slimpact') === 'positive') ||
          (val === 'concern' && c.getAttribute('data-slimpact') === 'negative') ||
          (c.getAttribute('data-slcat') === val);
        c.style.display = match ? '' : 'none';
      });
      var chips = wrap.querySelectorAll('[data-slchip]');
      chips.forEach(function(ch){
        if (ch.getAttribute('data-slchip') === val) ch.classList.add('sl-chip-on');
        else ch.classList.remove('sl-chip-on');
      });
    };

    // The full integrity record for the Accountability analysis overlay: a clear
    // "what this measures vs Promise %" header, the one-line Accountability Theme,
    // optional category/impact filter chips when the list is long, the complete set
    // of highlights, and an honest empty state when the record is still thin.
    window._slFullSection = function(p, id){
      p = p || {};
      var safeId = (typeof window._slSafeId === 'function') ? window._slSafeId(id) : String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
      var esc = window._slEsc;
      var items = (typeof window._slAllHighlights === 'function') ? window._slAllHighlights(p, id) : [];
      var themeHtml = (typeof window._slThemeBanner === 'function') ? window._slThemeBanner(p, id) : '';
      var last = (p && p.name) ? esc(String(p.name).trim().split(/\s+/).pop()) : 'this official';

      var header = '<div style="margin-bottom:0.85rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;display:flex;align-items:center;gap:0.4rem;">🔦 In the Spotlight — Integrity &amp; Consistency</div>' +
        '<p style="font-size:0.74rem;color:#9fb4d4;line-height:1.55;margin:0.35rem 0 0;">The personal-integrity record behind ' + last + '’s Accountability Score — public statements, conduct and notable actions that show whether the words match the actions over time. This is the <strong style="color:#c4b5fd;">character &amp; consistency</strong> read, <strong style="color:#cdd9ec;">separate from the Promise %</strong> (which tracks formal in-office votes, bills and pledges).</p>' +
      '</div>';

      if (!items.length){
        return '<div style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.02));border:1px solid rgba(139,92,246,0.3);border-radius:0.95rem;padding:1.1rem;">' +
          header + themeHtml +
          '<div style="background:rgba(10,15,30,0.5);border:1px dashed rgba(139,92,246,0.35);border-radius:0.8rem;padding:1.25rem 1rem;text-align:center;">' +
            '<div style="font-size:1.5rem;opacity:0.5;margin-bottom:0.3rem;">🔦</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.82rem;letter-spacing:0.05em;text-transform:uppercase;color:#9fb4d4;">Limited public-behavior data available</div>' +
            '<p style="font-size:0.72rem;color:#7596c0;line-height:1.55;margin:0.4rem 0 0;">Spotlight highlights for ' + last + ' are coming soon. As verifiable public statements, votes and conduct accumulate, the integrity highlights that drive this score will appear here.</p>' +
          '</div>' +
        '</div>';
      }

      var nPos = items.filter(function(i){ return i.impact === 'positive'; }).length;
      var nNeg = items.filter(function(i){ return i.impact === 'negative'; }).length;
      var cats = [], catSeen = {};
      items.forEach(function(i){ var c = i.category || ''; if (c && !catSeen[c]){ catSeen[c] = 1; cats.push(c); } });

      var chips = '';
      if (items.length > 4 && (cats.length > 1 || (nPos && nNeg))){
        var chipArr = ['<button type="button" data-slchip="all" class="sl-chip sl-chip-on" onclick="window._slFilterFull(\'' + safeId + '\',\'all\')">All ' + items.length + '</button>'];
        if (nPos) chipArr.push('<button type="button" data-slchip="strength" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'strength\')">▲ Strengths ' + nPos + '</button>');
        if (nNeg) chipArr.push('<button type="button" data-slchip="concern" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'concern\')">▼ Concerns ' + nNeg + '</button>');
        cats.forEach(function(c){
          var lbl = (typeof window._slCatLabel === 'function' && window._slCatLabel(c)) || (c.charAt(0).toUpperCase() + c.slice(1));
          chipArr.push('<button type="button" data-slchip="' + esc(c) + '" class="sl-chip" onclick="window._slFilterFull(\'' + safeId + '\',\'' + esc(c) + '\')">' + esc(lbl) + '</button>');
        });
        chips = '<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.75rem;">' + chipArr.join('') + '</div>';
      }

      var cards = items.map(function(o){ return window._slRenderFullCard(o); }).join('');
      var patternHtml = (typeof window._slPatternBar === 'function') ? window._slPatternBar(items, 'full') : '';

      return '<div id="sl-full-' + safeId + '" class="sl-full-wrap" style="background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.02));border:1px solid rgba(139,92,246,0.3);border-radius:0.95rem;padding:1.1rem;">' +
        header + themeHtml + patternHtml + chips + cards +
        '<p style="font-size:0.62rem;color:#4e72a0;line-height:1.5;margin:0.4rem 0 0;text-align:center;">Items marked ▲/▼ feed the Accountability of Truth Score above. Sources linked on each card.</p>' +
      '</div>';
    };

    // ── Score honesty gate ───────────────────────────────────────────────────
    // Whether there is enough VERIFIED record to both compute AND explain a
    // specific Accountability / Truth Score. The engine can always emit a number
    // (it falls back to a baseline read), but a precise percentage we cannot
    // break down — the case on very thin profiles and brand-new 2026 candidates —
    // reads as false confidence and is exactly the kind of misleading figure the
    // rest of the profile works to avoid. Callers use this to choose between
    // showing the number and showing an honest "Score Pending" state instead.
    //
    // A score is explainable when ANY concrete, verified signal exists:
    //   • a curator-authored breakdown (CURATED), or
    //   • a Spotlight item flagged as a score driver, or
    //   • a resolved (kept / broken) promise — from the promise ledger OR the
    //     kept/broken counts / promiseBreakdown, or
    //   • a stated position on the issues.
    // This is the same set of signals the modal's "Why This Score?" breakdown is
    // built from, so the number and its explanation always appear together.
    window._pdxScoreExplainable = function(p, id){
      p = p || {};
      if (typeof CURATED !== 'undefined' && id != null && CURATED[id]) return true;
      var drivers = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
      if (drivers.length) return true;
      var proms = Array.isArray(p.promises) ? p.promises : [];
      if (proms.some(function(r){ return r && (r.verdict === 'kept' || r.verdict === 'broken'); })) return true;
      var pb = p.promiseBreakdown || {};
      if (((+p.kept || 0) + (+p.broken || 0) + (+pb.kept || 0) + (+pb.broken || 0)) > 0) return true;
      if (p.stances && typeof p.stances === 'object'){
        return Object.keys(p.stances).some(function(k){
          var t = p.stances[k];
          return t && typeof t === 'string' && t !== 'N/A' && t !== 'No stated position' && t !== 'No detailed healthcare position stated';
        });
      }
      return false;
    };

    // Brief cross-section highlight pulse (see .sl-flash in CSS).
    window._slFlash = function(el){
      if (!el) return;
      el.classList.remove('sl-flash');
      void el.offsetWidth; // restart the animation
      el.classList.add('sl-flash');
      setTimeout(function(){ if (el) el.classList.remove('sl-flash'); }, 1600);
    };

    // Accountability → Spotlight: jump to (and pulse) the matching Spotlight card.
    window._slFocusSpotlight = function(safeId, i){
      var el = document.getElementById('sl-driver-' + safeId + '-' + i);
      if (!el){
        var sec = document.getElementById('spotlight-modal-section');
        if (sec) sec.scrollIntoView({ behavior:'smooth', block:'start' });
        return;
      }
      // Spotlight write-ups now live behind a closed disclosure (the visible
      // layer is a compact digest), so a jump has to open whatever drawer the
      // target sits in before scrolling — otherwise the scroll lands on a
      // collapsed box. _pdxNavJump already walks and opens that chain; use it
      // when it is available and fall back to the direct scroll when it is not.
      if (typeof window._pdxNavJump === 'function' && document.getElementById('modal-body')) {
        try { window._pdxNavJump('sl-driver-' + safeId + '-' + i, null); window._slFlash(el); return; } catch (e) {}
      }
      el.scrollIntoView({ behavior:'smooth', block:'center' });
      window._slFlash(el);
    };

    // Spotlight → Accountability: jump to the card and pulse the matching row.
    window._slFocusAccountability = function(safeId, i){
      var card = document.getElementById('acct-inline-card');
      if (card) card.scrollIntoView({ behavior:'smooth', block:'start' });
      var row = document.getElementById('acct-contrib-' + safeId + '-' + i);
      if (row) setTimeout(function(){ window._slFlash(row); }, 240);
    };

    // ── Always-visible inline card (purple) ──
    window._renderAccountabilityCard = function(id, p){
      // SCORING CLEANUP: the Accountability of Truth composite is retired as a
      // headline number. This inline profile card (the big purple score ring)
      // no longer renders. The underlying accountability analysis remains
      // reachable via viewAccountabilityAnalysis() from the record/spotlight
      // sections, and the evidence data is untouched. Returning '' cleanly
      // removes the headline ring from the profile with no layout break.
      return '';
      // eslint-disable-next-line no-unreachable
      p = p || getProfile(id) || {};
      var a = p.accountability;
      var safeId = aesc(id);

      // ── Honesty guard: no scorable record yet ────────────────────────────
      // A 2026 candidate or a brand-new officeholder has no resolved promises,
      // votes, or curated record for the engine to ground a score on. Left to
      // its defaults the analyzer would still emit a confident ~60% ("0 kept vs
      // 0 broken — a 60% keep rate"), the exact kind of misleading number the
      // rest of the profile works to avoid. When there is genuinely nothing to
      // score — and no curated or previously-computed score exists — we show an
      // honest "score begins once there's a record" state and deliberately do
      // NOT compute or persist a fabricated one, so the downstream People's
      // Mandate scorecard (which reads p.accountability) stays honest too.
      var _acctScorable = (a && typeof a.overallScore === 'number') ||
        (typeof CURATED !== 'undefined' && CURATED[id]) ||
        (typeof window._pdxDisplayScore === 'function' && window._pdxDisplayScore(p) !== null) ||
        (typeof window._pdxHasPromiseRecord === 'function' && window._pdxHasPromiseRecord(p)) ||
        (function(){ var pb = p.promiseBreakdown || {}; return ((+pb.kept || 0) + (+pb.broken || 0) + (+pb.compromise || 0)) > 0; })();
      if (!_acctScorable) {
        var _acctStatus = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(p) : 'office';
        var _acctCand = _acctStatus === 'candidate';
        var _acct2026 = (typeof window._pdx2026Candidate === 'function') && window._pdx2026Candidate(p);
        var _acctFirst = (p.name ? String(p.name).split(' ')[0] : 'This official');
        var _acctMsg = _acctCand
          ? (_acctFirst + ' is running as a ' + (_acct2026 ? '2026 candidate' : 'candidate') + ' and has no voting record or resolved promises yet, so there is nothing to score. This score appears here once they take office and their first promises resolve.')
          : (_acctFirst + ' is early in their term, with too little verified record to score fairly yet. This score fills in as their promises resolve and votes are logged.');
        return '' +
          '<div style="margin-bottom:1.25rem;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.03));border:1px dashed rgba(139,92,246,0.4);border-radius:0.9rem;padding:0.9rem 1rem;">' +
            '<div style="display:flex;align-items:center;gap:0.9rem;">' +
              '<div style="width:64px;height:64px;flex-shrink:0;border-radius:0.75rem;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.6rem;color:#9fb4d4;line-height:0.9;">—</span>' +
                '<span style="font-size:0.46rem;color:#7596c0;letter-spacing:0.08em;">/ 100</span>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;font-weight:700;">🛡️ Accountability of Truth Score</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-top:0.15rem;">' +
                  '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.35rem;color:#9fb4d4;line-height:1.1;">No record yet</span>' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#a78bfa;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.4);padding:0.12rem 0.5rem;border-radius:999px;">◷ Monitoring</span>' +
                '</div>' +
                '<p style="font-size:0.68rem;color:#7596c0;line-height:1.5;margin:0.3rem 0 0;">' + _acctMsg + '</p>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      // Eagerly compute (and cache) the Accountability of Truth Score so the
      // percentage + rating label are visible by default in the profile modal —
      // never hidden behind a "Run Analysis" click. Falls back to the prompt
      // card only if the engine genuinely can't produce a score.
      if (!(a && typeof a.overallScore === 'number') && typeof window._acctEnsureScore === 'function') {
        try { a = window._acctEnsureScore(id, p) || a; } catch (e) {}
      }

      // ── Honesty gate: a score with no verified basis to explain it ────────
      // Even once the engine can emit a number, showing a precise percentage we
      // cannot break down reads as false confidence. On profiles too thin to
      // explain — typically brand-new 2026 candidates and officials with no
      // resolved promises, stated positions, or Spotlight items yet — we
      // deliberately withhold the specific figure and say so plainly, rather
      // than pairing a number with "there isn't enough information to explain
      // it". The number returns automatically the moment a verified record
      // gives it something to stand on.
      var _acctExplainable = (typeof window._pdxScoreExplainable === 'function')
        ? window._pdxScoreExplainable(p, id) : true;
      if (a && typeof a.overallScore === 'number' && !_acctExplainable) {
        var _liFirst = (p.name ? String(p.name).split(' ')[0] : 'This official');
        return '' +
          '<div style="margin-bottom:1.25rem;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.03));border:1px dashed rgba(139,92,246,0.4);border-radius:0.9rem;padding:0.9rem 1rem;">' +
            '<div style="display:flex;align-items:center;gap:0.9rem;">' +
              '<div style="width:64px;height:64px;flex-shrink:0;border-radius:0.75rem;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.6rem;color:#9fb4d4;line-height:0.9;">—</span>' +
                '<span style="font-size:0.46rem;color:#7596c0;letter-spacing:0.08em;">/ 100</span>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;font-weight:700;">🛡️ Accountability of Truth Score</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-top:0.15rem;">' +
                  '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.35rem;color:#9fb4d4;line-height:1.1;">Score Pending</span>' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.08em;text-transform:uppercase;color:#a78bfa;background:rgba(139,92,246,0.14);border:1px solid rgba(139,92,246,0.4);padding:0.12rem 0.5rem;border-radius:999px;">◷ Limited Data</span>' +
                '</div>' +
                '<p style="font-size:0.68rem;color:#7596c0;line-height:1.5;margin:0.3rem 0 0;">' + _liFirst + '’s stated positions are tracked on this profile, but there isn’t a verified track record yet — resolved promises or curator-flagged Spotlight items — to calculate a score and explain it honestly, so no specific number is shown. It appears here as that record builds.</p>' +
              '</div>' +
            '</div>' +
          '</div>';
      }

      if (a && typeof a.overallScore === 'number') {
        var s = a.overallScore;
        var lvl = a.color || acctLevelColor(s);
        var r = 30, circ = 2 * Math.PI * r, dash = (s / 100) * circ;

        // "What's driving this score" — surface the top positive and negative
        // factors the engine actually used so the number is transparent and ties
        // back to the Spotlight items in the same profile. Pulls straight from the
        // computed analysis (analyst strengths / fact-checker concerns); no new
        // claims are invented here.
        var _acctPos = (a.analyst && a.analyst.strengths) || a.strengths || [];
        var _acctNeg = (a.factChecker && a.factChecker.concerns) || a.concerns || [];
        function _acctDriverRow(txt, col, sym) {
          return '<div style="display:flex;gap:0.45rem;align-items:flex-start;margin-bottom:0.3rem;">' +
            '<span style="color:' + col + ';flex-shrink:0;font-size:0.66rem;line-height:1.5;font-weight:700;">' + sym + '</span>' +
            '<span style="font-size:0.68rem;color:#cbd9ec;line-height:1.45;">' + acctMd(txt) + '</span></div>';
        }
        // ── "Why This Score?" — one cohesive, honest breakdown ───────────────
        //    Answers, in plain language, what is lifting and what is weighing on
        //    the number above. It layers three transparent sources, glance →
        //    detail: (1) a one-line synthesis of the strongest vs weakest scoring
        //    category, (2) the analyst strengths / fact-checker concerns the
        //    engine actually used, split into "Lifting" and "Weighing", and
        //    (3) the curator-tagged Spotlight items the score is computed from,
        //    each tapping through to its Spotlight card. Nothing is invented;
        //    when the record is too thin to explain, it says so honestly.
        var slSafe = (typeof window._slSafeId === 'function') ? window._slSafeId(id) : safeId;
        var _slDrivers = (typeof window._slComputeDrivers === 'function') ? window._slComputeDrivers(p, id) : [];
        var _slPos = 0, _slNeg = 0;
        _slDrivers.forEach(function(d){ if (d.impact === 'positive') _slPos++; else if (d.impact === 'negative') _slNeg++; });

        // Resolved-promise + stated-position signals let us tell a genuinely
        // thin record apart from one we can actually explain. We only promise a
        // detailed "why" when at least one concrete signal exists.
        var _proms = Array.isArray(p.promises) ? p.promises : [];
        var _keptN = _proms.filter(function(r){ return r && r.verdict === 'kept'; }).length;
        var _brokenN = _proms.filter(function(r){ return r && r.verdict === 'broken'; }).length;
        var _stanceN = 0;
        if (p.stances && typeof p.stances === 'object') {
          Object.keys(p.stances).forEach(function(k){
            var t = p.stances[k];
            if (t && typeof t === 'string' && t !== 'N/A' && t !== 'No stated position' && t !== 'No detailed healthcare position stated') _stanceN++;
          });
        }
        // Mirror the honesty gate exactly: we only reach this numeric branch
        // when the score is explainable, so the breakdown is always shown and a
        // specific percentage is never paired with "not enough information".
        // (The kept/broken-counts-only and curated-only cases — which the raw
        // signal flags above miss — are folded in via _acctExplainable.)
        var _hasWhy = _acctExplainable && (_slDrivers.length > 0 || (_keptN + _brokenN) > 0 || _stanceN > 0 ||
          ((+p.kept || 0) + (+p.broken || 0)) > 0 ||
          (typeof CURATED !== 'undefined' && CURATED[id]) ||
          (function(){ var pb = p.promiseBreakdown || {}; return ((+pb.kept || 0) + (+pb.broken || 0)) > 0; })());

        // Strongest / weakest scoring category — the at-a-glance read of WHICH
        // part of the record is moving the number, straight from the computed
        // category scores. No new claims; just surfaces the existing spread.
        var _cats = (a.categories || []).filter(function(c){ return c && typeof c.score === 'number'; });
        var _catHi = null, _catLo = null;
        _cats.forEach(function(c){
          if (!_catHi || c.score > _catHi.score) _catHi = c;
          if (!_catLo || c.score < _catLo.score) _catLo = c;
        });
        var _catLine = '';
        if (_catHi && _catLo && _catHi !== _catLo && (_catHi.score - _catLo.score) >= 8) {
          _catLine = 'Lifted most by <strong style="color:#86efac;">' + aesc(_catHi.label) + '</strong> (' + _catHi.score +
            '); held back most by <strong style="color:#fca5a5;">' + aesc(_catLo.label) + '</strong> (' + _catLo.score + ').';
        } else if (_catHi) {
          _catLine = 'The five scoring categories land fairly evenly — no single area dominates the result.';
        }

        // Section sub-heading helper (Lifting = green, Weighing = red).
        function _whySub(txt, col){
          return '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.09em;text-transform:uppercase;color:' + col + ';margin:0.65rem 0 0.35rem;">' + txt + '</div>';
        }

        var whyBlock = '<div style="margin-top:0.85rem;padding-top:0.8rem;border-top:1px solid rgba(139,92,246,0.22);">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;">⚖️ Why This Score?</span>' +
            (_hasWhy && _slDrivers.length ? '<span style="display:inline-flex;gap:0.3rem;align-items:center;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;">' +
              '<span style="color:#4ade80;">▲ ' + _slPos + '</span><span style="color:#3a4a66;">·</span><span style="color:#f87171;">▼ ' + _slNeg + '</span></span>' : '') +
          '</div>';

        if (!_hasWhy) {
          // Honest limited-data state — the score still stands on the engine's
          // baseline read, but there is no verified record to break it down yet.
          whyBlock += '<p style="font-size:0.68rem;color:#9fb4d4;line-height:1.55;margin:0;">' +
            'There isn’t enough verified information yet to break this score down in detail. As this official’s promises are tracked and Spotlight items are added, the specific factors moving the score will appear here — with each one linking to its place in the Spotlight.</p>';
        } else {
          // (1) Plain-language category synthesis.
          if (_catLine) {
            whyBlock += '<p style="font-size:0.7rem;color:#cbd9ec;line-height:1.5;margin:0 0 0.2rem;">' + _catLine + '</p>';
          }

          // (2) Lifting the score / Weighing it down — the concrete factors.
          if (_acctPos.length) {
            whyBlock += _whySub('▲ Lifting the score', '#86efac');
            _acctPos.slice(0, 2).forEach(function(t){ whyBlock += _acctDriverRow(t, '#4ade80', '▲'); });
          }
          if (_acctNeg.length) {
            whyBlock += _whySub('▼ Weighing it down', '#fca5a5');
            _acctNeg.slice(0, 2).forEach(function(t){ whyBlock += _acctDriverRow(t, '#f87171', '▼'); });
          }

          // (3) Spotlight items feeding this score — the tappable bridge to the
          //     Spotlight section. Each row jumps to (and pulses) its card.
          whyBlock += '<div style="margin-top:0.7rem;padding-top:0.65rem;border-top:1px dashed rgba(139,92,246,0.18);">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.09em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.45rem;">🔦 Spotlight items feeding this score</div>';
          if (_slDrivers.length) {
            _slDrivers.forEach(function(d, i){
              var col = d.impact === 'positive' ? '#4ade80' : '#f87171';
              var sym = d.impact === 'positive' ? '▲' : '▼';
              var cat = (typeof window._slCatLabel === 'function' && d.category) ? window._slCatLabel(d.category) : '';
              var dtags = (Array.isArray(d.tags) && d.tags.length)
                ? ' <span style="color:#9fc6e8;font-size:0.6rem;">' + d.tags.slice(0, 2).map(function(t){ return '#' + aesc(t).replace(/\s+/g, ''); }).join(' ') + '</span>'
                : '';
              var jump = 'if(window._slFocusSpotlight)window._slFocusSpotlight(\'' + slSafe + '\',' + i + ');';
              whyBlock += '<div id="acct-contrib-' + slSafe + '-' + i + '" role="button" tabindex="0"' +
                ' onclick="' + jump + '"' +
                ' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + jump + '}"' +
                ' style="cursor:pointer;display:flex;align-items:flex-start;gap:0.5rem;background:rgba(10,15,30,0.45);border:1px solid rgba(255,255,255,0.06);border-left:2px solid ' + col + ';border-radius:0.55rem;padding:0.42rem 0.55rem;margin-bottom:0.35rem;transition:border-color 0.2s,box-shadow 0.2s;">' +
                '<span style="color:' + col + ';font-weight:700;font-size:0.7rem;line-height:1.5;flex-shrink:0;">' + sym + '</span>' +
                '<span style="flex:1;min-width:0;font-size:0.68rem;color:#cbd9ec;line-height:1.45;">' + aesc(d.headline) +
                  (cat ? ' <span style="color:#8294b4;font-size:0.6rem;">· ' + aesc(cat) + '</span>' : '') +
                  dtags +
                  (d.source && d.source.url ? '<a href="' + window._slEsc(d.source.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();" style="display:inline-block;margin-left:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.04em;color:#86b8e0;text-decoration:none;white-space:nowrap;">🔗 ' + window._slEsc(d.source.label || 'Source') + ' ↗</a>' : '') + '</span>' +
                '<span style="flex-shrink:0;color:#a78bfa;font-size:0.62rem;line-height:1.5;">🔦</span>' +
              '</div>';
            });
            var net = _slPos - _slNeg;
            var netTxt = _slPos + ' lifting · ' + _slNeg + ' weighing — ' +
              (net > 0 ? 'recent Spotlight activity is a net positive on the score.'
                : net < 0 ? 'recent Spotlight activity weighs on the score on balance.'
                : 'recent Spotlight activity is roughly balanced.');
            whyBlock += '<p style="font-size:0.62rem;color:#9fb4d4;line-height:1.5;margin:0.4rem 0 0;">' + netTxt +
              ' <span style="color:#7596c0;">Tap any item to find it in the Spotlight ↓</span></p>';
          } else {
            whyBlock += '<p style="font-size:0.66rem;color:#7596c0;line-height:1.5;margin:0;">No Spotlight items are tagged as score drivers yet — the breakdown above is drawn from this official’s verified record. Tagged issues and events will appear here, linking both ways, as they’re added.</p>';
          }
          whyBlock += '</div>';
        }
        whyBlock += '</div>';

        return '' +
          '<div style="margin-bottom:1.25rem;background:linear-gradient(135deg,rgba(124,58,237,0.2),rgba(139,92,246,0.06));border:1.5px solid rgba(139,92,246,0.45);border-radius:0.9rem;padding:1rem 1.1rem;box-shadow:0 0 26px rgba(139,92,246,0.14);">' +
            '<div style="display:flex;align-items:center;gap:1.05rem;">' +
              '<div style="position:relative;width:78px;height:78px;flex-shrink:0;">' +
                '<svg width="78" height="78" viewBox="0 0 78 78" style="transform:rotate(-90deg);">' +
                  '<circle cx="39" cy="39" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="7"/>' +
                  '<circle cx="39" cy="39" r="' + r + '" fill="none" stroke="#a78bfa" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" style="filter:drop-shadow(0 0 6px rgba(167,139,250,0.65));"/>' +
                '</svg>' +
                '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                  '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.7rem;color:#fff;line-height:0.9;">' + s + '</span>' +
                  '<span style="font-size:0.5rem;color:#9fb4d4;letter-spacing:0.08em;">/ 100</span>' +
                '</div>' +
              '</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.64rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;font-weight:700;">🛡️ Accountability of Truth Score</div>' +
                '<div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.2rem;flex-wrap:wrap;">' +
                  '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.7rem;color:#fff;line-height:1;">' + s + '%</span>' +
                  '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.06em;text-transform:uppercase;color:' + lvl + ';background:' + lvl + '1f;border:1px solid ' + lvl + '66;padding:0.16rem 0.55rem;border-radius:999px;">' + aesc(a.rating || acctRating(s)) + '</span>' +
                '</div>' +
                '<div style="font-size:0.72rem;color:#cbd9ec;line-height:1.4;margin-top:0.3rem;">' + acctPlain(s) + '</div>' +
                '<div style="height:6px;background:rgba(10,15,30,0.8);border-radius:999px;overflow:hidden;margin-top:0.5rem;">' +
                  '<div style="height:100%;width:' + s + '%;background:linear-gradient(90deg,#7c3aed,' + lvl + ');border-radius:999px;transition:width 1.1s cubic-bezier(0.4,0,0.2,1);"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            whyBlock +
            '<div style="display:flex;gap:0.5rem;margin-top:0.75rem;">' +
              '<button onclick="viewAccountabilityAnalysis(\'' + safeId + '\')" style="flex:1;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#7c3aed,#a78bfa);border:none;padding:0.6rem;border-radius:0.6rem;box-shadow:0 4px 14px rgba(124,58,237,0.3);">View Full Analysis</button>' +
              '<button onclick="openAccountabilityAnalysis(\'' + safeId + '\')" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.68rem;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5fd;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.4);padding:0.6rem 0.8rem;border-radius:0.6rem;">↻ Re-run</button>' +
            '</div>' +
          '</div>';
      }

      // Not yet analyzed
      return '' +
        '<div style="margin-bottom:1.25rem;background:linear-gradient(135deg,rgba(124,58,237,0.1),rgba(139,92,246,0.03));border:1px dashed rgba(139,92,246,0.4);border-radius:0.9rem;padding:0.9rem 1rem;">' +
          '<div style="display:flex;align-items:center;gap:0.9rem;">' +
            '<div style="width:64px;height:64px;flex-shrink:0;border-radius:0.75rem;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);display:flex;align-items:center;justify-content:center;font-size:1.7rem;">🛡️</div>' +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;">🛡️ Accountability of Truth Score</div>' +
              '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.4rem;color:#9fb4d4;line-height:1.1;margin-top:0.1rem;">Not Yet Analyzed</div>' +
              '<p style="font-size:0.68rem;color:#7596c0;line-height:1.45;margin:0.2rem 0 0;">Run a deep two-perspective verification to generate this official\'s accountability score.</p>' +
            '</div>' +
          '</div>' +
          '<button onclick="openAccountabilityAnalysis(\'' + safeId + '\')" style="width:100%;margin-top:0.75rem;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.1em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#7c3aed,#a78bfa);border:none;padding:0.7rem;border-radius:0.65rem;box-shadow:0 4px 16px rgba(124,58,237,0.32);display:flex;align-items:center;justify-content:center;gap:0.4rem;">🔍 Run Accountability Analysis</button>' +
        '</div>';
    };

    window._refreshAccountabilityCard = function(id){
      var el = document.getElementById('acct-inline-card');
      if (el) el.innerHTML = window._renderAccountabilityCard(id, getProfile(id));
    };

    // ── Browse-card Accountability: compact purple badge + expandable condensed analysis ──
    // Small purple chip shown beside the Promise Score on each card. Computes the
    // Accountability Score on demand so it's visible by default, and taps through to
    // the full analysis. Falls back to a "Run Analysis" pill only if the engine isn't ready.
    window._acctCardBadge = function(id){
      // SCORING CLEANUP: the Accountability of Truth composite has been retired as a
      // headline number/badge. This helper now renders nothing, which removes the
      // purple accountability chip from every card, slot and roster surface in one
      // place — the underlying accountability data and the full analysis modal are
      // untouched and still reachable from the profile. Returning '' keeps all
      // call sites (which wrap this output) working with no layout break.
      return '';
      // eslint-disable-next-line no-unreachable
      var p = getProfile(id) || {};
      var a = p.accountability;
      // Eagerly compute (and cache) the Accountability of Truth Score so the metric
      // is visible by default on every card — on equal footing with the Promise %,
      // never hidden behind a click. Falls back gracefully if the engine isn't ready.
      if (!(a && typeof a.overallScore === 'number') && typeof window._acctEnsureScore === 'function'){
        try { a = window._acctEnsureScore(id, p); } catch (e) { a = null; }
      }
      // Honesty gate: only show a specific percentage when there is enough
      // verified record to stand behind (and explain) it. See _pdxScoreExplainable.
      var _badgeExplainable = (typeof window._pdxScoreExplainable === 'function')
        ? window._pdxScoreExplainable(p, id) : true;
      if (a && typeof a.overallScore === 'number' && _badgeExplainable){
        var s = a.overallScore;
        var lvl = a.color || acctLevelColor(s);
        var rating = aesc(a.rating || acctRating(s));
        // Prominent purple integrity chip — a first-class metric that reads as the
        // honesty/follow-through signal, not "just another number". Bigger score,
        // a shield mark, and a plain-language rating pill so the meaning lands at a
        // glance. The whole chip taps through to the full AI Accountability analysis.
        return '<button type="button" class="chub-acct-chip" onclick="event.stopPropagation();if(window.viewAccountabilityAnalysis)window.viewAccountabilityAnalysis(\'' + aesc(id) + '\')" title="Accountability of Truth Score: ' + s + '/100 (' + rating + ') — how well this official follows through on their word. Tap for the full analysis." style="margin:0;font:inherit;cursor:pointer;background:linear-gradient(135deg,rgba(124,58,237,0.28),rgba(139,92,246,0.08));border:1.5px solid rgba(167,139,250,0.7);border-radius:0.6rem;padding:0.3rem 0.7rem 0.3rem 0.55rem;box-shadow:0 6px 20px rgba(124,58,237,0.22),inset 0 1px 0 rgba(255,255,255,0.05);display:inline-flex;align-items:center;gap:0.5rem;transition:transform 0.15s,box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 8px 26px rgba(124,58,237,0.34),inset 0 1px 0 rgba(255,255,255,0.06)\'" onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'0 6px 20px rgba(124,58,237,0.22),inset 0 1px 0 rgba(255,255,255,0.05)\'">' +
            '<span style="font-size:1.15rem;line-height:1;filter:drop-shadow(0 0 6px rgba(167,139,250,0.6));">🛡️</span>' +
            '<span style="color:#c4b5fd;font-size:1.95rem;text-shadow:0 0 14px rgba(167,139,250,0.55);font-family:\'Bebas Neue\',sans-serif;line-height:1;font-weight:900;">' + s + '<span style="font-size:0.9rem;font-weight:800;vertical-align:top;">%</span></span>' +
            '<span class="font-condensed uppercase font-bold" style="display:inline-flex;flex-direction:column;font-size:0.55rem;letter-spacing:0.05em;line-height:1.2;text-align:left;gap:0.12rem;">' +
              '<span style="color:#a78bfa;letter-spacing:0.09em;">Accountability</span>' +
              '<span style="display:inline-flex;align-items:center;gap:0.25rem;color:' + lvl + ';font-size:0.62rem;letter-spacing:0.02em;"><span style="width:6px;height:6px;border-radius:999px;background:' + lvl + ';box-shadow:0 0 6px ' + lvl + ';flex-shrink:0;"></span>' + rating + '</span>' +
            '</span>' +
          '</button>';
      }
      // Score exists but the record is too thin to explain it — show an honest
      // "Score Pending" chip rather than a precise, unexplainable percentage.
      // Still taps through so the visitor can see why it's pending.
      if (a && typeof a.overallScore === 'number'){
        return '<button type="button" class="chub-acct-chip" onclick="event.stopPropagation();if(window.viewAccountabilityAnalysis)window.viewAccountabilityAnalysis(\'' + aesc(id) + '\')" title="Accountability of Truth Score: not enough verified record yet to show a specific figure. Tap to see what it\'s waiting on." style="margin:0;font:inherit;cursor:pointer;background:linear-gradient(135deg,rgba(124,58,237,0.16),rgba(139,92,246,0.05));border:1.5px solid rgba(167,139,250,0.5);border-radius:0.6rem;padding:0.3rem 0.7rem 0.3rem 0.55rem;box-shadow:0 4px 16px rgba(124,58,237,0.12),inset 0 1px 0 rgba(255,255,255,0.04);display:inline-flex;align-items:center;gap:0.5rem;transition:transform 0.15s,box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'translateY(0)\'">' +
            '<span style="font-size:1.15rem;line-height:1;filter:drop-shadow(0 0 6px rgba(167,139,250,0.5));">🛡️</span>' +
            '<span class="font-condensed uppercase font-bold" style="display:inline-flex;flex-direction:column;font-size:0.55rem;letter-spacing:0.05em;line-height:1.2;text-align:left;gap:0.12rem;">' +
              '<span style="color:#a78bfa;letter-spacing:0.09em;">Accountability</span>' +
              '<span style="display:inline-flex;align-items:center;gap:0.25rem;color:#9fb4d4;font-size:0.62rem;letter-spacing:0.02em;"><span style="width:6px;height:6px;border-radius:999px;background:#9fb4d4;flex-shrink:0;"></span>◷ Score Pending</span>' +
            '</span>' +
          '</button>';
      }
      // Not analyzed — an intentional, inviting purple "Run Analysis" pill (not a broken-looking placeholder).
      return '<button type="button" onclick="event.stopPropagation();toggleCardAccountability(\'' + aesc(id) + '\')" title="Run accountability analysis" style="cursor:pointer;background:linear-gradient(135deg,rgba(124,58,237,0.22),rgba(139,92,246,0.08));border:1px solid rgba(167,139,250,0.5);border-radius:0.5rem;padding:0.3rem 0.65rem;display:inline-flex;align-items:center;gap:0.4rem;line-height:1.1;box-shadow:0 4px 16px rgba(124,58,237,0.12),inset 0 1px 0 rgba(255,255,255,0.04);transition:transform 0.15s,box-shadow 0.2s;" onmouseover="this.style.transform=\'translateY(-1px)\';this.style.boxShadow=\'0 6px 20px rgba(124,58,237,0.24),inset 0 1px 0 rgba(255,255,255,0.05)\'" onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'0 4px 16px rgba(124,58,237,0.12),inset 0 1px 0 rgba(255,255,255,0.04)\'">' +
          '<span style="font-size:1.15rem;filter:drop-shadow(0 0 6px rgba(167,139,250,0.55));">🛡️</span>' +
          '<span class="font-condensed tracking-wider uppercase font-bold" style="display:inline-flex;flex-direction:column;text-align:left;line-height:1.2;">' +
            '<span style="color:#8ea2c0;font-size:0.5rem;letter-spacing:0.07em;">Accountability</span>' +
            '<span style="color:#c4b5fd;font-size:0.64rem;letter-spacing:0.03em;">⚡ Run Analysis</span>' +
          '</span>' +
        '</button>';
    };

    // Condensed, card-sized accountability breakdown (kept short by design).
    window._acctCardCondensed = function(id, a){
      if (!a || typeof a.overallScore !== 'number') return '<div style="padding:0.6rem;color:#9fb4d4;font-size:0.72rem;">Analysis unavailable.</div>';
      var s = a.overallScore;
      var lvl = a.color || acctLevelColor(s);
      var safe = aesc(id);
      var cats = (a.categories || []).map(function(c){
        var cc = acctLevelColor(c.score);
        return '<div style="margin-bottom:0.55rem;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;font-family:\'Barlow Condensed\',sans-serif;font-size:0.66rem;letter-spacing:0.03em;color:#b6c5db;margin-bottom:0.22rem;">' +
            '<span>' + aesc(c.label) + '</span><span style="color:' + cc + ';font-weight:700;font-size:0.72rem;">' + c.score + '</span></div>' +
          '<div style="height:5px;background:rgba(10,15,30,0.8);border-radius:999px;overflow:hidden;"><div style="height:100%;width:' + c.score + '%;background:linear-gradient(90deg,#7c3aed,' + cc + ');border-radius:999px;"></div></div></div>';
      }).join('');
      var tvm = (a.truthsVsMyths || []).slice(0, 2).map(function(m){
        return '<div style="background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.06);border-radius:0.6rem;padding:0.6rem 0.7rem;margin-bottom:0.5rem;">' +
          '<div style="display:flex;gap:0.45rem;margin-bottom:0.4rem;"><span style="color:#f87171;flex-shrink:0;font-size:0.72rem;line-height:1.4;">❌</span><div style="font-size:0.7rem;color:#cbd9ec;line-height:1.5;font-style:italic;">' + acctMd(m.myth) + '</div></div>' +
          '<div style="display:flex;gap:0.45rem;"><span style="color:#4ade80;flex-shrink:0;font-size:0.72rem;line-height:1.4;">✓</span><div style="font-size:0.7rem;color:#e6ecf5;line-height:1.5;">' + acctMd(m.truth) + '</div></div></div>';
      }).join('');
      return '<div style="margin-top:0.75rem;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(139,92,246,0.03));border:1px solid rgba(139,92,246,0.32);border-radius:0.75rem;padding:0.95rem 1rem;">' +
        // Header — overall score + rating + short summary
        '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.8rem;padding-bottom:0.7rem;border-bottom:1px solid rgba(139,92,246,0.18);">' +
          '<span style="flex-shrink:0;font-family:\'Bebas Neue\',sans-serif;font-size:1.85rem;color:#a78bfa;line-height:1;text-shadow:0 0 12px rgba(167,139,250,0.35);">' + s + '<span style="font-size:0.8rem;color:#9fb4d4;">/100</span></span>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.3rem;">' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;">🛡️ Accountability</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.54rem;letter-spacing:0.05em;text-transform:uppercase;color:' + lvl + ';background:' + lvl + '1a;border:1px solid ' + lvl + '55;padding:0.1rem 0.4rem;border-radius:999px;">' + aesc(a.rating || acctRating(s)) + '</span>' +
            '</div>' +
            '<p style="font-size:0.72rem;color:#cbd9ec;line-height:1.5;margin:0;">' + acctMd(a.justification || '') + '</p>' +
          '</div>' +
        '</div>' +
        // Category scores
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.5rem;">📐 Category Scores</div>' +
        cats +
        // Truths vs Myths (1–2)
        (tvm ? '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:#a78bfa;margin:0.85rem 0 0.5rem;">⚖️ Truths vs Myths</div>' + tvm : '') +
        // Footer — jump to full analysis in the dedicated modal
        '<button type="button" onclick="event.stopPropagation();viewAccountabilityAnalysis(\'' + safe + '\')" style="width:100%;margin-top:0.5rem;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#7c3aed,#a78bfa);border:none;padding:0.6rem;border-radius:0.55rem;box-shadow:0 4px 14px rgba(124,58,237,0.3);">View Full Analysis →</button>' +
      '</div>';
    };

    // Toggle the expandable analysis on a browse card. Lazy-computes (and persists)
    // the analysis on first open so cards never run the deep analysis by default.
    window.toggleCardAccountability = function(pid){
      var panel = document.getElementById('acctexp-' + pid);
      var btn = document.getElementById('acctbtn-' + pid);
      var chev = document.getElementById('acctchev-' + pid);
      if (!panel) return;
      var isOpen = panel.getAttribute('data-open') === '1';
      if (isOpen){
        panel.style.maxHeight = '0px';
        panel.style.opacity = '0';
        panel.setAttribute('data-open', '0');
        if (chev) chev.style.transform = 'rotate(0deg)';
        var lblC = btn && btn.querySelector('.acct-exp-label');
        if (lblC) lblC.textContent = 'View Accountability Analysis';
        return;
      }
      if (panel.getAttribute('data-loaded') !== '1'){
        var p = getProfile(pid) || {};
        var a = p.accountability;
        if (!a || typeof a.overallScore !== 'number'){
          try {
            a = AccountabilityAnalyzer.analyze(pid, p);
            saveAccountability(pid, a);
          } catch (e) { a = null; }
          var bdg = document.getElementById('acctbadge-' + pid);
          if (bdg) bdg.innerHTML = window._acctCardBadge(pid);
        }
        panel.innerHTML = window._acctCardCondensed(pid, a);
        panel.setAttribute('data-loaded', '1');
      }
      panel.style.maxHeight = (panel.scrollHeight + 40) + 'px';
      panel.style.opacity = '1';
      panel.setAttribute('data-open', '1');
      if (chev) chev.style.transform = 'rotate(180deg)';
      var lblO = btn && btn.querySelector('.acct-exp-label');
      if (lblO) lblO.textContent = 'Hide Accountability Analysis';
    };

    // ── Full breakdown renderer ──
    function bulletList(items, accent){
      return (items || []).map(function(t){
        return '<div style="display:flex;align-items:flex-start;gap:0.55rem;margin:0.5rem 0;">' +
          '<span style="color:' + accent + ';font-size:0.7rem;margin-top:0.2rem;flex-shrink:0;">◆</span>' +
          '<div style="flex:1;font-size:0.82rem;color:#cbd9ec;line-height:1.55;">' + acctMd(t) + '</div></div>';
      }).join('');
    }

    function renderAccountabilityPanel(data, p, id){
      var container = document.getElementById('acct-panel-body');
      if (!container) return;
      var s = data.overallScore;
      var lvl = data.color || acctLevelColor(s);
      var r = 38, circ = 2 * Math.PI * r, dash = (s / 100) * circ;
      var html = '';

      // Honesty banner: when the record is too thin to stand behind a precise
      // figure, lead with that plainly so the headline number below is read as a
      // provisional baseline, not a verified rating.
      var _panelExplainable = (typeof window._pdxScoreExplainable === 'function')
        ? window._pdxScoreExplainable(p || {}, id) : true;
      if (p && !_panelExplainable) {
        html += '<div style="background:linear-gradient(135deg,rgba(124,58,237,0.14),rgba(139,92,246,0.05));border:1px dashed rgba(139,92,246,0.45);border-radius:0.8rem;padding:0.75rem 0.9rem;margin-bottom:0.9rem;display:flex;gap:0.6rem;align-items:flex-start;">' +
          '<span style="font-size:1rem;line-height:1.2;flex-shrink:0;">◷</span>' +
          '<div style="font-size:0.74rem;color:#cbd9ec;line-height:1.55;">' +
            '<strong style="color:#c4b5fd;">Limited data — score pending.</strong> This official’s stated positions are tracked on this profile, but there isn’t a verified track record yet — resolved kept-or-broken promises or curator-flagged Spotlight items — to stand behind a specific figure. The number below is a provisional baseline shown for context only — it firms up, and appears across the site, as that record fills in.' +
          '</div>' +
        '</div>';
      }

      // SECTION 1 — Overall score hero (purple)
      html += '<div style="background:linear-gradient(135deg,rgba(124,58,237,0.16),rgba(139,92,246,0.04));border:1px solid rgba(139,92,246,0.34);border-radius:1rem;padding:1.25rem;box-shadow:0 0 26px rgba(139,92,246,0.1);">' +
        '<div class="flex flex-col sm:flex-row items-center sm:items-start" style="gap:1.1rem;">' +
          '<div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;text-align:center;">' +
            '<div style="position:relative;width:104px;height:104px;">' +
              '<svg width="104" height="104" viewBox="0 0 104 104" style="transform:rotate(-90deg);">' +
                '<circle cx="52" cy="52" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>' +
                '<circle cx="52" cy="52" r="' + r + '" fill="none" stroke="#a78bfa" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" style="filter:drop-shadow(0 0 8px rgba(167,139,250,0.65));"/>' +
              '</svg>' +
              '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2rem;color:#fff;line-height:1;">' + s + '</div>' +
                '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.5rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;">/ 100</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:' + lvl + ';background:' + lvl + '1a;border:1px solid ' + lvl + '55;padding:0.18rem 0.6rem;border-radius:999px;margin-top:0.6rem;">' + aesc(data.rating) + '</div>' +
          '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.62rem;letter-spacing:0.14em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.35rem;">🛡️ Overall Accountability Score</div>' +
            '<p style="font-size:0.86rem;color:#e6ecf5;line-height:1.6;margin:0;">' + acctMd(data.justification) + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';

      // SECTION 1.5 — Accountability Theme + the full Spotlight integrity record.
      // The qualitative evidence behind the score, placed right under the headline
      // number and kept visually & conceptually distinct from Promise %.
      if (typeof window._slFullSection === 'function') html += window._slFullSection(p || getProfile(id) || {}, id);

      // SECTION 2 — Two perspectives
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
      // Analyst
      html += '<div style="background:rgba(139,92,246,0.07);border:1px solid rgba(139,92,246,0.28);border-radius:0.9rem;padding:1rem;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem;">' +
          '<span style="display:inline-flex;align-items:center;gap:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5fd;">📊 Analyst Perspective</span>' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.15rem;color:#a78bfa;">' + data.analyst.score + '</span>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:#cbd9ec;line-height:1.55;margin:0 0 0.5rem;">' + acctMd(data.analyst.summary) + '</p>' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#4ade80;margin-top:0.5rem;">✓ Key Strengths</div>' +
        bulletList(data.analyst.strengths, '#4ade80') +
      '</div>';
      // Fact-Checker
      html += '<div style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.26);border-radius:0.9rem;padding:1rem;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem;margin-bottom:0.5rem;">' +
          '<span style="display:inline-flex;align-items:center;gap:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#fca5a5;">🔎 Fact-Checker Perspective</span>' +
          '<span style="font-family:\'Bebas Neue\',sans-serif;font-size:1.15rem;color:#f87171;">' + data.factChecker.score + '</span>' +
        '</div>' +
        '<p style="font-size:0.8rem;color:#cbd9ec;line-height:1.55;margin:0 0 0.5rem;">' + acctMd(data.factChecker.summary) + '</p>' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:#f87171;margin-top:0.5rem;">🚩 Major Concerns / Red Flags</div>' +
        bulletList(data.factChecker.concerns, '#f87171') +
      '</div>';
      html += '</div>';

      // SECTION 3 — Category scores
      html += '<div style="background:rgba(10,15,30,0.45);border:1px solid rgba(255,255,255,0.06);border-radius:0.9rem;padding:1rem 1.1rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.75rem;">📐 Category Breakdown</div>';
      (data.categories || []).forEach(function(c){
        var cc = acctLevelColor(c.score);
        html += '<div style="margin-bottom:0.7rem;">' +
          '<div style="display:flex;justify-content:space-between;font-family:\'Barlow Condensed\',sans-serif;font-size:0.7rem;letter-spacing:0.04em;color:#9fb4d4;margin-bottom:0.25rem;">' +
            '<span>' + aesc(c.label) + '</span><span style="color:' + cc + ';font-weight:700;">' + c.score + '</span>' +
          '</div>' +
          '<div style="height:6px;background:rgba(10,15,30,0.8);border-radius:999px;overflow:hidden;">' +
            '<div style="height:100%;width:' + c.score + '%;background:linear-gradient(90deg,#7c3aed,' + cc + ');border-radius:999px;transition:width 1s cubic-bezier(0.4,0,0.2,1);"></div>' +
          '</div></div>';
      });
      html += '</div>';

      // SECTION 4 — Truths vs Myths
      if (data.truthsVsMyths && data.truthsVsMyths.length) {
        html += '<div style="background:rgba(10,15,30,0.45);border:1px solid rgba(255,255,255,0.06);border-radius:0.9rem;padding:1rem 1.1rem;">' +
          '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.75rem;">⚖️ Truths vs Myths</div>';
        data.truthsVsMyths.forEach(function(m){
          html += '<div style="background:rgba(0,0,0,0.22);border:1px solid rgba(255,255,255,0.05);border-radius:0.7rem;padding:0.7rem 0.8rem;margin-bottom:0.6rem;">' +
            '<div style="display:flex;align-items:flex-start;gap:0.5rem;margin-bottom:0.4rem;">' +
              '<span style="color:#f87171;flex-shrink:0;">❌</span>' +
              '<div style="flex:1;"><span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:#f87171;">Myth</span>' +
                '<div style="font-size:0.8rem;color:#cbd9ec;line-height:1.5;font-style:italic;">' + acctMd(m.myth) + '</div></div>' +
            '</div>' +
            '<div style="display:flex;align-items:flex-start;gap:0.5rem;">' +
              '<span style="color:#4ade80;flex-shrink:0;">✓</span>' +
              '<div style="flex:1;"><span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.1em;text-transform:uppercase;color:#4ade80;">Truth</span>' +
                '<div style="font-size:0.8rem;color:#e6ecf5;line-height:1.5;">' + acctMd(m.truth) + '</div></div>' +
            '</div>' +
          '</div>';
        });
        html += '</div>';
      }

      // SECTION 5 — Consensus
      html += '<div style="background:linear-gradient(135deg,rgba(124,58,237,0.14),rgba(139,92,246,0.04));border:1px solid rgba(139,92,246,0.3);border-radius:0.9rem;padding:1rem 1.1rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.66rem;letter-spacing:0.12em;text-transform:uppercase;color:#a78bfa;margin-bottom:0.4rem;">⚖️ Consensus — Overall Assessment</div>' +
        '<p style="font-size:0.84rem;color:#e6ecf5;line-height:1.6;margin:0;">' + acctMd(data.consensus) + '</p>' +
      '</div>';

      // Footer — methodology
      var when = '';
      try { when = data.generatedAt ? new Date(data.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; } catch (e) {}
      html += '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.05);border-radius:0.75rem;padding:0.75rem 0.85rem;">' +
        '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.58rem;letter-spacing:0.12em;text-transform:uppercase;color:#c4b5fd;margin-bottom:0.3rem;">🔬 Methodology</div>' +
        '<p style="font-size:0.7rem;color:#7596c0;line-height:1.55;margin:0;">Generated by PolitiDex\'s dual-perspective accountability engine — an Analyst pass and a Fact-Checker pass run by one strong model — cross-referenced against the tracked promise ledger, stated policy positions, and public disclosures. Scores are saved to this profile for instant reload and only refresh when you re-run the analysis.' + (when ? ' Last analyzed ' + aesc(when) + '.' : '') + '</p>' +
      '</div>';

      container.innerHTML = html;
    }

    // ── Modal open/close + run ──
    function openOverlay(){
      var overlay = document.getElementById('accountability-overlay');
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.opacity = '0';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        overlay.style.transition = 'opacity 0.22s ease';
        overlay.style.opacity = '1';
      }); });
    }

    function showResult(id, data){
      document.getElementById('acct-loading').classList.add('hidden');
      document.getElementById('acct-content').classList.remove('hidden');
      renderAccountabilityPanel(data, getProfile(id), id);
      if (typeof window._refreshAccountabilityCard === 'function') window._refreshAccountabilityCard(id);
    }

    // Run (or re-run) a fresh analysis — the only path that recomputes + saves.
    window.openAccountabilityAnalysis = function(id){
      var p = getProfile(id);
      if (!p) return;
      var sub = document.getElementById('acct-subtitle');
      if (sub) sub.textContent = 'Analyzing ' + (p.name || '') + (p.office ? ' · ' + p.office : '');
      document.getElementById('acct-loading').classList.remove('hidden');
      document.getElementById('acct-content').classList.add('hidden');
      openOverlay();
      setTimeout(function(){
        var data = AccountabilityAnalyzer.analyze(id, p);
        saveAccountability(id, data);
        showResult(id, data);
      }, 1400);
    };

    // View an already-stored analysis instantly (no recompute). Falls back to run.
    window.viewAccountabilityAnalysis = function(id){
      var p = getProfile(id);
      if (!p) return;
      if (!p.accountability || typeof p.accountability.overallScore !== 'number') {
        return window.openAccountabilityAnalysis(id);
      }
      var sub = document.getElementById('acct-subtitle');
      if (sub) sub.textContent = (p.name || '') + (p.office ? ' · ' + p.office : '');
      document.getElementById('acct-loading').classList.add('hidden');
      document.getElementById('acct-content').classList.remove('hidden');
      renderAccountabilityPanel(p.accountability, p, id);
      openOverlay();
    };

    window.closeAccountabilityModal = function(){
      var overlay = document.getElementById('accountability-overlay');
      if (!overlay) return;
      overlay.style.opacity = '0';
      setTimeout(function(){
        overlay.style.display = 'none';
        var others = ['modal-overlay', 'profile-verify-overlay', 'comment-overlay', 'auth-overlay', 'evidence-overlay', 'verify-overlay'];
        var anyOpen = others.some(function(oid){
          var el = document.getElementById(oid);
          return el && el.style.display !== 'none' && el.style.display !== '';
        });
        if (!anyOpen) document.body.style.overflow = '';
      }, 220);
    };

    // Synchronous score getter for compact surfaces (e.g. the Key Races candidate
    // cards). Returns the stored analysis, or computes one on the fly and caches it
    // in memory only — no Firestore write — so the same Accountability of Truth
    // Score shows on the card and in the profile without the user running it by hand.
    // A full re-run (with persistence) still happens when the user clicks Re-run.
    window._acctEnsureScore = function(id, p){
      p = p || getProfile(id) || {};
      if (p.accountability && typeof p.accountability.overallScore === 'number') return p.accountability;
      try {
        var a = AccountabilityAnalyzer.analyze(id, p);
        if (typeof PROFILES !== 'undefined' && PROFILES[id]) PROFILES[id].accountability = a;
        if (typeof CMP_DATA !== 'undefined' && CMP_DATA[id]) CMP_DATA[id].accountability = a;
        // A freshly computed score can change this politician's matching/sort value.
        if (typeof window._acctMatchCacheBust === 'function') window._acctMatchCacheBust(id);
        return a;
      } catch (e) { return null; }
    };

    // The accountability engine is defined after the Key Races script runs, so
    // repaint Key Races now that scores can be computed for each candidate card.
    try { if (window.renderKeyRaces) window.renderKeyRaces(); } catch (e) {}
  })();
  
