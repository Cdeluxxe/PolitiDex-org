#!/usr/bin/env node
// test-raw-ingest-video-speech.mjs — the video / speech + transcription path
// on the scheduled raw-ingest run (netlify/lib/raw-ingest-video.mjs), open to
// the whole roster (the allow-list is off by default). The main run plans three
// politicians — Thomas Massie (hand-written configuration), Alexandria
// Ocasio-Cortez and a test member with a verified channel (both derived from
// the roster) — and Massie's behaviour is checked against a Massie-only run.
//
//   node scripts/test-raw-ingest-video-speech.mjs
//
// No network, no database, no AI call: every store, the fetcher and the
// transcriber are in-memory fakes.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const cron = await imp('netlify/functions/raw-ingest-cron.mts');
const transcriber = await imp('netlify/functions/video-transcribe.mts');
const core = await imp('netlify/lib/raw-ingest-core.mjs');
const fresh = await imp('netlify/lib/raw-ingest-fresh.mjs');
const scope = await imp('netlify/lib/raw-ingest-scope.mjs');
const vs = await imp('netlify/lib/raw-ingest-video.mjs');
const vt = await imp('netlify/lib/video-transcripts.mjs');

let failures = 0, passed = 0;
const t = async (name, fn) => {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e) { failures++; console.error('  ✗', name, '\n    ', e.message); }
};
const quiet = async (fn) => {
  const orig = console.log; const lines = [];
  console.log = (...a) => lines.push(a.join(' '));
  try { return { value: await fn(), lines }; } finally { console.log = orig; }
};
const memStore = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return { data,
    async get(k) { return data.has(k) ? JSON.parse(JSON.stringify(data.get(k))) : null; },
    async getWithMetadata(k) { return data.has(k) ? { data: JSON.parse(JSON.stringify(data.get(k))), etag: '1' } : null; },
    async set(k, v) { data.set(k, v); },
    async setJSON(k, v, opts = {}) { if (opts.onlyIfNew && data.has(k)) return { modified: false }; data.set(k, JSON.parse(JSON.stringify(v))); return { modified: true }; },
    async list({ prefix = '' } = {}) { return { blobs: [...data.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
    async delete(k) { data.delete(k); } };
};
const NOW = () => new Date('2026-11-20T16:00:00.000Z');

// ── Fixtures ────────────────────────────────────────────────────────────────
const PAGE = '<html><body><h1>Congressman Thomas Massie</h1>'
  + '<p>I will always vote to cut wasteful federal spending and balance the budget.</p>'
  + '<p>We must protect privacy and end warrantless surveillance of Americans.</p>'
  + '</body></html>';
const VID_FLOOR = 'HjQ1i2PnKF8', VID_POST = 'bZRy5fVe4Yg', VID_FAIL = 'RKmw1lEiyvk';
const FEED = `<?xml version="1.0"?><feed>
<entry><yt:videoId>${VID_FLOOR}</yt:videoId><title>Rep. Massie Speaks on Floor Against Warrantless Surveillance: 11/19/26</title><published>2026-11-19T20:14:49+00:00</published><media:description>Floor speech</media:description></entry>
<entry><yt:videoId>${VID_POST}</yt:videoId><title>Rep. Massie on The Source 11/9/26</title><published>2026-11-10T19:34:14+00:00</published><media:description>Interview</media:description></entry>
<entry><yt:videoId>${VID_FAIL}</yt:videoId><title>Rep. Massie at a Judiciary Committee hearing</title><published>2026-11-08T19:34:14+00:00</published><media:description>Hearing</media:description></entry>
</feed>`;
const CREC_URL = 'https://www.govinfo.gov/content/pkg/CREC-2026-11-19/html/CREC-2026-11-19-pt1-PgH6314.htm';
const CREC_SENATE = 'CREC-2026-11-19-pt1-PgS7000';
const CREC = `<html><body><pre>
[Congressional Record Volume 172, Number 176 (Thursday, November 19, 2026)]
[House]
                              {time}  1250
                     PROTECTING AMERICANS FROM WARRANTLESS SURVEILLANCE

  Mr. MASSIE. Mr. Speaker, I rise in strong opposition to warrantless
surveillance of Americans. We must protect privacy and the Fourth
Amendment. I oppose any reauthorization of FISA section 702 without a
warrant requirement.
  The SPEAKER pro tempore. The gentleman's time has expired.
  Mr. JORDAN. Mr. Speaker, I support the bill and its warrantless searches.
  Mr. MASSIE. I will vote no. Congress must end warrantless spying on Americans.
</pre></body></html>`;
const SEARCH = { results: [
  { packageId: 'CREC-2026-11-19', granuleId: 'CREC-2026-11-19-pt1-PgH6314', title: 'PROTECTING AMERICANS FROM WARRANTLESS SURVEILLANCE', dateIssued: '2026-11-19' },
  { packageId: 'CREC-2026-11-19', granuleId: CREC_SENATE, title: 'SENATE ITEM', dateIssued: '2026-11-19' },
] };
// AOC: a House floor granule in which she never speaks → skipped, not scored.
const AOC_CREC_URL = 'https://www.govinfo.gov/content/pkg/CREC-2026-11-18/html/CREC-2026-11-18-pt1-PgH6200.htm';
const AOC_SEARCH = { results: [{ packageId: 'CREC-2026-11-18', granuleId: 'CREC-2026-11-18-pt1-PgH6200', title: 'MORNING-HOUR DEBATE', dateIssued: '2026-11-18' }] };
const AOC_CREC = `<html><body><pre>
[Congressional Record Volume 172, Number 175 (Wednesday, November 18, 2026)]
[House]
  Mr. JORDAN. Mr. Speaker, I rise to discuss the budget and wasteful spending.
  The SPEAKER pro tempore. The gentleman's time has expired.
</pre></body></html>`;
// A roster politician who has a verified own channel on the roster.
const TEST_PID = 'jane_testperson';
const TEST_CHANNEL = 'UC' + 'T'.repeat(22);
const VID_TEST = 'TsTvIdEo001';
const TEST_FEED = `<?xml version="1.0"?><feed>
<entry><yt:videoId>${VID_TEST}</yt:videoId><title>Jane Testperson town hall on the cost of living</title><published>2026-11-18T20:00:00+00:00</published><media:description>Town hall</media:description></entry>
</feed>`;
// The verified channel is carried the way real roster rows carry one: a
// "youtube" source with its channel_id.
const TEST_ROW = { politician_id: TEST_PID, name: 'Jane Testperson', tier: 1, has_board: true, has_stances: true,
  sources: [
    { politician_id: TEST_PID, topic: 'cost_living', source_type: 'official homepage', source_id: 'known-homepage', url: 'https://testperson.example.org/' },
    { politician_id: TEST_PID, topic: 'cost_living', source_type: 'official YouTube channel', source_class: 'youtube', source_id: 'youtube-channel', channel_id: TEST_CHANNEL, url: `https://www.youtube.com/feeds/videos.xml?channel_id=${TEST_CHANNEL}` },
  ] };
const rosterRow = (pid) => { const r = core.ROSTER.find((x) => x.politician_id === pid); if (!r) throw new Error(`${pid} not on the roster`); return r; };
// AOC trimmed to two official pages so a free slot is left for video/speech
// under the unchanged per-politician cap (with all her pages she fills it).
const AOC_ROW = { ...rosterRow('aoc'), sources: rosterRow('aoc').sources.slice(0, 2) };
const PLANNED_ROSTER = [rosterRow('massie'), AOC_ROW, TEST_ROW];
const json = (v) => ({ ok: true, status: 200, url: '', headers: new Map([['content-type', 'application/json']]), json: async () => v, text: async () => JSON.stringify(v) });
const fetched = [];
const fakeFetch = async (url, init = {}) => {
  const u = String(url);
  fetched.push(u);
  const ok = (body, type = 'text/html') => ({ ok: true, status: 200, url: u, headers: new Map([['content-type', type]]), text: async () => body, json: async () => JSON.parse(body) });
  if (u.includes('youtube.com/feeds/videos.xml')) return ok(u.includes(TEST_CHANNEL) ? TEST_FEED : FEED, 'application/atom+xml');
  if (u.includes('youtube.com/oembed')) return ok(JSON.stringify({ title: 'Rep. Massie video', author_name: 'RepThomasMassie', author_url: 'https://www.youtube.com/@RepThomasMassie' }), 'application/json');
  if (u.startsWith('https://api.govinfo.gov/search')) {
    const q = JSON.parse(init.body || '{}').query || '';
    if (!q.includes('CREC')) return json({ results: [] });
    if (q.includes('member:(Massie)')) return json(SEARCH);
    if (q.includes('member:(Ocasio-Cortez)')) return json(AOC_SEARCH);
    return json({ results: [] });
  }
  if (u === AOC_CREC_URL) return ok(AOC_CREC);
  if (u.startsWith('https://www.govinfo.gov/content/pkg/CREC')) return ok(CREC);
  if (u.startsWith('https://www.googleapis.com/')) throw new Error('the YouTube Data API must not be called without a key');
  return ok(PAGE);
};

// Transcript cache: the floor-speech video has Massie's words; the hearing
// video's transcription failed for good; the interview is not transcribed yet.
const transcriptStore = memStore({
  [vt.cacheKey(VID_FLOOR)]: { video_id: VID_FLOOR, status: 'ok', provider: 'gemini', model: 'test', transcribed_at: '2026-11-20T00:00:00Z', segments: [
    { t: 0, text: 'The gentleman from Kentucky is recognized.', own: false },
    { t: 4, text: 'Mr. Speaker, I rise in strong opposition to warrantless surveillance of Americans.', own: true },
    { t: 12, text: 'We must protect privacy and the Fourth Amendment, and I will vote no on any FISA reauthorization without a warrant requirement.', own: true },
  ] },
  [vt.cacheKey(VID_FAIL)]: { video_id: VID_FAIL, status: 'failed', error: 'provider error', attempts: 3 },
});

const freshRotation = () => memStore({ [core.ROTATION_KEY]: { cycle: 3, done: [], pool_version: core.POOL_VERSION } });
const rotationStore = freshRotation();
const lockerStore = memStore();
const rawStore = memStore();
let woken = 0;
const runOnce = (over = {}) => quiet(() => cron.scheduled({
  fetch: fakeFetch, store: rawStore, lockerStore, rotationStore, transcriptStore,
  suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => { woken++; },
  curatedStances: {}, rotate: { roster: PLANNED_ROSTER },
  videoSpeech: { youtubeKey: '', govinfoKey: 'test-key', per: 3 }, ...over,
}));
const { value: res, lines } = await runOnce();
const report = await res.json();
const isMassie = (pid) => pid === 'massie';
const massieOnly = (xs) => (xs || []).filter((x) => isMassie(x.politician_id));

await t('the allow-list is off by default; Massie keeps his hand-written configuration, others are derived from the roster', () => {
  assert.deepEqual(scope.INGEST_ALLOW_LIST, []);
  assert.deepEqual(vs.VIDEO_SPEECH_ALLOW_LIST, []);
  assert.deepEqual(Object.keys(vs.VIDEO_SPEECH_SOURCES), ['massie']);
  const cfgs = vs.buildVideoSpeechConfigs(PLANNED_ROSTER, { members: [{ slug: 'aoc', name: 'Alexandria Ocasio-Cortez', chamber: 'house', serving119: true }] });
  assert.equal(cfgs.massie, vs.VIDEO_SPEECH_SOURCES.massie, 'Massie uses the hand-written entry as-is');
  assert.equal(cfgs.aoc.chamber, 'house');
  assert.equal(cfgs.aoc.surname, 'Ocasio-Cortez');
  assert.deepEqual(cfgs.aoc.govinfo.collections, ['CREC', 'CHRG']);
  assert.deepEqual(cfgs[TEST_PID].youtube_channels.map((c) => c.channel_id), [TEST_CHANNEL], 'only the verified channel id is used');
  assert.deepEqual(cfgs[TEST_PID].govinfo.collections, [], 'no GovInfo search for a non-federal politician');
  for (const c of Object.values(cfgs)) assert.deepEqual(c.facebook_pages, [], 'no Facebook access configured');
  // The dormant allow-list still narrows the path when given ids.
  assert.deepEqual(Object.keys(vs.buildVideoSpeechConfigs(PLANNED_ROSTER, { allow: ['massie'] })), ['massie']);
});

await t('with the allow-list off, a run plans and processes video/speech for more than one politician', () => {
  assert.ok(report.plan.politicians.length >= 2, `planned ${report.plan.politicians.join(', ')}`);
  for (const pid of ['massie', 'aoc', TEST_PID]) assert.ok(report.plan.politicians.includes(pid), `${pid} planned`);
  assert.deepEqual([...report.video_speech.checked].sort(), ['aoc', 'jane_testperson', 'massie'], 'discovery ran for every planned politician');
  assert.ok(lines.some((l) => l.includes('discovery: QUEUE aoc|') && l.includes(AOC_CREC_URL)), 'AOC floor speech queued');
  assert.ok(lines.some((l) => l.includes(`discovery: QUEUE ${TEST_PID}|`) && l.includes(VID_TEST)), 'test member channel video queued');
  const pulledBy = new Set(report.video_speech.pulled.map((p) => p.politician_id ?? report.included.sources.find((s) => s.url === p.url)?.politician_id));
  assert.ok(pulledBy.size >= 2, `video/speech pulled for ${[...pulledBy].join(', ')}`);
  assert.ok(lines.some((l) => /SKIP aoc YouTube C-SPAN search .*YOUTUBE_API_KEY/.test(l)), 'C-SPAN search without a key is logged and skipped for everyone');
  assert.ok(lines.some((l) => /SKIP aoc Facebook video posts — not available/.test(l)));
});

await t('discovery queues Massie video and speech URLs into the frontier (House floor only, keys never stored)', () => {
  const fr = rotationStore.data.get(fresh.FRONTIER_KEY)?.items?.massie || [];
  const vsEntries = fr.filter(vs.isVideoSpeechEntry);
  assert.ok(lines.some((l) => l.includes(`discovery: QUEUE massie|`) && l.includes(CREC_URL)), 'the floor speech was queued');
  assert.ok(lines.some((l) => l.includes('discovery: QUEUE massie|') && l.includes(VID_FLOOR)), 'the member-channel video was queued');
  assert.ok(!lines.some((l) => l.includes(CREC_SENATE)), 'Senate pages are left out for a House member');
  assert.ok(lines.some((l) => /SKIP massie YouTube C-SPAN search .*YOUTUBE_API_KEY/.test(l)), 'C-SPAN search without a key is logged and skipped');
  assert.ok(lines.some((l) => /SKIP massie Facebook video posts — not available/.test(l)), 'Facebook is logged as unavailable');
  for (const e of vsEntries) assert.ok(!/api_key|key=/.test(e.url), 'no key in a stored URL');
  for (const e of vsEntries) assert.equal(e.speaker_surname, undefined, 'Massie frontier entries keep their earlier shape');
  const all = JSON.stringify([...rotationStore.data.values()]) + JSON.stringify([...rawStore.data.values()]) + JSON.stringify([...lockerStore.data.values()]);
  assert.ok(!all.includes('test-key'), 'the API key is never written to a store');
  assert.ok(!lines.some((l) => l.includes('test-key')), 'the API key is never logged');
});

await t('Massie\'s video/speech behaviour is unchanged when he is one of several planned politicians', async () => {
  // Same fixtures, Massie-only run through the dormant allow-list, fresh stores.
  const solo = await (await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: freshRotation(), transcriptStore: memStore({
      [vt.cacheKey(VID_FLOOR)]: transcriptStore.data.get(vt.cacheKey(VID_FLOOR)), [vt.cacheKey(VID_FAIL)]: transcriptStore.data.get(vt.cacheKey(VID_FAIL)),
    }),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    rotate: { roster: PLANNED_ROSTER }, scope: ['thomas_massie'],
    videoSpeech: { youtubeKey: '', govinfoKey: 'test-key', per: 3 },
  }))).value.json();
  assert.deepEqual(solo.plan.politicians, ['massie']);
  const urls = (r) => massieOnly(r.included.sources).map((s) => s.url).sort();
  assert.deepEqual(urls(report), urls(solo), 'the same Massie pull list');
  const vsUrls = (r) => r.video_speech.pulled.filter((p) => massieOnly(r.included.sources).some((s) => s.url === p.url)).map((p) => `${p.url} ${p.media} ${p.items}`).sort();
  assert.deepEqual(vsUrls(report), vsUrls(solo), 'the same Massie video/speech pulls and outcomes');
  const writes = (r) => massieOnly(r.locker_writes).map((w) => w.key).sort();
  assert.deepEqual(writes(report), writes(solo), 'the same Massie Locker writes');
});

