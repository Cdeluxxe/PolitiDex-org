// ─────────────────────────────────────────────────────────────────────────────
// PDX Digest Cron — the scheduled "What Changed" email sender
// ─────────────────────────────────────────────────────────────────────────────
// The email half of the notifications system. It runs on a schedule, finds the
// users who OPTED IN to email digests and are due by their chosen cadence, builds
// each one's personal "What Changed" digest from their synced interests, and mails
// it. It shares all its logic with the interactive endpoint via netlify/lib/digest.
//
// STRICTLY OPT-IN & NON-SPAMMY
//   • Only rows with email_enabled = true are ever considered.
//   • Cadence is the user's own choice (daily | weekly), enforced against
//     last_digest_at so nobody is mailed twice in a window.
//   • An empty digest is never sent — silence when there's nothing to say.
//   • last_digest_at only advances after a successful send, so a delivery failure
//     retries next run instead of silently dropping a cycle.
//
// EMAIL DELIVERY is pluggable and safe-by-default. Netlify has no built-in email,
// so actual sending goes through an ESP configured by environment variables:
//     RESEND_API_KEY     — a Resend API key (https://resend.com)
//     DIGEST_FROM_EMAIL  — the verified From address (e.g. "PolitiDex <digest@…>")
// When those are absent the function is a clean no-op: it logs that email delivery
// is unconfigured and advances nothing, so enabling it later "just works" and no
// secret is ever hard-coded. (This keeps the deploy green without a mail provider.)

import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { pdxNotificationPrefs } from "../../db/schema.js";
import { buildDigest, deriveInterests, type Digest } from "../lib/digest.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Is a user due for an email given their cadence and when they were last sent one?
// A small slack (running the daily job a bit early/late must not skip a day) is
// baked in: "daily" is due after ~20h, "weekly" after ~6.5 days.
function isDue(frequency: string, lastDigestAt: Date | null): boolean {
  if (frequency === "off") return false;
  if (!lastDigestAt) return true; // never sent → due now
  const elapsed = Date.now() - lastDigestAt.getTime();
  if (frequency === "daily") return elapsed >= 20 * 60 * 60 * 1000;
  if (frequency === "weekly") return elapsed >= 6.5 * DAY_MS;
  return false;
}

function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

// Compose a calm, nonpartisan HTML email from a built digest. Neutral tone, no
// outrage framing — just "here's what changed on what you're tracking."
function renderEmail(digest: Digest): { subject: string; html: string; text: string } {
  const total = digest.counts.total;
  const site = "https://politidex.org";

  const evRows = digest.evidence
    .map(
      (e) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e8ee;">` +
        `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a94a6;">` +
        `${e.source === "promoted" ? "Graduated evidence" : "New community evidence"}</div>` +
        `<div style="font-size:15px;font-weight:700;color:#0a0f1e;margin:2px 0;">${esc(e.headline)}</div>` +
        (e.summary ? `<div style="font-size:13px;color:#48526a;">${esc(e.summary)}</div>` : "") +
        `</td></tr>`
    )
    .join("");

  const coRows = digest.community
    .map(
      (c) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e8ee;">` +
        `<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a94a6;">` +
        `${c.source === "thread" ? "New discussion" : "New comment"}${c.link?.label ? " · " + esc(c.link.label) : ""}</div>` +
        `<div style="font-size:15px;font-weight:700;color:#0a0f1e;margin:2px 0;">${esc(c.title)}</div>` +
        (c.snippet ? `<div style="font-size:13px;color:#48526a;">${esc(c.snippet)}</div>` : "") +
        `</td></tr>`
    )
    .join("");

  const section = (title: string, rows: string) =>
    rows
      ? `<h2 style="font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#6b7686;margin:22px 0 4px;">${title}</h2>` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
      : "";

  const html =
    `<div style="max-width:560px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fff;padding:24px;">` +
    `<div style="font-size:20px;font-weight:800;color:#0a0f1e;">POLITI<span style="color:#c8102e;">DEX</span> · What Changed</div>` +
    `<p style="font-size:14px;color:#48526a;margin:8px 0 0;">${total} update${total === 1 ? "" : "s"} on the people and issues you're tracking.</p>` +
    section("New Evidence", evRows) +
    section("Community Discussion", coRows) +
    `<div style="margin-top:26px;text-align:center;">` +
    `<a href="${site}/#whats-changed" style="display:inline-block;background:#c8102e;color:#fff;text-decoration:none;font-weight:700;padding:11px 22px;border-radius:8px;font-size:14px;">Open my digest →</a>` +
    `</div>` +
    `<p style="font-size:12px;color:#8a94a6;margin-top:26px;line-height:1.5;">You're getting this because you turned on email digests in PolitiDex. ` +
    `Change the topics or cadence, or turn this off, in <a href="${site}/#whats-changed" style="color:#6b7686;">Notification settings</a>. ` +
    `PolitiDex is strictly nonpartisan — we send receipts, not opinions.</p>` +
    `</div>`;

  const text =
    `PolitiDex · What Changed\n${total} update(s) on what you're tracking.\n\n` +
    digest.evidence.map((e) => `• ${e.headline}`).join("\n") +
    (digest.community.length ? "\n" + digest.community.map((c) => `• ${c.title}`).join("\n") : "") +
    `\n\nOpen your digest: ${site}/#whats-changed`;

  return { subject: `PolitiDex · ${total} update${total === 1 ? "" : "s"} on what you track`, html, text };
}

