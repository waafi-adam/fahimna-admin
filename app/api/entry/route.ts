import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/entry  { kind, ref_key, value }
// Updates ling_entries.value for one entry via the service-role client. Gated
// by the shared-password cookie. The DB trigger writes the audit row + flips
// status to 'edited' automatically.
export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { kind?: string; ref_key?: string; value?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const { kind, ref_key, value } = body;
  if (!kind || !ref_key || value === undefined) {
    return NextResponse.json({ error: 'kind, ref_key, value required' }, { status: 400 });
  }

  const { error } = await db()
    .from('ling_entries')
    .update({ value })
    .eq('kind', kind)
    .eq('ref_key', ref_key);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
