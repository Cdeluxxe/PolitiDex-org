// ─────────────────────────────────────────────────────────────────────────────
// The general room — WHO HOLDS EACH SEAT, AND WHOSE THREAD A COMMENT LANDS IN
// ─────────────────────────────────────────────────────────────────────────────
// Every board opens with one general thread. It belongs to the district, but it
// is KEYED TO THE SITTING MEMBER: a general comment is stored under
// (seat_key, holder_pid). When the roster's sitting member for a seat changes,
// new comments go to the new pid and every old row stays under the old one, so
// the previous holder's thread is still there, unchanged, for anyone to read.
// A politician who later holds a DIFFERENT seat starts a separate thread on
// that seat: the key is the pair, so nothing carries over.
//
// THE SERVER DECIDES THE HOLDER. netlify/lib/seat-holders.mjs is the table,
// written by scripts/gen-seat-holders.mjs from the same roster
// gen-district-boards.mjs reads. A POST never carries a pid the server will
// trust; the pid on the row is always SEAT_HOLDERS[seat].pid at write time.
// A GET may ask for a previous holder's thread, and only a pid that table
// lists for THAT seat (current or previous) is answered.
//
// rollHolders() is the one place a roster change becomes history: the outgoing
// holder moves to the front of `previous`, and the incoming one starts with no
// rows. Pure, so scripts/test-general-room.mjs can simulate a change.

import { SEAT_HOLDERS } from "./seat-holders.mjs";

export const PID_RE = /^[a-z][a-z0-9_]*$/;

function clean(h) {
  const pid = String(h?.pid || "").trim();
  return PID_RE.test(pid) ? { pid, name: String(h?.name || "").trim() || pid } : null;
}

// prev: the table as it stands. now: { seat → { pid, name } } from the roster.
// A seat the roster no longer names keeps its entry untouched — it has no
// board to post on, and its history is not erased.
export function rollHolders(prev, now) {
  const out = {};
  const p = prev && typeof prev === "object" ? prev : {};
  const n = now && typeof now === "object" ? now : {};
  const seats = [...new Set([...Object.keys(p), ...Object.keys(n)])].sort();
  for (const seat of seats) {
    const was = p[seat] ? clean(p[seat]) : null;
    const wasPrev = Array.isArray(p[seat]?.previous) ? p[seat].previous.map(clean).filter(Boolean) : [];
    const cur = n[seat] ? clean(n[seat]) : null;
    if (!cur) {
      if (was) out[seat] = { pid: was.pid, name: was.name, previous: wasPrev };
      continue;
    }
    let previous = wasPrev;
    if (was && was.pid !== cur.pid) previous = [was, ...wasPrev];
    // A holder who returns to the seat resumes their own thread; they are not
    // listed as their own predecessor.
    const seen = new Set([cur.pid]);
    previous = previous.filter((h) => (seen.has(h.pid) ? false : (seen.add(h.pid), true)));
    out[seat] = { pid: cur.pid, name: cur.name, previous };
  }
  return out;
}

// The sitting member for a canonical seat key, or null.
export function holderFor(seatKey, table = SEAT_HOLDERS) {
  const h = table && Object.prototype.hasOwnProperty.call(table, seatKey) ? table[seatKey] : null;
  return h ? clean(h) : null;
}

export function previousFor(seatKey, table = SEAT_HOLDERS) {
  const h = table && Object.prototype.hasOwnProperty.call(table, seatKey) ? table[seatKey] : null;
  return Array.isArray(h?.previous) ? h.previous.map(clean).filter(Boolean) : [];
}

// Which thread a GET reads: the asked pid if THIS seat lists it, else the
// current holder. Null when the seat has no holder on file.
export function threadFor(seatKey, askedPid, table = SEAT_HOLDERS) {
  const cur = holderFor(seatKey, table);
  if (!cur) return null;
  const asked = String(askedPid || "").trim().toLowerCase();
  if (!asked || asked === cur.pid) return { ...cur, current: true };
  const prior = previousFor(seatKey, table).find((h) => h.pid === asked);
  return prior ? { ...prior, current: false } : { ...cur, current: true };
}
