// ─────────────────────────────────────────────────────────────────────────────
// Action layer — automatic publish gate (computed on read)
// ─────────────────────────────────────────────────────────────────────────────
// Decides which raw vote records (pdx_vote_actions) may appear on public pages.
// There is no stored flag and no review queue: every read recomputes the rules
// from the current tables, so mapping a member, adding a tag or storing a
// payload flips a roll call the next time anything reads it.
//
// THE GATE IS PER ROLL CALL (va-publish-v2). It used to be per bill: one roll
// call with a problem hid every roll call on the bill. Now the bill-level rules
// decide whether the bill can carry public rolls at all, and the roll-level rules
// are judged one roll call at a time, so a bill publishes its valid roll calls
// even when one of its roll calls is held.
//
//   BILL rules (over the pdx_action_bills row):
//     bill_record        the bill has a pdx_action_bills row
//     not_nomination     it is not a nomination (nominations stay excluded)
//     has_topic_tag      it carries at least one topic tag
//   ROLL rules (over every vote row of ONE roll call):
//     has_votes          the roll call has at least one vote row
//     members_mapped     every member on it is IDENTIFIED: no row whose member
//                        id never resolved (a Senate LIS id with no bioguide id).
//                        A member who IS identified but has no PolitiDex file (a
//                        House delegate, a member the roster does not carry) does
//                        not hold the roll: their row is left off every public
//                        list, because there is no page to name them on, and the
//                        rest of the roll call publishes. Nobody is guessed.
//     vote_kind_known    no vote row has an unclassified vote kind
//     raw_payload_stored every vote row points at its stored, parsed source payload
// A bill is publishable when its bill rules hold and at least one of its roll
// calls passes. Procedural votes ARE publishable; each public roll carries
// `procedural` so the reader-facing note labels it.
//
// The signals are the same ones the curator status page reports as rates
// (vote-actions-quality.ts): unmapped rows, untagged bills, unknown kind, raw_ref.
// Pure: no database, no Blobs, no network. Data comes in through injected deps.

export const PUBLISH_RULES_VERSION = "va-publish-v2";

// Counts over a set of vote rows: a whole bill (vote-actions-db.ts
// billPublishStats) or one roll call (rollPublishStats, which adds the roll key).
export type BillPublishStats = {
  billKey: string;
  measureType: string | null;
  tagCount: number;
  rows: number;            // vote rows counted
  unmappedRows: number;    // rows with politician_id NULL (identified off-roster members included)
  // Rows whose member could not be identified at all (politician_id AND
  // bioguide_id NULL: a Senate LIS id that never resolved). Absent = unknown,
  // and then every unmapped row is treated as unidentified, the strict reading.
  unresolvedRows?: number;
  unknownKindRows: number; // rows whose vote kind is 'unknown' / is_procedural NULL
  missingRawRows: number;  // rows with raw_ref NULL
  proceduralRows?: number;
  rolls?: number;
};
export type RollPublishStats = BillPublishStats & { chamber: string; congress: number; session: number; rollNumber: number };

const unidentified = (s: BillPublishStats) =>
  Number(s.unresolvedRows ?? s.unmappedRows) || 0;

type Rule = { id: string; label: string; scope: "bill" | "roll"; pass: (s: BillPublishStats) => boolean };
export const PUBLISH_RULES: Rule[] = [
  { id: "not_nomination", scope: "bill", label: "not a nomination", pass: (s) => s.measureType !== "nomination" },
  { id: "has_topic_tag", scope: "bill", label: "at least one topic tag", pass: (s) => (Number(s.tagCount) || 0) > 0 },
  { id: "has_votes", scope: "roll", label: "at least one vote row", pass: (s) => (Number(s.rows) || 0) > 0 },
  { id: "members_mapped", scope: "roll", label: "every member identified (a member with no PolitiDex file is left off, never guessed)", pass: (s) => unidentified(s) === 0 },
  { id: "vote_kind_known", scope: "roll", label: "every vote kind classified", pass: (s) => (Number(s.unknownKindRows) || 0) === 0 },
  { id: "raw_payload_stored", scope: "roll", label: "every vote row has its stored source payload", pass: (s) => (Number(s.missingRawRows) || 0) === 0 },
];
export const BILL_RULES = PUBLISH_RULES.filter((r) => r.scope === "bill");
export const ROLL_RULES = PUBLISH_RULES.filter((r) => r.scope === "roll");

