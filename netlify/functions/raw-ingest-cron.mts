// ─────────────────────────────────────────────────────────────────────────────
// Raw ingest — scheduled cron · Phase 3 (raw store only)
// ─────────────────────────────────────────────────────────────────────────────
// Every 4 hours (6 runs/day) pulls the 8 configured pages — 5 politicians
// (Talarico, Hinojosa, Abbott, Paxton, Cornyn) across 2 topics (cost_living,
// healthcare_costs); see SOURCES in raw-ingest-core.mjs — and stores each one
// untouched (HTML, URL, timestamp, source type) as its own record in the
// "raw-ingest" Blobs store. ~48 records/day. A failed source writes nothing and
// does not stop the others.
//
// Phase 5: after each record is stored, the existing Phase 4 scorer runs on it
// and LOGS a candidate stance (position + confidence) and whether the rules
// found a clear position. (Phase 5 was log-only; since Phase 6 every candidate
// also goes to the Evidence Locker, and since the promoted-stances pass the
// Locker feeds pdx_stated_positions — see below. The ground-truth file is
// still never written.) Every run logs one
// "raw-ingest: OK …" / "raw-ingest: FAIL …" line per source plus a summary.
//
// Framing + re-score pass (scorer rules phase9-v1):
//   · The scorer reads what is actually said: only the politician's own voice
//     scores (reported speech, letters' "your policy", "the policy that bans …"
//     are someone else acting); opposing a cut is support for the program
//     (counter-frames flip the side); negations and reported figures are
//     mentions; "Roe v. Wade" is one sentence; a cross-topic read needs a page
//     that addresses the topic (stance-score-core.mjs R17).
//   · The Locker writer replaces an item written under OLDER rules with the
//     current read when the page is re-read (W4), and keeps a strong read on
//     the other side instead of holding it back (W6).
//   · Items the cron has not come back to are re-read by locker-rescore-cron.mts.
//   · Promotion carries a Steady / Mixed / Thin consistency signal, and solid
//     evidence on both sides promotes a Mixed stance (stated-positions-core.mjs).
//
// Phase 6:
//   · DISCOVERY — before pulling, each politician in SOURCES gets one extra
//     known URL checked (issues index / newsroom; DISCOVERY_PATTERNS). New
//     stable pages join this run's pull list, total capped at
//     MAX_SOURCES_PER_RUN (11, i.e. under 12). Every new URL is logged.
//   · EVIDENCE LOCKER — after a candidate is logged, it becomes an item in the
//     "evidence-locker" Blobs store at one of three strengths: strong (clear
//     position, confidence ≥ 0.8), weak (clear, 0.3–0.79, incl. implication-
//     driven reads) or mention (< 0.3 or no clear position, with topic mentions
//     and an excerpt). Ground-truth pair: a clear read must match the
//     ground-truth position; anything else: campaign/official page only. A
//     strong item is never overwritten; every write and skip is logged.
//     The ground-truth file is imported read-only and never written.
//
// Coverage pass:
//   · ROTATION — the scheduled run no longer pulls only the fixed five. It
//     plans each run from ROSTER (planRun): politicians with a district board
//     and stated positions first, then those with one of the two, taking whole
//     politicians from a persisted cursor until the run reaches
//     MAX_SOURCES_PER_RUN (11). The next run continues from where this one
//     stopped, so successive runs check different people.
//   · OFFICIAL SOURCES — each planned politician's official pattern (state
//     legislature page, House/Senate newsroom, governor/agency newsroom) is
//     checked with the existing stable-page test and joins the pull list when
//     it is stable and not already included. Its slot is reserved in the plan,
//     so the cap holds either way.
//   · REVIEW FLAGS — db/evidence-locker-review.json is passed to the Locker
//     writer; a flagged item (reviewed / needs_edit / hidden) is never written
//     over. Logged as "evidence-locker: FLAGGED …".
//   · RUN LOG — one "raw-ingest: run plan …" line (politicians, cursor) before
//     pulling and one "raw-ingest: run included …" line (politicians and source
//     types actually pulled) after discovery.
//
// All-topics pass:
//   · Every stored page is scored against EVERY issue key in the register
//     (SCORED_TOPICS — cost_living and healthcare_costs keep their calibrated
//     rules; the rest read stance-topic-vocab.mjs). The page's own topic is
//     handled exactly as before; another topic yields a candidate only when the
//     page carries directional language on it (explicit or implied). Each
//     candidate goes through the same Locker writer and thresholds, keyed by its
//     own issue key, so one page can write items on several issues.
//   · Sources, discovery, roster, official-source check, review flags and the
//     per-run cap are unchanged.
//   · TOPIC LOG — "stance-score: run topics …" (candidates per topic) and
//     "evidence-locker: topics with new items this run …" (items per topic, by
//     strength) close every run; the report carries the same under `topics`.

// Every-minute pass:
//   · SCHEDULE — every minute ("* * * * *") instead of every 4 hours.
//   · CAPS — up to MAX_POLITICIANS_PER_RUN (8) politicians, MAX_SOURCES_PER_
//     POLITICIAN (6) sources each and MAX_SOURCES_PER_RUN (36) sources in total
//     per run. Fetch ceilings keep a run inside RUN_BUDGET_MS (25 s); each run
//     logs "raw-ingest: run duration …" or "raw-ingest: SLOW RUN …".
//   · Record shape, Locker writer, thresholds, review flags and rotation logic
//     are unchanged. (Notes below that mention the 4-hour schedule or a cap of
//     11 describe earlier passes.)

// Extra source types pass:
//   · Five more source classes join the rotation (raw-ingest-source-types.mjs):
//     a member's own house.gov / senate.gov press releases and issue sections,
//     Congress.gov member / lead-author pages, state legislature member pages,
//     governor / statewide releases, and more campaign Issues / Priorities
//     sub-pages. Every URL is one the site already cites for that politician.
//   · Same caps, schedule, record shape and Locker writer. A politician with
//     more pages than their per-run slots rotates through them by cycle.
//   · RUN LOG — "raw-ingest: run included …" adds "source classes" (pages per
//     class; "existing" = the pages configured before this pass).

// Official social pass (YouTube only for now):
//   · Official / campaign YouTube channels already cited on the site
//     (raw-ingest-social.mjs). One channel = one source slot; each new recent
//     video becomes its own raw item record — type "video", date, link,
//     excerpt, weight "mention" — with no scoring and no Locker write.
//   · Excerpt = transcript first; on failure/empty, the description, logged as
//     "raw-ingest: TRANSCRIPT FALLBACK …". "raw-ingest: youtube — …" closes the
//     run with the transcript vs. fallback tally (also report.youtube).
//   · Social slots are filled last (after every official / campaign page), so
//     the caps and the priority of official pages are unchanged.

// Video transcript pass:
//   · The watch-page caption scrape is gone (YouTube answers server fetches
//     with a bot check). Transcripts come from the background transcriber
//     (netlify/functions/video-transcribe.mts → video-transcripts.mjs: Gemini
//     via the Netlify AI Gateway, cached once per video id in the
//     "video-transcripts" store). This cron only reads that cache.
//   · A channel video or cited own-channel video WITH a cached transcript in
//     which the politician speaks is a page-shaped record and goes through
//     onRecord (scorer + Locker writer); its items link to watch?v=ID&t=NNs.
//     Without one, it stays a mention (channel) or is skipped (cited video)
//     and is queued; when this run queued any, the cron wakes the transcriber.
//   · RUN LOG — "raw-ingest: youtube — …" adds "queued for the background
//     transcriber"; report.youtube.queued.

