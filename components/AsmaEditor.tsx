'use client';

import { useState } from 'react';
import type { Asma, AsmaKey } from '@/lib/types';
import { useSaveEntry } from './useSaveEntry';

// The 6 noun-paradigm slots, laid out as rows = number, cols = gender. Each
// cell holds one of: a single Arabic string, an array of Arabic strings
// (multiple/broken plurals), or null (the slot doesn't exist for this noun).
const NUMBERS: { key: 'singular' | 'dual' | 'plural'; label: string; m: AsmaKey; f: AsmaKey }[] = [
  { key: 'singular', label: 'Singular', m: 'ms', f: 'fs' },
  { key: 'dual', label: 'Dual', m: 'md', f: 'fd' },
  { key: 'plural', label: 'Plural', m: 'mp', f: 'fp' },
];

const CELL_LABEL: Record<AsmaKey, string> = {
  ms: 'Masc. singular (ms)',
  md: 'Masc. dual (md)',
  mp: 'Masc. plural (mp)',
  fs: 'Fem. singular (fs)',
  fd: 'Fem. dual (fd)',
  fp: 'Fem. plural (fp)',
};

// Editor for one lemma's asma (noun forms / paradigm). Mobile-friendly: cells
// flow in wrapping flex rows, never fixed-width columns.
export default function AsmaEditor({
  lemmaId,
  arabic,
  initial,
}: {
  lemmaId: number;
  arabic: string;
  initial: Asma;
}) {
  const [value, setValue] = useState<Asma>(initial);
  const { save, saving, savedAt, error } = useSaveEntry();
  const [dirty, setDirty] = useState(false);

  function setSlot(k: AsmaKey, v: string | string[] | null) {
    setValue((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  }

  // ----- per-cell mutations -----------------------------------------------
  const addSlot = (k: AsmaKey) => setSlot(k, ''); // null -> empty string
  const clearSlot = (k: AsmaKey) => setSlot(k, null); // back to "doesn't exist"

  // string -> array (start a second alternative form).
  const toArray = (k: AsmaKey, current: string) => setSlot(k, [current, '']);

  const setStringValue = (k: AsmaKey, v: string) => setSlot(k, v);

  const setArrayItem = (k: AsmaKey, arr: string[], i: number, v: string) =>
    setSlot(k, arr.map((x, j) => (j === i ? v : x)));

  const addArrayItem = (k: AsmaKey, arr: string[]) => setSlot(k, [...arr, '']);

  const removeArrayItem = (k: AsmaKey, arr: string[], i: number) => {
    const next = arr.filter((_, j) => j !== i);
    setSlot(k, next.length ? next : null); // empty array -> null
  };

  // ----- save -------------------------------------------------------------
  async function onSave() {
    const out: Asma = {};
    for (const k of Object.keys(value) as AsmaKey[]) {
      const v = value[k];
      if (v === null || v === undefined) {
        out[k] = null;
        continue;
      }
      if (Array.isArray(v)) {
        const cleaned = v.map((s) => s.trim()).filter(Boolean);
        if (cleaned.length === 0) out[k] = null;
        else if (cleaned.length === 1) out[k] = cleaned[0]; // collapse for cleanliness
        else out[k] = cleaned;
        continue;
      }
      const t = v.trim();
      out[k] = t ? t : null; // lone '' -> null
    }
    const ok = await save('asma', String(lemmaId), out);
    if (ok) setDirty(false);
  }

  // ----- cell renderer ----------------------------------------------------
  function renderCell(k: AsmaKey) {
    const v = value[k] ?? null;
    return (
      <div className="col" style={{ flex: 1, minWidth: 200, gap: 6 }}>
        <span className="muted" style={{ fontSize: 12 }}>{CELL_LABEL[k]}</span>

        {v === null && (
          <div className="row" style={{ alignItems: 'center' }}>
            <span className="muted">—</span>
            <button className="ghost sm" onClick={() => addSlot(k)}>Add</button>
          </div>
        )}

        {typeof v === 'string' && (
          <div className="row" style={{ alignItems: 'center' }}>
            <input
              className="arabic"
              dir="rtl"
              value={v}
              onChange={(e) => setStringValue(k, e.target.value)}
              style={{ flex: 1, minWidth: 120 }}
            />
            <button className="ghost sm" onClick={() => toArray(k, v)} title="add alternative form">+ alt</button>
            <button className="danger sm" onClick={() => clearSlot(k)} title="clear slot">×</button>
          </div>
        )}

        {Array.isArray(v) && (
          <div className="col" style={{ gap: 6 }}>
            {v.map((item, i) => (
              <div key={i} className="row" style={{ alignItems: 'center' }}>
                <input
                  className="arabic"
                  dir="rtl"
                  value={item}
                  onChange={(e) => setArrayItem(k, v, i, e.target.value)}
                  style={{ flex: 1, minWidth: 120 }}
                />
                <button className="danger sm" onClick={() => removeArrayItem(k, v, i)} title="remove form">×</button>
              </div>
            ))}
            <button className="ghost sm" onClick={() => addArrayItem(k, v)}>+ add form</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="col">
      <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
        <span className="arabic">{arabic}</span>
        <span className="muted">lemma {lemmaId}</span>
      </div>

      <div className="col" style={{ marginTop: 8, gap: 16 }}>
        {NUMBERS.map((n) => (
          <div key={n.key} className="col" style={{ gap: 6 }}>
            <strong>{n.label}</strong>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              {renderCell(n.m)}
              {renderCell(n.f)}
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ alignItems: 'center', marginTop: 16 }}>
        <button onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !dirty && <span style={{ color: 'var(--good)' }}>Saved ✓</span>}
        {dirty && <span className="pill edited">unsaved</span>}
        {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
    </div>
  );
}
