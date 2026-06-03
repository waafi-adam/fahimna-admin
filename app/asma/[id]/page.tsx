import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import AsmaEditor from '@/components/AsmaEditor';
import ReviewedToggle from '@/components/ReviewedToggle';
import type { Asma } from '@/lib/types';

// Asma detail — the noun-paradigm (6-slot) editor for one lemma.
export default async function AsmaDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lemmaId = Number(id);

  const { data: entry } = await db()
    .from('ling_entries')
    .select('value,label,reviewed')
    .eq('kind', 'asma')
    .eq('ref_key', id)
    .single();

  if (!entry) notFound();

  const value = entry.value as Asma;

  return (
    <main style={{ maxWidth: 1100, margin: '4vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        <Link href="/asma">← all noun forms</Link>
        <ReviewedToggle kind="asma" refKey={id} initial={entry.reviewed} />
      </div>
      <AsmaEditor
        lemmaId={lemmaId}
        arabic={entry.label ?? `#${id}`}
        initial={value}
      />
    </main>
  );
}