await t('a Massie run includes video and speech sources alongside the official pages, inside the caps', () => {
  const inc = report.included.sources;
  const mine = massieOnly(inc);
  const media = mine.filter((s) => s.media);
  assert.ok(media.some((s) => s.media === 'video'), 'a video source is in the pull list');
  assert.ok(media.some((s) => s.media === 'speech' && s.url === CREC_URL), 'the floor speech is in the pull list');
  assert.ok(mine.some((s) => s.url === 'https://massie.house.gov'), 'the official homepage is still pulled');
  assert.ok(mine.some((s) => /massie\.house\.gov\/news\/documentsingle/.test(s.url)), 'the official House press release is still pulled');
  for (const pid of report.plan.politicians) assert.ok(inc.filter((s) => s.politician_id === pid).length <= core.MAX_SOURCES_PER_POLITICIAN, `per-politician cap holds (${pid})`);
  assert.ok(inc.length <= core.MAX_SOURCES_PER_RUN, 'per-run cap holds');
});

await t('the floor speech is scored on Massie\'s own turns and writes a clear-position Locker item', () => {
  const rk = [...rawStore.data.keys()].find((k) => rawStore.data.get(k)?.url === CREC_URL);
  assert.ok(rk, 'a raw record was stored for the floor speech');
  const rec = rawStore.data.get(rk);
  assert.equal(rec.type, 'speech');
  assert.ok(!/JORDAN|support the bill/i.test(rec.body), 'another member\'s turn is not in the body');
  assert.ok(/warrantless/.test(rec.body));
  const row = report.video_speech.pulled.find((p) => p.url === CREC_URL);
  assert.ok(row && row.media === 'speech' && row.items >= 1, `outcome: ${row?.outcome}`);
  const items = [...lockerStore.data.values()].filter((i) => i.link === CREC_URL || i.url === CREC_URL);
  assert.ok(items.some((i) => i.strength === 'strong' || i.strength === 'weak'), 'a clear-position item came from the speech');
});

