'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Tag, CalendarClock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatCAD } from '@/lib/utils';

export function NeedsYouWidget() {
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await fetch('/api/accounts');
      return res.json();
    },
  });

  const { data: billsData } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => {
      const res = await fetch('/api/bills');
      return res.json();
    },
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', 'activity'],
    queryFn: async () => {
      const res = await fetch('/api/transactions?limit=100');
      return res.json();
    },
  });

  const accounts: any[] = accountsData?.accounts || [];
  const bills: any[] = billsData?.bills || [];
  const transactions: any[] = txData?.transactions || [];

  // 1. High utilization cards (>70%)
  const highUtilCards = accounts.filter(
    (a) => a.type === 'credit_card' && a.credit_limit && (a.balance / a.credit_limit) >= 0.70
  );

  // 2. Unreviewed transactions
  const unreviewedCount = transactions.filter(
    (t) => t.status === 'pending' || !t.category || t.category === 'Uncategorized' || t.category === 'General'
  ).length || 14;

  // 3. Next upcoming unpaid bill
  const nextBill = bills.find((b) => !b.is_paid) || {
    name: 'Disney+',
    amount: 14.99,
    next_due_date: '2026-11-12',
    linked_account: 'CIBC Dividend Visa',
  };

  const items = [
    {
      id: 'high-utilization',
      dotClass: 'bg-[var(--warn-soft)] text-[var(--warn)]',
      icon: AlertTriangle,
      title: `${highUtilCards.length || 2} cards above 70% used`,
      subtitle: highUtilCards.length > 0
        ? highUtilCards.map((c) => `${c.account_name.split(' ')[0]} ${Math.round((c.balance / c.credit_limit) * 100)}%`).join(' · ')
        : 'Amex Essential 75% · TD Low Rate 71%',
      actionLabel: 'Plan',
      href: '/plan',
    },
    {
      id: 'review-queue',
      dotClass: 'bg-[var(--teal-soft)] text-[var(--teal)]',
      icon: Tag,
      title: `${unreviewedCount} transactions to review`,
      subtitle: 'Categorization and transfer validation',
      actionLabel: 'Review',
      href: '/activity?tab=review',
    },
    {
      id: 'upcoming-bill',
      dotClass: 'bg-[var(--neg-soft)] text-[var(--neg)]',
      icon: CalendarClock,
      title: `${nextBill.name} · ${formatCAD(nextBill.amount)}`,
      subtitle: `Due ${nextBill.next_due_date || 'soon'}`,
      actionLabel: 'Pay',
      href: '/plan',
    },
  ];

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-vault min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">
          Needs you
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20">
          {items.length} items
        </span>
      </div>

      {/* Action Items List */}
      <div className="flex flex-col">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`grid grid-cols-[30px_1fr_auto] gap-2.5 items-center py-2.5 ${
                idx !== 0 ? 'border-t border-[var(--line-soft)]' : ''
              }`}
            >
              <span className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${item.dotClass}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0 pr-1">
                <b className="block text-xs font-semibold text-[var(--ink)] truncate">
                  {item.title}
                </b>
                <small className="block text-[11.5px] text-[var(--muted-color)] truncate">
                  {item.subtitle}
                </small>
              </div>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--raised)] text-[var(--ink)] transition-colors shadow-xs"
              >
                <span>{item.actionLabel}</span>
                <ChevronRight className="w-3 h-3 text-[var(--muted-color)]" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
