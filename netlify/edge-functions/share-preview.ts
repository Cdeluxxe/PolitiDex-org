// ─────────────────────────────────────────────────────────────────────────────
// share-preview — give every shared PolitiDex link its own unfurl
// ─────────────────────────────────────────────────────────────────────────────
// The whole app is one index.html with one set of static Open Graph tags, so a
// pasted link to a profile, an Issue Spotlight, a bill, a ranking or a receipt has
// always unfurled as the same generic homepage card. Social scrapers do not run
// JavaScript, so the client-side meta updates the app already performs (see the
// Spotlight's setMeta) are invisible to them. The only place left to fix it is the
// edge, before the document is served.
//
// This function rewrites the HEAD for links it recognises, and does three other
// things worth naming:
//
//   1. It leaves ?views= links alone. stance-share.ts owns those and is unchanged.
//   2. It FAILS OPEN. Every unknown link, every timeout, every unexpected throw
//      returns the page exactly as it was. A preview is a nicety; the page is not.
//   3. It is the one exception to (2): a /vote/… address we can positively
//      identify as wrong gets an honest 404 instead of a silent homepage. Those
//      links used to be rewritten to index.html and quietly show the front page,
//      which is the one outcome worse than a dead link — a reader believes they
//      followed a citation and lands somewhere that looks fine.
//
// Hash links keep working untouched. Where a surface's deep link lives in the hash
// (#bill/…, #receipt=…, #issue=…) — invisible to any server — the share button now
// emits a query-string equivalent instead, and share-links.js turns it back into
// the very same hash on arrival. Nothing downstream of the hash changed.
import type { Context, Config } from "@netlify/edge-functions";
import {
  parseTarget,
  resolveTarget,
  pageTitle,
  canonicalPath,
  type Resolved,
  type RecordLine,
} from "../lib/share-target.ts";

// A person file's own address. Only this shape gets a crawl block: /p/<pid> is the
// canonical person address, and the ?p= form is a query on some other surface.
const PERSON_PATH = /^\/p\/([A-Za-z0-9_]+)\/?$/;

