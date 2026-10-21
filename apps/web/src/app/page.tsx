'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { CashFlowCards } from '@/components/dashboard/CashFlowCards';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryPieChart } from '@/components/dashboard/CategoryPieChart';
import { AccountsGrid } from '@/components/dashboard/AccountsGrid';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { UpcomingBillsWidget } from '@/components/dashboard/UpcomingBillsWidget';
import { TransactionDrawer } from '@/components/transactions/TransactionDrawer';
import { Transaction } from '@financeos/shared';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // 1. Fetch Accounts & Net worth
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  // 2. Fetch Recent Transactions
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?limit=10&sort_by=date&sort_order=desc');
      return res.json();
    },
  });

  // 3. Fetch Bills
  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await fetch('/api/bills');
      return res.json();
    },
  });

  // 4. Fetch Aggregated Summary for Charts & Metrics (lightweight ~1KB payload)
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: async () => {
      const res = await fetch('/api/summary');
      return res.json();
    },
  });

  const accounts = accountsData?.accounts || [];
  const transactions = txData?.transactions || [];
  const bills = billsData?.bills || [];

  const cashFlowChartData = summaryData?.cashFlowChartData || [];
  const categoryPieData = summaryData?.categoryChartData || [];

  // Calculate current month's totals (no fake fallbacks)
  const latestMonth = cashFlowChartData[cashFlowChartData.length - 1];
  const currentMonthIncome = latestMonth?.income || 0;
  const currentMonthExpense = latestMonth?.expense || 0;

  const totalTxCount = summaryData?.totalIndexed ?? txData?.total ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personal finance overview · $CAD
          </p>
        </div>
        {totalTxCount > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl bg-card border border-border shadow-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-financial">{totalTxCount.toLocaleString()}</span>
            <span>transactions</span>
          </div>
        )}
      </div>

      {/* Row 1: Net Worth + Cash Flow Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <NetWorthCard
            netWorth={accountsData?.netWorth ?? 0}
            totalAssets={accountsData?.totalAssets ?? 0}
            totalDebts={accountsData?.totalDebts ?? 0}
            accountCount={accounts.length || undefined}
            isLoading={accountsLoading}
          />
        </div>
        <div className="lg:col-span-2 flex flex-col justify-between">
          <CashFlowCards
            income={currentMonthIncome}
            expense={currentMonthExpense}
            isLoading={summaryLoading}
          />
        </div>
      </div>

      {/* Row 2: Charts (Cash Flow Trajectory & Category Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CashFlowChart data={cashFlowChartData} isLoading={summaryLoading} />
        </div>
        <div className="lg:col-span-1">
          <CategoryPieChart data={categoryPieData} isLoading={summaryLoading} />
        </div>
      </div>

      {/* Row 3: Connected Accounts Grid */}
      <AccountsGrid accounts={accounts} isLoading={accountsLoading} />

      {/* Row 4: Recent Activity & Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactions
            transactions={transactions}
            isLoading={txLoading}
            onSelectTransaction={(tx) => setSelectedTx(tx)}
          />
        </div>
        <div className="lg:col-span-1">
          <UpcomingBillsWidget bills={bills} isLoading={billsLoading} />
        </div>
      </div>

      {/* Transaction Slide-over Drawer */}
      <TransactionDrawer
        transaction={selectedTx}
        accounts={accounts}
        onUpdate={(updated) => setSelectedTx(updated)}
        onClose={() => setSelectedTx(null)}
        onDelete={() => {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['accounts'] });
          setSelectedTx(null);
        }}
      />
    </div>
  );
}
