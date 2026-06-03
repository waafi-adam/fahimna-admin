import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { lemmaForms } from '@/lib/reference';
import GlossEditor from '@/components/GlossEditor';
import ReviewedToggle from '@/components/ReviewedToggle';
import type { LemmaGlosses } from '@/lib/types';

// Gloss detail — the senses editor beside the lemma's usage/concordance table.
export default async function GlossDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lemmaId = Number(id);

  const { data: entry } = await db()
    .from('ling_entries')
    .select('value,label,reviewed')
    .eq('kind', 'gloss')
    .eq('ref_key', id)
    .single();

  if (!entry) notFound();

  const value = entry.value as LemmaGlosses;
  const forms = lemmaForms(lemmaId);

  return (
    <main style={{ maxWidth: 1100, margin: '4vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 }}>
        <Link href="/gloss">← all meanings</Link>
        <ReviewedToggle kind="gloss" refKey={id} initial={entry.reviewed} />
      </div>
      <GlossEditor
        lemmaId={lemmaId}
        arabic={entry.label ?? `#${id}`}
        initial={value}
        forms={forms}
      />
    </main>
  );
}
