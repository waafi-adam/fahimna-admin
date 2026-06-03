import Link from 'next/link';
import { db } from '@/lib/db';

// Dashboard — entry points per kind with "X left to review" + edited counts.
export default async function Home() {
  const supabase = db();

  const kinds = [
    { key: 'gloss', label: 'Lemma meanings', href: '/gloss', desc: 'Non-verb meanings by default (verbs trusted from corpus)' },
    { key: 'tashreef', label: 'Verb conjugations', href: '/tashreef', desc: '14-cell tashreef grids' },
    { key: 'asma', label: 'Noun forms (asma)', href: '/asma', desc: '6-slot paradigms, multi-plurals' },
    { key: 'pronoun', label: 'Pronoun paradigms', href: '/pronoun', desc: 'Hand-curated cells' },
  ];

  const counts: Record<string, { todo: number; edited: number }> = {};
  for (const k of kinds) {
    // "Left to review" — for gloss this matches the list default (non-verbs only).
    let todoQ = supabase.from('ling_entries')
      .select('*', { count: 'exact', head: true }).eq('kind', k.key).eq('reviewed', false);
    if (k.key === 'gloss') todoQ = todoQ.eq('is_verb', false);
    const { count: todo } = await todoQ;
    const { count: edited } = await supabase.from('ling_entries')
      .select('*', { count: 'exact', head: true }).eq('kind', k.key).eq('status', 'edited');
    counts[k.key] = { todo: todo ?? 0, edited: edited ?? 0 };
  }

  return (
    <main style={{ maxWidth: 760, margin: '6vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 22 }}>Fahimna — Linguistic Corrections</h1>
        <form action="/auth/signout" method="post"><button className="ghost">Sign out</button></form>
      </div>

      <div className="col" style={{ marginTop: 16, gap: 12 }}>
        {kinds.map((k) => (
          <Link key={k.key} href={k.href}
            style={{ display: 'block', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, color: 'var(--text)' }}>{k.label}</div>
                <div className="muted">{k.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: counts[k.key].todo === 0 ? 'var(--good)' : 'var(--edited)' }}>
                  {counts[k.key].todo}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>left{counts[k.key].edited > 0 ? ` · ${counts[k.key].edited} edited` : ''}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