await t('a floor speech with no speaking turn by the politician is skipped: nothing stored, nothing scored', () => {
  assert.ok(report.included.sources.some((s) => s.url === AOC_CREC_URL), 'the AOC floor granule was pulled');
  assert.ok(lines.some((l) => l.includes(`SPEECH SKIP aoc ${AOC_CREC_URL}`) && /no speaking turn by Alexandria Ocasio-Cortez/.test(l)), 'the skip is logged');
  assert.ok(![...rawStore.data.values()].some((r) => r?.url === AOC_CREC_URL), 'no raw record for it');
  assert.ok(![...lockerStore.data.values()].some((i) => i.link === AOC_CREC_URL || i.url === AOC_CREC_URL), 'no Locker item from it');
});

await t('the transcribed video is scored (own words only) and writes to the Locker with a timestamped link', () => {
  const row = report.video_speech.pulled.find((p) => p.url.includes(VID_FLOOR));
  assert.ok(row, 'the video was pulled');
  assert.equal(row.media, 'video');
  assert.ok(row.items >= 1, `outcome: ${row.outcome}`);
  const items = [...lockerStore.data.values()].filter((i) => String(i.link || '').includes(VID_FLOOR));
  assert.ok(items.length, 'a Locker item cites the video');
  assert.ok(items.some((i) => /&t=\d+s/.test(i.link)), 'the citation links to the moment the words are spoken');
});

