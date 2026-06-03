import { cookies } from 'next/headers';

// Dead-simple single-password gate for this temporary internal tool. On login
// we set a signed cookie = HMAC(secret, "ok"); every request verifies it. No
// per-user accounts, no Supabase Auth.
//
// Uses the Web Crypto API (globalThis.crypto.subtle) rather than node:crypto so
// the token helpers work in BOTH the Node runtime (route handlers / RSC) and
// the Edge runtime (middleware) — node:crypto is not available on Edge.

const COOKIE = 'fahimna_admin';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function token(): Promise<string> {
  const secret = process.env.ADMIN_COOKIE_SECRET || 'dev-secret';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ok'));
  return toHex(sig);
}

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected || input.length !== expected.length) return false;
  // constant-time-ish compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function setAuthCookie() {
  const jar = await cookies();
  jar.set(COOKIE, await token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value === (await token());
}

/** For middleware (Edge): compare a raw cookie value to the expected token. */
export async function isAuthedValue(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  return cookieValue === (await token());
}

export const AUTH_COOKIE = COOKIE;
