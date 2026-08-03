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
//   parseTarget(url)      — pure string work. Which surface is this, and with what
//                           ids? No lookups, no network, no judgment.
//   resolveTarget(t, …)   — turn those ids into real words. Reads the generated
//                           share index (db/share-index.json) for anything that
//                           lives in the client bundle, and the Voting Record API
//                           for anything that lives in the database.
//
// HONESTY RULES, which are the whole reason this file is small:
//
//   • A preview is an ADDRESS LABEL. It says what the page is, never what the page
//     concludes. No score, no verdict stamp, no kept/broken tally travels here —
//     a cached judgment that has since been corrected is precisely the thing that
//     must not end up as a PNG in someone's feed.
//   • An Issue Spotlight is a sourced explainer about a subject, not a finding
//     about a person. It gets its own eyebrow, its own accent and its own footer
//     line, and it never borrows the Official Record's vocabulary.
//   • If we cannot resolve a link, we say so (or fall back to the site card).
//     We never invent a plausible title.
import shareIndex from "../../db/share-index.json" with { type: "json" };

// ── The generated index (see scripts/gen-share-index.mjs) ────────────────────
type PersonRec = { n: string; o?: string; s?: string; p?: string };
type SpotlightRec = { t: string; d?: string; pl?: string; u?: string };
type CoreRec = { l: string; b?: string };
type ShareIndex = {
  people: Record<string, PersonRec>;
  spotlights: Record<string, SpotlightRec>;
  cores: Record<string, CoreRec>;
  issues: Record<string, string>;
};
const INDEX = shareIndex as unknown as ShareIndex;

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
  | { kind: "bill"; congress: string; number: string }
  | { kind: "receipt"; pid: string; issue: string }
  | { kind: "record"; pid: string; issue: string }
  | { kind: "vote"; congress: string; chamber: string; roll: string };

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
  if (p) return { kind: "profile", id: p };

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

function measureHeadline(m: any): { title: string; subtitle: string } {
  const number = String(m?.number || "").trim();
  const title = squeeze(m?.shortTitle || m?.title || "", 120);
  return {
    title: number || title || "Legislation",
    subtitle: number ? title : "",
  };
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
    return {
      kind: t.kind,
      ...chrome,
      title: rec.n,
      subtitle: label ? `on ${label}` : personLine(rec),
      // No verdict. The edge cannot compute one, and a preview that guessed at a
      // conclusion would be the single most damaging thing on this page.
      description: squeeze(
        `What ${rec.n} said about ${label || "this issue"}, next to what they did — the ${surface}, with the source for each side.`,
        200
      ),
      footnote: "Open the card to see the sourced comparison.",
      hash:
        "#" +
        (t.kind === "record" ? "record=" : "receipt=") +
        encodeURIComponent(t.pid) +
        (t.issue ? "~" + encodeURIComponent(t.issue) : ""),
      ogQuery:
        `kind=${t.kind}&pid=${encodeURIComponent(t.pid)}` +
        (t.issue ? `&issue=${encodeURIComponent(t.issue)}` : ""),
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
      footnote: `${m.congress ? `${m.congress}th Congress · ` : ""}Sourced from Congress.gov.`,
      hash: `#bill/${encodeURIComponent(String(m.congress || t.congress))}/${encodeURIComponent(String(m.number || t.number))}`,
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
