'use client';

import { useState } from 'react';
import { useSaveEntry } from './useSaveEntry';

// Pronoun paradigm types. These are NOT (yet) in lib/types.ts — that file is
// shared, so we keep them local to this editor. They MUST match the shape the
// app expects in ling_entries.value for kind='pronoun', ref_key='__all__'.
type PronounParadigmShape = 'demonstrative' | 'personal-subject' | 'iyya';

type PronounParadigm = {
  title_ar: string;
  title_en: string;
  shape: PronounParadigmShape;
  cells: Record<string, string | null>; // cell key -> Arabic form (or null)
};

export type PronounsData = {
  lemma_to_paradigm: Record<string, string>; // lemmaId -> paradigm key
  surface_to_paradigm: Record<string, string>; // arabic surface -> paradigm key
  paradigms: Record<string, PronounParadigm>; // paradigm key -> paradigm
};

// Editor for the single pronouns row. The main editing target is the set of
// paradigms (each a small grid of cell keys -> Arabic forms). The two mapping
// dictionaries are advanced and hidden behind a toggle.
export default function PronounEditor({ initial }: { initial: PronounsData }) {
  const [value, setValue] = useState<PronounsData>(() => deepCopy(initial));
  const { save, saving, savedAt, error } = useSaveEntry();
  const [dirty, setDirty] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const paradigmKeys = Object.keys(value.paradigms);

  function mutate(fn: (draft: PronounsData) => void) {
    setValue((prev) => {
      const next = deepCopy(prev);
      fn(next);
      return next;
    });
    setDirty(true);
  }

  const setParadigmTitle = (key: string, field: 'title_ar' | 'title_en', v: string) =>
    mutate((d) => { d.paradigms[key][field] = v; });

  const setCell = (key: string, cellKey: string, v: string) =>
    mutate((d) => { d.paradigms[key].cells[cellKey] = v.trim() === '' ? null : v; });

  const setMapValue = (
    map: 'lemma_to_paradigm' | 'surface_to_paradigm',
    mapKey: string,
    v: string,
  ) => mutate((d) => { d[map][mapKey] = v; });

  async function onSave() {
    const ok = await save('pronoun', '__all__', value);
    if (ok) setDirty(false);
  }

  return (
    <div className="col" style={{ gap: 20 }}>
      {/* Save controls */}
      <div className="row" style={{ alignItems: 'center' }}>
        <button onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !dirty && <span style={{ color: 'var(--good)' }}>Saved ✓</span>}
        {dirty && <span className="pill edited">unsaved</span>}
        {error && <span style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>

      {/* Paradigms — the primary editing target */}
      <div className="col" style={{ gap: 20 }}>
        {paradigmKeys.map((key) => {
          const p = value.paradigms[key];
          return (
            <div
              key={key}
              className="col"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 16,
                gap: 12,
              }}
            >
              <div className="row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span className="muted">{key}</span>
                <span className="muted">{p.shape}</span>
              </div>

              {/* Editable titles */}
              <div className="row">
                <label className="col" style={{ flex: '1 1 200px', minWidth: 0, gap: 4 }}>
                  <span className="muted">title (en)</span>
                  <input
                    value={p.title_en}
                    onChange={(e) => setParadigmTitle(key, 'title_en', e.target.value)}
                  />
                </label>
                <label className="col" style={{ flex: '1 1 200px', minWidth: 0, gap: 4 }}>
                  <span className="muted">title (ar)</span>
                  <input
                    className="arabic"
                    dir="rtl"
                    value={p.title_ar}
                    onChange={(e) => setParadigmTitle(key, 'title_ar', e.target.value)}
                  />
                </label>
              </div>

              {/* Cells */}
              <div className="col" style={{ gap: 8 }}>
                {Object.keys(p.cells).map((cellKey) => (
                  <div key={cellKey} className="row" style={{ alignItems: 'center' }}>
                    <span className="muted" style={{ flex: '0 0 90px', minWidth: 70 }}>{cellKey}</span>
                    <input
                      className="arabic"
                      dir="rtl"
                      value={p.cells[cellKey] ?? ''}
                      onChange={(e) => setCell(key, cellKey, e.target.value)}
                      style={{ flex: '1 1 140px', minWidth: 0 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced mappings — collapsed by default */}
      <div className="col" style={{ gap: 12 }}>
        <button className="ghost" onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? 'Hide advanced mappings' : 'Show advanced mappings'}
        </button>

        {showAdvanced && (
          <div className="col" style={{ gap: 20 }}>
            <MapEditor
              title="lemma → paradigm"
              map={value.lemma_to_paradigm}
              paradigmKeys={paradigmKeys}
              onChange={(k, v) => setMapValue('lemma_to_paradigm', k, v)}
            />
            <MapEditor
              title="surface → paradigm"
              map={value.surface_to_paradigm}
              paradigmKeys={paradigmKeys}
              arabicKey
              onChange={(k, v) => setMapValue('surface_to_paradigm', k, v)}
            />
          </div>
        )}
      </div>

      {/* Bottom save mirror for long pages */}
      <div className="row" style={{ alignItems: 'center' }}>
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

// One mapping dictionary: key (read-only) -> paradigm key (editable via select).
function MapEditor({
  title,
  map,
  paradigmKeys,
  arabicKey,
  onChange,
}: {
  title: string;
  map: Record<string, string>;
  paradigmKeys: string[];
  arabicKey?: boolean;
  onChange: (key: string, value: string) => void;
}) {
  const keys = Object.keys(map);
  return (
    <div
      className="col"
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 16,
        gap: 8,
      }}
    >
      <strong>{title}</strong>
      {keys.length === 0 && <span className="muted">(empty)</span>}
      {keys.map((k) => (
        <div key={k} className="row" style={{ alignItems: 'center' }}>
          <span
            className={arabicKey ? 'arabic' : 'muted'}
            dir={arabicKey ? 'rtl' : undefined}
            style={{ flex: '1 1 120px', minWidth: 0 }}
          >
            {k}
          </span>
          <select
            value={map[k]}
            onChange={(e) => onChange(k, e.target.value)}
            style={{ flex: '1 1 160px', minWidth: 0 }}
          >
            {/* Keep the current value selectable even if it's not a known key. */}
            {!paradigmKeys.includes(map[k]) && <option value={map[k]}>{map[k]}</option>}
            {paradigmKeys.map((pk) => (
              <option key={pk} value={pk}>{pk}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// Structured clone is fine for this plain JSON shape; falls back to JSON for
// older runtimes.
function deepCopy(data: PronounsData): PronounsData {
  return typeof structuredClone === 'function'
    ? structuredClone(data)
    : (JSON.parse(JSON.stringify(data)) as PronounsData);
}
