/* ─────────────────────────────────────────────────────────────────────────────
   PolitiDex — THE WEALTH DISCLOSURE BLOCK (/money's second section)
   ─────────────────────────────────────────────────────────────────────────────

   WHAT THIS FILE IS. The Wealth Transparency board — net worth before office
   against net worth now, per person, with a sparkline, a source link and the
   disclaimer that says what the difference does and does not mean. It was an
   inline <script> in the body of index.html, under a #wealth-leaderboard
   section on the front page. Both halves moved to /money: the markup is in
   money.html, this is the controller, and the front page keeps a door.

   WHY IT IS ON /money AND NOT ON THE FRONT PAGE. A reader who wants to know
   what a representative is worth is asking a money question, and /money is
   where money questions have an address. The front page was answering it as
   one section among twenty, which meant every visitor downloaded and parsed
   this board to look up who represents them, and a reader who actually wanted
   it had a scroll position rather than something to bookmark.

   IT IS A SECOND BLOCK, NOT A SECOND OPINION ABOUT THE FIRST. /money is one
   page with two blocks and they are two different claims from two different
   archives:

       campaign filings    what a campaign RAISED. FEC and state disclosure
                           filings. Owned by /ftm-data.js, read by
                           finance-lane.js, printed above.
       wealth disclosures  what a person OWNS. Personal financial disclosures,
                           OpenSecrets. Owned by this file, printed below.

   AMOUNTS RAISED AND AMOUNTS OWNED ARE NOT THE SAME CLAIM, and this file is
   the wall between them:

     · NOTHING HERE FEEDS THE 💰 CHIP, OR ANY FIGURE IN THE FILINGS BLOCK. The
       letterhead chip on a person file, the composition read, the largest
       reported source and the coverage sentence are all finance-lane.js's,
       computed off /ftm-data.js and nothing else. This file publishes no
       accessor, attaches nothing to a profile, and is not named by
       finance-lane.js, money-room.js or ftm-data.js. It reads no filing and no
       filing reads it. Delete this file and every campaign finance figure on
       the site is byte-identical.
     · IT IS NOT A GRADE, AND THE BLOCK SAYS SO WHERE A READER WILL SEE IT. The
       two tabs sort one list two ways and the badges name a magnitude, not a
       verdict: the disclaimer directly under the heading is the first thing in
       the section after its own title, and it says in its own words that net
       worth change alone does not prove integrity or corruption. Growth can be
       a business, an investment, an inheritance or a market.
     · IT IS AN INPUT TO NOTHING. No Direction Match, no Word vs Action, no
       pattern tier, no publication floor, no ballot sort, no Your Match, no
       cross-person ordering anywhere else on the site. The sort here orders
       this list on this screen and ends there. finance-lane.js's NEVER_FEEDS
       wall says the same thing about filings; this is the same posture for the
       other archive, and neither wall is restated in the other's words.
     · NO LIVE FETCH. Ten hand-entered records with a source link each. Nothing
       here calls OpenSecrets, the FEC or any other host.

   THE MOUNT GATE. renderWealthLeaderboard() returns the moment there is no
   #wl-grid on the document, which is the same rule /ftm-data.js's renderer
   follows: a module that assumes its mount throws on every document that does
   not have one. That is what makes this file safe to precache, safe to load
   early, and safe to link from a document that has not been written yet.

   THE THREE CONTROLS IN A CARD THAT DO NOT LIVE ON /money. Each card is
   written with onclick="openMediumModal(…)", a "View Full Profile →" button
   calling showProfile(…) and a share glyph calling pdxSharePolitician(…) —
   three functions that only exist inside profiles-full.js and compare-hub.js,
   1.4 MB of homepage engine this room does not ship. The card markup is NOT
   rewritten here to address them differently: money-room.js re-homes them, for
   this grid exactly as it already did for the filings grid, onto the person's
   real address /p/<pid>#money, and hides the two with no standalone
   equivalent. One owner for "what happens when a money card is clicked", and
   it is not this file.

   WHAT DID NOT COME WITH IT. The retired front-page Follow the Money
   LEADERBOARD — five cards ranked #1–#5 with a hand-set 0-100 "integrity"
   number under each — is not here and is not anywhere. It was deleted in the
   same pass that moved this block, not relocated: it was the Constituents-First
   grade the finance lane retired, wearing a different name.
   ───────────────────────────────────────────────────────────────────────────── */

