import { db } from '@/lib/db';
import type { EntryRow } from '@/components/EntryList';

export const PAGE_SIZE = 50;

export type EntriesQuery = { q?: string; filter?: string; page?: string; verbs?: string };

export type EntriesResult = {
  rows: EntryRow[];
  total: number;        // entries matching the current filter (for paging)
  todo: number;         // unreviewed count in the current scope (verbs filter applied)
  page: number;
  pageCount: number;
  filter: string;
  includeVerbs: boolean;
};

// Server-side: fetch one page of ling_entries for a kind, with search, filter
// (default 'unreviewed' = To do), pagination, and — for gloss — an optional
// verb scope. Verb glosses come from the corpus and are trusted, so the gloss
// list excludes them by default unless `verbs=1`.
export async function fetchEntries(kind: string, sp: EntriesQuery): Promise<EntriesResult> {
  const q = (sp.q ?? '').trim();
  const filter = sp.filter ?? 'unreviewed'; // default to "To do"
  const includeVerbs = kind === 'gloss' ? sp.verbs === '1' : true;
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Base scope shared by both the page query and the "todo" count: kind, verb
  // scope, and search. Filter (reviewed/edited) is applied per-use.
  const scope = () => {
    let s = db().from('ling_entries').select('ref_key,label,status,reviewed', { count: 'exact' }).eq('kind', kind);
    if (kind === 'gloss' && !includeVerbs) s = s.eq('is_verb', false);
    if (q) s = s.or(`label.ilike.%${q}%,ref_key.eq.${q}`);
    return s;
  };

  // Page query with the active filter.
  let query = scope();
  if (filter === 'unreviewed') query = query.eq('reviewed', false);
  else if (filter === 'reviewed') query = query.eq('reviewed', true);
  else if (filter === 'edited') query = query.eq('status', 'edited');
  query = query.order('reviewed', { ascending: true }).order('ref_key', { ascending: true });

  const { data, count, error } = await query.range(from, to);
  if (error) throw new Error(error.message);

  // "How much left" = unreviewed in the current verb/search scope.
  const { count: todoCount } = await scope().eq('reviewed', false).range(0, 0);

  const total = count ?? 0;
  return {
    rows: (data ?? []) as EntryRow[],
    total,
    todo: todoCount ?? 0,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    filter,
    includeVerbs,
  };
}
