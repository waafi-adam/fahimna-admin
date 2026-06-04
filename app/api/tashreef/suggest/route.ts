import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import type { Tashreef } from '@/lib/types';
import { suggestTashreef } from '@/lib/llm';

// POST /api/tashreef/suggest  { lemmaId, current, comment?, model? }
// Asks an LLM (via OpenRouter) to propose corrections to a lemma's conjugation
// paradigm. Returns { suggestion, notes, model } — it writes NOTHING to the DB.
// The editor renders the suggestion as a diff and only persists cells the human
// accepts, through the normal /api/entry save path.
export const maxDuration = 60; // model calls can take a while

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: {
    lemmaId?: number;
    current?: Tashreef;
    comment?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const { lemmaId, current, comment, model } = body;
  if (typeof lemmaId !== 'number' || !current || typeof current !== 'object') {
    return NextResponse.json(
      { error: 'lemmaId (number) and current (object) are required' },
      { status: 400 },
    );
  }

  try {
    const result = await suggestTashreef({ lemmaId, current, comment, model });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Suggestion failed' },
      { status: 500 },
    );
  }
}
