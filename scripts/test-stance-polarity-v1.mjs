// polarity-v1: directional polarity on deportations, birthright citizenship,
// pro_life / pro_choice and gun_safety / gun_rights.
//
// The sentences below are the ones behind live cards that read the wrong way
// round: statements condemning mass deportation read as support, defending
// birthright citizenship read as oppose, Born-Alive Act support read as oppose
// on pro_life, and criticism of a gun-safety bill read as support for gun safety.
//   node scripts/test-stance-polarity-v1.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as S from "../netlify/lib/stance-score-core.mjs";
import { GROUND_TRUTH_LEAF_KEYS } from "./v103-chrome-seams.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GT_PATHS = fs.readdirSync(path.join(root, "db")).filter((f) => /^stance-ground-truth-.*\.json$/.test(f)).map((f) => path.join(root, "db", f));
const gtBefore = GT_PATHS.map((p) => fs.readFileSync(p, "utf8"));
let failed = 0;
const t = async (name, fn) => {
  try { await fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failed++; console.log(`  ✗ ${name}\n     ${String(e?.message || e).split("\n").join("\n     ")}`); }
};
const sided = (c) => (c.kind === "clear" || c.kind === "implication" ? c.side : null);
const read = (text, topic, pid = "x") => sided(S.classify(text, topic, pid));
const notSupport = (text, topic, pid) => assert.notEqual(read(text, topic, pid), "support", text);
const page = (pid, topic, body, over = {}) => ({
  url: `https://example.gov/${pid}/${topic}`, final_url: `https://example.gov/${pid}/${topic}`, fetched_at: "2026-11-24T10:00:00.000Z",
  source_type: "official press release", politician_id: pid, topic, http_status: 200, body, ...over,
});

console.log("polarity-v1: directional polarity");

// ── Deportations ──
await t("deportations: condemning, opposing or ending mass deportation reads oppose", () => {
  for (const [x, pid] of [
    ["I condemn the Trump administration’s mass deportation agenda.", "x"],
    ["I oppose mass deportation.", "x"],
    ["We must end mass deportations that tear families apart.", "x"],
    ["These are not normal times and the Democratic Party must be a party that includes all of us, fights for all of us, and opposes this agenda of mass deportations, internment camps, and the criminalization of immigrant communities.", "donavan_mckinney"],
    ["House Democrats today are doing the oversight work that Republicans refuse to do — and we will continue to do everything possible to protect our communities from Trump’s mass deportation agenda.”", "casar"],
    ["Van Hollen, Peters Urge Trump Admin to Cancel Mass Deportation Flights to Afghanistan and Iran", "van_hollen"],
    ["Senator Kim Introduces Legislation to Hold ICE Accountable for Abuses at Delaney Hall and Nationwide", "andy_kim"],
    ["From voting rights and voting power to defending Minnesotans against ICE, it’s time to safeguard our Constitutional rights.", "long_mn"],
  ]) assert.equal(read(x, "deportations", pid), "oppose", x);
});
await t("deportations: criticism or a description of mass deportation is never support (oppose or no clear position)", () => {
  for (const [x, pid] of [
    ["Trump’s mass deportation campaign is cruel and un-American.", "x"],
    ["“This Administration’s mass deportation campaign isn’t just targeting the ‘worst of the worst,’ it is terrorizing our communities,” said Vasquez .", "gabe_vasquez"],
    ["“Mass deportations would jeopardize the safety and security of millions of mixed-status families, sow deep distrust and fear in the communities we represent, and destabilize the U.S. economy.", "duckworth"],
    ["Donald Trump's mass deportation agenda has once again produced a moral and economic disaster.", "zoe_lofgren"],
    ["The Administration’s mass deportation agenda does not transcend immigration law or the need for due process.", "blumenthal"],
    ["Mass deportation is not a practical first answer.", "taner_demirci_lopez"],
    ["We're spending billions on mass deportations while our legal immigration system stays broken.", "michael_bahry"],
    ["Mass Deportation", "mitchell_jacob"],
    ["But number two: these mass deportations.", "gallego"],
    ["Minimum cost of a one-time mass deportation operation — before economic losses.", "natalie_fleming"],
    ["Murray: “We are going to invest in families—not wars, not ICE, not billionaires, but working families, who are the backbone of this country.”", "murray"],
    ["The bill also provides funding for summary deportations of unaccompanied children who have not been robustly screened for signs of trafficking.", "dan_goldman"],
  ]) notSupport(x, "deportations", pid);
});
await t("deportations: lower-case 'ice' is frozen water, not the agency (Huffman, Collins)", () => {
  for (const [x, pid] of [
    ["According to the county, the equipment has lasted beyond its projected lifespan and frequently suffers breakdowns which require trucking in ice from outside the region.", "jared_huffman"],
    ["Previously, the Cherryfield dam which was built in 1961 to address flooding caused by ice jams in the Narraguagus River, blocked passage of the fishway.", "collins"],
  ]) assert.equal(read(x, "deportations", pid), null, x);
});
await t("deportations: language that favours, expands or defends the policy still reads support", () => {
  for (const [x, pid] of [
    ["I applaud President Trump’s commitment to carrying out the largest deportation operation in American history, and I look forward to continuing to support your efforts in my great state.", "banks"],
    ["Senator Schmitt Defends ICE, Trump’s Deportation Efforts from the Senate Floor", "schmitt"],
    ["So I support ICE and their efforts to make sure that people are following the law.", "david_pan"],
    ["I support mass deportation of illegal aliens.", "x"],
    ["Delivers President Trump’s law-and-order agenda: deporting criminal illegal aliens, securing our border, and supporting law enforcement.", "hudson"],
  ]) assert.equal(read(x, "deportations", pid), "support", x);
});
await t("deportations: a page condemning mass deportation does not promote a support read", () => {
  const c = S.scoreRawRecord(page("zoe_lofgren", "deportations", "<h1>Lofgren Statement on Deportations</h1><p>Donald Trump's mass deportation agenda has once again produced a moral and economic disaster.</p><p>It is clear this Administration's only immigration policy priority is mass deportation.</p><p>I will keep fighting against mass deportations.</p>"));
  assert.equal(c.position, "oppose");
});

