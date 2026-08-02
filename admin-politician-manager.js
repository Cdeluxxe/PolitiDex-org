// ─────────────────────────────────────────────────────────────────────────────
// Admin politician-manager controller
// ─────────────────────────────────────────────────────────────────────────────
// Extracted verbatim from index.html (it began at line 11304 of the pre-split
// document) as part of the first-paint pass. Not a rewrite: the code below is
// byte-for-byte what was inline, and the <script src> that replaced it sits at
// the same position in the document, so execution order and global scope are
// unchanged. It moved out so the HTML stops carrying it on every single visit —
// external scripts are cached and V8-code-cached across loads; inline script in
// a revalidated document is re-downloaded and re-compiled every time.
// ─────────────────────────────────────────────────────────────────────────────
    // ════════════════════════════════════════════════════════════
    // ADMIN: POLITICIAN MANAGER CONTROLLER
    //
    // Reads from the global PROFILES object (the live mirror of the
    // Firestore "politicians" collection loaded at page load) and writes
    // changes straight back to Firestore. Kept independent of the bulk
    // import flow so edits/deletes never go through the importer.
    // ════════════════════════════════════════════════════════════
    (function () {
      var _pmSelectedId = null;
      var _pmMode = 'view';     // 'view' | 'edit' | 'create'
      var _pmDupOnly = false;   // "Find Duplicates" view toggle
      var _pmDirty = false;     // unsaved edits in the open editor?

      // Friendly labels for known stance keys; unknown keys fall back to a
      // prettified version of the key itself.
      var PM_STANCE_LABELS = {
        border: 'Border Security',
        debt: 'Debt & Fiscal Policy',
        gun: 'Gun Rights & Safety',
        termLimits: 'Term Limits',
        campaign: 'Campaign Finance',
        dataCenters: 'Data Centers',
        healthcare: 'Healthcare',
        audit: 'Fed Audit'
      };

      // Constrained dropdown choices used by the editor.
      var PM_TIERS = [['gold', '🥇 Gold (headline)'], ['silver', '🥈 Silver'], ['gray', '⚪ Gray (standard)']];
      var PM_PARTIES = [['Republican', 'Republican'], ['Democrat', 'Democrat'], ['Independent', 'Independent'], ['Libertarian', 'Libertarian'], ['Nonpartisan', 'Nonpartisan']];

      // Office-type buckets — mirrors the classifier in _populateDirData so the
      // manager's "Office Type" filter lines up with the public directory.
      var PM_OFFICE_LABELS = {
        senate: 'U.S. Senate', house: 'U.S. House', governor: 'Governor',
        executive: 'Executive', state: 'State Legislature', local: 'Local / Mayor',
        candidate: 'Candidate', other: 'Other'
      };
      function _pmOfficeType(p) {
        var o = ((p && p.office) || '').replace(/^[^A-Za-z0-9]+/, '');
        if (/U\.S\.\s*Senator|^Senator/i.test(o)) return 'senate';
        if (/U\.S\.\s*Representative/i.test(o)) return 'house';
        if (/Governor/i.test(o)) return 'governor';
        if (/President|Secretary|Director/i.test(o)) return 'executive';
        if (/State\s*(Senator|Rep)|Speaker|Senate\s*President/i.test(o)) return 'state';
        if (/Mayor/i.test(o)) return 'local';
        if (/Candidate/i.test(o)) return 'candidate';
        return 'other';
      }
      // Collapse any party label/abbreviation to a stable filter key.
      function _pmPartyKey(v) {
        v = String(v == null ? '' : v).trim().toLowerCase();
        if (!v) return 'other';
        var c = v.charAt(0);
        if (c === 'r') return 'rep';
        if (c === 'd') return 'dem';
        if (c === 'i') return 'ind';
        return 'other';
      }
      // Normalize a name for duplicate matching (case/punctuation-insensitive).
      function _pmNormName(s) {
        return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      }

      // Canonicalize a state/location to a stable key so the SAME place written
      // different ways ("Utah" vs "UT" vs "utah, usa") collapses to one value.
      // Used by duplicate clustering + the live editor check so records that
      // only differ in how their state was typed still cluster together. Falls
      // back to the normalized free-text when the value isn't a known state.
      var PM_STATE_ABBR = {
        alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca',
        colorado: 'co', connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga',
        hawaii: 'hi', idaho: 'id', illinois: 'il', indiana: 'in', iowa: 'ia',
        kansas: 'ks', kentucky: 'ky', louisiana: 'la', maine: 'me', maryland: 'md',
        massachusetts: 'ma', michigan: 'mi', minnesota: 'mn', mississippi: 'ms', missouri: 'mo',
        montana: 'mt', nebraska: 'ne', nevada: 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
        'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', ohio: 'oh',
        oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
        'south dakota': 'sd', tennessee: 'tn', texas: 'tx', utah: 'ut', vermont: 'vt',
        virginia: 'va', washington: 'wa', 'west virginia': 'wv', wisconsin: 'wi', wyoming: 'wy',
        'district of columbia': 'dc', 'washington dc': 'dc', 'washington d c': 'dc'
      };
      var PM_STATE_ABBR_SET = (function () {
        var s = {};
        for (var k in PM_STATE_ABBR) { if (Object.prototype.hasOwnProperty.call(PM_STATE_ABBR, k)) s[PM_STATE_ABBR[k]] = 1; }
        return s;
      })();
      function _pmCanonState(s) {
        var norm = _pmNormName(s);
        if (!norm) return '';
        // Drop a trailing country tag like "utah usa" -> "utah".
        norm = norm.replace(/\s+(usa|us|united states|u s a|u s)$/,'').trim();
        if (Object.prototype.hasOwnProperty.call(PM_STATE_ABBR, norm)) return PM_STATE_ABBR[norm];
        if (PM_STATE_ABBR_SET[norm]) return norm; // already a 2-letter code
        return norm; // unknown place — fall back to its normalized text
      }

      // ── Name intelligence: nicknames + fuzzy matching ───────────────
      // Powers the smarter list search and the potential-duplicate flagging.
      // Common given-name ↔ nickname pairs so a search for "Jen" finds
      // "Jennifer" and duplicate detection treats "Mike"/"Michael" as the same
      // person. Lowercase; expanded into a token→group lookup below. A single
      // nickname can belong to several formal names (e.g. "al" → Albert/Alfred/
      // Alexander), so each token carries the SET of names it could stand for.
      var PM_NICKNAMES_RAW = {
        jennifer: ['jen', 'jenny', 'jenn', 'jenna'], michael: ['mike', 'mikey', 'mick'],
        william: ['will', 'bill', 'billy', 'willy', 'liam'], robert: ['rob', 'bob', 'bobby', 'robbie'],
        richard: ['rich', 'rick', 'ricky', 'dick', 'richie'], elizabeth: ['liz', 'beth', 'betty', 'eliza', 'lizzie', 'libby'],
        katherine: ['kate', 'katie', 'kathy', 'kat', 'katharine', 'catherine', 'cathy'], margaret: ['maggie', 'meg', 'peggy', 'marge', 'greta'],
        james: ['jim', 'jimmy', 'jamie'], john: ['johnny', 'jack', 'jon'], joseph: ['joe', 'joey'],
        charles: ['charlie', 'chuck', 'chas'], thomas: ['tom', 'tommy'], christopher: ['chris', 'topher'],
        daniel: ['dan', 'danny'], matthew: ['matt', 'matty'], anthony: ['tony'], david: ['dave', 'davey'],
        edward: ['ed', 'eddie', 'ted', 'teddy', 'ned'], nicholas: ['nick', 'nicky'], benjamin: ['ben', 'benny', 'benji'],
        samuel: ['sam', 'sammy'], alexander: ['alex', 'al', 'xander', 'sandy'], andrew: ['andy', 'drew'],
        patricia: ['pat', 'patty', 'tricia', 'trish'], patrick: ['pat', 'paddy', 'rick'],
        deborah: ['deb', 'debbie', 'debra'], susan: ['sue', 'susie', 'suzy', 'suzanne'], barbara: ['barb', 'babs'],
        jessica: ['jess', 'jessie'], rebecca: ['becca', 'becky', 'reba'], stephanie: ['steph', 'steffi'],
        steven: ['steve', 'stevie'], stephen: ['steve', 'stevie'], ronald: ['ron', 'ronnie'], donald: ['don', 'donnie'],
        gerald: ['gerry', 'jerry'], theodore: ['ted', 'teddy', 'theo'], timothy: ['tim', 'timmy'],
        gregory: ['greg', 'gregg'], jonathan: ['jon', 'jonny', 'nathan'], nathaniel: ['nate', 'nathan'],
        zachary: ['zach', 'zack'], vincent: ['vince', 'vinny'], lawrence: ['larry', 'lars'], raymond: ['ray'],
        francis: ['frank', 'frankie', 'fran'], frances: ['fran', 'frankie'], frederick: ['fred', 'freddie', 'fritz'],
        eleanor: ['ellie', 'nell', 'nora'], victoria: ['vicky', 'tori', 'vic'], cynthia: ['cindy', 'cyndi'],
        kimberly: ['kim'], pamela: ['pam'], sandra: ['sandy'], abigail: ['abby', 'gail'], amanda: ['mandy'],
        caroline: ['carol', 'carrie'], cassandra: ['cassie', 'cass'], gabriel: ['gabe'], isabella: ['bella', 'izzy'],
        joshua: ['josh'], kenneth: ['ken', 'kenny'], philip: ['phil'], phillip: ['phil'], walter: ['walt'],
        douglas: ['doug'], martin: ['marty'], albert: ['al', 'bert', 'albie'], alfred: ['al', 'fred', 'freddie'],
        manuel: ['manny'], leonard: ['leo', 'len', 'lenny'], bradley: ['brad'], bernard: ['bernie', 'bern'],
        clifford: ['cliff'], russell: ['russ', 'rusty'], terence: ['terry'], terrence: ['terry'], maxwell: ['max'],
        peter: ['pete'], ralph: ['ralphie'], howard: ['howie'], dennis: ['denny'], harold: ['harry', 'hal'],
        henry: ['hank', 'harry'], george: ['georgie'], lewis: ['lew'], louis: ['lou', 'louie'],
        roger: ['rog'], antonio: ['tony'], salvatore: ['sal'], gerardo: ['gerry'], cornelius: ['neil', 'con'],
        wesley: ['wes'], chester: ['chet'], augustus: ['gus'], reginald: ['reggie'], herbert: ['herb', 'bert'],
        marion: ['mary'], rosemary: ['rose', 'rosie'], dorothy: ['dot', 'dottie'], virginia: ['ginny', 'ginger'],
        florence: ['flo'], gloria: ['glory'], beatrice: ['bea'], priscilla: ['cilla'], penelope: ['penny'],
        veronica: ['ronnie', 'vera'], theresa: ['terry', 'tess'], teresa: ['terry', 'tess'], josephine: ['jo', 'josie'],
        clarence: ['clancy'], everett: ['rhett'], solomon: ['sol'], nathan: ['nate']
      };
      // token -> { groupName: 1, ... }. Each formal name is its own group; every
      // nickname joins the groups of the formal names that list it.
      var PM_NICK_GROUPS = (function () {
        var m = {};
        function add(tok, group) { (m[tok] = m[tok] || {})[group] = 1; }
        for (var formal in PM_NICKNAMES_RAW) {
          if (!Object.prototype.hasOwnProperty.call(PM_NICKNAMES_RAW, formal)) continue;
          add(formal, formal);
          PM_NICKNAMES_RAW[formal].forEach(function (nick) { add(nick, formal); });
        }
        return m;
      })();
      // True when two given-name tokens are the same name or known nicknames of
      // each other (their nickname groups overlap).
      function _pmTokenAlias(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        var ga = PM_NICK_GROUPS[a], gb = PM_NICK_GROUPS[b];
        if (!ga || !gb) return false;
        for (var k in ga) { if (gb[k]) return true; }
        return false;
      }
      // Levenshtein edit distance — bounded use only (short name tokens), so the
      // simple two-row implementation is plenty fast.
      function _pmLev(a, b) {
        a = String(a); b = String(b);
        if (a === b) return 0;
        var la = a.length, lb = b.length;
        if (!la) return lb;
        if (!lb) return la;
        var prev = [], i, j;
        for (j = 0; j <= lb; j++) prev[j] = j;
        for (i = 1; i <= la; i++) {
          var cur = [i];
          for (j = 1; j <= lb; j++) {
            var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
          }
          prev = cur;
        }
        return prev[lb];
      }
      // Fuzzy single-token match: identical, nickname alias, prefix (≥3 chars,
      // so "rich"→"richard", "jen"→"jennifer"), or within a small typo budget
      // scaled to the shorter token.
      function _pmTokenMatch(qt, nt) {
        if (!qt || !nt) return false;
        if (qt === nt) return true;
        if (_pmTokenAlias(qt, nt)) return true;
        if (qt.length >= 3 && nt.indexOf(qt) === 0) return true;
        if (nt.length >= 3 && qt.indexOf(nt) === 0) return true;
        var shorter = Math.min(qt.length, nt.length);
        if (shorter >= 4 && _pmLev(qt, nt) <= (shorter >= 7 ? 2 : 1)) return true;
        return false;
      }
      // Smarter list search: a query matches a record when the whole query is a
      // substring of its full text (keeps phrase / office / state search), or
      // when EVERY query token matches a name token (fuzzy/nickname-aware) or
      // appears in the record's office/state/party/ID text.
      function _pmListMatch(q, p, id) {
        q = String(q == null ? '' : q).trim().toLowerCase();
        if (!q) return true;
        // Add the canonical state code so a search for the full name finds
        // records that store the abbreviation (and vice versa): "utah" ↔ "ut".
        var stateCanon = _pmCanonState(p.state);
        var fullHay = [(p.name || ''), (p.office || ''), (p.state || ''), stateCanon, (p.district || ''), (p.party || ''), id].join(' ').toLowerCase();
        if (fullHay.indexOf(q) !== -1) return true;
        var nameTokens = _pmNormName(p.name).split(' ').filter(Boolean);
        var metaHay = [(p.office || ''), (p.state || ''), stateCanon, (p.district || ''), (p.party || ''), id].join(' ').toLowerCase();
        var qTokens = q.replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
        if (!qTokens.length) return false;
        return qTokens.every(function (qt) {
          for (var i = 0; i < nameTokens.length; i++) {
            if (_pmTokenMatch(qt, nameTokens[i])) return true;
          }
          if (metaHay.indexOf(qt) !== -1) return true;
          if (stateCanon && _pmCanonState(qt) === stateCanon) return true;
          return false;
        });
      }
      // Decide whether two full names likely refer to the same person: the
      // surnames must match (exact or near, allowing a typo) and the first names
      // must match directly, via a known nickname, by initial, or by prefix.
      // Tolerant of middle names/initials. Used for potential-duplicate flagging.
      function _pmNamesSimilar(a, b) {
        var ta = _pmNormName(a).split(' ').filter(Boolean);
        var tb = _pmNormName(b).split(' ').filter(Boolean);
        if (!ta.length || !tb.length) return false;
        if (ta.join(' ') === tb.join(' ')) return true;
        var firstA = ta[0], lastA = ta[ta.length - 1];
        var firstB = tb[0], lastB = tb[tb.length - 1];
        // Surnames must line up first (the strongest signal).
        if (!_pmTokenMatch(lastA, lastB)) return false;
        // Then the first names, via any reasonable equivalence.
        if (firstA === firstB) return true;
        if (_pmTokenAlias(firstA, firstB)) return true;
        if (firstA.length === 1 || firstB.length === 1) return firstA.charAt(0) === firstB.charAt(0);
        if (firstA.length >= 3 && firstB.indexOf(firstA) === 0) return true;
        if (firstB.length >= 3 && firstA.indexOf(firstB) === 0) return true;
        if (Math.min(firstA.length, firstB.length) >= 4 && _pmLev(firstA, firstB) <= 1) return true;
        return false;
      }

      function _pmEsc(s) {
        s = (s == null ? '' : String(s));
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      function _pmEscAttr(s) {
        return _pmEsc(s).replace(/"/g, '&quot;');
      }
      // ids are cleaned to [a-z0-9_] on import, but escape defensively so the
      // generated onclick handlers can never break out of their quotes.
      function _pmJs(s) {
        return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      }
      function _pmPretty(key) {
        return String(key)
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
      }

      // A stance value is "placeholder" (i.e. not real content) when it's blank,
      // says nothing, or is one of the generic seeds used by the importer.
      function _pmIsPlaceholderStance(v) {
        if (v == null) return true;
        var t = String(v).trim().toLowerCase();
        if (!t) return true;
        if (t === 'no stated position') return true;
        if (t.indexOf('stance on ') === 0) return true;
        return false;
      }

      // A record is a "stub" when it has no real, human-entered content:
      // no bio, no key issues, and no non-placeholder stances. An explicit
      // admin override (profileStatus = 'full' | 'stub') always wins, so an
      // admin can force a record's classification from the quick actions.
      function _pmIsStub(p) {
        if (!p) return true;
        if (p.profileStatus === 'stub') return true;
        if (p.profileStatus === 'full') return false;
        if (p.bio && String(p.bio).trim()) return false;
        if (Array.isArray(p.keyIssues) && p.keyIssues.length) return false;
        if (p.stances && typeof p.stances === 'object') {
          for (var k in p.stances) {
            if (Object.prototype.hasOwnProperty.call(p.stances, k) &&
                !_pmIsPlaceholderStance(p.stances[k])) {
              return false;
            }
          }
        }
        return true;
      }

      // True when an admin has pinned the FULL/STUB classification by hand.
      function _pmStatusOverridden(p) {
        return !!(p && (p.profileStatus === 'full' || p.profileStatus === 'stub'));
      }

      function _pmStatusBadge(p) {
        var dot = _pmStatusOverridden(p)
          ? '<span title="Status set manually by an admin" aria-hidden="true" class="ml-1 opacity-80">📌</span>'
          : '';
        if (_pmIsStub(p)) {
          return '<span class="flex-shrink-0 font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-1 rounded-full text-amber-300 bg-amber-500/10 border border-amber-500/40">Stub' + dot + '</span>';
        }
        return '<span class="flex-shrink-0 font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-1 rounded-full text-green-300 bg-green-500/10 border border-green-500/40">Full' + dot + '</span>';
      }

      // Small colored party chip for the list rows.
      function _pmPartyBadge(party) {
        var key = _pmPartyKey(party);
        if (!party || !String(party).trim()) return '';
        var cls = 'text-steel-300 bg-white/5 border-white/15';
        if (key === 'rep') cls = 'text-red-300 bg-red-500/10 border-red-500/30';
        else if (key === 'dem') cls = 'text-blue-300 bg-blue-500/10 border-blue-500/30';
        else if (key === 'ind') cls = 'text-purple-300 bg-purple-500/10 border-purple-500/30';
        var abbr = String(party).trim().charAt(0).toUpperCase();
        return '<span title="' + _pmEscAttr(party) + '" class="flex-shrink-0 font-condensed text-[10px] font-700 tracking-widest uppercase w-5 h-5 inline-flex items-center justify-center rounded-full border ' + cls + '">' + _pmEsc(abbr) + '</span>';
      }

      function _pmAll() {
        var out = [];
        if (typeof PROFILES === 'object' && PROFILES) {
          for (var id in PROFILES) {
            if (Object.prototype.hasOwnProperty.call(PROFILES, id)) {
              out.push({ id: id, p: PROFILES[id] || {} });
            }
          }
        }
        out.sort(function (a, b) {
          var an = (a.p.name || a.id).toLowerCase();
          var bn = (b.p.name || b.id).toLowerCase();
          return an < bn ? -1 : (an > bn ? 1 : 0);
        });
        return out;
      }

      // Cluster records into possible-duplicate groups. Two records are linked
      // when their names normalize identically (always a duplicate), OR their
      // names are similar (nickname/typo-aware) AND they share the same office
      // type and state — the classic "same person, slightly different record"
      // case the importer tends to create. Returns { ids, members, count,
      // groups } where ids maps a record id to its cluster key.
      //
      // Re-runs on every list render (each search keystroke), so the result is
      // memoized against a cheap signature of the underlying name/office/state
      // data and only recomputed when that data actually changes.
      var _pmDupCache = null, _pmDupSig = '';
      function _pmDuplicateInfo() {
        var rows = _pmAll();
        var n = rows.length;
        var sigParts = [];
        for (var s = 0; s < n; s++) {
          var sp = rows[s].p;
          sigParts.push(rows[s].id + '|' + (sp.name || '') + '|' + (sp.office || '') + '|' + (sp.state || ''));
        }
        var sig = n + '#' + sigParts.join('~');
        if (_pmDupCache && _pmDupSig === sig) return _pmDupCache;

        // Union-find over record indices.
        var parent = [];
        for (var i = 0; i < n; i++) parent[i] = i;
        function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
        function union(a, b) { var ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

        // 1) Exact normalized-name matches always link (true duplicates).
        var exact = {};
        for (var i2 = 0; i2 < n; i2++) {
          var key = _pmNormName(rows[i2].p.name || rows[i2].id);
          if (!key) continue;
          if (key in exact) union(exact[key], i2); else exact[key] = i2;
        }
        // 2) Potential duplicates: bucket by state so the similarity comparison
        //    stays cheap, then link similar names that also share an office type.
        //    Records with no state are skipped here (handled by step 1 only) to
        //    avoid false positives across unrelated stub records.
        var byState = {};
        for (var i3 = 0; i3 < n; i3++) {
          var st = _pmCanonState(rows[i3].p.state);
          if (!st) continue;
          (byState[st] = byState[st] || []).push(i3);
        }
        for (var stKey in byState) {
          var grp = byState[stKey];
          for (var a = 0; a < grp.length; a++) {
            for (var b = a + 1; b < grp.length; b++) {
              var ia = grp[a], ib = grp[b];
              if (find(ia) === find(ib)) continue;
              if (_pmOfficeType(rows[ia].p) !== _pmOfficeType(rows[ib].p)) continue;
              if (_pmNamesSimilar(rows[ia].p.name, rows[ib].p.name)) union(ia, ib);
            }
          }
        }
        // Collect clusters with 2+ members; key by the root index.
        var clusters = {};
        for (var i4 = 0; i4 < n; i4++) {
          var r = find(i4);
          (clusters[r] = clusters[r] || []).push(rows[i4].id);
        }
        var ids = {}, members = {}, groups = 0;
        for (var rk in clusters) {
          if (clusters[rk].length > 1) {
            groups++;
            members[rk] = clusters[rk].slice();
            clusters[rk].forEach(function (id) { ids[id] = rk; });
          }
        }
        _pmDupSig = sig;
        _pmDupCache = { ids: ids, members: members, count: Object.keys(ids).length, groups: groups };
        return _pmDupCache;
      }

      // Write a record to Firestore and keep the in-memory mirrors + directory
      // in sync. Shared by save, create, and the quick-action buttons.
      function _pmPersist(id, merged, okMsg, after) {
        return db.collection('politicians').doc(id).set(merged).then(function () {
          PROFILES[id] = merged;
          if (typeof CMP_DATA !== 'undefined') { CMP_DATA[id] = merged; }
          // The just-saved object is the complete document — mark it full so the
          // medium/full modals render it directly instead of lazy re-fetching.
          if (window._pdxFullIds) window._pdxFullIds.add(id);
          if (window._pdxFullPending) delete window._pdxFullPending[id];
          if (typeof _populateDirData === 'function') { _populateDirData(); }
          window.pmRenderList();
          if (okMsg && typeof window._showToast === 'function') { window._showToast(okMsg); }
          if (typeof after === 'function') { after(); }
        }).catch(function (error) {
          console.error('Politician Manager write failed:', error);
          _pmFeedback('Save failed: ' + (error && error.message ? error.message : 'unknown error'), 'error');
        });
      }

      // Rebuild the State filter <option>s from whatever states are present,
      // preserving the current selection. Skips work when nothing changed.
      function _pmSyncStateFilter(all) {
        var sel = document.getElementById('pm-filter-state');
        if (!sel) return;
        var states = {};
        all.forEach(function (r) { var s = (r.p.state || '').trim(); if (s) states[s] = 1; });
        var sorted = Object.keys(states).sort();
        var sig = sorted.join('|');
        if (sel.getAttribute('data-sig') === sig) return;
        sel.setAttribute('data-sig', sig);
        var cur = sel.value || 'all';
        sel.innerHTML = '<option value="all">All states</option>' + sorted.map(function (s) {
          return '<option value="' + _pmEscAttr(s) + '">' + _pmEsc(s) + '</option>';
        }).join('');
        sel.value = (cur === 'all' || states[cur]) ? cur : 'all';
      }

      function _pmFilterVal(id, fallback) {
        var el = document.getElementById(id);
        return el ? el.value : fallback;
      }

      // ════════════════════════════════════════════════════════════
      // DATABASE COVERAGE / MISSING POLITICIANS
      //
      // Answers "what's missing?" rather than "what's here?". Utah is the
      // priority: its legislative chambers and statewide offices are tracked
      // seat-by-seat against the known number of seats, so the admin can see
      // exactly which districts still have no profile and start a pre-filled
      // record in one click. A broader by-state / by-office breakdown surfaces
      // weaker-coverage areas elsewhere.
      // ════════════════════════════════════════════════════════════

      // Known Utah seat counts (2022 redistricting): 75 House districts,
      // 29 Senate districts, 4 U.S. House districts, 2 U.S. Senate seats.
      var PM_UTAH_CHAMBERS = [
        { key: 'state-house',  label: 'Utah State House',     total: 75, hasDistricts: true },
        { key: 'state-senate', label: 'Utah State Senate',    total: 29, hasDistricts: true },
        { key: 'us-house',     label: 'U.S. House — Utah',    total: 4,  hasDistricts: true },
        { key: 'us-senate',    label: 'U.S. Senate — Utah',   total: 2,  hasDistricts: false }
      ];
      // Statewide constitutional / executive offices (one holder each).
      var PM_UTAH_STATEWIDE = [
        { key: 'governor',         label: 'Governor' },
        { key: 'lt-governor',      label: 'Lieutenant Governor' },
        { key: 'attorney-general', label: 'Attorney General' },
        { key: 'state-auditor',    label: 'State Auditor' },
        { key: 'state-treasurer',  label: 'State Treasurer' }
      ];
      var PM_UTAH_SEAT_TOTAL = PM_UTAH_CHAMBERS.reduce(function (s, c) { return s + c.total; }, 0);

      // True for any record whose state reads as Utah, tolerating the "UT"
      // abbreviation (and stray punctuation/case) the live data mixes in.
      function _pmIsUtah(s) {
        // The live roster stores Utah in several shapes. Beyond the clean "Utah"
        // / "UT", the data has accumulated location-tagged forms over time —
        // "Utah · District 16 (Provo)", "Salt Lake City, Utah", "Utah · UT-03",
        // "Salt Lake County, Utah". Matching only the bare values silently
        // dropped ~35 genuine Utah records (sitting legislators including the
        // House Speaker and Senate President, two U.S. Reps, and several mayors)
        // from the Utah totals AND from seat coverage, making the dashboard read
        // far thinner than the database actually is. No other U.S. state name
        // contains the token "utah", so keying on it stays specific to Utah.
        var n = _pmNormName(s);
        if (!n) return false;
        if (n === 'utah' || n === 'ut') return true;
        return /(?:^|\s)utah(?:\s|$)/.test(n);
      }

      // Classify a Utah record into one of the tracked chambers / statewide
      // offices (returns null for anything that doesn't map). Order matters:
      // the most specific U.S. patterns are tested before the state ones.
      // Both the office string and the district label are considered, since
      // the live data sometimes carries the chamber hint in only one of them
      // (e.g. office "Representative" + district "Utah House District 12").
      function _pmUtahChamber(p) {
        var o = String((p && p.office) || '');
        var t = o + '  ' + String((p && p.district) || '');
        // Federal offices first — never let "U.S. Representative" read as a
        // state seat.
        if (/\bU\.?\s*S\.?\s*Senator|United\s+States\s+Senator|\bU\.?\s*S\.?\s*Senate\b/i.test(t)) return 'us-senate';
        if (/\bU\.?\s*S\.?\s*(Rep|Congress)|United\s+States\s+Rep|Congress(?:man|woman|member|ional)|\bCD[-\s.#]?\d/i.test(t)) return 'us-house';
        if (/Lieutenant\s+Governor|Lt\.?\s*Governor/i.test(o)) return 'lt-governor';
        if (/Attorney\s+General/i.test(o)) return 'attorney-general';
        if (/State\s+Auditor/i.test(o)) return 'state-auditor';
        if (/(State\s+)?Treasurer/i.test(o)) return 'state-treasurer';
        if (/Governor/i.test(o)) return 'governor';
        if (/State\s*Sen|Senate\s*(President|Minority|Majority)|Utah\s+(State\s+)?Senate|Senate\s*Dist|\bSD[-\s.#]?\d/i.test(t)) return 'state-senate';
        if (/State\s*(Rep|House)|House\s*(Speaker|Minority|Majority)|Speaker\s+of\s+the\s+House|Utah\s+(State\s+)?House|House\s+of\s+Rep|House\s*Dist|\bHD[-\s.#]?\d|Assembly(?:man|woman|member)?|\bRepresentative\b/i.test(t)) return 'state-house';
        return null;
      }

      // Pull a district number out of a record's district/office text. The
      // live data is messy, so this tries a sequence of patterns from most
      // specific to least, accepting every common shorthand:
      //   "District 6", "Dist. 6", "Dist 6", "District 06", "#6",
      //   "HD 6" / "SD 12" / "CD-4" / "LD 6" (chamber-prefixed),
      //   "D6" / "D-6" / "D. 6", "6th", and a bare "6".
      // A trailing word boundary after the captured digits keeps it from
      // grabbing the first three digits of a year (e.g. "elected 2024").
      function _pmDistrictNum(p) {
        var dist = String((p && p.district) || '');
        var off  = String((p && p.office) || '');
        // District field first so its number wins over any stray number in
        // the office string.
        var hay = dist + '  ' + off;
        var m;
        // "District 6" / "Dist. 6" / "Dist 6" / "District 06" / "#6"
        m = hay.match(/(?:dist(?:rict)?s?\.?|#)\s*#?\s*0*(\d{1,3})\b/i);
        if (m) return parseInt(m[1], 10);
        // Chamber-prefixed initials: HD/SD/CD/LD with optional separators.
        m = hay.match(/\b[HSCL]\.?\s*D\.?\s*[-#]?\s*0*(\d{1,3})\b/i);
        if (m) return parseInt(m[1], 10);
        // Lone "D6" / "D-6" / "D. 6".
        m = hay.match(/\bD\.?\s*-?\s*0*(\d{1,3})\b/i);
        if (m) return parseInt(m[1], 10);
        // Ordinal "6th".
        m = hay.match(/\b0*(\d{1,3})(?:st|nd|rd|th)\b/i);
        if (m) return parseInt(m[1], 10);
        // Bare standalone number — only trusted from the dedicated district
        // field, where an unlabeled number almost always IS the district.
        m = dist.match(/\b0*(\d{1,3})\b/);
        if (m && parseInt(m[1], 10) > 0) return parseInt(m[1], 10);
        return null;
      }

      // The one canonical, human-readable form every district value is cleaned
      // into: "District 6" (no leading zeros, no abbreviations). The number is
      // what coverage actually keys on; the "District " prefix keeps the field
      // self-describing when an admin opens the record. Returns '' for a null
      // number so callers never fabricate a district where none was found.
      function _pmCanonicalDistrict(num) {
        return (num == null) ? '' : ('District ' + num);
      }

      // Classify a single Utah district-chamber record's district situation,
      // so coverage and the standardizer agree on what's clean, what's
      // out-of-range, and what genuinely needs a human. Returns:
      //   { num, canonical, status }  status ∈ 'ok' | 'out-of-range' | 'none'
      function _pmDistrictStatus(p, chamber) {
        var num = _pmDistrictNum(p);
        if (num == null) return { num: null, canonical: '', status: 'none' };
        if (chamber && chamber.total && (num < 1 || num > chamber.total)) {
          return { num: num, canonical: _pmCanonicalDistrict(num), status: 'out-of-range' };
        }
        return { num: num, canonical: _pmCanonicalDistrict(num), status: 'ok' };
      }

      // Build the Utah seat map: per chamber, which district numbers are filled
      // (and by which record ids), which records couldn't be matched to a
      // district, and which statewide offices are held.
      function _pmUtahCoverage() {
        var seats = {};
        PM_UTAH_CHAMBERS.forEach(function (c) { seats[c.key] = { mapped: {}, unmapped: [], review: [] }; });
        var statewide = {};
        PM_UTAH_STATEWIDE.forEach(function (s) { statewide[s.key] = []; });

        _pmAll().forEach(function (row) {
          if (!_pmIsUtah(row.p.state)) return;
          var ch = _pmUtahChamber(row.p);
          if (!ch) return;
          if (seats[ch]) {
            var bucket = seats[ch];
            var chamber = PM_UTAH_CHAMBERS.filter(function (c) { return c.key === ch; })[0];
            // No-district chamber (U.S. Senate): every matched record is a
            // valid holder — nothing to parse or review.
            if (!chamber || !chamber.hasDistricts) { bucket.unmapped.push(row.id); return; }
            // District chamber: place records in a real seat only when the
            // number is present AND in range. Anything else is surfaced for
            // review instead of being silently dropped or lumped elsewhere.
            var ds = _pmDistrictStatus(row.p, chamber);
            if (ds.status === 'ok') {
              (bucket.mapped[ds.num] = bucket.mapped[ds.num] || []).push(row.id);
            } else {
              bucket.review.push({
                id: row.id,
                name: row.p.name || row.id,
                district: String(row.p.district == null ? '' : row.p.district),
                num: ds.num,
                reason: ds.status // 'none' | 'out-of-range'
              });
            }
          } else if (statewide[ch]) {
            statewide[ch].push(row.id);
          }
        });
        return { seats: seats, statewide: statewide };
      }

      // Office string + district label for a missing seat, used to pre-fill a
      // brand-new record when the admin clicks a missing-seat chip.
      function _pmSeatPrefill(key, num) {
        var pre = { state: 'Utah', icon: '🏛', tier: 'gray' };
        if (key === 'state-house')      { pre.office = 'State Representative (Dist. ' + num + ')'; pre.district = 'District ' + num; }
        else if (key === 'state-senate'){ pre.office = 'State Senator (Dist. ' + num + ')';       pre.district = 'District ' + num; }
        else if (key === 'us-house')    { pre.office = 'U.S. Representative (Dist. ' + num + ')';  pre.district = 'District ' + num; }
        else if (key === 'us-senate')   { pre.office = 'U.S. Senator'; }
        else {
          var sw = PM_UTAH_STATEWIDE.filter(function (s) { return s.key === key; })[0];
          pre.office = sw ? sw.label : '';
        }
        return pre;
      }
      // Open a pre-filled New Politician editor for a specific empty seat.
      window.pmCreateNewSeat = function (key, num) {
        window.pmCreateNew(_pmSeatPrefill(key, num));
      };

      // ── Expose the Utah seat-coverage helpers to the global scope ──
      // These functions/tables live inside this IIFE, but the Database
      // Coverage dashboard's updateExpansionStats() is defined further down the
      // page OUTSIDE this closure. Without this bridge its
      // `typeof _pmUtahCoverage === 'function'` guard fails, the seat map comes
      // back null, and the Federal / Statewide / State Senate / State House
      // bars are stuck at 0 no matter what's in Firestore. Publishing the same
      // (live-PROFILES-backed) helpers lets the dashboard derive every
      // legislative category from real data. Closures keep their private
      // helpers (_pmAll, _pmNormName, _pmDistrictNum…) so behavior is identical.
      window._pmUtahCoverage  = _pmUtahCoverage;
      window._pmUtahChamber   = _pmUtahChamber;
      window._pmIsUtah        = _pmIsUtah;
      window.PM_UTAH_CHAMBERS = PM_UTAH_CHAMBERS;
      window.PM_UTAH_STATEWIDE = PM_UTAH_STATEWIDE;

      // Aggregate coverage by state and by office type — the broad view that
      // exposes thin coverage outside the Utah seat map.
      function _pmCoverageBreakdown() {
        var byState = {}, byOffice = {};
        _pmAll().forEach(function (row) {
          var p = row.p, stub = _pmIsStub(p);
          var st = (p.state || '').trim() || '— No state —';
          var s = byState[st] = byState[st] || { total: 0, full: 0, stub: 0 };
          s.total++; stub ? s.stub++ : s.full++;
          var ot = _pmOfficeType(p);
          var o = byOffice[ot] = byOffice[ot] || { total: 0, full: 0, stub: 0 };
          o.total++; stub ? o.stub++ : o.full++;
        });
        return { byState: byState, byOffice: byOffice };
      }

      // Small colored progress bar (green ≥80%, amber ≥40%, crimson below).
      function _pmCovBar(pct) {
        var color = pct >= 80 ? 'bg-green-500' : (pct >= 40 ? 'bg-amber-500' : 'bg-crimson-500');
        return '<div class="h-2 rounded-full bg-navy-950 overflow-hidden border border-white/5">' +
          '<div class="h-full rounded-full ' + color + '" style="width:' + Math.max(2, Math.min(100, pct)) + '%"></div></div>';
      }

      // Render one Utah chamber card: filled/total, a progress bar, and (for
      // district chambers) a wrapped grid of clickable missing-seat chips.
      function _pmCovChamberCard(chamber, bucket, dupGroups) {
        var filledSeats, missing = [], multi = 0;
        if (chamber.hasDistricts) {
          for (var d = 1; d <= chamber.total; d++) {
            var recs = bucket.mapped[d];
            if (recs && recs.length) { if (recs.length > 1) multi++; }
            else missing.push(d);
          }
          filledSeats = chamber.total - missing.length;
        } else {
          // No-district chamber (U.S. Senate): count distinct records, capped.
          var held = bucket.unmapped.length + Object.keys(bucket.mapped).length;
          filledSeats = Math.min(held, chamber.total);
        }
        var pct = chamber.total ? Math.round((filledSeats / chamber.total) * 100) : 0;
        var review = chamber.hasDistricts ? bucket.review.length : 0;

        var html = '<div class="bg-navy-900/60 border border-white/10 rounded-xl p-4">' +
          '<div class="flex items-baseline justify-between gap-2 mb-1.5">' +
            '<div class="font-condensed text-sm font-700 tracking-wide text-white">' + _pmEsc(chamber.label) + '</div>' +
            '<div class="font-condensed text-xs font-700 tracking-widest uppercase ' + (pct >= 80 ? 'text-green-300' : (pct >= 40 ? 'text-amber-300' : 'text-crimson-300')) + '">' +
              filledSeats + ' / ' + chamber.total + ' <span class="text-steel-500">(' + pct + '%)</span></div>' +
          '</div>' +
          _pmCovBar(pct);

        if (chamber.hasDistricts) {
          if (missing.length) {
            var chips = missing.map(function (n) {
              return '<button type="button" onclick="window.pmCreateNewSeat(\'' + chamber.key + '\',' + n + ')" ' +
                'title="No profile for District ' + n + ' — click to add one" ' +
                'class="inline-flex items-center justify-center min-w-[2.1rem] px-1.5 py-1 rounded-md bg-navy-950 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/15 text-sky-300 hover:text-white font-mono text-xs transition-all">' + n + '</button>';
            }).join('');
            html += '<div class="mt-2.5">' +
              '<div class="font-condensed text-[10px] font-700 tracking-widest uppercase text-sky-300/80 mb-1.5">' +
                missing.length + ' missing district' + (missing.length === 1 ? '' : 's') + ' · click to add</div>' +
              '<div class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">' + chips + '</div>' +
            '</div>';
          } else {
            html += '<div class="mt-2.5 text-xs font-body text-green-300/90">✓ Every district has at least one profile.</div>';
          }
          if (multi) {
            html += '<div class="mt-2 text-[11px] font-body text-amber-300/80">⚠️ ' + multi + ' district' + (multi === 1 ? '' : 's') + ' with more than one record — possible duplicates.</div>';
          }
        } else if (filledSeats < chamber.total) {
          html += '<div class="mt-2.5 text-xs font-body text-sky-300/90">' +
            (chamber.total - filledSeats) + ' seat' + ((chamber.total - filledSeats) === 1 ? '' : 's') + ' unfilled — ' +
            '<button type="button" onclick="window.pmCreateNewSeat(\'' + chamber.key + '\',0)" class="underline decoration-sky-400/50 hover:decoration-sky-300 hover:text-white">add a U.S. Senator</button></div>';
        } else {
          html += '<div class="mt-2.5 text-xs font-body text-green-300/90">✓ Both seats covered.</div>';
        }
        if (review) {
          html += '<div class="mt-1.5 text-[11px] font-body text-amber-300/80">⚠️ ' + review + ' record' + (review === 1 ? '' : 's') +
            ' need review — chamber matches but the district is missing or out of range. See “Needs Review” below.</div>';
        }
        html += '</div>';
        return html;
      }

      // Render the full coverage panel body AND keep the toolbar "Utah seats"
      // chip current. Cheap enough to run on every list render; the heavy DOM
      // build is skipped while the panel is closed.
      window.pmRenderCoverage = function () {
        var cov = _pmUtahCoverage();

        // Toolbar chip: total Utah seats filled across the four chambers.
        var filledTotal = 0;
        PM_UTAH_CHAMBERS.forEach(function (c) {
          var b = cov.seats[c.key];
          if (c.hasDistricts) {
            var f = 0;
            for (var d = 1; d <= c.total; d++) { if (b.mapped[d] && b.mapped[d].length) f++; }
            filledTotal += f;
          } else {
            filledTotal += Math.min(b.unmapped.length + Object.keys(b.mapped).length, c.total);
          }
        });
        var chip = document.getElementById('pm-count-utah-seats');
        if (chip) chip.textContent = filledTotal + '/' + PM_UTAH_SEAT_TOTAL;

        var panel = document.getElementById('pm-coverage-panel');
        var body = document.getElementById('pm-coverage-body');
        if (!body || !panel || panel.classList.contains('hidden')) return;

        var dup = _pmDuplicateInfo();

        // ── Headline: overall database totals ──
        var all = _pmAll();
        var fullN = 0; all.forEach(function (r) { _pmIsStub(r.p) ? 0 : fullN++; });
        var stubN = all.length - fullN;
        var utahN = all.filter(function (r) { return _pmIsUtah(r.p.state); }).length;
        var headline = '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5">' +
          [['Total profiles', all.length, 'text-white'],
           ['Full', fullN, 'text-green-300'],
           ['Stubs', stubN, 'text-amber-300'],
           ['Utah profiles', utahN, 'text-sky-300'],
           ['Possible dupes', dup.count, 'text-amber-300']].map(function (c) {
            return '<div class="bg-navy-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-center">' +
              '<div class="font-display text-2xl ' + c[2] + '">' + c[1] + '</div>' +
              '<div class="font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-400 mt-0.5">' + c[0] + '</div></div>';
          }).join('') + '</div>';

        // ── Utah legislative + congressional seat cards ──
        var cards = PM_UTAH_CHAMBERS.map(function (c) {
          return _pmCovChamberCard(c, cov.seats[c.key], dup.groups);
        }).join('');
        var seatSection = '<div>' +
          '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200 mb-2.5">🏛 Utah Seat Coverage</div>' +
          '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + cards + '</div></div>';

        // ── Needs Review / Unassigned ──
        // Utah legislators whose chamber is clear but whose district can't be
        // trusted (blank, unparseable, or out of range). Previously these
        // vanished into a grey footnote or were mistaken for statewide records;
        // now each is listed and one click opens it in the editor to fix.
        var reviewRows = [];
        PM_UTAH_CHAMBERS.forEach(function (c) {
          if (!c.hasDistricts) return;
          (cov.seats[c.key].review || []).forEach(function (r) {
            reviewRows.push({ chamberLabel: c.label, total: c.total, r: r });
          });
        });
        var reviewSection = '';
        if (reviewRows.length) {
          var reviewItems = reviewRows.map(function (x) {
            var raw = x.r.district ? '“' + _pmEsc(x.r.district) + '”' : '(blank)';
            var why = x.r.reason === 'out-of-range'
              ? ('district ' + x.r.num + ' is outside 1–' + x.total)
              : 'no district number found';
            return '<button type="button" onclick="window.pmToggleCoverage(false); window.pmSelect(\'' + _pmJs(x.r.id) + '\')" ' +
              'title="Open ' + _pmEscAttr(x.r.name) + ' to set a district" ' +
              'class="flex items-center justify-between gap-3 w-full text-left px-3 py-2 rounded-lg bg-navy-950/70 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 transition-all">' +
              '<span class="min-w-0"><span class="font-body text-sm text-white truncate">' + _pmEsc(x.r.name) + '</span>' +
                '<span class="block font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-400">' + _pmEsc(x.chamberLabel) + ' · ' + why + '</span></span>' +
              '<span class="flex-shrink-0 font-mono text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/20 rounded px-1.5 py-0.5">' + raw + '</span>' +
            '</button>';
          }).join('');
          reviewSection = '<div>' +
            '<div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">' +
              '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-amber-200">⚠️ Needs Review / Unassigned</div>' +
              '<div class="flex items-center gap-2">' +
                '<button type="button" onclick="window.pmBulkAssign && window.pmBulkAssign()" ' +
                  'class="inline-flex items-center gap-1.5 bg-sky-600/80 hover:bg-sky-500 text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-2.5 py-1.5 rounded-md transition-all">📍 Bulk assign all ' + reviewRows.length + '</button>' +
                '<span class="font-condensed text-[10px] font-700 tracking-widest uppercase text-amber-300/80">' + reviewRows.length + ' record' + (reviewRows.length === 1 ? '' : 's') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="text-[11px] font-body text-steel-300 mb-2.5 max-w-3xl leading-relaxed">These Utah legislators map to a chamber but have no usable district. They are <strong>not</strong> counted as filled seats and are kept out of the statewide totals. Click <span class="text-sky-300 font-semibold">📍 Bulk assign</span> to open a fast worklist — filter, group similar names, type numbers, and save in batches — use “Standardize Districts” to auto-clean the records that already carry a number, or click a record to set its district by hand.</div>' +
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">' + reviewItems + '</div></div>';
        }

        // ── Utah statewide executive offices ──
        var swChips = PM_UTAH_STATEWIDE.map(function (s) {
          var held = cov.statewide[s.key].length;
          if (held) {
            return '<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/40 text-green-200 font-condensed text-xs font-700 tracking-wide">' +
              '<span aria-hidden="true">✓</span> ' + _pmEsc(s.label) + '</span>';
          }
          return '<button type="button" onclick="window.pmCreateNewSeat(\'' + s.key + '\',0)" ' +
            'title="No profile for ' + _pmEscAttr(s.label) + ' — click to add one" ' +
            'class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-950 border border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/15 text-sky-300 hover:text-white font-condensed text-xs font-700 tracking-wide transition-all">' +
            '<span aria-hidden="true">＋</span> ' + _pmEsc(s.label) + '</button>';
        }).join('');
        var swSection = '<div>' +
          '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200 mb-2.5">🏷 Utah Statewide Offices</div>' +
          '<div class="flex flex-wrap gap-2">' + swChips + '</div></div>';

        // ── Broad breakdown: by state + by office type ──
        var bd = _pmCoverageBreakdown();
        var stateRows = Object.keys(bd.byState).map(function (k) { return [k, bd.byState[k]]; });
        // Pin Utah first, then sort the rest by total descending.
        stateRows.sort(function (a, b) {
          var au = _pmNormName(a[0]) === 'utah', bu = _pmNormName(b[0]) === 'utah';
          if (au !== bu) return au ? -1 : 1;
          return b[1].total - a[1].total;
        });
        function _covTable(title, rows, isState) {
          var body = rows.slice(0, 14).map(function (r) {
            var label = isState ? r[0] : (PM_OFFICE_LABELS[r[0]] || _pmPretty(r[0]));
            var v = r[1];
            var pct = v.total ? Math.round((v.full / v.total) * 100) : 0;
            var hl = isState && _pmNormName(r[0]) === 'utah';
            return '<tr class="' + (hl ? 'bg-sky-500/10' : '') + '">' +
              '<td class="py-1.5 pr-3 ' + (hl ? 'text-sky-200 font-700' : 'text-steel-200') + '">' + _pmEsc(label) + (hl ? ' ⭐' : '') + '</td>' +
              '<td class="py-1.5 px-2 text-right text-white font-700">' + v.total + '</td>' +
              '<td class="py-1.5 px-2 text-right text-green-300">' + v.full + '</td>' +
              '<td class="py-1.5 px-2 text-right text-amber-300">' + v.stub + '</td>' +
              '<td class="py-1.5 pl-2 w-24"><div class="flex items-center gap-1.5"><div class="flex-1">' + _pmCovBar(pct) + '</div><span class="text-[10px] text-steel-400 w-7 text-right">' + pct + '%</span></div></td>' +
            '</tr>';
          }).join('');
          return '<div class="bg-navy-900/40 border border-white/10 rounded-xl p-3 overflow-x-auto">' +
            '<div class="font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-300 mb-1.5">' + title + '</div>' +
            '<table class="w-full text-xs font-body border-collapse">' +
              '<thead><tr class="text-steel-500 font-condensed text-[10px] tracking-widest uppercase">' +
                '<th class="text-left font-700 pb-1">' + (isState ? 'State' : 'Office Type') + '</th>' +
                '<th class="text-right font-700 pb-1 px-2">All</th>' +
                '<th class="text-right font-700 pb-1 px-2">Full</th>' +
                '<th class="text-right font-700 pb-1 px-2">Stub</th>' +
                '<th class="text-left font-700 pb-1 pl-2">% Full</th>' +
              '</tr></thead><tbody>' + body + '</tbody></table>' +
            (rows.length > 14 ? '<div class="text-[11px] text-steel-500 mt-1.5">…and ' + (rows.length - 14) + ' more</div>' : '') +
          '</div>';
        }
        var officeRows = Object.keys(bd.byOffice).map(function (k) { return [k, bd.byOffice[k]]; });
        officeRows.sort(function (a, b) { return b[1].total - a[1].total; });
        var breakdown = '<div>' +
          '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200 mb-2.5">🌎 Coverage Breakdown</div>' +
          '<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">' +
            _covTable('By State (Utah pinned)', stateRows, true) +
            _covTable('By Office Type', officeRows, false) +
          '</div></div>';

        var dupCallout = dup.count
          ? '<div class="bg-amber-950/30 border border-amber-500/30 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">' +
              '<div class="text-amber-100 font-body text-sm"><span aria-hidden="true">⚠️</span> <strong>' + dup.count + '</strong> record' + (dup.count === 1 ? '' : 's') +
                ' across <strong>' + dup.groups + '</strong> group' + (dup.groups === 1 ? '' : 's') + ' look like possible duplicates.</div>' +
              '<button type="button" onclick="window.pmToggleCoverage(false); window.pmReviewDupes && window.pmReviewDupes();" ' +
                'class="inline-flex items-center gap-1.5 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-100 hover:text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all">' +
                '🔎 Review duplicates</button>' +
            '</div>'
          : '';

        body.innerHTML = headline + seatSection + reviewSection + swSection + dupCallout + breakdown;
      };

      // ── Standardize Districts ────────────────────────────────────
      // One-click cleanup that rewrites every Utah legislator's `district`
      // field into the single canonical "District N" form. It is deliberately
      // conservative and reversible-by-hand:
      //   • Only Utah records in a district-based chamber are considered.
      //   • Only the `district` field is written (plus updatedAt). No other
      //     field — name, office, promises, sources — is ever touched.
      //   • Records whose number can't be parsed are LEFT ALONE (never given a
      //     fabricated district); they stay in the "Needs Review" list for a
      //     human to resolve.
      //   • Records already in canonical form are skipped, so re-running is a
      //     no-op.
      // First click previews the exact from→to changes; the preview's confirm
      // button commits them to Firestore in batched writes.
      function _pmDistrictPlan() {
        var plan = [];
        _pmAll().forEach(function (row) {
          if (!_pmIsUtah(row.p.state)) return;
          var ch = _pmUtahChamber(row.p);
          if (!ch) return;
          var chamber = PM_UTAH_CHAMBERS.filter(function (c) { return c.key === ch; })[0];
          if (!chamber || !chamber.hasDistricts) return;
          var num = _pmDistrictNum(row.p);
          if (num == null) {
            // Recover obvious non-numeric forms (spelled-out ordinal or roman
            // numeral) so "District Six" or "District IV" get cleaned too. Both
            // helpers stay anchored to a district keyword, so ordinary free text
            // can never be mistaken for a district.
            var loose = _pmLooseDistrictNum(row.p);
            if (loose && loose.num >= 1 && loose.num <= chamber.total) num = loose.num;
          }
          if (num == null) return;                       // genuinely unparseable — leave for manual review
          if (num < 1 || num > chamber.total) return;    // out of range — leave for a human, never fabricate
          var canonical = _pmCanonicalDistrict(num);
          var current = String(row.p.district == null ? '' : row.p.district);
          if (current !== canonical) {
            plan.push({ id: row.id, name: row.p.name || row.id, from: current, to: canonical });
          }
        });
        return plan;
      }

      function _pmStdResultEl() { return document.getElementById('pm-standardize-result'); }

      window.pmStandardizeDistricts = function (confirmed) {
        var el = _pmStdResultEl();
        if (!el) return;
        if (!confirmed && typeof window.pmBulkCancel === 'function') { window.pmBulkCancel(); } // keep one preview open at a time
        var plan = _pmDistrictPlan();
        el.classList.remove('hidden');

        if (!plan.length) {
          el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-green-200 bg-green-950/30 border-green-500/40';
          el.innerHTML = '<span aria-hidden="true">✓</span> Every Utah legislator already has a standardized district — nothing to clean.';
          return;
        }

        // ── Preview step ──
        if (!confirmed) {
          var rows = plan.slice(0, 60).map(function (x) {
            var from = x.from ? '“' + _pmEsc(x.from) + '”' : '(blank)';
            return '<tr class="border-t border-white/5">' +
              '<td class="py-1 pr-3 text-steel-200">' + _pmEsc(x.name) + '</td>' +
              '<td class="py-1 px-2 text-amber-200/90 font-mono text-[11px]">' + from + '</td>' +
              '<td class="py-1 pl-2 text-green-200 font-mono text-[11px]">“' + _pmEsc(x.to) + '”</td>' +
            '</tr>';
          }).join('');
          el.className = 'mb-4 rounded-xl px-4 py-3 border text-sky-100 bg-navy-900/70 border-sky-500/40';
          el.innerHTML =
            '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200 mb-2">' +
              '🧹 ' + plan.length + ' district' + (plan.length === 1 ? '' : 's') + ' will be standardized</div>' +
            '<div class="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-white/5"><table class="w-full text-xs font-body border-collapse">' +
              '<thead><tr class="text-steel-500 font-condensed text-[10px] tracking-widest uppercase sticky top-0 bg-navy-950">' +
                '<th class="text-left font-700 py-1.5 pr-3">Record</th>' +
                '<th class="text-left font-700 py-1.5 px-2">Current</th>' +
                '<th class="text-left font-700 py-1.5 pl-2">Standardized</th>' +
              '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
            (plan.length > 60 ? '<div class="text-[11px] text-steel-500 mt-1.5">…and ' + (plan.length - 60) + ' more</div>' : '') +
            '<div class="flex flex-wrap gap-2 mt-3">' +
              '<button type="button" onclick="window.pmStandardizeDistricts(true)" ' +
                'class="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">' +
                '<span aria-hidden="true">✓</span> Apply ' + plan.length + ' change' + (plan.length === 1 ? '' : 's') + '</button>' +
              '<button type="button" onclick="window.pmStandardizeCancel()" ' +
                'class="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">Cancel</button>' +
            '</div>';
          return;
        }

        // ── Commit step: batched Firestore writes, district field only ──
        el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-sky-100 bg-navy-900/70 border-sky-500/40';
        el.innerHTML = '<span aria-hidden="true">⏳</span> Standardizing ' + plan.length + ' district' + (plan.length === 1 ? '' : 's') + '…';

        var chunks = [];
        for (var i = 0; i < plan.length; i += 400) chunks.push(plan.slice(i, i + 400));
        var stamp = new Date().toISOString();
        var written = 0;

        function commitChunk(idx) {
          if (idx >= chunks.length) { finish(); return; }
          var batch = db.batch();
          chunks[idx].forEach(function (item) {
            batch.update(db.collection('politicians').doc(item.id), { district: item.to, updatedAt: stamp });
          });
          batch.commit().then(function () {
            chunks[idx].forEach(function (item) {
              if (PROFILES[item.id]) { PROFILES[item.id].district = item.to; PROFILES[item.id].updatedAt = stamp; }
              if (typeof CMP_DATA !== 'undefined' && CMP_DATA[item.id]) { CMP_DATA[item.id].district = item.to; }
              written++;
            });
            commitChunk(idx + 1);
          }).catch(function (error) {
            console.error('Standardize Districts batch failed:', error);
            el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-red-200 bg-red-950/40 border-red-500/40';
            el.innerHTML = '<span aria-hidden="true">✕</span> Write failed after ' + written + ' update' + (written === 1 ? '' : 's') +
              ': ' + _pmEsc(error && error.message ? error.message : 'unknown error') + '. Already-written changes are saved; you can safely re-run to finish the rest.';
          });
        }

        function finish() {
          if (typeof _populateDirData === 'function') { _populateDirData(); }
          window.pmRenderList(); // refreshes the coverage panel with new numbers
          if (typeof window._showToast === 'function') { window._showToast('Standardized ' + written + ' district' + (written === 1 ? '' : 's') + ' ✓'); }
          el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-green-200 bg-green-950/30 border-green-500/40';
          el.innerHTML = '<span aria-hidden="true">✓</span> Standardized <strong>' + written + '</strong> district field' + (written === 1 ? '' : 's') +
            '. Coverage numbers above now reflect the cleaned data.';
        }

        commitChunk(0);
      };

      window.pmStandardizeCancel = function () {
        var el = _pmStdResultEl();
        if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
      };

      // ── Bulk District Assignment ─────────────────────────────────
      // The standardizer above only cleans districts that are already present
      // in some shorthand; it deliberately leaves alone every record with no
      // usable district number. On the Utah data that "Needs Review /
      // Unassigned" pile runs past a hundred records, and assigning each by hand
      // — open the editor, type, save, repeat — is the slow part.
      //
      // This panel makes that fast and practical. It lists every review record
      // with a chamber filter, grouping (cluster similar names so split or
      // duplicate records sit together), a per-row district-number box, and
      // checkboxes. The admin can type numbers down the list and save them all
      // in one batch, or tick a group and assign one district to all of them.
      // Every save shows a from→to preview first and only the `district` field
      // is written, so real data is never overwritten without an explicit
      // confirm. The spelled-out-number helpers below are shared with the
      // improved standardizer above.

      var PM_ORDINAL_WORDS = {
        first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
        eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
        fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
        eighteenth: 18, nineteenth: 19, twentieth: 20, 'twenty-first': 21,
        'twenty-second': 22, 'twenty-third': 23, 'twenty-fourth': 24,
        'twenty-fifth': 25, 'twenty-sixth': 26, 'twenty-seventh': 27,
        'twenty-eighth': 28, 'twenty-ninth': 29
      };

      // Parse a roman numeral, returning 0 unless the string is BOTH composed
      // only of i/v/x/l AND well-formed (so "vv", "iiii", "lll", "ill" are
      // rejected rather than silently yielding a bogus number). Validity is
      // checked by re-encoding the value and requiring an exact round-trip.
      function _pmRoman(s) {
        var map = { i: 1, v: 5, x: 10, l: 50 }, total = 0, prev = 0;
        for (var i = s.length - 1; i >= 0; i--) {
          var c = map[s.charAt(i)];
          if (!c) return 0;
          if (c < prev) total -= c; else { total += c; prev = c; }
        }
        if (total < 1 || total > 89) return 0;
        var vals = [[50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
        var out = '', r = total;
        vals.forEach(function (pair) { while (r >= pair[0]) { out += pair[1]; r -= pair[0]; } });
        return (out === s) ? total : 0;
      }

      // Recover a district number the *strict* parser intentionally ignores, so
      // we never silently change how coverage reads but can still rescue obvious
      // cases. Both branches are ANCHORED to a "district" keyword: an ordinal or
      // roman numeral only counts when it is actually qualifying a district, so
      // ordinary free text ("first elected", "second term", "third party") and
      // incidental numbers (suite/room/age) can never be mistaken for one.
      // Returns { num, kind } with kind 'ordinal' | 'roman'.
      function _pmLooseDistrictNum(p) {
        var hay = (String((p && p.district) || '') + ' ' + String((p && p.office) || '')).toLowerCase();
        // Spelled-out ordinal sitting next to "district" (either order). Longest
        // words first so a compound ordinal ("twenty-first") wins over its
        // suffix ("first").
        var words = Object.keys(PM_ORDINAL_WORDS).sort(function (a, b) { return b.length - a.length; });
        var qual = '(?:house|senate|legislative|congressional)\\s+';
        for (var i = 0; i < words.length; i++) {
          var w = words[i].replace(/-/g, '\\-');
          var re = new RegExp(
            '\\b' + w + '\\b[\\s,]*(?:' + qual + ')?district\\b' +      // "twenty-first (house) district"
            '|\\bdistrict\\b[\\s,]*(?:the\\s+)?' + w + '\\b');           // "district, the twenty-first"
          if (re.test(hay)) return { num: PM_ORDINAL_WORDS[words[i]], kind: 'ordinal' };
        }
        // Roman numeral directly after a "district"/"dist." keyword.
        var rm = hay.match(/\bdist(?:rict)?\.?\s+([ivxl]{1,6})\b/);
        if (rm) { var rv = _pmRoman(rm[1]); if (rv > 0) return { num: rv, kind: 'roman' }; }
        return null;
      }

      // Collect every Utah review record across the district chambers, paired
      // with its chamber, exactly as the coverage panel buckets them.
      function _pmReviewRecords() {
        var cov = _pmUtahCoverage(), out = [];
        PM_UTAH_CHAMBERS.forEach(function (c) {
          if (!c.hasDistricts) return;
          (cov.seats[c.key].review || []).forEach(function (r) {
            if (PROFILES[r.id]) out.push({ id: r.id, p: PROFILES[r.id], chamber: c, raw: r.district, reason: r.reason });
          });
        });
        return out;
      }

      // Live working set for the bulk-assignment panel: a map of review-record
      // id → { id, name, chamberKey, chamberLabel, total, raw, reason, office,
      // num, checked } plus the active filter/group controls. Rebuilt when the
      // panel opens; mutated in place as the admin types numbers, checks rows,
      // and changes filters. `num` is the district the admin intends to write
      // for that row (null until typed/assigned). Nothing is ever saved without
      // an explicit confirm.
      var _pmBulkState = null;

      function _pmBulkResultEl() { return document.getElementById('pm-bulk-result'); }

      // Stable display order for the chambers in the filter and grouped list.
      function _pmBulkChamberRank(key) {
        for (var i = 0; i < PM_UTAH_CHAMBERS.length; i++) { if (PM_UTAH_CHAMBERS[i].key === key) return i; }
        return 99;
      }

      // Build the working set from the live review pile and render the panel.
      window.pmBulkAssign = function () {
        var el = _pmBulkResultEl();
        if (!el) return;
        window.pmStandardizeCancel(); // never two previews open at once
        el.classList.remove('hidden');

        var records = _pmReviewRecords();
        if (!records.length) {
          el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-green-200 bg-green-950/30 border-green-500/40';
          el.innerHTML = '<span aria-hidden="true">✓</span> No Utah legislators are awaiting a district — the review pile is empty.';
          _pmBulkState = null;
          return;
        }

        _pmBulkState = { filterChamber: 'all', search: '', sort: 'chamber', recs: {} };
        records.forEach(function (rec) {
          _pmBulkState.recs[rec.id] = {
            id: rec.id,
            name: rec.p.name || rec.id,
            chamberKey: rec.chamber.key,
            chamberLabel: rec.chamber.label,
            total: rec.chamber.total,
            raw: rec.raw,
            reason: rec.reason,
            office: rec.p.office || '',
            num: null,
            checked: false
          };
        });
        _pmRenderBulkPanel();
      };

      // Every review record as a flat array (unfiltered).
      function _pmBulkAll() {
        if (!_pmBulkState) return [];
        return Object.keys(_pmBulkState.recs).map(function (k) { return _pmBulkState.recs[k]; });
      }

      // The records currently visible given the chamber filter and the search
      // box, ordered by the chosen grouping. Each record is tagged with a
      // transient `_grp` (and, for the "similar" grouping, `_grpSize`) that the
      // renderer uses to draw section separators.
      function _pmBulkVisible() {
        if (!_pmBulkState) return [];
        var fc = _pmBulkState.filterChamber;
        var q = (_pmBulkState.search || '').trim().toLowerCase();
        var list = _pmBulkAll().filter(function (r) {
          if (fc !== 'all' && r.chamberKey !== fc) return false;
          if (q) {
            var hay = (r.name + ' ' + (r.raw || '') + ' ' + (r.office || '') + ' ' + r.chamberLabel).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
          }
          return true;
        });

        if (_pmBulkState.sort === 'similar') return _pmBulkClusterOrder(list);

        if (_pmBulkState.sort === 'current') {
          list.forEach(function (r) { r._grp = ''; });
          list.sort(function (a, b) {
            var ar = a.raw || '~', br = b.raw || '~';
            if (ar !== br) return ar < br ? -1 : 1;
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
          });
          return list;
        }

        // Default: group by chamber, then name within the chamber.
        list.forEach(function (r) { r._grp = r.chamberKey; });
        list.sort(function (a, b) {
          if (a.chamberKey !== b.chamberKey) return _pmBulkChamberRank(a.chamberKey) - _pmBulkChamberRank(b.chamberKey);
          return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
        return list;
      }

      // Cluster the visible records by name similarity within a chamber (the
      // classic split/duplicate record), float the multi-record clusters to the
      // top so the actionable groups are obvious, then list the unique names. A
      // record carries `_grp` (its cluster id) and `_grpSize` for the renderer.
      function _pmBulkClusterOrder(list) {
        var n = list.length, parent = [];
        for (var i = 0; i < n; i++) parent[i] = i;
        function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
        for (var a = 0; a < n; a++) {
          for (var b = a + 1; b < n; b++) {
            if (list[a].chamberKey !== list[b].chamberKey) continue;
            if (find(a) === find(b)) continue;
            if (_pmNamesSimilar(list[a].name, list[b].name)) parent[find(a)] = find(b);
          }
        }
        var clusters = {};
        for (var k = 0; k < n; k++) { var r = find(k); (clusters[r] = clusters[r] || []).push(list[k]); }
        var groups = Object.keys(clusters).map(function (key) { return clusters[key]; });
        groups.forEach(function (g) {
          g.sort(function (x, y) { return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1; });
        });
        groups.sort(function (g1, g2) {
          if (g1.length !== g2.length) return g2.length - g1.length;   // bigger clusters first
          return g1[0].name.toLowerCase() < g2[0].name.toLowerCase() ? -1 : 1;
        });
        var out = [], ci = 0;
        groups.forEach(function (g) {
          if (g.length > 1) { var key = 'c' + (ci++); g.forEach(function (rr) { rr._grp = key; rr._grpSize = g.length; out.push(rr); }); }
        });
        groups.forEach(function (g) {
          if (g.length === 1) { g.forEach(function (rr) { rr._grp = 'single'; rr._grpSize = 1; out.push(rr); }); }
        });
        return out;
      }

      // Render the whole panel shell: title, controls, action bar, info, and an
      // empty list container that _pmRenderBulkList fills. Called when the panel
      // first opens or after a save; filter/search/sort changes refresh only the
      // list region so the search box keeps focus.
      function _pmRenderBulkPanel() {
        var el = _pmBulkResultEl();
        if (!el || !_pmBulkState) return;

        var total = _pmBulkAll().length;
        var chamberOpts = ['<option value="all">All chambers</option>'].concat(
          PM_UTAH_CHAMBERS.filter(function (c) { return c.hasDistricts; }).map(function (c) {
            return '<option value="' + c.key + '"' + (_pmBulkState.filterChamber === c.key ? ' selected' : '') + '>' + _pmEsc(c.label) + '</option>';
          })
        ).join('');

        function sortOpt(v, label) {
          return '<option value="' + v + '"' + (_pmBulkState.sort === v ? ' selected' : '') + '>' + label + '</option>';
        }
        var groupSel = '<select onchange="window.pmBulkSort(this.value)" ' +
          'class="bg-navy-950 border border-white/10 focus:border-sky-400/70 rounded-lg px-2.5 py-1.5 text-xs text-steel-200 font-condensed tracking-wide outline-none">' +
            sortOpt('chamber', 'Group: by chamber') +
            sortOpt('similar', 'Group: similar names') +
            sortOpt('current', 'Group: current value') +
        '</select>';

        var header =
          '<div class="flex flex-wrap items-center justify-between gap-2 mb-3">' +
            '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200">' +
              '📍 Bulk District Assignment · ' + total + ' record' + (total === 1 ? '' : 's') + '</div>' +
            '<button type="button" onclick="window.pmBulkCancel()" ' +
              'class="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all">Close</button>' +
          '</div>';

        var controls =
          '<div class="flex flex-wrap items-center gap-2 mb-3">' +
            '<select onchange="window.pmBulkFilterChamber(this.value)" ' +
              'class="bg-navy-950 border border-white/10 focus:border-sky-400/70 rounded-lg px-2.5 py-1.5 text-xs text-steel-200 font-condensed tracking-wide outline-none">' + chamberOpts + '</select>' +
            groupSel +
            '<div class="relative flex-1 min-w-[12rem]">' +
              '<span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-steel-500 text-xs" aria-hidden="true">🔍</span>' +
              '<input id="pm-bulk-search" type="text" value="' + _pmEscAttr(_pmBulkState.search || '') + '" placeholder="Filter by name, current value, office…" oninput="window.pmBulkSearch(this.value)" autocomplete="off" ' +
                'class="w-full bg-navy-950 border border-white/10 focus:border-sky-400/70 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-steel-600 outline-none font-body">' +
            '</div>' +
          '</div>';

        var actionBar =
          '<div class="flex flex-wrap items-center gap-2 mb-3 bg-navy-950/60 border border-white/10 rounded-lg px-3 py-2.5">' +
            '<label class="font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-300">Assign District</label>' +
            '<input id="pm-bulk-num" type="number" min="1" placeholder="#" ' +
              'class="w-16 bg-navy-950 border border-white/15 focus:border-sky-400 rounded px-1.5 py-1 text-white font-mono text-xs text-center">' +
            '<button type="button" onclick="window.pmBulkAssignSelected()" ' +
              'class="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-3 py-2 rounded-lg transition-all">' +
              'Apply to selected (<span id="pm-bulk-sel-count">0</span>)</button>' +
            '<span class="text-steel-600">·</span>' +
            '<button type="button" onclick="window.pmBulkSaveTyped()" ' +
              'class="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-3 py-2 rounded-lg transition-all">' +
              '✓ Save all typed (<span id="pm-bulk-typed-count">0</span>)</button>' +
          '</div>';

        var info =
          '<div class="text-[11px] font-body text-steel-300 mb-3 max-w-3xl leading-relaxed">' +
            'Type a district number in any row, then <strong>Save all typed</strong> to write them in one batch — or tick several rows that share a district and <strong>Apply to selected</strong>. ' +
            'Group by <em>similar names</em> to cluster split/duplicate records together. Every save shows a from→to preview first; only the <code class="text-sky-300">district</code> field is written, and <strong>nothing is saved without your confirm</strong>. Use <strong>Open</strong> to edit a record in full.' +
          '</div>';

        el.className = 'mb-4 rounded-xl px-4 py-3 border text-sky-100 bg-navy-900/70 border-sky-500/40';
        el.innerHTML = header + controls + actionBar + info + '<div id="pm-bulk-list"></div>';
        _pmRenderBulkList();
      }

      // Render only the scrollable list (and refresh the action-bar live counts).
      // Separators are drawn between groups; their label depends on the grouping.
      function _pmRenderBulkList() {
        var wrap = document.getElementById('pm-bulk-list');
        if (!wrap || !_pmBulkState) return;
        var vis = _pmBulkVisible();

        var grpLabels = {};
        PM_UTAH_CHAMBERS.forEach(function (c) { grpLabels[c.key] = c.label; });

        var rowsHtml = '', lastGrp = null;
        vis.forEach(function (s) {
          if (s._grp !== lastGrp) {
            lastGrp = s._grp;
            var label = '';
            if (_pmBulkState.sort === 'chamber') {
              label = grpLabels[s._grp] || '';
            } else if (_pmBulkState.sort === 'similar') {
              label = (s._grpSize > 1) ? ('⚠ Similar names · ' + s._grpSize + ' records (possible split / duplicate)') : 'Unique names';
            }
            if (label) {
              rowsHtml += '<tr><td colspan="5" class="pt-3 pb-1"><span class="font-condensed text-[10px] font-700 tracking-widest uppercase ' +
                ((_pmBulkState.sort === 'similar' && s._grpSize > 1) ? 'text-amber-300' : 'text-sky-300/80') + '">' + _pmEsc(label) + '</span></td></tr>';
            }
          }
          var jid = _pmJs(s.id);
          var rawTxt = s.raw ? '“' + _pmEsc(s.raw) + '”' : '(blank)';
          var oor = s.reason === 'out-of-range';
          rowsHtml += '<tr class="border-t border-white/5 align-middle">' +
            '<td class="py-2 pr-2">' +
              '<input type="checkbox" ' + (s.checked ? 'checked ' : '') + 'onchange="window.pmBulkCheck(\'' + jid + '\', this.checked)" ' +
                'class="w-4 h-4 accent-sky-500 cursor-pointer" aria-label="Select ' + _pmEscAttr(s.name) + '"></td>' +
            '<td class="py-2 pr-3"><div class="font-body text-sm text-white">' + _pmEsc(s.name) + '</div>' +
              '<div class="font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-400">' + _pmEsc(s.chamberLabel) + '</div></td>' +
            '<td class="py-2 px-2 whitespace-nowrap"><span class="font-mono text-[11px] ' + (oor ? 'text-red-200 bg-red-950/40 border-red-500/30' : 'text-amber-200/90 bg-amber-950/30 border-amber-500/20') + ' border rounded px-1.5 py-0.5">' + rawTxt + '</span>' +
              (oor ? '<span class="block font-condensed text-[9px] font-700 tracking-widest uppercase text-red-300/80 mt-0.5">out of 1–' + s.total + '</span>' : '') + '</td>' +
            '<td class="py-2 px-2 whitespace-nowrap">' +
              '<input type="number" min="1" max="' + s.total + '" value="' + (s.num != null ? s.num : '') + '" placeholder="#" ' +
                'onchange="window.pmBulkSetNum(\'' + jid + '\', this.value)" ' +
                'class="w-16 bg-navy-950 border ' + (s.num != null ? 'border-green-500/60' : 'border-white/15') + ' focus:border-sky-400 rounded px-1.5 py-1 text-white font-mono text-[11px] text-center" ' +
                'title="District 1–' + s.total + '"></td>' +
            '<td class="py-2 pl-2 text-right whitespace-nowrap">' +
              (s.num != null ? '<button type="button" onclick="window.pmBulkSaveRow(\'' + jid + '\')" ' +
                'class="inline-flex items-center gap-1 bg-green-600/80 hover:bg-green-500 text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-2.5 py-1.5 rounded-md transition-all mr-1">✓ Save</button>' : '') +
              '<button type="button" onclick="window.pmToggleCoverage(false); window.pmSelect(\'' + jid + '\')" ' +
                'class="inline-flex items-center gap-1 bg-navy-800 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-2.5 py-1.5 rounded-md transition-all">Open</button>' +
            '</td>' +
          '</tr>';
        });

        var allChecked = vis.length && vis.every(function (s) { return s.checked; });
        var head =
          '<div class="flex items-center justify-between gap-2 mb-1.5">' +
            '<label class="inline-flex items-center gap-2 cursor-pointer font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-300">' +
              '<input type="checkbox" ' + (allChecked ? 'checked ' : '') + 'onchange="window.pmBulkSelectAll(this.checked)" class="w-4 h-4 accent-sky-500 cursor-pointer"> Select all shown</label>' +
            '<span class="font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-400">Showing ' + vis.length + ' of ' + _pmBulkAll().length + '</span>' +
          '</div>';

        if (!vis.length) {
          wrap.innerHTML = head + '<div class="text-center text-steel-400 font-body text-sm py-8">No records match this filter.</div>';
        } else {
          wrap.innerHTML = head +
            '<div class="overflow-x-auto max-h-[28rem] overflow-y-auto rounded-lg border border-white/5">' +
              '<table class="w-full text-xs font-body border-collapse">' +
                '<thead><tr class="text-steel-500 font-condensed text-[10px] tracking-widest uppercase sticky top-0 bg-navy-950 z-10">' +
                  '<th class="py-2 pr-2 w-8"></th>' +
                  '<th class="text-left font-700 py-2 pr-3">Politician</th>' +
                  '<th class="text-left font-700 py-2 px-2">Current</th>' +
                  '<th class="text-left font-700 py-2 px-2">District&nbsp;#</th>' +
                  '<th class="text-right font-700 py-2 pl-2">Action</th>' +
                '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
            '</div>';
        }

        // Keep the action-bar counters in sync with the staged state.
        var selCount = _pmBulkAll().filter(function (s) { return s.checked; }).length;
        var typedCount = _pmBulkAll().filter(function (s) { return s.num != null; }).length;
        var sc = document.getElementById('pm-bulk-sel-count'); if (sc) sc.textContent = selCount;
        var tc = document.getElementById('pm-bulk-typed-count'); if (tc) tc.textContent = typedCount;
      }

      window.pmBulkFilterChamber = function (v) { if (_pmBulkState) { _pmBulkState.filterChamber = v; _pmRenderBulkList(); } };
      window.pmBulkSort = function (v) { if (_pmBulkState) { _pmBulkState.sort = v; _pmRenderBulkList(); } };
      window.pmBulkSearch = function (v) { if (_pmBulkState) { _pmBulkState.search = v; _pmRenderBulkList(); } };

      window.pmBulkCheck = function (id, on) {
        if (_pmBulkState && _pmBulkState.recs[id]) { _pmBulkState.recs[id].checked = !!on; _pmRenderBulkList(); }
      };

      // Select-all toggles only the currently visible (filtered) rows.
      window.pmBulkSelectAll = function (on) {
        if (!_pmBulkState) return;
        _pmBulkVisible().forEach(function (s) { s.checked = !!on; });
        _pmRenderBulkList();
      };

      // Stage a per-row district number (clamped to the chamber range; a blank
      // clears it). This writes nothing — it only records the admin's intent. An
      // out-of-range entry is rejected with a visible note rather than silently
      // dropped, so the admin always knows the value didn't take.
      window.pmBulkSetNum = function (id, val) {
        if (!_pmBulkState || !_pmBulkState.recs[id]) return;
        var st = _pmBulkState.recs[id];
        var s = String(val == null ? '' : val).trim();
        if (!s) { st.num = null; }
        else {
          var n = parseInt(s, 10);
          if (!isNaN(n) && n >= 1 && n <= st.total) { st.num = n; }
          else { st.num = null; _pmBulkNote('“' + s + '” is not a valid district for ' + st.name + ' — enter 1–' + st.total + '.', 'warn'); }
        }
        _pmRenderBulkList();
      };

      // "Apply to selected": stage the action-bar number on every checked row,
      // then open the confirmation preview for those rows.
      window.pmBulkAssignSelected = function () {
        if (!_pmBulkState) return;
        var box = document.getElementById('pm-bulk-num');
        var n = box ? parseInt(box.value, 10) : NaN;
        var checked = _pmBulkAll().filter(function (s) { return s.checked; });
        if (!checked.length) { _pmBulkNote('Tick at least one row first, then Apply to selected.', 'warn'); return; }
        if (isNaN(n) || n < 1) { _pmBulkNote('Enter a district number to assign to the selected rows.', 'warn'); return; }
        var items = [];
        checked.forEach(function (s) {
          if (n >= 1 && n <= s.total) { s.num = n; items.push({ id: s.id, num: n }); }
        });
        if (!items.length) { _pmBulkNote('District ' + n + ' is out of range for every selected row.', 'warn'); return; }
        _pmBulkPreview(items);
      };

      // "Save all typed": preview every row that currently has a staged number.
      window.pmBulkSaveTyped = function () {
        if (!_pmBulkState) return;
        var items = _pmBulkAll().filter(function (s) { return s.num != null; }).map(function (s) { return { id: s.id, num: s.num }; });
        if (!items.length) { _pmBulkNote('Type a district number into at least one row first.', 'warn'); return; }
        _pmBulkPreview(items);
      };

      // Quick single-row save (still goes through the confirmation preview).
      window.pmBulkSaveRow = function (id) {
        if (!_pmBulkState || !_pmBulkState.recs[id] || _pmBulkState.recs[id].num == null) return;
        _pmBulkPreview([{ id: id, num: _pmBulkState.recs[id].num }]);
      };

      window.pmBulkCancel = function () {
        var el = _pmBulkResultEl();
        if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
        _pmBulkState = null;
        _pmBulkPending = null;
      };

      // A small inline notice pinned above the list for non-destructive hints.
      function _pmBulkNote(msg, kind) {
        var wrap = document.getElementById('pm-bulk-list');
        if (!wrap || !wrap.parentNode) return;
        var cls = kind === 'warn' ? 'text-amber-200 bg-amber-950/30 border-amber-500/40' : 'text-sky-200 bg-sky-950/30 border-sky-500/40';
        var note = document.getElementById('pm-bulk-note');
        if (!note) {
          note = document.createElement('div');
          note.id = 'pm-bulk-note';
          wrap.parentNode.insertBefore(note, wrap);
        }
        note.className = 'mb-2 text-[11px] font-body rounded-lg px-3 py-2 border ' + cls;
        note.textContent = msg;
      }

      // Rows pending a write, captured when the preview is shown so the confirm
      // button commits exactly what was previewed.
      var _pmBulkPending = null;

      // Confirmation preview shown before any write. Lists each record's current
      // value and the "District N" it will become, flags rows where a real
      // (out-of-range) number would be replaced, and only commits on the explicit
      // confirm click. Back returns to the editable panel.
      function _pmBulkPreview(items) {
        var el = _pmBulkResultEl();
        if (!el || !_pmBulkState) return;
        var rows = items.map(function (it) {
          var s = _pmBulkState.recs[it.id];
          if (!s) return null;
          var from = s.raw ? '“' + _pmEsc(s.raw) + '”' : '(blank)';
          var overwrite = s.reason === 'out-of-range';
          return '<tr class="border-t border-white/5">' +
            '<td class="py-1 pr-3 text-steel-200">' + _pmEsc(s.name) +
              '<div class="font-condensed text-[9px] font-700 tracking-widest uppercase text-steel-500">' + _pmEsc(s.chamberLabel) + '</div></td>' +
            '<td class="py-1 px-2 font-mono text-[11px] ' + (overwrite ? 'text-red-200' : 'text-amber-200/90') + '">' + from +
              (overwrite ? ' <span class="font-condensed text-[9px] tracking-widest uppercase">(real value)</span>' : '') + '</td>' +
            '<td class="py-1 pl-2 text-green-200 font-mono text-[11px]">“District ' + it.num + '”</td>' +
          '</tr>';
        }).filter(Boolean).join('');

        var overwrites = items.filter(function (it) { var s = _pmBulkState.recs[it.id]; return s && s.reason === 'out-of-range'; }).length;

        el.className = 'mb-4 rounded-xl px-4 py-3 border text-sky-100 bg-navy-900/70 border-sky-500/40';
        el.innerHTML =
          '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-sky-200 mb-2">' +
            '📍 Confirm ' + items.length + ' district assignment' + (items.length === 1 ? '' : 's') + '</div>' +
          (overwrites ? '<div class="mb-2 text-[11px] font-body text-red-200 bg-red-950/30 border border-red-500/40 rounded-lg px-3 py-2">' +
            '⚠️ ' + overwrites + ' record' + (overwrites === 1 ? '' : 's') + ' currently hold a real (out-of-range) district number that will be replaced. ' +
            'Review the “real value” rows below before confirming.</div>' : '') +
          '<div class="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-white/5"><table class="w-full text-xs font-body border-collapse">' +
            '<thead><tr class="text-steel-500 font-condensed text-[10px] tracking-widest uppercase sticky top-0 bg-navy-950">' +
              '<th class="text-left font-700 py-1.5 pr-3">Record</th>' +
              '<th class="text-left font-700 py-1.5 px-2">Current</th>' +
              '<th class="text-left font-700 py-1.5 pl-2">Will become</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div class="flex flex-wrap gap-2 mt-3">' +
            '<button type="button" onclick="window.pmBulkConfirm()" ' +
              'class="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">' +
              '✓ Confirm &amp; save ' + items.length + ' change' + (items.length === 1 ? '' : 's') + '</button>' +
            '<button type="button" onclick="window.pmBulkBack()" ' +
              'class="inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-[11px] font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">← Back</button>' +
          '</div>';

        _pmBulkPending = items;
      }

      window.pmBulkBack = function () { _pmBulkPending = null; if (_pmBulkState) _pmRenderBulkPanel(); };

      window.pmBulkConfirm = function () {
        if (_pmBulkPending && _pmBulkPending.length) _pmBulkCommit(_pmBulkPending);
      };

      // Commit staged assignments to Firestore in batches. Only the `district`
      // field (plus a light stamp marking it a manual bulk assignment) is
      // written — name, office, promises, everything else is left untouched.
      function _pmBulkCommit(items) {
        var el = _pmBulkResultEl();
        if (!el) return;
        items = (items || []).filter(function (it) { return it.num != null; });
        if (!items.length) return;

        el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-sky-100 bg-navy-900/70 border-sky-500/40';
        el.innerHTML = '<span aria-hidden="true">⏳</span> Saving ' + items.length + ' district assignment' + (items.length === 1 ? '' : 's') + '…';

        var stamp = new Date().toISOString();
        var chunks = [];
        for (var i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400));
        var written = 0;

        function commitChunk(idx) {
          if (idx >= chunks.length) { finish(); return; }
          var batch = db.batch();
          chunks[idx].forEach(function (it) {
            batch.update(db.collection('politicians').doc(it.id), {
              district: 'District ' + it.num,
              districtSource: 'bulk-manual',
              districtAssignedAt: stamp,
              updatedAt: stamp
            });
          });
          batch.commit().then(function () {
            chunks[idx].forEach(function (it) {
              var patch = { district: 'District ' + it.num, districtSource: 'bulk-manual', districtAssignedAt: stamp, updatedAt: stamp };
              if (PROFILES[it.id]) { for (var k in patch) PROFILES[it.id][k] = patch[k]; }
              if (typeof CMP_DATA !== 'undefined' && CMP_DATA[it.id]) { CMP_DATA[it.id].district = patch.district; }
              if (_pmBulkState && _pmBulkState.recs[it.id]) delete _pmBulkState.recs[it.id];
              written++;
            });
            commitChunk(idx + 1);
          }).catch(function (error) {
            console.error('Bulk district assignment batch failed:', error);
            el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-red-200 bg-red-950/40 border-red-500/40';
            el.innerHTML = '<span aria-hidden="true">✕</span> Save failed after ' + written + ' assignment' + (written === 1 ? '' : 's') +
              ': ' + _pmEsc(error && error.message ? error.message : 'unknown error') + '. Saved changes are kept; re-open to finish the rest.';
          });
        }

        function finish() {
          _pmBulkPending = null;
          if (typeof _populateDirData === 'function') { _populateDirData(); }
          window.pmRenderList();
          window.pmRenderCoverage();
          if (typeof window._showToast === 'function') { window._showToast('Assigned ' + written + ' district' + (written === 1 ? '' : 's') + ' ✓'); }
          // Re-render the panel over whatever still needs review.
          if (_pmBulkState && Object.keys(_pmBulkState.recs).length) {
            var left = Object.keys(_pmBulkState.recs).length;
            _pmRenderBulkPanel();
            _pmBulkNote('Saved ' + written + ' assignment' + (written === 1 ? '' : 's') + '. ' + left + ' record' + (left === 1 ? '' : 's') + ' still need a district.', 'info');
          } else {
            el.className = 'mb-4 text-sm font-body rounded-xl px-4 py-3 border text-green-200 bg-green-950/30 border-green-500/40';
            el.innerHTML = '<span aria-hidden="true">✓</span> Assigned <strong>' + written + '</strong> district' + (written === 1 ? '' : 's') +
              '. Every record is stamped as a manual bulk assignment. The review pile is now clear.';
            _pmBulkState = null;
          }
        }

        commitChunk(0);
      }

      // Toggle the coverage panel (optionally forced open/closed).
      window.pmToggleCoverage = function (force) {
        var panel = document.getElementById('pm-coverage-panel');
        if (!panel) return;
        var show = (typeof force === 'boolean') ? force : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !show);
        var btn = document.getElementById('pm-coverage-btn');
        var lbl = document.getElementById('pm-coverage-label');
        if (lbl) lbl.textContent = show ? 'Hide Coverage' : 'Database Coverage';
        if (btn) {
          if (show) { btn.classList.add('bg-sky-500/20', 'border-sky-400/70', 'text-sky-200'); btn.classList.remove('bg-navy-900'); }
          else { btn.classList.remove('bg-sky-500/20', 'border-sky-400/70', 'text-sky-200'); btn.classList.add('bg-navy-900'); }
        }
        if (show) {
          window.pmStandardizeCancel(); // clear any stale preview/result
          window.pmBulkCancel();        // and any stale bulk-assignment table
          window.pmRenderCoverage();
          try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      };

      // Open the duplicates-only list view (used by the coverage callout).
      window.pmReviewDupes = function () {
        if (!_pmDupOnly) window.pmToggleDupes();
        var sec = document.getElementById('politician-manager');
        if (sec) { try { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
      };

      window.pmRenderList = function () {
        var listEl = document.getElementById('pm-list');
        var emptyEl = document.getElementById('pm-list-empty');
        if (!listEl) return;

        var all = _pmAll();
        var fullCount = 0, stubCount = 0;
        all.forEach(function (row) { _pmIsStub(row.p) ? stubCount++ : fullCount++; });
        var dup = _pmDuplicateInfo();

        var totalEl = document.getElementById('pm-count-total');
        var fEl = document.getElementById('pm-count-full');
        var sEl = document.getElementById('pm-count-stub');
        var dEl = document.getElementById('pm-count-dupe');
        if (totalEl) totalEl.textContent = all.length;
        if (fEl) fEl.textContent = fullCount;
        if (sEl) sEl.textContent = stubCount;
        if (dEl) dEl.textContent = dup.count;

        // Keep the Utah-seats chip current and refresh the coverage panel if
        // it's open (cheap; the heavy DOM build is skipped while it's closed).
        if (window.pmRenderCoverage) window.pmRenderCoverage();
        // Same for the Quality & Weak Spot panel — it self-skips while hidden.
        if (window.pmRenderQuality) window.pmRenderQuality();

        _pmSyncStateFilter(all);

        var qEl = document.getElementById('pm-search');
        var q = (qEl && qEl.value ? qEl.value : '').trim().toLowerCase();
        var fStatus = _pmFilterVal('pm-filter-status', 'all');
        var fState = _pmFilterVal('pm-filter-state', 'all');
        var fOffice = _pmFilterVal('pm-filter-office', 'all');
        var fParty = _pmFilterVal('pm-filter-party', 'all');

        var rows = all.filter(function (row) {
          var p = row.p;
          if (_pmDupOnly && !dup.ids[row.id]) return false;
          if (fStatus === 'full' && _pmIsStub(p)) return false;
          if (fStatus === 'stub' && !_pmIsStub(p)) return false;
          if (fState !== 'all' && (p.state || '').trim() !== fState) return false;
          if (fOffice !== 'all' && _pmOfficeType(p) !== fOffice) return false;
          if (fParty !== 'all' && _pmPartyKey(p.party) !== fParty) return false;
          return _pmListMatch(q, p, row.id);
        });

        // ── Sort the filtered rows (list starts name-sorted; re-sort on demand) ──
        var fSort = _pmFilterVal('pm-filter-sort', 'name');
        if (fSort && fSort !== 'name') {
          rows.sort(function (a, b) {
            if (fSort === 'state') {
              var as = (a.p.state || '~').toLowerCase(), bs = (b.p.state || '~').toLowerCase();
              if (as !== bs) return as < bs ? -1 : 1;
            } else if (fSort === 'status') {
              var astub = _pmIsStub(a.p) ? 0 : 1, bstub = _pmIsStub(b.p) ? 0 : 1;
              if (astub !== bstub) return astub - bstub;
            } else if (fSort === 'updated') {
              var at = _pmUpdatedMs(a.p), bt = _pmUpdatedMs(b.p);
              if (at !== bt) return bt - at; // most recent first
            }
            var an = (a.p.name || a.id).toLowerCase(), bn = (b.p.name || b.id).toLowerCase();
            return an < bn ? -1 : (an > bn ? 1 : 0);
          });
        }

        var shownEl = document.getElementById('pm-count-shown');
        if (shownEl) shownEl.textContent = rows.length;

        if (all.length === 0) {
          listEl.innerHTML = '<div class="text-center text-steel-400 font-body text-sm py-10">Database not loaded yet. Click <strong>Reload</strong> to fetch politicians.</div>';
          if (emptyEl) emptyEl.classList.add('hidden');
          return;
        }

        if (rows.length === 0) {
          listEl.innerHTML = '';
          if (emptyEl) {
            emptyEl.textContent = _pmDupOnly
              ? 'No possible duplicates found. 🎉'
              : 'No politicians match your search and filters.';
            emptyEl.classList.remove('hidden');
          }
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');

        listEl.innerHTML = rows.map(function (row) {
          var p = row.p;
          var icon = p.icon || '🏛';
          var sub = [p.office || '', p.state || ''].filter(Boolean).join(' · ') || '—';
          var isDup = !!dup.ids[row.id];
          var active = (row.id === _pmSelectedId)
            ? ' ring-2 ring-crimson-400/70 border-crimson-400/50'
            : (isDup ? ' border-amber-500/40' : '');
          var dupFlag = isDup
            ? '<span title="Possible duplicate — shares a name with another record" class="flex-shrink-0 text-amber-300" aria-hidden="true">⚠️</span>'
            : '';
          return '' +
            '<button type="button" onclick="window.pmSelect(\'' + _pmJs(row.id) + '\')" ' +
              'class="w-full text-left flex items-center gap-3 bg-navy-900/60 hover:bg-navy-700/70 border border-white/5 hover:border-crimson-400/40 rounded-xl px-3 py-2.5 transition-all' + active + '">' +
              '<span class="text-xl flex-shrink-0" aria-hidden="true">' + _pmEsc(icon) + '</span>' +
              '<span class="min-w-0 flex-1">' +
                '<span class="block text-sm font-700 text-white truncate">' + _pmEsc(p.name || row.id) + '</span>' +
                '<span class="block text-xs text-steel-400 truncate">' + _pmEsc(sub) + '</span>' +
              '</span>' +
              dupFlag +
              _pmPartyBadge(p.party) +
              _pmStatusBadge(p) +
              _pmQReviewBadge(p) +
            '</button>';
        }).join('');
      };

      // Find-Duplicates toggle: flips the list into a duplicates-only view and
      // reflects the active state on the toolbar button.
      window.pmToggleDupes = function () {
        _pmDupOnly = !_pmDupOnly;
        var btn = document.getElementById('pm-dupes-btn');
        var lbl = document.getElementById('pm-dupes-label');
        if (lbl) lbl.textContent = _pmDupOnly ? 'Show all' : 'Find Duplicates';
        if (btn) {
          if (_pmDupOnly) {
            btn.classList.add('bg-amber-500/20', 'border-amber-400/70', 'text-amber-200');
            btn.classList.remove('bg-navy-900');
          } else {
            btn.classList.remove('bg-amber-500/20', 'border-amber-400/70', 'text-amber-200');
            btn.classList.add('bg-navy-900');
          }
        }
        window.pmRenderList();
      };

      // Reset every search box and filter to its default.
      window.pmClearFilters = function () {
        var ids = ['pm-search', 'pm-filter-status', 'pm-filter-state', 'pm-filter-office', 'pm-filter-party'];
        ids.forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          if (el.tagName === 'SELECT') el.value = 'all';
          else el.value = '';
        });
        var sortEl = document.getElementById('pm-filter-sort');
        if (sortEl) sortEl.value = 'name';
        if (_pmDupOnly) window.pmToggleDupes();
        else window.pmRenderList();
      };

      function _pmFieldText(label, fid, value, opts) {
        opts = opts || {};
        var listId = '', listHtml = '';
        if (opts.datalist && opts.datalist.length) {
          listId = 'pm-dl-' + fid;
          listHtml = '<datalist id="' + listId + '">' + opts.datalist.map(function (v) {
            return '<option value="' + _pmEscAttr(v) + '"></option>';
          }).join('') + '</datalist>';
        }
        return '' +
          '<div class="' + (opts.full ? 'sm:col-span-2' : '') + '">' +
            '<label class="block font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-400 mb-1.5" for="pm-f-' + fid + '">' + _pmEsc(label) + '</label>' +
            '<input id="pm-f-' + fid + '" type="' + (opts.type || 'text') + '" value="' + _pmEscAttr(value == null ? '' : value) + '" ' +
              (listId ? 'list="' + listId + '" ' : '') +
              (opts.placeholder ? 'placeholder="' + _pmEscAttr(opts.placeholder) + '" ' : '') +
              'class="w-full bg-navy-950 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-2 text-sm text-white placeholder-steel-600 outline-none transition-colors font-body" />' +
            listHtml +
          '</div>';
      }

      // <select> field. `options` is an array of [value, label]. The current
      // value is always present as an option so saving can never drop an
      // unexpected value that isn't in the predefined list.
      function _pmFieldSelect(label, fid, value, options, opts) {
        opts = opts || {};
        value = (value == null ? '' : String(value));
        var list = options.slice();
        if (value && !list.some(function (o) { return String(o[0]) === value; })) {
          list.unshift([value, value]);
        }
        if (opts.allowBlank) list.unshift(['', '— none —']);
        var body = list.map(function (o) {
          return '<option value="' + _pmEscAttr(o[0]) + '"' + (String(o[0]) === value ? ' selected' : '') + '>' + _pmEsc(o[1]) + '</option>';
        }).join('');
        return '' +
          '<div class="' + (opts.full ? 'sm:col-span-2' : '') + '">' +
            '<label class="block font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-400 mb-1.5" for="pm-f-' + fid + '">' + _pmEsc(label) + '</label>' +
            '<select id="pm-f-' + fid + '" class="w-full bg-navy-950 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors font-body">' + body + '</select>' +
          '</div>';
      }

      // A titled group of fields, with a divider, used to organize the editor.
      function _pmGroup(title, bodyHtml) {
        return '' +
          '<div class="mb-5">' +
            '<div class="flex items-center gap-2 mb-3">' +
              '<span class="font-condensed text-xs font-700 tracking-widest uppercase text-crimson-300">' + _pmEsc(title) + '</span>' +
              '<span class="flex-1 h-px bg-white/10"></span>' +
            '</div>' +
            '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + bodyHtml + '</div>' +
          '</div>';
      }

      function _pmFieldArea(label, fid, value, rows) {
        return '' +
          '<div class="sm:col-span-2">' +
            '<label class="block font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-400 mb-1.5" for="pm-f-' + fid + '">' + _pmEsc(label) + '</label>' +
            '<textarea id="pm-f-' + fid + '" rows="' + (rows || 3) + '" ' +
              'class="w-full bg-navy-950 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-2 text-sm text-white placeholder-steel-600 outline-none transition-colors font-body leading-relaxed">' + _pmEsc(value == null ? '' : value) + '</textarea>' +
          '</div>';
      }

      // ── Tracked-promises editor ──────────────────────────────────
      // Each promise is { title, detail, verdict } (extra keys like
      // `sources` are preserved on save via the row's original index). Two OPTIONAL
      // keys drive the "Say vs. Do" distributional view: `claimedBeneficiary` (a
      // cohort key — who the promise SAYS it helps) and `impactMeasureId` (the
      // vr_measures id whose Distributional Impact Ledger is the receipt).
      var PM_VERDICTS = [['kept', '✅ Kept'], ['broken', '❌ Broken'], ['pending', '⏳ Pending']];

      // Cohort options for a promise's optional claimed beneficiary. Keys MUST match
      // the ledger's cohort keys (see impact-ledger.js / DISTRIBUTIONAL_IMPACT.md).
      var PM_BENEFICIARIES = [
        ['', '— optional: claimed beneficiary —'],
        ['working_middle', '🧑‍🏭 Working & middle-income households'],
        ['small_biz_contractors', '🧰 Small businesses & contractors'],
        ['high_income_wealth', '💼 High-income & high-wealth'],
        ['large_corporations', '🏢 Large corporations'],
        ['government_insiders', '🏛️ Government & insiders']
      ];

      function _pmVerdictSelect(selected) {
        var sel = (selected === 'kept' || selected === 'broken') ? selected : 'pending';
        return '<select data-pf="verdict" ' +
          'class="w-full bg-navy-900 border border-white/10 focus:border-crimson-400/70 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition-colors font-condensed tracking-wide">' +
          PM_VERDICTS.map(function (o) {
            return '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + o[1] + '</option>';
          }).join('') +
          '</select>';
      }

      // idx = original index in the record's promises array (so we can keep
      // unseen fields like `sources`); pass null for a freshly-added row.
      function _pmPromiseRow(pr, idx) {
        pr = pr || {};
        return '<div data-promise-row' + (idx == null ? '' : ' data-promise-idx="' + idx + '"') +
          ' class="bg-navy-950/60 border border-white/10 rounded-lg p-3">' +
          '<div class="flex items-start gap-2">' +
            '<div class="flex-1 min-w-0 space-y-2">' +
              '<input data-pf="title" type="text" value="' + _pmEscAttr(pr.title == null ? '' : pr.title) + '" ' +
                'placeholder="Promise title" ' +
                'class="w-full bg-navy-900 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-1.5 text-sm text-white placeholder-steel-600 outline-none transition-colors font-body" />' +
              '<textarea data-pf="detail" rows="2" placeholder="What happened, with evidence…" ' +
                'class="w-full bg-navy-900 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-1.5 text-sm text-white placeholder-steel-600 outline-none transition-colors font-body leading-relaxed">' + _pmEsc(pr.detail == null ? '' : pr.detail) + '</textarea>' +
            '</div>' +
            '<div class="flex flex-col items-stretch gap-2 flex-shrink-0" style="width:120px;">' +
              _pmVerdictSelect(pr.verdict) +
              '<button type="button" onclick="window.pmRemovePromise(this)" ' +
                'class="inline-flex items-center justify-center gap-1 bg-navy-900 hover:bg-crimson-700/70 border border-crimson-500/40 hover:border-crimson-400 text-crimson-300 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-1.5 rounded-lg transition-all">🗑 Remove</button>' +
            '</div>' +
          '</div>' +
          // Optional "Say vs. Do" link: who the promise claims to help, and the
          // measure whose Distributional Impact Ledger is the receipt. Both optional.
          '<div class="mt-2 pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2">' +
            '<div class="sm:col-span-2">' +
              '<label class="block text-[10px] text-steel-400 mb-1 font-condensed tracking-widest uppercase">Claimed beneficiary <span class="text-steel-600 normal-case tracking-normal">(optional)</span></label>' +
              '<select data-pf="claimedBeneficiary" ' +
                'class="w-full bg-navy-900 border border-white/10 focus:border-crimson-400/70 rounded-lg px-2 py-1.5 text-xs text-white outline-none transition-colors font-body">' +
                PM_BENEFICIARIES.map(function (o) {
                  return '<option value="' + o[0] + '"' + (o[0] === (pr.claimedBeneficiary || '') ? ' selected' : '') + '>' + o[1] + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div>' +
              '<label class="block text-[10px] text-steel-400 mb-1 font-condensed tracking-widest uppercase">Impact measure ID <span class="text-steel-600 normal-case tracking-normal">(optional)</span></label>' +
              '<input data-pf="impactMeasureId" type="number" min="1" step="1" value="' + _pmEscAttr(pr.impactMeasureId == null ? '' : pr.impactMeasureId) + '" ' +
                'placeholder="e.g. 1" ' +
                'class="w-full bg-navy-900 border border-white/10 focus:border-crimson-400/70 rounded-lg px-2 py-1.5 text-xs text-white placeholder-steel-600 outline-none transition-colors font-body" />' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function _pmPromisesSection(promises) {
        var list = Array.isArray(promises) ? promises : [];
        var rows = list.map(function (pr, i) { return _pmPromiseRow(pr, i); }).join('');
        return '<div class="sm:col-span-2 mt-1 pt-3 border-t border-white/10">' +
          '<div class="flex items-center justify-between gap-2 mb-2">' +
            '<div class="font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-400">Tracked Promises ' +
              '<span class="text-steel-500 normal-case tracking-normal">— verdicts feed the kept / broken / pending stats</span></div>' +
            '<button type="button" onclick="window.pmAddPromise()" ' +
              'class="flex-shrink-0 inline-flex items-center gap-1 bg-navy-900 hover:bg-navy-700 border border-gold-500/30 hover:border-gold-400/60 text-gold-300 font-condensed text-[10px] font-700 tracking-widest uppercase px-2.5 py-1.5 rounded-lg transition-all">➕ Add</button>' +
          '</div>' +
          '<div id="pm-promises" class="space-y-3">' + rows + '</div>' +
          '<div id="pm-promises-empty" class="' + (rows ? 'hidden ' : '') + 'text-steel-500 text-xs font-body italic py-2">No promises tracked yet. Use “Add” to start the record.</div>' +
        '</div>';
      }

      window.pmAddPromise = function () {
        var cont = document.getElementById('pm-promises');
        if (!cont) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = _pmPromiseRow({ verdict: 'pending' }, null);
        var node = wrap.firstChild;
        cont.appendChild(node);
        var emptyEl = document.getElementById('pm-promises-empty');
        if (emptyEl) emptyEl.classList.add('hidden');
        var titleInput = node.querySelector('[data-pf="title"]');
        if (titleInput) titleInput.focus();
      };

      window.pmRemovePromise = function (btn) {
        var row = btn && btn.closest ? btn.closest('[data-promise-row]') : null;
        if (row && row.parentNode) row.parentNode.removeChild(row);
        var cont = document.getElementById('pm-promises');
        var emptyEl = document.getElementById('pm-promises-empty');
        if (cont && emptyEl && !cont.querySelector('[data-promise-row]')) {
          emptyEl.classList.remove('hidden');
        }
      };

      // ── Editor helpers ───────────────────────────────────────────
      function _pmFmtDate(v) {
        if (!v) return '';
        try {
          if (typeof v === 'object' && typeof v.toDate === 'function') v = v.toDate();
          var d = new Date(v);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleString();
        } catch (e) { return ''; }
      }
      // Best-effort millisecond timestamp for sorting by "recently updated".
      function _pmUpdatedMs(p) {
        var v = p && (p.updatedAt || p.createdAt);
        if (!v) return 0;
        try {
          if (typeof v === 'object' && typeof v.toDate === 'function') v = v.toDate();
          var t = new Date(v).getTime();
          return isNaN(t) ? 0 : t;
        } catch (e) { return 0; }
      }
      function _pmStates() {
        var states = {};
        _pmAll().forEach(function (r) { var s = (r.p.state || '').trim(); if (s) states[s] = 1; });
        return Object.keys(states).sort();
      }
      function _pmSlug(s) {
        return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      }
      function _pmUniqueId(base) {
        var id = base, n = 2;
        while (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) { id = base + '_' + n; n++; }
        return id;
      }

      // Per-issue stance editors, only shown when a record already carries
      // stance keys (the public profile schema seeds these).
      function _pmStanceFields(p) {
        if (!p.stances || typeof p.stances !== 'object') return '';
        var keys = Object.keys(p.stances);
        if (!keys.length) return '';
        return '<div class="sm:col-span-2 mt-1">' +
          '<div class="font-condensed text-[11px] font-700 tracking-widest uppercase text-steel-400 mb-2">Issue Stances</div>' +
          '<div class="space-y-2.5">' +
          keys.map(function (k) {
            var label = PM_STANCE_LABELS[k] || _pmPretty(k);
            return '<div>' +
              '<label class="block text-[11px] text-steel-300 mb-1 font-body">' + _pmEsc(label) + '</label>' +
              '<textarea data-stance-key="' + _pmEscAttr(k) + '" rows="2" ' +
                'class="w-full bg-navy-950 border border-white/10 focus:border-crimson-400/70 rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors font-body leading-relaxed">' + _pmEsc(p.stances[k] == null ? '' : p.stances[k]) + '</textarea>' +
              '</div>';
          }).join('') +
          '</div></div>';
      }

      // Find existing records that are potential duplicates of the values
      // currently in the editor (live name/office/state, not the saved record).
      // Exact-name matches always count; similar names count when they also
      // share office type and state — and, when the relevant editor field is
      // still blank, that field is treated as "unknown" rather than a mismatch
      // so same-name records still surface. `excludeId` drops the open record.
      function _pmFindPotentialDupes(name, office, state, excludeId) {
        var qNorm = _pmNormName(name);
        if (!qNorm) return [];
        var qOffice = _pmOfficeType({ office: office || '' });
        var qState = _pmCanonState(state);
        var out = [];
        _pmAll().forEach(function (row) {
          if (excludeId && row.id === excludeId) return;
          var p = row.p;
          var nNorm = _pmNormName(p.name);
          if (!nNorm) return;
          var exact = nNorm === qNorm;
          var match = exact;
          if (!match && _pmNamesSimilar(name, p.name)) {
            var pState = _pmCanonState(p.state);
            var sameState = !qState || !pState || pState === qState;
            var sameOffice = !office || _pmOfficeType(p) === qOffice;
            match = sameState && sameOffice;
          }
          if (match) out.push({ id: row.id, name: p.name || row.id, office: p.office || '', state: p.state || '', exact: exact });
        });
        out.sort(function (a, b) { return (b.exact ? 1 : 0) - (a.exact ? 1 : 0); });
        return out;
      }

      // Re-render the live potential-duplicate banner from the editor's current
      // field values. Called on render and whenever name/office/state change, so
      // the warning appears (and clears) as the admin types — for both new and
      // existing records. Non-blocking by design: it informs, never prevents.
      function _pmLiveDupCheck() {
        var box = document.getElementById('pm-live-dup');
        if (!box) return;
        function fv(f) { var el = document.getElementById('pm-f-' + f); return el ? el.value : ''; }
        var name = (fv('name') || '').trim();
        if (!name) { box.classList.add('hidden'); box.innerHTML = ''; return; }
        var matches = _pmFindPotentialDupes(name, (fv('office') || '').trim(), (fv('state') || '').trim(), _pmSelectedId);
        if (!matches.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
        var links = matches.slice(0, 6).map(function (m) {
          var sub = [m.office, m.state].filter(Boolean).join(' · ');
          var label = _pmEsc(m.name) + (sub ? ' <span class="text-amber-300/70">(' + _pmEsc(sub) + ')</span>' : '');
          return '<button type="button" onclick="window.pmSelect(\'' + _pmJs(m.id) + '\')" ' +
            'title="Open this record" ' +
            'class="inline-block underline decoration-amber-400/50 hover:decoration-amber-300 text-amber-100 hover:text-white transition-colors">' + label + '</button>';
        }).join('<span class="text-amber-500/50"> · </span>');
        var more = matches.length > 6 ? ' <span class="text-amber-300/70">+' + (matches.length - 6) + ' more</span>' : '';
        var n = matches.length;
        box.innerHTML =
          '<div class="flex items-start gap-2">' +
            '<span class="text-base leading-none mt-0.5" aria-hidden="true">⚠️</span>' +
            '<div>' +
              '<div class="font-condensed text-xs font-700 tracking-widest uppercase text-amber-200 mb-1">' +
                'Possible duplicate' + (n === 1 ? '' : 's') + ' detected (' + n + ')</div>' +
              '<div class="text-amber-100/90">This may already be in the database: ' + links + more + '.</div>' +
              '<div class="text-amber-300/70 mt-1 text-[11px]">Open a match to update it instead, or continue if this is a different person.</div>' +
            '</div>' +
          '</div>';
        box.className = 'mb-4 text-xs font-body rounded-lg px-3 py-2.5 border text-amber-100 bg-amber-950/40 border-amber-500/40';
      }
      window._pmLiveDupCheck = _pmLiveDupCheck;

      // Soft, non-blocking gate used right before a create/save is committed.
      // If the record clashes with existing ones it lays out the matches and
      // asks the admin to confirm — Cancel returns them to the editor (where the
      // ⚠️ banner links straight to each match so they can update it instead),
      // OK lets the write proceed. Returns true when it's safe to continue
      // (no clash, or the admin chose to proceed anyway).
      function _pmConfirmIfDuplicate(name, office, state, excludeId, verb) {
        var matches = _pmFindPotentialDupes(name, office, state, excludeId);
        if (!matches.length) return true;
        var anyExact = matches.some(function (m) { return m.exact; });
        var lines = matches.slice(0, 8).map(function (m) {
          var sub = [m.office, m.state].filter(Boolean).join(' · ');
          return '  • ' + (m.name || m.id) + (sub ? '  (' + sub + ')' : '') + (m.exact ? '   [same name]' : '');
        });
        var more = matches.length > 8 ? '\n  …and ' + (matches.length - 8) + ' more' : '';
        var n = matches.length;
        var msg =
          '⚠️ ' + n + ' possible duplicate' + (n === 1 ? '' : 's') + ' already in the database:\n\n' +
          lines.join('\n') + more + '\n\n' +
          (anyExact
            ? 'One or more share this exact name.'
            : 'These share a similar name, the same office type, and the same state.') + '\n\n' +
          'Click Cancel to go back and open an existing record to update it instead,\n' +
          'or OK to ' + verb + ' this as a separate new record anyway.';
        return window.confirm(msg);
      }
      window._pmConfirmIfDuplicate = _pmConfirmIfDuplicate;

      // Renders the editor form for either an existing record (isNew=false) or a
      // blank new record (isNew=true). pmSelect / pmCreateNew set the mode.
      function _pmRenderEditor(id, p, isNew) {
        p = p || {};
        var editor = document.getElementById('pm-editor');
        if (!editor) return;

        var keyIssues = Array.isArray(p.keyIssues) ? p.keyIssues.join('\n') : '';
        var acctScore = (p.accountability && typeof p.accountability.overallScore === 'number')
          ? p.accountability.overallScore : '';
        var lastUpdated = _pmFmtDate(p.updatedAt);
        var stateList = _pmStates();

        // ── Header ──
        var titleText = isNew ? 'New Politician' : (p.name || id || 'Untitled');
        var meta = isNew
          ? '<div class="text-[11px] font-body text-steel-400 mt-1">Fill in the fields below, then click <strong>Create</strong>. The record is written straight to Firestore.</div>'
          : '<div class="text-[11px] font-mono text-steel-500 mt-1 break-all">ID: <span class="text-steel-300">' + _pmEsc(id) + '</span></div>' +
            (lastUpdated ? '<div class="text-[11px] font-body text-steel-500 mt-0.5">🕑 Last updated: <span class="text-steel-300">' + _pmEsc(lastUpdated) + '</span></div>' : '');
        var overrideNote = (!isNew && _pmStatusOverridden(p))
          ? '<div class="text-[11px] font-body text-amber-300/90 mt-1">📌 Status pinned to <strong>' + _pmEsc(p.profileStatus.toUpperCase()) + '</strong> by an admin · ' +
            '<button type="button" onclick="window.pmSetStatus(\'' + _pmJs(id) + '\',\'auto\')" class="underline hover:text-white">reset to auto</button></div>'
          : '';

        var header = '<div class="flex items-start justify-between gap-3 mb-4">' +
            '<div class="min-w-0">' +
              '<div class="font-display text-2xl text-white truncate">' + _pmEsc(titleText) + '</div>' +
              meta + overrideNote +
            '</div>' +
            '<div class="flex flex-col items-end gap-1.5 flex-shrink-0">' +
              (isNew ? '' : _pmStatusBadge(p)) +
              '<span id="pm-dirty-flag" class="hidden font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-0.5 rounded-full text-amber-200 bg-amber-500/15 border border-amber-500/40">● Unsaved</span>' +
            '</div>' +
          '</div>';

        // ── Basic Info group (ID field only in create mode) ──
        var basic =
          (isNew ? _pmFieldText('Record ID', 'id', '', { placeholder: 'auto-generated from name' }) : '') +
          _pmFieldText('Name', 'name', p.name) +
          _pmFieldText('Office', 'office', p.office, { placeholder: 'e.g. U.S. Senator, State Representative (Dist. 12)' }) +
          _pmFieldText('District', 'district', p.district, { placeholder: 'e.g. District 3' }) +
          _pmFieldText('Location / State', 'state', p.state, { datalist: stateList, placeholder: 'e.g. Utah' }) +
          _pmFieldSelect('Party', 'party', p.party, PM_PARTIES, { allowBlank: true }) +
          _pmFieldSelect('Tier (directory prominence)', 'tier', p.tier || 'gray', PM_TIERS) +
          _pmFieldText('Icon (emoji)', 'icon', p.icon, { placeholder: '🏛' }) +
          _pmFieldText('Photo URL', 'photo', p.photo, { placeholder: 'https://…', full: true });

        var bio =
          _pmFieldArea('Bio', 'bio', p.bio, 4) +
          _pmFieldArea('Signature Quote', 'quote', p.quote, 2) +
          _pmFieldText('Quote Source / Attribution', 'quoteSource', p.quoteSource, { placeholder: 'e.g. To the Salt Lake Tribune, 2024', full: true });

        var issues =
          _pmFieldArea('Key Issues (one per line)', 'keyIssues', keyIssues, 3) +
          _pmStanceFields(p);

        // Promises group leads with the headline Promise Score, then the
        // editable tracked-promise rows (which recompute kept/broken/pending).
        var promises =
          _pmFieldText('Promise Score', 'score', (p.score == null ? '' : p.score), { type: 'number', placeholder: '0–100' }) +
          _pmPromisesSection(p.promises);

        // Accountability gets its own group: the headline score plus an
        // optional free-form summary (preserved alongside any other
        // accountability data already on the record).
        var acctSummary = (p.accountability && typeof p.accountability.summary === 'string')
          ? p.accountability.summary : '';
        var accountability =
          _pmFieldText('Accountability Score', 'acctScore', acctScore, { type: 'number', placeholder: '0–100' }) +
          _pmFieldArea('Accountability Summary (optional)', 'acctSummary', acctSummary, 3);

        // ── Action buttons ──
        var actions;
        if (isNew) {
          actions = '<div class="flex flex-wrap gap-3 mt-5">' +
              '<button type="button" onclick="window.pmCreate()" ' +
                'class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-condensed text-xs font-700 tracking-widest uppercase px-5 py-2.5 rounded-lg transition-all">' +
                '<span aria-hidden="true">➕</span> Create Politician</button>' +
              '<button type="button" onclick="window.pmCancelEdit()" ' +
                'class="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-xs font-700 tracking-widest uppercase px-5 py-2.5 rounded-lg transition-all">' +
                'Cancel</button>' +
            '</div>';
        } else {
          var stub = _pmIsStub(p);
          var statusBtn = stub
            ? '<button type="button" onclick="window.pmSetStatus(\'' + _pmJs(id) + '\',\'full\')" ' +
                'class="inline-flex items-center gap-2 bg-navy-900 hover:bg-green-700 border border-green-500/50 hover:border-green-400 text-green-300 hover:text-white font-condensed text-xs font-700 tracking-widest uppercase px-4 py-2.5 rounded-lg transition-all">' +
                '<span aria-hidden="true">⬆️</span> Promote to Full</button>'
            : '<button type="button" onclick="window.pmSetStatus(\'' + _pmJs(id) + '\',\'stub\')" ' +
                'class="inline-flex items-center gap-2 bg-navy-900 hover:bg-amber-700 border border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-white font-condensed text-xs font-700 tracking-widest uppercase px-4 py-2.5 rounded-lg transition-all">' +
                '<span aria-hidden="true">⬇️</span> Mark as Stub</button>';
          actions = '<div class="flex flex-wrap gap-3 mt-5">' +
              '<button type="button" onclick="window.pmSave(\'' + _pmJs(id) + '\')" ' +
                'class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-condensed text-xs font-700 tracking-widest uppercase px-5 py-2.5 rounded-lg transition-all">' +
                '<span aria-hidden="true">💾</span> Save Changes</button>' +
              statusBtn +
              '<button type="button" onclick="window.pmDelete(\'' + _pmJs(id) + '\')" ' +
                'class="inline-flex items-center gap-2 bg-navy-900 hover:bg-crimson-700 border border-crimson-500/50 hover:border-crimson-400 text-crimson-300 hover:text-white font-condensed text-xs font-700 tracking-widest uppercase px-4 py-2.5 rounded-lg transition-all">' +
                '<span aria-hidden="true">🗑</span> Delete Record</button>' +
            '</div>';
        }

        editor.innerHTML = '' +
          header +
          '<div id="pm-live-dup" class="hidden"></div>' +
          '<form onsubmit="return false;">' +
            _pmGroup('Basic Info', basic) +
            _pmGroup('Biography & Quote', bio) +
            _pmGroup('Key Issues & Stances', issues) +
            _pmGroup('Promises', promises) +
            _pmGroup('Accountability', accountability) +
          '</form>' +
          '<div id="pm-editor-feedback" class="hidden mt-3 text-sm font-body rounded-lg px-3 py-2 border"></div>' +
          actions +
          '<div class="mt-3 text-[11px] font-body text-steel-500">Tip: <kbd class="px-1 py-0.5 rounded bg-navy-950 border border-white/10 text-steel-300">Ctrl/⌘+S</kbd> ' +
            (isNew ? 'creates' : 'saves') + ' · <kbd class="px-1 py-0.5 rounded bg-navy-950 border border-white/10 text-steel-300">Esc</kbd> ' +
            (isNew ? 'cancels' : 'closes') + '</div>';

        // Fresh render = clean slate; (re)bind the dirty + shortcut watchers.
        _pmSetDirty(false);
        _pmBindEditorWatchers();
        _pmLiveDupCheck();
      }

      // ── Unsaved-changes + keyboard helpers ───────────────────────
      // Toggle the dirty flag and its header indicator together.
      function _pmSetDirty(v) {
        _pmDirty = !!v;
        var flag = document.getElementById('pm-dirty-flag');
        if (flag) flag.classList.toggle('hidden', !_pmDirty);
      }
      // Returns true when it's safe to throw away the open editor (nothing
      // unsaved, or the admin confirmed the discard).
      function _pmGuardDiscard() {
        if (!_pmDirty) return true;
        return window.confirm('You have unsaved changes in the editor that will be lost.\n\nDiscard them and continue?');
      }
      // Bind, once per render, the input watcher (marks the form dirty) and the
      // editor-scoped keyboard shortcuts (Ctrl/⌘+S to save·create, Esc to close).
      function _pmBindEditorWatchers() {
        var editor = document.getElementById('pm-editor');
        if (!editor || editor._pmWatched) return;
        editor._pmWatched = true;
        var mark = function () { if (!_pmDirty) _pmSetDirty(true); };
        editor.addEventListener('input', mark);
        editor.addEventListener('change', mark);
        // Live duplicate re-check when the identifying fields change.
        editor.addEventListener('input', function (e) {
          var t = e.target;
          if (t && (t.id === 'pm-f-name' || t.id === 'pm-f-office' || t.id === 'pm-f-state')) {
            _pmLiveDupCheck();
          }
        });
        editor.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            if (_pmMode === 'create') { window.pmCreate(); }
            else if (_pmSelectedId) { window.pmSave(_pmSelectedId); }
          } else if (e.key === 'Escape') {
            if (_pmMode === 'create') { e.preventDefault(); window.pmCancelEdit(); }
          }
        });
      }

      // Internal: render a record into the editor (no discard guard — callers
      // that may clobber unsaved edits go through window.pmSelect instead).
      function _pmShow(id) {
        _pmMode = 'edit';
        _pmSelectedId = id;
        var p = (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) ? PROFILES[id] : null;
        var editor = document.getElementById('pm-editor');
        var emptyEl = document.getElementById('pm-editor-empty');
        if (!editor) return;
        if (!p) {
          editor.classList.add('hidden');
          if (emptyEl) emptyEl.classList.remove('hidden');
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');
        editor.classList.remove('hidden');
        _pmRenderEditor(id, p, false);
        // Refresh the list so the active row highlight follows the selection.
        window.pmRenderList();
      }

      window.pmSelect = function (id) {
        // Selecting a different record discards the open editor — guard it.
        if (id !== _pmSelectedId && !_pmGuardDiscard()) return;
        _pmShow(id);
      };

      // Open a blank editor for a brand-new record. An optional `prefill`
      // object (e.g. from a missing-seat chip in the coverage panel) seeds the
      // record so its office / district / state are filled in advance — the
      // live duplicate check still runs, so a clash surfaces immediately.
      window.pmCreateNew = function (prefill) {
        if (!_pmGuardDiscard()) return;
        _pmMode = 'create';
        _pmSelectedId = null;
        var editor = document.getElementById('pm-editor');
        var emptyEl = document.getElementById('pm-editor-empty');
        if (!editor) return;
        if (emptyEl) emptyEl.classList.add('hidden');
        editor.classList.remove('hidden');
        var base = { icon: '🏛', tier: 'gray' };
        if (prefill && typeof prefill === 'object') {
          for (var k in prefill) {
            if (Object.prototype.hasOwnProperty.call(prefill, k) && prefill[k] != null && prefill[k] !== '') base[k] = prefill[k];
          }
        }
        _pmRenderEditor(null, base, true);
        window.pmRenderList();
        var nameEl = document.getElementById('pm-f-name');
        if (nameEl) nameEl.focus();
        try { editor.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      };

      // Leave create mode without saving — return to the previous selection.
      window.pmCancelEdit = function () {
        if (!_pmGuardDiscard()) return;
        _pmSetDirty(false);
        _pmMode = 'view';
        if (_pmSelectedId && PROFILES[_pmSelectedId]) {
          _pmShow(_pmSelectedId);
        } else {
          _pmSelectedId = null;
          var editor = document.getElementById('pm-editor');
          var emptyEl = document.getElementById('pm-editor-empty');
          if (editor) editor.classList.add('hidden');
          if (emptyEl) emptyEl.classList.remove('hidden');
          window.pmRenderList();
        }
      };

      // Quick action: pin or release a record's FULL/STUB classification.
      window.pmSetStatus = function (id, status) {
        var src = (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) ? PROFILES[id] : null;
        if (!src) { _pmFeedback('Record not found — try Reload.', 'error'); return; }
        var merged;
        try { merged = JSON.parse(JSON.stringify(src)); } catch (e) { merged = {}; }
        if (status === 'auto') { delete merged.profileStatus; }
        else { merged.profileStatus = status; }
        merged.updatedAt = new Date().toISOString();
        var msg = status === 'full' ? 'Marked as Full ✓' : (status === 'stub' ? 'Marked as Stub ✓' : 'Status reset to auto ✓');
        _pmPersist(id, merged, msg, function () { if (_pmSelectedId === id) _pmShow(id); });
      };

      // Reads every editable field into `merged`. Returns the populated object,
      // or null (after showing an error) when validation fails. Shared by save
      // and create so both stay perfectly in sync.
      function _pmCollectForm(merged) {
        merged = merged || {};
        function val(f) { var el = document.getElementById('pm-f-' + f); return el ? el.value : undefined; }

        var name = (val('name') || '').trim();
        if (!name) { _pmFeedback('Name cannot be empty.', 'error'); return null; }

        merged.name = name;
        merged.office = (val('office') || '').trim();
        merged.district = (val('district') || '').trim();
        merged.state = (val('state') || '').trim();
        merged.party = (val('party') || '').trim();
        merged.tier = (val('tier') || '').trim() || 'gray';
        merged.icon = (val('icon') || '').trim() || '🏛';
        merged.photo = (val('photo') || '').trim();
        merged.bio = (val('bio') || '');
        merged.quote = (val('quote') || '').trim();
        merged.quoteSource = (val('quoteSource') || '').trim();

        var scoreRaw = val('score');
        if (scoreRaw === '' || scoreRaw == null) {
          merged.score = null;
        } else {
          var sc = parseInt(scoreRaw, 10);
          merged.score = isNaN(sc) ? null : sc;
        }

        var ki = (val('keyIssues') || '');
        merged.keyIssues = ki.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);

        var stanceInputs = document.querySelectorAll('#pm-editor [data-stance-key]');
        if (stanceInputs.length) {
          var st = (merged.stances && typeof merged.stances === 'object') ? merged.stances : {};
          stanceInputs.forEach(function (inp) {
            st[inp.getAttribute('data-stance-key')] = inp.value;
          });
          merged.stances = st;
        }

        // Accountability: edit the headline score and an optional summary while
        // preserving any other accountability data (categories, detail, etc.).
        // Blank fields clear just that value; an empty object is removed.
        var acctObj = (merged.accountability && typeof merged.accountability === 'object') ? merged.accountability : {};
        var acctRaw = val('acctScore');
        if (acctRaw === '' || acctRaw == null) {
          delete acctObj.overallScore;
        } else {
          var av = parseInt(acctRaw, 10);
          if (!isNaN(av)) { acctObj.overallScore = Math.max(0, Math.min(100, av)); }
        }
        var acctSummary = (val('acctSummary') || '').trim();
        if (acctSummary) { acctObj.summary = acctSummary; }
        else { delete acctObj.summary; }
        if (Object.keys(acctObj).length) { merged.accountability = acctObj; }
        else { delete merged.accountability; }

        // Tracked promises: rebuild the array from the editor rows, keeping any
        // hidden fields (e.g. `sources`) via each row's original index. Fully
        // empty rows are dropped, then kept/broken/pending counts are recomputed.
        var origPromises = Array.isArray(merged.promises) ? merged.promises : [];
        var promiseRowEls = document.querySelectorAll('#pm-promises [data-promise-row]');
        var newPromises = [];
        promiseRowEls.forEach(function (rowEl) {
          var tEl = rowEl.querySelector('[data-pf="title"]');
          var dEl = rowEl.querySelector('[data-pf="detail"]');
          var vEl = rowEl.querySelector('[data-pf="verdict"]');
          var title = tEl ? tEl.value.trim() : '';
          var detail = dEl ? dEl.value.trim() : '';
          if (!title && !detail) return;
          var verdict = (vEl && (vEl.value === 'kept' || vEl.value === 'broken')) ? vEl.value : 'pending';
          var idxAttr = rowEl.getAttribute('data-promise-idx');
          var base = {};
          if (idxAttr !== null && idxAttr !== '' && origPromises[+idxAttr] && typeof origPromises[+idxAttr] === 'object') {
            try { base = JSON.parse(JSON.stringify(origPromises[+idxAttr])); } catch (e) { base = {}; }
          }
          base.title = title;
          base.detail = detail;
          base.verdict = verdict;
          // Optional "Say vs. Do" distributional link. Written when set, cleared when
          // blanked — so the field never lingers as an empty string on the record.
          var bEl = rowEl.querySelector('[data-pf="claimedBeneficiary"]');
          var mEl = rowEl.querySelector('[data-pf="impactMeasureId"]');
          var bVal = bEl ? bEl.value.trim() : '';
          if (bVal) base.claimedBeneficiary = bVal; else delete base.claimedBeneficiary;
          var mVal = mEl ? parseInt(mEl.value, 10) : NaN;
          if (!isNaN(mVal) && mVal > 0) base.impactMeasureId = mVal; else delete base.impactMeasureId;
          newPromises.push(base);
        });
        merged.promises = newPromises;
        merged.kept = newPromises.filter(function (r) { return r.verdict === 'kept'; }).length;
        merged.broken = newPromises.filter(function (r) { return r.verdict === 'broken'; }).length;
        merged.pending = newPromises.filter(function (r) { return r.verdict === 'pending'; }).length;

        return merged;
      }

      // Create a brand-new Firestore record from the create-mode editor.
      window.pmCreate = function () {
        var merged = _pmCollectForm({});
        if (!merged) return;

        var idEl = document.getElementById('pm-f-id');
        var base = _pmSlug(idEl ? idEl.value : '') || _pmSlug(merged.name);
        if (!base) { _pmFeedback('Enter a name (or an ID) for the new record.', 'error'); return; }
        var id = _pmUniqueId(base);

        // Non-blocking duplicate checkpoint: warn (and let the admin bail out to
        // review) when this new record looks like one that already exists.
        if (!_pmConfirmIfDuplicate(merged.name, merged.office, merged.state, null, 'create')) {
          _pmFeedback('Create cancelled — review the highlighted possible duplicate(s) above, or continue if this is a different person.', 'error');
          return;
        }

        var now = new Date().toISOString();
        merged.createdAt = now;
        merged.updatedAt = now;

        _pmFeedback('Creating…', 'ok');
        _pmPersist(id, merged, 'Created ' + merged.name + ' ✓', function () {
          _pmMode = 'edit';
          _pmShow(id);
          _pmFeedback('Created new record "' + merged.name + '" (ID: ' + id + ').', 'ok');
        });
      };


      // ════════════════════════════════════════════════════════════
      // QUICK ADD / PASTE JSON — bulk create + update from pasted JSON
      //
      // Accepts a single record object, an array of records, or an
      // { id: record } map. Each record is matched to an existing profile
      // by explicit id, then by normalized name; matches are merged and
      // updated, the rest are created. All writes go out in a single
      // Firestore batch, then the in-memory mirrors + public directory
      // refresh once. Lives alongside (not replacing) the single-record form.
      // ════════════════════════════════════════════════════════════

      // Toggle the panel. Pass false to force-close, true/undefined to open.
      window.pmToggleQuickAdd = function (force) {
        var panel = document.getElementById('pm-quick-panel');
        if (!panel) return;
        var open = (force === undefined) ? panel.classList.contains('hidden') : !!force;
        panel.classList.toggle('hidden', !open);
        if (open) {
          var ta = document.getElementById('pm-quick-input');
          if (ta) ta.focus();
          try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      };

      // Build a { normalizedName: id } index of existing records so a pasted
      // record without an explicit id can still update the right profile.
      function _pmNameIndex() {
        var idx = {};
        _pmAll().forEach(function (r) {
          var key = _pmNormName(r.p && r.p.name);
          if (key && !(key in idx)) idx[key] = r.id; // first match wins
        });
        return idx;
      }

      // Merge one pasted record onto an existing doc (or {} for a new record),
      // returning a clean, writable document. Nested stances/accountability are
      // merged; everything else overwrites. `id` is routing-only and skipped.
      function _pmNormalizeRecord(raw, existing) {
        var doc;
        try { doc = existing ? JSON.parse(JSON.stringify(existing)) : {}; }
        catch (e) { doc = {}; }

        for (var k in raw) {
          if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
          if (k === 'id') continue;
          var v = raw[k];
          if (v === undefined) continue;
          if ((k === 'stances' || k === 'accountability') && v && typeof v === 'object' && !Array.isArray(v)) {
            var base = (doc[k] && typeof doc[k] === 'object' && !Array.isArray(doc[k])) ? doc[k] : {};
            for (var sk in v) { if (Object.prototype.hasOwnProperty.call(v, sk)) base[sk] = v[sk]; }
            doc[k] = base;
          } else {
            doc[k] = v;
          }
        }

        // Light normalization so quick-added records match the editor's schema.
        if (doc.name != null) doc.name = String(doc.name).trim();
        if (doc.tier == null || doc.tier === '') doc.tier = 'gray';
        if (doc.icon == null || doc.icon === '') doc.icon = '🏛';
        if (typeof doc.keyIssues === 'string') {
          doc.keyIssues = doc.keyIssues.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        }
        // Recompute promise tallies when promises are supplied as an array.
        if (Array.isArray(doc.promises)) {
          doc.kept = doc.promises.filter(function (r) { return r && r.verdict === 'kept'; }).length;
          doc.broken = doc.promises.filter(function (r) { return r && r.verdict === 'broken'; }).length;
          doc.pending = doc.promises.filter(function (r) { return r && r.verdict === 'pending'; }).length;
        }
        return doc;
      }

      // Parse the textarea, plan a create/update for each record, then commit
      // them all in one Firestore batch and report what happened.
      window.pmQuickProcess = function () {
        var ta = document.getElementById('pm-quick-input');
        var raw = ta ? ta.value.trim() : '';
        if (!raw) { _pmQuickFeedback('Paste some JSON first.', 'error'); return; }

        var parsed;
        try { parsed = JSON.parse(raw); }
        catch (e) { _pmQuickFeedback('Invalid JSON — ' + (e && e.message ? e.message : 'could not parse') + '.', 'error'); return; }

        // Accept a single record, an array of records, or an { id: record } map.
        var records = [];
        if (Array.isArray(parsed)) {
          records = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.name || parsed.office || parsed.id) {
            records = [parsed];
          } else {
            records = Object.keys(parsed).map(function (key) {
              var rec = parsed[key];
              if (rec && typeof rec === 'object' && rec.id == null) rec.id = key;
              return rec;
            });
          }
        }
        records = records.filter(function (r) { return r && typeof r === 'object' && !Array.isArray(r); });

        if (!records.length) { _pmQuickFeedback('No politician records found in that JSON.', 'error'); return; }
        if (typeof db === 'undefined' || !db || typeof db.batch !== 'function') {
          _pmQuickFeedback('Database not ready — click Reload and try again.', 'error');
          return;
        }

        var nameIdx = _pmNameIndex();
        var now = new Date().toISOString();
        var byId = {};   // id -> { id, doc, action, label }
        var order = [];  // first-seen id order, for stable reporting
        var failed = []; // { label, reason }

        records.forEach(function (rec, i) {
          var label = (rec && (rec.name || rec.id)) ? String(rec.name || rec.id) : ('record #' + (i + 1));
          var name = (rec && rec.name != null) ? String(rec.name).trim() : '';
          var explicitId = (rec && rec.id != null) ? _pmSlug(rec.id) : '';
          if (!name && !explicitId) { failed.push({ label: label, reason: 'missing both name and id' }); return; }

          // Resolve a target id + action against existing data AND records
          // already staged in this same paste, so repeats merge instead of
          // colliding (Firestore forbids writing one doc twice per batch).
          var targetId, action, existing;
          if (explicitId && (byId[explicitId] || PROFILES[explicitId])) {
            targetId = explicitId;
            action = byId[explicitId] ? byId[explicitId].action : 'update';
            existing = byId[explicitId] ? byId[explicitId].doc : PROFILES[explicitId];
          } else if (name && nameIdx[_pmNormName(name)]) {
            targetId = nameIdx[_pmNormName(name)];
            action = byId[targetId] ? byId[targetId].action : 'update';
            existing = byId[targetId] ? byId[targetId].doc : PROFILES[targetId];
          } else {
            var base = explicitId || _pmSlug(name);
            if (!base) { failed.push({ label: label, reason: 'could not derive an id' }); return; }
            targetId = base;
            var n = 2;
            while (byId[targetId] || PROFILES[targetId]) { targetId = base + '_' + n; n++; }
            action = 'create';
            existing = null;
          }

          var doc = _pmNormalizeRecord(rec, existing);
          if (!doc.name) { failed.push({ label: label, reason: 'record has no name' }); return; }
          if (action === 'create' && !doc.createdAt) doc.createdAt = now;
          doc.updatedAt = now;

          if (!byId[targetId]) order.push(targetId);
          byId[targetId] = { id: targetId, doc: doc, action: action, label: doc.name };
          // Register the name so a later paste row updates this same record.
          var nk = _pmNormName(doc.name);
          if (nk && !(nk in nameIdx)) nameIdx[nk] = targetId;
        });

        var planned = order.map(function (id) { return byId[id]; });
        if (!planned.length) { _pmQuickRenderResult(0, 0, failed, null); return; }

        _pmQuickFeedback('Writing ' + planned.length + ' record' + (planned.length === 1 ? '' : 's') + '…', 'ok');

        var batch = db.batch();
        planned.forEach(function (item) {
          batch.set(db.collection('politicians').doc(item.id), item.doc);
        });

        batch.commit().then(function () {
          planned.forEach(function (item) {
            PROFILES[item.id] = item.doc;
            if (typeof CMP_DATA !== 'undefined') { CMP_DATA[item.id] = item.doc; }
          });
          if (typeof _populateDirData === 'function') { _populateDirData(); }
          window.pmRenderList();

          var created = planned.filter(function (x) { return x.action === 'create'; }).length;
          var updated = planned.length - created;
          _pmQuickRenderResult(created, updated, failed, planned);

          if (typeof window._showToast === 'function') {
            window._showToast('Quick Add: ' + created + ' created, ' + updated + ' updated ✓');
          }
        }).catch(function (error) {
          console.error('Politician Manager quick-add failed:', error);
          _pmQuickFeedback('Batch write failed: ' + (error && error.message ? error.message : 'unknown error') + '. No records were saved.', 'error');
        });
      };

      // Simple one-line status message in the quick-add panel.
      function _pmQuickFeedback(msg, kind) {
        var el = document.getElementById('pm-quick-feedback');
        if (!el) return;
        el.classList.remove('hidden');
        el.className = 'mt-4 text-sm font-body rounded-lg px-3 py-2 border ' + (kind === 'error'
          ? 'text-red-300 bg-red-950/40 border-red-500/40'
          : 'text-green-300 bg-green-950/40 border-green-500/40');
        el.textContent = msg;
      }

      // Rich result panel: headline counts, a clickable per-record breakdown
      // (jump straight into the editor to fine-tune), and any skipped records.
      function _pmQuickRenderResult(created, updated, failed, planned) {
        var el = document.getElementById('pm-quick-feedback');
        if (!el) return;
        el.classList.remove('hidden');
        var anyFail = failed && failed.length;
        el.className = 'mt-4 text-sm font-body rounded-lg px-3 py-3 border ' + (anyFail
          ? 'text-amber-100 bg-amber-950/40 border-amber-500/40'
          : 'text-green-200 bg-green-950/40 border-green-500/40');

        var html = '<div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-condensed text-xs font-700 tracking-widest uppercase mb-1">' +
          '<span class="text-green-300">✓ ' + created + ' created</span>' +
          '<span class="text-gold-300">✎ ' + updated + ' updated</span>' +
          (anyFail ? '<span class="text-red-300">✕ ' + failed.length + ' skipped</span>' : '') +
          '</div>';

        if (planned && planned.length) {
          var rows = planned.slice(0, 40).map(function (x) {
            var tag = x.action === 'create'
              ? '<span class="text-green-400 font-condensed text-[10px] font-700 tracking-widest uppercase">＋ created</span>'
              : '<span class="text-gold-300 font-condensed text-[10px] font-700 tracking-widest uppercase">↻ updated</span>';
            return '<li class="flex items-center gap-2">' +
              '<button type="button" onclick="window.pmSelect(\'' + _pmJs(x.id) + '\')" class="underline decoration-white/20 hover:decoration-white text-steel-200 hover:text-white transition-colors truncate">' + _pmEsc(x.label) + '</button> ' + tag +
              '</li>';
          }).join('');
          html += '<ul class="mt-1.5 space-y-0.5 text-xs text-steel-300 max-h-44 overflow-y-auto pr-1">' + rows +
            (planned.length > 40 ? '<li class="text-steel-500">…and ' + (planned.length - 40) + ' more</li>' : '') + '</ul>';
        }

        if (anyFail) {
          var frows = failed.slice(0, 25).map(function (f) {
            return '<li><span class="text-red-300">✕</span> ' + _pmEsc(f.label) + ' — <span class="text-red-200/80">' + _pmEsc(f.reason) + '</span></li>';
          }).join('');
          html += '<div class="mt-2 pt-2 border-t border-white/10">' +
            '<div class="font-condensed text-[11px] font-700 tracking-widest uppercase text-red-300 mb-1">Skipped</div>' +
            '<ul class="space-y-0.5 text-xs">' + frows +
            (failed.length > 25 ? '<li class="text-steel-500">…and ' + (failed.length - 25) + ' more</li>' : '') + '</ul></div>';
        }

        el.innerHTML = html;
      }

      // Clear the textarea and any result message.
      window.pmQuickClear = function () {
        var ta = document.getElementById('pm-quick-input');
        if (ta) { ta.value = ''; ta.focus(); }
        var el = document.getElementById('pm-quick-feedback');
        if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
      };

      // Drop a ready-to-edit example into the textarea (one new + fields that
      // demonstrate merging) so admins can see the expected shape instantly.
      window.pmQuickExample = function () {
        var ta = document.getElementById('pm-quick-input');
        if (!ta) return;
        var example = [
          {
            name: 'Jane Q. Public',
            office: 'U.S. Senator',
            state: 'Utah',
            party: 'Republican',
            tier: 'silver',
            bio: 'Two-term senator focused on fiscal policy and term limits.',
            keyIssues: ['Balanced budget', 'Term limits', 'Border security'],
            stances: { debt: 'Co-sponsored a balanced-budget amendment.', termLimits: 'Supports a 12-year cap for Congress.' },
            score: 72
          },
          {
            name: 'John A. Doe',
            office: 'State Representative (Dist. 12)',
            state: 'Utah',
            party: 'Democrat',
            bio: 'First-term state representative.',
            keyIssues: ['Education funding', 'Healthcare access']
          }
        ];
        ta.value = JSON.stringify(example, null, 2);
        ta.focus();
        _pmQuickFeedback('Example loaded — edit it, or click Process JSON to import.', 'ok');
      };


      function _pmFeedback(msg, kind) {
        var el = document.getElementById('pm-editor-feedback');
        if (!el) return;
        el.classList.remove('hidden');
        if (kind === 'error') {
          el.className = 'mt-3 text-sm font-body rounded-lg px-3 py-2 border text-red-300 bg-red-950/40 border-red-500/40';
        } else {
          el.className = 'mt-3 text-sm font-body rounded-lg px-3 py-2 border text-green-300 bg-green-950/40 border-green-500/40';
        }
        el.textContent = msg;
      }

      window.pmSave = function (id) {
        if (typeof PROFILES !== 'object' || !PROFILES || !PROFILES[id]) {
          _pmFeedback('Record not found — try Reload.', 'error');
          return;
        }
        // Clone the existing document so unedited fields (sources, sections,
        // election dates, etc.) are preserved exactly — _pmCollectForm only
        // overwrites the editable fields.
        var merged;
        try { merged = JSON.parse(JSON.stringify(PROFILES[id])); }
        catch (e) { merged = {}; }

        merged = _pmCollectForm(merged);
        if (!merged) return;

        // If the edited name/office/state now clash with a DIFFERENT record,
        // surface it before saving (non-blocking — the admin can proceed).
        if (!_pmConfirmIfDuplicate(merged.name, merged.office, merged.state, id, 'save')) {
          _pmFeedback('Save cancelled — review the highlighted possible duplicate(s) above, or continue if this is a different person.', 'error');
          return;
        }

        merged.updatedAt = new Date().toISOString();

        _pmFeedback('Saving…', 'ok');
        _pmPersist(id, merged, 'Saved ' + merged.name + ' ✓', function () {
          if (_pmSelectedId === id) _pmShow(id);
          _pmFeedback('Saved changes to "' + merged.name + '".', 'ok');
        });
      };

      // Two-step, theme-consistent delete: the bare button arms a crimson
      // confirmation panel in the editor; the actual Firestore delete only
      // runs from pmDeleteConfirmed. No native browser dialog.
      window.pmDelete = function (id) {
        var p = (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) ? PROFILES[id] : {};
        var label = p.name || id;
        var fb = document.getElementById('pm-editor-feedback');
        if (!fb) return;
        fb.classList.remove('hidden');
        fb.className = 'mt-3 text-sm font-body rounded-lg px-3 py-3 border text-crimson-100 bg-crimson-950/50 border-crimson-500/50';
        fb.innerHTML =
          '<div class="flex flex-col gap-2.5">' +
            '<div><span aria-hidden="true">⚠️</span> Permanently delete <strong>' + _pmEsc(label) + '</strong> from the database? This cannot be undone.</div>' +
            '<div class="flex flex-wrap gap-2">' +
              '<button type="button" onclick="window.pmDeleteConfirmed(\'' + _pmJs(id) + '\')" ' +
                'class="inline-flex items-center gap-2 bg-crimson-600 hover:bg-crimson-500 text-white font-condensed text-xs font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">' +
                '<span aria-hidden="true">🗑</span> Yes, delete permanently</button>' +
              '<button type="button" onclick="window.pmDeleteCancel()" ' +
                'class="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 border border-white/10 text-steel-300 hover:text-white font-condensed text-xs font-700 tracking-widest uppercase px-4 py-2 rounded-lg transition-all">' +
                'Cancel</button>' +
            '</div>' +
          '</div>';
        try { fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
      };

      window.pmDeleteCancel = function () {
        var fb = document.getElementById('pm-editor-feedback');
        if (fb) { fb.classList.add('hidden'); fb.innerHTML = ''; }
      };

      window.pmDeleteConfirmed = function (id) {
        var p = (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) ? PROFILES[id] : {};
        var label = p.name || id;
        db.collection('politicians').doc(id).delete().then(function () {
          if (typeof PROFILES === 'object' && PROFILES) { delete PROFILES[id]; }
          if (typeof CMP_DATA !== 'undefined') { delete CMP_DATA[id]; }
          if (typeof _populateDirData === 'function') { _populateDirData(); }
          if (_pmSelectedId === id) {
            _pmSetDirty(false);
            _pmSelectedId = null;
            _pmMode = 'view';
            var editor = document.getElementById('pm-editor');
            var emptyEl = document.getElementById('pm-editor-empty');
            if (editor) editor.classList.add('hidden');
            if (emptyEl) emptyEl.classList.remove('hidden');
          }
          window.pmRenderList();
          if (typeof window._showToast === 'function') {
            window._showToast('Deleted ' + label);
          }
        }).catch(function (error) {
          console.error('Politician Manager delete failed:', error);
          window.alert('Delete failed: ' + (error && error.message ? error.message : 'unknown error'));
        });
      };

      window.pmReload = function () {
        if (!_pmGuardDiscard()) return;
        _pmSetDirty(false);
        var lbl = document.getElementById('pm-reload-label');
        if (lbl) lbl.textContent = 'Loading…';
        db.collection('politicians').get().then(function (qs) {
          if (typeof PROFILES === 'object' && PROFILES) {
            Object.keys(PROFILES).forEach(function (k) { delete PROFILES[k]; });
            if (window._pdxFullIds) window._pdxFullIds.clear();
            qs.forEach(function (doc) {
              PROFILES[doc.id] = doc.data();
              if (typeof CMP_DATA !== 'undefined') { CMP_DATA[doc.id] = doc.data(); }
              if (window._pdxFullIds) window._pdxFullIds.add(doc.id);
            });
          }
          window.pmRenderList();
          if (_pmSelectedId && PROFILES[_pmSelectedId]) {
            _pmShow(_pmSelectedId);
          }
          if (lbl) lbl.textContent = 'Reload';
          if (typeof window._showToast === 'function') {
            window._showToast('Reloaded ' + qs.size + ' politicians');
          }
        }).catch(function (error) {
          console.error('Politician Manager reload failed:', error);
          if (lbl) lbl.textContent = 'Reload';
          if (typeof window._showToast === 'function') {
            window._showToast('Reload failed');
          }
        });
      };

      // ════════════════════════════════════════════════════════════
      // PROFILE QUALITY & WEAK SPOT FINDER
      //
      // Scores every profile 0–100% on completeness, flags exactly what each
      // weak profile is missing, and lists everyone worst-first so work can be
      // aimed where it matters most. Reads the live PROFILES mirror; the only
      // thing it writes is an optional `reviewStatus` ('reviewed' | 'verified')
      // via the shared _pmPersist path, so a cleaned-up profile can be dropped
      // off the weak list. Fully self-contained — reuses the manager's existing
      // helpers (_pmAll, _pmOfficeType, _pmIsPlaceholderStance, _pmPersist, …)
      // and never touches the editor or import flows.
      // ════════════════════════════════════════════════════════════

      // Boilerplate / unfinished-content markers that shouldn't survive in a
      // real bio. Case-insensitive; a hit flags the profile and caps its bio score.
      var PM_Q_PLACEHOLDER_RE = /lorem ipsum|placeholder|\btbd\b|\btodo\b|coming soon|to be (added|written|determined|filled|completed)|fill in|sample text|example text|\bxxx+\b|\bn\/a\b|no stated position|stance on /i;

      // Severity ranking so a profile's worst flag can drive sorting + filtering.
      var PM_Q_SEV_RANK = { critical: 3, high: 2, medium: 1, low: 0 };
      function _pmQWorstSeverity(flags) {
        var worst = -1;
        for (var i = 0; i < flags.length; i++) {
          var r = PM_Q_SEV_RANK[flags[i].severity];
          if (r != null && r > worst) worst = r;
        }
        return worst; // -1 = no flags
      }

      // Non-placeholder stance count (mirrors the public/admin stance rules).
      function _pmQStanceCount(p) {
        var n = 0;
        if (p && p.stances && typeof p.stances === 'object') {
          for (var k in p.stances) {
            if (Object.prototype.hasOwnProperty.call(p.stances, k) &&
                !_pmIsPlaceholderStance(p.stances[k])) { n++; }
          }
        }
        return n;
      }
      function _pmQIssues(p) {
        var raw = (p && (p.keyIssues || p.issues)) || [];
        if (!Array.isArray(raw)) return [];
        return raw.filter(function (s) { return s != null && String(s).trim(); });
      }
      function _pmQPromises(p) {
        if (!p || !Array.isArray(p.promises)) return [];
        return p.promises.filter(function (r) {
          return r && ((r.title && String(r.title).trim()) || (r.detail && String(r.detail).trim()));
        });
      }

      // ── The scorer ──────────────────────────────────────────────
      // Weighted completeness out of 100, plus the list of specific weak spots.
      // Weights: bio 20 · promises 20 · issues/positions 15 · office+district 15
      // · accountability/score 10 · photo 5 · verified/deep-dive 15.
      // Each weak spot carries a severity (critical|high|medium|low) and a short
      // agent-friendly "fix" describing exactly what to do.
      function _pmQualityAssess(p) {
        p = p || {};
        var flags = [];
        function flag(key, label, severity, fix) { flags.push({ key: key, label: label, severity: severity, fix: fix }); }

        // Bio (0–20) — present + length, capped when placeholder text is found.
        var bio = (p.bio == null ? '' : String(p.bio)).trim();
        var bioLen = bio.length;
        var bioPts;
        if (!bioLen) { bioPts = 0; flag('bio', 'Missing bio', 'high', 'Write a 2–4 sentence biography.'); }
        else if (bioLen < 120) { bioPts = 7; flag('bio', 'Very short bio (' + bioLen + ' chars)', 'medium', 'Expand the bio to at least a full paragraph (120+ chars).'); }
        else if (bioLen < 280) { bioPts = 14; }
        else { bioPts = 20; }
        if (bioLen && PM_Q_PLACEHOLDER_RE.test(bio)) {
          flag('placeholder', 'Placeholder / boilerplate text present', 'medium', 'Replace leftover placeholder or seed text with real content.');
          bioPts = Math.min(bioPts, 7);
        }

        // Promises tracked, with verdicts (0–20).
        var promises = _pmQPromises(p);
        var verdicted = promises.filter(function (r) { return r.verdict === 'kept' || r.verdict === 'broken' || r.verdict === 'pending'; });
        var promPts;
        if (!promises.length) { promPts = 0; flag('promises', '0 promises tracked', 'high', 'Add tracked promises with kept / broken / pending verdicts.'); }
        else if (promises.length < 3) { promPts = 12; flag('promises', 'Only ' + promises.length + ' promise' + (promises.length === 1 ? '' : 's') + ' tracked', 'low', 'Track at least 3 promises to build a meaningful record.'); }
        else { promPts = 20; }
        if (promises.length && !verdicted.length) { flag('verdicts', 'Tracked promises have no verdicts', 'medium', 'Assign a kept / broken / pending verdict to each promise.'); promPts = Math.min(promPts, 10); }

        // Key issues / positions (0–15).
        var issues = _pmQIssues(p);
        var stanceN = _pmQStanceCount(p);
        var issueTotal = issues.length + stanceN;
        var issuePts;
        if (issueTotal === 0) { issuePts = 0; flag('issues', 'No key issues or positions listed', 'medium', 'List the key issues and at least a couple of policy stances.'); }
        else if (issueTotal < 3) { issuePts = 8; }
        else { issuePts = 15; }

        // Valid office + district (0–15). District is only expected for districted
        // seats (U.S. House, state legislature) — statewide offices aren't penalized.
        var office = (p.office == null ? '' : String(p.office)).trim();
        var district = (p.district == null ? '' : String(p.district)).trim();
        var offType = _pmOfficeType(p);
        var officePts = office ? 8 : 0;
        if (!office) flag('office', 'Missing office / title', 'high', 'Set the office or title held (e.g. "U.S. Representative").');
        var needsDistrict = (offType === 'house' || offType === 'state');
        var districtPts;
        if (district) { districtPts = 7; }
        else if (needsDistrict) { districtPts = 0; flag('district', 'Missing district', 'medium', 'Add the district number for this seat.'); }
        else { districtPts = 7; }

        // Accountability / promise % score (0–10).
        var scoreNum = (p.score == null || p.score === '') ? NaN : parseInt(p.score, 10);
        var hasScore = !isNaN(scoreNum);
        var hasAcct = !!(p.accountability && typeof p.accountability.overallScore === 'number');
        var scorePts = (hasScore || hasAcct) ? 10 : 0;
        if (!hasScore && !hasAcct) flag('score', 'No accountability / promise score', 'low', 'Set a Promise Score or Accountability Score (0–100).');

        // Photo (0–5).
        var photo = (p.photo == null ? '' : String(p.photo)).trim();
        var photoPts = photo ? 5 : 0;
        if (!photo) flag('photo', 'No photo', 'low', 'Add a photo URL.');

        // Verified / deep-dive sections (0–15): the richer content beyond basics —
        // a signature quote, an accountability summary, promise detail/sources,
        // extended `sections`, or an explicit verified mark. Up to 3 count, ×5 each.
        var deep = 0;
        if ((p.quote == null ? '' : String(p.quote)).trim()) deep++;
        if (p.accountability && typeof p.accountability.summary === 'string' && p.accountability.summary.trim()) deep++;
        if (promises.some(function (r) { return (r.detail && String(r.detail).trim()) || (Array.isArray(r.sources) && r.sources.length); })) deep++;
        if (p.sections && typeof p.sections === 'object' && Object.keys(p.sections).length) deep++;
        if (p.verified === true || p.reviewStatus === 'verified') deep++;
        var deepPts = Math.min(deep, 3) * 5;
        if (deep === 0) flag('deepdive', 'No verified / deep-dive content', 'low', 'Add a signature quote, accountability summary, or detailed promises.');

        var score = bioPts + promPts + issuePts + officePts + districtPts + scorePts + photoPts + deepPts;
        score = Math.max(0, Math.min(100, Math.round(score)));

        // Very low completeness is itself a critical, top-priority flag.
        if (score < 35) flag('low', 'Very low completeness (' + score + '%)', 'critical', 'Needs substantial work across several areas — prioritize.');

        return {
          score: score,
          flags: flags,
          severity: _pmQWorstSeverity(flags),
          breakdown: { bio: bioPts, promises: promPts, issues: issuePts, office: officePts, district: districtPts, score: scorePts, photo: photoPts, deep: deepPts }
        };
      }
      // Expose for any external/agent tooling that wants the raw assessment.
      window.pmQualityAssess = function (p) { return _pmQualityAssess(p); };

      // ── Presentation helpers ────────────────────────────────────
      function _pmQScoreColor(s) {
        if (s >= 80) return { text: 'text-green-300', bar: 'bg-green-500', ring: 'border-green-500/50' };
        if (s >= 60) return { text: 'text-gold-300', bar: 'bg-gold-500', ring: 'border-gold-500/50' };
        if (s >= 40) return { text: 'text-amber-300', bar: 'bg-amber-500', ring: 'border-amber-500/50' };
        return { text: 'text-crimson-300', bar: 'bg-crimson-500', ring: 'border-crimson-500/50' };
      }
      function _pmQSevChip(sev) {
        var map = {
          critical: 'text-crimson-200 bg-crimson-500/15 border-crimson-500/50',
          high: 'text-orange-200 bg-orange-500/15 border-orange-500/45',
          medium: 'text-gold-200 bg-gold-500/15 border-gold-500/45',
          low: 'text-steel-300 bg-white/5 border-white/15'
        };
        return map[sev] || map.low;
      }
      function _pmQReviewBadge(p) {
        if (p && p.reviewStatus === 'verified') {
          return '<span class="flex-shrink-0 font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-1 rounded-full text-green-200 bg-green-500/15 border border-green-500/50">✓ Verified</span>';
        }
        if (p && p.reviewStatus === 'reviewed') {
          return '<span class="flex-shrink-0 font-condensed text-[10px] font-700 tracking-widest uppercase px-2 py-1 rounded-full text-sky-200 bg-sky-500/15 border border-sky-500/50">Reviewed</span>';
        }
        return '';
      }
      function _pmQStat(label, value, cls) {
        return '<div class="bg-navy-950/70 border border-white/10 rounded-xl px-3 py-2.5 text-center">' +
            '<div class="font-display text-2xl ' + (cls || 'text-white') + '">' + value + '</div>' +
            '<div class="font-condensed text-[10px] font-700 tracking-widest uppercase text-steel-400 mt-0.5">' + _pmEsc(label) + '</div>' +
          '</div>';
      }

      // Keep the quality panel's state dropdown in sync with the data.
      function _pmQSyncStateFilter(all) {
        var sel = document.getElementById('pm-q-state');
        if (!sel) return;
        var states = {};
        all.forEach(function (r) { var s = (r.p.state || '').trim(); if (s) states[s] = 1; });
        var sorted = Object.keys(states).sort();
        var sig = sorted.join('|');
        if (sel.getAttribute('data-sig') === sig) return;
        sel.setAttribute('data-sig', sig);
        var cur = sel.value || 'all';
        sel.innerHTML = '<option value="all">All states</option>' + sorted.map(function (s) {
          return '<option value="' + _pmEscAttr(s) + '">' + _pmEsc(s) + '</option>';
        }).join('');
        sel.value = (cur === 'all' || states[cur]) ? cur : 'all';
      }

      // Build the full assessed roster once per render (cheap; pure reads).
      function _pmQAssessAll() {
        return _pmAll().map(function (row) {
          var a = _pmQualityAssess(row.p);
          return { id: row.id, p: row.p, a: a };
        });
      }

      // Shared filter predicate for the panel + the worklist export, so what you
      // see and what you copy always agree.
      function _pmQReadFilters() {
        var qEl = document.getElementById('pm-q-search');
        var hrEl = document.getElementById('pm-q-hidereviewed');
        return {
          q: (qEl && qEl.value ? qEl.value : '').trim().toLowerCase(),
          state: _pmFilterVal('pm-q-state', 'all'),
          office: _pmFilterVal('pm-q-office', 'all'),
          sev: _pmFilterVal('pm-q-sev', 'all'),
          sort: _pmFilterVal('pm-q-sort', 'weakest'),
          hideReviewed: hrEl ? hrEl.checked : true
        };
      }
      function _pmQMatches(x, f) {
        var p = x.p;
        if (f.hideReviewed && (p.reviewStatus === 'reviewed' || p.reviewStatus === 'verified')) return false;
        if (f.state !== 'all' && (p.state || '').trim() !== f.state) return false;
        if (f.office !== 'all' && _pmOfficeType(p) !== f.office) return false;
        if (f.sev === 'critical' && x.a.severity !== PM_Q_SEV_RANK.critical) return false;
        if (f.sev === 'high' && x.a.severity < PM_Q_SEV_RANK.high) return false;
        if (f.sev === 'medium' && x.a.severity < PM_Q_SEV_RANK.medium) return false;
        if (f.sev === 'weak' && x.a.score >= 70) return false;
        if (f.q) {
          var hay = [(p.name || ''), (p.office || ''), (p.state || ''), (p.district || ''), (p.party || ''), x.id].join(' ').toLowerCase();
          if (hay.indexOf(f.q) === -1) return false;
        }
        return true;
      }
      function _pmQWeakestSort(a, b) {
        if (a.a.score !== b.a.score) return a.a.score - b.a.score;
        if (a.a.severity !== b.a.severity) return b.a.severity - a.a.severity;
        var an = (a.p.name || a.id).toLowerCase(), bn = (b.p.name || b.id).toLowerCase();
        return an < bn ? -1 : (an > bn ? 1 : 0);
      }

      var PM_Q_RENDER_CAP = 250; // keep the DOM light on very large databases

      window.pmRenderQuality = function () {
        var panel = document.getElementById('pm-quality-panel');
        // Only do the heavy DOM build while the panel is actually open.
        if (!panel || panel.classList.contains('hidden')) return;
        var body = document.getElementById('pm-quality-body');
        var emptyEl = document.getElementById('pm-quality-empty');
        var statsEl = document.getElementById('pm-quality-stats');
        var noteEl = document.getElementById('pm-quality-note');
        if (!body) return;

        var assessed = _pmQAssessAll();
        _pmQSyncStateFilter(assessed);

        // Summary stats over the whole database (pre-filter).
        if (statsEl) {
          var total = assessed.length;
          var sum = 0, weak = 0, critical = 0, reviewed = 0, verified = 0;
          assessed.forEach(function (x) {
            sum += x.a.score;
            if (x.a.score < 70) weak++;
            if (x.a.severity === PM_Q_SEV_RANK.critical) critical++;
            if (x.p.reviewStatus === 'reviewed') reviewed++;
            if (x.p.reviewStatus === 'verified') verified++;
          });
          var avg = total ? Math.round(sum / total) : 0;
          statsEl.innerHTML =
            _pmQStat('Profiles', total, 'text-white') +
            _pmQStat('Avg score', avg + '%', _pmQScoreColor(avg).text) +
            _pmQStat('Needs work', weak, weak ? 'text-amber-300' : 'text-green-300') +
            _pmQStat('Critical', critical, critical ? 'text-crimson-300' : 'text-green-300') +
            _pmQStat('Reviewed', reviewed, 'text-sky-300') +
            _pmQStat('Verified', verified, 'text-green-300');
        }

        var f = _pmQReadFilters();
        var rows = assessed.filter(function (x) { return _pmQMatches(x, f); });

        rows.sort(function (a, b) {
          if (f.sort === 'strongest') { if (a.a.score !== b.a.score) return b.a.score - a.a.score; }
          else if (f.sort === 'updated') { var at = _pmUpdatedMs(a.p), bt = _pmUpdatedMs(b.p); if (at !== bt) return bt - at; }
          else if (f.sort === 'name') { /* fall through to name tiebreak */ }
          else { return _pmQWeakestSort(a, b); } // weakest first (default)
          var an = (a.p.name || a.id).toLowerCase(), bn = (b.p.name || b.id).toLowerCase();
          return an < bn ? -1 : (an > bn ? 1 : 0);
        });

        var shown = rows.length;
        var capped = shown > PM_Q_RENDER_CAP;
        var visible = capped ? rows.slice(0, PM_Q_RENDER_CAP) : rows;

        if (noteEl) {
          noteEl.innerHTML = capped
            ? 'Showing the <strong>' + PM_Q_RENDER_CAP + '</strong> highest-priority of <strong>' + shown + '</strong> matching profiles — narrow the filters or mark some Reviewed to see the rest. <span class="text-purple-300">“Copy worklist” still exports all ' + shown + '.</span>'
            : 'Showing <strong>' + shown + '</strong> matching profile' + (shown === 1 ? '' : 's') + '.';
        }

        if (!assessed.length) {
          body.innerHTML = '<div class="text-center text-steel-400 font-body text-sm py-10">Database not loaded yet. Click <strong>Reload</strong> to fetch politicians.</div>';
          if (emptyEl) emptyEl.classList.add('hidden');
          return;
        }
        if (!shown) {
          body.innerHTML = '';
          if (emptyEl) { emptyEl.textContent = 'No profiles match these filters. 🎉 Try clearing the severity filter or un-checking “Hide reviewed”.'; emptyEl.classList.remove('hidden'); }
          return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');

        body.innerHTML = visible.map(function (x) {
          var p = x.p, id = x.id, a = x.a;
          var jid = _pmJs(id);
          var col = _pmQScoreColor(a.score);
          var icon = p.icon || '🏛';
          var sub = [p.office || '', p.district || '', p.state || ''].filter(Boolean).join(' · ') || '—';

          var flagsHtml = a.flags.length
            ? a.flags.map(function (ff) {
                return '<span title="' + _pmEscAttr(ff.fix) + '" class="inline-flex items-center font-condensed text-[10px] font-700 tracking-wide uppercase px-2 py-0.5 rounded-full border ' + _pmQSevChip(ff.severity) + '">' + _pmEsc(ff.label) + '</span>';
              }).join(' ')
            : '<span class="inline-flex items-center font-condensed text-[10px] font-700 tracking-wide uppercase px-2 py-0.5 rounded-full text-green-200 bg-green-500/15 border border-green-500/50">✓ No weak spots</span>';

          // Agent-friendly "what to fix" line.
          var needsHtml = a.flags.length
            ? '<div class="mt-2 text-[12px] font-body text-steel-300 leading-relaxed"><span class="font-700 text-purple-300">Needs:</span> ' +
                _pmEsc(a.flags.map(function (ff) { return ff.fix; }).join(' ')) + '</div>'
            : '';

          var reviewBadge = _pmQReviewBadge(p);

          return '' +
            '<div class="bg-navy-900/60 border border-white/5 rounded-xl px-3 py-3">' +
              '<div class="flex items-center gap-3">' +
                '<div class="flex flex-col items-center justify-center w-14 flex-shrink-0">' +
                  '<div class="font-display text-xl ' + col.text + ' leading-none">' + a.score + '<span class="text-[11px]">%</span></div>' +
                  '<div class="w-12 h-1.5 rounded-full bg-white/10 mt-1 overflow-hidden"><div class="h-full ' + col.bar + '" style="width:' + a.score + '%"></div></div>' +
                '</div>' +
                '<span class="text-xl flex-shrink-0" aria-hidden="true">' + _pmEsc(icon) + '</span>' +
                '<div class="min-w-0 flex-1">' +
                  '<div class="flex items-center gap-2 flex-wrap">' +
                    '<span class="text-sm font-700 text-white truncate">' + _pmEsc(p.name || id) + '</span>' +
                    _pmPartyBadge(p.party) +
                    reviewBadge +
                  '</div>' +
                  '<div class="text-xs text-steel-400 truncate">' + _pmEsc(sub) + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="flex flex-wrap gap-1.5 mt-2.5">' + flagsHtml + '</div>' +
              needsHtml +
              '<div class="flex flex-wrap items-center gap-2 mt-3">' +
                '<button type="button" onclick="window.pmQualityOpen(\'' + jid + '\')" ' +
                  'class="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-purple-500/20 border border-purple-500/40 hover:border-purple-400 text-purple-200 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all"><span aria-hidden="true">✏️</span> Open editor</button>' +
                (p.reviewStatus === 'reviewed' ? '' :
                  '<button type="button" onclick="window.pmSetReview(\'' + jid + '\',\'reviewed\')" ' +
                  'class="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-sky-500/20 border border-sky-500/40 hover:border-sky-400 text-sky-200 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all"><span aria-hidden="true">👁</span> Mark Reviewed</button>') +
                (p.reviewStatus === 'verified' ? '' :
                  '<button type="button" onclick="window.pmSetReview(\'' + jid + '\',\'verified\')" ' +
                  'class="inline-flex items-center gap-1.5 bg-navy-800 hover:bg-green-500/20 border border-green-500/40 hover:border-green-400 text-green-200 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-3 py-1.5 rounded-lg transition-all"><span aria-hidden="true">✓</span> Mark Verified</button>') +
                (p.reviewStatus ?
                  '<button type="button" onclick="window.pmSetReview(\'' + jid + '\',\'none\')" ' +
                  'class="inline-flex items-center gap-1.5 text-steel-400 hover:text-white font-condensed text-[10px] font-700 tracking-widest uppercase px-2.5 py-1.5 rounded-lg transition-colors"><span aria-hidden="true">✕</span> Clear status</button>' : '') +
              '</div>' +
            '</div>';
        }).join('');
      };

      // Open a record in the main editor from the quality panel: select it and
      // bring the editor into view (the panel can stay open above the workspace).
      window.pmQualityOpen = function (id) {
        if (typeof window.pmSelect === 'function') window.pmSelect(id);
        var editor = document.getElementById('pm-editor');
        if (editor) { try { editor.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
      };

      // Set / clear a profile's review status. Written through the shared persist
      // path so the in-memory mirror, directory, and list all stay in sync.
      window.pmSetReview = function (id, status) {
        var src = (typeof PROFILES === 'object' && PROFILES && PROFILES[id]) ? PROFILES[id] : null;
        if (!src) { if (typeof window._showToast === 'function') window._showToast('Record not found — try Reload'); return; }
        var merged;
        try { merged = JSON.parse(JSON.stringify(src)); } catch (e) { merged = {}; }
        if (!status || status === 'none') { delete merged.reviewStatus; }
        else { merged.reviewStatus = status; }
        merged.updatedAt = new Date().toISOString();
        var msg = status === 'verified' ? 'Marked Verified ✓' : (status === 'reviewed' ? 'Marked Reviewed ✓' : 'Review status cleared');
        // _pmPersist re-renders the list (which re-renders this panel); the
        // explicit call here covers the panel even if it ever renders alone.
        _pmPersist(id, merged, msg, function () { window.pmRenderQuality(); });
      };

      // Copy an agent-friendly plain-text worklist of every CURRENTLY-FILTERED
      // profile (not just the on-screen cap) so it can be handed off.
      window.pmQualityCopy = function () {
        var assessed = _pmQAssessAll();
        var f = _pmQReadFilters();
        var rows = assessed.filter(function (x) { return _pmQMatches(x, f); }).sort(_pmQWeakestSort);

        if (!rows.length) { if (typeof window._showToast === 'function') window._showToast('No profiles to copy'); return; }

        var lines = ['PolitiDex — Profile worklist (weakest first) — ' + rows.length + ' profile' + (rows.length === 1 ? '' : 's'), ''];
        rows.forEach(function (x, i) {
          var p = x.p;
          var where = [p.office || '', p.district || '', p.state || ''].filter(Boolean).join(' · ') || '—';
          lines.push((i + 1) + '. ' + (p.name || x.id) + '  [' + x.a.score + '%]  (id: ' + x.id + ')');
          lines.push('   ' + where + (p.reviewStatus ? '  · status: ' + p.reviewStatus : ''));
          if (x.a.flags.length) {
            x.a.flags.forEach(function (ff) { lines.push('   - [' + ff.severity + '] ' + ff.label + ' → ' + ff.fix); });
          } else {
            lines.push('   - No weak spots detected.');
          }
          lines.push('');
        });
        var text = lines.join('\n');

        function done() { if (typeof window._showToast === 'function') window._showToast('Copied worklist for ' + rows.length + ' profile' + (rows.length === 1 ? '' : 's')); }
        function fallback() {
          try {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy'); document.body.removeChild(ta); done();
          } catch (e) { if (typeof window._showToast === 'function') window._showToast('Copy failed — see console'); try { console.log(text); } catch (e2) {} }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(fallback);
        } else { fallback(); }
      };

      // Toggle the quality panel; mirrors the coverage toggle's button styling.
      window.pmToggleQuality = function (force) {
        var panel = document.getElementById('pm-quality-panel');
        if (!panel) return;
        var show = (typeof force === 'boolean') ? force : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !show);
        var btn = document.getElementById('pm-quality-btn');
        var lbl = document.getElementById('pm-quality-label');
        if (lbl) lbl.textContent = show ? 'Hide Quality' : 'Quality & Weak Spots';
        if (btn) {
          if (show) { btn.classList.add('bg-purple-500/20', 'border-purple-400/70', 'text-purple-200'); btn.classList.remove('bg-navy-900'); }
          else { btn.classList.remove('bg-purple-500/20', 'border-purple-400/70', 'text-purple-200'); btn.classList.add('bg-navy-900'); }
        }
        if (show) {
          window.pmRenderQuality();
          try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
        }
      };

      // Render the list as soon as the controller loads (PROFILES may already be
      // populated). The admin gate also calls pmRenderList() when it reveals the
      // section, so the admin always sees a current list.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { window.pmRenderList(); });
      } else {
        window.pmRenderList();
      }
    })();
  