// Tier-2 evidence pass (pool v2):
//   · The rotation pool (db/raw-ingest-pool-expansion-2026-11.json) opens to
//     official government sources — Congress.gov member / measure pages and
//     the politician's own office or committee pages on other government hosts
//     — and videos cited from the politician's OWN YouTube channel (pulled like
//     a page: transcript, else description, and scored). Every page is tagged
//     `source_tier` (1 = first-party campaign / official page, unchanged; 2 =
//     the new sources) and the tier rides onto the raw record and the Locker
//     item. Scoring, R8 / R15, Locker thresholds and cross-topic checks are the
//     same for both tiers. News, voter guides, general archives and retired
//     URLs stay out.
//   · A rotation state stored under an older pool version starts a fresh cycle
//     ("raw-ingest: pool version …") so the next runs reach the new sources.
//   · RUN LOG — "raw-ingest: run included …" adds "evidence tiers".

// Roster priority + baseline pass:
//   · ROSTER grows beyond the previous 13 to more sitting members with a
//     district board and/or stated positions. Tier 1 = board + several stated
//     positions; tier 2 = board or stated positions; tier 3 = the rest of the
//     previous 13.
//   · PER-ISSUE BASELINE — before each run the Locker is counted per
//     politician + issue; a pair with 1 strong or 3 weak items (any mix of the
//     same weight; mentions do not count) is filled. Pages on a filled issue are
//     not chased (left out of the pull list); a politician with every issue
//     filled is deprioritised — behind everyone else, and in only one rotation
//     cycle out of three. New finds on a filled issue are still stored.
//   · ROTATION — planRun works in cycles from a persisted state ({ cycle, done })
//     instead of a bare cursor; the per-run cap, the 4-hour schedule,
//     official-source checks, review flags, scoring and Locker thresholds are
//     unchanged.
//   · RUN LOG — "raw-ingest: roster …" (size, tiers), "raw-ingest: run plan …"
//     (who, tier, deprioritised, filled issues skipped) and "raw-ingest:
//     baseline progress …" (which politician + issue pairs are filled).

// Promoted stances pass:
//   · PROMOTION — after the Locker writes, every politician with a write this
//     run and every politician the run planned is recomputed from their Locker
//     items (stated-positions-core.mjs): at least one strong item, or three weak
//     items, on one side of an issue (no even split) promotes one stance record
//     per politician + issue into pdx_stated_positions; an issue that stops
//     qualifying is withdrawn. Served by GET /api/stated-positions as stance
//     cards that fill gaps the curated cards leave. Opt-in through
//     `statedDb`; the scheduled entry point turns it on. The Locker writer, its
//     thresholds and everything above are unchanged.
//   · RUN LOG — one "stated-positions:" line per politician whose records
//     moved, and "stated-positions: run complete …" closing the pass.

// Fresh evidence pass (raw-ingest-fresh.mjs; opt-in through `fresh`, which the
// scheduled entry point turns on):
//   · EXPANDED SOURCE TYPES — links on every index-like page the run fetches
//     (newsroom, issues index, homepage) to the politician's own press
//     releases, statements / remarks / op-eds and campaign or official issue /
//     priority pages are harvested into a persisted frontier.
//   · DISCOVERY ADDS URLs — up to FRESH_PER_POLITICIAN unfetched frontier pages
//     per planned politician join the pull list, inside the unchanged caps (a
//     page the seen ledger shows was already read gives up its slot when the
//     politician is at the cap). "discovery: fresh pages …" logs the tally.
//     Planned politicians often hold no frontier pages (their pages are single
//     releases, nothing to harvest), so free run slots under the source cap go
//     to the best frontier pages of other politicians (FRESH_SPARE_PER_RUN,
//     FRESH_PER_POLITICIAN each; the rotation itself is untouched).
//     "discovery: frontier — …" says how many candidates were considered and
//     why each one passed over was skipped; "discovery: fresh outcome …" says,
//     per fresh page, whether it was fetched and which Locker item(s) it wrote
//     or why none.
//   · HOST HEALTH (raw-ingest-hosts.mjs) — every failure is classified (dns,
//     timeout, reset, tls, 403, 429, 5xx, 404 …). A host failing at host level
//     HOST_SKIP_FAILS times in a cycle, with no success, is skipped for the rest
//     of the cycle; within a run pages on one host are pulled probe-first. A
//     run where every fetch fails at the network level across hosts is logged
//     as a RUN-SIDE OUTAGE and penalises no host.
//   · LOCKER READS are bounded (locker-read.mjs). The unbounded whole-Locker
//     read (one socket per item, 1,000+ items) used to exhaust the function's
//     file descriptors, after which every pull and every database query in the
//     run failed instantly with "fetch failed".
//   · TOPIC TARGETING — a page filed under a default topic is scored under the
//     topic the page signals, preferring topics the politician has thin or no
//     Locker coverage on ("stance-score: TARGET …"). Known issue keys only.
//   · PROMOTION — a new strong item (or weak at ≥ PROMOTE_THIN_WEAK_MIN) on a
//     thin or empty politician + issue puts that politician first in the
//     recompute, never deferred by the run budget. Curated rows and rows
//     resting on reviewed evidence are never written.
//   · HEADLINE PASS — before the full-page topic signal, the title, first h1
//     and URL slug are checked; when they clearly name one issue key it is
//     used ("stance-score: TARGET (headline override) …").
//   · FRONTIER FILTER — harvested links that are obviously low-signal
//     (congratulations, awards, "meets with", pure grant announcements,
//     ceremonial events) never enter the frontier ("discovery: FILTER …" per
//     page, "discovery: frontier filter — …" per run). Caps unchanged.
//   · COVERAGE GAPS — one read-only "raw-ingest: coverage gaps — …" line per
//     rotation run (raw-ingest-coverage.mjs); full lists at
//     GET /api/admin/raw-ingest-coverage.
//   · OPPOSING EVIDENCE — read-only (stance-check.mjs): a pair with a new strong
//     item whose strong, not-hidden items run predominantly against the curated
//     stance on file logs "stance-check: OPPOSING — …"; the run logs
//     "raw-ingest: opposing evidence — N cases". Nothing is written.
//   Locker thresholds, W1–W6 (never replacing a strong item, review flags,
//   cross-topic conflicts) and cross-topic scoring are unchanged.

// Official URL resolution pass (raw-ingest-resolve.mjs, applied when the
// roster is built in raw-ingest-core.mjs):
//   · A tier-3 row with no pages (or only weak ones) gets official pages the
//     engine resolves itself: its Congress.gov member page on one clean name +
//     state + chamber match against the committed Congress member roster, else
//     pages already cited for it on the site that are clearly its own official
//     or campaign page. Nothing is fetched, searched for or guessed; no clean
//     match → no page, skipped as before. Rows with pages and every tier-1 /
//     tier-2 row are untouched.
//   · Resolved pages go through the unchanged planner, pull path, scorer and
//     Locker writer. Caps, tier order and thresholds are unchanged.
//   · STEP 3 — a row still page-less after both steps, held by a sitting state
//     legislator, is matched against the legislature's own member directory
//     (state + chamber + surname + compatible first name, one member only) and
//     gets that member's page on the legislature's site (Utah today).
//   · RUN LOG — "raw-ingest: url resolution — …" after the roster line; the
//     report carries the same under `url_resolution`.

