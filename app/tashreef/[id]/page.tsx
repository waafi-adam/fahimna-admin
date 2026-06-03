import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import TashreefEditor from '@/components/TashreefEditor';
import ReviewedToggle from '@/components/ReviewedToggle';
import type { Tashreef } from '@/lib/types';

// Tashreef detail — the verb conjugation editor for one lemma.
export default async function TashreefDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lemmaId = Number(id);

  const { data: entry } = await db()
    .from('ling_entries')
    .select('value,label,reviewed')
    .eq('kind', 'tashreef')
    .eq('ref_key', id)
    .single();

  if (!entry) notFound();

  const value = entry.value as Tashreef;

  return (
    <main style={{ maxWidth: 1100, margin: '4vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        <Link href="/tashreef">← all conjugations</Link>
        <ReviewedToggle kind="tashreef" refKey={id} initial={entry.reviewed} />
      </div>
      <TashreefEditor
        lemmaId={lemmaId}
        arabic={entry.label ?? `#${id}`}
        initial={value}
      />
    </main>
  );
}
