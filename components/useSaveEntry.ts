'use client';

import { useState } from 'react';

// Shared save hook for all editors. PATCHes /api/entry and surfaces status.
export function useSaveEntry() {
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(kind: string, ref_key: string, value: unknown) {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/entry', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, ref_key, value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setSavedAt(Date.now());
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, saving, savedAt, error };
}
