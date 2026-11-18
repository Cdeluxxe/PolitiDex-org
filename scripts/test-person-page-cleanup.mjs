// Person-page cleanup: the Activity badge's freshness, the weaker-signals
// block collapsed by topic, and the readable-text gate on weak / mention
// excerpts (strong stances are stored and shown exactly as before).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  cleanReadableText, lockerStrength, buildLockerItem, readableWeakerItem,
} from "../netlify/lib/evidence-locker-core.mjs";

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log("  ✓ " + name); };

const PDF = "%PDF-1.4 1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj stream x\u009cåÿØ� endstream endobj";
const CLEAN = "I will fight to lower health care costs for every family in Texas.";

// ── 3 · readable-text gate ─────────────────────────────────────────────────
t("clean text passes through unchanged", () => assert.equal(cleanReadableText(CLEAN), CLEAN));
t("PDF stream / binary junk cleans to nothing", () => {
  assert.equal(cleanReadableText(PDF), "");
  assert.equal(cleanReadableText("��\u0001 ÿØÿà JFIF xK9qZ2pL0"), "");
});
t("readable text around junk survives; the junk does not", () => {
  const out = cleanReadableText("We will protect Medicare and Social Security. �\u0003 x\u009cÿ endstream We will keep fighting for affordable insulin.");
  assert.match(out, /protect Medicare and Social Security/);
  assert.match(out, /affordable insulin/);
  assert.doesNotMatch(out, /endstream|ÿ|�/);
});
t("ordinary words like 'stream' and accented names are kept", () => {
  const s = "The revenue stream from tolls should fund our roads. Señor Martínez agrees.";
  assert.equal(cleanReadableText(s), s);
});

const cand = (position, confidence, excerpt) => ({
  politician_id: "doe_j", topic: "healthcare_costs", position, confidence,
  sources: [{ excerpt, statements: [{}], link: "https://example.gov/a", type: "official" }],
});
t("a mention whose excerpt is junk is not written", () => {
  assert.equal(lockerStrength(cand("no clear position", 0.1, PDF)).strength, null);
  assert.equal(lockerStrength(cand("no clear position", 0.1, CLEAN)).strength, "mention");
});
t("a weak signal whose excerpt is junk is not written", () => {
  assert.equal(lockerStrength(cand("support", 0.5, PDF)).strength, null);
  assert.equal(lockerStrength(cand("support", 0.5, CLEAN)).strength, "weak");
});
t("strong stances are untouched by the gate", () => {
  assert.equal(lockerStrength(cand("support", 0.9, PDF)).strength, "strong");
  const item = buildLockerItem(cand("support", 0.9, CLEAN + " ÿØ"), { url: "https://example.gov/a" }, "strong");
  assert.equal(item.excerpt, CLEAN + " ÿØ");
  assert.equal(readableWeakerItem({ position: "support", confidence: 0.9, excerpt: PDF }).excerpt, PDF);
});
t("stored weaker items are cleaned or dropped when served", () => {
  assert.equal(readableWeakerItem({ position: "mixed", strength: "mention", excerpt: PDF }), null);
  const kept = readableWeakerItem({ position: "mixed", strength: "mention", excerpt: CLEAN + " �� x\u009c" });
  assert.equal(kept.excerpt, CLEAN);
});

// ── Browser module: same gate, and the topic-collapsed block ───────────────
const ctx = { console, Date, Object, Array, String, JSON, Math, RegExp, isFinite, CustomEvent: function () {} };
ctx.window = ctx;
ctx.document = { addEventListener() {}, dispatchEvent() {}, getElementById() { return null; } };
ctx.addEventListener = () => {}; ctx.dispatchEvent = () => {};
ctx.CORE_NATIONAL_ISSUES = [{ key: "healthcare", label: "🏥 Healthcare Costs & Access" }, { key: "guns", label: "🔫 Gun Rights & Gun Control" }];
ctx.coreIssueForKey = (k) => (k === "healthcare_costs" ? { key: "healthcare" } : k === "gun_safety" ? { key: "guns" } : null);
ctx.PDXIssueColors = { styleFor: (k) => k ? `--pdx-ic:${k}` : "--pdx-ic:#94A3B8", isCore: (k) => !!k };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../profile-locker.js", import.meta.url), "utf8"), ctx);
const L = ctx.PDXProfileLocker;
const entry = (issueKey, position, confidence, excerpt, n, captured = "2026-11-02") => ({
  headline: `Doe ${n}`, issueKey, source: { url: `https://example.gov/${n}`, label: "Official page" },
  date: "Nov 2, 2026", pipeline: { position, confidence, excerpt, captured },
});
L.ingest({ items: { doe_j: [
  entry("healthcare_costs", "no clear position", 0.1, "Health care mention one about costs here.", 1),
  entry("healthcare_costs", "support", 0.5, "We support lower drug prices for seniors.", 2),
  entry("healthcare_costs", "no clear position", 0.1, PDF, 3),
  entry("gun_safety", "no clear position", 0.1, "A mention of gun safety at the town hall.", 4, "2026-11-15"),
] } });
t("the browser drops a junk-only mention before it is shown", () => {
  assert.equal(L.items("doe_j").length, 3);
  assert.equal(L.cleanReadableText(PDF), cleanReadableText(PDF));
});
t("weaker signals are grouped by topic, collapsed, with colour, icon and a count", () => {
  const h = L.evdWeakHtml("doe_j", [], {});
  assert.match(h, /data-evd-weak-topic="healthcare"[^>]*data-pdxtree-open="0"/);
  assert.match(h, /data-evd-weak-topic="guns"/);
  assert.match(h, /🏥 Healthcare Costs &amp; Access/);
  assert.match(h, /--pdx-ic:healthcare/);
  assert.match(h, /1 weak signal · 1 mention/);
  assert.match(h, /1 mention</);
  assert.equal((h.match(/aria-expanded="false"/g) || []).length, 2);
  assert.equal((h.match(/class="pdxtree-panel evd-weak-panel"[^>]* hidden/g) || []).length, 2);
});
t("the Activity hook sees every Locker item's capture date", () => {
  assert.deepEqual([...ctx._pdxLockerItemDates("doe_j")].sort(), ["2026-11-02", "2026-11-02", "2026-11-15"]);
});

// ── 1 · relative time never says "months ago" inside the current month ─────
{
  const src = readFileSync(new URL("../profiles-full.js", import.meta.url), "utf8");
  const a = src.indexOf("window._pdxRelTime = function");
  const b = src.indexOf("};", a) + 2;
  const w = {};
  new Function("window", src.slice(a, b))(w);
  t("same-month evidence never reads as months ago", () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 1);
    assert.doesNotMatch(w._pdxRelTime(first.getTime()), /mo ago|y ago/);
    assert.equal(w._pdxRelTime(Date.now() - 2 * 864e5), "2d ago");
    assert.equal(w._pdxRelTime(Date.now() - 45 * 864e5), "1mo ago");
  });
}

console.log(`✓ ${passed} person-page cleanup checks passed`);
