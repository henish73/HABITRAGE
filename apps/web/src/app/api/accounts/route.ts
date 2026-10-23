import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { calculateNetWorth, accountSchema } from '@financeos/shared';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const accounts = await db.getAccounts();
    const netWorthStats = calculateNetWorth(accounts);

    return NextResponse.json({
      success: true,
      accounts,
      netWorth: netWorthStats.netWorth,
      totalAssets: netWorthStats.totalAssets,
      totalDebts: netWorthStats.totalDebts,
    });
  } catch (error: any) {
    return apiError(error, 500);
  }
}

export async function POST(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const body = await req.json();
    const validated = accountSchema.parse(body);
    const newAccount = await db.createAccount(validated);
    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (error: any) {
    return apiError(error, 400);
  }
}
