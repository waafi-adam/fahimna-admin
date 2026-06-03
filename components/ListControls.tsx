'use client';

import { useRouter, useSearchParams } from 'next/navigation';

// Search + filter (To do / Reviewed / All / Edited) + "X left" + page nav +
// (gloss only) an Include-verbs toggle. All driven via URL params so the server
// page re-queries.
export default function ListControls({
  basePath,
  page,
  pageCount,
  total,
  todo,
  filter,
  showVerbToggle,
  includeVerbs,
}: {
  basePath: string;
  page: number;
  pageCount: number;
  total: number;
  todo: number;
  filter: string;
  showVerbToggle?: boolean;
  includeVerbs?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, val: string | null) {
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (val) sp.set(key, val); else sp.delete(key);
    if (key !== 'page') sp.delete('page'); // reset to page 1 on filter/search/scope change
    router.replace(`${basePath}?${sp.toString()}`);
  }

  const q = params.get('q') ?? '';

  return (
    <div className="col" style={{ gap: 10, marginTop: 12 }}>
      {/* "How much left" headline */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15 }}>
          <strong style={{ color: todo === 0 ? 'var(--good)' : 'var(--edited)' }}>{todo}</strong>
          <span className="muted"> left to review{showVerbToggle && !includeVerbs ? ' (non-verbs)' : ''}</span>
        </span>
        <span className="muted">{total} in view</span>
      </div>

      <input
        defaultValue={q}
        placeholder="Search Arabic or id…"
        onChange={(e) => {
          const v = e.target.value;
          window.clearTimeout((window as any).__lc);
          (window as any).__lc = window.setTimeout(() => setParam('q', v || null), 250);
        }}
        style={{ width: '100%', fontSize: 16 }}
      />

      <div className="row" style={{ gap: 6 }}>
        {[
          { key: 'unreviewed', label: 'To do' },
          { key: 'reviewed', label: 'Reviewed' },
          { key: 'all', label: 'All' },
          { key: 'edited', label: 'Edited' },
        ].map((f) => (
          <button key={f.key}
            className={filter === f.key ? '' : 'ghost'}
            onClick={() => setParam('filter', f.key === 'unreviewed' ? null : f.key)}
            style={{ flex: 1, padding: '8px 6px' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Gloss only: include verb meanings (off by default — verb senses come
          from the corpus and are trusted). */}
      {showVerbToggle && (
        <label className="row" style={{ alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={!!includeVerbs}
            onChange={(e) => setParam('verbs', e.target.checked ? '1' : null)}
            style={{ width: 18, height: 18 }} />
          <span className="muted">Include verb meanings</span>
        </label>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', gap: 6, alignItems: 'center' }}>
        <button className="ghost sm" disabled={page <= 1}
          onClick={() => setParam('page', String(page - 1))}>← Prev</button>
        <span className="muted">{page} / {Math.max(1, pageCount)}</span>
        <button className="ghost sm" disabled={page >= pageCount}
          onClick={() => setParam('page', String(page + 1))}>Next →</button>
      </div>
    </div>
  );
}
