'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CalendarCheck,
  BarChart3,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinanceStore } from '@/lib/store';

const MOBILE_NAV = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Accounts', href: '/accounts', icon: Wallet },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Bills', href: '/bills', icon: CalendarCheck },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { openAddTransaction } = useFinanceStore();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1 relative">
        {MOBILE_NAV.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-semibold',
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-accent')} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Centre FAB */}
        <button
          onClick={openAddTransaction}
          className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-vault-popover -mt-4 transition-transform active:scale-95"
          aria-label="Add transaction"
        >
          <Plus className="w-5 h-5" />
        </button>

        {MOBILE_NAV.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-[10px] font-semibold',
                isActive
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-accent')} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
