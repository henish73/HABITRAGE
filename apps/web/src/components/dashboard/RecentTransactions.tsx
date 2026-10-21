'use client';

import React from 'react';
import { Transaction, formatCAD } from '@financeos/shared';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useFinanceStore } from '@/lib/store';

interface RecentTransactionsProps {
  transactions: Transaction[];
  totalCount?: number;
  isLoading?: boolean;
  onSelectTransaction?: (tx: Transaction) => void;
}

export function RecentTransactions({
  transactions,
  totalCount,
  isLoading,
  onSelectTransaction,
}: RecentTransactionsProps) {
  const { isMasked } = useFinanceStore();
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-card border border-border shadow-executive space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
          <p className="text-xs text-muted-foreground">Latest 10 transactions across your accounts</p>
        </div>
        <Link
          href="/transactions"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
        >
          <span>View All{totalCount ? ` (${totalCount.toLocaleString()})` : ''}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-border">
        {transactions.map((tx) => {
          const isExpense = tx.amount < 0;
          return (
            <div
              key={tx.id}
              onClick={() => onSelectTransaction && onSelectTransaction(tx)}
              className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-secondary/60 px-2 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isExpense
                      ? 'bg-negative/10 text-negative border-negative/20'
                      : 'bg-positive/10 text-positive border-positive/20'
                  }`}
                >
                  {isExpense ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                    {tx.merchant || tx.description}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
                    <span className="tabular-nums">{tx.date}</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium border border-border">
                      {tx.account?.bank_name} • {tx.account?.account_name}
                    </span>
                    <span>•</span>
                    <span className="text-muted-foreground font-medium">{tx.category}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div
                  className={`text-xs font-semibold font-financial ${
                    isExpense ? 'text-negative' : 'text-positive'
                  } ${isMasked ? 'masked' : ''}`}
                >
                  {isExpense ? '−' : '+'}{formatCAD(Math.abs(tx.amount))}
                </div>
                {tx.status === 'pending' ? (
                  <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.2 rounded-full border border-warning/20 inline-flex items-center gap-0.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5" /> Pending
                  </span>
                ) : (
                  tx.running_balance !== null && tx.running_balance !== undefined && (
                    <span className="text-[10px] text-muted-foreground tabular-nums block mt-0.5">
                      Bal: {formatCAD(tx.running_balance)}
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