await t('cross-topic scoring still runs on video/speech records', () => {
  assert.ok(Object.keys(report.topics.candidates).length >= 2, JSON.stringify(report.topics.candidates));
});

await t('an untranscribed video from a newly opened politician is queued for the background transcriber without blocking the run', () => {
  assert.ok(transcriptStore.data.has(vt.queueKey(VID_TEST)), 'the test member video is queued for the background transcriber');
  assert.ok(woken >= 1, 'the background transcriber was woken');
  assert.ok(report.results.some((r) => r.ok && r.url === 'https://massie.house.gov'), 'the rest of the run still completed');
});

await t('a failed transcription is logged and skipped without blocking the run; an untranscribed video is queued', () => {
  const failed = report.video_speech.pulled.find((p) => p.url.includes(VID_FAIL));
  const pending = report.video_speech.pulled.find((p) => p.url.includes(VID_POST));
  if (failed) assert.match(failed.outcome, /skipped/);
  if (pending) { assert.ok(pending.queued); assert.ok(transcriptStore.data.has(vt.queueKey(VID_POST)), 'queued for the background transcriber'); }
  assert.ok(report.results.some((r) => r.ok && r.url === 'https://massie.house.gov'), 'the official homepage still stored');
  assert.ok(lines.some((l) => l.startsWith('raw-ingest: video/speech — ')), 'the summary line is logged');
  assert.ok(lines.some((l) => /^raw-ingest: video\/speech massie \[(video|speech) · /.test(l)), 'each source logs its type');
});

await t('a second run within the hour does not rediscover anyone, still pulls remaining frontier entries, and finishes the queue', async () => {
  const { value: r2, lines: l2 } = await runOnce();
  const rep2 = await r2.json();
  assert.deepEqual(rep2.video_speech.checked, [], 'discovery is throttled for every politician');
  for (const pid of ['massie', 'aoc', TEST_PID]) assert.ok(l2.some((l) => l.startsWith(`video/speech discovery: ${pid} — checked 0 min ago`)), `${pid} cooldown logged`);
  const all = [...report.video_speech.pulled, ...rep2.video_speech.pulled].map((p) => p.url);
  assert.ok(all.some((u) => u.includes(VID_FAIL)), 'the failed-transcription video was reached');
  const failed = [...report.video_speech.pulled, ...rep2.video_speech.pulled].find((p) => p.url.includes(VID_FAIL));
  assert.match(failed.outcome, /transcription failed|skipped/);
  // Once the hour has passed, each politician is discovered again (the stored
  // discovery times are moved back past the interval).
  const st = rotationStore.data.get(vs.VIDEO_SPEECH_STATE_KEY);
  const past = new Date(Date.now() - vs.VIDEO_DISCOVERY_INTERVAL_MS - 60_000).toISOString();
  rotationStore.data.set(vs.VIDEO_SPEECH_STATE_KEY, { ...st, last: Object.fromEntries(Object.keys(st.last).map((k) => [k, past])) });
  const { value: r3 } = await runOnce();
  const rep3 = await r3.json();
  assert.deepEqual([...rep3.video_speech.checked].sort(), ['aoc', 'jane_testperson', 'massie']);
});

await t('at the default limit, at most 2 video/speech sources per politician join a run and at most 2 per politician are added', async () => {
  assert.equal(vs.VIDEO_SPEECH_PER_POLITICIAN, 2);
  const mk = (pid, n) => Array.from({ length: n }, (_, i) => ({ politician_id: pid, topic: 'cost_living', source_type: 'official floor speech (Congressional Record)', source_class: 'floor_speech',
    source_id: `fresh-vs-${pid}-${i}`, url: `https://www.govinfo.gov/content/pkg/CREC-2026-11-1${i}/html/${pid}-${i}.htm`, published: `2026-11-1${i}`, found_at: NOW().toISOString(), rank: 7 }));
  const fr = { frontier: { massie: mk('massie', 5), aoc: mk('aoc', 5), [TEST_PID]: mk(TEST_PID, 5) }, seen: {} };
  const configs = vs.buildVideoSpeechConfigs(PLANNED_ROSTER);
  const r = vs.addVideoSpeechSources([], fr, { configs, politicians: ['massie', 'aoc', TEST_PID], max: core.MAX_SOURCES_PER_RUN, perPolitician: core.MAX_SOURCES_PER_POLITICIAN, log: () => {} });
  for (const pid of ['massie', 'aoc', TEST_PID]) assert.equal(r.added.filter((x) => x.politician_id === pid).length, 2, `${pid}: 2 added`);
  // The scheduled run at its default limit, full roster plan.
  const { value: rd } = await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: freshRotation(), transcriptStore: memStore(),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    rotate: { roster: PLANNED_ROSTER }, videoSpeech: { youtubeKey: '', govinfoKey: 'test-key' },
  }));
  const repd = await rd.json();
  assert.ok(repd.plan.politicians.length >= 2);
  assert.ok(repd.included.sources.some((s) => s.media), 'video/speech sources did join the run');
  for (const pid of repd.plan.politicians) {
    const n = repd.included.sources.filter((s) => s.politician_id === pid && s.media).length;
    assert.ok(n <= 2, `${pid}: ${n} video/speech sources in one run`);
  }
});

