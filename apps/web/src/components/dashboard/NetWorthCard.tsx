'use client';

import React from 'react';
import { formatCAD } from '@financeos/shared';
import { ArrowUpRight, ArrowDownRight, Wallet, Clock } from 'lucide-react';
import { useFinanceStore } from '@/lib/store';

interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalDebts: number;
  accountCount?: number;
  isLoading?: boolean;
}

export function NetWorthCard({
  netWorth,
  totalAssets,
  totalDebts,
  accountCount,
  isLoading,
}: NetWorthCardProps) {
  const { isMasked } = useFinanceStore();
  const isNegative = netWorth < 0;

  if (isLoading) {
    return (
      <div className="h-48 rounded-2xl bg-card border border-border animate-pulse" />
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-card border border-border shadow-executive flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-foreground" />
            <span>Net Worth · CAD</span>
          </div>
          {/* Synced indicator — no fake MoM % */}
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
            <Clock className="w-3 h-3" />
            Live
          </span>
        </div>

        <div
          className={`text-3xl font-semibold tracking-tight my-1.5 font-financial ${
            isNegative ? 'text-negative' : 'text-positive'
          } ${isMasked ? 'masked' : ''}`}
        >
          {formatCAD(netWorth)}
        </div>

        {accountCount !== undefined && (
          <p className="text-xs text-muted-foreground">
            Across {accountCount} connected account{accountCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-positive-soft text-positive flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">Cash Assets</div>
            <div className={`text-xs font-semibold text-foreground font-financial ${isMasked ? 'masked' : ''}`}>
              {formatCAD(totalAssets)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-negative-soft text-negative flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground font-medium">Card Debt</div>
            <div className={`text-xs font-semibold text-negative font-financial ${isMasked ? 'masked' : ''}`}>
              {formatCAD(totalDebts)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
