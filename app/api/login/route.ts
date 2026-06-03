import { NextRequest, NextResponse } from 'next/server';
import { passwordMatches, setAuthCookie } from '@/lib/auth';

// POST /api/login { password } — sets the auth cookie on a correct password.
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
  if (!body.password || !passwordMatches(body.password)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }
  await setAuthCookie();
  return NextResponse.json({ ok: true });
}
