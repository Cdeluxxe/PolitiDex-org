// ─────────────────────────────────────────────────────────────────────────────
// digest-record-core.mjs — the wording and addressing of a record event
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS IS A SEPARATE, DEPENDENCY-FREE FILE
//
// Everything in here is a pure transform on values already in the database: how a
// recorded position reads in words, what a measure is called, which on-site
// address an act belongs to, and what order dated acts go in. None of it touches
// the database, the clock, the network or an environment variable.
//
// It lives apart from digest.ts for one reason: this is the part of the record
// group that decides what a reader is TOLD, and the test suite has to be able to
// run it — not read it as text and hope. `netlify/lib/digest.ts` imports these
// exact functions, so the words the suite checks are the words that ship. (Same
// arrangement as rate-limit-core.mjs and the limiter's arithmetic.)
//
// THE VOCABULARY RULE, WRITTEN DOWN
//
// The record says yea, nay, present or not voting. So does this file. There is no
// map from a formal act to an adjective anywhere in it: nothing here says
// betrayed, caved, flip-flopped, snuck, rammed, gutted or defied — and nothing
// here scores, ranks, or compares one person to another. A digest item is one act,
// one citation, one link. What the act means is the reader's to decide, on the
// person file, with the receipt open.

// Trim a value to a length, with an ellipsis when it was cut.
export function clip(s, n) {
  const str = String(s == null ? "" : s).trim();
  return str.length > n ? str.slice(0, n - 1).trimEnd() + "…" : str;
}

// US state postal codes, used only to recognise a disambiguating suffix on a
// roster id ("michael_adams_ky") so the derived label does not read "Michael
// Adams Ky". Nothing else about the code is used.
export const STATE_SUFFIXES = new Set([
  "al","ak","az","ar","ca","co","ct","de","fl","ga","hi","id","il","in","ia","ks",
  "ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj","nm","ny",
  "nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","vt","va","wa","wv",
  "wi","wy","dc",
]);

