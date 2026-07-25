#!/usr/bin/env node
/**
 * Connect-the-dots pass — July 2026
 * ─────────────────────────────────────────────────────────────────────────────
 * Wiring only. Authors NO stance, NO evidence item, NO politician. Every edit
 * makes data the repo already ships reach a surface that was dropping it.
 *
 * Four joins, each measured before it was written (see the tracker entry):
 *
 *   A. say-vs-do.js `stanceFor` only looked in ISSUE_STANCE_DATA under the
 *      receipt's own id and its ACCT_ALIAS target. It never consulted the
 *      shared resolver, so blocks keyed on STANCE_ALIASES or on a slug of the
 *      person's display name — the documented stance-key convention, see
 *      db/vr-pid-aliases.json — were invisible to it. 46 sourced receipts
 *      across 22 politicians therefore rendered with no SAID side: three real
 *      contradictions showed as a generic "Red Flag On Record" instead of
 *      "Says One Thing · Does Another", and 34 showed "Backed It Up" instead
 *      of "Words Match Actions".
 *
 *   B. stance-helpers.js `_issueEvidenceMap` resolved its evidence key forward
 *      only (id → ACCT_ALIAS). `_resolveStanceList` right above it has a third
 *      hop — the display-name slug — and the evidence key needs the same one,
 *      or evidence filed under the name slug never joins a profile opened on
 *      its roster id. kwan_s12 and bolinder_h68 rendered an EMPTY Connected
 *      Evidence panel for exactly that reason.
 *
 *   C. 18 stance-block keys could not open a profile even though a live roster
 *      record for that person exists and `_resolveStanceList` already returns
 *      that person's block from the roster id. Those are dead clicks in the
 *      Stance Library, the comparison board and the issue view. Fixed with
 *      reverse bridges in PDX_PROFILE_ALIAS — NOT merges, and deliberately
 *      NOT PDX_PID_ALIASES, which by its own docs holds only ids an actual
 *      merge has retired.
 *
 *   D. The whole evidence family (Connected Evidence, Evidence Summary, the
 *      stance/promise chips, the Locker CTA) was gated on
 *      `_pdxIsUtahStateLegislator` — a SCOPE gate from the first pass. It is
 *      wrong in both directions: it hid 132 profiles that hold a documented
 *      position plus real on-record evidence, and it offered the Locker CTA to
 *      46 legislators with no evidence item at all. Replaced with a DATA gate,
 *      `_pdxHasIssueEvidence`, so the section appears exactly when there is
 *      something in it. Safe because the section body carries no Utah-specific
 *      copy and the Evidence Locker index was never Utah-scoped.
 *
 *   E. Harness: section 11's class-wide guard already knows how to spot a
 *      slug-recoverable id, but its vocabulary set omitted ISSUE_STANCE_DATA
 *      keys — which is why all 18 of (C) slipped past it. Adding them closes
 *      the class.
 *
 * Idempotent, dry-run by default. `--apply` to write.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APPLY = process.argv.includes('--apply');
const edits = [];

function load(rel) {
  const abs = path.join(ROOT, rel);
  return { rel, abs, src: fs.readFileSync(abs, 'utf8') };
}

/** Replace `from` with `to` exactly once. Idempotent: if `to` is already there
 *  and `from` is gone, this is a no-op. Guarding on `to` ALONE is deliberate —
 *  it is what makes a re-run safe rather than a second, corrupting insertion. */
function sub(file, label, from, to) {
  if (file.src.includes(to)) { edits.push({ file: file.rel, label, state: 'already applied' }); return; }
  const n = file.src.split(from).length - 1;
  if (n !== 1) throw new Error(`${file.rel} · ${label}: anchor matched ${n}× (need exactly 1)`);
  file.src = file.src.replace(from, to);
  edits.push({ file: file.rel, label, state: 'edited' });
}

// ─────────────────────────────────────────────────────────────────────────────
const svd = load('say-vs-do.js');
const shl = load('stance-helpers.js');
const idx = load('index.html');
const hrn = load('scripts/test-identity-integrity.mjs');

