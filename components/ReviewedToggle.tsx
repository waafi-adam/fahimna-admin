'use client';

import { useState } from 'react';

// A reviewed checkbox for the editor header — mark an entry done without going
// back to the list. Optimistic; reverts on failure.
export default function ReviewedToggle({
  kind,
  refKey,
  initial,
}: {
  kind: string;
  refKey: string;
  initial: boolean;
}) {
  const [reviewed, setReviewed] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !reviewed;
    setReviewed(next);
    setBusy(true);
    try {
      const res = await fetch('/api/reviewed', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, ref_key: refKey, reviewed: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setReviewed(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} className={reviewed ? '' : 'ghost'}
      title={reviewed ? 'Tap to undo — send back to To do' : 'Mark as reviewed'}
      style={{
        background: reviewed ? 'var(--good)' : 'var(--panel-2)',
        borderColor: reviewed ? 'var(--good)' : 'var(--border)',
        color: reviewed ? '#06210f' : 'var(--muted)',
        fontWeight: 600, padding: '8px 12px',
      }}>
      {reviewed ? '✓ Reviewed · Undo' : 'Mark reviewed'}
    </button>
  );
}
