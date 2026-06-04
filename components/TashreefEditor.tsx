'use client';

import { useState } from 'react';
import type {
  Tashreef,
  ConjugationKey,
  ImperativeKey,
  ConjugationTable,
  ImperativeTable,
} from '@/lib/types';
import { useSaveEntry } from './useSaveEntry';

// The 14 conjugation cells, in person × gender × number order. Grouped by
// person so the grid reads naturally (3rd, 2nd, 1st person).
const CONJ_KEYS: ConjugationKey[] = [
  '3ms', '3md', '3mp', '3fs', '3fd', '3fp',
  '2ms', '2md', '2mp', '2fs', '2fd', '2fp',
  '1s', '1p',
];

// Imperative only has 2nd-person cells.
const AMR_KEYS: ImperativeKey[] = ['2ms', '2md', '2mp', '2fs', '2fd', '2fp'];

// Default model shown in the picker. Mirrors DEFAULT_MODEL in lib/llm.ts; the
// server falls back to OPENROUTER_MODEL / its own default if this is blank.
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

// A few starting points for the model picker — these are only hints in a
// datalist; type any slug from https://openrouter.ai/models.
const MODEL_HINTS = [
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-sonnet-latest',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-001',
];

// The conjugation/single-field sections we can diff between current + suggestion.
const TABLE_SECTIONS = [
  { section: 'past', label: 'Past (الماضي)', keys: CONJ_KEYS },
  { section: 'present', label: 'Present (المضارع)', keys: CONJ_KEYS },
  { section: 'amr', label: 'Imperative (الأمر)', keys: AMR_KEYS },
  { section: 'passivePast', label: 'Passive past (الماضي المجهول)', keys: CONJ_KEYS },
  { section: 'passivePresent', label: 'Passive present (المضارع المجهول)', keys: CONJ_KEYS },
] as const;

const SINGLE_FIELDS = [
  { field: 'masdar', label: 'Masdar (المصدر)' },
  { field: 'fa3il', label: 'Fā‘il (اسم الفاعل)' },
  { field: 'maf3ul', label: 'Maf‘ūl (اسم المفعول)' },
] as const;

type TableSection = (typeof TABLE_SECTIONS)[number]['section'];
type SingleField = (typeof SINGLE_FIELDS)[number]['field'];

type Diff =
  | { kind: 'cell'; section: TableSection; label: string; key: string; current: string | null; suggested: string | null }
  | { kind: 'single'; field: SingleField; label: string; current: string | null; suggested: string | null };

const norm = (v: string | null | undefined) => v ?? '';