export const rollKey = (r: { chamber: string; congress: number | string; session: number | string; rollNumber?: number | string; roll?: number | string }) =>
  `${r.chamber}|${r.congress}|${r.session}|${r.rollNumber ?? r.roll}`;

export type BillPublish = { billKey: string; publishable: boolean; failed: string[] };
// Every rule over one set of counts — the whole bill read as if it were one roll
// call. Kept for callers that only have bill totals; the public reads below use
// evaluateBillRules + evaluateRoll. `s` null/undefined = no bill row on file.
export function evaluateBill(billKey: string, s: BillPublishStats | null | undefined): BillPublish {
  if (!s) return { billKey, publishable: false, failed: ["bill_record"] };
  const failed = PUBLISH_RULES.filter((r) => !r.pass(s)).map((r) => r.id);
  return { billKey, publishable: failed.length === 0, failed };
}
// The bill-level rules only: may this bill carry public roll calls at all?
export function evaluateBillRules(billKey: string, s: BillPublishStats | null | undefined): BillPublish {
  if (!s) return { billKey, publishable: false, failed: ["bill_record"] };
  const failed = BILL_RULES.filter((r) => !r.pass(s)).map((r) => r.id);
  return { billKey, publishable: failed.length === 0, failed };
}
export type RollPublish = { key: string; publishable: boolean; failed: string[] };
// The roll-level rules over ONE roll call. `s` missing = no rows for that roll.
export function evaluateRoll(key: string, s: BillPublishStats | null | undefined): RollPublish {
  if (!s) return { key, publishable: false, failed: ["has_votes"] };
  const failed = ROLL_RULES.filter((r) => !r.pass(s)).map((r) => r.id);
  return { key, publishable: failed.length === 0, failed };
}

// One bill's gate: the bill rules, then each roll call on its own. Without
// per-roll counts (`rolls` omitted) the bill's totals stand in for a single roll,
// which is the old all-or-nothing reading — never looser than the per-roll one.
export function evaluateBillRolls(billKey: string, bill: BillPublishStats | null | undefined, rolls?: RollPublishStats[] | null) {
  const b = evaluateBillRules(billKey, bill);
  const perRoll: Record<string, RollPublish> = {};
  if (rolls) for (const r of rolls) perRoll[rollKey(r)] = evaluateRoll(rollKey(r), r);
  const whole = rolls ? null : evaluateRoll(billKey, bill);
  const passing = rolls ? Object.values(perRoll).filter((r) => r.publishable).length : whole && whole.publishable ? 1 : 0;
  const rollFailed = rolls
    ? [...new Set(Object.values(perRoll).flatMap((r) => r.failed))]
    : (whole ? whole.failed : []);
  return {
    billKey,
    bill: b,
    rolls: perRoll,
    // The bill-level answer the curator note and the status page read: public
    // when its rules hold and at least one roll call passes. `failed` names the
    // bill rules that failed, then any roll rule some roll call failed.
    publish: {
      billKey,
      publishable: b.publishable && passing > 0,
      failed: [...b.failed, ...ROLL_RULES.map((r) => r.id).filter((id) => rollFailed.includes(id))],
      ...(rolls ? { rollsPublishable: passing, rollsHeld: Object.keys(perRoll).length - passing } : {}),
    } as BillPublish & { rollsPublishable?: number; rollsHeld?: number },
    // Is this roll call public? (bill rules AND its own roll rules)
    rollPublic(r: { chamber: string; congress: number | string; session: number | string; rollNumber?: number | string; roll?: number | string }) {
      if (!b.publishable) return false;
      if (!rolls) return !!(whole && whole.publishable);
      const g = perRoll[rollKey(r)];
      return !!(g && g.publishable);
    },
  };
}