await t('a derived C-SPAN search keeps only clips whose title names the politician', async () => {
  const fr = { frontier: {}, seen: {} };
  const ytFetch = async (url) => {
    const u = String(url);
    if (u.startsWith('https://www.googleapis.com/youtube/v3/search')) return json({ items: [
      { id: { videoId: 'CsPaNaOc001' }, snippet: { title: 'Rep. Ocasio-Cortez Questions Witnesses at Oversight Hearing', publishedAt: '2026-11-17T00:00:00Z' } },
      { id: { videoId: 'CsPaNoTh002' }, snippet: { title: 'House Session on Appropriations', publishedAt: '2026-11-16T00:00:00Z' } },
    ] });
    return json({ results: [] });
  };
  const configs = vs.buildVideoSpeechConfigs([AOC_ROW]);
  const d = await vs.discoverVideoSpeech({ politicians: ['aoc'], configs, fresh: fr, fetch: ytFetch, state: { last: {} }, govinfoKey: '', youtubeKey: 'yk', mergeFrontier: fresh.mergeFrontier, log: () => {} });
  const urls = (fr.frontier.aoc || []).map((e) => e.url);
  assert.deepEqual(d.checked, ['aoc']);
  assert.ok(urls.some((u) => u.includes('CsPaNaOc001')), 'the clip naming her is queued');
  assert.ok(!urls.some((u) => u.includes('CsPaNoTh002')), 'a clip not naming her is not');
});