(function() {
  const WEALTH_DATA = [
    { id:'trump',     name:'Donald Trump',         office:'President',                    photo:'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/500px-Donald_Trump_official_portrait.jpg',   unit:'B', before:4.5, current:6.5, blurb:'Largest absolute dollar gain of any sitting president in modern history. Business empire grew while shaping trade and tax policy.', source:'https://www.opensecrets.org/', sparkHistory:[4.5,4.7,5.0,5.3,5.6,5.9,6.2,6.5] },
    { id:'cox',       name:'Spencer Cox',          office:'Governor · Utah',              photo:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Spencer_Cox_official_photo.jpg/440px-Spencer_Cox_official_photo.jpg',     unit:'M', before:1.2, current:2.8, blurb:'Net worth more than doubled since taking office. Real estate holdings in booming Utah market raise questions.', source:'https://www.opensecrets.org/', sparkHistory:[1.2,1.4,1.6,1.9,2.1,2.3,2.5,2.8] },
    { id:'lee',       name:'Mike Lee',             office:'U.S. Senator · Utah',          photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/L000577.jpg', unit:'M', before:0.8, current:1.8, blurb:'More than doubled net worth during Senate tenure. Book deals and speaking fees alongside policy votes.', source:'https://www.opensecrets.org/', sparkHistory:[0.8,0.9,1.0,1.1,1.3,1.5,1.6,1.8] },
    { id:'curtis',    name:'John Curtis',          office:'U.S. Senator · Utah',          photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/C001114.jpg',           unit:'M', before:2.1, current:3.2, blurb:'Significant growth tied to commercial real estate in Utah County market.', source:'https://www.opensecrets.org/', sparkHistory:[2.1,2.3,2.4,2.6,2.7,2.9,3.0,3.2] },
    { id:'massie',    name:'Thomas Massie',        office:'U.S. Representative · KY',     photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/M001184.jpg',     unit:'M', before:1.5, current:3.0, blurb:'Net worth doubled. Farm and tech patent portfolio grew substantially during Congressional service.', source:'https://www.opensecrets.org/', sparkHistory:[1.5,1.7,1.9,2.1,2.3,2.5,2.7,3.0] },
    { id:'owens',     name:'Burgess Owens',        office:'U.S. Representative · UT',     photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/O000086.jpg',     unit:'M', before:3.5, current:4.6, blurb:'Moderate growth rate. Media appearances and book sales contribute to wealth alongside Congressional salary.', source:'https://www.opensecrets.org/', sparkHistory:[3.5,3.7,3.8,4.0,4.1,4.3,4.4,4.6] },
    { id:'maloy',     name:'Celeste Maloy',        office:'U.S. Representative · UT',     photo:'https://bioguide.congress.gov/bioguide/photo/M/M001228.jpg',     unit:'M', before:0.6, current:1.0, blurb:'Relatively modest growth since taking office. Among the lower-wealth members of the Utah delegation.', source:'https://www.opensecrets.org/', sparkHistory:[0.6,0.65,0.7,0.75,0.8,0.85,0.9,1.0] },
    { id:'kennedy',   name:'Mike Kennedy',         office:'Congressional Candidate · UT', photo:'https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/450x550/K000403.jpg', unit:'M', before:2.0, current:2.9, blurb:'Medical practice and investments grew during political career. State legislature service preceded Congressional bid.', source:'https://www.opensecrets.org/', sparkHistory:[2.0,2.1,2.2,2.4,2.5,2.6,2.7,2.9] },
    { id:'bilzerian', name:'Dan Bilzerian',        office:'Candidate · FL-06',            photo:'',                                                                                                                                       unit:'M', before:100, current:30,  blurb:'Rare case of massive wealth decline. Lost ~$70M before entering politics — poker and lifestyle brand losses.', source:'https://www.opensecrets.org/', sparkHistory:[100,90,80,65,55,45,38,30] },
    { id:'gallrein',  name:'Ed Gallrein',          office:'Republican Nominee · KY-04',   photo:'',           unit:'M', before:1.8, current:2.5, blurb:'Family farm and restaurant business grew moderately. Growth largely tracks regional economic trends.', source:'https://www.opensecrets.org/', sparkHistory:[1.8,1.9,2.0,2.1,2.2,2.3,2.4,2.5] },
  ];

  WEALTH_DATA.forEach(p => {
    p.dollarChange = p.current - p.before;
    p.pctChange = ((p.current - p.before) / p.before) * 100;
  });

  let currentTab = 'gainers';
  let currentSort = 'dollar';

  function fmt$(val, unit) {
    if (Math.abs(val) >= 1000) return '$' + (val/1000).toFixed(1) + (unit === 'B' ? 'T' : 'B');
    return '$' + val.toFixed(1) + unit;
  }

  function getStatusInfo(pct, tab) {
    if (tab === 'integrity') {
      if (pct <= 0)  return { label:'Declining Wealth', color:'#4ade80', bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.3)', stripe:'linear-gradient(90deg,#16a34a,#4ade80)' };
      if (pct <= 40) return { label:'Modest Growth', color:'#86efac', bg:'rgba(134,239,172,0.10)', border:'rgba(134,239,172,0.25)', stripe:'linear-gradient(90deg,#15803d,#86efac)' };
      if (pct <= 80) return { label:'Moderate Change', color:'#fbbf24', bg:'rgba(251,191,36,0.10)', border:'rgba(251,191,36,0.25)', stripe:'linear-gradient(90deg,#78350f,#fbbf24)' };
      return { label:'High Growth', color:'#fb923c', bg:'rgba(251,146,60,0.10)', border:'rgba(251,146,60,0.25)', stripe:'linear-gradient(90deg,#9a3412,#fb923c)' };
    }
    if (pct > 80) return { label:'Potential Red Flag', color:'#f87171', bg:'rgba(248,113,113,0.12)', border:'rgba(248,113,113,0.3)', stripe:'linear-gradient(90deg,#991b1b,#f87171)' };
    if (pct > 40) return { label:'Worth Watching', color:'#fb923c', bg:'rgba(251,146,60,0.12)', border:'rgba(251,146,60,0.3)', stripe:'linear-gradient(90deg,#9a3412,#fb923c)' };
    if (pct > 0)  return { label:'Moderate Change', color:'#fbbf24', bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.3)', stripe:'linear-gradient(90deg,#78350f,#fbbf24)' };
    return { label:'Low Growth', color:'#4ade80', bg:'rgba(74,222,128,0.12)', border:'rgba(74,222,128,0.3)', stripe:'linear-gradient(90deg,#16a34a,#4ade80)' };
  }

  function buildSparklineSVG(data, color) {
    if (!data || data.length < 2) return '';
    const w = 80, h = 24, pad = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x},${y}`;
    }).join(' ');
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="spk-${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0.0"/></linearGradient></defs>
      <polygon points="${pad},${h - pad} ${pts} ${w - pad},${h - pad}" fill="url(#spk-${color.replace('#','')})" />
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function buildWealthCard(p, rank) {
    const s = getStatusInfo(p.pctChange, currentTab);
    const sign = p.pctChange >= 0 ? '+' : '';
    const dollarSign = p.dollarChange >= 0 ? '+' : '';
    const icon = currentTab === 'integrity'
      ? (p.pctChange <= 0 ? '🟢' : p.pctChange <= 40 ? '🟢' : p.pctChange <= 80 ? '🟡' : '🟠')
      : (p.pctChange > 80 ? '🔴' : p.pctChange > 40 ? '🟠' : p.pctChange > 0 ? '🟡' : '🟢');
    const accentColor = currentTab === 'integrity' ? '#4ade80' : '#f87171';
    const btnBg = currentTab === 'integrity' ? 'rgba(74,222,128,0.85)' : 'rgba(192,21,42,0.85)';
    const btnHover = currentTab === 'integrity' ? '#22c55e' : '#d91a31';

    return `<div class="dir-card card-holo bg-gradient-to-br from-navy-700 to-navy-800 rounded-2xl border border-white/8 overflow-hidden animate-on-scroll" onclick="openMediumModal('${p.id}', event)" style="cursor:pointer;transition-delay:${rank*0.06}s;">
      <div style="height:3px;background:${s.stripe};"></div>
      <div class="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 border-b border-white/5">
        <div style="display:flex;gap:0.75rem;margin-bottom:0.75rem;align-items:flex-start;">
          <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,0.14);background:rgba(30,53,96,0.5);box-shadow:0 4px 14px rgba(0,0,0,0.4);">
            ${p.photo ? `<img loading="lazy" decoding="async" src="${p.photo}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;object-position:top;" onerror="this.parentElement.innerHTML='<div style=\\'display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));\\'>🏛</div>'">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;background:linear-gradient(135deg,rgba(30,53,96,0.7),rgba(10,15,30,0.8));">🏛</div>`}
          </div>
          <div style="flex:1;min-width:0;">
            <div class="font-display text-xl sm:text-2xl tracking-wider text-white leading-tight">${p.name}</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.68rem;letter-spacing:0.09em;text-transform:uppercase;color:#7596c0;margin-top:0.15rem;">${p.office}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-family:'Bebas Neue',sans-serif;font-size:2.2rem;line-height:1;color:${s.color};">${sign}${Math.abs(p.pctChange).toFixed(0)}%</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">Change</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">
          <span style="display:inline-flex;align-items:center;gap:0.25rem;background:${s.bg};border:1px solid ${s.border};color:${s.color};font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.18rem 0.5rem;border-radius:999px;">${icon} ${s.label}</span>
          <span style="display:inline-flex;align-items:center;background:rgba(22,39,74,0.8);border:1px solid rgba(159,180,212,0.18);color:#9fb4d4;font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;padding:0.18rem 0.5rem;border-radius:999px;">🏅 #${rank + 1}</span>
        </div>
      </div>
      <div class="px-4 py-3 sm:px-5 sm:py-4">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;">
          <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;">Before Office</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.35rem;color:#9fb4d4;line-height:1;">${fmt$(p.before, p.unit)}</div>
          </div>
          <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;">Current Net Worth</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.35rem;color:white;line-height:1;">${fmt$(p.current, p.unit)}</div>
          </div>
        </div>
        <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;">$ Change</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:${s.color};line-height:1;">${dollarSign}${fmt$(Math.abs(p.dollarChange), p.unit)}</div>
          </div>
          <div style="height:28px;width:1px;background:rgba(255,255,255,0.08);"></div>
          <div style="text-align:right;">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;margin-bottom:0.2rem;">% Change</div>
            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:${s.color};line-height:1;">${sign}${Math.abs(p.pctChange).toFixed(1)}%</div>
          </div>
        </div>
        <!-- Sparkline -->
        <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.5rem 0.75rem;margin-bottom:0.75rem;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:#7596c0;">Wealth Trend</div>
          ${buildSparklineSVG(p.sparkHistory, s.color)}
        </div>
        <!-- Why This Matters -->
        <div style="background:rgba(10,15,30,0.5);border:1px solid rgba(255,255,255,0.06);border-radius:0.625rem;padding:0.6rem 0.75rem;margin-bottom:0.75rem;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.55rem;letter-spacing:0.1em;text-transform:uppercase;color:${accentColor};margin-bottom:0.3rem;">Why This Matters</div>
          <div style="font-family:'Barlow',sans-serif;font-size:0.72rem;color:#9fb4d4;line-height:1.5;">${p.blurb}</div>
        </div>
        <!-- Source -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
          <a href="${p.source}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();" style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;letter-spacing:0.08em;text-transform:uppercase;color:#7596c0;text-decoration:none;display:inline-flex;align-items:center;gap:0.3rem;transition:color 0.2s;" onmouseenter="this.style.color='${accentColor}'" onmouseleave="this.style.color='#7596c0'">📄 Source: OpenSecrets / FEC</a>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:stretch;">
          <button style="flex:1;min-width:0;background:${btnBg};color:white;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.7rem;letter-spacing:0.12em;text-transform:uppercase;padding:0.6rem;border-radius:0.625rem;border:none;cursor:pointer;transition:all 0.2s;" onmouseenter="this.style.background='${btnHover}'" onmouseleave="this.style.background='${btnBg}'" onclick="showProfile('${p.id}', event)">View Full Profile →</button>
          <button class="pdx-act-share" onclick="event.stopPropagation();window.pdxSharePolitician('${p.id}',event)" aria-label="Share this profile" title="Share this profile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg></button>
        </div>
      </div>
    </div>`;
  }

  function normalizeForDollarSort(p) {
    return p.unit === 'B' ? p.dollarChange * 1000 : p.dollarChange;
  }

  function renderWealthLeaderboard() {
    // THE MOUNT GATE. No #wl-grid means this document does not carry the
    // block, and a module that assumes its mount throws on every page that
    // does not have one. Same rule /ftm-data.js's grid renderer follows.
    const grid = document.getElementById('wl-grid');
    if (!grid) return;

    const sorted = [...WEALTH_DATA].sort((a, b) => {
      if (currentTab === 'gainers') {
        return currentSort === 'pct'
          ? b.pctChange - a.pctChange
          : normalizeForDollarSort(b) - normalizeForDollarSort(a);
      }
      return currentSort === 'pct'
        ? a.pctChange - b.pctChange
        : normalizeForDollarSort(a) - normalizeForDollarSort(b);
    });
    grid.innerHTML = sorted.map((p, i) => buildWealthCard(p, i)).join('');

    const count = document.getElementById('wl-count');
    if (count) count.textContent = sorted.length + ' politicians tracked';

    // The five controls are painted, not queried: the tabs and the two sort
    // buttons carry no state of their own, so a document that ships the grid
    // without the control bar still gets a correct list. Each is optional for
    // the same reason the grid is not.
    const tabG = document.getElementById('wl-tab-gainers');
    const tabI = document.getElementById('wl-tab-integrity');
    const ctrlBar = document.getElementById('wl-controls-bar');
    const sortPct = document.getElementById('wl-sort-pct');
    const sortDollar = document.getElementById('wl-sort-dollar');
    if (!tabG || !tabI || !ctrlBar || !sortPct || !sortDollar) return;

    if (currentTab === 'gainers') {
      tabG.style.background = 'rgba(248,113,113,0.15)';
      tabG.style.borderColor = 'rgba(248,113,113,0.4)';
      tabG.style.color = '#f87171';
      tabI.style.background = 'transparent';
      tabI.style.borderColor = 'rgba(255,255,255,0.08)';
      tabI.style.color = '#7596c0';
      ctrlBar.style.borderTopColor = 'rgba(248,113,113,0.4)';
      if (currentSort === 'pct') {
        sortPct.style.background = 'rgba(248,113,113,0.18)';
        sortPct.style.borderColor = 'rgba(248,113,113,0.35)';
        sortPct.style.color = '#f87171';
        sortDollar.style.background = 'transparent';
        sortDollar.style.borderColor = 'rgba(255,255,255,0.1)';
        sortDollar.style.color = '#7596c0';
      } else {
        sortDollar.style.background = 'rgba(248,113,113,0.18)';
        sortDollar.style.borderColor = 'rgba(248,113,113,0.35)';
        sortDollar.style.color = '#f87171';
        sortPct.style.background = 'transparent';
        sortPct.style.borderColor = 'rgba(255,255,255,0.1)';
        sortPct.style.color = '#7596c0';
      }
    } else {
      tabI.style.background = 'rgba(74,222,128,0.15)';
      tabI.style.borderColor = 'rgba(74,222,128,0.4)';
      tabI.style.color = '#4ade80';
      tabG.style.background = 'transparent';
      tabG.style.borderColor = 'rgba(255,255,255,0.08)';
      tabG.style.color = '#7596c0';
      ctrlBar.style.borderTopColor = 'rgba(74,222,128,0.4)';
      if (currentSort === 'pct') {
        sortPct.style.background = 'rgba(74,222,128,0.18)';
        sortPct.style.borderColor = 'rgba(74,222,128,0.35)';
        sortPct.style.color = '#4ade80';
        sortDollar.style.background = 'transparent';
        sortDollar.style.borderColor = 'rgba(255,255,255,0.1)';
        sortDollar.style.color = '#7596c0';
      } else {
        sortDollar.style.background = 'rgba(74,222,128,0.18)';
        sortDollar.style.borderColor = 'rgba(74,222,128,0.35)';
        sortDollar.style.color = '#4ade80';
        sortPct.style.background = 'transparent';
        sortPct.style.borderColor = 'rgba(255,255,255,0.1)';
        sortPct.style.color = '#7596c0';
      }
    }
  }

  window.setWealthTab = function(tab) {
    currentTab = tab;
    renderWealthLeaderboard();
  };

  window.setWealthSort = function(mode) {
    currentSort = mode;
    renderWealthLeaderboard();
  };

  window.setWealthFilter = function(mode) {
    currentTab = mode;
    renderWealthLeaderboard();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderWealthLeaderboard);
  } else {
    renderWealthLeaderboard();
  }
})();
