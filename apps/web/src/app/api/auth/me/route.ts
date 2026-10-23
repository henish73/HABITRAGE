import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';

export async function GET(req: NextRequest) {
  const unauth = await requireAuth(req);
  if (unauth) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user: { role: 'owner', name: 'Vault Owner' } });
}
