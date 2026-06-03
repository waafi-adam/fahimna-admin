import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/reviewed { kind, ref_key, reviewed } — toggle the reviewed tick.
export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  let body: { kind?: string; ref_key?: string; reviewed?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }
  const { kind, ref_key, reviewed } = body;
  if (!kind || !ref_key || typeof reviewed !== 'boolean') {
    return NextResponse.json({ error: 'kind, ref_key, reviewed required' }, { status: 400 });
  }
  const { error } = await db()
    .from('ling_entries')
    .update({ reviewed, reviewed_at: reviewed ? new Date().toISOString() : null })
    .eq('kind', kind)
    .eq('ref_key', ref_key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
