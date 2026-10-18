#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-ballot-measures.mjs — the Utah 2026 ballot-question pages
// ─────────────────────────────────────────────────────────────────────────────
// /ballot/ut-amendment-a and /ballot/ut-amendment-b are record pages, not a
// forum. This suite pins what each must say and what neither may carry:
//
//   1. THE RECORD. Each page has the official question word for word, a Yes
//      line and a No line, the text change, the sponsors, the House and Senate
//      votes, and a "What each side says" block with a for and an against side.
//   2. AMENDMENT A'S EMPTY SIDE. Its against side states that no organized
//      opposition is on file, and carries no argument.
//   3. NOTHING TO TYPE INTO, NO GATE, NO MONEY. No form, textarea, composer,
//      residency module or script of any kind; no equity, stock, membership or
//      "earn a share" language.
//   4. THE HALLWAY. One "Discuss in your district room." line pointing at /voice.
//   5. THE ADDRESSES. Six exact 200 rewrites, no /ballot/* splat, the desk's
//      two rules untouched; both documents precached, the shell version moved,
//      and each path's offline fallback is its own document.
//
//   node scripts/test-ballot-measures.mjs
//
// No database, no network, no browser. Exit code is non-zero on any failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };

// What a reader sees: comments and tags gone, entities folded, whitespace collapsed.
const visible = (html) => html
  .replace(/<!--[\s\S]*?-->/g, " ")
  .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&rsquo;/g, "'").replace(/&ndash;/g, "–")
  .replace(/&mdash;/g, "—").replace(/&middot;/g, "·").replace(/&hellip;/g, "…")
  .replace(/&amp;/g, "&").replace(/&[a-z]+;/g, " ")
  .replace(/\s+/g, " ");
// One marked block's inner HTML, by its data-pdxbm value.
const block = (html, key) => {
  const open = new RegExp(`<(\\w+)[^>]*data-pdxbm="${key}"[^>]*>`).exec(html);
  if (!open) return "";
  const tag = open[1];
  let depth = 1, i = open.index + open[0].length;
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
  re.lastIndex = i;
  for (let m; (m = re.exec(html));) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(i, m.index);
  }
  return "";
};

const PAGES = {
  "ut-amendment-a": {
    file: "ballot-ut-amendment-a.html",
    question: "Shall the Utah Constitution be amended to change how proposed constitutional amendments are published, requiring publication for 60 days immediately before the general election in a manner established by state law instead of in newspapers?",
    yes: [/A Yes vote/, /60 calendar days/, /newspaper in every county/, /H\.B\. 481/, /Utah Public Notice Website/, /Lieutenant Governor/],
    no: [/A No vote/, /leaves the existing requirement in place/, /newspaper/],
    del: "in at least one newspaper in every county of the state, where a newspaper is published, for two months",
    ins: ", in a manner provided by statute, for 60 calendar days",
    sponsors: [/Anthony E\. Loubet/, /Daniel McCay/],
    house: /70–0/, senate: /29–0/,
  },
  "ut-amendment-b": {
    file: "ballot-ut-amendment-b.html",
    question: "Shall the Utah Constitution be amended to require that citizen-proposed laws that increase taxes compared to existing law be approved by at least 60% of voters, instead of a simple majority?",
    yes: [/A Yes vote/, /after November 1, 2026/, /at least 60%/, /new tax/, /expands an existing tax/, /increases an existing tax rate/, /property tax rate/, /only spend money/, /passed by the Legislature/],
    no: [/A No vote/, /simple-majority rule in place/],
    del: null,
    ins: "shall be adopted upon approval of at least 60% of those voting on the legislation",
    sponsors: [/Lincoln Fillmore/, /Jason B\. Kyle/],
    house: /55–17/, senate: /21–8/,
  },
};

// Words that would make a record page a money or membership surface.
const EQUITY = [/\bequity\b/i, /\bstocks?\b/i, /\bmembership\b/i, /earn a share/i, /\bshares?\b/i, /\bdividends?\b/i];

