// ─────────────────────────────────────────────────────────────────────────────
// House member votes for the curated ingest — raw store first, API second
// ─────────────────────────────────────────────────────────────────────────────
// The vote-actions cron (vote-actions-core.ts) already fetches every recent House
// roll call's Congress.gov `/house-vote/<c>/<s>/<roll>/members` response and keeps
// it unmodified in Blobs "raw-ingest-votes". The curated ingest (vr-ingest.ts)
// used to fetch the same URL again. It now reads the stored body first and only
// calls Congress.gov when no usable payload exists, so the API is hit once per
// roll call and both paths parse the same bytes.
//
// "Usable" = a house_vote envelope for exactly this congress / session / roll,
// HTTP 2xx, whose JSON has a non-empty member list. The newest such payload wins.
// An empty or unreadable payload, a store error or no store at all falls back to
// the old fetch (logged) — never a crash, never a dropped roll call.
//
// Read-only on the store: vote-actions stays the only writer.
// Pure over injected deps (store, fetch) so it is testable with no network.
import { RAW_VOTES_STORE_NAME, rollRawPrefix, type RawStore, type RollEnvelope } from "./vote-actions-core.js";

const CONGRESS_API_BASE = "https://api.congress.gov/v3";

export type MembersRead = {
  container: Record<string, any> | null; // the `houseRollCallVoteMemberVotes` object, or null
  source: "raw_store" | "congress_gov" | "none";
  rawRef: string | null;                 // raw-ingest-votes key when read from the store
  note?: string;                         // why the store was not used / why nothing was read
};

const containerOf = (md: any, chamber: string) =>
  md?.[`${chamber}RollCallVoteMemberVotes`] || md?.houseRollCallVoteMemberVotes || md?.senateRollCallVoteMemberVotes || null;

export async function readStoredMembers(
  store: RawStore | null | undefined, chamber: string, congress: number, session: number, roll: number,
): Promise<{ container: Record<string, any> | null; rawRef: string | null; note: string }> {
  if (chamber !== "house") return { container: null, rawRef: null, note: "not a House roll call" };
  if (!store || !store.list) return { container: null, rawRef: null, note: "no raw store" };
  try {
    const { blobs = [] } = (await store.list({ prefix: rollRawPrefix("house", congress, session, roll) })) || ({} as any);
    const keys = blobs.map((b) => b.key).sort().reverse();
    if (!keys.length) return { container: null, rawRef: null, note: "no stored payload" };
    for (const key of keys) {
      const env = (await store.get(key, { type: "json" })) as RollEnvelope | null;
      if (!env || env.kind !== "house_vote" || env.congress !== congress || env.session !== session || env.roll !== roll) continue;
      if (!(env.http_status >= 200 && env.http_status < 300) || !env.body) continue;
      let c: any = null;
      try { c = containerOf(JSON.parse(env.body), chamber); } catch { continue; }
      if (c && Array.isArray(c.results) && c.results.length) return { container: c, rawRef: key, note: "" };
    }
    return { container: null, rawRef: null, note: "stored payload has no member positions" };
  } catch (e: any) {
    return { container: null, rawRef: null, note: `raw store unreadable: ${e?.message || e}` };
  }
}

export async function readHouseMembers(opts: {
  store?: RawStore | null; fetch: typeof fetch; apiKey: string;
  chamber: string; congress: number; session: number; roll: number;
  log?: (l: string) => void;
}): Promise<MembersRead> {
  const log = opts.log || ((l: string) => console.log(l));
  const stored = await readStoredMembers(opts.store, opts.chamber, opts.congress, opts.session, opts.roll);
  if (stored.container) return { container: stored.container, source: "raw_store", rawRef: stored.rawRef };
  if (opts.chamber === "house") log(`vr-ingest: ${opts.chamber} roll ${opts.roll} — ${stored.note} in ${RAW_VOTES_STORE_NAME}; fetching from Congress.gov`);
  try {
    const url = `${CONGRESS_API_BASE}/${opts.chamber}-vote/${opts.congress}/${opts.session}/${opts.roll}/members` +
      `?format=json&api_key=${encodeURIComponent(opts.apiKey)}`;
    const res = await opts.fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      console.warn(`vr-ingest: members ${res.status} for ${opts.chamber} roll ${opts.roll}`);
      return { container: null, source: "none", rawRef: null, note: `HTTP ${res.status}` };
    }
    return { container: containerOf(await res.json(), opts.chamber) || {}, source: "congress_gov", rawRef: null, note: stored.note };
  } catch (e: any) {
    console.warn(`vr-ingest: members fetch failed for ${opts.chamber} roll ${opts.roll} —`, e?.message || String(e));
    return { container: null, source: "none", rawRef: null, note: String(e?.message || e) };
  }
}
