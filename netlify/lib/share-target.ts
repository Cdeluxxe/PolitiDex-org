// ─────────────────────────────────────────────────────────────────────────────
// share-target — what a shared PolitiDex URL is actually about
// ─────────────────────────────────────────────────────────────────────────────
// One place decides what a link MEANS, so the HEAD a scraper reads and the card
// image it renders can never disagree with each other. Both share-preview.ts (the
// meta rewriter) and share-og.ts (the card renderer) import this module and ask it
// the same two questions: what is this URL pointing at, and what do we truthfully
// know about it?
//
// The two halves are deliberately separate:
//
//   parseTarget(url)      — string work. Which surface is this, and with what ids?
//                           No network, no judgment. The ONE table it reads is the
//                           person-alias map, so /p/mike_lee and /p/lee arrive here
//                           as the same target rather than as two records — the
//                           same resolution person-file.js performs in the browser.
//   resolveTarget(t, …)   — turn those ids into real words. Reads the generated
//                           share index (db/share-index.json) for anything that
//                           lives in the client bundle, and the Voting Record API
//                           for anything that lives in the database.
//
// HONESTY RULES, which are the whole reason this file is small:
//
//   • A preview carries FACTS, never CONCLUSIONS. A stated position and a recorded
//     vote are immutable and sourced, so both may travel. The verdict computed
//     from them is a revisable interpretation, so it never does — no score, no
//     verdict stamp, no kept/broken tally. A cached judgment that has since been
//     corrected is precisely the thing that must not end up as a PNG in someone's
//     feed; a cached quote and a cached roll call cannot go stale that way.
//     The card shows both halves and lets the reader do the arithmetic.
//   • An Issue Spotlight is a sourced explainer about a subject, not a finding
//     about a person. It gets its own eyebrow, its own accent and its own footer
//     line, and it never borrows the Official Record's vocabulary.
//   • If we cannot resolve a link, we say so (or fall back to the site card).
//     We never invent a plausible title, quote, date or measure.
import shareIndex from "../../db/share-index.json" with { type: "json" };
import shareStances from "../../db/share-stances.json" with { type: "json" };

// ── The generated index (see scripts/gen-share-index.mjs) ────────────────────
type PersonRec = { n: string; o?: string; s?: string; p?: string };
type SpotlightRec = { t: string; d?: string; pl?: string; u?: string };
type CoreRec = { l: string; b?: string };
// One line of a person's formal record, as the profile brief already prints it:
// p = pattern label ("Strongly opposes" / "Mostly supports" / "Split"), i = issue
// label including its chip emoji, c = the two side counts in the engine's own
// phrase, present only where the brief prints a tally. Nothing computed, nothing
// aggregated: no percentage, no total, no Word-vs-Action figure. See
// scripts/gen-crawl-record.mjs for where the words come from and why they are
// baked at build time instead of fetched.
export type RecordLine = { p: string; i: string; c?: string };
type ShareIndex = {
  people: Record<string, PersonRec>;
  // An arriving person id → the ONE roster id it means. Generated from the app's
  // own tables in the app's own precedence (see gen-share-index.mjs), so the edge
  // resolves /p/mike_lee the way person-file.js does instead of treating it as an
  // id nobody carries. Never a fact about a person — only which id is which.
  personAliases: Record<string, string>;
  spotlights: Record<string, SpotlightRec>;
  cores: Record<string, CoreRec>;
  issues: Record<string, string>;
  // Canonical roster id → up to 6 formal-record lines. Keyed canonically, so
  // /p/mike_lee and /p/lee read the SAME entry and cannot print different
  // records. A person with no readable pattern is absent from this table rather
  // than present-and-empty, because the crawl block's rule is that a thin
  // unpublished file prints no record section at all.
  personRecord?: Record<string, RecordLine[]>;
};
const INDEX = shareIndex as unknown as ShareIndex;
const PERSON_ALIASES: Record<string, string> = INDEX.personAliases || {};
const PERSON_RECORD: Record<string, RecordLine[]> = INDEX.personRecord || {};