// Editor for one lemma's tashreef (full verb conjugation paradigm). The active
// past/present tables are always present; passive tables, imperative and the
// participle/masdar fields are optional and can be added/removed.
export default function TashreefEditor({
  lemmaId,
  arabic,
  initial,
}: {
  lemmaId: number;
  arabic: string;
  initial: Tashreef;
}) {
  const [value, setValue] = useState<Tashreef>(initial);
  const { save, saving, savedAt, error } = useSaveEntry();
  const [dirty, setDirty] = useState(false);

  // --- LLM suggestion state ---
  const [comment, setComment] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Tashreef | null>(null);
  const [suggestNotes, setSuggestNotes] = useState('');
  const [usedModel, setUsedModel] = useState('');

  function patch(next: Partial<Tashreef>) {
    setValue((v) => ({ ...v, ...next }));
    setDirty(true);
  }

  // Set a single conjugation/imperative cell. Empty string is stored as null so
  // blank cells stay null, matching the data shape.
  function setCell<T extends ConjugationTable | ImperativeTable>(
    table: T | null | undefined,
    key: string,
    raw: string,
  ): T {
    const cell = raw.trim() === '' ? null : raw;
    return { ...(table ?? {}), [key]: cell } as T;
  }

  async function runSuggest() {
    setSuggesting(true);
    setSuggestError(null);
    try {
      const res = await fetch('/api/tashreef/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lemmaId, current: value, comment, model }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Suggestion failed');
      setSuggestion(json.suggestion as Tashreef);
      setSuggestNotes(json.notes || '');
      setUsedModel(json.model || model);
    } catch (e: any) {
      setSuggestError(e.message);
      setSuggestion(null);
    } finally {
      setSuggesting(false);
    }
  }

  // Compare the live value against the suggestion; only cells/fields the model
  // proposed AND that actually differ become reviewable rows.
  const diffs: Diff[] = [];
  if (suggestion) {
    for (const { section, label, keys } of TABLE_SECTIONS) {
      const sTbl = suggestion[section] as Record<string, string | null> | null | undefined;
      if (!sTbl) continue;
      const cTbl = value[section] as Record<string, string | null> | null | undefined;
      for (const key of keys) {
        if (!(key in sTbl)) continue;
        const suggested = sTbl[key] ?? null;
        const current = cTbl?.[key] ?? null;
        if (norm(current) === norm(suggested)) continue;
        diffs.push({ kind: 'cell', section, label, key, current, suggested });
      }
    }
    for (const { field, label } of SINGLE_FIELDS) {
      const suggested = suggestion[field];
      if (suggested === undefined) continue;
      const s = suggested ?? null;
      const current = value[field] ?? null;
      if (norm(current) === norm(s)) continue;
      diffs.push({ kind: 'single', field, label, current, suggested: s });
    }
  }

  function applyDiff(target: Tashreef, d: Diff) {
    if (d.kind === 'cell') {
      const tbl = (target[d.section] as Record<string, string | null> | null | undefined) ?? {};
      (target as any)[d.section] = { ...tbl, [d.key]: d.suggested };
    } else {
      (target as any)[d.field] = d.suggested;
    }
  }

  function acceptOne(d: Diff) {
    const next: Tashreef = structuredClone(value);
    applyDiff(next, d);
    setValue(next);
    setDirty(true);
  }

  function acceptAll() {
    const next: Tashreef = structuredClone(value);
    for (const d of diffs) applyDiff(next, d);
    setValue(next);
    setDirty(true);
    setSuggestion(null);
  }

  function dismissSuggestion() {
    setSuggestion(null);
    setSuggestNotes('');
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Header — arabic + lemma id, like GlossEditor. */}
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="arabic">{arabic}</span>
        <span className="muted">lemma {lemmaId}</span>
      </div>

      {/* AI suggestion panel — proposes corrections; writes nothing until you
          accept. */}
      <div
        className="col"
        style={{
          gap: 10,
          padding: 14,
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--panel)',
        }}
      >
        <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <strong>✨ AI conjugation check</strong>
          <span className="muted" style={{ fontSize: 12 }}>via OpenRouter</span>
        </div>

        {/* Primary action — one click, no input needed. The model reads the
            current paradigm and proposes fixes for whatever looks wrong. */}
        <button onClick={runSuggest} disabled={suggesting} style={{ width: '100%' }}>
          {suggesting ? 'Thinking…' : suggestion ? '🔄 Re-check conjugation' : '🪄 Auto-fix conjugation'}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          Reads the current forms and suggests corrections — review each before it’s applied. Nothing is saved until you Save.
        </span>

        {/* Optional refinements — collapsed so the one-click flow stays front
            and center. Open only if you want to steer the model or change it. */}
        <details>
          <summary className="muted" style={{ fontSize: 13, cursor: 'pointer' }}>
            Add a note or change model (optional)
          </summary>
          <div className="col" style={{ gap: 10, marginTop: 10 }}>
            <label className="col" style={{ gap: 4 }}>
              <span className="muted" style={{ fontSize: 12 }}>Note — describe what to focus on</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                placeholder="e.g. the passive present is wrong; this is a form II verb"
                dir="auto"
              />
            </label>
            <label className="col" style={{ gap: 4, minWidth: 0 }}>
              <span className="muted" style={{ fontSize: 12 }}>Model</span>
              <input
                list="or-models"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="openrouter model slug"
              />
              <datalist id="or-models">
                {MODEL_HINTS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
          </div>
        </details>

        {suggestError && (
          <span style={{ color: 'var(--danger)' }}>{suggestError}</span>
        )}

        {/* Diff review */}
        {suggestion && (
          <div className="col" style={{ gap: 10, marginTop: 4 }}>
            {suggestNotes && (
              <div
                className="col"
                style={{
                  gap: 4,
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--panel-2)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="muted" style={{ fontSize: 12 }}>
                  Model notes{usedModel ? ` · ${usedModel}` : ''}
                </span>
                <span dir="auto" style={{ whiteSpace: 'pre-wrap' }}>{suggestNotes}</span>
              </div>
            )}

            {diffs.length === 0 ? (
              <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="muted">
                  No differences from the current paradigm — nothing to apply.
                </span>
                <button className="ghost sm" onClick={dismissSuggestion}>Dismiss</button>
              </div>
            ) : (
              <>
                <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {diffs.length} proposed {diffs.length === 1 ? 'change' : 'changes'} — review each:
                  </span>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="sm" onClick={acceptAll}>Accept all</button>
                    <button className="ghost sm" onClick={dismissSuggestion}>Dismiss</button>
                  </div>
                </div>

                <div className="col" style={{ gap: 6 }}>
                  {diffs.map((d) => (
                    <DiffRow
                      key={d.kind === 'cell' ? `${d.section}.${d.key}` : `single.${d.field}`}
                      diff={d}
                      onAccept={() => acceptOne(d)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active past / present — always present. */}
      <ConjBlock
        label="Past (الماضي)"
        keys={CONJ_KEYS}
        table={value.past}
        onCell={(k, raw) => patch({ past: setCell(value.past, k, raw) })}
      />
      <ConjBlock
        label="Present (المضارع)"
        keys={CONJ_KEYS}
        table={value.present}
        onCell={(k, raw) => patch({ present: setCell(value.present, k, raw) })}
      />

      {/* Imperative — optional, 2nd person only. */}
      <OptionalBlock
        label="Imperative (الأمر)"
        present={value.amr != null}
        onAdd={() => patch({ amr: {} })}
        onRemove={() => patch({ amr: null })}
      >
        <Grid
          keys={AMR_KEYS}
          table={value.amr ?? {}}
          onCell={(k, raw) => patch({ amr: setCell(value.amr, k, raw) })}
        />
      </OptionalBlock>

      {/* Passive past — optional. */}
      <OptionalBlock
        label="Passive past (الماضي المجهول)"
        present={value.passivePast != null}
        onAdd={() => patch({ passivePast: {} })}
        onRemove={() => patch({ passivePast: null })}
      >
        <Grid
          keys={CONJ_KEYS}
          table={value.passivePast ?? {}}
          onCell={(k, raw) => patch({ passivePast: setCell(value.passivePast, k, raw) })}
        />
      </OptionalBlock>

      {/* Passive present — optional. */}
      <OptionalBlock
        label="Passive present (المضارع المجهول)"
        present={value.passivePresent != null}
        onAdd={() => patch({ passivePresent: {} })}
        onRemove={() => patch({ passivePresent: null })}
      >
        <Grid
          keys={CONJ_KEYS}
          table={value.passivePresent ?? {}}
          onCell={(k, raw) => patch({ passivePresent: setCell(value.passivePresent, k, raw) })}
        />
      </OptionalBlock>

      {/* Derived single fields. Empty string saved as null. */}
      <div className="col">
        <strong>Derived forms</strong>
        <div className="row">
          <SingleFieldInput
            label="Masdar (المصدر)"
            value={value.masdar ?? ''}
            onChange={(v) => patch({ masdar: v.trim() === '' ? null : v })}
          />
          <SingleFieldInput
            label="Fā‘il (اسم الفاعل)"
            value={value.fa3il ?? ''}
            onChange={(v) => patch({ fa3il: v.trim() === '' ? null : v })}
          />
          <SingleFieldInput
            label="Maf‘ūl (اسم المفعول)"
            value={value.maf3ul ?? ''}
            onChange={(v) => patch({ maf3ul: v.trim() === '' ? null : v })}
          />
        </div>
      </div>

      {/* Save controls — same affordances as GlossEditor. */}
      <div className="row" style={{ alignItems: 'center', marginTop: 8 }}>
        <button
          onClick={async () => {
            const ok = await save('tashreef', String(lemmaId), value);
            if (ok) setDirty(false);
          }}
          disabled={saving || !dirty}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !dirty && <span style={{ color: 'var(--good)' }}>Saved ✓</span>}
        {dirty && <span className="pill edited">unsaved</span>}
        {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
    </div>
  );
}

// One reviewable change: shows the section/key, current → suggested, with an
// Accept button. Accepting writes the suggested value into the live editor (it
// still has to be Saved like any manual edit).
function DiffRow({ diff, onAccept }: { diff: Diff; onAccept: () => void }) {
  const sub = diff.kind === 'cell' ? `${diff.label} · ${diff.key}` : diff.label;
  const [accepted, setAccepted] = useState(false);
  return (
    <div
      className="row"
      style={{
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid var(--border)',
        background: 'var(--panel-2)',
      }}
    >
      <span className="muted" style={{ fontSize: 11, flex: '1 1 130px', minWidth: 0 }}>{sub}</span>
      <span className="arabic" dir="rtl" style={{ flex: '1 1 90px', minWidth: 0, opacity: 0.6, textDecoration: 'line-through' }}>
        {diff.current ?? '∅'}
      </span>
      <span className="muted">→</span>
      <span className="arabic" dir="rtl" style={{ flex: '1 1 90px', minWidth: 0, color: 'var(--good)' }}>
        {diff.suggested ?? '∅'}
      </span>
      <button
        className="ghost sm"
        disabled={accepted}
        onClick={() => { setAccepted(true); onAccept(); }}
      >
        {accepted ? '✓' : 'Accept'}
      </button>
    </div>
  );
}

// A labeled, always-present conjugation block (active past/present).
function ConjBlock({
  label,
  keys,
  table,
  onCell,
}: {
  label: string;
  keys: ConjugationKey[];
  table: ConjugationTable;
  onCell: (key: ConjugationKey, raw: string) => void;
}) {
  return (
    <div className="col">
      <strong>{label}</strong>
      <Grid keys={keys} table={table} onCell={(k, raw) => onCell(k as ConjugationKey, raw)} />
    </div>
  );
}

// A labeled optional block: a toggle that adds (sets to {}) or removes (null)
// the underlying table, revealing its grid only when present.
function OptionalBlock({
  label,
  present,
  onAdd,
  onRemove,
  children,
}: {
  label: string;
  present: boolean;
  onAdd: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="col">
      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <strong>{label}</strong>
        {present ? (
          <button className="danger sm" onClick={onRemove}>Remove</button>
        ) : (
          <button className="ghost sm" onClick={onAdd}>+ Add</button>
        )}
      </div>
      {present && children}
    </div>
  );
}

// Person-row labels by the leading digit of a conjugation key.
const PERSON_LABEL: Record<string, string> = { '3': '3rd', '2': '2nd', '1': '1st' };

// Grid of labeled arabic cells. The container is forced LTR so the cells always
// read left-to-right (3ms → 3md → … ) regardless of the RTL Arabic inside each
// input. Keys are grouped by person onto their own line (3rd, then 2nd, then
// 1st) so the paradigm reads top-to-bottom, left-to-right. Cells wrap on mobile.
function Grid({
  keys,
  table,
  onCell,
}: {
  keys: readonly string[];
  table: ConjugationTable | ImperativeTable;
  onCell: (key: string, raw: string) => void;
}) {
  // Group keys by their leading person digit, preserving order.
  const groups: { person: string; keys: string[] }[] = [];
  for (const k of keys) {
    const person = k[0];
    let g = groups.find((x) => x.person === person);
    if (!g) { g = { person, keys: [] }; groups.push(g); }
    g.keys.push(k);
  }

  return (
    <div className="col" style={{ direction: 'ltr', gap: 8 }}>
      {groups.map((g) => (
        <div key={g.person} className="row" style={{ alignItems: 'flex-end', gap: 8 }}>
          <span className="muted" style={{ width: 30, fontSize: 12, flexShrink: 0, paddingBottom: 8 }}>
            {PERSON_LABEL[g.person] ?? g.person}
          </span>
          {g.keys.map((k) => (
            <label key={k} className="col" style={{ gap: 4, flex: '1 1 88px', minWidth: 0 }}>
              <span className="muted" style={{ fontSize: 11 }}>{k}</span>
              <input
                className="arabic"
                dir="rtl"
                value={(table as Record<string, string | null>)[k] ?? ''}
                onChange={(e) => onCell(k, e.target.value)}
              />
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

// A single labeled arabic field (masdar / participles).
function SingleFieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="col" style={{ gap: 4, flex: '1 1 200px', minWidth: 0 }}>
      <span className="muted" style={{ fontSize: 12 }}>{label}</span>
      <input className="arabic" dir="rtl" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
