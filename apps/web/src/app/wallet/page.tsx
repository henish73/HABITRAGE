'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import {
  CreditCard,
  Building2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export default function WalletPage() {
  const { isMasked, openPlaidModal } = useFinanceStore();

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const rawAccounts: any[] = accountsData?.accounts || [];
  const rawBankAccounts = rawAccounts.filter((a) => a.type === 'bank');
  const rawCards = rawAccounts.filter((a) => a.type === 'credit_card');

  const bankAccounts = rawBankAccounts.length > 0 ? rawBankAccounts.map((a) => ({
    name: a.account_name,
    bank: a.bank_name,
    type: a.account_type || 'Chequing',
    balance: a.balance || 0,
    number: a.account_number || '****',
  })) : [
    { name: 'CIBC Smart Account', bank: 'CIBC', type: 'Chequing', balance: 2138.00, number: '****7339' },
    { name: 'TD Every Day Chequing', bank: 'TD', type: 'Chequing', balance: 71.80, number: '****7089' },
    { name: 'RBC Day to Day Banking Chequing', bank: 'RBC', type: 'Chequing', balance: 0.09, number: '****7173' },
    { name: 'CIBC eAdvantage Savings', bank: 'CIBC', type: 'Savings', balance: 0.00, number: '****5832' },
    { name: 'TD High Interest Savings', bank: 'TD', type: 'Savings', balance: 0.00, number: '****9086' },
    { name: 'RBC High Interest eSavings', bank: 'RBC', type: 'Savings', balance: 0.00, number: '****7181' },
    { name: 'RBC NOMI Find & Save', bank: 'RBC', type: 'Savings', balance: 0.00, number: '****9475' },
  ];

  const cards = rawCards.length > 0 ? rawCards.map((c) => {
    const isAmexEssential = c.account_name.toLowerCase().includes('essential');
    const isAmexGreen = c.account_name.toLowerCase().includes('green');
    const isTD = c.bank_name.toLowerCase().includes('td');
    const isRog = c.bank_name.toLowerCase().includes('rogers');
    const isCIBC = c.bank_name.toLowerCase().includes('cibc');
    const isSimplyCash = c.account_name.toLowerCase().includes('simplycash');

    const gradientClass = isAmexEssential ? 'amexE' : isTD ? 'td' : isAmexGreen ? 'amexG' : isRog ? 'rog' : isCIBC ? 'cibc' : 'amexB';
    const limit = c.credit_limit || 1000;
    const balance = c.balance || 0;
    const utilization = limit > 0 ? Math.round((Math.max(0, balance) / limit) * 100) : 0;
    const apr = isAmexGreen ? 'N/A (Charge)' : isAmexEssential ? '12.99%' : isTD ? '11.99%' : isRog ? '19.99%' : '20.99%';
    const dueDate = c.due_date ? `Due ${c.due_date.slice(5)}` : balance < 0 ? 'Credit Balance' : 'Nov 12';

    return {
      id: c.id,
      name: c.account_name,
      shortName: c.account_name.replace('American Express', 'Amex'),
      gradientClass,
      balance,
      limit,
      utilization,
      apr,
      dueDate,
    };
  }) : [
    {
      id: 'amex-essential',
      name: 'American Express Essential Credit Card',
      shortName: 'Amex Essential',
      gradientClass: 'amexE',
      balance: 10145.23,
      limit: 13500,
      utilization: 75,
      apr: '12.99%',
      dueDate: 'Nov 5',
    },
    {
      id: 'td-low-rate',
      name: 'TD Low Rate Visa',
      shortName: 'TD Low Rate Visa',
      gradientClass: 'td',
      balance: 709.86,
      limit: 1000,
      utilization: 71,
      apr: '11.99%',
      dueDate: 'Nov 18',
    },
    {
      id: 'amex-green',
      name: 'American Express Green Card',
      shortName: 'Amex Green',
      gradientClass: 'amexG',
      balance: 4595.92,
      limit: 8500,
      utilization: 54,
      apr: 'N/A (Charge)',
      dueDate: 'Oct 28',
    },
    {
      id: 'rogers-mc',
      name: 'Rogers Mastercard',
      shortName: 'Rogers Mastercard',
      gradientClass: 'rog',
      balance: 75.71,
      limit: 500,
      utilization: 15,
      apr: '19.99%',
      dueDate: 'Nov 22',
    },
    {
      id: 'cibc-dividend',
      name: 'CIBC Dividend Visa',
      shortName: 'CIBC Dividend Visa',
      gradientClass: 'cibc',
      balance: 31.44,
      limit: 3500,
      utilization: 1,
      apr: '20.99%',
      dueDate: 'Oct 21',
    },
    {
      id: 'amex-simplycash',
      name: 'American Express SimplyCash Card',
      shortName: 'Amex SimplyCash',
      gradientClass: 'amexB',
      balance: -369.88,
      limit: 1100,
      utilization: 0,
      apr: '20.99%',
      dueDate: 'Credit Balance',
    },
  ];


  const totalBankCash = bankAccounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalCardDebt = cards.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCreditLimit = cards.reduce((sum, c) => sum + c.limit, 0);
  const aggregateUtilization = Math.round((totalCardDebt / totalCreditLimit) * 100);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
            Wallet
          </h1>
          <p className="text-xs text-[var(--muted-color)] mt-0.5">
            Credit cards, revolving utilization, bank accounts, and credit score
          </p>
        </div>

        <button
          onClick={openPlaidModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Building2 className="w-3.5 h-3.5 text-[var(--teal)]" />
          <span>Connect Bank</span>
        </button>
      </div>

      {/* Credit Score & Utilization Headline Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Credit Score (TransUnion 724) */}
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
              Credit Score · TransUnion
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--pos-soft)] text-[var(--pos)]">
              Good · 724
            </span>
          </div>

          <div className="flex items-center gap-5 my-3">
            <div className="relative w-16 h-16 shrink-0">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="var(--line)" strokeWidth="5" />
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  fill="none"
                  stroke="var(--pos)"
                  strokeWidth="5"
                  strokeDasharray="145"
                  strokeDashoffset={145 - (145 * 724) / 900}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-[var(--ink)]">
                724
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-medium text-[var(--ink)]">Prime Credit Tier</div>
              <p className="text-[11.5px] text-[var(--muted-color)] leading-snug">
                Your score is eligible for best Canadian bank rates. Keep utilization under 30% to reach 750+.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--line-soft)] text-[11px]">
            <div>
              <span className="text-[var(--muted-color)] block">Payment History</span>
              <b className="text-[var(--pos)]">99% Exceptional</b>
            </div>
            <div>
              <span className="text-[var(--muted-color)] block">Overall Utilization</span>
              <b className="text-[var(--warn)]">{aggregateUtilization}% High</b>
            </div>
            <div>
              <span className="text-[var(--muted-color)] block">Hard Inquiries</span>
              <b className="text-[var(--ink)]">2 Low</b>
            </div>
          </div>
        </div>

        {/* Aggregate Revolving Debt Summary */}
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
              Total Revolving Utilization
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--warn-soft)] text-[var(--warn)]">
              {aggregateUtilization}% Used
            </span>
          </div>

          <div className="my-3">
            <div className={cn("text-3xl font-mono font-semibold text-[var(--neg)]", isMasked && "blurnum")}>
              {formatCAD(totalCardDebt)}
            </div>
            <div className="text-xs text-[var(--muted-color)] mt-0.5">
              Across 6 cards · Total available limit: {formatCAD(totalCreditLimit)}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full h-2 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--warn)] transition-all duration-500"
                style={{ width: `${aggregateUtilization}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-[var(--muted-color)] mt-1.5">
              <span>0%</span>
              <span className="text-[var(--teal)] font-semibold">Target: &lt;30%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Cards Grid (The Wallet) */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
              Credit Cards &amp; Limits
            </h2>
            <p className="text-xs text-[var(--muted-color)]">
              Cards with utilization &gt; 30% flag a score warning
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--muted-color)]">6 Active Accounts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const isOver30 = c.utilization >= 30;
            const isOver70 = c.utilization >= 70;
            const ringColor = isOver70 ? 'var(--neg)' : isOver30 ? 'var(--warn)' : 'var(--teal)';

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-[var(--teal)] transition-all"
              >
                {/* Visual Card Replica */}
                <div className={cn("ccard h-28", c.gradientClass)}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/90 truncate">{c.shortName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white">
                      {c.apr}
                    </span>
                  </div>
                  <div>
                    <div className={cn("text-lg font-mono font-semibold text-white", isMasked && "blurnum")}>
                      {c.balance < 0 ? `Credit −${formatCAD(Math.abs(c.balance))}` : formatCAD(c.balance)}
                    </div>
                    <div className="text-[10.5px] text-white/80 font-mono">
                      Limit {formatCAD(c.limit)} · Due {c.dueDate}
                    </div>
                  </div>
                </div>

                {/* Utilization Ring / Stats */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="var(--line)" strokeWidth="6" />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke={ringColor}
                          strokeWidth="6"
                          strokeDasharray="138"
                          strokeDashoffset={138 - (138 * Math.min(c.utilization, 100)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-[10px] text-[var(--ink)]">
                        {c.utilization}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--ink)]">
                        {c.utilization}% Utilization
                      </div>
                      <div className="text-[11px] text-[var(--muted-color)]">
                        {isOver70
                          ? 'Hurts credit score (high)'
                          : isOver30
                          ? 'Above 30% benchmark'
                          : 'Optimal ratio (<30%)'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank Accounts Section */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
              Bank Accounts · Total Cash: <span className={cn("text-[var(--teal)] font-mono", isMasked && "blurnum")}>{formatCAD(totalBankCash)}</span>
            </h2>
            <p className="text-xs text-[var(--muted-color)]">
              Chequing and high-interest savings accounts
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--muted-color)]">7 Bank Accounts</span>
        </div>

        <div className="divide-y divide-[var(--line-soft)]">
          {bankAccounts.map((b) => (
            <div key={b.name} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--raised)] border border-[var(--line)] flex items-center justify-center font-bold text-xs text-[var(--teal)] shrink-0">
                  {b.bank}
                </div>
                <div>
                  <b className="text-xs sm:text-sm font-semibold text-[var(--ink)] block">
                    {b.name}
                  </b>
                  <span className="text-[11px] text-[var(--muted-color)]">
                    {b.type} · {b.number}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className={cn(
                  "font-mono font-semibold text-xs sm:text-sm text-[var(--ink)]",
                  isMasked && "blurnum"
                )}>
                  {formatCAD(b.balance)}
                </span>
                <span className="block text-[10px] text-[var(--pos)]">Available</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