// ── canonicalPersonId ────────────────────────────────────────────────────────
// The roster id an arriving person address MEANS. `mike_lee` is the display-name
// spelling of the senator the roster files under `lee`; `scott_chew` is the
// display-name spelling of the Utah representative the roster files under
// `chew_h68`, and PDX_PROFILE_ALIAS already asserts it is not a second
// officeholder. person-file.js has resolved both for a while, so the addresses
// open the right file in a browser — but the EDGE could not, so /p/mike_lee kept
// the homepage's <title> and, worse, the homepage's canonical. That is a second
// address for a person who already has one, telling a crawler to index neither.
//
// One static-table read, no network, no guessing: an id with no entry comes back
// unchanged (so an unknown pid stays unknown and mints nobody), and a hop is only
// taken when its target is a person the index actually holds.
export function canonicalPersonId(id: string): string {
  if (!id) return "";
  const hop = PERSON_ALIASES[id];
  if (hop && hop !== id && INDEX.people[hop]) return hop;
  return id;
}

// The SAID half, keyed "<rosterId>|<issueKey>" (see scripts/gen-share-index.mjs).
// t=position text, w=support/oppose/mixed, h=topic headline, s=source label.
// There is deliberately no date field: the stance data has none.
type SaidRec = { t: string; w?: string; h?: string; s?: string };
const SAID = (shareStances as unknown as { stances: Record<string, SaidRec> }).stances || {};

export type TargetKind =
  | "profile"
  | "spotlight"
  | "rank"
  | "bill"
  | "receipt"
  | "record"
  | "vote";

export type Target =
  | { kind: "profile"; id: string }
  | { kind: "spotlight"; slug: string }
  | { kind: "rank"; core: string; focus: string }
  // `congress` carries the SITTING as it appears in the address: a congress number
  // for a federal measure, a state session code ("2024GS") for a state one, or ""
  // when the number was cited on its own. The field keeps its name because it is
  // the wire name on ?bill=, #bill/ and the og query, and renaming it would break
  // links already in the wild.
  | { kind: "bill"; congress: string; number: string }
  | { kind: "receipt"; pid: string; issue: string }
  | { kind: "record"; pid: string; issue: string }
  | { kind: "vote"; congress: string; chamber: string; roll: string };

// The two immutable halves of a Word-vs-Action comparison. Present only when both
// (or at least one) could actually be resolved — never padded out with a guess.
export type Said = {
  // "Supports" / "Opposes" / "Mixed on" — the app's own stance word, not a reading
  // of the prose. Empty when the stance carries no direction.
  word: string;
  text: string;
  topic: string;
  source: string;
};
export type Did = {
  // "Voted Yea" / "Voted Nay" / "Co-sponsored" — read off the record, never derived.
  action: string;
  measure: string;
  title: string;
  // ISO yyyy-mm-dd. Unlike the said side, the record half genuinely carries a date.
  date: string;
  detail: string;
};
export type Comparison = { said?: Said; did?: Did };

// What a resolved link is allowed to say about itself.
export type Resolved = {
  kind: TargetKind;
  // Card + <title> chrome.
  eyebrow: string;
  accent: string;
  title: string;
  subtitle: string;
  // The one-line <meta description> / og:description.
  description: string;
  // A small print line on the card, used to keep each surface honest about what
  // it is (and, for Spotlights, about what it is NOT).
  footnote: string;
  // The in-app hash this URL should open, when the app needs telling.
  hash?: string;
  // Query string for /share-og (ids only — never free text, so the card endpoint
  // can never be used to put arbitrary words on PolitiDex letterhead).
  ogQuery: string;
  // Facts for the comparison layout. Absent on every other surface.
  comparison?: Comparison;
  // WHO this page is about, spelled out in fields rather than in a formatted
  // string. Present on a person file only.
  //
  // It exists because a <title> is not a document. /p/lee has carried its own
  // title, canonical and card for a while, and Google still read it as a
  // duplicate of "/" — because the BODY it was serving was the homepage shell,
  // byte for byte, for every one of 757 people. share-preview.ts uses these three
  // fields to write one short, unique, crawlable header into that body. They are
  // the same three values the card and the title are already built from
  // (INDEX.people), re-exposed unformatted so nothing downstream has to parse a
  // display string back into an office and a state.
  //
  // Identity, plus the shape of the formal record. A name, the office they hold,
  // the state they hold it in, and up to six pattern lines in the profile brief's
  // own words — because a name and an office made the 757 person addresses
  // distinct from the homepage without making them distinct from each other, and
  // a crawler reading two of those bodies could not tell whose file it was on.
  //
  // `record` is a snapshot read at build time (see personRecord above): the same
  // tiers and issue labels the live brief renders, never a second engine's
  // opinion, and never a network call on the anonymous first byte. It is absent
  // for a person with no readable pattern, and callers must print nothing at all
  // in that case rather than announcing the absence.
  //
  // No score, no Direction Match, no party-as-grade, no percentage — the same
  // wall the rest of this file keeps.
  person?: {
    pid: string;
    name: string;
    office: string;
    state: string;
    record?: RecordLine[];
  };
};

