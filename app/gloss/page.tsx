import Link from 'next/link';
import { fetchEntries, type EntriesQuery } from '@/lib/entries';
import EntryList from '@/components/EntryList';
import ListControls from '@/components/ListControls';

// Lemma-meaning list — from ling_entries. Defaults to NON-verb meanings (verb
// senses come from the corpus and are trusted) and the "To do" filter.
export default async function GlossList({
  searchParams,
}: {
  searchParams: Promise<EntriesQuery>;
}) {
  const sp = await searchParams;
  const { rows, total, todo, page, pageCount, filter, includeVerbs } = await fetchEntries('gloss', sp);

  return (
    <main style={{ maxWidth: 720, margin: '5vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20 }}>Lemma meanings</h1>
        <Link href="/">← home</Link>
      </div>
      <ListControls basePath="/gloss" page={page} pageCount={pageCount} total={total} todo={todo}
        filter={filter} showVerbToggle includeVerbs={includeVerbs} />
      <EntryList kind="gloss" basePath="/gloss" rows={rows} filter={filter} />
    </main>
  );
}
