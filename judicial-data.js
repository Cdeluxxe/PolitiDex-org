/* ══════════════════════════════════════════════════════════════════════════
   judicial-data.js — the Utah judicial roster, as identity rows only
   ──────────────────────────────────────────────────────────────────────────
   Utah ballots in even years carry judicial retention: a yes/no question,
   "Shall Judge X be retained in office?", with no opponent and no party on
   the line. PolitiDex Door 2 resolved legislative seats and said nothing at
   all about the third branch, which is a hole in "your actual ballot" rather
   than a missing feature.

   This file is the DATA for that hole and nothing else. It carries no logic,
   no scoring and no rendering — judicial-retention.js reads it, and every
   surface reads judicial-retention.js. One owner, as everywhere else here.

   ── What a row is allowed to say ─────────────────────────────────────────
   Identity, and the formal record of how the person got the seat:

     name · court · district or county · appointing governor · year appointed
     · Senate confirmation · next retention date · pid

   That is the whole vocabulary. A row does NOT carry:

     · a party. Party is not on the judicial ballot in Utah, and a party chip
       on a retention row would invent a contest that does not exist.
     · a score, a percentage, a Direction Match input or a Mandate term. There
       is no promise ledger for a judge, so there is nothing to grade a word
       against an action with — and inventing one out of case holdings would
       mean "broke their promise by ruling X", which is not what a ruling is.
     · an inference from the appointing governor. "Cox appointee" is a fact
       about the appointment. It is not a description of the judge, and this
       file does not let it become one.

   ── JPEC, and why most cards here are empty ──────────────────────────────
   Utah's Judicial Performance Evaluation Commission publishes the official
   evaluation — legal ability, integrity and judicial temperament,
   administrative performance, procedural fairness — and a retain / does not
   meet recommendation, at judges.utah.gov. That is the authoritative card,
   and PolitiDex does not compute a substitute for it. Where the report is not
   on file here, `jpec` is null and the surface says "no JPEC report on file"
   with a pointer to the official source. An empty card is a statement about
   what we hold, and it is a true one.

   ── Why the 2026 slate is marked uncertified ─────────────────────────────
   At the time this file was written the official November 3, 2026 retention
   list was not publicly retrievable: the state's own judges.utah.gov shipped
   a broken application shell, utcourts.gov's court pages 404'd, and the
   third-party 2026 appellate page carried no judge list. So every slate below
   is `certified: false`, which is the flag that makes every reader-facing
   surface say the official list is not on file yet instead of implying that
   what is here is all of it. Exactly one row is verifiable as standing for
   retention on that date, and only that row claims it.

   The courts with no rows at all — Court of Appeals, District, Juvenile,
   Justice — are empty ON PURPOSE. The roster cannot name those seats without
   guessing, and the order for this pass is to fail closed rather than fill
   them in. A missing map is reported as a missing map.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── The five courts, in the order a Utah ballot runs them ───────────────
  // `scope` is what a retention row needs to know to answer "is this on THIS
  // voter's ballot": a statewide court is on every Utah ballot, a district or
  // county court is on the ballot only for the voters inside it. `term` is the
  // retention interval from Utah Const. Art. VIII §9 — ten years for the
  // Supreme Court, six for the other courts of record. `map` is false where
  // PolitiDex holds no geography to place a voter inside the court's boundary,
  // which is the same "we do not map that" honesty the House district rows use
  // outside Utah.
  var COURTS = [
    {
      key: 'supreme', label: 'Utah Supreme Court', short: 'Supreme Court',
      scope: 'statewide', unit: '', term: 10, map: true,
      note: 'Elected statewide. Every Utah voter votes on a Supreme Court retention question.'
    },
    {
      key: 'appeals', label: 'Utah Court of Appeals', short: 'Court of Appeals',
      scope: 'statewide', unit: '', term: 6, map: true,
      note: 'Elected statewide. Every Utah voter votes on a Court of Appeals retention question.'
    },
    {
      key: 'district', label: 'Utah District Court', short: 'District Court',
      scope: 'district', unit: 'judicial district', units: 'judicial districts', term: 6, map: false,
      note: 'Retained by the voters of the judicial district the judge serves.'
    },
    {
      key: 'juvenile', label: 'Utah Juvenile Court', short: 'Juvenile Court',
      scope: 'district', unit: 'judicial district', units: 'judicial districts', term: 6, map: false,
      note: 'Retained by the voters of the judicial district the judge serves.'
    },
    {
      key: 'justice', label: 'Utah Justice Court', short: 'Justice Court',
      scope: 'local', unit: 'city or county', units: 'cities and counties', term: 6, map: false,
      note: 'Retained by the voters of the city or county the court serves.'
    }
  ];

  // ── Judges ──────────────────────────────────────────────────────────────
  // Null is a field, not a gap to be filled in later by a guess. `appointed`
  // and `confirmed` are the dates on the formal record; where the date is not
  // on file the field is null and the file says so rather than printing a year
  // that is probably right. `retention` is a DATE and only a date: a row with
  // null there is not claimed to be on any ballot.
  //
  // `seated: false` marks an appointment that has not been confirmed and
  // seated, which matters because an unseated appointee is not a judge yet and
  // cannot stand for retention. `former: true` marks a judge who has left; the
  // row survives because the record of the seat survives, and because a reader
  // who arrives from an older list deserves to be told the seat changed rather
  // than shown nothing.
  var JUDGES = {
    jill_pohlman: {
      pid: 'jill_pohlman',
      name: 'Jill Pohlman',
      court: 'supreme',
      role: 'Associate Chief Justice',
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-06-28',
      confirmed: '2022-08-17',
      retention: '2026-11-03',
      jpec: null,
      // Her Court of Appeals evaluation page on the official site. Labelled as
      // the PRIOR court's report everywhere it renders, because presenting it
      // as the current Supreme Court card would be a small lie about which
      // seat was evaluated.
      priorReportUrl: 'https://judges.utah.gov/reports/judges/court-of-appeals/pohlman-jill/',
      priorReportLabel: 'Court of Appeals evaluation page',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Gary Herbert', when: '2016-05' },
        { what: 'Appointed to the Utah Supreme Court', by: 'Spencer Cox', when: '2022-06-28' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2022-08-17' }
      ]
    },
    paige_petersen: {
      pid: 'paige_petersen',
      name: 'Paige Petersen',
      court: 'supreme',
      role: 'Justice',
      area: '',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: null,
      confirmed: null,
      retention: null,
      jpec: null,
      history: [],
      record: [{ what: 'Appointed to the Utah Supreme Court', by: 'Gary Herbert', when: '' }]
    },
    john_nielsen: {
      pid: 'john_nielsen',
      name: 'John Nielsen',
      court: 'supreme',
      role: 'Justice',
      area: '',
      appointedBy: null,
      appointedByPid: null,
      appointed: null,
      confirmed: null,
      retention: null,
      jpec: null,
      history: [],
      record: []
    },
    stephen_dent: {
      pid: 'stephen_dent',
      name: 'Stephen Dent',
      court: 'supreme',
      role: 'Justice',
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: null,
      confirmed: '2026-06',
      retention: null,
      jpec: null,
      history: [],
      record: [
        { what: 'Appointed to a seat created by the 2026 expansion of the court from five justices to seven', by: 'Spencer Cox', when: '' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2026-06' }
      ]
    },
    jay_jorgensen: {
      pid: 'jay_jorgensen',
      name: 'Jay Jorgensen',
      court: 'supreme',
      role: 'Justice',
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: null,
      confirmed: '2026-06',
      retention: null,
      jpec: null,
      history: [],
      record: [
        { what: 'Appointed to a seat created by the 2026 expansion of the court from five justices to seven', by: 'Spencer Cox', when: '' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2026-06' }
      ]
    },
    matthew_bell: {
      pid: 'matthew_bell',
      name: 'Matthew Bell',
      court: 'supreme',
      role: 'Appointee',
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-08-28',
      confirmed: null,
      retention: null,
      seated: false,
      jpec: null,
      history: [],
      record: [{ what: 'Appointed to the Utah Supreme Court; Senate confirmation not on file', by: 'Spencer Cox', when: '2026-08-28' }]
    },
    michael_menssen: {
      pid: 'michael_menssen',
      name: 'Michael Menssen',
      court: 'supreme',
      role: 'Appointee',
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-08-28',
      confirmed: null,
      retention: null,
      seated: false,
      jpec: null,
      history: [],
      record: [{ what: 'Appointed to the Utah Supreme Court; Senate confirmation not on file', by: 'Spencer Cox', when: '2026-08-28' }]
    },
    diana_hagen: {
      pid: 'diana_hagen',
      name: 'Diana Hagen',
      court: 'supreme',
      role: 'Justice',
      area: '',
      appointedBy: null,
      appointedByPid: null,
      appointed: null,
      confirmed: null,
      retention: null,
      former: true,
      left: '2026-05',
      // The one sentence a reader arriving from a stale 2026 retention list
      // needs. It states what changed, not what it means.
      leftNote: 'Was listed to stand for retention in November 2026. Left the court in May 2026 and does not stand for retention.',
      jpec: null,
      history: [],
      record: []
    }
  };

  // ── Slates: what is on a given year's ballot, per court ─────────────────
  // `certified: false` is the load-bearing field. It says: this is what we
  // hold, the official list is not on file, and no surface may present the
  // rows below as the complete ballot. `source` is where the official list
  // lives so a reader can go and check.
  var SLATES = {
    2026: {
      supreme: {
        year: 2026,
        date: '2026-11-03',
        certified: false,
        pids: ['jill_pohlman'],
        source: 'https://judges.utah.gov',
        note: 'The official 2026 retention list is not on file. One Supreme Court retention question is confirmed below; there may be others.'
      },
      appeals: {
        year: 2026,
        date: '2026-11-03',
        certified: false,
        pids: [],
        source: 'https://judges.utah.gov',
        note: 'The official 2026 Court of Appeals retention list is not on file.'
      }
    }
  };

  // ── The public lane ─────────────────────────────────────────────────────
  // Things people have SAID about a retention question, carried with a cite
  // and attached to the COURT rather than to a judge — the reporting names a
  // campaign against two justices without naming them, and pinning it to a
  // guessed name would be the invention this whole pass exists to avoid.
  // These are quoted positions in public, never a grade, and they never enter
  // a score of any kind.
  var PUBLIC = {
    supreme: [
      {
        what: 'Utah Republican Party leaders urged convention delegates to vote against retaining two justices; the Utah State Bar urged voters to rely on the official retention evaluations instead.',
        url: 'https://www.abc4.com/news/politics/inside-utah-politics/utah-state-bar-gop-supreme-court-justice-retention/',
        cite: 'ABC4 · Inside Utah Politics'
      }
    ]
  };

  window.PDX_JUDICIAL = {
    STATE: 'Utah',
    JPEC_URL: 'https://judges.utah.gov',
    JPEC_NAME: 'Judicial Performance Evaluation Commission',
    COURTS: COURTS,
    JUDGES: JUDGES,
    SLATES: SLATES,
    PUBLIC: PUBLIC
  };
})();
