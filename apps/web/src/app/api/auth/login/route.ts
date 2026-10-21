import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { MASTER_PASSCODE, SESSION_COOKIE_NAME, createSessionToken } from '@/lib/auth';

// In-memory rate limiting map: IP -> { attempts: number, resetAt: number }
const loginAttempts = new Map<string, { attempts: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return false;

  if (now > record.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }

  return record.attempts >= 5;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, resetAt: now + 60 * 1000 };
  record.attempts += 1;
  loginAttempts.set(ip, record);
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Run dummy timing comparison to prevent length leak timing attacks
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many failed login attempts. Please wait 1 minute before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    if (!timingSafeEqual(passcode, MASTER_PASSCODE)) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid passcode. Access denied.' }, { status: 401 });
    }

    // Success: clear rate limit record
    resetAttempts(ip);

    const token = await createSessionToken();
    const isProduction = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ success: true, message: 'Authenticated successfully' });
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return res;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
