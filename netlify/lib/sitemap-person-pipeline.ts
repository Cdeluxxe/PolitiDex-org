// ─────────────────────────────────────────────────────────────────────────────
// sitemap-person-pipeline — person files that pipeline positions publish
// ─────────────────────────────────────────────────────────────────────────────
// scripts/gen-sitemap.mjs writes sitemap.xml offline, from the repo, through the
// app's own publication floor (publication-floor.js). The floor also counts
// pipeline positions — stance cards promoted from Evidence Locker items into the
// database at runtime — which the generator cannot read. So for every person
// file it turns away, it writes db/sitemap-floor-pending.json: how many pipeline
// positions the floor says would carry the file over (n), the issue keys its
// curated list already carries (k — a pipeline card there is not shown, so it
// does not count), and the other ids a pipeline card may be filed under (a).
//
// The edge that serves /sitemap.xml (netlify/edge-functions/sitemap-bill-pages.ts)
// reads the live pipeline keys and adds one /p/<pid> line for each pending file
// that now has at least n. The rule is not copied here: n is the floor's own
// answer (PDXPublicationFloor.pipelineNeed), and this compares integers.
//
// SAME STRUCTURE. The new lines go directly after the last /p/ line the
// generator wrote, in the generator's line format, sorted — so the person block
// stays one block and nothing else in the file moves. A pid already listed is
// not listed twice, and the protocol's 50,000-URL limit is respected.
//
// Pure: no network. The edge passes in the keys.
import { pipelineFill, type PipelineKeys } from "./pipeline-positions.ts";
import { SITEMAP_ORIGIN, SITEMAP_MAX_URLS } from "./sitemap-bill-pages.ts";

export type PendingRow = { n: number; k?: string[]; a?: string[] };
export type PendingTable = Record<string, PendingRow>;

const PID_RE = /^[a-z0-9_]+$/; // = PDXPublicationFloor.PID_RE

// The pending pids that now clear the floor, sorted.
export function pipelinePublishable(pending: PendingTable, keys: PipelineKeys | null): string[] {
  if (!keys || !pending) return [];
  const out: string[] = [];
  for (const pid of Object.keys(pending).sort()) {
    const row = pending[pid];
    const need = Number(row && row.n);
    if (!PID_RE.test(pid) || !(need >= 1)) continue;
    if (pipelineFill(keys, [pid, ...(row.a || [])], row.k || []).length >= need) out.push(pid);
  }
  return out;
}

export function mergePipelinePeople(
  xml: string,
  pending: PendingTable,
  keys: PipelineKeys | null,
  origin = SITEMAP_ORIGIN,
): { xml: string; added: string[] } {
  const end = xml.lastIndexOf("</urlset>");
  if (end < 0) return { xml, added: [] };
  const pids = pipelinePublishable(pending, keys);
  if (!pids.length) return { xml, added: [] };
  const have = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  let room = SITEMAP_MAX_URLS - have.size;
  const added: string[] = [];
  const lines: string[] = [];
  for (const pid of pids) {
    const loc = `${origin}/p/${pid}`;
    if (have.has(loc)) continue;
    if (room <= 0) break;
    room--;
    have.add(loc);
    added.push(pid);
    lines.push(`  <url><loc>${loc}</loc></url>\n`);
  }
  if (!lines.length) return { xml, added };
  // After the last person line, so the /p/ block stays contiguous; before
  // </urlset> if the file has no person line at all.
  const marker = `<url><loc>${origin}/p/`;
  const last = xml.lastIndexOf(marker);
  let at = end;
  if (last >= 0) {
    const nl = xml.indexOf("\n", last);
    at = nl >= 0 ? nl + 1 : end;
  }
  return { xml: xml.slice(0, at) + lines.join("") + xml.slice(at), added };
}
