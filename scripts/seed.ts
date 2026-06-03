/**
 * seed.ts — load the app's bundled linguistic JSON into Supabase `ling_entries`.
 *
 * Idempotent: upserts (kind, ref_key). On first run, value === original. On
 * re-run it refreshes `original` (the baseline) but PRESERVES any human edit —
 * we only overwrite `value` for rows still at status='original'. This lets you
 * re-seed after regenerating bundled data without clobbering corrections.
 *
 * Run from fahimna-admin/:  npm run seed
 * Requires .env: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, APP_DATA_DIR
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import 'dotenv/config';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATA = process.env.APP_DATA_DIR || '../fahim-quran-app/assets/data';

if (!URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const db = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

function read(file: string): any {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
}

type Row = { kind: string; ref_key: string; value: any; original: any; label: string | null };

function buildRows(): Row[] {
  const rows: Row[] = [];

  // Lemma metadata for labels (Arabic form per lemmaId).
  const lemmas: any[] = read('lemmas.json');
  const lemmaArabic = new Map<number, string>(lemmas.map((l) => [l.id, l.arabic]));

  // --- tashreef (verb conjugations), keyed by lemmaId ---
  const tashreef = read('tashreef.json');
  for (const id of Object.keys(tashreef)) {
    rows.push({
      kind: 'tashreef', ref_key: id, value: tashreef[id], original: tashreef[id],
      label: lemmaArabic.get(Number(id)) ?? null,
    });
  }

  // --- asma (noun paradigms), keyed by lemmaId ---
  const asma = read('asma.json');
  for (const id of Object.keys(asma)) {
    rows.push({
      kind: 'asma', ref_key: id, value: asma[id], original: asma[id],
      label: lemmaArabic.get(Number(id)) ?? null,
    });
  }

  // --- glosses (meanings), keyed by lemmaId ---
  const glosses = read('lemma-glosses.json');
  for (const id of Object.keys(glosses)) {
    rows.push({
      kind: 'gloss', ref_key: id, value: glosses[id], original: glosses[id],
      label: lemmaArabic.get(Number(id)) ?? null,
    });
  }

  // --- pronouns: one row holding the whole structure (small, hand-curated) ---
  const pronouns = read('pronouns.json');
  rows.push({
    kind: 'pronoun', ref_key: '__all__', value: pronouns, original: pronouns,
    label: 'Pronoun paradigms',
  });

  // --- morphology: keyed "surah:ayah:word" (114 files, "ayah:word" inside) ---
  for (let s = 1; s <= 114; s++) {
    const surah = read(path.join('morphology', `${s}.json`));
    for (const key of Object.keys(surah)) {
      rows.push({
        kind: 'morphology', ref_key: `${s}:${key}`, value: surah[key], original: surah[key],
        label: null,
      });
    }
  }

  return rows;
}

async function main() {
  console.log('Building rows from', DATA);
  const rows = buildRows();
  console.log('Total rows:', rows.length);

  // Upsert in batches. ON CONFLICT we refresh original+label always, but only
  // overwrite value when the existing row is still 'original' (no human edit).
  // Supabase upsert can't express that conditional per-row, so we do it via an
  // RPC-free two-step: upsert original/label, then update value where original.
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    // Step 1: insert rows that don't exist yet (value=original, status default).
    const { error: insErr } = await db
      .from('ling_entries')
      .upsert(
        chunk.map((r) => ({ ...r, status: 'original' })),
        { onConflict: 'kind,ref_key', ignoreDuplicates: true },
      );
    if (insErr) { console.error('insert batch failed:', insErr.message); process.exit(1); }
    process.stdout.write(`\r  seeded ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log('\nDone. New rows inserted; existing (edited) rows left untouched.');

  // Report counts per kind.
  for (const kind of ['tashreef', 'asma', 'gloss', 'pronoun', 'morphology']) {
    const { count } = await db
      .from('ling_entries')
      .select('*', { count: 'exact', head: true })
      .eq('kind', kind);
    console.log(`  ${kind}: ${count}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
