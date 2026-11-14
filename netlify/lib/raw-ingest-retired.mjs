// ─────────────────────────────────────────────────────────────────────────────
// raw-ingest-retired.mjs — sources removed from the every-minute raw-ingest
// rotation because they kept failing.
// ─────────────────────────────────────────────────────────────────────────────
// RECORD ONLY. The planner does not read this list: each URL below was deleted
// from the known-source list it came from (`from`), so planRun can no longer
// schedule it. The list exists so the removal is documented, so the cron can
// log it once ("raw-ingest: retired sources …"), and so the test suite can
// assert none of these URLs comes back into a dry-run plan.
//
// Basis: the raw-ingest suggestions log ("Keeps failing") on 2026-11-14. Every
// source here had an unbroken fail streak of 3 or more pulls (none had a
// successful pull since its streak began); `streak` is the count at removal.
// Sources that had succeeded recently were not touched.
//
// To bring a source back, re-add it to its `from` list and drop it here.

export const RETIRED_ON = "2026-11-14";
/** Bump when the list changes so the cron logs the new removals once. */
export const RETIRED_VERSION = 1;
export const RETIRED_LOG_KEY = "retired-sources-logged.json";

const r = (url, politician_id, from, last_error, streak) => ({ url, politician_id, from, last_error, streak });

export const RETIRED_SOURCES = [
  // Official YouTube channel feeds (OFFICIAL_YOUTUBE)
  r("https://www.youtube.com/feeds/videos.xml?channel_id=UChAQ4MD-HigmGnImSoAKBVA", "curtis", "OFFICIAL_YOUTUBE", "HTTP 500", 5),
  r("https://www.youtube.com/feeds/videos.xml?channel_id=UCNilDuFLmC7FBsyJoDYUzPA", "hoang_nguyen", "OFFICIAL_YOUTUBE", "HTTP 404", 5),
  // Congress.gov member / measure pages (CONGRESS_GOV) — blocked for automated fetches
  r("https://www.congress.gov/member/hakeem-jeffries/J000294", "jeffries", "CONGRESS_GOV", "HTTP 403", 14),
  r("https://www.congress.gov/member/charles-schumer/S000148", "schumer", "CONGRESS_GOV", "HTTP 403", 14),
  r("https://www.congress.gov/bill/116th-congress/house-resolution/109", "aoc", "CONGRESS_GOV", "HTTP 403", 12),
  r("https://www.congress.gov/bill/119th-congress/senate-bill/146", "cruz", "CONGRESS_GOV", "HTTP 403", 14),
  r("https://www.congress.gov/bill/118th-congress/senate-bill/2669", "warren", "CONGRESS_GOV", "HTTP 403", 16),
  r("https://www.congress.gov/bill/119th-congress/senate-bill/954", "lummis", "CONGRESS_GOV", "HTTP 403", 14),
  // Homepages / newsrooms (REQUESTED_POLITICIANS `page`)
  r("https://www.democraticleader.house.gov", "jeffries", "REQUESTED_POLITICIANS", "fetch failed", 14),
  r("https://www.state.gov", "rubio", "REQUESTED_POLITICIANS", "HTTP 403", 16),
  r("https://www.defense.gov", "hegseth", "REQUESTED_POLITICIANS", "HTTP 403", 16),
  r("https://www.hhs.gov", "rfkjr", "REQUESTED_POLITICIANS", "HTTP 403", 15),
  r("https://www.lgraham.senate.gov", "graham", "REQUESTED_POLITICIANS", "HTTP 403", 17),
  r("https://www.michigan.gov/whitmer/news", "gretchen_whitmer", "REQUESTED_POLITICIANS", "HTTP 403", 15),
  r("https://www.gillibrand.senate.gov/news/press/", "gillibrand", "REQUESTED_POLITICIANS", "HTTP 403/404", 17),
  r("https://pressley.house.gov/media/press-releases/", "ayanna_pressley", "REQUESTED_POLITICIANS", "HTTP 404", 5),
  r("https://donalds.house.gov/media/press-releases", "donalds", "REQUESTED_POLITICIANS", "HTTP 404", 17),
  r("https://waters.house.gov/media/press-releases", "maxine_waters", "REQUESTED_POLITICIANS", "HTTP 404", 16),
  r("https://www.ronjohnson.senate.gov/press-releases", "ron_johnson", "REQUESTED_POLITICIANS", "HTTP 404", 14),
  r("https://www.rickscott.senate.gov/newsroom/press-releases", "rick_scott", "REQUESTED_POLITICIANS", "HTTP 503", 17),
];

/** The one-time log line recording what was removed and why. */
export function retiredSourcesLine(list = RETIRED_SOURCES) {
  return `raw-ingest: retired sources — ${list.length} source(s) removed from the rotation on ${RETIRED_ON} after failing 3+ pulls in a row (suggestions log "Keeps failing"): `
    + list.map((s) => `${s.url} (${s.politician_id}, ${s.last_error}, ${s.streak} in a row)`).join("; ");
}
