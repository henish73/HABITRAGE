import { NextResponse } from 'next/server';
import { db } from '@financeos/db';
import { apiError } from '@/lib/api-error';
import { requireAuth } from '@/lib/require-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const unauth = await requireAuth(req);
  if (unauth) return unauth;

  try {
    const { transactions, total } = await db.getTransactions({ limit: 10000 });

    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    const categoryMap: Record<string, number> = {};

    for (const t of transactions) {
      if (t.status !== 'posted') continue;
      const isTransfer = (t.type && t.type.toLowerCase() === 'transfers') || t.category === 'Transfers';
      if (isTransfer) continue;

      const month = (t.date || '').substring(0, 7);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { income: 0, expense: 0 };
      }

      if (t.type ? t.type.toLowerCase() === 'inflow' : t.amount > 0) {
        if (t.amount > 0) monthlyMap[month].income += t.amount;
      } else if (t.type ? t.type.toLowerCase() === 'outflow' : t.amount < 0) {
        const exp = Math.abs(t.amount);
        monthlyMap[month].expense += exp;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + exp;
      }
    }

    const cashFlowChartData = Object.entries(monthlyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([month, vals]) => ({
        month,
        income: Math.round(vals.income),
        expense: Math.round(vals.expense),
      }));

    const categoryChartData = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
      }));

    return NextResponse.json({
      success: true,
      totalIndexed: total,
      cashFlowChartData,
      categoryChartData,
    });
  } catch (error: any) {
    return apiError(error, 500);
  }
}
