import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { calculateNetWorth } from '@financeos/shared';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

import { accountSchema } from '@financeos/shared';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = accountSchema.parse(body);
    const newAccount = await db.createAccount(validated);
    return NextResponse.json({ success: true, account: newAccount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