// ── Birthright citizenship ──
await t("birthright: defending or protecting birthright citizenship reads support (Ford, Frost)", () => {
  for (const [x, pid] of [
    ["These orders come just weeks after Attorney General Ford worked with colleagues across the country to defeat President Trump’s previous attempt to dismantle birthright citizenship in the Supreme Court.", "aaron_ford"],
    ["WASHINGTON, D.C. — Today, Congressman Maxwell Alejandro Frost (FL-10) released the following statement after the Supreme Court rejected efforts by the Trump Administration to undermine birthright citizenship guaranteed by the Fourteenth Amendment.", "maxwell_frost"],
    ["We reject efforts to undermine birthright citizenship.", "x"],
    ["I will defend birthright citizenship.", "x"],
    ["Defending birthright citizenship.", "matthew_platkin"],
  ]) assert.equal(read(x, "birthright_citizenship", pid), "support", x);
});
await t("birthright: backing its end or restriction reads oppose (Schmitt, Roy, Babin)", () => {
  for (const [x, pid] of [
    ["Senator Schmitt, Rep. Roy File Amicus Brief in Support of President Trump’s Birthright Citizenship Executive Order", "schmitt"],
    ["Rep. Roy, Senator Schmitt File Amicus Brief in Support of President Trump’s Birthright Citizenship Executive Order", "chip_roy"],
    ["The Birthright Citizenship Act aligns with President Donald J. Trump’s commitment to make birthright citizenship reform a national priority and restore the 14th Amendment to its original intent.", "brian_babin"],
    ["Moreno Announces Reintroduction of Harry Reid Bill to Eliminate Birthright Citizenship", "moreno"],
    ["I support ending birthright citizenship.", "x"],
  ]) assert.equal(read(x, "birthright_citizenship", pid), "oppose", x);
});
await t("birthright: 'overturn' / 'reject efforts to undermine' framing does not invert", () => {
  assert.equal(read("We will fight to overturn any order that attempts to end birthright citizenship.", "birthright_citizenship"), "support");
  assert.equal(read("We reject efforts by the Trump Administration to end birthright citizenship.", "birthright_citizenship"), "support");
  // Someone else's action is theirs, not the page's politician's.
  assert.equal(read("The Court rejected attempts to end birthright citizenship.", "birthright_citizenship"), null);
});

