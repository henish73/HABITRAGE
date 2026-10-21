import { NextRequest, NextResponse } from 'next/server';
import { MASTER_PASSCODE, SESSION_COOKIE_NAME, createSessionToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passcode } = body;

    if (!passcode || typeof passcode !== 'string') {
      return NextResponse.json({ error: 'Passcode is required.' }, { status: 400 });
    }

    if (passcode !== MASTER_PASSCODE) {
      return NextResponse.json({ error: 'Invalid passcode. Access denied.' }, { status: 401 });
    }

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
