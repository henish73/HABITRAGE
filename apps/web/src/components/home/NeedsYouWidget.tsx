'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Tag, CalendarClock, ChevronRight } from 'lucide-react';

export function NeedsYouWidget() {
  const items = [
    {
      id: 'high-utilization',
      dotClass: 'bg-[var(--warn-soft)] text-[var(--warn)]',
      icon: AlertTriangle,
      title: '2 cards above 70% used',
      subtitle: 'Amex Essential 75% · TD Low Rate 71%',
      actionLabel: 'Plan',
      href: '/plan',
    },
    {
      id: 'review-queue',
      dotClass: 'bg-[var(--teal-soft)] text-[var(--teal)]',
      icon: Tag,
      title: '14 transactions to review',
      subtitle: 'Uber refunds, transfers marked as fees',
      actionLabel: 'Review',
      href: '/activity?tab=review',
    },
    {
      id: 'upcoming-bill',
      dotClass: 'bg-[var(--neg-soft)] text-[var(--neg)]',
      icon: CalendarClock,
      title: 'Disney+ · $14.99',
      subtitle: 'Due Nov 12 on CIBC Dividend Visa',
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
          3 items
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
