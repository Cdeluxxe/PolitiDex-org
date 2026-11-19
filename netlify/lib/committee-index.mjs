// ─────────────────────────────────────────────────────────────────────────────
// committee-index.mjs — the committee pages' data, as pure functions
// ─────────────────────────────────────────────────────────────────────────────
// Reads db/person-committees.json (scripts/gen-committees.mjs, from the House
// Clerk's and the Senate's own membership files) and nothing else: no database,
// no network. Plain JS so the page function (netlify/functions/committee-page.mts,
// through coverage-pages.ts) and the sitemap generator (scripts/gen-sitemap.mjs,
// plain Node) share ONE answer to "which committees have a page".
//
//   committeePath(code)            /committee/<code>
//   committeeCodes(file)           every code with at least one roster member
//                                  (on it or on one of its subcommittees), sorted
//   committeeData(code, file, people)
//                                  one committee: name, chamber, parent,
//                                  subcommittees and the roster members the file
//                                  lists, with the title the House file prints
//
// Nothing is ranked or scored. Members are listed titled first (in the order the
// file's titles read: Chair before Vice Chair), then by name.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMITTEE_CODE = /^[A-Z]{2,6}[0-9]{2}$/;
export const COMMITTEE_PATH = /^\/committee\/([A-Za-z0-9]{2,12})\/?$/;

export const committeePath = (code) => `/committee/${encodeURIComponent(String(code))}`;

// The code in a /committee/<code> address, upper-cased, or null.
export function parseCommitteePath(pathname) {
  const m = COMMITTEE_PATH.exec(String(pathname || ""));
  if (!m) return null;
  const code = m[1].toUpperCase();
  return COMMITTEE_CODE.test(code) ? code : null;
}

// code → [[pid, title|null]], in the file's person order.
function membersByCode(file) {
  const out = new Map();
  for (const [pid, rows] of Object.entries(file?.people || {})) {
    for (const [code, title] of rows || []) {
      const l = out.get(code) || [];
      l.push([pid, title || null]);
      out.set(code, l);
    }
  }
  return out;
}

export function committeeCodes(file) {
  const C = file?.committees || {};
  const by = membersByCode(file);
  const has = new Set();
  for (const code of Object.keys(C)) {
    if (!by.get(code)?.length) continue;
    has.add(code);
    if (C[code][2] && C[C[code][2]]) has.add(C[code][2]);
  }
  return [...has].filter((c) => COMMITTEE_CODE.test(c)).sort();
}

const TITLE_ORDER = ["Chair", "Chairman", "Chairwoman", "Vice Chair", "Vice Chairman", "Vice Chairwoman"];
const titleRank = (t) => (t ? (TITLE_ORDER.indexOf(t) >= 0 ? TITLE_ORDER.indexOf(t) : TITLE_ORDER.length) : TITLE_ORDER.length + 1);

// `people` is the share index's people table (id → { n, p, s }) for display
// names; a member it does not carry is shown by roster id.
export function committeeData(code, file, people = {}) {
  const C = file?.committees || {};
  const c = C[code];
  if (!c) return null;
  const by = membersByCode(file);
  const member = ([pid, title]) => {
    const p = people[pid] || {};
    return { pid, name: p.n || pid, party: p.p || null, state: p.s || null, title };
  };
  const sortMembers = (list) => list.sort((a, b) => titleRank(a.title) - titleRank(b.title) || a.name.localeCompare(b.name) || a.pid.localeCompare(b.pid));
  const members = sortMembers((by.get(code) || []).map(member));
  const subcommittees = Object.entries(C)
    .filter(([, v]) => v[2] === code)
    .map(([sub, v]) => ({ code: sub, name: v[0], members: (by.get(sub) || []).length }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  const parent = c[2] && C[c[2]] ? { code: c[2], name: C[c[2]][0] } : null;
  const src = file.sources || {};
  const chamberSources = [];
  if ((c[1] === "house" || c[1] === "joint") && src.house) chamberSources.push({ label: "House Clerk member data", url: src.house.url, asOf: src.house.asOf || null });
  if ((c[1] === "senate" || c[1] === "joint") && src.senate) chamberSources.push({ label: "Senate committee assignments", url: src.senate.url, asOf: src.senate.asOf || null });
  return {
    code, name: c[0], chamber: c[1], parent, subcommittees, members,
    page: committeePath(code), sources: chamberSources, asOf: src.fetchedOn || null,
  };
}
