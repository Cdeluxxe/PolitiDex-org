#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// SHARE PIPELINE RELIABILITY — every visible Share control produces a real artifact
// ─────────────────────────────────────────────────────────────────────────────
// Three failures were reported from the live app, and all three shared one shape:
// a control that reported success and delivered nothing.
//
//   1. ZERO-LENGTH FILE. Two emitters can ship an empty artifact and neither
//      browser API complains. `canvas.toBlob` hands back a zero-byte Blob when the
//      draw failed; that Blob is truthy, `new File([blob])` wraps it, and the iOS
//      share sheet — including its "Save to Files" and "Print to PDF"
//      destinations — writes exactly what it was handed. The desktop twin is
//      `<a download href="data:image/png;base64,">`, twenty-two characters of
//      pure nothing that saves as a 0-byte file. Both call sites now go through
//      one guard, and the guard is a floor in BYTES: a PNG cannot be shorter than
//      its own signature.
//
//   2. DEAD LINK. The person-level share control is mounted inside issue dossiers,
//      where it knows the issue — and it threw the issue away, emitting the bare
//      person-file address.
//      A reader following a share taken from Scalise / Secure & Accessible Voting
//      landed on the profile shell with no way to tell which of nineteen issues had
//      been sent. The app already had the address (#record=<pid>~<issue>, in
//      server-visible form as /?record=…); nothing needed inventing, only wiring.
//      Compounding it, the profile URL was built from location.pathname, so a share
//      taken while the reader sat on /vote/119/house/12 carried that path along.
//
//   3. SILENT NO-OP. Six surfaces called navigator.share().catch(function(){}).
//      That swallows the reader cancelling — correct — and equally swallows
//      NotAllowedError, a refused payload, and a target that failed mid-flight.
//      At the call site those are indistinguishable from success, so the button
//      did nothing and said nothing. Only AbortError is a cancellation.
//
// Sections 1–3 test the shared primitives in share-links.js. Section 4 tests the
// issue-scoped fallback in share-anywhere.js against a live sandbox. Section 5 is
// a source-level sweep over every share emitter in the app, because a guard that
// one of six call sites forgot to adopt is not a guard. Section 6 pins the parts
// that must NOT have moved: no scoring, no lane blending, no invented receipts.
//
//   node scripts/test-share-pipeline.mjs
//
// No database, no network, no browser. Exit code is non-zero on the first failure.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
let passed = 0;
const ok = (cond, msg) => { cond ? passed++ : failures.push(msg); };
// A harness that has drifted from the module it tests reports "all green" for the
// wrong reason. must() ends the run instead, with exit code 2, so a stale fixture
// can never be mistaken for a passing pipeline.
const must = (cond, msg) => {
  if (cond) return;
  console.error("\n✖ HARNESS STALE — " + msg + "\n");
  process.exit(2);
};

const strip = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ── A DOM small enough to reason about ───────────────────────────────────────
function mkEl(tag) {
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    _attr: {}, _cls: new Set(),
    style: {}, textContent: "", innerHTML: "", value: "", href: "", download: "",
    children: [], parentNode: null,
    classList: {
      add: (...c) => c.forEach((x) => el._cls.add(x)),
      remove: (...c) => c.forEach((x) => el._cls.delete(x)),
      contains: (x) => el._cls.has(x),
    },
    setAttribute: (k, v) => { el._attr[k] = String(v); },
    getAttribute: (k) => (k in el._attr ? el._attr[k] : null),
    removeAttribute: (k) => { delete el._attr[k]; },
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); return c; },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    closest: () => null,
    click() { el._clicked = (el._clicked || 0) + 1; },
  };
  return el;
}