// ── pro_life / pro_choice ──
await t("abortion: Born-Alive Act support is pro-life, never oppose on pro_life (Lankford, Miller-Meeks, Westerman)", () => {
  for (const [x, pid] of [
    ["I supported the Born-Alive Abortion Survivors Protection Act .", "mariannette_miller_meeks"],
    ["Last, but certainly not least, we voted to pass the Born-Alive Abortion Services Act.", "bruce_westerman"],
    ["Lankford also introduced the Born-Alive Abortion Survivors Protection Act to protect infants who survived an abortion attempt.", "lankford"],
    ["“This bill holds the abortion industry accountable for providing mothers seeking abortion with crucial information before an abortion can be performed, hopefully saving innocent lives.", "lankford"],
  ]) {
    assert.equal(read(x, "pro_life", pid), "support", x);
    assert.notEqual(read(x, "pro_choice", pid), "support", x);
  }
  assert.notEqual(read("Unfortunately, there are still regions in our country where late-term abortions are available, and legal, for some women – increasing the chances of a born-alive child from an attempted abortion.", "pro_life", "bruce_westerman"), "oppose");
});
await t("abortion: opposing restrictions on abortion is pro-choice, not pro-life (jordan_mn, rehm_mn)", () => {
  for (const [x, pid] of [
    ["I will strongly oppose any attempts to restrict a person’s right to have an abortion.", "jordan_mn"],
    ["I’ll continue to oppose all legislation that attempts to limit access to abortion and other reproductive healthcare.", "rehm_mn"],
    ["As your State Representative, I will fight any attempts to restrict access to abortion, and work to undo existing restrictions that stand in the way of our reproductive freedom.", "jordan_mn"],
  ]) {
    assert.equal(read(x, "pro_life", pid), "oppose", x);
    assert.equal(read(x, "pro_choice", pid), "support", x);
  }
});
await t("abortion: someone else's view or an incidental reference is not the politician's position (Robert Garcia, Wyden)", () => {
  for (const [x, pid] of [
    ["The policy has caught the ire of conservatives who oppose abortion, but Tuberville’s blockade of military promotions has been the most public and attention-catching protest of the policy.", "robert_garcia"],
    ["The senator’s staff then asked Flock officials to implement in Oregon similar privacy filters that the company has already adopted in Illinois to prevent out-of-state police searches related to abortion or immigration.", "wyden"],
    ["To that end, medication abortion now accounts for 63% of all abortions in the health care system.", "dan_goldman"],
    ["The Association opposes any law that restricts abortion.", "jim_jordan"],
  ]) assert.notEqual(read(x, "pro_life", pid), "support", x);
});
await t("abortion: criticising the overturning of Roe is pro-choice (Landsman); attacking expanded access is not pro-choice (Brecheen)", () => {
  const landsman = "\"Overturning Roe v. Wade has had devastating consequences for abortion access, birth control, and reproductive care.";
  assert.equal(read(landsman, "pro_choice", "greg_landsman"), "support");
  assert.notEqual(read(landsman, "pro_life", "greg_landsman"), "support");
  const brecheen = "But we are also concerned that activist bureaucrats overlooked real public health risks posed by mifepristone in their crusade to expand abortion access.";
  assert.notEqual(read(brecheen, "pro_choice", "josh_brecheen"), "support");
});
await t("abortion: 'Roe v. Wade' and a middle initial in a dateline do not split the sentence (Warner)", () => {
  const body = "<p>WASHINGTON – U.S. Sen. Mark R. Warner (D-VA) issued the following statement after the Supreme Court overturned Roe v. Wade and eliminated the federal constitutional right to abortion in America.</p>";
  const list = S.extractSentences(body);
  assert.equal(list.length, 1, JSON.stringify(list));
  assert.ok(!list.some((x) => /^Wade\b/.test(x)));
  const c = S.scoreRawRecord(page("warner", "pro_life", body));
  assert.notEqual(c.position, "support");
  for (const [b, n] of [
    ["<p>WASHINGTON – U.S. Senators Mazie K. Hirono and Edward J. Markey said today that ICE must be held accountable.</p>", 1],
    ["<p>We need Plan B. The rest can wait.</p>", 2],
  ]) assert.equal(S.extractSentences(b).length, n, b);
});
await t("abortion: plain pro-choice and pro-life statements keep their sides", () => {
  assert.equal(read("I will fight to protect a woman's right to choose.", "pro_choice"), "support");
  assert.equal(read("Protecting abortion rights and rescinding the abortion ban.", "pro_life"), "oppose");
  assert.equal(read("I will always protect the unborn.", "pro_life"), "support");
  assert.equal(read("Today, the U.S. House of Representatives passed the No Taxpayer Funding for Abortion Act, which I cosponsored.", "pro_life"), "support");
});

