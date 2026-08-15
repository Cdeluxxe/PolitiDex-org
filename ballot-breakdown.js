// ─────────────────────────────────────────────────────────────────────────────
// Your 2026 Ballot Breakdown / My Team slate
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 46917 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  // YOUR 2026 BALLOT BREAKDOWN — Build Your "My Team" Slate
  // ════════════════════════════════════════════════════════════
  (function() {
    var BALLOT_KEY = 'politidex_my_team';

    function _generateBallotRaces() {
      var state = (window._hasUserLocation && window._currentVoterLocation && window._currentVoterLocation.state) || '';
      var county = window._vhCurrentCounty || '';
      var data = (window._vhCountyData || {})[county] || { city:'', county:'', usDistrict:'', usDistrictLabel:'', usDistrictDesc:'' };
      
      var positions = window.TEAM_POSITIONS || [
        { key: 'senate', label: 'U.S. Senate', icon: '\u{1F3DB}', color: '#818cf8' },
        { key: 'house', label: 'U.S. House', icon: '\u{1F3DB}', color: '#60a5fa' },
        { key: 'governor', label: 'Governor', icon: '\u{1F985}', color: '#34d399' },
        { key: 'statesenate', label: 'State Senate', icon: '\u{1F3DB}', color: '#a78bfa' },
        { key: 'statehouse', label: 'State House Rep', icon: '\u{1F3DB}', color: '#2dd4bf' },
        { key: 'local', label: 'Local Office', icon: '\u{1F3D9}', color: '#fbbf24' }
      ];

      return positions.map(function(pos) {
        var desc = '';
        var edu = '';
        
        var isUtah = (state === 'Utah');
        var stateName = state || 'your state';
        
        if (pos.key === 'senate') {
          desc = stateName + '\'s two U.S. Senators';
          edu = stateName + '\'s two U.S. Senators serve 6-year terms and shape federal law, confirm Supreme Court justices, approve treaties, and vote on the federal budget. They represent the entire state.';
        } else if (pos.key === 'house') {
          var distLabel = isUtah ? data.usDistrictLabel : (window._currentVoterLocation && window._currentVoterLocation.district ? 'District ' + window._currentVoterLocation.district : 'Your Congressional District');
          var distDesc = isUtah ? data.usDistrictDesc : 'your local area';
          desc = 'Your congressional district';
          edu = 'Your House Representative is your direct voice in Congress for ' + distDesc + '. They vote on spending bills, taxes, and federal programs. Each district has one representative serving 2-year terms.';
        } else if (pos.key === 'governor') {
          desc = stateName + '\'s chief executive';
          edu = stateName + '\'s Governor signs or vetoes state laws, sets the state budget, leads emergency response, and appoints judges and agency heads.';
        } else if (pos.key === 'statesenate') {
          desc = isUtah ? data.county : 'State Senate District';
          edu = 'Your State Senator represents your district in the state capitol. They write and vote on laws affecting state taxes, schools, water rights, land use, and criminal justice.';
        } else if (pos.key === 'statehouse') {
          desc = isUtah ? data.county + ' · ' + data.city + ' area' : 'State House District';
          edu = 'Your State House Representative is your closest state-level voice. They handle issues like school funding, zoning, road projects, and community services.';
        } else if (pos.key === 'local') {
          desc = 'Local positions';
          edu = 'Your local officials make decisions closest to your daily life — property taxes, zoning, parks, roads, police staffing, and local services. These positions often have the most direct impact on your neighborhood.';
        } else {
          desc = pos.label;
          edu = 'Your representative for ' + pos.label + '.';
        }

        return {
          key: pos.key,
          label: pos.key === 'house' && isUtah ? 'U.S. House (' + data.usDistrictLabel + ')' : pos.label,
          icon: pos.icon || '\u{1F3DB}',
          color: pos.color || '#9fb4d4',
          desc: desc,
          edu: edu
        };
      });
    }

    var BALLOT_RACES = _generateBallotRaces();

    window._countyTerms = {
      davis:['davis','layton','clearfield','bountiful','kaysville','farmington','centerville','syracuse','district 17','district 6','district 16'],
      slc:['salt lake','murray','draper','sandy','south jordan','riverton','herriman','west valley','west jordan','midvale','cottonwood','holladay','millcreek','taylorsville','district 2','district 1','district 9','district 23','district 26','district 39','district 42','kearns','west slc'],
      utah_co:['utah county','provo','orem','spanish fork','lehi','american fork','pleasant grove','springville','payson','eagle mountain','saratoga springs','district 16','district 15','district 60','district 64','district 13'],
      weber:['weber','ogden','roy','north ogden','south ogden','riverdale'],
      washington:['washington county','st. george','st george','hurricane','ivins','santa clara','district 29','district 72'],
      cache:['cache','logan','north logan','smithfield','hyrum','providence','district 1','district 3'],
      iron:['iron county','cedar city','parowan','enoch','district 28','district 71'],
      box_elder:['box elder','brigham city','tremonton','perry','willard','district 1'],
      summit:['summit','park city','coalville','district 65','district 68'],
      tooele:['tooele','grantsville','stansbury','district 67','district 68'],
      wasatch:['wasatch','heber','midway','heber city','district 68','district 65']
    };

    function _pidMatchesCounty(pid, county) {
      if (!county) return false;
      var btn = document.getElementById('pmc-' + pid);
      if (btn) {
        var card = btn.closest('.pm-card[data-county]');
        if (card) {
          var cc = card.dataset.county;
          return (cc === county || cc === 'all_ut' || cc === 'all');
        }
      }
      if (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) {
        var st = (CMP_DATA[pid].state || '').toLowerCase();
        var terms = _countyTerms[county] || [];
        for (var i = 0; i < terms.length; i++) {
          if (st.indexOf(terms[i]) !== -1) return true;
        }
      }
      return false;
    }

    // Map the saved voter location to one of the county-term keys used by
    // _countyTerms / _pidMatchesCounty. window._vhCurrentCounty was never actually
    // populated, so local/county races resolved against an empty key and fell back
    // to whatever politician text happened to contain a stray "District N" — which
    // is why only Salt Lake's "District 2" ever surfaced for every voter.
    function _ballotCountyKey() {
      var loc = window._currentVoterLocation || {};
      var c = ((loc.county || loc.city || '') + '').toLowerCase();
      var byName = [
        ['salt lake', 'slc'], ['davis', 'davis'], ['weber', 'weber'], ['utah', 'utah_co'],
        ['washington', 'washington'], ['cache', 'cache'], ['iron', 'iron'],
        ['box elder', 'box_elder'], ['summit', 'summit'], ['tooele', 'tooele'], ['wasatch', 'wasatch']
      ];
      for (var i = 0; i < byName.length; i++) { if (c.indexOf(byName[i][0]) !== -1) return byName[i][1]; }
      // City-only saves (no county string) still resolve via the Key Races inferer,
      // which knows every incorporated Utah town; map its area id to a county key.
      var idToKey = {
        slc:'slc', west_valley:'slc', west_jordan:'slc', south_jordan:'slc', sandy:'slc',
        davis:'davis', clearfield:'davis', weber:'weber', south_ogden:'weber',
        utah_co:'utah_co', orem:'utah_co', lehi:'utah_co', south_utah_co:'utah_co',
        tooele:'tooele', box_elder:'box_elder', cache:'cache', summit:'summit',
        wasatch:'wasatch', cedar_city:'iron', washington:'washington'
      };
      try {
        var id = (typeof window._krInferLocation === 'function') ? window._krInferLocation() : '';
        if (id && idToKey[id]) return idToKey[id];
      } catch (e) {}
      return '';
    }

    // ── ONE LIVE SCORE FOR EVERY CARD THIS FILE DRAWS ─────────────────────────
    // The all-time Direction Match, computed now, from the same read the profile
    // hero renders — never the stored `p.score`. `p.score` is the retired Promise
    // percentage: it is a value written into the record at some point in the past
    // and never recomputed, which is exactly how a preview card came to advertise
    // 85% over a profile that read 73%.
    //
    // Routed through window._pdxLedgerSlot (compare-hub.js) rather than calling
    // PDXWordAction directly, so this file cannot become a second opinion on when
    // a number is publishable: the slot owns the fail-closed floor and returns
    // `pct: null` on every branch that has no live figure, along with the prose
    // saying why. If compare-hub has not loaded, this returns the same null shape
    // — a missing number, not an old one.
    function _liveDirectionMatch(pid, d) {
      try {
        if (typeof window._pdxLedgerSlot === 'function') {
          var status = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
          var s = window._pdxLedgerSlot(d, { pid: pid, status: status });
          if (s) return { pct: (typeof s.pct === 'number') ? s.pct : null, sub: s.sub || '' };
        }
      } catch (e) {}
      return { pct: null, sub: '' };
    }

    function _ballotCandidates(raceKey) {
      if (typeof CMP_DATA === 'undefined') return [];
      var userState = (window._hasUserLocation && window._currentVoterLocation && window._currentVoterLocation.state) || '';
      var userDistrict = (window._hasUserLocation && window._currentVoterLocation && window._currentVoterLocation.district) || '';
      var county = _ballotCountyKey();

      // Authoritative, location-specific roster for the three district seats the
      // voter actually votes in (U.S. House · State Senate · State House).
      // _pdxVoterBallot reads the exact districts the voter pinpointed on the map
      // (falling back to their curated area) and resolves each seat's incumbent +
      // challengers by id, so the state-legislature races match the voter's REAL
      // districts instead of a coarse county text-scan.
      var _vb = null;
      try { if (userState === 'Utah' && typeof window._pdxVoterBallot === 'function') _vb = window._pdxVoterBallot(); } catch (e) {}
      function _seatHas(gk, pid) {
        return !!(_vb && _vb.byOffice && _vb.byOffice[gk] && _vb.byOffice[gk].pids && _vb.byOffice[gk].pids.indexOf(pid) !== -1);
      }

      var stateMap = {
        'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
        'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
        'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
        'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
        'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
        'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
        'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh',
        'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
        'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
        'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy'
      };

      // Find reverse mapping as well
      var revStateMap = {};
      for (var k in stateMap) { revStateMap[stateMap[k]] = k; }

      var results = [];
      var pids = Object.keys(CMP_DATA);
      pids.forEach(function(pid) {
        var d = CMP_DATA[pid];
        if (!d) return;
        var o = (d.office || '').toLowerCase();
        
        var polStateBase = (d.state || '').trim();
        if (polStateBase.includes(' · ')) {
          polStateBase = polStateBase.split(' · ')[0];
        } else if (polStateBase.includes(' - ')) {
          polStateBase = polStateBase.split(' - ')[0];
        } else if (polStateBase.includes('-')) {
          polStateBase = polStateBase.split('-')[0];
        }
        polStateBase = polStateBase.toLowerCase();
        var polStateName = revStateMap[polStateBase] || polStateBase;

        var match = false;
        
        // For other positions defined in TEAM_POSITIONS, let's match by keywords
        if (raceKey === 'president') {
          match = /president/i.test(o) && !/state/i.test(o);
        } else if (raceKey === 'secretaryofstate' || raceKey === 'secstate') {
          match = /secretary\s*of\s*state/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
        } else if (raceKey === 'attorneygeneral') {
          match = /attorney\s*general/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
        } else if (raceKey === 'chiefjustice') {
          match = /justice/i.test(o);
        } else if (raceKey === 'defense') {
          match = /defense/i.test(o);
        } else if (raceKey === 'intel') {
          match = /intelligence/i.test(o) || /intel/i.test(o);
        } else if (raceKey === 'ltgovernor') {
          match = (/lt\.\s*governor|lieutenant\s*governor/i.test(o)) && polStateName.toLowerCase() === userState.toLowerCase();
        } else if (raceKey === 'senate') {
          match = (/u\.s\.\s*senator|^senator/i.test(o)) && !/state/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
        } else if (raceKey === 'house') {
          // The U.S. House seat is district-specific, so it must resolve through
          // the SAME authoritative, map-aware ballot the State Senate / State House
          // seats below use — never a lone re-parse of the mutable `state` string.
          // The old inline parser only recognised a "UT-2" style code and read
          // nothing else, so a real rep whose record carries a bare "District 2"
          // (e.g. Celeste Maloy) never matched and the builder's Congress seat
          // collapsed to an empty / wrong field. _pdxVoterBallot reads the exact
          // district the voter pinpointed on the map (falling back to their curated
          // area) and returns that seat's roster by id, so the builder now shows the
          // voter's true congressman. Non-curated states keep the string matcher.
          if (userState === 'Utah') {
            match = _vb ? _seatHas('representative', pid)
                        : ((/u\.s\.\s*rep|^representative/i.test(o) || /house\s*(rep|cand)/i.test(o)) && !/state/i.test(o) && !/house\s*speaker/i.test(o)
                           && polStateName.toLowerCase() === userState.toLowerCase());
          } else {
            var isHouse = (/u\.s\.\s*rep|^representative/i.test(o) || /house\s*(rep|cand)/i.test(o)) && !/state/i.test(o) && !/house\s*speaker/i.test(o);
            if (isHouse) {
              var stateMatch = polStateName.toLowerCase() === userState.toLowerCase();
              var distMatch = true;
              if (userDistrict) {
                var polDistNum = '';
                if (d.state && d.state.includes('-')) {
                  polDistNum = d.state.split('-')[1].replace(/[^0-9]/g, '');
                }
                var userDistNum = userDistrict.replace(/[^0-9]/g, '');
                if (userDistNum && polDistNum) {
                  distMatch = (parseInt(userDistNum) === parseInt(polDistNum));
                }
              }
              match = stateMatch && distMatch;
            }
          }
        } else if (raceKey === 'governor') {
          // "governor" must NOT swallow the Lieutenant Governor: her office string
          // ("Lieutenant Governor of Utah") contains the word "governor", so the
          // old test matched Deidre Henderson into the Governor slot — and because
          // the field is sorted by score she could outrank Spencer Cox and become
          // the seat's shown officeholder. Excluding lieutenant/lt. gov keeps the
          // Governor slot resolving to the actual Governor.
          match = /governor/i.test(o) && !/lieutenant|lt\.?\s*gov/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
        } else if (raceKey === 'statesenate') {
          if (userState === 'Utah') {
            // Prefer the voter's exact State Senate district roster; fall back to a
            // county scan only when the ballot resolver has no data ready yet.
            match = _vb ? _seatHas('state_senator', pid)
                        : (/senate\s*president|state\s*sen|utah\s*sen/i.test(o) && _pidMatchesCounty(pid, county));
          } else {
            match = (/state\s*sen|senator/i.test(o)) && /state/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
          }
        } else if (raceKey === 'statehouse') {
          if (userState === 'Utah') {
            match = _vb ? _seatHas('state_rep', pid)
                        : ((/state\s*rep|ut\s*state\s*rep|house\s*speaker/i.test(o)) && _pidMatchesCounty(pid, county));
          } else {
            match = (/state\s*rep|representative/i.test(o)) && /state/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
          }
        } else if (raceKey === 'local') {
          if (userState === 'Utah') {
            match = /mayor|county\s*(commis|council)|city\s*council|local|county\s*mayor|auditor/i.test(o) && _pidMatchesCounty(pid, county);
          } else {
            match = /mayor|county|city\s*council|local|auditor/i.test(o) && polStateName.toLowerCase() === userState.toLowerCase();
          }
        }

        if (match) {
          results.push({ pid: pid, name: d.name, office: d.office,
                         score: _liveDirectionMatch(pid, d).pct, icon: d.icon });
        }
      });
      results.sort(function(a, b) {
        var sa = a.score !== null && a.score !== undefined ? a.score : -1;
        var sb = b.score !== null && b.score !== undefined ? b.score : -1;
        return sb - sa;
      });
      return results;
    }
    // Exposed so the builder grid (a different <script> closure) can preview the
    // real field — the sitting officeholder and who's running — inside an
    // otherwise-empty seat card instead of a blank "Open Seat" placeholder.
    window._ballotCandidates = _ballotCandidates;

    // Read-only accessor so a SEPARATE script file (your-ballot.js — the unified
    // "Your Ballot" flow) can look up a candidate's full record. CMP_DATA is a
    // script-scoped const, invisible across <script> boundaries; this exposes the
    // few fields that surface (party chip, office) without leaking the whole store
    // or letting another surface mutate it. Returns null for unknown ids.
    window._pdxBallotRecord = function (pid) {
      try { return (typeof CMP_DATA !== 'undefined' && pid && CMP_DATA[pid]) ? CMP_DATA[pid] : null; }
      catch (e) { return null; }
    };

    function _ballotLoad() {
      // Route through PDXStore (see foundation module up top) so this can be
      // account-synced later; identical 'politidex_my_team' key + JSON shape.
      if (window.PDXStore) { var v = window.PDXStore.read(BALLOT_KEY, {}); return (v && typeof v === 'object') ? v : {}; }
      try {
        var saved = localStorage.getItem(BALLOT_KEY);
        if (saved) return JSON.parse(saved);
      } catch(e) {}
      return {};
    }

    // ── Saved-team data model ────────────────────────────────────────────
    // Teams now live as individual documents in a per-user subcollection:
    //
    //   userTeams/{uid}/teams/{teamId}
    //
    // Each team document is self-describing so we can support multiple saved
    // teams, a designated main team, optional names, and (later) sharing —
    // without another migration. The parent userTeams/{uid} doc keeps a
    // `mainTeamId` pointer plus the legacy flat `team` array so older code
    // paths and accounts keep working untouched.
    var TEAM_SCHEMA_VERSION = 2;
    var DEFAULT_TEAM_ID = 'main';
    // Expose so the load path (in a separate IIFE) can agree on the same ids.
    window.PDX_TEAM_SCHEMA_VERSION = TEAM_SCHEMA_VERSION;
    window.PDX_DEFAULT_TEAM_ID = DEFAULT_TEAM_ID;

    // Build the rich, future-proof team record. `slots` is the authoritative
    // keyed ballot map ({ raceKey: pid }); `members` is a convenience flat list.
    function _buildTeamRecord(user, selections, extra) {
      var members = [];
      for (var k in selections) { if (selections[k]) members.push(selections[k]); }
      var rec = {
        schemaVersion: TEAM_SCHEMA_VERSION,
        // Naming UI isn't enabled yet, but the field exists so a team can be
        // named later with zero data changes. Preserve any name already set.
        name: (extra && extra.name) || 'My Team',
        slots: selections,            // keyed ballot map (one pid per race)
        members: members,             // flat pid list (convenience / legacy)
        isMain: true,                 // this is the user's default/main team
        // Private by default — only the owner reads it. Future sharing flips
        // this to 'unlisted' or 'public' and populates shareId, no schema change.
        visibility: 'private',
        shareId: null,                // reserved for a future shareable-link token
        ownerUid: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      return rec;
    }

    // Persist the main team into the new subcollection structure. Done as an
    // additive write alongside the legacy save so nothing existing breaks.
    function _persistMainTeam(user, selections) {
      var teamRef = db.collection('userTeams').doc(user.uid)
                      .collection('teams').doc(DEFAULT_TEAM_ID);
      teamRef.get().then(function(snap) {
        var existing = snap.exists ? (snap.data() || {}) : {};
        var rec = _buildTeamRecord(user, selections, { name: existing.name });
        // Only stamp createdAt the first time the team document is written.
        if (!snap.exists || !existing.createdAt) {
          rec.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        teamRef.set(rec, { merge: true }).catch(function(e) {
          console.warn("Firestore save to userTeams/teams failed:", e);
        });
        // Pointer to the main team on the parent doc.
        db.collection('userTeams').doc(user.uid).set({
          mainTeamId: DEFAULT_TEAM_ID
        }, { merge: true }).catch(function(){});
      }).catch(function(e) {
        console.warn("Could not read existing team for save:", e);
      });
    }

    function _ballotSave(selections) {
      // Local write goes through PDXStore so the 'team' collection is flagged
      // dirty (needs upstream push) the moment a seat changes. Same key/shape;
      // direct-localStorage fallback preserves the local-only guarantee.
      if (window.PDXStore) { window.PDXStore.write(BALLOT_KEY, selections); }
      else { try { localStorage.setItem(BALLOT_KEY, JSON.stringify(selections)); } catch(e) {} }
      var user = typeof auth !== 'undefined' ? auth.currentUser : null;
      if (user) {
        var teamArray = [];
        for (var k in selections) {
          if (selections[k]) teamArray.push(selections[k]);
        }
        // Legacy write — kept so existing readers and older accounts still work.
        db.collection('userTeams').doc(user.uid).set({
          team: teamArray,
          schemaVersion: TEAM_SCHEMA_VERSION,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(e) {
          console.warn("Firestore save to userTeams failed:", e);
        });

        // New write — multi-team-ready subcollection record.
        _persistMainTeam(user, selections);

        if (!user.isAnonymous) {
          db.collection('users').doc(user.uid).set({
            team_ballot: selections
          }, { merge: true }).then(function() {
            _showAccountSaveToast();
          }).catch(function(e) {
            console.warn("Firestore save team_ballot failed:", e);
          });
        } else {
          _showSigninPrompt();
        }
      }
    }

    function _getPhotoUrl(pid) {
      // Single source of truth for a politician's headshot, shared by the full
      // profile hero, the medium quick-view modal and every card so all three
      // always show the SAME photo (no view ends up on a bare icon while another
      // shows a real face). Priority: an edited/live photo on the merged profile
      // (PROFILES) → a photo on the bundled static record (CMP_DATA) → the
      // curated BROWSE_PHOTOS fallback map.
      if (!pid) return '';
      var pr = (typeof window.PROFILES !== 'undefined' && window.PROFILES) ? window.PROFILES[pid] : null;
      if (pr && pr.photo && String(pr.photo).trim()) return pr.photo;
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (d && d.photo && String(d.photo).trim()) return d.photo;
      // Curated fallback headshots. BROWSE_PHOTOS is a `var` inside another
      // <script> closure, so it isn't lexically visible here — read it off the
      // window (exposed where it's defined). This guarantees cards resolve a real
      // photo immediately, even before the Firestore roster (which supplies
      // PROFILES[pid].photo) has loaded.
      if (typeof BROWSE_PHOTOS !== 'undefined' && BROWSE_PHOTOS[pid]) return BROWSE_PHOTOS[pid];
      if (typeof window !== 'undefined' && window.BROWSE_PHOTOS && window.BROWSE_PHOTOS[pid]) return window.BROWSE_PHOTOS[pid];
      return '';
    }
    window._getPhotoUrl = _getPhotoUrl;

    // The one line every ballot card prints under a name — and it is the ONE READ.
    //
    // It used to be `_bbLedgerLine()`, printing "27 kept · 8 broken". On these cards
    // that line is the only signal there is, so a pledge tally was functionally the
    // card's summary metric: a voter comparing two picks side by side was comparing
    // pledge counts, not integrity. A campaign pledge is one FORM OF "said" and it
    // is already inside ⚖️ Word vs Action — word-action.js tests it against its
    // sourced resolution exactly as it tests a floor stance — so what belongs here
    // is that verdict and nothing else. No second tally, no parallel track.
    //
    // Below the publishing floor the line states COVERAGE, never a conclusion.
    // PDXWordAction owns when a read is sayable; a card is the last place to
    // second-guess it. The pledge data and the kept/broken/pending logic are
    // untouched and still published on the profile beside their own disclosure.
    function _bbWaLine(pid, d) {
      if (!d) return 'No record yet';
      var r = null;
      try {
        var wa = window.PDXWordAction;
        if (wa && typeof wa.read === 'function') r = wa.read(pid, d);
      } catch (e) {}
      if (r && r.publishable && r.verdict && r.verdict.label) return '⚖️ ' + r.verdict.label;
      if (r && r.coverage && r.coverage.word > 0) return 'Not enough record to check yet';
      return 'No stated positions on file yet';
    }

    // RETIRED with the pledge percentage: `_scoreColor()` graded a pledge rate
    // green / amber / red. It is deleted rather than left unused because colouring
    // a slot by a rate publishes the rate, and a dead ramp is the easiest thing in
    // this file to reach for the next time someone needs "a colour for a score".
    // Word vs Action carries its own verdict colour from PDXConsistency.VERDICTS,
    // which is the only good/bad palette on this surface.

    function _renderSummaryBox(selections) {
      var grid = document.getElementById('myteam-summary-grid');
      var statsEl = document.getElementById('myteam-summary-stats');
      var summaryBox = document.getElementById('myteam-summary-box');
      var emptyPrompt = document.getElementById('myteam-empty-prompt');
      if (!grid) return;

      var filled = 0;
      // How many picks have a publishable ⚖️ Word vs Action read. This counter used
      // to be `totalScore`, accumulating RESOLVED PLEDGES across the slate and
      // printing the sum in a stat tile beside "Races Filled" — a tally, pooled
      // across six different people, in the summary band of a summary box. It is
      // replaced, not just relabelled: the honest slate-level figure is how much of
      // the ballot has a testable integrity read at all, and that is coverage in the
      // one system rather than a second score.
      var waReads = 0;
      var html = '';

      BALLOT_RACES.forEach(function(race, idx) {
        var pid = selections[race.key];
        var d = pid && typeof CMP_DATA !== 'undefined' ? CMP_DATA[pid] : null;
        if (d) {
          filled++;
          var photo = _getPhotoUrl(pid);
          var _wr = null;
          try {
            var _wa = window.PDXWordAction;
            if (_wa && typeof _wa.read === 'function') _wr = _wa.read(pid, d);
          } catch (e) {}
          if (_wr && _wr.publishable) waReads++;
          var photoHtml = photo
            ? '<div class="myteam-sum-photo"><img loading="lazy" decoding="async" src="' + photo + '" alt="' + d.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.4rem;color:#9fb4d4\\\'>' + (d.icon || '🏛') + '</div>\'"></div>'
            : '<div class="myteam-sum-photo" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:#9fb4d4;">' + (d.icon || '🏛') + '</div>';
          html += '<div class="myteam-sum-card" style="animation-delay:' + (idx * 0.06) + 's" onclick="ballotScrollToRace(\'' + race.key + '\')">' +
            photoHtml +
            '<div class="font-condensed text-xs text-steel-500 tracking-wider uppercase" style="font-size:0.58rem;margin-bottom:1px;">' + race.label + '</div>' +
            '<div class="font-display tracking-wider text-white leading-tight" style="font-size:0.78rem;margin-bottom:2px;">' + d.name + '</div>' +
            '<div class="font-condensed" style="font-size:0.55rem;color:#7596c0;margin-bottom:2px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (d.office || '') + '</div>' +
            '<div class="font-condensed" style="font-size:0.6rem;color:#9fb4d4;">' + _bbWaLine(pid, d) + '</div>' +
            '<div class="myteam-card-btns">' +
              '<button class="myteam-profile-btn" onclick="event.stopPropagation();if(typeof showProfile===\'function\')showProfile(\'' + pid + '\')" title="View Full Profile">View Full Profile →</button>' +
              '<button class="ballot-clear-btn" onclick="event.stopPropagation();ballotClearRace(\'' + race.key + '\')" title="Remove pick" style="margin-top:0;font-size:0.6rem;">&times; Remove</button>' +
            '</div>' +
          '</div>';
        } else {
          html += '<div class="myteam-sum-empty" onclick="ballotScrollToRace(\'' + race.key + '\')">' +
            '<div style="width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(30,53,96,0.25);border:2px dashed rgba(255,255,255,0.06);font-size:1.15rem;margin:0 auto 0.3rem;">' + race.icon + '</div>' +
            '<div class="font-condensed text-xs tracking-wider uppercase" style="font-size:0.58rem;color:#3d5a80;margin-bottom:1px;">' + race.label + '</div>' +
            '<div class="font-condensed" style="font-size:0.6rem;color:#2d4260;">Click to pick</div>' +
          '</div>';
        }
      });

      if (emptyPrompt) {
        if (filled === 0) {
          emptyPrompt.style.display = 'block';
          grid.style.display = 'none';
        } else {
          emptyPrompt.style.display = 'none';
          grid.style.display = '';
        }
      }
      grid.innerHTML = html;

      if (summaryBox) {
        summaryBox.classList.toggle('has-picks', filled > 0);
        summaryBox.classList.toggle('team-complete', filled === BALLOT_RACES.length);
      }

      var badge = document.getElementById('myteam-saved-badge');
      if (badge) {
        if (filled > 0) { badge.classList.add('visible'); }
        else { badge.classList.remove('visible'); }
      }

      var pct = Math.round((filled / BALLOT_RACES.length) * 100);
      var fill = document.getElementById('ballot-progress-fill');
      var label = document.getElementById('ballot-progress-label');
      if (fill) fill.style.width = pct + '%';
      if (label) label.textContent = filled + ' / ' + BALLOT_RACES.length + ' picked';

      var emptyCount = document.getElementById('myteam-empty-count');
      if (emptyCount) emptyCount.textContent = BALLOT_RACES.length + ' race' + (BALLOT_RACES.length === 1 ? '' : 's');

      if (statsEl) {
        if (filled > 0) {
          // `waReads` counts picks with a publishable ⚖️ Word vs Action read — see
          // the accumulator. The tile used to read "Pledge Receipts", summing
          // resolved pledges across the slate: a pooled tally in the summary band,
          // next to the only other number on the box, which made it read as the
          // slate's score. It states coverage in the one system instead, and is not
          // colour-graded, because coverage is neither good nor bad.
          var teamPct = Math.round((filled / BALLOT_RACES.length) * 100);
          var statsHtml = '<div class="myteam-stats-row">' +
            '<div class="myteam-stat"><div class="myteam-stat-value" style="color:#4ade80;">' + filled + '<span style="font-size:0.7em;color:#7596c0;">/' + BALLOT_RACES.length + '</span></div><div class="myteam-stat-label">Races Filled</div></div>';
          if (waReads > 0) {
            statsHtml += '<div class="myteam-stat"><div class="myteam-stat-value" style="color:#c8d7ee;">' + waReads + '<span style="font-size:0.7em;color:#7596c0;">/' + filled + '</span></div><div class="myteam-stat-label">Word vs Action Reads</div></div>';
          }
          statsHtml += '</div>' +
            '<div class="myteam-progress-wrap">' +
              '<div class="myteam-progress-track"><div class="myteam-progress-bar-fill" style="width:' + teamPct + '%;"></div></div>' +
              '<span class="myteam-progress-pct">' + teamPct + '%</span>' +
            '</div>';
          if (filled === BALLOT_RACES.length) {
            statsHtml += '<div class="myteam-complete-banner"><span style="font-size:1rem;">🎉</span> <span class="font-condensed" style="font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#4ade80;">Team Complete!</span> <span class="font-condensed" style="font-size:0.65rem;color:#7596c0;">Share your picks below</span></div>';
          }
          statsEl.innerHTML = statsHtml;
          statsEl.style.display = 'block';
        } else {
          statsEl.style.display = 'none';
        }
      }

      var shareBtn = document.getElementById('myteam-share-btn');
      if (shareBtn) {
        shareBtn.style.display = filled > 0 ? '' : 'none';
      }
      var shareTextBtn = document.getElementById('myteam-sharetext-btn');
      if (shareTextBtn) {
        shareTextBtn.style.display = filled > 0 ? '' : 'none';
      }
    }

    function _getWhyText(pid) {
      if (typeof CMP_DATA === 'undefined' || !CMP_DATA[pid]) return '';
      var d = CMP_DATA[pid];
      var issues = d.issues || [];
      if (issues.length === 0) return '';
      return issues.slice(0, 2).join(' · ');
    }

    function _renderBallotRaces(selections) {
      var container = document.getElementById('ballot-races');
      if (!container) return;
      var html = '';
      BALLOT_RACES.forEach(function(race) {
        var candidates = _ballotCandidates(race.key);
        var selectedPid = selections[race.key] || '';
        var isFilled = selectedPid && typeof CMP_DATA !== 'undefined' && CMP_DATA[selectedPid];
        html += '<div class="ballot-race-edu' + (isFilled ? ' race-filled' : '') + '" id="ballot-race-' + race.key + '">' +
          '<div class="flex items-center gap-2.5 mb-2">' +
            '<div style="width:2.25rem;height:2.25rem;border-radius:0.6rem;display:flex;align-items:center;justify-content:center;font-size:1rem;background:linear-gradient(135deg,' + race.color + '25,' + race.color + '10);border:1px solid ' + race.color + '40;flex-shrink:0;">' + race.icon + '</div>' +
            '<div class="flex-1 min-w-0">' +
              '<div class="font-display text-base tracking-wider text-white" style="line-height:1.1;">' + race.label + '</div>' +
              '<div class="font-condensed text-xs tracking-wide" style="font-size:0.65rem;color:' + race.color + ';">' + race.desc + '</div>' +
            '</div>' +
            (isFilled ? '<span class="font-condensed text-xs text-green-400 tracking-wider" style="font-size:0.7rem;">&#10003; PICKED</span>' : '<span class="font-condensed text-xs text-steel-600 tracking-wider" style="font-size:0.65rem;">&larr; Choose one</span>') +
          '</div>' +
          '<p class="ballot-race-edu-desc">' + (race.edu || '') + '</p>' +
          '<div class="ballot-cand-grid">';
        if (candidates.length === 0) {
          html += '<div class="kr-cand-empty"><span class="kr-cand-empty-ico">🗳️</span><span>No candidates are in the database for this race yet. We add them as filings are certified — check back soon, or pick from another race above.</span></div>';
        }
        candidates.forEach(function(c) {
          var isSelected = c.pid === selectedPid;
          var photo = _getPhotoUrl(c.pid);
          var whyText = _getWhyText(c.pid);
          var photoHtml = photo
            ? '<div class="ballot-cand-photo"><img loading="lazy" decoding="async" src="' + photo + '" alt="' + c.name + '" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\\'display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:0.9rem;color:#9fb4d4\\\'>' + (c.icon || '🏛') + '</div>\'"></div>'
            : '<div class="ballot-cand-photo" style="display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:#9fb4d4;">' + (c.icon || '🏛') + '</div>';
          html += '<div class="ballot-cand-card' + (isSelected ? ' cand-selected' : '') + '" onclick="ballotPickCard(\'' + race.key + '\',\'' + c.pid + '\')">' +
            photoHtml +
            '<div class="flex-1 min-w-0">' +
              '<div class="font-condensed text-xs tracking-wider text-white" style="font-size:0.72rem;line-height:1.25;">' + c.name + '</div>' +
              // The one integrity read, and this lane IS it now. A pledge reaches
              // this line only as part of that verdict, never as its own tally.
              '<div class="font-condensed" style="font-size:0.6rem;color:#9fb4d4;">' + _bbWaLine(c.pid, typeof CMP_DATA !== 'undefined' ? CMP_DATA[c.pid] : null) + '</div>' +
              (whyText ? '<div class="font-condensed ballot-cand-why">' + whyText + '</div>' : '') +
            '</div>' +
            '<div class="ballot-cand-actions">' +
              (isSelected ? '<span style="color:#4ade80;font-size:0.75rem;">&#10003;</span>' : '') +
              '<button class="ballot-profile-btn" onclick="event.stopPropagation();if(typeof showProfile===\'function\')showProfile(\'' + c.pid + '\')" title="View Full Profile">Profile →</button>' +
            '</div>' +
          '</div>';
        });
        html += '</div></div>';
      });
      container.innerHTML = html;
    }

    function _ballotRender() {
      var selections = _ballotLoad();
      _renderSummaryBox(selections);
      _renderBallotRaces(selections);
      if (typeof _renderSavedTeams === 'function') _renderSavedTeams();
      if (typeof window._mypolBuildGrid === 'function') window._mypolBuildGrid();
    }
    window._ballotRender = _ballotRender;
    // Expose the canonical ballot store (the keyed `politidex_my_team` map) so the
    // add paths that live in EARLIER script blocks — the browse "Add to My Team"
    // button, the profile-modal CTA, mypolToggle / mypolToggleAnimated, the toast
    // "what to add next" calculation, and the persistent team-counter dock — can
    // actually read and write a real ballot slot. These were referenced as
    // window._ballotLoad / window._ballotSave throughout but never assigned, so
    // those callers silently fell back to an empty object and skipped the save:
    // the pick flipped the on-card "✓ On Team" badge (driven by the separate
    // _myPoliticians set) but never filled a seat, leaving the X/6 counter and the
    // My Voting Team grid stuck at 0 and nothing persisted across navigation.
    window._ballotLoad = _ballotLoad;
    window._ballotSave = _ballotSave;

    /* ═══════════════════════════════════════════════════════════════
       HOME VOTING BASE  ("My Home Team")
       ───────────────────────────────────────────────────────────────
       A protected, location-anchored saved team representing the voter's
       REAL representatives where they actually live. It is kept separate
       from the flexible "My Voting Team" builder (the active
       `politidex_my_team` ballot store), which now doubles as a research /
       scratch surface for exploring other districts and comparing people.

         • politidex_home_base  → { slots:{raceKey:pid}, location:{…}, savedAt }
                                   The real team. Changed only by explicit
                                   Home-Base actions (build / save / copy a
                                   pick) or — while in Home mode — by edits the
                                   voter makes to their own seats.
         • politidex_team_mode  → 'home' | 'research'
                                   View state. Drives the mode banner and
                                   whether active-team edits mirror into the
                                   Home Base.

       Changing the saved location (browsing another district) drops the
       voter into Research mode automatically, so the Home Base is never
       silently overwritten while they explore elsewhere. All access is
       guarded — a failure here can never break the team builder.
       ═══════════════════════════════════════════════════════════════ */
    var HOME_BASE_KEY = 'politidex_home_base';
    var TEAM_MODE_KEY = 'politidex_team_mode';
    // Offices that make up a Home Team — the people who represent where the
    // voter lives. 'local' now auto-builds too: a lot of the decisions voters
    // actually feel (property tax, zoning, policing, schools) are made locally,
    // so the starter team leads with the sitting mayor / county officeholder for
    // the saved county when one is on record. _homeResolveSlots still prefers a
    // sitting officeholder per seat and simply skips 'local' when the area has no
    // local record yet, so this can only add signal, never a fabricated seat.
    var HOME_AUTO_KEYS = ['senate', 'house', 'governor', 'statesenate', 'statehouse', 'local'];
    // Candidacy states that mean a person is NOT a current officeholder, so
    // auto-build skips them when a sitting representative is available.
    var _HOME_CONCLUDED = { eliminated: 1, eliminated_primary: 1, lost_primary: 1, lost: 1, withdrew: 1, withdrawn: 1, suspended: 1, conceded: 1, defeated: 1 };

    function _homeLoad() {
      if (window.PDXStore) { var o = window.PDXStore.read(HOME_BASE_KEY, null); return (o && typeof o === 'object') ? o : null; }
      try { var s = localStorage.getItem(HOME_BASE_KEY); if (s) { var o = JSON.parse(s); if (o && typeof o === 'object') return o; } } catch (e) {}
      return null;
    }
    function _homeSlots() { var h = _homeLoad(); return (h && h.slots && typeof h.slots === 'object') ? h.slots : {}; }
    function _homeFilledCount() { var s = _homeSlots(), n = 0; for (var k in s) { if (s[k]) n++; } return n; }
    function _homeHasBase() { return _homeFilledCount() > 0; }

    function _homeSnapshotLoc() {
      var l = window._currentVoterLocation || {};
      return {
        state: l.state || '', city: l.city || '', county: l.county || '',
        district: l.district || '', stateSenateDistrict: l.stateSenateDistrict || '',
        stateHouseDistrict: l.stateHouseDistrict || ''
      };
    }

    function _homeStore(slots, location) {
      var clean = {};
      for (var k in (slots || {})) { if (slots[k]) clean[k] = slots[k]; }
      var rec = { slots: clean, location: location || _homeSnapshotLoc(), savedAt: new Date().toISOString() };
      if (window.PDXStore) { window.PDXStore.write(HOME_BASE_KEY, rec); }   // marks 'team' dirty
      else { try { localStorage.setItem(HOME_BASE_KEY, JSON.stringify(rec)); } catch (e) {} }
      // Best-effort cross-device persistence for signed-in members — mirrors how
      // saveVoterLocation persists the saved location.
      try {
        if (typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous && typeof db !== 'undefined') {
          db.collection('users').doc(auth.currentUser.uid).set({ home_base: rec }, { merge: true }).catch(function () {});
        }
      } catch (e) {}
      return rec;
    }

    function _homeMode() {
      var m = window.PDXStore ? window.PDXStore.readRaw(TEAM_MODE_KEY) : null;
      if (m == null) { try { m = localStorage.getItem(TEAM_MODE_KEY); } catch (e) {} }
      if (m === 'home' || m === 'research') return m;
      return 'research';
    }
    function _homeSetMode(m, opts) {
      // Mode is a plain string flag → writeRaw. Still flags 'team' dirty so the
      // view state travels with the account later.
      if (window.PDXStore) { window.PDXStore.writeRaw(TEAM_MODE_KEY, m); }
      else { try { localStorage.setItem(TEAM_MODE_KEY, m); } catch (e) {} }
      // Mirror the view mode to the signed-in member's account so it follows them
      // across devices alongside the Home Base itself.
      try {
        if (typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous && typeof db !== 'undefined') {
          db.collection('users').doc(auth.currentUser.uid).set({ team_mode: m }, { merge: true }).catch(function () {});
        }
      } catch (e) {}
      _homeRenderBanner();
      // Repaint the grid so each slot's "Send to Home" affordance reflects the mode.
      if (!(opts && opts.skipGrid) && typeof window._mypolBuildGrid === 'function') { try { window._mypolBuildGrid(); } catch (e) {} }
    }

    function _homeIsOfficeholder(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return false;
      if (d.candidacyStatus && _HOME_CONCLUDED[String(d.candidacyStatus).toLowerCase()]) return false;
      return !!d.termStart && !d.termEnd;
    }
    window._homeIsOfficeholder = _homeIsOfficeholder;

    // Seed a single ballot seat with a specific person (used by the "Start with
    // this official" action on an otherwise-empty seat, so a voter can build a
    // realistic starter team one current officeholder at a time). Writes to the
    // same ballot store the builder reads, mirrors the membership set, and leaves
    // the mode untouched — this is a low-commitment starter pick the voter can
    // keep, swap, or promote to their saved Home Team afterwards.
    window.homeStartSeat = function (raceKey, pid, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!raceKey || !pid) return;
      var sel = (typeof _ballotLoad === 'function') ? (_ballotLoad() || {}) : {};
      var copy = {}; for (var k in sel) { if (sel[k]) copy[k] = sel[k]; }
      copy[raceKey] = pid;
      if (typeof _ballotSave === 'function') _ballotSave(copy);
      else { try { localStorage.setItem(BALLOT_KEY, JSON.stringify(copy)); } catch (e) {} }
      if (typeof window._pdxReflectBallotPick === 'function') { try { window._pdxReflectBallotPick(pid, true); } catch (e) {} }
      var nm = (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) ? CMP_DATA[pid].name : 'That official';
      _homeToast('✓ Started your team with ' + nm + '. Keep them, swap, or add more — nothing is locked in.', 'home');
      _homeRepaintAll();
      if (typeof window._mypolBuildGrid === 'function') { try { window._mypolBuildGrid(); } catch (e) {} }
    };

    // Resolve the current representatives for the saved location into a keyed
    // ballot map, reusing the SAME location/district-aware candidate matcher
    // (_ballotCandidates) the Relevant-to-Me section uses, so the Home Team can
    // never drift from the races shown there. Prefers a sitting officeholder per
    // seat; falls back to the top-scored match when none is flagged as current.
    function _homeResolveSlots() {
      var out = {};
      var positions = window.TEAM_POSITIONS || [];
      positions.forEach(function (pos) {
        if (HOME_AUTO_KEYS.indexOf(pos.key) === -1) return;
        var cands = [];
        try { cands = _ballotCandidates(pos.key) || []; } catch (e) { cands = []; }
        if (!cands.length) return;
        var holder = null;
        for (var i = 0; i < cands.length; i++) { if (_homeIsOfficeholder(cands[i].pid)) { holder = cands[i]; break; } }
        var pick = holder || cands[0];
        if (pick && pick.pid) out[pos.key] = pick.pid;
      });
      return out;
    }
    // Exposed additively so the new politidex_team_v2 layer (defined in the
    // foundation module up top) can DERIVE "who represents me" on demand instead
    // of storing it as user data — see window.PDXTeamV2.getRepresentsMe.
    window._homeResolveSlots = _homeResolveSlots;

    // Copy a keyed slot map into the active/visible builder (politidex_my_team)
    // and keep the _myPoliticians membership set in sync. Does not itself touch
    // the Home Base — callers control mode ordering so the save mirror behaves.
    function _homeApplyToActive(slots) {
      var copy = {};
      for (var k in (slots || {})) { if (slots[k]) copy[k] = slots[k]; }
      if (typeof window._ballotSave === 'function') window._ballotSave(copy);
      else { try { localStorage.setItem('politidex_my_team', JSON.stringify(copy)); } catch (e) {} }
      if (typeof window._pdxReflectBallotPick === 'function') {
        for (var p in copy) { try { window._pdxReflectBallotPick(copy[p], true); } catch (e) {} }
      }
    }

    function _homeRepaintAll() {
      if (typeof window._ballotRender === 'function') { try { window._ballotRender(); return; } catch (e) {} }
      if (typeof window._mypolBuildGrid === 'function') { try { window._mypolBuildGrid(); } catch (e) {} }
    }

    // Wipe the protected Home Team snapshot entirely. Exposed globally so surfaces
    // outside this closure — chiefly the "My Saved" workspace's "Clear my team"
    // control — can clear the saved Home Base alongside the flexible roster
    // (window.mypolClearAll) in a single confirmed action. Marks the 'team'
    // collection dirty (via PDXStore.remove) so the deletion syncs, best-effort
    // clears the signed-in member's cloud copy, and repaints team surfaces.
    window.homeBaseClearAll = function () {
      try {
        if (window.PDXStore) window.PDXStore.remove(HOME_BASE_KEY);
        else localStorage.removeItem(HOME_BASE_KEY);
      } catch (e) {}
      try {
        if (typeof auth !== 'undefined' && auth.currentUser && !auth.currentUser.isAnonymous && typeof db !== 'undefined') {
          db.collection('users').doc(auth.currentUser.uid).set({ home_base: null }, { merge: true }).catch(function () {});
        }
      } catch (e) {}
      _homeRepaintAll();
      return true;
    };

    // Build (or refresh) the Home Team from the saved address, then load it into
    // the visible builder and enter Home mode. Returns the seat count it filled.
    window.homeBuildFromLocation = function (opts) {
      opts = opts || {};
      if (!window._hasUserLocation) {
        _homeToast('Set your location first so we know your districts.', 'warn');
        if (typeof window.toggleChangeLocation === 'function') window.toggleChangeLocation();
        return 0;
      }
      var resolved = _homeResolveSlots();
      var resolvedCount = 0; for (var rc in resolved) { if (resolved[rc]) resolvedCount++; }
      if (!resolvedCount) { _homeToast('We couldn’t find saved representatives for your area yet.', 'warn'); return 0; }
      // Merge: keep any seats the voter already curated by hand, fill the rest —
      // unless a full rebuild was requested.
      var merged;
      if (opts.replace) {
        merged = resolved;
      } else {
        merged = {};
        var existing = _homeSlots();
        for (var ek in existing) { if (existing[ek]) merged[ek] = existing[ek]; }
        for (var rk in resolved) { if (!merged[rk]) merged[rk] = resolved[rk]; }
      }
      _homeStore(merged, _homeSnapshotLoc());
      _homeApplyToActive(merged);            // mode is still whatever it was — no mirror yet
      _homeSetMode('home', { skipGrid: true });
      _homeRepaintAll();
      var filled = 0; for (var f in merged) { if (merged[f]) filled++; }
      _homeToast('⭐ Your Voting Team is set — ' + filled + ' seat' + (filled === 1 ? '' : 's') + ' from where you live.', 'home');
      return filled;
    };

    // Read-only preview of the Home Team that WOULD be built from the saved
    // location — powers the onboarding "Build My Home Team" confirmation so a
    // new voter sees exactly who their representatives are before committing.
    // Resolves the same seats homeBuildFromLocation() does, then decorates each
    // with the display fields the cards need (name, office, party, photo, score).
    //
    // THE SCORE IS THE PROFILE'S SCORE. It used to be window._pdxDisplayScore(d) —
    // the stored `p.score`, which is the retired Promise percentage and is frozen
    // at whatever was last written to the record. A preview card could therefore
    // advertise 85% for someone whose profile, computed live from the same data
    // the moment it opened, read 73%. Both numbers now come from one place:
    // _pdxLedgerSlot → PDXWordAction.read(), the all-time Direction Match the
    // profile hero prints. It is null below the publishable floor and null when
    // the module has not loaded, and the card renders a dash for null — a
    // non-number is the correct answer when there is no live number, and it is a
    // better answer than an old one.
    window._homePreview = function () {
      var resolved = {};
      try { resolved = _homeResolveSlots() || {}; } catch (e) { resolved = {}; }
      var positions = window.TEAM_POSITIONS || [];
      var posByKey = {};
      positions.forEach(function (p) { posByKey[p.key] = p; });
      var reps = [];
      // Iterate in HOME_AUTO_KEYS order so the preview always reads top-down:
      // U.S. Senate, U.S. House, Governor, State Senate, State House.
      HOME_AUTO_KEYS.forEach(function (key) {
        var pid = resolved[key];
        if (!pid) return;
        var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
        if (!d) return;
        var pos = posByKey[key] || { key: key, label: key, icon: '🏛', color: '#4ade80' };
        var slot = _liveDirectionMatch(pid, d);
        reps.push({
          key: key,
          seat: pos.label || (d.office || 'Seat'),
          icon: pos.icon || '🏛',
          color: pos.color || '#4ade80',
          pid: pid,
          name: d.name || '',
          office: d.office || '',
          party: d.party || '',
          photoUrl: (typeof window._getPhotoUrl === 'function') ? (window._getPhotoUrl(pid) || '') : '',
          score: slot.pct,
          // What to say when there is no number. Straight from the ledger slot, so
          // the card never has to invent a reason of its own.
          scoreNote: slot.sub
        });
      });
      var loc = _homeSnapshotLoc();
      return { location: loc, label: _homeLocLabel(loc), hasBase: _homeHasBase(), reps: reps };
    };

    // Expose the Home-Base presence check so the onboarding flow can tell a
    // brand-new voter (no saved team yet) apart from a returning one.
    window._homeHasBase = _homeHasBase;

    // "Back to My Home Team" — load the saved Home Base into the builder.
    window.homeLoadTeam = function () {
      if (!_homeHasBase()) { return window.homeBuildFromLocation({}); }
      var home = _homeSlots();
      // The "Switch back to your Home Team? Your current research picks will be
      // set aside…" confirmation was removed with the Home-Team concept. There is
      // now a single unified team, so loading the saved slate never competes with
      // a separate "research team" and no hand-off warning is needed.
      _homeApplyToActive(home);
      _homeSetMode('home', { skipGrid: true });
      _homeRepaintAll();
      var el = document.getElementById('myteam-selected-panel');
      if (el && el.scrollIntoView) { try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
    };

    // Enter Research mode — the active team becomes a free scratch surface; the
    // Home Base is untouched. (The body was accidentally emptied during an earlier
    // "Research Mode split" cleanup, leaving `function ()` with no `{ … }`. That
    // was a hard SyntaxError that aborted this entire <script> block at parse time,
    // so everything defined below it — window._pdxVoterBallot, KEY_RACES_BY_LOCATION,
    // the incumbent maps, _krInferLocation, _krDistrictsForLocation and the whole
    // map-aware district resolver — was never published to window. Every surface
    // then silently fell back to its null/placeholder path, which is why prior
    // district fixes produced no visible change. Restoring a valid body re-arms the
    // block and lets those already-correct resolvers finally run.)
    window.homeEnterResearch = function () {
      _homeSetMode('research');
      _homeRepaintAll();
      _homeToast('🔬 Research mode — explore any area freely. Your saved Voting Team stays untouched.', 'home');
    };

    // Promote the current builder contents to be the saved Home Team.
    window.homeSaveCurrentAsBase = function () {
      var active = (typeof window._ballotLoad === 'function') ? window._ballotLoad() : {};
      var n = 0; for (var k in active) { if (active[k]) n++; }
      if (!n) { _homeToast('Add some picks first, then save them as your Voting Team.', 'warn'); return; }
      if (_homeHasBase() && !window.confirm('Replace your saved Voting Team with these ' + n + ' current pick' + (n === 1 ? '' : 's') + '?')) return;
      _homeStore(active, _homeSnapshotLoc());
      _homeToast('⭐ Saved as your Voting Team — ' + n + ' seat' + (n === 1 ? '' : 's') + '.', 'home');
    };

    // Copy a single politician into the protected Home Team (without disturbing
    // the active research team). Used by the per-slot "Send to Home" button.
    window.homeAddPid = function (pid, ev) {
      if (ev && ev.stopPropagation) ev.stopPropagation();
      if (!pid) return;
      var key = (typeof window._findRaceKeyForPolitician === 'function') ? window._findRaceKeyForPolitician(pid) : null;
      if (!key) { _homeToast('That office isn’t one of your Voting Team seats.', 'warn'); return; }
      var slots = _homeSlots();
      var copy = {}; for (var k in slots) { if (slots[k]) copy[k] = slots[k]; }
      copy[key] = pid;
      var prevLoc = (_homeLoad() || {}).location || _homeSnapshotLoc();
      _homeStore(copy, prevLoc);
      var nm = (typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) ? CMP_DATA[pid].name : 'That pick';
      _homeToast('⭐ Added ' + nm + ' to your Voting Team.', 'home');
      _homeRenderBanner();
      if (typeof window._mypolBuildGrid === 'function') { try { window._mypolBuildGrid(); } catch (e) {} }
    };

    // Per-slot action HTML for the builder cards. The old "Send to Home" /
    // "In Home Team" affordance was a retired My Home Team artifact and has been
    // removed from the builder, so this now renders nothing. (The Home Base copy
    // action still lives in the dedicated Home Team surfaces via homeAddPid.)
    window._homeSlotActionBtn = function (raceKey, pid) {
      return '';
    };

    // Small transient toast for Home Base actions (self-contained — no deps).
    function _homeToast(msg, kind) {
      try {
        var el = document.getElementById('home-toast');
        if (!el) { el = document.createElement('div'); el.id = 'home-toast'; document.body.appendChild(el); }
        var border = kind === 'home' ? 'rgba(74,222,128,0.55)' : kind === 'warn' ? 'rgba(245,158,11,0.55)' : 'rgba(96,165,250,0.55)';
        var glow = kind === 'home' ? 'rgba(74,222,128,0.25)' : kind === 'warn' ? 'rgba(245,158,11,0.25)' : 'rgba(96,165,250,0.25)';
        el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(8px);z-index:99999;max-width:90vw;padding:0.8rem 1.2rem;border-radius:0.9rem;background:linear-gradient(135deg,rgba(13,21,38,0.97),rgba(17,29,54,0.97));border:1px solid ' + border + ';color:#f1f5f9;font-family:\'Oswald\',sans-serif;font-size:0.86rem;letter-spacing:0.02em;box-shadow:0 12px 40px rgba(0,0,0,0.5),0 0 26px ' + glow + ';opacity:0;transition:opacity 0.25s ease, transform 0.25s ease;';
        el.textContent = msg;
        requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
        clearTimeout(window._homeToastT);
        window._homeToastT = setTimeout(function () { el.style.opacity = '0'; }, 3400);
      } catch (e) {}
    }

    function _homeLocLabel(loc) {
      loc = loc || {};
      var parts = [];
      var place = [loc.city, loc.state].filter(Boolean).join(', ');
      if (place) parts.push(place);
      if (loc.district) parts.push('U.S. House ' + loc.district);
      if (loc.stateSenateDistrict) parts.push('State Sen. ' + loc.stateSenateDistrict);
      if (loc.stateHouseDistrict) parts.push('State House ' + loc.stateHouseDistrict);
      return parts.join(' · ');
    }

    function _homeRenderBanner() {
      var el = document.getElementById('myteam-mode-banner');
      if (!el) return;
      // The in-builder Home-Team / Research mode banner was retired — PolitiDex now
      // has one unified team ("My Voting Team"). This surface renders nothing, but
      // the lockstep side-effect below is kept so the Relevant-to-Me mode tag stays
      // in sync on every ballot save / grid rebuild / mode change.
      el.innerHTML = '';
      el.style.display = 'none';
      el.style.marginBottom = '0';
      try { _homeRenderRelevantTag(); } catch (e) {}
    }
    window._homeRenderBanner = _homeRenderBanner;

    // The compact "Home Team vs Research" mode line under the "Relevant to Me"
    // header was retired along with the rest of the Home-Team concept. PolitiDex
    // now has one unified team ("My Voting Team"), so this tag renders nothing —
    // the element is emptied and hidden. Kept as a no-op so the many lockstep
    // callers (_homeRenderBanner, mode changes, grid rebuilds) stay wired.
    function _homeRenderRelevantTag() {
      var el = document.getElementById('relevant-home-mode-tag');
      if (!el) return;
      el.innerHTML = '';
      el.style.display = 'none';
    }
    window._homeRenderRelevantTag = _homeRenderRelevantTag;

    // Membership test used by listing cards (Relevant to Me, browse) to flag the
    // exact people saved in the protected Home Team. Exposed because the card
    // renderers live in earlier script blocks.
    window._homeIsMember = function (pid) {
      if (!pid) return false;
      var s = _homeSlots();
      for (var k in s) { if (s[k] === pid) return true; }
      return false;
    };
    window._homeSlotsPublic = function () { return _homeSlots(); };

    // Anchor the active voter-location VIEW to the saved Home Base area, so the
    // district finder, "Relevant to Me" and Key Races all default to the voter's
    // real seats. Only writes when the base records a real (state-bearing)
    // location; otherwise leaves the current location untouched.
    function _homeAnchorLocation() {
      var hb = _homeLoad();
      var loc = hb && hb.location;
      if (!loc || !(loc.state || '').toString().trim()) return false;
      window._currentVoterLocation = {
        state: loc.state || '', city: loc.city || '', county: loc.county || '',
        district: String(loc.district == null ? '' : loc.district).replace(/[^0-9]/g, ''),
        stateHouseDistrict: String(loc.stateHouseDistrict == null ? '' : loc.stateHouseDistrict).replace(/[^0-9]/g, ''),
        stateSenateDistrict: String(loc.stateSenateDistrict == null ? '' : loc.stateSenateDistrict).replace(/[^0-9]/g, ''),
        mapSelected: !!(loc.stateHouseDistrict || loc.stateSenateDistrict)
      };
      window._hasUserLocation = true;
      try { localStorage.setItem('politidex_voter_location', JSON.stringify(window._currentVoterLocation)); } catch (e) {}
      if (typeof window._updateTeamPositionsForLocation === 'function') { try { window._updateTeamPositionsForLocation(); } catch (e) {} }
      return true;
    }
    window._homeAnchorLocation = _homeAnchorLocation;

    // Land the voter on their protected Home Base: load the real team into the
    // visible builder, switch to Home mode, anchor the location view to the home
    // area, then repaint every location-driven surface. This is the trustworthy
    // default — returning to the site (or signing in on a new device) comes back
    // to your real team. It NO-OPS (leaving the builder exactly as the voter left
    // it) when no Home Base has been set, so people who never created one keep
    // whatever team they were assembling. It also respects an explicit Research
    // session: because building/loading a base always persists mode 'home', the
    // only way to be in 'research' on load is a deliberate "Switch to Research",
    // so we leave that builder intact and just keep the banner + Relevant-to-Me
    // tag honest (with one tap back to the Home Team).
    window._homeHydrateView = function () {
      try {
        if (!_homeHasBase()) { try { _homeRenderBanner(); } catch (e) {} return false; }
        if (_homeMode() === 'research') {
          try { _homeRenderBanner(); } catch (e) {}
          ['updateRelevantLocationText', '_homeRenderRelevantTag'].forEach(function (fn) {
            try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
          });
          return false;
        }
        _homeSetMode('home', { skipGrid: true });
        _homeApplyToActive(_homeSlots());
        _homeAnchorLocation();
        _homeRepaintAll();
        ['updateRelevantLocationText', 'updateMyTeamLocationText', 'renderRelevantToMe', '_pdxRefreshMapIndicators', '_homeRenderRelevantTag'].forEach(function (fn) {
          try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
        });
        return true;
      } catch (e) { return false; }
    };


    // The returning-voter HERO spotlight and the persistent floating "My Home
    // Team" launcher were removed when the location-based Home Team builder was
    // phased out. The location / Home Base setting mechanism they linked to is
    // still wired up below.

    // Wire the Home Base into the existing team engine without disturbing it:
    //   • wrap the single canonical ballot writer so Home-mode edits mirror into
    //     the Home Base, and the banner refreshes on every save;
    //   • wrap the grid renderer so the banner stays in sync on repaint;
    //   • wrap saveVoterLocation so changing area drops to Research mode (the
    //     Home Base is never silently overwritten while browsing elsewhere).
    (function _homeInit() {
      if (typeof window._ballotSave === 'function' && !window._ballotSave.__homeWrapped) {
        var _origSave = window._ballotSave;
        window._ballotSave = function (selections) {
          var r = _origSave.apply(this, arguments);
          try {
            if (_homeMode() === 'home' && _homeHasBase()) {
              var prevLoc = (_homeLoad() || {}).location || _homeSnapshotLoc();
              _homeStore(selections || {}, prevLoc);
            }
          } catch (e) {}
          try { _homeRenderBanner(); } catch (e) {}
          return r;
        };
        window._ballotSave.__homeWrapped = true;
      }
      if (typeof window._mypolBuildGrid === 'function' && !window._mypolBuildGrid.__homeWrapped) {
        var _origGrid = window._mypolBuildGrid;
        window._mypolBuildGrid = function () {
          var r = _origGrid.apply(this, arguments);
          try { _homeRenderBanner(); } catch (e) {}
          return r;
        };
        window._mypolBuildGrid.__homeWrapped = true;
      }
      if (typeof window.saveVoterLocation === 'function' && !window.saveVoterLocation.__homeWrapped) {
        var _origLoc = window.saveVoterLocation;
        window.saveVoterLocation = function () {
          var r = _origLoc.apply(this, arguments);
          try {
            if (_homeMode() === 'home' && _homeHasBase()) {
              var hb = _homeLoad() || {}; var p = hb.location || {}; var c = _homeSnapshotLoc();
              var samePlace = (p.state === c.state && p.city === c.city && p.district === c.district &&
                p.stateSenateDistrict === c.stateSenateDistrict && p.stateHouseDistrict === c.stateHouseDistrict);
              if (!samePlace) {
                // The voter changed their address while on their Home Team. Offer to
                // move the Home Base to the new area (an explicit, confirmed update —
                // never a silent overwrite). Declining keeps the saved Home Team
                // exactly as it was and drops into Research mode for the new area.
                var newLabel = _homeLocLabel(c) || 'your new area';
                var wantsUpdate = false;
                try {
                  wantsUpdate = window.confirm('You changed your address to ' + newLabel + '.\n\nUpdate My Voting Team to match your new area? Your current picks will be rebuilt from the representatives there.\n\nOK = rebuild my team · Cancel = keep my current picks and just explore this area');
                } catch (e) { wantsUpdate = false; }
                if (wantsUpdate) {
                  // Rebuild the protected Home Base from the newly-saved address.
                  if (typeof window.homeBuildFromLocation === 'function') {
                    window.homeBuildFromLocation({ replace: true });
                  }
                } else {
  _homeToast('Your Voting Team is saved and unchanged.', 'home');
}
              }
            }
          } catch (e) {}
          try { _homeRenderBanner(); } catch (e) {}
          return r;
        };
        window.saveVoterLocation.__homeWrapped = true;
      }
      try { _homeRenderBanner(); } catch (e) {}
      // After the initial render settles, land returning voters on their saved
      // Home Base so "Relevant to Me" and the builder default to their real team.
      // Deferred via DOMContentLoaded (captured by the startup shim) so it runs
      // once the roster + builder have painted. Signed-in restores call
      // _homeHydrateView directly from syncUserDataFromFirestore as well.
      try {
        document.addEventListener('DOMContentLoaded', function () {
          try { window._homeHydrateView(); } catch (e) {}
        });
      } catch (e) {}


    })();

    /* ═══════════════════════════════════════════════════════════════
       YOUR KEY RACES — personalized, LOCATION-AWARE ballot builder.
       A location selector drives which districts/races are shown. Each
       location is self-contained; adding more is just another entry in
       KEY_RACES_BY_LOCATION + KEY_RACES_LOCATIONS (and any new incumbent
       / candidate records in CMP_DATA). Reads CMP_DATA + the shared
       ballot store and reuses the existing ballotPickCard() pick
       mechanism so picks land in the same 6-slot "My Voting Team" grid.
       Fully guarded — it can never break search, filters, or the tree.
       ═══════════════════════════════════════════════════════════════ */
    var KR_LOCATION_KEY = 'politidex_keyraces_location';

    // Order of the selector dropdown. id must match a KEY_RACES_BY_LOCATION key.
    var KEY_RACES_LOCATIONS = [
      // Wasatch Front
      { id: 'slc',          region: 'Wasatch Front', label: 'Salt Lake City / Salt Lake County',     city: 'Salt Lake City',  county: 'Salt Lake County', houseDistrict: 22, senateDistrict: 9,  congressDistrict: 1 },
      { id: 'west_valley',  region: 'Wasatch Front', label: 'West Valley City',                       city: 'West Valley City', county: 'Salt Lake County', houseDistrict: 30, senateDistrict: 12, congressDistrict: 1, priorCongressDistrict: 2 },
      { id: 'west_jordan',  region: 'Wasatch Front', label: 'West Jordan',                            city: 'West Jordan',     county: 'Salt Lake County', houseDistrict: 36, senateDistrict: 16, congressDistrict: 1 },
      { id: 'south_jordan', region: 'Wasatch Front', label: 'South Jordan / Riverton',                city: 'South Jordan',    county: 'Salt Lake County', houseDistrict: 45, senateDistrict: 17, congressDistrict: 4 },
      { id: 'sandy',        region: 'Wasatch Front', label: 'Sandy / Cottonwood Heights',             city: 'Sandy',           county: 'Salt Lake County', houseDistrict: 42, senateDistrict: 19, congressDistrict: 4 },
      { id: 'davis',        region: 'Wasatch Front', label: 'Layton / Davis County',                  city: 'Layton',          county: 'Davis County',     houseDistrict: 15, senateDistrict: 6,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'clearfield',   region: 'Wasatch Front', label: 'Clearfield / Syracuse',                  city: 'Clearfield',      county: 'Davis County',     houseDistrict: 14, senateDistrict: 5,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'weber',        region: 'Wasatch Front', label: 'Ogden / Weber County',                   city: 'Ogden',           county: 'Weber County',     houseDistrict: 9,  senateDistrict: 5,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'south_ogden',  region: 'Wasatch Front', label: 'South Ogden / Roy',                      city: 'South Ogden',     county: 'Weber County',     houseDistrict: 10, senateDistrict: 5,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'utah_co',      region: 'Wasatch Front', label: 'Provo / Utah County',                    city: 'Provo',           county: 'Utah County',      houseDistrict: 62, senateDistrict: 24, congressDistrict: 3 },
      { id: 'orem',         region: 'Wasatch Front', label: 'Orem',                                   city: 'Orem',            county: 'Utah County',      houseDistrict: 57, senateDistrict: 24, congressDistrict: 3 },
      { id: 'lehi',         region: 'Wasatch Front', label: 'Lehi / Eagle Mountain',                  city: 'Lehi',            county: 'Utah County',      houseDistrict: 52, senateDistrict: 22, congressDistrict: 4 },
      { id: 'south_utah_co',region: 'Wasatch Front', label: 'Spanish Fork / Salem / South Utah County',city: 'Spanish Fork',    county: 'Utah County',      houseDistrict: 63, senateDistrict: 25, congressDistrict: 3 },
      { id: 'tooele',       region: 'Wasatch Front', label: 'Tooele / Grantsville / Tooele County',   city: 'Tooele',          county: 'Tooele County',    houseDistrict: 28, senateDistrict: 11, congressDistrict: 4, priorCongressDistrict: 2 },

      // Northern Utah
      { id: 'box_elder',    region: 'Northern Utah', label: 'Brigham City / Box Elder County',        city: 'Brigham City',    county: 'Box Elder County', houseDistrict: 6,  senateDistrict: 1,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'cache',        region: 'Northern Utah', label: 'Logan / Cache County',                   city: 'Logan',           county: 'Cache County',     houseDistrict: 3,  senateDistrict: 2,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'rich',         region: 'Northern Utah', label: 'Randolph / Rich County',                 city: 'Randolph',        county: 'Rich County',      houseDistrict: 4,  senateDistrict: 2,  congressDistrict: 2, priorCongressDistrict: 1 },
      { id: 'morgan',       region: 'Northern Utah', label: 'Morgan / Morgan County',                 city: 'Morgan',          county: 'Morgan County',    houseDistrict: 4,  senateDistrict: 3,  congressDistrict: 3 },
      { id: 'summit',       region: 'Northern Utah', label: 'Coalville / Park City / Summit County',  city: 'Coalville',       county: 'Summit County',    houseDistrict: 4,  senateDistrict: 3,  congressDistrict: 3 },

      // Eastern Utah
      { id: 'daggett',      region: 'Eastern Utah', label: 'Manila / Daggett County',                 city: 'Manila',          county: 'Daggett County',   houseDistrict: 68, senateDistrict: 20, congressDistrict: 3 },
      { id: 'duchesne',     region: 'Eastern Utah', label: 'Duchesne / Duchesne County',              city: 'Duchesne',        county: 'Duchesne County',  houseDistrict: 67, senateDistrict: 20, congressDistrict: 3 },
      { id: 'uintah',       region: 'Eastern Utah', label: 'Vernal / Uintah County',                  city: 'Vernal',          county: 'Uintah County',    houseDistrict: 68, senateDistrict: 20, congressDistrict: 3 },
      { id: 'carbon',       region: 'Eastern Utah', label: 'Price / Carbon County',                   city: 'Price',           county: 'Carbon County',    houseDistrict: 67, senateDistrict: 26, congressDistrict: 3 },
      { id: 'emery',        region: 'Eastern Utah', label: 'Castle Dale / Emery County',              city: 'Castle Dale',     county: 'Emery County',     houseDistrict: 67, senateDistrict: 26, congressDistrict: 3 },
      { id: 'grand',        region: 'Eastern Utah', label: 'Moab / Grand County',                     city: 'Moab',            county: 'Grand County',     houseDistrict: 69, senateDistrict: 26, congressDistrict: 3 },
      { id: 'san_juan',     region: 'Eastern Utah', label: 'Monticello / Blanding / San Juan County', city: 'Monticello',      county: 'San Juan County',  houseDistrict: 69, senateDistrict: 26, congressDistrict: 3 },

      // Central Utah
      { id: 'wasatch',      region: 'Central Utah', label: 'Heber City / Wasatch County',             city: 'Heber City',      county: 'Wasatch County',   houseDistrict: 59, senateDistrict: 20, congressDistrict: 3 },
      { id: 'juab',         region: 'Central Utah', label: 'Nephi / Juab County',                     city: 'Nephi',           county: 'Juab County',      houseDistrict: 66, senateDistrict: 27, congressDistrict: 4 },
      { id: 'sanpete',      region: 'Central Utah', label: 'Manti / Sanpete County',                  city: 'Manti',           county: 'Sanpete County',   houseDistrict: 66, senateDistrict: 27, congressDistrict: 4 },
      { id: 'millard',      region: 'Central Utah', label: 'Fillmore / Millard County',               city: 'Fillmore',        county: 'Millard County',   houseDistrict: 29, senateDistrict: 27, congressDistrict: 4 },
      { id: 'sevier',       region: 'Central Utah', label: 'Richfield / Sevier County',               city: 'Richfield',       county: 'Sevier County',    houseDistrict: 70, senateDistrict: 27, congressDistrict: 4 },
      { id: 'piute',        region: 'Central Utah', label: 'Junction / Piute County',                 city: 'Junction',        county: 'Piute County',     houseDistrict: 70, senateDistrict: 27, congressDistrict: 3 },
      { id: 'wayne',        region: 'Central Utah', label: 'Loa / Wayne County',                      city: 'Loa',             county: 'Wayne County',     houseDistrict: 69, senateDistrict: 27, congressDistrict: 3 },

      // Southern Utah
      { id: 'beaver',       region: 'Southern Utah', label: 'Beaver / Beaver County',                 city: 'Beaver',          county: 'Beaver County',    houseDistrict: 70, senateDistrict: 28, congressDistrict: 3 },
      { id: 'cedar_city',   region: 'Southern Utah', label: 'Cedar City / Iron County',               city: 'Cedar City',      county: 'Iron County',      houseDistrict: 71, senateDistrict: 28, congressDistrict: 3, priorCongressDistrict: 2 },
      { id: 'garfield',     region: 'Southern Utah', label: 'Panguitch / Garfield County',            city: 'Panguitch',       county: 'Garfield County',  houseDistrict: 69, senateDistrict: 27, congressDistrict: 3 },
      { id: 'washington',   region: 'Southern Utah', label: 'St. George / Washington County',         city: 'St. George',      county: 'Washington County',houseDistrict: 75, senateDistrict: 29, congressDistrict: 3, priorCongressDistrict: 2 },
      { id: 'kane',         region: 'Southern Utah', label: 'Kanab / Kane County',                    city: 'Kanab',           county: 'Kane County',      houseDistrict: 69, senateDistrict: 26, congressDistrict: 3 }
    ];

    var KEY_RACES_BY_LOCATION = {
      // NOTE: every entry below whose area also defines house/senate/congress
      // districts in KEY_RACES_LOCATIONS is REBUILT at load by the canonical
      // boundary-derived builder (_krBuildLocationRaces, further down) — so the
      // U.S. House seat shown for each area is keyed to that area's official 2026
      // congressDistrict and KR_CONGRESSIONAL_INCUMBENTS, never the literal below.
      // (e.g. Davis County's congressDistrict is 2, so Layton's 2026 U.S. House
      // BALLOT race is District 2 even though this literal still reads District 1.)
      // The literals are kept only as a fallback for any area missing a district.
      // NOTE: the Hub "Your Voting Districts" strip layers a current-vs-2026 split
      // on top of this via priorCongressDistrict (see _pdxHouseRedistrict) — so a
      // redrawn area shows who represents the voter NOW (Davis → District 1 / Blake
      // Moore) distinctly from the 2026 ballot district built here. This ballot
      // build is unchanged; only the Hub's labeling reads the prior district.
      // ── Layton / Davis County ──────────────────────────────────────
      davis: [
        {
          raceKey: 'statehouse', short: 'House District 16',
          district: 'Utah House District 16', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'tlee',
          incumbentNote: 'Incumbent — running for re-election in 2026',
          addLabel: 'Add House District 16 choice to My Team',
          candidates: ['tlee', 'bob_stevenson']
        },
        {
          raceKey: 'statesenate', short: 'Senate District 6',
          district: 'Utah Senate District 6', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'jstevenson',
          incumbentNote: 'Retiring — not seeking re-election in 2026',
          addLabel: 'Add Senate District 6 choice to My Team',
          candidates: ['tami_tran', 'robert_wanlass', 'jared_neal', 'josh_smith']
        },
        {
          raceKey: 'house', short: 'Congressional District 2',
          district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy',
          incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023,
          incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team',
          candidates: ['maloy'],
          extraNote: 'The 2025 court-ordered remap moved Davis County, including Layton, into District 2. The 2026 field is still forming — more candidates will appear here as filings are confirmed.'
        }
      ],
      // ── Provo / Utah County ────────────────────────────────────────
      utah_co: [
        {
          raceKey: 'statehouse', short: 'House District 61',
          district: 'Utah House District 61', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'lisa_shepherd',
          incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 61 choice to My Team',
          candidates: ['lisa_shepherd'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.'
        },
        {
          raceKey: 'statesenate', short: 'Senate District 23',
          district: 'Utah Senate District 23', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'kgrover',
          incumbentNote: 'Incumbent — up for re-election in 2026',
          addLabel: 'Add Senate District 23 choice to My Team',
          candidates: ['kgrover'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.'
        },
        {
          raceKey: 'house', short: 'Congressional District 3',
          district: 'Utah Congressional District 3', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'kennedy',
          incumbentNote: 'Incumbent — first elected in 2024',
          incumbentSince: 2025,
          incumbentSummary: 'Physician and attorney serving Utah’s 3rd District in his first U.S. House term.',
          addLabel: 'Add Congressional District 3 choice to My Team',
          candidates: ['kennedy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.'
        }
      ],
      // ── St. George / Washington County ─────────────────────────────
      washington: [
        {
          // District 75, not 71: this block used to name Rex Shipp, who lives in Cedar
          // City and holds District 71 in Iron County. St. George's own seats are 73
          // and 75; 75 is Walt Brooks's. Shipp's misplacement here is where his roster
          // record's "St. George" label came from.
          raceKey: 'statehouse', short: 'House District 75',
          district: 'Utah House District 75', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'walt_brooks',
          incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 75 choice to My Team',
          candidates: ['walt_brooks'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.'
        },
        {
          raceKey: 'statesenate', short: 'Senate District 29',
          district: 'Utah Senate District 29', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'dipson',
          incumbentNote: 'Incumbent — current term runs through 2029',
          ballot: { tone: 'future', label: 'Next Election · 2028' },
          addLabel: 'Add Senate District 29 choice to My Team',
          candidates: ['dipson'],
          extraNote: 'This seat is not on the 2026 ballot, but your senator’s record stays on your team for reference.'
        },
        {
          raceKey: 'house', short: 'Congressional District 2',
          district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy',
          incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023,
          incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team',
          candidates: ['maloy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.'
        }
      ],
      // ── Ogden / Weber County ───────────────────────────────────────
      weber: [
        {
          raceKey: 'statehouse', short: 'House District 9',
          district: 'Utah House District 9', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'jake_sawyer',
          incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 9 choice to My Team',
          candidates: ['jake_sawyer'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.'
        },
        {
          raceKey: 'statesenate', short: 'Senate District 5',
          district: 'Utah Senate District 5', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'amillner',
          incumbentNote: 'Incumbent — Weber County’s state senator',
          addLabel: 'Add Senate District 5 choice to My Team',
          candidates: ['amillner'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.'
        },
        {
          raceKey: 'house', short: 'Congressional District 2',
          district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy',
          incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023,
          incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team',
          candidates: ['maloy'],
          extraNote: 'Weber County sits in the 2nd District under the 2026 court-ordered map. The 2026 field is still forming — more candidates will appear here as filings are confirmed.'
        }
      ],
      // ── Salt Lake City (Salt Lake County) ──────────────────────────
      slc: [
        // District 21, not 24: Sandra Hollins has held 21 since the 2023 renumbering
        // (23 before that). Her id's `_h24` suffix is the stale number, and District 24
        // is Grant Miller's seat.
        { raceKey: 'statehouse', short: 'House District 21', district: 'Utah House District 21', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'hollins_h24', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 21 choice to My Team', candidates: ['hollins_h24'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 13', district: 'Utah Senate District 13', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'blouin_s13', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 13 choice to My Team', candidates: ['blouin_s13'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 1', district: 'Utah Congressional District 1', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'bmoore', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 1st District since 2021 and a member of U.S. House Republican leadership.',
          addLabel: 'Add Congressional District 1 choice to My Team', candidates: ['bmoore'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── West Valley City (Salt Lake County) ────────────────────────
      west_valley: [
        { raceKey: 'statehouse', short: 'House District 30', district: 'Utah House District 30', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'fitisemanu_h30', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 30 choice to My Team', candidates: ['fitisemanu_h30'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 12', district: 'Utah Senate District 12', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'kwan_s12', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 12 choice to My Team', candidates: ['kwan_s12'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 2', district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023, incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team', candidates: ['maloy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── West Jordan (Salt Lake County) ─────────────────────────────
      west_jordan: [
        { raceKey: 'statehouse', short: 'House District 39', district: 'Utah House District 39', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'ivory_h39', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 39 choice to My Team', candidates: ['ivory_h39'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 16', district: 'Utah Senate District 16', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'harper_s16', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 16 choice to My Team', candidates: ['harper_s16'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 4', district: 'Utah Congressional District 4', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'owens', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 4th District since 2021, serving on the Education and Judiciary committees.',
          addLabel: 'Add Congressional District 4 choice to My Team', candidates: ['owens'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── South Jordan / Riverton (Salt Lake County) ─────────────────
      south_jordan: [
        { raceKey: 'statehouse', short: 'House District 44', district: 'Utah House District 44', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'teuscher_h44', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 44 choice to My Team', candidates: ['teuscher_h44'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 18', district: 'Utah Senate District 18', chamber: 'Utah State Senate',
          // Was labelled "Senate District 11" — McCay's PRE-2023 number, which his id
          // suffix still carries. He has sat in District 18 (Riverton / Herriman) since
          // the 2022 redistricting, which is what _UTAH_SENATE_INFO and his own roster
          // record say. Assertion 10i now compares these two, so the stale label failed.
          color: '#a78bfa', incumbentPid: 'mccay_s11', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 18 choice to My Team', candidates: ['mccay_s11'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 4', district: 'Utah Congressional District 4', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'owens', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 4th District since 2021, serving on the Education and Judiciary committees.',
          addLabel: 'Add Congressional District 4 choice to My Team', candidates: ['owens'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Sandy / Cottonwood Heights (Salt Lake County) ──────────────
      sandy: [
        // RESOLVED (July 2026): this block used to run a "District 45" race, which was
        // the pre-2023 number in `eliason_h45`'s id suffix. Steve Eliason represented
        // District 45 from 2011 to 2023 and has held District 43 — southern Salt Lake
        // County, including Sandy — since the 2023 renumbering, so the region was right
        // and only the number was stale. He is now wired at 43 in _UTAH_HOUSE_INFO and
        // KR_STATE_HOUSE_INCUMBENTS, which means assertion 10i guards this block: change
        // the district here and CI fails unless the info map agrees. District 45 is Tracy
        // Miller's seat and is not wired to anyone.
        { raceKey: 'statehouse', short: 'House District 43', district: 'Utah House District 43', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'eliason_h45', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 43 choice to My Team', candidates: ['eliason_h45'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 19', district: 'Utah Senate District 19', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'kcullimore', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 19 choice to My Team', candidates: ['kcullimore'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 4', district: 'Utah Congressional District 4', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'owens', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 4th District since 2021, serving on the Education and Judiciary committees.',
          addLabel: 'Add Congressional District 4 choice to My Team', candidates: ['owens'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Clearfield / Syracuse (Davis County) ───────────────────────
      clearfield: [
        { raceKey: 'statehouse', short: 'House District 14', district: 'Utah House District 14', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'lisonbee_h14', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 14 choice to My Team', candidates: ['lisonbee_h14'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 6', district: 'Utah Senate District 6', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'jstevenson', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 6 choice to My Team', candidates: ['jstevenson'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 1', district: 'Utah Congressional District 1', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'bmoore', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 1st District since 2021 and a member of U.S. House Republican leadership.',
          addLabel: 'Add Congressional District 1 choice to My Team', candidates: ['bmoore'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── South Ogden / Roy (Weber County) ───────────────────────────
      south_ogden: [
        { raceKey: 'statehouse', short: 'House District 11', district: 'Utah House District 11', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'hall_h11', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 11 choice to My Team', candidates: ['hall_h11'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 5', district: 'Utah Senate District 5', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'amillner', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 5 choice to My Team', candidates: ['amillner'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 1', district: 'Utah Congressional District 1', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'bmoore', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 1st District since 2021 and a member of U.S. House Republican leadership.',
          addLabel: 'Add Congressional District 1 choice to My Team', candidates: ['bmoore'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Orem (Utah County) ─────────────────────────────────────────
      orem: [
        { raceKey: 'statehouse', short: 'House District 56', district: 'Utah House District 56', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'valpeterson_h56', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 56 choice to My Team', candidates: ['valpeterson_h56'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 25', district: 'Utah Senate District 25', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'mckell_s25', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 25 choice to My Team', candidates: ['mckell_s25'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 3', district: 'Utah Congressional District 3', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'kennedy', incumbentNote: 'Incumbent — first elected in 2024',
          incumbentSince: 2025, incumbentSummary: 'Physician and attorney serving Utah’s 3rd District in his first U.S. House term.',
          addLabel: 'Add Congressional District 3 choice to My Team', candidates: ['kennedy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Lehi / Eagle Mountain (Utah County) ────────────────────────
      lehi: [
        { raceKey: 'statehouse', short: 'House District 50', district: 'Utah House District 50', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'gricius_h50', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 50 choice to My Team', candidates: ['gricius_h50'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 21', district: 'Utah Senate District 21', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'brammer_s21', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 21 choice to My Team', candidates: ['brammer_s21'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 3', district: 'Utah Congressional District 3', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'kennedy', incumbentNote: 'Incumbent — first elected in 2024',
          incumbentSince: 2025, incumbentSummary: 'Physician and attorney serving Utah’s 3rd District in his first U.S. House term.',
          addLabel: 'Add Congressional District 3 choice to My Team', candidates: ['kennedy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Logan / Cache County ───────────────────────────────────────
      cache: [
        { raceKey: 'statehouse', short: 'House District 5', district: 'Utah House District 5', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'snider_h5', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 5 choice to My Team', candidates: ['snider_h5'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 1', district: 'Utah Senate District 1', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'ssandall', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 1 choice to My Team', candidates: ['ssandall'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 1', district: 'Utah Congressional District 1', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'bmoore', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2021, incumbentSummary: 'Representing Utah’s 1st District since 2021 and a member of U.S. House Republican leadership.',
          addLabel: 'Add Congressional District 1 choice to My Team', candidates: ['bmoore'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Tooele / Grantsville (Tooele County) ───────────────────────
      tooele: [
        { raceKey: 'statehouse', short: 'House District 29', district: 'Utah House District 29', chamber: 'Utah State House',
          // Was labelled "Utah House District 68" — Bolinder's PRE-2023 number, still in
          // his id suffix. He has represented District 29 (Tooele / Grantsville) since
          // 2023; post-2023 District 68 is Scott Chew's Uintah Basin seat, so this block
          // was advertising a race 200 miles away to Tooele County readers. Caught by 10i.
          color: '#2dd4bf', incumbentPid: 'bolinder_h68', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 29 choice to My Team', candidates: ['bolinder_h68'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 1', district: 'Utah Senate District 1', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'ssandall', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 1 choice to My Team', candidates: ['ssandall'],
          extraNote: 'Senate District 1 spans Box Elder, Cache and Tooele counties. 2026 challenger filings are still being certified.' },
        { raceKey: 'house', short: 'Congressional District 2', district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023, incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team', candidates: ['maloy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ],
      // ── Cedar City / Iron County ───────────────────────────────────
      cedar_city: [
        // District 71, not 73: Cedar City is in Iron County, which District 71 covers
        // and Rex Shipp holds. This block used to read "District 73 / jwestwood" —
        // Westwood left the House in 2019 (Shipp succeeded him) and District 73 is a
        // St. George seat, so the region, the number and the person were all wrong.
        { raceKey: 'statehouse', short: 'House District 71', district: 'Utah House District 71', chamber: 'Utah State House',
          color: '#2dd4bf', incumbentPid: 'rshipp', incumbentNote: 'Incumbent — eligible for re-election in 2026',
          addLabel: 'Add House District 71 choice to My Team', candidates: ['rshipp'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'statesenate', short: 'Senate District 28', district: 'Utah Senate District 28', chamber: 'Utah State Senate',
          color: '#a78bfa', incumbentPid: 'evickers', incumbentNote: 'Incumbent — your current state senator',
          addLabel: 'Add Senate District 28 choice to My Team', candidates: ['evickers'],
          extraNote: '2026 challenger filings for this district are still being certified — more candidates will appear here.' },
        { raceKey: 'house', short: 'Congressional District 2', district: 'Utah Congressional District 2', chamber: 'U.S. House of Representatives',
          color: '#60a5fa', incumbentPid: 'maloy', incumbentNote: 'Incumbent — running for re-election in 2026',
          incumbentSince: 2023, incumbentSummary: 'Former county attorney representing Utah’s 2nd District, first elected in a 2023 special election.',
          addLabel: 'Add Congressional District 2 choice to My Team', candidates: ['maloy'],
          extraNote: 'The 2026 field is still forming — more candidates will appear here as filings are confirmed.' }
      ]
    };

    var KR_CONGRESSIONAL_INCUMBENTS = {
      1: { pid: 'bmoore', label: 'Incumbent — current Utah U.S. Representative' },
      2: { pid: 'maloy',  label: 'Incumbent — current Utah U.S. Representative' },
      3: { pid: 'kennedy', label: 'Incumbent — current Utah U.S. Representative' },
      4: { pid: 'owens',  label: 'Incumbent — current Utah U.S. Representative' }
    };
    // Sitting Utah State Representative per district. Keys are POST-2023 district
    // numbers and must agree with `_UTAH_HOUSE_INFO[pid].d` — and since the July 2026
    // follow-up pass that agreement runs BOTH ways (assertion 10e in
    // scripts/test-identity-integrity.mjs), so every key here has an info entry and
    // vice versa. Several ids encode a pre-redistricting number in their suffix —
    // `bolinder_h68` sits in 29, `hollins_h24` in 21, `albrecht_h67` turned out to be
    // District 70's member — so key off the district, never the suffix.
    //
    // Corrected July 2026 against the public record, when _UTAH_HOUSE_INFO was added
    // and made these disagreements visible for the first time:
    //   • 45→44 `teuscher_h44` — District 45 is Tracy Miller's seat.
    //   • 57→56 `valpeterson_h56` — District 57 is Nelson Abbott's seat.
    //   • 62→61 `lisa_shepherd` — District 62 is Norm Thurston's seat.
    //   In all three the member's own cmp-data.js record already had the right
    //   number; only this table was wrong.
    //   • District 3 dropped: it pointed at `stephanie_gricius_h3`, an id with no
    //     roster record, no stance block and no Spotlight card, for a member who sits
    //     in District 50 and is already wired there as `gricius_h50`. One person in
    //     two seats is the bug class section 10 exists to catch, and District 3's
    //     actual member is not in the data set — so it degrades to "no incumbent",
    //     which is honest, rather than naming someone else's representative.
    //
    // PHANTOM IDS REMOVED in the follow-up pass. Six districts were wired to ids that
    // existed in no other file, so `candidates: [incPid]` handed the UI a pid that
    // could never resolve a profile. Each seat's real member was already in the data
    // set under the id carrying their curated stance block, so the district was
    // re-keyed to that id and the phantom deleted:
    //   hooper_h22      → jennifer_dailey_provost (Jennifer Dailey-Provost, D-Salt Lake
    //                     City; no Utah legislator named Hooper exists)
    //   nelson_h28      → nicholeen_p_peck        (Nicholeen Peck, R-Tooele, seated 2025)
    //   matthews_h36    → james_dunnigan          (James Dunnigan, R-Taylorsville)
    //   judkins_h42     → clinton_okerlund        (Clint Okerlund, R-Sandy, seated 2025;
    //                     Marsha Judkins left the House and is now Provo's mayor, which
    //                     is how she appears in cmp-data.js as `marsha_judkins_provo`)
    //   albrecht_h67    → christine_watkins       (Christine Watkins, R-Price). The id
    //                     named a real person at the wrong seat: Carl Albrecht's suffix
    //                     was his pre-2023 number and he now holds District 70, where
    //                     he is wired below as `carl_albrecht`.
    //   phil_lyman_h69  → logan_monson            (Logan Monson, R-Blanding). Lyman left
    //                     the House for a 2024 statewide run and Monson succeeded him in
    //                     January 2025, so the old id was a former member on a live seat.
    //
    // MULTI-SEAT AND DRIFT CASES RESOLVED at the same time:
    //   • `jwestwood` was the incumbent for BOTH 70 and 71 while his own record read
    //     District 73. He is none of them: Rex Shipp succeeded him in January 2019, so
    //     he is a former member and his roster record now says so. District 70 is Carl
    //     Albrecht's and District 71 is Shipp's.
    //   • `rshipp` moved 75→71. Shipp lives in Cedar City (Iron County) and has held
    //     District 71 since 2023; the "St. George" label belonged to District 75, which
    //     is Walt Brooks's seat and is now wired to him.
    //   • `hollins_h24` moved 24→21. Sandra Hollins has held District 21 since 2023
    //     (District 23 before that); District 24 is Grant Miller's, seated 2025.
    //   • District 6 REOPENED and now wired: Matthew Gwynn resigned effective March
    //     2026, at the close of the general session, and the seat was left at "no
    //     incumbent" because its successor was in the data set only as a FORMER U.S.
    //     Representative. Rob Bishop won the April 25, 2026 GOP delegate special
    //     election and was seated May 6, 2026, filling the remainder of the term to
    //     January 2027. He now has a state-House roster record and the district is
    //     wired to `rob_bishop` — see the cmp-data.js comment on that record for why
    //     his congressional service lives in the profile blurb and the Spotlight card
    //     label rather than in `office`, which 10g requires to name the current seat.
    //
    // CLEARED in the second July 2026 pass — three of the notes below turned out to be
    // blocked only on a missing roster record, not on a missing fact, so each was wired
    // once its seat was confirmed against the public record:
    //   • District 23 → `hoang_nguyen` (Hoang Nguyen, D-Salt Lake City, succeeded Brian
    //     King, seated Jan 2025). Her roster record now exists, so 10e/10g can check it.
    //   • District 37 → `ashlee_matthews` (Ashlee Matthews, D-Kearns, seated 2021 at the
    //     old District 38, renumbered 37 in 2023). Her seat is no longer "unconfirmed".
    //   • District 43 → `eliason_h45` (Steve Eliason, R-Sandy). He held District 45 from
    //     2011 to 2023 and 43 since; the suffix, his roster label and the `sandy` region
    //     block were all still on the pre-2023 number. All three now read 43, and 10i
    //     guards that block for the first time.
    //
    // CLEARED in the third July 2026 pass, which took the two content decisions the
    // pass before it had declined to make:
    //   • District 6 → `rob_bishop`, with a state-House roster record added and his
    //     federal service moved to the surfaces that can date it (above).
    //   • `calbrecht`, the second Carl Albrecht identity, was merged into
    //     `carl_albrecht` — the roster id District 70 was already wired to. Its six
    //     bill-sourced stance cards, Evidence Locker group, profile blurb, consistency
    //     headline and (bogus 'STATE SENATE') Power-Map row all moved to the canonical
    //     id, and the retired id is registered in db/vr-pid-aliases.json with
    //     ACCT_ALIAS keeping old saved picks resolvable.
    //
    // CLEARED in the fourth July 2026 pass — the last three seats whose sitting member
    // was content-bearing here (a curated stance block) but roster-less, which is what
    // had kept them out of both tables. Each district was confirmed against the public
    // record first:
    //   • District 45 → `tracy_miller` (R-South Jordan, seated Jan 2025, succeeded
    //     Susan Pulsipher). This was the last seat wired to nobody.
    //   • District 60 → `grant_pace` (R-Provo, sworn in May 2026 after Tyler Clancy
    //     resigned to become the state homelessness coordinator). The Provo seat is 60,
    //     not the 61 the `utah_co` region block features — 61 is Lisa Shepherd's.
    //   • District 64 → `jackie_larson` (R-Spanish Fork, seated May 5, 2026 for the
    //     remainder of Jefferson Burton's term; he resigned after moving out of the
    //     district). Nothing stale had to be moved out of the way: `jburton` has no
    //     roster record and appeared in neither Utah House table, so he never held the
    //     seat here. Same for `tyler_clancy` at 60.
    //
    // STILL OPEN, deliberately not guessed at:
    // CLEARED in the fifth July 2026 pass — a full sweep of all 75 seats against both
    // tables, which turned up nine more members in the roster-less-but-content-bearing
    // state above (31, 33, 34, 41, 46, 49, 51, 53, 65) and two, `mschultz` at 12 and
    // `aromero` at 25, that had roster records but had never been mapped. Both of the
    // latter carried a wrong or missing district on their own record, which is what
    // being outside _UTAH_HOUSE_INFO had hidden.
    //
    // STILL OPEN, deliberately not guessed at:
    //   • The 24 districts absent from this table are absent because no id in the data
    //     set holds them. Bidirectionality means an entry here without an info entry now
    //     fails CI, so the honest state of an uncovered seat is no key at all.
    //   • Three roster records name a district that belongs to somebody else and are
    //     outside this map, so nothing fails: `fgibson` reads District 60 (Grant
    //     Pace's), `jknotts` reads District 65 (Doug Welton's) under a name that looks
    //     like a garbled "John Knotwell" — a former District 52 member — and
    //     `jdraxler` reads District 3 though he left in 2017. Each is a former-member
    //     label to correct, not a seat to re-key.
    //   • `jburton`'s Power-Map META row still reads `['pm-tier-state','STATE HOUSE',
    //     'davis','district1']`. Both halves are wrong — Salem is Utah County (UT-3),
    //     and he is a former member as of March 2026 — but fixing the county while
    //     leaving the sitting-member tier would be half a repair, and retiring the row
    //     is a content call about how former members appear on the Power Map.
    var KR_STATE_HOUSE_INCUMBENTS = {
      4:'auxier_h4', 5:'snider_h5', 6:'rob_bishop', 9:'jake_sawyer', 10:'koford_h10',
      11:'hall_h11', 12:'mschultz', 14:'lisonbee_h14', 15:'defay_h15', 16:'tlee',
      19:'rward', 21:'hollins_h24', 22:'jennifer_dailey_provost', 23:'hoang_nguyen', 24:'grant_miller',
      25:'aromero', 28:'nicholeen_p_peck', 29:'bolinder_h68', 30:'fitisemanu_h30', 31:'verona_mauga',
      33:'doug_owens', 34:'carol_spackman_moss', 36:'james_dunnigan', 37:'ashlee_matthews', 39:'ivory_h39',
      41:'john_arthur', 42:'clinton_okerlund', 43:'eliason_h45', 44:'teuscher_h44', 45:'tracy_miller',
      46:'calvin_roberts', 49:'candice_pierucci', 50:'gricius_h50', 51:'leah_hansen', 52:'cory_maloy_h52',
      53:'kay_christofferson', 55:'jon_hawkins', 56:'valpeterson_h56', 59:'kohler_h59', 60:'grant_pace', 61:'lisa_shepherd',
      63:'whyte_h63', 64:'jackie_larson', 65:'doug_welton', 66:'shelley_h66', 67:'christine_watkins',
      68:'chew_h68', 69:'logan_monson', 70:'carl_albrecht', 71:'rshipp', 73:'colin_w_jack',
      75:'walt_brooks'
    };
    // Sitting Utah State Senator per district. Keys are POST-2023 district numbers
    // and must agree with `_UTAH_SENATE_INFO[pid].d` for every pid that appears in
    // both tables — and, since July 2026, every pid here appears in both, because
    // assertion 10a is now bidirectional. Several ids encode a pre-redistricting
    // number in their suffix — `mccay_s11` sits in District 18, `brammer_s21` really
    // is 21 — so key off the district, never the suffix.
    // Corrected July 2026: Adams added at 7, Weiler added at 8, Escamilla added at
    // 10, McCay 17→18, Brammer 22→21, Grover 24→23, Stratton added at 24 (he won
    // Bramble's seat and was sworn in Jan 2025).
    //
    // COMPLETE as of the fifth July 2026 pass: all 29 districts are named. The last
    // five — 4, 11, 14, 15, 22 — had been left as no key at all rather than a guess,
    // because none of their senators had a roster record for the tables to check
    // against. Four of the five were already content-bearing under the ids used here
    // and only needed the record: 4 → `cmusselman` (Calvin Musselman, R-West Haven,
    // seated Jan 2025 succeeding Gregg Buxton), 11 → `emily_buss` (Emily Buss,
    // Forward Party, appointed Dec 2025 to Daniel Thatcher's vacated seat), 14 →
    // `stephanie_pitcher` (D-Salt Lake City, seated Jan 2023, previously House
    // District 40), 15 → `kathleen_riebe` (D-Cottonwood Heights, Senate Minority
    // Whip, elected 2018 at the pre-redistricting District 8), 22 →
    // `heidi_balderree` (R-Saratoga Springs, seated Oct 2023 succeeding Jake
    // Anderegg). Because 10a is bidirectional, an entry here now requires a matching
    // `_UTAH_SENATE_INFO` entry whose `d` agrees, and vice versa.
    //
    // PHANTOM IDS REMOVED (July 2026). Seven districts were wired to ids that existed
    // in no other file — no cmp-data.js record, no stance block, no Spotlight card —
    // so `candidates: [incPid]` handed the UI a pid that could never resolve a
    // profile. In six cases the senator was already in the data set under the id
    // carrying their curated content, so the district was re-keyed to that id:
    //   chris_wilson_s2      → cwilson          (Chris Wilson, R-Logan)
    //   jen_plumb_s9         → jennifer_plumb   (Jennifer Plumb, D-Salt Lake City)
    //   lincoln_fillmore_s11 → lincoln_fillmore (Lincoln Fillmore, R-South Jordan; the
    //                          suffix was the pre-2023 number, the seat is 17)
    //   ron_winterton_s20    → rwinterton       (Ronald Winterton, R-Roosevelt)
    //   hinkins_s26          → dhinkins         (David Hinkins, R-Orangeville)
    //   derrin_owens_s27     → dowens_st        (Derrin Owens, R-Fountain Green)
    // The seventh, `fillerup_s3`, named nobody: District 3 is held by John Johnson
    // (R-North Ogden), who was already in the data set as `john_johnson`. There is no
    // Utah senator named Fillerup, so the id was not a label problem to correct but a
    // non-person to delete, and District 3 now points at Johnson.
    var KR_STATE_SENATE_INCUMBENTS = {
      1:'ssandall', 2:'cwilson', 3:'john_johnson', 4:'cmusselman', 5:'amillner',
      6:'jstevenson', 7:'sadams', 8:'tweiler', 9:'jennifer_plumb', 10:'lescamilla',
      11:'emily_buss', 12:'kwan_s12', 13:'blouin_s13', 14:'stephanie_pitcher', 15:'kathleen_riebe',
      16:'harper_s16', 17:'lincoln_fillmore', 18:'mccay_s11', 19:'kcullimore', 20:'rwinterton',
      21:'brammer_s21', 22:'heidi_balderree', 23:'kgrover', 24:'kstratton', 25:'mckell_s25',
      26:'dhinkins', 27:'dowens_st', 28:'evickers', 29:'dipson'
    };

    function _krGenericRace(location, raceKey, num) {
      var isHouse = raceKey === 'statehouse';
      var isSenate = raceKey === 'statesenate';
      var chamber = isHouse ? 'Utah State House' : (isSenate ? 'Utah State Senate' : 'U.S. House of Representatives');
      var short = (isHouse ? 'House District ' : (isSenate ? 'Senate District ' : 'Congressional District ')) + num;
      var district = (isHouse ? 'Utah House District ' : (isSenate ? 'Utah Senate District ' : 'Utah Congressional District ')) + num;
      var incPid = isHouse ? KR_STATE_HOUSE_INCUMBENTS[num] : (isSenate ? KR_STATE_SENATE_INCUMBENTS[num] : (KR_CONGRESSIONAL_INCUMBENTS[num] && KR_CONGRESSIONAL_INCUMBENTS[num].pid));
      var race = {
        raceKey: raceKey,
        short: short,
        district: district,
        chamber: chamber,
        color: isHouse ? '#2dd4bf' : (isSenate ? '#a78bfa' : '#60a5fa'),
        incumbentPid: incPid || null,
        incumbentNote: isHouse || isSenate ? 'District mapped from official Utah legislative boundaries' : (KR_CONGRESSIONAL_INCUMBENTS[num] && KR_CONGRESSIONAL_INCUMBENTS[num].label) || 'District mapped from official Utah congressional boundaries',
        addLabel: 'Add ' + short + ' choice to My Team',
        candidates: incPid ? [incPid] : [],
        extraNote: location.city + ', ' + location.county + ' is mapped to this district using Utah’s official district boundaries. Candidate rosters will expand as local filings and profiles are added.'
      };
      if (!incPid) delete race.incumbentPid;
      return race;
    }

    function _krBuildLocationRaces(location) {
      return [
        _krGenericRace(location, 'statehouse', location.houseDistrict),
        _krGenericRace(location, 'statesenate', location.senateDistrict),
        _krGenericRace(location, 'house', location.congressDistrict)
      ];
    }

    KEY_RACES_LOCATIONS.forEach(function(location) {
      if (location.houseDistrict && location.senateDistrict && location.congressDistrict) {
        KEY_RACES_BY_LOCATION[location.id] = _krBuildLocationRaces(location);
      }
    });

    // ── Statewide races — shown for EVERY location ──────────────────────
    // Governor and U.S. Senate represent the whole state, so they appear
    // above the district races no matter which area is selected. Same card
    // shape as the district races, so the "Add to My Team" buttons, scores,
    // Compare/Spotlight and pick logic all behave identically. The team
    // already reserves a 'governor' and 'senate' slot for Utah, so picks
    // land in the same 6-slot "My Voting Team" grid.
    var KEY_RACES_STATEWIDE = [
      {
        raceKey: 'governor', short: 'Governor',
        district: 'Governor of Utah', chamber: 'Statewide · Executive',
        color: '#34d399', incumbentPid: 'cox',
        ballot: { tone: 'future', label: 'Next Election · 2028' },
        incumbentNote: 'Incumbent — elected 2020, re-elected 2024 · next up 2028',
        incumbentSince: 2021,
        incumbentSummary: 'Utah’s 18th governor. Signs every state law and budget — known for rural development, water policy and mental-health initiatives.',
        addLabel: 'Add your Governor pick to My Team',
        candidates: ['cox', 'lyman'],
        candidatesLabel: 'Challenged for This Seat · 2024',
        extraNote: 'Utah’s governorship is a four-year office, last contested in 2024 and next on the ballot in 2028. It’s shown for every Utah voter because the Governor signs every state law and budget — add the leader whose record you want to track.'
      },
      {
        // Utah elects the Governor and Lieutenant Governor together on ONE ticket,
        // so there is no separate Lt. Governor vote — but the office is second-in-
        // command and next in line, so it's shown here (right after the Governor)
        // for statewide awareness and record-tracking. Marked `reference: true` so
        // the card offers Profile/track rather than an "Add to My Team" button (its
        // raceKey isn't a standalone ballot slot, so a pick would have nowhere to
        // land); `tone: 'future'` keeps it out of the ballot-coverage tally, exactly
        // like the U.S. Senate reference card below.
        raceKey: 'ltgovernor', short: 'Lt. Governor', reference: true,
        district: 'Lt. Governor of Utah', chamber: 'Statewide · Executive',
        color: '#5eead4', incumbentPid: 'dhenderson',
        ballot: { tone: 'future', label: 'Joint Ticket · Elected with the Governor' },
        incumbentNote: 'Elected with Gov. Cox (2020, re-elected 2024) · next up 2028',
        incumbentSince: 2021,
        incumbentSummary: 'Utah’s Lieutenant Governor — the state’s chief election officer and second-in-command, who steps in for the Governor and oversees elections.',
        candidates: ['dhenderson'],
        extraNote: 'Utah elects the Governor and Lieutenant Governor together on a single ticket, so there is no separate Lt. Governor choice on your ballot. The office is shown for the whole state because the Lt. Governor runs Utah’s elections and is first in line to the governorship — track their record here.'
      },
      {
        raceKey: 'senate', short: 'U.S. Senate',
        district: 'U.S. Senate — Utah', chamber: 'Statewide · Federal',
        color: '#818cf8', incumbentPid: 'lee', incumbentPids: ['lee', 'curtis'],
        ballot: { tone: 'future', label: 'Neither Seat Up in 2026' },
        incumbentNote: 'Seat NOT on the 2026 ballot · Next election 2028',
        incumbentSince: { lee: 2011, curtis: 2025 },
        incumbentNotes: {
          lee: 'Seat NOT on the 2026 ballot · Next election 2028',
          curtis: 'Seat NOT on the 2026 ballot · Next election 2030'
        },
        incumbentSummary: {
          lee: 'Utah’s senior U.S. Senator and a leading constitutional-conservative voice in Washington. His seat was last contested in 2022.',
          curtis: 'Utah’s junior U.S. Senator, formerly the 3rd District congressman, focused on energy and the environment. He won this seat in 2024.'
        },
        addLabel: 'Add your U.S. Senate pick to My Team',
        candidates: ['lee', 'curtis'],
        extraNote: 'Utah’s two U.S. Senate seats are elected in different years, so a seat is on the ballot only once every six years — and neither falls in 2026. Sen. Lee’s seat is next contested in 2028 and Sen. Curtis’s in 2030. Both senators represent every Utah voter, so their records are shown here for reference, but there is no U.S. Senate choice to make on your 2026 ballot.'
      }
    ];

    // ── LOCAL races — county, city and school board, by area ────────────
    // Kept SEPARATE from KEY_RACES_BY_LOCATION (which the boundary builder
    // rebuilds and which feeds the main Key Races page) so these purely
    // additive local offices surface only in the balanced multi-level Home
    // Team view via _hbrxResolve. Each seat carries an explicit `level` so it
    // drops into the right level section. Officeholder/candidate records are
    // confirmed over time; until then each seat shows its graceful "field
    // forming" state and fills automatically as verified data lands. Add a new
    // area's county/city/school offices here and they appear with zero UI work.
    var KEY_RACES_LOCAL_BY_LOCATION = {
      // ── Layton / Davis County ──
      davis: [
        {
          raceKey: 'county_commission', level: 'county',
          short: 'County Commission', district: 'Davis County Commission',
          chamber: 'Davis County Commission', color: '#f59e0b',
          incumbentPids: ['john_crofts', 'lorene_kamalu', 'bob_stevenson'],
          incumbentNote: 'The three sitting members of the Davis County Commission.',
          candidates: ['susan_lee'],
          extraNote: 'Davis County’s three-member Commission sets the county budget and oversees roads, public safety and health services. Seat B is on your 2026 ballot — Republican nominee Susan Lee advanced from the June primary, and additional certified candidates will appear here automatically.'
        },
        {
          raceKey: 'sheriff', level: 'county',
          short: 'County Sheriff', district: 'Davis County Sheriff',
          chamber: 'Davis County Sheriff', color: '#f59e0b',
          incumbentPid: 'kelly_sparks',
          incumbentNote: 'Serves as the elected Davis County Sheriff.',
          candidates: [],
          extraNote: 'The elected Sheriff runs the county jail and countywide law enforcement. Sheriff Kelly V. Sparks currently holds the seat; any 2026 challengers will appear here automatically as filings are confirmed.'
        },
        {
          raceKey: 'county_clerk', level: 'county',
          short: 'Clerk / Auditor', district: 'Davis County Clerk/Auditor',
          chamber: 'Davis County Clerk/Auditor', color: '#f59e0b',
          candidates: [],
          extraNote: 'The Clerk/Auditor runs Davis County elections and audits county spending. Officeholder and 2026 candidate records are being confirmed and will appear here.'
        },
        {
          raceKey: 'mayor', level: 'city',
          short: 'Mayor', district: 'Mayor of Layton',
          chamber: 'Layton City', color: '#22d3ee',
          ballot: { tone: 'future', label: 'Next Election · 2027' },
          incumbentPid: 'jpetro',
          incumbentNote: 'Serves as the elected Mayor of Layton.',
          candidates: [],
          extraNote: 'Layton’s Mayor leads city services — police, roads, zoning and the city budget. Municipal offices are elected in odd years, so this seat is next up in 2027. Mayor Joy Petro currently holds the seat; any challengers appear here automatically as filings are confirmed.'
        },
        {
          raceKey: 'citycouncil', level: 'city',
          short: 'City Council · At Large', district: 'Layton City Council',
          chamber: 'Layton City Council', color: '#22d3ee',
          ballot: { tone: 'future', label: 'Next Election · 2027' },
          incumbentPids: ['zach_bloxham', 'clint_morris', 'tyson_roberts'],
          incumbentNote: 'Sitting members of the five-seat Layton City Council.',
          candidates: [],
          extraNote: 'Layton’s City Council sets local ordinances, land use and the city budget. Council seats are elected in odd years (next in 2027). Additional members and candidates appear here as records are confirmed.'
        },
        {
          raceKey: 'schoolboard', level: 'school',
          short: 'Your Precinct Seat', district: 'Davis School District Board of Education',
          chamber: 'Davis Board of Education', color: '#f472b6',
          incumbentPids: ['brigit_gerrard', 'michelle_barber', 'kristen_hogan'],
          incumbentNote: 'Davis Board of Education members whose precincts include Layton.',
          candidates: [],
          extraNote: 'The Davis Board of Education sets school budgets, boundaries and classroom policy for your local public schools. Three of its seven precincts include Layton — Precinct 4 (Gerrard), Precinct 5 (Barber) and Precinct 6 (Hogan). Four seats are on the November 2026 ballot; certified candidates appear here automatically.'
        }
      ],
      // ── Logan / Cache County ──
      cache: [
        {
          raceKey: 'county_executive', level: 'county',
          short: 'County Executive', district: 'Cache County Executive',
          chamber: 'Cache County Executive', color: '#f59e0b',
          incumbentPid: 'george_daines',
          incumbentNote: 'Serves as the elected Cache County Executive.',
          candidates: [],
          extraNote: 'Cache County uses a council–executive form of government: the elected County Executive is the county’s chief executive, running day-to-day operations and proposing the budget. Executive George Daines currently holds the seat; any 2026 challengers will appear here automatically as filings are confirmed.'
        },
        {
          raceKey: 'county_council', level: 'county',
          short: 'County Council', district: 'Cache County Council',
          chamber: 'Cache County Council', color: '#f59e0b',
          incumbentPids: ['sandi_goodlander', 'kathryn_beus', 'david_erickson_cache', 'keegan_garrity', 'joann_bennett', 'mark_hurd', 'nolan_gunnell'],
          incumbentNote: 'The seven members of the Cache County Council.',
          candidates: [],
          extraNote: 'Cache County’s seven-member Council sets the county budget and tax rate and oversees roads, public safety and health services. The council unanimously adopted an 18% property-tax increase for 2026, and any seats up this cycle will show their certified candidates here automatically.'
        },
        {
          raceKey: 'sheriff', level: 'county',
          short: 'County Sheriff', district: 'Cache County Sheriff',
          chamber: 'Cache County Sheriff', color: '#f59e0b',
          incumbentPid: 'chad_jensen',
          incumbentNote: 'Serves as the elected Cache County Sheriff.',
          candidates: [],
          extraNote: 'The elected Sheriff runs the county jail, search-and-rescue and countywide law enforcement. Sheriff Chad Jensen currently holds the seat; any 2026 challengers will appear here automatically as filings are confirmed.'
        },
        {
          raceKey: 'mayor', level: 'city',
          short: 'Mayor', district: 'Mayor of Logan',
          chamber: 'Logan City', color: '#22d3ee',
          incumbentPid: 'mark_anderson_logan',
          incumbentNote: 'Serves as the Mayor of Logan.',
          candidates: [],
          extraNote: 'Logan’s Mayor leads city services — police, roads, water, zoning and the city budget. Mayor Mark Anderson took office in January 2026. Municipal offices are elected in odd years and are nonpartisan; the next city election is in 2029.'
        },
        {
          raceKey: 'schoolboard_ccsd', level: 'school',
          short: 'County School Board', district: 'Cache County School District Board',
          chamber: 'Cache County Board of Education', color: '#f472b6',
          incumbentPids: ['teri_rhodes', 'brian_chambers', 'roger_pulsipher', 'randall_bagley', 'd_jeffrey_nielsen', 'allen_grunig', 'kathy_christiansen'],
          incumbentNote: 'The seven members of the Cache County School Board (communities surrounding Logan).',
          candidates: [],
          extraNote: 'The Cache County School District serves the communities surrounding Logan. Its seven-member board carried out a voter-approved $139M 2023 construction bond — funding new middle schools in Hyde Park and Nibley — and in 2025 approved a 28.1% property-tax revenue increase that the Utah State Tax Commission then denied on procedural grounds. Three seats are on the November 2026 ballot: District 2 (Roger Pulsipher vs. Aaron Ritchey), District 4 (Randall Bagley vs. Deidra Hartwell) and District 7 (Teri Rhodes vs. Mylind Fawcett). School-board offices are nonpartisan.'
        },
        {
          raceKey: 'schoolboard_logan', level: 'school',
          short: 'Logan School Board', district: 'Logan City School District Board',
          chamber: 'Logan City Board of Education', color: '#f472b6',
          incumbentPids: ['becky_quay', 'cole_checketts', 'russell_fisher', 'katie_chapman', 'frank_stewart'],
          incumbentNote: 'The five members of the Logan City School Board (schools within Logan).',
          candidates: [],
          extraNote: 'The Logan City School District governs the public schools within Logan. Its five-member board raised member compensation on a contested 3-1 vote in 2025, with District 5’s Cole Checketts the consistent lone dissenter. Two seats are on the November 2026 ballot: District 3 (interim member Russell Fisher vs. Charles Ashurst) and District 5 (Cole Checketts vs. Karlee Fryer). School-board offices are nonpartisan.'
        }
      ]
    };
    // Clearfield-area cities (Clearfield, Syracuse, Clinton, West Point, Sunset)
    // sit inside Davis County, so they share the SAME county-wide Commission,
    // Sheriff, Clerk/Auditor and Davis School District seats. Without this the
    // Clearfield locId had no local slate and every local level fell back to
    // "Data coming soon". City offices differ by municipality, so only the
    // county- and school-level seats are reused here (Clearfield's own city
    // offices stay pending rather than mislabelling them as Layton's).
    KEY_RACES_LOCAL_BY_LOCATION.clearfield = KEY_RACES_LOCAL_BY_LOCATION.davis.filter(function (r) {
      return r.level !== 'city';
    });
    window.KEY_RACES_LOCAL_BY_LOCATION = KEY_RACES_LOCAL_BY_LOCATION;

    // Infer a location id from the user's real voter location, if it maps
    // to one of the supported areas. Returns '' when there is no match.
    // Callers (e.g. the district map after geocoding an address) may pass an
    // explicit city/county to resolve the SAME curated area the main page would
    // use for that place, instead of the voter's currently-saved location — this
    // is what keeps the map's districts identical to Key Races / Relevant to Me.
    function _krInferLocation(overrideCity, overrideCounty) {
      var loc = window._currentVoterLocation || {};
      var county = ((overrideCounty != null && overrideCounty !== '' ? overrideCounty
                     : (window._vhCurrentCounty || loc.county || '')) + '').toLowerCase();
      var city = ((overrideCity != null && overrideCity !== '' ? overrideCity
                   : (loc.city || '')) + '').toLowerCase();
      // City-specific matches first (so a city resolves to its own area before the
      // broader county fallback), then county-level fallbacks for anything else.

      // City lists below are intentionally broad: every incorporated Utah town
      // (plus common unincorporated communities) routes to the area whose
      // U.S. House / State Senate / State House representation it shares, so a
      // voter anywhere in the state resolves to the right slate even when only a
      // small town name is known. County-level fallbacks catch anything else.

      // ── Salt Lake County ──
      if (city.indexOf('west valley') !== -1 || city === 'kearns' || city === 'magna') return 'west_valley';
      if (city.indexOf('west jordan') !== -1) return 'west_jordan';
      if (city.indexOf('south jordan') !== -1 || city === 'riverton' || city === 'herriman' || city === 'bluffdale' || city === 'copperton') return 'south_jordan';
      if (city === 'sandy' || city.indexOf('cottonwood heights') !== -1 || city === 'midvale' || city === 'draper' || city === 'alta' || city === 'brighton') return 'sandy';
      if (city.indexOf('salt lake city') !== -1 || city === 'slc' || city === 'millcreek' || city === 'holladay' || city === 'murray' || city === 'taylorsville' || city === 'south salt lake' || city === 'emigration canyon') return 'slc';
      if (county.indexOf('salt lake') !== -1) return 'slc';

      // ── Davis County ──
      if (city === 'clearfield' || city === 'syracuse' || city === 'clinton' || city === 'west point' || city === 'sunset') return 'clearfield';
      if (county.indexOf('davis') !== -1 || city === 'layton' || city === 'bountiful' || city === 'kaysville' || city === 'farmington' || city === 'centerville' || city === 'woods cross' || city === 'north salt lake' || city === 'west bountiful' || city === 'fruit heights' || city === 'south weber') return 'davis';

      // ── Weber County ──
      if (city === 'south ogden' || city === 'roy' || city === 'riverdale' || city === 'washington terrace') return 'south_ogden';
      if (county.indexOf('weber') !== -1 || city === 'ogden' || city === 'north ogden' || city === 'west haven' || city === 'pleasant view' || city === 'farr west' || city === 'harrisville' || city === 'plain city' || city === 'marriott-slaterville' || city === 'hooper' || city === 'huntsville' || city === 'eden' || city === 'liberty') return 'weber';

      // ── Utah County ──
      if (city === 'spanish fork' || city === 'salem' || city === 'woodland hills' || city === 'elk ridge' || city === 'spring lake' || city === 'benjamin') return 'south_utah_co';
      if (city === 'orem' || city === 'vineyard') return 'orem';
      if (city === 'lehi' || city === 'eagle mountain' || city === 'saratoga springs' || city === 'american fork' || city === 'highland' || city === 'pleasant grove' || city === 'lindon' || city === 'alpine' || city === 'cedar hills' || city === 'cedar fort' || city === 'fairfield') return 'lehi';
      if (county.indexOf('utah') !== -1 || city === 'provo' || city === 'springville' || city === 'mapleton' || city === 'payson' || city === 'santaquin' || city === 'goshen' || city === 'genola') return 'utah_co';

      // ── Northern Utah ──
      if (county.indexOf('box elder') !== -1 || city === 'brigham city' || city === 'tremonton' || city === 'perry' || city === 'willard' || city === 'mantua' || city === 'garland' || city === 'corinne' || city === 'bear river city' || city === 'deweyville' || city === 'fielding' || city === 'honeyville' || city === 'snowville' || city === 'plymouth' || city === 'portage') return 'box_elder';
      if (county.indexOf('cache') !== -1 || city === 'logan' || city === 'north logan' || city === 'smithfield' || city === 'hyrum' || city === 'providence' || city === 'nibley' || city === 'river heights' || city === 'wellsville' || city === 'mendon' || city === 'millville' || city === 'hyde park' || city === 'lewiston' || city === 'richmond' || city === 'cornish' || city === 'clarkston' || city === 'newton' || city === 'trenton' || city === 'paradise' || city === 'amalga') return 'cache';
      if (county.indexOf('rich') !== -1 || city === 'randolph' || city === 'garden city' || city === 'laketown' || city === 'woodruff') return 'rich';
      if (county.indexOf('tooele') !== -1 || city === 'tooele' || city === 'grantsville' || city === 'stansbury park' || city === 'erda' || city === 'lake point' || city === 'stockton' || city === 'wendover' || city === 'vernon' || city === 'rush valley' || city === 'ophir' || city === 'dugway') return 'tooele';
      if (county.indexOf('morgan') !== -1 || city === 'morgan' || city === 'mountain green' || city === 'croydon' || city === 'porterville') return 'morgan';
      if (county.indexOf('summit') !== -1 || city === 'coalville' || city === 'park city' || city === 'kamas' || city === 'oakley' || city === 'francis' || city === 'henefer' || city === 'hoytsville' || city === 'peoa' || city === 'snyderville' || city === 'wanship' || city === 'marion') return 'summit';

      // ── Eastern Utah ──
      if (county.indexOf('daggett') !== -1 || city === 'manila' || city === 'dutch john') return 'daggett';
      if (county.indexOf('duchesne') !== -1 || city === 'duchesne' || city === 'roosevelt' || city === 'myton' || city === 'altamont' || city === 'tabiona' || city === 'neola' || city === 'fruitland' || city === 'bluebell' || city === 'hanna' || city === 'talmage') return 'duchesne';
      if (county.indexOf('uintah') !== -1 || city === 'vernal' || city === 'naples' || city === 'ballard' || city === 'jensen' || city === 'lapoint' || city === 'tridell' || city === 'fort duchesne' || city === 'whiterocks' || city === 'gusher' || city === 'randlett') return 'uintah';
      if (county.indexOf('carbon') !== -1 || city === 'price' || city === 'helper' || city === 'wellington' || city === 'east carbon' || city === 'sunnyside' || city === 'scofield' || city === 'kenilworth' || city === 'spring glen') return 'carbon';
      if (county.indexOf('emery') !== -1 || city === 'castle dale' || city === 'huntington' || city === 'green river' || city === 'ferron' || city === 'orangeville' || city === 'cleveland' || city === 'elmo' || city === 'clawson' || city === 'emery') return 'emery';
      if (county.indexOf('grand') !== -1 || city === 'moab' || city === 'castle valley' || city === 'thompson springs' || city === 'spanish valley') return 'grand';
      if (county.indexOf('san juan') !== -1 || city === 'monticello' || city === 'blanding' || city === 'bluff' || city === 'montezuma creek' || city === 'mexican hat' || city === 'la sal' || city === 'aneth' || city === 'white mesa' || city === 'halchita') return 'san_juan';

      // ── Central Utah ──
      if (county.indexOf('wasatch') !== -1 || city === 'heber city' || city === 'heber' || city === 'midway' || city === 'charleston' || city === 'daniel' || city === 'wallsburg' || city === 'independence' || city === 'hideout') return 'wasatch';
      if (county.indexOf('juab') !== -1 || city === 'nephi' || city === 'mona' || city === 'levan' || city === 'eureka' || city === 'rocky ridge') return 'juab';
      if (county.indexOf('sanpete') !== -1 || city === 'manti' || city === 'ephraim' || city === 'mount pleasant' || city === 'gunnison' || city === 'fairview' || city === 'moroni' || city === 'spring city' || city === 'fountain green' || city === 'mayfield' || city === 'centerfield' || city === 'fayette' || city === 'sterling' || city === 'wales' || city === 'chester') return 'sanpete';
      if (county.indexOf('millard') !== -1 || city === 'fillmore' || city === 'delta' || city === 'hinckley' || city === 'oak city' || city === 'holden' || city === 'scipio' || city === 'lynndyl' || city === 'leamington' || city === 'meadow' || city === 'kanosh' || city === 'deseret') return 'millard';
      if (county.indexOf('sevier') !== -1 || city === 'richfield' || city === 'salina' || city === 'monroe' || city === 'redmond' || city === 'aurora' || city === 'sigurd' || city === 'glenwood' || city === 'central valley' || city === 'joseph' || city === 'elsinore' || city === 'annabella' || city === 'koosharem') return 'sevier';
      if (county.indexOf('piute') !== -1 || city === 'junction' || city === 'circleville' || city === 'marysvale' || city === 'kingston' || city === 'greenwich') return 'piute';
      if (county.indexOf('wayne') !== -1 || city === 'loa' || city === 'bicknell' || city === 'torrey' || city === 'hanksville' || city === 'lyman' || city === 'teasdale' || city === 'fremont' || city === 'caineville' || city === 'grover') return 'wayne';

      // ── Southern Utah ──
      if (county.indexOf('beaver') !== -1 || city === 'beaver' || city === 'milford' || city === 'minersville' || city === 'greenville' || city === 'adamsville') return 'beaver';
      if (county.indexOf('garfield') !== -1 || city === 'panguitch' || city === 'boulder' || city === 'escalante' || city === 'tropic' || city === 'henrieville' || city === 'cannonville' || city === 'hatch' || city === 'antimony' || city === 'bryce canyon' || city === 'bryce') return 'garfield';
      if (county.indexOf('kane') !== -1 || city === 'kanab' || city === 'orderville' || city === 'glendale' || city === 'mount carmel' || city === 'alton' || city === 'big water' || city === 'duck creek village') return 'kane';
      if (county.indexOf('iron') !== -1 || city.indexOf('cedar city') !== -1 || city === 'enoch' || city === 'parowan' || city === 'paragonah' || city === 'kanarraville' || city === 'brian head') return 'cedar_city';
      if (county.indexOf('washington') !== -1 || city.indexOf('george') !== -1 || city === 'hurricane' || city === 'washington' || city === 'santa clara' || city === 'ivins' || city === 'la verkin' || city === 'toquerville' || city === 'leeds' || city === 'springdale' || city === 'rockville' || city === 'virgin' || city === 'apple valley' || city === 'enterprise' || city === 'veyo' || city === 'central' || city === 'dammeron valley' || city === 'pine valley' || city === 'gunlock' || city === 'hildale') return 'washington';
      return '';
    }

    // Active location: an explicit pick (localStorage) wins; otherwise we
    // infer from the user's real location; otherwise fall back to Davis.
    function _krCurrentLocationId() {
      try {
        var saved = localStorage.getItem(KR_LOCATION_KEY);
        if (saved && KEY_RACES_BY_LOCATION[saved]) return saved;
      } catch (e) {}
      return _krInferLocation() || 'davis';
    }

    function _krLocationMeta(id) {
      for (var i = 0; i < KEY_RACES_LOCATIONS.length; i++) {
        if (KEY_RACES_LOCATIONS[i].id === id) return KEY_RACES_LOCATIONS[i];
      }
      return KEY_RACES_LOCATIONS[0];
    }

    // ── Cross-script-block bridge ────────────────────────────────────────────
    // The curated Key Races rosters, location list, storage key and the two
    // location helpers all live inside THIS IIFE. The "Relevant to Me" renderer
    // (renderRelevantToMe) lives in a SEPARATE <script> IIFE and referenced these
    // by bare name — which threw a ReferenceError the instant a voter had a
    // location set, aborting the render and leaving the section stuck at 0.
    // Publishing them on `window` lets the other block resolve them (and is the
    // single source of truth the renderer now reads from).
    window.KR_LOCATION_KEY      = KR_LOCATION_KEY;
    window.KEY_RACES_LOCATIONS  = KEY_RACES_LOCATIONS;
    window.KEY_RACES_BY_LOCATION = KEY_RACES_BY_LOCATION;
    window.KEY_RACES_STATEWIDE  = KEY_RACES_STATEWIDE;
    window._krInferLocation     = _krInferLocation;
    window._krLocationMeta      = _krLocationMeta;

    // Expose the active area's district numbers so the top "Utah Voter Map" info
    // bar can show the exact U.S. House / State Senate / State House districts for
    // whichever location is selected here. Returns null if data is unavailable.
    window.keyRacesActiveDistricts = function() {
      try {
        var locId = _krCurrentLocationId();
        var races = KEY_RACES_BY_LOCATION[locId];
        if (!races) return null;
        var meta = _krLocationMeta(locId);
        var out = { locId: locId, label: meta.label, city: meta.city, county: meta.county,
                    house: null, senate: null, lower: null };
        races.forEach(function(r) {
          var m = String(r.district || r.short || '').match(/(\d+)\s*$/);
          var num = m ? m[1] : null;
          if (r.raceKey === 'house') out.house = num;
          else if (r.raceKey === 'statesenate') out.senate = num;
          else if (r.raceKey === 'statehouse') out.lower = num;
        });
        return out;
      } catch (e) { return null; }
    };

    // Districts the main page (Key Races / Relevant to Me) actually shows for a
    // given curated area id — read from the SAME race data those surfaces render,
    // so the district map can mirror them exactly instead of relying on its own
    // point-in-polygon detection. Returns numeric {house, senate, congress} (any
    // of which may be null), plus the area's city/county. null if id is unknown.
    window._krDistrictsForLocation = function(id) {
      try {
        var races = KEY_RACES_BY_LOCATION[id];
        if (!races) return null;
        var meta = _krLocationMeta(id);
        var out = { id: id, city: meta.city || '', county: meta.county || '',
                    house: null, senate: null, congress: null };
        races.forEach(function(r) {
          var m = String(r.district || r.short || '').match(/(\d+)\s*$/);
          var num = m ? parseInt(m[1], 10) : null;
          if (r.raceKey === 'statehouse') out.house = num;
          else if (r.raceKey === 'statesenate') out.senate = num;
          else if (r.raceKey === 'house') out.congress = num;
        });
        return out;
      } catch (e) { return null; }
    };

    // Richer companion to keyRacesActiveDistricts(): exposes the exact districts
    // AND the curated candidate/incumbent ids for the active area so the
    // "Relevant to Me" section can show ONLY the politicians on this voter's
    // ballot (their specific U.S. House, State Senate and State House seats),
    // plus the statewide seats every voter in the state shares. Computed here in
    // the Key Races module because this is where the authoritative data lives.
    window.keyRacesRelevantData = function() {
      try {
        var locId = _krCurrentLocationId();
        var races = KEY_RACES_BY_LOCATION[locId];
        if (!races) return null;
        var meta = _krLocationMeta(locId);

        // "matched" = the active area genuinely corresponds to this voter: they
        // explicitly chose it in the selector, or it was inferred from their saved
        // location. When false, the area is only the default fallback, so callers
        // (the Relevant section) can prefer broader state-wide relevance instead of
        // showing a default county's exact districts to someone elsewhere.
        var explicit = false;
        try { explicit = !!(localStorage.getItem(KR_LOCATION_KEY) && KEY_RACES_BY_LOCATION[localStorage.getItem(KR_LOCATION_KEY)]); } catch (e) {}
        var matched = explicit || (_krInferLocation() !== '');

        // Collect every politician id tied to a race (incumbent + challengers).
        var pidsOf = function(r) {
          var a = [];
          var push = function(p) { if (p && a.indexOf(p) === -1) a.push(p); };
          push(r.incumbentPid);
          (r.incumbentPids || []).forEach(push);
          (r.candidates || []).forEach(push);
          return a;
        };
        var distOf = function(r) {
          var m = String(r.district || r.short || '').match(/(\d+)\s*$/);
          return m ? m[1] : null;
        };

        var out = {
          locId: locId, label: meta.label, city: meta.city, county: meta.county,
          state: 'Utah', matched: matched, byRace: {}, statewide: {}
        };
        races.forEach(function(r) {
          out.byRace[r.raceKey] = {
            district: distOf(r),
            pids: pidsOf(r),
            // The sitting officeholder for this seat, so surfaces like the "Your
            // Voting Districts" strip can show exactly who represents the voter.
            incumbentPid: r.incumbentPid || (r.incumbentPids && r.incumbentPids[0]) || null
          };
        });
        (KEY_RACES_STATEWIDE || []).forEach(function(r) {
          out.statewide[r.raceKey] = pidsOf(r);
        });
        return out;
      } catch (e) { return null; }
    };

    // ── Authoritative voter ballot — the SINGLE source of truth ────────────────
    // One resolver that both the Hub "Your Voting Districts" strip and the
    // "Relevant to Me" / add-to-team relevance filter read from, so the two
    // surfaces can never disagree about who represents the voter. For the voter's
    // saved location it answers, for each of the three geographically-specific
    // seats (U.S. House · State Senate · State House):
    //   • the EXACT district they vote in — an exact seat the voter pinpointed on
    //     the interactive map wins over the curated area's default. This is the
    //     split-city fix: two Layton addresses that fall in different legislative
    //     districts now resolve to different seats instead of one blurred area.
    //   • the sitting officeholder, resolved BY ID from the curated Key Races
    //     roster (and, when the voter's exact seat differs from the area default,
    //     the authoritative district→incumbent maps). Resolving by id — never by
    //     re-parsing a mutable `state`/`office` string — is why a real name shows
    //     the instant a location is set, with no "being confirmed" placeholder.
    //   • the full curated roster (incumbent + challengers) for that seat, which
    //     seeds the strict-district filter's allow-list so the voter's own people
    //     are always kept while neighbouring-district politicians are cut.
    // Returns null only when the Key Races data isn't ready yet, so every caller
    // can fall back to its prior behaviour and degrade gracefully.
    window._pdxVoterBallot = function() {
      try {
        var loc = window._currentVoterLocation || {};

        // Memoize on a cheap location signature. _isRelevantToUser calls this
        // once per politician inside the browse / add-to-team filter loops, so
        // recomputing the roster hundreds of times per pass would be wasteful.
        // The signature captures everything the result depends on (saved location
        // + the active curated area), so the cache refreshes the instant the voter
        // changes where they vote. Mirrors _relevantVoterDistricts' memoization.
        var _krId = '';
        try { _krId = localStorage.getItem(KR_LOCATION_KEY) || ''; } catch (e) {}
        var _sig = [loc.state || '', loc.county || '', loc.city || '', loc.district || '',
                    loc.stateSenateDistrict || '', loc.stateHouseDistrict || '', _krId].join('|');
        if (window._pdxVoterBallotCache && window._pdxVoterBallotCache.sig === _sig) {
          return window._pdxVoterBallotCache.val;
        }

        var locId = _krCurrentLocationId();
        var races = KEY_RACES_BY_LOCATION[locId];
        if (!races) { window._pdxVoterBallotCache = { sig: _sig, val: null }; return null; }
        var meta = _krLocationMeta(locId);

        var explicit = false;
        try { explicit = !!(localStorage.getItem(KR_LOCATION_KEY) && KEY_RACES_BY_LOCATION[localStorage.getItem(KR_LOCATION_KEY)]); } catch (e) {}
        var matched = explicit || (_krInferLocation() !== '');

        var _num = function(v) { var n = parseInt(String(v == null ? '' : v).replace(/[^0-9]/g, ''), 10); return isNaN(n) ? null : n; };
        var _distOf = function(r) { var m = String(r.district || r.short || '').match(/(\d+)\s*$/); return m ? parseInt(m[1], 10) : null; };
        var _real = function(pid) { return !!(pid && typeof window._pdxPersonById === 'function' && window._pdxPersonById(pid)); };

        // Curated area defaults: district, sitting incumbent and the full roster
        // (incumbent + challengers) for each of the voter's three district seats.
        var RK = { house: 'representative', statesenate: 'state_senator', statehouse: 'state_rep' };
        var area = {}, curInc = {}, roster = {};
        ['representative', 'state_senator', 'state_rep'].forEach(function(gk) { area[gk] = null; curInc[gk] = null; roster[gk] = []; });
        races.forEach(function(r) {
          var gk = RK[r.raceKey]; if (!gk) return;
          area[gk] = _distOf(r);
          curInc[gk] = r.incumbentPid || (r.incumbentPids && r.incumbentPids[0]) || null;
          var pl = [], push = function(p) { if (p && pl.indexOf(p) === -1) pl.push(p); };
          push(r.incumbentPid); (r.incumbentPids || []).forEach(push); (r.candidates || []).forEach(push);
          roster[gk] = pl;
        });

        // The voter's EXACT seats when they pinpointed them on the map — the most
        // authoritative signal we have, decisive for a split city.
        var exact = {
          representative: _num(loc.district),
          state_senator:  _num(loc.stateSenateDistrict),
          state_rep:      _num(loc.stateHouseDistrict)
        };

        // Authoritative district→incumbent maps, used when the voter's exact seat
        // differs from the curated area default so we still name the right person.
        var INC = {
          representative: function(dn) { var m = KR_CONGRESSIONAL_INCUMBENTS[dn]; return m ? m.pid : null; },
          state_senator:  function(dn) { return KR_STATE_SENATE_INCUMBENTS[dn] || null; },
          state_rep:      function(dn) { return KR_STATE_HOUSE_INCUMBENTS[dn] || null; }
        };

        var byOffice = {};
        ['representative', 'state_senator', 'state_rep'].forEach(function(gk) {
          var dn = (exact[gk] != null) ? exact[gk] : area[gk];
          var pids = roster[gk].slice();
          var inc;
          if (exact[gk] != null && exact[gk] !== area[gk]) {
            // Map-selected a seat other than the area default → name THAT seat's
            // officeholder and add them to the seat's allow-list.
            inc = INC[gk](dn);
            if (inc && pids.indexOf(inc) === -1) pids.unshift(inc);
          } else {
            inc = curInc[gk] || INC[gk](dn);
          }
          if (!_real(inc)) inc = null;
          byOffice[gk] = { district: (dn == null ? null : dn), incumbentPid: inc, pids: pids.filter(_real) };
        });

        // Local level — county / city / school officeholders for the voter's area,
        // resolved by id from the curated local roster (KEY_RACES_LOCAL_BY_LOCATION)
        // so the ONE resolver returns the COMPLETE ballot: all three district seats
        // ABOVE plus every local seat here. Local offices follow county/area lines
        // (not legislative districts), so they come straight from the derived area
        // rather than the map-pinned house/senate districts. Only pids that resolve
        // to a real person are kept, so a name is never invented.
        var localPids = [], localSeats = [];
        try {
          var _lr = (typeof KEY_RACES_LOCAL_BY_LOCATION !== 'undefined' && KEY_RACES_LOCAL_BY_LOCATION[locId])
            ? KEY_RACES_LOCAL_BY_LOCATION[locId] : [];
          _lr.forEach(function(r) {
            var seatPids = [], addL = function(p) { if (p && _real(p) && seatPids.indexOf(p) === -1) seatPids.push(p); };
            addL(r.incumbentPid); (r.incumbentPids || []).forEach(addL); (r.candidates || []).forEach(addL);
            seatPids.forEach(function(p) { if (localPids.indexOf(p) === -1) localPids.push(p); });
            localSeats.push({ raceKey: r.raceKey, level: r.level || 'local', short: r.short || '',
                              incumbentPid: (seatPids.length ? seatPids[0] : null), pids: seatPids });
          });
        } catch (e) {}

        var _out = {
          matched: matched, locId: locId, label: meta.label, county: meta.county || '', city: meta.city || '',
          districts: { house: byOffice.representative.district, senate: byOffice.state_senator.district, lower: byOffice.state_rep.district },
          byOffice: byOffice,
          local: { seats: localSeats, pids: localPids }
        };
        window._pdxVoterBallotCache = { sig: _sig, val: _out };
        return _out;
      } catch (e) { return null; }
    };

    // ── U.S. House redistricting bridge (2026 court-ordered map) ───────────────
    // Utah's congressional lines were redrawn by court order for the 2026 ballot,
    // so for redrawn areas the member who represents a voter RIGHT NOW (the
    // incumbent of the district they still sit in under the current map) is NOT
    // the incumbent of the NEW district number their 2026 ballot uses. Layton /
    // Davis County moved out of District 1 (Blake Moore) into District 2, so a
    // Davis voter is represented today by the District 1 member while their 2026
    // ballot is the new District 2. Pinning the new district's incumbent (Celeste
    // Maloy) onto that voter as "currently representing you" is exactly the
    // misread this resolves. It hands the Hub "Your Voting Districts" strip the
    // clean current-vs-2026 split so it can label both honestly. An area declares
    // it moved by carrying a `priorCongressDistrict` (its district under the
    // current map) alongside its 2026 `congressDistrict` in KEY_RACES_LOCATIONS.
    //
    // Purely additive: it reads only existing curated data and no existing
    // consumer of _pdxVoterBallot / keyRacesRelevantData is touched, so the 2026
    // ballot race the rest of the app builds (Relevant to Me, Build My Team) is
    // unchanged — this only informs how the Hub *labels* the current officeholder.
    window._pdxHouseRedistrict = function() {
      try {
        var locId = _krCurrentLocationId();
        var meta = _krLocationMeta(locId);
        if (!meta) return null;

        // Only speak to a voter this area genuinely matches (explicitly chosen or
        // inferred from their saved location) — never for the default fallback.
        var explicit = false;
        try { explicit = !!(localStorage.getItem(KR_LOCATION_KEY) && KEY_RACES_BY_LOCATION[localStorage.getItem(KR_LOCATION_KEY)]); } catch (e) {}
        var matched = explicit || (_krInferLocation() !== '');
        if (!matched) return null;

        var ballotDist  = meta.congressDistrict || null;      // the 2026 ballot district
        var currentDist = meta.priorCongressDistrict || null; // the current-map district
        if (!ballotDist || !currentDist || ballotDist === currentDist) return null;

        var _real = function(pid) { return !!(pid && typeof window._pdxPersonById === 'function' && window._pdxPersonById(pid)); };
        var currentPid = (KR_CONGRESSIONAL_INCUMBENTS[currentDist] && KR_CONGRESSIONAL_INCUMBENTS[currentDist].pid) || null;
        var ballotPid  = (KR_CONGRESSIONAL_INCUMBENTS[ballotDist]  && KR_CONGRESSIONAL_INCUMBENTS[ballotDist].pid)  || null;
        if (!_real(currentPid)) currentPid = null; // honest placeholder rather than a wrong name
        if (!_real(ballotPid))  ballotPid = null;

        return {
          changed: true,
          ballotDistrict: ballotDist,
          currentDistrict: currentDist,
          currentPid: currentPid,          // who represents this voter under the current map
          ballotIncumbentPid: ballotPid    // sitting member of the new 2026 ballot district
        };
      } catch (e) { return null; }
    };

    // Canonical, discoverable name for the ONE map-aware district resolver. Every
    // location-aware surface — the Hub "Your Voting Districts" strip, the "Relevant
    // to Me" / add-to-team filter, and the Build My Team ballot builder — resolves
    // the voter's seats through this single function, so they can never disagree
    // about who represents the voter. It returns the COMPLETE ballot for the voter's
    // precise location: the exact U.S. House / State Senate / State House districts
    // (an address pinpointed on the map wins over the coarse curated area), each
    // seat's sitting officeholder + full roster resolved by id, and the local
    // county/city/school seats for their derived area.
    window._pdxResolveVoter = window._pdxVoterBallot;

    // Adopt one of the curated Key Races areas as the voter's saved location.
    // Shared by the location selector and the "see full list" card bridge so both
    // establish location identically — mirrors window.relevantPickArea but without
    // its forced scroll, since these callers manage their own scrolling. Sets the
    // city/county and U.S. House district from the area's roster, then persists
    // (which flips _hasUserLocation on and lets the Relevant-to-Me tree render).
    function _krEstablishVoterLocation(id) {
      try {
        var meta = _krLocationMeta(id);
        var races = KEY_RACES_BY_LOCATION[id] || [];
        var houseDist = '';
        races.forEach(function(r) {
          if (r.raceKey === 'house') {
            var m = String(r.district || '').match(/(\d+)\s*$/);
            if (m) houseDist = m[1];
          }
        });
        window._currentVoterLocation = {
          state: 'Utah',
          city: meta.city || '',
          county: meta.county || '',
          district: houseDist
        };
        if (window.saveVoterLocation) window.saveVoterLocation();
      } catch (e) {}
    }

    window.keyRacesSetLocation = function(id) {
      if (!KEY_RACES_BY_LOCATION[id]) return;
      try { localStorage.setItem(KR_LOCATION_KEY, id); } catch (e) {}
      // Picking an area in this selector IS the voter telling us where they vote,
      // so adopt it as their saved location. Without this the "Relevant to Me"
      // ballot below never sees _hasUserLocation flip to true and stays stuck on
      // its "choose your area" prompt — which made the whole section look broken
      // even though the visitor had clearly chosen a location right here.
      _krEstablishVoterLocation(id);
      if (window.renderKeyRaces) window.renderKeyRaces();
      // saveVoterLocation() (inside _krEstablishVoterLocation) set _hasUserLocation,
      // so refresh every location-aware surface. The central reaction keeps My Team,
      // the map indicators and the personalized ballot in sync; fall back to the
      // Relevant render alone if it isn't available yet.
      if (window._triggerLocationReaction) window._triggerLocationReaction();
      else if (window.renderRelevantToMe) window.renderRelevantToMe();
    };

    // ── "Relevant to Me" personalization helpers ───────────────────────────
    // Establish a real saved voter location from one of the supported Utah areas,
    // then refresh every location-aware view. Powers the quick-pick buttons shown
    // when the visitor hasn't chosen an area yet, and the in-section area switcher,
    // so the personalized ballot can be set without leaving the section.
    window.relevantPickArea = function(locId) {
      try {
        var races = KEY_RACES_BY_LOCATION[locId];
        var meta = _krLocationMeta(locId);
        if (!races || !meta) return;
        var houseDist = '';
        races.forEach(function(r) {
          if (r.raceKey === 'house') {
            var m = String(r.district || '').match(/(\d+)\s*$/);
            if (m) houseDist = m[1];
          }
        });
        window._currentVoterLocation = { state: 'Utah', city: meta.city, county: meta.county, district: houseDist };
        if (window.saveVoterLocation) window.saveVoterLocation();
        try { localStorage.setItem(KR_LOCATION_KEY, locId); } catch (e) {}
        if (window._triggerLocationReaction) window._triggerLocationReaction();
        else if (window.renderRelevantToMe) window.renderRelevantToMe();
        var sec = document.getElementById('relevant-section');
        if (sec && sec.scrollIntoView) { try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
      } catch (e) {}
    };

    // Format a Utah congressional district number as the ballot-style "UT-0N".
    window._relevantCD = function(n) {
      var x = parseInt(n, 10);
      if (isNaN(x)) return '';
      return 'UT-' + (x < 10 ? '0' + x : '' + x);
    };

    // Row of the supported Utah areas as quick-switch chips; the active area
    // is highlighted with a check. Used both in the "choose your area" prompt and
    // as an in-place switcher above the personalized ballot.
    window._relevantAreaSwitcher = function(activeId, opts) {
      opts = opts || {};
      var big = opts.big === true;
      return KEY_RACES_LOCATIONS.map(function(a) {
        var on = a.id === activeId;
        var pad = big ? '0.6rem 0.9rem' : '0.45rem 0.7rem';
        var bg = on ? 'linear-gradient(135deg,rgba(59,130,246,0.35),rgba(37,99,235,0.18))' : 'rgba(10,15,30,0.4)';
        var bd = on ? 'rgba(96,165,250,0.85)' : 'rgba(59,130,246,0.3)';
        return '<button type="button" onclick="relevantPickArea(\'' + a.id + '\')" ' +
          'style="display:flex;flex-direction:column;gap:0.1rem;text-align:left;background:' + bg + ';border:1px solid ' + bd + ';border-radius:0.7rem;padding:' + pad + ';cursor:pointer;min-height:44px;transition:transform 0.15s,border-color 0.15s;" ' +
          'onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:800;font-size:' + (big ? '0.9rem' : '0.78rem') + ';letter-spacing:0.02em;color:' + (on ? '#fff' : '#cbd9ee') + ';line-height:1.1;">' + (on ? '✓ ' : '') + a.city + '</span>' +
          '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.64rem;letter-spacing:0.03em;color:#9fb4d4;line-height:1.1;">' + a.county + '</span>' +
          '</button>';
      }).join('');
    };

    // Prominent personalization prompt shown in "Relevant to Me" when no area is
    // chosen yet — turns the section into a clear call to pick an area rather than
    // silently presenting a default district's ballot as the visitor's own.
    window._relevantLocationPrompt = function() {
      // Clean, non-partisan empty state shown before a location is set. No
      // politicians are pre-loaded here — the two prominent actions (browser
      // geolocation and the map/address picker) are the only way in, so whatever
      // appears afterward is genuinely the visitor's own area.
      var h = '';
      h += '<div class="pdx-loc-empty" style="padding:2.25rem 1.5rem;border-radius:1.25rem;text-align:center;background:linear-gradient(135deg,rgba(30,58,138,0.22),rgba(96,165,250,0.06));border:1px solid rgba(59,130,246,0.35);max-width:44rem;margin:0 auto;">';
      h += '<div style="font-size:2.6rem;line-height:1;margin-bottom:0.75rem;" aria-hidden="true">📍</div>';
      h += '<div style="font-family:\'Bebas Neue\',sans-serif;letter-spacing:0.04em;font-size:1.7rem;color:#fff;margin-bottom:0.5rem;">Set your location to see your representatives</div>';
      h += '<p style="font-family:\'Barlow Condensed\',sans-serif;font-size:1rem;color:#cbd9ee;line-height:1.55;margin:0 auto 1.4rem;max-width:34rem;">Tell us where you vote and this becomes your personal ballot — the people who represent you today and the candidates running for those seats, across every level of government. Nothing is pre-loaded, and it works for any state.</p>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:0.7rem;justify-content:center;">';
      h += '<button type="button" onclick="window.triggerManualLocationDetection && window.triggerManualLocationDetection()" class="btn-glow font-condensed text-sm font-700 tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 px-5 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 min-h-[48px]">🌐 Detect My Location</button>';
      h += '<button type="button" onclick="window.toggleChangeLocation && window.toggleChangeLocation()" class="btn-glow font-condensed text-sm font-700 tracking-wider uppercase text-white bg-slate-700 hover:bg-slate-600 border border-slate-500/40 px-5 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2 min-h-[48px]">🗺️ Change Location on Map</button>';
      h += '</div>';
      h += '<div style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.8rem;color:#8ba0c2;margin-top:1.1rem;">🔒 Your location stays on your device — we never store where you live.</div>';
      h += '</div>';
      return h;
    };

    var _keyRacesHint = {};
    // Which candidate cards currently have their inline alignment breakdown expanded.
    // Tracked so the open/closed state survives a Key Races re-render.
    var _krAlignExpanded = new Set();

    // RETIRED with the pledge percentage — see the `_scoreColor` note above.
    function _krPartyMeta(p) {
      // Party arrives in two shapes across the data set: the original single-letter
      // codes ('R', 'D', 'I', 'F') in the bundled records, and the full party names
      // ('Republican', 'Democrat', 'Forward', …) that Firestore stores and that
      // overwrite the letter on merge. Normalize both so every Key Races card shows
      // a correct, colored party chip instead of falling through to "Party TBD".
      if (!p) return null;
      var s = String(p).trim().toLowerCase();
      if (!s) return null;
      if (s === 'r' || s.indexOf('republican') !== -1 || s === 'gop') return { label: 'Republican', color: '#f87171' };
      if (s === 'd' || s.indexOf('democrat') !== -1) return { label: 'Democrat', color: '#60a5fa' };
      if (s === 'f' || s.indexOf('forward') !== -1) return { label: 'Forward Party', color: '#22d3ee' };
      if (s === 'l' || s.indexOf('libertarian') !== -1) return { label: 'Libertarian', color: '#fbbf24' };
      if (s === 'g' || s.indexOf('green') !== -1) return { label: 'Green', color: '#4ade80' };
      // Independent / unaffiliated — checked last so it doesn't swallow other labels.
      if (s === 'i' || s === 'ind.' || s.indexOf('independent') !== -1 || s.indexOf('unaffiliated') !== -1 || s.indexOf('no party') !== -1) return { label: 'Independent', color: '#a78bfa' };
      return null;
    }
    function _krPartyBadge(p) {
      var m = _krPartyMeta(p);
      // No confirmed party yet (e.g. a 2026 challenger whose filing is still being
      // certified): show a clean, neutral "Party TBD" chip rather than leaving the
      // card with a missing affiliation slot. Keeps every card looking complete and
      // honest without inventing a party label.
      if (!m) m = { label: 'Party TBD', color: '#94a3b8' };
      return '<span class="font-condensed" style="font-size:0.54rem;letter-spacing:0.06em;color:' + m.color + 'cc;background:' + m.color + '12;border:1px solid ' + m.color + '2e;padding:0.08rem 0.42rem;border-radius:999px;font-weight:500;opacity:0.82;">' + m.label + '</span>';
    }
    function _krPhoto(pid, d, color) {
      var url = (typeof _getPhotoUrl === 'function') ? _getPhotoUrl(pid) : '';
      if (url) {
        return '<div style="width:46px;height:46px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid ' + color + '55;background:#0a0f1e;">' +
          '<img loading="lazy" decoding="async" src="' + url + '" alt="' + d.name + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.3rem;color:#9fb4d4&quot;>' + (d.icon || '🏛') + '</div>\'"></div>';
      }
      return '<div style="width:46px;height:46px;border-radius:50%;flex-shrink:0;border:2px solid ' + color + '55;background:rgba(30,53,96,0.25);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#9fb4d4;">' + (d.icon || '🏛') + '</div>';
    }

    // Office strings arrive in mixed shapes — bundled records are terse ("UT State
    // Representative"), while Firestore docs often carry a leading emoji and richer
    // wording ("🏛 Utah State Representative - District 16"). The avatar already shows
    // an icon, so we strip any leading symbol/emoji and tidy whitespace to keep the
    // office/district line clean and consistent across every card.
    function _krCleanOffice(s) {
      if (!s) return '';
      return String(s)
        .replace(/^[^A-Za-z0-9(]+/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }

    function _krLocationHeadline(locId) {
      var meta = _krLocationMeta(locId);
      var inferred = _krInferLocation();
      var matchesUser = inferred && inferred === locId;
      if (matchesUser) {
        return '📍 You live in <strong style="color:#fff;">' + meta.city + ', ' + meta.county + '</strong> → these are the races that matter most to you:';
      }
      return '📍 Showing key races for <strong style="color:#fff;">' + meta.label + '</strong>. Use the selector above to switch to any major Utah area.';
    }

    // ── Shared score cell for Key Races cards ────────────────────────────────
    // Builds the objective signal cell used on EVERY Key Races politician —
    // current officeholders and 2026 candidates alike — so it is displayed and
    // styled identically everywhere and is easy to compare at a glance. Returns
    // { promise, acct } HTML strings; `acct` is retired and empty.
    //
    // THERE IS ONE CELL BECAUSE THERE IS ONE READ. This slot used to be the pledge
    // lane: a gold `kr-score-promise` button reading "PLEDGES ⓘ / ✓6 ✕3
    // kept/broken", with its own icon, its own gold label colour and its own green /
    // red count palette. With the Accountability of Truth composite retired it had
    // become the ONLY score-styled cell on the card — which meant a tally of
    // campaign pledges was, in practice, the Key Races score.
    //
    // A pledge is one FORM OF "said". It is already inside ⚖️ Word vs Action, which
    // tests it against its sourced resolution exactly as it tests a floor stance,
    // so the cell now carries that verdict and the cell's own colour is neutral
    // steel. The only good/bad colour on it comes from PDXConsistency.VERDICTS via
    // the read itself — one vocabulary, one palette. Below the publishing floor it
    // states coverage rather than a conclusion, and the ⓘ tap still opens the
    // receipts explainer, which is where the kept/broken/pending detail belongs.
    function _krScoreCells(pid, d, isIncumbent) {
      var r = null;
      try {
        var wa = window.PDXWordAction;
        if (wa && typeof wa.read === 'function') r = wa.read(pid, d);
      } catch (e) {}

      var sub, subStyle = '', aria;
      if (r && r.publishable && r.verdict && r.verdict.label) {
        sub = r.verdict.label;
        subStyle = 'color:' + (r.verdict.color || '#cbd9ec') + ';';
        aria = 'Word vs Action for ' + d.name + ' — ' + r.verdict.label + '; tap for how this read works';
      } else {
        sub = (r && r.coverage && r.coverage.word > 0)
          ? 'Not enough record yet'
          : (isIncumbent ? 'Being compiled' : 'No record yet');
        aria = 'Word vs Action for ' + d.name + ' — ' + sub + '; tap for how this read works';
      }

      var promiseHtml =
        '<button type="button" onclick="event.stopPropagation();window._pdxPromiseInfo(event,\'' + pid + '\')" class="kr-score kr-score-wa" aria-label="' + aria + '">' +
          '<span class="kr-score-ico">⚖️</span>' +
          '<span class="kr-score-meta">' +
            '<span class="kr-score-label">Word vs Action ⓘ</span>' +
            '<span class="kr-score-sub" style="' + subStyle + '">' + sub + '</span>' +
          '</span>' +
        '</button>';

      // SCORING CLEANUP: the Accountability of Truth composite is retired as a
      // headline number, so Key Races cards no longer show a "Truth Score" cell.
      var acctHtml = '';
      return { promise: promiseHtml, acct: acctHtml };
    }

    // Shared "Add to My Team" / "On My Team" pick button so the incumbent hero
    // and the challenger rows behave identically (same ballotPickCardAnimated
    // mechanism, same 6-slot team store).
    function _krPickBtn(race, pid, isPick) {
      return isPick
        ? '<button onclick="window.ballotPickCardAnimated(this,\'' + race.raceKey + '\',\'' + pid + '\')" class="font-condensed font-700 text-xs tracking-wider uppercase rounded-lg transition-all cursor-pointer" style="white-space:nowrap;padding:0.5rem 0.85rem;background:linear-gradient(135deg,rgba(74,222,128,0.22),rgba(74,222,128,0.10));border:1px solid rgba(74,222,128,0.55);color:#4ade80;">✓ On My Team</button>'
        : '<button onclick="window.ballotPickCardAnimated(this,\'' + race.raceKey + '\',\'' + pid + '\')" class="font-condensed font-700 text-xs tracking-wider uppercase rounded-lg transition-all cursor-pointer hover:scale-105" style="white-space:nowrap;padding:0.5rem 0.85rem;background:linear-gradient(135deg,rgba(245,158,11,0.20),rgba(245,158,11,0.08));border:1px solid rgba(245,158,11,0.50);color:#fbbf24;">➕ Add to My Team</button>';
    }

    // Compare / Profile action row shared by the incumbent hero and challenger rows.
    function _krActionRow(pid, d) {
      var cmpAdded = (typeof _cmpSelected !== 'undefined' && _cmpSelected.has && _cmpSelected.has(pid));
      var cCount = (typeof _commentCounts !== 'undefined' && _commentCounts[pid]) ? _commentCounts[pid] : 0;
      var voteChip = (typeof window._pdxVoteChip === 'function') ? window._pdxVoteChip(pid) : '';
      return '<div class="kr-action-row">' +
          '<button onclick="window.keyRacesCompare(this,\'' + pid + '\')" class="kr-action-btn kr-action-compare' + (cmpAdded ? ' added' : '') + '" aria-label="Add ' + d.name + ' to compare tool">' +
            '<span class="kr-action-ico">' + (cmpAdded ? '✓' : '⚖️') + '</span>' + (cmpAdded ? 'Comparing' : 'Compare') +
          '</button>' +
          '<button onclick="event.stopPropagation();if(typeof openCommentModal===\'function\')openCommentModal(\'' + pid + '\')" class="kr-action-btn kr-action-comment" data-comment-pid="' + pid + '" aria-label="Comments for ' + d.name + '">' +
            '<span class="kr-action-ico">💬</span><span class="comment-count">' + cCount + '</span>' +
          '</button>' +
          voteChip +
          '<button onclick="if(typeof showProfile===\'function\')showProfile(\'' + pid + '\')" class="kr-action-btn kr-action-profile" aria-label="Open full profile for ' + d.name + '">' +
            '<span class="kr-action-ico">👤</span>Profile' +
          '</button>' +
        '</div>';
    }

    // Single, intentional "no record yet" notice for a 2026 candidate who has
    // never held office. Replaces the pair of empty Promise / Truth Score cells so
    // a brand-new challenger card reads as complete and honest rather than broken,
    // while pointing the visitor to the things they CAN act on (positions + compare).
    function _krNoRecordNotice() {
      return '<div class="kr-norecord">' +
          '<span class="kr-norecord-ico">🗳️</span>' +
          '<span class="kr-norecord-text">' +
            '<span class="kr-norecord-title">New candidate — no voting record yet</span>' +
            '<span class="kr-norecord-sub">Promise &amp; Truth Scores appear once they hold office and cast votes. Compare their positions below.</span>' +
          '</span>' +
        '</div>';
    }

    function _krCandidateRow(race, pid, selectedPid, candidateMode) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return '';
      var isPick = selectedPid === pid;
      var isIncumbent = race.incumbentPid === pid ||
        (race.incumbentPids && race.incumbentPids.indexOf(pid) !== -1);
      // "Challenger" only reads correctly when a sitting officeholder is actually on
      // the ballot. For open seats and retiring-incumbent races there is no one to
      // challenge, so the people running are simply "Candidate"s — keeping the label
      // honest and consistent across every race type.
      var isChallengerRace = candidateMode !== 'candidate';
      var roleTag = isIncumbent
        ? '<span class="font-condensed" style="font-size:0.55rem;letter-spacing:0.06em;color:#4ade80;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.35);padding:0.08rem 0.42rem;border-radius:999px;font-weight:700;">Incumbent</span>'
        : '<span class="font-condensed" style="font-size:0.55rem;letter-spacing:0.06em;color:#93c5fd;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.35);padding:0.08rem 0.42rem;border-radius:999px;font-weight:700;">' + (isChallengerRace ? 'Challenger' : 'Candidate') + '</span>';
      var subLine = d.office ? _krCleanOffice(d.office) : (isIncumbent ? 'Current officeholder' : (isChallengerRace ? '2026 challenger' : '2026 candidate'));
      var btn = _krPickBtn(race, pid, isPick);

      // ── Score strip ──────────────────────────────────────────────────────
      // Row 1 — the two objective scores, side by side and easy to scan across
      // candidates: Promise % (gold, prominent campaign-promise record) and the
      // Accountability of Truth Score (purple, the objective integrity rating).
      // Row 2 — the personalized Alignment %, kept visually distinct so the two
      // scoring systems never blur together.
      // We only show a Truth Score where there is a real record to ground it — for
      // challengers with no record yet we say so plainly rather than inventing a number.
      // Does this candidate have any objective record to ground a score? A 2026
      // challenger who has never held office has neither a Promise % nor a Truth
      // Score, and stacking two big "No record yet" cells made the card read as
      // broken. So we detect the no-record case up front and replace the two empty
      // cells with a single, clean, intentional notice — while still showing the
      // real score strip the moment either score exists.
      var hasPromise = window._pdxDisplayScore(d) !== null;
      var acctObj = (d.accountability && typeof d.accountability.overallScore === 'number')
        ? d.accountability
        : ((hasPromise && typeof window._acctEnsureScore === 'function') ? window._acctEnsureScore(pid) : null);
      var hasAcct = !!(acctObj && typeof acctObj.overallScore === 'number');
      var noObjectiveRecord = !isIncumbent && !hasPromise && !hasAcct;
      // ── Personalized alignment — shown INLINE on the card ────────────────
      // When the visitor has chosen issues we surface their match % right here so
      // it can be scanned and compared across candidates at a glance, with a tap
      // to expand an issue-by-issue breakdown without ever leaving Key Races.
      // When no issues are set yet we show a clean prompt that opens the picker.
      var alignInlineHtml = _krAlignInlineHtml(pid, d);
      var scoreStrip;
      if (noObjectiveRecord) {
        scoreStrip = _krNoRecordNotice() + alignInlineHtml;
      } else {
        var _cells = _krScoreCells(pid, d, isIncumbent);
        scoreStrip =
          '<div class="kr-score-strip">' + _cells.promise + _cells.acct + '</div>' +
          alignInlineHtml;
      }

      // At-a-glance Spotlight: the single most timely thing to know about this
      // candidate, shown inline and tappable for the full modal + source.
      var spotPreviewHtml = (typeof _krBuildSpotlight === 'function')
        ? _krSpotPreviewHtml(pid, _krBuildSpotlight(pid)) : '';

      var actionsHtml = _krActionRow(pid, d);
      // Real documented positions for the challenger — the clearest at-a-glance
      // read of what a thin, new-on-the-ballot candidate actually stands for.
      var krStances = (typeof window._pdxStanceChips === 'function') ? window._pdxStanceChips(pid, d, { max: 3 }) : '';
      return '<div class="kr-challenger-card' + (isPick ? ' is-pick' : '') + '">' +
        '<div style="display:flex;align-items:center;gap:0.75rem;">' +
          _krPhoto(pid, d, race.color) +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">' +
              '<button onclick="if(typeof openMediumModal===\'function\')openMediumModal(\'' + pid + '\')" class="font-condensed font-700 text-white" style="background:none;border:none;padding:0;cursor:pointer;font-size:0.95rem;letter-spacing:0.01em;">' + d.name + '</button>' +
              _krPartyBadge(d.party) + roleTag +
            '</div>' +
            '<div class="font-condensed" style="font-size:0.68rem;color:#9fb4d4;margin-top:0.15rem;">' + subLine + '</div>' +
            // Tenure pill for a candidate who ALREADY holds (or held) another office —
            // e.g. a sitting state senator challenging for Congress. Lets voters weigh
            // the incumbent's years in this seat against the challenger's own record of
            // time in office. A first-time candidate has no termStart, so instead of a
            // blank we show an explicit "first-time candidate — no prior elected office"
            // pill, making the absence of experience real, comparable context. Incumbents
            // are skipped here because the hero panel already carries their tenure via
            // _krIncMeta.
            (function(){
              if (isIncumbent) return '';
              var tp = (typeof window._pdxTenurePill === 'function') ? window._pdxTenurePill(d) : '';
              if (tp) return '<div style="margin-top:0.34rem;">' + tp + '</div>';
              var isCand = (d.rank === 'candidate') || /candidate/i.test(d.office || '');
              if (isCand) return '<div style="margin-top:0.34rem;"><span class="kr-cand-newexp"><span class="kr-cand-newexp-ico">🆕</span>First-time candidate · no prior elected office</span></div>';
              return '';
            })() +
          '</div>' +
          btn +
        '</div>' +
        krStances +
        scoreStrip +
        spotPreviewHtml +
        actionsHtml +
      '</div>';
    }

    // Larger circular photo for the elevated incumbent hero (vs. the 46px
    // challenger thumbnails) so the sitting officeholder reads as the focal point.
    function _krPhotoLg(pid, d, color) {
      var url = (typeof _getPhotoUrl === 'function') ? _getPhotoUrl(pid) : '';
      if (url) {
        return '<div style="width:74px;height:74px;border-radius:50%;overflow:hidden;flex-shrink:0;border:3px solid ' + color + 'b0;background:#0a0f1e;box-shadow:0 6px 20px rgba(245,158,11,0.32), 0 0 0 4px rgba(245,200,66,0.12);">' +
          '<img loading="lazy" decoding="async" src="' + url + '" alt="' + d.name + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML=\'<div style=&quot;display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:1.9rem;color:#fcd34d&quot;>' + (d.icon || '🏛') + '</div>\'"></div>';
      }
      return '<div style="width:74px;height:74px;border-radius:50%;flex-shrink:0;border:3px solid ' + color + 'b0;background:rgba(245,200,66,0.14);display:flex;align-items:center;justify-content:center;font-size:1.9rem;color:#fcd34d;box-shadow:0 6px 20px rgba(245,158,11,0.32), 0 0 0 4px rgba(245,200,66,0.12);">' + (d.icon || '🏛') + '</div>';
    }

    // "In office since YYYY · N yrs" tenure pill. Only rendered where we have a
    // confident start year (race.incumbentSince — a number, or a pid→year map for
    // multi-incumbent races like the U.S. Senate); omitted otherwise rather than guessed.
    function _krIncTenure(race, pid) {
      var since = race.incumbentSince;
      if (since && typeof since === 'object') since = since[pid];
      // Fall back to the officeholder's own structured tenure (termStart) so the
      // pill appears — with whole-years served — even where the race table has no
      // hardcoded incumbentSince. Keeps Key Races consistent with cards/profiles.
      if (!since) {
        var _d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
        var _t = (_d && typeof window._pdxTenure === 'function') ? window._pdxTenure(_d) : null;
        if (_t && _t.current) return '<span class="kr-inc-tenure"><span>🗓️</span>' + _t.text + '</span>';
        return '';
      }
      var yrs = 2026 - since;
      var yrTxt = yrs > 0 ? ' · ' + yrs + ' yr' + (yrs === 1 ? '' : 's') + ' in office' : '';
      return '<span class="kr-inc-tenure"><span>🗓️</span>In office since ' + since + yrTxt + '</span>';
    }

    // Structured meta row under the officeholder's name: the tenure pill (where we
    // have a confident start year) plus a clean status pill drawn from the race's
    // incumbentNote (re-election / retiring / term info). Grouping them gives the
    // hero card real, scannable information weight instead of a trailing " · note".
    function _krIncMeta(race, pid) {
      var bits = [];
      var tenure = _krIncTenure(race, pid);
      if (tenure) bits.push(tenure);
      var note = (race.incumbentNotes && race.incumbentNotes[pid]) || race.incumbentNote || '';
      if (note) {
        // A sitting seat that is NOT being decided in 2026 gets the muted "future"
        // pill so its "next election" year doesn't read like an active re-election.
        // The calendar icon makes the per-seat timing read as a clear flag — vital
        // on multi-seat races (the two U.S. Senate seats) so the seats never blur.
        var future = /not on the 2026 ballot|next election|next contested|next up|runs through/i.test(note);
        bits.push('<span class="kr-inc-status' + (future ? ' is-future' : '') + '">' + (future ? '<span style="margin-right:0.34rem;">🗓️</span>' : '') + note + '</span>');
      }
      if (!bits.length) return '';
      return '<div class="kr-inc-meta">' + bits.join('') + '</div>';
    }

    // Optional one-line summary for the incumbent (race.incumbentSummary — string,
    // or a pid→string map for multi-incumbent races).
    function _krIncSummary(race, pid) {
      var s = race.incumbentSummary;
      if (s && typeof s === 'object') s = s[pid];
      return s ? '<div class="kr-inc-summary">' + s + '</div>' : '';
    }

    // Focus-area chips drawn from the officeholder's tracked issues — the "key
    // highlights" that give the incumbent card real informational weight.
    function _krIncFocus(d, pid) {
      // Prefer the officeholder's REAL documented positions (support / oppose /
      // mixed) over bare focus tags — the same chokepoint used on every other
      // card surface, so the hero card leads with where they actually stand.
      var stance = (typeof window._pdxStanceChips === 'function') ? window._pdxStanceChips(pid, d, { max: 4 }) : '';
      if (stance) return stance;
      if (!d.issues || !d.issues.length) {
        // Thin officeholder with no tracked focus areas yet: show the shared
        // "being compiled" micro-note rather than dropping the row silently, so
        // the hero card stays intentional and honest about the limited record.
        return (typeof window._pdxFocusEmptyNote === 'function')
          ? '<div class="kr-inc-focus">' + window._pdxFocusEmptyNote(d) + '</div>'
          : '';
      }
      var chips = d.issues.slice(0, 4).map(function(i) { return '<span class="kr-inc-chip">' + i + '</span>'; }).join('');
      return '<div class="kr-inc-focus"><span class="kr-inc-focus-label">Focus</span>' + chips + '</div>';
    }

    // The elevated "hero" card for a current officeholder. It is deliberately the
    // richest card in the race — identity + prominent IN OFFICE badge, tenure, a
    // short summary, focus areas, objective scores, the at-a-glance Spotlight, the
    // visitor's personalized alignment, and its own Add-to-Team / Compare / Profile
    // actions — so the person holding the seat today stands out far above the
    // challengers and stays fully pickable without a duplicate row below.
    function _krIncumbentCard(race, pid, selectedPid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return '';
      var isPick = selectedPid === pid;
      var cells = _krScoreCells(pid, d, true);
      // The officeholder hero is the "who holds this seat" focal point — kept to
      // identity + record (photo, name, party, office, tenure, scores, your match)
      // so it reads cleanly at a glance. The timely-news Spotlight teaser lives on
      // the candidate rows and in the deeper Relevant-to-Me / profile views, so the
      // hero stays compact instead of stacking yet another strip.
      var align = (typeof _krAlignInlineHtml === 'function') ? _krAlignInlineHtml(pid, d) : '';
      return '<div class="kr-incumbent-panel' + (isPick ? ' is-pick' : '') + '">' +
        '<div style="display:flex;align-items:flex-start;gap:0.9rem;">' +
          _krPhotoLg(pid, d, '#f5c842') +
          '<div style="flex:1;min-width:0;">' +
            '<div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">' +
              '<span class="kr-incumbent-badge"><span class="kr-incumbent-badge-ico">★</span>In Office</span>' + (typeof window._pdxDepthBadge === 'function' ? window._pdxDepthBadge(d, { size: 'sm' }) : '') + _krPartyBadge(d.party) +
            '</div>' +
            '<button onclick="if(typeof openMediumModal===\'function\')openMediumModal(\'' + pid + '\')" class="kr-incumbent-name" style="display:block;margin-top:0.4rem;">' + d.name + '</button>' +
            '<div class="font-condensed" style="font-size:0.76rem;color:#fcd34d;margin-top:0.16rem;line-height:1.3;font-weight:600;">' + (_krCleanOffice(d.office) || 'Current officeholder') + '</div>' +
          '</div>' +
        '</div>' +
        _krIncMeta(race, pid) +
        _krIncSummary(race, pid) +
        _krIncFocus(d, pid) +
        '<div class="kr-score-strip">' + cells.promise + cells.acct + '</div>' +
        align +
        '<div style="margin-top:0.7rem;display:flex;justify-content:flex-end;">' + _krPickBtn(race, pid, isPick) + '</div>' +
        _krActionRow(pid, d) +
      '</div>';
    }

    // Prominent full-width "Up for Election" banner for each race. It answers the
    // single question a voter most needs — can I actually vote in this race in
    // 2026? — in a strip that's impossible to miss but still reads as premium:
    //   • now    — on the 2026 ballot (bright green, glowing accent + pulse)
    //   • open   — open seat being filled in 2026 (gold, glowing accent + pulse)
    //   • future — a sitting seat NOT up in 2026, shown for reference with the real
    //              year it is next contested (quiet steel, no glow)
    // Most races are 2026 contests, so the default is "On the 2026 Ballot"; a race
    // carries an explicit `ballot` only when it is an exception (Governor, U.S.
    // Senate, a staggered state-senate seat whose term spans past 2026).
    function _krBallotBanner(race) {
      var b = race.ballot;
      if (!b) {
        if (/open seat/i.test(race.incumbentNote || '')) b = { tone: 'open', label: 'Open Seat · 2026' };
        else b = { tone: 'now', label: 'Up for Election in 2026' };
      }
      var cfg;
      if (b.tone === 'future') {
        var yr = (String(b.label || '').match(/20\d\d/) || [])[0];
        cfg = {
          cls: 'is-future', ico: '🗓️',
          title: 'Not on Your 2026 Ballot',
          sub: yr ? 'No vote this year · next election ' + yr : (b.label || 'Shown for your reference'),
          flag: yr ? 'Next ' + yr : 'Reference'
        };
      } else if (b.tone === 'open') {
        cfg = {
          cls: 'is-open', ico: '🪑',
          title: 'Open Seat · On Your 2026 Ballot',
          sub: 'No incumbent — this seat is decided in the 2026 election',
          flag: '✓ Vote 2026'
        };
      } else {
        cfg = {
          cls: 'is-now', ico: '🗳️',
          title: 'On Your 2026 Ballot',
          sub: 'You can vote in this race in the 2026 election',
          flag: '✓ Vote 2026'
        };
      }
      return '<div class="kr-ballot-banner ' + cfg.cls + '">' +
          '<span class="kr-bb-badge">' + cfg.ico + '</span>' +
          '<span class="kr-bb-text">' +
            '<span class="kr-bb-title">' + cfg.title + '</span>' +
            '<span class="kr-bb-sub">' + cfg.sub + '</span>' +
          '</span>' +
          '<span class="kr-bb-flag">' + cfg.flag + '</span>' +
        '</div>';
    }

    // ── Field-experience comparison rail ─────────────────────────────────────
    // The accountability payoff of unifying the field: one compact strip that
    // lines up EVERYONE running for a seat — the sitting officeholder(s) and the
    // challengers — by how long each has actually held elected office. Sorted
    // longest-serving first, with a meter scaled to the most-tenured person, so
    // the experience gradient (e.g. a 12-year incumbent over first-time
    // challengers) is obvious at a glance rather than something the voter has to
    // reconstruct by scanning each card. Driven entirely by the same structured
    // tenure data (_pdxTenure / race.incumbentSince) used everywhere else.

    // One person's experience descriptor for the rail. Reuses the shared tenure
    // helper so the numbers match the cards/profiles exactly; falls back to an
    // explicit "first-time, no prior office" entry for a candidate with no
    // recorded term, so the absence is itself comparable context.
    function _krXpEntry(race, pid, isIncumbent) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;
      var t = (typeof window._pdxTenure === 'function') ? window._pdxTenure(d) : null;
      // A confident, hardcoded start year for the seat-holder takes precedence so
      // the rail agrees with the hero card's "In office since YYYY" pill.
      var since = race.incumbentSince;
      if (since && typeof since === 'object') since = since[pid];
      var years = 0, kind = 'new', sub = '', current = false;
      if (isIncumbent && since) {
        years = Math.max(0, 2026 - since); current = true; kind = 'inc';
        sub = 'In office since ' + since;
      } else if (t && t.current) {
        years = t.years; current = true;
        kind = isIncumbent ? 'inc' : 'other';
        sub = isIncumbent ? ('In office since ' + t.start.year)
                          : (_krCleanOffice(d.office) || ('In office since ' + t.start.year));
      } else if (t && !t.current) {
        years = t.years; kind = 'former';
        sub = 'Served ' + t.start.year + '–' + (t.end ? t.end.year : '');
      } else if (isIncumbent) {
        // Sitting officeholder we have no start date for: never mistake them for a
        // newcomer — keep them in the incumbent lane, just without a year figure.
        kind = 'inc'; current = true; years = 0; sub = 'Sitting officeholder';
      } else {
        // No recorded tenure. Within a curated field, a person running who holds
        // no office reads as a first-time candidate — we say so plainly rather
        // than leaving a blank, but only assert "no prior elected office" for an
        // actual candidate; anyone else just shows "No tenure on record".
        var isCand = (d.rank === 'candidate') || /candidate/i.test(d.office || '');
        years = 0; kind = 'new';
        sub = isCand ? 'No prior elected office on record' : 'No tenure on record';
      }
      return { pid: pid, d: d, name: d.name, isIncumbent: isIncumbent,
               years: years, current: current, kind: kind, sub: sub };
    }

    // Plain-language read of the experience gap, so a voter gets the takeaway
    // ("the incumbent has 12 years; 2 of 3 challengers have never held office")
    // without having to interpret the meters themselves.
    function _krXpSummary(entries) {
      var last = function(n) { return (String(n || '').trim().split(/\s+/).pop()) || n; };
      var inc = entries.filter(function(e) { return e.isIncumbent && e.current && e.years > 0; })
                       .sort(function(a, b) { return b.years - a.years; })[0];
      var chals = entries.filter(function(e) { return !e.isIncumbent; });
      var newChals = chals.filter(function(e) { return e.kind === 'new'; });
      var parts = [];
      if (inc) {
        parts.push('<strong>' + last(inc.name) + '</strong> has held this seat ' +
          inc.years + ' year' + (inc.years === 1 ? '' : 's') + '.');
      }
      if (chals.length && newChals.length) {
        if (newChals.length === chals.length) {
          parts.push((chals.length === 1 ? 'The challenger has' : 'None of the ' + chals.length + ' challengers has') +
            ' held elected office before.');
        } else {
          parts.push(newChals.length + ' of ' + chals.length + ' challengers have no prior elected office.');
        }
      } else if (!inc && chals.length) {
        var expd = chals.filter(function(e) { return e.years > 0; });
        if (expd.length) parts.push('Weigh each candidate’s time in office below.');
      }
      return parts.join(' ');
    }

    // The rail itself. Returns '' unless there are at least two people to line up,
    // since a lone candidate has nothing to compare against.
    function _krExperienceField(race, incList, challengerPids) {
      if (typeof window._pdxTenure !== 'function') return '';
      var entries = [];
      (incList || []).forEach(function(pid) { var e = _krXpEntry(race, pid, true); if (e) entries.push(e); });
      (challengerPids || []).forEach(function(pid) { var e = _krXpEntry(race, pid, false); if (e) entries.push(e); });
      if (entries.length < 2) return '';
      // Longest-serving first; current office outranks a former span at equal
      // years so a sitting holder always reads above someone out of office.
      entries.sort(function(a, b) {
        if (b.years !== a.years) return b.years - a.years;
        return (b.current ? 1 : 0) - (a.current ? 1 : 0);
      });
      var maxY = entries.reduce(function(m, e) { return Math.max(m, e.years); }, 0);
      var rows = entries.map(function(e) {
        var pct = maxY > 0 ? Math.max(e.years > 0 ? 8 : 0, Math.round((e.years / maxY) * 100)) : 0;
        var url = (typeof _getPhotoUrl === 'function') ? _getPhotoUrl(e.pid) : '';
        var av = url
          ? '<span class="kr-xp-av"><img loading="lazy" decoding="async" src="' + url + '" alt="' + e.name + '" onerror="this.parentElement.textContent=\'' + (e.d.icon || '🏛') + '\'"></span>'
          : '<span class="kr-xp-av">' + (e.d.icon || '🏛') + '</span>';
        var val = (e.kind === 'new')
          ? '<span class="kr-xp-newchip">🆕 New</span>'
          : (e.years > 0
            ? '<span class="kr-xp-val"><span class="kr-xp-val-num">' + e.years + '</span>' +
                '<span class="kr-xp-val-unit">' + (e.kind === 'former' ? 'yrs past' : 'yrs') + '</span></span>'
            : '<span class="kr-xp-val"><span class="kr-xp-val-num" style="color:#7e8aa3;">—</span>' +
                '<span class="kr-xp-val-unit">on record</span></span>');
        return '<button type="button" class="kr-xp-row is-' + e.kind + '" ' +
            'onclick="if(typeof showProfile===\'function\')showProfile(\'' + e.pid + '\')" ' +
            'aria-label="' + e.name + ' — ' + e.sub.replace(/"/g, '') + '">' +
            av +
            '<span class="kr-xp-mid">' +
              '<span class="kr-xp-name">' + e.name + '</span>' +
              '<span class="kr-xp-sub">' + e.sub + '</span>' +
              '<span class="kr-xp-meter"><span class="kr-xp-fill" style="width:' + pct + '%;"></span></span>' +
            '</span>' +
            val +
          '</button>';
      }).join('');
      var summary = _krXpSummary(entries);
      return '<div class="kr-xp">' +
          '<span class="kr-xp-title"><span class="kr-xp-ico">⏳</span>Experience Across the Field</span>' +
          (summary ? '<div class="kr-xp-sum">' + summary + '</div>' : '<div style="height:0.5rem;"></div>') +
          '<div class="kr-xp-rows">' + rows + '</div>' +
        '</div>';
    }

    // ── Compact overview helpers ─────────────────────────────────────────────
    // Key Races is the lightweight "who represents me" scan that funnels into
    // Relevant to Me, so these render a slim card instead of the rich hero: a
    // small ballot pill for the header, one compact officeholder row, and a clean
    // Add / Compare / Profile action row.

    // Small "on-ballot" status pill for the card header — collapses the old
    // full-width ballot banner into a single chip so the header stays one line.
    function _krBallotPill(race) {
      var tone = _krRaceTone(race);
      if (tone === 'future') {
        var b = race.ballot || {};
        var yr = (String(b.label || race.incumbentNote || '').match(/20\d\d/) || [])[0];
        return '<span class="kr-head-ballot is-future">🗓️ ' + (yr ? 'Next ' + yr : 'Not on 2026') + '</span>';
      }
      if (tone === 'open') return '<span class="kr-head-ballot is-open">🪑 Open · 2026</span>';
      return '<span class="kr-head-ballot is-now">✓ On 2026 Ballot</span>';
    }

    // The two core actions for a compact officeholder row: Add to My Team
    // (primary) and Profile. Reuses the same pick mechanism as the rest of the
    // site so picks land in the one 6-slot team. Side-by-side comparison is
    // deliberately NOT offered here — Key Races is the quick overview, so weighing
    // candidates head-to-head lives one tap down in the full field (Relevant to
    // Me), the medium modal and the full profile, keeping the card scannable and
    // the "research the race" path unambiguous.
    function _krHolderActions(race, pid, d, isPick) {
      var prof = '<button onclick="if(typeof showProfile===\'function\')showProfile(\'' + pid + '\')" class="kr-mini-btn" aria-label="Open the full profile for ' + d.name + '">' +
          '<span class="kr-mini-ico">👤</span>Profile' +
        '</button>';
      // Reference races (e.g. Utah's Lt. Governor, elected on a joint ticket) have
      // no standalone ballot slot, so a pick would have nowhere to land — offer the
      // profile/track path only, never an "Add to My Team" that silently orphans.
      if (race.reference) {
        return '<div class="kr-mini-actions">' + prof + '</div>';
      }
      var add = '<button onclick="window.ballotPickCardAnimated(this,\'' + race.raceKey + '\',\'' + pid + '\')" class="kr-mini-btn kr-mini-add' + (isPick ? ' is-on' : '') + '" aria-label="' + (isPick ? 'Remove ' + d.name + ' from My Team' : 'Add ' + d.name + ' to My Team') + '">' +
          '<span class="kr-mini-ico">' + (isPick ? '✓' : '➕') + '</span>' + (isPick ? 'On Team' : 'Add') +
        '</button>';
      return '<div class="kr-mini-actions">' + add + prof + '</div>';
    }

    // Compact current-officeholder row: small photo, name (→ profile), party + an
    // "In Office" chip, the office line, a tenure / status pill, and the actions.
    function _krHolderCompact(race, pid, selectedPid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return '';
      var isPick = selectedPid === pid;
      var tenure = _krIncTenure(race, pid);
      var note = (race.incumbentNotes && race.incumbentNotes[pid]) || race.incumbentNote || '';
      var future = note && /not on the 2026 ballot|next election|next contested|next up|runs through/i.test(note);
      var statusPill = note ? '<span class="kr-holder-status' + (future ? ' is-future' : '') + '">' + (future ? '🗓️ ' : '') + note + '</span>' : '';
      var pills = (tenure || statusPill) ? '<div class="kr-holder-pills">' + tenure + statusPill + '</div>' : '';
      return '<div class="kr-holder' + (isPick ? ' is-pick' : '') + '">' +
          '<div class="kr-holder-top">' +
            _krPhoto(pid, d, '#f5c842') +
            '<div class="kr-holder-meta">' +
              '<button onclick="if(typeof openMediumModal===\'function\')openMediumModal(\'' + pid + '\')" class="kr-holder-name">' + d.name + '</button>' +
              '<div class="kr-holder-badges"><span class="kr-holder-inoffice">★ In Office</span>' + _krPartyBadge(d.party) + '</div>' +
              '<div class="kr-holder-office">' + (_krCleanOffice(d.office) || 'Current officeholder') + '</div>' +
            '</div>' +
          '</div>' +
          pills +
          _krHolderActions(race, pid, d, isPick) +
        '</div>';
    }

    // Compact open-seat row for a race with no sitting officeholder.
    function _krOpenHolder(race) {
      return '<div class="kr-holder is-open">' +
          '<div class="kr-holder-top">' +
            '<div class="kr-holder-openavatar" style="border-color:' + race.color + '88;">🪑</div>' +
            '<div class="kr-holder-meta">' +
              '<div class="kr-holder-badges"><span class="kr-holder-status">🪑 Open Seat · 2026</span></div>' +
              '<div class="kr-open-mini">' + (race.incumbentNote || 'No incumbent on the 2026 ballot — this seat is decided by the candidates below.') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    function _krRaceCard(race) {
      var selections = (typeof _ballotLoad === 'function') ? _ballotLoad() : {};
      var selectedPid = selections[race.raceKey];
      var selInThisRace = selectedPid && race.candidates.indexOf(selectedPid) !== -1 ? selectedPid : (selectedPid && race.incumbentPid === selectedPid ? selectedPid : null);
      // selectedPid may also be the incumbent (e.g. retiring) if user picked them elsewhere
      if (selectedPid && !selInThisRace && CMP_DATA[selectedPid]) selInThisRace = selectedPid;

      // ── Per-race coverage ribbon ─────────────────────────────────────────────
      // Directly under the ballot banner, a clear status line so the voter always
      // knows whether this seat is covered on their team. Covered → green confirm
      // with the picked name; on the 2026 ballot but empty → gold "you haven't
      // added anyone yet" nudge with the seat name, pointing at the picks below.
      // Reference-only seats (not on the 2026 ballot) get no nag.
      var coverStrip = '';
      if (selInThisRace && CMP_DATA[selInThisRace]) {
        coverStrip = '<div class="kr-cover-strip is-covered">' +
            '<span class="kr-cover-ico">✓</span>' +
            '<span class="kr-cover-text"><strong>' + CMP_DATA[selInThisRace].name + '</strong> is on your team for this seat</span>' +
          '</div>';
      } else if (_krRaceTone(race) === 'now' || _krRaceTone(race) === 'open') {
        coverStrip = '<div class="kr-cover-strip is-gap">' +
            '<span class="kr-cover-ico">🎯</span>' +
            '<span class="kr-cover-text">No one on your team for ' + (race.short || 'this race') + ' yet — add the officeholder, or see the full field in Relevant to Me</span>' +
          '</div>';
      }

      // ── Current officeholder(s) ─────────────────────────────────────────────
      // A race can have more than one sitting officeholder (e.g. a state's two
      // U.S. Senators), so we render every incumbent as its own elevated hero.
      var incList = (race.incumbentPids && race.incumbentPids.length)
        ? race.incumbentPids.slice()
        : (race.incumbentPid ? [race.incumbentPid] : []);
      incList = incList.filter(function(pid) { return typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]; });

      // Key Races is the quick overview, so each officeholder renders as a compact
      // identity row (photo + name + party + office + tenure) with the three core
      // actions — not the rich hero. The deep record lives in Relevant to Me and
      // the profile, one tap below.
      var holderHtml = incList.length
        ? incList.map(function(pid) { return _krHolderCompact(race, pid, selectedPid); }).join('')
        : _krOpenHolder(race);

      // ── The field, for the bridge CTA ────────────────────────────────────────
      // Key Races is the lightweight overview: it shows WHO holds the seat today
      // and one prominent path to the full field. The challenger roster, the score
      // strips, the experience rail and the head-to-head compare all live one tap
      // down in Relevant to Me, so the overview card stays short and scannable. We
      // still tally the people we have records for so the bridge can name the size
      // of the field before the voter jumps.
      var challengerPids = race.candidates.filter(function(pid) {
        return incList.indexOf(pid) === -1 && typeof CMP_DATA !== 'undefined' && CMP_DATA[pid];
      });
      // The number the bridge advertises MUST equal the field Relevant to Me will
      // actually render for this seat, or the tool reads as broken. For the curated
      // statewide seats (Governor, U.S. Senate) we therefore count from the shared
      // _pdxStatewideRaceField source of truth — the same list RtM builds — which
      // folds in any live-data challenger the static roster doesn't name and drops
      // anyone misfiled by a drifting office string. District seats keep the curated
      // roster tally. Falls back to the roster count if the helper isn't ready yet.
      var _swField = (typeof window._pdxStatewideRaceField === 'function')
        ? window._pdxStatewideRaceField(race.raceKey) : null;
      var _fieldPids = (_swField && _swField.length)
        ? _swField
        : incList.concat(challengerPids);
      // Split the field by role so the bridge label can tell the truth about WHAT
      // the voter will find: sitting officeholders, declared challengers, or both.
      // A race whose whole "field" is two sitting U.S. Senators is not "2
      // candidates" — calling it that is exactly the mismatch this card must avoid.
      // Former holders are reference-only and never counted as part of the live
      // field. The number the bridge advertises = officeholders + challengers, the
      // same people Relevant to Me renders as the live field for this seat.
      var _nHolders = 0, _nChallengers = 0;
      _fieldPids.forEach(function(pid) {
        var _d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
        if (!_d) return;
        var _st = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(_d) : 'office';
        if (_st === 'candidate') _nChallengers++;
        else if (_st !== 'former') _nHolders++;
      });
      var fieldCount = _nHolders + _nChallengers;

      // ── "See full list for this district" — the prominent bridge to Relevant to
      // Me, and this card's primary call to action. It scrolls the voter down to
      // the same seat's full, filtered candidate list in Relevant to Me, where the
      // deeper research lives (every candidate, scores, values ranking, compare).
      // Labelled with the real field size so the voter knows how many candidates
      // they'll find before they jump.
      var fullListLabel = race.short || 'this seat';
      // Honest, role-aware title so the button never over-promises a "field" that
      // is really just the sitting officeholder(s). Mirrors the live roster below:
      //   • only officeholders, no challengers → name them as officeholders
      //   • only candidates (open seat)        → name them as candidates
      //   • a sitting holder + challengers      → say so explicitly
      var fullListTitle;
      if (fieldCount === 0) {
        fullListTitle = 'See everyone running for ' + fullListLabel;
      } else if (_nChallengers === 0) {
        fullListTitle = _nHolders === 1
          ? 'See the current officeholder for ' + fullListLabel
          : (_nHolders === 2
              ? 'See both current officeholders for ' + fullListLabel
              : 'See all ' + _nHolders + ' current officeholders for ' + fullListLabel);
      } else if (_nHolders === 0) {
        fullListTitle = fieldCount === 1
          ? 'See the candidate for ' + fullListLabel
          : 'See all ' + fieldCount + ' candidates for ' + fullListLabel;
      } else {
        fullListTitle = 'See the officeholder + ' + _nChallengers +
          (_nChallengers === 1 ? ' challenger for ' : ' challengers for ') + fullListLabel;
      }
      var fullListBtn =
        '<button type="button" onclick="window.keyRacesViewFullList(\'' + race.raceKey + '\')" class="kr-fulllist-btn" ' +
          'aria-label="See the full candidate list for ' + fullListLabel + ' in the Relevant to Me section below">' +
          '<span class="kr-fulllist-ico" aria-hidden="true">📋</span>' +
          '<span class="kr-fulllist-text">' +
            '<span class="kr-fulllist-eyebrow">Go deeper · Relevant to Me</span>' +
            '<span class="kr-fulllist-title">' + fullListTitle + '</span>' +
          '</span>' +
          '<span class="kr-fulllist-go" aria-hidden="true">↓</span>' +
        '</button>';

      return '<div id="kr-race-' + race.raceKey + '" class="kr-race-card" style="border-color:' + race.color + '40;">' +
        '<div class="kr-race-head" style="background:linear-gradient(135deg,' + race.color + '22,' + race.color + '0a);border-bottom-color:' + race.color + '33;">' +
          '<span class="kr-race-chamber" style="color:' + race.color + ';background:' + race.color + '1f;border:1px solid ' + race.color + '45;">' + race.chamber + '</span>' +
          '<span class="kr-race-district">' + race.district + '</span>' +
          _krBallotPill(race) +
        '</div>' +
        coverStrip +
        '<div class="kr-race-body">' +
          '<div class="kr-incumbent-label">' + (incList.length ? (incList.length > 1 ? 'Your Current Officeholders' : 'Currently Represented By') : '2026 Open Race') + '</div>' +
          holderHtml +
          '<div style="margin-top:0.6rem;">' + fullListBtn + '</div>' +
        '</div>' +
      '</div>';
    }

    window.keyRacesHintRace = function(raceKey) {
      _keyRacesHint[raceKey] = true;
      if (window.renderKeyRaces) window.renderKeyRaces();
      setTimeout(function() { _keyRacesHint[raceKey] = false; if (window.renderKeyRaces) window.renderKeyRaces(); }, 4000);
    };

    // ── Quick-research actions on each 2026 candidate (Compare / Spotlight / Profile) ──
    // Compare: add/remove the candidate from the site-wide compare tool, reusing the
    // same selection state and floating-bar logic as every other Compare button.
    window.keyRacesCompare = function(btn, pid) {
      try {
        if (typeof bpAddCompare === 'function') {
          bpAddCompare(pid, btn);
        } else if (typeof _cmpSelected !== 'undefined') {
          if (_cmpSelected.has(pid)) _cmpSelected.delete(pid); else _cmpSelected.add(pid);
        }
      } catch (e) {}
      // bpAddCompare rewrites the button label for the standard compare buttons;
      // restyle ours back to the compact Key Races look reflecting the new state.
      try {
        var added = (typeof _cmpSelected !== 'undefined' && _cmpSelected.has && _cmpSelected.has(pid));
        if (btn) {
          btn.classList.toggle('added', !!added);
          btn.innerHTML = '<span class="kr-action-ico">' + (added ? '✓' : '⚖️') + '</span>' + (added ? 'Comparing' : 'Compare');
        }
      } catch (e) {}
    };

    // ── Compare a whole race in one tap ──────────────────────────────────────
    // Loads every candidate competing for THIS seat (incumbent + challengers)
    // into the side-by-side compare tool and opens it. Because the picks are all
    // one race, the compare overlay's "same seat" coaching fires and the voter
    // gets a clean head-to-head — the natural step between browsing a district
    // and committing a pick to their team. The candidate ids are passed in as a
    // comma-joined list straight from the rendered card, so no race lookup is
    // needed. We reset any prior ad-hoc compare selection first so the overlay
    // shows exactly this race, not a mix of seats.
    window.keyRacesCompareRace = function(pidsCsv) {
      try {
        var pids = (pidsCsv || '').split(',').filter(function(p) {
          return p && typeof CMP_DATA !== 'undefined' && CMP_DATA[p];
        });
        if (pids.length < 2) {
          // Nothing meaningful to compare — fall back to the first profile.
          if (pids.length === 1 && typeof showProfile === 'function') showProfile(pids[0]);
          return;
        }
        // Clear whatever was previously staged for comparison so this race stands
        // alone, mirroring the un-select bookkeeping the standalone compare tool uses.
        if (typeof _cmpSelected !== 'undefined' && _cmpSelected.size) {
          Array.from(_cmpSelected).forEach(function(p) {
            _cmpSelected.delete(p);
            document.querySelectorAll('.compare-cb[data-pid="' + p + '"]').forEach(function(c) { c.checked = false; });
            document.querySelectorAll('.bp-compare-btn[data-pid="' + p + '"]').forEach(function(b) {
              b.textContent = '+ COMPARE'; b.classList.remove('added');
              var card = b.closest('.card-holo'); if (card) card.classList.remove('cmp-highlight');
            });
            var pmBtn = document.getElementById('pmc-' + p);
            if (pmBtn) { pmBtn.textContent = '+ Compare'; pmBtn.classList.remove('added'); }
          });
        }
        pids.forEach(function(p) {
          if (typeof _cmpSelectPid === 'function') _cmpSelectPid(p);
          else if (typeof _cmpSelected !== 'undefined') _cmpSelected.add(p);
        });
        if (typeof _updateCmpFloat === 'function') _updateCmpFloat();
        if (typeof _pmUpdateTray === 'function') _pmUpdateTray();
        // Repaint the Key Races cards so their per-candidate Compare chips reflect
        // the new "Comparing" state, then open the side-by-side overlay.
        if (window.renderKeyRaces) window.renderKeyRaces();
        if (typeof openCompare === 'function') openCompare();
      } catch (e) {}
    };

    // Align: open a quick view of how this candidate matches the visitor's chosen
    // issues — a focused alignment breakdown, not the whole profile. If no issues
    // are set yet, guide them to the picker so the score becomes meaningful.
    function _krAlignGuideToPicker() {
      var panel = document.getElementById('relevant-alignments-panel') || document.getElementById('alignment-panel');
      if (!panel) return;
      if (panel.id === 'alignment-panel' && window.alignTogglePanel) window.alignTogglePanel(true);
      try { panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      var body = document.getElementById('relevant-alignments-body');
      if (body && body.style.display === 'none' && typeof window.toggleRelevantAlignments === 'function') {
        window.toggleRelevantAlignments();
      }
      panel.style.transition = 'box-shadow 0.4s ease';
      panel.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.5), 0 0 26px rgba(139,92,246,0.3)';
      setTimeout(function() { panel.style.boxShadow = ''; }, 1600);
    }
    window._krAlignGuideToPicker = _krAlignGuideToPicker;

    function _krAlignColor(s) {
      return s >= 70 ? '#4ade80' : s >= 50 ? '#f5c842' : '#f87171';
    }

    // Plain-language quality label for a match %, using the same 70/50 thresholds
    // (and therefore the same colour) as _krAlignColor so the badge and number
    // always agree. Purely presentational — the score itself is unchanged.
    function _krAlignMatchLabel(s) {
      return s >= 70 ? 'Strong match' : s >= 50 ? 'Partial match' : 'Weak match';
    }

    // Build the inline issue-by-issue bars used inside an expanded card breakdown.
    function _krAlignInlineRows(bd, pid, d) {
      d = d || ((typeof CMP_DATA !== 'undefined' && pid != null) ? CMP_DATA[pid] : null) || {};
      return bd.issues.map(function(it) {
        var ic = _krAlignColor(it.score);
        // A documented position on this exact issue is the strongest evidence — flag
        // it as such; only the genuinely thin (inferred) issues get the limited note.
        var note = it.direct
          ? '<span class="kraq-doc-badge" title="A documented, sourced position on this exact issue">📍 Stated</span>'
          : (it.hasEvidence ? '' : '<span style="font-size:0.54rem;color:#7596c0;margin-left:0.3rem;">(limited record)</span>');
        // Surface the visitor's own intensity on the issue so the breakdown reflects
        // how they weighted it (Strong = counts more, Opposed = inverted match).
        var tag = '';
        var _itLvl = (typeof window._alignMigrateLevel === 'function') ? window._alignMigrateLevel(it.intensity) : it.intensity;
        var _tagBase = 'font-size:0.5rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;border-radius:999px;padding:0.02rem 0.32rem;margin-left:0.3rem;';
        if (_itLvl === 'strongly_support') tag = '<span style="' + _tagBase + 'color:#6ee7a0;background:rgba(74,222,128,0.16);border:1px solid rgba(74,222,128,0.4);">💪 Strongly Support</span>';
        else if (_itLvl === 'oppose') tag = '<span style="' + _tagBase + 'color:#f89b9b;background:rgba(248,113,113,0.16);border:1px solid rgba(248,113,113,0.4);">👎 Oppose</span>';
        else if (_itLvl === 'strongly_oppose') tag = '<span style="' + _tagBase + 'color:#f89b9b;background:rgba(248,113,113,0.22);border:1px solid rgba(248,113,113,0.55);">✋ Strongly Oppose</span>';
        else if (_itLvl === 'neutral') tag = '<span style="' + _tagBase + 'color:#f5d77a;background:rgba(245,200,66,0.14);border:1px solid rgba(245,200,66,0.35);">😐 Neutral</span>';
        // Same Evidence-Locker stance pill + gold power badge as the full breakdown,
        // so even the compact in-card view shows WHERE they stand and whether they
        // hold the levers, not just a bar.
        var stanceChip = (it.direct && typeof window._pdxStanceChipHtml === 'function')
          ? window._pdxStanceChipHtml(it.stance, { label: it.stance === 'support' ? 'Supports' : it.stance === 'oppose' ? 'Opposes' : 'Mixed record' })
          : '';
        var powerBadge = '';
        try {
          if (typeof window._powerTie === 'function' && typeof window._alignPowerBadgeHtml === 'function' && it.key) {
            var _ck = (typeof window._pdxCategoryOf === 'function') ? window._pdxCategoryOf(it.key) : 'other';
            if (_ck && _ck !== 'other') {
              var _pt = window._powerTie({ id: pid, name: d.name, office: d.office, category: _ck,
                categoryLabel: (typeof window._pdxCategoryLabelOf === 'function') ? window._pdxCategoryLabelOf(it.key) : 'this area', issueKey: it.key });
              powerBadge = window._alignPowerBadgeHtml(_pt);
            }
          }
        } catch (e) {}
        var signalRow = (stanceChip || powerBadge)
          ? '<div class="kraq-signal-row" style="margin-top:0.3rem;">' + stanceChip + powerBadge + '</div>' : '';
        // Voting-record consistency line — "what they actually did" vs. their stance
        // on this issue, when their votes are on record (Phase 5).
        var recordRow = '';
        if (it.record && it.record.total) {
          var _rv = it.record.netVerdict;
          var _rc = _rv === 'consistent' ? '#6ee7a0' : _rv === 'contradicts' ? '#f89b9b' : _rv === 'mixed' ? '#93c5fd' : '#9fb4d4';
          var _rlabel = it.record.label || (it.record.total + ' vote' + (it.record.total === 1 ? '' : 's') + ' on record');
          recordRow = '<div class="kraq-record-row" style="margin-top:0.25rem;font-size:0.6rem;color:' + _rc + ';display:flex;align-items:center;gap:0.3rem;">'
            + '<span aria-hidden="true">🗳️</span><span>' + _rlabel + ' · ' + it.record.total + ' vote' + (it.record.total === 1 ? '' : 's')
            + (it.record.contradicts ? ' · ' + it.record.contradicts + ' against stance' : '') + '</span></div>';
        }
        return '<div class="kr-align-issue">' +
          '<div class="kr-align-issue-head"><span>' + it.label + note + tag + '</span><span style="color:' + ic + ';font-weight:700;">' + it.score + '%</span></div>' +
          '<div class="kr-align-issue-bar"><div style="height:100%;width:' + it.score + '%;background:linear-gradient(90deg,' + ic + '88,' + ic + ');border-radius:999px;"></div></div>' +
          signalRow +
          recordRow +
        '</div>';
      }).join('');
    }

    // Quick-adjust issue chips shown at the bottom of an expanded alignment
    // breakdown. Each chip toggles one issue in/out of the visitor's selection
    // and instantly re-weights the personalized match — no leaving Key Races.
    function _krAlignQuickAdjustHtml() {
      var map = window._alignIssueMap || {};
      var active = window._alignIssues;
      var keys = Object.keys(map);
      if (!keys.length) return '';
      var selCount = 0;
      // Selected issues first so the visitor instantly sees what's currently driving
      // the score, then the rest available to add — every chip toggles in place.
      keys.sort(function(a, b) {
        var aOn = !!(active && active.has && active.has(a));
        var bOn = !!(active && active.has && active.has(b));
        return (bOn ? 1 : 0) - (aOn ? 1 : 0);
      });
      var chips = keys.map(function(key) {
        var on = !!(active && active.has && active.has(key));
        if (on) selCount++;
        return '<button type="button" onclick="window.alignToggleIssue(\'' + key + '\')" class="kr-align-chip' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
          '<span class="kr-align-chip-mark">' + (on ? '✓' : '+') + '</span>' + map[key].label +
        '</button>';
      }).join('');
      return '<div class="kr-align-adjust">' +
        '<div class="kr-align-adjust-head">' +
          '<div class="kr-align-adjust-title" style="margin-bottom:0;">⚙ Adjust your issues — tap to add or remove</div>' +
          '<span class="kr-align-adjust-count">' + selCount + ' selected</span>' +
        '</div>' +
        '<div class="kr-align-chip-row">' + chips + '</div>' +
      '</div>';
    }

    // • No issues chosen  → a clean prompt that opens the issue picker.
    // • Issues chosen      → a prominent "<n>% Aligned with your issues" bar that
    //   expands an issue-by-issue breakdown in place (no modal, no leaving the
    //   Key Races section).
    function _krAlignInlineHtml(pid, d) {
      var n = (typeof window._alignIssueCount === 'function') ? window._alignIssueCount()
            : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) || 0);
      if (!n) {
        return '<button type="button" onclick="window.keyRacesAlignQuickView(\'' + pid + '\')" class="kr-align-inline kr-align-inline-setup" aria-label="See which issues ' + d.name + ' has positions on and build your personalized match">' +
            '<span class="kr-align-inline-ico">🎯</span>' +
            '<span class="kr-align-inline-text">' +
              '<span class="kr-align-inline-title">See your personal match</span>' +
              '<span class="kr-align-inline-sub">See the issues ' + (d.name || '').split(' ')[0] + ' has positions on — pick what matters to you</span>' +
            '</span>' +
            '<span class="kr-align-inline-go">›</span>' +
          '</button>';
      }
      var bd = (typeof window._calcAlignmentBreakdown === 'function') ? window._calcAlignmentBreakdown(pid) : null;
      if (!bd) {
        // Issues are set but this candidate has no record to ground a match yet.
        return '<div class="kr-align-inline kr-align-inline-setup" style="cursor:default;">' +
            '<span class="kr-align-inline-ico">🎯</span>' +
            '<span class="kr-align-inline-text">' +
              '<span class="kr-align-inline-title">No alignment record yet</span>' +
              '<span class="kr-align-inline-sub">Not enough data on this candidate</span>' +
            '</span>' +
          '</div>';
      }
      var overall = bd.overall;
      var col = _krAlignColor(overall);
      var matchLabel = _krAlignMatchLabel(overall);
      var expanded = _krAlignExpanded.has(pid);
      // Always show WHICH of the visitor's issues this score is built from, so the
      // number is transparent — name the first couple, then "+N more".
      var labels = bd.issues.map(function(it) { return it.label; });
      var shown = labels.slice(0, 2).join(' · ');
      var extra = labels.length > 2 ? ' · +' + (labels.length - 2) + ' more' : '';
      return '<div class="kr-align-inline-wrap">' +
        '<button type="button" onclick="window._krToggleAlignInline(this,\'' + pid + '\')" class="kr-align-inline kr-align-inline-scored" aria-expanded="' + (expanded ? 'true' : 'false') + '" aria-label="' + overall + ' percent aligned with your issues for ' + d.name + ' — ' + matchLabel + '. Tap for an issue-by-issue breakdown and to adjust your issues." style="border-color:' + col + '66;box-shadow:inset 0 0 0 1px ' + col + '22;">' +
          '<span class="kr-align-inline-num" style="color:' + col + ';text-shadow:0 0 12px ' + col + '55;">' + overall + '<span style="font-size:1rem;">%</span></span>' +
          '<span class="kr-align-inline-text">' +
            '<span style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">' +
              '<span class="kr-align-inline-title" style="color:' + col + ';">Aligned with your issues</span>' +
              '<span class="kr-align-inline-badge" style="color:' + col + ';background:' + col + '22;border:1px solid ' + col + '66;">' + matchLabel + '</span>' +
            '</span>' +
            '<span class="kr-align-mini"><div style="width:' + overall + '%;background:linear-gradient(90deg,' + col + '88,' + col + ');"></div></span>' +
            '<span class="kr-align-issues-line">🎯 Across <b>' + shown + '</b>' + extra + ' · <span class="kr-align-edit">tap to view &amp; adjust</span></span>' +
          '</span>' +
          '<span class="kr-align-inline-chev" style="transform:rotate(' + (expanded ? '180' : '0') + 'deg);">▾</span>' +
        '</button>' +
        '<div class="kr-align-inline-body" style="display:' + (expanded ? 'block' : 'none') + ';">' +
          _krAlignInlineRows(bd, pid, d) +
          _krAlignQuickAdjustHtml() +
          '<button type="button" onclick="window.keyRacesAlignQuickView(\'' + pid + '\')" class="kr-align-inline-more">View full breakdown →</button>' +
        '</div>' +
      '</div>';
    }
    window._krAlignInlineHtml = _krAlignInlineHtml;

    // Expand / collapse a card's inline alignment breakdown in place. We toggle the
    // DOM directly (no full re-render) so the rest of the card never repaints.
    window._krToggleAlignInline = function(btn, pid) {
      try {
        var wrap = btn.closest('.kr-align-inline-wrap');
        if (!wrap) return;
        var body = wrap.querySelector('.kr-align-inline-body');
        var chev = btn.querySelector('.kr-align-inline-chev');
        var open = _krAlignExpanded.has(pid);
        if (open) {
          _krAlignExpanded.delete(pid);
          if (body) body.style.display = 'none';
          btn.setAttribute('aria-expanded', 'false');
          if (chev) chev.style.transform = 'rotate(0deg)';
        } else {
          _krAlignExpanded.add(pid);
          if (body) body.style.display = 'block';
          btn.setAttribute('aria-expanded', 'true');
          if (chev) chev.style.transform = 'rotate(180deg)';
        }
      } catch (e) {}
    };

    window.keyRacesAlign = function(pid) {
      // Always open this candidate's match view — keyRacesAlignQuickView shows the
      // scored breakdown when issues are picked, or the issue-discovery view (which
      // issues THIS candidate has positions on) when the visitor hasn't picked yet.
      window.keyRacesAlignQuickView(pid);
    };

    function _krEnsureAlignOverlay() {
      var ov = document.getElementById('kr-align-overlay');
      if (ov) return ov;
      ov = document.createElement('div');
      ov.id = 'kr-align-overlay';
      ov.className = 'kraq-overlay';
      ov.addEventListener('click', function(e) { if (e.target === ov) window.keyRacesCloseAlign(); });
      document.body.appendChild(ov);
      return ov;
    }

    window.keyRacesCloseAlign = function() {
      var ov = document.getElementById('kr-align-overlay');
      if (!ov) return;
      ov.style.opacity = '0';
      setTimeout(function() {
        ov.style.display = 'none';
        var others = ['modal-overlay', 'accountability-overlay', 'compare-overlay', 'auth-overlay'];
        var anyOpen = others.some(function(id) { var el = document.getElementById(id); return el && el.style.display && el.style.display !== 'none'; });
        if (!anyOpen) document.body.style.overflow = '';
      }, 200);
    };

    // ── Issue-discovery view (opened when a visitor taps a candidate's match
    //    BEFORE picking any issues of their own) ─────────────────────────────
    // Instead of bouncing to the generic, candidate-agnostic picker, this shows
    // WHICH specific issues THIS politician has documented positions on — turning
    // the dead-end into the most productive entry point. It's especially valuable
    // for thin / new candidates whose entire record IS those stated positions:
    // the visitor sees exactly what's available to match on, taps the issues that
    // matter to them, and the modal instantly re-opens as a real, scored breakdown.
    // No data is fabricated — when a candidate has no documented positions we say so
    // plainly and offer popular issues plus the full picker.
    function _krAlignDiscoveryView(pid, d) {
      var amap = window._alignIssueMap || {};
      var polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};
      var firstName = (d.name || 'This candidate').split(' ')[0];

      // The candidate's OWN documented positions, keyed to issues the tool can match.
      var docKeys = Object.keys(polMap).filter(function(k) { return amap[k]; });

      function _addChip(key, withStance) {
        var lab = (amap[key] && amap[key].label) ? amap[key].label : key;
        var stHtml = '';
        if (withStance && polMap[key]) {
          var st = polMap[key].stance;
          var stIco = st === 'support' ? '✓' : st === 'oppose' ? '✗' : '~';
          stHtml = '<span class="kraq-avail-st">' + stIco + '</span>';
        }
        return '<button type="button" class="kraq-avail-chip" title="Add “' + lab.replace(/"/g, '&quot;') + '” to your issues and see how ' + firstName.replace(/"/g, '&quot;') + ' lines up" ' +
            'onclick="window.alignSetIntensity(\'' + key + '\',\'moderate\');window.keyRacesAlignQuickView(\'' + pid + '\');">' +
            stHtml + lab + '<span class="kraq-avail-plus">＋</span>' +
          '</button>';
      }

      // Block 1 — this politician's documented positions (the high-value list).
      var docBlock = '';
      if (docKeys.length) {
        var docChips = docKeys.slice(0, 12).map(function(k) { return _addChip(k, true); }).join('');
        docBlock =
          '<div class="kraq-avail" style="margin-top:0;">' +
            '<div class="kraq-avail-head">📍 ' + firstName + ' has stated positions on ' + docKeys.length + ' issue' + (docKeys.length === 1 ? '' : 's') + '</div>' +
            '<div class="kraq-avail-sub">These are documented, sourced stances — tap any that matter to you to instantly see where you line up.</div>' +
            '<div class="kraq-avail-chips">' + docChips + '</div>' +
          '</div>';
      }

      // Block 2 — popular issues (only those NOT already shown above), so even a
      // thin candidate offers a path into a meaningful, personalized match.
      var quick = (window._alignQuickPicks || []).filter(function(k) { return amap[k] && !polMap[k]; });
      var quickBlock = '';
      if (quick.length) {
        var quickChips = quick.slice(0, 10).map(function(k) { return _addChip(k, false); }).join('');
        quickBlock =
          '<div class="kraq-disc-quick">' +
            '<div class="kraq-disc-quick-head">⚡ Or start from a popular issue</div>' +
            '<div class="kraq-avail-chips">' + quickChips + '</div>' +
          '</div>';
      }

      // Honest framing when there's nothing documented to match on yet.
      var emptyNote = docKeys.length ? '' :
        '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:0.7rem;padding:0.6rem 0.75rem;margin-bottom:0.9rem;">' +
          '<span style="font-size:0.95rem;line-height:1.2;flex:none;">🌱</span>' +
          '<p style="font-size:0.66rem;color:#fcd9a6;line-height:1.5;margin:0;">We don\'t have documented positions for ' + firstName + ' on file yet. Pick the issues you care about below and we\'ll match them against ' + firstName + '\'s broader record as it\'s verified — the profile\'s \u2696\ufe0f Word vs Action index shows what we do know so far.</p>' +
        '</div>';

      var photo = _krPhoto(pid, d, '#2dd4bf');
      var partyMeta = _krPartyMeta(d.party);
      var partyHtml = partyMeta ? '<span style="color:' + partyMeta.color + ';">' + partyMeta.label + '</span>' : '';
      var _dStatus = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var _dCandBadge = (_dStatus === 'candidate' && typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(d, { size: 'sm' }) : '';
      var _dDepthBadge = (typeof window._pdxDepthBadge === 'function') ? window._pdxDepthBadge(d, { size: 'sm' }) : '';
      var _dHeadBadges = (_dCandBadge || _dDepthBadge)
        ? ('<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">' + _dCandBadge + _dDepthBadge + '</div>')
        : '';

      var html =
        '<div class="kraq-card">' +
          '<div style="position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:0.75rem;padding:1rem 1.1rem;background:linear-gradient(135deg,rgba(20,184,166,0.16),rgba(10,15,30,0.6));border-bottom:1px solid rgba(45,212,191,0.25);border-radius:1.1rem 1.1rem 0 0;">' +
            photo +
            '<div style="flex:1;min-width:0;">' +
              '<div class="font-condensed" style="font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:#5eead4;">🎯 Build Your Match</div>' +
              '<div class="font-display text-lg text-white" style="line-height:1.1;">' + d.name + '</div>' +
              '<div class="font-condensed" style="font-size:0.66rem;color:#9fb4d4;">' + partyHtml + (d.office ? ' · ' + d.office : '') + '</div>' +
              _dHeadBadges +
            '</div>' +
            '<button type="button" onclick="window.keyRacesCloseAlign()" aria-label="Close" style="flex-shrink:0;width:34px;height:34px;border-radius:0.65rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#cbd9ec;cursor:pointer;font-size:1.05rem;line-height:1;">✕</button>' +
          '</div>' +
          '<div style="padding:1.1rem;">' +
            '<p style="font-size:0.74rem;color:#cbd9ec;line-height:1.55;margin:0 0 1rem;">Your personal match is built from <b style="color:#5eead4;">the issues you care about</b> — not party labels. Pick a few below to see exactly how ' + firstName + ' aligns with you, issue by issue.</p>' +
            emptyNote +
            docBlock +
            quickBlock +
            '<div style="display:flex;gap:0.5rem;margin-top:1.1rem;">' +
              '<button type="button" onclick="window.keyRacesCloseAlign();setTimeout(window._krAlignGuideToPicker,220);" style="flex:1;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#0d9488,#2dd4bf);border:none;padding:0.7rem;border-radius:0.6rem;box-shadow:0 4px 14px rgba(20,184,166,0.3);">⚙ Browse all issues</button>' +
              '<button type="button" onclick="window.keyRacesCloseAlign();setTimeout(function(){if(typeof showProfile===\'function\')showProfile(\'' + pid + '\');},220);" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#7ee7d8;background:rgba(20,184,166,0.12);border:1px solid rgba(45,212,191,0.4);padding:0.7rem 0.85rem;border-radius:0.6rem;">👤 Snapshot</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var ov = _krEnsureAlignOverlay();
      ov.innerHTML = html;
      ov.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function() { ov.style.opacity = '1'; });
    }
    window._krAlignDiscoveryView = _krAlignDiscoveryView;

    window.keyRacesAlignQuickView = function(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) { if (typeof showProfile === 'function') showProfile(pid); return; }
      // No issues chosen yet → show THIS candidate's available issues to pick from,
      // rather than bouncing to the generic picker (the discovery view above).
      var _n = (typeof window._alignIssueCount === 'function') ? window._alignIssueCount()
             : ((typeof _alignIssues !== 'undefined' && _alignIssues && _alignIssues.size) || 0);
      if (!_n) { _krAlignDiscoveryView(pid, d); return; }
      var bd = (typeof window._calcAlignmentBreakdown === 'function') ? window._calcAlignmentBreakdown(pid) : null;
      if (!bd) { _krAlignGuideToPicker(); return; }

      // Warm this member's voting record (once) so the per-issue consistency lines
      // can render; when it lands, re-open this same view so they appear. Guarded by
      // memberRecords() so it fetches at most once and never loops.
      try {
        if (window.PDXVotingRecord && typeof window.PDXVotingRecord.memberRecords === 'function'
            && !window.PDXVotingRecord.memberRecords(pid)) {
          window._kraqRecordPid = pid;
          window.PDXVotingRecord.fetchMember(pid, { pageSize: 100 }).then(function (data) {
            if (!data || !data.items || !data.items.length) return;
            window.PDXVotingRecord.noteMember(pid, data.items);
            // Re-render only if this view is still the one on screen.
            var ov = document.getElementById('kr-align-overlay');
            if (ov && ov.style.display !== 'none' && window._kraqRecordPid === pid) {
              window.keyRacesAlignQuickView(pid);
            }
          });
        }
      } catch (e) {}

      var overall = bd.overall;
      var col = _krAlignColor(overall);
      var partyMeta = _krPartyMeta(d.party);
      var partyHtml = partyMeta ? '<span style="color:' + partyMeta.color + ';">' + partyMeta.label + '</span>' : '';

      // Evidence Locker bridge — when this official has documents on record, every
      // breakdown row can jump straight to the evidence behind that exact position,
      // so "I see a score" → "here is the proof" is one tap. Counts are resolved once
      // from the same source the Compare cells use; once the library has loaded, the
      // per-issue link only shows on issues with at least one item (it carries the
      // live count). Before the library loads we fall back to the on-record check,
      // identical to the Compare cells, so the affordance is consistent site-wide.
      var _evCounts = (typeof window._pdxEvidenceIssueCountsForPerson === 'function') ? window._pdxEvidenceIssueCountsForPerson(pid) : null;
      var _evHasLocker = (typeof window._pdxHasLocker === 'function') && window._pdxHasLocker(pid);
      var _evJsId = String(pid == null ? '' : pid).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

      // Stance pill labels in the Evidence Locker's own language, so the chip a
      // voter sees here matches the Locker exactly.
      var _KRAQ_STANCE = {
        support: 'Supports', oppose: 'Opposes', mixed: 'Mixed record'
      };
      // Positional power on this issue (committee seat, statutory office, chamber
      // leadership, sponsorship), read from the SAME _powerTie the Evidence Locker
      // uses — mapped through the issue's broad Category. Only a real, topic-matched
      // power returns a badge, so it stays an honest "they actually hold the levers
      // here" signal rather than decoration.
      function _kraqPowerTie(it) {
        try {
          if (typeof window._powerTie !== 'function' || !it || !it.key) return null;
          var ck = (typeof window._pdxCategoryOf === 'function') ? window._pdxCategoryOf(it.key) : 'other';
          if (!ck || ck === 'other') return null;
          var lbl = (typeof window._pdxCategoryLabelOf === 'function') ? window._pdxCategoryLabelOf(it.key) : 'this area';
          return window._powerTie({ id: pid, name: d.name, office: d.office, category: ck, categoryLabel: lbl, issueKey: it.key }) || null;
        } catch (e) { return null; }
      }
      // Compute the power tie once per issue up front, so the rows and the
      // strong-signals summary above them read from one source.
      bd.issues.forEach(function (it) { it._powerTie = _kraqPowerTie(it); });

      function _kraqRow(it) {
        var ic = _krAlignColor(it.score);
        // Documented positions are the strongest signal — label them as such; reserve
        // the "limited record" caveat for issues only inferred from the broader record.
        var note = it.direct
          ? '<span class="kraq-doc-badge" title="A documented, sourced position on this exact issue">📍 Stated position</span>'
          : (it.hasEvidence ? '' : '<span style="font-size:0.58rem;color:#7596c0;margin-left:0.3rem;">(limited record)</span>');
        // Surface how the voter weighted this issue so the score is self-explanatory:
        // a 💪 strong pick counts ~1.7×, and an 🚫 opposed pick means a HIGH bar is a
        // candidate who agrees with the voter's opposition (the score is inverted).
        var intTag = '';
        var _itLvl2 = (typeof window._alignMigrateLevel === 'function') ? window._alignMigrateLevel(it.intensity) : it.intensity;
        if (_itLvl2 === 'strongly_support') intTag = '<span class="kraq-int kraq-int-strong" title="You marked this a strong priority — it carries extra weight">💪 Strongly Support</span>';
        else if (_itLvl2 === 'oppose') intTag = '<span class="kraq-int kraq-int-opp" title="You oppose this position — a high bar means this candidate agrees with you">👎 You oppose</span>';
        else if (_itLvl2 === 'strongly_oppose') intTag = '<span class="kraq-int kraq-int-opp" title="You strongly oppose this position — it carries extra weight, and a high bar means this candidate agrees with you">✋ Strongly oppose</span>';
        else if (_itLvl2 === 'neutral') intTag = '<span class="kraq-int kraq-int-neutral" title="You feel neutral on this — it counts lightly toward the match">😐 Neutral</span>';
        // ── Stance + power signals ───────────────────────────────────────────
        // Lead the row's evidence with the SAME chips the Evidence Locker shows: a
        // colour-coded stance pill (green Support / red Oppose / amber Mixed) for a
        // documented position, and the gold power/position badge when the official
        // actually holds the levers on this issue. Scannable at a glance, no click-in.
        var stanceChip = (it.direct && typeof window._pdxStanceChipHtml === 'function')
          ? window._pdxStanceChipHtml(it.stance, { label: _KRAQ_STANCE[it.stance] || 'Mixed record',
              title: 'Documented position on ' + (it.label || 'this issue') })
          : '';
        var powerBadge = (it._powerTie && typeof window._alignPowerBadgeHtml === 'function')
          ? window._alignPowerBadgeHtml(it._powerTie) : '';
        var signalRow = (stanceChip || powerBadge)
          ? '<div class="kraq-signal-row">' + stanceChip + powerBadge + '</div>' : '';
        // For a documented position, show the candidate's own one-line stance right
        // under the chips so the voter reads exactly WHERE they stand, not just a number.
        var stanceLine = '';
        if (it.direct && it.text) {
          stanceLine = '<p class="kraq-issue-stance">' + it.text + '</p>';
        }
        // Direct path into the Evidence Locker for this position. Mirrors the Compare
        // cell logic: show a live count when the locker is loaded, otherwise fall back
        // to the on-record check (the locker loads on open). Closes the align overlay
        // first so the jump lands cleanly on the pre-filtered Locker.
        var evLink = '';
        if (it.key) {
          var _evN = _evCounts ? (_evCounts[it.key] || 0) : null;
          var _evLockable = (_evN !== null) ? (_evN > 0) : _evHasLocker;
          if (_evLockable) {
            var _evJk = String(it.key).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            evLink = '<button type="button" class="kraq-ev-link" ' +
              'onclick="event.stopPropagation();window.keyRacesCloseAlign&&window.keyRacesCloseAlign();setTimeout(function(){window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + _evJsId + '\',issue:\'' + _evJk + '\'});},230);" ' +
              'aria-label="See the evidence on record for this position — opens the Evidence Locker">' +
              '📂 See the evidence' + (_evN ? ' · <strong>' + _evN + '</strong>' : '') + ' ↗</button>';
          }
        }
        return '<div class="kraq-issue-row">' +
          '<div class="kraq-issue-head"><span>' + it.label + intTag + note + '</span><span style="color:' + ic + ';font-weight:700;">' + it.score + '%</span></div>' +
          '<div class="kraq-issue-bar"><div style="height:100%;width:' + it.score + '%;background:linear-gradient(90deg,' + ic + '88,' + ic + ');border-radius:999px;transition:width 0.9s cubic-bezier(0.4,0,0.2,1);"></div></div>' +
          signalRow +
          stanceLine +
          _kraqRecordLine(it) +
          evLink +
        '</div>';
      }

      // Voting-record consistency line: what they actually DID on this issue vs. what
      // they say, when their votes are on record (Phase 5). Blank otherwise.
      function _kraqRecordLine(it) {
        if (!it.record || !it.record.total) {
          // Stated a position here but no votes to check it against → say so plainly.
          if (it.direct) return '<p class="kraq-record-line" style="margin:0.3rem 0 0;font-size:0.63rem;color:#8b97ad;display:flex;align-items:center;gap:0.35rem;">'
            + '<span aria-hidden="true">⚖️</span><span><strong>Say-vs-Do:</strong> limited record — no votes yet to verify this stated position</span></p>';
          return '';
        }
        var v = it.record.netVerdict;
        var col = v === 'consistent' ? '#6ee7a0' : v === 'contradicts' ? '#f89b9b' : v === 'mixed' ? '#93c5fd' : '#9fb4d4';
        var ico = v === 'contradicts' ? '⚠️' : v === 'consistent' ? '✅' : '🗳️';
        var lbl = it.record.label || 'On record';
        var total = it.record.total;
        var detail = total + ' vote' + (total === 1 ? '' : 's') + ' on record'
          + (it.record.contradicts ? ' · ' + it.record.contradicts + ' against their stance' : '')
          + (it.record.consistent ? ' · ' + it.record.consistent + ' backing it' : '');
        // Neutral but visible: when the record runs against the stated position,
        // add a clear factual flag so contradictions don't hide in the detail text.
        var contraTag = v === 'contradicts'
          ? '<span style="display:inline-block;margin:0.25rem 0 0;font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#fca5a5;background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.45);padding:0.05rem 0.45rem;border-radius:999px;">⚑ Record runs against stated position</span>'
          : '';
        return '<p class="kraq-record-line" style="margin:0.3rem 0 0;font-size:0.66rem;color:' + col + ';display:flex;align-items:center;gap:0.35rem;">'
          + '<span aria-hidden="true">' + ico + '</span><span><strong>Say-vs-Do — ' + lbl + '</strong> · ' + detail + '</span></p>' + contraTag;
      }

      // Split the breakdown into "where you align" vs "where you differ" so a voter
      // reads agreement and gaps as two clear blocks instead of one long mixed list.
      // Aligned issues lead (strongest first); gaps follow (widest first), so the
      // best reasons to back — and the real trade-offs — are each grouped and ranked.
      var aligned = bd.issues.filter(function(it) { return it.score >= 50; })
                             .sort(function(a, b) { return b.score - a.score; });
      var differ  = bd.issues.filter(function(it) { return it.score < 50; })
                             .sort(function(a, b) { return a.score - b.score; });
      function _kraqGroup(label, col, list) {
        if (!list.length) return '';
        return '<div class="kraq-group-label" style="color:' + col + ';">' + label + ' <span style="opacity:0.7;">· ' + list.length + '</span></div>' +
          list.map(_kraqRow).join('');
      }
      var issuesGrouped =
        _kraqGroup('✅ Where you align', '#4ade80', aligned) +
        _kraqGroup('⚠️ Where you differ', '#f87171', differ);


      // Quick-scan tally so a voter reads the match at a glance before scrolling the
      // full list: how many of their issues are strong fits vs. real gaps.
      var nStrong = bd.issues.filter(function(it) { return it.score >= 70; }).length;
      var nMid    = bd.issues.filter(function(it) { return it.score >= 50 && it.score < 70; }).length;
      var nGap    = bd.issues.filter(function(it) { return it.score < 50; }).length;
      var tallyPills = '';
      if (nStrong) tallyPills += '<span class="kraq-tally kraq-tally-good">✅ ' + nStrong + ' strong match' + (nStrong === 1 ? '' : 'es') + '</span>';
      if (nMid)    tallyPills += '<span class="kraq-tally kraq-tally-mid">◐ ' + nMid + ' partial</span>';
      if (nGap)    tallyPills += '<span class="kraq-tally kraq-tally-bad">⚠️ ' + nGap + ' gap' + (nGap === 1 ? '' : 's') + '</span>';
      var tallyHtml = tallyPills ? ('<div class="kraq-tally-row">' + tallyPills + '</div>') : '';

      // ── Strong-signals summary ───────────────────────────────────────────────
      // Above the issue list, a one-glance read on the firmest evidence behind the
      // match: how many of the voter's issues rest on a documented stance, and on
      // how many this official holds real positional power (a committee seat,
      // statutory office, leadership or sponsorship). Mirrors the Evidence Locker's
      // 📍 stance / ⚡ power language so the two surfaces speak the same way.
      var nDocStance = bd.issues.filter(function(it) { return it.direct && it.stance; }).length;
      var nPowerArea = bd.issues.filter(function(it) { return it._powerTie; }).length;
      var sigBits = '';
      if (nDocStance) sigBits += '<span class="kraq-sig kraq-sig-doc" title="Issues backed by a documented Support / Oppose / Mixed position">📍 ' + nDocStance + ' documented stance' + (nDocStance === 1 ? '' : 's') + '</span>';
      if (nPowerArea) sigBits += '<span class="kraq-sig kraq-sig-power" title="Issues where this official holds real positional power — a committee, office, leadership or sponsor role">⚡ ' + nPowerArea + ' power area' + (nPowerArea === 1 ? '' : 's') + '</span>';
      var sigHtml = sigBits ? ('<div class="kraq-sig-row">' + sigBits + '</div>') : '';

      var photo = _krPhoto(pid, d, '#2dd4bf');
      var matchWord = overall >= 70 ? 'Strong match' : overall >= 50 ? 'Partial match' : 'Weak match';

      // ── Say-vs-Do consistency headline (second score, shown beside the match) ──
      // Reads the same dual-score engine the cards use so the modal opens on the
      // full picture: match (do their stated positions fit your values) AND
      // consistency (does their record back up what they say). Honest states —
      // "limited"/"checking" — never a fabricated number. Async records warm via
      // the fetch already wired below, which re-opens this view when they land.
      var consHeadHtml = '';
      (function () {
        var c = (typeof window._calcConsistencyScore === 'function') ? window._calcConsistencyScore(pid) : null;
        if (!c) return;
        var wrap = function (inner, cc) {
          return '<div style="display:flex;align-items:center;gap:0.75rem;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.32);border-left-width:3px;border-radius:0.9rem;padding:0.75rem 1rem;margin:-0.4rem 0 1rem;">' + inner + '</div>';
        };
        if (c.pending || (c.score === null && c.stated > 0 && !c.warm)) {
          consHeadHtml = wrap('<div style="font-size:1.4rem;">⚖️</div><div style="flex:1;min-width:0;"><div class="font-condensed font-700" style="font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5fd;">Say-vs-Do consistency</div><p style="font-size:0.68rem;color:#9a8fc4;line-height:1.4;margin:0.2rem 0 0;">Checking their voting record…</p></div>');
          return;
        }
        if (c.score === null) {
          if (!c.stated) return; // nothing stated on the user's issues — omit
          consHeadHtml = wrap('<div style="font-size:1.4rem;">⚖️</div><div style="flex:1;min-width:0;"><div class="font-condensed font-700" style="font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:#c4b5fd;">Say-vs-Do · Limited record</div><p style="font-size:0.68rem;color:#9a8fc4;line-height:1.4;margin:0.2rem 0 0;">' + c.stated + ' stated position' + (c.stated === 1 ? '' : 's') + ' on your issues, but little or no voting record yet to verify against.</p></div>');
          return;
        }
        var cCol = c.score >= 70 ? '#4ade80' : c.score >= 50 ? '#f5c842' : '#f87171';
        var cWord = c.score >= 80 ? 'Backs it up' : c.score >= 60 ? 'Mostly consistent' : c.score >= 40 ? 'Mixed record' : 'Often contradicts';
        var flag = c.contradictions > 0
          ? '<span style="display:inline-block;margin-left:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-size:0.56rem;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#fca5a5;background:rgba(248,113,113,0.14);border:1px solid rgba(248,113,113,0.45);padding:0.05rem 0.45rem;border-radius:999px;vertical-align:middle;">⚑ ' + c.contradictions + ' contradiction' + (c.contradictions === 1 ? '' : 's') + '</span>'
          : '';
        consHeadHtml = wrap('<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2.4rem;line-height:0.9;color:' + cCol + ';text-shadow:0 0 14px ' + cCol + '55;">' + c.score + '%</div>'
          + '<div style="flex:1;min-width:0;"><div class="font-condensed font-700" style="font-size:0.66rem;letter-spacing:0.08em;text-transform:uppercase;color:' + cCol + ';">⚖️ Say-vs-Do · ' + cWord + flag + '</div>'
          + '<p style="font-size:0.68rem;color:#9a8fc4;line-height:1.4;margin:0.2rem 0 0;">How well their voting record backs up the ' + c.rated + ' of ' + c.stated + ' stated position' + (c.stated === 1 ? '' : 's') + ' we could check on your issues.' + (c.limited > 0 ? ' ' + c.limited + ' more have no record yet.' : '') + '</p></div>');
      })();

      // ── How the Accountability Score moved this match ────────────────────────
      // "Best Match for You" weighs issue alignment first, then nudges the result by
      // the politician's Accountability of Truth Score (integrity / consistency).
      // Spell that out so the number is transparent: show the issue-only fit, the
      // accountability read, and the net effect — or, when the record is too thin to
      // score, say plainly that accountability isn't factored in yet (no penalty).
      // SCORING CLEANUP: Your Match is now purely issue-fit — the Accountability
      // composite no longer folds into it — so there is no accountability nudge to
      // explain here. Left as an empty string so the render concat below is a no-op.
      var acctNote = '';

      // Confidence cue — how much of this score rests on a documented record vs.
      // an early read from stated priorities. Critical for fresh 2026 candidates,
      // who otherwise show a confident-looking number with nothing behind it.
      // `nDirect` counts the visitor's issues backed by an explicit, sourced position
      // on the exact issue — the strongest grounding — so the messaging leads with it.
      var nDirect = bd.issues.filter(function(it) { return it.direct; }).length;
      var nEvidence = bd.issues.filter(function(it) { return it.hasEvidence; }).length;
      var nTotal = bd.issues.length;
      var firstName = (d.name || 'This candidate').split(' ')[0];
      var confHtml;
      if (nDirect > 0 && nDirect === nTotal) {
        confHtml = '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.28);border-radius:0.7rem;padding:0.6rem 0.75rem;margin-bottom:1rem;">' +
            '<span style="font-size:0.9rem;line-height:1.2;flex:none;">📍</span>' +
            '<p style="font-size:0.66rem;color:#a7d8c1;line-height:1.5;margin:0;">Every one of your <b style="color:#6ee7b7;">' + nTotal + '</b> selected issue' + (nTotal === 1 ? ' has a' : 's has a') + ' documented, sourced position from ' + firstName + ' — this match is grounded directly in where they stand, not inferred.</p>' +
          '</div>';
      } else if (nDirect > 0) {
        confHtml = '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:rgba(45,212,191,0.07);border:1px solid rgba(45,212,191,0.25);border-radius:0.7rem;padding:0.6rem 0.75rem;margin-bottom:1rem;">' +
            '<span style="font-size:0.9rem;line-height:1.2;flex:none;">📍</span>' +
            '<p style="font-size:0.66rem;color:#a7c4cf;line-height:1.5;margin:0;"><b style="color:#5eead4;">' + nDirect + ' of ' + nTotal + '</b> of your issues match a documented position ' + firstName + ' has stated (marked <b style="color:#5eead4;">📍 Stated</b> below); the rest are estimated from their broader record.</p>' +
          '</div>';
      } else if (nEvidence === 0) {
        confHtml = '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.32);border-radius:0.7rem;padding:0.6rem 0.75rem;margin-bottom:1rem;">' +
            '<span style="font-size:0.95rem;line-height:1.2;flex:none;">🌱</span>' +
            '<p style="font-size:0.66rem;color:#fcd9a6;line-height:1.5;margin:0;"><b style="color:#fbbf24;">Early read.</b> We don\'t have a documented position or voting record from ' + firstName + ' on the issues you picked yet, so this is estimated from their stated priorities. It sharpens as positions are verified — and the profile\'s \u2696\ufe0f Word vs Action index shows what ' + firstName + ' <em>has</em> stated so far.</p>' +
          '</div>';
      } else {
        confHtml = '<div style="display:flex;gap:0.55rem;align-items:flex-start;background:rgba(45,212,191,0.07);border:1px solid rgba(45,212,191,0.25);border-radius:0.7rem;padding:0.6rem 0.75rem;margin-bottom:1rem;">' +
            '<span style="font-size:0.9rem;line-height:1.2;flex:none;">📋</span>' +
            '<p style="font-size:0.66rem;color:#a7c4cf;line-height:1.5;margin:0;"><b style="color:#5eead4;">' + nEvidence + ' of ' + nTotal + '</b> of your issues are backed by ' + firstName + '\'s broader record; the rest are estimated from their stated priorities until more is verified.</p>' +
          '</div>';
      }

      // Issue discovery — the candidate's OWN documented positions on issues the
      // visitor hasn't picked yet. Makes it transparent which issues are available to
      // match on (especially valuable for a thin candidate whose record IS these
      // positions), and turns the modal into a place to broaden the comparison: tap a
      // chip to add that issue and the breakdown instantly re-scores to include it.
      var availBlock = '';
      try {
        var _polMap = (typeof window._polPositionMap === 'function') ? (window._polPositionMap(pid, d) || {}) : {};
        var _amap = window._alignIssueMap || {};
        var _active = window._alignIssues;
        var _availKeys = Object.keys(_polMap).filter(function(k) {
          return _amap[k] && !(_active && _active.has && _active.has(k));
        });
        if (_availKeys.length) {
          var _availChips = _availKeys.slice(0, 8).map(function(k) {
            var lab = (_amap[k] && _amap[k].label) ? _amap[k].label : k;
            var st = _polMap[k].stance;
            var stIco = st === 'support' ? '✓' : st === 'oppose' ? '✗' : '~';
            return '<button type="button" class="kraq-avail-chip" title="Add “' + lab.replace(/"/g, '&quot;') + '” to your issues and see how you compare" ' +
                'onclick="window.alignSetIntensity(\'' + k + '\',\'moderate\');window.keyRacesAlignQuickView(\'' + pid + '\');">' +
                '<span class="kraq-avail-st">' + stIco + '</span>' + lab + '<span class="kraq-avail-plus">＋</span>' +
              '</button>';
          }).join('');
          availBlock =
            '<div class="kraq-avail">' +
              '<div class="kraq-avail-head">📍 ' + firstName + ' has stated positions on ' + _availKeys.length + ' more issue' + (_availKeys.length === 1 ? '' : 's') + ' you haven\'t picked</div>' +
              '<div class="kraq-avail-sub">Tap to add one and see exactly where you line up.</div>' +
              '<div class="kraq-avail-chips">' + _availChips + '</div>' +
            '</div>';
        }
      } catch (e) {}

      // Consistent "Limited Record" / candidate framing — the same badges the
      // politician cards and the Spotlight modal carry, so a thin profile reads
      // identically across every surface. Conditional, so full officeholder
      // records stay uncluttered.
      var _aqStatus = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var _aqCandBadge = (_aqStatus === 'candidate' && typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(d, { size: 'sm' }) : '';
      var _aqDepthBadge = (typeof window._pdxDepthBadge === 'function') ? window._pdxDepthBadge(d, { size: 'sm' }) : '';
      var _aqHeadBadges = (_aqCandBadge || _aqDepthBadge)
        ? ('<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">' + _aqCandBadge + _aqDepthBadge + '</div>')
        : '';

      // Person-level jump to the full Evidence Locker for this official, shown above
      // the action row when there are documents on record. Complements the per-issue
      // links: the rows answer "evidence for THIS position", this answers "show me
      // everything on record." Same honesty gate — only when the locker holds files.
      var _evTotal = 0;
      if (_evCounts) { for (var _evK in _evCounts) { if (Object.prototype.hasOwnProperty.call(_evCounts, _evK)) _evTotal += (_evCounts[_evK] || 0); } }
      var _evShowAll = _evCounts ? (_evTotal > 0) : _evHasLocker;
      var evAllBtn = _evShowAll
        ? '<button type="button" class="kraq-ev-all" ' +
            'onclick="window.keyRacesCloseAlign&&window.keyRacesCloseAlign();setTimeout(function(){window._pdxOpenEvidenceLocker&&window._pdxOpenEvidenceLocker({pol:\'' + _evJsId + '\'});},230);" ' +
            'aria-label="Open the Evidence Locker filtered to this official — every document on record">' +
            '📂 See all the evidence on record for ' + firstName + (_evTotal ? ' · <strong>' + _evTotal + '</strong>' : '') + ' ↗</button>'
        : '';

      var html =
        '<div class="kraq-card">' +
          '<div style="position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:0.75rem;padding:1rem 1.1rem;background:linear-gradient(135deg,rgba(20,184,166,0.16),rgba(10,15,30,0.6));border-bottom:1px solid rgba(45,212,191,0.25);border-radius:1.1rem 1.1rem 0 0;">' +
            photo +
            '<div style="flex:1;min-width:0;">' +
              '<div class="font-condensed" style="font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:#5eead4;">🎯 Your Personalized Alignment</div>' +
              '<div class="font-display text-lg text-white" style="line-height:1.1;">' + d.name + '</div>' +
              '<div class="font-condensed" style="font-size:0.66rem;color:#9fb4d4;">' + partyHtml + (d.office ? ' · ' + d.office : '') + '</div>' +
              _aqHeadBadges +
            '</div>' +
            '<button type="button" onclick="window.keyRacesCloseAlign()" aria-label="Close" style="flex-shrink:0;width:34px;height:34px;border-radius:0.65rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#cbd9ec;cursor:pointer;font-size:1.05rem;line-height:1;">✕</button>' +
          '</div>' +
          '<div style="padding:1.1rem;">' +
            '<div style="display:flex;align-items:center;gap:1rem;background:rgba(20,184,166,0.07);border:1px solid rgba(45,212,191,0.3);border-radius:0.9rem;padding:0.9rem 1rem;margin-bottom:1rem;">' +
              '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:3rem;line-height:0.9;color:' + col + ';text-shadow:0 0 16px ' + col + '55;">' + overall + '%</div>' +
              '<div style="flex:1;min-width:0;">' +
                '<div class="font-condensed font-700" style="font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;color:' + col + ';">' + matchWord + ' with your issues</div>' +
                '<p style="font-size:0.7rem;color:#9fb4d4;line-height:1.45;margin:0.25rem 0 0;">Weighted across the ' + bd.issues.length + ' issue' + (bd.issues.length === 1 ? '' : 's') + ' you selected — your personal fit, with a small accountability adjustment layered in.</p>' +
              '</div>' +
            '</div>' +
            consHeadHtml +
            acctNote +
            confHtml +
            '<div class="font-condensed font-700" style="font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;color:#5eead4;margin-bottom:0.6rem;">Issue-by-issue breakdown</div>' +
            tallyHtml +
            sigHtml +
            issuesGrouped +
            availBlock +
            evAllBtn +
            (typeof _alignMatchActions === 'function'
              ? '<div class="kraq-handoff"><div class="kraq-handoff-lead">Ready to act on this match?</div>' + _alignMatchActions(pid) + '</div>'
              : '') +
            '<div style="display:flex;gap:0.5rem;margin-top:1rem;">' +
              '<button type="button" onclick="window.keyRacesCloseAlign();setTimeout(function(){if(typeof showProfile===\'function\')showProfile(\'' + pid + '\');},220);" style="flex:1;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;color:#fff;background:linear-gradient(135deg,#0d9488,#2dd4bf);border:none;padding:0.7rem;border-radius:0.6rem;box-shadow:0 4px 14px rgba(20,184,166,0.3);">👤 Full Profile</button>' +
              '<button type="button" onclick="window.keyRacesCloseAlign();setTimeout(window._krAlignGuideToPicker,220);" style="cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#7ee7d8;background:rgba(20,184,166,0.12);border:1px solid rgba(45,212,191,0.4);padding:0.7rem 0.85rem;border-radius:0.6rem;">⚙ Adjust Issues</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var ov = _krEnsureAlignOverlay();
      ov.innerHTML = html;
      ov.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function() { requestAnimationFrame(function() { ov.style.opacity = '1'; }); });
    };

    // ── Dynamic Spotlight — one timely, interesting thing to know right now ──
    // Replaces the old static "Align" button. For each candidate we pick the
    // single most relevant/timely item from whatever data exists, in order:
    //   1. A curated current-events headline / controversy (when loaded).
    //   2. The most spotlight-worthy item from their own record — a concrete
    //      vote, a red-flag pattern, or a signature position.
    //   3. A "new on the ballot / record being compiled" note for candidates
    //      who have no public record yet (so the card is never empty).
    function _krStanceIssueLabel(key) {
      return ({
        border: '🛡 Border & Immigration', debt: '💰 Taxes & Spending', gun: '🔫 Gun Rights',
        termLimits: '⏳ Term Limits', campaign: '🗳 Campaign & Conduct', healthcare: '🏥 Healthcare',
        audit: '🔎 Government Audit', dataCenters: '🖥 Tech & Data'
      })[key] || 'Key Position';
    }
    function _krStanceIsGeneric(t) {
      return !t || /^N\/A|no public voting record|compiling|no formal position|^—/i.test(t);
    }
    function _krStanceIsFlag(t) {
      return /no on all|voted against|opposed|exceeded|broke\b|never|skeptic|against/i.test(t);
    }
    function _krStanceIsConcrete(t) {
      return /\bvot|hb ?\d|sb ?\d|h\.b|s\.b|\bbill\b|pledged|co-spons|amendment|signed|introduced|\bact\b|funding|\d{2,}/i.test(t);
    }
    function _krSpotlightIsControversy(text) {
      return /scrutiny|controvers|under fire|allegation|criticism|rebuke|ethics|conviction|questions raised|misdemeanor|probe|investigat|drew .*rebuke|fire over/i.test(text || '');
    }
    // Pull the first source link out of a facts blob (the curated data embeds an
    // <a href> to the primary source) so the modal can credit it instead of
    // stripping it away with the rest of the markup.
    function _krSpotlightExtractSource(html) {
      var m = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(html || '');
      if (!m) return null;
      var label = (m[2] || '').replace(/<[^>]*>/g, '').trim();
      return { url: m[1], label: label || 'Source' };
    }

    function _krBuildSpotlight(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) return null;

      // 1) Curated current-events headline — the richest, most timely source.
      var sd = (window.SPOTLIGHT_DATA && window.SPOTLIGHT_DATA[pid] && window.SPOTLIGHT_DATA[pid].length) ? window.SPOTLIGHT_DATA[pid] : null;
      if (sd) {
        // Normalize each curated entry into a "story" shared by the card strip and
        // the modal timeline, so a vote, a bill, a news item or a controversy all
        // render consistently with a date, the facts, why-it-matters and a source.
        var mapStory = function(it) {
          var f = _krSpotlightIsControversy(it.headline);
          return {
            kind: f ? 'flag' : 'news',
            badge: f ? 'Red Flag' : 'In the News',
            badgeIco: f ? '🚩' : '📰',
            date: it.date || 'Recent',
            title: it.headline,
            body: (it.facts || '').replace(/<[^>]*>/g, '').trim(),
            why: it.why || '',
            // Optional linkage to a specific Alignment Tool issue (an ISSUE_MAP key),
            // so a Spotlight headline can be tied to the same issue position shown in
            // the profile's shared issue index — the connective tissue between the two sections.
            issueKey: it.issueKey || null,
            source: _krSpotlightExtractSource(it.facts)
          };
        };
        var stories = sd.map(mapStory);
        // Lead with the most recent genuine controversy/red flag when one sits in
        // the recent window — that is the single thing a voter most needs to know
        // at a glance — otherwise lead with the newest item. Float the lead first.
        var leadIdx = 0;
        for (var li = 0; li < Math.min(stories.length, 4); li++) {
          if (stories[li].kind === 'flag') { leadIdx = li; break; }
        }
        if (leadIdx > 0) { stories.unshift(stories.splice(leadIdx, 1)[0]); }
        var top = stories[0];
        return {
          kind: top.kind,
          badge: top.kind === 'flag' ? 'Current Red Flag' : 'In the News',
          badgeIco: top.badgeIco,
          date: top.date,
          title: top.title,
          teaser: top.title,
          body: top.body,
          why: top.why,
          issueKey: top.issueKey || null,
          source: top.source,
          total: stories.length,
          stories: stories
        };
      }

      // 2) Most spotlight-worthy item from the candidate's own record.
      var keys = ['debt', 'gun', 'border', 'healthcare', 'termLimits', 'audit', 'campaign', 'dataCenters'];
      var best = null, bestRank = -1;
      keys.forEach(function(k) {
        var t = d.stances ? d.stances[k] : '';
        if (_krStanceIsGeneric(t)) return;
        var rank = 1;
        if (_krStanceIsConcrete(t)) rank += 2;
        if (_krStanceIsFlag(t)) rank += 1;
        if (rank > bestRank) { bestRank = rank; best = { k: k, t: t }; }
      });
      if (best) {
        var isFlag = _krStanceIsFlag(best.t);
        var isVote = _krStanceIsConcrete(best.t);
        var hasScore = window._pdxDisplayScore(d) !== null;
        return {
          kind: isFlag ? 'flag' : (isVote ? 'vote' : 'position'),
          badge: isFlag ? 'On the Record' : (isVote ? 'Key Vote on File' : 'Where They Stand'),
          badgeIco: isFlag ? '⚖️' : (isVote ? '🗳' : '📌'),
          date: '',
          title: _krStanceIssueLabel(best.k),
          teaser: best.t,
          body: best.t,
          // Receipts, not a rate. This line used to end "(Promise 77%)", which put
          // the retired pledge percentage back in front of a voter mid-ballot —
          // the counts already say more, and they carry their own denominator.
          why: hasScore
            ? ('Track record so far: ' + (d.kept || 0) + ' promises kept · ' + (d.broken || 0) + ' broken. Tap Profile for the receipts behind every one.')
            : 'PolitiDex is still compiling this official’s full voting record — more lands on their profile soon.',
          total: 0
        };
      }

      // 3) No usable record yet — say so plainly with a clean status note instead
      // of a faux "tap for the story" spotlight. For a brand-new candidate the
      // honest fact is simply that scoring begins once they hold office or pledge
      // on the record; for an officeholder we surface that the record is in progress.
      var isCandidate = (d.rank === 'candidate') || /candidate/i.test(d.office || '');
      var headlineIssue = (d.issues || []).filter(function(i) {
        return !/2026 candidate|district \d|congressional district|senate district|house district/i.test(i);
      })[0];
      // Lead the inline note with a one-line excerpt of the candidate's real bio when
      // we have one, so each newcomer reads as a specific person rather than identical
      // boilerplate. Falls back to the plain "record begins in office" line otherwise.
      var bioLine = (isCandidate && d.bio && typeof window._pdxBioBlurb === 'function') ? window._pdxBioBlurb(d.bio) : '';
      return {
        kind: isCandidate ? 'newcomer' : 'monitoring',
        badge: isCandidate ? 'On the 2026 Ballot' : 'Compiling Record',
        badgeIco: isCandidate ? '🆕' : '🛰',
        date: '',
        title: isCandidate ? 'On the 2026 ballot' : 'Now being tracked by PolitiDex',
        teaser: isCandidate
          ? (bioLine || 'Track record begins once they take office or pledge on the record.')
          : 'PolitiDex is compiling this official’s voting record.',
        body: (d.office || '2026 candidate') + '. ' + (headlineIssue ? ('Signature focus: ' + headlineIssue + '. ') : '') +
          (isCandidate ? 'No public voting record yet — there is nothing to hold them to so far.' : 'A voting record is being compiled for this office right now.'),
        why: 'Watch this space: the Promise % and Truth Score begin the moment they cast votes or make an on-the-record pledge.',
        total: 0
      };
    }
    window._krBuildSpotlight = _krBuildSpotlight;

    // Compact, tappable Spotlight strip rendered inline on a candidate card.
    // Shows the timely item at a glance (badge + one-line teaser + date); the
    // whole strip opens the full Spotlight modal with the detail and source.
    function _krSpotPreviewHtml(pid, s) {
      if (!s) return '';
      // Genuinely low-information politicians (a brand-new 2026 candidate with no
      // record, or an officeholder whose record is still being compiled) have no
      // real story to open. Render a clean, honest status note in the same slot
      // rather than a clickable spotlight that would open a near-empty modal —
      // keeping these cards minimal, professional and structurally consistent.
      if (s.kind === 'newcomer' || s.kind === 'monitoring') {
        var statusText = (s.teaser || s.title || '').toString();
        return '<div class="kr-spot-status ' + s.kind + '" role="note">' +
            '<span class="kr-spot-status-badge">' + s.badgeIco + ' ' + s.badge + '</span>' +
            '<span class="kr-spot-status-text">' + statusText + '</span>' +
          '</div>';
      }
      var teaser = (s.teaser || s.title || '').toString();
      var dateChip = s.date ? '<span class="kr-spot-prev-date">· ' + s.date + '</span>' : '';
      return '<button type="button" onclick="window.keyRacesSpotlight(\'' + pid + '\')" class="kr-spot-preview ' + s.kind + '" aria-label="Spotlight — ' + s.badge + '. Tap for details and source.">' +
          '<span class="kr-spot-live" aria-hidden="true"></span>' +
          '<span class="kr-spot-prev-main">' +
            '<span class="kr-spot-prev-badge">' + s.badgeIco + ' ' + s.badge + ' ' + dateChip + '</span>' +
            '<span class="kr-spot-prev-text">' + teaser + '</span>' +
          '</span>' +
          '<span class="kr-spot-prev-cta" aria-hidden="true">🔦</span>' +
        '</button>';
    }
    window._krSpotPreviewHtml = _krSpotPreviewHtml;

    function _krEnsureSpotOverlay() {
      var ov = document.getElementById('kr-spotlight-overlay');
      if (ov) return ov;
      ov = document.createElement('div');
      ov.id = 'kr-spotlight-overlay';
      ov.className = 'kr-spot-overlay';
      ov.addEventListener('click', function(e) { if (e.target === ov) window.keyRacesCloseSpotlight(); });
      document.body.appendChild(ov);
      return ov;
    }

    window.keyRacesCloseSpotlight = function() {
      var ov = document.getElementById('kr-spotlight-overlay');
      if (!ov) return;
      ov.style.opacity = '0';
      setTimeout(function() {
        ov.style.display = 'none';
        var others = ['modal-overlay', 'accountability-overlay', 'compare-overlay', 'auth-overlay', 'kr-align-overlay'];
        var anyOpen = others.some(function(id) { var el = document.getElementById(id); return el && el.style.display && el.style.display !== 'none'; });
        if (!anyOpen) document.body.style.overflow = '';
      }, 200);
    };

    // ── Spotlight ↔ positions ↔ alignment bridge ──────────────────────────
    // The connective tissue that keeps the Spotlight from reading as a detached
    // news feed: it pulls the candidate's own documented issue positions — the
    // same data the profile's shared issue index browses and the Alignment Tool compares
    // against — into the Spotlight modal, leading with the exact issue this update
    // is about. So a visitor reads the news, then sees where the candidate
    // actually stands on that issue and (if they've set Alignment picks) how it
    // lines up with their own values, all in one place. This is what makes the
    // three sections read as one system rather than three feeds that happen to
    // share a candidate. Returns '' when there are no documented positions, so
    // full and bio-only profiles are untouched.
    function _krSpotlightPositionsHtml(pid, d, s) {
      try {
        if (typeof window._resolveStanceList !== 'function') return '';
        var list = window._resolveStanceList(pid, d) || [];
        if (!list.length) return '';
        var first = (d.name || 'They').toString().split(' ')[0] || 'They';

        // Issues this Spotlight touches — the lead item plus every timeline story.
        var tiedKeys = {};
        if (s && s.issueKey) tiedKeys[s.issueKey] = true;
        if (s && s.stories) s.stories.forEach(function(st) { if (st && st.issueKey) tiedKeys[st.issueKey] = true; });

        // Authoritative per-issue match verdicts, from the same engine the
        // Alignment quick-view uses — only when the visitor has saved picks.
        var verdictByKey = {};
        var hasPicks = !!(window._alignIssues && window._alignIssues.size > 0);
        if (hasPicks && typeof window._calcAlignmentBreakdown === 'function') {
          var bd = window._calcAlignmentBreakdown(pid);
          if (bd && bd.issues) bd.issues.forEach(function(it) { if (it.direct && it.verdict) verdictByKey[it.key] = it.verdict; });
        }

        // Lead with the position this news is about, then vote/bill-backed, then
        // the rest — the same priority order the Snapshot uses, so the two read
        // alike and a visitor moving between them never loses their place.
        var sorted = list.slice().sort(function(a, b) {
          var at = (a.issueKey && tiedKeys[a.issueKey]) ? 1 : 0, bt = (b.issueKey && tiedKeys[b.issueKey]) ? 1 : 0;
          if (bt !== at) return bt - at;
          var ae = a.evidence ? 1 : 0, be = b.evidence ? 1 : 0;
          if (be !== ae) return be - ae;
          return (b.issueKey ? 1 : 0) - (a.issueKey ? 1 : 0);
        });

        var dirMeta = {
          support:  { ico: '✓', label: 'Supports', col: '#4ade80', bg: 'rgba(74,222,128,0.14)',  bd: 'rgba(74,222,128,0.32)' },
          oppose:   { ico: '✗', label: 'Opposes',  col: '#f87171', bg: 'rgba(248,113,113,0.14)', bd: 'rgba(248,113,113,0.32)' },
          mixed:    { ico: '~', label: 'Mixed',     col: '#60a5fa', bg: 'rgba(96,165,250,0.14)',  bd: 'rgba(96,165,250,0.32)' },
          priority: { ico: '★', label: 'Priority',  col: '#c4b5fd', bg: 'rgba(167,139,250,0.14)', bd: 'rgba(167,139,250,0.32)' },
          tracking: { ico: '…', label: 'Tracking',  col: '#c4b5fd', bg: 'rgba(167,139,250,0.14)', bd: 'rgba(167,139,250,0.32)' }
        };
        var vMeta = {
          match:    { ico: '✓', label: 'You match',  col: '#4ade80' },
          partial:  { ico: '~', label: 'Partial',    col: '#60a5fa' },
          mismatch: { ico: '✗', label: 'You differ', col: '#f87171' }
        };
        function _badge(txt, col, bg, bd, dashed) {
          return '<span style="display:inline-flex;align-items:center;gap:0.18rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.5rem;letter-spacing:0.06em;text-transform:uppercase;color:' + col + ';background:' + bg + ';border:1px ' + (dashed ? 'dashed' : 'solid') + ' ' + bd + ';border-radius:999px;padding:0.12rem 0.42rem;white-space:nowrap;">' + txt + '</span>';
        }

        var MAX = 3;
        var anyTied = sorted.some(function(x) { return x.issueKey && tiedKeys[x.issueKey]; });
        var rows = sorted.slice(0, MAX).map(function(x) {
          var m = dirMeta[x.pos] || dirMeta.priority;
          var tied = !!(x.issueKey && tiedKeys[x.issueKey]);
          var srcCol = x.evidence ? '#7dd3a0' : '#9fb4d4';
          var srcTxt = x.evidence ? '🗳 Recorded' : '💬 Stated';
          var srcBd  = x.evidence ? 'rgba(74,222,128,0.34)' : 'rgba(159,180,212,0.4)';
          var vd = (x.issueKey && verdictByKey[x.issueKey]) ? vMeta[verdictByKey[x.issueKey]] : null;
          var tieChip = tied ? _badge('🔗 In this update', '#f5c842', 'rgba(245,200,66,0.12)', 'rgba(245,200,66,0.4)') : '';
          var txt = (x.text || '').toString();
          return '<div style="padding:0.5rem 0;">' +
            '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.35rem 0.45rem;">' +
              '<span style="font-size:0.9rem;line-height:1;flex-shrink:0;">' + (x.icon || '🎯') + '</span>' +
              '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.8rem;color:#f0eaff;flex:1 1 7rem;min-width:0;">' + (x.topic || 'Issue') + '</span>' +
              _badge(m.ico + ' ' + m.label, m.col, m.bg, m.bd) +
              _badge(srcTxt, srcCol, 'rgba(10,15,30,0.5)', srcBd, !x.evidence) +
              tieChip +
              (vd ? _badge(vd.ico + ' ' + vd.label, vd.col, 'rgba(10,15,30,0.5)', vd.col + '55') : '') +
            '</div>' +
            (txt ? '<p style="font-size:0.72rem;color:#9fb4d4;line-height:1.5;margin:0.28rem 0 0;">' + txt + '</p>' : '') +
          '</div>';
        }).join('<div style="border-top:1px dashed rgba(159,180,212,0.16);"></div>');

        var more = sorted.length > MAX
          ? '<p style="font-size:0.68rem;color:#7596c0;line-height:1.5;margin:0.5rem 0 0;">+ ' + (sorted.length - MAX) + ' more position' + (sorted.length - MAX === 1 ? '' : 's') + ' on ' + first + '’s full profile.</p>'
          : '';

        var intro = anyTied
          ? ('This update is about an issue ' + first + ' has taken a position on. Here’s where they actually stand — and how it lines up with your values:')
          : ('Where ' + first + ' stands on the issues PolitiDex tracks — the documented record behind the headlines:');

        return '<div style="margin-top:1.05rem;padding:0.75rem 0.85rem 0.6rem;background:linear-gradient(135deg,rgba(30,53,96,0.42),rgba(10,15,30,0.28));border:1px solid rgba(159,180,212,0.2);border-left:3px solid #f5c842;border-radius:0.7rem;">' +
            '<div style="display:flex;align-items:center;gap:0.4rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.62rem;letter-spacing:0.1em;text-transform:uppercase;color:#dbe6f6;margin-bottom:0.4rem;">📌 Where ' + first + ' stands' +
              '<span style="margin-left:auto;font-size:0.55rem;letter-spacing:0.08em;color:#f5c842;background:rgba(245,200,66,0.12);border:1px solid rgba(245,200,66,0.3);border-radius:999px;padding:0.1rem 0.45rem;">' + list.length + ' position' + (list.length === 1 ? '' : 's') + '</span>' +
            '</div>' +
            '<p style="font-size:0.72rem;color:#9fb4d4;line-height:1.5;margin:0 0 0.4rem;">' + intro + '</p>' +
            rows +
            more +
          '</div>';
      } catch (e) { return ''; }
    }
    window._krSpotlightPositionsHtml = _krSpotlightPositionsHtml;

    window.keyRacesSpotlight = function(pid) {
      var d = (typeof CMP_DATA !== 'undefined') ? CMP_DATA[pid] : null;
      if (!d) { if (typeof showProfile === 'function') showProfile(pid); return; }
      var s = _krBuildSpotlight(pid);
      if (!s) { if (typeof showProfile === 'function') showProfile(pid); return; }

      var photo = _krPhoto(pid, d, '#f5c842');
      var partyMeta = _krPartyMeta(d.party);
      var partyHtml = partyMeta ? '<span style="color:' + partyMeta.color + ';">' + partyMeta.label + '</span>' : '';
      var dateChip = s.date
        ? '<span style="font-family:\'Barlow Condensed\',sans-serif;font-size:0.6rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f5c842;background:rgba(245,200,66,0.1);border:1px solid rgba(245,200,66,0.25);padding:0.12rem 0.45rem;border-radius:999px;">' + s.date + '</span>'
        : '';
      var whyHtml = s.why
        ? ('<div style="background:rgba(245,200,66,0.06);border-left:2px solid rgba(245,200,66,0.4);border-radius:0 0.4rem 0.4rem 0;padding:0.5rem 0.7rem;margin-top:0.85rem;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#f5c842;margin-bottom:0.15rem;">Why this matters</div>' +
            '<p style="font-size:0.74rem;color:rgba(245,200,66,0.88);line-height:1.5;margin:0;">' + s.why + '</p>' +
          '</div>')
        : '';
      // Recent-activity timeline: every other curated story for this candidate,
      // each collapsed and tappable to expand its facts, why-it-matters and source.
      // This is what makes the Spotlight "expand to show more" rather than dead-end
      // at a single headline — the whole recent record is one tap away, in place.
      var extra = (s.stories && s.stories.length > 1) ? s.stories.slice(1) : [];
      var timelineHtml = '';
      if (extra.length) {
        var rows = extra.map(function(st, i) {
          var rid = 'krspot-row-' + pid + '-' + i;
          var src = st.source
            ? '<a href="' + st.source.url + '" target="_blank" rel="noopener" style="font-size:0.72rem;color:#60a5fa;text-decoration:underline;word-break:break-word;">' + st.source.label + ' ↗</a>'
            : '';
          var whyR = st.why
            ? '<p style="font-size:0.72rem;color:rgba(245,200,66,0.85);line-height:1.5;margin:0.45rem 0 0;"><span style="color:#f5c842;font-weight:700;">Why it matters: </span>' + st.why + '</p>'
            : '';
          return '<div style="border-top:1px solid rgba(255,255,255,0.06);">' +
              '<button type="button" onclick="(function(){var d=document.getElementById(\'' + rid + '\');var b=d.previousElementSibling;var o=d.style.maxHeight&&d.style.maxHeight!==\'0px\';d.style.maxHeight=o?\'0px\':d.scrollHeight+\'px\';b.querySelector(\'.krspot-chev\').style.transform=o?\'rotate(0deg)\':\'rotate(180deg)\';})()" style="width:100%;display:flex;align-items:flex-start;gap:0.55rem;text-align:left;background:none;border:none;cursor:pointer;padding:0.65rem 0.1rem;">' +
                '<span class="kr-spot-badge ' + st.kind + '" style="flex-shrink:0;">' + st.badgeIco + '</span>' +
                '<span style="flex:1;min-width:0;">' +
                  '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;">' + st.date + '</span>' +
                  '<span style="display:block;font-family:\'Barlow Condensed\',sans-serif;font-weight:600;font-size:0.82rem;color:#e8edf6;line-height:1.3;">' + st.title + '</span>' +
                  ((st.issueKey && typeof window._issueTagHtml === 'function') ? ('<span style="display:inline-block;margin-top:0.3rem;">' + window._issueTagHtml(st.issueKey, 'On the issue:') + '</span>') : '') +
                '</span>' +
                '<svg class="krspot-chev" width="15" height="15" fill="none" stroke="#7596c0" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:0.15rem;transition:transform 0.2s;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>' +
              '</button>' +
              '<div id="' + rid + '" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">' +
                '<p style="font-size:0.76rem;color:#cbd9ec;line-height:1.55;margin:0;">' + st.body + '</p>' +
                whyR +
                (src ? '<div style="margin-top:0.45rem;">' + src + '</div>' : '') +
                '<div style="height:0.7rem;"></div>' +
              '</div>' +
            '</div>';
        }).join('');
        timelineHtml =
          '<div style="margin-top:1.05rem;border-top:1px solid rgba(245,200,66,0.18);padding-top:0.65rem;">' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.56rem;letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;margin-bottom:0.1rem;">📅 More recent activity · ' + extra.length + '</div>' +
            rows +
          '</div>';
      }
      var sourceHtml = s.source
        ? ('<div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;margin-top:0.85rem;padding-top:0.7rem;border-top:1px solid rgba(245,200,66,0.18);">' +
            '<span style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.55rem;letter-spacing:0.12em;text-transform:uppercase;color:#7596c0;">Source</span>' +
            '<a href="' + s.source.url + '" target="_blank" rel="noopener" style="font-size:0.74rem;color:#60a5fa;text-decoration:underline;word-break:break-word;">' + s.source.label + ' ↗</a>' +
          '</div>')
        : '';

      // The candidate's documented positions, led by the issue this news is about
      // — the bridge from the headline to where they actually stand and the
      // Alignment Tool. Empty (so untouched) on profiles with no documented stances.
      var posBlock = _krSpotlightPositionsHtml(pid, d, s);

      // Consistent "Limited Record" / candidate framing — the SAME badges the
      // politician cards carry, so a thin profile reads the same way in the
      // Spotlight modal as it does on the card the visitor tapped. The depth badge
      // renders only for sparse officeholders and the candidate badge only for
      // challengers, so full officeholder records stay uncluttered.
      var _spotStatus = (typeof window._pdxOfficeStatus === 'function') ? window._pdxOfficeStatus(d) : 'office';
      var _spotCandBadge = (_spotStatus === 'candidate' && typeof window._pdxStatusBadge === 'function') ? window._pdxStatusBadge(d, { size: 'sm' }) : '';
      var _spotDepthBadge = (typeof window._pdxDepthBadge === 'function') ? window._pdxDepthBadge(d, { size: 'sm' }) : '';
      var headBadges = (_spotCandBadge || _spotDepthBadge)
        ? ('<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">' + _spotCandBadge + _spotDepthBadge + '</div>')
        : '';

      // One tap from the news to the visitor's personalized, issue-by-issue match
      // — the third leg of the Snapshot ↔ Spotlight ↔ Alignment triad. Opens the
      // alignment quick-view (which itself falls back to the issue picker when the
      // visitor hasn't set any picks yet), so the path is never a dead end.
      var alignBtn = '<button type="button" onclick="window.keyRacesCloseSpotlight();setTimeout(function(){ if(window.keyRacesAlignQuickView) window.keyRacesAlignQuickView(\'' + pid + '\'); },220);" style="flex:1 1 auto;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#7ee7d8;background:rgba(20,184,166,0.12);border:1px solid rgba(45,212,191,0.4);padding:0.7rem 0.85rem;border-radius:0.6rem;">🎯 Your alignment</button>';

      var html =
        '<div class="kr-spot-card">' +
          '<div style="position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:0.75rem;padding:1rem 1.1rem;background:linear-gradient(135deg,rgba(245,200,66,0.16),rgba(10,15,30,0.6));border-bottom:1px solid rgba(245,200,66,0.25);border-radius:1.1rem 1.1rem 0 0;">' +
            photo +
            '<div style="flex:1;min-width:0;">' +
              '<div class="font-condensed" style="font-size:0.56rem;letter-spacing:0.14em;text-transform:uppercase;color:#f5c842;">🔦 Spotlight — What’s Happening Now</div>' +
              '<div class="font-display text-lg text-white" style="line-height:1.1;">' + d.name + '</div>' +
              '<div class="font-condensed" style="font-size:0.66rem;color:#9fb4d4;">' + partyHtml + (d.office ? ' · ' + d.office : '') + '</div>' +
              headBadges +
            '</div>' +
            '<button type="button" onclick="window.keyRacesCloseSpotlight()" aria-label="Close" style="flex-shrink:0;width:34px;height:34px;border-radius:0.65rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#cbd9ec;cursor:pointer;font-size:1.05rem;line-height:1;">✕</button>' +
          '</div>' +
          '<div style="padding:1.1rem;">' +
            '<div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.6rem;">' +
              '<span class="kr-spot-badge ' + s.kind + '">' + s.badgeIco + ' ' + s.badge + '</span>' + dateChip +
              ((s.issueKey && typeof window._issueTagHtml === 'function') ? window._issueTagHtml(s.issueKey, 'On the issue:') : '') +
              ((s.issueKey && typeof window._pdxMandateChip === 'function') ? window._pdxMandateChip(s.issueKey, {}) : '') +
            '</div>' +
            '<div class="font-display text-white" style="font-size:1.12rem;line-height:1.25;margin-bottom:0.5rem;">' + s.title + '</div>' +
            '<p style="font-size:0.82rem;color:#cbd9ec;line-height:1.6;margin:0;">' + s.body + '</p>' +
            whyHtml +
            sourceHtml +
            posBlock +
            timelineHtml +
            '<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;">' +
              '<button type="button" onclick="window.keyRacesCloseSpotlight();setTimeout(function(){if(typeof showProfile===\'function\')showProfile(\'' + pid + '\');},220);" style="flex:1 1 9rem;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.08em;text-transform:uppercase;color:#0a0f1e;background:linear-gradient(135deg,#f5c842,#e0a82e);border:none;padding:0.7rem;border-radius:0.6rem;box-shadow:0 4px 14px rgba(245,200,66,0.3);">👤 Full Profile</button>' +
              alignBtn +
              '<button type="button" onclick="window.keyRacesCloseSpotlight();setTimeout(function(){ if(window.keyRacesCompare){ window.keyRacesCompare(document.createElement(\'button\'),\'' + pid + '\'); } if(window.renderKeyRaces) window.renderKeyRaces(); },220);" style="flex:1 1 auto;cursor:pointer;font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.06em;text-transform:uppercase;color:#93c5fd;background:rgba(59,130,246,0.12);border:1px solid rgba(96,165,250,0.4);padding:0.7rem 0.85rem;border-radius:0.6rem;">⚖️ Compare</button>' +
            '</div>' +
          '</div>' +
        '</div>';

      var ov = _krEnsureSpotOverlay();
      ov.innerHTML = html;
      ov.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function() { requestAnimationFrame(function() { ov.style.opacity = '1'; }); });
    };

    // Small section divider used to group the Key Races list into
    // "Statewide Races" (always shown) and the location-specific district races.
    function _krGroupHeader(icon, title, sub, color) {
      return '<div class="kr-span-all" style="margin:0.25rem 0 -0.25rem;">' +
          '<div style="display:flex;align-items:center;gap:0.6rem;">' +
            '<span style="font-size:1.05rem;line-height:1;">' + icon + '</span>' +
            '<span class="font-display text-lg md:text-xl tracking-wide" style="color:' + color + ';text-shadow:0 0 18px ' + color + '33;">' + title + '</span>' +
            '<span style="flex:1;height:1px;background:linear-gradient(90deg,' + color + '55,transparent);"></span>' +
          '</div>' +
          (sub ? '<p class="font-condensed" style="font-size:0.72rem;color:#7596c0;letter-spacing:0.01em;margin:0.3rem 0 0;">' + sub + '</p>' : '') +
        '</div>';
    }

    // The ballot "tone" for a race, mirroring _krBallotBanner: 'now' (on the
    // 2026 ballot), 'open' (open seat, 2026) or 'future' (a sitting seat not up
    // this year, shown for reference). Coverage guidance only nudges the voter to
    // fill seats they can actually vote on this year — 'now' / 'open'.
    function _krRaceTone(race) {
      var b = race.ballot;
      if (!b) return /open seat/i.test(race.incumbentNote || '') ? 'open' : 'now';
      return b.tone || 'now';
    }

    // Does the voter already have someone on their team for this race? Returns the
    // picked pid (validated against CMP_DATA) or null. The team store is keyed by
    // raceKey, so the lookup is direct.
    function _krRacePick(race, selections) {
      var pid = selections && selections[race.raceKey];
      return (pid && typeof CMP_DATA !== 'undefined' && CMP_DATA[pid]) ? pid : null;
    }

    // Smooth-scroll to a race card and flash it — the one-tap bridge from a
    // coverage chip ("Senate District 6 still needs a pick") to the actual race
    // where the voter adds someone.
    window.keyRacesScrollToRace = function(raceKey) {
      var el = document.getElementById('kr-race-' + raceKey);
      if (!el) return;
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      el.classList.remove('kr-race-flash');
      void el.offsetWidth;
      el.classList.add('kr-race-flash');
      setTimeout(function() { el.classList.remove('kr-race-flash'); }, 1600);
    };

    // Maps a Key Races raceKey to the Relevant-to-Me [level, officeKey] branch that
    // holds the same seat's full field, so a race card can jump straight to it.
    var _KR_RACE_TO_RELEVANT = {
      house:       ['federal', 'representative'],
      senate:      ['federal', 'senator'],
      president:   ['federal', 'president'],
      governor:    ['state', 'governor'],
      statesenate: ['state', 'state_senator'],
      statehouse:  ['state', 'state_rep'],
      local:       ['local', 'local']
    };

    // ── Key Races → Relevant to Me bridge ────────────────────────────────────
    // The "See full list for this district" button on each race card. Key Races is
    // the quick overview (current officeholder + the field at a glance); the deeper
    // browse — every candidate, grouped, with values ranking and "explore other
    // districts" — lives in Relevant to Me. This scrolls the voter there and opens
    // the exact office branch for THIS seat, so the two sections read as one flow:
    // overview up top → focused full list below.
    window.keyRacesViewFullList = function(raceKey) {
      try {
        var m = _KR_RACE_TO_RELEVANT[raceKey] || ['state', 'state_rep'];
        // The Relevant-to-Me tree only renders once a real location is set. If the
        // visitor is still on the default area (hasn't picked one yet), adopt the
        // currently-shown Key Races area now so the full list exists to jump to.
        if (!window._hasUserLocation && typeof _krEstablishVoterLocation === 'function') {
          _krEstablishVoterLocation(_krCurrentLocationId());
        }
        if (window.renderRelevantToMe) window.renderRelevantToMe();
        // Let the freshly-rendered tree paint, then open the matching office branch
        // and scroll it into view (_relevantJump handles both).
        setTimeout(function() {
          if (window._relevantJump) window._relevantJump(m[0], m[1]);
        }, 70);
      } catch (e) {}
    };

    // ── Ballot-coverage overview ─────────────────────────────────────────────
    // The guided header above every race: how many of the seats the voter can
    // vote on this year already have someone on their team, a progress bar, and a
    // tappable chip per seat — green = covered, pulsing gold = still a gap. This is
    // what turns a list of districts into a clear, finishable "cover your ballot"
    // task and makes the uncovered districts impossible to miss.
    function _krCoverageOverview(allRaces, selections) {
      var actionable = (allRaces || []).filter(function(r) {
        var t = _krRaceTone(r);
        return t === 'now' || t === 'open';
      });
      if (!actionable.length) return '';
      var nTot = actionable.length;
      var nCov = 0;
      var chips = actionable.map(function(r) {
        var pick = _krRacePick(r, selections);
        var label = r.short || r.district || 'This seat';
        if (pick) {
          nCov++;
          return '<button type="button" class="kr-cov-chip is-covered" onclick="window.keyRacesScrollToRace(\'' + r.raceKey + '\')" ' +
              'aria-label="' + label + ' — ' + CMP_DATA[pick].name + ' is on your team; tap to view this race">' +
              '<span class="kr-cov-chip-ico">✓</span>' + label + '</button>';
        }
        return '<button type="button" class="kr-cov-chip is-open-gap" onclick="window.keyRacesScrollToRace(\'' + r.raceKey + '\')" ' +
            'aria-label="' + label + ' — no one added yet; tap to jump to this race and add someone">' +
            '<span class="kr-cov-chip-ico">＋</span>' + label + '</button>';
      }).join('');
      var complete = nCov === nTot;
      var pct = Math.round((nCov / nTot) * 100);
      var gap = nTot - nCov;
      var headIco = complete ? '🎉' : '🗳️';
      var title = complete ? 'Your ballot is covered' : 'Build Your Ballot Team';
      var sub;
      if (complete) {
        sub = 'You’ve added someone for every seat on your ballot. Compare your full team, or fine-tune any pick below.';
      } else if (nCov === 0) {
        sub = 'You haven’t added anyone from your districts yet. Add a pick for each seat below to build a team that covers your whole ballot — tap any gold race to jump straight to it.';
      } else {
        sub = 'You’ve covered <strong style="color:#fff;">' + nCov + ' of ' + nTot + '</strong> seats — ' + gap + ' still ' +
              (gap === 1 ? 'needs' : 'need') + ' a pick. Tap a gold race below to fill the gap.';
      }
      var cta = (complete && nCov >= 2)
        ? '<button type="button" class="kr-cov-cta" onclick="if(window.myteamCompareAll)window.myteamCompareAll();else{var b=document.getElementById(\'myteam-summary-box\')||document.getElementById(\'my-politicians\');if(b)b.scrollIntoView({behavior:\'smooth\',block:\'start\'});}">⚖️ Compare your full team</button>'
        : '';
      return '<div class="kr-coverage-panel kr-span-all' + (complete ? ' is-complete' : '') + '">' +
          '<div class="kr-cov-head">' +
            '<span style="font-size:1.18rem;line-height:1;">' + headIco + '</span>' +
            '<span class="kr-cov-title">' + title + '</span>' +
            '<span class="kr-cov-count"><strong>' + nCov + '</strong> / ' + nTot + ' seats</span>' +
          '</div>' +
          '<p class="kr-cov-sub">' + sub + '</p>' +
          '<div class="kr-cov-bar"><span style="width:' + pct + '%;"></span></div>' +
          '<div class="kr-cov-chips">' + chips + '</div>' +
          cta +
        '</div>';
    }

    window.renderKeyRaces = function() {
      try {
        var list = document.getElementById('keyraces-list');
        if (!list) return;
        var locId = _krCurrentLocationId();
        var races = KEY_RACES_BY_LOCATION[locId] || [];

        // Populate / sync the location selector.
        var sel = document.getElementById('keyraces-location-select');
        if (sel) {
          if (sel.options.length !== KEY_RACES_LOCATIONS.length) {
            var currentRegion = '';
            var optionsHtml = '';
            KEY_RACES_LOCATIONS.forEach(function(l) {
              if ((l.region || '') !== currentRegion) {
                if (currentRegion) optionsHtml += '</optgroup>';
                currentRegion = l.region || 'Utah';
                optionsHtml += '<optgroup label="' + currentRegion + '">';
              }
              optionsHtml += '<option value="' + l.id + '">' + l.label + '</option>';
            });
            if (currentRegion) optionsHtml += '</optgroup>';
            sel.innerHTML = optionsHtml;
          }
          if (sel.value !== locId) sel.value = locId;
        }

        var headline = document.getElementById('keyraces-headline');
        if (headline) headline.innerHTML = _krLocationHeadline(locId);

        // Statewide races (Governor, U.S. Senate) come first and show for every
        // location; the selected area's district races follow underneath.
        var statewide = (typeof KEY_RACES_STATEWIDE !== 'undefined') ? KEY_RACES_STATEWIDE : [];
        var html = '';
        // Guided coverage header: how much of this voter's ballot their team
        // already covers, with a tappable gap chip for every uncovered seat.
        try {
          html += _krCoverageOverview(statewide.concat(races), (typeof _ballotLoad === 'function') ? _ballotLoad() : {});
        } catch (e) {}
        if (statewide.length) {
          html += _krGroupHeader('🏛', 'Statewide Races', 'On every Utah voter’s ballot — these offices represent the whole state.', '#fbbf24');
          html += statewide.map(_krRaceCard).join('');
        }
        if (races.length) {
          html += _krGroupHeader('📍', 'Your District Races', 'Specific to the area selected above — change your location to update them.', '#60a5fa');
          html += races.map(_krRaceCard).join('');
        }
        // Friendly fallback so the section never renders blank if no races resolve
        // for a location (e.g. data still loading or an unmapped area). Points the
        // visitor at the one control that fixes it rather than leaving dead space.
        if (!html) {
          html = '<div class="kr-span-all" style="padding:1.4rem 1.25rem;border-radius:1.1rem;background:rgba(30,58,138,0.14);border:1px solid rgba(96,165,250,0.28);text-align:center;">' +
            '<div style="font-size:1.8rem;line-height:1;margin-bottom:0.5rem;">🗺️</div>' +
            '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:1.05rem;color:#e6eefb;margin-bottom:0.3rem;">No races to show for this area yet</div>' +
            '<p style="font-family:\'Barlow\',sans-serif;font-size:0.85rem;line-height:1.5;color:#9fb4d4;max-width:30rem;margin:0 auto 0.9rem;">Pick a different Utah area above and your statewide and district races will load here.</p>' +
            '<button type="button" onclick="window.toggleChangeLocation && window.toggleChangeLocation()" class="font-condensed font-700 text-xs tracking-wider uppercase text-white bg-blue-600 hover:bg-blue-500 border border-blue-400/40 px-4 py-2.5 rounded-xl transition-all min-h-[44px]">📍 Change location</button>' +
            '</div>';
        }
        list.innerHTML = html;
      } catch (e) { /* never break the page */ }
    };

    // Keep Key Races in sync with every team change: wrap the central renderer.
    (function() {
      var _origBallotRender = window._ballotRender;
      window._ballotRender = function() {
        if (typeof _origBallotRender === 'function') _origBallotRender();
        if (window.renderKeyRaces) window.renderKeyRaces();
      };
    })();
    // Initial paint (DOM for this section already exists above this script).
    try { window.renderKeyRaces(); } catch (e) {}
    // The "Relevant to Me" ballot reads the same district data, so repaint it now
    // that keyRacesRelevantData() is available (it may have rendered the neutral
    // prompt earlier, before this module loaded).
    try { if (window.renderRelevantToMe) window.renderRelevantToMe(); } catch (e) {}
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        if (window.renderKeyRaces) window.renderKeyRaces();
        if (window.renderRelevantToMe) window.renderRelevantToMe();
      });
    }
    // Refresh the location-aware headline whenever the user sets/changes location.
    (function() {
      if (typeof window._updateTeamPositionsForLocation === 'function') {
        var _origUpd = window._updateTeamPositionsForLocation;
        window._updateTeamPositionsForLocation = function() {
          var r = _origUpd.apply(this, arguments);
          if (window.renderKeyRaces) window.renderKeyRaces();
          return r;
        };
      }
    })();

    window.ballotPick = function(selectEl) {
      var race = selectEl.getAttribute('data-race');
      var pid = selectEl.value;
      var selections = _ballotLoad();
      if (pid) {
        selections[race] = pid;
      } else {
        delete selections[race];
      }
      _ballotSave(selections);
      _ballotRender();
      _flashSavedBadge();
    };

    window.ballotPickCard = function(raceKey, pid) {
      // Route a generic local pick to the specific seat it belongs to, so each local
      // office keeps its own independent slot (local_<raceKey>) instead of every
      // local pick overwriting one shared 'local' key. Non-local keys are untouched.
      if (raceKey === 'local') {
        try { var _lk = (typeof window._myteamLocalKeyForPid === 'function') ? window._myteamLocalKeyForPid(pid) : null; if (_lk) raceKey = _lk; } catch (e) {}
      }
      var selections = _ballotLoad();
      var wasEmpty = !selections[raceKey];
      var isRemoving = selections[raceKey] === pid;
      if (isRemoving) {
        delete selections[raceKey];
      } else {
        selections[raceKey] = pid;
      }
      _ballotSave(selections);

      // Keep the membership store (`_myPoliticians`) in sync with this ballot-slot
      // change so the pick flips every "✓ On Team" badge, heart and filter across
      // the rest of the app — and persists to the account — instead of living only
      // in the slot grid. This is what makes a district-card / Key-Races add behave
      // identically to a browse "Add to My Team" add.
      if (typeof window._pdxReflectBallotPick === 'function') {
        try { window._pdxReflectBallotPick(pid, !isRemoving); } catch (e) {}
      }


      // slot — both on this immediate repaint and when the voter jumps up via the
      // toast's "See it in My Team" action. Mirrors mypolToggleAnimated so the
      // PRIMARY add path (Relevant to Me / Key Races cards) lands on a visible,
      // satisfying result instead of a silently-changed grid. Cleared on removal
      // so a stale highlight never lingers.
      if (isRemoving) {
        window._pdxJustFilledPid = null;
      } else {
        window._pdxJustFilledPid = pid;
        if (window._pdxJustFilledTimer) clearTimeout(window._pdxJustFilledTimer);
        window._pdxJustFilledTimer = setTimeout(function() { window._pdxJustFilledPid = null; }, 6000);
      }

      _ballotRender();

      // Premium feedback: named toast + counter pop on every team change.
      try {
        var _filled = 0;
        for (var _bi = 0; _bi < BALLOT_RACES.length; _bi++) {
          if (selections[BALLOT_RACES[_bi].key]) _filled++;
        }
        var _total = BALLOT_RACES.length;
        if (typeof window._popTeamCounter === 'function') window._popTeamCounter();
        if (!isRemoving && typeof window._pdxCelebrateAdd === 'function') {
          window._pdxCelebrateAdd(window._pdxAddOriginEl || null);
        }
        window._pdxAddOriginEl = null;
        if (typeof window._showTeamToast === 'function') {
          if (isRemoving) {
            window._showTeamToast(pid, 'remove', { count: _filled, total: _total });
          } else {
            // Key Races already auto-advances to the next open race below, so the
            // toast's guidance focuses on the other direction: comparing the slate
            // so far, or hopping over to the team workspace.
            var _complete = _filled === _total;
            var _acts = [];
            // Prefer the slot-aware scroll: it lands the voter on the slot they
            // just filled and re-triggers its pulse, so the hand-off ends on a
            // visible result rather than the top of the panel.
            var _viewTeam = function() {
              if (typeof window._relevantScrollToTeam === 'function') { window._relevantScrollToTeam(); return; }
              var b = document.getElementById('myteam-summary-box') || document.getElementById('my-politicians');
              if (b && b.scrollIntoView) b.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            var _compareTeam = function() { if (window.myteamCompareAll) window.myteamCompareAll(); else _viewTeam(); };
            if (_complete) {
              if (_filled >= 2) _acts.push({ label: '⚖️ Compare your team', kind: 'primary', act: _compareTeam });
              _acts.push({ label: '↑ See it in My Team', kind: 'secondary', act: _viewTeam });
            } else {
              // Always offer a one-tap hop up to watch the slot they just filled
              // light up — this is what closes the discover → add → see-it-appear
              // loop for the common single-pick add, where there was no action before.
              _acts.push({ label: '↑ See it in My Team', kind: 'primary', act: _viewTeam });
              if (_filled >= 2) _acts.push({ label: '⚖️ Compare my picks', kind: 'secondary', act: _compareTeam });
            }
            window._showTeamToast(pid, 'add', { count: _filled, total: _total, complete: _complete, actions: _acts });
          }
        }
      } catch (e) {}

      var summaryBox = document.getElementById('myteam-summary-box');
      if (summaryBox) {
        summaryBox.classList.remove('just-picked');
        void summaryBox.offsetWidth;
        summaryBox.classList.add('just-picked');
        setTimeout(function() { summaryBox.classList.remove('just-picked'); }, 700);
      }

      _flashSavedBadge();

      // Reflect the pick in the "Relevant to Me" district-coverage UI too, so the
      // tracker and chips agree no matter which surface the voter picked from.
      if (window.renderRelevantToMe) { try { window.renderRelevantToMe(); } catch (e) {} }

      // Keep the "Your Voting Districts" strip's per-card "in your team" indicator
      // in sync with the pick that just changed.
      if (window._vhSyncDistrictStrip) { try { window._vhSyncDistrictStrip(); } catch (e) {} }

      if (selections[raceKey]) {
        var raceIdx = -1;
        for (var r = 0; r < BALLOT_RACES.length; r++) {
          if (BALLOT_RACES[r].key === raceKey) { raceIdx = r; break; }
        }
        if (raceIdx >= 0) {
          var cards = document.querySelectorAll('#myteam-summary-grid .myteam-sum-card');
          var filledIdx = 0;
          for (var ri = 0; ri < BALLOT_RACES.length; ri++) {
            if (ri === raceIdx && selections[BALLOT_RACES[ri].key]) {
              if (cards[filledIdx]) {
                cards[filledIdx].style.transition = 'none';
                cards[filledIdx].style.transform = 'scale(1.08)';
                cards[filledIdx].style.boxShadow = '0 0 28px rgba(74,222,128,0.25)';
                void cards[filledIdx].offsetWidth;
                cards[filledIdx].style.transition = 'transform 0.4s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.4s ease';
                cards[filledIdx].style.transform = '';
                cards[filledIdx].style.boxShadow = '';
              }
              break;
            }
            if (selections[BALLOT_RACES[ri].key]) filledIdx++;
            else filledIdx++;
          }
        }

        var nextEmpty = null;
        for (var i = 0; i < BALLOT_RACES.length; i++) {
          if (!selections[BALLOT_RACES[i].key]) {
            nextEmpty = BALLOT_RACES[i].key;
            break;
          }
        }
        if (nextEmpty) {
          setTimeout(function() {
            var el = document.getElementById('ballot-race-' + nextEmpty);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        } else {
          setTimeout(function() {
            var box = document.getElementById('myteam-summary-box');
            if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 350);
        }
      }
    };

    // Animated wrapper for the "Add to My Team" buttons in Your Key Races.
    // Gives the clicked button an instant satisfying pop/check before the
    // section re-renders, then delegates to the shared pick logic above.
    window.ballotPickCardAnimated = function(btn, raceKey, pid) {
      // Match ballotPickCard's per-seat local routing so the isRemoving check below
      // reads the same key the pick is actually stored under.
      if (raceKey === 'local') {
        try { var _lk = (typeof window._myteamLocalKeyForPid === 'function') ? window._myteamLocalKeyForPid(pid) : null; if (_lk) raceKey = _lk; } catch (e) {}
      }
      var selections = (typeof _ballotLoad === 'function') ? _ballotLoad() : {};
      var isRemoving = selections[raceKey] === pid;
      if (btn && !isRemoving) {
        // Remember the tapped control so the celebration burst launches from it
        // when ballotPickCard commits the pick a moment later.
        window._pdxAddOriginEl = btn;
        btn.classList.add('kr-btn-pop');
        btn.innerHTML = '<span class="kr-btn-check">✓</span> Added!';
        setTimeout(function() { window.ballotPickCard(raceKey, pid); }, 300);
      } else {
        window.ballotPickCard(raceKey, pid);
      }
    };

    window.ballotClearRace = function(raceKey) {
      var selections = _ballotLoad();
      var removedPid = selections[raceKey];
      delete selections[raceKey];
      _ballotSave(selections);
      // Mirror the removal into the membership store so "✓ On Team" badges, hearts
      // and filters across the rest of the app drop this person too — unless they
      // still hold another ballot slot.
      if (removedPid && typeof window._pdxReflectBallotPick === 'function') {
        try { window._pdxReflectBallotPick(removedPid, false); } catch (e) {}
      }
      _ballotRender();
      _flashSavedBadge();
    };

    window.ballotClearAll = function() {
      // Capture every picked pid before wiping the ballot so we can clear them from
      // the membership store too, keeping the two team stores in lock-step.
      var _prev = _ballotLoad();
      _ballotSave({});
      if (typeof window._pdxReflectBallotPick === 'function') {
        Object.keys(_prev).forEach(function(k) {
          if (_prev[k]) { try { window._pdxReflectBallotPick(_prev[k], false); } catch (e) {} }
        });
      }
      if (typeof _setActiveTeamId === 'function') _setActiveTeamId(null);
      _ballotRender();
      _flashSavedBadge();
    };

    window.ballotScrollToRace = function(raceKey) {
      var el = document.getElementById('ballot-race-' + raceKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 30px rgba(192,21,42,0.2), 0 0 10px rgba(192,21,42,0.15)';
        el.style.borderColor = 'rgba(192,21,42,0.5)';
        setTimeout(function() {
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }, 1500);
      }
    };

    window.ballotShareTeam = function() {
      var selections = _ballotLoad();
      var picks = [];
      var filled = 0;
      BALLOT_RACES.forEach(function(race) {
        var pid = selections[race.key];
        var d = pid && typeof CMP_DATA !== 'undefined' ? CMP_DATA[pid] : null;
        if (d) {
          filled++;
          var entry = race.label + ': ' + d.name;
          // ONE READ, in the pasted text too. This used to append "(6 kept · 3
          // broken)" per pick and then total them into "Pledge receipts on file:
          // 41" — a tally, aggregated across six people, leaving the site as the
          // headline of a share. A campaign pledge is one form of "said" and it is
          // already inside ⚖️ Word vs Action, so what travels is that verdict and
          // nothing else. Below the publishing floor nothing is appended at all:
          // PDXWordAction owns when a read is sayable, and a share is the last
          // place to second-guess it.
          try {
            var wa = window.PDXWordAction;
            var r = (wa && typeof wa.read === 'function') ? wa.read(pid, d) : null;
            if (r && r.publishable && r.verdict && r.verdict.label) {
              entry += ' — ⚖️ ' + r.verdict.label;
            }
          } catch (e) {}
          picks.push(entry);
        }
      });
      var text = filled > 0
        ? '🗳️ My 2026 Voting Team (' + filled + '/6 picked):\n\n' + picks.join('\n') + '\n\nBuild yours → https://politidex.fyi #PolitiDex #2026Ballot'
        : 'Build your 2026 Voting Team at https://politidex.fyi #PolitiDex';

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
          _showShareToast('Copied to clipboard — paste anywhere to share!');
        }).catch(function() {
          _fallbackCopy(text);
        });
      } else {
        _fallbackCopy(text);
      }

      var btn = document.getElementById('myteam-sharetext-btn');
      if (btn) {
        btn.classList.add('copied');
        var origHTML = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
        setTimeout(function() {
          btn.classList.remove('copied');
          btn.innerHTML = origHTML;
        }, 2500);
      }
    };

    function _fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); _showShareToast('Copied to clipboard — paste anywhere to share!'); }
      catch(e) { _showShareToast('Could not copy — try manually'); }
      document.body.removeChild(ta);
    }

    function _showShareToast(msg) {
      var toast = document.getElementById('myteam-share-toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(function() { toast.classList.remove('visible'); }, 2500);
    }

    // ════════════════════════════════════════════════════════════════════
    // SAVED TEAMS + SHAREABLE LINKS
    // Visitors can name and keep several teams. They persist to localStorage
    // for everyone (so they survive refreshes and return visits even without
    // an account) and are mirrored to Firestore for signed-in members so the
    // same teams follow them across devices. Sharing encodes a team into a
    // URL that rebuilds the exact slate for whoever opens it — no backend.
    // ════════════════════════════════════════════════════════════════════
    var SAVED_TEAMS_KEY = 'politidex_saved_teams_v1';
    // Which saved team (if any) the visitor is currently editing. Persisted so the
    // "you're editing X" context survives a refresh, exactly like the ballot itself.
    var ACTIVE_TEAM_KEY = 'politidex_active_team_v1';
    function _getActiveTeamId() {
      if (window.PDXStore) { var v = window.PDXStore.readRaw(ACTIVE_TEAM_KEY); return v || null; }
      try { return localStorage.getItem(ACTIVE_TEAM_KEY) || null; } catch (e) { return null; }
    }
    function _setActiveTeamId(id) {
      if (window.PDXStore) {
        if (id) window.PDXStore.writeRaw(ACTIVE_TEAM_KEY, id);
        else window.PDXStore.remove(ACTIVE_TEAM_KEY);
        return;
      }
      try {
        if (id) localStorage.setItem(ACTIVE_TEAM_KEY, id);
        else localStorage.removeItem(ACTIVE_TEAM_KEY);
      } catch (e) {}
    }

    function _esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function _savedTeamsLoad() {
      if (window.PDXStore) { var v = window.PDXStore.read(SAVED_TEAMS_KEY, []); return Array.isArray(v) ? v : []; }
      try {
        var raw = localStorage.getItem(SAVED_TEAMS_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) { return []; }
    }
    function _savedTeamsStore(arr) {
      if (window.PDXStore) { window.PDXStore.write(SAVED_TEAMS_KEY, arr); }   // marks 'team' dirty
      else { try { localStorage.setItem(SAVED_TEAMS_KEY, JSON.stringify(arr)); } catch (e) {} }
    }
    // Repaint the saved-teams list (and the live ballot, in case Home Base / the
    // active team shifted) when a cross-device sync pull updates 'team' (see
    // PDXTeamSync.project → 'pdx-team-change'). Read-only: storage already holds
    // the merged truth, so this only re-renders from it.
    try {
      window.addEventListener('pdx-team-change', function () {
        try { if (typeof _renderSavedTeams === 'function') _renderSavedTeams(); } catch (e) {}
        try { if (typeof _ballotRender === 'function') _ballotRender(); } catch (e) {}
      });
    } catch (e) { /* live refresh is best-effort */ }
    function _genTeamId() {
      return 'saved_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }
    function _findSavedTeam(id) {
      var teams = _savedTeamsLoad();
      for (var i = 0; i < teams.length; i++) { if (teams[i].id === id) return teams[i]; }
      return null;
    }
    function _slotsFilledCount(slots) {
      var n = 0;
      for (var k in slots) { if (slots[k] && typeof CMP_DATA !== 'undefined' && CMP_DATA[slots[k]]) n++; }
      return n;
    }

    // ── URL-safe encode / decode of a shared team ({name, slots}) ──────────
    function _b64urlEncode(str) {
      var b64 = btoa(unescape(encodeURIComponent(str)));
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function _b64urlDecode(str) {
      var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return decodeURIComponent(escape(atob(b64)));
    }
    function _encodeTeam(name, slots) {
      var payload = { v: 1, n: (name || '').toString().slice(0, 60), s: {} };
      for (var k in slots) { if (slots[k]) payload.s[k] = slots[k]; }
      try { return _b64urlEncode(JSON.stringify(payload)); } catch (e) { return ''; }
    }
    function _decodeTeam(token) {
      try {
        var obj = JSON.parse(_b64urlDecode(token));
        if (!obj || typeof obj !== 'object') return null;
        var slots = obj.s || obj.slots || {};
        var clean = {};
        for (var k in slots) { if (slots[k]) clean[k] = String(slots[k]); }
        return { name: (obj.n || obj.name || '').toString().slice(0, 60), slots: clean };
      } catch (e) { return null; }
    }
    function _teamShareUrl(name, slots) {
      return location.origin + location.pathname + '?team=' + _encodeTeam(name, slots) + '#my-politicians';
    }
    function _copyShareLink(name, slots) {
      var url = _teamShareUrl(name, slots);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url)
          .then(function() { _showShareToast('Share link copied — anyone who opens it loads this exact team.'); })
          .catch(function() { _fallbackCopy(url); });
      } else {
        _fallbackCopy(url);
      }
    }

    // ── Firestore mirror (signed-in members only) ──────────────────────────
    function _teamMember() {
      var u = (typeof auth !== 'undefined') ? auth.currentUser : null;
      return (u && !u.isAnonymous) ? u : null;
    }
    function _cloudSaveTeam(team) {
      var u = _teamMember();
      if (!u || typeof db === 'undefined') return;
      try {
        var members = [];
        for (var k in (team.slots || {})) { if (team.slots[k]) members.push(team.slots[k]); }
        db.collection('userTeams').doc(u.uid).collection('teams').doc(team.id).set({
          schemaVersion: (window.PDX_TEAM_SCHEMA_VERSION || 2),
          name: team.name || 'My Team',
          slots: team.slots || {},
          members: members,
          isMain: false,
          savedTeam: true,
          visibility: 'private',
          ownerUid: u.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function() {});
      } catch (e) {}
    }
    function _cloudDeleteTeam(id) {
      var u = _teamMember();
      if (!u || typeof db === 'undefined') return;
      try { db.collection('userTeams').doc(u.uid).collection('teams').doc(id).delete().catch(function() {}); } catch (e) {}
    }
    // Pull any cloud-saved teams the user made on another device into this one.
    function _cloudFetchSavedTeams() {
      var u = _teamMember();
      if (!u || typeof db === 'undefined') return;
      try {
        db.collection('userTeams').doc(u.uid).collection('teams').get().then(function(snap) {
          var local = _savedTeamsLoad();
          var byId = {};
          local.forEach(function(t) { byId[t.id] = t; });
          var changed = false;
          snap.forEach(function(doc) {
            var d = doc.data() || {};
            if (!d.savedTeam) return;          // skip the auto-saved "main" team
            if (!byId[doc.id]) {
              byId[doc.id] = { id: doc.id, name: d.name || 'My Team', slots: d.slots || {}, createdAt: Date.now(), updatedAt: Date.now() };
              changed = true;
            }
          });
          if (changed) {
            _savedTeamsStore(Object.keys(byId).map(function(k) { return byId[k]; }));
            _renderSavedTeams();
          }
        }).catch(function() {});
      } catch (e) {}
    }

    // ── Public actions ─────────────────────────────────────────────────────
    window.myteamSaveCurrent = function() {
      var slots = _ballotLoad();
      if (_slotsFilledCount(slots) === 0) {
        _showShareToast('Add at least one pick above before saving a team.');
        return;
      }
      var input = document.getElementById('myteam-name-input');
      var name = input && input.value ? input.value.trim() : '';
      if (!name) name = 'My Team ' + (_savedTeamsLoad().length + 1);
      name = name.slice(0, 60);
      var team = { id: _genTeamId(), name: name, slots: JSON.parse(JSON.stringify(slots)), createdAt: Date.now(), updatedAt: Date.now() };
      var teams = _savedTeamsLoad();
      teams.unshift(team);
      _savedTeamsStore(teams);
      _cloudSaveTeam(team);
      _setActiveTeamId(team.id);
      if (input) input.value = '';
      _renderSavedTeams();
      _showShareToast('Saved “' + name + '” — find it under Saved Teams.');
    };

    // Save the current picks back into the team being edited (no duplicate).
    window.myteamUpdateActive = function() {
      var id = _getActiveTeamId();
      if (!id) { window.myteamSaveCurrent(); return; }
      var teams = _savedTeamsLoad();
      var team = null;
      for (var i = 0; i < teams.length; i++) { if (teams[i].id === id) { team = teams[i]; break; } }
      if (!team) { _setActiveTeamId(null); window.myteamSaveCurrent(); return; }
      var slots = _ballotLoad();
      if (_slotsFilledCount(slots) === 0) {
        _showShareToast('Add at least one pick before updating this team.');
        return;
      }
      team.slots = JSON.parse(JSON.stringify(slots));
      team.updatedAt = Date.now();
      _savedTeamsStore(teams);
      _cloudSaveTeam(team);
      _renderSavedTeams();
      _showShareToast('Updated “' + team.name + '” with your current picks.');
    };

    // Stop editing the active saved team (the next Save creates a fresh team).
    window.myteamClearActive = function() {
      _setActiveTeamId(null);
      _renderSavedTeams();
      var input = document.getElementById('myteam-name-input');
      if (input) input.focus();
    };

    window.myteamLoadSaved = function(id) {
      var team = _findSavedTeam(id);
      if (!team) return;
      _ballotSave(JSON.parse(JSON.stringify(team.slots || {})));
      _setActiveTeamId(team.id);
      _ballotRender();
      _flashSavedBadge();
      _showShareToast('Loaded “' + team.name + '” — edit freely, then Update to save your changes.');
      var box = document.getElementById('myteam-summary-box');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.myteamDeleteSaved = function(id) {
      var team = _findSavedTeam(id);
      if (team && typeof window.confirm === 'function' && !window.confirm('Delete saved team “' + team.name + '”?')) return;
      _savedTeamsStore(_savedTeamsLoad().filter(function(t) { return t.id !== id; }));
      if (_getActiveTeamId() === id) _setActiveTeamId(null);
      _cloudDeleteTeam(id);
      _renderSavedTeams();
    };

    window.myteamRenameSaved = function(id) {
      var teams = _savedTeamsLoad();
      var team = null;
      for (var i = 0; i < teams.length; i++) { if (teams[i].id === id) { team = teams[i]; break; } }
      if (!team) return;
      var name = (typeof window.prompt === 'function') ? window.prompt('Rename this team:', team.name) : null;
      if (name === null) return;
      name = name.trim().slice(0, 60) || team.name;
      team.name = name;
      team.updatedAt = Date.now();
      _savedTeamsStore(teams);
      _cloudSaveTeam(team);
      _renderSavedTeams();
    };

    window.myteamShareSaved = function(id) {
      var team = _findSavedTeam(id);
      if (team) _copyShareLink(team.name, team.slots);
    };

    // Primary share: copies a link that re-creates the live ballot for anyone.
    window.ballotShareTeamLink = function() {
      var slots = _ballotLoad();
      if (_slotsFilledCount(slots) === 0) { _showShareToast('Add some picks first, then share your link.'); return; }
      _copyShareLink('My 2026 Voting Team', slots);
      var btn = document.getElementById('myteam-share-btn');
      if (btn) {
        btn.classList.add('copied');
        var orig = btn.innerHTML;
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Link Copied!';
        setTimeout(function() { btn.classList.remove('copied'); btn.innerHTML = orig; }, 2500);
      }
    };

    function _renderSavedTeams() {
      var list = document.getElementById('myteam-saved-list');
      if (!list) { _renderEditingBar(); return; }
      var teams = _savedTeamsLoad();
      var activeId = _getActiveTeamId();
      // If the active team was removed (e.g. on another tab), drop the stale pointer.
      if (activeId && !_findSavedTeam(activeId)) { _setActiveTeamId(null); activeId = null; }
      var countEl = document.getElementById('myteam-saved-count');
      if (countEl) countEl.textContent = teams.length ? (teams.length + ' saved') : '';
      if (teams.length === 0) {
        list.innerHTML = '<div class="myteam-saved-empty">No saved teams yet. Build your slate above, give it a name, and hit <strong>Save Team</strong> to keep it for later.</div>';
        _renderEditingBar();
        return;
      }
      var html = '';
      teams.forEach(function(team) {
        var slots = team.slots || {};
        var filled = _slotsFilledCount(slots);
        var isActive = team.id === activeId;
        var avatars = '';
        var shown = 0;
        for (var k in slots) {
          if (shown >= 6) break;
          var pid = slots[k];
          var d = pid && typeof CMP_DATA !== 'undefined' ? CMP_DATA[pid] : null;
          if (!d) continue;
          shown++;
          var photo = _getPhotoUrl(pid);
          avatars += photo
            ? '<img class="myteam-saved-ava" loading="lazy" decoding="async" src="' + photo + '" alt="' + _esc(d.name) + '" title="' + _esc(d.name) + '" onerror="this.style.display=\'none\'">'
            : '<span class="myteam-saved-ava myteam-saved-ava-ph" title="' + _esc(d.name) + '">' + (d.icon || '🏛') + '</span>';
        }
        if (!avatars) avatars = '<span class="myteam-saved-ava myteam-saved-ava-ph">🗳️</span>';
        html += '<div class="myteam-saved-card' + (isActive ? ' is-active' : '') + '">' +
          '<div class="myteam-saved-card-main">' +
            '<div class="myteam-saved-avatars">' + avatars + '</div>' +
            '<div class="myteam-saved-meta">' +
              '<div class="myteam-saved-name">' + _esc(team.name) + (isActive ? '<span class="myteam-active-pill">Editing</span>' : '') + '</div>' +
              '<div class="myteam-saved-sub">' + filled + ' pick' + (filled === 1 ? '' : 's') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="myteam-saved-actions">' +
            (isActive
              ? '<button class="myteam-saved-btn st-load is-loaded" title="This team is loaded into your ballot above" disabled>✓ Loaded</button>'
              : '<button class="myteam-saved-btn st-load" onclick="myteamLoadSaved(\'' + team.id + '\')">Load</button>') +
            '<button class="myteam-saved-btn st-share" onclick="myteamShareSaved(\'' + team.id + '\')" title="Copy a share link for this team">🔗 Share</button>' +
            '<button class="myteam-saved-btn st-rename" onclick="myteamRenameSaved(\'' + team.id + '\')" title="Rename">✏️</button>' +
            '<button class="myteam-saved-btn st-del" onclick="myteamDeleteSaved(\'' + team.id + '\')" title="Delete">🗑</button>' +
          '</div>' +
        '</div>';
      });
      list.innerHTML = html;
      _renderEditingBar();
    }
    window._renderSavedTeams = _renderSavedTeams;

    // Show the "you're editing X" bar only while a saved team is loaded, so
    // edits to a loaded slate update it in place instead of spawning a copy.
    function _renderEditingBar() {
      var bar = document.getElementById('myteam-editing-bar');
      if (!bar) return;
      var id = _getActiveTeamId();
      var team = id ? _findSavedTeam(id) : null;
      if (!team) { bar.classList.remove('visible'); return; }
      var nameEl = document.getElementById('myteam-editing-name');
      if (nameEl) nameEl.textContent = team.name;
      bar.classList.add('visible');
    }
    window._renderEditingBar = _renderEditingBar;

    // ── Importing a team that was shared via ?team= link ───────────────────
    var _pendingSharedTeam = null;

    function _checkSharedTeamInUrl() {
      var token = null;
      try { token = new URLSearchParams(location.search).get('team'); } catch (e) { token = null; }
      // Strip the param immediately so a refresh doesn't re-prompt and the
      // token isn't accidentally carried into onward navigation.
      if (token) { try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} }
      if (!token) return;
      var decoded = _decodeTeam(token);
      if (!decoded || _slotsFilledCount(decoded.slots) === 0) return;
      _pendingSharedTeam = decoded;
      _renderImportBanner(decoded);
    }

    function _renderImportBanner(team) {
      var banner = document.getElementById('myteam-import-banner');
      if (!banner) return;
      var filled = _slotsFilledCount(team.slots);
      var names = [];
      for (var k in team.slots) {
        var d = typeof CMP_DATA !== 'undefined' ? CMP_DATA[team.slots[k]] : null;
        if (d) names.push(d.name);
      }
      var titleEl = document.getElementById('myteam-import-title');
      var subEl = document.getElementById('myteam-import-sub');
      if (titleEl) titleEl.innerHTML = '🔗 ' + (team.name ? _esc(team.name) : 'A shared team') + ' was shared with you';
      if (subEl) subEl.textContent = filled + ' pick' + (filled === 1 ? '' : 's') +
        (names.length ? ' · ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) + ' more' : '') : '');
      banner.style.display = '';
      setTimeout(function() { banner.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
    }

    window.myteamImportShared = function(merge) {
      if (!_pendingSharedTeam) return;
      var slots = JSON.parse(JSON.stringify(_pendingSharedTeam.slots || {}));
      if (merge) {
        var cur = _ballotLoad();
        for (var k in cur) { if (cur[k] && !slots[k]) slots[k] = cur[k]; }
      }
      // Keep a named copy under Saved Teams so the shared slate is never lost.
      var team = {
        id: _genTeamId(),
        name: (_pendingSharedTeam.name || 'Shared Team').slice(0, 60),
        slots: JSON.parse(JSON.stringify(_pendingSharedTeam.slots || {})),
        createdAt: Date.now(), updatedAt: Date.now()
      };
      var teams = _savedTeamsLoad();
      teams.unshift(team);
      _savedTeamsStore(teams);
      _cloudSaveTeam(team);
      _setActiveTeamId(team.id);
      _ballotSave(slots);
      _ballotRender();
      _flashSavedBadge();
      window.myteamDismissImport();
      _showShareToast('Team loaded into your ballot — also kept under Saved Teams.');
      var box = document.getElementById('myteam-summary-box');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.myteamDismissImport = function() {
      _pendingSharedTeam = null;
      var banner = document.getElementById('myteam-import-banner');
      if (banner) banner.style.display = 'none';
    };

    var _savedBadgeTimer = null;
    function _flashSavedBadge() {
      var badge = document.getElementById('myteam-saved-badge');
      if (!badge) return;
      var selections = _ballotLoad();
      var hasPicks = Object.keys(selections).length > 0;
      if (hasPicks) {
        badge.classList.add('visible');
        badge.textContent = '✓ Saved';
        badge.style.background = 'rgba(74,222,128,0.18)';
        badge.style.borderColor = 'rgba(74,222,128,0.4)';
        if (_savedBadgeTimer) clearTimeout(_savedBadgeTimer);
        _savedBadgeTimer = setTimeout(function() {
          badge.style.background = '';
          badge.style.borderColor = '';
        }, 1200);
      } else {
        badge.classList.add('visible');
        badge.textContent = '✓ Cleared';
        if (_savedBadgeTimer) clearTimeout(_savedBadgeTimer);
        _savedBadgeTimer = setTimeout(function() { badge.classList.remove('visible'); }, 1500);
      }
    }

    var _accountSaveTimer = null;
    function _showAccountSaveToast() {
      var toast = document.getElementById('account-save-toast');
      if (!toast) return;
      toast.classList.add('visible');
      if (_accountSaveTimer) clearTimeout(_accountSaveTimer);
      _accountSaveTimer = setTimeout(function() { toast.classList.remove('visible'); }, 2200);
    }
    window._showAccountSaveToast = _showAccountSaveToast;

    var _signinPromptTimer = null;
    function _showSigninPrompt() {
      var toast = document.getElementById('signin-prompt-toast');
      if (!toast) return;
      toast.classList.add('visible');
      if (_signinPromptTimer) clearTimeout(_signinPromptTimer);
      _signinPromptTimer = setTimeout(function() { toast.classList.remove('visible'); }, 5000);
    }
    window._hideSigninPrompt = function() {
      var toast = document.getElementById('signin-prompt-toast');
      if (toast) toast.classList.remove('visible');
      if (_signinPromptTimer) clearTimeout(_signinPromptTimer);
    };

    function _ballotInit() {
      if (typeof CMP_DATA === 'undefined') return;
      _ballotRender();

      // Surface any team shared via a ?team= link, once data is ready to resolve names.
      if (typeof _checkSharedTeamInUrl === 'function') _checkSharedTeamInUrl();

      window.addEventListener('storage', function(e) {
        if (e.key === BALLOT_KEY) {
          _ballotRender();
        } else if (e.key === SAVED_TEAMS_KEY || e.key === ACTIVE_TEAM_KEY) {
          _renderSavedTeams();
        }
      });

      // Auto-sync team and other user data from Firestore on page load once Auth is ready
      if (typeof _fbAuthReady !== 'undefined') {
        _fbAuthReady.then(function() {
          var user = typeof auth !== 'undefined' ? auth.currentUser : null;
          if (user) {
            console.log("⚡ Auto-syncing user team from Firestore on page load:", user.uid);
            if (typeof syncUserDataFromFirestore === 'function') {
              syncUserDataFromFirestore(user.uid);
            }
            // Pull any saved teams the member created on other devices.
            if (typeof _cloudFetchSavedTeams === 'function') _cloudFetchSavedTeams();
          }
        });
      }
    }

    window._vhBallotRerender = function() {
      BALLOT_RACES = _generateBallotRaces();
      _ballotRender();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _ballotInit);
    else _ballotInit();
  })();
  
