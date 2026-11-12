#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// verify-dirkey-auto.mjs — the second-model check on the automatic
// directional-key rows
//
// Runs netlify/lib/dirkey-verify-core.mjs over person-directional-keys-auto.json:
// every lower-confidence or higher-risk stance row (confidence < 0.85, a lone
// R8 stated position, an agency or committee homepage, or "no clear position"
// with a bill match) is labeled again by a second model from the same quote and
// the sentences around it on the source page; both labels, an agreement flag
// and — on a disagreement — `needs_review: true` are written onto the row.
// Bill matches whose recorded Congress does not match the year or Congress the
// source text cites get the same tag. Rows stay live either way; nothing here
// is rendered on the page.
//
// scripts/gen-dirkey-auto.mjs runs this automatically after each generator
// pass. Run it alone to check rows written before it existed, or rows a
// previous pass could not reach:
//   node scripts/verify-dirkey-auto.mjs [--dry-run] [--force]
// The model is called through the Netlify AI Gateway (default Anthropic client).
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as V from "../netlify/lib/dirkey-verify-core.mjs";
import { extractSentences } from "../netlify/lib/stance-score-core.mjs";
import { FETCH_TIMEOUT_MS, MAX_BODY_CHARS } from "../netlify/lib/raw-ingest-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const AUTO_TABLE = path.join(root, "person-directional-keys-auto.json");
export const VERIFY_MODEL = "claude-sonnet-5-5";

/** One call to the second model; returns its text. */
export function anthropicAsker({ model = VERIFY_MODEL } = {}) {
  let client = null;
  return async (prompt) => {
    if (!client) { const { default: Anthropic } = await import("@anthropic-ai/sdk"); client = new Anthropic(); }
    // The model may think before it answers; the budget leaves room for both.
    const once = () => client.messages.create({ model, max_tokens: 4000, messages: [{ role: "user", content: prompt }] });
    let msg;
    try { msg = await once(); } catch { msg = await once(); } // one retry on a transient error
    return (msg.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  };
}

/** The sentences around the row's quote on its first source page ("" when the page or quote cannot be found). */
export function pageContextFetcher() {
  const pages = new Map();
  const get = (url) => {
    if (!pages.has(url)) {
      pages.set(url, fetch(url, { headers: { "user-agent": "PolitiDex stance generator (+https://politidex.fyi)", accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        .then(async (r) => (r.ok ? extractSentences((await r.text()).slice(0, MAX_BODY_CHARS)) : null))
        .catch(() => null));
    }
    return pages.get(url);
  };
  return async (row) => {
    const url = row?.sources?.[0]?.link;
    if (!url || !row.quote) return "";
    const sentences = await get(url);
    return sentences ? V.contextAround(sentences, row.quote) : "";
  };
}

/** The pass, for the generator to call on the table it is about to write. */
export async function runVerify(table, { askModel = anthropicAsker(), fetchContext = pageContextFetcher(), model = VERIFY_MODEL, force = false, log = (l) => console.log(l) } = {}) {
  const res = await V.verifyTable(table, { askModel, fetchContext, model, force, log });
  const s = res.summary;
  log(`dirkey-verify: ${s.rows} row(s) · ${s.checked} checked by a second model (${s.agreed} agreed, ${s.disagreed} disagreed) · ${s.skipped} skipped (0.85+, multi-statement) · ${s.already} already checked · ${s.errors} not reached · ${s.congress_mismatch} bill match(es) with a Congress/year mismatch · ${s.tagged_for_review} row(s) tagged for review`);
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const table = JSON.parse(fs.readFileSync(AUTO_TABLE, "utf8"));
  const { table: next } = await runVerify(table, { force: argv.includes("--force") });
  if (!argv.includes("--dry-run")) fs.writeFileSync(AUTO_TABLE, JSON.stringify(next, null, 2) + "\n");
}