// Video / speech pass (raw-ingest-video.mjs; opt-in through `videoSpeech`,
// which the scheduled entry point turns on):
//   · DISCOVERY — for every planned, in-scope politician (the whole roster
//     now that the allow-list is off), at most once an hour per politician:
//     member channel uploads (verified channel ids only), C-SPAN clips naming
//     the member (YouTube Data API), floor remarks (Congressional Record) and
//     hearing transcripts (GovInfo; sitting House / Senate members). Massie
//     keeps his hand-written configuration; everyone else's is derived from
//     the roster + member map (raw-ingest-video.mjs). New URLs are queued into the same frontier as fresh pages.
//     Facebook video posts are logged as unavailable (no access configured).
//   · PULL — up to VIDEO_SPEECH_PER_POLITICIAN of them per politician per run,
//     only in free slots under the unchanged caps. Videos go through the
//     existing transcript cache / background transcriber; floor speeches and
//     hearings are read for the member's own speaking turns. Both are scored
//     by the same scorer (own topic + cross-topic) and Locker writer.
//   · RUN LOG — one "raw-ingest: video/speech …" line per source (type and
//     outcome) and a summary; report.video_speech. A failed transcription or
//     fetch is logged and skipped and never blocks the rest of the run.

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import {
  runRawIngest, discoverSources, planRun, runPlanLine, sourceKind, normaliseRotationState,
  rosterSummary, baselineLine, isFilled, ROSTER, BASELINE_STRONG, BASELINE_WEAK,
  RAW_STORE_NAME, SOURCES, ROTATION_STORE_NAME, ROTATION_KEY, MAX_SOURCES_PER_RUN,
  MAX_POLITICIANS_PER_RUN, MAX_SOURCES_PER_POLITICIAN, RUN_BUDGET_MS, POOL_VERSION, rotationStateForPool, sourceTierOf,
  RESOLUTION,
} from "../lib/raw-ingest-core.mjs";
import { resolutionLine } from "../lib/raw-ingest-resolve.mjs";
import { logCandidateStances, SCORED_TOPICS } from "../lib/stance-score-core.mjs";
import { maybeWriteLockerItem, loadReviewFlags, lockerBaselineCounts, cachedBaselineCounts, bumpBaselineCounts, LOCKER_STORE_NAME } from "../lib/evidence-locker-core.mjs";
import { appendRunSuggestions, SUGGESTIONS_STORE_NAME } from "../lib/raw-ingest-suggestions.mjs";
import { lockerEntriesFor, syncPolitician, promotableWrite } from "../lib/stated-positions-core.mjs";
import {
  readFreshState, saveFreshState, harvestLinks, mergeFrontier, markSeen, addFreshSources, targetTopic,
  isHarvestable, sharedHosts, normUrl, normaliseFreshState, FRESH_PER_POLITICIAN,
  FRESH_SPARE_PER_RUN, noteFreshFailures, droppedSummary,
} from "../lib/raw-ingest-fresh.mjs";
import { coverageGaps, coverageGapLine } from "../lib/raw-ingest-coverage.mjs";
import { checkOpposingEvidence, opposingSummaryLine, loadCuratedStances } from "../lib/stance-check.mjs";
import {
  readHostHealth, saveHostHealth, normaliseHostHealth, skippedHosts, filterSkippedHosts, recordHostResults, HOST_LEVEL,
} from "../lib/raw-ingest-hosts.mjs";
import { retiredSourcesLine, RETIRED_VERSION, RETIRED_LOG_KEY } from "../lib/raw-ingest-retired.mjs";
import { TRANSCRIPT_STORE_NAME, lockerRawFor } from "../lib/video-transcripts.mjs";
import { discoverVideoSpeech, addVideoSpeechSources, isVideoSpeechEntry, buildVideoSpeechConfigs, VIDEO_SPEECH_PER_POLITICIAN } from "../lib/raw-ingest-video.mjs";
import VS_MEMBER_MAP from "../../db/vr-member-map.json" with { type: "json" };
import { INGEST_ALLOW_LIST, scopeIds, inScope, filterToScope, scopedRotationKey, scopeLine } from "../lib/raw-ingest-scope.mjs";
import { buildWordGaps, orderPullListByWordGap, wordGapLine, wordGapRank, loadWordGapData } from "../lib/raw-ingest-word-gap.mjs";
import groundTruth from "../../db/stance-ground-truth-talarico-cost-of-living.json" with { type: "json" };
import reviewFile from "../../db/evidence-locker-review.json" with { type: "json" };

// Retired sources (raw-ingest-retired.mjs): logged ONCE per RETIRED_VERSION —
// a tiny marker doc in the rotation store remembers that the line was written.
export async function logRetiredOnce(store: any, log: (l: string) => void, now: () => Date = () => new Date()): Promise<boolean> {
  if (!store) return false;
  try {
    let seen = await store.get(RETIRED_LOG_KEY, { type: "json" });
    if (typeof seen === "string") seen = JSON.parse(seen);
    if (seen && Number(seen.version) >= RETIRED_VERSION) return false;
    log(retiredSourcesLine());
    await store.setJSON(RETIRED_LOG_KEY, { version: RETIRED_VERSION, logged_at: now().toISOString() });
    return true;
  } catch (e: any) {
    log(`raw-ingest: retired-sources marker unavailable — ${e?.message || e}`);
    return false;
  }
}

const hostOfUrl = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

async function readRotationState(store: any, log: (l: string) => void, key: string = ROTATION_KEY): Promise<any> {
  if (!store) return normaliseRotationState(null);
  try {
    let doc = await store.get(key, { type: "json" });
    if (typeof doc === "string") { try { doc = JSON.parse(doc); } catch { doc = null; } }
    // Pool version changed (e.g. v2 opened tier-2 sources): start a fresh cycle
    // so the next runs reach the new sources straight away.
    const { state, reset, from } = rotationStateForPool(doc, POOL_VERSION);
    if (reset) log(`raw-ingest: pool version ${from} → ${POOL_VERSION} — starting fresh cycle ${state.cycle} so the expanded pool is reached`);
    return state;
  } catch (e: any) {
    log(`raw-ingest: rotation state unreadable — starting a fresh cycle (${e?.message || e})`);
    return normaliseRotationState(null);
  }
}