// Curator status: how many bills and roll calls pass, and how many fail each rule.
export function publishSummary(stats: BillPublishStats[] | null | undefined, rollStats?: RollPublishStats[] | null) {
  const byBill = new Map<string, RollPublishStats[]>();
  for (const r of rollStats || []) {
    const list = byBill.get(r.billKey) || [];
    list.push(r);
    byBill.set(r.billKey, list);
  }
  const perRoll = !!rollStats;
  const all = (stats || []).map((s) => evaluateBillRolls(s.billKey, s, perRoll ? byBill.get(s.billKey) || [] : null));
  const failingByRule: Record<string, number> = {};
  for (const r of PUBLISH_RULES) failingByRule[r.id] = 0;
  for (const b of all) for (const f of b.publish.failed) failingByRule[f] = (failingByRule[f] || 0) + 1;
  const n = all.filter((b) => b.publish.publishable).length;
  const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
  const text = (a: number, b: number) => { const p = pctOf(a, b); return p === null ? `${a} / ${b} (n/a)` : `${a} / ${b} (${p.toFixed(1)}%)`; };
  const out: any = {
    rulesVersion: PUBLISH_RULES_VERSION,
    rules: PUBLISH_RULES.map((r) => ({ id: r.id, label: r.label, scope: r.scope })),
    publishableBills: { n, of: all.length, pct: pctOf(n, all.length), text: text(n, all.length) },
    failingByRule,
  };
  if (perRoll) {
    // Every roll call on a bill whose bill rules hold, judged on its own.
    let rolls = 0, pub = 0;
    const failingRollsByRule: Record<string, number> = {};
    for (const r of ROLL_RULES) failingRollsByRule[r.id] = 0;
    for (const b of all) {
      if (!b.bill.publishable) continue;
      for (const g of Object.values(b.rolls)) {
        rolls++;
        if (g.publishable) pub++;
        for (const f of g.failed) failingRollsByRule[f] = (failingRollsByRule[f] || 0) + 1;
      }
    }
    out.publishableRolls = { n: pub, of: rolls, pct: pctOf(pub, rolls), text: text(pub, rolls) };
    out.failingRollsByRule = failingRollsByRule;
  }
  return out;
}

// One raw vote row as the DB read returns it (see voteActionsForPolitician).
export type PoliticianVoteRow = {
  billKey: string; chamber: string; congress: number; session: number; rollNumber: number; voteDate: string | Date | null;
  vote: string; voteRaw?: string | null; voteKind?: string | null; isProcedural?: boolean | null; question?: string | null;
  sourceUrl: string; sourceLabel?: string | null; rawRef?: string | null;
};
// One raw vote row of a bill, every member (see voteActionsForBill).
export type BillVoteRow = PoliticianVoteRow & {
  politicianId: string | null; memberName?: string | null; party?: string | null; state?: string | null; result?: string | null;
};
export type PublishDeps = {
  rowsForPolitician: (pid: string) => Promise<PoliticianVoteRow[]>;
  statsForBills: (billKeys: string[]) => Promise<BillPublishStats[]>;
  // Per-roll counts for the same bills. Without it the gate falls back to the
  // bill totals (all-or-nothing), which is never looser.
  statsForRolls?: (billKeys: string[]) => Promise<RollPublishStats[]>;
  rowsForBill?: (billKey: string) => Promise<BillVoteRow[]>;
  // Number, title and kind of each bill, so a list of rolls can name its bill.
  billInfo?: (billKeys: string[]) => Promise<BillInfo[]>;
  // The roll-call page and the "what changed" feed (read-only lookups).
  billKeyForRoll?: (r: { chamber: string; congress: number; session: number; roll: number }) => Promise<string | null>;
  recentRolls?: (limit: number) => Promise<RecentRoll[]>;
};
export type RecentRoll = {
  billKey: string; chamber: string; congress: number; session: number; rollNumber: number; voteDate: string | Date | null;
  question?: string | null; result?: string | null; sourceUrl?: string | null; sourceLabel?: string | null; procedural?: boolean;
};
export type BillInfo = { billKey: string; congress: number | null; measureType: string; number: string | null; title: string; shortTitle?: string | null };