for (const [slug, P] of Object.entries(PAGES)) {
  ok(existsSync(join(ROOT, P.file)), `${P.file} exists`);
  if (!existsSync(join(ROOT, P.file))) continue;
  const html = read(P.file);
  const body = html.slice(html.indexOf("<body"));
  const txt = visible(body);

  // ── 1. The record ──────────────────────────────────────────────────────────
  ok(visible(block(html, "question")).includes(`"${P.question}"`), `${slug}: the official question is quoted word for word`);
  const yes = visible(block(html, "yes")), no = visible(block(html, "no"));
  for (const re of P.yes) ok(re.test(yes), `${slug}: the Yes line says ${re}`);
  for (const re of P.no) ok(re.test(no), `${slug}: the No line says ${re}`);
  const tc = block(html, "text-change");
  if (P.del) ok(visible((tc.match(/<del>([\s\S]*?)<\/del>/) || [])[1] || "").trim() === P.del, `${slug}: the struck text is the enrolled text`);
  ok(visible(tc.match(/<ins>[\s\S]*?<\/ins>/g)?.join(" ") || "").includes(P.ins), `${slug}: the inserted text is the enrolled text`);
  const sp = visible(block(html, "sponsors"));
  for (const re of P.sponsors) ok(re.test(sp), `${slug}: sponsors name ${re}`);
  ok(P.house.test(visible(block(html, "house-vote"))), `${slug}: the House vote is recorded as ${P.house}`);
  ok(P.senate.test(visible(block(html, "senate-vote"))), `${slug}: the Senate vote is recorded as ${P.senate}`);
  ok(/What each side says/.test(txt), `${slug}: has the "What each side says" block`);
  ok(/<h3 class="pdxbm-h3">For<\/h3>/.test(block(html, "for")), `${slug}: has a side labelled For`);
  ok(/<h3 class="pdxbm-h3">Against<\/h3>/.test(block(html, "against")), `${slug}: has a side labelled Against`);
  ok(/Background/.test(txt), `${slug}: has a background section`);
  ok(/le\.utah\.gov\//.test(body) && /vote\.utah\.gov/.test(body), `${slug}: links the Utah Legislature and the voter pamphlet`);
  ok(new RegExp(`<link rel="canonical" href="https://politidex\\.fyi/ballot/${slug}"`).test(html), `${slug}: canonical is its own address`);

  // ── 3. Nothing to type into, no gate, no money ─────────────────────────────
  ok(!/<(form|textarea|input|select|button)\b/i.test(body), `${slug}: no form control of any kind`);
  ok(!/<script\b/i.test(html), `${slug}: no script — no composer, no poll, no residency gate`);
  for (const f of ["district-composer.js", "district-poll.js", "district-voice.js", "voice-room.js", "voter-hub-location.js"]) {
    ok(!html.includes(f), `${slug}: does not load ${f}`);
  }
  for (const re of EQUITY) ok(!re.test(html), `${slug}: no equity/membership language (${re})`);
  // Root-absolute same-origin paths only: the document is also served at the slash form.
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    ok(/^(https?:)?\/\//.test(u) || u.startsWith("/") || u.startsWith("#"), `${slug}: "${u}" is root-absolute`);
  }

  // ── 4. The hallway ─────────────────────────────────────────────────────────
  const hall = block(html, "hallway");
  ok(/<a class="pdxhv-door" href="\/voice">Discuss in your district room\.<\/a>/.test(hall), `${slug}: the District Voice hallway line is present`);
  ok((txt.match(/Discuss in your district room/g) || []).length === 1, `${slug}: the hallway line appears once`);
}

// ── 2. Amendment A's against side ────────────────────────────────────────────
{
  const html = read(PAGES["ut-amendment-a"].file);
  const against = block(html, "against");
  ok(/No organized opposition campaign is on file/.test(visible(against)), "ut-amendment-a: against side states no organized opposition is on file");
  ok(!/<blockquote\b/.test(against) && !/<li\b/.test(against), "ut-amendment-a: against side stays empty — no argument quoted or listed");
  ok(/unanimous/.test(visible(html.slice(html.indexOf("<body")))), "ut-amendment-a: notes it passed the legislature unanimously");
}
// Amendment B's against side draws on the pamphlet and the named committee.
{
  const against = visible(block(read(PAGES["ut-amendment-b"].file), "against"));
  ok(/Escamilla/.test(against) && /Romero/.test(against), "ut-amendment-b: against side cites the pamphlet's named authors");
  ok(/Utahns Protecting Our Constitution/.test(against), "ut-amendment-b: against side names the opposing committee");
}

// ── 5. The addresses ─────────────────────────────────────────────────────────
const toml = read("netlify.toml");
const RULES = [...toml.matchAll(/^\[\[redirects\]\]\s*\n((?:^[ \t]{2}\S.*\n)+)/gm)].map((m) => {
  const field = (k) => (m[1].match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, "m")) || [])[1];
  return { from: field("from"), to: field("to"), status: field("status") };
});
const resolve = (path) => {
  for (const r of RULES) {
    if (!r.from) continue;
    if (r.from.endsWith("/*")) { if (path.startsWith(r.from.slice(0, -1))) return r; }
    else if (r.from === path) return r;
  }
  return null;
};
for (const [slug, P] of Object.entries(PAGES)) {
  for (const addr of [`/ballot/${slug}`, `/ballot/${slug}/`, `/ballot/${slug}.html`]) {
    const hit = resolve(addr);
    ok(hit && hit.to === `/${P.file}` && String(hit.status) === "200", `rewrite: ${addr} → /${P.file} at 200 (got ${hit ? hit.to + " " + hit.status : "none"})`);
  }
}
ok(!RULES.some((r) => r.from && /^\/ballot/.test(r.from) && r.from.includes("*")), "rewrite: no /ballot/* splat");
for (const addr of ["/ballot", "/ballot/"]) ok(resolve(addr)?.to === "/ballot.html", `rewrite: ${addr} is still the desk`);
for (const addr of ["/ballot/senate", "/ballot/ut-amendment-c"]) ok(!resolve(addr), `rewrite: ${addr} matches no rule`);

