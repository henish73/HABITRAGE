'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Plus,
} from 'lucide-react';

import { AddBillDialog } from '@/components/bills/AddBillDialog';
import { toast } from 'sonner';
import { getCardTerms } from '@/lib/card-terms';
import { CardDebt, simulatePayoff, payoffOrder, estimateMinPayment, MAX_PAYOFF_MONTHS } from '@/lib/payoff';
import { computeBudgets, monthKey } from '@/lib/budgets';

const BUDGET_TARGETS_KEY = 'financeos.budgetTargets';

export default function PlanPage() {
  const queryClient = useQueryClient();
  const { isMasked, openAddBill } = useFinanceStore();

  const [payoffStrategy, setPayoffStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extraPayment, setExtraPayment] = useState(250);
  const currentMonth = monthKey();
  const [budgetTargets, setBudgetTargets] = useState<Record<string, number>>({});
  const [editingBudget, setEditingBudget] = useState<string | null>(null);

  // Budget targets are a per-device preference until budgets get their own API.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BUDGET_TARGETS_KEY);
      if (saved) setBudgetTargets(JSON.parse(saved));
    } catch {}
  }, []);

  const saveBudgetTarget = (key: string, value: number) => {
    const next = { ...budgetTargets, [key]: value };
    setBudgetTargets(next);
    try {
      localStorage.setItem(BUDGET_TARGETS_KEY, JSON.stringify(next));
    } catch {}
  };

  // Fetch Accounts to get real cards and debt
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  // Fetch Bills
  const { data: billsData } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await fetch('/api/bills');
      return res.json();
    },
  });

  // Fetch transactions to compute actual monthly spending budgets
  const { data: txData } = useQuery({
    queryKey: ['transactions', 'plan-budgets', currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?limit=5000&status=posted&date_from=${currentMonth}-01&date_to=${currentMonth}-31`);
      return res.json();
    },
  });

  // Build card debts from real database accounts
  const rawAccounts: any[] = accountsData?.accounts || [];
  const { cardDebts, chargeCards } = useMemo(() => {
    const owing = rawAccounts.filter((a) => a.type === 'credit_card' && Number(a.balance) > 0);
    const debts: CardDebt[] = [];
    const charge: { id: string; name: string; balance: number }[] = [];
    for (const c of owing) {
      const terms = getCardTerms(c);
      const balance = Math.round(Number(c.balance) * 100) / 100;
      const shortName = c.account_name.replace('American Express', 'Amex').replace('Credit Card', '').trim();
      if (terms.isChargeCard || terms.apr === null) {
        charge.push({ id: c.id, name: shortName, balance });
        continue;
      }
      debts.push({
        id: c.id,
        name: c.account_name,
        shortName,
        balance,
        apr: terms.apr,
        aprLabel: terms.aprLabel,
        minPayment: Number(c.minimum_payment) > 0 ? Number(c.minimum_payment) : estimateMinPayment(balance, terms.apr),
      });
    }
    return { cardDebts: debts, chargeCards: charge };
  }, [rawAccounts]);

  const totalDebt = useMemo(() => {
    return Math.round(cardDebts.reduce((sum, c) => sum + c.balance, 0) * 100) / 100;
  }, [cardDebts]);

  // Mathematical Amortization for Avalanche vs Snowball
  const payoffProjections = useMemo(() => {
    if (cardDebts.length === 0 || totalDebt <= 0) {
      return {
        avalanche: { months: 0, totalInterestPaid: 0, paidOff: true },
        snowball: { months: 0, totalInterestPaid: 0, paidOff: true },
        baseline: { months: 0, totalInterestPaid: 0, paidOff: true },
        interestSaved: 0,
      };
    }

    const baseline = simulatePayoff(cardDebts, 'avalanche', 0);
    const avalanche = simulatePayoff(cardDebts, 'avalanche', extraPayment);
    const snowball = simulatePayoff(cardDebts, 'snowball', extraPayment);

    const activeResult = payoffStrategy === 'avalanche' ? avalanche : snowball;
    const interestSaved = Math.max(0, Math.round(baseline.totalInterestPaid - activeResult.totalInterestPaid));

    return {
      avalanche,
      snowball,
      baseline,
      interestSaved,
    };
  }, [cardDebts, totalDebt, extraPayment, payoffStrategy]);

  // Priority Payoff Queue sorted authentically
  const sortedQueue = useMemo(() => payoffOrder(cardDebts, payoffStrategy), [cardDebts, payoffStrategy]);

  // Real Bills list — strictly no invented fake bills if empty
  const bills: any[] = billsData?.bills || [];

  const [confirmBillId, setConfirmBillId] = useState<string | null>(null);

  const handleMarkPaid = async (bill: any) => {
    setConfirmBillId(null);
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(bill.id)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ create_transaction: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not mark this bill paid.');
      toast.success(`${bill.name} marked paid. Next due ${data.bill?.next_due_date ?? 'next cycle'}.`);
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['forecast'] });
    } catch (err: any) {
      toast.error(err?.message || 'Could not mark this bill paid.');
    }
  };

  // Real monthly category budgets computed from actual transactions
  const budgets = useMemo(
    () => computeBudgets(txData?.transactions || [], currentMonth, budgetTargets),
    [txData, currentMonth, budgetTargets]
  );

  const activeResult = payoffStrategy === 'avalanche' ? payoffProjections.avalanche : payoffProjections.snowball;
  const activeMonths = activeResult.months;
  const monthsLabel = !activeResult.paidOff
    ? `Over ${MAX_PAYOFF_MONTHS / 12} years`
    : activeMonths >= 24
    ? `${Math.floor(activeMonths / 12)} yr ${activeMonths % 12} mo`
    : `${activeMonths} months`;

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
                Debt Payoff Engine · <span className={cn(isMasked && "blurnum")}>{formatCAD(totalDebt)}</span> Card Debt
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[var(--teal-soft)] text-[var(--teal)]">
                {cardDebts.some((c) => c.aprLabel.endsWith('est.')) ? 'APRs estimated' : 'Your APRs'}
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
            <span className="text-xs text-[var(--muted-color)] block">Debt-Free Projection</span>
            <b className="text-lg font-mono text-[var(--ink)] block mt-0.5">
              {cardDebts.length === 0 ? 'Debt free' : monthsLabel}
            </b>
            <small className="text-[11px] text-[var(--teal)]">
              {payoffStrategy === 'avalanche'
                ? `Interest paid: ${formatCAD(payoffProjections.avalanche.totalInterestPaid)}`
                : `Interest paid: ${formatCAD(payoffProjections.snowball.totalInterestPaid)}`}
            </small>
          </div>

          <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)]">
            <span className="text-xs text-[var(--muted-color)] block">Estimated Interest Saved</span>
            <b className="text-lg font-mono text-[var(--pos)] block mt-0.5">
              +{formatCAD(payoffProjections.interestSaved)} saved
            </b>
            <small className="text-[11px] text-[var(--muted-color)]">
              {payoffProjections.baseline.paidOff ? 'vs paying only the minimums' : 'Minimums alone would not clear this debt'}
            </small>
          </div>

          <div className="p-4 rounded-xl bg-[var(--raised)] border border-[var(--line-soft)]">
            <span className="text-xs text-[var(--muted-color)] block">Monthly Target Acceleration</span>
            <div className="flex items-center justify-between mt-1">
              <b className="text-lg font-mono text-[var(--ink)]">+{formatCAD(extraPayment)}/mo</b>
              <input
                type="range"
                min="50"
                max="1000"
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
            Priority Payoff Queue ({payoffStrategy === 'avalanche' ? 'Sorted by APR (Highest First)' : 'Sorted by Balance (Lowest First)'}):
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {sortedQueue.map((card, idx) => {
              const tag = idx === 0 ? 'Attack First' : idx === 1 ? 'Next in Line' : 'Scheduled';
              const tagColor = idx === 0 ? 'bg-[var(--warn-soft)] text-[var(--warn)]' : 'bg-[var(--raised)] text-[var(--muted-color)]';

              return (
                <div key={card.id} className="p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[var(--ink)]">
                      #{idx + 1} {card.shortName} <span className="font-mono text-[11px] text-[var(--muted-color)]">({card.aprLabel})</span>
                    </div>
                    <div className={cn("text-xs font-mono font-medium text-[var(--ink)] mt-0.5", isMasked && "blurnum")}>
                      {formatCAD(card.balance)}
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", tagColor)}>
                    {tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {chargeCards.length > 0 && (
        <p className="text-xs text-[var(--muted-color)] -mt-3 px-1">
          Not included: {chargeCards.map((c) => c.name).join(', ')}. Charge cards have no interest rate; pay the full
          statement balance (<span className={cn(isMasked && 'blurnum')}>{formatCAD(chargeCards.reduce((s, c) => s + c.balance, 0))}</span>) each month.
        </p>
      )}

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

          {bills.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--line)] rounded-xl">
              <CalendarCheck className="w-8 h-8 text-[var(--faint)]" />
              <b className="text-xs font-semibold text-[var(--ink)]">No upcoming bills scheduled</b>
              <p className="text-[11.5px] text-[var(--muted-color)] max-w-xs">
                Add recurring bills like rent, phone, utilities, and credit card minimums to keep cash flow safe.
              </p>
              <button
                onClick={openAddBill}
                className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--ink)] text-[var(--surface)] text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add first bill</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--line-soft)]">
              {bills.map((bill: any) => (
                <div key={bill.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <b className="text-xs sm:text-sm font-semibold text-[var(--ink)] block">
                      {bill.name}
                    </b>
                    <span className="text-[11.5px] text-[var(--muted-color)]">
                      Due {bill.next_due_date || `Day ${bill.due_day}`} · {bill.frequency}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn("font-mono font-semibold text-xs sm:text-sm text-[var(--ink)]", isMasked && "blurnum")}>
                      {formatCAD(bill.amount)}
                    </span>
                    {confirmBillId === bill.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => setConfirmBillId(null)}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[var(--muted-color)] hover:text-[var(--ink)] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleMarkPaid(bill)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--teal)] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          Record payment
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmBillId(bill.id)}
                        className="px-2.5 py-1 rounded-lg border border-[var(--line)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal)] text-[11px] font-semibold text-[var(--muted-color)] transition-colors cursor-pointer"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category Budgets */}
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
                Monthly Spending Budgets
              </h2>
              <p className="text-xs text-[var(--muted-color)]">
                {new Date(`${currentMonth}-15T12:00:00`).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })} · tap a target to change it
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {budgets.map((b) => (
              <div key={b.key} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs gap-2">
                  <span className="font-medium text-[var(--ink)]">{b.label}</span>
                  <span className="font-mono text-[var(--muted-color)] flex items-center gap-1">
                    <b className={cn('text-[var(--ink)]', isMasked && 'blurnum')}>{formatCAD(b.spent)}</b> /
                    {editingBudget === b.key ? (
                      <input
                        type="number"
                        min={1}
                        step={10}
                        autoFocus
                        defaultValue={b.target}
                        aria-label={`Monthly target for ${b.label}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) saveBudgetTarget(b.key, v);
                          setEditingBudget(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingBudget(null);
                        }}
                        className="w-20 px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)]"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingBudget(b.key)}
                        className="underline decoration-dotted underline-offset-2 hover:text-[var(--ink)] cursor-pointer"
                        title="Change monthly target"
                      >
                        {formatCAD(b.target)}
                      </button>
                    )}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      b.pct >= 100 ? 'bg-[var(--neg)]' : b.pct >= 80 ? 'bg-[var(--warn)]' : 'bg-[var(--teal)]'
                    )}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AddBillDialog />
    </div>
  );
}
