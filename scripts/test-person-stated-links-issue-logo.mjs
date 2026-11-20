#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-person-stated-links-issue-logo.mjs — stated rows open their issue file,
// related issues follow the stated list, and /i/ shows the PolitiDex mark
// ─────────────────────────────────────────────────────────────────────────────
//   1. ORDER: Word vs Action ends with the full ✒️ stated-positions list, and
//      🔗 related issues mount once, in the explore stage, directly under the
//      topic tree (v598; the full reading order is test-person-proof-flow's).
//   2. ROW LINKS: every stated-position row carries one link to its own issue
//      file — /i/<that row's key>, built by PDXIssueFamily.profileUrl with the
//      person as ?pid= — and the row's wording is byte-for-byte what it was
//      (the link is an empty overlay, so it adds no text). Without the address
//      module the rows render unlinked rather than guessing an address.
//   3. NO NESTED ANCHORS: the overlay link is a sibling of the row's wording, so
//      any source link inside the row is never inside another <a>.
//   4. ISSUE FILE LOGO: on the /i/ document (shell bar present) the issue file
//      panel's header starts with the PolitiDex mark — the same image the person
//      page header uses — linking home; the homepage overlay (no shell bar) does
//      not get one.
//   5. SHELL: the service worker version moved past v596.
//
//   node scripts/test-person-stated-links-issue-logo.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { buildCorpus } from "./vr-record-corpus.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");

let passed = 0;
const failures = [];
const ok = (cond, msg) => { if (cond) passed++; else failures.push(msg); };

