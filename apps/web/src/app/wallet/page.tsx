'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFinanceStore } from '@/lib/store';
import { formatCAD, cn } from '@/lib/utils';
import { getCardTerms, formatDueDate } from '@/lib/card-terms';
import { AddAccountDialog } from '@/components/accounts/AddAccountDialog';
import { UploadCreditReportDialog } from '@/components/accounts/UploadCreditReportDialog';
import {
  CreditCard,
  Building2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Plus,
  Upload,
  Pencil,
} from 'lucide-react';

export default function WalletPage() {
  const { isMasked, openPlaidModal } = useFinanceStore();

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isUploadReportOpen, setIsUploadReportOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  // 1. Fetch Accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  // 2. Fetch Credit Reports from API
  const { data: reportsData } = useQuery({
    queryKey: ['credit-reports'],
    queryFn: async () => {
      const res = await fetch('/api/credit-reports');
      return res.json();
    },
  });

  const reports: any[] = reportsData?.reports || [];
  // Newest report first, whatever order the API returns.
  const activeReport =
    [...reports].sort((a, b) => String(b.uploaded_at || '').localeCompare(String(a.uploaded_at || '')))[0] ?? null;
  const scoreBand = (score: number) =>
    score >= 760 ? 'Excellent' : score >= 725 ? 'Very good' : score >= 660 ? 'Good' : score >= 560 ? 'Fair' : 'Poor';

  const rawAccounts: any[] = accountsData?.accounts || [];

  const bankAccounts = rawAccounts
    .filter((a) => a.type === 'bank')
    .map((a) => ({
      raw: a,
      name: a.account_name,
      bank: a.bank_name,
      type: a.account_type || 'Chequing',
      balance: Number(a.balance) || 0,
      number: a.account_number || '****',
    }));

  const gradientFor = (c: any) => {
    const name = (c.account_name || '').toLowerCase();
    const bank = (c.bank_name || '').toLowerCase();
    if (name.includes('essential')) return 'amexE';
    if (name.includes('green')) return 'amexG';
    if (bank.includes('td')) return 'td';
    if (bank.includes('rogers')) return 'rog';
    if (bank.includes('cibc')) return 'cibc';
    return 'amexB';
  };

  const cards = rawAccounts
    .filter((a) => a.type === 'credit_card')
    .map((c) => {
      const terms = getCardTerms(c);
      const limit = Number(c.credit_limit) > 0 ? Number(c.credit_limit) : 0;
      const balance = Number(c.balance) || 0;
      return {
        raw: c,
        id: c.id,
        name: c.account_name,
        shortName: c.account_name.replace('American Express', 'Amex'),
        gradientClass: gradientFor(c),
        balance,
        limit,
        utilization: limit > 0 ? Math.round((Math.max(0, balance) / limit) * 100) : 0,
        apr: terms.aprLabel,
        dueDate: balance < 0 ? 'Credit balance' : formatDueDate(c.due_date),
      };
    });

  const totalBankCash = bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalCardDebt = cards.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalCreditLimit = cards.reduce((sum, c) => sum + c.limit, 0);
  const aggregateUtilization = totalCreditLimit > 0 ? Math.round((totalCardDebt / totalCreditLimit) * 100) : 0;

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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAddAccountOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Add Account</span>
          </button>

          <button
            onClick={() => setIsUploadReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-xs font-semibold text-[var(--ink)] transition-colors shadow-xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[var(--teal)]" />
            <span>Upload Credit Report</span>
          </button>

          <button
            onClick={openPlaidModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--surface)] hover:opacity-90 text-xs font-semibold transition-opacity shadow-xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Connect Bank</span>
          </button>
        </div>
      </div>

      {/* Credit Score & Utilization Headline Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Credit Score: only from an uploaded report */}
        {activeReport ? (
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
                Credit score · {activeReport.bureau}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--pos-soft)] text-[var(--pos)]">
                {scoreBand(activeReport.score)} · {activeReport.score}
              </span>
            </div>

            <div className="flex items-center gap-5 my-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
                  <circle cx="28" cy="28" r="23" fill="none" stroke="var(--line)" strokeWidth="5" />
                  <circle
                    cx="28"
                    cy="28"
                    r="23"
                    fill="none"
                    stroke="var(--pos)"
                    strokeWidth="5"
                    strokeDasharray="145"
                    strokeDashoffset={145 - (145 * Math.max(0, activeReport.score - 300)) / 600}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-sm text-[var(--ink)]">
                  {activeReport.score}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-[var(--ink)]">From {activeReport.file_name || 'your uploaded report'}</div>
                <p className="text-[11.5px] text-[var(--muted-color)] leading-snug">
                  Uploaded {activeReport.uploaded_at ? new Date(activeReport.uploaded_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}. Upload a newer report to update it.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--line-soft)] text-[11px]">
              <div>
                <span className="text-[var(--muted-color)] block">Reported debt</span>
                <b className={cn('text-[var(--ink)]', isMasked && 'blurnum')}>{formatCAD(activeReport.total_debt || 0)}</b>
              </div>
              <div>
                <span className="text-[var(--muted-color)] block">Inquiries</span>
                <b className="text-[var(--ink)]">{Array.isArray(activeReport.inquiries) ? activeReport.inquiries.length : 0}</b>
              </div>
              <div>
                <span className="text-[var(--muted-color)] block">Derogatory marks</span>
                <b className="text-[var(--ink)]">{Array.isArray(activeReport.derogatories) ? activeReport.derogatories.length : 0}</b>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col items-start justify-center gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">Credit score</span>
            <b className="text-sm text-[var(--ink)]">No credit report yet</b>
            <p className="text-xs text-[var(--muted-color)] max-w-sm">
              Upload your latest Equifax or TransUnion report to see your score, inquiries and reported debt here.
            </p>
            <button
              onClick={() => setIsUploadReportOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ink)] text-[var(--surface)] text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload credit report</span>
            </button>
          </div>
        )}

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
              Across {cards.length} cards · Total available limit: {formatCAD(totalCreditLimit)}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="w-full h-2 rounded-full bg-[var(--raised)] border border-[var(--line-soft)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--warn)] transition-all duration-500"
                style={{ width: `${Math.min(aggregateUtilization, 100)}%` }}
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

      {/* Credit Cards Grid */}
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 shadow-vault">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
              Credit Cards &amp; Limits
            </h2>
            <p className="text-xs text-[var(--muted-color)]">
              Revolving credit lines and statement due dates
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--muted-color)]">{cards.length} Active Cards</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const isOver30 = c.utilization >= 30;
            const isOver70 = c.utilization >= 70;
            const ringColor = isOver70 ? 'var(--neg)' : isOver30 ? 'var(--warn)' : 'var(--teal)';

            return (
              <div
                key={c.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-[var(--teal)] transition-all relative group"
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
                      {c.limit > 0 ? `Limit ${formatCAD(c.limit)}` : 'No limit set'} · {c.dueDate}
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
                          ? 'Hurts score (>70%)'
                          : isOver30
                          ? 'Above 30% target'
                          : 'Optimal ratio (<30%)'}
                      </div>
                    </div>
                  </div>

                  {c.raw && (
                    <button
                      onClick={() => {
                        setEditingAccount(c.raw);
                        setIsAddAccountOpen(true);
                      }}
                      title="Edit Account Details"
                      className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
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
          <span className="text-xs font-mono text-[var(--muted-color)]">{bankAccounts.length} Bank Accounts</span>
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

              <div className="flex items-center gap-3">
                <span className={cn("font-mono font-semibold text-xs sm:text-sm text-[var(--ink)]", isMasked && "blurnum")}>
                  {formatCAD(b.balance)}
                </span>
                {b.raw && (
                  <button
                    onClick={() => {
                      setEditingAccount(b.raw);
                      setIsAddAccountOpen(true);
                    }}
                    title="Edit Account Details"
                    className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--raised)] text-[var(--muted-color)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Account Dialog */}
      <AddAccountDialog
        isOpen={isAddAccountOpen}
        onClose={() => {
          setIsAddAccountOpen(false);
          setEditingAccount(null);
        }}
        editingAccount={editingAccount}
      />

      {/* Upload Credit Report Dialog */}
      <UploadCreditReportDialog
        isOpen={isUploadReportOpen}
        onClose={() => setIsUploadReportOpen(false)}
      />
    </div>
  );
}