function mkSandbox(over) {
  const byId = {};
  const ctx = {
    console,
    document: {
      readyState: "complete",
      head: mkEl(), body: mkEl(), documentElement: mkEl(),
      createElement: (t) => mkEl(t),
      getElementById: (id) => byId[id] || null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {},
    },
    location: { href: "https://politidex.fyi/", origin: "https://politidex.fyi",
                pathname: "/", search: "", hash: "" },
    history: { state: null, replaceState() {} },
    navigator: {},
    URLSearchParams, URL, Blob,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    JSON, Math, Date, Promise, Object, Array, String, Number, Boolean, isFinite,
    encodeURIComponent, decodeURIComponent,
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = () => {};
  ctx.dispatchEvent = () => true;
  ctx._byId = byId;
  Object.assign(ctx, over || {});
  vm.createContext(ctx);
  return ctx;
}

const SL_SRC = read("share-links.js");
const linksCtx = mkSandbox();
new vm.Script(SL_SRC, { filename: "share-links.js" }).runInContext(linksCtx);
const SL = linksCtx.window.PDXShareLinks;

must(SL, "share-links.js did not register window.PDXShareLinks");
must(typeof SL.blobOk === "function" && typeof SL.native === "function" &&
     typeof SL.forTarget === "function" && typeof SL.profile === "function",
     "share-links.js is missing the reliability primitives this file tests " +
     "(profile / forTarget / blobOk / native)");

const run = async () => {

// ═════════════════════════════════════════════════════════════════════════════
// 1 · LINK SHARES RESOLVE
// ─────────────────────────────────────────────────────────────────────────────
// A share link has one job: open the thing the reader was looking at. Two ways
// it used to fail — it inherited an address that meant something else, and it
// dropped the issue that made it specific.
// ═════════════════════════════════════════════════════════════════════════════
{
  // ── The pathname bug, reproduced ──────────────────────────────────────────
  // Same module, same call, from a reader sitting on a /vote/ address. The old
  // builder was `location.origin + location.pathname + '?p='`, which produced
  // https://politidex.fyi/vote/119/house/12?p=scalise — an address whose PATH
  // still claims to be a roll call, so share-links' own voteFallback puts a
  // "we couldn't open that roll call" notice on top of the arriving profile.
  const onVote = mkSandbox({
    location: { href: "https://politidex.fyi/vote/119/house/12", origin: "https://politidex.fyi",
                pathname: "/vote/119/house/12", search: "", hash: "" },
  });
  new vm.Script(SL_SRC, { filename: "share-links.js" }).runInContext(onVote);
  const away = onVote.window.PDXShareLinks;
  must(away, "the /vote/ sandbox did not register PDXShareLinks");

  ok(away.profile("scalise") === "https://politidex.fyi/p/scalise",
     "link: a profile link is rooted at '/' even when built from a /vote/ page — the address must name the profile, not the page the reader happened to be on");
  // The shape moved from ?p=<pid> to /p/<pid> in the product-spine pass, so a
  // shared person link and the canonical link for the same person are now the
  // same string (netlify/lib/share-target.ts canonicalPath). The old query form
  // still ARRIVES — _pdxOpenFromUrl and parseTarget both still read it — it is
  // simply no longer what we hand out.
  ok(!/\?p=/.test(away.profile("scalise")),
     "link: the person-file share link is the path form, not the query form it used to be");
  ok(away.profile("scalise").indexOf("/vote/") === -1,
     "link: no share link carries the /vote/ path it was built on, which is what made the arrival apologise for a roll call nobody asked about");
  ok(away.record("scalise", "voting_rights").indexOf("/vote/") === -1,
     "link: the same is true of an issue link");

  ok(SL.profile("") === "", "link: no pid means no link rather than a link to the front page dressed up as a profile");

  // ── The issue link, which is the whole dossier fix ────────────────────────
  const dossier = SL.forTarget({ pid: "scalise", issueKey: "voting_rights" });
  ok(dossier === "https://politidex.fyi/?record=scalise~voting_rights",
     "link: a share from inside an issue dossier emits the ?record= form, which opens the Official Record for that issue");
  ok(dossier === SL.record("scalise", "voting_rights"),
     "link: forTarget does not invent a parallel scheme — it returns the existing record() link");
  ok(SL.forTarget({ pid: "jayapal", issueKey: "healthcare" })
       === "https://politidex.fyi/?record=jayapal~healthcare",
     "link: the same holds for any (member, issue) pair, not just the reported one");
  ok(SL.forTarget({ pid: "scalise" }) === "https://politidex.fyi/p/scalise",
     "link: with no issue in play the target is the profile, unchanged");
  ok(SL.forTarget({ pid: "scalise" }) === SL.profile("scalise"),
     "link: forTarget does not invent a second person-file address either");
  ok(SL.forTarget({}) === "" && SL.forTarget() === "",
     "link: an unreconstructable target returns nothing, so a caller cannot ship a link to the front page and call it a share");

  // ── The round trip: the query form must rebuild the app's own hash ────────
  ok(SL._hashFor("record", "scalise~voting_rights") === "#record=scalise~voting_rights",
     "arrival: ?record=scalise~voting_rights converts back to the #record= hash the app already opens");
  ok(SL._hashFor("record", "") === "" && SL._hashFor("record", "~voting_rights") === "",
     "arrival: a record link with no pid opens nothing rather than opening the wrong thing");

  // And the arrival actually fires, rather than the parser merely agreeing.
  const arrive = mkSandbox({
    location: { href: "https://politidex.fyi/?record=scalise~voting_rights",
                origin: "https://politidex.fyi", pathname: "/",
                search: "?record=scalise~voting_rights", hash: "" },
  });
  const written = [];
  arrive.history = { state: null, replaceState(s, t, url) { written.push(url); arrive.location.hash = "#record=scalise~voting_rights"; } };
  new vm.Script(SL_SRC, { filename: "share-links.js" }).runInContext(arrive);
  ok(written.length === 1 && /#record=scalise~voting_rights$/.test(written[0]),
     "arrival: landing on the shared link puts the dossier hash in place on its own — the reader does not have to tap anything to reach the surface they were sent");
  ok(written[0].indexOf("?record=") === -1,
     "arrival: the consumed query param is stripped, so the URL settles into the canonical hash form the rest of the app reads");
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · NO EMPTY ARTIFACT MAY LEAVE THE APP
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = (n) => ({ size: n, type: "image/png" });

  ok(SL.blobOk(B(0)) === false,
     "empty: a zero-byte Blob is rejected — this is the literal 'zero length file' the share sheet was handing to Save to Files and Print to PDF");
  ok(SL.blobOk(null) === false && SL.blobOk(undefined) === false,
     "empty: a missing Blob is rejected rather than throwing on .size");
  ok(SL.blobOk({}) === false && SL.blobOk({ size: "big" }) === false && SL.blobOk({ size: NaN }) === false,
     "empty: a Blob-shaped object with no usable size is rejected — 'truthy' was the whole bug");
  ok(SL.blobOk(B(8)) === false,
     "empty: eight bytes is a PNG signature with no image behind it, so it is not an image");
  ok(SL.blobOk(B(64)) === true && SL.blobOk(B(180000)) === true,
     "empty: a real card passes — the guard rejects nothing that could open");
  ok(SL.MIN_ARTIFACT_BYTES >= 8,
     "empty: the floor is at least a PNG signature, so the rule is about bytes rather than about a magic number");

  // The desktop twin: <a download> writes whatever the href resolves to.
  ok(SL.dataUrlOk("data:image/png;base64,") === false,
     "empty: an empty data URL is rejected — it downloads as a 0-byte file with no error anywhere");
  ok(SL.dataUrlOk("data:,") === false, "empty: the degenerate data URL is rejected");
  ok(SL.dataUrlOk("data:image/png;base64,AAAA") === false,
     "empty: three bytes of payload is not an image either");
  ok(SL.dataUrlOk("data:image/png;base64," + "A".repeat(400)) === true,
     "empty: a real encoded card passes");
  ok(SL.dataUrlOk("") === false && SL.dataUrlOk(null) === false && SL.dataUrlOk("https://x/y.png") === false,
     "empty: anything that is not a data URL at all is rejected rather than trusted");
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · THE NATIVE SHEET REPORTS WHAT HAPPENED
// ─────────────────────────────────────────────────────────────────────────────
// Every outcome must be distinguishable, because each one owes the reader a
// different thing: silence for a cancellation, a copied link for everything else.
// ═════════════════════════════════════════════════════════════════════════════
{
  const withNav = (nav) => {
    const c = mkSandbox({ navigator: nav });
    new vm.Script(SL_SRC, { filename: "share-links.js" }).runInContext(c);
    return c.window.PDXShareLinks;
  };
  const rej = (name) => () => { const e = new Error(name); e.name = name; return Promise.reject(e); };

  const seen = [];
  const good = withNav({ share: (p) => { seen.push(p); return Promise.resolve(); } });
  const r1 = await good.native({ title: "T", text: "X", url: "https://politidex.fyi/?p=scalise" });
  ok(r1.ok === true && r1.outcome === "shared", "native: a completed hand-off reports 'shared'");
  must(seen.length === 1, "the navigator.share stub was never called");
  ok(seen[0].title === "T" && seen[0].url === "https://politidex.fyi/?p=scalise" && seen[0].text === "X",
     "native: title, text and url all reach the platform — a payload without a url arrives as a bare image with no route back to the record");

  ok((await good.native({ text: "just words" })).outcome === "invalid",
     "native: a payload with neither a url nor a file is refused up front rather than opening an empty sheet");
  ok(seen.length === 1, "native: the invalid payload never reached the platform");

  ok((await withNav({}).native({ url: "https://x/" })).outcome === "unsupported",
     "native: a browser with no Web Share API reports 'unsupported' so the caller can copy the link instead of doing nothing");

  ok((await withNav({ share: rej("AbortError") }).native({ url: "https://x/" })).outcome === "cancelled",
     "native: AbortError is the reader dismissing the sheet — the one case that deserves silence");
  ok((await withNav({ share: rej("NotAllowedError") }).native({ url: "https://x/" })).outcome === "failed",
     "native: NotAllowedError is the platform refusing to open the sheet at all, so it is a FAILURE owed a fallback — filing it under 'cancelled' is what made the button a silent no-op");
  ok((await withNav({ share: rej("DataError") }).native({ url: "https://x/" })).outcome === "failed",
     "native: any other rejection is a failure owed a fallback");
  ok((await withNav({ share: () => { throw new Error("sync boom"); } }).native({ url: "https://x/" })).outcome === "failed",
     "native: a synchronous throw is caught and classified rather than escaping into the click handler");

  // Files are the strict branch: ask before opening, or the sheet aborts mid-gesture.
  const fileNav = { share: () => Promise.resolve(), canShare: (p) => !p.files };
  ok((await withNav(fileNav).native({ files: [{}], url: "https://x/" })).outcome === "unsupported",
     "native: a platform that cannot take this file says so BEFORE the sheet opens, so the caller falls back instead of aborting mid-gesture");

  const filesSeen = [];
  const okFiles = withNav({ share: (p) => { filesSeen.push(p); return Promise.resolve(); }, canShare: () => true });
  await okFiles.native({ files: [{ name: "card.png" }], title: "T", url: "https://politidex.fyi/?record=scalise~voting_rights" });
  ok(filesSeen.length === 1 && filesSeen[0].files.length === 1 && filesSeen[0].url,
     "native: the image travels WITH its link, so whoever receives the card can reach the record behind it");

  // Never rejects: a share control must not throw into the page.
  let threw = false;
  try { await SL.native(null); } catch (e) { threw = true; }
  ok(!threw, "native: the helper resolves on every path — a share that fails must not become an unhandled rejection");
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · THE DOSSIER SHARE SENDS THE DOSSIER
// ─────────────────────────────────────────────────────────────────────────────
// share-anywhere.js is the control mounted on the issue dossier's "Share this".
// When neither image pipeline can serve a person it falls back to a link — and
// that link is where the issue used to be lost.
// ═════════════════════════════════════════════════════════════════════════════
{
  const calls = [];
  const saCtx = mkSandbox({
    PDXReceiptCards: { publicCardsFor: () => [], warm: (pid) => { calls.push(["warm", pid]); return Promise.resolve(null); } },
    PDXReceipts: { forPolitician: () => null, find: () => null },
    PROFILES: { scalise: { name: "Steve Scalise", office: "U.S. House" } },
  });
  saCtx.pdxSharePolitician = saCtx.window.pdxSharePolitician =
    (pid, ev, opts) => { calls.push(["sheet", pid, (opts && opts.issueKey) || ""]); };
  saCtx._showToast = saCtx.window._showToast = (m) => { calls.push(["toast", m]); };
  new vm.Script(read("share-anywhere.js"), { filename: "share-anywhere.js" }).runInContext(saCtx);
  const SA = saCtx.window.PDXShareAnywhere;
  must(SA, "share-anywhere.js did not register PDXShareAnywhere");

  const st = SA.state("scalise", { issueKey: "voting_rights" });
  must(st && st.tier === "link",
       "the fixture is meant to have nothing on file, so the link tier is what gets exercised");
  ok(st.issueKey === "voting_rights",
     "dossier: the control carries the issue it was mounted with");

  await SA.share("scalise", null, { issueKey: "voting_rights" });
  const sheet = calls.find((c) => c[0] === "sheet");
  must(sheet, "the link fallback never reached the share sheet");
  ok(sheet[2] === "voting_rights",
     "dossier: the issue survives the fallback and reaches the share sheet — dropping it here is exactly what emitted /?p=scalise from a Secure & Accessible Voting dossier");
  ok(calls.some((c) => c[0] === "toast" && /issue link/i.test(c[1])),
     "dossier: the reader is told an issue link is being sent, not a profile link");

  // The un-scoped case must be untouched.
  calls.length = 0;
  await SA.share("scalise", null);
  const plain = calls.find((c) => c[0] === "sheet");
  ok(plain && plain[2] === "",
     "dossier: a share with no issue in play still sends the profile, unchanged");
  ok(calls.some((c) => c[0] === "toast" && /profile link/i.test(c[1])),
     "dossier: and still says 'profile link' — the two promises are told apart");

  // The promise the control prints must match the link it will send.
  ok(/Official Record/.test(st.label) && !/’s profile\./.test(st.label),
     "dossier: the accessible name promises the Official Record, because that is what the link opens");
  ok(/Official Record/.test(st.hint),
     "dossier: the visible hint says the same thing the accessible name does");
  const plainState = SA.state("scalise");
  ok(/profile/.test(plainState.label) && /profile/.test(plainState.hint),
     "dossier: and the un-scoped control still promises a profile");
  ok(plainState.hint.length < 120 && st.hint.length < 120,
     "dossier: both hint strings stay short enough to swap inside the height-reserved box, so naming the destination cannot resize a sheet the reader has open");
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · EVERY EMITTER ADOPTED THE GUARD
// ─────────────────────────────────────────────────────────────────────────────
// A guard that five of six call sites use is not a guard. These are source-level
// on purpose: the failure they catch is a NEW share path added later without the
// check, which no runtime fixture in this file would ever reach.
// ═════════════════════════════════════════════════════════════════════════════
{
  const IMAGE_EMITTERS = ["say-vs-do.js", "profile-card.js", "my-stances.js"];
  IMAGE_EMITTERS.forEach((f) => {
    const code = strip(read(f));
    ok(/blobOk\s*\(/.test(code),
       `guard: ${f} runs its canvas output through the emptiness check before wrapping it in a File`);
    ok(!/new File\(\s*\[\s*blob\s*\]/.test(code) || /blobOk/.test(code),
       `guard: ${f} never wraps an unchecked blob`);
    ok(/PDXShareLinks/.test(code),
       `guard: ${f} takes the rule from share-links.js rather than keeping a private copy that can drift`);
  });

  const DATAURL_EMITTERS = ["say-vs-do.js", "profile-card.js"];
  DATAURL_EMITTERS.forEach((f) => {
    const code = strip(read(f));
    const dl = code.match(/function download\s*\([\s\S]*?\n  \}/);
    must(dl, `could not locate download() in ${f} — this harness is reading the wrong shape`);
    ok(/dataUrlOk/.test(dl[0]),
       `guard: ${f}'s <a download> refuses an empty data URL instead of saving a 0-byte file`);
    ok(/return false/.test(dl[0]) && /return true/.test(dl[0]),
       `guard: ${f}'s download() reports whether it actually saved, so the menu above it cannot claim '✅ Image saved' over a file that is not there`);
  });

  // No share surface may still swallow its own failure.
  const SHARE_SURFACES = ["say-vs-do.js", "profile-card.js", "my-stances.js",
                          "issue-view.js", "bill-detail.js", "profiles-full.js"];
  SHARE_SURFACES.forEach((f) => {
    const code = strip(read(f));
    ok(!/navigator\.share\([\s\S]{0,200}?\.catch\(\s*function\s*\(\s*\)\s*\{\s*\}\s*\)/.test(code),
       `honesty: ${f} has no navigator.share(...).catch(function(){}) — an empty catch is how a refused share became a button that did nothing and said nothing`);
    ok(!/NotAllowedError/.test(code) || f === "share-links.js",
       `honesty: ${f} does not classify NotAllowedError itself — that call sat in the 'user cancelled' branch, which is why the one case owed a fallback never got one`);
  });

  // And every one of them routes through the single classifier.
  ["say-vs-do.js", "profile-card.js", "my-stances.js", "issue-view.js", "bill-detail.js"].forEach((f) => {
    const code = strip(read(f));
    ok(/\.native\s*\(/.test(code),
       `honesty: ${f} routes its native share through PDXShareLinks.native, so the outcome is classified in one place`);
  });

  // The native payload contract, at the two file-share sites.
  ["say-vs-do.js", "profile-card.js"].forEach((f) => {
    const code = strip(read(f));
    const pay = code.match(/var payload = \{[\s\S]*?\};/);
    must(pay, `could not locate the share payload in ${f}`);
    ok(/title:/.test(pay[0]), `payload: ${f} sends a title, which is what the receiving app puts in its subject line`);
    ok(/url:/.test(pay[0]), `payload: ${f} sends a url, so the card that leaves the app carries a route back to the record`);
    ok(/text:/.test(pay[0]), `payload: ${f} still sends its caption`);
  });

  // The profile link builder must not reintroduce the pathname.
  const pf = strip(read("profiles-full.js"));
  ok(!/location\.origin \+ location\.pathname \+ ['"]\?p=/.test(pf),
     "link: pdxShareUrl no longer pastes ?p= onto whatever path the reader is standing on");
  ok(/pdxShareTargetUrl/.test(pf),
     "link: profiles-full.js exposes the issue-aware target builder the share sheet fills from");
  ok(/issueKey/.test(pf.match(/window\.pdxSharePolitician = function[\s\S]*?\n  \};/)[0]),
     "link: the share sheet accepts an issue and builds its link from it");
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · FAIL CLOSED, AND CHANGE NOTHING ELSE
// ═════════════════════════════════════════════════════════════════════════════
{
  // An arrival that cannot be reconstructed must say so rather than becoming the
  // front page — the same contract the /vote/ safety net already held to.
  const nCtx = mkSandbox();
  new vm.Script(SL_SRC, { filename: "share-links.js" }).runInContext(nCtx);
  const N = nCtx.window.PDXShareLinks;
  const body = nCtx.document.body;
  ok(N.notice("pdx-test-notice", "Shared record", "We couldn’t open it.") === true,
     "fail-closed: the unresolved-link notice mounts");
  ok(body.children.length === 1 && /couldn/.test(body.children[0].innerHTML),
     "fail-closed: the notice states plainly that the link did not resolve");
  ok(body.children[0].getAttribute("role") === "status",
     "fail-closed: it is announced, not just drawn");
  nCtx._byId["pdx-test-notice"] = body.children[0];
  ok(N.notice("pdx-test-notice", "Shared record", "again") === false && body.children.length === 1,
     "fail-closed: it mounts once, so a retrying deep link cannot stack apologies");

  const pf = strip(read("profiles-full.js"));
  ok(/pdx-profile-unresolved/.test(pf),
     "fail-closed: a ?p= link naming somebody the roster does not carry says so instead of silently showing the homepage");
  ok(/pdx-record-unresolved/.test(strip(read("receipt-cards.js"))),
     "fail-closed: a ?record= link that never resolves does the same, after its retries are spent");

  // Nothing in this pass may touch scoring, blend the lanes, or invent a receipt.
  const TOUCHED = ["share-links.js", "share-anywhere.js", "say-vs-do.js", "profile-card.js",
                   "my-stances.js", "issue-view.js", "bill-detail.js", "profiles-full.js",
                   "receipt-cards.js"];
  const SCORE = /(^|[^\w.])(score|weight|pct|percent)\s*=[^=]/;
  TOUCHED.forEach((f) => {
    ok(!SCORE.test(strip(read(f)).split("\n").filter((l) => /blobOk|dataUrlOk|PDXShareLinks|forTarget|pdxShareTargetUrl|\.native\(/.test(l)).join("\n")),
       `score: nothing on the share path in ${f} assigns a score, a weight or a percentage`);
  });
  ok(!/publicCardsFor[\s\S]{0,400}?verdict\s*=/.test(strip(read("share-anywhere.js"))),
     "score: the share resolver still reads verdicts and assigns none");

  // The guards the share cards pass through are the owning modules' own.
  const sa = strip(read("share-anywhere.js"));
  ok(/publicCardsFor/.test(sa) && !/\bcardsFor\s*\(/.test(sa.replace(/publicCardsFor/g, "publicCF")),
     "receipts: the issue-aware fallback did not open a second, unguarded route out of the app");
  ok(!/renderImage|canvasToBlob|navigator\.share/.test(sa),
     "receipts: share-anywhere still renders nothing itself, so no new artifact was invented here");
}

}; // run

await run();

if (failures.length) {
  console.error("\n✖ share pipeline: " + failures.length + " failure(s)\n");
  failures.forEach((f) => console.error("  · " + f));
  console.error("");
  process.exit(1);
}
console.log("✓ share pipeline: all " + passed +
  " assertions passed — every visible Share control emits a real link or a real file, and says so when it cannot");
