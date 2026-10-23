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
    const accounts = await db.getAccounts();
    const bills = await db.getBills();

    // Calculate total bank cash across real accounts
    const totalCash = accounts
      .filter((a) => a.type === 'bank')
      .reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0);

    const now = new Date();
    const days = 30;
    const dailyData: { day: number; dateStr: string; balance: number }[] = [];

    let current = totalCash;
    let lowestPoint = current;
    let lowestDate = 'Today';

    const milestones: { type: 'inflow' | 'outflow'; label: string; amount: number; date: string }[] = [];

    // Anchor biweekly payday (every 14 days, e.g. Oct 16, Oct 30, Nov 13, Nov 27, Dec 11...)
    const anchorPayday = new Date('2026-10-16T00:00:00Z');

    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfMonth = d.getDate();
      const dateStr = d.toISOString().split('T')[0];
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });

      // Check bi-weekly payday
      const diffMs = d.getTime() - anchorPayday.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays % 14 === 0) {
        current += 751.30;
        if (milestones.length < 3) {
          milestones.push({
            type: 'inflow',
            label: `+ Payday ${monthName} ${dayOfMonth}`,
            amount: 751.30,
            date: dateStr,
          });
        }
      }

      // Check bills due on this day
      for (const bill of bills) {
        if (!bill.is_paid && (bill.due_day === dayOfMonth || bill.next_due_date === dateStr)) {
          current -= bill.amount;
          if (milestones.length < 4 && bill.amount >= 25) {
            milestones.push({
              type: 'outflow',
              label: `− ${bill.name.split(' ')[0]} ${monthName} ${dayOfMonth}`,
              amount: bill.amount,
              date: dateStr,
            });
          }
        }
      }

      // Daily estimate for small living expenses
      current -= 36.50;

      if (current < lowestPoint) {
        lowestPoint = current;
        lowestDate = dateStr;
      }

      dailyData.push({ day: i, dateStr, balance: Math.round(current * 100) / 100 });
    }

    // Dynamic scale: allow chart to scale down to $0 (or below if negative), rather than clipping at $1,500
    const minObserved = Math.min(...dailyData.map((d) => d.balance));
    const maxObserved = Math.max(...dailyData.map((d) => d.balance));

    // If minObserved >= 0, chart base is 0 so users see cash dropping toward $0
    // If dips negative, chart base is lower than minObserved
    const minBal = minObserved < 0 ? Math.floor((minObserved - 100) / 100) * 100 : 0;
    const maxBal = Math.max(3000, Math.ceil((Math.max(totalCash, maxObserved) * 1.15) / 100) * 100);

    const minY = 20;
    const maxY = 100;

    const points = dailyData.map((pt, idx) => {
      const x = (idx / (days - 1)) * 600;
      const normalized = Math.max(0, Math.min(1, (pt.balance - minBal) / (maxBal - minBal)));
      const y = maxY - normalized * (maxY - minY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = points.length > 0 ? `M${points.join(' L')}` : '';
    const areaD = points.length > 0 ? `M0,120 L${points.join(' L')} L600,120 Z` : '';

    // Generate dynamic timeline step labels
    const timelineLabels = [0, 7, 14, 21, 29].map((offset) => {
      if (offset === 0) return 'Today';
      const dt = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    return NextResponse.json({
      success: true,
      startingCash: totalCash,
      lowestPoint: Math.round(lowestPoint * 100) / 100,
      lowestDate,
      isSafe: lowestPoint > 0,
      minBal,
      maxBal,
      milestones: milestones.slice(0, 3),
      timelineLabels,
      pathD,
      areaD,
    });
  } catch (error: any) {
    return apiError(error, 500);
  }
}