// The public label of a bill: its citation, a title, and the /b/ address when
// the bill has one (a nomination or a measure with no citation has none).
function infoOut(b: BillInfo) {
  const number = b.number ? String(b.number) : null;
  const page = number && b.congress && b.measureType !== "nomination"
    ? `/b/${encodeURIComponent(String(b.congress))}/${encodeURIComponent(number)}` : null;
  return { number, title: String(b.shortTitle || b.title || "").trim() || null, measureType: b.measureType, congress: b.congress, page };
}

const iso = (d: unknown) => (d ? new Date(d as any).toISOString() : null);

async function gatesFor(keys: string[], deps: PublishDeps) {
  const stats = keys.length ? await deps.statsForBills(keys) : [];
  const rollStats = deps.statsForRolls && keys.length ? await deps.statsForRolls(keys) : null;
  const byKey = new Map(stats.map((s) => [s.billKey, s]));
  const rollsBy = new Map<string, RollPublishStats[]>();
  for (const r of rollStats || []) { const l = rollsBy.get(r.billKey) || []; l.push(r); rollsBy.set(r.billKey, l); }
  const gates = new Map<string, ReturnType<typeof evaluateBillRolls>>();
  for (const k of keys) gates.set(k, evaluateBillRolls(k, byKey.get(k), rollStats ? rollsBy.get(k) || [] : null));
  return gates;
}

// THE PUBLIC READ. Only rolls that pass the gate leave this function, and only
// public fields: no member id, no politician id of anyone else, no raw key.
export async function publishedForPolitician(pid: string, deps: PublishDeps) {
  const rows = await deps.rowsForPolitician(pid);
  const keys = [...new Set(rows.map((r) => r.billKey).filter(Boolean))];
  const gates = await gatesFor(keys, deps);
  const billKeys: Record<string, any[]> = {};
  let rolls = 0;
  for (const r of rows) {
    const g = gates.get(r.billKey);
    if (!g || !g.rollPublic(r)) continue;
    rolls++;
    (billKeys[r.billKey] ||= []).push({
      chamber: r.chamber, congress: r.congress, session: r.session, roll: r.rollNumber, date: iso(r.voteDate),
      vote: r.vote, voteRaw: r.voteRaw ?? null, voteKind: r.voteKind ?? null, procedural: r.isProcedural === true,
      question: r.question ?? null, sourceUrl: r.sourceUrl, sourceLabel: r.sourceLabel ?? null,
    });
  }
  const out: any = { pid, rulesVersion: PUBLISH_RULES_VERSION, bills: Object.keys(billKeys).length, rolls, billKeys };
  if (deps.billInfo && Object.keys(billKeys).length) {
    out.info = {};
    for (const b of await deps.billInfo(Object.keys(billKeys))) out.info[b.billKey] = infoOut(b);
  }
  return out;
}