// ── gun_safety / gun_rights ──
await t("guns: criticising a gun-safety bill never reads support on gun_safety (Boebert, Scalise, Crapo)", () => {
  for (const [x, pid] of [
    ["As passed, it would strip away the rights of millions of people while doing nothing at all to reduce gun violence.", "boebert"],
    ["On the failure of this legislation to prevent mass shootings:", "scalise"],
    ["“However, I have serious concerns with federal funds being used to help states establish ‘red flag laws.’", "crapo"],
    ["I oppose this gun control bill.", "x"],
    ["Rep. Boebert Introduces Bill to Repeal Rino Gun Grab", "boebert"],
  ]) {
    assert.notEqual(read(x, "gun_safety", pid), "support", x);
    assert.notEqual(read(x, "gun_rights", pid), "oppose", x);
  }
  assert.equal(read("As passed, it would strip away the rights of millions of people while doing nothing at all to reduce gun violence.", "gun_safety", "boebert"), "oppose");
  assert.equal(read("“However, I have serious concerns with federal funds being used to help states establish ‘red flag laws.’", "gun_safety", "crapo"), "oppose");
});
await t("guns: supporting a gun-safety measure is support on gun_safety and never support on gun_rights (Whitehouse, DeLauro, Goldman, Bobby Scott)", () => {
  for (const [x, pid] of [
    ["Reporting of Lost or Stolen Firearms: Requires gun owners to report lost or stolen firearms to the appropriate state or local law enforcement agency within 48 hours.", "bobby_scott"],
    ["[WASHINGTON, DC] – Today, U.S. Representative Rosa DeLauro (D-CT) and U.S. Senators Richard Blumenthal (D-CT) and Chris Murphy (D-CT) led a group of 186 Members of Congress in reintroducing Ethan’s Law, legislation requiring gun owners to safely and securely store their firearms.", "delauro"],
    ["Rep. Dan Goldman Introduces Bill to Close Loopholes Allowing Pre-Trial Defendants to Access Firearms", "dan_goldman"],
    ["Washington, D.C. – U.S. Senator Sheldon Whitehouse (D-RI) and Congresswoman Debbie Dingell (D-MI) have introduced the Domestic Violence Survivors Alerted for Emergency (SAFE) Notice Act, new legislation to establish notification systems that would alert survivors of domestic violence offenses when their domestic abuser attempts to purchase a firearm illegally.", "whitehouse"],
    ["I support universal background checks.", "x"],
  ]) {
    assert.notEqual(read(x, "gun_rights", pid), "support", x);
    assert.equal(read(x, "gun_safety", pid), "support", x);
  }
  // The page-level read: a bill-introduction lead whose purpose closes a gun loophole is not gun-rights support.
  const c = S.scoreRawRecord(page("dan_goldman", "gun_rights", "<h1>Rep. Dan Goldman Introduces Bill to Close Loopholes Allowing Pre-Trial Defendants to Access Firearms</h1><p>The bill would apply nationwide.</p>"));
  assert.notEqual(c.position, "support");
});
await t("guns: a neutral description of a shooter or a purchase carries zero weight (Grassley)", () => {
  for (const x of ["He legally purchased five guns in four different transactions, passing federal background checks each time.", "The shooter used an assault weapon he bought legally."]) {
    assert.equal(read(x, "gun_safety", "grassley"), null, x);
    assert.equal(read(x, "gun_rights", "grassley"), null, x);
  }
  assert.notEqual(read("In 2004, a Department of Justice study concluded that after a ten-year assault weapons ban, there was no statistically significant evidence that banning assault weapons reduced gun murders.", "gun_safety", "grassley"), "support");
});
await t("guns: plain gun-rights and gun-safety statements keep their sides", () => {
  assert.equal(read("I will always defend the Second Amendment.", "gun_rights"), "support");
  assert.equal(read("We must ban assault weapons.", "gun_safety"), "support");
  assert.equal(read("Crapo Joins ‘GRIP Act’ to Block State Gun Registries", "gun_rights", "crapo"), "support");
  assert.equal(read("As a longtime NRA member, Dr. Titus successfully led the fight to stop the egregious gun control bill.", "gun_rights", "robin_titus"), "support");
  assert.notEqual(read("All of these reforms can be accomplished without infringing on the Second Amendment rights of the many law-abiding gun owners in HD19.", "gun_safety", "jillaire_mcmillan"), "oppose");
});

// ── Scope ──
await t("only the four areas carry polarity frames; no issue key is added", () => {
  const framed = Object.keys(S.TOPIC_RULES).filter((k) => S.TOPIC_RULES[k].frameSupport || S.TOPIC_RULES[k].vetoSupport || S.TOPIC_RULES[k].vetoOppose).sort();
  assert.deepEqual(framed, ["birthright_citizenship", "deportations", "gun_rights", "gun_safety", "pro_choice", "pro_life"]);
  const issueKeys = JSON.parse(fs.readFileSync(path.join(root, "db/issue-keys.json"), "utf8")).keys;
  // The ground-truth leaves are registered but read on request, never swept.
  for (const k of GROUND_TRUTH_LEAF_KEYS) assert.ok(S.hasRulesFor(k) && !S.SCORED_TOPICS.includes(k), k);
  assert.deepEqual([...S.SCORED_TOPICS].sort(), issueKeys.filter((k) => !GROUND_TRUTH_LEAF_KEYS.includes(k)).sort());
});
await t("every ground-truth file is unchanged by this pass", () => {
  GT_PATHS.forEach((p, i) => assert.equal(fs.readFileSync(p, "utf8"), gtBefore[i], p));
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passed");
