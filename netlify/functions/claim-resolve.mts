// ─────────────────────────────────────────────────────────────────────────────
// Claim resolver — free text in, an ADDRESS out
// ─────────────────────────────────────────────────────────────────────────────
// This Function does exactly one thing: it turns a pasted political claim into
// the address of a receipt the app already knows how to render —
//
//     { pid, issueKey, direction }  →  PDXReceiptCards.find(pid, issueKey)
//
// It does NOT judge the claim, fetch evidence, score anything, or write to the
// database. Every verdict a reader sees is still produced by the existing
// Official Record engine on the client, behind the guards in receipt-cards.js.
// If this file ever starts asserting whether a claim is TRUE, that is a bug.
//
// WHY A RESOLVER AND NOT A SEARCH. Every text matcher in the app is lexical
// (substring, token prefix, ILIKE). Real claims are rhetorical — "open borders",
// "raided Medicare", "soft on crime" — and share almost no literal tokens with
// the issue taxonomy. The lexical layer is still the right first pass, because
// it is free, deterministic and auditable; the model is only asked to do the one
// thing lexical matching cannot, which is to choose between candidates the
// deterministic pass already produced and say which way the claim points.
//
// THE SHAPE OF THE TRUST. Nothing the model returns is used as given:
//   1. netlify/lib/claim-candidates.ts narrows 756 roster profiles and 110 issue
//      keys to a short menu, using only generated data. Pure, testable, offline.
//   2. If that pass finds no politician, we stop and never call the model. A
//      claim we cannot find a name in is not a claim we can address.
//   3. The model chooses FROM THE MENU. Its answer is re-checked against that
//      same menu, so a hallucinated id cannot get out — it is validated not just
//      against the 110-key allowlist but against the ≤12 keys we actually
//      offered for this claim.
//   4. Confidence below the gate, a direction of "unknown", or any parse failure
//      returns `resolved: false` with a plain reason. Never a guess.
//
// FAIL CLOSED IS THE WHOLE POINT. A missing receipt costs a reader one search. A
// confidently wrong receipt about a named person costs them their trust in every
// other receipt on the site. The asymmetry is not close, so every uncertain
// branch here returns nothing rather than something.
//
// Route: POST /api/claim-resolve   { "claim": "..." }
//
// Resolved:
//   { "resolved": true, "pid": "...", "issueKey": "...",
//     "direction": "supports" | "opposes" | "unknown",
//     "confidence": 0..1, "display": { "politician": "...", "issue": "..." } }
//
// Unresolved — the same envelope with no address, so the client has one shape
// to handle and no branch can emit a half-populated one:
//   { "resolved": false, "reason": "...", "confidence": 0..1,
//     "pid": null, "issueKey": null, "direction": "unknown", "display": null }

import type { Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import {
  ISSUE_KEY_SET,
  buildPrompt,
  issueCandidates,
  politicianCandidates,
  type IssueCandidate,
  type PolCandidate,
} from "../lib/claim-candidates.js";

// ── Tunables ────────────────────────────────────────────────────────────────
// The claim is a pasted sentence or short paragraph, not a document. A longer
// paste is an article, which this cannot address anyway.
const CLAIM_MAX = 1200;
const CLAIM_MIN = 12;
// The gate. Below this the model's answer is discarded and the reader is told we
// could not read the claim. Set high on purpose: the failure being avoided is a
// receipt about the wrong person, and there is no cheap way to catch one after
// it has been screenshotted.
const CONFIDENCE_GATE = 0.72;

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 300;

// ── Helpers ─────────────────────────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The single unresolved shape. Every fail-closed branch returns through here.
function unresolved(reason: string, confidence = 0, status = 200): Response {
  return json(
    {
      resolved: false,
      reason,
      confidence,
      pid: null,
      issueKey: null,
      direction: "unknown",
      display: null,
    },
    status
  );
}

// ── The model call ──────────────────────────────────────────────────────────
// One call, one job: pick from the menus, say which way the claim points, say
// how sure it is. Same posture as the community triage — submitted text is DATA,
// the output contract is compact JSON, and a parse failure is a fail-closed
// branch rather than a retry.
interface ModelPick {
  pid: string;
  issueKey: string;
  direction: string;
  confidence: number;
  reason: string;
}

async function askModel(
  claim: string,
  pols: PolCandidate[],
  issues: IssueCandidate[]
): Promise<ModelPick | null> {
  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(claim, pols, issues) }],
  });
  const textPart = msg.content.find((c) => c.type === "text");
  const raw = textPart && "text" in textPart ? textPart.text : "{}";

  let parsed: any;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  let conf = Number(parsed.confidence);
  if (!isFinite(conf)) conf = 0;
  conf = Math.max(0, Math.min(1, conf));

  return {
    pid: typeof parsed.pid === "string" ? parsed.pid.trim() : "",
    issueKey: typeof parsed.issueKey === "string" ? parsed.issueKey.trim() : "",
    direction:
      typeof parsed.direction === "string" ? parsed.direction.trim().toLowerCase() : "unknown",
    confidence: conf,
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "",
  };
}

