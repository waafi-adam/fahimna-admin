'use client';

import { useMemo, useState } from 'react';
import type { DerivedForm } from '@/lib/types';

// Read-only concordance/usage table for a lemma — every Arabic form with its
// word-by-word meanings (EN/ID/UR) and Quran-wide occurrence count, sorted by
// frequency. Shown beside the gloss editor so meanings are chosen against real
// usage. Optional onAddSense lets the editor pull a meaning straight in.
export default function UsageTable({
  forms,
  onAddSense,
}: {
  forms: DerivedForm[];
  onAddSense?: (meaning: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');

  const sorted = useMemo(
    () => [...forms].sort((a, b) => b[4] - a[4]),
    [forms],
  );
  const filtered = useMemo(() => {
    if (!q.trim()) return sorted;
    const t = q.trim().toLowerCase();
    return sorted.filter(
      (f) => f[0].includes(q) || f[1].toLowerCase().includes(t),
    );
  }, [sorted, q]);

  const LIMIT = 15;
  const shown = showAll ? filtered : filtered.slice(0, LIMIT);
  const total = forms.reduce((n, f) => n + f[4], 0);

  return (
    <div className="col" style={{ minWidth: 0 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Usage <span className="muted">({forms.length} forms · {total} occurrences)</span></strong>
        <input placeholder="filter forms / meaning" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ width: 200 }} />
      </div>
      <div className="table-scroll" style={{ maxHeight: 460, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Form</th>
              <th>EN</th>
              <th>ID</th>
              <th>UR</th>
              {onAddSense && <th></th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((f, i) => (
              <tr key={i}>
                <td className="muted">{f[4]}</td>
                <td className="arabic" style={{ fontSize: 18 }}>{f[0]}</td>
                <td>{f[1]}</td>
                <td className="muted">{f[2]}</td>
                <td className="arabic muted" style={{ fontSize: 15 }}>{f[3]}</td>
                {onAddSense && (
                  <td>
                    {/* Pull the EN meaning's first sense into the gloss list. */}
                    <button className="ghost sm"
                      onClick={() => onAddSense(f[1].split(',')[0].trim())}>+ sense</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > LIMIT && (
        <button className="ghost" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Show less' : `Show all ${filtered.length}`}
        </button>
      )}
    </div>
  );
}
