// ════════════════════════════════════════════════════════════════════
// PolitiDex — Live Multi-AI Verification
// Fact-cross-references a promise or claim across several leading AI models
// (Claude, Gemini, GPT) in parallel via the Netlify AI Gateway. No API keys
// are stored or shipped to the browser — the gateway injects them server-side.
// Returns each model's verdict, confidence level, reasoning and suggested
// sources, plus a blended consensus.
// ════════════════════════════════════════════════════════════════════
import type { Context } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenAI } from '@google/genai'

// The panel of models we cross-reference. Each entry is a real model exposed
// through the Netlify AI Gateway. Labels are what the UI shows the visitor.
const PANEL = [
  { id: 'claude', label: 'Claude', provider: 'Anthropic', model: 'claude-sonnet-4-5' },
  { id: 'gemini', label: 'Gemini', provider: 'Google',    model: 'gemini-2.5-flash' },
  { id: 'gpt',    label: 'GPT',    provider: 'OpenAI',    model: 'gpt-4o' },
]

const VALID_VERDICTS = ['Likely True', 'Mostly True', 'Mixed', 'Mostly False', 'Likely False', 'Unverifiable']

function buildPrompt(politician: string, office: string, claim: string) {
  return [
    'You are an impartial, non-partisan political fact-checker. Assess the factual accuracy of the following claim or promise.',
    '',
    politician ? `Politician: ${politician}` : '',
    office ? `Office / context: ${office}` : '',
    `Claim or promise to verify: "${claim}"`,
    '',
    'Rules:',
    '- Be neutral and evidence-driven. Do not take a partisan side.',
    '- Base your assessment only on what you actually know. If you cannot verify it, say so honestly.',
    '- Only cite sources you are genuinely confident exist (e.g. congress.gov, the politician\'s official site, major outlets, government records). Never invent URLs. If unsure of an exact URL, give the publisher name with an empty url.',
    '',
    'Respond with ONLY a JSON object (no markdown, no prose) in exactly this shape:',
    '{',
    '  "verdict": one of ["Likely True","Mostly True","Mixed","Mostly False","Likely False","Unverifiable"],',
    '  "confidence": integer 0-100 (how confident you are in your verdict),',
    '  "summary": "2-4 sentence plain-English explanation of your reasoning",',
    '  "sources": [{"label":"Source name","url":"https://... or empty string"}]  (0-3 items)',
    '}',
  ].filter(Boolean).join('\n')
}

// Pull a JSON object out of a model response that may be wrapped in prose or
// ```json fences. Returns null if nothing parseable is found.
function extractJSON(text: string): any {
  if (!text) return null
  let t = text.trim()
  // strip code fences
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try { return JSON.parse(t) } catch {}
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)) } catch {}
  }
  return null
}

function normalize(raw: any) {
  const out: any = { verdict: 'Unverifiable', confidence: 0, summary: '', sources: [] }
  if (raw && typeof raw === 'object') {
    if (typeof raw.verdict === 'string') {
      const match = VALID_VERDICTS.find(v => v.toLowerCase() === raw.verdict.trim().toLowerCase())
      out.verdict = match || raw.verdict.trim().slice(0, 40)
    }
    const c = Number(raw.confidence)
    if (!isNaN(c)) out.confidence = Math.max(0, Math.min(100, Math.round(c)))
    if (typeof raw.summary === 'string') out.summary = raw.summary.trim().slice(0, 1200)
    if (Array.isArray(raw.sources)) {
      out.sources = raw.sources.slice(0, 4).map((s: any) => ({
        label: (s && typeof s.label === 'string' ? s.label : (typeof s === 'string' ? s : 'Source')).slice(0, 120),
        url: (s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url)) ? s.url.slice(0, 500) : '',
      })).filter((s: any) => s.label)
    }
  }
  return out
}

// Race a promise against a timeout so one slow provider can't stall the panel.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

const PER_MODEL_TIMEOUT = 8500

async function askClaude(prompt: string, model: string) {
  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })
  const block = msg.content.find((b: any) => b.type === 'text') as any
  return block?.text || ''
}