// THE PUBLIC BILL READ: every roll call on one bill that passes the gate, with
// its member votes. Members are listed only when they have a PolitiDex file
// (politician id), by their roster id and the name the official record prints.
// Totals count every recorded row on the roll call, listed or not, so the
// numbers are the record's own; `unlisted` says how many rows had no file.
export async function publishedForBill(billKey: string, deps: PublishDeps) {
  const empty = { billKey, rulesVersion: PUBLISH_RULES_VERSION, rolls: [] as any[] };
  if (!deps.rowsForBill) return empty;
  const gates = await gatesFor([billKey], deps);
  const g = gates.get(billKey);
  if (!g || !g.bill.publishable) return empty;
  const rows = await deps.rowsForBill(billKey);
  const byRoll = new Map<string, BillVoteRow[]>();
  for (const r of rows) {
    if (!g.rollPublic(r)) continue;
    const k = rollKey(r);
    const l = byRoll.get(k) || [];
    l.push(r);
    byRoll.set(k, l);
  }
  const VOTES = ["yes", "no", "present", "not_voting"];
  const out = [...byRoll.values()].map((list) => {
    const r0 = list[0];
    const totals: Record<string, number> = { yes: 0, no: 0, present: 0, not_voting: 0 };
    const members: any[] = [];
    let unlisted = 0;
    for (const r of list) {
      if (VOTES.includes(r.vote)) totals[r.vote]++;
      if (!r.politicianId) { unlisted++; continue; }
      members.push({ pid: r.politicianId, name: r.memberName ?? null, party: r.party ?? null, state: r.state ?? null, vote: r.vote, voteRaw: r.voteRaw ?? null });
    }
    members.sort((a, b) => VOTES.indexOf(a.vote) - VOTES.indexOf(b.vote) || String(a.name || a.pid).localeCompare(String(b.name || b.pid)));
    const sourceUrl = list.map((x) => x.sourceUrl).find((u) => /^https?:\/\//.test(String(u || ""))) || null;
    return {
      chamber: r0.chamber, congress: r0.congress, session: r0.session, roll: r0.rollNumber, date: iso(r0.voteDate),
      question: list.map((x) => x.question).find(Boolean) ?? null, result: list.map((x) => x.result).find(Boolean) ?? null,
      voteKind: r0.voteKind ?? null, procedural: r0.isProcedural === true,
      sourceUrl, sourceLabel: r0.sourceLabel ?? null, totals, unlisted, members,
    };
  });
  out.sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || a.chamber.localeCompare(b.chamber) || a.roll - b.roll);
  const info = out.length && deps.billInfo ? (await deps.billInfo([billKey]))[0] : null;
  return { billKey, rulesVersion: PUBLISH_RULES_VERSION, ...(info ? { info: infoOut(info) } : {}), rolls: out };
}