// Exported so the test suite can invoke this exact entry point with fakes.
// `lockerStore` and `discover` are opt-in so each phase can be exercised on its
// own; the scheduled entry point below turns both on.
export async function run(deps: {
  fetch: typeof fetch; store: any; now?: () => Date; log?: (l: string) => void;
  lockerStore?: any; groundTruth?: any; discover?: boolean | { patterns?: any[]; max?: number };
  sources?: any[];
  // Coverage pass: plan the run from the roster (see header). `rotationStore`
  // persists the rotation state between runs.
  // `state` overrides the stored rotation state and `counts` the Locker
  // per-issue baseline counts ("pid|topic" → { strong, weak }) (tests).
  rotate?: boolean | { roster?: any[]; max?: number; state?: any; counts?: Record<string, { strong?: number; weak?: number }> };
  rotationStore?: any;
  reviewFlags?: any;
  // Promoted stances: the pdx_stated_positions adapter (stated-positions-core
  // dbAdapter). Omitted → no promotion step (the earlier behaviour).
  statedDb?: any;
  // Fresh evidence pass (see header). `store` holds the frontier + seen ledger
  // (defaults to rotationStore); `state` = { frontier, seen } overrides it and
  // `counts` the Locker baseline counts used for topic targeting (tests).
  fresh?: boolean | { store?: any; state?: any; counts?: Record<string, { strong?: number; weak?: number }>; per?: number; spare?: number };
  // Host health (raw-ingest-hosts.mjs): hosts failing at host level this cycle
  // are skipped for the rest of it. `hostHealth` = { hosts } overrides the
  // stored doc (tests); otherwise it lives in rotationStore. Rotation runs only.
  hostHealth?: any;
  // Opposing-evidence check (stance-check.mjs): the curated cards
  // ({ pid: [card…] }). Omitted on a rotation run → read from the committed
  // stance data files. Read-only; only logs.
  curatedStances?: Record<string, any[]>;
  // Politician allow-list (raw-ingest-scope.mjs). Omitted → whole roster (the
  // earlier behaviour); the scheduled entry point passes INGEST_ALLOW_LIST.
  // Politicians outside it are never planned, fetched, harvested or scored.
  scope?: string[] | null;
  // Word vs Action gaps (raw-ingest-word-gap.mjs): per politician, the issues
  // with a formal record and the issues with a stated position. Either the data
  // ({ formal: { pid: [key…] }, stated: { pid: [key…] } }) or a loader called
  // with the planned (in-scope) politician ids. Omitted → pull order unchanged.
  // Only the ORDER of each politician's pull list changes.
  wordGaps?: { formal?: Record<string, string[]>; stated?: Record<string, string[]> } | ((pids: string[]) => Promise<{ formal?: Record<string, string[]>; stated?: Record<string, string[]> }>) | null;
  // Video / speech path (raw-ingest-video.mjs). Rotation + fresh runs only.
  // Planned, in-scope politicians configured there get video / speech URLs
  // discovered into the frontier (throttled) and up to `per` of them pulled
  // in free slots under the unchanged caps. `state` overrides the stored
  // discovery-timing doc, `force` ignores the interval, and `youtubeKey` /
  // `govinfoKey` override the environment (tests). Omitted → off.
  videoSpeech?: boolean | { state?: any; force?: boolean; youtubeKey?: string; govinfoKey?: string; per?: number };
  // Baseline counts cache (cachedBaselineCounts), kept in rotationStore. Omitted
  // → the whole-Locker read every run (the earlier behaviour; tests).
  baselineCache?: boolean;
}) {
  const log = deps.log ?? ((l: string) => console.log(l));
  const startedAt = Date.now();
  const scope = deps.scope === undefined ? null : scopeIds(deps.scope);
  const rotationKey = scopedRotationKey(ROTATION_KEY, scope);
  let sources = filterToScope(scope, deps.sources ?? SOURCES);
  let discovered: any[] = [];
  let plan: any = null;
  let roster: any[] = ROSTER;
  let counts: Record<string, any> = {};
  let wordGaps: Record<string, { gap: Set<string>; stated: Set<string> }> | null = null;
  let hostHealth: any = null;
  let skipHosts: Map<string, any> = new Map();
  let videoSpeech: any = null;
  const freshOutcome = new Map<string, { written: string[]; reasons: string[] }>();
  const flags = loadReviewFlags(deps.reviewFlags ?? reviewFile);
  const nowFn = deps.now ?? (() => new Date());
  // ── Fresh evidence pass: state + the discovery-body harvest ──
  const fo: any = deps.fresh ? (typeof deps.fresh === "object" ? deps.fresh : {}) : null;
  const freshStore = fo ? (fo.store ?? deps.rotationStore) : null;
  const fresh: any = fo ? (fo.state ? normaliseFreshState({ items: fo.state.frontier || {} }, { urls: fo.state.seen || {} }) : await readFreshState(freshStore, log)) : null;
  const freshTally = { harvested: 0, from_pages: 0 };
  // Frontier quality filter: low-signal links dropped this run ({ url, reason }).
  const lowSignal: any[] = [];
  const shared = sharedHosts(deps.rotate && typeof deps.rotate === "object" && deps.rotate.roster ? deps.rotate.roster : ROSTER);
  const allRosterUrls = (r: any[]) => new Set<string>(r.flatMap((x: any) => [...(x.sources || []), ...(x.official ? [x.official] : [])]).map((x: any) => normUrl(x.url)));
  // URLs already configured anywhere (never re-offered as "fresh").
  let knownUrls = new Set<string>([...allRosterUrls(ROSTER), ...sources.map((x: any) => normUrl(x.url))]);
  const harvestFrom = (src: any, body: string, finalUrl?: string) => {
    if (!fresh) return;
    if (!inScope(scope, src?.politician_id)) return;
    const page = { ...src, ...(finalUrl ? { final_url: finalUrl } : {}) };
    if (!isHarvestable(page, shared)) return;
    const seen = new Set(Object.keys(fresh.seen));
    const dropped: any[] = [];
    const found = harvestLinks(page, body, { known: knownUrls, seen, counts, now: nowFn(), dropped });
    const fresher = dropped.filter((d: any) => !lowSignal.some((x: any) => normUrl(x.url) === normUrl(d.url)));
    lowSignal.push(...fresher);
    if (fresher.length) log(`discovery: FILTER ${src.politician_id} ${src.url} — ${fresher.length} low-signal link(s) kept out of the frontier (${droppedSummary(fresher)})`);
    const n = mergeFrontier(fresh, found);
    freshTally.harvested += n;
    if (found.length) freshTally.from_pages += 1;
    if (n) log(`discovery: HARVEST ${src.politician_id} ${src.url} — ${n} new candidate page(s) for the frontier (${[...new Set(found.map((f: any) => f.source_type))].join(", ")})`);
  };
  const onBody = fo ? (p: any, res: any, body: string) => harvestFrom(p, body, res?.url) : null;
  if (deps.rotate && !deps.sources) {
    const ro = typeof deps.rotate === "object" ? deps.rotate : {};
    const fullRoster = ro.roster ?? ROSTER;
    roster = filterToScope(scope, fullRoster);
    if (scope) log(`raw-ingest: scope — planning ${roster.length} of ${fullRoster.length} roster politician(s) (allow-list: ${[...scope].sort().join(", ")}); the rest are skipped this run`);
    const pids = roster.map((r: any) => r.politician_id);
    const state = ro.state !== undefined ? normaliseRotationState(ro.state) : await readRotationState(deps.rotationStore, log, rotationKey);
    if (ro.counts) counts = ro.counts;
    else if (deps.baselineCache) {
      // Cached counts (see cachedBaselineCounts): the whole-Locker read runs at
      // most every 30 minutes instead of every minute.
      const b = await cachedBaselineCounts(deps.lockerStore, deps.rotationStore, { flags, pids, log, now: nowFn });
      counts = b.counts;
      log(`evidence-locker: baseline counts — ${b.source} (${Object.keys(counts).length} pair(s), ${b.ms}ms${b.age_ms != null ? `, ${Math.round(b.age_ms / 60_000)} min old` : ""})`);
      // A run that just spent most of its time refreshing stops here, so it
      // ends inside the function limit; the next run pulls with fresh counts.
      if (b.source === "refreshed" && Date.now() - startedAt > RUN_BUDGET_MS / 2) {
        log(`raw-ingest: baseline counts refreshed from the Locker in ${b.ms}ms — this run stops before pulling; the next run continues the rotation`);
        return new Response(JSON.stringify({ ok: true, baseline_refreshed: true, results: [], duration_ms: Date.now() - startedAt, budget_ms: RUN_BUDGET_MS }), { status: 200, headers: { "content-type": "application/json" } });
      }
    } else counts = await lockerBaselineCounts(deps.lockerStore, { flags, pids, log });
    knownUrls = new Set([...knownUrls, ...allRosterUrls(roster)]);
    const max = ro.max ?? MAX_SOURCES_PER_RUN;
    // Word vs Action gaps, loaded only for the politicians this run may plan
    // (the allow-list already applied to `roster`).
    if (deps.wordGaps) {
      try {
        const data = typeof deps.wordGaps === "function" ? await deps.wordGaps(pids) : deps.wordGaps;
        const allowed = new Set(pids);
        const only = (m: any) => Object.fromEntries(Object.entries(m || {}).filter(([pid]) => allowed.has(pid) && inScope(scope, pid)));
        wordGaps = buildWordGaps({ formal: only(data?.formal), stated: only(data?.stated) });
      } catch (e: any) {
        wordGaps = null;
        log(`raw-ingest: word gap — unavailable, pull order unchanged (${e?.message || e})`);
      }
    }
    plan = planRun(state, { roster, max, counts, maxPoliticians: MAX_POLITICIANS_PER_RUN, perPolitician: MAX_SOURCES_PER_POLITICIAN, wordGaps });
    const rs = rosterSummary(roster, counts);
    const tierOf = new Map(roster.map((r: any) => [r.politician_id, r.tier]));
    log(`raw-ingest: roster — ${rs.size} politician(s) (${Object.entries(rs.tiers).map(([t, n]) => `tier ${t}: ${n}`).join(", ")}) · ${rs.reached.length} politician + issue pair(s) filled`);
    // Official URL resolution happened when the roster was built (see header).
    if (RESOLUTION && !ro.roster) log(resolutionLine(RESOLUTION));
    const dep = new Set(plan.deprioritised);
    const who = plan.politicians.map((p: string) => `${p} (t${tierOf.get(p)}${dep.has(p) ? ", deprioritised: every issue filled" : ""})`);
    const skip = plan.skipped.length ? ` · not chased (filled): ${plan.skipped.map((x: any) => `${x.politician_id}|${x.topic}`).join(", ")}` : "";
    console.log(`raw-ingest: run plan — cycle ${plan.cycle} · ${plan.politicians.length} politician(s): ${who.join(", ")} · ${plan.sources.length} page(s) + ${plan.patterns.length} official pattern(s) (cap ${max}) · ${plan.remaining_in_cycle.length} left this cycle${skip}`);
    // Hosts that failed at host level earlier this cycle: their pages, patterns
    // and frontier pages are left out before any slot is spent on them.
    hostHealth = deps.hostHealth ? normaliseHostHealth({ ...deps.hostHealth, cycle: plan.cycle }, plan.cycle) : await readHostHealth(deps.rotationStore, plan.cycle, log);
    skipHosts = skippedHosts(hostHealth);
    const protect = new Set([normUrl(SOURCES[0].url)]);
    const ps = filterSkippedHosts(plan.sources, skipHosts, { protect, norm: normUrl });
    const pp = filterSkippedHosts(plan.patterns, skipHosts, { protect, norm: normUrl });
    for (const [h, x] of skipHosts) {
      const n = [...ps.dropped, ...pp.dropped].filter((s: any) => hostOfUrl(s.url) === h).length;
      log(`raw-ingest: HOST-SKIP ${h} — ${x.fails} host-level failure(s) this cycle, none OK (last: ${x.last_error || x.cls}); ${n} planned page(s) left out for the rest of cycle ${plan.cycle}`);
    }
    const d = await discoverSources(ps.kept, { fetch: deps.fetch, log, patterns: pp.kept, max, restrict: false, onBody });
    sources = d.sources;
    discovered = d.added;
    // Video / speech: discover into the frontier, then take free slots (before
    // the web-page fresh pages, after every planned / official page).
    if (fresh && deps.videoSpeech) {
      const vo: any = typeof deps.videoSpeech === "object" ? deps.videoSpeech : {};
      const vsPids = plan.politicians.filter((p: string) => inScope(scope, p));
      // One configuration per planned politician (hand-written entries win).
      const vsSet = new Set(vsPids);
      const vsConfigs = buildVideoSpeechConfigs(roster.filter((r: any) => vsSet.has(r.politician_id)), { members: (VS_MEMBER_MAP as any).members || [] });
      const vd = await discoverVideoSpeech({
        configs: vsConfigs,
        politicians: vsPids, fresh, fetch: deps.fetch, store: deps.rotationStore, state: vo.state ?? null, now: nowFn, log,
        force: !!vo.force, mergeFrontier,
        ...(vo.youtubeKey !== undefined ? { youtubeKey: vo.youtubeKey } : {}),
        ...(vo.govinfoKey !== undefined ? { govinfoKey: vo.govinfoKey } : {}),
      });
      const va = addVideoSpeechSources(sources, fresh, { configs: vsConfigs, politicians: vsPids, max, perPolitician: MAX_SOURCES_PER_POLITICIAN, per: vo.per ?? VIDEO_SPEECH_PER_POLITICIAN, skipHosts: new Set(skipHosts.keys()), log });
      sources = va.sources;
      discovered = [...discovered, ...va.added];
      videoSpeech = { checked: vd.checked, queued: vd.added, discovery: vd.sources, added: va.added.length };
    }
    if (fresh) {
      const f = addFreshSources(sources, fresh, { politicians: plan.politicians, max, perPolitician: MAX_SOURCES_PER_POLITICIAN, per: fo.per ?? FRESH_PER_POLITICIAN, protect, skipHosts: new Set(skipHosts.keys()), spare: fo.spare ?? FRESH_SPARE_PER_RUN, log, wordGaps });
      sources = f.sources;
      discovered = [...discovered, ...f.added];
      (freshTally as any).added = f.added.length;
      (freshTally as any).displaced = f.displaced.length;
    }
    // Final pull order: each politician's pages (planned, discovered, fresh) in
    // word-gap order, inside the slots that politician already holds.
    if (wordGaps) {
      sources = orderPullListByWordGap(sources, wordGaps);
      log(wordGapLine(wordGaps, sources));
    }
    if (deps.rotationStore) {
      try { await deps.rotationStore.setJSON(rotationKey, { ...plan.state, pool_version: POOL_VERSION, updated_at: (deps.now ?? (() => new Date()))().toISOString(), last_politicians: plan.politicians }); }
      catch (e: any) { log(`raw-ingest: rotation state not saved — ${e?.message || e}`); }
    }
  } else if (deps.discover) {
    const opts = typeof deps.discover === "object" ? deps.discover : {};
    const d = await discoverSources(sources, { fetch: deps.fetch, log, ...opts, onBody });
    sources = d.sources;
    discovered = d.added;
  }
  // Fresh pages for a run without the rotation planner (fixed / injected sources).
  if (fresh && !plan) {
    if (fo.counts) counts = fo.counts;
    else if (deps.lockerStore) counts = await lockerBaselineCounts(deps.lockerStore, { flags, pids: [...new Set(sources.map((x: any) => x.politician_id))], log });
    knownUrls = new Set([...knownUrls, ...sources.map((x: any) => normUrl(x.url))]);
    const max = (typeof deps.discover === "object" && deps.discover.max) || MAX_SOURCES_PER_RUN;
    const f = addFreshSources(sources, fresh, { max, perPolitician: MAX_SOURCES_PER_POLITICIAN, per: fo.per ?? FRESH_PER_POLITICIAN, protect: new Set([normUrl(SOURCES[0].url)]), log });
    sources = f.sources;
    discovered = [...discovered, ...f.added];
    (freshTally as any).added = f.added.length;
    (freshTally as any).displaced = f.displaced.length;
  } else if (fresh && fo.counts) counts = fo.counts;
  if (fresh) {
    const frontierSize = Object.values(fresh.frontier).reduce((n: number, l: any) => n + l.length, 0);
    log(`discovery: fresh pages — ${(freshTally as any).added || 0} unfetched page(s) added to this run (≤ ${fo.per ?? FRESH_PER_POLITICIAN} per politician, caps unchanged)${(freshTally as any).displaced ? `, ${(freshTally as any).displaced} already-read page(s) displaced` : ""} · ${freshTally.harvested} candidate(s) harvested from discovery pages · frontier holds ${frontierSize}`);
    log(`discovery: ${discovered.length} new URL(s) this run in total`);
  }
  // Final fence: nothing outside the allow-list reaches the fetcher, however it
  // got into the list (fixed sources, discovery, the fresh frontier).
  if (scope) { sources = filterToScope(scope, sources); discovered = filterToScope(scope, discovered); }
  await logRetiredOnce(deps.rotationStore, log, deps.now);
  const included = runPlanLine(sources);
  console.log(`raw-ingest: run included ${included.count} source(s) · politicians: ${included.politicians.join(", ")} · source kinds: ${JSON.stringify(included.kinds)} · source types: ${JSON.stringify(included.source_types)} · source classes: ${JSON.stringify(included.source_classes)} · evidence tiers: ${JSON.stringify(included.source_tiers)}`);
  const lockerWrites: any[] = [];
  const gt = deps.groundTruth ?? groundTruth;
  // Every page is scored against every topic (SCORED_TOPICS): its own topic as
  // before, plus each other issue key it carries directional language on. Each
  // candidate goes through the same Locker writer, so one page can land items
  // on several issues — each under its own issue key.
  const topicsScored: Record<string, number> = {};
  const targeted: any[] = [];
  const srcByUrl = new Map(sources.map((x: any) => [x.url, x]));
  const onRecord = async (incoming: any) => {
    if (!inScope(scope, incoming?.politician_id)) return;
    let rec = incoming;
    if (fresh) {
      const src = srcByUrl.get(incoming.url) || {};
      // Harvest this page's links for later runs (the frontier).
      try { harvestFrom({ ...src, ...incoming }, incoming.body, incoming.final_url); }
      catch (e: any) { log(`discovery: harvest error for ${incoming.url} — ${e?.message || e}`); }
      // Score a default-topic page under the topic it signals.
      const tg = targetTopic(incoming, { counts });
      if (tg.moved) {
        rec = Object.freeze({ ...incoming, topic: tg.topic });
        targeted.push({ politician_id: incoming.politician_id, url: incoming.url, from: tg.from, topic: tg.topic, ...(tg.via ? { via: tg.via } : {}) });
        log(`stance-score: TARGET${tg.via === "headline" ? " (headline override)" : ""} ${incoming.politician_id}|${tg.from}${incoming.source_id ? "|" + incoming.source_id : ""} → ${tg.topic} — ${tg.reason}`);
      }
    }
    const candidates = logCandidateStances(rec, { log });
    for (const c of candidates) topicsScored[c.topic] = (topicsScored[c.topic] || 0) + 1;
    if (!deps.lockerStore) return;
    const oc = String(rec?.source_id || "").startsWith("fresh-") ? (freshOutcome.get(incoming.url) || freshOutcome.set(incoming.url, { written: [], reasons: [] }).get(incoming.url)!) : null;
    if (!candidates.length) {
      if (oc) oc.reasons.push("no scored candidate (no topic language the scorer could read)");
      log(`evidence-locker: SKIP ${rec?.politician_id}|${rec?.topic}${rec?.source_id ? "|" + rec.source_id : ""} — no scored candidate`);
      return;
    }
    for (const candidate of candidates) {
      // A transcribed video links to the second the cited words are spoken.
      const w = await maybeWriteLockerItem(candidate, lockerRawFor(candidate, rec), { store: deps.lockerStore, gt, log, flags });
      if (oc) { if (w.written) oc.written.push(`${candidate.topic} ${w.item?.strength}`); else oc.reasons.push(`${candidate.topic}: ${w.reason || "not written"}`); }
      if (w.written) lockerWrites.push({ key: w.key, politician_id: candidate.politician_id, topic: candidate.topic, strength: w.item?.strength, source_tier: sourceTierOf(w.item), confidence: w.item?.confidence, ...(candidate.topic !== rec.topic ? { page_topic: rec.topic } : {}) });
    }
  };
  const report: any = await runRawIngest({ ...deps, onRecord, log, probeHosts: plan ? true : (deps as any).probeHosts }, sources);
  if (scope) {
    const pulledOutside = report.results.filter((r: any) => !inScope(scope, r?.politician_id ?? (srcByUrl.get(r?.url) as any)?.politician_id)).length;
    report.scope = { allow_list: [...scope].sort(), pulled_outside: pulledOutside };
    log(scopeLine(scope, { rosterSize: (deps.rotate && typeof deps.rotate === "object" && deps.rotate.roster ? deps.rotate.roster : ROSTER).length, kept: roster.length, pulledOutside }));
  }
  // Host health: fold this run in (a run-side outage penalises no host).
  let outage = false;
  if (hostHealth) {
    const hr = recordHostResults(hostHealth, report.results, { at: nowFn().toISOString() });
    outage = hr.outage;
    if (hr.outage) log(`raw-ingest: RUN-SIDE OUTAGE — every fetch failed at the network level across several hosts (${[...new Set(report.results.map((r: any) => r.error_class))].join(", ")}); no host penalised, the function's own network is the likely cause`);
    for (const h of hr.newlySkipped) log(`raw-ingest: HOST-SKIP ${h} — now skipped for the rest of cycle ${plan.cycle} (${hostHealth.hosts[h].fails} host-level failure(s): ${hostHealth.hosts[h].last_error})`);
    if (!deps.hostHealth) await saveHostHealth(deps.rotationStore, hostHealth, { now: nowFn(), log });
    report.host_health = { cycle: hostHealth.cycle, skipped: [...skippedHosts(hostHealth).keys()], outage };
  }
  if (fresh) {
    // Each fresh page this run: fetched? a new Locker item, or why not.
    const resByUrl = new Map(report.results.map((r: any) => [r.url, r]));
    const outcomes: any[] = [];
    for (const a of discovered.filter((x: any) => String(x.source_id || "").startsWith("fresh-"))) {
      const r: any = resByUrl.get(a.url);
      const oc = freshOutcome.get(a.url);
      const what = !r ? "not pulled"
        : r.host_skipped ? `not fetched — ${r.error}`
        : !r.ok ? `fetch failed — ${r.error}`
        : oc?.written.length ? `fetched OK · ${oc.written.length} new Locker item(s): ${oc.written.join(", ")}`
        : `fetched OK · no new item — ${oc?.reasons.length ? [...new Set(oc.reasons)].join("; ") : "no candidate reached the Locker writer"}`;
      outcomes.push({ politician_id: a.politician_id, url: a.url, ok: !!r?.ok, items: oc?.written.length || 0, outcome: what });
      log(`discovery: fresh outcome ${a.politician_id} ${a.url} — ${what}`);
    }
    // Everything fetched this run is now "seen"; the frontier forgets it.
    // A video / speech source counts as fetched once it was read to the end
    // (scored, no words by the politician, or its transcription failed); one
    // still waiting on the background transcriber stays in the frontier.
    markSeen(fresh, report.results.filter((r: any) => r.ok && (!r.youtube || (isVideoSpeechEntry(srcByUrl.get(r.url)) && !r.queued))).map((r: any) => r.url), nowFn().toISOString());
    const retired = noteFreshFailures(fresh, report.results, { at: nowFn().toISOString(), outage, hostLevel: HOST_LEVEL });
    if (retired.length) log(`discovery: ${retired.length} failing fresh page(s) retired from the frontier: ${retired.join(", ")}`);
    if (!fo.state) await saveFreshState(freshStore, fresh, { now: nowFn(), log });
    const frontierSize = Object.values(fresh.frontier).reduce((n: number, l: any) => n + l.length, 0);
    const headlineOverrides = targeted.filter((x) => x.via === "headline").length;
    report.fresh = { added: (freshTally as any).added || 0, outcomes, displaced: (freshTally as any).displaced || 0, harvested: freshTally.harvested, frontier: frontierSize, seen: Object.keys(fresh.seen).length, targeted, headline_overrides: headlineOverrides, low_signal_dropped: lowSignal.length, low_signal_reasons: droppedSummary(lowSignal) || null };
    log(`discovery: frontier filter — ${lowSignal.length} low-signal link(s) dropped before the frontier this run${lowSignal.length ? ` (${droppedSummary(lowSignal)})` : ""} · caps unchanged`);
    log(`raw-ingest: fresh evidence — ${report.fresh.added} unfetched page(s) pulled, ${freshTally.harvested} candidate page(s) harvested from ${freshTally.from_pages} page(s), ${targeted.length} page(s) retargeted (${headlineOverrides} by the headline pass)${targeted.length ? ` (${targeted.map((x) => `${x.politician_id} ${x.from}→${x.topic}`).join(", ")})` : ""} · frontier ${frontierSize}`);
  }
  // Video / speech: one line per source pulled this run, with its type.
  if (videoSpeech) {
    const pulled: any[] = [];
    for (const r of report.results as any[]) {
      const s: any = srcByUrl.get(r.url);
      if (!isVideoSpeechEntry(s)) continue;
      const media = s.source_class === "youtube_video" ? "video" : "speech";
      const oc = freshOutcome.get(r.url);
      const outcome = !r.ok ? `failed — ${r.error}; skipped, the rest of the run continues`
        : r.queued ? "transcript pending — queued for the background transcriber, which scores it with the same rules when ready"
        : r.speech && !r.key ? "no speaking turn by the politician — skipped"
        : r.youtube && !r.youtube.transcript ? "no transcript with the politician's words (transcription failed, no speech, or not the politician speaking) — skipped, title kept as an unscored mention"
        : oc?.written.length ? `scored · ${oc.written.length} new Locker item(s): ${oc.written.join(", ")}`
        : `scored · no new item — ${oc?.reasons.length ? [...new Set(oc.reasons)].join("; ") : "no candidate reached the Locker writer"}`;
      pulled.push({ politician_id: s.politician_id, url: r.url, media, source_class: s.source_class, speech_kind: s.speech_kind || null, source_type: s.source_type, ok: !!r.ok, queued: !!r.queued, items: oc?.written.length || 0, outcome });
      log(`raw-ingest: video/speech ${s.politician_id} [${media} · ${s.source_class} · ${s.speech_kind || "-"}] ${r.url} — ${outcome}`);
    }
    const by = (m: string) => pulled.filter((x) => x.media === m).length;
    videoSpeech.pulled = pulled;
    videoSpeech.by_type = { video: by("video"), speech: by("speech") };
    report.video_speech = videoSpeech;
    log(`raw-ingest: video/speech — ${pulled.length} source(s) pulled this run (video ${by("video")}, speech ${by("speech")}) · ${pulled.reduce((n, x) => n + x.items, 0)} Locker item(s) · ${pulled.filter((x) => x.queued).length} awaiting transcription · ${pulled.filter((x) => !x.ok).length} failed · ${videoSpeech.queued} new URL(s) queued into the frontier${videoSpeech.checked.length ? "" : " (discovery not due this run)"}`);
  }
  // YouTube: how often the transcript worked vs. the description fallback.
  const yt = report.results.filter((r: any) => r.youtube);
  if (yt.length) {
    const sum = (k: string) => yt.reduce((n: number, r: any) => n + (r.youtube[k] || 0), 0);
    report.youtube = { channels: yt.length, videos: sum("videos"), stored: sum("stored"), already_stored: sum("seen"), transcript: sum("transcript"), description_fallback: sum("fallback"), queued: sum("queued") };
    const tried = report.youtube.transcript + report.youtube.description_fallback;
    log(`raw-ingest: youtube — ${yt.length} channel(s), ${report.youtube.stored} new video record(s) · transcript ${report.youtube.transcript}/${tried}, description fallback ${report.youtube.description_fallback}/${tried} · ${report.youtube.queued} queued for the background transcriber · ${report.youtube.already_stored} already stored`);
  }
  if (wordGaps) {
    report.word_gap = Object.fromEntries(Object.entries(wordGaps).map(([pid, g]) => [pid, {
      gap: [...g.gap].sort(), stated: [...g.stated].sort(),
      pull_order: sources.filter((s: any) => s.politician_id === pid).map((s: any) => ({ url: s.url, topic: s.topic, rank: wordGapRank(s, wordGaps) })),
    }]));
  }
  report.discovered = discovered.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, kind: sourceKind(s), ...(s.official_kind ? { official_kind: s.official_kind } : {}) }));
  report.included = {
    ...included,
    sources: sources.map((s: any) => ({ politician_id: s.politician_id, topic: s.topic, url: s.url, source_type: s.source_type, kind: sourceKind(s), ...(s.source_class ? { source_class: s.source_class } : {}), ...(isVideoSpeechEntry(s) ? { media: s.source_class === "youtube_video" ? "video" : "speech" } : {}) })),
  };
  if (plan && RESOLUTION && !(typeof deps.rotate === "object" && deps.rotate.roster)) {
    const by = (v: string) => RESOLUTION.resolved.filter((x: any) => x.via === v).length;
    report.url_resolution = { eligible: RESOLUTION.eligible, resolved: RESOLUTION.resolved.length, congress_gov: by("congress_gov"), cited_official: by("cited_official"), legislature_directory: by("legislature_directory"), unresolved: RESOLUTION.unresolved.length };
  }
  if (plan) report.plan = { cycle: plan.cycle, classes: plan.classes, politicians: plan.politicians, deprioritised: plan.deprioritised, skipped: plan.skipped, remaining_in_cycle: plan.remaining_in_cycle, planned_size: plan.size, roster_size: roster.length, state: plan.state };
  report.locker_writes = lockerWrites;
  // Which topics produced candidates / items this run.
  const itemsByTopic: Record<string, { strong: number; weak: number; mention: number }> = {};
  for (const w of lockerWrites) {
    const t = (itemsByTopic[w.topic] ||= { strong: 0, weak: 0, mention: 0 });
    if (w.strength in t) (t as any)[w.strength] += 1;
  }
  report.topics = { scored_against: SCORED_TOPICS.length, candidates: topicsScored, items: itemsByTopic };
  log(`stance-score: run topics — ${Object.keys(topicsScored).length ? Object.entries(topicsScored).map(([t, n]) => `${t} ×${n}`).join(", ") : "none"} (each page scored against ${SCORED_TOPICS.length} topics)`);
  if (deps.lockerStore) {
    const by = (s: string) => lockerWrites.filter((w) => w.strength === s).length;
    log(`evidence-locker: run complete — ${lockerWrites.length} new item(s) written (${by("strong")} strong, ${by("weak")} weak, ${by("mention")} mention)`);
    const tl = Object.entries(itemsByTopic).map(([t, c]) => `${t} ${c.strong + c.weak + c.mention} (${c.strong} strong, ${c.weak} weak, ${c.mention} mention)`);
    log(`evidence-locker: topics with new items this run — ${tl.length ? tl.join("; ") : "none"}`);
  }
  // Opposing evidence (read-only, logs only): a pair that got a new strong item
  // this run, whose strong items now run predominantly against the curated
  // stance on file. Nothing is written and no rule changes.
  let opposing: number | null = null;
  let opposingNote = "";
  if (deps.lockerStore && (plan || deps.curatedStances)) {
    try {
      const curated = deps.curatedStances ?? loadCuratedStances();
      opposing = (await checkOpposingEvidence({ writes: lockerWrites, curated, lockerStore: deps.lockerStore, flags, log })).length;
    } catch (e: any) { opposingNote = e?.message || String(e); }
  }
  // Promotion: recompute the stance records of everyone this run touched.
  if (deps.lockerStore && deps.statedDb) {
    // New strong (or strong-enough weak) evidence on a thin / empty pair goes
    // first and is never deferred by the run budget, so it can surface now.
    const thin = lockerWrites.filter((w) => promotableWrite(w) && !isFilled(counts, w.politician_id, w.topic));
    const priority = new Set(thin.map((w) => w.politician_id));
    const thinPairs = [...new Map(thin.map((w) => [`${w.politician_id}|${w.topic}`, w])).values()];
    if (thin.length) log(`stated-positions: new evidence on thin topic(s) — ${thinPairs.map((w) => `${w.politician_id}|${w.topic} (${w.strength} ${w.confidence})`).join(", ")}; recomputing first`);
    const pids = [...new Set([...priority, ...lockerWrites.map((w) => w.politician_id), ...(plan ? plan.politicians : [])])].filter((p) => p && inScope(scope, p));
    const moved: any[] = [];
    let checked = 0, deferred = 0;
    for (const pid of pids) {
      if (!priority.has(pid) && Date.now() - startedAt > RUN_BUDGET_MS) { deferred = pids.length - checked; break; }
      checked++;
      let entries: any[] = [];
      try { entries = await lockerEntriesFor(deps.lockerStore, pid, flags); }
      catch (e: any) { log(`stated-positions: ERROR ${pid} — Locker unreadable (${e?.message || e})`); continue; }
      const r = await syncPolitician(pid, entries, { db: deps.statedDb, log, now: deps.now });
      if (r.upserts.length || r.withdraw.length) moved.push({ politician_id: pid, promoted: r.upserts.map((u: any) => ({ issue_key: u.issueKey, stance: u.stance, strength: u.strength })), withdrawn: r.withdraw, ...(r.held?.length ? { held: r.held } : {}) });
    }
    report.stated_positions = { checked, deferred, moved, priority: [...priority] };
    log(`stated-positions: run complete — ${checked} politician(s) recomputed, ${moved.length} with changes${deferred ? `, ${deferred} deferred (run budget)` : ""}`);
  }
  if (plan) {
    // Baseline progress after this run's writes (recounted from the Locker when
    // anything new landed; the injected/pre-run counts otherwise).
    const ro = typeof deps.rotate === "object" ? deps.rotate : {};
    // With the baseline cache on, this run's writes are added to the counts it
    // started from instead of re-reading the whole Locker a second time.
    const after = lockerWrites.length && deps.lockerStore && !ro.counts
      ? (deps.baselineCache ? bumpBaselineCounts(counts, lockerWrites) : await lockerBaselineCounts(deps.lockerStore, { flags, pids: roster.map((r: any) => r.politician_id), log }))
      : counts;
    const rs = rosterSummary(roster, after);
    report.baseline = { strong: BASELINE_STRONG, weak: BASELINE_WEAK, reached: rs.reached, counts: after };
    log(baselineLine(roster, after));
    // Coverage gap report: read-only summary of the counts above + the frontier.
    try {
      const gaps = coverageGaps({ roster, counts: after, frontier: fresh?.frontier || {}, now: nowFn() });
      report.coverage_gaps = gaps.totals;
      log(coverageGapLine(gaps));
    } catch (e: any) { log(`raw-ingest: coverage gaps unavailable — ${e?.message || e}`); }
  }
  if (opposing !== null) log(opposingSummaryLine(opposing));
  else if (opposingNote) log(`raw-ingest: opposing evidence — not checked (${opposingNote})`);
  // Time guardrail: every run logs its duration against the budget; a run over
  // it logs SLOW RUN (if that is regular, lower MAX_POLITICIANS_PER_RUN to 5–6).
  const durationMs = Date.now() - startedAt;
  report.duration_ms = durationMs;
  report.budget_ms = RUN_BUDGET_MS;
  log(durationMs > RUN_BUDGET_MS
    ? `raw-ingest: SLOW RUN — ${durationMs}ms (budget ${RUN_BUDGET_MS}ms, ${report.results.length} source(s), ${MAX_POLITICIANS_PER_RUN} politician cap) · consider lowering MAX_POLITICIANS_PER_RUN toward 5–6`
    : `raw-ingest: run duration — ${durationMs}ms (budget ${RUN_BUDGET_MS}ms, ${report.results.length} source(s))`);
  const okCount = report.results.filter((r: any) => r.ok).length;
  // 200 all sources stored · 207 some failed (the rest still stored) · 502 none stored
  const status = report.ok ? 200 : okCount > 0 ? 207 : 502;
  return new Response(JSON.stringify(report), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The scheduled entry point. `run` is unchanged; this wrapper only tees the
// lines it already logs (still printed to the function log as before) and,
// after the run, hands them and the report to the suggestions log
// (raw-ingest-suggestions.mjs). A suggestions failure never touches the run.
export async function scheduled(deps: { run?: typeof run; suggestionsStore?: any; now?: () => Date; triggerTranscriber?: () => Promise<void>; [k: string]: any } = {}): Promise<Response> {
  const lines: string[] = [];
  const log = (l: string) => { lines.push(l); console.log(l); };
  const { run: runFn = run, suggestionsStore, now, triggerTranscriber, ...rest } = deps;
  // The production stores, built only when a caller (a test) has not injected all three.
  const productionStores = () => ({
    store: getStore(RAW_STORE_NAME),
    lockerStore: getStore(LOCKER_STORE_NAME),
    rotationStore: getStore(ROTATION_STORE_NAME),
    transcriptStore: getStore(TRANSCRIPT_STORE_NAME),
  });
  const injected = !!(rest.store && rest.lockerStore && rest.rotationStore);
  // The promotion step's database adapter, built only in production (loaded
  // lazily so a test that injects its stores never touches the database).
  const statedDb = rest.statedDb !== undefined || injected ? rest.statedDb : await productionStatedDb(log);
  // Word vs Action gap loader (pull-order preference), production only.
  const wordGaps = rest.wordGaps !== undefined || injected ? rest.wordGaps : productionWordGaps(log);
  const res = await runFn({
    fetch: globalThis.fetch,
    discover: true,
    rotate: true,
    fresh: true,
    // Video / speech discovery + transcription (raw-ingest-video.mjs) for every
    // planned politician (inside the allow-list, which is off by default).
    videoSpeech: true,
    // Baseline counts from the cached doc in the rotation store, refreshed from
    // the Locker at most every 30 minutes (evidence-locker-core.mjs).
    baselineCache: true,
    // The allow-list (raw-ingest-scope.mjs). Defaults to [] (whole roster);
    // ids there narrow the run again.
    scope: INGEST_ALLOW_LIST,
    ...(injected ? {} : productionStores()),
    ...(statedDb ? { statedDb } : {}),
    ...(wordGaps ? { wordGaps } : {}),
    ...rest,
    log,
  } as any);
  // Videos queued this run: wake the background transcriber (video-transcribe.mts).
  // It answers 202 at once and holds a worker lock, so an extra wake is harmless.
  try {
    const report = await res.clone().json();
    if (report?.youtube?.queued > 0) await (triggerTranscriber ?? wakeTranscriber)();
  } catch (e: any) {
    log(`video-transcribe: not woken — ${e?.message || e}`);
  }
  try {
    const report = await res.clone().json();
    await appendRunSuggestions(suggestionsStore ?? getStore(SUGGESTIONS_STORE_NAME), { lines, report, now: (now ?? (() => new Date()))() });
  } catch (e: any) {
    console.log(`raw-ingest-suggestions: not written — ${e?.message || e}`);
  }
  return res;
}

export async function wakeTranscriber(): Promise<void> {
  const origin = process.env.URL || "https://politidex.fyi";
  const r = await fetch(`${origin}/.netlify/functions/video-transcribe`, { method: "POST", signal: AbortSignal.timeout(4_000) });
  console.log(`video-transcribe: woken (HTTP ${r.status})`);
}

function productionWordGaps(log: (l: string) => void): (pids: string[]) => Promise<any> {
  return async (pids: string[]) => {
    const [{ db }, { sql }] = await Promise.all([import("../../db/index.js"), import("drizzle-orm")]);
    let curated: any = null;
    try { curated = loadCuratedStances(); }
    catch (e: any) { log(`raw-ingest: word gap — curated stances unreadable, promoted positions only (${e?.message || e})`); }
    return loadWordGapData(pids, { db, sql, curated });
  };
}

async function productionStatedDb(log: (l: string) => void): Promise<any> {
  try {
    const [{ db }, { pdxStatedPositions }, orm, { dbAdapter }] = await Promise.all([
      import("../../db/index.js"), import("../../db/schema.js"), import("drizzle-orm"), import("../lib/stated-positions-core.mjs"),
    ]);
    return dbAdapter(db, pdxStatedPositions, orm);
  } catch (e: any) {
    log(`stated-positions: database unavailable — promotion skipped this run (${e?.message || e})`);
    return null;
  }
}

export default async (): Promise<Response> => scheduled();

// Every minute. Each run is sized (caps + fetch ceilings in raw-ingest-core)
// to finish inside RUN_BUDGET_MS (~25 s), under the 30 s function limit.
export const config: Config = {
  schedule: "* * * * *",
};
