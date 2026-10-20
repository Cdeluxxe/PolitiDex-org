#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// test-federal-third-party-profiles.mjs — light profiles for the thirty-two federal
// independent and third-party nominees (batches of twelve, twelve and eight): a bio, and campaign claims that read
// as campaign claims everywhere the person file prints them
// ─────────────────────────────────────────────────────────────────────────────
// What must stay true:
//
//   1. EACH FILE SHOWS ITS BIO AND ITS STANCES, each with its source — or the
//      bio alone where no campaign site or questionnaire publishes a stance.
//   2. EACH STANCE IS A CAMPAIGN CLAIM, NOT A VOTE. The detail is exactly
//      "Campaign claim, not a vote — <source>.", there is no evidence field, and
//      the topic tree prints that line and a source link where it used to print
//      "🏛 Record: No formal record on this issue yet".
//   3. NO KEY THE SOURCE DOES NOT SUPPORT.
//   4. NO SCORE, NO DIRECTION MATCH FIGURE, NO EQUITY LANGUAGE.
//   5. EVERYONE ELSE IS UNCHANGED, and so are the twelve roster rows.
//
//   node scripts/test-federal-third-party-profiles.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { makeSandbox } from "./gen-hero-showcase.mjs";
import { DECLARED_STANCE_PASSES, carveDeclaredAdmissions } from "./v103-chrome-seams.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (f) => readFileSync(join(ROOT, f), "utf8");
const HEAD = (f) => {
  try { return execFileSync("git", ["show", `HEAD:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); }
  catch { return null; }
};

let passed = 0;
const failures = [];
const ok = (c, m) => { if (c) passed++; else failures.push(m); return !!c; };
const eq = (a, b, m) => ok(a === b, `${m} — expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const has = (h, n, m) => ok(String(h).indexOf(n) >= 0, `${m} — "${String(n).slice(0, 80)}" missing`);
const section = (t) => console.log(`\n   ── ${t}`);

// The reviewed list: each person's keys, in order, the hosts their claims cite,
// and a phrase their bio must carry. An empty `keys` is a bio-only file: no
// campaign site or Ballotpedia questionnaire publishes a stance for them.
const PEOPLE = {
  dan_osborn:        { keys: ["campaign_finance", "stock_trading_ban", "social_security", "national_debt", "econ_corp_account"], hosts: ["www.osbornforsenate.com"], bio: "industrial mechanic" },
  brian_bengs:       { keys: ["campaign_finance", "econ_corp_account", "stock_trading_ban", "term_limits", "social_security"], hosts: ["bengsforsouthdakota.com"], bio: "park ranger" },
  todd_achilles:     { keys: ["term_limits", "lands_keep_public", "stock_trading_ban", "restraint", "gun_rights"], hosts: ["www.achillesforidaho.com"], bio: "tank commander" },
  sarah_zabel:       { keys: ["social_security", "housing", "tariffs_prices", "econ_corp_account", "immig_legal"], hosts: ["www.zabelforcongress.com"], bio: "major general" },
  bill_hill:         { keys: ["tariffs_prices", "enviro_energy", "public_schools", "stock_trading_ban", "campaign_finance"], hosts: ["billhillforalaskans.com", "www.youralaskalink.com"], bio: "commercial fisherman" },
  will_johanson:     { keys: ["national_debt", "lower_taxes", "gun_rights", "energy_production"], hosts: ["www.johansonforidaho.com"], bio: "semiconductor engineer" },
  cory_robertson:    { keys: [], hosts: [], bio: "stay-at-home father" },
  monica_alponte:    { keys: ["restraint", "war_powers", "term_limits", "campaign_finance", "gun_rights"], hosts: ["monicaalponteaz.com"], bio: "talk show co-host" },
  shawn_johnson:     { keys: ["restraint", "gov_regulation", "property_rights"], hosts: ["www.shawnforwyoming.com"], bio: "combat medic" },
  jeff_haggit:       { keys: [], hosts: [], bio: "instrumentation technician" },
  tom_schmitz:       { keys: [], hosts: [], bio: "Libertarian nominee" },
  brandon_daugherty: { keys: ["restraint", "gov_transparency", "national_debt", "gun_rights", "free_speech"], hosts: ["www.bcd4mo.com"], bio: "Missouri Liberty Report" },
};
// Batch 2: the twelve U.S. Senate nominees admitted in v421.
const BATCH2 = {
  seth_bodnar: { keys: ["tariffs_prices",  "health_drug_prices",  "health_rural",  "stock_trading_ban",  "campaign_finance"], hosts: ["www.sethformontana.com"], bio: "Green Beret" },
  ty_pinkins: { keys: ["healthcare",  "rural_ag",  "public_schools",  "housing",  "tax_middle_class"], hosts: ["www.typinkins.com"], bio: "Rolling Fork" },
  rebecca_whiting: { keys: ["restraint",  "gov_regulation",  "lower_taxes",  "immig_legal"], hosts: ["whiting4senate.us",  "www.kaxe.org"], bio: "combat medic" },
  marisa_simonetti: { keys: ["privacy_rights",  "gov_transparency",  "econ_corp_account"], hosts: ["www.kaxe.org"], bio: "chief executive" },
  jeff_wadlin: { keys: ["healthcare_costs",  "national_debt",  "gun_rights",  "restraint"], hosts: ["www.jeffwadlin.com"], bio: "Sam's Club" },
  natalie_fleming: { keys: ["immig_balance",  "privacy_rights",  "public_schools",  "rural_ag"], hosts: ["idahonews.com",  "nataliefleming.info"], bio: "single mother of four" },
  matt_loesby: { keys: ["border_security",  "restraint",  "cannabis_reform"], hosts: ["www.loesby.us"], bio: "video game developer" },
  kyle_austin: { keys: ["war_powers",  "tariffs_prices",  "voter_id",  "cut_spending"], hosts: ["projects.montanafreepress.org",  "www.mtpr.org"], bio: "pharmacist" },
  lydia_christensen: { keys: ["tax_middle_class",  "gun_rights",  "privacy_rights",  "healthcare"], hosts: ["www.lydialynnchristensen.com"], bio: "foster care" },
  douglas_marsh: { keys: ["healthcare",  "restraint",  "econ_corp_account"], hosts: ["ballotpedia.org",  "www.electmarsh.org"], bio: "community journalist" },
  shannon_bray: { keys: ["war_powers",  "privacy_rights",  "healthcare_market",  "national_debt",  "immig_balance"], hosts: ["web.archive.org"], bio: "cybersecurity" },
  ted_brown: { keys: ["lower_taxes",  "restraint",  "cannabis_reform",  "privacy_rights"], hosts: ["tedbrown.org"], bio: "insurance adjuster" },
};
const PASS_OF = {};
Object.keys(PEOPLE).forEach((p) => { PASS_OF[p] = "federal_third_party_light_profiles_b1_oct2026"; });
Object.keys(BATCH2).forEach((p) => { PASS_OF[p] = "federal_third_party_light_profiles_b2_oct2026"; });
Object.assign(PEOPLE, BATCH2);
// Batch 3: the eight House and Senate nominees admitted in v424.
const BATCH3 = {
  blake_huber: { keys: ["cut_spending",  "states_federal_power",  "gun_rights",  "pro_choice"], hosts: ["ivoterguide.com"], bio: "Navy Reserve" },
  bill_redpath: { keys: ["tariffs_prices",  "lower_taxes",  "cut_spending",  "cannabis_reform",  "restraint"], hosts: ["billredpath.com"], bio: "business valuation" },
  s_marshall_wilson: { keys: ["energy_production",  "econ_smallbiz",  "national_debt"], hosts: ["wilsonwv.com"], bio: "infantry officer" },
  jim_mcdermott: { keys: ["tariffs_prices",  "privacy_rights",  "restraint",  "national_debt",  "term_limits"], hosts: ["jamesmcdermott.org"], bio: "master sergeant" },
  gary_swing: { keys: ["restraint",  "healthcare",  "edu_college_cost"], hosts: ["theswingvote.wixsite.com"], bio: "caregiver" },
  mark_elworth: { keys: ["lower_taxes",  "gov_regulation",  "tariffs_prices",  "privacy_rights"], hosts: ["web.archive.org"], bio: "lifelong activist" },
  jacob_anders: { keys: ["stock_trading_ban",  "tax_middle_class",  "healthcare",  "pro_choice"], hosts: ["jacobanders.org"], bio: "historian" },
  helene_neville: { keys: ["healthcare_costs",  "social_security",  "pro_choice",  "stock_trading_ban",  "tariffs_prices"], hosts: ["web.archive.org",  "www.heleneforcongress.com"], bio: "nurse" },
};
Object.keys(BATCH3).forEach((p) => { PASS_OF[p] = "federal_third_party_light_profiles_b3_oct2026"; });
Object.assign(PEOPLE, BATCH3);
// Batch 4: forty-three of the fifty-three nominees admitted in v427.
const BATCH4 = {
  ron_meinhardt: { keys: ["war_powers",  "border_security",  "medical_freedom",  "national_debt"], hosts: ["running4ok.com"], bio: "a registered nurse and regis" },
  curtis_stinnett: { keys: ["campaign_finance",  "healthcare",  "pro_choice",  "econ_workers",  "climate_action"], hosts: ["web.archive.org",  "www.stinnettforsenate.org"], bio: "a community pharmacist of 15" },
  gary_dye: { keys: ["america_first_fp",  "restraint",  "gun_rights",  "cut_spending"], hosts: ["garydye2020.wordpress.com"], bio: "a chemical engineer who work" },
  chris_henry: { keys: ["healthcare",  "campaign_finance",  "restraint",  "econ_workers"], hosts: ["www.chrishenry.org"], bio: "a long-haul truck driver and" },
  michael_bahry: { keys: ["restraint",  "term_limits",  "pro_life",  "immig_balance"], hosts: ["bahryforsenate.com"], bio: "a native Rhode Islander, for" },
  kasie_whitener: { keys: ["national_debt",  "cut_spending",  "restraint",  "war_powers"], hosts: ["kasiesouthcarolina.com"], bio: "a University of South Caroli" },
  tharon_chandler: { keys: ["transit",  "climate_action",  "restraint",  "econ_corp_account",  "stock_trading_ban"], hosts: ["web.archive.org"], bio: "a Lawrenceburg farmer and Ar" },
  andrew_gerena: { keys: ["america_first_fp",  "enviro_energy",  "veterans",  "transit",  "lands_preserve"], hosts: ["www.jeranimo4senate.org"], bio: "campaigning as “Jeranimo,” a" },
  robert_jones: { keys: ["housing",  "pro_choice",  "restraint"], hosts: ["www.robertfortn.com"], bio: "a Jonesborough small-busines" },
  james_macon: { keys: ["health_mental",  "justice_balance",  "national_debt"], hosts: ["ballotpedia.org"], bio: "a Memphis medical-technology" },
  catherine_whitson: { keys: ["health_rural",  "edu_college_cost",  "transit",  "child_care"], hosts: ["senatorbarcy.org"], bio: "a former insurance professio" },
  neil_gillespie: { keys: ["checks_balances",  "healthcare",  "immig_balance"], hosts: ["web.archive.org"], bio: "founder of Justice Network a" },
  christopher_campbell: { keys: ["healthcare",  "america_first_fp",  "pro_choice",  "voting_access"], hosts: ["candidates.goodparty.org"], bio: "a Marion County native, East" },
  edmond_laplante: { keys: ["america_first_fp",  "veterans",  "audit_spending",  "edu_parental"], hosts: ["laplante4constitutionalnh.com"], bio: "a mechanic of more than 40 y" },
  veronica_fernandez: { keys: ["campaign_finance",  "healthcare",  "america_first_fp",  "gun_safety"], hosts: ["veronicaforsenate.com"], bio: "Veronica Fernandez is the no" },
  shiva_ayyadurai: { keys: ["medical_freedom",  "election_integrity",  "restraint",  "free_speech",  "term_limits"], hosts: ["shiva4senate.com"], bio: "founder and CEO of CytoSolve" },
  joseph_tache: { keys: ["climate_action",  "immigration_reform",  "restraint",  "pro_choice",  "housing_support"], hosts: ["www.tache4ma.com"], bio: "a Roxbury youth worker and c" },
  whitfield_harrington: { keys: ["tariffs_prices",  "edu_college_cost",  "term_limits",  "immig_balance",  "enviro_energy"], hosts: ["whit4ilsenate.com"], bio: "a Chicago pastor and former" },
  thomas_laehn: { keys: ["campaign_finance",  "property_rights",  "war_powers",  "national_debt",  "cannabis_reform"], hosts: ["laehn4iowa.org"], bio: "the Greene County Attorney a" },
  david_graham: { keys: ["lower_taxes",  "gov_regulation",  "cannabis_reform",  "war_powers",  "pro_life"], hosts: ["johnsoncountypost.com"], bio: "an Overland Park attorney wi" },
  geral_staten: { keys: ["tariffs_authority",  "pro_choice",  "housing_support",  "healthcare"], hosts: ["www.vpm.org"], bio: "a Suffolk native, father of" },
  j_matt_baker: { keys: ["datacenter_power",  "pro_choice",  "immigration_reform",  "war_powers",  "tariffs_authority"], hosts: ["www.mattbakerindependent.com",  "www.vpm.org"], bio: "a retired Marine Corps infan" },
  taner_demirci_lopez: { keys: ["immig_balance",  "healthcare_market",  "veterans",  "datacenter_power",  "cut_spending"], hosts: ["lopezforva.com"], bio: "a former college professor w" },
  shelly_arnoldi: { keys: ["edu_parental",  "term_limits",  "datacenter_power",  "econ_smallbiz"], hosts: ["www.arlnow.com"], bio: "a Navy veteran and licensed" },
  tyler_davis: { keys: ["enviro_energy",  "housing",  "national_debt",  "disaster_resilience",  "econ_smallbiz"], hosts: ["www.tylerdavisforcongress.com"], bio: "a Pensacola resident raising" },
  andrew_parrott: { keys: ["cut_spending",  "lower_taxes",  "veterans"], hosts: ["web.archive.org"], bio: "a 25-year Ocala resident wit" },
  christopher_dennison: { keys: ["restraint",  "america_first_fp",  "privacy_rights",  "veterans",  "gun_rights"], hosts: ["dennison4congress.com",  "ivoterguide.com"], bio: "an Air Force veteran and fat" },
  ralph_groves: { keys: ["war_powers",  "guard_authority",  "social_security",  "gun_rights",  "medical_freedom"], hosts: ["www.grovesforcongress.com"], bio: "an Ocoee resident who retire" },
  kedner_maxime: { keys: ["health_drug_prices",  "immig_balance",  "public_schools",  "econ_smallbiz",  "housing_first_time"], hosts: ["www.maximeforcongress.com"], bio: "who came to the United State" },
  jeremy_todd: { keys: ["restraint",  "gun_rights",  "free_speech",  "cut_spending",  "pro_life"], hosts: ["jeremy-todd.com"], bio: "the son of a truck driver an" },
  gerardo_serrano: { keys: ["war_powers",  "immig_balance",  "social_security",  "property_rights",  "national_debt"], hosts: ["serranoforamerica.com"], bio: "a Jackson County resident of" },
  mikel_wein: { keys: ["healthcare",  "war_powers",  "econ_workers",  "campaign_finance",  "disaster_resilience"], hosts: ["www.weinforky5.com"], bio: "who lives in Letcher County" },
  jay_bowman: { keys: ["tax_middle_class",  "healthcare",  "datacenter_power",  "gun_rights",  "pro_choice"], hosts: ["www.bowman2026.com"], bio: "a Michigan-born, Utah-raised" },
  pete_lynch: { keys: ["stock_trading_ban",  "campaign_finance",  "datacenter_power",  "healthcare",  "war_powers"], hosts: ["petelynchforkentucky.com"], bio: "a University of Kentucky lec" },
  ramon_mora: { keys: ["healthcare",  "health_drug_prices",  "stock_trading_ban",  "campaign_finance",  "paid_leave"], hosts: ["www.southjerseygrit.com"], bio: "a South Jersey native who wa" },
  rick_stewart: { keys: ["gun_rights",  "property_rights",  "cannabis_reform"], hosts: ["www.rickstewart.com"], bio: "a Postville native and forme" },
  dave_bushaw: { keys: ["healthcare",  "stock_trading_ban",  "campaign_finance",  "cannabis_reform",  "immigration_reform"], hosts: ["www.davebushaw.com"], bio: "a West Union native, first-g" },
  john_hauer: { keys: ["restraint",  "lower_taxes",  "america_first_fp",  "cut_spending"], hosts: ["ballotpedia.org",  "www.hauerforcongress.com"], bio: "a Topeka veteran of two Iraq" },
  steve_hohe: { keys: ["cut_spending",  "lower_taxes",  "school_choice"], hosts: ["stevehoheforkansas.wordpress.com"], bio: "a Shawnee resident who serve" },
  chris_getty: { keys: ["social_security",  "pro_choice",  "immig_balance",  "stock_trading_ban",  "tariffs_prices"], hosts: ["www.chrisgettyforcongress.com"], bio: "the mayor of the Village of" },
  michael_bridgford: { keys: ["term_limits",  "stock_trading_ban",  "campaign_finance",  "healthcare_market",  "rural_ag"], hosts: ["bridgfordforiowa.com"], bio: "who grew up on a seventh-gen" },
  ryan_kelly: { keys: ["healthcare",  "econ_workers",  "housing_support",  "gun_balance",  "pro_choice"], hosts: ["www.kellyfornj03.com"], bio: "Accountability, People,” a f" },
  alan_bond: { keys: ["social_security",  "cost_living",  "housing",  "edu_college_cost",  "veterans"], hosts: ["hopefortomorrownj.org"], bio: "Alan B. Bond is the nominee" },
};
Object.keys(BATCH4).forEach((p) => { PASS_OF[p] = "federal_third_party_light_profiles_b4_oct2026"; });
Object.assign(PEOPLE, BATCH4);
// …and the other ten, who have no usable primary source or fewer than three
// positions an existing key holds. Their files stay empty: no bio, no claim.
const EMPTY_B4 = ["sevier_white", "mark_hackett", "jeremy_hearn", "yoshi_matthews", "david_sutman", "joanne_kuniansky", "dianne_blais", "terrisa_bukovinac", "ed_hershey", "thomas_loecken"];
// Topics the user asked about that these sources do not state, or state with
// no key to hold them: no card may sit on these keys.
const NOT_IN_SOURCE = {
  todd_achilles: ["healthcare_costs", "housing", "veterans"],
  bill_hill: ["rural_ag"],
  // Batch 2: positions these sources state that no existing key holds, or holds
  // only by stretching its chip — left out rather than forced onto one.
  matt_loesby: ["deportations", "lgbtq_rights", "rights_balance"],
  douglas_marsh: ["iran_policy", "family_support", "water", "housing"],
  lydia_christensen: ["water", "enviro_balance"],
  ted_brown: ["justice_reform", "edu_parental", "school_choice"],
  // Batch 3: positions with no key that holds them without stretching it.
  bill_redpath: ["immig_legal", "immigration_reform"],
  gary_swing: ["datacenter_water", "climate_action", "democracy_balance", "immigration_reform"],
  jacob_anders: ["immig_balance", "family_support"],
  blake_huber: ["tariffs_china", "voter_id"],
  will_johanson: ["border_security", "lands_keep_public"],
  shawn_johnson: ["gun_rights", "cut_spending"],
};
const EQUITY = /\bequity\b|\bstocks?\b|earn (?:a|your) share|\bshareholder|\bdividend/i;
// A stock-trading ban for members of Congress (or for elected officials) is the
// candidate's position, not equity language: in a sentence that names Congress
// or elected officials, "stocks" / "stock trading"
// is set aside, and every other use of "stock" still fails.
// Likewise "private equity" names a kind of investment firm in a candidate's
// position on who may own homes; that phrase alone is set aside.
const equityIn = (t) => EQUITY.test(String(t).replace(/\bprivate[- ]equity\b/gi, " ").split(/(?<=[.!?])\s+/).map((x) =>
  /\bCongress(?:ional)?\b|\belected officials\b/i.test(x) ? x.replace(/\b(?:individual\s+)?stocks?(?:\s+trad(?:e|ing))?\b/gi, " ") : x).join(" "));

const FILES = [
  "cmp-data.js", "cmp-data-detail.js", "politician-stances-core.js", "politician-stances-ext.js", "state-senate-stances.js",
  "stance-helpers.js", "alignment-tool.js", "acct-spotlight-data.js", "say-vs-do.js", "exec-action-data.js", "exec-record.js",
  "exec-record-ui.js", "consistency.js", "voting-record.js", "word-action.js", "profile-spine.js", "issue-colors.js",
  "my-stances.js", "stance-tree.js", "voter-hub-location.js", "roster-keys.js", "seat-field.js", "person-link.js", "profiles-full.js",
];
// person.html's own inline PDXStance block — the four-state stance language the card reads.
const PH = R("person.html");
const PDX_AT = PH.indexOf("// ── PDXStance — shared canonical stance language");
const PDX_BLOCK = PDX_AT < 0 ? "" : PH.slice(PH.lastIndexOf("<script>", PDX_AT) + 8, PH.indexOf("</script>", PDX_AT));

function boot() {
  const w = makeSandbox();
  const by = {};
  const el = (id) => {
    const n = {
      id, innerHTML: "", textContent: "", style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: [],
      classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, addEventListener() {}, removeEventListener() {},
      appendChild(c) { return c; }, querySelector() { return null; }, querySelectorAll() { return []; },
      insertAdjacentHTML() {}, remove() {}, focus() {}, scrollTo() {}, scrollIntoView() {},
    };
    if (id) by[id] = n;
    return n;
  };
  w.document.getElementById = (id) => by[id] || el(id);
  w.document.createElement = () => el("");
  w.__byId = by;
  // The homepage-only helpers openModal reaches for; a figure from either would
  // be a bug here, so both answer blank.
  w._pdxDisplayScore = () => "";
  w._likeCounts = {};
  if (typeof w.URLSearchParams !== "function") w.URLSearchParams = URLSearchParams;
  const ctx = vm.createContext(w);
  w.PROFILES = w.CMP_DATA;
  w.__err = [];
  for (const f of FILES) { try { vm.runInContext(R(f), ctx, { filename: f }); } catch (e) { w.__err.push(`${f}: ${e.message}`); } }
  try { vm.runInContext(PDX_BLOCK, ctx, { filename: "person.html#PDXStance" }); } catch (e) { w.__err.push(`PDXStance: ${e.message}`); }
  w.PROFILES = w.CMP_DATA;
  return w;
}
const visible = (h) => String(h).replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
// The quoted text as the card prints it (apostrophes and dashes unchanged).
const norm = (s) => String(s).replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");

const w = boot();
if (!ok(typeof w.openModal === "function" && typeof w._renderIssueStances === "function" && w.PDXStance, `the person file did not boot — ${w.__err.join(" | ")}`)) {
  console.log(`\n✗ third-party profiles: 0 passed, ${failures.length} failed`); failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1);
}
const KEYS = new Set(JSON.parse(R("db/issue-keys.json")).keys);
const S = w.ISSUE_STANCE_DATA;


const T = w.PDXStanceTree;
ok(!!T && typeof T.leaves === "function", "stance-tree.js did not boot");
w.recordSettled = () => true;

// ═════════════════════════════════════════════════════════════════════════════
section("1 · each file shows its bio and its stances, each with its source");
const files = {};
for (const [pid, want] of Object.entries(PEOPLE)) {
  const rec = w.CMP_DATA[pid];
  if (!ok(!!rec, `${pid} has a roster row`)) continue;
  ok(typeof rec.bio === "string" && rec.bio.length > 40 && rec.bio.length <= 280, `${pid}: one short bio sentence`);
  eq((rec.bio.replace(/\bU\.S\./g, "US").replace(/\b[A-Z]\.(?= [A-Z“"])/g, "X").replace(/\b(?:Jr|Sr)\./g, "X").match(/[.!?](\s|$)/g) || []).length, 1, `${pid}: the bio is one sentence`);
  has(rec.bio, want.bio, `${pid}: the bio says who they are`);
  has(rec.bio, rec.name, `${pid}: the bio names them`);
  let threw = "";
  try { w.openModal(pid); } catch (e) { threw = e.message; }
  const html = (w.__byId["modal-content"] || {}).innerHTML || "";
  ok(html.length > 2000, `${pid}: the person file painted${threw ? ` (openModal stopped after: ${threw})` : ""}`);
  files[pid] = html;
  has(html, 'class="pdxbio-t"', `${pid}: the file prints the bio block`);
  has(norm(visible(html)), norm(rec.bio), `${pid}: …with the bio`);
  const list = S[pid] || [];
  if (!want.keys.length) { eq(list.length, 0, `${pid}: bio only — no stance is invented`); continue; }
  const cards = norm(visible(w._renderIssueStances(pid, rec)));
  for (const s of list) {
    has(cards, norm(s.text), `${pid}: the "${s.topic}" stance is on the file`);
    has(cards, s.source.label, `${pid}: …with its source`);
    has(cards, norm(s.detail), `${pid}: …and its claim line`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
section("2 · every stance is a campaign claim — no Record line, no claimed vote");
for (const pid of Object.keys(PEOPLE)) {
  const list = S[pid] || [];
  for (const s of list) {
    ok(/^Campaign claim, not a vote — .+\.$/.test(s.detail || ""), `${pid}/${s.issueKey}: the detail is the campaign-claim line`);
    eq(s.detail, `Campaign claim, not a vote — ${s.source.label}.`, `${pid}/${s.issueKey}: the claim line names the source`);
    eq(s.claim, "campaign", `${pid}/${s.issueKey}: marked as a campaign claim`);
    ok(!("evidence" in s), `${pid}/${s.issueKey}: no evidence field, so no "Record:" line`);
    ok(!/\b(voted|sponsored|signed|co-?sponsored)\b/i.test(s.text), `${pid}/${s.issueKey}: the sentence claims no act in office`);
  }
  const cards = visible(w._renderIssueStances(pid, w.CMP_DATA[pid]));
  ok(!/Record:|No formal record on this issue yet/.test(cards), `${pid}: no stance card prints a Record line`);
  // THE TOPIC TREE: every leaf carries the claim line and a source link in the
  // Record slot, whether the record lane has settled or not.
  for (const settled of [true, false]) {
    w.recordSettled = () => settled;
    const leaves = T.leaves(pid);
    eq(leaves.length, list.length ? new Set(list.map((s) => s.issueKey)).size : 0, `${pid}: one tree leaf per claimed issue (record ${settled ? "settled" : "pending"})`);
    for (const lf of leaves) {
      const h = T.leafHtml(lf), v = visible(h);
      ok(!!lf.claim, `${pid}/${lf.key}: the leaf is read as a campaign claim`);
      ok(!/Record:|No formal record on this issue yet|Checking the formal record/.test(v), `${pid}/${lf.key}: the leaf prints no Record line (got: ${v.trim().slice(0, 160)})`);
      has(v, "Campaign claim, not a vote — ", `${pid}/${lf.key}: the leaf prints the claim line`);
      ok(/<a class="pdxtree-src" data-pdxtree-src="1" href="https:\/\//.test(h), `${pid}/${lf.key}: the leaf links its source`);
      ok(h.indexOf('<a class="pdxtree-src"') > h.indexOf("</button>"), `${pid}/${lf.key}: the source link sits beside the face button, not inside it`);
      ok(!/\d{1,3}%/.test(v), `${pid}/${lf.key}: no percentage on the leaf`);
    }
  }
  w.recordSettled = () => true;
}
{
  // THE GATE IS THE MARK, NOT THE SENTENCE. An earlier batch's nominee carries the
  // same claim sentence without the mark, and their leaves keep the Record chip.
  const lf = T.leaves("josh_smith")[0];
  ok(lf && !lf.claim && /Record:/.test(visible(T.leafHtml(lf))), "an unmarked file keeps its Record chip");
}

// ═════════════════════════════════════════════════════════════════════════════
section("3 · no stance under a key the source does not support");
for (const [pid, want] of Object.entries(PEOPLE)) {
  const list = S[pid] || [];
  if (want.keys.length) ok(list.length >= 3 && list.length <= 5, `${pid}: 3–5 stances (got ${list.length})`);
  eq(JSON.stringify(list.map((s) => s.issueKey)), JSON.stringify(want.keys), `${pid}: the keys are the reviewed list`);
  for (const s of list) {
    ok(KEYS.has(s.issueKey), `${pid}: ${s.issueKey} is an existing issue key`);
    eq(s.issueStance, "support", `${pid}/${s.issueKey}: stated as support of that position`);
    let host = "";
    try { host = new URL(s.source.url).host; } catch {}
    ok(want.hosts.includes(host), `${pid}/${s.issueKey}: sourced to the candidate's own material (got ${host})`);
  }
  for (const k of NOT_IN_SOURCE[pid] || []) ok(!list.some((s) => s.issueKey === k), `${pid}: nothing is filed on ${k}, which the source does not state`);
}
eq(KEYS.size, JSON.parse(R("db/issue-keys.json")).count, "the issue-key list is the generated one");

// ═════════════════════════════════════════════════════════════════════════════
section("4 · no score, no Direction Match figure, no equity language");
for (const pid of Object.keys(PEOPLE)) {
  const rec = w.CMP_DATA[pid];
  eq(rec.score, null, `${pid}: no score`);
  eq(rec.kept + rec.broken + rec.pending, 0, `${pid}: an empty ledger`);
  eq((rec.issues || []).length, 0, `${pid}: the roster row still carries no issues`);
  let dm = null;
  try { dm = w.PDXWordAction.read(pid, rec); } catch {}
  ok(!dm || (dm.pct == null && !dm.publishable), `${pid}: Direction Match has no published figure (got ${dm && dm.pct})`);
  const t = visible(files[pid]);
  ok(!/\b\d{1,3}\s?%\s*(?:your\s+)?(?:match|direction|aligned)/i.test(t), `${pid}: the file prints no match percentage`);
  ok(!/Direction Match\s*[:·]?\s*\d/.test(t), `${pid}: the file prints no Direction Match number`);
  ok(!equityIn(t), `${pid}: the file carries no equity language`);
  ok(!equityIn(JSON.stringify(S[pid] || []) + rec.bio), `${pid}: the stored bio and stances carry no equity language`);
  for (const lf of T.leaves(pid)) ok(!equityIn(visible(T.leafHtml(lf))), `${pid}/${lf.key}: the leaf carries no equity language`);
}
ok(equityIn("earn a share of PolitiDex stock"), "the equity check still catches equity language");
ok(equityIn("members earn equity in PolitiDex"), "…and the bare word equity outside the private-equity phrase");

// ═════════════════════════════════════════════════════════════════════════════
section("4b · batch 4's people with no usable source stay empty");
for (const pid of EMPTY_B4) {
  const rec = w.CMP_DATA[pid];
  if (!ok(!!rec, `${pid} has a roster row`)) continue;
  ok(!rec.bio, `${pid}: no bio`);
  eq((S[pid] || []).length, 0, `${pid}: no claim`);
  eq(T.leaves(pid).length, 0, `${pid}: no topic-tree row`);
  ok(!PEOPLE[pid], `${pid}: not in the reviewed list`);
}
eq(EMPTY_B4.length + Object.keys(BATCH4).length, 53, "batch 4's 53 people are all accounted for: profiled or empty");

// ═════════════════════════════════════════════════════════════════════════════
section("5 · everyone else is unchanged, and so are the twelve roster rows");
{
  const load = (src, pick) => { if (src == null) return null; const x = { CMP_DATA: {} }; new Function("window", src)(x); return pick(x); };
  const ours = new Set(Object.keys(PEOPLE));
  for (const f of ["politician-stances-core.js", "politician-stances-ext.js", "politician-stances.js"]) {
    const h = load(HEAD(f), (x) => x.ISSUE_STANCE_DATA), n = load(R(f), (x) => x.ISSUE_STANCE_DATA);
    if (!h) { console.log(`      (no git baseline for ${f} — the unchanged check did not run)`); passed++; continue; }
    const moved = [...new Set([...Object.keys(h), ...Object.keys(n)])].filter((k) => JSON.stringify(h[k]) !== JSON.stringify(n[k]) && !ours.has(k));
    eq(moved.join(", "), "", `${f}: no other person's stances moved`);
  }
  const h = load(HEAD("cmp-data-detail.js"), (x) => x.CMP_DATA), n = load(R("cmp-data-detail.js"), (x) => x.CMP_DATA);
  if (h) {
    const moved = [...new Set([...Object.keys(h), ...Object.keys(n)])].filter((k) => JSON.stringify(h[k]) !== JSON.stringify(n[k]) && !ours.has(k));
    eq(moved.join(", "), "", "cmp-data-detail.js: no other person's bio or detail moved");
  } else passed++;
  const c = HEAD("cmp-data.js");
  // A later roster batch declared by name (v103-chrome-seams.mjs DECLARED_ADMISSIONS)
  // is the only growth allowed; every other byte of the roster still compares.
  if (c != null) eq(carveDeclaredAdmissions(c), carveDeclaredAdmissions(R("cmp-data.js")), "cmp-data.js (the roster, every nominee row included) is unchanged by this pass");
  else passed++;
  // The pass that may move these files is declared, by name, with exactly these people.
  for (const name of [...new Set(Object.values(PASS_OF))]) {
    const pass = DECLARED_STANCE_PASSES.find((d) => d.pass === name);
    const want = Object.keys(PASS_OF).filter((p) => PASS_OF[p] === name).sort().join(",");
    eq(pass ? pass.pids.slice().sort().join(",") : "", want, `${name} declares exactly its people`);
  }
}
{
  // The service worker moved past HEAD's, since stance-tree.js is precached.
  const v = (src) => +((/CACHE_VERSION = 'v(\d+)'/.exec(src || "") || [])[1] || 0);
  const head = HEAD("sw.js");
  if (head != null && HEAD("stance-tree.js") !== R("stance-tree.js")) ok(v(R("sw.js")) > v(head), "stance-tree.js changed and the shell version moved");
  else passed++;
}

console.log(`\n${failures.length ? "✗" : "✓"} federal third-party profiles: ${passed} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("   ✗ " + f)); process.exit(1); }