// ── A. say-vs-do stanceFor → route through the shared resolver ───────────────
sub(svd, 'stanceFor consults _resolveStanceList',
`    return pick(id) || pick(alias(id)) || null;
  }`,
`    var hit = pick(id) || pick(alias(id));
    if (hit) return hit;
    // Fall through to the shared resolver, which also tries STANCE_ALIASES and a
    // slug of the person's display name — the documented stance-key convention
    // (see db/vr-pid-aliases.json). Without this hop a sourced receipt renders as
    // a bare red flag even though the stance sits right there in the data, which
    // is the difference between "Red Flag On Record" and the real verdict,
    // "Says One Thing · Does Another".
    var rec = polRec(id) || polRec(alias(id));
    var list = (typeof window._resolveStanceList === 'function')
      ? window._resolveStanceList(id, rec) : null;
    if (!Array.isArray(list) && typeof window._resolveStanceList === 'function' && alias(id) !== id) {
      list = window._resolveStanceList(alias(id), rec);
    }
    if (Array.isArray(list)) {
      for (var j = 0; j < list.length; j++) {
        var c = list[j];
        if (c && c.issueKey === issueKey && (c.text || c.topic)) return c;
      }
    }
    return null;
  }`);

// ── B. _issueEvidenceMap evidence key → add the display-name-slug hop ────────
sub(shl, '_slKey gains the display-name-slug hop',
`      var _slKey = (id && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[id])) ? id
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;`,
`      // Hops mirror _resolveStanceList above — id, then ACCT_ALIAS, then a slug of
      // the display name. That third hop is the documented stance-key convention,
      // and without it evidence filed under the name slug never joins a profile
      // opened on its roster id (kwan_s12 and bolinder_h68 rendered an empty
      // Connected Evidence panel for exactly that reason). Additive by
      // construction: the first two branches only fire where a key actually holds
      // ACCT items, which is precisely what the original expression picked, and
      // the final fallback is unchanged — so no key that used to resolve moves.
      var _slHasAcct = function (k) {
        return !!(k && window.ACCT_SPOTLIGHT && Array.isArray(window.ACCT_SPOTLIGHT[k]));
      };
      var _slHasNews = function (k) {
        return !!(k && window.SPOTLIGHT_DATA && Array.isArray(window.SPOTLIGHT_DATA[k]));
      };
      var _slNameKey = (p && p.name) ? _stanceSlug(p.name) : '';
      var _slKey = _slHasAcct(id) ? id
                 : (id && window.ACCT_ALIAS && _slHasAcct(window.ACCT_ALIAS[id])) ? window.ACCT_ALIAS[id]
                 : (_slHasAcct(_slNameKey) || _slHasNews(_slNameKey)) ? _slNameKey
                 : (id && window.ACCT_ALIAS && window.ACCT_ALIAS[id]) ? window.ACCT_ALIAS[id] : id;`);

// ── C. 18 stance-key → roster-id profile bridges ─────────────────────────────
// Each key is a slug of the roster record's own display name, and
// _resolveStanceList(rosterId) already returns this exact block — the repo is
// therefore already asserting they are one person. Nothing new is claimed.
// `stuart_adams` is the one asymmetric case: sadams carries its own 7-card block
// which the resolver prefers, so bridging fixes the dead click and lands on the
// correct person, but those 3 cards stay shadowed. That is a content merge
// decision, not wiring, so it is flagged in the tracker rather than forced here.
sub(idx, 'PDX_PROFILE_ALIAS += 18 stance-key bridges',
`      lisonbee:  'lisonbee_h14',
      mccay:     'mccay_s11',
    };`,
`      lisonbee:  'lisonbee_h14',
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
    };`);

