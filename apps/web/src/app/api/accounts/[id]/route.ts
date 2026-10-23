import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { updateAccountSchema } from '@financeos/shared';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { id } = await params;
    const account = await db.getAccountById(id);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Get transactions for this account
    const txData = await db.getTransactions({
      account_ids: [id],
      limit: 1000,
      sort_by: 'date',
      sort_order: 'asc',
    });

    // Build balance trend line
    const balanceTrend = txData.transactions
      .filter((t) => t.status === 'posted' && t.running_balance !== null)
      .map((t) => ({
        date: t.date,
        balance: t.running_balance,
        amount: t.amount,
      }));

    return NextResponse.json({
      success: true,
      account,
      balanceTrend,
      transactionCount: txData.total,
      recentTransactions: txData.transactions.slice(-20).reverse(),
    });
  } catch (error: any) {
    return apiError(error, 500);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateAccountSchema.parse(body);
    if (Object.keys(validated).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to update.' }, { status: 400 });
    }
    const updated = await db.updateAccount(id, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, account: updated });
  } catch (error: any) {
    return apiError(error, 400);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { id } = await params;
    const deleted = await db.deleteAccount(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error: any) {
    return apiError(error, 500);
  }
}
