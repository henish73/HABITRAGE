import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Restores deleted transactions from the 30-day trash.
 * Body: { id: string } or { ids: string[] }. Only server-side trash entries can
 * be restored; the client can't supply transaction data here.
 */
export async function POST(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const body = await req.json().catch(() => ({}));
    const ids: unknown[] = Array.isArray(body?.ids) ? body.ids : body?.id ? [body.id] : [];
    const clean = ids.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 100);

    if (clean.length === 0) {
      return NextResponse.json({ success: false, error: 'Transaction id is required.' }, { status: 400 });
    }

    const restored = await db.restoreTransactions(clean.slice(0, 1000));
    if (restored.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nothing to restore. It may be older than 30 days or already restored.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, count: restored.length, transactions: restored });
  } catch (error: any) {
    return apiError(error, 500);
  }
}
