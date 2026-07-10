// ─────────────────────────────────────────────────────────────────────────────
// vr-ingest.mjs — CLI for bulk Voting-Record ingest + verification (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────
// A thin operator/CI wrapper around the authenticated /api/vr-ingest endpoint. It
// never touches the database directly — it calls the deployed (or local `netlify
// dev`) Function, which owns all the DB + Blobs logic. This keeps the script
// portable (just needs fetch) and means the same auth/validation guards the UI's
// ingest also guard the CLI.
//
// Environment:
//   VR_SITE_URL      base URL of the site (default http://localhost:8889 for dev)
//   VR_INGEST_TOKEN  the bearer token the Function checks (required)
//
// Usage:
//   node scripts/vr-ingest.mjs verify
//   node scripts/vr-ingest.mjs run [house|senate] [congress] [limit] [--classify]
//
// Examples:
//   VR_INGEST_TOKEN=… node scripts/vr-ingest.mjs verify
//   VR_SITE_URL=https://politidex.org VR_INGEST_TOKEN=… \
//     node scripts/vr-ingest.mjs run senate 119 60

const BASE = (process.env.VR_SITE_URL || "http://localhost:8889").replace(/\/+$/, "");
const TOKEN = process.env.VR_INGEST_TOKEN;

function die(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

if (!TOKEN) die("VR_INGEST_TOKEN is not set — export the operator token first.");

const authHeaders = {
  authorization: "Bearer " + TOKEN,
  "content-type": "application/json",
  accept: "application/json",
};

async function verify() {
  const res = await fetch(BASE + "/api/vr-ingest/verify", { headers: authHeaders });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) die(`verify failed (${res.status}): ${JSON.stringify(body)}`);
  console.log("── Voting Record integrity ──");
  console.log("counts:", JSON.stringify(body.counts, null, 2));
  if (body.ok) console.log("✓ OK — no integrity problems found.");
  else {
    console.log("✗ Problems:");
    (body.issues || []).forEach((i) => console.log("   • " + i));
    process.exit(2);
  }
}

async function run(args) {
  const classify = args.includes("--classify");
  const positional = args.filter((a) => !a.startsWith("--"));
  const chamber = positional[0] || "house";
  const congress = positional[1] ? Number(positional[1]) : undefined;
  const limit = positional[2] ? Number(positional[2]) : undefined;
  const payload = { chamber, classifyIssues: classify };
  if (congress) payload.congress = congress;
  if (limit) payload.limit = limit;

  console.log(`Running ingest: ${JSON.stringify(payload)} → ${BASE}/api/vr-ingest`);
  const res = await fetch(BASE + "/api/vr-ingest", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) die(`ingest failed (${res.status}): ${JSON.stringify(body)}`);
  const r = body.report || {};
  if (r.configured === false) {
    console.log("⚠ Ingest skipped — CONGRESS_GOV_API_KEY not configured on the server.");
    return;
  }
  console.log("── Ingest report ──");
  console.log(JSON.stringify(r, null, 2));
  console.log(
    `✓ fetched ${r.fetched}, rollcalls ${r.rollcallsUpserted}, ` +
    `member votes ${r.memberVotesUpserted} (unmapped ${r.membersUnmapped}), packs ${r.packsWritten}.`
  );
}

const [cmd, ...rest] = process.argv.slice(2);
(async () => {
  if (cmd === "verify") await verify();
  else if (cmd === "run") await run(rest);
  else {
    console.log("Usage:\n  node scripts/vr-ingest.mjs verify\n  node scripts/vr-ingest.mjs run [house|senate] [congress] [limit] [--classify]");
    process.exit(cmd ? 1 : 0);
  }
})().catch((e) => die(e?.message || String(e)));
