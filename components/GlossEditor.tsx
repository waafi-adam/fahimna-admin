'use client';

import { useState } from 'react';
import type { DerivedForm, LemmaGlosses } from '@/lib/types';
import { useSaveEntry } from './useSaveEntry';
import UsageTable from './UsageTable';

// Editor for one lemma's gloss (senses), shown beside its usage table so the
// correct meaning can be chosen against real Quranic occurrences.
export default function GlossEditor({
  lemmaId,
  arabic,
  initial,
  forms,
}: {
  lemmaId: number;
  arabic: string;
  initial: LemmaGlosses;
  forms: DerivedForm[];
}) {
  const [senses, setSenses] = useState<string[]>(initial.senses ?? []);
  const [source, setSource] = useState<LemmaGlosses['source']>(initial.source ?? 'manual');
  const { save, saving, savedAt, error } = useSaveEntry();
  const [dirty, setDirty] = useState(false);

  function update(next: string[]) { setSenses(next); setDirty(true); }
  const setAt = (i: number, v: string) => update(senses.map((s, j) => (j === i ? v : s)));
  const remove = (i: number) => update(senses.filter((_, j) => j !== i));
  const add = (v = '') => update([...senses, v]);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= senses.length) return;
    const next = [...senses];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };

  async function onSave() {
    const value: LemmaGlosses = {
      senses: senses.map((s) => s.trim()).filter(Boolean),
      source: source as LemmaGlosses['source'],
    };
    const ok = await save('gloss', String(lemmaId), value);
    if (ok) setDirty(false);
  }

  return (
    <div className="panes">
      {/* Left — editable senses */}
      <div className="col pane-edit">
        <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
          <span className="arabic">{arabic}</span>
          <span className="muted">lemma {lemmaId}</span>
        </div>

        <strong style={{ marginTop: 8 }}>Senses (meanings)</strong>
        <div className="col">
          {senses.map((s, i) => (
            <div key={i} className="row" style={{ alignItems: 'center' }}>
              <span className="muted" style={{ width: 18 }}>{i + 1}</span>
              <input value={s} onChange={(e) => setAt(i, e.target.value)} style={{ flex: 1, minWidth: 120 }} />
              <button className="ghost sm" onClick={() => move(i, -1)} title="up">↑</button>
              <button className="ghost sm" onClick={() => move(i, 1)} title="down">↓</button>
              <button className="danger sm" onClick={() => remove(i)} title="remove">×</button>
            </div>
          ))}
          <button className="ghost" onClick={() => add()}>+ Add sense</button>
        </div>

        <label className="muted" style={{ marginTop: 8 }}>
          Source:&nbsp;
          <select value={source} onChange={(e) => { setSource(e.target.value as LemmaGlosses['source']); setDirty(true); }}>
            <option value="manual">manual</option>
            <option value="verb-page">verb-page</option>
            <option value="haiku">haiku</option>
          </select>
        </label>

        <div className="row" style={{ alignItems: 'center', marginTop: 8 }}>
          <button onClick={onSave} disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {savedAt && !dirty && <span style={{ color: 'var(--good)' }}>Saved ✓</span>}
          {dirty && <span className="pill edited">unsaved</span>}
          {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
        </div>
      </div>

      {/* Right — usage table (read-only), with one-click "add as sense" */}
      <div className="pane-usage">
        <UsageTable forms={forms} onAddSense={(m) => add(m)} />
      </div>
    </div>
  );
}