async function askOpenAI(prompt: string, model: string) {
  const openai = new OpenAI()
  const completion = await openai.chat.completions.create({
    model,
    max_tokens: 600,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are an impartial political fact-checker. Reply with a single JSON object only.' },
      { role: 'user', content: prompt },
    ],
  })
  return completion.choices[0]?.message?.content || ''
}

async function askGemini(prompt: string, model: string) {
  const ai = new GoogleGenAI({})
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json', maxOutputTokens: 600 },
  })
  return res.text || ''
}

async function runModel(entry: typeof PANEL[number], prompt: string) {
  try {
    let text = ''
    if (entry.id === 'claude') text = await withTimeout(askClaude(prompt, entry.model), PER_MODEL_TIMEOUT)
    else if (entry.id === 'gpt') text = await withTimeout(askOpenAI(prompt, entry.model), PER_MODEL_TIMEOUT)
    else if (entry.id === 'gemini') text = await withTimeout(askGemini(prompt, entry.model), PER_MODEL_TIMEOUT)
    const parsed = normalize(extractJSON(text))
    return { id: entry.id, label: entry.label, provider: entry.provider, model: entry.model, ok: true, ...parsed }
  } catch (err: any) {
    const reason = (err && err.message === 'timeout') ? 'timed out' : 'unavailable'
    return {
      id: entry.id, label: entry.label, provider: entry.provider, model: entry.model,
      ok: false, verdict: 'No response', confidence: 0,
      summary: `This model was ${reason}. Verification continues with the remaining models.`,
      sources: [],
    }
  }
}

// Blend the panel into a single headline consensus.
const VERDICT_SCORE: Record<string, number> = {
  'Likely True': 100, 'Mostly True': 75, 'Mixed': 50, 'Unverifiable': 50,
  'Mostly False': 25, 'Likely False': 0,
}
function buildConsensus(results: any[]) {
  const answered = results.filter(r => r.ok && r.verdict !== 'No response')
  if (!answered.length) return { verdict: 'Inconclusive', confidence: 0, agreement: 0, answered: 0 }
  let weighted = 0, totalW = 0
  const counts: Record<string, number> = {}
  answered.forEach(r => {
    const score = VERDICT_SCORE[r.verdict]
    const w = Math.max(10, r.confidence)
    if (typeof score === 'number') { weighted += score * w; totalW += w }
    counts[r.verdict] = (counts[r.verdict] || 0) + 1
  })
  const avg = totalW ? weighted / totalW : 50
  let verdict = 'Mixed'
  if (avg >= 85) verdict = 'Likely True'
  else if (avg >= 62) verdict = 'Mostly True'
  else if (avg >= 38) verdict = 'Mixed'
  else if (avg >= 15) verdict = 'Mostly False'
  else verdict = 'Likely False'
  // agreement = share of models landing on the modal (most common) verdict
  const top = Object.values(counts).reduce((m, n) => Math.max(m, n), 0)
  const agreement = Math.round((top / answered.length) * 100)
  const confidence = Math.round(answered.reduce((s, r) => s + r.confidence, 0) / answered.length)
  return { verdict, confidence, agreement, answered: answered.length }
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }
  let body: any
  try { body = await req.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }

  const politician = (body.politician || '').toString().trim().slice(0, 200)
  const office = (body.office || '').toString().trim().slice(0, 200)
  const claim = (body.claim || '').toString().trim().slice(0, 1000)

  if (!claim) return Response.json({ ok: false, error: 'A claim or promise is required.' }, { status: 400 })

  const prompt = buildPrompt(politician, office, claim)

  let results: any[]
  try {
    results = await Promise.all(PANEL.map(entry => runModel(entry, prompt)))
  } catch (err: any) {
    return Response.json({ ok: false, error: 'Verification failed: ' + (err?.message || 'unknown error') }, { status: 502 })
  }

  const consensus = buildConsensus(results)
  return Response.json({
    ok: true,
    claim,
    politician,
    office,
    results,
    consensus,
    disclaimer: 'AI assessments reflect each model\'s training knowledge, not a live web search. Suggested sources are AI-generated and should be independently verified. Use this as a starting point — not a final ruling.',
    generatedAt: new Date().toISOString(),
  })
}

export const config = {
  path: '/api/verify-claim',
}
