'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Tag, CalendarClock, ChevronRight, CheckCircle2 } from 'lucide-react';
import { formatCAD } from '@/lib/utils';

type Item = {
  id: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  actionLabel: string;
  href: string;
};

function formatDue(date?: string) {
  if (!date) return 'soon';
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return isNaN(d.getTime()) ? date : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function NeedsYouWidget() {
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await fetch('/api/accounts')).json(),
  });

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => (await fetch('/api/bills')).json(),
  });

  // Only the count is needed; the server applies the same review rule as Activity.
  const { data: reviewData, isLoading: reviewLoading } = useQuery({
    queryKey: ['transactions', 'review-count'],
    queryFn: async () => (await fetch('/api/transactions?needs_review=true&limit=1')).json(),
  });

  const isLoading = accountsLoading || billsLoading || reviewLoading;
  const accounts: any[] = accountsData?.accounts || [];
  const bills: any[] = billsData?.bills || [];
  const reviewCount: number = reviewData?.total ?? 0;

  const highUtilCards = accounts.filter(
    (a) => a.type === 'credit_card' && Number(a.credit_limit) > 0 && Number(a.balance) / Number(a.credit_limit) >= 0.7
  );

  const nextBill = bills
    .filter((b) => !b.is_paid && b.next_due_date)
    .sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)))[0];

  const items: Item[] = [];
  if (highUtilCards.length > 0) {
    items.push({
      id: 'high-utilization',
      dotClass: 'bg-[var(--warn-soft)] text-[var(--warn)]',
      icon: AlertTriangle,
      title: `${highUtilCards.length} card${highUtilCards.length === 1 ? '' : 's'} above 70% used`,
      subtitle: highUtilCards
        .map((c) => `${c.account_name.replace('American Express', 'Amex').split(' ').slice(0, 2).join(' ')} ${Math.round((c.balance / c.credit_limit) * 100)}%`)
        .join(' · '),
      actionLabel: 'Plan',
      href: '/plan',
    });
  }
  if (reviewCount > 0) {
    items.push({
      id: 'review-queue',
      dotClass: 'bg-[var(--teal-soft)] text-[var(--teal)]',
      icon: Tag,
      title: `${reviewCount} transaction${reviewCount === 1 ? '' : 's'} to review`,
      subtitle: 'Uncategorised, pending or unexpected inflows',
      actionLabel: 'Review',
      href: '/activity?tab=review',
    });
  }
  if (nextBill) {
    items.push({
      id: 'upcoming-bill',
      dotClass: 'bg-[var(--neg-soft)] text-[var(--neg)]',
      icon: CalendarClock,
      title: `${nextBill.name} · ${formatCAD(nextBill.amount)}`,
      subtitle: `Due ${formatDue(nextBill.next_due_date)}`,
      actionLabel: 'Pay',
      href: '/plan',
    });
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 sm:p-6 flex flex-col shadow-vault min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--muted-color)]">Needs you</span>
        {items.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20">
            {items.length} item{items.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 rounded-lg bg-[var(--raised)] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="w-7 h-7 text-[var(--teal)]" />
          <b className="text-xs font-semibold text-[var(--ink)]">Nothing needs you right now</b>
          <p className="text-[11.5px] text-[var(--muted-color)]">No high card usage, review items or upcoming bills.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[30px_1fr_auto] gap-2.5 items-center py-2.5 ${idx !== 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
              >
                <span className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${item.dotClass}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 pr-1">
                  <b className="block text-xs font-semibold text-[var(--ink)] truncate">{item.title}</b>
                  <small className="block text-[11.5px] text-[var(--muted-color)] truncate">{item.subtitle}</small>
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
      )}
    </div>
  );
}
