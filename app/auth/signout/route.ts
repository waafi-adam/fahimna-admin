import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(req: Request) {
  await clearAuthCookie();
  return NextResponse.redirect(new URL('/login', req.url), { status: 303 });
}
