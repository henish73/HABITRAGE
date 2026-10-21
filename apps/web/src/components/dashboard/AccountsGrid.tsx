'use client';

import React from 'react';
import { Account, formatCAD } from '@financeos/shared';
import { useFinanceStore } from '@/lib/store';
import { CreditCard, Landmark, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AccountsGridProps {
  accounts: Account[];
  isLoading?: boolean;
}

export function AccountsGrid({ accounts, isLoading }: AccountsGridProps) {
  const { isMasked } = useFinanceStore();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Accounts & Cards ({accounts.length})</h3>
          <p className="text-xs text-muted-foreground">Connected bank accounts and credit lines</p>
        </div>
        <Link
          href="/accounts"
          className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1"
        >
          <span>Manage All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isCC = acc.type === 'credit_card';
          const utilPct = isCC && acc.credit_limit && acc.credit_limit > 0
            ? Math.min(100, Math.round(((acc.balance || 0) / acc.credit_limit) * 100))
            : 0;

          return (
            <Link
              key={acc.id}
              href={`/accounts?id=${acc.id}`}
              className="p-5 rounded-2xl bg-card border border-border shadow-executive hover:border-accent/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center font-semibold text-xs text-foreground">
                      {isCC ? <CreditCard className="w-4 h-4 text-foreground" /> : <Landmark className="w-4 h-4 text-foreground" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                        {acc.account_name}
                      </div>
                      <div className="text-[12px] text-muted-foreground tabular-nums">
                        {acc.bank_name} • {acc.account_number}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                    {acc.account_type}
                  </span>
                </div>

                <div className="my-2">
                  <div className="text-[12px] font-medium text-muted-foreground">
                    {isCC ? 'Current Debt / Balance' : 'Available Balance'}
                  </div>
                  <div
                    className={`text-xl font-semibold tracking-tight tabular-nums font-financial transition-all duration-200 ${
                      isCC && (acc.balance || 0) > 0 ? 'text-negative' : 'text-foreground'
                    } ${isMasked ? 'blur-sm select-none' : ''}`}
                  >
                    {formatCAD(acc.balance)}
                  </div>
                </div>
              </div>

              {/* Progress gauge for Credit Cards */}
              {isCC && acc.credit_limit ? (
                <div className="pt-3 border-t border-border mt-2">
                  <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-1.5 tabular-nums">
                    <span className={isMasked ? 'blur-sm select-none' : ''}>
                      Limit: {formatCAD(acc.credit_limit)}
                    </span>
                    <span className={utilPct > 30 ? 'text-warning font-semibold' : 'text-muted-foreground font-semibold'}>
                      {utilPct}% Utilized
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        utilPct > 50
                          ? 'bg-negative'
                          : utilPct > 30
                          ? 'bg-warning'
                          : 'bg-accent'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-border mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                  <span className="text-positive font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                    Active
                  </span>
                  <span className="tabular-nums">Standard Rate</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
