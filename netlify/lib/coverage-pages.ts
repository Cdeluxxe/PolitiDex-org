// ─────────────────────────────────────────────────────────────────────────────
// coverage-pages — the Phase 5 public surfaces, as pure functions
// ─────────────────────────────────────────────────────────────────────────────
// Renderers and slicers for:
//   · the roll-call page        /vote/<congress>/<chamber>/<session>/<roll>
//   · the "what changed" feed   /changes (HTML) and /api/changes (JSON)
//   · the person-file coverage  /api/person-coverage?pid= (committees,
//                               co-sponsorships, committee money, attendance)
//   · the bill co-sponsor list  /api/bill-cosponsors?bill=<sitting>|<number>
// No database, no network: the functions in netlify/functions/ fetch and pass
// the data in, and scripts/test-coverage-*.mjs drive these directly.
//
// NOTHING HERE DECIDES WHAT IS PUBLIC. The roll-call page only ever receives a
// roll call publishedRollCall (vote-actions-publish.ts) let through the gate;
// the feed only receives rolls recentPublishedRolls let through and stance
// cards cardsBody (stated-positions-core.mjs) would serve.
// ─────────────────────────────────────────────────────────────────────────────

export const ORIGIN = "https://politidex.fyi";

export function attr(s: unknown): string {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export function text(s: unknown): string {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const day = (d: unknown) => (d ? String(d).slice(0, 10) : "");
const httpUrl = (u: unknown) => (/^https?:\/\//.test(String(u || "")) ? String(u) : "");
const ord = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const chamberName = (c: string) => (c === "senate" ? "Senate" : "House");
const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

// ── shared document chrome ─────────────────────────────────────────────────
function page(o: { title: string; description: string; canonical?: string; noindex?: boolean; eyebrow: string; body: string }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${text(o.title)}</title>
${o.noindex ? '<meta name="robots" content="noindex" />\n' : ""}<meta name="description" content="${attr(o.description)}" />
${o.canonical ? `<link rel="canonical" href="${attr(o.canonical)}" />\n` : ""}<meta property="og:type" content="website" />
<meta property="og:title" content="${attr(o.title)}" />
<meta property="og:description" content="${attr(o.description)}" />
${o.canonical ? `<meta property="og:url" content="${attr(o.canonical)}" />\n` : ""}<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${attr(o.title)}" />
<meta name="twitter:description" content="${attr(o.description)}" />
<link rel="icon" href="/favicon.ico" />
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:linear-gradient(135deg,#0a0f1e,#0d1526); color:#eef4ff; min-height:100vh;
         font-family:'Barlow',system-ui,-apple-system,'Segoe UI',sans-serif; line-height:1.5; }
  main { max-width:860px; margin:0 auto; padding:28px 20px 64px; }
  a { color:#9fdbff; }
  .top { font-size:.85rem; margin:0 0 18px; }
  .top a { text-decoration:none; color:#f5c842; font-weight:700; }
  .eyebrow { color:#f59e0b; letter-spacing:.28em; font-size:.74rem; text-transform:uppercase; margin:0 0 10px; }
  h1 { font-size:clamp(1.4rem,3.6vw,2.1rem); line-height:1.2; margin:0 0 10px; }
  h2 { font-size:1.05rem; margin:26px 0 8px; color:#dbe6f7; }
  .sub { color:#9fb4d4; margin:0 0 14px; }
  .note { color:#9fb4d4; font-size:.86rem; border-left:3px solid rgba(245,200,66,.6); padding:4px 0 4px 10px; margin:14px 0; }
  dl.facts { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin:14px 0; }
  dl.facts dt { color:#9fb4d4; font-size:.82rem; text-transform:uppercase; letter-spacing:.06em; }
  dl.facts dd { margin:0; }
  .totals { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; padding:0; list-style:none; }
  .totals li { border:1px solid rgba(159,180,212,.28); border-radius:999px; padding:2px 12px; font-size:.86rem; }
  .group { margin:12px 0; }
  .group ul { columns:2 220px; margin:6px 0 0; padding:0; list-style:none; }
  .group li { font-size:.9rem; margin:0 0 3px; break-inside:avoid; }
  .group li span { color:#9fb4d4; font-size:.8rem; }
  .feed { list-style:none; padding:0; margin:0; }
  .feed li { border:1px solid rgba(159,180,212,.16); background:rgba(10,15,30,.45); border-radius:10px; padding:10px 12px; margin:0 0 8px; }
  .feed .k { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:#f5c842; }
  .feed .src { display:block; color:#9fb4d4; font-size:.78rem; margin-top:3px; }
  .feed .when { color:#9fb4d4; font-size:.78rem; }
</style>
</head>
<body>
<main>
<p class="top"><a href="/">PolitiDex</a></p>
<p class="eyebrow">${text(o.eyebrow)}</p>
${o.body}
</main>
</body>
</html>`;
}

// ── the roll-call page ─────────────────────────────────────────────────────
export const ROLL_PATH = /^\/vote\/(\d{1,3})\/(house|senate)\/(\d{1,2})\/(\d{1,5})\/?$/;
export function parseRollPath(pathname: string) {
  const m = ROLL_PATH.exec(String(pathname || ""));
  if (!m) return null;
  const r = { congress: Number(m[1]), chamber: m[2], session: Number(m[3]), roll: Number(m[4]) };
  return r.congress > 0 && r.session > 0 && r.roll > 0 ? r : null;
}

const VOTE_GROUPS = [
  { v: "yes", t: "Yea" }, { v: "no", t: "Nay" }, { v: "present", t: "Present" }, { v: "not_voting", t: "Not voting" },
];

export function rollPageHtml(data: any): string {
  const r = data.roll;
  const info = data.info || {};
  const ch = chamberName(r.chamber);
  const billLabel = info.number || data.billKey;
  const billTitle = info.title || "";
  const canonical = ORIGIN + data.page;
  const headline = `${ch} roll call ${r.roll} — ${billLabel}`;
  const resultWord = r.result ? String(r.result) : "";
  const t = r.totals || {};
  const desc = `${ch} roll call ${r.roll} (${ord(r.congress)} Congress, session ${r.session}) on ${billLabel}${billTitle ? ` — ${billTitle}` : ""}.${r.question ? ` ${r.question}.` : ""}${resultWord ? ` Result: ${resultWord}.` : ""} How each member voted, from the official record.`;
  const billHtml = info.page
    ? `<a href="${attr(info.page)}" data-pdx-roll-bill="${attr(data.billKey)}">${text(billLabel)}</a>`
    : `<span data-pdx-roll-bill="${attr(data.billKey)}">${text(billLabel)}</span>`;
  const groups = VOTE_GROUPS.map((g) => {
    const who = (r.members || []).filter((m: any) => m.vote === g.v);
    if (!who.length) return "";
    return `<div class="group" data-pdx-roll-group="${g.v}"><h2>${g.t} (${who.length} listed)</h2><ul>` +
      who.map((m: any) => `<li><a href="/p/${attr(encodeURIComponent(m.pid))}" data-pdx-roll-member="${attr(m.pid)}">${text(m.name || m.pid)}</a>` +
        `${m.party || m.state ? ` <span>${text([m.party, m.state].filter(Boolean).join("-"))}</span>` : ""}</li>`).join("") +
      `</ul></div>`;
  }).join("");
  const src = httpUrl(r.sourceUrl);
  const body = `<h1>${text(headline)}</h1>
${billTitle ? `<p class="sub">${text(billTitle)}</p>` : ""}
<dl class="facts" data-pdx-roll-facts>
  <dt>Bill</dt><dd>${billHtml}</dd>
  <dt>Question</dt><dd data-pdx-roll-question>${text(r.question || "Not stated in the record")}</dd>
  <dt>Date</dt><dd data-pdx-roll-date>${text(day(r.date) || "Not stated in the record")}</dd>
  <dt>Chamber</dt><dd data-pdx-roll-chamber>${text(`${ch} · ${ord(r.congress)} Congress, session ${r.session}`)}</dd>
  <dt>Result</dt><dd data-pdx-roll-result>${text(resultWord || "Not stated in the record")}</dd>
  ${src ? `<dt>Source</dt><dd><a href="${attr(src)}" target="_blank" rel="noopener">${text(r.sourceLabel || "Official record")}</a></dd>` : ""}
</dl>
<ul class="totals" data-pdx-roll-totals>
  <li>Yea ${Number(t.yes) || 0}</li><li>Nay ${Number(t.no) || 0}</li><li>Present ${Number(t.present) || 0}</li><li>Not voting ${Number(t.not_voting) || 0}</li>
</ul>
${r.procedural ? `<p class="note" data-pdx-roll-procedural>This is a procedural vote (a motion or rule about how the bill is handled), not a vote on the bill's final passage.</p>` : ""}
<p class="note">Totals count every vote the official record lists. Members are named here only when they have a PolitiDex file${Number(r.unlisted) ? `; ${Number(r.unlisted)} recorded vote${Number(r.unlisted) === 1 ? "" : "s"} by members without one ${Number(r.unlisted) === 1 ? "is" : "are"} counted but not named` : ""}. This roll call is shown because it passed PolitiDex's automatic publish checks. It is the raw record, not a verdict.</p>
${groups}
<p class="sub"><a href="/changes">What changed recently</a></p>`;
  return page({ title: `${headline} · PolitiDex`, description: desc, canonical, eyebrow: "Roll-call vote", body });
}

export function rollNotFoundHtml(r: { congress: number; chamber: string; session: number; roll: number } | null): string {
  const what = r ? `${chamberName(r.chamber)} roll call ${r.roll} (${ord(r.congress)} Congress, session ${r.session})` : "That roll call";
  const msg = r
    ? `${what} is not one PolitiDex has published. Either it is not on file, or it has not passed the automatic publish checks yet.`
    : "A roll-call page address looks like /vote/119/house/1/190 — a Congress number, a chamber, a session and the official roll-call number.";
  return page({ title: "That roll call isn’t published on PolitiDex · PolitiDex", description: msg, noindex: true, eyebrow: "Roll-call vote",
    body: `<h1>We don’t have that roll call published.</h1><p class="sub">${text(msg)}</p><p><a href="/changes">See recently published votes</a></p>` });
}

// ── the "what changed" feed ────────────────────────────────────────────────
export type ChangeItem = {
  kind: "vote" | "position" | "seat";
  date: string;               // YYYY-MM-DD
  title: string;
  detail?: string;
  link?: string | null;       // a PolitiDex page
  source: { label: string; url?: string | null }; // where the change came from
};

export const SOURCE_LABELS = {
  vote: "Official roll call (House Clerk / Senate), published after PolitiDex's automatic checks",
  position: "Stated-positions pipeline (promoted from sourced Evidence Locker items)",
  seat: "Roster seat files (generated from the PolitiDex roster)",
};

// Published rolls (recentPublishedRolls) → feed items.
export function voteItems(rolls: any[]): ChangeItem[] {
  return (rolls || []).map((r) => {
    const bill = r.bill || {};
    const label = bill.number || "a measure";
    return {
      kind: "vote" as const,
      date: day(r.date),
      title: `${chamberName(r.chamber)} roll call ${r.roll} on ${label}${bill.title ? ` — ${bill.title}` : ""}`,
      detail: [r.question, r.result ? `Result: ${r.result}` : "", r.procedural ? "procedural" : ""].filter(Boolean).join(" · "),
      link: r.page,
      source: { label: r.sourceLabel ? `${SOURCE_LABELS.vote} · ${r.sourceLabel}` : SOURCE_LABELS.vote, url: httpUrl(r.sourceUrl) || null },
    };
  });
}

// Stance cards (cardsBody) → feed items, newest update first.
export function positionItems(body: { cards?: Record<string, any[]> } | null, names: Record<string, string>, limit = 30): ChangeItem[] {
  const out: ChangeItem[] = [];
  for (const [pid, cards] of Object.entries(body?.cards || {})) {
    for (const c of cards || []) {
      const when = day(c?.pipeline?.updated_at || c?.pipeline?.promoted_at);
      if (!when) continue;
      const word = c.pos === "support" ? "supports" : c.pos === "oppose" ? "opposes" : "has a mixed position on";
      out.push({
        kind: "position",
        date: when,
        title: `${names[pid] || pid} ${word} ${c.topic || c.issueKey}`,
        detail: c.text || "",
        link: `/p/${encodeURIComponent(pid)}`,
        source: { label: `${SOURCE_LABELS.position} · ${c.source?.label || "Source"}`, url: httpUrl(c.source?.url) || null },
      });
    }
  }
  out.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return out.slice(0, limit);
}

// db/roster-changes.json entries → feed items.
export function seatItems(log: { changes?: any[] } | null, limit = 30): ChangeItem[] {
  return (log?.changes || []).slice(0, limit).map((c) => {
    const verb = c.change === "added" ? "added to" : c.change === "removed" ? "removed from" : "updated in";
    const who = c.name || c.pid;
    const what = c.change === "updated" && c.fields ? ` (${c.fields.join(", ")})` : "";
    return {
      kind: "seat" as const,
      date: String(c.date || ""),
      title: `${who} ${verb} the ${c.stateName || c.state} seat roster${what}`,
      detail: [c.office, c.seat, ...(c.change === "updated" && c.fields
        ? c.fields.map((f: string) => `${f}: ${(c.before || {})[f] ?? "—"} → ${(c.after || {})[f] ?? "—"}`) : [])].filter(Boolean).join(" · "),
      link: c.change === "removed" ? null : `/p/${encodeURIComponent(c.pid)}`,
      source: { label: `${SOURCE_LABELS.seat} · roster-seats/${c.state}.js` },
    };
  });
}

export function feedBody(lanes: { votes: ChangeItem[]; positions: ChangeItem[]; seats: ChangeItem[] }, generatedAt: string, errors: string[] = []) {
  const items = [...lanes.votes, ...lanes.positions, ...lanes.seats]
    .filter((i) => i.date)
    .sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
  return {
    generatedAt,
    readOnly: true,
    note: "Recent changes PolitiDex has published: roll calls that passed the automatic publish checks, stated positions the pipeline promoted, and roster seat changes. Each item names its source.",
    sources: SOURCE_LABELS,
    counts: { votes: lanes.votes.length, positions: lanes.positions.length, seats: lanes.seats.length },
    ...(errors.length ? { unavailable: errors } : {}),
    items,
  };
}

const KIND_WORD = { vote: "Published vote", position: "Stated position", seat: "Roster seat" };
export function changesPageHtml(feed: ReturnType<typeof feedBody>): string {
  const rows = feed.items.map((i) => `<li data-pdx-change="${attr(i.kind)}">
<span class="k">${text(KIND_WORD[i.kind])}</span> <span class="when">${text(i.date)}</span><br />
${i.link ? `<a href="${attr(i.link)}">${text(i.title)}</a>` : text(i.title)}
${i.detail ? `<br /><span>${text(i.detail)}</span>` : ""}
<span class="src">Source: ${i.source.url ? `<a href="${attr(i.source.url)}" target="_blank" rel="noopener">${text(i.source.label)}</a>` : text(i.source.label)}</span>
</li>`).join("\n");
  const missing = (feed as any).unavailable?.length
    ? `<p class="note">Not available right now: ${text((feed as any).unavailable.join(", "))}. The rest of the feed is shown.</p>` : "";
  return page({
    title: "What changed on PolitiDex · PolitiDex",
    description: "Recent published roll calls, stated positions and roster seat changes on PolitiDex, each with its source.",
    canonical: ORIGIN + "/changes",
    eyebrow: "What changed",
    body: `<h1>What changed recently</h1>
<p class="sub">A read-only list of recent changes to what PolitiDex publishes. Each item says where it came from. Also available as JSON at <a href="/api/changes">/api/changes</a>.</p>
${missing}
<ul class="feed">${rows || "<li>Nothing has changed recently.</li>"}</ul>`,
  });
}

// ── the person-file coverage slice ─────────────────────────────────────────
export function committeesFor(pid: string, file: any) {
  const rows = file?.people?.[pid];
  if (!rows || !rows.length) return null;
  const C = file.committees || {};
  const top: any[] = [];
  const byCode: Record<string, any> = {};
  for (const [code, lead] of rows) {
    const c = C[code];
    if (!c) continue;
    const row = { code, name: c[0], chamber: c[1], title: lead || null, subcommittees: [] as any[] };
    if (c[2]) {
      const parent = byCode[c[2]];
      if (parent) parent.subcommittees.push({ code, name: c[0], title: lead || null });
      continue;
    }
    byCode[code] = row;
    top.push(row);
  }
  return { sources: file.sources || {}, committees: top };
}

export function cosponsorshipsFor(pid: string, file: any) {
  const idx = file?.people?.[pid];
  if (!idx || !idx.length) return null;
  const congress = file.congress;
  return {
    congress, fetchedOn: file.fetchedOn || "", source: file.source || "",
    bills: idx.map((i: number) => file.bills[i]).filter(Boolean).map(([number, title, introduced, area, url, page]: any[]) => ({
      number, title, introduced, policyArea: area || null, url,
      page: page ? `/b/${encodeURIComponent(String(congress))}/${encodeURIComponent(number)}` : null,
    })),
  };
}

export function fundingFor(pid: string, file: any) {
  const p = file?.people?.[pid];
  if (!p) return null;
  const C = file.committees || {};
  return {
    cycles: file.cycles || [], source: file.source || "", fec: p.fec, total: p.total, committees: p.n,
    kinds: Object.entries(p.kinds || {}).map(([k, n]) => ({ kind: k, label: (file.kinds || {})[k] || k, total: n }))
      .sort((a: any, b: any) => b.total - a.total),
    top: (p.top || []).map(([id, n]: [string, number]) => ({ id, name: (C[id] || [id])[0], kind: (C[id] || [])[1] || "other", label: (file.kinds || {})[(C[id] || [])[1]] || "Other PAC", total: n })),
  };
}

// The bill page's roster co-sponsors, by "<sitting>|<number>".
export function billCosponsorsFor(key: string, file: any) {
  const at = (file?.bills || []).findIndex((b: any[]) => `${file.congress}|${b[0]}` === key);
  if (at < 0) return null;
  const who: { pid: string; name: string }[] = [];
  for (const [pid, idx] of Object.entries(file.people || {}) as [string, number[]][]) {
    if (idx.includes(at)) who.push({ pid, name: (file.names || {})[pid] || pid });
  }
  who.sort((a, b) => a.name.localeCompare(b.name));
  const b = file.bills[at];
  return { key, congress: file.congress, number: b[0], title: b[1], url: b[4], fetchedOn: file.fetchedOn || "", source: file.source || "", cosponsors: who };
}

export { money as formatMoney };
