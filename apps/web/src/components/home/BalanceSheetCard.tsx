'use client';

import React from 'react';
import { useFinanceStore } from '@/lib/store';
import { formatCAD } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BalanceSheetProps {
  cashInBanks: number;
  debtOnCards: number;
  netWorth: number;
  bankCount: number;
  cardCount: number;
  isLoading?: boolean;
}

export function BalanceSheetCard({
  cashInBanks,
  debtOnCards,
  netWorth,
  bankCount,
  cardCount,
  isLoading,
}: BalanceSheetProps) {
  const { isMasked } = useFinanceStore();

  if (isLoading) {
    return <div className="h-48 rounded-2xl bg-[var(--surface)] border border-[var(--line)] animate-pulse" aria-label="Loading net worth" />;
  }

  const cashPart = Math.max(cashInBanks, 0);
  const debtPart = Math.max(debtOnCards, 0);
  const totalVolume = Math.max(cashPart + debtPart, 1);
  const cashPct = cashPart === 0 ? 0 : debtPart === 0 ? 100 : Math.min(Math.max((cashPart / totalVolume) * 100, 4), 96);
  const debtMultiple = cashPart > 0 ? Math.round(debtPart / cashPart) : null;

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 shadow-vault min-w-0">
      {/* Title & Account Scope */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Net worth
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border border-[var(--line)] text-[var(--muted-color)] bg-[var(--surface)]">
          CAD · {bankCount + cardCount} accounts
        </span>
      </div>

      {/* Big Number & Ratio Chip */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className={cn(
          "text-3xl sm:text-4xl font-semibold font-mono tracking-tight leading-none",
          netWorth < 0 ? "text-[var(--neg)]" : "text-[var(--pos)]",
          isMasked && "blurnum"
        )}>
          {netWorth < 0 ? `−${formatCAD(Math.abs(netWorth))}` : formatCAD(netWorth)}
        </div>
        {debtMultiple !== null && debtMultiple >= 2 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--neg-soft)] text-[var(--neg)] border border-[var(--neg)]/20">
            Debt is {debtMultiple}× your cash
          </span>
        )}
      </div>

      {/* Balance-Sheet Split Bar */}
      <div className="bsbar mt-1 bg-[var(--raised)] border border-[var(--line-soft)]" title={`Cash: ${cashPct.toFixed(1)}% vs Debt`}>
        <i
          style={{ width: `${cashPct}%`, background: 'var(--teal)' }}
          className="transition-all duration-500"
        />
        <i
          style={{ flex: 1, background: 'var(--neg)', opacity: 0.85 }}
          className="transition-all duration-500"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-[var(--muted-color)] mt-1">
        <div>
          <span>Cash in {bankCount} bank account{bankCount === 1 ? '' : 's'}</span>
          <b className={cn("block text-[15px] font-mono text-[var(--ink)] font-semibold", isMasked && "blurnum")}>
            {formatCAD(cashInBanks)}
          </b>
        </div>
        <div className="text-right">
          <span>Owed on {cardCount} card{cardCount === 1 ? '' : 's'}</span>
          <b className={cn("block text-[15px] font-mono text-[var(--neg)] font-semibold", isMasked && "blurnum")}>
            {formatCAD(debtOnCards)}
          </b>
        </div>
      </div>
    </div>
  );
}
