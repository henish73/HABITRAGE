'use client';

import React from 'react';
import { formatCAD } from '@financeos/shared';
import { ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import { usePrivacyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface CashFlowCardsProps {
  income: number;
  expense: number;
  isLoading?: boolean;
}

export function CashFlowCards({ income, expense, isLoading }: CashFlowCardsProps) {
  const isMasked = usePrivacyStore((s) => s.isMasked);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const netSavings = income - expense;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Spent This Month */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Spent
          </span>
          <div className="w-7 h-7 rounded-lg bg-negative/10 text-negative flex items-center justify-center">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div
            className={cn(
              "text-2xl font-semibold text-negative tracking-tight tabular-nums font-financial transition-all duration-200",
              isMasked && "blur-sm select-none"
            )}
          >
            {formatCAD(expense)}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">Expenses & Card Outflows</p>
        </div>
      </div>

      {/* Income This Month */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Inflow
          </span>
          <div className="w-7 h-7 rounded-lg bg-positive/10 text-positive flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div
            className={cn(
              "text-2xl font-semibold text-positive tracking-tight tabular-nums font-financial transition-all duration-200",
              isMasked && "blur-sm select-none"
            )}
          >
            {formatCAD(income)}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">Payroll, Credits & Deposits</p>
        </div>
      </div>

      {/* Net Savings */}
      <div className="p-5 rounded-2xl bg-card border border-border shadow-executive flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
            Net Savings
          </span>
          <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div
            className={cn(
              "text-2xl font-semibold text-foreground tracking-tight tabular-nums font-financial transition-all duration-200",
              netSavings > 0 ? "text-positive" : netSavings < 0 ? "text-negative" : "text-foreground",
              isMasked && "blur-sm select-none"
            )}
          >
            {formatCAD(netSavings, true)}
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "font-semibold px-1.5 py-0.2 rounded-full text-[11px] border",
                savingsRate >= 0
                  ? "bg-positive/10 text-positive border-positive/25"
                  : "bg-negative/10 text-negative border-negative/25"
              )}
            >
              {savingsRate}%
            </span>
            <span>Savings Rate</span>
          </p>
        </div>
      </div>
    </div>
  );
}
