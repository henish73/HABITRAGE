'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { isMasked } = useFinanceStore();
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | 'ytd' | 'all'>('all');

  const { data: txData, isLoading } = useQuery({
    queryKey: ['transactions', 'analytics'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?limit=5000&sort_by=date&sort_order=desc');
      return res.json();
    },
  });

  const transactions: any[] = txData?.transactions || [];

  // Filter transactions by timeframe
  const filteredTxs = useMemo(() => {
    if (timeframe === 'all') return transactions;
    const now = new Date();
    let cutoff = new Date();
    if (timeframe === '30d') {
      cutoff.setDate(now.getDate() - 30);
    } else if (timeframe === '90d') {
      cutoff.setDate(now.getDate() - 90);
    } else if (timeframe === 'ytd') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return transactions.filter((t) => t.date >= cutoffStr);
  }, [transactions, timeframe]);

  // Aggregate monthly Cash Flow for CashFlowChart
  const cashFlowData = useMemo(() => {
    const monthMap: Record<string, { income: number; expense: number }> = {};

    for (const t of transactions) {
      if (t.status !== 'posted') continue;
      const monthKey = (t.date || '').slice(0, 7); // YYYY-MM
      if (!monthKey || monthKey.length < 7) continue;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { income: 0, expense: 0 };
      }

      if (t.amount > 0) {
        monthMap[monthKey].income += t.amount;
      } else {
        monthMap[monthKey].expense += Math.abs(t.amount);
      }
    }

    // Sort chronologically and format labels
    const sortedKeys = Object.keys(monthMap).sort().slice(-8); // past 8 months
    return sortedKeys.map((key) => {
      const [y, m] = key.split('-');
      const d = new Date(Number(y), Number(m) - 1, 1);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return {
        month: label,
        income: Math.round(monthMap[key].income * 100) / 100,
        expense: Math.round(monthMap[key].expense * 100) / 100,
      };
    });
  }, [transactions]);

  // Aggregate Category Breakdown for CategoryPieChart
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};

    for (const t of filteredTxs) {
      if (t.status !== 'posted' || t.amount >= 0) continue;
      const c = t.category || 'General';
      catMap[c] = (catMap[c] || 0) + Math.abs(t.amount);
    }

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTxs]);

  // Top Merchants Leaderboard
  const topMerchants = useMemo(() => {
    const merchMap: Record<string, { total: number; count: number; category: string }> = {};

    for (const t of filteredTxs) {
      if (t.status !== 'posted' || t.amount >= 0) continue;
      const name = (t.merchant || t.description || 'Unknown').trim();
      if (!merchMap[name]) {
        merchMap[name] = { total: 0, count: 0, category: t.category || 'General' };
      }
      merchMap[name].total += Math.abs(t.amount);
      merchMap[name].count += 1;
    }

    return Object.entries(merchMap)
      .map(([name, data]) => ({ name, total: Math.round(data.total * 100) / 100, count: data.count, category: data.category }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filteredTxs]);

  // Totals for headline metric cards
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    for (const t of filteredTxs) {
      if (t.status !== 'posted') continue;
      if (t.amount > 0) totalInflow += t.amount;
      else totalOutflow += Math.abs(t.amount);
    }

    const netSavings = totalInflow - totalOutflow;
    const savingsRate = totalInflow > 0 ? Math.round((netSavings / totalInflow) * 100) : 0;

    return {
      totalInflow: Math.round(totalInflow * 100) / 100,
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
      savingsRate,
    };
  }, [filteredTxs]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Analytics
          </h1>
          <p className="text-xs text-[var(--muted-color)] mt-0.5">
            Spending patterns, merchant breakdowns, and cash flow trends across 4,159 transactions
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[var(--raised)] p-1 rounded-xl border border-[var(--line-soft)] self-start sm:self-auto text-xs font-semibold">
          {(['30d', '90d', 'ytd', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all cursor-pointer',
                timeframe === t
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                  : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
              )}
            >
              {t === '30d' ? '30 Days' : t === '90d' ? '90 Days' : t === 'ytd' ? 'YTD' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-vault">
          <span className="text-xs text-[var(--muted-color)] block font-medium">Total Inflows</span>
          <b className={cn("text-xl font-mono text-[var(--pos)] block mt-1", isMasked && "blurnum")}>
            +{formatCAD(metrics.totalInflow)}
          </b>
          <span className="text-[11px] text-[var(--muted-color)] mt-0.5 block">Income &amp; deposits</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-vault">
          <span className="text-xs text-[var(--muted-color)] block font-medium">Total Outflows</span>
          <b className={cn("text-xl font-mono text-[var(--neg)] block mt-1", isMasked && "blurnum")}>
            −{formatCAD(metrics.totalOutflow)}
          </b>
          <span className="text-[11px] text-[var(--muted-color)] mt-0.5 block">Expenses &amp; purchases</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-vault">
          <span className="text-xs text-[var(--muted-color)] block font-medium">Net Position</span>
          <b className={cn(
            "text-xl font-mono block mt-1",
            metrics.netSavings >= 0 ? "text-[var(--pos)]" : "text-[var(--warn)]",
            isMasked && "blurnum"
          )}>
            {metrics.netSavings >= 0 ? `+${formatCAD(metrics.netSavings)}` : formatCAD(metrics.netSavings)}
          </b>
          <span className="text-[11px] text-[var(--muted-color)] mt-0.5 block">Inflow minus outflow</span>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-vault">
          <span className="text-xs text-[var(--muted-color)] block font-medium">Savings Rate</span>
          <b className="text-xl font-mono text-[var(--ink)] block mt-1">
            {metrics.savingsRate}%
          </b>
          <span className="text-[11px] text-[var(--muted-color)] mt-0.5 block">Retained income percent</span>
        </div>
      </div>

      {/* Primary Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlowData} isLoading={isLoading} />
        </div>
        <div>
          <CategoryPieChart data={categoryData} isLoading={isLoading} />
        </div>
      </div>

      {/* Top Merchants Leaderboard */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[var(--teal)]" />
            <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
              Top Merchant Spend
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--muted-color)]">{topMerchants.length} Highest Volume</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topMerchants.map((m, idx) => (
            <div
              key={m.name}
              className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--raised)]/50 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b className="text-xs font-semibold text-[var(--ink)] block truncate">
                    #{idx + 1} {m.name}
                  </b>
                  <span className="text-[11px] text-[var(--muted-color)]">
                    {m.category} · {m.count} charges
                  </span>
                </div>
              </div>
              <div className={cn("text-sm font-mono font-bold text-[var(--ink)]", isMasked && "blurnum")}>
                {formatCAD(m.total)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
