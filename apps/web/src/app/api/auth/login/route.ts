import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getMasterPasscode,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from '@/lib/auth';

const WINDOW_MS = 60 * 1000;
const MAX_FAILURES_PER_CLIENT = 5;
// Ceiling across all clients, so rotating spoofed IP headers can't buy unlimited guesses.
const MAX_FAILURES_GLOBAL = 30;

type Bucket = { attempts: number; resetAt: number };
const failures = new Map<string, Bucket>();
const GLOBAL_KEY = '__global__';

function bucketFor(key: string, now: number): Bucket {
  const existing = failures.get(key);
  if (existing && now <= existing.resetAt) return existing;
  const fresh = { attempts: 0, resetAt: now + WINDOW_MS };
  failures.set(key, fresh);
  return fresh;
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  return (
    bucketFor(clientKey, now).attempts >= MAX_FAILURES_PER_CLIENT ||
    bucketFor(GLOBAL_KEY, now).attempts >= MAX_FAILURES_GLOBAL
  );
}

function recordFailure(clientKey: string) {
  const now = Date.now();
  bucketFor(clientKey, now).attempts += 1;
  bucketFor(GLOBAL_KEY, now).attempts += 1;
  // Keep the map from growing without bound.
  if (failures.size > 5000) {
    for (const [key, bucket] of failures) if (now > bucket.resetAt) failures.delete(key);
  }
}

/**
 * Client address for rate limiting. TRUSTED_PROXY_HOPS is how many proxies
 * append to X-Forwarded-For in front of the app (1 for Cloud Run / Vercel).
 * Entries a client adds itself sit further left and are ignored.
 */
function clientKey(req: NextRequest): string {
  const hops = Math.max(0, parseInt(process.env.TRUSTED_PROXY_HOPS || '1', 10) || 0);
  const chain = (req.headers.get('x-forwarded-for') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (hops > 0 && chain.length >= hops) return chain[chain.length - hops];
  return 'direct';
}

/** Constant-time comparison that also hides the passcode's length. */
function passcodeMatches(input: string, expected: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const key = clientKey(req);
    if (isRateLimited(key)) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { passcode, client } = body ?? {};

    if (!passcode || typeof passcode !== 'string' || passcode.length > 256) {
      return NextResponse.json({ error: 'Enter your passcode.' }, { status: 400 });
    }

    if (!passcodeMatches(passcode, getMasterPasscode())) {
      recordFailure(key);
      return NextResponse.json({ error: 'That passcode is not correct.' }, { status: 401 });
    }

    failures.delete(key);
    const token = await createSessionToken();

    // The mobile app can't use cookies reliably, so it receives the signed session
    // token in the body and sends it back as a bearer token. Browsers never see it.
    const payload: Record<string, unknown> = { success: true };
    if (client === 'mobile') payload.token = token;

    const res = NextResponse.json(payload);
    res.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Sign-in is unavailable right now.' }, { status: 500 });
  }
}
