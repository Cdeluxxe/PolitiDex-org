// ─────────────────────────────────────────────────────────────────────────────
// fec-core.mjs — FEC bulk-file reading shared by the funding generators
// ─────────────────────────────────────────────────────────────────────────────
// Lifted out of gen-aipac-pac.mjs so the AIPAC lane and the broader funding
// generator (gen-funding.mjs) read FEC's files by ONE set of rules:
//
//   roster → bioguide   cmp-data.js portrait URLs (congress/450x550/<bioguide>)
//                       and the bioguideId/politicianId pairs in the db/ seeds
//   bioguide → FEC ids  unitedstates/congress-legislators (id.fec)
//   what counts         itpas2.txt rows of transaction type 24K (a committee's
//                       contribution to a candidate committee), not memo
//                       entries, and not earmarks — a memo naming EARMARK /
//                       ERMK is an individual's donation passed through a
//                       conduit, which is that person's money, not the
//                       committee's. Refunds net against contributions.
//
// Inputs, all public:
//   itpas2.txt  fec.gov/files/bulk-downloads/<year>/pas2<yy>.zip
//   cm.txt      fec.gov/files/bulk-downloads/<year>/cm<yy>.zip (committee master)
//   legislators unitedstates.github.io/congress-legislators/legislators-*.json
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const readdirSafe = (d) => { try { return readdirSync(d); } catch (e) { return []; } };

// pid → bioguide, from the repo. Throws when one pid maps to two ids.
export function rosterBioguide(root) {
  const R = (f) => readFileSync(join(root, f), "utf8");
  const pidBg = new Map();
  const addPair = (pid, bg) => {
    const had = pidBg.get(pid);
    if (had && had !== bg) throw new Error(`${pid} maps to two bioguide ids: ${had}, ${bg}`);
    pidBg.set(pid, bg);
  };
  const src = R("cmp-data.js");
  const heads = [...src.matchAll(/\n\s*"([a-z0-9_]+)":\s*\{/g)];
  heads.forEach((m, i) => {
    const block = src.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : src.length);
    const ph = /congress\/450x550\/([A-Z]\d{6})\.jpg/.exec(block);
    if (ph) addPair(m[1], ph[1]);
  });
  for (const f of readdirSafe(join(root, "db"))) {
    if (!f.endsWith(".json")) continue;
    const s = R("db/" + f);
    for (const m of s.matchAll(/"bioguideId":\s*"([A-Z]\d{6})",\s*"politicianId":\s*"([a-z0-9_]+)"/g)) addPair(m[2], m[1]);
  }
  return pidBg;
}

// FEC candidate id → pid.
export function fecCandidates(legislatorFiles, pidBg) {
  const fecPid = new Map();
  const bgPid = new Map([...pidBg].map(([p, b]) => [b, p]));
  for (const f of legislatorFiles) {
    for (const L of JSON.parse(readFileSync(f, "utf8"))) {
      const pid = bgPid.get(L.id && L.id.bioguide);
      if (!pid) continue;
      for (const c of L.id.fec || []) fecPid.set(c, pid);
    }
  }
  return fecPid;
}

// One itpas2.txt row → { cmte, cand, amount } when it counts, else null.
export function countedRow(line) {
  const f = line.split("|");
  if (f[5] !== "24K" || f[19] === "X") return null;
  if (/EARMARK|ERMK/i.test(f[20] || "")) return null;
  return { cmte: f[0], cand: f[16], amount: Number(f[14] || 0) };
}

// Net contributions per person, per committee key, per cycle.
// `keyOf(cmteId)` returns the key a committee is filed under, or null to skip it.
// Returns Map pid → { fec, pacs: { key: { cycle: amount } } }, in file order.
export function netContributions(pas2Files, cycles, fecPid, keyOf) {
  const people = new Map();
  pas2Files.forEach((file, i) => {
    const cycle = cycles[i];
    for (const line of readFileSync(file, "latin1").split("\n")) {
      const r = countedRow(line);
      if (!r) continue;
      const key = keyOf(r.cmte);
      if (!key) continue;
      const pid = fecPid.get(r.cand);
      if (!pid) continue;
      const p = people.get(pid) || { fec: r.cand, pacs: {} };
      const c = (p.pacs[key] ||= {});
      c[cycle] = Math.round(((c[cycle] || 0) + r.amount) * 100) / 100;
      people.set(pid, p);
    }
  });
  return people;
}

export const sumCycles = (o) => Object.values(o).reduce((a, b) => a + b, 0);

// Drop every committee whose net is not above zero (refunded in full is not on file).
export function dropNonPositive(people) {
  for (const p of people.values()) for (const k of Object.keys(p.pacs)) if (!(sumCycles(p.pacs[k]) > 0)) delete p.pacs[k];
  return people;
}

// cm.txt → Map cmteId → { name, designation, type, party, orgType, connectedOrg }.
// Later files win, so pass the older cycle first.
export function committeeMaster(cmFiles) {
  const out = new Map();
  for (const file of cmFiles) {
    for (const line of readFileSync(file, "latin1").split("\n")) {
      const f = line.split("|");
      if (!/^C\d{8}$/.test(f[0] || "")) continue;
      out.set(f[0], { name: (f[1] || "").trim(), designation: f[8] || "", type: f[9] || "", party: f[10] || "", orgType: f[12] || "", connectedOrg: (f[13] || "").trim() });
    }
  }
  return out;
}