await t('the background transcriber scores a queued Massie video with the same scorer + Locker writer', async () => {
  if (!transcriptStore.data.has(vt.queueKey(VID_POST))) await vt.enqueueTranscript(transcriptStore, { politician_id: 'massie', topic: 'privacy_rights', source_type: 'official YouTube video (own channel) — video post', source_class: 'youtube_video', source_id: 'fresh-vs-test', url: `https://www.youtube.com/watch?v=${VID_POST}` }, { videoId: VID_POST });
  const generate = async () => ({ segments: [
    { start: 3, text: 'I oppose warrantless surveillance of Americans and I will vote against any bill that allows it.', speaker_is_politician: true },
    { start: 9, text: 'We must protect privacy and the Fourth Amendment.', speaker_is_politician: true },
  ] });
  const { value: r } = await quiet(() => transcriber.transcribeRun({ store: transcriptStore, rawStore, lockerStore, generate, log: () => {}, wake: async () => {} }));
  assert.ok(r.transcribed >= 1);
  assert.ok(r.recorded >= 1);
  assert.ok(r.writes.some((w) => w.politician_id === 'massie'), 'a Massie Locker item was written');
});

await t('a transcription that fails is logged and kept for retry, never thrown', async () => {
  const ts = memStore();
  await vt.enqueueTranscript(ts, { politician_id: 'massie', topic: 'cost_living', source_type: 'official YouTube video (own channel) — video post', source_class: 'youtube_video', source_id: 'fresh-vs-x', url: 'https://www.youtube.com/watch?v=AAAAAAAAAAA' }, { videoId: 'AAAAAAAAAAA' });
  const logs = [];
  const r = await transcriber.transcribeRun({ store: ts, rawStore: memStore(), lockerStore: memStore(), generate: async () => { throw new Error('boom'); }, log: (l) => logs.push(l), wake: async () => {} });
  assert.equal(r.retry_later, 1);
  assert.ok(logs.some((l) => /video-transcribe: FAIL massie .* boom/.test(l)));
});

