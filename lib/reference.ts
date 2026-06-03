// Read-only reference data loaded from the app's bundled JSON at build/runtime
// on the SERVER only (these files are large — never ship to the browser whole).
// Used for: lemma search/labels, and the usage tables shown beside the gloss
// editor. APP_DATA_DIR points at fahim-quran-app/assets/data.
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DerivedForm, Lemma } from './types';

// Local copy committed into this repo (data/) so it exists on Vercel. Override
// with APP_DATA_DIR locally to read straight from the app repo if preferred.
const DATA = process.env.APP_DATA_DIR || 'data';

let _lemmas: Lemma[] | null = null;
let _lemmaForms: Record<string, DerivedForm[]> | null = null;
let _rootForms: Record<string, DerivedForm[]> | null = null;

function read(file: string) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), DATA, file), 'utf8'));
}

export function lemmas(): Lemma[] {
  if (!_lemmas) _lemmas = read('lemmas.json');
  return _lemmas!;
}

export function lemmaById(id: number): Lemma | undefined {
  return lemmas().find((l) => l.id === id);
}

/** The usage/concordance table for a lemma: [arabic, EN, ID, UR, count][]. */
export function lemmaForms(lemmaId: number): DerivedForm[] {
  if (!_lemmaForms) _lemmaForms = read('lemma-forms.json');
  return _lemmaForms![String(lemmaId)] ?? [];
}

export function rootForms(rootId: number): DerivedForm[] {
  if (!_rootForms) _rootForms = read('root-forms.json');
  return _rootForms![String(rootId)] ?? [];
}

/** Lightweight lemma search by Arabic (raw/clean), gloss text, or id. */
export function searchLemmas(q: string, limit = 40): Lemma[] {
  const all = lemmas();
  const term = q.trim();
  if (!term) return all.slice(0, limit);
  const asNum = Number(term);
  if (!Number.isNaN(asNum)) {
    const byId = all.find((l) => l.id === asNum);
    return byId ? [byId] : [];
  }
  const t = term.normalize('NFC');
  return all
    .filter((l) => l.arabic.includes(t) || l.arabicClean.includes(t))
    .slice(0, limit);
}
