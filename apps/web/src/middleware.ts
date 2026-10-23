import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static Next.js assets, favicon, login page, and auth APIs
  // Never treat any /api route as a static file
  const isStaticFile = !pathname.startsWith('/api') && /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|map)$/i.test(pathname);
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health' ||
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    isStaticFile
  ) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  let isAuthenticated = await verifySessionToken(sessionToken);

  // API clients (the mobile app) send the signed session token as a bearer token.
  // The passcode itself is never accepted here: it is only exchanged at /api/auth/login.
  if (!isAuthenticated && pathname.startsWith('/api')) {
    const authHeader = req.headers.get('authorization');
    const match = authHeader?.match(/^Bearer\s+(\S+)$/i);
    if (match) {
      isAuthenticated = await verifySessionToken(match[1]);
    }
  }

  // If unauthorized API request: return 401 JSON
  if (!isAuthenticated && pathname.startsWith('/api')) {
    return NextResponse.json(
      { error: 'Unauthorized. Sign-in required before accessing FinanceOS.' },
      { status: 401 }
    );
  }

  // If unauthorized page request: redirect to /login with search query preserved
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    const fullPath = pathname + req.nextUrl.search;
    if (pathname !== '/' || req.nextUrl.search) {
      loginUrl.searchParams.set('next', fullPath);
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
