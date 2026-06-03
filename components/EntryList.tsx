'use client';

import { useState } from 'react';
import Link from 'next/link';

export type EntryRow = {
  ref_key: string;
  label: string | null;
  status: 'original' | 'edited';
  reviewed: boolean;
};

// Shared list for tashreef/asma/gloss editors. Rows come straight from
// ling_entries (only real entries — no placeholders). Each row has a reviewed
// tick. In the "To do" (unreviewed) view, ticking a row removes it from the
// list so you don't scroll past done items; in the "Reviewed" view, un-ticking
// removes it. In "All", the row just dims.
export default function EntryList({
  kind,
  basePath,
  rows,
  filter,
}: {
  kind: string;
  basePath: string;
  rows: EntryRow[];
  filter: string;
}) {
  // Local mirror of reviewed flags + a hidden set for rows that no longer match
  // the active filter after a toggle (optimistic; reverts on failure).
  const [reviewed, setReviewed] = useState<Record<string, boolean>>(
    () => Object.fromEntries(rows.map((r) => [r.ref_key, r.reviewed])),
  );
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(ref_key: string) {
    const next = !reviewed[ref_key];
    setReviewed((m) => ({ ...m, [ref_key]: next }));
    // Drop from view if it no longer matches the active filter.
    const dropsOut =
      (filter === 'unreviewed' && next === true) ||
      (filter === 'reviewed' && next === false);
    if (dropsOut) setHidden((s) => new Set(s).add(ref_key));
    setBusy(ref_key);
    try {
      const res = await fetch('/api/reviewed', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, ref_key, reviewed: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setReviewed((m) => ({ ...m, [ref_key]: !next }));
      if (dropsOut) setHidden((s) => { const n = new Set(s); n.delete(ref_key); return n; });
    } finally {
      setBusy(null);
    }
  }

  const visible = rows.filter((r) => !hidden.has(r.ref_key));

  if (rows.length === 0) {
    return <p className="muted" style={{ marginTop: 16 }}>Nothing here — try another filter.</p>;
  }

  return (
    <div className="col" style={{ marginTop: 16, gap: 6 }}>
      {visible.map((r) => {
        const isReviewed = reviewed[r.ref_key];
        return (
          <div key={r.ref_key}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 10px',
              opacity: filter === 'all' && isReviewed ? 0.55 : 1,
            }}>
            {/* Reviewed tick. In the Reviewed tab it reads "✓ Undo" so it's
                obvious tapping sends the item back to To do. Elsewhere it's a
                compact checkbox (empty → tick to review). */}
            <button
              className="sm"
              onClick={() => toggle(r.ref_key)}
              disabled={busy === r.ref_key}
              aria-label={isReviewed ? 'Undo review (back to To do)' : 'Mark reviewed'}
              style={{
                height: 36, padding: filter === 'reviewed' ? '0 12px' : 0,
                minWidth: filter === 'reviewed' ? 78 : 36,
                width: filter === 'reviewed' ? 'auto' : 36,
                borderRadius: 8, flexShrink: 0, fontWeight: 700,
                background: isReviewed ? 'var(--good)' : 'var(--panel-2)',
                borderColor: isReviewed ? 'var(--good)' : 'var(--border)',
                color: isReviewed ? '#06210f' : 'var(--muted)',
              }}>
              {filter === 'reviewed' ? '✓ Undo' : (isReviewed ? '✓' : '')}
            </button>

            {/* Tappable row → editor */}
            <Link href={`${basePath}/${r.ref_key}`}
              style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, color: 'var(--text)' }}>
              <span style={{ minWidth: 0 }}>
                <span className="arabic">{r.label || `#${r.ref_key}`}</span>
                <span className="muted" style={{ marginInlineStart: 10 }}>#{r.ref_key}</span>
              </span>
              {r.status === 'edited' && <span className="pill edited">edited</span>}
            </Link>
          </div>
        );
      })}
      {visible.length === 0 && (
        <p className="muted" style={{ marginTop: 8 }}>All done on this page ✓ — go to the next page or switch filter.</p>
      )}
    </div>
  );
}
