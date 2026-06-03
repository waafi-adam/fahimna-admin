'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Search box that pushes ?q= into the URL (server re-renders the result list).
export default function LemmaSearch({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');

  useEffect(() => {
    const id = setTimeout(() => {
      const sp = new URLSearchParams(Array.from(params.entries()));
      if (q) sp.set('q', q); else sp.delete('q');
      router.replace(`${basePath}?${sp.toString()}`);
    }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <input
      autoFocus
      placeholder="Search Arabic or lemma id…"
      value={q}
      onChange={(e) => setQ(e.target.value)}
      style={{ width: '100%', fontSize: 16 }}
    />
  );
}