// A readable label for a roster id, for the EMAIL only.
//
// The roster (names, offices, portraits) lives in the client bundle, not in the
// database, so the scheduled sender has an id and no name. Roster ids are
// name-derived by construction ("celeste_maloy"), so this un-derives them:
// underscores to spaces, title case, and a trailing state code dropped when one is
// present and the rest is still a name.
//
// This is a FORMATTING transform on an identifier, not a claim about a person: no
// fact, office, party or district is inferred, and `politicianId` travels beside it
// so the in-app digest — which does have the roster — renders the real display name
// and ignores this entirely.
export function labelForPoliticianId(pid) {
  const parts = String(pid || "").split("_").filter(Boolean);
  if (parts.length > 2 && STATE_SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  const label = parts
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
  return label || String(pid || "");
}

// How a recorded position reads in plain words. Never "betrayed", never "caved" —
// the record says yea, nay, present or not voting, and so does this.
export const VOTE_WORD = {
  yea: "voted yes",
  nay: "voted no",
  present: "voted present",
  not_voting: "did not vote",
};

// What a non-roll-call formal action is called.
export const ACTION_WORD = {
  sponsor: "sponsored",
  cosponsor: "co-sponsored",
  amicus: "filed an amicus brief on",
  plaintiff: "joined as a plaintiff on",
  committee_vote: "cast a committee vote on",
  statement: "entered an on-record statement on",
};

// What a measure stage is called. Plain stage names, no adjectives.
export const STAGE_WORD = {
  introduced: "was introduced",
  referred_committee: "was referred to committee",
  reported_committee: "was reported out of committee",
  passed_house: "passed the House",
  passed_senate: "passed the Senate",
  resolving_differences: "went to conference",
  to_president: "was sent to the President",
  enacted: "was enacted",
  vetoed: "was vetoed",
  veto_overridden: "had its veto overridden",
  failed: "failed",
  other: "moved",
};

// The shortest honest name for a measure: its number when it has one, else its
// short title, else the full title clipped.
export function measureLabel(number, shortTitle, title) {
  if (number && shortTitle) return `${number} — ${clip(shortTitle, 70)}`;
  if (number) return `${number} — ${clip(title, 70)}`;
  return clip(shortTitle || title, 90);
}

// The on-site address for a roll call, when the identifiers are all present.
// /vote/<congress>/<chamber>/<roll> is a Phase-1 rewrite in netlify.toml.
export function rollcallPath(congress, chamber, rollNumber) {
  if (!congress || !chamber || rollNumber == null) return null;
  const ch = String(chamber).toLowerCase();
  if (ch !== "house" && ch !== "senate") return null;
  return `/vote/${congress}/${ch}/${rollNumber}`;
}

// The person file is the spine: a person-anchored act belongs at /p/<pid>.
export function personPath(pid) {
  return pid ? `/p/${pid}` : null;
}

// Newest act first; undated last rather than dropped, because an undated formal
// act with a citation is still a formal act. Ties break on kind then id — a stable
// order, and deliberately NOT on anything that could read as importance.
export function sortRecordEvents(list) {
  return list.sort((a, b) => {
    const ad = a.date || "";
    const bd = b.date || "";
    if (ad === bd) return a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.id - b.id;
    if (!ad) return 1;
    if (!bd) return -1;
    return ad < bd ? 1 : -1;
  });
}

// ── Email rendering for the record group ─────────────────────────────────────
//
// The HTML and plain-text rows for "On The Record" are built here rather than in
// the scheduled function for the same reason as the wording above: an email is the
// one surface a reader cannot re-read in context, so what it says has to be
// checkable by the suite, with real events passed in. `pdx-digest-cron.mts`
// imports these and does not compose record rows of its own.

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// The kicker names the KIND of change and nothing else. No adjective, no verdict,
// no "finally", no "again".
export const KIND_KICKER = {
  vote: "New recorded vote",
  position: "New formal action",
  action: "Measure moved",
  mapping: "Record updated",
};

// Where a record event lands. An on-site Phase-1 address when it has one — /p/<pid>
// for a person's act, /vote/<congress>/<chamber>/<roll> for a measure's — and the
// citation itself when it does not. Never a tracking wrapper, never a search page.
export function recordLink(ev, site) {
  return ev && ev.path ? `${site}${ev.path}` : (ev && ev.sourceUrl) || "";
}

// One HTML row per event. Returns "" for an empty group so the caller's section
// helper omits the heading entirely.
export function recordEmailRows(record, site) {
  return (record || [])
    .map((r) => {
      const when = r.date ? new Date(r.date).toISOString().slice(0, 10) : "";
      const link = recordLink(r, site);
      return (
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e8ee;">` +
        `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a94a6;">` +
        `${escHtml(KIND_KICKER[r.kind] || "Record updated")}${when ? " · " + escHtml(when) : ""}</div>` +
        `<div style="font-size:15px;font-weight:700;color:#0a0f1e;margin:2px 0;">` +
        `<a href="${escHtml(link)}" style="color:#0a0f1e;text-decoration:none;">${escHtml(r.headline)}</a></div>` +
        (r.detail ? `<div style="font-size:13px;color:#48526a;">${escHtml(r.detail)}</div>` : "") +
        `<div style="font-size:12px;margin-top:3px;">` +
        `<a href="${escHtml(r.sourceUrl)}" style="color:#6b7686;">Source: ${escHtml(r.sourceLabel)}</a></div>` +
        `</td></tr>`
      );
    })
    .join("");
}

// The plain-text half. Same acts, same links, same citations — a text-only client
// is not shown a different digest from an HTML one.
export function recordTextBlock(record, site) {
  if (!record || !record.length) return "";
  return (
    "ON THE RECORD\n" +
    record
      .map(
        (r) =>
          `• ${r.headline}${r.date ? ` (${String(r.date).slice(0, 10)})` : ""}\n` +
          `  ${recordLink(r, site)}\n  Source: ${r.sourceUrl}`
      )
      .join("\n") +
    "\n\n"
  );
}
