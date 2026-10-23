import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './auth';

/**
 * Extracts a named cookie value from a standard Request or NextRequest.
 */
function getCookie(req: Request, name: string): string | undefined {
  if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
    const c = (req as any).cookies.get(name);
    return typeof c === 'string' ? c : c?.value;
  }
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Defense-in-depth auth check for API routes.
 *
 * Accepts either:
 *  1. financeos_session cookie (web browser)
 *  2. Authorization: Bearer <session_token> (mobile app / API clients)
 *
 * Returns null if the caller is authenticated, or a 401 JSON NextResponse matching
 * the middleware error format if unauthenticated or invalid.
 */
export async function requireAuth(req: Request): Promise<NextResponse | null> {
  // 1. Check session cookie
  const cookieToken = getCookie(req, SESSION_COOKIE_NAME);
  if (cookieToken && (await verifySessionToken(cookieToken))) {
    return null;
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  const match = authHeader?.match(/^Bearer\s+(\S+)$/i);
  if (match && (await verifySessionToken(match[1]))) {
    return null;
  }

  return NextResponse.json(
    { error: 'Unauthorized. Sign-in required before accessing FinanceOS.' },
    { status: 401 }
  );
}
