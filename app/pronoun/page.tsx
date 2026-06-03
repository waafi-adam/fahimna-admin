import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import PronounEditor, { type PronounsData } from '@/components/PronounEditor';

// Pronoun paradigms — a SINGLE row (kind='pronoun', ref_key='__all__') holding
// the whole pronouns structure, so there is no search/list page; just this one
// edit page.
export default async function PronounPage() {
  const supabase = db();
  const { data: entry } = await supabase
    .from('ling_entries')
    .select('value,status')
    .eq('kind', 'pronoun')
    .eq('ref_key', '__all__')
    .single();

  if (!entry) notFound();

  const value = entry.value as PronounsData;

  return (
    <main style={{ maxWidth: 1100, margin: '4vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20 }}>Pronoun paradigms</h1>
        <Link href="/">← home</Link>
      </div>
      <PronounEditor initial={value} />
    </main>
  );
}
