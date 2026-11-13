// admin-auth.mjs — server-side check for the EXISTING curator login.
// The /admin page signs the curator in with Firebase and allows exactly one
// account (ADMIN_EMAILS in admin.html). This verifies the same Firebase ID token
// server-side — the same RS256 / Google-cert check community.mts, pdx-sync.mts
// and digest.ts already do — and accepts only that same email. No new auth.
import crypto from "node:crypto";

export const FIREBASE_PROJECT_ID = "politidex-979bd";
// Kept in sync with ADMIN_EMAILS in admin.html (compared case-insensitively there too).
export const ADMIN_EMAILS = ["cdeluxxe@gmail.com"];

const GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
let certCache = null;

export async function googleCerts() {
  const now = Date.now();
  if (certCache && certCache.expires > now) return certCache.certs;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Could not fetch Google signing certs");
  const certs = await res.json();
  const m = (res.headers.get("cache-control") || "").match(/max-age=(\d+)/);
  certCache = { certs, expires: now + (m ? +m[1] : 3600) * 1000 };
  return certs;
}

const b64json = (seg) => JSON.parse(Buffer.from(seg, "base64url").toString("utf8"));

/** The verified token payload, or null. Never throws. `getCerts` is injectable for tests. */
export async function verifyFirebaseToken(token, { getCerts = googleCerts, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const head = b64json(parts[0]), payload = b64json(parts[1]);
    if (head.alg !== "RS256") return null;
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    const pem = (await getCerts())[head.kid];
    if (!pem) return null;
    const ok = crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey(pem), Buffer.from(parts[2], "base64url"));
    return ok ? payload : null;
  } catch {
    return null;
  }
}

/** { ok: true, email } for the curator; { ok: false, status } otherwise. */
export async function requireAdmin(req, opts = {}) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401 };
  const p = await verifyFirebaseToken(token, opts);
  if (!p) return { ok: false, status: 401 };
  const email = typeof p.email === "string" ? p.email.toLowerCase() : "";
  if (!ADMIN_EMAILS.includes(email)) return { ok: false, status: 403 };
  return { ok: true, email };
}
