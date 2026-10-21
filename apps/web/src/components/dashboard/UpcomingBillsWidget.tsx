'use client';

import React from 'react';
import { Bill, formatCAD } from '@financeos/shared';
import { Calendar, ChevronRight, Home, CreditCard, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { usePrivacyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface UpcomingBillsWidgetProps {
  bills: Bill[];
  isLoading?: boolean;
}

export function UpcomingBillsWidget({ bills, isLoading }: UpcomingBillsWidgetProps) {
  const isMasked = usePrivacyStore((s) => s.isMasked);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border shadow-executive space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const getBillIcon = (type: string) => {
    switch (type) {
      case 'rent':
        return <Home className="w-3.5 h-3.5 text-foreground" />;
      case 'credit_card':
        return <CreditCard className="w-3.5 h-3.5 text-foreground" />;
      case 'utility':
        return <Zap className="w-3.5 h-3.5 text-foreground" />;
      case 'subscription':
        return <Sparkles className="w-3.5 h-3.5 text-foreground" />;
      default:
        return <Calendar className="w-3.5 h-3.5 text-foreground" />;
    }
  };

  const upcoming = bills.slice(0, 4);

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Upcoming Bills</h3>
          <p className="text-xs text-muted-foreground">Scheduled payments & card due dates</p>
        </div>
        <Link
          href="/bills"
          className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {upcoming.map((bill) => (
          <div
            key={bill.id}
            className="p-3 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                {getBillIcon(bill.type)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">{bill.name}</div>
                <div className="text-[12px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                  <span className="tabular-nums">Due {bill.next_due_date}</span>
                  {bill.autopay && (
                    <span className="text-[10px] text-positive bg-positive/10 px-1.5 py-0.2 rounded-full font-semibold border border-positive/20">
                      Autopay ON
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={cn(
                  "text-xs font-semibold text-foreground tabular-nums font-financial transition-all duration-200",
                  isMasked && "blur-sm select-none"
                )}
              >
                {formatCAD(bill.amount)}
              </div>
              <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.2 rounded-full border border-warning/20 inline-block mt-0.5">
                Scheduled
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
