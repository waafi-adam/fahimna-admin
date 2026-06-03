// Shapes mirrored from the Expo app's types/quran.ts. Kept local so the admin
// app is standalone, but they MUST stay in sync with the app's expectations —
// the editor writes exactly these shapes into ling_entries.value.

export type LingKind = 'tashreef' | 'asma' | 'gloss' | 'pronoun' | 'morphology';

export type ConjugationKey =
  | '3ms' | '3md' | '3mp' | '3fs' | '3fd' | '3fp'
  | '2ms' | '2md' | '2mp' | '2fs' | '2fd' | '2fp'
  | '1s' | '1p';

export type ImperativeKey = '2ms' | '2md' | '2mp' | '2fs' | '2fd' | '2fp';

export type ConjugationTable = Partial<Record<ConjugationKey, string | null>>;
export type ImperativeTable = Partial<Record<ImperativeKey, string | null>>;

export type Tashreef = {
  past: ConjugationTable;
  present: ConjugationTable;
  amr?: ImperativeTable | null;
  passivePast?: ConjugationTable | null;
  passivePresent?: ConjugationTable | null;
  masdar?: string | null;
  fa3il?: string | null;
  maf3ul?: string | null;
};

export type AsmaKey = 'ms' | 'md' | 'mp' | 'fs' | 'fd' | 'fp';
export type Asma = Partial<Record<AsmaKey, string | string[] | null>>;

export type LemmaGlosses = { senses: string[]; source: 'verb-page' | 'haiku' | 'manual' };

/** [arabic, meaningEN, meaningID, meaningUR, count] — read-only usage row. */
export type DerivedForm = [string, string, string, string, number];

// A row from ling_entries.
export type LingEntry = {
  kind: LingKind;
  ref_key: string;
  value: unknown;
  original: unknown;
  status: 'original' | 'edited';
  label: string | null;
  updated_by: string | null;
  updated_at: string;
};

// Lemma metadata for search/context (from lemmas.json).
export type Lemma = {
  id: number;
  arabic: string;
  arabicClean: string;
  count: number;
  words: string[];
};
