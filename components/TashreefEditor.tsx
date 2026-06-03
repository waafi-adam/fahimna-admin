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

  return (
    <div className="col" style={{ gap: 16 }}>
      {/* Header — arabic + lemma id, like GlossEditor. */}
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="arabic">{arabic}</span>
        <span className="muted">lemma {lemmaId}</span>
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
          <SingleField
            label="Masdar (المصدر)"
            value={value.masdar ?? ''}
            onChange={(v) => patch({ masdar: v.trim() === '' ? null : v })}
          />
          <SingleField
            label="Fā‘il (اسم الفاعل)"
            value={value.fa3il ?? ''}
            onChange={(v) => patch({ fa3il: v.trim() === '' ? null : v })}
          />
          <SingleField
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

// The flex grid of labeled arabic cells. Cells wrap on mobile via .row — no
// fixed-width columns.
function Grid({
  keys,
  table,
  onCell,
}: {
  keys: readonly string[];
  table: ConjugationTable | ImperativeTable;
  onCell: (key: string, raw: string) => void;
}) {
  return (
    <div className="row">
      {keys.map((k) => (
        <label key={k} className="col" style={{ gap: 4, flex: '1 1 110px', minWidth: 0 }}>
          <span className="muted" style={{ fontSize: 12 }}>{k}</span>
          <input
            className="arabic"
            dir="rtl"
            value={(table as Record<string, string | null>)[k] ?? ''}
            onChange={(e) => onCell(k, e.target.value)}
          />
        </label>
      ))}
    </div>
  );
}

// A single labeled arabic field (masdar / participles).
function SingleField({
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
