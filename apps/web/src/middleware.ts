import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken, MASTER_PASSCODE } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static Next.js assets, favicon, login page, and auth APIs
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|map|txt)$/i.test(pathname);
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    isStaticFile
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = await verifySessionToken(sessionToken);

  // Fallback for API clients using Authorization header
  if (!isAuthenticated && pathname.startsWith('/api')) {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        const secret = parts[1];
        if (secret === MASTER_PASSCODE) {
          isAuthenticated = true;
        } else {
          isAuthenticated = await verifySessionToken(secret);
        }
      }
    }
  }

  // If unauthorized API request: return 401 JSON
  if (!isAuthenticated && pathname.startsWith('/api')) {
    return NextResponse.json(
      { error: 'Unauthorized. Sign-in required before accessing FinanceOS.' },
      { status: 401 }
    );
  }

  // If unauthorized page request: redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and accessing login, redirect to home
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
