'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import {
  CalendarCheck,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldAlert,
  Flame,
  Snowflake,
} from 'lucide-react';

export default function PlanPage() {
  const queryClient = useQueryClient();
  const { isMasked, openAddBill } = useFinanceStore();

  const [payoffStrategy, setPayoffStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState(250);

  // Fetch Bills
  const { data: billsData } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await fetch('/api/bills');
      return res.json();
    },
  });

  const bills = billsData?.bills || [
    { id: '1', name: 'Rent', amount: 1900.00, next_due_date: '2026-11-01', frequency: 'monthly', is_paid: false, category: 'Rent & Housing' },
    { id: '2', name: 'Rogers Wireless', amount: 85.00, next_due_date: '2026-11-02', frequency: 'monthly', is_paid: false, category: 'Utilities & Phone' },
    { id: '3', name: 'Disney+', amount: 14.99, next_due_date: '2026-11-12', frequency: 'monthly', is_paid: false, category: 'Entertainment' },
    { id: '4', name: 'Car Insurance', amount: 165.00, next_due_date: '2026-11-15', frequency: 'monthly', is_paid: false, category: 'Insurance' },
  ];

  const handleMarkPaid = async (billId: string) => {
    try {
      await fetch(`/api/bills/${billId}/pay`, { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    } catch {
      // Offline fallback
    }
  };

  const budgets = [
    { category: 'Rent & Housing', spent: 1900, budget: 1900, pct: 100 },
    { category: 'Food & Groceries', spent: 420, budget: 600, pct: 70 },
    { category: 'Transportation', spent: 185, budget: 300, pct: 62 },
    { category: 'Utilities & Phone', spent: 145, budget: 180, pct: 80 },
    { category: 'Entertainment', spent: 65, budget: 120, pct: 54 },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Plan
          </h1>
          <p className="text-xs text-[var(--muted-color)] mt-0.5">
            Bills calendar, monthly spending targets, and debt payoff strategies
          </p>
        </div>

        <button
          onClick={openAddBill}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <CalendarCheck className="w-3.5 h-3.5 text-[var(--teal)]" />
          <span>Add Bill</span>
        </button>
      </div>

      {/* Debt Payoff Planner (Avalanche vs Snowball) */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--line-soft)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
                Debt Payoff Engine · $15,558.16 Card Debt
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--teal-soft)] text-[var(--teal)]">
                AI Optimized
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] mt-0.5">
              Payoff Strategy Comparison
            </h2>
          </div>

          {/* Strategy Toggle */}
          <div className="flex items-center gap-1 bg-[var(--raised)] p-1 rounded-xl border border-[var(--line-soft)] self-start sm:self-auto">
            <button
              onClick={() => setPayoffStrategy('avalanche')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                payoffStrategy === 'avalanche'
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                  : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
              )}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Avalanche (Highest APR)</span>
            </button>
            <button
              onClick={() => setPayoffStrategy('snowball')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                payoffStrategy === 'snowball'
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs'
                  : 'text-[var(--muted-color)] hover:text-[var(--ink)]'
              )}
            >
              <Snowflake className="w-3.5 h-3.5 text-sky-500" />
              <span>Snowball (Lowest Balance)</span>
            </button>
          </div>
        </div>

        {/* Strategy Breakdown Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
          <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)]">
            <span className="text-xs text-[var(--muted-color)] block">Debt-Free Date</span>
            <b className="text-lg font-mono text-[var(--ink)] block mt-0.5">
              {payoffStrategy === 'avalanche' ? 'August 2027 (10 mos)' : 'October 2027 (12 mos)'}
            </b>
            <small className="text-[11px] text-[var(--teal)]">
              {payoffStrategy === 'avalanche' ? '2 months faster' : 'Maximum momentum'}
            </small>
          </div>

          <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)]">
            <span className="text-xs text-[var(--muted-color)] block">Total Interest Saved</span>
            <b className="text-lg font-mono text-[var(--pos)] block mt-0.5">
              {payoffStrategy === 'avalanche' ? '$1,420.50 saved' : '$980.20 saved'}
            </b>
            <small className="text-[11px] text-[var(--muted-color)]">
              vs minimum monthly payments
            </small>
          </div>

          <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)]">
            <span className="text-xs text-[var(--muted-color)] block">Monthly Target Acceleration</span>
            <div className="flex items-center justify-between mt-1">
              <b className="text-lg font-mono text-[var(--ink)]">+{formatCAD(extraPayment)}/mo</b>
              <input
                type="range"
                min="100"
                max="800"
                step="50"
                value={extraPayment}
                onChange={(e) => setExtraPayment(Number(e.target.value))}
                className="w-24 accent-[var(--teal)]"
              />
            </div>
            <small className="text-[11px] text-[var(--muted-color)]">Adjust extra cash towards principal</small>
          </div>
        </div>

        {/* Priority Payoff Order */}
        <div className="mt-2">
          <span className="text-xs font-semibold text-[var(--muted-color)] uppercase tracking-wider block mb-2">
            Priority Payoff Queue ({payoffStrategy === 'avalanche' ? 'Sorted by APR' : 'Sorted by Balance'}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              { rank: '1', name: payoffStrategy === 'avalanche' ? 'Amex Green (20.99%)' : 'Rogers MC ($75.71)', bal: payoffStrategy === 'avalanche' ? '$4,595.92' : '$75.71', tag: 'Attack First' },
              { rank: '2', name: payoffStrategy === 'avalanche' ? 'CIBC Dividend (20.99%)' : 'CIBC Dividend ($31.44)', bal: payoffStrategy === 'avalanche' ? '$31.44' : '$31.44', tag: 'Next' },
              { rank: '3', name: payoffStrategy === 'avalanche' ? 'Rogers MC (19.99%)' : 'TD Low Rate ($709.86)', bal: payoffStrategy === 'avalanche' ? '$75.71' : '$709.86', tag: 'Next' },
              { rank: '4', name: payoffStrategy === 'avalanche' ? 'Amex Essential (12.99%)' : 'Amex Green ($4,595.92)', bal: payoffStrategy === 'avalanche' ? '$10,145.23' : '$4,595.92', tag: 'Later' },
            ].map((card) => (
              <div key={card.rank} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--ink)]">#{card.rank} {card.name}</div>
                  <div className={cn("text-xs font-mono text-[var(--muted-color)]", isMasked && "blurnum")}>{card.bal}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--teal-soft)] text-[var(--teal)]">
                  {card.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Upcoming Bills + Category Budgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Bills */}
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
                Upcoming Bills &amp; Subscriptions
              </h2>
              <p className="text-xs text-[var(--muted-color)]">
                Next scheduled recurring charges
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--muted-color)]">{bills.length} Bills</span>
          </div>

          <div className="divide-y divide-[var(--line-soft)]">
            {bills.map((bill: any) => (
              <div key={bill.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <b className="text-xs sm:text-sm font-semibold text-[var(--ink)] block">
                    {bill.name}
                  </b>
                  <span className="text-[11.5px] text-[var(--muted-color)]">
                    Due {bill.next_due_date} · {bill.frequency}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn("font-mono font-semibold text-xs sm:text-sm text-[var(--ink)]", isMasked && "blurnum")}>
                    {formatCAD(bill.amount)}
                  </span>
                  <button
                    onClick={() => handleMarkPaid(bill.id)}
                    className="px-2.5 py-1 rounded-lg border border-[var(--line)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal)] text-[11px] font-semibold text-[var(--muted-color)] transition-colors cursor-pointer"
                  >
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Budgets */}
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
                Monthly Spending Budgets
              </h2>
              <p className="text-xs text-[var(--muted-color)]">
                Tracking against monthly limits
              </p>
            </div>
            <span className="text-xs font-mono text-[var(--teal)] font-semibold">Active</span>
          </div>

          <div className="space-y-4">
            {budgets.map((b) => (
              <div key={b.category} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--ink)]">{b.category}</span>
                  <span className="font-mono text-[var(--muted-color)]">
                    <b className={cn("text-[var(--ink)]", isMasked && "blurnum")}>{formatCAD(b.spent)}</b> / {formatCAD(b.budget)}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      b.pct >= 100 ? "bg-[var(--warn)]" : b.pct >= 80 ? "bg-amber-400" : "bg-[var(--teal)]"
                    )}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
