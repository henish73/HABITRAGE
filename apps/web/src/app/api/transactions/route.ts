import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { createTransactionSchema } from '@financeos/shared';
import { filtersFromSearchParams, pagingFromSearchParams } from '@/lib/tx-filters';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { searchParams } = new URL(req.url);
    const params = {
      ...filtersFromSearchParams(searchParams),
      ...pagingFromSearchParams(searchParams, 5000),
    };
    const result = await db.getTransactions(params);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Transactions list error:', error);
    return NextResponse.json({ success: false, error: 'Could not load transactions.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const body = await req.json();
    const validated = createTransactionSchema.parse(body);

    const created = await db.createTransaction(validated as any);
    return NextResponse.json({ success: true, transaction: created }, { status: 201 });
  } catch (error: any) {
    return apiError(error, 400);
  }
}
