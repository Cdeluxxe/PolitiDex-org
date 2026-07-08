// ─────────────────────────────────────────────────────────────────────────────
// Firebase ID-token verification (shared by the community Functions)
// ─────────────────────────────────────────────────────────────────────────────
// The browser sends its Firebase Authentication ID token as
// `Authorization: Bearer <token>`. We verify that RS256-signed token server-side
// against Google's published x509 certs and validate the standard claims — no
// firebase-admin / service account needed — so a caller cannot spoof another
// user's uid or the moderator's email.
//
// This mirrors the verification the /api/community Function has used since the
// Community Evidence Exchange shipped; it is factored out here so the item-thread
// Function (/api/threads) authenticates callers identically.

import crypto from "node:crypto";

// The site's Firebase project — the audience every valid ID token must carry.
export const FIREBASE_PROJECT_ID = "politidex-979bd";

// Site owner / main moderator. Kept in sync with the admin gate in index.html.
export const MODERATOR_EMAILS = ["cdeluxxe@gmail.com"];

const GOOGLE_CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let _certCache: { certs: Record<string, string>; expires: number } | null = null;

async function getGoogleCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (_certCache && _certCache.expires > now) return _certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing certs");
  const certs = (await res.json()) as Record<string, string>;
  const cc = res.headers.get("cache-control") || "";
  const m = cc.match(/max-age=(\d+)/);
  const maxAge = m ? parseInt(m[1], 10) : 3600;
  _certCache = { certs, expires: now + maxAge * 1000 };
  return certs;
}

function b64urlToJson(seg: string): any {
  return JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));
}

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string;
  isAnonymous: boolean;
  isModerator: boolean;
}

// Returns the verified user, or null when no/invalid token is supplied.
export async function verifyUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const header0 = b64urlToJson(parts[0]);
    const payload = b64urlToJson(parts[1]);

    // Standard Firebase ID token claim checks.
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`)
      return null;
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;

    // Signature check against the matching Google cert.
    const certs = await getGoogleCerts();
    const pem = certs[header0.kid];
    if (!pem) return null;
    const pubKey = crypto.createPublicKey(pem);
    const signed = `${parts[0]}.${parts[1]}`;
    const sig = Buffer.from(parts[2], "base64url");
    const okSig = crypto.verify("RSA-SHA256", Buffer.from(signed), pubKey, sig);
    if (!okSig) return null;

    const email: string | null =
      typeof payload.email === "string" ? payload.email : null;
    const provider = payload.firebase?.sign_in_provider;
    const isAnonymous = provider === "anonymous" || (!email && provider !== "custom");
    const name: string =
      (typeof payload.name === "string" && payload.name) ||
      (email ? email.split("@")[0] : "Community Member");
    const isModerator = !!email && MODERATOR_EMAILS.includes(email.toLowerCase());

    return { uid: payload.sub, email, name, isAnonymous, isModerator };
  } catch {
    return null;
  }
}

export function publicViewer(viewer: AuthUser | null) {
  if (!viewer) return { signedIn: false, isModerator: false, name: null };
  return {
    signedIn: !viewer.isAnonymous,
    isModerator: viewer.isModerator,
    name: viewer.name,
  };
}
