import { createClient } from '@supabase/supabase-js';

// Minimal schema typing so the query builder knows the ling_entries row shape
// (avoids `never` inference). Only the columns the admin app touches.
type LingEntryRow = {
  kind: string;
  ref_key: string;
  value: unknown;
  original: unknown;
  status: 'original' | 'edited';
  label: string | null;
  reviewed: boolean;
  reviewed_at: string | null;
  is_verb: boolean;
  updated_at: string;
};

type Schema = {
  public: {
    Tables: {
      ling_entries: {
        Row: LingEntryRow;
        Insert: Partial<LingEntryRow> & { kind: string; ref_key: string; value: unknown; original: unknown };
        Update: Partial<LingEntryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Single server-side Supabase client using the SERVICE ROLE key. This bypasses
// RLS — appropriate because the whole admin tool is already gated by the shared
// password, and only server code (route handlers / server components) imports
// this. NEVER import this into a 'use client' file.
let _db: ReturnType<typeof createClient<Schema>> | null = null;

export function db() {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  _db = createClient<Schema>(url, key, { auth: { persistSession: false } });
  return _db;
}
