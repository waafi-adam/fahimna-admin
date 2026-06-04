// Server-only LLM helper for tashreef (verb conjugation) correction suggestions.
// Talks to OpenRouter's OpenAI-compatible chat-completions endpoint so the model
// is swappable (Claude / GPT / Gemini / …) — pick whichever handles Arabic
// morphology best. NEVER import this into a 'use client' file: it reads the API
// key from the server environment.

import type {
  Tashreef,
  ConjugationKey,
  ImperativeKey,
} from './types';
import { lemmaById, lemmaForms } from './reference';

// The full 14-cell paradigm and the imperative's 2nd-person-only cells. Kept in
// sync with TashreefEditor's CONJ_KEYS / AMR_KEYS.
const CONJ_KEYS: ConjugationKey[] = [
  '3ms', '3md', '3mp', '3fs', '3fd', '3fp',
  '2ms', '2md', '2mp', '2fs', '2fd', '2fp',
  '1s', '1p',
];
const AMR_KEYS: ImperativeKey[] = ['2ms', '2md', '2mp', '2fs', '2fd', '2fp'];

// Default model when neither the request nor OPENROUTER_MODEL env var sets one.
// Any OpenRouter model slug works — see https://openrouter.ai/models. The UI
// lets you override this per-request so you can compare models.
export const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Stable (no dates / per-request data) so it stays cacheable and reproducible.
const SYSTEM_PROMPT = `You are an expert in Arabic verbal morphology (الصرف). You correct the full conjugation paradigm (التصريف) of a single Arabic verb lemma.

You receive a JSON object with:
- "lemma": the Arabic lemma and some of its surface forms,
- "attestedForms": Arabic word forms actually attested for this lemma in the Qur'an (ground truth — trust these spellings over your own guesses),
- "currentTashreef": the existing conjugation tables (may contain mistakes),
- "comment": an optional instruction from a human reviewer describing what to fix.

Correct the tables. Return ONLY a JSON object of this exact shape:
{
  "tashreef": {
    "past":            { <conjugation cells> },   // الماضي (active past) — required
    "present":         { <conjugation cells> },   // المضارع (active present) — required
    "amr":             { <imperative cells> },     // الأمر — include only if the verb has an imperative
    "passivePast":     { <conjugation cells> },   // الماضي المجهول — include only if it exists
    "passivePresent":  { <conjugation cells> },   // المضارع المجهول — include only if it exists
    "masdar":  "…",   // المصدر (verbal noun) or null
    "fa3il":   "…",   // اسم الفاعل (active participle) or null
    "maf3ul":  "…"    // اسم المفعول (passive participle) or null
  },
  "notes": "Brief plain-text explanation of the corrections you made, cell by cell where useful."
}

Conjugation cell keys (person · gender · number):
- 3ms 3md 3mp = 3rd masc. singular/dual/plural; 3fs 3fd 3fp = 3rd fem. singular/dual/plural
- 2ms 2md 2mp = 2nd masc. singular/dual/plural; 2fs 2fd 2fp = 2nd fem. singular/dual/plural
- 1s 1p = 1st person singular/plural
The imperative (amr) only has the six 2nd-person cells.

Rules:
- Write every form in Arabic script WITH full diacritics (تشكيل).
- Use exactly the cell keys listed above — no others.
- If a particular cell or table genuinely does not exist for this verb, use null (for a cell) or omit the optional table entirely. Do not invent forms.
- Prefer spellings consistent with "attestedForms" when they apply.
- If "comment" is present, prioritise the fix it describes.
- ALWAYS return the COMPLETE corrected paradigm: every cell of "past" and "present" filled (all 14 each), and every other table that exists for this verb fully populated. NEVER return empty tables ({}) or omit cells that exist — even cells that are already correct must be included with their correct value, so the reviewer sees the full paradigm.
- Output JSON only — no markdown, no commentary outside the JSON.`;

export type TashreefSuggestion = {
  suggestion: Tashreef;
  notes: string;
  model: string;
};

