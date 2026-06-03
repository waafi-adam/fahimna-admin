// Applies a SQL migration file to the Supabase Postgres DB over the direct
// connection. Reads SUPABASE_DB_URL from the backend .env. Idempotent migration
// (create-if-not-exists / drop-if-exists), safe to re-run.
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const DB_URL = process.env.SUPABASE_DB_URL;
const SQL_FILE = process.argv[2];
const CHECK_ONLY = process.argv.includes('--check');

if (!DB_URL) { console.error('SUPABASE_DB_URL not set'); process.exit(1); }

const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('connected.');

  // Prerequisite check: the migration uses public.set_updated_at() and gen_random_uuid().
  const pre = await client.query(
    `select proname from pg_proc where proname = 'set_updated_at' limit 1;`,
  );
  console.log('set_updated_at() exists:', pre.rowCount > 0);

  // Show existing relevant tables before.
  const before = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name in
     ('editors','ling_entries','ling_audit') order by table_name;`,
  );
  console.log('ling tables present BEFORE:', before.rows.map((r) => r.table_name));

  if (CHECK_ONLY) { console.log('check-only, not applying.'); await client.end(); return; }

  const sql = readFileSync(SQL_FILE, 'utf8');
  await client.query(sql);
  console.log('migration applied.');

  const after = await client.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name in
     ('editors','ling_entries','ling_audit') order by table_name;`,
  );
  console.log('ling tables present AFTER:', after.rows.map((r) => r.table_name));

  const fn = await client.query(`select proname from pg_proc where proname='is_editor';`);
  console.log('is_editor() created:', fn.rowCount > 0);

  await client.end();
}

main().catch(async (e) => { console.error('ERROR:', e.message); try { await client.end(); } catch {} process.exit(1); });
