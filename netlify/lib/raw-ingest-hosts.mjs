// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-hosts.mjs — why a fetch failed, and which hosts to stop trying
// ─────────────────────────────────────────────────────────────────────────────
// 1. CLASSIFY. undici reports every network-level failure as the same
//    TypeError("fetch failed"); the real reason sits on `.cause` (often nested).
//    classifyFetchError() turns any pull / discovery error into one class:
//      dns · timeout · refused · reset · tls · network   (network level)
//      http_403 · http_429 · http_5xx                    (the host said no)
//      http_404 · http_4xx · empty                       (this page only)
//      local_fd                                           (our side: EMFILE)
//    plus a short detail ("ENOTFOUND: getaddrinfo ENOTFOUND x.gov"), so a log
//    line says "fetch failed (dns: …)" instead of a bare "fetch failed".
//
// 2. HOST HEALTH (per rotation cycle). HOST_LEVEL classes count against the
//    page's host. A host with HOST_SKIP_FAILS such failures this cycle and no
//    success is skipped for the rest of the cycle: its pages, official
//    patterns and frontier pages are left out of the pull list before any slot
//    is spent on them. The doc (HOST_HEALTH_KEY in the rotation store) resets
//    when the cycle changes. Page-level failures (404, empty body) never count,
//    and neither does a RUN-SIDE OUTAGE — every fetch of a run failing at the
//    network level across several hosts — which points at the function itself,
//    not at the sites.
//
// 3. PROBE (inside one run). Pages on one host are pulled probe-first: the
//    first page goes alone and the rest follow concurrently only if it did not
//    fail at host level, so a dead host costs one fetch, not six.
//
// Pure apart from the injected store.

export const HOST_HEALTH_KEY = "host-health.json";
export const HOST_HEALTH_VERSION = "host-health-v1";
export const HOST_SKIP_FAILS = 2;
export const OUTAGE_MIN_FAILS = 4;
export const OUTAGE_MIN_HOSTS = 3;
export const HOST_LEVEL = new Set(["dns", "timeout", "refused", "reset", "tls", "network", "http_403", "http_429", "http_5xx"]);
const NETWORK_LEVEL = new Set(["dns", "timeout", "refused", "reset", "tls", "network", "local_fd"]);

export const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

/** { cls, detail } for a fetch / pull error (an Error, or a message string). */
export function classifyFetchError(e) {
  const msg = typeof e === "string" ? e : (e?.message || String(e));
  const http = /^HTTP (\d{3})\b/.exec(msg);
  if (http) {
    const s = Number(http[1]);
    const cls = s === 403 ? "http_403" : s === 429 ? "http_429" : s >= 500 ? "http_5xx" : (s === 404 || s === 410) ? "http_404" : "http_4xx";
    return { cls, detail: msg };
  }
  if (msg === "empty body") return { cls: "empty", detail: msg };
  if (e?.name === "TimeoutError" || /aborted due to timeout/i.test(msg)) return { cls: "timeout", detail: "no response before the fetch deadline" };
  const codes = [];
  let first = "";
  for (let c = typeof e === "object" ? e?.cause : null, d = 0; c && d < 5; c = c.cause, d++) {
    if (c.code) codes.push(String(c.code));
    if (c.name === "ConnectTimeoutError") codes.push("UND_ERR_CONNECT_TIMEOUT");
    if (!first && c.message) first = String(c.message);
  }
  const all = `${codes.join(" ")} ${first}`;
  let cls = "network";
  if (/\bE[MN]FILE\b/.test(all)) cls = "local_fd";
  else if (/ENOTFOUND|EAI_AGAIN|EAI_FAIL|EAI_NONAME/.test(all)) cls = "dns";
  else if (/CONNECT_TIMEOUT|ETIMEDOUT|HEADERS_TIMEOUT|BODY_TIMEOUT|timed? ?out/i.test(all)) cls = "timeout";
  else if (/ECONNREFUSED/.test(all)) cls = "refused";
  else if (/ECONNRESET|EPIPE|UND_ERR_SOCKET|UND_ERR_CLOSED|other side closed|socket hang up/i.test(all)) cls = "reset";
  else if (/CERT|SSL|TLS|UNABLE_TO_VERIFY|SELF_SIGNED|DEPTH_ZERO|HOSTNAME|ALTNAME/i.test(all)) cls = "tls";
  const detail = [codes[0], first].filter(Boolean).join(": ").slice(0, 160) || "no cause given";
  return { cls, detail };
}

/** "fetch failed (dns: ENOTFOUND: getaddrinfo …)" — the message with its class. */
export function describeFetchError(e) {
  const msg = typeof e === "string" ? e : (e?.message || String(e));
  const { cls, detail } = classifyFetchError(e);
  return { cls, error: detail && detail !== msg ? `${msg} (${cls}: ${detail})` : `${msg} (${cls})` };
}

