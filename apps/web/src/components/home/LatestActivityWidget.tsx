'use client';

import React from 'react';
import Link from 'next/link';
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

export function LatestActivityWidget() {
  const { isMasked } = useFinanceStore();

  const groups: DayGroup[] = [
    {
      dateLabel: 'Today · Oct 16',
      netLabel: '+$596.45',
      isPositiveNet: true,
      items: [
        {
          id: '1',
          monogram: 'G',
          color: '#2F6BB3',
          merchant: 'Garda Canada',
          details: 'Payroll · CIBC Smart',
          amount: 751.30,
          isInflow: true,
        },
        {
          id: '2',
          monogram: 'T',
          color: '#B5577F',
          merchant: 'Tim Hortons',
          details: 'Dining · CIBC Dividend Visa',
          amount: -4.85,
        },
        {
          id: '3',
          monogram: '⇄',
          color: '#5B7088',
          merchant: 'Transfer to card',
          details: 'Transfers · CIBC Smart',
          amount: -150.00,
        },
      ],
    },
    {
      dateLabel: 'Oct 15',
      netLabel: '−$61.32',
      isPositiveNet: false,
      items: [
        {
          id: '4',
          monogram: 'U',
          color: '#14968A',
          merchant: 'Uber',
          details: 'Rideshare · TD Chequing',
          amount: -5.82,
        },
        {
          id: '5',
          monogram: '$',
          color: '#8C7B55',
          merchant: 'TD monthly fee',
          details: 'Bank fees · TD Chequing',
          amount: -5.00,
        },
      ],
    },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-vault min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Latest activity
        </span>
        <Link
          href="/activity"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--teal)] hover:opacity-80 transition-opacity"
        >
          <span>See all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Ledger Grouped by Day */}
      <div className="flex flex-col divide-y divide-[var(--line-soft)]">
        {groups.map((group) => (
          <div key={group.dateLabel} className="pt-2 first:pt-0">
            {/* Day Header */}
            <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-semibold text-[var(--faint)] py-1.5">
              <span>{group.dateLabel}</span>
              <span className={cn(
                "font-mono font-semibold",
                group.isPositiveNet ? "text-[var(--pos)]" : "text-[var(--ink)]",
                isMasked && "blurnum"
              )}>
                {group.netLabel}
              </span>
            </div>

            {/* Rows */}
            <div className="flex flex-col">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[32px_1fr_auto] gap-3 items-center py-2"
                >
                  <span
                    className="w-8 h-8 rounded-[10px] grid place-items-center font-bold text-xs text-white shrink-0 shadow-xs"
                    style={{ background: item.color }}
                  >
                    {item.monogram}
                  </span>

                  <div className="min-w-0 pr-2">
                    <b className="block text-xs font-semibold text-[var(--ink)] truncate">
                      {item.merchant}
                    </b>
                    <span className="block text-[11.5px] text-[var(--muted-color)] truncate">
                      {item.details}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={cn(
                      "font-mono font-semibold text-xs",
                      item.isInflow ? "text-[var(--pos)]" : "text-[var(--ink)]",
                      isMasked && "blurnum"
                    )}>
                      {item.amount > 0 ? `+${formatCAD(item.amount)}` : `−${formatCAD(Math.abs(item.amount))}`}
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
