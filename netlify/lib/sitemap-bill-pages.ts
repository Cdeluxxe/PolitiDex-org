// ─────────────────────────────────────────────────────────────────────────────
// sitemap-bill-pages — the generated bill pages, added to sitemap.xml and to
// the client's bill-page list (bill-pages.js)
// ─────────────────────────────────────────────────────────────────────────────
// sitemap.xml is a committed file written by scripts/gen-sitemap.mjs from the
// migrations and the build-time bill snapshot. The scheduled bill job also
// generates pages at runtime and stores one record per bill in Blobs
// "bill-pages", keyed "us/<congress>/<number, percent-encoded>". Those pages
// are served at /b/<congress>/<number> but cannot be in a file written before
// they exist.
//
// So the address /sitemap.xml keeps serving the committed file, and the edge
// (netlify/edge-functions/sitemap-bill-pages.ts) adds one <url> per stored page
// before </urlset>. Nothing else in the file changes. The URL format is the one
// the snapshot bills use: /b/<congress>/<encodeURIComponent(number)>, on the
// generator's one origin. A page that is already listed is not listed twice.
//
// Pure: no Blobs and no network. The edge passes in the store's keys.

export const BILL_PAGES_STORE = "bill-pages";
export const BILL_PAGES_PREFIX = "us/";
export const SITEMAP_ORIGIN = "https://politidex.fyi"; // = ORIGIN in scripts/gen-sitemap.mjs
export const SITEMAP_MAX_URLS = 50_000;                 // the sitemap protocol's per-file limit

// A federal citation as the page records spell it: "H.R. 7000", "S.J.Res. 44",
// "H.Amdt. 90". Anything else is a key this module did not write.
const NUMBER_RE = /^[A-Z][A-Za-z.]{0,12} \d{1,5}$/;

// "us/119/H.R.%207000" → "/b/119/H.R.%207000"; null for any other key.
export function billPagePathFromKey(key: string): string | null {
  const m = String(key || "").match(/^us\/(\d{1,3})\/([^/]+)$/);
  if (!m) return null;
  let number: string;
  try { number = decodeURIComponent(m[2]); } catch { return null; }
  if (!NUMBER_RE.test(number)) return null;
  return `/b/${encodeURIComponent(m[1])}/${encodeURIComponent(number)}`;
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The sitemap with one line per stored page it does not already list, in the
// generator's own line format. A document without </urlset> is returned as-is.
export function mergeBillPages(xml: string, keys: string[], origin = SITEMAP_ORIGIN): { xml: string; added: number } {
  const end = xml.lastIndexOf("</urlset>");
  if (end < 0) return { xml, added: 0 };
  const have = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const room = SITEMAP_MAX_URLS - have.size;
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const path of keys.map(billPagePathFromKey).filter((p): p is string => !!p).sort()) {
    const loc = xmlEscape(origin + path);
    if (have.has(loc) || seen.has(loc)) continue;
    if (lines.length >= room) break;
    seen.add(loc);
    lines.push(`  <url><loc>${loc}</loc></url>\n`);
  }
  if (!lines.length) return { xml, added: 0 };
  return { xml: xml.slice(0, end) + lines.join("") + xml.slice(end), added: lines.length };
}

// ── The client list (bill-pages.js) ─────────────────────────────────────────
// bill-pages.js is the committed window.PDX_BILL_PAGES list, written by
// scripts/gen-bill-pages.mjs from the sitemap's snapshot bills, keyed
// "<congress>/<number>" — the key the person-page issue drawer looks up
// (_billPageDoor in consistency.js) before printing a "Bill page" link. The
// edge (netlify/edge-functions/bill-pages-client.ts) serves that file unchanged
// and appends one statement adding the generated pages it does not already list,
// with the same key spelling, so the drawer links them with no change of its own.

// "us/119/H.R.%207000" → "119/H.R. 7000"; null for any other key.
export function clientKeyFromKey(key: string): string | null {
  const path = billPagePathFromKey(key);
  if (!path) return null;
  const [, , c, n] = path.split("/");
  return `${decodeURIComponent(c)}/${decodeURIComponent(n)}`;
}

// The keys bill-pages.js already lists ("  "119/H.R. 1": 1," lines).
export function listedClientKeys(js: string): Set<string> {
  const out = new Set<string>();
  for (const m of js.matchAll(/^\s*("(?:[^"\\]|\\.)*")\s*:\s*1\s*,?\s*$/gm)) {
    try { out.add(JSON.parse(m[1])); } catch { /* not a key line */ }
  }
  return out;
}

// The file with one appended statement for the stored pages it does not list.
// Nothing above it changes, and no statement is added when there is nothing new.
export function mergeClientBillPages(js: string, keys: string[]): { js: string; added: string[] } {
  const have = listedClientKeys(js);
  const added = [...new Set(keys.map(clientKeyFromKey).filter((k): k is string => !!k && !have.has(k)))].sort();
  if (!added.length) return { js, added };
  const body = added.map((k) => `  ${JSON.stringify(k)}: 1`).join(",\n");
  const tail =
    `// Added when served: bill pages the scheduled bill job generated after this\n` +
    `// file was written (Blobs "bill-pages"), keyed the same way.\n` +
    `window.PDX_BILL_PAGES = Object.assign(window.PDX_BILL_PAGES || {}, {\n${body}\n});\n`;
  return { js: (js.endsWith("\n") ? js : js + "\n") + tail, added };
}