const sw = read("sw.js");
for (const f of ["/ballot-ut-amendment-a.html", "/ballot-ut-amendment-b.html", "/ballot-measure.css"]) {
  ok(sw.includes(`  '${f}',`), `sw: ${f} is precached`);
}
const ver = (sw.match(/const CACHE_VERSION = 'v(\d+)';/) || [])[1];
ok(Number(ver) >= 400, `sw: CACHE_VERSION moved for the new precached documents (v${ver})`);
const reSrc = (sw.match(/const BALLOT_MEASURE_NAV_RE = (\/[^;]*\/);/) || [])[1];
ok(!!reSrc, "sw: BALLOT_MEASURE_NAV_RE is declared");
if (reSrc) {
  const rx = new RegExp(reSrc.slice(1, reSrc.lastIndexOf("/")));
  for (const slug of Object.keys(PAGES)) {
    for (const p of [`/ballot/${slug}`, `/ballot/${slug}/`, `/ballot/${slug}.html`]) ok(rx.test(p), `sw: nav regex matches ${p}`);
  }
  for (const p of ["/ballot", "/ballot/", "/ballot/senate", "/ballot/ut-amendment-a/x"]) ok(!rx.test(p), `sw: nav regex does not match ${p}`);
  const old = (sw.match(/const BALLOT_NAV_RE = (\/[^;]*\/);/) || [])[1];
  if (old) {
    const brx = new RegExp(old.slice(1, old.lastIndexOf("/")));
    ok(!brx.test("/ballot/ut-amendment-a"), "sw: the desk's BALLOT_NAV_RE does not claim a ballot-question page");
  }
}
ok(/'ut-amendment-a': '\/ballot-ut-amendment-a\.html'/.test(sw) && /'ut-amendment-b': '\/ballot-ut-amendment-b\.html'/.test(sw),
  "sw: each ballot-question path falls back offline to its own document");

ok(/<loc>https:\/\/politidex\.fyi\/ballot\/ut-amendment-a<\/loc>/.test(read("sitemap.xml")) &&
   /<loc>https:\/\/politidex\.fyi\/ballot\/ut-amendment-b<\/loc>/.test(read("sitemap.xml")),
  "sitemap: both ballot-question pages are listed");

// ── Report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`✖ ${failures.length} failure(s), ${passed} passed\n`);
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log(`✓ ${passed} assertions passed — /ballot/ut-amendment-a and /ballot/ut-amendment-b are the record, not a forum`);