// ── D. scope gate → data gate across the evidence family ────────────────────
sub(idx, '_pdxHasIssueEvidence predicate added',
`  window._renderEvidenceSummary = function(id, p) {`,
`  // Does this official have anything actually FILED on an issue — a recorded
  // Spotlight item or a tracked promise? This is the honest gate for the whole
  // evidence family. It replaces _pdxIsUtahStateLegislator(), which was a SCOPE
  // gate from the first pass and wrong in both directions: it hid 132 profiles
  // that hold a documented position plus real sourced evidence, and it offered
  // the Locker CTA to 46 legislators with nothing on file. A documented position
  // ALONE deliberately does not qualify — a panel whose every row reads "no
  // connected record yet" is empty scaffolding, and the point of these sections
  // is the connection, not the heading.
  window._pdxHasIssueEvidence = function (id, p) {
    try {
      if (typeof window._issueEvidenceMap !== 'function') return false;
      if (!p) {
        p = (window.PROFILES && window.PROFILES[id]) ? window.PROFILES[id]
           : ((typeof CMP_DATA !== 'undefined') ? CMP_DATA[id] : null);
      }
      var map = window._issueEvidenceMap(id, p) || {};
      for (var k in map) {
        if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
        var e = map[k] || {};
        if ((e.spotlight && e.spotlight.length) || (e.promises && e.promises.length)) return true;
      }
      return false;
    } catch (e) { return false; }
  };

  window._renderEvidenceSummary = function(id, p) {`);

sub(idx, 'Evidence Summary gated on data, not scope',
`      p = p || {};
      if (!window._pdxIsUtahStateLegislator(p)) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      function esc(s) {`,
`      p = p || {};
      if (typeof window._issueEvidenceMap !== 'function') return '';
      if (typeof window._pdxHasIssueEvidence === 'function' &&
          !window._pdxHasIssueEvidence(id, p)) return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      function esc(s) {`);

sub(idx, 'Connected Evidence gated on data, not scope',
`      p = p || {};
      if (!window._pdxIsUtahStateLegislator(p)) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');`,
`      p = p || {};
      if (typeof window._issueEvidenceMap !== 'function') return '';
      if (typeof window._pdxHasIssueEvidence === 'function' &&
          !window._pdxHasIssueEvidence(id, p)) return '';
      var map = window._issueEvidenceMap(id, p) || {};
      var keys = Object.keys(map);
      if (!keys.length) return '';

      var first = (p.name ? String(p.name).split(' ')[0] : 'this official');`);

sub(idx, 'stance-popover jump buttons gated on data, not scope',
`      if ((promises.length || spotlight.length) && s.issueKey &&
          typeof window._pdxIsUtahStateLegislator === 'function' && window._pdxIsUtahStateLegislator(p) &&
          typeof window._pdxEvAnchor === 'function') {`,
`      if ((promises.length || spotlight.length) && s.issueKey &&
          typeof window._pdxEvAnchor === 'function') {`);

sub(idx, 'promise → evidence chip gated on data, not scope',
`      if (!pr || typeof window._pdxIsUtahStateLegislator !== 'function' || !window._pdxIsUtahStateLegislator(p)) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';`,
`      if (!pr) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';`);

sub(idx, 'Locker CTA gated on filed items, not office',
`  window._pdxHasLocker = function (pid) {
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var p = (window.PROFILES && window.PROFILES[pid]) ? window.PROFILES[pid] : d;
    return !!(p && typeof window._pdxIsUtahStateLegislator === 'function' && window._pdxIsUtahStateLegislator(p));
  };`,
`  window._pdxHasLocker = function (pid) {
    var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
    var p = (window.PROFILES && window.PROFILES[pid]) ? window.PROFILES[pid] : d;
    if (!p) return false;
    // Offered when the Locker actually holds something for this person. The old
    // office test was the one call site in this family that did NOT check data, so
    // it promised a file to legislators with none and hid a real one from everyone
    // else — the Locker index itself was never Utah-scoped.
    return !!(typeof window._pdxHasIssueEvidence === 'function' && window._pdxHasIssueEvidence(pid, p));
  };`);

sub(shl, 'stance → evidence chip gated on data, not scope',
`      if (!s || !s.issueKey || typeof window._pdxIsUtahStateLegislator !== 'function' || !window._pdxIsUtahStateLegislator(p)) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      if (!map[s.issueKey]) return '';`,
`      if (!s || !s.issueKey) return '';
      if (typeof window._issueEvidenceMap !== 'function') return '';
      var map = window._issueEvidenceMap(id, p) || {};
      // The chip is a link to filed evidence, so require filed evidence — the
      // bucket exists as soon as a position does, which is not the same thing.
      var _b = map[s.issueKey];
      if (!_b) return '';
      if (!((_b.spotlight && _b.spotlight.length) || (_b.promises && _b.promises.length))) return '';`);