// ── The route ───────────────────────────────────────────────────────────────
async function resolveClaim(req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return unresolved("Send a JSON body with a `claim` string.", 0, 400);
  }

  const claim = typeof body?.claim === "string" ? body.claim.trim().slice(0, CLAIM_MAX) : "";
  if (claim.length < CLAIM_MIN) {
    return unresolved("That is too short to read as a claim.", 0, 400);
  }

  // Pass 1 — deterministic. Both menus are built before any model is involved,
  // and either one coming back empty ends the request without a model call.
  const pols = politicianCandidates(claim);
  if (!pols.length) {
    return unresolved(
      "We could not find a politician we track in that claim. Try naming them in full."
    );
  }
  const issues = issueCandidates(claim);
  if (!issues.length) {
    return unresolved(
      "That claim does not line up with an issue we track closely enough to check."
    );
  }

  // Pass 2 — the model chooses from the menus.
  let pick: ModelPick | null = null;
  try {
    pick = await askModel(claim, pols, issues);
  } catch (e: any) {
    console.error("claim-resolve model error:", e?.message || e);
    return json({ error: "Claim reading is unavailable right now." }, 502);
  }
  if (!pick) return unresolved("We could not read that claim reliably.");

  // ── Validate before trust ────────────────────────────────────────────────
  // Against the MENUS, not merely the allowlist: the model was handed a closed
  // list, so anything off it is a hallucination even when the id exists
  // elsewhere in the roster.
  const polHit = pols.find((c) => c.pid === pick!.pid) || null;
  const issueHit = issues.find((c) => c.key === pick!.issueKey) || null;
  const direction =
    pick.direction === "supports" || pick.direction === "opposes" ? pick.direction : "unknown";

  if (!polHit) {
    return unresolved("We could not tell which politician that claim is about.", pick.confidence);
  }
  // Belt and braces: the menu is built from the allowlist, so this can only fire
  // if the generated key list and the keyword map ever drift apart.
  if (!issueHit || !ISSUE_KEY_SET.has(issueHit.key)) {
    return unresolved("We could not tell which issue that claim is about.", pick.confidence);
  }
  if (direction === "unknown") {
    return unresolved(
      "That claim does not say clearly whether they are for or against it.",
      pick.confidence
    );
  }
  if (pick.confidence < CONFIDENCE_GATE) {
    return unresolved(
      "We could not read that claim confidently enough to pull a receipt.",
      pick.confidence
    );
  }

  return json({
    resolved: true,
    pid: polHit.pid,
    issueKey: issueHit.key,
    direction,
    confidence: pick.confidence,
    display: {
      politician: polHit.name,
      // The client re-derives the pretty label (and the icon) from ISSUE_MAP,
      // which owns them. This is the plain fallback for anything reading the API
      // without the app loaded.
      issue: issueHit.key.replace(/_/g, " "),
    },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method.toUpperCase() !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  try {
    return await resolveClaim(req);
  } catch (e: any) {
    console.error("claim-resolve error:", e?.message || e);
    return json({ error: "Claim reading is unavailable right now." }, 502);
  }
};

export const config: Config = {
  path: "/api/claim-resolve",
};