// 1. order
// v598 moved related issues once more: Word vs Action (ending on the stated list)
// now reads ahead of 🌳 All Issues by Topic, and related issues mount directly
// under the tree in the explore stage. test-person-proof-flow.mjs owns the full
// reading order; this keeps the part of the old contract that still holds.
{
  const pf = R("profiles-full.js");
  const wa = pf.indexOf("window.PDXWordAction.sectionHtml(id, p)");
  const tree = pf.indexOf("window.PDXStanceTree.sectionHtml(id)");
  const ri = pf.indexOf("window.PDXRelatedIssues.sectionHtml(id, p)");
  ok(wa > 0 && ri > 0 && tree > 0, "the sections are mounted by profiles-full.js");
  ok(pf.indexOf("window.PDXRelatedIssues.sectionHtml(id, p)", ri + 1) < 0, "related issues is mounted exactly once");
  const stageOf = (i) => { const b = pf.lastIndexOf("<!--PDXSP:", i); return pf.slice(b, pf.indexOf("-->", b) + 3); };
  ok(stageOf(wa) === "<!--PDXSP:verdict-->", "Word vs Action is in the verdict stage");
  ok(stageOf(ri) === "<!--PDXSP:explore-->" && ri > tree, "related issues is in the explore stage, after the tree");
  const between = pf.slice(tree, ri).replace(/<!--[\s\S]*?-->/g, "");
  ok((between.match(/\$\{/g) || []).length === 1, "no other section is mounted between the tree and related issues");
  const w = R("word-action.js");
  ok(/return html \+ statedListHtml\(pid\);/.test(w), "Word vs Action's section ends with the full stated-positions list");
}

// 2 + 3. row links, on real data
const FILES = [
  "cmp-data.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js",
  "exec-record.js", "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js",
  "profile-spine.js", "profiles-full.js",
];
const corpus = buildCorpus(ROOT);
function boot(withFamily) {
  const win = makeSandbox();
  const ctx = vm.createContext(win);
  win.PROFILES = win.CMP_DATA;
  const files = withFamily ? ["person-link.js", "pdx-issue-family.js", ...FILES] : FILES;
  for (const f of files) {
    try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { win.__err = `${f}: ${e.message}`; }
  }
  win.PROFILES = win.CMP_DATA;
  for (const [pid, recs] of corpus.byMember) {
    try { win.PDXVotingRecord.noteMember(pid, recs); } catch { /* not a member */ }
  }
  return win;
}
const rowsOf = (h) => [...String(h).matchAll(/<li class="pdxwa-stated-row"[^>]*>([\s\S]*?)<\/li>/g)];
const textOf = (h) => String(h).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
{
  const W = boot(true);
  ok(!W.__err, `boot: ${W.__err}`);
  const WA = W.PDXWordAction;
  const F = W.PDXIssueFamily;
  ok(WA && typeof WA.statedListHtml === "function", "statedListHtml is published");
  ok(F && typeof F.profileUrl === "function", "PDXIssueFamily.profileUrl is on the page");
  const bare = boot(false);
  let swept = 0, rowsSeen = 0;
  for (const pid of Object.keys(W.CMP_DATA || {})) {
    let html = "";
    try { html = WA.statedListHtml(pid) || ""; } catch { html = ""; }
    if (!html) continue;
    swept++;
    const plain = bare.PDXWordAction.statedListHtml(pid) || "";
    ok(!/pdxwa-stated-go/.test(plain), `${pid}: rows render unlinked when the address module is absent`);
    ok(textOf(html) === textOf(plain), `${pid}: the stated list's wording changed`);
    for (const m of rowsOf(html)) {
      rowsSeen++;
      const li = m[0];
      const key = (/data-pdxwa-stated="([^"]+)"/.exec(li) || [])[1];
      const links = [...li.matchAll(/<a class="pdxwa-stated-go" href="([^"]+)" data-pdxwa-stated-file="([^"]+)"/g)];
      ok(links.length === 1, `${pid}/${key}: row carries exactly one issue-file link`);
      if (!links.length) continue;
      const href = links[0][1].replace(/&amp;/g, "&");
      ok(href === F.profileUrl(key, pid), `${pid}/${key}: row opens ${href}, not its own issue file ${F.profileUrl(key, pid)}`);
      ok(href.startsWith("/i/" + encodeURIComponent(key)), `${pid}/${key}: link is not the /i/ issue file`);
      ok(links[0][2] === key, `${pid}/${key}: link names a different key`);
      ok(/data-pdxwa-stated-go="1"/.test(li), `${pid}/${key}: linked row is not marked clickable`);
      // 3. the overlay anchor is closed before anything else in the row opens.
      ok(/<a class="pdxwa-stated-go"[^>]*><\/a>/.test(li), `${pid}/${key}: overlay link wraps row content (nested anchors)`);
    }
    if (swept >= 60) break;
  }
  ok(swept > 5 && rowsSeen > 20, `sweep too thin: ${swept} profiles, ${rowsSeen} rows`);
  const css = R("word-action.css");
  ok(/\.pdxwa-stated-go\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0/.test(css), "overlay link covers the whole row");
  ok(/\.pdxwa-stated-row\[data-pdxwa-stated-go\][^{]*a:not\(\.pdxwa-stated-go\)[^{]*\{[^}]*z-index:\s*2/.test(css),
    "inner source links stay above the overlay");
}

// 4. issue file logo
function issueDom(withBar) {
  const win = makeSandbox();
  const byId = {};
  const mk = (id) => {
    const n = {
      id: id || "", className: "", innerHTML: "", style: {}, children: [], hidden: false, attrs: {},
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      removeAttribute(k) { delete this.attrs[k]; },
      addEventListener() {}, removeEventListener() {}, focus() {}, scrollTo() {},
      appendChild(c) { this.children.push(c); c.parentNode = this; if (c.id) byId[c.id] = c; (c.children || []).forEach(reg); return c; },
      insertBefore(c, ref) {
        const i = this.children.indexOf(ref);
        if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
        c.parentNode = this; if (c.id) byId[c.id] = c; (c.children || []).forEach(reg); return c;
      },
      querySelector() { return null; }, querySelectorAll() { return []; },
    };
    if (id) byId[id] = n;
    return n;
  };
  const reg = (c) => { if (c.id) byId[c.id] = c; (c.children || []).forEach(reg); };
  win.document.createElement = () => mk("");
  win.document.getElementById = (id) => byId[id] || null;
  win.document.body = mk("body");
  const bar = mk("");
  win.document.querySelector = (sel) => (withBar && sel === ".pdx-issue-bar" ? bar : null);
  win.PDXIssueProfile = { html: () => '<div class="d1-scope">ledger</div>' };
  const ctx = vm.createContext(win);
  vm.runInContext(R("issue-file.js"), ctx, { filename: "issue-file.js" });
  const opened = win.PDXIssueFile.open("lands_preserve");
  const overlay = byId[win.PDXIssueFile.ID];
  const top = overlay && overlay.children[0] && overlay.children[0].children[0];
  return { opened, top };
}
{
  const { opened, top } = issueDom(true);
  ok(opened, "issue file opens in the harness");
  ok(top && top.className === "pdxif-top", "panel header found");
  const first = top && top.children[0];
  ok(first && first.className === "pdxif-brand", "/i/ panel header starts with the PolitiDex mark (top-left)");
  ok(first && first.attrs.href === "/" && first.attrs["aria-label"] === "PolitiDex home", "the mark links home");
  const personMark = (/class="pdx-person-wordmark"[^>]*><img src="([^"]+)"/.exec(R("person.html")) || [])[1];
  ok(personMark && first && first.innerHTML.includes(`src="${personMark}"`) && /alt="PolitiDex"/.test(first.innerHTML),
    "same logo image the person page header uses");
  ok(top && top.children[1] && top.children[1].className === "pdxif-id", "the issue identity follows the mark");
  const css = R("issue-file.css");
  ok(/\.pdxif-brand img\s*\{[^}]*width:\s*2rem[^}]*height:\s*2rem/.test(css), "the mark is the 2rem header size");

  const home = issueDom(false);
  ok(home.top && !home.top.children.some((c) => c.className === "pdxif-brand"), "homepage overlay (no shell bar) is unchanged");
  ok(R("issue.html").includes('class="pdx-issue-bar"'), "issue.html carries the shell bar the gate reads");
}

// 5. shell
{
  const v = Number((R("sw.js").match(/const CACHE_VERSION = 'v(\d+)'/) || [])[1]);
  ok(v > 596, "service worker shell version bumped");
}

if (failures.length) {
  console.error(`\n✗ person stated links / issue logo: ${failures.length} failure(s)\n  - ` + failures.slice(0, 40).join("\n  - "));
  process.exit(1);
}
console.log(`✓ person stated links / issue logo: all ${passed} assertions passed`);
