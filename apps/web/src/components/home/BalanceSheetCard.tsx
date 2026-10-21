'use client';

import React from 'react';
import { useFinanceStore } from '@/lib/store';
import { formatCAD } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface BalanceSheetProps {
  cashInBanks?: number;
  debtOnCards?: number;
  netWorth?: number;
}

export function BalanceSheetCard({
  cashInBanks = 2579.77,
  debtOnCards = 15558.16,
  netWorth = -12978.39,
}: BalanceSheetProps) {
  const { isMasked } = useFinanceStore();

  const totalVolume = Math.max(cashInBanks + debtOnCards, 1);
  const cashPct = Math.min(Math.max((cashInBanks / totalVolume) * 100, 8), 92);
  const debtMultiple = (debtOnCards / Math.max(cashInBanks, 1)).toFixed(0);

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col gap-3 shadow-vault min-w-0">
      {/* Title & Account Scope */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Net worth
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border border-[var(--line)] text-[var(--muted-color)] bg-[var(--surface)]">
          CAD · 13 accounts
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--neg-soft)] text-[var(--neg)] border border-[var(--neg)]/20">
          Debt is {debtMultiple}× your cash
        </span>
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
          <span>Cash in 7 bank accounts</span>
          <b className={cn("block text-[15px] font-mono text-[var(--ink)] font-semibold", isMasked && "blurnum")}>
            {formatCAD(cashInBanks)}
          </b>
        </div>
        <div className="text-right">
          <span>Owed on 6 cards</span>
          <b className={cn("block text-[15px] font-mono text-[var(--neg)] font-semibold", isMasked && "blurnum")}>
            {formatCAD(debtOnCards)}
          </b>
        </div>
      </div>
    </div>
  );
}