// Escape a value for an HTML double-quoted attribute.
function attr(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function text(s: string): string {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Replace the content="…" of the FIRST meta tag matching an attribute selector.
// No-op when the tag is absent, so a head reshuffle can never throw.
function setMeta(html: string, sel: "property" | "name", key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${sel}="${key}"\\s+content=")[^"]*(")`, "i");
  return html.replace(re, `$1${value}$2`);
}

// Point <link rel="canonical"> at the record instead of at the homepage.
//
// index.html hardcodes one canonical href for the whole single-page app, so until
// now every shared record — every profile, Spotlight, roll call, bill, receipt —
// declared itself a duplicate of "/". That is the strongest possible instruction
// to a search engine to index none of them, and it was being sent on pages whose
// title, description and card were all already record-specific.
//
// Attribute order is not guaranteed by anything, so match either way round rather
// than assume rel comes first. As with setMeta, an absent tag is a no-op.
function setCanonical(html: string, href: string): string {
  const withRelFirst = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i;
  if (withRelFirst.test(html)) return html.replace(withRelFirst, `$1${href}$2`);
  const withHrefFirst = /(<link\s+href=")[^"]*("\s+rel="canonical")/i;
  return html.replace(withHrefFirst, `$1${href}$2`);
}

// The rasterised card. Scrapers vary in SVG support, so the SVG goes through the
// Netlify Image CDN as a PNG, exactly as the stance card already does.
function ogImageUrl(origin: string, ogQuery: string): string {
  return (
    origin +
    "/.netlify/images?url=" +
    encodeURIComponent("/share-og?" + ogQuery) +
    "&fm=png&w=1200&h=630&fit=cover"
  );
}

function applyMeta(html: string, r: Resolved, origin: string, canonical: string): string {
  const title = pageTitle(r);
  const tAttr = attr(title);
  const dAttr = attr(r.description);
  const image = ogImageUrl(origin, r.ogQuery);

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${text(title)}</title>`);
  html = setMeta(html, "property", "og:title", tAttr);
  html = setMeta(html, "property", "og:description", dAttr);
  html = setMeta(html, "property", "og:url", attr(canonical));
  html = setCanonical(html, attr(canonical));
  html = setMeta(html, "property", "og:image", attr(image));
  // Alt text should describe the IMAGE. On a comparison card the image is the two
  // facts, which is exactly what the description now carries — so a screen reader
  // gets the comparison instead of just the name.
  html = setMeta(html, "property", "og:image:alt", r.comparison ? dAttr : tAttr);
  html = setMeta(html, "name", "twitter:title", tAttr);
  html = setMeta(html, "name", "twitter:description", dAttr);
  html = setMeta(html, "name", "twitter:image", attr(image));
  html = setMeta(html, "name", "description", dAttr);

  // An article-ish surface still reads best as og:type=website here; leaving the
  // static value alone keeps this rewrite to text the reader actually sees.

  // Tell the client which record this URL is for, so the app can open it without
  // the server needing to know anything about the hash format. Read by
  // share-links.js; absent on links that need no hash (profiles, Spotlights).
  if (r.hash) {
    const boot =
      `<script>window.__PDX_SHARE_TARGET__=${JSON.stringify({ kind: r.kind, hash: r.hash })};</script>`;
    html = html.replace(/<\/head>/i, boot + "</head>");
  }
  return html;
}

// The place, in a sentence rather than in a headline.
//
// The share index caps a person's `state` field at 40 characters, which is right
// for a 1200×630 card headline and wrong here: 43 of the Utah records describe a
// district ("UT District 68 (Vernal, Uintah / Duchesne Counties)") and arrive
// clipped mid-word, sometimes with the opening parenthesis unclosed. In a headline
// that reads as an abbreviation; in a paragraph a crawler will index it reads as a
// defect. So a clipped value is cut back to its last clean boundary — the district
// without its parenthetical, or the last whole word. Nothing is added, and the
// unclipped values (every federal and statewide record) pass through untouched.
function placeText(s: string): string {
  const raw = String(s || "").trim();
  if (!raw.includes("…")) return raw;
  const head = raw.split(" (")[0];
  const base = head && !head.includes("…") ? head : raw.replace(/…$/, "").replace(/\s+\S*$/, "");
  return base.replace(/[\s(,;:·/-]+$/, "").trim();
}

// ── The crawl block ─────────────────────────────────────────────────────────
// WHY A HEAD REWRITE WAS NOT ENOUGH.
//
// /p/lee has carried its own <title>, its own canonical and its own card since
// the rewrite above shipped, and Google still indexes exactly one URL on this
// site. The reason is not the head: it is that the DOCUMENT was the homepage. All
// 757 person addresses served the same ~2.2 MB app shell, byte for byte, with
// nothing in the body that named the person — so a crawler comparing /p/lee to /
// saw two identical documents with different titles and did the only sensible
// thing, which was to keep one of them.
//
// So the body gets a short block that says who this page is about. It is the
// smallest thing that makes the document unique, and every word of it is already
// true of the page it introduces:
//
//   · the NAME, the OFFICE and the STATE — the same three fields the title and
//     the card are built from (INDEX.people). No new roster fetch, no second
//     identity table, and nothing on the anonymous critical path that was not
//     already there.
//   · the FORMAL RECORD named first, because that is what the file leads with.
//   · Word vs Action named as what it is: a narrow integrity check that applies
//     only where a stated position exists.
//   · up to six lines of the FORMAL RECORD ITSELF (see recordSection below).
//   · a link to the canonical address, so the block is useful to a reader who
//     arrives with JavaScript off rather than being crawler furniture.
//
// WHAT IT DELIBERATELY DOES NOT SAY. No Direction Match figure, no percentage, no
// "Accountability Score", no "complete ballot", no with/against-party tally, no
// party letter — the card headline may carry "(R)" as office identity, but a
// paragraph of body prose about a person reads as a grade the moment a party
// letter sits in it.
//
// A PERSON WE CANNOT NAME IS NEVER NAMED. An unknown pid gets the GENERIC block
// instead (genericCrawlBlock below) — a person file with no name, no office, no
// state and zero issue rows. It used to get no block at all, which minted nobody
// and was still one step short: an empty seam at the top of a /p/ document is a
// seam any cache layer can fill with the last person file it happened to hold, and
// that is precisely the defect this pass fixes. An invented name would be worse
// than a duplicate page; another member's record under this pid is worse than
// both.

// ── The formal record, in the body ──────────────────────────────────────────
// A NAME IS NOT A DOCUMENT EITHER. Identity made the 757 person addresses distinct
// from the homepage; it did not make them distinct from each other. Take the name
// out of Mike Lee's block and out of John Curtis's and what is left is the same
// three sentences — so a crawler comparing two person files sees the template, and
// what it has learned is that PolitiDex holds files, not what is in them.
//
// So the block carries the SHAPE OF THE RECORD as well: up to six lines, each one
// a pattern tier and the issue it was read on, plus the two side counts where the
// profile brief already prints them.
//
// WHERE THE WORDS COME FROM. db/share-index.json's personRecord table, baked by
// scripts/gen-crawl-record.mjs, which boots the real consistency.js and reads
// formalPatternIndex.shape() / execRecordSummary.shape() — the same accessors the
// live brief renders from, in the same exec-lane-first precedence, capped and
// ordered the same way (strongest one-sided first, then the splits). There is no
// second pattern engine and no second vocabulary: this function selects strings
// and escapes them. It computes nothing.
//
// AND NOT FROM THE NETWORK. The obvious implementation is to fetch
// /api/voting-record here. That would put a database round trip in front of every
// crawl of every person address, on the one request with no session and no cache
// warmth, to render text that changes when a seed lands — not per request. The
// snapshot costs ~160 KB of static JSON the edge already imports and nothing at
// request time.
//
// THE WALLS, AGAIN, BECAUSE THIS IS THE PART THAT LOOKS LIKE A SCORE. A tier and
// an issue and two integers about one person's own record — never a percentage,
// never a ratio, never a Direction Match or Word-vs-Action figure, never a
// with/against-party tally, never a total across issues, and no arithmetic over
// any of it. "Formal record" is the heading because that is what it is: a record,
// not a grade. The one-sided rows are strong words on purpose ("Strongly opposes")
// and they are the RECORD LANE'S OWN words — the brief prints them on the page
// this block introduces, so a reader who follows the link finds the same sentence.
//
// A PERSON WITH NO READABLE PATTERN GETS NO SECTION. Not an empty list, not "no
// pattern on file" — nothing. 472 of the 800 roster records are offices with no
// roll-call lane (attorneys general, school boards, mayors) or files nobody has
// reviewed yet, and printing our curation gap as a bullet point would read as a
// finding about the person. Their addresses stay name and office, which is what
// Phase A shipped and is still true.
function recordSection(rows: RecordLine[]): string {
  const lines = rows
    .filter((x) => x && x.p && x.i)
    .slice(0, 6)
    .map((x) => {
      // pattern · issue · counts, with the tally dropped where the brief has none
      // to print. Every part is escaped: the issue labels carry "&" and are data,
      // not markup.
      const parts = [x.p, x.i, x.c || ""].filter(Boolean).map(text).join(" · ");
      return `<li>${parts}</li>`;
    });
  if (!lines.length) return "";
  return (
    `<section data-pdx-crawl-record>` +
    `<h2>Formal record</h2>` +
    `<ul>${lines.join("")}</ul>` +
    `</section>`
  );
}

// ── The address the block was written FOR ───────────────────────────────────
// data-pid carries the CANONICAL roster id, which is what the block is about.
// This attribute carries something different and equally necessary: the address
// the document was generated at. /p/mike_lee and /p/lee are one senator, so their
// blocks name the same `lee` — and a client holding a document cannot tell from
// `lee` alone whether that document belongs to the address in its own bar,
// because resolving the alias needs a table the browser has not loaded yet on the
// first paint. The arriving address, stamped verbatim, needs no table: the guard
// at the top of index.html's <body> compares two strings and neutralises the
// block when they differ, so a cache layer that hands over the wrong person's
// document cannot paint that person on somebody else's URL.
const CRAWL_STYLE =
  `<style>#pdx-crawl-person{margin:0;padding:84px 20px 22px;background:#0a0f1e;` +
  `border-bottom:1px solid rgba(255,255,255,0.08);color:#eef4ff;` +
  `font-family:'Barlow',system-ui,-apple-system,'Segoe UI',sans-serif;}` +
  `#pdx-crawl-person h1{margin:0 0 8px;font-size:1.6rem;line-height:1.15;}` +
  `#pdx-crawl-person p{margin:0 0 6px;color:#9fb4d4;font-size:.95rem;line-height:1.5;max-width:70ch;}` +
  `#pdx-crawl-person a{color:#f5c842;}` +
  `#pdx-crawl-person h2{margin:14px 0 6px;font-size:1rem;letter-spacing:.02em;color:#eef4ff;}` +
  `#pdx-crawl-person ul{margin:0 0 6px;padding:0 0 0 18px;color:#c9d8f2;` +
  `font-size:.95rem;line-height:1.55;max-width:70ch;}` +
  `#pdx-crawl-person li{margin:0 0 2px;}` +
  `#pdx-crawl-person[hidden]{display:none !important;}</style>`;

function personCrawlBlock(r: Resolved, canonical: string, forPath: string): string {
  const who = r.person;
  if (!who || !who.name) return "";
  // office · state · what this page is. Built from the parts that are actually
  // present, so a record with no state does not print a stray separator.
  const line = [who.office, placeText(who.state), "formal voting record on PolitiDex"]
    .filter(Boolean)
    .map(text)
    .join(" · ");
  // Empty string when the snapshot holds nothing, and an empty string concatenates
  // to nothing — so the omission needs no branch and cannot half-render.
  const record = recordSection(who.record || []);
  return (
    CRAWL_STYLE +
    `<header id="pdx-crawl-person" data-pdx-crawl-person data-pid="${attr(who.pid)}"` +
    ` data-pdx-crawl-for="${attr(forPath)}">` +
    `<h1>${text(who.name)}</h1>` +
    `<p>${line}</p>` +
    `<p>Person file. Formal record first. Word vs Action is a separate integrity check only where a stated position exists.</p>` +
    record +
    `<p><a href="${attr(canonical)}">Open the full file</a></p>` +
    `</header>`
  );
}

// ── The person address we hold no record for ────────────────────────────────
// A /p/<pid> that resolves to nobody used to be handed the app shell untouched,
// which was almost right: it printed no name, so it minted nobody. What it also
// did was leave the ONE thing a document at a person address must not leave to
// chance — an empty seam where a crawl header goes. Any cache layer between the
// CDN and the paint (a service worker keyed on the wrong thing, a proxy, a
// restored tab) that hands over some other /p/<pid>'s document lands its header
// in that seam, and the page paints a real senator's office and a real senator's
// record rows on an address that is not theirs.
//
// So the seam is filled, deliberately and generically. This block says only what
// is true of every unresolved person address — that it is a person file, and that
// the record is not on screen yet — and it carries:
//
//   · NO NAME. An id nobody carries must mint nobody, which was already the rule.
//   · ZERO ISSUE ROWS. No <section data-pdx-crawl-record>, no <ul>, no <li>. Not
//     an empty list, and above all not somebody else's list.
//   · NO OFFICE and NO STATE. "U.S. Senator · Utah" on an unknown pid is the exact
//     sentence this whole pass exists to stop.
//   · the same id and the same address stamp as the real block, so the app hides
//     it on a successful open by the same path, and the client-side guard reads it
//     by the same attribute.
//
// It is NOT a 404: person-file.js resolves a handful of retired keys the build-time
// share index does not hold, so an address that looks unresolvable here can still
// open a real file a moment later. "Record still loading" is the honest thing to
// say in that window, and the sentence under it is the honest thing to say if it
// never arrives.
function genericCrawlBlock(forPath: string): string {
  return (
    CRAWL_STYLE +
    `<header id="pdx-crawl-person" data-pdx-crawl-person data-pdx-crawl-generic` +
    ` data-pdx-crawl-for="${attr(forPath)}">` +
    `<h1>Person file</h1>` +
    `<p>Person file · record still loading</p>` +
    `<p>This address names a person file on PolitiDex. If the file does not open, PolitiDex holds no record under this id.</p>` +
    `<p><a href="/">Go to PolitiDex</a></p>` +
    `</header>`
  );
}

// Put the block as early in the body as it can go: immediately after the opening
// <body> tag, ahead of every script the shell loads. A crawler that reads the
// first few KB of the document and stops has still read who this page is about.
//
// Nothing else in the document moves. This is a single insertion at one seam — no
// reordering, no rewriting of the app's own markup — which is what keeps
// person-file.js's cold-arrival adoption working exactly as it did; the block is a
// sibling of the shell, not a wrapper around it. Once the live file opens,
// person-file.js hides this node (see crawlDone there): the real file supersedes
// the summary of it. An absent <body> tag is a no-op rather than a throw.
function injectAfterBody(html: string, block: string): string {
  if (!block) return html;
  return html.replace(/<body[^>]*>/i, (m) => m + block);
}

// The honest dead end. A 404 status (not a 200 dressed as one) with a page that
// says what was asked for, why it is not here, and where to go instead.
//
// LOCAL DEV CAVEAT: `netlify dev` cannot show you this page. Its proxy emulates
// CDN file-shadowing by re-requesting `<path>.html`, `<path>.htm` and
// `<path>/index.html` whenever a response is 404 or 403, and then falling through
// to the matching redirect rule (netlify-cli, utils/proxy.js — "The request has
// failed but we might still have a matching redirect rule … that should kick in").
// The edge chain runs in front of that origin, so our 404 is consumed as a missing
// static file and /vote/* ends up rewritten to index.html anyway. On the CDN the
// edge function runs ahead of the redirect engine and a returned Response is the
// response. share-links.js carries the client-side safety net for exactly this
// gap: an unresolved /vote/ address states plainly that it did not open.
function notFoundPage(origin: string, message: string): Response {
  const title = "That vote isn’t in PolitiDex · PolitiDex";
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${text(title)}</title>
<meta name="robots" content="noindex" />
<meta name="description" content="${attr(message)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${attr(title)}" />
<meta property="og:description" content="${attr(message)}" />
<meta property="og:url" content="${attr(origin + "/")}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${attr(title)}" />
<meta name="twitter:description" content="${attr(message)}" />
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:linear-gradient(135deg,#0a0f1e,#0d1526); color:#eef4ff;
         font-family:'Barlow',system-ui,-apple-system,'Segoe UI',sans-serif; padding:24px; }
  main { max-width:620px; }
  .eyebrow { color:#f59e0b; letter-spacing:.34em; font-size:.78rem; text-transform:uppercase; margin:0 0 14px; }
  h1 { font-size:clamp(1.6rem,4vw,2.4rem); line-height:1.15; margin:0 0 16px; }
  p { color:#9fb4d4; line-height:1.6; margin:0 0 14px; }
  a { display:inline-block; margin-top:14px; padding:12px 20px; border-radius:10px;
      background:#f5c842; color:#0a0f1e; font-weight:700; text-decoration:none; }
</style>
</head>
<body>
<main>
  <p class="eyebrow">Roll-call vote</p>
  <h1>We don’t have that vote.</h1>
  <p>${text(message)}</p>
  <p>Rather than show you the front page and let you think the link worked, here’s the plain answer: this address doesn’t resolve to a record we hold.</p>
  <a href="/">Go to PolitiDex</a>
</main>
</body>
</html>`;
  return new Response(body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

export default async (req: Request, context: Context): Promise<Response | undefined> => {
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return; // unparseable — not ours to fix
  }

  // "My Stances" share links belong to stance-share.ts. Leave them entirely alone.
  if (url.searchParams.has("views")) return;

  const target = parseTarget(url);
  if (!target) return; // not a share link — straight through, nothing to do

  try {
    const resolved = await resolveTarget(target, url.origin);

    // A link we can prove is wrong. Only /vote/ addresses reach this branch, and
    // only on an explicit "no such roll call" from the API — a timeout or an error
    // falls through to the normal page instead.
    if (resolved && "notFound" in resolved) {
      return notFoundPage(url.origin, resolved.message);
    }
    // A PERSON ADDRESS ALWAYS GETS A PERSON DOCUMENT — its own, or a generic one.
    // Scoped by the PATH, exactly as the block below is: /p/<pid> is the address
    // where a crawl header belongs, and the ?p= form is a query on some other
    // surface. `asked` is the arriving id, kept verbatim (not canonicalised) so
    // the stamp the client compares against is the address in its own bar.
    const asked = PERSON_PATH.exec(url.pathname);
    const forPath = asked ? "/p/" + asked[1] : "";

    if (!resolved) {
      // Unknown but not disproven. The head is left entirely alone — there is no
      // record to title, describe or canonicalise, and index.html's own canonical
      // pointing at "/" is the right answer for an address that names nothing.
      // What the body gets is the generic block: the seam is filled so no cache
      // layer can fill it with another member's header. Every other unknown link
      // still passes straight through, untouched.
      if (!forPath) return;
      const bare = await context.next();
      const bareCt = bare.headers.get("content-type") || "";
      if (!bareCt.includes("text/html")) return bare;
      const generic = injectAfterBody(await bare.text(), genericCrawlBlock(forPath));
      const bareHeaders = new Headers(bare.headers);
      bareHeaders.set("content-type", "text/html; charset=utf-8");
      bareHeaders.set("cache-control", "public, max-age=300");
      bareHeaders.delete("content-length");
      bareHeaders.delete("content-encoding");
      return new Response(generic, { status: bare.status, headers: bareHeaders });
    }

    const res = await context.next();
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return res;

    // The canonical address of the RECORD, not of the request. Everything the
    // reader's link happened to carry — a tracking param, a stale ?p= layered on
    // an /issue/ path, the ?issue= form of a Spotlight that also has a clean
    // path — normalizes to the one address that opens this record. og:url gets
    // the same value so three shares of one record unfurl as one entity.
    const canonical = url.origin + canonicalPath(target);
    let html = applyMeta(await res.text(), resolved, url.origin, canonical);

    // The body block, on a person file's own address only. Scoped by the PATH and
    // not just by the target kind: /issue/<slug>?p=<id> resolves to a profile (the
    // profile is what is on screen) but the DOCUMENT being served is the
    // Spotlight's, and two surfaces must not both claim the same <h1>.
    if (forPath) {
      // personCrawlBlock returns "" when the resolved target carries no person
      // (a Spotlight, a bill), and injectAfterBody is a no-op on "". So a person
      // PATH whose target is not a person leaves the seam empty — which is
      // unreachable today (a /p/ path always parses as a profile) and would be
      // the safe direction if it ever were not.
      html = injectAfterBody(html, personCrawlBlock(resolved, canonical, forPath));
    }

    const headers = new Headers(res.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.set("cache-control", "public, max-age=300");
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(html, { status: res.status, headers });
  } catch {
    return; // fail open — never break a page over a preview
  }
};

export const config: Config = {
  // /p/* and /b/* are here for the same reason /issue/* and /vote/* are: the
  // rewrites in netlify.toml serve index.html for them, so without this function a
  // person file or a bill profile would unfurl — and canonicalise — as the homepage.
  path: ["/", "/index.html", "/issue/*", "/vote/*", "/p/*", "/b/*"],
};
