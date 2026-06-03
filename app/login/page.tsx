'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Single shared-password login (temporary internal tool).
export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error || 'Sign-in failed');
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 360, margin: '15vh auto', padding: 24 }}>
      <h1 style={{ fontSize: 20 }}>Fahimna — Corrections</h1>
      <p className="muted">Enter the access password.</p>
      <form onSubmit={signIn} className="col" style={{ marginTop: 16 }}>
        <input type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} autoFocus required />
        <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {msg && <p style={{ color: 'var(--danger)' }}>{msg}</p>}
      </form>
    </main>
  );
}