// The curator read: every row (with raw keys), plus each bill's gate result and
// each row's own roll-call gate result.
export async function curatorLinksForPolitician(pid: string, deps: PublishDeps) {
  const rows = await deps.rowsForPolitician(pid);
  const keys = [...new Set(rows.map((r) => r.billKey).filter(Boolean))];
  const gates = await gatesFor(keys, deps);
  const billKeys: Record<string, any[]> = {};
  const publish: Record<string, BillPublish> = {};
  for (const r of rows) {
    if (!r || !r.billKey) continue;
    const g = gates.get(r.billKey)!;
    publish[r.billKey] ||= g.publish;
    const rg = g.rolls[rollKey(r)];
    (billKeys[r.billKey] ||= []).push({
      chamber: r.chamber, congress: r.congress, session: r.session, roll: r.rollNumber, date: iso(r.voteDate),
      vote: r.vote, voteRaw: r.voteRaw ?? null, voteKind: r.voteKind ?? null, procedural: r.isProcedural === true,
      question: r.question ?? null, sourceUrl: r.sourceUrl, sourceLabel: r.sourceLabel ?? null, rawRef: r.rawRef ?? null,
      gate: { publishable: g.rollPublic(r), failed: [...g.bill.failed, ...(rg ? rg.failed : [])] },
    });
  }
  return { pid, rulesVersion: PUBLISH_RULES_VERSION, bills: Object.keys(billKeys).length, billKeys, publish };
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5 reads. None of them changes a rule: each one goes through the same
// gate (gatesFor / publishedForBill) the person and bill reads use.
// ─────────────────────────────────────────────────────────────────────────────

// The public address of one roll call's page.
export const rollPagePath = (r: { chamber: string; congress: number | string; session: number | string; roll?: number | string; rollNumber?: number | string }) =>
  `/vote/${encodeURIComponent(String(r.congress))}/${encodeURIComponent(String(r.chamber))}/${encodeURIComponent(String(r.session))}/${encodeURIComponent(String(r.roll ?? r.rollNumber))}`;

// THE PUBLIC ROLL-CALL READ: one roll call, only when it passes the gate, with
// its bill and member votes exactly as publishedForBill returns them. null = no
// such roll call on file, or it is held.
export async function publishedRollCall(r: { chamber: string; congress: number; session: number; roll: number }, deps: PublishDeps) {
  if (!deps.billKeyForRoll) return null;
  const billKey = await deps.billKeyForRoll(r);
  if (!billKey) return null;
  const bill = await publishedForBill(billKey, deps);
  const roll = (bill.rolls || []).find((x: any) =>
    x.chamber === r.chamber && Number(x.congress) === r.congress && Number(x.session) === r.session && Number(x.roll) === r.roll);
  if (!roll) return null;
  return { billKey, rulesVersion: PUBLISH_RULES_VERSION, info: (bill as any).info || null, roll, page: rollPagePath(roll) };
}

// The newest published roll calls, newest first: the "what changed" feed's
// vote lane. Rolls are read newest first and filtered through the gate.
export async function recentPublishedRolls(deps: PublishDeps, limit = 30) {
  if (!deps.recentRolls) return [];
  const rows = await deps.recentRolls(limit * 4);
  const keys = [...new Set(rows.map((r) => r.billKey).filter(Boolean))];
  const gates = await gatesFor(keys, deps);
  const out = rows.filter((r) => { const g = gates.get(r.billKey); return !!(g && g.rollPublic(r)); }).slice(0, limit);
  const info: Record<string, any> = {};
  if (deps.billInfo && out.length) for (const b of await deps.billInfo([...new Set(out.map((r) => r.billKey))])) info[b.billKey] = infoOut(b);
  return out.map((r) => ({
    chamber: r.chamber, congress: r.congress, session: r.session, roll: r.rollNumber, date: iso(r.voteDate),
    question: r.question ?? null, result: r.result ?? null, procedural: r.procedural === true,
    sourceUrl: /^https?:\/\//.test(String(r.sourceUrl || "")) ? r.sourceUrl : null, sourceLabel: r.sourceLabel ?? null,
    bill: info[r.billKey] || null, page: rollPagePath(r),
  }));
}

// Attendance over one person's PUBLISHED roll calls (publishedForPolitician's
// output): how many they were recorded on, and how many of those list them as
// not voting. A count of the roll calls on this site, not an official score:
// it covers only the roll calls that have passed the gate.
export function attendanceFrom(published: { billKeys?: Record<string, any[]> } | null | undefined) {
  const out = { rolls: 0, voted: 0, notVoting: 0, present: 0, missedPct: null as number | null, first: null as string | null, last: null as string | null };
  const seen = new Set<string>();
  for (const list of Object.values(published?.billKeys || {})) {
    for (const r of list || []) {
      const k = `${r.chamber}|${r.congress}|${r.session}|${r.roll}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.rolls++;
      if (r.vote === "not_voting") out.notVoting++;
      else { out.voted++; if (r.vote === "present") out.present++; }
      const d = r.date ? String(r.date).slice(0, 10) : null;
      if (d && (!out.first || d < out.first)) out.first = d;
      if (d && (!out.last || d > out.last)) out.last = d;
    }
  }
  if (out.rolls) out.missedPct = Math.round((out.notVoting / out.rolls) * 1000) / 10;
  return out;
}