// A link we positively know is wrong — as opposed to one we merely could not
// look up. Only this justifies a 404.
export type NotFound = { notFound: true; kind: TargetKind; message: string };

const MAX_ID = 120;

function clean(v: string | null | undefined, max = MAX_ID): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function squeeze(s: string, max: number): string {
  const out = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (out.length <= max) return out;
  return out.slice(0, max - 1).replace(/[\s,;:.\-—]+$/, "") + "…";
}

// ── parseTarget ──────────────────────────────────────────────────────────────
// Server-visible forms only. The app's existing hash links (#bill/…, #receipt=…,
// #issue=…) still work for people who already have them — a hash simply never
// reaches a server, so it cannot be previewed, which is why the share buttons now
// emit these query/path equivalents instead.
export function parseTarget(url: URL): Target | null {
  const path = url.pathname;
  const q = url.searchParams;

  // ?p= first, deliberately. The app writes this param when a profile opens and
  // removes it when the profile closes, so its presence means a profile is the
  // thing on screen — even when the address underneath is a Spotlight or roll-call
  // path the reader arrived on. The share button copies whatever is in the bar, so
  // /issue/<slug>?p=<id> is a real URL people can send, and it is about the person.
  const p = clean(q.get("p"));
  if (p) return { kind: "profile", id: canonicalPersonId(p) };

  // /vote/<congress>/<chamber>/<roll> — the official roll-call address.
  const vote = path.match(/^\/vote\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (vote) {
    return {
      kind: "vote",
      congress: clean(decodeURIComponent(vote[1]), 8),
      chamber: clean(decodeURIComponent(vote[2]), 12).toLowerCase(),
      roll: clean(decodeURIComponent(vote[3]), 8),
    };
  }

  // /issue/<slug> — the Issue Spotlight clean path (already server-visible).
  const spot = path.match(/^\/issue\/([A-Za-z0-9_-]+)\/?$/);
  if (spot) return { kind: "spotlight", slug: clean(spot[1]) };

  // /p/<pid> — the canonical person-file address. Checked AFTER ?p= above, and
  // the order matters in exactly one case: /p/<a>?p=<b>, which the app never
  // produces but a hand-edited link could. The query wins there because ?p= is
  // what the app writes for "the profile currently on screen", so it is the more
  // recent of two claims about the same reader.
  //
  // The id is canonicalised on the way through (canonicalPersonId), so an alias
  // address and the roster address are ONE target from here on: one lookup, one
  // canonical, one og:url, one crawl block. An id with no alias entry — including
  // one that names nobody — passes through untouched.
  const person = path.match(/^\/p\/([A-Za-z0-9_]+)\/?$/);
  if (person) return { kind: "profile", id: canonicalPersonId(clean(person[1])) };

  // /b/<sitting>/<number> — the canonical bill address, and /b/<number> for a
  // number cited without one. A bill profile is a record like a person file is a
  // record, so it gets a path a reader can read out loud and a scraper can preview,
  // not a query parameter. The sitting comes first because that is the order the
  // identity is spoken in: 119th Congress, H.R. 1.
  const bill2 = path.match(/^\/b\/([A-Za-z0-9]{1,12})\/(.+?)\/?$/);
  if (bill2) {
    return {
      kind: "bill",
      congress: clean(decodeURIComponent(bill2[1]), 12),
      number: clean(decodeURIComponent(bill2[2]), 60),
    };
  }
  const bill1 = path.match(/^\/b\/(.+?)\/?$/);
  if (bill1) return { kind: "bill", congress: "", number: clean(decodeURIComponent(bill1[1]), 60) };

  // Everything else hangs off the single-page document at "/".
  const issueQ = clean(q.get("issue"));
  if (issueQ) return { kind: "spotlight", slug: issueQ };

  // ?bill=<congress>/<number>
  const bill = clean(q.get("bill"), 80);
  if (bill) {
    const m = bill.match(/^([^/]*)\/(.+)$/);
    if (m) return { kind: "bill", congress: clean(m[1], 8), number: clean(m[2], 60) };
  }

  // ?receipt=<pid>[~<issueKey>] and ?record=<pid>[~<issueKey>] — the two verdict
  // surfaces, kept apart here exactly as they are kept apart in the app.
  for (const kind of ["receipt", "record"] as const) {
    const raw = clean(q.get(kind), 160);
    if (!raw) continue;
    const [pid, issue] = raw.split("~");
    if (pid) return { kind, pid: clean(pid), issue: clean(issue || "") };
  }

  // ?rank=<coreKey>[&key=<issueKey>] — the "who backs up their words" ranking.
  const rank = clean(q.get("rank"));
  if (rank) return { kind: "rank", core: rank, focus: clean(q.get("key")) };

  return null;
}

// ── canonicalPath ────────────────────────────────────────────────────────────
// The one clean address for a record, derived from the TARGET rather than from
// the request. This is what rel="canonical" and og:url are for, and it is the
// reason both used to be wrong: index.html carries a single hardcoded
// `<link rel="canonical" href="https://www.politidex.fyi/">`, so every share link —
// every profile, Spotlight, roll call, bill and receipt — told search engines it
// was really the homepage, and og:url unfurled with whatever the reader happened
// to have in their address bar (`?utm_source=…`, a stale `?p=` layered on an
// /issue/ path, a share tracker).
//
// Deriving it from the parsed target normalizes all of that away: the same record
// reached three different ways resolves to one address, and it is an address that
// actually opens the record. Where a surface has a clean path (Spotlight, roll
// call) that path wins over the query form.
export function canonicalPath(t: Target): string {
  const e = encodeURIComponent;
  switch (t.kind) {
    // /p/<pid> is the canonical person address as of Phase 1. The ?p= form still
    // RESOLVES — parseTarget reads it, _pdxOpenFromUrl opens it, and links of
    // that shape are already in the wild — but it no longer canonicalises: two
    // addresses for one record is exactly what rel="canonical" exists to
    // collapse, and the path is the one a reader can cite without it looking
    // like a tracking parameter.
    case "profile":   return `/p/${e(t.id)}`;
    // Both /issue/<slug> and ?issue=<slug> resolve here; the path is the canonical one.
    case "spotlight": return `/issue/${e(t.slug)}`;
    case "vote":      return `/vote/${e(t.congress)}/${e(t.chamber)}/${e(t.roll)}`;
    // /b/<sitting>/<number>, and /b/<number> when no sitting was cited. ?bill= still
    // RESOLVES for links already sent — it just stops being the canonical form, for
    // the same reason ?p= did.
    case "bill":      return t.congress ? `/b/${e(t.congress)}/${e(t.number)}` : `/b/${e(t.number)}`;
    case "receipt":
    case "record":    return `/?${t.kind}=${e(t.pid + (t.issue ? "~" + t.issue : ""))}`;
    case "rank":      return `/?rank=${e(t.core)}` + (t.focus ? `&key=${e(t.focus)}` : "");
  }
}

// ── Per-surface chrome ───────────────────────────────────────────────────────
// Each surface gets a visibly different eyebrow and accent so two PolitiDex links
// in the same feed never read as the same thing. The Spotlight row is the one that
// matters most: it must not be mistakable for an Official Record verdict card.
const CHROME: Record<TargetKind, { eyebrow: string; accent: string }> = {
  profile: { eyebrow: "🏛 POLITIDEX PROFILE", accent: "#60a5fa" },
  spotlight: { eyebrow: "📍 ISSUE SPOTLIGHT", accent: "#34d399" },
  rank: { eyebrow: "🎯 ISSUE RANKING", accent: "#f5c842" },
  bill: { eyebrow: "📜 LEGISLATION", accent: "#a78bfa" },
  receipt: { eyebrow: "🧾 SAY vs. DO", accent: "#fb923c" },
  record: { eyebrow: "🏛 OFFICIAL RECORD", accent: "#f87171" },
  vote: { eyebrow: "🗳 ROLL-CALL VOTE", accent: "#f59e0b" },
};

// THE BARE BRAND HOST, NOT A URL. No scheme on purpose: this is the wordmark a
// painted card prints, matching every other wordmark in the repo, and it is a
// string a human reads and may type — which is exactly what the apex 301 exists
// to catch. It is not an address a crawler follows, so it stays scheme-less. If
// this ever becomes an href, it must be built on the www origin instead; the
// absolute apex form is banned repo-wide by scripts/test-canonical-and-origin.mjs.
const SITE = "politidex.fyi";

function issueLabel(key: string): string {
  if (!key) return "";
  const direct = INDEX.issues[key];
  if (direct) return direct;
  const core = INDEX.cores[key];
  if (core) return core.l;
  return "";
}

// Labels carry a leading emoji for the app's chips; a card headline reads better
// without it, and a <title> reads better without it too.
function stripEmoji(s: string): string {
  return String(s || "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
}

function personLine(rec: PersonRec): string {
  return [rec.o, rec.s, rec.p ? `(${rec.p})` : ""].filter(Boolean).join(" · ");
}

// ── The Voting Record API (the half that lives in the database) ──────────────
// Short timeout, and every failure is a soft failure: a preview is never worth
// holding a page open for. The ONE hard answer we accept is an explicit 404 on a
// roll-call address, because "this vote does not exist" is the honest reply a
// dead /vote/ link has been missing.
async function apiGet(origin: string, path: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(origin + path, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// A state chamber is named for its state; a federal one is not. The measure rows
// carry "utah house" / "utah senate", which is the same test the client's chamber
// table makes.
function isStateChamber(chamber: unknown): boolean {
  return /^[a-z]+ (house|senate)$/i.test(String(chamber || "").trim());
}
// The sitting in prose: a congress, or a state session code spelled out the way the
// legislature itself spells it ("2024GS" → "2024 General Session"). An unrecognised
// code is printed as itself rather than guessed at.
const SESSION_KIND: Record<string, string> = {
  GS: "General Session", VS: "Veto Override Session",
  S1: "1st Special Session", S2: "2nd Special Session",
  S3: "3rd Special Session", S4: "4th Special Session", S5: "5th Special Session",
};
function sittingText(m: any): string {
  if (m?.congress) return `${m.congress}th Congress`;
  const s = String(m?.session || "").trim();
  if (!s) return "";
  const p = s.match(/^(\d{4})([A-Za-z0-9]+)$/);
  return p ? `${p[1]} ${SESSION_KIND[p[2].toUpperCase()] || p[2]}` : s;
}

function measureHeadline(m: any): { title: string; subtitle: string } {
  const number = String(m?.number || "").trim();
  const title = squeeze(m?.shortTitle || m?.title || "", 120);
  return {
    title: number || title || "Legislation",
    subtitle: number ? title : "",
  };
}

// ── The SAID half ────────────────────────────────────────────────────────────
// A straight lookup. The generator already did the alias/name-slug resolution the
// client does, so there is no precedence to re-implement (or get subtly wrong)
// here — if the pair is not in the table, this person has no stated position on
// that issue and the card says nothing about one.
const SAID_WORD: Record<string, string> = {
  support: "Supports",
  oppose: "Opposes",
  mixed: "Mixed on",
};

function saidFor(pid: string, issue: string): Said | undefined {
  if (!pid || !issue) return undefined;
  const rec = SAID[`${pid}|${issue}`];
  if (!rec || !rec.t) return undefined;
  return {
    word: SAID_WORD[String(rec.w || "").toLowerCase()] || "",
    text: rec.t,
    topic: rec.h || "",
    source: rec.s || "",
  };
}

// ── The DID half ─────────────────────────────────────────────────────────────
// The single most consequential thing this member did on this issue, read off the
// record and never derived. Preference order is about which fact a reader can
// actually check: a recorded yea/nay on the bill itself beats one on the procedural
// motion that carried it, which beats a co-sponsorship with no roll call at all.
// Ties break to the most recent, which is what the API already sorts by.
const DID_POSITION: Record<string, string> = {
  yea: "Voted Yea",
  nay: "Voted Nay",
  present: "Voted Present",
  not_voting: "Did not vote",
};

function didRank(it: any): number {
  if (it?.kind === "vote") return it.isProcedural ? 2 : 1;
  return 3;
}

function didAction(it: any): string {
  if (it?.kind === "vote") {
    return DID_POSITION[String(it.position || "").toLowerCase()] || "";
  }
  // A position row's actionType IS the act — cosponsor, amicus, veto. Printed as
  // the record labels it, with underscores unpicked.
  const raw = String(it?.actionType || "").replace(/_/g, " ").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

async function didFor(pid: string, issue: string, origin: string): Promise<Did | undefined> {
  if (!pid || !issue) return undefined;
  const res = await apiGet(
    origin,
    `/api/voting-record/member/${encodeURIComponent(pid)}` +
      `?issue=${encodeURIComponent(issue)}&sort=date&pageSize=50`
  );
  const items: any[] = Array.isArray(res.data?.items) ? res.data.items : [];
  if (!items.length) return undefined;

  // Only a row with a source is a citable fact. The API already drops sourceless
  // rows, but a card is the last place to start trusting that implicitly.
  const usable = items.filter((it) => didAction(it) && it?.source?.url);
  if (!usable.length) return undefined;
  usable.sort((a, b) => didRank(a) - didRank(b) || String(b.date || "").localeCompare(String(a.date || "")));
  const it = usable[0];

  const head = measureHeadline(it);
  const chamber = it.chamber === "senate" ? "Senate" : it.chamber === "house" ? "House" : "";
  const tally = it.result ? String(it.result).replace(/_/g, " ") : "";
  return {
    action: didAction(it),
    measure: String(it.number || "").trim(),
    title: squeeze(head.subtitle || head.title, 150),
    date: String(it.date || "").slice(0, 10),
    detail: [chamber, tally].filter(Boolean).join(" · "),
  };
}

// A date a reader can read. ISO in, "12 Jun 2025" out — never reformatted into
// anything ambiguous, and passed straight through if it is not a full ISO date.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!m) return String(iso || "");
  const mon = MONTHS[parseInt(m[2], 10) - 1];
  if (!mon) return String(iso || "");
  return `${parseInt(m[3], 10)} ${mon} ${m[1]}`;
}

// ── resolveTarget ────────────────────────────────────────────────────────────
export async function resolveTarget(
  t: Target,
  origin: string
): Promise<Resolved | NotFound | null> {
  const chrome = CHROME[t.kind];

  if (t.kind === "profile") {
    const rec = INDEX.people[t.id];
    if (!rec) return null; // unknown id — fall back to the site card, don't guess
    const sub = personLine(rec);
    return {
      kind: t.kind,
      ...chrome,
      title: rec.n,
      subtitle: sub,
      description: squeeze(
        `${rec.n}${sub ? ` — ${sub}` : ""}. Their promises, their votes and their money on PolitiDex, each one sourced and checkable.`,
        200
      ),
      footnote: "Every claim on the profile links to its source.",
      ogQuery: `kind=profile&id=${encodeURIComponent(t.id)}`,
      // t.id is already the canonical roster id — parseTarget resolved it — so the
      // crawl header, the canonical and the card all name the same person by the
      // same id. Office and state are passed through as themselves; the "(R)" the
      // title carries is office identity in a card headline and is deliberately
      // NOT part of this, because the body block must not read as a grade.
      person: {
        pid: t.id,
        name: rec.n,
        office: rec.o || "",
        state: rec.s || "",
        // Canonical id in, so an alias address gets the identical list. Undefined
        // rather than [] when the snapshot holds nothing for this person: the
        // difference is what tells the caller to omit the section instead of
        // rendering an empty one.
        record: PERSON_RECORD[t.id] && PERSON_RECORD[t.id].length ? PERSON_RECORD[t.id] : undefined,
      },
    };
  }

  if (t.kind === "spotlight") {
    const rec = INDEX.spotlights[t.slug];
    if (!rec) return null;
    return {
      kind: t.kind,
      ...chrome,
      title: rec.t,
      subtitle: [rec.pl, rec.u].filter(Boolean).join(" · "),
      description: squeeze(rec.d || `A neutral, sourced guide to ${rec.t}.`, 200),
      // The line that keeps a Spotlight from being read as a finding about a person.
      footnote: "A sourced explainer on the issue — not a verdict on any politician.",
      ogQuery: `kind=spotlight&slug=${encodeURIComponent(t.slug)}`,
    };
  }

  if (t.kind === "rank") {
    const core = INDEX.cores[t.core];
    const focusLabel = t.focus ? stripEmoji(issueLabel(t.focus)) : "";
    if (!core && !focusLabel) return null;
    const label = focusLabel || stripEmoji(core!.l);
    // The subtitle names the parent issue only when it adds something the title
    // does not already say — "X — X" reads like a bug, because it is one.
    const parent = core ? stripEmoji(core.l) : "";
    return {
      kind: t.kind,
      ...chrome,
      title: `Who backs up their words on ${label}`,
      subtitle: parent && parent !== label ? parent : "",
      description: squeeze(
        core?.b
          ? `${core.b} Ranked by what each politician has actually done, not what they said.`
          : `Every politician ranked on ${label} by what they have actually done, not what they said.`,
        200
      ),
      footnote: "Ranked from documented positions and recorded votes.",
      hash:
        "#issue=" +
        encodeURIComponent(t.core) +
        (t.focus ? "&key=" + encodeURIComponent(t.focus) : ""),
      ogQuery:
        `kind=rank&core=${encodeURIComponent(t.core)}` +
        (t.focus ? `&key=${encodeURIComponent(t.focus)}` : ""),
    };
  }

  if (t.kind === "receipt" || t.kind === "record") {
    const rec = INDEX.people[t.pid];
    if (!rec) return null;
    const label = stripEmoji(issueLabel(t.issue));
    const surface = t.kind === "record" ? "official record" : "record";

    // Both halves, resolved independently. Either may come back empty and the card
    // degrades to whichever it has — a preview that shows one real fact still beats
    // the boilerplate sentence this used to print, and one that can show neither
    // falls back to exactly that sentence rather than inventing a comparison.
    const said = saidFor(t.pid, t.issue);
    const did = t.issue ? await didFor(t.pid, t.issue, origin) : undefined;

    // The description is the half that travels as TEXT — into a paste, a
    // quote-tweet, a chat where the image is collapsed — so it carries the same
    // two facts the image does, in the same order, and stamps no verdict on them.
    let description: string;
    if (said && did) {
      description = squeeze(
        `Said: ${said.word ? `${said.word.toLowerCase()} — ` : ""}“${said.text}”. ` +
          `Record: ${did.action} on ${[did.measure, did.title].filter(Boolean).join(" — ")}` +
          `${did.date ? ` (${prettyDate(did.date)})` : ""}. Both sides sourced.`,
        280
      );
    } else if (did) {
      description = squeeze(
        `${rec.n} — ${did.action} on ${[did.measure, did.title].filter(Boolean).join(" — ")}` +
          `${did.date ? ` (${prettyDate(did.date)})` : ""}` +
          `${label ? `, on ${label}` : ""}. The recorded action, with its source.`,
        280
      );
    } else if (said) {
      description = squeeze(
        `${rec.n} on ${label || "this issue"} — ${said.word ? `${said.word.toLowerCase()}: ` : ""}` +
          `“${said.text}”. The stated position, with its source, next to the record.`,
        280
      );
    } else {
      // Neither half resolved. Say what the page is and nothing more.
      description = squeeze(
        `What ${rec.n} said about ${label || "this issue"}, next to what they did — the ${surface}, with the source for each side.`,
        200
      );
    }

    return {
      kind: t.kind,
      ...chrome,
      title: rec.n,
      subtitle: label ? `on ${label}` : personLine(rec),
      description,
      // Still no verdict, and now for a sharper reason than "the edge cannot
      // compute one": the two facts are on the card, so the reader reaches the
      // conclusion themselves and nothing cached here can be contradicted by a
      // later correction to how we judge it.
      footnote:
        said && did
          ? "Both sides sourced on PolitiDex. The comparison is the reader's to make."
          : "Open the card to see the sourced comparison.",
      hash:
        "#" +
        (t.kind === "record" ? "record=" : "receipt=") +
        encodeURIComponent(t.pid) +
        (t.issue ? "~" + encodeURIComponent(t.issue) : ""),
      ogQuery:
        `kind=${t.kind}&pid=${encodeURIComponent(t.pid)}` +
        (t.issue ? `&issue=${encodeURIComponent(t.issue)}` : ""),
      comparison: said || did ? { said, did } : undefined,
    };
  }

  if (t.kind === "bill") {
    const res = await apiGet(
      origin,
      `/api/voting-record/measure-ref/${encodeURIComponent(t.congress)}/${encodeURIComponent(t.number)}`
    );
    if (!res.ok || !res.data?.measure) return null; // fail open to the site card
    const m = res.data.measure;
    const head = measureHeadline(m);
    return {
      kind: t.kind,
      ...chrome,
      title: head.title,
      subtitle: head.subtitle,
      description: squeeze(
        `${head.title}${head.subtitle ? ` — ${head.subtitle}` : ""}. Who voted for it, what it bundles together, and where to read the text yourself.`,
        200
      ),
      // Whose legislature, and whose record. A state measure has no congress and is
      // not sourced from Congress.gov, and saying so anyway would be a false
      // citation on the one line of the card that is nothing but citation.
      footnote: `${sittingText(m) ? `${sittingText(m)} · ` : ""}Sourced from ${
        isStateChamber(m?.chamber) ? "le.utah.gov" : "Congress.gov"
      }.`,
      hash: `#bill/${encodeURIComponent(
        String(m.congress || m.session || t.congress || "")
      )}/${encodeURIComponent(String(m.number || t.number))}`,
      ogQuery: `kind=bill&congress=${encodeURIComponent(t.congress)}&number=${encodeURIComponent(t.number)}`,
    };
  }

  if (t.kind === "vote") {
    const congress = Number(t.congress);
    const roll = Number(t.roll);
    const chamberOk = t.chamber === "house" || t.chamber === "senate";
    // A malformed address is wrong on its face — no lookup can rescue it.
    if (!chamberOk || !Number.isInteger(congress) || !Number.isInteger(roll) || congress <= 0 || roll <= 0) {
      return {
        notFound: true,
        kind: t.kind,
        message:
          "A vote link looks like /vote/119/house/190 — a Congress number, a chamber, and the official roll-call number.",
      };
    }
    const res = await apiGet(
      origin,
      `/api/voting-record/rollcall/${congress}/${t.chamber}/${roll}`
    );
    // 404 is the one answer we trust enough to repeat. Anything else (timeout,
    // 500, a cold database) is our problem, not the link's — fail open.
    if (!res.ok && res.status === 404) {
      return {
        notFound: true,
        kind: t.kind,
        message: `PolitiDex has no record of roll call ${roll} in the ${t.chamber === "house" ? "House" : "Senate"} of the ${congress}th Congress.`,
      };
    }
    if (!res.ok || !res.data?.rollcall || !res.data?.measure) return null;

    const rc = res.data.rollcall;
    const m = res.data.measure;
    const head = measureHeadline(m);
    const chamberName = rc.chamber === "senate" ? "Senate" : "House";
    const totals = rc.totals || {};
    const tally =
      Number.isFinite(Number(totals.yea)) && Number.isFinite(Number(totals.nay))
        ? `${totals.yea}–${totals.nay}`
        : "";
    const resultWord = String(rc.result || "").replace(/_/g, " ");
    return {
      kind: t.kind,
      ...chrome,
      title: `${chamberName} roll call ${rc.rollNumber} — ${head.title}`,
      subtitle: [rc.question, head.subtitle].filter(Boolean).join(" · "),
      description: squeeze(
        [
          `${chamberName} roll call ${rc.rollNumber} on ${head.title}${head.subtitle ? ` (${head.subtitle})` : ""}.`,
          resultWord ? `Result: ${resultWord}${tally ? ` ${tally}` : ""}.` : "",
          "See how each member voted.",
        ]
          .filter(Boolean)
          .join(" "),
        200
      ),
      footnote: `${congress}th Congress · Official roll call, sourced.`,
      hash: `#bill/${encodeURIComponent(String(m.congress || congress))}/${encodeURIComponent(String(m.number || ""))}`,
      ogQuery: `kind=vote&congress=${congress}&chamber=${encodeURIComponent(t.chamber)}&roll=${roll}`,
    };
  }

  return null;
}

// Shared by both consumers so the card and the meta always agree on the wording.
export function pageTitle(r: Resolved): string {
  const base = r.subtitle ? `${r.title} — ${r.subtitle}` : r.title;
  return squeeze(`${base} · PolitiDex`, 110);
}

export { squeeze, SITE, CHROME, stripEmoji };
