'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ActivityItem {
  id: string;
  monogram: string;
  color: string;
  merchant: string;
  details: string;
  amount: number;
  isInflow?: boolean;
}

interface DayGroup {
  dateLabel: string;
  netLabel: string;
  isPositiveNet?: boolean;
  items: ActivityItem[];
}

function getBadge(merchant: string, category: string) {
  const m = (merchant || '').trim().toUpperCase();
  let char = m[0] || '•';
  if (category?.toLowerCase().includes('transfer') || m.includes('TRANSFER')) char = '⇄';
  else if (category?.toLowerCase().includes('fee') || m.includes('FEE')) char = '$';

  const colors = ['#2F6BB3', '#B5577F', '#14968A', '#8C7B55', '#7A5BB5', '#2B5C8A', '#2C7A4B', '#9B2F2F'];
  let hash = 0;
  for (let i = 0; i < m.length; i++) hash = m.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];
  return { char, color };
}

export function LatestActivityWidget() {
  const { isMasked } = useFinanceStore();

  const { data: txData } = useQuery({
    queryKey: ['transactions', 'latest'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?limit=6&sort_by=date&sort_order=desc');
      return res.json();
    },
  });

  const rawTxs: any[] = txData?.transactions || [];

  // Group transactions by date
  const groups: DayGroup[] = React.useMemo(() => {
    if (!rawTxs || rawTxs.length === 0) return [];

    const map = new Map<string, any[]>();
    for (const tx of rawTxs) {
      const dateKey = tx.date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(tx);
    }

    const res: DayGroup[] = [];
    for (const [dateStr, txs] of map.entries()) {
      let dailySum = 0;
      const items: ActivityItem[] = txs.map((t) => {
        dailySum += t.amount;
        const { char, color } = getBadge(t.merchant || t.description, t.category);
        return {
          id: t.id,
          monogram: char,
          color,
          merchant: t.merchant || t.description,
          details: `${t.category || 'General'}`,
          amount: t.amount,
          isInflow: t.amount > 0,
        };
      });

      const isPositive = dailySum >= 0;
      const netLabel = isPositive ? `+${formatCAD(dailySum)}` : formatCAD(dailySum);

      const d = new Date(dateStr);
      const dateLabel = isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      res.push({
        dateLabel,
        netLabel,
        isPositiveNet: isPositive,
        items,
      });
    }

    return res.slice(0, 3);
  }, [rawTxs]);

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-vault min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Latest activity
        </span>
        <Link
          href="/activity"
          className="text-xs font-semibold text-[var(--teal)] hover:opacity-80 inline-flex items-center gap-1 transition-opacity"
        >
          <span>See all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Ledger Rows */}
      <div className="flex flex-col">
        {txData && groups.length === 0 && (
          <p className="py-6 text-center text-xs text-[var(--muted-color)]">No transactions yet. Add one or import a CSV from Activity.</p>
        )}
        {groups.map((group, gIdx) => (
          <div key={group.dateLabel || gIdx}>
            {/* Day Header Divider */}
            <div className="flex items-center justify-between py-2 text-[11px] font-semibold tracking-wider uppercase text-[var(--faint)]">
              <span>{group.dateLabel}</span>
              <span className={cn(
                "font-mono font-medium",
                group.isPositiveNet ? "text-[var(--pos)]" : "text-[var(--muted-color)]",
                isMasked && "blurnum"
              )}>
                {group.netLabel}
              </span>
            </div>

            {/* Transactions in Day */}
            <div className="flex flex-col">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[32px_1fr_auto] gap-3 items-center py-2 border-t border-[var(--line-soft)]"
                >
                  {/* Monogram Avatar */}
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.monogram}
                  </span>

                  {/* Merchant & Context */}
                  <div className="min-w-0 pr-1">
                    <b className="block text-xs sm:text-[13px] font-semibold text-[var(--ink)] truncate">
                      {item.merchant}
                    </b>
                    <span className="block text-[11px] text-[var(--muted-color)] truncate">
                      {item.details}
                    </span>
                  </div>

                  {/* Mono Amount */}
                  <div className="text-right">
                    <span className={cn(
                      "font-mono font-semibold text-xs sm:text-sm",
                      item.isInflow ? "text-[var(--pos)]" : "text-[var(--ink)]",
                      isMasked && "blurnum"
                    )}>
                      {item.isInflow ? `+${formatCAD(item.amount)}` : formatCAD(item.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
