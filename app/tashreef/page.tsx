import Link from 'next/link';
import { fetchEntries, type EntriesQuery } from '@/lib/entries';
import EntryList from '@/components/EntryList';
import ListControls from '@/components/ListControls';

// Verb-conjugation list — from ling_entries. Defaults to the "To do" filter.
export default async function TashreefList({
  searchParams,
}: {
  searchParams: Promise<EntriesQuery>;
}) {
  const sp = await searchParams;
  const { rows, total, todo, page, pageCount, filter } = await fetchEntries('tashreef', sp);

  return (
    <main style={{ maxWidth: 720, margin: '5vh auto', padding: 24 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 20 }}>Verb conjugations</h1>
        <Link href="/">← home</Link>
      </div>
      <ListControls basePath="/tashreef" page={page} pageCount={pageCount} total={total} todo={todo} filter={filter} />
      <EntryList kind="tashreef" basePath="/tashreef" rows={rows} filter={filter} />
    </main>
  );
}
