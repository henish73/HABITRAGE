import { NextResponse } from 'next/server';
import { db } from '@financeos/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const accounts = await db.getAccounts();
    const bills = await db.getBills();

    // Calculate total bank cash
    const totalCash = accounts
      .filter((a) => a.type === 'bank')
      .reduce((sum, a) => sum + Math.max(0, a.balance || 0), 0);

    const now = new Date('2026-10-21T00:00:00Z');
    const days = 30;
    const dailyData: { day: number; dateStr: string; balance: number }[] = [];

    let current = totalCash;
    let lowestPoint = current;
    let lowestDate = 'Today';

    const milestones: { type: 'inflow' | 'outflow'; label: string; amount: number; date: string }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      const dayOfMonth = d.getUTCDate();
      const month = d.getUTCMonth(); // 9 = Oct, 10 = Nov
      const dateStr = d.toISOString().split('T')[0];

      // Biweekly paydays on Oct 30, Nov 13, Nov 27
      if ((month === 9 && dayOfMonth === 30) || (month === 10 && (dayOfMonth === 13 || dayOfMonth === 27))) {
        current += 751.30;
        if (milestones.length < 3) {
          const mName = month === 9 ? 'Oct' : 'Nov';
          milestones.push({
            type: 'inflow',
            label: `+ Payday ${mName} ${dayOfMonth}`,
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
            const mName = month === 9 ? 'Oct' : 'Nov';
            milestones.push({
              type: 'outflow',
              label: `− ${bill.name.split(' ')[0]} ${mName} ${dayOfMonth}`,
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

    // Compute SVG path coordinate points (width: 600, height: 130)
    // Mapping balance range [$1,500, $3,500] to SVG Y [100, 20]
    const minY = 20;
    const maxY = 100;
    const minBal = 1500;
    const maxBal = 3500;

    const points = dailyData.map((pt, idx) => {
      const x = (idx / (days - 1)) * 600;
      const normalized = Math.max(0, Math.min(1, (pt.balance - minBal) / (maxBal - minBal)));
      const y = maxY - normalized * (maxY - minY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = points.length > 0 ? `M${points.join(' L')}` : '';
    const areaD = points.length > 0 ? `M0,120 L${points.join(' L')} L600,120 Z` : '';

    return NextResponse.json({
      success: true,
      startingCash: totalCash,
      lowestPoint: Math.round(lowestPoint * 100) / 100,
      lowestDate,
      isSafe: lowestPoint > 0,
      milestones: milestones.slice(0, 3),
      pathD,
      areaD,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