export async function suggestTashreef(opts: {
  lemmaId: number;
  current: Tashreef;
  comment?: string | null;
  model?: string | null;
}): Promise<TashreefSuggestion> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set on the server');

  const model =
    (opts.model && opts.model.trim()) ||
    process.env.OPENROUTER_MODEL ||
    DEFAULT_MODEL;

  const lemma = lemmaById(opts.lemmaId);
  // Attested Arabic surface forms for this lemma — strong grounding context.
  const attestedForms = lemmaForms(opts.lemmaId).slice(0, 40).map((f) => f[0]);

  const userPayload = {
    lemma: lemma
      ? { arabic: lemma.arabic, words: lemma.words }
      : { id: opts.lemmaId },
    attestedForms,
    currentTashreef: opts.current,
    comment: opts.comment?.trim() || null,
  };

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // OpenRouter attribution headers (optional but recommended).
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://fahimna-admin',
      'X-Title': 'Fahimna Admin',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
      // JSON object mode forces valid JSON without constraining the shape. We
      // deliberately do NOT use json_schema here: with a loose schema, some
      // models (incl. Claude via OpenRouter) "satisfy" it by returning the
      // minimal empty structure ({past:{},present:{}}) instead of doing the
      // work. The strong system prompt + extractJson + sanitizeTashreef handle
      // shape/robustness instead.
      response_format: { type: 'json_object' },
      // Enough room for 5 fully-diacritised 14-cell tables + participles.
      max_tokens: 4096,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const content: unknown = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('Model returned no content');
  }

  const parsed = extractJson(content);
  if (!parsed) throw new Error('Could not parse JSON from model output');

  return {
    suggestion: sanitizeTashreef(parsed.tashreef),
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    model,
  };
}

// Tolerant JSON extraction — handles a bare object, ```json fenced blocks, or
// stray prose around the object.
function extractJson(raw: string): { tashreef?: unknown; notes?: unknown } | null {
  const tryParse = (s: string) => {
    try { return JSON.parse(s); } catch { return null; }
  };
  let out = tryParse(raw.trim());
  if (out && typeof out === 'object') return out;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    out = tryParse(fenced[1].trim());
    if (out && typeof out === 'object') return out;
  }

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last > first) {
    out = tryParse(raw.slice(first, last + 1));
    if (out && typeof out === 'object') return out;
  }
  return null;
}

// Coerce arbitrary model output into a clean Tashreef. Unknown keys are dropped,
// non-string cells become null, blank strings become null. This is the guard
// that keeps a misbehaving model from ever writing a malformed shape into the UI.
export function sanitizeTashreef(raw: unknown): Tashreef {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const past = cleanTable(r.past, CONJ_KEYS);
  const present = cleanTable(r.present, CONJ_KEYS);
  const amr = cleanTable(r.amr, AMR_KEYS);
  const passivePast = cleanTable(r.passivePast, CONJ_KEYS);
  const passivePresent = cleanTable(r.passivePresent, CONJ_KEYS);

  const out: Tashreef = { past, present };
  if (hasAny(amr)) out.amr = amr;
  if (hasAny(passivePast)) out.passivePast = passivePast;
  if (hasAny(passivePresent)) out.passivePresent = passivePresent;

  const masdar = cleanCell(r.masdar);
  if (masdar) out.masdar = masdar;
  const fa3il = cleanCell(r.fa3il);
  if (fa3il) out.fa3il = fa3il;
  const maf3ul = cleanCell(r.maf3ul);
  if (maf3ul) out.maf3ul = maf3ul;

  return out;
}

function cleanCell(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

function cleanTable<K extends string>(
  raw: unknown,
  keys: readonly K[],
): Partial<Record<K, string | null>> {
  const out: Partial<Record<K, string | null>> = {};
  if (raw && typeof raw === 'object') {
    const src = raw as Record<string, unknown>;
    for (const k of keys) {
      if (k in src) out[k] = cleanCell(src[k]);
    }
  }
  return out;
}

function hasAny(t: Partial<Record<string, string | null>>): boolean {
  return Object.values(t).some((v) => v != null);
}
