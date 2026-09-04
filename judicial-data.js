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

     name · court · judicial district · appointing governor · year appointed
     · Senate confirmation · next retention date · official biography · pid

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
     · a holding, a case, an opinion or a summary of one. The roster knows who
       sits where and when they next stand. It does not review their work.

   ── Where every row came from ────────────────────────────────────────────
   Three official sources and no fourth:

     1. The bench roster and the appointment sentence in each identity row are
        the state courts directory's own judge biography pages —
        utcourts.gov/en/courts/other-court-info/judges-bios.html and the
        per-judge pages under it. Court commissioners are deliberately absent:
        a commissioner is not a judge and does not stand for retention.
     2. The 2026 ballot slate is the Lieutenant Governor's 2026 candidate
        filings list, "State Judicial" section — the verbatim retention
        questions as filed. That list is the ballot; nothing else here is.
     3. The county-to-district map is Utah Code § 78A-1-102, "Trial courts of
        record — Geographical divisions", which divides the district AND
        juvenile courts into the same eight geographical divisions.

   Where two of those sources disagree, the row says so and picks neither. See
   `slateConflict`. Where a source has an obvious typo, the row carries the
   corrected value and a `sourceNote` naming the typo, because silently fixing
   a source is still editing one.

   ── JPEC, and why most cards here are empty ──────────────────────────────
   Utah's Judicial Performance Evaluation Commission publishes the official
   evaluation — legal ability, integrity and judicial temperament,
   administrative performance, procedural fairness — and a retain / does not
   meet recommendation, at judges.utah.gov. That is the authoritative card,
   and PolitiDex does not compute a substitute for it. Where the report is not
   on file here, `jpec` is null and the surface says "no JPEC report on file"
   with a pointer to the official source. An empty card is a statement about
   what we hold, and it is a true one.

   Every `jpec` below is null. The commission's own site answers 401 on every
   report path, so there is no per-judge evaluation to attach and no stable URL
   to link. That is reported as "no report on file", which is exactly what it
   is. No number here is estimated, averaged or inferred from anything.

   ── The 2026 slate is certified ──────────────────────────────────────────
   Earlier passes shipped `certified: false` because the official retention
   list was not publicly retrievable. It is now: the Lieutenant Governor's
   2026 candidate filings page carries all thirty-two State Judicial retention
   questions, each with a filing status, last updated 8/31/2026. So the slate
   below is `certified: true` and the uncertified caveat is retired — for the
   courts the list names, and only those.

   The Justice Court still has no rows and `map: false`. Justice court seats
   are municipal and county, no public roster naming those seats was obtained,
   and the order for this pass is to fail closed rather than fill them in. A
   missing roster is reported as a missing roster.
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
      scope: 'district', unit: 'judicial district', units: 'judicial districts', term: 6, map: true,
      note: 'Retained by the voters of the judicial district the judge serves.'
    },
    {
      key: 'juvenile', label: 'Utah Juvenile Court', short: 'Juvenile Court',
      scope: 'district', unit: 'judicial district', units: 'judicial districts', term: 6, map: true,
      note: 'Retained by the voters of the judicial district the judge serves.'
    },
    {
      key: 'justice', label: 'Utah Justice Court', short: 'Justice Court',
      scope: 'local', unit: 'city or county', units: 'cities and counties', term: 6, map: false,
      note: 'Retained by the voters of the city or county the court serves.'
    }
  ];

  // ── The eight geographical divisions ────────────────────────────────────
  // Utah Code § 78A-1-102, "Trial courts of record — Geographical divisions":
  // "The district and juvenile courts are divided into eight geographical
  // divisions." ONE map, both courts — which is why a district judge and a
  // juvenile judge in the same division answer to the same counties, and why
  // there is no second table here for the juvenile court.
  //
  // `counties` is the statute's list, verbatim and complete: all twenty-nine
  // Utah counties appear exactly once across the eight rows. A county that is
  // not here is a bug, not an unmapped county — and judicial-retention.js
  // builds its county index from this array rather than keeping a second copy
  // of the mapping, so there is one place for the map to be wrong.
  var DISTRICTS = [
    {
      n: 1, ordinal: 'First',
      label: 'First Judicial District',
      districtLabel: 'First District Court',
      juvenileLabel: 'First District Juvenile Court',
      counties: ['Box Elder', 'Cache', 'Rich']
    },
    {
      n: 2, ordinal: 'Second',
      label: 'Second Judicial District',
      districtLabel: 'Second District Court',
      juvenileLabel: 'Second District Juvenile Court',
      counties: ['Weber', 'Davis', 'Morgan']
    },
    {
      n: 3, ordinal: 'Third',
      label: 'Third Judicial District',
      districtLabel: 'Third District Court',
      juvenileLabel: 'Third District Juvenile Court',
      counties: ['Salt Lake', 'Summit', 'Tooele']
    },
    {
      n: 4, ordinal: 'Fourth',
      label: 'Fourth Judicial District',
      districtLabel: 'Fourth District Court',
      juvenileLabel: 'Fourth District Juvenile Court',
      counties: ['Utah', 'Wasatch', 'Juab', 'Millard']
    },
    {
      n: 5, ordinal: 'Fifth',
      label: 'Fifth Judicial District',
      districtLabel: 'Fifth District Court',
      juvenileLabel: 'Fifth District Juvenile Court',
      counties: ['Beaver', 'Iron', 'Washington']
    },
    {
      n: 6, ordinal: 'Sixth',
      label: 'Sixth Judicial District',
      districtLabel: 'Sixth District Court',
      juvenileLabel: 'Sixth District Juvenile Court',
      counties: ['Garfield', 'Kane', 'Piute', 'Sanpete', 'Sevier', 'Wayne']
    },
    {
      n: 7, ordinal: 'Seventh',
      label: 'Seventh Judicial District',
      districtLabel: 'Seventh District Court',
      juvenileLabel: 'Seventh District Juvenile Court',
      counties: ['Carbon', 'Emery', 'Grand', 'San Juan']
    },
    {
      n: 8, ordinal: 'Eighth',
      label: 'Eighth Judicial District',
      districtLabel: 'Eighth District Court',
      juvenileLabel: 'Eighth District Juvenile Court',
      counties: ['Daggett', 'Duchesne', 'Uintah']
    }
  ];

  // ── Judges ──────────────────────────────────────────────────────────────
  // Null is a field, not a gap to be filled in later by a guess. `appointed`
  // and `confirmed` are the dates on the formal record; where the date is not
  // on file the field is null and the file says so rather than printing a year
  // that is probably right. Four rows below carry a null appointing governor
  // or a null appointment date because the official biography does not name
  // one — not because nobody looked.
  //
  // `retention` is a DATE and only a date: a row with null there is not
  // claimed to be on any ballot. Thirty-two rows carry '2026-11-03' and every
  // one of them is a question the Lieutenant Governor's list names.
  //
  // `district` is the judicial district number for a trial-court judge and
  // null for an appellate one, because an appellate judge stands statewide and
  // a number would imply a boundary that does not exist.
  //
  // `seated: false` marks an appointment that has not been confirmed and
  // seated, which matters because an unseated appointee is not a judge yet and
  // cannot stand for retention. `former: true` marks a judge who has left; the
  // row survives because the record of the seat survives, and because a reader
  // who arrives from an older list deserves to be told the seat changed rather
  // than shown nothing.
  var JUDGES = {
    matthew_durrant: {
      pid: 'matthew_durrant',
      name: 'Matthew B. Durrant',
      court: 'supreme',
      role: 'Chief Justice',
      district: null,
      area: '',
      appointedBy: 'Michael Leavitt',
      appointedByPid: null,
      appointed: '2000-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/matthew-b-durrant.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Supreme Court', by: 'Michael Leavitt', when: '2000-01' }
      ]
    },
    jill_pohlman: {
      pid: 'jill_pohlman',
      name: 'Jill M. Pohlman',
      court: 'supreme',
      role: 'Associate Chief Justice',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-06',
      confirmed: '2022-08-17',
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/jill-m-pohlman.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Gary Herbert', when: '2016-05' },
        { what: 'Appointed to the Utah Supreme Court', by: 'Spencer Cox', when: '2022-06-28' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2022-08-17' }
      ]
    },
    stephen_dent: {
      pid: 'stephen_dent',
      name: 'Stephen P. Dent',
      court: 'supreme',
      role: 'Justice',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-06',
      confirmed: '2026-06',
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/stephen-p-dent.html',
      history: [],
      record: [
        { what: 'Appointed to a seat created by the 2026 expansion of the court from five justices to seven', by: 'Spencer Cox', when: '2026-06' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2026-06' }
      ]
    },
    jay_jorgensen: {
      pid: 'jay_jorgensen',
      name: 'Jay T. Jorgensen',
      court: 'supreme',
      role: 'Justice',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026',
      confirmed: '2026-06',
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/jay-t-jorgensen.html',
      history: [],
      record: [
        { what: 'Appointed to a seat created by the 2026 expansion of the court from five justices to seven', by: 'Spencer Cox', when: '2026-06' },
        { what: 'Confirmed by the Utah Senate', by: '', when: '2026-06' }
      ]
    },
    john_nielsen: {
      pid: 'john_nielsen',
      name: 'John Nielsen',
      court: 'supreme',
      role: 'Justice',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/john-nielsen.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Supreme Court', by: 'Spencer Cox', when: '2025-10' }
      ]
    },
    paige_petersen: {
      pid: 'paige_petersen',
      name: 'Paige Petersen',
      court: 'supreme',
      role: 'Justice',
      district: null,
      area: '',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/supreme-court/paige-petersen.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Supreme Court', by: 'Gary Herbert', when: '2017-12' }
      ]
    },
    ryan_harris: {
      pid: 'ryan_harris',
      name: 'Ryan M. Harris',
      court: 'appeals',
      role: 'Presiding Judge',
      district: null,
      area: '',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-06',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/ryan-m-harris.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Gary Herbert', when: '2017-06' }
      ]
    },
    david_mortensen: {
      pid: 'david_mortensen',
      name: 'David N. Mortensen',
      court: 'appeals',
      role: 'Associate Presiding Judge',
      district: null,
      area: '',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-05',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/david-n-mortensen.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Gary Herbert', when: '2016-05' }
      ]
    },
    michele_christiansen_forster: {
      pid: 'michele_christiansen_forster',
      name: 'Michele M. Christiansen Forster',
      court: 'appeals',
      role: 'Judge',
      district: null,
      area: '',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2010-06',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/christiansen-forster.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Gary Herbert', when: '2010-06' }
      ]
    },
    john_luthy: {
      pid: 'john_luthy',
      name: 'John D. Luthy',
      court: 'appeals',
      role: 'Judge',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-10',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/john-d-luthy.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Spencer Cox', when: '2022-10' }
      ]
    },
    amy_oliver: {
      pid: 'amy_oliver',
      name: 'Amy J. Oliver',
      court: 'appeals',
      role: 'Judge',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-01',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/amy-j-oliver.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Spencer Cox', when: '2023-01' }
      ]
    },
    gregory_orme: {
      pid: 'gregory_orme',
      name: 'Gregory K. Orme',
      court: 'appeals',
      role: 'Judge',
      district: null,
      area: '',
      appointedBy: 'Norman Bangerter',
      appointedByPid: null,
      appointed: '1987-01',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/gregory-k-orme.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Norman Bangerter', when: '1987-01' }
      ]
    },
    ryan_tenney: {
      pid: 'ryan_tenney',
      name: 'Ryan D. Tenney',
      court: 'appeals',
      role: 'Judge',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2021-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/appellate-courts/court-of-appeals/ryan-d-tenney.html',
      history: [],
      record: [
        { what: 'Appointed to the Utah Court of Appeals', by: 'Spencer Cox', when: '2021-06' }
      ]
    },
    brian_cannell: {
      pid: 'brian_cannell',
      name: 'Brian G. Cannell',
      court: 'district',
      role: 'Presiding Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2013-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/first-district-court/brian-g-cannell.html',
      history: [],
      record: [
        { what: 'Appointed to the First District Court', by: 'Gary Herbert', when: '2013-08' }
      ]
    },
    spencer_walsh: {
      pid: 'spencer_walsh',
      name: 'Spencer D. Walsh',
      court: 'district',
      role: 'Associate Presiding Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/first-district-court/spencer-d-walsh.html',
      history: [],
      record: [
        { what: 'Appointed to the First District Court', by: 'Gary Herbert', when: '2020-09' }
      ]
    },
    angela_fonnesbeck: {
      pid: 'angela_fonnesbeck',
      name: 'Angela F. Fonnesbeck',
      court: 'district',
      role: 'Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2019-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/first-district-court/angela-f-fonnesbeck.html',
      history: [],
      record: [
        { what: 'Appointed to the First District Court', by: 'Gary Herbert', when: '2019-08' }
      ]
    },
    brandon_maynard: {
      pid: 'brandon_maynard',
      name: 'Brandon J. Maynard',
      court: 'district',
      role: 'Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/first-district-court/brandon-j-maynard.html',
      history: [],
      record: [
        { what: 'Appointed to the First District Court', by: 'Gary Herbert', when: '2014-06' }
      ]
    },
    ronald_russell: {
      pid: 'ronald_russell',
      name: 'Ronald G. Russell',
      court: 'district',
      role: 'Presiding Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2021-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/ronald-g-russell.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2021-01' }
      ]
    },
    reuben_renstrom: {
      pid: 'reuben_renstrom',
      name: 'Reuben J. Renstrom',
      court: 'district',
      role: 'Associate Presiding Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2019-03',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/reuben-j-renstrom.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2019-03' }
      ]
    },
    joseph_bean: {
      pid: 'joseph_bean',
      name: 'Joseph Bean',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-03',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/joseph-bean.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2014-03' }
      ]
    },
    catherine_conklin: {
      pid: 'catherine_conklin',
      name: 'Catherine Conklin',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: null,
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/catherine-conklin.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Spencer Cox', when: '' }
      ]
    },
    michael_direda: {
      pid: 'michael_direda',
      name: 'Michael D. DiReda',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Jon Huntsman',
      appointedByPid: null,
      appointed: '2008-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/michael-d-direda.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Jon Huntsman', when: '2008-12' }
      ]
    },
    michael_edwards: {
      pid: 'michael_edwards',
      name: 'Michael S. Edwards',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/michael-s-edwards.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2018-09' }
      ]
    },
    craig_hall: {
      pid: 'craig_hall',
      name: 'Craig Hall',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: null,
      appointedByPid: null,
      appointed: '2021-07',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/craig-hall.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: '', when: '2021-07' }
      ]
    },
    matthew_hansen: {
      pid: 'matthew_hansen',
      name: 'Matthew J. Hansen',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/matthew-j-hansen.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Spencer Cox', when: '2025-05' }
      ]
    },
    camille_neider: {
      pid: 'camille_neider',
      name: 'Camille L. Neider',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/camille-l-neider.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2017-11' }
      ]
    },
    jason_nelson: {
      pid: 'jason_nelson',
      name: 'Jason C. Nelson',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-01',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/jason-c-nelson.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Spencer Cox', when: '2023-01' }
      ]
    },
    cristina_ortega: {
      pid: 'cristina_ortega',
      name: 'Cristina P. Ortega',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2021-02',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/cristina-p-ortega.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Spencer Cox', when: '2021-02' }
      ]
    },
    blaine_rawson: {
      pid: 'blaine_rawson',
      name: 'E. Blaine Rawson',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-09',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/e-blaine-rawson.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Spencer Cox', when: '2022-09' }
      ]
    },
    jennifer_valencia: {
      pid: 'jennifer_valencia',
      name: 'Jennifer L. Valencia',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-05',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/jennifer-l-valencia.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2017-05' }
      ]
    },
    david_williams: {
      pid: 'david_williams',
      name: 'David J. Williams',
      court: 'district',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/second-district-court/david-j-williams.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Court', by: 'Gary Herbert', when: '2018-10' }
      ]
    },
    adam_mow: {
      pid: 'adam_mow',
      name: 'Adam T. Mow',
      court: 'district',
      role: 'Presiding Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/adam-t-mow.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2018-01' }
      ]
    },
    kara_pettit: {
      pid: 'kara_pettit',
      name: 'Kara L. Pettit',
      court: 'district',
      role: 'Associate Presiding Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/kara-l-pettit.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2014-09' }
      ]
    },
    matthew_bates: {
      pid: 'matthew_bates',
      name: 'Matthew Bates',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/matthew-bates.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2016-07' }
      ]
    },
    james_blanch: {
      pid: 'james_blanch',
      name: 'James T. Blanch',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2012-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/james-t-blanch.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2012-08' }
      ]
    },
    heather_brereton: {
      pid: 'heather_brereton',
      name: 'Heather Brereton',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2015-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/heather-brereton.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2015-08' }
      ]
    },
    patrick_corum: {
      pid: 'patrick_corum',
      name: 'Patrick W. Corum',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/patrick-w-corum.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2017-11' }
      ]
    },
    richard_daynes: {
      pid: 'richard_daynes',
      name: 'Richard W. Daynes',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-04',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/richard-w-daynes.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2024-04' }
      ]
    },
    robert_faust: {
      pid: 'robert_faust',
      name: 'Robert P. Faust',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Jon Huntsman',
      appointedByPid: null,
      appointed: '2007-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/robert-p-faust.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Jon Huntsman', when: '2007-01' }
      ]
    },
    joel_ferre: {
      pid: 'joel_ferre',
      name: 'Joel A. Ferre',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/judge-joel-a--ferre.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2026-01' }
      ]
    },
    james_gardner: {
      pid: 'james_gardner',
      name: 'James D. Gardner',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/james-d-gardner.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2014-12' }
      ]
    },
    dianna_gibson: {
      pid: 'dianna_gibson',
      name: 'Dianna Gibson',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/dianna-gibson.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2018-10' }
      ]
    },
    todd_hilbig: {
      pid: 'todd_hilbig',
      name: 'Todd C. Hilbig',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/judge-todd-c--hilbig.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2025' }
      ]
    },
    douglas_hogan: {
      pid: 'douglas_hogan',
      name: 'Douglas Hogan',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/douglas-hogan.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2014-10' }
      ]
    },
    elizabeth_hrubymills: {
      pid: 'elizabeth_hrubymills',
      name: 'Elizabeth A. Hruby-Mills',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2011-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/elizabeth-a-hruby-mills.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2011-08' }
      ]
    },
    kristine_johnson: {
      pid: 'kristine_johnson',
      name: 'Kristine E. Johnson',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2019-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/kristine-e-johnson.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2019-10' }
      ]
    },
    linda_jones: {
      pid: 'linda_jones',
      name: 'Linda M. Jones',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/linda-m-jones.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2017-10' }
      ]
    },
    chelsea_koch: {
      pid: 'chelsea_koch',
      name: 'Chelsea Koch',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2019-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/chelsea-koch.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2019-09' }
      ]
    },
    barry_lawrence: {
      pid: 'barry_lawrence',
      name: 'Barry G. Lawrence',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2012-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/senior-Judges/district-court-senior-judges/barry-g-lawrence.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2012-09' }
      ]
    },
    thaddeus_may: {
      pid: 'thaddeus_may',
      name: 'Thaddeus May',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-02',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/judge-thaddeus-j--may.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2025-02' }
      ]
    },
    amber_mettler: {
      pid: 'amber_mettler',
      name: 'Amber M. Mettler',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/amber-m-mettler.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2017-11' }
      ]
    },
    amanda_montague: {
      pid: 'amanda_montague',
      name: 'Amanda N. Montague',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/judge-amanda-n--montague.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2025-08' }
      ]
    },
    richard_mrazik: {
      pid: 'richard_mrazik',
      name: 'Richard E. Mrazik',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-04',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/richard-e-mrazik.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2018-04' }
      ]
    },
    stephen_nelson: {
      pid: 'stephen_nelson',
      name: 'Stephen L. Nelson',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/stephen-l-nelson.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2023-11' }
      ]
    },
    richard_pehrson: {
      pid: 'richard_pehrson',
      name: 'Richard Pehrson',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/richard-pehrson.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2024-05' }
      ]
    },
    coral_sanchez: {
      pid: 'coral_sanchez',
      name: 'Coral Sanchez',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-12',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/coral-sanchez.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2022-12' }
      ]
    },
    laura_scott: {
      pid: 'laura_scott',
      name: 'Laura Scott',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: null,
      appointedByPid: null,
      appointed: '2014',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/laura-scott.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: '', when: '2014' }
      ]
    },
    todd_shaughnessy: {
      pid: 'todd_shaughnessy',
      name: 'Todd M. Shaughnessy',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2011',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/todd-m-shaughnessy.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2011' }
      ]
    },
    charles_stormont: {
      pid: 'charles_stormont',
      name: 'Charles A. Stormont',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-06',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/charles-a-stormont.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2023-06' }
      ]
    },
    vernice_trease: {
      pid: 'vernice_trease',
      name: 'Vernice Trease',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Jon Huntsman',
      appointedByPid: null,
      appointed: '2006-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/vernice-trease.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Jon Huntsman', when: '2006-11' }
      ]
    },
    teresa_welch: {
      pid: 'teresa_welch',
      name: 'Teresa L. Welch',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2019-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/teresa-l-welech.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Gary Herbert', when: '2019-10' }
      ]
    },
    derek_williams: {
      pid: 'derek_williams',
      name: 'Derek J. Williams',
      court: 'district',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-07',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/third-district-court/judge-derek-j--williams.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Court', by: 'Spencer Cox', when: '2025-07' }
      ]
    },
    sean_petersen: {
      pid: 'sean_petersen',
      name: 'Sean M. Petersen',
      court: 'district',
      role: 'Presiding Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2021-07',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/sean-m-petersen.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Spencer Cox', when: '2021-07' }
      ]
    },
    jared_eldridge: {
      pid: 'jared_eldridge',
      name: 'Jared Eldridge',
      court: 'district',
      role: 'Associate Presiding Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-05',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/jared-eldridge.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2017-05' }
      ]
    },
    jennifer_mabey_brown: {
      pid: 'jennifer_mabey_brown',
      name: 'Jennifer A. Mabey (Brown)',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/jennifer-a-brown.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2014-12' }
      ]
    },
    tony_graf: {
      pid: 'tony_graf',
      name: 'Tony F. Graf, Jr.',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/tony-f-graf-jr.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Spencer Cox', when: '2025-05' }
      ]
    },
    roger_griffin: {
      pid: 'roger_griffin',
      name: 'Roger Griffin',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/roger-griffin.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2014-06' }
      ]
    },
    anthony_howell: {
      pid: 'anthony_howell',
      name: 'Anthony L. Howell',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-12',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/anthony-l-howell.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2016-12' }
      ]
    },
    shawn_rice_howell: {
      pid: 'shawn_rice_howell',
      name: 'Shawn Rice Howell',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: null,
      appointedByPid: null,
      appointed: null,
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/shawn-rice-howell.html',
      history: [],
      record: []
    },
    christine_johnson: {
      pid: 'christine_johnson',
      name: 'Christine S. Johnson',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Jon Huntsman',
      appointedByPid: null,
      appointed: '2008-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/christine-s-johnson.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Jon Huntsman', when: '2008-10' }
      ]
    },
    thomas_low: {
      pid: 'thomas_low',
      name: 'Thomas Low',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2009-12',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/thomas-low.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2009-12' }
      ]
    },
    denise_porter: {
      pid: 'denise_porter',
      name: 'Denise M. Porter',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/denise-m-porter.html',
      // The official biography page spells the appointing governor "Gary R.
      // Hebert". Utah has had no Governor Hebert; the row carries the correct
      // surname and this note, because silently fixing a source is still
      // editing one.
      sourceNote: 'The official biography page misspells the appointing governor as "Hebert".',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2020-12' }
      ]
    },
    kraig_powell: {
      pid: 'kraig_powell',
      name: 'Kraig Powell',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-12',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/kraig-powell.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Gary Herbert', when: '2016-12' }
      ]
    },
    derek_pullan: {
      pid: 'derek_pullan',
      name: 'Derek P. Pullan',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Michael Leavitt',
      appointedByPid: null,
      appointed: '2003-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/derek-p-pullan.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Michael Leavitt', when: '2003-09' }
      ]
    },
    ryan_stack: {
      pid: 'ryan_stack',
      name: 'Ryan P.C. Stack',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/judge-ryan-p-c--stack.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Spencer Cox', when: '2026-06' }
      ]
    },
    kasey_wright: {
      pid: 'kasey_wright',
      name: 'Kasey L. Wright',
      court: 'district',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fourth-district-court/judge-kasey-l--wright.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Court', by: 'Spencer Cox', when: '2024-10' }
      ]
    },
    meb_anderson: {
      pid: 'meb_anderson',
      name: 'Meb W. Anderson',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/meb-w-anderson.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2024-09' }
      ]
    },
    matthew_bell: {
      pid: 'matthew_bell',
      name: 'Matthew L. Bell',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-09',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/matthew-l-bell.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Gary Herbert', when: '2017-09' }
      ]
    },
    jack_burns: {
      pid: 'jack_burns',
      name: 'Jack B. Burns',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-04',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/judge-jack-b--burns.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2026-04' }
      ]
    },
    ryan_christiansen: {
      pid: 'ryan_christiansen',
      name: 'Ryan E. Christiansen',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/ryan-e-christiansen.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2024-09' }
      ]
    },
    eric_gentry: {
      pid: 'eric_gentry',
      name: 'Eric R. Gentry',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/eric-r-gentry.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2023-07' }
      ]
    },
    bryan_pattison: {
      pid: 'bryan_pattison',
      name: 'Bryan J. Pattison',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/judge-bryan-j--pattison.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2026-05' }
      ]
    },
    jay_winward: {
      pid: 'jay_winward',
      name: 'Jay T. Winward',
      court: 'district',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-12',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/fifth-district-court/jay-t-winward.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Court', by: 'Spencer Cox', when: '2022-12' }
      ]
    },
    mandy_larsen: {
      pid: 'mandy_larsen',
      name: 'Mandy Larsen',
      court: 'district',
      role: 'Presiding Judge',
      district: 6,
      area: 'Sixth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-04',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/sixth-district-court/mandy-larsen.html',
      history: [],
      record: [
        { what: 'Appointed to the Sixth District Court', by: 'Spencer Cox', when: '2022-04' }
      ]
    },
    robert_van_dyke: {
      pid: 'robert_van_dyke',
      name: 'Robert Van Dyke',
      court: 'district',
      role: 'Judge',
      district: 6,
      area: 'Sixth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025-04',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/sixth-district-court/robert-van-dyke.html',
      history: [],
      record: [
        { what: 'Appointed to the Sixth District Court', by: 'Spencer Cox', when: '2025-04' }
      ]
    },
    don_torgerson: {
      pid: 'don_torgerson',
      name: 'Don M. Torgerson',
      court: 'district',
      role: 'Presiding Judge',
      district: 7,
      area: 'Seventh Judicial District',
      appointedBy: null,
      appointedByPid: null,
      appointed: '2018-07',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/seventh-district-court/don-m-torgerson.html',
      history: [],
      record: [
        { what: 'Appointed to the Seventh District Court', by: '', when: '2018-07' }
      ]
    },
    brian_bolinder: {
      pid: 'brian_bolinder',
      name: 'Brian D. Bolinder',
      court: 'district',
      role: 'Judge',
      district: 7,
      area: 'Seventh Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-02',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/seventh-district-court/brian-d-bolinder.html',
      history: [],
      record: [
        { what: 'Appointed to the Seventh District Court', by: 'Spencer Cox', when: '2024-02' }
      ]
    },
    jeremiah_humes: {
      pid: 'jeremiah_humes',
      name: 'Jeremiah Humes',
      court: 'district',
      role: 'Judge',
      district: 7,
      area: 'Seventh Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/seventh-district-court/jeremiah-humes.html',
      history: [],
      record: [
        { what: 'Appointed to the Seventh District Court', by: 'Gary Herbert', when: '2020-01' }
      ]
    },
    samuel_chiara: {
      pid: 'samuel_chiara',
      name: 'Samuel P. Chiara',
      court: 'district',
      role: 'Presiding Judge',
      district: 8,
      area: 'Eighth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2013-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/eighth-district-court/samuel-p-chiara.html',
      history: [],
      record: [
        { what: 'Appointed to the Eighth District Court', by: 'Gary Herbert', when: '2013-08' }
      ]
    },
    greg_lamb: {
      pid: 'greg_lamb',
      name: 'Greg Lamb',
      court: 'district',
      role: 'Associate Presiding Judge',
      district: 8,
      area: 'Eighth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/eighth-district-court/greg-lamb.html',
      history: [],
      record: [
        { what: 'Appointed to the Eighth District Court', by: 'Gary Herbert', when: '2020-12' }
      ]
    },
    cameron_beech: {
      pid: 'cameron_beech',
      name: 'Cameron M. Beech',
      court: 'district',
      role: 'Judge',
      district: 8,
      area: 'Eighth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/district-courts/eighth-district-court/cameron-m-beech.html',
      history: [],
      record: [
        { what: 'Appointed to the Eighth District Court', by: 'Spencer Cox', when: '2024-11' }
      ]
    },
    bryan_galloway: {
      pid: 'bryan_galloway',
      name: 'Bryan Galloway',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/first-district-juvenile-court/bryan-galloway.html',
      history: [],
      record: [
        { what: 'Appointed to the First District Juvenile Court', by: 'Gary Herbert', when: '2020' }
      ]
    },
    kirk_morgan: {
      pid: 'kirk_morgan',
      name: 'Kirk M. Morgan',
      court: 'juvenile',
      role: 'Judge',
      district: 1,
      area: 'First Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-02',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/first-district-juvenile-court/kirk-m-morgan.html',
      // Two official sources place this judge on different courts. The row
      // follows the state courts directory for the seat and prints the
      // Lieutenant Governor's question verbatim, because that question IS the
      // ballot text. PolitiDex does not pick a winner between two official
      // sources; it names both.
      slateConflict: 'The Lieutenant Governor\'s 2026 filing names this seat as District Court of the First Judicial District. The state courts directory lists the judge on the First District Juvenile Court. Both are official; PolitiDex names the conflict and does not resolve it. The judicial district — and so the counties that vote on the question — is the same either way.',
      history: [],
      record: [
        { what: 'Appointed to the First District Juvenile Court', by: 'Gary Herbert', when: '2017-02' }
      ]
    },
    tasha_williams: {
      pid: 'tasha_williams',
      name: 'Tasha Williams',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-09',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/tasha-williams.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Gary Herbert', when: '2020-09' }
      ]
    },
    ryan_evershed: {
      pid: 'ryan_evershed',
      name: 'Ryan B. Evershed',
      court: 'juvenile',
      role: 'Associate Presiding Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/ryan-b-evershed.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Spencer Cox', when: '2024-10' }
      ]
    },
    debra_jensen: {
      pid: 'debra_jensen',
      name: 'Debra J. Jensen',
      court: 'juvenile',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/debra-j-jensen.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Gary Herbert', when: '2018-06' }
      ]
    },
    robert_neill: {
      pid: 'robert_neill',
      name: 'Robert G. Neill',
      court: 'juvenile',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-10',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/robert-g-neil.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Gary Herbert', when: '2016-10' }
      ]
    },
    jeffrey_noland: {
      pid: 'jeffrey_noland',
      name: 'Jeffrey J. Noland',
      court: 'juvenile',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2010-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/jeffrey-j-noland.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Gary Herbert', when: '2010-07' }
      ]
    },
    rick_westmoreland: {
      pid: 'rick_westmoreland',
      name: 'Rick T. Westmoreland',
      court: 'juvenile',
      role: 'Judge',
      district: 2,
      area: 'Second Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/second-district-juvenile-court/rick-t-westmoreland.html',
      history: [],
      record: [
        { what: 'Appointed to the Second District Juvenile Court', by: 'Spencer Cox', when: '2022' }
      ]
    },
    susan_eisenman: {
      pid: 'susan_eisenman',
      name: 'Susan H. Eisenman',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/susan-h-eisenman.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Gary Herbert', when: '2017-07' }
      ]
    },
    monica_diaz: {
      pid: 'monica_diaz',
      name: 'Monica Diaz',
      court: 'juvenile',
      role: 'Associate Presiding Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2021-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/monica-diaz.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Spencer Cox', when: '2021-06' }
      ]
    },
    steven_beck: {
      pid: 'steven_beck',
      name: 'Steven K. Beck',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/steven-k-beck.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Gary Herbert', when: '2017-07' }
      ]
    },
    sandi_clemens: {
      pid: 'sandi_clemens',
      name: 'Sandi F. Clemens',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-06',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/sandi-f-clemens.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Spencer Cox', when: '2024-06' }
      ]
    },
    aaron_flater: {
      pid: 'aaron_flater',
      name: 'Aaron W. Flater',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-10',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/aaron-w-flater.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Spencer Cox', when: '2022-10' }
      ]
    },
    annette_jan: {
      pid: 'annette_jan',
      name: 'Annette Jan',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2020-03',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/annette-jan.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Gary Herbert', when: '2020-03' }
      ]
    },
    david_johnson: {
      pid: 'david_johnson',
      name: 'David L. Johnson',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022-02',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/david-l-johnson.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Spencer Cox', when: '2022-02' }
      ]
    },
    elizabeth_knight: {
      pid: 'elizabeth_knight',
      name: 'Elizabeth Knight',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2015-08',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/elizabeth-knight.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Gary Herbert', when: '2015-08' }
      ]
    },
    tupakk_renteria: {
      pid: 'tupakk_renteria',
      name: 'Tupakk A.G. Renteria',
      court: 'juvenile',
      role: 'Judge',
      district: 3,
      area: 'Third Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/third-district-juvenile-court/tupakk-a-g-renteria.html',
      history: [],
      record: [
        { what: 'Appointed to the Third District Juvenile Court', by: 'Gary Herbert', when: '2014-01' }
      ]
    },
    ryan_peters: {
      pid: 'ryan_peters',
      name: 'Ryan Peters',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2023-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/ryan-peters.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Spencer Cox', when: '2023-10' }
      ]
    },
    jared_anderson: {
      pid: 'jared_anderson',
      name: 'Jared Anderson',
      court: 'juvenile',
      role: 'Associate Presiding Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-10',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/jared-anderson.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Spencer Cox', when: '2024-10' }
      ]
    },
    brent_bartholomew: {
      pid: 'brent_bartholomew',
      name: 'Brent H. Bartholomew',
      court: 'juvenile',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2013',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/brent-h-bartholomew.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Gary Herbert', when: '2013' }
      ]
    },
    suchada_bazzelle: {
      pid: 'suchada_bazzelle',
      name: 'Suchada P. Bazzelle',
      court: 'juvenile',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Jon Huntsman',
      appointedByPid: null,
      appointed: '2007-01',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/suchada-p-bazzelle.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Jon Huntsman', when: '2007-01' }
      ]
    },
    douglas_nielsen: {
      pid: 'douglas_nielsen',
      name: 'Douglas Nielsen',
      court: 'juvenile',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2013-01',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/douglas-nielsen.html',
      // Two official sources place this judge on different courts. The row
      // follows the state courts directory for the seat and prints the
      // Lieutenant Governor's question verbatim, because that question IS the
      // ballot text. PolitiDex does not pick a winner between two official
      // sources; it names both.
      slateConflict: 'The Lieutenant Governor\'s 2026 filing names this seat as District Court of the Fourth Judicial District. The state courts directory lists the judge on the Fourth District Juvenile Court. Both are official; PolitiDex names the conflict and does not resolve it. The judicial district — and so the counties that vote on the question — is the same either way.',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Gary Herbert', when: '2013-01' }
      ]
    },
    ryan_petersen: {
      pid: 'ryan_petersen',
      name: 'Ryan D. Petersen',
      court: 'juvenile',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/ryan-d-petersen.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Spencer Cox', when: '2024-12' }
      ]
    },
    richards_smith: {
      pid: 'richards_smith',
      name: 'F. Richards Smith III',
      court: 'juvenile',
      role: 'Judge',
      district: 4,
      area: 'Fourth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2012-11',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fourth-district-juvenile-court/f-richards-smith.html',
      history: [],
      record: [
        { what: 'Appointed to the Fourth District Juvenile Court', by: 'Gary Herbert', when: '2012-11' }
      ]
    },
    michael_leavitt: {
      pid: 'michael_leavitt',
      name: 'Michael Leavitt',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2014',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fifth-district-juvenile-court/michael-leavitt.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Juvenile Court', by: 'Gary Herbert', when: '2014' }
      ]
    },
    troy_little: {
      pid: 'troy_little',
      name: 'Troy A. Little',
      court: 'juvenile',
      role: 'Associate Presiding Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2018-02',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fifth-district-juvenile-court/troy-a-little.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Juvenile Court', by: 'Gary Herbert', when: '2018-02' }
      ]
    },
    angela_adams_mackay: {
      pid: 'angela_adams_mackay',
      name: 'Angela Adams MacKay',
      court: 'juvenile',
      role: 'Judge',
      district: 5,
      area: 'Fifth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/fifth-district-juvenile-court/angela-adams-mackay.html',
      history: [],
      record: [
        { what: 'Appointed to the Fifth District Juvenile Court', by: 'Spencer Cox', when: '2024' }
      ]
    },
    brody_keisel: {
      pid: 'brody_keisel',
      name: 'Brody L. Keisel',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 6,
      area: 'Sixth Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2017-12',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/sixth-district-juvenile-court/brody-l-keisel.html',
      history: [],
      record: [
        { what: 'Appointed to the Sixth District Juvenile Court', by: 'Gary Herbert', when: '2017-12' }
      ]
    },
    alex_goble: {
      pid: 'alex_goble',
      name: 'Alex Goble',
      court: 'juvenile',
      role: 'Associate Presiding Judge',
      district: 6,
      area: 'Sixth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2022',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/sixth-district-juvenile-court/alex-goble.html',
      history: [],
      record: [
        { what: 'Appointed to the Sixth District Juvenile Court', by: 'Spencer Cox', when: '2022' }
      ]
    },
    craig_bunnell: {
      pid: 'craig_bunnell',
      name: 'Craig M. Bunnell',
      court: 'juvenile',
      role: 'Presiding Judge',
      district: 7,
      area: 'Seventh Judicial District',
      appointedBy: 'Gary Herbert',
      appointedByPid: null,
      appointed: '2016-07',
      confirmed: null,
      retention: '2026-11-03',
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/seventh-district-juvenile-court/craig-m-bunnell.html',
      history: [],
      record: [
        { what: 'Appointed to the Seventh District Juvenile Court', by: 'Gary Herbert', when: '2016-07' }
      ]
    },
    cas_melanson_white: {
      pid: 'cas_melanson_white',
      name: 'Cas Melanson White',
      court: 'juvenile',
      role: 'Judge',
      district: 7,
      area: 'Seventh Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2024-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/seventh-district-juvenile-court/cas-melanson-white.html',
      history: [],
      record: [
        { what: 'Appointed to the Seventh District Juvenile Court', by: 'Spencer Cox', when: '2024-05' }
      ]
    },
    jordan_van_oostendorp: {
      pid: 'jordan_van_oostendorp',
      name: 'Jordan Van Oostendorp',
      court: 'juvenile',
      role: 'Judge',
      district: 8,
      area: 'Eighth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2025',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/eighth-district-juvenile-court/judge-jordan-van-oostendorp.html',
      history: [],
      record: [
        { what: 'Appointed to the Eighth District Juvenile Court', by: 'Spencer Cox', when: '2025' }
      ]
    },
    jeffry_ross: {
      pid: 'jeffry_ross',
      name: 'Jeffry Ross',
      court: 'juvenile',
      role: 'Judge',
      district: 8,
      area: 'Eighth Judicial District',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2021-05',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios/juvenile-courts/eighth-district-juvenile-court/jeffery-ross.html',
      history: [],
      record: [
        { what: 'Appointed to the Eighth District Juvenile Court', by: 'Spencer Cox', when: '2021-05' }
      ]
    },
    // ── Rows no reachable official source lists ──────────────────────────
    // Both rows below carry `seated: false` or `former: true`, no retention
    // date, and therefore never reach a ballot row. They survive because the
    // record of a seat changing hands is worth keeping for a reader who
    // arrives from an older list — and because deleting a row is a claim too.
    michael_menssen: {
      pid: 'michael_menssen',
      name: 'Michael Menssen',
      court: 'supreme',
      role: 'Appointee',
      district: null,
      area: '',
      appointedBy: 'Spencer Cox',
      appointedByPid: 'cox',
      appointed: '2026-08-28',
      confirmed: null,
      retention: null,
      jpec: null,
      bio: '',
      seated: false,
      // The page this appointment was read from is no longer reachable
      // (judges.utah.gov now answers 401 on every report path), and no roster
      // on utcourts.gov lists the name. The row states what it is: an
      // appointment with no confirmation on file and no live source.
      sourceNote: 'Appointment read from a source that is no longer reachable. Senate confirmation not on file.',
      history: [],
      record: [{ what: 'Appointed to the Utah Supreme Court; Senate confirmation not on file', by: 'Spencer Cox', when: '2026-08-28' }]
    },
    diana_hagen: {
      pid: 'diana_hagen',
      name: 'Diana Hagen',
      court: 'supreme',
      role: 'Justice',
      district: null,
      area: '',
      appointedBy: null,
      appointedByPid: null,
      appointed: null,
      confirmed: null,
      retention: null,
      jpec: null,
      bio: '',
      former: true,
      left: '2026-05',
      // The one sentence a reader arriving from a stale 2026 retention list
      // needs. It states what changed, not what it means.
      leftNote: 'Was listed to stand for retention in November 2026. Left the court in May 2026 and does not stand for retention.',
      history: [],
      record: []
    }
  };

  // ── Slates: what is on a given year's ballot, per court ─────────────────
  // Seated is not the same as standing. This structure is the ONLY place that
  // says who is on the November 3, 2026 ballot, and it says it by naming the
  // Lieutenant Governor's filed question verbatim — the retention question is
  // not a sentence PolitiDex composes, it is a sentence the state files.
  //
  // `certified: true` says the official list is on file. It travels with the
  // rows everywhere, so a caller cannot read them without also being handed
  // the provenance. `asOf` is the list's own "last updated" date.
  //
  // A court absent from this structure has no 2026 rows, and that is a
  // statement about the list, not about the court.
  var SLATES = {
    2026: {
      supreme: {
        year: 2026,
        date: '2026-11-03',
        certified: true,
        source: 'https://vote.utah.gov/2026-candidate-filings/',
        sourceName: 'Utah Lieutenant Governor — 2026 candidate filings, State Judicial',
        asOf: '2026-08-31',
        pids: ['jill_pohlman'],
        questions: [
          {
            pid: 'jill_pohlman',
            district: null,
            filedCourt: 'supreme',
            filedOffice: 'Justice of the Supreme Court of Utah',
            question: 'Shall Jill M. Pohlman be retained in the office of Justice of the Supreme Court of Utah?',
            status: 'Election Candidate'
          }
        ]
      },
      appeals: {
        year: 2026,
        date: '2026-11-03',
        certified: true,
        source: 'https://vote.utah.gov/2026-candidate-filings/',
        sourceName: 'Utah Lieutenant Governor — 2026 candidate filings, State Judicial',
        asOf: '2026-08-31',
        pids: ['michele_christiansen_forster', 'ryan_harris', 'john_luthy', 'david_mortensen', 'amy_oliver', 'gregory_orme'],
        questions: [
          {
            pid: 'michele_christiansen_forster',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall Michele M. Christiansen Forster be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          },
          {
            pid: 'ryan_harris',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall Ryan M. Harris be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          },
          {
            pid: 'john_luthy',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall John David Luthy be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          },
          {
            pid: 'david_mortensen',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall David Ned Mortensen be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          },
          {
            pid: 'amy_oliver',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall Amy Jo Oliver be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          },
          {
            pid: 'gregory_orme',
            district: null,
            filedCourt: 'appeals',
            filedOffice: 'Judge of the Court of Appeals of Utah',
            question: 'Shall Gregory Keith Orme be retained in the office of Judge of the Court of Appeals of Utah?',
            status: 'Election Candidate'
          }
        ]
      },
      district: {
        year: 2026,
        date: '2026-11-03',
        certified: true,
        source: 'https://vote.utah.gov/2026-candidate-filings/',
        sourceName: 'Utah Lieutenant Governor — 2026 candidate filings, State Judicial',
        asOf: '2026-08-31',
        pids: ['jason_nelson', 'blaine_rawson', 'jennifer_valencia', 'matthew_bates', 'coral_sanchez', 'todd_shaughnessy', 'charles_stormont', 'jared_eldridge', 'anthony_howell', 'thomas_low', 'kraig_powell', 'matthew_bell', 'eric_gentry', 'jay_winward', 'mandy_larsen'],
        questions: [
          {
            pid: 'jason_nelson',
            district: 2,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Second Judicial District',
            question: 'Shall Jason Craig Nelson be retained in the office of Judge of the District Court of the Second Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'blaine_rawson',
            district: 2,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Second Judicial District',
            question: 'Shall Eldred Blaine Rawson be retained in the office of Judge of the District Court of the Second Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'jennifer_valencia',
            district: 2,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Second Judicial District',
            question: 'Shall Jennifer Lyn Valencia be retained in the office of Judge of the District Court of the Second Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'matthew_bates',
            district: 3,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Third Judicial District',
            question: 'Shall Matthew David Bates be retained in the office of Judge of the District Court of the Third Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'coral_sanchez',
            district: 3,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Third Judicial District',
            question: 'Shall Coral Sanchez be retained in the office of Judge of the District Court of the Third Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'todd_shaughnessy',
            district: 3,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Third Judicial District',
            question: 'Shall Todd Shaughnessy be retained in the office of Judge of the District Court of the Third Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'charles_stormont',
            district: 3,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Third Judicial District',
            question: 'Shall Charles A. Stormont be retained in the office of Judge of the District Court of the Third Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'jared_eldridge',
            district: 4,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fourth Judicial District',
            question: 'Shall Jared William Eldridge be retained in the office of Judge of the District Court of the Fourth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'anthony_howell',
            district: 4,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fourth Judicial District',
            question: 'Shall Anthony Leonard Howell be retained in the office of Judge of the District Court of the Fourth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'thomas_low',
            district: 4,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fourth Judicial District',
            question: 'Shall Thomas Low be retained in the office of Judge of the District Court of the Fourth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'kraig_powell',
            district: 4,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fourth Judicial District',
            question: 'Shall Kraig Powell be retained in the office of Judge of the District Court of the Fourth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'matthew_bell',
            district: 5,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fifth Judicial District',
            question: 'Shall Matthew L. Bell be retained in the office of Judge of the District Court of the Fifth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'eric_gentry',
            district: 5,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fifth Judicial District',
            question: 'Shall Eric Russell Gentry be retained in the office of Judge of the District Court of the Fifth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'jay_winward',
            district: 5,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Fifth Judicial District',
            question: 'Shall Jay Winward be retained in the office of Judge of the District Court of the Fifth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'mandy_larsen',
            district: 6,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the Sixth Judicial District',
            question: 'Shall Mandy Sue Larsen be retained in the office of Judge of the District Court of the Sixth Judicial District?',
            status: 'Election Candidate'
          }
        ]
      },
      juvenile: {
        year: 2026,
        date: '2026-11-03',
        certified: true,
        source: 'https://vote.utah.gov/2026-candidate-filings/',
        sourceName: 'Utah Lieutenant Governor — 2026 candidate filings, State Judicial',
        asOf: '2026-08-31',
        pids: ['kirk_morgan', 'robert_neill', 'jeffrey_noland', 'rick_westmoreland', 'steven_beck', 'susan_eisenman', 'aaron_flater', 'douglas_nielsen', 'alex_goble', 'craig_bunnell'],
        questions: [
          {
            pid: 'kirk_morgan',
            district: 1,
            filedCourt: 'district',
            filedOffice: 'Judge of the District Court of the First Judicial District',
            question: 'Shall Kirk Max Morgan be retained in the office of Judge of the District Court of the First Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'robert_neill',
            district: 2,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Second Juvenile Court District',
            question: 'Shall Robert Garrett Neill be retained in the office of Judge of the Juvenile Court of the Second Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'jeffrey_noland',
            district: 2,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Second Juvenile Court District',
            question: 'Shall Jeffrey J. Noland be retained in the office of Judge of the Juvenile Court of the Second Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'rick_westmoreland',
            district: 2,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Second Juvenile Court District',
            question: 'Shall Rick Westmoreland be retained in the office of Judge of the Juvenile Court of the Second Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'steven_beck',
            district: 3,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Third Juvenile Court District',
            question: 'Shall Steven K. Beck be retained in the office of Judge of the Juvenile Court of the Third Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'susan_eisenman',
            district: 3,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Third Juvenile Courtl District',
            question: 'Shall Susan Heather Eisenman be retained in the office of Judge of the Juvenile Court of the Third Juvenile Courtl District?',
            status: 'Election Candidate'
          },
          {
            pid: 'aaron_flater',
            district: 3,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Third Juvenile Court District',
            question: 'Shall Aaron William Flater be retained in the office of Judge of the Juvenile Court of the Third Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'douglas_nielsen',
            district: 4,
            filedCourt: 'district',
            filedOffice: 'Judge of the Distirct Court of the Fourth Judicial District',
            question: 'Shall Douglas John Nielsen be retained in the office of Judge of the Distirct Court of the Fourth Judicial District?',
            status: 'Election Candidate'
          },
          {
            pid: 'alex_goble',
            district: 6,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Sixth Juvenile Court District',
            question: 'Shall Alex Goble be retained in the office of Judge of the Juvenile Court of the Sixth Juvenile Court District?',
            status: 'Election Candidate'
          },
          {
            pid: 'craig_bunnell',
            district: 7,
            filedCourt: 'juvenile',
            filedOffice: 'Judge of the Juvenile Court of the Seventh Juvenile Court District',
            question: 'Shall Craig Miles Bunnell be retained in the office of Judge of the Juvenile Court of the Seventh Juvenile Court District?',
            status: 'Election Candidate'
          }
        ]
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

  // ── The sources, named once ─────────────────────────────────────────────
  // Every surface that cites where the roster, the slate or the map came from
  // cites it from here. A URL typed twice is a URL that can rot in one place
  // and not the other.
  var SOURCES = {
    roster: {
      name: 'Utah State Courts — judges biographies',
      url: 'https://www.utcourts.gov/en/courts/other-court-info/judges-bios.html'
    },
    slate: {
      name: 'Utah Lieutenant Governor — 2026 candidate filings',
      url: 'https://vote.utah.gov/2026-candidate-filings/',
      asOf: '2026-08-31'
    },
    districts: {
      name: 'Utah Code § 78A-1-102 — Trial courts of record, geographical divisions',
      url: 'https://le.utah.gov/xcode/Title78A/Chapter1/78A-1-S102.html'
    }
  };

  window.PDX_JUDICIAL = {
    STATE: 'Utah',
    JPEC_URL: 'https://judges.utah.gov',
    JPEC_NAME: 'Judicial Performance Evaluation Commission',
    COURTS: COURTS,
    DISTRICTS: DISTRICTS,
    JUDGES: JUDGES,
    SLATES: SLATES,
    PUBLIC: PUBLIC,
    SOURCES: SOURCES
  };
})();
