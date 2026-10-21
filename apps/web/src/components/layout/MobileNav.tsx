'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ArrowLeftRight,
  Plus,
  CalendarDays,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinanceStore } from '@/lib/store';

export function MobileNav() {
  const pathname = usePathname();
  const { openAddTransaction } = useFinanceStore();

  const isHome = pathname === '/';
  const isActivity = pathname === '/activity' || pathname.startsWith('/transactions');
  const isPlan = pathname === '/plan' || pathname.startsWith('/bills');
  const isWallet = pathname === '/wallet' || pathname.startsWith('/accounts');

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--line)] select-none shadow-lg"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="grid grid-cols-5 items-center px-2 pt-2.5 pb-1 relative">
        {/* Home */}
        <Link
          href="/"
          className={cn(
            'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
            isHome ? 'text-[var(--ink)] font-semibold' : 'text-[var(--faint)] hover:text-[var(--muted-color)]'
          )}
        >
          <Home className={cn('w-5 h-5', isHome ? 'text-[var(--teal)]' : 'text-[var(--faint)]')} />
          <span>Home</span>
        </Link>

        {/* Activity */}
        <Link
          href="/activity"
          className={cn(
            'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
            isActivity ? 'text-[var(--ink)] font-semibold' : 'text-[var(--faint)] hover:text-[var(--muted-color)]'
          )}
        >
          <ArrowLeftRight className={cn('w-5 h-5', isActivity ? 'text-[var(--teal)]' : 'text-[var(--faint)]')} />
          <span>Activity</span>
        </Link>

        {/* Elevated Centre FAB */}
        <button
          onClick={openAddTransaction}
          className="w-11 h-11 rounded-[15px] bg-[var(--teal)] text-white flex items-center justify-center justify-self-center -mt-6 shadow-lg shadow-[var(--teal)]/30 active:scale-95 transition-transform cursor-pointer ring-4 ring-[var(--surface)]"
          aria-label="New Transaction"
          title="New Transaction"
        >
          <Plus className="w-5 h-5" />
        </button>

        {/* Plan */}
        <Link
          href="/plan"
          className={cn(
            'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
            isPlan ? 'text-[var(--ink)] font-semibold' : 'text-[var(--faint)] hover:text-[var(--muted-color)]'
          )}
        >
          <CalendarDays className={cn('w-5 h-5', isPlan ? 'text-[var(--teal)]' : 'text-[var(--faint)]')} />
          <span>Plan</span>
        </Link>

        {/* Wallet */}
        <Link
          href="/wallet"
          className={cn(
            'flex flex-col items-center gap-1 text-[10px] font-medium transition-colors',
            isWallet ? 'text-[var(--ink)] font-semibold' : 'text-[var(--faint)] hover:text-[var(--muted-color)]'
          )}
        >
          <CreditCard className={cn('w-5 h-5', isWallet ? 'text-[var(--teal)]' : 'text-[var(--faint)]')} />
          <span>Wallet</span>
        </Link>
      </div>
    </nav>
  );
}
