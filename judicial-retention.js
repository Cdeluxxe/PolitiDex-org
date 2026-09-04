/* ══════════════════════════════════════════════════════════════════════════
   judicial-retention.js — the one owner of "what does retention say"
   ──────────────────────────────────────────────────────────────────────────
   A judicial retention seat is a new OFFICE CLASS, not a new scoring engine.
   Three surfaces need it — the Door 2 ballot band, the /p/<pid> judge file,
   and the archive listing — and all three read this object. None of them
   computes a retention fact for itself, for the same reason no surface here
   computes a Direction Match for itself: a second copy of a rule is a second
   doctrine, and the second doctrine drifts.

   This file has no DOM in it. It answers questions.

   ── THE VOCABULARY IS LOCKED ─────────────────────────────────────────────
   Six phrases, and no synonyms:

     retained · not retained · stands for retention · JPEC recommends retain
     · JPEC does not recommend · no JPEC report on file

   "Retained" is a fact about an election that happened. "Stands for retention"
   is a fact about a ballot. "JPEC recommends retain" is a quotation of the
   official commission. "No JPEC report on file" is a statement about what
   PolitiDex holds. Every one of them is checkable, and none of them is an
   opinion about a judge.

   ── THE BANNED LIST, AND WHY EACH WORD IS ON IT ──────────────────────────
     activist                — a verdict dressed as a description.
     liberal / conservative
       court                 — a party sort of a branch that has no party
                               line, imported from coverage of a different
                               country's judiciary.
     legislating from
       the bench             — a characterisation of a holding, which is the
                               thing this pass exists not to grade.
     packed                  — a claim about intent behind an appointment.
     swamp                   — an insult.
     party-line bench        — the party metric, reintroduced through a
                               nickname.

   ── THE WALL ─────────────────────────────────────────────────────────────
   Nothing in this file, and nothing derived from anything in this file, is
   read by Direction Match, by Word vs Action, by a formal-pattern tier, by
   the publication floor, by any Mandate arithmetic, or by any score of any
   kind. A judge has no promise ledger, so there is no word to weigh an action
   against; a ruling is not a broken pledge; and the appointing governor is a
   fact about the appointment rather than a description of the appointee. A
   retention row is an OFFICE on a ballot and a JPEC citation, full stop.

   Judges are deliberately NOT written into CMP_DATA. A record in that roster
   inherits party, score, promise counts, the publication floor and the "record
   still being built" notice — an entire apparatus built for legislators, every
   piece of which would say something false about a judge. The registry lives
   here instead, and person-file.js consults it as a third, clearly separate
   source.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function D() { return window.PDX_JUDICIAL || null; }

  // ── Locked vocabulary ──────────────────────────────────────────────────
  var VOCAB = {
    retained: 'retained',
    notRetained: 'not retained',
    stands: 'stands for retention',
    jpecYes: 'JPEC recommends retain',
    jpecNo: 'JPEC does not recommend',
    jpecNone: 'no JPEC report on file'
  };

  var BANNED = [
    'activist', 'liberal court', 'conservative court',
    'legislating from the bench', 'packed', 'swamp', 'party-line bench'
  ];

  var WALL = 'A retention question is an office on a ballot, not a grade. Nothing here ' +
    'feeds Direction Match, Word vs Action, a formal-record tier or any score, and no ' +
    'ruling is treated as a kept or broken promise.';

  // The formal-lane sentence for an office that does not vote bills. Said
  // plainly, because an empty roll-call lane on a judge is not a thin record —
  // it is the correct record.
  var NO_FORMAL = 'No legislative roll-call file — this office does not vote bills.';

  // ── Courts ─────────────────────────────────────────────────────────────
  function courts() {
    var d = D();
    return (d && d.COURTS) ? d.COURTS.slice() : [];
  }
  function court(key) {
    var out = null;
    courts().forEach(function (c) { if (c.key === String(key || '')) out = c; });
    return out;
  }
  function courtLabel(key) {
    var c = court(key);
    return c ? c.label : '';
  }

  // ── Judges ─────────────────────────────────────────────────────────────
  // ── The eight geographical divisions ───────────────────────────────────
  // Utah Code § 78A-1-102 divides the district AND juvenile courts into the
  // same eight geographical divisions, so one map answers both courts. This
  // module owns the reading of that map and nothing else owns a copy of it:
  // `countyIndex()` is built from judicial-data.js's DISTRICTS array on first
  // use, which is the only place the county-to-number mapping exists.
  function districts() {
    var d = D();
    var rows = (d && d.DISTRICTS) ? d.DISTRICTS : [];
    return rows.map(function (r) {
      var out = {};
      Object.keys(r).forEach(function (k) { out[k] = r[k]; });
      out.counties = (r.counties || []).slice();
      return out;
    });
  }
  function district(n) {
    var num = parseInt(n, 10);
    if (!num) return null;
    var hit = null;
    districts().forEach(function (r) { if (r.n === num) hit = r; });
    return hit;
  }

  // A county name arrives from the location resolver as a label a human typed
  // or a curated area carries — "Davis County", "davis", "Box Elder County".
  // Normalising away case, punctuation and the word "county" is what makes all
  // three the same key, and it is done here so no caller has to guess the
  // spelling the map was written in.
  function countyKey(name) {
    return String(name || '').toLowerCase().replace(/county/g, '').replace(/[^a-z]+/g, '');
  }
  var _cty = null;
  function countyIndex() {
    if (_cty) return _cty;
    var idx = {};
    districts().forEach(function (r) {
      (r.counties || []).forEach(function (c) {
        var k = countyKey(c);
        if (k) idx[k] = r.n;
      });
    });
    _cty = idx;
    return idx;
  }
  // Fail closed: an unrecognised county returns null, and every caller treats
  // null as "PolitiDex cannot place this voter" rather than as district one.
  function districtForCounty(name) {
    var k = countyKey(name);
    if (!k) return null;
    var n = countyIndex()[k];
    return n ? district(n) : null;
  }
  // The counties whose voters answer one trial-court judge's question. Read
  // off the same map, so a row can name its own electorate without a surface
  // assembling the list.
  function countiesOf(n) {
    var r = district(n);
    return r ? r.counties.slice() : [];
  }

  // `all()` is alphabetical by the name a reader sees, because the archive
  // listing is alphabetical and sorting it in two places is how two orders
  // appear on one page.
  function all() {
    var d = D();
    var map = (d && d.JUDGES) ? d.JUDGES : {};
    var out = [];
    Object.keys(map).forEach(function (k) {
      var j = map[k];
      if (j && j.name) out.push(j);
    });
    out.sort(function (a, b) {
      return String(a.name).localeCompare(String(b.name));
    });
    return out;
  }

  // ── Fail closed on name collisions ─────────────────────────────────────
  // Two judges of the same name on the same court is the case where a ballot
  // row cannot honestly name one of them: "Shall Judge Smith be retained?"
  // with two Judge Smiths on the court is a question a reader cannot answer.
  // So both are flagged, both are dropped from ballot rows, and the fact that
  // they were dropped is REPORTED rather than swallowed. Normalised on case
  // and punctuation, since "J. Smith" and "J Smith" collide in a reader's eye
  // even when they do not collide as strings.
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z]+/g, '');
  }
  function collisions() {
    var seen = {}, hits = {};
    all().forEach(function (j) {
      var k = j.court + '|' + norm(j.name);
      if (seen[k]) hits[k] = true;
      seen[k] = (seen[k] || 0) + 1;
    });
    var out = [];
    Object.keys(hits).forEach(function (k) {
      var pids = [];
      all().forEach(function (j) { if (j.court + '|' + norm(j.name) === k) pids.push(j.pid); });
      out.push({ key: k, court: k.split('|')[0], pids: pids });
    });
    return out;
  }
  function ambiguous(pid) {
    var hit = false;
    var me = raw(pid);
    if (!me) return false;
    var k = me.court + '|' + norm(me.name);
    collisions().forEach(function (c) { if (c.key === k) hit = true; });
    return hit;
  }

  function raw(pid) {
    var d = D();
    if (!d || !d.JUDGES || !pid) return null;
    var j = d.JUDGES[String(pid)];
    return j || null;
  }

  // The judge, as every surface should see one: the stored row plus the three
  // things every surface would otherwise re-derive (the court label, whether
  // the roster can tell this name apart, and whether the person currently
  // holds the seat).
  function judge(pid) {
    var j = raw(pid);
    if (!j) return null;
    var c = court(j.court) || { label: '', short: '', scope: '', term: null, map: false };
    var out = {};
    Object.keys(j).forEach(function (k) { out[k] = j[k]; });
    out.courtKey = j.court;
    out.courtLabel = c.label;
    out.courtShort = c.short;
    out.scope = c.scope;
    out.term = c.term;
    out.mapped = !!c.map;
    out.state = (D() || {}).STATE || 'Utah';
    out.seated = j.seated !== false;
    out.former = !!j.former;
    out.ambiguous = ambiguous(pid);
    out.title = /justice/i.test(String(j.role || '')) ? 'Justice' : 'Judge';
    // The unit a reader needs to see next to the name: "Statewide" for an
    // appellate seat, the named judicial district for a trial one. Derived
    // here so a row, a card and a person file cannot disagree about it.
    var dr = j.district ? district(j.district) : null;
    out.district = j.district || null;
    out.districtLabel = dr ? dr.label : '';
    out.counties = dr ? dr.counties.slice() : [];
    out.unitLabel = c.scope === 'statewide' ? 'Statewide' : (dr ? dr.label : (j.area || ''));
    out.courtSeat = c.scope === 'statewide'
      ? c.label
      : (dr ? (j.court === 'juvenile' ? dr.juvenileLabel : dr.districtLabel) : c.label);
    return out;
  }
  function isJudge(pid) { return !!raw(pid); }

  // ── The live retention election ────────────────────────────────────────
  // One date, declared once. Every surface that says "November 3, 2026" says it
  // from here, so there is no second place for the date to go stale.
  var ELECTION = { year: 2026, date: '2026-11-03', label: 'November 3, 2026' };

  // ── Slates ─────────────────────────────────────────────────────────────
  // What is on a given year's ballot for one court, as the data holds it. The
  // `certified` flag travels with it everywhere; a caller cannot read the rows
  // without also being handed the fact that the official list is not on file.
  function slate(courtKey, year) {
    var d = D();
    var y = String(year || ELECTION.year);
    var byYear = (d && d.SLATES && d.SLATES[y]) ? d.SLATES[y] : null;
    if (!byYear) return null;
    return byYear[String(courtKey || '')] || null;
  }

  // The question as the STATE filed it. A retention question is not a sentence
  // PolitiDex composes — it is a sentence on a filing, typos and all — so
  // where the official list carries the wording, that wording is what renders.
  // The composed fallback exists only for a row the list does not name, which
  // by construction never reaches a ballot.
  function slateQuestion(pid, year) {
    var j = raw(pid);
    if (!j) return null;
    var sl = slate(j.court, year);
    var hit = null;
    ((sl && sl.questions) ? sl.questions : []).forEach(function (q) {
      if (q && String(q.pid) === String(pid)) hit = q;
    });
    return hit;
  }

  // Questions the state FILED for a court and district, wherever this roster
  // ended up placing the judge. This is how an empty court can still tell the
  // truth: if a 2026 question was filed as a District Court question and the
  // courts directory puts that judge on the juvenile bench, the District Court
  // line has to say so rather than report nothing on file. Scans every court's
  // slate, because the filed label and the roster label are exactly what
  // disagree here.
  function filedFor(courtKey, districtN, year) {
    var d = D();
    var y = String(year || ELECTION.year);
    var byYear = (d && d.SLATES && d.SLATES[y]) ? d.SLATES[y] : null;
    var out = [];
    if (!byYear) return out;
    Object.keys(byYear).forEach(function (k) {
      ((byYear[k] && byYear[k].questions) ? byYear[k].questions : []).forEach(function (q) {
        if (!q || String(q.filedCourt || '') !== String(courtKey || '')) return;
        if (districtN != null && q.district !== districtN) return;
        var j = judge(q.pid);
        out.push({
          pid: q.pid,
          rosterCourt: k,
          rosterLabel: j ? j.courtLabel : '',
          district: q.district,
          filedOffice: q.filedOffice || '',
          question: q.question || ''
        });
      });
    });
    return out;
  }

  // ── The JPEC card ──────────────────────────────────────────────────────
  // Three states and no fourth. `none` is not a failure mode, it is the most
  // common honest answer, and it always travels with the official URL so the
  // reader can go and look at the source PolitiDex is deferring to.
  function jpec(pid) {
    var j = judge(pid);
    var d = D() || {};
    var url = d.JPEC_URL || '';
    if (!j) return { status: 'none', label: VOCAB.jpecNone, url: url, scores: null };
    var v = j.jpec;
    if (v && v.recommend === 'retain') {
      return {
        status: 'retain', label: VOCAB.jpecYes,
        url: v.url || url, scores: v.scores || null, year: v.year || null
      };
    }
    if (v && v.recommend === 'no') {
      return {
        status: 'no', label: VOCAB.jpecNo,
        url: v.url || url, scores: v.scores || null, year: v.year || null
      };
    }
    return {
      status: 'none', label: VOCAB.jpecNone, url: url, scores: null,
      priorUrl: j.priorReportUrl || '', priorLabel: j.priorReportLabel || ''
    };
  }

  // ── The retention fact ─────────────────────────────────────────────────
  // `stands` is true only when a DATE is on file. Everything else — an unseated
  // appointee, a judge who left, a row whose next retention we simply do not
  // hold — comes back false with the reason, because "we don't know when" and
  // "not on the ballot" are different sentences and a reader is owed the right
  // one.
  function retention(pid) {
    var j = judge(pid);
    if (!j) return { stands: false, date: '', label: '', why: 'no record on file' };
    if (j.former) {
      return { stands: false, date: '', label: '', why: j.leftNote || 'no longer on the court' };
    }
    if (!j.seated) {
      return {
        stands: false, date: '', label: '',
        why: 'Appointed; Senate confirmation not on file. An unconfirmed appointee does not stand for retention.'
      };
    }
    if (!j.retention) {
      return { stands: false, date: '', label: '', why: 'Next retention date not on file.' };
    }
    return {
      stands: true, date: j.retention, label: VOCAB.stands,
      when: dateLabel(j.retention), why: ''
    };
  }

  // Prior retention results, as results and never as a trend. Two data points
  // are not a pattern and this function does not offer one.
  function history(pid) {
    var j = judge(pid);
    var rows = (j && j.history) ? j.history : [];
    return rows.map(function (h) {
      return {
        year: h.year || '',
        result: h.result === 'no' ? VOCAB.notRetained : VOCAB.retained,
        url: h.url || ''
      };
    });
  }

  // ── The public lane ────────────────────────────────────────────────────
  // Court-level, cited, and never a grade. Attached to the court because the
  // reporting names a campaign rather than a judge, and pinning a named
  // campaign to a guessed name is the invention this pass forbids.
  function publicLane(courtKey) {
    var d = D();
    var map = (d && d.PUBLIC) ? d.PUBLIC : {};
    var rows = map[String(courtKey || '')] || [];
    return rows.slice();
  }

  // ── Dates ──────────────────────────────────────────────────────────────
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  function dateLabel(s) {
    var m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(s || ''));
    if (!m) return String(s || '');
    var mon = MON[parseInt(m[2], 10) - 1] || '';
    if (!mon) return m[1];
    return m[3] ? (mon + ' ' + parseInt(m[3], 10) + ', ' + m[1]) : (mon + ' ' + m[1]);
  }
  function yearOf(s) {
    var m = /^(\d{4})/.exec(String(s || ''));
    return m ? m[1] : '';
  }

  // ── THE DOOR 2 ANSWER ──────────────────────────────────────────────────
  // Takes the resolver's own output — window.pdxRepsForMe() — and never reads
  // location itself, because "where is this voter" already has exactly one
  // owner and a second reader of _currentVoterLocation is a second answer.
  //
  // The rules, in the order they fire:
  //
  //   1. No location set → nothing. Door 2 makes no claim before a voter has
  //      told it anything.
  //   2. Not Utah → utah:false, no rows, and the reason. There is no path in
  //      this function that can put a Utah judge on an Ohio ballot: the rows
  //      are built inside the Utah branch and the non-Utah branch returns
  //      before reaching it.
  //   3. Utah, statewide courts → the slate rows, each carrying the
  //      `certified` flag. Every Utah voter votes on statewide retention, so
  //      this is a claim the state alone supports.
  //   4. Utah, district / juvenile / justice courts → NO ROWS, and the name of
  //      the map that is missing. Placing a voter inside a judicial district
  //      needs geometry PolitiDex does not hold, and the honest output is
  //      which map is missing rather than a nearby judge.
  function ballot(reps) {
    var r = reps || {};
    var out = {
      located: !!r.located,
      state: r.state || '',
      utah: false,
      county: '',
      district: null,
      districtLabel: '',
      election: ELECTION,
      rows: [],
      courts: [],
      missing: [],
      certified: false,
      note: ''
    };
    if (!out.located) {
      out.note = 'Set a location and any judicial retention questions on your ballot appear here.';
      return out;
    }
    if (String(out.state).trim().toLowerCase() !== 'utah') {
      out.note = 'PolitiDex holds judicial retention records for Utah only. No judicial ' +
        'retention questions are claimed for ' + (out.state || 'this location') + '.';
      return out;
    }
    out.utah = true;

    // The county is published by the location owner, which is the module that
    // resolved it. This function reads it and maps it; it does not go looking
    // for a location of its own, because a second reader of the voter's
    // location is a second answer to where the voter lives.
    var cty = String(r.county || '').trim();
    var dd = districtForCounty(cty);
    out.county = cty;
    out.district = dd ? dd.n : null;
    out.districtLabel = dd ? dd.label : '';

    var dropped = [];

    // One row builder for every court. A statewide seat and a trial seat
    // differ only in which judges qualify, so the row shape — and every
    // fail-closed check on the way to it — is written once.
    function rowsFor(c, qualifies) {
      var sl = slate(c.key, ELECTION.year);
      var rows = [];
      ((sl && sl.pids) ? sl.pids : []).forEach(function (pid) {
        var j = judge(pid);
        if (!j) return;
        if (!qualifies(j)) return;
        // Fail closed. An ambiguous name is dropped from the ballot and
        // named in `missing`, never printed as a question.
        if (j.ambiguous) { dropped.push(j.courtLabel + ' — two records share this name'); return; }
        var rt = retention(pid);
        if (!rt.stands) return;
        var q = slateQuestion(pid, ELECTION.year);
        rows.push({
          courtKey: c.key,
          courtLabel: c.label,
          courtShort: c.short,
          pid: j.pid,
          name: j.name,
          title: j.title,
          role: j.role || '',
          district: j.district || null,
          unitLabel: j.unitLabel || '',
          counties: (j.counties || []).slice(),
          question: q && q.question ? q.question : ('Shall ' + j.title + ' ' + j.name + ' be retained?'),
          filedOffice: q ? (q.filedOffice || '') : '',
          filedStatus: q ? (q.status || '') : '',
          conflict: j.slateConflict || '',
          date: rt.date,
          when: rt.when,
          certified: !!(sl && sl.certified),
          jpec: jpec(pid)
        });
      });
      rows.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      return { rows: rows, slate: sl };
    }
    function pushCourt(c, rows, sl, status, note) {
      out.courts.push({
        key: c.key, label: c.label, short: c.short, scope: c.scope,
        unit: c.unit || '', units: c.units || c.unit || '',
        district: (c.scope === 'district' && dd) ? dd.n : null,
        unitLabel: c.scope === 'statewide' ? 'Statewide' : (dd ? dd.label : ''),
        status: status, count: rows.length,
        certified: !!(sl && sl.certified),
        note: note
      });
    }

    courts().forEach(function (c) {
      // ── Statewide: if they stand statewide they are on every Utah ballot ──
      if (c.scope === 'statewide') {
        var st = rowsFor(c, function () { return true; });
        st.rows.forEach(function (row) { out.rows.push(row); });
        pushCourt(c, st.rows, st.slate, st.rows.length ? 'rows' : 'empty',
          st.rows.length
            ? ((st.slate && st.slate.note) ? st.slate.note : '')
            : ((st.slate && st.slate.note) ? st.slate.note
              : 'No ' + c.short + ' retention question on file for ' + ELECTION.year + '.'));
        return;
      }

      // ── Trial courts of record: mapped by county, and only by county ──────
      if (c.scope === 'district' && c.map) {
        if (!dd) {
          // The fail-closed branch, unchanged in shape from the pass that had
          // no map at all: it names the geography it would need and claims
          // nothing. Which sentence depends on whether the county is unknown
          // or known-and-unplaceable, because those are different failures and
          // a reader can act on the difference.
          pushCourt(c, [], null, 'unmapped',
            c.short + ' retention is decided by the voters of each ' + c.unit + '. ' +
            (cty
              ? ('PolitiDex holds no ' + c.unit + ' map for ' + cty + ', so no ' + c.short +
                 ' question is claimed for your ballot.')
              : ('PolitiDex could not resolve your county, so no ' + c.short +
                 ' question is claimed for your ballot.')));
          out.missing.push(c.label + ' — no ' + c.unit + ' map on file for ' +
            (cty || 'your location'));
          return;
        }
        var tr = rowsFor(c, function (j) { return j.district === dd.n; });
        tr.rows.forEach(function (row) { out.rows.push(row); });
        var elsewhere = tr.rows.length ? [] : filedFor(c.key, dd.n, ELECTION.year)
          .filter(function (q) { return q.rosterCourt !== c.key; });
        pushCourt(c, tr.rows, tr.slate, tr.rows.length ? 'rows' : 'empty',
          tr.rows.length
            ? ''
            : (elsewhere.length
              ? (elsewhere.length + ' ' + ELECTION.year + ' question' +
                 (elsewhere.length === 1 ? ' was' : 's were') + ' filed as a ' + c.short +
                 ' question for the ' + dd.label + '. The state courts directory lists ' +
                 (elsewhere.length === 1 ? 'that judge' : 'those judges') + ' on the ' +
                 elsewhere[0].rosterLabel + ', where the question appears above. PolitiDex ' +
                 'names both official sources and resolves neither.')
              : 'No ' + c.short + ' retention question on file for the ' + dd.label +
                ' in ' + ELECTION.year + '.'));
        return;
      }

      // ── Everything still unmapped: the justice courts ─────────────────────
      // A justice court seat is municipal or county, and no public roster
      // naming those seats is on file. Now that the county is known the
      // sentence can at least name it, which turns a generic gap into a
      // specific one a reader can go and check.
      pushCourt(c, [], null, 'unmapped',
        c.short + ' retention is decided by the voters of each ' + c.unit + '. ' +
        'PolitiDex holds no ' + c.short + ' roster for ' + (cty || 'your location') +
        ', so no ' + c.short + ' question is claimed for your ballot.');
      out.missing.push(c.label + ' — no roster on file for ' + (cty || 'your location'));
    });
    dropped.forEach(function (m) { out.missing.push(m); });

    // Certification is a property of every list a row came from. One
    // uncertified court that produced rows makes the whole answer uncertified,
    // because a reader cannot tell which row came from which list.
    var anyUncertified = false;
    out.courts.forEach(function (c) { if (c.status === 'rows' && !c.certified) anyUncertified = true; });
    out.certified = !anyUncertified;
    out.note = out.certified
      ? ''
      : 'The official ' + ELECTION.year + ' retention list is not on file. What is below is what ' +
        'PolitiDex holds, not the complete ballot — check ' + ((D() || {}).JPEC_URL || '') + '.';
    return out;
  }

  // ── The archive answer ─────────────────────────────────────────────────
  // Chamber-and-state shaped, exactly like the rest of the archive: "Utah ·
  // Supreme Court", alphabetical inside, no party chip and no composite. It is
  // a roster slice and makes no seat claim, which is why it renders for a
  // reader in Ohio unchanged.
  function archive() {
    var st = (D() || {}).STATE || 'Utah';
    return courts().map(function (c) {
      var rows = all().filter(function (j) { return j.court === c.key; }).map(function (j) {
        var jj = judge(j.pid);
        return {
          pid: jj.pid, name: jj.name, role: jj.role || '',
          area: jj.area || '', district: jj.district || null,
          unitLabel: jj.unitLabel || '',
          former: jj.former, seated: jj.seated,
          ambiguous: jj.ambiguous
        };
      });
      // Alphabetical inside a statewide court, district-then-alphabetical
      // inside a trial court — because "District Court" is seventy-odd rows
      // and a reader looking for their own district should not have to scan
      // all of them.
      if (c.scope === 'district') {
        rows.sort(function (a, b) {
          return (a.district || 0) - (b.district || 0) ||
            String(a.name).localeCompare(String(b.name));
        });
      }
      return {
        key: c.key,
        label: st + ' · ' + c.short,
        court: c.label,
        term: c.term,
        rows: rows,
        note: rows.length ? '' : 'No ' + c.short + ' records on file yet.'
      };
    });
  }

  // ── What person-file.js needs ──────────────────────────────────────────
  // A judge is a person with a file, so /p/<pid> has to resolve. This is the
  // identity shape person-file.js's record() can accept: enough to name the
  // person and the office, and deliberately no party, no score and no promise
  // counts, so nothing downstream can compute a figure out of it. `judicial`
  // is the flag every consumer branches on.
  function personRecord(pid) {
    var j = judge(pid);
    if (!j) return null;
    return {
      pid: j.pid,
      name: j.name,
      office: j.courtLabel,
      state: j.state,
      icon: '⚖',
      judicial: true,
      courtKey: j.courtKey,
      role: j.role || ''
    };
  }

  window.PDXJudicial = {
    VOCAB: VOCAB,
    BANNED: BANNED,
    WALL: WALL,
    NO_FORMAL: NO_FORMAL,
    ELECTION: ELECTION,
    courts: courts,
    court: court,
    courtLabel: courtLabel,
    all: all,
    judge: judge,
    isJudge: isJudge,
    slate: slate,
    slateQuestion: slateQuestion,
    filedFor: filedFor,
    districts: districts,
    district: district,
    districtForCounty: districtForCounty,
    countiesOf: countiesOf,
    jpec: jpec,
    retention: retention,
    history: history,
    publicLane: publicLane,
    ballot: ballot,
    archive: archive,
    personRecord: personRecord,
    collisions: collisions,
    dateLabel: dateLabel,
    yearOf: yearOf
  };
})();