// ── E. harness: the class-wide guard must see stance-block keys ──────────────
sub(hrn, 'section 11 vocabulary includes stance-block keys',
`const curatedVocab = new Set([
  ...Object.keys(ACCT_ALIAS), ...Object.values(ACCT_ALIAS), ...Object.keys(PROFILE_ALIAS),
]);`,
`// ISSUE_STANCE_DATA keys belong here too: the Stance Library, the comparison
// board and the issue view all hand their raw block key to openModal(), so a key
// that resolves to nothing is a visible dead click. Leaving them out is why 18
// slug-recoverable keys sat broken while this guard stayed green. Keys with no
// discoverable roster record are still skipped below — those need a record, which
// is a content decision.
const curatedVocab = new Set([
  ...Object.keys(ACCT_ALIAS), ...Object.values(ACCT_ALIAS), ...Object.keys(PROFILE_ALIAS),
  ...Object.keys(STANCES || {}),
]);`);

// ─────────────────────────────────────────────────────────────────────────────
// Post-conditions — proved on the in-memory text BEFORE anything is written.
const problems = [];
const need = (cond, msg) => { if (!cond) problems.push(msg); };

need(!/_pdxIsUtahStateLegislator\(p\)\) return '';/.test(idx.src),
  "index.html: an evidence renderer still gates on _pdxIsUtahStateLegislator");
need(idx.src.includes('window._pdxHasIssueEvidence = function'),
  "index.html: _pdxHasIssueEvidence was not defined");
need(!shl.src.includes('_pdxIsUtahStateLegislator(p)) return \'\''),
  "stance-helpers.js: the stance chip still gates on _pdxIsUtahStateLegislator");
need(svd.src.includes('window._resolveStanceList'),
  "say-vs-do.js: stanceFor does not reach the shared resolver");
need(shl.src.includes('_slNameKey'),
  "stance-helpers.js: _slKey did not gain the name-slug hop");
for (const [k, v] of Object.entries({
  bridger_bolinder: 'bolinder_h68', casey_snider: 'snider_h5', cory_maloy: 'cory_maloy_h52',
  curt_bramble: 'cbramble', don_ipson: 'dipson', jerry_stevenson: 'jstevenson',
  jill_koford: 'koford_h10', luz_escamilla: 'lescamilla', matthew_gwynn: 'gwynn_h6',
  nate_blouin: 'blouin_s13', phil_lyman: 'lyman', scott_chew: 'chew_h68',
  scott_sandall: 'ssandall', stephen_l_whyte: 'whyte_h63', stuart_adams: 'sadams',
  tiara_auxier: 'auxier_h4', todd_weiler: 'tweiler', troy_shelley: 'shelley_h66',
})) need(new RegExp(`${k}:\\s*'${v}'`).test(idx.src), `index.html: bridge ${k} → ${v} missing`);
need(hrn.src.includes('...Object.keys(STANCES || {}),'),
  "harness: section 11 vocabulary was not widened");
// The definition stays put — it is still the honest label for the first-pass
// scope note, and leaving it defined keeps any future caller working.
need(idx.src.includes('window._pdxIsUtahStateLegislator = function'),
  "index.html: _pdxIsUtahStateLegislator must remain defined");

console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — connect-the-dots-jul2026\n`);
for (const e of edits) console.log(`  ${e.state === 'edited' ? '✎' : '·'} ${e.file.padEnd(34)} ${e.label}${e.state === 'edited' ? '' : '  (' + e.state + ')'}`);
console.log(`\n${edits.filter(e => e.state === 'edited').length} edit(s), ${edits.filter(e => e.state !== 'edited').length} already applied`);

if (problems.length) {
  console.error(`\n✗ post-conditions failed — nothing written:`);
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log('✓ post-conditions pass');

if (APPLY) {
  for (const f of [svd, shl, idx, hrn]) fs.writeFileSync(f.abs, f.src);
  console.log('✓ written');
} else {
  console.log('(dry run — pass --apply to write)');
}
