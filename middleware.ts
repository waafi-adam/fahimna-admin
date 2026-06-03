import { NextResponse, type NextRequest } from 'next/server';
import { isAuthedValue, AUTH_COOKIE } from '@/lib/auth';

// Gate everything behind the shared-password cookie, except the login page and
// its action.
export async function middleware(request: NextRequest) {
  const authed = await isAuthedValue(request.cookies.get(AUTH_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith('/login');
  // The login API must be reachable WHILE UNAUTHENTICATED — otherwise the gate
  // would redirect the very request that sets the auth cookie (a 307 preserves
  // POST, so it'd bounce back to /login and never sign in).
  const isLoginApi = pathname === '/api/login';

  if (!authed && !isLogin && !isLoginApi) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (authed && isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