await t('the dormant allow-list, when given ids, still blocks every other politician from video/speech', async () => {
  const fr = { frontier: {}, seen: {} };
  // Without a derived configuration (no `configs`), only hand-written entries are discovered.
  const d = await quiet(() => vs.discoverVideoSpeech({ politicians: ['john_cornyn', 'aoc'], fresh: fr, fetch: fakeFetch, state: { last: {} }, govinfoKey: 'k', youtubeKey: '', mergeFrontier: fresh.mergeFrontier, log: () => {} }));
  assert.deepEqual(d.value.checked, [], 'nobody without a configuration is discovered');
  assert.deepEqual(fr.frontier, {});
  const scoped = await (await quiet(() => cron.scheduled({
    fetch: fakeFetch, store: memStore(), lockerStore: memStore(), rotationStore: freshRotation(), transcriptStore: memStore(),
    suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    rotate: { roster: PLANNED_ROSTER }, scope: ['thomas_massie'], videoSpeech: { youtubeKey: '', govinfoKey: 'test-key' },
  }))).value.json();
  assert.deepEqual(scoped.video_speech.checked, ['massie']);
  for (const s of scoped.included.sources) assert.ok(isMassie(s.politician_id));
  assert.equal(scoped.scope.pulled_outside, 0);
});

await t('with the video/speech path off, the official-page run is unchanged', async () => {
  const mk = () => ({ fetch: async (u) => ({ ok: true, status: 200, url: String(u), headers: new Map([['content-type', 'text/html']]), text: async () => PAGE }),
    store: memStore(), lockerStore: memStore(), rotationStore: freshRotation(),
    transcriptStore: memStore(), suggestionsStore: memStore(), statedDb: null, now: NOW, triggerTranscriber: async () => {}, curatedStances: {},
    rotate: { roster: PLANNED_ROSTER } });
  const off = await (await quiet(() => cron.scheduled({ ...mk(), videoSpeech: false }))).value.json();
  const on = await (await quiet(() => cron.scheduled({ ...mk(), videoSpeech: { youtubeKey: '', govinfoKey: '' } }))).value.json();
  const official = (r) => r.included.sources.filter((s) => !s.media).map((s) => s.url);
  assert.deepEqual(official(on), official(off), 'the same official pages are pulled with the path on');
  assert.equal(off.video_speech, undefined);
});

console.log(failures ? `\n✗ raw-ingest video/speech: ${failures} failing, ${passed} passing` : `\n✓ raw-ingest video/speech: all ${passed} checks passed`);
process.exit(failures ? 1 : 0);
