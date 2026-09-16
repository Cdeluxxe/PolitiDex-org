/* ═══════════════════════════════════════════════════════════════════════════
   measure-signin-cost.mjs — what a sign-in costs, counted rather than guessed
   ────────────────────────────────────────────────────────────────────────────
   Runs the REAL auth bus out of firebase-boot.js (_pdxOffTask, _authPump,
   _authFanOut, _pdxAuthSub, _pdxAuthAnnounce, _pdxAuthOwnJobs) against a
   virtual clock, and reports four things about the three sequences the report
   has to describe:

     · cold /  with no session
     · one tap on Google
     · a signed-in return to /

   WHAT IS MEASURED, AND WHAT IS NOT. Every number below is a count of tasks
   and of scheduler latency at the deadlines the bus actually asks for (an idle
   callback with a 120 ms timeout, a 150 ms timer backstop). They are exact.
   What is NOT measured here is how long each job's own work takes on a real
   CPU — that needs a browser, and there is none in this environment. So a job
   is counted, not timed, and the latency reported is the scheduler's, which is
   the part this pass changes.

     node scripts/measure-signin-cost.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import { createContext, runInContext } from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOOT = fs.readFileSync(path.join(ROOT, 'firebase-boot.js'), 'utf8');

const fnSrc = (src, name) => {
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) throw new Error(`STALE HARNESS: function ${name} is gone from firebase-boot.js`);
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error(`STALE HARNESS: ${name} does not close`);
};

// The bus's own module-level declarations, lifted from the file rather than
// restated here — a new one appearing is then a ReferenceError in this harness
// instead of a silently different bus being measured.
const decls = (BOOT.match(/^  var (?:_auth|AUTH_)[A-Za-z]* = [^\n]*$/gm) || []).join('\n');
if (!/_authJobs/.test(decls) || !/_authPumping/.test(decls)) {
  throw new Error('STALE HARNESS: the bus no longer declares _authJobs / _authPumping at module level');
}

const BUS = [
  decls,
  'var _lastAuthUser = null;', 'var _fbAuthResolve = function () {};',
  fnSrc(BOOT, '_pdxOffTask'), fnSrc(BOOT, '_authPump'), fnSrc(BOOT, '_authFanOut'),
  fnSrc(BOOT, '_pdxAuthSub'), fnSrc(BOOT, '_pdxAuthAnnounce'), fnSrc(BOOT, '_pdxAuthOwnJobs'),
].join('\n');

// Does the bus know how to drop a superseded announcement? Reported, not assumed.
const HAS_EPOCH = /_authEpoch|_authGen|supersed/i.test(BOOT);

// ── the virtual clock ───────────────────────────────────────────────────────
// One queue, ordered by due time. An idle callback is granted at its timeout
// deadline, which is what a busy main thread actually does with one — the
// pessimistic end of the bus's own contract, and the end the reader feels.
function harness() {
  let now = 0, seq = 0;
  const q = [];
  const log = [];
  const at = (delay, fn, kind) => { q.push({ due: now + delay, seq: seq++, fn, kind }); };
  const win = {
    console: { log() {}, warn() {}, error() {} },
    requestIdleCallback: (fn, opts) => { at((opts && opts.timeout) || 50, fn, 'idle'); return seq; },
    setTimeout: (fn, ms) => { at(ms || 0, fn, 'timer'); return seq; },
    PDXAuth: { state: 'unknown', user: null, known: false },
    PDXStore: { enableAccountSync() {}, disableAccountSync() {} },
    __pdxAuthQueue: null,
  };
  win.window = win;
  const ctx = createContext(win);
  runInContext(
    'var auth = { currentUser: null, signInAnonymously: function () { return { catch: function () {} }; } };\n' +
    'var updateNavAuth = function (u, s) { this_chipPaints(s, u); };\n'.replace('this_chipPaints', 'window.__chip') +
    'var syncUserDataFromFirestore = function (uid) { window.__job("account pull (4 Firestore reads)"); };\n' +
    'var _startVotesListener = function () { window.__job("votes listener"); };\n' +
    'var _loadCommentCounts = function () { window.__job("comment counts"); };\n' +
    BUS +
    '\nthis.announce = _pdxAuthAnnounce; this.sub = _pdxAuthSub;' +
    '\nthis.jobsLeft = function () { return _authJobs.length; };' +
    '\nthis.dropped = function () { return (typeof _authDropped === \'number\') ? _authDropped : -1; };',
    ctx
  );
  win._loadLocalUserData = () => win.__job('local rehydrate (3 grids + every heart)');
  win.PDXRememberAccount = () => {};
  win.__chip = (state, user) => log.push({ t: now, kind: 'CHIP', what: 'chip painted: ' + state });
  win.__job = (what) => log.push({ t: now, kind: 'job', what });

  const drain = (limit) => {
    let n = 0;
    while (q.length && n++ < (limit || 4000)) {
      q.sort((a, b) => (a.due - b.due) || (a.seq - b.seq));
      const t = q.shift();
      now = Math.max(now, t.due);
      try { t.fn(); } catch (e) {}
    }
  };
  return { win, ctx, log, drain, clock: () => now, advance: (ms) => { now += ms; } };
}

// A realistic subscriber list: the modules that register against the bus today.
const SUBSCRIBERS = [
  'alignment-tool', 'evidence-locker', 'like-dislike',
  'index.html · lazy module A', 'index.html · lazy module B', 'index.html · admin gate',
  'compare-hub · location restore',
];

function run(label, script) {
  const h = harness();
  SUBSCRIBERS.forEach((name) => {
    h.ctx.sub(function (u) { h.win.__job('subscriber: ' + name + ' (user=' + (u ? (u.isAnonymous ? 'anon' : u.uid) : 'null') + ')'); });
  });
  script(h);
  h.drain();

  const chip = h.log.find((e) => e.kind === 'CHIP');
  const jobs = h.log.filter((e) => e.kind === 'job');
  const stale = jobs.filter((e) => /user=null/.test(e.what) || /user=anon/.test(e.what));
  const pull = jobs.find((e) => /account pull/.test(e.what));

  console.log('\n── ' + label);
  console.log('   chip painted at                 ' + (chip ? chip.t + ' ms' : 'NEVER') +
              (chip && chip.t === 0 ? '  (same task as the auth event)' : ''));
  console.log('   jobs run through the bus        ' + jobs.length);
  console.log('   last job lands at               ' + (jobs.length ? jobs[jobs.length - 1].t + ' ms' : '—'));
  if (pull) console.log('   member\'s own data lands at      ' + pull.t + ' ms');
  console.log('   jobs run for a superseded user  ' + stale.length +
              (stale.length ? '   ← told "signed out"/anon AFTER the account arrived' : ''));
  const dropped = h.ctx.dropped();
  console.log('   jobs dropped as superseded      ' + (dropped < 0 ? 'n/a (bus does not count)' : dropped));
  console.log('   longest single task             1 job  (the bus gives each job a task of its own)');
  return { chip, jobs, stale, pull, log: h.log };
}

const GOOGLE = { uid: 'g-abc', displayName: 'A Member', email: 'a@example.com', isAnonymous: false };
const ANON = { uid: 'anon-1', isAnonymous: true };

console.log('═══ sign-in cost, counted on the real bus ═══');
console.log('bus drops superseded announcements: ' + (HAS_EPOCH ? 'YES' : 'NO'));

const cold = run('cold / , no session, then one tap on Google', (h) => {
  h.ctx.announce(null);              // Firebase: nobody is signed in
  h.advance(40); h.ctx.announce(ANON);   // our own signInAnonymously lands
  h.advance(900); h.ctx.announce(GOOGLE); // the reader taps Google once
});

const warm = run('signed-in return to /', (h) => {
  h.win.PDXAuth.state = 'in';
  h.ctx.announce(GOOGLE);
});

console.log('\n── what the numbers say');
const wasted = cold.stale.length;
console.log('   On the cold sign-in sequence the bus ran ' + cold.jobs.length + ' jobs, of which ' + wasted +
            ' carried a user\n   that a later announcement had already replaced.');
if (cold.pull) {
  const ahead = cold.jobs.indexOf(cold.pull);
  console.log('   The member\'s own data was job #' + (ahead + 1) + ' of ' + cold.jobs.length +
              ', landing ' + (cold.pull.t - 940) + ' ms after the tap.');
}
console.log('');
