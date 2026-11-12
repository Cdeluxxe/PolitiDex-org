#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// review-dirkey-auto.mjs — finish (or reopen) the review of an automatic
// directional-key row tagged needs_review by the second-model check
//
//   node scripts/review-dirkey-auto.mjs --list
//   node scripts/review-dirkey-auto.mjs --pid <id> --key <key> [--bill "H.R. 1"] [--note "one line"] [--date YYYY-MM-DD] [--dry-run]
//   node scripts/review-dirkey-auto.mjs --pid <id> --key <key> [--bill "H.R. 1"] --reopen
//
// Without --bill the stance row on <key> is marked; with --bill, the bill
// match. Marking clears needs_review and writes
//   reviewed: { reviewed: true, reviewed_at, note? }
// on the row (netlify/lib/dirkey-review-core.mjs). The person page then shows
// "Cross-checked" on it instead of "Under review"; the note is never shown.
// ═══════════════════════════════════════════════════════════════════════════
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { markReviewed, reopenReview } from "../netlify/lib/dirkey-review-core.mjs";
import { reviewQueue } from "../netlify/lib/dirkey-verify-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTO_TABLE = path.join(root, "person-directional-keys-auto.json");

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const table = JSON.parse(fs.readFileSync(AUTO_TABLE, "utf8"));

if (argv.includes("--list")) {
  for (const q of reviewQueue(table)) console.log(`${q.politician_id}\t${q.row}\t${q.key}${q.bill ? `\t${q.bill}` : ""}`);
  process.exit(0);
}

const pid = opt("pid"), key = opt("key"), bill = opt("bill") || "";
if (!pid || !key) { console.error("usage: --pid <id> --key <key> [--bill <bill>] [--note <text>] [--date YYYY-MM-DD] [--reopen] [--dry-run] | --list"); process.exit(2); }
const target = { pid, key, bill, row: bill ? "bill_match" : "stance" };
const res = argv.includes("--reopen")
  ? reopenReview(table, target)
  : markReviewed(table, { ...target, note: opt("note") || "", at: opt("date") || new Date() });
if (!res.ok) { console.error(`review-dirkey-auto: ${res.error}`); process.exit(1); }
if (!argv.includes("--dry-run")) fs.writeFileSync(AUTO_TABLE, JSON.stringify(res.table, null, 2) + "\n");
console.log(`review-dirkey-auto: ${pid} ${target.row} ${key}${bill ? ` ${bill}` : ""} — ${argv.includes("--reopen") ? "reopened" : "marked reviewed"}${argv.includes("--dry-run") ? " (dry run)" : ""}`);