export function normaliseHostHealth(doc, cycle) {
  let d = doc;
  if (typeof d === "string") { try { d = JSON.parse(d); } catch { d = null; } }
  if (!d || typeof d !== "object" || d.cycle !== cycle || typeof d.hosts !== "object") return { cycle, hosts: {} };
  return { cycle, hosts: { ...d.hosts } };
}

export async function readHostHealth(store, cycle, log = console.log) {
  if (!store) return normaliseHostHealth(null, cycle);
  try { return normaliseHostHealth(await store.get(HOST_HEALTH_KEY, { type: "json" }), cycle); }
  catch (e) { log(`raw-ingest: host health unreadable — starting clean (${e?.message || e})`); return normaliseHostHealth(null, cycle); }
}

export async function saveHostHealth(store, health, { now = new Date(), log = console.log } = {}) {
  if (!store) return false;
  try { await store.setJSON(HOST_HEALTH_KEY, { version: HOST_HEALTH_VERSION, updated_at: now.toISOString(), ...health }); return true; }
  catch (e) { log(`raw-ingest: host health not saved — ${e?.message || e}`); return false; }
}

/** Hosts skipped for the rest of this cycle → Map(host → { fails, cls, last_error }). */
export function skippedHosts(health) {
  const out = new Map();
  for (const [h, x] of Object.entries(health?.hosts || {})) if ((x.fails || 0) >= HOST_SKIP_FAILS && !(x.ok > 0)) out.set(h, x);
  return out;
}

/**
 * Drop sources whose host is skipped this cycle. `protect` = normalised URLs
 * never dropped. Returns { kept, dropped }.
 */
export function filterSkippedHosts(sources, skip, { protect = new Set(), norm = (u) => u } = {}) {
  const kept = [], dropped = [];
  for (const s of sources || []) {
    if (skip.has(hostOf(s.url)) && !protect.has(norm(s.url))) dropped.push(s); else kept.push(s);
  }
  return { kept, dropped };
}

/** Is this run a run-side outage (every fetch failed at the network level, across hosts)? */
export function isRunOutage(results) {
  const tried = (results || []).filter((r) => !r.host_skipped);
  if (!tried.length || tried.some((r) => r.ok)) return false;
  const net = tried.filter((r) => NETWORK_LEVEL.has(r.error_class));
  return net.length >= OUTAGE_MIN_FAILS && net.length === tried.length && new Set(net.map((r) => hostOf(r.url))).size >= OUTAGE_MIN_HOSTS;
}

/** Fold one run's results into the cycle's host health. Returns { outage, newlySkipped }. */
export function recordHostResults(health, results, { at = new Date().toISOString() } = {}) {
  const outage = isRunOutage(results);
  const before = new Set(skippedHosts(health).keys());
  for (const r of results || []) {
    if (r.host_skipped || r.youtube) continue;
    const h = hostOf(r.url);
    if (!h) continue;
    const x = (health.hosts[h] ||= { fails: 0, ok: 0 });
    if (r.ok) { x.ok = (x.ok || 0) + 1; continue; }
    if (outage || !HOST_LEVEL.has(r.error_class)) continue;
    x.fails = (x.fails || 0) + 1; x.cls = r.error_class; x.last_error = r.error; x.last_failed_at = at;
  }
  const newlySkipped = [...skippedHosts(health).keys()].filter((h) => !before.has(h));
  return { outage, newlySkipped };
}

/**
 * Pull `sources` with `pull(src)` (never throws), probe-first per host: the
 * first page of each host goes alone, the rest concurrently once it did not
 * fail at host level. A page left out gets { ok: false, host_skipped: true }.
 * Results keep source order.
 */
export async function pullProbeFirst(sources, pull, { log = console.log } = {}) {
  const results = new Array(sources.length);
  const groups = new Map();
  sources.forEach((s, i) => {
    // YouTube sources (channel feeds, cited own-channel videos) never probe each other.
    const key = /^youtube/.test(s.source_class || "") ? `#yt${i}` : (hostOf(s.url) || `#${i}`);
    (groups.get(key) || groups.set(key, []).get(key)).push(i);
  });
  await Promise.all([...groups.entries()].map(async ([host, idx]) => {
    const [first, ...rest] = idx;
    results[first] = await pull(sources[first]);
    const r = results[first];
    if (rest.length && !r.ok && HOST_LEVEL.has(r.error_class)) {
      log(`raw-ingest: HOST-SKIP ${host} — first page failed (${r.error_class}); ${rest.length} more page(s) on it left out of this run`);
      for (const i of rest) results[i] = { ok: false, url: sources[i].url, host_skipped: true, error_class: "host_skipped", error: `host skipped — ${host} failed (${r.error_class}) earlier in this run` };
      return;
    }
    await Promise.all(rest.map(async (i) => { results[i] = await pull(sources[i]); }));
  }));
  return results;
}