// Send one email through the configured ESP. Returns true on success. Throws on a
// provider error so the caller can leave last_digest_at untouched and retry.
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM_EMAIL;
  if (!key || !from) return false; // unconfigured — caller treats as "not sent"

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ESP send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return true;
}

export default async (): Promise<Response> => {
  const emailConfigured = !!(process.env.RESEND_API_KEY && process.env.DIGEST_FROM_EMAIL);
  if (!emailConfigured) {
    console.log(
      "pdx-digest-cron: email delivery not configured (set RESEND_API_KEY + DIGEST_FROM_EMAIL to enable). Skipping."
    );
    return new Response("email-not-configured", { status: 200 });
  }

  // Only opted-in rows are candidates. This is a small table (one row per user who
  // touched notification settings), so a single scan is fine.
  const candidates = await db
    .select()
    .from(pdxNotificationPrefs)
    .where(eq(pdxNotificationPrefs.emailEnabled, true));

  let sent = 0;
  let skippedEmpty = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      if (!row.email) continue;
      if (!isDue(row.frequency, (row.lastDigestAt as Date) || null)) continue;

      const interests = await deriveInterests(row.userId);
      if (interests.politicianIds.length === 0 && interests.issueKeys.length === 0) continue;

      const since = row.lastDigestAt ? (row.lastDigestAt as Date).getTime() : 0;
      const built = await buildDigest(interests, since, {
        evidence: row.topicEvidence,
        community: row.topicCommunity,
      });
      if (built.counts.total === 0) {
        skippedEmpty++;
        continue; // nothing to say → send nothing (calm by design)
      }

      const { subject, html, text } = renderEmail(built);
      const ok = await sendEmail(row.email, subject, html, text);
      if (!ok) continue;

      await db
        .update(pdxNotificationPrefs)
        .set({ lastDigestAt: new Date(), updatedAt: new Date() })
        .where(eq(pdxNotificationPrefs.userId, row.userId));
      sent++;
    } catch (e: any) {
      failed++;
      console.error("pdx-digest-cron: send failed for a user:", e?.message || String(e));
      // Leave last_digest_at untouched so this user retries next run.
    }
  }

  console.log(`pdx-digest-cron done: sent=${sent} skippedEmpty=${skippedEmpty} failed=${failed}`);
  return new Response(JSON.stringify({ sent, skippedEmpty, failed }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

// Run once a day (13:00 UTC). Daily-cadence users receive it every run; weekly
// users receive it on the first run after their 6.5-day window elapses. Cadence
// gating lives in isDue(), so the schedule itself can stay simple.
export const config: Config = {
  schedule: "0 13 * * *",
};
